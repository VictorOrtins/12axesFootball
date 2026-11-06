"""Calibra as constantes de ProfileMatchScorer nos catalogos de futebol com Optuna.

Objetivo: os pares pesquisados (ideia de jogo -> treinador/time exemplar,
time -> treinador) ficam no topo do ranking. Restricoes: as metricas de
ScorerBenchmarkTest nao pioram em relacao as constantes atuais.
Ver tasks/14. TUNE_MATCH_WEIGHTS_WITH_OPTUNA.md.

Uso (venv com optuna e numpy):
    ~/.venvs/optuna/bin/python profile-audit/tune_scorer.py [--trials 1500] [--out DIR]
"""
import argparse
import glob
import json
import os
import random
from dataclasses import asdict

import numpy as np
import optuna

import match_scorer as ms
import profile_vector as pv

BASE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.join(BASE, "research")
ANSWERS = os.path.join(BASE, "answers")
CATALOGS = {
    "football-ideology": ("football-ideology-profiles.json", "footballIdeologyId"),
    "team": ("team-profiles.json", "teamId"),
    "manager": ("manager-profiles.json", "managerId"),
}
LINK_TYPES = [("football-ideology", "manager"), ("football-ideology", "team"), ("team", "manager")]
CODES = ["DT", "D", "N", "C", "CT"]

TUNE_SEEDS = [1, 2]
EVAL_SEEDS = [101, 102, 103]
SPLIT_SEED = 7
HOLDOUT_SHARE = 0.3
TAKES_PER_PROFILE = 8
ONE_STEP_FLIP = 0.30
TWO_STEP_FLIP = 0.08
ARCHETYPE_KEEP = 0.75

CENTERED_PROFILES = 15
STRESS_SAMPLES = 200
GUARDRAILS = ["recovery10", "recovery15", "opposite", "center", "stability", "discrimination", "extremity"]


def load_catalogs():
    catalogs = {}
    for name, (file, key) in CATALOGS.items():
        profiles = sorted(pv.load(file), key=lambda p: p[key])
        ids = [p[key] for p in profiles]
        catalogs[name] = {"ids": ids, "index": {i: n for n, i in enumerate(ids)},
                          "M": ms.vector_matrix([p["vector"] for p in profiles])}
    return catalogs


def load_pairs(catalogs):
    pairs = []
    for f in sorted(glob.glob(os.path.join(RESEARCH, "football-ideology", "*.json"))):
        r = json.load(open(f, encoding="utf-8"))
        if r["id"] not in catalogs["football-ideology"]["index"]:
            continue
        for e in r.get("exemplars") or []:
            if e["id"] in catalogs.get(e["kind"], {"index": {}})["index"]:
                pairs.append(("football-ideology", r["id"], e["kind"], e["id"]))
    for f in sorted(glob.glob(os.path.join(RESEARCH, "team", "*.json"))):
        r = json.load(open(f, encoding="utf-8"))
        if r["id"] not in catalogs["team"]["index"]:
            continue
        for m in {m.get("managerId") for m in r.get("managers") or []}:
            if m in catalogs["manager"]["index"]:
                pairs.append(("team", r["id"], "manager", m))
    return sorted(set(pairs))


def split_pairs(pairs):
    rng = random.Random(SPLIT_SEED)
    holdout = set()
    for catalog in ("football-ideology", "team"):
        queries = sorted({q for c, q, _, _ in pairs if c == catalog})
        rng.shuffle(queries)
        holdout |= {(catalog, q) for q in queries[:round(HOLDOUT_SHARE * len(queries))]}
    tune = [p for p in pairs if (p[0], p[1]) not in holdout]
    held = [p for p in pairs if (p[0], p[1]) in holdout]
    return tune, held


def select_questions(by_axis, per_axis, rng):
    selected = []
    for index, questions in enumerate(by_axis.values()):
        left = [q for q in questions if q["agreePole"] == "LEFT"]
        right = [q for q in questions if q["agreePole"] == "RIGHT"]
        rng.shuffle(left)
        rng.shuffle(right)
        left_count = -(-per_axis // 2) if index % 2 == 0 else per_axis // 2
        selected += left[:left_count] + right[:per_axis - left_count]
    return selected


def noisy_code(code, rng):
    roll = rng.random()
    step = 2 if roll < TWO_STEP_FLIP else 1 if roll < TWO_STEP_FLIP + ONE_STEP_FLIP else 0
    if rng.random() < 0.5:
        step = -step
    return CODES[min(4, max(0, CODES.index(code) + step))]


def simulate_take(answers, by_axis, qmap, archetypes, rng):
    per_axis = 5 if rng.random() < 0.5 else 3
    audited = {qid: code for ax in pv.axis_order() for qid, code in answers[ax]["answers"].items()}
    data = {ax: {"answers": {}} for ax in by_axis}
    for q in select_questions(by_axis, per_axis, rng):
        data[q["axisId"]]["answers"][q["id"]] = noisy_code(audited[q["id"]], rng)
    chosen = answers.get(pv.ARCHETYPE_KEY) or {}
    data[pv.ARCHETYPE_KEY] = {
        q["id"]: chosen.get(q["id"]) if rng.random() < ARCHETYPE_KEEP else rng.choice(q["options"])["id"]
        for q in archetypes
    }
    vector = pv.compute_vector(data, qmap, list(by_axis), archetypes)
    return [vector[a] for a in ms.AXIS_IDS] + [per_axis]


def simulate_users(catalogs, seed):
    qmap = pv.question_map()
    archetypes = pv.archetype_questions()
    by_axis = {ax: [] for ax in pv.axis_order()}
    for q in pv.load("questions-pool.json"):
        by_axis[q["axisId"]].append(q)
    rng = random.Random(seed)
    takes = {}
    for name, catalog in catalogs.items():
        for pid in catalog["ids"]:
            answers = json.load(open(os.path.join(ANSWERS, name, pid + ".json"), encoding="utf-8"))
            # coluna 12: perguntas por eixo da variante (3 ou 5)
            takes[(name, pid)] = np.array(
                [simulate_take(answers, by_axis, qmap, archetypes, rng) for _ in range(TAKES_PER_PROFILE)])
    return takes


def guardrail_queries(catalogs, seed):
    rng = np.random.default_rng(seed)
    queries = {}
    for name, catalog in catalogs.items():
        M = catalog["M"]
        n = len(M)
        stable = np.clip(M + rng.normal(0, 10, M.shape), 0, 100)
        shifted = stable.copy()
        shifted[np.arange(n), rng.integers(0, 12, n)] += 2.0
        extreme_low = rng.uniform(0, 15, (STRESS_SAMPLES, 12))
        extreme = np.where(rng.random((STRESS_SAMPLES, 12)) < 0.5, extreme_low, extreme_low + 85)
        queries[name] = {
            "sigma10": np.clip(M + rng.normal(0, 10, M.shape), 0, 100),
            "sigma15": np.clip(M + rng.normal(0, 15, M.shape), 0, 100),
            "mirror": 100.0 - M,
            "stable": stable,
            "shifted": np.clip(shifted, 0, 100),
            "extreme": extreme,
            "warm": rng.uniform(35, 65, (STRESS_SAMPLES, 12)),
            "centered": np.argsort(np.abs(M - 50).mean(axis=1), kind="stable")[:CENTERED_PROFILES],
        }
    return queries


def top1(scores):
    # maior nota; empate fica com o menor id (as linhas ja estao em ordem de id)
    return np.argmax(scores, axis=1)


def guardrails(catalogs, queries, score):
    hits = {g: [] for g in GUARDRAILS}
    for name, catalog in catalogs.items():
        M, q = catalog["M"], queries[name]
        n = len(M)
        own = np.arange(n)
        hits["recovery10"] += list(top1(score(q["sigma10"], M)) == own)
        hits["recovery15"] += list(top1(score(q["sigma15"], M)) == own)
        mirror = score(q["mirror"], M)
        order = np.lexsort((np.tile(own, (n, 1)), -mirror), axis=1)
        position = np.argmax(order == own[:, None], axis=1)
        hits["opposite"] += list(100.0 * position / max(1, n - 1))
        shifted = score(q["shifted"], M)
        hits["stability"] += list(top1(score(q["stable"], M)) == top1(shifted))
        ranked = -np.sort(-shifted, axis=1)
        amplitude = np.maximum(1e-4, ranked[:, 0] - ranked[:, -1])
        hits["discrimination"] += list(100.0 * (ranked[:, 0] - ranked[:, 1]) / amplitude)
        extreme = score(q["extreme"], M)
        top = np.lexsort((np.tile(own, (STRESS_SAMPLES, 1)), -extreme), axis=1)[:, :CENTERED_PROFILES]
        hits["center"] += list(~np.isin(top, q["centered"]).any(axis=1))
        warm_top = top1(score(q["warm"], M))
        inflation = np.abs(M[warm_top] - 50).mean(axis=1) - np.abs(q["warm"] - 50).mean(axis=1)
        hits["extremity"] += list(np.maximum(0.0, inflation))
    result = {g: float(np.mean(v)) * (100.0 if g in ("recovery10", "recovery15", "stability", "center") else 1.0)
              for g, v in hits.items()}
    result["extremity"] = max(0.0, min(100.0, 100.0 - 2.0 * result["extremity"]))
    return result


def partner_rank(scores, partner):
    target = scores[:, partner][:, None]
    return 1.0 + (scores > target).sum(axis=1) + 0.5 * ((scores == target).sum(axis=1) - 1)


def pair_metrics(catalogs, pairs, takes, score):
    by_type = {t: {"rr": [], "top3": []} for t in LINK_TYPES}
    for query_catalog, query_id, partner_catalog, partner_id in pairs:
        partner = catalogs[partner_catalog]
        rank = partner_rank(score(takes[(query_catalog, query_id)], partner["M"]), partner["index"][partner_id])
        by_type[(query_catalog, partner_catalog)]["rr"].append(np.mean(1.0 / rank))
        by_type[(query_catalog, partner_catalog)]["top3"].append(np.mean(rank <= 3))
    used = [t for t in LINK_TYPES if by_type[t]["rr"]]
    return {
        "mrr": float(np.mean([np.mean(by_type[t]["rr"]) for t in used])),
        "top3": float(np.mean([np.mean(by_type[t]["top3"]) for t in used])) * 100.0,
        "by_type": {f"{a}->{b}": round(float(np.mean(by_type[(a, b)]["rr"])), 4) for a, b in used},
    }


def clean_takes(catalogs):
    return {(name, pid): catalog["M"][[i]] for name, catalog in catalogs.items() for i, pid in enumerate(catalog["ids"])}


def scorer(p):
    return lambda U, T: ms.compatibility(U[:, :12], T, p)


def distance_only(U, T):
    return -np.sqrt(((U[:, None, :12] - T[None, :, :]) ** 2).sum(axis=-1))


def params_from(trial):
    p = ms.Params(
        direction_augment_radius=trial.suggest_float("direction_augment_radius", 1.0, 20.0),
        outlier_exponent=trial.suggest_float("outlier_exponent", 1.0, 5.0),
        opposite_side_max_penalty=trial.suggest_float("opposite_side_max_penalty", 0.0, 0.9),
        opposite_side_spread=trial.suggest_float("opposite_side_spread", 5.0, 50.0),
    )
    raw = [trial.suggest_float(f"raw_{w}", 0.01, 1.0) for w in ("axis", "direction", "magnitude", "outlier")]
    return p.with_weights(*raw)


class Setup:
    def __init__(self, seeds):
        self.catalogs = load_catalogs()
        self.pairs = load_pairs(self.catalogs)
        self.tune_pairs, self.holdout_pairs = split_pairs(self.pairs)
        self.seeds = seeds
        self.takes = [simulate_users(self.catalogs, s) for s in seeds]
        self.queries = [guardrail_queries(self.catalogs, s) for s in seeds]

    def evaluate(self, p, pairs):
        return self.evaluate_score(scorer(p), pairs)

    def evaluate_score(self, score, pairs):
        mrr = [pair_metrics(self.catalogs, pairs, takes, score) for takes in self.takes]
        rails = [guardrails(self.catalogs, q, score) for q in self.queries]
        return {
            "mrr": float(np.mean([m["mrr"] for m in mrr])),
            "top3": float(np.mean([m["top3"] for m in mrr])),
            "by_type": {k: round(float(np.mean([m["by_type"][k] for m in mrr])), 4) for k in mrr[0]["by_type"]},
            "guardrails": {g: round(float(np.mean([r[g] for r in rails])), 2) for g in GUARDRAILS},
        }


def guardrail_violations(rails, floors):
    return [floors[g] - rails[g] for g in GUARDRAILS]


def guardrail_score(rails, floors):
    return float(np.mean([rails[g] / max(floors[g], 1e-6) for g in GUARDRAILS]))


def run_constrained(setup, floors, trials):
    def objective(trial):
        p = params_from(trial)
        result = setup.evaluate(p, setup.tune_pairs)
        trial.set_user_attr("result", result)
        trial.set_user_attr("violations", guardrail_violations(result["guardrails"], floors))
        return result["mrr"]

    sampler = optuna.samplers.TPESampler(seed=0, constraints_func=lambda t: t.user_attrs["violations"])
    study = optuna.create_study(direction="maximize", sampler=sampler)
    study.enqueue_trial(current_trial_params())
    study.optimize(objective, n_trials=trials)
    return study


def run_pareto(setup, floors, trials):
    def objective(trial):
        p = params_from(trial)
        result = setup.evaluate(p, setup.tune_pairs)
        trial.set_user_attr("result", result)
        return result["mrr"], guardrail_score(result["guardrails"], floors)

    study = optuna.create_study(directions=["maximize", "maximize"],
                                sampler=optuna.samplers.NSGAIISampler(seed=0))
    study.enqueue_trial(current_trial_params())
    study.optimize(objective, n_trials=trials)
    return study


def current_trial_params():
    c = ms.CURRENT
    return {"direction_augment_radius": c.direction_augment_radius, "outlier_exponent": c.outlier_exponent,
            "opposite_side_max_penalty": c.opposite_side_max_penalty,
            "opposite_side_spread": c.opposite_side_spread,
            "raw_axis": c.axis_weight, "raw_direction": c.direction_weight,
            "raw_magnitude": c.magnitude_weight, "raw_outlier": c.outlier_weight}


def params_of(trial):
    return params_from(optuna.trial.FixedTrial(trial.params))


def feasible(trial):
    return all(v <= 0 for v in trial.user_attrs["violations"])


def candidates(constrained, pareto, floors):
    picked = {}
    ok = sorted((t for t in constrained.trials if feasible(t)), key=lambda t: -t.value)
    if ok:
        picked["A: best MRR, every guardrail at or above today"] = params_of(ok[0])
    front = sorted(pareto.best_trials, key=lambda t: -t.values[0])
    if front:
        picked["B: best MRR on the Pareto front"] = params_of(front[0])
        balanced = max(front, key=lambda t: min(t.values[0] / max(front[0].values[0], 1e-9), t.values[1]))
        picked["C: balanced point on the Pareto front"] = params_of(balanced)
    return picked


def top1_churn(catalogs, takes, p):
    changed = total = 0
    for name, catalog in catalogs.items():
        users = np.vstack(list(takes.values()))[:, :12]
        before = top1(ms.compatibility(users, catalog["M"]))
        after = top1(ms.compatibility(users, catalog["M"], p))
        changed += int((before != after).sum())
        total += len(users)
    return 100.0 * changed / total


def round_params(p):
    return {k: round(v, 3) for k, v in asdict(p).items()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=1500)
    parser.add_argument("--out", default=os.path.join(BASE, "tuning"))
    args = parser.parse_args()
    optuna.logging.set_verbosity(optuna.logging.WARNING)

    tune = Setup(TUNE_SEEDS)
    floors = tune.evaluate(ms.CURRENT, tune.tune_pairs)["guardrails"]
    constrained = run_constrained(tune, floors, args.trials)
    pareto = run_pareto(tune, floors, args.trials)
    picked = candidates(constrained, pareto, floors)

    evaluation = Setup(EVAL_SEEDS)
    rows = {"current": ms.CURRENT, "axis distance only (1, 0, 0, 0)": ms.CURRENT.with_weights(1, 0, 0, 0), **picked}
    report = {
        "pairs": {"total": len(tune.pairs), "tune": len(tune.tune_pairs), "holdout": len(tune.holdout_pairs)},
        "floors_tune_seeds": floors,
        "euclidean_holdout": pair_metrics(evaluation.catalogs, evaluation.holdout_pairs, evaluation.takes[0],
                                          distance_only),
        "clean_vector_holdout": {},
        "rows": {},
        "importances_constrained": {k: round(v, 3) for k, v in
                                    optuna.importance.get_param_importances(constrained).items()},
        "pareto_front": [{"mrr": round(t.values[0], 4), "guardrail_score": round(t.values[1], 4),
                          "params": round_params(params_of(t))} for t in sorted(pareto.best_trials,
                                                                                key=lambda t: -t.values[0])],
    }
    clean = clean_takes(evaluation.catalogs)
    for label, p in rows.items():
        report["rows"][label] = {
            "params": round_params(p),
            "tune_pairs": evaluation.evaluate(p, evaluation.tune_pairs),
            "holdout_pairs": evaluation.evaluate(p, evaluation.holdout_pairs),
            "top1_churn_vs_current_percent": round(top1_churn(evaluation.catalogs, evaluation.takes[0], p), 1),
        }
        report["clean_vector_holdout"][label] = pair_metrics(
            evaluation.catalogs, evaluation.holdout_pairs, clean, scorer(p))

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(json.dumps({k: report[k] for k in ("pairs", "floors_tune_seeds", "importances_constrained")}, indent=2))
    for label, row in report["rows"].items():
        h = row["holdout_pairs"]
        print(f"{label}: holdout MRR {h['mrr']:.3f} top3 {h['top3']:.1f}% churn {row['top1_churn_vs_current_percent']}%"
              f" guardrails {h['guardrails']}")


if __name__ == "__main__":
    main()

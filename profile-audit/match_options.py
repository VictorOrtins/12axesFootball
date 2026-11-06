"""Testa as opcoes 2 a 4 da task 14 contra os mesmos pares e guardrails de tune_scorer.py.

2. incerteza do perfil: eixos sem evidencia pesam menos (formula atual com pesos por eixo);
3. verossimilhanca: ruido do quiz por eixo e variante, mais a incerteza do perfil;
4. pesos por eixo aprendidos nos pares (distancia ponderada, gradiente);
--new-terms: um quinto termo (eixos-assinatura ou pior dimensao) com parte w da nota.

Uso: ~/.venvs/optuna/bin/python profile-audit/match_options.py [--out arquivo.json]
"""
import argparse
import json
import os
from dataclasses import asdict

import numpy as np

import match_scorer as ms
import tune_scorer as ts
from validate import FOOTBALL_AXIS_DIMENSIONS

CENTER = ms.CENTER
NOISE_SEED = 999
BOOTSTRAP = 5000


def evidence(catalogs):
    """Por catalogo: matriz m x 12 de fatos verificados por eixo e mascara dos eixos em gaps.axes."""
    out = {}
    for name, catalog in catalogs.items():
        counts = np.zeros((len(catalog["ids"]), 12))
        gaps = np.zeros((len(catalog["ids"]), 12), dtype=bool)
        for i, pid in enumerate(catalog["ids"]):
            r = json.load(open(os.path.join(ts.RESEARCH, name, pid + ".json"), encoding="utf-8"))
            dims = [s["dimension"] for s in r.get("sources") or [] if s.get("verified")]
            for k, axis in enumerate(ms.AXIS_IDS):
                counts[i, k] = sum(d in FOOTBALL_AXIS_DIMENSIONS[axis] for d in dims)
            listed = {a.split()[0] for a in (r.get("gaps") or {}).get("axes") or []}
            gaps[i] = [a in listed for a in ms.AXIS_IDS]
        out[name] = {"counts": counts, "gaps": gaps}
    return out


def quiz_noise(catalogs):
    """Desvio do vetor simulado em relacao ao vetor auditado, por variante (3 ou 5) e eixo."""
    takes = ts.simulate_users(catalogs, NOISE_SEED)
    residuals = {3: [], 5: []}
    for (name, pid), T in takes.items():
        clean = catalogs[name]["M"][catalogs[name]["index"][pid]]
        for row in T:
            residuals[int(row[12])].append(row[:12] - clean)
    return {v: np.array(r).std(axis=0) for v, r in residuals.items()}


def weighted_compatibility(U, T, W, p=ms.CURRENT):
    """Formula atual com peso por eixo do alvo (W m x 12, max 1). W = 1 reproduz ms.compatibility."""
    u = np.asarray(U, dtype=float)[:, None, :12]
    t = T[None, :, :]
    w = W[None, :, :]
    wsum = w.sum(axis=-1)
    cu, ct = u - CENTER, t - CENTER
    diff = np.abs(u - t)
    sim = np.maximum(0.0, 1.0 - (diff / ms.AXIS_SPREAD) ** 2)
    penalty = (p.opposite_side_max_penalty * np.tanh(np.abs(cu) / p.opposite_side_spread)
               * np.tanh(np.abs(ct) / p.opposite_side_spread))
    sim = np.where(cu * ct < 0.0, sim * (1.0 - penalty), sim)
    axis = 100.0 * (w * sim).sum(axis=-1) / wsum
    augment = wsum * p.direction_augment_radius ** 2
    direction = CENTER + CENTER * ((w * cu * ct).sum(axis=-1) + augment) / np.sqrt(
        ((w * cu * cu).sum(axis=-1) + augment) * ((w * ct * ct).sum(axis=-1) + augment))
    magnitude = 100.0 - 2.0 * np.abs((w * np.abs(cu)).sum(axis=-1) - (w * np.abs(ct)).sum(axis=-1)) / wsum
    outlier = 100.0 * np.maximum(0.0, 1.0 - ((w * diff).max(axis=-1) / ms.OUTLIER_FULL_SPREAD) ** p.outlier_exponent)
    raw = (p.axis_weight * axis + p.direction_weight * direction
           + p.magnitude_weight * magnitude + p.outlier_weight * outlier)
    return ms.round1(np.clip(raw, 0.0, 100.0))


def per_target(catalogs, matrices):
    """Score que descobre o catalogo do alvo pela identidade da matriz T."""
    lookup = {id(c["M"]): name for name, c in catalogs.items()}
    return lambda T: matrices[lookup[id(T)]]


def option2_gap_weight(catalogs, ev, alpha):
    weights = per_target(catalogs, {n: np.where(e["gaps"], alpha, 1.0) for n, e in ev.items()})
    return lambda U, T: weighted_compatibility(U, T, weights(T))


def option2_evidence_weight(catalogs, ev, k):
    def w(counts):
        raw = (counts + 1.0) / (counts + 1.0 + k)
        return raw / raw.max(axis=1, keepdims=True)
    weights = per_target(catalogs, {n: w(e["counts"]) for n, e in ev.items()})
    return lambda U, T: weighted_compatibility(U, T, weights(T))


def likelihood_score(U, T, quiz_var, profile_var):
    """Log-verossimilhanca gaussiana media por eixo, levada a 0-100 por uma funcao monotona.

    var = var_quiz + var_perfil. O termo log(var) e o que impede um perfil incerto
    (variancia alta) de ganhar de todo mundo.
    """
    u = np.asarray(U, dtype=float)
    variant = u[:, 12].astype(int) if u.shape[1] > 12 else np.full(len(u), 3)
    qv = np.where((variant == 5)[:, None], quiz_var[5], quiz_var[3])[:, None, :]
    var = qv + profile_var[None, :, :]
    loglik = -0.5 * ((u[:, None, :12] - T[None, :, :]) ** 2 / var + np.log(var / 100.0))
    return 100.0 * np.exp(loglik.mean(axis=-1) / 4.0)


def option3(catalogs, ev, noise, gap_sd, known_sd):
    quiz_var = {v: sd ** 2 for v, sd in noise.items()}
    pvar = per_target(catalogs, {n: np.where(e["gaps"], gap_sd ** 2, known_sd ** 2) for n, e in ev.items()})
    return lambda U, T: likelihood_score(U, T, quiz_var, pvar(T))


def learn_axis_weights(setup, pairs, lam, steps=400, lr=0.05):
    """Pesos por eixo de uma distancia ponderada, softmax sobre o catalogo do parceiro (ListNet)."""
    batches = []
    for takes in setup.takes:
        for qc, qid, pc, pid in pairs:
            M = setup.catalogs[pc]["M"]
            sq = (takes[(qc, qid)][:, None, :12] - M[None, :, :]) ** 2 / 200.0
            batches.append((sq, setup.catalogs[pc]["index"][pid]))
    theta = np.zeros(12)
    m = np.zeros(12)
    v = np.zeros(12)
    for step in range(1, steps + 1):
        w = np.exp(theta)
        grad = 2 * lam * theta
        for sq, target in batches:
            s = -(sq * w).sum(axis=-1)
            s -= s.max(axis=1, keepdims=True)
            prob = np.exp(s)
            prob /= prob.sum(axis=1, keepdims=True)
            y = np.zeros_like(prob)
            y[:, target] = 1.0
            grad += ((prob - y)[:, :, None] * -sq).sum(axis=(0, 1)) * w / (len(batches) * len(sq))
        m = 0.9 * m + 0.1 * grad
        v = 0.999 * v + 0.001 * grad ** 2
        theta -= lr * (m / (1 - 0.9 ** step)) / (np.sqrt(v / (1 - 0.999 ** step)) + 1e-8)
    return np.exp(theta)


def weighted_distance(w):
    return lambda U, T: 100.0 * np.exp(-(((np.asarray(U)[:, None, :12] - T[None, :, :]) ** 2) * w).sum(-1) / 2400.0)


def per_pair_rr(setup, pairs, score):
    out = []
    for qc, qid, pc, pid in pairs:
        cat = setup.catalogs[pc]
        out.append(np.mean([np.mean(1.0 / ts.partner_rank(score(t[(qc, qid)], cat["M"]), cat["index"][pid]))
                            for t in setup.takes]))
    return np.array(out)


def churn(setup, score):
    users = np.vstack(list(setup.takes[0].values()))
    changed = total = 0
    for catalog in setup.catalogs.values():
        before = ts.top1(ms.compatibility(users[:, :12], catalog["M"]))
        after = ts.top1(score(users, catalog["M"]))
        changed += int((before != after).sum())
        total += len(users)
    return round(100.0 * changed / total, 1)


NEW_TERM_SHARES = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4]
DIMENSION_COLUMNS = [list(range(0, 6)), list(range(6, 10)), list(range(10, 12))]


def per_axis_similarity(u, t, p=ms.CURRENT):
    """Similaridade 0..1 de cada eixo, com a penalidade de lado oposto (igual a axis_similarity)."""
    diff = np.abs(u - t)
    sim = np.maximum(0.0, 1.0 - (diff / ms.AXIS_SPREAD) ** 2)
    cu, ct = u - CENTER, t - CENTER
    penalty = (p.opposite_side_max_penalty * np.tanh(np.abs(cu) / p.opposite_side_spread)
               * np.tanh(np.abs(ct) / p.opposite_side_spread))
    return np.where(cu * ct < 0.0, sim * (1.0 - penalty), sim)


def signature_term(gamma, both, p=ms.CURRENT):
    """Similaridade por eixo pesada pela distancia do centro: os tracos fortes do alvo (e do usuario, se both)."""
    def term(U, T):
        u = np.asarray(U, dtype=float)[:, None, :12]
        t = T[None, :, :]
        strength = np.abs(t - CENTER) + (np.abs(u - CENTER) if both else 0.0)
        s = strength ** gamma + 1e-6
        return 100.0 * (s * per_axis_similarity(u, t, p)).sum(axis=-1) / s.sum(axis=-1)
    return term


def worst_dimension_term(softness, p=ms.CURRENT):
    """Menor nota entre tatica, filosofia e gestao (formula atual em cada bloco); softness > 0 = soft-min."""
    def term(U, T):
        u = np.asarray(U, dtype=float)[:, :12]
        blocks = np.stack([ms.compatibility(u[:, cols], T[:, cols], p, rounded=False) for cols in DIMENSION_COLUMNS])
        if softness == 0:
            return blocks.min(axis=0)
        return -softness * np.log(np.exp(-blocks / softness).mean(axis=0))
    return term


def with_new_term(term, share):
    def score(U, T):
        base = ms.compatibility(np.asarray(U)[:, :12], T, rounded=False)
        return ms.round1(np.clip((1.0 - share) * base + share * term(U, T), 0.0, 100.0))
    return score


def run_new_terms(tune, evaluation, out):
    floors = tune.evaluate(ms.CURRENT, tune.tune_pairs)["guardrails"]
    base_tune = tune.evaluate(ms.CURRENT, tune.tune_pairs)["mrr"]
    families = {
        "signature, target traits, gamma=1": signature_term(1.0, False),
        "signature, target traits, gamma=2": signature_term(2.0, False),
        "signature, user + target traits, gamma=1": signature_term(1.0, True),
        "signature, user + target traits, gamma=2": signature_term(2.0, True),
        "worst dimension, min": worst_dimension_term(0),
        "worst dimension, soft-min 5": worst_dimension_term(5.0),
    }
    current = ts.scorer(ms.CURRENT)
    base_held = per_pair_rr(evaluation, evaluation.holdout_pairs, current)
    base_all = per_pair_rr(evaluation, evaluation.pairs, current)
    rng = np.random.default_rng(0)
    report = {"tune_mrr_current": round(base_tune, 4), "families": {}}
    print(f"current: tune MRR {base_tune:.4f}")
    for family, term in families.items():
        grid = []
        for share in NEW_TERM_SHARES:
            r = tune.evaluate_score(with_new_term(term, share), tune.tune_pairs)
            ok = all(r["guardrails"][g] >= floors[g] for g in ts.GUARDRAILS)
            grid.append({"share": share, "tune_mrr": round(r["mrr"], 4), "meets_floors": ok,
                         "guardrails": r["guardrails"]})
        feasible = [g for g in grid if g["meets_floors"]]
        best = max(feasible or grid, key=lambda g: g["tune_mrr"])
        score = with_new_term(term, best["share"])
        held = per_pair_rr(evaluation, evaluation.holdout_pairs, score) - base_held
        diff = per_pair_rr(evaluation, evaluation.pairs, score) - base_all
        boot_held = [held[rng.integers(0, len(held), len(held))].mean() for _ in range(BOOTSTRAP)]
        boot_all = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(BOOTSTRAP)]
        result = evaluation.evaluate_score(score, evaluation.holdout_pairs)
        report["families"][family] = {
            "grid_tune": grid, "picked_share": best["share"], "picked_meets_floors": best["meets_floors"],
            "holdout_mrr": round(result["mrr"], 4), "holdout_top3": round(result["top3"], 1),
            "holdout_by_type": result["by_type"],
            "holdout_delta": round(float(held.mean()), 4),
            "holdout_delta_ci95": [round(float(np.percentile(boot_held, q)), 4) for q in (2.5, 97.5)],
            "all_pairs_delta": round(float(diff.mean()), 4),
            "all_pairs_delta_ci95": [round(float(np.percentile(boot_all, q)), 4) for q in (2.5, 97.5)],
            "guardrails": result["guardrails"], "top1_churn_percent": churn(evaluation, score),
        }
        f = report["families"][family]
        print(f"{family:42s} tune grid " + " ".join(
            f"{g['share']}:{g['tune_mrr']:.4f}{'' if g['meets_floors'] else '*'}" for g in grid))
        print(f"{'':42s} picked {f['picked_share']} held {f['holdout_mrr']:.3f} d {f['holdout_delta']:+.4f} "
              f"{f['holdout_delta_ci95']} all d {f['all_pairs_delta']:+.4f} {f['all_pairs_delta_ci95']} "
              f"churn {f['top1_churn_percent']}%")
        print(f"{'':42s} {f['guardrails']}")
    if out:
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)


def five_term_score(p, share, term):
    """p tem os 4 pesos atuais somando 1 - share; o quinto termo leva share."""
    def score(U, T):
        base = ms.compatibility(np.asarray(U)[:, :12], T, p, rounded=False)
        return ms.round1(np.clip(base + share * term(U, T), 0.0, 100.0))
    return score


def full_search_trial(trial, family):
    raw = [trial.suggest_float(f"raw_{w}", 0.01, 1.0) for w in ("axis", "direction", "magnitude", "outlier")]
    raw_new = trial.suggest_float("raw_new", 0.0, 1.0)
    total = sum(raw) + raw_new
    p = ms.Params(
        axis_weight=raw[0] / total, direction_weight=raw[1] / total,
        magnitude_weight=raw[2] / total, outlier_weight=raw[3] / total,
        direction_augment_radius=trial.suggest_float("direction_augment_radius", 1.0, 20.0),
        outlier_exponent=trial.suggest_float("outlier_exponent", 1.0, 5.0),
        opposite_side_max_penalty=trial.suggest_float("opposite_side_max_penalty", 0.0, 0.9),
        opposite_side_spread=trial.suggest_float("opposite_side_spread", 5.0, 50.0),
    )
    base = p.with_weights(*raw)
    if family == "signature":
        term = signature_term(trial.suggest_float("gamma", 0.5, 3.0),
                              trial.suggest_categorical("both", [False, True]), base)
    else:
        term = worst_dimension_term(trial.suggest_float("softness", 0.5, 15.0), base)
    return five_term_score(p, raw_new / total, term), {"params": {k: round(v, 3) for k, v in asdict(p).items()},
                                                        "new_term_share": round(raw_new / total, 3)}


def run_full_search(tune, evaluation, trials, out):
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    floors = tune.evaluate(ms.CURRENT, tune.tune_pairs)["guardrails"]
    current = ts.scorer(ms.CURRENT)
    base_held = per_pair_rr(evaluation, evaluation.holdout_pairs, current)
    base_all = per_pair_rr(evaluation, evaluation.pairs, current)
    rng = np.random.default_rng(0)
    report = {"tune_mrr_current": round(tune.evaluate(ms.CURRENT, tune.tune_pairs)["mrr"], 4), "families": {}}
    start = {**ts.current_trial_params(), "raw_new": 0.0}
    for family, extra in (("signature", {"gamma": 1.0, "both": True}), ("worst-dimension", {"softness": 5.0})):
        def objective(trial):
            score, info = full_search_trial(trial, family)
            r = tune.evaluate_score(score, tune.tune_pairs)
            trial.set_user_attr("info", info)
            trial.set_user_attr("violations", [floors[g] - r["guardrails"][g] for g in ts.GUARDRAILS])
            return r["mrr"]

        sampler = optuna.samplers.TPESampler(seed=0, constraints_func=lambda t: t.user_attrs["violations"])
        study = optuna.create_study(direction="maximize", sampler=sampler)
        study.enqueue_trial({**start, **extra})
        study.optimize(objective, n_trials=trials)
        feasible = [t for t in study.trials if all(v <= 0 for v in t.user_attrs["violations"])]
        best = max(feasible, key=lambda t: t.value)
        best_any = max(study.trials, key=lambda t: t.value)
        rows = {}
        for label, t in (("best meeting every floor", best), ("best ignoring floors", best_any)):
            score, info = full_search_trial(optuna.trial.FixedTrial(t.params), family)
            held = per_pair_rr(evaluation, evaluation.holdout_pairs, score) - base_held
            diff = per_pair_rr(evaluation, evaluation.pairs, score) - base_all
            boot_held = [held[rng.integers(0, len(held), len(held))].mean() for _ in range(BOOTSTRAP)]
            boot_all = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(BOOTSTRAP)]
            result = evaluation.evaluate_score(score, evaluation.holdout_pairs)
            rows[label] = {
                **info, "term_params": {k: v for k, v in t.params.items() if k in ("gamma", "both", "softness")},
                "tune_mrr": round(t.value, 4), "feasible_trials": len(feasible),
                "holdout_mrr": round(result["mrr"], 4),
                "holdout_delta": round(float(held.mean()), 4),
                "holdout_delta_ci95": [round(float(np.percentile(boot_held, q)), 4) for q in (2.5, 97.5)],
                "all_pairs_delta": round(float(diff.mean()), 4),
                "all_pairs_delta_ci95": [round(float(np.percentile(boot_all, q)), 4) for q in (2.5, 97.5)],
                "guardrails": result["guardrails"], "top1_churn_percent": churn(evaluation, score),
            }
            r = rows[label]
            print(f"{family} / {label}: share {r['new_term_share']} {r['term_params']} tune {r['tune_mrr']:.4f} "
                  f"held {r['holdout_mrr']:.3f} d {r['holdout_delta']:+.4f} {r['holdout_delta_ci95']} "
                  f"all d {r['all_pairs_delta']:+.4f} {r['all_pairs_delta_ci95']} churn {r['top1_churn_percent']}% "
                  f"feasible {len(feasible)}/{trials}")
            print(f"    params {r['params']}")
            print(f"    guardrails {r['guardrails']}")
        report["families"][family] = rows
    if out:
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out")
    parser.add_argument("--new-terms", action="store_true", help="testa um quinto termo na formula")
    parser.add_argument("--full-search", action="store_true", help="Optuna nos 5 pesos e parametros")
    parser.add_argument("--trials", type=int, default=1000)
    args = parser.parse_args()

    tune = ts.Setup(ts.TUNE_SEEDS)
    evaluation = ts.Setup(ts.EVAL_SEEDS)
    if args.full_search:
        run_full_search(tune, evaluation, args.trials, args.out)
        return
    if args.new_terms:
        run_new_terms(tune, evaluation, args.out)
        return
    ev = evidence(evaluation.catalogs)
    noise = quiz_noise(evaluation.catalogs)
    print("quiz noise sd, 3 per axis:", np.round(noise[3], 1))
    print("quiz noise sd, 5 per axis:", np.round(noise[5], 1))

    current = ts.scorer(ms.CURRENT)
    check = weighted_compatibility(evaluation.catalogs["team"]["M"], evaluation.catalogs["manager"]["M"],
                                   np.ones_like(evaluation.catalogs["manager"]["M"]))
    assert np.array_equal(check, ms.compatibility(evaluation.catalogs["team"]["M"], evaluation.catalogs["manager"]["M"]))

    options = {
        "current": current,
        "euclidean distance": ts.distance_only,
        "2 gap axes x0.5": option2_gap_weight(evaluation.catalogs, ev, 0.5),
        "2 gap axes x0.25": option2_gap_weight(evaluation.catalogs, ev, 0.25),
        "2 evidence weight k=1": option2_evidence_weight(evaluation.catalogs, ev, 1.0),
        "2 evidence weight k=3": option2_evidence_weight(evaluation.catalogs, ev, 3.0),
        "3 likelihood, quiz noise only": option3(evaluation.catalogs, ev, noise, 0.0, 0.0),
        "3 likelihood + gaps (5 / 15)": option3(evaluation.catalogs, ev, noise, 15.0, 5.0),
        "3 likelihood + gaps (5 / 25)": option3(evaluation.catalogs, ev, noise, 25.0, 5.0),
    }
    learned = {}
    for lam in (0.01, 0.1, 1.0):
        w = learn_axis_weights(tune, tune.tune_pairs, lam)
        learned[lam] = w
        options[f"4 learned axis weights, lambda={lam}"] = weighted_distance(w)
    options["4 baseline: unweighted (same scale)"] = weighted_distance(np.ones(12))

    base_all = per_pair_rr(evaluation, evaluation.pairs, current)
    base_held = per_pair_rr(evaluation, evaluation.holdout_pairs, current)
    rng = np.random.default_rng(0)
    report = {"quiz_noise_sd": {v: np.round(sd, 2).tolist() for v, sd in noise.items()},
              "learned_weights": {str(l): dict(zip(ms.AXIS_IDS, np.round(w / w.mean(), 2).tolist()))
                                  for l, w in learned.items()},
              "options": {}}
    for label, score in options.items():
        result = evaluation.evaluate_score(score, evaluation.holdout_pairs)
        held = per_pair_rr(evaluation, evaluation.holdout_pairs, score) - base_held
        diff = per_pair_rr(evaluation, evaluation.pairs, score) - base_all
        boot = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(BOOTSTRAP)]
        boot_held = [held[rng.integers(0, len(held), len(held))].mean() for _ in range(BOOTSTRAP)]
        report["options"][label] = {
            "holdout_mrr": round(result["mrr"], 4), "holdout_top3": round(result["top3"], 1),
            "holdout_by_type": result["by_type"],
            "holdout_delta": round(float(held.mean()), 4),
            "holdout_delta_ci95": [round(float(np.percentile(boot_held, q)), 4) for q in (2.5, 97.5)],
            "all_pairs_delta": round(float(diff.mean()), 4),
            "all_pairs_delta_ci95": [round(float(np.percentile(boot, q)), 4) for q in (2.5, 97.5)],
            "guardrails": result["guardrails"],
            "top1_churn_percent": churn(evaluation, score),
        }
        r = report["options"][label]
        print(f"{label:38s} held {r['holdout_mrr']:.3f} d {r['holdout_delta']:+.4f} {r['holdout_delta_ci95']} "
              f"all d {r['all_pairs_delta']:+.4f} {r['all_pairs_delta_ci95']} churn {r['top1_churn_percent']}%")
        print(f"{'':38s} {r['guardrails']}")
    for lam, w in report["learned_weights"].items():
        print("learned weights lambda", lam, w)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()

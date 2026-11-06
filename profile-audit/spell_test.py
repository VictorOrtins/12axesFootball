"""Teste barato da opcao 1 da task 14: um vetor por passagem do treinador.

Pega os pares time -> treinador que ficam abaixo do 5o lugar, cujo treinador tem 2+ passagens
contadas, e compara tres vetores do treinador contra o vetor do time:
  atual     o vetor do catalogo (carreira inteira)
  controle  uma segunda auditoria da carreira inteira (outro embaralhamento das perguntas)
  passagem  uma auditoria so da passagem que coincide com a epoca do time
O controle mede quanto o ranking muda so por ruido de auditoria (e por regressao a media,
ja que os pares foram escolhidos por estarem mal).

Uso (venv com numpy):
    python profile-audit/spell_test.py prompts     grava spell-test/prompts/*.txt
    python profile-audit/spell_test.py evaluate    compara os rankings (spell-test/out/*.json)
    python profile-audit/spell_test.py bestof      simula a melhor de k copias ruidosas por treinador (k = passagens)
    python profile-audit/spell_test.py average     media das duas auditorias da carreira inteira
"""
import json
import os
import re
import sys
import unicodedata

import numpy as np

import audit_prompt
import match_scorer as ms
import profile_vector as pv
import tune_scorer as ts

BASE = os.path.dirname(os.path.abspath(__file__))
TEST = os.path.join(BASE, "spell-test")
OUT = os.path.join(TEST, "out")
BAD_RANK = 5

SCOPE_NOTE = (
    "\nSCOPE: audit ONLY the {spell}. The research file also covers the manager's other counted spells; "
    "they must not shape any answer. Ignore every fact whose eventDate is outside that spell and every "
    "statedView quote about other spells, and judge how this manager worked in that spell alone.\n"
)


def years(value):
    value = value or ""
    if value.startswith("ongoing") or value.startswith("onGo"):
        return 9999
    return int(value[:4])


def spell_for(link, spells, team_id):
    """A passagem contada que mais se sobrepoe (em anos) ao periodo do treinador no time; empate: a do clube do time."""
    start, end = years(link["start"]), years(link["end"])
    def overlap(spell):
        return min(end, years(spell["end"])) - max(start, years(spell["start"]))
    best = max(spells, key=lambda spell: (overlap(spell), slug(spell["club"]).split("-")[0] in team_id))
    return best if overlap(best) >= 0 else None


def slug(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def rank_of(scores, index):
    return int(1 + (scores > scores[index]).sum())


def find_cases():
    cat = ts.load_catalogs()
    managers = cat["manager"]
    cases = []
    for query_catalog, qid, partner_catalog, pid in ts.load_pairs(cat):
        if query_catalog != "team" or pid in audit_prompt.IGNORED_SPELLS:
            continue
        team_vector = cat["team"]["M"][cat["team"]["index"][qid]]
        scores = ms.compatibility([team_vector], managers["M"])[0]
        rank = rank_of(scores, managers["index"][pid])
        research = json.load(open(os.path.join(BASE, "research", "manager", pid + ".json"), encoding="utf-8"))
        spells = research.get("spellsCounted") or []
        team = json.load(open(os.path.join(BASE, "research", "team", qid + ".json"), encoding="utf-8"))
        link = next(m for m in team["managers"] if m["managerId"] == pid)
        spell = spell_for(link, spells, qid)
        if rank > BAD_RANK and len(spells) >= 2 and spell:
            cases.append({"team": qid, "manager": pid, "rank": rank, "spell": spell,
                          "spell_id": f"{pid}@{slug(spell['club'])}-{spell['start'][:4]}"})
    return cases, cat


def build_prompts(cases):
    os.makedirs(os.path.join(TEST, "prompts"), exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    original_subject = audit_prompt.SUBJECT["manager"]
    original_note = audit_prompt.IGNORED_NOTE
    jobs = {}
    for case in cases:
        jobs[case["spell_id"]] = case
    for manager in sorted({c["manager"] for c in cases}):
        jobs[f"{manager}@full"] = {"manager": manager, "spell": None}
    for job_id, case in jobs.items():
        research = json.load(open(os.path.join(BASE, "research", "manager", case["manager"] + ".json"),
                                  encoding="utf-8"))
        spell = case["spell"]
        if spell:
            label = f"{spell['club']} spell ({spell['start']} to {spell['end']})"
            audit_prompt.SUBJECT["manager"] = "the manager {name}, in the " + label.replace("{", "{{") + " only"
            audit_prompt.IGNORED_SPELLS[job_id] = label
            audit_prompt.IGNORED_NOTE = SCOPE_NOTE
        text = audit_prompt.build_prompt("manager", job_id, research)
        audit_prompt.SUBJECT["manager"] = original_subject
        audit_prompt.IGNORED_NOTE = original_note
        audit_prompt.IGNORED_SPELLS.pop(job_id, None)
        default_out = os.path.abspath(os.path.join(BASE, "subagent-out", "manager", f"{job_id}.json"))
        text = text.replace(default_out, os.path.join(OUT, f"{job_id}.json"))
        with open(os.path.join(TEST, "prompts", f"{job_id}.txt"), "w", encoding="utf-8") as f:
            f.write(text)
    return sorted(jobs)


def audit_vector(job_id):
    path = os.path.join(OUT, f"{job_id}.json")
    if not os.path.exists(path):
        return None
    data = json.load(open(path, encoding="utf-8"))
    vector = pv.compute_vector(data)
    return np.array([vector[a] for a in ms.AXIS_IDS])


def evaluate(cases, cat):
    managers = cat["manager"]
    rows = []
    for case in cases:
        team_vector = cat["team"]["M"][cat["team"]["index"][case["team"]]]
        index = managers["index"][case["manager"]]
        ranks = {"current": case["rank"]}
        for label, job_id in (("control", f"{case['manager']}@full"), ("spell", case["spell_id"])):
            vector = audit_vector(job_id)
            if vector is None:
                ranks[label] = None
                continue
            replaced = managers["M"].copy()
            replaced[index] = vector
            ranks[label] = rank_of(ms.compatibility([team_vector], replaced)[0], index)
        rows.append({**case, "ranks": ranks})
    return rows


def summary(rows, label):
    ranks = [r["ranks"][label] for r in rows if r["ranks"][label] is not None]
    if not ranks:
        return f"{label:8s} not audited yet"
    ranks = np.array(ranks)
    return (f"{label:8s} n={len(ranks):2d} mean rank {ranks.mean():5.1f} median {np.median(ranks):4.1f} "
            f"MRR {np.mean(1.0 / ranks):.3f} top3 {int((ranks <= 3).sum())} top5 {int((ranks <= 5).sum())}")


AUDIT_NOISE_SD = 7.0
BESTOF_DRAWS = 20
BOOTSTRAP = 10000


def counted_spells(cat):
    counts = []
    for pid in cat["manager"]["ids"]:
        research = json.load(open(os.path.join(BASE, "research", "manager", pid + ".json"), encoding="utf-8"))
        counts.append(max(1, len(research.get("spellsCounted") or [])))
    return np.array(counts)


def best_of_spells_score(managers_m, spells, sigma, seed):
    """Nota de cada treinador = a melhor entre k copias ruidosas do vetor (k = passagens contadas)."""
    rng = np.random.default_rng(seed)
    kmax = int(spells.max())
    copies = np.clip(managers_m[:, None, :] + rng.normal(0, sigma, (len(managers_m), kmax, 12)), 0, 100)
    valid = np.arange(kmax)[None, :] < spells[:, None]

    def score(users, targets):
        u = np.asarray(users)[:, :12]
        if targets is not managers_m:
            return ms.compatibility(u, targets)
        best = np.full((len(u), len(targets)), -np.inf)
        for j in range(kmax):
            best = np.where(valid[:, j][None, :], np.maximum(best, ms.compatibility(u, copies[:, j, :])), best)
        return best
    return score


def run_best_of(cat):
    setup = ts.Setup(ts.EVAL_SEEDS)
    spells = counted_spells(cat)
    managers_m = setup.catalogs["manager"]["M"]
    print(f"managers {len(spells)}, counted spells per manager: mean {spells.mean():.1f}, max {spells.max()}")
    configs = {
        "catalog vector (as today)": (0.0, np.ones_like(spells)),
        "1 noisy audit per manager": (AUDIT_NOISE_SD, np.ones_like(spells)),
        "best of k noisy audits (sd 7)": (AUDIT_NOISE_SD, spells),
        "best of k noisy audits (sd 10)": (10.0, spells),
    }
    check = best_of_spells_score(managers_m, spells, 0.0, 0)
    reference = setup.evaluate_score(check, setup.pairs)
    assert reference["mrr"] == setup.evaluate(ms.CURRENT, setup.pairs)["mrr"], "k copias sem ruido deveriam igualar a formula atual"
    report = {}
    for label, (sigma, k) in configs.items():
        runs = [setup.evaluate_score(best_of_spells_score(managers_m, k, sigma, seed), setup.pairs)
                for seed in range(1 if sigma == 0 else BESTOF_DRAWS)]
        mean = lambda f: float(np.mean([f(r) for r in runs]))
        report[label] = {
            "mrr": round(mean(lambda r: r["mrr"]), 4), "top3": round(mean(lambda r: r["top3"]), 1),
            "by_type": {t: round(mean(lambda r, t=t: r["by_type"][t]), 4) for t in runs[0]["by_type"]},
            "guardrails": {g: round(mean(lambda r, g=g: r["guardrails"][g]), 2) for g in ts.GUARDRAILS},
        }
        r = report[label]
        print(f"{label:34s} MRR {r['mrr']:.4f} top3 {r['top3']:.1f}% {r['by_type']}")
        print(f"{'':34s} {r['guardrails']}")
    with open(os.path.join(TEST, "bestof.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)


def run_average(cases, cat):
    managers = cat["manager"]
    ids = sorted({c["manager"] for c in cases})
    audits = {pid: (managers["M"][managers["index"][pid]], audit_vector(f"{pid}@full")) for pid in ids}
    selected = {(c["team"], c["manager"]) for c in cases}
    pairs = [p for p in ts.load_pairs(cat) if p[2] == "manager" and p[3] in audits]
    picks = {"audit 1 (catalog)": lambda a: a[0], "audit 2 (control)": lambda a: a[1],
             "average of both": lambda a: (a[0] + a[1]) / 2}
    ranks = {}
    for label, pick in picks.items():
        replaced = managers["M"].copy()
        for pid, audit in audits.items():
            replaced[managers["index"][pid]] = pick(audit)
        ranks[label] = np.array([
            rank_of(ms.compatibility([cat[qc]["M"][cat[qc]["index"][qid]]], replaced)[0], managers["index"][pid])
            for qc, qid, _, pid in pairs], float)
    chosen = np.array([(qid, pid) in selected for _, qid, _, pid in pairs])
    rng = np.random.default_rng(0)

    def describe(mask):
        return {label: f"mean rank {r[mask].mean():5.1f} median {np.median(r[mask]):4.1f} MRR {np.mean(1 / r[mask]):.3f}"
                for label, r in ranks.items()}

    print(f"managers {len(ids)}; pairs with those managers: {len(pairs)} ({int(chosen.sum())} selected for ranking badly, "
          f"{int((~chosen).sum())} not selected)")
    for name, mask in (("all pairs", np.ones(len(pairs), bool)), ("selected pairs", chosen), ("not selected", ~chosen)):
        print(f"[{name}] n={int(mask.sum())}")
        for label, text in describe(mask).items():
            print(f"   {label:20s} {text}")
    for name, mask in (("all pairs", np.ones(len(pairs), bool)), ("not selected", ~chosen)):
        for other in ("audit 1 (catalog)", "audit 2 (control)"):
            d = (np.log(ranks["average of both"]) - np.log(ranks[other]))[mask]
            b = [d[rng.integers(0, len(d), len(d))].mean() for _ in range(BOOTSTRAP)]
            print(f"[{name}] average vs {other}: log rank {d.mean():+.3f} "
                  f"(95% {np.percentile(b, 2.5):+.3f}, {np.percentile(b, 97.5):+.3f}); better {int((d < 0).sum())} worse {int((d > 0).sum())}")


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("prompts", "evaluate", "bestof", "average"):
        print(__doc__)
        sys.exit(1)
    cases, cat = find_cases()
    if sys.argv[1] == "prompts":
        for job_id in build_prompts(cases):
            print(os.path.join(TEST, "prompts", job_id + ".txt"))
        return
    if sys.argv[1] == "bestof":
        run_best_of(cat)
        return
    if sys.argv[1] == "average":
        run_average(cases, cat)
        return
    rows = evaluate(cases, cat)
    for r in sorted(rows, key=lambda r: -r["rank"]):
        print(f"{r['team']:28s} -> {r['manager']:20s} {r['spell']['club'][:22]:22s} "
              f"current {r['ranks']['current']:2d}  control {r['ranks']['control']}  spell {r['ranks']['spell']}")
    for label in ("current", "control", "spell"):
        print(summary(rows, label))
    with open(os.path.join(TEST, "result.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()

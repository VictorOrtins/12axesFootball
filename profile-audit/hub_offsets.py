"""Calcula o hubOffset de cada perfil e grava nos *-profiles.json do backend.

Um "hub" e um perfil que fica perto de quase todo usuario (em geral um perfil
moderado) e por isso aparece como mais compativel para muita gente. O offset e
a compatibilidade media do perfil contra usuarios simulados do quiz menos a
media do catalogo; o ranking subtrai HUB_PENALTY_WEIGHT x offset.

Rode de novo sempre que um vetor de perfil mudar ou um perfil entrar/sair.

Uso:
    python3 profile-audit/hub_offsets.py           # grava os offsets e imprime o relatorio
    python3 profile-audit/hub_offsets.py --check   # so o relatorio, sem gravar
"""
import json
import os
import random
import sys

import numpy as np

import match_scorer as ms
import profile_vector as pv

CATALOGS = {
    "football-ideology": ("football-ideology-profiles.json", "footballIdeologyId"),
    "team": ("team-profiles.json", "teamId"),
    "manager": ("manager-profiles.json", "managerId"),
}
CODES = ["DT", "D", "N", "C", "CT"]
REFERENCE_USERS = 4000
REFERENCE_SEED = 77
REPORT_USERS = 3000
REPORT_SEED = 5
# Calibrado nos resultados dos testadores (2026-11-06): cerca de 1/3 dos eixos em 50%
# e intensidade media perto de 9 pontos do centro.
LEAN_SD = 0.15
ANSWER_NOISE_SD = 0.9
NEUTRAL_AXIS_SHARE = 0.3


def simulated_users(n, seed):
    """Pessoas com uma inclinacao por eixo respondendo as perguntas Likert com ruido."""
    rng = random.Random(seed)
    nrng = np.random.default_rng(seed)
    qmap = pv.question_map()
    archetypes = pv.archetype_questions()
    by_axis = {ax: [] for ax in pv.axis_order()}
    for q in pv.load("questions-pool.json"):
        by_axis[q["axisId"]].append(q)
    users = []
    for _ in range(n):
        per_axis = 5 if rng.random() < 0.5 else 3
        data = {ax: {"answers": {}} for ax in by_axis}
        for ax, questions in by_axis.items():
            lean = float(np.clip(0.5 + nrng.normal(0, LEAN_SD), 0, 1))
            for q in rng.sample(questions, min(per_axis, len(questions))):
                value = lean if q["agreePole"] == "LEFT" else 1 - lean
                data[ax]["answers"][q["id"]] = CODES[int(np.clip(round(value * 4 + nrng.normal(0, ANSWER_NOISE_SD)), 0, 4))]
        data[pv.ARCHETYPE_KEY] = {q["id"]: rng.choice(q["options"])["id"] for q in archetypes}
        vector = pv.compute_vector(data, qmap, list(by_axis), archetypes)
        users.append([vector[a] for a in ms.AXIS_IDS])
    users = np.array(users)
    return np.where(nrng.random(users.shape) < NEUTRAL_AXIS_SHARE, ms.CENTER, users)


def offsets_for(T, reference):
    mean = ms.compatibility(reference, T, rounded=False).mean(axis=0)
    return np.round(mean - mean.mean(), 1)


def hub_report(name, ids, scores, users):
    top = np.argmax(scores, axis=1)
    share = np.bincount(top, minlength=len(ids)) / len(users)
    fair = 1 / len(ids)
    leader = int(share.argmax())
    return (f"{name:17} lider {ids[leader]} {share[leader] / fair:.1f}x a parte justa, "
            f"{int((share > 3 * fair).sum())} acima de 3x, {int((share == 0).sum())} nunca em 1o")


def main():
    write = "--check" not in sys.argv
    reference = simulated_users(REFERENCE_USERS, REFERENCE_SEED)
    report_users = simulated_users(REPORT_USERS, REPORT_SEED)
    for name, (file, key) in CATALOGS.items():
        path = os.path.join(pv.DATA, file)
        with open(path, encoding="utf-8") as f:
            profiles = json.load(f)
        ids = [p[key] for p in profiles]
        T = ms.vector_matrix([p["vector"] for p in profiles])
        offsets = offsets_for(T, reference) if write else [p.get("hubOffset", 0.0) for p in profiles]
        print("sem offset", hub_report(name, ids, ms.compatibility(report_users, T), report_users))
        print("com offset", hub_report(name, ids, ms.ranking_score(report_users, T, offsets), report_users))
        if write:
            for profile, offset in zip(profiles, offsets):
                profile["hubOffset"] = float(offset)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(profiles, f, ensure_ascii=False, indent=2)
                f.write("\n")


if __name__ == "__main__":
    main()

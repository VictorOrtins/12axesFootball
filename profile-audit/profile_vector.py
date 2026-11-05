"""Calculo do vetor de 12 eixos de um perfil auditado (manager | team | football-ideology).

O perfil responde como um usuario do quiz: as perguntas de questions-pool.json
(mais as perguntas de arquetipo, se archetype-questions.json tiver alguma).
O calculo espelha ScoringService.java:
  - cada resposta vira um valor 0..1 do lado do polo esquerdo
    (DT=0, D=0.25, N=0.5, C=0.75, CT=1; invertido quando agreePole == RIGHT),
    com o peso da pergunta;
  - uma pergunta com "secondary" conta tambem no segundo eixo, com o polo e o
    peso (0.5) do bloco secondary;
  - cada alternativa de arquetipo escolhida entra como uma resposta a mais, peso 1,
    em cada eixo que ela toca (valor = effects[eixo] / 100);
  - o eixo e a media ponderada x 100, arredondada a 1 casa.

O vetor e leftPercent: 100 = polo esquerdo de axes.json, 0 = polo direito.

Uso:
    python3 profile-audit/profile_vector.py <arquivo-de-saida.json>
        imprime o vetor calculado dessa saida
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "..", "backend", "src", "main", "resources", "data")

SCORE = {"DT": 0, "D": 0.25, "N": 0.5, "C": 0.75, "CT": 1}
ARCHETYPE_KEY = "archetype"


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def axis_order():
    return [a["id"] for a in load("axes.json")]


def question_map():
    return {q["id"]: q for q in load("questions-pool.json")}


def archetype_questions():
    return load("archetype-questions.json")


def archetype_problems(data, questions=None):
    """Problemas no bloco 'archetype' da saida (lista vazia se ok ou se nao ha perguntas)."""
    questions = archetype_questions() if questions is None else questions
    if not questions:
        return []
    choices = data.get(ARCHETYPE_KEY)
    if not isinstance(choices, dict):
        return [f"bloco '{ARCHETYPE_KEY}' ausente: responda as {len(questions)} perguntas de arquetipo"]
    problems = []
    for q in questions:
        opt = choices.get(q["id"])
        valid = [o["id"] for o in q["options"]]
        if opt is None:
            problems.append(f"pergunta de arquetipo '{q['id']}' sem resposta")
        elif opt not in valid:
            problems.append(f"'{q['id']}': alternativa '{opt}' invalida (validas: {'/'.join(valid)})")
    unknown = set(choices) - {q["id"] for q in questions}
    if unknown:
        problems.append(f"perguntas de arquetipo desconhecidas: {sorted(unknown)}")
    return problems


def _add(totals, axis, agree_pole, weight, score):
    left = score if agree_pole == "LEFT" else 1 - score
    totals[axis][0] += left * weight
    totals[axis][1] += weight


def compute_vector(data, qmap=None, axes=None, archetypes=None):
    """Vetor leftPercent 0-100 por eixo, igual ao ScoringService."""
    qmap = qmap or question_map()
    axes = axes or axis_order()
    archetypes = archetype_questions() if archetypes is None else archetypes
    totals = {ax: [0.0, 0.0] for ax in axes}
    for ax in axes:
        for qid, ans in data[ax]["answers"].items():
            q = qmap[qid]
            _add(totals, q["axisId"], q["agreePole"], q.get("weight", 1), SCORE[ans])
            sec = q.get("secondary")
            if sec:
                _add(totals, sec["axisId"], sec["agreePole"], sec["weight"], SCORE[ans])
    choices = data.get(ARCHETYPE_KEY) or {}
    for q in archetypes:
        opt = next((o for o in q["options"] if o["id"] == choices.get(q["id"])), None)
        if opt is None:
            continue
        for ax, left_percent in opt["effects"].items():
            totals[ax][0] += left_percent / 100.0
            totals[ax][1] += 1.0
    return {ax: round(s / w * 100, 1) if w else 50.0 for ax, (s, w) in totals.items()}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
    for p in archetype_problems(data):
        print("AVISO:", p)
    print(json.dumps(compute_vector(data), ensure_ascii=False))

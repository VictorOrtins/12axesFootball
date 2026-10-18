"""Monta o prompt de auditoria de um perfil de futebol (ver FOOTBALL_AUDIT.md).

Uso:
    python3 profile-audit/audit_prompt.py <catalog> <id>

Le profile-audit/research/<catalog>/<id>.json e grava prompts/<catalog>/<id>.txt:
cabecalho com o metodo, o arquivo de pesquisa inteiro, os eixos sem evidencia
verificada (gaps.axes) e as perguntas do quiz, embaralhadas dentro de cada eixo.
"""
import json
import os
import random
import sys

from profile_vector import BASE, DATA, archetype_questions, load

CATALOGS = {"manager", "team", "football-ideology"}
MAX_N_TOTAL = 0.18  # igual ao validate.py

SUBJECT = {
    "manager": "the manager {name}, across the spells counted in the research file (spellsCounted)",
    "team": "the team {name}, in the era of the research file, answering as its manager(s) at the time would for this team",
    "football-ideology": "the football ideology {name}, answering as a coach committed to it would, as its exemplars practised it in its era",
}

HEADER = """You are auditing, question by question and fully independently, the football profile "{name}" (catalog: {catalog}) on the 12 axes of the 12axes football quiz. Answer as {subject}. Judge THIS profile alone: you don't have (and must not imagine) the answers given for any other profile.

The research file below is your evidence. Build your answers on it:
- Facts with "verified": true were read on the source page. Facts with "verified": false are weaker (search summaries, or context outside the period).
- Only facts inside profilePeriod describe the profile. statedView is what the manager says, at any date.
- When what the manager says (statedView) and what the team does (sources) disagree, answer questions about what the team does from the behaviour, and questions about what the profile believes from both, weighing the dates.
- Read scopeNote, confidence and openQuestions: they say what the evidence covers and where it is weak.
{gaps}
METHOD (mandatory):
- For EACH of the 12 axes: first write a personaBrief of 1-2 sentences linking the evidence to that axis (only the part relevant to the axis, citing the facts you rely on).
- Then answer every question of that axis, one by one, with one of these codes: DT (discordo totalmente / strongly disagree), D (discordo / disagree), N (neutro / neutral), C (concordo / agree), CT (concordo totalmente / strongly agree). "C" means "concordo", never "option C".
- Genuinely simulate how this profile would answer EACH question on its own. DO NOT pick a target value for the axis and work backwards. Accept whatever comes out, even if surprising.
- Questions written as "você é o treinador" (you are the coach) are answered as the coach of this profile, in its period.
- N is only for genuine indifference, never for "the sources don't say" or "it doesn't apply to that era": decide from the evidence and from what the profile did. Use at most one N per axis and {max_n} in total, and count your Ns before writing.
- A profile can reject both poles of an axis: then answer each question on its own terms, which gives a middle value. Don't assume that rejecting one pole means embracing the other.
- Each question is independent and they are already shuffled. Answer by question id. "Agree means / Disagree means" explain what each answer says in football terms.
- A question marked "also counts for <axis>" belongs to the axis it is listed under; answer it once, there.

OUTPUT (mandatory): use the Write tool to save ONE strict JSON file (no markdown, no comments) exactly at this path:
{out_path}

Exact JSON format (keys of "answers" are the question ids; every axis present, each with exactly the questions listed under it):
{{
{format_lines}
}}

After writing the file, reply only with "OK {catalog}:{id}" and a 1-line summary. Don't paste the JSON in the reply.

=== RESEARCH FILE ({catalog}/{id}.json) ===
{research}

=== QUESTIONS BY AXIS ===
"""

GAPS_NONE = "\nEvery axis has at least one verified fact (gaps.axes is empty).\n"
GAPS_SOME = (
    "\nAxes WITHOUT verified evidence (gaps.axes): {axes}. Your answers there come from general knowledge of "
    "this profile: say so in the personaBrief, and keep them consistent with what IS verified.\n"
)


def load_en(name):
    with open(os.path.join(DATA, "i18n", "en", name), encoding="utf-8") as f:
        return json.load(f)


def axis_label(axis, axis_en):
    return f'"{axis["id"]}" {axis_en["label"]}: {axis_en["leftPole"]} ({axis["leftPole"]}) x {axis_en["rightPole"]} ({axis["rightPole"]})'


def question_lines(n, q, text_en, help_en, axes_en):
    lines = [f"{n}. [id={q['id']}] {q['text']}", f"   EN: {text_en}"]
    if help_en:
        lines.append(f"   Agree means: {help_en['agree']}")
        lines.append(f"   Disagree means: {help_en['disagree']}")
    if q.get("secondary"):
        lines.append(f"   (also counts for \"{q['secondary']['axisId']}\" {axes_en[q['secondary']['axisId']]['label']})")
    return lines


def questions_block(pid):
    axes = load("axes.json")
    axes_en = {a["id"]: a for a in load_en("axes.json")}
    texts_en = {q["id"]: q["text"] for q in load_en("questions.json")}
    help_en = {h["id"]: h for h in load_en("question-help.json")}
    pool = load("questions-pool.json")
    rng = random.Random(pid)
    lines = []
    for axis in axes:
        qs = [q for q in pool if q["axisId"] == axis["id"]]
        rng.shuffle(qs)
        lines += ["", f"### Axis {axis_label(axis, axes_en[axis['id']])}",
                  f"personaBrief (1-2 sentences) for THIS axis, then answer its {len(qs)} questions."]
        for n, q in enumerate(qs, 1):
            lines += question_lines(n, q, texts_en.get(q["id"], ""), help_en.get(q["id"]), axes_en)
    return "\n".join(lines) + "\n"


def archetype_block():
    questions = archetype_questions()
    if not questions:
        return ""
    lines = ["", "=== ARCHETYPE QUESTIONS (multiple choice) ===",
             "Pick ONE option per question, the one this profile would mark. Save the letter in the \"archetype\" block."]
    for q in questions:
        lines += ["", f"[id={q['id']}] {q['text']['pt']}"]
        lines += [f"  {o['id']}) {o['text']['pt']}" for o in q["options"]]
    return "\n".join(lines) + "\n"


def format_lines(axes):
    lines = [f'  "{ax}": {{ "personaBrief": "...", "answers": {{ "{ax}_03": "C", ... }} }},' for ax in axes]
    if archetype_questions():
        lines.append('  "archetype": { "<question id>": "A", ... }')
    else:
        lines[-1] = lines[-1].rstrip(",")
    return "\n".join(lines)


def build_prompt(catalog, pid, research):
    gaps = research.get("gaps", {}).get("axes", [])
    axes = [a["id"] for a in load("axes.json")]
    out_path = os.path.abspath(os.path.join(BASE, "subagent-out", catalog, f"{pid}.json"))
    header = HEADER.format(
        name=research["name"], catalog=catalog, id=pid,
        subject=SUBJECT[catalog].format(name=research["name"]),
        gaps=GAPS_SOME.format(axes=", ".join(gaps)) if gaps else GAPS_NONE,
        out_path=out_path, format_lines=format_lines(axes),
        max_n=int(len(load("questions-pool.json")) * MAX_N_TOTAL),
        research=json.dumps(research, ensure_ascii=False, indent=2),
    )
    return header + questions_block(pid) + archetype_block()


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in CATALOGS:
        print(__doc__)
        sys.exit(1)
    catalog, pid = sys.argv[1], sys.argv[2]
    path = os.path.join(BASE, "research", catalog, f"{pid}.json")
    if not os.path.exists(path):
        print(f"pesquisa nao encontrada: {path}")
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        research = json.load(f)
    if research.get("status", "complete") != "complete":
        print(f"pesquisa de {pid} nao esta completa (status {research['status']}): termine a pesquisa antes")
        sys.exit(1)
    out = os.path.join(BASE, "prompts", catalog, f"{pid}.txt")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(build_prompt(catalog, pid, research))
    print(out)


if __name__ == "__main__":
    main()

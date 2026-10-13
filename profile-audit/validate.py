"""Valida uma saida de auditoria (subagent-out ou answers) ANTES do merge.

Uso:
    python profile-audit/validate.py <catalog> <id> [caminho-do-json]

Exemplos:
    python profile-audit/validate.py personality nietzsche
    python profile-audit/validate.py ideology socialismo-lassalliano
    python profile-audit/validate.py personality nietzsche profile-audit/subagent-out/personality/nietzsche.json

Pesquisa de futebol (manager | team | football-ideology), ver FOOTBALL_RESEARCH.md:
    python profile-audit/validate.py research <catalog> <id> [caminho-do-json]
    Checa o arquivo profile-audit/research/<catalog>/<id>.json: periodo e spells,
    campos de cada fonte, fatos verificados dentro do periodo, lacunas por
    dimensao e por eixo (FR-15) e o nivel de confianca.

Roda TRES niveis de checagem, nesta ordem:

  [FORMA]     12 eixos, 20 respostas por eixo, ids corretos, codigos DT/D/N/C/CT,
              personaBrief nao vazio e o bloco "archetype" com uma alternativa valida
              por pergunta de arquetipo.
  [NEUTROS]   taxa de "N" no total e por eixo. Cada "N" vale exatamente 0.50 (o
              ponto morto), entao um eixo cheio de N nao mede a posicao do perfil -
              apenas colapsa artificialmente para ~50.
  [CONTEUDO]  direcao dos eixos conferida contra perfis-ancora reais, vizinhos mais
              proximos no catalogo (duplicata) e coerencia com o perfil declarado
              (personalityId da ideologia, ou ideologias que citam a personalidade).

Sai com codigo 1 se qualquer checagem BLOQUEANTE falhar. Avisos nao bloqueiam.

Por que este script existe: auditorias formalmente impecaveis ja foram mescladas
com erros graves de conteudo. Ver "Modos de falha conhecidos" em README.md.
"""
import json
import os
import re
import sys
import collections
import importlib.util

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "..", "backend", "src", "main", "resources", "data")

_spec = importlib.util.spec_from_file_location("compat", os.path.join(BASE, "compatibility.py"))
compat = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(compat)

_spec_pv = importlib.util.spec_from_file_location("profile_vector", os.path.join(BASE, "profile_vector.py"))
profile_vector = importlib.util.module_from_spec(_spec_pv)
_spec_pv.loader.exec_module(profile_vector)

AXES = compat.AXIS_IDS
VALID = {"DT", "D", "N", "C", "CT"}
SCORE = {"DT": 0, "D": 0.25, "N": 0.5, "C": 0.75, "CT": 1}

# Limites de neutros. Um "N" vale 0.50 e puxa o eixo para o ponto morto.
MAX_N_TOTAL = 0.18       # bloqueia acima disso
MAX_N_AXIS = 0.30        # bloqueia acima disso
WARN_N_AXIS = 0.25       # avisa a partir daqui

# Quao perto uma ideologia pode ficar de outra antes de ser considerada duplicata.
DUP_WARN = 93.0
DUP_BLOCK = 97.0
# Quao longe o perfil pode ficar da personalidade/ideologia que ele declara representar.
MISMATCH_WARN = 92.0

# Direcao REAL de cada eixo, medida nos dados (nao no axes-explained.md, que tem
# `religiao` e `imigracao` invertidos em relacao a implementacao).
# Formato: eixo -> (rotulo do polo 0, rotulo do polo 100, ancora_baixa, ancora_alta)
AXIS_POLES = {
    "estrutura":     ("centralizado/unitario", "descentralizado/federal", "stalin", "rothbard"),
    "representacao": ("autocracia", "democracia", "kim-jong-un", "jose-mujica"),
    "poder":         ("liberdade civil", "ordem/vigilancia", "rothbard", "stalin"),
    "imigracao":     ("multicultural/aberto", "assimilacionista/fechado", "justin-trudeau", "hitler"),
    "diplomacia":    ("pacifista", "militarista", "dalai-lama", "hitler"),
    "intervencao":   ("nacionalista assertivo", "nao-intervencionista", "hitler", "dalai-lama"),
    "economia":      ("privado/mercado", "publico/coletivo", "rothbard", "stalin"),
    "controle":      ("livre mercado", "planejamento", "rothbard", "stalin"),
    "comercio":      ("livre comercio/globalista", "protecionista", "milton-friedman", "hitler"),
    "religiao":      ("religioso", "irreligioso/secular", "khomeini", "stalin"),
    "moral":         ("tradicionalista", "progressista", "francisco-franco", "foucault"),
    "tecnologia":    ("biologia/naturalista", "tecnofilo", "ted-kaczynski", "ray-kurzweil"),
}

# Categorias validas do catalogo personality. Agrupam a pessoa na secao "por
# area de atuacao" da pagina de resultados; o campo `role` continua em texto
# livre e apenas descreve. Espelha PersonalityCategoryTest.java.
PERSONALITY_CATEGORIES = {
    "politico", "religioso", "economista", "filosofo",
    "teorico", "empresario", "intelectual", "ativista",
}

# Valores de "religions" nos metadados. Espelha ReligionFilter.java.
RELIGIONS = {"catholic", "protestant", "orthodox", "judaism", "islam", "buddhism", "hinduism", "other", "only"}
SELECTABLE_RELIGIONS = {"catholic", "protestant", "orthodox", "judaism", "islam", "buddhism", "hinduism"}
RELIGIOUS_THRESHOLD = 35.0

CATALOGS = {
    "personality": ("personality-profiles.json", "personalityId", "personalities.json"),
    "ideology": ("ideology-profiles.json", "ideologyId", "ideologies.json"),
    "country": ("countries-profiles.json", "countryId", "countries.json"),
}


# ---------- Futebol (ver FOOTBALL_RESEARCH.md) ----------
# Eixo -> (polo 0, polo 100, ancoras do polo 0, ancoras do polo 100). As ancoras
# sao julgamento (tasks/2. CREATE_FOOTBALL_AGENT.md) e so passam a ser checadas
# quando existirem perfis de futebol auditados com esses ids.
FOOTBALL_AXIS_POLES = {
    "pos": ("ball", "counter", ["pep-guardiola", "spain-2008-12", "fernando-diniz"], ["inter-2009-10", "leicester-2015-16", "diego-simeone"]),
    "pro": ("patient build-up", "direct play", ["maurizio-sarri", "pep-guardiola", "vicente-del-bosque"], ["dortmund-2010-12", "marcelo-bielsa", "sam-allardyce", "zdenek-zeman"]),
    "est": ("positional", "relational", ["louis-van-gaal", "pep-guardiola", "barcelona-1988-96"], ["fluminense-2023", "brazil-1982", "brazil-1970"]),
    "lar": ("through the middle", "down the wings", ["spain-2010", "milan-2003-07", "fernando-diniz"], ["manchester-united-1998-99", "bayern-2012-13", "chelsea-2004-05"]),
    "blo": ("press high", "sit deep", ["milan-1987-91", "jurgen-klopp", "marcelo-bielsa"], ["inter-1962-67", "greece-2004", "diego-simeone"]),
    "mar": ("zone", "man", ["arrigo-sacchi", "rafael-benitez", "maurizio-sarri"], ["marcelo-bielsa", "gian-piero-gasperini", "inter-1962-67"]),
    "pla": ("own identity", "adapt to the opponent", ["marcelo-bielsa", "pep-guardiola", "johan-cruyff"], ["jose-mourinho", "carlo-ancelotti", "carlos-bilardo"]),
    "res": ("spectacle", "result", ["cesar-luis-menotti", "tele-santana", "zdenek-zeman", "johan-cruyff"], ["carlos-bilardo", "massimiliano-allegri", "jose-mourinho", "diego-simeone"]),
    "sis": ("system", "talent", ["arrigo-sacchi", "ralf-rangnick", "pep-guardiola"], ["carlo-ancelotti", "zinedine-zidane", "renato-gaucho", "brazil-1970"]),
    "jog": ("technique", "physicality", ["spain-2008-12", "barcelona-2008-12", "brazil-1982"], ["sam-allardyce", "tony-pulis", "antonio-conte", "ralf-rangnick"]),
    "bas": ("youth", "experience", ["ajax-1994-95", "manchester-united-1995-96", "arsenal-2005-11"], ["inter-2009-10", "milan-2006-07", "juventus-2014-19"]),
    "lid": ("authority", "harmony", ["alex-ferguson", "fabio-capello", "antonio-conte", "marcelo-bielsa"], ["carlo-ancelotti", "vicente-del-bosque", "zinedine-zidane"]),
}

FOOTBALL_AXIS_DIMENSIONS = {
    "pos": {"possession", "transitions"},
    "pro": {"build-up", "transitions"},
    "est": {"shape", "build-up"},
    "lar": {"width"},
    "blo": {"pressing", "defensive-block", "transitions"},
    "mar": {"pressing", "defensive-block"},
    "pla": {"game-management"},
    "res": {"stated-view", "game-management"},
    "sis": {"stated-view", "game-management"},
    "jog": {"player-profile"},
    "bas": {"squad-building"},
    "lid": {"people-management"},
}

FOOTBALL_DIMENSIONS = {
    "shape", "build-up", "possession", "pressing", "defensive-block", "transitions", "width",
    "set-pieces", "game-management", "stated-view", "player-profile", "squad-building",
    "people-management",
}

FOOTBALL_CATALOGS = {"manager", "team", "football-ideology"}
TIERS = {"A", "B", "C", "D"}
CONFIDENCE = {"high", "medium", "low"}
UNREADABLE_REASONS = {"403", "404", "empty", "truncated", "not-accessible"}
SOURCE_FIELDS = ["title", "url", "tier", "language", "articleDate", "eventDate", "accessedOn",
                 "dimension", "evidence", "verified"]
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
SEASON_RE = re.compile(r"^(\d{4})/(\d{2})$")


def date_range(value):
    """Data parcial ou temporada -> (inicio, fim) como strings ISO comparaveis."""
    if value == "ongoing":
        return ("9999-12-31", "9999-12-31")
    season = SEASON_RE.match(value)
    if season:
        return (f"{season.group(1)}-07-01", f"{int(season.group(1)) + 1}-06-30")
    parts = value.split("-")
    if len(parts) == 3:
        return (value, value)
    if len(parts) == 2:
        return (f"{value}-01", f"{value}-31")
    return (f"{value}-01-01", f"{value}-12-31")


def valid_date(value, allow_season=False, allow_ongoing=False):
    if not isinstance(value, str):
        return False
    if allow_ongoing and value == "ongoing":
        return True
    if allow_season and SEASON_RE.match(value):
        return True
    return bool(DATE_RE.match(value))


def overlaps(value, start, end):
    lo, hi = date_range(value)
    return lo <= date_range(end)[1] and hi >= date_range(start)[0]


def check_period(period, label, errors, warnings):
    if not isinstance(period, dict):
        errors.append(f"[PERIODO] {label} tem de ser {{start, end}}")
        return False
    ok = True
    for key in ("start", "end"):
        if not valid_date(period.get(key), allow_ongoing=key == "end"):
            errors.append(f"[PERIODO] {label}.{key} invalido: {period.get(key)!r} (YYYY-MM-DD, ou 'ongoing' no end)")
            ok = False
        elif len(period[key]) < 10 and period[key] != "ongoing":
            warnings.append(f"[PERIODO] {label}.{key} parcial ({period[key]}): explique no scopeNote")
    return ok


def check_spells(spells, label, errors, warnings):
    if not isinstance(spells, list):
        errors.append(f"[PERIODO] {label} tem de ser uma lista")
        return []
    good = []
    for i, spell in enumerate(spells):
        if not str(spell.get("club", "")).strip() or not str(spell.get("reason", "")).strip():
            errors.append(f"[PERIODO] {label}[{i}] sem club ou reason")
        if check_period(spell, f"{label}[{i}]", errors, warnings):
            good.append(spell)
    return good


def validate_research(catalog, pid, path):
    if catalog not in FOOTBALL_CATALOGS:
        print(f"catalog invalido: {catalog} (use {', '.join(sorted(FOOTBALL_CATALOGS))})")
        sys.exit(1)
    path = path or os.path.join(BASE, "research", catalog, f"{pid}.json")
    if not os.path.exists(path):
        print(f"arquivo nao encontrado: {path}")
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"validando pesquisa {catalog}:{pid}\n  {path}\n")
    errors, warnings = [], []

    for key in ("id", "catalog", "name", "researchedOn", "scopeNote"):
        if not str(data.get(key, "")).strip():
            errors.append(f"[FORMA] campo obrigatorio vazio: {key}")
    if data.get("id") != pid:
        errors.append(f"[FORMA] id {data.get('id')!r} difere do arquivo ({pid})")
    if data.get("catalog") != catalog:
        errors.append(f"[FORMA] catalog {data.get('catalog')!r} difere de {catalog}")
    status = data.get("status", "complete")
    if status not in ("complete", "awaiting-user"):
        errors.append(f"[FORMA] status {status!r} invalido (complete | awaiting-user)")
    if status == "awaiting-user":
        validate_stub(data, errors, warnings)
    for key in ("ambiguities", "openQuestions", "sources", "statedView", "unreadable"):
        if not isinstance(data.get(key), list):
            errors.append(f"[FORMA] {key} tem de ser uma lista (vazia se nao houver)")
    if errors:
        report(errors, warnings)

    # ---------- [PERIODO] (FR-1, FR-3) ----------
    period = data.get("profilePeriod")
    windows = []
    if check_period(period, "profilePeriod", errors, warnings):
        windows = [period]
    if catalog == "manager":
        counted = check_spells(data.get("spellsCounted"), "spellsCounted", errors, warnings)
        check_spells(data.get("spellsExcluded"), "spellsExcluded", errors, warnings)
        if not data.get("spellsCounted"):
            errors.append("[PERIODO] manager sem spellsCounted")
        windows = counted or windows
    if catalog == "team":
        managers = data.get("managers")
        if not isinstance(managers, list) or not managers:
            errors.append("[PERIODO] team sem managers[] ({managerId, start, end})")
        else:
            for i, m in enumerate(managers):
                if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", str(m.get("managerId", ""))):
                    errors.append(f"[PERIODO] managers[{i}].managerId tem de ser um id kebab-case, nao um nome")
                check_period(m, f"managers[{i}]", errors, warnings)
    if catalog == "football-ideology" and not data.get("exemplars"):
        warnings.append("[PERIODO] football-ideology sem exemplars[] (managers/teams que a representam)")
    if data.get("ambiguities"):
        warnings.append(f"[PERIODO] {len(data['ambiguities'])} ambiguidade(s) registrada(s): confirme que o usuario respondeu")

    # ---------- [FONTES] (FR-5, FR-6, FR-11) ----------
    # So fatos verificados, de fonte A-C e dentro do periodo fecham uma lacuna.
    dims = set()
    for i, s in enumerate(data.get("sources", [])):
        tag = f"[FONTES] sources[{i}]"
        missing = [k for k in SOURCE_FIELDS if k not in s or s[k] in ("", None)]
        if missing:
            errors.append(f"{tag} sem {missing}")
            continue
        if s["tier"] not in TIERS:
            errors.append(f"{tag} tier {s['tier']!r} invalido (A-D)")
        if s["dimension"] not in FOOTBALL_DIMENSIONS:
            errors.append(f"{tag} dimension {s['dimension']!r} invalida")
        if not isinstance(s["verified"], bool):
            errors.append(f"{tag} verified tem de ser true/false")
        for key in ("articleDate", "accessedOn"):
            if not valid_date(s[key]):
                errors.append(f"{tag} {key} invalido: {s[key]!r}")
        if not valid_date(s["eventDate"], allow_season=True):
            errors.append(f"{tag} eventDate invalido: {s['eventDate']!r}")
            continue
        if s["verified"] and s["tier"] == "D":
            errors.append(f"{tag} fonte tier D nao pode contar como verificada")
        if s["verified"] and windows and not any(overlaps(s["eventDate"], w["start"], w["end"]) for w in windows):
            errors.append(f"{tag} verified com eventDate {s['eventDate']} fora do periodo do perfil")
        elif s["verified"] is True and s["tier"] != "D":
            dims.add(s["dimension"])
        if s.get("retrospectiveOnly") and s["verified"]:
            warnings.append(f"{tag} so em retrospectiva: confirme que o peso disso esta claro")

    for i, v in enumerate(data.get("statedView", [])):
        tag = f"[FALA] statedView[{i}]"
        if not all(str(v.get(k, "")).strip() for k in ("quote", "date", "source")):
            errors.append(f"{tag} sem quote, date ou source")
        elif not valid_date(v["date"]):
            errors.append(f"{tag} date invalido: {v['date']!r}")
        if v.get("provenance") not in ("primary", "attributed"):
            errors.append(f"{tag} provenance tem de ser primary ou attributed")
        elif v["provenance"] == "primary":
            dims.add("stated-view")

    for i, u in enumerate(data.get("unreadable", [])):
        if not u.get("url") or u.get("reason") not in UNREADABLE_REASONS:
            errors.append(f"[FONTES] unreadable[{i}] precisa de url e reason em {sorted(UNREADABLE_REASONS)}")

    # ---------- [LACUNAS] (FR-4, FR-15) ----------
    gaps = data.get("gaps")
    if not isinstance(gaps, dict):
        errors.append("[LACUNAS] gaps tem de ser {dimensions: [], axes: []}")
    else:
        need_dims = FOOTBALL_DIMENSIONS - dims
        need_axes = {ax for ax, feed in FOOTBALL_AXIS_DIMENSIONS.items() if not feed & dims}
        listed_dims, listed_axes = set(gaps.get("dimensions", [])), set(gaps.get("axes", []))
        if need_dims - listed_dims:
            errors.append(f"[LACUNAS] dimensoes sem fato verificado fora de gaps.dimensions: {sorted(need_dims - listed_dims)}")
        if need_axes - listed_axes:
            errors.append(f"[LACUNAS] eixos sem fato verificado fora de gaps.axes: {sorted(need_axes - listed_axes)}")
        if listed_dims - need_dims:
            warnings.append(f"[LACUNAS] gaps.dimensions lista dimensoes que tem fato verificado: {sorted(listed_dims - need_dims)}")
        if listed_axes - need_axes:
            warnings.append(f"[LACUNAS] gaps.axes lista eixos que tem fato verificado: {sorted(listed_axes - need_axes)}")
        print(f"[LACUNAS] {12 - len(need_axes)}/12 eixos com fato verificado; sem evidencia: {sorted(need_axes) or '-'}")

    # ---------- [CONFIANCA] (FR-12) ----------
    conf = data.get("confidence")
    if not isinstance(conf, dict) or conf.get("level") not in CONFIDENCE or not str(conf.get("reason", "")).strip():
        errors.append("[CONFIANCA] confidence tem de ser {level: high|medium|low, reason}")
    else:
        print(f"[CONFIANCA] {conf['level']}: {conf['reason']}")
        if conf["level"] == "low":
            warnings.append("[CONFIANCA] baixa: o perfil segue, mas com aviso ao usuario")

    report(errors, warnings)


def validate_stub(data, errors, warnings):
    """Stub salvo quando o agente para e pergunta ao usuario (FR-2): so precisa das perguntas."""
    if not data.get("ambiguities"):
        errors.append("[STUB] status awaiting-user exige ambiguities[] nao vazio")
    if not data.get("openQuestions"):
        errors.append("[STUB] status awaiting-user exige openQuestions[] com as perguntas feitas")
    if data.get("profilePeriod") is not None:
        check_period(data["profilePeriod"], "profilePeriod", errors, warnings)
    for a in data.get("ambiguities", []):
        print(f"[STUB] ambiguidade: {a}")
    if not errors:
        print("\nSTUB - aguardando resposta do usuario; a pesquisa ainda nao foi feita.")
    report(errors, warnings)


def report(errors, warnings):
    print()
    if warnings:
        print("AVISOS (nao bloqueiam, mas confira):")
        for w in warnings:
            print("  " + w)
    if errors:
        print("\nERROS (bloqueiam):")
        for e in errors:
            print("  " + e)
        sys.exit(1)
    print("OK - pesquisa valida.")
    sys.exit(0)


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def vectors(catalog):
    pf, key, _ = CATALOGS[catalog]
    return {p[key]: p["vector"] for p in load(pf)}


def names(catalog):
    _, _, meta = CATALOGS[catalog]
    return {p["id"]: p["name"] for p in load(meta)}


def compute_vector(data, qmap):
    # 240 perguntas + perguntas de arquetipo, igual ao ScoringService (ver profile_vector.py).
    return profile_vector.compute_vector(data, qmap)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == "research":
        if len(sys.argv) < 4:
            print(__doc__)
            sys.exit(1)
        validate_research(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
    catalog, pid = sys.argv[1], sys.argv[2]
    if catalog not in CATALOGS:
        print(f"catalog invalido: {catalog}")
        sys.exit(1)

    if len(sys.argv) > 3:
        path = sys.argv[3]
    else:
        path = os.path.join(BASE, "subagent-out", catalog, f"{pid}.json")
        if not os.path.exists(path):
            path = os.path.join(BASE, "answers", catalog, f"{pid}.json")
    if not os.path.exists(path):
        print(f"arquivo nao encontrado: {path}")
        sys.exit(1)

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    qp = load("questions-pool.json")
    qmap = {q["id"]: q for q in qp}
    pool = collections.defaultdict(set)
    for q in qp:
        pool[q["axisId"]].add(q["id"])

    errors, warnings = [], []
    print(f"validando {catalog}:{pid}\n  {path}\n")

    # ---------- [CATEGORIA] ----------
    # So personalidades tem category; o backend rejeita valor fora da lista.
    if catalog == "personality":
        meta = {m["id"]: m for m in load(CATALOGS[catalog][2])}
        entry = meta.get(pid)
        if entry is None:
            errors.append(f"[CATEGORIA] {pid} nao existe em personalities.json")
        else:
            category = entry.get("category")
            if not category:
                errors.append(
                    f"[CATEGORIA] {pid} sem campo 'category' — escolha um de: "
                    + ", ".join(sorted(PERSONALITY_CATEGORIES))
                )
            elif category not in PERSONALITY_CATEGORIES:
                errors.append(
                    f"[CATEGORIA] {pid} usa category invalida '{category}' — validas: "
                    + ", ".join(sorted(PERSONALITY_CATEGORIES))
                )

    # ---------- [TAMANHO DA DESCRICAO] ----------
    # Media/mediana medida nos tres catalogos: ~30 palavras / ~220 caracteres.
    # Descricoes muito longas destoam do catalogo e crescem a cada atualizacao.
    meta_file = CATALOGS[catalog][2]
    entrada = {m["id"]: m for m in load(meta_file)}.get(pid)
    if entrada and entrada.get("description"):
        desc = entrada["description"]
        palavras = len(desc.split())
        if palavras > 45 or len(desc) > 280:
            warnings.append(
                f"[DESCRICAO] {pid}: {len(desc)} caracteres / {palavras} palavras "
                f"(padrao ~220/~30, teto 280/45) — corte o secundario"
            )

    # ---------- [FRASE] ----------
    # So ideologias tem phrase. E o texto do card "Uma frase que te descreve":
    # tem de existir, caber no card e nao contradizer o vetor recem-calculado.
    if catalog == "ideology" and entrada and entrada.get("phrase") is not None:
        frase = entrada["phrase"]
        # New profiles are audited before their vector exists; NEW_PROFILE.md
        # requires writing the phrase only after that vector has been merged.
        if not frase.strip() and pid in vectors("ideology"):
            errors.append(f"[FRASE] {pid} sem 'phrase' — ver NEW_PROFILE.md")
        elif frase.strip():
            palavras = len(frase.split())
            if len(frase) > 170 or palavras > 25:
                warnings.append(
                    f"[FRASE] {pid}: {len(frase)} caracteres / {palavras} palavras "
                    f"(padrao ~135/~18, teto 170/25)"
                )
            if not frase.startswith("Quero"):
                warnings.append(f"[FRASE] {pid}: deveria comecar com 'Quero' (primeira pessoa)")
            if "culturalmente" in frase and "politicamente" in frase and "economicamente" in frase:
                warnings.append(
                    f"[FRASE] {pid}: usa o esqueleto fixo 'culturalmente/politicamente/economicamente'. "
                    f"Reescreva com o que a ideologia realmente defende (ver NEW_PROFILE.md)."
                )

    # ---------- [FORMA] ----------
    for ax in AXES:
        if ax not in data:
            errors.append(f"[FORMA] eixo ausente: {ax}")
            continue
        obj = data[ax]
        ans = obj.get("answers", {})
        if not str(obj.get("personaBrief", "")).strip():
            errors.append(f"[FORMA] {ax}: personaBrief vazio")
        if len(ans) != 20:
            errors.append(f"[FORMA] {ax}: {len(ans)} respostas (esperado 20)")
        missing = pool[ax] - set(ans)
        unknown = set(ans) - pool[ax]
        if missing:
            errors.append(f"[FORMA] {ax}: ids faltando {sorted(missing)}")
        if unknown:
            errors.append(f"[FORMA] {ax}: ids desconhecidos {sorted(unknown)}")
        bad = {k: v for k, v in ans.items() if v not in VALID}
        if bad:
            errors.append(f"[FORMA] {ax}: codigos invalidos {bad} (use so DT/D/N/C/CT)")
    # Perguntas de arquetipo: obrigatorias em saida nova; arquivos antigos de answers/
    # (anteriores a esta regra) nao tem o bloco, entao ali a falta so gera aviso.
    arch_problems = profile_vector.archetype_problems(data)
    legacy = os.path.normpath(path).startswith(os.path.normpath(os.path.join(BASE, "answers")))
    for prob in arch_problems:
        (warnings if legacy else errors).append(f"[FORMA] {prob}")
    if not arch_problems:
        print("[ARQUETIPO] " + " · ".join(f"{k} {v}" for k, v in data[profile_vector.ARCHETYPE_KEY].items()))
    extra = [k for k in data if k not in AXES and k != profile_vector.ARCHETYPE_KEY]
    if extra:
        warnings.append(f"[FORMA] chaves extras ignoradas: {extra}")

    if errors:
        print("FALHOU NA FORMA - corrija antes de seguir:")
        for e in errors:
            print("  " + e)
        sys.exit(1)

    # ---------- [NEUTROS] ----------
    total_n = 0
    for ax in AXES:
        vals = list(data[ax]["answers"].values())
        n = collections.Counter(vals)["N"]
        total_n += n
        frac = n / 20
        if frac > MAX_N_AXIS:
            errors.append(
                f"[NEUTROS] {ax}: {n}/20 = {frac:.0%} de N (limite {MAX_N_AXIS:.0%}). "
                f"Cada N vale 0.50; este eixo esta colapsando para o ponto morto."
            )
        elif frac >= WARN_N_AXIS:
            warnings.append(f"[NEUTROS] {ax}: {n}/20 = {frac:.0%} de N (perto do limite)")
    tfrac = total_n / 240
    print(f"[NEUTROS] total {total_n}/240 = {tfrac:.1%}")
    if tfrac > MAX_N_TOTAL:
        errors.append(f"[NEUTROS] total {tfrac:.1%} acima do limite {MAX_N_TOTAL:.0%}")

    # ---------- [CONTEUDO] ----------
    vec = compute_vector(data, qmap)

    # ---------- [RELIGIAO] ----------
    # Espelha ReligionFilterTest.java. O vetor so torna o campo obrigatorio; o
    # valor vem de pesquisa (ver "O campo religions" em NEW_PROFILE.md).
    if entrada is not None:
        religions = entrada.get("religions")
        if religions is None:
            errors.append(f"[RELIGIAO] {pid} sem campo 'religions' (use [] se nao houver vinculo)")
        else:
            invalid = [r for r in religions if r not in RELIGIONS]
            if invalid:
                errors.append(f"[RELIGIAO] {pid} usa valores invalidos {invalid} — validos: "
                              + ", ".join(sorted(RELIGIONS)))
            if "only" in religions and not (set(religions) & (SELECTABLE_RELIGIONS | {"other"})):
                errors.append(f"[RELIGIAO] {pid} usa 'only' sem uma religiao selecionavel (ou 'other') ao lado "
                              f"({', '.join(sorted(SELECTABLE_RELIGIONS))})")
            if vec["religiao"] <= RELIGIOUS_THRESHOLD and not religions:
                errors.append(
                    f"[RELIGIAO] religiao={vec['religiao']:.1f} (<= {RELIGIOUS_THRESHOLD:.0f}, lado religioso) "
                    f"e 'religions' vazio — pesquise e indique a tradicao que o perfil representa")
        print(f"[RELIGIAO] religiao={vec['religiao']:.1f} · religions={religions}")
    pvec, ivec = vectors("personality"), vectors("ideology")
    pname, iname = names("personality"), names("ideology")

    print("\n[CONTEUDO] vetor e direcao real dos eixos")
    print(f"  {'eixo':15s} {'valor':>6s}  0 <--------> 100")
    for ax in AXES:
        lo, hi, alo, ahi = AXIS_POLES[ax]
        print(f"  {ax:15s} {vec[ax]:6.1f}  {lo} <-> {hi}")

    # ancoras: o vetor esta do mesmo lado de quem deveria?
    print("\n[CONTEUDO] ancoras de referencia (para conferir se o lado faz sentido)")
    for ax in AXES:
        lo, hi, alo, ahi = AXIS_POLES[ax]
        if alo in pvec and ahi in pvec:
            print(f"  {ax:15s} {vec[ax]:6.1f}   | {pname.get(alo,alo)}={pvec[alo][ax]:.0f} .. {pname.get(ahi,ahi)}={pvec[ahi][ax]:.0f}")

    # duplicata dentro do proprio catalogo
    same = vectors(catalog)
    sim = sorted(
        ((compat.compatibility(v, vec), k) for k, v in same.items() if k != pid),
        reverse=True,
    )[:3]
    print(f"\n[CONTEUDO] mais proximos em {catalog} (duplicata?)")
    for s, k in sim:
        flag = ""
        if s >= DUP_BLOCK:
            flag = "  <<< BLOQUEIA"
            errors.append(
                f"[CONTEUDO] {s:.1f}% identico a '{k}' - perfil redundante, "
                f"nao acrescenta nada ao catalogo"
            )
        elif s >= DUP_WARN:
            flag = "  <<< aviso"
            warnings.append(f"[CONTEUDO] {s:.1f}% proximo de '{k}'")
        print(f"  {s:5.1f}%  {k}{flag}")

    # coerencia com o perfil declarado
    if catalog == "ideology":
        meta = {i["id"]: i for i in load("ideologies.json")}
        if pid in meta:
            ref = meta[pid].get("personalityId")
            if ref in pvec:
                s = compat.compatibility(pvec[ref], vec)
                print(f"\n[CONTEUDO] coerencia com personalityId declarado ({ref}): {s:.1f}%")
                if s < MISMATCH_WARN:
                    warnings.append(
                        f"[CONTEUDO] so {s:.1f}% com '{ref}', que esta declarado como a "
                        f"personalidade desta ideologia. Um dos dois vetores esta errado - "
                        f"compare eixo a eixo antes de mesclar."
                    )
                gaps = sorted(((abs(pvec[ref][a] - vec[a]), a) for a in AXES), reverse=True)[:3]
                print("  maiores divergencias: " + ", ".join(
                    f"{a} ({pvec[ref][a]:.0f} vs {vec[a]:.0f})" for _, a in gaps))
    else:
        citing = [i for i in load("ideologies.json") if i.get("personalityId") == pid]
        if citing:
            print(f"\n[CONTEUDO] ideologias que declaram esta personalidade")
            for i in citing:
                if i["id"] in ivec:
                    s = compat.compatibility(ivec[i["id"]], vec)
                    print(f"  {s:5.1f}%  {i['id']}")
                    if s < MISMATCH_WARN:
                        warnings.append(
                            f"[CONTEUDO] so {s:.1f}% com '{i['id']}', ideologia que declara "
                            f"este perfil. Um dos dois vetores esta errado."
                        )

    # ---------- resultado ----------
    print()
    if warnings:
        print("AVISOS (nao bloqueiam, mas confira):")
        for w in warnings:
            print("  " + w)
    if errors:
        print("\nERROS (bloqueiam o merge):")
        for e in errors:
            print("  " + e)
        sys.exit(1)
    print("OK - passou nas tres checagens.")


if __name__ == "__main__":
    main()

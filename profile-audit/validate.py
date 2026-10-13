"""Valida um arquivo de pesquisa de futebol (manager | team | football-ideology).

Uso:
    python3 profile-audit/validate.py research <catalog> <id> [caminho-do-json]

Checa o arquivo profile-audit/research/<catalog>/<id>.json: periodo e spells,
campos de cada fonte, fatos verificados dentro do periodo, lacunas por
dimensao e por eixo (FR-15) e o nivel de confianca. Ver FOOTBALL_RESEARCH.md.

Sai com codigo 1 se qualquer checagem BLOQUEANTE falhar. Avisos nao bloqueiam.
"""
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))


# ---------- Futebol (ver FOOTBALL_RESEARCH.md) ----------
# Eixo -> (polo 0, polo 100, ancoras do polo 0, ancoras do polo 100). As ancoras
# sao julgamento (tasks/2. CREATE_FOOTBALL_AGENT.md) e passam a ser checadas
# quando existir a auditoria de futebol (depois do banco de perguntas).
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


def main():
    if len(sys.argv) < 4 or sys.argv[1] != "research":
        print(__doc__)
        sys.exit(1)
    validate_research(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)


if __name__ == "__main__":
    main()

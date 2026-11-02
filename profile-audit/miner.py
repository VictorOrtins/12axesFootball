# /// script
# requires-python = ">=3.10"
# dependencies = ["trafilatura>=1.12", "requests>=2.31"]
# ///
"""Fetches pages and keeps only the paragraphs that matter for football research.

Usage:
    uv run profile-audit/miner.py <catalog> <id> <url> [<url> ...] [--terms "Chapman,Arsenal"] [--grep "appointed|1925"]

For each URL: fetch (Wayback Machine on failure), extract the main text and
publication date, keep paragraphs that match a dimension keyword (EN, PT, ES,
IT, DE, HU) or --grep, prefer paragraphs that mention a --terms word, add one
neighbour, cap per page. Pages are cached in profile-audit/raw/.cache/.

Writes profile-audit/raw/<catalog>/<id>.md (or <id>.2.md, <id>.3.md ... on
later runs) and prints its path. Every kept paragraph is verbatim page text.
"""
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import date

import requests
import trafilatura

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw")
CACHE = os.path.join(RAW, ".cache")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
MAX_KEPT = 12
MAX_CHARS = 1500

KEYWORDS = {
    "shape": ["formation", "shape", "w-m", "pyramid", "formação", "formacao", "esquema", "formación", "dibujo",
              "modulo", "schieramento", "grundordnung", "aufstellung", "felállás", "hadrend"],
    "build-up": ["build-up", "build up", "buildup", "playing out", "from the back", "goalkeeper", "long ball",
                 "saída de bola", "saida de bola", "construção", "goleiro", "salida de balón", "arquero", "portero",
                 "costruzione", "portiere", "spielaufbau", "torwart", "kapus", "labdakihozatal"],
    "possession": ["possession", "keep the ball", "retain", "short passing", "passing game", "tiki", "posse",
                   "troca de passes", "toque de bola", "posesión", "tenencia", "possesso", "palleggio", "ballbesitz",
                   "kurzpass", "labdabirtokl", "labdatart", "rövid passz"],
    "pressing": ["press", "gegenpress", "trigger", "pressão", "pressao", "presión", "presion", "pressione",
                 "pressing", "letámad"],
    "defensive-block": ["defend", "defensive", "low block", "deep", "high line", "offside", "zonal", "zone",
                        "man-mark", "man mark", "man-to-man", "marking", "sweeper", "libero", "stopper",
                        "centre-half", "center-half", "defesa", "bloco", "marcação", "marcacao", "zona", "líbero",
                        "defensa", "bloque", "marcaje", "marca personal", "marca pegajosa", "difesa", "marcatura",
                        "a uomo", "catenaccio", "abwehr", "verteidigung", "manndeckung", "raumdeckung", "abseits",
                        "védekez", "emberfog", "területvéd", "lesállás"],
    "transitions": ["counter-attack", "counterattack", "counter attack", "transition", "on the break", "breakaway",
                    "contra-ataque", "contra ataque", "transição", "transicao", "contraataque", "contragolpe",
                    "transición", "contropiede", "ripartenza", "konter", "umschalt", "ellentámad", "kontratámad"],
    "width": ["wing", "wide", "flank", "full-back", "fullback", "full back", "cross", "overlap", "ponta",
              "lateral", "cruzamento", "extremo", "puntero", "banda", "fascia", "esterno", "flügel", "flanke",
              "szélső", "beadás"],
    "set-pieces": ["set piece", "set-piece", "corner", "free kick", "free-kick", "throw-in", "bola parada",
                   "escanteio", "pelota parada", "tiro libre", "calcio piazzato", "punizione", "standardsituation",
                   "freistoß", "eckball", "szöglet", "szabadrúg"],
    "game-management": ["substitut", "half-time", "half time", "halftime", "adapt", "opponent", "game plan",
                        "tactical change", "substituição", "intervalo", "adversário", "sustitución", "rival",
                        "sostituzion", "avversari", "einwechsl", "halbzeit", "gegner", "umstell", "csere",
                        "félidő", "ellenfél"],
    "stated-view": ["said", "says", "told", "interview", "believe", "philosophy", "my football", "disse",
                    "afirmou", "declarou", "entrevista", "filosofia", "dijo", "declaró", "afirmó", "filosofía",
                    "ha detto", "intervista", "sagte", "philosophie", "mondta", "nyilatkoz", "filozófi"],
    "player-profile": ["technical", "technique", "physical", "strength", "athletic", "pace", "stamina", "skill",
                       "dribbl", "técnic", "tecnic", "físic", "fisic", "habilidade", "habilidad", "tecnica",
                       "technik", "technisch", "körperlich", "athlet", "technika", "fizikai", "gyors"],
    "squad-building": ["young", "youth", "academy", "debut", "veteran", "experienced", "signing", "signed",
                       "transfer", "jovem", "jovens", "estreia", "veterano", "contratação", "joven", "juveniles",
                       "cantera", "fichaje", "giovan", "esordi", "vivaio", "jugend", "nachwuchs", "debüt",
                       "erfahren", "fiatal", "utánpótlás", "bemutatkoz", "igazol"],
    "people-management": ["discipline", "dressing room", "dressing-room", "authority", "relationship", "fined",
                          "dropped", "respect", "harmony", "man-manage", "captain", "disciplina", "vestiário",
                          "vestiario", "autoridade", "relação", "vestuario", "autoridad", "relación",
                          "spogliatoio", "autorità", "rapporto", "disziplin", "kabine", "autorität", "fegyelem",
                          "öltöző", "tekintély", "kapitány"],
}
FORMATION_RE = re.compile(r"\b\d-\d-\d(?:-\d)?\b")
QUOTE_RE = re.compile(r"[\"“”«»„]")
PATTERNS = {dim: re.compile(r"\b(?:" + "|".join(re.escape(w) for w in words) + ")", re.IGNORECASE)
            for dim, words in KEYWORDS.items()}


def cache_path(url):
    return os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + ".json")


def fetch(url):
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    except requests.RequestException:
        return None, "not-accessible"
    if r.status_code in (404, 410):
        return None, "404"
    if r.status_code == 403:
        return None, "403"
    if r.status_code >= 400:
        return None, "not-accessible"
    return r.text, None


def extract(html):
    raw = trafilatura.extract(html, output_format="json", with_metadata=True, include_comments=False,
                              favor_recall=True)
    if not raw:
        return None
    data = json.loads(raw)
    return {"title": data.get("title") or "", "date": data.get("date") or "", "text": data.get("text") or ""}


def load(url):
    path = cache_path(url)
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    page = {"url": url, "source": url, "error": None}
    html, error = fetch(url)
    if html is None:
        archived = "https://web.archive.org/web/2/" + url
        html, _ = fetch(archived)
        if html is not None:
            page["source"] = archived
    content = extract(html) if html else None
    if not content or not content["text"].strip():
        page["error"] = error or "empty"
    else:
        page.update(content)
    if page["error"] != "not-accessible":
        os.makedirs(CACHE, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(page, f, ensure_ascii=False)
    return page


def tags_for(paragraph, grep):
    tags = [dim for dim, pattern in PATTERNS.items() if pattern.search(paragraph)]
    if FORMATION_RE.search(paragraph) and "shape" not in tags:
        tags.append("shape")
    if grep and grep.search(paragraph):
        tags.append("grep")
    return tags


def select(text, terms, grep):
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 40]
    scored = []
    for i, p in enumerate(paragraphs):
        tags = tags_for(p, grep)
        if not tags:
            continue
        score = len(tags) + (2 if terms and terms.search(p) else 0) + (1 if QUOTE_RE.search(p) else 0)
        scored.append((score, i, tags))
    best = sorted(scored, key=lambda s: (-s[0], s[1]))[:MAX_KEPT]
    kept = {i: tags for _, i, tags in best}
    for i in list(kept):
        if i + 1 < len(paragraphs) and i + 1 not in kept:
            kept[i + 1] = None
    return [(paragraphs[i][:MAX_CHARS], kept[i]) for i in sorted(kept)], len(paragraphs)


def output_path(catalog, pid):
    folder = os.path.join(RAW, catalog)
    os.makedirs(folder, exist_ok=True)
    path, n = os.path.join(folder, f"{pid}.md"), 1
    while os.path.exists(path):
        n += 1
        path = os.path.join(folder, f"{pid}.{n}.md")
    return path


def compile_list(value):
    words = [w.strip() for w in (value or "").split(",") if w.strip()]
    return re.compile("|".join(re.escape(w) for w in words), re.IGNORECASE) if words else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", choices=["manager", "team", "football-ideology"])
    parser.add_argument("id")
    parser.add_argument("urls", nargs="+")
    parser.add_argument("--terms", help="comma-separated subject words (names, clubs) that raise a paragraph's rank")
    parser.add_argument("--grep", help="extra regex; matching paragraphs are kept and tagged 'grep'")
    args = parser.parse_args()
    terms = compile_list(args.terms)
    grep = re.compile(args.grep, re.IGNORECASE) if args.grep else None

    out = [f"# Digest {args.catalog}/{args.id} ({date.today().isoformat()})", ""]
    unreadable = []
    for n, url in enumerate(dict.fromkeys(args.urls), 1):
        page = load(url)
        if page["error"]:
            unreadable.append(f"- {url} | {page['error']}")
            continue
        kept, total = select(page["text"], terms, grep)
        out.append(f"## [{n}] {page['title']}")
        out.append(f"url: {page['source']}")
        out.append(f"date: {page['date'] or 'unknown'} | paragraphs kept: {sum(1 for _, t in kept if t)} of {total}")
        out.append("")
        for text, tags in kept:
            label = ",".join(tags) if tags else "context"
            out.append(f"[{label}] {text}")
            out.append("")
    out.append("## Unreadable")
    out.extend(unreadable or ["- none"])

    path = output_path(args.catalog, args.id)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(os.path.relpath(path, os.path.dirname(BASE)))


if __name__ == "__main__":
    sys.exit(main())

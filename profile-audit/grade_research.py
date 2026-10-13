"""Grades a research file from the football agent against the expected results
of the docs/04 cases (profile-audit/tests/acceptance/cases.json).

Usage:
    python3 profile-audit/grade_research.py --list
    python3 profile-audit/grade_research.py <case> [path-to-research.json]

Runs `validate.py research` first, then each expected check. A "must" check
that fails makes the exit code 1; a "should" check only warns. It can't tell
whether a fact really is on its source page: spot-check a few by hand.
"""
import json
import os
import re
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
CASES = os.path.join(BASE, "tests", "acceptance", "cases.json")


def load_cases():
    with open(CASES, encoding="utf-8") as f:
        return {c["case"]: c for c in json.load(f)}


def text_of(data, fields):
    return json.dumps([data.get(f) for f in fields], ensure_ascii=False)


def matches(pattern, text):
    return re.search(pattern, text, re.IGNORECASE) is not None


def check_status(c, data):
    got = data.get("status", "complete")
    return got == c["value"], f"status {got!r}, expected {c['value']!r}"


def check_status_any(c, data):
    got = data.get("status", "complete")
    return got in c["accept"], f"status {got!r}, accepted {c['accept']}"


def check_period(c, data):
    period = data.get("profilePeriod") or {}
    problems = [f"{k} {period.get(k)!r} doesn't start with {c[k]!r}"
                for k in ("start", "end") if k in c and not str(period.get(k, "")).startswith(c[k])]
    return not problems, "; ".join(problems) or f"period {period.get('start')} .. {period.get('end')}"


def check_managers(c, data):
    got = [m.get("managerId") for m in data.get("managers", [])]
    missing = [i for i in c["ids"] if i not in got]
    return not missing, f"managerIds {got}" + (f", missing {missing}" if missing else "")


def check_confidence(c, data):
    got = (data.get("confidence") or {}).get("level")
    return got in c["accept"], f"confidence {got!r}, accepted {c['accept']}"


def check_text(c, data):
    return matches(c["pattern"], text_of(data, c["fields"])), f"/{c['pattern']}/ in {c['fields']}"


def check_ambiguity(c, data):
    return matches(c["pattern"], text_of(data, ["ambiguities", "openQuestions"])), f"/{c['pattern']}/ in ambiguities"


def check_no_verified(c, data):
    hits = [s.get("url") for s in data.get("sources", [])
            if s.get("verified") is True and matches(c["pattern"], json.dumps(s, ensure_ascii=False))]
    return not hits, f"/{c['pattern']}/ in verified sources: {hits or 'none'}"


def check_stated_view(c, data):
    for v in data.get("statedView", []):
        if not matches(c["pattern"], v.get("quote", "")):
            continue
        if "provenance" in c and v.get("provenance") != c["provenance"]:
            return False, f"found, but provenance {v.get('provenance')!r}, expected {c['provenance']!r}"
        if "date" in c and not str(v.get("date", "")).startswith(c["date"]):
            return False, f"found, but date {v.get('date')!r}, expected {c['date']!r}"
        return True, f"/{c['pattern']}/ dated {v.get('date')} ({v.get('provenance')})"
    return False, f"no statedView quote matching /{c['pattern']}/"


def check_axes_with_evidence(c, data):
    gaps = set((data.get("gaps") or {}).get("axes", []))
    missing = [a for a in c["axes"] if a in gaps]
    return not missing, f"axes still in gaps: {missing or 'none'}"


def check_unreadable_if_used(c, data):
    verified = [s["url"] for s in data.get("sources", []) if c["domain"] in s.get("url", "") and s.get("verified")]
    listed = [u["url"] for u in data.get("unreadable", []) if c["domain"] in u.get("url", "")]
    if verified:
        return False, f"{c['domain']} used as a verified source: {verified}"
    return True, f"{c['domain']} listed as unreadable" if listed else f"{c['domain']} not used"


def check_source_language(c, data):
    langs = {s.get("language") for s in data.get("sources", [])}
    return c["language"] in langs, f"source languages {sorted(l for l in langs if l)}"


CHECKS = {
    "status": check_status, "statusAny": check_status_any, "period": check_period,
    "managers": check_managers, "confidence": check_confidence, "text": check_text,
    "ambiguity": check_ambiguity, "noVerified": check_no_verified, "statedView": check_stated_view,
    "axesWithEvidence": check_axes_with_evidence, "unreadableIfUsed": check_unreadable_if_used,
    "sourceLanguage": check_source_language,
}


def grade(case, path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    validation = subprocess.run(
        [sys.executable, os.path.join(BASE, "validate.py"), "research", case["catalog"], data.get("id", ""), path],
        capture_output=True, text=True,
    )
    results = [("must", validation.returncode == 0, "validate.py research",
                "passes" if validation.returncode == 0 else validation.stdout.strip().splitlines()[-1])]
    complete = data.get("status", "complete") == "complete"
    for c in case["checks"]:
        if c.get("onlyIfComplete") and not complete:
            continue
        ok, detail = CHECKS[c["type"]](c, data)
        label = c["type"] + (f" ({c['why']})" if "why" in c else "")
        results.append((c.get("severity", "must"), ok, label, detail))
    return results


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cases = load_cases()
    if sys.argv[1] == "--list":
        for c in cases.values():
            print(f"{c['case']:28s} {c['input']}")
        return
    case = cases.get(sys.argv[1])
    if case is None:
        print(f"unknown case: {sys.argv[1]} (see --list)")
        sys.exit(1)
    path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE, "research", case["catalog"], f"{case['id']}.json")
    if not os.path.exists(path):
        print(f"file not found: {path}")
        sys.exit(1)
    print(f"grading {case['case']}\n  {path}\n")
    failed = False
    for severity, ok, label, detail in grade(case, path):
        mark = "PASS" if ok else ("FAIL" if severity == "must" else "WARN")
        failed = failed or (not ok and severity == "must")
        print(f"  {mark}  {label}\n        {detail}")
    print("\nFAILED" if failed else "\nPASSED")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

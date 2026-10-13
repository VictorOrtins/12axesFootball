---
name: new-manager
description: Researches a new manager profile for the 12axes football catalog (period and spells, sourced evidence by dimension, gaps, confidence) and saves the research file, following FOOTBALL_RESEARCH.md.
---

# /new-manager <name>

Creates the research for a new **manager** profile. A manager is profiled by the body of work they're **known for**, across every counted spell, not by one season. For one team in one season, use `/new-team`.

## Before anything

Read **`profile-audit/FOOTBALL_RESEARCH.md` in full** and follow it step by step.

## Fixed parameters

| Field | Value |
|---|---|
| `CATALOG` | `manager` |
| `id` | kebab-case name the manager is known by in football, no accents (`jurgen-klopp`, `renato-gaucho`, not `renato-portaluppi`); reuse an id already used in team files or the `validate.py` anchors; check `profile-audit/research/manager/` for a collision |
| Research file | `profile-audit/research/manager/<id>.json` |
| Period | `spellsCounted[]` and `spellsExcluded[]`, each `{ club, start, end, reason }`; `profilePeriod` runs from the first counted spell to the last |
| "Known for" test | a spell counts if it brought major titles, a recognisable style with tactical coverage, or a move to a bigger job. Counted spells weigh the same |
| Links | optional `teamProfiles[]`: ids of team profiles this manager coached (`liverpool-2021-22`) |
| Validate | `python3 profile-audit/validate.py research manager <id>` |

## Manager-specific notes

- Research every counted spell, not only the most famous one; check each fact's `eventDate` against the counted spells (a fact from an excluded spell isn't evidence).
- `stated-view` matters most here: interviews and press conferences over the career, dated, kept separate from what the teams did.
- `squad-building` = who the manager gives minutes to (young players and debuts vs established veterans), not the club's transfer budget.

## Stop rules

- Ambiguous subject or spells: ask the user and stop (FOOTBALL_RESEARCH.md step 1).
- Counted work shorter than about half a season (~15 competitive matches): tell the user and stop unless they say to go on.
- After step 7 (research saved and validated), **stop**: the football question pool doesn't exist yet, so there is no audit. Report to the user as described at the end of FOOTBALL_RESEARCH.md.

## Rules that can't be broken

Never mark a fact `verified: true` unless it was read on the source page. Never cite a search summary. Never skip a blocked source silently. Never invent a vector.

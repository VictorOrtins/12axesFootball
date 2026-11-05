---
name: new-manager
description: Researches a new manager profile for the 12axes football catalog (period and spells, sourced evidence by dimension, gaps, confidence) and saves the research file, with the football-researcher agent.
---

# /new-manager <name>

Creates the research for a new **manager** profile. A manager is profiled by the body of work they're **known for**, across every counted spell, not by one season. For one team in one season, use `/new-team`.

## How to run it

Don't read `profile-audit/FOOTBALL_RESEARCH.md` and don't research in the main session.

1. Pick the `id` (table below) and check `profile-audit/research/manager/` for a collision.
2. Launch the **`football-researcher`** agent (Agent tool, `subagent_type: "football-researcher"`) with: catalog `manager`, the id, the subject, the counted spells or period if the user fixed them, and the manager-specific notes below. It searches, mines the pages with `profile-audit/miner.py`, saves and validates the research file.
3. If it saved a stub (`"status": "awaiting-user"`), ask the user its questions, then launch it again with the answers.
4. Relay its reply to the user. Spot-check two or three `verified` facts in the file against the digest in `profile-audit/raw/manager/`.

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

- Ambiguous subject or spells: the agent saves a stub and stops; ask the user.
- Counted work shorter than about half a season (~15 competitive matches): the agent stops; go on only if the user says so.
- After the research is saved and validated, **stop**: the audit is a separate run (`profile-audit/FOOTBALL_AUDIT.md`). Report the agent's reply to the user.

## Rules that can't be broken

Never mark a fact `verified: true` unless it was read on the source page. Never cite a search summary. Never skip a blocked source silently. Never invent a vector.

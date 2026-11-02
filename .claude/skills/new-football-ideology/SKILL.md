---
name: new-football-ideology
description: Researches a new football ideology profile for the 12axes football catalog (era, exemplar managers and teams, sourced evidence by dimension, gaps, confidence) and saves the research file, with the football-researcher agent.
---

# /new-football-ideology <name>

Creates the research for a new **football ideology**: a way of playing or running a team (Total Football, Gegenpressing, Catenaccio, positional play).

## How to run it

Don't read `profile-audit/FOOTBALL_RESEARCH.md` and don't research in the main session.

1. Pick the `id` (table below) and check `profile-audit/research/football-ideology/` for a collision.
2. Launch the **`football-researcher`** agent (Agent tool, `subagent_type: "football-researcher"`) with: catalog `football-ideology`, the id, the ideology, any era the user fixed, and the ideology-specific notes below. It searches, mines the pages with `profile-audit/miner.py`, saves and validates the research file.
3. If it saved a stub (`"status": "awaiting-user"`), ask the user its questions, then launch it again with the answers.
4. Relay its reply to the user. Spot-check two or three `verified` facts in the file against the digest in `profile-audit/raw/football-ideology/`.

## Fixed parameters

| Field | Value |
|---|---|
| `CATALOG` | `football-ideology` |
| `id` | kebab-case name, no accents (`total-football`, `gegenpressing`, `catenaccio`); check `profile-audit/research/football-ideology/` for a collision |
| Research file | `profile-audit/research/football-ideology/<id>.json` |
| Period | `profilePeriod` = the era when the idea was defined and practised; partial dates are fine (`1965`–`1978`) |
| Exemplars | `exemplars[]` = `{ id, kind: "manager" \| "team", reason }`, using catalog ids |
| Validate | `python3 profile-audit/validate.py research football-ideology <id>` |

## Ideology-specific notes

- Describe the idea, not one team: look for what its exemplars have in common, and record where they differ in `openQuestions[]`.
- Names: political words are allowed when that's how the idea is popularly known. Record the origin of the name (who coined it, when) under `stated-view` when it came from a manager.
- A label that turns out to be wrong for what's described ("tiki-taka" for Guardiola's City) goes in `openQuestions[]`, with the label the evidence supports.

## Stop rules

- Ambiguous name (one label used for two different ideas): the agent saves a stub and stops; ask the user.
- After the research is saved and validated, **stop**: the audit is a separate run (`profile-audit/FOOTBALL_AUDIT.md`). Report the agent's reply to the user.

## Rules that can't be broken

Never mark a fact `verified: true` unless it was read on the source page. Never cite a search summary. Never skip a blocked source silently. Never invent a vector.

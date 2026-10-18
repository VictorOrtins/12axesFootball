---
name: new-football-ideology
description: Researches a new football ideology profile for the 12axes football catalog (era, exemplar managers and teams, sourced evidence by dimension, gaps, confidence) and saves the research file, following FOOTBALL_RESEARCH.md.
---

# /new-football-ideology <name>

Creates the research for a new **football ideology**: a way of playing or running a team (Total Football, Gegenpressing, Catenaccio, positional play).

## Before anything

Read **`profile-audit/FOOTBALL_RESEARCH.md` in full** and follow it step by step.

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

- Ambiguous name (one label used for two different ideas): ask the user and stop.
- After step 7, **stop**: the audit is a separate run (`profile-audit/FOOTBALL_AUDIT.md`). Report to the user as described at the end of FOOTBALL_RESEARCH.md.

## Rules that can't be broken

Never mark a fact `verified: true` unless it was read on the source page. Never cite a search summary. Never skip a blocked source silently. Never invent a vector.

---
name: new-team
description: Researches a new team-era profile for the 12axes football catalog (exact period, managers by id, sourced evidence by dimension, gaps, confidence) and saves the research file, following FOOTBALL_RESEARCH.md.
---

# /new-team <team and season/era>

Creates the research for a new **team** profile: one team in one era ("Liverpool 2021/22", "Netherlands, 1974 World Cup"). For a manager's whole career, use `/new-manager`.

## Before anything

Read **`profile-audit/FOOTBALL_RESEARCH.md` in full** and follow it step by step.

## Fixed parameters

| Field | Value |
|---|---|
| `CATALOG` | `team` |
| `id` | kebab-case team + era, no accents (`liverpool-2021-22`, `netherlands-1974`, `gremio-2017`); when the era covers several managers and the case is one manager's part, end with that manager's id (`vasco-2026-pedro-emanuel`); check `profile-audit/research/team/` for a collision |
| Research file | `profile-audit/research/team/<id>.json` |
| Period | `profilePeriod` = the era's exact first and last competitive match (or the tournament's dates) |
| Managers | `managers[]` = `{ managerId, start, end }` for every manager in the period. `managerId` is the manager catalog id (`jurgen-klopp`), **never the team name or a display name**; reuse an existing id (FOOTBALL_RESEARCH.md step 1) |
| Validate | `python3 profile-audit/validate.py research team <id>` |

## Team-specific notes

- Season-mixing is the most common error: a "2017" search returns 2018 pieces; check every `eventDate`.
- "<Club> <year>" can cover more than one manager (Vasco 2026: Diniz, Renato, Pedro Emanuel). If the user means one manager's part, that's an ambiguity: ask.
- A league that runs by calendar year (Brazil) uses `YYYY`; a European season uses `YYYY/YY`.

## Stop rules

- Ambiguous team, era or calendar (e.g. "Sundowns 2025": calendar 2025 or 2024/25?): ask the user and stop.
- Era shorter than about half a season (~15 competitive matches): tell the user and stop unless they say to go on. A single tournament (a World Cup) is fine.
- After step 7, **stop**: no audit until the football question pool exists. Report to the user as described at the end of FOOTBALL_RESEARCH.md.

## Rules that can't be broken

Never mark a fact `verified: true` unless it was read on the source page. Never cite a search summary. Never skip a blocked source silently. Never invent a vector.

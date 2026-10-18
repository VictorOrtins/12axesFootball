# Resume point — 2026-10-14

Branch `football-logic`. Nothing from this session is committed (user asks before commits).

## What "profile" means here

When the user says "create the profiles" for ideologies, managers or teams, they mean: run the `/new-*` research pipeline (steps 1–7 of `profile-audit/FOOTBALL_RESEARCH.md`), **one subagent per item**, save the JSON in `profile-audit/research/<catalog>/<id>.json`, validate it, and mark it ✅ + confidence in the matching `tasks/*.md` list. It does **not** mean the audit (step 8) or writing vectors to `backend/.../data/*.json`. The football audit doesn't exist yet; the user chose not to build it for now.

## Done

1. **Question pool** (uncommitted): 60 football questions (5 per axis) in `backend/src/main/resources/data/questions-pool.json` + `i18n/en/questions.json` + help + glossary. Draft record: `tasks/4. FOOTBALL_QUESTIONS_DRAFT.md`.
2. **Ideologies** (`tasks/5. FOOTBALL_IDEOLOGIES.md`, 36 entries): research done for 1–7 (kick-and-rush, combination-game, danubian-school, wm-system, la-nuestra, hungarian-4-2-4, futebol-arte). Rest waiting.
3. **Managers** (`tasks/6. FOOTBALL_MANAGERS.md`, 40 entries + Shankly): batch 1 all researched and reviewed: Guardiola (high), Klopp, Mourinho, Diniz, Bielsa, Telê, Renato (medium). Rest waiting.
   - User decisions applied: Guardiola excludes Barcelona B (profile starts 2008-07-01); Mourinho excludes União de Leiria and Benfica 2025–26 (period 2002-01-23 to 2024-01-16, 7 spells); Diniz counts Vasco 2025–26.
4. **Teams** (`tasks/7. FOOTBALL_TEAMS.md`, 30 candidates + 13 already researched): batch 1 done, all validate:
   barcelona-2008-12 (medium), milan-1988-91 (low), brazil-1982 (low), dortmund-2010-13 (medium), leeds-2019-20 (medium), fluminense-2023 (low), atletico-madrid-2013-14 (medium).

`python3 -m unittest discover -s profile-audit/tests` passes (38 tests).

## Next steps

1. Next batches: pick more managers from `tasks/6` (21 Europe + South America), more teams from `tasks/7`, remaining ideologies from `tasks/5`. One subagent per item, steps 1–7 only.
2. Manager files missing for ids already used in team files: `arrigo-sacchi`, `diego-simeone`.
3. Ask before committing anything.

## Open decisions for the user

**Ideologies**
- Kick and rush vs Route One (#32): sources treat them as the same. Split or merge?
- Futebol-arte: "talent inside a structure" (1958–70) or "talent first" (1982)? Drives `sis` and `est`.
- WM marking: Chapman's zonal stopper vs later English number-marking?
- Danubian: `blo` and `mar` have no verified evidence; period cut at 1938 (vs 1954–56).
- La Nuestra: keep Uruguay in it or split it out?
- ~25 new exemplar ids invented by agents (`herbert-chapman`, `brazil-1958`, `river-plate-1941-47`, …) need checking when catalogs are built.

**Managers**
- Klopp: now Germany coach (from 2026-07/08, 4 matches), excluded as too short; count all of Mainz 2001–08 or only 2004–07?
- Renato: count Flamengo 2021, Grêmio 2022–24, Fluminense 2025 (no titles)? New Grêmio spell from 2026-09-14 excluded.
- Telê: Al-Ahli excluded, Palmeiras 1979 counted; Fluminense ends 1970-03.
- Bielsa: Uruguay spell closed 2026-06-30 by the agent (list said "2023–"): confirm. Atlas/América/Lille could be counted if sources show a recognisable style. Marking man-oriented for the whole career or later spells only?
- Guardiola: how much do man-oriented marking elements (Bayern, early City) pull `mar`?
- Recurring: marking (`mar`) is close to memory-only for most historical profiles.

**Teams**
- Brazil 1982: only the 5 World Cup matches counted (no qualifiers/friendlies). Shape disputed (4-3-3 / 4-2-2-2 / 4-4-2). Does attacking at 2–2 v Italy count toward `pla` or `res`?
- Milan 1988–91 excludes Sacchi's first season 1987/88: intended?
- Barcelona: 2008/09 vs 2010–12 versions weighted equally?
- Dortmund marking unclear (zonal base with man-oriented pressing jumps?). Atlético marking rests on one 2014 overview.
- Fluminense 2023, Milan, Brazil 1982 are low confidence (thin sources).

## Not done / blocked

- **Audit (step 8)** for any profile: not built. Would need the political method recovered from commit `302a66c`, and the guide expects 20 questions per axis (pool has 5). User declined building it for now.

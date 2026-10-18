<div align="center">

# 12 Axes Football

A football quiz that places you on twelve independent axes of how the game should be played, and compares your answers with football ideas, teams and managers.

Portuguese and English · no sign-up

![Java](https://img.shields.io/badge/Java-21-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6) ![CI](https://github.com/VictorOrtins/12axesFootball/actions/workflows/ci.yml/badge.svg)

</div>

## Overview

This is a fork of [12 Axes](https://12axes.vercel.app), a political quiz, rebuilt for football. Instead of ideologies, countries and political figures, your answers are matched against football ideas (schools of play), team eras and managers. [FORK_README.md](FORK_README.md) has the motivation and inspirations.

**Status: work in progress.** The political content is gone and the code runs on the football axes. The question pool has its first 60 statements (5 per axis), enough for the short and extended quizzes, and the three catalogs are still empty. Profiles are being researched first (see [Adding profiles](#adding-football-ideas-teams-or-managers)).

## About the project

### What it is

An anonymous quiz. You rate statements on a five-point agreement scale and get a percentage on each axis, the football idea closest to you, the team era that played the way you like, and the managers who think about the game like you.

### The 12 axes

Each axis runs between two poles. They are grouped into three dimensions, which are also used to find the closest team and manager per dimension.

| Dimension | Key | Axis | Left pole (0) | Right pole (100) |
|-----------|-----|------|---------------|------------------|
| Tactics | `pos` | Possession | Ball | Counter |
| Tactics | `pro` | Progression | Patient build-up | Direct play |
| Tactics | `est` | Structure | Positional | Relational |
| Tactics | `lar` | Width | Through the middle | Down the wings |
| Tactics | `blo` | Block | Press high | Sit deep |
| Tactics | `mar` | Marking | Zone | Man |
| Philosophy | `pla` | Game plan | Own identity | Adapt to the opponent |
| Philosophy | `res` | Purpose | Spectacle | Result |
| Philosophy | `sis` | Who decides | System | Talent |
| Philosophy | `jog` | Player type | Technique | Physicality |
| Management | `bas` | Squad | Youth | Experience |
| Management | `lid` | Leadership | Authority | Harmony |

The football compass on the results page uses Possession as the x axis, Block as the y axis and Purpose as the strip below. The reasoning behind the axes is in [docs/06-football-axes.md](docs/06-football-axes.md).

### How your result is calculated

1. Each answer moves an axis toward one of its poles. Strong agreement counts fully, "neutral" leaves the axis at the center, and disagreement pushes the other way.
2. The average of your answers on each axis becomes a percentage between the two poles, labeled balanced, leaning, strong, or very strong depending on how far it is from the center.
3. Your twelve percentages form a profile, which is compared with every football idea, team and manager in the catalogs. The closest ones are shown with a compatibility score.

| Answer | Value |
|--------|------:|
| Strongly agree | 1.00 |
| Agree | 0.75 |
| Neutral | 0.50 |
| Disagree | 0.25 |
| Strongly disagree | 0.00 |

The quiz has three lengths (short, extended and extreme), drawn from a pool balanced across the axes, plus optional multiple-choice "archetype" questions that score several axes at once. A statement can also count for a second axis at a lower weight (`secondary` in the pool). The pool has 60 statements so far, so the extreme quiz has the same questions as the extended one until it grows to 240.

### Methodological note

This is a tool for exploring ideas about football, not a scientific instrument. A high compatibility means your answers are close to a profile, not that a manager would pick you or that you share every view of a team. Profiles are simplified models built from sourced research.

## Features

- Results by axis, with intensity and the rarest and most common positions in your profile.
- Closest football idea and its phrase, plus other close ideas and the most distant one.
- Closest team era, and the closest team per dimension (tactics, philosophy, management).
- Closest manager as an Ultimate Team-style card, managers per dimension and by category.
- A football compass (possession × block, with purpose as a strip).
- An "axis tension" readout for pairs of positions that rarely appear together.
- Comparison with any manager, team or football idea, axis by axis.
- Share card (PNG), PDF report, and shareable result link.

## Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 21, Spring Boot 3.3, Maven |
| Frontend | React 18, TypeScript, Vite 5 |
| Data | Versioned JSON, loaded into memory at startup |
| Tests | JUnit 5, MockMvc, AssertJ, Vitest |
| CI | GitHub Actions (backend tests, i18n check, frontend tests and build) |
| Deploy | Backend on Render (Docker), frontend on Vercel |

There is no database. The catalogs change only through reviewed commits, so the backend reads the JSON once at startup, validates it, and scores every request in memory.

### Project data

All data lives in `backend/src/main/resources/data/`, with English translations in `i18n/en/`.

| File | Contents |
|------|----------|
| `axes.json` | The 12 football axes, their poles and labels |
| `questions-pool.json` | The question pool, with axis, polarity, weight and an optional second axis |
| `question-help.json` / `glossary.json` | What agreeing and disagreeing mean for each statement, and the football terms underlined in them |
| `archetype-questions.json` | The multiple-choice questions (empty for now) |
| `football-ideologies.json` / `football-ideology-profiles.json` | Football ideas and their 12-axis vectors |
| `teams.json` / `team-profiles.json` | Team eras (a club or national team over a set period) |
| `managers.json` / `manager-profiles.json` | Managers, profiled by the body of work they're known for |

On startup the backend refuses to run if any catalog entry lacks a vector or a vector does not have exactly the 12 known axes. Empty catalogs are allowed: their results come back as `null` or empty lists. The backend tests run on a synthetic fixture in `backend/src/test/resources/data`.

### Repository structure

```txt
12axesFootball/
├── backend/                 Spring Boot API
│   └── src/main/java/com/twelveaxes/
│       ├── config/          CORS, cache headers, origin enforcement
│       ├── controller/      REST endpoints
│       ├── model/           records and DTOs
│       └── service/         data loading, scoring, matchers
├── frontend/                React + Vite app
│   ├── src/components/      home, quiz, results, report
│   ├── src/i18n/            PT/EN strings
│   └── scripts/             static page generator, design tokens
├── profile-audit/           research guide and validator for football profiles
├── docs/                    design notes for the football version
├── scripts/                 repository checks (i18n)
└── .claude/skills/          Claude Code skills for researching profiles
```

### How matching works

A result is a vector of twelve values from 0 to 100. The `ProfileMatchScorer` compares it with each profile using four weighted parts:

| Component | Weight | What it measures |
|-----------|-------:|------------------|
| Per axis | 0.42 | Distance on each axis, with an extra penalty when you and the profile are on opposite sides of the center |
| Direction | 0.33 | Cosine similarity of both vectors around the center, damped near it, where direction is mostly noise |
| Magnitude | 0.18 | Whether your overall intensity matches the profile's, so a moderate user does not match an extreme profile just because the direction agrees |
| Outlier | 0.07 | A penalty for a single axis that is far off |

Each catalog is ranked separately. `ScorerBenchmarkTest` guarded the calibration on the political catalogs; it is disabled until it is recalibrated on the football ones. [backend/src/main/java/com/twelveaxes/MATCH_EXPLAINED.md](backend/src/main/java/com/twelveaxes/MATCH_EXPLAINED.md) explains the matching in detail.

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/quiz?variant=short\|extended\|extreme` | Quiz metadata and the question pool |
| `POST` | `/api/results` | Scores answers and returns axes and matches |
| `GET` | `/api/results/by-axes?v=...` | Rebuilds a result from 12 values, for shared links |
| `GET` | `/api/football-ideologies[/{id}]` | Football idea catalog |
| `GET` | `/api/teams[/{id}]` | Team catalog |
| `GET` | `/api/managers[/{id}]` | Manager catalog |
| `GET` | `/api/compare/catalog` | Every profile that can be compared |
| `GET` | `/api/compare?type=manager\|team\|football-ideology&id=...&v=...` | Compares a profile with 12 values |

Endpoints accept `lang=pt|en`. `/api/**` answers only requests whose `Origin` or `Referer` is in `FRONTEND_ORIGINS`, and returns `403` otherwise. `/api/health` stays open for the Render health check.

<details>
<summary>Example request</summary>

```json
POST /api/results?lang=en
{
  "variant": "short",
  "answers": [
    { "questionId": "pos_01", "answer": "STRONGLY_AGREE" },
    { "questionId": "blo_03", "answer": "DISAGREE" }
  ]
}
```

`answer` is one of `STRONGLY_AGREE`, `AGREE`, `NEUTRAL`, `DISAGREE`, `STRONGLY_DISAGREE`.

</details>

### Running locally

You need a Java 21 JDK and Node.js 20+. Maven is not required: the repository ships the Maven Wrapper.

```bash
# Backend: http://localhost:8080
cd backend
sh mvnw compile exec:java          # macOS / Linux / Git Bash
.\mvnw.cmd compile exec:java       # Windows PowerShell / cmd

# Frontend: http://localhost:5173 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Run only the backend line for your system.

| Variable | Side | Default | Purpose |
|----------|------|---------|---------|
| `PORT` | Backend | `8080` | HTTP port |
| `FRONTEND_ORIGINS` | Backend | localhost + Vercel | Allowed origins for CORS and the API |
| `API_ORIGIN_ENFORCEMENT` | Backend | `true` | Set to `false` to turn off the origin check |
| `VITE_API_URL` | Frontend | empty | API base URL in production |

### Tests

```bash
cd backend && sh mvnw clean test                  # Windows: .\mvnw.cmd clean test
cd frontend && npm test                           # Vitest
cd frontend && npm run build                      # type check, build, static pages
python3 scripts/check_i18n.py                     # every catalog entry has its English version
python3 -m unittest discover -s profile-audit/tests
```

The backend suite covers the question pool, the three formats, catalog vectors, links between catalogs, the REST endpoints and matching, all on the synthetic test fixture. The frontend suite covers question selection, saved progress, the compass and the design tokens.

### Deploy

| Part | Platform | Configuration |
|------|----------|---------------|
| Backend | Render | `render.yaml` and `backend/Dockerfile` |
| Frontend | Vercel | `frontend/vercel.json`, output `dist` |

Every push and pull request runs the CI workflow in `.github/workflows/ci.yml`.

## Contributing

Bug reports, corrections to profiles, and translation fixes are welcome as issues or pull requests. Keep each pull request to one change, run the backend and frontend tests, and describe how you tested it. [CONTRIBUTING.md](CONTRIBUTING.md) has the full checklist.

### Adding football ideas, teams or managers

Catalog entries are not placed on the axes by hand. Each new profile starts with a research file: the exact period, sourced evidence for each tactical dimension, gaps and a confidence level. The procedure is in [`profile-audit/FOOTBALL_RESEARCH.md`](profile-audit/FOOTBALL_RESEARCH.md), and the repository ships [Claude Code](https://claude.com/claude-code) skills that run it:

| Skill | Purpose |
|-------|---------|
| `/new-football-ideology <name>` | Research a football idea |
| `/new-team <name>` | Research a team era |
| `/new-manager <name>` | Research a manager |

Research files are saved in `profile-audit/research/<catalog>/<id>.json` and checked with `python3 profile-audit/validate.py research <catalog> <id>`. Turning research into a vector means answering the question pool in character.

### License

This fork inherits the license of 12 Axes, which is source-available but not open source. The code, questions, profiles, and vectors of the original project are © 2026 Enzo Xavier Santos, all rights reserved. You may read the code and send contributions, but copying, redistributing, translating, or using any part commercially needs written permission. See [LICENSE](LICENSE) for the full terms.

## Authors

**Enzo Xavier Santos** built the original 12 Axes as a portfolio project and a practical study of full-stack architecture with Java, React, and TypeScript. **Victor Ortins** is adapting it into the football version.

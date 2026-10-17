# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

KaamPe ("Kaam ki baat. Seedhi baat.") is a mobile-first AI companion for informal workers in India: earnings/expense tracking, rights & government-scheme answers, grievance drafting, and document explanation. UI languages are Hindi (`hi`, default), English (`en`), and Punjabi (`pa`). Default profile is a delivery worker in Punjab.

## Commands

Two processes run in development: the Express API on :3001 and Vite on :5173 (Vite proxies `/api` to :3001).

```bash
npm run server        # API server (tsx server/index.ts) — no watch mode
npm run dev           # Vite frontend
npm run typecheck     # tsc --noEmit over src, server, tests (no linter is configured)
npm run build         # vite build -> dist/
npm test              # vitest unit tests (tests/**/*.test.ts, node env)
npx vitest run tests/calculator.test.ts      # single unit test file
npx vitest run -t "paise"                    # tests matching a name
npm run test:e2e      # Playwright (tests/**/*.spec.ts); auto-starts both servers or reuses running ones
npx playwright test tests/a11y.spec.ts       # single e2e file
```

Production: `NODE_ENV=production npm run server` serves `dist/` and SPA-falls back to `index.html`.

Environment (`.env`, see `.env.example`): `PORT`, `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-3.8-flash`), `SESSION_SECRET`. `tests/live_ai.test.ts` makes a real Gemini call and silently skips if no key is set. Requires a Node version with built-in `node:sqlite`.

## Architecture

**Backend (`server/`, Express, ESM).** Imports between server files use `.js` extensions (tsx resolves them to `.ts`) — keep that convention.

- **Guest sessions, no auth.** `server/middleware/session.ts` runs on every `/api` route: reads `X-Session-ID` header or `kaampe_session_id` cookie (must match `^[a-zA-Z0-9_-]{16,64}$`, else a new `kp_…` id is generated), upserts a `sessions` row, and sets `req.sessionId` / `req.sessionProfile`. All data queries must be scoped by `session_id`; `tests/security_e2e.spec.ts` checks that one session can't read/delete another's entries (expects 403). E2E/API tests set identity via the `X-Session-ID` header.
- **Database.** `server/db/index.ts` opens SQLite via `node:sqlite` `DatabaseSync` at `data/kaampe.db` (WAL), and creates the schema inline with `CREATE TABLE IF NOT EXISTS` on import — there are no migrations. Tables: `sessions`, `money_entries`, `conversations`, `messages`. Importing the db module (including from tests) creates the file.
- **Money is integer paise.** `money_entries.amount_paise` is an integer; all conversion and aggregation goes through `server/services/money/calculator.ts` (`rupeesToPaise`, `calculateDailySummary`, `calculateWeeklySummary`, `formatRupees`). API payloads accept rupees and convert on write. Never do money arithmetic in floating-point rupees.
- **AI pipeline (`server/routes/ai.ts` + `server/services/ai/gemini.ts`).** `POST /api/ai/chat` first classifies intent with Gemini structured JSON output (validated by the Zod `IntentSchema`; on any model/parse failure it falls back to regex-based `fallbackIntentExtraction`, which handles Hinglish phrasing). It then routes by intent:
  - `record_money` → returns a **confirmation card without saving**; the client must call `POST /api/ai/confirm-money` to persist. The AI never writes money directly.
  - `ask_money` → answered deterministically from the DB (`answerMoneyQuestion`), no LLM.
  - `scheme` / `rights` → Gemini with Google Search grounding; every source URL (grounding chunks and model-returned) is filtered through `isTrustedGovernmentDomain` (allowlist `TRUSTED_OFFICIAL_DOMAINS`). Prompts forbid asserting definite eligibility.
  - `grievance` → editable draft built only from facts the user gave.
  - `safety` / `general` → conversational guidance.
  Each call sets `thinkingConfig.thinkingBudget` (0 for classification, low for synthesis). User-facing strings in server responses are hard-coded per language (`hi`/`pa`/`en` branches).
- `POST /api/document/explain` takes a multer upload (field `document`, PDF/JPG/PNG, ≤10MB, mime+extension checked) into `uploads_tmp/`, sends it inline as base64 to Gemini.

**Frontend (`src/`, React 18 + Tailwind, `@/` → `src/`).**

- No router: `App.tsx` switches views on `activeTab` (`home` | `money` | `help`) from `AppContext`. Home is the chat; Help can deep-link into chat with a prefilled prompt.
- `context/AppContext.tsx` holds the profile (cached in `localStorage` as `kaampe_profile`; onboarding flag in `kaampe_onboarded`), syncs with `GET /api/session` on mount, and exposes `t` — the active language's strings from `i18n/translations.ts`. All UI copy must be added to the `Translations` interface and all three languages.
- Components call `fetch('/api/...', { credentials: 'include' })` directly; `@tanstack/react-query` is a dependency but unused.
- Layout is designed for a 390px mobile viewport (`max-w-md` shell, bottom nav); Playwright runs at 390×844.

## Design system

`DESIGN.md` is an Intercom-derived design reference (cream canvas, white hairline cards, charcoal ink, single accent). `tailwind.config.js` adapts it: tokens `canvas`, `surface-1/2`, `ink(-muted/-subtle)`, `hairline(-soft)`, `accent` (`#b83808`, darker than DESIGN.md's Fin Orange for contrast), `semantic-*`, radii `card`/`subtle`; font is Inter + Noto Sans Devanagari/Gurmukhi instead of Saans. Use these tokens rather than raw colors. `tests/a11y.spec.ts` fails on any critical/serious axe-core WCAG 2.2 AA violation, so color/contrast changes must keep passing it.

Test files reference numbered "Sections" (e.g. Section 44–46, Section 7) of a product spec that is not in the repo.

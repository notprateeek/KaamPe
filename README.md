# KaamPe

**Kaam ki baat. Seedhi baat.**

An AI companion for India's gig and informal workers, in Hindi, English, and Punjabi. Guest sessions let workers get started with no login.

## What workers can do

- **Ask KaamPe (chat):** speak or type in Hindi, English or Punjabi about work, safety, government schemes, rights and daily money. Every answer can be read aloud or copied.
- **Money:** track earnings and expenses, see a 7-day net chart (with a screen-reader data table), compare platforms, and confirm money entries that chat proposes.
- **Scheme eligibility check:** a short form (age, income, EPFO/ESIC, taxpayer) is matched deterministically against curated central and Punjab schemes. "Don't know" never rules a scheme out; each result shows reasons, what to check, and the official link.
- **Help:** explain a document photo or PDF, then turn it into a complaint with one tap; optionally attach the last 7 days of earnings as evidence. Drafts can be copied or downloaded.
- **SOS:** a floating button with national helplines (112, 108, 181, 1930, 15100, 14434) and "share my location" through the phone's share sheet or SMS.

## Google services used and where

| Service | Used for | Code |
| --- | --- | --- |
| Gemini API (`@google/genai`, `gemini-3.8-flash`) | All AI features, server-side only; per-call timeouts and one retry on transient errors | [`server/services/ai/client.ts`](server/services/ai/client.ts) |
| Gemini structured output + Zod | Intent classification (`thinkingLevel` low), guidance JSON, money extraction | [`server/services/ai/gemini.ts`](server/services/ai/gemini.ts) |
| Google Search grounding | Scheme and rights answers; citations come only from grounding metadata and pass a `.gov.in`/`.nic.in` allowlist | [`server/routes/ai.ts`](server/routes/ai.ts) |
| Gemini multimodal | Document explanation (PDF/JPG/PNG) with Aadhaar/bank/phone masking | [`server/routes/document.ts`](server/routes/document.ts) |
| Google Cloud Run + Cloud Build + Secret Manager | Container deployment; `GEMINI_API_KEY` from Secret Manager | [`Dockerfile`](Dockerfile), [`cloudbuild.yaml`](cloudbuild.yaml) |
| Google Maps link | SOS location sharing | [`src/components/sos/SosButton.tsx`](src/components/sos/SosButton.tsx) |

## Design principles

- **AI never does arithmetic:** TypeScript calculates totals using integer paise stored in SQLite. Amount input is parsed strictly (no floats, no `1e400`, capped at ₹10,00,000).
- **AI never saves money without user confirmation:** chat returns a proposed entry; saving happens through a separate confirmation action.
- **Deterministic where it matters:** money answers and scheme eligibility come from code, not the model. The model only explains.
- **Honest uncertainty:** when reliable official evidence is missing, KaamPe says it could not find a reliable source rather than guessing eligibility or rights.

## Security

- **Session isolation:** guest sessions, and every query is scoped by `session_id`. Cross-session reads and deletes return 403, which is tested end to end.
- **Headers:** helmet with a strict CSP (`script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), HSTS in production, a Permissions-Policy limited to self, and `no-store` on API responses.
- **Rate limits:** per IP and per session, stricter on AI and upload routes. Over the limit the API returns 429 with `Retry-After`.
- **Validation and errors:**
  - Zod validates every request body and the environment.
  - Errors use one JSON shape (`{error, code}`), are localized and never leak internals.
- **Prompt-injection defense:**
  - User text is wrapped in `<user_input>`, and forged tags are stripped.
  - Shared safety rules forbid inventing laws, links or phone numbers, and forbid asking for OTPs or Aadhaar numbers.
  - Phone numbers the model invents are dropped, and Aadhaar, account and OTP numbers are masked before they are sent to Gemini.
- **Uploads:** checked by MIME type, extension and magic bytes, limited to 10 MB, given random temporary names and always deleted.

## Accessibility

- **Automated audit:** axe-core runs in Playwright and fails on any serious or critical WCAG 2.2 AA violation.
- **Navigation and structure:**
  - Skip link to the main content.
  - Native `<dialog>` modals that move focus and close with Escape.
  - Tab panels that follow the ARIA tabs pattern and work with the arrow keys.
  - Charts come with a screen-reader data table.
- **Speech:** voice input and read-aloud in the hi-IN, pa-IN and en-IN locales.
- **Display:** zoom is not blocked, there is a large-text toggle, and animation respects `prefers-reduced-motion`.
- **Language:** `<html lang>` follows the chosen language. A unit test checks that every UI string exists in all three languages.

## Tech stack

React 18, Vite, TypeScript, Tailwind CSS, Express, Node.js `node:sqlite`, Zod, and Google's `@google/genai` SDK. Vitest and Playwright cover unit and browser tests. In production, Express serves both the API and the built SPA as one web service.

## Local setup

Requires Node.js **22.13 or newer** (`node:sqlite` runs without an experimental flag).

```sh
cp .env.example .env
npm install
```

Set `GEMINI_API_KEY` in `.env` to your Gemini API key. Keep `.env` private.

Run these in separate terminals:

```sh
npm run server
```

```sh
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to Express at <http://localhost:3001>.

Checks:

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

To preview the production service locally, run `npm start` after building, then open <http://localhost:3001>. `GET /api/health` reports server status and whether a Gemini key is configured; it does not validate the key with Google.

## Deploy on Google Cloud Run

```sh
printf %s "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
gcloud artifacts repositories create kaampe --repository-format=docker --location=asia-south1
gcloud builds submit --config cloudbuild.yaml
```

Cloud Build builds the [`Dockerfile`](Dockerfile), pushes it to Artifact Registry and deploys to Cloud Run in Mumbai (`asia-south1`), reading the key from Secret Manager. SQLite on Cloud Run is per-instance and ephemeral, which is fine for a demo but not for durable records.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs typecheck, unit tests, build and the Playwright suite on every push.

## Deploy free on Render

1. In Render, select **New → Blueprint** and connect [github.com/notprateeek/KaamPe](https://github.com/notprateeek/KaamPe).
2. Use the repository's `render.yaml` and enter **GEMINI_API_KEY** when prompted. The Blueprint sets the Node version, production mode, and Gemini model.
3. Deploy. Render runs `npm ci --include=dev && npm run build`, then `npm start`, and checks `/api/health`. Open the service's HTTPS URL for the SPA and API on the same origin. Leave `CORS_ORIGIN` unset for this setup.

The Blueprint creates one **free web service**, with no separate frontend or database service. [Render's free tier](https://render.com/docs/free) spins down after inactivity and uses an **ephemeral filesystem**: SQLite data, including earnings and guest-session records, resets on redeploy or spin-down. This deployment is suitable for a submission demo, not durable financial records. Gemini API usage has its own quotas and billing, separate from Render hosting.

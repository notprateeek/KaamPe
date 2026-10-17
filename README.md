# KaamPe

**Kaam ki baat. Seedhi baat.**

An AI companion for India's gig and informal workers, in Hindi, English, and Punjabi. The first screen offers a one-tap demo, sign-in / sign-up, or "continue without an account".

## Demo and admin credentials

| What | Where | Username | Password |
| --- | --- | --- | --- |
| Demo account (3 weeks of sample data) | First screen → **Demo dekhein, ek click mein** (no typing), or sign in | `demo` | `kaampe-demo` |
| Admin panel (aggregate, anonymised usage stats) | `/admin`, or type these on the first screen | `admin` | `kaampe-admin` |

Every demo login gets its own fresh copy of the sample data. Change the values with `DEMO_USERNAME` / `DEMO_PASSWORD` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` (see `.env.example`). **In production the admin panel stays off (404) until `ADMIN_PASSWORD` is set to something other than the default.** Anyone can create their own account from **Naya account**; new accounts then go through onboarding.

## What workers can do

- **Ask KaamPe (chat):** speak or type in Hindi, English or Punjabi about work, safety, government schemes, rights and daily money. Every answer can be read aloud or copied. The chat is saved per session, survives a reload, and follow-ups ("how do I apply for it?") use the last few turns as context. "Clear chat" deletes it on the server too.
- **Money:** track earnings and expenses, see a 7-day net chart (with a screen-reader data table), compare platforms, and confirm money entries that chat proposes. **AI insights** explain the last 30 days (best source, biggest cost, this week vs last week): the server computes every number in paise, and any number the model invents sends it back to plain computed text.
- **Safety coach:** pick a situation (night shift, heavy rain, heat, harassment, road accident, someone asking for an OTP) or describe one by voice, and get a short checklist plus the trusted helplines.
- **Scheme eligibility check:** a short form (age, income, EPFO/ESIC, taxpayer) is matched deterministically against curated central and Punjab schemes. "Don't know" never rules a scheme out; each result shows reasons, what to check, and the official link.
- **Help:** explain a document photo or PDF (photos are shrunk on the phone to ≤1600px JPEG before upload; WebP is accepted), then turn it into a complaint with one tap; optionally attach the last 7 days of earnings as evidence. Hindi and Punjabi complaints come with a fact-only English copy for the company or office, and can be signed with the worker's name. Drafts can be copied or downloaded. The scheme checker remembers its answers on the phone.
- **Sign-in and accounts:** one-tap demo, username/password accounts (scrypt-hashed; signing up keeps whatever was logged as a guest on that phone; the session id rotates on every sign-up, login and logout), or a guest session.
- **Look and listen:** light, dark or "match phone" theme (no flash on load); "Read this screen" in the header; tap-to-hear any text; read new replies aloud automatically; slow/normal/fast speaking speed; three text sizes.
- **Know your rights:** a daily rights tip on Home and a library of eight short topics (minimum wage, timely pay, gig-worker social security, equal pay, accident cover, harassment, UPI fraud, free legal aid), each listenable and one tap from a chat question. Home also shows schemes picked for the worker's type of work and a 7-day earnings strip.
- **SOS:** a floating button with national helplines (112, 108, 181, 1091, 1033, 1930, 15100, 14434) and "share my location" through the phone's share sheet or SMS.

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
- **CSRF:** state-changing API calls whose `Origin` (or `Sec-Fetch-Site: cross-site`) shows another website get 403, on top of SameSite cookies.
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

## Live demo (Vercel)

**<https://prompt-wars-ten-lyart.vercel.app>**

| Login | Username | Password |
| --- | --- | --- |
| Demo account (sample data) | `demo` | `kaampe-demo` |
| Admin panel (`/admin`, aggregate stats only) | `admin` | `ZvpVnnSZDWVp8MKIYKor1sh` |

Deployed with `npx vercel deploy --prod`. [`vercel.json`](vercel.json) builds the SPA and bundles the Express API into `api/index.js` (`npm run build:api`). On Vercel, SQLite and uploads live in `/tmp`, so data is per-instance and resets on cold starts. In production the admin panel stays disabled (404) while `ADMIN_PASSWORD` is the default.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs typecheck, unit tests, build and the Playwright suite on every push.

## Deploy free on Render

1. In Render, select **New → Blueprint** and connect [github.com/notprateeek/KaamPe](https://github.com/notprateeek/KaamPe).
2. Use the repository's `render.yaml` and enter **GEMINI_API_KEY** when prompted. The Blueprint sets the Node version, production mode, and Gemini model.
3. Deploy. Render runs `npm ci --include=dev && npm run build`, then `npm start`, and checks `/api/health`. Open the service's HTTPS URL for the SPA and API on the same origin. Leave `CORS_ORIGIN` unset for this setup.

The Blueprint creates one **free web service**, with no separate frontend or database service. [Render's free tier](https://render.com/docs/free) spins down after inactivity and uses an **ephemeral filesystem**: SQLite data, including earnings and guest-session records, resets on redeploy or spin-down. This deployment is suitable for a submission demo, not durable financial records. Gemini API usage has its own quotas and billing, separate from Render hosting.

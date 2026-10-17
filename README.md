# KaamPe

**Kaam ki baat. Seedhi baat.**

An AI companion for India's gig and informal workers, in Hindi, English, and Punjabi. Guest sessions let workers get started with no login.

## Three journeys

- **Ask KaamPe:** chat about work, safety, government schemes, rights, and daily money questions.
- **Money:** track earnings and expenses, see daily and weekly totals, and confirm money entries proposed in chat.
- **Help:** explain a document or create an editable payment-dispute draft from the worker's facts.

## GenAI services used

- **Google Gemini API** (`gemini-3.8-flash`) through the `@google/genai` SDK's `models.generateContent`. All calls run server-side; the API key stays on the server.
- **Structured output:** JSON schema for intent extraction, followed by Zod validation before the application handles the result.
- **Google Search grounding:** scheme and rights answers use evidence links only from grounding metadata, filtered to official `.gov.in` domains. Model-written URLs are not treated as evidence. When evidence is unavailable, curated official portals are offered as places to check.
- **Native multimodal document understanding:** PDF, JPG, and PNG uploads are passed inline to Gemini for a plain-language explanation. Uploads are limited to 10 MB and temporary files are deleted after processing.
- **Task-specific thinking budgets:** `0` for intent classification and low budgets (`1`) for grounded synthesis, dispute drafting, and document explanation.

## Design principles

- **AI never does arithmetic:** TypeScript calculates totals using integer paise stored in SQLite.
- **AI never saves money without user confirmation:** chat returns a proposed entry; saving happens through a separate confirmation action.
- **Honest uncertainty:** when reliable official evidence is missing, KaamPe says it could not find a reliable source rather than guessing eligibility or rights.

## Tech stack

React 18, Vite, TypeScript, Tailwind CSS, Express, Node.js `node:sqlite`, Zod, and Google's `@google/genai` SDK. Vitest and Playwright cover unit and browser tests. In production, Express serves both the API and the built SPA as one web service.

## Local setup

Requires Node.js **22.13 or newer** (`node:sqlite` runs without an experimental flag).

```sh
cp .env.example .env
npm install
```

Set `GEMINI_API_KEY` in `.env` to your Gemini API key and replace the session-secret placeholder with a random value. Keep `.env` private.

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

## Deploy free on Render

1. In Render, select **New → Blueprint** and connect [github.com/notprateeek/KaamPe](https://github.com/notprateeek/KaamPe).
2. Use the repository's `render.yaml` and enter **GEMINI_API_KEY** when prompted. The Blueprint generates `SESSION_SECRET` and sets the Node version, production mode, and Gemini model.
3. Deploy. Render runs `npm ci --include=dev && npm run build`, then `npm start`, and checks `/api/health`. Open the service's HTTPS URL for the SPA and API on the same origin. Leave `CORS_ORIGIN` unset for this setup.

The Blueprint creates one **free web service**, with no separate frontend or database service. [Render's free tier](https://render.com/docs/free) spins down after inactivity and uses an **ephemeral filesystem**: SQLite data, including earnings and guest-session records, resets on redeploy or spin-down. This deployment is suitable for a submission demo, not durable financial records. Gemini API usage has its own quotas and billing, separate from Render hosting.

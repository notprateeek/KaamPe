// Load .env before anything reads process.env (ESM imports are hoisted).
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { loadEnv, type ServerEnv } from './config/env.js';
import { sessionMiddleware } from './middleware/session.js';
import { createRateLimiter, ipKey } from './middleware/rateLimit.js';
import { errorHandler, apiNotFound } from './middleware/errorHandler.js';
import { createOriginCheck } from './middleware/originCheck.js';
import { activeProvider } from './services/ai/gemini.js';
import sessionRouter from './routes/session.js';
import moneyRouter from './routes/money.js';
import aiRouter from './routes/ai.js';
import docRouter from './routes/document.js';
import { createAuthRouter } from './routes/auth.js';
import { createAdminRouter } from './routes/admin.js';
import { createAdminAuth } from './services/auth/adminToken.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Same values for every response; frontend uses microphone (voice input) and geolocation (SOS share). */
const PERMISSIONS_POLICY = [
  'camera=(self)',
  'microphone=(self)',
  'geolocation=(self)',
  'payment=()',
  'usb=()',
  'serial=()',
  'bluetooth=()',
  'accelerometer=()',
  'gyroscope=()',
  'magnetometer=()',
  'browsing-topics=()',
].join(', ');

/**
 * Builds the Express app without listening, so tests can mount it on an ephemeral port.
 */
export function createApp(env: ServerEnv = loadEnv()) {
  const app = express();

  app.disable('x-powered-by');
  // Render / Cloud Run sit behind exactly one proxy hop; req.ip must not trust arbitrary X-Forwarded-For.
  app.set('trust proxy', env.trustProxyHops > 0 ? env.trustProxyHops : false);

  // Security headers. In dev the HTML is served by Vite, so this mainly protects API + production SPA.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          // React `style={{…}}` props and Tailwind need inline styles; scripts stay strict.
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          connectSrc: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          manifestSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          // No upgrade-insecure-requests: HSTS covers HTTPS in production and it would break `npm start` on http://localhost.
        },
      },
      strictTransportSecurity: env.isProduction
        ? { maxAge: 63_072_000, includeSubDomains: true, preload: false }
        : false,
      crossOriginEmbedderPolicy: false,
      xFrameOptions: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  });

  // CORS - same-origin only in production unless CORS_ORIGIN is set; flexible in development
  app.use(
    cors({
      origin: env.isProduction ? env.CORS_ORIGIN || false : true,
      credentials: true,
    }),
  );

  // API data is per-session and financial: never cache it in shared/browser caches.
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // CSRF: state-changing API calls must come from this site (requests without Origin, like curl, pass).
  app.use('/api', createOriginCheck({ allowedOrigin: env.CORS_ORIGIN, isProduction: env.isProduction }));

  // Coarse per-IP ceiling first (before any DB work), so rotating session ids can't bypass limits.
  const ipLimiter = createRateLimiter({
    name: 'ip',
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.rateLimitApiMax * 5,
    keyGenerator: ipKey,
    enabled: env.RATE_LIMIT_ENABLED,
    standardHeaders: false,
  });
  app.use('/api', ipLimiter);

  // Body limits: JSON payloads are small; file uploads go through multer with their own limits.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(cookieParser());

  // Password guessing guard for the demo and admin logins (per IP, before any DB work)
  const loginLimiter = createRateLimiter({
    name: 'login',
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.isProduction ? 10 : 200,
    keyGenerator: ipKey,
    enabled: env.RATE_LIMIT_ENABLED,
  });
  app.use(['/api/auth/demo-login', '/api/auth/login', '/api/auth/signup', '/api/admin/login'], loginLimiter);

  // Demo login/logout and the operator panel replace or skip the guest session,
  // so they are mounted before the session middleware (no stray guest rows/cookies).
  const adminAuth = createAdminAuth(env);
  app.use('/api/auth', createAuthRouter(env, adminAuth));
  app.use('/api/admin', createAdminRouter(adminAuth));

  // Guest session middleware for all API routes
  app.use('/api', sessionMiddleware);

  // Per-client (IP + session) limits; stricter on the expensive Gemini-backed routes.
  const apiLimiter = createRateLimiter({
    name: 'api',
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.rateLimitApiMax,
    enabled: env.RATE_LIMIT_ENABLED,
  });
  const aiLimiter = createRateLimiter({
    name: 'ai',
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.rateLimitAiMax,
    enabled: env.RATE_LIMIT_ENABLED,
  });
  app.use('/api', apiLimiter);
  app.use('/api/ai', aiLimiter);
  app.use('/api/document', aiLimiter);

  // Health check endpoint (no session data echoed)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'KaamPe',
      version: '1.0.0',
      timestamp: Date.now(),
      geminiConfigured: env.geminiConfigured,
      // Provider and model id only; never a key.
      ...activeProvider(),
    });
  });

  // Mount routes
  app.use('/api/session', sessionRouter);
  app.use('/api/money', moneyRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/document', docRouter);

  // Unknown API routes get JSON 404, never the SPA shell
  app.use('/api', apiNotFound);

  // Serve static build in production
  if (env.isProduction) {
    const distDir = path.resolve(__dirname, '../dist');
    const indexHtml = path.join(distDir, 'index.html');
    // Hashed asset filenames are safe to cache forever
    app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req, res, next) => {
      if (!fs.existsSync(indexHtml)) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  // Global error handler (never leaks raw error messages)
  app.use(errorHandler);

  return app;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(path.resolve(entry)) === fs.realpathSync(__filename);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const env = loadEnv();
  const app = createApp(env);
  app.listen(env.PORT, () => {
    console.log(`[KaamPe Server] Running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    if (!env.geminiConfigured && !env.OPENAI_API_KEY) {
      console.warn('[KaamPe Server] No GEMINI_API_KEY or OPENAI_API_KEY; AI features will use fallbacks or fail gracefully.');
    } else if (!env.geminiConfigured) {
      console.warn('[KaamPe Server] GEMINI_API_KEY is not set; answering with OpenAI (no search grounding or voice).');
    }
  });
}

export default createApp;

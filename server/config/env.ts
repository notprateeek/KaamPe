import { z } from 'zod';

/**
 * Validated server configuration. Parsed once at startup so a malformed
 * environment fails fast with a clear message instead of misbehaving later.
 *
 * Note: server/services/ai/gemini.ts still reads GEMINI_API_KEY / GEMINI_MODEL
 * from process.env directly; this schema validates the same variables.
 */

const optionalNonEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const positiveInt = (fallback: number) =>
  z.coerce.number().int().positive().max(1_000_000).default(fallback);

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3001),
  GEMINI_API_KEY: optionalNonEmpty,
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.8-flash'),
  /** Comma-separated models tried when GEMINI_MODEL's quota runs out ("" = none). */
  GEMINI_FALLBACK_MODELS: z.string().optional(),
  /** Optional OpenAI fallback: used when Gemini's key is missing or a Gemini call fails. */
  OPENAI_API_KEY: optionalNonEmpty,
  OPENAI_MODEL: z.string().trim().min(1).default('gpt-5.4-mini'),
  OPENAI_BASE_URL: optionalNonEmpty.pipe(z.string().url().optional()),
  /** Preferred provider; the other one is used when this one's key is missing. */
  AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  /** Exact frontend origin allowed for cross-origin requests in production. */
  CORS_ORIGIN: optionalNonEmpty.pipe(z.string().url().optional()),
  /** Number of reverse-proxy hops to trust for req.ip (Render / Cloud Run = 1). */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).optional(),
  /** Set to "false" to disable rate limiting entirely (local load tests only). */
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  RATE_LIMIT_WINDOW_MS: positiveInt(60_000),
  /** Requests per window per client across all /api routes. */
  RATE_LIMIT_API_MAX: z.coerce.number().int().positive().max(1_000_000).optional(),
  /** Requests per window per client on expensive AI / document routes. */
  RATE_LIMIT_AI_MAX: z.coerce.number().int().positive().max(1_000_000).optional(),
  /** Demo account (seeded sample data). Set DEMO_LOGIN_ENABLED=false to turn it off. */
  DEMO_LOGIN_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  DEMO_USERNAME: z.string().trim().min(1).max(64).default('demo'),
  DEMO_PASSWORD: z.string().min(1).max(128).default('kaampe-demo'),
  /** Admin panel (/admin). Aggregate, anonymised stats only. */
  ADMIN_USERNAME: z.string().trim().min(1).max(64).default('admin'),
  ADMIN_PASSWORD: z.string().min(1).max(128).default('kaampe-admin'),
  /** HMAC key for admin tokens; derived from the admin credentials when unset. In production the
   *  panel stays disabled (404) while ADMIN_PASSWORD is the default. */
  ADMIN_TOKEN_SECRET: optionalNonEmpty.pipe(z.string().min(16).optional()),
});

export type ServerEnv = z.infer<typeof EnvSchema> & {
  isProduction: boolean;
  geminiConfigured: boolean;
  trustProxyHops: number;
  rateLimitApiMax: number;
  rateLimitAiMax: number;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`[KaamPe] Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  const isProduction = env.NODE_ENV === 'production';
  return {
    ...env,
    isProduction,
    geminiConfigured: !!env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5,
    trustProxyHops: env.TRUST_PROXY_HOPS ?? (isProduction ? 1 : 0),
    // Generous limits outside production so local dev and Playwright e2e never trip them.
    rateLimitApiMax: env.RATE_LIMIT_API_MAX ?? (isProduction ? 120 : 2000),
    rateLimitAiMax: env.RATE_LIMIT_AI_MAX ?? (isProduction ? 20 : 500),
  };
}

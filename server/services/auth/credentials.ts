import crypto from 'node:crypto';

const digest = (value: string) => crypto.createHash('sha256').update(value, 'utf8').digest();

/** Constant-time string comparison (hashing first makes lengths equal). */
export function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(digest(a), digest(b));
}

/** Checks both fields without short-circuiting, so timing doesn't reveal which one was wrong. */
export function credentialsMatch(
  given: { username: string; password: string },
  expected: { username: string; password: string },
): boolean {
  const userOk = safeEqual(given.username.trim().toLowerCase(), expected.username.trim().toLowerCase());
  const passOk = safeEqual(given.password, expected.password);
  return userOk && passOk;
}

/**
 * Stateless signed token: "<expiresAtMs>.<base64url HMAC-SHA256>".
 * Nothing secret is inside; it only proves the holder logged in before expiry.
 */
export function createSignedToken(secret: string, ttlMs: number, now = Date.now()): string {
  const exp = String(now + ttlMs);
  const sig = crypto.createHmac('sha256', secret).update(exp).digest('base64url');
  return `${exp}.${sig}`;
}

export function verifySignedToken(token: unknown, secret: string, now = Date.now()): boolean {
  if (typeof token !== 'string' || token.length > 200) return false;
  const [exp, sig, extra] = token.split('.');
  if (!exp || !sig || extra !== undefined || !/^\d{10,16}$/.test(exp)) return false;
  if (Number(exp) <= now) return false;
  const expected = crypto.createHmac('sha256', secret).update(exp).digest('base64url');
  return safeEqual(sig, expected);
}

const SCRYPT_KEYLEN = 32;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

/** scrypt password hash: "scrypt$<salt b64url>$<hash b64url>". */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64url');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64url'), expected.length, SCRYPT_OPTS);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** A hash to compare against when the username doesn't exist, so timing doesn't reveal it. */
export const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

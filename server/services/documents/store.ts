import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../../db/index.js';

export { numberTokens, toAsciiDigits } from '../text/numbers.js';

/**
 * Session-scoped storage of document excerpts for follow-up questions.
 *
 * Only short verbatim excerpts extracted at explain time are kept (never the
 * uploaded file), they expire after DOCUMENT_TTL_MS, and each session keeps at
 * most MAX_DOCUMENTS_PER_SESSION documents.
 */

export const DOCUMENT_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_DOCUMENTS_PER_SESSION = 3;
export const MAX_PASSAGES = 40;
export const MAX_PASSAGE_CHARS = 700;
export const MAX_TOTAL_PASSAGE_CHARS = 24_000;

export const DOCUMENT_ID_RE = /^doc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface StoredPassage {
  id: string;
  /** 1-based page, only when it could be checked against the PDF's page count. */
  page: number | null;
  text: string;
}

export interface StoredDocument {
  id: string;
  sessionId: string;
  mimeType: string;
  summary: string;
  passages: StoredPassage[];
}

/** Model output for one extracted excerpt; validated before anything is stored. */
export const RawPassageSchema = z.object({
  text: z.string(),
  page: z.number().int().nullish(),
});

/**
 * Best-effort PDF page count from `/Type /Page` objects. Returns null when the
 * page objects are not visible (e.g. inside compressed object streams), which
 * means page numbers are not verifiable for this file.
 */
export function countPdfPages(buffer: Buffer): number | null {
  const matches = buffer.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return matches && matches.length > 0 ? matches.length : null;
}

/**
 * Cleans and bounds the excerpts the model extracted. Page numbers are kept
 * only for PDFs whose page count we could read, and only when in range;
 * images and unverifiable PDFs get no page numbers.
 */
export function normalizePassages(raw: unknown, mimeType: string, pageCount: number | null): StoredPassage[] {
  if (!Array.isArray(raw)) return [];
  const passages: StoredPassage[] = [];
  let total = 0;
  for (const item of raw) {
    if (passages.length >= MAX_PASSAGES) break;
    const parsed = RawPassageSchema.safeParse(item);
    if (!parsed.success) continue;
    const text = parsed.data.text.replace(/\s+/g, ' ').trim().slice(0, MAX_PASSAGE_CHARS);
    if (text.length < 3) continue;
    if (total + text.length > MAX_TOTAL_PASSAGE_CHARS) break;
    total += text.length;
    const page = parsed.data.page;
    const pageIsVerifiable =
      mimeType === 'application/pdf' && pageCount !== null && typeof page === 'number' && page >= 1 && page <= pageCount;
    passages.push({ id: `p${passages.length + 1}`, page: pageIsVerifiable ? page : null, text });
  }
  return passages;
}

function pruneExpired(now: number) {
  db.prepare('DELETE FROM documents WHERE expires_at <= ?').run(now);
}

/** Stores excerpts for a session and returns the new document id. */
export function saveDocument(params: {
  sessionId: string;
  mimeType: string;
  summary: string;
  passages: StoredPassage[];
  pageCount: number | null;
  now?: number;
}): string {
  const now = params.now ?? Date.now();
  const id = 'doc_' + crypto.randomUUID();
  pruneExpired(now);
  db.prepare(
    `INSERT INTO documents (id, session_id, mime_type, summary, passages, page_count, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.sessionId,
    params.mimeType,
    params.summary.slice(0, 600),
    JSON.stringify(params.passages),
    params.pageCount,
    now,
    now + DOCUMENT_TTL_MS
  );
  // Keep only the newest few documents per session.
  db.prepare(
    `DELETE FROM documents WHERE session_id = ? AND id NOT IN (
       SELECT id FROM documents WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?
     )`
  ).run(params.sessionId, params.sessionId, MAX_DOCUMENTS_PER_SESSION);
  return id;
}

/** Loads a document only if it belongs to `sessionId` and has not expired. */
export function getDocumentForSession(documentId: string, sessionId: string, now = Date.now()): StoredDocument | null {
  if (!DOCUMENT_ID_RE.test(documentId) || !sessionId) return null;
  const row = db
    .prepare('SELECT id, session_id, mime_type, summary, passages, expires_at FROM documents WHERE id = ? AND session_id = ?')
    .get(documentId, sessionId) as
    | { id: string; session_id: string; mime_type: string; summary: string; passages: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at <= now) return null;
  let passages: StoredPassage[] = [];
  try {
    const parsed = JSON.parse(row.passages);
    if (Array.isArray(parsed)) passages = parsed;
  } catch {
    return null;
  }
  return { id: row.id, sessionId: row.session_id, mimeType: row.mime_type, summary: row.summary, passages };
}

// ---------------------------------------------------------------------------
// Evidence checks
// ---------------------------------------------------------------------------

/** Lenient comparison form: Unicode-normalized, lower case, unified quotes/dashes, single spaces. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when `quote` appears (leniently normalized) inside `passage`. */
export function quoteAppearsIn(quote: string, passage: string): boolean {
  const q = normalizeForMatch(quote).replace(/^[\s"'.…-]+|[\s"'.…-]+$/g, '');
  if (q.length < 3) return false;
  return normalizeForMatch(passage).includes(q);
}

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vercel functions can only write to /tmp (ephemeral per instance)
const dataDir = process.env.VERCEL ? '/tmp/kaampe-data' : path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'kaampe.db');
export const db = new DatabaseSync(dbPath);

// Wait for locks held by other connections (e.g. parallel test workers) instead of failing
db.exec('PRAGMA busy_timeout = 5000;');
// Enable WAL mode for high concurrency and robustness
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    language TEXT NOT NULL DEFAULT 'hi',
    worker_type TEXT NOT NULL DEFAULT 'delivery',
    state TEXT NOT NULL DEFAULT 'Punjab',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS money_entries (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('earning', 'expense')),
    amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
    category_or_source TEXT,
    note TEXT,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  -- Every money query is scoped by session and (for summaries) a date window.
  CREATE INDEX IF NOT EXISTS idx_money_entries_session_date
  ON money_entries(session_id, date);

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    structured_data TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at);

  -- Session-scoped lookups and ON DELETE CASCADE from sessions need these.
  CREATE INDEX IF NOT EXISTS idx_conversations_session
  ON conversations(session_id, updated_at);

  CREATE INDEX IF NOT EXISTS idx_messages_session
  ON messages(session_id);

  -- Text excerpts extracted from an explained document, kept only for follow-up
  -- questions. The uploaded file itself is never stored. Rows expire (expires_at).
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    passages TEXT NOT NULL,
    page_count INTEGER,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_documents_session
  ON documents(session_id, created_at);

  -- Optional sign-in. An account owns exactly one session; all data stays
  -- keyed by session_id, so signing in just points the cookie at that session.
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`);

/**
 * Additive columns for databases created before they existed. CREATE TABLE IF NOT
 * EXISTS never changes an existing table, so each column is added once, guarded
 * by table_info. Only nullable columns are added this way (safe, no backfill).
 */
function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Optional work details on earnings, for per-trip and per-hour comparisons.
addColumnIfMissing('money_entries', 'trips', 'INTEGER CHECK(trips IS NULL OR (trips >= 0 AND trips <= 1000))');
addColumnIfMissing('money_entries', 'work_minutes', 'INTEGER CHECK(work_minutes IS NULL OR (work_minutes > 0 AND work_minutes <= 1440))');

console.log('[DB] SQLite database initialized at:', dbPath);

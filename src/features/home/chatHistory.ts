import type { ChatMessage } from './HomeView';
import type { Language } from '../../i18n/translations';

/** One row of GET /api/ai/history. `data` is the original reply body (never a money confirmation). */
export interface HistoryRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  data?: Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);

/**
 * Rebuilds chat bubbles from saved history, the same way HomeView builds a live
 * reply. Replies without a stored body (e.g. old money confirmations) come back
 * as plain text, so a saved card can never be confirmed twice.
 */
export function historyToMessages(rows: readonly HistoryRow[], language: Language): ChatMessage[] {
  let lastUserText = '';
  return rows.map((row) => {
    if (row.role === 'user') {
      lastUserText = row.content;
      return { id: row.id, role: 'user', content: row.content, createdAt: row.createdAt };
    }
    const data = row.data;
    const type = str(data?.type);
    if (!data || (type !== 'answer' && type !== 'grievance' && type !== 'grievance_guide')) {
      return { id: row.id, role: 'assistant', type: 'text', content: row.content, lang: language, createdAt: row.createdAt };
    }
    return {
      id: row.id,
      role: 'assistant',
      type,
      content: str(data.message),
      directAnswer: str(data.directAnswer),
      steps: strings(data.steps),
      sources: Array.isArray(data.sources) ? (data.sources as ChatMessage['sources']) : undefined,
      eligibilityState: str(data.eligibilityState),
      breakdown: data.breakdown as ChatMessage['breakdown'],
      summary: str(data.summary),
      draftMessage: str(data.draftMessage),
      ...(type === 'grievance' || type === 'grievance_guide'
        ? { grievance: data as unknown as ChatMessage['grievance'], grievanceDescription: lastUserText }
        : {}),
      lang: language,
      createdAt: row.createdAt,
    };
  });
}

export async function fetchChatHistory(language: Language): Promise<ChatMessage[]> {
  const res = await fetch('/api/ai/history', { credentials: 'include' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => null);
  return Array.isArray(body?.messages) ? historyToMessages(body.messages, language) : [];
}

/** Deletes this session's saved chat on the server. Resolves false on failure. */
export async function clearChatHistory(): Promise<boolean> {
  try {
    const res = await fetch('/api/ai/history', { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

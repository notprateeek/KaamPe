/**
 * localStorage wrappers that never throw (private mode, blocked storage,
 * quota errors). Callers must work when these return null / do nothing.
 */
export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: preference just won't persist */
  }
}

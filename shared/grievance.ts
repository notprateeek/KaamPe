// Limits for guided grievance drafting, shared by the server (request
// validation) and the client (form validation) so the two never disagree.

export const MAX_AMOUNT_RUPEES = 10_000_000;
export const MAX_GRIEVANCE_DESCRIPTION_CHARS = 2000;
/** Supporting evidence (e.g. the worker's own earnings summary) sent with a draft request. */
export const MAX_GRIEVANCE_CONTEXT_CHARS = 1000;

/** True when `n` has at most two decimal places, tolerating float error (4.35 * 100 = 434.99999999999994). */
export function hasAtMostTwoDecimals(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

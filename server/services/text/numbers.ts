const DIGIT_MAP: Record<string, string> = {};
'०१२३४५६७८९'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i)));
'੦੧੨੩੪੫੬੭੮੯'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i)));

/** Converts Devanagari / Gurmukhi digits to ASCII digits. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९੦-੯]/g, (d) => DIGIT_MAP[d] ?? d);
}

/** Number tokens in a text ("1,200.50" -> "1200.5"), used to check that generated text only repeats supported numbers. */
export function numberTokens(text: string): string[] {
  return (toAsciiDigits(text).match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => {
    const plain = n.replace(/,/g, '');
    return plain.includes('.') ? plain.replace(/\.?0+$/, '') : plain;
  });
}

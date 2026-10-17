import { describe, expect, it } from 'vitest';
import { translations, type Language } from '../src/i18n/translations';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

const languages = Object.keys(translations) as Language[];
const reference = flatten(translations.en as unknown as Tree);

describe('translations completeness', () => {
  it('ships Hindi, English and Punjabi', () => {
    expect(languages.sort()).toEqual(['en', 'hi', 'pa']);
  });

  it.each(languages)('%s has exactly the same keys as English', (lang) => {
    const flat = flatten(translations[lang] as unknown as Tree);
    expect(Object.keys(flat).sort()).toEqual(Object.keys(reference).sort());
  });

  it.each(languages)('%s has no empty strings', (lang) => {
    const flat = flatten(translations[lang] as unknown as Tree);
    const empty = Object.entries(flat).filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it.each(languages)('%s keeps the same {placeholders} as English', (lang) => {
    const flat = flatten(translations[lang] as unknown as Tree);
    const mismatched = Object.keys(reference).filter(
      (k) => JSON.stringify(placeholders(flat[k] ?? '')) !== JSON.stringify(placeholders(reference[k]))
    );
    expect(mismatched).toEqual([]);
  });

  // Hindi copy is deliberately Romanized (Hinglish); Punjabi uses Gurmukhi.
  it('pa copy is mostly written in Gurmukhi', () => {
    const values = Object.values(flatten(translations.pa as unknown as Tree));
    const native = values.filter((v) => /[਀-੿]/.test(v)).length;
    expect(native / values.length).toBeGreaterThan(0.6);
  });
});

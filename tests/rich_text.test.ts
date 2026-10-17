import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichText, safeHref } from '../src/components/ui/RichText';
import { compressImage, fitWithin } from '../src/lib/compressImage';

const html = (text: string) => renderToStaticMarkup(React.createElement(RichText, { text }));

describe('RichText', () => {
  it('renders **bold** as <strong>', () => {
    expect(html('Call **112** now')).toBe('Call <strong class="font-bold">112</strong> now');
  });

  it('links only https URLs, opening in a new tab safely', () => {
    const out = html('Register at https://eshram.gov.in.');
    expect(out).toContain('href="https://eshram.gov.in/"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out.endsWith('</a>.')).toBe(true);
    expect(html('[portal](https://maandhan.in)')).toContain('>portal</a>');
  });

  it('never turns javascript:, data: or http: into links, and escapes markup', () => {
    for (const bad of ['[x](javascript:alert(1))', '[x](data:text/html,hi)', '[x](http://example.com)']) {
      expect(html(bad)).not.toContain('<a');
    }
    const out = html('<img src=x onerror=alert(1)> **<b>hi</b>**');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
    expect(safeHref('not a url')).toBeNull();
  });
});

describe('fitWithin', () => {
  it('scales the longest side down to the limit, keeping aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3200, 1600)).toEqual({ width: 500, height: 1600 });
  });

  it('never upscales small images', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe('compressImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('passes PDFs through untouched', async () => {
    const pdf = new File(['%PDF-1.4'], 'notice.pdf', { type: 'application/pdf' });
    const bitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', bitmap);
    expect(await compressImage(pdf)).toBe(pdf);
    expect(bitmap).not.toHaveBeenCalled();
  });

  it('falls back to the original image when decoding fails', async () => {
    const img = new File(['not really a jpeg'], 'photo.jpg', { type: 'image/jpeg' });
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')));
    expect(await compressImage(img)).toBe(img);
  });
});

/** Longest side, in pixels, sent to the model: plenty for reading printed text. */
export const MAX_IMAGE_EDGE = 1600;
export const JPEG_QUALITY = 0.8;

/** Scales (width, height) down so the longest side is at most `maxEdge`. Never upscales. */
export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Phone photos are often 3–8 MB. Redrawing them at ≤1600px as JPEG (q 0.8) usually
 * brings them to a few hundred KB: faster uploads on mobile data and fewer model
 * tokens. PDFs, images that fail to decode, and results that would not be smaller
 * are returned unchanged.
 */
export async function compressImage(file: File, maxEdge = MAX_IMAGE_EDGE, quality = JPEG_QUALITY): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // JPEG has no alpha: flatten transparent PNGs onto white, not black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

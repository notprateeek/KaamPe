import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

type Lang = 'hi' | 'en' | 'pa';

export type ApiErrorCode =
  | 'bad_request'
  | 'invalid_json'
  | 'validation_failed'
  | 'payload_too_large'
  | 'unsupported_file_type'
  | 'not_found'
  | 'rate_limited'
  | 'invalid_credentials'
  | 'unauthorized'
  | 'username_taken'
  | 'cross_site_blocked'
  | 'internal_error';

/** Safe, user-facing messages. Raw exception text is never sent to clients. */
const MESSAGES: Record<ApiErrorCode, Record<Lang, string>> = {
  bad_request: {
    hi: 'Request sahi nahi hai. Kripya dobara koshish karein.',
    en: 'The request was not valid. Please try again.',
    pa: 'ਬੇਨਤੀ ਸਹੀ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
  invalid_json: {
    hi: 'Bheja gaya data padha nahi ja saka.',
    en: 'The data sent could not be read.',
    pa: 'ਭੇਜਿਆ ਡਾਟਾ ਪੜ੍ਹਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।',
  },
  validation_failed: {
    hi: 'Di gayi jaankari sahi nahi hai. Kripya jaanch kar dobara bharein.',
    en: 'Some of the details are not valid. Please check and try again.',
    pa: 'ਦਿੱਤੀ ਜਾਣਕਾਰੀ ਸਹੀ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕੇ ਦੁਬਾਰਾ ਭਰੋ।',
  },
  payload_too_large: {
    hi: 'File ya data bahut bada hai. 10MB se chhoti file bhejein.',
    en: 'The file or data is too large. Please send a file under 10MB.',
    pa: 'ਫ਼ਾਈਲ ਜਾਂ ਡਾਟਾ ਬਹੁਤ ਵੱਡਾ ਹੈ। 10MB ਤੋਂ ਛੋਟੀ ਫ਼ਾਈਲ ਭੇਜੋ।',
  },
  cross_site_blocked: {
    hi: 'Yeh request kisi doosri website se aayi thi, isliye rok di gayi.',
    en: 'This request came from another website, so it was blocked.',
    pa: 'ਇਹ ਬੇਨਤੀ ਕਿਸੇ ਹੋਰ ਵੈੱਬਸਾਈਟ ਤੋਂ ਆਈ ਸੀ, ਇਸ ਲਈ ਰੋਕ ਦਿੱਤੀ ਗਈ।',
  },
  unsupported_file_type: {
    hi: 'Sirf PDF, JPG, PNG aur WebP file hi upload ho sakti hai.',
    en: 'Only PDF, JPG, PNG and WebP files can be uploaded.',
    pa: 'ਸਿਰਫ਼ PDF, JPG, PNG ਅਤੇ WebP ਫ਼ਾਈਲ ਹੀ ਅੱਪਲੋਡ ਹੋ ਸਕਦੀ ਹੈ।',
  },
  not_found: {
    hi: 'Yeh cheez nahi mili.',
    en: 'Not found.',
    pa: 'ਇਹ ਚੀਜ਼ ਨਹੀਂ ਮਿਲੀ।',
  },
  rate_limited: {
    hi: 'Bahut zyada requests aa gayi hain. Kripya thodi der baad koshish karein.',
    en: 'Too many requests. Please wait a moment and try again.',
    pa: 'ਬਹੁਤ ਜ਼ਿਆਦਾ ਬੇਨਤੀਆਂ ਆ ਗਈਆਂ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
  invalid_credentials: {
    hi: 'Username ya password galat hai.',
    en: 'Wrong username or password.',
    pa: 'ਯੂਜ਼ਰਨੇਮ ਜਾਂ ਪਾਸਵਰਡ ਗਲਤ ਹੈ।',
  },
  unauthorized: {
    hi: 'Pehle login karein.',
    en: 'Please log in first.',
    pa: 'ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ।',
  },
  username_taken: {
    hi: 'Yeh username pehle se liya ja chuka hai. Koi aur chunein.',
    en: 'That username is already taken. Please pick another.',
    pa: 'ਇਹ ਯੂਜ਼ਰਨੇਮ ਪਹਿਲਾਂ ਹੀ ਲਿਆ ਜਾ ਚੁੱਕਾ ਹੈ। ਕੋਈ ਹੋਰ ਚੁਣੋ।',
  },
  internal_error: {
    hi: 'Kuch gadbad ho gayi. Kripya thodi der baad dobara koshish karein.',
    en: 'Something went wrong. Please try again in a little while.',
    pa: 'ਕੁਝ ਗੜਬੜ ਹੋ ਗਈ। ਕਿਰਪਾ ਕਰਕੇ ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
};

export function requestLanguage(req: Request): Lang {
  const lang = req.sessionProfile?.language;
  return lang === 'en' || lang === 'pa' ? lang : 'hi';
}

export function errorMessage(code: ApiErrorCode, lang: Lang): string {
  return MESSAGES[code][lang];
}

/**
 * Sends the standard API error shape:
 *   { error: <localized human-readable message>, code: <stable machine code>, ...extra }
 * `error` stays human-readable because the frontend displays it directly.
 */
export function sendApiError(
  req: Request,
  res: Response,
  status: number,
  code: ApiErrorCode,
  extra: Record<string, unknown> = {},
) {
  return res.status(status).json({ error: errorMessage(code, requestLanguage(req)), code, ...extra });
}

/** Error raised when an upload's declared type is not allowed (thrown from multer fileFilter). */
export class UnsupportedFileTypeError extends Error {
  readonly code = 'UNSUPPORTED_FILE_TYPE';
  constructor() {
    super('Unsupported file type');
    this.name = 'UnsupportedFileTypeError';
  }
}

/** JSON 404 for unknown /api routes (so they never fall through to the SPA HTML). */
export function apiNotFound(req: Request, res: Response) {
  sendApiError(req, res, 404, 'not_found');
}

/**
 * Global error handler. Maps known client errors to precise status codes and
 * returns a generic message for everything else; details are logged server-side only.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FIELD_VALUE') {
      return sendApiError(req, res, 413, 'payload_too_large');
    }
    return sendApiError(req, res, 400, 'bad_request');
  }

  if (err instanceof UnsupportedFileTypeError) {
    return sendApiError(req, res, 400, 'unsupported_file_type');
  }

  // body-parser errors carry a `type` and a 4xx status.
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return sendApiError(req, res, 413, 'payload_too_large');
  }
  if (err?.type === 'entity.parse.failed') {
    return sendApiError(req, res, 400, 'invalid_json');
  }
  const status = Number(err?.status ?? err?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500 && err?.expose !== false) {
    return sendApiError(req, res, status, status === 404 ? 'not_found' : 'bad_request');
  }

  console.error('[Server Error]', req.method, req.originalUrl, err instanceof Error ? err.stack : err);
  return sendApiError(req, res, 500, 'internal_error');
}

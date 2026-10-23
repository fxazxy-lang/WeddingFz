import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from './env';
import { clientIp, HttpError, sendJson } from './http';
import { Router } from './router';
import { registerAdminRoutes } from './routes/admin';
import { registerPublicRoutes } from './routes/public';

/**
 * The request handler shared by the local server (server/index.ts) and the
 * Vercel function (server/vercel.ts). Static files are passed to `serveStatic`
 * when given; on Vercel the CDN serves them instead.
 */

const router = new Router();
registerPublicRoutes(router);
registerAdminRoutes(router);

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  // Google Maps embed for the venue section.
  'frame-src https://www.google.com https://maps.google.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

type StaticHandler = (req: IncomingMessage, res: ServerResponse, url: URL) => void;

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: { url?: URL; serveStatic?: StaticHandler } = {},
): Promise<void> {
  const started = Date.now();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  if (env.isProduction) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  const url = options.url ?? new URL(req.url ?? '/', 'http://localhost');
  const method = req.method ?? 'GET';

  try {
    if (url.pathname.startsWith('/api/')) {
      const match = router.match(method, url.pathname);
      if (match === null) throw new HttpError(404, 'Not found.');
      if (match === 'method') throw new HttpError(405, 'Method not allowed.');
      await match.handler({ req, res, url, params: match.params, ip: clientIp(req) });
    } else if (options.serveStatic && (method === 'GET' || method === 'HEAD')) {
      options.serveStatic(req, res, url);
    } else if (options.serveStatic) {
      throw new HttpError(405, 'Method not allowed.');
    } else {
      throw new HttpError(404, 'Not found.');
    }
  } catch (error) {
    if (res.headersSent) {
      res.end();
    } else if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message, code: error.code, fieldErrors: error.fieldErrors });
    } else {
      console.error(`[error] ${method} ${url.pathname}`, error);
      sendJson(res, 500, { error: 'Something went wrong on our side. Please try again.' });
    }
  } finally {
    if (url.pathname.startsWith('/api/')) {
      console.log(`${method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  }
}

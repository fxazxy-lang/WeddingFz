import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from './app';

/**
 * Vercel function entry: every /api/* request is routed here (see scripts/build.mjs).
 * The site itself is served as static files by Vercel's CDN.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // The route also passes the original path as ?__path=…, in case the platform hands the
  // function the rewritten URL (/api) instead of the one the browser asked for.
  const original = url.searchParams.get('__path');
  url.searchParams.delete('__path');
  if (!url.pathname.startsWith('/api/') && original !== null) url.pathname = `/api/${original}`;
  await handleRequest(req, res, { url });
}

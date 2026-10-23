import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { env } from './env';
import { parseCookies } from './http';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = /^(text\/|application\/(json|manifest)|image\/svg)/;

interface CachedFile {
  body: Buffer;
  gzip: Buffer | null;
  type: string;
  etag: string;
}

const cache = new Map<string, CachedFile>();

function load(filePath: string): CachedFile | null {
  if (env.isProduction) {
    const hit = cache.get(filePath);
    if (hit) return hit;
  }
  let body: Buffer;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    body = fs.readFileSync(filePath);
  } catch {
    return null;
  }
  const type = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const file: CachedFile = {
    body,
    gzip: COMPRESSIBLE.test(type) && body.length > 1024 ? gzipSync(body) : null,
    type,
    etag: `"${createHash('sha1').update(body).digest('base64url').slice(0, 16)}"`,
  };
  if (env.isProduction) cache.set(filePath, file);
  return file;
}

function send(req: IncomingMessage, res: ServerResponse, file: CachedFile, cacheControl: string, status = 200) {
  if (req.headers['if-none-match'] === file.etag && status === 200) {
    res.writeHead(304, { ETag: file.etag, 'Cache-Control': cacheControl });
    res.end();
    return;
  }

  // Byte ranges: Safari and iOS will only play audio/video from servers that support them.
  const isMedia = file.type.startsWith('audio/') || file.type.startsWith('video/');
  const range = status === 200 && isMedia ? parseRange(req.headers.range, file.body.length) : null;
  if (range === 'invalid') {
    res.writeHead(416, { 'Content-Range': `bytes */${file.body.length}` });
    res.end();
    return;
  }
  if (range) {
    const [start, end] = range;
    res.writeHead(206, {
      'Content-Type': file.type,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${file.body.length}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheControl,
      ETag: file.etag,
    });
    res.end(req.method === 'HEAD' ? undefined : file.body.subarray(start, end + 1));
    return;
  }

  const useGzip = file.gzip && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
  const body = useGzip ? file.gzip! : file.body;
  res.writeHead(status, {
    'Content-Type': file.type,
    'Content-Length': body.length,
    'Cache-Control': cacheControl,
    ETag: file.etag,
    Vary: 'Accept-Encoding',
    ...(isMedia ? { 'Accept-Ranges': 'bytes' } : {}),
    ...(useGzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** Parse a single "bytes=start-end" range. Multi-range requests are answered with the whole file. */
function parseRange(header: string | undefined, size: number): [number, number] | 'invalid' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, a, b] = match;
  let start: number;
  let end: number;
  if (a === '' && b === '') return null;
  if (a === '') {
    // suffix range: the last N bytes
    start = Math.max(0, size - Number(b));
    end = size - 1;
  } else {
    start = Number(a);
    end = b === '' ? size - 1 : Math.min(Number(b), size - 1);
  }
  if (start > end || start >= size) return 'invalid';
  return [start, end];
}

/** Pick the page language from ?lang=, the saved cookie, or Khmer by default. */
function pageLanguage(req: IncomingMessage, url: URL): 'km' | 'en' {
  const fromQuery = url.searchParams.get('lang');
  if (fromQuery === 'en' || fromQuery === 'km') return fromQuery;
  const fromCookie = parseCookies(req).lang;
  return fromCookie === 'en' ? 'en' : 'km';
}

function sendHtml(req: IncomingMessage, res: ServerResponse, page: 'index' | 'admin', url: URL, status = 200) {
  const file = load(path.join(env.publicDir, `${page}.html`));
  if (!file) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('The site has not been built yet. Run `npm run build` first.');
    return;
  }
  const lang = page === 'admin' ? 'en' : pageLanguage(req, url);
  const html = file.body.toString('utf8').replace('<html lang="km"', `<html lang="${lang}"`);
  const body = Buffer.from(html, 'utf8');
  const useGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
  const out = useGzip ? gzipSync(body) : body;
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': out.length,
    'Cache-Control': 'no-cache',
    Vary: 'Accept-Encoding, Cookie',
    ...(useGzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : out);
}

export function serveStatic(req: IncomingMessage, res: ServerResponse, url: URL): void {
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/' || pathname === '/index.html') return sendHtml(req, res, 'index', url);
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return sendHtml(req, res, 'admin', url);

  const root = path.resolve(env.publicDir);
  const filePath = path.resolve(root, '.' + pathname);
  if (!filePath.startsWith(root + path.sep) || pathname.endsWith('.html')) {
    return sendHtml(req, res, 'index', url, 404);
  }
  const file = load(filePath);
  if (!file) return sendHtml(req, res, 'index', url, 404);

  const immutable = pathname.startsWith('/assets/');
  // Photos and audio keep their names when replaced, so let browsers revalidate them daily.
  send(req, res, file, immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=86400, must-revalidate');
}

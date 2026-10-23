import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TLSSocket } from 'node:tls';
import type { z, ZodTypeAny } from 'zod';
import { fieldErrors } from '../shared/schemas';
import { env } from './env';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  ip: string;
}

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function sendFile(
  res: ServerResponse,
  body: Buffer | string,
  contentType: string,
  filename: string,
): void {
  const buffer = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': buffer.length,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  res.end(buffer);
}

const MAX_BODY_BYTES = 256 * 1024;

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const type = req.headers['content-type'] ?? '';
  if (!type.includes('application/json')) {
    throw new HttpError(415, 'Expected a JSON request body.');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large.');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

export async function parseBody<S extends ZodTypeAny>(req: IncomingMessage, schema: S): Promise<z.output<S>> {
  const raw = await readJson(req);
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(422, 'Some fields need attention.', 'validation_error', fieldErrors(result.error));
  }
  return result.data;
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function isHttps(req: IncomingMessage): boolean {
  if ((req.socket as TLSSocket).encrypted) return true;
  if (env.trustProxy) return String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https';
  return false;
}

export function clientIp(req: IncomingMessage): string {
  if (env.trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Block cross-site form posts to state-changing endpoints: if the browser sent
 * an Origin header, it must match the host we are serving.
 */
export function assertSameOrigin(req: IncomingMessage): void {
  const origin = req.headers.origin;
  if (!origin) return;
  const host = (env.trustProxy && req.headers['x-forwarded-host']) || req.headers.host;
  try {
    if (new URL(origin).host === host) return;
  } catch {
    // fall through
  }
  throw new HttpError(403, 'Cross-origin request blocked.');
}

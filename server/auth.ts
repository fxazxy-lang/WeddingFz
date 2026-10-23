import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from './env';
import { HttpError, isHttps, parseCookies } from './http';

export const SESSION_COOKIE = 'wedding_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(value: string): string {
  return createHmac('sha256', env.authSecret).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, env.adminPassword);
}

export function createSessionToken(now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!safeEqual(signature, sign(payload))) return false;
  const [version, expires] = payload.split('.');
  return version === 'v1' && Number(expires) * 1000 > now;
}

export function isAuthenticated(req: IncomingMessage): boolean {
  return verifySessionToken(parseCookies(req)[SESSION_COOKIE]);
}

export function requireAdmin(req: IncomingMessage): void {
  if (!isAuthenticated(req)) throw new HttpError(401, 'Please sign in to continue.', 'unauthorized');
}

function cookieAttributes(req: IncomingMessage, maxAge: number): string {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAge}`];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

export function setSessionCookie(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${createSessionToken()}; ${cookieAttributes(req, SESSION_TTL_SECONDS)}`);
}

export function clearSessionCookie(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieAttributes(req, 0)}`);
}

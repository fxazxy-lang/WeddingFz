import { randomBytes } from 'node:crypto';
import path from 'node:path';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file: rely on real environment variables.
}

const isProduction = process.env.NODE_ENV === 'production';

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function required(name: string, devFallback: () => string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  }
  const fallback = devFallback();
  console.warn(`[env] ${name} is not set. Using a development default; set it in .env before going live.`);
  return fallback;
}

const authSecret = required('AUTH_SECRET', () => randomBytes(32).toString('hex'));
if (authSecret.length < 32) {
  throw new Error('AUTH_SECRET must be at least 32 characters long.');
}

/** Running on Vercel (set automatically there). Functions have no lasting disk, so Turso is required. */
const isVercel = Boolean(process.env.VERCEL);

/** Turso database URL. The Vercel Marketplace integration may add it under a prefixed name. */
const tursoUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.LIBSQL_URL ??
  Object.entries(process.env).find(([k, v]) => k.endsWith('_TURSO_DATABASE_URL') && v)?.[1] ??
  (process.env.DATABASE_URL?.startsWith('libsql://') ? process.env.DATABASE_URL : undefined);
const tursoToken =
  process.env.TURSO_AUTH_TOKEN ??
  process.env.LIBSQL_AUTH_TOKEN ??
  Object.entries(process.env).find(([k, v]) => k.endsWith('_TURSO_AUTH_TOKEN') && v)?.[1];

export const env = {
  isProduction,
  isVercel,
  tursoUrl: tursoUrl || undefined,
  tursoToken: tursoToken || undefined,
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  adminPassword: required('ADMIN_PASSWORD', () => 'admin'),
  authSecret,
  databasePath: process.env.DATABASE_PATH ?? path.resolve('data', 'wedding.db'),
  publicDir: process.env.PUBLIC_DIR ?? path.resolve('dist', 'public'),
  wishesRequireApproval: bool(process.env.WISHES_REQUIRE_APPROVAL, true),
  // Vercel sits in front of every request and sets the forwarded headers itself.
  trustProxy: bool(process.env.TRUST_PROXY, isVercel),
} as const;

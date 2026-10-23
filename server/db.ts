import { env } from './env';

/**
 * Database access, async so the same code runs on two backends:
 *  - Local SQLite file (node:sqlite) for `npm run dev`, Docker and self-hosting.
 *  - Turso (hosted SQLite) over its HTTP API when TURSO_DATABASE_URL is set, as on Vercel,
 *    where functions have no lasting disk. No extra npm packages are needed for either.
 * Both speak the same SQL, so the repositories don't care which one is in use.
 */

export type SqlValue = string | number | null;
export type Params = SqlValue[] | Record<string, SqlValue | undefined>;

export interface Db {
  all<T>(sql: string, params?: Params): Promise<T[]>;
  get<T>(sql: string, params?: Params): Promise<T | undefined>;
  run(sql: string, params?: Params): Promise<{ changes: number }>;
  /** Run several statements in one transaction; rolled back if `fn` throws. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export class DbError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

/**
 * Ordered, append-only list of schema migrations.
 * Never edit an entry that has shipped; add a new one instead.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE guests (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    phone_key     TEXT,
    side          TEXT NOT NULL CHECK (side IN ('groom', 'bride')),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    pax           INTEGER NOT NULL DEFAULT 1 CHECK (pax BETWEEN 0 AND 50),
    dietary       TEXT NOT NULL DEFAULT 'none',
    dietary_note  TEXT NOT NULL DEFAULT '',
    table_number  TEXT NOT NULL DEFAULT '',
    notes         TEXT NOT NULL DEFAULT '',
    source        TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'rsvp')),
    responded_at  TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE UNIQUE INDEX guests_phone_key_unique ON guests (phone_key) WHERE phone_key IS NOT NULL;
  CREATE INDEX guests_status_idx ON guests (status);

  CREATE TABLE wishes (
    id          TEXT PRIMARY KEY,
    guest_id    TEXT REFERENCES guests (id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
    created_at  TEXT NOT NULL
  );
  CREATE INDEX wishes_status_created_idx ON wishes (status, created_at DESC);
  `,
];

/** Split a migration into single statements (the schema has no semicolons inside strings). */
const statements = (sql: string) =>
  sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

/* ---------------------------------------------------------------------------------------------
   Local SQLite (node:sqlite, built into Node 22.13+)
   --------------------------------------------------------------------------------------------- */

type SqliteDatabase = import('node:sqlite').DatabaseSync;

class LocalDb implements Db {
  /** Serialises transactions: they share one connection. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly db: SqliteDatabase) {}

  private bind(params?: Params): unknown[] {
    if (!params) return [];
    if (Array.isArray(params)) return params;
    // node:sqlite takes named parameters as one object; drop undefined values.
    return [Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v === undefined ? null : v]))];
  }

  async all<T>(sql: string, params?: Params): Promise<T[]> {
    return this.db.prepare(sql).all(...(this.bind(params) as [])) as T[];
  }

  async get<T>(sql: string, params?: Params): Promise<T | undefined> {
    return this.db.prepare(sql).get(...(this.bind(params) as [])) as T | undefined;
  }

  async run(sql: string, params?: Params): Promise<{ changes: number }> {
    const result = this.db.prepare(sql).run(...(this.bind(params) as []));
    return { changes: Number(result.changes) };
  }

  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(this);
        this.db.exec('COMMIT');
        return result;
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  exec(sql: string) {
    this.db.exec(sql);
  }
}

async function openLocal(): Promise<LocalDb> {
  const [{ DatabaseSync }, fs, path] = await Promise.all([import('node:sqlite'), import('node:fs'), import('node:path')]);
  const file = env.databasePath;
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const sqlite = new DatabaseSync(file);
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const db = new LocalDb(sqlite);

  sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set((await db.all<{ id: number }>('SELECT id FROM _migrations')).map((r) => Number(r.id)));
  for (const [index, sql] of MIGRATIONS.entries()) {
    const id = index + 1;
    if (applied.has(id)) continue;
    await db.transaction(async (tx) => {
      db.exec(sql);
      await tx.run('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)', [id, nowIso()]);
    });
  }
  return db;
}

/* ---------------------------------------------------------------------------------------------
   Turso over HTTP (Hrana "pipeline" protocol): https://docs.turso.tech/sdk/http/reference
   --------------------------------------------------------------------------------------------- */

type HranaValue =
  | { type: 'null' }
  | { type: 'integer'; value: string }
  | { type: 'float'; value: number | string }
  | { type: 'text'; value: string }
  | { type: 'blob'; base64: string };

interface HranaStmt {
  sql: string;
  args?: HranaValue[];
  named_args?: { name: string; value: HranaValue }[];
}

interface HranaExecuteResult {
  cols: { name: string | null }[];
  rows: HranaValue[][];
  affected_row_count: number;
}

type HranaResult =
  | { type: 'ok'; response: { type: 'execute'; result: HranaExecuteResult } | { type: 'close' } }
  | { type: 'error'; error: { message: string; code?: string } };

interface PipelineResponse {
  baton: string | null;
  base_url: string | null;
  results: HranaResult[];
}

function encode(value: SqlValue | undefined): HranaValue {
  if (value === null || value === undefined) return { type: 'null' };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'integer', value: String(value) } : { type: 'float', value };
  }
  return { type: 'text', value: String(value) };
}

function decode(value: HranaValue): SqlValue {
  switch (value.type) {
    case 'null':
      return null;
    case 'integer':
    case 'float':
      return Number(value.value);
    case 'text':
      return value.value;
    case 'blob':
      return value.base64;
  }
}

function toStmt(sql: string, params?: Params): HranaStmt {
  if (!params) return { sql };
  if (Array.isArray(params)) return { sql, args: params.map(encode) };
  return { sql, named_args: Object.entries(params).map(([name, value]) => ({ name: `:${name}`, value: encode(value) })) };
}

function toRows<T>(result: HranaExecuteResult): T[] {
  const names = result.cols.map((c, i) => c.name ?? String(i));
  return result.rows.map((row) => Object.fromEntries(row.map((v, i) => [names[i], decode(v)])) as T);
}

class TursoDb implements Db {
  private readonly endpoint: string;

  constructor(
    url: string,
    private readonly token: string | undefined,
    private readonly stream?: { baton: string | null; baseUrl: string },
  ) {
    this.endpoint = url.replace(/^(libsql|turso|wss?):\/\//, 'https://').replace(/\/+$/, '');
  }

  /** Send statements in one round trip. `keepOpen` keeps the connection for a transaction. */
  async pipeline(stmts: HranaStmt[], options: { keepOpen?: boolean; baton?: string | null; baseUrl?: string } = {}) {
    const requests: unknown[] = stmts.map((stmt) => ({ type: 'execute', stmt }));
    if (!options.keepOpen) requests.push({ type: 'close' });
    const res = await fetch(`${options.baseUrl ?? this.endpoint}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ baton: options.baton ?? null, requests }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new DbError(`Turso HTTP ${res.status}: ${text.slice(0, 300)}`, `HTTP_${res.status}`);
    }
    const body = (await res.json()) as PipelineResponse;
    const results: HranaExecuteResult[] = [];
    for (const r of body.results.slice(0, stmts.length)) {
      if (r.type === 'error') throw new DbError(r.error.message, r.error.code);
      if (r.response.type === 'execute') results.push(r.response.result);
    }
    return { results, baton: body.baton, baseUrl: body.base_url ?? options.baseUrl ?? this.endpoint };
  }

  private async one(sql: string, params?: Params): Promise<HranaExecuteResult> {
    if (this.stream) {
      // Inside a transaction: continue the same connection.
      const { results, baton, baseUrl } = await this.pipeline([toStmt(sql, params)], {
        keepOpen: true,
        baton: this.stream.baton,
        baseUrl: this.stream.baseUrl,
      });
      this.stream.baton = baton;
      this.stream.baseUrl = baseUrl;
      return results[0];
    }
    // Foreign keys are per connection in SQLite, so switch them on for each request.
    const { results } = await this.pipeline([{ sql: 'PRAGMA foreign_keys = ON' }, toStmt(sql, params)]);
    return results[1];
  }

  async all<T>(sql: string, params?: Params): Promise<T[]> {
    return toRows<T>(await this.one(sql, params));
  }

  async get<T>(sql: string, params?: Params): Promise<T | undefined> {
    return toRows<T>(await this.one(sql, params))[0];
  }

  async run(sql: string, params?: Params): Promise<{ changes: number }> {
    return { changes: Number((await this.one(sql, params)).affected_row_count) };
  }

  async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    if (this.stream) return fn(this); // already inside one
    const opened = await this.pipeline([{ sql: 'PRAGMA foreign_keys = ON' }, { sql: 'BEGIN IMMEDIATE' }], { keepOpen: true });
    const stream = { baton: opened.baton, baseUrl: opened.baseUrl };
    const tx = new TursoDb(this.endpoint, this.token, stream);
    try {
      const result = await fn(tx);
      await this.pipeline([{ sql: 'COMMIT' }], { baton: stream.baton, baseUrl: stream.baseUrl });
      return result;
    } catch (error) {
      await this.pipeline([{ sql: 'ROLLBACK' }], { baton: stream.baton, baseUrl: stream.baseUrl }).catch(() => undefined);
      throw error;
    }
  }

  async migrate(): Promise<void> {
    await this.pipeline([{ sql: 'CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)' }]);
    const applied = new Set((await this.all<{ id: number }>('SELECT id FROM _migrations')).map((r) => Number(r.id)));
    for (const [index, sql] of MIGRATIONS.entries()) {
      const id = index + 1;
      if (applied.has(id)) continue;
      await this.transaction(async (tx) => {
        // Another cold-starting function may have just applied it.
        if (await tx.get('SELECT id FROM _migrations WHERE id = ?', [id])) return;
        for (const stmt of statements(sql)) await tx.run(stmt);
        await tx.run('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)', [id, nowIso()]);
      });
    }
  }
}

/* ---------------------------------------------------------------------------------------------
   Shared instance
   --------------------------------------------------------------------------------------------- */

let ready: Promise<Db> | null = null;

/** The database, opened (and migrated) on first use. */
export function db(): Promise<Db> {
  ready ??= (async () => {
    if (env.tursoUrl) {
      const turso = new TursoDb(env.tursoUrl, env.tursoToken);
      await turso.migrate();
      return turso;
    }
    if (env.isVercel) {
      throw new Error(
        'No database configured. On Vercel, connect a Turso database (Storage → Marketplace → Turso) so TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set.',
      );
    }
    return openLocal();
  })().catch((error) => {
    ready = null; // try again on the next request
    throw error;
  });
  return ready;
}

/** Which backend is in use, for logs. */
export const dbKind = () => (env.tursoUrl ? 'turso' : 'sqlite');

export const nowIso = () => new Date().toISOString();

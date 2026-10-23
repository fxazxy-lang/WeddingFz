import { randomUUID } from 'node:crypto';
import type { Dietary, GuestStatus, Side } from '../../shared/constants';
import { phoneKey } from '../../shared/phone';
import type { GuestCreateInput, GuestUpdateInput, RsvpInput } from '../../shared/schemas';
import type { DashboardStats, Guest } from '../../shared/types';
import { type Db, db, nowIso } from '../db';

interface GuestRow {
  id: string;
  name: string;
  phone: string;
  phone_key: string | null;
  side: Side;
  status: GuestStatus;
  pax: number;
  dietary: Dietary;
  dietary_note: string;
  table_number: string;
  notes: string;
  source: 'admin' | 'rsvp';
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    side: row.side,
    status: row.status,
    pax: Number(row.pax),
    dietary: row.dietary,
    dietaryNote: row.dietary_note,
    tableNumber: row.table_number,
    notes: row.notes,
    source: row.source,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DuplicatePhoneError extends Error {
  constructor(public readonly existingName: string) {
    super(`Phone number already belongs to ${existingName}`);
  }
}

export interface GuestFilter {
  search?: string;
  side?: Side;
  status?: GuestStatus;
}

/* Helpers take the connection (or open transaction) to run on. */

async function getOn(d: Db, id: string): Promise<Guest | null> {
  const row = await d.get<GuestRow>('SELECT * FROM guests WHERE id = ?', [id]);
  return row ? toGuest(row) : null;
}

async function findByPhoneOn(d: Db, phone: string): Promise<Guest | null> {
  const key = phoneKey(phone);
  if (!key) return null;
  const row = await d.get<GuestRow>('SELECT * FROM guests WHERE phone_key = ?', [key]);
  return row ? toGuest(row) : null;
}

async function createOn(d: Db, input: GuestCreateInput, source: 'admin' | 'rsvp' = 'admin'): Promise<Guest> {
  const key = input.phone ? phoneKey(input.phone) : null;
  if (key) {
    const existing = await findByPhoneOn(d, input.phone);
    if (existing) throw new DuplicatePhoneError(existing.name);
  }
  const now = nowIso();
  const id = randomUUID();
  await d.run(
    `INSERT INTO guests (id, name, phone, phone_key, side, status, pax, dietary, dietary_note, table_number, notes, source, responded_at, created_at, updated_at)
     VALUES (:id, :name, :phone, :phoneKey, :side, :status, :pax, :dietary, :dietaryNote, :tableNumber, :notes, :source, :respondedAt, :now, :now)`,
    {
      id,
      name: input.name,
      phone: input.phone,
      phoneKey: key,
      side: input.side,
      status: input.status,
      pax: input.pax,
      dietary: input.dietary,
      dietaryNote: input.dietaryNote,
      tableNumber: input.tableNumber,
      notes: input.notes,
      source,
      respondedAt: input.status === 'pending' ? null : now,
      now,
    },
  );
  return (await getOn(d, id))!;
}

async function updateOn(d: Db, id: string, patch: GuestUpdateInput): Promise<Guest | null> {
  const current = await getOn(d, id);
  if (!current) return null;
  const next = { ...current, ...stripUndefined(patch) };
  const key = next.phone ? phoneKey(next.phone) : null;
  if (key && key !== phoneKey(current.phone)) {
    const owner = await findByPhoneOn(d, next.phone);
    if (owner && owner.id !== id) throw new DuplicatePhoneError(owner.name);
  }
  const now = nowIso();
  const statusChanged = patch.status !== undefined && patch.status !== current.status;
  await d.run(
    `UPDATE guests SET name = :name, phone = :phone, phone_key = :phoneKey, side = :side, status = :status, pax = :pax,
       dietary = :dietary, dietary_note = :dietaryNote, table_number = :tableNumber, notes = :notes,
       responded_at = :respondedAt, updated_at = :now
     WHERE id = :id`,
    {
      id,
      name: next.name,
      phone: next.phone,
      phoneKey: key,
      side: next.side,
      status: next.status,
      pax: next.pax,
      dietary: next.dietary,
      dietaryNote: next.dietaryNote,
      tableNumber: next.tableNumber,
      notes: next.notes,
      respondedAt: statusChanged ? (next.status === 'pending' ? null : now) : current.respondedAt,
      now,
    },
  );
  return getOn(d, id);
}

export const guestsRepo = {
  async list(filter: GuestFilter = {}): Promise<Guest[]> {
    const where: string[] = [];
    const params: Record<string, string> = {};
    if (filter.side) {
      where.push('side = :side');
      params.side = filter.side;
    }
    if (filter.status) {
      where.push('status = :status');
      params.status = filter.status;
    }
    if (filter.search) {
      where.push("(name LIKE :q ESCAPE '\\' OR phone LIKE :q ESCAPE '\\' OR table_number LIKE :q ESCAPE '\\')");
      params.q = `%${filter.search.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
    }
    const sql = `SELECT * FROM guests ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name COLLATE NOCASE`;
    return (await (await db()).all<GuestRow>(sql, params)).map(toGuest);
  },

  async get(id: string): Promise<Guest | null> {
    return getOn(await db(), id);
  },

  async findByPhone(phone: string): Promise<Guest | null> {
    return findByPhoneOn(await db(), phone);
  },

  async create(input: GuestCreateInput, source: 'admin' | 'rsvp' = 'admin'): Promise<Guest> {
    return createOn(await db(), input, source);
  },

  /** Insert many guests at once; rows whose phone already exists are skipped. */
  async createMany(inputs: GuestCreateInput[]): Promise<{ created: number; skipped: string[] }> {
    return (await db()).transaction(async (tx) => {
      let created = 0;
      const skipped: string[] = [];
      for (const input of inputs) {
        try {
          await createOn(tx, input);
          created += 1;
        } catch (error) {
          if (error instanceof DuplicatePhoneError) skipped.push(input.name);
          else throw error;
        }
      }
      return { created, skipped };
    });
  },

  async update(id: string, patch: GuestUpdateInput): Promise<Guest | null> {
    return updateOn(await db(), id, patch);
  },

  /** Apply the same status and/or table number to many guests in one transaction. */
  async updateMany(ids: string[], patch: Pick<GuestUpdateInput, 'status' | 'tableNumber'>): Promise<number> {
    return (await db()).transaction(async (tx) => {
      let updated = 0;
      for (const id of new Set(ids)) if (await updateOn(tx, id, patch)) updated += 1;
      return updated;
    });
  },

  async deleteMany(ids: string[]): Promise<number> {
    const unique = [...new Set(ids)];
    const placeholders = unique.map(() => '?').join(', ');
    return (await (await db()).run(`DELETE FROM guests WHERE id IN (${placeholders})`, unique)).changes;
  },

  async delete(id: string): Promise<boolean> {
    return (await (await db()).run('DELETE FROM guests WHERE id = ?', [id])).changes > 0;
  },

  /**
   * Record a public RSVP. Matches an existing invitation by phone number so the
   * couple's pre-entered details (name, table) are kept; otherwise creates a guest.
   */
  async upsertFromRsvp(input: RsvpInput): Promise<{ guest: Guest; updated: boolean }> {
    return (await db()).transaction(async (tx) => {
      const status: GuestStatus = input.attending ? 'confirmed' : 'declined';
      const pax = input.attending ? input.pax : 0;
      const existing = await findByPhoneOn(tx, input.phone);
      if (existing) {
        const now = nowIso();
        await tx.run(
          `UPDATE guests SET name = :name, side = :side, status = :status, pax = :pax, dietary = :dietary,
             dietary_note = :dietaryNote, responded_at = :now, updated_at = :now WHERE id = :id`,
          {
            id: existing.id,
            // Keep the name the couple typed for invitations they created themselves.
            name: existing.source === 'admin' ? existing.name : input.name,
            side: existing.source === 'admin' ? existing.side : input.side,
            status,
            pax,
            dietary: input.dietary,
            dietaryNote: input.dietaryNote,
            now,
          },
        );
        return { guest: (await getOn(tx, existing.id))!, updated: true };
      }
      const guest = await createOn(
        tx,
        {
          name: input.name,
          phone: input.phone,
          side: input.side,
          status,
          pax,
          dietary: input.dietary,
          dietaryNote: input.dietaryNote,
          tableNumber: '',
          notes: '',
        },
        'rsvp',
      );
      return { guest, updated: false };
    });
  },

  async stats(): Promise<DashboardStats['guests']> {
    const row = (await (await db()).get<Record<string, number>>(
      `SELECT
         COUNT(*) AS invited,
         COALESCE(SUM(status = 'confirmed'), 0) AS confirmed,
         COALESCE(SUM(status = 'declined'), 0) AS declined,
         COALESCE(SUM(status = 'pending'), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'confirmed' THEN pax END), 0) AS confirmedPax,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN pax END), 0) AS pendingPax,
         COALESCE(SUM(CASE WHEN status = 'confirmed' AND side = 'groom' THEN pax END), 0) AS groomPax,
         COALESCE(SUM(CASE WHEN status = 'confirmed' AND side = 'bride' THEN pax END), 0) AS bridePax
       FROM guests`,
    ))!;
    return {
      invited: Number(row.invited),
      confirmed: Number(row.confirmed),
      declined: Number(row.declined),
      pending: Number(row.pending),
      confirmedPax: Number(row.confirmedPax),
      pendingPax: Number(row.pendingPax),
      groomPax: Number(row.groomPax),
      bridePax: Number(row.bridePax),
    };
  },

  async recentResponses(limit = 6): Promise<DashboardStats['recentResponses']> {
    const rows = await (await db()).all<GuestRow>(
      'SELECT * FROM guests WHERE responded_at IS NOT NULL ORDER BY responded_at DESC LIMIT ?',
      [limit],
    );
    return rows.map((row) => {
      const g = toGuest(row);
      return { id: g.id, name: g.name, side: g.side, status: g.status, pax: g.pax, respondedAt: g.respondedAt };
    });
  },
};

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

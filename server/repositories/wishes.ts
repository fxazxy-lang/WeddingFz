import { randomUUID } from 'node:crypto';
import type { WishStatus } from '../../shared/constants';
import type { DashboardStats, PublicWish, Wish } from '../../shared/types';
import { db, nowIso } from '../db';

interface WishRow {
  id: string;
  guest_id: string | null;
  name: string;
  message: string;
  status: WishStatus;
  created_at: string;
}

const toWish = (row: WishRow): Wish => ({
  id: row.id,
  guestId: row.guest_id,
  name: row.name,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
});

export const wishesRepo = {
  async create(input: { name: string; message: string; guestId?: string | null; status: WishStatus }): Promise<Wish> {
    const id = randomUUID();
    await (await db()).run(
      'INSERT INTO wishes (id, guest_id, name, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, input.guestId ?? null, input.name, input.message, input.status, nowIso()],
    );
    return (await this.get(id))!;
  },

  async get(id: string): Promise<Wish | null> {
    const row = await (await db()).get<WishRow>('SELECT * FROM wishes WHERE id = ?', [id]);
    return row ? toWish(row) : null;
  },

  async list(status?: WishStatus): Promise<Wish[]> {
    const d = await db();
    const rows = status
      ? await d.all<WishRow>('SELECT * FROM wishes WHERE status = ? ORDER BY created_at DESC', [status])
      : await d.all<WishRow>('SELECT * FROM wishes ORDER BY created_at DESC');
    return rows.map(toWish);
  },

  /** Approved wishes, newest first, with cursor pagination on created_at. */
  async listPublic(limit: number, before?: string): Promise<{ items: PublicWish[]; nextCursor: string | null }> {
    const d = await db();
    const rows = before
      ? await d.all<WishRow>(
          "SELECT * FROM wishes WHERE status = 'approved' AND created_at < ? ORDER BY created_at DESC LIMIT ?",
          [before, limit + 1],
        )
      : await d.all<WishRow>("SELECT * FROM wishes WHERE status = 'approved' ORDER BY created_at DESC LIMIT ?", [limit + 1]);
    const page = rows.slice(0, limit);
    return {
      items: page.map((r) => ({ id: r.id, name: r.name, message: r.message, createdAt: r.created_at })),
      nextCursor: rows.length > limit ? page[page.length - 1].created_at : null,
    };
  },

  async setStatus(id: string, status: WishStatus): Promise<Wish | null> {
    await (await db()).run('UPDATE wishes SET status = ? WHERE id = ?', [status, id]);
    return this.get(id);
  },

  async delete(id: string): Promise<boolean> {
    return (await (await db()).run('DELETE FROM wishes WHERE id = ?', [id])).changes > 0;
  },

  /** Set the status of several wishes at once; returns the updated wishes. */
  async setStatusMany(ids: string[], status: WishStatus): Promise<Wish[]> {
    const unique = [...new Set(ids)];
    const placeholders = unique.map(() => '?').join(', ');
    const d = await db();
    await d.run(`UPDATE wishes SET status = ? WHERE id IN (${placeholders})`, [status, ...unique]);
    return (await d.all<WishRow>(`SELECT * FROM wishes WHERE id IN (${placeholders})`, unique)).map(toWish);
  },

  async deleteMany(ids: string[]): Promise<number> {
    const unique = [...new Set(ids)];
    const placeholders = unique.map(() => '?').join(', ');
    return (await (await db()).run(`DELETE FROM wishes WHERE id IN (${placeholders})`, unique)).changes;
  },

  async stats(): Promise<DashboardStats['wishes']> {
    const row = (await (await db()).get<Record<string, number>>(
      `SELECT COUNT(*) AS total,
         COALESCE(SUM(status = 'pending'), 0) AS pending,
         COALESCE(SUM(status = 'approved'), 0) AS approved,
         COALESCE(SUM(status = 'hidden'), 0) AS hidden
       FROM wishes`,
    ))!;
    return {
      total: Number(row.total),
      pending: Number(row.pending),
      approved: Number(row.approved),
      hidden: Number(row.hidden),
    };
  },
};

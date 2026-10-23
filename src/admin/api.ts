import type { GuestStatus, Side, WishStatus } from '../../shared/constants';
import type { GuestCreateInput, GuestUpdateInput } from '../../shared/schemas';
import type { DashboardStats, Guest, Wish } from '../../shared/types';
import { request } from '../lib/api';

export interface ExportFilter {
  search?: string;
  side?: Side | '';
  status?: GuestStatus | '';
}

export const adminApi = {
  session: () => request<{ authenticated: boolean }>('/api/admin/session'),
  login: (password: string) => request<{ ok: true }>('/api/admin/login', { method: 'POST', json: { password } }),
  logout: () => request<{ ok: true }>('/api/admin/logout', { method: 'POST', json: {} }),

  stats: () => request<DashboardStats>('/api/admin/stats'),

  guests: () => request<{ items: Guest[] }>('/api/admin/guests').then((r) => r.items),
  createGuest: (input: GuestCreateInput) => request<Guest>('/api/admin/guests', { method: 'POST', json: input }),
  createGuests: (guests: GuestCreateInput[]) =>
    request<{ created: number; skipped: string[] }>('/api/admin/guests/bulk', { method: 'POST', json: { guests } }),
  updateGuest: (id: string, patch: GuestUpdateInput) =>
    request<Guest>(`/api/admin/guests/${encodeURIComponent(id)}`, { method: 'PATCH', json: patch }),
  updateGuests: (ids: string[], patch: { status?: GuestStatus; tableNumber?: string }) =>
    request<{ updated: number }>('/api/admin/guests/bulk-update', { method: 'POST', json: { ids, patch } }),
  deleteGuests: (ids: string[]) =>
    request<{ deleted: number }>('/api/admin/guests/bulk-delete', { method: 'POST', json: { ids } }),
  deleteGuest: (id: string) => request<{ ok: true }>(`/api/admin/guests/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  wishes: () => request<{ items: Wish[] }>('/api/admin/wishes').then((r) => r.items),
  setWishStatus: (id: string, status: WishStatus) =>
    request<Wish>(`/api/admin/wishes/${encodeURIComponent(id)}`, { method: 'PATCH', json: { status } }),
  deleteWish: (id: string) => request<{ ok: true }>(`/api/admin/wishes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setWishStatusMany: (ids: string[], status: WishStatus) =>
    request<{ items: Wish[] }>('/api/admin/wishes/bulk-update', { method: 'POST', json: { ids, status } }).then((r) => r.items),
  deleteWishes: (ids: string[]) =>
    request<{ deleted: number }>('/api/admin/wishes/bulk-delete', { method: 'POST', json: { ids } }).then((r) => r.deleted),

  exportUrl: (format: 'csv' | 'xlsx', filter: ExportFilter = {}) => {
    const params = new URLSearchParams({ format });
    if (filter.search) params.set('search', filter.search);
    if (filter.side) params.set('side', filter.side);
    if (filter.status) params.set('status', filter.status);
    return `/api/admin/export?${params}`;
  },
};

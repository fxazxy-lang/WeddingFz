import { GUEST_STATUSES, SIDES, WISH_STATUSES, type GuestStatus, type Side, type WishStatus } from '../../shared/constants';
import {
  guestBulkDeleteSchema,
  guestBulkSchema,
  guestBulkUpdateSchema,
  guestCreateSchema,
  guestUpdateSchema,
  loginSchema,
  wishBulkDeleteSchema,
  wishBulkUpdateSchema,
  wishUpdateSchema,
} from '../../shared/schemas';
import type { DashboardStats } from '../../shared/types';
import { checkPassword, clearSessionCookie, isAuthenticated, requireAdmin, setSessionCookie } from '../auth';
import { toCsv } from '../export/csv';
import { GUEST_COLUMNS, guestRows, guestWorkbook } from '../export/guestExport';
import { buildXlsx } from '../export/xlsx';
import { assertSameOrigin, type Ctx, HttpError, parseBody, sendFile, sendJson } from '../http';
import { createRateLimiter } from '../rateLimit';
import { DuplicatePhoneError, type GuestFilter, guestsRepo } from '../repositories/guests';
import { wishesRepo } from '../repositories/wishes';
import type { Handler, Router } from '../router';

const loginLimiter = createRateLimiter({ name: 'login', limit: 8, windowMs: 15 * 60_000 });

/** Wrap a handler so it only runs for a signed-in admin. Mutations also get an origin check. */
const admin =
  (handler: Handler): Handler =>
  (ctx: Ctx) => {
    requireAdmin(ctx.req);
    if (ctx.req.method !== 'GET') assertSameOrigin(ctx.req);
    return handler(ctx);
  };

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function filterFromQuery(url: URL): GuestFilter {
  return {
    search: url.searchParams.get('search')?.trim() || undefined,
    side: pick<Side>(url.searchParams.get('side'), SIDES),
    status: pick<GuestStatus>(url.searchParams.get('status'), GUEST_STATUSES),
  };
}

function duplicateToHttp(error: unknown): never {
  if (error instanceof DuplicatePhoneError) {
    throw new HttpError(409, `This phone number is already used by ${error.existingName}.`, 'duplicate_phone', {
      phone: ['Already used by ' + error.existingName],
    });
  }
  throw error;
}

export function registerAdminRoutes(router: Router): void {
  router.post('/api/admin/login', async ({ req, res, ip }) => {
    assertSameOrigin(req);
    loginLimiter.hit(ip);
    const { password } = await parseBody(req, loginSchema);
    if (!checkPassword(password)) throw new HttpError(401, 'That password is not correct.', 'bad_password');
    loginLimiter.reset(ip);
    setSessionCookie(req, res);
    sendJson(res, 200, { ok: true });
  });

  router.post('/api/admin/logout', ({ req, res }) => {
    clearSessionCookie(req, res);
    sendJson(res, 200, { ok: true });
  });

  router.get('/api/admin/session', ({ req, res }) => sendJson(res, 200, { authenticated: isAuthenticated(req) }));

  router.get(
    '/api/admin/stats',
    admin(async ({ res }) => {
      const stats: DashboardStats = {
        guests: await guestsRepo.stats(),
        wishes: await wishesRepo.stats(),
        recentResponses: await guestsRepo.recentResponses(),
      };
      sendJson(res, 200, stats);
    }),
  );

  router.get(
    '/api/admin/guests',
    admin(async ({ res, url }) => sendJson(res, 200, { items: await guestsRepo.list(filterFromQuery(url)) })),
  );

  router.post(
    '/api/admin/guests',
    admin(async ({ req, res }) => {
      const input = await parseBody(req, guestCreateSchema);
      try {
        sendJson(res, 201, await guestsRepo.create(input));
      } catch (error) {
        duplicateToHttp(error);
      }
    }),
  );

  router.post(
    '/api/admin/guests/bulk',
    admin(async ({ req, res }) => {
      const { guests } = await parseBody(req, guestBulkSchema);
      sendJson(res, 201, await guestsRepo.createMany(guests));
    }),
  );

  router.post(
    '/api/admin/guests/bulk-update',
    admin(async ({ req, res }) => {
      const { ids, patch } = await parseBody(req, guestBulkUpdateSchema);
      sendJson(res, 200, { updated: await guestsRepo.updateMany(ids, patch) });
    }),
  );

  router.post(
    '/api/admin/guests/bulk-delete',
    admin(async ({ req, res }) => {
      const { ids } = await parseBody(req, guestBulkDeleteSchema);
      sendJson(res, 200, { deleted: await guestsRepo.deleteMany(ids) });
    }),
  );

  router.patch(
    '/api/admin/guests/:id',
    admin(async ({ req, res, params }) => {
      const patch = await parseBody(req, guestUpdateSchema);
      try {
        const guest = await guestsRepo.update(params.id, patch);
        if (!guest) throw new HttpError(404, 'Guest not found.');
        sendJson(res, 200, guest);
      } catch (error) {
        duplicateToHttp(error);
      }
    }),
  );

  router.delete(
    '/api/admin/guests/:id',
    admin(async ({ res, params }) => {
      if (!(await guestsRepo.delete(params.id))) throw new HttpError(404, 'Guest not found.');
      sendJson(res, 200, { ok: true });
    }),
  );

  router.get(
    '/api/admin/wishes',
    admin(async ({ res, url }) =>
      sendJson(res, 200, { items: await wishesRepo.list(pick<WishStatus>(url.searchParams.get('status'), WISH_STATUSES)) }),
    ),
  );

  router.post(
    '/api/admin/wishes/bulk-update',
    admin(async ({ req, res }) => {
      const { ids, status } = await parseBody(req, wishBulkUpdateSchema);
      sendJson(res, 200, { items: await wishesRepo.setStatusMany(ids, status) });
    }),
  );

  router.post(
    '/api/admin/wishes/bulk-delete',
    admin(async ({ req, res }) => {
      const { ids } = await parseBody(req, wishBulkDeleteSchema);
      sendJson(res, 200, { deleted: await wishesRepo.deleteMany(ids) });
    }),
  );

  router.patch(
    '/api/admin/wishes/:id',
    admin(async ({ req, res, params }) => {
      const { status } = await parseBody(req, wishUpdateSchema);
      const wish = await wishesRepo.setStatus(params.id, status);
      if (!wish) throw new HttpError(404, 'Wish not found.');
      sendJson(res, 200, wish);
    }),
  );

  router.delete(
    '/api/admin/wishes/:id',
    admin(async ({ res, params }) => {
      if (!(await wishesRepo.delete(params.id))) throw new HttpError(404, 'Wish not found.');
      sendJson(res, 200, { ok: true });
    }),
  );

  router.get(
    '/api/admin/export',
    admin(async ({ res, url }) => {
      const guests = await guestsRepo.list(filterFromQuery(url));
      const stamp = new Date().toISOString().slice(0, 10);
      if (url.searchParams.get('format') === 'xlsx') {
        const buffer = await buildXlsx(guestWorkbook(guests));
        sendFile(
          res,
          buffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          `wedding-guests-${stamp}.xlsx`,
        );
        return;
      }
      const csv = toCsv(
        GUEST_COLUMNS.map((c) => c.header),
        guestRows(guests),
      );
      sendFile(res, csv, 'text/csv; charset=utf-8', `wedding-guests-${stamp}.csv`);
    }),
  );
}

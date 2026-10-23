import { rsvpSchema, wishSchema } from '../../shared/schemas';
import { env } from '../env';
import { assertSameOrigin, parseBody, sendJson } from '../http';
import { createRateLimiter } from '../rateLimit';
import { guestsRepo } from '../repositories/guests';
import { wishesRepo } from '../repositories/wishes';
import type { Router } from '../router';

const rsvpLimiter = createRateLimiter({ name: 'rsvp', limit: 8, windowMs: 10 * 60_000 });
const wishLimiter = createRateLimiter({ name: 'wish', limit: 6, windowMs: 10 * 60_000 });

const newWishStatus = () => (env.wishesRequireApproval ? 'pending' : 'approved') as 'pending' | 'approved';

export function registerPublicRoutes(router: Router): void {
  router.get('/api/health', ({ res }) => sendJson(res, 200, { ok: true }));

  router.post('/api/rsvp', async ({ req, res, ip }) => {
    assertSameOrigin(req);
    rsvpLimiter.hit(ip);
    const input = await parseBody(req, rsvpSchema);
    // Bots fill the hidden honeypot field; pretend success and store nothing.
    if (input.website) return sendJson(res, 200, { ok: true, updated: false, wishStatus: null });

    const { guest, updated } = await guestsRepo.upsertFromRsvp(input);
    let wishStatus: string | null = null;
    if (input.message) {
      wishStatus = newWishStatus();
      await wishesRepo.create({ name: input.name, message: input.message, guestId: guest.id, status: wishStatus as 'pending' });
    }
    sendJson(res, updated ? 200 : 201, { ok: true, updated, wishStatus });
  });

  router.get('/api/wishes', async ({ res, url }) => {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 12, 1), 50);
    const before = url.searchParams.get('before') ?? undefined;
    sendJson(res, 200, await wishesRepo.listPublic(limit, before));
  });

  router.post('/api/wishes', async ({ req, res, ip }) => {
    assertSameOrigin(req);
    wishLimiter.hit(ip);
    const input = await parseBody(req, wishSchema);
    if (input.website) return sendJson(res, 201, { ok: true, status: 'pending' });
    const wish = await wishesRepo.create({ name: input.name, message: input.message, status: newWishStatus() });
    sendJson(res, 201, {
      ok: true,
      status: wish.status,
      wish: wish.status === 'approved' ? { id: wish.id, name: wish.name, message: wish.message, createdAt: wish.createdAt } : null,
    });
  });
}

import { z } from 'zod';
import { DIETARY_OPTIONS, GUEST_STATUSES, MAX_PAX_PER_RSVP, SIDES, WISH_STATUSES } from './constants';
import { PHONE_PATTERN } from './phone';

const trimmed = (max: number) => z.string().trim().max(max);

/** Public RSVP form. Field names match the form inputs. */
export const rsvpSchema = z
  .object({
    name: trimmed(80).min(2),
    phone: z.string().trim().regex(PHONE_PATTERN),
    side: z.enum(SIDES),
    attending: z.boolean(),
    pax: z.coerce.number().int().min(0).max(MAX_PAX_PER_RSVP),
    dietary: z.enum(DIETARY_OPTIONS).default('none'),
    dietaryNote: trimmed(200).default(''),
    message: trimmed(500).default(''),
    /** Honeypot: real people never fill this hidden field. */
    website: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.attending && value.pax < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pax'], message: 'At least one guest is required.' });
    }
  });
export type RsvpInput = z.infer<typeof rsvpSchema>;

export const wishSchema = z.object({
  name: trimmed(80).min(2),
  message: trimmed(500).min(3),
  website: z.string().optional(),
});
export type WishInput = z.infer<typeof wishSchema>;

const guestFields = {
  name: trimmed(120).min(1),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === '' || PHONE_PATTERN.test(v), 'Invalid phone number')
    .default(''),
  side: z.enum(SIDES),
  status: z.enum(GUEST_STATUSES).default('pending'),
  pax: z.coerce.number().int().min(0).max(50).default(1),
  dietary: z.enum(DIETARY_OPTIONS).default('none'),
  dietaryNote: trimmed(200).default(''),
  tableNumber: trimmed(20).default(''),
  notes: trimmed(500).default(''),
};

export const guestCreateSchema = z.object(guestFields);
export type GuestCreateInput = z.infer<typeof guestCreateSchema>;

export const guestUpdateSchema = z
  .object({
    name: guestFields.name,
    phone: guestFields.phone,
    side: guestFields.side,
    status: guestFields.status,
    pax: guestFields.pax,
    dietary: guestFields.dietary,
    dietaryNote: guestFields.dietaryNote,
    tableNumber: guestFields.tableNumber,
    notes: guestFields.notes,
  })
  .partial();
export type GuestUpdateInput = z.infer<typeof guestUpdateSchema>;

export const guestBulkSchema = z.object({
  guests: z.array(guestCreateSchema).min(1).max(1000),
});

const idList = z.array(z.string().min(1).max(64)).min(1).max(2000);

export const guestBulkUpdateSchema = z.object({
  ids: idList,
  patch: z
    .object({ status: z.enum(GUEST_STATUSES).optional(), tableNumber: trimmed(20).optional() })
    .refine((p) => p.status !== undefined || p.tableNumber !== undefined, 'Nothing to update'),
});

export const guestBulkDeleteSchema = z.object({ ids: idList });

export const wishUpdateSchema = z.object({ status: z.enum(WISH_STATUSES) });

export const wishBulkUpdateSchema = z.object({ ids: idList, status: z.enum(WISH_STATUSES) });
export const wishBulkDeleteSchema = z.object({ ids: idList });

export const loginSchema = z.object({ password: z.string().min(1).max(200) });

/** Flatten zod issues into { field: [messages] }. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

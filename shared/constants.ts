export const SIDES = ['groom', 'bride'] as const;
export type Side = (typeof SIDES)[number];

export const GUEST_STATUSES = ['pending', 'confirmed', 'declined'] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const WISH_STATUSES = ['pending', 'approved', 'hidden'] as const;
export type WishStatus = (typeof WISH_STATUSES)[number];

export const DIETARY_OPTIONS = [
  'none',
  'vegetarian',
  'vegan',
  'halal',
  'no_pork',
  'no_beef',
  'no_seafood',
  'other',
] as const;
export type Dietary = (typeof DIETARY_OPTIONS)[number];

/** English labels used in the admin dashboard and exports. */
export const DIETARY_LABELS: Record<Dietary, string> = {
  none: 'No restrictions',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  halal: 'Halal',
  no_pork: 'No pork',
  no_beef: 'No beef',
  no_seafood: 'No seafood',
  other: 'Other',
};

export const SIDE_LABELS: Record<Side, string> = { groom: 'Groom', bride: 'Bride' };

export const STATUS_LABELS: Record<GuestStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  declined: 'Declined',
};

export const MAX_PAX_PER_RSVP = 10;

import type { Dietary, GuestStatus, Side, WishStatus } from './constants';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  side: Side;
  status: GuestStatus;
  pax: number;
  dietary: Dietary;
  dietaryNote: string;
  tableNumber: string;
  notes: string;
  source: 'admin' | 'rsvp';
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wish {
  id: string;
  guestId: string | null;
  name: string;
  message: string;
  status: WishStatus;
  createdAt: string;
}

/** The subset of a wish that is safe to show on the public site. */
export interface PublicWish {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

export interface DashboardStats {
  guests: {
    invited: number;
    confirmed: number;
    declined: number;
    pending: number;
    confirmedPax: number;
    pendingPax: number;
    groomPax: number;
    bridePax: number;
  };
  wishes: {
    total: number;
    pending: number;
    approved: number;
    hidden: number;
  };
  recentResponses: Pick<Guest, 'id' | 'name' | 'side' | 'status' | 'pax' | 'respondedAt'>[];
}

export interface ApiError {
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

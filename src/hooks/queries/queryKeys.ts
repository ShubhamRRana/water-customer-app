import type { UserRole } from '../../types';

export const queryKeys = {
  users: {
    all: ['users'] as const,
    byRole: (role: UserRole) => ['users', 'role', role] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    /** Placeholder key when no agency is selected (query disabled). */
    idle: ['vehicles', 'agency', '_idle'] as const,
    byAgency: (agencyId: string) => ['vehicles', 'agency', agencyId] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    customer: (customerId: string) => ['bookings', 'customer', customerId] as const,
    available: (limit: number, offset: number) =>
      ['bookings', 'available', { limit, offset }] as const,
    detail: (bookingId: string) => ['booking', bookingId] as const,
  },
} as const;

/**
 * Date Serialization Utilities
 * 
 * Utilities for converting between Date objects and ISO strings.
 * Essential for database compatibility (Supabase stores dates as strings/timestamps).
 */

/**
 * Convert a Date object to ISO string for database storage
 */
export function serializeDate(date: Date | undefined | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Convert an ISO string or timestamp to Date object
 */
export function deserializeDate(dateString: string | Date | undefined | null): Date | null {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    return new Date(dateString);
  } catch {
    return null;
  }
}

/**
 * Serialize an object's date fields to ISO strings
 * Recursively processes nested objects
 */
export function serializeDates<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[]
): T {
  const serialized = { ...obj };
  for (const field of dateFields) {
    if (serialized[field] instanceof Date) {
      (serialized[field] as unknown) = serializeDate(serialized[field] as Date);
    }
  }
  return serialized;
}

/**
 * Deserialize an object's date fields from ISO strings to Date objects
 */
export function deserializeDates<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[]
): T {
  const deserialized = { ...obj };
  for (const field of dateFields) {
    if (typeof deserialized[field] === 'string') {
      const date = deserializeDate(deserialized[field] as string);
      if (date) {
        (deserialized[field] as unknown) = date;
      }
    }
  }
  return deserialized;
}

/**
 * Serialize User dates for database storage
 */
export function serializeUserDates(user: { createdAt: Date; [key: string]: unknown }): {
  createdAt: string;
  [key: string]: unknown;
} {
  return {
    ...user,
    createdAt: serializeDate(user.createdAt) || '',
    ...(user.licenseExpiry ? { licenseExpiry: serializeDate(user.licenseExpiry as Date) } : {}),
  };
}

/**
 * Deserialize User dates from database
 */
export function deserializeUserDates(user: {
  createdAt: string | Date;
  licenseExpiry?: string | Date;
  [key: string]: unknown;
}): {
  createdAt: Date;
  licenseExpiry?: Date;
  [key: string]: unknown;
} {
  const { licenseExpiry, ...rest } = user;
  return {
    ...rest,
    createdAt: deserializeDate(user.createdAt) || new Date(),
    ...(licenseExpiry ? { licenseExpiry: deserializeDate(licenseExpiry) || undefined } : {}),
  };
}

/**
 * Serialize Booking dates for database storage
 */
export function serializeBookingDates(booking: {
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
  [key: string]: unknown;
}): {
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string | null;
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  [key: string]: unknown;
} {
  return {
    ...booking,
    createdAt: serializeDate(booking.createdAt) || '',
    updatedAt: serializeDate(booking.updatedAt) || '',
    scheduledFor: serializeDate(booking.scheduledFor),
    acceptedAt: serializeDate(booking.acceptedAt),
    deliveredAt: serializeDate(booking.deliveredAt),
  };
}

/**
 * Deserialize Booking dates from database
 */
export function deserializeBookingDates(booking: {
  createdAt: string | Date;
  updatedAt: string | Date;
  scheduledFor?: string | Date | null;
  acceptedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  [key: string]: unknown;
}): {
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
  [key: string]: unknown;
} {
  return {
    ...booking,
    createdAt: deserializeDate(booking.createdAt) || new Date(),
    updatedAt: deserializeDate(booking.updatedAt) || new Date(),
    scheduledFor: booking.scheduledFor ? deserializeDate(booking.scheduledFor) || undefined : undefined,
    acceptedAt: booking.acceptedAt ? deserializeDate(booking.acceptedAt) || undefined : undefined,
    deliveredAt: booking.deliveredAt ? deserializeDate(booking.deliveredAt) || undefined : undefined,
  };
}

/**
 * Serialize Vehicle dates for database storage
 */
export function serializeVehicleDates(vehicle: {
  createdAt: Date;
  updatedAt: Date;
  insuranceExpiryDate: Date;
  [key: string]: unknown;
}): {
  createdAt: string;
  updatedAt: string;
  insuranceExpiryDate: string;
  [key: string]: unknown;
} {
  return {
    ...vehicle,
    createdAt: serializeDate(vehicle.createdAt) || '',
    updatedAt: serializeDate(vehicle.updatedAt) || '',
    insuranceExpiryDate: serializeDate(vehicle.insuranceExpiryDate) || '',
  };
}

/**
 * Deserialize Vehicle dates from database
 */
export function deserializeVehicleDates(vehicle: {
  createdAt: string | Date;
  updatedAt: string | Date;
  insuranceExpiryDate: string | Date;
  [key: string]: unknown;
}): {
  createdAt: Date;
  updatedAt: Date;
  insuranceExpiryDate: Date;
  [key: string]: unknown;
} {
  return {
    ...vehicle,
    createdAt: deserializeDate(vehicle.createdAt) || new Date(),
    updatedAt: deserializeDate(vehicle.updatedAt) || new Date(),
    insuranceExpiryDate: deserializeDate(vehicle.insuranceExpiryDate) || new Date(),
  };
}


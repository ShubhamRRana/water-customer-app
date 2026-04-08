# Subscription gating: bookings & society trips — review doc

This document captures the technical analysis for **blocking individual and society customer users** from creating **bookings** and **society trips** when they do not have an **active, paid-through subscription** (including when a subscription has **ended** and has **not been renewed**).

It is intended for product/engineering review before implementation.

---

## Goal

- Users with roles **individual** and **society** should not be able to make **any type of booking** or **create trips** until subscription terms are satisfied.
- Users should be **blocked** when the subscription has **ended** and is **not renewed** (no valid active period).

---

## What already exists

### Database: definition of “active subscription”

The Postgres function `has_active_subscription(p_user_id)` (see `migrations/024_create_subscription_tables.sql`) returns true only when there is a row in `subscriptions` such that:

- `status = 'active'`
- `end_date` is not null
- `end_date > NOW()`

Expired or unpaid / non-active subscriptions therefore evaluate as **no active subscription**.

### App: subscription check API

- `SubscriptionService.hasActiveSubscription(userId)` delegates to `dataAccess.subscriptions.hasActiveSubscription`, which calls the RPC `has_active_subscription`.
- `AuthService` can compute `hasActiveSubscription` as part of customer login (`customerSubscriptionSummary` in `src/services/auth.service.ts`), but this flag is **not** persisted on the global auth store for general UI use (only returned on auth result types where used).

---

## Gaps (current behavior)

### 1. Bookings — check is bypassed when an agency is selected

In `BookingService.createBooking` (`src/services/booking.service.ts`), subscription is enforced **only when `agencyId` is falsy**:

- The customer booking flow passes **`agencyId: selectedAgency.id`**, so the subscription block **does not run** for typical customer bookings.

**Implication:** Today, **agency-based customer bookings are not subscription-gated** in the service layer.

### 2. Database trigger — same bypass pattern

`migrations/025_add_subscription_check_to_bookings.sql` defines `validate_booking_subscription()` which **skips** validation when `NEW.agency_id IS NOT NULL`. The trigger is also **commented out** until you enable it.

**Implication:** Even after enabling the trigger **as written**, rows with `agency_id` set would **still** skip subscription validation.

### 3. Society trips — no subscription check

`SocietyTripService.createTrip` (`src/services/societyTrip.service.ts`) inserts into `society_trips` and does **not** call `hasActiveSubscription`.

**Implication:** Trip creation is **unrestricted** at the service layer.

### 4. Individual vs society

`customerAccountKind` (`'individual' | 'society'`) is used for UX and navigation; **subscription is tied to `user_id`**, not to account kind. The same gating rule can apply to both unless product defines an exception.

---

## Recommended implementation (layers)

### A. Booking service (authoritative for app)

- Enforce `SubscriptionService.hasActiveSubscription(customerId)` for **all customer self-serve bookings**, **regardless of `agencyId`**.
- If you must allow exceptions (e.g. agency-created bookings from a backend), introduce an **explicit** escape hatch (e.g. `skipSubscriptionCheck: true` only for trusted server paths), **not** “has agency id.”

### B. Society trip service

- Before insert in `createTrip`, call `hasActiveSubscription` for `input.customerId`.
- On failure, throw an error with a stable **code** (e.g. `SUBSCRIPTION_REQUIRED`) aligned with booking handling for consistent UI.

### C. UI

- On booking and add-trip flows (e.g. `BookingScreen`, `AddTripScreen`, entry points from `CustomerHomeScreen`), check subscription before submit or on screen focus.
- Show clear copy and navigation to **Subscription plans** / **My subscription** / payment.
- Optionally add `hasActiveSubscription` (or a small subscription slice) to global state, refreshed after login and when returning from payment.

### D. Database (defense in depth)

- **Either** change `validate_booking_subscription` so it does **not** skip merely because `agency_id` is set for self-serve rows, **or** add a column that distinguishes customer-app inserts from agency/backend inserts and only skip for the latter.
- When policy is finalized, **enable** the booking trigger (currently commented in `025`).
- Consider a similar policy for `society_trips` (RLS policy or trigger) so direct API abuse cannot bypass the app.

### E. Product edge cases

- **Pending payment:** `has_active_subscription` is false until the subscription row is **active** with a valid `end_date` — aligns with “block until paid” if activation happens only after successful payment.
- **Grace period after expiry:** not in current SQL; would require schema/function changes (e.g. `grace_until`) if product needs it.

---

## Related files (quick reference)

| Area | File |
|------|------|
| RPC / SQL definition | `migrations/024_create_subscription_tables.sql` (`has_active_subscription`) |
| Booking trigger (optional rollout) | `migrations/025_add_subscription_check_to_bookings.sql` |
| Booking create + subscription branch | `src/services/booking.service.ts` |
| Society trip create | `src/services/societyTrip.service.ts` |
| Subscription helpers | `src/services/subscription.service.ts` |
| Data access RPC | `src/lib/supabaseDataAccess.ts` (`hasActiveSubscription`) |
| High-level guide (may overlap) | `SUBSCRIPTION_IMPLEMENTATION_GUIDE.md` |

---

## Out of scope for this doc

- Exact copy for alerts and screens.
- Whether agency-operated booking APIs need different rules.
- Drawer/menu changes (e.g. `CustomerMenuDrawer.tsx`); this doc is about **subscription enforcement**, not navigation refactors.

---

*Generated for review — implementation should be tracked in tickets/PRs after sign-off.*

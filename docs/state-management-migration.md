# State management migration: Zustand + TanStack Query

This document describes a **low-risk, incremental** path from the current pattern (Zustand holding both **server state** and **client/global UI state**) to a clearer split:

| Layer | Responsibility |
|--------|----------------|
| **`src/services/*`** | Data access only (Supabase, parsing). No React. |
| **TanStack Query** (`@tanstack/react-query`) | Server state: fetch, cache, stale time, retries, deduplication, mutations, invalidation. |
| **Zustand** | **Cross-screen client state** only: auth/session-shaped flags, navigation helpers, UI that must survive screen changes (e.g. `showSocietySubscriptionIntro`), non-server drafts if needed. |
| **`useState` / `useReducer`** | Screen-local UI (selections, modals, form fields that do not need to be global). |

There is no “better library” than Zustand for that last bucket. The win comes from **not** using Zustand as a general-purpose remote cache.

---

## Current codebase snapshot

### Dependencies (as of this guide)

- **Zustand** is installed (`package.json`: `zustand`).
- **TanStack Query is not** installed yet; add it when you start Phase 0.

### Zustand stores today

| Store | File | Main responsibilities |
|-------|------|------------------------|
| Auth | `src/store/authStore.ts` | Session bootstrap, Supabase `onAuthStateChange`, login/register/logout, `customerAccountKind`, password recovery flags, society intro flag |
| Booking | `src/store/bookingStore.ts` | Lists, `currentBooking`, CRUD-style actions, **realtime subscription** per booking |
| User | `src/store/userStore.ts` | Admin/user lists, role fetches, CRUD, realtime subscription for all users |
| Vehicle | `src/store/vehicleStore.ts` | Agency vehicles, CRUD, realtime subscription per agency |

`src/store/index.ts` re-exports auth, booking, and user (vehicle is imported directly from `vehicleStore.ts` where needed).

### Screen-level consumers (for scoping refactors)

**`useAuthStore`**

- `src/navigation/CustomerNavigator.tsx`
- `src/screens/auth/LoginScreen.tsx`, `RegisterScreen.tsx`, `SocietyLoginScreen.tsx`
- `src/screens/customer/BookingScreen.tsx`, `CustomerHomeScreen.tsx`, `ProfileScreen.tsx`, `SavedAddressesScreen.tsx`, `OrderHistoryScreen.tsx`, `PastOrdersScreen.tsx`, `OrderTrackingScreen.tsx` (if any), `PaymentHistoryScreen.tsx`, `SubscriptionPlansScreen.tsx`, `SubscriptionStatusScreen.tsx`
- `src/screens/society/AddTripScreen.tsx`, `TripDetailsScreen.tsx`, `SubscriptionComingSoonScreen.tsx`, `SettlePaymentPlaceholderScreen.tsx`

**`useBookingStore`**

- `src/screens/customer/BookingScreen.tsx`, `CustomerHomeScreen.tsx`, `OrderHistoryScreen.tsx`, `PastOrdersScreen.tsx`, `OrderTrackingScreen.tsx`

**`useUserStore`**

- `src/screens/customer/BookingScreen.tsx`, `CustomerHomeScreen.tsx`
- `src/screens/society/AddTripScreen.tsx`

**`useVehicleStore`**

- `src/screens/customer/BookingScreen.tsx`
- `src/screens/society/AddTripScreen.tsx`

### Tests tied to stores

- `src/__tests__/store/authStore.test.ts`
- `src/__tests__/store/bookingStore.test.ts`
- `src/__tests__/store/userStore.test.ts`
- `src/__tests__/store/vehicleStore.test.ts`

Service-level tests under `src/__tests__/services/` remain the best place to validate IO boundaries during migration.

---

## Target architecture (end state)

1. **Queries** wrap `*Service` calls: e.g. `useCustomerBookingsQuery(customerId)` → `BookingService.getBookingsByCustomer`.
2. **Mutations** call services, then **`queryClient.invalidateQueries`** (or `setQueryData` for optimistic updates) so lists stay coherent.
3. **Realtime** (booking row, agency vehicles, all-users stream): keep listeners in a **small hook** or effect that updates the **query cache** (`queryClient.setQueryData`) instead of a global Zustand array.
4. **Auth**: keep a **single Zustand slice** (or a dedicated module) for “who is logged in,” loading gates, and flags that navigation needs (`showSocietySubscriptionIntro`, `needsPasswordReset`). Optionally use Query **only** for refetchable profile enrichment, not for replacing Supabase session.

---

## Migration order (lowest risk first)

### Phase 0 — Tooling only

1. Install `@tanstack/react-query` (and enable devtools in development if you want).
2. Create a **`QueryClient`** (sensible defaults: `staleTime` for lists ~30s–2m depending on how fresh you need bookings).
3. Wrap the root app (e.g. where `App` or navigation is mounted) in **`QueryClientProvider`**.
4. **No screen changes yet** — confirm the app still runs.

**Expo / React Native note:** `@tanstack/react-query` works with RN; use the same provider pattern as on web.

### Phase 1 — `useUserStore` / `useVehicleStore` (read paths)

These stores power fewer screens than booking and are mostly **fetch + list + selected entity**.

1. Introduce hooks such as `useUsersByRole(role)` and `useVehiclesByAgency(agencyId)` backed by `useQuery`.
2. Replace `fetchUsersByRole` / `fetchVehiclesByAgency` **call sites** in:
   - `BookingScreen.tsx`
   - `CustomerHomeScreen.tsx` (user paths)
   - `AddTripScreen.tsx`
3. Keep `subscribeToAllUsers` / `subscribeToAgencyVehicles` behavior initially either:
   - **Still in Zustand** until Phase 1b, or
   - Move to a **`useEffect` + `queryClient.setQueryData`** when the subscription fires.

**Exit criteria:** Those screens no longer depend on Zustand for **cached list data**; Zustand methods can be deprecated or thin wrappers during transition.

### Phase 2 — `useBookingStore` (lists + mutations, realtime last)

Order matters: **lists and mutations before realtime**, because `OrderTrackingScreen` couples subscription + `useBookingStore.subscribe`.

1. **List queries:** `fetchCustomerBookings`, `fetchAvailableBookings`, etc. → `useQuery` with keys like `['bookings', 'customer', customerId]`.
2. **Mutations:** `createBooking`, `updateBookingStatus`, `cancelBooking` → `useMutation` + invalidate relevant keys.
3. **Single booking fetch:** `getBookingById` → `useQuery` with `['booking', id]`.
4. **Realtime (`subscribeToBooking`):**
   - On mount (or when `orderId` is set), subscribe via `BookingService.subscribeToBookingUpdates`.
   - On each callback, update `['booking', bookingId]` and optionally merge into list queries.

**Exit criteria:** `OrderHistoryScreen`, `PastOrdersScreen`, `CustomerHomeScreen`, `BookingScreen` use Query; tracking screen uses Query + subscription bridge.

### Phase 3 — Auth store: narrow, don’t necessarily delete

`authStore.ts` is **highly integrated** (Supabase session, `Linking` recovery flow, `AsyncStorage` for account kind). A full rewrite is unnecessary.

Recommended end state:

- **Stay on Zustand** for: `user`, `isAuthenticated`, `isLoading`, `pendingLoginRole`, `needsPasswordReset`, `customerAccountKind`, `showSocietySubscriptionIntro`, and imperative auth methods.
- **Optional:** move **pure profile refresh** (e.g. after update) to a small `useQuery` keyed by user id **if** you want automatic refetch — keep session lifecycle in the store.

Defer moving auth until Phases 1–2 stabilize, to avoid debugging session + cache at the same time.

### Phase 4 — Cleanup

1. Remove dead Zustand state and actions whose data now lives only in React Query.
2. Update or replace `src/__tests__/store/*.test.ts`:
   - Prefer testing **hooks** with `QueryClientProvider` + `wrapper`, or
   - Rely more on **service tests** + a few integration tests.
3. Re-export pattern: optional `src/hooks/queries/*` or `src/api/queries/*` for discoverability.

---

## Query key conventions (suggested)

Use stable, hierarchical keys so invalidation stays predictable:

```text
['bookings', 'customer', customerId]
['bookings', 'available', { limit, offset }]
['booking', bookingId]
['users', 'role', role]
['vehicles', 'agency', agencyId]
['auth', 'profile', userId]   // optional, if you add profile query
```

---

## Pitfalls to avoid

1. **Duplicating source of truth** — During migration, avoid both Zustand `bookings` and React Query `bookings` updating independently. Pick one write path; use the other as a temporary shim only.
2. **Realtime + cache** — Always update the same query key the UI reads from; otherwise screens will flicker or show stale data.
3. **Global loading** — Prefer **per-query** `isPending` / `isFetching` over a single global `isLoading` in Zustand for server work (reduces coupling).
4. **Auth listener vs Query** — Do not try to “refetch session” with Query; Supabase owns session. Query should reflect **server entities**, not JWT plumbing.

---

## Summary

- **Keep Zustand** for cross-screen **client and auth-adjacent** state (your app already centralizes session and intro flags there).
- **Add TanStack Query** for **bookings, users, vehicles** (and similar remote data).
- **Migrate in phases:** provider → user/vehicle reads → booking lists/mutations → booking realtime → optional auth tightening → tests and store deletion.

This matches your existing **`services` layer** (`auth.service`, `booking.service`, etc.) and minimizes risky big-bang refactors.

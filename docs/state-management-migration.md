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
- **TanStack Query** is installed (`package.json`: `@tanstack/react-query`). Phase 0 added the provider; **no devtools** yet (optional for a later pass, e.g. Expo web only).

### Zustand stores today

| Store | File | Main responsibilities |
|-------|------|------------------------|
| Auth | `src/store/authStore.ts` | Session bootstrap, Supabase `onAuthStateChange`, login/register/logout, `customerAccountKind`, password recovery flags, society intro flag |

**Removed in Phase 4:** `bookingStore`, `userStore`, and `vehicleStore` — customer and society booking flows use **TanStack Query** + `*Service`; list/cache tests moved to hook tests (see Phase 4).

`src/store/index.ts` re-exports **`useAuthStore`** only.

### Screen-level consumers (for scoping refactors)

**`useAuthStore`**

- `src/navigation/CustomerNavigator.tsx`
- `src/screens/auth/LoginScreen.tsx`, `RegisterScreen.tsx`, `SocietyLoginScreen.tsx`
- `src/screens/customer/BookingScreen.tsx`, `CustomerHomeScreen.tsx`, `ProfileScreen.tsx`, `SavedAddressesScreen.tsx`, `OrderHistoryScreen.tsx`, `PastOrdersScreen.tsx`, `OrderTrackingScreen.tsx` (if any), `PaymentHistoryScreen.tsx`, `SubscriptionPlansScreen.tsx`, `SubscriptionStatusScreen.tsx`
- `src/screens/shared/AddTripScreen.tsx`, `TripDetailsScreen.tsx`, `SettlePaymentPlaceholderScreen.tsx`; `src/screens/society/SubscriptionComingSoonScreen.tsx`

**Server lists / bookings:** `src/hooks/queries/*` (`useCustomerBookingsQuery`, `useUsersByRoleQuery`, `useVehiclesByAgencyQuery`, mutations, realtime subscription helpers).

### Tests tied to stores and queries

- `src/__tests__/store/authStore.test.ts` — auth Zustand
- `src/hooks/queries/serverDataQueries.test.tsx` — `useUsersByRoleQuery`, `useVehiclesByAgencyQuery`, `useCustomerBookingsQuery` with `QueryClientProvider`

Service-level tests under `src/__tests__/services/` remain the primary place to validate IO boundaries.

---

## Target architecture (end state)

1. **Queries** wrap `*Service` calls: e.g. `useCustomerBookingsQuery(customerId)` → `BookingService.getBookingsByCustomer`.
2. **Mutations** call services, then **`queryClient.invalidateQueries`** (or `setQueryData` for optimistic updates) so lists stay coherent.
3. **Realtime** (booking row, agency vehicles, all-users stream): keep listeners in a **small hook** or effect that updates the **query cache** (`queryClient.setQueryData`) instead of a global Zustand array.
4. **Auth**: keep a **single Zustand slice** (or a dedicated module) for “who is logged in,” loading gates, and flags that navigation needs (`showSocietySubscriptionIntro`, `needsPasswordReset`). Optionally use Query **only** for refetchable profile enrichment, not for replacing Supabase session.

---

## Migration order (lowest risk first)

### Phase 0 — Tooling only — **done**

1. Install `@tanstack/react-query` (and enable devtools in development if you want).
2. Create a **`QueryClient`** (sensible defaults: `staleTime` for lists ~30s–2m depending on how fresh you need bookings).
3. Wrap the root app (e.g. where `App` or navigation is mounted) in **`QueryClientProvider`**.
4. **No screen changes yet** — confirm the app still runs.

**Implemented:**

- `src/lib/queryClient.ts` — `createAppQueryClient()` with default query `staleTime` 60s, `gcTime` 5m, `retry` 2.
- `App.tsx` — `QueryClientProvider` wrapping `SafeAreaProvider` and navigation (client from `useState(() => createAppQueryClient())`).

**Expo / React Native note:** `@tanstack/react-query` works with RN; use the same provider pattern as on web.
        
### Phase 1 — `useUserStore` / `useVehicleStore` (read paths) — **completed**

These stores power fewer screens than booking and are mostly **fetch + list + selected entity**.

1. Introduce hooks such as `useUsersByRole(role)` and `useVehiclesByAgency(agencyId)` backed by `useQuery`.
2. Replace `fetchUsersByRole` / `fetchVehiclesByAgency` **call sites** in:
   - `BookingScreen.tsx`
   - `CustomerHomeScreen.tsx` (user paths)
   - `src/screens/shared/AddTripScreen.tsx`
3. Keep `subscribeToAllUsers` / `subscribeToAgencyVehicles` behavior initially either:
   - **Still in Zustand** until Phase 1b, or
   - Move to a **`useEffect` + `queryClient.setQueryData`** when the subscription fires.

**Exit criteria:** Those screens no longer depend on Zustand for **cached list data**; Zustand methods can be deprecated or thin wrappers during transition.

**Implemented:**

- `src/hooks/queries/queryKeys.ts` — stable keys: `['users','role', role]`, `['vehicles','agency', agencyId]` (plus idle key when no agency).
- `src/hooks/queries/useUsersByRoleQuery.ts` — `UserService.getUsersByRole`.
- `src/hooks/queries/useVehiclesByAgencyQuery.ts` — `VehicleService.getVehiclesByAgency`, `enabled` when `agencyId` is set.
- `src/hooks/queries/index.ts` — re-exports.
- `src/screens/customer/BookingScreen.tsx` — agencies and vehicles from Query; agency change resets vehicle/price via `useEffect` on `selectedAgency?.id`.
- `src/screens/shared/AddTripScreen.tsx` — same pattern for admin list and agency vehicles.
- `src/screens/customer/CustomerHomeScreen.tsx` — bookings via Query only (Phase 4 removed residual `useUserStore` / `userError`).

**Follow-up (optional):** wire user/vehicle **realtime** subscriptions to `queryClient.setQueryData` if live admin lists are required app-wide (was never invoked from screens while stores existed).

### Phase 2 — `useBookingStore` (lists + mutations, realtime last) — **completed**

Order matters: **lists and mutations before realtime**, because `OrderTrackingScreen` originally coupled subscription with the booking store (now **Query + `useBookingRealtimeSubscription`**).

1. **List queries:** `fetchCustomerBookings`, `fetchAvailableBookings`, etc. → `useQuery` with keys like `['bookings', 'customer', customerId]`.
2. **Mutations:** `createBooking`, `updateBookingStatus`, `cancelBooking` → `useMutation` + invalidate relevant keys.
3. **Single booking fetch:** `getBookingById` → `useQuery` with `['booking', id]`.
4. **Realtime (`subscribeToBooking`):**
   - On mount (or when `orderId` is set), subscribe via `BookingService.subscribeToBookingUpdates`.
   - On each callback, update `['booking', bookingId]` and optionally merge into list queries.

**Exit criteria:** `OrderHistoryScreen`, `PastOrdersScreen`, `CustomerHomeScreen`, `BookingScreen` use Query; tracking screen uses Query + subscription bridge.

**Implemented:**

- `src/hooks/queries/queryKeys.ts` — `bookings.customer`, `bookings.detail`, `bookings.available` (key helper for future use).
- `src/hooks/queries/useCustomerBookingsQuery.ts` — `BookingService.getBookingsByCustomer`.
- `src/hooks/queries/useBookingByIdQuery.ts` — `BookingService.getBookingById`.
- `src/hooks/queries/useBookingMutations.ts` — `useCreateBookingMutation`, `useUpdateBookingStatusMutation`, `useCancelBookingMutation`.
- `src/hooks/queries/useBookingRealtimeSubscription.ts` — cache updates + list patch via `bookingQueryUtils`.
- `src/hooks/queries/bookingQueryUtils.ts` — `setBookingDetailInCache`, `patchBookingInCustomerListCache`.
- Customer screens wired: `CustomerHomeScreen`, `OrderHistoryScreen`, `PastOrdersScreen`, `BookingScreen`, `OrderTrackingScreen`.

Phase 4 removed the Zustand booking store (no remaining call sites); customer flows use React Query + mutations + realtime cache helpers only.

### Phase 3 — Auth store: narrow, don’t necessarily delete — **completed**

`authStore.ts` is **highly integrated** (Supabase session, `Linking` recovery flow, `AsyncStorage` for account kind). A full rewrite is unnecessary.

Recommended end state:

- **Stay on Zustand** for: `user`, `isAuthenticated`, `isLoading`, `pendingLoginRole`, `needsPasswordReset`, `customerAccountKind`, `showSocietySubscriptionIntro`, and imperative auth methods.
- **Optional:** move **pure profile refresh** (e.g. after update) to a small `useQuery` keyed by user id **if** you want automatic refetch — keep session lifecycle in the store.

Defer moving auth until Phases 1–2 stabilize, to avoid debugging session + cache at the same time.

**Implemented:**

- `src/hooks/queries/queryKeys.ts` — `auth.profile`, `auth.profileIdle`.
- `src/hooks/queries/useAuthProfileQuery.ts` — `AuthService.getCurrentUserData(userId)`; used on Profile with refetch on focus.
- `src/hooks/queries/authQueryUtils.ts` — `invalidateAuthProfileQueries` after profile edits.
- `src/store/authStore.ts` — Phase 3 scope documented; `refreshUserProfile()` for a light server reload (Booking flow when `user.id` was missing vs full `initializeAuth`).
- `src/screens/customer/ProfileScreen.tsx`, `SavedAddressesScreen.tsx` — profile query / invalidation wiring.
- `src/hooks/queries/index.ts` — re-exports auth query helpers.

### Phase 4 — Cleanup — **completed**

1. Remove dead Zustand state and actions whose data now lives only in React Query.
2. Update or replace `src/__tests__/store/*.test.ts`:
   - Prefer testing **hooks** with `QueryClientProvider` + `wrapper`, or
   - Rely more on **service tests** + a few integration tests.
3. Re-export pattern: optional `src/hooks/queries/*` or `src/api/queries/*` for discoverability.

**Implemented:**

- Removed `src/store/bookingStore.ts`, `userStore.ts`, `vehicleStore.ts` and deleted `bookingStore` / `userStore` / `vehicleStore` store tests (no production imports after Phases 1–2).
- `src/store/index.ts` exports **`useAuthStore`** only.
- `src/screens/customer/CustomerHomeScreen.tsx` — error UI uses bookings query only (no `useUserStore`).
- `src/hooks/queries/serverDataQueries.test.tsx` — Jest + `QueryClientProvider` coverage for list queries (`jest.mock` paths align with `../../services/*` so real services / Supabase are not loaded).
- Discoverability: **`src/hooks/queries/index.ts`** remains the barrel for query hooks and helpers.

---

## Query key conventions (suggested)

Use stable, hierarchical keys so invalidation stays predictable:

```text
['bookings', 'customer', customerId]
['bookings', 'available', { limit, offset }]
['booking', bookingId]
['users', 'role', role]
['vehicles', 'agency', agencyId]
['auth', 'profile', userId]   // optional profile query (Phase 3)
```

---

## Pitfalls to avoid

1. **Duplicating source of truth** — After Phase 4, **bookings / user lists / vehicles** should not be mirrored in Zustand; use Query cache + `*Service` as the single remote source.
2. **Realtime + cache** — Always update the same query key the UI reads from; otherwise screens will flicker or show stale data.
3. **Global loading** — Prefer **per-query** `isPending` / `isFetching` over a single global `isLoading` in Zustand for server work (reduces coupling).
4. **Auth listener vs Query** — Do not try to “refetch session” with Query; Supabase owns session. Query should reflect **server entities**, not JWT plumbing.

---

## Summary

- **Keep Zustand** for cross-screen **client and auth-adjacent** state (your app already centralizes session and intro flags there).
- **Add TanStack Query** for **bookings, users, vehicles** (and similar remote data).
- **Migrate in phases:** Phases 0–4 are complete: provider, user/vehicle/booking queries, auth profile query boundaries, Zustand cleanup, and hook-based tests for server list queries.

This matches your existing **`services` layer** (`auth.service`, `booking.service`, etc.) and minimizes risky big-bang refactors.

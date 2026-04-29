# UI unification & reuse plan (review draft)

## Execution order

**Do this work only after** you have implemented [`state-management-migration.md`](./state-management-migration.md) through **Phase 4 (Cleanup)** (or at minimum through **Phase 2 (booking lists + mutations + realtime)** if you accept some Zustand cleanup still pending—prefer finishing **Phase 4** before large UI extractions on booking-heavy screens).

- **First:** State migration Phases **0 → 4** per the other doc (Query provider → user/vehicle reads → booking + realtime → auth narrowing optional → cleanup).
- **Then:** **UI Phase 1 → 5** in this document.

That order keeps **one source of truth** for server data while you reshape screens and shared layouts; reflowing JSX is much safer when lists and mutations already read from React Query.

It reflects your priorities:

1. **Duplicated UI** is the main pain.
2. **Customer and society are one product**, not two separate apps.
3. You want **common screens and patterns** shared across roles.
4. **State** should stay aligned with [`state-management-migration.md`](./state-management-migration.md).
5. **Performance**: practical wins where they are cheap; no big-bang perf project.
6. **Tests**: protect **critical flows** only during refactors.

---

## Current baseline (facts from the repo)

- **Navigation**: Society flows already live on the same stack as individuals: `MainNavigator.tsx` registers `AddTrip`, `TripDetails`, `SettlePaymentPlaceholder`, etc., alongside other routes. Types live in `AppStackParamList` (`rootNavigation.ts`). The stack serves **mixed-role** end users (individual + society).
- **Shared primitives**: `src/components/common/` exports `Button`, `Input`, `Card`, `Typography`, `LoadingSpinner`, `CustomerMenuDrawer`, `ErrorBoundary`, etc.
- **Duplication hotspots** (candidates for extraction):
  - **Auth cluster**: `LoginScreen`, `SocietyLoginScreen`, `RegisterScreen`, `RoleSelectionScreen` repeat `SafeAreaView` + `KeyboardAvoidingView`, watermark background pattern, back row, header (title + subtitle), and `Card`-wrapped forms.
  - **In-app headers**: Patterns like `SafeAreaView` → row with **menu** + title + subtitle + optional right action appear on screens such as `CustomerHomeScreen` and `TripDetailsScreen` (and likely others)—similar structure, different copy and actions.
  - **Loading / empty states**: Full-screen spinner + message is repeated (e.g. trip details loading branch vs other screens).
- **State**: Zustand holds server-shaped data today; the migration doc recommends **TanStack Query for remote lists/entities** and **narrow Zustand** for auth and cross-screen client flags. UI unification should **not** fight that split—prefer presentational shells and hooks that can call either stores or queries during transition.

---

## Goals

| Goal | Success looks like |
|------|---------------------|
| **Less duplicated UI** | One auth layout, one primary app shell (header + content + optional menu), reused list/empty/error patterns where they repeat. |
| **One mental model** | Folder names and navigator types reflect “main app” + role, not “customer app with society smuggled in.” |
| **Safe refactors** | Extract components first; change navigation names/types in a dedicated, grep-friendly step; keep booking/login/payment flows green under existing critical tests. |
| **Aligned with data layer** | New shared screens/hooks assume **services** as the IO boundary; they consume Zustand and/or React Query per the migration phases—**no second source of truth** for server data. |

---

## Proposed building blocks (UI layer)

**When:** Apply these after state migration so screens already follow the Query/Zustand split from [`state-management-migration.md`](./state-management-migration.md).

Order is intentional: **layouts and atoms before** moving files or renaming navigators (**UI 4 / UI 5**).

### 1. Auth screen shell (`AuthScreenLayout` or similar) — **implemented (Phase 1)**

- **`AuthScreenLayout`** (`src/components/layouts/AuthScreenLayout.tsx`): `SafeAreaView`, `KeyboardAvoidingView`, watermark layer (`watermarkIcon` prop), `ScrollView` with `keyboardShouldPersistTaps` + shared `contentContainerStyle`.
- **API**: `title`, `subtitle`, `backLabel`, `onBack`, optional `bottomNotice`, `children` (form `Card`, footer links, etc.).
- **Adopted**: `LoginScreen`, `SocietyLoginScreen`. **Next candidates**: `RegisterScreen`, `RoleSelectionScreen`.

### 2. Main app shell (`AppScreenHeader`) — **implemented (Phase 2)**

- **`AppScreenHeader`** (`src/components/layouts/AppScreenHeader.tsx`): shared in-app header row — left `menu` or `back`, center title + subtitle (optional `subtitleFirst` for greeting-first layouts), optional `right` action; **`AppScreenHeaderTrailingSpacer`** for balanced alignment when there is no action.
- **Tokens**: `UI_CONFIG.appScreenHeader` in `constants/config.ts` (padding, left button hit area, trailing min width).
- **Adopted**: `CustomerHomeScreen`, `TripDetailsScreen`, `OrderHistoryScreen`.

### 3. Standard async UI states — **implemented (Phase 3)**

- **`ScreenLoading`**, **`ScreenError`**, **`ScreenEmpty`** (`src/components/common/`): shared full-screen and embedded empty patterns; align copy with query `isPending` / list empty states.
- **`useRefreshControl`** (`src/hooks/useRefreshControl.ts`): shared `refreshing` + `onRefresh` for pull-to-refresh with optional `onError`.
- **Adopted** on primary customer/society screens that duplicated spinners (home, orders, trip details, tracking, booking, profile, saved addresses, payment flow, subscription/payment history).

### 4. Folder and naming (after shells exist) — **implemented (Phase 4)**

- **`src/screens/shared/`**: cross-role stack screens — **Add trip**, **trip details**, **settle payment** (`AddTripScreen`, `TripDetailsScreen`, `SettlePaymentPlaceholderScreen`). Society-only screens remain under **`src/screens/society/`** (e.g. subscription intro).
- **`src/components/layouts/`**: `AuthScreenLayout`, `AppScreenHeader` (see UI 1–2).
- **Navigator rename** (**UI 5** — done): `CustomerNavigator` → `MainNavigator`, `CustomerStackParamList` → `AppStackParamList`; root stack screen `Customer` → `Main` in `RootStackParamList`.

---

## Relationship to [`state-management-migration.md`](./state-management-migration.md)

| Principle | How UI work respects it (after migration) |
|-----------|---------------------------------------------|
| **Services own IO** | Shared screens use **services** and **query/mutation hooks**; layout components stay dumb where possible. |
| **Query vs Zustand** | UI shells (`AppScreenLayout`, list rows) consume **React Query** for server lists; Zustand only for auth and cross-screen client flags per the migration doc. |
| **Prerequisite** | Start UI Phase 1 **after** state migration so you are not rewriting duplicate Zustand + Query wiring inside new layout components. |
| **Realtime** | Booking/trip UI reads from the **query cache** updated by the subscription bridge—shared screens must not reintroduce a parallel store cache. |

**Sequencing**: **No parallel UI rollout** with migration Phases 0–2 for booking-heavy surfaces unless you accept extra churn; your plan is **migration first, then UI phases below**.

---

## Performance (pragmatic, optional)

These are **low-risk follow-ups** after structure is clearer—not prerequisites.

- **Lists**: For long booking/trip lists, consider `FlashList` (or ensure `FlatList` with stable `keyExtractor` and memoized row component). Profile before swapping.
- **Zustand subscriptions**: Prefer **narrow selectors** (`useStore(s => s.x)`) so shared shells do not re-render on unrelated store changes.
- **Heavy screens**: Split `TripDetailsScreen`-style files into **header + list + modals** subcomponents so React can skip work when only one section updates.

Defer image bundling, Hermes tuning, etc. until profiling shows need.

---

## Testing strategy (critical flows only)

Align test investment with **user-visible guarantees**:

- **Auth**: sign-in / role selection (existing auth tests + `App.test` / navigation tests as you already maintain).
- **Booking or trip**: one path that exercises **create or update** and **navigation** after your refactors.
- **Payment**: keep the flow covered if you touch payment-adjacent screens.

When extracting layouts, add **component tests** only where logic remains (e.g. conditional header actions)—not a snapshot for every screen.

---

## Phased rollout (after state migration)

Complete [`state-management-migration.md`](./state-management-migration.md) first. Then run these **UI phases** in order.

| UI phase | Scope | Exit criteria |
|----------|--------|----------------|
| **UI 1** ✅ **completed** | `AuthScreenLayout` + adopt on `LoginScreen` + `SocietyLoginScreen` | `AuthScreenLayout` in `src/components/layouts/`; scroll/back/header/watermark/bottom-notice shell shared; form logic unchanged; navigation test passes. |
| **UI 2** ✅ **completed** | `AppScreenHeader` + adopt on `CustomerHome`, `TripDetails`, `OrderHistory` | Shared header + `UI_CONFIG.appScreenHeader`; menu/back + title/subtitle + optional trailing action; duplicate header blocks removed on adopted screens. |
| **UI 3** ✅ **completed** | `ScreenLoading` / `ScreenError` / `ScreenEmpty` where repeated | Consistent UX; fewer one-off spinners; loading states align with **query** `isPending` / `isFetching` where applicable. |
| **UI 4** ✅ **completed** | Move shared screens under `screens/shared/` + update imports | `AddTrip`, `TripDetails`, `SettlePaymentPlaceholder` live in `src/screens/shared/`; imports and navigation tests updated; README + docs paths updated. |
| **UI 5** ✅ **completed** | Rename `CustomerNavigator` / `CustomerStackParamList` / root `Customer` route | `MainNavigator.tsx`, `AppStackParamList`, root key `Main`; tests and docs aligned. |

**Note:** **UI 5** was completed in a focused pass after UI 1–4; future stack changes should still avoid mixing with large store/query refactors in one diff.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Big-bang rename** of navigator/types | **UI 5** shipped in one pass; future renames should likewise stay isolated. |
| **Two sources of truth** for data during Query migration | Follow migration doc: shim Zustand → Query, then delete duplicate state. |
| **Society vs customer menu items** | Keep a single drawer component with **route list by role** or `customerAccountKind` (already in auth store)—do not fork drawers per folder. |

---

## Open decisions for you

1. **Folder name**: Prefer `screens/shared/`, `screens/app/`, or keep society under `screens/society/` with only **components** shared?
2. **Navigator rename:** Done for this app — main stack is `MainNavigator`, param list is `AppStackParamList`, root route is `Main`.
3. **Auth watermark**: Should it be **one** reusable pattern (icon prop) or removed for simplicity?
4. **Menu**: Should society admins use the **same** `CustomerMenuDrawer` with different items, or **one** `AppMenuDrawer` rename?

Once you confirm these, implementation follows **UI 1 → UI 2 → …** with small PRs **after** state migration.

---

## Summary

- **First:** Finish [`state-management-migration.md`](./state-management-migration.md) (through Phase 4 when possible).
- **Then:** Run **UI 1 → UI 5** here—extract **auth layout**, then **main app header**, then async primitives, then **shared screen folder** (UI 4 — done), then navigator/type renames (**UI 5** — done).
- Treat **customer + society as one stack** (already true in code); **UI 5** renames navigator, param list type, and root route for clarity.
- Add **performance** tweaks only where lists or mega-components justify them; protect **critical flows** in tests as you go.

Use **UI 1** as the first UI milestone once server state and cleanup match the migration doc; **UI 5** is done (see Phase 5 status below).

**Phase 1 status:** Completed — shared auth shell is in place for login flows; extend `AuthScreenLayout` to remaining auth screens when ready (**UI 1** optional follow-up).

**Phase 2 status:** Completed — `AppScreenHeader` and `appScreenHeader` tokens added; `CustomerHomeScreen`, `TripDetailsScreen`, and `OrderHistoryScreen` use the shared header; menu and trip selection header actions unchanged in behavior.

**Phase 3 status:** Completed — `ScreenLoading`, `ScreenError`, and `ScreenEmpty` live under `src/components/common/`; `useRefreshControl` wraps pull-to-refresh on bookings home/history and trip details; adoption sweeps the main duplicated loading/error/empty patterns above.

**Phase 4 status:** Completed — trip logging, trip details, and settlement placeholder screens moved to `src/screens/shared/`; `MainNavigator` (formerly `CustomerNavigator`) and `navigation.test.tsx` import from the new paths; README Project Structure and `state-management-migration.md` consumer paths updated.

**Phase 5 status:** Completed — `MainNavigator` (`src/navigation/MainNavigator.tsx`), `AppStackParamList`, and root stack route `Main` replace `CustomerNavigator`, `CustomerStackParamList`, and `Customer`; screen types import from `rootNavigation`; navigation and App tests updated; README/doc references to the navigator file updated.

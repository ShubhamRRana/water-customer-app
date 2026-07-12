# Evidence — WTC customer app

## Structural
- 144 interactive elements across 47 files / 14,247 LOC. Highest single screen: `ProfileScreen.tsx` (11), highest single file overall: `TripDetailsScreen.tsx` (12).
- Max nesting depth: 8 levels on `ProfileScreen.tsx` and `BookingScreen.tsx` (`SafeAreaView > KeyboardAvoidingView > ScrollView > ... > Typography`), 10 levels in a `TripDetailsScreen.tsx` modal branch.
- Reuse is real for containers: `Card` (45+ uses), `Button` (20 screens), `AppScreenHeader` (6 screens).
- Reuse is broken for one meaningful affordance: the booking **status badge** is independently reimplemented 3×  (`CustomerHomeScreen.tsx:101,193,455`, `OrderHistoryScreen.tsx:147,313,545`, `OrderTrackingScreen.tsx:281,496`) instead of one shared component — same colored-pill-by-status pattern, three separate `getStatusColor` functions.
- 7 confirmed dead imports (`BookingScreen.tsx:28`, `AddTripScreen.tsx:27`, `VerifyEmailScreen.tsx:2`, `TankerSelectionModal.tsx:9`, `ErrorBoundary.tsx:3`, `LoadingSpinner.tsx:3`, `AuthScreenLayout.tsx:14`).

## Visual / tokens (INFERRED, source-only)
- A design-token file exists (`config.ts:145-152` spacing 6-step scale, `config.ts:159-166` fontSize 6-step scale) but is bypassed almost everywhere: 22 distinct hardcoded spacing values found in practice (vs. 6 tokens), 146 of 157 fontSize declarations are raw literals rather than token references (12 distinct sizes vs. 6 tokens).
- Color usage is mostly token-based, but 9 hardcoded hex/rgba values leak in for overlays and status tints instead of reusing `colors.overlay*` / `colors.error/warning/success`.
- Contrast: `textSecondary #64748b` on `background #eef0f4` (light theme) ≈ 4.23:1 — **fails WCAG AA (4.5:1)** for normal text. Other pairs checked pass.
- State coverage is inconsistent screen-to-screen: `ProfileScreen`/`BookingScreen`/`OrderHistoryScreen` have loading/error/success/disabled but no visible focus state anywhere audited; `PastOrdersScreen` has no loading state and a bespoke (non-shared) empty state, despite `ScreenLoading`/`ScreenEmpty`/`ScreenError` shared components existing in `src/components/common/`.

## Copy & honesty
- No inflated marketing language found (no "unlimited/best/guaranteed" etc.).
- No dark patterns found: no forced continuity, no fake scarcity, no confirmshaming in cancel/delete flows. Delete-account and cancel-subscription copy is neutral and direct.
- One real label→behavior mismatch: `SubscriptionStatusScreen.tsx:214` shows "Renews / ends on {date}" but `subscription.service.ts:238-242` confirms there is **no auto-renewal** — a customer could read "Renews" as automatic when it always requires a manual Razorpay checkout.
- Raw enum values surfaced as UI copy: subscription status (`SubscriptionStatusScreen.tsx:173`, e.g. "PENDING", "PAUSED") and payment status (`PaymentHistoryScreen.tsx:109,206`, e.g. "processing") shown verbatim instead of translated to plain language.

## Weight & friction (ESTIMATED, source-only)
- Dependency count reasonable (33 deps), no duplicate heavy libraries (no moment/lodash).
- Initial paint is fully blocked on custom font load with no fallback: `App.tsx:101-103` `if (!fontsLoaded) return null` — blank screen until a font file loads.
- Home screen fires 2–3 sequential (not parallel) network calls on mount (`CustomerHomeScreen.tsx:220`, `SubscriptionExpiryBanner.tsx:70,76` — two awaited calls in series, not `Promise.all`).
- Bookings list is re-sorted synchronously on every render, unmemoized (`CustomerHomeScreen.tsx:290-304`).
- No idle/continuous animation on the primary screen path (menu-drawer animation is user-triggered only).
- `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled` is never checked anywhere in `src/` — 0 matches.
- Dark mode exists and is properly wired end-to-end (`themeStore.ts`, `App.tsx`).

## Accessibility
- Roughly half of ~95 touchables across the audited screens have **zero** `accessibilityLabel`/`accessibilityRole` — including entire screens: `BookingScreen`, `ProfileScreen`, `SavedAddressesScreen`, `OrderHistoryScreen`, `OrderTrackingScreen`, `PastOrdersScreen`, and every auth screen except partial coverage. The shared `Button.tsx:129-134` component itself never sets an explicit accessibility label/role.
- Coverage is concentrated in a few places: `TripDetailsScreen.tsx`, `AppScreenHeader.tsx`, `Card.tsx`, some subscription screens.
- `accessibilityRole="header"` appears **0 times** in the entire codebase — screen readers have no way to navigate by heading anywhere in the app.
- No `onFocus`/focus-visible styling found on any `TextInput` sampled — matches the Visual agent's "focus state missing" finding.
- Long lists (`OrderHistoryScreen` via `FlatList`, `PastOrdersScreen` via month/year filter) have no pagination or jump controls — screen-reader users must swipe linearly through the full filtered set.

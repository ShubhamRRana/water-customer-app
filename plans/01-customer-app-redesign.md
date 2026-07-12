# Plan: WTC customer app — consistency redesign

Source: Dieter Rams audit (`DESIGN-IS-2026-07-12/`, verdict REDESIGN, 13/30). This is a **client-only** redesign — no screen map changes, no backend/Edge Function changes (`supabase/functions/` is shared with driver/agency apps — do not touch). Each phase below is self-contained and can run in a fresh session.

Non-goals: navigation/IA restructuring, new screens, backend changes, anything under `supabase/functions/`.

---

## Phase 0: Documentation discovery (reference — already completed)

**Allowed APIs, confirmed by direct file read (not assumed):**

- `Card` (`src/components/common/Card.tsx:13-20,78`) — props `children, style?, onPress?, padding?('small'|'medium'|'large'), accessibilityLabel?, accessibilityRole?('button'|'link'|'none')`. **Gap:** accessibility props only apply when `onPress` is set (renders `TouchableOpacity`); the plain `View` branch (no `onPress`) gets neither.
- `Button` (`src/components/common/Button.tsx:14-22,95-103,129-134`) — props `title, onPress, variant?, size?, disabled?, loading?, style?`. `disabled` already wired to `TouchableOpacity` (`disabled={disabled || loading}`, line 132). **Gap:** no `accessibilityLabel`/`accessibilityRole`/`accessibilityState` on the component or its `TouchableOpacity`.
- `AppScreenHeader` (`src/components/layouts/AppScreenHeader.tsx:11-24,191`) — `left: {type:'menu'|'back', onPress, accessibilityLabel?}`, `title, subtitle?, subtitleFirst?, centerTitle?, right?, style?`. Left button already gets `accessibilityRole="button"` internally. **Gap:** `title` is rendered as plain `Typography`, no `accessibilityRole="header"` anywhere.
- `ScreenLoading` (`src/components/common/ScreenLoading.tsx:7-11,56`) — `message?, size?, fill?`.
- `ScreenEmpty` (`src/components/common/ScreenEmpty.tsx:9-16,86`) — `icon(required), title(required), message?, compact?, actionLabel?, onAction?`.
- `ScreenError` (`src/components/common/ScreenError.tsx:8-13,66`) — `message(required), title?, onRetry?, retryLabel?`.
- `Typography` (`src/components/common/Typography.tsx:7-10,67`) — extends RN `TextProps` (spreads `{...props}` at line 61), so `accessibilityRole="header"` already works if passed by the caller — no component change needed, only call-site changes.
- `UI_CONFIG` (`src/constants/config.ts:138-176`): `spacing {xs:4,sm:8,md:16,lg:24,xl:32,xxl:40}`, `fontSize {xs:12,sm:14,md:16,lg:18,xl:20,xxl:24}`, `borderRadius {sm:4,md:10,lg:14,xl:20}`. Runtime colors come from `useThemeColors()`, not `UI_CONFIG.colors`.
- `BookingStatus` type: `src/types/index.ts:79` — `'pending'|'accepted'|'in_transit'|'delivered'|'cancelled'`.
- `SubscriptionStatus` type: `src/types/subscription.types.ts:5-10` — `'pending'|'active'|'expired'|'cancelled'|'paused'`.
- `PaymentTransactionStatus` type: `src/types/subscription.types.ts:12-18` — `'pending'|'processing'|'success'|'failed'|'refunded'|'cancelled'`.
- `SubscriptionService.renewSubscription` (`src/services/subscription.service.ts:240-244`) — **always throws**, confirming there is no auto-renewal path; renewal is a brand-new checkout only.

**Anti-patterns to avoid:** don't invent `accessibilityState`/`onFocus` props that aren't documented above without adding them to the component first; don't assume `UI_CONFIG.colors` is live theme data (it isn't — use `useThemeColors()`).

---

## Phase 1: Fix the honesty bug (SubscriptionStatusScreen + PaymentHistoryScreen)

**What to implement:**
1. `src/screens/customer/SubscriptionStatusScreen.tsx:214` — replace `Renews / ends on {date}` with copy that doesn't imply auto-renewal, e.g. `Access ends on {date} — renew manually to keep it.` The gating condition (`sub?.endDate && isActive && !isTrialActive`, line 212) stays the same.
2. `SubscriptionStatusScreen.tsx:173` — replace raw `sub.status.toUpperCase()` with a small label map for `SubscriptionStatus` ('pending'→"Waiting for payment", 'active'→"Active", 'expired'→"Expired", 'cancelled'→"Cancelled", 'paused'→"Paused"). Put the map as a local `const` in this file (single use site — no shared util needed, YAGNI).
3. `src/screens/customer/PaymentHistoryScreen.tsx:109,206` — replace raw `tx.status` display with an equivalent local label map for `PaymentTransactionStatus` ('pending'→"Pending", 'processing'→"Processing", 'success'→"Successful", 'failed'→"Failed", 'refunded'→"Refunded", 'cancelled'→"Cancelled").

**Docs references:** types at `subscription.types.ts:5-10,12-18`; throw-confirmation at `subscription.service.ts:240-244`.

**Verification:**
- `grep -n "toUpperCase()" src/screens/customer/SubscriptionStatusScreen.tsx` should no longer show the raw status render.
- `grep -n "tx.status" src/screens/customer/PaymentHistoryScreen.tsx` should show it passed through the new label map, not rendered directly.
- Manually re-read the "Renews / ends on" replacement line and confirm it does not use the word "Renews" unqualified.

**Anti-pattern guards:** do not add an auto-renewal feature to make the old copy true — the fix is copy-only, since `renewSubscription` intentionally always throws (that's correct product behavior, not a bug to "fix" by implementing auto-billing).

---

## Phase 2: Accessibility — labels, roles, headers

**What to implement:**
1. `src/components/common/Button.tsx` — add `accessibilityLabel?: string` and `accessibilityRole?: string` to `ButtonProps` (default role `"button"`), pass through to the `TouchableOpacity` at lines 129-134, falling back to `title` as the label when `accessibilityLabel` isn't given.
2. `src/components/common/Card.tsx` — when `onPress` is set (the `TouchableOpacity` branch), no change needed (already supported). No accessibility props needed on the plain `View` branch — it's not interactive.
3. `src/components/layouts/AppScreenHeader.tsx` — add `accessibilityRole="header"` to the `title` `Typography` render (no prop change needed on `Typography` itself, since it already spreads `TextProps` — just pass the prop at the render site inside `AppScreenHeader`).
4. Add `accessibilityLabel`/`accessibilityRole="button"` to every bare `TouchableOpacity` missing one, using the file:line list already collected:
   - `PastOrdersScreen.tsx:158-164` (menu), `:173-179` (download)
   - `OrderHistoryScreen.tsx:243-245` (clear search), `:258-288` (filter, in map), `:364-370` (cancel)
   - `BookingScreen.tsx:471-473` (back), `:546-553` (saved address)
   - `ProfileScreen.tsx:362-376,378-388,390-400,403-413,427-439,588-598,614-624`
   - Auth screens flagged in the original audit: `LoginScreen.tsx:237,250,276`, `RegisterScreen.tsx` touchables, `RoleSelectionScreen.tsx`, `SetNewPasswordScreen.tsx`, `SocietyLoginScreen.tsx`, `VerifyEmailScreen.tsx`
   - `SavedAddressesScreen.tsx:245,287,297,304`
   - `DateTimeInput.tsx:217,238,259,262,293,296`

**Docs references:** existing labeled examples to copy the pattern from — `TripDetailsScreen.tsx:479-480` (`accessibilityLabel="Delete trip"`), `AppScreenHeader.tsx:109-110,121-122`.

**Verification:**
- `grep -rn "accessibilityLabel" src/components/common/Button.tsx` shows the new prop.
- `grep -c "TouchableOpacity" <file>` vs `grep -c "accessibilityLabel" <file>` per fixed file — counts should match (every touchable has a label).
- `grep -rn "accessibilityRole=.header." src/` should go from 0 to ≥1 (every screen using `AppScreenHeader` gets it for free once the header component change lands).

**Anti-pattern guards:** don't add `accessible={true}` blindly to wrapper `View`s around already-labeled children — that can hide child labels from screen readers. Label the actual interactive element, not its container.

---

## Phase 3: Consolidate the status badge into one shared component

**What to implement:**
Confirmed identical color-per-status logic across all three current implementations (pending→warning, accepted→accent, in_transit→secondary, delivered→success, cancelled→error, default→textSecondary — verified byte-identical in `CustomerHomeScreen.tsx:193-208` and `OrderTrackingScreen.tsx:281-296`, same table in `OrderHistoryScreen.tsx:147-156`). Presentation differs — build one component with a `variant` prop instead of forcing one layout:

1. New file `src/components/customer/StatusBadge.tsx`:
   - `getStatusColor(status: BookingStatus, colors: ThemeColors)` — the shared color table (copy from `CustomerHomeScreen.tsx:193-208`, it's the canonical version).
   - `variant?: 'pill' | 'pill-icon' | 'avatar'` (default `'pill'`):
     - `'pill'` reproduces `CustomerHomeScreen.tsx:455-459` markup (no icon).
     - `'pill-icon'` reproduces `OrderHistoryScreen.tsx:313-321` markup (adds `Ionicons`, row layout, needs a `getStatusIcon` passed in or colocated).
     - `'avatar'` reproduces `OrderTrackingScreen.tsx:496-499` markup (64px circle, larger icon, text rendered by the caller as today — this variant only renders the circle, not the accompanying text, to match current separation of concerns).
2. Replace the three call sites (`CustomerHomeScreen.tsx:455-459`, `OrderHistoryScreen.tsx:313-321`, `OrderTrackingScreen.tsx:496-499`) with `<StatusBadge status={...} variant="..." />`.
3. Delete the three now-duplicate `getStatusColor` functions (`CustomerHomeScreen.tsx:193-208`, `OrderHistoryScreen.tsx:147-156`, `OrderTrackingScreen.tsx:281-296`) and their now-unused `statusBadge`/`statusIconContainer` style entries if fully replaced by the shared component's internal styles.

**Docs references:** exact current markup/styles captured above for each of the three screens — copy verbatim into the variants, don't redesign the pixel output in this phase (that's Phase 4/5's job if states/tokens change it).

**Verification:**
- `grep -rn "getStatusColor" src/screens/customer/` should return 0 matches (all removed) plus however many remain inside `StatusBadge.tsx` itself (1).
- Visually diff (or screenshot-compare if a dev client is available) each of the three screens before/after — pill color-per-status must be unchanged.
- `npx tsc --noEmit` — `BookingStatus` typing must still resolve at all three call sites.

**Anti-pattern guards:** don't try to unify `'pill-icon'` and `'avatar'` into one universal render path — the audit found them structurally different (row pill vs. 64px circle with external text) and forcing one shape would be a visual regression, not a simplification.

---

## Phase 4: Fill in missing states (Phase 8 "thorough" gap)

Worst-scoring screen first, per the audit's "score worst" rule.

**PastOrdersScreen.tsx** (currently: no loading, bespoke non-shared empty text, no success/disabled/focus):
1. Add `<ScreenLoading message="Loading past orders..." />` gated on the query's `isLoading`, matching the pattern already used in `OrderHistoryScreen.tsx:206-212`.
2. Replace the inline empty text (`:262-266`) with `<ScreenEmpty icon="receipt-outline" title="No orders in {month} {year}" />`, matching `OrderTrackingScreen.tsx:469`'s usage pattern.
3. Add `disabled` handling to `menuButton`/`downloadButton` while their async actions (export/logout) are in flight, mirroring `ProfileScreen.tsx:366` (`disabled={isDeleting}`).

**OrderHistoryScreen.tsx** (has loading/empty already; missing error UI, disabled on cancel, focus on search):
1. Add `<ScreenError>` for the query error path (currently only `Alert.alert` on refresh error, line 54-55) — same pattern as `ProfileScreen.tsx:278`.
2. Add `disabled={cancelBookingMutation.isPending}` to the cancel button (`:364-370`) — the pending flag already exists per the audit, it's just not wired to the button.

**BookingScreen.tsx** (has loading/disabled already; missing inline error UI, focus on address input):
1. Errors currently only surface via `Alert.alert` (multiple lines) — leave as-is where they're transient/action-triggered (that's an acceptable pattern per Rams #5 unobtrusive, an alert doesn't need to become a permanent inline error). No change required here beyond what Phase 1-3 already cover, to avoid scope creep.

**ProfileScreen.tsx** (has loading/error already; missing focus styling, disabled has no visual change):
1. Add focus-visible border styling to the three `TextInput`s (`:480-496,511-529,544-562`) via `onFocus`/`onBlur` toggling a style, matching the existing error-border pattern already present in the same inputs (reuse the same border-color mechanism, just triggered by focus instead of error).

**Docs references:** `ScreenLoading`/`ScreenEmpty`/`ScreenError` props from Phase 0; existing usage examples cited per-screen above.

**Verification:**
- Per screen, confirm via grep that `ScreenLoading`/`ScreenEmpty`/`ScreenError` imports now exist where previously absent.
- Re-run the Phase 8 states checklist from the audit (`01-evidence.md`) against each of the four screens — all six states should now be present or explicitly non-applicable (e.g. BookingScreen intentionally keeps transient alerts, noted above).

**Anti-pattern guards:** don't add a `disabled` visual treatment that changes existing button colors/tokens — that's Phase 5's job; keep this phase to "state exists" not "state is on-brand."

---

## Phase 5: Token adoption (Phase 3 "aesthetic" gap)

**What to implement:** for each hardcoded spacing/fontSize literal listed in the audit for `PastOrdersScreen.tsx`, `OrderHistoryScreen.tsx`, `BookingScreen.tsx`, `ProfileScreen.tsx` (full file:line list already captured in Phase 0 discovery above), replace the literal with the nearest `UI_CONFIG.spacing.*` / `UI_CONFIG.fontSize.*` token.

Rule for ambiguous values: round to the nearest existing token (e.g. `paddingHorizontal:10` → `UI_CONFIG.spacing.sm` (8) is a 2px deviation, acceptable). If a literal is genuinely load-bearing and >25% off from the nearest token (e.g. `fontSize:28` sits between `xl`(20) and `xxl`(24) but is 17% above `xxl` — still round to `xxl`; a case like `paddingBottom:96` in `AuthScreenLayout.tsx:89` is 2.4× `xxl`(40) and should be flagged for manual design review rather than silently rounded), do not silently change it — leave a `// TODO: token gap, needs design input` comment and flag it in the phase's own summary rather than guessing.

**Do NOT** add new steps to the `UI_CONFIG.spacing`/`fontSize` scale in this phase — the audit's point is that the existing 6-step scale is fine and simply unused; expanding it to fit every current literal would defeat the purpose (that's exactly the "no visible system" failure mode, just relabeled).

**Docs references:** `UI_CONFIG` full definition at `config.ts:138-176` (Phase 0); full literal list per screen already captured above.

**Verification:**
- Per screen, `grep -n "fontSize: [0-9]" <file>` and `grep -n "(padding|margin|gap).*: [0-9]" <file>` should return 0 raw-number matches once done (all replaced with `UI_CONFIG.spacing.*`/`UI_CONFIG.fontSize.*` references).
- Any flagged >25%-deviation literals should appear in a short list in the PR description, not silently resolved.

**Anti-pattern guards:** don't introduce a second parallel spacing system (e.g. a new `styles/tokens.ts`) — route everything through the existing `UI_CONFIG`.

---

## Phase 6: Environmental — reduced motion + first paint

**What to implement:**
1. `src/components/common/MenuDrawer.tsx` — wrap the `Animated.parallel([...]).start()` calls (lines 223-234 enter, 236-247 exit) so that when `AccessibilityInfo.isReduceMotionEnabled()` resolves `true`, `duration` is set to `0` instead of `260`/`220` (check once on mount via `useEffect` + `AccessibilityInfo.isReduceMotionEnabled()`, store in state, no need for the `AccessibilityInfo.addEventListener` live-update case — YAGNI, a user toggling the OS setting mid-session while the drawer is open is not worth the extra listener).
2. `App.tsx:100-103` — replace `if (!fontsLoaded) return null;` with a minimal splash view (a plain `View` with the app's background color, or `expo-splash-screen`'s existing behavior if already configured) instead of returning `null` — check first whether `expo-splash-screen` is already a dependency and controlling this via `SplashScreen.preventAutoHideAsync()`before adding a custom component (ladder rung: use what's already there before writing new UI).

**Docs references:** exact current code at `MenuDrawer.tsx:223-234,236-247`, `App.tsx:100-106`.

**Verification:**
- `grep -n "AccessibilityInfo" src/components/common/MenuDrawer.tsx` shows the new import/usage.
- `grep -rn "AccessibilityInfo\|reduceMotion" src/` goes from 0 to ≥1 match.
- Confirm `App.tsx` no longer returns a bare `null` — either a splash view or existing splash-screen API call, whichever is already available.

**Anti-pattern guards:** don't add a full custom splash-screen library if `expo-splash-screen` (Expo's own, already likely present given the Expo SDK version) already covers this — check `package.json` first.

---

## Phase 7: Cleanup — dead imports

**What to implement:** remove the 7 confirmed unused imports:
- `BookingScreen.tsx:28` — `UI_CONFIG` (only if truly unused after Phase 5 — Phase 5 will likely reintroduce a real `UI_CONFIG` import here, so re-check before deleting)
- `AddTripScreen.tsx:27` — `UI_CONFIG` (same caveat)
- `VerifyEmailScreen.tsx:2` — `View`
- `TankerSelectionModal.tsx:9` — `PricingUtils`
- `ErrorBoundary.tsx:3` — `ErrorSeverity`
- `LoadingSpinner.tsx:3` — `UI_CONFIG`
- `AuthScreenLayout.tsx:14` — `UI_CONFIG` (same caveat)

**Verification:** `npx expo lint` (or `npm run lint`) should show no unused-import warnings for these 7 files; `npx tsc --noEmit` should still pass.

**Anti-pattern guards:** re-check `BookingScreen.tsx`, `AddTripScreen.tsx`, `AuthScreenLayout.tsx` for `UI_CONFIG` usage *after* Phase 5 lands, since token adoption will likely make these imports live again — don't delete-then-re-add.

---

## Final Phase: Verification

1. `npx tsc --noEmit` — zero new errors introduced (baseline already has pre-existing errors per project memory; compare error count before/after, don't chase pre-existing ones).
2. `npm run lint` — zero new warnings in touched files.
3. `npm run test:release` — must still pass (release-focused suite; project memory notes a pre-existing broken baseline of 26 suites/65 tests unrelated to this work — gate on "no NEW failures", not on 100% green).
4. Re-grep the audit's original findings to confirm each is resolved:
   - `grep -rn "toUpperCase()" src/screens/customer/SubscriptionStatusScreen.tsx` (Phase 1)
   - `grep -c "accessibilityLabel" src/components/common/Button.tsx` ≥1 (Phase 2)
   - `grep -rn "getStatusColor" src/screens/customer/` → only inside `StatusBadge.tsx` (Phase 3)
   - Re-run the six-state checklist per screen (Phase 4)
   - `grep -n "fontSize: [0-9]" src/screens/customer/{PastOrdersScreen,OrderHistoryScreen,BookingScreen,ProfileScreen}.tsx` → 0 matches (Phase 5)
   - `grep -rn "AccessibilityInfo" src/` ≥1 (Phase 6)
   - `npx expo lint` clean on the 7 files (Phase 7)
5. If a dev client is available, manually walk the booking flow and the profile/subscription screens to confirm no visual regression on the status badges (Phase 3) or token-adopted spacing (Phase 5).

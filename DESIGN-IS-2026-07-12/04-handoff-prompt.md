```
/make-plan Redesign the WTC customer app (React Native/Expo, E:\water-customer-app). Current design failed audit at 13/30 with critical gaps in principles #3 (aesthetic) and #8 (thorough), scored 0 each.

Verdict paragraph (quoted from 03-verdict.md):
> The WTC customer app has the right functional bones (a real token file, real shared components for cards/buttons/loading/empty/error states, a working booking→tracking→delivery flow, honest copy with no dark patterns) but almost none of that infrastructure is consistently used — tokens are bypassed at ~90% of usage sites, shared state components are adopted inconsistently screen-to-screen, the same status-badge affordance is reimplemented three separate times, and half the touchable surface has no accessibility label — so the fix is a systemic redesign pass that makes the existing good infrastructure mandatory, not a scattered patch pass.

Why redesign and not refine: Total score is 13/30, well below the 20-point REFINE threshold, and two principles scored 0 (#3 aesthetic, #8 thorough) — the gap is systemic non-adoption of existing infrastructure across nearly every screen, not a handful of isolated rough edges.

Preserve from current design (do not throw away):
- The design-token file `src/constants/config.ts:145-166` (UI_CONFIG.spacing, UI_CONFIG.fontSize) — the scale itself is fine, adoption is the problem.
- Shared components: `Card` (`src/components/common/Card.tsx`), `Button` (`src/components/common/Button.tsx`), `AppScreenHeader` (`src/components/layouts/AppScreenHeader.tsx`), and the state trio `ScreenLoading`/`ScreenEmpty`/`ScreenError` (`src/components/common/`).
- The booking→tracking→delivery flow structure and its honest, non-manipulative copy style (no dark patterns found anywhere in cancel/delete/renewal flows).
- Dark mode implementation (`src/store/themeStore.ts`) — fully wired and correctly honored end-to-end.

Discard (structural patterns causing the failures):
- Ad hoc inline spacing/fontSize/color literals in StyleSheets instead of `UI_CONFIG` tokens. Evidence: 22 distinct hardcoded spacing values and 146/157 raw fontSize declarations found across `src/screens/` and `src/components/`. Caused failure on principle #3 (aesthetic).
- Per-screen reimplementation of shared states instead of using `ScreenLoading`/`ScreenEmpty`/`ScreenError` uniformly. Evidence: `PastOrdersScreen.tsx` has no loading state, a bespoke non-shared empty state, and no success/disabled/focus states — 4 of 6 states missing. Caused failure on principle #8 (thorough).
- Independent per-screen status-badge logic instead of one shared component. Evidence: `CustomerHomeScreen.tsx:101,193,455`, `OrderHistoryScreen.tsx:147,313,545`, `OrderTrackingScreen.tsx:281,496` each define their own `getStatusColor` and badge markup. Caused failure on principle #10 (as little design as possible).

Top 5 moves from the audit (verbatim):
1. #8 Thorough / #3 Aesthetic: Make ScreenLoading/ScreenEmpty/ScreenError and UI_CONFIG tokens the only way to build these states and layouts (lint rule or review gate). Evidence: PastOrdersScreen.tsx skips all three shared state components; 146/157 fontSize declarations and 22 spacing values bypass config.ts:145-166 entirely.
2. #4 Understandable / #6 Honest: Fix SubscriptionStatusScreen.tsx:214 ("Renews / ends on {date}") to state plainly that renewal is manual, since subscription.service.ts:238-242 confirms no auto-renewal exists; replace raw status enums ("PENDING", "processing") at SubscriptionStatusScreen.tsx:173 and PaymentHistoryScreen.tsx:109,206 with plain-language labels.
3. #2 Useful / #4 Understandable (accessibility): Add accessibilityLabel/accessibilityRole to the shared Button.tsx:129-134 and every bare TouchableOpacity missing one across BookingScreen, ProfileScreen, SavedAddressesScreen, OrderHistoryScreen, OrderTrackingScreen, PastOrdersScreen, and auth screens (~half of ~95 touchables). Add accessibilityRole="header" to every screen title — currently zero occurrences app-wide.
4. #10 As little design as possible: Consolidate the three independent status-badge implementations (CustomerHomeScreen.tsx:101,193,455, OrderHistoryScreen.tsx:147,313,545, OrderTrackingScreen.tsx:281,496) into one shared StatusBadge component; remove the 7 confirmed dead imports (BookingScreen.tsx:28, AddTripScreen.tsx:27, VerifyEmailScreen.tsx:2, TankerSelectionModal.tsx:9, ErrorBoundary.tsx:3, LoadingSpinner.tsx:3, AuthScreenLayout.tsx:14).
5. #9 Environmentally friendly: Add a prefers-reduced-motion / AccessibilityInfo.isReduceMotionEnabled check (currently zero references in src/) and gate MenuDrawer.tsx's animation on it; replace App.tsx:101-103's blank-screen font-load gate with a lightweight splash/skeleton so first paint isn't a blank frame.

Redesign principles in priority order:
1. #3 Aesthetic — every screen visibly draws its spacing, type, and color from one enforced token source; zero ad hoc literals in new/touched files.
2. #8 Thorough — every screen that fetches or mutates data has all six states (empty, loading, error, success, focus, disabled) via the shared components, no exceptions.
3. #4 Understandable — every subscription/payment/status label matches actual system behavior 1:1, and every screen exposes heading semantics for screen readers.

Deliverables for the plan:
- New information architecture is NOT required here — the existing screen map (7 auth screens, 16 customer/society screens per README.md) is sound; this redesign is about consistent execution against it, not restructuring navigation.
- New primary flow (low-fi, labeled) showing the booking flow and subscription flow with all six states designed per screen, compared to current (missing-state) behavior.
- A single enforced states checklist (empty, loading, error, success, focus, disabled) applied screen-by-screen, starting with PastOrdersScreen, OrderHistoryScreen, BookingScreen, ProfileScreen.
- A token-adoption migration list: every StyleSheet with hardcoded spacing/fontSize/color literals, converted to UI_CONFIG references, screen by screen.
- An accessibility remediation list: every touchable missing accessibilityLabel/Role, plus header-role additions, screen by screen.
- Migration path: this is a client-only, non-backend-touching redesign (do not modify supabase/functions or shared booking Edge Functions — they're used by driver/agency apps too) — safe to land incrementally screen-by-screen with no data migration required.
- Cutover criteria: a screen is "done" when it draws only from UI_CONFIG tokens, implements all six states via shared components, and every touchable has an accessibility label/role.

Anti-patterns to guard against (specific to REDESIGN):
- Porting the old ad hoc spacing/fontSize values forward under a new visual skin instead of actually routing through UI_CONFIG.
- Keeping the three duplicated status-badge implementations "for now" instead of consolidating.
- Redesigning to chase a visual trend rather than fixing the token-adoption and state-coverage gaps identified above.
- Treating the Preserve list as optional — Card, Button, AppScreenHeader, the ScreenLoading/Empty/Error trio, the token file, and the dark-mode implementation must survive this pass intact.
```

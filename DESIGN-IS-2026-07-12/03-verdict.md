# Verdict: REDESIGN

**Total score: 13/30**, with two principles scoring 0 (#3 aesthetic, #8 thorough). Per the mechanical rule (total < 20 → REDESIGN), this is a redesign regardless of which individual principles hit zero — the app's visual system and state-handling are not consistently applied, not merely rough in a couple of spots.

**One-sentence verdict:** The WTC customer app has the right functional bones (a real token file, real shared components for cards/buttons/loading/empty/error states, a working booking→tracking→delivery flow, honest copy with no dark patterns) but almost none of that infrastructure is consistently *used* — tokens are bypassed at ~90% of usage sites, shared state components are adopted inconsistently screen-to-screen, the same status-badge affordance is reimplemented three separate times, and half the touchable surface has no accessibility label — so the fix is a systemic redesign pass that makes the existing good infrastructure mandatory, not a scattered patch pass.

## Top 5 highest-leverage moves

1. **#8 Thorough / #3 Aesthetic** — Make `ScreenLoading` / `ScreenEmpty` / `ScreenError` and the `UI_CONFIG` spacing/type tokens the *only* way to build these states and layouts (lint rule or code review gate, not just availability). Evidence: `PastOrdersScreen.tsx` skips all three shared state components; 146/157 fontSize declarations and 22 spacing values bypass `config.ts:145-166` entirely.

2. **#4 Understandable / #6 Honest** — Fix `SubscriptionStatusScreen.tsx:214` ("Renews / ends on {date}") to state plainly that renewal is manual, since `subscription.service.ts:238-242` confirms no auto-renewal exists; replace raw status enums ("PENDING", "processing") at `SubscriptionStatusScreen.tsx:173` and `PaymentHistoryScreen.tsx:109,206` with plain-language labels.

3. **#2 Useful / #4 Understandable (accessibility)** — Add `accessibilityLabel`/`accessibilityRole` to the shared `Button.tsx:129-134` and to every bare `TouchableOpacity` currently missing one across `BookingScreen`, `ProfileScreen`, `SavedAddressesScreen`, `OrderHistoryScreen`, `OrderTrackingScreen`, `PastOrdersScreen`, and the auth screens (roughly half of ~95 touchables). Add `accessibilityRole="header"` to every screen title — currently zero occurrences app-wide.

4. **#10 As little design as possible** — Consolidate the three independent status-badge implementations (`CustomerHomeScreen.tsx:101,193,455`, `OrderHistoryScreen.tsx:147,313,545`, `OrderTrackingScreen.tsx:281,496`) into one shared `StatusBadge` component; remove the 7 confirmed dead imports.

5. **#9 Environmentally friendly** — Add a `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled` check (currently zero references in `src/`) and gate the `MenuDrawer.tsx` animation on it; replace `App.tsx:101-103`'s blank-screen font-load gate with a lightweight splash/skeleton so first paint isn't a blank frame.

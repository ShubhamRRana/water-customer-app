# Scorecard

1. Good design is innovative — Score: 1/3
   Evidence: Standard RN card/list/form patterns throughout (Card ×45+, Button ×20 screens) — competent but not novel.
   Justification: Imitates established mobile-app conventions with no evidenced improvement on them.

2. Good design makes a product useful — Score: 2/3
   Evidence: 01-evidence.md Structural + Accessibility — core booking/tracking flow completes without decoys, but ~half of touchables across Booking/Profile/SavedAddresses/OrderHistory/OrderTracking/PastOrders/auth screens have no accessibility label, so screen-reader users hit real detours completing the same primary task.
   Justification: Task is directly supported for most users but not for a meaningful subset (assistive-tech users) — "adjacent surface adds steps," not full breakage.

3. Good design is aesthetic — Score: 0/3
   Evidence: 01-evidence.md Visual — a 6-step spacing/type token file exists (`config.ts:145-166`) but 22 distinct hardcoded spacing values and 146/157 fontSize declarations bypass it entirely; 9 hardcoded colors leak in alongside token usage.
   Justification: The token system is defined but not functionally in force across ~90%+ of usage sites — this is "no visible system in practice," not a handful of inconsistencies.

4. Good design makes a product understandable — Score: 1/3
   Evidence: 01-evidence.md Copy & Honesty + Accessibility — `SubscriptionStatusScreen.tsx:214` ("Renews / ends on") contradicts the actual no-auto-renewal behavior (`subscription.service.ts:238-242`); raw status enums surfaced as copy (`SubscriptionStatusScreen.tsx:173`, `PaymentHistoryScreen.tsx:109,206`); zero `accessibilityRole="header"` anywhere in the app removes structural orientation for screen-reader users.
   Justification: More than jargon alone — a load-bearing billing-behavior claim is actively wrong, plus systemic absence of heading semantics.

5. Good design is unobtrusive — Score: 2/3
   Evidence: 01-evidence.md Structural — deep nesting (8–10 levels) is structural wrapping, not decoration; no evidence of visual noise or competing ornament.
   Justification: Chrome is quiet by default evidence, but inconsistent token usage (see #3) means occasional visual inconsistency could read as noise — short of a clean 3.

6. Good design is honest — Score: 2/3
   Evidence: 01-evidence.md Copy & Honesty — no inflated marketing language, no dark patterns in cancel/delete flows; one real claim/behavior mismatch on subscription renewal wording.
   Justification: Single minor mismatch, not a manipulative dark pattern — matches the "≤1 minor inflation" tier.

7. Good design is long-lasting — Score: 2/3
   Evidence: No gradients, skeuomorphism, or fad typography found in any evidence stream; standard card/list idiom.
   Justification: No dated markers evidenced, but full visual read wasn't possible without a live render — tie-breaker keeps this below 3.

8. Good design is thorough down to the last detail — Score: 0/3
   Evidence: 01-evidence.md Visual — `PastOrdersScreen.tsx` is missing loading, success, focus, and disabled states (4 of 6) despite shared `ScreenLoading`/`ScreenEmpty`/`ScreenError` components already existing in `src/components/common/`; no screen in the sample has a focus state.
   Justification: Scoring the worst instance per the rubric's "score worst, not mean" rule — 4+ missing states = 0.

9. Good design is environmentally friendly — Score: 2/3
   Evidence: 01-evidence.md Weight & Friction — no idle/continuous animation, dark mode fully honored, but `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled` has zero references anywhere in `src/`.
   Justification: Two of the three checkable criteria pass cleanly; the explicit reduced-motion requirement for a 3 is entirely absent, capping the score at 2.

10. Good design is as little design as possible — Score: 1/3
    Evidence: 01-evidence.md Structural — the booking-status badge is independently reimplemented 3× (`CustomerHomeScreen.tsx:101,193,455`, `OrderHistoryScreen.tsx:147,313,545`, `OrderTrackingScreen.tsx:281,496`) instead of one shared component; 7 confirmed dead imports; 8–10 level nesting depth.
    Justification: More than "≤2 removable elements" (duplicated affordance + 7 dead imports = 3-5 removable/simplifiable items), but not decoration-dominated overall.

**Total: 13/30**

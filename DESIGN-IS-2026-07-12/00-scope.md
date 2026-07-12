# Scope

**Audited:** The full WTC customer-facing app (React Native / Expo), as mapped from README.md in the prior step: 7 auth screens (`src/screens/auth/`) + 16 customer/society screens (`src/screens/customer/`, `src/screens/shared/`, `src/screens/society/`), reachable via `AuthNavigator` and `MainNavigator`.

**Input materials:** Static repo only. No running dev server / no Expo dev client available in this session (Razorpay native module means Expo Go can't be used anyway). Visual Evidence subagent works from source (StyleSheet objects, theme tokens, component JSX) and marks findings `INFERRED` rather than measured from a rendered screenshot.

**Primary user:** A residential (individual) or housing-society (society) customer ordering water tanker deliveries and managing a subscription that gates booking access.

**Primary task:** (a) Create and track a booking to delivery, and (b) keep a subscription active — these are the two tasks the whole app exists to serve; everything else (profile, addresses, payment history) is support tooling around them.

**Constraints:**
- Stack: React Native 0.81 / Expo SDK 54, TypeScript, React Navigation v6, Zustand, React Query, Supabase.
- Booking Edge Functions and driver/agency apps share this backend — audit is scoped to this client's UI/UX only, not backend logic.
- Known pre-existing baseline: test suite already has 26 failing suites / 65 failing tests unrelated to this audit (see project memory) — not treated as a design signal.
- No design system doc found in repo; tokens (if any) live in `themeStore` / `constants`.

**Reference designs / competitors:** None supplied by user.

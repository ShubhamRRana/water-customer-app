# Production readiness (security, Play Console, Supabase)

This document supports release sign-off for **water-customer-app**. Keep it updated when policies or infrastructure change.

## Client secrets and CI

- Run `npm run secrets:check` before shipping. It fails if forbidden patterns (e.g. service role or PhonePe client secret) appear under `src/`.
- Production Android builds should use **EAS secrets** / environment for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, not a developer-only `.env`.

## Supabase (live project) — security advisors snapshot

Run **Database → Advisors** in the Supabase dashboard after migrations, or use the Management API. Known items to track:

| Severity | Topic | Notes |
|----------|--------|--------|
| WARN | `function_search_path_mutable` | Several functions should set `search_path` (see [lint 0011](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)). |
| WARN | `rls_policy_always_true` | `contact_submissions` (anon INSERT), `driver_applications` (INSERT) — confirm product intent; tighten if inserts should be restricted. |
| WARN | `auth_leaked_password_protection` | Enable **Leaked password protection** under Auth settings ([docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). |

Edge Functions `initiate-payment` and `verify-payment` require a valid **Bearer JWT** via `getUserFromRequest` (`supabase/functions/_shared/supabase.ts`). Payment callback uses PhonePe server-to-server flow and does not expose user tokens in the client.

## Subscription enforcement (DB + app)

- Migration `026_enforce_subscription_bookings_and_society_trips.sql` enables triggers on `bookings` and `society_trips` so inserts require `has_active_subscription(customer_id)`.
- App services: `BookingService.createBooking` (optional `skipSubscriptionCheck` for trusted backends only) and `SocietyTripService.createTrip`.

## Google Play Console (manual)

1. **Data safety** — Declare data collected (account, location if used, photos if used, payment metadata). Link an accurate **Privacy policy** URL.
2. **Permissions** — For each sensitive permission (location, camera, storage), provide in-app rationale consistent with the declaration.
3. **Release pipeline** — Upload an **AAB** from a release EAS build; use **internal testing** first; open **Pre-launch report** and fix crashes / ANRs.
4. **Leaked password / auth** — Align app password rules with Play policies; Supabase leaked-password protection complements this on the backend.

## Automated checks before tag

- `npm run secrets:check`
- `npm run lint`
- `npm run test:release` (subscription-gated booking + society trip service tests; full `npm test` still has legacy failures)
- `npx expo-doctor`
- `npm audit` (triage; use `npm audit fix` when safe)

Combined: `npm run prebuild:check`

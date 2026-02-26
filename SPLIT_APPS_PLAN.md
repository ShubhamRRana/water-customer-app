# Splitting into two apps: Customer / (Admin + Driver)

Date: 2026-02-24

## Summary

Google Play requires separate apps for different role-based experiences. We'll produce:
- Customer app — customer-only features (booking, payments, tracking).
- Admin+Driver app — admin dashboard + driver workflows.

Both apps use the same backend and database with minimal schema changes (role flags / profiles). This document describes recommended approaches, implementation steps, CI/CD, Play Store considerations, and a rollout checklist.

## High-level options (pick one)

You indicated you want two different repositories. This document is updated to recommend that setup.

1. Two separate repos (recommended)
   - `water-customer-app` — customer mobile app repo (customer-only features).
   - `water-admin-driver-app` — admin + driver mobile app repo (dashboard + driver workflows).
   - Shared code strategies:
     - Shared packages repo (preferred): create a separate `water-shared` repo containing versioned packages (e.g., `@water/ui`, `@water/api`, `@water/utils`) that are published to a private registry (npm/GitHub Packages) or consumed via git subtrees/submodules.
     - Alternative: publish shared code as private packages or use a package registry and semantic versioning.
   - Pros: clear ownership, isolated CI/CD, per-app release schedules, easier Play Store compliance.
   - Cons: extra work to version and publish shared packages; need a syncing strategy for breaking changes.

Recommendation: Two repos + a versioned shared-packages repo. This gives clear separation for store listings and release cadence while keeping code reuse manageable.

## Project structure (example for two-repo approach)

- water-customer-app/ (repo)
  - src/, package.json, app.config.js, eas.json, README
  - CI pipeline builds and publishes customer APK/AAB
- water-admin-driver-app/ (repo)
  - src/, package.json, app.config.js, eas.json, README
  - CI pipeline builds and publishes admin+driver APK/AAB
- water-shared/ (repo) — versioned packages
  - packages/ui
  - packages/api
  - packages/utils
  - package.json (workspace/monorepo for the shared packages)

Consume shared packages by:
- Installing from private package registry (recommended).
- Or using git subtree/submodule (simple but requires manual syncing).

This structure keeps app repos lightweight and lets you release shared updates independently via semantic versioning.

## Implementation details (Expo / React Native)

- App identities:
  - Customer app -> android.package: `com.yourorg.watercustomer`, iOS bundle: `com.yourorg.watercustomer`
  - AdminDriver app -> android.package: `com.yourorg.wateradmin`, iOS bundle: `com.yourorg.wateradmindriver`
- Expo / EAS approach:
  - Use `app.config.js` to read an env var (e.g. APP_VARIANT) and set `name`, `slug`, `android.package`, `ios.bundleIdentifier`, icons, and `extra` accordingly.
  - Use `eas.json` build profiles per app (`build.customer`, `build.adminDriver`) with appropriate environment variables and secrets.
- Bare RN approach:
  - Android: `productFlavors` for `customer` and `adminDriver`.
  - iOS: multiple targets/schemes with different bundle IDs and Info.plist entries.
- Conditional code:
  - At runtime, use `process.env.APP_VARIANT` or a compile-time constant to include/exclude feature modules.
  - Avoid large admin libraries in the customer build via conditional imports or separate entry points.

## Routing & UX

- Separate entry points:
  - Customer app's navigator only mounts customer screens.
  - AdminDriver app mounts admin and driver navigators; show role-select or deep-link into specific flows.
- Role gating:
  - Server-side: enforce policies (preferred).
  - Client-side: hide or disable UI not allowed for the signed-in role to avoid confusion.

## Authentication & Authorization

- Single identity provider (same supabase/auth or custom auth).
- Include `role` claim in JWT (e.g., `role: customer | driver | admin`).
- Backend checks role on each protected endpoint (never rely on client-only checks).
- On login:
  - For Customer app: reject or sign-out tokens with non-customer roles (or show message instructing install of Admin app).
  - For AdminDriver app: allow admin and driver sign-ins. If a customer signs in, show a message directing them to the Customer app.

## Database & Backend changes (minimal)

- Users table: add/ensure `role` column and optional `driver_profile` / `admin_profile` tables.
- JWT/Session: include `role` in token claims.
- Row-Level Security (RLS): create policies that check JWT role to allow/disallow queries/mutations.
- Migration plan:
  - Create `role` column (nullable), backfill based on existing data, then make non-nullable.
  - Add `driver_profile` table for driver metadata (vehicle, license).
  - Ensure indexes for queries used by drivers/admins.

I'll wait for the "minor DB changes" you mentioned and I can add exact migration SQL.

## API design considerations

- Expose same endpoints; enforce role checks server-side.
- For driver-specific endpoints (accept-job, update-location), ensure driver tokens only.
- For admin operations (manage-fares, view-reports), ensure admin-only privileges.
- Version your API if you need to introduce breaking changes during rollout.

## Play Store & App Store checklist

- Unique package / bundle identifiers for each app.
- Unique icon, display name, and store listing to avoid policy flags.
- Separate privacy policy entries if needed; ensure one privacy policy covering shared backend is fine.
- App signing keys:
  - Use separate keys for each store entry OR same key (both allowed) — ensure you control the key and upload it in Play Console.
- Unique Firebase/analytics project or separate measurement IDs to isolate analytics if desired.
- Store listing assets: screenshots matching each app's flows.

## CI/CD (EAS / Fastlane / Play Console)

- Setup EAS profiles and secrets for both apps.
- CI pipeline:
  1. Run tests (unit, lint, e2e).
  2. Build both variants using respective profiles.
  3. Upload to Play Console tracks (internal -> alpha -> production) using fastlane or `eas submit`.
- Use environment secrets for API keys, supabase keys, and keystore files.

## Size & dependency pruning

- Keep admin/dashboard heavy libs out of customer bundle:
  - Use separate entry points so Metro bundles only the used modules.
  - For shared code, keep UI generic and lightweight.
- If using Expo, prebuild/managed build's size impact is limited; still exclude admin-only screens from the customer entry.

## Deep links, push notifications & onboarding

- Deep links: keep same deep link domain but distinguish by package when needed. Configure intents/URL schemes per app.
- Push notifications: register separate FCM keys if you want separation; otherwise include role in push payloads.
- Onboarding: if a user installs the wrong app, sign-in flow should detect role and show a clear message with links to correct store entry.

## Testing & QA

- Unit & integration tests for shared modules.
- E2E test suites per app variant (customer flows, driver flows, admin flows).
- Smoke tests in CI: build and run minimal app automation to verify start and auth.

## Rollout plan (suggested)

1. Prepare codebase: add build targets + app configs (1–2 days).
2. Backend updates + migrations (1 day small, 2–3 days if complex).
3. Internal builds and QA (2–4 days).
4. Internal testing track deployment (Play internal).
5. Gradual rollout to production.

Total: ~1–2 weeks depending on resources and DB complexity.

## Monitoring & Alerts

- Keep same logs/metrics backend but partition by app variant.
- Create alerts for permission violations (e.g., driver endpoint accessed by customer).

## Security notes

- Enforce server-side role checks with RLS and JWT claims.
- Revoke old tokens if migrating roles schema.
- Limit sensitive admin endpoints to admin tokens and IPs if possible.

## Checklist (actionable)

- [ ] Decide repo layout: two repos (customer, admin-driver) + shared-packages repo
- [ ] Create `water-shared` repo and publish initial packages (or choose git-subtree/submodule strategy)
- [ ] Add app repos with unique package IDs and app metadata
- [ ] Configure per-repo EAS / build profiles and secrets
- [ ] Add `role` claim and RLS policies on backend
- [ ] Create driver_profile/admin_profile tables (if needed)
- [ ] Update sign-in flows to detect wrong-app installs and show links to correct store entry
- [ ] Prepare store assets and privacy entries for each app
- [ ] Setup CI/CD per repo to build and submit artifacts
- [ ] QA and e2e for both apps

## Next steps

1. Confirm shared package distribution strategy (private registry vs git-subtree/submodule) so I can draft versioning and publish steps.
2. Share the exact DB changes you mentioned and I will draft migration SQL and update RLS policy examples.


# Monitoring & Alerts Plan

## Goals
- Catch regressions in auth, bookings, realtime, and DB performance early.
- Surface security anomalies (brute force, unauthorized access, role escalation).
- Keep client health visible (session restore, channel stability, rate-limit denials).

## Pillars
- **Supabase observability**: API/Postgres logs, realtime health, replication lag, slow queries.
- **App error monitoring**: send `errorLogger` events to an external tracker with severity/context.
- **Security monitoring**: forward `securityLogger` events and define anomaly rules.
- **Client health signals**: heartbeats, subscription status, and rate-limit outcomes.
- **Runbook & dashboards**: shared views + actions per alert.

## Supabase Observability
- Enable API/Postgres log retention; set alerts on:
  - Auth failure spikes; RLS policy denials.
  - Query latency/timeouts; lock/contention events.
  - Realtime channel error/disconnect rate; replication slot lag.
- Slow query threshold: start at 500ms; refine from live profiles.

## App Error Monitoring
- Wire `errorLogger.reportToService` to a provider (Sentry/Bugsnag/Logflare):
  - Payload: message, stack, severity, context (userId, role, screen, operation).
  - Add release/app version and device info tags.
- Track rates by route/screen and by role to spot systemic issues.

## Security Monitoring
- Forward `securityLogger` events externally; key signals:
  - Login failures, brute force, unauthorized access attempts, role escalation attempts.
  - Rate-limit exceeded, suspicious patterns, bulk data export.
- Anomaly rules (initial):
  - ≥5 login failures per user in 15m → warning; ≥10 → critical.
  - ≥3 unauthorized access attempts per user in 10m.
  - Registration failures spike >3x baseline in 30m.

## Client Health
- Heartbeats: app start and Supabase session restore success/failure.
- Realtime: reconnect count, last successful sync; alert if stale >5m.
- Rate limiter: emit when denying; aggregate by action (login, register, booking_create).

## Dashboards (initial widgets)
- Auth funnel: success vs failure by role; top error codes.
- Policy denials and booking CRUD errors by role.
- Realtime stability: disconnects, retries, stale subscriptions.
- DB performance: slow queries top N, lock waits, replication lag.
- Security: counts by event type; anomaly hits.
- Client errors: error rate by app version/device; top screens causing errors.

## Alerting Defaults
- **Critical**: auth outage, DB down/lagging, replication lag >60s, realtime disconnect storm, brute force/role-escalation anomaly.
- **High**: latency >500ms sustained 5m, policy denials spike, registration failure spike, stale subscriptions >5m.
- **Medium**: error rate up 2x baseline, rate-limit denials spike.
- **Channel**: Slack/Email; include runbook link and graph snapshot.

## Runbook Hooks (to add to README/runbook)
- What’s monitored, thresholds, alert channels.
- Per-alert actions: where to check logs/dashboards, how to roll back/mitigate.
- Escalation: who to page, how to silence noisy alerts safely.

## Implementation Steps (sequenced)
1) Pick provider (Sentry/Bugsnag/Logflare) and add minimal reporter in `errorLogger.reportToService`.
2) Forward `securityLogger` events to same provider (tags: eventType, severity, userRole).
3) Add client heartbeats + subscription health logs; bucket by app version.
4) Configure Supabase alerts (auth failures, RLS denies, slow queries, replication lag, realtime errors).
5) Build dashboards (auth, DB perf, realtime, security, client errors).
6) Document runbook section and owners.

## Open Decisions
- Provider choice and alert channel (Slack vs Email).
- Final latency/threshold numbers after observing baseline.



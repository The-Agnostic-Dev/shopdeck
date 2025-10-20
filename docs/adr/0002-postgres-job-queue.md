# ADR 0002: Background jobs in Postgres, not Redis

- Status: accepted
- Date: 2025-09-22
- Deciders: Chinedu Okeke, Wanjiru Kamau

## Context

We need to send emails and SMS without holding up requests, build CSV exports that take a few seconds, and run a few schedules (low-stock sweep, refund reconciliation). We already run Postgres and nothing else. The volume is small: a few thousand jobs a day.

## Decision

A `jobs` table and a small worker loop (`api/src/jobs`). Workers claim due jobs with `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)`, so several workers can share the table. Jobs are enqueued inside the same transaction as the change that causes them, so a rolled-back order change does not send an email.

The worker runs inside the API process by default (`RUN_WORKER=inline`) and as its own container in production.

## Consequences

- One less service to run and back up.
- Handlers must be safe to run again: a worker can die after doing the work but before marking the job done, and failed jobs are retried.
- Polling every 500 ms is fine at our size; revisit if the table grows past a few million rows (add a cleanup job first).

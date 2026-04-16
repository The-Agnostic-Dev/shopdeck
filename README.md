# Shopdeck

Shopdeck is the back office for [Ọjà Fresh](https://ojafresh.ng), our online grocery and household store in Lagos. The ops team uses it to run the day: confirm and pick orders, handle substitutions and refunds, keep stock levels right, manage discount codes and delivery slots, and look after customers. The storefront and the rider app are separate repos; they share this Postgres database.

## Architecture

One repo, two npm workspaces. `api/` is a Node 22 service built on [Hono](https://hono.dev) with [Drizzle ORM](https://orm.drizzle.team) on Postgres. Feature code lives in `api/src/modules/<feature>` (routes, a service layer and, where queries are big, a repo file); shared helpers are in `api/src/lib`. Background work (emails, SMS, CSV exports, low-stock alerts, refund reconciliation) goes through a small Postgres-backed job queue in `api/src/jobs`, run either inside the API process or as a separate worker. Outside services (Payfront for payments, Sendbox for email, Textng for SMS) are wrapped in `api/src/integrations/<provider>`, each with a sandbox fake used in development. `web/` is a React 19 single-page app (Vite, TanStack Query and Table, React Router, react-hook-form with zod, Tailwind 4 and shadcn-style components in `web/src/components/ui`). In production the API serves the built SPA, so one port serves everything.

```
api/
  drizzle/              numbered SQL migrations (drizzle-kit)
  src/
    auth/               sessions, roles and permissions
    db/                 schema, client, migrations runner, demo seed
    integrations/       payfront/, mail/ (Sendbox), sms/ (Textng), each with a fake
    jobs/               queue, worker loop, cron schedules, job handlers
    lib/                money, dates, CSV, cursors, HTTP helpers
    modules/            orders, products, inventory, customers, refunds, discounts,
                        slots, dashboard, exports, staff, audit, notifications
    dev/                /_dev/outbox
web/
  src/
    auth/               session context, login, route guards
    components/         app shell, shared widgets, ui/ (shadcn-style)
    features/           one folder per screen: api hooks + components
    lib/                fetch wrapper, money and date formatting, query keys
docs/                   ADRs and runbooks
```

## Running it

You need Node 22.12 or newer. The app wipes and reseeds the database with demo data every time it starts (`SEED_ON_START=true`), with dates relative to today, so it is always ready to click around.

### With Docker

```bash
docker compose up --build
```

Open http://localhost:5126. Compose starts Postgres, the API (which also serves the admin app) and the job worker.

### Natively

Start a Postgres 16 you can reach (the default `DATABASE_URL` is `postgres://shopdeck@localhost:55426/shopdeck`), then:

```bash
npm install
npm run build                 # builds web/dist, served by the API
npm run dev --workspace api   # API + worker + cron on :5126, reseeds on start
```

For frontend work run the Vite dev server as well; it proxies `/api` to :5126:

```bash
npm run dev --workspace web   # http://localhost:5326
```

`npm run dev` at the root starts both.

Useful scripts: `npm run db:migrate -w api`, `npm run db:seed -w api`, `npm run worker -w api` (when `RUN_WORKER=off`), `npm run db:generate -w api` after changing `api/src/db/schema`.

## Demo logins

Password for everyone: `shopdeck2026`

| Email | Name | Role |
| --- | --- | --- |
| admin@ojafresh.ng | Adaeze Obi | Admin |
| ops@ojafresh.ng | Segun Alabi | Ops lead |
| picker@ojafresh.ng | Musa Danjuma | Picker |
| care@ojafresh.ng | Blessing Etim | Customer care |
| finance@ojafresh.ng | Ifeoma Nwankwo | Finance |

## Roles

| | Admin | Ops lead | Picker | Customer care | Finance |
| --- | --- | --- | --- | --- | --- |
| Orders: view | yes | yes | yes | yes | yes |
| Orders: confirm, pick, pack, dispatch | yes | yes | yes | | |
| Orders: cancel | yes | yes | | yes | |
| Refunds: issue | yes | | | | yes |
| Refunds: view | yes | yes | | yes | yes |
| Products and prices | yes | yes | | | |
| Stock adjustments | yes | yes | yes | | |
| Customers: view contact details | yes | yes | | yes | yes |
| Customers: notes | yes | | | yes | |
| Discount codes: create and switch off | yes | | | | |
| Exports | yes | yes | | | yes |
| Staff and roles | yes | | | | |

The matrix lives in `api/src/auth/permissions.ts`; the web app reads the same list from `/api/auth/me` to hide what you cannot use.

## How things work

- **Money** is stored and sent as integer kobo (`totalKobo: 1250000` is ₦12,500.00). Format only at the edge: `formatKobo` in the API, `formatMoney` in the web app. See `docs/adr/0001-kobo-integers.md`.
- **Dates** are shown in Lagos time. Date filters take Lagos calendar days (`from=2026-11-03&to=2026-11-03` means that whole day in Lagos).
- **Order flow:** pending → confirmed → picking → packed → out for delivery → delivered. Pending, confirmed and picking orders can be cancelled; cancelling puts the stock back, frees the delivery slot and gives the discount code use back. Customers get an email when an order is cancelled and an SMS when it leaves the warehouse.
- **Refunds** go to Payfront. The amount is reserved on the order straight away and the refund shows as "Processing" until Payfront's webhook says it was processed or failed. The refund sync job asks Payfront about refunds still processing after two minutes. Requests carry an `Idempotency-Key` header so a retry does not refund twice. See `docs/runbooks/payfront-refunds.md`.
- **Dashboard:** "Net sales" is order totals less delivery fees and refunds for orders placed that day (Lagos time); cancelled orders are not counted. "Packing completion" counts orders booked into that day's delivery slots that are packed or further along, whatever day they were placed.
- **Low stock:** each product has a reorder level. When a stock change takes it to or below that level, ops@ojafresh.ng gets one email; it can alert again after it has been restocked above the level. An hourly sweep catches changes made outside Shopdeck.
- **Exports** are built by the worker; you get an email when the file is ready and can download it from the Exports page.
- **Customers list** loads 50 at a time, newest first; "Load more" fetches the next page.

## Background jobs

`api/src/jobs/queue.ts` stores jobs in the `jobs` table. The worker claims due jobs with `FOR UPDATE SKIP LOCKED`, so you can run more than one. A failed job is retried up to `JOB_MAX_ATTEMPTS` times with a doubling delay starting at `JOB_BACKOFF_MS`. Admins can see the queue under Settings → Background jobs. Schedules (`jobs/cron.ts`): low-stock sweep hourly, refund sync every minute, stuck job requeue every minute, expired session purge hourly.

## Fakes for outside services

Nothing in development talks to the internet. Each provider has a fake mounted inside the API under `/_fake/*` when `ENABLE_FAKES=true`:

| Provider | Real use | Fake | Notes |
| --- | --- | --- | --- |
| Payfront | card and transfer payments, refunds | `api/src/integrations/payfront/fake` | Refunds answer after ~400 ms, then signed webhooks arrive: `refund.processing`, `refund.processed`. |
| Sendbox | transactional email (v3 API) | `api/src/integrations/mail/fake.ts` | Accepts the message, stores it in the dev outbox. |
| Textng | SMS | `api/src/integrations/sms/fake.ts` | Same, for SMS. |

**Dev outbox:** http://localhost:5126/_dev/outbox lists every email and SMS the fakes accepted (JSON at `/_dev/outbox.json`). You can also make the next N sends fail, to see retries:

```bash
curl -X POST localhost:5126/_dev/outbox/simulate -H 'content-type: application/json' -d '{"provider":"sendbox","failNext":1}'
```

## Tests and checks

```bash
npm test            # API unit tests (node:test via tsx)
npm run lint
npm run typecheck
npm run build
```

There are only a few unit tests (money helpers). CI (`.github/workflows/ci.yml`) runs lint, typecheck and build on every pull request and on main. Most of our checking is done by hand against the seeded data; the PR template has the list.

## Conventions

- Branch from `main`, open a PR, squash merge. Conventional commit titles with the Linear ticket: `fix(refunds): [OJA-123] short summary`.
- Schema changes: edit `api/src/db/schema`, run `npm run db:generate -w api`, commit the new numbered migration. Never edit a migration that has been merged.
- Prettier formats everything (`npm run format`).

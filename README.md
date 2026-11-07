# PRQMS - Phone Repair Queue Management System (Web)

Phase 1: Project Setup & Database Schema.

## Stack
- Frontend: React (Vite) + TypeScript + Tailwind CSS
- Backend: Express.js + TypeScript
- Database: PostgreSQL via Prisma ORM

## Structure
```
prqms-web/
  package.json            root workspaces config
  apps/
    backend/
      src/index.ts         minimal Express server (GET /api/health)
      prisma/schema.prisma  Customer, Ticket, RepairType, PriceList, Config
      .env                  DATABASE_URL, PORT (edit for your local Postgres)
    frontend/
      src/App.tsx           Vite React app, calls /api/health to prove the stack is wired
```

## First-time setup (run locally — this project was scaffolded in a
network-restricted sandbox, so dependencies were never installed here)

```bash
# from the prqms-web/ root
npm install

# point apps/backend/.env at your local Postgres instance, e.g.:
# DATABASE_URL="postgresql://prqms_user:prqms_pass@localhost:5432/prqms?schema=public"

cd apps/backend
npx prisma migrate dev --name init   # creates the DB tables from schema.prisma
npm run dev                           # starts Express on http://localhost:4000

# in a second terminal
cd apps/frontend
npm install
npm run dev                           # starts Vite on http://localhost:5173
```

Visit http://localhost:5173 — it should show a "Phase 1 Scaffold" card with the
backend's `/api/health` JSON response, confirming frontend, backend, and (once
migrated) the Postgres schema are all wired together.

## Phase 2: Backend CRUD & Admin API

New dependencies were added (`bcryptjs`, `jsonwebtoken`, `zod`, `ts-node`), so
re-run `npm install` from `apps/backend` (or the repo root) before starting
the server again. No new migration is needed — Phase 2 only adds routes, not
schema changes.

```bash
cd apps/backend
npm install
npm run db:seed     # creates default config, repair types, and a price list
npm run dev
```

The seed creates an admin login — default password `admin1234` (from
`DEFAULT_ADMIN_PASSWORD` in `.env`), change it after first login.

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/admin/login` | — | `{ password }` → `{ token }` |
| POST | `/api/admin/change-password` | admin | `{ currentPassword, newPassword }` |
| GET | `/api/config` | — | Shop name, hours, lunch break, etc. |
| PUT | `/api/config` | admin | Partial key/value update |
| GET | `/api/repair-types` | — | List repair types |
| GET/POST/PUT/DELETE | `/api/repair-types[/:id]` | admin for write | CRUD |
| GET | `/api/price-list?repairTypeId=` | — | List prices |
| GET | `/api/price-list/lookup?repairTypeId=&deviceBrand=` | — | Exact price, falling back to the repair type's default |
| GET/POST/PUT/DELETE | `/api/price-list[/:id]` | admin for write | CRUD |

Admin routes expect `Authorization: Bearer <token>` from the login response.

Quick smoke test:
```bash
curl -X POST http://localhost:4000/api/admin/login -H "Content-Type: application/json" -d "{\"password\":\"admin1234\"}"
curl http://localhost:4000/api/repair-types
curl "http://localhost:4000/api/price-list/lookup?repairTypeId=1&deviceBrand=iPhone"
```

## Phase 3: Registration & Queue Logic

No new npm dependencies. Two things to do before testing:

1. **Generate a real encryption key** for the optional device PIN field (NFR-4, AES-256-GCM). Tickets without a PIN work fine either way, but entering one will throw until this is set:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Paste the output into `PIN_ENCRYPTION_KEY` in `apps/backend/.env` (currently a placeholder).

2. Type-check before running, since this sandbox couldn't compile it:
   ```bash
   cd apps/backend
   npm run build
   ```
   Fix and report back if `tsc` errors.

```bash
npm run dev
```

### What's new
- **Ticket registration** (`POST /api/tickets`): validates input, reuses an existing customer by phone number or creates a new one, looks up price via the same exact→default logic as Phase 2, appends to the queue, encrypts the PIN if provided, and recalculates every active ticket's `estimatedStartTime`.
- **Queue scheduler** (`src/lib/scheduler.ts`): computes ETAs for the whole active queue — one ticket at a time (single-technician assumption), skipping the lunch break, and rolling over to the next working day if the queue would run past closing time (FR-2.4). Reads working hours / lunch break / days-off from `Config`, defaulting sensibly if unset.
- **Status transitions** (`PATCH /api/tickets/:id/status`): enforces WAITING → IN_PROGRESS → DONE → COLLECTED order, blocks starting a second ticket while one is already IN_PROGRESS (single technician), and recalculates the queue after every change.
- **Reorder** (`PATCH /api/tickets/:id/reorder`) and **cancel** (`PATCH /api/tickets/:id/cancel`, requires a reason) — FR-2.8 / FR-2.9.
- **Price override** (`PATCH /api/tickets/:id/price`) — FR-3.6.
- **Customer search** (`GET /api/customers/search?q=`) — FR-1.5/1.6 auto-fill lookup.

None of the queue/ticket routes require the admin JWT — per the SRS, the password gate is specifically for the Admin Settings panel (Config/RepairType/PriceList writes), not day-to-day technician actions.

### Smoke test (PowerShell)
```powershell
# Register a ticket
$reg = @{
  name = "Jane Doe"; phoneNumber = "555-1234"
  deviceBrand = "iPhone"; deviceModel = "iPhone 14"
  problemDescription = "Cracked screen"; repairTypeId = 1
} | ConvertTo-Json
$ticket = Invoke-RestMethod -Uri http://localhost:4000/api/tickets -Method POST -Body $reg -ContentType "application/json"
$ticket

# View the live queue
Invoke-RestMethod -Uri http://localhost:4000/api/tickets

# Start it, complete it, collect it
Invoke-RestMethod -Uri "http://localhost:4000/api/tickets/$($ticket.id)/status" -Method PATCH -Body (@{status="IN_PROGRESS"} | ConvertTo-Json) -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:4000/api/tickets/$($ticket.id)/status" -Method PATCH -Body (@{status="DONE"; actualCost=110} | ConvertTo-Json) -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:4000/api/tickets/$($ticket.id)/status" -Method PATCH -Body (@{status="COLLECTED"} | ConvertTo-Json) -ContentType "application/json"
```

## Phase 4: Frontend Admin & Dashboard

No new dependencies (react-router-dom was already installed in Phase 1). Styled
with plain Tailwind for now rather than shadcn/ui — shadcn's CLI needs to fetch
component source over the network, which this sandbox couldn't do reliably. Run
`npx shadcn@latest init` locally whenever you want to migrate to it; happy to
help wire it in as a follow-up pass.

```bash
cd apps/frontend
npm run build   # type-check — this sandbox couldn't run it, please confirm clean
npm run dev
```

Visit http://localhost:5173:
- **`/`** — the live queue dashboard (FR-2.1): current in-progress ticket with
  a "Mark Done" action, the waiting queue with Start / ↑ / ↓ / Cancel per
  ticket, and a "Ready for Pickup" list with "Mark Collected". Polls the
  backend every 8s.
- **`/admin/login`** — password login (uses the Phase 2 JWT endpoint).
- **`/admin/settings`**, **`/admin/repair-types`**, **`/admin/price-list`** —
  admin-only (redirects to login if not authenticated): shop info / working
  hours / lunch break / days off, repair type CRUD, and price list CRUD
  (blank device brand = default fallback price).

Try it end to end: log in with `admin1234`, add/edit a repair type or price,
then go back to `/` and confirm the queue from Phase 3's smoke test is still
visible with working Start/Complete/Collect buttons.

## Phase 5: Frontend Intake & Slip

No new dependencies. Two backend files changed slightly (bug fixes from Phase
4 testing: `deleteRepairType` now correctly catches a RESTRICT-violation
delete, and `.env`'s `DATABASE_URL` got `&connect_timeout=30` to tolerate
Neon's cold starts) plus `searchCustomers` now also returns `lastDeviceBrand`.

```bash
cd apps/backend && npm run build   # confirm clean after the customerController change
cd ../frontend && npm run build    # confirm clean — new pages, please check
npm run dev
```

- **`/register`** — the intake form (FR-1.1–1.6): as you type a phone number,
  matching past customers appear in a dropdown; picking one autofills name
  and their last device brand. Repair type + brand selection shows a live
  estimated-cost preview. Submitting creates the ticket and redirects straight
  to its slip.
- **`/tickets/:id/slip`** — the printable customer slip (FR-4.1–4.3): shop
  info, ticket #, customer/device/repair details, queue position, estimated
  appointment time and cost, and the pickup reminder. The "Print / Save as
  PDF" button just calls the browser's native print dialog — choosing "Save
  as PDF" as the destination covers FR-4.3 without a separate PDF library.

Try it end to end: go to `/register`, fill out a new ticket (or search "555"
to pull up Jane Doe from the earlier smoke test and confirm autofill works),
submit, confirm the slip looks right, print-preview it (nav bar should
disappear), then check `/` and confirm the new ticket shows up in the queue.

## Beyond the original 5-phase plan

### Marketing pages (Home, About)
Public `/` and `/about` — see the previous message for design notes. The
technician dashboard moved from `/` to `/app` as a result.

### Guest Repair Tracker + notification service

**Schema changed** — `Ticket` gained `trackingCode` (unique, required) and
`repairStage`; `Customer` gained optional `email`. Run, in order:

```bash
cd apps/backend
npm install                          # picks up nodemailer + @types/nodemailer
```

Then the migration. **Heads up**: `trackingCode` is required+unique with no
default, and your `tickets` table already has test rows from earlier phases
without one — a plain `migrate dev` will likely prompt you for how to handle
that. Since everything in this dev database is test data from this session,
the simplest path is a full reset instead:

```bash
npx prisma migrate reset             # drops, re-migrates, and re-seeds
npm run build                        # confirm clean
npm run dev
```

(If you'd rather keep your existing test tickets, run `npx prisma migrate dev
--name add_tracking_and_stage` instead and answer its prompt — it'll ask for
a one-off default to backfill existing rows.)

**New/changed endpoints:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/track/:trackingCode` | — public | Minimal ticket info only: device, repair type, status, stage, estimated time. No name/phone/PIN. |
| PATCH | `/api/tickets/:id/stage` | — | Set `repairStage` to DROPPED_OFF/DIAGNOSING/WAITING_ON_PARTS/REPAIRING (not READY_FOR_PICKUP — that's only ever set via `/status`). |

`POST /api/tickets` now accepts an optional `email`. `PATCH /api/tickets/:id/status`
with `{ status: "DONE" }` now also sets `repairStage: READY_FOR_PICKUP` and
calls the notification service.

**Notification service** (`src/lib/notifications.ts`) is boilerplate by
design — it logs what it would send until you configure real SMTP creds:
```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
NOTIFY_FROM_EMAIL="no-reply@yourshop.com"
```
SMS is stubbed the same way (logs only) — swap in Twilio or similar following
the same pattern. Comments in that file also show the Resend alternative if
you'd rather not manage SMTP.

**Frontend**: `/track` (search by code) and `/track/:code` (direct link,
auto-searches) — both public, under the same nav/footer as Home/About. The
`RepairTracker` component renders the 5-stage visual progress bar (green =
done, blue = current, amber = Waiting on Parts specifically, gray = future),
with distinct end states for CANCELLED and COLLECTED. The printable slip now
shows the tracking code and a link to `/track`, and the intake form has an
optional email field.

Try it end to end: register a new ticket with an email, open its slip and
note the tracking code, then visit `/track` and search that code — you should
see "Dropped Off" as the current (blue) step. Back in `/app`, mark it
In Progress (stage should auto-advance to "Diagnosing" on the tracker), then
Done (stage jumps to "Ready for Pickup", and your backend terminal should log
the stub notification instead of erroring).

## Post-tracker fixes: booking notifications, track 404s, route protection

No new npm dependencies (nodemailer was already added for the tracker
feature). Restart both dev servers to pick up the route/middleware changes:

```bash
cd apps/backend && npm run build && npm run dev
cd apps/frontend && npm run build && npm run dev
```

**1. Booking notifications + success screen.** `POST /api/tickets` now calls
`sendNewBookingNotifications` (`src/lib/notifications.ts`) after creating a
ticket: emails the customer (if they gave an email) with their ticket ID,
tracking code, and a `/track` link, and separately emails the shop at
`ADMIN_NOTIFY_EMAIL` (new env var — set it in `apps/backend/.env`, currently
blank). Both are the same log-if-unconfigured boilerplate as the
ready-for-pickup notification, so nothing breaks if SMTP isn't set up yet.
`RegisterPage.tsx` no longer redirects to the slip on submit — it replaces
the form in place with a success screen that displays the ticket ID and
tracking code large and bold ("Please save this ID to track your repair"),
with buttons to view the slip, jump straight to `/track/:code`, or register
another customer.

**2. Friendly track errors.** `trackController.ts`'s `GET /api/track/:code`
now wraps the lookup in try/catch and always returns a 404 with
`{ error: "Ticket not found. Please check your ID." }` for a missing or
bad code, instead of a 500. `TrackPage.tsx` shows that message as plain red
text directly under the search bar rather than crashing or showing a card.

**3. Route protection.** Every backend route under `ticketRoutes.ts`,
`repairTypeRoutes.ts`, `priceListRoutes.ts`, and `customerRoutes.ts` (reads
included — previously some GETs were public) now sits behind the existing
`requireAdmin` JWT middleware. `configRoutes.ts` is unchanged: `GET /api/config`
stays public since the marketing pages and printable slip read shop hours
from it. On the frontend, `App.tsx` now wraps `/app`, `/register`, and
`/tickets/:id/slip` in `RequireAdmin`; hitting any of them while logged out
redirects to `/admin/login` with an amber "Please log in first." banner, and
logging in sends you back to the page you were trying to reach. `/`, `/about`,
and `/track` remain public.

**Note:** because reads are now admin-gated, `/register` and `/app` require
being logged in first — visit `/admin/login` before testing ticket creation.

Try it end to end: log in, register a ticket with your own email — confirm
the success screen shows the ticket ID/tracking code and check the backend
terminal for the (stubbed or real) client + admin notification logs; then
log out and confirm `/app` and `/register` bounce you to login; then visit
`/track` and search a made-up code — confirm you see red text, not a crash.

## Contact form: admin inbox + reply workflow

The "Get in Touch" form on the Home page is wired end to end now: submit →
`UNREAD` → admin opens it → `READ` → admin replies → `REPLIED` + the customer
gets an email with the admin's reply.

**Note on routing:** this builds directly on the contact-form work from the
previous pass rather than standing up a parallel `/api/messages` system —
same `ContactMessage` table, same `/api/contact` prefix, same
`/admin/messages` page, just extended with a status enum and a reply
endpoint. Two routes were folded in under `/api/contact` instead of a
separate `/api/admin/messages` namespace so there's one source of truth, not
two overlapping inboxes.

**Schema changed** — `ContactMessage` now has a `ContactMessageStatus` enum
(`UNREAD` / `READ` / `REPLIED`, replacing the old `isRead` boolean) plus
`replyText` and `repliedAt`. Run the migration:

```bash
cd apps/backend
npx prisma migrate dev --name contact_message_reply_workflow
npm run build && npm run dev
```

(This table only holds test submissions from the previous pass, so if
`migrate dev` prompts about dropping `is_read`, it's safe to accept — or run
`npx prisma migrate reset` if you'd rather start clean.)

**Endpoints (all under `/api/contact`):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | — public | Step 1: `{ name, email, phone?, message }` → `{ reference, createdAt }`, saved `UNREAD` |
| GET | `/` | admin | List all messages, newest first (list pane — doesn't change status) |
| GET | `/:id` | admin | Step 2: fetch one message — flips `UNREAD` → `READ` as a side effect if it isn't already read/replied |
| POST | `/:id/reply` | admin | Step 3: `{ replyText }` → saves the reply, sets `REPLIED` + `repliedAt`, emails the customer |

**Email logic** (`src/lib/notifications.ts`, new `sendContactReplyEmail`):
same boilerplate pattern as every other notification in this app — logs the
would-be email if SMTP isn't configured, sends for real once it is. The
template puts the admin's typed reply first, then quotes the customer's
original message underneath for context (like a standard reply thread).

**Frontend — `/admin/messages`** is now a two-pane inbox (staff-only, in the
nav bar):
- **Left pane:** every message, unread ones bolded with a blue dot, each row
  showing a status pill (Unread/Read/Replied), the reference, a message
  preview, and the date.
- **Right pane:** click a message to open it (this is what triggers the
  `READ` flip server-side) — shows the full message, sender's clickable
  email/phone, any past reply, and a textarea + "Send Reply to Customer"
  button to send a new one.

Try it end to end: submit the Home page contact form, log in as admin, open
`/admin/messages` — the new message shows Unread with a blue dot; click it —
status flips to Read; type a reply and send it — status flips to Replied,
the reply appears in a green box, and the backend terminal logs the
(stubbed or real) reply email to the customer's address.

Try it end to end: submit the Home page contact form (note the reference
number shown), log in as admin, go to `/admin/messages`, and confirm it
appears with an unread dot; toggle it to read and refresh to confirm it
persists.

## Still outstanding
The SRS also specifies Repair History & Reporting (FR-5.x — searchable ticket
history, daily summary reports, CSV/PDF export) which isn't covered by any of
the 5 original phases. Let me know if/when you want that built — the
`GET /api/tickets?status=` filter from Phase 3 already gives a foundation for
it.

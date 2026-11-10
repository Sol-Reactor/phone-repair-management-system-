# PRQMS — Phone Repair Queue Management System

A full-stack platform for running a phone repair shop: customer intake, a live repair queue with estimated start times, public repair tracking, pricing, inventory and wholesale records, analytics, and customer notifications. It includes a web app for staff and customers and a mobile app for staff.

## Features

- **Ticket intake** — register a repair, reuse returning customers by phone number, and preview the estimated cost from the price list.
- **Live queue** — tickets move through Waiting → In Progress → Done → Collected, with reordering, cancellation, and estimated start times that respect working hours, lunch breaks, and days off.
- **Public repair tracker** — customers follow their repair with a tracking code; no personal details are exposed.
- **Printable slip** — a customer receipt with ticket number, queue position, estimated time, and cost.
- **Pre-repair checklist** — record device condition before work starts.
- **Admin settings** — shop details, working hours, repair types, and per-brand price list.
- **Inventory and wholesale** — stock, suppliers, restock and defective logs, wholesale items, and a distribution ledger with receipts.
- **Analytics** — charts for shop activity and performance.
- **Contact inbox** — messages from the public site with an unread / read / replied workflow and email replies.
- **Notifications** — email (SMTP) and Telegram messages for new bookings and ready-for-pickup; both log to the console until configured.
- **Security** — role-based access (admin and technician), rate limiting, Helmet headers, zod validation, and AES-256-GCM encryption for optional device PINs.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Web frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Framer Motion |
| Backend | Node.js, Express, TypeScript, Prisma, zod, JWT |
| Database | PostgreSQL |
| Mobile | Expo (React Native), Expo Router, NativeWind |

## Project structure

```
apps/
  backend/    Express API, Prisma schema, migrations, and seed
  frontend/   React web app (public site, staff dashboard, admin)
  mobile/     Expo app for staff (tickets, stock, settings)
```

## Getting started

Prerequisites: Node.js 20+ and PostgreSQL.

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Configure the API
cd apps/backend
cp .env.example .env        # set DATABASE_URL, JWT_SECRET, PIN_ENCRYPTION_KEY

# 3. Create the database and seed sample data
npx prisma migrate dev
npm run db:seed

# 4. Start the API (http://localhost:4000)
npm run dev

# 5. In a second terminal, start the web app (http://localhost:5173)
cd apps/frontend
npm run dev
```

The seed creates an admin and a technician account. Their default passwords are set in `.env` (see `.env.example`); change them after the first login.

To run the mobile app:

```bash
cd apps/mobile
npx expo start
```

## Environment variables

All backend variables are documented in [`apps/backend/.env.example`](apps/backend/.env.example).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing key, 32+ random characters |
| `PIN_ENCRYPTION_KEY` | 64-character hex key for encrypting device PINs |
| `CORS_ORIGINS` | Allowed browser origins in production |
| `SMTP_*`, `NOTIFY_FROM_EMAIL`, `ADMIN_NOTIFY_EMAIL` | Email notifications (optional) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | Telegram notifications (optional) |

## Main routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/`, `/about` | Public | Shop information and contact form |
| `/track` | Public | Repair tracking by code |
| `/app` | Staff | Live queue dashboard |
| `/register` | Staff | New ticket intake |
| `/technician` | Staff | Technician dashboard |
| `/admin/*` | Admin | Settings, repair types, price list, messages, wholesale, inventory, analytics |

## Author

Built by [Solomon Shmels](https://github.com/Sol-Reactor).

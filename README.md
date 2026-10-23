# Yin Tango & Sro Rothanakpanha · Wedding website

A bilingual (Khmer / English) wedding website with an RSVP form, a guestbook, digital gift cards, and a private admin dashboard at `/admin`.

- **Public site**: photo hero with countdown, our story with a photo gallery, ceremony schedule (with "Add to calendar"), venue map for OCIC Wedding Hall, RSVP form, guestbook, and an ABA KHQR gift card with "Save QR" and copyable account numbers.
- **Admin dashboard** (English / Khmer): key numbers, a searchable guest list with checkboxes and a bulk action bar (assign table, mark confirmed, delete), inline table numbers and status, bulk guest import (paste from Excel), a guestbook moderation queue, and CSV or Excel export.

The stack is React 19 + TypeScript on the front end, and a small Node.js server with SQLite (built into Node, so there is no separate database to install). The server bundles to a single file, so deployment is just `node dist/server.js`.

---

## 1. Run it on your computer

You need **Node.js 22.13 or newer** (Node 24 LTS recommended): https://nodejs.org

```bash
npm install
cp .env.example .env        # on Windows: copy .env.example .env
# open .env and set ADMIN_PASSWORD and AUTH_SECRET
npm run seed                # optional: sample guests and wishes to try the dashboard
npm run dev
```

Open http://localhost:3000 for the website and http://localhost:3000/admin for the dashboard.

To generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

To remove the sample data later, run `npm run clear-sample`. It deletes only the sample guests and wishes, and keeps real replies from the website. To wipe every guest and wish, run `npm run clear-all`; it asks you to type DELETE first.

## 2. Make it yours

| What | Where |
| --- | --- |
| Names, date, RSVP deadline, venues, map links, schedule times, bank accounts | `src/config/wedding.ts` |
| All English text (story, schedule descriptions, form labels…) | `src/i18n/en.ts` |
| All Khmer text | `src/i18n/km.ts` |
| Colours and fonts | `src/styles/tokens.css` |
| Photos and the gift QR | Put them in the `photo/` folder (served at `/photo/<file>`). Today: `WEDDING2.jpg` in the hero arch, `WEDDING1.jpg` in Our story, `QR1.jpg` on the gift card. To use other files, change `photos` and `gifts` in `src/config/wedding.ts`. Photos open in a full-screen gallery when tapped. |
| Music and the opening chime | The background song is `photo/music/song2-web.mp3`, a web copy of `song2.MP3` with the trailing silence trimmed (128 kbps). Short tracks (up to about 2 minutes) loop gap-free from memory; longer ones stream with `<audio loop>`. The opening chime is `audio/love-chime.mp3`. Paths, volume and fade times are in `music` in `src/config/wedding.ts`. Restart `npm run dev` after replacing files. |
| Venue and map | `venues.reception` in `src/config/wedding.ts`: name, address, Google Maps link and coordinates for the embedded map |
| Default language | `defaultLanguage` in `src/config/wedding.ts` (Khmer by default). Share `?lang=en` links with English-speaking guests. |

> The Khmer copy was written to read naturally, but please have a native speaker in the family proofread `src/i18n/km.ts` (especially the ceremony names and the invitation line) before you send the link out.

Times in the config are Cambodia time (`+07:00`). Guests abroad still see the venue's local times.

## 3. Admin dashboard

Sign in at `/admin` with `ADMIN_PASSWORD`. Sessions last 7 days.

- **Overview**: total pax attending (your catering number), invited / attending / declined counts, wishes received, a groom vs. bride split, and the latest replies. It refreshes every minute.
- **Guest list**:
  - Search by name, phone or table, and filter by side and status.
  - Change a guest's status from the dropdown, or type a table number straight into the row.
  - **Add guests → Paste a list** accepts lines like `Sok Dara, 012 345 678, groom, 2`, or columns copied from Excel.
  - Guests who RSVP on the website are matched to your invitations by phone number (`+855 12…` and `012…` count as the same number). Otherwise they are added as new guests.
- **Guestbook**: approve, hide or delete wishes. With `WISHES_REQUIRE_APPROVAL=true` (the default), new wishes stay hidden until you approve them.
- **Export**:
  - **Excel**: three sheets: the full guest list, a seating plan of confirmed guests sorted by table, and catering totals per table with special diets.
  - **CSV**: the guest list as one sheet.
  - Exports respect the filters you have on.

## 4. Put it online

### Option A: Vercel (free, recommended)

Vercel serves the site from its global CDN and runs the API as a serverless function. Vercel functions have no lasting disk, so RSVPs and wishes are stored in **Turso** (hosted SQLite, free plan) instead of `data/wedding.db`. Everything else works the same. The build (`npm run build`) detects Vercel and writes `.vercel/output` itself, so there is nothing to configure in code.

1. **Put the project on GitHub.** Create an empty private repository (for example `wedding-site`) under your GitHub account, then push this folder to it, using GitHub Desktop or:
   ```bash
   git init
   git add .
   git commit -m "Wedding website"
   git branch -M main
   git remote add origin https://github.com/<your-account>/wedding-site.git
   git push -u origin main
   ```
   `.env`, `data/`, `dist/` and `node_modules/` are in `.gitignore`, so your password and local database are **not** uploaded.
2. **Import it on Vercel.** In *Add New → Project*, pick the repository. If it isn't listed, click *Adjust GitHub App Permissions* and give Vercel access to it. Leave Framework Preset as **Other** and the build settings as they are (they come from `vercel.json`). Don't deploy yet, or let the first deploy fail; you'll redeploy after step 4.
3. **Add a Turso database.** In the project: *Storage → Create Database → Turso* (Marketplace), choose the free plan, and connect it to the project for all environments. This adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the project's environment variables. The tables are created automatically on the first request.
   *Alternative:* create a database at turso.tech, then add the two variables yourself under *Settings → Environment Variables*.
4. **Add your secrets** under *Settings → Environment Variables*:
   | Name | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | your admin password |
   | `AUTH_SECRET` | a random string of 64 characters (generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `WISHES_REQUIRE_APPROVAL` | `true` (optional; this is the default) |
5. **Deploy:** *Deployments → … → Redeploy*. Open the `.vercel.app` address, then `/admin` to sign in.
6. **Your own domain (optional):** *Settings → Domains*.

Every push to `main` redeploys automatically. Your guests' data lives in Turso, so redeploying never loses it.

To work locally against the live database (for example to run `npm run clear-sample` on it), put the same `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your local `.env`. Without them, the local site uses `data/wedding.db` as before.

### Option B: your own server or Docker

Build once, then run the single server file:

```bash
npm run build
NODE_ENV=production npm start
```

In production the server refuses to start without `ADMIN_PASSWORD` and `AUTH_SECRET`. Without Turso settings it stores data in `data/wedding.db`, so it needs a **persistent disk** (a VPS, Railway, Render or Fly.io with a volume).

**With Docker:**

```bash
docker build -t wedding .
docker run -d -p 3000:3000 --env-file .env -v wedding-data:/app/data --name wedding wedding
```

**Behind Nginx or Caddy** (recommended, for HTTPS): proxy to `localhost:3000` and set `TRUST_PROXY=true` so rate limiting and secure cookies see the real visitor.

**Back up** by copying `data/wedding.db` while the site is running. SQLite's WAL mode makes that safe.

## 5. Project structure

```
server/                 Node server (no framework)
  app.ts                request handler: security headers, API routing, errors
  index.ts              local / self-hosted HTTP server (API + built site)
  vercel.ts             Vercel function entry for /api/*
  router.ts             tiny path router
  env.ts                configuration
  db.ts                 database: local SQLite file or Turso over HTTP, with migrations
  auth.ts               signed, HttpOnly admin session cookie
  rateLimit.ts          per-IP limits for RSVP, wishes and login
  repositories/         guests and wishes data access
  routes/public.ts      POST /api/rsvp, GET|POST /api/wishes
  routes/admin.ts       /api/admin/* (stats, guests, wishes, export)
  export/               CSV and .xlsx writers
shared/                 types, constants and zod schemas used by both sides
src/
  config/wedding.ts     wedding details
  i18n/                 en.ts, km.ts and the language provider
  lib/                  date/number formatting (Khmer numerals), API client, .ics
  site/                 public landing page components and styles
  admin/                dashboard components, pages and styles
  html/                 page templates
scripts/                build (also writes .vercel/output on Vercel), dev and seed scripts
vercel.json             Vercel build settings
```

## 6. Security notes

- Admin APIs require a signed session cookie (HMAC-SHA256, `HttpOnly`, `SameSite=Strict`, and `Secure` over HTTPS). State-changing requests also check the `Origin` header.
- All input is validated with zod on the server. Public forms have a honeypot field and per-IP rate limits.
- Responses include a strict Content-Security-Policy (only Google Fonts and the Google Maps embed are allowed from outside), plus `X-Frame-Options`, `nosniff` and HSTS in production.
- Exports neutralise spreadsheet formula injection.

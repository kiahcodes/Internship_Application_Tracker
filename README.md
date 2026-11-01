# Campus2Career — Internship Application Tracker

Find internships, track every application on a board, keep versioned resumes and cover letters, and prepare for interviews — all in one place.

Built as a full-stack project: a **React + Vite** frontend, an **Express** API, and **Supabase** (Postgres + Storage + Auth) for data, files and social sign-in.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it fits together](#how-it-fits-together)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Social sign-in (Google, GitHub)](#social-sign-in-google-github)
- [Importing and exporting applications (CSV)](#importing-and-exporting-applications-csv)
- [Scripts](#scripts)
- [Deployment (free tier)](#deployment-free-tier)
- [Security notes](#security-notes)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Features

### Opportunities
- Listings are collected automatically from **Internshala, Greenhouse, Lever, Remotive and RemoteOK** (India-based and remote roles), and posters can add their own.
- Filter by work mode, paid/unpaid, minimum stipend, duration, batch year, CGPA and branch. Eligibility rules that are left blank mean "open to everyone".
- Sort by newest, deadline, **nearest to you** (uses your browser location) or **best skill match** (your profile skills are matched against each description).
- One click to **track** a posting; expired postings are hidden unless you already track them.

### Tracker
- Drag-and-drop board: **Applied → OA → Interview → Offer / Rejected**.
- Each card remembers **which resume version** was sent, and can carry a **cover letter** (written, generated from a template, or an uploaded file).
- Deadlines and **"remind me on"** dates feed a *Coming up* panel.
- **CSV import / export** with a guided import dialog and a downloadable template (see [below](#importing-and-exporting-applications-csv)).

### Documents
- Versioned **resumes** (keeps the newest 5) and **cover letters** (newest 25), stored in a private Supabase Storage bucket.
- Mark any version as current, preview PDFs in a tab, download any file.

### Analytics
- Funnel (how far applications get), response rate and time-to-reply, applications over time (weekly / monthly), and breakdowns by **source** and by **resume version** — so you can see which resume actually gets interviews. Small samples are flagged rather than compared.

### Interview prep
- Per-company workspace: checklist, links, interview rounds with reflections, and a question bank.
- **Spaced-repetition quiz** (Leitner boxes): questions you get right come back less often; misses reset to daily.
- **LeetCode questions asked at each company** (by time window) can be saved straight into your links.

### Accounts and profile
- Email + password, or **Google / GitHub** sign-in. Sign in with either your email **or your username**.
- Every user has a **unique username** (your public handle).
- Password reset by one-time link (30 minutes, single use). Show/hide password toggle on every password field.
- Rich profile: education, CGPA, skills, preferred locations, and links to **GitHub, LinkedIn, portfolio, LeetCode, Codeforces, Google Scholar and ORCID**.
- A **profile-completeness bar** under the navbar shows how much of your profile is filled in.
- Two roles: **student** and **poster** (can post and manage internships; sign-up needs an invite code).
- Delete your account (password required) — your data and stored files go with it.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite 8, plain CSS with design tokens |
| API | Node.js (ESM), Express 5, `pg`, `multer`, `jsonwebtoken`, `bcryptjs`, `nodemailer`, `cheerio`, `node-cron` |
| Database | Supabase Postgres |
| Files | Supabase Storage (private bucket) |
| Social login | Supabase Auth (Google, GitHub) |
| Tests | Node's built-in test runner |
| Hosting (free) | Vercel (frontend) · Render (API) · GitHub Actions (scraper) |

---

## How it fits together

```
 Browser ──► Vercel (React app) ──/api/*──► Render (Express API) ──► Supabase Postgres
    │                                              │
    │  Google / GitHub redirect                    └──► Supabase Storage (resumes, cover letters)
    └────────► Supabase Auth ──(access token)──► API verifies it, then issues its own session

 GitHub Actions (every 6h) ──► npm run scrape ──► Supabase Postgres
```

- The API owns authorization. It connects to Postgres directly and checks the signed-in user on every query; row-level security is switched on for every table with no public policies, so the Supabase REST API can't read your data.
- Social sign-in uses Supabase Auth only for the Google/GitHub redirect. The API verifies the resulting token and issues the same session token used for email/password login.

---

## Getting started

### Prerequisites
- **Node.js 20+** and npm
- A free **[Supabase](https://supabase.com)** project

### 1. Clone and install
```bash
git clone <your-repo-url>
cd tracker
(cd backend && npm install)
(cd frontend && npm install)
```

### 2. Configure Supabase
In your Supabase project:
1. Click **Connect** and copy the **Session pooler** connection string (put your database password in it).
2. Open **Project Settings → API** and copy the **Project URL**, the **anon** key and the **service_role** key.

### 3. Add environment files
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Fill them in using the [table below](#environment-variables).

### 4. Create the tables and storage bucket
```bash
cd backend
npm run db:init
```
This is safe to run again: it creates missing tables and columns, seeds a few sample internships, and creates the private `resumes` bucket.

### 5. Run it
```bash
# terminal 1 — API on http://localhost:5000
cd backend && npm run dev

# terminal 2 — app on http://localhost:5173 (Vite proxies /api to the API)
cd frontend && npm run dev
```
Optionally fetch real listings right away:
```bash
cd backend && npm run scrape
```
(With `SCRAPER_ENABLED=true` the API also scrapes on start and every 2 hours while it is running locally.)

Open **http://localhost:5173**, sign up, and you're in. Without `SMTP_URL`, password-reset links are printed in the API terminal.

---

## Environment variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Supabase **Session pooler** connection string |
| `SUPABASE_URL` | yes | Project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | `service_role` key. **Secret** — server only, never put it in the frontend |
| `SUPABASE_BUCKET` | no | Storage bucket name (default `resumes`) |
| `JWT_SECRET` | yes | Long random string used to sign sessions |
| `POSTER_INVITE_CODE` | no | Code needed to sign up as a poster. Leave empty to close poster sign-ups |
| `APP_URL` | no | Public URL of the frontend, used in reset links (default `http://localhost:5173`) |
| `SMTP_URL` / `MAIL_FROM` | no | e.g. `smtps://user:pass@smtp.gmail.com`. Without it, emails are printed to the console |
| `SCRAPER_ENABLED` | no | `true` to run the scraper inside the API process (local use) |
| `PORT` | no | API port (default `5000`) |

### `frontend/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | for social login | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | for social login | The public `anon` key (safe to expose) |

---

## Social sign-in (Google, GitHub)

Email/password works with no extra setup. To turn on the Google and GitHub buttons:

1. **Create an OAuth app** with each provider. For both, the callback / redirect URL is
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - **Google** — Google Cloud Console → *APIs & Services → Credentials → OAuth client ID* (Web application). Add your site origins under *Authorized JavaScript origins*.
   - **GitHub** — *Settings → Developer settings → OAuth Apps → New OAuth App*.
2. In Supabase: **Authentication → Sign In / Providers**, enable **Google** and **GitHub** and paste each client ID and secret.
3. In Supabase: **Authentication → URL Configuration** — set **Site URL** to your frontend URL and add `<frontend-url>/auth/callback` (and `http://localhost:5173/auth/callback`) to **Redirect URLs**.
4. Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `frontend/.env` (and in Vercel for production).

New social users pick a unique username on first sign-in and are always created as students. If a provider doesn't return a verified email, sign-in is refused (accounts are matched by email).

---

## Importing and exporting applications (CSV)

On the **Tracker** page, **Import CSV** opens a guide with the format and a **Download template** button. **Export CSV** writes the same format, so you can export, edit in Excel or Google Sheets, and import it back.

```csv
Title,Company,Role,Status,Applied on,Deadline,Remind on,Link
SDE Intern – Acme,Acme,SDE Intern,Applied,2026-10-28,2026-11-15,2026-11-10,https://acme.example/jobs/1
```

- The first row must be column names. Order doesn't matter, and common alternatives work (`Company name`, `Position`, `Stage`, `Application date`, `Result by`, `URL`, …).
- Each row needs a **Title**, or at least a **Company** or **Role** (the title becomes `Role – Company`).
- **Status:** `Applied`, `OA`, `Interview`, `Offer` or `Rejected` (words like "selected" or "not shortlisted" are understood). Anything else becomes `Applied`.
- **Dates:** `2026-11-15`, `15/11/2026` (day first) or `15 Nov 2026`. Applied date defaults to today.
- Comma, semicolon and tab separated files are all accepted. Up to **500 rows / 1 MB**.
- You get a **preview before anything is saved**. Rows already in your tracker are skipped (re-importing is safe), and anything dropped or changed is listed — columns with nowhere to go (like *Locations* or *Skillset*) are named, not silently lost.

---

## Scripts

### Backend (`backend/`)
| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm start` | Start the API |
| `npm run db:init` | Create/upgrade tables, seed sample data, create the storage bucket |
| `npm run scrape` | Fetch new internship listings once |
| `npm test` | Run the unit tests |

### Frontend (`frontend/`)
| Command | What it does |
|---|---|
| `npm run dev` | Dev server with `/api` proxied to `localhost:5000` |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

---

## Deployment (free tier)

The repo is set up for three free services. Nothing needs a paid plan.

| Part | Service | Config |
|---|---|---|
| Frontend | **Vercel** | `frontend/vercel.json` |
| API | **Render** (free web service) | `render.yaml` |
| Scraper | **GitHub Actions** (every 6 hours) | `.github/workflows/scrape.yml` |

1. **API on Render** — *New → Blueprint*, pick this repo. Fill in `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `POSTER_INVITE_CODE`; `JWT_SECRET` is generated for you. Set `APP_URL` to your Vercel URL.
2. **Frontend on Vercel** — import the repo with **Root Directory = `frontend`**. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. In `frontend/vercel.json`, point the `/api` rewrite at your Render URL.
3. **Scraper** — in GitHub, *Settings → Secrets and variables → Actions*, add `DATABASE_URL`. Run the *Scrape internships* workflow once from the **Actions** tab to fill the listings.
4. **Supabase** — add your Vercel URL and its `/auth/callback` to *Authentication → URL Configuration*.

Free-tier things to know:
- Render's free instance **sleeps after ~15 minutes idle**; the first request afterwards takes 30–60 seconds. A free uptime pinger on `/api/health` keeps it awake.
- Supabase pauses free projects after about a week with no activity.
- GitHub disables scheduled workflows after 60 days without repo activity (re-enable from the Actions tab).
- The in-process scraper is turned off on Render because a sleeping instance would miss its timer; GitHub Actions does the job instead.

---

## Security notes

- Passwords are hashed with **bcrypt**; sessions are signed **JWTs** (7 days). The user's **role is re-read from the database on every request**, so role changes apply immediately.
- **Rate limiting** on sign-in and password-reset requests. Reset links are single-use, expire in 30 minutes, and only a **hash** of the token is stored. The reset response is identical whether or not the email exists.
- **Authorization lives in the API**: every query is scoped to the signed-in user, and posters can only edit internships they posted.
- **Row-level security** is enabled on all tables with no public policies. The `service_role` key stays on the server.
- Uploaded files go to a **private** bucket under opaque keys. Downloads always use `Content-Disposition: attachment` (only real PDFs can be shown inline), with `nosniff`, so an uploaded HTML file can never run in the page.
- CSV export **neutralises spreadsheet formulas** (`=`, `+`, `-`, `@`) in free-text columns.
- Poster accounts require a server-side **invite code**, compared in constant time.
- Never commit `.env` files (they are git-ignored).

---

## API overview

All routes are under `/api`. Everything except auth and health needs `Authorization: Bearer <token>`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/signup` · `POST /auth/login` · `POST /auth/oauth` · `POST /auth/forgot` · `POST /auth/reset` · `GET /auth/me` · `GET /auth/username-available?u=` |
| Account / profile | `GET` `PUT /profile` · `DELETE /account` |
| Internships | `GET /internships` (filters, sort, paging) · `GET /internships/:id` · `POST` `DELETE /internships/:id/apply` · `POST` `PUT` `DELETE` (posters) |
| Tracker | `GET` `POST /tracker` · `PATCH` `DELETE /tracker/:id` · `GET /tracker/export` · `POST /tracker/import[?dryRun=1]` |
| Documents | `/resumes` and `/cover-letters`: list, upload, `PATCH /:id/current`, `GET /:id/download`, `DELETE /:id` |
| Analytics | `GET /analytics` |
| Prep | `/prep/companies`, `/prep/items`, `/prep/links`, `/prep/rounds`, `/prep/questions`, `/prep/quiz`, `POST /prep/questions/:id/review`, `GET /prep/companies/:id/leetcode` |
| Health | `GET /health` |

---

## Project structure

```
.
├── backend/
│   ├── schema.sql              # Postgres schema (idempotent)
│   └── src/
│       ├── server.js           # Express app: auth, profile, tracker, documents
│       ├── internships.js      # listing search, filters, posting
│       ├── prep.js             # interview prep + spaced-repetition quiz
│       ├── analytics.js        # pure analytics over applications/events
│       ├── trackerCsv.js       # CSV parse / import / export (pure, tested)
│       ├── profile.js          # profile validation
│       ├── username.js         # username rules and reserved names
│       ├── oauth.js            # verify Supabase tokens, suggest usernames
│       ├── storage.js          # Supabase Storage helpers
│       ├── auth.js             # JWT + role-based permissions
│       ├── db.js               # pg pool (? placeholders, transactions)
│       ├── initDb.js           # `npm run db:init`
│       └── scrapers/           # sources, geo lookup, fact extraction, scheduler
├── frontend/
│   ├── vercel.json             # /api rewrite to the Render API + SPA fallback
│   └── src/
│       ├── pages/              # Home, Internship, Tracker, Documents, Analytics, Prep, Profile, auth pages
│       ├── components/         # Navbar, dialogs, filters, shared UI primitives (ui.jsx)
│       └── utils/              # API client, auth session, options, profile completeness
├── render.yaml                 # Render blueprint for the API
└── .github/workflows/scrape.yml
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `db:init` can't connect / times out | Use the **Session pooler** string, not "Direct connection" |
| Google/GitHub button says social sign-in isn't set up | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`, then restart `npm run dev` |
| Provider redirects to an error page | Enable the provider in Supabase and add `/auth/callback` to the Redirect URLs |
| "Poster sign-ups are closed" | Set `POSTER_INVITE_CODE` in `backend/.env` |
| Reset email never arrives | Without `SMTP_URL` the link is printed in the API terminal |
| No internships listed | Run `npm run scrape` (or the GitHub Actions workflow) |
| Deployed app is slow on the first click | Render's free instance was asleep; it wakes in under a minute |
| Resume upload fails near 4 MB | The limit is 4 MB per file |

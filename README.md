# WorkNest
BY NeoStats

Local multi-user project manager for the hackathon. **Admin**, **Project Manager**, **Team Member**, and **Viewer** share projects and tasks. Permissions are enforced on the **server**. Two people editing the same task cannot silently overwrite each other.

Study notes for judges: keep [`HACKATHON_BRIEFING.md`](HACKATHON_BRIEFING.md) open.

## Stack

| Piece | Tool | Why |
| --- | --- | --- |
| Frontend | React + Vite | Screens in the browser |
| Backend | Node + Express | APIs, login, role checks |
| Database | PostgreSQL on this laptop | Spec prefers it. No Firebase / Supabase |
| Schema | Prisma | One file maps to the tables |
| Auth | JWT + bcrypt | Login ticket + hashed passwords |

This is Express + React + Node with **PostgreSQL instead of MongoDB**.

## Demo accounts

Password for every account: `Password123!`

| Email | Role in the demo |
| --- | --- |
| `admin@local.test` | Admin (creates users and projects). Not a project member. |
| `pm@local.test` | Project manager on “Website relaunch” |
| `sana@local.test` | Second project manager on “Website relaunch” |
| `member@local.test` | Team member, assigned a task |
| `meera@local.test` | Extra team member |
| `kabir@local.test` | Extra team member |
| `neha@local.test` | Extra team member |
| `viewer@local.test` | Viewer |
| `rohan@local.test` | Extra viewer |
| `leela@local.test` | Not on a project — add from Team |
| `intern@local.test` | Not on a project — add from Team |
| `tara@local.test` | Not on a project — add from Team |

## Run locally

Client and server npm install, `prisma generate`, **migrate**, and **seed** are already done. PostgreSQL 18 is running on this laptop (`postgresql-x64-18`, port **5432**, database **neoboard**, password **postgres**). Health should return `"database": "connected"`.

If you reinstall the machine, connection string in `server/.env`:

```
postgresql://postgres:postgres@localhost:5432/neoboard?schema=public&connect_timeout=5
```

Copy `server/.env.example` to `server/.env` if `.env` is missing.

**Docker** (only if you install Docker later): `docker compose up -d`

Re-seed only if the database is empty (from `server/`):

```bash
npx prisma migrate deploy
npm run prisma:seed
```

### Start the app (two terminals)

Terminal A:

```bash
cd server
npm run dev
```

API: http://localhost:4000/api/health (includes `database: connected` or `disconnected`)

Terminal B:

```bash
cd client
npm run dev
```

UI: http://localhost:5173

The Vite dev server proxies `/api` to port 4000.

## Demo path (practice this)

Use two browsers, or one window plus Incognito.

1. Log in as **admin**. Create people if needed. Open **Projects**.
2. Log in as **pm**. Open **Website relaunch** → **Tasks** → assign work. Open **Team**.
3. Log in as **member**. Open the assigned task, change status, add a comment. Try to delete the project (it must fail).
4. Log in as **viewer**. You can read. You cannot edit.
5. **Conflict:** open the same task as PM and member. Save as PM first. Save as member → **409** and “Reload latest”.

## What is real vs later

**Real:** local Postgres, JWT login, server 403s, task `version` + 409, comments, the listed pages.

**Not in this build:** cloud deploy, live WebSockets, file uploads, email.

## Folders

- `client/` — React pages
- `server/` — Express APIs + Prisma
- `server/prisma/schema.prisma` — tables
- `docker-compose.yml` — local Postgres recipe

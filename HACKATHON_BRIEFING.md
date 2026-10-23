# Hackathon briefing — WorkNest
BY NeoStats

Keep this tab open. This is the **judge study sheet**. The product is **runnable locally**. PostgreSQL 18 is up, database `neoboard` is migrated and seeded, API is on `:4000`, UI is on `:5173`. Login as admin was verified.

---

## Pitch (say this)

WorkNest, by NeoStats, is a local collaborative project manager. Four roles share projects and tasks. **The server** blocks forbidden actions, even if someone uses Postman. Two people editing the same task cannot silently overwrite each other — the second save gets **HTTP 409**.

---

## Users and roles (this step — verified)

Admin is **global** (`users.global_role`). PM / Team Member / Viewer are **per project** (`project_members.role`). Hiding a button is only UX — Postman still gets **403**.

Same person can be PM on project A and viewer on project B.

**Judge trap:** “What if a Team Member calls `DELETE /api/projects/:id`?”  
**Answer:** “Express returns 403. Hiding the button is only UX. Postman still 403.”

### Role checklist (spec)

**Admin** (`admin@local.test`)

| Responsibility | Status | How to demo |
| --- | --- | --- |
| Manage users | Done | **Users** page: create, deactivate. `GET/POST /api/users` is Admin only. |
| Create projects | Done | **Projects** → New project. `POST /api/projects` Admin only. |
| Delete projects | Fixed now | **Delete** on Projects (and Overview). `DELETE /api/projects/:id` Admin only. Members/tasks/comments cascade. Archive still exists as a hide, not a delete. |
| Assign project managers | Fixed now | **On a task:** Admin picks a person in **Assign project manager to this task** and Saves. That person becomes PM on the project and is assigned the task. Team tab can still set the PM role. |
| View all projects | Done | Dashboard/Projects lists every project. Non-admins only see memberships. |

**Project Manager** (`pm@local.test` on Website relaunch)

| Responsibility | Status | How to demo |
| --- | --- | --- |
| Manage assigned projects only | Done | Can edit name/description on Website relaunch. Cannot see or edit a project they are not on. |
| Add/remove team members | Done | Team tab: add `leela@local.test` as team_member, then Remove. Cannot add/remove a **project manager**. |
| Create / update / delete tasks | Done | Tasks tab create. Task page Save and Delete. |
| Assign tasks | Done | Assignee dropdown (PM/Admin only). |
| Change task status | Done | Status on the task page. |

**Team Member** (`member@local.test`)

| Responsibility | Status | How to demo |
| --- | --- | --- |
| View projects they belong to | Done | Dashboard shows Website relaunch only. |
| View assigned tasks | Done | Open “Draft landing page copy”. |
| Update their tasks | Done | Open a task in a project they belong to. Save title/description. |
| Add comments | Done | Comment box on the task. Viewer cannot. |
| Change task status | Done | Status dropdown on the task page, then Save. |
| Cannot manage team | Done | No Add/Remove on Team. API 403. |

**Viewer** (`viewer@local.test`)

| Responsibility | Status | How to demo |
| --- | --- | --- |
| Read-only projects and tasks | Done | Can open Overview / Tasks / a task. Fields disabled. |
| No writes, including comments | Done | No comment box. `POST /api/tasks/:id/comments` → 403 “Viewers cannot comment.” |

---

## Stack (your decision)

You asked for MERN. The brief prefers PostgreSQL and forbids cloud DBs.

| Letter | In MERN | What we used |
| --- | --- | --- |
| M | MongoDB | **PostgreSQL** (local) |
| E | Express | Express |
| R | React | React + Vite |
| N | Node | Node |

**Say:** “We kept Express, React, and Node. We used Postgres because the spec asked for it, and because roles plus a task `version` column fit tables.”

Other choices: **Prisma** (schema file), **JWT + bcrypt** (login), **Docker-compose file** for Postgres (optional). No Firebase.

---

## How a click becomes data

1. React page (example: save a task) sends `PATCH /api/tasks/:id` with a JWT and `version`.
2. Express `requireAuth` checks the token and loads the user.
3. Express loads the project membership and checks the **role**.
4. For tasks: `UPDATE ... WHERE id = ? AND version = ?`. If zero rows → **409**.
5. JSON comes back. React shows the result or a “reload latest” banner.

---

## Folders (teach these)

```
client/                      React UI (port 5173)
  src/api.js                 fetch helper + JWT header
  src/auth.jsx               who is logged in; role helpers
  src/App.jsx                routes (Login, Dashboard, Projects, Task, Users, Profile)
  src/pages/                 one screen per file
server/                      Express API (port 4000)
  src/index.js               health check + mounts all routes
  src/middleware/auth.js     login required + admin check
  src/middleware/authorize.js project role checks (403)
  src/routes/                auth, users, me, projects, members, tasks, comments
  src/lib/errors.js          same JSON error shape every time
  prisma/schema.prisma       the five tables
  prisma/seed.js             demo accounts
docker-compose.yml           local Postgres recipe (optional — we used Windows Postgres 18)
HACKATHON_BRIEFING.md        this file
```

**MERN mapping in one sentence:** React talks to Express. Express talks to PostgreSQL through Prisma. JWT is the login ticket.

---

## Data model (this step — we designed it)

Open `server/prisma/schema.prisma`. **Six tables** in Postgres `neoboard`, matching the use case. WorkNest BY NeoStats.

| Suggested entity | Our table | Status | What it holds |
| --- | --- | --- | --- |
| users | `users` | Done | name, unique email, `password_hash`, `global_role_id` FK, `is_active` |
| roles | `roles` | Fixed now | id, unique `name`, `scope` global\|project |
| projects | `projects` | Done | name, description, `status` active\|archived, `created_by` |
| project_members | `project_members` | Done | user + project + `role_id` FK; **unique (project_id, user_id)** |
| tasks | `tasks` | Done | title, `status`, `assignee_id`, `created_by`, **`version`** |
| comments | `comments` | Done | `task_id`, `user_id`, body |

**Relations (all present):** project → members, tasks; task → comments, assignee, creator; member → user + project; comment → task + user. Delete a project **cascades** members, tasks, comments.

Deactivate users instead of hard-deleting people. Admin can **Activate** them again (`POST /api/users/:id/activate`). Admin can **archive** a project (hide) or **delete** it (cascade). Assign a **project manager** on the project **Team** tab (not on Users — Users only has global admin/user).

**`roles` rows:** `admin` and `user` (scope global); `project_manager`, `team_member`, `viewer` (scope project).

**Pointers:** `users.global_role_id` → `roles.id`. `project_members.role_id` → `roles.id`. JSON still uses **strings** (`globalRole: "admin"`, `role: "project_manager"`) so React did not change.

**Judge line:** “We have a roles table as in the brief. Users point at a global role. Memberships point at a project role. Same person can be PM on A and viewer on B.”

**`version` on tasks:** integer, default 1. That is the 409 lock.

---

## API contract (this step — we designed it)

WorkNest BY NeoStats. Base: http://localhost:4000. Nouns, not verbs, except **actions** (see POST archive/deactivate).

| Check | Status | Notes |
| --- | --- | --- |
| Naming | Done | `/api/auth`, `/api/users`, `/api/projects`, `.../members`, `.../tasks`, `/api/tasks/:id`, `/api/comments/:id` |
| HTTP semantics | Done | 201 create, 204 delete, 400 validation, 401, 403, 404, 409. GET 200. |
| Validation | Done | Zod on every write body |
| Authorization | Done | JWT + role middleware. Postman still 403 |
| Errors | Done | Always `{ "error": { "code", "message" } }`. Extra fields (`details`, `task`) sit inside `error` |
| Pagination | Fixed now | Lists return `items`, `page`, `limit`, `total`. Members/comments also keep `members`/`comments` so old UI still works |
| Filtering | Done | users `q`; projects `status`; tasks `status`, `assigneeId` |
| Consistency | Done | `publicUser` never includes `passwordHash`. Create/update/delete codes match across resources |

**Why POST for archive and deactivate (not PATCH)?** They are **actions**, not “set one field.” `POST /api/projects/:id/archive` and `POST /api/users/:id/deactivate` are like buttons. PATCH is for name/description/role. Judges: “POST means do this action. PATCH means change these fields.”

**Say:** “One error envelope. Lists are paginated. Writes are Zod-checked. Role checks are on the server.”

Example error:

```json
{ "error": { "code": "FORBIDDEN", "message": "You do not have permission for this action." } }
```

Codes: `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION` 400, `CONFLICT` 409, `DB_UNAVAILABLE` 503.

Routes:

- `POST /api/auth/login` → `{ token, user }` · `GET /api/auth/me`
- Users (Admin): `GET/POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/deactivate`
- Profile: `PATCH /api/me/profile`
- Projects: `GET/POST /api/projects`, `PATCH /api/projects/:id`, `POST .../archive`, `DELETE /api/projects/:id`
- Team: `GET/POST /api/projects/:id/members`, `PATCH/DELETE .../members/:userId`
- Tasks: `GET/POST /api/projects/:id/tasks`, `GET/PATCH/DELETE /api/tasks/:id` (PATCH must send `version`)
- Comments: `GET/POST /api/tasks/:id/comments`, `DELETE /api/comments/:id`

No public signup. Admin creates users. Login JSON never includes `passwordHash`.

---

## Concurrent updates (this step — proven)

Task `22222222-2222-2222-2222-222222222222` (**Draft landing page copy**). Column `tasks.version`. `PATCH` uses `UPDATE ... WHERE id AND version`. Zero rows → **409** + latest task. No silent overwrite.

**Say:** “Optimistic concurrency. We never silently overwrite.”

| Step | Expected | Actual | Status |
| --- | --- | --- | --- |
| GET task, note version | 200 | 200, version 3 | Done |
| PM PATCH with that version (new title) | 200, version+1 | 200, version 4, PM title kept | Done |
| Member PATCH with **old** version | 409 + latest task | 409 CONFLICT; latest still PM title; member title not saved | Done |
| PATCH without `version` | 400 | 400 VALIDATION | Done |
| Member PATCH with **latest** version | 200 | 200, version 5 | Done |

UI (`TaskDetail.jsx`): Save sends `version`. 409 shows a banner and **Reload latest**. **Fixed now:** none. **Missing:** none.

### Two-browser demo

1. Chrome: log in `pm@local.test`. Open **Website relaunch → Tasks → Draft landing page copy**. Note version.
2. Incognito: log in `member@local.test`. Open the **same task**. Note the same version.
3. Chrome: change the title, **Save**. Version goes up.
4. Incognito: **Save** without reloading → red/amber banner, **409**, “Reload latest”.
5. Click **Reload latest**, then save again → 200.

---

## Pages (this step — verified)

All required screens exist and load real data. Extra: `/profile` (ours — keep it).

| URL | Status | What it shows | Who can open it |
| --- | --- | --- | --- |
| `/login` | Done | WorkNest sign-in. Demo accounts listed. | Anyone (logged-in users bounce to dashboard) |
| `/dashboard` | Done | Hello + project cards | Any logged-in user (Admin sees all projects) |
| `/projects` | Done | Project list. Admin: create, archive, delete | Any logged-in user (list is membership-filtered) |
| `/projects/:id` | Done | Overview: name, role, edit details | Members of that project, plus Admin |
| `/projects/:id/tasks` | Done | Task list. PM/Admin: create and assign | Same as overview |
| `/projects/:id/team` | Done | Members table. Admin/PM: add/remove (Admin assigns PMs) | Same as overview |
| `/tasks/:id` | Done | Task edit, status, comments, 409 banner | Same as overview |
| `/users` | Done | User directory + create / **edit** / deactivate | **Admin only.** Others are redirected to `/dashboard`. Nav link hidden. |
| `/profile` | Extra (keep) | Name and password | Any logged-in user |

**Judge line:** “Users is Admin only in the sidebar **and** in the route guard. A PM who types `/users` still lands on dashboard.”

---

## Auth and authorization (this step — KEY — proven)

Login issues a **JWT**. Protected routes call `requireAuth`. Role checks run in Express (`requireAdmin`, `requireProjectRoles`, `canEditTask`). Buttons hide in React; **Postman still 403**.

**Say this:** “Authorization is on the server. A Team Member with a valid token still cannot delete a project.”

### Proof (real HTTP, Password123!)

| Attack | Expected | Actual | Status |
| --- | --- | --- | --- |
| No token `GET /api/projects` | 401 | 401 UNAUTHORIZED | Done |
| No token `GET /api/users` | 401 | 401 | Done |
| No token `GET /api/auth/me` | 401 | 401 | Done |
| No token `DELETE /api/projects/:id` | 401 | 401 | Done |
| Bad JWT | 401 | 401 | Done |
| Wrong password login | 401 | 401 | Done |
| Member `DELETE` project | 403 | 403 | Done |
| Member `POST` project | 403 | 403 | Done |
| Member `POST` user | 403 | 403 | Done |
| Member `POST` member | 403 | 403 | Done |
| Member `POST` task | 403 | 403 | Done |
| Member `DELETE` task | 403 | 403 | Done |
| Member `PATCH` someone else’s task | 403 | 403 | Done |
| Viewer `POST` comment | 403 | 403 | Done |
| Member `GET` their projects | 200 | 200 | Done |
| Member `PATCH` own assigned task + version | 200 | 200 | Done |
| Member `POST` comment | 201 | 201 | Done |
| Admin `GET /api/users` | 200 | 200 | Done |
| Member `GET /api/users` | 403 | 403 | Done |

**Missing:** none. **Fixed now:** none (all already blocked). Extra: PM assigning `project_manager` → 403 Admin only.

### Postman demo (practice)

1. `POST http://localhost:4000/api/auth/login` body `{ "email": "member@local.test", "password": "Password123!" }`. Copy `token`.
2. Authorization → Bearer Token → paste.
3. `DELETE http://localhost:4000/api/projects/11111111-1111-1111-1111-111111111111` → **403**.
4. Repeat with `viewer@local.test` and `POST .../tasks/:id/comments` → **403**.
5. Repeat with `admin@local.test` and `GET /api/users` → **200**. Same GET as member → **403**.

---

## Core CRUD (verified)

Every verb is a real Express route. Buttons call those routes. Postman without a role still gets 403.

| Resource | Verb | Status | Endpoint | UI |
| --- | --- | --- | --- | --- |
| Users | create | Done | `POST /api/users` | Users → Create user |
| Users | read | Done | `GET /api/users`, `GET /api/users/:id` | Users table |
| Users | update | Fixed now | `PATCH /api/users/:id` | Users → **Edit** (name, email, role, optional password). Profile is self-only. |
| Users | deactivate | Done | `POST /api/users/:id/deactivate` | Users → Deactivate |
| Users | activate | Done | `POST /api/users/:id/activate` | Users → Activate |
| Projects | create | Done | `POST /api/projects` | Projects → New project (Admin) |
| Projects | read | Done | `GET /api/projects`, `GET /api/projects/:id` | Dashboard, Projects, Overview |
| Projects | update | Done | `PATCH /api/projects/:id` | Overview → Edit details (Admin/PM) |
| Projects | archive | Done | `POST /api/projects/:id/archive` | Projects → Archive (Admin) |
| Team | add | Done | `POST /api/projects/:id/members` | Team → Add member |
| Team | remove | Done | `DELETE /api/projects/:id/members/:userId` | Team → Remove |
| Team | change role | Done | `PATCH /api/projects/:id/members/:userId` | Team role dropdown (Admin assigns PM) |
| Tasks | create | Done | `POST /api/projects/:id/tasks` | Tasks → New task |
| Tasks | read | Done | `GET /api/projects/:id/tasks`, `GET /api/tasks/:id` | Tasks list, task page |
| Tasks | update | Done | `PATCH /api/tasks/:id` (send `version`) | Task page Save |
| Tasks | delete | Done | `DELETE /api/tasks/:id` | Task page Delete (PM/Admin) |
| Tasks | assign | Done | same PATCH, `assigneeId` | Task page Assignee (PM/Admin) |
| Tasks | status | Done | same PATCH, `status` | Task page Status |
| Comments | create | Done | `POST /api/tasks/:id/comments` | Task page Add comment |
| Comments | read | Done | `GET /api/tasks/:id/comments` | Task page comments list |
| Comments | delete | Done | `DELETE /api/comments/:id` | Task page Delete (author or PM/Admin) |

**Missing:** none. Extra (not required this step): `DELETE /api/projects/:id` Admin hard-delete.

---

## Demo accounts

Password for every account: `Password123!`

Seeded projects (Admin sees all on the dashboard): **Website relaunch**, **Mobile app beta**, **Campus hiring drive**, **Data cleanup sprint**. Re-seed is safe — it upserts by email.

**On Website relaunch**

| Email | Name | Role on the project |
| --- | --- | --- |
| `pm@local.test` | Priya Manager | project manager |
| `sana@local.test` | Sana Patel | second project manager |
| `member@local.test` | Arjun Member | team member (assigned “Draft landing page copy”) |
| `meera@local.test` | Meera Shah | team member |
| `kabir@local.test` | Kabir Rao | team member |
| `neha@local.test` | Neha Iyer | team member |
| `viewer@local.test` | Vikram Viewer | viewer |
| `rohan@local.test` | Rohan Gupta | extra viewer |

**Not on a project yet** (Admin can add them from **Users** or the **Team** tab)

| Email | Name | Why they exist |
| --- | --- | --- |
| `admin@local.test` | Asha Admin | global admin (does not need a membership) |
| `leela@local.test` | Leela Nair | spare person to add to the team live |
| `intern@local.test` | Dev Intern | spare person to add to the team live |
| `tara@local.test` | Tara Singh | spare person to add to the team live |

---

## Demo path (practice this)

Use two browsers, or one window plus Incognito.

1. **Admin** — log in. Open **Users**. Create a throwaway project, then **Delete** it (do not delete Website relaunch). On **Team**, assign a **project manager**.
2. **PM** — log in as `pm@local.test`. **Team** tab: add `leela@local.test` as team_member (PM cannot add another PM). **Tasks** tab (create/assign).
3. **Member** — log in as `member@local.test`. Open the assigned task, change status, add a comment. Try something forbidden (delete the task or manage team) — **403**.
4. **Viewer** — log in as `viewer@local.test`. You can read. You cannot edit or comment.
5. **Conflict** — open the same task as PM and member. Save as PM first. Save as member → **409** and “Reload latest”.

---

## How to run

UI: http://localhost:5173 — API: http://localhost:4000

This machine already has **PostgreSQL 18** (`postgresql-x64-18`) on port **5432**, database **neoboard**, password **postgres**. Migrate + seed already ran.

If the terminals stopped, start them again:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

If you ever need to re-seed (from `server/`):

```bash
npx prisma migrate deploy
npm run prisma:seed
```

`DATABASE_URL` in `server/.env`:

```
postgresql://postgres:postgres@localhost:5432/neoboard?schema=public&connect_timeout=5
```

Open http://localhost:5173 — login is pre-filled with the admin demo account.

---

## What is done vs later

**Done:** React pages, Express APIs, JWT + bcrypt, Prisma schema, migrate, seed, role 403s, task `version` + 409 UI, comments. Health is `database: "connected"`. Admin login and dashboard verified (Website relaunch, Users list).

**Not in this build:** cloud deploy, live WebSockets, file uploads, email.

---

## What you decided vs AI

**You:** Postgres not Mongo, global Admin vs per-project roles, no public signup, version + 409, server permissions, local only.

**AI typed:** folders, route files, React layouts. You explain from this tab.

---

## Likely questions

**Why not MongoDB?** Spec + related tables + version column.

**Why a roles table?** The use case listed `roles`. Names live in `roles`; users and memberships store FKs. API still returns role **names** as strings.

**How is authorization real?** Middleware on every write. Postman still 403.

**Where is the database?** This laptop. Windows PostgreSQL 18. No Firebase.

**What next if you had time?** Live updates, activity log, attachments.

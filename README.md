# PPP — MERN Stack App

A full-stack MERN application with separate **backend** and **frontend** folders.
Data is stored in a MongoDB database named **`PPP`**.

```
PPP(INHOUSE)/
├── backend/      Express + Mongoose REST API (port 5001)
└── frontend/     React + Vite SPA (port 5173)
```

## Prerequisites
- Node.js 18+ (tested on v24)
- MongoDB running locally at `mongodb://127.0.0.1:27017` (or set `MONGO_URI`)

## Backend

```bash
cd backend
npm install
npm run dev      # starts http://localhost:5001
```

Config lives in `backend/.env`:
```
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/PPP
CLIENT_URL=http://localhost:5173
```

### Seed default users
```bash
cd backend
npm run seed
```
Creates one account per panel:

| Role     | Email             | Password    |
|----------|-------------------|-------------|
| Admin    | admin@ppp.com     | admin123    |
| HR       | hr@ppp.com        | hr123456    |
| Employee | employee@ppp.com  | emp123456   |

### API
| Method | Route             | Description                        |
|--------|-------------------|------------------------------------|
| POST   | `/api/auth/login` | Login, returns JWT + user          |
| GET    | `/api/auth/me`    | Current user (requires Bearer JWT) |

## Panels & routing
- **Login** (`/login`) — shared sign-in for Admin & HR (and Employee).
- **/admin** — Admin panel (role `admin`)
- **/hr** — HR panel (role `hr`) — same 11 tabs as Admin
- **/employee** — Employee panel (role `employee`)

### Branding
The logo lives at `frontend/public/logo.svg` (used on the login screen, sidebar,
and favicon). To use the exact raster mark, drop a `logo.png` in the same folder and
point the `src` references at `/logo.png`.

### Role-based tabs (same login, different routes)
Admin and HR sign in from the **same** login screen, but see different panels.
Tabs are defined once in `src/panel/tabsConfig.jsx` with a `roles` list:

- **Admin** → all 11 tabs
- **HR** → 9 tabs (no **Salary**, no **Expenses** — financial data is Admin-only)

Enforcement is both UI and API: HR routes don't register admin-only tabs (typing
`/hr/salary` redirects to `/hr/employees`), the `/api/expenses` endpoint requires
role `admin` (HR gets 403), and `monthlySalary` is stripped from `/api/employees`
responses for non-admins.

### Admin & HR panel tabs
The full tab set (`src/panel/tabs/`):
1. **Employees** — directory with photo/designation/birthdate + Add/Edit/Delete
2. **Salary** — monthly salary per person + payroll totals
3. **Leaves** — who took leave on which days (filter by status)
4. **Leaves Remaining** — paid-leave balance per employee
5. **Upcoming Holidays** — approved employee time-off on a calendar
6. **Special Days** — national/company holidays on a calendar + Add
7. **Expenses** — monthly expense total + Add expense
8. **Leave Applications** — pending requests with Approve/Reject
9. **In / Out** — daily check-in / check-out times
10. **Documents** — Aadhaar, PAN, etc. per employee + Add
11. **Birthdays** — upcoming birthdays, soonest first

> Tabs 5 & 6 use an in-app calendar. Real Google Calendar API sync needs Google
> OAuth credentials + a calendar ID (backend hook ready to add).

### More API routes
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/employees` | List / create employees |
| PUT/DELETE | `/api/employees/:id` | Update / delete |
| GET/POST | `/api/leaves` | List / create leaves |
| GET | `/api/leaves/balance` | Remaining-leave per employee |
| PATCH | `/api/leaves/:id/status` | Approve / reject |
| GET/POST/DELETE | `/api/expenses` | Monthly expenses |
| GET/POST | `/api/attendance` | Check-in/out records |
| GET/POST/DELETE | `/api/documents` | Employee documents |
| GET/POST/DELETE | `/api/holidays` | Special days |

All above require a Bearer JWT with role `admin` or `hr`.

Routes are role-guarded: after login, users are redirected to their own panel and
cannot open another role's panel. There is no landing page — `/` redirects to the
login screen (or the user's panel if already signed in).

## Frontend

```bash
cd frontend
npm install
npm run dev      # starts http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:5001`, so run the backend
alongside it.

## Run both
Open two terminals: one in `backend` (`npm run dev`), one in `frontend`
(`npm run dev`), then visit http://localhost:5173.

<div align="center">

# PeoplePay360

### Integrated HR & Payroll Operations Platform

Employee master data, contracts, attendance, leave, and payroll — as one connected business flow, not five disconnected CRUD screens.

<br>

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

**400 employees · 400 contracts · 3,600 attendance records · 2,490 payslips · 17,430 payslip lines**

</div>

---

## Table of Contents

| | |
| :-- | :-- |
| [1. What This Is](#1-what-this-is) | [7. Role-Based Access Control](#7-role-based-access-control) |
| [2. Quick Start](#2-quick-start) | [8. Verification Suite](#8-verification-suite) |
| [3. Demo Accounts](#3-demo-accounts) | [9. API Reference](#9-api-reference) |
| [4. The Connected Flow](#4-the-connected-flow) | [10. SQL Cheat-Sheet for Evaluators](#10-sql-cheat-sheet-for-evaluators) |
| [5. Business Rules That Matter](#5-business-rules-that-matter) | [11. Design System](#11-design-system) |
| [6. Project Structure](#6-project-structure) | [12. Roadmap](#12-roadmap) |

---

## 1. What This Is

Most HR tools store employees, attendance, leave, and salary as **separate records**. Real payroll teams need them to work **together**:

- An employee may hold several contracts over time — payroll must use the one that applies to the **payroll period**, not the newest one.
- Working hours come from an assigned **schedule**, not a typed-in number.
- Leave balances are consumed by **approval**, not by submission.
- Salary is produced by **ordered, configurable rules** — not hardcoded arithmetic.
- Problems (missing contract, missing bank details, duplicate payslip) must surface **before** money moves.

PeoplePay360 implements all of that as a single operational flow, with role-based permissions and a full audit trail.

---

## 2. Quick Start

### Prerequisites

| Requirement | Version | Notes |
| :--- | :--- | :--- |
| Node.js | 18 or newer | 20+ recommended |
| PostgreSQL | 14 or newer | A hosted instance (Neon, Supabase, RDS) works fine |
| npm | 9 or newer | Ships with Node |

### Install

```bash
git clone <repository-url>
cd peoplePay-360-Hr-odoo2026

cd backend  && npm install
cd ../frontend && npm install
```

### Configure

```bash
cd backend
cp .env.example .env
```

Then edit `backend/.env`:

```ini
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@host:5432/peoplepay360?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"

# Optional — required only for the "Send Payslips" feature.
# Use a Gmail App Password, not your account password.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM="PeoplePay360 HR & Payroll <no-reply@peoplepay360.com>"
AUTO_EMAIL_ON_COMPUTE=false
```

> **Leaving SMTP blank is safe.** Everything works except emailing payslips, and that action fails with a clear
> *"Email delivery is not configured"* message rather than silently pretending to send.

### Create the database and seed it

```bash
cd backend
npm run prisma:generate     # generate the Prisma client
npm run prisma:push         # create the schema
npm run seed                # populate 400 employees and full payroll history
```

### Run

Two terminals:

```bash
# Terminal 1 — API on http://localhost:5000
cd backend && npm start

# Terminal 2 — UI on http://localhost:5173
cd frontend && npm run dev
```

Open **http://localhost:5173** and sign in with any account from the table below — the login screen has one-click buttons for all five.

> On Windows you can also use `start.bat`; on macOS/Linux, `./start.sh`.

### Health check

```bash
curl http://localhost:5000/api/health
# {"status":"UP","platform":"PeoplePay360 HR & Payroll Engine","database":"PostgreSQL"}
```

---

## 3. Demo Accounts

The seed creates **exactly one administrator**. Every other account sits below it in the permission hierarchy.

| Role | Email | Password | Employee |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@peoplepay360.com` | `Admin@123` | EMP000 · System Administrator |
| **HR Manager** | `hrmanager@peoplepay360.com` | `HR@123` | EMP002 · Priya Desai |
| **HR Payroll User** | `payrolluser@peoplepay360.com` | `Payroll@123` | EMP004 · Amit Verma |
| **HR Payroll Manager** | `payrollmgr@peoplepay360.com` | `PayrollMgr@123` | EMP003 · Neha Patel |
| **Employee** | `rahul@peoplepay360.com` | `Rahul@123` | EMP001 · Rahul Sharma |

### What the seed builds

| Account distribution | | Records |
| :--- | ---: | :--- |
| Admin | 1 | 400 employees, all with an active contract |
| HR Manager | 25 | 3,601 attendance records with real exception mix |
| HR Payroll User | 34 | 800 leave allocations, 200 requests |
| HR Payroll Manager | 20 | 9 payruns spanning every lifecycle status |
| Employee | 320 | 2,490 payslips · 17,430 itemised lines |
| **Total** | **400** | 6 departments · 15 job positions · 7 salary rules |

Payruns deliberately cover **DRAFT, COMPUTED, WARNING, VALIDATED and PAID**, so the full lifecycle and the warning surface can both be demonstrated without creating anything.

---

## 4. The Connected Flow

```
                          ┌──────────────────────┐
                          │   EMPLOYEE (hub)     │
                          │  identity · dept ·   │
                          │  manager · schedule  │
                          └──────────┬───────────┘
                                     │
        ┌───────────────┬────────────┼────────────┬────────────────┐
        ▼               ▼            ▼            ▼                ▼
  ┌───────────┐  ┌────────────┐ ┌─────────┐ ┌──────────┐  ┌──────────────┐
  │ CONTRACTS │  │  WORKING   │ │ ATTEND- │ │ TIME OFF │  │  PROFILE     │
  │ history + │  │ SCHEDULE   │ │  ANCE   │ │ allocate │  │  CHANGE      │
  │ period    │  │ weekly hrs │ │ worked  │ │ → request│  │  REQUESTS    │
  │ selection │  │ derived    │ │ hours   │ │ → approve│  │  (maker /    │
  └─────┬─────┘  └──────┬─────┘ └────┬────┘ └────┬─────┘  │   checker)   │
        │               │            │           │        └──────────────┘
        └───────────────┴──────┬─────┴───────────┘
                               ▼
              ┌────────────────────────────────────┐
              │  SALARY STRUCTURE + ORDERED RULES  │
              │  1 BASIC → 2 HRA → 3 ALLOWANCE →   │
              │  4 GROSS → 5 PF → 6 TAX → 7 NET    │
              └────────────────┬───────────────────┘
                               ▼
              ┌────────────────────────────────────┐
              │  PAYRUN — two-step wizard          │
              │  scope+period → select employees   │
              │  DRAFT → COMPUTE → VALIDATE → PAID │
              └────────────────┬───────────────────┘
                               ▼
              ┌────────────────────────────────────┐
              │  PAYSLIPS — itemised breakdown,    │
              │  PDF export, bulk email dispatch   │
              └────────────────┬───────────────────┘
                               ▼
              ┌────────────────────────────────────┐
              │  LIVE DASHBOARD + AUDIT TRAIL      │
              │  filtered by period · department · │
              │  employee type — all from SQL      │
              └────────────────────────────────────┘
```

---

## 5. Business Rules That Matter

These are the parts that separate a real payroll engine from a CRUD app.

### Period-based contract selection

An employee can hold many contracts. Payroll resolves the one **valid for the payroll period**, never simply the latest.

```
Contract A  ₹85,000   15 Jan 2025 ──────────► 05 Sep 2026   EXPIRED
Contract B  ₹70,000                06 Sep 2026 ──────────►  ACTIVE

August 2026 payrun  → uses Contract A (₹85,000)
October 2026 payrun → uses Contract B (₹70,000)
```

Creating a new active contract **automatically closes the previous one** (end-dated to the day before, marked `EXPIRED`, with an audit note). Concurrent active contracts are impossible by construction.

### Leave balance is consumed by approval, not submission

```
Submit 2 days  → status PENDING   → balance unchanged (17 remaining)
Approve        → status APPROVED  → taken +2, remaining −2  (15 remaining)
Reject         → status REJECTED  → balance unchanged
```

Approval runs inside a **database transaction**: the request status and the allocation move together or not at all. Requesting more days than remain is refused with the exact balance in the message.

### Ordered, configurable salary rules

Rules execute in ascending sequence, each result feeding the next through a shared context:

| Seq | Code | Category | Type | Expression |
| ---: | :--- | :--- | :--- | :--- |
| 1 | `BASIC` | BASIC | PERCENTAGE | `0.60 * WAGE` |
| 2 | `HRA` | ALLOWANCE | PERCENTAGE | `0.20 * BASIC` |
| 3 | `ALLOWANCE` | ALLOWANCE | PERCENTAGE | `0.28 * WAGE` |
| 4 | `GROSS` | GROSS | FORMULA | `BASIC + HRA + ALLOWANCE` |
| 5 | `PF` | DEDUCTION | PERCENTAGE | `0.12 * BASIC` |
| 6 | `TAX` | DEDUCTION | FIXED | `200` |
| 7 | `NET` | NET | FORMULA | `GROSS - PF - TAX` |

Available in every formula: `WAGE`, `BASE_WAGE`, `CONTRACT_WAGE`, `EFFECTIVE_WAGE`, `WORKED_DAYS`, `TOTAL_DAYS`, `PAID_LEAVES`, `UNPAID_LEAVES`, `OVERTIME_HOURS`, `ATTENDANCE_RATIO`, plus every rule code with a **lower** sequence.

Rules are validated on save — a code must be a valid identifier, sequences must be unique, and a formula may not reference a rule that runs later. Change `TAX` to `500` and the next computed payslip reflects it, with no code change.

### Warnings before payment

Validation surfaces problems while they can still be fixed: missing contract, missing bank details, duplicate payslip, non-positive net, empty payrun. Critical findings block finalisation. Once a payrun is **PAID** it becomes an immutable historical record and cannot be recomputed.

### Schedule-derived hours

Weekly hours are computed from the day pattern, never typed in:

```
5 days × (09:00 → 18:00 − 1h break) = 5 × 8h = 40h / week
```

---

## 6. Project Structure

```
peoplePay-360-Hr-odoo2026/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # 19 models, 11 enums
│   │   └── seed-enterprise.js       # entrypoint → scripts/seed-all.js
│   ├── scripts/
│   │   ├── seed-all.js              # master seed (400 users, 1 admin)
│   │   └── repair-data-integrity.js # idempotent data repair, supports --dry-run
│   └── src/
│       ├── config/                  # env + Prisma client
│       ├── middleware/
│       │   ├── auth.middleware.js   # JWT verification
│       │   ├── role.middleware.js   # authorize(...roles)
│       │   ├── roles.js             # the cumulative role hierarchy
│       │   └── error.middleware.js  # Prisma → clean 4xx translation
│       ├── features/                # one folder per domain
│       │   ├── auth/                # login, signup, session
│       │   ├── employees/           # CRUD, smart-button counts, change requests
│       │   ├── contracts/           # history + period-applicable resolution
│       │   ├── schedules/           # weekly hour derivation
│       │   ├── attendance/          # worked hours, status, corrections, policy
│       │   ├── time-off/            # types, allocations, requests, approvals
│       │   ├── salary/              # structures, rules, rule validation
│       │   ├── payroll/             # payrun wizard, engine, validator
│       │   ├── payslips/            # breakdown, PDF, email dispatch
│       │   ├── dashboard/           # live SQL aggregation
│       │   ├── users/               # account & role administration
│       │   └── audit/               # immutable audit log
│       └── utils/                   # response, logger, mailer, pdf-fonts, paginate
│
├── frontend/src/
│   ├── api/client.js                # axios + JWT + session-expiry handling
│   ├── context/AuthContext.jsx
│   ├── components/                  # Sidebar, TopHeader, ControlPanel,
│   │                                #   Pagination, ErrorBoundary
│   ├── pages/                       # one page per module, plus
│   │                                #   AccessDenied (403) and NotFound (404)
│   └── utils/roles.js               # mirrors the backend hierarchy
│
├── verify/                          # automated verification suite
└── README.md
```

Each feature folder follows the same shape: `*.routes.js → *.controller.js → *.service.js → *.repository.js`, so business logic never sits in a route handler and data access never sits in a service.

---

## 7. Role-Based Access Control

The five roles are **cumulative** — each inherits everything below it:

```
EMPLOYEE  <  HR_MANAGER  <  HR_PAYROLL_USER  <  HR_PAYROLL_MANAGER  <  ADMIN
```

This hierarchy is declared once (`backend/src/middleware/roles.js`, mirrored in `frontend/src/utils/roles.js`) and every route expresses permissions as `atLeast('HR_MANAGER')` rather than a hand-written list — so a role can never be accidentally skipped.

| Capability | Employee | HR Manager | Payroll User | Payroll Mgr | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Own profile, attendance, leave balance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create attendance entry / leave request | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own payslips | ✅ | — | ✅ | ✅ | ✅ |
| Employees — create / update / delete | — | ✅ | ✅ | ✅ | ✅ |
| Contracts & Working Schedules | — | ✅ | ✅ | ✅ | ✅ |
| Attendance corrections | — | ✅ | ✅ | ✅ | ✅ |
| Approve / refuse leave, allocate balance | — | ✅ | ✅ | ✅ | ✅ |
| Payruns — create, compute, validate, pay | — | — | ✅ | ✅ | ✅ |
| Payslips — PDF, email, bulk send | — | — | ✅ | ✅ | ✅ |
| Salary structures & rules — **read** | — | structures | ✅ | ✅ | ✅ |
| Salary structures & rules — **write** | — | — | — | ✅ | ✅ |
| Users, roles, attendance policy | — | — | — | — | ✅ |

Enforcement happens in **three independent layers**, so hiding a menu item is never the only defence:

1. **Navigation** — the sidebar renders only permitted modules.
2. **Routing** — every route declares a minimum role; a direct URL shows a proper **403 Access Restricted** page naming your role and the one required.
3. **API** — every endpoint authorises independently and returns `403` regardless of what the UI did.

> HR Manager keeps **read** access to salary *structures* because the contract form needs to select one. They have no access to salary rules, payruns, or payslips.

---

## 8. Verification Suite

A dependency-free harness that proves the platform works end to end. Every check is tagged with the requirement it satisfies (`A1`–`A7`, `B1`–`B9`, `RBAC`).

```bash
npm run verify           # full sweep: static + live API + database
npm run verify:static    # no server, no database needed
npm run verify:readonly  # skip every write
npm run verify:full      # also runs a production frontend build
npm run verify:proxy     # go through the Vite proxy, exactly like the browser
```

It runs **100+ assertions across three layers**:

| Layer | What it proves |
| :--- | :--- |
| **Static** | Every module loads; every route resolves to a real controller method; frontend and backend agree on response shapes; every route declares a minimum role; 403/404/error screens exist and are wired; `.env` keys are present and non-empty; the payslip PDF can actually render its currency symbol |
| **Live API** | All five roles authenticate; the full RBAC matrix holds across every role and endpoint; permissions never invert across the hierarchy; period-contract resolution; schedule hour derivation; leave balance consumption and refusal; the complete payrun lifecycle with reconciled totals; PDF output; dashboard filters actually change results; malformed input returns clean 4xx without leaking internals |
| **Database** | No concurrent active contracts and no overlapping ranges; `remaining = allocated − taken` everywhere; payrun totals equal the sum of their payslips; `net = gross − deductions`; no duplicate payslips; every payslip uses a contract covering its period; attendance never checks out before checking in |

Writes made during a run are tagged and **cleaned up automatically**, restoring any leave balance consumed. Exit code is `0` on success, so it drops straight into CI.

If the database ever drifts, `backend/scripts/repair-data-integrity.js` reconciles it — run with `--dry-run` first to see what it would change.

---

## 9. API Reference

All routes are prefixed with `/api`. Every route except `/auth/*` and `/health` requires `Authorization: Bearer <token>`.

<details>
<summary><b>Authentication</b></summary>

| Method | Endpoint | Min role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | — | Exchange credentials for a JWT |
| `POST` | `/auth/signup` | — | Register an account |
| `GET` | `/auth/me` | any | Current session identity |

</details>

<details>
<summary><b>Employees & Organisation</b></summary>

| Method | Endpoint | Min role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/employees` | Employee¹ | Paginated list with search and filters |
| `GET` | `/employees/:id` | Employee¹ | Detail with smart-button counts |
| `POST` `PUT` `DELETE` | `/employees[/:id]` | HR Manager | Create, update, archive |
| `GET` `POST` | `/employees/profile-change-requests` | Employee | Submit / list change requests |
| `PATCH` | `/employees/profile-change-requests/:id/approve\|reject` | HR Manager | Review a change request |
| `GET` `POST` | `/departments`, `/departments/positions` | Employee / HR Manager | Read / create |

¹ Employees are automatically scoped to their own record.

</details>

<details>
<summary><b>Contracts, Schedules & Attendance</b></summary>

| Method | Endpoint | Min role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/contracts` | HR Manager | Paginated contract history |
| `GET` | `/contracts/lookup-applicable` | HR Manager | Resolve the contract valid for a date |
| `POST` `PUT` | `/contracts[/:id]` | HR Manager | Create (auto-expires the previous) / update |
| `GET` | `/schedules[/:id]` | Employee | Schedules with derived weekly hours |
| `POST` `PUT` | `/schedules[/:id]` | HR Manager | Create / update a weekly pattern |
| `GET` `POST` | `/attendance` | Employee¹ | List / create an entry |
| `GET` | `/attendance/current-status` | Employee | Live check-in state |
| `POST` | `/attendance/quick-toggle` | Employee | Check in / check out |
| `PUT` | `/attendance/:id` | HR Manager | Manual correction |
| `GET` `PUT` | `/attendance/policy` | Employee / **Admin** | Read / update thresholds |

</details>

<details>
<summary><b>Time Off</b></summary>

| Method | Endpoint | Min role | Description |
| :--- | :--- | :--- | :--- |
| `GET` `POST` | `/time-off/types` | Employee / HR Manager | Leave types and their policies |
| `GET` `POST` | `/time-off/allocations` | Employee¹ / HR Manager | Balance ledger |
| `GET` `POST` | `/time-off/requests` | Employee¹ | List / submit |
| `PATCH` | `/time-off/requests/:id/approve\|reject` | HR Manager | Approve (consumes balance) or refuse |

</details>

<details>
<summary><b>Salary Configuration</b></summary>

| Method | Endpoint | Min role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/salary/structures[/:id]` | HR Manager | Structures with their ordered rules |
| `POST` `PUT` | `/salary/structures[/:id]` | Payroll Manager | Create / update |
| `GET` | `/salary/rules` | Payroll User | Rules in execution order |
| `POST` `PUT` | `/salary/rules[/:id]` | Payroll Manager | Create / update (validated on save) |

</details>

<details>
<summary><b>Payroll & Payslips</b></summary>

| Method | Endpoint | Min role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/payruns[/:id]` | Payroll User | Batches with payslips and warnings |
| `GET` | `/payruns/eligible-employees` | Payroll User | Wizard step 2 — eligible staff for a period |
| `POST` | `/payruns` | Payroll User | Create the batch from selected employees |
| `POST` | `/payruns/:id/compute\|submit\|validate\|mark-paid` | Payroll User | Drive the lifecycle |
| `GET` | `/payslips[/:id]` | Employee¹ | Payslips with itemised lines |
| `GET` | `/payslips/:id/pdf` | Employee¹ | Printable PDF |
| `POST` | `/payslips/:id/send`, `/payslips/bulk-send` | Payroll User | Email individually or in bulk |

</details>

<details>
<summary><b>Dashboard, Users & Audit</b></summary>

| Method | Endpoint | Min role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Employee | KPIs, charts, alerts — filterable by `period`, `departmentId`, `employeeType` |
| `GET` | `/dashboard/employee-portal` | Employee | Self-service summary |
| `GET` | `/audit-logs` | HR Manager | Immutable action trail |
| `GET` `POST` `PUT` `DELETE` | `/users[/:id]` | **Admin** | Account and role administration |
| `GET` | `/health` | — | Liveness probe |

</details>

---

## 10. SQL Cheat-Sheet for Evaluators

Prisma maps **tables** to `snake_case` but keeps **columns** in `camelCase`, so column names must be double-quoted.

<details>
<summary><b>Q1 · Which contract applies to September 2026?</b></summary>

```sql
SELECT c.id, e."employeeId", e.name, c.wage, c."startDate", c."endDate", c.status
FROM contracts c
JOIN employees e ON c."employeeId" = e.id
WHERE e."employeeId" = 'EMP001'
  AND c."startDate" <= DATE '2026-09-30'
  AND (c."endDate" >= DATE '2026-09-01' OR c."endDate" IS NULL)
  AND c.status = 'ACTIVE'
ORDER BY c."startDate" DESC
LIMIT 1;
```
</details>

<details>
<summary><b>Q2 · How are worked hours derived from check-in/out?</b></summary>

```sql
SELECT a.date, a."checkIn", a."checkOut", a."workedHours", a.status,
       ROUND((EXTRACT(EPOCH FROM (a."checkOut" - a."checkIn")) / 3600.0)::numeric, 2)
         AS raw_span_hours
FROM attendance a
JOIN employees e ON a."employeeId" = e.id
WHERE e."employeeId" = 'EMP001'
  AND a."checkOut" IS NOT NULL
ORDER BY a.date DESC
LIMIT 5;
```

`workedHours` is the span minus the configured break, classified against the attendance policy.
</details>

<details>
<summary><b>Q3 · Do leave balances reconcile?</b></summary>

```sql
SELECT e.name, t.name AS leave_type,
       a."allocatedDays", a."takenDays", a."remainingDays",
       (a."allocatedDays" - a."takenDays") AS expected_remaining
FROM time_off_allocations a
JOIN employees e ON a."employeeId" = e.id
JOIN time_off_types t ON a."timeOffTypeId" = t.id
WHERE e."employeeId" = 'EMP001';
```
</details>

<details>
<summary><b>Q4 · Salary rules in execution order, and the lines they produced</b></summary>

```sql
-- The configured rules
SELECT r.sequence, r.code, r.name, r.category, r."calculationType", r."valueExpression"
FROM salary_rules r
ORDER BY r.sequence ASC;

-- The lines generated on the most recent payslip
SELECT l.sequence, l.code, l.name, l.category, l.amount
FROM payslip_lines l
JOIN payslips p ON l."payslipId" = p.id
WHERE p.id = (SELECT MAX(id) FROM payslips)
ORDER BY l.sequence ASC;
```
</details>

<details>
<summary><b>Q5 · Live dashboard KPIs</b></summary>

```sql
SELECT COALESCE(SUM(p."netSalary"), 0) AS total_net_paid,
       COUNT(p.id)                     AS payslips_paid,
       ROUND(AVG(p."netSalary")::numeric, 2) AS average_net
FROM payslips p
JOIN payruns pr ON p."payrunId" = pr.id
WHERE pr.status = 'PAID';
```
</details>

<details>
<summary><b>Q6 · Integrity proofs (all should return zero rows)</b></summary>

```sql
-- No employee may hold two active contracts
SELECT e."employeeId", e.name, COUNT(*) AS active_contracts
FROM contracts c
JOIN employees e ON c."employeeId" = e.id
WHERE c.status = 'ACTIVE'
GROUP BY e."employeeId", e.name
HAVING COUNT(*) > 1;

-- Every payslip must satisfy net = gross - deductions
SELECT "payslipNumber", "grossSalary", "totalDeductions", "netSalary"
FROM payslips
WHERE ABS("netSalary" - ("grossSalary" - "totalDeductions")) > 0.05
  AND status IN ('COMPUTED', 'VALIDATED', 'PAID');

-- Exactly one administrator
SELECT role, COUNT(*) AS accounts FROM users GROUP BY role ORDER BY accounts DESC;
```
</details>

---

## 11. Design System

Styled after **Odoo Enterprise** — a restrained four-colour palette, no decorative gradients competing with data.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| Primary | `#714B67` | Brand, primary actions, table headers |
| Accent | `#00A09D` | Success states, net-pay emphasis |
| Slate | `#2C3E50` / `#1E293B` | Typography and headers |
| Canvas | `#F8F9FA` / `#FFFFFF` | Page background / card surfaces (`#E2E8F0` borders) |

Recurring patterns:

- **Control panel** — breadcrumb, title, search, filters and actions in a consistent header on every list.
- **Smart stat buttons** — live related-record counts on the employee form that open pre-filtered views.
- **Status pipeline** — `DRAFT → COMPUTED → VALIDATED → PAID` shown as a ribbon on payruns.
- **Kanban and list views** — the same records, two densities, one shared form.
- **Purposeful empty and error states** — a restricted page shows a 403 explaining which role is required, never a misleading empty table.

---

## 12. Roadmap

Work prioritised for the next iteration:

| Area | Enhancement |
| :--- | :--- |
| **Payroll** | Off-cycle and arrears runs; retro-adjustments when a contract is backdated |
| **Compliance** | Statutory slabs for PF/ESI/TDS with financial-year versioning; Form 16 generation |
| **Time** | Overtime and shift-differential rules feeding salary rules directly |
| **Approvals** | Multi-level chains with delegation and out-of-office routing |
| **Self-service** | Investment declarations, reimbursement claims, document vault |
| **Analytics** | Cost-to-company forecasting, attrition and headcount trend reporting |
| **Platform** | Multi-company and multi-currency support; scheduled payroll runs |
| **Integration** | Bank disbursement file export (NEFT/RTGS); biometric device ingestion |

---

<div align="center">

**PeoplePay360** · Built for the Odoo Hackathon 2026

Run `npm run verify` to confirm the platform is working end to end.

</div>

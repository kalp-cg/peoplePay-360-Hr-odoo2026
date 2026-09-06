# PeoplePay360 verification harness

One command that answers "is the whole thing actually working, front and back?"
Every check is tagged with the requirement id it proves, taken straight from the
problem statement (`A1`-`A7` = HR backend/config, `B1`-`B9` = operational flows,
`RBAC` = the five roles in section 3).

## Run it

```bash
# full sweep: static wiring + live API + database invariants
npm run verify

# no server and no database needed - pure code/wiring checks
npm run verify:static

# don't create anything (no test payrun, no leave request)
npm run verify:readonly

# also run `vite build` on the frontend
npm run verify:full

# go through the Vite proxy, exactly like the browser does
npm run verify:proxy
```

Start the stack first for anything other than `verify:static`:

```bash
cd backend  && npm start      # http://localhost:5000
cd frontend && npm run dev    # http://localhost:5173
```

The harness auto-detects port 5173 (Vite proxy) and falls back to 5000.
Exit code is `0` when there are no failures, `1` otherwise, so it drops straight
into CI or a pre-demo smoke script.

## What the three layers cover

**`checks.static.js`** - no server, no database.

- every backend module parses and loads (entry points are syntax-checked, not run)
- every `router.get/post/...` handler resolves to a controller method that exists
- every namespace is mounted in `app.js`
- **response-shape drift**: endpoints whose repository returns a
  `{ data, total, page, limit, totalPages }` envelope vs. frontend code that
  treats the payload as a bare array - this is the failure that only shows up as
  a white screen when a user opens the page
- no frontend call targets an unmounted path
- `backend/.env` defines every key `backend/.env.example` documents
- the Vite proxy target matches the backend `PORT`

**`checks.api.js`** - live HTTP, exactly the path the browser takes.

- auth: all five roles log in, bad password 401, missing/forged token 401
- **RBAC matrix**: for 11 protected endpoints, every one of the five roles is
  probed and must be allowed or 403'd exactly as section 3 specifies
- data scoping: `EMPLOYEE` sees only their own employee record, attendance and
  payslips - salary data must not leak across employees
- A2 period contracts: `lookup-applicable` resolves a contract whose range
  covers the date, and returns nothing for a date before any contract
- A3 schedules: `weeklyHours` recomputed from the day rows and compared
- B3 attendance: worked hours never exceed the check-in/check-out span
- B4 the balance rule: approve a request and assert `takenDays`/`remainingDays`
  moved by exactly the duration; an over-draw is refused; a rejection changes nothing
- A6 rule ordering: no duplicate sequences, all categories present, and no
  formula references a rule code defined later in the sequence (those silently
  evaluate to 0)
- B5-B8 full payroll lifecycle: eligible employees -> create -> compute ->
  reconcile gross/deductions/net against the line items -> confirm the payslip
  used the period-applicable contract -> validate -> mark paid -> confirm a paid
  run cannot be recomputed -> PDF magic bytes -> bulk email dispatch count
- A7/B9 dashboard: required KPI cards, charts, alerts, and proof that the
  period / department / employee-type filters actually change the aggregation
- `ROBUST`: malformed input returns a clean 4xx instead of a 500 carrying a raw
  Prisma stack trace and server file paths

**`checks.data.js`** - Prisma straight at PostgreSQL.

- no employee has concurrent `ACTIVE` contracts, and no contract date ranges overlap
- `remainingDays == allocatedDays - takenDays` for every allocation, and
  `takenDays` reconciles with the sum of approved requests
- salary rule codes are unique per structure; every structure has `BASIC` and `NET`
- no duplicate payslip per payrun/employee, every computed payslip has line
  items, `net == gross - deductions`, and its contract covers the payroll period
- attendance: no check-out before check-in, no double-booked days
- demo readiness: seed coverage per module, paid payroll history for the trend
  chart, bank details present on active employees

## Writes and cleanup

The default run creates one payrun named `[VERIFY] Automated Verification <ts>`
and a couple of tagged leave requests, then deletes them and restores the leave
balances it consumed. Pass `--no-cleanup` to keep them, or `--readonly` to skip
every write.

## Reading the output

- `PASS` - verified.
- `FAIL` - a code defect. Fix before demoing.
- `WARN` - data or configuration gap, not broken code (missing SMTP credentials,
  an employee with no contract, thin seed history). These will not crash
  anything but they will show up on screen during the walkthrough.

The summary ends with a per-requirement coverage table so you can see at a glance
which parts of the problem statement are proven and which still have a gap.

# PeoplePay360: Technical Evaluation & Hackathon Demo Mastery Guide

---

## 1. Quick-Fire Evaluator Q&A

### Q1: "Where is your payroll calculation?"
**A**: Located in `backend/src/features/payroll/payroll.engine.js`. It is a pure, deterministic, sequential rule evaluation engine that receives Employee, Contract, Schedule, Attendance, and Time Off context and produces immutable payslip lines.

### Q2: "How do you select the correct contract?"
**A**: Located in `backend/src/features/contracts/contract.service.js` and called by `payroll.service.js`. It queries for the contract where `startDate <= periodEndDate` and `(endDate >= periodStartDate OR endDate IS NULL)`. It does **not** assume the latest contract.

### Q3: "How are salary rules executed?"
**A**: Rules are executed strictly in ascending order of `sequence` (1 to N) inside `payroll.engine.js`. The output of each rule (e.g. `BASIC`) is stored in an accumulator context dictionary so that downstream rules (e.g. `HRA` at 20% of Basic, `GROSS`, `PF` at 12% of Basic, `NET`) can reference previous values dynamically.

### Q4: "How do you prevent unauthorized payroll access?"
**A**: In `backend/src/middleware/role.middleware.js`. Every protected endpoint checks the decoded JWT user against the required permissions. The frontend UI permissions are purely cosmetic; the Express backend rejects any unauthorized action with HTTP 403 Forbidden.

### Q5: "Where is the leave balance updated?"
**A**: In `backend/src/features/time-off/timeoff.service.js`. When an HR Manager calls `PATCH /api/time-off/requests/:id/approve`, an ACID transaction updates the request status to `APPROVED`, increments `allocation.taken`, and decrements `allocation.remaining`.

### Q6: "Where do dashboard numbers come from?"
**A**: In `backend/src/features/dashboard/dashboard.service.js`. Every KPI card and chart runs live PostgreSQL aggregations (e.g. `SUM(net_salary)`, `AVG(net_salary)`, `GROUP BY department`) across real database records. Zero hardcoded mock numbers.

### Q7: "What happens if payroll fails halfway?"
**A**: All multi-step payroll computations, payslip generation, and status updates are wrapped in a PostgreSQL transaction (`prisma.$transaction`). If any record fails or throws an exception, the entire transaction **rolls back** automatically, preventing corrupted or orphan payslips.

### Q8: "Is your salary calculation AI?"
**A**: **No.** The PRD explicitly forbids AI from calculating money. Salary calculation is 100% deterministic, rule-based, and auditable. AI is only used as an analytical explainer (e.g. explaining salary deltas between months) and anomaly detector on top of real database facts.

### Q9: "Why PostgreSQL?"
**A**: Because HR and payroll have deep relational interdependencies (Employee ➔ Contract ➔ Schedule ➔ Attendance ➔ Leaves ➔ Payrun ➔ Payslip) that demand strict foreign key constraints, index-driven period queries, and ACID transactional rollback guarantees.

---

## 2. The 5-Minute Hackathon Demo Script

### Minute 1: The HR Foundation (Login as Admin)
- **Action**: Log in as `admin@peoplepay360.com`.
- **Showcase**:
  - Employee List & Kanban view.
  - Open Employee Rahul Sharma (`EMP001`).
  - Point to **Odoo Smart Stat Buttons**: Contracts [2], Attendance [22], Time Off [18d], Payslips [3].
  - Show Contract History: Contract 2025 (₹40,000) vs. Current 2026 Contract (₹50,000).
  - Show Working Schedule (Auto-computed 40 hrs/week).
  - Show Salary Structure ("Regular Salary") with sequential rules.

### Minute 2: Operational Data (Login as Employee)
- **Action**: Switch to `rahul@peoplepay360.com` (using Demo Role Switcher).
- **Showcase**:
  - Employee Self-Service portal.
  - Click **Check-In** / **Check-Out** (demonstrates worked hours computation).
  - View Leave Balance: 20 Days Allocated.
  - Submit Time Off request for 2 days ("Annual Vacation"). Status shows `PENDING`.

### Minute 3: HR Approval & Live Ledger (Login as HR Manager)
- **Action**: Switch to `hrmanager@peoplepay360.com`.
- **Showcase**:
  - Time Off approval queue.
  - Click **Approve**.
  - Immediately inspect Rahul's leave allocation: Taken becomes `2`, Remaining updates to `18`.
  - Show that balance deduction happened dynamically via backend transaction.

### Minute 4: Payrun Processing (Login as Payroll User)
- **Action**: Switch to `payrolluser@peoplepay360.com`.
- **Showcase**:
  - Open **Payruns** ➔ **Create Payrun**.
  - **Step 1**: Select Structure ("Regular Salary") and Period ("September 2026").
  - **Step 2**: Eligible employees list appears. Select Rahul and team. Click **Create Payrun**.
  - Click **[ Compute ]**: The Salary Rule Engine executes in sequence. Payslip lines generate in real-time.
  - Click **[ Validate ]**: System runs payroll validator. Shows clean status or alerts (e.g., missing bank account warning).
  - Click **[ Mark Paid ]**: Transitions payrun to `PAID`. Records locked for historical audit.

### Minute 5: Payslip PDF, Email & Live Dashboard
- **Action**:
  - Open Rahul's generated Payslip:
    - Basic: ₹30,000 | HRA: ₹10,000 | Allowance: ₹10,000 ➔ Gross: ₹50,000
    - PF: -₹3,600 | Tax: -₹2,500 ➔ Net: ₹43,900.
  - Click **[ Print Payslip ]**: Instant PDF rendered with company header, worked days, and itemized breakdown.
  - Click **[ Send Payslips ]**: Simulates email delivery.
  - Navigate to **Dashboard**:
    - Live KPI cards update immediately with the new payout totals.
    - Department salary cost chart, attendance health donut, and leave utilization graph reflect live DB state.
  - **Bonus WOW**: Ask AI Assistant: *"Why did Rahul's salary change this month?"* ➔ AI retrieves real database records and answers: *"Rahul's contract was upgraded to ₹50,000 wage from ₹40,000, and 2 approved paid leave days were processed."*

---

## 3. Evaluator Verification Checkpoints

- **Data Integrity**: Foreign keys ensure an employee cannot be deleted if active contracts or payslips exist.
- **Audit Logging**: Any attendance manual correction or salary rule modification logs user, timestamp, previous value, and new value to `audit_logs`.
- **Zero Bright Colors**: The entire UI uses the curated Odoo enterprise palette (`#714B67`, `#00A09D`, `#2C3E50`, `#F8F9FA`).

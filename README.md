# PeoplePay360: Integrated HR & Payroll Platform

> **Status**: Hackathon MVP  
> **Frontend**: React.js (Vite + Tailwind CSS with Odoo Enterprise Palette)  
> **Backend**: Node.js + Express.js (Feature-Based Modular Architecture)  
> **Database**: PostgreSQL (Prisma ORM with ACID Transactions)  
> **Auth**: JWT + Role-Based Access Control (5 Distinct Roles)  

---

## 1. Connected Business Workflow

PeoplePay360 is **not** an employee CRUD application. It is an **integrated HR and Payroll business engine**:

```
Employee (Central Hub)
   ├── Contracts (Historical + Period-Specific Selection)
   ├── Working Schedule (Auto Weekly Hour Calculation)
   ├── Attendance (Check-in/Out, Break, Worked Hours)
   └── Time Off (Allocations, Requests, Approval Deduction)
            │
            ▼
   Salary Structure & Sequential Rules Engine (Basic ➔ HRA ➔ Gross ➔ PF ➔ Net)
            │
            ▼
   Payrun 2-Step Wizard (Draft ➔ Compute ➔ Validate ➔ Mark Paid)
            │
            ▼
   Validated Payslips (Itemized Breakdown + PDF Generation + Email)
            │
            ▼
   Live PostgreSQL Dashboard & Deterministic AI Explainer
```

---

## 2. Odoo ERP Design Theme (Strict 3–4 Professional Colors)

No distracting bright/rainbow colors. Styled strictly after Odoo Enterprise:
- **Primary Brand / Action**: `#714B67` (Odoo Signature Eggplant / Purple)
- **Secondary / Action Accent**: `#00A09D` (Enterprise Teal)
- **Dark Slate Navy**: `#2C3E50` & `#1E293B` (Typography & Headers)
- **Canvas / Surface**: `#F8F9FA` (Canvas) & `#FFFFFF` (Card surfaces with `#E2E8F0` borders)

Key UI Patterns:
- **Breadcrumb Control Panel**: Search, Filters, Group By, and Action buttons.
- **Smart Stat Buttons**: Live counts on entity records (e.g. Employee shows Contracts, Attendance, Leaves, Payslips).
- **Status Pipeline Ribbon**: `Draft ➔ Computed ➔ Validated ➔ Paid`.
- **Demo Role Switcher**: Quick-switch between Admin, HR Manager, Payroll User, Payroll Manager, and Employee.

---

## 3. Feature-Based Architecture

```
backend/src/features/
├── auth/          # JWT, bcrypt, signup, login, session
├── employees/     # Employee CRUD, smart button counts, department links
├── contracts/     # Historical & period-applicable contract resolution
├── schedules/     # Daily/weekly automatic hour derivation
├── attendance/    # Worked hours computation, status & manual correction
├── time-off/      # Allocation ledger, request submission & approval
├── salary/        # Salary structures & sequential rule definitions
├── payroll/       # 2-step payrun wizard, payroll.engine.js, payroll.validator.js
├── payslips/      # Payslip line breakdown, PDFKit export & email dispatch
├── dashboard/     # Live PostgreSQL aggregation endpoints
└── audit/         # Immutable audit logging
```

---

## 4. Evaluator PostgreSQL Cheat-Sheet

Evaluators often request direct SQL queries to verify relational logic and calculations.

### Q1: How do you select the correct contract for September 2026?
```sql
SELECT c.id, e.employee_id, e.name, c.wage, c.start_date, c.end_date, s.name AS structure
FROM contracts c
JOIN employees e ON c.employee_id = e.id
JOIN salary_structures s ON c.salary_structure_id = s.id
WHERE e.employee_id = 'EMP001'
  AND c.start_date <= '2026-09-30'
  AND (c.end_date >= '2026-09-01' OR c.end_date IS NULL)
  AND c.status = 'ACTIVE'
ORDER BY c.start_date DESC
LIMIT 1;
```

### Q2: How are worked hours calculated from check-in/out and breaks?
```sql
SELECT 
    a.date,
    a.check_in,
    a.check_out,
    ROUND(
        GREATEST(0, (EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600.0) - COALESCE(a.break_hours, 1.0))::numeric, 
        2
    ) AS calculated_worked_hours
FROM attendance a
JOIN employees e ON a.employee_id = e.id
WHERE e.employee_id = 'EMP001' AND a.date >= '2026-09-01';
```

### Q3: How is leave balance verified?
```sql
SELECT 
    e.name,
    tot.name AS leave_type,
    toa.allocated_days,
    toa.taken_days,
    (toa.allocated_days - toa.taken_days) AS remaining_days
FROM time_off_allocations toa
JOIN employees e ON toa.employee_id = e.id
JOIN time_off_types tot ON toa.time_off_type_id = tot.id
WHERE e.employee_id = 'EMP001';
```

### Q4: How are sequential salary rules and payslip lines retrieved?
```sql
-- Salary rules in execution order:
SELECT sequence, code, name, category, calculation_type, value_expression
FROM salary_rules
WHERE salary_structure_id = 1
ORDER BY sequence ASC;

-- Resulting payslip lines:
SELECT pl.sequence, pl.code, pl.name, pl.category, pl.amount
FROM payslip_lines pl
WHERE pl.payslip_id = 1
ORDER BY pl.sequence ASC;
```

### Q5: How are live dashboard KPIs queried from PostgreSQL?
```sql
SELECT 
    COALESCE(SUM(p.net_salary), 0) AS total_net_salary_paid,
    COUNT(p.id) AS total_payslips_paid,
    ROUND(AVG(p.net_salary)::numeric, 2) AS average_net_salary
FROM payslips p
JOIN payruns pr ON p.payrun_id = pr.id
WHERE pr.status = 'PAID';
```

---

## 5. Five Pre-Configured Demo Accounts

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@peoplepay360.com` | `Admin@123` | Complete platform access & configuration |
| **HR Manager** | `hrmanager@peoplepay360.com` | `HR@123` | Employees, Contracts, Schedules, Leaves, Attendance |
| **HR Payroll User** | `payrolluser@peoplepay360.com` | `Payroll@123` | Create Payruns, Compute, Read/Update Payslips |
| **HR Payroll Manager** | `payrollmgr@peoplepay360.com` | `PayrollMgr@123` | Full Salary Structure & Rule Config, Mark Paid |
| **Employee** | `rahul@peoplepay360.com` | `Rahul@123` | Self-service Attendance, Leaves, View own Payslips |
   
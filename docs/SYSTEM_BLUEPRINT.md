# PeoplePay360: Master System Blueprint & Specification

---

## 1. System Vision & Workflow Engine

PeoplePay360 is an enterprise-grade HR & Payroll operations platform designed around a single unified business pipeline:

```
[1. Employee Hub]
       │
       ├──► [2. Contract Management]
       │         └── Resolves applicable wage & salary structure for payroll period
       │
       ├──► [3. Working Schedule]
       │         └── Computes expected weekly hours (e.g., 40 hrs/week)
       │
       ├──► [4. Attendance Management]
       │         └── Calculates actual worked hours, present, late, overtime
       │
       └──► [5. Time Off / Leave Ledger]
                 └── Deducts approved leave from allocation, feeds paid/unpaid days
                           │
                           ▼
              [6. Configurable Salary Rules Engine]
                   Sequence 1: BASIC      (Fixed / Base)
                   Sequence 2: HRA        (20% of Basic)
                   Sequence 3: ALLOWANCE  (Fixed / Variable)
                   Sequence 4: GROSS      (Basic + HRA + Allowance)
                   Sequence 5: PF         (12% of Basic)
                   Sequence 6: TAX        (Formula / Bracket)
                   Sequence 7: NET        (Gross - Deductions)
                           │
                           ▼
              [7. Payrun 2-Step Wizard & Lifecycle]
                   Step 1: Select Structure & Period (e.g., Sept 2026)
                   Step 2: Explicit Employee Selection
                   Status: DRAFT ➔ COMPUTED ➔ VALIDATED ➔ PAID
                           │
                           ▼
              [8. Validation Engine]
                   Checks missing contracts, bank details, duplicates
                           │
                           ▼
              [9. Payslip Generation & Deliveries]
                   Itemized lines, PDFKit generation, email dispatch
                           │
                           ▼
              [10. Live PostgreSQL Dashboard & AI Explainer]
                   Live SQL aggregations, anomaly detection, delta explainer
```

---

## 2. Core Business Formulas & Logic

### 2.1 Working Schedule Calculation
$$\text{Daily Worked Hours} = (\text{EndTime} - \text{StartTime}) - \text{BreakHours}$$
$$\text{Weekly Total Hours} = \sum_{\text{Days}} \text{Daily Worked Hours}$$
*Rule*: Users cannot manually edit calculated weekly hours; it is strictly derived from the daily schedule.

### 2.2 Attendance Hours & Status
$$\text{Worked Hours} = \max(0, (\text{CheckOut} - \text{CheckIn}) - \text{BreakHours})$$
- `PRESENT`: Arrived on time ($\le$ scheduled start time + grace period) and worked full hours.
- `LATE`: Check-in after scheduled start time.
- `OVERTIME`: Worked hours exceed scheduled daily hours.
- `INCOMPLETE`: Check-in recorded without check-out.
- `CORRECTED`: Modified by authorized HR user with reason logged in `AuditLog`.

### 2.3 Time Off Allocation Ledger
$$\text{Remaining Days} = \text{Allocated Days} - \text{Taken Days}$$
- Submitting a request does **not** deduct days immediately.
- Upon HR Approval inside a database transaction:
  $$\text{Taken} \leftarrow \text{Taken} + \text{Duration}$$
  $$\text{Remaining} \leftarrow \text{Remaining} - \text{Duration}$$

### 2.4 Period-Specific Contract Resolution
When running payroll for period $[\text{PeriodStart}, \text{PeriodEnd}]$:
```sql
WHERE employee_id = :empId
  AND start_date <= :PeriodEnd
  AND (end_date >= :PeriodStart OR end_date IS NULL)
  AND status = 'ACTIVE'
ORDER BY start_date DESC
LIMIT 1;
```
*Never* blindly pick the latest contract; always pick the contract valid for the target payroll period.

### 2.5 Deterministic Sequential Salary Rule Engine
Rules are executed in ascending order of `sequence`:
- Dynamic context dictionary carries forward previous calculations:
  ```javascript
  context = {
    WAGE: contract.wage,
    WORKED_DAYS: attendance.presentDays,
    TOTAL_DAYS: period.workingDays,
    UNPAID_LEAVES: timeoff.unpaidDays,
    ...calculatedRules // e.g. BASIC: 30000, HRA: 6000
  };
  ```
- Calculation types:
  1. `FIXED`: Evaluates to a constant number or base wage factor.
  2. `PERCENTAGE`: Evaluates `(base * percentage) / 100`.
  3. `FORMULA`: Evaluates algebraic expression against current context.

---

## 3. Payrun State Machine & Validation Engine

### States:
1. `DRAFT`: Payrun created with selected employees and period.
2. `COMPUTED`: Salary rule engine has generated payslip lines for each employee.
3. `WARNING`: Validation engine flagged non-blocking or blocking warnings.
4. `VALIDATED`: All validations reviewed and accepted.
5. `PAID`: Transaction committed, payments marked, immutable snapshot locked.
6. `CANCELLED`: Voided payrun.

### Validation Checks:
| Validation Issue | Severity | Effect on "Mark Paid" |
| :--- | :--- | :--- |
| Employee has no valid contract for period | **CRITICAL** | **Blocks Payment** |
| Employee missing bank account or IFSC | **WARNING** | Flags warning; blocks unless overridden |
| Duplicate payslip for same employee & period | **CRITICAL** | **Blocks Payment** |
| Missing salary structure or inactive rules | **CRITICAL** | **Blocks Payment** |
| Negative net salary calculated | **CRITICAL** | **Blocks Payment** |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Feature / Action | Employee | HR Manager | HR Payroll User | HR Payroll Manager | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Own Profile, Leaves, Attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Check-in / Check-out | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit Leave Request | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Employees & Contracts | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create / Edit Employees & Contracts | ❌ | ✅ | ❌ | ❌ | ✅ |
| Approve / Reject Leave Requests | ❌ | ✅ | ❌ | ❌ | ✅ |
| Correct Attendance (with audit log) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Create & Compute Payrun | ❌ | ❌ | ✅ | ✅ | ✅ |
| Validate Payrun | ❌ | ❌ | ✅ | ✅ | ✅ |
| Mark Payrun as Paid | ❌ | ❌ | ❌ | ✅ | ✅ |
| Configure Salary Structures & Rules | ❌ | ❌ | ❌ | ✅ | ✅ |
| User & Role Administration | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Live Dashboard | Own only | Department | Payroll | Full | Full |

---

## 5. PostgreSQL Data Model Relations

```
User (1) ──── (N) UserRole (N) ──── (1) Role ──── (N) Permission
User (1) ──── (1) Employee (Optional link for self-service)

Department (1) ──── (N) Employee (N) ──── (1) JobPosition
Employee (1) ──── (N) Employee (Manager hierarchy)
WorkingSchedule (1) ──── (N) ScheduleDay
WorkingSchedule (1) ──── (N) Employee

Employee (1) ──── (N) Contract ──── (1) SalaryStructure ──── (N) SalaryRule
Employee (1) ──── (N) Attendance
Employee (1) ──── (N) TimeOffAllocation ──── (1) TimeOffType
Employee (1) ──── (N) TimeOffRequest ──── (1) TimeOffType

Payrun (1) ──── (N) Payslip ──── (N) PayslipLine
Payrun (1) ──── (N) PayrollWarning
Payslip (N) ──── (1) Contract
Payslip (N) ──── (1) Employee

AuditLog (Tracks all entity changes, timestamps, user IDs, old & new values)
```

---

## 6. End-to-End Test Scenarios

### Test Scenario A: Rahul's Contract Change
- **History**: Contract 2025 = ₹40,000. New Contract (from 01-Jan-2026) = ₹50,000.
- **Action**: Run Payrun for September 2026.
- **Expected Result**: System automatically matches 2026 Contract. Basic = ₹30,000 (60% of 50k), HRA = ₹10,000 (20%), Allowance = ₹10,000. Gross = ₹50,000.

### Test Scenario B: Leave Balance & Unpaid Leave Impact
- **Initial**: Rahul has 20 Paid Leaves.
- **Action**: Employee requests 2 days leave. HR Manager approves.
- **Result**: Remaining balance becomes 18 days.
- **Payroll Impact**: If employee takes 2 *unpaid* leaves, Payroll engine detects 2 unpaid days, scales Basic proportionally, and AI Explainer cites "2 unpaid leave days" as reason for variance.

### Test Scenario C: Payroll Warning Detection
- **Setup**: Employee Priya has empty `bankAccountNumber`.
- **Action**: Compute Payrun for September 2026.
- **Result**: Validation step generates warning: `Employee Priya has missing bank details`. Marking as paid requires either resolving bank details or authorized managerial override.

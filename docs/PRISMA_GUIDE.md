# How to Run & Use Prisma in PeoplePay360

All Prisma commands must be run from the `backend/` directory where `prisma/schema.prisma` and `.env` are located.

---

## 1. Quick Commands Summary

| Task | Command (inside `backend/`) | What It Does |
| :--- | :--- | :--- |
| **Open Visual Database Studio** | `npx prisma studio` | Opens a web interface on `http://localhost:5555` to view & edit all PostgreSQL rows visually. |
| **Push Schema to PostgreSQL** | `npx prisma db push` | Syncs any changes in `schema.prisma` directly into the database without creating migration files. |
| **Re-seed Database** | `node prisma/seed.js` | Cleans and resets the database with fresh demo data (employees, contracts, rules, payruns). |
| **Generate Prisma Client** | `npx prisma generate` | Regenerates `@prisma/client` types after modifying `schema.prisma`. |
| **Format Schema File** | `npx prisma format` | Automatically formats and aligns `prisma/schema.prisma`. |

---

## 2. Visual Database Inspection (Prisma Studio)
To explore tables, relationships, and payslip lines visually in your browser:

1. Open your terminal in the `backend/` folder:
   ```bash
   cd /home/kalppatel/Desktop/peoplePay-360-Hr-odoo2026/backend
   ```
2. Run:
   ```bash
   npx prisma studio
   ```
3. Open your browser at:
   ```
   http://localhost:5555
   ```
You can click into `employees`, `contracts`, `attendance`, `payruns`, and `payslips` to see real PostgreSQL data in real-time.

---

## 3. How to Update or Modify Tables
If you add a new column or table to `backend/prisma/schema.prisma`:
```bash
cd /home/kalppatel/Desktop/peoplePay-360-Hr-odoo2026/backend

# 1. Sync the changes to PostgreSQL
npx prisma db push

# 2. Regenerate the client library
npx prisma generate
```

---

## 4. How to Reset & Re-Seed Data
Whenever you want to reset everything back to the clean demo state:
```bash
cd /home/kalppatel/Desktop/peoplePay-360-Hr-odoo2026/backend
node prisma/seed.js
```

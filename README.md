# 🏗️ Sri Krishna Constructions — Enterprise ERP & Payroll Management System

An industrial-grade Enterprise Resource Planning (ERP), Attendance Muster Roll, and Payroll Management Platform engineered for **Sri Krishna Constructions** (ESTD 2019). The system provides multi-role role-based access control (RBAC), offline-capable Progressive Web Application (PWA) attendance logging, mathematical wage calculation, multi-division project breakdown, and portrait A4 PDF payslip generation with direct WhatsApp dispatching.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client Layer [Frontend - React 18 + TypeScript + Vite]
        UI[Tailwind CSS & Lucide Icons UI]
        PWA[PWA Service Worker & Offline Sync Queue]
        PDF[jsPDF & AutoTable Engine]
        XLSX[ExcelJS / SheetJS Export Engine]
        API_Client[Axios Interceptor with 401/403 Session Handling]
    end

    subgraph Backend Layer [API Services - Node.js + Express]
        Auth[JWT Authentication & Bcrypt Password Security]
        RBAC[Role-Based Authorization Middleware (Owner, Manager, Supervisor, Staff)]
        WageEngine[Monthly Wage & Payroll Calculation Engine]
        AttEngine[Daily Attendance & Division Allocation Service]
        StockEngine[PO, Inward Purchases & Outward Sales Service]
        AuditEngine[ACID Advance Transaction Ledger]
    end

    subgraph Persistence Layer [Database - PostgreSQL]
        Pool[pg Connection Pool]
        Schema[Prisma Schema & Migrations]
        Tables[(Relational Tables: Worker, Attendance, MonthlyPayment, AdvanceTransaction, Division, PO, Purchase, Sale)]
        Locks[Row-Level ACID Locks: SELECT ... FOR UPDATE]
        Indexes[B-Tree & Composite Key Indexing]
    end

    UI --> API_Client
    PWA --> API_Client
    API_Client -->|REST API Requests with Bearer JWT| Auth
    Auth --> RBAC
    RBAC --> WageEngine
    RBAC --> AttEngine
    RBAC --> StockEngine
    RBAC --> AuditEngine
    WageEngine --> Pool
    AttEngine --> Pool
    StockEngine --> Pool
    AuditEngine --> Pool
    Pool --> Locks
    Locks --> Tables
    Schema -.-> Tables
    Tables --> Indexes
```

---

## 🌟 Core Technical Modules & Business Logic

### 1. 💰 Monthly Wages & Payroll Calculation Engine
- **Mathematical Formula**:
  - $\text{Wages Amount} = \text{Working Days} \times \text{Daily Wage}$
  - $\text{Allowance Amount} = \text{Working Days} \times \text{Daily Allowance}$
  - $\text{Gross Earnings} = \text{Wages Amount} + \text{Allowance Amount}$
  - $\text{Net Base} = \max(0, \text{Gross Earnings} - \text{PF} - \text{ESI})$
  - $\text{OT Payment} = \text{OT Hours} \times \left(\text{OT Rate} > 0 \;?\; \text{OT Rate} : \frac{\text{Daily Wage}}{8}\right)$
  - $\text{Total Earnings} = \text{Net Base} + \text{OT Payment} + \text{OT Allowance}$
  - $\text{Final Net Payout} = \max(0, \text{Total Earnings} - \text{Advance Deducted} + \text{Extra Bonus})$

- **100% Manual PF & ESI Entry**:
  - Eliminates forced statutory deductions; provides manual input flexibility with zero-loss saving on approval.
- **Natural Worker ID Numeric Sorting**:
  - Implements natural numeric collation so worker codes sort sequentially (`001, 002, ... 014, ... 100`) rather than standard lexicographical order.
- **Multiple Payroll Views**:
  - **22-Column Official Wage Register** (with inline editable inputs, full drilldowns, and mobile card view).
  - **ESI / PF Salary Statement** (formatted matching Karnataka statutory labor regulations).
  - **Canara Bank & Non-Canara Bank Advice Letters** (for bulk direct bank disbursements).

---

### 2. 🛡️ Advance Balance & Idempotent Delta Tracking
- **Mathematical Protection Formula**:
  - $\text{New Advance Balance} = \max(0, \text{Current Balance} + \text{Prev Deducted} - \text{New Deducted})$
- **Idempotent Re-Approval Safeguard**:
  - When re-approving a month or clicking **Approve All** multiple times, the balance delta is calculated cleanly:
    - Example: Initial advance ₹20,000 $\rightarrow$ Deduct ₹5,000 $\rightarrow$ Balance becomes ₹15,000.
    - If "Approve All" is clicked again: $15,000 + 5,000 - 5,000 = 15,000$ (**Zero double-deduction**).
    - If deduction is edited to ₹8,000: $15,000 + 5,000 - 8,000 = 12,000$ (Accurate adjustment).
    - If deduction is cleared to ₹0: $15,000 + 5,000 - 0 = 20,000$ (Fully restored).
- **Single Source of Truth**:
  - Synchronizes `Worker.advanceBalance`, `MonthlyPayment.advanceDeducted`, and `AdvanceTransaction` ledger records.

---

### 3. 📋 Daily Attendance & Physical Register Book Drilldown
- **Timezone-Immune SQL Querying**:
  - Uses native PostgreSQL `to_char(a."date", 'YYYY-MM-DD')` to prevent UTC offset shifts (e.g. IST +5:30) from misaligning attendance days.
- **Split Multi-Division Support**:
  - Accommodates half-day attendance split across two distinct project divisions (`0.5d Division A + 0.5d Division B`), accurately aggregating division day totals.
- **Interactive Register Book Modal**:
  - Day-by-day physical muster roll view showing date, weekday, division worked, status stamp (`[P]`, `[HD]`, `[A]`, `[L]`, `[HOLIDAY]`), OT hours, and recorded notes.

---

### 4. 📦 Purchase Orders, Stock & Materials Management
- **Inward & Outward Tracking**:
  - Tracks KPCL Codes, Part Numbers, HSN Codes, Quantities, Unit Rates, and GST breakdowns (CGST + SGST or IGST).
- **Vehicle & eWay Bill Verification**:
  - Records party invoice numbers, invoice dates, vehicle numbers, eWay bill numbers, and physical receiving notes.
- **Two-Tier Approval System**:
  - Staff / Supervisor sales entries and attendance modifications require Owner/Manager review and verification.

---

### 5. 📄 Document Generation & Direct WhatsApp Dispatch
- **High-Definition Salary Slips**:
  - Generates official portrait A4 PDF payslips with embedded HD company insignia, comprehensive earnings/deductions breakdown, and statutory details (PF No, ESI No, UAN, Bank Account & IFSC).
- **Direct WhatsApp Payslip Dispatch**:
  - Generates universal WhatsApp deeplinks pre-populated with worker payslip summaries for one-tap mobile sharing.
- **Excel (.xlsx) Export Engine**:
  - Produces formatted Excel registers with frozen headers and formulas.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Document Generation** | jsPDF, jsPDF-AutoTable, ExcelJS, SheetJS (XLSX) |
| **Backend Services** | Node.js, Express.js, PostgreSQL (`pg` Connection Pool), Prisma ORM |
| **Security & Auth** | JSON Web Tokens (JWT), Bcrypt password hashing, Role-Based Access Control |
| **Hosting & Deployment** | Render Web Services (Production API & Static Bundle), PostgreSQL Cloud DB |

---

## 🗄️ Database Entity Schema (Summary)

```
┌──────────────┐       1:N       ┌────────────────────────┐
│   Division   ├─────────────────┤         Worker         │
└──────┬───────┘                 └───────────┬────────────┘
       │                                     │
       │ 1:N                                 │ 1:N
┌──────┴───────┐                             ├──────────────────────────┐
│PurchaseOrder │                             │                          │
└──────┬───────┘                             ▼                          ▼
       │ 1:N                      ┌────────────────────┐     ┌─────────────────────┐
┌──────┴───────┐                  │     Attendance     │     │   MonthlyPayment    │
│  PO Item     │                  └────────────────────┘     └──────────┬──────────┘
└──────┬───────┘                                                        │
       │ 1:N                                                            │ 1:N
┌──────┴───────┐                                                        ▼
│Purchase /Sale│                                             ┌─────────────────────┐
└──────────────┘                                             │ AdvanceTransaction  │
                                                             └─────────────────────┘
```

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Feature / Action | OWNER | MANAGER | SUPERVISOR | STAFF |
| :--- | :---: | :---: | :---: | :---: |
| **View Dashboard & Stock Summary** | ✅ | ✅ | ✅ | ✅ |
| **Mark & Submit Daily Attendance** | ✅ | ✅ | ✅ | ❌ |
| **Edit Saved Attendance (Direct)** | ✅ | ✅ | Requires Approval | ❌ |
| **Approve / Bulk-Approve Monthly Wages** | ✅ | ✅ | ❌ | ❌ |
| **Adjust Worker Advance & Salary Deductions** | ✅ | ✅ | ❌ | ❌ |
| **Approve Stock Sales & Outward Dispatches** | ✅ | ✅ | ❌ | ❌ |
| **User & Staff Account Management** | ✅ | ❌ | ❌ | ❌ |
| **Export PDF Payslips & Excel Reports** | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **npm** or **yarn**

### 2. Environment Configuration
Create a `.env` file in `server/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skc_db
JWT_SECRET=your_secure_jwt_secret_key_here
NODE_ENV=development
```

### 3. Installation
```powershell
# 1. Install Backend Dependencies
cd server
npm install

# 2. Install Frontend Dependencies
cd ../client
npm install
```

### 4. Running the Development Stack
```powershell
# Terminal 1 - Backend Server (Port 5000)
cd server
npm run dev

# Terminal 2 - Frontend Client (Port 5173)
cd client
npm run dev
```

---

## 🧪 Automated Verification & Testing

The repository contains automated test scripts to verify calculations against PostgreSQL:

```powershell
# Run payroll calculation & advance balance integrity verification
cd server
node src/test_all_features.js
```

---

## 📦 Production Build & Deployment

### 1. Render Deployment (Current)
```powershell
# Build client bundle
cd client
npm run build

# Push changes to trigger Render auto-deploy
cd ..
git add .
git commit -m "Production release"
git push origin main
```

### 2. Amazon Web Services (AWS) Deployment
For detailed step-by-step instructions on deploying Sri Krishna Constructions ERP to **AWS (App Runner, EC2 + PM2 + NGINX, or ECS Fargate with RDS PostgreSQL)**, see:
👉 **[AWS Deployment & Cloud Infrastructure Guide (AWS_DEPLOYMENT_GUIDE.md)](./AWS_DEPLOYMENT_GUIDE.md)**

---

## 📄 License & Intellectual Property
Proprietary software developed exclusively for **Sri Krishna Constructions**. All rights reserved.

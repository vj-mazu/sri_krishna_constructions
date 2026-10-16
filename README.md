# 🏗️ Sri Krishna Constructions — Enterprise ERP & Payroll Management System

An industrial-grade Enterprise Resource Planning (ERP), Attendance Muster Roll, Procurement, and Payroll Management Platform engineered exclusively for **Sri Krishna Constructions** (ESTD 2019).

The system features multi-role Role-Based Access Control (RBAC), PO-style drilldown workspaces for Purchase Orders and Work Orders, automated ACID wage and advance tracking, statutory PF/ESI registers, GST Tax Invoice generation, and portrait A4 PDF payslip generation with direct WhatsApp dispatching.

---

## ⚡ Quickstart Guide (Local Setup)

> [!CAUTION]
> ### ⚠️ CRITICAL RULE FOR NEW DEVELOPERS: START BACKEND FIRST!
> **The Backend Server MUST be started before accessing or logging into the Frontend UI.**
> * The frontend application relies directly on the Backend API (running on port **5000**) for JWT token generation, role verification, and PostgreSQL queries.
> * If the frontend is opened while the backend is offline, login attempts will fail with `Network Error / Connection Refused`.
> * **Recommended**: Use **`start.bat`** (Windows) which automates this sequence perfectly: it launches the backend first, waits for database table verification, starts the frontend, and opens your browser.

---

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
* **PostgreSQL**: v14.0 or higher ([Download PostgreSQL](https://www.postgresql.org/download/))
* **npm**: v9.0.0 or higher (packaged with Node.js)

---

### 2. Database Setup (PostgreSQL)
Ensure your local PostgreSQL service is running (default port `5432`).

Open **pgAdmin** or your terminal/PowerShell `psql` shell and create the database:
```sql
CREATE DATABASE sri_krishna_construction;
```

> [!TIP]
> **Zero Manual Migration Headaches**: On first backend startup, the server automatically connects, builds all relational tables, sets up composite indexes, and seeds default administrative credentials. You do **not** need to run manual SQL setup scripts.

---

### 3. Environment Configuration (`.env`)

A root `.env` file and `server/.env` file are already included. If you are cloning onto a new environment, copy `.env.example`:

```bash
cp .env.example .env
```

Default configuration for local development:
```env
# PostgreSQL connection string
# Format: postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE_NAME>?schema=public
DATABASE_URL="postgresql://postgres:12345@localhost:5432/sri_krishna_construction?schema=public"

# Backend server port
PORT=5000

# JWT secret key for signing session tokens
JWT_SECRET="iac_stocks_secret_key_2026_secure"

# Default Owner credentials created on first boot
OWNER_USERNAME="owner"
OWNER_PASSWORD="owner123"

# Node environment
NODE_ENV="development"
```

> [!NOTE]
> If your local PostgreSQL uses a different password or port, simply adjust the `DATABASE_URL` string accordingly.

---

### 4. Installation & Running Locally

#### Step A: Install Dependencies
From the repository root, install dependencies for both server and client:
```bash
# One-step install from project root
npm run install:all
```

*(Or individually: `cd server && npm install` then `cd ../client && npm install`)*

---

#### Step B: Start The Application

##### 🟢 Method 1: One-Click Windows Launcher (`start.bat`) — Recommended!
You can launch everything with a single action:
* **In Windows File Explorer**: Simply double-click **`start.bat`** in the project folder.
* **In PowerShell / CMD**: Run:
  ```powershell
  .\start.bat
  ```
  *(Note: Do **not** type `cd .\start.bat` because `cd` is for directories; simply execute `.\start.bat`)*

**What `start.bat` does automatically:**
1. Verifies Node.js is installed on your system.
2. Starts the **Backend API Server** on port `5000` in a dedicated console window.
3. Pauses briefly to ensure database tables and indexes are initialized.
4. Starts the **Frontend Vite Client** on port `5173` in a dedicated console window.
5. Automatically opens your default web browser to **`http://localhost:5173`**.

> [!TIP]
> **To Stop Both Servers**: Simply double-click **`stop.bat`** (or run `.\stop.bat`). It cleanly stops all background processes running on ports `5000` and `5173`.

---

##### 💻 Method 2: Manual Terminal Commands (Cross-Platform / Mac / Linux / VSCode)
If you prefer running servers manually in separate terminal tabs:

**Terminal 1 — Backend Server (MUST RUN FIRST):**
```bash
cd server
npm run dev
```
*(Wait until you see `✓ Server running on port 5000` and `✓ Database tables verified`)*

**Terminal 2 — Frontend Client:**
```bash
cd client
npm run dev
```

---

#### Step C: Open in Browser & Log In
Navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

### 5. Default Credentials

| Username | Password | Role | Description |
| :--- | :--- | :---: | :--- |
| **`owner`** | `owner123` | **OWNER** | Full administrative access to all modules, approvals, settings, and user accounts |

*(You can create additional Managers, Supervisors, and Staff accounts anytime inside **Master Creation** $\rightarrow$ **Users** tab).*

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
        RBAC[Role-Based Authorization Middleware: Owner, Manager, Supervisor, Staff]
        WageEngine[Monthly Wage & Payroll Calculation Engine]
        AttEngine[Daily Attendance & Division Allocation Service]
        StockEngine[PO, Inward Purchases & Outward Sales Service]
        AuditEngine[ACID Advance Transaction Ledger]
    end

    subgraph Persistence Layer [Database - PostgreSQL]
        Pool[pg Connection Pool]
        Schema[Prisma Schema & Relational Tables]
        Tables[(Worker, Attendance, MonthlyPayment, AdvanceTransaction, Division, PO, Purchase, Sale, WorkOrder)]
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

## 🌟 Core Functional Modules

### 1. 💼 Work Orders & Direct Sales (PO-Style Drilldown Workspace)
* **View 1 — Master Work Orders Registry**:
  * Real-time KPI cards: **Total Work Orders**, **Total Contract Budget**, **Total Invoiced (Billed)**, and **Remaining Balance**.
  * Filter toolbar: Search, division dropdown, status toggle (`🟢 Active`, `🔴 Inactive`, `📋 All`), and date filters.
  * Master Table: Displays Sl No, clickable Work Order No, Division, Date, Contract Amount, Billed Amount (calculated live from sales), Balance, Line items count, Status, Remarks, and Action buttons.
  * Clicking any Work Order row or **`Open WO →`** navigates inside that specific Work Order.
* **View 2 — Inside Work Order Detail Workspace**:
  * Navy & sky header banner with a circular **`← Back`** button to return to the master list.
  * Live KPI pills showing Contract Cap, Billed Value, and Remaining Balance.
  * **`+ Add Line Items / Tax Invoice`** button automatically pre-fills that specific Work Order's number, division, and date.
  * Grouped containers displaying every Tax Invoice under that Work Order with actions to print/download official GST Tax Invoices, edit, or delete line items.

---

### 2. 📦 Procurement & Purchase Orders (PO Master & Inward Deliveries)
* **PO Workspace**:
  * PO Master Table with division, dates, allocated amounts, and remarks.
  * Click any PO to enter its detail workspace.
* **3 Dedicated Sub-Tabs**:
  1. **Items**: KPCL Code, Part Number, Make, HSN, Ordered Qty, Unit Rates, Tax rates (CGST, SGST, IGST), Discount, Freight, P&F, Insurance.
  2. **Inward Purchases**: Log incoming supplier delivery challans/invoices, vehicle numbers, received item quantities, and receiving notes.
  3. **Outward Sales**: Issue materials from PO stock to clients with live stock deduction.

---

### 3. 💰 Monthly Wages & Payroll Calculation Engine
* **Mathematical Precision Formula**:
  * $\text{Wages Amount} = \text{Working Days} \times \text{Daily Wage}$
  * $\text{Allowance Amount} = \text{Working Days} \times \text{Daily Allowance}$
  * $\text{Gross Earnings} = \text{Wages Amount} + \text{Allowance Amount}$
  * $\text{Net Base} = \max(0, \text{Gross Earnings} - \text{PF} - \text{ESI})$
  * $\text{OT Payment} = \text{OT Hours} \times \left(\text{OT Rate} > 0 \;?\; \text{OT Rate} : \frac{\text{Daily Wage}}{8}\right)$
  * $\text{Total Earnings} = \text{Net Base} + \text{OT Payment} + \text{OT Allowance}$
  * $\text{Final Net Payout} = \max(0, \text{Total Earnings} - \text{Advance Deducted} + \text{Extra Bonus})$
* **Statutory Compliance**:
  * **100% Manual PF & ESI Entry**: Eliminates forced percentage deductions; provides manual flexibility with zero-loss saving on approval.
  * **Collation-Aware Numeric Sorting**: Worker IDs sort sequentially (`001, 002, ... 014, ... 100`).
  * **Bank Advice Letters**: One-click generation of Canara Bank and Non-Canara Bank transfer schedules.
  * **Portrait A4 PDF Payslips**: High-definition payslips with embedded company logo, statutory numbers (UAN, PF, ESI, Bank Account), and one-tap **WhatsApp sharing**.

---

### 4. 🛡️ Advance Balance & Idempotent Delta Tracking
* **Mathematical Formula**:
  $$\text{New Advance Balance} = \max(0, \text{Current Balance} + \text{Prev Deducted} - \text{New Deducted})$$
* **Zero Double-Deduction Safeguard**:
  * When re-approving a month or clicking **Approve All** multiple times, existing deductions are restored before applying new ones ($15,000 + 5,000 - 5,000 = 15,000$).
  * Fully synchronized across `Worker.advanceBalance`, `MonthlyPayment.advanceDeducted`, and `AdvanceTransaction` audit ledgers.

---

### 5. 📋 Daily Attendance & Muster Roll
* **Timezone-Immune SQL Querying**: Uses native PostgreSQL date formatting (`to_char`) to prevent UTC offset shifts (IST +5:30) from misaligning attendance days.
* **Split Multi-Division Support**: Log half-day attendance split across two distinct project divisions (`0.5d Division A + 0.5d Division B`).
* **Physical Register Book Drilldown**: Interactive modal showing day-by-day status stamps (`[P]`, `[HD]`, `[A]`, `[L]`, `[HOLIDAY]`), OT hours, and site notes.

---

### 6. 🏷️ Master Creation Hub
* **Divisions Master**: Manage project divisions for Attendance logging and PO/Work Order clients.
* **Workers Master**: Manage worker designations, daily wage rates, daily allowances, OT rates, and initial advances.
* **Work Orders Master**: Register work orders with number, date, division (manual input or datalist auto-suggest), contract budget, live auto-calculated billed amount, and remarks.
* **Users & Staff**: Manage user logins, passwords, and assigned system roles.

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Feature / Action | OWNER | MANAGER | SUPERVISOR | STAFF |
| :--- | :---: | :---: | :---: | :---: |
| **View Dashboard & Stock Summary** | ✅ | ✅ | ✅ | ✅ |
| **Mark & Submit Daily Attendance** | ✅ | ✅ | ✅ | ❌ |
| **Edit Saved Attendance (Direct)** | ✅ | ✅ | Requires Approval | ❌ |
| **Approve / Bulk-Approve Monthly Wages** | ✅ | ✅ | ❌ | ❌ |
| **Adjust Worker Advance & Salary Deductions** | ✅ | ✅ | ❌ | ❌ |
| **Create & Edit Purchase Orders & Work Orders** | ✅ | ✅ | ❌ | ❌ |
| **Approve Stock Sales & Outward Dispatches** | ✅ | ✅ | ❌ | ❌ |
| **User & Staff Account Management** | ✅ | ❌ | ❌ | ❌ |
| **Export PDF Payslips & Excel Reports** | ✅ | ✅ | ✅ | ✅ |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Document Engine** | jsPDF, jsPDF-AutoTable, ExcelJS, SheetJS (XLSX) |
| **Backend Services** | Node.js, Express.js, PostgreSQL (`pg` Connection Pool), Prisma ORM |
| **Authentication** | JSON Web Tokens (JWT), Bcrypt password hashing |
| **Database** | PostgreSQL 14+ Relational Database |

---

## 🔧 Useful Commands

```bash
# Root: Install all dependencies for both client and server
npm run install:all

# Server: Run in development mode with hot reload
npm run dev:server
# or
cd server && npm run dev

# Client: Run frontend Vite dev server
npm run dev:client
# or
cd client && npm run dev

# Client: Production TypeScript & Vite build
npm run build
# or
cd client && npm run build
```

---

## ❓ Troubleshooting & Common Questions

### Q: "Failed to connect to database" on server startup?
1. Ensure PostgreSQL service is started:
   * **Windows**: Open `services.msc` $\rightarrow$ ensure `postgresql-x64-XX` is running.
2. Verify that the database `sri_krishna_construction` exists:
   ```sql
   CREATE DATABASE sri_krishna_construction;
   ```
3. Check the `DATABASE_URL` password in your `.env` file matches your local PostgreSQL superuser password (default is `12345`).

### Q: "Port 5000 is already in use"?
* If another instance is running in the background, terminate it or change `PORT=5001` in `.env` and `client/src/api.ts`.
* On Windows, to free port 5000:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
  ```

### Q: Do I need to run database migrations?
* **No.** The backend runs automatic table verification and indexing on startup via `server/src/init-db.js`. It creates all necessary tables, columns, constraints, and default accounts automatically.

---

## 📄 License & Intellectual Property
Proprietary software developed exclusively for **Sri Krishna Constructions**. All rights reserved.

# Sri Krishna Constructions ERP & Payroll Management System

A high-performance enterprise management and payroll portal built for **Sri Krishna Constructions** (ESTD 2019). Supports multi-role authentication (Owner, Manager, Supervisor), automated attendance tracking, zero-coercion salary computation, official portrait A4 PDF payslips with embedded HD logo, Purchase Order & Stock lifecycle management, and instant direct WhatsApp communication.

---

## 🌟 Key Architecture & Capabilities

- **Mathematical Precision (10/10)**: Strict `parseFloat` parsing ensuring accurate payroll calculations (`Basic + Allowance + OT` − `PF + ESI + Advance Deducted` + `Extra`).
- **Advance Tracking & Auto-Rollback**: Tracks Advance Taken vs. Deducted vs. Remaining Balance. Protects against duplicate deductions on payment re-approvals.
- **ACID Concurrency Safety**: PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) within explicit `BEGIN ... COMMIT` blocks for stock movements and wage approvals.
- **Enterprise Database Indexing**: GIN Trigram (`pg_trgm`) indexes and composite B-Tree indexes for fast text searching across large datasets.
- **Role-Based Access Control (RBAC)**: Strict separation of privileges (`OWNER`, `MANAGER`, `SUPERVISOR`) enforced on both API endpoints and React UI component rendering.
- **Zero-Cost WhatsApp & PDF Sharing**: Direct integration using Web Share API and universal WhatsApp deeplinking.
- **High-Definition Vector PDF**: Portrait A4 Salary Slips with official company insignia, complete earnings/deductions breakdown, and statutory identifiers (UAN, PF, ESI, Bank IFSC).

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, jsPDF & jsPDF-AutoTable, XLSX
- **Backend**: Node.js, Express.js, PostgreSQL (`pg` Connection Pool), Prisma ORM
- **Security**: JWT authentication, bcrypt password hashing, input sanitization

---

## 🚀 Quick Setup & Local Development

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### 2. Environment Configuration
Create a `.env` file inside the `/server` directory:
```env
PORT=5000
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/sri_krishna_db
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

### 3. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 4. Run the Development Servers
```bash
# Start Backend API (Port 5000)
cd server
npm run dev

# Start Frontend (Port 5173)
cd ../client
npm run dev
```

---

## 📦 Production Deployment

```bash
# Build frontend static bundle
cd client
npm run build

# Run production server
cd ../server
node src/server.js
```

---

## 📄 License
Private and proprietary to **Sri Krishna Constructions**.

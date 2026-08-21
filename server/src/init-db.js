import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabaseTables = async () => {
  // Extract Logo from Excel file C:\Users\maju\Downloads\SKC LOGO.xlsx
  try {
    const excelLogoPath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
    if (fs.existsSync(excelLogoPath)) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(excelLogoPath);
      let logoBuf = null;
      let logoExt = 'png';

      if (wb.media && wb.media.length > 0) {
        logoBuf = wb.media[0].buffer;
        logoExt = wb.media[0].extension || 'png';
      }

      if (logoBuf) {
        const base64Str = `data:image/${logoExt};base64,${Buffer.from(logoBuf).toString('base64')}`;
        const targetTsFile = path.join(__dirname, '../../client/src/logoBase64.ts');
        const targetPngFile = path.join(__dirname, '../../client/public/skc_logo.png');
        
        fs.writeFileSync(targetTsFile, `export const SKC_LOGO_BASE64 = "${base64Str}";\n`);
        fs.writeFileSync(targetPngFile, logoBuf);
        console.log('✅ Extracted HD SKC Logo from Excel and saved to logoBase64.ts & skc_logo.png');
      }
    }
  } catch (err) {
    console.error('Logo extraction during init-db error:', err.message);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️ No DATABASE_URL found in environment.');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=') || process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : undefined,
  });

  try {
    const client = await pool.connect();
    console.log('🔄 Checking and creating database tables via direct SQL...');

    await client.query(`
      -- 1. Create Enums if they don't exist
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'SUPERVISOR', 'STAFF');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "ApprovalType" AS ENUM ('EDIT_ATTENDANCE', 'SALE_ENTRY');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- Add SALE_ENTRY to ApprovalType enum if not already present
      ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'SALE_ENTRY';

      DO $$ BEGIN
        CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- 2. Create User Table
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "username" TEXT UNIQUE NOT NULL,
        "password" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "mobileNumber" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'STAFF',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Create Division Table
      CREATE TABLE IF NOT EXISTS "Division" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT UNIQUE NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Create Worker Table
      CREATE TABLE IF NOT EXISTS "Worker" (
        "id" TEXT PRIMARY KEY,
        "workerId" TEXT UNIQUE NOT NULL,
        "fullName" TEXT NOT NULL,
        "mobileNumber" TEXT NOT NULL,
        "dailyWage" DOUBLE PRECISION NOT NULL,
        "otHourlyRate" DOUBLE PRECISION NOT NULL,
        "divisionId" TEXT NOT NULL REFERENCES "Division"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Create Attendance Table
      CREATE TABLE IF NOT EXISTS "Attendance" (
        "id" TEXT PRIMARY KEY,
        "workerId" TEXT NOT NULL REFERENCES "Worker"("id") ON DELETE CASCADE,
        "date" TIMESTAMP(3) NOT NULL,
        "status" "AttendanceStatus" NOT NULL,
        "otHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "markedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Attendance_workerId_date_key" UNIQUE ("workerId", "date")
      );

      -- 6. Create MonthlyPayment Table
      CREATE TABLE IF NOT EXISTS "MonthlyPayment" (
        "id" TEXT PRIMARY KEY,
        "workerId" TEXT NOT NULL REFERENCES "Worker"("id") ON DELETE CASCADE,
        "month" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "presentDays" DOUBLE PRECISION NOT NULL,
        "absentDays" DOUBLE PRECISION NOT NULL,
        "halfDays" DOUBLE PRECISION NOT NULL,
        "leaveDays" DOUBLE PRECISION NOT NULL,
        "totalOtHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "extraAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "calculatedAmount" DOUBLE PRECISION NOT NULL,
        "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
        "approvedById" TEXT REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MonthlyPayment_workerId_month_year_key" UNIQUE ("workerId", "month", "year")
      );

      -- 7. Create PurchaseOrder Table
      CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
        "id" TEXT PRIMARY KEY,
        "poNumber" TEXT UNIQUE NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "divisionId" TEXT NOT NULL REFERENCES "Division"("id"),
        "poAmount" DOUBLE PRECISION NOT NULL,
        "addedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Create PurchaseOrderItem Table
      CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
        "id" TEXT PRIMARY KEY,
        "purchaseOrderId" TEXT NOT NULL REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
        "kpclCode" TEXT NOT NULL,
        "itemName" TEXT NOT NULL,
        "specifications" TEXT,
        "partNumber" TEXT UNIQUE NOT NULL,
        "make" TEXT,
        "hsnCode" TEXT,
        "unit" TEXT NOT NULL DEFAULT 'NOS',
        "qty" DOUBLE PRECISION NOT NULL,
        "rate" DOUBLE PRECISION NOT NULL,
        "basicAmount" DOUBLE PRECISION NOT NULL,
        "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "freight" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "pAndF" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "cgstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sgstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "igstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalAmount" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Create Purchase Table
      CREATE TABLE IF NOT EXISTS "Purchase" (
        "id" TEXT PRIMARY KEY,
        "purchaseOrderItemId" TEXT NOT NULL REFERENCES "PurchaseOrderItem"("id") ON DELETE CASCADE,
        "date" TIMESTAMP(3) NOT NULL,
        "qty" DOUBLE PRECISION NOT NULL,
        "rate" DOUBLE PRECISION NOT NULL,
        "basicAmount" DOUBLE PRECISION NOT NULL,
        "cgstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sgstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "igstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalAmount" DOUBLE PRECISION NOT NULL,
        "addedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Create Sale Table
      CREATE TABLE IF NOT EXISTS "Sale" (
        "id" TEXT PRIMARY KEY,
        "purchaseOrderItemId" TEXT NOT NULL REFERENCES "PurchaseOrderItem"("id") ON DELETE CASCADE,
        "invoiceNumber" TEXT NOT NULL,
        "invoiceDate" TIMESTAMP(3) NOT NULL,
        "qty" DOUBLE PRECISION NOT NULL,
        "rate" DOUBLE PRECISION NOT NULL,
        "basicAmount" DOUBLE PRECISION NOT NULL,
        "cgstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sgstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "igstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalAmount" DOUBLE PRECISION NOT NULL,
        "addedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Create ApprovalRequest Table
      CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
        "id" TEXT PRIMARY KEY,
        "type" "ApprovalType" NOT NULL,
        "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
        "requestedById" TEXT NOT NULL REFERENCES "User"("id"),
        "approvedById" TEXT REFERENCES "User"("id"),
        "payload" JSONB NOT NULL,
        "reason" TEXT,
        "rejectionReason" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Create Holiday Table (Company / Govt Paid Holidays)
      CREATE TABLE IF NOT EXISTS "Holiday" (
        "id" TEXT PRIMARY KEY,
        "date" TIMESTAMP(3) UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'GOVT_HOLIDAY',
        "description" TEXT,
        "addedById" TEXT REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Schema Column Synchronizations
      ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "approvedById" TEXT REFERENCES "User"("id");
      ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
      ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "poAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "divisionId" TEXT REFERENCES "Division"("id");
      ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "addedById" TEXT REFERENCES "User"("id");
      ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
      ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "freight" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "pAndF" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0;

      -- Purchase inward supplier details (Party Name, Supplier Address, GST Number, Party Invoice No, Invoice Date, Vehicle No, Remarks)
      ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "partyName" TEXT;
      ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "supplierAddress" TEXT;
      ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
      ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "partyInvoiceNumber" TEXT;
      ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "supplierInvoiceDate" TIMESTAMP(3);
      ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "vehicleNumber" TEXT;
      ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

      -- Sale outward buyer/party details & mandatory Owner approval system
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "partyName" TEXT;
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "supplierAddress" TEXT;
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "companyGstNumber" TEXT;
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "partyInvoiceNumber" TEXT;
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "supplierInvoiceDate" TIMESTAMP(3);
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "vehicleNumber" TEXT;
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'APPROVED';
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "approvedById" TEXT REFERENCES "User"("id");
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

      -- Worker master enhancements (Father Name, Designation, Daily Allowance, Advance Balance, Statutory & Bank Details)
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "fatherName" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "designation" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "dailyAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "advanceTaken" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "advanceBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "otAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "pfNumber" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "esiNumber" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "uanNumber" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "bankAccountNo" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "ifscCode" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "placeOfWork" TEXT;
      ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "natureOfWork" TEXT;
      UPDATE "Worker" SET "advanceBalance" = "advanceTaken" WHERE ("advanceBalance" IS NULL OR "advanceBalance" = 0) AND "advanceTaken" > 0;

      -- Attendance division tracking, notes, overtimeHours & dailyWageOverride
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "divisionId" TEXT REFERENCES "Division"("id");
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "secondDivisionId" TEXT REFERENCES "Division"("id");
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "notes" TEXT;
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "otHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "recordedById" TEXT REFERENCES "User"("id");
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "markedById" TEXT REFERENCES "User"("id");
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "dailyWageOverride" DOUBLE PRECISION;

      -- MonthlyPayment 18-column payroll breakdown fields
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "wagesAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "allowanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "grossPayment" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "pfAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "esiAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "netBaseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "otPayment" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "otAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "totalPayment" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "advanceDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "finalNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "divisionSummary" JSONB;

      -- 12. Create Performance Indexes
      CREATE INDEX IF NOT EXISTS "idx_po_number" ON "PurchaseOrder"("poNumber");
      CREATE INDEX IF NOT EXISTS "idx_po_date" ON "PurchaseOrder"("date");
      CREATE INDEX IF NOT EXISTS "idx_poi_kpcl" ON "PurchaseOrderItem"("kpclCode");
      CREATE INDEX IF NOT EXISTS "idx_poi_partnum" ON "PurchaseOrderItem"("partNumber");
      CREATE INDEX IF NOT EXISTS "idx_poi_po_part" ON "PurchaseOrderItem"("purchaseOrderId", "partNumber");
      CREATE INDEX IF NOT EXISTS "idx_poi_po_kpcl" ON "PurchaseOrderItem"("purchaseOrderId", "kpclCode");
      CREATE INDEX IF NOT EXISTS "idx_pur_poi" ON "Purchase"("purchaseOrderItemId");
      CREATE INDEX IF NOT EXISTS "idx_pur_date" ON "Purchase"("date");
      CREATE INDEX IF NOT EXISTS "idx_pur_party" ON "Purchase"("partyName");
      CREATE INDEX IF NOT EXISTS "idx_pur_invno" ON "Purchase"("partyInvoiceNumber");
      CREATE INDEX IF NOT EXISTS "idx_pur_vehicle" ON "Purchase"("vehicleNumber");
      CREATE INDEX IF NOT EXISTS "idx_sale_poi" ON "Sale"("purchaseOrderItemId");
      CREATE INDEX IF NOT EXISTS "idx_sale_invdate" ON "Sale"("invoiceDate");
      CREATE INDEX IF NOT EXISTS "idx_sale_status" ON "Sale"("status");
      CREATE INDEX IF NOT EXISTS "idx_sale_party" ON "Sale"("partyName");
      CREATE INDEX IF NOT EXISTS "idx_sale_invno" ON "Sale"("partyInvoiceNumber");
      CREATE INDEX IF NOT EXISTS "idx_sale_vehicle" ON "Sale"("vehicleNumber");
      CREATE INDEX IF NOT EXISTS "idx_worker_workerid" ON "Worker"("workerId");
      CREATE INDEX IF NOT EXISTS "idx_worker_fullname" ON "Worker"("fullName");
      CREATE INDEX IF NOT EXISTS "idx_worker_div" ON "Worker"("divisionId");
      CREATE INDEX IF NOT EXISTS "idx_att_date" ON "Attendance"("date");
      CREATE INDEX IF NOT EXISTS "idx_att_worker_date" ON "Attendance"("workerId", "date");
      CREATE INDEX IF NOT EXISTS "idx_att_div" ON "Attendance"("divisionId");
      CREATE INDEX IF NOT EXISTS "idx_pay_worker_my" ON "MonthlyPayment"("workerId", "month", "year");

      -- Performance indexes for login
      CREATE INDEX IF NOT EXISTS idx_user_lower_username ON "User" (LOWER("username"));

      -- Approval panel queries
      CREATE INDEX IF NOT EXISTS idx_ar_status ON "ApprovalRequest" ("status");
      CREATE INDEX IF NOT EXISTS idx_ar_type ON "ApprovalRequest" ("type");
      CREATE INDEX IF NOT EXISTS idx_ar_requestedby ON "ApprovalRequest" ("requestedById");
      CREATE INDEX IF NOT EXISTS idx_ar_approvedby ON "ApprovalRequest" ("approvedById");

      -- Foreign key join indexes
      CREATE INDEX IF NOT EXISTS idx_po_division ON "PurchaseOrder"("divisionId");
      CREATE INDEX IF NOT EXISTS idx_po_addedby ON "PurchaseOrder"("addedById");
      CREATE INDEX IF NOT EXISTS idx_pur_addedby ON "Purchase"("addedById");
      CREATE INDEX IF NOT EXISTS idx_sale_addedby ON "Sale"("addedById");
      CREATE INDEX IF NOT EXISTS idx_sale_approvedby ON "Sale"("approvedById");
      CREATE INDEX IF NOT EXISTS idx_att_markedby ON "Attendance"("markedById");
      CREATE INDEX IF NOT EXISTS idx_att_recordedby ON "Attendance"("recordedById");
      CREATE INDEX IF NOT EXISTS idx_pay_approvedby ON "MonthlyPayment"("approvedById");

      -- Cursor pagination & ORDER BY
      CREATE INDEX IF NOT EXISTS idx_po_date_created ON "PurchaseOrder"("date" DESC, "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS idx_pur_date_desc ON "Purchase"("date" DESC);
      CREATE INDEX IF NOT EXISTS idx_sale_invdate_desc ON "Sale"("invoiceDate" DESC);

      -- Holiday lookups
      CREATE INDEX IF NOT EXISTS idx_holiday_date ON "Holiday"("date");
      CREATE INDEX IF NOT EXISTS idx_holiday_addedby ON "Holiday"("addedById");
    `);

    client.release();
    await pool.end();
    console.log('✅ Database tables and indexes successfully verified and ready!');
  } catch (err) {
    console.error('⚠️ Database table auto-initialization error:', err.message);
    await pool.end();
  }
};

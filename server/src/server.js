import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedBaselineData } from './seed.js';
import { initializeDatabaseTables } from './init-db.js';
import { pool } from './db.js';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional logo extraction on local dev machine
try {
  const directLogoPath = 'C:\\Users\\maju\\Downloads\\ChatGPT Image Aug 22, 2026, 07_49_17 PM.png';
  const excelLogoPath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
  let logoBuf = null;
  let logoExt = 'png';

  if (fs.existsSync(directLogoPath)) {
    logoBuf = fs.readFileSync(directLogoPath);
    logoExt = 'png';
  } else if (fs.existsSync(excelLogoPath)) {
    const wb = new ExcelJS.Workbook();
    const wbPromise = wb.xlsx.readFile(excelLogoPath);
    wbPromise.then(() => {
      if (wb.media && wb.media.length > 0) {
        logoBuf = wb.media[0].buffer;
        logoExt = wb.media[0].extension || 'png';
        if (logoBuf) {
          const base64Str = `data:image/${logoExt};base64,${Buffer.from(logoBuf).toString('base64')}`;
          const targetTsFile = path.join(__dirname, '../../client/src/logoBase64.ts');
          const targetPngFile = path.join(__dirname, '../../client/public/skc_logo.png');
          if (fs.existsSync(path.dirname(targetTsFile))) {
            fs.writeFileSync(targetTsFile, `export const SKC_LOGO_BASE64 = "${base64Str}";\n`);
          }
          if (fs.existsSync(path.dirname(targetPngFile))) {
            fs.writeFileSync(targetPngFile, logoBuf);
          }
        }
      }
    }).catch(() => {});
  }

  if (logoBuf) {
    const base64Str = `data:image/${logoExt};base64,${Buffer.from(logoBuf).toString('base64')}`;
    const targetTsFile = path.join(__dirname, '../../client/src/logoBase64.ts');
    const targetPngFile = path.join(__dirname, '../../client/public/skc_logo.png');
    if (fs.existsSync(path.dirname(targetTsFile))) {
      fs.writeFileSync(targetTsFile, `export const SKC_LOGO_BASE64 = "${base64Str}";\n`);
    }
    if (fs.existsSync(path.dirname(targetPngFile))) {
      fs.writeFileSync(targetPngFile, logoBuf);
    }
  }
} catch (err) {
  // Silent fallback in production cloud environments
}

const SKC_LOGO_BASE64 = "data:image/jpeg;base64,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";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Universal Permissive CORS for cross-origin frontend hosting (Vercel, Localhost, Custom Domains)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));

// Enterprise ERP Rate Limiter with Dedicated Auth Brute-force Protection
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 200; // 200 requests per IP per minute for standard APIs
const ipRequestLogs = {};

const authWindowMs = 15 * 60 * 1000; // 15 minutes
const maxAuthAttempts = 20; // 20 login attempts per 15 minutes
const authAttemptsLogs = {};

// Clean up memory cache periodically every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const ip in ipRequestLogs) {
    if (now - ipRequestLogs[ip].windowStart > rateLimitWindowMs) {
      delete ipRequestLogs[ip];
    }
  }
  for (const ip in authAttemptsLogs) {
    if (now - authAttemptsLogs[ip].windowStart > authWindowMs) {
      delete authAttemptsLogs[ip];
    }
  }
}, 5 * 60 * 1000);

const rateLimiter = (req, res, next) => {
  if (!req.path.startsWith('/api')) return next();

  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  // Stricter rate-limiting for login/auth
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    if (!authAttemptsLogs[ip]) {
      authAttemptsLogs[ip] = { windowStart: now, count: 1 };
    } else {
      const authLog = authAttemptsLogs[ip];
      if (now - authLog.windowStart > authWindowMs) {
        authLog.windowStart = now;
        authLog.count = 1;
      } else {
        authLog.count += 1;
        if (authLog.count > maxAuthAttempts) {
          return res.status(429).json({
            error: '🔒 Security Alert: Too many login attempts. Account temporarily locked for 15 minutes.'
          });
        }
      }
    }
  }

  // Standard API rate limiter
  if (!ipRequestLogs[ip]) {
    ipRequestLogs[ip] = { windowStart: now, requestCount: 1 };
    return next();
  }

  const clientLog = ipRequestLogs[ip];
  if (now - clientLog.windowStart > rateLimitWindowMs) {
    clientLog.windowStart = now;
    clientLog.requestCount = 1;
    return next();
  }

  clientLog.requestCount += 1;
  if (clientLog.requestCount > maxRequestsPerWindow) {
    return res.status(429).json({
      error: '⚠️ Rate limit exceeded. Please slow down and try again.'
    });
  }

  next();
};

app.use(rateLimiter);

// Serve built React frontend files directly on Port 5000
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// PWA Web App Manifest endpoint for Android & iOS App Install
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    short_name: "SKC ERP",
    name: "Sri Krishna Constructions ERP",
    description: "Official Enterprise Construction Management & Payroll Portal",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ],
    start_url: "/",
    background_color: "#0f172a",
    theme_color: "#1e3a8a",
    display: "standalone",
    orientation: "portrait"
  });
});

// PWA Service Worker script
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    const CACHE_NAME = 'skc-erp-v1';
    self.addEventListener('install', (e) => {
      self.skipWaiting();
    });
    self.addEventListener('activate', (e) => {
      e.waitUntil(self.clients.claim());
    });
    self.addEventListener('fetch', (e) => {
      // Pass through fetch for fresh data
      return;
    });
  `);
});

// Middleware: Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Middleware: Authorization (Roles)
const requireRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
};

// Serve extracted HD SKC Logo directly
app.get('/api/logo/skc-logo', async (req, res) => {
  try {
    const filePath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
    if (fs.existsSync(filePath)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      if (workbook.media && workbook.media.length > 0) {
        const media = workbook.media[0];
        res.setHeader('Content-Type', `image/${media.extension || 'png'}`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(media.buffer);
      }
    }

    // Cloud production: Serve embedded base64 image as binary buffer
    const base64Data = SKC_LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(imgBuffer);
  } catch (err) {
    console.error('Error serving SKC logo:', err.message);
    res.status(500).json({ error: 'Failed to serve logo' });
  }
});

// Serve extracted HD SKC Logo as Base64 JSON
app.get('/api/logo/base64', async (req, res) => {
  try {
    const filePath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
    if (fs.existsSync(filePath)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      if (workbook.media && workbook.media.length > 0) {
        const media = workbook.media[0];
        const base64Data = `data:image/${media.extension || 'png'};base64,${Buffer.from(media.buffer).toString('base64')}`;
        return res.json({ success: true, base64: base64Data });
      }
    }

    // Cloud production: Serve embedded SKC_LOGO_BASE64
    return res.json({ success: true, base64: SKC_LOGO_BASE64 });
  } catch (err) {
    console.error('Base64 logo error:', err.message);
    res.json({ success: true, base64: SKC_LOGO_BASE64 });
  }
});

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Search for user case-insensitively
    let { rows } = await pool.query(
      `SELECT * FROM "User" WHERE LOWER("username") = $1 LIMIT 1`,
      [trimmedUsername]
    );

    let user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 2. Check password: match via bcrypt
    const validPassword = await bcrypt.compare(cleanPassword, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u."id", u."username", u."fullName", u."mobileNumber", u."role", u."assignedDivisionId",
              json_build_object('id', d.id, 'name', d.name) as "assignedDivision"
       FROM "User" u
       LEFT JOIN "Division" d ON u."assignedDivisionId" = d.id
       WHERE u."id" = $1 LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Failed to fetch user session' });
  }
});

// --- DASHBOARD DAILY STATS API (TODAY'S PURCHASES, SALES, ATTENDANCE, PENDING ORDERS & INACTIVE ADVANCES) ---
app.get('/api/dashboard/daily-stats', authenticateToken, async (req, res) => {
  try {
    // Use IST (UTC+5:30) for accurate "today" boundary
    const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = nowIST.toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // 1. Today's Purchases (Inward)
    const todayPurchases = await pool.query(`
      SELECT 
        COALESCE(SUM(qty), 0)::float as "totalQty",
        COALESCE(SUM("totalAmount"), 0)::float as "totalAmount",
        COUNT(*)::int as "count"
      FROM "Purchase"
      WHERE ("date" >= $1 AND "date" <= $2) OR ("date"::date = CURRENT_DATE) OR ("date"::text LIKE $3)
    `, [todayStart, todayEnd, `${todayStr}%`]);

    // 2. Today's Sales (Dispatched & Approved)
    const todaySales = await pool.query(`
      SELECT 
        COALESCE(SUM(qty), 0)::float as "totalQty",
        COALESCE(SUM("totalAmount"), 0)::float as "totalAmount",
        COUNT(*)::int as "count"
      FROM "Sale"
      WHERE (("invoiceDate" >= $1 AND "invoiceDate" <= $2) OR ("invoiceDate"::date = CURRENT_DATE) OR ("invoiceDate"::text LIKE $3)) AND status = 'APPROVED'
    `, [todayStart, todayEnd, `${todayStr}%`]);

    // 3. Today's Attendance (robust matching for date, timezone string, or CURRENT_DATE)
    const todayAttendance = await pool.query(`
      SELECT 
        COUNT(*)::int as "totalMarked",
        COUNT(*) FILTER (WHERE status = 'PRESENT')::int as "presentCount",
        COUNT(*) FILTER (WHERE status = 'ABSENT')::int as "absentCount",
        COUNT(*) FILTER (WHERE status = 'HALF_DAY')::int as "halfDayCount",
        COUNT(*) FILTER (WHERE status IN ('LEAVE', 'MEDICAL_LEAVE', 'CASUAL_LEAVE'))::int as "leaveCount",
        COALESCE(SUM(COALESCE("overtimeHours", "otHours", 0)), 0)::float as "totalOtHours"
      FROM "Attendance"
      WHERE ("date"::date = CURRENT_DATE)
         OR ("date" >= $1 AND "date" <= $2)
         OR ("date"::text LIKE $3)
    `, [todayStart, todayEnd, `${todayStr}%`]);

    // 4. Total Active Workers Registered (exact count)
    const totalWorkersRes = await pool.query(`SELECT COUNT(*)::int as count FROM "Worker" WHERE COALESCE("isActive", true) = true`);
    const totalAllWorkersRes = await pool.query(`SELECT COUNT(*)::int as count FROM "Worker"`);

    // 5. Pending Purchase Orders (Items where Ordered Qty > Inward Received Qty)
    const pendingOrdersRes = await pool.query(`
      SELECT 
        poi.id, 
        poi."purchaseOrderId", 
        poi."itemName", 
        poi."partNumber", 
        poi."kpclCode", 
        poi.unit, 
        poi.qty as "orderedQty",
        po."poNumber", 
        po.date as "poDate", 
        d.name as "divisionName",
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as "inwardQty",
        (poi.qty - COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0))::float as "pendingQty"
      FROM "PurchaseOrderItem" poi
      JOIN "PurchaseOrder" po ON poi."purchaseOrderId" = po.id
      LEFT JOIN "Division" d ON po."divisionId" = d.id
      WHERE COALESCE(po."isActive", true) = true
        AND poi.qty > COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)
      ORDER BY (poi.qty - COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)) DESC
      LIMIT 15
    `);

    // 6. Inactive Workers with Outstanding Advance Balance
    const inactiveWorkersWithAdvanceRes = await pool.query(`
      SELECT 
        w.id, 
        w."workerId", 
        w."fullName", 
        w."mobileNumber", 
        w."advanceBalance", 
        w."advanceTaken",
        w."designation",
        d.name as "divisionName"
      FROM "Worker" w
      LEFT JOIN "Division" d ON w."divisionId" = d.id
      WHERE COALESCE(w."isActive", true) = false AND w."advanceBalance" > 0
      ORDER BY w."advanceBalance" DESC
    `);

    res.json({
      todayPurchases: todayPurchases.rows[0] || { totalQty: 0, totalAmount: 0, count: 0 },
      todaySales: todaySales.rows[0] || { totalQty: 0, totalAmount: 0, count: 0 },
      todayAttendance: todayAttendance.rows[0] || { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, leaveCount: 0, totalOtHours: 0 },
      totalWorkers: totalWorkersRes.rows[0]?.count || 0,
      totalRegisteredWorkers: totalAllWorkersRes.rows[0]?.count || 0,
      pendingOrders: pendingOrdersRes.rows || [],
      inactiveWorkersWithAdvance: inactiveWorkersWithAdvanceRes.rows || []
    });
  } catch (err) {
    console.error('Error fetching dashboard daily stats:', err);
    res.status(200).json({
      todayPurchases: { totalQty: 0, totalAmount: 0, count: 0 },
      todaySales: { totalQty: 0, totalAmount: 0, count: 0 },
      todayAttendance: { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, leaveCount: 0, totalOtHours: 0 },
      totalWorkers: 0,
      pendingOrders: [],
      inactiveWorkersWithAdvance: []
    });
  }
});

// --- PO AND INVENTORY APIS (DIRECT POSTGRESQL LAYER) ---

// POST /api/purchase-orders - Create PO (Owner/Manager only)
app.post('/api/purchase-orders', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { poNumber, date, divisionId, poAmount, remarks } = req.body;
    if (!poNumber || !poNumber.trim()) {
      return res.status(400).json({ error: 'Purchase Order number is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Purchase Order date is required' });
    }
    if (!divisionId) {
      return res.status(400).json({ error: 'Division selection is required' });
    }

    const result = await pool.query(
      `INSERT INTO "PurchaseOrder" ("id", "poNumber", "date", "divisionId", "poAmount", "remarks", "addedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [poNumber.trim(), new Date(date), divisionId, parseFloat(poAmount) || 0, remarks ? remarks.trim() : null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating purchase order:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: `Purchase Order '${req.body.poNumber}' already exists.` });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Selected division is invalid or does not exist.' });
    }
    res.status(500).json({ error: 'Failed to create PO' });
  }
});

// GET /api/purchase-orders - List all POs with cursor pagination
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const { cursor, limit = 20, search, dateFrom, dateTo, activeOnly } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [];
    let params = [];

    if (activeOnly === 'true') {
      whereClauses.push(`COALESCE(po."isActive", true) = true`);
    }
    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`po."poNumber" ILIKE $${params.length}`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`po."date" >= $${params.length}`);
    }
    if (dateTo) {
      params.push(new Date(dateTo));
      whereClauses.push(`po."date" <= $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "PurchaseOrder" po ${whereSql}`, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let cursorWhere = whereSql;
    const queryParams = [...params];
    if (cursor) {
      queryParams.push(cursor);
      cursorWhere += (whereClauses.length > 0 ? ' AND ' : 'WHERE ') + `po."id" < $${queryParams.length}`;
    }

    queryParams.push(limitNum + 1);
    const querySql = `
      SELECT 
        po.*,
        json_build_object('name', d.name) as division,
        json_build_object('fullName', u."fullName") as "addedBy",
        json_build_object('items', COALESCE((SELECT COUNT(*)::int FROM "PurchaseOrderItem" poi WHERE poi."purchaseOrderId" = po.id), 0)) as "_count"
      FROM "PurchaseOrder" po
      LEFT JOIN "Division" d ON po."divisionId" = d.id
      LEFT JOIN "User" u ON po."addedById" = u.id
      ${cursorWhere}
      ORDER BY po."id" DESC
      LIMIT $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    let nextCursor = null;
    if (rows.length > limitNum) {
      const extra = rows.pop();
      nextCursor = extra.id;
    }

    res.json({ purchaseOrders: rows, nextCursor, totalCount });
  } catch (err) {
    console.error('Error listing POs:', err);
    res.status(500).json({ error: 'Failed to list POs' });
  }
});

// GET /api/purchase-orders/:id - Get PO header and KPI financial metrics
app.get('/api/purchase-orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const poRes = await pool.query(`
      SELECT 
        po.*,
        json_build_object('name', d.name) as division,
        json_build_object('fullName', u."fullName") as "addedBy",
        json_build_object('items', COALESCE((SELECT COUNT(*)::int FROM "PurchaseOrderItem" poi WHERE poi."purchaseOrderId" = po.id), 0)) as "_count"
      FROM "PurchaseOrder" po
      LEFT JOIN "Division" d ON po."divisionId" = d.id
      LEFT JOIN "User" u ON po."addedById" = u.id
      WHERE po.id = $1
    `, [id]);

    if (poRes.rows.length === 0) return res.status(404).json({ error: 'PO not found' });
    const purchaseOrder = poRes.rows[0];

    const kpiRes = await pool.query(`
      SELECT 
        COALESCE(SUM(poi.qty), 0)::float as "totalOrderedQty",
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalInwardQty",
        COALESCE((SELECT SUM(pur."totalAmount") FROM "Purchase" pur WHERE pur."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalInwardValue",
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1) AND s.status = 'APPROVED'), 0)::float as "totalSoldQty",
        COALESCE((SELECT SUM(s."totalAmount") FROM "Sale" s WHERE s."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1) AND s.status = 'APPROVED'), 0)::float as "totalSalesValue",
        COUNT(DISTINCT poi.id)::int as "totalItemsCount"
      FROM "PurchaseOrderItem" poi
      WHERE poi."purchaseOrderId" = $1
    `, [id]);

    const kpiRow = kpiRes.rows[0] || {};
    const totalOrderedQty = kpiRow.totalOrderedQty || 0;
    const totalInwardQty = kpiRow.totalInwardQty || 0;
    const progressPercent = totalOrderedQty > 0 ? Math.min(100, Math.round((totalInwardQty / totalOrderedQty) * 100)) : 0;

    const remainingInwardQty = Math.max(0, totalOrderedQty - totalInwardQty);
    const totalSoldQty = kpiRow.totalSoldQty || 0;
    const availableForSaleQty = Math.max(0, totalInwardQty - totalSoldQty);

    const kpi = {
      totalPoAmount: purchaseOrder.poAmount || 0,
      totalInwardValue: kpiRow.totalInwardValue || 0,
      totalSalesValue: kpiRow.totalSalesValue || 0,
      totalOrderedQty,
      totalInwardQty,
      remainingInwardQty,
      totalSoldQty,
      availableForSaleQty,
      totalItemsCount: kpiRow.totalItemsCount || 0,
      progressPercent
    };

    res.json({ purchaseOrder, kpi });
  } catch (err) {
    console.error('Error fetching PO details:', err);
    res.status(500).json({ error: 'Failed to get PO' });
  }
});

// GET /api/purchase-orders/:id/items - Fast cursor paginated items
app.get('/api/purchase-orders/:id/items', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, search, partNumber, kpclCode } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(poi."partNumber" ILIKE $${params.length} OR poi."kpclCode" ILIKE $${params.length} OR poi."itemName" ILIKE $${params.length})`);
    }
    if (partNumber) {
      params.push(`%${partNumber}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
    }
    if (kpclCode) {
      params.push(`%${kpclCode}%`);
      whereClauses.push(`poi."kpclCode" ILIKE $${params.length}`);
    }
    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "PurchaseOrderItem" poi ${whereSql}`, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let offsetNum = 0;
    if (cursor) {
      // Check if cursor is numeric offset or item id
      const parsed = parseInt(cursor, 10);
      if (!isNaN(parsed)) {
        offsetNum = parsed;
      }
    }

    const queryParams = [...params, limitNum, offsetNum];
    const querySql = `
      SELECT 
        poi.*,
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as "purchasedQty",
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)::float as "soldQty"
      FROM "PurchaseOrderItem" poi
      ${whereSql}
      ORDER BY poi."createdAt" ASC, poi."id" ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    const nextOffset = (offsetNum + rows.length < totalCount) ? (offsetNum + limitNum).toString() : null;

    const itemsWithAgg = rows.map(item => ({
      ...item,
      remainingQty: (item.qty || 0) - item.purchasedQty,
      availableForSale: item.purchasedQty - item.soldQty
    }));

    res.json({ items: itemsWithAgg, nextCursor: nextOffset, totalCount });
  } catch (err) {
    console.error('Error fetching PO items:', err);
    res.status(500).json({ error: 'Failed to list PO items' });
  }
});

// GET /api/purchase-orders/:id/purchases - Inward records
app.get('/api/purchase-orders/:id/purchases', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, search, partNumber, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(
        poi."partNumber" ILIKE $${params.length} OR 
        poi."itemName" ILIKE $${params.length} OR 
        poi."kpclCode" ILIKE $${params.length} OR 
        pur."partyName" ILIKE $${params.length} OR 
        pur."gstNumber" ILIKE $${params.length} OR 
        pur."partyInvoiceNumber" ILIKE $${params.length} OR 
        pur."vehicleNumber" ILIKE $${params.length} OR 
        pur."receivedPartNumber" ILIKE $${params.length} OR 
        pur."receivedItemName" ILIKE $${params.length}
      )`);
    }
    if (partNumber && partNumber.trim()) {
      params.push(`%${partNumber.trim()}%`);
      whereClauses.push(`(poi."partNumber" ILIKE $${params.length} OR pur."receivedPartNumber" ILIKE $${params.length})`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`pur."date" >= $${params.length}`);
    }
    if (dateTo) {
      params.push(new Date(dateTo));
      whereClauses.push(`pur."date" <= $${params.length}`);
    }

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const countRes = await pool.query(`
      SELECT COUNT(*)::int as count 
      FROM "Purchase" pur
      JOIN "PurchaseOrderItem" poi ON pur."purchaseOrderItemId" = poi.id
      ${whereSql}
    `, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let offsetNum = 0;
    if (cursor) {
      const parsed = parseInt(cursor, 10);
      if (!isNaN(parsed)) offsetNum = parsed;
    }

    const queryParams = [...params, limitNum, offsetNum];
    const querySql = `
      SELECT 
        pur.*,
        json_build_object('id', poi.id, 'partNumber', poi."partNumber", 'itemName', poi."itemName", 'kpclCode', poi."kpclCode") as "purchaseOrderItem",
        json_build_object('fullName', u."fullName") as "addedBy"
      FROM "Purchase" pur
      JOIN "PurchaseOrderItem" poi ON pur."purchaseOrderItemId" = poi.id
      LEFT JOIN "User" u ON pur."addedById" = u.id
      ${whereSql}
      ORDER BY pur."date" ASC, pur."createdAt" ASC, pur."id" ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    const nextOffset = (offsetNum + rows.length < totalCount) ? (offsetNum + limitNum).toString() : null;

    res.json({ purchases: rows, nextCursor: nextOffset, totalCount });
  } catch (err) {
    console.error('Error listing purchases:', err);
    res.status(500).json({ error: 'Failed to list purchases' });
  }
});

// GET /api/purchase-orders/:id/sales - Outward sale records
app.get('/api/purchase-orders/:id/sales', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, search, invoiceNumber, partNumber, dateFrom, dateTo, status: statusFilter } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    // Filter by sale status (APPROVED, PENDING, REJECTED)
    if (statusFilter && ['APPROVED', 'PENDING', 'REJECTED'].includes(statusFilter.toUpperCase())) {
      params.push(statusFilter.toUpperCase());
      whereClauses.push(`s."status" = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(
        s."invoiceNumber" ILIKE $${params.length} OR 
        s."partyName" ILIKE $${params.length} OR 
        s."gstNumber" ILIKE $${params.length} OR 
        s."vehicleNumber" ILIKE $${params.length} OR 
        s."eWayBillNumber" ILIKE $${params.length} OR 
        poi."partNumber" ILIKE $${params.length} OR 
        poi."itemName" ILIKE $${params.length} OR 
        poi."kpclCode" ILIKE $${params.length}
      )`);
    }
    if (invoiceNumber && invoiceNumber.trim()) {
      params.push(`%${invoiceNumber.trim()}%`);
      whereClauses.push(`s."invoiceNumber" ILIKE $${params.length}`);
    }
    if (partNumber && partNumber.trim()) {
      params.push(`%${partNumber.trim()}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`s."invoiceDate" >= $${params.length}`);
    }
    if (dateTo) {
      params.push(new Date(dateTo));
      whereClauses.push(`s."invoiceDate" <= $${params.length}`);
    }

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const countRes = await pool.query(`
      SELECT COUNT(*)::int as count 
      FROM "Sale" s
      JOIN "PurchaseOrderItem" poi ON s."purchaseOrderItemId" = poi.id
      ${whereSql}
    `, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let offsetNum = 0;
    if (cursor) {
      const parsed = parseInt(cursor, 10);
      if (!isNaN(parsed)) offsetNum = parsed;
    }

    const queryParams = [...params, limitNum, offsetNum];
    const querySql = `
      SELECT 
        s.*,
        json_build_object('id', poi.id, 'partNumber', poi."partNumber", 'itemName', poi."itemName", 'kpclCode', poi."kpclCode") as "purchaseOrderItem",
        json_build_object('fullName', u."fullName") as "addedBy"
      FROM "Sale" s
      JOIN "PurchaseOrderItem" poi ON s."purchaseOrderItemId" = poi.id
      LEFT JOIN "User" u ON s."addedById" = u.id
      ${whereSql}
      ORDER BY s."invoiceDate" ASC, s."createdAt" ASC, s."id" ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    const nextOffset = (offsetNum + rows.length < totalCount) ? (offsetNum + limitNum).toString() : null;

    res.json({ sales: rows, nextCursor: nextOffset, totalCount });
  } catch (err) {
    console.error('Error listing sales:', err);
    res.status(500).json({ error: 'Failed to list sales' });
  }
});

// PUT /api/purchase-orders/:id - Update PO header & Remarks
app.put('/api/purchase-orders/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { poNumber, date, divisionId, poAmount, remarks, isActive } = req.body;
    const { rows } = await pool.query(
      `UPDATE "PurchaseOrder"
       SET "poNumber" = COALESCE($1, "poNumber"),
           "date" = COALESCE($2, "date"),
           "divisionId" = COALESCE($3, "divisionId"),
           "poAmount" = COALESCE($4, "poAmount"),
           "remarks" = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE "remarks" END,
           "isActive" = CASE WHEN $6::boolean IS NOT NULL THEN $6 ELSE "isActive" END,
           "updatedAt" = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        poNumber !== undefined ? poNumber?.trim() : null,
        date ? new Date(date) : null,
        divisionId || null,
        poAmount !== undefined ? parseFloat(poAmount) : null,
        remarks !== undefined ? remarks : null,
        isActive !== undefined ? !!isActive : null,
        req.params.id
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PO not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating PO:', err);
    res.status(500).json({ error: 'Failed to update PO' });
  }
});

// PATCH /api/purchase-orders/:id/toggle-active - Toggle Active/Inactive status
app.patch('/api/purchase-orders/:id/toggle-active', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE "PurchaseOrder"
       SET "isActive" = NOT COALESCE("isActive", true),
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PO not found' });
    res.json({ purchaseOrder: rows[0], message: `Purchase Order marked as ${rows[0].isActive ? 'ACTIVE' : 'INACTIVE'}` });
  } catch (err) {
    console.error('Error toggling PO active:', err);
    res.status(500).json({ error: 'Failed to toggle PO status' });
  }
});

// DELETE /api/purchase-orders/:id - Delete PO
app.delete('/api/purchase-orders/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    await pool.query(`DELETE FROM "PurchaseOrder" WHERE id = $1`, [req.params.id]);
    res.json({ message: 'PO deleted successfully' });
  } catch (err) {
    console.error('Error deleting PO:', err);
    res.status(500).json({ error: 'Failed to delete PO' });
  }
});

// POST /api/purchase-order-items - Add item to PO
app.post('/api/purchase-order-items', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const basicAmount = parseFloat(d.basicAmount) || (qty * rate);
    const discount = parseFloat(d.discount) || 0;
    const freight = parseFloat(d.freight) || 0;
    const pAndF = parseFloat(d.pAndF) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const cgstAmount = parseFloat(d.cgstAmount) || (basicAmount * (cgstPercent / 100));
    const sgstAmount = parseFloat(d.sgstAmount) || (basicAmount * (sgstPercent / 100));
    const igstAmount = parseFloat(d.igstAmount) || (basicAmount * (igstPercent / 100));
    const insurance = parseFloat(d.insurance) || 0;
    const totalAmount = parseFloat(d.totalAmount) || (basicAmount + cgstAmount + sgstAmount + igstAmount - discount + freight + pAndF + insurance);

    const { rows } = await pool.query(
      `INSERT INTO "PurchaseOrderItem" (
        "id", "purchaseOrderId", "kpclCode", "itemName", "specifications", "partNumber", "make", "hsnCode", "unit",
        "qty", "rate", "basicAmount", "discount", "freight", "pAndF", "cgstPercent", "sgstPercent", "igstPercent",
        "cgstAmount", "sgstAmount", "igstAmount", "insurance", "totalAmount", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        d.purchaseOrderId, d.kpclCode, d.itemName, d.specifications || null, d.partNumber, d.make || null, d.hsnCode || null, d.unit || 'NOS',
        qty, rate, basicAmount, discount, freight, pAndF, cgstPercent, sgstPercent, igstPercent,
        cgstAmount, sgstAmount, igstAmount, insurance, totalAmount
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding PO item:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Part number already exists in this Purchase Order' });
    }
    res.status(500).json({ error: 'Failed to add PO item' });
  }
});

// PUT /api/purchase-order-items/:id - Update item
app.put('/api/purchase-order-items/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const basicAmount = qty * rate;
    const discount = parseFloat(d.discount) || 0;
    const freight = parseFloat(d.freight) || 0;
    const pAndF = parseFloat(d.pAndF) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const taxableAmount = Math.max(0, basicAmount - discount + freight + pAndF);
    const cgstAmount = taxableAmount * (cgstPercent / 100);
    const sgstAmount = taxableAmount * (sgstPercent / 100);
    const igstAmount = taxableAmount * (igstPercent / 100);
    const insurance = parseFloat(d.insurance) || 0;
    const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount + insurance;

    const { rows } = await pool.query(
      `UPDATE "PurchaseOrderItem"
       SET "partNumber" = COALESCE($1, "partNumber"),
           "kpclCode" = COALESCE($2, "kpclCode"),
           "itemName" = COALESCE($3, "itemName"),
           "specifications" = COALESCE($4, "specifications"),
           "make" = COALESCE($5, "make"),
           "hsnCode" = COALESCE($6, "hsnCode"),
           "unit" = COALESCE($7, "unit"),
           "qty" = $8,
           "rate" = $9,
           "basicAmount" = $10,
           "discount" = $11,
           "freight" = $12,
           "pAndF" = $13,
           "cgstPercent" = $14,
           "sgstPercent" = $15,
           "igstPercent" = $16,
           "cgstAmount" = $17,
           "sgstAmount" = $18,
           "igstAmount" = $19,
           "insurance" = $20,
           "totalAmount" = $21,
           "updatedAt" = NOW()
       WHERE id = $22
       RETURNING *`,
      [
        d.partNumber || null, d.kpclCode || null, d.itemName || null, d.specifications || null, d.make || null, d.hsnCode || null, d.unit || 'NOS',
        qty, rate, basicAmount, discount, freight, pAndF,
        cgstPercent, sgstPercent, igstPercent,
        cgstAmount, sgstAmount, igstAmount, insurance, totalAmount,
        req.params.id
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating PO item:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Part number already exists in this Purchase Order' });
    }
    res.status(500).json({ error: 'Failed to update PO item' });
  }
});

// DELETE /api/purchase-order-items/:id - Delete item
app.delete('/api/purchase-order-items/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const checkRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM "Purchase" WHERE "purchaseOrderItemId" = $1) as purchases,
        (SELECT COUNT(*)::int FROM "Sale" WHERE "purchaseOrderItemId" = $1 AND status IN ('APPROVED', 'PENDING')) as sales
    `, [req.params.id]);

    if (checkRes.rows[0]?.purchases > 0 || checkRes.rows[0]?.sales > 0) {
      return res.status(400).json({ error: 'Cannot delete item with existing purchases or active/pending sales' });
    }
    await pool.query(`DELETE FROM "PurchaseOrderItem" WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting PO item:', err);
    res.status(500).json({ error: 'Failed to delete PO item' });
  }
});

// POST /api/purchases - Inward purchase record with ACID transactional safety
app.post('/api/purchases', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const shippingCharges = parseFloat(d.shippingCharges) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges;

    await client.query('BEGIN');

    // Row-level lock on item to verify and enforce ordered PO quantity limit
    const itemRes = await client.query(`
      SELECT poi.qty, COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as purchased
      FROM "PurchaseOrderItem" poi
      WHERE poi.id = $1
      FOR UPDATE
    `, [d.purchaseOrderItemId]);

    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'PO item not found' });
    }

    const item = itemRes.rows[0];
    const remainingAllowed = (item.qty || 0) - (item.purchased || 0);
    if (qty > remainingAllowed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot inward ${qty} units. Ordered PO item quantity is ${item.qty}, already received ${item.purchased} units. Remaining balance is ${Math.max(0, remainingAllowed)} units!`
      });
    }

    const { rows } = await client.query(
      `INSERT INTO "Purchase" (
        "id", "purchaseOrderItemId", "date", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "totalAmount", "partyName", "supplierAddress", "gstNumber", "partyInvoiceNumber",
        "supplierInvoiceDate", "vehicleNumber", "remarks", "receivedItemName", "receivedPartNumber", "shippingCharges", "addedById", "createdAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, NOW()
      ) RETURNING *`,
      [
        d.purchaseOrderItemId, new Date(d.date), qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        d.receivedItemName ? d.receivedItemName.trim() : null,
        d.receivedPartNumber ? d.receivedPartNumber.trim().toUpperCase() : null,
        shippingCharges,
        req.user.id
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase:', err);
    res.status(500).json({ error: 'Failed to record purchase' });
  } finally {
    client.release();
  }
});

// PUT /api/purchases/:id - Update purchase
app.put('/api/purchases/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const shippingCharges = parseFloat(d.shippingCharges) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges;

    const { rows } = await pool.query(
      `UPDATE "Purchase"
       SET "qty" = $1, "rate" = $2, "basicAmount" = $3,
           "cgstPercent" = $4, "sgstPercent" = $5, "igstPercent" = $6,
           "cgstAmount" = $7, "sgstAmount" = $8, "igstAmount" = $9,
           "totalAmount" = $10, "date" = $11,
           "partyName" = $12, "supplierAddress" = $13, "gstNumber" = $14,
           "partyInvoiceNumber" = $15, "supplierInvoiceDate" = $16,
           "vehicleNumber" = $17, "remarks" = $18,
           "receivedItemName" = $19, "receivedPartNumber" = $20,
           "shippingCharges" = $21
       WHERE id = $22
       RETURNING *`,
      [
        qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent,
        cgstAmount, sgstAmount, igstAmount,
        totalAmount, d.date ? new Date(d.date) : new Date(),
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        d.receivedItemName !== undefined ? (d.receivedItemName ? d.receivedItemName.trim() : null) : null,
        d.receivedPartNumber !== undefined ? (d.receivedPartNumber ? d.receivedPartNumber.trim().toUpperCase() : null) : null,
        shippingCharges,
        id
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Purchase record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating purchase:', err);
    res.status(500).json({ error: 'Failed to update purchase record' });
  }
});

// DELETE /api/purchases/:id - Delete purchase
app.delete('/api/purchases/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM "Purchase" WHERE id = $1`, [id]);
    res.json({ message: 'Purchase record deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase:', err);
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
});

// POST /api/sales - Outward sale record with ACID transactional safety & mandatory Owner approval
app.post('/api/sales', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const shippingCharges = parseFloat(d.shippingCharges) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges;

    await client.query('BEGIN');

    // Row-level lock on item to prevent overselling race conditions
    const stockRes = await client.query(`
      SELECT 
        poi."partNumber", poi."itemName",
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as purchased,
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)::float as sold
      FROM "PurchaseOrderItem" poi
      WHERE poi.id = $1
      FOR UPDATE
    `, [d.purchaseOrderItemId]);

    const partNumber = stockRes.rows[0]?.partNumber || '-';
    const itemName = stockRes.rows[0]?.itemName || '-';
    const purchased = stockRes.rows[0]?.purchased || 0;
    const sold = stockRes.rows[0]?.sold || 0;
    const available = purchased - sold;
    if (qty > available) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Sale quantity (${qty}) exceeds available approved stock (${available})` });
    }

    const saleId = (await client.query('SELECT gen_random_uuid()::text as id')).rows[0].id;

    // EVERY sale requires Owner approval (even if created by Owner/Manager)
    const { rows } = await client.query(
      `INSERT INTO "Sale" (
        "id", "purchaseOrderItemId", "invoiceNumber", "invoiceDate", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "totalAmount", "partyName", "supplierAddress", "gstNumber", "companyGstNumber", "partyInvoiceNumber",
        "supplierInvoiceDate", "vehicleNumber", "eWayBillNumber", "remarks", "shippingCharges", "status", "addedById", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, 'PENDING', $25, NOW()
      ) RETURNING *`,
      [
        saleId, d.purchaseOrderItemId, d.invoiceNumber ? d.invoiceNumber.trim().toUpperCase() : null,
        d.invoiceDate ? new Date(d.invoiceDate) : new Date(),
        qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.companyGstNumber ? d.companyGstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.eWayBillNumber ? d.eWayBillNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        shippingCharges,
        req.user.id
      ]
    );

    // Ensure SALE_ENTRY is in ApprovalType enum
    try {
      await client.query(`ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'SALE_ENTRY'`);
    } catch (_) {}

    // Automatically create an Approval Request for OWNER review
    await client.query(
      `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'SALE_ENTRY', 'PENDING', $1, $2, $3, NOW(), NOW())`,
      [
        req.user.id,
        JSON.stringify({
          saleId: saleId,
          partNumber: partNumber,
          itemName: itemName,
          invoiceNumber: d.invoiceNumber || '-',
          invoiceDate: d.invoiceDate,
          qty: qty,
          rate: rate,
          basicAmount: basicAmount,
          cgstPercent: cgstPercent,
          sgstPercent: sgstPercent,
          igstPercent: igstPercent,
          cgstAmount: cgstAmount,
          sgstAmount: sgstAmount,
          igstAmount: igstAmount,
          shippingCharges: shippingCharges,
          totalAmount: totalAmount,
          partyName: d.partyName || '-',
          supplierAddress: d.supplierAddress || '-',
          companyGstNumber: d.companyGstNumber || '-',
          gstNumber: d.gstNumber || '-',
          partyInvoiceNumber: d.partyInvoiceNumber || '-',
          supplierInvoiceDate: d.supplierInvoiceDate || null,
          vehicleNumber: d.vehicleNumber || '-',
          eWayBillNumber: d.eWayBillNumber || '-',
          remarks: d.remarks || '-'
        }),
        `Sale Invoice #${d.invoiceNumber || '-'} (${qty} units of ${partNumber}) submitted for Owner Approval`
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Sale recorded and submitted for Owner Approval',
      sale: rows[0]
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error recording sale:', err);
    res.status(500).json({ error: 'Failed to record sale' });
  } finally {
    client.release();
  }
});

// PUT /api/sales/:id - Update sale (Requires re-approval by Owner)
app.put('/api/sales/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const shippingCharges = parseFloat(d.shippingCharges) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges;

    await client.query('BEGIN');

    // Fetch existing sale and item details
    const existingRes = await client.query(`
      SELECT s.*, poi."partNumber", poi."itemName"
      FROM "Sale" s
      JOIN "PurchaseOrderItem" poi ON s."purchaseOrderItemId" = poi.id
      WHERE s.id = $1
      FOR UPDATE
    `, [id]);

    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sale record not found' });
    }

    const existingSale = existingRes.rows[0];
    const partNumber = existingSale.partNumber || '-';
    const itemName = existingSale.itemName || '-';

    const { rows } = await client.query(
      `UPDATE "Sale"
       SET "invoiceNumber" = COALESCE($1, "invoiceNumber"),
           "invoiceDate" = $2, "qty" = $3, "rate" = $4, "basicAmount" = $5,
           "cgstPercent" = $6, "sgstPercent" = $7, "igstPercent" = $8,
           "cgstAmount" = $9, "sgstAmount" = $10, "igstAmount" = $11,
           "totalAmount" = $12,
           "partyName" = $13, "supplierAddress" = $14, "gstNumber" = $15,
           "companyGstNumber" = $16,
           "partyInvoiceNumber" = $17, "supplierInvoiceDate" = $18,
           "vehicleNumber" = $19, "remarks" = $20,
           "shippingCharges" = $21,
           "status" = 'PENDING',
           "approvedById" = NULL,
           "approvedAt" = NULL
       WHERE id = $22
       RETURNING *`,
      [
        d.invoiceNumber ? d.invoiceNumber.trim().toUpperCase() : null,
        d.invoiceDate ? new Date(d.invoiceDate) : new Date(),
        qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.companyGstNumber ? d.companyGstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        shippingCharges,
        id
      ]
    );

    const payloadObj = {
      saleId: id,
      partNumber: partNumber,
      itemName: itemName,
      invoiceNumber: d.invoiceNumber ? d.invoiceNumber.trim().toUpperCase() : existingSale.invoiceNumber || '-',
      invoiceDate: d.invoiceDate || existingSale.invoiceDate,
      qty: qty,
      rate: rate,
      basicAmount: basicAmount,
      cgstPercent: cgstPercent,
      sgstPercent: sgstPercent,
      igstPercent: igstPercent,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      igstAmount: igstAmount,
      shippingCharges: shippingCharges,
      totalAmount: totalAmount,
      partyName: d.partyName ? d.partyName.trim() : existingSale.partyName || '-',
      supplierAddress: d.supplierAddress ? d.supplierAddress.trim() : existingSale.supplierAddress || '-',
      companyGstNumber: d.companyGstNumber ? d.companyGstNumber.trim().toUpperCase() : existingSale.companyGstNumber || '-',
      gstNumber: d.gstNumber ? d.gstNumber.trim().toUpperCase() : existingSale.gstNumber || '-',
      partyInvoiceNumber: d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : existingSale.partyInvoiceNumber || '-',
      supplierInvoiceDate: d.supplierInvoiceDate || existingSale.supplierInvoiceDate || null,
      vehicleNumber: d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : existingSale.vehicleNumber || '-',
      eWayBillNumber: d.eWayBillNumber || existingSale.eWayBillNumber || '-',
      remarks: d.remarks ? d.remarks.trim() : existingSale.remarks || '-'
    };

    // Check if an existing ApprovalRequest exists for this sale
    const approvalCheck = await client.query(
      `SELECT id FROM "ApprovalRequest" WHERE "payload"::text LIKE $1 AND "type" = 'SALE_ENTRY' ORDER BY "createdAt" DESC LIMIT 1`,
      [`%"saleId":"${id}"%`]
    );

    if (approvalCheck.rows.length > 0) {
      await client.query(
        `UPDATE "ApprovalRequest"
         SET "status" = 'PENDING',
             "payload" = $1,
             "reason" = $2,
             "requestedById" = $3,
             "approvedById" = NULL,
             "rejectionReason" = NULL,
             "updatedAt" = NOW()
         WHERE id = $4`,
        [
          JSON.stringify(payloadObj),
          `Sale Invoice #${payloadObj.invoiceNumber} (${qty} units of ${partNumber}) edited and re-submitted for Owner Approval`,
          req.user.id,
          approvalCheck.rows[0].id
        ]
      );
    } else {
      await client.query(
        `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'SALE_ENTRY', 'PENDING', $1, $2, $3, NOW(), NOW())`,
        [
          req.user.id,
          JSON.stringify(payloadObj),
          `Sale Invoice #${payloadObj.invoiceNumber} (${qty} units of ${partNumber}) edited and re-submitted for Owner Approval`
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Sale invoice updated and re-submitted for Owner Approval', sale: rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error updating sale:', err);
    res.status(500).json({ error: 'Failed to update sale record' });
  } finally {
    client.release();
  }
});

// DELETE /api/sales/:id - Delete sale
app.delete('/api/sales/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    await pool.query(`DELETE FROM "Sale" WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Sale invoice record deleted successfully' });
  } catch (err) {
    console.error('Error deleting sale:', err);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

// GET /api/stock-summary - Aggregated stock view with dual-join and dictionary lookup
app.get('/api/stock-summary', authenticateToken, async (req, res) => {
  try {
    const { search, poNumber, partNumber, kpclCode, itemName, make, stockStatus, dateFrom, dateTo, cursor, limit = 50 } = req.query;
    const limitNum = parseInt(limit, 10) || 50;

    let whereClauses = [];
    let params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(poi."partNumber" ILIKE $${params.length} OR poi."itemName" ILIKE $${params.length} OR poi."kpclCode" ILIKE $${params.length} OR po."poNumber" ILIKE $${params.length} OR poi.make ILIKE $${params.length})`);
    }
    if (poNumber) {
      params.push(`%${poNumber}%`);
      whereClauses.push(`po."poNumber" ILIKE $${params.length}`);
    }
    if (partNumber) {
      params.push(`%${partNumber}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
    }
    if (kpclCode) {
      params.push(`%${kpclCode}%`);
      whereClauses.push(`poi."kpclCode" ILIKE $${params.length}`);
    }
    if (itemName) {
      params.push(`%${itemName}%`);
      whereClauses.push(`poi."itemName" ILIKE $${params.length}`);
    }
    if (make) {
      params.push(`%${make}%`);
      whereClauses.push(`poi.make ILIKE $${params.length}`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`po."date" >= $${params.length}`);
    }
    if (dateTo) {
      const dTo = new Date(dateTo);
      dTo.setHours(23, 59, 59, 999);
      params.push(dTo);
      whereClauses.push(`po."date" <= $${params.length}`);
    }

    if (stockStatus === 'IN_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)) > 0`);
    } else if (stockStatus === 'OUT_OF_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)) <= 0`);
    } else if (stockStatus === 'LOW_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)) > 0 AND (COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)) <= 10`);
    } else if (stockStatus === 'PENDING_INWARD') {
      whereClauses.push(`COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) < poi.qty`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const { stockType } = req.query;

    // If requesting ONLY individual stocks
    if (stockType === 'INDIVIDUAL') {
      let indWhere = [];
      let indParams = [];

      if (search && search.trim()) {
        indParams.push(`%${search.trim()}%`);
        indWhere.push(`(s."itemName" ILIKE $${indParams.length} OR s."partNumber" ILIKE $${indParams.length} OR s."remarks" ILIKE $${indParams.length})`);
      }
      if (partNumber && partNumber.trim()) {
        indParams.push(`%${partNumber.trim()}%`);
        indWhere.push(`s."partNumber" ILIKE $${indParams.length}`);
      }

      const indWhereSql = indWhere.length > 0 ? 'WHERE ' + indWhere.join(' AND ') : '';
      const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "IndividualStock" s ${indWhereSql}`, indParams);
      const totalCount = countRes.rows[0]?.count || 0;

      indParams.push(limitNum);
      const indSql = `
        SELECT 
          s.id,
          'INDIVIDUAL' as "stockType",
          '-' as "poNumber",
          NULL as "poDate",
          COALESCE(s."kpclCode", '-') as "kpclCode",
          s."itemName",
          COALESCE(s."specifications", s."remarks", 'Standalone Item') as "specifications",
          COALESCE(s."partNumber", '-') as "partNumber",
          COALESCE(s."make", 'DIRECT') as "make",
          COALESCE(s."hsnCode", '-') as "hsnCode",
          s."unit",
          s."openingStock" as "orderedQty",
          (s."openingStock" + COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0))::float as "totalPurchased",
          COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)::float as "totalSold"
        FROM "IndividualStock" s
        ${indWhereSql}
        ORDER BY s."createdAt" DESC
        LIMIT $${indParams.length}
      `;

      const { rows } = await pool.query(indSql, indParams);
      const summary = rows.map(item => {
        const ordered = parseFloat(item.orderedQty || 0);
        const purchased = parseFloat(item.totalPurchased || 0);
        const sold = parseFloat(item.totalSold || 0);
        return {
          ...item,
          stockType: 'INDIVIDUAL',
          orderedQty: ordered,
          totalPurchased: purchased,
          totalSold: sold,
          balanceStock: Math.max(0, purchased - sold),
          remainingToReceive: 0
        };
      });

      return res.json({ items: summary, nextCursor: null, totalCount });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM "PurchaseOrderItem" poi 
       LEFT JOIN "PurchaseOrder" po ON poi."purchaseOrderId" = po.id
       ${whereSql}`, 
      params
    );
    const totalCount = countRes.rows[0]?.count || 0;

    params.push(limitNum + 1);
    const querySql = `
      SELECT 
        poi.id,
        'PO' as "stockType",
        poi."purchaseOrderId",
        poi."kpclCode",
        poi."itemName",
        poi.specifications,
        poi."partNumber",
        poi.make,
        poi."hsnCode",
        poi.unit,
        poi.qty as "orderedQty",
        COALESCE(po."poNumber", (SELECT po2."poNumber" FROM "PurchaseOrder" po2 WHERE po2.id = poi."purchaseOrderId"), '-') as "poNumber",
        COALESCE(po."date", (SELECT po2."date" FROM "PurchaseOrder" po2 WHERE po2.id = poi."purchaseOrderId"), NULL) as "poDate",
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as "totalPurchased",
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)::float as "totalSold"
      FROM "PurchaseOrderItem" poi
      LEFT JOIN "PurchaseOrder" po ON poi."purchaseOrderId" = po.id
      ${whereSql}
      ORDER BY poi."createdAt" DESC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(querySql, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      nextCursor = rows.pop().id;
    }

    // Bounded batch PO lookup for exact page items (Zero memory overhead at 10M scale)
    const poIds = [...new Set(rows.map(r => r.purchaseOrderId || r.purchaseorderid).filter(Boolean))];
    let poDict = {};
    if (poIds.length > 0) {
      const poRes = await pool.query(
        `SELECT id, "poNumber" FROM "PurchaseOrder" WHERE id = ANY($1::text[])`,
        [poIds]
      );
      for (const p of poRes.rows) {
        poDict[p.id] = p.poNumber || p.ponumber;
      }
    }

    const summary = rows.map(item => {
      const ordered = parseFloat(item.orderedQty ?? item.orderedqty ?? item.qty ?? 0);
      const purchased = parseFloat(item.totalPurchased ?? item.totalpurchased ?? 0);
      const sold = parseFloat(item.totalSold ?? item.totalsold ?? 0);
      const poId = item.purchaseOrderId || item.purchaseorderid;
      const dictPo = poDict[poId];
      const rawPo = item.poNumber || item.ponumber || item.po_number;
      const poNum = (rawPo && rawPo !== '-') ? rawPo : (dictPo || '-');

      return {
        id: item.id,
        stockType: 'PO',
        purchaseOrderId: poId,
        poNumber: poNum,
        poDate: item.poDate || item.podate || null,
        kpclCode: item.kpclCode || item.kpclcode || '',
        itemName: item.itemName || item.itemname || '',
        specifications: item.specifications || '',
        partNumber: item.partNumber || item.partnumber || '',
        make: item.make || '',
        hsnCode: item.hsnCode || item.hsncode || '',
        unit: item.unit || 'NOS',
        orderedQty: ordered,
        totalPurchased: purchased,
        totalSold: sold,
        balanceStock: purchased - sold,
        remainingToReceive: Math.max(0, ordered - purchased)
      };
    });

    res.json({ items: summary, nextCursor, totalCount });
  } catch (err) {
    console.error('Error fetching stock summary:', err);
    res.status(500).json({ error: 'Failed to fetch stock summary' });
  }
});

// --- INDIVIDUAL STOCKS (NON-PO STANDALONE INVENTORY) APIS ---

// GET /api/individual-stocks - List all individual stock items with aggregated balances
app.get('/api/individual-stocks', authenticateToken, async (req, res) => {
  try {
    const { search, partNumber, kpclCode, cursor, page, limit = 50 } = req.query;
    const limitNum = parseInt(limit, 10) || 50;

    let whereClauses = [];
    let params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(s."itemName" ILIKE $${params.length} OR s."partNumber" ILIKE $${params.length} OR s."kpclCode" ILIKE $${params.length} OR s."make" ILIKE $${params.length} OR s."hsnCode" ILIKE $${params.length} OR s."specifications" ILIKE $${params.length} OR s."remarks" ILIKE $${params.length})`);
    }

    if (partNumber && partNumber.trim()) {
      params.push(`%${partNumber.trim()}%`);
      whereClauses.push(`s."partNumber" ILIKE $${params.length}`);
    }

    if (kpclCode && kpclCode.trim()) {
      params.push(`%${kpclCode.trim()}%`);
      whereClauses.push(`s."kpclCode" ILIKE $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "IndividualStock" s ${whereSql}`, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let offsetNum = 0;
    if (page) {
      const p = parseInt(page, 10);
      if (p > 1) offsetNum = (p - 1) * limitNum;
    } else if (cursor) {
      const parsed = parseInt(cursor, 10);
      if (!isNaN(parsed)) offsetNum = parsed;
    }

    const queryParams = [...params, limitNum, offsetNum];
    const querySql = `
      SELECT 
        s.*,
        json_build_object('fullName', u."fullName") as "addedBy",
        COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0)::float as "totalInward",
        COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)::float as "totalSold",
        COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'PENDING'), 0)::float as "pendingSold"
      FROM "IndividualStock" s
      LEFT JOIN "User" u ON s."addedById" = u.id
      ${whereSql}
      ORDER BY s."createdAt" ASC, s."id" ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    const nextOffset = (offsetNum + rows.length < totalCount) ? (offsetNum + limitNum).toString() : null;

    const itemsWithBalance = rows.map(item => {
      const opening = parseFloat(item.openingStock) || 0;
      const inward = parseFloat(item.totalInward) || 0;
      const sold = parseFloat(item.totalSold) || 0;
      const balance = opening + inward - sold;
      return {
        ...item,
        openingStock: opening,
        totalInward: inward,
        totalSold: sold,
        balanceStock: Math.max(0, balance),
        pendingSold: parseFloat(item.pendingSold) || 0
      };
    });

    res.json({ items: itemsWithBalance, nextCursor: nextOffset, totalCount, page: parseInt(page, 10) || 1 });
  } catch (err) {
    console.error('Error fetching individual stocks:', err);
    res.status(500).json({ error: 'Failed to list individual stocks' });
  }
});

// POST /api/individual-stocks - Create new individual stock item with full Item Master fields (Owner/Manager)
app.post('/api/individual-stocks', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { 
      kpclCode, 
      itemName, 
      specifications, 
      partNumber, 
      make, 
      hsnCode, 
      unit = 'NOS', 
      openingStock = 0, 
      rate = 0, 
      cgstPercent = 9, 
      sgstPercent = 9, 
      igstPercent = 0, 
      remarks 
    } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item Name is required' });
    }

    const openStockNum = parseFloat(openingStock) || 0;
    const rateNum = parseFloat(rate) || 0;
    const basicAmt = Math.round((openStockNum * rateNum + Number.EPSILON) * 100) / 100;
    const cgstP = parseFloat(cgstPercent) || 0;
    const sgstP = parseFloat(sgstPercent) || 0;
    const igstP = parseFloat(igstPercent) || 0;

    const { rows } = await pool.query(
      `INSERT INTO "IndividualStock" (
        "id", "kpclCode", "itemName", "specifications", "partNumber", "make", "hsnCode", 
        "unit", "openingStock", "rate", "basicAmount", "cgstPercent", "sgstPercent", "igstPercent", 
        "currentStock", "remarks", "addedById", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $8, $14, $15, NOW(), NOW()
      ) RETURNING *`,
      [
        kpclCode ? kpclCode.trim().toUpperCase() : null,
        itemName.trim(),
        specifications ? specifications.trim() : null,
        partNumber ? partNumber.trim().toUpperCase() : null,
        make ? make.trim().toUpperCase() : null,
        hsnCode ? hsnCode.trim().toUpperCase() : null,
        unit ? unit.trim().toUpperCase() : 'NOS',
        openStockNum,
        rateNum,
        basicAmt,
        cgstP,
        sgstP,
        igstP,
        remarks ? remarks.trim() : null,
        req.user.id
      ]
    );

    res.status(201).json({ message: 'Individual Stock created successfully!', item: rows[0] });
  } catch (err) {
    console.error('Error creating individual stock:', err);
    res.status(500).json({ error: 'Failed to create individual stock item' });
  }
});

// PUT /api/individual-stocks/:id - Update individual stock item (Owner/Manager)
app.put('/api/individual-stocks/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { 
      kpclCode, 
      itemName, 
      specifications, 
      partNumber, 
      make, 
      hsnCode, 
      unit, 
      openingStock, 
      rate, 
      cgstPercent, 
      sgstPercent, 
      igstPercent, 
      remarks 
    } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item Name is required' });
    }

    const openStockNum = openingStock !== undefined ? (parseFloat(openingStock) || 0) : 0;
    const rateNum = rate !== undefined ? (parseFloat(rate) || 0) : 0;
    const basicAmt = Math.round((openStockNum * rateNum + Number.EPSILON) * 100) / 100;
    const cgstP = cgstPercent !== undefined ? (parseFloat(cgstPercent) || 0) : 0;
    const sgstP = sgstPercent !== undefined ? (parseFloat(sgstPercent) || 0) : 0;
    const igstP = igstPercent !== undefined ? (parseFloat(igstPercent) || 0) : 0;

    await client.query('BEGIN');

    const updateSql = `
      UPDATE "IndividualStock"
      SET "kpclCode" = $1,
          "itemName" = $2,
          "specifications" = $3,
          "partNumber" = $4,
          "make" = $5,
          "hsnCode" = $6,
          "unit" = $7,
          "openingStock" = $8,
          "rate" = $9,
          "basicAmount" = $10,
          "cgstPercent" = $11,
          "sgstPercent" = $12,
          "igstPercent" = $13,
          "remarks" = $14,
          "updatedAt" = NOW()
      WHERE "id" = $15
      RETURNING *
    `;

    const { rows } = await client.query(updateSql, [
      kpclCode ? kpclCode.trim().toUpperCase() : null,
      itemName.trim(),
      specifications ? specifications.trim() : null,
      partNumber ? partNumber.trim().toUpperCase() : null,
      make ? make.trim().toUpperCase() : null,
      hsnCode ? hsnCode.trim().toUpperCase() : null,
      unit ? unit.trim().toUpperCase() : 'NOS',
      openStockNum,
      rateNum,
      basicAmt,
      cgstP,
      sgstP,
      igstP,
      remarks ? remarks.trim() : null,
      id
    ]);

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Individual stock item not found' });
    }

    // Recalculate and sync currentStock based on updated openingStock + approved inward - approved outward
    await client.query(`
      UPDATE "IndividualStock" s
      SET "currentStock" = GREATEST(0, (
        s."openingStock" + 
        COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0) -
        COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)
      ))
      WHERE s.id = $1
    `, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Individual stock updated successfully!', item: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating individual stock:', err);
    res.status(500).json({ error: 'Failed to update individual stock' });
  } finally {
    client.release();
  }
});

// DELETE /api/individual-stocks/:id - Delete individual stock item (Owner/Manager)
app.delete('/api/individual-stocks/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const checkTx = await pool.query(`SELECT COUNT(*)::int as count FROM "IndividualStockTransaction" WHERE "stockId" = $1`, [id]);
    if (checkTx.rows[0]?.count > 0) {
      return res.status(400).json({ error: 'Cannot delete individual stock item with existing purchase or sale transaction history' });
    }

    const delRes = await pool.query(`DELETE FROM "IndividualStock" WHERE id = $1 RETURNING *`, [id]);
    if (delRes.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    res.json({ message: 'Individual stock item deleted successfully' });
  } catch (err) {
    console.error('Error deleting individual stock:', err);
    res.status(500).json({ error: 'Failed to delete individual stock item' });
  }
});

// GET /api/individual-stocks/transactions - Get all transactions across items (with type, search, pagination)
app.get('/api/individual-stocks/transactions', authenticateToken, async (req, res) => {
  try {
    const { type, search, invoiceNumber, dateFrom, dateTo, page, limit = 50 } = req.query;
    const limitNum = parseInt(limit, 10) || 50;

    let whereClauses = [];
    let params = [];

    if (type && type.trim()) {
      params.push(type.trim().toUpperCase());
      whereClauses.push(`tx.type = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(
        s."itemName" ILIKE $${params.length} OR 
        s."partNumber" ILIKE $${params.length} OR 
        tx."partyName" ILIKE $${params.length} OR 
        tx."partyInvoiceNumber" ILIKE $${params.length} OR 
        tx."remarks" ILIKE $${params.length}
      )`);
    }

    if (invoiceNumber && invoiceNumber.trim()) {
      params.push(`%${invoiceNumber.trim()}%`);
      whereClauses.push(`tx."partyInvoiceNumber" ILIKE $${params.length}`);
    }

    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`tx."date" >= $${params.length}`);
    }

    if (dateTo) {
      const endD = new Date(dateTo);
      endD.setHours(23, 59, 59, 999);
      params.push(endD);
      whereClauses.push(`tx."date" <= $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM "IndividualStockTransaction" tx
       LEFT JOIN "IndividualStock" s ON tx."stockId" = s.id
       ${whereSql}`, 
      params
    );
    const totalCount = countRes.rows[0]?.count || 0;

    let offsetNum = 0;
    if (req.query.offset !== undefined) {
      const parsedOffset = parseInt(req.query.offset, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) offsetNum = parsedOffset;
    } else if (page) {
      const p = parseInt(page, 10);
      if (p > 1) offsetNum = (p - 1) * limitNum;
    }

    const queryParams = [...params, limitNum, offsetNum];
    const { rows } = await pool.query(
      `SELECT tx.*, 
              COALESCE(tx."partyInvoiceNumber", '') as "invoiceNumber",
              json_build_object(
                'id', s.id, 
                'itemName', s."itemName", 
                'partNumber', s."partNumber", 
                'kpclCode', s."kpclCode", 
                'make', s."make", 
                'unit', s."unit", 
                'rate', s."rate",
                'openingStock', s."openingStock",
                'currentStock', s."currentStock"
              ) as "stock",
              json_build_object('fullName', u."fullName") as "addedBy",
              json_build_object('fullName', au."fullName") as "approvedBy"
       FROM "IndividualStockTransaction" tx
       LEFT JOIN "IndividualStock" s ON tx."stockId" = s.id
       LEFT JOIN "User" u ON tx."addedById" = u.id
       LEFT JOIN "User" au ON tx."approvedById" = au.id
       ${whereSql}
       ORDER BY tx."date" ASC, tx."createdAt" ASC, tx."id" ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.json({ transactions: rows, totalCount, page: parseInt(page, 10) || 1 });
  } catch (err) {
    console.error('Error listing all individual transactions:', err);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

// GET /api/individual-stocks/:id/transactions - Get transaction history for a single item
app.get('/api/individual-stocks/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT tx.*, 
              json_build_object('fullName', u."fullName") as "addedBy",
              json_build_object('fullName', au."fullName") as "approvedBy"
       FROM "IndividualStockTransaction" tx
       LEFT JOIN "User" u ON tx."addedById" = u.id
       LEFT JOIN "User" au ON tx."approvedById" = au.id
       WHERE tx."stockId" = $1
       ORDER BY tx."date" ASC, tx."createdAt" ASC, tx."id" ASC`,
      [id]
    );

    res.json({ transactions: rows });
  } catch (err) {
    console.error('Error listing transactions:', err);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

// SHARED INWARD PURCHASE HANDLER
const handleInwardPurchase = async (req, res) => {
  const client = await pool.connect();
  try {
    const stockId = req.params.stockId || req.body.stockId;
    const d = req.body;
    if (!stockId) return res.status(400).json({ error: 'Stock item selection is required' });
    if (!d.date) return res.status(400).json({ error: 'Inward receipt date is required' });

    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const shippingCharges = parseFloat(d.shippingCharges) || 0;
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });

    const basicAmount = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
    const cgstP = parseFloat(d.cgstPercent) || 0;
    const sgstP = parseFloat(d.sgstPercent) || 0;
    const igstP = parseFloat(d.igstPercent) || 0;
    const cgstAmount = Math.round((basicAmount * (cgstP / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round((basicAmount * (sgstP / 100) + Number.EPSILON) * 100) / 100;
    const igstAmount = Math.round((basicAmount * (igstP / 100) + Number.EPSILON) * 100) / 100;
    const totalAmount = Math.round((basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges + Number.EPSILON) * 100) / 100;

    await client.query('BEGIN');

    // Row-level lock on the stock item
    const stockRes = await client.query(`SELECT * FROM "IndividualStock" WHERE id = $1 FOR UPDATE`, [stockId]);
    if (stockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Individual stock item not found' });
    }

    const { rows: txRows } = await client.query(
      `INSERT INTO "IndividualStockTransaction" (
        "id", "stockId", "type", "date", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "shippingCharges", "totalAmount", "partyName", "supplierAddress", "gstNumber", "companyGstNumber",
        "partyInvoiceNumber", "supplierInvoiceDate", "vehicleNumber", "remarks", "status", "addedById", "createdAt"
      ) VALUES (
        gen_random_uuid()::text, $1, 'INWARD', $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, '29DWKPP3582H1ZV',
        $17, $18, $19, $20, 'APPROVED', $21, NOW()
      ) RETURNING *`,
      [
        stockId, new Date(d.date), qty, rate, basicAmount,
        cgstP, sgstP, igstP, cgstAmount, sgstAmount, igstAmount,
        shippingCharges, totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        req.user.id
      ]
    );

    // Sync currentStock on master record
    await client.query(
      `UPDATE "IndividualStock"
       SET "currentStock" = (
         "openingStock" + 
         COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0) -
         COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)
       ),
       "updatedAt" = NOW()
       WHERE id = $1`,
      [stockId]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Inward delivery recorded successfully!', transaction: txRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording individual purchase:', err);
    res.status(500).json({ error: 'Failed to record inward purchase' });
  } finally {
    client.release();
  }
};

app.post('/api/individual-stocks/purchase', authenticateToken, requireRoles(['OWNER', 'MANAGER']), handleInwardPurchase);
app.post('/api/individual-stocks/:stockId/inward', authenticateToken, requireRoles(['OWNER', 'MANAGER']), handleInwardPurchase);

// SHARED OUTWARD SALE HANDLER
const handleOutwardSale = async (req, res) => {
  const client = await pool.connect();
  try {
    const stockId = req.params.stockId || req.body.stockId;
    const d = req.body;
    if (!stockId) return res.status(400).json({ error: 'Stock item selection is required' });
    const invNo = (d.invoiceNumber || d.partyInvoiceNumber || '').trim().toUpperCase();
    if (!invNo) return res.status(400).json({ error: 'Invoice Number is required' });
    const saleDate = d.invoiceDate || d.date;
    if (!saleDate) return res.status(400).json({ error: 'Invoice Date is required' });

    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const shippingCharges = parseFloat(d.shippingCharges) || 0;
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });

    const basicAmount = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
    const cgstP = parseFloat(d.cgstPercent) || 0;
    const sgstP = parseFloat(d.sgstPercent) || 0;
    const igstP = parseFloat(d.igstPercent) || 0;
    const cgstAmount = Math.round((basicAmount * (cgstP / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round((basicAmount * (sgstP / 100) + Number.EPSILON) * 100) / 100;
    const igstAmount = Math.round((basicAmount * (igstP / 100) + Number.EPSILON) * 100) / 100;
    const totalAmount = Math.round((basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges + Number.EPSILON) * 100) / 100;

    await client.query('BEGIN');

    // Row-level lock on the stock item to compute available balance accurately
    const stockRes = await client.query(
      `SELECT s.*,
              COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0)::float as "totalInward",
              COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)::float as "totalSold"
       FROM "IndividualStock" s
       WHERE s.id = $1
       FOR UPDATE`,
      [stockId]
    );

    if (stockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Individual stock item not found' });
    }

    const stock = stockRes.rows[0];
    const availableBalance = (parseFloat(stock.openingStock) || 0) + stock.totalInward - stock.totalSold;

    if (qty > availableBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Requested quantity (${qty}) exceeds available stock balance (${availableBalance})` });
    }

    // Determine initial status: If OWNER creates it, auto-approve; otherwise PENDING
    const isOwner = req.user.role === 'OWNER';
    const txStatus = isOwner ? 'APPROVED' : 'PENDING';

    const { rows: txRows } = await client.query(
      `INSERT INTO "IndividualStockTransaction" (
        "id", "stockId", "type", "date", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "shippingCharges", "totalAmount", "partyName", "supplierAddress", "gstNumber", "companyGstNumber",
        "partyInvoiceNumber", "supplierInvoiceDate", "vehicleNumber", "eWayBillNumber", "remarks", "status", "approvedById", "approvedAt", "addedById", "createdAt"
      ) VALUES (
        gen_random_uuid()::text, $1, 'OUTWARD', $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, '29DWKPP3582H1ZV',
        $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()
      ) RETURNING *`,
      [
        stockId, new Date(saleDate), qty, rate, basicAmount,
        cgstP, sgstP, igstP, cgstAmount, sgstAmount, igstAmount,
        shippingCharges, totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        invNo,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.eWayBillNumber ? d.eWayBillNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        txStatus,
        isOwner ? req.user.id : null,
        isOwner ? new Date() : null,
        req.user.id
      ]
    );

    const transaction = txRows[0];

    // If Owner created, immediately update currentStock; otherwise create ApprovalRequest
    if (isOwner) {
      await client.query(
        `UPDATE "IndividualStock"
         SET "currentStock" = (
           "openingStock" + 
           COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0) -
           COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)
         ),
         "updatedAt" = NOW()
         WHERE id = $1`,
        [stockId]
      );
    } else {
      await client.query(
        `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'INDIVIDUAL_SALE', 'PENDING', $1, $2, $3, NOW(), NOW())`,
        [
          req.user.id,
          JSON.stringify({
            transactionId: transaction.id,
            stockId: stockId,
            itemName: stock.itemName,
            partNumber: stock.partNumber,
            invoiceNumber: invNo,
            invoiceDate: saleDate,
            qty,
            rate,
            basicAmount,
            cgstPercent: cgstP,
            sgstPercent: sgstP,
            igstPercent: igstP,
            cgstAmount,
            sgstAmount,
            igstAmount,
            shippingCharges,
            totalAmount,
            partyName: d.partyName || '-',
            supplierAddress: d.supplierAddress || '-',
            companyGstNumber: '29DWKPP3582H1ZV',
            gstNumber: d.gstNumber || '-',
            partyInvoiceNumber: invNo,
            supplierInvoiceDate: d.supplierInvoiceDate || null,
            vehicleNumber: d.vehicleNumber || '-',
            eWayBillNumber: d.eWayBillNumber || '-',
            remarks: d.remarks || '-'
          }),
          `Individual Stock Sale #${invNo} (${qty} ${stock.unit || 'units'} of ${stock.itemName}) submitted for Owner Approval`
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: isOwner ? 'Outward sale recorded and approved!' : 'Sale submitted for Owner approval!',
      transaction,
      isPendingApproval: !isOwner
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording individual sale:', err);
    res.status(500).json({ error: 'Failed to process sale request' });
  } finally {
    client.release();
  }
};

app.post('/api/individual-stocks/sale', authenticateToken, handleOutwardSale);
app.post('/api/individual-stocks/:stockId/sale', authenticateToken, handleOutwardSale);

// PUT /api/individual-stocks/transactions/:id - Edit an existing Inward or Outward transaction (Owner & Manager)
app.put('/api/individual-stocks/transactions/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const d = req.body;

    await client.query('BEGIN');

    // 1. Fetch existing transaction with lock
    const txRes = await client.query(`SELECT * FROM "IndividualStockTransaction" WHERE id = $1 FOR UPDATE`, [id]);
    if (txRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    const currentTx = txRes.rows[0];
    const stockId = currentTx.stockId;

    // 2. Fetch stock item with lock
    const stockRes = await client.query(
      `SELECT s.*,
              COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED' AND tx.id != $1), 0)::float as "otherInward",
              COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = s.id AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED' AND tx.id != $1), 0)::float as "otherSold"
       FROM "IndividualStock" s
       WHERE s.id = $2
       FOR UPDATE`,
      [id, stockId]
    );

    if (stockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Associated stock item not found' });
    }

    const stock = stockRes.rows[0];
    const openingStock = parseFloat(stock.openingStock) || 0;

    const newQty = d.qty !== undefined ? (parseFloat(d.qty) || 0) : currentTx.qty;
    const newRate = d.rate !== undefined ? (parseFloat(d.rate) || 0) : currentTx.rate;
    if (newQty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Stock constraint check:
    if ((currentTx.type === 'OUTWARD' || currentTx.type === 'SALE') && currentTx.status === 'APPROVED') {
      const maxAllowedSale = openingStock + stock.otherInward - stock.otherSold;
      if (newQty > maxAllowedSale) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Cannot update sale to ${newQty}. Only ${maxAllowedSale} units available in stock!` });
      }
    } else if (currentTx.type === 'INWARD' || currentTx.type === 'PURCHASE') {
      const remainingBalance = openingStock + stock.otherInward + newQty - stock.otherSold;
      if (remainingBalance < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Cannot reduce inward quantity to ${newQty}. Sold quantity already exceeds this level by ${Math.abs(remainingBalance)} units!` });
      }
    }

    const basicAmount = Math.round((newQty * newRate + Number.EPSILON) * 100) / 100;
    const cgstP = d.cgstPercent !== undefined ? (parseFloat(d.cgstPercent) || 0) : currentTx.cgstPercent;
    const sgstP = d.sgstPercent !== undefined ? (parseFloat(d.sgstPercent) || 0) : currentTx.sgstPercent;
    const igstP = d.igstPercent !== undefined ? (parseFloat(d.igstPercent) || 0) : currentTx.igstPercent;
    const shippingCharges = d.shippingCharges !== undefined ? (parseFloat(d.shippingCharges) || 0) : (parseFloat(currentTx.shippingCharges) || 0);
    const cgstAmount = Math.round((basicAmount * (cgstP / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round((basicAmount * (sgstP / 100) + Number.EPSILON) * 100) / 100;
    const igstAmount = Math.round((basicAmount * (igstP / 100) + Number.EPSILON) * 100) / 100;
    const totalAmount = Math.round((basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges + Number.EPSILON) * 100) / 100;

    const newDate = d.date || d.invoiceDate ? new Date(d.date || d.invoiceDate) : currentTx.date;
    const newInvoiceNo = d.partyInvoiceNumber || d.invoiceNumber ? (d.partyInvoiceNumber || d.invoiceNumber).trim().toUpperCase() : currentTx.partyInvoiceNumber;
    const newPartyName = d.partyName !== undefined ? (d.partyName ? d.partyName.trim() : null) : currentTx.partyName;
    const newSupplierAddress = d.supplierAddress !== undefined ? (d.supplierAddress ? d.supplierAddress.trim() : null) : currentTx.supplierAddress;
    const newGstNumber = d.gstNumber !== undefined ? (d.gstNumber ? d.gstNumber.trim().toUpperCase() : null) : currentTx.gstNumber;
    const newVehicleNumber = d.vehicleNumber !== undefined ? (d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null) : currentTx.vehicleNumber;
    const newEWayBill = d.eWayBillNumber !== undefined ? (d.eWayBillNumber ? d.eWayBillNumber.trim().toUpperCase() : null) : currentTx.eWayBillNumber;
    const newRemarks = d.remarks !== undefined ? (d.remarks ? d.remarks.trim() : null) : currentTx.remarks;

    const isOutwardSale = currentTx.type === 'OUTWARD' || currentTx.type === 'SALE';
    const nextStatus = isOutwardSale ? 'PENDING' : currentTx.status;

    const { rows: updatedRows } = await client.query(
      `UPDATE "IndividualStockTransaction"
       SET "date" = $1,
           "qty" = $2,
           "rate" = $3,
           "basicAmount" = $4,
           "cgstPercent" = $5,
           "sgstPercent" = $6,
           "igstPercent" = $7,
           "cgstAmount" = $8,
           "sgstAmount" = $9,
           "igstAmount" = $10,
           "shippingCharges" = $11,
           "totalAmount" = $12,
           "partyName" = $13,
           "supplierAddress" = $14,
           "gstNumber" = $15,
           "partyInvoiceNumber" = $16,
           "vehicleNumber" = $17,
           "eWayBillNumber" = $18,
           "remarks" = $19,
           "status" = $20,
           "approvedById" = CASE WHEN $20 = 'PENDING' THEN NULL ELSE "approvedById" END,
           "approvedAt" = CASE WHEN $20 = 'PENDING' THEN NULL ELSE "approvedAt" END
       WHERE "id" = $21
       RETURNING *`,
      [
        newDate, newQty, newRate, basicAmount,
        cgstP, sgstP, igstP, cgstAmount, sgstAmount, igstAmount,
        shippingCharges, totalAmount,
        newPartyName, newSupplierAddress, newGstNumber, newInvoiceNo,
        newVehicleNumber, newEWayBill, newRemarks,
        nextStatus,
        id
      ]
    );

    if (isOutwardSale) {
      const indPayload = {
        transactionId: id,
        stockId: stockId,
        itemName: stock.itemName,
        partNumber: stock.partNumber,
        invoiceNumber: newInvoiceNo,
        invoiceDate: newDate,
        qty: newQty,
        rate: newRate,
        basicAmount,
        cgstPercent: cgstP,
        sgstPercent: sgstP,
        igstPercent: igstP,
        cgstAmount,
        sgstAmount,
        igstAmount,
        shippingCharges,
        totalAmount,
        partyName: newPartyName || '-',
        supplierAddress: newSupplierAddress || '-',
        companyGstNumber: '29DWKPP3582H1ZV',
        gstNumber: newGstNumber || '-',
        partyInvoiceNumber: newInvoiceNo,
        vehicleNumber: newVehicleNumber || '-',
        eWayBillNumber: newEWayBill || '-',
        remarks: newRemarks || '-'
      };

      const indAppCheck = await client.query(
        `SELECT id FROM "ApprovalRequest" WHERE "payload"::text LIKE $1 AND "type" = 'INDIVIDUAL_SALE' ORDER BY "createdAt" DESC LIMIT 1`,
        [`%"transactionId":"${id}"%`]
      );

      if (indAppCheck.rows.length > 0) {
        await client.query(
          `UPDATE "ApprovalRequest"
           SET "status" = 'PENDING',
               "payload" = $1,
               "reason" = $2,
               "requestedById" = $3,
               "approvedById" = NULL,
               "rejectionReason" = NULL,
               "updatedAt" = NOW()
           WHERE id = $4`,
          [
            JSON.stringify(indPayload),
            `Individual Stock Sale #${newInvoiceNo} (${newQty} units of ${stock.itemName}) edited and re-submitted for Owner Approval`,
            req.user.id,
            indAppCheck.rows[0].id
          ]
        );
      } else {
        await client.query(
          `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, 'INDIVIDUAL_SALE', 'PENDING', $1, $2, $3, NOW(), NOW())`,
          [
            req.user.id,
            JSON.stringify(indPayload),
            `Individual Stock Sale #${newInvoiceNo} (${newQty} units of ${stock.itemName}) edited and re-submitted for Owner Approval`
          ]
        );
      }
    }

    // Sync master currentStock
    await client.query(
      `UPDATE "IndividualStock"
       SET "currentStock" = GREATEST(0, (
         "openingStock" + 
         COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0) -
         COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)
       )),
       "updatedAt" = NOW()
       WHERE id = $1`,
      [stockId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Transaction updated successfully!', transaction: updatedRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating individual transaction:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  } finally {
    client.release();
  }
});

// DELETE /api/individual-stocks/transactions/:id - Delete an existing Inward or Outward transaction (Owner & Manager)
app.delete('/api/individual-stocks/transactions/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const txRes = await client.query(`SELECT * FROM "IndividualStockTransaction" WHERE id = $1 FOR UPDATE`, [id]);
    if (txRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    const tx = txRes.rows[0];
    const stockId = tx.stockId;

    // Check if removing an INWARD transaction would cause negative stock
    if ((tx.type === 'INWARD' || tx.type === 'PURCHASE') && tx.status === 'APPROVED') {
      const stockRes = await client.query(
        `SELECT s.*,
                COALESCE((SELECT SUM(t.qty) FROM "IndividualStockTransaction" t WHERE t."stockId" = s.id AND t.type IN ('INWARD', 'PURCHASE') AND t.status = 'APPROVED' AND t.id != $1), 0)::float as "otherInward",
                COALESCE((SELECT SUM(t.qty) FROM "IndividualStockTransaction" t WHERE t."stockId" = s.id AND t.type IN ('OUTWARD', 'SALE') AND t.status = 'APPROVED'), 0)::float as "totalSold"
         FROM "IndividualStock" s
         WHERE s.id = $2
         FOR UPDATE`,
        [id, stockId]
      );

      if (stockRes.rows.length > 0) {
        const stock = stockRes.rows[0];
        const remaining = (parseFloat(stock.openingStock) || 0) + stock.otherInward - stock.totalSold;
        if (remaining < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `Cannot delete this inward receipt. Sold stock (${stock.totalSold}) exceeds remaining inventory (${(parseFloat(stock.openingStock) || 0) + stock.otherInward})!` 
          });
        }
      }
    }

    // Delete any pending approval requests tied to this transaction
    await client.query(`DELETE FROM "ApprovalRequest" WHERE "payload"::text LIKE $1`, [`%"transactionId":"${id}"%`]);

    // Delete transaction
    await client.query(`DELETE FROM "IndividualStockTransaction" WHERE id = $1`, [id]);

    // Recalculate and update master currentStock
    await client.query(
      `UPDATE "IndividualStock"
       SET "currentStock" = GREATEST(0, (
         "openingStock" + 
         COALESCE((SELECT SUM(t.qty) FROM "IndividualStockTransaction" t WHERE t."stockId" = $1 AND t.type IN ('INWARD', 'PURCHASE') AND t.status = 'APPROVED'), 0) -
         COALESCE((SELECT SUM(t.qty) FROM "IndividualStockTransaction" t WHERE t."stockId" = $1 AND t.type IN ('OUTWARD', 'SALE') AND t.status = 'APPROVED'), 0)
       )),
       "updatedAt" = NOW()
       WHERE id = $1`,
      [stockId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Transaction record deleted successfully!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting individual transaction:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  } finally {
    client.release();
  }
});

app.post('/api/approvals/request', authenticateToken, async (req, res) => {
  try {
    const { type, payload, reason } = req.body;
    if (!type || !reason) {
      return res.status(400).json({ error: 'Type and reason are required for approval request' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'PENDING', $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [type, req.user.id, JSON.stringify(payload || {}), reason]
    );

    res.status(201).json({ message: 'Request submitted for Owner/Manager approval', approval: rows[0] });
  } catch (err) {
    console.error('Error creating approval request:', err);
    res.status(500).json({ error: 'Failed to create approval request' });
  }
});

app.get('/api/approvals', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        a.*,
        json_build_object('username', u.username, 'fullName', u."fullName", 'role', u.role) as "requestedBy"
      FROM "ApprovalRequest" a
      LEFT JOIN "User" u ON a."requestedById" = u.id
      WHERE a.status = 'PENDING' AND a.type != 'EDIT_ATTENDANCE'
      ORDER BY a."createdAt" ASC, a."id" ASC
    `);

    res.json({ approvals: rows });
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// --- HOLIDAY CALENDAR APIS (COMPANY / GOVT PAID HOLIDAYS) ---
app.get('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = `
      SELECT h.*, u."fullName" as "addedByName"
      FROM "Holiday" h
      LEFT JOIN "User" u ON h."addedById" = u.id
    `;
    const params = [];

    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      
      // If year is invalid or less than 4 digits (e.g. typing "20" instead of "2026"), default or skip
      if (!isNaN(y) && !isNaN(m) && y >= 1900 && y <= 2100 && m >= 1 && m <= 12) {
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const totalDays = new Date(y, m, 0).getDate();
        const endDate = `${y}-${String(m).padStart(2, '0')}-${String(totalDays).padStart(2, '0')} 23:59:59.999`;
        query += ` WHERE h."date" >= $1::timestamp AND h."date" <= $2::timestamp`;
        params.push(startDate, endDate);
      }
    } else if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y) && y >= 1900 && y <= 2100) {
        query += ` WHERE EXTRACT(YEAR FROM h."date") = $1`;
        params.push(y);
      }
    }

    query += ` ORDER BY h."date" ASC`;
    const { rows } = await pool.query(query, params);
    res.json({ holidays: rows });
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

app.post('/api/holidays', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { date, name, type = 'GOVT_HOLIDAY', description } = req.body;
    if (!date || !name || !name.trim()) {
      return res.status(400).json({ error: 'Holiday date and name are required' });
    }

    // Ensure date is treated as YYYY-MM-DD at 12:00:00 to prevent timezone rollback
    const dateOnlyStr = date.includes('T') ? date.split('T')[0] : date;
    const holidayTimestamp = `${dateOnlyStr} 12:00:00`;

    const { rows } = await pool.query(
      `INSERT INTO "Holiday" ("id", "date", "name", "type", "description", "addedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1::timestamp, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT ("date")
       DO UPDATE SET "name" = EXCLUDED."name", "type" = EXCLUDED."type", "description" = EXCLUDED."description", "updatedAt" = NOW()
       RETURNING *`,
      [holidayTimestamp, name.trim(), type, description || null, req.user.id]
    );

    res.status(201).json({ message: 'Holiday declared successfully!', holiday: rows[0] });
  } catch (err) {
    console.error('Error creating holiday:', err);
    res.status(500).json({ error: 'Failed to save holiday' });
  }
});

app.delete('/api/holidays/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM "Holiday" WHERE "id" = $1`, [id]);
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Error deleting holiday:', err);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

app.patch('/api/approvals/:id/action', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const checkRes = await pool.query(`SELECT * FROM "ApprovalRequest" WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0 || checkRes.rows[0].status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval request not found' });
    }
    const approval = checkRes.rows[0];

    if (approval.type === 'INDIVIDUAL_SALE') {
      // Individual sales approved by OWNER or MANAGER
      const payload = typeof approval.payload === 'string' ? JSON.parse(approval.payload) : approval.payload;
      const txId = payload.transactionId;
      const stockId = payload.stockId;
      const qty = parseFloat(payload.qty) || 0;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (status === 'APPROVED') {
          // Lock stock row and verify sufficient balance
          const stockCheck = await client.query(`SELECT * FROM "IndividualStock" WHERE id = $1 FOR UPDATE`, [stockId]);
          if (stockCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Individual stock item not found' });
          }

          // Update transaction status to APPROVED
          await client.query(
            `UPDATE "IndividualStockTransaction"
             SET "status" = 'APPROVED', "approvedById" = $1, "approvedAt" = NOW()
             WHERE id = $2`,
            [req.user.id, txId]
          );

          // Synchronize currentStock
          await client.query(
            `UPDATE "IndividualStock"
             SET "currentStock" = GREATEST(0, (
               "openingStock" + 
               COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('INWARD', 'PURCHASE') AND tx.status = 'APPROVED'), 0) -
               COALESCE((SELECT SUM(tx.qty) FROM "IndividualStockTransaction" tx WHERE tx."stockId" = $1 AND tx.type IN ('OUTWARD', 'SALE') AND tx.status = 'APPROVED'), 0)
             )),
             "updatedAt" = NOW()
             WHERE id = $1`,
            [stockId]
          );
        } else if (status === 'REJECTED') {
          await client.query(
            `UPDATE "IndividualStockTransaction"
             SET "status" = 'REJECTED', "rejectionReason" = $1, "approvedById" = $2, "approvedAt" = NOW()
             WHERE id = $3`,
            [rejectionReason || 'Rejected by Approver', req.user.id, txId]
          );
        }

        await client.query(
          `UPDATE "ApprovalRequest"
           SET "status" = $1, "approvedById" = $2, "rejectionReason" = $3, "updatedAt" = NOW()
           WHERE id = $4`,
          [status, req.user.id, status === 'REJECTED' ? rejectionReason : null, id]
        );

        await client.query('COMMIT');
        return res.json({ message: `Individual sale request ${status.toLowerCase()} successfully!` });
      } catch (decisionErr) {
        await client.query('ROLLBACK');
        throw decisionErr;
      } finally {
        client.release();
      }
    } else if (approval.type === 'SALE_ENTRY') {
      // Sales must be approved by OWNER ONLY
      if (req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Sale approvals must be reviewed and approved by the OWNER only.' });
      }

      const payload = typeof approval.payload === 'string' ? JSON.parse(approval.payload) : approval.payload;
      const saleId = payload.saleId;

      if (status === 'APPROVED') {
        await pool.query(
          `UPDATE "Sale" 
           SET "status" = 'APPROVED', "approvedById" = $1, "approvedAt" = NOW() 
           WHERE id = $2`,
          [req.user.id, saleId]
        );
      } else if (status === 'REJECTED') {
        await pool.query(
          `UPDATE "Sale" 
           SET "status" = 'REJECTED', "rejectionReason" = $1, "approvedById" = $2, "approvedAt" = NOW() 
           WHERE id = $3`,
          [rejectionReason || 'Rejected by Owner', req.user.id, saleId]
        );
      }
    } else if (approval.type === 'WORK_ORDER_SALE') {
      // Work order sales approved by OWNER
      if (req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Work order sale approvals must be reviewed and approved by the OWNER only.' });
      }

      const payload = typeof approval.payload === 'string' ? JSON.parse(approval.payload) : approval.payload;
      const workOrderId = payload.workOrderId;

      if (status === 'APPROVED') {
        await pool.query(
          `UPDATE "WorkOrder" 
           SET "status" = 'APPROVED', "approvedById" = $1, "approvedAt" = NOW() 
           WHERE id = $2`,
          [req.user.id, workOrderId]
        );
      } else if (status === 'REJECTED') {
        await pool.query(
          `UPDATE "WorkOrder" 
           SET "status" = 'REJECTED', "rejectionReason" = $1, "approvedById" = $2, "approvedAt" = NOW() 
           WHERE id = $3`,
          [rejectionReason || 'Rejected by Owner', req.user.id, workOrderId]
        );
      }
    } else if (status === 'APPROVED' && approval.type === 'EDIT_ATTENDANCE') {
      const payload = typeof approval.payload === 'string' ? JSON.parse(approval.payload) : approval.payload;
      const { date, attendanceData } = payload;
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);

      if (attendanceData && attendanceData.length > 0) {
        const workerIds = attendanceData.map(r => r.workerId);
        const dates = attendanceData.map(r => queryDate);
        const statuses = attendanceData.map(r => r.status);
        const otHours = attendanceData.map(r => parseFloat(r.overtimeHours) || 0.0);
        const dailyWageOverrides = attendanceData.map(r => r.dailyWageOverride ? parseFloat(r.dailyWageOverride) : null);
        const notes = attendanceData.map(r => r.notes || null);
        const userIds = attendanceData.map(r => approval.requestedById);

        await pool.query(
          `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "overtimeHours", "otHours", "dailyWageOverride", "notes", "recordedById", "markedById", "createdAt", "updatedAt")
           SELECT gen_random_uuid()::text, u.workerId, u.dt, u.st::"AttendanceStatus", u.ot, u.ot, u.dw, u.nt, u.uid, u.uid, NOW(), NOW()
           FROM UNNEST($1::text[], $2::timestamp[], $3::text[], $4::numeric[], $5::numeric[], $6::text[], $7::text[]) 
           AS u(workerId, dt, st, ot, dw, nt, uid)
           ON CONFLICT ("workerId", "date")
           DO UPDATE SET 
             "status" = EXCLUDED."status", 
             "overtimeHours" = EXCLUDED."overtimeHours",
             "otHours" = EXCLUDED."otHours", 
             "dailyWageOverride" = EXCLUDED."dailyWageOverride", 
             "notes" = EXCLUDED."notes",
             "recordedById" = EXCLUDED."recordedById",
             "markedById" = EXCLUDED."markedById", 
             "updatedAt" = NOW()`,
          [workerIds, dates, statuses, otHours, dailyWageOverrides, notes, userIds]
        );
      }
    }

    const updateRes = await pool.query(
      `UPDATE "ApprovalRequest"
       SET "status" = $1, "approvedById" = $2, "rejectionReason" = $3, "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, status === 'REJECTED' ? rejectionReason : null, id]
    );

    res.json({ message: `Approval request ${status.toLowerCase()} successfully`, approval: updateRes.rows[0] });
  } catch (err) {
    console.error('Error in approval action:', err);
    res.status(500).json({ error: 'Failed to process approval action' });
  }
});

// --- WORK ORDERS (DIRECT SALES / BILLING ONLY) API ---
// GET /api/work-orders - List all Work Orders
app.get('/api/work-orders', authenticateToken, async (req, res) => {
  try {
    const { search, dateFrom, dateTo } = req.query;
    let query = `
      SELECT wo.*,
             u."fullName" as "addedByName"
      FROM "WorkOrder" wo
      LEFT JOIN "User" u ON wo."addedById" = u.id
    `;
    const whereClauses = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(wo."workOrderNumber") LIKE $${params.length} OR
        LOWER(wo."invoiceNumber") LIKE $${params.length} OR
        LOWER(wo."partyName") LIKE $${params.length} OR
        LOWER(COALESCE(wo."partyGstNumber", '')) LIKE $${params.length} OR
        LOWER(wo."itemName") LIKE $${params.length} OR
        LOWER(COALESCE(wo."partNumber", '')) LIKE $${params.length} OR
        LOWER(COALESCE(wo."vehicleNumber", '')) LIKE $${params.length} OR
        LOWER(COALESCE(wo."eWayBillNumber", '')) LIKE $${params.length}
      )`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      whereClauses.push(`wo."invoiceDate"::date >= $${params.length}::date`);
    }

    if (dateTo) {
      params.push(dateTo);
      whereClauses.push(`wo."invoiceDate"::date <= $${params.length}::date`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY wo."invoiceDate" ASC, wo."createdAt" ASC, wo."id" ASC`;

    const { rows } = await pool.query(query, params);
    res.json({ workOrders: rows, totalCount: rows.length });
  } catch (err) {
    console.error('Error fetching work orders:', err);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// POST /api/work-orders - Create new Work Order Direct Sale
app.post('/api/work-orders', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    if (!d.workOrderNumber || !d.workOrderNumber.trim()) {
      return res.status(400).json({ error: 'Work Order Number is required' });
    }
    if (!d.invoiceNumber || !d.invoiceNumber.trim()) {
      return res.status(400).json({ error: 'Invoice Number is required' });
    }
    if (!d.partyName || !d.partyName.trim()) {
      return res.status(400).json({ error: 'Party / Client Name is required' });
    }
    if (!d.itemName || !d.itemName.trim()) {
      return res.status(400).json({ error: 'Item Name is required' });
    }

    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const shippingCharges = parseFloat(d.shippingCharges) || 0;
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });

    const basicAmount = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
    const cgstP = parseFloat(d.cgstPercent) || 0;
    const sgstP = parseFloat(d.sgstPercent) || 0;
    const igstP = parseFloat(d.igstPercent) || 0;
    const cgstAmount = Math.round((basicAmount * (cgstP / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round((basicAmount * (sgstP / 100) + Number.EPSILON) * 100) / 100;
    const igstAmount = Math.round((basicAmount * (igstP / 100) + Number.EPSILON) * 100) / 100;
    const totalAmount = Math.round((basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges + Number.EPSILON) * 100) / 100;

    const isAutoApproved = req.user.role === 'OWNER';
    const initialStatus = isAutoApproved ? 'APPROVED' : 'PENDING';

    const { rows } = await pool.query(
      `INSERT INTO "WorkOrder" (
        "id", "workOrderNumber", "workOrderDate", "invoiceNumber", "invoiceDate",
        "partyName", "partyAddress", "partyGstNumber", "companyName", "companyGstNumber",
        "itemName", "description", "partNumber", "unit", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "shippingCharges", "totalAmount", "vehicleNumber", "eWayBillNumber", "remarks", "status", "approvedById", "approvedAt", "addedById", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28, $29, $30, $31, NOW(), NOW()
      ) RETURNING *`,
      [
        d.workOrderNumber.trim().toUpperCase(),
        d.workOrderDate ? new Date(d.workOrderDate) : new Date(),
        d.invoiceNumber.trim().toUpperCase(),
        d.invoiceDate ? new Date(d.invoiceDate) : new Date(),
        d.partyName.trim(),
        d.partyAddress ? d.partyAddress.trim() : null,
        d.partyGstNumber ? d.partyGstNumber.trim().toUpperCase() : null,
        d.companyName ? d.companyName.trim() : 'Sri Krishna Constructions',
        d.companyGstNumber ? d.companyGstNumber.trim().toUpperCase() : '29DWKPP3582H1ZV',
        d.itemName.trim(),
        d.description ? d.description.trim() : null,
        d.partNumber ? d.partNumber.trim().toUpperCase() : null,
        d.unit ? d.unit.trim().toUpperCase() : 'NOS',
        qty,
        rate,
        basicAmount,
        cgstP,
        sgstP,
        igstP,
        cgstAmount,
        sgstAmount,
        igstAmount,
        shippingCharges,
        totalAmount,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.eWayBillNumber ? d.eWayBillNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        initialStatus,
        isAutoApproved ? req.user.id : null,
        isAutoApproved ? new Date() : null,
        req.user.id
      ]
    );

    const createdWO = rows[0];

    // If added by Manager / Supervisor, create an ApprovalRequest for Owner review
    if (!isAutoApproved) {
      await pool.query(
        `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'WORK_ORDER_SALE', 'PENDING', $1, $2, $3, NOW(), NOW())`,
        [
          req.user.id,
          JSON.stringify({
            workOrderId: createdWO.id,
            workOrderNumber: createdWO.workOrderNumber,
            invoiceNumber: createdWO.invoiceNumber,
            partyName: createdWO.partyName,
            itemName: createdWO.itemName,
            qty: createdWO.qty,
            rate: createdWO.rate,
            shippingCharges: createdWO.shippingCharges,
            totalAmount: createdWO.totalAmount
          }),
          `Work Order Direct Sale created by ${req.user.fullName || req.user.username} (${createdWO.invoiceNumber} / ₹${totalAmount})`
        ]
      );
    }

    res.status(201).json({ 
      message: isAutoApproved 
        ? 'Work Order direct sale recorded and approved!' 
        : 'Work Order direct sale submitted for Owner approval.',
      workOrder: createdWO 
    });
  } catch (err) {
    console.error('Error creating work order:', err);
    res.status(500).json({ error: 'Failed to create work order entry' });
  }
});

// PUT /api/work-orders/:id - Update Work Order
app.put('/api/work-orders/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;

    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const shippingCharges = d.shippingCharges !== undefined ? (parseFloat(d.shippingCharges) || 0) : 0;
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });

    const basicAmount = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
    const cgstP = parseFloat(d.cgstPercent) || 0;
    const sgstP = parseFloat(d.sgstPercent) || 0;
    const igstP = parseFloat(d.igstPercent) || 0;
    const cgstAmount = Math.round((basicAmount * (cgstP / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round((basicAmount * (sgstP / 100) + Number.EPSILON) * 100) / 100;
    const igstAmount = Math.round((basicAmount * (igstP / 100) + Number.EPSILON) * 100) / 100;
    const totalAmount = Math.round((basicAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges + Number.EPSILON) * 100) / 100;

    const { rows } = await pool.query(
      `UPDATE "WorkOrder"
       SET "workOrderNumber" = COALESCE($1, "workOrderNumber"),
           "workOrderDate" = COALESCE($2, "workOrderDate"),
           "invoiceNumber" = COALESCE($3, "invoiceNumber"),
           "invoiceDate" = COALESCE($4, "invoiceDate"),
           "partyName" = COALESCE($5, "partyName"),
           "partyAddress" = $6,
           "partyGstNumber" = $7,
           "companyName" = COALESCE($8, "companyName"),
           "companyGstNumber" = COALESCE($9, "companyGstNumber"),
           "itemName" = COALESCE($10, "itemName"),
           "description" = $11,
           "partNumber" = $12,
           "unit" = COALESCE($13, "unit"),
           "qty" = $14,
           "rate" = $15,
           "basicAmount" = $16,
           "cgstPercent" = $17,
           "sgstPercent" = $18,
           "igstPercent" = $19,
           "cgstAmount" = $20,
           "sgstAmount" = $21,
           "igstAmount" = $22,
           "shippingCharges" = $23,
           "totalAmount" = $24,
           "vehicleNumber" = $25,
           "eWayBillNumber" = $26,
           "remarks" = $27,
           "updatedAt" = NOW()
       WHERE "id" = $28
       RETURNING *`,
      [
        d.workOrderNumber ? d.workOrderNumber.trim().toUpperCase() : null,
        d.workOrderDate ? new Date(d.workOrderDate) : null,
        d.invoiceNumber ? d.invoiceNumber.trim().toUpperCase() : null,
        d.invoiceDate ? new Date(d.invoiceDate) : null,
        d.partyName ? d.partyName.trim() : null,
        d.partyAddress !== undefined ? (d.partyAddress ? d.partyAddress.trim() : null) : null,
        d.partyGstNumber !== undefined ? (d.partyGstNumber ? d.partyGstNumber.trim().toUpperCase() : null) : null,
        d.companyName ? d.companyName.trim() : null,
        d.companyGstNumber ? d.companyGstNumber.trim().toUpperCase() : null,
        d.itemName ? d.itemName.trim() : null,
        d.description !== undefined ? (d.description ? d.description.trim() : null) : null,
        d.partNumber !== undefined ? (d.partNumber ? d.partNumber.trim().toUpperCase() : null) : null,
        d.unit ? d.unit.trim().toUpperCase() : null,
        qty,
        rate,
        basicAmount,
        cgstP,
        sgstP,
        igstP,
        cgstAmount,
        sgstAmount,
        igstAmount,
        shippingCharges,
        totalAmount,
        d.vehicleNumber !== undefined ? (d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null) : null,
        d.eWayBillNumber !== undefined ? (d.eWayBillNumber ? d.eWayBillNumber.trim().toUpperCase() : null) : null,
        d.remarks !== undefined ? (d.remarks ? d.remarks.trim() : null) : null,
        id
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Work Order not found' });
    res.json({ message: 'Work Order updated successfully', workOrder: rows[0] });
  } catch (err) {
    console.error('Error updating work order:', err);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// DELETE /api/work-orders/:id - Delete Work Order
app.delete('/api/work-orders/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`DELETE FROM "WorkOrder" WHERE "id" = $1 RETURNING *`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Work Order not found' });
    res.json({ message: 'Work Order deleted successfully' });
  } catch (err) {
    console.error('Error deleting work order:', err);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

// --- GLOBAL SALES LEDGER API (CONTINUOUS SEQUENTIAL SL NO ACROSS ALL SALES & WORK ORDERS) ---
app.get('/api/sales-ledger', authenticateToken, async (req, res) => {
  try {
    const { search, dateFrom, dateTo, sourceType, limit: queryLimit, offset: queryOffset } = req.query;
    const limit = Math.min(Math.max(parseInt(queryLimit, 10) || 50, 1), 500);
    const offset = Math.max(parseInt(queryOffset, 10) || 0, 0);

    const conditions = [];
    const params = [];

    if (sourceType && sourceType !== 'ALL') {
      params.push(sourceType);
      conditions.push(`all_sales."sourceType" = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(COALESCE(all_sales."invoiceNumber", '')) LIKE $${pIdx} OR
        LOWER(COALESCE(all_sales."clientDepartment", '')) LIKE $${pIdx} OR
        LOWER(COALESCE(all_sales."clientGst", '')) LIKE $${pIdx} OR
        LOWER(COALESCE(all_sales."vehicleNumber", '')) LIKE $${pIdx} OR
        LOWER(COALESCE(all_sales."eWayBillNumber", '')) LIKE $${pIdx} OR
        LOWER(COALESCE(all_sales."itemName", '')) LIKE $${pIdx} OR
        LOWER(COALESCE(all_sales."partNumber", '')) LIKE $${pIdx} OR
        LOWER(COALESCE(all_sales."workOrderNumber", '')) LIKE $${pIdx}
      )`);
    }

    if (dateFrom) {
      params.push(new Date(dateFrom));
      conditions.push(`all_sales."date" >= $${params.length}`);
    }

    if (dateTo) {
      params.push(new Date(dateTo));
      conditions.push(`all_sales."date" <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseCte = `
      WITH all_sales AS (
        -- 1. PO Sales
        SELECT 
          s.id,
          'PO' as "sourceType",
          s."invoiceNumber",
          s."invoiceDate" as "date",
          COALESCE(s."partyName", po."poNumber", '-') as "clientDepartment",
          s."gstNumber" as "clientGst",
          'Sales' as "nameOfWork",
          s."vehicleNumber",
          s."eWayBillNumber",
          s.qty,
          s.rate,
          s."basicAmount",
          s."cgstPercent",
          s."sgstPercent",
          s."igstPercent",
          s."cgstAmount",
          s."sgstAmount",
          s."igstAmount",
          COALESCE(s."shippingCharges", 0) as "shippingCharges",
          s."totalAmount",
          s."status",
          s."remarks",
          s."createdAt",
          poi."itemName" as "itemName",
          poi."partNumber" as "partNumber",
          poi."kpclCode" as "kpclCode",
          poi."unit" as "unit",
          po."poNumber" as "poNumber",
          '-' as "workOrderNumber",
          NULL::timestamp as "workOrderDate",
          'Sri Krishna Constructions' as "companyName",
          '29DWKPP3582H1ZV' as "companyGstNumber"
        FROM "Sale" s
        JOIN "PurchaseOrderItem" poi ON s."purchaseOrderItemId" = poi.id
        LEFT JOIN "PurchaseOrder" po ON poi."purchaseOrderId" = po.id
        WHERE s."status" = 'APPROVED'

        UNION ALL

        -- 2. Individual Stock Outward Sales
        SELECT 
          tx.id,
          'INDIVIDUAL' as "sourceType",
          COALESCE(tx."partyInvoiceNumber", '-') as "invoiceNumber",
          tx."date" as "date",
          COALESCE(tx."partyName", 'DIRECT CLIENT') as "clientDepartment",
          tx."gstNumber" as "clientGst",
          'Sales' as "nameOfWork",
          tx."vehicleNumber",
          tx."eWayBillNumber",
          tx.qty,
          tx.rate,
          tx."basicAmount",
          tx."cgstPercent",
          tx."sgstPercent",
          tx."igstPercent",
          tx."cgstAmount",
          tx."sgstAmount",
          tx."igstAmount",
          COALESCE(tx."shippingCharges", 0) as "shippingCharges",
          tx."totalAmount",
          tx."status",
          tx."remarks",
          tx."createdAt",
          ind."itemName" as "itemName",
          ind."partNumber" as "partNumber",
          COALESCE(ind."kpclCode", '-') as "kpclCode",
          ind."unit" as "unit",
          '-' as "poNumber",
          '-' as "workOrderNumber",
          NULL::timestamp as "workOrderDate",
          'Sri Krishna Constructions' as "companyName",
          '29DWKPP3582H1ZV' as "companyGstNumber"
        FROM "IndividualStockTransaction" tx
        JOIN "IndividualStock" ind ON tx."stockId" = ind.id
        WHERE tx.type = 'OUTWARD' AND tx."status" = 'APPROVED'

        UNION ALL

        -- 3. Work Order Direct Sales (Sales Ledger Integrated)
        SELECT 
          wo.id,
          'WORK_ORDER' as "sourceType",
          wo."invoiceNumber",
          wo."invoiceDate" as "date",
          wo."partyName" as "clientDepartment",
          wo."partyGstNumber" as "clientGst",
          'Work Order Sales' as "nameOfWork",
          wo."vehicleNumber",
          wo."eWayBillNumber",
          wo.qty,
          wo.rate,
          wo."basicAmount",
          wo."cgstPercent",
          wo."sgstPercent",
          wo."igstPercent",
          wo."cgstAmount",
          wo."sgstAmount",
          wo."igstAmount",
          COALESCE(wo."shippingCharges", 0) as "shippingCharges",
          wo."totalAmount",
          wo."status",
          wo."remarks",
          wo."createdAt",
          wo."itemName" as "itemName",
          COALESCE(wo."partNumber", '-') as "partNumber",
          '-' as "kpclCode",
          wo."unit" as "unit",
          '-' as "poNumber",
          wo."workOrderNumber" as "workOrderNumber",
          wo."workOrderDate" as "workOrderDate",
          wo."companyName" as "companyName",
          wo."companyGstNumber" as "companyGstNumber"
        FROM "WorkOrder" wo
        WHERE wo."status" = 'APPROVED'
      )
    `;

    const sortDirection = (req.query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      ${baseCte},
      numbered_sales AS (
        SELECT 
          all_sales.*,
          ROW_NUMBER() OVER (ORDER BY all_sales."date" ASC, all_sales."createdAt" ASC, all_sales.id ASC) as "slNo"
        FROM all_sales
        ${whereClause}
      )
      SELECT *
      FROM numbered_sales
      ORDER BY numbered_sales."date" ${sortDirection}, numbered_sales."createdAt" ${sortDirection}, numbered_sales.id ${sortDirection}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const countQuery = `
      ${baseCte}
      SELECT COUNT(*)::int as count
      FROM all_sales
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, params)
    ]);

    const totalCount = countResult.rows[0]?.count || 0;
    const sales = dataResult.rows.map(r => ({
      ...r,
      slNo: parseInt(r.slNo, 10)
    }));

    res.json({
      sales,
      totalCount,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit) || 1
    });
  } catch (err) {
    console.error('Error fetching sales ledger:', err);
    res.status(500).json({ error: 'Failed to fetch sales ledger' });
  }
});

// --- MASTER USER MANAGEMENT (WITH MANDATORY MOBILE & SMART DELETE & ASSIGNED DIVISION RESTRICTION) ---
app.get('/api/users', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { rows: users } = await pool.query(
      `SELECT u."id", u."username", u."fullName", u."mobileNumber", u."role", u."assignedDivisionId", u."createdAt",
              json_build_object('id', d.id, 'name', d.name) as "assignedDivision"
       FROM "User" u
       LEFT JOIN "Division" d ON u."assignedDivisionId" = d.id
       ORDER BY u."createdAt" DESC`
    );

    const userList = users.map((u) => ({
      ...u,
      hasCreatedEntries: false,
    }));

    res.json({ users: userList });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const { username, fullName, mobileNumber, password, role, assignedDivisionId } = req.body;

    // MANDATORY MOBILE NUMBER CHECK
    if (!username || !fullName || !mobileNumber || !password || !role) {
      return res.status(400).json({ error: 'All fields (Username, Full Name, Mobile Number, Password, Role) are mandatory!' });
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      return res.status(400).json({ error: 'Mobile number must be a valid 10-digit phone number' });
    }

    if (!['OWNER', 'MANAGER', 'SUPERVISOR'].includes(role)) {
      return res.status(400).json({ error: 'Role must be OWNER, MANAGER, or SUPERVISOR' });
    }

    // ROLE CAPACITY LIMITS: OWNER: max 2, MANAGER: max 2, SUPERVISOR: max 5
    if (role === 'OWNER') {
      const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'OWNER'`);
      if (countRows[0].count >= 2) {
        return res.status(400).json({ error: 'Cannot create more Owner accounts. Maximum limit of 2 Owners reached.' });
      }
    } else if (role === 'MANAGER') {
      const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'MANAGER'`);
      if (countRows[0].count >= 2) {
        return res.status(400).json({ error: 'Cannot create more Manager accounts. Maximum limit of 2 Managers reached.' });
      }
    } else if (role === 'SUPERVISOR') {
      const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'SUPERVISOR'`);
      if (countRows[0].count >= 5) {
        return res.status(400).json({ error: 'Cannot create more Supervisor accounts. Maximum limit of 5 Supervisors reached.' });
      }
    }

    const { rows: existingRows } = await pool.query(`SELECT id FROM "User" WHERE LOWER(username) = LOWER($1)`, [username.trim()]);
    if (existingRows.length > 0) {
      return res.status(400).json({ error: `Username '${username}' is already taken` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedDiv = (role === 'SUPERVISOR' && assignedDivisionId && assignedDivisionId !== 'ALL') ? assignedDivisionId : null;

    const { rows: newUserRows } = await pool.query(
      `INSERT INTO "User" ("id", "username", "fullName", "mobileNumber", "password", "role", "assignedDivisionId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::"Role", $6, NOW(), NOW())
       RETURNING "id", "username", "fullName", "mobileNumber", "role", "assignedDivisionId", "createdAt"`,
      [username.trim(), fullName.trim(), mobileNumber.trim(), hashedPassword, role, assignedDiv]
    );

    res.status(201).json({ user: newUserRows[0] });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, fullName, mobileNumber, password, role, assignedDivisionId } = req.body;

    if (req.user.role !== 'OWNER' && req.user.id !== id) {
      return res.status(403).json({ error: 'Only Owner can edit other user accounts' });
    }

    const { rows: currentRows } = await pool.query(`SELECT * FROM "User" WHERE id = $1`, [id]);
    if (currentRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const currentUser = currentRows[0];

    let newUsername = currentUser.username;
    if (username && username.trim()) {
      const trimmedUser = username.trim();
      const { rows: dupCheck } = await pool.query(`SELECT id FROM "User" WHERE LOWER(username) = LOWER($1) AND id != $2`, [trimmedUser, id]);
      if (dupCheck.length > 0) {
        return res.status(400).json({ error: `Username '${trimmedUser}' is already taken` });
      }
      newUsername = trimmedUser;
    }

    let newFullName = fullName !== undefined ? fullName.trim() : currentUser.fullName;
    let newMobile = currentUser.mobileNumber;
    if (mobileNumber) {
      if (!/^\d{10}$/.test(mobileNumber.trim())) {
        return res.status(400).json({ error: 'Mobile number must be a valid 10-digit phone number' });
      }
      newMobile = mobileNumber.trim();
    }

    let newRole = currentUser.role;
    if (role) {
      if (req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only Owner can change roles' });
      }
      if (!['SUPERVISOR', 'MANAGER', 'OWNER'].includes(role)) {
        return res.status(400).json({ error: 'Role must be OWNER, MANAGER, or SUPERVISOR' });
      }

      if (currentUser.role !== role) {
        if (role === 'OWNER') {
          const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'OWNER'`);
          if (countRows[0].count >= 2) {
            return res.status(400).json({ error: 'Cannot assign Owner role. Maximum limit of 2 Owners reached.' });
          }
        } else if (role === 'MANAGER') {
          const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'MANAGER'`);
          if (countRows[0].count >= 2) {
            return res.status(400).json({ error: 'Cannot assign Manager role. Maximum limit of 2 Managers reached.' });
          }
        } else if (role === 'SUPERVISOR') {
          const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'SUPERVISOR'`);
          if (countRows[0].count >= 5) {
            return res.status(400).json({ error: 'Cannot assign Supervisor role. Maximum limit of 5 Supervisors reached.' });
          }
        }
      }
      newRole = role;
    }

    let newPassword = currentUser.password;
    if (password && password.trim() !== '') {
      newPassword = await bcrypt.hash(password.trim(), 10);
    }

    const assignedDiv = (newRole === 'SUPERVISOR')
      ? (assignedDivisionId === 'ALL' || assignedDivisionId === '' ? null : (assignedDivisionId || currentUser.assignedDivisionId || null))
      : null;

    const { rows: updatedRows } = await pool.query(
      `UPDATE "User"
       SET "username" = $1, "fullName" = $2, "mobileNumber" = $3, "password" = $4, "role" = $5::"Role", "assignedDivisionId" = $6, "updatedAt" = NOW()
       WHERE "id" = $7
       RETURNING "id", "username", "fullName", "mobileNumber", "role", "assignedDivisionId"`,
      [newUsername, newFullName, newMobile, newPassword, newRole, assignedDiv, id]
    );

    res.json({ message: 'User updated successfully', user: updatedRows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user account details' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has created entries
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner user cannot be deleted' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: `User '${user.username}' deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- WORKER DIVISIONS API (ATTENDANCE DIVISIONS & PO DIVISIONS/CLIENTS) ---
app.get('/api/divisions', authenticateToken, async (req, res) => {
  try {
    const { type, activeOnly } = req.query;
    let whereClauses = [];
    const params = [];
    if (type) {
      params.push(type.toUpperCase());
      whereClauses.push(`d."type" = $${params.length}`);
    }
    if (activeOnly === 'true') {
      whereClauses.push(`COALESCE(d."isActive", true) = true`);
    }
    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const { rows: divisions } = await pool.query(`
      SELECT d."id", d."name", COALESCE(d."type", 'PO_CLIENT') as "type", 
             COALESCE(d."isActive", true) as "isActive", d."createdAt", d."updatedAt",
             COUNT(w."id")::int as "workerCount",
             json_build_object('workers', COUNT(w."id")::int) as "_count"
      FROM "Division" d
      LEFT JOIN "Worker" w ON d."id" = w."divisionId"
      ${whereSql}
      GROUP BY d."id", d."name", d."type", d."isActive", d."createdAt", d."updatedAt"
      ORDER BY d."name" ASC
    `, params);
    res.json({ divisions });
  } catch (err) {
    console.error('Fetch divisions error:', err);
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

app.post('/api/divisions', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { name, type, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const cleanName = name.trim();
    const divType = (type && type.toUpperCase() === 'ATTENDANCE') ? 'ATTENDANCE' : 'PO_CLIENT';
    const activeVal = isActive !== undefined ? !!isActive : true;

    const existing = await pool.query(
      'SELECT id FROM "Division" WHERE LOWER("name") = LOWER($1) AND "type" = $2',
      [cleanName, divType]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: `Division '${cleanName}' already exists under ${divType === 'ATTENDANCE' ? 'Attendance Divisions' : 'PO Divisions / Clients'}` 
      });
    }
    const { rows } = await pool.query(
      `INSERT INTO "Division" ("id", "name", "type", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [cleanName, divType, activeVal]
    );
    res.status(201).json({ division: rows[0] });
  } catch (err) {
    console.error('Create division error:', err);
    res.status(500).json({ error: 'Failed to create division' });
  }
});

app.put('/api/divisions/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const cleanName = name.trim();
    const { rows: currentDiv } = await pool.query('SELECT "type", "isActive" FROM "Division" WHERE "id" = $1', [id]);
    const targetType = type ? type.toUpperCase() : (currentDiv[0]?.type || 'PO_CLIENT');

    const existing = await pool.query(
      'SELECT id FROM "Division" WHERE LOWER("name") = LOWER($1) AND "type" = $2 AND "id" != $3',
      [cleanName, targetType, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: `Division '${cleanName}' already exists under ${targetType === 'ATTENDANCE' ? 'Attendance Divisions' : 'PO Divisions / Clients'}` 
      });
    }
    const { rows } = await pool.query(
      `UPDATE "Division"
       SET "name" = $1,
           "type" = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE "type" END,
           "isActive" = CASE WHEN $3::boolean IS NOT NULL THEN $3 ELSE "isActive" END,
           "updatedAt" = NOW()
       WHERE "id" = $4
       RETURNING *`,
      [cleanName, type ? type.toUpperCase() : null, isActive !== undefined ? !!isActive : null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Division not found' });
    res.json({ division: rows[0], message: 'Division updated successfully' });
  } catch (err) {
    console.error('Update division error:', err);
    res.status(500).json({ error: 'Failed to update division' });
  }
});

app.patch('/api/divisions/:id/toggle-active', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE "Division"
       SET "isActive" = NOT COALESCE("isActive", true),
           "updatedAt" = NOW()
       WHERE "id" = $1
       RETURNING *`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Division not found' });
    res.json({ division: rows[0], message: `Division marked as ${rows[0].isActive ? 'ACTIVE' : 'INACTIVE'}` });
  } catch (err) {
    console.error('Toggle division active error:', err);
    res.status(500).json({ error: 'Failed to update division status' });
  }
});

app.delete('/api/divisions/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    // Check if any workers are assigned to this division
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "Worker" WHERE "divisionId" = $1`, [id]);
    const workerCount = countRows[0]?.count || 0;
    if (workerCount > 0) {
      return res.status(400).json({ error: `Cannot delete division — ${workerCount} worker(s) are still assigned. Please reassign them to another division first.` });
    }
    await pool.query(`DELETE FROM "Division" WHERE "id" = $1`, [id]);
    res.json({ message: 'Division deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete division' });
  }
});

// --- WORKERS REGISTRY API (DIRECT POSTGRESQL LAYER) ---
app.get('/api/workers', authenticateToken, async (req, res) => {
  try {
    const { divisionId, limit = 50, cursor, status, isActive } = req.query;
    const limitNum = parseInt(limit, 10) || 50;

    let query = `
      SELECT w."id", w."workerId", w."fullName", w."fatherName", w."designation", w."mobileNumber",
             w."dailyWage", COALESCE(w."dailyAllowance", 0) as "dailyAllowance",
             COALESCE(w."extraAmount", 0) as "extraAmount",
             COALESCE(w."advanceTaken", 0) as "advanceTaken",
             COALESCE(w."advanceBalance", 0) as "advanceBalance",
             COALESCE(w."otAllowance", 0) as "otAllowance",
             w."otHourlyRate", w."divisionId",
             w."previousDailyWage", w."wageRevisedDate",
             COALESCE(w."isActive", true) as "isActive",
             COALESCE(w."pfNumber", '') as "pfNumber",
             COALESCE(w."esiNumber", '') as "esiNumber",
             COALESCE(w."uanNumber", '') as "uanNumber",
             COALESCE(w."bankAccountNo", '') as "bankAccountNo",
             COALESCE(w."ifscCode", '') as "ifscCode",
             COALESCE(w."placeOfWork", '') as "placeOfWork",
             COALESCE(w."natureOfWork", '') as "natureOfWork",
             w."createdAt", w."updatedAt",
             json_build_object('id', d."id", 'name', d."name") as "division"
      FROM "Worker" w
      JOIN "Division" d ON w."divisionId" = d."id"
    `;
    const params = [];
    let whereClauses = [];

    if (divisionId) {
      params.push(divisionId);
      whereClauses.push(`w."divisionId" = $${params.length}`);
    }

    if (status === 'ACTIVE' || status === 'active' || isActive === 'true') {
      whereClauses.push(`COALESCE(w."isActive", true) = true`);
    } else if (status === 'INACTIVE' || status === 'inactive' || isActive === 'false') {
      whereClauses.push(`COALESCE(w."isActive", true) = false`);
    }

    if (cursor) {
      params.push(cursor);
      whereClauses.push(`w."id" > $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY 
      CASE 
        WHEN w."workerId" ~ '^SKC-E-[0-9]+$' THEN CAST(SUBSTRING(w."workerId" FROM 7) AS INTEGER)
        WHEN w."workerId" ~ '^[0-9]+$' THEN CAST(w."workerId" AS INTEGER)
        ELSE 999999
      END ASC, w."workerId" ASC, w."fullName" ASC`;
    
    params.push(limitNum + 1);
    query += ` LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      const nextWorker = rows.pop();
      nextCursor = nextWorker.id;
    }

    res.json({ workers: rows, nextCursor });
  } catch (err) {
    console.error('Fetch workers error:', err);
    res.status(500).json({ error: 'Failed to fetch workers list' });
  }
});

app.post('/api/workers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'SUPERVISOR') {
      return res.status(403).json({ error: 'Worker registration is restricted to Owners or Managers only!' });
    }

    const { workerId, fullName, fatherName, designation, mobileNumber, dailyWage, dailyAllowance, extraAmount, advanceTaken, advanceBalance, advanceTakenDate, advanceReason, advanceReturnDate, otAllowance, otHourlyRate, divisionId, isActive, pfNumber, esiNumber, uanNumber, bankAccountNo, ifscCode, placeOfWork, natureOfWork } = req.body;
    if (!workerId || !fullName || !mobileNumber || !dailyWage || !divisionId) {
      return res.status(400).json({ error: 'Worker ID, Full Name, Mobile Number, Daily Wage, and Division are mandatory!' });
    }

    // Format phone number to strict Indian format
    let cleanedPhone = mobileNumber.trim().replace(/[^0-9+]/g, '');
    if (cleanedPhone.length === 10) {
      cleanedPhone = '+91' + cleanedPhone;
    } else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
      cleanedPhone = '+' + cleanedPhone;
    }

    if (!/^\+91\d{10}$/.test(cleanedPhone)) {
      return res.status(400).json({ error: 'Mobile number must be a valid 10-digit Indian phone number (+91)' });
    }

    const { rows: existingRows } = await pool.query(
      `SELECT "id" FROM "Worker" WHERE "workerId" = $1`,
      [workerId.trim()]
    );
    if (existingRows.length > 0) {
      return res.status(400).json({ error: `Worker ID '${workerId}' is already registered` });
    }

    const numDailyWage = parseFloat(dailyWage) || 0;
    const numAllowance = dailyAllowance !== undefined && dailyAllowance !== '' ? parseFloat(dailyAllowance) : 0;
    const numExtra = extraAmount !== undefined && extraAmount !== '' ? parseFloat(extraAmount) : 0;
    const numAdvTaken = advanceTaken !== undefined && advanceTaken !== '' ? parseFloat(advanceTaken) : (advanceBalance !== undefined && advanceBalance !== '' ? parseFloat(advanceBalance) : 0);
    const numAdvBal = advanceBalance !== undefined && advanceBalance !== '' ? parseFloat(advanceBalance) : numAdvTaken;
    const numOtAllowance = otAllowance !== undefined && otAllowance !== '' ? (parseFloat(otAllowance) || 0) : 0;
    const numOtRate = otHourlyRate ? parseFloat(otHourlyRate) : numDailyWage / 8;
    const boolIsActive = isActive !== undefined ? Boolean(isActive) : true;

    const advGivenDate = advanceTakenDate ? new Date(advanceTakenDate) : (numAdvTaken > 0 ? new Date() : null);
    const advExpReturnDate = advanceReturnDate ? new Date(advanceReturnDate) : null;
    const advProofReason = advanceReason ? advanceReason.trim() : null;

    const { rows } = await pool.query(
      `INSERT INTO "Worker" ("id", "workerId", "fullName", "fatherName", "designation", "mobileNumber", "dailyWage", "dailyAllowance", "extraAmount", "advanceTaken", "advanceBalance", "advanceTakenDate", "advanceReason", "advanceReturnDate", "otAllowance", "otHourlyRate", "divisionId", "isActive", "pfNumber", "esiNumber", "uanNumber", "bankAccountNo", "ifscCode", "placeOfWork", "natureOfWork", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW())
       RETURNING *`,
      [
        workerId.trim(),
        fullName.trim(),
        fatherName ? fatherName.trim() : null,
        designation ? designation.trim() : null,
        cleanedPhone,
        numDailyWage,
        numAllowance,
        numExtra,
        numAdvTaken,
        numAdvBal,
        advGivenDate,
        advProofReason,
        advExpReturnDate,
        numOtAllowance,
        numOtRate,
        divisionId,
        boolIsActive,
        pfNumber ? pfNumber.trim() : null,
        esiNumber ? esiNumber.trim() : null,
        uanNumber ? uanNumber.trim() : null,
        bankAccountNo ? bankAccountNo.trim() : null,
        ifscCode ? ifscCode.trim() : null,
        placeOfWork ? placeOfWork.trim() : null,
        natureOfWork ? natureOfWork.trim() : null
      ]
    );

    const createdWorker = rows[0];

    // Auto-create initial AdvanceTransaction entry if advance is recorded
    if (numAdvTaken > 0) {
      await pool.query(
        `INSERT INTO "AdvanceTransaction" ("id", "workerId", "type", "date", "amount", "balanceAfter", "source", "reason", "expectedReturnDate", "recordedById", "createdAt")
         VALUES (gen_random_uuid()::text, $1, 'DISBURSEMENT', $2, $3, $4, 'MANUAL_ADVANCE', $5, $6, $7, NOW())`,
        [
          createdWorker.id,
          advGivenDate || new Date(),
          numAdvTaken,
          numAdvBal,
          advProofReason || 'Opening Advance at Registration',
          advExpReturnDate,
          req.user.id
        ]
      );
    }

    const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [divisionId]);
    const worker = { ...createdWorker, division: divRows[0] || null };

    res.status(201).json({ worker });
  } catch (err) {
    console.error('Create worker error:', err);
    res.status(500).json({ error: 'Failed to register worker' });
  }
});

app.put('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId, fullName, fatherName, designation, mobileNumber, dailyWage, dailyAllowance, extraAmount, advanceTaken, advanceBalance, advanceTakenDate, advanceReason, advanceReturnDate, otAllowance, otHourlyRate, divisionId, isActive, pfNumber, esiNumber, uanNumber, bankAccountNo, ifscCode, placeOfWork, natureOfWork } = req.body;

    const { rows: existing } = await pool.query(`SELECT * FROM "Worker" WHERE "id" = $1`, [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Worker not found' });

    // SUPERVISOR: ONLY ALLOW DIVISION CHANGE
    if (req.user.role === 'SUPERVISOR') {
      if (!divisionId) {
        return res.status(400).json({ error: 'Division is required for supervisor update' });
      }
      const { rows } = await pool.query(
        `UPDATE "Worker"
         SET "divisionId" = $1, "updatedAt" = NOW()
         WHERE "id" = $2
         RETURNING *`,
        [divisionId, id]
      );
      const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [divisionId]);
      const worker = { ...rows[0], division: divRows[0] || null };
      return res.json({ worker });
    }

    if (dailyWage !== undefined || dailyAllowance !== undefined || extraAmount !== undefined || advanceTaken !== undefined || advanceBalance !== undefined || otHourlyRate !== undefined) {
      if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Wage rates and advance modifications are restricted to Owners or Managers only!' });
      }
    }

    let cleanedPhone = existing[0].mobileNumber;
    if (mobileNumber) {
      let phone = mobileNumber.trim().replace(/[^0-9+]/g, '');
      if (phone.length === 10) phone = '+91' + phone;
      if (!/^\+91\d{10}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid 10-digit Indian phone number format' });
      }
      cleanedPhone = phone;
    }

    let newWorkerId = existing[0].workerId;
    if (workerId && workerId.trim() !== existing[0].workerId) {
      const trimmedWorkerId = workerId.trim().toUpperCase();
      const { rows: dupCheck } = await pool.query(`SELECT id FROM "Worker" WHERE "workerId" = $1 AND "id" != $2`, [trimmedWorkerId, id]);
      if (dupCheck.length > 0) {
        return res.status(400).json({ error: `Worker ID '${trimmedWorkerId}' is already assigned to another worker!` });
      }
      newWorkerId = trimmedWorkerId;
    }

    const oldDailyWage = parseFloat(existing[0].dailyWage) || 0;
    const newDailyWage = dailyWage !== undefined ? parseFloat(dailyWage) : oldDailyWage;
    const isWageHiked = newDailyWage !== oldDailyWage;
    const previousDailyWage = isWageHiked ? oldDailyWage : (existing[0].previousDailyWage !== null && existing[0].previousDailyWage !== undefined ? existing[0].previousDailyWage : oldDailyWage);
    const wageRevisedDate = isWageHiked ? new Date() : (existing[0].wageRevisedDate || new Date());

    const newFullName = fullName !== undefined ? fullName.trim() : existing[0].fullName;
    const newFatherName = fatherName !== undefined ? (fatherName ? fatherName.trim() : null) : existing[0].fatherName;
    const newDesignation = designation !== undefined ? (designation ? designation.trim() : null) : existing[0].designation;
    const newDivisionId = divisionId || existing[0].divisionId;
    const newAllowance = dailyAllowance !== undefined ? parseFloat(dailyAllowance) : existing[0].dailyAllowance;
    const newExtra = extraAmount !== undefined ? (parseFloat(extraAmount) || 0) : (parseFloat(existing[0].extraAmount) || 0);
    const newAdvanceTaken = advanceTaken !== undefined ? (parseFloat(advanceTaken) || 0) : (existing[0].advanceTaken || 0);
    const newAdvance = advanceBalance !== undefined && advanceBalance !== '' && parseFloat(advanceBalance) > 0 
      ? parseFloat(advanceBalance) 
      : (newAdvanceTaken > 0 ? newAdvanceTaken : (parseFloat(existing[0].advanceBalance) || 0));
    const newAdvDate = advanceTakenDate !== undefined ? (advanceTakenDate ? new Date(advanceTakenDate) : null) : existing[0].advanceTakenDate;
    const newAdvReason = advanceReason !== undefined ? (advanceReason ? advanceReason.trim() : null) : existing[0].advanceReason;
    const newAdvReturnDate = advanceReturnDate !== undefined ? (advanceReturnDate ? new Date(advanceReturnDate) : null) : existing[0].advanceReturnDate;
    const newOtAllowance = otAllowance !== undefined ? (parseFloat(otAllowance) || 0) : (existing[0].otAllowance || 0);
    const newOtRate = otHourlyRate !== undefined ? parseFloat(otHourlyRate) : existing[0].otHourlyRate;
    const newIsActive = isActive !== undefined ? Boolean(isActive) : (existing[0].isActive !== undefined ? existing[0].isActive : true);
    const newPfNumber = pfNumber !== undefined ? (pfNumber ? pfNumber.trim() : null) : existing[0].pfNumber;
    const newEsiNumber = esiNumber !== undefined ? (esiNumber ? esiNumber.trim() : null) : existing[0].esiNumber;
    const newUanNumber = uanNumber !== undefined ? (uanNumber ? uanNumber.trim() : null) : existing[0].uanNumber;
    const newBankAcc = bankAccountNo !== undefined ? (bankAccountNo ? bankAccountNo.trim() : null) : existing[0].bankAccountNo;
    const newIfsc = ifscCode !== undefined ? (ifscCode ? ifscCode.trim() : null) : existing[0].ifscCode;
    const newPlace = placeOfWork !== undefined ? (placeOfWork ? placeOfWork.trim() : null) : existing[0].placeOfWork;
    const newNature = natureOfWork !== undefined ? (natureOfWork ? natureOfWork.trim() : null) : existing[0].natureOfWork;

    const { rows } = await pool.query(
      `UPDATE "Worker"
       SET "workerId" = $1, "fullName" = $2, "fatherName" = $3, "designation" = $4, "mobileNumber" = $5,
           "dailyWage" = $6, "previousDailyWage" = $7, "wageRevisedDate" = $8,
           "dailyAllowance" = $9, "extraAmount" = $10, "advanceTaken" = $11, "advanceBalance" = $12,
           "advanceTakenDate" = $13, "advanceReason" = $14, "advanceReturnDate" = $15,
           "otAllowance" = $16, "otHourlyRate" = $17, "divisionId" = $18, "isActive" = $19,
           "pfNumber" = $20, "esiNumber" = $21, "uanNumber" = $22, "bankAccountNo" = $23, "ifscCode" = $24, "placeOfWork" = $25, "natureOfWork" = $26,
           "updatedAt" = NOW()
       WHERE "id" = $27
       RETURNING *`,
      [newWorkerId, newFullName, newFatherName, newDesignation, cleanedPhone, newDailyWage, previousDailyWage, wageRevisedDate, newAllowance, newExtra, newAdvanceTaken, newAdvance, newAdvDate, newAdvReason, newAdvReturnDate, newOtAllowance, newOtRate, newDivisionId, newIsActive, newPfNumber, newEsiNumber, newUanNumber, newBankAcc, newIfsc, newPlace, newNature, id]
    );

    // If base salary or Extra (hike) was revised, automatically record milestone in WorkerWageHistory and SalaryAuditLog
    const oldExtra = parseFloat(existing[0].extraAmount) || 0;
    const isExtraChanged = Math.abs(newExtra - oldExtra) > 0.01;

    if (isWageHiked || isExtraChanged) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const dateStr = now.toISOString().split('T')[0];

      // 1. Insert/Update Wage Hike Matrix Milestone
      await pool.query(
        `INSERT INTO "WorkerWageHistory" ("id", "workerId", "effectiveDate", "basePaid", "hikeAmount", "totalAmount", "notes", "recordedById", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2::date, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT ("workerId", "effectiveDate")
         DO UPDATE SET
           "basePaid" = EXCLUDED."basePaid",
           "hikeAmount" = EXCLUDED."hikeAmount",
           "totalAmount" = EXCLUDED."totalAmount",
           "notes" = EXCLUDED."notes",
           "recordedById" = EXCLUDED."recordedById",
           "updatedAt" = NOW()`,
        [
          id,
          dateStr,
          newDailyWage,
          newExtra,
          newDailyWage + newExtra,
          isExtraChanged && isWageHiked 
            ? `Wage changed to ₹${newDailyWage}, Extra revised from ₹${oldExtra} to ₹${newExtra}`
            : (isExtraChanged ? `Extra (Hike) revised from ₹${oldExtra} to ₹${newExtra}` : `Base wage changed to ₹${newDailyWage}`),
          req.user.id
        ]
      );

      // 2. Insert into SalaryAuditLog
      await pool.query(
        `INSERT INTO "SalaryAuditLog" (
           "id", "workerId", "month", "year", "previousAmount", "newAmount", "difference",
           "action", "notes", "modifiedById", "createdAt"
         )
         VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
           'WAGE_HIKE', $7, $8, NOW()
         )`,
        [
          id,
          currentMonth,
          currentYear,
          oldDailyWage + oldExtra,
          newDailyWage + newExtra,
          (newDailyWage + newExtra) - (oldDailyWage + oldExtra),
          `Master Wage/Extra Revision: Total remuneration changed from ₹${oldDailyWage + oldExtra} to ₹${newDailyWage + newExtra} (Extra: ₹${oldExtra} ➔ ₹${newExtra})`,
          req.user.id
        ]
      );
    }


    const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [newDivisionId]);
    const worker = { ...rows[0], division: divRows[0] || null };

    res.json({ worker });
  } catch (err) {
    console.error('Update worker error:', err);
    res.status(500).json({ error: 'Failed to update worker registry' });
  }
});

app.patch('/api/workers/:id/toggle-active', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'SUPERVISOR') {
      return res.status(403).json({ error: 'Worker status toggling is restricted to Owners or Managers only!' });
    }

    const { rows } = await pool.query(
      `UPDATE "Worker"
       SET "isActive" = NOT COALESCE("isActive", true),
           "updatedAt" = NOW()
       WHERE "id" = $1
       RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [rows[0].divisionId]);
    const worker = { ...rows[0], division: divRows[0] || null };

    res.json({ worker });
  } catch (err) {
    console.error('Toggle worker active status error:', err);
    res.status(500).json({ error: 'Failed to toggle worker active status' });
  }
});

app.delete('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'SUPERVISOR') {
      return res.status(403).json({ error: 'Worker deletion is restricted to Owners or Managers only!' });
    }
    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only Owner or Manager can delete worker records' });
    }

    // Check worker exists and if they have an unsettled advance balance
    const { rows: workerRows } = await pool.query(`SELECT "fullName", "advanceBalance" FROM "Worker" WHERE "id" = $1`, [id]);
    if (workerRows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    const worker = workerRows[0];
    const advBal = parseFloat(worker.advanceBalance) || 0;
    if (advBal > 0) {
      return res.status(400).json({ 
        error: `Cannot delete worker '${worker.fullName}'. They have an outstanding advance balance of ₹${advBal}. Settle the advance first.` 
      });
    }

    // Cleanly cascade delete any transactions, attendance or payments associated with this worker
    await pool.query(`DELETE FROM "AdvanceTransaction" WHERE "workerId" = $1`, [id]);
    await pool.query(`DELETE FROM "Attendance" WHERE "workerId" = $1`, [id]);
    await pool.query(`DELETE FROM "MonthlyPayment" WHERE "workerId" = $1`, [id]);
    await pool.query(`DELETE FROM "Worker" WHERE "id" = $1`, [id]);

    res.json({ message: 'Worker and all associated records deleted successfully' });
  } catch (err) {
    console.error('Delete worker error:', err);
    res.status(500).json({ error: 'Failed to delete worker' });
  }
});

// --- ADVANCE LEDGER MODULE (DOUBLE-ENTRY DISBURSEMENT & DEDUCTION TRACKING) ---
// GET /api/advance-ledger - Master summary of all workers' advance status
app.get('/api/advance-ledger', authenticateToken, async (req, res) => {
  try {
    const { search, divisionId } = req.query;

    let query = `
      SELECT 
        w.id,
        w."workerId",
        w."fullName",
        w."fatherName",
        w."designation",
        w."mobileNumber",
        w."dailyWage",
        COALESCE(w."advanceTaken", 0) as "advanceTaken",
        COALESCE(w."advanceBalance", 0) as "advanceBalance",
        w."advanceTakenDate",
        w."advanceReason",
        w."advanceReturnDate",
        COALESCE(w."isActive", true) as "isActive",
        d.id as "divisionId",
        d.name as "divisionName",
        COALESCE((
          SELECT SUM(amount) 
          FROM "AdvanceTransaction" tx 
          WHERE tx."workerId" = w.id AND tx.type = 'DISBURSEMENT'
        ), 0) as "totalDisbursed",
        COALESCE((
          SELECT SUM(amount) 
          FROM "AdvanceTransaction" tx 
          WHERE tx."workerId" = w.id AND tx.type = 'DEDUCTION'
        ), 0) as "totalDeducted",
        (
          SELECT COUNT(*) 
          FROM "AdvanceTransaction" tx 
          WHERE tx."workerId" = w.id
        ) as "transactionCount"
      FROM "Worker" w
      LEFT JOIN "Division" d ON w."divisionId" = d.id
    `;

    const whereClauses = [];
    const params = [];

    if (divisionId) {
      params.push(divisionId);
      whereClauses.push(`w."divisionId" = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(w."fullName") LIKE $${params.length} OR
        LOWER(w."workerId") LIKE $${params.length} OR
        LOWER(COALESCE(w."designation", '')) LIKE $${params.length} OR
        LOWER(COALESCE(w."mobileNumber", '')) LIKE $${params.length} OR
        LOWER(COALESCE(d.name, '')) LIKE $${params.length}
      )`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY w."advanceBalance" DESC, w."fullName" ASC`;

    const { rows } = await pool.query(query, params);

    // Compute overall totals for summary cards
    let grandTotalDisbursed = 0;
    let grandTotalDeducted = 0;
    let grandTotalBalance = 0;
    let workersWithAdvance = 0;

    const formattedRows = rows.map(r => {
      const advTaken = parseFloat(r.advanceTaken) || 0;
      const advBal = parseFloat(r.advanceBalance) || 0;
      let txDisb = parseFloat(r.totalDisbursed) || 0;
      let totDed = parseFloat(r.totalDeducted) || 0;

      // Cumulative Total Advance Taken: sum of all DISBURSEMENTS or initial advanceTaken
      // If transactions exist, totalDisbursed reflects transactions. If initial advanceTaken > transactions, combine or fallback.
      let totDisb = Math.max(txDisb, advTaken);
      if (totDisb === 0 && advBal > 0) {
        totDisb = advBal;
      }
      if (totDed === 0 && totDisb > advBal) {
        totDed = Math.max(0, totDisb - advBal);
      }

      grandTotalDisbursed += totDisb;
      grandTotalDeducted += totDed;
      grandTotalBalance += advBal;
      if (advBal > 0) workersWithAdvance++;

      return {
        ...r,
        advanceTaken: advTaken,
        advanceBalance: advBal,
        totalDisbursed: totDisb,
        totalDeducted: totDed,
        status: advBal > 0 ? 'ACTIVE_BALANCE' : (totDisb > 0 ? 'SETTLED' : 'NO_ADVANCE')
      };
    });

    res.json({
      workers: formattedRows,
      summary: {
        totalWorkers: formattedRows.length,
        workersWithAdvance,
        grandTotalDisbursed,
        grandTotalDeducted,
        grandTotalBalance
      }
    });
  } catch (err) {
    console.error('Error fetching advance ledger:', err);
    res.status(500).json({ error: 'Failed to fetch advance ledger summary' });
  }
});

// GET /api/advance-ledger/:workerId - Full drill-down ledger for individual worker
app.get('/api/advance-ledger/:workerId', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.params;

    const { rows: workerRows } = await pool.query(
      `SELECT w.*, d.name as "divisionName"
       FROM "Worker" w
       LEFT JOIN "Division" d ON w."divisionId" = d.id
       WHERE w.id = $1`,
      [workerId]
    );

    if (workerRows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const worker = workerRows[0];

    const { rows: txRows } = await pool.query(
      `SELECT 
         tx.*,
         u."fullName" as "recordedByName"
       FROM "AdvanceTransaction" tx
       LEFT JOIN "User" u ON tx."recordedById" = u.id
       WHERE tx."workerId" = $1
       ORDER BY tx."date" ASC, tx."createdAt" ASC`,
      [workerId]
    );

    // Also fetch monthly payroll deduction history
    const { rows: payRows } = await pool.query(
      `SELECT 
         p.id, p.month, p.year, p."advanceDeducted", p."finalNetAmount", p.status, p."createdAt"
       FROM "MonthlyPayment" p
       WHERE p."workerId" = $1 AND p."advanceDeducted" > 0
       ORDER BY p.year ASC, p.month ASC`,
      [workerId]
    );

    const initialAdvTaken = parseFloat(worker.advanceTaken) || 0;
    const currentAdvBal = parseFloat(worker.advanceBalance) || 0;

    let txDisbursed = 0;
    let txDeducted = 0;
    txRows.forEach(tx => {
      const amt = parseFloat(tx.amount) || 0;
      if (tx.type === 'DISBURSEMENT') txDisbursed += amt;
      else if (tx.type === 'DEDUCTION') txDeducted += amt;
    });

    const totalDisbursed = Math.max(txDisbursed, initialAdvTaken > 0 ? initialAdvTaken : currentAdvBal);
    const totalDeducted = txDeducted > 0 ? txDeducted : Math.max(0, totalDisbursed - currentAdvBal);

    res.json({
      worker: {
        id: worker.id,
        workerId: worker.workerId,
        fullName: worker.fullName,
        fatherName: worker.fatherName || '-',
        designation: worker.designation || 'Worker',
        mobileNumber: worker.mobileNumber,
        dailyWage: parseFloat(worker.dailyWage) || 0,
        advanceTaken: initialAdvTaken,
        advanceBalance: currentAdvBal,
        totalDisbursed,
        totalDeducted,
        advanceTakenDate: worker.advanceTakenDate,
        advanceReason: worker.advanceReason,
        advanceReturnDate: worker.advanceReturnDate,
        divisionName: worker.divisionName || 'General'
      },
      transactions: txRows,
      payrollDeductions: payRows
    });
  } catch (err) {
    console.error('Error fetching worker advance ledger drilldown:', err);
    res.status(500).json({ error: 'Failed to fetch worker advance ledger details' });
  }
});

// POST /api/advance-ledger/disburse - Give new advance to worker
app.post('/api/advance-ledger/disburse', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { workerId, amount, date, reason, expectedReturnDate } = req.body;
    const numAmount = parseFloat(amount);

    if (!workerId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Worker ID and valid advance amount (> 0) are required' });
    }

    await client.query('BEGIN');

    const { rows: workerRows } = await client.query(
      `SELECT "id", "fullName", "advanceTaken", "advanceBalance" FROM "Worker" WHERE "id" = $1 FOR UPDATE`,
      [workerId]
    );

    if (workerRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Worker not found' });
    }

    const worker = workerRows[0];
    const prevTaken = parseFloat(worker.advanceTaken) || 0;
    const prevBal = parseFloat(worker.advanceBalance) || 0;
    const newBal = prevBal + numAmount;
    const newTaken = prevTaken + numAmount;
    const txDate = date ? new Date(date) : new Date();
    const expDate = expectedReturnDate ? new Date(expectedReturnDate) : null;

    const { rows: txRows } = await client.query(
      `INSERT INTO "AdvanceTransaction" (
         "id", "workerId", "type", "date", "amount", "balanceAfter", "source", "reason", "expectedReturnDate", "recordedById", "createdAt"
       )
       VALUES (
         gen_random_uuid()::text, $1, 'DISBURSEMENT', $2, $3, $4, 'MANUAL_ADVANCE', $5, $6, $7, NOW()
       )
       RETURNING *`,
      [workerId, txDate, numAmount, newBal, reason ? reason.trim() : 'Additional Cash Advance Given', expDate, req.user.id]
    );

    await client.query(
      `UPDATE "Worker"
       SET "advanceTaken" = $1, "advanceBalance" = $2, "advanceTakenDate" = $3, "advanceReason" = $4, "advanceReturnDate" = $5, "updatedAt" = NOW()
       WHERE "id" = $6`,
      [newTaken, newBal, txDate, reason ? reason.trim() : null, expDate, workerId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: `Advance of ₹${numAmount} successfully disbursed to ${worker.fullName}`,
      transaction: txRows[0],
      newBalance: newBal
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error disbursing advance:', err);
    res.status(500).json({ error: 'Failed to disburse advance' });
  } finally {
    client.release();
  }
});

// POST /api/advance-ledger/repay - Direct cash repayment / advance recovery outside monthly payroll
app.post('/api/advance-ledger/repay', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { workerId, amount, date, reason } = req.body;
    const numAmount = parseFloat(amount);

    if (!workerId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Worker ID and valid repayment amount (> 0) are required' });
    }

    await client.query('BEGIN');

    const { rows: workerRows } = await client.query(
      `SELECT "id", "fullName", "advanceBalance" FROM "Worker" WHERE "id" = $1 FOR UPDATE`,
      [workerId]
    );

    if (workerRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Worker not found' });
    }

    const worker = workerRows[0];
    const prevBal = parseFloat(worker.advanceBalance) || 0;

    if (prevBal <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `${worker.fullName} has no outstanding advance balance to repay.` });
    }

    if (numAmount > prevBal) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Repayment amount (₹${numAmount}) cannot exceed outstanding advance balance (₹${prevBal}).` });
    }

    const newBal = Math.max(0, prevBal - numAmount);
    const txDate = date ? new Date(date) : new Date();

    const { rows: txRows } = await client.query(
      `INSERT INTO "AdvanceTransaction" (
         "id", "workerId", "type", "date", "amount", "balanceAfter", "source", "reason", "recordedById", "createdAt"
       )
       VALUES (
         gen_random_uuid()::text, $1, 'DEDUCTION', $2, $3, $4, 'DIRECT_REPAYMENT', $5, $6, NOW()
       )
       RETURNING *`,
      [workerId, txDate, numAmount, newBal, reason ? reason.trim() : 'Direct Cash Repayment', req.user.id]
    );

    await client.query(
      `UPDATE "Worker"
       SET "advanceBalance" = $1, "updatedAt" = NOW()
       WHERE "id" = $2`,
      [newBal, workerId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: `Repayment of ₹${numAmount} successfully recorded for ${worker.fullName}`,
      transaction: txRows[0],
      newBalance: newBal
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording advance repayment:', err);
    res.status(500).json({ error: 'Failed to record advance repayment' });
  } finally {
    client.release();
  }
});
// --- DAILY WORKER ATTENDANCE API (DIRECT SQL) ---
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, divisionId } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) is required' });
    }

    let query = `
      SELECT a."id", a."workerId", a."date", a."status", a."divisionId", a."secondDivisionId",
             COALESCE(a."overtimeHours", 0)::float as "overtimeHours", 
             a."dailyWageOverride", a."notes",
             d."name" as "divisionName",
             d2."name" as "secondDivisionName",
             wl."leaveType",
             json_build_object('id', w."id", 'workerId', w."workerId", 'fullName', w."fullName", 'dailyWage', w."dailyWage", 'divisionId', w."divisionId") as "worker"
      FROM "Attendance" a
      JOIN "Worker" w ON a."workerId" = w."id"
      LEFT JOIN "Division" d ON a."divisionId" = d."id"
      LEFT JOIN "Division" d2 ON a."secondDivisionId" = d2."id"
      LEFT JOIN "WorkerLeave" wl ON a."workerId" = wl."workerId" AND a."date"::date = wl."date"::date
      WHERE a."date"::date = $1::date
    `;
    const params = [date];

    if (divisionId && divisionId !== 'ALL' && divisionId !== 'all') {
      params.push(divisionId);
      query += ` AND (a."divisionId" = $${params.length} OR a."secondDivisionId" = $${params.length} OR (a."divisionId" IS NULL AND w."divisionId" = $${params.length}))`;
    }

    const { rows: attendances } = await pool.query(query, params);

    res.json({ attendances });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Failed to load attendance records' });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, attendanceData, clearedWorkerIds } = req.body; // attendanceData: [{ workerId, status, overtimeHours }], clearedWorkerIds: [workerId]
    if (!date || (!attendanceData && !clearedWorkerIds)) {
      return res.status(400).json({ error: 'Date and valid attendance data are required' });
    }

    // If any workers are unselected/cleared, delete their attendance record for this date
    if (clearedWorkerIds && Array.isArray(clearedWorkerIds) && clearedWorkerIds.length > 0) {
      await pool.query(
        `DELETE FROM "Attendance" WHERE "date"::date = $1::date AND "workerId" = ANY($2::text[])`,
        [date, clearedWorkerIds]
      );
    }

    // Validate that split half-day attendance does not have matching divisionId and secondDivisionId
    if (attendanceData && Array.isArray(attendanceData)) {
      for (const rec of attendanceData) {
        if (rec.status === 'HALF_DAY' && rec.secondDivisionId && rec.divisionId && rec.secondDivisionId === rec.divisionId) {
          return res.status(400).json({ 
            error: 'Split half-day error: Primary division and 2nd half division cannot be identical. Select two different divisions or use normal attendance.' 
          });
        }
      }
    }

    const queryDateStr = `${date} 00:00:00`;
    const workerIds = (attendanceData || []).map(r => r.workerId);

    // Check if attendance has already been logged for these workers on this date (Direct SQL)
    const { rows: existingLogs } = await pool.query(
      `SELECT * FROM "Attendance" WHERE "date"::date = $1::date AND "workerId" = ANY($2::text[])`,
      [date, workerIds]
    );

    if (existingLogs.length > 0) {
      // User is editing existing daily attendance
      if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
        const { rows: workers } = await pool.query(
          `SELECT w."id", w."fullName", w."dailyWage", w."divisionId", d."name" as "divisionName" 
           FROM "Worker" w 
           LEFT JOIN "Division" d ON w."divisionId" = d."id" 
           WHERE w."id" = ANY($1::text[])`,
          [workerIds]
        );

        const { rows: allDivs } = await pool.query(`SELECT "id", "name" FROM "Division"`);
        const divNameMap = {};
        allDivs.forEach(d => { divNameMap[d.id] = d.name; });

        const modifiedRequests = [];
        attendanceData.forEach((record) => {
          const existing = existingLogs.find(el => el.workerId === record.workerId);
          const worker = workers.find(w => w.id === record.workerId);
          if (existing && worker) {
            const statusChanged = existing.status !== record.status;
            const existingOt = parseFloat(existing.overtimeHours || existing.otHours) || 0.0;
            const incomingOt = parseFloat(record.overtimeHours) || 0.0;
            const otChanged = Math.abs(existingOt - incomingOt) > 0.01;
            
            const incomingOverride = record.dailyWageOverride ? parseFloat(record.dailyWageOverride) : null;
            const existingOverride = existing.dailyWageOverride ? parseFloat(existing.dailyWageOverride) : null;
            const wageChanged = existingOverride !== incomingOverride;

            const existingDivId = existing.divisionId || worker.divisionId;
            const incomingDivId = record.divisionId || worker.divisionId;
            const divChanged = existingDivId !== incomingDivId;

            if (statusChanged || otChanged || wageChanged || divChanged) {
              const oldDivName = divNameMap[existingDivId] || worker.divisionName || 'General';
              const targetDivId = incomingDivId || existingDivId || allDivs[0]?.id;
              
              const statusDesc = statusChanged ? `${existing.status} ➔ ${record.status}` : null;
              const otDesc = otChanged ? `OT: ${existingOt}h ➔ ${incomingOt}h` : null;
              const wageDesc = wageChanged ? `Wage: ₹${existingOverride || worker.dailyWage} ➔ ₹${incomingOverride || worker.dailyWage}` : null;
              const divDesc = divChanged ? `Site: ${oldDivName} ➔ ${divNameMap[incomingDivId] || 'Site'}` : null;
              const changeSummary = [statusDesc, otDesc, wageDesc, divDesc].filter(Boolean).join(', ');

              modifiedRequests.push({
                workerId: record.workerId,
                date: date,
                oldStatus: existing.status || 'UNMARKED',
                oldDivisionName: oldDivName,
                newStatus: record.status,
                newDivisionId: targetDivId,
                newOvertimeHours: incomingOt,
                reason: `Supervisor update on sheet: ${changeSummary}`
              });
            }
          }
        });

        if (modifiedRequests.length > 0) {
          // Insert into AttendanceCorrectionRequest so it appears in Approvals -> Attendance Corrections tab!
          for (const reqItem of modifiedRequests) {
            await pool.query(
              `INSERT INTO "AttendanceCorrectionRequest" 
               ("id", "workerId", "date", "oldStatus", "oldDivisionName", "newStatus", "newDivisionId", "newOvertimeHours", "reason", "status", "requestedById", "createdAt", "updatedAt")
               VALUES (gen_random_uuid()::text, $1, $2::timestamp, $3, $4, $5::"AttendanceStatus", $6, $7, $8, 'PENDING', $9, NOW(), NOW())`,
              [reqItem.workerId, reqItem.date, reqItem.oldStatus, reqItem.oldDivisionName, reqItem.newStatus, reqItem.newDivisionId, reqItem.newOvertimeHours, reqItem.reason, req.user.id]
            );
          }

          return res.status(202).json({
            message: `⚠️ Changes detected for ${modifiedRequests.length} worker(s)! Modification request submitted to Owner/Manager for approval.`,
            requiresApproval: true,
            requestsCount: modifiedRequests.length
          });
        }
      }
    }

    if (attendanceData && attendanceData.length > 0) {
      const workerIds = attendanceData.map(r => r.workerId);
      const dates = attendanceData.map(r => date);
      const statuses = attendanceData.map(r => r.status);
      const otHours = attendanceData.map(r => parseFloat(r.overtimeHours) || 0.0);
      const dailyWageOverrides = attendanceData.map(r => r.dailyWageOverride ? parseFloat(r.dailyWageOverride) : null);
      const divisionIds = attendanceData.map(r => r.divisionId || null);
      const secondDivisionIds = attendanceData.map(r => (r.status === 'HALF_DAY' && r.secondDivisionId) ? r.secondDivisionId : null);
      const notes = attendanceData.map(r => r.notes || null);
      const userIds = attendanceData.map(r => req.user.id);

      await pool.query(
        `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "overtimeHours", "otHours", "dailyWageOverride", "divisionId", "secondDivisionId", "notes", "recordedById", "markedById", "createdAt", "updatedAt")
         SELECT gen_random_uuid()::text, u.workerId, u.dt, u.st::"AttendanceStatus", u.ot, u.ot, u.dw, u.divId, u.sDivId, u.nt, u.uid, u.uid, NOW(), NOW()
         FROM UNNEST($1::text[], $2::timestamp[], $3::text[], $4::numeric[], $5::numeric[], $6::text[], $7::text[], $8::text[], $9::text[]) 
         AS u(workerId, dt, st, ot, dw, divId, sDivId, nt, uid)
         ON CONFLICT ("workerId", "date")
         DO UPDATE SET
           "status" = EXCLUDED."status",
           "overtimeHours" = EXCLUDED."overtimeHours",
           "otHours" = EXCLUDED."otHours",
           "dailyWageOverride" = EXCLUDED."dailyWageOverride",
           "divisionId" = COALESCE(EXCLUDED."divisionId", "Attendance"."divisionId"),
           "secondDivisionId" = EXCLUDED."secondDivisionId",
           "notes" = EXCLUDED."notes",
           "recordedById" = EXCLUDED."recordedById",
           "markedById" = EXCLUDED."markedById",
           "updatedAt" = NOW()`,
        [workerIds, dates, statuses, otHours, dailyWageOverrides, divisionIds, secondDivisionIds, notes, userIds]
      );

      // Synchronize WorkerLeave table so leaves marked in attendance reflect in Leave Ledger
      const year = new Date(date).getFullYear();
      for (const rec of attendanceData) {
        if (rec.status === 'LEAVE') {
          const lType = (rec.leaveType === 'MEDICAL' || rec.leaveType === 'CASUAL') ? rec.leaveType : 'CASUAL';
          await pool.query(
            `INSERT INTO "WorkerLeave" ("id", "workerId", "date", "leaveType", "days", "reason", "year", "markedById", "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2::timestamp, $3, 1.0, COALESCE($4, 'Marked in daily attendance'), $5, $6, NOW(), NOW())
             ON CONFLICT ("workerId", "date")
             DO UPDATE SET "leaveType" = EXCLUDED."leaveType", "days" = 1.0, "reason" = COALESCE(EXCLUDED."reason", "WorkerLeave"."reason"), "updatedAt" = NOW()`,
            [rec.workerId, date, lType, rec.notes || null, year, req.user.id]
          );
        } else {
          // If changed away from LEAVE, remove corresponding entry in WorkerLeave
          await pool.query(
            `DELETE FROM "WorkerLeave" WHERE "workerId" = $1 AND "date"::date = $2::date`,
            [rec.workerId, date]
          );
        }
      }
    }

    res.json({ message: 'Attendance records saved successfully!' });

  } catch (err) {
    console.error('Attendance submit error:', err);
    res.status(500).json({ error: 'Failed to record daily attendance' });
  }
});

// --- ATTENDANCE CORRECTION REQUESTS (SUPERVISOR EDIT -> MANAGER/ADMIN APPROVAL) ---
app.get('/api/attendance/correction-requests', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, 
              w."fullName" as "workerName", w."workerId" as "workerCode", w."dailyWage",
              d."name" as "newDivisionName",
              u."fullName" as "requestedByName",
              a."fullName" as "approvedByName"
       FROM "AttendanceCorrectionRequest" r
       JOIN "Worker" w ON r."workerId" = w."id"
       JOIN "Division" d ON r."newDivisionId" = d."id"
       JOIN "User" u ON r."requestedById" = u."id"
       LEFT JOIN "User" a ON r."approvedById" = a."id"
       ORDER BY r."createdAt" ASC, r."id" ASC`
    );
    res.json({ requests: rows });
  } catch (err) {
    console.error('Fetch correction requests error:', err);
    res.status(500).json({ error: 'Failed to load attendance correction requests' });
  }
});

app.post('/api/attendance/correction-requests', authenticateToken, async (req, res) => {
  try {
    const { workerId, date, oldStatus, oldDivisionName, newStatus, newDivisionId, newOvertimeHours, leaveType, reason } = req.body;
    if (!workerId || !date || !newStatus || !newDivisionId || !reason) {
      return res.status(400).json({ error: 'Worker, date, new status, division, and reason are required' });
    }

    const lType = (leaveType === 'MEDICAL' || leaveType === 'CASUAL') ? leaveType : 'CASUAL';

    const { rows } = await pool.query(
      `INSERT INTO "AttendanceCorrectionRequest" 
       ("id", "workerId", "date", "oldStatus", "oldDivisionName", "newStatus", "newDivisionId", "newOvertimeHours", "leaveType", "reason", "status", "requestedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2::timestamp, $3, $4, $5::"AttendanceStatus", $6, $7, $8, $9, 'PENDING', $10, NOW(), NOW())
       RETURNING *`,
      [workerId, date, oldStatus || null, oldDivisionName || null, newStatus, newDivisionId, parseFloat(newOvertimeHours) || 0, lType, reason, req.user.id]
    );

    res.json({ message: 'Attendance correction request submitted to Manager/Admin for approval!', request: rows[0] });
  } catch (err) {
    console.error('Submit correction request error:', err);
    res.status(500).json({ error: 'Failed to submit attendance correction request' });
  }
});

app.put('/api/attendance/correction-requests/:id/review', authenticateToken, requireRoles(['MANAGER', 'OWNER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // 'APPROVED' or 'REJECTED'

    if (!action || (action !== 'APPROVED' && action !== 'REJECTED')) {
      return res.status(400).json({ error: 'Action must be APPROVED or REJECTED' });
    }

    await client.query('BEGIN');

    const { rows: reqRows } = await client.query(
      `SELECT * FROM "AttendanceCorrectionRequest" WHERE "id" = $1 FOR UPDATE`,
      [id]
    );
    if (reqRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Correction request not found' });
    }
    const corrReq = reqRows[0];

    if (action === 'APPROVED') {
      // 1. Update Attendance table directly with corrected values!
      await client.query(
        `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "overtimeHours", "otHours", "divisionId", "secondDivisionId", "notes", "recordedById", "markedById", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3::"AttendanceStatus", $4, $4, $5, NULL, $6, $7, $7, NOW(), NOW())
         ON CONFLICT ("workerId", "date")
         DO UPDATE SET
           "status" = EXCLUDED."status",
           "overtimeHours" = EXCLUDED."overtimeHours",
           "otHours" = EXCLUDED."otHours",
           "divisionId" = EXCLUDED."divisionId",
           "secondDivisionId" = NULL,
           "notes" = EXCLUDED."notes",
           "updatedAt" = NOW()`,
        [corrReq.workerId, corrReq.date, corrReq.newStatus, corrReq.newOvertimeHours, corrReq.newDivisionId, `Corrected: ${corrReq.reason}`, req.user.id]
      );

      // Sync WorkerLeave table
      const corrYear = new Date(corrReq.date).getFullYear();
      if (corrReq.newStatus === 'LEAVE') {
        const lType = (corrReq.leaveType === 'MEDICAL' || corrReq.leaveType === 'CASUAL') ? corrReq.leaveType : 'CASUAL';
        await client.query(
          `INSERT INTO "WorkerLeave" ("id", "workerId", "date", "leaveType", "days", "reason", "year", "markedById", "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2::timestamp, $3, 1.0, COALESCE($4, 'Correction Request Approved'), $5, $6, NOW(), NOW())
           ON CONFLICT ("workerId", "date")
           DO UPDATE SET "leaveType" = EXCLUDED."leaveType", "days" = 1.0, "reason" = COALESCE(EXCLUDED."reason", "WorkerLeave"."reason"), "updatedAt" = NOW()`,
          [corrReq.workerId, corrReq.date, lType, corrReq.reason || null, corrYear, req.user.id]
        );
      } else {
        await client.query(
          `DELETE FROM "WorkerLeave" WHERE "workerId" = $1 AND "date"::date = $2::date`,
          [corrReq.workerId, corrReq.date]
        );
      }
    }

    // 2. Update the correction request record status

    await client.query(
      `UPDATE "AttendanceCorrectionRequest"
       SET "status" = $1::text, "approvedById" = $2, "rejectionReason" = $3, "updatedAt" = NOW()
       WHERE "id" = $4`,
      [action, req.user.id, rejectionReason || null, id]
    );

    await client.query('COMMIT');
    res.json({ message: `Attendance correction request ${action.toLowerCase()} successfully!` });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Review correction request error:', err);
    res.status(500).json({ error: err.message || 'Failed to process attendance correction review' });
  } finally {
    client.release();
  }
});

// --- MONTHLY WAGE CALCULATION & REGISTER BOOK DRILLDOWN API (DIRECT SQL) ---
app.get('/api/wages/monthly', authenticateToken, async (req, res) => {
  try {
    const { month, year, divisionId } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and Year parameters are required' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const totalDays = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(totalDays).padStart(2, '0')} 23:59:59.999`;

    let workerQuery = `
      SELECT w."id", w."workerId", w."fullName", w."fatherName", w."designation", w."mobileNumber",
             w."dailyWage", COALESCE(w."dailyAllowance", 0) as "dailyAllowance",
             COALESCE(w."advanceTaken", 0) as "advanceTaken",
             COALESCE(w."advanceBalance", 0) as "advanceBalance",
             COALESCE(w."otAllowance", 0) as "otAllowance",
             w."otHourlyRate", w."divisionId",
             COALESCE(w."isActive", true) as "isActive",
             COALESCE(w."pfNumber", '') as "pfNumber",
             COALESCE(w."esiNumber", '') as "esiNumber",
             COALESCE(w."uanNumber", '') as "uanNumber",
             COALESCE(w."bankAccountNo", '') as "bankAccountNo",
             COALESCE(w."ifscCode", '') as "ifscCode",
             COALESCE(w."placeOfWork", '') as "placeOfWork",
             COALESCE(w."natureOfWork", '') as "natureOfWork",
             COALESCE(d."name", 'General') as "divisionName"
      FROM "Worker" w
      LEFT JOIN "Division" d ON w."divisionId" = d."id"
    `;
    const workerParams = [];
    const isFiltered = divisionId && divisionId !== 'ALL' && divisionId !== 'all' && divisionId !== '';
    if (isFiltered) {
      workerQuery += ` WHERE (
        COALESCE(w."isActive", true) = true
        OR EXISTS (SELECT 1 FROM "Attendance" a WHERE a."workerId" = w."id" AND a."date" >= $2::timestamp AND a."date" <= $3::timestamp)
        OR EXISTS (SELECT 1 FROM "MonthlyPayment" mp WHERE mp."workerId" = w."id" AND mp."month" = $4 AND mp."year" = $5)
      )
      AND EXISTS (
        SELECT 1 FROM "Attendance" a 
        WHERE a."workerId" = w."id" 
          AND (a."divisionId" = $1 OR a."secondDivisionId" = $1)
          AND a."date" >= $2::timestamp AND a."date" <= $3::timestamp
      )`;
      workerParams.push(divisionId, startDate, endDate, m, y);
    } else {
      workerQuery += ` WHERE (
        COALESCE(w."isActive", true) = true
        OR EXISTS (SELECT 1 FROM "Attendance" a WHERE a."workerId" = w."id" AND a."date" >= $1::timestamp AND a."date" <= $2::timestamp)
        OR EXISTS (SELECT 1 FROM "MonthlyPayment" mp WHERE mp."workerId" = w."id" AND mp."month" = $3 AND mp."year" = $4)
      )`;
      workerParams.push(startDate, endDate, m, y);
    }
    workerQuery += ` ORDER BY w."workerId" ASC, w."fullName" ASC`;

    const { rows: workers } = await pool.query(workerQuery, workerParams);

    // Fetch attendances for this month
    const { rows: attendances } = await pool.query(
      `SELECT a."workerId", a."date", a."status", 
              to_char(a."date", 'YYYY-MM-DD') as "dateStr",
              COALESCE(a."overtimeHours", 0)::float as "overtimeHours", 
              a."dailyWageOverride", a."divisionId", a."secondDivisionId",
              d."name" as "divisionName",
              d2."name" as "secondDivisionName"
       FROM "Attendance" a
       LEFT JOIN "Division" d ON a."divisionId" = d."id"
       LEFT JOIN "Division" d2 ON a."secondDivisionId" = d2."id"
       WHERE a."date" >= $1::timestamp AND a."date" <= $2::timestamp`,
      [startDate, endDate]
    );

    // Fetch declared holidays for this month
    const { rows: holidays } = await pool.query(
      `SELECT "date", "name", to_char("date", 'YYYY-MM-DD') as "dateStr" FROM "Holiday" WHERE "date" >= $1::timestamp AND "date" <= $2::timestamp`,
      [startDate, endDate]
    );

    // Fetch payments for this month
    const { rows: payments } = await pool.query(
      `SELECT * FROM "MonthlyPayment" WHERE "month" = $1 AND "year" = $2`,
      [m, y]
    );

    const attsByWorker = {};
    attendances.forEach(a => {
      if (!attsByWorker[a.workerId]) attsByWorker[a.workerId] = [];
      attsByWorker[a.workerId].push(a);
    });

    const paysByWorker = {};
    payments.forEach(p => {
      paysByWorker[p.workerId] = p;
    });

    const formatToLocalDateStr = (d) => {
      const dt = new Date(d);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const holidayDatesSet = new Set(holidays.map(h => h.dateStr || formatToLocalDateStr(h.date)));

    const rawWageReport = workers.map((worker) => {
      const dbPayment = paysByWorker[worker.id];
      const workerAtts = attsByWorker[worker.id] || [];
      const workerAttDateMap = {};
      let present = 0;
      let absent = 0;
      let half = 0;
      let leave = 0;
      let totalOt = 0;
      const divisionCounts = {};

      workerAtts.forEach((att) => {
        const dStr = att.dateStr || formatToLocalDateStr(att.date);
        workerAttDateMap[dStr] = att;
        const divName = att.divisionName || worker.divisionName || 'General';
        const secondDivName = att.secondDivisionName;

        if (isFiltered) {
          const isAttInPrimaryDiv = (att.divisionId === divisionId) || (!att.divisionId && worker.divisionId === divisionId);
          const isAttInSecondDiv = (att.secondDivisionId === divisionId);

          if (att.status === 'PRESENT') {
            if (isAttInPrimaryDiv) {
              present += 1;
              divisionCounts[divName] = (divisionCounts[divName] || 0) + 1;
            }
          } else if (att.status === 'ABSENT') {
            if (isAttInPrimaryDiv) {
              absent += 1;
            }
          } else if (att.status === 'HALF_DAY') {
            if (isAttInPrimaryDiv) {
              half += 1;
              divisionCounts[divName] = (divisionCounts[divName] || 0) + 0.5;
            }
            if (isAttInSecondDiv) {
              half += 1;
              divisionCounts[secondDivName || 'Split Site'] = (divisionCounts[secondDivName || 'Split Site'] || 0) + 0.5;
            }
          } else if (att.status === 'LEAVE') {
            if (isAttInPrimaryDiv) {
              leave += 1;
            }
          }
          if (isAttInPrimaryDiv || isAttInSecondDiv) {
            totalOt += (parseFloat(att.overtimeHours) || 0.0);
          }
        } else {
          if (att.status === 'PRESENT') {
            present += 1;
            divisionCounts[divName] = (divisionCounts[divName] || 0) + 1;
          } else if (att.status === 'ABSENT') {
            absent += 1;
          } else if (att.status === 'HALF_DAY') {
            if (att.secondDivisionId) {
              // 2 half days = 1 full day split across 2 sites
              half += 2;
              divisionCounts[divName] = (divisionCounts[divName] || 0) + 0.5;
              divisionCounts[secondDivName || 'Split Site'] = (divisionCounts[secondDivName || 'Split Site'] || 0) + 0.5;
            } else {
              half += 1;
              divisionCounts[divName] = (divisionCounts[divName] || 0) + 0.5;
            }
          } else if (att.status === 'LEAVE') {
            leave += 1;
          }
          totalOt += (parseFloat(att.overtimeHours) || 0.0);
        }
      });

      // Credit paid Govt Holidays for workers
      let paidHolidaysCount = 0;
      holidayDatesSet.forEach(hDateStr => {
        const att = workerAttDateMap[hDateStr];
        if (!att || att.status === 'LEAVE') {
          if (!isFiltered || workerAtts.some(a => a.divisionId === divisionId)) {
            paidHolidaysCount += 1;
            const defaultDiv = targetDivisionName || worker.divisionName || 'General';
            divisionCounts[defaultDiv] = (divisionCounts[defaultDiv] || 0) + 1;
          }
        }
      });

      const isApproved = dbPayment && dbPayment.status === 'APPROVED';
      const liveWorkingDays = (present + (half * 0.5) + paidHolidaysCount);
      const approvedWorkingDays = isApproved 
        ? (parseFloat(dbPayment.presentDays || 0) + (parseFloat(dbPayment.halfDays || 0) * 0.5) + (parseFloat(dbPayment.leaveDays || 0)))
        : 0;
      // Use live attendance days if attendance exists/was updated, otherwise fallback to approved historical days
      const workingDays = liveWorkingDays > 0 ? liveWorkingDays : (approvedWorkingDays > 0 ? approvedWorkingDays : 0);

      // Keep approved historical wage rates safe so master rate updates NEVER corrupt approved months
      const dailyWage = isApproved
        ? (dbPayment.dailyWage != null 
            ? parseFloat(dbPayment.dailyWage) 
            : (parseFloat(worker.dailyWage) || 0))
        : (parseFloat(worker.dailyWage) || 0);

      const dailyAllowance = isApproved
        ? (dbPayment.dailyAllowance != null 
            ? parseFloat(dbPayment.dailyAllowance) 
            : (parseFloat(worker.dailyAllowance) || 0))
        : (parseFloat(worker.dailyAllowance) || 0);

      const rawAdvTaken = parseFloat(worker.advanceTaken) || 0;
      const rawAdvBal = parseFloat(worker.advanceBalance) || 0;
      const advanceTaken = rawAdvTaken > 0 ? rawAdvTaken : rawAdvBal;
      const currentAdvBal = rawAdvBal > 0 ? rawAdvBal : rawAdvTaken;

      const wagesAmount = Math.round(workingDays * dailyWage);
      const allowanceAmount = Math.round(workingDays * dailyAllowance);
      const grossPayment = (wagesAmount + allowanceAmount);

      // Flexible / Manual deductions (pre-filled from DB if already entered/approved)
      const pfAmount = dbPayment ? (parseFloat(dbPayment.pfAmount) || 0) : 0;
      const esiAmount = dbPayment ? (parseFloat(dbPayment.esiAmount) || 0) : 0;
      const netBaseAmount = Math.max(0, grossPayment - pfAmount - esiAmount);

      const totalDailyRate = (dailyWage + dailyAllowance);
      const calculatedLiveOtRate = parseFloat(worker.otHourlyRate) > 0
        ? parseFloat(worker.otHourlyRate)
        : (totalDailyRate > 0 ? (totalDailyRate / 8) * 2 : 0);

      // In approved months: lock onto the approved otHourlyRate so future master rate changes NEVER alter past approved OT payments!
      const otRate = (isApproved && dbPayment.otHourlyRate != null && parseFloat(dbPayment.otHourlyRate) > 0)
        ? parseFloat(dbPayment.otHourlyRate)
        : calculatedLiveOtRate;

      const totalOtHours = totalOt;
      // In approved months: if attendance wasn't changed, retain exact approved otPayment
      const otPayment = isApproved && dbPayment.otPayment != null && (liveWorkingDays === 0 || liveWorkingDays === approvedWorkingDays) && (totalOtHours === parseFloat(dbPayment.totalOtHours || 0))
        ? Math.round(parseFloat(dbPayment.otPayment))
        : Math.round(totalOtHours * otRate);

      const defaultOtAllowance = parseFloat(worker.otAllowance) || 0;
      const otAllowance = isApproved && dbPayment.otAllowance != null 
        ? parseFloat(dbPayment.otAllowance) 
        : (totalOtHours > 0 ? defaultOtAllowance : 0);

      const totalPayment = (netBaseAmount + otPayment + otAllowance);

      const advanceDeducted = dbPayment ? (parseFloat(dbPayment.advanceDeducted) || 0) : 0;
      const initialAdvanceBalance = isApproved 
        ? Math.max(currentAdvBal + advanceDeducted, advanceTaken) 
        : Math.max(currentAdvBal, advanceTaken);
      const remainingAdvanceBalance = Math.max(0, initialAdvanceBalance - advanceDeducted);
      const extraAmount = dbPayment ? (parseFloat(dbPayment.extraAmount) || 0) : 0;
      const finalNetAmount = Math.max(0, totalPayment - advanceDeducted + extraAmount);

      return {
        workerId: worker.id,
        empId: worker.workerId,
        fullName: worker.fullName,
        fatherName: worker.fatherName || '-',
        designation: worker.designation || 'Worker',
        mobileNumber: worker.mobileNumber,
        divisionId: worker.divisionId,
        divisionName: worker.divisionName,
        divisionBreakdown: divisionCounts,
        
        // Statutory & Workplace details for Salary Slip
        pfNumber: worker.pfNumber || '',
        esiNumber: worker.esiNumber || '',
        uanNumber: worker.uanNumber || '',
        bankAccountNo: worker.bankAccountNo || '',
        ifscCode: worker.ifscCode || '',
        placeOfWork: worker.placeOfWork || worker.divisionName || '',
        natureOfWork: worker.natureOfWork || 'MAINTENANCE',

        // 18 Official Register Columns + Advance Balances
        dailyWage,
        workingDays,
        presentDays: present,
        absentDays: absent,
        halfDays: half,
        leaveDays: leave,
        dailyAllowance,
        advanceTaken,
        advanceBalance: initialAdvanceBalance,
        wagesAmount,
        allowanceAmount,
        grossPayment,
        pfAmount,
        esiAmount,
        netBaseAmount,
        totalOtHours: totalOt,
        otHourlyRate: otRate,
        otPayment,
        otAllowance,
        totalPayment,
        advanceDeducted,
        remainingAdvanceBalance,
        extraAmount,
        finalNetAmount,
        
        calculatedAmount: finalNetAmount,
        paymentStatus: dbPayment ? dbPayment.status : 'PENDING',
        paymentId: dbPayment ? dbPayment.id : null,
      };
    });

    let targetDivisionName = '';
    if (isFiltered) {
      const { rows: divRows } = await pool.query('SELECT "name" FROM "Division" WHERE "id" = $1', [divisionId]);
      targetDivisionName = divRows[0]?.name || '';
    }

    const wageReport = rawWageReport;

    // When division filter is selected, ensure divisionName and placeOfWork reflect the active filtered division
    const finalReport = wageReport.map(w => ({
      ...w,
      divisionName: (isFiltered && targetDivisionName) ? targetDivisionName : (w.divisionName || 'General'),
      placeOfWork: (isFiltered && targetDivisionName) ? targetDivisionName : (w.placeOfWork || w.divisionName || 'General'),
    }));

    res.json({ wages: finalReport });
  } catch (err) {
    console.error('Wages report error:', err);
    res.status(500).json({ error: 'Failed to calculate monthly wages', details: err.message });
  }
});

// GET /api/attendance/worker-month - Physical Register Book style day-by-day drilldown (DIRECT SQL)
app.get('/api/attendance/worker-month', authenticateToken, async (req, res) => {
  try {
    const { workerId, month, year } = req.query;
    if (!workerId || !month || !year) {
      return res.status(400).json({ error: 'workerId, month, and year are required' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const { rows: workerRows } = await pool.query(
      `SELECT w.*, COALESCE(d."name", 'General') as "divisionName"
       FROM "Worker" w
       LEFT JOIN "Division" d ON w."divisionId" = d."id"
       WHERE w."id" = $1`,
      [workerId]
    );

    if (workerRows.length === 0) return res.status(404).json({ error: 'Worker not found' });
    const worker = workerRows[0];

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const totalDaysInMonth = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')} 23:59:59.999`;

    const { rows: logs } = await pool.query(
      `SELECT a.*, 
              to_char(a."date", 'YYYY-MM-DD') as "dateStr",
              COALESCE(a."overtimeHours", 0)::float as "overtimeHours",
              d."name" as "divisionName", 
              d2."name" as "secondDivisionName",
              u."fullName" as "markedByName"
       FROM "Attendance" a
       LEFT JOIN "Division" d ON a."divisionId" = d."id"
       LEFT JOIN "Division" d2 ON a."secondDivisionId" = d2."id"
       LEFT JOIN "User" u ON a."markedById" = u."id"
       WHERE a."workerId" = $1 AND a."date" >= $2::timestamp AND a."date" <= $3::timestamp
       ORDER BY a."date" ASC`,
      [workerId, startDate, endDate]
    );

    const formatToLocalDateStr = (d) => {
      const dt = new Date(d);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const logsByDateStr = {};
    logs.forEach(l => {
      const dStr = l.dateStr || formatToLocalDateStr(l.date);
      logsByDateStr[dStr] = l;
    });

    // Fetch declared holidays for this month
    const { rows: holidays } = await pool.query(
      `SELECT "date", "name", "type", to_char("date", 'YYYY-MM-DD') as "dateStr" FROM "Holiday" WHERE "date" >= $1::timestamp AND "date" <= $2::timestamp`,
      [startDate, endDate]
    );

    const holidaysByDateStr = {};
    holidays.forEach(h => {
      const dStr = h.dateStr || formatToLocalDateStr(h.date);
      holidaysByDateStr[dStr] = h;
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysList = [];
    const divisionSummary = {};
    let totalPresent = 0;
    let totalHalfDay = 0;
    let totalSplitDays = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalOtHours = 0;
    let totalGovtHolidays = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const curDate = new Date(y, m - 1, day);
      const curDateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayName = dayNames[curDate.getDay()];
      const isSunday = curDate.getDay() === 0;
      const declaredHoliday = holidaysByDateStr[curDateStr];

      const log = logsByDateStr[curDateStr];
      let status = log ? log.status : (declaredHoliday ? 'GOVT_HOLIDAY' : (isSunday ? 'HOLIDAY' : 'NOT_MARKED'));
      const otHours = log ? (parseFloat(log.overtimeHours || log.otHours) || 0) : 0;
      
      const div1Name = log?.divisionName || worker.divisionName || 'General';
      const div2Name = log?.secondDivisionName || null;
      const isSplit = log && log.status === 'HALF_DAY' && Boolean(log.secondDivisionId && div2Name);

      let displayDivName = div1Name;
      if (isSplit) {
        displayDivName = `${div1Name} (0.5d) + ${div2Name} (0.5d)`;
      }

      if (log) {
        if (log.status === 'PRESENT') {
          totalPresent += 1;
          divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 1;
        } else if (log.status === 'HALF_DAY') {
          if (isSplit) {
            // Split across two divisions: 0.5d Div 1 + 0.5d Div 2 = 1.0 Full Day!
            totalSplitDays += 1;
            divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 0.5;
            divisionSummary[div2Name] = (divisionSummary[div2Name] || 0) + 0.5;
          } else {
            totalHalfDay += 1;
            divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 0.5;
          }
        } else if (log.status === 'ABSENT') {
          totalAbsent += 1;
        } else if (log.status === 'LEAVE') {
          totalLeave += 1;
        }
        totalOtHours += otHours;
      } else if (declaredHoliday) {
        totalGovtHolidays += 1;
        divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 1;
      }

      daysList.push({
        dayNumber: day,
        dateStr: curDateStr,
        dayName,
        isSunday,
        isHoliday: !!declaredHoliday,
        holidayName: declaredHoliday ? declaredHoliday.name : null,
        status: isSplit ? 'SPLIT_DAY' : status,
        rawStatus: status,
        isSplit,
        divisionName: displayDivName,
        primaryDivisionName: div1Name,
        secondDivisionName: div2Name,
        overtimeHours: otHours,
        notes: isSplit 
          ? `Split 1.0d across 2 sites: 0.5d at ${div1Name} & 0.5d at ${div2Name}` 
          : (declaredHoliday ? `🏛️ ${declaredHoliday.name}` : (log?.notes || null)),
        markedBy: log?.markedByName || (declaredHoliday ? 'Govt/Company Holiday' : null)
      });
    }

    // Fetch all historical approved payments for this worker to track lifetime advance deduction audit trail
    const { rows: paymentHistory } = await pool.query(
      `SELECT "id", "month", "year", "advanceDeducted", "finalNetAmount", "status", "createdAt", "updatedAt"
       FROM "MonthlyPayment"
       WHERE "workerId" = $1
       ORDER BY "year" DESC, "month" DESC`,
      [workerId]
    );

    res.json({
      worker: {
        id: worker.id,
        empId: worker.workerId,
        fullName: worker.fullName,
        fatherName: worker.fatherName || '-',
        designation: worker.designation || 'Worker',
        mobileNumber: worker.mobileNumber,
        dailyWage: parseFloat(worker.dailyWage),
        dailyAllowance: parseFloat(worker.dailyAllowance || 0),
        advanceTaken: parseFloat(worker.advanceTaken || worker.advanceBalance || 0),
        advanceBalance: parseFloat(worker.advanceBalance || 0),
        otHourlyRate: parseFloat(worker.otHourlyRate || 0),
        defaultDivision: worker.divisionName
      },
      month: m,
      year: y,
      totalDaysInMonth,
      divisionSummary,
      summary: {
        totalPresent,
        totalHalfDay,
        totalSplitDays,
        totalAbsent,
        totalLeave,
        totalWorkingDays: Math.round((totalPresent + totalSplitDays + (totalHalfDay * 0.5) + totalGovtHolidays) * 10) / 10,
        totalOtHours: Math.round(totalOtHours * 100) / 100,
        totalGovtHolidays
      },
      paymentHistory: paymentHistory.map(p => ({
        month: p.month,
        year: p.year,
        advanceDeducted: parseFloat(p.advanceDeducted) || 0,
        finalNetAmount: parseFloat(p.finalNetAmount) || 0,
        status: p.status,
        date: p.updatedAt || p.createdAt
      })),
      days: daysList
    });
  } catch (err) {
    console.error('Worker month attendance drilldown error:', err);
    res.status(500).json({ error: 'Failed to fetch register book drilldown', details: err.message });
  }
});

app.post('/api/wages/approve', authenticateToken, async (req, res) => {
  try {
    const { 
      workerId, 
      month, 
      year, 
      presentDays, 
      absentDays, 
      halfDays, 
      leaveDays, 
      dailyWage,
      dailyAllowance,
      totalOtHours, 
      wagesAmount,
      allowanceAmount,
      grossPayment,
      pfAmount,
      esiAmount,
      netBaseAmount,
      otPayment,
      otAllowance,
      totalPayment,
      advanceDeducted,
      extraAmount,
      finalNetAmount,
      calculatedAmount,
      divisionSummary
    } = req.body;

    if (!workerId || !month || !year) {
      return res.status(400).json({ error: 'Worker ID, Month, and Year are required' });
    }

    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Wages payouts can only be approved by Owner or Managers' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const pDays = parseFloat(presentDays) || 0;
    const aDays = parseFloat(absentDays) || 0;
    const hDays = parseFloat(halfDays) || 0;
    const lDays = parseFloat(leaveDays) || 0;
    const dWage = dailyWage !== undefined ? (parseFloat(dailyWage) || 0) : null;
    const dAllow = dailyAllowance !== undefined ? (parseFloat(dailyAllowance) || 0) : null;
    const otH = parseFloat(totalOtHours) || 0;
    const wAmt = parseFloat(wagesAmount) || 0;
    const allAmt = parseFloat(allowanceAmount) || 0;
    const gross = parseFloat(grossPayment) || 0;
    const pf = parseFloat(pfAmount) || 0;
    const esi = parseFloat(esiAmount) || 0;
    const netBase = parseFloat(netBaseAmount) || 0;
    const otPay = parseFloat(otPayment) || 0;
    const otAll = parseFloat(otAllowance) || 0;
    const totPay = parseFloat(totalPayment) || 0;
    const adv = parseFloat(advanceDeducted) || 0;
    const extra = parseFloat(extraAmount) || 0;
    const finalNet = parseFloat(finalNetAmount ?? calculatedAmount) || 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock worker row FOR UPDATE to guarantee ACID concurrency on advance balance adjustments
      const { rows: workerCheck } = await client.query(`SELECT "id", "advanceBalance", "advanceTaken" FROM "Worker" WHERE "id" = $1 FOR UPDATE`, [workerId]);
      if (workerCheck.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Worker not found' });
      }

      const { rows: existingRows } = await client.query(`SELECT "advanceDeducted" FROM "MonthlyPayment" WHERE "workerId" = $1 AND "month" = $2 AND "year" = $3 FOR UPDATE`, [workerId, m, y]);
      const prevAdvanceDeducted = existingRows.length > 0 ? (parseFloat(existingRows[0].advanceDeducted) || 0) : 0;

      // Available advance pool for this month is current advanceBalance + any advance previously deducted for this specific month
      const currentWorkerBal = parseFloat(workerCheck[0].advanceBalance) || 0;
      const totalAvailableAdvance = Math.max(0, currentWorkerBal + prevAdvanceDeducted);

      // Rule: Worker with 0 attendance / 0 total payment OR 0 advance taken/balance CANNOT have advance deducted.
      // Also advance deducted cannot exceed either available advance balance or total earned payment.
      let safeAdv = adv;
      if (totalAvailableAdvance <= 0 || (pDays <= 0 && hDays <= 0 && totPay <= 0)) {
        safeAdv = 0;
      } else {
        safeAdv = Math.min(safeAdv, totalAvailableAdvance, Math.max(0, totPay));
      }

      // Recompute finalNet based on safeAdv
      const safeFinalNet = Math.max(0, totPay - safeAdv + extra);

      const { rows } = await client.query(
        `INSERT INTO "MonthlyPayment" (
           "id", "workerId", "month", "year", "presentDays", "absentDays", "halfDays", "leaveDays", "totalOtHours",
           "dailyWage", "dailyAllowance", "otHourlyRate",
           "wagesAmount", "allowanceAmount", "grossPayment", "pfAmount", "esiAmount", "netBaseAmount",
           "otPayment", "otAllowance", "totalPayment", "advanceDeducted", "extraAmount", "finalNetAmount",
           "calculatedAmount", "divisionSummary", "status", "approvedById", "createdAt", "updatedAt"
         )
         VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11,
           $12, $13, $14, $15, $16, $17,
           $18, $19, $20, $21, $22, $23,
           $24, COALESCE($25::jsonb, '{}'::jsonb), 'APPROVED', $26, NOW(), NOW()
         )
         ON CONFLICT ("workerId", "month", "year")
         DO UPDATE SET
           "presentDays" = EXCLUDED."presentDays",
           "absentDays" = EXCLUDED."absentDays",
           "halfDays" = EXCLUDED."halfDays",
           "leaveDays" = EXCLUDED."leaveDays",
           "totalOtHours" = EXCLUDED."totalOtHours",
           "dailyWage" = EXCLUDED."dailyWage",
           "dailyAllowance" = EXCLUDED."dailyAllowance",
           "otHourlyRate" = EXCLUDED."otHourlyRate",
           "wagesAmount" = EXCLUDED."wagesAmount",
           "allowanceAmount" = EXCLUDED."allowanceAmount",
           "grossPayment" = EXCLUDED."grossPayment",
           "pfAmount" = EXCLUDED."pfAmount",
           "esiAmount" = EXCLUDED."esiAmount",
           "netBaseAmount" = EXCLUDED."netBaseAmount",
           "otPayment" = EXCLUDED."otPayment",
           "otAllowance" = EXCLUDED."otAllowance",
           "totalPayment" = EXCLUDED."totalPayment",
           "advanceDeducted" = EXCLUDED."advanceDeducted",
           "extraAmount" = EXCLUDED."extraAmount",
           "finalNetAmount" = EXCLUDED."finalNetAmount",
           "calculatedAmount" = EXCLUDED."calculatedAmount",
           "divisionSummary" = EXCLUDED."divisionSummary",
           "status" = 'APPROVED',
           "approvedById" = EXCLUDED."approvedById",
           "updatedAt" = NOW()
         RETURNING *`,
        [
          workerId, m, y, pDays, aDays, hDays, lDays, otH,
          dWage, dAllow, req.body.otHourlyRate ? parseFloat(req.body.otHourlyRate) : (dWage + dAllow > 0 ? (dWage + dAllow) / 4 : 0),
          wAmt, allAmt, gross, pf, esi, netBase,
          otPay, otAll, totPay, safeAdv, extra, safeFinalNet,
          safeFinalNet, divisionSummary ? JSON.stringify(divisionSummary) : '{}', req.user.id
        ]
      );

      if (safeAdv > 0 || prevAdvanceDeducted > 0) {
        const { rows: updatedWorker } = await client.query(
          `UPDATE "Worker"
           SET "advanceBalance" = GREATEST(0, COALESCE("advanceBalance", 0) + $1 - $2), "updatedAt" = NOW()
           WHERE "id" = $3
           RETURNING "advanceBalance"`,
          [prevAdvanceDeducted, safeAdv, workerId]
        );

        const newBalAfter = updatedWorker.length > 0 ? parseFloat(updatedWorker[0].advanceBalance) : 0;

        // Clean up previous payroll deduction transaction for this payment if re-approving/editing
        await client.query(
          `DELETE FROM "AdvanceTransaction" WHERE "source" = 'MONTHLY_PAYROLL_DEDUCTION' AND "referenceId" = $1`,
          [rows[0].id]
        );

        if (safeAdv > 0) {
          await client.query(
            `INSERT INTO "AdvanceTransaction" (
               "id", "workerId", "type", "date", "amount", "balanceAfter", "source", "referenceId", "reason", "recordedById", "createdAt"
             )
             VALUES (
               gen_random_uuid()::text, $1, 'DEDUCTION', NOW(), $2, $3, 'MONTHLY_PAYROLL_DEDUCTION', $4, $5, $6, NOW()
             )`,
            [
              workerId,
              safeAdv,
              newBalAfter,
              rows[0].id,
              `Monthly Wage Payroll Deduction (${m}/${y})`,
              req.user.id
            ]
          );
        }
      }

      // Log revision in SalaryAuditLog if updating an existing payment
      const prevFinalNet = existingRows.length > 0 ? (parseFloat(existingRows[0].finalNetAmount || existingRows[0].calculatedAmount) || 0) : 0;
      const prevGross = existingRows.length > 0 ? (parseFloat(existingRows[0].grossPayment) || 0) : 0;
      if (existingRows.length > 0 && Math.abs(prevFinalNet - safeFinalNet) > 0.01) {
        await client.query(
          `INSERT INTO "SalaryAuditLog" (
             "id", "workerId", "month", "year", "previousAmount", "newAmount", "difference",
             "previousGross", "newGross", "previousAdvanceDeducted", "newAdvanceDeducted",
             "action", "notes", "modifiedById", "createdAt"
           )
           VALUES (
             gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'MODIFIED', $11, $12, NOW()
           )`,
          [
            workerId, m, y, prevFinalNet, safeFinalNet, safeFinalNet - prevFinalNet,
            prevGross, gross, prevAdvanceDeducted, safeAdv,
            `Salary modified from ₹${prevFinalNet} to ₹${safeFinalNet}`,
            req.user.id
          ]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Monthly wage payment successfully approved!', payment: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve wage payout', details: err.message });
  }
});

// POST /api/wages/unapprove - Unlock/Unapprove wages for an entire month or a worker (Admin only)
app.post('/api/wages/unapprove', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only OWNER and MANAGER can unlock or unapprove wages' });
    }

    const { month, year, workerId } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and Year are required' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let query = `UPDATE "MonthlyPayment" SET "status" = 'PENDING', "updatedAt" = NOW() WHERE "month" = $1 AND "year" = $2`;
      const params = [m, y];

      if (workerId) {
        query += ` AND "workerId" = $3`;
        params.push(workerId);
      }

      await client.query(query, params);

      // Audit Log Entry for Unlocking
      if (workerId) {
        await client.query(
          `INSERT INTO "SalaryAuditLog" ("id", "workerId", "month", "year", "previousAmount", "newAmount", "difference", "action", "notes", "modifiedById", "createdAt")
           SELECT gen_random_uuid()::text, "workerId", "month", "year", COALESCE("finalNetAmount", "calculatedAmount", 0), COALESCE("finalNetAmount", "calculatedAmount", 0), 0, 'UNLOCKED', $3, $4, NOW()
           FROM "MonthlyPayment" WHERE "workerId" = $1 AND "month" = $2 AND "year" = $5`,
          [workerId, m, `Month unlocked by ${req.user.fullName || req.user.username}`, req.user.id, y]
        );
      } else {
        await client.query(
          `INSERT INTO "SalaryAuditLog" ("id", "workerId", "month", "year", "previousAmount", "newAmount", "difference", "action", "notes", "modifiedById", "createdAt")
           SELECT gen_random_uuid()::text, "workerId", "month", "year", COALESCE("finalNetAmount", "calculatedAmount", 0), COALESCE("finalNetAmount", "calculatedAmount", 0), 0, 'UNLOCKED', $3, $4, NOW()
           FROM "MonthlyPayment" WHERE "month" = $1 AND "year" = $2`,
          [m, y, `Entire month unlocked by ${req.user.fullName || req.user.username}`, req.user.id]
        );
      }

      await client.query('COMMIT');

      res.json({ message: `Monthly wages for ${m}/${y} successfully unlocked to DRAFT mode!` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Unapprove error:', err);
    res.status(500).json({ error: 'Failed to unlock monthly wages', details: err.message });
  }
});

// --- WORKER LEAVE LEDGER MODULE (18 LEAVES/YEAR: 10 MEDICAL + 8 CASUAL) ---
app.get('/api/leave-ledger', authenticateToken, async (req, res) => {
  try {
    const { year, divisionId, search } = req.query;
    const y = parseInt(year, 10) || new Date().getFullYear();

    let query = `
      SELECT 
        w.id,
        w."workerId",
        w."fullName",
        w."fatherName",
        w."designation",
        w."mobileNumber",
        COALESCE(w."isActive", true) as "isActive",
        d.id as "divisionId",
        d.name as "divisionName",
        COALESCE((
          SELECT SUM(l.days)
          FROM "WorkerLeave" l
          WHERE l."workerId" = w.id AND l."year" = $1 AND l."leaveType" = 'MEDICAL'
        ), 0)::float as "medicalLeavesTaken",
        COALESCE((
          SELECT SUM(l.days)
          FROM "WorkerLeave" l
          WHERE l."workerId" = w.id AND l."year" = $1 AND l."leaveType" = 'CASUAL'
        ), 0)::float as "casualLeavesTaken",
        COALESCE((
          SELECT COUNT(*)
          FROM "WorkerLeave" l
          WHERE l."workerId" = w.id AND l."year" = $1
        ), 0)::int as "totalLeaveRecords"
      FROM "Worker" w
      LEFT JOIN "Division" d ON w."divisionId" = d.id
    `;

    const whereClauses = [];
    const params = [y];

    if (divisionId && divisionId !== 'ALL') {
      params.push(divisionId);
      whereClauses.push(`w."divisionId" = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(w."fullName") LIKE $${params.length} OR
        LOWER(w."workerId") LIKE $${params.length} OR
        LOWER(COALESCE(w."designation", '')) LIKE $${params.length} OR
        LOWER(COALESCE(w."mobileNumber", '')) LIKE $${params.length} OR
        LOWER(COALESCE(d.name, '')) LIKE $${params.length}
      )`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY 
      CASE 
        WHEN w."workerId" ~ '^SKC-E-[0-9]+$' THEN CAST(SUBSTRING(w."workerId" FROM 7) AS INTEGER)
        WHEN w."workerId" ~ '^[0-9]+$' THEN CAST(w."workerId" AS INTEGER)
        ELSE 999999
      END ASC, w."fullName" ASC`;

    const { rows } = await pool.query(query, params);

    const formattedRows = rows.map(r => {
      const mlTaken = parseFloat(r.medicalLeavesTaken) || 0;
      const clTaken = parseFloat(r.casualLeavesTaken) || 0;
      const totalTaken = mlTaken + clTaken;
      const mlAllowed = 10;
      const clAllowed = 8;
      const totalAllowed = 18;

      return {
        ...r,
        medicalLeavesAllowed: mlAllowed,
        casualLeavesAllowed: clAllowed,
        totalLeavesAllowed: totalAllowed,
        medicalLeavesTaken: mlTaken,
        casualLeavesTaken: clTaken,
        totalLeavesTaken: totalTaken,
        medicalLeavesBalance: Math.max(0, mlAllowed - mlTaken),
        casualLeavesBalance: Math.max(0, clAllowed - clTaken),
        totalLeavesBalance: Math.max(0, totalAllowed - totalTaken)
      };
    });

    const summary = {
      totalWorkers: formattedRows.length,
      totalAllowedLeaves: formattedRows.length * 18,
      totalMedicalLeavesTaken: formattedRows.reduce((s, w) => s + w.medicalLeavesTaken, 0),
      totalCasualLeavesTaken: formattedRows.reduce((s, w) => s + w.casualLeavesTaken, 0),
      totalLeavesTaken: formattedRows.reduce((s, w) => s + w.totalLeavesTaken, 0),
      totalLeavesBalance: formattedRows.reduce((s, w) => s + w.totalLeavesBalance, 0)
    };

    res.json({ workers: formattedRows, summary, year: y });
  } catch (err) {
    console.error('Error fetching leave ledger:', err);
    res.status(500).json({ error: 'Failed to fetch leave ledger' });
  }
});

// GET /api/leave-ledger/:workerId - Drilldown of worker leaves for a year
app.get('/api/leave-ledger/:workerId', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.params;
    const { year } = req.query;
    const y = parseInt(year, 10) || new Date().getFullYear();

    const { rows: workerRows } = await pool.query(
      `SELECT w.*, d.name as "divisionName"
       FROM "Worker" w
       LEFT JOIN "Division" d ON w."divisionId" = d.id
       WHERE w.id = $1`,
      [workerId]
    );
    if (workerRows.length === 0) return res.status(404).json({ error: 'Worker not found' });
    const worker = workerRows[0];

    const { rows: leaves } = await pool.query(
      `SELECT l.*, u."fullName" as "markedByName"
       FROM "WorkerLeave" l
       LEFT JOIN "User" u ON l."markedById" = u.id
       WHERE l."workerId" = $1 AND l."year" = $2
       ORDER BY l."date" DESC, l."createdAt" DESC`,
      [workerId, y]
    );

    const mlTaken = leaves.filter(l => l.leaveType === 'MEDICAL').reduce((s, l) => s + (parseFloat(l.days) || 0), 0);
    const clTaken = leaves.filter(l => l.leaveType === 'CASUAL').reduce((s, l) => s + (parseFloat(l.days) || 0), 0);

    res.json({
      worker: {
        id: worker.id,
        workerId: worker.workerId,
        fullName: worker.fullName,
        fatherName: worker.fatherName,
        designation: worker.designation,
        mobileNumber: worker.mobileNumber,
        divisionName: worker.divisionName || 'General',
        medicalLeavesAllowed: 10,
        casualLeavesAllowed: 8,
        totalLeavesAllowed: 18,
        medicalLeavesTaken: mlTaken,
        casualLeavesTaken: clTaken,
        totalLeavesTaken: mlTaken + clTaken,
        medicalLeavesBalance: Math.max(0, 10 - mlTaken),
        casualLeavesBalance: Math.max(0, 8 - clTaken),
        totalLeavesBalance: Math.max(0, 18 - (mlTaken + clTaken))
      },
      leaves,
      year: y
    });
  } catch (err) {
    console.error('Error fetching worker leave drilldown:', err);
    res.status(500).json({ error: 'Failed to fetch leave history' });
  }
});

// POST /api/leave-ledger - Record leave entry
app.post('/api/leave-ledger', authenticateToken, requireRoles(['OWNER', 'MANAGER', 'SUPERVISOR']), async (req, res) => {
  try {
    const { workerId, date, leaveType, days, reason } = req.body;
    if (!workerId || !date || !leaveType) {
      return res.status(400).json({ error: 'Worker, date, and leave type (MEDICAL/CASUAL) are required' });
    }

    const lType = leaveType.toUpperCase() === 'CASUAL' ? 'CASUAL' : 'MEDICAL';
    const numDays = parseFloat(days) || 1.0;
    const leaveDate = new Date(date);
    const year = leaveDate.getFullYear();

    // Check existing leave balance for the year
    const { rows: existingLeaves } = await pool.query(
      `SELECT SUM(days)::float as "taken" FROM "WorkerLeave" WHERE "workerId" = $1 AND "year" = $2 AND "leaveType" = $3`,
      [workerId, year, lType]
    );
    const currentTaken = existingLeaves[0]?.taken || 0;
    const limit = lType === 'MEDICAL' ? 10 : 8;

    if (currentTaken + numDays > limit) {
      return res.status(400).json({
        error: `Cannot grant leave. Worker has only ${(limit - currentTaken).toFixed(1)} ${lType} Leaves remaining out of ${limit} for year ${year}.`
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO "WorkerLeave" ("id", "workerId", "date", "leaveType", "days", "reason", "year", "markedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2::timestamp, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT ("workerId", "date")
       DO UPDATE SET "leaveType" = EXCLUDED."leaveType", "days" = EXCLUDED."days", "reason" = EXCLUDED."reason", "markedById" = EXCLUDED."markedById", "updatedAt" = NOW()
       RETURNING *`,
      [workerId, date, lType, numDays, reason ? reason.trim() : null, year, req.user.id]
    );

    res.status(201).json({ message: `${lType} Leave recorded successfully!`, leave: rows[0] });
  } catch (err) {
    console.error('Error creating leave entry:', err);
    res.status(500).json({ error: 'Failed to record leave' });
  }
});

// DELETE /api/leave-ledger/:id - Cancel/Delete leave entry
app.delete('/api/leave-ledger/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM "WorkerLeave" WHERE "id" = $1`, [id]);
    res.json({ message: 'Leave record removed successfully' });
  } catch (err) {
    console.error('Error deleting leave entry:', err);
    res.status(500).json({ error: 'Failed to remove leave entry' });
  }
});

// --- SALARY LEDGER & AUDIT TRAIL API ---
app.get('/api/salary-ledger', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { month, year, workerId, search } = req.query;

    let query = `
      SELECT 
        sal.*,
        w."workerId" as "workerCode",
        w."fullName" as "workerName",
        w."mobileNumber",
        w."designation",
        d.name as "divisionName",
        u."fullName" as "modifiedByName",
        u.role as "modifiedByRole"
      FROM "SalaryAuditLog" sal
      JOIN "Worker" w ON sal."workerId" = w.id
      LEFT JOIN "Division" d ON w."divisionId" = d.id
      LEFT JOIN "User" u ON sal."modifiedById" = u.id
    `;

    const whereClauses = [];
    const params = [];

    if (month && month !== 'ALL') {
      params.push(parseInt(month, 10));
      whereClauses.push(`sal."month" = $${params.length}`);
    }

    if (year && year !== 'ALL') {
      params.push(parseInt(year, 10));
      whereClauses.push(`sal."year" = $${params.length}`);
    }

    if (workerId) {
      params.push(workerId);
      whereClauses.push(`sal."workerId" = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(w."fullName") LIKE $${params.length} OR
        LOWER(w."workerId") LIKE $${params.length} OR
        LOWER(COALESCE(w."designation", '')) LIKE $${params.length} OR
        LOWER(COALESCE(d.name, '')) LIKE $${params.length}
      )`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY sal."createdAt" DESC LIMIT 1000`;

    const { rows } = await pool.query(query, params);
    res.json({ auditLogs: rows });
  } catch (err) {
    console.error('Error fetching salary ledger audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch salary ledger' });
  }
});

// --- SALARY HIKE MATRIX LEDGER API (Worker-Wise Historical Increments) ---
app.get('/api/salary-hike-ledger', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { search, divisionId } = req.query;

    let workerQuery = `
      SELECT 
        w.id,
        w."workerId",
        w."fullName",
        w."fatherName",
        w."designation",
        w."dailyWage",
        w."extraAmount",
        w."wageRevisedDate",
        d.id as "divisionId",
        d.name as "divisionName"
      FROM "Worker" w
      LEFT JOIN "Division" d ON w."divisionId" = d.id
    `;

    const whereClauses = [];
    const params = [];

    if (divisionId && divisionId !== 'ALL') {
      params.push(divisionId);
      whereClauses.push(`w."divisionId" = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(w."fullName") LIKE $${params.length} OR
        LOWER(w."workerId") LIKE $${params.length} OR
        LOWER(COALESCE(w."designation", '')) LIKE $${params.length} OR
        LOWER(COALESCE(d.name, '')) LIKE $${params.length}
      )`);
    }

    if (whereClauses.length > 0) {
      workerQuery += ` WHERE ` + whereClauses.join(' AND ');
    }

    workerQuery += ` ORDER BY 
      CASE 
        WHEN w."workerId" ~ '^SKC-E-[0-9]+$' THEN CAST(SUBSTRING(w."workerId" FROM 7) AS INTEGER)
        WHEN w."workerId" ~ '^[0-9]+$' THEN CAST(w."workerId" AS INTEGER)
        ELSE 999999
      END ASC, w."fullName" ASC`;

    const { rows: workers } = await pool.query(workerQuery, params);

    // Fetch all hike records
    const { rows: historyRows } = await pool.query(
      `SELECT h.*, TO_CHAR(h."effectiveDate", 'YYYY-MM-DD') as "dateFormatted"
       FROM "WorkerWageHistory" h
       ORDER BY h."effectiveDate" ASC, h."createdAt" ASC`
    );

    // Group history by workerId
    const historyMap = {};
    historyRows.forEach(h => {
      if (!historyMap[h.workerId]) historyMap[h.workerId] = [];
      historyMap[h.workerId].push({
        id: h.id,
        effectiveDate: h.dateFormatted,
        basePaid: parseFloat(h.basePaid) || 0,
        hikeAmount: parseFloat(h.hikeAmount) || 0,
        totalAmount: parseFloat(h.totalAmount) || 0,
        notes: h.notes || ''
      });
    });

    const result = workers.map(w => {
      let workerHistory = historyMap[w.id] || [];
      // If no history exists yet, provide default initial row from worker master
      if (workerHistory.length === 0) {
        const initialDate = w.wageRevisedDate ? new Date(w.wageRevisedDate).toISOString().split('T')[0] : '2024-08-01';
        const base = parseFloat(w.dailyWage) || 0;
        const hike = parseFloat(w.extraAmount) || 0;
        workerHistory = [{
          effectiveDate: initialDate,
          basePaid: base,
          hikeAmount: hike,
          totalAmount: base + hike,
          notes: 'Master Registration'
        }];
      }

      return {
        ...w,
        hikeHistory: workerHistory
      };
    });

    res.json({ workers: result });
  } catch (err) {
    console.error('Error fetching salary hike ledger:', err);
    res.status(500).json({ error: 'Failed to fetch salary hike ledger' });
  }
});

app.post('/api/salary-hike-ledger', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { workerId, effectiveDate, basePaid, hikeAmount, notes } = req.body;
    if (!workerId || !effectiveDate || basePaid === undefined) {
      return res.status(400).json({ error: 'Worker, effective date, and base wage are required' });
    }

    const base = parseFloat(basePaid) || 0;
    const hike = parseFloat(hikeAmount) || 0;
    const total = base + hike;

    const { rows } = await pool.query(
      `INSERT INTO "WorkerWageHistory" ("id", "workerId", "effectiveDate", "basePaid", "hikeAmount", "totalAmount", "notes", "recordedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2::date, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT ("workerId", "effectiveDate")
       DO UPDATE SET
         "basePaid" = EXCLUDED."basePaid",
         "hikeAmount" = EXCLUDED."hikeAmount",
         "totalAmount" = EXCLUDED."totalAmount",
         "notes" = EXCLUDED."notes",
         "recordedById" = EXCLUDED."recordedById",
         "updatedAt" = NOW()
       RETURNING *`,
      [workerId, effectiveDate, base, hike, total, notes || null, req.user.id]
    );

    res.json({ message: 'Wage hike record saved successfully!', record: rows[0] });
  } catch (err) {
    console.error('Save wage hike record error:', err);
    res.status(500).json({ error: 'Failed to save wage hike record' });
  }
});

app.delete('/api/salary-hike-ledger/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM "WorkerWageHistory" WHERE "id" = $1`, [id]);
    res.json({ message: 'Wage hike record removed successfully' });
  } catch (err) {
    console.error('Delete wage hike record error:', err);
    res.status(500).json({ error: 'Failed to remove wage hike record' });
  }
});


// --- BANK ADVICE PROFESSIONAL EXCEL EXPORT (EXCELJS WITH CLEAN BORDERS) ---
app.post('/api/wages/export-bank-advice-excel', authenticateToken, async (req, res) => {
  try {
    const { type, month, year, chequeNo, companyAccountNo, bankBranchDate, workers } = req.body;
    const bankTitle = type === 'canara' ? 'CANARA BANK' : 'NON-CANARA (OTHER BANKS)';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = months[parseInt(month, 10) - 1] || 'Month';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(bankTitle, {
      views: [{ showGridLines: true }]
    });

    // Column widths
    worksheet.columns = [
      { key: 'col1', width: 10 },
      { key: 'col2', width: 35 },
      { key: 'col3', width: 28 },
      { key: 'col4', width: 20 },
      { key: 'col5', width: 18 }
    ];

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    // Header Letterhead
    worksheet.addRow(['SRI KRISHNA CONSTRUCTIONS']);
    worksheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow(['SHAKTHINAGAR - 584170']);
    worksheet.getRow(2).font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]); // Blank Row 3

    worksheet.addRow(['To,']);
    worksheet.addRow(['The Branch Manager,']);
    worksheet.addRow(['Canara Bank,']);
    worksheet.addRow(['Deosugur - 584 170']);
    
    worksheet.addRow([]); // Blank Row 8

    worksheet.addRow(['SUB: SALARY DISTRIBUTION']);
    worksheet.getRow(9).font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };

    worksheet.addRow([`ACCOUNT No. ${companyAccountNo || '18133070005349'}`]);
    worksheet.getRow(10).font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };

    const totalAmount = (workers || []).reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
    const descRow = worksheet.addRow([`We are enclosed herewith a cheque for Rs. ${totalAmount.toLocaleString('en-IN')}/- towards workers payment for the month of ${monthName.toUpperCase()} ${year}. Please credit the amount to the following accounts:`]);
    worksheet.mergeCells(`A11:E11`);
    worksheet.getRow(11).font = { bold: true, size: 9.5, color: { argb: 'FF334155' } };
    worksheet.getRow(11).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    worksheet.getRow(11).height = 28;

    worksheet.addRow([]); // Blank Row 12

    const chequeDateRow = worksheet.addRow([`Cheque No: ${chequeNo || '-'}`, '', '', `Date: ${bankBranchDate || '-'}`]);
    worksheet.mergeCells('A13:C13');
    worksheet.mergeCells('D13:E13');
    worksheet.getCell('A13').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getCell('D13').alignment = { vertical: 'middle', horizontal: 'right' };
    worksheet.getRow(13).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
    worksheet.getRow(13).height = 20;

    // Table Header Row (Row 14)
    const headerRow = worksheet.addRow(['SI NO', 'NAME', 'ACCOUNT NUMBER', 'IFSC CODE', 'AMOUNT (₹)']);

    headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
      cell.border = thinBorder;
    });

    // Add Worker Rows
    (workers || []).forEach((w, idx) => {
      const amt = parseFloat(w.amount) || 0;
      const r = worksheet.addRow([
        idx + 1,
        (w.fullName || '').toUpperCase(),
        String(w.bankAccountNo || '-'),
        (w.ifscCode || '').toUpperCase(),
        amt
      ]);
      r.height = 20;
      r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      r.getCell(2).font = { bold: true };
      r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(3).numFmt = '@'; // Store text string format for account number!
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(5).font = { bold: true };
      r.getCell(5).numFmt = '₹#,##0.00';

      r.eachCell((cell) => {
        cell.border = thinBorder;
      });
    });

    // Summary Total Row
    const totalRow = worksheet.addRow(['', 'TOTAL AMOUNT', '', '', totalAmount]);
    totalRow.height = 22;
    totalRow.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
    totalRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    totalRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    totalRow.getCell(5).numFmt = '₹#,##0.00';
    totalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    worksheet.addRow([]);
    worksheet.addRow(['sunilgouda1280@gmail.com', '', '', '', 'For SRI KRISHNA CONSTRUCTIONS']);
    worksheet.addRow(['', '', '', '', 'Authorized Signatory']);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="SRI_KRISHNA_CONSTRUCTIONS_${type.toUpperCase()}_ADVICE_${monthName.toUpperCase()}_${year}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export bank advice excel error:', err);
    res.status(500).json({ error: 'Failed to generate bank advice Excel' });
  }
});

app.post('/api/wages/whatsapp-link', authenticateToken, async (req, res) => {
  try {
    const { workerName, mobileNumber, month, year, presentDays, halfDays, totalOtHours, extraAmount, calculatedAmount } = req.body;
    if (!workerName || !mobileNumber || !calculatedAmount) {
      return res.status(400).json({ error: 'Name, mobile number, and wage details are required' });
    }

    // Map month number to text
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthText = months[parseInt(month, 10) - 1] || 'Month';

    const extraLine = extraAmount && parseFloat(extraAmount) > 0 ? `\n- Extra Amount: *Rs. ${extraAmount}*` : '';
    const message = `*SRI KRISHNA CONSTRUCTIONS*
------------------------------
Dear *${workerName}*,
Your attendance and payment summary for *${monthText} ${year}* has been calculated and approved:
- Present Days: *${presentDays}*
- Half Days: *${halfDays}*
- OT Hours: *${totalOtHours}*${extraLine}
- Total Approved Wage: *Rs. ${calculatedAmount}*

Your salary payment is approved and is being disbursed. Thank you!`;

    const cleanNumber = mobileNumber.replace(/\+/g, '').trim(); // wa.me accepts without +
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    res.json({ link: waUrl, message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate WhatsApp link' });
  }
});

// --- FILTER-AWARE EXCEL EXPORT ---
app.post('/api/export/excel', authenticateToken, async (req, res) => {
  try {
    const { category, items } = req.body;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(category || 'Stock Data');

    if (category === 'IAC_CHICAGO') {
      worksheet.columns = [
        { header: 'Sl No', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name / Spec', key: 'itemName', width: 45 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Brand Offered', key: 'brandOffered', width: 20 },
        { header: '% GST Included', key: 'gstPercentage', width: 15 },
        { header: 'HSN', key: 'hsnCode', width: 15 },
        { header: 'Bidders Compliance', key: 'biddersCompliance', width: 20 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    } else if (category === 'KIRLOSKAR_ANNEXURE') {
      worksheet.columns = [
        { header: 'Sl. No.', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name', key: 'itemName', width: 30 },
        { header: 'Part No.', key: 'partNo', width: 18 },
        { header: 'Item Specifications', key: 'specifications', width: 35 },
        { header: 'UOM', key: 'unit', width: 10 },
        { header: 'Basic Rate (Rs)', key: 'basicRateRs', width: 16 },
        { header: 'Basic Rate Alt', key: 'basicRateRsAlt', width: 16 },
        { header: 'SKC Rate 1', key: 'skcRate1', width: 14 },
        { header: 'SKC Rate 2', key: 'skcRate2', width: 14 },
        { header: 'Diff %', key: 'diffPercentage', width: 12 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    } else if (category === 'TAC_CHICAGO') {
      worksheet.columns = [
        { header: 'Sno', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name / Spec', key: 'itemName', width: 50 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'SKC Rate', key: 'skcRate1', width: 15 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    } else {
      // KIRLOSKAR_UNIT4
      worksheet.columns = [
        { header: 'Sl. No.', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name', key: 'itemName', width: 35 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Qty', key: 'baseQty', width: 10 },
        { header: 'Item Specifications', key: 'specifications', width: 45 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    }

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' },
    };

    items.forEach((item, index) => {
      worksheet.addRow({ slNo: index + 1, ...item });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${category}_stocks.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export Excel error:', err);
    res.status(500).json({ error: 'Failed to generate Excel download' });
  }
});

// --- DATABASE BACKUP API ---
app.post('/api/backup/database', authenticateToken, requireRoles(['OWNER']), (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DATABASE_URL not configured' });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `sri_krishna_backup_${timestamp}.sql`;
  
  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  const dump = spawn('pg_dump', [dbUrl, '--no-owner', '--no-privileges']);
  dump.stdout.pipe(res);
  dump.stderr.on('data', (data) => console.error(`pg_dump stderr: ${data}`));
  dump.on('error', (err) => {
    console.error('pg_dump spawn error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Backup failed' });
  });
  dump.on('close', (code) => {
    if (code !== 0 && !res.headersSent) res.status(500).json({ error: 'Backup process failed' });
  });
});

// --- JSON DATA EXPORT BACKUP ---
app.get('/api/backup/json-export', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const [users, divisions, workers, purchaseOrders, poItems, purchases, sales, attendance, payments, approvals, individualStocks, indTransactions] = await Promise.all([
      pool.query('SELECT "id","username","fullName","mobileNumber","role","createdAt" FROM "User" ORDER BY "createdAt"'),
      pool.query('SELECT * FROM "Division" ORDER BY "name"'),
      pool.query('SELECT * FROM "Worker" ORDER BY "fullName" LIMIT 10000'),
      pool.query('SELECT * FROM "PurchaseOrder" ORDER BY "date" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "PurchaseOrderItem" ORDER BY "id" LIMIT 50000'),
      pool.query('SELECT * FROM "Purchase" ORDER BY "date" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "Sale" ORDER BY "invoiceDate" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "Attendance" ORDER BY "date" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "MonthlyPayment" ORDER BY "year" DESC, "month" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "ApprovalRequest" ORDER BY "createdAt" DESC LIMIT 10000'),
      pool.query('SELECT * FROM "IndividualStock" ORDER BY "createdAt" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "IndividualStockTransaction" ORDER BY "date" DESC LIMIT 50000')
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      softwareName: 'Sri Krishna Constructions ERP',
      version: '1.0.0',
      data: {
        users: users.rows,
        divisions: divisions.rows,
        workers: workers.rows,
        purchaseOrders: purchaseOrders.rows,
        purchaseOrderItems: poItems.rows,
        purchases: purchases.rows,
        sales: sales.rows,
        attendance: attendance.rows,
        monthlyPayments: payments.rows,
        approvalRequests: approvals.rows,
        individualStocks: individualStocks.rows,
        individualStockTransactions: indTransactions.rows
      },
      recordCounts: {
        users: users.rows.length,
        divisions: divisions.rows.length,
        workers: workers.rows.length,
        purchaseOrders: purchaseOrders.rows.length,
        purchaseOrderItems: poItems.rows.length,
        purchases: purchases.rows.length,
        sales: sales.rows.length,
        attendance: attendance.rows.length,
        monthlyPayments: payments.rows.length,
        approvalRequests: approvals.rows.length,
        individualStocks: individualStocks.rows.length,
        individualStockTransactions: indTransactions.rows.length
      }
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="sri_krishna_backup_${timestamp}.json"`);
    res.json(backup);
  } catch (err) {
    console.error('JSON export error:', err.message);
    res.status(500).json({ error: 'Failed to generate JSON export backup' });
  }
});

// SPA Fallback Route for React App on Port 5000
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// START SERVER AND RUN AUTO MIGRATIONS & SEEDING
const server = app.listen(PORT, async () => {
  console.log(`🚀 IAC Stocks Server running on port ${PORT}`);
  try {
    // 1. Automatically create all PostgreSQL tables via raw SQL if they do not exist
    await initializeDatabaseTables();

    // 2. Run seed baseline data to ensure default owner exists
    await seedBaselineData();
    console.log('✅ Auto startup database seeding completed!');
  } catch (err) {
    console.error('Database startup log:', err.message);
  }
});

const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    await pool.end();
    console.log('Database pool closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

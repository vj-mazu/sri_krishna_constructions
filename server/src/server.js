import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { execSync } from 'child_process';
import { seedBaselineData } from './seed.js';
import { initializeDatabaseTables } from './init-db.js';
import { pool } from './db.js';
import crypto from 'crypto';

dotenv.config();

import fs from 'fs';
// Synchronous logo extraction from Excel
try {
  const excelLogoPath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
  if (fs.existsSync(excelLogoPath)) {
    const wb = new ExcelJS.Workbook();
    wb.xlsx.readFile(excelLogoPath).then(() => {
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
        console.log('✅ Extracted HD SKC Logo from Excel successfully!');
      }
    }).catch(e => console.error('Logo read error:', e.message));
  }
} catch (err) {
  console.error('Logo extraction setup error:', err.message);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
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

// Serve extracted HD SKC Logo directly from Excel file
app.get('/api/logo/skc-logo', authenticateToken, async (req, res) => {
  try {
    const filePath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Excel file not found' });
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    let logoBuffer = null;
    let logoExt = 'png';

    if (workbook.media && workbook.media.length > 0) {
      const media = workbook.media[0];
      logoBuffer = media.buffer;
      logoExt = media.extension || 'png';
    }

    if (!logoBuffer) {
      workbook.eachSheet((worksheet) => {
        const images = worksheet.getImages();
        if (images && images.length > 0) {
          const img = images[0];
          const media = workbook.media.find(m => m.index === img.imageId || m.name === img.imageId);
          if (media) {
            logoBuffer = media.buffer;
            logoExt = media.extension || 'png';
          }
        }
      });
    }

    if (logoBuffer) {
      res.setHeader('Content-Type', `image/${logoExt}`);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(logoBuffer);
    } else {
      return res.status(404).json({ error: 'No image found inside Excel' });
    }
  } catch (err) {
    console.error('Error serving SKC logo from Excel:', err.message);
    res.status(500).json({ error: 'Failed to serve logo' });
  }
});

// Serve extracted HD SKC Logo as Base64 JSON
app.get('/api/logo/base64', authenticateToken, async (req, res) => {
  try {
    const filePath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Excel file not found' });
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    let logoBuffer = null;
    let logoExt = 'png';

    if (workbook.media && workbook.media.length > 0) {
      const media = workbook.media[0];
      logoBuffer = media.buffer;
      logoExt = media.extension || 'png';
    }

    if (logoBuffer) {
      const base64Data = `data:image/${logoExt};base64,${Buffer.from(logoBuffer).toString('base64')}`;
      return res.json({ success: true, base64: base64Data });
    } else {
      return res.status(404).json({ error: 'No image in Excel' });
    }
  } catch (err) {
    console.error('Base64 logo error:', err.message);
    res.status(500).json({ error: 'Failed to serve base64 logo' });
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

    // 2. Check password: match via bcrypt OR plain text fallback
    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(cleanPassword, user.password);
    } catch (e) {
      validPassword = false;
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '24h' }
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, fullName: true, mobileNumber: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user session' });
  }
});

// --- DASHBOARD DAILY STATS API (TODAY'S PURCHASES, SALES & ATTENDANCE) ---
app.get('/api/dashboard/daily-stats', authenticateToken, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // 1. Today's Purchases (Inward)
    const todayPurchases = await pool.query(`
      SELECT 
        COALESCE(SUM(qty), 0)::float as "totalQty",
        COALESCE(SUM("totalAmount"), 0)::float as "totalAmount",
        COUNT(*)::int as "count"
      FROM "Purchase"
      WHERE "date" >= $1 AND "date" <= $2
    `, [todayStart, todayEnd]);

    // 2. Today's Sales (Dispatched)
    const todaySales = await pool.query(`
      SELECT 
        COALESCE(SUM(qty), 0)::float as "totalQty",
        COALESCE(SUM("totalAmount"), 0)::float as "totalAmount",
        COUNT(*)::int as "count"
      FROM "Sale"
      WHERE "invoiceDate" >= $1 AND "invoiceDate" <= $2
    `, [todayStart, todayEnd]);

    // 3. Today's Attendance (supporting both overtimeHours and otHours column naming)
    const todayAttendance = await pool.query(`
      SELECT 
        COUNT(*)::int as "totalMarked",
        COUNT(*) FILTER (WHERE status = 'PRESENT')::int as "presentCount",
        COUNT(*) FILTER (WHERE status = 'ABSENT')::int as "absentCount",
        COUNT(*) FILTER (WHERE status = 'HALF_DAY')::int as "halfDayCount",
        COALESCE(SUM("overtimeHours"), 0)::float as "totalOtHours"
      FROM "Attendance"
      WHERE "date" >= $1 AND "date" <= $2
    `, [todayStart, todayEnd]);

    // 4. Total Workers Registered
    const totalWorkersRes = await pool.query(`SELECT COUNT(*)::int as count FROM "Worker"`);

    res.json({
      todayPurchases: todayPurchases.rows[0] || { totalQty: 0, totalAmount: 0, count: 0 },
      todaySales: todaySales.rows[0] || { totalQty: 0, totalAmount: 0, count: 0 },
      todayAttendance: todayAttendance.rows[0] || { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, totalOtHours: 0 },
      totalWorkers: totalWorkersRes.rows[0]?.count || 0
    });
  } catch (err) {
    console.error('Error fetching dashboard daily stats:', err);
    res.status(200).json({
      todayPurchases: { totalQty: 0, totalAmount: 0, count: 0 },
      todaySales: { totalQty: 0, totalAmount: 0, count: 0 },
      todayAttendance: { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, totalOtHours: 0 },
      totalWorkers: 0
    });
  }
});

// --- HIGH PERFORMANCE STOCKS CURSOR API (<100ms) ---
app.get('/api/stocks/category/:category', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  try {
    const { category } = req.params;
    const { limit = 100, cursor, search, stockStatus } = req.query;

    const limitNum = parseInt(limit, 10);
    const where = { category };

    if (search) {
      where.OR = [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
        { specifications: { contains: search, mode: 'insensitive' } },
        { partNo: { contains: search, mode: 'insensitive' } },
        { hsnCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (stockStatus === 'LOW') {
      where.currentStock = { lte: 10 };
    } else if (stockStatus === 'OUT') {
      where.currentStock = 0;
    }

    const queryOptions = {
      where,
      take: limitNum + 1,
      orderBy: { itemCode: 'asc' },
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const items = await prisma.item.findMany(queryOptions);
    const totalCount = await prisma.item.count({ where });

    let nextCursor = null;
    if (items.length > limitNum) {
      const nextItem = items.pop();
      nextCursor = nextItem.id;
    }

    const responseTimeMs = Date.now() - startTime;

    res.json({
      items,
      nextCursor,
      totalCount,
      responseTimeMs,
    });
  } catch (err) {
    console.error('Fetch stocks error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// --- ADD NEW ITEM TO CATEGORY ---
app.post('/api/stocks/item', authenticateToken, async (req, res) => {
  try {
    const {
      category,
      itemCode,
      itemName,
      partNo,
      specifications,
      unit,
      brandOffered,
      gstPercentage,
      hsnCode,
      biddersCompliance,
      basicRateRs,
      basicRateRsAlt,
      skcRate1,
      skcRate2,
      diffPercentage,
      baseQty,
      targetQty,
      initialStock = 0,
    } = req.body;

    if (!category || !itemCode || !itemName) {
      return res.status(400).json({ error: 'Category, Item Code, and Item Name are required' });
    }

    const existing = await prisma.item.findUnique({
      where: { category_itemCode: { category, itemCode } },
    });

    if (existing) {
      return res.status(400).json({ error: `Item Code ${itemCode} already exists under ${category}` });
    }

    const newItem = await prisma.item.create({
      data: {
        category,
        itemCode,
        itemName,
        partNo,
        specifications,
        unit: unit || 'NO',
        brandOffered,
        gstPercentage: gstPercentage ? parseFloat(gstPercentage) : null,
        hsnCode,
        biddersCompliance,
        basicRateRs: basicRateRs ? parseFloat(basicRateRs) : null,
        basicRateRsAlt: basicRateRsAlt ? parseFloat(basicRateRsAlt) : null,
        skcRate1: skcRate1 ? parseFloat(skcRate1) : null,
        skcRate2: skcRate2 ? parseFloat(skcRate2) : null,
        diffPercentage: diffPercentage ? parseFloat(diffPercentage) : null,
        baseQty: baseQty ? parseInt(baseQty, 10) : 0,
        targetQty: targetQty ? parseInt(targetQty, 10) : 0,
        currentStock: parseInt(initialStock, 10) || 0,
      },
    });

    // Record initial stock movement if > 0
    if (initialStock > 0) {
      await prisma.stockMovement.create({
        data: {
          itemId: newItem.id,
          movementType: 'INWARD',
          quantity: parseInt(initialStock, 10),
          previousStock: 0,
          newStock: parseInt(initialStock, 10),
          userId: req.user.id,
          remarks: 'Initial stock creation',
        },
      });
    }

    res.status(201).json({ item: newItem });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// --- STOCK MOVEMENT (INWARD + / SALE - WITH ACCURATE ERROR VALIDATION) ---
app.post('/api/stocks/movement', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      category,
      itemCode,
      movementType,
      quantity,
      invoiceRefNo,
      remarks,
      unitPrice,
      itemName,
      partNo,
      specifications,
      unit,
      brandOffered,
      gstPercentage,
      hsnCode,
      biddersCompliance,
      basicRateRs,
      basicRateRsAlt,
      skcRate1,
      skcRate2,
      diffPercentage,
      baseQty,
      targetQty,
      movementDate
    } = req.body;
    const qty = parseInt(quantity, 10);

    if (!category || !itemCode || !movementType || !qty || qty <= 0) {
      client.release();
      return res.status(400).json({ error: 'Valid Category, Item Code, Movement Type, and positive Quantity are required' });
    }

    await client.query('BEGIN');

    let { rows: itemRows } = await client.query(
      `SELECT * FROM "Item" WHERE category = $1 AND "itemCode" = $2 FOR UPDATE`,
      [category, itemCode]
    );

    let item = itemRows[0];

    if (!item) {
      if (movementType === 'SALE') {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: `⚠️ Item Code '${itemCode}' not found in category '${category}'. Sale cannot be performed!` });
      }

      // Automatically create item for INWARD
      const createRes = await client.query(
        `INSERT INTO "Item" ("id", "category", "itemCode", "itemName", "partNo", "specifications", "unit", "brandOffered", "gstPercentage", "hsnCode", "biddersCompliance", "basicRateRs", "basicRateRsAlt", "skcRate1", "skcRate2", "diffPercentage", "baseQty", "targetQty", "currentStock", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 0, NOW(), NOW())
         RETURNING *`,
        [
          category, itemCode, itemName || `Item ${itemCode}`, partNo || null, specifications || null, unit || 'NO', brandOffered || null,
          gstPercentage ? parseFloat(gstPercentage) : null, hsnCode || null, biddersCompliance || null, basicRateRs ? parseFloat(basicRateRs) : null,
          basicRateRsAlt ? parseFloat(basicRateRsAlt) : null, skcRate1 ? parseFloat(skcRate1) : null, skcRate2 ? parseFloat(skcRate2) : null,
          diffPercentage ? parseFloat(diffPercentage) : null, baseQty ? parseInt(baseQty, 10) : 1, targetQty ? parseInt(targetQty, 10) : 0
        ]
      );
      item = createRes.rows[0];
    }

    // ACCURATE SALE VALIDATION GUARD
    if (movementType === 'SALE') {
      if (item.currentStock <= 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          error: `⚠️ INSUFFICIENT STOCK! Item '${item.itemCode}' (${item.itemName}) has ZERO (0) stock available. Sale cannot be performed!`,
          availableStock: item.currentStock,
          requestedQty: qty,
        });
      }

      if (qty > item.currentStock) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          error: `⚠️ INSUFFICIENT STOCK! Available stock for '${item.itemCode}' is ${item.currentStock} ${item.unit}. You requested ${qty}. Sale exceeds stock limit!`,
          availableStock: item.currentStock,
          requestedQty: qty,
        });
      }
    }

    const previousStock = item.currentStock;
    const newStock = movementType === 'INWARD' ? previousStock + qty : previousStock - qty;

    // Build update parameters for Item
    let updateSql = `UPDATE "Item" SET "currentStock" = $1, "updatedAt" = NOW()`;
    let updateParams = [newStock];
    let paramIndex = 2;

    if (movementType === 'INWARD') {
      if (itemName) { updateSql += `, "itemName" = $${paramIndex++}`; updateParams.push(itemName); }
      if (partNo) { updateSql += `, "partNo" = $${paramIndex++}`; updateParams.push(partNo); }
      if (specifications) { updateSql += `, "specifications" = $${paramIndex++}`; updateParams.push(specifications); }
      if (unit) { updateSql += `, "unit" = $${paramIndex++}`; updateParams.push(unit); }
      if (brandOffered) { updateSql += `, "brandOffered" = $${paramIndex++}`; updateParams.push(brandOffered); }
      if (gstPercentage !== undefined) { updateSql += `, "gstPercentage" = $${paramIndex++}`; updateParams.push(gstPercentage ? parseFloat(gstPercentage) : null); }
      if (hsnCode) { updateSql += `, "hsnCode" = $${paramIndex++}`; updateParams.push(hsnCode); }
      if (biddersCompliance) { updateSql += `, "biddersCompliance" = $${paramIndex++}`; updateParams.push(biddersCompliance); }
      if (basicRateRs !== undefined) { updateSql += `, "basicRateRs" = $${paramIndex++}`; updateParams.push(basicRateRs ? parseFloat(basicRateRs) : null); }
      if (basicRateRsAlt !== undefined) { updateSql += `, "basicRateRsAlt" = $${paramIndex++}`; updateParams.push(basicRateRsAlt ? parseFloat(basicRateRsAlt) : null); }
      if (skcRate1 !== undefined) { updateSql += `, "skcRate1" = $${paramIndex++}`; updateParams.push(skcRate1 ? parseFloat(skcRate1) : null); }
      if (skcRate2 !== undefined) { updateSql += `, "skcRate2" = $${paramIndex++}`; updateParams.push(skcRate2 ? parseFloat(skcRate2) : null); }
      if (diffPercentage !== undefined) { updateSql += `, "diffPercentage" = $${paramIndex++}`; updateParams.push(diffPercentage ? parseFloat(diffPercentage) : null); }
      if (baseQty !== undefined) { updateSql += `, "baseQty" = $${paramIndex++}`; updateParams.push(baseQty ? parseInt(baseQty, 10) : 0); }
    }

    updateSql += ` WHERE "id" = $${paramIndex} RETURNING *`;
    updateParams.push(item.id);

    const { rows: updatedItems } = await client.query(updateSql, updateParams);
    const updatedItem = updatedItems[0];

    const invRef = invoiceRefNo || (movementType === 'SALE' ? `SKC/${new Date().getFullYear()}/${Date.now()}` : null);
    const mDate = movementDate ? new Date(movementDate) : new Date();

    const { rows: movementRows } = await client.query(
      `INSERT INTO "StockMovement" ("id", "itemId", "movementType", "quantity", "previousStock", "newStock", "unitPrice", "invoiceRefNo", "remarks", "movementDate", "userId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [item.id, movementType, qty, previousStock, newStock, unitPrice ? parseFloat(unitPrice) : null, invRef, remarks, mDate, req.user.id]
    );

    await client.query('COMMIT');
    client.release();

    res.json({
      message: `Stock successfully updated for ${itemCode}`,
      item: updatedItem,
      movement,
    });
  } catch (err) {
    console.error('Stock movement error:', err);
    res.status(500).json({ error: 'Failed to process stock movement' });
  }
});

// --- CONSOLIDATED STOCK LEDGER API ---
app.get('/api/stocks/ledger', authenticateToken, async (req, res) => {
  try {
    const { search, category, movementType, dateFrom, dateTo, month, cursor, limit = 50 } = req.query;

    const where = {};

    if (movementType) where.movementType = movementType;

    if (category) {
      where.item = { category };
    }

    if (search) {
      where.OR = [
        { invoiceRefNo: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        { item: { itemCode: { contains: search, mode: 'insensitive' } } },
        { item: { itemName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (month) {
      const monthStart = new Date(`${month}-01T00:00:00.000Z`);
      const monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
      where.movementDate = { gte: monthStart, lt: monthEnd };
    }

    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const queryOptions = {
      where,
      take: limitNum + 1,
      orderBy: [{ movementDate: 'desc' }, { id: 'desc' }],
      include: {
        item: { select: { itemCode: true, itemName: true, category: true, unit: true } },
        user: { select: { username: true, fullName: true, role: true } },
      },
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const movements = await prisma.stockMovement.findMany(queryOptions);
    let nextCursor = null;
    if (movements.length > limitNum) nextCursor = movements.pop().id;

    res.json({ movements, nextCursor, pageSize: limitNum });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock ledger history' });
  }
});

// --- PO AND INVENTORY APIS ---

// --- PO AND INVENTORY APIS (DIRECT POSTGRESQL LAYER) ---

// POST /api/purchase-orders - Create PO (Owner/Manager only)
app.post('/api/purchase-orders', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { poNumber, date, divisionId, poAmount } = req.body;
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
      `INSERT INTO "PurchaseOrder" ("id", "poNumber", "date", "divisionId", "poAmount", "addedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [poNumber.trim(), new Date(date), divisionId, parseFloat(poAmount) || 0, req.user.id]
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
    const { cursor, limit = 20, search, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [];
    let params = [];

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

    params.push(limitNum + 1);
    const querySql = `
      SELECT 
        po.*,
        json_build_object('name', d.name) as division,
        json_build_object('fullName', u."fullName") as "addedBy",
        json_build_object('items', COALESCE((SELECT COUNT(*)::int FROM "PurchaseOrderItem" poi WHERE poi."purchaseOrderId" = po.id), 0)) as "_count"
      FROM "PurchaseOrder" po
      LEFT JOIN "Division" d ON po."divisionId" = d.id
      LEFT JOIN "User" u ON po."addedById" = u.id
      ${whereSql}
      ORDER BY po."date" DESC, po."createdAt" DESC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(querySql, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      nextCursor = rows.pop().id;
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
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalSoldQty",
        COALESCE((SELECT SUM(s."totalAmount") FROM "Sale" s WHERE s."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalSalesValue",
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

    params.push(limitNum + 1);
    const querySql = `
      SELECT 
        poi.*,
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as "purchasedQty",
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)::float as "soldQty"
      FROM "PurchaseOrderItem" poi
      ${whereSql}
      ORDER BY poi."createdAt" ASC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(querySql, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      nextCursor = rows.pop().id;
    }

    const itemsWithAgg = rows.map(item => ({
      ...item,
      remainingQty: (item.qty || 0) - item.purchasedQty,
      availableForSale: item.purchasedQty - item.soldQty
    }));

    res.json({ items: itemsWithAgg, nextCursor, totalCount });
  } catch (err) {
    console.error('Error fetching PO items:', err);
    res.status(500).json({ error: 'Failed to list PO items' });
  }
});

// GET /api/purchase-orders/:id/purchases - Inward records
app.get('/api/purchase-orders/:id/purchases', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, partNumber, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    if (partNumber) {
      params.push(`%${partNumber}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
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

    params.push(limitNum + 1);
    const querySql = `
      SELECT 
        pur.*,
        json_build_object('id', poi.id, 'partNumber', poi."partNumber", 'itemName', poi."itemName", 'kpclCode', poi."kpclCode") as "purchaseOrderItem",
        json_build_object('fullName', u."fullName") as "addedBy"
      FROM "Purchase" pur
      JOIN "PurchaseOrderItem" poi ON pur."purchaseOrderItemId" = poi.id
      LEFT JOIN "User" u ON pur."addedById" = u.id
      ${whereSql}
      ORDER BY pur."date" DESC, pur."createdAt" DESC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(querySql, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      nextCursor = rows.pop().id;
    }

    res.json({ purchases: rows, nextCursor, totalCount });
  } catch (err) {
    console.error('Error listing purchases:', err);
    res.status(500).json({ error: 'Failed to list purchases' });
  }
});

// GET /api/purchase-orders/:id/sales - Outward sale records
app.get('/api/purchase-orders/:id/sales', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, invoiceNumber, partNumber, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    if (invoiceNumber) {
      params.push(`%${invoiceNumber}%`);
      whereClauses.push(`s."invoiceNumber" ILIKE $${params.length}`);
    }
    if (partNumber) {
      params.push(`%${partNumber}%`);
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

    params.push(limitNum + 1);
    const querySql = `
      SELECT 
        s.*,
        json_build_object('id', poi.id, 'partNumber', poi."partNumber", 'itemName', poi."itemName", 'kpclCode', poi."kpclCode") as "purchaseOrderItem",
        json_build_object('fullName', u."fullName") as "addedBy"
      FROM "Sale" s
      JOIN "PurchaseOrderItem" poi ON s."purchaseOrderItemId" = poi.id
      LEFT JOIN "User" u ON s."addedById" = u.id
      ${whereSql}
      ORDER BY s."invoiceDate" DESC, s."createdAt" DESC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(querySql, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      nextCursor = rows.pop().id;
    }

    res.json({ sales: rows, nextCursor, totalCount });
  } catch (err) {
    console.error('Error listing sales:', err);
    res.status(500).json({ error: 'Failed to list sales' });
  }
});

// PUT /api/purchase-orders/:id - Update PO header
app.put('/api/purchase-orders/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { poNumber, date, divisionId, poAmount } = req.body;
    const { rows } = await pool.query(
      `UPDATE "PurchaseOrder"
       SET "poNumber" = COALESCE($1, "poNumber"),
           "date" = COALESCE($2, "date"),
           "divisionId" = COALESCE($3, "divisionId"),
           "poAmount" = COALESCE($4, "poAmount"),
           "updatedAt" = NOW()
       WHERE id = $5
       RETURNING *`,
      [poNumber?.trim(), date ? new Date(date) : null, divisionId || null, poAmount !== undefined ? parseFloat(poAmount) : null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PO not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating PO:', err);
    res.status(500).json({ error: 'Failed to update PO' });
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
      return res.status(400).json({ error: 'Part number must be unique across POs' });
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
    res.status(500).json({ error: 'Failed to update PO item' });
  }
});

// DELETE /api/purchase-order-items/:id - Delete item
app.delete('/api/purchase-order-items/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const checkRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM "Purchase" WHERE "purchaseOrderItemId" = $1) as purchases,
        (SELECT COUNT(*)::int FROM "Sale" WHERE "purchaseOrderItemId" = $1) as sales
    `, [req.params.id]);

    if (checkRes.rows[0]?.purchases > 0 || checkRes.rows[0]?.sales > 0) {
      return res.status(400).json({ error: 'Cannot delete item with existing purchases or sales' });
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

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    await client.query('BEGIN');

    // Row-level lock on item to prevent race conditions during high concurrency
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
    if (qty > (item.qty - item.purchased)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Quantity (${qty}) exceeds remaining order balance (${item.qty - item.purchased})` });
    }

    const { rows } = await client.query(
      `INSERT INTO "Purchase" (
        "id", "purchaseOrderItemId", "date", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "totalAmount", "addedById", "createdAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, NOW()
      ) RETURNING *`,
      [
        d.purchaseOrderItemId, new Date(d.date), qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount, req.user.id
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

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    const { rows } = await pool.query(
      `UPDATE "Purchase"
       SET "qty" = $1, "rate" = $2, "basicAmount" = $3,
           "cgstPercent" = $4, "sgstPercent" = $5, "igstPercent" = $6,
           "cgstAmount" = $7, "sgstAmount" = $8, "igstAmount" = $9,
           "totalAmount" = $10, "date" = $11
       WHERE id = $12
       RETURNING *`,
      [
        qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent,
        cgstAmount, sgstAmount, igstAmount,
        totalAmount, d.date ? new Date(d.date) : new Date(),
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

// POST /api/sales - Outward sale record with ACID transactional safety
app.post('/api/sales', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    await client.query('BEGIN');

    // Row-level lock on item to prevent overselling race conditions
    const stockRes = await client.query(`
      SELECT 
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as purchased,
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)::float as sold
      FROM "PurchaseOrderItem" poi
      WHERE poi.id = $1
      FOR UPDATE
    `, [d.purchaseOrderItemId]);

    const purchased = stockRes.rows[0]?.purchased || 0;
    const sold = stockRes.rows[0]?.sold || 0;
    const available = purchased - sold;
    if (qty > available) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Sale quantity (${qty}) exceeds available stock (${available})` });
    }

    const { rows } = await client.query(
      `INSERT INTO "Sale" (
        "id", "purchaseOrderItemId", "invoiceNumber", "invoiceDate", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "totalAmount", "addedById", "createdAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, NOW()
      ) RETURNING *`,
      [
        d.purchaseOrderItemId, d.invoiceNumber, new Date(d.invoiceDate), qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount, req.user.id
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording sale:', err);
    res.status(500).json({ error: 'Failed to record sale' });
  } finally {
    client.release();
  }
});

// PUT /api/sales/:id - Update sale
app.put('/api/sales/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    const { rows } = await pool.query(
      `UPDATE "Sale"
       SET "invoiceNumber" = COALESCE($1, "invoiceNumber"),
           "invoiceDate" = $2, "qty" = $3, "rate" = $4, "basicAmount" = $5,
           "cgstPercent" = $6, "sgstPercent" = $7, "igstPercent" = $8,
           "cgstAmount" = $9, "sgstAmount" = $10, "igstAmount" = $11,
           "totalAmount" = $12
       WHERE id = $13
       RETURNING *`,
      [
        d.invoiceNumber, d.invoiceDate ? new Date(d.invoiceDate) : new Date(), qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount, id
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Sale record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating sale:', err);
    res.status(500).json({ error: 'Failed to update sale record' });
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
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) > 0`);
    } else if (stockStatus === 'OUT_OF_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) <= 0`);
    } else if (stockStatus === 'LOW_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) > 0 AND (COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) <= 10`);
    } else if (stockStatus === 'PENDING_INWARD') {
      whereClauses.push(`COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) < poi.qty`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

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
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)::float as "totalSold"
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

// --- EDIT / DELETE APPROVAL WORKFLOWS ---
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
      WHERE a.status = 'PENDING'
      ORDER BY a."createdAt" DESC
    `);

    res.json({ approvals: rows });
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

app.patch('/api/approvals/:id/action', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
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

    if (status === 'APPROVED' && approval.type === 'EDIT_ATTENDANCE') {
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
        const markedByIds = attendanceData.map(r => approval.requestedById);

        await pool.query(
          `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "otHours", "dailyWageOverride", "markedById", "createdAt", "updatedAt")
           SELECT gen_random_uuid()::text, * FROM UNNEST($1::text[], $2::timestamp[], $3::text[], $4::numeric[], $5::numeric[], $6::text[])
           ON CONFLICT ("workerId", "date")
           DO UPDATE SET "status" = EXCLUDED."status", "otHours" = EXCLUDED."otHours", "dailyWageOverride" = EXCLUDED."dailyWageOverride", "markedById" = EXCLUDED."markedById", "updatedAt" = NOW()`,
          [workerIds, dates, statuses, otHours, dailyWageOverrides, markedByIds]
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

    res.json({ message: `Approval request ${status.toLowerCase()}`, approval: updateRes.rows[0] });
  } catch (err) {
    console.error('Error processing approval decision:', err);
    res.status(500).json({ error: 'Failed to process approval decision' });
  }
});

// --- MASTER USER MANAGEMENT (WITH MANDATORY MOBILE & SMART DELETE) ---
app.get('/api/users', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        mobileNumber: true,
        role: true,
        createdAt: true,
      },
    });

    const userList = users.map((u) => ({
      ...u,
      hasCreatedEntries: false,
    }));

    res.json({ users: userList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const { username, fullName, mobileNumber, password, role } = req.body;

    // MANDATORY MOBILE NUMBER CHECK
    if (!username || !fullName || !mobileNumber || !password || !role) {
      return res.status(400).json({ error: 'All fields (Username, Full Name, Mobile Number, Password, Role) are mandatory!' });
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      return res.status(400).json({ error: 'Mobile number must be a valid 10-digit phone number' });
    }

    if (!['SUPERVISOR', 'MANAGER'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either MANAGER or SUPERVISOR' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: `Username '${username}' is already taken` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        password: hashedPassword,
        role,
      },
      select: { id: true, username: true, fullName: true, mobileNumber: true, role: true, createdAt: true },
    });

    res.status(201).json({ user: newUser });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, fullName, mobileNumber, password, role } = req.body;

    if (req.user.role !== 'OWNER' && req.user.id !== id) {
      return res.status(403).json({ error: 'Only Owner can edit other user accounts' });
    }

    const data = {};
    if (username && username.trim()) {
      const trimmedUser = username.trim();
      const existing = await prisma.user.findFirst({
        where: { username: trimmedUser, NOT: { id } }
      });
      if (existing) {
        return res.status(400).json({ error: `Username '${trimmedUser}' is already taken` });
      }
      data.username = trimmedUser;
    }
    if (fullName) data.fullName = fullName.trim();
    if (mobileNumber) {
      if (!/^\d{10}$/.test(mobileNumber.trim())) {
        return res.status(400).json({ error: 'Mobile number must be a valid 10-digit phone number' });
      }
      data.mobileNumber = mobileNumber.trim();
    }
    if (role) {
      if (req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only Owner can change roles' });
      }
      if (!['SUPERVISOR', 'MANAGER', 'OWNER'].includes(role)) {
        return res.status(400).json({ error: 'Role must be OWNER, MANAGER, or SUPERVISOR' });
      }
      data.role = role;
    }
    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, fullName: true, mobileNumber: true, role: true }
    });

    res.json({ message: 'User updated successfully', user: updatedUser });
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

// --- WORKER DIVISIONS API ---
app.get('/api/divisions', authenticateToken, async (req, res) => {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { workers: true } } }
    });
    res.json({ divisions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

app.post('/api/divisions', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const existing = await prisma.division.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'Division name already exists' });
    }
    const division = await prisma.division.create({
      data: { name: name.trim() }
    });
    res.status(201).json({ division });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create division' });
  }
});

app.put('/api/divisions/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const existing = await prisma.division.findFirst({
      where: { name: name.trim(), NOT: { id } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Division name already exists' });
    }
    const division = await prisma.division.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { workers: true } } }
    });
    res.json({ division, message: 'Division updated successfully' });
  } catch (err) {
    console.error('Update division error:', err);
    res.status(500).json({ error: 'Failed to update division' });
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
    const { divisionId, limit = 50, cursor } = req.query;
    const limitNum = parseInt(limit, 10) || 50;

    let query = `
      SELECT w."id", w."workerId", w."fullName", w."fatherName", w."designation", w."mobileNumber",
             w."dailyWage", COALESCE(w."dailyAllowance", 0) as "dailyAllowance",
             COALESCE(w."advanceTaken", w."advanceBalance", 0) as "advanceTaken",
             COALESCE(NULLIF(w."advanceBalance", 0), w."advanceTaken", 0) as "advanceBalance",
             COALESCE(w."otAllowance", 0) as "otAllowance",
             w."otHourlyRate", w."divisionId",
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

    if (cursor) {
      params.push(cursor);
      whereClauses.push(`w."id" > $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY w."id" ASC`;
    
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

    const { workerId, fullName, fatherName, designation, mobileNumber, dailyWage, dailyAllowance, advanceTaken, advanceBalance, otAllowance, otHourlyRate, divisionId, pfNumber, esiNumber, uanNumber, bankAccountNo, ifscCode, placeOfWork, natureOfWork } = req.body;
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
    const numAdvTaken = advanceTaken !== undefined && advanceTaken !== '' ? parseFloat(advanceTaken) : (advanceBalance !== undefined && advanceBalance !== '' ? parseFloat(advanceBalance) : 0);
    const numAdvBal = advanceBalance !== undefined && advanceBalance !== '' ? parseFloat(advanceBalance) : numAdvTaken;
    const numOtAllowance = otAllowance !== undefined && otAllowance !== '' ? parseFloat(otAllowance) : 0;
    const numOtRate = otHourlyRate ? parseFloat(otHourlyRate) : numDailyWage / 8;

    const { rows } = await pool.query(
      `INSERT INTO "Worker" ("id", "workerId", "fullName", "fatherName", "designation", "mobileNumber", "dailyWage", "dailyAllowance", "advanceTaken", "advanceBalance", "otAllowance", "otHourlyRate", "divisionId", "pfNumber", "esiNumber", "uanNumber", "bankAccountNo", "ifscCode", "placeOfWork", "natureOfWork", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
       RETURNING *`,
      [
        workerId.trim(),
        fullName.trim(),
        fatherName ? fatherName.trim() : null,
        designation ? designation.trim() : null,
        cleanedPhone,
        numDailyWage,
        numAllowance,
        numAdvTaken,
        numAdvBal,
        numOtAllowance,
        numOtRate,
        divisionId,
        pfNumber ? pfNumber.trim() : null,
        esiNumber ? esiNumber.trim() : null,
        uanNumber ? uanNumber.trim() : null,
        bankAccountNo ? bankAccountNo.trim() : null,
        ifscCode ? ifscCode.trim() : null,
        placeOfWork ? placeOfWork.trim() : null,
        natureOfWork ? natureOfWork.trim() : null
      ]
    );

    const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [divisionId]);
    const worker = { ...rows[0], division: divRows[0] || null };

    res.status(201).json({ worker });
  } catch (err) {
    console.error('Create worker error:', err);
    res.status(500).json({ error: 'Failed to register worker' });
  }
});

app.put('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, fatherName, designation, mobileNumber, dailyWage, dailyAllowance, advanceTaken, advanceBalance, otAllowance, otHourlyRate, divisionId, pfNumber, esiNumber, uanNumber, bankAccountNo, ifscCode, placeOfWork, natureOfWork } = req.body;

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

    if (dailyWage !== undefined || dailyAllowance !== undefined || advanceTaken !== undefined || advanceBalance !== undefined || otAllowance !== undefined || otHourlyRate !== undefined) {
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

    const newFullName = fullName !== undefined ? fullName.trim() : existing[0].fullName;
    const newFatherName = fatherName !== undefined ? (fatherName ? fatherName.trim() : null) : existing[0].fatherName;
    const newDesignation = designation !== undefined ? (designation ? designation.trim() : null) : existing[0].designation;
    const newDivisionId = divisionId || existing[0].divisionId;
    const newDailyWage = dailyWage !== undefined ? parseFloat(dailyWage) : existing[0].dailyWage;
    const newAllowance = dailyAllowance !== undefined ? (parseFloat(dailyAllowance) || 0) : (existing[0].dailyAllowance || 0);
    const newAdvanceTaken = advanceTaken !== undefined ? (parseFloat(advanceTaken) || 0) : (existing[0].advanceTaken || 0);
    const newAdvance = advanceBalance !== undefined ? (parseFloat(advanceBalance) || 0) : (existing[0].advanceBalance || 0);
    const newOtAllowance = otAllowance !== undefined ? (parseFloat(otAllowance) || 0) : (existing[0].otAllowance || 0);
    const newOtRate = otHourlyRate !== undefined ? parseFloat(otHourlyRate) : existing[0].otHourlyRate;
    const newPfNumber = pfNumber !== undefined ? (pfNumber ? pfNumber.trim() : null) : existing[0].pfNumber;
    const newEsiNumber = esiNumber !== undefined ? (esiNumber ? esiNumber.trim() : null) : existing[0].esiNumber;
    const newUanNumber = uanNumber !== undefined ? (uanNumber ? uanNumber.trim() : null) : existing[0].uanNumber;
    const newBankAcc = bankAccountNo !== undefined ? (bankAccountNo ? bankAccountNo.trim() : null) : existing[0].bankAccountNo;
    const newIfsc = ifscCode !== undefined ? (ifscCode ? ifscCode.trim() : null) : existing[0].ifscCode;
    const newPlace = placeOfWork !== undefined ? (placeOfWork ? placeOfWork.trim() : null) : existing[0].placeOfWork;
    const newNature = natureOfWork !== undefined ? (natureOfWork ? natureOfWork.trim() : null) : existing[0].natureOfWork;

    const { rows } = await pool.query(
      `UPDATE "Worker"
       SET "fullName" = $1, "fatherName" = $2, "designation" = $3, "mobileNumber" = $4,
           "dailyWage" = $5, "dailyAllowance" = $6, "advanceTaken" = $7, "advanceBalance" = $8, "otAllowance" = $9, "otHourlyRate" = $10, "divisionId" = $11,
           "pfNumber" = $12, "esiNumber" = $13, "uanNumber" = $14, "bankAccountNo" = $15, "ifscCode" = $16, "placeOfWork" = $17, "natureOfWork" = $18,
           "updatedAt" = NOW()
       WHERE "id" = $19
       RETURNING *`,
      [newFullName, newFatherName, newDesignation, cleanedPhone, newDailyWage, newAllowance, newAdvanceTaken, newAdvance, newOtAllowance, newOtRate, newDivisionId, newPfNumber, newEsiNumber, newUanNumber, newBankAcc, newIfsc, newPlace, newNature, id]
    );

    const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [newDivisionId]);
    const worker = { ...rows[0], division: divRows[0] || null };

    res.json({ worker });
  } catch (err) {
    console.error('Update worker error:', err);
    res.status(500).json({ error: 'Failed to update worker registry' });
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

    const { rows: attCheck } = await pool.query(`SELECT COUNT(*)::int as count FROM "Attendance" WHERE "workerId" = $1`, [id]);
    const { rows: payCheck } = await pool.query(`SELECT COUNT(*)::int as count FROM "MonthlyPayment" WHERE "workerId" = $1`, [id]);
    if (attCheck[0]?.count > 0 || payCheck[0]?.count > 0) {
      return res.status(400).json({ error: `Cannot delete worker — has ${attCheck[0].count} attendance records and ${payCheck[0].count} payment records. Archive instead.` });
    }

    await pool.query(`DELETE FROM "Worker" WHERE "id" = $1`, [id]);
    res.json({ message: 'Worker record deleted successfully' });
  } catch (err) {
    console.error('Delete worker error:', err);
    res.status(500).json({ error: 'Failed to delete worker' });
  }
});

// --- DAILY WORKER ATTENDANCE API (DIRECT SQL) ---
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, divisionId } = req.query;
    if (!date || !divisionId) {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) and Division ID are required' });
    }

    const { rows: attendances } = await pool.query(
      `SELECT a."id", a."workerId", a."date", a."status", a."otHours" as "overtimeHours", a."dailyWageOverride", a."notes",
              json_build_object('id', w."id", 'workerId', w."workerId", 'fullName', w."fullName", 'dailyWage', w."dailyWage", 'divisionId', w."divisionId") as "worker"
       FROM "Attendance" a
       JOIN "Worker" w ON a."workerId" = w."id"
       WHERE a."date"::date = $1::date AND w."divisionId" = $2`,
      [date, divisionId]
    );

    res.json({ attendances });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Failed to load attendance records' });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, attendanceData } = req.body; // attendanceData: [{ workerId, status, overtimeHours }]
    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ error: 'Date and valid attendance data are required' });
    }

    const queryDateStr = `${date} 00:00:00`;
    const workerIds = attendanceData.map(r => r.workerId);

    // Check if attendance has already been logged for these workers on this date (Direct SQL)
    const { rows: existingLogs } = await pool.query(
      `SELECT * FROM "Attendance" WHERE "date"::date = $1::date AND "workerId" = ANY($2::text[])`,
      [date, workerIds]
    );

    if (existingLogs.length > 0) {
      // User is editing existing daily attendance
      if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
        const { rows: workers } = await pool.query(
          `SELECT "id", "fullName", "dailyWage" FROM "Worker" WHERE "id" = ANY($1::text[])`,
          [workerIds]
        );

        const diffs = [];
        attendanceData.forEach((record) => {
          const existing = existingLogs.find(el => el.workerId === record.workerId);
          const worker = workers.find(w => w.id === record.workerId);
          if (existing && worker) {
            const statusChanged = existing.status !== record.status;
            const existingOt = parseFloat(existing.otHours) || 0.0;
            const incomingOt = parseFloat(record.overtimeHours) || 0.0;
            const otChanged = Math.abs(existingOt - incomingOt) > 0.01;
            
            const incomingOverride = record.dailyWageOverride ? parseFloat(record.dailyWageOverride) : null;
            const existingOverride = existing.dailyWageOverride ? parseFloat(existing.dailyWageOverride) : null;
            const wageChanged = existingOverride !== incomingOverride;

            if (statusChanged || otChanged || wageChanged) {
              const statusDesc = statusChanged ? `${existing.status} ➔ ${record.status}` : null;
              const otDesc = otChanged ? `OT: ${existingOt}h ➔ ${incomingOt}h` : null;
              const wageDesc = wageChanged ? `Wage: ₹${existingOverride || worker.dailyWage} ➔ ₹${incomingOverride || worker.dailyWage}` : null;
              const parts = [statusDesc, otDesc, wageDesc].filter(Boolean);
              diffs.push(`${worker.fullName} (${parts.join(', ')})`);
            }
          }
        });

        const detailedReason = `Supervisor '${req.user.fullName}' requested to modify attendance for ${date}. Changes: ${diffs.join('; ') || 'No changes.'}`;

        // Supervisors must go through Owner/Manager approval for edits
        const { rows: appRows } = await pool.query(
          `INSERT INTO "ApprovalRequest" ("id", "type", "status", "payload", "reason", "requestedById", "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, 'EDIT_ATTENDANCE', 'PENDING', $1, $2, $3, NOW(), NOW())
           RETURNING *`,
          [JSON.stringify({ date, attendanceData }), detailedReason, req.user.id]
        );
        const approval = appRows[0];
        return res.status(202).json({
          message: '⚠️ Changes detected! Editing previously logged attendance requires approval. Modification request has been submitted to Owner/Manager.',
          requiresApproval: true,
          approval
        });
      }
    }

    if (attendanceData && attendanceData.length > 0) {
      const workerIds = attendanceData.map(r => r.workerId);
      const dates = attendanceData.map(r => date);
      const statuses = attendanceData.map(r => r.status);
      const otHours = attendanceData.map(r => parseFloat(r.overtimeHours) || 0.0);
      const dailyWageOverrides = attendanceData.map(r => r.dailyWageOverride ? parseFloat(r.dailyWageOverride) : null);
      const notes = attendanceData.map(r => r.notes || null);
      const markedByIds = attendanceData.map(r => req.user.id);

      await pool.query(
        `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "otHours", "dailyWageOverride", "notes", "markedById", "createdAt", "updatedAt")
         SELECT gen_random_uuid()::text, * FROM UNNEST($1::text[], $2::timestamp[], $3::text[], $4::numeric[], $5::numeric[], $6::text[], $7::text[])
         ON CONFLICT ("workerId", "date")
         DO UPDATE SET
           "status" = EXCLUDED."status",
           "otHours" = EXCLUDED."otHours",
           "dailyWageOverride" = EXCLUDED."dailyWageOverride",
           "notes" = EXCLUDED."notes",
           "markedById" = EXCLUDED."markedById",
           "updatedAt" = NOW()`,
        [workerIds, dates, statuses, otHours, dailyWageOverrides, notes, markedByIds]
      );
    }

    res.json({ message: 'Attendance records saved successfully!' });
  } catch (err) {
    console.error('Attendance submit error:', err);
    res.status(500).json({ error: 'Failed to record daily attendance' });
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
             COALESCE(w."advanceTaken", w."advanceBalance", 0) as "advanceTaken",
             COALESCE(NULLIF(w."advanceBalance", 0), w."advanceTaken", 0) as "advanceBalance",
             COALESCE(w."otAllowance", 0) as "otAllowance",
             w."otHourlyRate", w."divisionId",
             COALESCE(w."pfNumber", '') as "pfNumber",
             COALESCE(w."esiNumber", '') as "esiNumber",
             COALESCE(w."uanNumber", '') as "uanNumber",
             COALESCE(w."bankAccountNo", '') as "bankAccountNo",
             COALESCE(w."ifscCode", '') as "ifscCode",
             COALESCE(w."placeOfWork", '') as "placeOfWork",
             COALESCE(w."natureOfWork", '') as "natureOfWork",
             d."name" as "divisionName"
      FROM "Worker" w
      JOIN "Division" d ON w."divisionId" = d."id"
    `;
    const workerParams = [];
    if (divisionId) {
      workerQuery += ` WHERE w."divisionId" = $1`;
      workerParams.push(divisionId);
    }
    workerQuery += ` ORDER BY w."fullName" ASC`;

    const { rows: workers } = await pool.query(workerQuery, workerParams);

    // Fetch attendances for this month
    const { rows: attendances } = await pool.query(
      `SELECT a."workerId", a."date", a."status", a."otHours", a."dailyWageOverride", a."divisionId",
              d."name" as "divisionName"
       FROM "Attendance" a
       LEFT JOIN "Division" d ON a."divisionId" = d."id"
       WHERE a."date" >= $1::timestamp AND a."date" <= $2::timestamp`,
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

    const wageReport = workers.map((worker) => {
      const workerAtts = attsByWorker[worker.id] || [];
      let present = 0;
      let absent = 0;
      let half = 0;
      let leave = 0;
      let totalOt = 0;
      const divisionCounts = {};

      workerAtts.forEach((att) => {
        const divName = att.divisionName || worker.divisionName || 'General';

        if (att.status === 'PRESENT') {
          present += 1;
          divisionCounts[divName] = (divisionCounts[divName] || 0) + 1;
        } else if (att.status === 'ABSENT') {
          absent += 1;
        } else if (att.status === 'HALF_DAY') {
          half += 1;
          divisionCounts[divName] = (divisionCounts[divName] || 0) + 0.5;
        } else if (att.status === 'LEAVE') {
          leave += 1;
        }
        totalOt += (parseFloat(att.otHours) || 0.0);
      });

      const workingDays = present + (half * 0.5);
      const dailyWage = parseFloat(worker.dailyWage) || 0;
      const dailyAllowance = parseFloat(worker.dailyAllowance) || 0;
      const advanceTaken = parseFloat(worker.advanceTaken) || 0;
      const advanceBalance = parseFloat(worker.advanceBalance) || 0;

      const wagesAmount = Math.round(workingDays * dailyWage);
      const allowanceAmount = Math.round(workingDays * dailyAllowance);
      const grossPayment = wagesAmount + allowanceAmount;

      const dbPayment = paysByWorker[worker.id];

      // Flexible / Manual deductions (pre-filled from DB if already entered/approved)
      const pfAmount = dbPayment ? (parseFloat(dbPayment.pfAmount) || 0) : 0;
      const esiAmount = dbPayment ? (parseFloat(dbPayment.esiAmount) || 0) : 0;
      const netBaseAmount = grossPayment - pfAmount - esiAmount;

      const otRate = parseFloat(worker.otHourlyRate) || (dailyWage / 8);
      const otPayment = dbPayment && dbPayment.otPayment !== undefined && dbPayment.otPayment !== null 
        ? parseFloat(dbPayment.otPayment) 
        : Math.round(totalOt * otRate);

      const otAllowance = dbPayment && dbPayment.otAllowance !== undefined && dbPayment.otAllowance !== null 
        ? parseFloat(dbPayment.otAllowance) 
        : (parseFloat(worker.otAllowance) || 0);

      const totalPayment = netBaseAmount + otPayment + otAllowance;
      const advanceDeducted = dbPayment ? (parseFloat(dbPayment.advanceDeducted) || 0) : 0;
      const remainingAdvanceBalance = Math.max(0, advanceBalance - advanceDeducted);
      const extraAmount = dbPayment ? (parseFloat(dbPayment.extraAmount) || 0) : 0;
      const finalNetAmount = totalPayment - advanceDeducted + extraAmount;

      return {
        workerId: worker.id,
        empId: worker.workerId,
        fullName: worker.fullName,
        fatherName: worker.fatherName || '-',
        designation: worker.designation || 'Worker',
        mobileNumber: worker.mobileNumber,
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
        dailyAllowance,
        advanceTaken,
        advanceBalance,
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

    res.json({ wages: wageReport });
  } catch (err) {
    console.error('Wages report error:', err);
    res.status(500).json({ error: 'Failed to calculate monthly wages' });
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
      `SELECT a.*, d."name" as "divisionName", u."fullName" as "markedByName"
       FROM "Attendance" a
       LEFT JOIN "Division" d ON a."divisionId" = d."id"
       LEFT JOIN "User" u ON a."markedById" = u."id"
       WHERE a."workerId" = $1 AND a."date" >= $2::timestamp AND a."date" <= $3::timestamp
       ORDER BY a."date" ASC`,
      [workerId, startDate, endDate]
    );

    const logsByDateStr = {};
    logs.forEach(l => {
      const dStr = new Date(l.date).toISOString().split('T')[0];
      logsByDateStr[dStr] = l;
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysList = [];
    const divisionSummary = {};
    let totalPresent = 0;
    let totalHalfDay = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalOtHours = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const curDate = new Date(y, m - 1, day);
      const curDateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayName = dayNames[curDate.getDay()];
      const isSunday = curDate.getDay() === 0;

      const log = logsByDateStr[curDateStr];
      const status = log ? log.status : (isSunday ? 'HOLIDAY' : 'NOT_MARKED');
      const otHours = log ? (parseFloat(log.otHours) || 0) : 0;
      const divName = log?.divisionName || worker.divisionName || 'General';

      if (log) {
        if (log.status === 'PRESENT') {
          totalPresent += 1;
          divisionSummary[divName] = (divisionSummary[divName] || 0) + 1;
        } else if (log.status === 'HALF_DAY') {
          totalHalfDay += 1;
          divisionSummary[divName] = (divisionSummary[divName] || 0) + 0.5;
        } else if (log.status === 'ABSENT') {
          totalAbsent += 1;
        } else if (log.status === 'LEAVE') {
          totalLeave += 1;
        }
        totalOtHours += otHours;
      }

      daysList.push({
        dayNumber: day,
        dateStr: curDateStr,
        dayName,
        isSunday,
        status,
        divisionName: divName,
        overtimeHours: otHours,
        notes: log?.notes || null,
        markedBy: log?.markedByName || null
      });
    }

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
        totalAbsent,
        totalLeave,
        totalWorkingDays: totalPresent + (totalHalfDay * 0.5),
        totalOtHours
      },
      days: daysList
    });
  } catch (err) {
    console.error('Worker month attendance drilldown error:', err);
    res.status(500).json({ error: 'Failed to fetch register book drilldown' });
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

      const { rows: existingRows } = await client.query(`SELECT "advanceDeducted" FROM "MonthlyPayment" WHERE "workerId" = $1 AND "month" = $2 AND "year" = $3`, [workerId, m, y]);
      const prevAdvanceDeducted = existingRows.length > 0 ? (parseFloat(existingRows[0].advanceDeducted) || 0) : 0;

      const { rows } = await client.query(
        `INSERT INTO "MonthlyPayment" (
           "id", "workerId", "month", "year", "presentDays", "absentDays", "halfDays", "leaveDays", "totalOtHours",
           "wagesAmount", "allowanceAmount", "grossPayment", "pfAmount", "esiAmount", "netBaseAmount",
           "otPayment", "otAllowance", "totalPayment", "advanceDeducted", "extraAmount", "finalNetAmount",
           "calculatedAmount", "divisionSummary", "status", "approvedById", "createdAt", "updatedAt"
         )
         VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20,
           $21, $22, 'APPROVED', $23, NOW(), NOW()
         )
         ON CONFLICT ("workerId", "month", "year")
         DO UPDATE SET
           "presentDays" = EXCLUDED."presentDays",
           "absentDays" = EXCLUDED."absentDays",
           "halfDays" = EXCLUDED."halfDays",
           "leaveDays" = EXCLUDED."leaveDays",
           "totalOtHours" = EXCLUDED."totalOtHours",
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
          wAmt, allAmt, gross, pf, esi, netBase,
          otPay, otAll, totPay, adv, extra, finalNet,
          finalNet, divisionSummary ? JSON.stringify(divisionSummary) : null, req.user.id
        ]
      );

      if (adv > 0 || prevAdvanceDeducted > 0) {
        await client.query(
          `UPDATE "Worker"
           SET "advanceBalance" = GREATEST(0, COALESCE(NULLIF("advanceBalance", 0), "advanceTaken", 0) + $1 - $2), "updatedAt" = NOW()
           WHERE "id" = $3`,
          [prevAdvanceDeducted, adv, workerId]
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
    res.status(500).json({ error: 'Failed to approve wage payout' });
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
app.post('/api/backup/database', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'DATABASE_URL not configured' });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `sri_krishna_backup_${timestamp}.sql`;
    
    const dumpOutput = execSync(`pg_dump "${dbUrl}" --no-owner --no-privileges`, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024,
      timeout: 120000
    });

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(dumpOutput);
  } catch (err) {
    console.error('Database backup error:', err.message);
    res.status(500).json({ error: 'Failed to generate database backup. Ensure pg_dump is installed and DATABASE_URL is correct.' });
  }
});

// --- JSON DATA EXPORT BACKUP ---
app.get('/api/backup/json-export', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const [users, divisions, workers, purchaseOrders, poItems, purchases, sales, attendance, payments, approvals] = await Promise.all([
      pool.query('SELECT "id","username","fullName","mobileNumber","role","createdAt" FROM "User" ORDER BY "createdAt"'),
      pool.query('SELECT * FROM "Division" ORDER BY "name"'),
      pool.query('SELECT * FROM "Worker" ORDER BY "fullName"'),
      pool.query('SELECT * FROM "PurchaseOrder" ORDER BY "date" DESC'),
      pool.query('SELECT * FROM "PurchaseOrderItem" ORDER BY "id"'),
      pool.query('SELECT * FROM "Purchase" ORDER BY "date" DESC'),
      pool.query('SELECT * FROM "Sale" ORDER BY "invoiceDate" DESC'),
      pool.query('SELECT * FROM "Attendance" ORDER BY "date" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "MonthlyPayment" ORDER BY "year" DESC, "month" DESC'),
      pool.query('SELECT * FROM "ApprovalRequest" ORDER BY "createdAt" DESC')
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
        approvalRequests: approvals.rows
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
        approvalRequests: approvals.rows.length
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
app.listen(PORT, async () => {
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

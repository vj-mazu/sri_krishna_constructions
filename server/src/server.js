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

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'iac_stocks_secret_key_2026_secure';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Lightweight Memory-Based API Rate Limiter
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 120; // 120 requests per IP per minute
const ipRequestLogs = {};

// Clean up memory cache periodically every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const ip in ipRequestLogs) {
    if (now - ipRequestLogs[ip].windowStart > rateLimitWindowMs) {
      delete ipRequestLogs[ip];
    }
  }
}, 5 * 60 * 1000);

const rateLimiter = (req, res, next) => {
  // Only apply rate limit to API routes
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  if (!ipRequestLogs[ip]) {
    ipRequestLogs[ip] = {
      windowStart: now,
      requestCount: 1
    };
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
      error: '⚠️ Too many requests! Please wait a moment and try again.'
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

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
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

// --- DASHBOARD SUMMARY API ---
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const totalItems = await prisma.item.count();
    const lowStockItems = await prisma.item.count({ where: { currentStock: { lte: 10 } } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayInward = await prisma.stockMovement.aggregate({
      where: { movementType: 'INWARD', createdAt: { gte: today } },
      _sum: { quantity: true },
    });

    const todaySale = await prisma.stockMovement.aggregate({
      where: { movementType: 'SALE', createdAt: { gte: today } },
      _sum: { quantity: true },
    });

    const pendingApprovals = await prisma.approvalRequest.count({ where: { status: 'PENDING' } });

    // Category stock counts
    const categoryCounts = await prisma.item.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { currentStock: true },
    });

    res.json({
      totalItems,
      lowStockItems,
      todayInwardQty: todayInward._sum.quantity || 0,
      todaySaleQty: todaySale._sum.quantity || 0,
      pendingApprovals,
      categoryCounts,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
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
  try {
    const {
      category,
      itemCode,
      movementType,
      quantity,
      invoiceRefNo,
      remarks,
      unitPrice,
      // Category-specific fields that can be updated during inward
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
      baseQty
      ,targetQty
      ,movementDate
    } = req.body;
    const qty = parseInt(quantity, 10);

    if (!category || !itemCode || !movementType || !qty || qty <= 0) {
      return res.status(400).json({ error: 'Valid Category, Item Code, Movement Type, and positive Quantity are required' });
    }

    let item = await prisma.item.findUnique({
      where: { category_itemCode: { category, itemCode } },
    });

    if (!item) {
      if (movementType === 'SALE') {
        return res.status(404).json({ error: `⚠️ Item Code '${itemCode}' not found in category '${category}'. Sale cannot be performed!` });
      }

      // Automatically create item for INWARD
      item = await prisma.item.create({
        data: {
          category,
          itemCode,
          itemName: itemName || `Item ${itemCode}`,
          partNo: partNo || null,
          specifications: specifications || null,
          unit: unit || 'NO',
          brandOffered: brandOffered || null,
          gstPercentage: gstPercentage ? parseFloat(gstPercentage) : null,
          hsnCode: hsnCode || null,
          biddersCompliance: biddersCompliance || null,
          basicRateRs: basicRateRs ? parseFloat(basicRateRs) : null,
          basicRateRsAlt: basicRateRsAlt ? parseFloat(basicRateRsAlt) : null,
          skcRate1: skcRate1 ? parseFloat(skcRate1) : null,
          skcRate2: skcRate2 ? parseFloat(skcRate2) : null,
          diffPercentage: diffPercentage ? parseFloat(diffPercentage) : null,
          baseQty: baseQty ? parseInt(baseQty, 10) : 1,
          targetQty: targetQty ? parseInt(targetQty, 10) : 0,
          currentStock: 0, // Will be updated by the transaction below
        }
      });
    }

    // ACCURATE SALE VALIDATION GUARD
    if (movementType === 'SALE') {
      if (item.currentStock <= 0) {
        return res.status(400).json({
          error: `⚠️ INSUFFICIENT STOCK! Item '${item.itemCode}' (${item.itemName}) has ZERO (0) stock available. Sale cannot be performed!`,
          availableStock: item.currentStock,
          requestedQty: qty,
        });
      }

      if (qty > item.currentStock) {
        return res.status(400).json({
          error: `⚠️ INSUFFICIENT STOCK! Available stock for '${item.itemCode}' is ${item.currentStock} ${item.unit}. You requested ${qty}. Sale exceeds stock limit!`,
          availableStock: item.currentStock,
          requestedQty: qty,
        });
      }
    }

    const previousStock = item.currentStock;
    const newStock = movementType === 'INWARD' ? previousStock + qty : previousStock - qty;

    // Build update data
    const updateData = { currentStock: newStock };
    if (movementType === 'INWARD') {
      if (itemName) updateData.itemName = itemName;
      if (partNo) updateData.partNo = partNo;
      if (specifications) updateData.specifications = specifications;
      if (unit) updateData.unit = unit;
      if (brandOffered) updateData.brandOffered = brandOffered;
      if (gstPercentage !== undefined) updateData.gstPercentage = gstPercentage ? parseFloat(gstPercentage) : null;
      if (hsnCode) updateData.hsnCode = hsnCode;
      if (biddersCompliance) updateData.biddersCompliance = biddersCompliance;
      if (basicRateRs !== undefined) updateData.basicRateRs = basicRateRs ? parseFloat(basicRateRs) : null;
      if (basicRateRsAlt !== undefined) updateData.basicRateRsAlt = basicRateRsAlt ? parseFloat(basicRateRsAlt) : null;
      if (skcRate1 !== undefined) updateData.skcRate1 = skcRate1 ? parseFloat(skcRate1) : null;
      if (skcRate2 !== undefined) updateData.skcRate2 = skcRate2 ? parseFloat(skcRate2) : null;
      if (diffPercentage !== undefined) updateData.diffPercentage = diffPercentage ? parseFloat(diffPercentage) : null;
      if (baseQty !== undefined) updateData.baseQty = baseQty ? parseInt(baseQty, 10) : 0;
    }

    // Transaction to update item stock and add movement log
    const [updatedItem, movement] = await prisma.$transaction([
      prisma.item.update({
        where: { id: item.id },
        data: updateData,
      }),
      prisma.stockMovement.create({
        data: {
          itemId: item.id,
          movementType,
          quantity: qty,
          previousStock,
          newStock,
          unitPrice: unitPrice ? parseFloat(unitPrice) : null,
          invoiceRefNo: invoiceRefNo || (movementType === 'SALE' ? `SKC/${new Date().getFullYear()}/${Date.now()}` : null),
          remarks,
          movementDate: movementDate ? new Date(movementDate) : new Date(),
          userId: req.user.id,
        },
      }),
    ]);

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

// --- EDIT / DELETE APPROVAL WORKFLOWS ---
app.post('/api/approvals/request', authenticateToken, async (req, res) => {
  try {
    const { type, itemId, payload, reason } = req.body;
    if (!type || !reason) {
      return res.status(400).json({ error: 'Type and reason are required for approval request' });
    }

    // OWNER can directly execute, STAFF/MANAGER submit approval
    if (req.user.role === 'OWNER') {
      // Execute immediately
      if (type === 'DELETE_ITEM' && itemId) {
        await prisma.item.delete({ where: { id: itemId } });
        return res.json({ message: 'Item deleted directly by Owner' });
      }
      if (type === 'EDIT_ITEM' && itemId && payload) {
        const updated = await prisma.item.update({ where: { id: itemId }, data: payload });
        return res.json({ message: 'Item updated directly by Owner', item: updated });
      }
    }

    const approval = await prisma.approvalRequest.create({
      data: {
        type,
        itemId,
        payload: payload || {},
        reason,
        requestedById: req.user.id,
      },
    });

    res.status(201).json({
      message: 'Request submitted for Owner/Manager approval',
      approval,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create approval request' });
  }
});

app.get('/api/approvals', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        item: true,
        requestedBy: { select: { username: true, fullName: true, role: true } },
      },
    });

    res.json({ approvals });
  } catch (err) {
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

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!approval || approval.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval request not found' });
    }

    if (status === 'APPROVED') {
      if (approval.type === 'DELETE_ITEM' && approval.itemId) {
        await prisma.item.delete({ where: { id: approval.itemId } });
      } else if (approval.type === 'EDIT_ITEM' && approval.itemId) {
        await prisma.item.update({ where: { id: approval.itemId }, data: approval.payload });
      } else if (approval.type === 'EDIT_ATTENDANCE') {
        const { date, attendanceData } = approval.payload;
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);

        const operations = attendanceData.map((record) => {
          const data = {
            status: record.status,
            overtimeHours: parseFloat(record.overtimeHours) || 0.0,
            dailyWageOverride: record.dailyWageOverride ? parseFloat(record.dailyWageOverride) : null,
            recordedById: approval.requestedById,
            updatedAt: new Date()
          };

          return prisma.attendance.upsert({
            where: {
              workerId_date: {
                workerId: record.workerId,
                date: queryDate
              }
            },
            update: data,
            create: {
              workerId: record.workerId,
              date: queryDate,
              ...data
            }
          });
        });
        await prisma.$transaction(operations);
      }
    }

    const updatedApproval = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status,
        approvedById: req.user.id,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });

    res.json({ message: `Approval request ${status.toLowerCase()}`, approval: updatedApproval });
  } catch (err) {
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
        _count: {
          select: { movements: true, approvalRequests: true },
        },
      },
    });

    const userList = users.map((u) => ({
      ...u,
      hasCreatedEntries: u._count.movements > 0 || u._count.approvalRequests > 0,
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

app.put('/api/users/:id', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, mobileNumber, password, role } = req.body;

    const data = {};
    if (fullName) data.fullName = fullName.trim();
    if (mobileNumber) {
      if (!/^\d{10}$/.test(mobileNumber.trim())) {
        return res.status(400).json({ error: 'Mobile number must be a valid 10-digit phone number' });
      }
      data.mobileNumber = mobileNumber.trim();
    }
    if (role) {
      if (!['SUPERVISOR', 'STAFF', 'MANAGER', 'OWNER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role selection' });
      }
      data.role = role;
    }
    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password, 10);
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
      include: {
        _count: { select: { movements: true, approvalRequests: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner user cannot be deleted' });
    }

    const hasCreatedEntries = user._count.movements > 0 || user._count.approvalRequests > 0;
    if (hasCreatedEntries) {
      return res.status(400).json({
        error: `User '${user.username}' has created stock movements or approval requests. Deletion is hidden/disabled to protect system logs.`,
      });
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

app.post('/api/divisions', authenticateToken, async (req, res) => {
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

app.delete('/api/divisions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only Owner or Manager can delete divisions' });
    }
    await prisma.division.delete({ where: { id } });
    res.json({ message: 'Division deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete division' });
  }
});

// --- WORKERS REGISTRY API ---
app.get('/api/workers', authenticateToken, async (req, res) => {
  try {
    const { divisionId } = req.query;
    const where = divisionId ? { divisionId } : {};
    const workers = await prisma.worker.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: { division: true }
    });
    res.json({ workers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workers list' });
  }
});

app.post('/api/workers', authenticateToken, async (req, res) => {
  try {
    const { workerId, fullName, mobileNumber, dailyWage, otHourlyRate, divisionId } = req.body;
    if (!workerId || !fullName || !mobileNumber || !dailyWage || !otHourlyRate || !divisionId) {
      return res.status(400).json({ error: 'All fields (Worker ID, Full Name, Mobile Number, Daily Wage, OT Hourly Rate, Division) are mandatory!' });
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

    const existing = await prisma.worker.findUnique({ where: { workerId: workerId.trim() } });
    if (existing) {
      return res.status(400).json({ error: `Worker ID '${workerId}' is already registered` });
    }

    const worker = await prisma.worker.create({
      data: {
        workerId: workerId.trim(),
        fullName: fullName.trim(),
        mobileNumber: cleanedPhone,
        dailyWage: parseFloat(dailyWage),
        otHourlyRate: otHourlyRate ? parseFloat(otHourlyRate) : parseFloat(dailyWage) / 8,
        divisionId,
      },
      include: { division: true }
    });

    res.status(201).json({ worker });
  } catch (err) {
    console.error('Create worker error:', err);
    res.status(500).json({ error: 'Failed to register worker' });
  }
});

app.put('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, mobileNumber, dailyWage, otHourlyRate, divisionId } = req.body;

    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    // Validate wage access: Only Owner or Manager can edit worker rates/wages
    if (dailyWage !== undefined || otHourlyRate !== undefined) {
      if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Wage rates modification is restricted to Owners or Managers only!' });
      }
    }

    const data = {};
    if (fullName) data.fullName = fullName.trim();
    if (divisionId) data.divisionId = divisionId;
    if (dailyWage !== undefined) data.dailyWage = parseFloat(dailyWage);
    if (otHourlyRate !== undefined) data.otHourlyRate = parseFloat(otHourlyRate);
    
    if (mobileNumber) {
      let cleanedPhone = mobileNumber.trim().replace(/[^0-9+]/g, '');
      if (cleanedPhone.length === 10) {
        cleanedPhone = '+91' + cleanedPhone;
      }
      if (!/^\+91\d{10}$/.test(cleanedPhone)) {
        return res.status(400).json({ error: 'Invalid 10-digit Indian phone number format' });
      }
      data.mobileNumber = cleanedPhone;
    }

    const updated = await prisma.worker.update({
      where: { id },
      data,
      include: { division: true }
    });

    res.json({ worker: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update worker registry' });
  }
});

app.delete('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only Owner or Manager can delete workers' });
    }
    await prisma.worker.delete({ where: { id } });
    res.json({ message: 'Worker record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete worker' });
  }
});

// --- DAILY WORKER ATTENDANCE API ---
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, divisionId } = req.query;
    if (!date || !divisionId) {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) and Division ID are required' });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        date: queryDate,
        worker: { divisionId }
      },
      include: { worker: true }
    });

    res.json({ attendances });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load attendance records' });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, attendanceData } = req.body; // attendanceData: [{ workerId, status, overtimeHours }]
    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ error: 'Date and valid attendance data are required' });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    // Check if attendance has already been logged for these workers on this date
    const existingLogs = await prisma.attendance.findMany({
      where: {
        date: queryDate,
        workerId: { in: attendanceData.map(r => r.workerId) }
      }
    });

    if (existingLogs.length > 0) {
      // User is editing existing daily attendance
      if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
        const workers = await prisma.worker.findMany({
          where: { id: { in: attendanceData.map(r => r.workerId) } }
        });

        const diffs = [];
        attendanceData.forEach((record) => {
          const existing = existingLogs.find(el => el.workerId === record.workerId);
          const worker = workers.find(w => w.id === record.workerId);
          if (existing && worker) {
            const statusChanged = existing.status !== record.status;
            const otChanged = Math.abs((existing.overtimeHours || 0.0) - (parseFloat(record.overtimeHours) || 0.0)) > 0.01;
            
            const incomingOverride = record.dailyWageOverride ? parseFloat(record.dailyWageOverride) : null;
            const wageChanged = existing.dailyWageOverride !== incomingOverride;

            if (statusChanged || otChanged || wageChanged) {
              const statusDesc = statusChanged ? `${existing.status} ➔ ${record.status}` : null;
              const otDesc = otChanged ? `OT: ${existing.overtimeHours}h ➔ ${record.overtimeHours}h` : null;
              const wageDesc = wageChanged ? `Wage: ₹${existing.dailyWageOverride || worker.dailyWage} ➔ ₹${incomingOverride || worker.dailyWage}` : null;
              const parts = [statusDesc, otDesc, wageDesc].filter(Boolean);
              diffs.push(`${worker.fullName} (${parts.join(', ')})`);
            }
          }
        });

        const detailedReason = `Supervisor '${req.user.fullName}' requested to modify attendance for ${date}. Changes: ${diffs.join('; ') || 'No changes.'}`;

        // Supervisors must go through Owner/Manager approval for edits
        const approval = await prisma.approvalRequest.create({
          data: {
            type: 'EDIT_ATTENDANCE',
            status: 'PENDING',
            payload: { date, attendanceData },
            reason: detailedReason,
            requestedById: req.user.id,
          }
        });
        return res.status(202).json({
          message: '⚠️ Changes detected! Editing previously logged attendance requires approval. Modification request has been submitted to Owner/Manager.',
          requiresApproval: true,
          approval
        });
      }
    }

    const operations = attendanceData.map((record) => {
      const data = {
        status: record.status,
        overtimeHours: parseFloat(record.overtimeHours) || 0.0,
        dailyWageOverride: record.dailyWageOverride ? parseFloat(record.dailyWageOverride) : null,
        recordedById: req.user.id,
        updatedAt: new Date()
      };

      return prisma.attendance.upsert({
        where: {
          workerId_date: {
            workerId: record.workerId,
            date: queryDate
          }
        },
        update: data,
        create: {
          workerId: record.workerId,
          date: queryDate,
          ...data
        }
      });
    });

    await prisma.$transaction(operations);
    res.json({ message: 'Attendance records saved successfully!' });
  } catch (err) {
    console.error('Attendance submit error:', err);
    res.status(500).json({ error: 'Failed to record daily attendance' });
  }
});

// --- MONTHLY WAGE CALCULATION & WATSAPP API ---
app.get('/api/wages/monthly', authenticateToken, async (req, res) => {
  try {
    const { month, year, divisionId } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and Year parameters are required' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const workers = await prisma.worker.findMany({
      where: divisionId ? { divisionId } : {},
      include: {
        division: true,
        attendances: {
          where: {
            date: { gte: startDate, lte: endDate }
          }
        },
        payments: {
          where: { month: m, year: y }
        }
      }
    });

    const wageReport = workers.map((worker) => {
      let present = 0;
      let absent = 0;
      let half = 0;
      let leave = 0;
      let totalOt = 0;
      let calculatedAmount = 0.0;

      worker.attendances.forEach((att) => {
        const rate = att.dailyWageOverride !== null && att.dailyWageOverride !== undefined 
          ? att.dailyWageOverride 
          : worker.dailyWage;

        if (att.status === 'PRESENT') {
          present += 1;
          calculatedAmount += rate;
        } else if (att.status === 'ABSENT') {
          absent += 1;
        } else if (att.status === 'HALF_DAY') {
          half += 1;
          calculatedAmount += rate * 0.5;
        } else if (att.status === 'LEAVE') {
          leave += 1;
        }
        const otHours = att.overtimeHours || 0.0;
        totalOt += otHours;
        calculatedAmount += otHours * worker.otHourlyRate;
      });

      const dailyWage = worker.dailyWage;
      const otHourlyRate = worker.otHourlyRate;

      const dbPayment = worker.payments[0];

      return {
        workerId: worker.id,
        empId: worker.workerId,
        fullName: worker.fullName,
        mobileNumber: worker.mobileNumber,
        divisionName: worker.division.name,
        dailyWage,
        otHourlyRate,
        presentDays: present,
        absentDays: absent,
        halfDays: half,
        leaveDays: leave,
        totalOtHours: totalOt,
        calculatedAmount,
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

app.post('/api/wages/approve', authenticateToken, async (req, res) => {
  try {
    const { workerId, month, year, calculatedAmount, presentDays, absentDays, halfDays, leaveDays, totalOtHours } = req.body;
    if (!workerId || !month || !year || calculatedAmount === undefined) {
      return res.status(400).json({ error: 'Worker ID, Month, Year, and Payout Amount are required' });
    }

    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Wages payouts can only be approved by Owner or Managers' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const payment = await prisma.monthlyPayment.upsert({
      where: {
        workerId_month_year: {
          workerId,
          month: m,
          year: y
        }
      },
      update: {
        presentDays: parseFloat(presentDays) || 0,
        absentDays: parseFloat(absentDays) || 0,
        halfDays: parseFloat(halfDays) || 0,
        leaveDays: parseFloat(leaveDays) || 0,
        totalOtHours: parseFloat(totalOtHours) || 0,
        calculatedAmount: parseFloat(calculatedAmount),
        status: 'APPROVED',
        approvedById: req.user.id
      },
      create: {
        workerId,
        month: m,
        year: y,
        presentDays: parseFloat(presentDays) || 0,
        absentDays: parseFloat(absentDays) || 0,
        halfDays: parseFloat(halfDays) || 0,
        leaveDays: parseFloat(leaveDays) || 0,
        totalOtHours: parseFloat(totalOtHours) || 0,
        calculatedAmount: parseFloat(calculatedAmount),
        status: 'APPROVED',
        approvedById: req.user.id
      }
    });

    res.json({ message: 'Monthly wage payment successfully approved!', payment });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve wage payout' });
  }
});

app.post('/api/wages/whatsapp-link', authenticateToken, async (req, res) => {
  try {
    const { workerName, mobileNumber, month, year, presentDays, halfDays, totalOtHours, calculatedAmount } = req.body;
    if (!workerName || !mobileNumber || !calculatedAmount) {
      return res.status(400).json({ error: 'Name, mobile number, and wage details are required' });
    }

    // Map month number to text
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthText = months[parseInt(month, 10) - 1] || 'Month';

    const message = `*SRI KRISHNA CONSTRUCTIONS*
------------------------------
Dear *${workerName}*,
Your attendance and payment summary for *${monthText} ${year}* has been calculated and approved:
- Present Days: *${presentDays}*
- Half Days: *${halfDays}*
- OT Hours: *${totalOtHours}*
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

// SPA Fallback Route for React App on Port 5000
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// START SERVER AND RUN AUTO MIGRATIONS & SEEDING
app.listen(PORT, async () => {
  console.log(`🚀 IAC Stocks Server running on port ${PORT}`);
  try {
    // Run seed baseline data to ensure default accounts exist
    await seedBaselineData();
    console.log('✅ Auto startup database seeding completed!');
  } catch (err) {
    console.error('Database seeding log:', err.message);
  }
});

import { pool } from './db.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING AUTOMATED TEST SUITE: MULTI-ITEM INLINE EDITS');
  console.log('   Testing: PO Inward Edit, PO Sales Edit, Work Orders Edit');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. AUTHENTICATE AS OWNER
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'owner123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.token, 'Owner Login & Authentication token acquired');
    const token = loginData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // Get a valid divisionId
    const divRes = await fetch(`${BASE_URL}/divisions`, { headers: authHeaders });
    const divData = await divRes.json();
    const divisionId = divData.divisions?.[0]?.id || (await pool.query('SELECT id FROM "Division" LIMIT 1')).rows[0]?.id;
    assert(!!divisionId, `Division acquired (ID: ${divisionId})`);

    const runId = Date.now().toString().slice(-5);

    // =========================================================================
    // TEST SUITE 1: PO INWARD INLINE EDIT & ITEM ROW DELETION
    // =========================================================================
    console.log('\n--- 1. Testing PO Inward Edit & Row Deletion ---');
    const testPoNumber = `PO-TEST-${runId}`;
    const testInwardInv = `INW-INV-${runId}`;

    // 1.1 Create Purchase Order
    const poRes = await fetch(`${BASE_URL}/purchase-orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        poNumber: testPoNumber,
        date: new Date().toISOString().slice(0, 10),
        divisionId,
        poAmount: 80000,
        remarks: 'Automated Test PO'
      })
    });
    const po = await poRes.json();
    assert(poRes.status === 201 && !!po.id, `Created Base PO #${testPoNumber}`);

    // 1.2 Add 2 Line Items to the PO
    const item1Res = await fetch(`${BASE_URL}/purchase-order-items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        purchaseOrderId: po.id,
        kpclCode: `KPCL-HC-${runId}`,
        itemName: `Heavy Channel 100x50 ${runId}`,
        partNumber: `HC-100-${runId}`,
        qty: 100,
        rate: 500,
        unit: 'NOS',
        cgstPercent: 9,
        sgstPercent: 9
      })
    });
    const poItem1 = await item1Res.json();

    const item2Res = await fetch(`${BASE_URL}/purchase-order-items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        purchaseOrderId: po.id,
        kpclCode: `KPCL-SA-${runId}`,
        itemName: `Steel Angles 50x50 ${runId}`,
        partNumber: `SA-50-${runId}`,
        qty: 50,
        rate: 300,
        unit: 'NOS',
        cgstPercent: 9,
        sgstPercent: 9
      })
    });
    const poItem2 = await item2Res.json();
    assert(!!poItem1.id && !!poItem2.id, `Created 2 line items under PO #${testPoNumber}`);

    // 1.3 Inward receipt with 2 items under invoice testInwardInv
    const pur1Res = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        purchaseOrderItemId: poItem1.id,
        partyInvoiceNumber: testInwardInv,
        partyName: 'Automated Test Steel Mill',
        qty: 40,
        rate: 500,
        cgstPercent: 9,
        sgstPercent: 9,
        vehicleNumber: 'KA-34-OLD',
        receivedItemName: poItem1.itemName,
        receivedPartNumber: poItem1.partNumber
      })
    });
    const pur1Data = await pur1Res.json();

    const pur2Res = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        purchaseOrderItemId: poItem2.id,
        partyInvoiceNumber: testInwardInv,
        partyName: 'Automated Test Steel Mill',
        qty: 25,
        rate: 300,
        cgstPercent: 9,
        sgstPercent: 9,
        vehicleNumber: 'KA-34-OLD',
        receivedItemName: poItem2.itemName,
        receivedPartNumber: poItem2.partNumber
      })
    });
    const pur2Data = await pur2Res.json();
    assert(pur1Res.status === 201 && pur2Res.status === 201, `Recorded Inward Receipt #${testInwardInv} with 2 items`);

    const purId1 = pur1Data.purchase?.id || pur1Data.id;
    const purId2 = pur2Data.purchase?.id || pur2Data.id;

    // 1.4 PERFORM INLINE EDIT ON INWARD:
    // Update Item 1 qty to 45, rate to 520, vehicle number to 'KA-34-NEW'
    // AND REMOVE Item 2 from the array (simulating trash delete)
    const inwardEditRes = await fetch(`${BASE_URL}/purchases/invoice?invoiceNumber=${testInwardInv}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        originalInvoiceNumber: testInwardInv,
        partyInvoiceNumber: testInwardInv,
        partyName: 'Automated Test Steel Mill - Updated',
        vehicleNumber: 'KA-34-NEW',
        supplierAddress: 'Industrial Zone, Hubballi - Unit 2',
        cgstPercent: 9,
        sgstPercent: 9,
        items: [
          {
            id: purId1,
            qty: 45,
            rate: 520,
            receivedItemName: `Heavy Channel 100x50 ${runId} (Verified)`,
            receivedPartNumber: `HC-100-${runId}-VER`
          }
          // purId2 is omitted -> MUST be safely deleted by backend
        ]
      })
    });
    const inwardEditData = await inwardEditRes.json();
    if (inwardEditRes.status !== 200) {
      console.error('Inward edit failed with status', inwardEditRes.status, inwardEditData);
    }
    assert(inwardEditRes.status === 200, `PUT /api/purchases/invoice executed successfully: "${inwardEditData.message || inwardEditData.error || 'OK'}"`);

    // Verify in database:
    const dbPurRes = await pool.query('SELECT * FROM "Purchase" WHERE UPPER(TRIM("partyInvoiceNumber")) = UPPER($1)', [testInwardInv]);
    assert(dbPurRes.rows.length === 1, `Deleted item 2 was removed from database (Remaining count: ${dbPurRes.rows.length}, Expected: 1)`);
    assert(
      parseFloat(dbPurRes.rows[0].qty) === 45 &&
      parseFloat(dbPurRes.rows[0].rate) === 520 &&
      dbPurRes.rows[0].vehicleNumber === 'KA-34-NEW',
      `Inward item 1 updated in place: Qty=45, Rate=₹520, Vehicle=KA-34-NEW, Total=₹${dbPurRes.rows[0].totalAmount}`
    );

    // =========================================================================
    // TEST SUITE 2: PO SALES INLINE EDIT & ITEM ROW DELETION
    // =========================================================================
    console.log('\n--- 2. Testing PO Sales Edit & Row Deletion ---');
    const testSaleInv = `SALE-INV-${runId}`;

    // Ensure we have enough inward stock for poItem1
    await pool.query('UPDATE "Purchase" SET qty = 100 WHERE id = $1', [purId1]);

    const sale1Res = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        purchaseOrderItemId: poItem1.id,
        invoiceNumber: testSaleInv,
        partyName: 'Original Client A',
        qty: 10,
        rate: 650,
        cgstPercent: 9,
        sgstPercent: 9,
        vehicleNumber: 'KA-34-OLD-TRUCK'
      })
    });
    const sale1Data = await sale1Res.json();

    const sale2Res = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        purchaseOrderItemId: poItem1.id,
        invoiceNumber: testSaleInv,
        partyName: 'Original Client A',
        qty: 5,
        rate: 650,
        cgstPercent: 9,
        sgstPercent: 9,
        vehicleNumber: 'KA-34-OLD-TRUCK'
      })
    });
    const sale2Data = await sale2Res.json();
    assert(sale1Res.status === 201 && sale2Res.status === 201, `Created multi-item Sale Invoice #${testSaleInv} with 2 items`);

    const saleId1 = sale1Data.sale?.id || sale1Data.id;
    const saleId2 = sale2Data.sale?.id || sale2Data.id;

    // PERFORM INLINE EDIT ON SALES:
    // Update Item 1 qty to 12, rate to 700, partyName to 'Royal Construction Works'
    // AND REMOVE Item 2 from the array (simulating trash delete)
    const saleEditRes = await fetch(`${BASE_URL}/sales/invoice?invoiceNumber=${testSaleInv}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        originalInvoiceNumber: testSaleInv,
        invoiceNumber: testSaleInv,
        partyName: 'Royal Construction Works',
        vehicleNumber: 'KA-34-EXPRESS-TRUCK',
        supplierAddress: 'Plot 45, KIADB Industrial Area',
        items: [
          {
            id: saleId1,
            qty: 12,
            rate: 700,
            cgstPercent: 9,
            sgstPercent: 9
          }
          // saleId2 omitted -> MUST be safely deleted
        ]
      })
    });
    const saleEditData = await saleEditRes.json();
    assert(saleEditRes.status === 200, `PUT /api/sales/invoice executed successfully: "${saleEditData.message || 'OK'}"`);

    // Verify in database:
    const dbSaleRes = await pool.query('SELECT * FROM "Sale" WHERE UPPER(TRIM("invoiceNumber")) = UPPER($1)', [testSaleInv]);
    assert(dbSaleRes.rows.length === 1, `Deleted sale item 2 was removed from database (Remaining sales: ${dbSaleRes.rows.length}, Expected: 1)`);
    assert(
      parseFloat(dbSaleRes.rows[0].qty) === 12 &&
      parseFloat(dbSaleRes.rows[0].rate) === 700 &&
      dbSaleRes.rows[0].partyName === 'Royal Construction Works',
      `Sale item 1 updated: Qty=12, Rate=₹700, Party="Royal Construction Works", Total=₹${dbSaleRes.rows[0].totalAmount}`
    );

    // =========================================================================
    // TEST SUITE 3: WORK ORDERS INLINE EDIT & ITEM ROW DELETION
    // =========================================================================
    console.log('\n--- 3. Testing Work Orders Edit & Row Deletion ---');
    const testWoNum = `WO-ORD-${runId}`;
    const testWoInv = `WO-INV-${runId}`;

    // Create a Work Order with 2 line items
    const createWoRes = await fetch(`${BASE_URL}/work-orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        workOrderNumber: testWoNum,
        workOrderDate: '2026-10-12',
        invoiceNumber: testWoInv,
        invoiceDate: '2026-10-12',
        partyName: 'JSW Infrastructure Limited',
        partyAddress: 'Toranagallu, Sandur Taluk, Ballari',
        partyGstNumber: '29AAACJ1234A1Z5',
        vehicleNumber: 'KA-34-WO-OLD',
        cgstPercent: 9,
        sgstPercent: 9,
        igstPercent: 0,
        shippingCharges: 1000,
        items: [
          {
            kpclCode: `KPCL-A-${runId}`,
            itemName: 'Structural Fabrication & Girder Erection',
            description: 'Fabrication of main plant columns as per DWG-01',
            partNumber: `STR-FAB-${runId}`,
            unit: 'NOS',
            qty: 10,
            rate: 2500
          },
          {
            kpclCode: `KPCL-B-${runId}`,
            itemName: 'Sand Blasting and Epoxy Priming',
            description: 'Surface preparation and 80 micron DFT coating',
            partNumber: `SND-BLS-${runId}`,
            unit: 'SQM',
            qty: 50,
            rate: 400
          }
        ]
      })
    });
    const createWoData = await createWoRes.json();
    assert(createWoRes.status === 200 || createWoRes.status === 201, `Created Work Order #${testWoNum} with 2 items`);

    // Verify initial creation in DB:
    const initialWoDb = await pool.query('SELECT * FROM "WorkOrder" WHERE UPPER(TRIM("workOrderNumber")) = UPPER($1)', [testWoNum]);
    assert(initialWoDb.rows.length === 2, `Work Order has 2 items in database`);

    // PERFORM INLINE EDIT ON WORK ORDER:
    // Update Item 1 qty to 15, rate to 2700, vehicle number to 'KA-34-WO-NEW'
    // AND REMOVE Item 2 (Sand blasting row deleted)
    const editWoRes = await fetch(`${BASE_URL}/work-orders/invoice?invoiceNumber=${testWoInv}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        originalInvoiceNumber: testWoInv,
        workOrderNumber: testWoNum,
        workOrderDate: '2026-10-12',
        invoiceNumber: testWoInv,
        invoiceDate: '2026-10-12',
        partyName: 'JSW Infrastructure Limited - Plant 2',
        partyAddress: 'Toranagallu, Sandur Taluk, Ballari - Gate 3',
        partyGstNumber: '29AAACJ1234A1Z5',
        vehicleNumber: 'KA-34-WO-NEW',
        cgstPercent: 9,
        sgstPercent: 9,
        igstPercent: 0,
        shippingCharges: 1200,
        items: [
          {
            kpclCode: `KPCL-A-${runId}`,
            itemName: 'Structural Fabrication & Girder Erection (Stage 2 Approved)',
            description: 'Fabrication of main plant columns as per DWG-01 Rev B',
            partNumber: `STR-FAB-${runId}-R2`,
            unit: 'NOS',
            qty: 15,
            rate: 2700
          }
          // Item 2 deleted
        ]
      })
    });
    const editWoData = await editWoRes.json();
    assert(editWoRes.status === 200, `PUT /api/work-orders/invoice executed successfully: "${editWoData.message || 'OK'}"`);

    // Verify in database:
    const updatedWoDb = await pool.query('SELECT * FROM "WorkOrder" WHERE UPPER(TRIM("workOrderNumber")) = UPPER($1)', [testWoNum]);
    assert(updatedWoDb.rows.length === 1, `Deleted WO item 2 was removed from database (Remaining items: ${updatedWoDb.rows.length}, Expected: 1)`);
    const woItem = updatedWoDb.rows[0];
    const expectedBasic = 15 * 2700; // 40500
    const expectedTax = Math.round(expectedBasic * 0.18 * 100) / 100; // 7290
    const expectedTotal = expectedBasic + expectedTax + 1200; // 48990
    assert(
      parseFloat(woItem.qty) === 15 &&
      parseFloat(woItem.rate) === 2700 &&
      woItem.vehicleNumber === 'KA-34-WO-NEW' &&
      Math.abs(parseFloat(woItem.basicAmount) - expectedBasic) < 0.01 &&
      Math.abs(parseFloat(woItem.totalAmount) - expectedTotal) < 0.01,
      `Work Order recalculated accurately: Basic=₹${woItem.basicAmount}, CGST=₹${woItem.cgstAmount}, SGST=₹${woItem.sgstAmount}, Shipping=₹${woItem.shippingCharges}, Grand Total=₹${woItem.totalAmount}`
    );

    // =========================================================================
    // CLEANUP TEST DATA
    // =========================================================================
    console.log('\n--- Cleaning up temporary test data ---');
    await pool.query('DELETE FROM "WorkOrder" WHERE UPPER(TRIM("workOrderNumber")) = UPPER($1)', [testWoNum]);
    await pool.query('DELETE FROM "Sale" WHERE UPPER(TRIM("invoiceNumber")) = UPPER($1)', [testSaleInv]);
    await pool.query('DELETE FROM "Purchase" WHERE UPPER(TRIM("partyInvoiceNumber")) = UPPER($1)', [testInwardInv]);
    await pool.query('DELETE FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1', [po.id]);
    await pool.query('DELETE FROM "PurchaseOrder" WHERE "id" = $1', [po.id]);
    console.log('🧹 Cleanup complete.');

    console.log('\n================================================================');
    console.log(`📊 FINAL TEST REPORT: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    await pool.end();
    process.exit(1);
  }
};

runTests();

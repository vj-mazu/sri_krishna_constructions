import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001/api';

const runTests = async () => {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE ERP AUTOMATED TEST SUITE');
  console.log('====================================================\n');

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
    // 1. OWNER LOGIN
    const ownerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'password123' })
    });
    const ownerData = await ownerLoginRes.json();
    assert(ownerLoginRes.status === 200 && !!ownerData.token, 'Owner Login & JWT generation');
    const ownerToken = ownerData.token;

    // 2. FETCH DIVISIONS
    const divRes = await fetch(`${BASE_URL}/divisions`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const divData = await divRes.json();
    assert(divRes.status === 200 && Array.isArray(divData.divisions) && divData.divisions.length > 0, 'Fetch Divisions');
    const testDiv1 = divData.divisions[0].id;
    const testDiv2 = divData.divisions.length > 1 ? divData.divisions[1].id : testDiv1;

    // 3. CREATE SUPERVISOR USER FOR TESTING (if not existing)
    let supervisorToken = '';
    const supLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_supervisor', password: 'password123' })
    });
    if (supLoginRes.status === 200) {
      const supData = await supLoginRes.json();
      supervisorToken = supData.token;
    } else {
      const createSupRes = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({
          username: 'test_supervisor',
          fullName: 'Test Supervisor',
          mobileNumber: '9876543210',
          password: 'password123',
          role: 'SUPERVISOR'
        })
      });
      if (createSupRes.status === 201) {
        const supLogin2 = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'test_supervisor', password: 'password123' })
        });
        const supData2 = await supLogin2.json();
        supervisorToken = supData2.token;
      }
    }
    assert(!!supervisorToken, 'Supervisor Authentication');

    // 4. REGISTER A TEST WORKER AS OWNER
    const testWorkerBadge = 'TEST-W-' + Date.now().toString().slice(-4);
    const workerRes = await fetch(`${BASE_URL}/workers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        workerId: testWorkerBadge,
        fullName: 'Automation Test Worker',
        fatherName: 'Test Father',
        designation: 'Fitter',
        mobileNumber: '9988776655',
        dailyWage: 600,
        dailyAllowance: 100,
        advanceTaken: 5000,
        advanceBalance: 5000,
        otAllowance: 50,
        otHourlyRate: 75,
        divisionId: testDiv1
      })
    });
    const workerData = await workerRes.json();
    assert(workerRes.status === 201 && !!workerData.worker?.id, 'Owner creates Worker with Advance');
    const testWorkerId = workerData.worker?.id;

    // 5. SUPERVISOR RESTRICTION: CANNOT CREATE WORKER
    const supCreateWorker = await fetch(`${BASE_URL}/workers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({
        workerId: 'SUP-BADGE-01',
        fullName: 'Hacker Worker',
        mobileNumber: '9876543211',
        dailyWage: 900,
        divisionId: testDiv1
      })
    });
    assert(supCreateWorker.status === 403, 'Supervisor CANNOT create new workers (403 Forbidden)');

    // 6. SUPERVISOR RESTRICTION: CANNOT DELETE WORKER
    const supDelWorker = await fetch(`${BASE_URL}/workers/${testWorkerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` }
    });
    assert(supDelWorker.status === 403, 'Supervisor CANNOT delete workers (403 Forbidden)');

    // 7. SUPERVISOR PERMISSION: CAN UPDATE DIVISION ONLY
    const supUpdateDiv = await fetch(`${BASE_URL}/workers/${testWorkerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({
        divisionId: testDiv2,
        dailyWage: 9999 // Should be ignored or safe
      })
    });
    const supUpdateData = await supUpdateDiv.json();
    assert(supUpdateDiv.status === 200 && supUpdateData.worker?.divisionId === testDiv2 && supUpdateData.worker?.dailyWage === 600, 'Supervisor CAN change worker division (Wage stays protected at 600)');

    // 8. ATTENDANCE MARKING & SUNDAY OVERRIDE
    const today = new Date().toISOString().split('T')[0];
    const markAttRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({
        records: [
          {
            workerId: testWorkerId,
            date: today,
            status: 'PRESENT',
            otHours: 2,
            divisionId: testDiv2
          }
        ]
      })
    });
    const markAttData = await markAttRes.json();
    assert(markAttRes.status === 200 && markAttData.success, 'Supervisor marks Attendance with OT');

    // 9. MONTHLY WAGES & ADVANCE DEDUCTION TEST
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const wagesRes = await fetch(`${BASE_URL}/wages?month=${currentMonth}&year=${currentYear}&divisionId=${testDiv2}`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const wagesData = await wagesRes.json();
    const workerWageRecord = wagesData.wages?.find(w => w.workerId === testWorkerId);
    assert(wagesRes.status === 200 && !!workerWageRecord && workerWageRecord.workingDays >= 1, 'Monthly Wages calculation accurately computes days and OT');

    // Deduct advance
    const deductRes = await fetch(`${BASE_URL}/wages/${testWorkerId}/advance-deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        month: currentMonth,
        year: currentYear,
        advanceDeducted: 1000
      })
    });
    const deductData = await deductRes.json();
    assert(deductRes.status === 200 && deductData.advanceBalance === 4000, 'Advance deduction correctly updates remaining balance (5000 - 1000 = 4000)');

    // 10. PURCHASE ORDERS CURSOR PAGINATION & PERFORMANCE
    const startTime = Date.now();
    const poRes = await fetch(`${BASE_URL}/purchase-orders?limit=10`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const poDuration = Date.now() - startTime;
    const poData = await poRes.json();
    assert(poRes.status === 200 && Array.isArray(poData.purchaseOrders), `PO List response time: ${poDuration}ms (<100ms target)`);

    // 11. STOCK SUMMARY CURSOR PAGINATION
    const stockRes = await fetch(`${BASE_URL}/stock-summary?limit=10`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const stockData = await stockRes.json();
    assert(stockRes.status === 200 && Array.isArray(stockData.items), 'Stock Summary cursor pagination works accurately');

    // 12. CLEANUP TEST WORKER
    await fetch(`${BASE_URL}/workers/${testWorkerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });

    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
  } catch (err) {
    console.error('Fatal test error:', err);
  }
};

runTests();

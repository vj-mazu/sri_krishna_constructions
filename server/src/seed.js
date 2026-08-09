import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';

const prisma = new PrismaClient();

const sourceFiles = [
  { file: 'IAC.xlsx', category: 'IAC_CHICAGO', sheets: [0] },
  { file: 'KIRLOSKAR T-BTD-PM & T-BTD-RM.xlsx', category: 'KIRLOSKAR_ANNEXURE', sheets: [0] },
  { file: 'TAC_ Gen_tech spec.xlsx', category: 'TAC_CHICAGO', sheets: [1, 0] },
  { file: 'COMMON LIST SKC AND ABHINAV.xlsx', category: 'KIRLOSKAR_UNIT4', sheets: [0, 1] },
];

const textValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value.richText) return value.richText.map((part) => part.text).join('');
  return String(value).trim();
};

const numberValue = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const importMasterWorkbooks = async () => {
  const localDownloads = 'C:\\Users\\maju\\Downloads';
  const repoSeeds = path.join(__dirname, '../seeds');
  let imported = 0;
  for (const source of sourceFiles) {
    const workbook = new ExcelJS.Workbook();
    let fileLoaded = false;
    
    // Try relative repo seeds folder first (works in Docker/Cloud if uploaded)
    try {
      const targetPath = path.join(repoSeeds, source.file);
      await workbook.xlsx.readFile(targetPath);
      console.log(`📖 Loading excel file from repository seeds: ${source.file}`);
      fileLoaded = true;
    } catch (e) {
      // Fallback to local Windows Downloads folder (works locally)
      try {
        const targetPath = path.join(localDownloads, source.file);
        await workbook.xlsx.readFile(targetPath);
        console.log(`📖 Loading excel file from local Downloads: ${source.file}`);
        fileLoaded = true;
      } catch (error) {
        console.warn(`⚠️ Master workbook not found in seeds/ or Downloads/: ${source.file}`);
      }
    }

    if (!fileLoaded) continue;
    for (const sheetIndex of source.sheets) {
      const worksheet = workbook.worksheets[sheetIndex];
      if (!worksheet) continue;
      let headerRow = null;
      let headers = {};
      worksheet.eachRow((row, rowNumber) => {
        if (headerRow) return;
        const found = {};
        row.eachCell((cell, colNumber) => {
          const label = textValue(cell.value).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (label.includes('itemcode')) found.itemCode = colNumber;
          if (label.includes('itemname')) found.itemName = colNumber;
          if (label.includes('description')) found.itemName = found.itemName || colNumber;
          if (label.includes('itemspecification')) found.specifications = colNumber;
          if (label === 'unit' || label === 'uom') found.unit = colNumber;
          if (label === 'qty' || label.includes('quantity')) found.targetQty = colNumber;
          if (label.includes('partno')) found.partNo = colNumber;
          if (label.includes('basicrateinrs')) found.basicRateRs = found.basicRateRs || colNumber;
          if (label.includes('skcrate')) found.skcRate1 = found.skcRate1 || colNumber;
          if (label === 'skc') found.skcRate1 = colNumber;
          if (label.includes('gst')) found.gstPercentage = colNumber;
          if (label === 'hsn') found.hsnCode = colNumber;
        });
        if (found.itemCode && (found.itemName || found.specifications)) { headerRow = rowNumber; headers = found; }
      });
      if (!headerRow) continue;
      for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const itemCode = textValue(row.getCell(headers.itemCode).value);
        const itemName = textValue(row.getCell(headers.itemName || headers.specifications).value);
        if (!itemCode || !itemName || /^total|^grand total/i.test(itemCode)) continue;
        const data = {
          category: source.category,
          itemCode,
          itemName,
          specifications: headers.specifications ? textValue(row.getCell(headers.specifications).value) : null,
          partNo: headers.partNo ? textValue(row.getCell(headers.partNo).value) : null,
          unit: headers.unit ? textValue(row.getCell(headers.unit).value) || 'NO' : 'NO',
          targetQty: headers.targetQty ? Math.max(0, Math.round(numberValue(row.getCell(headers.targetQty).value) || 0)) : 0,
          baseQty: headers.targetQty ? Math.max(0, Math.round(numberValue(row.getCell(headers.targetQty).value) || 0)) : 0,
          basicRateRs: headers.basicRateRs ? numberValue(row.getCell(headers.basicRateRs).value) : null,
          skcRate1: headers.skcRate1 ? numberValue(row.getCell(headers.skcRate1).value) : null,
          gstPercentage: headers.gstPercentage ? numberValue(row.getCell(headers.gstPercentage).value) : null,
          hsnCode: headers.hsnCode ? textValue(row.getCell(headers.hsnCode).value) : null,
        };
        const existing = await prisma.item.findUnique({ where: { category_itemCode: { category: source.category, itemCode } } });
        if (existing) {
          await prisma.item.update({ where: { id: existing.id }, data: { ...data, currentStock: existing.currentStock, targetQty: existing.targetQty || data.targetQty } });
        } else {
          await prisma.item.create({ data: { ...data, currentStock: 0 } });
        }
        imported += 1;
      }
    }
  }
  console.log(`✅ Imported/verified ${imported} master item rows from the four Excel workbooks.`);
};

export const seedBaselineData = async () => {
  console.log('🌱 Starting automatic seed & database verification...');

  // 1. Ensure Owner User Exists
  const ownerUsername = process.env.OWNER_USERNAME || 'owner';
  const ownerPassword = process.env.OWNER_PASSWORD || 'owner123';
  const hashedPassword = await bcrypt.hash(ownerPassword, 10);

  const existingOwner = await prisma.user.findUnique({
    where: { username: ownerUsername },
  });

  let ownerUser;
  if (!existingOwner) {
    ownerUser = await prisma.user.create({
      data: {
        username: ownerUsername,
        fullName: 'System Owner',
        mobileNumber: '9876543210',
        password: hashedPassword,
        role: 'OWNER',
      },
    });
    console.log(`✅ Default Owner created (Username: ${ownerUsername}, Password: ${ownerPassword})`);
  } else {
    ownerUser = existingOwner;
    console.log(`ℹ️ Default Owner already exists.`);
  }

  // Seed baseline sample items for all 4 images if missing
  // Tab 1: IAC Spares (Chicago Pneumatics)
  const iacSpares = [
    { itemCode: '6360312109', itemName: 'OIL FILTER (HX1) Make: Chicago Pneumatics, Model: NS HX1T 25N1P, Ref No- 1380, CRANKCASE ASSEMBLY -Part No- 1903 0612 11', unit: 'NO', gstPercentage: 18, hsnCode: '84149090', currentStock: 25 },
    { itemCode: '6360312117', itemName: 'OIL WIPER RING (HX1),Make: Chicago Pneumatics, Model: NS HX1T 25N1P, Ref No- 1210, CYLINDER ASSEMBLY - DIA 185 -Part No- 1903 1459 08', unit: 'NO', gstPercentage: 18, hsnCode: '84149090', currentStock: 40 },
    { itemCode: '6360312125', itemName: 'PISTON RING DIA.185 (HX1),Make: Chicago Pneumatics, Model: NS HX1T 25N1P, Ref No- 1220, CYLINDER ASSEMBLY - DIA 185 -Part No- 1903 3946 08', unit: 'NO', gstPercentage: 18, hsnCode: '84149090', currentStock: 15 },
    { itemCode: '6360312133', itemName: 'RIDER RING DIA.185 Make: Chicago Pneumatics, Model: NS HX1T 25N1P, Ref No- 1230 CYLINDER ASSEMBLY - DIA 185 -Part No- 1903 3947 08', unit: 'NO', gstPercentage: 18, hsnCode: '84149090', currentStock: 30 },
  ];

  for (const item of iacSpares) {
    await prisma.item.upsert({
      where: { category_itemCode: { category: 'IAC_CHICAGO', itemCode: item.itemCode } },
      update: {},
      create: {
        category: 'IAC_CHICAGO',
        ...item,
      },
    });
  }

  // Tab 2: Kirloskar Annexure
  const kirloskarAnnexure = [
    { itemCode: '634020805R', itemName: 'OIL COOLER FOR', partNo: '309603450', specifications: 'OILCOOLER', unit: 'Nos.', basicRateRs: 41941.8, basicRateRsAlt: 44458.31, skcRate1: 32100, skcRate2: 37878, diffPercentage: -27.80, currentStock: 12 },
    { itemCode: '634021001R', itemName: 'CONNECTING ROD & CAR(M)', partNo: '2460034050', specifications: 'CONNECTING ROD AND CAP(MACHD)', unit: 'Nos.', basicRateRs: 42643.8, basicRateRsAlt: 45202.43, skcRate1: 32600, skcRate2: 38468, diffPercentage: -27.88, currentStock: 8 },
    { itemCode: '634021402R', itemName: 'VALVE SEAT HP SUCTION', partNo: '2480065150', specifications: 'VALVE SEAT', unit: 'Nos.', basicRateRs: 5535.9, basicRateRsAlt: 5868.05, skcRate1: 4350, skcRate2: 5133, diffPercentage: -25.87, currentStock: 50 },
  ];

  for (const item of kirloskarAnnexure) {
    await prisma.item.upsert({
      where: { category_itemCode: { category: 'KIRLOSKAR_ANNEXURE', itemCode: item.itemCode } },
      update: {},
      create: {
        category: 'KIRLOSKAR_ANNEXURE',
        ...item,
      },
    });
  }

  // Tab 3: TAC Spares
  const tacSpares = [
    { itemCode: '6110331019', itemName: 'AIR FILTER (TAC) Make: Chicago Pneumatics, Model: HN2, Ref No- 1 050 , AIR FLOW - SUCTION FILTER CUM SILENCER -Part No- 1903 0857 23', unit: 'NO', skcRate1: 7467, currentStock: 22 },
    { itemCode: '6110331027', itemName: 'OIL FILTER (TAC) Make: Chicago Pneumatics, Model: HN2, Ref No- 1 480 , CRANKCASE ASSEMBLY-Part No- 1903 0612 11', unit: 'NO', skcRate1: 1169, currentStock: 35 },
    { itemCode: '6110331035', itemName: 'V - SEAL FOR (TAC) Make: Chicago Pneumatics, Model: HN2, Ref No- 1 150 , FIRST STAGE CYLINDER ASSEMBLY -Part No- 1901 0615 38', unit: 'NO', skcRate1: 1378, currentStock: 60 },
  ];

  for (const item of tacSpares) {
    await prisma.item.upsert({
      where: { category_itemCode: { category: 'TAC_CHICAGO', itemCode: item.itemCode } },
      update: {},
      create: {
        category: 'TAC_CHICAGO',
        ...item,
      },
    });
  }

  // Tab 4: Kirloskar Unit-4
  const kirloskarUnit4 = [
    { itemCode: '633020116R', itemName: 'O RING (VALVE COVER SUCTION)', unit: 'Nos', baseQty: 1, specifications: 'PART NO 9991291050 of compressor MODEL T-BTD-PM', currentStock: 45 },
    { itemCode: '633020313R', itemName: 'PACKING FOR VALVE ASSLY HP', unit: 'Nos', baseQty: 1, specifications: 'part no:2460021850, model:T-BTD-PM.', currentStock: 100 },
    { itemCode: '633020316R', itemName: 'O\' RING FOR SUCTION', unit: 'Nos', baseQty: 1, specifications: 'part no;9991289850. model:T-BTD-PM', currentStock: 80 },
  ];

  for (const item of kirloskarUnit4) {
    await prisma.item.upsert({
      where: { category_itemCode: { category: 'KIRLOSKAR_UNIT4', itemCode: item.itemCode } },
      update: {},
      create: {
        category: 'KIRLOSKAR_UNIT4',
        ...item,
      },
    });
  }

  console.log('✅ All 4 image category baseline datasets seeded successfully!');
  await importMasterWorkbooks();
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedBaselineData().then(() => prisma.$disconnect());
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';

const prisma = new PrismaClient();



export const seedBaselineData = async () => {
  console.log('🌱 Starting automatic seed & database verification...');

  const hashedOwner = await bcrypt.hash('owner123', 10);
  const hashedManjunath = await bcrypt.hash('admin123', 10);

  // 1. Ensure 'owner' user exists/updates
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: { role: 'OWNER' },
    create: {
      username: 'owner',
      fullName: 'System Owner',
      mobileNumber: '9876543210',
      password: hashedOwner,
      role: 'OWNER',
    }
  });

  // 2. Ensure 'manjunath' user exists/updates
  await prisma.user.upsert({
    where: { username: 'manjunath' },
    update: { role: 'OWNER' },
    create: {
      username: 'manjunath',
      fullName: 'Manjunath',
      mobileNumber: '9876543210',
      password: hashedManjunath,
      role: 'OWNER',
    }
  });

  console.log('✅ Baseline seeded successfully with owner and manjunath accounts!');
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedBaselineData().then(() => prisma.$disconnect());
}

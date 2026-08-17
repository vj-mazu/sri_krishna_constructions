import { pool } from './db.js';
import bcrypt from 'bcryptjs';

export const seedBaselineData = async () => {
  try {
    console.log('🌱 Starting automatic seed & database verification...');

    const hashedOwner = await bcrypt.hash('owner123', 10);
    const hashedManjunath = await bcrypt.hash('admin123', 10);

    // 1. Ensure 'owner' user exists
    await pool.query(`
      INSERT INTO "User" ("id", "username", "fullName", "mobileNumber", "password", "role", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'owner', 'System Owner', '9876543210', $1, 'OWNER', NOW(), NOW())
      ON CONFLICT ("username") DO UPDATE SET "role" = 'OWNER';
    `, [hashedOwner]);

    // 2. Ensure 'manjunath' user exists
    await pool.query(`
      INSERT INTO "User" ("id", "username", "fullName", "mobileNumber", "password", "role", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'manjunath', 'Manjunath', '9876543210', $1, 'OWNER', NOW(), NOW())
      ON CONFLICT ("username") DO UPDATE SET "role" = 'OWNER';
    `, [hashedManjunath]);

    console.log('✅ Baseline seeded successfully with owner and manjunath accounts!');
  } catch (err) {
    console.warn('⚠️ Note on seed verification:', err.message);
  }
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedBaselineData();
}

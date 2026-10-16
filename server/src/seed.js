import { pool } from './db.js';
import bcrypt from 'bcryptjs';

export const seedBaselineData = async () => {
  try {
    console.log('🌱 Starting automatic seed & database verification...');

    const hashedOwner = await bcrypt.hash('owner123', 10);

    // 1. Ensure only single 'owner' user exists
    await pool.query(`
      INSERT INTO "User" ("id", "username", "fullName", "mobileNumber", "password", "role", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'owner', 'System Owner', '9876543210', $1, 'OWNER', NOW(), NOW())
      ON CONFLICT ("username") DO UPDATE SET "role" = 'OWNER';
    `, [hashedOwner]);

    // 2. Remove legacy second account if present so only 'owner' remains
    await pool.query(`DELETE FROM "User" WHERE "username" = 'manjunath'`);

    console.log('✅ Baseline seeded successfully with single owner account (owner / owner123)!');
  } catch (err) {
    console.warn('⚠️ Note on seed verification:', err.message);
  }
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedBaselineData().then(() => pool.end());
}

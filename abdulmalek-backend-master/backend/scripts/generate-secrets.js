#!/usr/bin/env node
// ══════════════════════════════════════════════════════
// scripts/generate-secrets.js
// توليد JWT_SECRET و SESSION_SECRET و ADMIN_PASSWORD_HASH
// الاستخدام: node scripts/generate-secrets.js [password]
// ══════════════════════════════════════════════════════

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');

const password = process.argv[2] || 'M.malek.1';

(async () => {
  const jwtSecret  = crypto.randomBytes(64).toString('hex');
  const sessSecret = crypto.randomBytes(32).toString('hex');
  const passHash   = await bcrypt.hash(password, 12);

  console.log('\n=== أضف هذه المتغيرات إلى ملف .env ===\n');
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`SESSION_SECRET=${sessSecret}`);
  console.log(`ADMIN_USERNAME=admin`);
  console.log(`ADMIN_PASSWORD_HASH=${passHash}`);
  console.log('\n=== ملاحظة: الكلمة التي تم تشفيرها ===');
  console.log(`Password: ${password}`);
  console.log('\n📌 لا تشارك هذه القيم مع أي أحد!\n');
})();

// ══════════════════════════════════════════
// db.js — MongoDB Connection
// ══════════════════════════════════════════
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/abdulmalek_portfolio';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ متصل بقاعدة البيانات بنجاح: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    console.error('💡 يرجى التأكد من تشغيل MongoDB أو التحقق من MONGO_URI في ملف .env');
  }
};

module.exports = connectDB;

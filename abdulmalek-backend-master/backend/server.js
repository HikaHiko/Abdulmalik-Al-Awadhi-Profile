// ══════════════════════════════════════════════════════
// server.js — ABDULMALEK Portfolio Backend
// ══════════════════════════════════════════════════════
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const connectDB    = require('./db');

const videosRouter      = require('./routes/videos');
const subscribersRouter = require('./routes/subscribers');
const settingsRouter    = require('./routes/settings');
const adminAuthRouter   = require('./routes/adminAuth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Trust Proxy (Cloudflare / Render / Nginx) ───────
// يضمن قراءة الـ IP الحقيقي خلف Reverse Proxy
app.set('trust proxy', 1);

// ─── Connect MongoDB ───────────────────────────────
connectDB();

// ─── Core Middleware ───────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.ALLOWED_ORIGIN || '*']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-admin-key'],
  credentials: true,  // مطلوب لإرسال الكوكيز عبر CORS
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET)); // يفكّ تشفير الكوكيز

// ─── Cloudflare Security Headers ──────────────────
app.use((req, res, next) => {
  // Cloudflare Connecting IP (أعلى أولوية)
  if (req.headers['cf-connecting-ip']) {
    req.realIp = req.headers['cf-connecting-ip'];
  } else {
    req.realIp = req.ip;
  }
  next();
});

// ─── Static uploads ───────────────────────────────
app.use('/uploads',      express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/temp', express.static(path.join(__dirname, 'uploads', 'temp')));

// ─── Admin Panel (Static) ─────────────────────────
app.use('/admin', express.static(path.join(__dirname, '../frontend', 'admin')));

// ─── API Routes ───────────────────────────────────
app.use('/api/admin',       adminAuthRouter);    // POST /api/admin/login, /logout, /verify
app.use('/api/videos',      videosRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/settings',    settingsRouter);

// ─── Legacy Auth Endpoint (backward compat) ───────
// سيُزال في إصدار مستقبلي — يدعم الآن المصادقة بالكوكي أيضاً
const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('./controllers/authController');

app.get('/api/auth', (req, res) => {
  // الطريقة الجديدة: JWT Cookie
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      return res.json({ success: true, message: 'مصرح · Authorized (JWT)' });
    } catch {
      return res.status(401).json({ success: false, error: 'انتهت صلاحية الجلسة' });
    }
  }
  // الطريقة القديمة: x-admin-key
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  const expectedKey = process.env.ADMIN_KEY;
  if (key && expectedKey && key === expectedKey) {
    return res.json({ success: true, message: 'مصرح · Authorized (legacy)' });
  }
  return res.status(401).json({ success: false, error: 'غير مصرح' });
});

// ─── Client Frontend (Static) ─────────────────────
const mongoose = require('mongoose');
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Health Check ─────────────────────────────────
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status:  '✅ Server is running',
    name:    'ABDULMALEK Portfolio API',
    version: '2.1.0',
    db:      isConnected ? '✅ Connected' : '❌ Disconnected',
    dbHost:  mongoose.connection.host || 'None',
    dbName:  mongoose.connection.name || 'None',
    authMode: 'JWT Cookie + bcrypt',
    endpoints: {
      login:       'POST /api/admin/login',
      logout:      'POST /api/admin/logout',
      verify:      'GET  /api/admin/verify',
      videos:      'GET|POST /api/videos',
      videoUpload: 'POST /api/videos/upload/file',
      subscribers: 'GET|POST /api/subscribers',
      health:      'GET /api/health',
    },
  });
});

// ─── 404 ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// ─── Global Error Handler ─────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'خطأ في السيرفر', details: err.message });
});

// ─── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`  ├─ Auth API:     POST /api/admin/login`);
  console.log(`  ├─ Videos API:   /api/videos`);
  console.log(`  ├─ File Upload:  /api/videos/upload/file`);
  console.log(`  └─ Subscribers:  /api/subscribers\n`);
  console.log(`  🔐 Auth mode: JWT Cookie (bcrypt)`);
  console.log(`  🛡️  Rate limit: 5 attempts / 15 min per IP\n`);
});

// ─── Keep Alive (Render sleep prevention) ─────────
const https = require('https');
setInterval(() => {
  https.get('https://abdulmalek-backend.onrender.com/', (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', () => {});
}, 14 * 60 * 1000);

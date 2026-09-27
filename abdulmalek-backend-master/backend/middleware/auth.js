// ══════════════════════════════════════════════════════
// middleware/auth.js — Admin Authentication Middleware
// JWT Cookie-based + Legacy x-admin-key (backward compat)
// ══════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../controllers/authController');

// ══════════════════════════════════════════════════════
// authenticateAdmin — يحمي مسارات الأدمن
// يقبل:
//   1) كوكيز httpOnly (admin_session) — الطريقة الآمنة الجديدة
//   2) header: x-admin-key — للتوافق العكسي مع الكود القديم
// ══════════════════════════════════════════════════════
const authenticateAdmin = (req, res, next) => {
  // ── طريقة 1: JWT Cookie (الأولوية الأعلى)
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET missing');
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
      req.adminUser = payload;
      return next();
    } catch (err) {
      // الكوكيز موجود لكن منتهي أو تالف — لا نرجع للطريقة القديمة
      return res.status(401).json({
        error: 'انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً',
        code: 'SESSION_EXPIRED',
      });
    }
  }

  // ── طريقة 2: Legacy x-admin-key (للتوافق العكسي المؤقت)
  const legacyKey = req.headers['x-admin-key'] || req.query.adminKey;
  const expectedKey = process.env.ADMIN_KEY;
  if (legacyKey && expectedKey && legacyKey === expectedKey) {
    req.adminUser = { sub: 'admin', role: 'admin', legacy: true };
    return next();
  }

  return res.status(401).json({
    error: 'غير مصرح — يرجى تسجيل الدخول أولاً',
    code: 'UNAUTHORIZED',
  });
};

// ══════════════════════════════════════════════════════
// adminAuth — اسم مختصر للاستخدام في الراوتر (alias)
// ══════════════════════════════════════════════════════
const adminAuth = authenticateAdmin;

// ══════════════════════════════════════════════════════
// Cloudflare Zero Trust — (اختياري)
// افعّل هذا إذا كنت تستخدم Cloudflare Access
// يتحقق من ترويسة CF-Access-JWT-Assertion
// ══════════════════════════════════════════════════════
// const CF_TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN; // e.g. 'myteam.cloudflareaccess.com'
// async function verifyCfAccess(req, res, next) {
//   const cfJwt = req.headers['cf-access-jwt-assertion'];
//   if (!cfJwt || !CF_TEAM_DOMAIN) return next(); // تجاهل إن لم يُفعّل
//   try {
//     // يمكن استخدام مكتبة cloudflare/cloudflare-access-jwt لهذا الغرض
//     next();
//   } catch {
//     return res.status(403).json({ error: 'Cloudflare Access denied' });
//   }
// }

module.exports = { adminAuth, authenticateAdmin };

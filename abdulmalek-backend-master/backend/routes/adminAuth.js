// ══════════════════════════════════════════════════════
// routes/adminAuth.js — Admin Auth & Management Routes
// POST /api/admin/login
// POST /api/admin/logout
// GET  /api/admin/verify
// GET  /api/admin/users
// POST /api/admin/users
// DELETE /api/admin/users/:id
// ══════════════════════════════════════════════════════

const express   = require('express');
const rateLimit = require('express-rate-limit');
const router    = express.Router();
const {
  login,
  logout,
  verify,
  getAdmins,
  createAdmin,
  deleteAdmin,
} = require('../controllers/authController');

const { authenticateAdmin } = require('../middleware/auth');

// ─── Rate Limiter: 5 محاولات / 15 دقيقة لكل IP ──────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 دقيقة
  max: 5,                      // 5 محاولات فقط
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // عدم احتساب المحاولات الناجحة
  validate: { default: false, xForwardedForHeader: false },
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).getTime() : Date.now() + 15 * 60 * 1000;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000 / 60);
    res.status(429).json({
      error: `تجاوزت عدد المحاولات المسموح بها. يرجى الانتظار ${retryAfter > 0 ? retryAfter : 15} دقيقة قبل المحاولة مجدداً.`,
      code: 'TOO_MANY_REQUESTS',
      retryAfter: retryAfter > 0 ? retryAfter : 15,
    });
  },
});

// ─── Auth Routes ──────────────────────────────────────
router.post('/login',  loginLimiter, login);
router.post('/logout', logout);
router.get('/verify',  authenticateAdmin, verify);

// ─── Admin Management Routes ─────────────────────────
router.get('/users',     authenticateAdmin, getAdmins);
router.post('/users',    authenticateAdmin, createAdmin);
router.delete('/users/:id', authenticateAdmin, deleteAdmin);

module.exports = router;

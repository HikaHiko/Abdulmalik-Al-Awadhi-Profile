// ══════════════════════════════════════════════════════
// controllers/authController.js
// Secure Admin Authentication & Management Controller
// ══════════════════════════════════════════════════════

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const Admin  = require('../models/Admin');

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 ساعات
const PROTECTED_ROOT_ADMIN = 'alawadhi'; // اسم المدير العام الرئيسي الذي لا يمكن إزالته

// ─── Helper: Get real IP (Cloudflare + proxy aware) ──
function getRealIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ─── Helper: Build secure cookie options ─────────────
function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: SESSION_DURATION_MS,
    path: '/',
  };
}

// ─── Helper: Seed & Ensure Protected Root Admin ALAWADHI ─
async function ensureInitialAdmin() {
  try {
    const rootUser = (process.env.ADMIN_USERNAME || 'ALAWADHI').toLowerCase().trim();
    const rootHash = process.env.ADMIN_PASSWORD_HASH || '$2b$12$bAQAojueJNsQfOsIb.LmNOzGzXUkXad5BJ8UPNuQDdKQQrZbKq.Na';

    let rootAdmin = await Admin.findOne({ username: rootUser });
    if (!rootAdmin) {
      await Admin.create({
        username: rootUser,
        passwordHash: rootHash,
        name: 'المدير العام ALAWADHI',
        role: 'superadmin',
      });
      console.log(`[Auth Seed] 👑 تم إنشاء المدير العام الرئيسي المحمي: ${rootUser}`);
    } else {
      // التأكد من أن رتبته دائماً superadmin
      if (rootAdmin.role !== 'superadmin' || rootAdmin.passwordHash !== rootHash) {
        rootAdmin.role = 'superadmin';
        rootAdmin.passwordHash = rootHash;
        await rootAdmin.save();
      }
    }
  } catch (err) {
    console.error('[Auth Seed] ⚠️ فشل إعداد المدير الرئيسي:', err.message);
  }
}

// ══════════════════════════════════════════════════════
// POST /api/admin/login
// ══════════════════════════════════════════════════════
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    await ensureInitialAdmin();

    const cleanUsername = username.trim().toLowerCase();

    // البحث في قاعدة البيانات
    let admin = await Admin.findOne({ username: cleanUsername });

    if (!admin) {
      const ip = getRealIp(req);
      console.warn(`[Auth] ⚠️  فشل تسجيل دخول من IP: ${ip} — المستخدم غير موجود: ${cleanUsername}`);
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // التحقق من كلمة المرور عبر bcrypt
    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      const ip = getRealIp(req);
      console.warn(`[Auth] ⚠️  كلمة مرور خاطئة من IP: ${ip} — المستخدم: ${cleanUsername}`);
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // إصدار JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[Auth] ❌ JWT_SECRET غير مضبوط في .env');
      return res.status(500).json({ error: 'إعداد الخادم غير مكتمل' });
    }

    const token = jwt.sign(
      { sub: admin.username, adminId: admin._id, name: admin.name, role: admin.role },
      secret,
      { expiresIn: '8h', algorithm: 'HS256' }
    );

    res.cookie(COOKIE_NAME, token, cookieOptions());

    const ip = getRealIp(req);
    console.log(`[Auth] ✅ دخول ناجح من IP: ${ip} — المستخدم: ${admin.username} (${admin.role})`);

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح · Login successful',
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      }
    });

  } catch (err) {
    console.error('[Auth] خطأ في تسجيل الدخول:', err.message);
    return res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
}

// ══════════════════════════════════════════════════════
// POST /api/admin/logout
// ══════════════════════════════════════════════════════
function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ success: true, message: 'تم تسجيل الخروج · Logged out' });
}

// ══════════════════════════════════════════════════════
// GET /api/admin/verify — التحقق من صحة الجلسة الحالية
// ══════════════════════════════════════════════════════
function verify(req, res) {
  return res.json({
    success: true,
    user: {
      username: req.adminUser.sub,
      id: req.adminUser.adminId,
      name: req.adminUser.name || 'مدير',
      role: req.adminUser.role || 'admin',
    },
  });
}

// ══════════════════════════════════════════════════════
// GET /api/admin/users — جلب جميع المدراء
// ══════════════════════════════════════════════════════
async function getAdmins(req, res) {
  try {
    await ensureInitialAdmin();
    const admins = await Admin.find().select('-passwordHash').sort({ createdAt: -1 });
    return res.json({ success: true, admins });
  } catch (err) {
    console.error('[Admin Mgmt] خطأ جلب المدراء:', err.message);
    return res.status(500).json({ error: 'تعذر جلب قائمة المدراء' });
  }
}

// ══════════════════════════════════════════════════════
// POST /api/admin/users — إضافة مدير جديد
// ══════════════════════════════════════════════════════
async function createAdmin(req, res) {
  try {
    const { username, password, name, role } = req.body;

    // فقط المدير العام (superadmin) يمكنه إنشاء حسابات مدراء جديد
    if (req.adminUser.role !== 'superadmin') {
      return res.status(403).json({
        error: 'غير مصرح للمدير العادي بإضافة مدراء جدد — هذه الصلاحية للمدير العام (Super Admin) فقط',
      });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل' });
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'اسم المستخدم يمكن أن يحتوي على أحرف إنجليزية وأرقام ورموز (- _ .) فقط' });
    }

    // ── فحص قوة كلمة المرور (حروف كبيرة وصغيرة وأرقام ورموز) ──
    if (password.length < 8) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تتكون من 8 عناصر على الأقل' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)' });
    }
    if (!/[@$!%*?&._\-#^()]/.test(password)) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثال: @ $ ! % # _ - .)' });
    }

    const existing = await Admin.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newAdmin = await Admin.create({
      username: cleanUsername,
      passwordHash,
      name: (name && name.trim()) ? name.trim() : cleanUsername,
      role: role === 'superadmin' ? 'superadmin' : 'admin',
    });

    console.log(`[Admin Mgmt] ➕ تم إضافة مدير جديد: ${cleanUsername} بواسطة ${req.adminUser.sub}`);

    return res.status(201).json({
      success: true,
      message: 'تم إضافة المدير بنجاح',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt,
      },
    });

  } catch (err) {
    console.error('[Admin Mgmt] خطأ إضافة مدير:', err.message);
    return res.status(500).json({ error: 'فشل في إضافة المدير' });
  }
}

// ══════════════════════════════════════════════════════
// DELETE /api/admin/users/:id — حذف مدير
// ══════════════════════════════════════════════════════
async function deleteAdmin(req, res) {
  try {
    const { id } = req.params;
    const callerRole = req.adminUser.role || 'admin';
    const callerSub = (req.adminUser.sub || '').toLowerCase();

    // 1. المدير العادي (admin) لا يستطيع حذف أي مدير أو مدير عام
    if (callerRole !== 'superadmin') {
      return res.status(403).json({
        error: 'غير مصرح للمدير العادي بحذف أي حساب — هذه الصلاحية للمدير العام (Super Admin) فقط',
      });
    }

    const targetAdmin = await Admin.findById(id);
    if (!targetAdmin) {
      return res.status(404).json({ error: 'المدير غير موجود' });
    }

    const targetUsername = targetAdmin.username.toLowerCase();

    // 2. لا يمكن لأي مدير عام حذف المدير العام الرئيسي ALAWADHI
    if (targetUsername === PROTECTED_ROOT_ADMIN) {
      return res.status(403).json({
        error: 'غير مصرح — لا يمكن إزالة أو حذف المدير العام الرئيسي (ALAWADHI) مطلقاً',
      });
    }

    // 3. منع الحساب من حذف نفسه
    if (
      (req.adminUser.adminId && String(req.adminUser.adminId) === String(id)) ||
      (callerSub === targetUsername)
    ) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول منه' });
    }

    await Admin.findByIdAndDelete(id);

    console.log(`[Admin Mgmt] 🗑️  تم حذف المدير: ${targetAdmin.username} بواسطة ${req.adminUser.sub}`);

    return res.json({
      success: true,
      message: 'تم حذف المدير بنجاح',
    });

  } catch (err) {
    console.error('[Admin Mgmt] خطأ حذف مدير:', err.message);
    return res.status(500).json({ error: 'فشل في حذف المدير' });
  }
}

module.exports = {
  login,
  logout,
  verify,
  getAdmins,
  createAdmin,
  deleteAdmin,
  COOKIE_NAME,
};

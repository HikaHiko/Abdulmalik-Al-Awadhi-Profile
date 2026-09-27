// ══════════════════════════════════════════
// routes/settings.js — Portfolio Settings API
// ══════════════════════════════════════════

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const { adminAuth } = require('../middleware/auth');
const upload   = require('../middleware/upload');
const Settings = require('../models/Settings');

// دالة مساعدة لحذف الملفات القديمة من المجلد محلياً
const safeDeleteFile = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) return;
  const relativePath = fileUrl.replace(/^\/uploads\//, '');
  const absolutePath = path.join(__dirname, '..', 'uploads', relativePath);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
      console.log(`[Settings] 🗑️ تم حذف الملف: ${absolutePath}`);
    } catch (err) {
      console.warn(`[Settings] ⚠️ فشل حذف الملف: ${err.message}`);
    }
  }
};

// GET /api/settings — جلب الإعدادات
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'main' });
    if (!settings) settings = await Settings.create({ key: 'main' });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات', details: err.message });
  }
});

// POST /api/settings — حفظ الإعدادات النصية والرابط مباشرة
router.post('/', adminAuth, async (req, res) => {
  try {
    const { contact, bgVideoUrl, videoLoopUrl, heroImageUrl, heroBgType } = req.body;
    const update = { updatedAt: new Date() };

    if (contact) update.contact = contact;
    if (bgVideoUrl   !== undefined) update.bgVideoUrl   = bgVideoUrl;
    if (videoLoopUrl !== undefined) update.videoLoopUrl = videoLoopUrl;
    if (heroImageUrl !== undefined) update.heroImageUrl = heroImageUrl;
    if (heroBgType   !== undefined) update.heroBgType   = heroBgType;

    const settings = await Settings.findOneAndUpdate(
      { key: 'main' },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: settings, message: '✓ تم حفظ الإعدادات بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الإعدادات', details: err.message });
  }
});

// ══════════════════════════════════════════
// POST /api/settings/video-loop — رفع ملف فيديو اللوب
// ══════════════════════════════════════════
router.post('/video-loop', adminAuth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرفاق أي ملف فيديو' });
    }

    // ننقل الملف من temp إلى uploads مباشرة
    const tempPath = req.file.path;
    const finalFileName = `loop-${Date.now()}${path.extname(req.file.originalname)}`;
    const finalPath = path.join(__dirname, '..', 'uploads', finalFileName);

    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, finalPath);
    }

    const fileUrl = `/uploads/${finalFileName}`;

    // جلب الإعدادات الحالية لحذف الفيديو القديم إذا كان مرفوعاً
    const oldSettings = await Settings.findOne({ key: 'main' });
    if (oldSettings && oldSettings.videoLoopUrl) {
      safeDeleteFile(oldSettings.videoLoopUrl);
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'main' },
      {
        $set: {
          videoLoopUrl: fileUrl,
          heroBgType: 'video',
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: settings,
      message: '✓ تم رفع فيديو اللوب وحفظه بنجاح'
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في رفع فيديو اللوب', details: err.message });
  }
});

// ══════════════════════════════════════════
// DELETE /api/settings/video-loop — حذف فيديو اللوب
// ══════════════════════════════════════════
const deleteVideoLoopHandler = async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'main' });
    if (settings && settings.videoLoopUrl) {
      safeDeleteFile(settings.videoLoopUrl);
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      { key: 'main' },
      {
        $set: {
          videoLoopUrl: '',
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: updatedSettings,
      message: '✓ تم حذف فيديو اللوب بنجاح'
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف فيديو اللوب', details: err.message });
  }
};

router.delete('/video-loop', adminAuth, deleteVideoLoopHandler);
router.post('/delete-video-loop', adminAuth, deleteVideoLoopHandler);

// ══════════════════════════════════════════
// POST /api/settings/hero-image — رفع صورة خلفية الرئيسية Hero Image
// ══════════════════════════════════════════
router.post('/hero-image', adminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرفاق أي ملف صورة' });
    }

    const tempPath = req.file.path;
    const finalFileName = `hero-img-${Date.now()}${path.extname(req.file.originalname)}`;
    const finalPath = path.join(__dirname, '..', 'uploads', finalFileName);

    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, finalPath);
    }

    const fileUrl = `/uploads/${finalFileName}`;

    const oldSettings = await Settings.findOne({ key: 'main' });
    if (oldSettings && oldSettings.heroImageUrl) {
      safeDeleteFile(oldSettings.heroImageUrl);
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'main' },
      {
        $set: {
          heroImageUrl: fileUrl,
          heroBgType: 'image',
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: settings,
      message: '✓ تم رفع صورة الخلفية وحفظها بنجاح'
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في رفع صورة الخلفية', details: err.message });
  }
});

// ══════════════════════════════════════════
// DELETE /api/settings/hero-image — حذف صورة خلفية الرئيسية Hero Image
// ══════════════════════════════════════════
const deleteHeroImageHandler = async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'main' });
    if (settings && settings.heroImageUrl) {
      safeDeleteFile(settings.heroImageUrl);
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      { key: 'main' },
      {
        $set: {
          heroImageUrl: '',
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: updatedSettings,
      message: '✓ تم حذف صورة الخلفية بنجاح'
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف صورة الخلفية', details: err.message });
  }
};

router.delete('/hero-image', adminAuth, deleteHeroImageHandler);
router.post('/delete-hero-image', adminAuth, deleteHeroImageHandler);

// ══════════════════════════════════════════
// GET /api/settings/categories — جلب جميع التصنيفات
// ══════════════════════════════════════════
router.get('/categories', async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'main' });
    if (!settings) {
      settings = await Settings.create({ key: 'main' });
    }
    
    // Initial setup if categories array is missing or empty
    if (!settings.categories || settings.categories.length === 0) {
      const defaultCats = Settings.DEFAULT_CATEGORIES || [
        'Reels', 'Events', 'Short Films', 'Ads', 'Interviews', 'BTS',
        'Podcast', 'Brand Films', 'Music Videos', 'Documentaries',
        'Social Media', 'Commercial', 'Promo', 'Recap'
      ];
      const customCats = settings.customCategories || [];
      const merged = [...new Set([...defaultCats, ...customCats])];
      settings = await Settings.findOneAndUpdate(
        { key: 'main' },
        { $set: { categories: merged } },
        { new: true }
      );
    }

    res.json({ success: true, data: settings.categories || [] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب التصنيفات', details: err.message });
  }
});

// ══════════════════════════════════════════
// POST /api/settings/categories — إضافة تصنيف جديد
// ══════════════════════════════════════════
router.post('/categories', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم التصنيف مطلوب' });
    }
    const trimmedName = name.trim();

    let settings = await Settings.findOne({ key: 'main' });
    if (!settings) {
      settings = new Settings({ key: 'main', categories: [...Settings.DEFAULT_CATEGORIES] });
    }

    const currentCats = settings.categories || [...Settings.DEFAULT_CATEGORIES];

    if (currentCats.some(c => String(c).toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(409).json({ error: 'هذا التصنيف موجود بالفعل' });
    }

    settings.categories.push(trimmedName);
    if (!settings.customCategories) settings.customCategories = [];
    if (!settings.customCategories.includes(trimmedName)) {
      settings.customCategories.push(trimmedName);
    }
    settings.updatedAt = new Date();
    await settings.save();

    res.json({ success: true, data: settings.categories, message: `✓ تم إضافة التصنيف "${trimmedName}"` });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة التصنيف', details: err.message });
  }
});

// ══════════════════════════════════════════
// DELETE /api/settings/categories/:name — حذف تصنيف (أي تصنيف)
// ══════════════════════════════════════════
router.delete('/categories/:name', adminAuth, async (req, res) => {
  try {
    const catName = decodeURIComponent(req.params.name);
    let settings = await Settings.findOne({ key: 'main' });
    if (!settings) {
      settings = new Settings({ key: 'main', categories: [...Settings.DEFAULT_CATEGORIES] });
    }

    settings.categories = (settings.categories || []).filter(c => String(c).toLowerCase() !== catName.toLowerCase());
    settings.customCategories = (settings.customCategories || []).filter(c => String(c).toLowerCase() !== catName.toLowerCase());
    settings.updatedAt = new Date();
    await settings.save();

    res.json({ success: true, data: settings.categories, message: `✓ تم حذف التصنيف "${catName}"` });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف التصنيف', details: err.message });
  }
});

module.exports = router;

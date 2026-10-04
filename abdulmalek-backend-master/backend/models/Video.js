// ══════════════════════════════════════════
// models/Video.js — MongoDB Schema
// ══════════════════════════════════════════

const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  videoUrl:    { type: String, default: '' },  // رابط خارجي (YouTube/Vimeo)
  filePath:    { type: String, default: '' },  // مسار الملف المرفوع محلياً
  thumbnail:   { type: String, default: '' },
  category:    { type: String, default: '' },
  duration:    { type: String, default: '' },
  channel:     { type: String, default: '' },
  views:            { type: Number,  default: 0 },
  compressing:      { type: Boolean, default: false }, // true بينما الضغط جاري
  compressionFailed:{ type: Boolean, default: false }, // true لو فشل الضغط
  isPinned:         { type: Boolean, default: false }, // true = مثبّت في أعلى الصفحة
  pinnedAt:         { type: Date,    default: null  }, // وقت التثبيت (آخر فيديو مثبّت يظهر أولاً)
  createdAt:        { type: Date,    default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);

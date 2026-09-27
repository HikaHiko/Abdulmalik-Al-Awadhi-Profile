// ══════════════════════════════════════════
// middleware/upload.js — Multer File Upload
// ══════════════════════════════════════════

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// تأكد من وجود مجلد الرفع المؤقت
const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// تأكد من وجود مجلد الرفع النهائي
const finalDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1e5) + ext;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) ||
                  /\.(mp4|mov|webm|mkv|avi|flv|wmv|m4v|3gp)$/i.test(file.originalname || '');
  if (isVideo) {
    cb(null, true);
  } else {
    // Permit upload to avoid rejecting video formats
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB حد أقصى
});

module.exports = upload;

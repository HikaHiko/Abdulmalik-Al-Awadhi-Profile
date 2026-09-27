// ══════════════════════════════════════════
// routes/videos.js
// ══════════════════════════════════════════

const express  = require('express');
const router   = express.Router();
const { adminAuth } = require('../middleware/auth');
const upload   = require('../middleware/upload');
const {
  getVideos, getVideo, addVideo, uploadVideo, fetchVideoMetadata,
  updateVideo, deleteVideo, incrementView,
  updateVideoCategory, getCompressionStatus
} = require('../controllers/videos');

// Public
router.get('/',              getVideos);          // GET  /api/videos
router.get('/oembed',        fetchVideoMetadata); // GET  /api/videos/oembed
router.get('/:id',           getVideo);           // GET  /api/videos/:id
router.patch('/:id/view',    incrementView);      // PATCH /api/videos/:id/view

// Admin — بـ URL رابط خارجي
router.post('/',             adminAuth, addVideo);    // POST   /api/videos
router.put('/:id',           adminAuth, updateVideo); // PUT    /api/videos/:id
router.delete('/:id',        adminAuth, deleteVideo); // DELETE /api/videos/:id

// Admin — رفع ملف مباشر
router.post('/upload/file',  adminAuth, upload.single('video'), uploadVideo); // POST /api/videos/upload/file

// Admin — تحديث التصنيف فقط
router.put('/:id/category',            adminAuth, updateVideoCategory);      // PUT    /api/videos/:id/category

// Public — حالة ضغط الفيديو
router.get('/:id/compression-status',  getCompressionStatus);               // GET    /api/videos/:id/compression-status

module.exports = router;

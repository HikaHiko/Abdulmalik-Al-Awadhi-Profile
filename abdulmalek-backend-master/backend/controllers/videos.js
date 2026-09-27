// ══════════════════════════════════════════
// controllers/videos.js
// ══════════════════════════════════════════

const path             = require('path');
const fs               = require('fs');
const Video            = require('../models/Video');
const { compressVideoAV1 } = require('../services/videoProcessorAV1');

// GET /api/videos
const getVideos = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const videos = await Video.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: videos, count: videos.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الفيديوهات', details: err.message });
  }
};

// GET /api/videos/:id
const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });
    res.json({ success: true, data: video });
  } catch (err) {
    res.status(500).json({ error: 'خطأ', details: err.message });
  }
};

// POST /api/videos — إضافة بـ URL
const addVideo = async (req, res) => {
  try {
    const { title, video_url, category, duration, description, thumbnail, channel } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'العنوان مطلوب' });

    const video = await Video.create({
      title: title.trim(),
      videoUrl:    video_url   || '',
      category:    category    || '',
      duration:    duration    || '',
      description: description || '',
      thumbnail:   thumbnail   || '',
      channel:     channel     || ''
    });

    res.status(201).json({ success: true, data: video, message: '✓ تم إضافة الفيديو' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة الفيديو', details: err.message });
  }
};

// POST /api/videos/upload/file — رفع ملف فيديو وضغطه تلقائياً في الخلفية
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });

    const { title, description, category, duration, channel, thumbnail } = req.body;
    const videoTitle = (title && title.trim())
      ? title.trim()
      : req.file.originalname.replace(/\.[^/.]+$/, '');

    // المسار المؤقت للملف الأصلي قبل الضغط
    const tempFilePath = req.file.path;
    // مسار مؤقت مبدئي حتى تكتمل عملية الضغط (uploads/temp/filename)
    const tempFileUrl = `/uploads/temp/${req.file.filename}`;

    // Safe thumbnail string limit (prevent BSON / payload overflow)
    let safeThumbnail = (thumbnail && typeof thumbnail === 'string') ? thumbnail.trim() : '';
    if (safeThumbnail.length > 300000) safeThumbnail = '';

    // إنشاء سجل الفيديو في قاعدة البيانات فوراً (بالمسار المؤقت أولاً)
    let video;
    try {
      video = await Video.create({
        title:       videoTitle,
        videoUrl:    tempFileUrl,
        filePath:    tempFilePath.replace(/\\/g, '/'),
        category:    category    || '',
        duration:    duration    || '',
        description: description || '',
        channel:     channel     || '',
        thumbnail:   safeThumbnail,
        compressing: true   // علم بأن الضغط جاري
      });
    } catch (dbErr) {
      console.error('MongoDB Video.create error:', dbErr.message);
      video = await Video.create({
        title:       videoTitle,
        videoUrl:    tempFileUrl,
        filePath:    tempFilePath.replace(/\\/g, '/'),
        category:    category || '',
        duration:    duration || '',
        description: description || '',
        channel:     channel || ''
      });
    }

    // الرد الفوري على العميل — الضغط يبدأ في الخلفية
    res.status(201).json({
      success: true,
      data: video,
      message: '✔ تم استلام الفيديو وجاري ضغطه تلقائياً...',
      compressing: true
    });

    // ═══════════════════════════════════════════════════════
    // عملية الضغط في الخلفية — Non-blocking
    // ═══════════════════════════════════════════════════════
    const compressedFileName = `${path.basename(tempFilePath, path.extname(tempFilePath))}-compressed-${Date.now()}.mp4`;
    const finalOutputPath = path.join(__dirname, '../uploads', compressedFileName);

    compressVideoAV1(tempFilePath, finalOutputPath)
      .then(async (finalPath) => {
        try {
          const compressedUrl  = `/uploads/${path.basename(finalPath)}`;
          const compressedFile = finalPath.replace(/\\/g, '/');

          await Video.findByIdAndUpdate(video._id, {
            videoUrl:    compressedUrl,
            filePath:    compressedFile,
            compressing: false
          });

          console.log(`[Upload] ✅ Video record updated with AV1 compressed file: ${compressedUrl}`);
        } catch (updateErr) {
          console.error('[Upload] ❌ Failed to update video record after AV1 compression:', updateErr.message);
        }
      })
      .catch(async (compressErr) => {
        console.error('[Upload] ❌ AV1 Compression failed, keeping original temp file URL.');
        try {
          await Video.findByIdAndUpdate(video._id, {
            compressing: false,
            compressionFailed: true
          });
        } catch (err) {
          console.error('[Upload] ❌ Failed to update compression failed flag:', err.message);
        }
      });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: 'خطأ في حفظ بيانات الفيديو', details: err.message });
  }
};

// GET /api/videos/oembed — جلب معلومات الفيديو من الرابط توماتيكياً
const fetchVideoMetadata = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'الرابط مطلوب' });

    let data = { title: '', channel: '', thumbnail: '', duration: '', description: '', platform: 'other' };

    if (/youtube\.com|youtu\.be/.test(url)) {
      data.platform = 'youtube';
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (oembedRes.ok) {
          const json = await oembedRes.json();
          data.title = json.title || '';
          data.channel = json.author_name || '';
          data.thumbnail = json.thumbnail_url || '';
        }
      } catch (e) {}
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1] && !data.thumbnail) {
        data.thumbnail = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      }
    } else if (/vimeo\.com/.test(url)) {
      data.platform = 'vimeo';
      try {
        const oembedRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
        if (oembedRes.ok) {
          const json = await oembedRes.json();
          data.title = json.title || '';
          data.channel = json.author_name || '';
          data.thumbnail = json.thumbnail_url || '';
          data.description = json.description || '';
          if (json.duration) {
            const m = Math.floor(json.duration / 60);
            const s = json.duration % 60;
            data.duration = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          }
        }
      } catch (e) {}
    } else if (/instagram\.com|instagr\.am/.test(url)) {
      data.platform = 'instagram';
      const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        const shortcode = match[1];
        data.title = 'Instagram Reel';
        data.channel = 'Instagram';
      }
      // Try Facebook Graph oEmbed (works without access token for public content)
      try {
        const oembedRes = await fetch(`https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&omitscript=true`);
        if (oembedRes.ok) {
          const json = await oembedRes.json();
          if (json.title) data.title = json.title;
          if (json.author_name) data.channel = json.author_name;
          if (json.thumbnail_url) data.thumbnail = json.thumbnail_url;
        }
      } catch (e) {}
    } else if (/tiktok\.com/.test(url)) {
      data.platform = 'tiktok';
      try {
        const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
        if (oembedRes.ok) {
          const json = await oembedRes.json();
          data.title = json.title || '';
          data.channel = json.author_name || '';
          data.thumbnail = json.thumbnail_url || '';
        }
      } catch (e) {}
    } else if (/drive\.google\.com/.test(url)) {
      data.platform = 'gdrive';
      const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
      if (match && match[1]) {
        const fileId = match[1];
        data.title = 'فيديو Google Drive';
        data.thumbnail = `https://lh3.googleusercontent.com/u/0/d/${fileId}=w600`;
      }
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الفيديو', details: err.message });
  }
};

// PUT /api/videos/:id
const updateVideo = async (req, res) => {
  try {
    const { title, video_url, category, duration, description, thumbnail, channel } = req.body;

    const existingVideo = await Video.findById(req.params.id);
    if (!existingVideo) return res.status(404).json({ error: 'الفيديو غير موجود' });

    let safeThumbnail = (thumbnail !== undefined && thumbnail !== null)
      ? (typeof thumbnail === 'string' ? thumbnail.trim() : '')
      : existingVideo.thumbnail;
    if (safeThumbnail.length > 300000) safeThumbnail = existingVideo.thumbnail || '';

    const updateFields = {
      title: (title !== undefined && title.trim()) ? title.trim() : existingVideo.title,
      category: (category !== undefined) ? category.trim() : existingVideo.category,
      duration: (duration !== undefined) ? duration.trim() : existingVideo.duration,
      description: (description !== undefined) ? description.trim() : existingVideo.description,
      channel: (channel !== undefined) ? channel.trim() : existingVideo.channel,
      thumbnail: safeThumbnail
    };

    if (video_url !== undefined && video_url.trim()) {
      updateFields.videoUrl = video_url.trim();
    } else if (existingVideo.videoUrl) {
      updateFields.videoUrl = existingVideo.videoUrl;
    }

    const video = await Video.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: video, message: '✓ تم تعديل الفيديو' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تعديل الفيديو', details: err.message });
  }
};

// DELETE /api/videos/:id
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });

    // احذف الملف من الديسك لو كان مرفوعاً محلياً
    if (video.filePath && fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }

    res.json({ success: true, message: '✓ تم حذف الفيديو' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الفيديو', details: err.message });
  }
};

// PATCH /api/videos/:id/view
const incrementView = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });
    res.json({ success: true, views: video.views });
  } catch (err) {
    res.status(500).json({ error: 'خطأ', details: err.message });
  }
};

// PUT /api/videos/:id/category — تحديث التصنيف فقط
const updateVideoCategory = async (req, res) => {
  try {
    const { category } = req.body;

    if (category === undefined) {
      return res.status(400).json({ error: 'حقل category مطلوب' });
    }

    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { category: category.trim() },
      { new: true, runValidators: true }
    );

    if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });

    res.json({ success: true, data: video, message: '✓ تم تحديث التصنيف' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث التصنيف', details: err.message });
  }
};

// GET /api/videos/:id/compression-status — تحقق من حالة ضغط الفيديو
const getCompressionStatus = async (req, res) => {
  try {
    const video = await Video.findById(
      req.params.id,
      'compressing compressionFailed videoUrl'
    );
    if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });

    res.json({
      success:          true,
      compressing:      video.compressing      || false,
      compressionFailed:video.compressionFailed|| false,
      done:             !video.compressing && !video.compressionFailed,
      videoUrl:         video.videoUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ', details: err.message });
  }
};

module.exports = {
  getVideos, getVideo, addVideo, uploadVideo, fetchVideoMetadata,
  updateVideo, deleteVideo, incrementView, updateVideoCategory,
  getCompressionStatus
};

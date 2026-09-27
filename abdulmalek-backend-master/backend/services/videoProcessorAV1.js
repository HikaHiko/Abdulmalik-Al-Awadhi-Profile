// ══════════════════════════════════════════════════════════════
// services/videoProcessorAV1.js
// ══════════════════════════════════════════════════════════════
// Video compression service using the highly efficient AV1 Codec
// Encoding: AV1 (libsvtav1) + AAC | CRF: 28 | Preset: 6
// ══════════════════════════════════════════════════════════════

'use strict';

const ffmpeg     = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs         = require('fs');

// توجيه fluent-ffmpeg لاستخدام النسخة المدمجة من FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * دالة لحذف ملف بأمان مع تجاهل الأخطاء البسيطة
 * @param {string} filePath مسار الملف
 */
function safeDelete(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[AV1-Compressor] 🗑️  تم حذف الملف المؤقت: ${filePath}`);
    }
  } catch (err) {
    console.warn(`[AV1-Compressor] ⚠️  لا يمكن حذف ${filePath}:`, err.message);
  }
}

/**
 * تنفيذ عملية الضغط بترميز AV1 عبر ffmpeg
 * @param {string} inputPath مسار ملف المصدر المراد ضغطه
 * @param {string} outputPath مسار حفظ الملف المضغوط النهائي
 * @returns {Promise<string>} يعود بالمسار النهائي عند النجاح
 */
function compressVideoAV1(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`[AV1-Compressor] 🎬 بدء ضغط الفيديو بترميز AV1...`);
    console.log(`[AV1-Compressor]    المصدر: ${inputPath}`);
    console.log(`[AV1-Compressor]    الهدف: ${outputPath}`);

    const startedAt = Date.now();

    ffmpeg(inputPath)
      // ── إعدادات الفيديو (H.264 / libx264 لتحقيق توافقية 100% مع جميع المتصفحات) ───
      .videoCodec('libx264')
      .addOption('-crf', '33')            // رفع قيمة CRF لزيادة الضغط وتقليل الحجم بنسبة هائلة (60%-70%)
      .addOption('-preset', 'veryfast')   // توازن مثالي بين السرعة وتقليل الحجم
      .addOption('-pix_fmt', 'yuv420p')   // دعم كامل للتوافقية مع المتصفحات ومشغلات الميديا
      .videoFilters("scale='min(iw,1280):min(ih,720)':force_original_aspect_ratio=decrease") // تقليص دقة العرض إلى 720p كحد أقصى
      .fps(30)                            // تحديد الإطارات بـ 30fps

      // ── إعدادات الصوت ───────────────────────────────
      .audioCodec('aac')
      .audioBitrate('96k')                // خفض بيتريت الصوت لتقليل الحجم
      
      // ── إعدادات المخرجات ────────────────────────────
      .outputFormat('mp4')
      .addOption('-movflags', '+faststart')

      // ── أحداث المراقبة والتحكم ───────────────────────
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log(`[Compressor] ▶️  بدأت عملية FFmpeg`);
      })
      .on('progress', (progress) => {
        if (progress.percent != null) {
          process.stdout.write(`\r[Compressor] ⏳ التقدم: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(`\n[Compressor] ✅ تمت عملية الضغط بنجاح في ${elapsed} ثانية!`);
        
        // حذف الملف الأصلي المؤقت فقط عند النجاح
        safeDelete(inputPath);
        
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`\n[Compressor] ❌ فشل الضغط:`, err.message);
        
        // تم إزالة حذف الملف الأصلي (inputPath) هنا لكي لا تفقد الفيديو!
        safeDelete(outputPath);
        
        reject(err);
      })
      .run();
  });
}

module.exports = { compressVideoAV1 };

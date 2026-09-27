// ══════════════════════════════════════════════════════════════
// services/videoCompressor.js — Video Compression Service
// ══════════════════════════════════════════════════════════════
// Uses fluent-ffmpeg + ffmpeg-static (no system FFmpeg needed)
// Encoding: H.264 (libx264) + AAC | CRF: 24 | Preset: fast
// ══════════════════════════════════════════════════════════════

'use strict';

const ffmpeg      = require('fluent-ffmpeg');
const ffmpegPath  = require('ffmpeg-static');
const path        = require('path');
const fs          = require('fs');

// Point fluent-ffmpeg to the bundled static binary
ffmpeg.setFfmpegPath(ffmpegPath);

// Output directory: uploads/ (sibling of temp/)
const OUTPUT_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function safeDelete(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[Compressor] Deleted temp file: ' + path.basename(filePath));
    }
  } catch (err) {
    console.warn('[Compressor] Could not delete ' + filePath + ':', err.message);
  }
}

function buildOutputPath(inputPath) {
  const basename = path.basename(inputPath, path.extname(inputPath));
  const filename  = basename + '-compressed-' + Date.now() + '.mp4';
  return path.join(OUTPUT_DIR, filename);
}

function compressVideo(inputPath, options, onDone, onError) {
  if (typeof options === 'function') {
    onError = onDone;
    onDone  = options;
    options = {};
  }
  options = options || {};

  const crf    = options.crf    || 24;
  const preset = options.preset || 'fast';

  const outputPath = buildOutputPath(inputPath);
  const startedAt  = Date.now();

  console.log('[Compressor] Starting compression...');
  console.log('[Compressor]   Input  : ' + path.basename(inputPath));
  console.log('[Compressor]   Output : ' + path.basename(outputPath));
  console.log('[Compressor]   CRF=' + crf + ' | Preset=' + preset);

  ffmpeg(inputPath)
    .videoCodec('libx264')
    // زيادة قيمة CRF لتقليل الحجم (28-32 تعتبر ممتازة للويب)
    .addOption('-crf', '30')
    .addOption('-preset', preset)
    // تحجيم الفيديو إلى أقصى دقة 720p لضمان تقليص الحجم بشكل هائل
    .videoFilters("scale='min(1280,iw)':min'(720,ih)':force_original_aspect_ratio=decrease")
    // تحديد أقصى معدل إطارات بـ 30
    .fps(30)
    .audioCodec('aac')
    // تقليل معدل نقل الصوت قليلاً للمساهمة في تقليص الحجم
    .audioBitrate('96k')
    .outputFormat('mp4')
    .addOption('-movflags', '+faststart')
    .output(outputPath)
    .on('start', function() {
      console.log('[Compressor] FFmpeg process started');
    })
    .on('progress', function(progress) {
      if (progress.percent != null) {
        process.stdout.write('\r[Compressor] Progress: ' + Math.round(progress.percent) + '%');
      }
    })
    .on('end', function() {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log('\n[Compressor] Done in ' + elapsed + 's -> ' + path.basename(outputPath));
      safeDelete(inputPath);
      if (typeof onDone === 'function') onDone(null, outputPath);
    })
    .on('error', function(err) {
      console.error('\n[Compressor] Failed:', err.message);
      safeDelete(inputPath);
      safeDelete(outputPath);
      if (typeof onError === 'function') onError(err);
    })
    .run();
}

function compressVideoAsync(inputPath, options) {
  return new Promise(function(resolve, reject) {
    compressVideo(inputPath, options || {}, resolve, reject);
  });
}

module.exports = { compressVideo, compressVideoAsync };

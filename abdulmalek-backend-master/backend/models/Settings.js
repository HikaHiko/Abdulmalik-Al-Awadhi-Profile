// ══════════════════════════════════════════
// models/Settings.js — MongoDB Schema
// ══════════════════════════════════════════

const mongoose = require('mongoose');

const DEFAULT_CATEGORIES = [
  'Reels', 'Events', 'Short Films', 'Ads', 'Interviews', 'BTS',
  'Podcast', 'Brand Films', 'Music Videos', 'Documentaries',
  'Social Media', 'Commercial', 'Promo', 'Recap'
];

const settingsSchema = new mongoose.Schema({
  key:   { type: String, default: 'main', unique: true },
  contact: {
    wa: { type: String, default: '' },
    ig: { type: String, default: '' },
    li: { type: String, default: '' }
  },
  bgVideoUrl: { type: String, default: '' },
  videoLoopUrl: { type: String, default: '' },
  heroImageUrl: { type: String, default: '' },
  heroBgType:   { type: String, default: 'video' }, // 'video' | 'image' | 'none'
  categories:   { type: [String], default: DEFAULT_CATEGORIES }, // Fully editable & deletable categories
  customCategories: { type: [String], default: [] },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
module.exports.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;


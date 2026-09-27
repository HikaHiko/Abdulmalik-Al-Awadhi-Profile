// ══════════════════════════════════════════
// controllers/subscribers.js
// ══════════════════════════════════════════

const Subscriber = require('../models/Subscriber');

// POST /api/subscribers
const subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'بريد إلكتروني غير صحيح' });
    }

    const sub = await Subscriber.create({ email: email.trim().toLowerCase() });
    res.status(201).json({ success: true, message: '✓ تم الاشتراك بنجاح' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'أنت مشترك بالفعل!' });
    }
    res.status(500).json({ error: 'خطأ في الاشتراك', details: err.message });
  }
};

// GET /api/subscribers (أدمن)
const getSubscribers = async (req, res) => {
  try {
    const subs = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ success: true, data: subs, count: subs.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ', details: err.message });
  }
};

// DELETE /api/subscribers/:id (أدمن — حذف مشترك واحد)
const deleteSubscriber = async (req, res) => {
  try {
    const sub = await Subscriber.findByIdAndDelete(req.params.id);
    if (!sub) return res.status(404).json({ error: 'المشترك غير موجود' });
    res.json({ success: true, message: '✓ تم حذف المشترك بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف المشترك', details: err.message });
  }
};

// DELETE /api/subscribers (أدمن — حذف جميع المشتركين)
const deleteAllSubscribers = async (req, res) => {
  try {
    await Subscriber.deleteMany({});
    res.json({ success: true, message: '✓ تم حذف كافة المشتركين بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف المشتركين', details: err.message });
  }
};

module.exports = { subscribe, getSubscribers, deleteSubscriber, deleteAllSubscribers };

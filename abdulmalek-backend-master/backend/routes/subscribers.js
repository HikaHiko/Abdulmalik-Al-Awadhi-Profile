// ══════════════════════════════════════════
// routes/subscribers.js
// ══════════════════════════════════════════

const express  = require('express');
const router   = express.Router();
const { adminAuth } = require('../middleware/auth');
const { subscribe, getSubscribers, deleteSubscriber, deleteAllSubscribers } = require('../controllers/subscribers');

router.post('/',    subscribe);                                // POST   /api/subscribers
router.get('/',     adminAuth, getSubscribers);                // GET    /api/subscribers (أدمن)
router.delete('/:id', adminAuth, deleteSubscriber);             // DELETE /api/subscribers/:id (أدمن)
router.delete('/',  adminAuth, deleteAllSubscribers);          // DELETE /api/subscribers (أدمن)

module.exports = router;

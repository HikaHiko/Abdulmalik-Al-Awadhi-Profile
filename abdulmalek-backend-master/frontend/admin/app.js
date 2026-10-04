/* ══════════════════════════════════════════════════════
   ABDULMALEK Admin Dashboard — app.js
   Full SPA Logic · API Integration · RTL Support
   Auth: JWT Cookie (httpOnly) + bcrypt
══════════════════════════════════════════════════════ */

// ── CONFIG ─────────────────────────────────────────
const API_BASE = (window.location.origin && window.location.origin.startsWith('http'))
  ? `${window.location.origin}/api`
  : 'http://localhost:3000/api';

// ADMIN_KEY مُبقى للتوافق العكسي فقط — المصادقة الحقيقية عبر الكوكيز الآن
let ADMIN_KEY = '';
let allVideos = [];
let allSubscribers = [];
let allAdmins = [];
let cachedManagedCategories = [];
let adminActiveCategory = 'ALL';
let currentUserRole = 'admin';
let currentUsername = '';

// ══════════════════════════════════════════════════════
// ── AUTH & SESSION (JWT Cookie-based)
// ══════════════════════════════════════════════════════

function saveSession(key) {
  // نحفظ فقط علامة "مسجّل دخوله" — الكوكيز httpOnly لا تُقرأ من JS
  sessionStorage.setItem('abdulmalek_admin_logged', '1');
  // للتوافق العكسي مع مكالمات API القديمة
  if (key) sessionStorage.setItem('abdulmalek_admin_key', key);
}

function loadSession() {
  return sessionStorage.getItem('abdulmalek_admin_logged') === '1';
}

function clearSession() {
  sessionStorage.removeItem('abdulmalek_admin_logged');
  sessionStorage.removeItem('abdulmalek_admin_key');
  ADMIN_KEY = '';
}

// ── Toggle password visibility
document.getElementById('toggle-key-visibility')?.addEventListener('click', () => {
  const input = document.getElementById('admin-key-input');
  const icon = document.getElementById('eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
});

let isRateLimited = false;

function updateUserInfoUI(user) {
  if (!user) return;
  currentUserRole = user.role || 'admin';
  currentUsername = user.username || '';
  const displayName = user.name || user.username || 'Admin';

  // 1. تحديث اسم الصورة واسم المستخدم في الهدر العلوي
  const nameEl = document.getElementById('topbar-user-name');
  const avatarEl = document.getElementById('topbar-avatar');

  if (nameEl) {
    const roleTag = currentUserRole === 'superadmin' ? 'مدير عام' : 'مدير';
    nameEl.innerHTML = `${escapeHtml(displayName)} <span class="user-role-tag" style="opacity:0.75; font-weight:normal; font-size:0.8rem; margin-right:4px;">(${roleTag})</span>`;
  }
  if (avatarEl) {
    avatarEl.textContent = (displayName.charAt(0) || 'A').toUpperCase();
  }

  // 2. إخفاء/إظهار زر "إدارة المدراء" في القائمة الجانبية بناءً على رتبة المستخدم
  const navAdmins = document.getElementById('nav-admins');
  if (navAdmins) {
    if (currentUserRole === 'superadmin') {
      navAdmins.classList.remove('hidden');
      navAdmins.style.display = '';
    } else {
      navAdmins.classList.add('hidden');
      navAdmins.style.display = 'none';
    }
  }
}

// ── Login Form — يرسل username + password إلى /api/admin/login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isRateLimited) return;

  const username = (document.getElementById('admin-username-input')?.value || '').trim();
  const password = document.getElementById('admin-key-input')?.value || '';
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const errTextEl = errEl.querySelector('.err-text');
  errEl.classList.add('hidden');

  if (!username || !password) {
    if (errTextEl) errTextEl.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري التحقق...';

  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      if (data.user) {
        updateUserInfoUI(data.user);
      }
      saveSession(null);
      loginSuccess();
      return;
    }

    // تعطيل الزر نهائياً عند استنفاد المحاولات 429
    if (res.status === 429 || data.code === 'TOO_MANY_REQUESTS') {
      isRateLimited = true;
      if (errTextEl) {
        errTextEl.textContent = data.error || 'تجاوزت عدد المحاولات المسموح بها (5 محاولات). تم حظر إرسال المحاولات مؤقتاً.';
      }
      errEl.classList.remove('hidden');
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.innerHTML = '<span>تم حظر المحاولات مؤقتاً 🔒</span>';
      return;
    }

    // إظهار الخطأ المباشر (مثل خطأ كلمة المرور)
    if (errTextEl) {
      errTextEl.textContent = data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
    errEl.classList.remove('hidden');

    btn.disabled = false;
    btn.innerHTML = '<span>دخول · Login</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';

  } catch (err) {
    if (errTextEl) errTextEl.textContent = 'تعذّر الاتصال بالخادم · Network error';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<span>دخول · Login</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
  }
});

function loginSuccess() {
  const overlay = document.getElementById('login-overlay');
  const app = document.getElementById('app');
  overlay.style.animation = 'none';
  overlay.style.opacity = '0';
  overlay.style.transform = 'scale(1.05)';
  overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  setTimeout(() => {
    overlay.classList.add('hidden');
    app.classList.remove('hidden');
    initDashboard();
  }, 500);
}

// ── Logout — يمسح الكوكيز من السيرفر
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/admin/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch { }
  clearSession();
  allVideos = [];
  allSubscribers = [];
  document.getElementById('app').classList.add('hidden');
  const overlay = document.getElementById('login-overlay');
  overlay.classList.remove('hidden');
  overlay.style.opacity = '1';
  overlay.style.transform = 'scale(1)';
  document.getElementById('admin-key-input').value = '';
  const usernameInput = document.getElementById('admin-username-input');
  if (usernameInput) usernameInput.value = '';
});

// ── Check Existing Session via /api/admin/verify (cookie-based)
(function checkSession() {
  fetch(`${API_BASE}/admin/verify`, { credentials: 'include' })
    .then(async r => {
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.user) {
          updateUserInfoUI(data.user);
        }
        saveSession(null);
        loginSuccess();
      } else {
        clearSession();
      }
    })
    .catch(() => clearSession());
})();

// ══════════════════════════════════════════════════════
// ── API HELPERS
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// ── API HELPERS (Cookie-based Auth + Header Fallback)
// ══════════════════════════════════════════════════════

function handleAuthError(res) {
  if (res.status === 401) {
    showToast('انتهت الجلسة — يرجى إعادة تسجيل الدخول', 'error');
    document.getElementById('logout-btn')?.click();
  }
}

async function apiGet(endpoint) {
  const headers = {};
  if (ADMIN_KEY) headers['x-admin-key'] = ADMIN_KEY;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    handleAuthError(res);
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPost(endpoint, data, isFormData = false) {
  const opts = {
    method: 'POST',
    credentials: 'include',
    headers: {}
  };
  if (ADMIN_KEY) opts.headers['x-admin-key'] = ADMIN_KEY;

  if (isFormData) {
    opts.body = data;
  } else {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  if (!res.ok) handleAuthError(res);
  return res.json();
}

async function apiPut(endpoint, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (ADMIN_KEY) headers['x-admin-key'] = ADMIN_KEY;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(data)
  });
  if (!res.ok) handleAuthError(res);
  return res.json();
}

async function apiDelete(endpoint) {
  const headers = {};
  if (ADMIN_KEY) headers['x-admin-key'] = ADMIN_KEY;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
  if (!res.ok) handleAuthError(res);
  return res.json();
}

function apiUpload(endpoint, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${endpoint}`);
    xhr.withCredentials = true;
    if (ADMIN_KEY) xhr.setRequestHeader('x-admin-key', ADMIN_KEY);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
    });
    xhr.onload = () => {
      if (xhr.status === 401) {
        showToast('انتهت الجلسة — يرجى إعادة تسجيل الدخول', 'error');
        document.getElementById('logout-btn')?.click();
      }
      try {
        const json = JSON.parse(xhr.responseText);
        resolve(json);
      } catch (e) {
        reject(new Error(xhr.responseText || `خطأ سيرفر (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('فشل الاتصال أثناء الرفع'));
    xhr.send(formData);
  });
}

// ══════════════════════════════════════════════════════
// ── TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════

const toastIcons = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><polyline points="20 6 9 17 4 12"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
};

function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${toastIcons[type]}<span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ══════════════════════════════════════════════════════
// ── PAGE NAVIGATION
// ══════════════════════════════════════════════════════

const pageNames = {
  dashboard: 'لوحة البيانات',
  videos: 'الفيديوهات',
  'add-video': 'إضافة فيديو',
  subscribers: 'المشتركون',
  admins: 'إدارة المدراء',
  categories: 'التصنيفات',
  settings: 'الإعدادات'
};

function switchPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.top-nav-btn[data-page]').forEach(n => n.classList.remove('active'));

  // Show target
  const page = document.getElementById(`page-${pageId}`);
  if (page) {
    page.classList.add('active');
  } else {
    // Fallback to dashboard
    document.getElementById('page-dashboard').classList.add('active');
    pageId = 'dashboard';
  }

  const navItem = document.getElementById(`nav-${pageId}`);
  if (navItem) navItem.classList.add('active');

  const topNavItem = document.getElementById(`topnav-${pageId}`);
  if (topNavItem) topNavItem.classList.add('active');

  document.getElementById('breadcrumb-page').textContent = pageNames[pageId] || pageId;

  // Trigger data load safely
  try {
    if (pageId === 'dashboard') {
      loadDashboard();
    } else if (pageId === 'videos') {
      // Reload fresh data then render
      loadAllData().then(() => renderVideosTable()).catch(e => renderVideosTable());
    } else if (pageId === 'subscribers') {
      loadAllData().then(() => renderSubscribersTable()).catch(e => renderSubscribersTable());
    } else if (pageId === 'admins') {
      loadAdminsPage();
    } else if (pageId === 'categories') {
      loadCategoriesPage();
    } else if (pageId === 'settings') {
      loadSettings();
    } else if (pageId === 'add-video') {
      populateCategoryDatalist();
    }
  } catch (err) {
    console.error(`Error loading page ${pageId}:`, err);
  }

  // Close sidebar on mobile
  closeMobileSidebar();
}

// Nav items & Top nav buttons (change hash instead of calling switchPage directly)
document.querySelectorAll('.nav-item, .top-nav-btn[data-page]').forEach(item => {
  item.addEventListener('click', () => {
    if (item.dataset.page) {
      window.location.hash = item.dataset.page;
    }
  });
});

// Handle hash changes
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  switchPage(hash);
});

// Mobile Sidebar
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('sidebar-backdrop');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('sidebar-close-btn');

menuBtn.addEventListener('click', () => {
  sidebar.classList.add('open');
  backdrop.classList.add('active');
});

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  backdrop.classList.remove('active');
}

closeBtn.addEventListener('click', closeMobileSidebar);
backdrop.addEventListener('click', closeMobileSidebar);

// Refresh Button
document.getElementById('refresh-btn')?.addEventListener('click', async function () {
  this.classList.add('spinning');
  const currentPage = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (currentPage === 'dashboard') {
    await loadAllData();
    loadDashboard();
  } else if (currentPage === 'videos') {
    await loadAllData();
    renderVideosTable();
  } else if (currentPage === 'subscribers') {
    await loadAllData();
    renderSubscribersTable();
  } else if (currentPage === 'admins') {
    await loadAdminsPage();
  } else if (currentPage === 'categories') {
    await loadCategoriesPage();
  }
  this.classList.remove('spinning');
  showToast('تم تحديث البيانات · Data refreshed', 'success');
});

// ══════════════════════════════════════════════════════
// ── INIT
// ══════════════════════════════════════════════════════

async function initDashboard() {
  checkApiStatus();
  await loadAllData();

  // Set initial page from hash or default to dashboard
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  switchPage(hash);

  // Pre-render videos table so it's ready
  if (hash !== 'videos') renderVideosTable();
}

let compressionPollTimer = null;

function checkCompressionPolling() {
  const hasCompressing = allVideos.some(v => v.compressing);
  if (hasCompressing && !compressionPollTimer) {
    compressionPollTimer = setInterval(async () => {
      await loadAllData();
      if (typeof currentPage !== 'undefined' && currentPage === 'videos') {
        renderVideosTable();
      }
    }, 3000);
  } else if (!hasCompressing && compressionPollTimer) {
    clearInterval(compressionPollTimer);
    compressionPollTimer = null;
  }
}

async function loadAllData() {
  try {
    const [videosResult, subsResult] = await Promise.allSettled([
      apiGet('/videos'),
      apiGet('/subscribers')
    ]);

    if (videosResult.status === 'fulfilled' && videosResult.value) {
      const val = videosResult.value;
      if (Array.isArray(val.data)) allVideos = val.data;
      else if (Array.isArray(val)) allVideos = val;
      else if (Array.isArray(val.videos)) allVideos = val.videos;
    }

    if (subsResult.status === 'fulfilled' && subsResult.value) {
      const val = subsResult.value;
      if (Array.isArray(val.data)) allSubscribers = val.data;
      else if (Array.isArray(val)) allSubscribers = val;
      else if (Array.isArray(val.subscribers)) allSubscribers = val.subscribers;
    }

    updateBadges();
    checkCompressionPolling();
    return true;
  } catch (err) {
    showToast('خطأ: تعذّر تحديث البيانات من الخادم', 'error');
    return false;
  }
}

function updateBadges() {
  document.getElementById('videos-badge').textContent = allVideos.length;
  document.getElementById('subs-badge').textContent = allSubscribers.length;
}

// ── API Status Check
async function checkApiStatus() {
  const dot = document.getElementById('api-status-dot');
  const text = document.getElementById('api-status-text');
  try {
    const res = await fetch(`${API_BASE.replace('/api', '')}/`);
    if (res.ok) {
      const info = await res.json();
      if (info.db && info.db.includes('Connected')) {
        dot.classList.add('online');
        dot.classList.remove('offline');
        text.textContent = 'متصل · Online';
      } else {
        dot.classList.add('offline');
        dot.classList.remove('online');
        text.textContent = 'قاعدة البيانات غير متصلة';
      }
    } else throw new Error();
  } catch {
    dot.classList.add('offline');
    dot.classList.remove('online');
    text.textContent = 'غير متصل · Offline';
  }
}

// ══════════════════════════════════════════════════════
// ── DASHBOARD PAGE
// ══════════════════════════════════════════════════════

function loadDashboard() {
  // Stats
  const totalViews = allVideos.reduce((s, v) => s + (v.views || 0), 0);
  const categories = [...new Set(allVideos.map(v => v.category).filter(Boolean))];

  animateNumber('total-videos', allVideos.length);
  animateNumber('total-views', totalViews);
  animateNumber('total-subs', allSubscribers.length);
  animateNumber('total-categories', categories.length);

  // Category chart
  renderCategoryChart();

  // Recent videos
  renderRecentVideos();
}

function animateNumber(elId, target) {
  const el = document.getElementById(elId);
  el.classList.remove('loaded');
  let start = 0;
  const duration = 800;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      start = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(start).toLocaleString('ar-EG');
    el.classList.add('loaded');
  }, 16);
}

function renderCategoryChart() {
  const container = document.getElementById('categories-chart');
  if (!allVideos.length) {
    container.innerHTML = '<div class="empty-state"><p>لا توجد فيديوهات</p></div>';
    return;
  }

  // Count by category
  const catMap = {};
  allVideos.forEach(v => {
    const cat = v.category || 'بدون تصنيف';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1];

  container.innerHTML = sorted.map(([cat, count]) => `
    <div class="cat-bar-row">
      <div class="cat-bar-info">
        <span class="cat-bar-name">${cat}</span>
        <span class="cat-bar-count">${count} فيديو</span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" data-width="${(count / max * 100).toFixed(0)}%"></div>
      </div>
    </div>
  `).join('');

  // Animate bars
  requestAnimationFrame(() => {
    document.querySelectorAll('.cat-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  });
}

function renderRecentVideos() {
  const container = document.getElementById('recent-videos-list');
  const recent = [...allVideos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  if (!recent.length) {
    container.innerHTML = '<div class="empty-state"><p>لا توجد فيديوهات بعد</p></div>';
    return;
  }

  container.innerHTML = recent.map(v => `
    <div class="recent-item">
      <div class="recent-thumb">
        ${v.thumbnail
      ? `<img src="${v.thumbnail}" alt="${v.title}" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="thumb-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div>`
    }
      </div>
      <div class="recent-info">
        <div class="recent-title">${v.title}</div>
        <div class="recent-cat">${v.category || '—'}</div>
      </div>
      <div class="recent-views">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        ${(v.views || 0).toLocaleString('ar-EG')}
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════
// ── VIDEOS PAGE
// ══════════════════════════════════════════════════════

let videoSearchQ = '';
let videoCategoryFilter = '';

document.getElementById('video-search')?.addEventListener('input', function () {
  videoSearchQ = this.value.toLowerCase();
  renderVideosTable();
});

document.getElementById('category-filter')?.addEventListener('change', function () {
  videoCategoryFilter = this.value;
  renderVideosTable();
});

function populateCategoryFilter() {
  const sel = document.getElementById('category-filter');
  const cats = [...new Set(allVideos.map(v => v.category).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">كل التصنيفات · All</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

const DEFAULT_CATEGORIES = [
  'Reels', 'Events', 'Short Films', 'Ads', 'Interviews', 'BTS',
  'Podcast', 'Brand Films', 'Music Videos', 'Documentaries',
  'Social Media', 'Commercial', 'Promo', 'Recap'
];
// cachedManagedCategories is declared globally at top of file

async function fetchManagedCategories() {
  try {
    const res = await apiGet('/settings/categories');
    if (res.success && Array.isArray(res.data)) {
      cachedManagedCategories = res.data;
    }
  } catch (err) {
    console.warn('Could not fetch categories from settings:', err.message);
  }
  return cachedManagedCategories;
}

async function populateCategoryDatalist() {
  const sel = document.getElementById('url-category');
  const editSel = document.getElementById('edit-category');
  const datalist = document.getElementById('categories-list');

  const managedCats = await fetchManagedCategories();
  const videoCats = [...new Set(allVideos.map(v => v.category).filter(Boolean))];

  const combined = [...managedCats];
  videoCats.forEach(c => {
    if (!combined.some(x => x.toLowerCase() === c.toLowerCase())) combined.push(c);
  });

  if (sel) {
    sel.innerHTML = combined.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  if (editSel) {
    editSel.innerHTML = '<option value="">-- اختر تصنيفًا --</option>' +
      combined.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  if (datalist) {
    datalist.innerHTML = combined.map(c => `<option value="${c}"></option>`).join('');
  }
}

async function loadCategoriesPage() {
  try {
    const allCatsList = document.getElementById('all-cats-list');
    const inUseList = document.getElementById('inuse-cats-list');
    const noCatsMsg = document.getElementById('no-cats-msg');
    const countBadge = document.getElementById('cat-count-badge');

    // Fetch managed categories from backend
    const categories = await fetchManagedCategories();
    const safeCats = Array.isArray(categories) ? categories : [];

    // Update count badge
    if (countBadge) countBadge.textContent = safeCats.length;

    // Render ALL managed categories with delete buttons
    if (allCatsList) {
      if (!safeCats.length) {
        allCatsList.innerHTML = '';
        if (noCatsMsg) noCatsMsg.style.display = 'block';
      } else {
        if (noCatsMsg) noCatsMsg.style.display = 'none';
        allCatsList.innerHTML = safeCats.map(c => `
          <span class="cat-pill custom-pill" style="padding: 0.45rem 0.9rem; font-size: 0.85rem;">
            <span>${escapeHtml(c)}</span>
            <button onclick="deleteCategory('${encodeURIComponent(c)}')" class="delete-cat-btn" title="حذف التصنيف">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </span>
        `).join('');
      }
    }

    // Render categories in use across videos
    if (inUseList) {
      const usedCats = [...new Set((allVideos || []).map(v => v.category).filter(Boolean))].map(c => String(c));
      if (!usedCats.length) {
        inUseList.innerHTML = '<span style="color:#666;font-size:0.85rem;">لا توجد فيديوهات مخصصة بتصنيفات حالياً.</span>';
      } else {
        inUseList.innerHTML = usedCats.map(c => {
          const count = (allVideos || []).filter(v => v.category && String(v.category).toLowerCase() === c.toLowerCase()).length;
          return `
            <span class="cat-pill inuse-pill">
              <span>${escapeHtml(c)}</span>
              <small style="opacity:0.8;margin-right:5px;font-weight:bold;">(${count} فيديو)</small>
            </span>
          `;
        }).join('');
      }
    }

    // Update datalists across the page
    populateCategoryDatalist().catch(e => console.warn(e));
  } catch (err) {
    console.error('Error loading categories page:', err);
  }
}

async function addCategoryHandler() {
  const input = document.getElementById('new-category-input');
  const btn = document.getElementById('add-category-btn');
  const msg = document.getElementById('cat-add-msg');
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    if (msg) {
      msg.style.color = '#ff4d4f';
      msg.textContent = 'يرجى كتابة اسم التصنيف';
    }
    return;
  }

  btn.disabled = true;
  if (msg) msg.textContent = 'جاري الإضافة...';

  try {
    const res = await apiPost('/settings/categories', { name });
    if (res.success) {
      input.value = '';
      if (msg) {
        msg.style.color = '#52c41a';
        msg.textContent = res.message || 'تمت الإضافة بنجاح!';
      }
      showToast('✅ ' + (res.message || 'تم إضافة التصنيف بنجاح!'), 'success');
      // Refresh data and UI
      cachedManagedCategories = [];
      await loadCategoriesPage();
      await populateCategoryDatalist();
    } else {
      throw new Error(res.error || 'فشل في إضافة التصنيف');
    }
  } catch (err) {
    if (msg) {
      msg.style.color = '#ff4d4f';
      msg.textContent = err.message;
    }
    showToast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteCategory(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (!confirm(`هل أنت تأكد من حذف التصنيف المخصص "${name}"؟`)) return;

  try {
    const res = await apiDelete(`/settings/categories/${encodeURIComponent(name)}`);
    if (res.success) {
      showToast('✅ ' + (res.message || 'تم حذف التصنيف بنجاح!'), 'success');
      cachedManagedCategories = [];
      await loadCategoriesPage();
      await populateCategoryDatalist();
    } else {
      throw new Error(res.error || 'فشل في حذف التصنيف');
    }
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}


// adminActiveCategory is declared globally at top of file

async function buildAdminCategoryFilterStrip() {
  const container = document.getElementById('admin-category-filters');
  if (!container) return;

  try {
    const managedCats = await fetchManagedCategories();
    const dbCats = [...new Set((allVideos || []).map(v => v.category).filter(Boolean))].map(c => String(c));
    const combined = [...managedCats];
    dbCats.forEach(c => {
      if (c && !combined.some(x => String(x).toLowerCase() === String(c).toLowerCase())) {
        combined.push(c);
      }
    });

    const currentActive = String(adminActiveCategory || 'ALL').toUpperCase();

    let html = `<button class="filter-btn ${currentActive === 'ALL' ? 'active' : ''}" data-category="ALL">ALL</button>`;
    combined.forEach(cat => {
      const catStr = String(cat);
      const isAct = currentActive === catStr.toUpperCase();
      html += `<button class="filter-btn ${isAct ? 'active' : ''}" data-category="${escapeHtml(catStr)}">${escapeHtml(catStr.toUpperCase())}</button>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        adminActiveCategory = btn.getAttribute('data-category') || 'ALL';
        renderVideosTable();
      });
    });
  } catch (err) {
    console.error('Error building admin category filter strip:', err);
  }
}

function renderVideosGrid(videos) {
  const grid = document.getElementById('admin-videos-grid');
  if (!grid) return;

  if (!videos.length) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #888;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="opacity:0.5; margin-bottom:1rem;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        <p style="font-size: 1.05rem;">لا توجد فيديوهات مطابقة</p>
        <small>No matching videos found</small>
      </div>`;
    return;
  }

  grid.innerHTML = videos.map(v => {
    const thumb = v.thumbnail || 'https://via.placeholder.com/600x338/161616/888888?text=Abdulmalek+Video';
    const cat = v.category || 'WORK';

    return `
      <div class="video-card${v.isPinned ? ' is-pinned' : ''}">
        ${v.isPinned ? '<span class="pin-badge">📌 مثبّت · Pinned</span>' : ''}
        <img src="${escapeHtml(thumb)}" alt="${escapeHtml(v.title || '')}" class="video-thumbnail" loading="lazy" />
        <div class="video-info">
          <div>
            <h4 class="video-title" title="${escapeHtml(v.title || '')}">${escapeHtml(v.title || 'بدون عنوان')}</h4>
            <span class="video-category">${escapeHtml(cat)}</span>
          </div>
          <div class="action-btns" style="margin-top:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
            ${v.videoUrl ? `
              <a href="${escapeHtml(v.videoUrl)}" target="_blank" class="action-btn" title="مشاهدة · Watch" style="padding:4px 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>` : '<span></span>'}
            <div style="display:flex; gap:6px;">
              <button class="action-btn pin-btn${v.isPinned ? ' pinned' : ''}" onclick="togglePinVideo('${v._id}')" title="${v.isPinned ? 'إلغاء التثبيت · Unpin' : 'تثبيت في الأعلى · Pin to top'}" aria-pressed="${v.isPinned ? 'true' : 'false'}" style="padding:4px 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
              </button>
              <button class="action-btn" onclick="openEditModal('${v._id}')" title="تعديل · Edit" style="padding:4px 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn danger" onclick="openDeleteModal('${v._id}')" title="حذف · Delete" style="padding:4px 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderVideosTable(videos = null) {
  try {
    if (!videos) {
      buildAdminCategoryFilterStrip().catch(e => console.warn(e));
      populateCategoryDatalist().catch(e => console.warn(e));
      const activeCatUpper = String(adminActiveCategory || 'ALL').toUpperCase();
      videos = (allVideos || []).filter(v => {
        const titleStr = String(v.title || '').toLowerCase();
        const catStr = String(v.category || '').toLowerCase();
        const matchSearch = !videoSearchQ || titleStr.includes(videoSearchQ) || catStr.includes(videoSearchQ);
        const matchCat = (activeCatUpper === 'ALL') || (catStr.toUpperCase() === activeCatUpper);
        return matchSearch && matchCat;
      });
    }

    renderVideosGrid(videos);

    const tbody = document.getElementById('videos-tbody');
    if (!tbody) return;

    if (!videos.length) {
      tbody.innerHTML = `
        <tr><td colspan="5">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <p>لا توجد فيديوهات مطابقة</p>
            <small>No matching videos found</small>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = videos.map(v => `
      <tr>
        <td>
          <div class="video-cell">
            <div class="video-thumb">
              ${v.thumbnail
        ? `<img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title || '')}" loading="lazy" onerror="this.parentElement.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><polygon points=\\'23 7 16 12 23 17 23 7\\'/><rect x=\\'1\\' y=\\'5\\' width=\\'15\\' height=\\'14\\' rx=\\'2\\'/></svg>'" />`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`
      }
            </div>
            <div class="video-info">
              <div class="video-title" title="${escapeHtml(v.title || '')}">
                ${escapeHtml(v.title || 'بدون عنوان')}
                ${v.isPinned ? '<span class="pin-badge pin-badge-inline">📌 مثبّت</span>' : ''}
                ${v.compressing ? '<span style="background: rgba(241,196,15,0.2); color: #f39c12; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">⏳ جاري الضغط...</span>' : ''}
                ${v.compressionFailed ? '<span style="background: rgba(231,76,60,0.2); color: #e74c3c; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">⚠️ فشل الضغط</span>' : ''}
              </div>
              <div class="video-ch">${escapeHtml(v.channel || v.duration || '—')}</div>
            </div>
          </div>
        </td>
        <td><span class="cat-badge">${escapeHtml(v.category || '—')}</span></td>
        <td>
          <div class="views-cell">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${(v.views || 0).toLocaleString('ar-EG')}
          </div>
        </td>
        <td class="sub-date">${formatDate(v.createdAt)}</td>
        <td>
          <div class="action-btns">
            ${v.videoUrl ? `
              <a href="${escapeHtml(v.videoUrl)}" target="_blank" class="action-btn" title="مشاهدة · Watch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>` : ''}
            <button class="action-btn pin-btn${v.isPinned ? ' pinned' : ''}" onclick="togglePinVideo('${v._id}')" title="${v.isPinned ? 'إلغاء التثبيت · Unpin' : 'تثبيت في الأعلى · Pin to top'}" aria-pressed="${v.isPinned ? 'true' : 'false'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
            </button>
            <button class="action-btn" onclick="openEditModal('${v._id}')" title="تعديل · Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn danger" onclick="openDeleteModal('${v._id}')" title="حذف · Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error rendering videos table:', err);
  }
}

// ── View Mode Toggle Event Listeners
document.getElementById('view-mode-grid-btn')?.addEventListener('click', () => {
  document.getElementById('view-mode-grid-btn')?.classList.add('active');
  document.getElementById('view-mode-table-btn')?.classList.remove('active');
  document.getElementById('admin-videos-grid')?.classList.remove('hidden');
  document.getElementById('admin-table-wrapper')?.classList.add('hidden');
});

document.getElementById('view-mode-table-btn')?.addEventListener('click', () => {
  document.getElementById('view-mode-table-btn')?.classList.add('active');
  document.getElementById('view-mode-grid-btn')?.classList.remove('active');
  document.getElementById('admin-table-wrapper')?.classList.remove('hidden');
  document.getElementById('admin-videos-grid')?.classList.add('hidden');
});

// ══════════════════════════════════════════════════════
// ── ADD VIDEO — Unified Form
// ══════════════════════════════════════════════════════

// ── Helper: Highlight updated field
function highlightField(el) {
  if (!el) return;
  el.classList.remove('field-highlight');
  void el.offsetWidth;
  el.classList.add('field-highlight');
}

// ── Show/Hide Autofill Spinner
function setAutofillSpinner(show) {
  const spinner = document.getElementById('autofill-spinner');
  if (spinner) {
    if (show) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
  }
}

// ── Auto-fill from YouTube/Vimeo/TikTok/Instagram Reels/Google Drive URL via backend & client oEmbed
async function autoFillFromUrl(url) {
  if (!url || !url.trim()) return;
  url = url.trim();
  setAutofillSpinner(true);

  try {
    let title = '', channel = '', thumbnail = '', duration = '', description = '';
    let detectedPlatform = '';

    // Try backend oEmbed endpoint first
    try {
      const res = await fetch(`${API_BASE}/videos/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          title = json.data.title || '';
          channel = json.data.channel || '';
          thumbnail = json.data.thumbnail || '';
          duration = json.data.duration || '';
          description = json.data.description || '';
          detectedPlatform = json.data.platform || '';
        }
      }
    } catch (e) { }

    // Fallbacks if backend doesn't fill everything
    if (/youtube\.com|youtu\.be/.test(url)) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1]) {
        const ytId = match[1];
        if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
      if (!title || !channel) {
        try {
          const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
          if (ytRes.ok) {
            const ytJson = await ytRes.json();
            if (!title) title = ytJson.title || '';
            if (!channel) channel = ytJson.author_name || '';
            if (!thumbnail && ytJson.thumbnail_url) thumbnail = ytJson.thumbnail_url;
          }
        } catch (e) { }
      }
    } else if (/vimeo\.com/.test(url) && (!title || !thumbnail)) {
      try {
        const vmRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
        if (vmRes.ok) {
          const vmJson = await vmRes.json();
          if (!title) title = vmJson.title || '';
          if (!channel) channel = vmJson.author_name || '';
          if (!thumbnail) thumbnail = vmJson.thumbnail_url || '';
          if (!description) description = vmJson.description || '';
          if (!duration && vmJson.duration) {
            const m = Math.floor(vmJson.duration / 60);
            const s = vmJson.duration % 60;
            duration = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          }
        }
      } catch (e) { }
    } else if (/instagram\.com|instagr\.am/.test(url)) {
      // Instagram Reels / Posts — oEmbed requires token, use shortcode-based defaults
      const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        if (!title) title = 'Instagram Reel';
        if (!channel) channel = 'Instagram';
      }
      detectedPlatform = 'instagram';
    } else if (/tiktok\.com/.test(url)) {
      detectedPlatform = 'tiktok';
      if (!title) title = 'TikTok Reel';
      if (!channel) channel = 'TikTok';
    }

    // Auto-set category to "Reels" for Instagram Reels, YouTube Shorts, and TikTok URLs
    const isReelsUrl = /instagram\.com|instagr\.am|youtube\.com\/shorts|youtu\.be\/shorts|tiktok\.com/i.test(url) || detectedPlatform === 'instagram' || detectedPlatform === 'tiktok';
    if (isReelsUrl) {
      const catEl = document.getElementById('url-category');
      if (catEl) {
        catEl.value = 'Reels';
        highlightField(catEl);
      }
    }

    let updatedCount = 0;
    const titleEl = document.getElementById('url-title');
    const channelEl = document.getElementById('url-channel');
    const thumbEl = document.getElementById('url-thumbnail');
    const durEl = document.getElementById('url-duration');
    const descEl = document.getElementById('url-description');

    if (title && titleEl) { titleEl.value = title; highlightField(titleEl); updatedCount++; }
    if (channel && channelEl) { channelEl.value = channel; highlightField(channelEl); updatedCount++; }
    if (thumbnail && thumbEl) { thumbEl.value = thumbnail; highlightField(thumbEl); updatedCount++; }
    if (duration && durEl) { durEl.value = duration; highlightField(durEl); updatedCount++; }
    if (description && descEl) { descEl.value = description; highlightField(descEl); updatedCount++; }

    if (updatedCount > 0) {
      showToast('✨ تم ملء بيانات الفيديو تلقائياً!', 'success');
    } else if (detectedPlatform === 'instagram') {
      showToast('📸 تم التعرف على رابط انستجرام ريلز — يرجى إدخال العنوان يدوياً', 'info');
    }
  } catch (err) {
    console.error('AutoFill error:', err);
  } finally {
    setAutofillSpinner(false);
  }
}

// ── Auto-fill from local video file
async function autoFillFromFile(file, forceThumb = false) {
  if (!file) return;
  setAutofillSpinner(true);

  // 1. Clean Title from Filename
  let cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  const titleEl = document.getElementById('url-title');
  if (titleEl && !titleEl.value.trim()) {
    titleEl.value = cleanName;
    highlightField(titleEl);
  }

  // 2. Extract Duration & Canvas Thumbnail
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;

    video.onloadedmetadata = () => {
      const seconds = Math.floor(video.duration || 0);
      if (seconds > 0) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        const durEl = document.getElementById('url-duration');
        if (durEl) {
          durEl.value = formatted;
          highlightField(durEl);
        }
      }
      // Pick a random frame between 10% and 80% of the video to avoid black frames
      const dur = video.duration || 10;
      const randomTime = dur * (0.10 + Math.random() * 0.70);
      video.currentTime = randomTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const thumbEl = document.getElementById('url-thumbnail');
        if (thumbEl && (forceThumb || !thumbEl.value.trim())) {
          thumbEl.value = dataUrl;
          highlightField(thumbEl);
          updateThumbPreview(dataUrl);
        }
      } catch (e) { }
      URL.revokeObjectURL(blobUrl);
      setAutofillSpinner(false);
      showToast('✨ تم استخراج صورة الغلاف بنجاح!', 'success');
    };

    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      setAutofillSpinner(false);
    };
  } catch (e) {
    setAutofillSpinner(false);
  }
}

// ── Update Cover Thumbnail Live Preview Box
function updateThumbPreview(urlOrData) {
  const box = document.getElementById('thumb-preview-box');
  const img = document.getElementById('thumb-preview-img');
  if (urlOrData && urlOrData.trim()) {
    if (img) img.src = urlOrData.trim();
    if (box) box.classList.remove('hidden');
  } else {
    if (img) img.src = '';
    if (box) box.classList.add('hidden');
  }
}

// ── Cover Image Input Live Listener
document.getElementById('url-thumbnail')?.addEventListener('input', function () {
  updateThumbPreview(this.value);
});

// ── Cover Image File Upload Handler
document.getElementById('cover-file-input')?.addEventListener('change', function (e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      const maxDim = 800;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const thumbEl = document.getElementById('url-thumbnail');
      if (thumbEl) thumbEl.value = resizedDataUrl;
      updateThumbPreview(resizedDataUrl);
      showToast('🖼️ تم تحميل صورة الغلاف بنجاح!', 'success');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

// ── Remove Cover Image Handler
document.getElementById('remove-thumb-btn')?.addEventListener('click', () => {
  const thumbEl = document.getElementById('url-thumbnail');
  if (thumbEl) thumbEl.value = '';
  updateThumbPreview('');
});

// ── Generate Thumbnail from Video Button
document.getElementById('btn-generate-thumb')?.addEventListener('click', async () => {
  const fileInput = document.getElementById('file-input');
  const videoUrlInput = document.getElementById('url-video-url');

  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    autoFillFromFile(fileInput.files[0], true);
  } else if (videoUrlInput && videoUrlInput.value.trim()) {
    const url = videoUrlInput.value.trim();
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url) || url.startsWith('/uploads/')) {
      extractThumbnailFromVideoUrl(url);
    } else {
      autoFillFromUrl(url);
    }
  } else {
    showToast('يرجى اختيار ملف فيديو أو إدخال رابط فيديو لاستخراج الغلاف', 'info');
  }
});

// ── Extract frame from video URL
function extractThumbnailFromVideoUrl(videoUrl) {
  setAutofillSpinner(true);
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;

  video.onloadeddata = () => {
    // Pick a random frame between 10% and 80% of the video to avoid black frames
    const dur = video.duration || 10;
    const randomTime = dur * (0.10 + Math.random() * 0.70);
    video.currentTime = randomTime;
  };

  video.onseeked = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      const thumbEl = document.getElementById('url-thumbnail');
      if (thumbEl) {
        thumbEl.value = dataUrl;
        updateThumbPreview(dataUrl);
      }
      showToast('✨ تم استخراج صورة الغلاف بنجاح!', 'success');
    } catch (e) {
      showToast('يمكنك رفع صورة غلاف مخصصة أو وضع رابط الصورة', 'warning');
    } finally {
      setAutofillSpinner(false);
    }
  };

  video.onerror = () => {
    setAutofillSpinner(false);
    showToast('خطأ في تحميل رابط الفيديو للتعرف على الغلاف', 'warning');
  };
}

// Listen for URL paste/input & Manual button click
let autoFillTimer = null;
document.getElementById('url-video-url')?.addEventListener('input', function () {
  clearTimeout(autoFillTimer);
  autoFillTimer = setTimeout(() => autoFillFromUrl(this.value.trim()), 600);
});

document.getElementById('btn-fetch-autofill')?.addEventListener('click', function () {
  const url = document.getElementById('url-video-url')?.value?.trim();
  if (url) {
    autoFillFromUrl(url);
  } else {
    showToast('الرجاء أدخال رابط فيديو أولاً لملء البيانات', 'info');
  }
});

// ── Unified form submit
document.getElementById('add-url-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('add-url-btn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';

  const form = e.target;
  const fileInput = document.getElementById('file-input');
  const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;

  try {
    let res;
    if (hasFile) {
      // Upload file + metadata
      const progressWrapper = document.getElementById('upload-progress-wrapper');
      const progressFill = document.getElementById('upload-progress-fill');
      const progressText = document.getElementById('upload-progress-text');
      progressWrapper.classList.remove('hidden');

      const file = fileInput.files[0];
      const videoTitle = form.title.value.trim() || file.name.replace(/\.[^/.]+$/, '');
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', videoTitle);
      formData.append('category', form.category.value.trim());
      formData.append('duration', form.duration.value.trim());
      formData.append('channel', form.channel.value.trim());
      formData.append('description', form.description.value.trim());
      formData.append('thumbnail', form.thumbnail.value.trim());
      if (form.video_url?.value?.trim()) formData.append('video_url', form.video_url.value.trim());

      res = await apiUpload('/videos/upload/file', formData, (pct) => {
        progressFill.style.width = pct + '%';
        progressText.textContent = pct + '%';
      });

      progressWrapper.classList.add('hidden');
      progressFill.style.width = '0%';
    } else {
      // URL-only submit
      const data = {
        title: form.title.value.trim(),
        video_url: form.video_url?.value?.trim() || '',
        category: form.category.value.trim(),
        duration: form.duration.value.trim(),
        channel: form.channel.value.trim(),
        thumbnail: form.thumbnail.value.trim(),
        description: form.description.value.trim()
      };
      res = await apiPost('/videos', data);
    }

    if (res && res.success) {
      showToast('✅ تم إضافة الفيديو بنجاح · Video added!', 'success');
      form.reset();
      const catEl = document.getElementById('url-category');
      if (catEl) catEl.value = 'Events';
      updateThumbPreview('');
      // Reset drop zone
      const preview = document.getElementById('file-preview');
      const inner = document.getElementById('drop-zone-inner');
      if (preview) preview.classList.add('hidden');
      if (inner) inner.style.display = '';
      if (fileInput) fileInput.value = '';
      await loadAllData();
      renderVideosTable();
      window.location.hash = 'videos';
    } else {
      throw new Error(res?.error || res?.details || 'خطأ غير معروف في السيرفر');
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'خطأ في الإضافة'), 'error');
    const pw = document.getElementById('upload-progress-wrapper');
    if (pw) pw.classList.add('hidden');
  }

  btn.disabled = false;
  btn.textContent = 'إضافة الفيديو للموقع +';
});

// ══════════════════════════════════════════════════════
// ── DROP ZONE SETUP
// ══════════════════════════════════════════════════════

// Main add-video drop zone
setupDropZone({
  zoneId: 'drop-zone',
  inputId: 'file-input',
  browseId: 'browse-btn',
  previewId: 'file-preview',
  innerWrapperId: 'drop-zone-inner',
  fileNameId: 'file-name',
  fileSizeId: 'file-size',
  clearId: 'clear-file-btn'
});

// Loop Drop Zone (settings page)
setupDropZone({
  zoneId: 'loop-drop-zone',
  inputId: 'loop-file-input',
  browseId: 'loop-browse-btn',
  previewId: 'loop-preview',
  innerWrapperId: 'loop-drop-inner',
  fileNameId: 'loop-file-name',
  fileSizeId: 'loop-file-size',
  clearId: 'clear-loop-btn'
});

// Hero Image Drop Zone (settings page)
setupDropZone({
  zoneId: 'hero-img-drop-zone',
  inputId: 'hero-img-file-input',
  browseId: 'hero-img-browse-btn',
  previewId: 'hero-img-preview',
  innerWrapperId: 'hero-img-drop-inner',
  fileNameId: 'hero-img-file-name',
  fileSizeId: 'hero-img-file-size',
  clearId: 'clear-hero-img-file-btn'
});

function setupDropZone({ zoneId, inputId, browseId, previewId, innerWrapperId, fileNameId, fileSizeId, clearId }) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const inner = document.getElementById(innerWrapperId);
  const browseBtn = document.getElementById(browseId);
  const clearBtn = document.getElementById(clearId);

  if (!zone || !input) return;

  // Clicking the browse link triggers file input
  browseBtn?.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });

  // Clicking the drop zone also triggers file input
  zone.addEventListener('click', (e) => {
    if (e.target === zone || e.target.closest('.drop-zone-inner')) {
      input.click();
    }
  });

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
  });

  input.addEventListener('change', () => {
    if (input.files.length) handleFileSelect(input.files[0]);
  });

  clearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    input.value = '';
    if (preview) preview.classList.add('hidden');
    if (inner) inner.style.display = '';
  });

  function handleFileSelect(file) {
    const fnEl = document.getElementById(fileNameId);
    const fsEl = document.getElementById(fileSizeId);
    if (fnEl) fnEl.textContent = file.name;
    if (fsEl) fsEl.textContent = formatFileSize(file.size);
    if (inner) inner.style.display = 'none';
    if (preview) preview.classList.remove('hidden');

    if (inputId === 'file-input' && file) {
      autoFillFromFile(file);
    }
  }
}

// ══════════════════════════════════════════════════════
// ── EDIT MODAL
// ══════════════════════════════════════════════════════

function updateEditThumbPreview(urlOrData) {
  const box = document.getElementById('edit-thumb-preview-box');
  const img = document.getElementById('edit-thumb-preview-img');
  if (urlOrData && urlOrData.trim()) {
    if (img) img.src = urlOrData.trim();
    if (box) box.classList.remove('hidden');
  } else {
    if (img) img.src = '';
    if (box) box.classList.add('hidden');
  }
}

async function openEditModal(videoId) {
  let video = allVideos.find(v => v._id === videoId);
  if (!video) return;

  try {
    const res = await apiGet(`/videos/${videoId}`);
    if (res && res.success && res.data) {
      video = res.data;
      const idx = allVideos.findIndex(v => v._id === videoId);
      if (idx !== -1) allVideos[idx] = video;
    }
  } catch (err) {
    console.warn('Could not fetch fresh video data for edit modal', err);
  }

  document.getElementById('edit-id').value = video._id;
  document.getElementById('edit-title').value = video.title || '';
  document.getElementById('edit-video-url').value = video.videoUrl || '';
  document.getElementById('edit-category').value = video.category || '';
  document.getElementById('edit-duration').value = video.duration || '';
  document.getElementById('edit-channel').value = video.channel || '';
  document.getElementById('edit-thumbnail').value = video.thumbnail || '';
  document.getElementById('edit-description').value = video.description || '';

  updateEditThumbPreview(video.thumbnail);
  document.getElementById('edit-modal').classList.remove('hidden');
}

// ── Edit Thumbnail Logic
document.getElementById('edit-thumbnail')?.addEventListener('input', function () {
  updateEditThumbPreview(this.value.trim());
});

document.getElementById('edit-cover-file-input')?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let w = img.width;
      let h = img.height;

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const thumbEl = document.getElementById('edit-thumbnail');
      if (thumbEl) thumbEl.value = resizedDataUrl;
      updateEditThumbPreview(resizedDataUrl);
      showToast('🖼️ تم تحميل صورة الغلاف بنجاح!', 'success');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('edit-remove-thumb-btn')?.addEventListener('click', () => {
  const thumbEl = document.getElementById('edit-thumbnail');
  if (thumbEl) thumbEl.value = '';
  updateEditThumbPreview('');
});

document.getElementById('edit-btn-generate-thumb')?.addEventListener('click', async () => {
  const videoUrlInput = document.getElementById('edit-video-url');
  if (videoUrlInput && videoUrlInput.value.trim()) {
    const url = videoUrlInput.value.trim();
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url) || url.startsWith('/uploads/')) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = url;

      video.onloadeddata = () => {
        const dur = video.duration || 10;
        const randomTime = dur * (0.10 + Math.random() * 0.70);
        video.currentTime = randomTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const thumbEl = document.getElementById('edit-thumbnail');
          if (thumbEl) {
            thumbEl.value = dataUrl;
            updateEditThumbPreview(dataUrl);
          }
          showToast('✨ تم استخراج صورة الغلاف بنجاح!', 'success');
        } catch (e) {
          showToast('لا يمكن استخراج الصورة بسبب قيود السيرفر', 'warning');
        }
      };

      video.onerror = () => {
        showToast('خطأ في تحميل رابط الفيديو للتعرف على الغلاف', 'warning');
      };
    } else {
      showToast('يرجى وضع رابط فيديو مباشر (mp4, webm...) لاستخراج الغلاف', 'info');
    }
  } else {
    showToast('يرجى إدخال رابط فيديو لاستخراج الغلاف', 'info');
  }
});

document.getElementById('close-edit-modal')?.addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
});

document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
});

document.getElementById('edit-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('edit-modal')) {
    document.getElementById('edit-modal').classList.add('hidden');
  }
});

document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const data = {
    title: document.getElementById('edit-title').value.trim(),
    video_url: document.getElementById('edit-video-url').value.trim(),
    category: document.getElementById('edit-category').value.trim(),
    duration: document.getElementById('edit-duration').value.trim(),
    channel: document.getElementById('edit-channel').value.trim(),
    thumbnail: document.getElementById('edit-thumbnail').value.trim(),
    description: document.getElementById('edit-description').value.trim()
  };

  try {
    const res = await apiPut(`/videos/${id}`, data);
    if (res.success) {
      showToast('✅ تم تعديل الفيديو بنجاح · Video updated!', 'success');
      document.getElementById('edit-modal').classList.add('hidden');
      await loadAllData();
      renderVideosTable();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'خطأ في التعديل'), 'error');
  }
});

// ══════════════════════════════════════════════════════
// ── DELETE MODAL
// ══════════════════════════════════════════════════════

function openDeleteModal(videoId) {
  document.getElementById('delete-video-id').value = videoId;
  document.getElementById('delete-modal').classList.remove('hidden');
}

document.getElementById('close-delete-modal')?.addEventListener('click', () => {
  document.getElementById('delete-modal').classList.add('hidden');
});

document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
  document.getElementById('delete-modal').classList.add('hidden');
});

document.getElementById('delete-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('delete-modal')) {
    document.getElementById('delete-modal').classList.add('hidden');
  }
});

// ── Pin / Unpin video (المثبّت يظهر أولاً في الواجهة الرئيسية)
const pinInFlight = new Set();
async function togglePinVideo(videoId) {
  if (pinInFlight.has(videoId)) return; // امنع الضغط المزدوج
  const video = (allVideos || []).find(v => v._id === videoId);
  if (!video) return;

  const newState = !video.isPinned;
  pinInFlight.add(videoId);
  try {
    const res = await apiPut(`/videos/${videoId}/pin`, { isPinned: newState });
    if (!res || !res.success) throw new Error((res && res.error) || 'فشل التثبيت');
    showToast(
      newState ? '📌 تم تثبيت الفيديو · Video pinned' : '✅ تم إلغاء التثبيت · Video unpinned',
      'success'
    );
    await loadAllData();   // يعيد الترتيب القادم من السيرفر (المثبّت أولاً)
    renderVideosTable();
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل التثبيت'), 'error');
  } finally {
    pinInFlight.delete(videoId);
  }
}
window.togglePinVideo = togglePinVideo;

document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
  const id = document.getElementById('delete-video-id').value;
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري الحذف...';

  try {
    const res = await apiDelete(`/videos/${id}`);
    if (res.success) {
      showToast('✅ تم حذف الفيديو · Video deleted', 'success');
      document.getElementById('delete-modal').classList.add('hidden');
      await loadAllData();
      renderVideosTable();
      if (document.getElementById('page-dashboard').classList.contains('active')) {
        loadDashboard();
      }
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل الحذف'), 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> نعم، احذف · Delete';
});

// ══════════════════════════════════════════════════════
// ── SUBSCRIBERS PAGE
// ══════════════════════════════════════════════════════

document.getElementById('sub-search')?.addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = allSubscribers.filter(s => s.email.toLowerCase().includes(q));
  renderSubscribersTable(filtered);
});

function renderSubscribersTable(subs = null) {
  const data = subs ?? allSubscribers;
  const tbody = document.getElementById('subs-tbody');

  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p>لا يوجد مشتركون بعد</p>
          <small>No subscribers yet</small>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((s, i) => `
    <tr>
      <td class="sub-index">${i + 1}</td>
      <td class="sub-email">${s.email}</td>
      <td class="sub-date">${formatDate(s.createdAt)}</td>
      <td style="text-align:center;">
        <button class="action-btn danger" onclick="deleteSubscriber('${s._id}')" title="حذف المشترك · Delete Subscriber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// ── Delete Single Subscriber
async function deleteSubscriber(subId) {
  if (!confirm('هل أنت تأكد من حذف هذا المشترك؟')) return;
  try {
    const res = await apiDelete(`/subscribers/${subId}`);
    if (res.success) {
      showToast('✅ تم حذف المشترك بنجاح', 'success');
      await loadAllData();
      renderSubscribersTable();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل حذف المشترك'), 'error');
  }
}

// ── Delete All Subscribers
document.getElementById('delete-all-subs-btn')?.addEventListener('click', async () => {
  if (!allSubscribers.length) {
    showToast('لا يوجد مشتركون للحذف', 'info');
    return;
  }

  if (!confirm(`⚠️ هل أنت تأكد تماماً من حذف كافة المشتركين (${allSubscribers.length} مشترك)؟ لا يمكن التراجع عن هذا الإجراء!`)) return;

  try {
    const res = await apiDelete('/subscribers');
    if (res.success) {
      showToast('✅ تم حذف كافة المشتركين بنجاح', 'success');
      await loadAllData();
      renderSubscribersTable();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل حذف المشتركين'), 'error');
  }
});

// Export CSV
document.getElementById('export-subs-btn')?.addEventListener('click', () => {
  if (!allSubscribers.length) {
    showToast('لا يوجد مشتركون للتصدير', 'info');
    return;
  }

  const csv = 'Email,Date\n' + allSubscribers.map(s =>
    `"${s.email}","${formatDate(s.createdAt)}"`
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ تم تصدير قائمة المشتركين', 'success');
});

// ══════════════════════════════════════════════════════
// ── SETTINGS PAGE
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// ── SETTINGS PAGE
// ══════════════════════════════════════════════════════

async function loadSettings() {
  try {
    const res = await apiGet('/settings');
    if (res.success && res.data) {
      const s = res.data;
      // Social links
      document.getElementById('settings-wa').value = s.contact?.wa || '';
      document.getElementById('settings-ig').value = s.contact?.ig || '';
      document.getElementById('settings-li').value = s.contact?.li || '';

      // Hero Bg Type Radio
      const bgType = s.heroBgType || 'video';
      const radioEl = document.querySelector(`input[name="heroBgType"][value="${bgType}"]`);
      if (radioEl) radioEl.checked = true;

      // Loop Video Url & Player
      const videoUrl = s.videoLoopUrl || s.bgVideoUrl || '';
      document.getElementById('settings-bg-video').value = videoUrl;
      document.getElementById('current-loop-url').value = videoUrl || 'لا يوجد فيديو مجدول';

      const playerContainer = document.getElementById('loop-video-player-container');
      const player = document.getElementById('loop-video-player');
      if (videoUrl && player) {
        player.src = videoUrl;
        if (playerContainer) playerContainer.classList.remove('hidden');
      } else if (playerContainer) {
        playerContainer.classList.add('hidden');
        if (player) player.src = '';
      }

      // Hero Image Url & Display
      const imgUrl = s.heroImageUrl || '';
      document.getElementById('settings-hero-img-url').value = imgUrl;
      document.getElementById('current-hero-img-url').value = imgUrl || 'لا توجد صورة مجدولة';

      const imgContainer = document.getElementById('hero-img-display-container');
      const imgDisplay = document.getElementById('hero-img-display');
      if (imgUrl && imgDisplay) {
        imgDisplay.src = imgUrl;
        if (imgContainer) imgContainer.classList.remove('hidden');
      } else if (imgContainer) {
        imgContainer.classList.add('hidden');
        if (imgDisplay) imgDisplay.src = '';
      }
    }
  } catch (err) {
    showToast('خطأ: قاعدة البيانات غير متصلة (لا يمكن جلب الإعدادات)', 'error');
  }
}

// 1. Save Social Links
document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-settings-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري الحفظ...';

  const data = {
    contact: {
      wa: document.getElementById('settings-wa').value.trim(),
      ig: document.getElementById('settings-ig').value.trim(),
      li: document.getElementById('settings-li').value.trim()
    }
  };

  try {
    const res = await apiPost('/settings', data);
    if (res.success) {
      showToast('✅ تم حفظ روابط التواصل بنجاح · Social links saved!', 'success');
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'خطأ في الحفظ'), 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> حفظ وروابط التواصل · Save Social';
});

// 2. Save Active Hero Background Type
document.getElementById('save-bg-type-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('save-bg-type-btn');
  const selectedRadio = document.querySelector('input[name="heroBgType"]:checked');
  const heroBgType = selectedRadio ? selectedRadio.value : 'video';

  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري التفعيل...';

  try {
    const res = await apiPost('/settings', { heroBgType });
    if (res.success) {
      showToast('✅ تم تحديث وتفعيل نوع خلفية الموقع!', 'success');
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل التحديث'), 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> تفعيل نوع الخلفية المحدد';
});

// 3. Save Direct Loop Video URL
document.getElementById('save-loop-url-btn')?.addEventListener('click', async () => {
  const url = document.getElementById('settings-bg-video').value.trim();
  try {
    const res = await apiPost('/settings', { videoLoopUrl: url, bgVideoUrl: url, heroBgType: 'video' });
    if (res.success) {
      showToast('✅ تم حفظ رابط فيديو اللوب وتفعيله!', 'success');
      loadSettings();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل الحفظ'), 'error');
  }
});

// 4. Upload Loop Video File
document.getElementById('loop-video-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('upload-loop-btn');
  const input = document.getElementById('loop-file-input');

  if (!input.files.length) {
    showToast('الرجاء اختيار ملف فيديو أولاً', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري الرفع...';

  const formData = new FormData();
  formData.append('video', input.files[0]);

  try {
    const res = await apiUpload('/settings/video-loop', formData, () => { });
    if (res.success) {
      showToast('✅ تم رفع فيديو اللوب وحفظه بنجاح!', 'success');
      e.target.reset();
      document.getElementById('loop-preview')?.classList.add('hidden');
      const inner = document.getElementById('loop-drop-inner');
      if (inner) inner.style.display = '';
      loadSettings();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل الرفع'), 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> رفع فيديو اللوب · Upload';
});

// 5. Delete Loop Video Button
document.getElementById('delete-loop-btn')?.addEventListener('click', async () => {
  if (!confirm('هل أنت تأكد من إزالة وحذف فيديو اللوب الحالي؟')) return;
  const btn = document.getElementById('delete-loop-btn');
  btn.disabled = true;

  try {
    const res = await apiPost('/settings/delete-video-loop', {});
    if (res.success) {
      showToast('✅ تم حذف فيديو اللوب بنجاح!', 'success');
      loadSettings();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل الحذف'), 'error');
  }

  btn.disabled = false;
});

// 6. Save Direct Hero Image URL
document.getElementById('save-hero-img-url-btn')?.addEventListener('click', async () => {
  const url = document.getElementById('settings-hero-img-url').value.trim();
  try {
    const res = await apiPost('/settings', { heroImageUrl: url, heroBgType: 'image' });
    if (res.success) {
      showToast('✅ تم حفظ رابط صورة الخلفية وتفعيلها!', 'success');
      loadSettings();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل الحفظ'), 'error');
  }
});

// 7. Upload Hero Image File
document.getElementById('hero-image-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('upload-hero-img-btn');
  const input = document.getElementById('hero-img-file-input');

  if (!input.files.length) {
    showToast('الرجاء اختيار ملف صورة أولاً', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري الرفع...';

  const formData = new FormData();
  formData.append('image', input.files[0]);

  try {
    const res = await apiUpload('/settings/hero-image', formData, () => { });
    if (res.success) {
      showToast('✅ تم رفع صورة الخلفية بنجاح!', 'success');
      e.target.reset();
      document.getElementById('hero-img-preview')?.classList.add('hidden');
      const inner = document.getElementById('hero-img-drop-inner');
      if (inner) inner.style.display = '';
      loadSettings();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل الرفع'), 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> رفع صورة الخلفية · Upload';
});

// 8. Delete Hero Image Button
document.getElementById('delete-hero-img-btn')?.addEventListener('click', async () => {
  if (!confirm('هل أنت تأكد من إزالة وحذف صورة الخلفية الحالية؟')) return;
  const btn = document.getElementById('delete-hero-img-btn');
  btn.disabled = true;

  try {
    const res = await apiPost('/settings/delete-hero-image', {});
    if (res.success) {
      showToast('✅ تم حذف صورة الخلفية بنجاح!', 'success');
      loadSettings();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'فشل الحذف'), 'error');
  }

  btn.disabled = false;
});

// 9. Categories Add Listener
document.getElementById('add-category-btn')?.addEventListener('click', addCategoryHandler);
document.getElementById('new-category-input')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCategoryHandler();
  }
});


// ══════════════════════════════════════════════════════
// ── UTILITIES
// ══════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('edit-modal')?.classList.add('hidden');
    document.getElementById('delete-modal')?.classList.add('hidden');
    document.getElementById('delete-admin-modal')?.classList.add('hidden');
  }
});


// ══════════════════════════════════════════════════════
// ── ADMIN MANAGEMENT LOGIC
// ══════════════════════════════════════════════════════

// allAdmins is declared globally at top of file

async function loadAdminsPage() {
  const tbody = document.getElementById('admins-tbody');
  const badge = document.getElementById('admins-count-badge');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="table-loading"><div class="loader-ring"></div> جاري تحميل قائمة المدراء...</td></tr>';

  try {
    const res = await apiGet('/admin/users');
    if (res.success && Array.isArray(res.admins)) {
      allAdmins = res.admins;
      if (badge) badge.textContent = `${allAdmins.length} مدراء`;
      renderAdminsTable();
    } else {
      throw new Error(res.error || 'فشل جلب المدراء');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${err.message || 'خطأ في التحميل'}</td></tr>`;
  }
}

function renderAdminsTable() {
  const tbody = document.getElementById('admins-tbody');
  if (!tbody) return;

  if (allAdmins.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">لا يوجد مدراء مسجلون</td></tr>';
    return;
  }

  tbody.innerHTML = allAdmins.map((admin, idx) => {
    const dateStr = admin.createdAt ? formatDate(admin.createdAt) : '—';
    const isRootProtected = (admin.username || '').toLowerCase() === 'alawadhi';
    const isCurrentUser = currentUsername && (currentUsername.toLowerCase() === (admin.username || '').toLowerCase());

    const roleBadge = admin.role === 'superadmin'
      ? '<span class="admin-role-badge superadmin">🛡️ مدير عام (Super Admin)</span>'
      : '<span class="admin-role-badge admin">👤 مدير (Admin)</span>';

    let deleteBtnHtml = '';

    if (isRootProtected) {
      deleteBtnHtml = `<span class="admin-status-tag protected">👑 المدير الرئيسي المحمي</span>`;
    } else if (isCurrentUser) {
      deleteBtnHtml = `<span class="admin-status-tag current">👤 حسابك الحالي</span>`;
    } else if (currentUserRole !== 'superadmin') {
      deleteBtnHtml = `<span class="admin-status-tag locked" title="صلاحية المدير العام فقط">🔒 صلاحية المدير العام</span>`;
    } else {
      deleteBtnHtml = `<button class="action-btn danger" onclick="openDeleteAdminModal('${admin._id}', '${escapeHtml(admin.name || admin.username)}', '${escapeHtml(admin.username)}')" title="حذف المدير">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
         </button>`;
    }

    return `
      <tr>
        <td style="text-align:center;"><strong>${idx + 1}</strong></td>
        <td><strong style="color:var(--text-primary); font-size:0.95rem;">${escapeHtml(admin.name || admin.username)}</strong></td>
        <td><code class="admin-username-code">@${escapeHtml(admin.username)}</code></td>
        <td>${roleBadge}</td>
        <td style="font-size:0.85rem; color:var(--text-muted); white-space:nowrap;">${dateStr}</td>
        <td style="text-align:center; white-space:nowrap;">${deleteBtnHtml}</td>
      </tr>
    `;
  }).join('');
}

// ── إضافة مدير جديد
document.getElementById('add-admin-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-admin-name').value.trim();
  const username = document.getElementById('new-admin-username').value.trim();
  const password = document.getElementById('new-admin-password').value;
  const role = document.getElementById('new-admin-role').value;
  const btn = document.getElementById('submit-add-admin-btn');

  if (!username || !password) return;

  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري الإضافة...';

  try {
    const res = await apiPost('/admin/users', { name, username, password, role });
    if (res.success) {
      showToast('✅ تم إضافة المدير الجديد بنجاح!', 'success');
      document.getElementById('add-admin-form').reset();
      loadAdminsPage();
    } else {
      showToast(`❌ ${res.error || 'فشل إضافة المدير'}`, 'error');
    }
  } catch (err) {
    showToast(`❌ ${err.message || 'فشل في الاتصال'}`, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> إضافة المدير الجديد';
});

// ── حذف مدير
function openDeleteAdminModal(id, name, username) {
  document.getElementById('delete-admin-target-id').value = id;
  document.getElementById('delete-admin-name-display').textContent = `${name} (@${username})`;
  document.getElementById('delete-admin-modal').classList.remove('hidden');
}

document.getElementById('close-delete-admin-modal')?.addEventListener('click', () => {
  document.getElementById('delete-admin-modal').classList.add('hidden');
});

document.getElementById('cancel-delete-admin-btn')?.addEventListener('click', () => {
  document.getElementById('delete-admin-modal').classList.add('hidden');
});

document.getElementById('confirm-delete-admin-btn')?.addEventListener('click', async () => {
  const id = document.getElementById('delete-admin-target-id').value;
  const btn = document.getElementById('confirm-delete-admin-btn');

  if (!id) return;

  btn.disabled = true;
  btn.innerHTML = '<div class="loader-ring"></div> جاري الحذف...';

  try {
    const res = await apiDelete(`/admin/users/${id}`);
    if (res.success) {
      showToast('✅ تم حذف المدير بنجاح', 'success');
      document.getElementById('delete-admin-modal').classList.add('hidden');
      loadAdminsPage();
    } else {
      showToast(`❌ ${res.error || 'فشل الحذف'}`, 'error');
    }
  } catch (err) {
    showToast(`❌ ${err.message || 'خطأ في الاتصال'}`, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> نعم، احذف المدير';
});

// ══════════════════════════════════════════════════════
// GLOBAL WINDOW BINDINGS (for inline HTML onclick attributes)
// ══════════════════════════════════════════════════════
window.switchPage = switchPage;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.deleteCategory = deleteCategory;
window.addCategoryHandler = addCategoryHandler;
window.openDeleteAdminModal = openDeleteAdminModal;
window.deleteSubscriber = deleteSubscriber;
window.loadAdminsPage = loadAdminsPage;
window.loadCategoriesPage = loadCategoriesPage;
window.renderVideosTable = renderVideosTable;


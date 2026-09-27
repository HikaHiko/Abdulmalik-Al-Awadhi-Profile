# 🚀 دليل رفع وتشغيل موقع ABDULMALEK Portfolio على الاستضافة (Production Deployment Guide)

يقدم هذا الدليل خطوة بخطوة كيفية رفع الموقع واللوحة الإدارية على الاستضافات السحابية مثل **Render**, **Railway**, **VPS (Nginx + PM2)** أو **MongoDB Atlas**.

---

## 📋 1. متطلبات رفع المشروع (Prerequisites)
1. **قاعدة البيانات:** حساب مجاني في [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) للحصول على رابط اتصال سحابي `MONGO_URI`.
2. **الخادم / الاستضافة:** حساب في [Render](https://render.com) أو [Railway](https://railway.app) أو خادم خاص VPS.
3. **إصدار Node.js:** إصدار 18 أو 20 أحدث.

---

## 🗄️ 2. إعداد قاعدة البيانات السحابية (MongoDB Atlas)
1. قم بإنشاء Cluster مجاني في MongoDB Atlas.
2. أنشئ مستخدم قاعدة بيانات (Database User) وحدد اسم المستخدم وكلمة المرور.
3. في قسم **Network Access**، أضف IP `0.0.0.0/0` للسموح بالاتصال من أي سيرفر استضافة.
4. احصل على رابط الاتصال (Connection String) وسيكون بالشكل التالي:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/abdulmalek_portfolio?retryWrites=true&w=majority
   ```

---

## 🔐 3. متغيرات البيئة للإنتاج (Production Environment Variables)
عند إنشاء الخادم على الاستضافة، قم بإضافة متغيرات البيئة التالية في قسم **Environment Variables**:

| اسم المتغير | الوصف / القيمه |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (أو يُحدد تلقائياً بواسطة المنصة) |
| `MONGO_URI` | رابط الاتصال بقاعدة بيانات MongoDB Atlas |
| `ADMIN_USERNAME` | `ALAWADHI` (حساب المدير العام الرئيسي المحمي) |
| `ADMIN_PASSWORD_HASH` | الهاش المولد لكلمة المرور `M.malek.1` عبر Bcrypt |
| `JWT_SECRET` | مفتاح تشفير عشوائي بطول 64 بايت (مثال: `node scripts/generate-secrets.js`) |
| `SESSION_SECRET` | مفتاح تشفير الجلسات |

---

## 🌐 4. الرفع على منصة Render (موصى به)
1. ارفع الكود إلى **GitHub**.
2. في لوحة تحكم Render، انقر على **New +** ثم **Web Service**.
3. اختر المستودع الخاص بك (Repository).
4. اضبط الإعدادات التالية:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. أضف متغيرات البيئة المنصوص عليها أعلاه في قسم **Environment Variables**.
6. اضغط على **Create Web Service**.

---

## 🖥️ 5. الرفع على خادم خاص VPS (Nginx + PM2)
إذا كنت تستخدم خادم Ubuntu VPS:

1. **تثبيت Node.js و PM2:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs ffmpeg
   sudo npm install -g pm2
   ```

2. **تشغيل التطبيق بواسطة PM2:**
   ```bash
   cd /var/www/abdulmalek-backend-master/backend
   npm install
   pm2 start server.js --name "abdulmalek-portfolio"
   pm2 save
   pm2 startup
   ```

3. **إعداد Nginx كـ Reverse Proxy (مع SSL Certbot):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
       }
   }
   ```

---

## ✅ 6. التحقق واختبار الجاهزية
- روت الفحص (Health Check): `GET /api/health`
- روت الدخول للإدارة: `POST /api/admin/login`
- الواجهة الرئيسية: `http://your-domain.com/`
- لوحة التحكم: `http://your-domain.com/admin/`

---
🎉 **الموقع الآن جاهز 100% للرفع والتعديل على أي بيئة سحابية!**

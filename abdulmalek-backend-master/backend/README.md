# ABDULMALEK Portfolio — Backend API v2.0

## التقنيات
- **Node.js + Express.js** — السيرفر
- **MongoDB + Mongoose** — قاعدة البيانات
- **Multer** — رفع ملفات الفيديو

## هيكل المشروع
```
backend/
├── server.js                 # نقطة البداية
├── db.js                     # اتصال MongoDB
├── .env.example              # متغيرات البيئة
├── package.json
├── uploads/                  # مجلد الفيديوهات المرفوعة
├── models/
│   ├── Video.js              # MongoDB Schema للفيديوهات
│   └── Subscriber.js         # MongoDB Schema للمشتركين
├── routes/
│   ├── videos.js
│   └── subscribers.js
├── controllers/
│   ├── videos.js
│   └── subscribers.js
└── middleware/
    ├── auth.js               # حماية مسارات الأدمن
    └── upload.js             # إعداد Multer
```

## تشغيل المشروع

```bash
# 1. تثبيت المكتبات
npm install

# 2. نسخ ملف البيئة وتعديله
cp .env.example .env

# 3. تشغيل للتطوير
npm run dev

# 4. تشغيل للإنتاج
npm start
```

## ملف .env

```env
PORT=3000
ADMIN_KEY=M.malek.1

# محلي
MONGO_URI=mongodb://localhost:27017/videoDB

# أو MongoDB Atlas (مجاناً على cloud.mongodb.com)
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/videoDB
```

## API Endpoints

### فيديوهات (Public)
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/videos` | كل الفيديوهات |
| GET | `/api/videos?category=Cinematic` | فلترة |
| GET | `/api/videos?search=كلمة` | بحث |
| GET | `/api/videos/:id` | فيديو واحد |
| PATCH | `/api/videos/:id/view` | زيادة المشاهدات |

### فيديوهات (Admin — Header: x-admin-key)
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/videos` | إضافة برابط خارجي |
| POST | `/api/videos/upload/file` | رفع ملف مباشر (multipart) |
| PUT | `/api/videos/:id` | تعديل |
| DELETE | `/api/videos/:id` | حذف (يحذف الملف من الديسك أيضاً) |

### مشتركون
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/subscribers` | اشتراك جديد |
| GET | `/api/subscribers` | كل المشتركين (Admin) |

## استضافة مجانية مقترحة
- **MongoDB**: [MongoDB Atlas](https://cloud.mongodb.com) — مجاني حتى 512MB
- **Backend**: [Render.com](https://render.com) — مجاني
- **Frontend**: [Vercel.com](https://vercel.com) — مجاني

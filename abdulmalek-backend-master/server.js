// ══════════════════════════════════════════════════════
// server.js — Single-entry integration server (project root)
// ──────────────────────────────────────────────────────
// Place this file in the project ROOT, next to /backend and /frontend:
//
//   project-root/
//   ├── server.js        <-- this file
//   ├── backend/         (unchanged)
//   └── frontend/        (unchanged)
//
// What it does:
//   Boots the existing Express app in backend/server.js, which already
//   mounts everything on ONE port:
//
//     /api/*      -> backend routes (admin, videos, subscribers, settings)
//     /uploads/*  -> uploaded media
//     /admin/*    -> frontend/admin (admin panel)
//     /*          -> frontend/ (public site)
//
//   Nothing is duplicated or modified: no route, middleware, or database
//   logic is re-implemented here, so there is no risk of conflicts.
// ══════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const backendDir  = path.join(__dirname, 'backend');
const backendMain = path.join(backendDir, 'server.js');
const frontendDir = path.join(__dirname, 'frontend');

// Fail early with a clear message instead of a cryptic stack trace on Render
if (!fs.existsSync(backendMain)) {
  console.error('❌ backend/server.js not found. Put this file in the project root next to /backend.');
  process.exit(1);
}
if (!fs.existsSync(path.join(frontendDir, 'index.html'))) {
  console.error('❌ frontend/index.html not found. Expected a /frontend folder next to /backend.');
  process.exit(1);
}
if (!fs.existsSync(path.join(backendDir, 'node_modules'))) {
  console.error('❌ backend/node_modules is missing. Set the Render Build Command to: npm --prefix backend install');
  process.exit(1);
}

// Start the integrated app (it reads process.env.PORT, which Render provides)
require(backendMain);

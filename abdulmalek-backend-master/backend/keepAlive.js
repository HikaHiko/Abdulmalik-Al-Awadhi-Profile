// keepAlive.js
// Pings the app's own public URL every 10-12 minutes so Render's free tier
// doesn't spin the service down after 15 minutes of inactivity.

const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

function nextDelay() {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

function startKeepAlive(url = process.env.RENDER_EXTERNAL_URL) {
  // Only run in production on Render (RENDER_EXTERNAL_URL is set automatically there).
  if (!url) {
    console.log('[keepAlive] No URL configured, skipping.');
    return;
  }

  const target = url.replace(/\/$/, '') + '/ping';

  const ping = async () => {
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(30_000) });
      console.log(`[keepAlive] ${new Date().toISOString()} -> ${res.status}`);
    } catch (err) {
      console.error(`[keepAlive] Ping failed: ${err.message}`);
    } finally {
      setTimeout(ping, nextDelay()).unref(); // schedule next ping, random 10-12 min
    }
  };

  setTimeout(ping, nextDelay()).unref();
  console.log(`[keepAlive] Started, pinging ${target} every 10-12 minutes.`);
}

module.exports = startKeepAlive;

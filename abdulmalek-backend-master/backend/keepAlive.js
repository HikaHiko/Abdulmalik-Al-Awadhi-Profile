// keepAlive.js
// Pings the app's own public URL every 10 minutes so Render's free tier
// doesn't put it to sleep after 15 minutes of inactivity.
// Requires Node 18+ (built-in fetch).

const KEEP_ALIVE_URL =
  process.env.KEEP_ALIVE_URL ||
  "https://abdulmalik-al-awadhi-profile.onrender.com";

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function startKeepAlive() {
  console.log(
    `[keep-alive] started: pinging ${KEEP_ALIVE_URL} every ${PING_INTERVAL_MS / 60000} minutes`
  );

  setInterval(async () => {
    try {
      const res = await fetch(KEEP_ALIVE_URL);
      console.log(`[keep-alive] ${new Date().toISOString()} -> ${res.status}`);
    } catch (err) {
      console.error(`[keep-alive] ping failed: ${err.message}`);
    }
  }, PING_INTERVAL_MS);
}

module.exports = startKeepAlive;

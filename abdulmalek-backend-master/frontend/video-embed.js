/**
 * video-embed.js
 * ---------------------------------------------------------------------------
 * Turn a video URL into an in-page player. No dependencies, no build step.
 *
 * Supported:
 *   - YouTube    watch?v=, youtu.be/, /shorts/, /embed/, /live/   (with ?t= start time)
 *   - TikTok     tiktok.com/@user/video/<id>, /share/video/<id>, /player/v1/<id>
 *   - Instagram  /p/<code>, /reel/<code>, /reels/<code>, /tv/<code>   (public posts only)
 *   - Direct files (.mp4 / .webm / .mov / .m4v / .ogv) -> native <video>
 *     (handy for videos you upload to your own backend)
 *
 * Quick start:
 *   import { renderVideo } from './video-embed.js';
 *   renderVideo('#player', 'https://youtu.be/dQw4w9WgXcQ');
 *
 * API:
 *   parseVideoUrl(url, opts)         -> { provider, id, embedUrl, aspectRatio, maxWidth } | null
 *   createVideoEmbed(url, opts)      -> HTMLElement | null     (you place it yourself)
 *   renderVideo(target, url, opts)   -> HTMLElement | null     (mounts into target, shows error text on failure)
 *
 * Options (all optional):
 *   title        {string}   Accessible title for the player          (default: "<Provider> video")
 *   autoplay     {boolean}  Autoplay muted where the provider allows  (default: false)
 *   lazy         {boolean}  Lazy-load the iframe                      (default: true)
 *   aspectRatio  {string}   Override the CSS aspect-ratio, e.g. "4 / 5"
 *   maxWidth     {string}   Override max width, e.g. "480px"
 *   className    {string}   Extra class(es) for the wrapper
 *   injectStyles {boolean}  Inject the small default stylesheet       (default: true)
 *   onError      {(msg: string) => void}  Called when a URL can't be embedded
 * ---------------------------------------------------------------------------
 */

const STYLE_ID = 've-styles';

const DEFAULT_CSS = `
.ve-wrapper{position:relative;width:100%;margin-inline:auto;background:#000;
  aspect-ratio:var(--ve-ratio,16 / 9);border-radius:var(--ve-radius,12px);overflow:hidden}
.ve-wrapper[data-provider="instagram"]{background:#fff}
.ve-wrapper iframe,.ve-wrapper video{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.ve-error{margin:0;padding:1rem;border-radius:var(--ve-radius,12px);background:rgba(127,127,127,.12);
  color:inherit;font-size:.95rem;text-align:center}
`;

/* ----------------------------- URL helpers -------------------------------- */

/** Parse user input into a URL object; tolerates a missing "https://". */
function toUrl(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** True if host is `domain` or any subdomain of it (never a look-alike such as evilyoutube.com). */
function isHost(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

const segments = (url) => url.pathname.split('/').filter(Boolean);

/** "90", "90s", "1m30s", "1h2m3s" -> seconds. */
function parseTimestamp(value) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}

/* ------------------------------ Providers --------------------------------- */

function parseYouTube(url, { autoplay }) {
  const host = url.hostname.toLowerCase();
  const segs = segments(url);
  let id = null;

  if (isHost(host, 'youtu.be')) {
    id = segs[0];
  } else if (isHost(host, 'youtube.com') || isHost(host, 'youtube-nocookie.com')) {
    if (segs[0] === 'watch') id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(segs[0])) id = segs[1];
  } else {
    return null;
  }

  if (!id || !/^[\w-]{11}$/.test(id)) return null;

  const params = new URLSearchParams({ rel: '0', playsinline: '1' });
  const start = parseTimestamp(url.searchParams.get('t') || url.searchParams.get('start'));
  if (start) params.set('start', String(start));
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }

  const isShort = segs[0] === 'shorts';
  return {
    provider: 'youtube',
    id,
    // youtube-nocookie.com = same player, no tracking cookies until the user plays.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params}`,
    aspectRatio: isShort ? '9 / 16' : '16 / 9',
    maxWidth: isShort ? '400px' : undefined,
  };
}

function parseTikTok(url, { autoplay }) {
  const host = url.hostname.toLowerCase();
  if (!isHost(host, 'tiktok.com')) return null;

  const segs = segments(url);
  let id = null;

  // .../@user/video/<id>, .../share/video/<id>
  const videoIdx = segs.indexOf('video');
  if (videoIdx !== -1) id = segs[videoIdx + 1];
  // .../player/v1/<id>, .../embed/v2/<id>, .../embed/<id>
  else if (segs[0] === 'player' || segs[0] === 'embed') id = segs[segs.length - 1];

  if (!id || !/^\d{6,25}$/.test(id)) return null;

  // Official TikTok Embed Player: https://developers.tiktok.com/doc/embed-player/
  const params = new URLSearchParams({ rel: '0', autoplay: autoplay ? '1' : '0' });
  return {
    provider: 'tiktok',
    id,
    embedUrl: `https://www.tiktok.com/player/v1/${id}?${params}`,
    aspectRatio: '9 / 16',
    maxWidth: '400px',
  };
}

function parseInstagram(url) {
  const host = url.hostname.toLowerCase();
  if (!isHost(host, 'instagram.com') && !isHost(host, 'instagr.am')) return null;

  const segs = segments(url);
  // Handles /p/<code>, /reel/<code>, and /<username>/p/<code>
  const idx = segs.findIndex((s) => ['p', 'reel', 'reels', 'tv'].includes(s));
  if (idx === -1) return null;

  const code = segs[idx + 1];
  if (!code || !/^[\w-]{5,}$/.test(code)) return null;

  const kind = segs[idx] === 'reels' ? 'reel' : segs[idx];
  const isReel = kind === 'reel' || kind === 'tv';

  return {
    provider: 'instagram',
    id: code,
    embedUrl: `https://www.instagram.com/${kind}/${code}/embed/`,
    // Instagram's iframe can't auto-size without their script, so these ratios
    // leave room for its header/footer. Override with the `aspectRatio` option.
    aspectRatio: isReel ? '10 / 21' : '5 / 7',
    maxWidth: isReel ? '400px' : '480px',
  };
}

function parseDirectFile(url) {
  if (!/\.(mp4|webm|mov|m4v|ogv)$/i.test(url.pathname)) return null;
  return {
    provider: 'file',
    id: url.pathname.split('/').pop(),
    embedUrl: url.href,
    aspectRatio: '16 / 9',
    maxWidth: undefined,
  };
}

const PARSERS = [parseYouTube, parseTikTok, parseInstagram, parseDirectFile];

const PROVIDER_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  file: 'Video',
};

/* ------------------------------ Public API -------------------------------- */

/**
 * Detect the provider and build the embed URL. Pure function (no DOM access).
 * @param {string} input
 * @param {{autoplay?: boolean}} [opts]
 * @returns {{provider: 'youtube'|'tiktok'|'instagram'|'file', id: string, embedUrl: string,
 *            aspectRatio: string, maxWidth?: string} | null}
 */
export function parseVideoUrl(input, opts = {}) {
  const url = toUrl(input);
  if (!url) return null;
  for (const parse of PARSERS) {
    const result = parse(url, { autoplay: Boolean(opts.autoplay) });
    if (result) return result;
  }
  return null;
}

/** Human-readable reason a URL could not be embedded. */
function explainFailure(input) {
  const url = toUrl(input);
  const host = url ? url.hostname.toLowerCase() : '';
  if (isHost(host, 'tiktok.com') && /^(vm|vt)\./.test(host)) {
    return 'TikTok short links cannot be embedded. Please use the full video URL (tiktok.com/@user/video/…).';
  }
  if (isHost(host, 'tiktok.com') && segments(url)[0] === 't') {
    return 'TikTok short links cannot be embedded. Please use the full video URL (tiktok.com/@user/video/…).';
  }
  return 'This video link is not supported. Use a YouTube, Instagram, or TikTok video URL.';
}

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = DEFAULT_CSS;
  document.head.prepend(style); // prepend so your own CSS can override it
}

/**
 * Build the player element (does not insert it into the page).
 * @returns {HTMLElement | null} null if the URL is not supported
 */
export function createVideoEmbed(input, opts = {}) {
  const { title, autoplay = false, lazy = true, aspectRatio, maxWidth, className, injectStyles = true } = opts;

  const parsed = parseVideoUrl(input, { autoplay });
  if (!parsed) return null;
  if (injectStyles) ensureStyles();

  const label = title || `${PROVIDER_LABELS[parsed.provider]} video`;

  const wrapper = document.createElement('div');
  wrapper.className = ['ve-wrapper', className].filter(Boolean).join(' ');
  wrapper.dataset.provider = parsed.provider;
  wrapper.style.setProperty('--ve-ratio', aspectRatio || parsed.aspectRatio);
  const width = maxWidth || parsed.maxWidth;
  if (width) wrapper.style.maxWidth = width;

  let player;
  if (parsed.provider === 'file') {
    player = document.createElement('video');
    player.src = parsed.embedUrl;
    player.controls = true;
    player.playsInline = true;
    player.preload = 'metadata';
    player.setAttribute('aria-label', label);
    if (autoplay) {
      player.autoplay = true;
      player.muted = true;
    }
  } else {
    player = document.createElement('iframe');
    player.src = parsed.embedUrl;
    player.title = label;
    player.loading = lazy ? 'lazy' : 'eager';
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write';
    player.allowFullscreen = true;
    // Required by YouTube (missing referrer causes "Error 153"); safe default elsewhere.
    player.referrerPolicy = 'strict-origin-when-cross-origin';
  }

  wrapper.appendChild(player);
  return wrapper;
}

/**
 * Render the player into a container, replacing its current content.
 * If the URL isn't supported, shows a short message instead (and calls onError).
 * @param {string|Element} target  CSS selector or DOM element
 * @returns {HTMLElement | null}   the wrapper, or null on failure
 */
export function renderVideo(target, input, opts = {}) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) {
    console.warn(`[video-embed] Target not found: ${String(target)}`);
    return null;
  }

  const embed = createVideoEmbed(input, opts);
  container.replaceChildren();

  if (!embed) {
    const message = explainFailure(input);
    if (opts.injectStyles !== false) ensureStyles();
    const p = document.createElement('p');
    p.className = 've-error';
    p.setAttribute('role', 'alert');
    p.textContent = message; // textContent, never innerHTML: safe for untrusted URLs
    container.appendChild(p);
    if (typeof opts.onError === 'function') opts.onError(message);
    return null;
  }

  container.appendChild(embed);
  return embed;
}

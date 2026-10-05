import { createOptimizedPicture } from '../../scripts/aem.js';

const VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

/**
 * Returns true when an anchor points at a video file.
 * @param {HTMLAnchorElement} a
 */
function isVideoLink(a) {
  try {
    return VIDEO_RE.test(new URL(a.href, window.location.href).pathname);
  } catch {
    return false;
  }
}

/**
 * Returns the Vimeo video id and privacy hash when an anchor points at Vimeo.
 * Handles player.vimeo.com/video/{id}?h={hash} and vimeo.com/{id}/{hash}.
 * @param {HTMLAnchorElement} a
 * @returns {{id: string, hash: string|null}|null}
 */
function getVimeo(a) {
  try {
    const url = new URL(a.href, window.location.href);
    if (!/(^|\.)vimeo\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const idIndex = parts.findIndex((p) => /^\d+$/.test(p));
    if (idIndex < 0) return null;
    const hash = url.searchParams.get('h') || parts[idIndex + 1] || null;
    return { id: parts[idIndex], hash };
  } catch {
    return null;
  }
}

/**
 * Builds a muted, looping, chrome-less Vimeo background player.
 * Autoplay is skipped when the user prefers reduced motion. The iframe is
 * attached after the window load event so it does not compete with LCP.
 * @param {{id: string, hash: string|null}} vimeo
 * @param {Element} container element the iframe is appended to
 */
function buildVimeo(vimeo, container) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams({
    background: '1',
    autoplay: reduceMotion ? '0' : '1',
    muted: '1',
    loop: '1',
    autopause: '0',
    controls: '0',
    dnt: '1',
  });
  if (vimeo.hash) params.set('h', vimeo.hash);

  const iframe = document.createElement('iframe');
  iframe.className = 'hero-vimeo';
  iframe.title = 'Background video';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.setAttribute('frameborder', '0');
  iframe.src = `https://player.vimeo.com/video/${vimeo.id}?${params}`;

  // Stay hidden until the player is actually playing (or ready, when not
  // autoplaying), so privacy/domain errors fall back to the plain backdrop.
  const showOn = reduceMotion ? 'ready' : 'play';
  const onMessage = (e) => {
    if (e.source !== iframe.contentWindow || !/^https:\/\/player\.vimeo\.com$/.test(e.origin)) return;
    let { data } = e;
    try {
      if (typeof data === 'string') data = JSON.parse(data);
    } catch {
      return;
    }
    if (data?.event === 'ready' && showOn === 'play') {
      iframe.contentWindow.postMessage({ method: 'addEventListener', value: 'play' }, e.origin);
    }
    if (data?.event === showOn) {
      iframe.classList.add('is-playing');
      window.removeEventListener('message', onMessage);
    }
  };
  window.addEventListener('message', onMessage);

  const attach = () => container.append(iframe);
  if (document.readyState === 'complete') attach();
  else window.addEventListener('load', attach, { once: true });
}

/**
 * Builds a muted, looping background video from a link.
 * Autoplay is skipped when the user prefers reduced motion.
 * @param {HTMLAnchorElement} link
 * @param {HTMLPictureElement|null} poster
 */
function buildVideo(link, poster) {
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'metadata');
  video.setAttribute('aria-hidden', 'true');
  const posterImg = poster?.querySelector('img');
  if (posterImg) video.poster = posterImg.currentSrc || posterImg.src;

  const source = document.createElement('source');
  source.src = link.href;
  const ext = new URL(link.href, window.location.href).pathname.split('.').pop().toLowerCase();
  source.type = `video/${ext === 'mov' ? 'quicktime' : ext}`;
  video.append(source);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    video.autoplay = true;
    video.setAttribute('autoplay', '');
    video.addEventListener('loadeddata', () => video.play().catch(() => {}), { once: true });
  }
  return video;
}

/**
 * Removes elements left empty after media extraction.
 * @param {Element} root
 */
function pruneEmpty(root) {
  root.querySelectorAll('p, div').forEach((el) => {
    if (!el.children.length && !el.textContent.trim()) el.remove();
  });
}

/**
 * Hero: full-width background media (image or video) with a text panel
 * (heading, CTA, supporting copy) anchored to the bottom-left.
 *
 * Authored shape (any of these):
 *  - Row 1: background image and/or video link; Row 2: text content
 *  - A single row/cell holding media + text (auto-blocked hero)
 * @param {Element} block
 */
export default function decorate(block) {
  const media = document.createElement('div');
  media.className = 'hero-media';
  const content = document.createElement('div');
  content.className = 'hero-content';

  // Media: Vimeo link, video file link, first picture, or an authored <video>.
  const links = [...block.querySelectorAll('a[href]')];
  const vimeoLink = links.find((a) => getVimeo(a));
  const videoLink = links.find(isVideoLink);
  const picture = block.querySelector('picture');
  const authoredVideo = block.querySelector('video');

  if (vimeoLink) {
    media.classList.add('hero-media-vimeo');
    buildVimeo(getVimeo(vimeoLink), media);
    vimeoLink.remove();
    if (picture) picture.remove();
  } else if (videoLink) {
    media.append(buildVideo(videoLink, picture));
    videoLink.remove();
    if (picture) picture.remove();
  } else if (authoredVideo) {
    authoredVideo.muted = true;
    authoredVideo.playsInline = true;
    media.append(authoredVideo);
    if (picture) picture.remove();
  } else if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      const optimized = createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ]);
      const newImg = optimized.querySelector('img');
      newImg.setAttribute('fetchpriority', 'high');
      newImg.setAttribute('loading', 'eager');
      media.append(optimized);
    } else {
      media.append(picture);
    }
    picture.remove();
  }

  // Content: everything remaining, in authored order.
  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      pruneEmpty(cell);
      content.append(...cell.childNodes);
    });
  });
  pruneEmpty(content);

  // The first button (bold/italic link) is the CTA. Plain standalone links that
  // EDS auto-decorated as buttons are supporting text links: restore them.
  const firstCta = content.querySelector('a.button.primary, a.button.secondary')
    || content.querySelector('.button-container a, p > a:only-child');
  if (firstCta) firstCta.closest('p')?.classList.add('hero-cta');
  content.querySelectorAll('a.button:not(.primary):not(.secondary)').forEach((a) => {
    if (a === firstCta) return;
    a.classList.remove('button');
    if (!a.className) a.removeAttribute('class');
    const container = a.closest('.button-container');
    if (container) {
      container.classList.remove('button-container');
      if (!container.className) container.removeAttribute('class');
    }
  });

  block.replaceChildren();
  // the Vimeo iframe is attached after the page load event, so the container is still empty here
  if (media.children.length || media.classList.contains('hero-media-vimeo')) {
    block.append(media);
  } else {
    block.classList.add('no-media');
  }
  if (content.childNodes.length) block.append(content);
}

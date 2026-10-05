/*
 * Video Block
 * Content contract (DA table, any cell order):
 *   - a link to the video (YouTube, Vimeo, or a direct .mp4/.webm file)  - required
 *   - an optional poster image (picture)                                 - click-to-play
 *   - optional text content (heading, paragraphs, CTAs) in its own cell  - text + video layout
 *
 * Behaviour is inferred from the content (no option classes):
 *   - YouTube / Vimeo link           -> lazy iframe embed with player controls
 *   - file link + poster image       -> poster with play button, loads player on click
 *   - file link, no poster           -> muted, looping, inline autoplay with a Mute/Unmute toggle
 *                                       (falls back to a paused player with controls when the
 *                                       user prefers reduced motion)
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getVideoSource(href) {
  if (href.includes('youtube') || href.includes('youtu.be')) return 'youtube';
  if (href.includes('vimeo')) return 'vimeo';
  return 'file';
}

function getVideoTypeLabel(source) {
  return { youtube: 'YouTube video', vimeo: 'Vimeo video', file: 'video' }[source] || 'video';
}

function createFrame(src, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-frame';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope';
  iframe.setAttribute('allowfullscreen', '');
  wrapper.append(iframe);
  return wrapper;
}

function embedYoutube(url, autoplay) {
  const usp = new URLSearchParams(url.search);
  let vid = usp.get('v') || '';
  if (url.hostname.includes('youtu.be')) [, vid] = url.pathname.split('/');
  if (!vid && url.pathname.startsWith('/embed/')) [, , vid] = url.pathname.split('/');
  const params = new URLSearchParams({ rel: '0' });
  if (autoplay) params.set('autoplay', '1');
  return createFrame(`https://www.youtube.com/embed/${encodeURIComponent(vid)}?${params}`, 'Content from YouTube');
}

function embedVimeo(url, autoplay) {
  const parts = url.pathname.split('/').filter(Boolean);
  // vimeo.com/<id>/<hash> or player.vimeo.com/video/<id>?h=<hash>
  const idIndex = parts.findIndex((p) => /^\d+$/.test(p));
  const id = idIndex >= 0 ? parts[idIndex] : parts.pop();
  const hash = url.searchParams.get('h') || (idIndex >= 0 ? parts[idIndex + 1] : null);
  const search = new URLSearchParams();
  if (hash) search.set('h', hash);
  if (autoplay) search.set('autoplay', '1');
  const params = search.toString() ? `?${search}` : '';
  return createFrame(`https://player.vimeo.com/video/${encodeURIComponent(id)}${params}`, 'Content from Vimeo');
}

function createVideoElement(href, { autoplay, ambient }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-frame video-file';
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.preload = 'metadata';
  const source = document.createElement('source');
  source.src = href;
  const ext = new URL(href, window.location.href).pathname.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg'].includes(ext)) source.type = `video/${ext}`;
  video.append(source);
  wrapper.append(video);

  if (ambient) {
    video.muted = true;
    video.loop = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('autoplay', '');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'video-sound-toggle';
    const sync = () => {
      toggle.textContent = video.muted ? 'Unmute' : 'Mute';
      toggle.setAttribute('aria-pressed', String(!video.muted));
    };
    toggle.addEventListener('click', () => {
      video.muted = !video.muted;
      if (video.paused) video.play().catch(() => {});
      sync();
    });
    sync();
    wrapper.append(toggle);
    video.addEventListener('canplay', () => {
      video.play().catch(() => {});
    }, { once: true });
  } else {
    video.controls = true;
    if (autoplay) {
      video.setAttribute('autoplay', '');
      video.addEventListener('canplay', () => video.play().catch(() => {}), { once: true });
    }
  }
  return wrapper;
}

function loadEmbed(media, href, options) {
  if (media.dataset.embedLoaded === 'true') return;
  const source = getVideoSource(href);
  let embed;
  if (source === 'youtube') embed = embedYoutube(new URL(href), options.autoplay);
  else if (source === 'vimeo') embed = embedVimeo(new URL(href), options.autoplay);
  else embed = createVideoElement(href, options);
  media.append(embed);
  media.dataset.embedLoaded = 'true';
}

export default function decorate(block) {
  const link = block.querySelector('a[href]');
  if (!link) return;
  const { href } = link;
  const placeholder = block.querySelector('picture');
  const source = getVideoSource(href);

  // collect any authored text content (everything that is not the video link or poster)
  const text = document.createElement('div');
  text.className = 'video-text';
  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    if (placeholder && cell.contains(placeholder)) {
      const pWrap = placeholder.closest('p');
      (pWrap && cell.contains(pWrap) ? pWrap : placeholder).remove();
    }
    const linkWrap = link.closest('p, div');
    if (cell.contains(link)) {
      const linkOnly = linkWrap.textContent.trim() === link.textContent.trim();
      if (linkWrap !== cell && linkOnly) linkWrap.remove();
      else link.remove();
    }
    [...cell.children].forEach((el) => {
      if (el.textContent.trim() || el.querySelector('img, picture')) text.append(el);
    });
  });

  block.textContent = '';
  const media = document.createElement('div');
  media.className = 'video-media';
  media.dataset.embedLoaded = 'false';

  if (text.children.length) {
    block.classList.add('video-with-text');
    block.append(text);
  }
  block.append(media);

  if (placeholder) {
    const label = `Play ${getVideoTypeLabel(source)}`;
    const poster = document.createElement('div');
    poster.className = 'video-placeholder';
    poster.append(placeholder);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-placeholder-play';
    button.setAttribute('aria-label', label);
    button.title = label;
    poster.append(button);
    poster.addEventListener('click', () => {
      poster.remove();
      loadEmbed(media, href, { autoplay: true, ambient: false });
    });
    media.append(poster);
    return;
  }

  const ambient = source === 'file' && !prefersReducedMotion.matches;
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      loadEmbed(media, href, { autoplay: false, ambient });
    }
  }, { rootMargin: '200px' });
  observer.observe(block);
}

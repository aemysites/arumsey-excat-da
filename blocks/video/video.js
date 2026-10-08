/*
 * Video Block
 * Optional heading/text above a video. With a poster image, a play button overlays the poster
 * and the player is embedded on click; without one, the player is embedded when scrolled into view.
 *
 * Content model:
 *   | heading / intro text (optional) |
 *   | poster image (optional) | video link (YouTube, Vimeo, Kaltura iframe embed or .mp4) |
 * Options: autoplay (muted background playback, no controls)
 * Kaltura: a link to cdnapisec.kaltura.com (or any URL containing iframeembed=true) is played
 * in an iframe titled with the block heading.
 */

const OPTION_CLASSES = ['autoplay'];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const VIDEO_LINK = /youtube|youtu\.be|vimeo|cdnapisec\.kaltura\.com|iframeembed=true|\.mp4(\?|$)|\.webm(\?|$)/i;

function isKaltura(link) {
  try {
    if (new URL(link, window.location.href).hostname === 'cdnapisec.kaltura.com') return true;
  } catch (e) {
    // not a parseable URL - fall back to the query check
  }
  return link.includes('iframeembed=true');
}

function getVideoSource(link) {
  if (isKaltura(link)) return 'kaltura';
  if (link.includes('youtube') || link.includes('youtu.be')) return 'youtube';
  if (link.includes('vimeo')) return 'vimeo';
  return 'video';
}

function iframeWrapper(src, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-embed';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  iframe.allowFullscreen = true;
  wrapper.append(iframe);
  return wrapper;
}

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let vid = usp.get('v') || '';
  if (url.hostname.includes('youtu.be')) [, vid] = url.pathname.split('/');
  if (!vid && url.pathname.startsWith('/embed/')) [, , vid] = url.pathname.split('/');
  const params = new URLSearchParams({ rel: '0' });
  if (autoplay) params.set('autoplay', '1');
  if (background) {
    params.set('mute', '1');
    params.set('controls', '0');
    params.set('loop', '1');
    params.set('playsinline', '1');
    params.set('playlist', vid);
  }
  return iframeWrapper(`https://www.youtube.com/embed/${encodeURIComponent(vid)}?${params}`, 'Content from YouTube');
}

function embedVimeo(url, autoplay, background) {
  const parts = url.pathname.split('/').filter(Boolean);
  const idIndex = parts.findIndex((p) => /^\d+$/.test(p));
  const id = idIndex >= 0 ? parts[idIndex] : parts[0];
  const params = new URLSearchParams(url.search);
  const hash = idIndex >= 0 ? parts[idIndex + 1] : null;
  if (hash && !params.has('h')) params.set('h', hash);
  if (autoplay) params.set('autoplay', '1');
  if (background) params.set('background', '1');
  const query = params.toString();
  return iframeWrapper(`https://player.vimeo.com/video/${id}${query ? `?${query}` : ''}`, 'Content from Vimeo');
}

function videoElement(src, autoplay, background) {
  const video = document.createElement('video');
  video.controls = !background;
  if (autoplay) video.autoplay = true;
  if (background) {
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
  }
  const source = document.createElement('source');
  source.src = src;
  source.type = `video/${src.split('?')[0].split('.').pop()}`;
  video.append(source);
  return video;
}

function embedKaltura(url, autoplay, title) {
  const src = new URL(url.href);
  if (autoplay) src.searchParams.set('flashvars[autoPlay]', 'true');
  return iframeWrapper(src.href, title || 'Content from Kaltura');
}

function loadEmbed(container, link, autoplay, background, title) {
  if (container.dataset.embedLoaded === 'true') return;
  const url = new URL(link, window.location.href);
  const source = getVideoSource(link);
  let el;
  if (source === 'kaltura') el = embedKaltura(url, autoplay, title);
  else if (source === 'youtube') el = embedYoutube(url, autoplay, background);
  else if (source === 'vimeo') el = embedVimeo(url, autoplay, background);
  else el = videoElement(url.href, autoplay, background);
  container.append(el);
  container.dataset.embedLoaded = 'true';
}

export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));
  const autoplay = active.includes('autoplay');

  const videoLink = [...block.querySelectorAll('a[href]')]
    .find((a) => VIDEO_LINK.test(a.href));
  const placeholder = block.querySelector('picture');
  const link = videoLink?.href;

  // everything that isn't the poster or the video link is heading / intro content
  const header = document.createElement('div');
  header.className = 'video-header';
  if (videoLink) {
    const holder = videoLink.closest('p');
    if (holder && holder.textContent.trim() === videoLink.textContent.trim()) holder.remove();
    else videoLink.remove();
  }
  if (placeholder) placeholder.remove();
  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      [...cell.children].forEach((el) => {
        if (el.textContent.trim() || el.querySelector('img')) header.append(el);
      });
    });
  });

  const player = document.createElement('div');
  player.className = 'video-player';
  player.dataset.embedLoaded = 'false';

  block.replaceChildren(...(header.children.length ? [header] : []), player);
  if (!link) return;
  // iframe title (Kaltura): the heading text
  const title = header.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim() || '';

  if (placeholder && !autoplay) {
    block.classList.add('video-has-placeholder');
    const poster = document.createElement('div');
    poster.className = 'video-placeholder';
    poster.append(placeholder);
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'video-placeholder-play';
    play.setAttribute('aria-label', 'Play video');
    poster.append(play);
    poster.addEventListener('click', () => {
      poster.remove();
      loadEmbed(player, link, true, false, title);
    });
    player.append(poster);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      loadEmbed(player, link, autoplay && !prefersReducedMotion.matches, autoplay, title);
    }
  });
  observer.observe(block);
}

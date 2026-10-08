/**
 * Locale of the current page: first path segment, ignoring a leading /content (local preview).
 * @returns {string} two-letter locale or ''
 */
function currentLocale() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'content') segments.shift();
  return /^[a-z]{2}$/.test(segments[0] || '') ? segments[0] : '';
}

/**
 * Fetch the footer fragment: the page locale's footer first, then the fixed default paths
 * (/content for local preview, site root for DA/EDS).
 * @returns {Promise<Response|null>}
 */
async function fetchFooter() {
  const locale = currentLocale();
  let resp = null;
  if (locale) {
    resp = await fetch(`/content/${locale}/footer.plain.html`);
    if (!resp.ok) resp = await fetch(`/${locale}/footer.plain.html`);
  }
  if (!resp || !resp.ok) resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  return resp.ok ? resp : null;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const resp = await fetchFooter();
  if (!resp) return;
  const fragment = document.createElement('div');
  fragment.innerHTML = await resp.text();
  // Image paths in the fragment are relative to the fragment itself
  fragment.querySelectorAll('img').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), resp.url).href;
  });

  // Links to other sites open in a new tab, as on the source
  fragment.querySelectorAll('a[href]').forEach((a) => {
    const url = new URL(a.getAttribute('href'), window.location.href);
    if (/^https?:$/.test(url.protocol) && url.origin !== window.location.origin) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });

  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  [...fragment.children].forEach((section, i) => {
    section.classList.add(i === 0 ? 'footer-brand' : 'footer-links');
    footer.append(section);
  });

  block.textContent = '';
  block.append(footer);
}

// locales that have their own footer document (/<locale>/footer); the first is the site default
const LOCALES = ['en-us', 'es-us'];

/**
 * Returns the locale of the current page from its path (/en-us/..., /content/es-us/...).
 * @returns {string|null}
 */
function getPageLocale() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'content') segments.shift();
  const first = (segments[0] || '').replace(/\.html$/, '');
  return LOCALES.includes(first) ? first : null;
}

/**
 * Fetches the footer document: the locale footer first, then the site-wide footer.
 * Localhost (aem up) serves documents under /content, DA/EDS at the site root.
 * @returns {Promise<{html: string, url: string}|null>}
 */
async function fetchFooter() {
  const locale = getPageLocale();
  if (locale && locale !== LOCALES[0]) {
    let localeResp = await fetch(`/content/${locale}/footer.plain.html`);
    if (!localeResp.ok) localeResp = await fetch(`/${locale}/footer.plain.html`);
    if (localeResp.ok) return { html: await localeResp.text(), url: localeResp.url };
  }
  // metadata-independent: /content first (localhost), then root (DA/EDS prod)
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), url: resp.url };
}

/**
 * Points a locale link at the current page in that locale.
 * @param {HTMLAnchorElement} a
 */
function localizeLink(a) {
  const targetLocale = new URL(a.href, window.location).pathname.split('/').filter(Boolean)[0];
  const current = getPageLocale();
  if (!current || !LOCALES.includes(targetLocale)) return;
  const path = window.location.pathname.replace(/^\/content/, '').replace(/\.html$/, '');
  a.href = path.replace(new RegExp(`^/${current}`), `/${targetLocale}`);
}

/**
 * Turns a list item with a nested list into an inline toggle (click to show the list).
 * @param {Element} li
 */
function decorateToggle(li) {
  const list = li.querySelector(':scope > ul');
  li.classList.add('footer-toggle', 'footer-locale');
  list.classList.add('footer-toggle-list');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'footer-toggle-trigger';
  button.setAttribute('aria-expanded', 'false');
  [...li.childNodes].forEach((node) => {
    if (node === list) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) button.append(text);
      node.remove();
    } else {
      button.append(node);
    }
  });
  li.prepend(button);
  button.addEventListener('click', () => {
    button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  });
  list.querySelectorAll('a[href]').forEach(localizeLink);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerDoc = await fetchFooter();
  if (!footerDoc) return;
  const fragment = document.createElement('div');
  fragment.innerHTML = footerDoc.html;
  fragment.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), footerDoc.url).href;
    img.loading = 'lazy';
  });

  const names = ['logo', 'links', 'apps'];
  const content = document.createElement('div');
  content.className = 'footer-content';
  [...fragment.querySelectorAll(':scope > div')].forEach((section, i) => {
    section.className = `footer-${names[i] || `section-${i + 1}`}`;
    // image-only link lists (app badges, social links) are icon groups
    const links = [...section.querySelectorAll('a')];
    if (links.length && links.every((a) => !a.textContent.trim() && a.querySelector('img'))) {
      section.classList.add('footer-icons');
    }
    content.append(section);
  });

  content.querySelectorAll('li').forEach((li) => {
    if (li.querySelector(':scope > ul')) decorateToggle(li);
    else if (!li.querySelector('a')) li.classList.add('footer-text');
  });

  // external destinations open in a new tab
  content.querySelectorAll('a[href]').forEach((a) => {
    if (new URL(a.href, window.location).origin !== window.location.origin) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });

  block.textContent = '';
  block.append(content);
}

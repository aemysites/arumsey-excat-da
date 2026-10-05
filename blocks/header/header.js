import { decorateIcons } from '../../scripts/aem.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 1200px)');

// locales that have their own nav document (/<locale>/nav); the first is the site default
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
 * Fetches the nav document: the locale nav first, then the site-wide nav.
 * Localhost (aem up) serves documents under /content, DA/EDS at the site root.
 * @returns {Promise<{html: string, url: string}|null>}
 */
async function fetchNav() {
  const locale = getPageLocale();
  if (locale && locale !== LOCALES[0]) {
    let localeResp = await fetch(`/content/${locale}/nav.plain.html`);
    if (!localeResp.ok) localeResp = await fetch(`/${locale}/nav.plain.html`);
    if (localeResp.ok) return { html: await localeResp.text(), url: localeResp.url };
  }
  // metadata-independent: /content first (localhost), then root (DA/EDS prod)
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), url: resp.url };
}

/**
 * Resolves relative image paths against the nav document URL so they work
 * at every page depth.
 * @param {Element} root
 * @param {string} baseUrl
 */
function resolveImages(root, baseUrl) {
  root.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), baseUrl).href;
    img.loading = 'eager';
  });
}

/**
 * Returns the current page path translated to the locale of a locale link.
 * @param {string} href The locale link from the nav (e.g. /es-us)
 * @returns {string}
 */
function localizeHref(href) {
  const targetLocale = new URL(href, window.location).pathname.split('/').filter(Boolean)[0];
  const current = getPageLocale();
  if (!current || !LOCALES.includes(targetLocale)) return href;
  const path = window.location.pathname.replace(/^\/content/, '').replace(/\.html$/, '');
  return path.replace(new RegExp(`^/${current}`), `/${targetLocale}`);
}

/**
 * Opens or closes one dropdown (state lives on its trigger button).
 * @param {Element} drop The dropdown list item
 * @param {boolean} expanded
 */
function setExpanded(drop, expanded) {
  drop.querySelector(':scope > .nav-drop-trigger').setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

/**
 * @param {Element} drop The dropdown list item
 * @returns {boolean}
 */
function isExpanded(drop) {
  return drop.querySelector(':scope > .nav-drop-trigger').getAttribute('aria-expanded') === 'true';
}

/**
 * Closes every open dropdown inside the nav, except an optional one.
 * @param {Element} nav
 * @param {Element} [except]
 */
function closeDropdowns(nav, except) {
  nav.querySelectorAll('.nav-drop').forEach((drop) => {
    if (drop !== except && isExpanded(drop)) setExpanded(drop, false);
  });
}

/**
 * Turns a list item with a nested list into a dropdown with a trigger button.
 * Desktop: opens on hover, click toggles. Mobile: click toggles (accordion).
 * @param {Element} li
 * @param {Element} nav
 */
function decorateDropdown(li, nav) {
  const submenu = li.querySelector(':scope > ul');
  li.classList.add('nav-drop');
  submenu.classList.add('nav-drop-list');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-drop-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  [...li.childNodes].forEach((node) => {
    if (node === submenu) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) trigger.append(text);
      node.remove();
    } else {
      trigger.append(node);
    }
  });
  const chevron = document.createElement('span');
  chevron.className = 'icon icon-chevron-down nav-drop-chevron';
  trigger.append(chevron);
  li.prepend(trigger);

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    // desktop: one dropdown at a time; mobile accordion: sections expand independently
    if (isDesktop.matches) closeDropdowns(nav, li);
    setExpanded(li, !isExpanded(li));
  });
  li.addEventListener('mouseenter', () => {
    if (!isDesktop.matches) return;
    closeDropdowns(nav, li);
    setExpanded(li, true);
  });
  li.addEventListener('mouseleave', () => {
    if (isDesktop.matches) setExpanded(li, false);
  });
}

/**
 * Marks the current locale and points locale links at the same page in that locale.
 * @param {Element} localeList
 */
function decorateLocales(localeList) {
  const current = getPageLocale() || LOCALES[0];
  localeList.querySelectorAll(':scope > li > ul a[href]').forEach((a) => {
    const locale = new URL(a.href, window.location).pathname.split('/').filter(Boolean)[0];
    a.href = localizeHref(a.getAttribute('href'));
    if (locale === current) {
      a.setAttribute('aria-current', 'true');
      const check = document.createElement('span');
      check.className = 'icon icon-check nav-locale-check';
      a.append(check);
    }
  });
}

/**
 * Opens or closes the mobile menu.
 * @param {Element} nav
 * @param {boolean} [force] true to open, false to close
 */
function toggleMenu(nav, force) {
  const open = force !== undefined ? force : nav.getAttribute('aria-expanded') !== 'true';
  const button = nav.querySelector('.nav-hamburger button');
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  document.body.style.overflowY = (open && !isDesktop.matches) ? 'hidden' : '';
  if (!open) closeDropdowns(nav);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navDoc = await fetchNav();
  if (!navDoc) return;
  const fragment = document.createElement('div');
  fragment.innerHTML = navDoc.html;
  resolveImages(fragment, navDoc.url);

  const [brandSection, sectionsSection, toolsSection] = fragment.querySelectorAll(':scope > div');

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  // brand
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (brandSection) brand.append(...brandSection.childNodes);

  // panel: main links + locale selector (slide-in drawer on mobile)
  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  panel.id = 'nav-panel';
  const sections = document.createElement('div');
  sections.className = 'nav-sections';
  if (sectionsSection) sections.append(...sectionsSection.childNodes);
  panel.append(sections);

  // tools: the locale list goes into the panel, the CTA stays in the bar
  const cta = document.createElement('div');
  cta.className = 'nav-cta';
  if (toolsSection) {
    const localeList = toolsSection.querySelector('ul');
    if (localeList) {
      const locale = document.createElement('div');
      locale.className = 'nav-locale';
      locale.append(localeList);
      decorateLocales(localeList);
      panel.append(locale);
    }
    const ctaLink = toolsSection.querySelector('a');
    if (ctaLink) {
      ctaLink.className = 'button nav-cta-button';
      cta.append(ctaLink);
    }
  }

  // Document Authoring wraps list item text in <p>: unwrap so labels and links
  // sit directly in the <li>, the same as the plain nav document
  panel.querySelectorAll('li > p').forEach((p) => p.replaceWith(...p.childNodes));

  panel.querySelectorAll('li').forEach((li) => {
    if (li.querySelector(':scope > ul')) decorateDropdown(li, nav);
  });

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav-panel" aria-expanded="false" aria-label="Open navigation">
      <span class="nav-hamburger-line"></span><span class="nav-hamburger-line"></span><span class="nav-hamburger-line"></span>
    </button>`;
  hamburger.querySelector('button').addEventListener('click', () => toggleMenu(nav));

  nav.append(brand, panel, cta, hamburger);
  decorateIcons(nav);

  // close dropdowns on outside click; escape closes dropdowns and the mobile menu
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeDropdowns(nav);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    closeDropdowns(nav);
    if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') toggleMenu(nav, false);
  });

  // reset menu state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => toggleMenu(nav, false));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}

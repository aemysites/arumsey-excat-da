// Breakpoint where the full horizontal header replaces the mobile menu
const isDesktop = window.matchMedia('(width >= 900px)');

// UI chrome labels (not authored content); the source shows "Back" in every locale
const BACK_LABEL = 'Back';

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
 * Fetch the nav fragment: the page locale's nav first, then the fixed default paths
 * (/content for local preview, site root for DA/EDS).
 * @returns {Promise<Response|null>}
 */
async function fetchNav() {
  const locale = currentLocale();
  let resp = null;
  if (locale) {
    resp = await fetch(`/content/${locale}/nav.plain.html`);
    if (!resp.ok) resp = await fetch(`/${locale}/nav.plain.html`);
  }
  if (!resp || !resp.ok) resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  return resp.ok ? resp : null;
}

function closeSubmenus(scope) {
  scope.querySelectorAll('.nav-item.open').forEach((li) => {
    li.classList.remove('open');
    const toggle = li.querySelector(':scope > .nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
}

function setMenuOpen(nav, open) {
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
  if (!open) closeSubmenus(nav);
}

function setSearchOpen(nav, open) {
  nav.classList.toggle('search-open', open);
  const toggle = nav.querySelector('.nav-search-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    closeSubmenus(nav);
    const input = nav.querySelector('.nav-search input');
    if (input) input.focus();
  }
}

/**
 * Open or close a nav item. Opening closes its siblings (and their descendants),
 * like the source: one open path per column.
 */
function toggleItem(li) {
  const opening = !li.classList.contains('open');
  const siblings = [...li.parentElement.children].filter((s) => s !== li);
  siblings.forEach((s) => {
    s.classList.remove('open');
    closeSubmenus(s);
    const t = s.querySelector(':scope > .nav-toggle');
    if (t) t.setAttribute('aria-expanded', 'false');
  });
  if (!opening) closeSubmenus(li);
  li.classList.toggle('open', opening);
  li.querySelector(':scope > .nav-toggle').setAttribute('aria-expanded', opening ? 'true' : 'false');
}

/**
 * Turn the authored nested list into nav items: an item with a nested list gets a toggle
 * button (its authored link is a '#' placeholder), plain links stay links.
 * @param {Element} ul authored list
 * @param {number} level depth (0 = top bar)
 */
function decorateList(ul, level) {
  ul.classList.add('nav-list', `nav-level-${level}`);
  ul.setAttribute('role', level === 0 ? 'menubar' : 'menu');
  [...ul.children].forEach((li) => {
    li.classList.add('nav-item');
    li.setAttribute('role', 'none');
    const sub = li.querySelector(':scope > ul');
    const link = li.querySelector(':scope > a');
    if (sub && link) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-toggle';
      button.setAttribute('role', 'menuitem');
      button.setAttribute('aria-haspopup', 'true');
      button.setAttribute('aria-expanded', 'false');
      button.append(...link.childNodes);
      link.replaceWith(button);
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleItem(li);
      });
      li.classList.add('nav-drop');

      // Mobile sub-panel header: back button + current section title
      const back = document.createElement('li');
      back.className = 'nav-back';
      back.setAttribute('role', 'none');
      const backButton = document.createElement('button');
      backButton.type = 'button';
      backButton.textContent = BACK_LABEL;
      backButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleItem(li);
      });
      back.append(backButton);
      const title = document.createElement('li');
      title.className = 'nav-current';
      title.setAttribute('role', 'none');
      title.textContent = button.textContent;
      decorateList(sub, level + 1);
      sub.prepend(back, title);
    } else if (link) {
      link.setAttribute('role', 'menuitem');
    }
  });
  // A plain link closing a list that has sub-menus is the panel's "view all" link
  const items = [...ul.children].filter((li) => li.classList.contains('nav-item'));
  const last = items[items.length - 1];
  if (level === 1 && last && !last.classList.contains('nav-drop') && items.some((i) => i.classList.contains('nav-drop'))) {
    last.classList.add('nav-view-all');
  }
}

function buildSearch(nav, section) {
  const link = section.querySelector('a');
  const search = document.createElement('div');
  search.className = 'nav-search';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-search-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', link ? link.textContent.trim() : 'Search');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setSearchOpen(nav, !nav.classList.contains('search-open'));
  });
  const form = document.createElement('form');
  form.setAttribute('role', 'search');
  form.action = link ? link.getAttribute('href') : '/search';
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = link ? link.textContent.trim() : '';
  input.setAttribute('aria-label', input.placeholder);
  label.append(input);
  form.append(label);
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setSearchOpen(nav, false);
  });
  search.append(toggle, form);
  if (link) link.closest('p')?.remove();
  return search;
}

function markCurrentLocale(list) {
  const locale = currentLocale();
  list.querySelectorAll('a').forEach((a) => {
    const segment = new URL(a.href, window.location).pathname.split('/').filter(Boolean).filter((s) => s !== 'content')[0];
    if (segment === locale) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'true');
    }
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const resp = await fetchNav();
  if (!resp) return;
  const html = await resp.text();
  const fragment = document.createElement('div');
  fragment.innerHTML = html;
  // Image paths in the fragment are relative to the fragment itself
  fragment.querySelectorAll('img').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), resp.url).href;
  });

  const [localeSection, brandSection, sectionsSection, toolsSection] = [...fragment.children];
  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');

  // Row 0: locale links
  const locales = document.createElement('div');
  locales.className = 'nav-locales';
  if (localeSection) {
    const list = localeSection.querySelector('ul');
    if (list) {
      markCurrentLocale(list);
      locales.append(list);
    }
  }

  // Row 1: brand, sections, tools
  const bar = document.createElement('div');
  bar.className = 'nav-bar';

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (brandSection) brand.append(...brandSection.childNodes);

  const sections = document.createElement('div');
  sections.className = 'nav-sections';
  const topList = sectionsSection && sectionsSection.querySelector(':scope > ul');
  if (topList) {
    decorateList(topList, 0);
    sections.append(topList);
  }

  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  if (toolsSection) {
    const search = buildSearch(nav, toolsSection);
    const login = toolsSection.querySelector('a');
    if (login) login.classList.add('nav-login');
    tools.append(search, ...toolsSection.childNodes);
  }

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const hamburgerButton = document.createElement('button');
  hamburgerButton.type = 'button';
  hamburgerButton.setAttribute('aria-controls', 'nav');
  hamburgerButton.setAttribute('aria-expanded', 'false');
  hamburgerButton.setAttribute('aria-label', 'Open navigation');
  hamburgerButton.innerHTML = '<span class="nav-hamburger-icon"></span>';
  hamburgerButton.addEventListener('click', (e) => {
    e.stopPropagation();
    setSearchOpen(nav, false);
    setMenuOpen(nav, nav.getAttribute('aria-expanded') !== 'true');
  });
  hamburger.append(hamburgerButton);
  tools.append(hamburger);

  const barInner = document.createElement('div');
  barInner.className = 'nav-bar-inner';
  barInner.append(brand, sections, tools);
  bar.append(barInner);
  nav.append(locales, bar);
  nav.setAttribute('aria-expanded', 'false');

  // Close panels on outside click and Escape
  document.addEventListener('click', (e) => {
    if (nav.contains(e.target)) return;
    if (isDesktop.matches) closeSubmenus(nav);
    if (nav.classList.contains('search-open')) setSearchOpen(nav, false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (nav.classList.contains('search-open')) setSearchOpen(nav, false);
    else if (isDesktop.matches) closeSubmenus(nav);
    else setMenuOpen(nav, false);
  });

  // Crossing the breakpoint resets menus, sub-panels, search and the hamburger
  isDesktop.addEventListener('change', () => {
    setSearchOpen(nav, false);
    setMenuOpen(nav, false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}

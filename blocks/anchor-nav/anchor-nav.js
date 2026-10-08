/*
 * Anchor Nav Block
 * Horizontal in-page jump navigation.
 * Content model: one row per link (or a single cell containing a list of links).
 * Links point at in-page anchors (#section-id) or, as a page sub-navigation
 * (e.g. loaded from a fragment), at sibling pages; the link to the current
 * page gets an `active` class and aria-current="page".
 */

export default function decorate(block) {
  const links = [...block.querySelectorAll('a[href]')];

  const nav = document.createElement('nav');
  nav.className = 'anchor-nav-list';
  nav.setAttribute('aria-label', 'On this page');

  const ul = document.createElement('ul');
  links.forEach((a) => {
    const li = document.createElement('li');
    li.className = 'anchor-nav-item';
    a.classList.remove('button');
    a.closest('.button-container')?.classList.remove('button-container');
    li.append(a);
    ul.append(li);
  });
  nav.append(ul);

  block.replaceChildren(nav);

  // mark the link to the current page (page sub-navigation, e.g. from a fragment)
  // (local previews serve pages under /content/, links point at the live paths)
  const normalizePath = (p) => p.replace(/^\/content(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const currentPath = normalizePath(window.location.pathname);
  ul.querySelectorAll('a').forEach((a) => {
    if (a.origin !== window.location.origin || a.hash) return;
    if (normalizePath(a.pathname) === currentPath) {
      a.classList.add('active');
      a.closest('li').classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });

  // keep the current page link in view when the list scrolls horizontally
  const current = ul.querySelector('a.active');
  if (current) {
    // the block may be decorated before it is attached/visible (e.g. inside a fragment)
    const observer = new ResizeObserver(() => {
      if (!ul.clientWidth) return;
      observer.disconnect();
      if (ul.scrollWidth <= ul.clientWidth) return;
      const li = current.closest('li');
      const offset = li.getBoundingClientRect().left - ul.getBoundingClientRect().left;
      ul.scrollLeft = offset - (ul.clientWidth - li.offsetWidth) / 2;
    });
    observer.observe(ul);
  }

  // mark the link of the currently targeted section
  const setActive = () => {
    const { hash } = window.location;
    ul.querySelectorAll('a').forEach((a) => {
      if (a.getAttribute('aria-current') === 'page') return;
      const linkHash = a.hash || '';
      if (hash && linkHash === hash) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };
  setActive();
  window.addEventListener('hashchange', setActive);
}

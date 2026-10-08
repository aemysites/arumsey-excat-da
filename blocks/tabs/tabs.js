/*
 * Tabs Block
 * Horizontal tab list (underlined active tab) switching between content panels.
 *
 * Content model: one row per tab — | tab label | panel content |
 * Panel content can be authored inline (text, images, links) or, for complex panels
 * (e.g. a grid of product cards), as a single link to a fragment page (/fragments/...),
 * which is loaded and rendered in place.
 */

import { toClassName } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function fragmentPath(cell) {
  const links = cell.querySelectorAll('a[href]');
  if (links.length !== 1) return null;
  const a = links[0];
  if (cell.textContent.trim() !== a.textContent.trim()) return null;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin && !url.pathname.includes('/fragments/')) return null;
  return url.pathname.includes('/fragments/') ? url.pathname : null;
}

export default async function decorate(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children].filter((row) => row.children.length);
  const usedIds = new Set();

  const items = await Promise.all(rows.map(async (row, i) => {
    const [labelCell, ...contentCells] = [...row.children];
    let id = toClassName(labelCell.textContent) || `tab-${i}`;
    while (usedIds.has(id)) id = `${id}-${i}`;
    usedIds.add(id);

    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = `tabpanel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${id}`);
    panel.setAttribute('aria-hidden', i !== 0);

    const contents = await Promise.all(contentCells.map(async (cell) => {
      const path = fragmentPath(cell);
      const fragment = path ? await loadFragment(path) : null;
      return fragment ? [...fragment.childNodes] : [...cell.childNodes];
    }));
    contents.forEach((nodes) => panel.append(...nodes));

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-selected', i === 0);
    button.tabIndex = i === 0 ? 0 : -1;
    button.append(...labelCell.childNodes);
    button.querySelectorAll('p').forEach((p) => p.replaceWith(...p.childNodes));

    return { button, panel };
  }));

  // append in authored order (fragments resolve in any order)
  const buttons = items.map(({ button }) => button);
  const panels = items.map(({ panel }) => panel);
  tablist.append(...buttons);

  const select = (index, focus = false) => {
    buttons.forEach((btn, i) => {
      const active = i === index;
      btn.setAttribute('aria-selected', active);
      btn.tabIndex = active ? 0 : -1;
      panels[i].setAttribute('aria-hidden', !active);
    });
    if (focus) buttons[index].focus();
  };

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => select(i));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') select((i + 1) % buttons.length, true);
      else if (e.key === 'ArrowLeft') select((i - 1 + buttons.length) % buttons.length, true);
    });
  });

  block.replaceChildren(tablist, ...panels);
}

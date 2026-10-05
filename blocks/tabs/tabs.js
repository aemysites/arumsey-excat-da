import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

/*
 * Tabs Block
 * Horizontal tab list (each tab = optional circular illustration above a label)
 * with one panel per tab. Each panel renders its Q&A pairs as collapsible
 * items (<details>/<summary>) inside a bordered box - DA cannot nest blocks,
 * so the tabs block builds the collapsible list itself.
 *
 * Authoring - either shape is accepted (and may be mixed):
 *   3 columns (one row per Q&A):  tab (image + label) | question | answer
 *     A row whose tab cell is empty continues the previous tab.
 *   2 columns (one row per tab):  tab (image + label) | panel content
 *     Inside the panel cell every heading (or bold-only paragraph) starts a new
 *     question and the content up to the next one is its answer. A panel with no
 *     such markers is shown as plain content.
 */

let blockCount = 0;

function isQuestionMarker(el) {
  if (/^H[1-6]$/.test(el.tagName)) return true;
  if (el.tagName !== 'P') return false;
  const strong = el.querySelector(':scope > strong, :scope > b');
  const text = strong ? strong.textContent.trim() : '';
  return !!text && text === el.textContent.trim();
}

/**
 * Splits a panel cell into [{ question: Node[], answer: Node[] }] pairs.
 * Returns null when the cell has no question markers.
 * @param {Element} cell
 */
function splitPairs(cell) {
  const pairs = [];
  let current = null;
  [...cell.childNodes].forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && isQuestionMarker(node)) {
      current = { question: [...node.childNodes], answer: [] };
      if (node.tagName === 'P') {
        const strong = node.querySelector(':scope > strong, :scope > b');
        current.question = [...strong.childNodes];
      }
      pairs.push(current);
    } else if (current) {
      current.answer.push(node);
    } else if (node.textContent.trim() || node.nodeType === Node.ELEMENT_NODE) {
      // content before the first question: keep it as a lead-in
      pairs.push({ question: null, answer: [node] });
    }
  });
  return pairs.some((p) => p.question) ? pairs : null;
}

function buildItem(questionNodes, answerNodes, id) {
  const details = document.createElement('details');
  details.className = 'tabs-item';
  const summary = document.createElement('summary');
  summary.className = 'tabs-item-label';
  summary.append(...questionNodes);
  details.append(summary);
  const body = document.createElement('div');
  body.className = 'tabs-item-body';
  body.id = id;
  body.append(...answerNodes);
  summary.setAttribute('aria-controls', id);
  if (body.textContent.trim() || body.querySelector('picture, img')) details.append(body);
  return details;
}

function buildTabLabel(cell) {
  const label = document.createElement('span');
  label.className = 'tabs-tab-label';
  const img = cell.querySelector('img');
  let media = null;
  if (img) {
    media = document.createElement('span');
    media.className = 'tabs-tab-image';
    // createOptimizedPicture keeps only the path (drops the origin) and cannot
    // transcode SVG, so externally hosted / SVG icons reuse the authored picture.
    const url = new URL(img.src, window.location.href);
    const optimizable = url.origin === window.location.origin && !/\.svg$/i.test(url.pathname);
    const picture = optimizable
      ? createOptimizedPicture(img.src, '', false, [{ width: '200' }])
      : img.closest('picture') || img;
    const icon = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
    icon.alt = ''; // decorative: the tab label names the tab
    icon.loading = 'lazy';
    icon.decoding = 'async';
    media.append(picture);
  }
  label.textContent = cell.textContent.trim();
  return { media, label };
}

export default function decorate(block) {
  blockCount += 1;
  const prefix = block.id || `tabs-${blockCount}`;

  // 1. collect tabs: [{ cell, questions: [{q, a}], content: Node[] }]
  const tabs = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;
    const [tabCell, ...rest] = cells;
    const hasTab = tabCell.textContent.trim() || tabCell.querySelector('img');
    if (hasTab || !tabs.length) {
      tabs.push({ cell: tabCell, items: [] });
    }
    const tab = tabs[tabs.length - 1];
    if (rest.length >= 2) {
      const [q, ...a] = rest;
      if (q.textContent.trim()) {
        const answer = a.flatMap((c) => [...c.childNodes]);
        tab.items.push({ question: [...q.childNodes], answer });
      }
    } else if (rest.length === 1) {
      const pairs = splitPairs(rest[0]);
      if (pairs) tab.items.push(...pairs);
      else tab.items.push({ question: null, answer: [...rest[0].childNodes] });
    }
  });

  // 2. build tablist + panels
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const panels = tabs.map((tab, i) => {
    const { media, label } = buildTabLabel(tab.cell);
    const id = `${prefix}-${toClassName(label.textContent) || 'tab'}-${i + 1}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', i === 0);
    button.tabIndex = i === 0 ? 0 : -1;
    if (media) button.append(media);
    button.append(label);
    tablist.append(button);

    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = `tabpanel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.setAttribute('aria-hidden', i !== 0);

    const list = document.createElement('div');
    list.className = 'tabs-items';
    tab.items.forEach((item, j) => {
      if (item.question) {
        list.append(buildItem(item.question, item.answer, `${id}-item-${j + 1}`));
      } else {
        const lead = document.createElement('div');
        lead.className = 'tabs-panel-content';
        lead.append(...item.answer);
        if (lead.textContent.trim() || lead.querySelector('picture, img')) list.append(lead);
      }
    });
    panel.append(list);
    return { button, panel };
  });

  const select = (index, focus = false) => {
    panels.forEach(({ button, panel }, i) => {
      const on = i === index;
      button.setAttribute('aria-selected', on);
      button.tabIndex = on ? 0 : -1;
      panel.setAttribute('aria-hidden', !on);
    });
    if (focus) panels[index].button.focus();
  };

  panels.forEach(({ button }, i) => {
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', (e) => {
      const last = panels.length - 1;
      let next = null;
      if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
      else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = last;
      if (next !== null) {
        e.preventDefault();
        select(next, true);
      }
    });
  });

  block.replaceChildren(tablist, ...panels.map((p) => p.panel));

  // 3. cooperate with the search block's in-page filter: while a query is
  // active show every panel that still has visible matches.
  document.addEventListener('search:filter', (e) => {
    const query = e.detail?.query || '';
    block.classList.toggle('tabs-searching', !!query);
    panels.forEach(({ panel }) => {
      const hasHit = [...panel.querySelectorAll('.tabs-item')].some((d) => !d.hidden);
      panel.classList.toggle('tabs-panel-match', !!query && hasHit);
    });
  });
}

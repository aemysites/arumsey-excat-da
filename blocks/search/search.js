/*
 * Search Block
 * Centered heading above a pill-shaped search field with a leading search icon
 * (the icon is a CSS background on the input, see search-icon.svg).
 *
 * Authoring (all rows optional):
 *   - a heading (e.g. "Frequently Asked Questions")
 *   - a plain paragraph -> used as the input placeholder (default "Search...")
 *   - a link to a JSON index (e.g. /query-index.json) -> results are fetched from
 *     that index and listed below the field
 *
 * Without an index link the block filters the page in place: every collapsible
 * Q&A item (<details>) in <main> whose text does not match the query is hidden,
 * and a `search:filter` event ({ detail: { query } }) is dispatched on document
 * so blocks such as tabs can reveal panels that contain matches.
 */

const MIN_QUERY = 2;

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function filterPage(block, query, status) {
  const q = query.trim().toLowerCase();
  const active = q.length >= MIN_QUERY;
  const main = block.closest('main') || document;
  const items = [...main.querySelectorAll('details')].filter((d) => !block.contains(d));
  let matches = 0;
  items.forEach((item) => {
    const hit = !active || item.textContent.toLowerCase().includes(q);
    item.hidden = !hit;
    if (active && hit) matches += 1;
  });
  status.textContent = active ? `${matches} result${matches === 1 ? '' : 's'}` : '';
  document.dispatchEvent(new CustomEvent('search:filter', { detail: { query: active ? q : '' } }));
}

async function searchIndex(source, query, results, status) {
  const q = query.trim().toLowerCase();
  results.replaceChildren();
  if (q.length < MIN_QUERY) {
    status.textContent = '';
    return;
  }
  if (!searchIndex.cache) {
    try {
      const resp = await fetch(source);
      const json = resp.ok ? await resp.json() : { data: [] };
      searchIndex.cache = json.data || [];
    } catch {
      searchIndex.cache = [];
    }
  }
  const hits = searchIndex.cache.filter((row) => ['title', 'description']
    .some((k) => (row[k] || '').toLowerCase().includes(q)));
  status.textContent = `${hits.length} result${hits.length === 1 ? '' : 's'}`;
  hits.forEach((row) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = row.path;
    a.textContent = row.title || row.path;
    li.append(a);
    if (row.description) {
      const p = document.createElement('p');
      p.textContent = row.description;
      li.append(p);
    }
    results.append(li);
  });
}

export default function decorate(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const indexLink = [...block.querySelectorAll('a')].find((a) => /\.json(\?|$)/.test(a.href));
  const placeholderEl = [...block.querySelectorAll('p')]
    .find((p) => !p.querySelector('a, picture, img, .icon') && p.textContent.trim());
  const placeholder = placeholderEl ? placeholderEl.textContent.trim() : 'Search...';

  const header = document.createElement('div');
  header.className = 'search-header';
  if (heading) {
    heading.classList.add('search-title');
    header.append(heading);
  }

  const form = document.createElement('form');
  form.className = 'search-box';
  form.setAttribute('role', 'search');
  form.addEventListener('submit', (e) => e.preventDefault());

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder.replace(/\.+$/, '') || 'Search');

  form.append(input);

  const status = document.createElement('p');
  status.className = 'search-status';
  status.setAttribute('aria-live', 'polite');

  const results = document.createElement('ul');
  results.className = 'search-results';

  const run = indexLink
    ? debounce(() => searchIndex(indexLink.href, input.value, results, status))
    : debounce(() => filterPage(block, input.value, status));
  input.addEventListener('input', run);
  input.addEventListener('search', run);

  block.replaceChildren(header, form, status);
  if (indexLink) block.append(results);
}

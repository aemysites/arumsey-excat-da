import { createOptimizedPicture } from '../../scripts/aem.js';

const OPTION_CLASSES = ['article-list'];
const ARTICLE_LIST_INITIAL_COUNT = 8;

/**
 * Article list option: tags date/title/excerpt, and collapses the list to the first
 * ARTICLE_LIST_INITIAL_COUNT cards behind a "Show All" reveal button.
 * A trailing authored row holding only a link (no image) supplies the button label.
 * @param {Element} block The cards block
 * @param {Element} ul The decorated card list
 */
function decorateArticleList(block, ul) {
  let showAllLabel = 'Show All';
  const items = [...ul.children];
  const last = items[items.length - 1];
  if (last && !last.querySelector('picture') && last.querySelector('a')
    && last.textContent.trim() === last.querySelector('a').textContent.trim()) {
    showAllLabel = last.textContent.trim() || showAllLabel;
    last.remove();
    items.pop();
  }

  items.forEach((li) => {
    const body = li.querySelector('.cards-card-body');
    if (!body) return;
    const title = body.querySelector('h1, h2, h3, h4, h5, h6')
      || body.querySelector('p > strong:only-child')?.parentElement;
    if (title) {
      title.classList.add('cards-card-title');
      // a linked title makes the whole card clickable; undo decorateButtons' button styling
      const link = title.querySelector('a');
      if (link) {
        link.classList.remove('button', 'primary', 'secondary');
        link.classList.add('cards-card-link');
        title.classList.remove('button-container');
        li.classList.add('cards-card-linked');
      }
      const prev = title.previousElementSibling;
      if (prev && prev.tagName === 'P') prev.classList.add('cards-card-date');
      const next = title.nextElementSibling;
      if (next && next.tagName === 'P') next.classList.add('cards-card-excerpt');
    }
  });

  if (items.length <= ARTICLE_LIST_INITIAL_COUNT) return;

  items.slice(ARTICLE_LIST_INITIAL_COUNT).forEach((li) => { li.hidden = true; });

  if (!ul.id) ul.id = `cards-article-list-${Math.random().toString(36).slice(2, 8)}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'cards-show-all';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button secondary';
  button.textContent = showAllLabel;
  button.setAttribute('aria-controls', ul.id);
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    items.forEach((li) => { li.hidden = false; });
    button.setAttribute('aria-expanded', 'true');
    wrapper.remove();
  });
  wrapper.append(button);
  block.append(wrapper);
}

export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  // only optimize same-origin, non-SVG images; keep the authored picture for external/SVG sources
  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });
  block.replaceChildren(ul);

  if (active.includes('article-list')) decorateArticleList(block, ul);
}

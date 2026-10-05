/*
 * CTA Block
 * Closing call-to-action banner: centered heading, optional one-line subline,
 * and one or more buttons. Authors may put everything in a single cell or
 * spread it across rows/cells; all content is flattened into one centered
 * content column and every link-only paragraph is collected into one
 * button row so 1 or 2 CTAs sit side by side.
 */

/**
 * Returns true when a paragraph contains only links (and whitespace/emphasis).
 * @param {Element} el
 */
function isLinkOnly(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a');
  if (!links.length) return false;
  const text = [...links].reduce((t, a) => t.replace(a.textContent, ''), el.textContent);
  return !text.trim();
}

/*
 * Options (CSS classes on the block):
 * - secondary: a lone, centered secondary (outlined) button with no heading or
 *   text, used to close a section. Buttons get the global `secondary` button class.
 */
const OPTION_CLASSES = ['secondary'];

export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));
  const content = document.createElement('div');
  content.className = 'cta-content';

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => content.append(...cell.childNodes));
    row.remove();
  });

  // drop whitespace-only text nodes and empty paragraphs
  [...content.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) node.remove();
    else if (node.nodeType === Node.ELEMENT_NODE && !node.textContent.trim()
      && !node.querySelector('img, picture')) node.remove();
  });

  const actions = document.createElement('div');
  actions.className = 'cta-actions';

  [...content.children].forEach((el) => {
    if (!isLinkOnly(el)) return;
    // one button-container per link, so two links in one paragraph become two buttons
    [...el.querySelectorAll('a')].forEach((a) => {
      const p = document.createElement('p');
      p.className = 'button-container';
      if (!a.classList.contains('button')) a.classList.add('button');
      if (active.includes('secondary')) a.classList.add('secondary');
      const wrapper = a.closest('strong, em');
      p.append(wrapper && el.contains(wrapper) ? wrapper : a);
      actions.append(p);
    });
    el.remove();
  });

  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) heading.classList.add('cta-heading');
  [...content.children].forEach((el) => {
    if (el !== heading && el.tagName === 'P') el.classList.add('cta-text');
  });

  if (actions.children.length) content.append(actions);
  block.append(content);
}

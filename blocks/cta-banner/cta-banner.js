/*
 * CTA Banner Block
 * Call-to-action strip: optional heading, optional text, one or more CTA links.
 * Content model: one or more rows; all cells are merged into a single content column.
 * Options: plain (no banner panel, content left-aligned)
 */

const OPTION_CLASSES = ['plain'];

export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));

  const content = document.createElement('div');
  content.className = 'cta-banner-content';
  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => content.append(...cell.childNodes));
  });

  // group the CTA links into one actions row
  const actions = document.createElement('div');
  actions.className = 'cta-banner-actions';
  [...content.querySelectorAll('a[href]')].forEach((a) => {
    const holder = a.closest('p, li');
    const holderIsLinkOnly = holder && holder.parentElement === content
      && holder.textContent.trim() === a.textContent.trim();
    if (holderIsLinkOnly) {
      holder.classList.add('button-container');
      actions.append(holder);
    } else if (a.parentElement === content) {
      const p = document.createElement('p');
      p.className = 'button-container';
      p.append(a);
      actions.append(p);
    }
  });
  actions.querySelectorAll('a').forEach((a) => a.classList.add('button'));
  if (actions.children.length) content.append(actions);

  // a banner that contains only the CTA(s) is centered
  const hasText = [...content.children].some((el) => el !== actions && el.textContent.trim());
  if (!hasText) block.classList.add('cta-banner-actions-only');
  // plain: links are rendered as primary buttons; default banner keeps the same treatment
  if (active.includes('plain')) actions.classList.add('cta-banner-actions-plain');

  block.replaceChildren(content);
}

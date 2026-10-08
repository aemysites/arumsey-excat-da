import { createOptimizedPicture } from '../../scripts/aem.js';

const OPTION_CLASSES = ['icon', 'overlay'];

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
  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  if (active.includes('overlay')) {
    // overlay: body content sits on top of the card image
    ul.querySelectorAll(':scope > li').forEach((li) => {
      if (li.querySelector('.cards-card-image') && li.querySelector('.cards-card-body')) {
        li.classList.add('cards-card-has-overlay');
      }
    });
  }

  block.replaceChildren(ul);
}

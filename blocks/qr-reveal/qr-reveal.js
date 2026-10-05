import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * QR Reveal Block
 * Grid of app-download tiles. Each authored row is one tile:
 *   cell 1 = title (e.g. "iPhone"), cell 2 = QR code image, cell 3 = button label
 *   (e.g. "View App Store QR").
 * The QR image starts dimmed under a veil with a centered button; clicking the
 * button reveals the QR (adds .is-revealed) and hides the button.
 * Authors may also put title, image and label in a single cell - the heading,
 * the picture and the remaining text are picked out by element type.
 */

let tileCount = 0;

/**
 * Splits a row's content into title, picture and button label.
 * @param {Element} row
 */
function readRow(row) {
  const cells = [...row.children];
  const picture = row.querySelector('picture') || row.querySelector('img');
  let title = row.querySelector('h1, h2, h3, h4, h5, h6');
  let labelText = '';

  if (cells.length >= 3) {
    // positional model: title | image | label
    if (!title) [title] = cells;
    labelText = cells[2].textContent.trim();
  } else {
    const textEls = [...row.querySelectorAll('p, h1, h2, h3, h4, h5, h6')]
      .filter((el) => el !== title && !el.querySelector('picture, img') && el.textContent.trim());
    if (!title && textEls.length) title = textEls.shift();
    labelText = textEls.map((el) => el.textContent.trim()).join(' ');
  }

  return {
    titleText: title ? title.textContent.trim() : '',
    picture,
    labelText,
  };
}

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'qr-reveal-list';

  [...block.children].forEach((row) => {
    const { titleText, picture, labelText } = readRow(row);
    if (!titleText && !picture) {
      row.remove();
      return;
    }
    tileCount += 1;

    const tile = document.createElement('li');
    tile.className = 'qr-reveal-tile';

    if (titleText) {
      const title = document.createElement('h2');
      title.className = 'qr-reveal-title';
      title.textContent = titleText;
      tile.append(title);
    }

    if (picture) {
      const qr = document.createElement('div');
      qr.className = 'qr-reveal-qr';
      const qrId = `qr-reveal-qr-${tileCount}`;
      qr.id = qrId;

      const img = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
      if (!img.alt && titleText) img.alt = titleText;
      // only same-origin (media bus) images can be served through the optimizer;
      // absolute external URLs would be rewritten to a local path and 404
      const sameOrigin = new URL(img.src, window.location.href).origin === window.location.origin;
      if (sameOrigin) {
        qr.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
      } else {
        img.loading = 'lazy';
        qr.append(picture);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'qr-reveal-button button';
      button.textContent = labelText || (titleText ? `View ${titleText} QR` : 'View QR');
      button.setAttribute('aria-controls', qrId);
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => {
        qr.classList.add('is-revealed');
        button.setAttribute('aria-expanded', 'true');
        button.hidden = true;
      });
      qr.append(button);
      tile.append(qr);
    }

    list.append(tile);
    row.remove();
  });

  block.append(list);
}

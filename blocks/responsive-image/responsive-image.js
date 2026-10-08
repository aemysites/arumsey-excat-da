/*
 * Responsive Image Block
 * Full-width image (infographic/diagram) with an optional art-directed mobile rendition
 * and optional heading / caption text.
 *
 * Content model:
 *   | desktop image | mobile image (optional) |
 *   | heading or caption text (optional, any number of rows) |
 * The first picture is used from 768px up; a second picture (if present) is used below 768px.
 * Headings authored before the image render above it; all other text renders below as a caption.
 */

const DESKTOP_MEDIA = '(min-width: 768px)';

function buildArtDirectedPicture(desktopPic, mobilePic) {
  const desktopImg = desktopPic.querySelector('img');
  const mobileImg = mobilePic.querySelector('img');
  const picture = document.createElement('picture');

  desktopPic.querySelectorAll('source').forEach((s) => {
    const src = s.cloneNode();
    src.media = DESKTOP_MEDIA;
    picture.append(src);
  });
  const desktopSource = document.createElement('source');
  desktopSource.media = DESKTOP_MEDIA;
  desktopSource.srcset = desktopImg.getAttribute('src');
  picture.append(desktopSource);

  mobilePic.querySelectorAll('source:not([media])').forEach((s) => picture.append(s.cloneNode()));
  const img = mobileImg.cloneNode();
  img.alt = desktopImg.alt || mobileImg.alt || '';
  img.loading = 'lazy';
  picture.append(img);
  return picture;
}

export default function decorate(block) {
  const rows = [...block.children];
  const pictures = [...block.querySelectorAll('picture')];
  const firstMediaRow = pictures.length ? rows.find((r) => r.contains(pictures[0])) : null;
  const firstMediaIndex = firstMediaRow ? rows.indexOf(firstMediaRow) : rows.length;

  const media = document.createElement('div');
  media.className = 'responsive-image-media';
  if (pictures.length >= 2) {
    const artDirected = buildArtDirectedPicture(pictures[0], pictures[1]);
    pictures[0].remove();
    pictures[1].remove();
    media.append(artDirected, ...pictures.slice(2));
  } else if (pictures.length === 1) {
    media.append(pictures[0]);
  }

  const header = document.createElement('div');
  header.className = 'responsive-image-header';
  const caption = document.createElement('div');
  caption.className = 'responsive-image-caption';

  rows.forEach((row, i) => {
    [...row.children].forEach((cell) => {
      [...cell.children].forEach((el) => {
        if (!el.textContent.trim() && !el.querySelector('img')) return;
        if (i < firstMediaIndex && /^H[1-6]$/.test(el.tagName)) header.append(el);
        else caption.append(el);
      });
      // bare text nodes directly in the cell
      if (!cell.children.length && cell.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = cell.textContent.trim();
        caption.append(p);
      }
    });
  });

  const parts = [];
  if (header.children.length) parts.push(header);
  if (media.children.length) parts.push(media);
  if (caption.children.length) parts.push(caption);
  block.replaceChildren(...parts);
}

const OPTION_CLASSES = ['cta'];

// The first picture of the image cell is used from this width up, the second one below it.
const DESKTOP_MEDIA = '(min-width: 768px)';

/**
 * Merges a desktop and a mobile picture into one art-directed <picture>:
 * the desktop sources apply from 768px up, the mobile picture otherwise.
 */
function buildArtDirectedPicture(desktopPic, mobilePic) {
  const desktopImg = desktopPic.querySelector('img');
  const mobileImg = mobilePic.querySelector('img');
  const picture = document.createElement('picture');

  desktopPic.querySelectorAll('source').forEach((s) => {
    const source = s.cloneNode();
    source.media = DESKTOP_MEDIA;
    picture.append(source);
  });
  const desktopSource = document.createElement('source');
  desktopSource.media = DESKTOP_MEDIA;
  desktopSource.srcset = desktopImg.getAttribute('src');
  picture.append(desktopSource);

  mobilePic.querySelectorAll('source:not([media])').forEach((s) => picture.append(s.cloneNode()));
  const img = mobileImg.cloneNode();
  img.alt = desktopImg.alt || mobileImg.alt || '';
  const loading = desktopImg.getAttribute('loading');
  if (loading) img.setAttribute('loading', loading);
  else img.removeAttribute('loading');
  picture.append(img);
  return picture;
}

// An image cell holding two pictures (desktop, then mobile) becomes one art-directed picture.
function mergeImageRenditions(block) {
  const cell = [...block.querySelectorAll(':scope > div > div')]
    .find((c) => c.querySelectorAll('picture').length >= 2);
  if (!cell) return;
  const [desktopPic, mobilePic] = cell.querySelectorAll('picture');
  if (!desktopPic.querySelector('img') || !mobilePic.querySelector('img')) return;
  desktopPic.replaceWith(buildArtDirectedPicture(desktopPic, mobilePic));
  const mobileParent = mobilePic.parentElement;
  mobilePic.remove();
  if (mobileParent !== cell && !mobileParent.children.length && !mobileParent.textContent.trim()) {
    mobileParent.remove();
  }
  // whitespace left between the two pictures
  cell.querySelectorAll('p').forEach((p) => {
    if (p.querySelector('picture')) {
      [...p.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && !n.textContent.trim())
        .forEach((n) => n.remove());
    }
  });
}

export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));

  mergeImageRenditions(block);

  if (active.includes('cta')) {
    // cta: centered heading + call-to-action over a contained, dimmed background image
    [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
      const onlyPicture = cell.children.length === 1 && cell.querySelector(':scope > picture, :scope > p > picture');
      if (!onlyPicture && cell.textContent.trim()) cell.classList.add('hero-content');
    });
  }
}

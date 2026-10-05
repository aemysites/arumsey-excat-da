import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Carousel Block
 * A row of slides (illustration above a heading and short text). On narrow
 * viewports the slides form a horizontal, swipeable scroll-snap track with
 * dot controls; on wide viewports all slides sit side by side and the dots
 * hide themselves when nothing overflows.
 *
 * Authoring: one row per slide.
 *   cell 1 = image (optional)
 *   cell 2 = heading + text (any rich text)
 * A single-cell row is accepted: an image-only cell becomes the media,
 * anything else becomes the slide content.
 */

let carouselId = 0;

function isMediaCell(cell) {
  const hasMedia = cell.querySelector('picture, img');
  const text = cell.textContent.trim();
  return !!hasMedia && !text;
}

function buildSlide(row, index, id) {
  const slide = document.createElement('li');
  slide.className = 'carousel-slide';
  slide.id = `carousel-${id}-slide-${index}`;
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-roledescription', 'slide');

  const cells = [...row.children];
  let mediaCell = null;
  const contentCells = [];
  cells.forEach((cell) => {
    if (!mediaCell && isMediaCell(cell)) mediaCell = cell;
    else contentCells.push(cell);
  });

  if (mediaCell) {
    mediaCell.className = 'carousel-slide-image';
    mediaCell.querySelectorAll('picture > img').forEach((img) => {
      const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      img.closest('picture').replaceWith(optimized);
    });
    slide.append(mediaCell);
  }

  const content = document.createElement('div');
  content.className = 'carousel-slide-content';
  contentCells.forEach((cell) => content.append(...cell.childNodes));
  if (content.childNodes.length) slide.append(content);

  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    if (!heading.id) heading.id = `${slide.id}-title`;
    slide.setAttribute('aria-labelledby', heading.id);
  } else {
    slide.setAttribute('aria-label', `Slide ${index + 1}`);
  }
  return slide;
}

function updateActive(block, track, dots) {
  const slides = [...track.children];
  const { left, width } = track.getBoundingClientRect();
  const center = left + width / 2;
  let active = 0;
  let best = Infinity;
  slides.forEach((slide, i) => {
    const rect = slide.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - center);
    if (distance < best) {
      best = distance;
      active = i;
    }
  });
  dots.forEach((dot, i) => {
    const isActive = i === active;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
  block.dataset.activeSlide = active;
}

function updateOverflow(block, track) {
  const overflowing = track.scrollWidth - track.clientWidth > 1;
  block.classList.toggle('carousel-overflowing', overflowing);
}

export default function decorate(block) {
  carouselId += 1;
  const id = carouselId;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');

  const rows = [...block.children].filter((row) => row.textContent.trim() || row.querySelector('picture, img'));

  const track = document.createElement('ul');
  track.className = 'carousel-slides';
  rows.forEach((row, i) => track.append(buildSlide(row, i, id)));

  const nav = document.createElement('div');
  nav.className = 'carousel-nav';
  const dots = [...track.children].map((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Show slide ${i + 1} of ${rows.length}`);
    dot.setAttribute('aria-controls', slide.id);
    dot.addEventListener('click', () => {
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    });
    nav.append(dot);
    return dot;
  });

  block.replaceChildren(track);
  if (dots.length > 1) block.append(nav);

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateActive(block, track, dots);
      ticking = false;
    });
  }, { passive: true });

  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      updateOverflow(block, track);
      updateActive(block, track, dots);
    }).observe(track);
  } else {
    updateOverflow(block, track);
  }
  updateActive(block, track, dots);
}

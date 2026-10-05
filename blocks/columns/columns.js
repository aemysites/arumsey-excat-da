const OPTION_CLASSES = ['icon-scroll'];

/**
 * icon-scroll: each row is a set of illustrated items (icon, heading, text).
 * Desktop renders a static centered wrapping row; mobile turns the row into a
 * horizontal scroll-snap track with dot indicators that follow the scroll position.
 */
function decorateIconScroll(block) {
  [...block.children].forEach((row) => {
    const items = [...row.children];
    row.classList.add('columns-scroll-track');
    items.forEach((item) => item.classList.add('columns-scroll-item'));
    if (items.length < 2) return;

    const dots = document.createElement('ul');
    dots.className = 'columns-scroll-dots';
    const buttons = items.map((item, i) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'columns-scroll-dot';
      const heading = item.querySelector('h1, h2, h3, h4, h5, h6, strong');
      const label = heading ? heading.textContent.trim() : '';
      button.setAttribute('aria-label', label ? `Show ${label}` : `Show item ${i + 1} of ${items.length}`);
      button.addEventListener('click', () => {
        row.scrollTo({ left: item.offsetLeft - items[0].offsetLeft, behavior: 'smooth' });
      });
      li.append(button);
      dots.append(li);
      return button;
    });

    const setActive = (index) => {
      buttons.forEach((b, i) => {
        b.classList.toggle('active', i === index);
        if (i === index) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    };

    let ticking = false;
    row.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const start = items[0].offsetLeft;
        let closest = 0;
        let min = Infinity;
        items.forEach((item, i) => {
          const d = Math.abs((item.offsetLeft - start) - row.scrollLeft);
          if (d < min) {
            min = d;
            closest = i;
          }
        });
        // at the scroll end, the last item is the active one
        if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 2) closest = items.length - 1;
        setActive(closest);
      });
    }, { passive: true });

    setActive(0);
    row.after(dots);
  });
}

/**
 * EDS turns every lone `<p><a>` into a button. In logo/aside rows the source shows
 * those as plain inline text links, so undo the auto-decoration there. Explicit
 * CTAs (`<strong><a>` primary / `<em><a>` secondary) are kept as buttons.
 */
function unbuttonPlainLinks(block) {
  block.querySelectorAll('.button-container > a.button').forEach((a) => {
    a.classList.remove('button');
    if (!a.className) a.removeAttribute('class');
    a.parentElement.classList.remove('button-container');
  });
}

/**
 * Illustration vs photo for image + h2 rows: vector (SVG) art, or a standalone
 * row on a styled (e.g. light-blue) section, is a small illustration laid out
 * 1/3 + 2/3; photos in alternating runs of rows stay 50/50.
 */
function isIllustration(block, imgCell) {
  const img = imgCell && imgCell.querySelector('img');
  if (img) {
    const { pathname } = new URL(img.getAttribute('src') || '', window.location.href);
    if (/\.svg$/i.test(pathname)) return true;
  }
  const wrapper = block.parentElement;
  const section = block.closest('.section');
  const isColumns = (el) => el && el.classList.contains('columns-wrapper');
  const standalone = wrapper && !isColumns(wrapper.previousElementSibling)
    && !isColumns(wrapper.nextElementSibling);
  return Boolean(standalone && section && section.classList.contains('light-blue'));
}

/**
 * Default (no option) layouts are inferred from the authored content so the
 * same block covers every source shape:
 * - columns-items:        2-3 up items, each starting with an icon (p > picture)
 * - columns-feature:      image + text with an h1 (featured article, 1/3 + 2/3)
 * - columns-illustration: illustration + text with an h2 (1/3 + 2/3)
 * - columns-media:        photo + text with an h2 (50/50, image on either side)
 * - columns-aside:        image (logo) + text without h1/h2 (1/4 + 3/4, plain links)
 */
function detectLayout(block) {
  const cells = [...block.children].flatMap((row) => [...row.children]);
  const isImgCol = (cell) => cell.classList.contains('columns-img-col');

  if (!cells.some(isImgCol)) {
    const isItem = (cell) => {
      const first = cell.firstElementChild;
      return first && first.tagName === 'P' && first.querySelector('picture');
    };
    if (cells.length > 1 && cells.every(isItem)) block.classList.add('columns-items');
    return;
  }

  const textCells = cells.filter((cell) => !isImgCol(cell));
  const has = (sel) => textCells.some((cell) => cell.querySelector(sel));
  if (has('h1')) {
    block.classList.add('columns-feature');
    // a short all-caps paragraph right after the heading is a category tag
    textCells.forEach((cell) => {
      const next = cell.querySelector('h1')?.nextElementSibling;
      const text = next ? next.textContent.trim() : '';
      if (next && next.tagName === 'P' && !next.children.length
        && text && text.length <= 30 && text === text.toUpperCase()) {
        next.classList.add('columns-tag');
      }
    });
  } else if (has('h2')) {
    const illustration = isIllustration(block, cells.find(isImgCol));
    block.classList.add(illustration ? 'columns-illustration' : 'columns-media');
  } else {
    block.classList.add('columns-aside');
    unbuttonPlainLinks(block);
  }
}

export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  if (active.includes('icon-scroll')) decorateIconScroll(block);
  else if (!active.length) detectLayout(block);
}

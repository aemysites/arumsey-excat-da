/*
 * Accordion Block
 * Stacked list of collapsible label/panel items (e.g. "View full benefits & terms").
 * Each item is a native <details>/<summary> pair so it is keyboard- and
 * screen-reader accessible without extra scripting.
 *
 * Authoring: one row per item.
 *   cell 1 = label (question)
 *   cell 2 = body (answer, any rich text)
 * A row with a single cell becomes a label-only item; extra cells are
 * appended to the body so no authored content is lost.
 */

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) {
      row.remove();
      return;
    }

    const [labelCell, ...bodyCells] = cells;

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    // inner frame > text (leading icon + label; chevron drawn on the frame)
    const inner = document.createElement('span');
    inner.className = 'accordion-item-label-inner';
    const text = document.createElement('span');
    text.className = 'accordion-item-label-text';
    // unwrap a single paragraph so the label stays inline in the summary
    const onlyChild = labelCell.children.length === 1 ? labelCell.firstElementChild : null;
    if (onlyChild && onlyChild.tagName === 'P') {
      text.append(...onlyChild.childNodes);
    } else {
      text.append(...labelCell.childNodes);
    }
    inner.append(text);
    summary.append(inner);

    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    bodyCells.forEach((cell) => body.append(...cell.childNodes));

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary);
    if (body.textContent.trim() || body.querySelector('picture, img, iframe')) {
      details.append(body);
    }
    row.replaceWith(details);
  });
}

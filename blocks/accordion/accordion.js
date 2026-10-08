/*
 * Accordion Block
 * FAQ-style list: each row is a question (label) and an answer (body).
 * Row content model: | question | answer |
 */

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) {
      row.remove();
      return;
    }

    const [label, ...rest] = cells;

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);

    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    rest.forEach((cell) => body.append(...cell.childNodes));

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary);
    if (body.childNodes.length) details.append(body);

    row.replaceWith(details);
  });
}

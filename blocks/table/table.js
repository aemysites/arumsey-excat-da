/*
 * Table Block
 * Recreate a table
 * https://www.hlx.live/developer/block-collection/table
 *
 * Body cells get a data-label (the matching header text) and their content is
 * wrapped in .table-cell-content so the table can be shown as stacked
 * "label | value" cards on mobile, like the source site's mobile table.
 */

/**
 *
 * @param {Element} block
 */
export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const header = !block.classList.contains('no-header');
  const labels = [];

  [...block.children].forEach((row, i) => {
    const tr = document.createElement('tr');

    [...row.children].forEach((cell, j) => {
      const isHeader = i === 0 && header;
      const td = document.createElement(isHeader ? 'th' : 'td');

      if (isHeader) {
        td.setAttribute('scope', 'col');
        td.innerHTML = cell.innerHTML;
        labels[j] = cell.textContent.trim();
      } else if (header) {
        if (labels[j]) td.dataset.label = labels[j];
        const content = document.createElement('div');
        content.className = 'table-cell-content';
        content.innerHTML = cell.innerHTML;
        td.append(content);
      } else {
        td.innerHTML = cell.innerHTML;
      }
      tr.append(td);
    });
    if (i === 0 && header) thead.append(tr);
    else tbody.append(tr);
  });
  table.append(thead, tbody);
  block.replaceChildren(table);
}

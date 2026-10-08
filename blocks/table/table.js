/*
 * Table Block
 * Recreate a table from the block's rows. The first row is the header
 * unless the block has the `no-header` class.
 */

function buildCell(rowIndex, header) {
  return document.createElement(rowIndex === 0 && header ? 'th' : 'td');
}

export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const header = !block.classList.contains('no-header');

  [...block.children].forEach((row, i) => {
    const tr = document.createElement('tr');
    [...row.children].forEach((col) => {
      const cell = buildCell(i, header);
      if (cell.tagName === 'TH') cell.setAttribute('scope', 'col');
      cell.append(...col.childNodes);
      tr.append(cell);
    });
    if (i === 0 && header) thead.append(tr);
    else tbody.append(tr);
  });

  if (header) table.append(thead);
  table.append(tbody);
  block.replaceChildren(table);
}

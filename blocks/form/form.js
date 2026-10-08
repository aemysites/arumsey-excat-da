/*
 * Form Block
 * Contact / enquiry form with stacked fields, consent checkboxes and a centered submit button.
 *
 * Two authoring models are supported:
 *  1. Spreadsheet-driven: the block contains a link to a form definition (.json) with columns
 *     Name, Label, Type, Placeholder, Mandatory, Options.
 *     An optional second link is the submit URL.
 *  2. Inline: one row per field — | Label | Type | Placeholder | Required | Options |
 *     Type is text | email | tel | select | textarea | checkbox | submit (default: text).
 *     Required is any of yes / true / x / *. Options is a comma-separated list (select only).
 *     A row whose first cell is "Action" / "Submit URL" sets the form action.
 */

const TRUTHY = ['yes', 'true', 'x', '*', 'required', 'mandatory'];

// Options are separated by semicolons; commas are accepted when no semicolon is present
function splitOptions(value) {
  if (!value) return [];
  const separator = value.includes(';') ? ';' : ',';
  return value.split(separator).map((o) => o.trim()).filter(Boolean);
}

function toName(text, index) {
  const slug = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `field-${index}`;
}

function createField(def, index) {
  const type = (def.type || 'text').toLowerCase().trim();
  const name = def.name || toName(def.labelText, index);
  const id = `form-${name}-${index}`;
  const wrapper = document.createElement('div');
  wrapper.className = `form-field form-field-${type}`;

  if (type === 'submit') {
    wrapper.className = 'form-field form-field-submit';
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'button';
    button.textContent = def.labelText || 'Submit';
    wrapper.append(button);
    return wrapper;
  }

  const label = document.createElement('label');
  label.htmlFor = id;
  label.className = 'form-label';
  if (def.labelNodes?.length) label.append(...def.labelNodes);
  else label.textContent = def.labelText || name;
  if (def.required) {
    const marker = document.createElement('span');
    marker.className = 'form-required';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '*';
    label.append(marker);
  }

  let control;
  if (type === 'select') {
    control = document.createElement('select');
    if (def.placeholder) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = def.placeholder;
      opt.disabled = true;
      opt.selected = true;
      control.append(opt);
    }
    (def.options || []).forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      control.append(opt);
    });
  } else if (type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = 5;
  } else {
    control = document.createElement('input');
    control.type = ['email', 'tel', 'checkbox', 'number', 'date'].includes(type) ? type : 'text';
  }
  control.id = id;
  control.name = name;
  if (def.required) control.required = true;
  if (def.placeholder && type !== 'select' && type !== 'checkbox') control.placeholder = def.placeholder;

  if (type === 'checkbox') wrapper.append(control, label);
  else wrapper.append(label, control);
  return wrapper;
}

function defsFromRows(rows, form) {
  const defs = [];
  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;
    const key = cells[0].textContent.trim();
    if (/^(action|submit url)$/i.test(key) && cells[1]) {
      const href = cells[1].querySelector('a')?.href || cells[1].textContent.trim();
      if (href) form.action = href;
      return;
    }
    const text = (i) => (cells[i] ? cells[i].textContent.trim() : '');
    defs.push({
      labelText: key,
      labelNodes: cells[0].querySelector('a') ? [...cells[0].childNodes] : null,
      type: text(1) || 'text',
      placeholder: text(2),
      required: TRUTHY.includes(text(3).toLowerCase()),
      options: splitOptions(text(4)),
    });
  });
  return defs;
}

async function defsFromJson(href) {
  const resp = await fetch(href);
  if (!resp.ok) return [];
  const json = await resp.json();
  const firstSheet = json[':names']?.[0];
  const data = json.data || (firstSheet && json[firstSheet]?.data) || [];
  return data.map((r) => ({
    name: r.Name || r.name,
    labelText: r.Label || r.label || r.Name,
    type: r.Type || r.type || 'text',
    placeholder: r.Placeholder || r.placeholder || '',
    required: TRUTHY.includes(String(r.Mandatory || r.Required || '').toLowerCase()),
    options: splitOptions(String(r.Options || r.options || '')),
  }));
}

export default async function decorate(block) {
  const form = document.createElement('form');
  form.className = 'form-fields';
  form.method = 'post';
  form.noValidate = false;

  const rows = [...block.children];
  const links = [...block.querySelectorAll('a[href]')];
  const defLink = links.find((a) => /\.json(\?|$)/.test(new URL(a.href, window.location.href).pathname));

  let defs;
  if (defLink) {
    const submitLink = links.find((a) => a !== defLink);
    if (submitLink) form.action = submitLink.href;
    defs = await defsFromJson(defLink.href);
  } else {
    defs = defsFromRows(rows, form);
  }

  if (!defs.some((d) => (d.type || '').toLowerCase() === 'submit')) {
    defs.push({ type: 'submit', labelText: 'Submit' });
  }

  defs.forEach((def, i) => form.append(createField(def, i)));

  form.addEventListener('submit', async (e) => {
    if (!form.action || form.action === window.location.href) return;
    e.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      form.classList.add('form-submitted');
    } finally {
      if (button) button.disabled = false;
    }
  });

  block.replaceChildren(form);
}

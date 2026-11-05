// Enquiry form behaviour: validation, error summary, and a real submission only when an endpoint exists.
// With no endpoint the submit button stays disabled and nothing can claim that an enquiry was sent.
const form = document.getElementById('enquiry-form');
if (form) {
  const summary = document.getElementById('form-errors');
  const summaryList = summary.querySelector('ul');
  const statusBox = document.getElementById('form-status');
  const submit = form.querySelector('button[type="submit"]');
  const startedAt = Date.now();

  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name.'),
    phone: (v) => (/^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(v.trim()) ? '' : 'Enter a 10-digit Indian mobile number, for example 98765 43210.'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter an email address in the format name@example.com, or leave this blank.'),
    service: (v) => (v ? '' : 'Choose the kind of help you need, or "Not sure yet".'),
    business: (v) => (v ? '' : 'Choose the option closest to you.'),
    area: (v) => (v.trim().length >= 2 ? '' : 'Enter your part of Delhi, for example Karol Bagh.'),
    frequency: (v) => (v ? '' : 'Choose one-time, recurring or not sure.'),
    details: (v) => (v.trim().length >= 10 ? '' : 'Add a short description of what you need done.'),
    consent_process: (v, el) => (el.checked ? '' : 'Tick this box so that your enquiry can be reviewed.'),
  };

  const fieldOf = (name) => form.elements[name];
  const valueOf = (name) => { const f = fieldOf(name); return f instanceof RadioNodeList ? f.value : f.value; };

  const setError = (name, message) => {
    const error = document.getElementById(`${name}-error`);
    const field = fieldOf(name);
    const targets = field instanceof RadioNodeList ? [...field] : [field];
    error.textContent = message;
    error.hidden = !message;
    targets.forEach((t) => (message ? t.setAttribute('aria-invalid', 'true') : t.removeAttribute('aria-invalid')));
    return Boolean(message);
  };

  const check = (name) => {
    const el = fieldOf(name);
    const first = el instanceof RadioNodeList ? el[0] : el;
    return setError(name, rules[name](valueOf(name), first));
  };

  Object.keys(rules).forEach((name) => {
    const el = fieldOf(name);
    (el instanceof RadioNodeList ? [...el] : [el]).forEach((t) => {
      t.addEventListener(t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT' ? 'change' : 'blur', () => check(name));
      // Clear an error while typing, so the layout does not jump under a click when focus moves on.
      t.addEventListener('input', () => { if (t.getAttribute('aria-invalid') === 'true') check(name); });
    });
  });

  const counter = document.getElementById('details-count');
  fieldOf('details').addEventListener('input', (e) => { counter.textContent = `${e.target.value.length} of 600 characters`; });

  const showStatus = (kind, html) => {
    statusBox.className = `form-status form-status--${kind}`;
    statusBox.innerHTML = html;
    statusBox.hidden = false;
    statusBox.focus();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const failed = Object.keys(rules).filter((name) => check(name));
    summaryList.innerHTML = '';
    if (failed.length) {
      failed.forEach((name) => {
        const el = fieldOf(name);
        const id = (el instanceof RadioNodeList ? el[0] : el).id;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = document.getElementById(`${name}-error`).textContent;
        li.append(a);
        summaryList.append(li);
      });
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;

    const endpoint = form.dataset.endpoint;
    if (!endpoint) return; // No destination exists, so nothing is sent and nothing claims otherwise.

    const data = Object.fromEntries(new FormData(form));
    data.elapsed_ms = Date.now() - startedAt;
    submit.disabled = true;
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      if (!response.ok) throw new Error(String(response.status));
      form.hidden = true;
      showStatus('success', '<strong>Your enquiry has reached us.</strong> We will review it. This is not confirmation that a professional is available.');
    } catch {
      submit.disabled = false;
      showStatus('error', `<strong>Your enquiry was not sent.</strong> Nothing has been received. Please try again, or call ${form.dataset.phone}.`);
    }
  });
}

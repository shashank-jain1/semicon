/* SFA Semicon — admin panel (vanilla JS, no build step) */
(() => {
  // ---------- Tiny DOM helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'value') e.value = v;
      else if (k === 'checked') e.checked = !!v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(k => { if (k != null && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k))); });
    return e;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const plain = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const uid = () => Math.random().toString(16).slice(2, 14);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // ---------- UI icons ----------
  const UI = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    pages: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
    media: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z"/>',
    backup: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M14.1 14.1a3 3 0 0 1-4.2-4.2"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    reply: '<path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    insertBelow: '<path d="M12 11v8M8 15h8"/><rect x="3" y="3" width="18" height="5" rx="1.5"/>'
  };
  const ui = (name, cls = 'ico') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('class', cls); s.innerHTML = UI[name] || ''; return s; };
  const siteIcon = (name, cls = 'ico') => { const s = ui('', cls); s.innerHTML = state.icons[name] || state.icons.cpu || ''; s.setAttribute('stroke-width', '1.6'); return s; };

  const TYPE_ICON = { hero: 'cpu', edaFlow: 'circuit', edaSuite: 'sparkles', ipPortfolio: 'network', marquee: 'arrow', stats: 'gauge', about: 'users', services: 'layers', chipAnatomy: 'microscope', trainingLab: 'brain', process: 'network', industries: 'factory', academy: 'graduation', techStack: 'code', testimonials: 'quote', faq: 'book', cta: 'rocket', contact: 'mail', richText: 'book', imageText: 'media', cards: 'circuit', html: 'code' };
  const typeIcon = (type) => (TYPE_ICON[type] === 'media' ? ui('media') : siteIcon(TYPE_ICON[type] || 'cpu'));

  // ---------- State ----------
  const state = { user: null, settings: null, pages: [], sectionTypes: {}, settingsSchema: [], icons: {}, samples: {}, unread: 0, dirty: false, lastHash: location.hash };
  const app = $('#app');

  // ---------- API ----------
  async function api(method, url, body, opts = {}) {
    const init = { method, headers: { 'X-SFA-Admin': '1' }, credentials: 'same-origin' };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    const res = await fetch(`/api/admin${url}`, init);
    if (opts.raw) { if (!res.ok) throw new Error(`Request failed (${res.status})`); return res; }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/login') { state.dirty = false; renderLogin('Your session has expired. Please sign in again.'); throw new Error('Not signed in'); }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // ---------- Toasts / modals ----------
  function toast(msg, type = 'ok') {
    const t = el('div', { class: `toast toast--${type}` }, ui(type === 'error' ? 'alert' : 'check'), el('span', {}, msg));
    $('#toasts').append(t);
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 300); }, type === 'error' ? 5000 : 2600);
  }
  function modal({ title, body, foot, small, onClose }) {
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const m = el('div', { class: 'modal', onmousedown: (e) => { if (e.target === m) close(); } },
      el('div', { class: `modal__box${small ? ' modal__box--sm' : ''}`, role: 'dialog', 'aria-modal': 'true' },
        el('div', { class: 'modal__head' }, el('h3', {}, title), el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, ui('x'))),
        el('div', { class: 'modal__body' }, body),
        foot ? el('div', { class: 'modal__foot' }, foot) : null));
    document.body.append(m);
    document.addEventListener('keydown', onKey);
    return { close, el: m };
  }
  function confirmBox(message, { okLabel = 'Confirm', danger = false, title = 'Are you sure?' } = {}) {
    return new Promise(resolve => {
      let done = false;
      const finish = (v) => { if (done) return; done = true; resolve(v); m.close(); };
      const ok = el('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, onclick: () => finish(true) }, okLabel);
      const m = modal({ title, small: true, body: el('p', { style: { margin: 0, color: 'var(--muted)' } }, message), foot: [el('button', { class: 'btn', onclick: () => finish(false) }, 'Cancel'), ok], onClose: () => finish(false) });
      ok.focus();
    });
  }

  // ---------- Dirty tracking ----------
  let statusEl = null;
  function setDirty(v) {
    state.dirty = v;
    if (statusEl) {
      statusEl.className = `topbar__status${v ? ' is-dirty' : ''}`;
      statusEl.innerHTML = v ? '<i></i>Unsaved changes' : '<i></i>All changes saved';
    }
    $$('[data-save]').forEach(b => { b.disabled = !v; });
  }
  window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('hashchange', async () => {
    if (state.dirty && location.hash !== state.lastHash) {
      const leave = await confirmBox('You have unsaved changes. Leave this screen and discard them?', { okLabel: 'Discard changes', danger: true, title: 'Unsaved changes' });
      if (!leave) { history.replaceState(null, '', state.lastHash); return; }
      state.dirty = false;
    }
    state.lastHash = location.hash;
    route();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { const b = $('[data-save]'); if (b) { e.preventDefault(); if (!b.disabled) b.click(); } }
  });

  // ---------- Login ----------
  function renderLogin(message = '') {
    const err = el('div', { class: 'login__err' }, message);
    const u = el('input', { class: 'input', name: 'username', autocomplete: 'username', required: true, placeholder: 'admin' });
    const p = el('input', { class: 'input', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
    const btn = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Sign in');
    const form = el('form', {
      onsubmit: async (e) => {
        e.preventDefault(); btn.disabled = true; err.textContent = '';
        try { await api('POST', '/login', { username: u.value, password: p.value }); await boot(); }
        catch (ex) { err.textContent = ex.message; btn.disabled = false; }
      }
    },
    el('div', { class: 'field' }, el('label', {}, 'Username'), u),
    el('div', { class: 'field' }, el('label', {}, 'Password'), p),
    btn, err);
    app.replaceChildren(el('div', { class: 'login' }, el('div', { class: 'login__card' },
      el('div', { class: 'login__logo' }, el('img', { src: '/assets/img/sfa-mast.png', alt: 'SFA' }), el('b', {}, 'Semicon')),
      el('h1', {}, 'Website admin'),
      el('p', { class: 'sub' }, 'Sign in to edit your website content.'),
      form)));
    u.focus();
  }

  // ---------- Boot ----------
  async function boot() {
    try {
      const d = await api('GET', '/bootstrap');
      Object.assign(state, { user: d.user, settings: d.settings, pages: d.pages, sectionTypes: d.sectionTypes, settingsSchema: d.settingsSchema, icons: d.icons, samples: d.samples || {}, unread: d.unread });
      if (!location.hash) history.replaceState(null, '', '#/dashboard');
      state.lastHash = location.hash;
      route();
    } catch (e) {
      if (e.message !== 'Not signed in') renderLogin();
    }
  }

  // ---------- Shell ----------
  function shell(active, topbar, content, { wide = false } = {}) {
    const link = (href, icon, label, key, badge) => el('a', { class: `side__link${active === key ? ' is-active' : ''}`, href }, ui(icon), label, badge ? el('span', { class: 'side__badge' }, badge) : null);
    const wrap = el('div', { class: 'shell' });
    const side = el('aside', { class: 'side' },
      el('a', { class: 'side__logo', href: '#/dashboard' }, el('img', { src: '/assets/img/sfa-mast.png', alt: 'SFA' }), el('b', {}, state.settings?.logoWord || 'Semicon'), el('span', {}, 'Admin')),
      link('#/dashboard', 'dashboard', 'Dashboard', 'dashboard'),
      link('#/pages', 'pages', 'Pages & sections', 'pages'),
      link('#/settings', 'settings', 'Site settings', 'settings'),
      link('#/media', 'media', 'Media library', 'media'),
      link('#/messages', 'inbox', 'Messages', 'messages', state.unread || null),
      el('div', { class: 'side__sep' }),
      link('#/backups', 'backup', 'Backups', 'backups'),
      link('#/account', 'user', 'Account', 'account'),
      el('div', { class: 'side__foot' },
        el('a', { class: 'side__link', href: '/', target: '_blank' }, ui('external'), 'View website'),
        el('button', { class: 'side__link', style: { border: 0, background: 'none', width: '100%', textAlign: 'left' }, onclick: logout }, ui('logout'), 'Sign out'),
        el('div', { class: 'side__user' }, el('span', { class: 'side__avatar' }, (state.user?.username || '?')[0]), state.user?.username)));
    const burger = el('button', { class: 'icon-btn burger-admin', 'aria-label': 'Menu', onclick: () => wrap.classList.toggle('side-open') }, ui('menu'));
    side.addEventListener('click', (e) => { if (e.target.closest('a')) wrap.classList.remove('side-open'); });
    wrap.append(side, el('div', { class: 'main' }, el('div', { class: 'topbar' }, burger, topbar), wide ? content : el('div', { class: 'content' }, content)));
    app.replaceChildren(wrap);
    window.scrollTo(0, 0);
  }
  function status() { statusEl = el('span', { class: 'topbar__status' }, el('i'), 'All changes saved'); return statusEl; }
  async function logout() {
    if (state.dirty && !(await confirmBox('Discard unsaved changes and sign out?', { danger: true, okLabel: 'Sign out' }))) return;
    state.dirty = false;
    await api('POST', '/logout').catch(() => {});
    renderLogin();
  }

  // ---------- Router ----------
  function route() {
    statusEl = null;
    $$('.modal').forEach(m => m.remove());
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const view = parts[0] || 'dashboard';
    setDirty(false);
    ({ dashboard: viewDashboard, pages: parts[1] ? () => viewPageEditor(parts[1]) : viewPages, settings: viewSettings, media: viewMedia, messages: viewMessages, backups: viewBackups, account: viewAccount }[view] || viewDashboard)();
  }

  // =====================================================================
  //  Field renderers (schema-driven)
  // =====================================================================
  function defaultFor(field) {
    switch (field.type) {
      case 'list': return [];
      case 'boolean': return false;
      case 'number': return 0;
      case 'select': return field.options?.[0] ?? '';
      case 'icon': return 'cpu';
      default: return '';
    }
  }
  function emptyItem(fields) { const o = {}; fields.forEach(f => { o[f.key] = defaultFor(f); }); return o; }

  function renderFields(fields, obj, onChange) {
    return fields.map(f => renderField(f, obj, onChange));
  }

  function renderField(f, obj, onChange) {
    if (obj[f.key] === undefined) obj[f.key] = defaultFor(f);
    const set = (v) => { obj[f.key] = v; onChange(f, v); };
    const help = f.help ? el('div', { class: 'help' }, f.help) : null;
    const wrap = (control, label = f.label) => el('div', { class: 'field' }, el('label', {}, label), control, help);

    switch (f.type) {
      case 'textarea': {
        const t = el('textarea', { class: `textarea${f.code ? ' textarea--code' : ''}`, rows: f.rows || 3, value: obj[f.key], spellcheck: f.code ? 'false' : 'true', oninput: (e) => set(e.target.value) });
        return wrap(t);
      }
      case 'richtext': return wrap(richText(obj[f.key], set));
      case 'number': return wrap(el('input', { class: 'input', type: 'number', step: 'any', value: obj[f.key], oninput: (e) => set(e.target.value === '' ? 0 : Number(e.target.value)) }));
      case 'boolean': return el('div', { class: 'field' }, el('label', { class: 'switch' }, el('input', { type: 'checkbox', checked: obj[f.key], onchange: (e) => set(e.target.checked) }), el('i'), f.label), help);
      case 'select': return wrap(el('select', { class: 'select', onchange: (e) => set(e.target.value) }, (f.options || []).map(o => el('option', { value: o, selected: String(obj[f.key]) === String(o) ? 'selected' : null }, o))));
      case 'color': {
        const txt = el('input', { class: 'input mono', value: obj[f.key], style: { maxWidth: '140px' }, oninput: (e) => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) { pick.value = e.target.value; set(e.target.value); } } });
        const pick = el('input', { type: 'color', class: 'color-input', value: obj[f.key] || '#000000', oninput: (e) => { txt.value = e.target.value; set(e.target.value); } });
        return wrap(el('div', { class: 'input-row' }, pick, txt));
      }
      case 'image': return wrap(imageField(obj[f.key], set));
      case 'icon': return wrap(iconField(obj[f.key], set));
      case 'list': return listField(f, obj, onChange);
      case 'url': return wrap(el('input', { class: 'input', value: obj[f.key], placeholder: '/#contact, /careers or https://…', oninput: (e) => set(e.target.value) }));
      default: return wrap(el('input', { class: 'input', value: obj[f.key], oninput: (e) => set(e.target.value) }));
    }
  }

  function listField(f, obj, onChange) {
    const arr = Array.isArray(obj[f.key]) ? obj[f.key] : (obj[f.key] = []);
    const simple = f.fields.length === 1 && ['text', 'url'].includes(f.fields[0].type);
    const box = el('div', { class: `listf${simple ? ' listf--simple' : ''}` });
    const changed = () => onChange(f, arr);
    let openIdx = -1;
    const titleOf = (item, i) => plain(item[f.itemLabel] || Object.values(item).find(v => typeof v === 'string' && v.trim()) || '') || `Item ${i + 1}`;

    const tools = (i) => [
      el('button', { class: 'icon-btn', title: 'Move up', disabled: i === 0 ? true : null, onclick: (e) => { e.stopPropagation(); [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; if (openIdx === i) openIdx--; rebuild(); changed(); } }, ui('up')),
      el('button', { class: 'icon-btn', title: 'Move down', disabled: i === arr.length - 1 ? true : null, onclick: (e) => { e.stopPropagation(); [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; if (openIdx === i) openIdx++; rebuild(); changed(); } }, ui('down')),
      simple ? null : el('button', { class: 'icon-btn', title: 'Duplicate', onclick: (e) => { e.stopPropagation(); if (f.max && arr.length >= f.max) return toast(`Maximum ${f.max} items`, 'error'); arr.splice(i + 1, 0, clone(arr[i])); openIdx = i + 1; rebuild(); changed(); } }, ui('copy')),
      el('button', { class: 'icon-btn icon-btn--danger', title: 'Remove', onclick: (e) => { e.stopPropagation(); arr.splice(i, 1); openIdx = -1; rebuild(); changed(); } }, ui('trash'))
    ];

    function rebuild() {
      box.replaceChildren();
      arr.forEach((item, i) => {
        if (simple) {
          const k = f.fields[0].key;
          box.append(el('div', { class: 'listf__item' },
            el('input', { class: 'input', value: item[k] ?? '', placeholder: f.fields[0].label, oninput: (e) => { item[k] = e.target.value; changed(); } }),
            tools(i)));
          return;
        }
        const title = el('span', { class: 'title' }, titleOf(item, i));
        const body = el('div', { class: 'listf__body' });
        const row = el('div', { class: `listf__item${openIdx === i ? ' is-open' : ''}` },
          el('div', { class: 'listf__head', onclick: () => { const open = !row.classList.contains('is-open'); $$(':scope > .listf__item', box).forEach(x => x.classList.remove('is-open')); row.classList.toggle('is-open', open); openIdx = open ? i : -1; if (open && !body.childElementCount) fill(); } },
            el('span', { class: 'num' }, String(i + 1).padStart(2, '0')), title, tools(i), el('span', { class: 'icon-btn chev' }, ui('down'))),
          body);
        const fill = () => body.append(...renderFields(f.fields, item, () => { title.textContent = titleOf(item, i); changed(); }));
        if (openIdx === i) fill();
        box.append(row);
      });
      const canAdd = !f.max || arr.length < f.max;
      box.append(el('button', { class: 'btn btn--sm listf__add', disabled: canAdd ? null : true, onclick: () => { arr.push(emptyItem(f.fields)); openIdx = arr.length - 1; rebuild(); changed(); const inp = $$('.listf__item', box).at(-1)?.querySelector('input, textarea'); inp?.focus(); } }, ui('plus'), `Add ${f.itemLabel === 'text' ? 'item' : (f.label.replace(/s(\s|$).*/, '').toLowerCase() || 'item')}`));
    }
    rebuild();
    return el('div', { class: 'field' }, el('div', { class: 'field__label' }, f.label, el('span', { class: 'pill' }, arr.length)), f.help ? el('div', { class: 'help' }, f.help) : null, box);
  }

  function richText(value, set) {
    const area = el('div', { class: 'rte__area', contenteditable: 'true', html: value || '' });
    const src = el('textarea', { class: 'rte__src', spellcheck: 'false' });
    const box = el('div', { class: 'rte' });
    const sync = () => set(area.innerHTML.replace(/<div><br><\/div>/g, '').trim());
    area.addEventListener('input', sync);
    area.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
    src.addEventListener('input', () => set(src.value));
    const cmd = (c, v) => (e) => { e.preventDefault(); area.focus(); document.execCommand(c, false, v); sync(); };
    const bar = el('div', { class: 'rte__bar' },
      el('button', { type: 'button', title: 'Bold', onmousedown: cmd('bold') }, 'B'),
      el('button', { type: 'button', title: 'Italic', style: { fontStyle: 'italic' }, onmousedown: cmd('italic') }, 'I'),
      el('button', { type: 'button', title: 'Paragraph', onmousedown: cmd('formatBlock', 'P') }, '¶'),
      el('button', { type: 'button', title: 'Heading', onmousedown: cmd('formatBlock', 'H3') }, 'H'),
      el('button', { type: 'button', title: 'Bullet list', onmousedown: cmd('insertUnorderedList') }, '• List'),
      el('button', { type: 'button', title: 'Numbered list', onmousedown: cmd('insertOrderedList') }, '1. List'),
      el('button', { type: 'button', title: 'Link', onmousedown: (e) => { e.preventDefault(); const u = prompt('Link URL (https://… or /page)'); if (u) cmd('createLink', u)(e); } }, 'Link'),
      el('button', { type: 'button', title: 'Remove formatting', onmousedown: cmd('removeFormat') }, 'Clear'),
      el('button', { type: 'button', title: 'Edit HTML', style: { marginLeft: 'auto' }, onmousedown: (e) => {
        e.preventDefault();
        const on = !box.classList.contains('is-src');
        if (on) src.value = area.innerHTML; else area.innerHTML = src.value;
        box.classList.toggle('is-src', on); e.currentTarget.classList.toggle('is-on', on);
      } }, '</>'));
    box.append(bar, area, src);
    return box;
  }

  function imageField(value, set) {
    const thumb = el('div', { class: 'imgf__thumb' });
    const input = el('input', { class: 'input', value: value || '', placeholder: 'Image URL or upload', oninput: (e) => { update(e.target.value); } });
    const update = (v) => {
      set(v);
      thumb.classList.toggle('has-img', !!v);
      thumb.style.backgroundImage = v ? `url("${v.replace(/"/g, '%22')}")` : '';
      thumb.replaceChildren(v ? '' : ui('media'));
    };
    const file = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      if (!file.files[0]) return;
      try { const url = await uploadFile(file.files[0]); input.value = url; update(url); toast('Image uploaded'); }
      catch (e) { toast(e.message, 'error'); }
      file.value = '';
    } });
    update(value || '');
    return el('div', { class: 'imgf' }, thumb, el('div', {}, input,
      el('div', { class: 'imgf__btns' },
        el('button', { type: 'button', class: 'btn btn--sm', onclick: () => file.click() }, ui('upload'), 'Upload'),
        el('button', { type: 'button', class: 'btn btn--sm', onclick: () => pickMedia((url) => { input.value = url; update(url); }) }, ui('media'), 'Library'),
        el('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => { input.value = ''; update(''); } }, 'Remove'),
        file)));
  }

  function iconField(value, set) {
    const btn = el('button', { type: 'button', class: 'iconf__btn', title: 'Choose icon' }, siteIcon(value || 'cpu'));
    const name = el('span', { class: 'muted mono' }, value || 'cpu');
    btn.addEventListener('click', () => {
      const grid = el('div', { class: 'icon-grid' }, Object.keys(state.icons).map(k => el('button', { type: 'button', class: k === value ? 'is-on' : null, title: k, onclick: () => { value = k; set(k); btn.replaceChildren(siteIcon(k)); name.textContent = k; m.close(); } }, siteIcon(k), k)));
      const m = modal({ title: 'Choose an icon', body: grid });
    });
    return el('div', { class: 'iconf' }, btn, name);
  }

  async function uploadFile(f) {
    const fd = new FormData(); fd.append('file', f);
    const r = await api('POST', '/upload', fd);
    return r.url;
  }

  async function pickMedia(onPick) {
    const grid = el('div', { class: 'media-grid' }, el('div', { class: 'muted' }, 'Loading…'));
    const file = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      try { const url = await uploadFile(file.files[0]); onPick(url); m.close(); toast('Image uploaded'); } catch (e) { toast(e.message, 'error'); }
    } });
    const m = modal({ title: 'Media library', body: [el('div', { class: 'input-row' }, el('button', { class: 'btn btn--primary btn--sm', onclick: () => file.click() }, ui('upload'), 'Upload new'), file), grid] });
    try {
      const { files } = await api('GET', '/media');
      const imgs = files.filter(x => !x.name.endsWith('.pdf'));
      grid.replaceChildren(...(imgs.length ? imgs.map(x => el('div', { class: 'media-item media-item--pick', onclick: () => { onPick(x.url); m.close(); } },
        el('div', { class: 'media-item__img', style: { backgroundImage: `url("${x.url}")` } }), el('div', { class: 'media-item__meta' }, x.name))) : [el('div', { class: 'muted' }, 'No images yet — upload one above.')]));
    } catch (e) { grid.replaceChildren(el('div', { class: 'muted' }, e.message)); }
  }

  // =====================================================================
  //  Views
  // =====================================================================
  function viewDashboard() {
    const sections = state.pages.reduce((n, p) => n + p.sections.length, 0);
    const home = state.pages.find(p => p.slug === 'home');
    shell('dashboard', [el('h1', {}, 'Dashboard')], [
      el('div', { class: 'hello' },
        el('h2', {}, `Welcome back, ${state.user.username}`),
        el('p', {}, 'Every piece of text, image, menu link and section on your website can be edited here. Changes go live the moment you press Save.'),
        el('div', { class: 'hello__actions' },
          home ? el('a', { class: 'btn btn--primary', href: `#/pages/${home.id}` }, ui('home'), 'Edit home page') : null,
          el('a', { class: 'btn', href: '#/settings' }, ui('settings'), 'Brand & contact details'),
          el('a', { class: 'btn', href: '/', target: '_blank' }, ui('external'), 'Open website'))),
      el('div', { class: 'grid-3' },
        el('a', { class: 'stat-card', href: '#/pages', style: { textDecoration: 'none' } }, el('b', {}, state.pages.length), el('span', {}, 'Pages')),
        el('a', { class: 'stat-card', href: '#/pages', style: { textDecoration: 'none' } }, el('b', {}, sections), el('span', {}, 'Sections across all pages')),
        el('a', { class: 'stat-card', href: '#/messages', style: { textDecoration: 'none' } }, el('b', {}, state.unread), el('span', {}, 'Unread enquiries'))),
      el('div', { class: 'card', style: { marginTop: '16px' } },
        el('div', { class: 'card__head' }, el('div', {}, el('h2', {}, 'Editing tips'))),
        el('ul', { class: 'tips' },
          el('li', { html: 'Wrap words in <code>*asterisks*</code> in headings to give them the gradient accent colour; use <code>**double**</code> for bold.' }),
          el('li', { html: 'Open <b>Pages &amp; sections</b> → a page → turn on <b>Live preview</b> to see edits before saving.' }),
          el('li', { html: 'Every section has an <b>Anchor ID</b>. Link to it from the menu with <code>/#anchor</code>.' }),
          el('li', { html: 'Hide a section with the eye icon instead of deleting it — you can bring it back any time.' }),
          el('li', { html: 'Every save keeps a restorable snapshot under <b>Backups</b>.' }),
          el('li', { html: 'Press <code>Ctrl/⌘ + S</code> to save on any editing screen.' })))
    ]);
  }

  // ---------- Pages list ----------
  function viewPages() {
    const list = el('div', { class: 'pages-list' }, state.pages.map(p => el('a', { class: 'page-row', href: `#/pages/${p.id}` },
      el('span', { class: 'page-row__icon' }, ui(p.slug === 'home' ? 'home' : 'pages')),
      el('span', { class: 'page-row__main' }, el('b', {}, p.title), el('span', {}, p.slug === 'home' ? '/' : `/${p.slug}`)),
      el('span', { class: 'pill' }, `${p.sections.length} sections`),
      p.slug === 'home' ? el('span', { class: 'pill pill--accent' }, 'Home') : null,
      el('button', { class: 'icon-btn', title: 'Open page', onclick: (e) => { e.preventDefault(); window.open(p.slug === 'home' ? '/' : `/${p.slug}`, '_blank'); } }, ui('external')),
      p.slug !== 'home' ? el('button', { class: 'icon-btn icon-btn--danger', title: 'Delete page', onclick: async (e) => {
        e.preventDefault();
        if (!(await confirmBox(`Delete the page “${p.title}” (/${p.slug})? You can restore it later from Backups.`, { danger: true, okLabel: 'Delete page' }))) return;
        try { await api('DELETE', `/pages/${p.id}`); state.pages = state.pages.filter(x => x.id !== p.id); toast('Page deleted'); viewPages(); } catch (ex) { toast(ex.message, 'error'); }
      } }, ui('trash')) : null)));
    shell('pages', [el('h1', {}, 'Pages & sections'), el('span', { class: 'topbar__spacer' }), el('button', { class: 'btn btn--primary', onclick: newPage }, ui('plus'), 'New page')],
      [el('p', { class: 'muted', style: { marginTop: 0 } }, 'Each page is built from sections you can edit, reorder, hide or add. Add new pages for things like Careers, Products or Events, then link them from the menu in Site settings.'), list]);
  }

  function newPage() {
    const title = el('input', { class: 'input', placeholder: 'e.g. Products' });
    const slug = el('input', { class: 'input mono', placeholder: 'products' });
    let touched = false;
    title.addEventListener('input', () => { if (!touched) slug.value = slugify(title.value); });
    slug.addEventListener('input', () => { touched = true; });
    const tpl = el('select', { class: 'select' }, el('option', { value: 'text' }, 'Starter: heading + text + call to action'), el('option', { value: 'cards' }, 'Starter: heading + cards grid + call to action'), el('option', { value: 'blank' }, 'Blank page'));
    const addNav = el('input', { type: 'checkbox', checked: true });
    const go = el('button', { class: 'btn btn--primary', onclick: async () => {
      const sections = [];
      const add = (type, anchor) => sections.push({ id: uid(), type, anchor, visible: true, data: clone(state.samples[type] || {}) });
      if (tpl.value !== 'blank') {
        add('richText', 'intro');
        sections[0].data.heading = title.value || 'New page';
        if (tpl.value === 'cards') add('cards', 'items');
        add('cta', 'contact-cta');
      }
      try {
        const { page } = await api('POST', '/pages', { title: title.value || slug.value, slug: slug.value, sections });
        state.pages.push(page);
        if (addNav.checked) {
          state.settings.nav = [...(state.settings.nav || []), { label: page.title, href: `/${page.slug}` }];
          await api('PUT', '/settings', { settings: { nav: state.settings.nav } });
        }
        m.close(); toast('Page created');
        location.hash = `#/pages/${page.id}`;
      } catch (e) { toast(e.message, 'error'); }
    } }, 'Create page');
    const m = modal({ title: 'New page', small: true, body: [
      el('div', { class: 'field' }, el('label', {}, 'Page title'), title),
      el('div', { class: 'field' }, el('label', {}, 'URL'), el('div', { class: 'input-row' }, el('span', { class: 'muted mono' }, '/'), slug)),
      el('div', { class: 'field' }, el('label', {}, 'Start with'), tpl),
      el('div', { class: 'field' }, el('label', { class: 'switch' }, addNav, el('i'), 'Add to the main menu'))
    ], foot: [el('button', { class: 'btn', onclick: () => m.close() }, 'Cancel'), go] });
    title.focus();
  }

  // ---------- Page editor ----------
  function viewPageEditor(id) {
    const original = state.pages.find(p => p.id === id);
    if (!original) { location.hash = '#/pages'; return; }
    const draft = clone(original);
    let openId = null;
    let previewOn = false;
    try { previewOn = localStorage.getItem('sfa-preview') === '1'; } catch { /* ignore */ }

    const changed = () => { setDirty(true); schedulePreview(); };

    // Page details
    const details = el('details', { class: 'details' },
      el('summary', {}, ui('settings'), 'Page details & SEO', el('span', { class: 'topbar__spacer' }), el('span', { class: 'chev' }, ui('down'))),
      el('div', { class: 'details__body' },
        el('div', { class: 'grid-2' },
          renderField({ key: 'title', label: 'Page title', type: 'text' }, draft, changed),
          draft.slug === 'home'
            ? el('div', { class: 'field' }, el('label', {}, 'URL'), el('input', { class: 'input mono', value: '/', disabled: true }), el('div', { class: 'help' }, 'The home page always lives at /'))
            : renderField({ key: 'slug', label: 'URL slug', type: 'text', help: 'Lowercase letters, numbers and dashes. Changing it breaks old links.' }, draft, changed)),
        renderField({ key: 'seoTitle', label: 'Browser / Google title', type: 'text', help: 'Leave empty to use the default from Site settings.' }, draft, changed),
        renderField({ key: 'seoDescription', label: 'Meta description', type: 'textarea', rows: 2 }, draft, changed)));

    const list = el('div', { class: 'sections' });
    const summary = (sec) => {
      const d = sec.data || {};
      return plain(d.heading || d.title || d.eyebrow || d.items?.[0]?.text || d.text || '') || state.sectionTypes[sec.type]?.label;
    };

    function card(sec, i) {
      const T = state.sectionTypes[sec.type] || { label: sec.type, fields: [] };
      const titleB = el('b', {}, summary(sec));
      const sub = el('span', {}, T.label, sec.anchor ? `  ·  #${sec.anchor}` : '');
      const body = el('div', { class: 'sec-card__body' });
      const c = el('div', { class: `sec-card${openId === sec.id ? ' is-open' : ''}${sec.visible === false ? ' is-hidden-sec' : ''}`, 'data-id': sec.id });
      const eyeBtn = el('button', { class: `icon-btn${sec.visible === false ? ' is-off' : ''}`, title: sec.visible === false ? 'Hidden — click to show' : 'Visible — click to hide' }, ui(sec.visible === false ? 'eyeOff' : 'eye'));
      eyeBtn.addEventListener('click', (e) => { e.stopPropagation(); sec.visible = sec.visible === false; rebuild(); changed(); });
      const move = (d) => (e) => { e.stopPropagation(); const j = i + d; if (j < 0 || j >= draft.sections.length) return; [draft.sections[i], draft.sections[j]] = [draft.sections[j], draft.sections[i]]; rebuild(); changed(); };
      const head = el('div', { class: 'sec-card__head' },
        el('span', { class: 'drag', title: 'Drag to reorder', 'data-drag': '' }, ui('grip')),
        el('span', { class: 'sec-card__type' }, typeIcon(sec.type)),
        el('div', { class: 'sec-card__title' }, titleB, sub),
        el('div', { class: 'sec-card__tools' },
          eyeBtn,
          el('button', { class: 'icon-btn hide-sm', title: 'Move up', disabled: i === 0 ? true : null, onclick: move(-1) }, ui('up')),
          el('button', { class: 'icon-btn hide-sm', title: 'Move down', disabled: i === draft.sections.length - 1 ? true : null, onclick: move(1) }, ui('down')),
          el('button', { class: 'icon-btn hide-sm', title: 'Add a section below', onclick: (e) => { e.stopPropagation(); addSection(i + 1); } }, ui('insertBelow')),
          el('button', { class: 'icon-btn hide-sm', title: 'Duplicate', onclick: (e) => { e.stopPropagation(); const cp = clone(sec); cp.id = uid(); cp.anchor = cp.anchor ? `${cp.anchor}-2` : ''; draft.sections.splice(i + 1, 0, cp); openId = cp.id; rebuild(); changed(); } }, ui('copy')),
          el('button', { class: 'icon-btn icon-btn--danger', title: 'Delete section', onclick: async (e) => {
            e.stopPropagation();
            if (!(await confirmBox(`Delete the “${T.label}” section? Tip: you can hide it instead with the eye icon.`, { danger: true, okLabel: 'Delete' }))) return;
            draft.sections.splice(i, 1); rebuild(); changed();
          } }, ui('trash')),
          el('span', { class: 'icon-btn chev' }, ui('down'))));
      head.addEventListener('click', () => {
        const open = !c.classList.contains('is-open');
        $$('.sec-card', list).forEach(x => x.classList.remove('is-open'));
        c.classList.toggle('is-open', open);
        openId = open ? sec.id : null;
        if (open) { if (!body.childElementCount) fill(); scrollPreviewTo(sec.id); }
      });
      const fill = () => {
        body.append(
          T.locked ? el('div', { class: 'locked' }, ui('lock'), el('span', {}, T.locked)) : null,
          el('div', { class: 'grid-2' },
            renderField({ key: 'anchor', label: 'Anchor ID', type: 'text', help: 'Used for menu links, e.g. /#' + (sec.anchor || 'services') }, sec, () => { sec.anchor = String(sec.anchor).replace(/[^a-zA-Z0-9_-]/g, ''); sub.textContent = `${T.label}${sec.anchor ? `  ·  #${sec.anchor}` : ''}`; changed(); }),
            el('div', { class: 'field' }, el('label', {}, 'Section type'), el('div', { class: 'muted', style: { paddingTop: '8px' } }, T.description || T.label))),
          ...renderFields(T.fields, sec.data, () => { titleB.textContent = summary(sec); changed(); }));
      };
      if (openId === sec.id) fill();
      c.append(head, body);

      // Drag & drop reordering (handle only)
      const handle = $('[data-drag]', head);
      handle.addEventListener('mousedown', () => { c.draggable = true; });
      handle.addEventListener('click', (e) => e.stopPropagation());
      c.addEventListener('dragstart', (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); c.classList.add('is-dragging'); });
      c.addEventListener('dragend', () => { c.draggable = false; c.classList.remove('is-dragging'); $$('.sec-card', list).forEach(x => x.classList.remove('drop-before', 'drop-after')); });
      c.addEventListener('dragover', (e) => {
        e.preventDefault();
        const r = c.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
        c.classList.toggle('drop-after', after); c.classList.toggle('drop-before', !after);
      });
      c.addEventListener('dragleave', () => c.classList.remove('drop-before', 'drop-after'));
      c.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        const r = c.getBoundingClientRect();
        let to = i + (e.clientY > r.top + r.height / 2 ? 1 : 0);
        if (Number.isNaN(from) || from === to || from + 1 === to) { rebuild(); return; }
        const [moved] = draft.sections.splice(from, 1);
        if (from < to) to--;
        draft.sections.splice(to, 0, moved);
        rebuild(); changed();
      });
      return c;
    }

    function rebuild() {
      list.replaceChildren(...draft.sections.map(card),
        el('button', { class: 'add-sec', onclick: () => addSection(draft.sections.length) }, ui('plus'), 'Add a section'));
    }

    function addSection(at) {
      const types = state.sectionTypes;
      const grid = el('div', { class: 'type-grid' }, Object.entries(types).map(([key, T]) => el('button', { class: 'type-opt', onclick: () => {
        const sec = { id: uid(), type: key, anchor: '', visible: true, data: clone(state.samples[key] || {}) };
        draft.sections.splice(at, 0, sec);
        openId = sec.id;
        m.close(); rebuild(); changed();
        setTimeout(() => { $(`.sec-card[data-id="${sec.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); scrollPreviewTo(sec.id); }, 50);
      } }, el('span', { class: 'sec-card__type' }, typeIcon(key)), el('span', {}, el('b', {}, T.label), el('span', {}, T.description), T.locked ? el('span', { class: 'tag' }, 'Built-in animation') : null))));
      const m = modal({ title: 'Add a section', body: [el('p', { class: 'muted', style: { marginTop: 0 } }, 'New sections start with sample content you can edit.'), grid] });
    }

    // ----- Live preview -----
    const iframe = el('iframe', { title: 'Live preview' });
    const stage = el('div', { class: 'pv__stage' }, iframe);
    const spin = el('span', { class: 'spinner pv__loading', style: { width: '18px', height: '18px' } });
    let device = 'desktop';
    const devBtn = (d, icon, label) => el('button', { class: d === device ? 'is-on' : null, onclick: (e) => { device = d; $$('button', e.currentTarget.parentNode).forEach(b => b.classList.remove('is-on')); e.currentTarget.classList.add('is-on'); layoutPreview(); } }, label);
    const preview = el('div', { class: 'editor__preview' },
      el('div', { class: 'pv__bar' }, el('span', {}, 'Live preview'), el('span', { class: 'seg' }, devBtn('desktop', 'monitor', 'Desktop'), devBtn('mobile', 'phone', 'Mobile')),
        el('span', { class: 'topbar__spacer' }), el('span', {}, 'Unsaved edits show here'), el('button', { class: 'icon-btn', title: 'Reload preview', onclick: () => loadPreview() }, ui('refresh'))),
      el('div', { style: { position: 'relative', flex: 1, display: 'flex' } }, spin, stage));

    function layoutPreview() {
      const W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
      stage.classList.toggle('is-mobile', device === 'mobile');
      if (device === 'mobile') {
        const vw = 390, vh = Math.min(844, (H - 24));
        const s = Math.min(1, (W - 20) / vw);
        Object.assign(iframe.style, { width: `${vw}px`, height: `${vh / s}px`, transform: `scale(${s})`, marginBottom: `${-(vh / s) * (1 - s)}px` });
      } else {
        const vw = 1440, s = W / vw;
        Object.assign(iframe.style, { width: `${vw}px`, height: `${H / s}px`, transform: `scale(${s})`, marginBottom: '0' });
      }
    }
    new ResizeObserver(() => layoutPreview()).observe(stage);

    let reqId = 0;
    async function loadPreview() {
      if (!previewOn) return;
      const my = ++reqId;
      spin.classList.add('is-on');
      let y = 0;
      try { y = iframe.contentWindow?.scrollY || 0; } catch { /* cross-doc */ }
      try {
        const res = await api('POST', '/preview', { page: draft, settings: state.settings }, { raw: true });
        const html = await res.text();
        if (my !== reqId) return;
        iframe.onload = () => {
          spin.classList.remove('is-on');
          setTimeout(() => { try { iframe.contentWindow.scrollTo(0, y); } catch { /* ignore */ } }, 120);
        };
        iframe.srcdoc = html;
      } catch (e) { spin.classList.remove('is-on'); toast(e.message, 'error'); }
    }
    const schedulePreview = debounce(loadPreview, 700);
    function scrollPreviewTo(id) {
      if (!previewOn) return;
      try {
        const w = iframe.contentWindow, marker = w.document.querySelector(`[data-sec="${id}"]`);
        const target = marker?.nextElementSibling;
        if (target) w.sfaScrollTo ? w.sfaScrollTo(target, true) : target.scrollIntoView();
      } catch { /* preview not ready */ }
    }

    const editor = el('div', { class: `editor${previewOn ? ' has-preview' : ''}` },
      el('div', { class: 'editor__col' }, details, list), preview);

    const pvToggle = el('label', { class: 'switch', title: 'Show a live preview beside the editor' },
      el('input', { type: 'checkbox', checked: previewOn, onchange: (e) => {
        previewOn = e.target.checked;
        try { localStorage.setItem('sfa-preview', previewOn ? '1' : '0'); } catch { /* ignore */ }
        editor.classList.toggle('has-preview', previewOn);
        if (previewOn) { requestAnimationFrame(layoutPreview); loadPreview(); }
      } }), el('i'), 'Live preview');

    const save = el('button', { class: 'btn btn--primary', 'data-save': '', disabled: true, onclick: async () => {
      save.disabled = true;
      try {
        const { page } = await api('PUT', `/pages/${id}`, draft);
        const idx = state.pages.findIndex(p => p.id === id);
        state.pages[idx] = page;
        Object.assign(draft, clone(page));
        setDirty(false);
        toast('Page saved — live on the website');
      } catch (e) { toast(e.message, 'error'); save.disabled = false; }
    } }, ui('check'), 'Save');

    shell('pages', [
      el('a', { class: 'topbar__crumb', href: '#/pages' }, ui('arrowLeft'), 'Pages'),
      el('h1', {}, draft.title),
      status(),
      el('span', { class: 'topbar__spacer' }),
      pvToggle,
      el('a', { class: 'btn', href: draft.slug === 'home' ? '/' : `/${draft.slug}`, target: '_blank' }, ui('external'), 'View live'),
      save
    ], editor, { wide: true });
    rebuild();
    setDirty(false);
    if (previewOn) { requestAnimationFrame(layoutPreview); loadPreview(); }
  }

  // ---------- Settings ----------
  function viewSettings() {
    const draft = clone(state.settings);
    const changed = () => setDirty(true);
    const save = el('button', { class: 'btn btn--primary', 'data-save': '', disabled: true, onclick: async () => {
      save.disabled = true;
      try { const r = await api('PUT', '/settings', { settings: draft }); state.settings = r.settings; setDirty(false); toast('Settings saved'); }
      catch (e) { toast(e.message, 'error'); save.disabled = false; }
    } }, ui('check'), 'Save');
    const cards = state.settingsSchema.map(g => el('div', { class: 'card' },
      el('div', { class: 'card__head' }, el('h2', {}, g.group)),
      ...renderFields(g.fields, draft, changed)));
    shell('settings', [el('h1', {}, 'Site settings'), status(), el('span', { class: 'topbar__spacer' }), save], cards);
    setDirty(false);
  }

  // ---------- Media ----------
  async function viewMedia() {
    const grid = el('div', { class: 'media-grid' });
    const file = el('input', { type: 'file', multiple: true, accept: 'image/*,application/pdf', hidden: true, onchange: () => uploadMany(file.files) });
    const drop = el('div', { class: 'dropzone' }, ui('upload'), el('div', {}, 'Drag & drop images or PDFs here, or ', el('button', { class: 'btn btn--sm', onclick: () => file.click() }, 'browse files')), el('div', { class: 'help', style: { marginTop: '6px' } }, 'PNG, JPG, WebP, GIF, SVG, AVIF or PDF · up to 10 MB each'), file);
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => uploadMany(e.dataTransfer.files));
    async function uploadMany(files) {
      for (const f of files) { try { await uploadFile(f); toast(`Uploaded ${f.name}`); } catch (e) { toast(`${f.name}: ${e.message}`, 'error'); } }
      load();
    }
    async function load() {
      const { files } = await api('GET', '/media');
      grid.replaceChildren(...(files.length ? files.map(x => el('div', { class: 'media-item' },
        x.name.endsWith('.pdf') ? el('div', { class: 'media-item__img' }, 'PDF') : el('div', { class: 'media-item__img', style: { backgroundImage: `url("${x.url}")` } }),
        el('div', { class: 'media-item__meta', title: x.name }, x.name, el('br'), `${(x.size / 1024).toFixed(0)} KB`),
        el('div', { class: 'media-item__tools' },
          el('button', { class: 'btn btn--sm', onclick: async () => { try { await navigator.clipboard.writeText(x.url); toast('URL copied'); } catch { prompt('Copy this URL', x.url); } } }, ui('copy'), 'Copy URL'),
          el('a', { class: 'icon-btn', href: x.url, target: '_blank', title: 'Open' }, ui('external')),
          el('button', { class: 'icon-btn icon-btn--danger', title: 'Delete', onclick: async () => {
            if (!(await confirmBox(`Delete ${x.name}? Any section using it will show a broken image.`, { danger: true, okLabel: 'Delete' }))) return;
            await api('DELETE', `/media/${encodeURIComponent(x.name)}`); toast('File deleted'); load();
          } }, ui('trash'))))) : [el('div', { class: 'empty', style: { gridColumn: '1/-1' } }, ui('media'), 'No uploads yet')]));
    }
    shell('media', [el('h1', {}, 'Media library')], [drop, grid]);
    load().catch(e => toast(e.message, 'error'));
  }

  // ---------- Messages ----------
  async function viewMessages() {
    const box = el('div', {}, el('div', { class: 'muted' }, 'Loading…'));
    shell('messages', [el('h1', {}, 'Messages'), el('span', { class: 'topbar__spacer' }), el('span', { class: 'muted' }, 'Enquiries sent through the website contact form')], box);
    const { messages } = await api('GET', '/messages');
    const refreshBadge = () => { state.unread = messages.filter(m => !m.read).length; const b = $('.side__link.is-active .side__badge'); if (b) { b.textContent = state.unread; b.style.display = state.unread ? '' : 'none'; } };
    if (!messages.length) { box.replaceChildren(el('div', { class: 'empty card' }, ui('inbox'), 'No messages yet. Enquiries from the contact form will appear here.')); return; }
    box.replaceChildren(...messages.map(m => {
      const item = el('div', { class: `msg${m.read ? '' : ' is-unread'}` });
      const date = new Date(m.createdAt);
      item.append(
        el('div', { class: 'msg__head', onclick: async () => {
          item.classList.toggle('is-open');
          if (!m.read) { m.read = true; item.classList.remove('is-unread'); refreshBadge(); api('PATCH', `/messages/${m.id}`, { read: true }).catch(() => {}); }
        } }, el('span', { class: 'msg__dot' }),
        el('div', { class: 'msg__who' }, el('b', {}, m.name), el('span', {}, m.email), el('p', {}, `${m.topic ? `[${m.topic}] ` : ''}${m.message}`)),
        el('span', { class: 'msg__date' }, date.toLocaleString())),
        el('div', { class: 'msg__body' },
          el('div', { class: 'msg__meta' },
            el('span', {}, 'Topic: ', el('b', {}, m.topic || '—')), el('span', {}, 'Company: ', el('b', {}, m.company || '—')),
            el('span', {}, 'Phone: ', el('b', {}, m.phone || '—')), el('span', {}, 'Page: ', el('b', {}, m.page || '—'))),
          el('div', { class: 'msg__text' }, m.message),
          el('div', { class: 'msg__actions' },
            el('a', { class: 'btn btn--primary btn--sm', href: `mailto:${m.email}?subject=${encodeURIComponent(`Re: your enquiry to ${state.settings.siteName}`)}` }, ui('reply'), 'Reply by email'),
            el('button', { class: 'btn btn--sm', onclick: () => { m.read = false; item.classList.add('is-unread'); refreshBadge(); api('PATCH', `/messages/${m.id}`, { read: false }); } }, 'Mark unread'),
            el('button', { class: 'btn btn--sm btn--danger', onclick: async () => {
              if (!(await confirmBox('Delete this message permanently?', { danger: true, okLabel: 'Delete' }))) return;
              await api('DELETE', `/messages/${m.id}`); messages.splice(messages.indexOf(m), 1); item.remove(); refreshBadge(); toast('Message deleted');
            } }, ui('trash'), 'Delete'))));
      return item;
    }));
  }

  // ---------- Backups ----------
  async function viewBackups() {
    const table = el('table', { class: 'table' });
    const importInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async () => {
      const f = importInput.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!(await confirmBox('Replace all pages and settings with the contents of this file? (Messages and your login are kept. The current version is backed up first.)', { danger: true, okLabel: 'Import' }))) return;
        await api('POST', '/import', data); toast('Content imported'); await boot();
      } catch (e) { toast(e.message, 'error'); }
      importInput.value = '';
    } });
    shell('backups', [el('h1', {}, 'Backups')], [
      el('div', { class: 'card' },
        el('div', { class: 'card__head' }, el('div', {}, el('h2', {}, 'Export & import'), el('p', {}, 'Download all pages and settings as a JSON file, or restore from one.'))),
        el('div', { class: 'input-row' },
          el('a', { class: 'btn btn--primary', href: '/api/admin/export' }, ui('download'), 'Download export'),
          el('button', { class: 'btn', onclick: () => importInput.click() }, ui('upload'), 'Import file…'), importInput)),
      el('div', { class: 'card' },
        el('div', { class: 'card__head' }, el('div', {}, el('h2', {}, 'Automatic snapshots'), el('p', {}, 'A snapshot is saved before every content change (last 30 kept).'))),
        table),
      el('div', { class: 'card' },
        el('div', { class: 'card__head' }, el('div', {}, el('h2', {}, 'Reset to demo content'), el('p', {}, 'Replace all pages and settings with the original demo content. A snapshot is taken first.'))),
        el('button', { class: 'btn btn--danger', onclick: async () => {
          if (!(await confirmBox('Reset every page and setting to the original demo content?', { danger: true, okLabel: 'Reset content' }))) return;
          await api('POST', '/reset'); toast('Demo content restored'); await boot();
        } }, ui('refresh'), 'Reset content'))
    ]);
    const { backups } = await api('GET', '/backups');
    const fmtName = (n) => { const m = n.match(/db-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/); return m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`).toLocaleString() : n; };
    table.replaceChildren(...(backups.length ? backups.map(b => el('tr', {},
      el('td', {}, fmtName(b.name)), el('td', { class: 'muted' }, `${(b.size / 1024).toFixed(0)} KB`),
      el('td', {}, el('button', { class: 'btn btn--sm', onclick: async () => {
        if (!(await confirmBox(`Restore the website content from ${fmtName(b.name)}? The current version is backed up first.`, { okLabel: 'Restore' }))) return;
        try { await api('POST', '/backups/restore', { name: b.name }); toast('Snapshot restored'); await boot(); } catch (e) { toast(e.message, 'error'); }
      } }, ui('backup'), 'Restore')))) : [el('tr', {}, el('td', { class: 'muted' }, 'No snapshots yet — they appear after your first save.'))]));
  }

  // ---------- Account ----------
  function viewAccount() {
    const cur = el('input', { class: 'input', type: 'password', autocomplete: 'current-password' });
    const user = el('input', { class: 'input', value: state.user.username, autocomplete: 'username' });
    const p1 = el('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
    const p2 = el('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
    const btn = el('button', { class: 'btn btn--primary', onclick: async () => {
      if (p1.value && p1.value !== p2.value) return toast('New passwords do not match', 'error');
      btn.disabled = true;
      try {
        const r = await api('PUT', '/account', { currentPassword: cur.value, newUsername: user.value, newPassword: p1.value || undefined });
        state.user.username = r.username; toast('Account updated'); viewAccount();
      } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
    } }, ui('check'), 'Update account');
    shell('account', [el('h1', {}, 'Account')], el('div', { class: 'card', style: { maxWidth: '520px' } },
      el('div', { class: 'card__head' }, el('div', {}, el('h2', {}, 'Login details'), el('p', {}, 'Changing your password signs out every other session.'))),
      el('div', { class: 'field' }, el('label', {}, 'Username'), user),
      el('div', { class: 'field' }, el('label', {}, 'New password'), p1, el('div', { class: 'help' }, 'At least 8 characters. Leave empty to keep your current password.')),
      el('div', { class: 'field' }, el('label', {}, 'Confirm new password'), p2),
      el('div', { class: 'field' }, el('label', {}, 'Current password (required)'), cur),
      btn));
  }

  boot();
})();

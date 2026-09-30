const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const db = require('./lib/db');
const auth = require('./lib/auth');
const h = require('./lib/helpers');
const { ICONS } = require('./lib/icons');
const { SECTION_TYPES, SETTINGS_SCHEMA } = require('./lib/schemas');
const { uid, defaultSettings, defaultPages, sectionSamples } = require('./lib/defaults');

const PORT = Number(process.env.PORT) || 4400;
const UPLOAD_DIR = path.join(db.DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
db.load();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  next();
});

// ---------- Static assets ----------
const staticOpts = { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0 };
app.use('/assets', express.static(path.join(__dirname, 'public'), staticOpts));
app.use('/vendor/gsap', express.static(path.join(__dirname, 'node_modules/gsap/dist'), staticOpts));
app.use('/vendor/lenis', express.static(path.join(__dirname, 'node_modules/lenis/dist'), staticOpts));
app.use('/vendor/three/build', express.static(path.join(__dirname, 'node_modules/three/build'), staticOpts));
app.use('/vendor/three/addons', express.static(path.join(__dirname, 'node_modules/three/examples/jsm'), staticOpts));
app.use('/uploads', (req, res, next) => {
  // Uploaded SVGs must never execute script if opened directly.
  res.set('Content-Security-Policy', "script-src 'none'; sandbox");
  next();
}, express.static(UPLOAD_DIR, staticOpts));

// ---------- Admin SPA ----------
app.use('/admin/assets', express.static(path.join(__dirname, 'admin'), { maxAge: 0 }));
app.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ---------- Admin API ----------
const api = express.Router();

// Mutating admin calls must carry a custom header — browsers can't add it cross-site without CORS.
api.use((req, res, next) => {
  if (req.method !== 'GET' && req.get('X-SFA-Admin') !== '1') return res.status(403).json({ error: 'Missing admin header' });
  next();
});

api.post('/login', async (req, res) => {
  const ip = req.ip;
  if (!auth.loginAllowed(ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const { username = '', password = '' } = req.body || {};
  const user = db.get().users.find(u => u.username === String(username).trim());
  const ok = user && await bcrypt.compare(String(password), user.hash);
  if (!ok) { auth.loginFailed(ip); return res.status(401).json({ error: 'Invalid username or password' }); }
  auth.loginSucceeded(ip);
  auth.issue(res, user, req);
  res.json({ ok: true, username: user.username });
});

api.post('/logout', (req, res) => { auth.clear(res); res.json({ ok: true }); });

api.use((req, res, next) => {
  const user = auth.currentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
});

api.get('/bootstrap', (req, res) => {
  const s = db.get();
  res.json({
    user: { username: req.user.username },
    sectionTypes: SECTION_TYPES,
    settingsSchema: SETTINGS_SCHEMA,
    icons: ICONS,
    settings: s.settings,
    pages: s.pages,
    samples: sectionSamples(),
    unread: s.messages.filter(m => !m.read).length
  });
});

api.put('/settings', (req, res) => {
  const incoming = req.body?.settings;
  if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error: 'Invalid settings' });
  db.update(s => { s.settings = { ...s.settings, ...incoming }; });
  res.json({ ok: true, settings: db.get().settings });
});

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(['admin', 'api', 'assets', 'vendor', 'uploads']);

function cleanPage(p, existing = {}) {
  const slug = String(p.slug ?? existing.slug ?? '').trim().toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED.has(slug)) throw new Error('Slug must be lowercase letters, numbers and dashes (and not a reserved word).');
  const sections = Array.isArray(p.sections) ? p.sections : existing.sections || [];
  return {
    id: existing.id || uid(),
    slug,
    title: String(p.title ?? existing.title ?? slug).slice(0, 200),
    seoTitle: String(p.seoTitle ?? existing.seoTitle ?? '').slice(0, 300),
    seoDescription: String(p.seoDescription ?? existing.seoDescription ?? '').slice(0, 600),
    sections: sections.filter(sec => SECTION_TYPES[sec?.type]).map(sec => ({
      id: sec.id || uid(),
      type: sec.type,
      anchor: String(sec.anchor || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60),
      visible: sec.visible !== false,
      data: sec.data && typeof sec.data === 'object' ? sec.data : {}
    }))
  };
}

api.post('/pages', (req, res) => {
  try {
    const s = db.get();
    const page = cleanPage(req.body || {});
    if (s.pages.some(p => p.slug === page.slug)) return res.status(409).json({ error: 'A page with that URL already exists' });
    db.update(st => { st.pages.push(page); });
    res.json({ ok: true, page });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

api.put('/pages/:id', (req, res) => {
  try {
    const s = db.get();
    const idx = s.pages.findIndex(p => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Page not found' });
    const existing = s.pages[idx];
    const page = cleanPage(req.body || {}, existing);
    if (existing.slug === 'home') page.slug = 'home';
    if (s.pages.some((p, i) => i !== idx && p.slug === page.slug)) return res.status(409).json({ error: 'A page with that URL already exists' });
    db.update(st => { st.pages[idx] = page; });
    res.json({ ok: true, page });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

api.delete('/pages/:id', (req, res) => {
  const page = db.get().pages.find(p => p.id === req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  if (page.slug === 'home') return res.status(400).json({ error: 'The home page cannot be deleted' });
  db.update(st => { st.pages = st.pages.filter(p => p.id !== page.id); });
  res.json({ ok: true });
});

// Render unsaved content so the editor can show a live preview.
api.post('/preview', (req, res) => {
  try {
    const s = db.get();
    const page = cleanPage(req.body?.page || {}, {});
    const settings = { ...s.settings, ...(req.body?.settings || {}) };
    renderPage(res, page, settings, { preview: true, baseHref: `${req.protocol}://${req.get('host')}/` });
  } catch (e) { res.status(400).send(`<pre>${h.esc(e.message)}</pre>`); }
});

// Messages
api.get('/messages', (req, res) => res.json({ messages: [...db.get().messages].reverse() }));
api.patch('/messages/:id', (req, res) => {
  db.update(s => {
    const m = s.messages.find(x => x.id === req.params.id);
    if (m) m.read = req.body?.read !== false;
  }, { snapshot: false });
  res.json({ ok: true });
});
api.delete('/messages/:id', (req, res) => {
  db.update(s => { s.messages = s.messages.filter(x => x.id !== req.params.id); }, { snapshot: false });
  res.json({ ok: true });
});

// Media
const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg', 'image/avif': '.avif', 'application/pdf': '.pdf' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const base = path.parse(file.originalname).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
      cb(null, `${base}-${crypto.randomBytes(3).toString('hex')}${ALLOWED[file.mimetype]}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(ALLOWED[file.mimetype] ? null : new Error('Only images (PNG, JPG, WebP, GIF, SVG, AVIF) and PDFs are allowed'), !!ALLOWED[file.mimetype])
});

api.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    res.json({ ok: true, url: `/uploads/${req.file.filename}` });
  });
});

api.get('/media', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).filter(f => !f.startsWith('.')).map(name => {
    const st = fs.statSync(path.join(UPLOAD_DIR, name));
    return { name, url: `/uploads/${name}`, size: st.size, mtime: st.mtimeMs };
  }).sort((a, b) => b.mtime - a.mtime);
  res.json({ files });
});

api.delete('/media/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// Account
api.put('/account', async (req, res) => {
  const { currentPassword = '', newUsername, newPassword } = req.body || {};
  if (!await bcrypt.compare(String(currentPassword), req.user.hash)) return res.status(400).json({ error: 'Current password is incorrect' });
  if (newPassword && String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const username = newUsername ? String(newUsername).trim() : req.user.username;
  if (!/^[\w.@-]{3,40}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–40 characters (letters, numbers, . _ - @)' });
  if (username !== req.user.username && db.get().users.some(u => u.username === username)) return res.status(409).json({ error: 'Username taken' });
  db.update(s => {
    const u = s.users.find(x => x.username === req.user.username);
    u.username = username;
    if (newPassword) u.hash = bcrypt.hashSync(String(newPassword), 10);
  }, { snapshot: false });
  const user = db.get().users.find(u => u.username === username);
  auth.issue(res, user, req);
  res.json({ ok: true, username });
});

// Backups / export / import / reset
api.get('/export', (req, res) => {
  const { settings, pages } = db.get();
  res.set('Content-Disposition', `attachment; filename="sfa-site-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), settings, pages });
});
api.post('/import', (req, res) => {
  try { db.replaceContent(req.body); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
api.get('/backups', (req, res) => res.json({ backups: db.listBackups() }));
api.post('/backups/restore', (req, res) => {
  try { db.restoreBackup(String(req.body?.name || '')); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
api.post('/reset', (req, res) => {
  db.update(s => { s.settings = defaultSettings(); s.pages = defaultPages(); });
  res.json({ ok: true });
});

app.use('/api/admin', api);

// ---------- Public API ----------
const contactHits = new Map();
app.post('/api/contact', (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot
  const now = Date.now();
  const hits = (contactHits.get(req.ip) || []).filter(t => now - t < 60 * 60 * 1000);
  if (hits.length >= 8) return res.status(429).json({ error: 'Too many messages — please try again later.' });
  const clip = (v, n) => String(v ?? '').trim().slice(0, n);
  const msg = {
    id: uid(),
    name: clip(b.name, 120),
    email: clip(b.email, 200),
    company: clip(b.company, 160),
    phone: clip(b.phone, 60),
    topic: clip(b.topic, 120),
    message: clip(b.message, 5000),
    page: clip(b.page, 200),
    createdAt: new Date().toISOString(),
    read: false
  };
  if (!msg.name || !/^\S+@\S+\.\S+$/.test(msg.email) || msg.message.length < 5) {
    return res.status(400).json({ error: 'Please add your name, a valid email and a short message.' });
  }
  hits.push(now);
  contactHits.set(req.ip, hits);
  db.update(s => { s.messages.push(msg); }, { snapshot: false });
  res.json({ ok: true });
});

// ---------- Public pages ----------
function renderPage(res, page, settings, extra = {}) {
  const s = db.get();
  res.render('page', {
    h,
    site: settings,
    page,
    pages: s.pages,
    isHome: page.slug === 'home',
    preview: false,
    ...extra
  });
}

app.get('/', (req, res) => {
  const s = db.get();
  const page = s.pages.find(p => p.slug === 'home');
  renderPage(res, page, s.settings, { preview: req.query.preview === '1' });
});

app.get('/:slug', (req, res, next) => {
  const s = db.get();
  const page = s.pages.find(p => p.slug === req.params.slug && p.slug !== 'home');
  if (!page) return next();
  renderPage(res, page, s.settings, { preview: req.query.preview === '1' });
});

app.use((req, res) => {
  const s = db.get();
  res.status(404).render('404', { h, site: s.settings, pages: s.pages, page: { title: 'Not found', slug: '404', sections: [] }, isHome: false, preview: false });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Server error' });
  res.status(500).send('Something went wrong.');
});

app.listen(PORT, () => {
  console.log(`\n  SFA Semicon website running →  http://localhost:${PORT}`);
  console.log(`  Admin panel               →  http://localhost:${PORT}/admin\n`);
});

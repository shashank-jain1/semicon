// Tiny JSON document store: the whole site lives in data/db.json.
// Writes are atomic (temp file + rename) and the last 30 versions are kept in data/backups.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { defaultSettings, defaultPages } = require('./defaults');
const migrations = require('./migrations');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

let state = null;

function ensureDirs() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function seed() {
  const username = process.env.ADMIN_USER || 'admin';
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url');
    generated = true;
  }
  const data = {
    version: 1,
    settings: defaultSettings(),
    pages: defaultPages(),
    messages: [],
    // Fresh content already includes everything the migrations would add.
    migrations: migrations.map(m => m.id),
    users: [{ username, hash: bcrypt.hashSync(password, 10), createdAt: new Date().toISOString() }]
  };
  if (generated) {
    const note = path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt');
    fs.writeFileSync(note, `Admin panel: /admin\nUsername: ${username}\nPassword: ${password}\n\nChange it in Admin → Account, then delete this file.\n`, { mode: 0o600 });
    console.log(`\n  ▸ Admin account created. Credentials saved to ${note}\n`);
  }
  return data;
}

function load() {
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // Fill in any settings keys added in newer versions.
    state.settings = { ...defaultSettings(), ...state.settings };
    state.messages ||= [];
    runMigrations();
  } else {
    state = seed();
    write();
  }
  return state;
}

// Apply one-time content updates that this copy of the site has not seen yet.
function runMigrations() {
  state.migrations ||= [];
  const pending = migrations.filter(m => !state.migrations.includes(m.id));
  if (!pending.length) return;
  backup();
  pending.forEach(m => {
    const changes = m.run(state) || [];
    state.migrations.push(m.id);
    console.log(`  ▸ Content update "${m.id}": ${changes.length ? changes.join(', ') : 'nothing to change'}`);
  });
  write();
}

function write() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  // On Windows the rename can briefly fail (EPERM/EBUSY) while antivirus or the indexer
  // holds db.json open, so retry a few times before falling back to a plain copy.
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(tmp, DB_FILE); return; }
    catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      if (attempt >= 5) { fs.copyFileSync(tmp, DB_FILE); fs.unlinkSync(tmp); return; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
    }
  }
}

function backup() {
  if (!fs.existsSync(DB_FILE)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, `db-${stamp}.json`));
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('db-')).sort();
  while (files.length > MAX_BACKUPS) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
}

// Mutate state through a callback; content edits snapshot the previous version first.
function update(fn, { snapshot = true } = {}) {
  if (snapshot) backup();
  const result = fn(state);
  write();
  return result;
}

function get() {
  return state || load();
}

function listBackups() {
  ensureDirs();
  return fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('db-')).sort().reverse()
    .map(name => ({ name, size: fs.statSync(path.join(BACKUP_DIR, name)).size }));
}

function restoreBackup(name) {
  if (!/^db-[\w-]+\.json$/.test(name)) throw new Error('Invalid backup name');
  const file = path.join(BACKUP_DIR, name);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  replaceContent(data);
}

// Replace settings + pages (never users or messages) from an export / backup.
function replaceContent(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.pages) || typeof data.settings !== 'object') {
    throw new Error('File does not look like an SFA site export');
  }
  update(s => {
    s.settings = { ...defaultSettings(), ...data.settings };
    s.pages = data.pages;
  });
}

module.exports = { DATA_DIR, load, get, update, listBackups, restoreBackup, replaceContent };

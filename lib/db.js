// Tiny JSON document store: the whole site lives in data/db.json.
// Writes are atomic (temp file + rename) and the last 30 versions are kept in data/backups.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { defaultSettings, defaultPages } = require('./defaults');

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
  } else {
    state = seed();
    write();
  }
  return state;
}

function write() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DB_FILE);
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

// Stateless admin sessions: an HMAC-signed, httpOnly cookie carrying username + expiry.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./db');

const COOKIE = 'sfa_admin';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, 'secret.key');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(file, 'utf8').trim();
}

let SECRET = null;
const secret = () => (SECRET ||= loadSecret());

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

function issue(res, user, req) {
  const token = sign({ u: user.username, v: user.hash.slice(-10), exp: Date.now() + TTL_MS });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure,
    maxAge: TTL_MS,
    path: '/'
  });
}

function clear(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

// The `v` claim ties the session to the current password hash, so changing the
// password signs out every other session.
function currentUser(req, db) {
  const p = verify(req.cookies?.[COOKIE]);
  if (!p) return null;
  const user = db.get().users.find(u => u.username === p.u);
  return user && user.hash.slice(-10) === p.v ? user : null;
}

// Simple in-memory limiter for login attempts.
const attempts = new Map();
function loginAllowed(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { n: 0, reset: now + 15 * 60 * 1000 };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + 15 * 60 * 1000; }
  attempts.set(ip, rec);
  return rec.n < 10;
}
function loginFailed(ip) { const r = attempts.get(ip); if (r) r.n++; }
function loginSucceeded(ip) { attempts.delete(ip); }

module.exports = { issue, clear, currentUser, loginAllowed, loginFailed, loginSucceeded };

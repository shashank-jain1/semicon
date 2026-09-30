// View helpers available in every template as `h`.
const { icon } = require('./icons');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

// Escape, then apply the tiny inline syntax: **bold**, *accent*, newlines.
function fmt(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<span class="grad">$1</span>')
    .replace(/\n/g, '<br>');
}

// Same as fmt but without line breaks (for one-line contexts).
const fmtInline = (s) => fmt(String(s ?? '').replace(/\n/g, ' '));

const plain = (s) => String(s ?? '').replace(/\*/g, '');

const csv = (s) => String(s ?? '').split(',').map(x => x.trim()).filter(Boolean);

// Block script-y URLs; everything else (relative, anchors, mailto, tel, http) passes.
function url(u) {
  const v = String(u ?? '').trim();
  if (!v) return '#';
  if (/^\s*(javascript|data|vbscript):/i.test(v)) return '#';
  return v;
}

const isExternal = (u) => /^https?:\/\//i.test(String(u || ''));
const pad = (n) => String(n).padStart(2, '0');
const year = (s) => String(s ?? '').replace(/\{year\}/g, new Date().getFullYear());

module.exports = { esc, fmt, fmtInline, plain, csv, url, isExternal, pad, year, icon };

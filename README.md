# SFA Semicon — website + admin CMS

An animated website for SFA Semicon's semiconductor / AI-silicon business, with a built-in
admin panel where every piece of content can be edited, reordered, hidden or added.

## Run it

```bash
npm install
npm start
```

- Website: http://localhost:4400
- Admin: http://localhost:4400/admin

On first start an admin account is created and its password is written to
`data/INITIAL_ADMIN_PASSWORD.txt`. Sign in, change the password under **Account**, then delete that file.
To choose the credentials yourself, start the very first time with `ADMIN_USER=… ADMIN_PASSWORD=… npm start`.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4400` | HTTP port |
| `HOST` | `0.0.0.0` | Interface to listen on — use `127.0.0.1` behind a reverse proxy |
| `DATA_DIR` | `./data` | Where content, uploads, backups and the session key live |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `admin` / random | First-run admin account |
| `SESSION_SECRET` | auto-generated in `data/secret.key` | Cookie signing key |
| `NODE_ENV` | — | `production` enables long static-asset caching |

## What's on the site

| Section | Editable | Built-in animation |
|---|---|---|
| Hero | all text, buttons, chip label, spec labels, badges | WebGL 3D chip, circuit board with light pulses, particles, bloom, mouse + scroll motion |
| EDA flow (code → silicon) | heading, intro, window title, 6 stages (name, tools, text, status metric) | sticky EDA workbench: typing Verilog, scrolling waveforms, self-drawing netlist, place & route, sign-off heat-map, GDSII layout |
| EDA toolkit | tool categories (icon, text, features, AI callout), button | tabbed panels with sliding highlight |
| Marquee | words, style | speed + skew react to scroll velocity |
| About | statement, body, image, key points | words light up as you scroll |
| Stats | numbers, prefixes/suffixes, labels | count-up |
| Services | cards, icons, tags, featured flag, links | bento grid, 3D tilt, cursor spotlight + gradient border |
| Chip anatomy | layer names, specs, descriptions | pinned exploded-view of a 5-layer chip |
| AI training console | text, bullet points, console log lines | typing terminal, live loss/accuracy chart, GPU meters |
| Process | steps | pinned horizontal scroll with progress rail (vertical on mobile) |
| Industries | rows, icons | hover fill + cursor-following icon bubble |
| Academy | courses, levels, topics | rotating gradient border |
| Tech stack, Testimonials, FAQ, CTA, Contact | everything | slider, accordion, drawn circuit lines, form with success state |
| Custom: Text, Image + text, Cards grid, HTML embed | everything | reveals, parallax |

Global effects: boot-up preloader, custom cursor, magnetic buttons, smooth inertia scrolling,
split-line heading reveals, scroll progress bar, hide-on-scroll header, animated mobile menu.
Preloader, cursor and smooth scrolling can be switched off in **Site settings → Effects**.
All animation respects the visitor's "reduce motion" setting.

## Admin panel

- **Pages & sections** — add pages (e.g. Careers, Products), add/reorder (drag or arrows)/hide/duplicate/delete sections, edit every field, with a live desktop/mobile preview of unsaved changes.
- **Site settings** — logo, colours (the whole site incl. the 3D chip re-themes), menu, announcement bar, contact details, socials, footer, SEO, effects.
- **Media library** — upload images/PDFs, reuse them anywhere.
- **Messages** — enquiries from the contact form.
- **Backups** — automatic snapshot before every save (last 30), restore, export/import JSON, reset to demo content.
- **Account** — change username/password.

Formatting in headings: `*word*` → gradient accent, `**word**` → bold, new line → line break.

## Project layout

```
server.js            Express server: public pages, admin API, uploads
lib/schemas.js       Section types + fields (drives both the site and the admin forms)
lib/defaults.js      Demo content used on first run / reset
lib/db.js            JSON store (data/db.json) with atomic writes + snapshots
lib/auth.js          Signed-cookie admin sessions, login rate limiting
views/               EJS templates (sections/*.ejs = one file per section type)
public/css, js       Site styles, animations (site.js) and the 3D chip (chip3d.js)
admin/               Admin single-page app (no build step)
data/                Created at runtime — content, uploads, backups (not in git)
```

### Adding a new section type

1. Add its fields to `SECTION_TYPES` in `lib/schemas.js`.
2. Create `views/sections/<type>.ejs` (the section's data is available as `s`).
3. Optionally add starter content in `sectionSamples()` in `lib/defaults.js`.

The admin form is generated automatically.

## Deploying

**Windows server (semicon.tserver.co.in, behind Caddy):** follow [deploy/windows/README.md](deploy/windows/README.md).
Build the upload zips with `python3 deploy/make-release.py --data`.

**Other hosts:**

Any Node 18+ host works (VPS, Render, Railway, a PaaS with a persistent disk, etc.).
Keep `DATA_DIR` on persistent storage and back it up — it holds all content and uploads.
Put it behind HTTPS (e.g. Nginx/Caddy reverse proxy); the admin cookie is marked `Secure`
automatically when requests arrive over HTTPS.

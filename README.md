# PoolMate — pre-launch waitlist landing page

Static landing page for **PoolMate**, a carpooling network for daily commuters
(car owners are fellow commuters, not drivers). Collects role-split waitlist
signups (Car Owner / Passenger) with route, city, and commute frequency —
launching first in **Bangalore & Hyderabad**.

**Live:** https://williamscott701.github.io/poolmate/

## Stack

Plain HTML + CSS + vanilla JS. No build step, no frameworks, no external
requests — all illustrations are hand-crafted inline SVG. Total page weight
is under 130 KB.

```
index.html        the whole page (all SVG illustrations inlined)
css/styles.css    mobile-first styles
js/config.js      ← the ONLY file to edit at launch (form endpoint)
js/main.js        form logic, validation, drafts, reveals
assets/src-svg/   standalone editable copies of the big illustrations
SETUP-FORM.md     wire the form to a Google Sheet (~5 min)
404.html          redirects lost visitors back home
```

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Before you share the link (launch checklist)

1. **Wire the form** — follow [SETUP-FORM.md](SETUP-FORM.md), paste the
   Apps Script URL into `js/config.js`. Until then, submissions show an
   error (drafts are kept in the visitor's browser, but nothing is stored).
2. Optionally set `fallbackWhatsApp` in `js/config.js` so visitors whose
   submissions fail can WhatsApp you directly.
3. **og:image (recommended before marketing pushes)** — WhatsApp/LinkedIn
   link previews don't render SVG. Export a 1200×630 PNG of the hero and add
   `<meta property="og:image" content="https://williamscott701.github.io/poolmate/assets/og.png">`.
4. Campaign links: append `?utm_source=...&utm_medium=...&utm_campaign=...`
   — the values are captured into each signup row automatically.

## Renaming the app later

Change `APP_NAME` in `js/config.js` (updates every visible mention), then
find-and-replace "PoolMate" in the spots JS doesn't reach:
`<title>`, `<meta name="description">`, the `og:` tags, and the two
`aria-label="PoolMate home"` brand links (header + footer) in `index.html` —
plus the title and heading text in `404.html`.

## Deploy

Pushed to `main` → GitHub Pages serves it. First-time setup:

```bash
git init -b main
git add -A
git commit -m "PoolMate waitlist landing page"
gh repo create poolmate --public --source=. --push
gh api -X POST repos/williamscott701/poolmate/pages \
  --input - <<< '{"source":{"branch":"main","path":"/"}}'
```

Rules to keep Pages happy: all asset URLs stay **relative** (the site lives
under the `/poolmate/` subpath) and filenames stay lowercase (Pages is
case-sensitive).

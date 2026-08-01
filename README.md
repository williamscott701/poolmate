# PoolMate — pre-launch waitlist landing page

Static landing page for **PoolMate**, a carpooling network for shared rides
(car owners are going the same way, not driving for a living). Collects
role-split waitlist signups (Car Owner / Passenger) with city, travel
frequency, and ride-with preference — the WhatsApp number is the only required field —
launching first in **Bangalore & Hyderabad**.

**Live:** https://poolmateapp.com/

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
404.html          real 404 page with a UTM-preserving link back home
sitemap.xml       absolute URLs for the three indexable pages
```

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Before you share the link (launch checklist)

1. ~~Wire the form~~ Done — the Apps Script URL is in `js/config.js`, and the
   page reads the script's JSON reply, so a broken endpoint shows the visitor
   an error instead of a false success.
2. Optionally set `fallbackWhatsApp` in `js/config.js` so visitors whose
   submissions fail can WhatsApp you directly (until then they're offered
   `contactEmail` instead).
3. ~~og:image~~ Done — `assets/og.jpg` (1200×630, 122 KB — WhatsApp won't
   fetch previews much past 300 KB) is wired into the meta tags, so
   WhatsApp/LinkedIn link previews show the branded card. `assets/`
   also carries `apple-touch-icon.png` for iOS home-screen bookmarks.
4. Campaign links: append `?utm_source=...&utm_medium=...&utm_campaign=...`
   — the values are captured into each signup row automatically (the 404
   page preserves them too).

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

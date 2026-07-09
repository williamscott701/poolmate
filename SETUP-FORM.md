# Wire the waitlist form to a Google Sheet (~5 minutes)

Signups POST to a Google Apps Script web app which appends each one as a row
in a Google Sheet you own. Free, unlimited, and you can filter/sort by
commute frequency later to see who travels often.

## One-time setup

1. **Create the Sheet**
   Go to [sheets.new](https://sheets.new) and name it e.g. `PoolMate Waitlist`.

2. **Open Apps Script**
   In the Sheet: **Extensions → Apps Script**. Delete the placeholder code and
   paste all of this:

   ```js
   const SHEET_NAME = "Waitlist";

   function doPost(e) {
     const lock = LockService.getScriptLock();
     lock.tryLock(10000);
     try {
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
       const HEADERS = [
         "timestamp", "role", "name", "whatsapp", "email",
         "city", "city_other", "route_from", "route_to",
         "frequency", "seats", "source",
         "utm_source", "utm_medium", "utm_campaign",
         "page_seconds", "submitted_at"
       ];
       if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
       const p = e.parameter;
       sheet.appendRow([
         new Date(),
         p.role || "", p.name || "",
         "'" + (p.whatsapp || ""),   // leading apostrophe keeps the number as text
         p.email || "", p.city || "", p.city_other || "",
         p.route_from || "", p.route_to || "",
         p.frequency || "", p.seats || "", p.source || "",
         p.utm_source || "", p.utm_medium || "", p.utm_campaign || "",
         p.page_seconds || "", p.submitted_at || ""
       ]);
       return ContentService
         .createTextOutput(JSON.stringify({ ok: true }))
         .setMimeType(ContentService.MimeType.JSON);
     } finally {
       lock.releaseLock();
     }
   }
   ```

3. **Deploy as a web app**
   Click **Deploy → New deployment → ⚙️ Select type → Web app**, then:
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**  ← required, otherwise browser POSTs are rejected
   Click **Deploy**, authorize when prompted, and **copy the Web app URL**
   (it ends in `/exec`).

4. **Paste the URL into the site**
   In `js/config.js`, replace `PASTE_YOUR_APPS_SCRIPT_URL_HERE` with that URL.
   Commit and push — done.

5. **Test it**
   Open the live site, submit a fake signup, and check that a row appears in
   the Sheet within a few seconds.

   The form remembers a successful submission per browser (so real visitors
   can't accidentally double-join) and will just show "You're already on
   the list!" if you try again. To re-test after fixing something, open
   DevTools → Console and run:
   ```js
   localStorage.removeItem("poolmate_waitlist_done");
   ```
   or just test in a private/incognito window each time.

## Gotchas (read before debugging)

- **Edited the script? You must re-deploy.** Apps Script keeps serving the old
  code until you do **Deploy → Manage deployments → ✏️ Edit → Version: New
  version → Deploy**. This is the #1 "it stopped working" cause.
- **The browser can't read the response.** The form POSTs with `mode: "no-cors"`
  because Apps Script doesn't send CORS headers. A resolved request is treated
  as success — so during launch week, sanity-check the Sheet daily.
- **Don't rename the input fields** in `index.html` — the `name` attributes map
  1:1 to the Sheet columns above.

## Alternatives

If you'd rather not use Apps Script, set `provider` in `js/config.js` to:

- `"web3forms"` — create a free access key at web3forms.com, set `endpoint` to
  `https://api.web3forms.com/submit`, and add the key via `extraFields`:
  ```js
  const FORM_CONFIG = {
    endpoint: "https://api.web3forms.com/submit",
    provider: "web3forms",
    extraFields: { access_key: "YOUR-ACCESS-KEY" }
  };
  ```
  Submissions arrive as emails; proper JSON success responses.
- `"formspree"` — create a form at formspree.io and set `endpoint` to its URL.
  Free tier is ~50 submissions/month.

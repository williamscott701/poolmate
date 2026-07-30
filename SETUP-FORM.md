# Wire the waitlist form to a Google Sheet (~5 minutes)

Signups POST to a Google Apps Script web app which appends each one as a row
in a Google Sheet you own. Free, unlimited, and you can filter/sort by
commute frequency later to see who travels often.

> **Already deployed the first version of this script?** The site keeps working
> as-is — nothing to do urgently. But that version writes a hard-coded list of
> columns, so the newer `ride_with` answer arrives folded into the `source`
> column instead of getting its own. Paste the script below over it (then
> **Deploy → Manage deployments → ✏️ Edit → New version → Deploy**) and
> `ride_with` gets a proper column, with existing rows left untouched.

## One-time setup

1. **Create the Sheet**
   Go to [sheets.new](https://sheets.new) and name it e.g. `PoolMate Waitlist`.

2. **Open Apps Script**
   In the Sheet: **Extensions → Apps Script**. Delete the placeholder code and
   paste all of this. It builds the header row from whatever the site sends, so
   adding or removing a form field never needs a script edit again:

   ```js
   const SHEET_NAME = "Waitlist";

   // Preferred column order for a brand-new sheet. Anything the site sends
   // that isn't listed here gets appended as a new column automatically.
   const FIELDS = [
     "role", "name", "whatsapp", "email", "city", "city_other",
     "frequency", "seats", "ride_with", "source",
     "utm_source", "utm_medium", "utm_campaign",
     "page_seconds", "submitted_at"
   ];

   function doPost(e) {
     const lock = LockService.getScriptLock();
     lock.tryLock(30000);
     try {
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
       const p = (e && e.parameter) || {};

       // Read the existing header row, or create one on a fresh sheet.
       let headers = sheet.getLastRow()
         ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String)
         : [];
       if (!headers.length) {
         headers = ["timestamp"].concat(FIELDS);
         sheet.appendRow(headers);
       }

       // A field the sheet has never seen becomes a new column on the right,
       // so a new question can never be silently dropped.
       Object.keys(p).forEach(function (key) {
         if (headers.indexOf(key) === -1 &&
             headers.length < 40 && /^[a-z0-9_]{1,40}$/.test(key)) {
           headers.push(key);
           sheet.getRange(1, headers.length).setValue(key);
         }
       });

       sheet.appendRow(headers.map(function (h) {
         if (h === "timestamp") return new Date();
         // leading apostrophe keeps the number as text, not a mangled number
         if (h === "whatsapp") return "'" + (p.whatsapp || "");
         return p[h] || "";
       }));

       return ContentService
         .createTextOutput(JSON.stringify({ ok: true }))
         .setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService
         .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
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
- **The browser reads the response.** The form does a normal CORS POST: Apps
  Script web apps deployed for "Anyone" send `Access-Control-Allow-Origin: *`
  on both the `/exec` redirect and the JSON it lands on, so the page checks
  the `{ "ok": true }` reply and shows the visitor an error when the endpoint
  is broken or the script reports failure. Two caveats: keep the deployment
  access on "Anyone" (a login redirect has no CORS header and reads as
  failure — which is the correct signal), and still sanity-check the Sheet
  during launch week.
- **Input `name` attributes are the Sheet columns.** With the script above you
  can add a question freely (it makes its own column), but renaming an existing
  field starts a *new* column and leaves the old one behind.
- **Only the WhatsApp number is required.** Every other column can legitimately
  be blank — the page exists to measure interest, so nothing else blocks a
  signup. Sort by `frequency` (blanks last) to find the frequent commuters.
- **`source` carries extras.** It reads `landing-v2`, plus `ride_with=…` until
  the script above is deployed, plus `flagged=honeypot|fast` on submissions that
  tripped a bot check. Flagged rows are still saved on purpose — a false
  positive must never cost a real signup — so filter them out rather than
  trusting they were blocked.

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

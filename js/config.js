/* ============================================================
   PoolMate — launch configuration
   This is the ONLY file you need to edit to go live.
   See SETUP-FORM.md for the 5-minute Google Sheet setup.
   ============================================================ */

const APP_NAME = "PoolMate";

const FORM_CONFIG = {
  // Google Apps Script web-app URL (see SETUP-FORM.md).
  endpoint: "https://script.google.com/macros/s/AKfycbx9opRbQqSdw1sE4NJ4YAjMoQScecEwrQejtmQ067SiKsMaL32Epgw7uXxw8nqWDM2p/exec",

  // "apps-script" | "formspree" | "web3forms"
  provider: "apps-script",

  // Optional: a WhatsApp number (with country code, digits only, e.g. "919876543210").
  // If submissions keep failing for a visitor, we offer this as a direct fallback.
  fallbackWhatsApp: "",

  // Fallback contact if submissions keep failing and no WhatsApp number is
  // set above. Also the address shown on the privacy page.
  contactEmail: "williamscott701@gmail.com",

  // Optional: extra key/value pairs sent with every submission — e.g. a
  // Web3Forms access_key (see SETUP-FORM.md). Leave empty for Apps Script.
  extraFields: null
};

// "Get the app" section. Set apkUrl to reveal it on the page — typically the
// GitHub Release asset, e.g.
// "https://github.com/williamscott701/poolmate-app/releases/latest/download/poolmate.apk".
// sha256 (optional) is shown so cautious users can verify their download.
const APP_DOWNLOAD = {
  apkUrl: "",
  sha256: ""
};

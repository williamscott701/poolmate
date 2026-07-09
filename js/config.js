/* ============================================================
   PoolMate — launch configuration
   This is the ONLY file you need to edit to go live.
   See SETUP-FORM.md for the 5-minute Google Sheet setup.
   ============================================================ */

const APP_NAME = "PoolMate";

const FORM_CONFIG = {
  // Paste your Google Apps Script web-app URL here (see SETUP-FORM.md).
  // It looks like: https://script.google.com/macros/s/AKfycb.../exec
  endpoint: "PASTE_YOUR_APPS_SCRIPT_URL_HERE",

  // "apps-script" | "formspree" | "web3forms"
  provider: "apps-script",

  // Optional: a WhatsApp number (with country code, digits only, e.g. "919876543210").
  // If submissions keep failing for a visitor, we offer this as a direct fallback.
  fallbackWhatsApp: "",

  // Optional: extra key/value pairs sent with every submission — e.g. a
  // Web3Forms access_key (see SETUP-FORM.md). Leave empty for Apps Script.
  extraFields: null
};

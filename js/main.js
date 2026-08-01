/* ============================================================
   PoolMate — page behavior
   Brand injection, scroll reveals, FAQ, and the waitlist form
   (role toggle, validation, draft persistence, submission).
   ============================================================ */

(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* config.js can fail to load (404, blocked); fall back so the page — and
     above all the form — keeps working instead of dying on a ReferenceError. */
  var APP = (typeof APP_NAME === "string" && APP_NAME) ? APP_NAME : "PoolMate";
  var CFG = (typeof FORM_CONFIG === "object" && FORM_CONFIG) ? FORM_CONFIG : {};

  /* ---------- analytics (provider optional) ---------- */
  /* Dispatches to whichever provider script is on the page; silent no-op when
     none is loaded. Must never be able to break page behavior. */
  function track(name, props) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: name, title: JSON.stringify(props || {}), event: true });
      } else if (window.plausible) {
        window.plausible(name, { props: props || {} });
      } else if (window.gtag) {
        window.gtag("event", name, props || {});
      }
    } catch (e) { /* ignore */ }
  }
  window.addEventListener("error", function (event) {
    track("js_error", {
      message: String(event.message || "").slice(0, 200),
      source: (event.filename || "") + ":" + (event.lineno || 0)
    });
  });

  var LS_PREFIX = APP.toLowerCase();
  var LS_DRAFT = LS_PREFIX + "_waitlist_draft";
  var LS_DONE = LS_PREFIX + "_waitlist_done";
  var loadedAt = Date.now();

  /* ---------- brand injection ---------- */
  $$("[data-app-name]").forEach(function (el) { el.textContent = APP; });

  /* ---------- "Get the app" reveal (driven by APP_DOWNLOAD in config.js) ---------- */
  if (typeof APP_DOWNLOAD !== "undefined" && APP_DOWNLOAD.apkUrl) {
    var appSection = $("#get-app");
    var apkBtn = $("#apkDownloadBtn");
    if (appSection && apkBtn) {
      apkBtn.href = APP_DOWNLOAD.apkUrl;
      apkBtn.addEventListener("click", function () { track("apk_download_click"); });
      if (APP_DOWNLOAD.sha256) {
        var sumEl = $("#apkChecksum");
        if (sumEl) sumEl.textContent = " SHA-256: " + APP_DOWNLOAD.sha256;
      }
      appSection.hidden = false;
    }
  }

  /* ---------- scroll reveals ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px" });
    /* reveal whatever is already on screen immediately (don't wait for the
       first observer tick), then let the observer handle the rest on scroll */
    $$(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight - 40) {
        el.classList.add("is-visible");
      } else {
        io.observe(el);
      }
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- FAQ: close others when one opens ---------- */
  var faqItems = $$(".faq-item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ---------- waitlist form ---------- */
  var form = $("#waitlistForm");
  if (!form) return;

  var submitBtn = $("#submitBtn");
  var btnLabel = $(".btn-label", submitBtn);
  var formError = $("#formError");
  var formSuccess = $("#formSuccess");
  var shareBtn = $("#shareBtn");
  var cityOtherField = $("#cityOtherField");
  var cityOtherInput = $("#f-city-other");
  var seatsGroup = $("#seatsGroup");
  var moreDetails = $("#moreDetails");
  var failCount = 0;
  var draftWasRestored = false;

  var pageUrl = location.origin + location.pathname;
  var shareText = "I just joined the " + APP + " waitlist — sharing is caring. Carpooling in Bangalore & Hyderabad. Share the ride, split fuel costs. Join me: " + pageUrl;
  if (shareBtn) {
    shareBtn.href = "https://wa.me/?text=" + encodeURIComponent(shareText);
    shareBtn.addEventListener("click", function () { track("share_whatsapp_click"); });
  }

  /* --- capture UTM params for channel attribution --- */
  try {
    var qs = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
      var input = form.elements[key];
      if (input && qs.get(key)) input.value = qs.get(key).slice(0, 80);
    });
  } catch (e) { /* older browsers: skip attribution */ }

  /* --- role handling --- */
  /* No role is pre-selected: it lives in the optional panel, so defaulting to
     "owner" would silently label every quick signup as a car owner and ruin
     the owner-vs-passenger split. Unanswered stays unanswered. */
  function currentRole() {
    var checked = form.querySelector('input[name="role"]:checked');
    return checked ? checked.value : "";
  }
  function applyRole() {
    var isOwner = currentRole() === "owner";
    form.classList.toggle("form--owner", isOwner);
    $$('input[name="seats"]', seatsGroup).forEach(function (input) {
      input.disabled = !isOwner;
    });
  }
  $$('input[name="role"]', form).forEach(function (input) {
    input.addEventListener("change", applyRole);
  });

  /* hero/header CTAs preset the role */
  $$("a[data-role]").forEach(function (link) {
    link.addEventListener("click", function () {
      var radio = form.querySelector('input[name="role"][value="' + link.dataset.role + '"]');
      if (radio && !radio.checked) {
        radio.checked = true;
        applyRole();
        saveDraft();
      }
    });
  });

  /* --- city "Other" reveal --- */
  function applyCity() {
    var checked = form.querySelector('input[name="city"]:checked');
    var isOther = !!checked && checked.value === "Other";
    cityOtherField.hidden = !isOther;
    cityOtherInput.disabled = !isOther;
    if (!isOther) setFieldError("city_other", "");
  }
  $$('input[name="city"]', form).forEach(function (input) {
    input.addEventListener("change", applyCity);
  });

  /* --- draft persistence --- */
  var DRAFT_FIELDS = ["role", "name", "whatsapp", "email", "city", "city_other", "frequency", "seats", "ride_with"];

  function saveDraft() {
    try {
      var draft = {};
      if (moreDetails.open) draft._expanded = 1;
      DRAFT_FIELDS.forEach(function (key) {
        var el = form.elements[key];
        if (!el) return;
        // RadioNodeList and single inputs both expose .value
        if (el.value) draft[key] = el.value;
      });
      localStorage.setItem(LS_DRAFT, JSON.stringify(draft));
    } catch (e) { /* storage unavailable (private mode etc.) */ }
  }

  function restoreDraft() {
    try {
      var raw = localStorage.getItem(LS_DRAFT);
      if (!raw) return;
      var draft = JSON.parse(raw);
      if (draft._expanded) moreDetails.open = true;
      DRAFT_FIELDS.forEach(function (key) {
        if (!(key in draft)) return;
        var el = form.elements[key];
        if (!el) return;
        el.value = draft[key]; // works for RadioNodeList too (checks matching radio)
      });
      draftWasRestored = true;
    } catch (e) { /* corrupt draft: ignore */ }
  }

  moreDetails.addEventListener("toggle", function () { saveDraft(); });

  var saveTimer = null;
  form.addEventListener("input", function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 400);
  });
  form.addEventListener("change", function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 100);
  });

  /* --- validation --- */
  function setFieldError(name, message) {
    var errEl = $("#err-" + name);
    var input = form.elements[name];
    var target = input && input.length && !input.tagName ? input[0] : input; // RadioNodeList -> first radio
    if (errEl) {
      errEl.textContent = message;
      errEl.hidden = !message;
    }
    if (target && target.setAttribute) {
      /* Some fields (e.g. whatsapp) already have a hint wired up via
         aria-describedby; remember it so the error id is appended to it
         rather than replacing it, and so clearing restores it. */
      if (target.dataset && !("baseDescribedby" in target.dataset)) {
        target.dataset.baseDescribedby = target.getAttribute("aria-describedby") || "";
      }
      var base = (target.dataset && target.dataset.baseDescribedby) || "";
      if (message) {
        target.setAttribute("aria-invalid", "true");
        if (errEl) target.setAttribute("aria-describedby", (base ? base + " " : "") + errEl.id);
      } else {
        target.removeAttribute("aria-invalid");
        if (base) target.setAttribute("aria-describedby", base);
        else target.removeAttribute("aria-describedby");
      }
    }
  }

  function normalizeWhatsApp(value) {
    var digits = String(value || "").replace(/[^\d]/g, "");
    if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
    if (digits.length === 11 && digits.indexOf("0") === 0) digits = digits.slice(1);
    return digits;
  }

  /* Unicode-aware name check (accented names, Indic scripts); falls back to
     ASCII-only on very old engines without \p{} regex support. */
  var NAME_RE = (function () {
    try { return new RegExp("^[\\p{L}\\p{M} .'-]+$", "u"); }
    catch (e) { return /^[a-zA-Z .'-]+$/; }
  })();

  function validate() {
    var firstInvalid = null;
    function fail(name, message, focusEl) {
      setFieldError(name, message);
      if (!firstInvalid && focusEl) firstInvalid = focusEl;
    }

    /* The WhatsApp number is the only required field — this page exists to
       gauge interest, so nothing else may block a signup. */
    var phone = normalizeWhatsApp(form.elements.whatsapp.value);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      fail("whatsapp", "Enter a valid 10-digit mobile number", form.elements.whatsapp);
    } else setFieldError("whatsapp", "");

    /* Optional fields: only reject content that is clearly malformed, never
       content that is simply absent. */
    var name = form.elements.name.value.trim();
    if (name && (name.length < 2 || name.length > 50 || !NAME_RE.test(name))) {
      fail("name", "That name doesn't look right", form.elements.name);
    } else setFieldError("name", "");

    var email = form.elements.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail("email", "That email doesn't look right", form.elements.email);
    } else setFieldError("email", "");

    if (firstInvalid) {
      /* name/email live in the collapsed panel — reveal it, or the visitor
         gets an error they cannot see or reach */
      var panel = firstInvalid.closest && firstInvalid.closest("details");
      if (panel) panel.open = true;
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      if (firstInvalid.focus) firstInvalid.focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  /* --- submission --- */
  function buildParams(flag) {
    var params = new URLSearchParams();
    params.set("role", currentRole());
    params.set("name", form.elements.name.value.trim());
    params.set("whatsapp", normalizeWhatsApp(form.elements.whatsapp.value));
    params.set("email", form.elements.email.value.trim());
    var city = form.querySelector('input[name="city"]:checked');
    params.set("city", city ? city.value : "");
    params.set("city_other", cityOtherInput.disabled ? "" : cityOtherInput.value.trim());
    var freq = form.querySelector('input[name="frequency"]:checked');
    params.set("frequency", freq ? freq.value : "");
    var seats = form.querySelector('input[name="seats"]:checked');
    params.set("seats", currentRole() === "owner" && seats ? seats.value : "");
    var rideWith = form.querySelector('input[name="ride_with"]:checked');
    params.set("ride_with", rideWith ? rideWith.value : "");

    /* The Apps Script currently deployed writes a fixed list of columns, so a
       newly added field like ride_with would be dropped on the way to the
       Sheet. Fold it — and any spam flag — into `source`, which that script
       does record, so no answer is ever lost. SETUP-FORM.md carries an updated
       script that gives every field its own column. */
    var source = form.elements.source.value;
    if (rideWith) source += "; ride_with=" + rideWith.value;
    if (flag) source += "; flagged=" + flag;
    params.set("source", source);
    params.set("utm_source", form.elements.utm_source.value);
    params.set("utm_medium", form.elements.utm_medium.value);
    params.set("utm_campaign", form.elements.utm_campaign.value);
    params.set("page_seconds", String(Math.round((Date.now() - loadedAt) / 1000)));
    params.set("submitted_at", new Date().toISOString());
    if (CFG.extraFields) {
      Object.keys(CFG.extraFields).forEach(function (key) {
        params.set(key, CFG.extraFields[key]);
      });
    }
    return params;
  }

  function send(params) {
    var endpoint = CFG.endpoint;
    if (!endpoint || endpoint.indexOf("PASTE_") === 0) {
      return Promise.reject(new Error("Form endpoint is not configured — see SETUP-FORM.md"));
    }
    /* Works for Apps Script too: web apps deployed for "Anyone" are
       CORS-readable — the POST to /exec 302-redirects to
       script.googleusercontent.com and both hops send
       Access-Control-Allow-Origin: *, so fetch follows and reads the JSON.
       A failed/revoked deployment comes back WITHOUT that header, so the
       fetch rejects and the visitor sees the error instead of a false
       success. The URLSearchParams body keeps this a "simple request" —
       do not add non-safelisted headers (e.g. Content-Type:
       application/json): that triggers a CORS preflight, and Apps Script
       never answers OPTIONS. */
    return fetch(endpoint, {
      method: "POST",
      body: params,
      headers: { Accept: "application/json" }
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || data.ok === false || data.success === false) {
          throw new Error("Submission rejected (HTTP " + res.status + ")");
        }
      });
    });
  }

  function showSuccess() {
    form.hidden = true;
    formSuccess.hidden = false;
    formSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    formSuccess.focus({ preventScroll: true });
    try {
      localStorage.removeItem(LS_DRAFT);
      localStorage.setItem(LS_DONE, "1");
    } catch (e) { /* ignore */ }
  }

  function showFailure() {
    failCount += 1;
    formError.hidden = false;
    /* After a second failure, offer a human escalation path: WhatsApp when a
       number is configured, otherwise email. */
    if (failCount >= 2) {
      var contact = "";
      if (CFG.fallbackWhatsApp) {
        var link = "https://wa.me/" + CFG.fallbackWhatsApp +
          "?text=" + encodeURIComponent("Hi! I want to join the " + APP + " waitlist.");
        contact = '<a href="' + link + '" target="_blank" rel="noopener">WhatsApp us your details directly</a>';
      } else if (CFG.contactEmail) {
        contact = '<a href="mailto:' + CFG.contactEmail +
          "?subject=" + encodeURIComponent(APP + " waitlist signup") + '">email us your WhatsApp number</a>';
      }
      if (contact) {
        formError.querySelector("p").innerHTML = "Still not going through. You can also " + contact + ".";
      }
    }
    formError.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (form.dataset.submitting) return;

    if (!validate()) return;

    /* Spam signals are recorded, never used to block. The form is down to one
       required field, so a real visitor can genuinely submit within a second,
       and an autofilled honeypot must never cost us a signup. Flagged rows are
       tagged in `source` so they can be filtered out in the Sheet instead. */
    var flag = form.elements.hp_note.value ? "honeypot"
      : (!draftWasRestored && (Date.now() - loadedAt) < 1200) ? "fast"
      : "";

    form.dataset.submitting = "1";
    submitBtn.disabled = true;
    btnLabel.textContent = "Joining…";
    formError.hidden = true;
    track("waitlist_submit_attempt", { role: currentRole() || "unset", flagged: flag || "none" });

    /* Promise.resolve().then(...) ensures a synchronous throw inside
       buildParams()/send() (e.g. no URLSearchParams/fetch support) becomes
       a rejection instead of an uncaught exception that would skip .catch()
       and leave the button permanently stuck on "Joining…". */
    Promise.resolve()
      .then(function () { return send(buildParams(flag)); })
      .then(function () {
        track("waitlist_submit_success", { role: currentRole() || "unset" });
        showSuccess();
      })
      .catch(function (err) {
        if (window.console && console.warn) console.warn("Waitlist submit failed:", err);
        track("waitlist_submit_failure", {
          error: String((err && err.message) || err).slice(0, 200),
          attempt: failCount + 1
        });
        showFailure();
      })
      .then(function () {
        delete form.dataset.submitting;
        submitBtn.disabled = false;
        btnLabel.textContent = "Join the waitlist →";
      });
  });

  /* --- initial state --- */
  var alreadyDone = false;
  try { alreadyDone = localStorage.getItem(LS_DONE) === "1"; } catch (e) { /* ignore */ }

  if (alreadyDone) {
    form.hidden = true;
    formSuccess.hidden = false;
    var heading = formSuccess.querySelector("h3");
    if (heading) heading.textContent = "You're already on the list!";
    track("waitlist_already_done");
  } else {
    restoreDraft();
  }
  applyRole();
  applyCity();
})();

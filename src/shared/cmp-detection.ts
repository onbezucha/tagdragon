// ─── CMP DETECTION SCRIPTS ────────────────────────────────────────────────────
// These strings are evaluated in the inspected page's main world via
// chrome.devtools.inspectedWindow.eval() — they cannot use imports or TypeScript.

export const GET_CONSENT_DATA_SCRIPT = `
(function() {
  var win = window;

  function detectCMP() {
    var hasTCF = typeof win.__tcfapi === 'function';

    if (win.OneTrust || win.Optanon || document.querySelector('[id*="onetrust"]') || document.querySelector('[class*="onetrust"]')) {
      return { name: 'OneTrust', type: 'onetrust', isActive: !!(win.OneTrust || win.Optanon), hasTCF: hasTCF };
    }
    if (win.UC_UI || win.usercentrics || document.querySelector('[data-testid="uc-"]') || document.querySelector('#usercentrics-root')) {
      return { name: 'UserCentrics', type: 'usercentrics', isActive: !!(win.UC_UI || win.usercentrics), hasTCF: hasTCF };
    }
    if (win.Cookiebot || document.querySelector('#CybotCookiebotDialog')) {
      return { name: 'Cookiebot', type: 'cookiebot', isActive: !!win.Cookiebot, hasTCF: hasTCF };
    }
    if (win.ckyApi || document.querySelector('.cky-consent-container')) {
      return { name: 'CookieYes', type: 'cookieyes', isActive: !!win.ckyApi, hasTCF: hasTCF };
    }
    if (win.Didomi || document.querySelector('#didomi-host')) {
      return { name: 'Didomi', type: 'didomi', isActive: !!win.Didomi, hasTCF: hasTCF };
    }
    if (win._iub || document.querySelector('#iubenda-cs-banner')) {
      return { name: 'iubenda', type: 'iubenda', isActive: !!win._iub, hasTCF: hasTCF };
    }
    if (hasTCF) {
      return { name: 'TCF CMP', type: 'tcf', isActive: true, hasTCF: true };
    }
    return null;
  }

  // Pomocné pro parsování cookie hodnot
  function parseCookieMap() {
    var map = {};
    document.cookie.split(';').forEach(function(c) {
      var t = c.trim();
      var sep = t.indexOf('=');
      if (sep > 0) map[t.substring(0, sep)] = t.substring(sep + 1);
    });
    return map;
  }

  function readConsentCategories() {
    var categories = [];

    // ── OneTrust ─────────────────────────────────────────────────────────────
    // Priorita: 1) window.OnetrustActiveGroups (live stav, sync update po AllowAll/RejectAll)
    //           2) OneTrust.GetDomainData().Groups (definice skupin)
    //           3) OptanonConsent cookie (fallback)
    if (win.OneTrust || win.Optanon) {
      try {
        var stdOTGroups = [
          { id: 'C0001', type: 'necessary',   label: 'Nezbytné',    desc: 'Nezbytné pro fungování stránky',  ro: true  },
          { id: 'C0002', type: 'performance', label: 'Výkonnostní', desc: 'Statistiky návštěvnosti a výkon', ro: false },
          { id: 'C0003', type: 'functional',  label: 'Funkční',     desc: 'Pamatuje si vaše preference',     ro: false },
          { id: 'C0004', type: 'marketing',   label: 'Marketing',   desc: 'Cílená reklama a personalizace',  ro: false },
        ];
        var otCatMap = { C0001: 'necessary', C0002: 'performance', C0003: 'functional', C0004: 'marketing' };

        // 1) window.OnetrustActiveGroups — okamžitě reflektuje změnu po AllowAll/RejectAll
        //    Formát: ",C0001,C0002,C0003,C0004," nebo ",C0001,"
        var activeStr = (win.OnetrustActiveGroups || '').replace(/\s/g, '');
        var isOTActive = function(id) {
          return activeStr.indexOf(',' + id + ',') !== -1 ||
                 activeStr.indexOf(id + ',') === 0;
        };

        // 2) Pokus o získání názvů/popisů skupin z API
        var apiGroups = null;
        try {
          if (typeof win.OneTrust.GetDomainData === 'function') {
            var dd = win.OneTrust.GetDomainData();
            if (dd && dd.Groups && dd.Groups.length) apiGroups = dd.Groups;
          }
        } catch(e2) {}

        if (apiGroups) {
          // Máme definice skupin z API — kombinujeme s live stavem z OnetrustActiveGroups
          apiGroups.forEach(function(g) {
            var id = g.CustomGroupId;
            var type = otCatMap[id] || 'functional';
            var isAlways = g.Status === 'always';
            var granted = isAlways;
            if (!isAlways) {
              granted = activeStr
                ? isOTActive(id)
                : g.IsConsentOptIn === true; // fallback z API dat
            }
            categories.push({
              type: type,
              label: g.GroupName || id,
              description: g.GroupDescription || '',
              granted: granted,
              readonly: isAlways,
            });
          });
        } else if (activeStr) {
          // Nemáme definice skupin — použijeme standardní C0001–C0004 s live stavem
          stdOTGroups.forEach(function(g) {
            categories.push({
              type: g.type, label: g.label, description: g.desc,
              granted: g.ro || isOTActive(g.id),
              readonly: g.ro,
            });
          });
        } else {
          // Fallback: parsování OptanonConsent cookie
          try {
            var cookieMap = parseCookieMap();
            var raw = cookieMap['OptanonConsent'];
            if (raw) {
              var value = decodeURIComponent(raw);
              var params = {};
              value.split('&').forEach(function(p) {
                var idx = p.indexOf('=');
                if (idx > 0) params[p.substring(0, idx)] = p.substring(idx + 1);
              });
              var groups = params['groups'] || '';
              try { groups = decodeURIComponent(groups); } catch(e3) {}
              groups.split(',').forEach(function(g) {
                var parts = g.split(':');
                var id = (parts[0] || '').trim();
                var type = otCatMap[id];
                if (type) {
                  var found = stdOTGroups.filter(function(x) { return x.id === id; })[0];
                  categories.push({
                    type: type,
                    label: found ? found.label : id,
                    description: found ? found.desc : '',
                    granted: parts[1] === '1',
                    readonly: id === 'C0001',
                  });
                }
              });
            }
          } catch(e4) {}
        }
      } catch(e) {}
    }

    // ── UserCentrics ──────────────────────────────────────────────────────────
    // Priorita: 1) localStorage (UC ukládá consent tam, ne do cookies)
    //           2) window.UC_UI synchronní API (UC v3)
    if (categories.length === 0) {
      var ucTypeMap = { essential: 'necessary', functional: 'functional', marketing: 'marketing', analytics: 'performance', statistics: 'performance' };
      var ucLabelMap = { necessary: 'Nezbytné', functional: 'Funkční', marketing: 'Marketing', performance: 'Výkonnostní' };

      // 1) localStorage
      try {
        var ucKeys = ['uc_user_preference', 'ucData', 'uc_settings', 'uc_user_interaction'];
        for (var ki = 0; ki < ucKeys.length; ki++) {
          var ucRaw = localStorage.getItem(ucKeys[ki]);
          if (!ucRaw) continue;
          var ucObj = JSON.parse(ucRaw);
          var ucCats = ucObj.categories || (ucObj.consent && ucObj.consent.categories) || ucObj.services;
          if (ucCats && ucCats.length) {
            ucCats.forEach(function(cat) {
              var id = (cat.id || cat.slug || cat.categorySlug || '').toLowerCase();
              var type = ucTypeMap[id] || 'functional';
              categories.push({
                type: type,
                label: cat.label || cat.name || ucLabelMap[type] || id,
                description: cat.description || '',
                granted: !!(cat.consent || cat.consented || cat.status === 'all' || cat.value === true),
                readonly: id === 'essential',
              });
            });
            if (categories.length > 0) break;
          }
        }
      } catch(e) {}

      // 2) UC_UI synchronní API (v3)
      if (categories.length === 0 && win.UC_UI) {
        try {
          if (typeof win.UC_UI.getConsents === 'function') {
            var ucConsents = win.UC_UI.getConsents();
            if (ucConsents) {
              Object.keys(ucConsents).forEach(function(key) {
                var type = ucTypeMap[key.toLowerCase()] || 'functional';
                categories.push({
                  type: type,
                  label: ucLabelMap[type] || key,
                  description: '',
                  granted: !!ucConsents[key],
                  readonly: key.toLowerCase() === 'essential',
                });
              });
            }
          }
        } catch(e) {}
      }
    }

    // ── CookieYes ─────────────────────────────────────────────────────────────
    if (categories.length === 0) {
      try {
        var ckMap = parseCookieMap();
        var cyVal = ckMap['cookieyes-consent'] ? decodeURIComponent(ckMap['cookieyes-consent']) : '';
        if (cyVal) {
          var cyTypes = {
            necessary:     { type: 'necessary',   label: 'Nezbytné',  desc: 'Nezbytné pro fungování stránky', ro: true  },
            functional:    { type: 'functional',  label: 'Funkční',   desc: 'Pamatuje si vaše preference',    ro: false },
            analytics:     { type: 'performance', label: 'Analytics', desc: 'Statistiky návštěvnosti',        ro: false },
            advertisement: { type: 'marketing',   label: 'Marketing', desc: 'Cílená reklama',                 ro: false },
          };
          cyVal.split('|').forEach(function(part) {
            var kv = part.split(':');
            var m = cyTypes[kv[0]];
            if (m) categories.push({ type: m.type, label: m.label, description: m.desc, granted: kv[1] === 'yes', readonly: m.ro });
          });
        }
      } catch(e) {}
    }

    // ── Cookiebot ─────────────────────────────────────────────────────────────
    if (categories.length === 0) {
      try {
        var cbMap2 = parseCookieMap();
        var cbRaw = cbMap2['CookieConsent'];
        if (cbRaw) {
          var cbVal = decodeURIComponent(cbRaw);
          var cbParsed = {};
          cbVal.replace(/([a-zA-Z]+):([^,}]+)/g, function(_, key, val) {
            cbParsed[key.trim()] = val.trim().replace(/^['"]|['"]$/g, '');
            return _;
          });
          var cbDefs = [
            { key: 'necessary',   type: 'necessary',   label: 'Nezbytné',   desc: 'Nezbytné pro fungování stránky', ro: true  },
            { key: 'statistics',  type: 'performance', label: 'Statistiky', desc: 'Statistiky návštěvnosti',        ro: false },
            { key: 'preferences', type: 'functional',  label: 'Preference', desc: 'Pamatuje si vaše preference',    ro: false },
            { key: 'marketing',   type: 'marketing',   label: 'Marketing',  desc: 'Cílená reklama',                 ro: false },
          ];
          var hasCB = false;
          cbDefs.forEach(function(m) {
            if (cbParsed[m.key] !== undefined) {
              categories.push({ type: m.type, label: m.label, description: m.desc, granted: cbParsed[m.key] === 'true', readonly: m.ro });
              hasCB = true;
            }
          });
          if (!hasCB) categories = [];
        }
      } catch(e) {}
    }

    return categories;
  }

  function readGoogleConsentMode() {
    var gtd = win.google_tag_data;
    if (!gtd || !gtd.ics || !gtd.ics.entries) return null;
    var e = gtd.ics.entries;
    var g = function(key) { return (e[key] && e[key].update === 'granted') ? 'granted' : 'denied'; };
    return {
      ad_storage:         g('ad_storage'),
      analytics_storage:  g('analytics_storage'),
      ad_user_data:       g('ad_user_data'),
      ad_personalization: g('ad_personalization'),
    };
  }

  function readTCFString() {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i].trim();
      if (c.indexOf('euconsent-v2=') === 0) {
        return c.substring('euconsent-v2='.length);
      }
    }
    return null;
  }

  var cmp = detectCMP();
  var categories = readConsentCategories();
  var googleConsentMode = readGoogleConsentMode();
  var tcString = readTCFString();

  return JSON.stringify({
    cmp: cmp,
    categories: categories,
    googleConsentMode: googleConsentMode,
    tcf: tcString ? { tcString: tcString, purposesConsent: [], vendorConsents: [] } : null,
    timestamp: new Date().toISOString(),
    source: cmp ? 'api' : 'cookie',
  });
})()
`;

export const ACCEPT_ALL_SCRIPT = `
(function() {
  var win = window;
  // OneTrust — různé verze mají různé názvy metod
  if (win.OneTrust) {
    if (typeof win.OneTrust.AllowAll === 'function') { win.OneTrust.AllowAll(); return 'onetrust:AllowAll'; }
    if (typeof win.OneTrust.acceptAllCookies === 'function') { win.OneTrust.acceptAllCookies(); return 'onetrust:acceptAllCookies'; }
  }
  if (win.Optanon) {
    if (typeof win.Optanon.AllowAll === 'function') { win.Optanon.AllowAll(); return 'optanon:AllowAll'; }
  }
  // UserCentrics
  if (win.UC_UI) {
    if (typeof win.UC_UI.acceptAll === 'function') { win.UC_UI.acceptAll(); return 'uc:acceptAll'; }
    if (typeof win.UC_UI.acceptAllConsents === 'function') { win.UC_UI.acceptAllConsents(); return 'uc:acceptAllConsents'; }
  }
  if (win.Cookiebot && typeof win.Cookiebot.submitConsent === 'function') { win.Cookiebot.submitConsent(); return 'cookiebot:submitConsent'; }
  if (win.ckyApi && typeof win.ckyApi.acceptAll === 'function') { win.ckyApi.acceptAll(); return 'cky:acceptAll'; }
  if (win.Didomi && typeof win.Didomi.setUserAgreeToAll === 'function') { win.Didomi.setUserAgreeToAll(); return 'didomi:agreeToAll'; }
  return false;
})()
`;

export const REJECT_ALL_SCRIPT = `
(function() {
  var win = window;
  // OneTrust — různé verze mají různé názvy metod
  if (win.OneTrust) {
    if (typeof win.OneTrust.RejectAll === 'function') { win.OneTrust.RejectAll(); return 'onetrust:RejectAll'; }
    if (typeof win.OneTrust.rejectAllCookies === 'function') { win.OneTrust.rejectAllCookies(); return 'onetrust:rejectAllCookies'; }
  }
  if (win.Optanon) {
    if (typeof win.Optanon.RejectAll === 'function') { win.Optanon.RejectAll(); return 'optanon:RejectAll'; }
  }
  // UserCentrics
  if (win.UC_UI) {
    if (typeof win.UC_UI.rejectAll === 'function') { win.UC_UI.rejectAll(); return 'uc:rejectAll'; }
    if (typeof win.UC_UI.denyAllConsents === 'function') { win.UC_UI.denyAllConsents(); return 'uc:denyAllConsents'; }
  }
  if (win.Cookiebot && typeof win.Cookiebot.withdrawConsent === 'function') { win.Cookiebot.withdrawConsent(); return 'cookiebot:withdrawConsent'; }
  if (win.ckyApi && typeof win.ckyApi.rejectAll === 'function') { win.ckyApi.rejectAll(); return 'cky:rejectAll'; }
  if (win.Didomi && typeof win.Didomi.setUserDisagreeToAll === 'function') { win.Didomi.setUserDisagreeToAll(); return 'didomi:disagreeToAll'; }
  return false;
})()
`;

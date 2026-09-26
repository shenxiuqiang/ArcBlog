/* Console hash router (arc-contracts §21.14)
 *
 * The management console is one AUP page (`?page=console`) whose sections are the
 * panels of a `view mode=tabs` node (`console-sections`). The runtime switches
 * those panels client-side with no server round-trip, but its tab bar is generated
 * markup and cannot read the URL. This invisible same-origin frame (in the app
 * wrapper, next to the theme bridge) supplies the missing half:
 *
 *   #<section>          → activate the matching panel (deep link)
 *   sidebar item click  → intercepted, URL updated, panel switched in place
 *   reload / shared link → the section is restored from the URL
 *   ?page=<old name>    → legacy link, migrated to ?page=console#<section>
 *   /manage/seo         → bound pretty URL, migrated the same way
 *
 * Two platform facts shape the implementation (both measured):
 *   1. Assigning `location.hash` fires `hashchange`, and the runtime answers a
 *      hash change by re-rendering the whole page subtree — so the bridge routes
 *      with `history.pushState`, which updates the URL without touching the tree.
 *   2. The runtime normalises the URL on load (it adds `?locale=…`), which drops a
 *      hash that arrived with a redirect — so a legacy hand-off travels through
 *      `sessionStorage` instead.
 */
(function () {
  if (window.__arcblogConsoleBridge === window) return;
  window.__arcblogConsoleBridge = window;

  var SECTIONS = [
    'dashboard', 'admin', 'pages-admin', 'compose',
    'heroes-admin', 'categories-admin', 'seo-admin', 'feeds-admin', 'appearance',
    'operations', 'hub-admin', 'media-admin', 'agent-admin',
    'policy-admin', 'access-admin',
  ];
  var DEFAULT_SECTION = 'dashboard';
  var TAB_ID_PREFIX = 'console-section-';
  var HANDOFF_KEY = 'arcblog:console:section';
  var CONSOLE_URL = '/?page=console';
  // Legacy URLs: the console used to be 15 separate `?page=<name>` pages.
  var LEGACY_PAGE = {
    dashboard: 'dashboard',
    admin: 'admin',
    'pages-admin': 'pages-admin',
    compose: 'compose',
    'heroes-admin': 'heroes-admin',
    'categories-admin': 'categories-admin',
    'seo-admin': 'seo-admin',
    'feeds-admin': 'feeds-admin',
    settings: 'appearance',
    appearance: 'appearance',
    operations: 'operations',
    'hub-admin': 'hub-admin',
    'media-admin': 'media-admin',
    'agent-admin': 'agent-admin',
    'policy-admin': 'policy-admin',
    'access-admin': 'access-admin',
  };
  // Pretty URLs bound to a section.
  var LEGACY_PATH = { '/manage/seo': 'seo-admin' };

  function hostWindow() {
    return window.parent && window.parent !== window ? window.parent : null;
  }
  function hostDocument() {
    var w = hostWindow();
    try {
      return w && w.document ? w.document : null;
    } catch (err) {
      return null;
    }
  }
  function hostLocation() {
    var w = hostWindow();
    return w ? w.location : null;
  }
  function isConsolePage() {
    var doc = hostDocument();
    return !!(doc && doc.querySelector('[data-aup-id="console-sections"]'));
  }

  function remember(section) {
    try {
      window.sessionStorage.setItem(HANDOFF_KEY, section);
    } catch (err) {
      /* storage may be unavailable; a direct hash link still works */
    }
  }
  function takeRemembered() {
    try {
      var value = window.sessionStorage.getItem(HANDOFF_KEY) || '';
      window.sessionStorage.removeItem(HANDOFF_KEY);
      return SECTIONS.indexOf(value) >= 0 ? value : '';
    } catch (err) {
      return '';
    }
  }

  function sectionFromHash() {
    var location = hostLocation();
    if (!location) return '';
    var raw = String(location.hash || '').replace(/^#/, '');
    if (!raw) return '';
    var id = raw.split(/[?&]/)[0];
    return SECTIONS.indexOf(id) >= 0 ? id : '';
  }

  function legacyTarget() {
    var location = hostLocation();
    if (!location) return '';
    var page = new URLSearchParams(location.search).get('page');
    if (page && Object.prototype.hasOwnProperty.call(LEGACY_PAGE, page)) return LEGACY_PAGE[page];
    if (Object.prototype.hasOwnProperty.call(LEGACY_PATH, location.pathname)) return LEGACY_PATH[location.pathname];
    return '';
  }

  /**
   * Switch panels by editing the tab container's DOM state directly.
   *
   * Clicking the runtime's tab button looks like the obvious way, but that click
   * makes the runtime report a `tab-change` event (an HTTP `/api/aup/event`
   * round-trip) and rewrite the sidebar/panel subtrees with the response — the
   * highlight is wiped and the console visibly flickers, which reads as a page
   * refresh (measured: nav 6 / sections 47 / frame 53 mutations per click). The
   * toggle below is the same DOM contract the runtime's own handler applies.
   * Returns false when the expected nodes are missing so callers can fall back.
   */
  function setPanelActive(section) {
    var doc = hostDocument();
    if (!doc) return false;
    var bar = doc.querySelector('[data-aup-id="console-sections"]');
    if (!bar) return false;
    var buttons = bar.querySelectorAll('.aup-tab');
    var panels = bar.querySelectorAll('.aup-tab-panel');
    if (!buttons.length || !panels.length) return false;
    var wanted = TAB_ID_PREFIX + section;
    for (var i = 0; i < buttons.length; i += 1) {
      var active = buttons[i].getAttribute('data-tab-id') === wanted;
      buttons[i].setAttribute('data-active', String(active));
      buttons[i].setAttribute('aria-selected', String(active));
    }
    for (var j = 0; j < panels.length; j += 1) {
      panels[j].setAttribute('data-active', String(j < buttons.length && buttons[j].getAttribute('data-tab-id') === wanted));
    }
    return true;
  }

  function tabButton(section) {
    var doc = hostDocument();
    return doc ? doc.querySelector('.aup-tab[data-tab-id="' + TAB_ID_PREFIX + section + '"]') : null;
  }
  function isActive(section) {
    var button = tabButton(section);
    if (button) return button.getAttribute('data-active') === 'true';
    var doc = hostDocument();
    var bar = doc ? doc.querySelector('[data-aup-id="console-sections"]') : null;
    if (!bar) return false;
    var panels = bar.querySelectorAll('.aup-tab-panel');
    var buttons = bar.querySelectorAll('.aup-tab');
    for (var i = 0; i < buttons.length; i += 1) {
      if (buttons[i].getAttribute('data-tab-id') === TAB_ID_PREFIX + section) {
        return panels[i] ? panels[i].getAttribute('data-active') === 'true' : false;
      }
    }
    return false;
  }

  /**
   * Point the URL at a section without a hash change (header note 1).
   *
   * `replaceState` only: pushing a history entry per section fights the runtime's
   * own history handling — measured, a `back()` was answered by a `popstate` that
   * put the previous hash straight back, so the stack never moved. The URL still
   * carries the section (deep-linkable, shareable, restored on reload); browser
   * back/forward simply leave the console page, which is the honest behaviour
   * while the runtime owns navigation history.
   */
  function setHash(section) {
    var location = hostLocation();
    if (!location) return;
    // Canonical form, always `/?page=console&…​#<section>`.
    //
    // Entering the console from a bound route (an article at `/posts/<slug>`, a
    // preview, a static page) makes the runtime switch the page *in place*: it
    // keeps the path and only appends `?page=console`, so the URL read
    // `/posts/hello-arcblog?page=console#dashboard` while showing the console.
    // Normalising here fixes every entry path at once, without a reload.
    var params = new URLSearchParams(location.search);
    params.delete('page');
    var extra = params.toString();
    var url = '/?page=console' + (extra ? '&' + extra : '') + '#' + section;
    if (url === location.pathname + location.search + location.hash) return;
    try {
      hostWindow().history.replaceState(null, '', url);
    } catch (err) {
      /* best-effort */
    }
  }

  function markSidebar(section) {
    var doc = hostDocument();
    if (!doc) return;
    var rows = doc.querySelectorAll('[data-aup-id^="console-nav-"]');
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var id = String(row.getAttribute('data-aup-id') || '');
      var name = id.replace('console-nav-', '');
      if (SECTIONS.indexOf(name) < 0) continue;
      if (name === section) {
        row.setAttribute('data-console-active', 'true');
        row.setAttribute('aria-current', 'page');
      } else {
        row.removeAttribute('data-console-active');
        row.removeAttribute('aria-current');
      }
    }
  }

  /** Switch to a section in place; the panel and every other node are reused. */
  function activate(section, options) {
    var opts = options || {};
    var switched = false;
    if (!isActive(section)) {
      // DOM toggle first (no runtime event, no server round-trip); clicking the
      // runtime's tab button is only the fallback when the tab structure differs.
      switched = setPanelActive(section);
      if (!switched) {
        var button = tabButton(section);
        if (button) {
          button.click();
          switched = true;
        }
      }
    }
    if (opts.updateUrl !== false) setHash(section);
    markSidebar(section);
    return switched;
  }

  function syncFromHash() {
    if (!isConsolePage()) return '';
    var section = sectionFromHash() || DEFAULT_SECTION;
    activate(section, { updateUrl: false });
    return section;
  }

  function injectConsoleStyles() {
    var doc = hostDocument();
    if (!doc || !doc.head || doc.getElementById('arcblog-console-bridge-style')) return;
    var style = doc.createElement('style');
    style.id = 'arcblog-console-bridge-style';
    style.textContent = [
      // The sidebar is the section navigation; the runtime tab bar is only the engine.
      '[data-aup-id="console-sections"] > .aup-tab-bar{display:none!important}',
      // Fill the pane so each section's own scroller owns the scrolling.
      '[data-aup-id="console-pane"]{min-height:0}',
      '[data-aup-id="console-sections"]{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}',
      '[data-aup-id="console-sections"] > .aup-tab-panel{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}',
      '[data-aup-id="console-sections"] > .aup-tab-panel[data-active="false"]{display:none!important}',
      '[data-aup-id^="console-nav-"]{cursor:pointer}',
      // Action anchors are laid out inline by the runtime (measured 91px in a
      // 258px column), so the row fill and the active background must be forced
      // to span the sidebar.
      '[data-aup-id^="console-nav-"]{align-self:stretch!important;width:auto!important;box-sizing:border-box!important}',
      // Hover first, active last: the active row is already a dark fill, and a
      // hover rule that only changed the background left it dark-on-dark
      // (measured: unreadable label while hovering the selected item).
      '[data-aup-id^="console-nav-"]:hover{background:var(--color-accent-bg)!important;color:var(--color-text)!important}',
      '[data-aup-id^="console-nav-"][data-console-active="true"],' +
      '[data-aup-id^="console-nav-"][data-console-active="true"]:hover{' +
      'background:var(--color-text)!important;color:var(--color-bg)!important}',
    ].join('');
    doc.head.appendChild(style);
  }

  function sectionOfNavRow(row) {
    if (!row || !row.getAttribute) return '';
    var id = String(row.getAttribute('data-aup-id') || '');
    if (id.indexOf('console-nav-') !== 0) return '';
    var name = id.slice('console-nav-'.length);
    return SECTIONS.indexOf(name) >= 0 ? name : '';
  }

  /** Sidebar clicks and the runtime's own top-level tab switches. */
  function watchDom() {
    var doc = hostDocument();
    var w = hostWindow();
    if (!doc || !w || w.__arcblogConsoleWatch) return;
    w.__arcblogConsoleWatch = true;
    // Window capture runs before the runtime's own document-level handlers, so
    // the sidebar click never reaches the AUP event dispatcher.
    w.addEventListener(
      'click',
      function (event) {
        // Sidebar rows are real links (`href="#section"`), but a native hash
        // navigation makes the runtime re-render the page: take over instead.
        var row = event.target;
        while (row && row.getAttribute && !row.getAttribute('data-aup-id')) row = row.parentElement;
        var fromRow = sectionOfNavRow(row);
        if (fromRow) {
          event.preventDefault();
          event.stopPropagation();
          activate(fromRow, { updateUrl: true });
          return;
        }
        // Keep the URL truthful if the runtime switches a top-level panel itself.
        var node = event.target;
        while (node && node.getAttribute) {
          if (node.classList && node.classList.contains('aup-tab')) {
            var id = String(node.getAttribute('data-tab-id') || '');
            if (id.indexOf(TAB_ID_PREFIX) === 0) {
              var section = id.slice(TAB_ID_PREFIX.length);
              markSidebar(section);
              if (sectionFromHash() !== section) setHash(section);
            }
            return;
          }
          node = node.parentElement;
        }
      },
      true,
    );
  }

  /** Legacy links: hand the section over, then land on the canonical URL. */
  function migrateLegacy() {
    var location = hostLocation();
    if (!location) return false;
    var target = legacyTarget();
    if (!target) return false;
    remember(target);
    if (isConsolePage()) {
      // A bound pretty URL (/manage/seo) already renders the console: normalise it.
      try {
        hostWindow().history.replaceState(null, '', CONSOLE_URL + '#' + target);
      } catch (err) {
        /* the activation below still applies */
      }
      return false;
    }
    location.replace(CONSOLE_URL);
    return true;
  }

  function boot() {
    if (!hostWindow()) return;
    if (migrateLegacy()) return; // a redirect is in flight
    if (!isConsolePage()) return; // public pages must never gain a hash
    injectConsoleStyles();
    watchDom();
    var initial = sectionFromHash() || takeRemembered() || DEFAULT_SECTION;
    activate(initial, { updateUrl: true });
    // Panels can render a beat late; re-assert without touching the URL.
    setTimeout(syncFromHash, 80);
    setTimeout(syncFromHash, 500);
  }

  /** Back/forward, plus any runtime re-render that reset the active panel. */
  function onHistoryChange() {
    if (!isConsolePage()) return;
    injectConsoleStyles();
    watchDom();
    syncFromHash();
    setTimeout(syncFromHash, 120);
    setTimeout(syncFromHash, 500);
  }

  var host = hostWindow();
  if (host) {
    host.addEventListener('popstate', onHistoryChange);
    host.addEventListener('hashchange', onHistoryChange);
  }
  window.addEventListener('load', boot);
  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
  else document.addEventListener('DOMContentLoaded', boot);
  setTimeout(boot, 0);
})();

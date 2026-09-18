(() => {
  if (!document.querySelector(".book-reader-boot")) return;
  if (window.__bookReaderBound) return;
  window.__bookReaderBound = true;

  const LETTER_W = 816;
  const LETTER_H = 1056;
  const TURN_MS = 880;
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const locale = (document.documentElement.lang || "en").split("-")[0] || "en";
  const typesetCache = new Map();
  const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ESCAPE[ch]);
  }

  function onSession(cb) {
    if (window.__arcSessionCtx) {
      cb(window.__arcSessionCtx);
      return;
    }
    window.__arcSessionWaiters = window.__arcSessionWaiters || [];
    window.__arcSessionWaiters.push(cb);
  }

  function isSignedIn() {
    const ctx = window.__arcSessionCtx;
    return Boolean(ctx && ctx.authenticated && ctx.did);
  }

  function readingStore(board) {
    const empty = { bookmarks: [], marks: [] };
    function key() {
      const did = window.__arcSessionCtx && window.__arcSessionCtx.did;
      return did ? `arc-reading:${did}:${board}` : "";
    }
    function read() {
      const k = key();
      if (!k) return { bookmarks: [...empty.bookmarks], marks: [...empty.marks], persist: false };
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || "null");
        if (!parsed || typeof parsed !== "object") return { ...empty, persist: true };
        return {
          bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
          marks: Array.isArray(parsed.marks) ? parsed.marks : [],
          persist: true,
        };
      } catch {
        return { ...empty, persist: true };
      }
    }
    function write(data) {
      const k = key();
      if (!k) return;
      try {
        localStorage.setItem(k, JSON.stringify({ bookmarks: data.bookmarks, marks: data.marks }));
      } catch {
        /* quota */
      }
    }
    return { read, write };
  }

  function boardId(raw) {
    const id = String(raw || "").trim();
    if (!/^[a-z0-9][a-z0-9-_/]*$/i.test(id)) return "";
    return id.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  function chaptersFromNav(doc, origin) {
    const tree = doc.querySelector(".docs-nav-tree");
    const chapters = [];
    function walk(list, part) {
      if (!list) return;
      [...list.children].forEach((li) => {
        if (!li.classList || !li.classList.contains("docs-nav-tree-item")) return;
        const link =
          li.querySelector(":scope > a.docs-nav-tree-link") ||
          li.querySelector(":scope > .docs-nav-tree-row > a.docs-nav-tree-link");
        const kids = li.querySelector(":scope > ul.docs-nav-tree-children");
        if (link && link.getAttribute("href")) {
          const href = link.getAttribute("href");
          const title = (link.textContent || "").trim();
          chapters.push({
            url: new URL(href, origin).href,
            title,
            part: part || title,
            path: href,
          });
        }
        if (kids) walk(kids, link ? (link.textContent || "").trim() : part);
      });
    }
    if (tree) walk(tree, "");
    return chapters;
  }

  async function discoverBoard(board) {
    const live = `/${locale}/docs/${board}/`;
    const origin = window.location.origin;
    const url = new URL(live, origin).href;
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Board ${board} was not found`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const title = (doc.querySelector(".docs-title")?.textContent || board).trim();
    const lead = (doc.querySelector(".docs-summary")?.textContent || "").trim();
    const kicker = (doc.querySelector(".docs-eyebrow")?.textContent || "Documentation").trim();
    const chapters = chaptersFromNav(doc, origin);
    if (!chapters.length) throw new Error(`Board ${board} has no chapters`);
    return {
      board,
      title,
      kicker,
      lead,
      live,
      chapters,
    };
  }

  function absolutizeMedia(root, base) {
    if (!root || !base) return;
    root.querySelectorAll("img[src], source[src], a[href]").forEach((node) => {
      const attr = node.hasAttribute("src") ? "src" : "href";
      const raw = node.getAttribute(attr);
      if (!raw || /^(https?:|data:|mailto:|#|\/)/i.test(raw)) return;
      try {
        node.setAttribute(attr, new URL(raw, base).href);
      } catch {
        /* keep */
      }
    });
  }

  async function loadChapter(entry) {
    const url = entry.url;
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) {
      return { ...entry, url, title: entry.path, summary: "", body: null, error: true };
    }
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const title = (doc.querySelector(".docs-title")?.textContent || entry.path).trim();
    const summary = (doc.querySelector(".docs-summary")?.textContent || "").trim();
    const content = doc.querySelector("article.docs-content") || doc.querySelector(".docs-body");
    if (content) {
      content
        .querySelectorAll("script, button, .docs-heading-actions, .docs-pager, .docs-toc")
        .forEach((n) => n.remove());
      absolutizeMedia(content, url);
    }
    return { ...entry, url, title, summary, body: content, error: false };
  }

  function frontCover(spec) {
    const el = document.createElement("div");
    el.className = "book-front";
    el.innerHTML = `<p class="book-front-kicker">${escapeHtml(spec.kicker)}</p>
      <h1>${escapeHtml(spec.title)}</h1>
      <p class="book-front-lead">${escapeHtml(spec.lead)}</p>
      <p class="book-front-foot">From the live board</p>`;
    return el;
  }

  function colophon(spec) {
    const live = spec.live;
    const el = document.createElement("div");
    el.className = "book-colophon";
    el.innerHTML = `<p>Typeset from the live ${escapeHtml(spec.title)} documentation. Search, copy, and the sidebar stay on the working pages.</p>
      <p><a href="${escapeHtml(live)}">Open the ${escapeHtml(spec.title)} docs</a> is the source. This is a reading display of that same HTML — not a PDF, and not a second copy of the text.</p>
      <p>Print this view to get a paginated document.</p>`;
    return el;
  }

  function contentsSkeleton(chapters) {
    const el = document.createElement("div");
    el.className = "book-contents";
    const groups = [];
    chapters.forEach((ch) => {
      const last = groups[groups.length - 1];
      if (!last || last.part !== ch.part) groups.push({ part: ch.part, items: [ch] });
      else last.items.push(ch);
    });
    el.innerHTML = `<h1>Contents</h1>${groups
      .map(
        (g) => `<section>
        <h2>${escapeHtml(g.part)}</h2>
        <ol>${g.items
          .map(
            (ch) =>
              `<li data-chapter="${escapeHtml(ch.path)}"><span class="book-contents-title">${escapeHtml(ch.title)}</span><span class="book-contents-dots"></span><span class="book-contents-page"></span></li>`,
          )
          .join("")}</ol>
      </section>`,
      )
      .join("")}`;
    return el;
  }

  function chapterFlow(spec, ch, number) {
    const wrap = document.createElement("section");
    wrap.className = "book-chapter";
    wrap.setAttribute("data-chapter", ch.path);
    const open = document.createElement("header");
    open.className = "book-chapter-open";
    open.innerHTML = `<p class="book-chapter-kicker">${escapeHtml(spec.title)} · ${escapeHtml(ch.part)}</p>
      <p class="book-chapter-num">${number}</p>
      <h1>${escapeHtml(ch.title)}</h1>
      ${ch.summary ? `<p class="book-chapter-lead">${escapeHtml(ch.summary)}</p>` : ""}`;
    wrap.appendChild(open);
    if (ch.error) {
      const p = document.createElement("p");
      p.innerHTML = `This chapter did not load. <a href="${escapeHtml(ch.url)}">Open the live page</a>.`;
      wrap.appendChild(p);
      return wrap;
    }
    const source = ch.body?.querySelector(".aup-view") || ch.body;
    if (source) {
      [...source.childNodes].forEach((node) => {
        if (node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim())) {
          wrap.appendChild(node.cloneNode(true));
        }
      });
    }
    absolutizeMedia(wrap, ch.url);
    return wrap;
  }

  function makeSheet({ kind, chapter, part, body, mark }) {
    const sheet = document.createElement("article");
    sheet.className = `book-sheet book-sheet--${kind}`;
    sheet.setAttribute("data-kind", kind);
    if (chapter) sheet.setAttribute("data-chapter", chapter);
    const inner = document.createElement("div");
    inner.className = "book-sheet-inner";
    if (body) inner.appendChild(body);
    const head = document.createElement("header");
    head.className = "book-sheet-running";
    head.innerHTML = `<span class="book-sheet-running-chapter"></span><span class="book-sheet-running-part">${escapeHtml(mark)}</span>`;
    const foot = document.createElement("footer");
    foot.className = "book-sheet-folio";
    foot.innerHTML = `<span><span class="book-sheet-folio-flag" aria-hidden="true"></span><span class="book-sheet-folio-num"></span></span><span class="book-sheet-folio-mark">${escapeHtml(mark)}</span>`;
    const tab = document.createElement("span");
    tab.className = "book-sheet-tab";
    tab.textContent = (part || mark).slice(0, 12);
    tab.setAttribute("aria-hidden", "true");
    sheet.append(head, inner, foot, tab);
    return sheet;
  }

  function paginateChapter(spec, ch, number, measure) {
    const flow = chapterFlow(spec, ch, number);
    const queue = [...flow.childNodes];
    const sheets = [];

    function takeMeasure() {
      const body = document.createElement("div");
      body.className = "book-sheet-body";
      while (measure.firstChild) body.appendChild(measure.firstChild);
      return body;
    }

    function pushSheet(body) {
      const sheet = makeSheet({
        kind: sheets.length ? "body" : "chapter",
        chapter: ch.path,
        part: ch.part,
        body,
        mark: spec.title,
      });
      sheet.setAttribute("data-title", ch.title);
      sheets.push(sheet);
    }

    function overflows() {
      return measure.scrollHeight > measure.clientHeight + 1;
    }

    function addChild(container, node) {
      container.appendChild(node);
      if (!overflows()) return;
      if (container.childNodes.length > 1) {
        container.removeChild(node);
        pushSheet(takeMeasure());
        if (container !== measure) {
          const next = container.cloneNode(false);
          measure.appendChild(next);
          addChild(next, node);
          return;
        }
        addChild(measure, node);
        return;
      }
      container.removeChild(node);
      if (node.nodeType === 1 && node.childNodes.length > 1) {
        const wrap = node.cloneNode(false);
        container.appendChild(wrap);
        [...node.childNodes].forEach((kid) => addChild(wrap, kid));
        return;
      }
      container.appendChild(node);
      const body = takeMeasure();
      body.classList.add("is-overflow");
      pushSheet(body);
    }

    measure.innerHTML = "";
    queue.forEach((node) => addChild(measure, node));
    if (measure.childNodes.length) pushSheet(takeMeasure());
    if (!sheets.length) {
      const empty = document.createElement("div");
      empty.className = "book-sheet-body";
      empty.appendChild(flow);
      pushSheet(empty);
    }
    return sheets;
  }

  function numberSheets(sheets) {
    sheets.forEach((sheet, i) => {
      const n = i + 1;
      sheet.setAttribute("data-page", String(n));
      sheet.classList.toggle("is-left", n % 2 === 0);
      sheet.classList.toggle("is-right", n % 2 === 1);
      const num = sheet.querySelector(".book-sheet-folio-num");
      if (num) num.textContent = String(n);
      const running = sheet.querySelector(".book-sheet-running-chapter");
      const kind = sheet.getAttribute("data-kind");
      if (running) {
        running.textContent =
          kind === "cover" || kind === "colophon" || kind === "contents"
            ? ""
            : sheet.getAttribute("data-title") || "";
      }
      if (kind === "cover" || kind === "colophon") {
        sheet.querySelector(".book-sheet-running")?.setAttribute("hidden", "");
        sheet.querySelector(".book-sheet-tab")?.setAttribute("hidden", "");
      }
    });
  }

  function fillContents(contentsEl, sheets) {
    const first = {};
    sheets.forEach((sheet, i) => {
      const id = sheet.getAttribute("data-chapter");
      if (id && first[id] == null) first[id] = i + 1;
    });
    contentsEl.querySelectorAll("li[data-chapter]").forEach((li) => {
      const page = li.querySelector(".book-contents-page");
      const id = li.getAttribute("data-chapter");
      if (page && first[id]) page.textContent = String(first[id]);
    });
  }

  async function typeset(board) {
    const spec = await discoverBoard(board);
    const chapters = await Promise.all(spec.chapters.map((entry) => loadChapter(entry)));
    await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());

    const measureHost = document.createElement("div");
    measureHost.className = "book-sheet-measure";
    document.body.appendChild(measureHost);
    const measure = document.createElement("div");
    measure.className = "book-sheet-inner book-sheet-body";
    measureHost.appendChild(measure);

    const sheets = [];
    sheets.push(makeSheet({ kind: "cover", body: frontCover(spec), mark: spec.title }));
    sheets.push(makeSheet({ kind: "colophon", body: colophon(spec), mark: spec.title }));
    const contentsEl = contentsSkeleton(chapters);
    sheets.push(makeSheet({ kind: "contents", body: contentsEl, mark: spec.title }));
    chapters.forEach((ch, i) => {
      paginateChapter(spec, ch, i + 1, measure).forEach((sheet) => sheets.push(sheet));
    });
    measureHost.remove();
    numberSheets(sheets);
    sheets.forEach((sheet) => {
      const path = sheet.getAttribute("data-chapter");
      const ch = chapters.find((entry) => entry.path === path);
      if (ch) absolutizeMedia(sheet, ch.url);
    });
    fillContents(contentsEl, sheets);
    spec.chapters.forEach((ch) => {
      const sheet = sheets.find((s) => s.getAttribute("data-chapter") === ch.path);
      ch.page = sheet ? Number(sheet.getAttribute("data-page")) : null;
    });
    return { spec, sheets };
  }

  function bookFor(board) {
    const key = `${locale}:${board}`;
    if (!typesetCache.has(key)) typesetCache.set(key, typeset(board));
    return typesetCache.get(key);
  }

  function kindLabel(sheet) {
    if (!sheet) return "";
    const kind = sheet.getAttribute("data-kind");
    return (
      sheet.getAttribute("data-title") ||
      { cover: "Cover", colophon: "Colophon", contents: "Contents" }[kind] ||
      ""
    );
  }

  function mountFace(face, sheet) {
    face.innerHTML = "";
    if (!sheet) {
      const board = document.createElement("div");
      board.className = "book-board";
      board.setAttribute("aria-hidden", "true");
      face.appendChild(board);
      return;
    }
    face.appendChild(sheet.cloneNode(true));
  }

  function initReader(host) {
    if (host.dataset.bookReady) return;
    host.dataset.bookReady = "1";
    const params = new URLSearchParams(window.location.search);
    const board = boardId(params.get("board") || host.getAttribute("data-board") || "");
    if (!board) {
      const status = host.querySelector(".book-reader-status");
      if (status) status.textContent = "No board specified.";
      return;
    }
    const variant = host.getAttribute("data-variant") || "embed";
    const pagesProp = host.getAttribute("data-pages") || "auto";
    const pageMode = variant === "page";
    const state = {
      index: 0,
      turning: false,
      queued: 0,
      sheets: [],
      spec: null,
      bookmarks: new Set(),
      marks: [],
    };
    const store = readingStore(board);
    const backdrop = host.getAttribute("data-backdrop") || (pageMode ? "#141c1a" : "transparent");
    if (pageMode) {
      document.documentElement.style.setProperty(
        "--book-backdrop",
        backdrop === "transparent" ? "transparent" : backdrop,
      );
      document.documentElement.classList.toggle(
        "book-backdrop-transparent",
        backdrop === "transparent",
      );
    }

    function wantsSpread() {
      if (pagesProp === "1") return false;
      const wide = host.clientWidth >= 680 && window.innerWidth >= 700;
      if (pagesProp === "2") return wide;
      return wide;
    }

    function pairFor(index, spread) {
      const sheets = state.sheets;
      if (!spread) return { left: null, right: sheets[index] || null, focus: index };
      const page = index + 1;
      const leftNum = page % 2 === 0 ? page : page - 1;
      const rightNum = leftNum + 1;
      return {
        left: leftNum >= 1 ? sheets[leftNum - 1] : null,
        right: sheets[rightNum - 1] || null,
        focus: Math.max(0, leftNum - 1),
      };
    }

    function hud() {
      const label = host.querySelector(".book-hud-pos");
      if (!label || !state.sheets.length) return;
      const sheet = state.sheets[state.index];
      const title = kindLabel(sheet);
      label.textContent = `${state.index + 1} / ${state.sheets.length}${title ? ` · ${title}` : ""}`;
    }

    function pad() {
      if (!pageMode || !window.keyPad) return;
      window.keyPad.set({
        up: false,
        down: false,
        left: state.index > 0,
        right: state.index < (wantsSpread() ? lastSpreadIndex() : state.sheets.length - 1),
      });
    }

    function fit() {
      const stage = host.querySelector(".book-stage");
      const binding = host.querySelector(".book-binding");
      if (!stage || !binding) return;
      const spread = wantsSpread();
      host.classList.toggle("is-single", !spread);
      const bookW = LETTER_W * (spread ? 2 : 1);
      const bookH = LETTER_H;
      const padY = spread ? 72 : 88;
      const padX = 32;
      const scale = Math.max(
        0.18,
        Math.min((stage.clientWidth - padX) / bookW, (stage.clientHeight - padY) / bookH),
      );
      host.style.setProperty("--book-scale", String(scale));
    }

    function persist() {
      if (!isSignedIn()) return;
      store.write({ bookmarks: [...state.bookmarks], marks: state.marks });
    }

    function hint(text) {
      let node = host.querySelector(".book-hint");
      if (!node) {
        node = document.createElement("p");
        node.className = "book-hint";
        host.appendChild(node);
      }
      node.hidden = false;
      node.textContent = text;
      window.clearTimeout(hint.t);
      hint.t = window.setTimeout(() => {
        node.hidden = true;
      }, 2400);
    }

    function requireAccount() {
      if (isSignedIn()) return true;
      hint("Sign in to keep bookmarks and notes on this device for your account.");
      return false;
    }

    function applyMarks(sheet) {
      const page = Number(sheet.getAttribute("data-page"));
      const body =
        sheet.querySelector(".book-sheet-body") || sheet.querySelector(".book-sheet-inner");
      if (!body) return;
      body.querySelectorAll("mark.book-mark").forEach((mark) => {
        const text = document.createTextNode(mark.textContent);
        mark.replaceWith(text);
      });
      body.normalize();
      state.marks
        .filter((m) => m.page === page && m.quote)
        .forEach((m) => {
          const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          while (node) {
            const idx = node.textContent.indexOf(m.quote);
            if (idx >= 0) {
              const range = document.createRange();
              range.setStart(node, idx);
              range.setEnd(node, idx + m.quote.length);
              const mark = document.createElement("mark");
              mark.className = "book-mark" + (m.note ? " has-note" : "");
              mark.dataset.markId = m.id;
              try {
                range.surroundContents(mark);
              } catch {
                /* overlapping */
              }
              break;
            }
            node = walker.nextNode();
          }
        });
    }

    function decorateVisible() {
      host.querySelectorAll(".book-face-front .book-sheet[data-page]").forEach((sheet) => {
        const page = Number(sheet.getAttribute("data-page"));
        sheet.classList.toggle("is-bookmarked", state.bookmarks.has(page));
        applyMarks(sheet);
      });
      const markBtn = host.querySelector("[data-book-flag]");
      if (markBtn) markBtn.classList.toggle("is-on", state.bookmarks.has(state.index + 1));
    }

    function jumpTo(index) {
      state.index = clamp(index);
      paint(state.index);
      closeDrawer();
    }

    function closeDrawer() {
      const drawer = host.querySelector(".book-drawer");
      if (drawer) drawer.hidden = true;
    }

    function renderDrawer(tab) {
      const drawer = host.querySelector(".book-drawer");
      if (!drawer || !state.spec) return;
      drawer.hidden = false;
      drawer.dataset.tab = tab;
      drawer.querySelectorAll("[data-drawer-tab]").forEach((btn) => {
        btn.classList.toggle("is-on", btn.getAttribute("data-drawer-tab") === tab);
      });
      const pane = drawer.querySelector(".book-drawer-pane");
      if (!pane) return;
      if (tab === "toc") {
        const groups = [];
        state.spec.chapters.forEach((ch) => {
          const last = groups[groups.length - 1];
          if (!last || last.part !== ch.part) groups.push({ part: ch.part, items: [ch] });
          else last.items.push(ch);
        });
        pane.innerHTML = groups
          .map(
            (g) =>
              `<h2>${escapeHtml(g.part)}</h2><ol>${g.items
                .map(
                  (ch) =>
                    `<li><button type="button" class="book-jump" data-jump="${(ch.page || 1) - 1}">${escapeHtml(ch.title)}</button><span class="book-page-n">${ch.page || ""}</span></li>`,
                )
                .join("")}</ol>`,
          )
          .join("");
      } else {
        const bookmarks = [...state.bookmarks].sort((a, b) => a - b);
        const marks = state.marks;
        pane.innerHTML = `<h2>Pages</h2>${
          bookmarks.length
            ? `<ol>${bookmarks
                .map(
                  (n) =>
                    `<li><button type="button" class="book-jump" data-jump="${n - 1}">Page ${n}</button></li>`,
                )
                .join("")}</ol>`
            : `<p>No page marks yet.</p>`
        }<h2>Highlights</h2>${
          marks.length
            ? `<ul>${marks
                .map(
                  (m) =>
                    `<li><button type="button" class="book-jump" data-jump="${m.page - 1}">${escapeHtml(m.quote.slice(0, 48))}</button><span class="book-page-n">${m.page}</span></li>`,
                )
                .join("")}</ul>`
            : `<p>Select text on a page to mark it.</p>`
        }`;
      }
    }

    function toggleBookmark() {
      if (!requireAccount()) return;
      const page = state.index + 1;
      if (state.bookmarks.has(page)) state.bookmarks.delete(page);
      else state.bookmarks.add(page);
      persist();
      decorateVisible();
    }

    function hideSel() {
      const sel = host.querySelector(".book-sel");
      if (sel) sel.hidden = true;
    }

    function hideNote() {
      const note = host.querySelector(".book-note");
      if (note) note.hidden = true;
    }

    function showSel(x, y) {
      const sel = host.querySelector(".book-sel");
      if (!sel) return;
      sel.hidden = false;
      sel.style.left = `${Math.min(window.innerWidth - 160, Math.max(8, x))}px`;
      sel.style.top = `${Math.min(window.innerHeight - 48, Math.max(8, y))}px`;
    }

    function currentQuote() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
      const range = selection.getRangeAt(0);
      if (!host.contains(range.commonAncestorContainer)) return null;
      const sheet = range.commonAncestorContainer.parentElement?.closest?.(".book-sheet");
      if (!sheet || !host.querySelector(".book-face-front")?.contains(sheet)) return null;
      const quote = selection.toString().replace(/\s+/g, " ").trim();
      if (quote.length < 2) return null;
      return { range, quote, page: Number(sheet.getAttribute("data-page")) };
    }

    function addMark(withNote) {
      if (!requireAccount()) return;
      const found = currentQuote();
      if (!found) return;
      const id = `m${Date.now().toString(36)}`;
      state.marks.push({ id, page: found.page, quote: found.quote, note: "" });
      persist();
      window.getSelection()?.removeAllRanges();
      hideSel();
      decorateVisible();
      if (withNote) openNote(id);
    }

    function openNote(id) {
      const mark = state.marks.find((m) => m.id === id);
      const note = host.querySelector(".book-note");
      if (!mark || !note) return;
      note.hidden = false;
      note.dataset.markId = id;
      const area = note.querySelector("textarea");
      if (area) {
        area.value = mark.note || "";
        area.focus();
      }
    }

    function paint(index) {
      const spread = wantsSpread();
      const pair = pairFor(index, spread);
      mountFace(host.querySelector(".book-leaf--left .book-face-front"), pair.left);
      mountFace(host.querySelector(".book-leaf--right .book-face-front"), pair.right);
      host.querySelector(".book-leaf--left .book-face-back").innerHTML = "";
      host.querySelector(".book-leaf--right .book-face-back").innerHTML = "";
      host.querySelector(".book-page-slot--left .book-under").innerHTML = "";
      host.querySelector(".book-page-slot--right .book-under").innerHTML = "";
      host.querySelector(".book-leaf--left").classList.remove("is-turning");
      host.querySelector(".book-leaf--right").classList.remove("is-turning");
      host.querySelector(".book-leaf--left").style.transition = "none";
      host.querySelector(".book-leaf--right").style.transition = "none";
      host.querySelector(".book-leaf--left").style.transform = "";
      host.querySelector(".book-leaf--right").style.transform = "";
      hud();
      pad();
      fit();
      decorateVisible();
    }

    function lastSpreadIndex() {
      const n = state.sheets.length;
      if (n <= 1) return 0;
      const lastEvenPage = n - (n % 2);
      return lastEvenPage - 1;
    }

    function clamp(i) {
      const max = wantsSpread() ? lastSpreadIndex() : Math.max(0, state.sheets.length - 1);
      return Math.max(0, Math.min(max, i));
    }

    function nextIndex(delta) {
      if (!wantsSpread()) return clamp(state.index + delta);
      const page = state.index + 1;
      if (page <= 1 && delta < 0) return 0;
      if (page === 1 && delta > 0) return clamp(1);
      const left = page % 2 === 0 ? page : page - 1;
      return clamp(Math.max(0, left + delta * 2 - 1));
    }

    function turn(delta) {
      if (state.turning) {
        state.queued = delta;
        return;
      }
      const to = nextIndex(delta);
      if (to === state.index) return;
      if (REDUCE) {
        state.index = to;
        paint(state.index);
        return;
      }

      const spread = wantsSpread();
      const fromPair = pairFor(state.index, spread);
      const toPair = pairFor(to, spread);
      const leaf = host.querySelector(delta > 0 ? ".book-leaf--right" : ".book-leaf--left");
      const other = host.querySelector(delta > 0 ? ".book-leaf--left" : ".book-leaf--right");
      const back = leaf.querySelector(".book-face-back");
      const under = host.querySelector(
        delta > 0 ? ".book-page-slot--right .book-under" : ".book-page-slot--left .book-under",
      );
      if (delta > 0) {
        mountFace(leaf.querySelector(".book-face-front"), fromPair.right);
        mountFace(back, spread ? toPair.left : toPair.right);
        mountFace(under, spread ? toPair.right : toPair.right);
        if (spread) mountFace(other.querySelector(".book-face-front"), fromPair.left);
      } else {
        mountFace(leaf.querySelector(".book-face-front"), fromPair.left || fromPair.right);
        mountFace(back, spread ? toPair.right : toPair.right);
        mountFace(under, spread ? toPair.left : toPair.right);
        if (spread) mountFace(other.querySelector(".book-face-front"), fromPair.right);
      }

      state.turning = true;
      let finished = false;
      leaf.style.transition = "none";
      leaf.classList.remove("is-turning");
      void leaf.offsetWidth;
      leaf.style.transition = `transform ${TURN_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
      requestAnimationFrame(() => {
        leaf.classList.add("is-turning");
      });

      const done = (event) => {
        if (finished) return;
        if (event && event.propertyName && event.propertyName !== "transform") return;
        finished = true;
        leaf.removeEventListener("transitionend", done);
        state.turning = false;
        state.index = to;
        paint(state.index);
        if (state.queued) {
          const q = state.queued;
          state.queued = 0;
          turn(q);
        }
      };
      leaf.addEventListener("transitionend", done);
      window.setTimeout(done, TURN_MS + 80);
    }

    function go(delta) {
      turn(delta);
    }

    function bind(stage) {
      host.addEventListener("keydown", (event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
        if (
          event.key === "ArrowRight" ||
          event.key === "PageDown" ||
          (event.key === " " && !event.shiftKey)
        ) {
          event.preventDefault();
          go(1);
        } else if (
          event.key === "ArrowLeft" ||
          event.key === "PageUp" ||
          (event.key === " " && event.shiftKey)
        ) {
          event.preventDefault();
          go(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          state.index = 0;
          paint(0);
        } else if (event.key === "End") {
          event.preventDefault();
          state.index = clamp(state.sheets.length);
          paint(state.index);
        }
      });

      if (pageMode) {
        document.addEventListener("keydown", (event) => {
          if (host !== document.querySelector(".book-reader--page")) return;
          if (
            event.target &&
            event.target.closest &&
            event.target.closest("input, textarea, a, button") &&
            event.target !== host
          ) {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          }
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
          if (event.key === "ArrowRight" || event.key === "PageDown") {
            event.preventDefault();
            go(1);
          } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault();
            go(-1);
          }
        });
        document.addEventListener("key-pad:go", (event) => {
          const dir = event.detail && event.detail.dir;
          if (dir === "right") go(1);
          if (dir === "left") go(-1);
        });
        if (window.keyPad) pad();
        else document.addEventListener("key-pad:ready", pad, { once: true });
      }

      host.querySelector("[data-book-print]")?.addEventListener("click", () => window.print());
      host.querySelector("[data-book-prev]")?.addEventListener("click", () => go(-1));
      host.querySelector("[data-book-next]")?.addEventListener("click", () => go(1));
      host.querySelector("[data-book-toc]")?.addEventListener("click", () => renderDrawer("toc"));
      host
        .querySelector("[data-book-marks]")
        ?.addEventListener("click", () => renderDrawer("marks"));
      host.querySelector("[data-book-flag]")?.addEventListener("click", () => toggleBookmark());
      host.querySelectorAll("[data-drawer-tab]").forEach((btn) => {
        btn.addEventListener("click", () => renderDrawer(btn.getAttribute("data-drawer-tab")));
      });
      host.querySelector(".book-drawer")?.addEventListener("click", (event) => {
        const jump = event.target.closest("[data-jump]");
        if (!jump) return;
        jumpTo(Number(jump.getAttribute("data-jump")));
      });
      host.querySelector("[data-mark-quote]")?.addEventListener("click", () => addMark(false));
      host.querySelector("[data-mark-note]")?.addEventListener("click", () => addMark(true));
      host.querySelector("[data-note-save]")?.addEventListener("click", () => {
        const note = host.querySelector(".book-note");
        const id = note && note.dataset.markId;
        const mark = state.marks.find((m) => m.id === id);
        if (mark) {
          mark.note = note.querySelector("textarea")?.value || "";
          persist();
          decorateVisible();
        }
        hideNote();
      });
      host.querySelector("[data-note-cancel]")?.addEventListener("click", () => hideNote());
      document.addEventListener("selectionchange", () => {
        if (
          !host.contains(document.activeElement) &&
          !host.contains(window.getSelection()?.anchorNode)
        ) {
          hideSel();
        }
      });
      host.addEventListener("mouseup", (event) => {
        window.setTimeout(() => {
          const found = currentQuote();
          if (found) showSel(event.clientX + 8, event.clientY + 8);
          else hideSel();
        }, 0);
      });
      host.addEventListener("click", (event) => {
        const mark = event.target.closest("mark.book-mark");
        if (mark && mark.dataset.markId) {
          event.stopPropagation();
          openNote(mark.dataset.markId);
          return;
        }
        if (
          !event.target.closest(
            ".book-drawer, [data-book-toc], [data-book-marks], .book-sel, .book-note",
          )
        ) {
          closeDrawer();
          hideSel();
        }
      });
      host.addEventListener("keydown", (event) => {
        if (event.key === "t" && !event.metaKey && !event.ctrlKey) {
          const drawer = host.querySelector(".book-drawer");
          if (drawer && !drawer.hidden && drawer.dataset.tab === "toc") closeDrawer();
          else renderDrawer("toc");
        } else if (event.key === "Escape") {
          closeDrawer();
          hideSel();
          hideNote();
        }
      });
      window.addEventListener("resize", () => {
        if (wantsSpread()) state.index = state.index - (state.index % 2 === 1 ? 0 : 0);
        paint(state.index);
      });
      let touchX = null;
      stage.addEventListener(
        "touchstart",
        (event) => {
          touchX = event.changedTouches[0].clientX;
        },
        { passive: true },
      );
      stage.addEventListener(
        "touchend",
        (event) => {
          if (touchX == null) return;
          const dx = event.changedTouches[0].clientX - touchX;
          if (dx < -40) go(1);
          else if (dx > 40) go(-1);
          touchX = null;
        },
        { passive: true },
      );
      stage.addEventListener("click", (event) => {
        if (event.target.closest("a, button, mark, .book-drawer, .book-sel, .book-note")) return;
        const rect = stage.getBoundingClientRect();
        const x = event.clientX - rect.left;
        if (x > rect.width * 0.58) go(1);
        else if (x < rect.width * 0.42) go(-1);
      });
    }

    const status = host.querySelector(".book-reader-status");
    if (status) status.textContent = "Loading chapters…";

    bookFor(board)
      .then(({ spec, sheets }) => {
        state.sheets = sheets.map((sheet) => sheet.cloneNode(true));
        const live = spec.live;
        state.spec = spec;
        host.innerHTML = `<div class="book-hud">
            <span class="book-hud-actions">
              <button type="button" data-book-toc>Contents</button>
              <button type="button" data-book-marks>Marks</button>
              <a class="book-hud-live" href="${escapeHtml(live)}">Live docs</a>
            </span>
            <span class="book-hud-pos" aria-live="polite"></span>
            <span class="book-hud-actions">
              <button type="button" data-book-signin>Sign in</button>
              <button type="button" data-book-flag>Mark page</button>
              <button type="button" data-book-prev>Prev</button>
              <button type="button" data-book-next>Next</button>
              <button type="button" data-book-print>Print</button>
            </span>
          </div>
          <div class="book-drawer" hidden>
            <div class="book-drawer-tabs">
              <button type="button" data-drawer-tab="toc" class="is-on">Contents</button>
              <button type="button" data-drawer-tab="marks">Marks</button>
            </div>
            <div class="book-drawer-pane"></div>
          </div>
          <div class="book-sel" hidden>
            <button type="button" data-mark-quote>Highlight</button>
            <button type="button" data-mark-note>Note</button>
          </div>
          <div class="book-note" hidden>
            <textarea placeholder="Note for this highlight"></textarea>
            <span class="book-hud-actions">
              <button type="button" data-note-save>Save</button>
              <button type="button" data-note-cancel>Close</button>
            </span>
          </div>
          <div class="book-stack"></div>
          <div class="book-stage">
            <div class="book-binding">
              <div class="book-spread">
                <div class="book-page-slot book-page-slot--left">
                  <div class="book-under"></div>
                  <div class="book-leaf book-leaf--left">
                    <div class="book-face book-face-front"></div>
                    <div class="book-face book-face-back"></div>
                  </div>
                </div>
                <div class="book-spine" aria-hidden="true"></div>
                <div class="book-page-slot book-page-slot--right">
                  <div class="book-under"></div>
                  <div class="book-leaf book-leaf--right">
                    <div class="book-face book-face-front"></div>
                    <div class="book-face book-face-back"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
        const stack = host.querySelector(".book-stack");
        sheets.forEach((sheet) => stack.appendChild(sheet));
        bind(host.querySelector(".book-stage"));
        host.querySelector("[data-book-signin]")?.addEventListener("click", () => {
          const login = document.querySelector(
            ".aup-app-header-user-menu-login, [data-action-kind='login']",
          );
          if (login) login.click();
        });
        onSession((ctx) => {
          const sign = host.querySelector("[data-book-signin]");
          if (sign) sign.hidden = Boolean(ctx && ctx.authenticated);
          if (isSignedIn()) {
            const data = store.read();
            state.bookmarks = new Set(data.bookmarks);
            state.marks = data.marks;
          }
          decorateVisible();
        });
        paint(0);
        if (pageMode) host.focus({ preventScroll: true });
      })
      .catch(() => {
        if (status) status.textContent = "Could not typeset this board.";
      });
  }

  document.querySelectorAll(".book-reader").forEach(initReader);
})();

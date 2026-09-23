// Hero carousel init — runs inside the SSR iframe embedded by the AUP home page.
//
// Slides come from the `heroes` AFS records (the same data the Creator Studio
// manages), read through the parent document's `window.afs` — the iframe is
// same-origin, which is the pattern the theme bridge already relies on. With no
// hero records the carousel falls back to a branded slide instead of collapsing.
//
// Rendered markup follows the vendored photo-story engine's contract:
//   [data-photo-story="autoplay"] > [data-story-block="cover"][data-layout="overlay"]
//     > img + div > h1 / p.subtitle / p.author
(() => {
  const root = document.querySelector('[data-hero-carousel]');
  if (!root) return;

  const HEROES = '/instance/app/arcblog/heroes';
  const INTERVAL = 5500;

  // Locale of the host page (the iframe URL is locale-prefixed with `en`, so take
  // it from the parent to keep the copy in step with what the reader chose).
  function hostLocale() {
    try {
      const search = window.parent && window.parent !== window ? window.parent.location.search : location.search;
      const value = new URLSearchParams(search).get('locale') || '';
      if (/^zh/i.test(value)) return 'zh';
      if (/^ja/i.test(value)) return 'ja';
      return 'en';
    } catch {
      return 'en';
    }
  }

  // Mirror the host page's theme attributes so the hero's tokens (accent, type
  // colours, radius) match whatever tone/palette/mode the reader is using — the
  // SSR page ships its own defaults, which otherwise drift from the site.
  function syncHostTheme() {
    try {
      if (!window.parent || window.parent === window) return;
      const host = window.parent.document.documentElement;
      for (const attr of ['data-tone', 'data-palette', 'data-mode']) {
        const value = host.getAttribute(attr);
        if (value) document.documentElement.setAttribute(attr, value);
      }
    } catch {
      /* cross-origin host: keep the page's own defaults */
    }
  }

  const LOCALE = hostLocale();
  const COPY = {
    en: { read: 'Read the story', latest: 'Read the latest stories', kicker: 'ArcBlog' },
    zh: { read: '阅读全文', latest: '阅读最新文章', kicker: 'ArcBlog' },
    ja: { read: '記事を読む', latest: '最新の記事を読む', kicker: 'ArcBlog' },
  }[LOCALE] || { read: 'Read the story', latest: 'Read the latest stories', kicker: 'ArcBlog' };

  const escapeHtml = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));

  function safeUrl(value) {
    const url = String(value || '').trim();
    // Only same-site paths and http(s) links may become slide targets.
    if (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url)) return url;
    return '';
  }

  function decodeContent(entry) {
    const raw = entry && entry.content;
    if (raw && typeof raw === 'object') return raw;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  function coverBlock({ image, title, description, url }) {
    const target = safeUrl(url);
    const cta = target
      ? `<a class="hero-carousel__cta" href="${escapeHtml(target)}" target="_parent" rel="noopener">${escapeHtml(COPY.read)}</a>`
      : `<a class="hero-carousel__cta" href="/posts" target="_parent">${escapeHtml(COPY.latest)}</a>`;
    const media = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">`
      : '';
    // A hero without a cover image must not read as a black hole: flag it so the
    // stylesheet can lay a considered gradient behind the type instead.
    const variant = image ? '' : ' hero-carousel__slide--plain';
    return `<div data-story-block="cover" data-layout="overlay" class="${variant.trim()}">
      ${media}
      <div class="hero-carousel__body">
        <p class="author">${escapeHtml(COPY.kicker)}</p>
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p class="subtitle">${escapeHtml(description)}</p>` : ''}
        ${cta}
      </div>
    </div>`;
  }

  function defaultSlide(profile) {
    const name = (profile && profile.name) || 'ArcBlog';
    const description = (profile && profile.description) || '';
    return coverBlock({
      image: '',
      title: name,
      description,
      url: '/posts',
    });
  }

  function parentAfs() {
    try {
      if (window.parent && window.parent !== window && window.parent.afs) return window.parent.afs;
    } catch {
      /* cross-origin parent: fall through to our own runtime */
    }
    return window.afs || null;
  }

  // `tryList` answers with metadata only — the record bodies need the documented
  // `includeContent` option (measured). When a runtime ignores it, fall back to
  // reading each entry so the carousel still fills in.
  async function readRecords(path) {
    const afs = parentAfs();
    if (!afs) return [];
    const list = afs.tryList ? (p, options) => afs.tryList(p, options) : (p) => afs.list(p);
    const res = await list(path, { includeContent: true });
    const entries = (res && res.data) || (Array.isArray(res) ? res : []);
    const records = [];
    for (const entry of entries) {
      let record = decodeContent(entry);
      if (!record && entry && entry.path) {
        try {
          const single = await (afs.tryRead ? afs.tryRead(entry.path) : afs.read(entry.path));
          record = decodeContent(single) || decodeContent(single && single.data);
        } catch {
          record = null;
        }
      }
      if (record) records.push(record);
    }
    return records;
  }

  function sortHeroes(heroes) {
    return heroes
      .filter((hero) => hero && (hero.title || hero.image))
      .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
  }

  function mount(slides) {
    if (typeof window.PhotoStory !== 'function') return;
    // Honour reduced-motion: keep the slides but drop the automatic advance and
    // the Ken Burns drift, leaving the manual controls.
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.setAttribute('data-photo-story', reduced ? 'slideshow' : 'autoplay');
    root.setAttribute('data-story-theme', 'dark');
    root.setAttribute('data-story-interval', String(INTERVAL));
    // Keep the instance reachable the way the engine's own autoInit does
    // (`el._photoStory`), which also makes the carousel debuggable from outside.
    root._photoStory = new window.PhotoStory(root, {
      mode: reduced ? 'slideshow' : 'autoplay',
      theme: 'dark',
      interval: INTERVAL,
    });
    root.classList.add('hero-carousel--ready');
    document.documentElement.classList.add('hero-carousel-page');
  }

  async function start() {
    syncHostTheme();
    let heroes = [];
    try {
      heroes = sortHeroes(await readRecords(HEROES));
    } catch {
      heroes = [];
    }
    let slides = heroes.map(coverBlock).join('');
    if (!slides) {
      try {
        const profile = (await readRecords('/instance/app/arcblog/node'))[0];
        slides = defaultSlide(profile);
      } catch {
        slides = defaultSlide(null);
      }
    }
    root.innerHTML = slides;
    mount(slides);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

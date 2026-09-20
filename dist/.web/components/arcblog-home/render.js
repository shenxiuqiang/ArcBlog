export function render() {
  return {
    html: `
      <main class="ab-shell">
        <header class="ab-topbar">
          <a class="ab-brand" href="/" aria-label="ArcBlog home">
            <span class="ab-brand-mark">A</span>
            <span class="ab-brand-text">Arc<span>Blog</span></span>
          </a>

          <nav class="ab-nav" aria-label="Primary navigation">
            <a class="is-active" href="/app?page=posts">Home</a>
            <a href="/app?page=posts&category=technology">Technology</a>
            <a href="/app?page=posts&category=design">Design</a>
            <a href="/app?page=posts&category=life">Life</a>
            <a href="/app?page=about">About</a>
          </nav>

          <div class="ab-actions">
            <a class="ab-link-chip" href="/app?page=compose">Write</a>
            <a class="ab-wallet" href="/app?page=compose" aria-label="Connect wallet">
              <span class="ab-wallet-dot"></span>
              <span>Connect wallet</span>
            </a>
            <button class="ab-icon-btn mode-toggle" type="button" aria-label="Toggle dark mode" title="Toggle dark mode">◐</button>
            <a class="ab-icon-btn" href="/app?page=admin" aria-label="Open studio" title="Open studio">✦</a>
          </div>
        </header>

        <section class="ab-hero">
          <div class="ab-hero-copy">
            <p class="ab-eyebrow">Independent publishing · Wallet-native auth</p>
            <h1>Ideas with a point of view.</h1>
            <p class="ab-lede">A quieter place to publish and read — where identity is portable, authorship is verifiable, and writing stays in focus.</p>
            <div class="ab-hero-actions">
              <a class="ab-btn ab-btn-primary" href="/app?page=compose">Start writing</a>
              <a class="ab-btn ab-btn-secondary" href="/app?page=posts">Browse latest stories</a>
            </div>
          </div>
          <div class="ab-hero-panel" aria-hidden="true">
            <div class="ab-panel-top">
              <span>ArcBlog</span>
              <span>Issue 01</span>
            </div>
            <div class="ab-panel-title">The internet is becoming a place we can own again.</div>
            <div class="ab-panel-lines">
              <span></span><span></span><span></span><span></span>
            </div>
            <div class="ab-panel-foot">
              <span>DID-native</span>
              <span>Markdown-first</span>
            </div>
          </div>
        </section>

        <section class="ab-grid">
          <div class="ab-main">
            <div class="ab-section-head">
              <div>
                <p class="ab-eyebrow">Featured story</p>
                <h2>What a wallet changes about “logging in”.</h2>
              </div>
              <a class="ab-text-link" href="/app?page=reader">Read the essay <span>→</span></a>
            </div>

            <article class="ab-featured-card">
              <div class="ab-featured-media">
                <span class="ab-media-badge">8 min read</span>
              </div>
              <div class="ab-featured-body">
                <div class="ab-meta-row">
                  <span class="ab-chip">Technology</span>
                  <span class="ab-muted">Sep 18, 2026</span>
                </div>
                <h3>Identity should be portable, legible, and yours.</h3>
                <p>
                  A field guide to writing, identity, and building small corners of the web
                  that feel human again.
                </p>
                <div class="ab-byline">
                  <span class="ab-avatar">A</span>
                  <div>
                    <strong>ArcBlog Editorial</strong>
                    <small>Wallet-verified author</small>
                  </div>
                </div>
              </div>
            </article>

            <div class="ab-feed-head">
              <h2>Latest stories</h2>
              <div class="ab-feed-tabs">
                <a class="is-active" href="/app?page=posts">All</a>
                <a href="/app?page=posts&category=technology">Technology</a>
                <a href="/app?page=posts&category=design">Design</a>
                <a href="/app?page=posts&category=life">Life</a>
              </div>
            </div>

            <div class="ab-story-list">
              <article class="ab-story">
                <div class="ab-story-index">01</div>
                <div class="ab-story-content">
                  <div class="ab-meta-row">
                    <span class="ab-chip">Design</span>
                    <span class="ab-muted">6 min read</span>
                  </div>
                  <h3>Good interfaces leave room for a little silence.</h3>
                  <p>Why calm, editorial layouts are winning back our attention.</p>
                  <div class="ab-story-foot">
                    <span>Sep 17, 2026</span>
                    <span>·</span>
                    <span>Mina K.</span>
                  </div>
                </div>
              </article>

              <article class="ab-story">
                <div class="ab-story-index">02</div>
                <div class="ab-story-content">
                  <div class="ab-meta-row">
                    <span class="ab-chip">Life</span>
                    <span class="ab-muted">4 min read</span>
                  </div>
                  <h3>A slower way to keep a commonplace book.</h3>
                  <p>Notes on collecting fragments without losing the thread.</p>
                  <div class="ab-story-foot">
                    <span>Sep 14, 2026</span>
                    <span>·</span>
                    <span>Jon Bell</span>
                  </div>
                </div>
              </article>

              <article class="ab-story">
                <div class="ab-story-index">03</div>
                <div class="ab-story-content">
                  <div class="ab-meta-row">
                    <span class="ab-chip">Technology</span>
                    <span class="ab-muted">9 min read</span>
                  </div>
                  <h3>What a wallet changes about “logging in”.</h3>
                  <p>Identity should be portable, legible, and yours.</p>
                  <div class="ab-story-foot">
                    <span>Sep 11, 2026</span>
                    <span>·</span>
                    <span>ArcBlog</span>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside class="ab-aside">
            <section class="ab-card">
              <div class="ab-card-head">
                <h3>Explore topics</h3>
                <span>04</span>
              </div>
              <div class="ab-topic-list">
                <a href="/app?page=posts" class="is-active"><span>All stories</span><b>24</b></a>
                <a href="/app?page=posts&category=technology"><span>Technology</span><b>09</b></a>
                <a href="/app?page=posts&category=design"><span>Design</span><b>07</b></a>
                <a href="/app?page=posts&category=life"><span>Life</span><b>08</b></a>
              </div>
            </section>

            <section class="ab-card ab-card-quote">
              <span class="ab-quote-mark">“</span>
              <p>We’re making a small, thoughtful corner of the internet.</p>
              <a href="/app?page=about">Read the manifesto <span>↗</span></a>
            </section>

            <section class="ab-card">
              <div class="ab-card-head">
                <h3>Newsletter</h3>
                <span>Weekly</span>
              </div>
              <p class="ab-muted">One considered email with the best new stories.</p>
              <a class="ab-btn ab-btn-outline ab-full" href="/app?page=posts">Subscribe →</a>
            </section>

            <section class="ab-card">
              <div class="ab-card-head">
                <h3>Appearance</h3>
                <span>Theme</span>
              </div>
              <p class="ab-muted">Use the ◐ control in the header to switch between light and dark.</p>
              <div class="ab-mini-themes">
                <span class="is-active">Minimal</span>
                <span>Serif</span>
                <span>Mono</span>
              </div>
            </section>
          </aside>
        </section>

        <footer class="ab-footer">
          <span>© 2026 ArcBlog</span>
          <span>DID-native publishing for the curious.</span>
          <span><a href="/app?page=admin">Creator studio</a> · <a href="/app?page=about">About</a></span>
        </footer>
      </main>
    `,
  };
}

export function render() {
  return {
    html: `
      <main class="arcblog-site">
        <header class="arcblog-header">
          <a class="arcblog-brand" href="/" aria-label="ArcBlog home"><span class="brand-mark">A</span><span>Arc<span>Blog</span></span></a>
          <nav class="arcblog-primary-nav" aria-label="Primary categories">
            <a class="is-active" href="/app?page=posts">Home</a><a href="/app?page=posts&category=technology">Technology</a><a href="/app?page=posts&category=design">Design</a><a href="/app?page=posts&category=life">Life</a><a href="/app?page=about">About</a>
          </nav>
          <div class="arcblog-header-actions"><a class="arcblog-status" href="/app?page=compose"><span class="status-dot"></span><span>Connect wallet</span></a><button class="arcblog-icon-action arcblog-mode-toggle mode-toggle" type="button" aria-label="Toggle dark mode" title="Toggle dark mode">◐</button><a class="arcblog-icon-action" href="?tone=editorial" aria-label="Change theme" title="Change theme">✦</a><a class="arcblog-menu" href="/app?page=admin" aria-label="Open admin">☰</a></div>
        </header>
        <section class="arcblog-layout">
          <div class="arcblog-main-column">
            <div class="arcblog-section-heading"><div><p class="arcblog-kicker">Independent publishing · 2026</p><h1>Ideas with a point of view.</h1></div><a class="arcblog-view-all" href="/app?page=posts">View all stories <span>↗</span></a></div>
            <article class="arcblog-featured"><div class="featured-copy"><span class="article-label">Featured story · 8 min read</span><h2>The internet is becoming a place we can own again.</h2><p>A field guide to writing, identity, and building small corners of the web that feel human.</p><div class="article-byline"><span class="avatar avatar-green">A</span><span><strong>ArcBlog editorial</strong><small>September 18, 2026 · Technology</small></span></div></div><div class="featured-art" aria-hidden="true"><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span><span class="art-core">A</span><span class="art-caption">A quiet<br>revolution</span></div></article>
            <div class="arcblog-feed-heading"><h2>Latest stories</h2><div class="feed-filter"><a class="is-active" href="/app?page=posts">All</a><a href="/app?page=posts&category=technology">Technology</a><a href="/app?page=posts&category=design">Design</a></div></div>
            <div class="arcblog-story-list">
              <article class="arcblog-story"><div class="story-thumb thumb-blue"><span>01</span></div><div class="story-body"><div class="story-meta"><span>Design</span><span>6 min read</span></div><h3>Good interfaces leave room for a little silence.</h3><p>Why calm, editorial layouts are winning back our attention.</p><div class="story-footer"><span>Sep 17, 2026</span><span class="story-author">Mina K. · <span class="avatar avatar-small">M</span></span></div></div></article>
              <article class="arcblog-story"><div class="story-thumb thumb-coral"><span>02</span></div><div class="story-body"><div class="story-meta"><span>Life</span><span>4 min read</span></div><h3>A slower way to keep a commonplace book.</h3><p>Notes on collecting fragments without losing the thread.</p><div class="story-footer"><span>Sep 14, 2026</span><span class="story-author">Jon Bell · <span class="avatar avatar-small">J</span></span></div></div></article>
              <article class="arcblog-story"><div class="story-thumb thumb-lime"><span>03</span></div><div class="story-body"><div class="story-meta"><span>Technology</span><span>9 min read</span></div><h3>What a wallet changes about “logging in”.</h3><p>Identity should be portable, legible, and yours.</p><div class="story-footer"><span>Sep 11, 2026</span><span class="story-author">ArcBlog · <span class="avatar avatar-small">A</span></span></div></div></article>
            </div>
          </div>
          <aside class="arcblog-sidebar">
            <div class="sidebar-block sidebar-topics"><div class="sidebar-title"><h2>Explore</h2><span>02</span></div><a class="topic-link is-active" href="/app?page=posts"><span class="topic-icon">◌</span><span>All stories</span><b>24</b></a><a class="topic-link" href="/app?page=posts&category=technology"><span class="topic-icon">⌘</span><span>Technology</span><b>09</b></a><a class="topic-link" href="/app?page=posts&category=design"><span class="topic-icon">✳</span><span>Design</span><b>07</b></a><a class="topic-link" href="/app?page=posts&category=life"><span class="topic-icon">◒</span><span>Life</span><b>08</b></a></div>
            <div class="sidebar-block sidebar-note"><span class="note-mark">“</span><p>We’re making a small, thoughtful corner of the internet.</p><a href="/app?page=about">Our manifesto <span>↗</span></a></div>
            <div class="sidebar-block sidebar-newsletter"><p class="arcblog-kicker">The Sunday note</p><h2>Good things,<br>occasionally.</h2><p>One considered email with the best new stories.</p><a class="newsletter-link" href="/app?page=posts">Subscribe <span>→</span></a></div>
            <div class="sidebar-block sidebar-themes"><div class="sidebar-title"><h2>Appearance</h2><span>03</span></div><div class="theme-pills"><a href="?tone=default" class="theme-pill theme-default">Default</a><a href="?tone=editorial" class="theme-pill theme-editorial">Editorial</a><a href="?tone=mono" class="theme-pill theme-mono">Mono</a><a href="?tone=organic" class="theme-pill theme-organic">Organic</a></div><p>Choose a tone from Arc’s theme library. Use the ◐ control for light / dark mode.</p></div>
          </aside>
        </section>
        <footer class="arcblog-footer"><span>© 2026 ArcBlog</span><span>DID-native publishing for the curious.</span><span><a href="/app?page=admin">Creator studio</a> · <a href="/app?page=about">About</a></span></footer>
      </main>
    `,
  };
}

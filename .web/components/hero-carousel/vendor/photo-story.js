/**
 * VENDORED — DO NOT EDIT.
 *
 * Upstream: ARC web-device widget `widgets/photo-story/photo-story.js`
 *           (shipped with ARC 2.0.0-beta.50, ~/.arc/current/assets/web-device/).
 * Why vendored: the web route serves the blocklet root, so a root-relative
 * `/assets/js/...` script tag is swallowed by the AUP handler and never loads.
 * Component `script.js` is inlined into the SSR page instead, so the widget has
 * to be concatenated into it by scripts/arcblog-hero-carousel.mjs.
 * License: part of the ARC distribution; embedding widgets is their intended use.
 */
/**
 * photo-story.js
 * Immersive Photo Story Engine — visual storytelling with three render modes
 * Modes: scroll (long-form), slideshow (manual), autoplay (cinematic)
 * Block types: cover, text, photo, grid, quote, divider
 * Zero dependencies, uses Web Animations API + IntersectionObserver
 */
((window) => {
  // ── Injected CSS ──────────────────────────────────────────────────────────
  var CSS = [
    /* Base */
    ".photo-story{position:relative;width:100%;font-size:18px;line-height:1.7}",
    ".photo-story *{box-sizing:border-box}",
    ".photo-story img{max-width:100%;display:block}",

    /* Dark theme */
    ".photo-story--dark{background:#0a0a0a;color:#c8c8c8}",
    ".photo-story--dark h1,.photo-story--dark h2,.photo-story--dark h3{color:#fff}",
    ".photo-story--dark .ps-divider-line{background:rgba(255,255,255,0.12)}",
    ".photo-story--dark .ps-nav__dot{border-color:rgba(255,255,255,0.4)}",
    ".photo-story--dark .ps-nav__dot--active{background:#fff;border-color:#fff}",

    /* Light theme */
    ".photo-story--light{background:#faf9f6;color:#3a3a3a}",
    ".photo-story--light h1,.photo-story--light h2,.photo-story--light h3{color:#111}",
    ".photo-story--light .ps-divider-line{background:rgba(0,0,0,0.12)}",
    ".photo-story--light .ps-nav__dot{border-color:rgba(0,0,0,0.3)}",
    ".photo-story--light .ps-nav__dot--active{background:#111;border-color:#111}",
    ".photo-story--light .ps-nav__arrow{background:rgba(255,255,255,0.6);color:#111}",
    ".photo-story--light .ps-progress{background:rgba(0,0,0,0.6)}",

    /* ─── Scroll-mode entrance ─── */
    ".ps-block{opacity:0;transform:translateY(40px);transition:opacity 0.9s cubic-bezier(0.25,0.46,0.45,0.94),transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94)}",
    ".ps-block--visible{opacity:1;transform:translateY(0)}",

    /* Photo entrance: scale */
    ".ps-photo{transform:scale(0.97);transform-origin:center}",
    ".ps-photo.ps-block--visible{transform:scale(1)}",

    /* Grid children stagger */
    ".ps-grid>img{opacity:0;transform:translateY(20px);transition:opacity 0.7s ease,transform 0.7s ease}",
    ".ps-grid.ps-block--visible>img{opacity:1;transform:translateY(0)}",
    ".ps-grid.ps-block--visible>img:nth-child(2){transition-delay:0.12s}",
    ".ps-grid.ps-block--visible>img:nth-child(3){transition-delay:0.24s}",
    ".ps-grid.ps-block--visible>img:nth-child(4){transition-delay:0.36s}",

    /* Quote entrance: scale */
    ".ps-quote blockquote{transition:opacity 1s ease,transform 1s ease}",
    ".ps-quote:not(.ps-block--visible) blockquote{opacity:0;transform:scale(0.94)}",

    /* Cover entrance: inner elements stagger (scroll mode only via .ps-block) */
    ".ps-block.ps-cover{opacity:1;transform:none}",
    ".ps-cover>div>*{opacity:0;transform:translateY(24px);transition:opacity 0.8s ease,transform 0.8s ease}",
    ".ps-cover--entered>div>*{opacity:1;transform:translateY(0)}",
    ".ps-cover--entered>div>*:nth-child(2){transition-delay:0.2s}",
    ".ps-cover--entered>div>*:nth-child(3){transition-delay:0.4s}",
    ".ps-cover--entered>div>*:nth-child(4){transition-delay:0.5s}",

    /* ─── Cover ─── */
    ".ps-cover{min-height:100vh;display:flex;position:relative;overflow:hidden}",
    ".ps-cover>img{flex:1;min-width:0;min-height:100vh;object-fit:cover;display:block}",
    ".ps-cover>div{flex:1;padding:60px 80px;display:flex;flex-direction:column;justify-content:center}",
    ".ps-cover h1{font-size:clamp(2.5rem,5vw,5rem);font-weight:700;line-height:1.08;margin:0 0 16px;letter-spacing:-0.02em}",
    ".ps-cover .subtitle{font-size:clamp(1rem,2vw,1.35rem);opacity:0.55;line-height:1.6;margin:0 0 24px}",
    ".ps-cover .author{font-size:0.85rem;text-transform:uppercase;letter-spacing:3px;opacity:0.35}",

    /* Cover split */
    ".ps-cover--split{flex-direction:row}",

    /* Cover overlay */
    ".ps-cover--overlay{justify-content:center;align-items:center;text-align:center}",
    ".ps-cover--overlay>img{position:absolute;top:0;left:0;width:100%;height:100%;flex:none;object-fit:cover}",
    '.ps-cover--overlay::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,0.4);pointer-events:none}',
    ".ps-cover--overlay>div{position:relative;z-index:2;align-items:center;max-width:700px}",

    /* ─── Text ─── */
    ".ps-text{max-width:720px;margin:0 auto;padding:80px 24px}",
    ".ps-text h2{font-size:clamp(1.5rem,3vw,2.5rem);margin:0 0 28px;line-height:1.2;letter-spacing:-0.01em}",
    ".ps-text p{font-size:1.1rem;line-height:1.85;margin:0 0 22px}",
    ".ps-text p:last-child{margin-bottom:0}",
    ".ps-text blockquote{font-style:italic;font-size:1.25rem;line-height:1.75;margin:44px 0;padding-left:28px;border-left:2px solid;opacity:0.65}",
    ".ps-text em{font-style:italic}",

    /* ─── Photo ─── */
    ".ps-photo{width:100%;position:relative;overflow:hidden}",
    ".ps-photo img{width:100%;display:block;object-fit:cover}",
    ".ps-photo figcaption{font-size:0.8rem;opacity:0.4;text-align:center;padding:14px 24px;letter-spacing:0.5px}",
    ".ps-photo--parallax{overflow:hidden}",
    ".ps-photo--parallax img{will-change:transform;transition:none}",

    /* ─── Grid ─── */
    ".ps-grid{display:grid;gap:4px;padding:0}",
    ".ps-grid--2{grid-template-columns:1fr 1fr}",
    ".ps-grid--3{grid-template-columns:1fr 1fr 1fr}",
    ".ps-grid--4{grid-template-columns:repeat(4,1fr)}",
    ".ps-grid img{width:100%;height:100%;object-fit:cover;display:block}",

    /* ─── Quote ─── */
    ".ps-quote{max-width:820px;margin:0 auto;padding:100px 40px;text-align:center}",
    ".ps-quote blockquote{font-style:italic;font-size:clamp(1.4rem,3vw,2.2rem);line-height:1.55;margin:0 0 20px;border:none;padding:0;opacity:1}",
    ".ps-quote cite{font-size:0.85rem;opacity:0.35;font-style:normal;text-transform:uppercase;letter-spacing:3px;display:block}",

    /* ─── Divider ─── */
    ".ps-divider{padding:40px 0;display:flex;justify-content:center;align-items:center}",
    ".ps-divider-line{width:80px;height:1px}",

    /* ═══════════════════════════════════════════════════════════════════════ */
    /* ─── Slideshow / Autoplay mode ─── */
    ".photo-story--slideshow{height:100vh;overflow:hidden;position:relative}",

    ".ps-slide{position:absolute;top:0;left:0;right:0;bottom:0;opacity:0;transition:opacity 0.9s ease;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:hidden}",
    ".ps-slide--active{opacity:1;z-index:1;pointer-events:auto}",

    /* Slide: reset scroll-mode child animations */
    ".ps-slide.ps-grid>img{opacity:1;transform:none;transition:none}",
    ".ps-slide.ps-quote blockquote{opacity:1;transform:none}",
    ".ps-slide.ps-photo{transform:none}",

    /* Slide overrides per block type */
    ".ps-slide.ps-cover{min-height:0;height:100%}",
    ".ps-slide.ps-cover>img{min-height:0;height:100%}",
    ".ps-slide.ps-cover>div{padding:40px 60px}",
    ".ps-slide.ps-cover--overlay>img{height:100%}",

    ".ps-slide.ps-photo{padding:0}",
    ".ps-slide.ps-photo img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}",
    ".ps-slide.ps-photo figcaption{position:absolute;bottom:48px;left:0;right:0;z-index:2;font-size:0.9rem;color:rgba(255,255,255,0.7)}",

    ".ps-slide.ps-text{max-width:none;padding:60px 80px;text-align:center;flex-direction:column}",
    ".ps-slide.ps-text p,.ps-slide.ps-text blockquote{max-width:640px;margin-left:auto;margin-right:auto}",
    ".ps-slide.ps-text h2{max-width:640px;margin-left:auto;margin-right:auto}",

    ".ps-slide.ps-quote{max-width:none;padding:60px;flex-direction:column}",

    ".ps-slide.ps-grid{position:absolute;inset:0;padding:2px;align-items:stretch}",
    ".ps-slide.ps-grid img{height:100%}",

    /* Navigation dots */
    ".ps-nav{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);z-index:20;display:flex;gap:8px}",
    ".ps-nav__dot{width:8px;height:8px;border-radius:50%;border:1.5px solid;background:transparent;cursor:pointer;padding:0;transition:all 0.3s;outline:none}",

    /* Arrow buttons */
    ".ps-nav__arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:20;background:rgba(0,0,0,0.25);border:none;color:#fff;width:48px;height:48px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background 0.3s,opacity 0.3s;backdrop-filter:blur(4px);opacity:0.6}",
    ".ps-nav__arrow:hover{background:rgba(0,0,0,0.5);opacity:1}",
    ".ps-nav__arrow--prev{left:20px}",
    ".ps-nav__arrow--next{right:20px}",

    /* Progress bar (autoplay) */
    ".ps-progress{position:absolute;top:0;left:0;height:2px;background:rgba(255,255,255,0.7);z-index:30}",

    /* Ken Burns */
    "@keyframes psKB1{from{transform:scale(1) translate(0,0)}to{transform:scale(1.08) translate(-1.5%,-0.8%)}}",
    "@keyframes psKB2{from{transform:scale(1.06) translate(1%,0.5%)}to{transform:scale(1) translate(-0.5%,-0.5%)}}",
    "@keyframes psKB3{from{transform:scale(1) translate(0,0)}to{transform:scale(1.06) translate(1%,0.6%)}}",
    ".ps-slide--kb img{will-change:transform}",

    /* Slide text entrance */
    ".ps-slide.ps-text>*,.ps-slide.ps-quote>*{opacity:0;transform:translateY(16px);transition:opacity 0.7s ease 0.3s,transform 0.7s ease 0.3s}",
    ".ps-slide--active.ps-text>*,.ps-slide--active.ps-quote>*{opacity:1;transform:translateY(0)}",
    ".ps-slide--active.ps-text>*:nth-child(2),.ps-slide--active.ps-quote>*:nth-child(2){transition-delay:0.45s}",
    ".ps-slide--active.ps-text>*:nth-child(3),.ps-slide--active.ps-quote>*:nth-child(3){transition-delay:0.6s}",
    ".ps-slide--active.ps-text>*:nth-child(4){transition-delay:0.75s}",

    /* Pause indicator */
    ".ps-pause{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);z-index:30;width:80px;height:80px;border-radius:50%;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;pointer-events:none;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s}",
    ".ps-pause--show{transform:translate(-50%,-50%) scale(1)}",
    ".ps-pause svg{width:24px;height:24px;fill:#fff}",

    /* ─── Responsive ─── */
    "@media(max-width:768px){",
    ".ps-cover--split{flex-direction:column}",
    ".ps-cover>img{min-height:50vh;flex:none}",
    ".ps-cover>div{padding:40px 24px}",
    ".ps-text{padding:60px 20px}",
    ".ps-grid--3,.ps-grid--4{grid-template-columns:1fr 1fr}",
    ".ps-quote{padding:60px 24px}",
    ".ps-slide.ps-text{padding:40px 24px}",
    ".ps-slide.ps-cover>div{padding:30px 24px}",
    ".ps-nav__arrow{width:36px;height:36px;font-size:14px}",
    ".ps-nav__arrow--prev{left:12px}",
    ".ps-nav__arrow--next{right:12px}",
    "}",
  ].join("\n");

  // ── PhotoStory class ──────────────────────────────────────────────────────

  function PhotoStory(container, options) {
    if (!container) return;
    var o = options || {};
    this.container = container;
    this.mode = o.mode || "scroll";
    this.theme = o.theme || "dark";
    this.autoplayInterval = o.interval || 6000;
    this.blocks = [];
    this._slides = []; // blocks usable as slides (excludes dividers)
    this.currentSlide = 0;
    this._autoplayTimer = null;
    this._observer = null;
    this._scrollHandler = null;
    this._keyHandler = null;
    this._navEl = null;
    this._prevBtn = null;
    this._nextBtn = null;
    this._progressEl = null;
    this._pauseEl = null;
    this._clickPause = null;
    this._init();
  }

  // ── Init ──

  PhotoStory.prototype._init = function () {
    this._injectCSS();
    this._parseBlocks();
    this._enhanceBlocks();
    this.container.classList.add("photo-story", "photo-story--" + this.theme);
    this._applyMode(this.mode);
  };

  PhotoStory.prototype._injectCSS = () => {
    if (document.getElementById("ps-css")) return;
    var s = document.createElement("style");
    s.id = "ps-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  };

  PhotoStory.prototype._parseBlocks = function () {
    var sections = this.container.querySelectorAll("[data-story-block]");
    for (var i = 0; i < sections.length; i++) {
      var type = sections[i].getAttribute("data-story-block");
      var block = { el: sections[i], type: type, index: i, dot: null };
      this.blocks.push(block);
      if (type !== "divider") this._slides.push(block);
    }
  };

  PhotoStory.prototype._enhanceBlocks = function () {
    for (var i = 0; i < this.blocks.length; i++) {
      var b = this.blocks[i];
      var el = b.el;
      var type = b.type;

      // Base classes
      el.classList.add("ps-block", "ps-" + type);

      if (type === "cover") {
        var layout = el.getAttribute("data-layout") || "overlay";
        el.classList.add("ps-cover--" + layout);
      } else if (type === "grid") {
        var cols = parseInt(el.getAttribute("data-columns")) || el.querySelectorAll("img").length;
        el.classList.add("ps-grid--" + Math.min(Math.max(cols, 2), 4));
      } else if (type === "photo" && el.getAttribute("data-effect") === "parallax") {
        el.classList.add("ps-photo--parallax");
      } else if (type === "divider") {
        // Add inner line element
        if (!el.querySelector(".ps-divider-line")) {
          var line = document.createElement("div");
          line.className = "ps-divider-line";
          el.appendChild(line);
        }
      }
    }
  };

  // ── Mode management ──

  PhotoStory.prototype._applyMode = function (mode) {
    this.mode = mode;
    if (mode === "scroll") this._initScroll();
    else if (mode === "slideshow") this._initSlideshow();
    else if (mode === "autoplay") this._initAutoplay();
  };

  PhotoStory.prototype._destroyMode = function () {
    this.container.classList.remove("photo-story--slideshow");

    // Observer
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    // Scroll handler
    if (this._scrollHandler) {
      window.removeEventListener("scroll", this._scrollHandler);
      this._scrollHandler = null;
    }

    // Keyboard
    if (this._keyHandler) {
      document.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }

    // Autoplay
    if (this._autoplayTimer) {
      clearTimeout(this._autoplayTimer);
      this._autoplayTimer = null;
    }

    // DOM elements
    if (this._navEl) {
      this._navEl.remove();
      this._navEl = null;
    }
    if (this._prevBtn) {
      this._prevBtn.remove();
      this._prevBtn = null;
    }
    if (this._nextBtn) {
      this._nextBtn.remove();
      this._nextBtn = null;
    }
    if (this._progressEl) {
      this._progressEl.remove();
      this._progressEl = null;
    }
    if (this._pauseEl) {
      this._pauseEl.remove();
      this._pauseEl = null;
    }

    // Click pause
    if (this._clickPause) {
      this.container.removeEventListener("click", this._clickPause);
      this._clickPause = null;
    }
    this.blocks.forEach((b) => {
      b.el.classList.remove("ps-slide", "ps-slide--active", "ps-slide--kb", "ps-block--visible");
      b.el.classList.add("ps-block");
      b.dot = null;
      // Reset parallax transforms
      var img = b.el.querySelector("img");
      if (img) {
        img.style.transform = "";
        img.style.animationName = "";
        img.style.animationDuration = "";
      }
    });
    // Reset cover entrance
    this.blocks.forEach((b) => {
      if (b.type === "cover") b.el.classList.remove("ps-cover--entered");
    });

    this.currentSlide = 0;
  };

  PhotoStory.prototype.setMode = function (mode) {
    this._destroyMode();
    this._applyMode(mode);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SCROLL MODE ──
  // ═══════════════════════════════════════════════════════════════════════════

  PhotoStory.prototype._initScroll = function () {
    this._observer = new IntersectionObserver(
      (entries) => {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          var target = entries[i].target;
          target.classList.add("ps-block--visible");
          this._observer.unobserve(target);
        }
      },
      { threshold: 0.12 },
    );

    this.blocks.forEach((b) => {
      if (b.type === "cover") {
        // Cover: trigger inner element stagger after short delay
        setTimeout(() => {
          b.el.classList.add("ps-cover--entered");
        }, 300);
      } else {
        this._observer.observe(b.el);
      }
    });

    this._initParallax();
  };

  PhotoStory.prototype._initParallax = function () {
    var parallaxImgs = this.container.querySelectorAll(".ps-photo--parallax img");
    if (!parallaxImgs.length) return;

    var ticking = false;
    this._scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        var vh = window.innerHeight;
        for (let i = 0; i < parallaxImgs.length; i++) {
          const rect = parallaxImgs[i].parentElement.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > vh + 100) continue;
          var progress = (vh - rect.top) / (vh + rect.height);
          var offset = (progress - 0.5) * 80; // ±40px
          parallaxImgs[i].style.transform = "translateY(" + offset + "px) scale(1.08)";
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", this._scrollHandler, { passive: true });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SLIDESHOW MODE ──
  // ═══════════════════════════════════════════════════════════════════════════

  PhotoStory.prototype._initSlideshow = function () {
    this.container.classList.add("photo-story--slideshow");

    // Convert blocks to slides
    this.blocks.forEach((b) => {
      if (b.type === "divider") {
        b.el.style.display = "none";
        return;
      }
      b.el.classList.remove("ps-block");
      b.el.classList.add("ps-slide");
    });

    // Activate first slide
    if (this._slides.length) {
      this._slides[0].el.classList.add("ps-slide--active");
      if (this._slides[0].type === "cover") {
        this._slides[0].el.classList.add("ps-cover--entered");
      }
    }

    this._createNav();
    this._createArrows();

    // Keyboard navigation
    this._keyHandler = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        this.next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.prev();
      }
      if (e.key === "Escape") this.pause();
    };
    document.addEventListener("keydown", this._keyHandler);
  };

  PhotoStory.prototype._createNav = function () {
    var nav = document.createElement("div");
    nav.className = "ps-nav";

    this._slides.forEach((b, i) => {
      var dot = document.createElement("button");
      dot.className = "ps-nav__dot" + (i === 0 ? " ps-nav__dot--active" : "");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.addEventListener("click", () => {
        this.goTo(i);
      });
      nav.appendChild(dot);
      b.dot = dot;
    });

    this.container.appendChild(nav);
    this._navEl = nav;
  };

  PhotoStory.prototype._createArrows = function () {
    var prev = document.createElement("button");
    prev.className = "ps-nav__arrow ps-nav__arrow--prev";
    prev.innerHTML = "\u2190";
    prev.setAttribute("aria-label", "Previous slide");
    prev.addEventListener("click", () => {
      this.prev();
    });

    var next = document.createElement("button");
    next.className = "ps-nav__arrow ps-nav__arrow--next";
    next.innerHTML = "\u2192";
    next.setAttribute("aria-label", "Next slide");
    next.addEventListener("click", () => {
      this.next();
    });

    this.container.appendChild(prev);
    this.container.appendChild(next);
    this._prevBtn = prev;
    this._nextBtn = next;
  };

  PhotoStory.prototype.goTo = function (index) {
    if (index < 0) index = this._slides.length - 1;
    if (index >= this._slides.length) index = 0;
    if (
      index === this.currentSlide &&
      this._slides[index].el.classList.contains("ps-slide--active")
    )
      return;

    // Deactivate current
    var cur = this._slides[this.currentSlide];
    cur.el.classList.remove("ps-slide--active");
    if (cur.dot) cur.dot.classList.remove("ps-nav__dot--active");
    if (cur.type === "cover") cur.el.classList.remove("ps-cover--entered");

    // Activate new
    this.currentSlide = index;
    var next = this._slides[index];
    next.el.classList.add("ps-slide--active");
    if (next.dot) next.dot.classList.add("ps-nav__dot--active");
    if (next.type === "cover") {
      setTimeout(() => {
        next.el.classList.add("ps-cover--entered");
      }, 100);
    }

    // Ken Burns: restart animation
    if (next.el.classList.contains("ps-slide--kb")) {
      var img = next.el.querySelector("img");
      if (img) {
        var name = img.style.animationName;
        img.style.animationName = "none";
        void img.offsetWidth; // force reflow
        img.style.animationName = name;
      }
    }

    // Reset autoplay timer if running
    if (this._autoplayTimer) this._startAutoplayTimer();
  };

  PhotoStory.prototype.next = function () {
    this.goTo(this.currentSlide + 1);
  };
  PhotoStory.prototype.prev = function () {
    this.goTo(this.currentSlide - 1);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── AUTOPLAY MODE ──
  // ═══════════════════════════════════════════════════════════════════════════

  PhotoStory.prototype._initAutoplay = function () {
    // Base: slideshow setup
    this._initSlideshow();

    // Ken Burns on photo/cover slides
    var kbNames = ["psKB1", "psKB2", "psKB3"];
    this._slides.forEach((b, i) => {
      if (b.type === "photo" || b.type === "cover" || b.type === "grid") {
        b.el.classList.add("ps-slide--kb");
        var img = b.el.querySelector("img");
        if (img) {
          img.style.animationName = kbNames[i % 3];
          img.style.animationDuration = this.autoplayInterval / 1000 + 2 + "s";
          img.style.animationTimingFunction = "ease-in-out";
          img.style.animationFillMode = "forwards";
        }
      }
    });

    // Progress bar
    this._progressEl = document.createElement("div");
    this._progressEl.className = "ps-progress";
    this.container.appendChild(this._progressEl);

    // Pause indicator
    this._pauseEl = document.createElement("div");
    this._pauseEl.className = "ps-pause";
    this._pauseEl.innerHTML =
      '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
    this.container.appendChild(this._pauseEl);

    // Click to pause/play
    this._clickPause = (e) => {
      if (e.target.closest(".ps-nav,.ps-nav__arrow,.ps-nav__dot")) return;
      if (this._autoplayTimer) {
        this.pause();
        this._showPause(true);
      } else {
        this.play();
        this._showPause(false);
      }
    };
    this.container.addEventListener("click", this._clickPause);

    // Start
    this._startAutoplayTimer();
  };

  PhotoStory.prototype._startAutoplayTimer = function () {
    clearTimeout(this._autoplayTimer);

    if (this._progressEl) {
      this._progressEl.style.transition = "none";
      this._progressEl.style.width = "0%";
      void this._progressEl.offsetWidth;
      this._progressEl.style.transition = "width " + this.autoplayInterval + "ms linear";
      this._progressEl.style.width = "100%";
    }

    this._autoplayTimer = setTimeout(() => {
      this.next();
    }, this.autoplayInterval);
  };

  PhotoStory.prototype._showPause = function (show) {
    if (!this._pauseEl) return;
    if (show) {
      // Show pause icon
      this._pauseEl.innerHTML =
        '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
      this._pauseEl.classList.add("ps-pause--show");
      var el = this._pauseEl;
      setTimeout(() => {
        el.classList.remove("ps-pause--show");
      }, 1200);
    } else {
      // Show play icon briefly
      this._pauseEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
      this._pauseEl.classList.add("ps-pause--show");
      var el = this._pauseEl;
      setTimeout(() => {
        el.classList.remove("ps-pause--show");
      }, 800);
    }
  };

  PhotoStory.prototype.play = function () {
    this._startAutoplayTimer();
  };

  PhotoStory.prototype.pause = function () {
    clearTimeout(this._autoplayTimer);
    this._autoplayTimer = null;
    if (this._progressEl) {
      var w = this._progressEl.getBoundingClientRect().width;
      this._progressEl.style.transition = "none";
      this._progressEl.style.width = w + "px";
    }
  };

  // ── Cleanup ──

  PhotoStory.prototype.destroy = function () {
    this._destroyMode();
    this.container.classList.remove("photo-story", "photo-story--" + this.theme);
    this.blocks.forEach((b) => {
      b.el.classList.remove(
        "ps-block",
        "ps-" + b.type,
        "ps-cover--split",
        "ps-cover--overlay",
        "ps-grid--2",
        "ps-grid--3",
        "ps-grid--4",
        "ps-photo--parallax",
      );
      var line = b.el.querySelector(".ps-divider-line");
      if (line) line.remove();
    });
    this.blocks = [];
    this._slides = [];
  };

  // ── Auto-init ──────────────────────────────────────────────────────────────

  function autoInit() {
    var containers = document.querySelectorAll("[data-photo-story]");
    for (var i = 0; i < containers.length; i++) {
      var el = containers[i];
      if (el._photoStory) continue;
      var mode = el.getAttribute("data-photo-story") || "scroll";
      var theme = el.getAttribute("data-story-theme") || "dark";
      var interval = parseInt(el.getAttribute("data-story-interval")) || 6000;
      el._photoStory = new PhotoStory(el, { mode: mode, theme: theme, interval: interval });
    }
  }

  // ── Export ──

  window.PhotoStory = PhotoStory;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoInit);
    } else {
      setTimeout(autoInit, 0);
    }
  }
})(window);

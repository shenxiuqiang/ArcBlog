(() => {
  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;
  const FRAG = `
    precision mediump float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform float u_angle;
    uniform float u_dark;

    vec2 hash22(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453123);
    }
    float hash21(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }
    float fbm(vec2 p) {
      float s = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p = p * 2.03 + vec2(17.1, 9.3);
        a *= 0.5;
      }
      return s;
    }
    mat2 rot(float a) {
      float c = cos(a);
      float s = sin(a);
      return mat2(c, s, -s, c);
    }
    float leafSdf(vec2 p, float size) {
      p.x *= 2.2;
      float tip = p.y;
      p.y *= 0.76;
      float d = length(p) - size + 0.48 * tip * tip * size;
      float a = atan(p.x, p.y);
      d += 0.03 * size * sin(a * 6.0);
      d += 0.014 * size * sin(a * 13.0);
      return d;
    }
    float spray(vec2 q, vec2 rnd, float dens) {
      float s0 = (0.13 + 0.32 * rnd.y) * mix(0.65, 1.3, dens);
      float d = leafSdf(q, s0);
      vec2 q1 = rot(0.82 + rnd.x) * q - vec2(0.0, 0.18 * s0);
      d = min(d, mix(4.0, leafSdf(q1, s0 * 0.7), step(0.38, dens)));
      vec2 q2 = rot(-0.9 - rnd.y) * q - vec2(0.0, 0.15 * s0);
      d = min(d, mix(4.0, leafSdf(q2, s0 * 0.62), step(0.62, dens)));
      return d;
    }
    float leafField(vec2 uv, float scale, float seed, float dens) {
      vec2 p = uv * scale;
      vec2 id = floor(p);
      vec2 f = fract(p) - 0.5;
      float d = 4.0;
      for (int y = 0; y < 3; y++) {
        for (int x = 0; x < 3; x++) {
          vec2 cell = id + vec2(float(x) - 1.0, float(y) - 1.0);
          vec2 rnd = hash22(cell + seed);
          float present = step(0.68 - dens * 0.55, rnd.x);
          vec2 offset = (rnd - 0.5) * mix(0.72, 0.22, dens);
          float ang = rnd.x * 6.28318;
          vec2 q = f - vec2(float(x) - 1.0, float(y) - 1.0) - offset;
          q = rot(ang) * q;
          float ld = mix(4.0, spray(q, rnd, dens), present);
          d = min(d, ld);
        }
      }
      return d;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res.y;
      float t = u_time;
      float wind = sin(uv.y * 2.6 + t * 0.46) * 0.012
                 + sin(uv.x * 1.9 + t * 0.25) * 0.006;
      uv.x += wind + uv.y * u_angle;
      uv.y += 0.005 * sin(uv.x * 2.4 + t * 0.34);

      vec2 drift = vec2(t * 0.01, -t * 0.006);
      vec2 p = uv + drift;
      float dens = smoothstep(0.22, 0.78, fbm(uv * 0.48 + drift * 0.22));

      float big = leafField(p, 6.2, 0.0, dens);
      float mid = leafField(p + vec2(1.4, 0.8), 11.8, 5.4, dens);

      float cover = (1.0 - smoothstep(-0.03, 0.05, big)) * mix(0.45, 0.95, dens);
      cover += (1.0 - smoothstep(-0.015, 0.03, mid)) * mix(0.12, 0.55, dens);

      float light = 1.0 - clamp(cover, 0.0, 0.92);
      light = pow(light, 0.7);
      light = mix(0.03, 1.0, light);

      vec3 col = vec3(light);
      if (u_dark > 0.5) {
        col = vec3((1.0 - light) * 0.42);
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function shader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function isDark() {
    const html = document.documentElement;
    return (
      html.dataset.mode === "dark" ||
      html.classList.contains("dark") ||
      html.dataset.theme === "dark"
    );
  }

  function bindControls(root, layer, api) {
    let intensity = Number(root.dataset.intensity || 0.2);
    let on = true;
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paintOpacity() {
      const base = Math.min(1, Math.max(0, intensity));
      const v = reduce ? Math.min(base, 0.16) : base;
      layer.style.opacity = on ? String(v) : "0";
    }

    function setOn(next) {
      on = next;
      paintOpacity();
      layer.classList.toggle("is-off", !on);
      const btn = root.querySelector("[data-leaf-act='toggle']");
      if (btn) {
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
      if (on) api.start();
      else api.stop();
    }

    function setIntensity(next) {
      intensity = next;
      root.dataset.intensity = String(next);
      paintOpacity();
      root.querySelectorAll("[data-leaf-act='intensity']").forEach((el) => {
        el.classList.toggle("is-on", Number(el.dataset.v) === next);
      });
    }

    root.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-leaf-act]");
      if (!btn) return;
      ev.preventDefault();
      if (btn.dataset.leafAct === "toggle") setOn(!on);
      if (btn.dataset.leafAct === "intensity") setIntensity(Number(btn.dataset.v));
      if (btn.dataset.leafAct === "src" && api.setSrc) {
        api.setSrc(btn.dataset.v);
        root.querySelectorAll("[data-leaf-act='src']").forEach((el) => {
          el.classList.toggle("is-on", el.dataset.v === btn.dataset.v);
        });
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) api.stop();
      else if (on) api.start();
    });
    window.addEventListener("pagehide", api.stop);

    setIntensity(intensity);
    setOn(true);
    return {
      get on() {
        return on;
      },
    };
  }

  function bindVideo(root, video) {
    const layer = root.querySelector(".leaf-shadow-layer") || root;
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function start() {
      if (reduce) {
        video.pause();
        return;
      }
      const play = video.play();
      if (play && play.catch) play.catch(() => {});
    }

    function stop() {
      video.pause();
    }

    function setSrc(next) {
      if (!next) return;
      const current = video.getAttribute("src") || "";
      if (current === next) return;
      video.src = next;
      video.load();
      start();
    }

    bindControls(root, layer, { start, stop, setSrc });
  }

  function bind(root) {
    if (root.dataset.bound) return;
    root.dataset.bound = "1";
    const hud = root.querySelector(".leaf-shadow-hud");
    if (hud && hud.parentElement !== document.body) {
      document.body.appendChild(hud);
    }
    const video = root.querySelector(".leaf-shadow-video");
    if (video) {
      bindVideo(root, video);
      return;
    }
    const canvas = root.querySelector(".leaf-shadow-canvas");
    if (!canvas) return;
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const layer = root.querySelector(".leaf-shadow-layer") || root;
    let intensity = Number(root.dataset.intensity || 0.28);
    const speed = Number(root.dataset.speed || 1);
    const angle = Number(root.dataset.angle || 0.35);
    let on = true;

    function paintOpacity() {
      const base = Math.min(1, Math.max(0, intensity));
      const v = reduce ? Math.min(base, 0.16) : base;
      layer.style.opacity = on ? String(v) : "0";
    }
    paintOpacity();

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      root.hidden = true;
      return;
    }
    const vs = shader(gl, gl.VERTEX_SHADER, VERT);
    const fs = shader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      root.hidden = true;
      return;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      root.hidden = true;
      return;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uAngle = gl.getUniformLocation(prog, "u_angle");
    const uDark = gl.getUniformLocation(prog, "u_dark");

    let frame = 0;
    let visible = true;
    const t0 = performance.now();

    function size() {
      const dpr = Math.min(1.25, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function draw(now) {
      size();
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduce ? 0 : ((now - t0) / 1000) * speed);
      gl.uniform1f(uAngle, angle);
      gl.uniform1f(uDark, isDark() ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function tick(now) {
      if (!visible || !on) return;
      draw(now);
      if (!reduce) frame = requestAnimationFrame(tick);
    }

    function start() {
      visible = true;
      if (!on) return;
      if (reduce) {
        draw(t0);
        return;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function stop() {
      visible = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function setOn(next) {
      on = next;
      paintOpacity();
      layer.classList.toggle("is-off", !on);
      const btn = root.querySelector("[data-leaf-act='toggle']");
      if (btn) {
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
      if (on) start();
      else stop();
    }

    function setIntensity(next) {
      intensity = next;
      root.dataset.intensity = String(next);
      paintOpacity();
      root.querySelectorAll("[data-leaf-act='intensity']").forEach((el) => {
        el.classList.toggle("is-on", Number(el.dataset.v) === next);
      });
    }

    root.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-leaf-act]");
      if (!btn) return;
      ev.preventDefault();
      if (btn.dataset.leafAct === "toggle") setOn(!on);
      if (btn.dataset.leafAct === "intensity") setIntensity(Number(btn.dataset.v));
    });

    setIntensity(intensity);
    setOn(true);
    window.addEventListener(
      "resize",
      () => {
        if (on) draw(performance.now());
      },
      { passive: true },
    );
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        if (on) draw(performance.now());
      }).observe(layer);
    }
    new MutationObserver(() => {
      if (on) draw(performance.now());
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode", "class", "data-theme"],
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener("pagehide", stop);
  }

  function boot() {
    document.querySelectorAll(".leaf-shadow").forEach(bind);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

(() => {
  if (window.keyPad) return;
  if (!document.querySelector(".key-pad-boot")) return;

  const DIRS = ["up", "left", "right", "down"];
  const GLYPH = { up: "↑", down: "↓", left: "←", right: "→" };
  const LABEL = {
    up: "Previous page",
    down: "Next page",
    left: "Previous slide",
    right: "Next slide",
  };
  const FROM_KEY = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  const state = { up: false, down: false, left: false, right: false };
  const pad = document.createElement("nav");
  pad.className = "key-pad";
  pad.setAttribute("aria-label", "Page keys");
  pad.innerHTML = DIRS.map(
    (dir) =>
      `<button type="button" data-dir="${dir}" disabled aria-label="${LABEL[dir]}">${GLYPH[dir]}</button>`,
  ).join("");

  function mount() {
    if (!pad.isConnected) document.body.appendChild(pad);
  }

  function set(flags) {
    mount();
    let live = false;
    DIRS.forEach((dir) => {
      const on = Boolean(flags && flags[dir]);
      state[dir] = on;
      if (on) live = true;
      const button = pad.querySelector(`[data-dir="${dir}"]`);
      if (!button) return;
      button.disabled = !on;
      button.classList.toggle("is-on", on);
    });
    pad.classList.toggle("is-live", live);
  }

  function pulse(dir) {
    const button = pad.querySelector(`[data-dir="${dir}"]`);
    if (!button || !state[dir]) return;
    button.classList.remove("is-pulse");
    void button.offsetWidth;
    button.classList.add("is-pulse");
  }

  pad.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-dir]");
    if (!button || button.disabled) return;
    const dir = button.getAttribute("data-dir");
    pulse(dir);
    document.dispatchEvent(new CustomEvent("key-pad:go", { detail: { dir } }));
  });

  document.addEventListener("keydown", (event) => {
    const dir = FROM_KEY[event.key];
    if (dir && state[dir]) pulse(dir);
  });

  window.keyPad = { set, pulse, el: pad };
  document.dispatchEvent(new CustomEvent("key-pad:ready"));
})();

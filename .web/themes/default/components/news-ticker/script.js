(() => {
  const ticker = document.querySelector(".news-ticker");
  if (!ticker) return;
  const track = ticker.querySelector(".ticker-track");
  if (!track || track.children.length === 0) return;

  // Auto-scroll the ticker track
  let scrollPos = 0;
  const speed = 0.5; // px per frame
  let paused = false;

  ticker.addEventListener("mouseenter", () => {
    paused = true;
  });
  ticker.addEventListener("mouseleave", () => {
    paused = false;
  });

  function animate() {
    if (!paused) {
      scrollPos += speed;
      if (scrollPos >= track.scrollWidth - track.clientWidth) {
        scrollPos = 0;
      }
      track.scrollLeft = scrollPos;
    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();

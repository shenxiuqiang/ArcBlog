// Shared media lightbox enhancement for prose-bearing components.
(() => {
  function init() {
    const roots = document.querySelectorAll("[data-media-lightbox]");
    if (!roots.length) return;

    const images = Array.from(roots).flatMap((root) =>
      Array.from(root.querySelectorAll(".aup-text img")),
    );
    const eligibleImages = images.filter(
      (image) => !image.closest("a, button, .media-lightbox-figure"),
    );
    if (!eligibleImages.length) return;

    let activeTrigger = null;
    const lightbox = document.createElement("div");
    lightbox.className = "media-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Expanded image");
    lightbox.innerHTML =
      '<button type="button" class="media-lightbox-close" aria-label="Close expanded image">&times;</button><img alt="">';
    document.body.append(lightbox);

    const closeButton = lightbox.querySelector(".media-lightbox-close");
    const expandedImage = lightbox.querySelector("img");

    function close() {
      if (lightbox.hidden) return;
      lightbox.hidden = true;
      document.body.classList.remove("media-lightbox-open");
      expandedImage.removeAttribute("src");
      if (activeTrigger) activeTrigger.focus();
      activeTrigger = null;
    }

    function open(trigger, image) {
      activeTrigger = trigger;
      expandedImage.src = image.currentSrc || image.src;
      expandedImage.alt = image.alt || "";
      lightbox.hidden = false;
      document.body.classList.add("media-lightbox-open");
      closeButton.focus();
    }

    for (const image of eligibleImages) {
      const figure = document.createElement("figure");
      figure.className = "media-lightbox-figure";
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "media-lightbox-trigger";
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-label", image.alt ? `Expand image: ${image.alt}` : "Expand image");

      image.parentNode.insertBefore(figure, image);
      trigger.append(image);
      figure.append(trigger);

      const caption = image.title || image.getAttribute("data-caption");
      if (caption) {
        const figcaption = document.createElement("figcaption");
        figcaption.className = "media-lightbox-caption";
        figcaption.textContent = caption;
        figure.append(figcaption);
        image.removeAttribute("title");
      }

      trigger.addEventListener("click", () => open(trigger, image));
    }

    closeButton.addEventListener("click", close);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });
    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.focus();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

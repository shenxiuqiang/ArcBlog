(() => {
  const cards = document.querySelectorAll(".content-card");
  if (!cards.length) return;

  // Stagger animation delay for sequential reveal
  cards.forEach((card, i) => {
    card.style.animationDelay = `${(i % 3) * 0.1}s`;
  });
})();

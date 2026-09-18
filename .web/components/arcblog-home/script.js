(() => {
  const button = document.querySelector('.arcblog-mode-toggle');
  if (!button) return;
  const readMode = () => {
    const saved = localStorage.getItem('web-mode');
    return saved === 'light' || saved === 'dark' ? saved : (document.documentElement.getAttribute('data-mode') || 'dark');
  };
  const applyMode = (mode) => {
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('web-mode', mode);
    button.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    button.setAttribute('title', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    button.classList.toggle('is-dark', mode === 'dark');
  };
  applyMode(readMode());
  button.addEventListener('click', () => applyMode(readMode() === 'dark' ? 'light' : 'dark'));
})();

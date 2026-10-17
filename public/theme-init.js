// Applies the saved theme before first paint so dark mode never flashes light.
// External file (not inline) because the CSP only allows script-src 'self'.
// Keep the key and values in sync with src/context/AppContext.tsx.
(function () {
  try {
    var pref = localStorage.getItem('kaampe_theme');
    var dark =
      pref === 'dark' ||
      (pref !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage blocked: stay on the light default */
  }
})();

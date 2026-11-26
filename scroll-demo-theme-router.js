// Keep the editable planet copy on its own page, styles and animation runtime.
(() => {
  'use strict';
  const root = document.documentElement;
  const themes = ['meteor', 'cinema', 'planet', 'planet2'];
  const storageKey = 'huahuo-hero-effect';
  const isCopy = root.dataset.heroVariant === 'planet2';
  const current = new URL(location.href);
  const requested = current.searchParams.get('theme');
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch { /* Optional storage. */ }

  function remember(theme) {
    try { localStorage.setItem(storageKey, theme); } catch { /* Optional storage. */ }
  }
  function destination(theme) {
    const page = theme === 'planet2' ? 'scroll-demo-planet2.html' : root.dataset.themeHome;
    const target = new URL(page, location.href);
    target.search = current.search;
    target.searchParams.set('theme', theme);
    target.hash = 'story';
    return target;
  }

  const initial = themes.includes(requested) ? requested : isCopy ? 'planet2' : saved;
  if (themes.includes(initial)) remember(initial);
  if (themes.includes(initial) && isCopy !== (initial === 'planet2')) {
    location.replace(destination(initial).href);
    return;
  }

  // Capture runs before the original selector handler. Page navigation disposes
  // the old canvas, observers and listeners before loading the other version.
  document.addEventListener('change', event => {
    const select = event.target;
    if (!select.matches('[data-hero-effect-select]') || !themes.includes(select.value)) return;
    const theme = select.value;
    remember(theme);
    if (isCopy !== (theme === 'planet2')) {
      event.stopImmediatePropagation();
      location.assign(destination(theme).href);
      return;
    }
    if (isCopy) {
      event.stopImmediatePropagation();
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('theme', theme);
    history.replaceState(null, '', url);
  }, true);
})();

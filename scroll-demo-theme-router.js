// Independent themes own their page, styles and animation runtime.
(() => {
  'use strict';
  const root = document.documentElement;
  const separatePages = {
    planet2: 'scroll-demo-planet2.html',
    editorial: 'scroll-demo-editorial.html',
  };
  const themes = ['meteor', 'cinema', 'planet', ...Object.keys(separatePages)];
  const storageKey = 'huahuo-hero-effect';
  const pageTheme = Object.hasOwn(separatePages, root.dataset.heroVariant)
    ? root.dataset.heroVariant : null;
  const current = new URL(location.href);
  const requested = current.searchParams.get('theme');
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch { /* Optional storage. */ }

  function remember(theme) {
    try { localStorage.setItem(storageKey, theme); } catch { /* Optional storage. */ }
  }
  function destination(theme) {
    const page = separatePages[theme] || root.dataset.themeHome || 'scroll-demo.html';
    const target = new URL(page, location.href);
    target.search = new URL(location.href).search;
    target.searchParams.set('theme', theme);
    target.hash = 'story';
    return target;
  }

  const initial = themes.includes(requested) ? requested
    : pageTheme || (themes.includes(saved) ? saved : 'meteor');
  remember(initial);
  if (pageTheme !== (Object.hasOwn(separatePages, initial) ? initial : null)) {
    location.replace(destination(initial).href);
    return;
  }

  let syncingControls = false;
  function syncControls(theme) {
    document.querySelectorAll('[data-hero-effect-select]').forEach(select => {
      if (![...select.options].some(option => option.value === 'editorial')) {
        const option = document.createElement('option');
        option.value = 'editorial';
        option.textContent = '内容橱窗';
        select.append(option);
      }
      const needsRuntimeUpdate = !pageTheme && root.dataset.heroEffect !== theme;
      select.value = theme;
      // The original canvas reads storage on startup. Apply an explicit URL
      // choice through its existing handler even when storage is unavailable.
      if (needsRuntimeUpdate) {
        syncingControls = true;
        try { select.dispatchEvent(new Event('change', { bubbles: true })); }
        finally { syncingControls = false; }
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncControls(initial), { once: true });
  } else {
    syncControls(initial);
  }
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const theme = new URL(location.href).searchParams.get('theme') || pageTheme || root.dataset.heroEffect;
    if (themes.includes(theme)) {
      remember(theme);
      syncControls(theme);
    }
  });

  // Capture runs before the original selector handler. Page navigation disposes
  // the old canvas, observers and listeners before loading the other version.
  document.addEventListener('change', event => {
    if (syncingControls) return;
    const select = event.target;
    if (!(select instanceof Element) || !select.matches('[data-hero-effect-select]') || !themes.includes(select.value)) return;
    const theme = select.value;
    remember(theme);
    if (pageTheme !== (Object.hasOwn(separatePages, theme) ? theme : null)) {
      event.stopImmediatePropagation();
      location.assign(destination(theme).href);
      return;
    }
    if (pageTheme) {
      event.stopImmediatePropagation();
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('theme', theme);
    url.hash = 'story';
    history.replaceState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, true);
})();

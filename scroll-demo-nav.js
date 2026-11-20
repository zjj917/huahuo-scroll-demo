(() => {
  'use strict';

  function initNavigation() {
    const nav = document.getElementById('demo-site-nav');
    const toggle = document.querySelector('[data-menu-toggle]');
    const dialog = document.getElementById('demo-contact-dialog');
    const title = document.getElementById('demo-contact-title');
    const message = document.getElementById('demo-contact-message');
    const mobile = window.matchMedia('(max-width: 900px)');
    if (!nav || !toggle) return;
    let returnFocus = null;

    function setMenu(open, restoreFocus = false) {
      const expanded = mobile.matches && open;
      nav.classList.toggle('is-open', expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? '收起导航菜单' : '展开导航菜单');
      nav.toggleAttribute('inert', mobile.matches && !expanded);
      if (mobile.matches && !expanded) nav.setAttribute('aria-hidden', 'true');
      else nav.removeAttribute('aria-hidden');
      if (restoreFocus && mobile.matches) toggle.focus({ preventScroll: true });
    }

    setMenu(false);
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    mobile.addEventListener('change', () => setMenu(false));
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMenu(false, true));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true' && !dialog?.open) {
        setMenu(false, true);
      }
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
    });
    document.addEventListener('focusin', event => {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
    });

    if (!dialog || !title || !message) return;
    const pendingPages = {
      home: ['首页', '首页链接待接入。'],
      awards: ['花火奖', '花火奖页面链接待接入。'],
      help: ['帮助中心', '帮助中心链接待接入。'],
      service: ['联系客服', '客服入口待补充。'],
      email: ['联系邮箱', '联系邮箱待补充。'],
      login: ['立即登录', '登录入口待接入。'],
      join: ['立即入驻', '入驻入口待接入。'],
    };
    document.querySelectorAll('.demo-header [data-contact], .hero-actions [data-contact]').forEach(button => {
      button.addEventListener('click', () => {
        returnFocus = mobile.matches && nav.contains(button) ? toggle : button;
        const [heading, description] = pendingPages[button.dataset.contact];
        title.textContent = heading;
        message.textContent = description;
        setMenu(false);
        if (!dialog.open) dialog.showModal();
        dialog.querySelector('[data-contact-close]')?.focus();
      });
    });
    dialog.querySelectorAll('[data-contact-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('close', () => {
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNavigation, { once: true });
  else initNavigation();
})();

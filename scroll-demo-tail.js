(() => {
  'use strict';

  function initTail() {
    const tail = document.querySelector('[data-tail-content]');
    if (!tail) return;
    const tabs = [...tail.querySelectorAll('.tail-role[role="tab"]')];
    const tablist = tail.querySelector('.tail-roles[role="tablist"]');
    const compactLayout = window.matchMedia('(max-width: 900px)');

    function updateOrientation() {
      tablist?.setAttribute('aria-orientation', compactLayout.matches ? 'horizontal' : 'vertical');
    }
    updateOrientation();
    compactLayout.addEventListener('change', updateOrientation);

    function activateRole(selected, focus = false) {
      tabs.forEach(tab => {
        const active = tab === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
      if (focus) selected.focus();
    }

    if (tabs.length) activateRole(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateRole(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        activateRole(tabs[next], true);
      });
    });

    // Match the Transitions.dev accordion state contract; CSS owns height.
    tail.querySelectorAll('.tail-question.t-acc').forEach(item => {
      const trigger = item.querySelector('.tail-question-button');
      if (!trigger) return;
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) return;
      function setExpanded(expanded) {
        item.dataset.open = String(expanded);
        trigger.setAttribute('aria-expanded', String(expanded));
        panel.setAttribute('aria-hidden', String(!expanded));
        panel.toggleAttribute('inert', !expanded);
      }
      setExpanded(item.dataset.open === 'true');
      trigger.addEventListener('click', () => setExpanded(item.dataset.open !== 'true'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTail, { once: true });
  else initTail();
})();

(() => {
  'use strict';
  const root = document.documentElement;
  const track = document.querySelector('[data-story-track]');
  const stage = document.querySelector('[data-story-stage]');
  const scenes = [...track.querySelectorAll('[data-scene]')];
  const header = document.querySelector('[data-header]');
  const themeButton = document.querySelector('[data-theme-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:760px), (max-height:620px)');
  const themePreference = matchMedia('(prefers-color-scheme: dark)');
  const rail = document.querySelector('[data-case-rail]');
  const film = document.querySelector('[data-case-film]');
  const typeMask = document.querySelector('[data-type-mask]');
  const letters = document.querySelector('[data-mask-letters]');
  const aperture = document.querySelector('[data-mask-aperture]');
  const subtitle = document.querySelector('.portal-subtitle');
  const portalHeading = document.getElementById('cases-intro-title');
  const portalCopy = document.querySelector('.portal-copy');
  const portalText = letters.querySelector('text');
  const valueCards = [...document.querySelectorAll('.value-card')];
  const heroTitle = document.getElementById('hero-title');
  const valuesTitle = document.getElementById('values-title');
  const heroActions = document.querySelector('.hero-actions');
  const heroDots = document.querySelector('[data-hero-dots]');
  const heroDetails = [...document.querySelectorAll('.hero-copy .scene-kicker, .hero-actions')];
  const valuesDetails = [...document.querySelectorAll('.scene-values .section-heading > p')];
  // Keep the original headings in the document for semantics and layout. One
  // decorative layer carries the exact same visible title across both scenes.
  const openingTitle = document.createElement('div');
  openingTitle.className = 'opening-title';
  openingTitle.setAttribute('aria-hidden', 'true');
  openingTitle.innerHTML = heroTitle.innerHTML;
  stage.append(openingTitle);
  const stops = [0, 1.1, 2.5, 4.8, 10.2, 14.3, 15.5, 18.7];
  const total = 20.2;
  // Viewport-height distances keep every pose reversible and independent of time.
  const serviceIntro = { enterStart: 2.1, enterEnd: 2.9 };
  const serviceTransitions = [
    { from: 2, to: 3, color: 'var(--brand)', bandStart: 3, bandEnd: 3.5, morphStart: 3.6, morphEnd: stops[3] },
    { from: 3, to: 4, color: 'var(--phase-green)', bandStart: 8.4, bandEnd: 8.9, morphStart: 9, morphEnd: stops[4] },
    { from: 4, to: 5, color: 'var(--phase-blue)', bandStart: 12.5, bandEnd: 13, morphStart: 13.1, morphEnd: stops[5] },
  ].map(transition => {
    const symbol = scenes[transition.to].querySelector('.service-symbol');
    const element = document.createElement('div');
    element.className = 'service-morph';
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('--morph-color', transition.color);
    element.innerHTML = `<div class="service-morph-surface"></div>${symbol.innerHTML}`;
    stage.append(element);
    return { ...transition, symbol, element, surface: element.querySelector('.service-morph-surface'), icon: element.querySelector('svg'), geometry: null };
  });
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let savedTheme;
  let pinned = false;
  let frame = 0;
  let dirty = true;
  let currentIndex = 0;
  let units = 0;
  let height = window.innerHeight;
  let railTravel = 0;
  let openingGeometry = { startX: 0, startY: 0, endX: 0, endY: 0, scale: 1 };
  let portalGeometry = null;
  const serviceData = scenes.map((scene, index) => {
    scene.id = `demo-${scene.dataset.scene}`;
    const strip = scene.querySelector('.service-strip');
    if (!strip) return null;
    // Keep reading windows separate from the following band's transition.
    const contentEnd = index === 3 ? 8.6 : index === 4 ? 12.7 : stops[index + 1];
    return { scene, index, strip, frames: [...strip.children], buttons: [...scene.querySelectorAll('[data-step]')], offsets: [], frameStart: stops[index] + .18, frameEnd: contentEnd - .37 };
  }).filter(Boolean);

  try { savedTheme = localStorage.getItem('huahuo-theme'); } catch { savedTheme = null; }
  if (!['light', 'dark'].includes(savedTheme)) savedTheme = null;
  function setTheme(mode, remember = false) {
    root.dataset.mode = mode;
    const label = mode === 'dark' ? '切换亮色主题' : '切换暗色主题';
    themeButton.setAttribute('aria-label', label);
    themeButton.querySelector('.sr-only').textContent = label;
    if (remember) {
      savedTheme = mode;
      try { localStorage.setItem('huahuo-theme', mode); } catch { /* Storage is optional. */ }
    }
  }
  setTheme(savedTheme || (themePreference.matches ? 'dark' : 'light'));
  themeButton.addEventListener('click', () => setTheme(root.dataset.mode === 'dark' ? 'light' : 'dark', true));
  themePreference.addEventListener('change', event => { if (!savedTheme) setTheme(event.matches ? 'dark' : 'light'); });

  function nearestScene() {
    let index = 0;
    scenes.forEach((scene, i) => { if (scene.getBoundingClientRect().top <= window.innerHeight * .4) index = i; });
    return index;
  }
  function measureOpening() {
    if (!pinned) return;
    const start = heroTitle.getBoundingClientRect();
    const end = valuesTitle.getBoundingClientRect();
    const hero = scenes[0].getBoundingClientRect();
    const values = scenes[1].getBoundingClientRect();
    // Subtract the scene bounds so a resize during scrub cannot capture its
    // current translation as part of either layout endpoint.
    openingGeometry = {
      startX: start.left - hero.left, startY: start.top - hero.top,
      endX: end.left - values.left, endY: end.top - values.top,
      scale: parseFloat(getComputedStyle(valuesTitle).fontSize) / parseFloat(getComputedStyle(heroTitle).fontSize)
    };
    openingTitle.style.width = `${heroTitle.offsetWidth}px`;
  }
  function measurePortal() {
    if (!pinned) return;
    const width = stage.clientWidth;
    const viewportHeight = stage.clientHeight;
    const fontSize = Math.min(118, width * 118 / 1440);
    typeMask.setAttribute('viewBox', `0 0 ${width} ${viewportHeight}`);
    typeMask.querySelectorAll('mask, rect').forEach(element => {
      element.setAttribute('width', String(width));
      element.setAttribute('height', String(viewportHeight));
    });
    portalText.setAttribute('font-size', String(fontSize));
    // getBBox is local to the text; the group's current scrub transform does
    // not contaminate these coordinates during resize or reverse scrolling.
    const bounds = portalText.getBBox();
    if (!bounds.width || !bounds.height) return;
    const scene = scenes[6].getBoundingClientRect();
    const heading = portalHeading.getBoundingClientRect();
    const copy = portalCopy.getBoundingClientRect();
    const scale = parseFloat(getComputedStyle(portalHeading).fontSize) / fontSize;
    const subtitleSize = parseFloat(getComputedStyle(subtitle).fontSize);
    const subtitleScale = Math.min(36, Math.max(20, width * .025)) / subtitleSize;
    portalGeometry = {
      width, height: viewportHeight, bounds, scale,
      endX: heading.left - scene.left,
      endY: heading.top - scene.top + (portalHeading.offsetHeight - bounds.height * scale) / 2,
      subtitleScale,
      subtitleStartX: (width - subtitle.offsetWidth * subtitleScale) / 2,
      subtitleStartY: viewportHeight * .64,
      // Layout offsets exclude the subtitle's animated transform.
      subtitleEndX: copy.left - scene.left + subtitle.offsetLeft,
      subtitleEndY: copy.top - scene.top + subtitle.offsetTop,
    };
  }
  function configure(preserve = true) {
    const oldPinned = pinned;
    const oldUnits = units;
    const oldIndex = oldPinned ? currentIndex : nearestScene();
    const inTail = document.getElementById('tail-industries')?.getBoundingClientRect().top < window.innerHeight * .4;
    let tailAnchor = document.getElementById('tail-industries');
    if (inTail) {
      document.querySelectorAll('.tail-case-card,.tail-faq,.tail-footer').forEach(element => {
        if (element.getBoundingClientRect().top <= window.innerHeight * .4) tailAnchor = element;
      });
    }
    const tailOffset = inTail ? tailAnchor.getBoundingClientRect().top : 0;
    pinned = !reduced.matches && !compact.matches;
    root.classList.toggle('is-pinned', pinned);
    root.classList.toggle('is-linear', !pinned);
    height = window.innerHeight;
    track.style.height = pinned ? `${(total + 1) * height}px` : 'auto';
    serviceData.forEach(data => { const first = data.frames[0].offsetTop; data.offsets = data.frames.map(item => item.offsetTop - first); });
    const gutter = parseFloat(getComputedStyle(scenes[7]).paddingLeft);
    railTravel = Math.max(0, rail.scrollWidth - (window.innerWidth - 2 * gutter));
    measureOpening();
    measurePortal();
    if (pinned) {
      serviceTransitions.forEach(transition => {
        const target = transition.symbol.getBoundingClientRect();
        const targetScene = scenes[transition.to].getBoundingClientRect();
        const icon = transition.symbol.querySelector('svg').getBoundingClientRect();
        transition.geometry = {
          x: target.left - targetScene.left, y: target.top - targetScene.top,
          width: target.width, height: target.height,
          radius: parseFloat(getComputedStyle(transition.symbol).borderRadius),
          iconWidth: icon.width, iconHeight: icon.height, viewportWidth: stage.clientWidth,
        };
      });
    }
    if (preserve) {
      let top = window.scrollY;
      if (inTail) top = tailAnchor.getBoundingClientRect().top + window.scrollY - tailOffset;
      else if (pinned) top = (oldPinned ? oldUnits : stops[oldIndex] + .22) * height;
      else if (oldPinned) top = scenes[oldIndex].offsetTop - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }
    requestUpdate();
  }

  function jumpTo(index, offset = .22) {
    if (pinned) window.scrollTo({ top: (stops[index] + offset) * height, behavior: reduced.matches ? 'instant' : 'smooth' });
    else scenes[index].scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
  }
  document.querySelectorAll('[data-jump]').forEach(link => {
    const key = link.dataset.jump;
    link.href = key === 'faq' ? '#tail-faq' : `#demo-${key}`;
    link.addEventListener('click', event => {
      event.preventDefault();
      if (key === 'faq') document.getElementById('tail-faq').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth' });
      else jumpTo(scenes.findIndex(scene => scene.dataset.scene === key), key === 'hero' ? 0 : .22);
    });
  });
  serviceData.forEach(data => data.buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (!pinned) { data.frames[index].scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' }); return; }
      const target = data.frameStart + (data.frameEnd - data.frameStart) * index / Math.max(1, data.frames.length - 1);
      jumpTo(data.index, target - stops[data.index]);
    });
  }));
  document.querySelectorAll('[data-case-direction]').forEach(button => button.addEventListener('click', () => {
    const fraction = clamp((units - stops[7] - .15) / 1.15);
    const target = clamp(fraction + Number(button.dataset.caseDirection) * .5);
    jumpTo(7, .15 + target * 1.15);
  }));

  function render() {
    dirty = false;
    units = clamp(window.scrollY / height, 0, total);
    const headerProgress = reduced.matches ? Number(window.scrollY > 0) : smooth(window.scrollY / Math.min(280, height * .32));
    header.style.setProperty('--header-progress', String(headerProgress));
    const openingProgress = smooth((units - .06) / 1.04);
    const introEnter = smooth((units - serviceIntro.enterStart) / (serviceIntro.enterEnd - serviceIntro.enterStart));
    const serviceProgress = serviceTransitions.map(transition => smooth((units - transition.morphStart) / (transition.morphEnd - transition.morphStart)));
    const openingExit = introEnter;
    const openingShift = -openingExit * height;
    const heroFade = 1 - smooth((units - .08) / .67);
    let nextIndex = 0;
    let bestOpacity = -1;
    scenes.forEach((scene, i) => {
      const incoming = serviceTransitions.findIndex(transition => transition.to === i);
      const outgoing = serviceTransitions.findIndex(transition => transition.from === i);
      const enter = i === 0 ? 1 : i === 2 ? introEnter : incoming >= 0 ? serviceProgress[incoming] : smooth((units - stops[i] + .17) / .34);
      const exit = i === scenes.length - 1 ? 1 : i === 1 ? 1 - introEnter : outgoing >= 0 ? 1 - serviceProgress[outgoing] : 1 - smooth((units - stops[i+1] + .17) / .34);
      const opacity = enter * exit;
      if (opacity > bestOpacity) { bestOpacity = opacity; nextIndex = i; }
      scene.classList.toggle('is-active', !pinned || (i < 2 ? openingExit < 1 : opacity > .002));
      // Adjacent pages share one moving edge: no overlapping, ghosted copy.
      scene.style.opacity = '1';
      // Both text sections share one moving edge, timed with the band morph.
      // The incoming content keeps moving until the icon reaches its endpoint.
      const shift = (1 - enter) * height - (1 - exit) * height;
      scene.style.transform = pinned ? `translateY(${(i < 2 ? openingShift : shift).toFixed(2)}px)` : 'none';
    });
    if (!pinned) nextIndex = nearestScene();
    // A target must leave inert before focus can move into it.
    scenes[nextIndex].removeAttribute('inert');
    scenes[nextIndex].removeAttribute('aria-hidden');
    if (currentIndex !== nextIndex && pinned && scenes[currentIndex].contains(document.activeElement)) {
      const heading = nextIndex < 2 || nextIndex === 6 ? document.getElementById('story') : scenes[nextIndex].querySelector('h1,h2');
      heading.tabIndex = -1; heading.focus({ preventScroll: true });
    }
    currentIndex = nextIndex;
    scenes.forEach((scene, index) => {
      const available = !pinned || index === currentIndex;
      scene.classList.toggle('is-current', available);
      scene.toggleAttribute('inert', !available);
      if (available) scene.removeAttribute('aria-hidden'); else scene.setAttribute('aria-hidden','true');
    });
    const g = openingGeometry;
    openingTitle.style.transform = `translate(${g.startX + (g.endX-g.startX)*openingProgress}px,${g.startY + (g.endY-g.startY)*openingProgress + openingShift}px) scale(${1 + (g.scale-1)*openingProgress})`;
    openingTitle.style.visibility = pinned && openingExit < 1 ? 'visible' : 'hidden';
    heroDetails.forEach(element => {
      element.style.opacity = pinned ? String(heroFade) : '';
      element.style.transform = pinned ? `translateY(${-openingProgress * 36}px)` : '';
    });
    const fireScroll = pinned ? smooth((units - .02) / .83) : 0;
    const heroOpacity = pinned ? String(1 - smooth((units - .78) / .32)) : '1';
    if (heroDots.style.opacity !== heroOpacity || heroDots.style.getPropertyValue('--fire-scroll') !== String(fireScroll)) {
      heroDots.style.opacity = heroOpacity;
      heroDots.style.setProperty('--fire-scroll', String(fireScroll));
      heroDots.dispatchEvent(new Event('hero-progress'));
    }
    const unavailable = pinned && heroFade < .02;
    if (unavailable && heroActions.contains(document.activeElement)) document.getElementById('story').focus({ preventScroll: true });
    heroActions.toggleAttribute('inert', unavailable);
    valuesDetails.forEach(element => { element.style.opacity = pinned ? String(smooth((units-.65)/.45)) : ''; });
    valueCards.forEach((card, i) => {
      const entry = smooth((units - .7 - i * .055) / .5);
      card.style.opacity = pinned ? String(entry) : '1';
      card.style.transform = pinned ? `translateY(${(1 - entry) * 120}px)` : 'none';
    });
    serviceData.forEach(data => {
      const position = clamp((units - data.frameStart) / (data.frameEnd - data.frameStart)) * (data.frames.length - 1);
      const base = Math.floor(position);
      const blend = smooth((position - base - .12) / .76);
      const start = data.offsets[base] || 0;
      const end = data.offsets[Math.min(base+1,data.frames.length-1)] || 0;
      data.strip.style.transform = pinned ? `translateY(${-start - (end-start)*blend}px)` : 'none';
      let active = Math.round(position);
      if (!pinned) {
        active = 0;
        data.frames.forEach((item, index) => {
          if (item.getBoundingClientRect().top <= height * .4) active = index;
        });
      }
      data.buttons.forEach((button, index) => { if (index === active) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
      // Preserve all service text in the accessibility tree; only the visual track moves.
    });
    serviceTransitions.forEach((transition, index) => {
      const morphActive = pinned && units > transition.bandStart && units < transition.morphEnd;
      transition.element.style.visibility = morphActive ? 'visible' : 'hidden';
      transition.symbol.style.visibility = pinned && units < transition.morphEnd ? 'hidden' : '';
      if (!morphActive) return;
      const rise = smooth((units - transition.bandStart) / (transition.bandEnd - transition.bandStart));
      const morph = serviceProgress[index];
      const target = transition.geometry;
      const bandHeight = height * .44;
      const x = target.x * morph;
      const y = (height - bandHeight * rise) * (1 - morph) + target.y * morph;
      const width = target.viewportWidth * (1 - morph) + target.width * morph;
      const blockHeight = bandHeight * (1 - morph) + target.height * morph;
      const iconStart = Math.min(112, bandHeight * .3);
      const iconWidth = iconStart * (1 - morph) + target.iconWidth * morph;
      const iconHeight = iconStart * (1 - morph) + target.iconHeight * morph;
      transition.surface.style.clipPath = `inset(${y}px ${target.viewportWidth-x-width}px ${height-y-blockHeight}px ${x}px round ${target.radius*morph}px)`;
      transition.icon.style.transform = `translate(${x+(width-iconWidth)/2}px,${y+(blockHeight-iconHeight)/2}px) scale(${iconWidth/48},${iconHeight/48})`;
    });
    const portal = units - stops[6];
    const cut = smooth((portal - 1.05) / 1.2);
    const dock = smooth((portal - 1.9) / .95);
    film.style.clipPath = 'none';
    typeMask.style.opacity = pinned && portalGeometry ? String(smooth((portal-1)/.3)) : '0';
    if (pinned && portalGeometry) {
      const p = portalGeometry;
      const zoom = Math.exp((1-cut) * Math.log(18));
      const scale = zoom * (1 + (p.scale-1) * dock);
      const centerX = p.width / 2 + (p.endX + p.bounds.width*p.scale/2 - p.width/2) * dock;
      const centerY = p.height * .52 + (p.endY + p.bounds.height*p.scale/2 - p.height*.52) * dock;
      const x = centerX - (p.bounds.x + p.bounds.width/2) * scale;
      const y = centerY - (p.bounds.y + p.bounds.height/2) * scale;
      letters.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
      subtitle.style.transform = `translate(${(p.subtitleStartX-p.subtitleEndX)*(1-dock)}px,${(p.subtitleStartY-p.subtitleEndY)*(1-dock)}px) scale(${p.subtitleScale+(1-p.subtitleScale)*dock})`;
    } else {
      letters.removeAttribute('transform');
      subtitle.style.transform = '';
    }
    if (aperture) aperture.style.opacity = String(1-smooth((portal-1.05)/.5));
    subtitle.style.opacity = pinned ? String(smooth((portal-1.85)/.4)) : '1';
    const immersive = pinned && portal > .35 && portal < 2.7;
    header.classList.toggle('is-submerged', immersive);
    root.classList.toggle('is-portal', immersive);
    const railProgress = clamp((units - stops[7] - .15) / 1.15);
    rail.style.transform = pinned ? `translateX(${-railTravel*railProgress}px)` : 'none';
    document.querySelector('[data-case-direction="-1"]').disabled = railProgress <= .01;
    document.querySelector('[data-case-direction="1"]').disabled = railProgress >= .99;
  }
  function tick() {
    frame = 0;
    if (!document.hidden && dirty) render();
  }
  function requestUpdate() { dirty = true; if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => configure(), { passive: true });
  reduced.addEventListener('change', () => configure());
  compact.addEventListener('change', () => configure());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestUpdate(); });
  configure(false);
  if (document.fonts?.ready) document.fonts.ready.then(() => { measurePortal(); requestUpdate(); });
  if (location.hash.startsWith('#demo-')) {
    const index = scenes.findIndex(scene => `#${scene.id}` === location.hash);
    if (index >= 0) requestAnimationFrame(() => jumpTo(index));
  }
})();

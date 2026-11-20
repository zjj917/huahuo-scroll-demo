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
  const orbit = document.querySelector('[data-orbit]');
  const orbitLabel = document.getElementById('hero-hover-label');
  const rail = document.querySelector('[data-case-rail]');
  const film = document.querySelector('[data-case-film]');
  const typeMask = document.querySelector('[data-type-mask]');
  const letters = document.querySelector('[data-mask-letters]');
  const aperture = document.querySelector('[data-mask-aperture]');
  const subtitle = document.querySelector('.portal-subtitle');
  const valueCards = [...document.querySelectorAll('.value-card')];
  const heroTitle = document.getElementById('hero-title');
  const valuesTitle = document.getElementById('values-title');
  const heroActions = document.querySelector('.hero-actions');
  const heroDetails = [...document.querySelectorAll('.hero-copy .scene-kicker, .hero-actions')];
  const valuesDetails = [...document.querySelectorAll('.scene-values .section-heading > p')];
  // Keep the original headings in the document for semantics and layout. One
  // decorative layer carries the exact same visible title across both scenes.
  const openingTitle = document.createElement('div');
  openingTitle.className = 'opening-title';
  openingTitle.setAttribute('aria-hidden', 'true');
  openingTitle.innerHTML = heroTitle.innerHTML;
  stage.append(openingTitle);
  const stops = [0, 1.1, 2.5, 4.8, 10.2, 12.7, 13.9, 17.1];
  const total = 18.6;
  // Viewport-height distances keep every pose reversible and independent of time.
  const serviceIntro = { enterStart: 2.1, enterEnd: 2.9 };
  const serviceTransitions = [
    { from: 2, to: 3, color: 'var(--brand)', bandStart: 3, bandEnd: 3.5, morphStart: 3.6, morphEnd: stops[3] },
    { from: 3, to: 4, color: 'var(--phase-green)', bandStart: 8.4, bandEnd: 8.9, morphStart: 9, morphEnd: stops[4] },
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
  const topics = ['科技数码','生活记录','游戏实况','美食探店','汽车出行','音乐创作','知识分享','时尚穿搭','运动健身','动画创作','家居生活','旅行探索','摄影影像','舞蹈表演','手工创作','宠物日常','艺术设计','校园生活','影视解读','户外探索'];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let savedTheme;
  let pinned = false;
  let frame = 0;
  let lastTime = 0;
  let dirty = true;
  let currentIndex = 0;
  let units = 0;
  let height = window.innerHeight;
  let railTravel = 0;
  let orbitWidth = 0;
  let orbitHeight = 0;
  let heroBottom = 0;
  let keyboardInput = false;
  let openingGeometry = { startX: 0, startY: 0, endX: 0, endY: 0, scale: 1 };
  const serviceData = scenes.map((scene, index) => {
    scene.id = `demo-${scene.dataset.scene}`;
    const strip = scene.querySelector('.service-strip');
    if (!strip) return null;
    // Preserve the four matching frames' original reading window. The later
    // delivery stop adds transition space, not more distance between frames.
    const contentEnd = index === 3 ? 8.6 : stops[index + 1];
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
  document.addEventListener('keydown', () => { keyboardInput = true; }, true);
  document.addEventListener('pointerdown', () => { keyboardInput = false; }, true);

  const creators = topics.map((topic, index) => {
    const element = document.createElement('button');
    element.className = 'hero-creator';
    element.type = 'button';
    element.dataset.topic = topic;
    element.tabIndex = index === 0 ? 0 : -1;
    element.setAttribute('aria-label', `${topic}创作者，原创示意头像；点击停留，方向键浏览`);
    element.setAttribute('aria-pressed', 'false');
    const image = document.createElement('img');
    image.src = `assets/creators/creator-${String(index + 1).padStart(2, '0')}.svg`;
    image.alt = ''; image.width = 80; image.height = 80;
    element.append(image);
    const person = { element, topic, orbit: Math.floor(index / 5), angle: index % 5 / 5 * Math.PI * 2 + Math.floor(index / 5) * .45, hovered: false, focused: false, locked: false };
    element.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { person.hovered = true; updateCreatorLabel(); } });
    element.addEventListener('pointerleave', () => { person.hovered = false; updateCreatorLabel(); });
    element.addEventListener('pointercancel', () => { person.hovered = false; updateCreatorLabel(); });
    element.addEventListener('focus', () => {
      person.focused = keyboardInput;
      creators.forEach(other => { other.element.tabIndex = other === person ? 0 : -1; });
      updateCreatorLabel();
    });
    element.addEventListener('blur', () => { person.focused = false; updateCreatorLabel(); });
    element.addEventListener('click', () => {
      const next = !person.locked;
      creators.forEach(other => { other.locked = other === person && next; other.element.setAttribute('aria-pressed', String(other.locked)); });
      updateCreatorLabel();
    });
    element.addEventListener('keydown', event => {
      let next;
      if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % topics.length;
      if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index - 1 + topics.length) % topics.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = topics.length - 1;
      if (event.key === 'Escape') { person.locked = false; element.setAttribute('aria-pressed','false'); updateCreatorLabel(); }
      if (next !== undefined) { event.preventDefault(); creators[next].element.focus(); }
    });
    document.querySelector('[data-creator-nodes]').append(element);
    return person;
  });
  function updateCreatorLabel() {
    const person = creators.find(p => p.focused) || creators.find(p => p.hovered) || creators.find(p => p.locked);
    orbitLabel.textContent = person ? `${person.topic} · 创作者示意` : '不同热爱，同频相遇';
  }
  function positionCreators(elapsed) {
    for (const person of creators) {
      if (!(person.hovered || person.focused || person.locked || reduced.matches)) person.angle += elapsed * (.04 + person.orbit * .006) * (person.orbit % 2 ? -1 : 1);
      const rx = orbitWidth * (.30 + person.orbit * .022);
      const ry = orbitHeight * (.20 + person.orbit * .045);
      const rotation = [-.32, .32, 1.04, 2.13][person.orbit];
      const x = Math.cos(person.angle) * rx;
      const y = Math.sin(person.angle) * ry;
      const depth = (Math.sin(person.angle) + 1) / 2;
      const px = orbitWidth * .54 + x * Math.cos(rotation) - y * Math.sin(rotation);
      const py = orbitHeight * .49 + x * Math.sin(rotation) + y * Math.cos(rotation);
      person.element.style.transform = `translate(${px.toFixed(2)}px,${py.toFixed(2)}px) translate(-50%,-50%)`;
      person.element.style.setProperty('--avatar-depth', String(.76 + depth * .24));
      person.element.style.opacity = String(.28 + depth * .65);
      person.element.style.zIndex = String(Math.round(depth * 20) + 1);
    }
  }

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
    orbitWidth = orbit.clientWidth;
    orbitHeight = orbit.clientHeight;
    heroBottom = scenes[0].getBoundingClientRect().bottom + window.scrollY;
    measureOpening();
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
    positionCreators(0);
    dirty = true; lastTime = 0; requestUpdate();
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
      const heading = nextIndex < 2 ? document.getElementById('story') : scenes[nextIndex].querySelector('h1,h2');
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
    orbit.style.opacity = pinned ? String(heroFade * .66) : '';
    [heroActions, orbit].forEach(element => {
      const unavailable = pinned && heroFade < .02;
      if (unavailable && element.contains(document.activeElement)) document.getElementById('story').focus({ preventScroll: true });
      element.toggleAttribute('inert', unavailable);
    });
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
    const expand = smooth(portal / .8);
    const cut = smooth((portal - 1.05) / 1.4);
    film.style.clipPath = pinned ? `inset(${(1-expand)*78}% ${(1-expand)*7.5}% 0 round ${(1-expand)*24}px)` : 'none';
    typeMask.style.opacity = pinned ? String(smooth((portal-1)/.3)) : '0';
    const zoom = Math.exp((1-cut) * Math.log(18));
    letters.setAttribute('transform', `translate(665 470) scale(${zoom.toFixed(4)}) translate(-665 -470)`);
    if (aperture) aperture.style.opacity = String(1-smooth((portal-1.05)/.5));
    subtitle.style.opacity = pinned ? String(smooth((portal-2.35)/.4)) : '1';
    const immersive = pinned && portal > .35 && portal < 2.95;
    header.classList.toggle('is-submerged', immersive);
    root.classList.toggle('is-portal', immersive);
    const railProgress = clamp((units - stops[7] - .15) / 1.15);
    rail.style.transform = pinned ? `translateX(${-railTravel*railProgress}px)` : 'none';
    document.querySelector('[data-case-direction="-1"]').disabled = railProgress <= .01;
    document.querySelector('[data-case-direction="1"]').disabled = railProgress >= .99;
  }
  function canOrbit() { return !reduced.matches && !document.hidden && (pinned ? units < 1.05 : window.scrollY < heroBottom); }
  function tick(now) {
    frame = 0;
    if (dirty) render();
    if (canOrbit()) {
      const elapsed = lastTime ? Math.min((now-lastTime)/1000,.04) : 0;
      lastTime = now; positionCreators(elapsed);
      frame = requestAnimationFrame(tick);
    } else lastTime = 0;
  }
  function requestUpdate() { dirty = true; if (!frame) frame = requestAnimationFrame(tick); }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => configure(), { passive: true });
  reduced.addEventListener('change', () => configure());
  compact.addEventListener('change', () => configure());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { lastTime=0; requestUpdate(); } });
  configure(false);
  if (location.hash.startsWith('#demo-')) {
    const index = scenes.findIndex(scene => `#${scene.id}` === location.hash);
    if (index >= 0) requestAnimationFrame(() => jumpTo(index));
  }
})();

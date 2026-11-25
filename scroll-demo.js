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
  const awards = document.querySelector('[data-case-awards]');
  const film = document.querySelector('[data-case-film]');
  const firstCover = document.querySelector('[data-case-cover]');
  const subtitle = document.querySelector('.portal-subtitle');
  const caseControls = document.querySelector('.case-controls');
  const portalKicker = document.querySelector('.portal-kicker');
  const portalHeading = document.getElementById('cases-intro-title');
  const portalCopy = document.querySelector('.portal-copy');
  const serviceIntroDescription = document.querySelector('.services-intro-copy > p:last-child');
  const valueCards = [...document.querySelectorAll('.value-card')];
  const heroTitle = document.getElementById('hero-title');
  const valuesTitle = document.getElementById('values-title');
  const planetTitleTarget = document.querySelector('[data-planet-title-target]');
  const heroActions = document.querySelector('.hero-actions');
  const heroDots = document.querySelector('[data-hero-dots]');
  const heroDetails = [...document.querySelectorAll('.hero-copy .scene-kicker, .hero-actions, .planet-scroll-cue')];
  const valuesDetails = [...document.querySelectorAll('.scene-values .section-heading > p')];
  // Keep the original headings in the document for semantics and layout. One
  // decorative layer carries the exact same visible title across both scenes.
  const openingTitle = document.createElement('div');
  openingTitle.className = 'opening-title';
  openingTitle.setAttribute('aria-hidden', 'true');
  openingTitle.innerHTML = heroTitle.innerHTML;
  const openingGradient = openingTitle.querySelector('linearGradient');
  if (openingGradient) {
    openingGradient.id = 'opening-title-underline-gradient';
    openingTitle.querySelector('.hero-underline path').setAttribute('stroke', 'url(#opening-title-underline-gradient)');
  }
  const openingLines=[...openingTitle.querySelectorAll('[data-opening-line]')];
  stage.append(openingTitle);
  const stops = [0, 1.1, 2.5, 4.8, 10.2, 14.3, 15.5];
  const awardsStart = 18.15;
  const total = 19.65;
  // Viewport-height distances keep every pose reversible and independent of time.
  const serviceIntro = { enterStart: 2.1, enterEnd: 2.9, exitOvershoot: 0 };
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
    requestUpdate();
  }
  setTheme(root.dataset.heroEffect==='planet' ? 'dark' : savedTheme || (themePreference.matches ? 'dark' : 'light'));
  themeButton.addEventListener('click', () => setTheme(root.dataset.mode === 'dark' ? 'light' : 'dark', true));
  themePreference.addEventListener('change', event => { if (!savedTheme && root.dataset.heroEffect!=='planet') setTheme(event.matches ? 'dark' : 'light'); });

  const fineHover = matchMedia('(hover: hover) and (pointer: fine)');
  const tiltResets = valueCards.map(outer => {
    const surface = outer.querySelector('.t-tilt-card');
    if (!surface) return () => {};
    const reset = () => {
      if (!outer.classList.contains('is-hover')) return;
      outer.classList.remove('is-hover');
      surface.classList.remove('is-tilting');
      surface.style.setProperty('--tilt-rx', '0deg');
      surface.style.setProperty('--tilt-ry', '0deg');
    };
    outer.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || reduced.matches || !fineHover.matches) return;
      const bounds = outer.getBoundingClientRect();
      const x = clamp((event.clientX-bounds.left)/bounds.width);
      const y = clamp((event.clientY-bounds.top)/bounds.height);
      const max = Number(getComputedStyle(outer).getPropertyValue('--value-tilt-angle'));
      outer.classList.add('is-hover'); surface.classList.add('is-tilting');
      // Positive X at the top / Y at the right push the pointer's corner
      // toward negative Z; the opposite corner rises toward the viewer.
      surface.style.setProperty('--tilt-rx', `${(1-2*y)*max}deg`);
      surface.style.setProperty('--tilt-ry', `${(2*x-1)*max}deg`);
      surface.style.setProperty('--tilt-gx', `${x*100}%`);
      surface.style.setProperty('--tilt-gy', `${y*100}%`);
    });
    ['pointerleave','pointercancel'].forEach(name => outer.addEventListener(name, reset));
    return reset;
  });
  const resetTilts = () => tiltResets.forEach(reset => reset());
  window.addEventListener('scroll', resetTilts, { passive:true });
  window.addEventListener('blur', resetTilts);
  reduced.addEventListener('change', resetTilts);
  fineHover.addEventListener('change', resetTilts);

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
    if (root.dataset.heroEffect==='planet') {
      const sourceStyle=getComputedStyle(heroTitle);
      const targetStyle=getComputedStyle(planetTitleTarget);
      const scale=parseFloat(targetStyle.fontSize)/parseFloat(sourceStyle.fontSize);
      const leading=parseFloat(sourceStyle.lineHeight);
      const targets=[...planetTitleTarget.querySelectorAll('[data-handoff-line]')];
      openingGeometry={
        scale,viewportWidth:stage.clientWidth,
        stagger:parseFloat(getComputedStyle(root).getPropertyValue('--planet-title-handoff-stagger')) || 128,
        lines:[...heroTitle.querySelectorAll(':scope > [data-opening-line]')].map((line,index)=>{
          const target=targets[index].getBoundingClientRect();
          return {startX:start.left-hero.left,startY:start.top-hero.top+index*leading,
            endX:target.left-values.left,endY:target.top-values.top+(target.height-leading*scale)/2,
            width:line.querySelector('.planet-title-ink').offsetWidth,leading};
        })
      };
      openingTitle.style.width=`${heroTitle.offsetWidth}px`;
      return;
    }
    // Subtract the scene bounds so a resize during scrub cannot capture its
    // current translation as part of either layout endpoint.
    openingGeometry = {
      startX: start.left - hero.left, startY: start.top - hero.top,
      endX: end.left - values.left, endY: end.top - values.top,
      scale: parseFloat(getComputedStyle(valuesTitle).fontSize) / parseFloat(getComputedStyle(heroTitle).fontSize),
      lines:[...heroTitle.querySelectorAll(':scope > [data-opening-line]')].map((line,index)=>{
        const from=line.getBoundingClientRect();
        const to=valuesTitle.querySelectorAll('[data-opening-line]')[index].getBoundingClientRect();
        return {startX:from.left-hero.left,startY:from.top-hero.top,endX:to.left-values.left,endY:to.top-values.top};
      })
    };
    openingTitle.style.width = `${heroTitle.offsetWidth}px`;
  }
  function measurePortal() {
    if (!pinned) return;
    awards.style.setProperty('--case-copy-bottom', `${portalCopy.offsetTop + portalCopy.offsetHeight}px`);
    // Measure the resting card, excluding current scroll transforms. Restore
    // immediately before paint so resize/reverse cannot contaminate the target.
    const railTransform = rail.style.transform;
    const awardsTransform = awards.style.transform;
    rail.style.transform = 'none';
    awards.style.transform = 'none';
    const scene = scenes[6].getBoundingClientRect();
    const cover = firstCover.getBoundingClientRect();
    portalGeometry = {
      width: stage.clientWidth, height: stage.clientHeight,
      x: cover.left - scene.left, y: cover.top - scene.top,
      coverWidth: cover.width, coverHeight: cover.height,
      radius: parseFloat(getComputedStyle(firstCover).borderRadius) || 0,
    };
    rail.style.transform = railTransform;
    awards.style.transform = awardsTransform;
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
    serviceIntro.exitOvershoot = parseFloat(getComputedStyle(root).getPropertyValue('--planet-services-inset')) || 0;
    track.style.height = pinned ? `${(total + 1) * height}px` : 'auto';
    serviceData.forEach(data => { const first = data.frames[0].offsetTop; data.offsets = data.frames.map(item => item.offsetTop - first); });
    const gutter = parseFloat(getComputedStyle(awards).paddingLeft);
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
    const fraction = clamp((units - awardsStart - .15) / 1.15);
    const target = clamp(fraction + Number(button.dataset.caseDirection) * .5);
    jumpTo(6, awardsStart + .15 + target * 1.15 - stops[6]);
  }));

  function render() {
    dirty = false;
    units = clamp(window.scrollY / height, 0, total);
    const headerProgress = reduced.matches ? Number(window.scrollY > 0) : smooth(window.scrollY / Math.min(280, height * .32));
    header.style.setProperty('--header-progress', String(headerProgress));
    const isPlanet=root.dataset.heroEffect==='planet';
    const openingProgress = isPlanet ? clamp((units-.04)/1.06) : smooth((units-.06)/1.04);
    const introEnter = smooth((units - serviceIntro.enterStart) / (serviceIntro.enterEnd - serviceIntro.enterStart));
    const serviceProgress = serviceTransitions.map(transition => smooth((units - transition.morphStart) / (transition.morphEnd - transition.morphStart)));
    const openingExit = introEnter;
    const openingShift = -openingExit * (height + (isPlanet ? serviceIntro.exitOvershoot : 0));
    const heroFade = 1 - smooth((units - .08) / .67);
    let nextIndex = 0;
    let bestOpacity = -1;
    scenes.forEach((scene, i) => {
      const incoming = serviceTransitions.findIndex(transition => transition.to === i);
      const outgoing = serviceTransitions.findIndex(transition => transition.from === i);
      const enter = i === 0 ? 1 : i === 2 ? introEnter : incoming >= 0 ? serviceProgress[incoming] : smooth((units - stops[i] + .17) / .34);
      const exit = i === scenes.length - 1 ? 1 : i === 1 ? 1 - introEnter : outgoing >= 0 ? 1 - serviceProgress[outgoing] : 1 - smooth((units - stops[i+1] + .17) / .34);
      const opacity = isPlanet&&i===0 ? 1-smooth((units-.55)/.45) : isPlanet&&i===1 ? smooth((units-.45)/.45)*exit : enter*exit;
      if (opacity > bestOpacity) { bestOpacity = opacity; nextIndex = i; }
      scene.classList.toggle('is-active', !pinned || (i < 2 ? openingExit < 1 : opacity > .002));
      // Adjacent pages share one moving edge: no overlapping, ghosted copy.
      scene.style.opacity = '1';
      // Both text sections share one moving edge, timed with the band morph.
      // The incoming content keeps moving until the icon reaches its endpoint.
      let shift = (1 - enter) * height - (1 - exit) * height;
      if (outgoing > 0) {
        const transition = serviceTransitions[outgoing];
        const rise = smooth((units-transition.bandStart)/(transition.bandEnd-transition.bandStart));
        const morph = serviceProgress[outgoing];
        shift = (1-enter)*height - height*(.44*rise*(1-morph)+morph);
      }
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
    const planetRise=smooth(openingProgress*1.1);
    const planetAlign=smooth((openingProgress-.35)/.65);
    const planetJoin=smooth((openingProgress-.35)/.23);
    const planetMerge=smooth((openingProgress-.58)/.42);
    const planetNaturalScale=1+((g.scale||1)-1)*planetAlign;
    const planetCombinedWidth=isPlanet&&g.lines?.length ? g.lines.reduce((sum,line)=>sum+line.width,0) : 0;
    const planetFitScale=planetCombinedWidth ? Math.min(planetNaturalScale,(g.viewportWidth-2*g.lines[0].startX)/planetCombinedWidth) : planetNaturalScale;
    // A narrow desktop must fit the joined sentence before its rows merge.
    const planetScale=planetNaturalScale+(planetFitScale-planetNaturalScale)*planetJoin;
    const planetTitleY=g.lines?.length ? g.lines[0].startY+(g.lines[0].endY-g.lines[0].startY)*planetRise : 0;
    openingTitle.style.transform = `translateY(${openingShift}px)`;
    openingTitle.style.setProperty('--planet-title-handoff',String(isPlanet ? planetAlign : 0));
    openingLines.forEach((line,index)=>{
      const l=g.lines?.[index];
      if (!pinned || !l) { line.style.transform=''; return; }
      if (isPlanet) {
        const first=g.lines[0];
        const naturalX=first.startX+(first.endX-first.startX)*planetAlign;
        const fittedX=Math.min(naturalX,g.viewportWidth-first.startX-planetCombinedWidth*planetScale);
        const firstX=Math.max(first.startX,naturalX+(fittedX-naturalX)*planetJoin);
        const stagger=Math.min(g.stagger,Math.max(0,g.viewportWidth-2*first.startX-l.width))*Math.sin(Math.PI*clamp(openingProgress/.7))*(1-planetJoin);
        const offset=first.width*planetScale*planetJoin+stagger;
        const x=index ? firstX+Math.min(offset,g.viewportWidth-first.startX-firstX-l.width*planetScale) : firstX;
        const y=planetTitleY+(index ? (l.startY-first.startY)*planetScale*(1-planetMerge) : 0);
        line.style.transform=`translate(${x}px,${y}px) scale(${planetScale})`;
        return;
      }
      line.style.transform=`translate(${l.startX+(l.endX-l.startX)*openingProgress}px,${l.startY+(l.endY-l.startY)*openingProgress}px) scale(${1+(g.scale-1)*openingProgress})`;
    });
    const underline=openingTitle.querySelector('.hero-underline');
    if(underline)underline.style.opacity=String(1-openingProgress);
    const cue=document.querySelector('.planet-scroll-cue');
    cue?.toggleAttribute('inert',pinned && openingProgress>.8);
    const planetTitleLanded=isPlanet&&openingProgress>=1;
    openingTitle.style.visibility = pinned && openingExit < 1 && !planetTitleLanded ? 'visible' : 'hidden';
    heroDetails.forEach(element => {
      element.style.opacity = pinned ? String(heroFade) : '';
      const rise=isPlanet&&g.lines?.length ? planetTitleY-g.lines[0].startY : -openingProgress*36;
      element.style.transform = pinned ? `translateY(${rise}px)` : '';
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
    const valuesFade=smooth((units-.65)/.45);
    valuesDetails.forEach(element => { element.style.opacity = pinned ? String(isPlanet ? Number(planetTitleLanded) : valuesFade) : ''; });
    const planetStatementEnter=smooth((units-.9)/.35);
    valuesTitle.style.opacity=pinned&&isPlanet ? String(planetStatementEnter) : '';
    valuesTitle.style.transform=pinned&&isPlanet ? `translateY(${(1-planetStatementEnter)*24}px)` : '';
    valueCards.forEach((card, i) => {
      const entry = isPlanet ? smooth((units-.35-i*.08)/.85) : smooth((units-.7-i*.055)/.5);
      card.style.opacity = pinned ? String(entry) : '1';
      card.style.transform = pinned ? `translateY(${(1-entry)*(isPlanet?Math.min(height*.62,560):120)}px)` : 'none';
    });
    // The planet design brings the complete copy group in with the white page.
    // Other themes retain their independently trailing description.
    if (serviceIntroDescription) {
      const follow = smooth((units - 2.35) / .75);
      const leaving = serviceProgress[0];
      const lag = parseFloat(getComputedStyle(root).getPropertyValue('--service-description-lag'));
      serviceIntroDescription.style.transform = pinned && !isPlanet ? `translateY(${(1-follow)*lag + leaving*(1-leaving)*lag}px)` : '';
    }
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
    const shrink = smooth((portal - .65) / 1.8);
    const copyReveal = pinned ? smooth((portal - 1.25) / .95) : 1;
    portalCopy.style.opacity = String(copyReveal);
    portalCopy.style.transform = pinned ? `translateY(${(1-copyReveal) * 72}px)` : '';
    caseControls.toggleAttribute('inert', pinned && shrink < 1);
    const awardsReveal = pinned ? smooth((portal - 1.65) / .8) : 1;
    awards.style.opacity = String(awardsReveal);
    awards.style.transform = 'none';
    awards.toggleAttribute('inert', pinned && shrink < 1);
    if (pinned && shrink < 1) awards.setAttribute('aria-hidden', 'true');
    else awards.removeAttribute('aria-hidden');
    if (pinned && portalGeometry) {
      const p = portalGeometry;
      film.style.left = `${p.x * shrink}px`;
      film.style.top = `${p.y * shrink}px`;
      film.style.width = `${p.width + (p.coverWidth-p.width) * shrink}px`;
      film.style.height = `${p.height + (p.coverHeight-p.height) * shrink}px`;
      film.style.borderRadius = `${p.radius * shrink}px`;
      // At the exact endpoint the matching image inside the rail takes over.
      film.style.visibility = shrink < 1 ? 'visible' : 'hidden';
    } else {
      ['left','top','width','height','borderRadius','visibility'].forEach(key => { film.style[key] = ''; });
    }
    syncPlanetHeader();
    header.classList.remove('is-submerged');
    root.classList.remove('is-portal');
    const railProgress = clamp((units - awardsStart - .15) / 1.15);
    rail.style.transform = pinned ? `translateX(${-railTravel*railProgress}px)` : 'none';
    document.querySelector('[data-case-direction="-1"]').disabled = railProgress <= .01;
    document.querySelector('[data-case-direction="1"]').disabled = railProgress >= .99;
  }
  function syncPlanetHeader() {
    if(root.dataset.heroEffect!=='planet') {
      delete header.dataset.surface;delete header.dataset.stuck;return;
    }
    header.dataset.stuck=String(window.scrollY>1);
    // Ignore header descendants when sampling the content underneath it.
    // Sample either side of the central nav; use the first painted backdrop.
    const sampleX=Math.min(window.innerWidth-24,window.innerWidth*.3);
    const sampleY=Math.min(header.getBoundingClientRect().bottom/2,40);
    const layers=document.elementsFromPoint(sampleX,sampleY);
    let color=null;
    for(const element of layers) {
      if(element===header||header.contains(element)||element.closest('.opening-title,.hero-creator-card'))continue;
      const style=getComputedStyle(element);
      if(Number(style.opacity)<.05)continue;
      const rgba=style.backgroundColor.match(/[\d.]+/g)?.map(Number);
      if(rgba?.length>=3&&(rgba[3]??1)>.8){color=rgba;break;}
    }
    if(!color) {
      const bg=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.map(Number);
      color=bg||[0,0,0];
    }
    const linear=color.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
    const luminance=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
    header.dataset.surface=luminance>.42?'light':'dark';
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
  let planetIntroSequence=0;
  let planetIntroTimer=0;
  function startPlanetIntro() {
    const sequence=++planetIntroSequence;
    clearTimeout(planetIntroTimer);
    root.classList.remove('planet-title-entering','planet-intro-pending');
    if(root.dataset.heroEffect!=='planet'||reduced.matches||window.scrollY>24)return;
    root.classList.add('planet-intro-pending');
    const fonts=document.fonts?.ready||Promise.resolve();
    fonts.then(()=>requestAnimationFrame(()=>{
      if(sequence!==planetIntroSequence||root.dataset.heroEffect!=='planet')return;
      root.classList.remove('planet-intro-pending');
      root.classList.add('planet-title-entering');
      planetIntroTimer=setTimeout(()=>root.classList.remove('planet-title-entering'),1800);
    }));
  }
  window.addEventListener('scroll',()=>{
    if(window.scrollY>24){planetIntroSequence++;root.classList.remove('planet-intro-pending','planet-title-entering');}
  },{passive:true});
  window.addEventListener('hero-effect-change',()=>{
    setTheme(root.dataset.heroEffect==='planet' ? 'dark' : savedTheme || (themePreference.matches ? 'dark' : 'light'));
    configure();
    startPlanetIntro();
  });
  configure(false);
  startPlanetIntro();
  if (document.fonts?.ready) document.fonts.ready.then(() => { measureOpening(); measurePortal(); requestUpdate(); });
  if (location.hash.startsWith('#demo-')) {
    const index = scenes.findIndex(scene => `#${scene.id}` === location.hash);
    if (index >= 0) requestAnimationFrame(() => jumpTo(index));
  }
})();

/* Creator planet 2: independent snapshot of deployed 538dadb. */

/* ===== scroll-demo.js ===== */
(() => {
  'use strict';
  const root = document.documentElement;
  const track = document.querySelector('[data-story-track]');
  const stage = document.querySelector('[data-story-stage]');
  const scenes = [...track.querySelectorAll('[data-scene]')];
  const header = document.querySelector('[data-header]');
  const themeButton = document.querySelector('[data-theme-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:1100px), (max-height:620px)');
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
  const portalSummary = document.querySelector('.portal-summary');
  const caseMediaTarget = document.querySelector('.planet2-case-media-target');
  const serviceIntroDescription = document.querySelector('.services-intro-copy > p:last-child');
  const valueCards = [...document.querySelectorAll('.value-card')];
  const valueGrid = document.querySelector('[data-values]');
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
  const caseTiming = {
    enter:[15.15,16.15], center:[16.15,17.55],
    awards:[17.95,18.45], reading:17.75, railDuration:1.15,
  };
  const awardsStart = caseTiming.awards[1];
  const total = 20.05;
  // Viewport-height distances keep every pose reversible and independent of time.
  const serviceIntro = { enterStart: 2.1, enterEnd: 2.9, exitOvershoot: 0 };
  const planetServices = {
    content: document.querySelector('.services-intro-content'),
    details: [],
    geometry: null,
  };
  // The left column stays on the white page. Only image cards move. These
  // viewport-height keyframes include reading holds and a gap between topics.
  const planetServiceTiming = [
    { start:2.9, end:8.05, jump:3.1, enter:null, exits:[[3.5,4.6],[4.95,6.05],[6.4,7.5],[8.05,9.05]] },
    { start:8.05, end:12.15, jump:9.25, enter:[8.05,9.05], exits:[[9.55,10.45],[10.8,11.7],[12.15,13.15]] },
    { start:12.15, end:15.15, jump:13.45, enter:[12.15,13.15], exits:[] },
  ];
  planetServices.details = [...document.querySelectorAll('[data-planet2-service-topic]')].map((section,index)=>({
    section,
    key:section.dataset.planet2ServiceTopic,
    label:section.querySelector('h3'),
    button:document.querySelector(`[data-planet2-service-jump="${section.dataset.planet2ServiceTopic}"]`),
    cards:[...section.querySelectorAll('[data-service-stack-card]')],
    timing:planetServiceTiming[index],
    currentCardIndex:0,
  }));
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
  let openingCards = [];
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
  const tiltCards = [...valueCards, ...document.querySelectorAll('.planet-service-gallery > .t-tilt')];
  const tiltResets = tiltCards.map(outer => {
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
    scenes.forEach((scene, i) => { if (scene.getClientRects().length && scene.getBoundingClientRect().top <= window.innerHeight * .4) index = i; });
    return index;
  }
  function measureOpening() {
    if (!pinned) return;
    // The endpoint is the authored layout, independent of the current scrub.
    valuesDetails.forEach(element => { element.style.transform = ''; });
    valueCards.forEach(card=>{card.style.height='';card.style.setProperty('--planet2-card-scatter','0');});
    const start = heroTitle.getBoundingClientRect();
    const end = valuesTitle.getBoundingClientRect();
    const hero = scenes[0].getBoundingClientRect();
    const values = scenes[1].getBoundingClientRect();
    if (root.dataset.heroEffect==='planet') {
      const sourceStyle=getComputedStyle(heroTitle);
      const targetStyle=getComputedStyle(planetTitleTarget);
      const scale=parseFloat(targetStyle.fontSize)/parseFloat(sourceStyle.fontSize);
      const leading=parseFloat(sourceStyle.lineHeight);
      const reveal=heroTitle.closest('.planet2-copy-reveal');
      // Measure the authored resting layout, even if resize happens during
      // the entry wrapper's upward animation.
      const revealShift=reveal ? new DOMMatrixReadOnly(getComputedStyle(reveal).transform).m42 : 0;
      const targets=[...planetTitleTarget.querySelectorAll('[data-handoff-line]')];
      openingGeometry={
        scale,viewportWidth:stage.clientWidth,
        stagger:parseFloat(getComputedStyle(root).getPropertyValue('--planet-title-handoff-stagger')) || 128,
        lines:[...heroTitle.querySelectorAll(':scope > [data-opening-line]')].map((line,index)=>{
          const target=targets[index].getBoundingClientRect();
          const from=line.getBoundingClientRect();
          return {startX:from.left-hero.left,startY:from.top-hero.top-revealShift,
            endX:target.left-values.left,endY:target.top-values.top+(target.height-leading*scale)/2,
            width:line.querySelector('.planet-title-ink').offsetWidth,leading};
        })
      };
      openingTitle.style.width=`${heroTitle.offsetWidth}px`;
      openingCards=valueCards.map(card=>({x:valueGrid.offsetLeft+card.offsetLeft,
        y:valueGrid.offsetTop+card.offsetTop,width:card.offsetWidth,height:card.offsetHeight}));
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
  function renderPlanet2Opening() {
    if(root.dataset.heroVariant!=='planet2')return;
    const grow=pinned?smooth((units-.04)/.76):0;
    const spread=pinned?smooth((units-.8)/.65):0;
    const scatter=pinned?smooth((units-1.85)/.51):0;
    const leave=pinned?smooth((units-2.36)/.54):0;
    const titleLift=54*height/900*grow*(1-spread);
    const titleExit=387*height/900*scatter;
    const titleLanded=spread===1;
    heroDots.style.opacity=String(1-.9*grow-.05*spread);
    heroDots.style.setProperty('--fire-scroll',String(grow));
    heroDots.style.setProperty('--planet2-sphere-spread',String(spread));
    heroDots.dispatchEvent(new Event('hero-progress'));
    root.classList.toggle('planet2-title-scrubbing',pinned&&units>.04);
    openingTitle.style.visibility=pinned&&units>.04&&!titleLanded?'visible':'hidden';
    openingTitle.style.transform='none';
    openingTitle.style.opacity=String(1-.5*spread);
    openingLines.forEach((line,index)=>{
      const l=openingGeometry.lines?.[index];
      if(!pinned||!l)return;
      const scale=1+(openingGeometry.scale-1)*spread;
      line.style.transform=`translate(${l.startX+(l.endX-l.startX)*spread}px,${l.startY+(l.endY-l.startY)*spread-titleLift}px) scale(${scale})`;
    });
    heroDetails.forEach(element=>{
      const cue=element.classList.contains('planet-scroll-cue');
      const kicker=element.classList.contains('scene-kicker');
      const alpha=cue?1-smooth((units-.04)/.3):(1-(kicker ? .3 : .8)*grow)*(1-spread);
      element.style.opacity=pinned?String(alpha):'';
      element.style.transform=pinned?`translateY(${-54*height/900*grow}px)`:'';
    });
    heroActions.toggleAttribute('inert',pinned&&units>.15);
    valuesDetails.forEach(element=>{
      element.style.opacity=pinned?String(Number(titleLanded)):'';
      element.style.transform=pinned?`translateY(${-titleExit-height*leave}px)`:'';
    });
    const statement=pinned?smooth((units-.98)/.47):1;
    valuesTitle.style.opacity=String(statement);
    valuesTitle.style.transform=pinned?`translateY(${(1-statement)*24-titleExit-height*leave}px)`:'';
    if(!pinned){
      valueCards.forEach(card=>{card.style.height='';card.style.removeProperty('--planet2-card-scatter');card.style.removeProperty('--planet2-value-rgb');});
      return;
    }
    // Centers are from the stacked and scattered Figma storyboards. Only the
    // article moves; its inner surface retains the existing hover treatment.
    const stackX=[493.676,707.146,915.906,1129.036];
    const stackAngle=[-10,-2.46,10,2.37];
    const scatterX=[179,593,1007,1421],scatterY=[237,181,181,237];
    const scatterAngle=[-8,-4,4,8];
    const appear=smooth((units-.18)/.62);
    valueCards.forEach((card,index)=>{
      const g=openingCards[index];
      if(!g)return;
      const stackLeft=stackX[index]*stage.clientWidth/1600-g.width/2;
      const stackTop=height*634.25/900+(1-appear)*height*.42;
      const left=stackLeft+(g.x-stackLeft)*spread;
      const top=stackTop+(g.y-stackTop)*spread;
      const endLeft=scatterX[index]*stage.clientWidth/1600-g.width/2;
      const cardHeight=g.height+(Math.max(g.height,440*stage.clientWidth/1600)-g.height)*scatter;
      const endTop=scatterY[index]*height/900-cardHeight/2;
      const x=left+(endLeft-left)*scatter-g.x;
      const y=top+(endTop-top)*scatter-g.y-height*leave;
      const angle=stackAngle[index]*(1-spread)*(1-scatter)+scatterAngle[index]*scatter;
      const alpha=[.5,.9,.5,.9][index];
      card.style.height=`${cardHeight}px`;
      card.style.setProperty('--planet2-card-scatter',String(scatter));
      const shade=31-11*scatter;
      card.style.setProperty('--planet2-value-rgb',`${shade},${shade},${shade}`);
      card.style.setProperty('--planet2-value-alpha',String(alpha+(.72-alpha)*spread+(.9-.72)*scatter));
      card.style.opacity=String(smooth((units-.18)/.22));
      card.style.transform=`translate(${x}px,${y}px) rotate(${angle}deg)`;
    });
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
    const target = caseMediaTarget.getBoundingClientRect();
    const copyStyle = getComputedStyle(portalCopy);
    const targetStyle = getComputedStyle(caseMediaTarget);
    portalGeometry.center = {
      x:target.left-scene.left, y:target.top-scene.top,
      width:target.width, height:target.height,
      radius:parseFloat(targetStyle.borderRadius),
    };
    portalGeometry.copy = {
      top:parseFloat(copyStyle.top),
      kickerX:(portalCopy.clientWidth-portalKicker.offsetWidth)/2,
      headingX:(portalCopy.clientWidth-portalHeading.offsetWidth)/2,
    };
    rail.style.transform = railTransform;
    awards.style.transform = awardsTransform;
  }
  function measurePlanetServices() {
    const p=planetServices;
    p.content.style.transform='';
    if(!pinned){p.geometry=null;return;}
    const art=document.querySelector('[data-planet2-service-stage]');
    const overview=document.querySelector('.planet2-service-overview');
    const style=getComputedStyle(overview);
    p.geometry={
      width:art.clientWidth,
      top:parseFloat(style.paddingTop),
      stackOffset:parseFloat(style.getPropertyValue('--planet2-service-back-top'))||44,
      stackInset:16,
      exitGap:64,
      topicGap:178,
    };
  }
  function serviceCardPose(detail,index,scrollUnits,g) {
    const progress=range=>range?clamp((scrollUnits-range[0])/(range[1]-range[0])):0;
    const promotion=index?progress(detail.timing.exits[index-1]):1;
    const leaving=progress(detail.timing.exits[index]);
    const image=detail.cards[index].querySelector('img');
    const cardHeight=g.width*Number(image.getAttribute('height'))/Number(image.getAttribute('width'));
    const entry=detail.timing.enter?1-progress(detail.timing.enter):0;
    const entryDistance=Math.max(cardHeight+g.topicGap,height+g.topicGap-g.top);
    return {
      y:g.stackOffset*(1-promotion)-leaving*(g.top+cardHeight+g.exitGap)+entry*entryDistance,
      scale:1-2*g.stackInset/g.width*(1-promotion),
      shade:.08*(1-promotion),
      cardHeight,
    };
  }
  function renderPlanetServices(isPlanet) {
    const p=planetServices;
    const animated=pinned&&isPlanet&&p.geometry;
    let activeIndex=0;
    if(animated) {
      p.details.forEach((detail,index)=>{if(units>=detail.timing.start)activeIndex=index;});
    } else {
      p.details.forEach((detail,index)=>{if(detail.section.getBoundingClientRect().top<=height*.45)activeIndex=index;});
    }
    p.content.style.transform='';
    p.details.forEach((detail,topicIndex)=>{
      detail.section.style.opacity='1';
      detail.section.style.visibility='visible';
      const active=topicIndex===activeIndex;
      if(active)detail.button.setAttribute('aria-current','step');
      else detail.button.removeAttribute('aria-current');
      let progress;
      if(animated)progress=clamp((units-detail.timing.start)/(detail.timing.end-detail.timing.start));
      else {
        const rect=detail.section.getBoundingClientRect();
        progress=clamp((height*.45-rect.top)/Math.max(1,rect.height-height*.55));
      }
      detail.button.style.setProperty('--planet2-service-progress',String(active?progress:0));
      // Upcoming image descriptions remain unavailable until their topic is
      // reached. Visible outgoing cards can continue under the fixed header.
      if(animated&&units<detail.timing.start)detail.section.setAttribute('aria-hidden','true');
      else detail.section.removeAttribute('aria-hidden');
      detail.currentCardIndex=0;
      detail.cards.forEach((card,index)=>{
        if(!animated){
          card.style.transform='';card.style.visibility='';card.style.zIndex='';
          card.style.removeProperty('--planet2-service-card-shade');card.removeAttribute('aria-hidden');
          if(card.getBoundingClientRect().top<=height*.45)detail.currentCardIndex=index;
          return;
        }
        const pose=serviceCardPose(detail,index,units,p.geometry);
        const entered=!detail.timing.enter||units>=detail.timing.enter[0];
        const visible=entered&&p.geometry.top+pose.y+pose.cardHeight*pose.scale>0&&p.geometry.top+pose.y<height;
        card.style.transform=`translate3d(0,${pose.y}px,0) scale(${pose.scale})`;
        card.style.zIndex=String(detail.cards.length-index);
        card.style.visibility=visible?'visible':'hidden';
        card.querySelector('.planet2-service-card-shade').style.opacity=String(pose.shade);
        if(visible)card.removeAttribute('aria-hidden');
        else card.setAttribute('aria-hidden','true');
        if(index&&units>=detail.timing.exits[index-1][1])detail.currentCardIndex=index;
      });
    });
  }
  function configure(preserve = true) {
    const oldPinned = pinned;
    // Resize and media-query events can arrive before the queued render.
    // Read the actual scroll position so the second configure cannot restore
    // the stale units from before the breakpoint change.
    const oldUnits = oldPinned ? window.scrollY/height : units;
    // A viewport resize reflows the natural layout before this handler runs.
    // Keep the last rendered case anchor instead of sampling its new position.
    const oldIndex = oldPinned || currentIndex === 6 ? currentIndex : nearestScene();
    const oldService = root.dataset.heroEffect === 'planet' && oldIndex === 2
      ? [...planetServices.details].reverse().find(detail => oldPinned
        ? oldUnits >= detail.timing.start
        : detail.section.getBoundingClientRect().top <= window.innerHeight*.4)
      : null;
    const oldReadingCard=oldService?.cards[oldService.currentCardIndex];
    const oldCardStop=oldService ? (oldService.currentCardIndex
      ? oldService.timing.exits[oldService.currentCardIndex-1][1]+.1 : oldService.timing.jump) : null;
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
    measurePlanetServices();
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
      else if (pinned) top = (oldPinned ? oldUnits : oldService ? oldCardStop : oldIndex === 6 ? caseTiming.reading : stops[oldIndex] + .22) * height;
      else if (oldPinned) top = oldService
        ? window.scrollY+(oldReadingCard||oldService.section).getBoundingClientRect().top-96
        : scenes[oldIndex].offsetTop-96;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }
    requestUpdate();
  }

  function jumpTo(index, offset = .22, instant = false) {
    const behavior = instant || reduced.matches ? 'instant' : 'smooth';
    if (pinned && index === 6 && offset === .22) {
      window.scrollTo({top:caseTiming.reading*height,behavior});
      return;
    }
    if (root.dataset.heroEffect === 'planet' && index >= 3 && index <= 5) {
      const detail = planetServices.details[index-3];
      if (pinned) window.scrollTo({ top: detail.timing.jump*height, behavior });
      else detail.section.scrollIntoView({ behavior, block: 'start' });
      return;
    }
    if (pinned) window.scrollTo({ top: (stops[index] + offset) * height, behavior });
    else scenes[index].scrollIntoView({ behavior, block: 'start' });
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
  document.querySelectorAll('[data-planet2-service-jump]').forEach(button=>{
    button.addEventListener('click',()=>{
      const index=planetServices.details.findIndex(detail=>detail.key===button.dataset.planet2ServiceJump);
      if(index<0)return;
      jumpTo(index+3);
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
    const fraction = clamp((units - awardsStart - .15) / caseTiming.railDuration);
    const target = clamp(fraction + Number(button.dataset.caseDirection) * .5);
    jumpTo(6, awardsStart + .15 + target * caseTiming.railDuration - stops[6]);
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
    // The white page and black case page share a single moving edge.
    // A full viewport of travel preserves the analysis reading hold and the
    // partially visible service/case composition in the first storyboard.
    const caseEnter = clamp((units-caseTiming.enter[0])/(caseTiming.enter[1]-caseTiming.enter[0]));
    let nextIndex = 0;
    let bestOpacity = -1;
    scenes.forEach((scene, i) => {
      const incoming = serviceTransitions.findIndex(transition => transition.to === i);
      // The planet theme carries selection, delivery and analysis on one
      // white page. Its outgoing edge is shared with the cases entrance.
      const outgoing = isPlanet && i === 2 ? -1 : serviceTransitions.findIndex(transition => transition.from === i);
      const enter = i === 0 ? 1 : i === 2 ? introEnter : i === 6 ? caseEnter : incoming >= 0 ? serviceProgress[incoming] : smooth((units - stops[i] + .17) / .34);
      const nextStop = isPlanet && i === 2 ? stops[6] : stops[i+1];
      const exit = i === scenes.length - 1 ? 1 : isPlanet && i === 2 ? 1-caseEnter : i === 1 ? 1 - introEnter : outgoing >= 0 ? 1 - serviceProgress[outgoing] : 1 - smooth((units - nextStop + .17) / .34);
      const opacity = isPlanet&&i>=3&&i<=5 ? 0 : isPlanet&&i===0 ? 1-smooth((units-.55)/.45) : isPlanet&&i===1 ? smooth((units-.45)/.45)*exit : enter*exit;
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
      scene.style.transform = pinned ? `translateY(${(i < 2 && root.dataset.heroVariant==='planet2' ? 0 : i < 2 ? openingShift : shift).toFixed(2)}px)` : 'none';
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
      const available = (!pinned || index === currentIndex) && !(isPlanet && index >= 3 && index <= 5);
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
      if (isPlanet && root.dataset.heroVariant === 'planet2') {
        const progress = smooth(openingProgress);
        const scale = 1 + (g.scale - 1) * progress;
        const x = l.startX + (l.endX - l.startX) * progress;
        const y = l.startY + (l.endY - l.startY) * progress;
        line.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
        return;
      }
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
    openingTitle.style.visibility = pinned && units > .04 && openingExit < 1 && !planetTitleLanded ? 'visible' : 'hidden';
    root.classList.toggle('planet2-title-scrubbing', pinned && units > .04);
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
    scenes[1].style.setProperty('--planet2-values-backdrop',String(smooth((units-.45)/.45)));
    valuesDetails.forEach(element => { element.style.opacity = pinned ? String(isPlanet ? Number(planetTitleLanded) : valuesFade) : ''; });
    const planetStatementEnter=smooth((units-.9)/.35);
    valuesTitle.style.opacity=pinned&&isPlanet ? String(planetStatementEnter) : '';
    valuesTitle.style.transform=pinned&&isPlanet ? `translateY(${(1-planetStatementEnter)*24}px)` : '';
    valueCards.forEach((card, i) => {
      const entry = isPlanet ? smooth((units-.35-i*.08)/.85) : smooth((units-.7-i*.055)/.5);
      card.style.opacity = pinned ? String(entry) : '1';
      card.style.transform = pinned ? `translateY(${(1-entry)*(isPlanet?Math.min(height*.62,560):120)}px)` : 'none';
    });
    renderPlanet2Opening();
    // The planet design brings the complete copy group in with the white page.
    // Other themes retain their independently trailing description.
    if (serviceIntroDescription) {
      const follow = smooth((units - 2.35) / .75);
      const leaving = serviceProgress[0];
      const lag = parseFloat(getComputedStyle(root).getPropertyValue('--service-description-lag'));
      serviceIntroDescription.style.transform = pinned && !isPlanet ? `translateY(${(1-follow)*lag + leaving*(1-leaving)*lag}px)` : '';
    }
    renderPlanetServices(isPlanet);
    serviceData.forEach(data => {
      if (isPlanet) return;
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
      if (isPlanet) {
        transition.element.style.visibility = 'hidden';
        transition.symbol.style.visibility = '';
        return;
      }
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
    const center = smooth((units-caseTiming.center[0])/(caseTiming.center[1]-caseTiming.center[0]));
    const handoff = smooth((units-caseTiming.awards[0])/(caseTiming.awards[1]-caseTiming.awards[0]));
    portalCopy.style.opacity = '1';
    portalSummary.style.opacity = pinned ? String(handoff) : '';
    portalSummary.style.visibility = pinned && handoff < .01 ? 'hidden' : '';
    caseControls.toggleAttribute('inert', pinned && handoff < 1);
    const awardsReveal = pinned ? handoff : 1;
    awards.style.opacity = String(awardsReveal);
    awards.style.transform = 'none';
    awards.style.visibility = pinned && handoff === 0 ? 'hidden' : '';
    awards.toggleAttribute('inert', pinned && handoff < 1);
    if (pinned && handoff < 1) awards.setAttribute('aria-hidden', 'true');
    else awards.removeAttribute('aria-hidden');
    if (pinned && portalGeometry) {
      const p = portalGeometry;
      const c = p.center;
      const mix = (from,to,t) => from+(to-from)*t;
      const startWidth = p.width*1.2;
      const startHeight = startWidth*1080/1920;
      const x = mix(-p.width*.1,c.x,center);
      const y = mix(p.height*344/900,c.y,center);
      const width = mix(startWidth,c.width,center);
      const filmHeight = mix(startHeight,c.height,center);
      const radius = mix(16,c.radius,center);
      film.style.left = `${mix(x,p.x,handoff)}px`;
      film.style.top = `${mix(y,p.y,handoff)}px`;
      film.style.width = `${mix(width,p.coverWidth,handoff)}px`;
      film.style.height = `${mix(filmHeight,p.coverHeight,handoff)}px`;
      film.style.borderRadius = `${mix(radius,p.radius,handoff)}px`;
      portalCopy.style.transform = `translateY(${(p.height*160/900-p.copy.top)*(1-center)}px)`;
      const align = center*(1-handoff);
      portalKicker.style.transform = `translateX(${p.copy.kickerX*align}px)`;
      portalHeading.style.transform = `translateX(${p.copy.headingX*align}px)`;
      // At the exact endpoint the matching image inside the rail takes over.
      film.style.visibility = handoff < 1 ? 'visible' : 'hidden';
      film.toggleAttribute('aria-hidden',handoff===1);
    } else {
      ['left','top','width','height','borderRadius','visibility'].forEach(key => { film.style[key] = ''; });
      [portalCopy,portalKicker,portalHeading].forEach(element=>{element.style.transform='';});
      film.removeAttribute('aria-hidden');
    }
    syncPlanetHeader();
    header.classList.remove('is-submerged');
    root.classList.remove('is-portal');
    const railProgress = clamp((units - awardsStart - .15) / caseTiming.railDuration);
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
  // The independent hero renderer owns one shared font/artwork readiness gate
  // and starts both entrance animations; the sphere delay is exactly 300ms.
  window.addEventListener('hero-effect-change', () => {
    setTheme('dark');
    configure();
  });
  configure(false);
  if (document.fonts?.ready) document.fonts.ready.then(() => { measureOpening(); measurePortal(); measurePlanetServices(); requestUpdate(); });
  if (location.hash.startsWith('#demo-')) {
    const index = scenes.findIndex(scene => `#${scene.id}` === location.hash);
    if (index >= 0) {
      // Restore after the browser's native fragment scroll. Hidden, transformed
      // scenes have no useful native anchor position during initial layout.
      const restore = () => requestAnimationFrame(() => jumpTo(index,.22,true));
      if (document.readyState === 'complete') restore();
      else window.addEventListener('load',restore,{once:true});
    }
  }
})();


/* ===== scroll-demo-tail.js ===== */
(() => {
  'use strict';

  function initTail() {
    const tail = document.querySelector('[data-tail-content]');
    if (!tail) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const revealTargets = [...tail.querySelectorAll('.tail-section-heading, .tail-industry, .tail-faq-layout')];
    if ('IntersectionObserver' in window && !reduce.matches) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      }, { threshold:.08, rootMargin:'0px 0px -24px 0px' });
      revealTargets.forEach((element,index) => {
        element.classList.add('tail-reveal');
        element.style.setProperty('--tail-reveal-delay', `${index%3*60}ms`);
        observer.observe(element);
      });
      tail.addEventListener('focusin', event => event.target.closest('.tail-reveal')?.classList.add('is-revealed'));
      reduce.addEventListener('change', () => {
        if (reduce.matches) { observer.disconnect(); revealTargets.forEach(element => element.classList.add('is-revealed')); }
      });
    }
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


/* ===== scroll-demo-nav.js ===== */
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
      const isMobile=mobile.matches || (document.documentElement.dataset.heroEffect==='planet' && innerWidth<=1320);
      const expanded = isMobile && open;
      nav.classList.toggle('is-open', expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? '收起导航菜单' : '展开导航菜单');
      nav.toggleAttribute('inert', isMobile && !expanded);
      if (isMobile && !expanded) nav.setAttribute('aria-hidden', 'true');
      else nav.removeAttribute('aria-hidden');
      if (restoreFocus && isMobile) toggle.focus({ preventScroll: true });
    }

    setMenu(false);
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    mobile.addEventListener('change', () => setMenu(false));
    window.addEventListener('resize',()=>setMenu(false),{passive:true});
    window.addEventListener('hero-effect-change',()=>setMenu(false));
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
      agreement: ['花火平台服务协议', '服务协议页面待接入。'],
      creatorRules: ['UP主公约', 'UP主公约页面待接入。'],
      awards: ['花火奖', '花火奖页面链接待接入。'],
      help: ['帮助中心', '帮助中心链接待接入。'],
      service: ['联系客服', '客服入口待补充。'],
      email: ['联系邮箱', '联系邮箱待补充。'],
      login: ['立即登录', '登录入口待接入。'],
      join: ['立即入驻', '入驻入口待接入。'],
      brand: ['品牌主/代理商', '品牌主/代理商合作入口待接入。'],
      mcn: ['MCN', 'MCN 入驻入口待接入。'],
      guild: ['工会', '工会入驻入口待接入。'],
      provider: ['服务商', '服务商入驻入口待接入。'],
    };
    document.querySelectorAll('.demo-header [data-contact], .hero-actions [data-contact], .tail-footer [data-contact]').forEach(button => {
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

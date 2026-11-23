(() => {
  'use strict';
  const canvas = document.querySelector('[data-hero-dots]');
  const context = canvas?.getContext('2d');
  if (!context) return;
  const hero = canvas.closest('[data-scene="hero"]');
  const card = hero.querySelector('[data-hero-creator-card]');
  const cardPortrait = card.querySelector('[data-creator-portrait]');
  const cardName = card.querySelector('[data-creator-name]');
  const cardCategory = card.querySelector('[data-creator-category]');
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, time: 0, active: false };
  const portraits = [];
  const featuredPortraits = [];
  const softPortraits = [];
  const covers = [];
  let assetsReady = false;
  let pageReady = document.readyState === 'complete';
  let entryFinished = false;
  let starSprites = [];
  let ambientSprite;
  let meteorTail;
  let meteorTargets = [];
  const meteors = [];
  const arrivals = [];
  let nextMeteorAt = 0;
  let effect = 'meteor';
  try { effect = localStorage.getItem('huahuo-hero-effect') === 'cinema' ? 'cinema' : 'meteor'; } catch (_) {}
  const effectButton = document.querySelector('[data-hero-effect-toggle]');
  // Verified public accounts; representative leading creators, not a ranking.
  const featuredProfiles = [
    { mid: 546195, name: '老番茄', category: '游戏创作' },
    { mid: 517327498, name: '罗翔说刑法', category: '法律知识' },
    { mid: 9824766, name: '敬汉卿', category: '生活创作' },
    { mid: 946974, name: '影视飓风', category: '影像科技' },
    { mid: 163637592, name: '老师好我叫何同学', category: '科技创作' },
    { mid: 562197, name: '中国BOY超级大猩猩', category: '游戏与生活' },
    { mid: 1577804, name: '某幻君', category: '游戏与音乐' },
    { mid: 168598, name: '逍遥散人', category: '游戏创作' },
    { mid: 777536, name: 'LexBurner', category: '动画与直播' },
    { mid: 122879, name: '敖厂长', category: '游戏创作' },
  ];
  // Illustrative demo profiles paired with the project's original avatar assets.
  const profiles = [
    ['数码观察员', '科技数码'], ['生活捕手', '生活记录'], ['游戏搭子', '游戏实况'],
    ['饭点研究所', '美食探店'], ['车轮日记', '汽车出行'], ['节拍收藏家', '音乐创作'],
    ['知识便利店', '知识分享'], ['衣橱漫游者', '时尚穿搭'], ['运动时刻', '运动健身'],
    ['动画小宇宙', '动画创作'], ['小家的日常', '家居生活'], ['远方记录员', '旅行探索'],
    ['光影拾取者', '摄影影像'], ['舞步练习室', '舞蹈表演'], ['手作研究员', '手工创作'],
    ['毛孩子观察站', '宠物日常'], ['灵感放映室', '艺术设计'], ['校园漫游记', '校园生活'],
    ['银幕旁观者', '影视解读'], ['山野探路员', '户外探索'],
  ];
  let selected = null;
  let cardWidth = 200;
  let cardHeight = 72;
  let copyBounds;
  let points = [];
  let palette;
  let bounds;
  let width = 0;
  let height = 0;
  let pixelRatio = 0;
  let flowTime = 0;
  let interactionFlow = 0;
  let entryElapsed = 0;
  let entryAmount = 0;
  let frame = 0;
  let lastTime = 0;
  let resizeNeeded = true;
  let viewNeeded = true;
  let visible = false;
  let interactionLeft = 0;
  let hasBuilt = false;
  let fireArea = null;
  let firePixels;
  let currentShape = 0;

  function flameMask() {
    if (firePixels) return firePixels;
    const mask = document.createElement('canvas');
    mask.width = 240;
    mask.height = 320;
    const pen = mask.getContext('2d');
    const logoShape = canvas.dataset.heroShape !== 'flame';
    if (logoShape) {
      // Normalize to the sampling grid; the display restores the 502:552 ratio.
      pen.setTransform(240/502, 0, 0, 320/552, 0, 0);
      pen.fill(new Path2D('M44.9695 184.478C-14.9898 243.851 -14.9898 339.972 44.9695 399.194L153.387 506.551C93.4276 447.33 93.4276 351.057 153.387 291.836L240.182 205.889C270.151 176.213 285.141 137.357 285.152 98.5166C285.158 76.5817 280.387 54.6518 270.838 34.3832C266.903 26.0284 262.155 17.9559 256.596 10.2817C255.94 9.37695 255.193 8.39407 254.354 7.33305C247.741 -1.03141 235.598 -2.45051 227.234 4.16326C226.671 4.6082 226.134 5.08415 225.624 5.5889C221.456 9.71617 218.176 12.9647 215.782 15.3345C205.248 25.7655 197.114 33.8204 191.379 39.4993C171.449 59.2349 155.181 75.3436 142.576 87.8255C120.886 109.304 88.3501 141.521 44.9695 184.478Z'), 'evenodd');
      pen.fill(new Path2D('M348.613 313.244L261.817 399.191C201.858 458.564 104.788 458.564 44.9824 399.191L153.4 506.548C213.359 565.922 310.429 565.922 370.235 506.548C389.523 487.449 403.989 473.125 413.632 463.575C423.276 454.025 437.742 439.701 457.03 420.601C516.989 361.228 516.989 265.107 457.03 205.886C432.937 182.029 414.868 164.136 402.821 152.207C395.821 145.275 386.786 136.328 375.717 125.367C374.126 123.792 372.203 121.888 369.947 119.654C369.365 119.079 368.427 119.084 367.852 119.665C367.355 120.167 367.281 120.951 367.677 121.536C373.323 129.901 378.043 138.698 381.835 147.784C389.583 166.349 393.461 186.123 393.467 205.893C393.48 244.764 378.528 283.62 348.613 313.244Z'), 'evenodd');
      firePixels = pen.getImageData(0, 0, 240, 320).data;
      return firePixels;
    }
    pen.scale(2, 2);
    // A flame silhouette with an open inner tongue, deliberately not a glyph.
    const outline = new Path2D('M62 4 C68 30 101 49 98 77 C108 68 109 59 107 51 C123 73 124 108 108 131 C94 153 67 162 42 153 C16 144 4 123 8 99 C11 78 26 68 27 48 C38 66 35 83 43 93 C39 59 65 42 62 4 Z M64 84 C63 103 41 109 47 129 C50 141 68 146 80 134 C92 122 78 109 75 99 C74 112 69 115 67 116 C71 104 68 93 64 84 Z');
    pen.fill(outline, 'evenodd');
    firePixels = pen.getImageData(0, 0, 240, 320).data;
    return firePixels;
  }

  function readPalette() {
    const style = getComputedStyle(canvas);
    const token = name => style.getPropertyValue(`--hero-dot-${name}`).trim();
    palette = {
      spacing: Number(token('spacing')), size: Number(token('size')),
      hoverSize: Number(token('hover-size')),
      featuredSize: Number(token('featured-size')), featuredOpacity: Number(token('featured-opacity')),
      mediumSize: Number(token('medium-size')), smallSize: Number(token('small-size')),
      mediumOpacity: Number(token('medium-opacity')), smallOpacity: Number(token('small-opacity')),
      mediumCount: Number(token('medium-count')), smallCount: Number(token('small-count')),
      volumeSpread: Number(token('volume-spread')), depthSize: Number(token('depth-size')),
      depthFade: Number(token('depth-fade')), rearBlur: Number(token('rear-blur')),
      shapeScale: Number(token('shape-scale')), starGlow: Number(token('star-glow')),
      starCore: token('star-core'), starPink: token('star-pink'), starBlue: token('star-blue'),
      sparkColors: ['cyan','violet','blue','yellow','white'].map(name => token(`spark-${name}`)),
      underlight: token('underlight'), underlightOpacity: Number(token('underlight-opacity')),
      entryDuration: Number(token('entry-duration')),
      entryMediaCount: Number(token('entry-media-count')) || 18,
      entryCoverCount: Number(token('entry-cover-count')) || 10,
      entryMediaSize: Number(token('entry-media-size')) || 112,
      meteorCount: Number(token('meteor-count')) || 36,
      meteorDurationMin: Number(token('meteor-duration-min')) || 3.6,
      meteorDurationMax: Number(token('meteor-duration-max')) || 4.8,
      meteorGapMin: Number(token('meteor-gap-min')) || .9,
      meteorGapMax: Number(token('meteor-gap-max')) || 2,
      meteorTail: token('meteor-tail'), meteorCore: token('meteor-core'),
      featuredDrift: Number(token('featured-drift')),
      reach: Number(token('reach')),
      shapeSamples: Number(token('shape-samples')) || 2400,
      looseRatio: Number(token('shape-loose-ratio')) || .1,
      flowBoost: Number(token('flow-boost')) || 1.5,
      flowSpeed: Number(token('flow-speed')) || 1.2,
      swirl: Number(token('swirl')) || 240,
      attraction: Number(token('attraction')) || 180,
      opacity: Number(token('opacity')), flameOpacity: Number(token('flame-opacity')), color: token('color'),
      glow: token('glow'), core: token('core'),
      flameGlow: token('flame-glow'), glowOpacity: Number(token('glow-opacity')),
      fireBack: style.getPropertyValue('--hero-fire-back').trim(),
      fireMid: style.getPropertyValue('--hero-fire-mid').trim(),
      fireFront: style.getPropertyValue('--hero-fire-front').trim(),
      fireCore: style.getPropertyValue('--hero-fire-core').trim(),
    };
    starSprites = [palette.starPink, palette.starBlue, ...palette.sparkColors].map(color => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 64;
      const pen = sprite.getContext('2d');
      const glow = pen.createRadialGradient(32,32,0,32,32,32);
      glow.addColorStop(0,palette.starCore);
      glow.addColorStop(.09,palette.starCore);
      glow.addColorStop(.22,color);
      glow.addColorStop(1,'transparent');
      pen.fillStyle = glow; pen.fillRect(0,0,64,64);
      return sprite;
    });
    ambientSprite = document.createElement('canvas');
    ambientSprite.width = ambientSprite.height = 128;
    const ambientPen = ambientSprite.getContext('2d');
    const ambient = ambientPen.createRadialGradient(64,64,0,64,64,64);
    ambient.addColorStop(0,palette.underlight); ambient.addColorStop(.35,palette.underlight); ambient.addColorStop(1,'transparent');
    ambientPen.fillStyle=ambient; ambientPen.fillRect(0,0,128,128);
    meteorTail = document.createElement('canvas'); meteorTail.width=256; meteorTail.height=16;
    const tailPen=meteorTail.getContext('2d');
    const tail=tailPen.createLinearGradient(0,0,256,0);
    tail.addColorStop(0,'transparent');tail.addColorStop(.55,palette.meteorTail);tail.addColorStop(1,palette.meteorCore);
    tailPen.fillStyle=tail;tailPen.fillRect(0,6,256,4);
  }
  function resetPoints() {
    pointer.active = false;
    pointer.vx = pointer.vy = pointer.time = interactionFlow = 0;
    card.hidden = true;
    selected = null;
    meteors.length=0;arrivals.length=0;nextMeteorAt=0;
    const shapeBlend = shapeAmount();
    points.forEach(point => {
      const goal = goalFor(point, shapeBlend);
      point.x = goal.x; point.y = goal.y; point.vx = 0; point.vy = 0; point.heat = 0;
    });
  }
  function resize() {
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    resizeNeeded = false;
    if (hasBuilt && nextWidth === width && nextHeight === height && ratio === pixelRatio) { viewNeeded = true; return; }
    resetPoints();
    width = nextWidth;
    height = nextHeight;
    pixelRatio = ratio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    bounds = canvas.getBoundingClientRect();
    copyBounds = hero.querySelector('.hero-copy').getBoundingClientRect();
    interactionLeft = Math.max(width * .5, copyBounds.right - bounds.left + 32);
    let seed = 917;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    points = [];
    selected = null;
    const entrance = !hasBuilt && !reduced.matches && finePointer.matches;
    const addPoint = (x, y, fire, softness = 1) => {
      const spreadX = 24 + random() * Math.max(0, width - 48);
      const spreadY = 100 + random() * Math.max(0, height - 124);
      const depth = random();
      const center = fire ? Math.max(0, 1 - Math.hypot((x - fireLeft - fireWidth * .5) / (fireWidth * .58), (y - fireTop - fireHeight * .7) / (fireHeight * .72))) : 0;
      const point = {
        x: fire && entrance ? spreadX : x, y: fire && entrance ? spreadY : y,
        targetX: x, targetY: y, fire, spreadX, spreadY,
        depth, center, softness, phase: random() * Math.PI * 2,
        sizeFactor: fire ? .5 + random() ** 2 * 1.1 + depth * .15 : .45 + random() * .65,
        vx: 0, vy: 0, heat: 0,
        portrait: Math.floor(random() * profiles.length),
      };
      if (!entrance) {
        const goal = goalFor(point, shapeAmount());
        point.x = goal.x; point.y = goal.y;
      }
      points.push(point);
    };
    // Sparse, irregular stars surround the denser gathered flame.
    const starCount = Math.min(900, Math.floor(width * height / (palette.spacing * palette.spacing * 2.3)));
    for (let i = 0; i < starCount; i++) addPoint(random() * width, 100 + random() * Math.max(0, height - 100), false);
    // A small, bounded light population fills the empty area above the copy.
    if (width >= 900) {
      const top = 140;
      const bottom = Math.min(height*.52, copyBounds.top-bounds.top-44);
      const left = 48;
      const right = Math.min(width*.45,copyBounds.right-bounds.left);
      if (bottom > top+40 && right > left+80) {
        for (let i=0;i<18;i++) {
          addPoint(left+random()*(right-left), top+random()*(bottom-top), false);
          points[points.length-1].ambient = true;
        }
      }
    }
    const desktop = width >= 900;
    const rightEdge = width - Math.max(32, width * .04);
    const regionWidth = Math.max(0, rightEdge - interactionLeft);
    const spaceAboveCopy = copyBounds.top - bounds.top - 120;
    const shapeRatio = canvas.dataset.heroShape === 'flame' ? .75 : 502/552;
    const baseHeight = desktop ? Math.max(0, Math.min(height - 200, regionWidth * Math.min(1.12,.94/shapeRatio))) : Math.max(0, Math.min(spaceAboveCopy - 24, height * .28, width * .6));
    const fireHeight = desktop ? Math.min(baseHeight * palette.shapeScale, height-120) : baseHeight;
    const fireWidth = fireHeight * shapeRatio;
    const fireLeft = desktop ? Math.max(copyBounds.right-bounds.left+20, Math.min(width-fireWidth-20, interactionLeft + (regionWidth-fireWidth)/2)) : width * .68 - fireWidth / 2;
    const fireTop = desktop ? (height - fireHeight) / 2 : 120 + (spaceAboveCopy - fireHeight) / 2;
    fireArea = fireHeight >= 100 ? { x: fireLeft, y: fireTop, width: fireWidth, height: fireHeight } : null;
    if (fireHeight >= 100) {
      const pixels = flameMask();
      const step = Math.max(9, Math.sqrt(fireWidth * fireHeight / (desktop ? palette.shapeSamples : 1900)));
      for (let y = step / 2; y < fireHeight; y += step) {
        for (let x = step / 2; x < fireWidth; x += step) {
          const pixel = (Math.floor(y / fireHeight * 320) * 240 + Math.floor(x / fireWidth * 240)) * 4;
          if (pixels[pixel + 3] > 128 && random() > .025) {
            const loose = random() < palette.looseRatio;
            // Keep most resting samples close to the SVG mask. A sparse loose
            // layer and pointer flow can still break the silhouette.
            const scatter = step * (loose ? 3 + random() * 2 : .55 + random() * .35);
            addPoint(fireLeft + x + (random() - .5) * scatter, fireTop + y + (random() - .5) * scatter, true, loose ? .5 + random() * .25 : 1);
          }
        }
      }
    }
    // A few existing particles stay readable as portraits, without another layer
    // or a separate animation path. Normalized anchors keep the spread irregular.
    if (fireArea) {
      const anchors = desktop ? [[.54,.22],[.27,.46],[.78,.57],[.22,.76],[.66,.85]] : [[.54,.22],[.27,.55],[.68,.82]];
      const featured = [];
      anchors.forEach(([x, y], index) => {
        const targetX = fireLeft + fireWidth * x;
        const targetY = fireTop + fireHeight * y;
        let nearest = null;
        let distance = Infinity;
        for (const point of points) {
          if (!point.fire || featured.some(other => Math.hypot(point.targetX-other.targetX, point.targetY-other.targetY) < Math.min(80, fireWidth * .25))) continue;
          const delta = Math.hypot(point.targetX-targetX, point.targetY-targetY);
          if (delta < distance) { nearest = point; distance = delta; }
        }
        if (nearest) {
          nearest.featured = true;
          nearest.depth = .72 + random() * .28;
          nearest.featuredProfile = index;
          nearest.featuredScale = [.5,1,.62,.85,.43][index];
          nearest.portrait = [0,3,7,12,18][index];
          nearest.wander = { fromX: 0, fromY: 0, toX: (random()-.5)*2, toY: (random()-.5)*2, start: flowTime, duration: 4 + random()*5 };
          featured.push(nearest);
        }
      });
    }
    if (fireArea) {
      const occupied = points.filter(point => point.featured);
      const layers = desktop ? [{ tier:'medium', count:palette.mediumCount, gap:24 },{ tier:'small', count:palette.smallCount, gap:12 }] : [{ tier:'medium', count:3, gap:18 },{ tier:'small', count:6, gap:12 }];
      for (const layer of layers) {
        const candidates = points.filter(point => point.fire && !point.featured && !point.tier && point.softness > .8);
        for (let i=0; i<layer.count; i++) {
          let chosen = null;
          for (let attempt=0; attempt<120 && candidates.length; attempt++) {
            const candidate = candidates.splice(Math.floor(random()*candidates.length),1)[0];
            if (occupied.every(other => Math.hypot(candidate.targetX-other.targetX,candidate.targetY-other.targetY) > (other.featured ? Math.min(52,fireWidth*.2)*other.featuredScale/2+layer.gap : layer.gap))) { chosen=candidate; break; }
          }
          if (!chosen) continue;
          chosen.tier = layer.tier;
          // Interleave rear, middle and front faces across both size tiers.
          chosen.depth = (i % 3 + random() * .65) / 3;
          chosen.featuredProfile = (i + (layer.tier==='small' ? 3 : 5)) % featuredProfiles.length;
          chosen.featuredScale = .72 + random()*.28;
          chosen.wander = { fromX:0, fromY:0, toX:random()*2-1, toY:random()*2-1, start:flowTime, duration:6+random()*5 };
          occupied.push(chosen);
        }
      }
    }
    if (fireArea && desktop && effect === 'cinema') {
      const faces = points.filter(point => point.featured || point.tier);
      const media = [...faces.filter(point => point.featured), ...faces.filter(point => !point.featured).sort((a,b) => a.phase-b.phase)].slice(0,palette.entryMediaCount);
      let coverCount = 0;
      media.forEach((point,index) => {
        point.introMedia = true;
        point.entrySize = (.85+random()*.25) * palette.entryMediaSize;
        // A shallow ordered delay reads as a film moving through depth.
        point.entryDelay = (index%3)*.035;
        if (!point.featured && coverCount < palette.entryCoverCount) {
          point.coverIndex = coverCount++ % 8;
        }
      });
      const vanishingX = fireArea.x+fireArea.width*.5;
      const vanishingY = fireArea.y+fireArea.height*.5;
      points.filter(point => point.fire).forEach(point => {
        // All cards retreat on their own straight projection ray. No crossing,
        // edge sources, or random rotation; the rest of the logo fades in place.
        point.entryX = vanishingX+(point.targetX-vanishingX)*2.05;
        point.entryY = vanishingY+(point.targetY-vanishingY)*2.05;
      });
    }
    if (fireArea && desktop && effect === 'meteor') {
      // The whole field starts scattered, not pre-positioned in the logo.
      points.filter(point=>point.fire).forEach(point=>{ point.entryDelay=point.phase/(Math.PI*2)*.22; });
      const candidates=points.filter(point => point.fire && point.softness>.8);
      const faces=candidates.filter(point => point.featured || point.tier==='medium').slice(0,8);
      const stars=candidates.filter(point => !point.featured && !point.tier);
      [...faces,...stars.filter((point,index)=>index%Math.max(1,Math.floor(stars.length/(palette.meteorCount-faces.length)))===0).slice(0,palette.meteorCount-faces.length)].forEach((point,index)=>{
        point.introMeteor=true;point.meteorFace=index<faces.length;
        point.entryDelay=(index%6)*.025;
        const travel=Math.min(width*.72,height*1.15);
        point.entryX=point.targetX-travel;
        point.entryY=point.targetY-travel*.62;
      });
    }
    meteorTargets=points.filter(point=>point.fire && point.softness>.8);
    // Reuse a small subset of tiny particles as saturated lights.
    points.forEach(point => {
      if (point.fire && !point.featured && !point.tier && random() < .1) point.sparkIndex = Math.floor(random()*5);
    });
    points.sort((a, b) => a.depth - b.depth);
    resizeNeeded = false;
    viewNeeded = true;
    hasBuilt = true;
  }
  function entryProgress(point) {
    const delay = point.entryDelay || 0;
    return Math.max(0,Math.min(1,(entryElapsed/palette.entryDuration-delay)/(1-delay)));
  }
  function entryDepth(point) {
    const progress = entryProgress(point);
    // Perspective projection through depth, normalized to land at zero.
    return (1/(1+progress*4)-.2)/.8;
  }
  function entryReveal(point) {
    const p = Math.max(0,Math.min(1,(entryProgress(point)-.76)/.24));
    return p*p*(3-2*p);
  }
  function goalFor(point, shapeBlend) {
    let x = point.fire ? point.spreadX + (point.targetX - point.spreadX) * shapeBlend : point.targetX;
    let y = point.fire ? point.spreadY + (point.targetY - point.spreadY) * shapeBlend : point.targetY;
    const flying = point.fire && !entryFinished && entryProgress(point) < 1;
    if (effect==='meteor' && flying) {
      const progress=entryProgress(point), t=1-(1-progress)**2;
      const gather=progress*progress*(3-2*progress);
      x=point.introMeteor ? point.entryX+(point.targetX-point.entryX)*t : point.spreadX+(point.targetX-point.spreadX)*gather;
      y=point.introMeteor ? point.entryY+(point.targetY-point.entryY)*t : point.spreadY+(point.targetY-point.spreadY)*gather;
    }
    if (effect==='cinema' && flying && point.entryX !== undefined) {
      const retreat = entryDepth(point);
      x = point.targetX+(point.entryX-point.targetX)*retreat;
      y = point.targetY+(point.entryY-point.targetY)*retreat;
      if (!point.introMedia) { x=point.targetX; y=point.targetY; }
    }
    if (!reduced.matches && finePointer.matches) {
      const depth = point.depth * 2 - 1;
      const wave = flowTime * .55 + point.targetY * .012;
      const strength = (point.fire ? .18 + shapeBlend * .82 : .24) * (1 + (point.fire ? interactionFlow * palette.flowBoost : 0)) * (flying ? entryReveal(point) : 1);
      // Front and back layers drift at different amplitudes and phases.
      x += (Math.sin(wave + depth * .7) * (7 + point.depth * 7) + Math.sin(flowTime * .3 + point.phase) * (4 + point.depth * 5)) * strength;
      y += (Math.sin(flowTime * .43 + point.phase) * (5 + point.depth * 7) + Math.cos(wave) * depth * 4) * strength;
      if (point.featured || point.tier) {
        const wander = point.wander;
        if (flowTime >= wander.start + wander.duration) {
          wander.fromX = wander.toX; wander.fromY = wander.toY;
          wander.toX = Math.random()*2-1; wander.toY = Math.random()*2-1;
          wander.start = flowTime; wander.duration = 4 + Math.random()*5;
        }
        const progress = Math.min(1, Math.max(0, (flowTime-wander.start)/wander.duration));
        const ease = progress*progress*(3-2*progress);
        const driftScale = (point.featured ? 1 : point.tier==='medium' ? .45 : .25) * (flying ? entryReveal(point) : 1);
        const driftX = Math.min(palette.featuredDrift, fireArea.width * .22) * driftScale;
        const driftY = Math.min(palette.featuredDrift, fireArea.height * .16) * driftScale;
        x += (wander.fromX+(wander.toX-wander.fromX)*ease) * driftX * shapeBlend;
        y += (wander.fromY+(wander.toY-wander.fromY)*ease) * driftY * shapeBlend;
        const volume = (point.depth * 2 - 1) * (flying ? entryReveal(point) : 1);
        const orbit = flowTime * .18 + point.phase;
        x += Math.cos(orbit) * volume * fireArea.width * palette.volumeSpread * shapeBlend;
        y += Math.sin(orbit) * volume * fireArea.height * palette.volumeSpread * .45 * shapeBlend;
        const edge = Math.min(palette.featuredSize, fireArea.width*.2)/2 + 12;
        if (!flying) {
          if (width >= 900) x = Math.max(interactionLeft+edge, Math.min(width-edge, x));
          y = Math.max(100+edge, Math.min(height-edge, y));
        }
      }
    }
    return { x, y };
  }
  function shapeAmount() {
    return entryAmount * (1 - Number(canvas.style.getPropertyValue('--fire-scroll') || 0));
  }
  function readView() {
    if (!root.classList.contains('is-pinned')) {
      bounds = canvas.getBoundingClientRect();
      copyBounds = hero.querySelector('.hero-copy').getBoundingClientRect();
    }
    visible = bounds.bottom > 0 && bounds.top < innerHeight &&
      Number(canvas.style.opacity || 1) > .002 &&
      (!root.classList.contains('is-pinned') || hero.classList.contains('is-current'));
    viewNeeded = false;
    if (!visible) resetPoints();
  }
  function draw(now) {
    frame = 0;
    if (document.hidden) { lastTime = 0; return; }
    if (resizeNeeded) resize();
    if (viewNeeded) readView();
    if (!visible) { lastTime = 0; return; }
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, .04) : 1 / 60;
    const blend = 1 - Math.exp(-elapsed / .2);
    const damping = Math.exp(-4.2 * elapsed);
    lastTime = now;
    const responsive = pointer.active && entryFinished && !reduced.matches && finePointer.matches;
    const scrollProgress = Number(canvas.style.getPropertyValue('--fire-scroll') || 0);
    const staticField = reduced.matches || !finePointer.matches;
    const wasEntering = !entryFinished;
    if (scrollProgress > 0 || staticField || width < 900) {
      entryFinished = true; entryElapsed = palette.entryDuration; entryAmount = 1;
    }
    const ready = pageReady && assetsReady;
    // Hover builds a whole-field current; release takes longer to settle.
    const flowTarget = responsive ? 1 : 0;
    interactionFlow += (flowTarget - interactionFlow) * (1 - Math.exp(-elapsed / (responsive ? .35 : .9)));
    pointer.vx *= Math.exp(-elapsed / .18);
    pointer.vy *= Math.exp(-elapsed / .18);
    if (staticField) { interactionFlow = 0; entryElapsed = palette.entryDuration; entryAmount = 1; }
    else {
      flowTime += elapsed * (1 + interactionFlow * palette.flowSpeed);
      entryElapsed = Math.min(palette.entryDuration, entryElapsed + (ready ? elapsed : 0));
      const progress = entryElapsed / palette.entryDuration;
      entryAmount = progress * progress * (3 - 2 * progress);
    }
    const shapeBlend = shapeAmount();
    currentShape = shapeBlend;
    let moving = !staticField && (ready || entryFinished);
    context.clearRect(0, 0, width, height);
    if (fireArea && shapeBlend > .002) {
      const radius = fireArea.width * .8;
      context.globalAlpha = palette.underlightOpacity * shapeBlend;
      context.drawImage(ambientSprite,fireArea.x+fireArea.width*.52-radius,fireArea.y+fireArea.height*.91-radius,radius*2,radius*2);
    }
    const enlarged = [];
    let closest = null;
    let closestDistance = Infinity;
    let featuredClosest = null;
    let featuredDistance = Infinity;
    for (const point of points) {
      const goal = goalFor(point, shapeBlend);
      const goalX = goal.x;
      const goalY = goal.y;
      if (scrollProgress > 0 || (wasEntering && point.fire)) {
        point.x = goalX;
        point.y = goalY;
        point.vx = 0;
        point.vy = 0;
      }
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const distance = responsive ? Math.hypot(dx, dy) : Infinity;
      if (distance < closestDistance) { closest = point; closestDistance = distance; }
      if ((point.featured || point.tier) && currentShape > .75 && distance < portraitSize(point) / 2 + 6 && distance < featuredDistance) {
        featuredClosest = point; featuredDistance = distance;
      }
      const proximity = responsive ? Math.max(0, 1 - distance / (palette.reach * (1 + interactionFlow * .3))) : 0;
      const force = proximity * proximity * (3 - 2 * proximity);
      // Tangential flow makes a visible eddy; cursor motion adds a short wake.
      // Large faces react less so profile hover remains easy to target.
      const towardX = distance > .01 ? dx / distance : 0;
      const towardY = distance > .01 ? dy / distance : 0;
      const spring = 3.6 + (1 - entryAmount) * 3.4;
      const response = point.featured ? .4 : point.tier ? .65 : 1;
      const swirl = palette.swirl * interactionFlow;
      const flowX = (towardX * palette.attraction - towardY * swirl + pointer.vx * .65) * force * response;
      const flowY = (towardY * palette.attraction + towardX * swirl + pointer.vy * .65) * force * response;
      point.vx = (point.vx + ((goalX - point.x) * spring + flowX) * elapsed) * damping;
      point.vy = (point.vy + ((goalY - point.y) * spring + flowY) * elapsed) * damping;
      point.x += point.vx * elapsed;
      point.y += point.vy * elapsed;
      if (wasEntering && point.fire) {
        point.x = goalX; point.y = goalY; point.vx = 0; point.vy = 0;
      }
      point.heat += (force - point.heat) * blend;
      if (staticField) { point.x = goalX; point.y = goalY; point.vx = 0; point.vy = 0; point.heat = 0; }
      else if (Math.abs(point.vx) + Math.abs(point.vy) > .08 || Math.abs(force - point.heat) > .002 || (!responsive && Math.hypot(goalX - point.x, goalY - point.y) > .12)) moving = true;
      else if (!responsive) { point.x = goalX; point.y = goalY; point.vx = 0; point.vy = 0; point.heat = 0; }
      enlarged.push(point);
    }
    if (entryElapsed >= palette.entryDuration) entryFinished = true;
    // One additive pass, rather than two blend-mode changes per particle.
    context.globalCompositeOperation = 'lighter';
    for (const point of points) {
      if (!point.featured && !point.tier && (point.sparkIndex !== undefined || point.ambient || (point.fire ? point.depth > .64 : point.depth > .98))) paintStar(point);
      if (point.featured || point.tier === 'medium') {
        const radius = portraitSize(point) * .9;
        context.globalAlpha = (.1 + point.depth*.08) * currentShape**2;
        context.drawImage(starSprites[point.portrait%2],point.x-radius,point.y-radius,radius*2,radius*2);
      }
    }
    context.globalCompositeOperation = 'source-over';
    // Particle depth is sorted once on resize. Only hovered faces need promotion.
    if (responsive) enlarged.sort((a, b) => (a.heat > .1) - (b.heat > .1) || a.depth - b.depth);
    enlarged.forEach(paintPortrait);
    // Large incoming media stay readable over the tiny-particle field.
    if (wasEntering && !entryFinished) {
      if (effect==='cinema') points.filter(point => point.introMedia).forEach(paintIncomingMedia);
      else paintMeteorEntrance();
    }
    if (effect==='meteor' && !staticField && width>=900 && ready && scrollProgress<.02 && entryFinished) paintMeteorSupply(elapsed);
    updateCard(responsive, featuredClosest || closest, featuredClosest ? featuredDistance : closestDistance);
    context.globalAlpha = 1;
    if (moving) frame = requestAnimationFrame(draw);
    else lastTime = 0;
  }
  function clipMeteorField() {
    context.beginPath();
    // Two regions admit light above the title and to its right, protecting copy.
    context.rect(0,100,width,Math.max(0,copyBounds.top-bounds.top-130));
    context.rect(interactionLeft,100,Math.max(0,width-interactionLeft),height-100);
    context.clip();
  }
  function paintMeteor(x,y,size,tail,alpha,profile) {
    context.save();clipMeteorField();context.translate(x,y);
    context.rotate(Math.atan2(.62,1));context.globalAlpha=alpha*.65;
    context.drawImage(meteorTail,-tail,-2,tail,4);
    context.rotate(-Math.atan2(.62,1));
    context.globalAlpha=alpha;
    if (profile!==undefined && featuredPortraits[profile]) context.drawImage(featuredPortraits[profile],-size/2,-size/2,size,size);
    else context.drawImage(starSprites[3],-size/2,-size/2,size,size);
    context.restore();
  }
  function paintMeteorEntrance() {
    points.forEach(point=>{
      if (!point.introMeteor) return;
      const p=entryProgress(point), fade=Math.sin(Math.PI*p);
      const size=point.meteorFace ? 6+24*(1-p) : 5+5*(1-p);
      paintMeteor(point.x,point.y,size,45+90*(1-p),fade*.8,point.meteorFace ? point.featuredProfile : undefined);
    });
  }
  function paintMeteorSupply(elapsed) {
    if (!meteorTargets.length) return;
    if (!nextMeteorAt) nextMeteorAt=flowTime+.45;
    if (flowTime>=nextMeteorAt && meteors.length<4) {
      const target=meteorTargets[Math.floor(Math.random()*meteorTargets.length)];
      const travel=Math.min(width*.65,height*1.05);
      meteors.push({target,age:0,duration:palette.meteorDurationMin+Math.random()*(palette.meteorDurationMax-palette.meteorDurationMin),travel,profile:Math.random()<.3 ? Math.floor(Math.random()*featuredProfiles.length) : undefined});
      nextMeteorAt=flowTime+palette.meteorGapMin+Math.random()*(palette.meteorGapMax-palette.meteorGapMin);
    }
    for (let index=meteors.length-1;index>=0;index--) {
      const meteor=meteors[index];meteor.age+=elapsed;
      const p=Math.min(1,meteor.age/meteor.duration), t=1-(1-p)**2;
      const x=meteor.target.x-meteor.travel*(1-t),y=meteor.target.y-meteor.travel*.62*(1-t);
      const fade=Math.min(1,p*8)*Math.min(1,(1-p)*6);
      paintMeteor(x,y,meteor.profile!==undefined ? 5+12*(1-p) : 6,65+55*(1-p),fade*.7,meteor.profile);
      if (p>=1) {
        arrivals.push({target:meteor.target,age:0});if(arrivals.length>4)arrivals.shift();
        meteors.splice(index,1);
      }
    }
    context.globalCompositeOperation='lighter';
    for (let index=arrivals.length-1;index>=0;index--) {
      const arrival=arrivals[index];arrival.age+=elapsed;
      const p=Math.min(1,arrival.age/.5),size=18+p*14;
      context.globalAlpha=(1-p)*.32;
      context.drawImage(starSprites[3],arrival.target.x-size/2,arrival.target.y-size/2,size,size);
      if(p>=1)arrivals.splice(index,1);
    }
    context.globalCompositeOperation='source-over';
  }
  function portraitSize(point) {
    const size = point.featured ? palette.featuredSize : point.tier==='medium' ? palette.mediumSize : palette.smallSize;
    const perspective = 1 + (point.depth - .5) * palette.depthSize;
    return Math.min(size, fireArea.width * .2) * point.featuredScale * perspective;
  }
  function paintStar(point) {
    const x=point.x, y=point.y;
    if (point.sparkIndex !== undefined) {
      const pulse = reduced.matches || !finePointer.matches ? 1 : .86 + .14*Math.sin(flowTime*.9+point.phase);
      const gathered = .12 + currentShape*.88;
      const size = 10 + point.depth*7;
      context.globalAlpha = .9*gathered*pulse;
      context.drawImage(starSprites[2+point.sparkIndex],x-size/2,y-size/2,size,size);
      context.beginPath(); context.arc(x,y,.8+point.depth*.4,0,Math.PI*2);
      context.fillStyle = palette.sparkColors[point.sparkIndex]; context.globalAlpha = gathered*pulse; context.fill();
      return;
    }
    // Cached light sprites give a bright core and wide bloom without per-point
    // shadowBlur. A sparse foreground population carries the strongest light.
    if ((!point.featured && !point.tier) && (point.ambient || point.fire || point.depth > .94)) {
      const pulse = reduced.matches || !finePointer.matches ? 1 : .82 + .18*Math.sin(flowTime*(.6+point.depth*.6)+point.phase);
      const gathered = point.fire ? .12 + currentShape*.88 : point.ambient ? .42 : .15;
      const bright = point.ambient || point.depth > .84;
      const glowSize = (bright ? 18+point.depth*10 : 6+point.depth*7) * (point.fire ? 1 : point.ambient ? .45 : .65);
      context.globalAlpha = palette.starGlow * (bright ? .9 : .18) * gathered * pulse;
      context.drawImage(starSprites[point.portrait%2],x-glowSize/2,y-glowSize/2,glowSize,glowSize);
      if (bright) {
        context.beginPath(); context.arc(x,y,.65+point.depth*.5,0,Math.PI*2);
        context.fillStyle=palette.starCore; context.globalAlpha=palette.starGlow*gathered*pulse; context.fill();
      }
    }
  }
  function paintIncomingMedia(point) {
    const progress = entryProgress(point);
    const resting = palette.size*point.sizeFactor;
    const size = resting+(point.entrySize-resting)*entryDepth(point);
    const cover = point.coverIndex !== undefined && covers[point.coverIndex];
    const sprite = cover || featuredPortraits[point.featuredProfile] || portraits[point.portrait];
    if (!sprite) return;
    const h = cover ? size*9/16 : size;
    // Clip the decorative flight to the right of copy, preserving readable UI.
    context.save(); context.beginPath();
    context.rect(Math.min(interactionLeft, width),0,Math.max(0,width-interactionLeft),height); context.clip();
    context.globalAlpha = Math.min(1,progress*16)*.85*(1-entryReveal(point));
    context.translate(point.x,point.y);
    context.drawImage(sprite,-size/2,-h/2,size,h);
    context.restore();
  }
  function paintPortrait(point) {
    if ((point.introMedia || point.introMeteor) && !entryFinished && entryReveal(point) === 0) return;
    if (point.sparkIndex !== undefined) return;
    const x = point.x;
    const y = point.y;
    const emphasis = point.heat ** 2;
    const featuredBlend = point.featured || point.tier ? currentShape ** 2 : 0;
    const smallSize = palette.size * point.sizeFactor;
    const featuredSize = point.featured || point.tier ? portraitSize(point) : smallSize;
    const baseSize = smallSize + (featuredSize - smallSize) * featuredBlend;
    const size = baseSize + (Math.max(baseSize, palette.hoverSize * (.8 + point.depth * .3)) - baseSize) * emphasis;
    const radius = size / 2;
    if (point.fire && point.tier !== 'small' && currentShape > .08) {
      const zone = point.center * .6 + point.depth * .4;
      const tone = zone > .77 ? palette.fireCore : zone > .54 ? palette.fireFront : zone > .28 ? palette.fireMid : palette.fireBack;
      const pulse = .82 + Math.sin(flowTime * (1.05 + point.depth * .8) + point.phase) * .18;
      const emberRadius = Math.max(1.2, smallSize * (.62 + point.depth * .38));
      context.beginPath();
      context.arc(x, y, emberRadius, 0, Math.PI * 2);
      context.fillStyle = tone;
      context.globalAlpha = Math.min(.82, palette.flameOpacity * (.75 + zone * 1.3) * pulse) * currentShape ** 2 * point.softness;
      context.fill();
    }
    if (point.heat > .1 && point.tier !== 'small') {
      const haloRadius = radius + 7;
      context.globalAlpha = emphasis * .28;
      context.drawImage(starSprites[point.portrait%2],x-haloRadius,y-haloRadius,haloRadius*2,haloRadius*2);
    }
    const portraitOpacity = point.fire ? palette.opacity + (palette.flameOpacity * .65 - palette.opacity) * currentShape : palette.opacity;
    const smallOpacity = portraitOpacity * (.28 + point.depth * .72) * point.softness;
    const depthOpacity = 1 - (1-point.depth) * palette.depthFade;
    const faceOpacity = (point.featured ? palette.featuredOpacity : point.tier==='medium' ? palette.mediumOpacity : palette.smallOpacity) * depthOpacity;
    context.globalAlpha = Math.min(1, smallOpacity + (faceOpacity - smallOpacity) * featuredBlend + .42 * point.heat) * ((point.introMedia || point.introMeteor) && !entryFinished ? entryReveal(point) : 1);
    const rear = point.tier === 'medium' && point.depth < .3 && point.heat < .1 && currentShape > .5;
    const portrait = ((point.featured || point.tier) && ((rear && softPortraits[point.featuredProfile]) || featuredPortraits[point.featuredProfile])) || portraits[point.portrait];
    if (portrait) context.drawImage(portrait, x - radius, y - radius, size, size);
    else {
      context.beginPath();
      context.arc(x, y, palette.size / 2, 0, Math.PI * 2);
      context.fillStyle = palette.color;
      context.fill();
    }
  }
  function updateCard(responsive, closest, closestDistance) {
    if (!responsive || !closest || closestDistance > (closest.fire ? 32 : 42)) { card.hidden = true; selected = null; return; }
    // Hysteresis prevents names flickering when the pointer rests between cells.
    const selectedDistance = selected ? Math.hypot(pointer.x - selected.x, pointer.y - selected.y) : Infinity;
    if (!selected || ((closest.featured || closest.tier) && selected !== closest) || selectedDistance > closestDistance + palette.spacing * .65) {
      selected = closest;
      const featured = selected.featured || selected.tier ? featuredProfiles[selected.featuredProfile] : null;
      cardPortrait.src = featured ? `assets/creators/featured-${featured.mid}.jpg` : `assets/creators/creator-${String(selected.portrait + 1).padStart(2, '0')}.svg`;
      cardName.textContent = featured ? featured.name : profiles[selected.portrait][0];
      cardCategory.textContent = featured ? featured.category : profiles[selected.portrait][1];
    }
    if (card.hidden) {
      card.hidden = false;
      cardWidth = card.offsetWidth;
      cardHeight = card.offsetHeight;
    }
    const edge = 20;
    let x = pointer.x + 28;
    let y = pointer.y - cardHeight / 2;
    if (x + cardWidth > width - edge) x = pointer.x - cardWidth - 28;
    x = Math.max(interactionLeft, Math.min(x, width - cardWidth - edge));
    y = Math.max(100, Math.min(y, height - cardHeight - edge));
    const copy = { left: copyBounds.left - bounds.left, right: copyBounds.right - bounds.left, top: copyBounds.top - bounds.top, bottom: copyBounds.bottom - bounds.top };
    const overlaps = x < copy.right + 16 && x + cardWidth > copy.left - 16 && y < copy.bottom + 16 && y + cardHeight > copy.top - 16;
    if (overlaps) {
      if (copy.right + 24 + cardWidth < width - edge) x = copy.right + 24;
      else if (copy.top - cardHeight - 24 >= 100) y = copy.top - cardHeight - 24;
      else y = Math.min(height - cardHeight - edge, copy.bottom + 24);
    }
    card.style.transform = `translate(${x}px,${y}px)`;
  }
  function requestDraw() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function release() {
    pointer.active = false;
    pointer.vx = pointer.vy = pointer.time = 0;
    card.hidden = true;
    requestDraw();
  }
  function resetTouch() {
    resetPoints();
    requestDraw();
  }
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') resetTouch();
  }, { passive: true });
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') { resetTouch(); return; }
    if (!finePointer.matches || reduced.matches || !visible) return;
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const wasActive = pointer.active;
    pointer.active = entryFinished && width >= 900 && interactionLeft + cardWidth + 20 < width && x >= interactionLeft && x <= width && y >= 100 && y <= height && !event.target.closest('header, dialog');
    const interval = Math.max(16, Math.min(80, (event.timeStamp || 0) - pointer.time || 16.7)) / 1000;
    pointer.vx = pointer.active && wasActive ? Math.max(-900, Math.min(900, (x-pointer.x)/interval)) : 0;
    pointer.vy = pointer.active && wasActive ? Math.max(-900, Math.min(900, (y-pointer.y)/interval)) : 0;
    pointer.time = event.timeStamp || 0;
    pointer.x = x;
    pointer.y = y;
    requestDraw();
  }, { passive: true });
  window.addEventListener('pointerout', event => { if (!event.relatedTarget) release(); }, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') release(); });
  window.addEventListener('blur', release);
  window.addEventListener('scroll', () => { viewNeeded = true; release(); }, { passive: true });
  canvas.addEventListener('hero-progress', () => { viewNeeded = true; requestDraw(); });
  window.addEventListener('resize', () => { resizeNeeded = true; requestDraw(); }, { passive: true });
  new ResizeObserver(() => { resizeNeeded = true; requestDraw(); }).observe(canvas);
  new MutationObserver(() => { readPalette(); requestDraw(); }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
  [reduced, finePointer].forEach(query => query.addEventListener('change', () => {
    resetPoints();
    viewNeeded = true;
    requestDraw();
  }));
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    resetPoints();
    viewNeeded = true;
    requestDraw();
  });
  function updateEffectControl() {
    root.dataset.heroEffect=effect;
    if (!effectButton) return;
    effectButton.setAttribute('aria-pressed',String(effect==='meteor'));
    const next=effect==='meteor' ? '景深汇聚' : '流星汇聚';
    effectButton.setAttribute('aria-label',`切换为${next}`);effectButton.title=`切换为${next}`;
    effectButton.querySelector('[data-hero-effect-label]').textContent=effect==='meteor' ? '流星汇聚' : '景深汇聚';
  }
  updateEffectControl();
  effectButton?.addEventListener('click',()=>{
    effect=effect==='meteor' ? 'cinema' : 'meteor';
    try { localStorage.setItem('huahuo-hero-effect',effect); } catch (_) {}
    updateEffectControl();
    entryFinished=false;entryElapsed=0;entryAmount=0;hasBuilt=false;resizeNeeded=true;viewNeeded=true;lastTime=0;
    meteors.length=0;arrivals.length=0;nextMeteorAt=0;
    release();
    if (window.scrollY>10) window.scrollTo({top:0,behavior:'instant'});
  });
  readPalette();
  function loadPortrait(path, target, index) {
    return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 160;
      const pen = sprite.getContext('2d');
      if (!pen) { resolve(); return; }
      pen.beginPath(); pen.arc(80, 80, 79, 0, Math.PI*2); pen.clip();
      pen.drawImage(image, 0, 0, 160, 160);
      target[index] = sprite;
      // Cache the distant layer once; avoid a live blur for every animated face.
      if (target === featuredPortraits) {
        const soft = document.createElement('canvas');
        soft.width = soft.height = 160;
        const softPen = soft.getContext('2d');
        if (softPen) {
          softPen.filter = `blur(${palette.rearBlur}px)`;
          softPen.drawImage(sprite, 0, 0);
          softPortraits[index] = soft;
        }
      }
      requestDraw(); resolve();
    };
    image.onerror = () => resolve();
    image.src = path;
    });
  }
  const assetTasks = featuredProfiles.map((profile, index) => loadPortrait(`assets/creators/featured-${profile.mid}.jpg`, featuredPortraits, index));
  for (let index=0;index<8;index++) assetTasks.push(new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const sprite = document.createElement('canvas'); sprite.width=320; sprite.height=180;
      const pen = sprite.getContext('2d');
      if (pen) {
        pen.beginPath();pen.roundRect(0,0,320,180,18);pen.clip();
        pen.drawImage(image,0,0,320,180);covers[index]=sprite;
      }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `assets/covers/video-${String(index+1).padStart(2,'0')}.webp`;
  }));
  Promise.all(assetTasks).then(() => { assetsReady=true; lastTime=0; requestDraw(); });
  window.addEventListener('load',() => { pageReady=true;lastTime=0;requestDraw(); },{once:true});
  // Small background particles retain the project's original illustrations.
  for (let index = 0; index < 20; index++) {
    const image = new Image();
    image.onload = () => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 80;
      const spriteContext = sprite.getContext('2d');
      if (!spriteContext) return;
      spriteContext.beginPath();
      spriteContext.arc(40, 40, 39, 0, Math.PI * 2);
      spriteContext.clip();
      spriteContext.drawImage(image, 0, 0, 80, 80);
      portraits[index] = sprite;
      requestDraw();
    };
    image.src = `assets/creators/creator-${String(index + 1).padStart(2, '0')}.svg`;
  }
  requestDraw();
})();

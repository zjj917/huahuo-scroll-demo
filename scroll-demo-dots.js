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
  const pointer = { x: 0, y: 0, active: false };
  const portraits = [];
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
  let entryElapsed = 0;
  let entryAmount = 0;
  let dispersion = 0;
  let frame = 0;
  let lastTime = 0;
  let resizeNeeded = true;
  let viewNeeded = true;
  let visible = false;
  let interactionLeft = 0;
  let hasBuilt = false;
  let fireArea = null;
  let firePixels;

  function flameMask() {
    if (firePixels) return firePixels;
    const mask = document.createElement('canvas');
    mask.width = 240;
    mask.height = 320;
    const pen = mask.getContext('2d');
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
      reach: Number(token('reach')),
      opacity: Number(token('opacity')), flameOpacity: Number(token('flame-opacity')), color: token('color'),
      glow: token('glow'), core: token('core'),
      flameGlow: token('flame-glow'), glowOpacity: Number(token('glow-opacity')),
    };
  }
  function resetPoints() {
    pointer.active = false;
    card.hidden = true;
    selected = null;
    const shapeBlend = shapeAmount();
    points.forEach(point => {
      const goal = goalFor(point, shapeBlend);
      point.x = goal.x; point.y = goal.y; point.vx = 0; point.vy = 0; point.heat = 0;
    });
  }
  function resize() {
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
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
    const addPoint = (x, y, fire) => {
      const spreadX = 24 + random() * Math.max(0, width - 48);
      const spreadY = 100 + random() * Math.max(0, height - 124);
      const depth = random();
      const point = {
        x: fire && entrance ? spreadX : x, y: fire && entrance ? spreadY : y,
        targetX: x, targetY: y, fire, spreadX, spreadY,
        depth, phase: random() * Math.PI * 2,
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
    const starCount = Math.min(700, Math.floor(width * height / (palette.spacing * palette.spacing * 3)));
    for (let i = 0; i < starCount; i++) addPoint(random() * width, 100 + random() * Math.max(0, height - 100), false);
    const desktop = width >= 900;
    const rightEdge = width - Math.max(32, width * .04);
    const regionWidth = Math.max(0, rightEdge - interactionLeft);
    const spaceAboveCopy = copyBounds.top - bounds.top - 120;
    const fireHeight = desktop ? Math.max(0, Math.min(height - 200, regionWidth * 1.12)) : Math.max(0, Math.min(spaceAboveCopy - 24, height * .28, width * .6));
    const fireWidth = fireHeight * .75;
    const fireLeft = desktop ? interactionLeft + (regionWidth - fireWidth) / 2 : width * .68 - fireWidth / 2;
    const fireTop = desktop ? (height - fireHeight) / 2 : 120 + (spaceAboveCopy - fireHeight) / 2;
    fireArea = fireHeight >= 100 ? { x: fireLeft, y: fireTop, width: fireWidth, height: fireHeight } : null;
    if (fireHeight >= 100) {
      const pixels = flameMask();
      const step = Math.max(7, Math.min(11, fireWidth / 40));
      for (let y = step / 2; y < fireHeight; y += step) {
        for (let x = step / 2; x < fireWidth; x += step) {
          const pixel = (Math.floor(y / fireHeight * 320) * 240 + Math.floor(x / fireWidth * 240)) * 4;
          if (pixels[pixel + 3] > 128) addPoint(fireLeft + x + (random() - .5) * step * 1.5, fireTop + y + (random() - .5) * step * 1.5, true);
        }
      }
    }
    points.sort((a, b) => a.depth - b.depth);
    resizeNeeded = false;
    viewNeeded = true;
    hasBuilt = true;
  }
  function goalFor(point, shapeBlend) {
    let x = point.fire ? point.spreadX + (point.targetX - point.spreadX) * shapeBlend : point.targetX;
    let y = point.fire ? point.spreadY + (point.targetY - point.spreadY) * shapeBlend : point.targetY;
    if (!reduced.matches && finePointer.matches) {
      const depth = point.depth * 2 - 1;
      const wave = flowTime * .48 + point.targetY * .012;
      const strength = point.fire ? shapeBlend : .12;
      // Front and back layers drift at different amplitudes and phases.
      x += (Math.sin(wave + depth * .7) * (5 + point.depth * 5) + Math.sin(flowTime * .23 + point.phase) * (3 + point.depth * 4)) * strength;
      y += (Math.sin(flowTime * .35 + point.phase) * (3 + point.depth * 6) + Math.cos(wave) * depth * 3) * strength;
    }
    return { x, y };
  }
  function shapeAmount() {
    return Number(canvas.style.opacity || 1) * entryAmount * (1 - dispersion * .94);
  }
  function readView() {
    bounds = canvas.getBoundingClientRect();
    copyBounds = hero.querySelector('.hero-copy').getBoundingClientRect();
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
    const responsive = pointer.active && !reduced.matches && finePointer.matches;
    const staticField = reduced.matches || !finePointer.matches;
    if (staticField) { entryElapsed = 6.5; entryAmount = 1; dispersion = 0; }
    else {
      flowTime += elapsed;
      entryElapsed = Math.min(6.5, entryElapsed + elapsed);
      const progress = Math.max(0, (entryElapsed - .8) / 5.7);
      entryAmount = progress * progress * (3 - 2 * progress);
      const overFire = responsive && fireArea && pointer.x >= fireArea.x - 48 && pointer.x <= fireArea.x + fireArea.width + 48 && pointer.y >= fireArea.y - 48 && pointer.y <= fireArea.y + fireArea.height + 48;
      // Entering the flame releases it across the whole field. Regathering is
      // deliberately slower, while each particle keeps its own momentum.
      const targetDispersion = overFire ? 1 : 0;
      dispersion += (targetDispersion - dispersion) * (1 - Math.exp(-elapsed / (overFire ? .8 : 2.8)));
      if (Math.abs(targetDispersion - dispersion) < .0001) dispersion = targetDispersion;
    }
    const shapeBlend = shapeAmount();
    let moving = !staticField;
    context.clearRect(0, 0, width, height);
    if (fireArea) {
      const x = fireArea.x + fireArea.width * .5;
      const y = fireArea.y + fireArea.height * .63;
      const glow = context.createRadialGradient(x, y, 0, x, y, fireArea.width * .72);
      glow.addColorStop(0, palette.flameGlow);
      glow.addColorStop(1, 'transparent');
      context.fillStyle = glow;
      context.globalAlpha = palette.glowOpacity * shapeBlend * (.92 + Math.sin(flowTime * .6) * .08);
      context.fillRect(0, 0, width, height);
    }
    const enlarged = [];
    let closest = null;
    let closestDistance = Infinity;
    for (const point of points) {
      const goal = goalFor(point, shapeBlend);
      const goalX = goal.x;
      const goalY = goal.y;
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const distance = Math.hypot(dx, dy);
      if (distance < closestDistance) { closest = point; closestDistance = distance; }
      const proximity = responsive ? Math.max(0, 1 - distance / palette.reach) : 0;
      const force = proximity * proximity * (3 - 2 * proximity);
      // Spring acceleration plus strong drag gives the slow, water-like wake.
      // Pointer force pushes outward; releasing it keeps velocity, then returns.
      const awayX = distance > .01 ? -dx / distance : Math.cos(point.portrait * 2.4);
      const awayY = distance > .01 ? -dy / distance : Math.sin(point.portrait * 2.4);
      point.vx = (point.vx + ((goalX - point.x) * 3.6 + awayX * force * 420) * elapsed) * damping;
      point.vy = (point.vy + ((goalY - point.y) * 3.6 + awayY * force * 420) * elapsed) * damping;
      point.x += point.vx * elapsed;
      point.y += point.vy * elapsed;
      point.heat += (force - point.heat) * blend;
      if (staticField) { point.x = goalX; point.y = goalY; point.vx = 0; point.vy = 0; point.heat = 0; }
      else if (Math.abs(point.vx) + Math.abs(point.vy) > .08 || Math.abs(force - point.heat) > .002 || (!responsive && Math.hypot(goalX - point.x, goalY - point.y) > .12)) moving = true;
      else if (!responsive) { point.x = goalX; point.y = goalY; point.vx = 0; point.vy = 0; point.heat = 0; }
      if (point.heat > .02) enlarged.push(point);
      else paintPortrait(point);
    }
    // Paint the closest faces last, keeping each enlarged portrait legible.
    enlarged.sort((a, b) => a.heat - b.heat).forEach(paintPortrait);
    updateCard(responsive, closest, closestDistance);
    context.globalAlpha = 1;
    if (moving) frame = requestAnimationFrame(draw);
    else lastTime = 0;
  }
  function paintPortrait(point) {
    const x = point.x;
    const y = point.y;
    const emphasis = point.heat ** 2;
    const baseSize = palette.size * point.sizeFactor;
    const size = baseSize + (palette.hoverSize * (.8 + point.depth * .3) - baseSize) * emphasis;
    const radius = size / 2;
    if (point.heat > .1) {
      const haloRadius = radius + 7;
      const halo = context.createRadialGradient(x, y, radius * .7, x, y, haloRadius);
      halo.addColorStop(0, palette.glow);
      halo.addColorStop(1, 'transparent');
      context.globalAlpha = emphasis * .28;
      context.fillStyle = halo;
      context.fillRect(x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2);
    }
    context.globalAlpha = (point.fire ? palette.flameOpacity : palette.opacity) * (.28 + point.depth * .72) + .22 * point.heat;
    const portrait = portraits[point.portrait];
    if (portrait) context.drawImage(portrait, x - radius, y - radius, size, size);
    else {
      context.beginPath();
      context.arc(x, y, palette.size / 2, 0, Math.PI * 2);
      context.fillStyle = palette.color;
      context.fill();
    }
  }
  function updateCard(responsive, closest, closestDistance) {
    if (!responsive || !closest || closestDistance > 32) { card.hidden = true; selected = null; return; }
    // Hysteresis prevents names flickering when the pointer rests between cells.
    const selectedDistance = selected ? Math.hypot(pointer.x - selected.x, pointer.y - selected.y) : Infinity;
    if (!selected || selectedDistance > closestDistance + palette.spacing * .65) {
      selected = closest;
      cardPortrait.src = `assets/creators/creator-${String(selected.portrait + 1).padStart(2, '0')}.svg`;
      cardName.textContent = profiles[selected.portrait][0];
      cardCategory.textContent = profiles[selected.portrait][1];
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
    pointer.active = width >= 900 && interactionLeft + cardWidth + 20 < width && x >= interactionLeft && x <= width && y >= 100 && y <= height && !event.target.closest('header, dialog');
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
  readPalette();
  // Reuse the existing original illustrative avatars; no third-party image calls.
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

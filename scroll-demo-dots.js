(() => {
  'use strict';
  const canvas = document.querySelector('[data-hero-dots]');
  const context = canvas?.getContext('2d');
  if (!context) return;
  const hero = canvas.closest('[data-scene="hero"]');
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = { x: 0, y: 0, active: false };
  const portraits = [];
  let points = [];
  let palette;
  let bounds;
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;
  let resizeNeeded = true;
  let viewNeeded = true;
  let visible = false;

  function readPalette() {
    const style = getComputedStyle(canvas);
    const token = name => style.getPropertyValue(`--hero-dot-${name}`).trim();
    palette = {
      spacing: Number(token('spacing')), size: Number(token('size')),
      hoverSize: Number(token('hover-size')),
      reach: Number(token('reach')), pull: Number(token('pull')),
      opacity: Number(token('opacity')), color: token('color'),
      glow: token('glow'), core: token('core'),
    };
  }
  function resetPoints() {
    pointer.active = false;
    points.forEach(point => { point.dx = 0; point.dy = 0; point.heat = 0; });
  }
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // A large display must not multiply the amount of work indefinitely.
    const spacing = Math.max(palette.spacing, Math.sqrt(width * height / 1800));
    const columns = Math.floor(width / spacing);
    const rows = Math.floor(height / spacing);
    const left = (width - (columns - 1) * spacing) / 2;
    const top = (height - (rows - 1) * spacing) / 2;
    points = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        points.push({ x: left + col * spacing, y: top + row * spacing, dx: 0, dy: 0, heat: 0, portrait: (row * 7 + col * 3) % 20 });
      }
    }
    resizeNeeded = false;
    viewNeeded = true;
  }
  function readView() {
    bounds = canvas.getBoundingClientRect();
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
    const elapsed = lastTime ? Math.min(now - lastTime, 48) : 16.7;
    const blend = 1 - Math.exp(-elapsed / 100);
    lastTime = now;
    const responsive = pointer.active && !reduced.matches && finePointer.matches;
    let moving = false;
    context.clearRect(0, 0, width, height);
    const enlarged = [];
    for (const point of points) {
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const distance = Math.hypot(dx, dy);
      const proximity = responsive ? Math.max(0, 1 - distance / palette.reach) : 0;
      const force = proximity * proximity * (3 - 2 * proximity);
      const pull = Math.min(distance * .12, palette.pull * force);
      const targetX = distance ? dx / distance * pull : 0;
      const targetY = distance ? dy / distance * pull : 0;
      point.dx += (targetX - point.dx) * blend;
      point.dy += (targetY - point.dy) * blend;
      point.heat += (force - point.heat) * blend;
      if (Math.abs(targetX - point.dx) > .015 || Math.abs(targetY - point.dy) > .015 || Math.abs(force - point.heat) > .002) moving = true;
      else { point.dx = targetX; point.dy = targetY; point.heat = force; }
      if (point.heat > .02) enlarged.push(point);
      else paintPortrait(point);
    }
    // Paint the closest faces last, keeping each enlarged portrait legible.
    enlarged.sort((a, b) => a.heat - b.heat).forEach(paintPortrait);
    context.globalAlpha = 1;
    if (moving) frame = requestAnimationFrame(draw);
    else lastTime = 0;
  }
  function paintPortrait(point) {
    const x = point.x + point.dx;
    const y = point.y + point.dy;
    const emphasis = point.heat ** 2;
    const size = palette.size + (palette.hoverSize - palette.size) * emphasis;
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
    context.globalAlpha = palette.opacity + (1 - palette.opacity) * point.heat;
    const portrait = portraits[point.portrait];
    if (portrait) context.drawImage(portrait, x - radius, y - radius, size, size);
    else {
      context.beginPath();
      context.arc(x, y, palette.size / 2, 0, Math.PI * 2);
      context.fillStyle = palette.color;
      context.fill();
    }
    if (point.heat > .15) {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.lineWidth = .8;
      context.strokeStyle = palette.core;
      context.globalAlpha = emphasis * .5;
      context.stroke();
    }
  }
  function requestDraw() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function release() {
    pointer.active = false;
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
    pointer.active = x >= 0 && x <= width && y >= 0 && y <= height && !event.target.closest('header, dialog');
    pointer.x = x;
    pointer.y = y;
    requestDraw();
  }, { passive: true });
  window.addEventListener('pointerout', event => { if (!event.relatedTarget) release(); }, { passive: true });
  window.addEventListener('blur', release);
  window.addEventListener('scroll', () => { viewNeeded = true; release(); }, { passive: true });
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

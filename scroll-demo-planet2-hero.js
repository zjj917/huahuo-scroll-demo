/* Figma 223:22581: independent hero for Creator Planet 2. */
(() => {
  'use strict';
  const root = document.documentElement;
  const hero = document.querySelector('[data-scene="hero"]');
  const canvas = hero?.querySelector('[data-hero-dots]');
  const ctx = canvas?.getContext('2d');
  const manifest = window.HUAHUO_PLANET2_FIGMA;
  if (!ctx || !manifest) return;
  // A fresh hero URL starts at its entrance, including browsers that restore
  // the old scroll position after parsing a fragment or changing viewport.
  if (!location.hash || location.hash === '#story') {
    history.scrollRestoration = 'manual';
    window.scrollTo({top:0,behavior:'instant'});
    window.addEventListener('load',()=>window.scrollTo({top:0,behavior:'instant'}),{once:true});
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const card = document.querySelector('[data-hero-creator-card]');
  const cursor = document.querySelector('[data-planet-cursor]');
  const cardImage = card.querySelector('[data-creator-portrait]');
  const cardName = card.querySelector('[data-creator-name]');
  const cardCategory = card.querySelector('[data-creator-category]');
  const layer = hero.querySelector('[data-planet2-avatar-layer]') || document.createElement('div');
  layer.className = 'planet2-avatar-layer';
  layer.setAttribute('role', 'group');
  layer.setAttribute('aria-label', '创作者星球，方向键切换头像');
  hero.insertBefore(layer, hero.querySelector('.hero-copy'));

  // These public identities and portraits were already verified in the original
  // demo. The user explicitly chose to reuse them for the new composition.
  const profiles = [
    { mid:546195, name:'老番茄', category:'游戏创作' },
    { mid:517327498, name:'罗翔说刑法', category:'法律知识' },
    { mid:9824766, name:'敬汉卿', category:'生活创作' },
    { mid:946974, name:'影视飓风', category:'影像科技' },
    { mid:163637592, name:'老师好我叫何同学', category:'科技数码' },
    { mid:562197, name:'中国BOY超级大猩猩', category:'游戏与生活' },
    { mid:1577804, name:'某幻君', category:'游戏与音乐' },
    { mid:168598, name:'逍遥散人', category:'游戏创作' },
    { mid:777536, name:'LexBurner', category:'动画与直播' },
    { mid:122879, name:'敖厂长', category:'游戏创作' },
  ];
  let loopEnd = .95;
  const geometry = { cx:800.49, cy:2175.5, b:1613.106,
    a:[1742.909,1359.76,972.447,639.275,343.584,106.199] };
  const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
  const smooth = v => { const t=clamp(v); return t*t*(3-2*t); };
  function point(lane, side, theta) {
    // Each meridian lies on the same normalized sphere shell. Figma uses an
    // artistic X/Y projection, preserved here instead of adding another camera.
    return { x:geometry.cx+side*geometry.a[lane]*Math.sin(theta),
      y:geometry.cy-geometry.b*Math.cos(theta), depth:Math.sin(theta) };
  }
  function advance(theta, elapsed, speed) {
    return ((theta-elapsed*speed)%loopEnd+loopEnd)%loopEnd;
  }
  function faceSize(theta, factor) {
    return (8+112*Math.sin(theta)**1.5)*factor;
  }
  const assets = new Map(manifest.assets.map(asset => [asset.constant, asset]));
  const avatarAssets = manifest.assets.filter(a => /^imgUp\d*$/.test(a.constant));
  const faces = avatarAssets.map((asset, index) => {
    const source = asset.uses[0].layer;
    const x=source.x+source.width/2, y=source.y+source.height/2;
    const originalTheta=Math.acos(clamp((geometry.cy-y)/geometry.b,-1,1));
    const side=x<geometry.cx ? -1 : 1;
    const lane=geometry.a.reduce((best,a,i) =>
      Math.abs(geometry.cx+side*a*Math.sin(originalTheta)-x)<
      Math.abs(point(best,side,originalTheta).x-x) ? i : best,0);
    const theta=originalTheta%loopEnd;
    const factor=clamp(source.width/faceSize(originalTheta,1),.65,1.3);
    const profile=profiles[index%profiles.length];
    const button=document.createElement('button');
    button.type='button'; button.className='planet2-avatar'; button.tabIndex=-1;
    button.setAttribute('aria-label',`${profile.name}，${profile.category}`);
    button.dataset.creator=String(profile.mid);
    const image=document.createElement('img');
    image.src=`assets/creators/featured-${profile.mid}.jpg`;
    image.alt=''; image.width=120; image.height=120; image.decoding='async'; image.draggable=false;
    button.append(image); layer.append(button);
    return {index,lane,side,theta,factor,profile,button,image,
      speed:.022+(index%4)*.0015, position:null, visible:false};
  });
  let width=0, height=0, ratio=1, scale=1, offsetX=0, offsetY=0;
  let backdrop=null, frame=0, last=0, ready=false, sequence=0;
  let active=null, focused=null, pinned=null, pointerInside=false;
  let flowTime=0, resizePending=true, introDone=false;
  let rebuildSequence=0, visible=true, backdropTask=null;
  let pointer={x:0,y:0};
  let ink='rgba(255,102,153,1)';

  const loadImage = src => new Promise((resolve,reject) => {
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error(`Image failed: ${src}`));
    image.src=src;
  });
  function assetBox(asset) {
    const use=asset.uses[0], n=use.layer;
    const w=Number(asset.natural.width), h=Number(asset.natural.height);
    return {n,w,h,matrix:use.transform?.matrix||[1,0,0,1,n.x,n.y],
      left:-(w-n.width)/2,top:-(h-n.height)/2};
  }
  function rebuildBackdrop() {
    backdropTask=buildBackdrop();
    return backdropTask;
  }
  async function buildBackdrop() {
    const current=++rebuildSequence;
    const cache=document.createElement('canvas');
    cache.width=Math.round(width*ratio); cache.height=Math.round(height*ratio);
    const pen=cache.getContext('2d');
    pen.scale(ratio,ratio); pen.translate(offsetX,offsetY); pen.scale(scale,scale);
    // Ordered exactly as the Figma stack: four light surfaces, sphere, 23 halo
    // layers, six original tracks, sphere stars, then the ambient stars frame.
    const names=['img','img1','img2','img3','img4',
      ...Array.from({length:29},(_,i)=>`img${i+5}`),
      'imgEllipse23644','imgEllipse23629','imgEllipse23645','imgEllipse23647',
      'imgEllipse23630','imgStar1','imgStar2','imgStar6','img34'];
    for(const name of names) {
      const asset=assets.get(name); if(!asset) continue;
      const image=await loadImage(asset.path);
      if(current!==rebuildSequence) return;
      for(const use of asset.uses) {
        const n=use.layer;
        if(!n?.effectiveVisible) continue;
        const {w,h,left,top}=assetBox({...asset,uses:[use]});
        const matrix=use.transform?.matrix||[1,0,0,1,n.x,n.y];
        pen.save(); pen.transform(...matrix); pen.globalAlpha=n.opacity??1;
        pen.drawImage(image,left,top,w,h); pen.restore();
      }
    }
    if(current===rebuildSequence) {backdrop=cache;requestDraw();}
  }
  function measure(rebuild=true) {
    width=hero.clientWidth; height=hero.clientHeight;
    ratio=Math.min(devicePixelRatio||1,1.5);
    // Desktop follows the full 1600px composition. Narrow screens retain the
    // sphere's breadth; cropping occurs at the viewport, never via page width.
    scale=width>760 ? width/1600 : Math.max(.52,width/1000);
    offsetX=(width-1600*scale)/2;
    const horizon=width>760 ? height*(562.39/900) : height*.64;
    offsetY=horizon-562.39*scale;
    // Reset below the whole viewport, including the largest portrait. Tall
    // narrow screens need a longer hidden part of the same spherical path.
    const resetY=(height+100-offsetY)/scale;
    loopEnd=Math.max(.95,Math.acos(clamp((geometry.cy-resetY)/geometry.b,-1,1))+.025);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ink=getComputedStyle(root).getPropertyValue('--brand').trim()||ink;
    resizePending=false;
    if(rebuild)rebuildBackdrop().catch(showAssetError);
  }
  function currentPose() {
    const scroll=Number(canvas.style.getPropertyValue('--fire-scroll')||0);
    return {scroll,shrink:1-scroll*.08,shift:-height*.25*scroll};
  }
  function screenPoint(p,pose) {
    const x=offsetX+p.x*scale, y=offsetY+p.y*scale;
    return {x:width/2+(x-width/2)*pose.shrink,
      y:y*pose.shrink+pose.shift,depth:p.depth};
  }
  function drawFlows(pose) {
    ctx.save();
    ctx.translate(width/2,pose.shift); ctx.scale(pose.shrink,pose.shrink);
    ctx.translate(-width/2,0); ctx.translate(offsetX,offsetY); ctx.scale(scale,scale);
    ctx.lineCap='round';
    for(let lane=0;lane<6;lane++) for(const side of [-1,1]) {
      for(let packet=0;packet<2;packet++) {
        const theta=advance(.12+packet*.46+lane*.071,flowTime,.075);
        for(let step=0;step<24;step++) {
          const a=theta+step*.005, b=a+.007;
          if(b>loopEnd) continue;
          const p=point(lane,side,a),q=point(lane,side,b);
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
          ctx.strokeStyle=step<2?'rgba(255,241,247,1)':ink;
          ctx.globalAlpha=(1-step/24)**1.6*smooth(theta/.035)*.88;
          ctx.lineWidth=(step<3?2.2:1.6);ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  function showAssetError(error) {
    root.dataset.planet2AssetState='error';
    root.classList.remove('planet2-intro-pending');
    console.error(error);
  }
  function syncCard() {
    const face=focused||pinned||active;
    const pose=currentPose();
    const available=ready&&pose.scroll<.05&&face?.visible;
    card.hidden=!available; card.setAttribute('aria-hidden',String(!available));
    faces.forEach(f=>{
      if(available&&f===face) f.button.setAttribute('aria-describedby',card.id);
      else f.button.removeAttribute('aria-describedby');
    });
    if(!available) return;
    const profile=face.profile;
    const src=`assets/creators/featured-${profile.mid}.jpg`;
    if(cardImage.getAttribute('src')!==src) cardImage.src=src;
    cardName.textContent=profile.name;cardCategory.textContent=profile.category;
    const bounds=hero.getBoundingClientRect();
    const p=face.position;
    // Position next to the stopped portrait, with no pointer tracking or
    // re-targeting when another moving portrait crosses beneath this card.
    const cardWidth=card.offsetWidth,cardHeight=card.offsetHeight;
    let x=bounds.left+p.x+face.size/2+12;
    if(x+cardWidth>innerWidth-12) x=bounds.left+p.x-face.size/2-cardWidth-12;
    x=clamp(x,12,innerWidth-cardWidth-12);
    const y=clamp(bounds.top+p.y-cardHeight/2,90,innerHeight-cardHeight-12);
    card.style.transform=`translate(${x}px,${y}px)`;
  }
  function release({keyboard=false,schedule=true}={}) {
    active=null;pinned=null;if(keyboard) focused=null;
    card.hidden=true;card.setAttribute('aria-hidden','true');
    cursor.hidden=true;pointerInside=false;
    hero.classList.remove('is-planet-pointer');
    if(schedule)requestDraw();
  }
  function setHover(face) {
    active=face;requestDraw();syncCard();
  }
  faces.forEach((face,index)=>{
    face.button.addEventListener('pointerenter',event=>{
      if(event.pointerType==='touch'||!fine.matches||reduce.matches) return;
      setHover(face);
    });
    face.button.addEventListener('pointerleave',()=>{
      if(active===face)active=null;syncCard();requestDraw();
    });
    face.button.addEventListener('focus',()=>{focused=face;syncCard();requestDraw();});
    face.button.addEventListener('blur',()=>{if(focused===face)focused=null;syncCard();requestDraw();});
    face.button.addEventListener('click',()=>{
      pinned=pinned===face?null:face;syncCard();requestDraw();
    });
    face.button.addEventListener('keydown',event=>{
      if(event.key==='Escape'){face.button.blur();release({keyboard:true});return;}
      const candidates=faces.filter(f=>f.visible);
      const current=candidates.indexOf(face);
      let next;
      if(['ArrowRight','ArrowDown'].includes(event.key))next=(current+1)%candidates.length;
      else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(current-1+candidates.length)%candidates.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=candidates.length-1;
      else return;
      event.preventDefault();candidates[next]?.button.focus({preventScroll:true});
    });
  });
  function draw(now) {
    frame=0;
    if(document.hidden||!visible) {last=0;return;}
    if(resizePending) measure();
    const elapsed=last?Math.min(.04,(now-last)/1000):0;
    last=now;
    const pose=currentPose();
    const animate=ready&&introDone&&!reduce.matches;
    if(animate)flowTime+=elapsed;
    ctx.clearRect(0,0,width,height);
    ctx.save();ctx.translate(width/2,pose.shift);ctx.scale(pose.shrink,pose.shrink);ctx.translate(-width/2,0);
    if(backdrop)ctx.drawImage(backdrop,0,0,width,height);
    ctx.restore();drawFlows(pose);
    layer.style.opacity=canvas.style.opacity||'1';
    let firstVisible=null;
    faces.forEach(face=>{
      const stopped=face===active||face===focused||face===pinned;
      if(animate&&!stopped)face.theta=advance(face.theta,elapsed,face.speed);
      const p=screenPoint(point(face.lane,face.side,face.theta),pose);
      face.position=p;
      const size=faceSize(face.theta,face.factor)*Math.max(.7,scale)*pose.shrink;
      face.size=size;
      const alpha=smooth(face.theta/.035);
      const shown=p.x+size/2>0&&p.x-size/2<width&&p.y+size/2>100&&p.y-size/2<height&&alpha>.02;
      face.visible=shown;
      face.button.hidden=!shown;
      face.button.style.width=`${size}px`;face.button.style.height=`${size}px`;
      face.button.style.transform=`translate(${p.x-size/2}px,${p.y-size/2}px)`;
      face.button.style.opacity=String(alpha);
      face.button.style.zIndex=String(stopped?1000:Math.round(p.depth*100));
      face.button.dataset.theta=face.theta.toFixed(6);
      face.button.dataset.lane=String(face.lane);
      if(shown&&!firstVisible)firstVisible=face;
      face.button.tabIndex=face===focused?0:-1;
    });
    if(!focused&&firstVisible)firstVisible.button.tabIndex=0;
    if(pose.scroll>.05)release({schedule:false});
    else syncCard();
    if(animate)requestDraw();else last=0;
  }
  function requestDraw() {
    if(!frame&&!document.hidden&&visible)frame=requestAnimationFrame(draw);
  }
  hero.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!fine.matches||reduce.matches||!ready||!introDone)return;
    const bounds=hero.getBoundingClientRect();
    pointer={x:event.clientX-bounds.left,y:event.clientY-bounds.top};
    const designX=(pointer.x-offsetX)/scale;
    const designY=(pointer.y-offsetY)/scale;
    const shellY=geometry.cy-geometry.b*Math.sqrt(Math.max(0,1-((designX-geometry.cx)/geometry.a[0])**2));
    pointerInside=currentPose().scroll<.05&&designY>=shellY-40&&pointer.y<=height&&
      !event.target.closest('a,select,.hero-actions,header');
    hero.classList.toggle('is-planet-pointer',pointerInside);
    cursor.hidden=!pointerInside;
    if(pointerInside)cursor.style.transformOrigin='0 0';
    if(pointerInside)cursor.style.transform=`translate(${event.clientX-23.83}px,${event.clientY+.35}px) rotate(-45deg)`;
  },{passive:true});
  hero.addEventListener('pointerleave',()=>release());
  document.addEventListener('keydown',event=>{if(event.key==='Escape')release({keyboard:true});});
  window.addEventListener('scroll',()=>{
    release();
    if(scrollY>24) {
      introDone=true;root.classList.remove('planet2-intro-pending','planet2-entering');
    }
    requestDraw();
  },{passive:true});
  window.addEventListener('blur',()=>release());
  window.addEventListener('resize',()=>{resizePending=true;release();requestDraw();},{passive:true});
  canvas.addEventListener('hero-progress',requestDraw);
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(!visible){cancelAnimationFrame(frame);frame=0;last=0;release();}
    else requestDraw();
  });observer.observe(hero);
  document.addEventListener('visibilitychange',()=>{
    cancelAnimationFrame(frame);frame=0;last=0;release();
    if(!document.hidden)requestDraw();
  });
  reduce.addEventListener('change',()=>{
    introDone=true;root.classList.remove('planet2-intro-pending','planet2-entering');
    release();requestDraw();
  });
  fine.addEventListener('change',()=>{release();requestDraw();});

  async function initialize() {
    measure(false);
    // One gate coordinates all visible copy with the decoded original artwork.
    await Promise.all([rebuildBackdrop(),document.fonts?.ready||Promise.resolve(),
      ...profiles.map(profile=>loadImage(`assets/creators/featured-${profile.mid}.jpg`))]);
    // A resize can supersede the first drawing task while its images decode.
    // Follow the newest task until the completed cache matches this viewport.
    let settled;
    do { settled=backdropTask; await settled; } while(settled!==backdropTask);
    if(!backdrop)throw new Error('Hero artwork did not finish loading');
    ready=true;root.dataset.planet2AssetState='ready';
    document.querySelector('[data-hero-effect-select]').value='planet2';
    root.classList.remove('planet-intro-pending','planet-title-entering');
    const shouldAnimate=!reduce.matches&&scrollY<24;
    root.classList.remove('planet2-intro-pending');
    if(shouldAnimate) {
      // Text and sphere CSS animations share this same style update; their
      // animation-delay values differ by exactly 300ms, including cached loads.
      root.classList.add('planet2-entering');
      const current=++sequence;
      const duration=parseFloat(getComputedStyle(root).getPropertyValue('--planet2-sphere-duration'))||1400;
      const delay=parseFloat(getComputedStyle(root).getPropertyValue('--planet2-sphere-delay'))||300;
      setTimeout(()=>{
        if(current!==sequence)return;
        introDone=true;root.classList.remove('planet2-entering');requestDraw();
      },duration+delay+40);
    }else introDone=true;
    requestDraw();
  }
  initialize().catch(showAssetError);
})();

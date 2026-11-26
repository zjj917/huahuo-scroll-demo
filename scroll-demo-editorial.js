/* 内容橱窗: content filters and service reading controls.
   Navigation, contact dialogs and FAQ reuse the existing independent modules. */
(() => {
  'use strict';
  const header=document.querySelector('.demo-header');
  const filters=[...document.querySelectorAll('[data-filter]')];
  const contentCards=[...document.querySelectorAll('[data-content-card]')];
  const count=document.querySelector('[data-content-count]');
  filters.forEach(button=>button.addEventListener('click',()=>{
    filters.forEach(filter=>filter.setAttribute('aria-pressed',String(filter===button)));
    let visible=0;
    contentCards.forEach(card=>{
      card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter;
      if(!card.hidden)visible++;
    });
    count.textContent=`${visible} 个内容`;
  }));

  const tabs=[...document.querySelectorAll('[data-service-tab]')];
  const panels=[...document.querySelectorAll('[data-service-panel]')];
  const previous=document.querySelector('[data-service-prev]');
  const next=document.querySelector('[data-service-next]');
  const counter=document.querySelector('[data-service-counter]');
  const meter=document.querySelector('[data-service-meter]');
  const controls=document.querySelector('[data-service-controls]');
  const serviceStatus=document.createElement('p');
  serviceStatus.className='sr-only';
  serviceStatus.setAttribute('role','status');
  controls.append(serviceStatus);
  const tablist=document.querySelector('.service-tabs');
  const compact=matchMedia('(max-width:900px)');
  const indices=new Map(panels.map(panel=>[panel.dataset.servicePanel,0]));
  let active=0;
  function renderService(){
    tabs.forEach((tab,index)=>{
      tab.setAttribute('aria-selected',String(index===active));
      tab.tabIndex=index===active?0:-1;
      panels[index].hidden=index!==active;
    });
    const panel=panels[active];
    const figures=[...panel.querySelectorAll('[data-service-figure]')];
    const index=indices.get(panel.dataset.servicePanel);
    figures.forEach((figure,at)=>{figure.hidden=at!==index;});
    previous.disabled=index===0;
    next.disabled=index===figures.length-1;
    counter.textContent=`${index+1} / ${figures.length}`;
    serviceStatus.textContent=`${figures[index].querySelector('figcaption').textContent}，第${index+1}张，共${figures.length}张`;
    meter.style.width=`${(index+1)/figures.length*100}%`;
    // Keep the count visible for the single analysis image; paging buttons are
    // disabled explicitly so keyboard users can understand that it is complete.
    controls.setAttribute('aria-label',`${tabs[active].textContent.trim()}图片导航`);
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>{active=index;renderService();});
    tab.addEventListener('keydown',event=>{
      const forward=compact.matches?'ArrowRight':'ArrowDown';
      const backward=compact.matches?'ArrowLeft':'ArrowUp';
      let target;
      if(event.key===forward)target=(index+1)%tabs.length;
      else if(event.key===backward)target=(index-1+tabs.length)%tabs.length;
      else if(event.key==='Home')target=0;
      else if(event.key==='End')target=tabs.length-1;
      else return;
      event.preventDefault();active=target;renderService();tabs[target].focus();
    });
  });
  function moveService(direction){
    const trigger=document.activeElement;
    const key=panels[active].dataset.servicePanel;
    const last=panels[active].querySelectorAll('[data-service-figure]').length-1;
    indices.set(key,Math.max(0,Math.min(last,indices.get(key)+direction)));
    renderService();
    if(trigger===previous&&previous.disabled)(next.disabled?panels[active]:next).focus({preventScroll:true});
    if(trigger===next&&next.disabled)(previous.disabled?panels[active]:previous).focus({preventScroll:true});
  }
  previous.addEventListener('click',()=>moveService(-1));
  next.addEventListener('click',()=>moveService(1));
  function orientation(){tablist.setAttribute('aria-orientation',compact.matches?'horizontal':'vertical');}
  compact.addEventListener('change',orientation);orientation();renderService();

  // A failed image retains its title and native alternative text; no unrelated
  // creator portrait or substituted campaign image is injected as a fallback.
  document.querySelectorAll('.content-cover>img').forEach(image=>{
    const fail=()=>image.closest('.content-card').classList.add('has-image-error');
    image.addEventListener('error',fail,{once:true});
    if(image.complete&&!image.naturalWidth)fail();
  });
  let frame=0;
  function updateHeader(){
    frame=0;header.classList.toggle('is-scrolled',scrollY>8);
    if(scrollY<document.querySelector('.editorial-hero').offsetHeight*.5){
      document.querySelectorAll('.demo-nav a').forEach(link=>{link.classList.remove('is-active');link.removeAttribute('aria-current');});
    }
  }
  window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(updateHeader);},{passive:true});
  updateHeader();
  if('IntersectionObserver'in window){
    const navLinks=[...document.querySelectorAll('.demo-nav a')];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        navLinks.forEach(link=>{
          const current=link.hash===`#${entry.target.id}`;
          link.classList.toggle('is-active',current);
          if(current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
        });
      }
    },{rootMargin:'-15% 0px -65% 0px',threshold:0});
    ['content','services','cases','tail-faq'].forEach(id=>observer.observe(document.getElementById(id)));
  }
})();

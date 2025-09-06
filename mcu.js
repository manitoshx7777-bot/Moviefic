/* CONFIG */
const STAR_COUNT = 100;
const INTRO_SHORT_MS = 4000;
const INTRO_DESKTOP_MS = 6500;
const DATA_PATH = '/data/mcu.json';
const MOBILE_BREAK = 768;

/* STARFIELD */
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let w = canvas.width = innerWidth;
let h = canvas.height = innerHeight;
let stars = [];
function initStars(){
  stars = [];
  for(let i=0;i<STAR_COUNT;i++){
    stars.push({
      x: Math.random()*w,
      y: Math.random()*h,
      r: Math.random()*1.6+0.4,
      vx: (Math.random()-0.5)*0.15,
      vy: (Math.random()-0.5)*0.15,
      hue: 200 + Math.random()*55
    });
  }
}
initStars();

let mouseX = w/2, mouseY = h/2;
window.addEventListener('mousemove',(e)=>{mouseX=e.clientX;mouseY=e.clientY});
window.addEventListener('touchstart',(e)=>{if(e.touches && e.touches[0]){mouseX=e.touches[0].clientX;mouseY=e.touches[0].clientY; burst(mouseX,mouseY)}});

function burst(cx,cy){
  for(let i=0;i<10;i++){
    stars.push({x:cx+Math.random()*40-20,y:cy+Math.random()*40-20,r:Math.random()*2+0.6,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,hue: Math.random()*60+200})
  }
  setTimeout(()=>{stars = stars.slice(0,STAR_COUNT)},400);
}

function renderStars(){
  ctx.clearRect(0,0,w,h);
  const dx = (mouseX - w/2) * 0.002;
  const dy = (mouseY - h/2) * 0.002;
  for(let s of stars){
    s.x += s.vx + dx;
    s.y += s.vy + dy;
    if(s.x < -10) s.x = w+10;
    if(s.x > w+10) s.x = -10;
    if(s.y < -10) s.y = h+10;
    if(s.y > h+10) s.y = -10;

    const g = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*6);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(0.6,'rgba(200,200,255,0.6)');
    g.addColorStop(1,'rgba(0,0,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fill();
  }
  requestAnimationFrame(renderStars);
}
renderStars();
window.addEventListener('resize',()=>{w=canvas.width=innerWidth;h=canvas.height=innerHeight;initStars()});

/* INTRO TIMING */
const intro = document.getElementById('intro');
const header = document.querySelector('header.mcu-header');
const menuBtn = document.getElementById('menuBtn');
const menuBody = document.getElementById('menuBody');
const timelineEl = document.getElementById('timeline');
const gridEl = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const toggleOrderBtn = document.getElementById('toggleOrder');

function startIntro(){
  const short = innerWidth < MOBILE_BREAK;
  const fadeInAt = 2000;
  const showDuration = short ? 1000 : 3000;
  const moveAt = fadeInAt + showDuration;
  const hideAt = short ? INTRO_SHORT_MS : INTRO_DESKTOP_MS;

  setTimeout(()=> intro.classList.add('show'), fadeInAt);
  setTimeout(()=> intro.classList.add('moveUp'), moveAt);
  setTimeout(()=> {
    intro.style.display='none';
    header.classList.add('active');
    menuBtn.style.display='block';
    menuBtn.setAttribute('aria-hidden','false');
    menuBody.setAttribute('aria-hidden','false');
    document.body.style.overflowX = 'hidden';
  }, hideAt);
}
startIntro();

/* DATA + RENDERING */
let allData = [];
let currentOrder = 'chron';
let currentPhaseFilter = 'all';
let currentTypeFilter = 'all';
let currentSearch = '';

async function loadData(){
  try{
    const res = await fetch(DATA_PATH);
    if(!res.ok) throw new Error('Failed to fetch mcu.json');
    allData = await res.json();
    allData.forEach((it,i)=>{ it._idx = i });
    renderAll();
    startSpotlightRotation();
  }catch(err){
    console.error(err);
    timelineEl.innerHTML = '<div style="padding:20px;color:#f66">Failed to load MCU data — check /data/mcu.json</div>';
  }
}
loadData();

function sortData(arr){
  return arr.slice().sort((a,b)=>{
    if(currentOrder === 'chron'){
      const da = new Date(a.chronological_date||a.release_date||a.release_date);
      const db = new Date(b.chronological_date||b.release_date||b.release_date);
      return da - db;
    } else {
      const da = new Date(a.release_date||a.chronological_date||a.release_date);
      const db = new Date(b.release_date||b.chronological_date||b.release_date);
      return da - db;
    }
  });
}

function matchesFilters(item){
  if(currentPhaseFilter !== 'all' && String(item.phase) !== String(currentPhaseFilter)) return false;
  if(currentTypeFilter !== 'all' && item.type.toLowerCase() !== currentTypeFilter.toLowerCase()) return false;
  if(currentSearch){
    const qs = currentSearch.toLowerCase();
    if(!(item.title.toLowerCase().includes(qs) || (item.cast && item.cast.join(' ').toLowerCase().includes(qs)) || (item.synopsis && item.synopsis.toLowerCase().includes(qs)))) return false;
  }
  return true;
}

function renderAll(){
  const sorted = sortData(allData);
  // timeline
  timelineEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(let item of sorted){
    if(!matchesFilters(item)) continue;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.tabIndex = 0;
    chip.dataset.id = item.id;

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = item.poster || 'images/placeholder.jpg';
    img.alt = item.title + ' poster';
    img.addEventListener('error', ()=> { img.src = 'images/placeholder.jpg'; });

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div class="title">${item.title}</div><div class="year">${item.year} • ${item.type}</div>`;

    chip.appendChild(img);
    chip.appendChild(meta);
    frag.appendChild(chip);
  }
  timelineEl.appendChild(frag);

  // grid
  gridEl.innerHTML = '';
  const gridFrag = document.createDocumentFragment();
  for(let item of sorted){
    if(!matchesFilters(item)) continue;
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.dataset.id = item.id;

    const img = document.createElement('img');
    img.className = 'poster';
    img.loading = 'lazy';
    img.src = item.poster || 'images/placeholder.jpg';
    img.alt = item.title + ' poster';
    img.addEventListener('error', ()=> { img.src = 'images/placeholder.jpg'; });

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<h3>${item.title}</h3><p>${item.year} • Phase ${item.phase} • ${item.type}</p>`;

    card.appendChild(img);
    card.appendChild(info);
    gridFrag.appendChild(card);
  }
  gridEl.appendChild(gridFrag);
}

/* MODALS + EVENTS (delegation) */
let lastFocusedEl = null;
document.addEventListener('click', (ev)=>{
  const el = ev.target.closest('.chip, .card');
  if(el && el.dataset.id){
    const id = el.dataset.id;
    const item = allData.find(x=>x.id === id);
    if(item) openModal(item, el);
  }
  if(ev.target.id === 'menuBtn' || ev.target.closest('#menuBtn')){
    const open = menuBody.classList.toggle('show');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBody.setAttribute('aria-hidden', String(!open));
  }
});

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    const focused = document.activeElement;
    if(focused && (focused.classList.contains('chip') || focused.classList.contains('card'))){
      focused.click();
    }
  }
  if(e.key === 'Escape'){
    const mb = document.querySelector('.modal-backdrop');
    if(mb) closeModal();
  }
});

function openModal(item, originEl){
  lastFocusedEl = originEl || document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.tabIndex = -1;
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(item.title)} details">
      <button class="close-btn" aria-label="Close">&times;</button>
      <img class="poster" src="${item.poster||'images/placeholder.jpg'}" alt="${escapeHtml(item.title)} poster">
      <div>
        <h2>${escapeHtml(item.title)} <span style="font-size:14px;color:#ddd">(${item.year})</span></h2>
        <div style="font-size:13px;color:#bbb;margin-bottom:8px">Phase ${item.phase} • ${item.type} • ${item.runtime_min ? item.runtime_min+' min':''}</div>
        <p>${escapeHtml(item.synopsis || 'Synopsis not available.')}</p>
        <div style="margin-top:8px;color:#ddd;font-size:13px"><strong>Cast:</strong> ${escapeHtml((item.cast||[]).slice(0,6).join(', ') || '—')}</div>
        <div style="margin-top:10px;font-size:13px;color:#f5d400"><strong>Post-credit:</strong> ${escapeHtml(item.post_credit || 'None')}</div>
      </div>
    </div>`;
  backdrop.querySelector('.close-btn').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  const focusable = backdrop.querySelector('button, a, input, [tabindex]') || backdrop;
  focusable.focus();
}

function closeModal(){
  const mb = document.querySelector('.modal-backdrop');
  if(mb) mb.remove();
  if(lastFocusedEl) try{ lastFocusedEl.focus(); }catch(e){}
}

/* FILTERS / UI HELPERS */
function cyclePhaseFilter(){
  const pill = document.getElementById('filterPhase');
  const mapping = ['all','1','2','3','4','5','6'];
  const idx = mapping.indexOf(String(currentPhaseFilter));
  const next = mapping[(idx+1) % mapping.length];
  currentPhaseFilter = next;
  pill.textContent = next === 'all' ? 'Phase: All' : 'Phase: '+next;
  pill.classList.toggle('active', next !== 'all');
}

function cycleTypeFilter(){
  const pill = document.getElementById('filterType');
  const mapping = ['all','Movie','Series'];
  const idx = mapping.indexOf(currentTypeFilter === 'all' ? 'all' : currentTypeFilter);
  const next = mapping[(idx+1) % mapping.length];
  currentTypeFilter = next;
  pill.textContent = next === 'all' ? 'Type: All' : 'Type: '+next;
  pill.classList.toggle('active', next !== 'all');
}

function toggleOrder(){
  currentOrder = currentOrder === 'chron' ? 'release' : 'chron';
  toggleOrderBtn.textContent = currentOrder === 'chron' ? 'In-Universe' : 'Release';
  toggleOrderBtn.setAttribute('aria-pressed', String(currentOrder !== 'chron'));
}

/* SEARCH */
let searchTimer = null;
searchInput.addEventListener('input', ()=> {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(()=> {
    currentSearch = searchInput.value.trim();
    renderAll();
  }, 250);
});

/* SPOTLIGHT */
let spotlightIndex = 0;
function startSpotlightRotation(){
  const sName = document.getElementById('spotlightName');
  const sImg = document.querySelector('.spotlight img');
  if(!allData || allData.length === 0) return;
  setInterval(()=>{
    spotlightIndex = (spotlightIndex + 1) % allData.length;
    const pick = allData[spotlightIndex];
    if(pick){
      sName.textContent = pick.title.split(':')[0];
      sImg.src = pick.poster || 'images/spot-ironman.jpg';
    }
  }, 7000);
}

/* UTIL */
function escapeHtml(str){ if(!str) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* INIT UI bindings */
document.getElementById('filterAll').addEventListener('click', ()=>{
  currentPhaseFilter='all'; currentTypeFilter='all';
  document.getElementById('filterAll').classList.add('active');
  document.getElementById('filterPhase').classList.remove('active');
  document.getElementById('filterType').classList.remove('active');
  renderAll();
});
document.getElementById('filterPhase').addEventListener('click', ()=>{ cyclePhaseFilter(); renderAll(); });
document.getElementById('filterType').addEventListener('click', ()=>{ cycleTypeFilter(); renderAll(); });
toggleOrderBtn.addEventListener('click', ()=>{ toggleOrder(); renderAll(); });

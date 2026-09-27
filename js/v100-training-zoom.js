/* LAB Industrial v11.1.1 · Training Zoom
   Zoom independiente para Entrenamiento. Usa viewBox real para no cortar nodos. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const TZ={scale:1,base:null,cx:null,cy:null,drag:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function parseViewBox(svg){
  const raw=(svg?.getAttribute('viewBox')||'0 0 1000 560').trim().split(/\s+/).map(Number);
  if(raw.length!==4||raw.some(v=>!Number.isFinite(v)))return{x:0,y:0,w:1000,h:560};
  return{x:raw[0],y:raw[1],w:Math.max(1,raw[2]),h:Math.max(1,raw[3])};
}
function paddedBase(vb){
  const px=Math.max(24,vb.w*.035),py=Math.max(20,vb.h*.035);
  return{x:vb.x-px,y:vb.y-py,w:vb.w+2*px,h:vb.h+2*py};
}
function ensureCenter(){
  if(!TZ.base)return;
  if(!Number.isFinite(TZ.cx))TZ.cx=TZ.base.x+TZ.base.w/2;
  if(!Number.isFinite(TZ.cy))TZ.cy=TZ.base.y+TZ.base.h/2;
}
function visibleBox(){
  if(!TZ.base)return null;ensureCenter();
  const w=TZ.base.w/TZ.scale,h=TZ.base.h/TZ.scale;
  const minCx=TZ.base.x+w/2,maxCx=TZ.base.x+TZ.base.w-w/2;
  const minCy=TZ.base.y+h/2,maxCy=TZ.base.y+TZ.base.h-h/2;
  TZ.cx=minCx>maxCx?TZ.base.x+TZ.base.w/2:clamp(TZ.cx,minCx,maxCx);
  TZ.cy=minCy>maxCy?TZ.base.y+TZ.base.h/2:clamp(TZ.cy,minCy,maxCy);
  return{x:TZ.cx-w/2,y:TZ.cy-h/2,w,h};
}
function applyZoom(){
  const svg=$('trainingSvg'),box=visibleBox();if(!svg||!box)return;
  svg.style.transform='none';svg.style.transformOrigin='center center';
  svg.setAttribute('viewBox',`${box.x} ${box.y} ${box.w} ${box.h}`);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const pct=Math.round(TZ.scale*100);
  if($('trainingZoomRange'))$('trainingZoomRange').value=String(pct);
  if($('trainingZoomValue'))$('trainingZoomValue').textContent=`${pct}%`;
  const mirror=svg.closest('.training-mirror');if(mirror){mirror.classList.toggle('is-zoomed',TZ.scale>1.001);mirror.dataset.zoom=String(pct)}
  updateButtons();
}
function updateButtons(){
  const minus=$('trainingZoomOut'),plus=$('trainingZoomIn');
  if(minus)minus.disabled=TZ.scale<=1.001;if(plus)plus.disabled=TZ.scale>=3-0.001;
}
function setScale(next,anchor){
  const oldScale=TZ.scale,oldBox=visibleBox();
  TZ.scale=clamp(next,1,3);
  if(anchor&&oldBox){
    const rx=clamp(anchor.rx,0,1),ry=clamp(anchor.ry,0,1);
    const pointX=oldBox.x+oldBox.w*rx,pointY=oldBox.y+oldBox.h*ry;
    const newW=TZ.base.w/TZ.scale,newH=TZ.base.h/TZ.scale;
    TZ.cx=pointX+(0.5-rx)*newW;TZ.cy=pointY+(0.5-ry)*newH;
  }
  if(Math.abs(TZ.scale-oldScale)>1e-6)applyZoom();
}
function fit(){TZ.scale=1;if(TZ.base){TZ.cx=TZ.base.x+TZ.base.w/2;TZ.cy=TZ.base.y+TZ.base.h/2}applyZoom()}

function copyTrainingSvg(){
  const src=$('networkSvg'),dst=$('trainingSvg');if(!src||!dst)return;
  const old=TZ.base,oldCx=TZ.cx,oldCy=TZ.cy;
  dst.innerHTML=src.innerHTML;
  dst.querySelectorAll('.svg-node,.edge').forEach(x=>x.style.cursor='default');
  const vb=parseViewBox(src);TZ.base=paddedBase(vb);
  if(old&&Number.isFinite(oldCx)&&Number.isFinite(oldCy)){
    const rx=(oldCx-old.x)/old.w,ry=(oldCy-old.y)/old.h;
    TZ.cx=TZ.base.x+clamp(rx,0,1)*TZ.base.w;TZ.cy=TZ.base.y+clamp(ry,0,1)*TZ.base.h;
  }else{TZ.cx=TZ.base.x+TZ.base.w/2;TZ.cy=TZ.base.y+TZ.base.h/2}
  dst.style.width='100%';dst.style.height='100%';dst.style.minHeight='0';
  applyZoom();
}

function buildToolbar(){
  const svg=$('trainingSvg'),card=svg?.closest('article');if(!svg||!card||$('trainingZoomToolbar'))return;
  card.id=card.id||'trainingVisualCard';
  const mirror=svg.closest('.training-mirror');
  const bar=document.createElement('div');bar.id='trainingZoomToolbar';bar.className='training-zoom-toolbar';
  bar.innerHTML=`
    <div class="training-zoom-title"><span>Vista de entrenamiento</span><small>Amplía la red sin perder nodos ni etiquetas.</small></div>
    <div class="training-zoom-controls" role="group" aria-label="Zoom de la red durante entrenamiento">
      <button type="button" id="trainingZoomOut" aria-label="Alejar" title="Alejar">−</button>
      <label class="training-zoom-range"><span id="trainingZoomValue">100%</span><input id="trainingZoomRange" type="range" min="100" max="300" step="10" value="100" aria-label="Nivel de zoom"></label>
      <button type="button" id="trainingZoomIn" aria-label="Acercar" title="Acercar">+</button>
      <button type="button" id="trainingZoomFit" class="training-fit-btn">Ajustar</button>
    </div>
    <div class="training-zoom-help"><span class="drag-dot"></span><span>Con zoom, arrastra con el mouse para recorrer la red.</span><span>Doble clic = ajustar.</span></div>`;
  mirror.parentNode.insertBefore(bar,mirror);
  $('trainingZoomOut').addEventListener('click',()=>setScale(TZ.scale-.25));
  $('trainingZoomIn').addEventListener('click',()=>setScale(TZ.scale+.25));
  $('trainingZoomFit').addEventListener('click',fit);
  $('trainingZoomRange').addEventListener('input',e=>setScale((+e.target.value||100)/100));
  mirror.addEventListener('dblclick',fit);

  mirror.addEventListener('pointerdown',e=>{
    if(TZ.scale<=1.001||e.button!==0||e.pointerType==='touch')return;
    const box=visibleBox();if(!box)return;
    TZ.drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:TZ.cx,cy:TZ.cy,box};
    mirror.setPointerCapture?.(e.pointerId);mirror.classList.add('is-panning');e.preventDefault();
  });
  mirror.addEventListener('pointermove',e=>{
    if(!TZ.drag||TZ.drag.id!==e.pointerId)return;
    const rect=mirror.getBoundingClientRect();
    const dx=e.clientX-TZ.drag.x,dy=e.clientY-TZ.drag.y;
    TZ.cx=TZ.drag.cx-dx/Math.max(1,rect.width)*TZ.drag.box.w;
    TZ.cy=TZ.drag.cy-dy/Math.max(1,rect.height)*TZ.drag.box.h;
    applyZoom();e.preventDefault();
  });
  const stopPan=e=>{if(!TZ.drag)return;try{mirror.releasePointerCapture?.(TZ.drag.id)}catch(_){}TZ.drag=null;mirror.classList.remove('is-panning')};
  mirror.addEventListener('pointerup',stopPan);mirror.addEventListener('pointercancel',stopPan);mirror.addEventListener('pointerleave',e=>{if(TZ.drag&&e.buttons===0)stopPan(e)});
}

function decoupleModelZoom(){
  const range=$('networkZoomRange');if(!range)return;
  range.oninput=e=>{
    const z=(+e.target.value||100)/100,model=$('networkSvg');
    if(model){model.style.transform=`scale(${z})`;model.style.transformOrigin='center center'}
    const train=$('trainingSvg');if(train)train.style.transform='none';
  };
}
function wrapMirror(){
  window.mirrorTrainingSvg=copyTrainingSvg;
}
function syncOnTab(){
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="train"],[data-go="train"]'))setTimeout(()=>{copyTrainingSvg();applyZoom()},100)});
}
function init(){buildToolbar();decoupleModelZoom();wrapMirror();syncOnTab();setTimeout(()=>{copyTrainingSvg();fit()},140)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.LABTrainingZoom={fit,setScale,get scale(){return TZ.scale},sync:copyTrainingSvg};
})();

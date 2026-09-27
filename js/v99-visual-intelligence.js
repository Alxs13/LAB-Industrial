/* LAB Industrial v11.1 · Visual Intelligence UI
   Objetivo: primero ver, luego leer. Reordena la experiencia sin quitar funciones. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const VI={
  view:localStorage.getItem('lab-net-view')||'full',
  edges:localStorage.getItem('lab-net-edges')||'important',
  focus:Number(localStorage.getItem('lab-net-focus')??-1),
  observer:null
};

function safe(name,...args){try{return typeof window[name]==='function'?window[name](...args):undefined}catch(e){console.warn('[Visual Intelligence]',name,e);return undefined}}
function net(){try{return typeof currentNet==='function'?currentNet():null}catch(e){return null}}
function model(){try{return typeof currentVisualModel==='function'?currentVisualModel():null}catch(e){return null}}
function descriptors(){try{return typeof inputNeuronDescriptorsV92==='function'?inputNeuronDescriptorsV92():[]}catch(e){return[]}}
function problem(){try{return typeof currentProblemTemplateV92==='function'?currentProblemTemplateV92():null}catch(e){return null}}
function outputCount(p,m){try{if(m?.multiclass)return m.sizes.at(-1);if(typeof problemOutputCountV92==='function')return problemOutputCountV92(p)}catch(e){}return 1}
function outputLabels(p,count,m){try{if(typeof outputLabelsV92==='function')return outputLabelsV92(p,count,m)}catch(e){}return Array.from({length:count},(_,i)=>count===1?'ŷ':`Y${i+1}`)}
function cssVar(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim()}
function svgEl(tag,attrs,parent){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));parent.appendChild(e);return e}
function shorten(a,b,r){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;return{x1:a.x+ux*r,y1:a.y+uy*r,x2:b.x-ux*r,y2:b.y-uy*r}}
function sampledIndices(total,count){if(count>=total)return Array.from({length:total},(_,i)=>i);if(count<=1)return[0];const out=[];for(let k=0;k<count;k++)out.push(Math.round(k*(total-1)/(count-1)));return[...new Set(out)]}
function layerName(i,last){return i===0?'ENTRADAS':i===last?'SALIDA':`H${i}`}
function layerShort(i,last){return i===0?'X':i===last?'Y':`H${i}`}

function reorderHierarchy(){
  const modelTab=$('tab-networks'),hero=$('networkHeroCard'),guided=$('guidedModelStudio'),tabs=$('networkTabs'),input=modelTab?.querySelector('.input-link-card'),workspace=modelTab?.querySelector('.network-workspace');
  if(modelTab&&hero&&tabs){tabs.insertAdjacentElement('afterend',hero);hero.classList.add('visual-primary-card');if(guided)hero.insertAdjacentElement('afterend',guided);if(guided&&input)guided.insertAdjacentElement('afterend',input);if(input&&workspace)input.insertAdjacentElement('afterend',workspace);workspace?.classList.add('visual-config-zone')}

  const dataTab=$('tab-data'),dataGuide=$('guidedDataCoach'),xy=dataTab?.querySelector('.xy-focus-grid');if(dataGuide&&xy)xy.insertAdjacentElement('afterend',dataGuide);

  const trainTab=$('tab-train'),trainGuide=$('guidedTrainingStudio'),trainVisual=$('trainingSvg')?.closest('article'),trainGrid=trainTab?.querySelector('.modular-grid');
  if(trainTab&&trainVisual){trainTab.querySelector('.page-intro')?.insertAdjacentElement('afterend',trainVisual);trainVisual.classList.add('visual-primary-card','training-visual-hero');if(trainGuide)trainVisual.insertAdjacentElement('afterend',trainGuide);if(trainGuide&&trainGrid)trainGuide.insertAdjacentElement('afterend',trainGrid)}

  const resultGuide=$('guidedResultsStudio'),metrics=$('evaluationMetrics');if(resultGuide&&metrics)metrics.insertAdjacentElement('afterend',resultGuide);
}

function setupHero(){
  const hero=$('networkHeroCard');if(!hero)return;
  const p=hero.querySelector('.card-topline p');if(p)p.textContent='Mira la arquitectura completa, enfoca una capa y toca neuronas o conexiones para inspeccionarlas.';
  hero.querySelector('.card-topline .kicker')?.replaceChildren(document.createTextNode('RED NEURONAL · VISTA PRINCIPAL'));
  const toolbar=hero.querySelector('.network-toolbar');if(!toolbar)return;
  if(!$('networkVisualControls')){
    const controls=document.createElement('div');controls.id='networkVisualControls';controls.className='network-visual-controls';controls.innerHTML=`
      <div class="visual-control-group"><span>Vista</span><button type="button" data-net-view="full">Completa</button><button type="button" data-net-view="summary">Resumen</button></div>
      <div class="visual-control-group"><span>Conexiones</span><button type="button" data-net-edges="important">Principales</button><button type="button" data-net-edges="all">Todas</button></div>
      <div id="networkLayerFocus" class="visual-control-group layer-focus"><span>Enfocar</span></div>`;
    toolbar.parentNode.insertBefore(controls,toolbar);
    controls.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.netView){VI.view=b.dataset.netView;localStorage.setItem('lab-net-view',VI.view);renderNetworkVisualV99()}if(b.dataset.netEdges){VI.edges=b.dataset.netEdges;localStorage.setItem('lab-net-edges',VI.edges);renderNetworkVisualV99()}if(b.dataset.layerFocus!=null){VI.focus=Number(b.dataset.layerFocus);localStorage.setItem('lab-net-focus',String(VI.focus));renderNetworkVisualV99()}});
  }
  if(!$('networkLegend')){
    const legend=document.createElement('div');legend.id='networkLegend';legend.className='network-legend';legend.innerHTML=`
      <span><i class="legend-node input"></i>Entrada</span><span><i class="legend-node hidden"></i>Oculta</span><span><i class="legend-node output"></i>Salida</span>
      <span class="legend-sep"></span><span><i class="legend-line positive"></i>Peso positivo</span><span><i class="legend-line negative"></i>Peso negativo</span><span><i class="legend-line strong"></i>Más grosor = mayor |peso|</span>
      <small>Antes de entrenar, las líneas representan solo la estructura.</small>`;
    toolbar.insertAdjacentElement('afterend',legend);
  }
  const rowLabel=toolbar.querySelector('label:first-child');if(rowLabel)rowLabel.classList.add('network-utility-control');
  toolbar.querySelectorAll('label').forEach(l=>l.classList.add('network-utility-control'));
}

function updateControlStates(){
  qa('[data-net-view]').forEach(b=>b.classList.toggle('active',b.dataset.netView===VI.view));
  qa('[data-net-edges]').forEach(b=>b.classList.toggle('active',b.dataset.netEdges===VI.edges));
  qa('[data-layer-focus]').forEach(b=>b.classList.toggle('active',Number(b.dataset.layerFocus)===VI.focus));
}
function renderFocusControls(sizes){
  const host=$('networkLayerFocus');if(!host)return;const last=sizes.length-1;
  host.innerHTML='<span>Enfocar</span>'+`<button type="button" data-layer-focus="-1">Todo</button>`+sizes.map((s,i)=>`<button type="button" data-layer-focus="${i}">${layerShort(i,last)} <b>${s}</b></button>`).join('');
  updateControlStates();
}

function renderNetworkVisualV99(){
  const n=net(),svg=$('networkSvg');if(!n||!svg)return;
  const p=problem(),m=model(),desc=descriptors();
  let fallbackInputs=1;try{fallbackInputs=Math.max(1,(typeof numericX==='function'?numericX().length:0)||State.schema?.xCount||1)}catch(e){}
  const inputs=Math.max(1,desc.length||fallbackInputs),outCount=outputCount(p,m),sizes=[inputs,...n.hidden,outCount],last=sizes.length-1;
  const limits=VI.view==='full'?sizes.map(s=>Math.min(s,96)):sizes.map(s=>Math.min(s,10));
  const indices=sizes.map((s,l)=>sampledIndices(s,limits[l]));
  const counts=indices.map(a=>a.length),maxVisible=Math.max(...counts,1);
  const W=Math.max(1080,220+Math.max(1,last)*280),H=VI.view==='full'?Math.max(620,Math.min(2100,maxVisible*17+145)):620;
  const r=VI.view==='summary'?18:maxVisible>64?6.5:maxVisible>40?7.5:maxVisible>28?9:maxVisible>18?11:16;
  const mx=92,my=82,xpos=i=>mx+i*((W-2*mx)/Math.max(1,last));
  const pos=counts.map((c,l)=>{if(c===1)return[{x:xpos(l),y:H/2}];const usable=H-2*my;return Array.from({length:c},(_,j)=>({x:xpos(l),y:my+j*usable/(c-1)}))});
  svg.innerHTML='';svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.style.height=`${H}px`;svg.style.minHeight=`${H}px`;svg.style.width='100%';
  const canvas=$('networkCanvas');if(canvas){canvas.style.height=`${Math.min(H,820)}px`;canvas.dataset.networkView=VI.view}
  if($('networkLayers'))$('networkLayers').innerHTML='';
  if($('architectureTitle'))$('architectureTitle').textContent=sizes.join(' → ');
  if($('hiddenCount'))$('hiddenCount').textContent=n.hidden.length;
  if($('neuronCount'))$('neuronCount').textContent=n.hidden.reduce((a,b)=>a+b,0);
  if($('activationName'))$('activationName').textContent=n.layerSettings?.map(x=>x.activation).join(' / ')||n.hiddenActivation;
  let params=0;for(let i=0;i<sizes.length-1;i++)params+=sizes[i]*sizes[i+1]+sizes[i+1];if($('paramCount'))$('paramCount').textContent=params.toLocaleString('es-CL');
  renderFocusControls(sizes);

  const matches=!!(m&&m.sizes?.length===sizes.length&&m.sizes.every((v,i)=>v===sizes[i]));
  const showWeights=$('showWeightsToggle')?.checked!==false;
  const edgeGroups=[];
  for(let l=0;l<last;l++){
    edgeGroups[l]=[];
    if(VI.focus>=0 && !(l===VI.focus-1||l===VI.focus))continue;
    const weights=matches?m.weights?.[l]:null,maxW=weights?Math.max(1e-9,...weights.flat().map(Math.abs)):1;
    const chosen=new Set();
    if(VI.edges==='important'){
      indices[l+1].forEach((oj,jj)=>{
        const candidates=indices[l].map((oi,ii)=>({oi,ii,v:weights?Math.abs(weights?.[oj]?.[oi]??0):((ii*17+jj*11+l*7)%31)/31})).sort((a,b)=>b.v-a.v);
        const k=Math.min(candidates.length,counts[l]>30?2:3);candidates.slice(0,k).forEach(x=>chosen.add(`${x.ii}|${jj}`));
      });
    }
    pos[l].forEach((a,ii)=>pos[l+1].forEach((b,jj)=>{
      if(VI.edges==='important'&&!chosen.has(`${ii}|${jj}`))return;
      const oi=indices[l][ii],oj=indices[l+1][jj],q=shorten(a,b,r),wt=weights?.[oj]?.[oi];
      const cls=Number.isFinite(wt)&&showWeights?`edge ${wt>=0?'weight-pos':'weight-neg'}`:'edge structure';
      const line=svgEl('line',{...q,class:cls,'data-edge-layer':l,'data-edge-from':oi,'data-edge-to':oj,'stroke-width':Number.isFinite(wt)&&showWeights?(0.8+4.4*Math.abs(wt)/maxW).toFixed(2):1,'opacity':Number.isFinite(wt)&&showWeights?(0.26+0.7*Math.abs(wt)/maxW).toFixed(2):VI.edges==='important'?0.34:0.18},svg);
      line.onclick=e=>{e.stopPropagation();if(matches)safe('inspectConnection',l,oi,oj);else safe('notify','Entrena esta arquitectura para inspeccionar pesos reales.','info')};edgeGroups[l].push(line);
    }));
  }

  const outs=outputLabels(p,outCount,matches?m:null),nodeGroups=[];
  sizes.forEach((total,l)=>{
    nodeGroups[l]=[];
    const lx=pos[l][0]?.x||mx,label=layerName(l,last);
    const txt=svgEl('text',{x:lx,y:32,'text-anchor':'middle',class:'svg-layer-label visual-layer-label'},svg);txt.textContent=`${label} · ${total}`;
    if(VI.focus===l){const halo=svgEl('rect',{x:lx-54,y:44,width:108,height:H-88,rx:36,class:'layer-focus-halo'},svg);svg.insertBefore(halo,txt.nextSibling)}
    pos[l].forEach((pt,jj)=>{
      const original=indices[l][jj],dim=VI.focus>=0&&l!==VI.focus,cls=`svg-node ${l===0?'input':l===last?'output':'hidden'} ${dim?'dimmed':''}`;
      const g=svgEl('g',{class:cls,'data-layer':l,'data-node':original},svg);svgEl('circle',{cx:pt.x,cy:pt.y,r},g);
      let full=l===0?(desc[original]?.label||`X${original+1}`):l===last?(outs[original]||`Y${original+1}`):`N${original+1}`;
      const title=svgEl('title',{},g);title.textContent=l===0?`X${original+1} · ${full}`:`${label} · ${full}`;
      const showText=counts[l]<=18||l===last||l===0||(jj===0||jj===counts[l]-1||jj%Math.max(1,Math.floor(counts[l]/7))===0);
      if(showText){const t=svgEl('text',{x:pt.x,y:pt.y+(r<=9?3:4),'text-anchor':'middle',class:r<=9?'dense-node-label':''},g);t.textContent=l===0?(full.length>8?`X${original+1}`:full):l===last?(String(full).length>8?`Y${original+1}`:full):`N${original+1}`}
      g.onclick=e=>{e.stopPropagation();if(matches)safe('inspectNode',l,original);else if(l===0)safe('notify',`X${original+1} corresponde a ${full}.`,'info');else safe('notify','Entrena la red para inspeccionar activaciones reales.','info')};nodeGroups[l].push(g);
    });
    if(counts[l]<total){const cap=svgEl('text',{x:lx,y:H-28,'text-anchor':'middle',class:'network-caption visual-count-caption'},svg);cap.textContent=VI.view==='summary'?`${counts[l]} visibles de ${total} · cambia a Completa`:`${counts[l]} de ${total} visibles`}
  });

  const bottom=svgEl('text',{x:18,y:H-10,class:'network-caption visual-network-caption'},svg);
  bottom.textContent=matches&&showWeights?'Línea continua = peso positivo · segmentada = peso negativo · grosor = magnitud.':'Estructura de la red. Entrena el modelo para ver signo y magnitud de los pesos.';
  State.previewGraph={nodes:nodeGroups,edges:edgeGroups};
  safe('mirrorTrainingSvg');
  safe('setNetworkMotion',matches?'Modelo entrenado: toca una neurona o conexión para inspeccionar pesos y activaciones.':`Arquitectura ${sizes.join(' → ')}. Vista ${VI.view==='full'?'completa':'resumida'} con ${VI.edges==='important'?'conexiones principales':'todas las conexiones'}.`);
  updateControlStates();
}

function addInfoButton(card,mode){
  if(!card||card.dataset.visualInfoReady)return;card.dataset.visualInfoReady='1';card.classList.add('visual-condensed');
  card.querySelectorAll('details').forEach(d=>d.open=false);
  const host=card.querySelector('.guide-concept-head')||card;
  const b=document.createElement('button');b.type='button';b.className='visual-info-btn';b.setAttribute('aria-label','Ver explicación completa');b.title='Ver explicación completa';b.innerHTML='<svg><use href="#i-info"/></svg>';
  host.appendChild(b);b.addEventListener('click',e=>{e.stopPropagation();card.classList.toggle('is-explaining');b.classList.toggle('active',card.classList.contains('is-explaining'));b.setAttribute('aria-label',card.classList.contains('is-explaining')?'Ocultar explicación':'Ver explicación completa')});
}
function compactGuided(){
  qa('.guide-concept-card').forEach(c=>addInfoButton(c,'concept'));
  qa('.training-teach-card').forEach(c=>addInfoButton(c,'training'));
  qa('.guided-learning-grid > article,.metric-teach-grid > article').forEach(c=>addInfoButton(c,'mini'));
  qa('.guide-four-questions details').forEach(d=>{if(!d.closest('.is-explaining'))d.open=false});
}
function setupGuidedObserver(){
  if(VI.observer)return;VI.observer=new MutationObserver(()=>{compactGuided();reorderHierarchy()});
  ['guidedDataCoach','guidedModelStudio','guidedTrainingStudio','guidedResultsStudio'].forEach(id=>{const n=$(id);if(n)VI.observer.observe(n,{childList:true,subtree:true})});
}

function applyCardSystem(){
  qa('.dynamic-card').forEach(c=>c.classList.add('ui-card'));
  $('#networkHeroCard')?.classList.add('ui-card-hero');
  $('#lossStudioCard')?.classList.add('ui-card-feature');
  document.querySelector('.dataset-overview-card')?.classList.add('ui-card-hero');
  const ev=$('evaluationMetrics');if(ev)ev.classList.add('ui-metrics-row');
}

function replaceNetworkRenderer(){
  window.renderNetworkVisual=renderNetworkVisualV99;
  const old=window.renderCurrentNetwork;if(typeof old==='function'&&!old.__visualWrapped){const wrapped=function(...args){const r=old.apply(this,args);setTimeout(renderNetworkVisualV99,0);return r};wrapped.__visualWrapped=true;window.renderCurrentNetwork=wrapped}
}

function setupEvents(){
  $('showWeightsToggle')?.addEventListener('change',renderNetworkVisualV99);
  $('showAllInputsToggle')?.addEventListener('change',()=>{VI.view=$('showAllInputsToggle').checked?'full':'summary';localStorage.setItem('lab-net-view',VI.view);renderNetworkVisualV99()});
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="networks"],[data-go="networks"]'))setTimeout(()=>{reorderHierarchy();setupHero();renderNetworkVisualV99();compactGuided()},100)});
}

function init(){
  reorderHierarchy();setupHero();replaceNetworkRenderer();applyCardSystem();compactGuided();setupGuidedObserver();setupEvents();
  if($('showAllInputsToggle'))$('showAllInputsToggle').checked=VI.view==='full';
  setTimeout(()=>{reorderHierarchy();setupHero();compactGuided();renderNetworkVisualV99()},120);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.LABVisualIntelligence={render:renderNetworkVisualV99,setView:v=>{VI.view=v;renderNetworkVisualV99()},setEdges:v=>{VI.edges=v;renderNetworkVisualV99()}};
})();

/* LAB Industrial v10 · Project Hub + Decision Center + Report Builder */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const q=(sel,root=document)=>root.querySelector(sel);
const qa=(sel,root=document)=>[...root.querySelectorAll(sel)];
const clone=x=>JSON.parse(JSON.stringify(x));
const safe=(fn,...args)=>{try{return typeof fn==='function'?fn(...args):undefined}catch(err){console.warn('[LAB v10]',err);return undefined}};
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=3)=>Number.isFinite(+v)?Number(v).toLocaleString('es-CL',{maximumFractionDigits:d}):'—';
const uid=()=>globalThis.crypto?.randomUUID?.()||('lab-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const V10={currentProjectId:null,decision:{fingerprint:'',values:{},baseValues:{},last:null},db:null};

/* ---------- Non-blocking legacy messages ---------- */
window.alert=function(message){
  if(typeof window.notify==='function') window.notify(String(message),'warning');
  else console.warn(message);
};

/* ---------- IndexedDB Project Hub ---------- */
function openProjectDB(){
  if(!('indexedDB' in window)) return Promise.resolve(null);
  if(V10.db) return Promise.resolve(V10.db);
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('LABIndustrialProjects',1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'})};
    req.onsuccess=()=>{V10.db=req.result;resolve(V10.db)};
    req.onerror=()=>reject(req.error);
  });
}
async function dbPut(project){const db=await openProjectDB();if(!db)throw new Error('IndexedDB no disponible');return new Promise((res,rej)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(project);tx.oncomplete=()=>res(project);tx.onerror=()=>rej(tx.error)})}
async function dbGet(id){const db=await openProjectDB();if(!db)return null;return new Promise((res,rej)=>{const r=db.transaction('projects','readonly').objectStore('projects').get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function dbAll(){const db=await openProjectDB();if(!db)return[];return new Promise((res,rej)=>{const r=db.transaction('projects','readonly').objectStore('projects').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function dbDelete(id){const db=await openProjectDB();if(!db)return;return new Promise((res,rej)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}

const uiControlIds=['trainPct','valPct','splitSeed','epochs','learningRate','batchSize','trainingSeed','optimizer','lossFunction','engine','useL1','l1Lambda','useL2','l2Lambda','useDropout','dropoutRate','useEarlyStopping','patience','useGradClip','gradClipValue','useLrDecay','lrDecay','useWeightDecay','weightDecay','useNoise','inputNoise'];
function captureControls(){const out={};uiControlIds.forEach(id=>{const e=byId(id);if(e)out[id]=e.type==='checkbox'?e.checked:e.value});return out}
function restoreControls(obj={}){Object.entries(obj).forEach(([id,v])=>{const e=byId(id);if(!e)return;if(e.type==='checkbox')e.checked=!!v;else e.value=v})}
function datasetLabel(){return byId('homeDatasetName')?.textContent?.trim()||'Dataset sin nombre'}
function snapshotProject(id,name){
  return {
    version:10,id:id||uid(),name:(name||'Proyecto LAB Industrial').trim().slice(0,70),updatedAt:new Date().toISOString(),
    datasetName:datasetLabel(),rows:clone(State.rows||[]),originalRows:clone(State.originalRows||[]),columns:clone(State.columns||[]),roles:clone(State.roles||{}),columnMeta:clone(State.columnMeta||{}),schema:clone(State.schema||null),
    networks:clone(State.networks||[]),currentNetwork:State.currentNetwork||0,controls:captureControls(),selectedProblem:State.selectedProblem||null
  };
}
function projectSummary(p){const trained=(p.networks||[]).filter(n=>n.trained).length;return `${(p.rows||[]).length.toLocaleString('es-CL')} filas · ${(p.columns||[]).length} variables · ${trained} modelo${trained===1?'':'s'} entrenado${trained===1?'':'s'}`}
function updateProjectLiveStatus(){
  const ds=byId('projectDatasetSummary'),ms=byId('projectModelSummary');
  if(ds)ds.textContent=State.rows?.length?`${State.rows.length.toLocaleString('es-CL')} filas · ${State.columns.length} variables`:'Sin dataset';
  const trained=(State.networks||[]).filter(n=>n.trained).length;if(ms)ms.textContent=trained?`${trained} experimento${trained===1?'':'s'} entrenado${trained===1?'':'s'}`:'Sin modelo entrenado';
}
async function saveProject(silent=false){
  const name=(byId('projectNameInput')?.value||'Proyecto LAB Industrial').trim()||'Proyecto LAB Industrial';
  const id=V10.currentProjectId||uid(),project=snapshotProject(id,name);
  try{
    await dbPut(project);V10.currentProjectId=id;localStorage.setItem('lab-industrial-current-project',id);
    const st=byId('projectSaveState');if(st)st.textContent=`Guardado ${new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}`;
    if(!silent&&typeof notify==='function')notify('Proyecto guardado en este navegador.','success');
    await renderRecentProjects();updateProjectLiveStatus();return project;
  }catch(err){console.error(err);if(!silent&&typeof notify==='function')notify('No se pudo guardar el proyecto localmente. Usa “Exportar .lab” como respaldo.','warning');return null}
}
async function restoreProject(project,{persistCurrent=true}={}){
  if(!project)return;
  State.rows=clone(project.rows||[]);State.originalRows=clone(project.originalRows||project.rows||[]);State.columns=clone(project.columns||[]);State.roles=clone(project.roles||{});State.columnMeta=clone(project.columnMeta||{});State.schema=clone(project.schema||null);State.networks=clone(project.networks||[]);State.currentNetwork=Math.max(0,Math.min(project.currentNetwork||0,Math.max(0,State.networks.length-1)));State.selectedProblem=project.selectedProblem||null;State.liveModel=null;
  if(!State.networks.length)State.networks=[{name:'Red 1',hidden:[6,4],hiddenActivation:'relu',outputActivation:'auto',initMethod:'he',layerSettings:[{activation:'relu',dropout:0},{activation:'relu',dropout:0}],trained:null}];
  restoreControls(project.controls||{});
  State.audit=safe(window.auditDataset);
  safe(window.applySplit);safe(window.renderTable);safe(window.populateStats);safe(window.populateGan);safe(window.renderCategoricalAudit);safe(window.populateSequenceColumns);safe(window.renderMulticlassTargetAudit);safe(window.renderDatasetGuide);safe(window.renderNetworkTabs);safe(window.renderCurrentNetwork);safe(window.renderComparison);safe(window.renderPredictor);safe(window.markFlowState);safe(window.refreshDataOverviewV94);safe(window.renderLossStudio);
  if(byId('homeDatasetName'))byId('homeDatasetName').textContent=project.datasetName||project.name;
  if(byId('projectNameInput'))byId('projectNameInput').value=project.name||'Proyecto LAB Industrial';
  if(persistCurrent){V10.currentProjectId=project.id||uid();localStorage.setItem('lab-industrial-current-project',V10.currentProjectId)}
  updateProjectLiveStatus();renderExperimentHistory();renderDecisionCenter();
  if(typeof notify==='function')notify(`Proyecto “${project.name}” cargado.`,'success');
}
async function loadProjectById(id){const p=await dbGet(id);if(p)await restoreProject(p)}
async function deleteProjectById(id){await dbDelete(id);if(V10.currentProjectId===id){V10.currentProjectId=null;localStorage.removeItem('lab-industrial-current-project')}await renderRecentProjects();if(typeof notify==='function')notify('Proyecto eliminado del navegador.','info')}
async function duplicateProjectById(id){const p=await dbGet(id);if(!p)return;p.id=uid();p.name=(p.name||'Proyecto')+' · copia';p.updatedAt=new Date().toISOString();await dbPut(p);await renderRecentProjects();if(typeof notify==='function')notify('Proyecto duplicado.','success')}
async function renderRecentProjects(){
  const box=byId('recentProjects');if(!box)return;let items=[];try{items=(await dbAll()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,6)}catch(e){}
  if(!items.length){box.innerHTML='<div class="project-empty"><strong>Aún no hay proyectos guardados</strong><span>Configura tu análisis y presiona Guardar. El proyecto quedará disponible en este navegador.</span></div>';return}
  box.innerHTML=items.map(p=>`<article class="project-card ${p.id===V10.currentProjectId?'current':''}" data-project-id="${html(p.id)}"><div class="project-card-top"><span>${p.id===V10.currentProjectId?'ACTUAL':'PROYECTO'}</span><time>${new Date(p.updatedAt).toLocaleDateString('es-CL')}</time></div><h3>${html(p.name)}</h3><p>${html(projectSummary(p))}</p><div class="project-card-actions"><button data-project-open>Abrir</button><button data-project-copy>Duplicar</button><button data-project-delete>Eliminar</button></div></article>`).join('');
  box.querySelectorAll('[data-project-open]').forEach(b=>b.onclick=()=>loadProjectById(b.closest('[data-project-id]').dataset.projectId));
  box.querySelectorAll('[data-project-copy]').forEach(b=>b.onclick=()=>duplicateProjectById(b.closest('[data-project-id]').dataset.projectId));
  box.querySelectorAll('[data-project-delete]').forEach(b=>b.onclick=()=>deleteProjectById(b.closest('[data-project-id]').dataset.projectId));
}
function clearProject(){
  V10.currentProjectId=null;localStorage.removeItem('lab-industrial-current-project');
  State.rows=[];State.originalRows=[];State.columns=[];State.roles={};State.columnMeta={};State.schema=null;State.split={train:[],val:[],test:[]};State.networks=[{name:'Red 1',hidden:[6,4],hiddenActivation:'relu',outputActivation:'auto',initMethod:'he',layerSettings:[{activation:'relu',dropout:0},{activation:'relu',dropout:0}],trained:null}];State.currentNetwork=0;
  if(byId('projectNameInput'))byId('projectNameInput').value='Nuevo análisis';if(byId('homeDatasetName'))byId('homeDatasetName').textContent='Sin dataset cargado';
  safe(window.renderTable);safe(window.populateStats);safe(window.renderNetworkTabs);safe(window.renderCurrentNetwork);safe(window.renderDatasetGuide);safe(window.markFlowState);safe(window.refreshDataOverviewV94);
  updateProjectLiveStatus();renderDecisionCenter();renderExperimentHistory();if(typeof activateTab==='function')activateTab('home');if(typeof notify==='function')notify('Nuevo proyecto creado. Sube un CSV o carga un ejemplo.','info');
}
function downloadBlob(content,name,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},300)}
function exportProject(){const name=(byId('projectNameInput')?.value||'LAB_Industrial').trim();const p=snapshotProject(V10.currentProjectId||uid(),name);downloadBlob(JSON.stringify(p,null,2),name.replace(/[^\p{L}\p{N}_-]+/gu,'_')+'.lab','application/json');if(typeof notify==='function')notify('Proyecto exportado como archivo .lab.','success')}
function importProjectFile(file){if(!file)return;const r=new FileReader();r.onload=async()=>{try{const p=JSON.parse(r.result);if(!Array.isArray(p.rows)||!Array.isArray(p.columns))throw new Error('Formato inválido');p.id=uid();p.name=p.name||file.name.replace(/\.(lab|json)$/i,'');p.updatedAt=new Date().toISOString();await dbPut(p);await restoreProject(p);await renderRecentProjects()}catch(e){if(typeof notify==='function')notify('El archivo no parece ser un proyecto LAB Industrial válido.','warning')}};r.readAsText(file)}

/* ---------- Experiment tracking ---------- */
function experimentMetric(t){if(!t)return{label:'—',value:'—'};const m=t.model;if(t.preds?.y?.length){const rmse=Math.sqrt(t.preds.y.reduce((s,y,i)=>s+(y-t.preds.p[i])**2,0)/t.preds.y.length);return{label:'RMSE',value:fmt(rmse)}}if(Number.isFinite(t.testLoss))return{label:'Test loss',value:fmt(t.testLoss,5)};const v=t.valHist?.at?.(-1);return{label:'Val loss',value:fmt(v,5)}}
function renderExperimentHistory(){
  const box=byId('experimentHistory');if(!box)return;const nets=State.networks||[];
  if(!nets.length){box.innerHTML='<div class="project-empty"><strong>Sin experimentos</strong><span>Crea una red en Modelo y entrénala para compararla aquí.</span></div>';return}
  box.innerHTML=nets.map((n,i)=>{const t=n.trained,m=t?.model,metric=experimentMetric(t),arch=(m?.sizes||[numericX?.().length||'X',...(n.hidden||[]),1]).join(' → '),settings=t?.settings||{},epochs=t?.trainHist?.length||0;return `<article class="experiment-card ${i===State.currentNetwork?'active':''}"><div class="experiment-index">${String(i+1).padStart(2,'0')}</div><div class="experiment-main"><div><span>${t?'ENTRENADO':'CONFIGURADO'}</span><h3>${html(n.name||'Red')}</h3></div><div class="experiment-tags"><b>${html(arch)}</b><span>${html((settings.opt||'—').toUpperCase())}</span><span>${epochs?epochs+' épocas':'sin entrenamiento'}</span></div></div><div class="experiment-score"><span>${html(metric.label)}</span><strong>${html(metric.value)}</strong></div><button data-exp-activate="${i}">${i===State.currentNetwork?'Activo':'Abrir'}</button></article>`}).join('');
  box.querySelectorAll('[data-exp-activate]').forEach(b=>b.onclick=()=>{State.currentNetwork=+b.dataset.expActivate;safe(window.renderNetworkTabs);safe(window.renderCurrentNetwork);safe(window.renderComparison);safe(window.renderPredictor);renderExperimentHistory();renderDecisionCenter();if(typeof activateTab==='function')activateTab('results')});
}

/* ---------- Decision Center ---------- */
function activeModel(){return currentNet?.()?.trained?.model||null}
function modelFingerprint(m){return m?`${State.currentNetwork}|${m.sizes?.join('-')}|${(m.xs||[]).join('|')}|${m.classification?'c':'r'}|${m.multiclass?'m':'s'}`:''}
function rawRange(col,mean){const vals=(State.rows||[]).map(r=>Number(r[col])).filter(Number.isFinite);if(!vals.length)return[mean-1,mean+1];let min=Math.min(...vals),max=Math.max(...vals);if(min===max){min-=Math.max(1,Math.abs(min)*.1);max+=Math.max(1,Math.abs(max)*.1)}return[min,max]}
function predictScenario(m,values){
  const raw=m.xs.map((c,i)=>Number.isFinite(+values[c])?+values[c]:m.stats.xm[i]);const x=raw.map((v,i)=>(v-m.stats.xm[i])/(m.stats.xsdev[i]||1)),f=forward(m,x,false);
  if(m.multiclass){const probs=f.probs||f.acts?.at?.(-1)||[],idx=probs.indexOf(Math.max(...probs)),classes=m.stats?.classes||m.classes||[];return{kind:'multiclass',value:probs[idx]||0,display:`${classes[idx]??('Clase '+(idx+1))} · ${fmt((probs[idx]||0)*100,1)}%`,classIndex:idx,probs,raw,x}}
  if(m.classification){const label=m.stats?.yLabels?.[1]??m.stats?.yhi??'positivo';return{kind:'binary',value:f.y,display:`P(${label}) ${fmt(f.y*100,1)}%`,raw,x}}
  const value=f.y*m.stats.ys+m.stats.ym;return{kind:'regression',value,display:`${fmt(value,3)}${targetUnit?.()?' '+targetUnit():''}`,raw,x}
}
function deltaFor(base,current){if(!base||!current)return NaN;if(current.kind==='regression')return current.value-base.value;if(current.kind==='binary')return (current.value-base.value)*100;if(current.kind==='multiclass'){const i=current.classIndex;return((current.probs?.[i]||0)-(base.probs?.[i]||0))*100}return NaN}
function deltaLabel(kind,v){if(!Number.isFinite(v))return'—';if(kind==='regression')return`${v>=0?'+':''}${fmt(v,3)}${targetUnit?.()?' '+targetUnit():''}`;return`${v>=0?'+':''}${fmt(v,2)} pp`}
function setupDecisionValues(m){
  const fp=modelFingerprint(m);if(V10.decision.fingerprint===fp&&Object.keys(V10.decision.values).length)return;
  V10.decision.fingerprint=fp;V10.decision.values={};V10.decision.baseValues={};(m.xs||[]).forEach((c,i)=>{V10.decision.values[c]=m.stats.xm[i];V10.decision.baseValues[c]=m.stats.xm[i]});
}
function renderScenarioControls(m){
  const box=byId('dcScenarioControls');if(!box)return;box.innerHTML=(m.xs||[]).map((c,i)=>{const mean=m.stats.xm[i],[min,max]=rawRange(c,mean),step=Math.max((max-min)/120,Math.abs(max)||1>100?0.1:0.001),v=V10.decision.values[c]??mean;return `<div class="dc-control" data-dc-var="${html(c)}"><div class="dc-control-head"><strong>${html(c)}</strong><span>${html(State.columnMeta?.[c]?.unit||'')}</span></div><input type="range" data-dc-range min="${min}" max="${max}" step="${step}" value="${v}"><div class="dc-control-foot"><small>${fmt(min,2)}</small><input type="number" data-dc-number step="${step}" value="${v}"><small>${fmt(max,2)}</small></div></div>`}).join('');
  box.querySelectorAll('.dc-control').forEach(el=>{const c=el.dataset.dcVar,r=q('[data-dc-range]',el),n=q('[data-dc-number]',el);const apply=v=>{let x=+v;if(!Number.isFinite(x))return;x=Math.max(+r.min,Math.min(+r.max,x));V10.decision.values[c]=x;r.value=x;n.value=x;updateDecisionOutputs(m)};r.oninput=()=>apply(r.value);n.onchange=()=>apply(n.value)});
}
function localImpacts(m,current){
  return (m.xs||[]).map((c,i)=>{const alt={...V10.decision.values,[c]:m.stats.xm[i]},p=predictScenario(m,alt);let impact;if(current.kind==='regression')impact=current.value-p.value;else if(current.kind==='binary')impact=(current.value-p.value)*100;else impact=((current.probs?.[current.classIndex]||0)-(p.probs?.[current.classIndex]||0))*100;return{name:c,impact}}).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
}
function renderImpactBars(m,current){const box=byId('dcLocalImpact');if(!box)return;const rows=localImpacts(m,current),mx=Math.max(1e-9,...rows.map(x=>Math.abs(x.impact)));box.innerHTML=rows.map(x=>`<div class="dc-impact-row"><div><strong>${html(x.name)}</strong><span>${deltaLabel(current.kind,x.impact)}</span></div><div class="dc-impact-track"><i class="${x.impact>=0?'positive':'negative'}" style="width:${Math.max(2,Math.abs(x.impact)/mx*100)}%"></i></div></div>`).join('')}
function updateDecisionOutputs(m){
  if(!m)return;const base=predictScenario(m,V10.decision.baseValues),cur=predictScenario(m,V10.decision.values),delta=deltaFor(base,cur);V10.decision.last={base,cur,delta};
  byId('dcBaselinePrediction').textContent=base.display;byId('dcCurrentPrediction').textContent=cur.display;byId('dcPredictionDelta').textContent=deltaLabel(cur.kind,delta);byId('dcModelName').textContent=currentNet()?.name||'Modelo actual';
  byId('dcPredictionDelta').className=Number.isFinite(delta)?(delta>0?'delta-up':delta<0?'delta-down':''):'';
  renderImpactBars(m,cur);
  const econ=+byId('dcEconomicUnit')?.value||0,impact=cur.kind==='regression'?delta*econ:(delta/100)*econ;byId('dcEconomicImpact').textContent=econ?`${impact>=0?'+':''}$${fmt(impact,0)}`:'Define un valor';
  const top=localImpacts(m,cur).slice(0,3),txt=top.length?`En este escenario, las variables con mayor sensibilidad local son ${top.map(x=>x.name).join(', ')}. El cambio total de la salida respecto del punto base es ${deltaLabel(cur.kind,delta)}. Usa esta lectura para formular hipótesis y contrastarlas con conocimiento del proceso; no implica causalidad.`:'Ajusta las variables para explorar el escenario.';byId('dcInterpretation').innerHTML=`<strong>Lectura del escenario</strong><p>${html(txt)}</p>`;
  updateProjectLiveStatus();
}
function renderDecisionCenter(){
  const m=activeModel(),empty=byId('dcNoModel'),work=byId('dcWorkspace');if(!empty||!work)return;if(!m){empty.hidden=false;work.hidden=true;return}empty.hidden=true;work.hidden=false;setupDecisionValues(m);renderScenarioControls(m);updateDecisionOutputs(m);const rn=byId('dcRowNumber');if(rn)rn.max=Math.max(1,State.rows.length)
}
function useDatasetRow(){const m=activeModel();if(!m)return;const i=Math.max(0,Math.min(State.rows.length-1,(+byId('dcRowNumber').value||1)-1)),row=State.rows[i];if(!row)return;(m.xs||[]).forEach(c=>{const v=Number(row[c]);if(Number.isFinite(v))V10.decision.values[c]=v});renderScenarioControls(m);updateDecisionOutputs(m)}
function resetDecisionScenario(){const m=activeModel();if(!m)return;V10.decision.values={...V10.decision.baseValues};renderScenarioControls(m);updateDecisionOutputs(m)}

/* ---------- Report Builder ---------- */
function currentMetrics(){const t=currentNet?.()?.trained,m=t?.model;if(!m)return null;try{if(m.multiclass&&typeof mcMetricsV91==='function'&&typeof prepareMulticlassRowsV91==='function'){const d=prepareMulticlassRowsV91(State.split.test.length?State.split.test:State.split.val,m.stats).data;return mcMetricsV91(m,d)}const d=prepareRows(State.split.test.length?State.split.test:State.split.val,m.stats).data;return m.classification?classificationMetrics(m,d):regressionMetrics(m,d)}catch(e){return null}}
function canvasImage(id){try{const c=byId(id);return c?.toDataURL?.('image/png')||''}catch(e){return''}}
function reportSections(){return{data:byId('reportIncludeData')?.checked!==false,model:byId('reportIncludeModel')?.checked!==false,metrics:byId('reportIncludeMetrics')?.checked!==false,charts:byId('reportIncludeCharts')?.checked!==false,decision:byId('reportIncludeDecision')?.checked!==false}}
function reportBody(){
  const inc=reportSections(),rawName=(byId('projectNameInput')?.value||'').trim(),yName=targetY?.()||'—',name=(!rawName||rawName==='Nuevo análisis')?`Predicción de ${yName}`:rawName,m=activeModel(),net=currentNet?.(),met=currentMetrics(),audit=safe(window.auditDataset),dc=V10.decision.last,xOriginal=(State.columns||[]).filter(c=>State.roles[c]==='X'),inputs=m?.sizes?.[0]??(typeof numericX==='function'?numericX().length:xOriginal.length),quality=State.schema?.quality?.score??audit?.score,unit=typeof targetUnit==='function'?targetUnit():'';
  let body=`<header class="r-hero"><div><span>LAB INDUSTRIAL · AI DECISION STUDIO</span><h1>${html(name)}</h1><p>Modelo para <strong>${html(yName)}</strong> · Informe generado el ${new Date().toLocaleString('es-CL')}.</p></div><div class="r-badge">INDUSTRIAL ML</div></header>`;
  if(m){const headline=met?.r2!=null?`R² ${fmt(met.r2,2)}`:met?.accuracy!=null?`Accuracy ${fmt(met.accuracy,3)}`:'Modelo entrenado';body+=`<section class="r-exec"><span>RESUMEN EJECUTIVO</span><h2>${html(headline)}</h2><div class="r-kpis"><div><span>Objetivo</span><b>${html(yName)}</b></div><div><span>Arquitectura</span><b>${html((m.sizes||[]).join(' → '))}</b></div><div><span>Optimizador</span><b>${html((net?.trained?.settings?.opt||'—').toUpperCase())}</b></div><div><span>Épocas reales</span><b>${net?.trained?.trainHist?.length||0}</b></div></div><p class="r-note">Las métricas describen desempeño en el conjunto de evaluación; no sustituyen validación de proceso ni implican causalidad.</p></section>`}
  if(inc.data)body+=`<section><h2>1. Dataset</h2><div class="r-kpis"><div><span>Filas</span><b>${(State.rows||[]).length.toLocaleString('es-CL')}</b></div><div><span>Variables originales</span><b>${(State.columns||[]).length}</b></div><div><span>X seleccionadas</span><b>${xOriginal.length}</b></div><div><span>Entradas al modelo</span><b>${inputs}</b></div></div><div class="r-kpis"><div><span>Objetivo Y</span><b>${html(yName)}</b></div><div><span>Calidad</span><b>${quality!=null?quality+'/100':'No evaluada'}</b></div><div><span>Unidad objetivo</span><b>${html(unit||'sin unidad')}</b></div><div><span>Excluidas</span><b>${(State.columns||[]).filter(c=>State.roles[c]==='Excluir').length}</b></div></div><p><strong>X originales:</strong> ${html(xOriginal.join(', ')||'—')}</p><p class="r-note">Las entradas al modelo pueden superar las X originales cuando variables categóricas se expanden mediante One-Hot Encoding.</p></section>`;
  if(inc.model)body+=`<section><h2>2. Modelo</h2>${m?`<div class="r-kpis"><div><span>Red</span><b>${html(net?.name||'—')}</b></div><div><span>Arquitectura</span><b>${html((m.sizes||[]).join(' → '))}</b></div><div><span>Optimizador</span><b>${html((net?.trained?.settings?.opt||'—').toUpperCase())}</b></div><div><span>Épocas</span><b>${net?.trained?.trainHist?.length||0}</b></div></div><p><strong>Configuración:</strong> ${html(net?.hiddenActivation||'—')} · ${html(net?.initMethod||'—')} · LR ${fmt(net?.trained?.settings?.lr,5)} · batch ${net?.trained?.settings?.batch||'—'} · seed ${net?.trained?.settings?.trainingSeed??'—'}</p>`:'<p>No hay un modelo entrenado.</p>'}</section>`;
  if(inc.metrics)body+=`<section><h2>3. Evaluación</h2>${met?`<div class="r-kpis">${Object.entries(met).filter(([k,v])=>Number.isFinite(v)&&!['tp','tn','fp','fn'].includes(k)).slice(0,6).map(([k,v])=>{const ku=unit&&['mae','rmse','bias'].includes(k.toLowerCase())?' '+unit:'';return`<div><span>${html(k)}</span><b>${fmt(v,4)}${html(ku)}</b></div>`}).join('')}</div>`:'<p>Sin métricas disponibles.</p>'}<p class="r-note">R² representa proporción de variabilidad explicada; no debe interpretarse como porcentaje de precisión.</p></section>`;
  if(inc.charts){const a=canvasImage('lossChart'),b=canvasImage('predChart');body+=`<section><h2>4. Evidencia visual</h2><div class="r-charts">${a?`<figure><img src="${a}"><figcaption>Curva de entrenamiento</figcaption></figure>`:''}${b?`<figure><img src="${b}"><figcaption>Predicho vs real</figcaption></figure>`:''}${!a&&!b?'<p>Entrena un modelo para incorporar gráficos.</p>':''}</div></section>`}
  if(inc.decision)body+=`<section><h2>5. Escenario de decisión</h2>${dc?`<div class="r-kpis"><div><span>Base</span><b>${html(dc.base.display)}</b></div><div><span>Escenario</span><b>${html(dc.cur.display)}</b></div><div><span>Cambio</span><b>${html(deltaLabel(dc.cur.kind,dc.delta))}</b></div><div><span>Valor unitario</span><b>$${fmt(+byId('dcEconomicUnit')?.value||0,0)}</b></div></div><p><strong>Variables simuladas:</strong> ${html(Object.entries(V10.decision.values).map(([k,v])=>`${k}=${fmt(v,2)}`).join(' · '))}</p>`:'<p>No hay escenario activo.</p>'}<div class="r-callout"><strong>Lectura responsable</strong><p>La simulación describe la respuesta del modelo ante cambios en sus entradas. No demuestra causalidad ni reemplaza validación de proceso, restricciones operativas o evaluación económica completa.</p></div></section>`;
  body+=`<footer>LAB Industrial · Ingeniería Civil Industrial · Informe generado localmente</footer>`;return body
}
function reportDocument(){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe LAB Industrial</title><style>${reportCSS()}</style></head><body>${reportBody()}</body></html>`}
function reportCSS(){return `*{box-sizing:border-box}body{margin:0;padding:40px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#161a1e;background:#f2f3f5}.r-hero,section,footer{max-width:1050px;margin:0 auto 20px;background:white;border:1px solid #d9dde2;border-radius:20px;padding:26px}.r-hero{background:#171b20;color:white;display:flex;justify-content:space-between;gap:20px}.r-hero span,.r-exec>span{font-size:11px;letter-spacing:.15em;color:#b7bec6;font-weight:800}.r-exec>span{color:#747c84}.r-hero h1{font-size:42px;margin:8px 0}.r-hero p{color:#c8cdd3}.r-badge{border:1px solid #4b535c;border-radius:999px;height:max-content;padding:10px 14px;font-size:11px;font-weight:800}.r-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.r-kpis div{border:1px solid #e0e3e6;border-radius:14px;padding:14px}.r-kpis span{display:block;color:#747c84;font-size:11px;text-transform:uppercase}.r-kpis b{display:block;margin-top:5px;font-size:19px}.r-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px}.r-charts figure{margin:0}.r-charts img{width:100%;border:1px solid #e0e3e6;border-radius:12px}.r-charts figcaption{font-size:12px;color:#737b83;margin-top:6px}.r-note{color:#69717a}.r-callout{background:#f1f3f5;border-radius:14px;padding:16px}footer{text-align:center;color:#737b83;font-size:12px}@media(max-width:800px){body{padding:14px}.r-kpis,.r-charts{grid-template-columns:1fr 1fr}.r-hero{display:block}}@media print{body{background:white;padding:0}.r-hero,section,footer{box-shadow:none;break-inside:avoid}}`}
function previewReport(){const modal=byId('reportModal'),frame=byId('reportPreviewFrame');if(!modal||!frame)return;frame.srcdoc=reportDocument();modal.classList.add('open')}
function downloadReport(){const name=(byId('projectNameInput')?.value||'LAB_Industrial_Report').replace(/[^\p{L}\p{N}_-]+/gu,'_');downloadBlob(reportDocument(),name+'_Informe.html','text/html;charset=utf-8');if(typeof notify==='function')notify('Informe HTML generado.','success')}
function printReport(){const w=window.open('','_blank');if(!w){if(typeof notify==='function')notify('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio.','warning');return}w.document.open();w.document.write(reportDocument());w.document.close();w.focus();setTimeout(()=>w.print(),350)}

/* ---------- Wiring / integration ---------- */
function bind(){
  byId('saveProjectBtn')?.addEventListener('click',()=>saveProject(false));byId('quickSaveProjectBtn')?.addEventListener('click',()=>saveProject(false));byId('newProjectBtn')?.addEventListener('click',clearProject);byId('exportProjectBtn')?.addEventListener('click',exportProject);byId('importProjectBtn')?.addEventListener('click',()=>byId('projectImportInput')?.click());byId('projectImportInput')?.addEventListener('change',e=>{importProjectFile(e.target.files?.[0]);e.target.value=''});
  byId('refreshExperimentsBtn')?.addEventListener('click',renderExperimentHistory);
  byId('dcResetBtn')?.addEventListener('click',resetDecisionScenario);byId('dcUseRowBtn')?.addEventListener('click',useDatasetRow);byId('dcEconomicUnit')?.addEventListener('input',()=>{const m=activeModel();if(m)updateDecisionOutputs(m)});byId('openReportBtn')?.addEventListener('click',previewReport);byId('previewReportBtn')?.addEventListener('click',previewReport);byId('downloadReportBtn')?.addEventListener('click',downloadReport);byId('printReportBtn')?.addEventListener('click',printReport);byId('closeReportModalBtn')?.addEventListener('click',()=>byId('reportModal')?.classList.remove('open'));byId('reportModal')?.addEventListener('click',e=>{if(e.target===byId('reportModal'))byId('reportModal').classList.remove('open')});
  const oldActivate=window.activateTab;if(typeof oldActivate==='function')window.activateTab=function(tab){const r=oldActivate(tab);if(tab==='decision')setTimeout(renderDecisionCenter,20);if(tab==='results')setTimeout(renderExperimentHistory,20);if(tab==='home')setTimeout(()=>{renderRecentProjects();updateProjectLiveStatus()},20);return r};
  const oldInterpret=window.interpretTrainingForUser;if(typeof oldInterpret==='function')window.interpretTrainingForUser=function(net){const r=oldInterpret(net);setTimeout(()=>{renderExperimentHistory();renderDecisionCenter();updateProjectLiveStatus();if(V10.currentProjectId)saveProject(true)},20);return r};
  // Refresh project status after data/model actions without coupling to individual modules.
  document.addEventListener('click',e=>{if(e.target.closest('#loadExampleBtn,#homeExampleBtn,#trainBtn,#applySuggestedRolesBtn,#applySplitBtn,#applyCleaningBtn,[data-context]'))setTimeout(()=>{updateProjectLiveStatus();renderExperimentHistory();renderDecisionCenter()},250)});
  setInterval(()=>{if(V10.currentProjectId&&!State.training)saveProject(true)},60000);
}
async function init(){
  bind();const remembered=localStorage.getItem('lab-industrial-current-project');if(remembered){try{const p=await dbGet(remembered);if(p){V10.currentProjectId=p.id;if(byId('projectNameInput'))byId('projectNameInput').value=p.name}}catch(e){}}
  await renderRecentProjects();updateProjectLiveStatus();renderExperimentHistory();renderDecisionCenter();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.LABProductSuite={saveProject,renderDecisionCenter,renderExperimentHistory,previewReport};
})();

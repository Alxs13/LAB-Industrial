/* Industrial Neural Lab v9 — integration/bootstrap layer. No build step required. */
function bindClick(id,fn){const el=$(id);if(el)el.onclick=fn}
function bindChange(id,fn){const el=$(id);if(el)el.onchange=fn}
function bindInput(id,fn){const el=$(id);if(el)el.oninput=fn}
function cardInteractionSetup(){
  document.addEventListener('click',e=>{
    const max=e.target.closest('[data-card-max]');
    if(max){e.preventDefault();e.stopPropagation();const card=max.closest('.dash-card,.flip-card');if(card){card.classList.toggle('is-maximized');document.body.classList.toggle('has-max-card',!!document.querySelector('.is-maximized'));setTimeout(()=>{renderNetworkVisual();const t=currentNet()?.trained;if(t)drawLoss(t.trainHist,t.valHist);renderStats()},360)}return}
    const close=e.target.closest('[data-card-close]');
    if(close){e.preventDefault();e.stopPropagation();const card=close.closest('.dash-card,.flip-card');if(card)card.hidden=true;return}
    const flip=e.target.closest('[data-flip]');
    if(flip&&!e.target.closest('button,input,select,textarea,label,a,details,summary'))flip.classList.toggle('is-flipped');
  });
}
function setupInputDialog(){
  const modal=$('inputDialog'),form=$('inputDialogForm');if(!modal||!form)return;
  bindClick('inputDialogClose',closeInputDialog);bindClick('inputDialogCancel',closeInputDialog);
  modal.onclick=e=>{if(e.target===modal)closeInputDialog()};
  form.onsubmit=e=>{e.preventDefault();const cb=V9.dialogCallback,value=$('inputDialogValue').value;closeInputDialog();if(cb)cb(value)};
}
function loadExample(kind='Logística'){loadData(kind==='Logística'?exampleRows():contextExample(kind));$('homeDatasetName').textContent=`Ejemplo · ${kind}`;activateTab('home');notify(`Ejemplo ${kind} cargado.`,'success')}

async function animateRowsPreview(count,label){
  if(State.animBusy)return;
  if(!currentVisualModel()){notify('Entrena la red primero para reproducir valores reales.','warning');return}
  const input=$('networkSampleRow'),start=Math.max(1,+input?.value||1),total=Math.max(1,State.rows.length),n=Math.min(count,total);
  for(let k=0;k<n;k++){if(State.stop)break;if(input)input.value=1+((start-1+k)%total);await animateNetworkPass()}
  setNetworkMotion(`<strong>${label}:</strong> se mostraron ${n} fila(s) con activaciones y pesos reales. Esta reproducción visual no sustituye el entrenamiento completo.`);
}

function setupActions(){
  bindClick('menuBtn',()=>$('sidebar')?.classList.toggle('open'));
  bindClick('themeBtn',toggleTheme);
  bindClick('loadExampleBtn',()=>loadExample('Logística'));bindClick('homeExampleBtn',()=>loadExample('Confiabilidad'));
  bindClick('loadCsvBtn',()=>$('csvInput').click());bindClick('homeLoadCsvBtn',()=>$('csvInput').click());
  bindChange('csvInput',e=>readCSV(e.target.files?.[0]));
  bindClick('applySuggestedRolesBtn',applySuggestedRoles);bindClick('editRolesBtn',()=>{activateTab('data');$('dataTable')?.scrollIntoView({behavior:'smooth',block:'start'})});
  bindClick('reviewDataBtn',()=>{State.audit=auditDataset();renderAudit();$('datasetAudit')?.scrollIntoView({behavior:'smooth',block:'center'})});
  bindInput('dataSearch',renderTable);bindClick('addRowBtn',addRow);bindClick('addColBtn',addColumn);
  bindClick('columnWorkbenchBtn',()=>{$('columnWorkbench')?.classList.toggle('open');renderColumnWorkbench()});
  bindClick('applySplitBtn',()=>{applySplit();markFlowState();notify('División Train / Validation / Test actualizada.','success')});
  bindClick('applyCleaningBtn',()=>{applyCleaning();State.audit=auditDataset();renderAudit();renderDatasetGuide();notify('Se aplicaron únicamente las acciones de limpieza seleccionadas.','success')});
  bindClick('applyRecommendedNetBtn',applyRecommendedNetwork);
  bindClick('newNetworkBtn',()=>newNetwork('Red '+(State.networks.length+1)));bindClick('renameNetworkBtn',renameCurrentNetwork);bindClick('addLayerBtn',addLayer);
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
  ['outputActivation','initMethod'].forEach(id=>bindChange(id,()=>{saveCurrentConfig();renderCurrentNetwork()}));
  bindChange('hiddenActivation',()=>{saveCurrentConfig();const n=currentNet();if(!n)return;n.layerSettings=n.hidden.map((_,i)=>({...{dropout:0,batchNorm:false,bias:true},...(n.layerSettings?.[i]||{}),activation:n.hiddenActivation}));renderCurrentNetwork()});
  bindChange('showWeightsToggle',renderNetworkVisual);bindInput('networkZoomRange',e=>{const z=(+e.target.value||100)/100;['networkSvg','trainingSvg'].forEach(id=>{const s=$(id);if(s){s.style.transform=`scale(${z})`;s.style.transformOrigin='center center'}})});
  bindChange('networkSampleRow',()=>{const m=currentVisualModel();if(m){const pack=prepareRows(State.rows,m.stats);const row=Math.max(0,Math.min(pack.data.length-1,+$('networkSampleRow').value||0));State.sample=pack.data[row]?.x||State.sample;renderNetworkVisual()}});
  bindClick('trainBtn',trainCurrentNetwork);bindClick('stopBtn',()=>{State.stop=true;notify('Se solicitó detener el entrenamiento.','warning')});
  bindClick('stepBtn',animationStep);bindClick('animOneRowBtn',()=>animateRowsPreview(1,'Una fila'));bindClick('animEpochBtn',()=>animateRowsPreview(4,'Vista resumida de una época'));bindClick('playBtn',()=>animateRowsPreview(8,'Reproducción continua'));bindClick('animPauseBtn',()=>{State.animPaused=!State.animPaused;$('animPauseBtn').classList.toggle('active',State.animPaused)});
  document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{State.animationSpeed=+b.dataset.speed||1;document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===b))});
  bindClick('saveModelBtn',exportModel);bindClick('loadModelBtn',()=>$('modelInput').click());bindChange('modelInput',e=>importModel(e.target.files?.[0]));
  bindClick('explainResultsBtn',()=>document.querySelectorAll('#tab-results [data-flip]').forEach(c=>c.classList.add('is-flipped')));
  ['metricMAE','metricRMSE','metricR2','metricAccuracy','metricPrecision','metricRecall','metricF1'].forEach(id=>bindChange(id,()=>{const t=currentNet()?.trained;if(t){const evalData=prepareRows(State.split.test.length?State.split.test:State.split.val,t.model.stats).data;renderEvaluationMetrics(t.model,evalData)}}));
  bindClick('analyzeModelBtn',analyzeCurrentModel);bindClick('analyzeModelBtnLab',analyzeCurrentModel);
  bindClick('applyGeneralizationSuggestionBtn',applyGeneralizationSuggestion);
  bindChange('statsSelect',renderStats);bindChange('statsSecondSelect',renderStatsRecommendation);bindChange('statsAnalysisType',renderStatsRecommendation);bindChange('corrX',renderCorrelation);bindChange('corrY',renderCorrelation);
  bindClick('augmentBtn',augmentData);bindClick('ganTrainBtn',trainToyGan);
  bindClick('influencePrevBtn',()=>stepInfluence(-1));bindClick('influenceNextBtn',()=>stepInfluence(1));
  bindClick('runMemoryBtn',runMemoryDemo);bindChange('memoryType',renderMemoryTheory);
  bindClick('optimizerStepBtn',optimizerDemoStep);bindChange('optimizerDemoSelect',()=>{State.optimizerDemo={w:1,g:.3,lr:.1,v:0,s:0,m:0,t:0};if($('optWeight'))$('optWeight').textContent='1.0000';if($('optNewWeight'))$('optNewWeight').textContent='—';renderOptimizerFormula()});
  bindClick('runOptimizerComparisonBtn',runOptimizerComparison);
  bindChange('lossFunction',()=>{const y=targetY();if(y){const vals=State.rows.map(r=>Number(r[y])).filter(Number.isFinite);updateLossUI(new Set(vals).size<=2)}});
  bindClick('applyOneHotBtn',applyOneHotEncoding);bindClick('trainMulticlassBtn',trainMulticlassLab);bindInput('thresholdSlider',renderThresholdLab);bindClick('runClassicCurveBtn',runClassicLearningCurve);bindClick('runGridSearchBtn',runGridSearch);bindClick('trainSequenceBtn',trainSequenceLab);
  document.querySelectorAll('[data-study-level]').forEach(b=>b.onclick=()=>setStudyLevel(b.dataset.studyLevel));
  document.querySelectorAll('[data-context]').forEach(b=>b.onclick=()=>loadExample(b.dataset.context));
  window.addEventListener('resize',()=>{clearTimeout(V9.resizeTimer);V9.resizeTimer=setTimeout(()=>{renderNetworkVisual();renderStats()},100)});
  cardInteractionSetup();setupInputDialog();
}
function init(){
  try{document.documentElement.dataset.theme=localStorage.getItem('lab-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}
  setupNav();setupActions();setupInfoSystem();
  State.networks=[];State.currentNetwork=0;State.animationSpeed=1;State.animPaused=false;
  loadData(exampleRows());newNetwork('Red 1');
  try{setStudyLevel(localStorage.getItem('inl-study')||'intermediate')}catch(e){setStudyLevel('intermediate')}
  renderCurrentNetwork();renderDatasetGuide();renderStats();renderStatsRecommendation();drawLoss([],[]);drawLearningCurve([],[]);drawGan([],[]);renderMemoryTheory();renderOptimizerFormula();renderOptimizerVisibility();updateDecisionPanel();markFlowState();activateTab('home');
  if($('homeDatasetName'))$('homeDatasetName').textContent='Ejemplo integrado · Logística';
}

// Convert remaining legacy blocking alerts into non-blocking in-product feedback.
window.alert=(message)=>notify(String(message),'warning');

document.addEventListener('DOMContentLoaded',init,{once:true});

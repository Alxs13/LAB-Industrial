/* LAB Industrial v11 · Guided Learning Studio
   Filosofía: qué es → por qué → qué pasa si lo cambio → cómo se ve en mis datos. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>Number.isFinite(+n)?Number(n).toLocaleString('es-CL',{maximumFractionDigits:d}):'—';
const G={mode:localStorage.getItem('lab-learning-mode')||'guided',refreshTimer:null,lastTrainingFingerprint:''};

function safeCall(name,...args){try{return typeof window[name]==='function'?window[name](...args):undefined}catch(e){console.warn('[Guided]',name,e)}}
function currentY(){try{return typeof targetY==='function'?targetY():null}catch(e){return null}}
function xColumns(){return (State.columns||[]).filter(c=>State.roles?.[c]==='X')}
function excludedColumns(){return (State.columns||[]).filter(c=>State.roles?.[c]==='Excluir')}
function profile(c){try{return columnProfile(c,State.rows||[])}catch(e){return null}}
function categoricalXs(){return xColumns().filter(c=>!profile(c)?.numeric)}
function numericInputCount(){try{return typeof numericX==='function'?numericX().length:xColumns().filter(c=>profile(c)?.numeric).length}catch(e){return 0}}
function effectiveInputCount(){
  try{if(typeof inputNeuronDescriptorsV92==='function'){const n=inputNeuronDescriptorsV92().length;if(n)return n}}catch(e){}
  let n=0;for(const c of xColumns()){const p=profile(c);if(!p)continue;if(p.numeric)n++;else if(!p.date)n+=Math.max(1,Math.min(30,p.uniqueCount||1))}return n||numericInputCount();
}
function targetTask(){
  const y=currentY(),p=y?profile(y):null;if(!p)return'unknown';
  if(p.binary)return'binary';
  if(!p.numeric || (p.integerLike&&p.uniqueCount>=3&&p.uniqueCount<=20))return'multiclass';
  return'regression';
}
function taskLabel(t=targetTask()){return t==='regression'?'Regresión':t==='binary'?'Clasificación binaria':t==='multiclass'?'Clasificación multiclase':'Sin definir'}
function outputLabel(t=targetTask()){return t==='regression'?'Linear':t==='binary'?'Sigmoid':t==='multiclass'?'Softmax':'Automática'}
function outputValue(t=targetTask()){return t==='regression'?'linear':t==='binary'?'sigmoid':t==='multiclass'?'softmax':'auto'}
function lossRec(t=targetTask()){return t==='regression'?'mse':t==='binary'?'bce':'auto'}
function lossLabel(t=targetTask()){return t==='regression'?'MSE':t==='binary'?'Binary Cross-Entropy':'Cross-Entropy'}
function recommendedHidden(n=effectiveInputCount()){
  n=Math.max(1,n||1);if(n<=4)return[6,4];if(n<=8)return[10,6];if(n<=24)return[16,8];if(n<=50)return[32,16];return[64,32];
}
function unit(){try{return typeof targetUnit==='function'?targetUnit():''}catch(e){return''}}
function selectedTargetSamples(){const y=currentY();if(!y)return[];return (State.rows||[]).map(r=>r[y]).filter(v=>v!==''&&v!=null).slice(0,4)}
function qualityScore(){try{return State.schema?.quality?.score??dataQualityReport(State.rows,State.columns)?.score??null}catch(e){return null}}
function stdTarget(){const y=currentY();if(!y)return 1;const a=(State.rows||[]).map(r=>+r[y]).filter(Number.isFinite);if(a.length<2)return 1;const m=a.reduce((s,v)=>s+v,0)/a.length;return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1))||1}
function inputSummary(){const original=xColumns().length,effective=effectiveInputCount(),cats=categoricalXs();return{original,effective,cats}}
function currentNetSafe(){try{return currentNet()}catch(e){return null}}

function setLearningMode(mode){
  G.mode=mode==='advanced'?'advanced':'guided';localStorage.setItem('lab-learning-mode',G.mode);document.documentElement.dataset.learningMode=G.mode;
  qa('[data-learning-mode]').forEach(b=>b.classList.toggle('active',b.dataset.learningMode===G.mode));
  scheduleRefresh();
  if(typeof notify==='function')notify(G.mode==='guided'?'Modo guiado: LAB explica cada decisión antes de aplicarla.':'Modo avanzado: todos los hiperparámetros quedan visibles.','info');
}

function injectModeToggle(){
  if($('#learningModeToggle'))return;const host=document.querySelector('.topbar-actions');if(!host)return;
  const box=document.createElement('div');box.id='learningModeToggle';box.className='learning-mode-toggle';box.innerHTML='<span>Experiencia</span><button type="button" data-learning-mode="guided">Guiado</button><button type="button" data-learning-mode="advanced">Avanzado</button>';
  host.prepend(box);box.querySelectorAll('[data-learning-mode]').forEach(b=>b.addEventListener('click',()=>setLearningMode(b.dataset.learningMode)));
  document.documentElement.dataset.learningMode=G.mode;qa('[data-learning-mode]').forEach(b=>b.classList.toggle('active',b.dataset.learningMode===G.mode));
}

function insertAfterIntro(tabId,node){const tab=$(tabId);if(!tab||!node)return;const intro=tab.querySelector('.page-intro');if(intro)intro.insertAdjacentElement('afterend',node);else tab.prepend(node)}
function makeSection(id,cls='guided-studio'){if($(id))return $(id);const n=document.createElement('section');n.id=id;n.className=cls;return n}

function injectGuidedSections(){
  const data=makeSection('guidedDataCoach','guided-studio guided-data-coach');insertAfterIntro('tab-data',data);
  const model=makeSection('guidedModelStudio');insertAfterIntro('tab-networks',model);
  const train=makeSection('guidedTrainingStudio');insertAfterIntro('tab-train',train);
  const results=makeSection('guidedResultsStudio');insertAfterIntro('tab-results',results);
  const trainLegacy=document.querySelector('#tab-train > .modular-grid > article:first-child');if(trainLegacy)trainLegacy.classList.add('legacy-train-config');
}

function conceptBlock(title,what,why,change,data,extra=''){
  return `<article class="guide-concept-card"><div class="guide-concept-head"><span class="guide-check">✓</span><div><small>RECOMENDACIÓN</small><h3>${esc(title)}</h3></div>${extra}</div><div class="guide-four-questions"><details open><summary>¿Qué es?</summary><p>${what}</p></details><details open><summary>¿Por qué aquí?</summary><p>${why}</p></details><details><summary>¿Qué pasa si lo cambio?</summary><p>${change}</p></details><details><summary>En tus datos</summary><p>${data}</p></details></div></article>`
}

function renderDataCoach(){
  const box=$('guidedDataCoach');if(!box)return;if(!State.rows?.length){box.innerHTML='<div class="guided-empty"><span class="eyebrow">MODO GUIADO</span><h2>Primero necesitamos datos</h2><p>Sube un CSV o carga un ejemplo. LAB Industrial irá explicando cada decisión a medida que avanzas.</p></div>';return}
  const y=currentY(),p=y?profile(y):null,t=targetTask(),samples=selectedTargetSamples(),inp=inputSummary(),cats=inp.cats,ids=excludedColumns(),q=qualityScore();
  const options=(State.columns||[]).map(c=>`<option value="${esc(c)}" ${c===y?'selected':''}>${esc(c)}</option>`).join('');
  const reason=t==='regression'?`“${esc(y||'Y')}” contiene valores numéricos continuos${samples.length?`, por ejemplo ${samples.map(esc).join(', ')}`:''}. La tarea es estimar una cantidad.`:t==='binary'?`“${esc(y||'Y')}” tiene dos estados. La red aprenderá la probabilidad de pertenecer a una de las dos clases.`:`“${esc(y||'Y')}” representa varias clases. La salida debe repartir probabilidad entre ellas.`;
  const catText=cats.length?`${cats.length} X categórica(s) (${cats.slice(0,3).map(esc).join(', ')}${cats.length>3?'…':''}) deberán convertirse a números con One-Hot.`:'Las entradas actuales ya son numéricas o están preparadas para el modelo.';
  box.innerHTML=`<div class="guided-section-head"><div><span class="eyebrow">MODO GUIADO · PASO 1</span><h2>Primero entendamos el problema</h2><p>LAB no elige una configuración a ciegas: parte de lo que quieres predecir y de cómo están construidos tus datos.</p></div><span class="guided-score">Calidad ${q==null?'—':q+'/100'}</span></div>
  <div class="guided-target-grid"><article class="guided-target-card"><span class="kicker">¿QUÉ QUIERES PREDECIR?</span><label>Variable objetivo Y<select id="guidedTargetSelect">${options}</select></label><button id="guidedSetTargetBtn" class="primary">Usar como objetivo</button></article><article class="guided-diagnosis"><span class="kicker">TIPO DE PROBLEMA</span><strong>${taskLabel(t)}</strong><p>${reason}</p><div class="guided-badges"><span>${p?.type||'sin perfil'}</span><span>${p?.uniqueCount??'—'} valores únicos</span></div></article></div>
  <div class="guided-learning-grid"><article><span>01</span><h3>Y · Objetivo</h3><p>${reason}</p></article><article><span>02</span><h3>X · Entradas</h3><p>Tienes <b>${inp.original}</b> variables X seleccionadas. Tras codificar categorías, el modelo puede recibir <b>${inp.effective}</b> entradas.</p></article><article><span>03</span><h3>Preparación</h3><p>${catText}</p></article><article><span>04</span><h3>Excluir ruido</h3><p>${ids.length?`Se excluyen ${ids.slice(0,4).map(esc).join(', ')} porque parecen identificadores o variables que no conviene usar como señal.`:'No hay identificadores excluidos automáticamente.'}</p></article></div>
  <div class="guided-callout"><div><strong>¿Por qué One-Hot?</strong><p>Una red neuronal necesita números. Una categoría como “Turno = Noche” no debe convertirse arbitrariamente en 3; One-Hot crea señales separadas para cada categoría sin inventar un orden.</p></div>${cats.length?'<button id="guidedPrepareDataBtn" class="secondary">Preparar categóricas ahora</button>':'<span class="guided-ready">✓ Datos de entrada listos</span>'}</div>`;
  $('#guidedSetTargetBtn')?.addEventListener('click',()=>{const c=$('guidedTargetSelect')?.value;if(!c)return;if(typeof setTargetFromModelV92==='function')setTargetFromModelV92(c);else{Object.keys(State.roles||{}).forEach(k=>{if(State.roles[k]==='Y')State.roles[k]='X'});State.roles[c]='Y';safeCall('applySplit');safeCall('renderTable');safeCall('renderDatasetGuide');safeCall('renderCurrentNetwork')}scheduleRefresh();if(typeof notify==='function')notify(`Objetivo Y cambiado a ${c}. LAB volvió a analizar el tipo de problema.`,'success')});
  $('#guidedPrepareDataBtn')?.addEventListener('click',()=>{$('integratedOneHotBtn')?.click();setTimeout(scheduleRefresh,100)});
}

function activationSVG(type='relu'){
  const pts=[];for(let i=0;i<=80;i++){const x=-3+6*i/80;let y=type==='sigmoid'?1/(1+Math.exp(-x)):type==='tanh'?Math.tanh(x):Math.max(0,x);const px=16+(x+3)/6*168,py=92-((y-(type==='relu'?0:-1))/(type==='relu'?3:2))*70;pts.push(`${px.toFixed(1)},${Math.max(12,Math.min(92,py)).toFixed(1)}`)}
  return `<svg viewBox="0 0 200 110" role="img" aria-label="Gráfico ${type}"><line x1="16" y1="92" x2="188" y2="92"/><line x1="100" y1="10" x2="100" y2="100"/><polyline points="${pts.join(' ')}"/></svg>`;
}
function renderActivationCompare(type='relu'){
  const host=$('guidedActivationCompare');if(!host)return;const copy={relu:['ReLU','Deja pasar los valores positivos y anula los negativos.','Suele entrenar rápido y combina bien con inicialización He.','Puede crear neuronas inactivas si los valores quedan siempre bajo cero.'],sigmoid:['Sigmoid','Comprime cualquier entrada al rango 0–1.','Es muy útil en una salida binaria, donde queremos interpretar probabilidad.','En capas ocultas puede saturarse y producir gradientes pequeños.'],tanh:['Tanh','Comprime al rango −1 a 1.','Está centrada alrededor de cero y puede servir en redes pequeñas.','También puede saturarse; normalmente ReLU es un punto de partida más simple.']}[type];host.innerHTML=`<div class="activation-mini-plot">${activationSVG(type)}</div><div><span class="kicker">${copy[0]}</span><h4>${copy[1]}</h4><p>${copy[2]}</p><small>${copy[3]}</small></div>`}

function renderModelCoach(){
  const box=$('guidedModelStudio');if(!box)return;if(!State.rows?.length){box.innerHTML='<div class="guided-empty"><h2>Carga datos antes de diseñar la red</h2></div>';return}
  const y=currentY(),t=targetTask(),inp=inputSummary(),hidden=recommendedHidden(inp.effective),arch=[inp.effective,...hidden,t==='multiclass'?'K':1].join(' → '),out=outputLabel(t),cats=inp.cats;
  const whyInputs=cats.length?`Partimos de ${inp.original} X originales. Las categorías amplían la representación hasta aproximadamente ${inp.effective} entradas efectivas.`:`Tus ${inp.original} X seleccionadas se traducen en ${inp.effective} entradas numéricas.`;
  box.innerHTML=`<div class="guided-section-head"><div><span class="eyebrow">MODO GUIADO · PASO 2</span><h2>Construyamos la red entendiendo cada pieza</h2><p>La recomendación es un punto de partida, no una verdad absoluta. Puedes aplicarla y después experimentar.</p></div><button id="guidedApplyModelBtn" class="primary">Aplicar recomendación</button></div>
  <div class="guided-architecture-hero"><div class="guided-arch-flow"><span><b>${inp.effective}</b><small>ENTRADAS</small></span><i>→</i>${hidden.map((h,i)=>`<span><b>${h}</b><small>H${i+1}</small></span><i>→</i>`).join('')}<span><b>${t==='multiclass'?'K':'1'}</b><small>SALIDA</small></span></div><div><span class="kicker">ARQUITECTURA RECOMENDADA</span><h3>${arch}</h3><p>${whyInputs} La red comprime esa información en ${hidden.join(' y ')} neuronas ocultas antes de producir la salida.</p></div></div>
  <div class="guided-concept-grid">${conceptBlock(`Capas ocultas ${hidden.join(' → ')}`,'Las capas ocultas combinan las entradas y aprenden representaciones intermedias.',`Con ${inp.effective} entradas, ${hidden[0]} neuronas permiten combinar señales y ${hidden[1]} obligan a condensarlas antes de predecir.`,`Más neuronas aumentan capacidad pero también parámetros y riesgo de sobreajuste; muy pocas pueden quedarse cortas.`,`Y actual: ${esc(y||'—')} · ${inp.original} X originales · ${inp.effective} entradas efectivas.`)}${conceptBlock('ReLU en capas ocultas','ReLU aplica f(x)=max(0,x). Introduce no linealidad para que la red aprenda relaciones más complejas que una recta.','Es un punto de partida estable y simple para una MLP como ésta, especialmente junto con inicialización He.','Sigmoid y Tanh comprimen la señal; pueden servir, pero en capas ocultas profundas pueden saturarse.','Tus variables combinan escalas y relaciones industriales que no tienen por qué ser puramente lineales.',`<span class="guide-mini-tag">ReLU + He</span>`)}${conceptBlock(`${out} en la salida`,t==='regression'?'Linear no limita el valor final: f(x)=x.':t==='binary'?'Sigmoid transforma la salida en una probabilidad entre 0 y 1.':'Softmax reparte probabilidad entre todas las clases.',t==='regression'?`“${esc(y)}” es una cantidad continua y puede tomar muchos valores; no conviene encerrarla entre 0 y 1.`:t==='binary'?'Tu Y tiene dos clases, por eso una probabilidad es una representación natural.':'Tu Y tiene varias clases y necesitamos una probabilidad por clase.','Elegir una salida incompatible cambia el significado matemático del modelo y puede impedir que aprenda correctamente.',`Problema detectado: ${taskLabel(t)}.`)}${conceptBlock('Inicialización He','Antes de entrenar, los pesos deben empezar con valores pequeños y distintos. He controla su escala inicial.','He fue diseñada para funcionar bien con activaciones tipo ReLU y ayuda a mantener señales útiles a través de las capas.','Xavier suele combinar mejor con Tanh/Sigmoid; una inicialización aleatoria sin control puede hacer el aprendizaje inestable.','Con ReLU como activación oculta, He es una pareja coherente.')}</div>
  <article class="guided-compare-card"><div><span class="kicker">EXPERIMENTA SIN PERDERTE</span><h3>¿Qué pasaría si cambias la activación?</h3><div class="guided-choice-row"><button data-guide-act="relu" class="active">ReLU</button><button data-guide-act="tanh">Tanh</button><button data-guide-act="sigmoid">Sigmoid</button></div></div><div id="guidedActivationCompare" class="activation-compare"></div></article>
  <div class="guided-next"><div><strong>Plan actual:</strong> ${arch} · ReLU · ${out} · He</div><button id="guidedGoTrainBtn" class="secondary">Entender el entrenamiento →</button></div>`;
  renderActivationCompare('relu');
  qa('[data-guide-act]',box).forEach(b=>b.addEventListener('click',()=>{qa('[data-guide-act]',box).forEach(x=>x.classList.toggle('active',x===b));renderActivationCompare(b.dataset.guideAct)}));
  $('#guidedApplyModelBtn')?.addEventListener('click',applyGuidedModel);
  $('#guidedGoTrainBtn')?.addEventListener('click',()=>{applyGuidedModel(false);safeCall('activateTab','train');setTimeout(()=>$('#guidedTrainingStudio')?.scrollIntoView({behavior:'smooth',block:'start'}),100)});
}

function setControl(id,value,checked=false){const e=$(id);if(!e)return;if(checked)e.checked=!!value;else e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}
function applyGuidedModel(announce=true){
  const n=currentNetSafe();if(!n||!State.rows?.length)return;const t=targetTask(),hidden=recommendedHidden();
  State.architectureLinked=false;if($('linkedArchitectureToggle'))$('linkedArchitectureToggle').checked=false;
  n.hidden=hidden.slice();n.hiddenActivation='relu';n.outputActivation=outputValue(t);n.initMethod='he';n.layerSettings=hidden.map(()=>({activation:'relu',dropout:0,batchNorm:false,bias:true}));
  if($('hiddenActivation'))$('hiddenActivation').value='relu';if($('outputActivation'))$('outputActivation').value=n.outputActivation;if($('initMethod'))$('initMethod').value='he';
  safeCall('renderCurrentNetwork');safeCall('renderNetworkTabs');scheduleRefresh();if(announce&&typeof notify==='function')notify(`Modelo recomendado aplicado: ${effectiveInputCount()} → ${hidden.join(' → ')} → ${t==='multiclass'?'K':'1'}.`,'success');
}

function trainingDefaults(){const t=targetTask();return{epochs:300,lr:.001,batch:32,seed:42,opt:'adam',loss:lossRec(t),early:true,patience:15}}
function applyGuidedTraining(announce=true){
  applyGuidedModel(false);const d=trainingDefaults();setControl('epochs',d.epochs);setControl('learningRate',d.lr);setControl('batchSize',d.batch);setControl('trainingSeed',d.seed);setControl('optimizer',d.opt);setControl('lossFunction',d.loss);setControl('useEarlyStopping',d.early,true);setControl('patience',d.patience);if($('slowMo'))$('slowMo').checked=false;safeCall('renderLossStudio');scheduleRefresh();if(announce&&typeof notify==='function')notify('Plan de entrenamiento guiado aplicado. Puedes revisar cada decisión antes de entrenar.','success');
}
function renderTrainingCoach(){
  const box=$('guidedTrainingStudio');if(!box)return;if(!State.rows?.length){box.innerHTML='<div class="guided-empty"><h2>Carga datos para construir el plan de entrenamiento</h2></div>';return}
  const d=trainingDefaults(),t=targetTask(),y=currentY(),inp=inputSummary(),hidden=recommendedHidden(),cats=inp.cats,sd=stdTarget(),e=Math.max(.5,sd*.25),mse=e*e;
  const readiness=[['Objetivo Y',!!y,y||'Falta definir Y'],['Entradas',inp.effective>0,`${inp.effective} entradas efectivas`],['Categóricas',cats.length===0,cats.length?`${cats.length} pendientes de One-Hot`:'Preparadas'],['División',!!State.split?.train?.length,State.split?.train?.length?`${State.split.train.length} filas en Train`:'Aplicar split']];
  box.innerHTML=`<div class="guided-section-head"><div><span class="eyebrow">MODO GUIADO · PASO 3</span><h2>¿Cómo aprenderá la red?</h2><p>Ahora definimos cómo medir el error y cómo mover los pesos. Cada hiperparámetro tiene una función distinta.</p></div><button id="guidedApplyTrainingBtn" class="primary">Aplicar plan recomendado</button></div>
  <div class="guided-readiness">${readiness.map(([n,ok,tx])=>`<div class="${ok?'ok':'warn'}"><span>${ok?'✓':'!'}</span><div><b>${esc(n)}</b><small>${esc(tx)}</small></div></div>`).join('')}</div>
  <div class="guided-training-grid">
    <article class="training-teach-card"><span class="kicker">¿CÓMO CAMBIA LOS PESOS?</span><h3>Adam</h3><div class="optimizer-loop"><span>Error</span><i>↓</i><span>Gradiente</span><i>↓</i><strong>Adam</strong><i>↓</i><span>Pesos nuevos</span></div><p><b>Qué es:</b> un optimizador que adapta el tamaño de las actualizaciones usando memoria del gradiente.</p><p><b>Por qué:</b> suele ser un buen punto de partida y requiere menos ajuste manual que SGD.</p><details><summary>¿Qué pasa si uso otro?</summary><p>SGD es más simple pero puede necesitar más ajuste; RMSProp también adapta el paso; AdamW separa el decaimiento de pesos.</p></details></article>
    <article class="training-teach-card"><span class="kicker">¿CUÁNTO CAMBIA?</span><h3>Learning rate · ${d.lr}</h3><div class="lr-demo"><div><b>Muy bajo</b><i class="slow"></i><small>aprende lento</small></div><div class="selected"><b>${d.lr}</b><i class="good"></i><small>punto de partida</small></div><div><b>Muy alto</b><i class="fast"></i><small>puede oscilar</small></div></div><p>El learning rate controla el tamaño del paso con que se actualizan los pesos.</p><details><summary>¿Qué pasa si lo cambio?</summary><p>Un valor demasiado pequeño puede tardar muchas épocas; uno demasiado grande puede saltarse regiones buenas o hacer divergir la loss.</p></details></article>
    <article class="training-teach-card"><span class="kicker">¿CÓMO MEDIMOS EL ERROR?</span><h3>${lossLabel(t)}</h3>${t==='regression'?`<div class="loss-example"><span>Ejemplo con error</span><b>${fmt(e,2)}${unit()?' '+unit():''}</b><i>→</i><span>MSE</span><b>${fmt(mse,2)}</b></div><p>MSE eleva el error al cuadrado, por eso castiga más los errores grandes.</p>`:`<p>${t==='binary'?'Binary Cross-Entropy castiga predicciones probabilísticas seguras cuando están equivocadas.':'Cross-Entropy compara la distribución de probabilidades con la clase real.'}</p>`}<details><summary>¿Qué pasa si uso otra loss?</summary><p>${t==='regression'?'MAE es más resistente a errores extremos; Huber combina comportamiento de MSE y MAE.':'Cambiar la loss cambia qué tipo de equivocación recibe mayor penalización.'}</p></details></article>
    <article class="training-teach-card"><span class="kicker">REPETIBILIDAD</span><h3>Semilla · 42</h3><div class="seed-visual"><span>42</span><i>→</i><div><b>pesos iniciales</b><b>orden de datos</b><b>aleatoriedad</b></div></div><p>42 no es una semilla “mejor”. La fijamos para poder repetir y comparar experimentos en condiciones similares.</p><details><summary>¿Qué pasa si la cambio?</summary><p>El resultado puede variar un poco porque la red parte desde otro estado. Para estudiar robustez conviene repetir con varias semillas.</p></details></article>
    <article class="training-teach-card"><span class="kicker">¿CUÁNTO ENTRENAMOS?</span><h3>Máx. 300 épocas + Early Stopping</h3><p>300 es un límite, no una obligación. Early Stopping observa validation y detiene si deja de mejorar.</p><div class="early-stop-sketch"><span>train</span><i></i><span>validation</span><i></i><b>STOP</b></div><details><summary>¿Por qué no entrenar siempre más?</summary><p>Una red puede seguir memorizando Train mientras empeora en datos no vistos. Detener a tiempo ayuda a generalizar.</p></details></article>
    <article class="training-teach-card"><span class="kicker">MINI-BATCH</span><h3>Batch · 32</h3><p>En lugar de actualizar con una sola fila o con todo el dataset, la red agrupa 32 observaciones por actualización.</p><details><summary>¿Qué pasa si lo cambio?</summary><p>Batch pequeños introducen más variación; batch grandes hacen actualizaciones más estables pero menos frecuentes.</p></details></article>
  </div>
  <article class="training-plan-summary"><div><span class="kicker">PLAN DE ENTRENAMIENTO</span><h3>Antes de presionar Entrenar, esto es lo que LAB propone</h3></div><div class="plan-grid"><span><small>Problema</small><b>${taskLabel(t)}</b></span><span><small>Red</small><b>${inp.effective} → ${hidden.join(' → ')} → ${t==='multiclass'?'K':'1'}</b></span><span><small>Activación</small><b>ReLU</b></span><span><small>Salida</small><b>${outputLabel(t)}</b></span><span><small>Inicio pesos</small><b>He</b></span><span><small>Optimizador</small><b>Adam</b></span><span><small>Loss</small><b>${lossLabel(t)}</b></span><span><small>LR</small><b>0.001</b></span><span><small>Seed</small><b>42</b></span><span><small>Protección</small><b>Early Stopping</b></span></div><div class="actions"><button id="guidedPrepareAndTrainBtn" class="primary large">Entrenar con esta configuración</button><button id="guidedAdvancedBtn" class="secondary">Quiero configurarlo manualmente</button></div></article>
  <div id="guidedPostTraining" class="guided-post-training"></div>`;
  $('#guidedApplyTrainingBtn')?.addEventListener('click',()=>applyGuidedTraining(true));
  $('#guidedAdvancedBtn')?.addEventListener('click',()=>setLearningMode('advanced'));
  $('#guidedPrepareAndTrainBtn')?.addEventListener('click',()=>{if(cats.length){if(typeof notify==='function')notify('Primero prepara las variables categóricas con One-Hot en Datos.','warning');safeCall('activateTab','data');setTimeout(()=>$('#guidedDataCoach')?.scrollIntoView({behavior:'smooth'}),80);return}applyGuidedTraining(false);$('trainBtn')?.click();watchTrainingCompletion()});
  renderPostTraining();
}

function regressionMetricsFromPreds(t){const y=t?.preds?.y,p=t?.preds?.p;if(!y?.length||!p?.length)return null;const n=Math.min(y.length,p.length),mae=y.slice(0,n).reduce((s,v,i)=>s+Math.abs(v-p[i]),0)/n,rmse=Math.sqrt(y.slice(0,n).reduce((s,v,i)=>s+(v-p[i])**2,0)/n),mean=y.slice(0,n).reduce((s,v)=>s+v,0)/n,ssTot=y.slice(0,n).reduce((s,v)=>s+(v-mean)**2,0),ssRes=y.slice(0,n).reduce((s,v,i)=>s+(v-p[i])**2,0),r2=ssTot?1-ssRes/ssTot:NaN;return{mae,rmse,r2}}
function renderPostTraining(){
  const host=$('guidedPostTraining');if(!host)return;const net=currentNetSafe(),t=net?.trained;if(!t){host.innerHTML='<div class="guided-await"><span>Después de entrenar, LAB explicará por qué se detuvo, qué significan las métricas y qué conviene revisar después.</span></div>';return}
  const configured=+$('epochs')?.value||t.trainHist?.length||0,done=t.trainHist?.length||0,es=t.settings?.earlyStopping,stopped=es&&done<configured,met=regressionMetricsFromPreds(t),u=unit();
  host.innerHTML=`<article class="post-train-card"><div class="post-train-title"><span class="kicker">ENTRENAMIENTO FINALIZADO</span><h3>${stopped?`Se detuvo en la época ${done}`:`Completó ${done} épocas`}</h3></div><p>${stopped?`No llegó al máximo de ${configured} porque Early Stopping detectó que continuar ya no mejoraba validation. Esto busca evitar que la red siga memorizando Train.`:`El entrenamiento recorrió el límite configurado. Revisa Train vs Validation para comprobar si seguir entrenando aportaría algo.`}</p><div class="post-train-flow"><span>Forward</span><i>→</i><span>Loss</span><i>→</i><span>Backprop</span><i>→</i><span>Update</span><i>↺</i></div>${met?`<div class="post-metrics"><div><small>MAE</small><b>${fmt(met.mae,2)}${u?' '+u:''}</b><p>Error absoluto promedio.</p></div><div><small>RMSE</small><b>${fmt(met.rmse,2)}${u?' '+u:''}</b><p>Penaliza más errores grandes.</p></div><div><small>R²</small><b>${fmt(met.r2,2)}</b><p>≈ ${fmt(met.r2*100,0)}% de variabilidad explicada. No significa “${fmt(met.r2*100,0)}% de precisión”.</p></div></div>`:''}<div class="actions"><button class="secondary" data-go="results">Entender resultados →</button><button class="secondary" data-go="decision">Simular una decisión →</button></div></article>`;
}

function renderResultsCoach(){
  const box=$('guidedResultsStudio');if(!box)return;const net=currentNetSafe(),t=net?.trained;if(!t){box.innerHTML='<div class="guided-empty"><span class="eyebrow">MODO GUIADO · PASO 4</span><h2>Aquí traduciremos las métricas a lenguaje humano</h2><p>Entrena una red primero. Después LAB explicará qué representa cada número y qué NO significa.</p></div>';return}
  const met=regressionMetricsFromPreds(t),u=unit(),y=currentY(),task=targetTask();
  if(task!=='regression'||!met){box.innerHTML=`<div class="guided-section-head"><div><span class="eyebrow">MODO GUIADO · PASO 4</span><h2>Interpretar antes de decidir</h2><p>El objetivo actual es ${taskLabel(task)}. Revisa las tarjetas de métricas: LAB separa precisión, recall, F1 y especificidad porque responden preguntas diferentes.</p></div></div>`;return}
  const r2Pct=met.r2*100;
  box.innerHTML=`<div class="guided-section-head"><div><span class="eyebrow">MODO GUIADO · PASO 4</span><h2>¿Qué aprendió realmente el modelo?</h2><p>Las métricas no son notas. Cada una observa un tipo distinto de error.</p></div><button class="secondary" data-go="decision">Ir a Decision Center →</button></div>
  <div class="metric-teach-grid"><article><span>MAE</span><strong>${fmt(met.mae,2)}${u?' '+u:''}</strong><h3>“¿Cuánto me equivoco normalmente?”</h3><p>En promedio, la predicción se separa aproximadamente ${fmt(met.mae,2)}${u?' '+u:''} del valor real de ${esc(y)}.</p></article><article><span>RMSE</span><strong>${fmt(met.rmse,2)}${u?' '+u:''}</strong><h3>“¿Qué pasa con los errores grandes?”</h3><p>RMSE castiga más las equivocaciones grandes; que sea mayor que MAE indica que algunos errores pesan bastante.</p></article><article><span>R²</span><strong>${fmt(met.r2,2)}</strong><h3>“¿Cuánta variación captura?”</h3><p>El modelo explica aproximadamente ${fmt(r2Pct,0)}% de la variación observada en ${esc(y)} dentro del conjunto de evaluación.</p></article></div>
  <div class="r2-warning"><strong>Importante:</strong><span>R² = ${fmt(met.r2,2)} no significa “${fmt(r2Pct,0)}% de precisión”. R² compara cuánto mejora el modelo frente a predecir siempre la media.</span></div>
  <div class="guided-result-next"><div><span class="kicker">SIGUIENTE PREGUNTA</span><h3>¿Qué variables están moviendo la predicción?</h3><p>Ahora que sabes cuánto se equivoca el modelo, usa Análisis y Decision Center para explorar sensibilidad y escenarios.</p></div><div class="actions"><button data-go="analysis">Analizar modelo</button><button data-go="decision" class="primary">Simular escenario</button></div></div>`;
}

function applyGuidedTargetRecommendation(){if(!State.rows?.length)return;const s=safeCall('suggestSchema',State.rows,State.columns);if(!s?.y)return;if(typeof setTargetFromModelV92==='function')setTargetFromModelV92(s.y);else{State.roles={...s.roles};safeCall('applySplit')}scheduleRefresh()}

function watchTrainingCompletion(){
  const start=Date.now();const tick=()=>{renderPostTraining();renderResultsCoach();if(State.training&&Date.now()-start<300000){setTimeout(tick,350);return}setTimeout(()=>{renderPostTraining();renderResultsCoach();scheduleRefresh()},200)};setTimeout(tick,200)
}

function scheduleRefresh(){clearTimeout(G.refreshTimer);G.refreshTimer=setTimeout(renderAll,60)}
function renderAll(){document.documentElement.dataset.learningMode=G.mode;renderDataCoach();renderModelCoach();renderTrainingCoach();renderResultsCoach();qa('[data-learning-mode]').forEach(b=>b.classList.toggle('active',b.dataset.learningMode===G.mode))}

function wrapRefresh(fnName){const old=window[fnName];if(typeof old!=='function'||old.__guidedWrapped)return;const wrapped=function(...args){const r=old.apply(this,args);Promise.resolve(r).finally(scheduleRefresh);return r};wrapped.__guidedWrapped=true;window[fnName]=wrapped}
function wireGlobalRefresh(){['renderDatasetGuide','renderCurrentNetwork','renderTable','renderEvaluationMetrics','renderPredictor','applySplit'].forEach(wrapRefresh);document.addEventListener('change',e=>{if(e.target.matches('select,input'))scheduleRefresh()});document.addEventListener('click',e=>{if(e.target.closest('#trainBtn'))watchTrainingCompletion();if(e.target.closest('[data-tab],[data-go]'))setTimeout(scheduleRefresh,120)});}

function init(){
  injectModeToggle();injectGuidedSections();wireGlobalRefresh();renderAll();
  const targetBtn=$('applySuggestedRolesBtn');if(targetBtn&&!targetBtn.dataset.guidedTip){targetBtn.dataset.guidedTip='1';targetBtn.title='LAB propone Y y X, pero puedes revisarlas antes de continuar.'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.LABGuidedLearning={setMode:setLearningMode,applyModel:applyGuidedModel,applyTraining:applyGuidedTraining,refresh:renderAll,applyTargetRecommendation:applyGuidedTargetRecommendation};
})();

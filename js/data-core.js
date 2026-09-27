
const InfoLibrary={
  table:{title:'Tabla de datos',formula:'X = variables de entrada\nY = variable objetivo',text:'La tabla representa observaciones. Cada fila es un ejemplo y cada columna una variable. Las columnas X entran al modelo y Y es lo que intentas predecir.',example:'Ejemplo: distancia, carga y congestión → tiempo de viaje.'},
  split:{title:'Train / Validation / Test',formula:'Dataset = Train ∪ Validation ∪ Test',text:'Train ajusta los pesos. Validation ayuda a detectar overfitting y elegir hiperparámetros. Test se reserva para la evaluación final.',example:'Una división común es 70% / 15% / 15%.'},
  clean:{title:'Limpieza de datos',formula:'Dato limpio = dato válido + consistente + usable',text:'Antes de entrenar conviene revisar faltantes, duplicados, outliers y escalas. El preprocesamiento debe ajustarse usando Train para evitar data leakage.',example:'No calcules la media usando también Test si esa media se usará para normalizar.'},
  networks:{title:'Varias redes',formula:'Red A ≠ Red B\nArquitecturas distintas → comportamientos distintos',text:'Puedes crear redes separadas para comparar profundidad, anchura, activaciones y regularización sobre el mismo conjunto.',example:'3→4→1 frente a 3→16→8→1.'},
  architecture:{title:'Arquitectura',formula:'n₀ → n₁ → n₂ → ... → nL',text:'n₀ es el número de entradas. Las capas ocultas transforman representaciones. La última capa genera la salida.',example:'4→8→4→1 significa 4 X, dos capas ocultas y una salida.'},
  training:{title:'Entrenamiento',formula:'W ← W - η ∂L/∂W',text:'El entrenamiento repite forward, loss, backpropagation y actualización de parámetros.',example:'η es el learning rate.'},
  backprop:{title:'Backpropagation',formula:'δˡ = (Wˡ⁺¹)ᵀδˡ⁺¹ ⊙ f′(zˡ)\n∂L/∂Wˡ = δˡ(aˡ⁻¹)ᵀ',text:'Backpropagation aplica la regla de la cadena para saber cuánto contribuyó cada peso al error.',example:'No propaga literalmente “el error”; propaga gradientes o sensibilidades.'},
  generalization:{title:'Generalización',formula:'Buen modelo: error_train ≈ error_val ≈ error_test',text:'Generalizar significa funcionar bien con datos nuevos. Overfitting aprende demasiado el train; underfitting no aprende suficiente.',example:'Train loss muy baja y val loss alta suele indicar overfitting.'},
  regularization:{title:'Regularización',formula:'Cost = Loss + penalización',text:'La regularización limita la complejidad efectiva del modelo y puede mejorar generalización.',example:'L1, L2, Dropout y Early stopping son técnicas distintas.'},
  mitigation:{title:'Mitigación',formula:'problema → diagnóstico → técnica adecuada',text:'No existe una única técnica para todos los fallos. La mitigación depende de si hay overfitting, underfitting, gradientes inestables, leakage o datos insuficientes.',example:'Exploding gradients → gradient clipping y menor learning rate.'},
  stats:{title:'Estadística descriptiva',formula:'x̄ = (1/n)Σxᵢ\ns = √[Σ(xᵢ-x̄)²/(n-1)]',text:'Resume el comportamiento de una variable antes de modelarla.',example:'Media, mediana, desviación, cuartiles e IQR.'},
  correlation:{title:'Correlación de Pearson',formula:'r = cov(X,Y)/(sₓ sᵧ)',text:'Mide asociación lineal entre dos variables numéricas. No implica causalidad.',example:'r cercano a 1 o -1 indica asociación lineal fuerte.'},
  augmentation:{title:'Data augmentation',formula:'x_sintético = x + ε',text:'Genera observaciones adicionales mediante transformaciones plausibles. Debe respetar la física o lógica del proceso.',example:'Agregar ruido pequeño a sensores puede ser razonable; inventar costos imposibles no.'},
  gan:{title:'GAN',formula:'min_G max_D  E[log D(x)] + E[log(1-D(G(z)))]',text:'Una GAN tiene un Generador G que crea datos y un Discriminador D que intenta distinguir reales de falsos.',example:'Ambos mejoran mediante competencia durante el entrenamiento.'},
  influence:{title:'Influencia entre capas',formula:'aˡ = f(Wˡaˡ⁻¹+bˡ)',text:'Cada neurona de una capa recibe activaciones de la capa anterior. Su salida se convierte en entrada para la capa siguiente.',example:'Cambiar H1 cambia H2, luego cambia la salida.'},
  memory:{title:'Memoria en redes',formula:'RNN: hₜ = f(Wₓxₜ + Wₕhₜ₋₁ + b)',text:'RNN, LSTM y GRU mantienen un estado que depende de pasos anteriores.',example:'En una serie temporal, el valor de hoy puede depender de días previos.'},
  optimizers:{title:'Optimizadores',formula:'SGD: w ← w-ηg\nMomentum: v←βv-ηg\nAdam: usa momentos de g y g²',text:'Los optimizadores deciden cómo convertir gradientes en actualizaciones de pesos.',example:'Adam suele ser un buen punto de partida, pero no siempre es el mejor.'},
  l1:{title:'L1',formula:'Cost = Loss + λ Σ|w|',text:'Penaliza el valor absoluto de los pesos y puede llevar algunos muy cerca de cero.',example:'Puede favorecer soluciones más dispersas/sparse.'},
  l2:{title:'L2',formula:'Cost = Loss + λ Σw²',text:'Penaliza especialmente pesos grandes y suele suavizar la solución.',example:'También se relaciona con weight decay en ciertos optimizadores.'},
  dropout:{title:'Dropout',formula:'ã = m ⊙ a,  m~Bernoulli(1-p)',text:'Durante entrenamiento apaga aleatoriamente algunas activaciones para evitar dependencia excesiva entre neuronas.',example:'p=0.2 significa apagar alrededor del 20% durante entrenamiento.'},
  early:{title:'Early stopping',formula:'detener cuando val_loss no mejora durante patience épocas',text:'Evita seguir entrenando cuando validation deja de mejorar.',example:'patience=15 espera hasta 15 épocas sin mejora.'},
  clip:{title:'Gradient clipping',formula:'g ← clip(g,-c,c)',text:'Limita gradientes extremos para reducir exploding gradients.',example:'c=1 limita cada gradiente a [-1,1].'},
  lrdecay:{title:'Learning-rate decay',formula:'ηₜ = η₀/(1 + decay·t)',text:'Reduce el learning rate conforme avanza el entrenamiento.',example:'Pasos grandes al principio y más finos después.'},
  weightdecay:{title:'Weight decay',formula:'w ← (1-ηλ)w - ηg',text:'Reduce directamente los pesos además de seguir el gradiente.',example:'AdamW aplica weight decay desacoplado.'},
  learningcurve:{title:'Curva de aprendizaje',formula:'época → {train_loss, val_loss}',text:'Compara el error en train y validation a lo largo del tiempo. Es una de las mejores herramientas para detectar underfitting y overfitting.',example:'Train baja mientras Val empieza a subir → posible overfitting.'},
  lossfunctions:{title:'Funciones de error y métricas',formula:'MSE = (1/n)Σ(y-ŷ)²\nMAE = (1/n)Σ|y-ŷ|\nRMSE = √MSE\nBCE = -[y log(ŷ)+(1-y)log(1-ŷ)]',text:'La loss es lo que la red intenta minimizar. Las métricas sirven para interpretar el rendimiento. Para regresión puedes usar MSE, MAE o Huber; para clasificación binaria, BCE.',example:'Tiempo de viaje: MSE o Huber como loss; MAE, RMSE y R² para evaluar.'},
  onehot:{title:'One-Hot Encoding',formula:'categoría k → vector binario eₖ',text:'Convierte variables categóricas en columnas 0/1 para que una red tabular pueda procesarlas sin inventar un orden numérico entre categorías.',example:'camino={urbano,rural} → camino_urbano, camino_rural.'},
  multiclass:{title:'Clasificación multiclase',formula:'softmax(zᵢ)=e^{zᵢ}/Σⱼe^{zⱼ}\nCE=-Σ yᵢ log(pᵢ)',text:'Para tres o más categorías reales, la salida necesita una probabilidad por clase. Softmax hace que sumen 1 y Cross-Entropy penaliza la probabilidad asignada a la clase real. Una variable continua no debe convertirse en cientos de clases.',example:'vehículo={auto,bus,camión,moto} → 4 salidas.'},
  residuals:{title:'Residuos e importancia',formula:'eᵢ = yᵢ - ŷᵢ\nImportancia_perm ≈ error_permutado - error_base',text:'Los residuos ayudan a detectar patrones de error. La permutation importance mide cuánto empeora el modelo cuando se destruye la información de una variable. No implica causalidad.',example:'Si mezclar congestión aumenta mucho RMSE, el modelo depende bastante de esa variable.'},
  threshold:{title:'Threshold, ROC y PR',formula:'pred=1 si p≥threshold\nTPR=TP/(TP+FN)\nFPR=FP/(FP+TN)',text:'En clasificación binaria el threshold controla el equilibrio entre falsos positivos y falsos negativos. ROC y Precision-Recall muestran ese intercambio.',example:'Bajar el threshold suele subir Recall y bajar Precision.'},
  classiccurve:{title:'Curva de aprendizaje clásica',formula:'tamaño del train → error_train y error_validation',text:'A diferencia de la curva por épocas, aquí cambia la cantidad de datos. Sirve para estudiar sesgo, varianza y si recolectar más observaciones podría ayudar.',example:'Validation mejora claramente al aumentar datos → más datos probablemente ayudan.'},
  gridsearch:{title:'Grid Search',formula:'θ* = argmin_θ Error_validation(θ)',text:'Prueba combinaciones de hiperparámetros y las compara usando validation. Test debe reservarse para la evaluación final.',example:'neuronas × learning rate × activación.'},
  sequence:{title:'RNN, LSTM y GRU entrenables',formula:'RNN: hₜ=f(Wxₜ+Uhₜ₋₁+b)\nLSTM/GRU: usan compuertas para controlar memoria',text:'El módulo secuencial ajusta parámetros para predecir el siguiente valor de una serie. Está pensado para estudiar memoria temporal y comparar celdas.',example:'tráfico de t-5…t-1 → tráfico en t.'},
  optimizercompare:{title:'Comparación de optimizadores',formula:'Mismo w, mismo g, mismo η → actualizaciones diferentes',text:'Comparar optimizadores bajo las mismas condiciones permite ver cómo Momentum, AdaGrad, RMSProp, Adam y AdamW modifican el tamaño y dirección de los pasos.',example:'AdaGrad reduce progresivamente el paso; Momentum acumula dirección.'}
};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const State={
  rows:[], originalRows:[], columns:[], roles:{},
  influenceStep:0, optimizerDemo:{w:1,g:0.3,lr:0.1,v:0,s:0,m:0,t:0},
  split:{train:[],val:[],test:[]},
  networks:[], currentNetwork:0,
  animStep:0, animBusy:false, schema:null, previewGraph:null
};

function exampleRows(){
  const out=[];
  for(let i=0;i<220;i++){
    const distancia=5+(i%40)*1.2;
    const carga=300+((i*73)%900);
    const congestion=((i*17)%100)/100;
    const tiempo=8+distancia*.95+carga*.008+congestion*28+Math.sin(i*.2)*3;
    out.push({distancia:+distancia.toFixed(2),carga:+carga.toFixed(0),congestion:+congestion.toFixed(2),tiempo:+tiempo.toFixed(2)});
  }
  return out;
}

function columnProfile(name,rows){
  const vals=rows.map(r=>r[name]).filter(v=>v!==''&&v!=null),labels=vals.map(v=>String(v).trim());
  const nums=vals.map(Number).filter(Number.isFinite);const numeric=vals.length?nums.length/vals.length>=.85:false;
  const uniq=[...new Set(labels)];const uniqueCount=uniq.length,uniqueRatio=vals.length?uniqueCount/vals.length:0;
  const integerLike=numeric && nums.every(v=>Math.abs(v-Math.round(v))<1e-9);const binary=uniqueCount===2;
  return {name,vals,labels,numeric,nums,uniqueCount,uniqueRatio,integerLike,binary,nonEmpty:vals.length};
}
function detectIndustrialContext(columns,yName=''){
  const t=(columns.join(' ')+' '+(yName||'')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const tests=[
    {area:'Confiabilidad y mantenimiento',keys:/falla|failure|fault|mtbf|mttr|mantenimiento|downtime|availability|disponibilidad|confiabilidad|vibr|temperat|presion|rul|vida_util|rotura|averia|sensor|rpm|corriente|aceite|lubric/},
    {area:'Calidad de procesos',keys:/calidad|defecto|rechazo|scrap|merma|inspeccion|mancha|grieta|rebaba|proceso|humedad|tolerancia|ppm|cpk|spc|dimension|espesor|dureza/},
    {area:'Transporte y logística',keys:/ruta|distancia|viaje|tiempo|flota|camion|camion|carga|entrega|demanda|transporte|congestion|vrp|picking|warehouse|almacen|lead_time|otif/},
    {area:'Ingeniería económica / costos',keys:/costo|ingreso|beneficio|precio|flujo|demanda|van|tir|payback|rentabilidad|utilidad|capex|opex|npv|roi|margen/},
    {area:'Operaciones / productividad',keys:/produccion|produccion|capacidad|turno|operario|rendimiento|productividad|cola|inventario|stock|oee|throughput|ciclo|setup|wip|cuello/},
    {area:'Inventario y cadena de suministro',keys:/inventario|stock|sku|reorder|eoq|seguridad|lead|proveedor|demanda|rotacion|obsolescencia|cobertura/},
    {area:'Energía y utilities',keys:/energia|consumo|kw|kwh|potencia|voltaje|corriente|factor_potencia|boiler|chiller|vapor|gas/},
    {area:'RRHH y dotación',keys:/ausentismo|rotacion|turnover|dotacion|headcount|horas_extra|antiguedad|turno|persona|operario|asistencia/}
  ];
  const hit=tests.find(x=>x.keys.test(t));
  return hit?hit.area:'Analítica industrial general';
}

function dataQualityReport(rows,columns){
  if(!rows.length||!columns.length)return {score:0,issues:[],summary:'Sin datos'};
  const issues=[];
  let score=100;
  const n=rows.length;
  if(n<30){issues.push({level:'warn',msg:`Pocas filas (${n}). Modelos profundos pueden sobreajustar.`});score-=15;}
  else if(n<100){issues.push({level:'info',msg:`Dataset moderado (${n} filas). Útil para aprendizaje.`});}
  columns.forEach(c=>{
    const p=columnProfile(c,rows);
    const miss=1-(p.nonEmpty/n);
    if(miss>0.3){issues.push({level:'warn',msg:`Columna "${c}" tiene ${(miss*100).toFixed(0)}% de valores faltantes.`});score-=8;}
    else if(miss>0.05){issues.push({level:'info',msg:`"${c}" tiene algunos faltantes (${(miss*100).toFixed(1)}%).`});score-=2;}
    if(p.uniqueRatio>0.95 && p.nonEmpty>20 && !p.binary){issues.push({level:'info',msg:`"${c}" parece identificador (casi único).`});}
  });
  const yCand=columns.filter(c=>{
    const n=c.toLowerCase();
    return /target|objetivo|falla|defecto|costo|tiempo|calidad|demanda|riesgo|rul|score/.test(n);
  });
  if(!yCand.length)issues.push({level:'info',msg:'No se detectó un nombre de objetivo obvio. Revisa la sugerencia de Y.'});
  score=Math.max(0,Math.min(100,score));
  const summary=score>=85?'Dataset sólido para modelar':score>=65?'Dataset usable con precauciones':'Dataset requiere limpieza o más datos';
  return {score,issues,summary};
}
function suggestSchema(rows,columns){
  const profs=columns.map(c=>columnProfile(c,rows));
  const roles={};columns.forEach(c=>roles[c]='X');
  const scores={};
  profs.forEach((p,idx)=>{
    const n=p.name.toLowerCase();let s=0;
    const looksId=/^(id|id_|codigo|código|code|folio|serial|nro|numero|número|registro)/.test(n)||/_id$/.test(n);
    const targetish=/target|objetivo|salida|output|resultado|label|class|clase|defecto|falla|fault|failure|quality|calidad|indice|índice|score|demanda|costo|tiempo|riesgo|confiabilidad|disponibilidad|vida|mtbf|mttr/.test(n);
    if(targetish)s+=8;if(p.binary)s+=7;
    if(!p.numeric && p.uniqueCount>=3 && p.uniqueCount<=12)s+=6;
    if(p.numeric && p.uniqueCount>6)s+=3;
    if(idx===columns.length-1)s+=2;
    if(looksId)s-=90;
    if(p.uniqueRatio>.98 && p.nonEmpty>20)s-=5;
    scores[p.name]=s;
  });
  let sorted=[...columns].sort((a,b)=>scores[b]-scores[a]);
  let y=sorted[0]||columns.at(-1)||null;
  if(scores[y]===undefined || scores[y]<-20)y=columns.at(-1)||columns[0]||null;
  if(y)roles[y]='Y';
  const excluded=[];
  profs.forEach(p=>{
    const n=p.name.toLowerCase();
    const looksId=/^(id|id_|codigo|código|code|folio|serial|nro|numero|número|registro)/.test(n)||/_id$/.test(n);
    if(p.name!==y && looksId && p.uniqueRatio>.7){roles[p.name]='Excluir';excluded.push(p.name)}
  });
  const yProf=profs.find(p=>p.name===y)||{numeric:true,binary:false,uniqueCount:0,integerLike:false};
  let mode='regresión';
  if(yProf.binary)mode='clasificación binaria';
  else if(!yProf.numeric || (yProf.integerLike && yProf.uniqueCount>=3 && yProf.uniqueCount<=10))mode='multiclase';
  const xCount=columns.filter(c=>roles[c]==='X').length;
  const context=detectIndustrialContext(columns,y);
  const hidden=xCount<=3?[6,4]:xCount<=8?[Math.min(12,xCount+3),Math.max(4,Math.round(xCount*.8))]:[Math.min(16,Math.round(xCount*1.25)),Math.min(10,Math.max(4,Math.round(xCount*.7)))]
  const optimizer=/Confiabilidad|Calidad/.test(context)?'adamw':'adam';
  const loss=mode==='regresión'?'Huber o MSE':mode==='clasificación binaria'?'Binary Cross-Entropy':'Cross-Entropy + Softmax';
  const topics={
    'Confiabilidad y mantenimiento':['Estudia las variables que anticipan falla (vibración, temperatura, presión).','Compara sensibilidad entre train y validation para evitar falsas alarmas.','Si buscas mantenimiento predictivo, revisa recall y falsos negativos.'],
    'Calidad de procesos':['Relaciona parámetros de proceso con defectos o índice de calidad.','Observa residuos para detectar zonas del proceso mal modeladas.','Si hay muchas categorías de defecto, usa multiclase y matriz de confusión.'],
    'Transporte y logística':['Analiza tiempo, distancia, carga y congestión.','Usa la red como apoyo a decisiones, no como reemplazo del criterio operacional.','Compara MAE/RMSE para ver error promedio y castigo a errores grandes.'],
    'Ingeniería económica / costos':['Conecta costos, demanda, precios y utilidad esperada.','Usa la predicción como insumo para VAN, TIR o sensibilidad.','Si el error económico es sensible, prueba Huber y revisa outliers.'],
    'Operaciones / productividad':['Busca cuellos de botella y variables críticas del proceso.','Compara overfitting vs generalización antes de usar el modelo en decisiones.','Apóyate en permutation importance para priorizar variables.'],
    'Inventario y cadena de suministro':['Predice demanda o nivel de stock para evitar quiebres y exceso.','Revisa lead time y estacionalidad antes de confiar en el modelo.','Usa el error de predicción para dimensionar stock de seguridad.'],
    'Energía y utilities':['Modela consumo o potencia a partir de condiciones operativas.','Identifica outliers de consumo que puedan indicar fugas o fallas.','Compara MAE vs RMSE según el costo de errores grandes.'],
    'RRHH y dotación':['Usa solo agregados y con ética. No automatices decisiones sobre personas.','Revisa sesgos de turno, área o antigüedad.','Prioriza interpretabilidad sobre precisión pura.'],
    'Analítica industrial general':['Primero entiende Y: qué quieres predecir y qué decisión apoyarás.','Después compara optimizadores, regularización y métricas.','La red neuronal debe complementar tu criterio ingenieril.']
  };
  const quality=dataQualityReport(rows,columns);
  return {roles,y,yProf,mode,context,excluded,xCount,hidden,optimizer,loss,topics:topics[context]||topics['Analítica industrial general'],quality};
}
function applySuggestedRoles(){
  if(!State.rows.length)return;State.schema=suggestSchema(State.rows,State.columns);State.roles={...State.schema.roles};
  renderTable();applySplit();populateStats();renderCategoricalAudit();populateSequenceColumns();renderMulticlassTargetAudit();renderDatasetGuide();renderCurrentNetwork();
}
function applyRecommendedNetwork(){
  if(!State.schema)State.schema=suggestSchema(State.rows,State.columns);const n=currentNet();if(!n)return;
  n.hidden=State.schema.hidden.slice();n.hiddenActivation=State.schema.mode==='regresión'?'tanh':'relu';
  n.initMethod=n.hiddenActivation==='relu'?'he':'xavier';
  n.layerSettings=n.hidden.map(()=>({activation:n.hiddenActivation,dropout:0}));
  $('optimizer').value=State.schema.optimizer;$('lossFunction').value='auto';
  renderCurrentNetwork();activateTab('networks');
}
function renderDatasetGuide(){
  const box=$('datasetGuide');if(!box)return;
  if(!State.rows.length||!State.columns.length){box.textContent='Carga o edita un CSV para ver la recomendación.';return}
  State.schema=suggestSchema(State.rows,State.columns);
  const currentY=targetY()||'—',currentX=State.columns.filter(c=>State.roles[c]==='X').length;
  const s=State.schema;
  const q=s.quality||{score:0,summary:'—',issues:[]};
  const pills=[`Modo: ${s.mode}`,`Contexto: ${s.context}`,`Y sugerida: ${s.y||'—'}`,`X sugeridas: ${s.xCount}`,`Calidad datos: ${q.score}/100`, `Red sugerida: ${[Math.max(1,numericX().length||s.xCount||1),...s.hidden,1].join(' → ')}`];
  const issueHtml=q.issues.length?`<ul class="quality-issues">${q.issues.map(i=>`<li class="q-${i.level}">${esc(i.msg)}</li>`).join('')}</ul>`:'<p class="muted">No se detectaron problemas graves de calidad.</p>';
  box.innerHTML=`
    <article class="guide-card guide-hero">
      <h3>Identificación automática del CSV</h3>
      <p>El laboratorio interpreta tu CSV como un problema de <b>${esc(s.mode)}</b> orientado a <b>${esc(s.context)}</b>. Calidad estimada: <b>${q.score}/100</b> — ${esc(q.summary)}.</p>
      <div class="pill-row">${pills.map(p=>`<span class="pill">${esc(p)}</span>`).join('')}</div>
    </article>
    <article class="guide-card">
      <h3>Variables y objetivo</h3>
      <p><b>Y actual:</b> ${esc(currentY)} · <b>Y sugerida:</b> ${esc(s.y||'—')}<br><b>X actuales:</b> ${currentX} · <b>Excluidas sugeridas:</b> ${s.excluded.length?esc(s.excluded.join(', ')):'Ninguna'}</p>
      <ul>
        <li>Usa <b>Y</b> para la variable que deseas predecir o clasificar.</li>
        <li>Usa <b>X</b> para sensores, costos, tiempos, demanda o cualquier factor explicativo.</li>
        <li>Excluye IDs o códigos que no aportan información predictiva.</li>
      </ul>
    </article>
    <article class="guide-card">
      <h3>Calidad y alertas del dataset</h3>
      ${issueHtml}
    </article>
    <article class="guide-card">
      <h3>Arquitectura inicial sugerida</h3>
      <p><b>Capas ocultas:</b> ${s.hidden.join(' → ')} · <b>Optimizador:</b> ${s.optimizer.toUpperCase()} · <b>Loss:</b> ${esc(s.loss)}</p>
      <ul>
        <li>Arquitectura pensada para aprender sin sobrecargar el navegador.</li>
        <li>Luego compárala con otras redes desde “Redes separadas”.</li>
      </ul>
    </article>
    <article class="guide-card">
      <h3>¿Qué conviene estudiar a fondo?</h3>
      <ul>${s.topics.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
    </article>`;
}
function interpretTrainingForUser(net){
  const box=$('resultMeaningBox');if(!box)return;
  const t=net?.trained;if(!t){box.textContent='Entrena una red y aquí aparecerá una interpretación clara de resultados, riesgos y siguientes pasos.';return}
  const m=t.model,tr=t.trainHist||[],va=t.valHist||[],lastTr=tr.at(-1),lastVa=va.at(-1);
  let bullets=[];let title='Interpretación del entrenamiento';
  if(m.classification){
    const evalData=prepareRows(State.split.test.length?State.split.test:State.split.val,m.stats).data;
    const cm=classificationMetrics(m,evalData);
    bullets.push(`Accuracy ≈ ${(cm.Accuracy*100).toFixed(1)}%`);
    bullets.push(`Precision ≈ ${(cm.Precision*100).toFixed(1)}% y Recall ≈ ${(cm.Recall*100).toFixed(1)}%.`);
    bullets.push(cm.Recall<cm.Precision?'El modelo recupera menos casos positivos de los que clasifica bien: revisa recall, threshold o balance de clases.':'Recall y precision están relativamente equilibrados.');
  }else if(t.preds){
    const r=regressionMetrics(m,prepareRows(State.split.test.length?State.split.test:State.split.val,m.stats).data);
    bullets.push(`MAE ≈ ${r.MAE.toFixed(3)}; RMSE ≈ ${r.RMSE.toFixed(3)}; R² ≈ ${r.R2.toFixed(3)}.`);
    bullets.push(r.R2<.4?'Todavía explica poco la variabilidad de Y: revisa variables y outliers.':'La red ya captura una parte relevante del comportamiento de Y.');
    bullets.push('Revisa residuos y permutation importance para decidir qué variable estudiar más a fondo.');
  }
  if(Number.isFinite(lastTr)&&Number.isFinite(lastVa)){
    if(lastVa>lastTr*1.35)bullets.push('Se observa señal de overfitting: considera Dropout, L2 o Early Stopping.');
    else if(lastTr>0.8&&lastVa>0.8)bullets.push('Parece underfitting: prueba más neuronas, más épocas o variables mejores.');
    else bullets.push('La relación Train/Validation es razonable para seguir experimentando.');
  }
  const context=State.schema?.context||detectIndustrialContext(State.columns,targetY());
  bullets.push(`Como apoyo a decisión en <b>${esc(context)}</b>, úsalo para priorizar variables, comparar escenarios y abrir preguntas, no como verdad absoluta.`);
  box.innerHTML=`<b>${title}</b><ul style="margin:8px 0 0 18px">${bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`;
}

function setupInfoSystem(){
  const modal=$('infoModal');
  document.querySelectorAll('[data-info]').forEach(btn=>{
    btn.onclick=(e)=>{
      e.stopPropagation();
      const d=InfoLibrary[btn.dataset.info];
      if(!d)return;
      $('infoTitle').textContent=d.title;
      $('infoFormula').textContent=d.formula||'';
      $('infoText').textContent=d.text||'';
      $('infoExample').textContent=d.example?'Ejemplo: '+d.example:'';
      modal.classList.add('open');
    };
  });
  $('closeInfoBtn').onclick=()=>modal.classList.remove('open');
  modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
}
function init(){
  try{const s=localStorage.getItem('lab-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=s}catch(e){}
  setupNav(); setupActions(); setupInfoSystem(); loadData(exampleRows());
  newNetwork('Red 1'); renderCurrentNetwork(); renderDatasetGuide(); renderStats(); drawLoss([],[]); drawLearningCurve([],[]); drawGan([],[]); renderMemoryTheory(); renderOptimizerFormula(); activateTab('networks');
}


function activateTab(tab){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('active'));
  const page=$('tab-'+tab);if(page)page.classList.add('active');
  if(tab==='networks')setTimeout(renderCurrentNetwork,30);
  if(tab==='stats')renderStats();
  if(tab==='advanced')renderComparison();
  if(tab==='concepts'){renderInfluence();renderMemoryTheory();renderOptimizerFormula();}
  if(tab==='lab75'){renderCategoricalAudit();populateSequenceColumns();renderThresholdLab();renderMulticlassTargetAudit();}
}
function setupNav(){
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.onclick=()=>activateTab(btn.dataset.tab));
}


function setupActions(){
  $('loadExampleBtn').onclick=()=>{loadData(exampleRows());activateTab('networks')};
  $('loadCsvBtn').onclick=()=>$('csvInput').click();
  $('csvInput').onchange=e=>readCSV(e.target.files[0]);
  $('addRowBtn').onclick=addRow; $('addColBtn').onclick=addColumn;
  $('applySplitBtn').onclick=applySplit; $('applyCleaningBtn').onclick=applyCleaning;
  if($('applySuggestedRolesBtn'))$('applySuggestedRolesBtn').onclick=applySuggestedRoles;
  if($('applyRecommendedNetBtn'))$('applyRecommendedNetBtn').onclick=applyRecommendedNetwork;
  $('newNetworkBtn').onclick=()=>newNetwork('Red '+(State.networks.length+1));
  $('renameNetworkBtn').onclick=renameCurrentNetwork; $('addLayerBtn').onclick=addLayer;
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
  ['hiddenActivation','outputActivation','initMethod'].forEach(id=>$(id).onchange=saveCurrentConfig);
  $('hiddenActivation').onchange=()=>{saveCurrentConfig();const n=currentNet();n.layerSettings=n.hidden.map((_,i)=>({dropout:0,...(n.layerSettings?.[i]||{}),activation:n.hiddenActivation}));renderCurrentNetwork()};
  $('trainBtn').onclick=trainCurrentNetwork;$('saveModelBtn').onclick=exportModel;$('loadModelBtn').onclick=()=>$('modelInput').click();$('modelInput').onchange=e=>importModel(e.target.files[0]);$('themeBtn').onclick=toggleTheme;$('stopBtn').onclick=()=>{State.stop=true}; $('stepBtn').onclick=animationStep; $('playBtn').onclick=playAnimation;
  $('statsSelect').onchange=renderStats; $('corrX').onchange=renderCorrelation; $('corrY').onchange=renderCorrelation;
  $('augmentBtn').onclick=augmentData; $('ganTrainBtn').onclick=trainToyGan;
  if($('influencePrevBtn'))$('influencePrevBtn').onclick=()=>stepInfluence(-1);
  if($('influenceNextBtn'))$('influenceNextBtn').onclick=()=>stepInfluence(1);
  if($('runMemoryBtn'))$('runMemoryBtn').onclick=runMemoryDemo;
  if($('memoryType'))$('memoryType').onchange=renderMemoryTheory;
  if($('optimizerStepBtn'))$('optimizerStepBtn').onclick=optimizerDemoStep;
  if($('optimizerDemoSelect'))$('optimizerDemoSelect').onchange=()=>{State.optimizerDemo={w:1,g:.3,lr:.1,v:0,s:0,m:0,t:0};$('optWeight').textContent='1.0000';$('optNewWeight').textContent='—';renderOptimizerFormula()};
  if($('runOptimizerComparisonBtn'))$('runOptimizerComparisonBtn').onclick=runOptimizerComparison;
  if($('lossFunction'))$('lossFunction').onchange=()=>{const y=targetY();if(y){const vals=State.rows.map(r=>Number(r[y])).filter(Number.isFinite);updateLossUI(new Set(vals).size<=2)}};
  window.addEventListener('resize',()=>setTimeout(renderCurrentNetwork,20));
  if($('applyOneHotBtn'))$('applyOneHotBtn').onclick=applyOneHotEncoding;
  if($('trainMulticlassBtn'))$('trainMulticlassBtn').onclick=trainMulticlassLab;
  if($('analyzeModelBtn'))$('analyzeModelBtn').onclick=analyzeCurrentModel;
  if($('thresholdSlider'))$('thresholdSlider').oninput=renderThresholdLab;
  if($('runClassicCurveBtn'))$('runClassicCurveBtn').onclick=runClassicLearningCurve;
  if($('runGridSearchBtn'))$('runGridSearchBtn').onclick=runGridSearch;
  if($('trainSequenceBtn'))$('trainSequenceBtn').onclick=trainSequenceLab;
  document.querySelectorAll('[data-study-level]').forEach(b=>b.onclick=()=>setStudyLevel(b.dataset.studyLevel));

}


function loadData(rows){
  State.rows=JSON.parse(JSON.stringify(rows)); State.originalRows=JSON.parse(JSON.stringify(rows));
  State.columns=Object.keys(rows[0]||{}); State.roles={};
  State.schema=suggestSchema(State.rows,State.columns);
  State.roles={...State.schema.roles};
  renderTable(); populateStats(); populateGan(); applySplit(); renderCategoricalAudit(); populateSequenceColumns(); renderMulticlassTargetAudit(); renderDatasetGuide();
  const y=targetY();if(y){const vals=State.rows.map(r=>Number(r[y])).filter(Number.isFinite);updateLossUI(new Set(vals).size<=2);} renderCurrentNetwork();
}

function renderTable(){
  const t=$('dataTable');t.innerHTML='';if(!State.columns.length)return;
  const th=document.createElement('thead'),tr=document.createElement('tr');tr.innerHTML='<th>#</th>';
  State.columns.forEach(c=>{
    const x=document.createElement('th');
    x.innerHTML=`${esc(c)}<br><select data-role="${esc(c)}"><option ${State.roles[c]==='X'?'selected':''}>X</option><option ${State.roles[c]==='Y'?'selected':''}>Y</option><option ${State.roles[c]==='Excluir'?'selected':''}>Excluir</option></select>`;
    tr.appendChild(x);
  });tr.innerHTML+='<th></th>';th.appendChild(tr);t.appendChild(th);
  const tb=document.createElement('tbody');
  State.rows.slice(0,500).forEach((r,ri)=>{
    const row=document.createElement('tr');row.innerHTML=`<td>${ri+1}${r.__syn?'*':''}</td>`;
    State.columns.forEach(c=>{const td=document.createElement('td');td.innerHTML=`<input data-r="${ri}" data-c="${esc(c)}" value="${esc(r[c])}">`;row.appendChild(td)});
    row.innerHTML+=`<td><button data-del="${ri}">×</button></td>`;tb.appendChild(row);
  });if(State.rows.length>500){const nr=document.createElement('tr');nr.innerHTML=`<td colspan="${State.columns.length+2}">… ${State.rows.length-500} filas más (no se muestran). * = sintética</td>`;tb.appendChild(nr)}t.appendChild(tb);
  document.querySelectorAll('[data-r]').forEach(i=>i.onchange=()=>{const n=Number(i.value);State.rows[+i.dataset.r][i.dataset.c]=Number.isFinite(n)&&i.value.trim()!==''?n:i.value;populateStats();populateGan();renderDatasetGuide()});
  document.querySelectorAll('[data-role]').forEach(s=>s.onchange=()=>{if(s.value==='Y')Object.keys(State.roles).forEach(k=>{if(State.roles[k]==='Y')State.roles[k]='X'});State.roles[s.dataset.role]=s.value;renderTable();renderCurrentNetwork();populateStats();renderMulticlassTargetAudit();renderDatasetGuide();applySplit()});
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{State.rows.splice(+b.dataset.del,1);renderTable();applySplit();renderDatasetGuide();populateStats();});
}

function addRow(){const o={};State.columns.forEach(c=>o[c]=0);State.rows.push(o);renderTable();applySplit();renderDatasetGuide();populateStats()}
function addColumn(){const n=prompt('Nombre de la columna:');if(!n||State.columns.includes(n))return;State.columns.push(n);State.roles[n]='X';State.rows.forEach(r=>r[n]=0);renderTable();populateStats();renderDatasetGuide();renderCurrentNetwork()}

function shuf(a,rng=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function trainRand(){return State.trainRng?State.trainRng():Math.random()}
function seeded(seed){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296}}
function applySplit(){
  let tr=+$('trainPct').value,va=+$('valPct').value,te;
  if(tr+va>=100){va=Math.max(0,99-tr);$('valPct').value=va}
  te=100-tr-va;$('testPct').value=te;

  const seed=+$('splitSeed').value||42,rng=seeded(seed),y=targetY();
  let train=[],val=[],test=[];

  // Para clasificación/categorías, repartimos cada clase por separado.
  // Esto reduce el riesgo de dejar una clase fuera de Train/Validation/Test.
  let stratify=false, groups=null;
  if(y){
    const vals=State.rows.map(r=>r[y]).filter(v=>v!==''&&v!=null);
    const unique=[...new Set(vals.map(v=>String(v)))];
    const nonNumeric=vals.some(v=>!Number.isFinite(Number(v)));
    stratify=nonNumeric || (unique.length>=2 && unique.length<=20);
    if(stratify){
      groups={};
      State.rows.forEach((r,i)=>{
        const k=String(r[y]);
        (groups[k]||(groups[k]=[])).push(i);
      });
    }
  }

  if(stratify && groups){
    Object.values(groups).forEach(g=>{
      g=shuf(g,rng);
      let ntr=Math.floor(g.length*tr/100),nva=Math.floor(g.length*va/100);
      // Siempre que sea posible, deja al menos una muestra de la clase en Train.
      if(g.length && ntr===0)ntr=1;
      if(ntr+nva>g.length)nva=Math.max(0,g.length-ntr);
      train.push(...g.slice(0,ntr));
      val.push(...g.slice(ntr,ntr+nva));
      test.push(...g.slice(ntr+nva));
    });
    train=shuf(train,rng);val=shuf(val,rng);test=shuf(test,rng);
  }else{
    const idx=shuf([...State.rows.keys()],rng);
    const ntr=Math.floor(idx.length*tr/100),nva=Math.floor(idx.length*va/100);
    train=idx.slice(0,ntr);val=idx.slice(ntr,ntr+nva);test=idx.slice(ntr+nva);
  }

  State.split.train=train;State.split.val=val;State.split.test=test;
  $('trainCount').textContent=train.length;
  $('valCount').textContent=val.length;
  $('testCount').textContent=test.length;
  $('totalCount').textContent=State.rows.length;
}
function mode(a){const m={};a.filter(v=>v!==''&&v!=null).forEach(v=>m[v]=(m[v]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]}
function applyCleaning(){
  let logs=[];

  // Duplicados pueden eliminarse antes del split porque no requieren estimar parámetros.
  if($('cleanDuplicates').checked){
    const s=new Set(),before=State.rows.length;
    State.rows=State.rows.filter(r=>{
      const k=JSON.stringify(r);
      if(s.has(k))return false;
      s.add(k);return true
    });
    logs.push(`Duplicados eliminados: ${before-State.rows.length}`);
  }

  // Rehacemos split después de cualquier cambio de filas.
  applySplit();

  const y=targetY();
  const xcols=State.columns.filter(c=>State.roles[c]==='X');
  const trainRows=State.split.train.map(i=>State.rows[i]).filter(Boolean);

  if($('cleanMissing').checked){
    xcols.forEach(c=>{
      const missing=State.rows.filter(r=>r[c]===''||r[c]==null).length;
      if(!missing)return;

      const trainVals=trainRows.map(r=>r[c]).filter(v=>v!==''&&v!=null);
      const nums=trainVals.map(Number).filter(Number.isFinite);
      const numeric=trainVals.length>0 && nums.length/trainVals.length>=.7;

      if(numeric){
        const md=median(nums);
        State.rows.forEach(r=>{if(r[c]===''||r[c]==null)r[c]=md});
        logs.push(`${c}: ${missing} faltantes → mediana de Train (${Number(md).toFixed(4)})`);
      }else{
        const mo=mode(trainVals);
        State.rows.forEach(r=>{if(r[c]===''||r[c]==null)r[c]=mo});
        logs.push(`${c}: ${missing} faltantes → moda de Train (${mo})`);
      }
    });
  }

  if($('cleanOutliers').checked){
    const bad=new Set();
    const numericXCols=xcols.filter(c=>{
      const vals=trainRows.map(r=>Number(r[c])).filter(Number.isFinite);
      return vals.length>=4;
    });

    numericXCols.forEach(c=>{
      const a=trainRows.map(r=>Number(r[c])).filter(Number.isFinite);
      if(a.length<4)return;
      const q1=quantile(a,.25),q3=quantile(a,.75),iqr=q3-q1;
      const lo=q1-1.5*iqr,hi=q3+1.5*iqr;
      State.rows.forEach((r,i)=>{
        const v=Number(r[c]);
        if(Number.isFinite(v)&&(v<lo||v>hi))bad.add(i)
      });
    });

    if(bad.size){
      State.rows=State.rows.filter((_,i)=>!bad.has(i));
      logs.push(`Outliers X eliminados usando límites IQR aprendidos desde Train: ${bad.size}`);
    }else logs.push('Outliers X eliminados: 0');
  }

  // Y nunca se imputa ni se usa para decidir outliers.
  if(y)logs.push(`Y protegida: ${y} no fue imputada ni filtrada por IQR.`);

  renderTable();
  applySplit();
  populateStats();
  populateGan();
  renderCategoricalAudit();
  populateSequenceColumns();

  $('cleanLog').textContent=logs.join('\n')||'Sin cambios.';
  if($('preprocessAudit'))$('preprocessAudit').textContent='Preprocesamiento ajustado desde Train. La variable Y se conserva intacta para evitar contaminación del objetivo.';
}

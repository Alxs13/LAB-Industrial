function newNetwork(name){
  State.networks.push({name,hidden:[6,4],hiddenActivation:'tanh',outputActivation:'auto',initMethod:'xavier',layerSettings:[{activation:'tanh',dropout:0},{activation:'tanh',dropout:0}],trained:null});
  State.currentNetwork=State.networks.length-1;renderNetworkTabs();renderCurrentNetwork()
}
function currentNet(){return State.networks[State.currentNetwork]}
function renderNetworkTabs(){const b=$('networkTabs');b.innerHTML='';State.networks.forEach((n,i)=>{const x=document.createElement('button');x.className='network-tab'+(i===State.currentNetwork?' active':'');x.textContent=n.name;x.onclick=()=>{saveCurrentConfig();State.currentNetwork=i;renderNetworkTabs();renderCurrentNetwork()};b.appendChild(x)})}
function renameCurrentNetwork(){const n=prompt('Nombre:',currentNet().name);if(n){currentNet().name=n;renderNetworkTabs();renderCurrentNetwork()}}
function saveCurrentConfig(){const n=currentNet();if(!n)return;n.hiddenActivation=$('hiddenActivation').value;n.outputActivation=$('outputActivation').value;n.initMethod=$('initMethod').value}
function addLayer(){const n=currentNet();n.hidden.push(4);n.layerSettings=n.layerSettings||[];n.layerSettings.push({activation:n.hiddenActivation||'tanh',dropout:0});renderCurrentNetwork()}
function applyPreset(p){
  const n=currentNet();
  if(p==='linear')n.hidden=[];if(p==='funnel')n.hidden=[16,8,4];if(p==='bottleneck')n.hidden=[12,3,12];
  if(p==='simple')n.hidden=[3];if(p==='medium')n.hidden=[8,4];if(p==='deep')n.hidden=[8,6,4];if(p==='wide')n.hidden=[16,12];
  n.layerSettings=n.hidden.map(()=>({activation:n.hiddenActivation||'tanh',dropout:0}));
  renderCurrentNetwork()
}

function renderCurrentNetwork(){
  const n=currentNet();if(!n)return;
  $('currentNetworkName').textContent=n.name;$('hiddenActivation').value=n.hiddenActivation;$('outputActivation').value=n.outputActivation;$('initMethod').value=n.initMethod;
  const le=$('layerEditor');le.innerHTML='';
  n.layerSettings=n.layerSettings||n.hidden.map(()=>({activation:n.hiddenActivation||'tanh',dropout:0}));
  while(n.layerSettings.length<n.hidden.length)n.layerSettings.push({activation:n.hiddenActivation||'tanh',dropout:0});
  n.layerSettings=n.layerSettings.slice(0,n.hidden.length);
  n.hidden.forEach((v,i)=>{const s=n.layerSettings[i],d=document.createElement('div');d.className='layer-row';d.innerHTML=`<strong>H${i+1}</strong><div><input data-layer="${i}" type="range" min="1" max="24" value="${v}"><span>${v} neuronas</span><div class="layer-advanced"><select data-layer-act="${i}"><option value="relu" ${s.activation==='relu'?'selected':''}>ReLU</option><option value="tanh" ${s.activation==='tanh'?'selected':''}>tanh</option><option value="leaky" ${s.activation==='leaky'?'selected':''}>Leaky ReLU</option><option value="elu" ${s.activation==='elu'?'selected':''}>ELU</option><option value="sigmoid" ${s.activation==='sigmoid'?'selected':''}>Sigmoid</option></select><input data-layer-drop="${i}" type="number" min="0" max=".8" step=".05" value="${s.dropout||0}" title="Dropout de esta capa"></div></div><button data-remove="${i}">×</button>`;le.appendChild(d)});
  document.querySelectorAll('[data-layer]').forEach(s=>s.oninput=()=>{n.hidden[+s.dataset.layer]=+s.value;renderCurrentNetwork()});
  document.querySelectorAll('[data-layer-act]').forEach(s=>s.onchange=()=>{n.layerSettings[+s.dataset.layerAct].activation=s.value;renderNetworkVisual()});
  document.querySelectorAll('[data-layer-drop]').forEach(s=>s.onchange=()=>{n.layerSettings[+s.dataset.layerDrop].dropout=Math.max(0,Math.min(.8,+s.value||0))});
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(n.hidden.length>0){const i=+b.dataset.remove;n.hidden.splice(i,1);if(n.layerSettings)n.layerSettings.splice(i,1);renderCurrentNetwork()}});
  renderNetworkVisual();renderPredictor()
}
function numericX(){return State.columns.filter(c=>State.roles[c]==='X'&&State.rows.some(r=>Number.isFinite(Number(r[c]))))}
function targetY(){return State.columns.find(c=>State.roles[c]==='Y')}

function renderNetworkVisual(){
  const n=currentNet();if(!n)return;
  const inputs=Math.max(1,numericX().length||State.schema?.xCount||1),sizes=[inputs,...n.hidden,1],svg=$('networkSvg'),box=$('networkLayers');
  if(box)box.innerHTML='';svg.innerHTML='';
  $('architectureTitle').textContent=sizes.join(' → ');$('hiddenCount').textContent=n.hidden.length;$('neuronCount').textContent=n.hidden.reduce((a,b)=>a+b,0);$('activationName').textContent=n.hiddenActivation;
  let params=0;for(let i=0;i<sizes.length-1;i++)params+=sizes[i]*sizes[i+1]+sizes[i+1];$('paramCount').textContent=params;
  const W=1000,H=560,mx=90,my=70;
  const layerX=i=>mx+i*((W-2*mx)/Math.max(1,sizes.length-1));
  const visibleCounts=sizes.map(s=>Math.min(s,8));
  const layerYs=visibleCounts.map(c=>Array.from({length:c},(_,j)=>my+j*((H-2*my)/Math.max(1,(c-1)||1))));
  const nodeGroups=[];const edgeGroups=[];
  const mk=(tag,attrs,parent=svg)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs||{}))e.setAttribute(k,v);parent.appendChild(e);return e};
  sizes.forEach((s,li)=>{
    const x=layerX(li); const g=mk('g',{'data-layer':li});
    mk('text',{x,y:32,'text-anchor':'middle',class:'svg-layer-label'},g).textContent=li===0?'Entrada':li===sizes.length-1?'Salida':'H'+li;
    nodeGroups[li]=[];
    layerYs[li].forEach((y,j)=>{
      const grp=mk('g',{class:`svg-node ${li===0?'input':li===sizes.length-1?'output':'hidden'}`,'data-layer':li,'data-node':j},g);
      mk('circle',{cx:x,cy:y,r:27},grp);
      const label=li===0?'X'+(j+1):li===sizes.length-1?'Y':'N'+(j+1);
      mk('text',{x,y:y+4,'text-anchor':'middle'},grp).textContent=label;
      nodeGroups[li].push(grp);
    });
    if(s>visibleCounts[li])mk('text',{x,y:H-24,'text-anchor':'middle',class:'network-caption'},g).textContent=`${s-visibleCounts[li]} neuronas más…`;
  });
  for(let li=0;li<sizes.length-1;li++){
    edgeGroups[li]=[];
    nodeGroups[li].forEach((a)=>{
      const ca=a.querySelector('circle'); const x1=+ca.getAttribute('cx'),y1=+ca.getAttribute('cy');
      nodeGroups[li+1].forEach((b)=>{
        const cb=b.querySelector('circle'); const x2=+cb.getAttribute('cx'),y2=+cb.getAttribute('cy');
        const line=mk('line',{x1:x1+27,y1,x2:x2-27,y2,class:'edge','data-edge-layer':li});
        svg.insertBefore(line,svg.firstChild);edgeGroups[li].push(line);
      })
    })
  }
  mk('text',{x:18,y:H-16,class:'network-caption'},svg).textContent='Forward: X → H → Y | Backprop: Y → H → X';
  State.previewGraph={nodes:nodeGroups,edges:edgeGroups};
  setNetworkMotion('Vista conceptual: la señal avanza desde <strong>X</strong> hacia <strong>Y</strong> y luego vuelve como gradiente durante el aprendizaje.');
}
function setNetworkMotion(html){if($('networkMotionStatus'))$('networkMotionStatus').innerHTML=html}
function clearPreviewActive(){
  if(!State.previewGraph)return;
  State.previewGraph.nodes.flat().forEach(g=>g.classList.remove('active'));
  State.previewGraph.edges.flat().forEach(g=>g.classList.remove('active','back'));
}
async function animateNetworkPass(){
  const g=State.previewGraph;if(!g)return; clearPreviewActive();
  setNetworkMotion('<strong>Forward:</strong> la fila entra por X, se transforma en cada capa y llega a Y. Luego la pérdida devuelve información para corregir pesos.');
  for(let l=0;l<g.nodes.length;l++){
    if(l>0)g.edges[l-1].forEach(e=>e.classList.add('active'));
    g.nodes[l].forEach(n=>n.classList.add('active'));
    await new Promise(r=>setTimeout(r,220));
  }
  for(let l=g.nodes.length-2;l>=0;l--){
    g.edges[l].forEach(e=>{e.classList.remove('active');e.classList.add('back')});
    g.nodes[l].forEach(n=>n.classList.add('active'));
    await new Promise(r=>setTimeout(r,180));
  }
  await new Promise(r=>setTimeout(r,140));
  clearPreviewActive();
}
function mean(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:0} function std(a){if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1))||1}
function median(a){const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
function quantile(a,q){const b=[...a].sort((x,y)=>x-y),p=(b.length-1)*q,l=Math.floor(p),h=Math.ceil(p);return l===h?b[l]:b[l]+(b[h]-b[l])*(p-l)}
function sigmoidStable(z){z=Math.max(-60,Math.min(60,z));return 1/(1+Math.exp(-z))}
function softplusStable(z){if(z>30)return z;if(z<-30)return Math.exp(z);return Math.log1p(Math.exp(z))}
function activation(z,t){
  switch(t){
    case 'sigmoid': return sigmoidStable(z);
    case 'tanh': return Math.tanh(z);
    case 'relu': return Math.max(0,z);
    case 'leaky': return z>0?z:.01*z;
    case 'elu': return z>0?z:Math.expm1(Math.max(-60,z));
    case 'softplus': return softplusStable(z);
    case 'swish': return z*sigmoidStable(z);
    case 'gelu': {const c=Math.sqrt(2/Math.PI),u=c*(z+.044715*z*z*z);return .5*z*(1+Math.tanh(u))}
    case 'linear': return z;
    case 'softsign': return z/(1+Math.abs(z));
    case 'hard_sigmoid': return Math.max(0,Math.min(1,z/6+.5));
    case 'hard_tanh': return Math.max(-1,Math.min(1,z));
    case 'mish': return z*Math.tanh(softplusStable(z));
    default: return Math.tanh(z)
  }
}
function dactivation(a,t,z){
  const x=Number.isFinite(z)?z:a;
  switch(t){
    case 'sigmoid': return a*(1-a);
    case 'tanh': return 1-a*a;
    case 'relu': return x>0?1:0;
    case 'leaky': return x>0?1:.01;
    case 'elu': return x>0?1:Math.exp(Math.max(-60,x));
    case 'softplus': return sigmoidStable(x);
    case 'swish': {const s=sigmoidStable(x);return s+x*s*(1-s)}
    case 'gelu': {const c=Math.sqrt(2/Math.PI),u=c*(x+.044715*x*x*x),th=Math.tanh(u),du=c*(1+.134145*x*x);return .5*(1+th)+.5*x*(1-th*th)*du}
    case 'linear': return 1;
    case 'softsign': return 1/((1+Math.abs(x))**2);
    case 'hard_sigmoid': return x>-3&&x<3?1/6:0;
    case 'hard_tanh': return x>-1&&x<1?1:0;
    case 'mish': {const sp=softplusStable(x),th=Math.tanh(sp),s=sigmoidStable(x);return th+x*s*(1-th*th)}
    default: return 1-a*a
  }
}


function resolveLossFunction(classification){
  const s=$('lossFunction')?.value||'auto';
  if(s==='auto')return classification?'bce':'mse';
  if(classification&&s!=='bce')return 'bce';
  if(!classification&&s==='bce')return 'mse';
  return s;
}
function lossValue(y,p,type){
  if(type==='mae')return Math.abs(y-p);
  if(type==='huber'){const d=y-p,a=Math.abs(d),delta=1;return a<=delta?0.5*d*d:delta*(a-0.5*delta)}
  if(type==='bce'){const q=Math.min(1-1e-9,Math.max(1e-9,p));return -(y*Math.log(q)+(1-y)*Math.log(1-q))}
  return (y-p)*(y-p);
}
function outputGradient(y,p,type,classification){
  if(type==='mae')return p===y?0:(p>y?1:-1);
  if(type==='huber'){const d=p-y,a=Math.abs(d),delta=1;return a<=delta?d:delta*Math.sign(d)}
  if(type==='bce'&&classification)return p-y;
  return 2*(p-y);
}
function updateLossUI(classification){
  const loss=resolveLossFunction(classification);
  $('detectedProblem').textContent=classification?'Clasificación binaria':'Regresión';
  $('activeLoss').textContent=loss.toUpperCase();
  $('lossRecommendation').textContent=classification?'BCE + Accuracy / Precision / Recall / F1':'MSE o Huber + MAE / RMSE / R²';
}
function regressionMetrics(model,data){
  if(!data.length)return {};
  const ys=[],ps=[];
  data.forEach(o=>{
    const p=forward(model,o.x,false).y;
    ys.push(o.y*model.stats.ys+model.stats.ym);
    ps.push(p*model.stats.ys+model.stats.ym);
  });
  const mae=mean(ys.map((y,i)=>Math.abs(y-ps[i])));
  const mse=mean(ys.map((y,i)=>(y-ps[i])**2));
  const rmse=Math.sqrt(mse),ym=mean(ys);
  const ssTot=ys.reduce((s,y)=>s+(y-ym)**2,0),ssRes=ys.reduce((s,y,i)=>s+(y-ps[i])**2,0);
  return {MAE:mae,RMSE:rmse,R2:ssTot?1-ssRes/ssTot:0};
}
function classificationMetrics(model,data){
  let tp=0,tn=0,fp=0,fn=0;
  data.forEach(o=>{const p=forward(model,o.x,false).y>=0.5?1:0,y=o.y;if(p===1&&y===1)tp++;else if(p===0&&y===0)tn++;else if(p===1&&y===0)fp++;else fn++});
  const acc=(tp+tn)/Math.max(1,tp+tn+fp+fn),precision=tp/Math.max(1,tp+fp),recall=tp/Math.max(1,tp+fn),f1=(precision+recall)?2*precision*recall/(precision+recall):0;
  return {Accuracy:acc,Precision:precision,Recall:recall,F1:f1,tp,tn,fp,fn};
}
function renderEvaluationMetrics(model,data){
  const box=$('evaluationMetrics');if(!box)return;box.innerHTML='';
  const m=model.classification?classificationMetrics(model,data):regressionMetrics(model,data);
  const defs=model.classification?[['Accuracy','metricAccuracy'],['Precision','metricPrecision'],['Recall','metricRecall'],['F1','metricF1']]:[['MAE','metricMAE'],['RMSE','metricRMSE'],['R²','metricR2']];
  defs.forEach(([name,id])=>{if(!$(id)?.checked)return;const key=name==='R²'?'R2':name,val=m[key];const d=document.createElement('div');d.innerHTML=`<span>${name}</span><b>${Number.isFinite(val)?val.toFixed(4):'—'}</b>`;box.appendChild(d)});
  if(model.classification&&m.tp!==undefined){const d=document.createElement('div');d.style.gridColumn='1/-1';d.innerHTML=`<span>Matriz de confusión (filas = real, columnas = predicho)</span><table class="cm"><tr><th></th><th>Pred 0</th><th>Pred 1</th></tr><tr><th>Real 0</th><td class="ok">${m.tn}</td><td class="bad">${m.fp}</td></tr><tr><th>Real 1</th><td class="bad">${m.fn}</td><td class="ok">${m.tp}</td></tr></table>`;box.appendChild(d)}
}

function prepareRows(indices,stats=null){
  const xs=numericX(),y=targetY(),raw=indices.map(i=>State.rows[i]).filter(Boolean);
  let localStats=stats;
  if(!localStats){
    const rawTargets=raw.map(r=>r[y]).filter(v=>v!==''&&v!=null),labels=[...new Set(rawTargets.map(v=>String(v)))],classification=labels.length===2;
    const encoded=raw.map(r=>{
      const xv=xs.map(c=>Number(r[c])),rv=r[y];
      let yy;if(classification)yy=labels.indexOf(String(rv));else yy=Number(rv);
      return{x:xv,y:yy}
    }).filter(o=>o.x.every(Number.isFinite)&&Number.isFinite(o.y)&&o.y>=0);
    const xm=xs.map((_,j)=>mean(encoded.map(o=>o.x[j]))),xsdev=xs.map((_,j)=>std(encoded.map(o=>o.x[j]))),yv=encoded.map(o=>o.y),ym=classification?0:mean(yv),ys=classification?1:std(yv);
    localStats={xm,xsdev,ym,ys,classification,yhi:classification?1:(yv.length?Math.max(...yv):1),yLabels:classification?labels:null,yMap:classification?Object.fromEntries(labels.map((v,i)=>[v,i])):null};
  }
  const rows=raw.map(r=>{
    const xv=xs.map(c=>Number(r[c])),rv=r[y];let yy;
    if(localStats.classification){yy=localStats.yMap?localStats.yMap[String(rv)]:Number(rv)===localStats.yhi?1:0}else yy=Number(rv);
    return{x:xv,y:yy}
  }).filter(o=>o.x.every(Number.isFinite)&&Number.isFinite(o.y));
  return {data:rows.map(o=>({x:o.x.map((v,j)=>(v-localStats.xm[j])/localStats.xsdev[j]),y:localStats.classification?o.y:(o.y-localStats.ym)/localStats.ys})),stats:localStats,xs,y}
}
function initWeight(fanIn,fanOut,method){
  if(method==='he')return (trainRand()*2-1)*Math.sqrt(6/fanIn);
  if(method==='xavier')return (trainRand()*2-1)*Math.sqrt(6/(fanIn+fanOut));
  return trainRand()-0.5
}
function createModel(){
  const n=currentNet(),prep=prepareRows(State.split.train),sizes=[prep.xs.length,...n.hidden,1],weights=[],biases=[];
  for(let l=0;l<sizes.length-1;l++){weights.push(Array.from({length:sizes[l+1]},()=>Array.from({length:sizes[l]},()=>initWeight(sizes[l],sizes[l+1],n.initMethod))));biases.push(Array.from({length:sizes[l+1]},()=>0))}
  return {sizes,weights,biases,stats:prep.stats,xs:prep.xs,y:prep.y,classification:prep.stats.classification,hiddenActivation:n.hiddenActivation,layerSettings:(n.layerSettings||n.hidden.map(()=>({activation:n.hiddenActivation,dropout:0}))).map(x=>({...x}))}
}
function forward(m,x,training=false){
  let acts=[x],masks=[],raws=[],zs=[];
  const globalDropout=$('useDropout').checked?Math.max(0,Math.min(.9,+$('dropoutRate').value||0)):0;
  for(let l=0;l<m.sizes.length-2;l++){
    const ls=m.layerSettings?.[l]||{activation:m.hiddenActivation,dropout:globalDropout},actType=ls.activation||m.hiddenActivation,dropout=+ls.dropout>0?+ls.dropout:globalDropout;
    const zVals=m.weights[l].map((row,j)=>row.reduce((s,w,i)=>s+w*acts[l][i],m.biases[l][j]));let a=zVals.map(z=>activation(z,actType));zs.push(zVals);
    const a0=a.slice();let mask=a.map(()=>1);
    if(training&&dropout>0){mask=a.map(()=>trainRand()>dropout?1/(1-dropout):0);a=a.map((v,i)=>v*mask[i])}
    masks.push(mask);raws.push(a0);acts.push(a)
  }
  const L=m.sizes.length-2,z=m.weights[L][0].reduce((s,w,i)=>s+w*acts[L][i],m.biases[L][0]),out=m.classification?1/(1+Math.exp(-Math.max(-40,Math.min(40,z)))):z;acts.push([out]);return{acts,masks,raws,zs,y:out}
}
function lossOn(m,data,lossType){
  if(!data.length)return NaN;let s=0;data.forEach(o=>{const y=forward(m,o.x,false).y;s+=lossValue(o.y,y,lossType)});return s/data.length
}
async function trainCurrentNetwork(){
  if(State.training)return;
  applySplit();
  if(!numericX().length||!targetY()){alert('Define al menos una columna X numérica y una columna Y en Datos.');return}
  const schema=suggestSchema(State.rows,State.columns);
  if(schema.mode==='multiclase'){alert('La Y detectada tiene tres o más clases. Usa LAB 7.5 → Multiclase (Softmax + Cross-Entropy) para no tratarla incorrectamente como regresión.');activateTab('lab75');return}
  const categoricalX=State.columns.filter(c=>State.roles[c]==='X'&&!columnProfile(c,State.rows).numeric);
  if(categoricalX.length&&!State._categoricalTrainWarning){State._categoricalTrainWarning=true;notify('Hay X categóricas ('+categoricalX.slice(0,3).join(', ')+'). El motor MLP principal usa las X numéricas; aplica One-Hot en LAB 7.5 para incorporarlas.','warning')}
  if(State.split.train.length<2){alert('No hay suficientes filas de entrenamiento.');return}
  State.training=true;State.stop=false;$('trainBtn').disabled=true;$('stopBtn').disabled=false;
  try{await runTraining()}catch(e){console.error(e);$('trainLog').textContent='Error: '+e.message}
  finally{State.training=false;$('trainBtn').disabled=false;$('stopBtn').disabled=true}
}
function collectPreds(m,data){return{y:data.map(o=>o.y*m.stats.ys+m.stats.ym),p:data.map(o=>forward(m,o.x,false).y*m.stats.ys+m.stats.ym)}}
async function runTraining(){
  const trainingSeed=+$('trainingSeed')?.value||42;
  State.trainRng=seeded(trainingSeed);
  const net=currentNet(),trainPrep=prepareRows(State.split.train),m=createModel(),valPrep=prepareRows(State.split.val,m.stats),testPrep=prepareRows(State.split.test,m.stats);
  State.liveModel=m;
  State.sample=trainPrep.data[0].x;const slow=$('slowMo').checked;
  renderNetworkVisual();if(slow)await animateNetworkPass();
  const num=id=>+$(id).value,on=id=>$(id).checked;
  const epochs=Math.max(1,num('epochs')||100),baseLR=Math.max(1e-5,num('learningRate')||.03),opt=$('optimizer').value,bs=Math.max(1,num('batchSize')||16);
  const lossType=resolveLossFunction(m.classification);updateLossUI(m.classification);
  const l1=on('useL1')?num('l1Lambda'):0,l2=on('useL2')?num('l2Lambda'):0,useES=on('useEarlyStopping'),patience=Math.max(1,num('patience')||15);
  const clip=on('useGradClip')?Math.max(.01,num('gradClipValue')||1):Infinity,cl=g=>Math.max(-clip,Math.min(clip,g));
  const lrDecay=on('useLrDecay')?Math.max(0,num('lrDecay')):0,wd=on('useWeightDecay')?Math.max(0,num('weightDecay')):(opt==='adamw'?.01:0),noise=on('useNoise')?Math.max(0,num('inputNoise')):0;
  const Z=()=>m.weights.map(L=>L.map(r=>r.map(()=>0))),ZB=()=>m.biases.map(L=>L.map(()=>0));
  const st={vW:Z(),mW:Z(),sW:Z(),vB:ZB(),mB:ZB(),sB:ZB()};
  let lr=baseLR,t=0;
  const upd=(arr,i,g,v,mo,s,dec)=>{
    if(dec&&wd)arr[i]*=1-lr*wd;
    if(opt==='momentum'){v[i]=.9*v[i]-lr*g;arr[i]+=v[i]}
    else if(opt==='nesterov'){v[i]=.9*v[i]-lr*g;arr[i]+=.9*v[i]-lr*g}
    else if(opt==='adamax'){mo[i]=.9*mo[i]+.1*g;s[i]=Math.max(.999*s[i],Math.abs(g));arr[i]-=lr/(1-.9**t)*mo[i]/(s[i]+1e-8)}
    else if(opt==='adagrad'){s[i]+=g*g;arr[i]-=lr*g/(Math.sqrt(s[i])+1e-8)}
    else if(opt==='rmsprop'){s[i]=.9*s[i]+.1*g*g;arr[i]-=lr*g/(Math.sqrt(s[i])+1e-8)}
    else if(opt==='adam'||opt==='adamw'){mo[i]=.9*mo[i]+.1*g;s[i]=.999*s[i]+.001*g*g;arr[i]-=lr*(mo[i]/(1-.9**t))/(Math.sqrt(s[i]/(1-.999**t))+1e-8)}
    else arr[i]-=lr*g;
  };
  const L=m.sizes.length-2,tr=[],va=[];let best=Infinity,bestEp=0,bw=null,bb=null,note='',done=0,diverged=false,last=performance.now();
  const ui=()=>{$('trainLoss').textContent=tr.at(-1).toFixed(6);$('valLoss').textContent=va.at(-1).toFixed(6);$('epochValue').textContent=done;$('progressBar').style.width=(done/epochs*100)+'%';drawLoss(tr,va);drawLearningCurve(tr,va);liveViz(m,valPrep.data);setNetworkMotion(`<strong>Época ${done}/${epochs}</strong> · la red ajusta pesos con ${opt.toUpperCase()} para reducir ${lossType.toUpperCase()}.`)};
  if($('engine').value==='python'){const r=await pyTrain(m,trainPrep,valPrep,lossType);if(!r)return;tr.push(...r.tr);va.push(...r.va);done=r.tr.length;best=r.best;bestEp=r.bestEp;note=r.note}
  else for(let ep=0;ep<epochs;ep++){
    if(State.stop){note='Detenido manualmente.';break}
    lr=baseLR/(1+lrDecay*ep);
    const data=trainPrep.data.slice();
    for(let i=data.length-1;i>0;i--){const j=Math.floor(trainRand()*(i+1));[data[i],data[j]]=[data[j],data[i]]}
    for(let s=0;s<data.length;s+=bs){
      const batch=data.slice(s,s+bs),gW=Z(),gB=ZB();
      for(const o of batch){
        const x=noise?o.x.map(v=>v+(trainRand()*2-1)*noise):o.x,f=forward(m,x,true),d=new Array(L+1);
        d[L]=[m.classification?f.y-o.y:outputGradient(o.y,f.y,lossType,false)];
        for(let l=L-1;l>=0;l--)d[l]=f.raws[l].map((a,j)=>{let q=0;for(let k=0;k<m.weights[l+1].length;k++)q+=m.weights[l+1][k][j]*d[l+1][k];return q*dactivation(a,m.layerSettings?.[l]?.activation||m.hiddenActivation,f.zs?.[l]?.[j])*f.masks[l][j]});
        for(let l=0;l<=L;l++){const prev=f.acts[l];for(let j=0;j<d[l].length;j++){gB[l][j]+=d[l][j];for(let i=0;i<prev.length;i++)gW[l][j][i]+=d[l][j]*prev[i]}}
      }
      t++;const n=batch.length;
      for(let l=0;l<=L;l++)for(let j=0;j<m.weights[l].length;j++){
        for(let i=0;i<m.weights[l][j].length;i++){const w=m.weights[l][j][i];let g=cl(gW[l][j][i]/n);if(l1)g+=l1*Math.sign(w);if(l2)g+=2*l2*w;upd(m.weights[l][j],i,g,st.vW[l][j],st.mW[l][j],st.sW[l][j],true)}
        upd(m.biases[l],j,cl(gB[l][j]/n),st.vB[l],st.mB[l],st.sB[l],false)
      }
    }
    const trl=lossOn(m,trainPrep.data,lossType),vl=valPrep.data.length?lossOn(m,valPrep.data,lossType):trl;
    tr.push(trl);va.push(vl);done=ep+1;
    if(!Number.isFinite(trl)){diverged=true;note='El entrenamiento divergió (loss no finita). Baja el learning rate, activa gradient clipping o usa inicialización He/Xavier.';break}
    if(vl<best-1e-9){best=vl;bestEp=ep;bw=JSON.parse(JSON.stringify(m.weights));bb=JSON.parse(JSON.stringify(m.biases))}
    if(useES&&ep-bestEp>=patience){note=`Early stopping en la época ${ep+1}.`;break}
    if(slow||performance.now()-last>40){ui();if(slow && (ep===0 || (ep+1)%Math.max(1,Math.round(epochs/6))===0))await animateNetworkPass();last=performance.now();await new Promise(r=>setTimeout(r,slow?70:0))}
  }
  if(bw&&(useES||diverged)){m.weights=bw;m.biases=bb}
  if(tr.length)ui();
  const testLoss=testPrep.data.length?lossOn(m,testPrep.data,lossType):NaN,evalData=testPrep.data.length?testPrep.data:valPrep.data;
  $('testMetric').textContent=Number.isFinite(testLoss)?testLoss.toFixed(6):'—';renderEvaluationMetrics(m,evalData);
  net.trained={model:m,trainHist:tr,valHist:va,testLoss,preds:m.classification||!evalData.length?null:collectPreds(m,evalData),settings:{trainingSeed:+$('trainingSeed')?.value||42,lr:baseLR,opt,lossType,batch:bs,l1,l2,dropout:on('useDropout')?num('dropoutRate'):0,earlyStopping:useES,gradClip:Number.isFinite(clip)?clip:0,lrDecay,weightDecay:wd,noiseRate:noise}};
  $('trainLog').textContent=`${note||'Entrenamiento completado.'}\nÉpocas: ${done}/${epochs} · batch ${bs} · loss ${lossType.toUpperCase()}\nMejor val_loss: ${Number.isFinite(best)?best.toFixed(6):'—'} (época ${bestEp+1})`;
  diagnoseGeneralization(tr,va);renderComparison();if(net===currentNet())renderPredictor();
  if(typeof interpretTrainingForUser==='function')interpretTrainingForUser(net);
  if(typeof updateDecisionPanel==='function')updateDecisionPanel();
  if(typeof updateResultBacks==='function')updateResultBacks();
  if(typeof markFlowState==='function')markFlowState();
  if(typeof renderNetworkVisual==='function')renderNetworkVisual();
}
async function pyTrain(m,trainPrep,valPrep,lossType){
  const num=id=>+$(id).value,on=id=>$(id).checked,n=currentNet(),opt=$('optimizer').value;
  const cfg={seed:+$('trainingSeed')?.value||42,xtr:trainPrep.data.map(o=>o.x),ytr:trainPrep.data.map(o=>o.y),xva:valPrep.data.map(o=>o.x),yva:valPrep.data.map(o=>o.y),sizes:m.sizes,init:n.initMethod,act:n.hiddenActivation,acts:m.layerSettings.map(s=>s.activation),drops:m.layerSettings.map(s=>s.dropout>0?+s.dropout:(on('useDropout')?num('dropoutRate'):0)),cls:m.classification,loss:lossType,opt,lr:num('learningRate')||.03,bs:num('batchSize')||16,epochs:num('epochs')||100,l1:on('useL1')?num('l1Lambda'):0,l2:on('useL2')?num('l2Lambda'):0,wd:on('useWeightDecay')?num('weightDecay'):(opt==='adamw'?.01:0),decay:on('useLrDecay')?num('lrDecay'):0,clip:on('useGradClip')?num('gradClipValue'):0,es:on('useEarlyStopping')?num('patience'):0,dropout:on('useDropout')?num('dropoutRate'):0,noise:on('useNoise')?num('inputNoise'):0};
  $('trainLog').textContent='Entrenando en Python…';
  let r;try{r=await(await fetch('/train',{method:'POST',body:JSON.stringify(cfg)})).json()}catch(e){$('trainLog').textContent='No se pudo conectar con Python. Ejecuta "python server.py" y abre http://localhost:8000 (no el archivo directo).';return null}
  if(r.error){$('trainLog').textContent='Error en Python: '+r.error;return null}
  for(const s of r.snaps){if(State.stop)break;m.weights=s.W;m.biases=s.B;$('trainLoss').textContent=(+r.tr[s.ep-1]).toFixed(6);$('valLoss').textContent=(+r.va[s.ep-1]).toFixed(6);$('epochValue').textContent=s.ep;$('progressBar').style.width=(s.ep/cfg.epochs*100)+'%';drawLoss(r.tr.slice(0,s.ep),r.va.slice(0,s.ep));liveViz(m,valPrep.data);await new Promise(z=>setTimeout(z,$('slowMo').checked?120:35))}
  m.weights=r.W;m.biases=r.B;return r
}
function drawNeuron(m){
  const cv=$('neuronCanvas');if(!cv||!m)return;const c=clear(cv),w=cv.width,h=cv.height,S=m.sizes,show=S.map(s=>Math.min(s,10));
  const X=l=>70+l*(w-140)/Math.max(1,S.length-1),Y=(l,j)=>h/2+(j-(show[l]-1)/2)*Math.min(40,(h-70)/Math.max(1,show[l]));
  let acts=null;try{if(State.sample&&State.sample.length===S[0])acts=forward(m,State.sample,false).acts}catch(e){}
  for(let l=0;l<S.length-1;l++)for(let j=0;j<show[l+1];j++)for(let i=0;i<show[l];i++){const wt=m.weights[l][j][i];c.strokeStyle=(wt>0?'rgba(89,99,110,':'rgba(68,76,85,')+Math.min(.9,.12+Math.abs(wt)*.5)+')';c.lineWidth=Math.min(5,.4+Math.abs(wt)*1.6);c.beginPath();c.moveTo(X(l),Y(l,i));c.lineTo(X(l+1),Y(l+1,j));c.stroke()}
  for(let l=0;l<S.length;l++)for(let j=0;j<show[l];j++){const v=acts?Math.abs(acts[l][j]):0;c.beginPath();c.arc(X(l),Y(l,j),14,0,7);c.fillStyle=`rgba(155,163,171,${Math.min(1,.1+v)})`;c.fill();c.strokeStyle=l===S.length-1?'#9ba3ab':l?'#59636e':'#8fa4b1';c.lineWidth=3;c.stroke()}
  c.font='22px system-ui,sans-serif';c.fillStyle='#6f7d86';c.textAlign='left';c.fillText('azul = peso +   rojo = peso −   grosor = magnitud   naranja = activación',14,h-10)
}
function liveViz(m,val){drawNeuron(m);const cv=$('predChart');if(!m.classification&&val.length){const q=collectPreds(m,val);cv.style.display='';drawParity(cv,q.y,q.p)}}
function exportModel(){const n=currentNet();if(!n.trained){alert('Entrena esta red primero.');return}const t=n.trained,a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({name:n.name,hidden:n.hidden,hiddenActivation:n.hiddenActivation,layerSettings:n.layerSettings,initMethod:n.initMethod,model:t.model,trainHist:t.trainHist,valHist:t.valHist,testLoss:t.testLoss,preds:t.preds,settings:t.settings})],{type:'application/json'}));a.download=n.name.replace(/\W+/g,'_')+'.json';a.click()}
function importModel(file){if(!file)return;const fr=new FileReader();fr.onload=()=>{try{const d=JSON.parse(fr.result);newNetwork(d.name+' (cargada)');Object.assign(currentNet(),{hidden:d.hidden,hiddenActivation:d.hiddenActivation,layerSettings:d.layerSettings||d.hidden.map(()=>({activation:d.hiddenActivation||'tanh',dropout:0})),initMethod:d.initMethod,trained:{model:d.model,trainHist:d.trainHist,valHist:d.valHist,testLoss:d.testLoss,preds:d.preds,settings:d.settings}});renderNetworkTabs();renderCurrentNetwork();renderComparison();drawLoss(d.trainHist,d.valHist);drawLearningCurve(d.trainHist,d.valHist);drawNeuron(d.model)}catch(e){alert('Archivo de modelo inválido')}$('modelInput').value=''};fr.readAsText(file)}
function toggleTheme(){const d=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=d;try{localStorage.setItem('lab-theme',d)}catch(e){}}
function setDiag(box,msg){box.textContent=msg;box.className='diagnosis-box '+(/^Posible over/.test(msg)?'bad':/^Posible under/.test(msg)?'warn':/^Train y/.test(msg)?'ok':'')}
function diagnoseGeneralization(tr,va){if(tr.length)setDiag($('generalizationDiagnosis'),interpretLearningCurve(tr,va))}
function renderPredictor(){
  const box=$('predictorBox'),cv=$('predChart');if(!box)return;
  const t=currentNet()?.trained;
  if(!t){box.innerHTML='<p class="note">Entrena esta red para probar predicciones con valores nuevos.</p>';cv.style.display='none';return}
  const m=t.model;
  box.innerHTML='<div class="predictor-grid">'+m.xs.map((c,j)=>`<label>${esc(c)}<input type="number" step="any" data-pred="${j}" value="${+m.stats.xm[j].toFixed(3)}"></label>`).join('')+'</div><button id="predictBtn" class="primary" style="margin-top:10px">Predecir</button><div id="predictResult" class="predict-result">—</div>';
  $('predictBtn').onclick=()=>{
    const x=[...box.querySelectorAll('[data-pred]')].map((i,j)=>((+i.value)-m.stats.xm[j])/m.stats.xsdev[j]),p=forward(m,x,false).y;
    $('predictResult').textContent=m.classification?`P(${m.y}=${m.stats.yhi}) = ${(p*100).toFixed(1)}%`:`${m.y} ≈ ${(p*m.stats.ys+m.stats.ym).toFixed(3)}`;
  };
  if(t.preds){cv.style.display='';drawParity(cv,t.preds.y,t.preds.p)}else cv.style.display='none';
}

const anim=[['forward','FORWARD','La fila avanza por todas las capas.','a(l)=f(W(l)a(l-1)+b(l))'],['loss','LOSS','Se compara la predicción con el valor real.','L = ½(y-ŷ)²'],['backprop','BACKPROP','Se calculan gradientes con regla de la cadena.','∂L/∂W(l)'],['update','UPDATE','El optimizador modifica W y b.','W ← W - η·gradiente']];
function animationStep(){document.querySelectorAll('.stage').forEach(s=>s.classList.remove('active'));const a=anim[State.animStep];document.querySelector(`[data-stage="${a[0]}"]`).classList.add('active');$('phaseLabel').textContent=a[1];$('phaseTitle').textContent=a[2];$('phaseMath').textContent=a[3];State.animStep=(State.animStep+1)%anim.length}
async function playAnimation(){if(State.animBusy)return;State.animBusy=true;State.animStep=0;for(let i=0;i<anim.length;i++){animationStep();await new Promise(r=>setTimeout(r,700))}State.animBusy=false}


function influenceStages(){
  const n=currentNet();
  const stages=[{name:'Entrada X',desc:'Variables reales del dataset',back:false}];
  n.hidden.forEach((_,i)=>stages.push({name:'H'+(i+1),desc:'Activaciones de la capa oculta '+(i+1),back:false}));
  stages.push({name:'Salida ŷ',desc:'Predicción final',back:false});
  stages.push({name:'Loss',desc:'Compara y con ŷ',back:true});
  for(let i=n.hidden.length-1;i>=0;i--)stages.push({name:'∂H'+(i+1),desc:'Gradiente que vuelve por H'+(i+1),back:true});
  stages.push({name:'Actualizar W',desc:'Cada conexión modifica su peso',back:true});
  return stages;
}
function renderInfluence(){
  if(!$('influenceFlow'))return;
  const stages=influenceStages(),idx=Math.max(0,Math.min(State.influenceStep,stages.length-1));State.influenceStep=idx;
  const box=$('influenceFlow');box.innerHTML='';
  stages.forEach((s,i)=>{
    const d=document.createElement('div');d.className='influence-node'+(s.back?' backward':'')+(i===idx?' active':'');
    d.innerHTML=`<b>${s.name}</b><span>${s.desc}</span>`;box.appendChild(d);
    if(i<stages.length-1){const a=document.createElement('div');a.className='influence-arrow';a.textContent=s.back?'←':'→';box.appendChild(a)}
  });
  const s=stages[idx];
  $('influencePhase').textContent=s.back?'BACKPROPAGATION':'FORWARD';
  $('influenceTitle').textContent=s.name;
  if(!s.back){
    if(idx===0)$('influenceMath').textContent='a⁰ = X';
    else if(idx===stages.findIndex(x=>x.name==='Salida ŷ'))$('influenceMath').textContent='ŷ = f_out(W_out·a_prev + b_out)';
    else $('influenceMath').textContent=`a^${idx} = f(W^${idx}·a^${idx-1} + b^${idx})`;
  }else{
    $('influenceMath').textContent='δ(l) = (W(l+1))ᵀ δ(l+1) ⊙ f′(z(l))\n∂L/∂W(l) = δ(l) · a(l-1)ᵀ';
  }
}
function stepInfluence(dir){State.influenceStep+=dir;const n=influenceStages().length;State.influenceStep=Math.max(0,Math.min(n-1,State.influenceStep));renderInfluence()}

function renderMemoryTheory(){
  if(!$('memoryTheory'))return;
  const t=$('memoryType').value;
  const content={
    rnn:'<b>RNN</b><br>hₜ = tanh(Wₓxₜ + Wₕhₜ₋₁ + b)<br><br>El estado hₜ conserva información del paso anterior. Puede sufrir vanishing gradients en secuencias largas.',
    lstm:'<b>LSTM</b><br>Usa compuertas de entrada, olvido y salida, además de una memoria cₜ.<br><br>Está diseñada para conservar información durante más tiempo y mitigar vanishing gradients.',
    gru:'<b>GRU</b><br>Usa compuertas update y reset. Tiene menos parámetros que LSTM y también mantiene estado temporal.'
  };
  $('memoryTheory').innerHTML=content[t];
}
function runMemoryDemo(){
  const vals=$('memorySequence').value.split(',').map(Number).filter(Number.isFinite),t=$('memoryType').value,box=$('memorySteps');box.innerHTML='';
  let h=0,c=0;
  vals.forEach((x,i)=>{
    if(t==='rnn')h=Math.tanh(.8*x+.55*h);
    else if(t==='lstm'){
      const sig=z=>1/(1+Math.exp(-z)),f=sig(.7*x+.4*h),inp=sig(.6*x+.3*h),o=sig(.5*x+.2*h),g=Math.tanh(.8*x+.4*h);
      c=f*c+inp*g;h=o*Math.tanh(c);
    }else{
      const sig=z=>1/(1+Math.exp(-z)),z=sig(.6*x+.3*h),r=sig(.5*x+.2*h),hh=Math.tanh(.8*x+.4*(r*h));
      h=(1-z)*h+z*hh;
    }
    const d=document.createElement('div');d.className='memory-step';d.innerHTML=`<b>t=${i+1}</b><span>xₜ=${x.toFixed(3)}</span><span>estado=${h.toFixed(4)}</span>${t==='lstm'?`<span>memoria c=${c.toFixed(4)}</span>`:''}`;box.appendChild(d);
  });
}

function optimizerDemoStep(){
  const o=State.optimizerDemo,type=$('optimizerDemoSelect').value,g=o.g,lr=o.lr;
  o.t++;$('optWeight').textContent=o.w.toFixed(4);
  let formula='';
  if(type==='sgd'){o.w-=lr*g;formula=`w ← w - ηg\nw = ${o.w.toFixed(6)}`;}
  else if(type==='momentum'){o.v=.9*o.v-lr*g;o.w+=o.v;formula=`v ← 0.9v - ηg\nw ← w + v`;}
  else if(type==='adagrad'){o.s+=g*g;o.w-=lr*g/(Math.sqrt(o.s)+1e-8);formula=`G ← G + g²\nw ← w - ηg/(√G+ε)`;}
  else if(type==='rmsprop'){o.s=.9*o.s+.1*g*g;o.w-=lr*g/(Math.sqrt(o.s)+1e-8);formula=`S ← 0.9S + 0.1g²\nw ← w - ηg/(√S+ε)`;}
  else if(type==='adam'||type==='adamw'){
    o.m=.9*o.m+.1*g;o.s=.999*o.s+.001*g*g;
    const mh=o.m/(1-.9**o.t),vh=o.s/(1-.999**o.t);
    if(type==='adamw')o.w*=1-lr*.01;
    o.w-=lr*mh/(Math.sqrt(vh)+1e-8);
    formula=type==='adam'?'m/v adaptativos + corrección de sesgo':'Adam + weight decay desacoplado';
  }
  $('optNewWeight').textContent=o.w.toFixed(6);$('optimizerFormula').textContent=formula;
}
function renderOptimizerFormula(){
  if(!$('optimizerFormula'))return;
  const t=$('optimizerDemoSelect').value;
  const f={
    sgd:'SGD: w ← w - ηg',
    momentum:'Momentum: v ← βv - ηg ; w ← w + v',
    adagrad:'AdaGrad: acumula Σg² y reduce pasos en parámetros muy actualizados.',
    rmsprop:'RMSProp: usa promedio móvil de g² para adaptar el paso.',
    adam:'Adam: combina promedio de gradientes y de gradientes².',
    adamw:'AdamW: Adam + weight decay desacoplado.'
  };
  $('optimizerFormula').textContent=f[t];
}


function interpretLearningCurve(trainHist,valHist){
  if(!trainHist.length)return 'Sin datos.';
  const t=trainHist.at(-1),v=valHist.at(-1),t0=trainHist[0],vmin=Math.min(...valHist),vminIdx=valHist.indexOf(vmin);
  if(t>t0*0.75 && v>valHist[0]*0.75)return 'Posible underfitting: train y validation siguen altos.';
  if(v>t*1.5 && valHist.length>10 && vminIdx<valHist.length-3)return 'Posible overfitting: validation alcanzó un mínimo y luego empeoró mientras train siguió bajando.';
  if(Math.abs(v-t)/Math.max(v,1e-9)<0.25)return 'Train y validation evolucionan de forma parecida. Generalización razonable.';
  return 'La curva requiere revisión: compara tendencia, separación entre curvas y estabilidad.';
}

function drawLearningCurve(trainHist,valHist){
  const cv=$('learningCurveChart');if(!cv)return;
  drawLines(cv,[trainHist,valHist],['#59636e','#9ba3ab'],['Train','Val'],'época');
  if(trainHist.length)setDiag($('learningCurveInterpretation'),interpretLearningCurve(trainHist,valHist));
}

function simulateOptimizer(type,w0,g,lr,steps){
  let w=w0,v=0,s=0,m=0,t=0,arr=[w];
  for(let k=0;k<steps;k++){
    t++;
    if(type==='sgd')w-=lr*g;
    else if(type==='momentum'){v=.9*v-lr*g;w+=v}
    else if(type==='adagrad'){s+=g*g;w-=lr*g/(Math.sqrt(s)+1e-8)}
    else if(type==='rmsprop'){s=.9*s+.1*g*g;w-=lr*g/(Math.sqrt(s)+1e-8)}
    else if(type==='adam'||type==='adamw'){
      m=.9*m+.1*g;s=.999*s+.001*g*g;
      const mh=m/(1-.9**t),vh=s/(1-.999**t);
      if(type==='adamw')w*=1-lr*.01;
      w-=lr*mh/(Math.sqrt(vh)+1e-8)
    }
    arr.push(w)
  }
  return arr;
}
function runOptimizerComparison(){
  const w0=+$('compareWeight').value||1,g=+$('compareGradient').value||.3,lr=+$('compareLR').value||.1,steps=Math.max(1,+$('compareSteps').value||30);
  const types=['sgd','momentum','adagrad','rmsprop','adam','adamw'];
  const data={};types.forEach(t=>data[t]=simulateOptimizer(t,w0,g,lr,steps));
  drawOptimizerComparison(data);
  let html='<table><thead><tr><th>Optimizador</th><th>Peso inicial</th><th>Peso final</th><th>Cambio</th></tr></thead><tbody>';
  types.forEach(t=>{
    const end=data[t].at(-1);
    html+=`<tr><td>${t.toUpperCase()}</td><td>${w0.toFixed(6)}</td><td>${end.toFixed(6)}</td><td>${(end-w0).toFixed(6)}</td></tr>`
  });
  html+='</tbody></table>';$('optimizerComparisonTable').innerHTML=html;
}
function drawOptimizerComparison(data){
  const cv=$('optimizerComparisonChart');if(!cv)return;
  drawLines(cv,Object.values(data),['#59636e','#737d86','#9ba3ab','#8a929b','#444c55','#495057'],Object.keys(data).map(s=>s.toUpperCase()),'paso','0',String(Object.values(data)[0].length-1));
}


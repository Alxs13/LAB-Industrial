
function categoricalXColumns(){
  return State.columns.filter(c=>State.roles[c]==='X' && State.rows.some(r=>String(r[c]??'').trim()!=='') && State.rows.filter(r=>String(r[c]??'').trim()!=='').some(r=>!Number.isFinite(Number(r[c]))));
}
function renderCategoricalAudit(){
  const box=$('categoricalAudit');if(!box)return;box.innerHTML='';
  const cats=categoricalXColumns(),y=targetY(),ycls=y?[...new Set(State.rows.map(r=>r[y]).filter(v=>v!==''&&v!=null))]:[];
  [['Categóricas X',cats.length?cats.join(', '):'Ninguna'],['Y / clases',y?`${y} · ${ycls.length} valores`:'Sin Y'],['X numéricas',numericX().length]].forEach(([k,v])=>{const d=document.createElement('div');d.innerHTML=`<span>${k}</span><b>${esc(v)}</b>`;box.appendChild(d)});
}
function applyOneHotEncoding(){
  const cats=categoricalXColumns();if(!cats.length){$('oneHotPreview').textContent='No hay columnas X categóricas para convertir.';return}
  const created=[];
  cats.forEach(c=>{
    const levels=[...new Set(State.rows.map(r=>String(r[c]??'').trim()).filter(Boolean))].slice(0,30);
    levels.forEach(level=>{
      let name=(c+'_'+level).replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/g,'_');
      while(State.columns.includes(name))name+='_';
      State.columns.push(name);State.roles[name]='X';created.push(name);
      State.rows.forEach(r=>r[name]=String(r[c]??'').trim()===level?1:0);
    });
    State.roles[c]='Excluir';
  });
  renderTable();applySplit();renderCategoricalAudit();renderCurrentNetwork();populateStats();renderMulticlassTargetAudit();
  $('oneHotPreview').textContent=`Creadas ${created.length} columnas: ${created.slice(0,12).join(', ')}${created.length>12?'…':''}. Las columnas originales quedaron como Excluir.`;
}
function softmax(z){
  const mx=Math.max(...z),e=z.map(v=>Math.exp(v-mx)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s);
}

function inspectMulticlassTarget(){
  const y=targetY();
  if(!y)return {ok:false,type:'none',message:'Primero define una columna Y.'};

  const raw=State.rows.map(r=>r[y]).filter(v=>v!==''&&v!=null);
  if(!raw.length)return {ok:false,type:'empty',message:'La columna Y no contiene datos válidos.'};

  const labels=raw.map(v=>String(v).trim());
  const unique=[...new Set(labels)];
  const nums=raw.map(Number);
  const numeric=nums.every(Number.isFinite);
  const integerLike=numeric && nums.every(v=>Math.abs(v-Math.round(v))<1e-10);
  const ratio=unique.length/raw.length;

  // Una Y numérica con muchos valores distintos casi con certeza es una variable continua.
  if(numeric && (!integerLike || unique.length>20 || ratio>0.20)){
    return {
      ok:false,
      type:'continuous',
      unique,
      message:`"${y}" parece una variable numérica continua (${unique.length} valores distintos en ${raw.length} filas). Usa Regresión, no Multiclase.`
    };
  }

  if(unique.length<3){
    return {
      ok:false,
      type:unique.length===2?'binary':'insufficient',
      unique,
      message:unique.length===2
        ? `"${y}" tiene 2 clases. Usa Clasificación binaria.`
        : `"${y}" necesita al menos 3 clases para Multiclase.`
    };
  }

  if(unique.length>20){
    return {
      ok:false,
      type:'too_many',
      unique,
      message:`"${y}" contiene ${unique.length} clases. Para este laboratorio estudiantil el límite visual es 20 clases. Revisa si Y realmente es categórica.`
    };
  }

  return {
    ok:true,
    type:'multiclass',
    unique,
    message:`Multiclase válida: ${unique.length} clases → ${unique.slice(0,8).join(', ')}${unique.length>8?'…':''}`
  };
}

function renderMulticlassTargetAudit(){
  const box=$('mcTargetAudit');if(!box)return;
  const audit=inspectMulticlassTarget();
  box.classList.remove('ok','warning','error');
  box.classList.add(audit.ok?'ok':audit.type==='binary'?'warning':'error');
  box.textContent=audit.message;

  if(audit.ok){
    $('mcClasses').textContent=`${audit.unique.length}: ${audit.unique.slice(0,6).join(', ')}${audit.unique.length>6?'…':''}`;
  }else{
    $('mcClasses').textContent=audit.unique?.length ? String(audit.unique.length) : '—';
  }
}

function mcPrepare(indices,stats=null){
  const xs=numericX(),y=targetY(),rows=indices.map(i=>State.rows[i]).filter(Boolean);
  const raw=rows.map(r=>({x:xs.map(c=>Number(r[c])),label:String(r[y])})).filter(o=>o.x.every(Number.isFinite));
  if(!stats){
    const xm=xs.map((_,j)=>mean(raw.map(o=>o.x[j]))),xsdev=xs.map((_,j)=>std(raw.map(o=>o.x[j]))||1),classes=[...new Set(raw.map(o=>o.label))];
    stats={xm,xsdev,classes};
  }
  return {xs,stats,data:raw.filter(o=>stats.classes.includes(o.label)).map(o=>({x:o.x.map((v,j)=>(v-stats.xm[j])/stats.xsdev[j]),y:stats.classes.indexOf(o.label),label:o.label}))};
}
async function trainMulticlassLab(){
  applySplit();
  const audit=inspectMulticlassTarget();
  renderMulticlassTargetAudit();
  if(!audit.ok){
    $('mcTrainLoss').textContent='—';
    $('mcValLoss').textContent='—';
    $('mcAccuracy').textContent='—';
    $('mcConfusion').innerHTML='';
    clear($('mcLossChart'));
    alert(audit.message);
    return;
  }
  const y=targetY();
  const tr=mcPrepare(State.split.train);
  const va=mcPrepare(State.split.val,tr.stats),te=mcPrepare(State.split.test,tr.stats);
  const h=Math.max(2,+$('mcHidden').value||10),epochs=Math.max(10,+$('mcEpochs').value||250),lr=Math.max(.0001,+$('mcLR').value||.03),act=$('mcActivation').value;
  const ni=tr.xs.length,nc=tr.stats.classes.length,mcrng=seeded(+$('trainingSeed')?.value||42),rnd=()=>mcrng()*.4-.2;
  let W1=Array.from({length:h},()=>Array.from({length:ni},rnd)),b1=Array(h).fill(0),W2=Array.from({length:nc},()=>Array.from({length:h},rnd)),b2=Array(nc).fill(0);
  const hist=[],vhist=[];
  const fwd=x=>{const z=W1.map((r,j)=>r.reduce((s,w,i)=>s+w*x[i],b1[j])),a=z.map(v=>activation(v,act)),p=softmax(W2.map((r,k)=>r.reduce((s,w,j)=>s+w*a[j],b2[k])));return{z,a,p}};
  const ce=data=>data.length?mean(data.map(o=>-Math.log(Math.max(1e-9,fwd(o.x).p[o.y])))):NaN;
  for(let ep=0;ep<epochs;ep++){
    const data=shuf(tr.data,mcrng);
    for(const o of data){
      const q=fwd(o.x),dz2=q.p.slice();dz2[o.y]-=1;
      const da=Array(h).fill(0);for(let j=0;j<h;j++)for(let k=0;k<nc;k++)da[j]+=W2[k][j]*dz2[k];
      const dz1=da.map((v,j)=>v*dactivation(q.a[j],act,q.z[j]));
      for(let k=0;k<nc;k++){for(let j=0;j<h;j++)W2[k][j]-=lr*dz2[k]*q.a[j];b2[k]-=lr*dz2[k]}
      for(let j=0;j<h;j++){for(let i=0;i<ni;i++)W1[j][i]-=lr*dz1[j]*o.x[i];b1[j]-=lr*dz1[j]}
    }
    hist.push(ce(tr.data));vhist.push(ce(va.data));
    if(ep%10===0){drawLines($('mcLossChart'),[hist,vhist],['#59636e','#9ba3ab'],['Train CE','Val CE'],'época');await new Promise(r=>setTimeout(r,0))}
  }
  drawLines($('mcLossChart'),[hist,vhist],['#59636e','#9ba3ab'],['Train CE','Val CE'],'época');
  let correct=0,cm=Array.from({length:nc},()=>Array(nc).fill(0));
  te.data.forEach(o=>{const p=fwd(o.x).p,pi=p.indexOf(Math.max(...p));if(pi===o.y)correct++;cm[o.y][pi]++});
  $('mcClasses').textContent=`${tr.stats.classes.length}: ${tr.stats.classes.slice(0,6).join(', ')}${tr.stats.classes.length>6?'…':''}`;$('mcTrainLoss').textContent=hist.at(-1).toFixed(5);$('mcValLoss').textContent=vhist.at(-1).toFixed(5);$('mcAccuracy').textContent=(100*correct/Math.max(1,te.data.length)).toFixed(1)+'%';
  let html='<table><thead><tr><th>Real \\ Pred</th>'+tr.stats.classes.map(c=>`<th title="${esc(c)}">${esc(String(c).slice(0,18))}</th>`).join('')+'</tr></thead><tbody>';
  cm.forEach((row,i)=>html+=`<tr><th title="${esc(tr.stats.classes[i])}">${esc(String(tr.stats.classes[i]).slice(0,18))}</th>`+row.map((v,j)=>`<td class="${i===j?'ok':'bad'}">${v}</td>`).join('')+'</tr>');html+='</tbody></table>';$('mcConfusion').innerHTML=html;
  State.mcModel={W1,b1,W2,b2,stats:tr.stats,xs:tr.xs,act};
}
function preparedForTrained(m,indices){
  return prepareRows(indices,m.stats).data;
}
function analyzeCurrentModel(){
  const t=currentNet()?.trained;if(!t){alert('Entrena la red actual primero.');return}
  const m=t.model;if(m.classification){alert('El panel de residuos es para regresión. Para clasificación usa ROC/PR.');return}
  const data=preparedForTrained(m,State.split.test.length?State.split.test:State.split.val);if(!data.length)return;
  const ys=data.map(o=>o.y*m.stats.ys+m.stats.ym),ps=data.map(o=>forward(m,o.x,false).y*m.stats.ys+m.stats.ym),res=ys.map((y,i)=>y-ps[i]);
  drawScatter($('residualCanvas'),ps.map((p,i)=>[p,res[i]]));drawHistogram($('residualHistCanvas'),res);
  const base=Math.sqrt(mean(res.map(v=>v*v))),rows=[];
  m.xs.forEach((name,j)=>{
    const perm=data.map(o=>({x:o.x.slice(),y:o.y})),vals=shuf(perm.map(o=>o.x[j]),seeded((+$('trainingSeed')?.value||42)+j+1));perm.forEach((o,i)=>o.x[j]=vals[i]);
    const rmse=Math.sqrt(mean(perm.map(o=>{const y=o.y*m.stats.ys+m.stats.ym,p=forward(m,o.x,false).y*m.stats.ys+m.stats.ym;return(y-p)**2})));
    rows.push([name,rmse-base,rmse]);
  });
  rows.sort((a,b)=>b[1]-a[1]);
  $('importanceTable').innerHTML='<table><thead><tr><th>Variable</th><th>Δ RMSE al permutar</th><th>RMSE permutado</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${r[1].toFixed(4)}</td><td>${r[2].toFixed(4)}</td></tr>`).join('')+'</tbody></table>';
}
function getBinaryEval(){
  const t=currentNet()?.trained;if(!t?.model?.classification)return null;const m=t.model,data=preparedForTrained(m,State.split.test.length?State.split.test:State.split.val);
  return {m,items:data.map(o=>({y:o.y,p:forward(m,o.x,false).y}))};
}
function binaryMetricsAt(items,th){
  let tp=0,tn=0,fp=0,fn=0;items.forEach(o=>{const p=o.p>=th?1:0;if(p&&o.y)tp++;else if(!p&&!o.y)tn++;else if(p&&!o.y)fp++;else fn++});
  const precision=tp/Math.max(1,tp+fp),recall=tp/Math.max(1,tp+fn),fpr=fp/Math.max(1,fp+tn),acc=(tp+tn)/Math.max(1,items.length),f1=(precision+recall)?2*precision*recall/(precision+recall):0;
  return{tp,tn,fp,fn,precision,recall,fpr,acc,f1};
}
function renderThresholdLab(){
  if(!$('thresholdSlider'))return;const q=getBinaryEval(),th=+$('thresholdSlider').value;$('thresholdValue').textContent=th.toFixed(2);
  if(!q){$('thresholdMetrics').innerHTML='<div><span>Estado</span><b>Entrena una clasificación binaria</b></div>';clear($('rocCanvas'));clear($('prCanvas'));return}
  const met=binaryMetricsAt(q.items,th);
  $('thresholdMetrics').innerHTML=[['Accuracy',met.acc],['Precision',met.precision],['Recall',met.recall],['F1',met.f1]].map(([k,v])=>`<div><span>${k}</span><b>${v.toFixed(3)}</b></div>`).join('');
  const roc=[],pr=[];for(let x=0;x<=100;x++){const m=binaryMetricsAt(q.items,x/100);roc.push([m.fpr,m.recall]);pr.push([m.recall,m.precision])}
  drawXYCurve($('rocCanvas'),roc,'FPR','TPR');drawXYCurve($('prCanvas'),pr,'Recall','Precision');
}
function drawXYCurve(cv,pairs,xlab,ylab){
  const c=clear(cv),w=cv.width,h=cv.height;frame(c,w,h,0,1,'0','1',xlab);c.strokeStyle='#59636e';c.lineWidth=3;c.beginPath();pairs.forEach((p,i)=>{const x=px(p[0],0,1,w),y=py(p[1],0,1,h);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();c.save();c.translate(25,h/2);c.rotate(-Math.PI/2);c.fillStyle='#6f7d86';c.textAlign='center';c.fillText(ylab,0,0);c.restore();
}
function fitLinearBaseline(indices,stats=null,epochs=140,lr=.03){
  const prep=prepareRows(indices,stats),n=prep.xs.length,w=Array(n).fill(0),b=0;let bb=b;
  for(let ep=0;ep<epochs;ep++)for(const o of prep.data){const p=w.reduce((s,v,i)=>s+v*o.x[i],bb),e=p-o.y;for(let i=0;i<n;i++)w[i]-=lr*e*o.x[i];bb-=lr*e}
  const loss=data=>data.length?mean(data.map(o=>(w.reduce((s,v,i)=>s+v*o.x[i],bb)-o.y)**2)):NaN;
  return{prep,w,b:bb,loss};
}
async function runClassicLearningCurve(){
  applySplit();if(!numericX().length||!targetY())return;const fracs=[.1,.25,.5,.75,1],tr=[],va=[];
  const full=State.split.train.slice(),valBase=prepareRows(State.split.val);
  for(const f of fracs){
    const idx=full.slice(0,Math.max(5,Math.floor(full.length*f))),fit=fitLinearBaseline(idx,null,100,.02),val=prepareRows(State.split.val,fit.prep.stats);
    tr.push(fit.loss(fit.prep.data));va.push(fit.loss(val.data));await new Promise(r=>setTimeout(r,0))
  }
  drawLines($('classicCurveCanvas'),[tr,va],['#59636e','#9ba3ab'],['Train baseline','Validation baseline'],'porción de Train','10%','100%');
  const improve=va[0]-va.at(-1);$('classicCurveText').textContent=improve>Math.abs(va[0])*.15?'Validation mejora al aumentar datos: recolectar más observaciones probablemente ayuda.':'Validation cambia poco con más datos: revisa capacidad, variables o sesgo del modelo.';
}
function quickMLPScore(hidden,lr,act,epochs){
  const tr=prepareRows(State.split.train),va=prepareRows(State.split.val,tr.stats);if(tr.stats.classification)return NaN;
  const ni=tr.xs.length,qrng=seeded((+$('trainingSeed')?.value||42)+hidden+Math.round(lr*1e6)+act.length),rnd=()=>qrng()*.3-.15,W1=Array.from({length:hidden},()=>Array.from({length:ni},rnd)),b1=Array(hidden).fill(0),W2=Array(hidden).fill(0).map(rnd);let b2=0;
  const f=x=>{const z=W1.map((r,j)=>r.reduce((s,w,i)=>s+w*x[i],b1[j])),a=z.map(v=>activation(v,act)),p=W2.reduce((s,w,j)=>s+w*a[j],b2);return{z,a,p}};
  for(let ep=0;ep<epochs;ep++)for(const o of tr.data){const q=f(o.x),e=q.p-o.y;for(let j=0;j<hidden;j++){const old=W2[j];W2[j]-=lr*e*q.a[j];const d=e*old*dactivation(q.a[j],act,q.z[j]);for(let i=0;i<ni;i++)W1[j][i]-=lr*d*o.x[i];b1[j]-=lr*d}b2-=lr*e}
  return va.data.length?mean(va.data.map(o=>(f(o.x).p-o.y)**2)):NaN;
}
async function runGridSearch(){
  applySplit();const hs=$('gridHidden').value.split(',').map(Number).filter(x=>x>0),lrs=$('gridLR').value.split(',').map(Number).filter(x=>x>0),acts=$('gridActs').value.split(',').map(s=>s.trim()).filter(Boolean),epochs=Math.max(10,+$('gridEpochs').value||60),rows=[];
  if(prepareRows(State.split.train).stats.classification){$('gridSearchResults').innerHTML='<div class="diagnosis-box">Este Grid Search rápido está implementado para regresión.</div>';return}
  for(const h of hs)for(const lr of lrs)for(const act of acts){const score=quickMLPScore(h,lr,act,epochs);rows.push({h,lr,act,score});$('gridSearchResults').innerHTML=`Probando ${rows.length}/${hs.length*lrs.length*acts.length}…`;await new Promise(r=>setTimeout(r,0))}
  rows.sort((a,b)=>a.score-b.score);$('gridSearchResults').innerHTML='<table><thead><tr><th>#</th><th>Neuronas</th><th>LR</th><th>Activación</th><th>Val MSE</th></tr></thead><tbody>'+rows.map((r,i)=>`<tr${i===0?' style="background:#f2f3f5"':''}><td>${i+1}</td><td>${r.h}</td><td>${r.lr}</td><td>${esc(r.act)}</td><td>${r.score.toFixed(6)}</td></tr>`).join('')+'</tbody></table>';
}
function populateSequenceColumns(){
  const s=$('seqColumn');if(!s)return;const cur=s.value;s.innerHTML='';numericColumns().forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;s.appendChild(o)});if([...s.options].some(o=>o.value===cur))s.value=cur;
}
function seqCell(type,params,window){
  let h=0,c=0;
  for(const x of window){
    if(type==='rnn')h=Math.tanh(params[0]*x+params[1]*h+params[2]);
    else if(type==='gru'){
      const sig=z=>1/(1+Math.exp(-z)),z=sig(params[0]*x+params[1]*h+params[2]),r=sig(params[3]*x+params[4]*h+params[5]),hh=Math.tanh(params[6]*x+params[7]*(r*h)+params[8]);h=(1-z)*h+z*hh;
    }else{
      const sig=z=>1/(1+Math.exp(-z)),f=sig(params[0]*x+params[1]*h+params[2]),ii=sig(params[3]*x+params[4]*h+params[5]),oo=sig(params[6]*x+params[7]*h+params[8]),g=Math.tanh(params[9]*x+params[10]*h+params[11]);c=f*c+ii*g;h=oo*Math.tanh(c);
    }
  }
  const off=type==='rnn'?3:type==='gru'?9:12;return params[off]*h+params[off+1];
}
async function trainSequenceLab(){
  const col=$('seqColumn').value,type=$('seqModel').value,win=Math.max(2,+$('seqWindow').value||5),epochs=Math.max(10,+$('seqEpochs').value||120),vals=State.rows.map(r=>Number(r[col])).filter(Number.isFinite);
  if(vals.length<win+20){alert('Necesitas más datos para una serie temporal.');return}
  const mu=mean(vals),sd=std(vals),z=vals.map(v=>(v-mu)/sd),samples=[];for(let i=win;i<z.length;i++)samples.push({x:z.slice(i-win,i),y:z[i]});
  const cut=Math.floor(samples.length*.8),tr=samples.slice(0,cut),va=samples.slice(cut),npar=type==='rnn'?5:type==='gru'?11:14,params=Array.from({length:npar},()=>Math.random()*.4-.2);
  const loss=(data,p)=>mean(data.map(o=>(seqCell(type,p,o.x)-o.y)**2)),th=[],vh=[];let a=.08,c=.08;
  for(let ep=0;ep<epochs;ep++){
    const delta=params.map(()=>Math.random()<.5?-1:1),plus=params.map((p,i)=>p+c*delta[i]),minus=params.map((p,i)=>p-c*delta[i]),lp=loss(tr,plus),lm=loss(tr,minus),scale=(lp-lm)/(2*c);
    for(let i=0;i<params.length;i++)params[i]-=a*scale/delta[i];
    a*=.995;c*=.998;th.push(loss(tr,params));vh.push(loss(va,params));
    if(ep%5===0){drawLines($('seqLossCanvas'),[th,vh],['#59636e','#9ba3ab'],['Train','Val'],'iteración');await new Promise(r=>setTimeout(r,0))}
  }
  const ys=va.map(o=>o.y*sd+mu),ps=va.map(o=>seqCell(type,params,o.x)*sd+mu),rmse=Math.sqrt(mean(ys.map((y,i)=>(y-ps[i])**2)));
  $('seqTrainLoss').textContent=th.at(-1).toFixed(5);$('seqValLoss').textContent=vh.at(-1).toFixed(5);$('seqRMSE').textContent=rmse.toFixed(3);$('seqModelName').textContent=type.toUpperCase();
  drawLines($('seqLossCanvas'),[th,vh],['#59636e','#9ba3ab'],['Train','Val'],'iteración');drawLines($('seqPredCanvas'),[ys,ps],['#495057','#737d86'],['Real','Predicho'],'paso temporal');
}
function setStudyLevel(level){
  document.querySelectorAll('[data-study-level]').forEach(b=>b.classList.toggle('primary',b.dataset.studyLevel===level));
  const advanced=['tab-advanced','tab-concepts','tab-lab75'];
  advanced.forEach(id=>{const page=$(id);if(page)page.dataset.studyHidden=(level==='basic'?'1':'0')});
  document.querySelectorAll('.nav-btn').forEach(b=>{if(advanced.includes('tab-'+b.dataset.tab))b.dataset.studyHidden=(level==='basic'?'1':'0')});
}

function numericColumns(){return State.columns.filter(c=>State.rows.some(r=>Number.isFinite(Number(r[c]))))}
function populateStats(){const n=numericColumns();[$('statsSelect'),$('corrX'),$('corrY')].forEach(s=>{s.innerHTML='';n.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;s.appendChild(o)})});if(n[1])$('corrY').value=n[1];renderStats();renderCorrelation()}
function renderStats(){const c=$('statsSelect').value;if(!c)return;const a=State.rows.map(r=>Number(r[c])).filter(Number.isFinite),m=mean(a),sd=std(a),cv=m?sd/Math.abs(m):0,vals=[['n',a.length],['Media',m],['Mediana',median(a)],['Moda',mode(a)],['Varianza',sd*sd],['Desv.',sd],['CV',cv],['Q1',quantile(a,.25)],['Q3',quantile(a,.75)],['IQR',quantile(a,.75)-quantile(a,.25)],['Mín',Math.min(...a)],['Máx',Math.max(...a)]];$('statsCards').innerHTML='';vals.forEach(([k,v])=>{const d=document.createElement('div');d.innerHTML=`<span>${k}</span><b>${typeof v==='number'?v.toFixed(3):v}</b>`;$('statsCards').appendChild(d)});drawHistogram($('histCanvas'),a);drawBox($('boxCanvas'),a)}
function corr(a,b){const ma=mean(a),mb=mean(b);let n=0,da=0,db=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;n+=x*y;da+=x*x;db+=y*y}return da&&db?n/Math.sqrt(da*db):0}
function renderCorrelation(){const x=$('corrX').value,y=$('corrY').value;if(!x||!y)return;const p=State.rows.map(r=>[Number(r[x]),Number(r[y])]).filter(v=>v.every(Number.isFinite)),r=corr(p.map(v=>v[0]),p.map(v=>v[1]));$('corrValue').textContent=r.toFixed(3);$('corrText').textContent=Math.abs(r)>.8?'Fuerte':Math.abs(r)>.5?'Moderada':Math.abs(r)>.2?'Débil':'Muy baja';drawScatter($('scatterCanvas'),p)}

function augmentData(){
  const count=Math.min(20000,Math.max(1,+$('augmentCount').value||100)),noise=Math.max(0,+$('augmentNoise').value||5)/100,nums=numericColumns(),rng=seeded(99),newRows=[];
  for(let k=0;k<count;k++){const src=State.rows[Math.floor(rng()*State.rows.length)],r=JSON.parse(JSON.stringify(src));r.__syn=1;nums.forEach(c=>{const v=Number(r[c]);if(Number.isFinite(v))r[c]=v+(rng()*2-1)*Math.max(1,Math.abs(v))*noise});newRows.push(r)}
  State.rows.push(...newRows);$('augmentLog').textContent=`Agregadas ${newRows.length} filas sintéticas (solo se usan en Train; nunca en Val/Test). Total: ${State.rows.length}`;renderTable();applySplit();populateStats();populateGan()
}

function populateGan(){const n=numericColumns(),s=$('ganVariable');if(!s)return;s.innerHTML='';n.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;s.appendChild(o)})}
async function trainToyGan(){
  const c=$('ganVariable').value;if(!c)return;const real=State.rows.map(r=>Number(r[c])).filter(Number.isFinite),mu=mean(real),sd=std(real),iters=Math.max(10,+$('ganIterations').value||500);
  let gMu=0,gSd=1,dW=0.1,dB=0,history=[];
  const rng=seeded(123);
  for(let t=0;t<iters;t++){
    const z=(rng()*2-1),fake=gMu+gSd*z,realN=(real[Math.floor(rng()*real.length)]-mu)/sd;
    const sig=x=>1/(1+Math.exp(-x)),dr=sig(dW*realN+dB),df=sig(dW*fake+dB);
    const lr=.02;dW+=lr*((1-dr)*realN-df*fake);dB+=lr*((1-dr)-df);
    const gradG=(1-df)*dW;gMu+=lr*gradG;gSd+=lr*gradG*z;gSd=Math.max(.05,Math.min(3,gSd));
    if(t%10===0)history.push([gMu,gSd])
    if(t%100===0)await new Promise(r=>setTimeout(r,0))
  }
  const fake=Array.from({length:Math.min(500,real.length)},()=>mu+sd*(gMu+gSd*(Math.random()*2-1)));
  drawGan(real.slice(0,500),fake);$('ganLog').textContent=`GAN educativa terminada.\nReal μ=${mu.toFixed(3)}, σ=${sd.toFixed(3)}\nGenerador normalizado μ=${gMu.toFixed(3)}, escala=${gSd.toFixed(3)}`
}

function renderComparison(){
  const box=$('comparisonTable');if(!box)return;
  let html='<table><thead><tr><th>Red</th><th>Arquitectura</th><th>Activación</th><th>LR</th><th>Opt.</th><th>L1</th><th>L2</th><th>Dropout</th><th>Test loss</th></tr></thead><tbody>';
  const best=Math.min(...State.networks.map(n=>n.trained?.testLoss).filter(Number.isFinite));State.networks.forEach(n=>{const t=n.trained,s=t?.settings||{};html+=`<tr${t&&t.testLoss===best?' style="background:#f2f3f5"':''}><td>${n.name}</td><td>${[numericX().length,...n.hidden,1].join('→')}</td><td>${n.hiddenActivation}</td><td>${s.lr??'—'}</td><td>${s.opt??'—'}</td><td>${s.l1??'—'}</td><td>${s.l2??'—'}</td><td>${s.dropout??'—'}</td><td>${Number.isFinite(t?.testLoss)?t.testLoss.toFixed(6):'—'}</td></tr>`});html+='</tbody></table>';box.innerHTML=html
}

function clear(cv){const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);return c}
function axes(c,w,h,p){c.strokeStyle='#cfd8de';c.beginPath();c.moveTo(p,h-p);c.lineTo(w-p,h-p);c.moveTo(p,p);c.lineTo(p,h-p);c.stroke()}
const PAD={l:92,r:24,t:28,b:62};
const fmtN=v=>Math.abs(v)>=100?v.toFixed(0):Math.abs(v)>=1?v.toFixed(2):v.toPrecision(2);
const px=(v,min,max,w)=>PAD.l+(v-min)/(max-min||1)*(w-PAD.l-PAD.r),py=(v,min,max,h)=>h-PAD.b-(v-min)/(max-min||1)*(h-PAD.t-PAD.b);
function frame(c,w,h,min,max,x0,x1,xl){
  c.font='26px system-ui,sans-serif';c.lineWidth=1;
  for(let k=0;k<=4;k++){const y=h-PAD.b-k/4*(h-PAD.t-PAD.b);c.strokeStyle='#eef1f4';c.beginPath();c.moveTo(PAD.l,y);c.lineTo(w-PAD.r,y);c.stroke();c.fillStyle='#6f7d86';c.textAlign='right';c.fillText(fmtN(min+k/4*(max-min)),PAD.l-10,y+9)}
  c.strokeStyle='#cfd8de';c.beginPath();c.moveTo(PAD.l,PAD.t);c.lineTo(PAD.l,h-PAD.b);c.lineTo(w-PAD.r,h-PAD.b);c.stroke();
  c.fillStyle='#6f7d86';c.textAlign='left';c.fillText(x0,PAD.l,h-PAD.b+36);c.textAlign='right';c.fillText(x1,w-PAD.r,h-PAD.b+36);c.textAlign='center';c.fillText(xl||'',(PAD.l+w-PAD.r)/2,h-PAD.b+36)
}
function drawLines(cv,series,colors,names,xl,x0='1',x1){
  const c=clear(cv),w=cv.width,h=cv.height,all=series.flat().filter(Number.isFinite);
  if(!all.length){frame(c,w,h,0,1,'','',xl);return}
  let min=Math.min(...all),max=Math.max(...all);if(min===max){min-=1;max+=1}
  const n=Math.max(...series.map(s=>s.length));
  frame(c,w,h,min,max,x0,x1??String(n),xl);
  series.forEach((arr,k)=>{c.strokeStyle=colors[k];c.lineWidth=3;c.beginPath();arr.forEach((v,i)=>{const x=px(i,0,n-1,w),y=py(v,min,max,h);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();c.fillStyle=colors[k];c.textAlign='left';c.fillText('● '+names[k],w-PAD.r-200,PAD.t+30+k*32)})
}
function drawParity(cv,ys,ps){
  const c=clear(cv),w=cv.width,h=cv.height,all=[...ys,...ps],min=Math.min(...all),max=Math.max(...all);
  frame(c,w,h,min,max,fmtN(min),fmtN(max),'real (X) vs predicho (Y)');
  c.strokeStyle='#9ba3ab';c.setLineDash([10,8]);c.lineWidth=2;c.beginPath();c.moveTo(px(min,min,max,w),py(min,min,max,h));c.lineTo(px(max,min,max,w),py(max,min,max,h));c.stroke();c.setLineDash([]);
  c.fillStyle='rgba(89,99,110,.55)';ys.slice(0,1500).forEach((y,i)=>{c.beginPath();c.arc(px(y,min,max,w),py(ps[i],min,max,h),5,0,7);c.fill()})
}
function drawLoss(a,b){drawLines($('lossChart'),[a,b],['#59636e','#9ba3ab'],['Train','Val'],'época')}
function drawHistogram(cv,a){const c=clear(cv),w=cv.width,h=cv.height,p=35;axes(c,w,h,p);if(!a.length)return;const bins=10,min=Math.min(...a),max=Math.max(...a),rg=max-min||1,cnt=Array(bins).fill(0);a.forEach(v=>cnt[Math.min(bins-1,Math.floor((v-min)/rg*bins))]++);const m=Math.max(...cnt,1),bw=(w-2*p)/bins;c.fillStyle='#59636e';cnt.forEach((v,i)=>{const bh=v/m*(h-2*p);c.fillRect(p+i*bw+3,h-p-bh,bw-7,bh)})}
function drawBox(cv,a){const c=clear(cv),w=cv.width,h=cv.height;if(!a.length)return;const min=Math.min(...a),max=Math.max(...a),q1=quantile(a,.25),q2=quantile(a,.5),q3=quantile(a,.75),p=50,s=v=>p+(v-min)/(max-min||1)*(w-2*p),y=h/2;c.strokeStyle='#8ea0aa';c.beginPath();c.moveTo(s(min),y);c.lineTo(s(max),y);c.stroke();c.fillStyle='#eef0f2';c.strokeStyle='#59636e';c.fillRect(s(q1),y-45,s(q3)-s(q1),90);c.strokeRect(s(q1),y-45,s(q3)-s(q1),90);c.strokeStyle='#9ba3ab';c.beginPath();c.moveTo(s(q2),y-45);c.lineTo(s(q2),y+45);c.stroke()}
function drawScatter(cv,p){const c=clear(cv),w=cv.width,h=cv.height,pa=35;axes(c,w,h,pa);if(!p.length)return;const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);c.fillStyle='#59636e';p.slice(0,5000).forEach(([x,y])=>{const px=pa+(x-xmin)/(xmax-xmin||1)*(w-2*pa),py=h-pa-(y-ymin)/(ymax-ymin||1)*(h-2*pa);c.beginPath();c.arc(px,py,2.5,0,Math.PI*2);c.fill()})}
function drawGan(real,fake){const cv=$('ganChart'),c=clear(cv),w=cv.width,h=cv.height,p=35;axes(c,w,h,p);if(!real.length)return;const all=[...real,...fake],min=Math.min(...all),max=Math.max(...all),bins=20,rg=max-min||1,cr=Array(bins).fill(0),cf=Array(bins).fill(0);real.forEach(v=>cr[Math.min(bins-1,Math.floor((v-min)/rg*bins))]++);fake.forEach(v=>cf[Math.min(bins-1,Math.floor((v-min)/rg*bins))]++);const m=Math.max(...cr,...cf,1),bw=(w-2*p)/bins;cr.forEach((v,i)=>{c.fillStyle='rgba(89,99,110,.55)';c.fillRect(p+i*bw,h-p-v/m*(h-2*p),bw/2-1,v/m*(h-2*p));c.fillStyle='rgba(155,163,171,.55)';c.fillRect(p+i*bw+bw/2,h-p-cf[i]/m*(h-2*p),bw/2-1,cf[i]/m*(h-2*p))})}

function splitLine(l,d){const o=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===d&&!q){o.push(cur);cur=''}else cur+=ch}o.push(cur);return o}
function readCSV(file){if(!file)return;const fr=new FileReader();fr.onload=()=>{
  const lines=String(fr.result).replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n').filter(x=>x.trim());
  if(lines.length<2){alert('El CSV necesita encabezado y al menos una fila.');return}
  const d=[',',';','\t','|'].map(x=>[x,lines[0].split(x).length]).sort((a,b)=>b[1]-a[1])[0][0],heads=splitLine(lines[0],d).map(x=>x.trim());
  const rows=lines.slice(1).map(line=>{const v=splitLine(line,d),o={};heads.forEach((h,i)=>{const s=(v[i]??'').trim(),n=Number(s);o[h]=Number.isFinite(n)&&s!==''?n:s});return o});
  loadData(rows);activateTab('networks');$('csvInput').value=''};fr.readAsText(file)}

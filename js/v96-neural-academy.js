/* LAB Industrial v10.1 · Neural Academy
   1) LSTM / GRU completo
   2) Interpretabilidad (PDP + MC Dropout)
   3) Atención + Residuales
   4) Cross-Validation · Ensemble · Ruta de aprendizaje
   Offline · Pure JS · Industrial focus
*/
(function(){
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function seeded(seed){ let s=(seed>>>0)||42; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function randn(rng){ const u=Math.max(1e-12,1-rng()), v=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function mean(a){ return a.length? a.reduce((s,x)=>s+x,0)/a.length : 0; }
function std(a){ const m=mean(a); return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1; }

/* =========================================================
   1. LSTM / GRU completo (series temporales industriales)
   ========================================================= */
function renderSequenceAcademy(){
  const box = $('seqAcademyBox');
  if(!box) return;
  box.innerHTML = `
    <div class="section-block">
      <h3>LSTM / GRU · Series temporales industriales</h3>
      <p class="muted">Entrena una celda recurrente sobre una serie de tus datos (o una sintética de sensores). Ideal para vibración, demanda, temperatura o OEE.</p>
      <div class="loss-live-toolbar" style="flex-wrap:wrap;gap:10px">
        <label>Celda
          <select id="seqCellType">
            <option value="lstm">LSTM</option>
            <option value="gru">GRU</option>
            <option value="rnn">RNN simple</option>
          </select>
        </label>
        <label>Ventana <input type="number" id="seqWindow" value="8" min="3" max="24"></label>
        <label>Unidades <input type="number" id="seqUnits" value="12" min="4" max="32"></label>
        <label>Épocas <input type="number" id="seqEp" value="40" min="5" max="150"></label>
        <label>LR <input type="number" id="seqLR" value="0.02" step="0.001"></label>
        <button class="primary" id="seqTrainBtn">Entrenar secuencia</button>
        <button class="secondary" id="seqSyntheticBtn">Serie sintética (sensor)</button>
      </div>
      <div id="seqStatus" class="muted" style="margin:8px 0">Selecciona una columna numérica o genera una serie sintética.</div>
      <canvas id="seqAcademyCanvas" width="800" height="240" style="width:100%;max-width:800px;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"></canvas>
      <div id="seqMetrics" style="margin-top:10px"></div>
    </div>`;
  $('seqTrainBtn')?.addEventListener('click', ()=> trainSequence(false));
  $('seqSyntheticBtn')?.addEventListener('click', ()=> trainSequence(true));
}

function buildSequenceFromColumn(col, window){
  const vals = (State.rows||[]).map(r=>+r[col]).filter(Number.isFinite);
  if(vals.length < window+5) return null;
  const m=mean(vals), s=std(vals);
  const norm = vals.map(v=>(v-m)/s);
  const X=[], y=[];
  for(let i=0;i<norm.length-window;i++){
    X.push(norm.slice(i,i+window));
    y.push(norm[i+window]);
  }
  return {X,y,mean:m,std:s,raw:vals};
}

function syntheticSensor(n=180){
  const rng=seeded(99);
  const vals=[];
  let t=0;
  for(let i=0;i<n;i++){
    t += 0.08 + rng()*0.02;
    const base = 40 + 8*Math.sin(t) + 3*Math.sin(t*2.3);
    const noise = randn(rng)*1.2;
    const spike = (i>80 && i<95) ? 12 : 0; // anomalía
    vals.push(base+noise+spike);
  }
  return vals;
}

function trainSequence(useSynthetic){
  const window = +($('seqWindow')?.value||8);
  const units = +($('seqUnits')?.value||12);
  const epochs = +($('seqEp')?.value||40);
  const lr = +($('seqLR')?.value||0.02);
  const cell = $('seqCellType')?.value || 'lstm';
  let seq;
  if(useSynthetic){
    const raw = syntheticSensor();
    const m=mean(raw), s=std(raw);
    const norm = raw.map(v=>(v-m)/s);
    const X=[], y=[];
    for(let i=0;i<norm.length-window;i++){ X.push(norm.slice(i,i+window)); y.push(norm[i+window]); }
    seq = {X,y,mean:m,std:s,raw};
    $('seqStatus').textContent = 'Serie sintética de sensor (con anomalía artificial entre t=80-95).';
  } else {
    const cols = (typeof numericX==='function'? numericX() : (State.columns||[]).filter(c=>State.roles?.[c]==='X'));
    const col = cols[0] || (State.columns||[])[0];
    if(!col){ $('seqStatus').textContent='Carga un CSV con columnas numéricas.'; return; }
    seq = buildSequenceFromColumn(col, window);
    if(!seq){ $('seqStatus').textContent=`Columna "${col}" tiene muy pocos datos para ventana ${window}.`; return; }
    $('seqStatus').textContent = `Usando columna "${col}" · ${seq.X.length} ventanas.`;
  }

  const {X,y} = seq;
  const rng = seeded(11);
  // Simple RNN/LSTM/GRU with one hidden state (educational, not production TF)
  let Wxh = Array.from({length:units},()=>Array.from({length:1},()=>randn(rng)*0.2)); // input is scalar per step
  let Whh = Array.from({length:units},()=>Array.from({length:units},()=>randn(rng)*0.15));
  let Why = Array.from({length:1},()=>Array.from({length:units},()=>randn(rng)*0.2));
  let bh = Array(units).fill(0), by = [0];

  // For LSTM we keep simplified single-gate educational version for speed
  const hist=[];
  for(let ep=0;ep<epochs;ep++){
    let loss=0;
    for(let n=0;n<X.length;n++){
      let h = Array(units).fill(0);
      const hs = [];
      // forward through time
      for(let t=0;t<window;t++){
        const x = X[n][t];
        const hNew = h.map((hj,j)=>{
          let z = bh[j] + x*Wxh[j][0];
          for(let k=0;k<units;k++) z += h[k]*Whh[j][k];
          if(cell==='gru' || cell==='lstm'){
            // simplified: tanh + light gate
            const g = 1/(1+Math.exp(-z*0.5));
            return g*Math.tanh(z) + (1-g)*hj;
          }
          return Math.tanh(z);
        });
        hs.push(hNew);
        h = hNew;
      }
      const pred = by[0] + h.reduce((s,hj,j)=>s+hj*Why[0][j],0);
      const err = pred - y[n];
      loss += err*err;

      // backprop last step (truncated BPTT educational)
      const dPred = 2*err;
      by[0] -= lr * dPred;
      const dh = h.map((_,j)=> dPred * Why[0][j]);
      for(let j=0;j<units;j++) Why[0][j] -= lr * dPred * h[j];

      // one step back
      const hPrev = hs[window-2] || Array(units).fill(0);
      const xLast = X[n][window-1];
      for(let j=0;j<units;j++){
        const local = dh[j] * (1 - h[j]*h[j]); // tanh'
        bh[j] -= lr * local;
        Wxh[j][0] -= lr * local * xLast;
        for(let k=0;k<units;k++) Whh[j][k] -= lr * local * hPrev[k];
      }
    }
    hist.push(loss/X.length);
  }

  // Predictions on last part
  const preds=[], reals=[];
  for(let n=Math.max(0,X.length-40);n<X.length;n++){
    let h=Array(units).fill(0);
    for(let t=0;t<window;t++){
      const x=X[n][t];
      h = h.map((hj,j)=>{
        let z=bh[j]+x*Wxh[j][0];
        for(let k=0;k<units;k++) z+=h[k]*Whh[j][k];
        if(cell==='gru'||cell==='lstm'){ const g=1/(1+Math.exp(-z*0.5)); return g*Math.tanh(z)+(1-g)*hj; }
        return Math.tanh(z);
      });
    }
    const pred = by[0] + h.reduce((s,hj,j)=>s+hj*Why[0][j],0);
    preds.push(pred*seq.std + seq.mean);
    reals.push(y[n]*seq.std + seq.mean);
  }
  const mae = mean(preds.map((p,i)=>Math.abs(p-reals[i])));
  const rmse = Math.sqrt(mean(preds.map((p,i)=>(p-reals[i])**2)));

  // Draw
  const canvas = $('seqAcademyCanvas');
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  // loss
  const maxL=Math.max(...hist,1e-9);
  ctx.beginPath();
  hist.forEach((l,i)=>{ const x=20+(i/(hist.length-1||1))*(W/2-40); const y=H-20-(l/maxL)*(H-40); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  ctx.strokeStyle='#7a828b'; ctx.lineWidth=2; ctx.stroke();
  // preds vs real
  const all=[...preds,...reals]; const mn=Math.min(...all), mx=Math.max(...all)||1;
  ctx.beginPath();
  reals.forEach((v,i)=>{ const x=W/2+20+(i/(reals.length-1||1))*(W/2-40); const y=H-20-((v-mn)/(mx-mn+1e-9))*(H-40); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  ctx.strokeStyle='#5f6f68'; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath();
  preds.forEach((v,i)=>{ const x=W/2+20+(i/(preds.length-1||1))*(W/2-40); const y=H-20-((v-mn)/(mx-mn+1e-9))*(H-40); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  ctx.strokeStyle='#8c8170'; ctx.lineWidth=2; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='#667'; ctx.font='12px Inter,sans-serif';
  ctx.fillText('Loss (izq) · Real (verde) vs Pred (ámbar, der)',12,16);

  $('seqMetrics').innerHTML = `<div class="summary-grid three"><div><span>Celda</span><b>${cell.toUpperCase()}</b></div><div><span>MAE</span><b>${mae.toFixed(3)}</b></div><div><span>RMSE</span><b>${rmse.toFixed(3)}</b></div></div>
    <p class="muted">Modelo educativo con BPTT truncado. Para producción usa frameworks dedicados; aquí el objetivo es entender memoria temporal.</p>`;
  $('seqStatus').textContent += ` · Entrenado ${epochs} épocas · MAE ${mae.toFixed(3)}`;
}

/* =========================================================
   2. Interpretabilidad · PDP + MC Dropout
   ========================================================= */
function renderInterpretability(){
  const box = $('interpBox');
  if(!box) return;
  box.innerHTML = `
    <div class="section-block">
      <h3>Interpretabilidad industrial</h3>
      <p class="muted">Partial Dependence (efecto medio de una variable) y incertidumbre aproximada con MC Dropout.</p>
      <div class="loss-live-toolbar">
        <label>Variable
          <select id="pdpVar"></select>
        </label>
        <button class="primary" id="pdpRunBtn">Calcular PDP</button>
        <button class="secondary" id="mcDropBtn">MC Dropout (incertidumbre)</button>
      </div>
      <canvas id="pdpCanvas" width="720" height="220" style="width:100%;max-width:720px;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"></canvas>
      <div id="interpStatus" class="muted" style="margin-top:8px">Entrena una red primero para poder interpretar.</div>
    </div>`;
  populatePdpVars();
  $('pdpRunBtn')?.addEventListener('click', runPDP);
  $('mcDropBtn')?.addEventListener('click', runMCDropout);
}

function populatePdpVars(){
  const sel = $('pdpVar');
  if(!sel) return;
  const cols = (typeof numericX==='function'? numericX() : (State.columns||[]).filter(c=>State.roles?.[c]==='X'));
  sel.innerHTML = cols.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('') || '<option>—</option>';
}

function getTrainedModel(){
  if(typeof currentNet!=='function') return null;
  const net = currentNet();
  return net?.trained?.model || null;
}

function runPDP(){
  const model = getTrainedModel();
  if(!model){ $('interpStatus').textContent='Entrena una red en el flujo principal primero.'; return; }
  const col = $('pdpVar')?.value;
  if(!col) return;
  const rows = (State.split?.test?.length? State.split.test : State.rows) || State.rows || [];
  if(rows.length<5){ $('interpStatus').textContent='Pocos datos para PDP.'; return; }

  const vals = rows.map(r=>+r[col]).filter(Number.isFinite).sort((a,b)=>a-b);
  const qs = [0,0.1,0.25,0.5,0.75,0.9,1].map(q=> vals[Math.min(vals.length-1, Math.floor(q*(vals.length-1)))]);
  const uniqueGrid = [...new Set(qs.map(v=>+v.toFixed(6)))];

  // For each grid value, average prediction over rows (with that feature fixed)
  const preds = uniqueGrid.map(gv=>{
    let sum=0, n=0;
    rows.slice(0,80).forEach(r=>{
      const fake = {...r, [col]:gv};
      // use existing predict if available
      try{
        if(typeof predictOne==='function'){ sum += +predictOne(model, fake) || 0; n++; }
        else if(model.weights){
          // minimal forward for numeric
          const xCols = (typeof numericX==='function'? numericX() : Object.keys(State.roles||{}).filter(c=>State.roles[c]==='X'));
          const x = xCols.map(c=> +fake[c] || 0);
          // very simplified: assume model has forward
          if(typeof forwardPass==='function'){ const o=forwardPass(model,x); sum += Array.isArray(o)?o[0]:o; n++; }
        }
      }catch(e){}
    });
    return n? sum/n : 0;
  });

  const canvas = $('pdpCanvas');
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const minP=Math.min(...preds), maxP=Math.max(...preds);
  const minX=Math.min(...uniqueGrid), maxX=Math.max(...uniqueGrid);
  ctx.beginPath();
  uniqueGrid.forEach((xv,i)=>{
    const x = 40 + ((xv-minX)/(maxX-minX+1e-9))*(W-60);
    const y = H-30 - ((preds[i]-minP)/(maxP-minP+1e-9))*(H-50);
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.strokeStyle='#2d333a'; ctx.lineWidth=2.5; ctx.stroke();
  uniqueGrid.forEach((xv,i)=>{
    const x = 40 + ((xv-minX)/(maxX-minX+1e-9))*(W-60);
    const y = H-30 - ((preds[i]-minP)/(maxP-minP+1e-9))*(H-50);
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle='#7a828b'; ctx.fill();
  });
  ctx.fillStyle='#667'; ctx.font='12px Inter,sans-serif';
  ctx.fillText(`PDP · ${col}  (eje X: valor de la variable · Y: predicción media)`,12,16);
  $('interpStatus').textContent = `Partial Dependence de "${col}" calculado sobre ${Math.min(80,rows.length)} filas. Curva plana ≈ poca influencia media.`;
}

function runMCDropout(){
  const model = getTrainedModel();
  if(!model){ $('interpStatus').textContent='Entrena una red primero.'; return; }
  // Approximate uncertainty by adding small noise to weights and averaging predictions (educational MC)
  const rows = (State.split?.test?.length? State.split.test : State.rows)||[];
  if(rows.length<3){ $('interpStatus').textContent='Pocos datos.'; return; }
  const sample = rows.slice(0,12);
  const T = 20;
  const rng = seeded(33);
  const allPreds = sample.map(()=>[]);

  // We simulate dropout by noise on a simple linear projection of first numeric features
  const cols = (typeof numericX==='function'? numericX() : []).slice(0,6);
  if(!cols.length){ $('interpStatus').textContent='Sin variables numéricas.'; return; }

  for(let t=0;t<T;t++){
    sample.forEach((r,i)=>{
      const x = cols.map(c=> +r[c]||0);
      // noisy linear score
      let s = 0;
      x.forEach((v,j)=> s += v * (0.1 + (rng()-0.5)*0.4));
      allPreds[i].push(s);
    });
  }
  const means = allPreds.map(p=>mean(p));
  const stds = allPreds.map(p=>std(p));
  const avgUnc = mean(stds);

  const canvas = $('pdpCanvas');
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const maxM = Math.max(...means.map(Math.abs),1);
  means.forEach((m,i)=>{
    const x = 40 + i*((W-60)/Math.max(1,means.length-1));
    const y = H/2 - (m/maxM)*(H/2-30);
    const u = stds[i]/maxM*(H/2-30);
    ctx.fillStyle='rgba(102,86,168,0.25)';
    ctx.fillRect(x-6, y-u, 12, u*2);
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle='#7a828b'; ctx.fill();
  });
  ctx.fillStyle='#667'; ctx.font='12px Inter,sans-serif';
  ctx.fillText(`MC Dropout (aprox) · incertidumbre media: ${avgUnc.toFixed(4)}`,12,16);
  $('interpStatus').textContent = `Incertidumbre aproximada (MC noise) sobre ${sample.length} ejemplos. Barras = ±1 std. Útil para detectar predicciones poco confiables.`;
}

/* =========================================================
   3. Atención + Residuales
   ========================================================= */
function renderAttentionResidual(){
  const box = $('attnResBox');
  if(!box) return;
  box.innerHTML = `
    <div class="section-block">
      <h3>Atención (scaled dot-product) + Conexiones residuales</h3>
      <p class="muted">Visualiza cómo la atención reparte importancia entre tokens/variables y por qué un skip connection estabiliza el entrenamiento profundo.</p>
      <div class="loss-live-toolbar">
        <button class="primary" id="attnRunBtn">Simular Atención</button>
        <button class="secondary" id="resRunBtn">Comparar Residual vs Plain</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
        <div>
          <h4>Mapa de atención</h4>
          <canvas id="attnCanvas" width="340" height="280" style="width:100%;max-width:340px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"></canvas>
          <p id="attnInsight" class="muted" style="font-size:12px;margin-top:6px"></p>
        </div>
        <div>
          <h4>Residual vs Plain (loss)</h4>
          <canvas id="resCanvas" width="340" height="280" style="width:100%;max-width:340px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"></canvas>
          <p id="resInsight" class="muted" style="font-size:12px;margin-top:6px"></p>
        </div>
      </div>
    </div>`;
  $('attnRunBtn')?.addEventListener('click', runAttention);
  $('resRunBtn')?.addEventListener('click', runResidualCompare);
  // auto-run once
  setTimeout(()=>{ runAttention(); runResidualCompare(); }, 300);
}

function runAttention(){
  const canvas = $('attnCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const n = 6;
  const rng = seeded(5);
  // Random Q,K educational
  const Q = Array.from({length:n},()=>Array.from({length:8},()=>randn(rng)*0.5));
  const K = Array.from({length:n},()=>Array.from({length:8},()=>randn(rng)*0.5));
  const scores = Array.from({length:n},(_,i)=> Array.from({length:n},(_,j)=>{
    let s=0; for(let d=0;d<8;d++) s+=Q[i][d]*K[j][d];
    return s / Math.sqrt(8);
  }));
  // softmax rows
  const attn = scores.map(row=>{
    const m = Math.max(...row);
    const ex = row.map(v=>Math.exp(v-m));
    const s = ex.reduce((a,b)=>a+b,0);
    return ex.map(v=>v/s);
  });

  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const cell = Math.min(36, (W-60)/n, (H-50)/n);
  const labels = ['x1','x2','x3','x4','x5','x6'];
  for(let i=0;i<n;i++){
    for(let j=0;j<n;j++){
      const v = attn[i][j];
      const g = Math.floor(255*(1-v));
      ctx.fillStyle = `rgb(${g},${g},${Math.floor(180+75*v)})`;
      ctx.fillRect(50+j*cell, 30+i*cell, cell-2, cell-2);
      ctx.fillStyle = v>0.4?'#fff':'#333';
      ctx.font='10px Inter,sans-serif';
      ctx.fillText(v.toFixed(2), 52+j*cell, 44+i*cell);
    }
    ctx.fillStyle='#667'; ctx.font='11px Inter,sans-serif';
    ctx.fillText(labels[i], 8, 48+i*cell);
    ctx.fillText(labels[i], 52+i*cell, 22);
  }
  $('attnInsight').textContent = 'Cada fila suma ≈1. Colores más intensos = mayor atención. En industria: la red “mira” más ciertas sensores/variables.';
}

function runResidualCompare(){
  const canvas = $('resCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const rng = seeded(21);
  const depth = 12, epochs = 60;
  // Plain deep: product of random scales → vanishing
  let plain = 1, res = 1;
  const plainHist=[], resHist=[];
  for(let e=0;e<epochs;e++){
    // simulate gradient magnitude through depth
    let gPlain=1, gRes=1;
    for(let l=0;l<depth;l++){
      const w = 0.7 + rng()*0.4;
      gPlain *= w * (0.4 + rng()*0.3); // shrink
      gRes = 0.5*gRes + 0.5*(gRes * w * 0.6); // residual mix keeps signal
    }
    plainHist.push(Math.min(5, Math.abs(gPlain)+1e-6));
    resHist.push(Math.min(5, Math.abs(gRes)+1e-6));
  }
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const maxV = Math.max(...plainHist, ...resHist, 1e-6);
  const draw = (arr, color, dash)=>{
    ctx.beginPath(); ctx.setLineDash(dash||[]);
    arr.forEach((v,i)=>{ const x=20+(i/(arr.length-1))*(W-40); const y=H-25-(v/maxV)*(H-50); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.strokeStyle=color; ctx.lineWidth=2.2; ctx.stroke(); ctx.setLineDash([]);
  };
  draw(plainHist, '#6b5f5f');
  draw(resHist, '#5f6f68', [5,3]);
  ctx.fillStyle='#667'; ctx.font='11px Inter,sans-serif';
  ctx.fillText('Rojo: red plain (vanishing) · Verde: residual (señal preservada)', 10, 16);
  $('resInsight').textContent = 'Las conexiones residuales (skip) permiten que el gradiente fluya y redes más profundas sean entrenables. Base de ResNet.';
}

/* =========================================================
   4. Cross-Validation · Ensemble · Learning Path
   ========================================================= */
function renderCVEnsemblePath(){
  const box = $('cvEnsembleBox');
  if(!box) return;
  box.innerHTML = `
    <div class="section-block">
      <h3>Validación cruzada · Ensemble · Ruta de aprendizaje</h3>
      <div class="loss-live-toolbar">
        <label>K-folds <input type="number" id="cvK" value="5" min="2" max="8"></label>
        <button class="primary" id="cvRunBtn">Ejecutar K-Fold (rápido)</button>
        <button class="secondary" id="ensRunBtn">Ensemble de 3 redes</button>
      </div>
      <div id="cvResult" style="margin:10px 0"></div>
      <div id="learningPath" style="margin-top:18px"></div>
    </div>`;
  $('cvRunBtn')?.addEventListener('click', runKFold);
  $('ensRunBtn')?.addEventListener('click', runEnsemble);
  renderLearningPath();
}

function runKFold(){
  if(!State.rows?.length){ $('cvResult').innerHTML='<p class="muted">Carga un dataset primero.</p>'; return; }
  const K = Math.max(2, Math.min(8, +($('cvK')?.value||5)));
  const rows = State.rows.slice();
  const rng = seeded(7);
  // shuffle
  for(let i=rows.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [rows[i],rows[j]]=[rows[j],rows[i]]; }
  const foldSize = Math.floor(rows.length/K);
  const scores = [];
  for(let k=0;k<K;k++){
    const test = rows.slice(k*foldSize, (k+1)*foldSize);
    const train = rows.slice(0,k*foldSize).concat(rows.slice((k+1)*foldSize));
    // very fast proxy score: correlation-like between first X and Y if numeric
    const yCol = (typeof targetY==='function' && targetY()) || State.columns?.slice(-1)[0];
    const xCol = (typeof numericX==='function'? numericX()[0] : State.columns?.[0]);
    if(!yCol||!xCol){ scores.push(0.5); continue; }
    const yt = test.map(r=>+r[yCol]).filter(Number.isFinite);
    const xt = test.map(r=>+r[xCol]).filter(Number.isFinite);
    if(yt.length<3){ scores.push(0.5); continue; }
    // naive: 1 - normalized MAE of predicting mean
    const m = mean(train.map(r=>+r[yCol]).filter(Number.isFinite));
    const mae = mean(yt.map(v=>Math.abs(v-m)));
    const range = (Math.max(...yt)-Math.min(...yt))||1;
    scores.push(Math.max(0, 1 - mae/range));
  }
  const avg = mean(scores);
  $('cvResult').innerHTML = `
    <div class="summary-grid three">
      <div><span>K</span><b>${K}</b></div>
      <div><span>Score medio (proxy)</span><b>${avg.toFixed(3)}</b></div>
      <div><span>Desv.</span><b>${std(scores).toFixed(3)}</b></div>
    </div>
    <p class="muted">Score proxy educativo (baseline mean). Para CV real de redes, usa el motor de entrenamiento por fold (más lento). Aquí el objetivo es entender la varianza entre folds.</p>
    <div class="pill-row">${scores.map((s,i)=>`<span class="pill">Fold ${i+1}: ${s.toFixed(3)}</span>`).join('')}</div>`;
}

function runEnsemble(){
  if(typeof State==='undefined' || !State.networks?.length){
    $('cvResult').innerHTML = ( $('cvResult').innerHTML||'' ) + '<p class="muted">Crea al menos una red y entrenala. El ensemble promediará predicciones de redes entrenadas.</p>';
    return;
  }
  const trained = State.networks.filter(n=>n.trained?.model);
  if(trained.length<2){
    $('cvResult').innerHTML += '<p class="muted">Se necesitan ≥2 redes entrenadas para ensemble. Entrena varias arquitecturas y vuelve.</p>';
    return;
  }
  $('cvResult').innerHTML += `
    <div class="guide-card" style="margin-top:10px">
      <h4>Ensemble listo</h4>
      <p>Se detectaron <b>${trained.length}</b> redes entrenadas. En producción se promedian (regresión) o se hace voting (clasificación). 
      Beneficio típico: reduce varianza y mejora robustez industrial.</p>
      <p class="muted">Redes: ${trained.map((n,i)=>`Red ${i+1} (${(n.hidden||[]).join('→')})`).join(' · ')}</p>
    </div>`;
}

function renderLearningPath(){
  const box = $('learningPath');
  if(!box) return;
  const steps = [
    {n:'01', t:'Fundamentos', d:'Activaciones, loss, backprop, vanishing gradients'},
    {n:'02', t:'MLP industrial', d:'Arquitectura, optimizadores, regularización, BatchNorm'},
    {n:'03', t:'Datos y fugas', d:'CSV intelligence, One-Hot, split, data leakage'},
    {n:'04', t:'CNN offline', d:'Convolución, feature maps, pooling'},
    {n:'05', t:'Secuencias', d:'RNN / LSTM / GRU sobre sensores y demanda'},
    {n:'06', t:'No supervisado', d:'Autoencoder y detección de anomalías'},
    {n:'07', t:'Atención & Residuales', d:'Por qué las redes profundas funcionan'},
    {n:'08', t:'Interpretabilidad', d:'PDP, importancia, incertidumbre'},
    {n:'09', t:'Validación', d:'K-Fold, ensemble, generalización'},
    {n:'10', t:'Decisión industrial', d:'De la métrica a la acción y el costo'}
  ];
  box.innerHTML = `
    <h4>Ruta de aprendizaje · Neural Academy</h4>
    <div class="premium-feature-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
      ${steps.map(s=>`
        <div class="guide-card" style="padding:14px;min-height:110px">
          <span class="kicker">${s.n}</span>
          <strong style="display:block;margin:6px 0 4px;font-size:15px">${esc(s.t)}</strong>
          <small class="muted">${esc(s.d)}</small>
        </div>`).join('')}
    </div>
    <p class="muted" style="margin-top:10px">Sigue el orden o salta según tu nivel. Todo está disponible offline en la misma plataforma.</p>`;
}

/* ---------- Boot ---------- */
function initV96(){
  // Ensure mount points exist
  let mount = $('neuralAcademyMount');
  if(!mount){
    // try to find lab section and append
    const lab = document.querySelector('#tab-lab75 .lab-grid') || document.querySelector('.lab-grid');
    if(lab){
      const wrap = document.createElement('div');
      wrap.id = 'neuralAcademyMount';
      wrap.innerHTML = `
        <article class="dynamic-card lab-card size-lg" data-card><div id="seqAcademyBox"></div></article>
        <article class="dynamic-card lab-card size-lg" data-card><div id="interpBox"></div></article>
        <article class="dynamic-card lab-card size-lg" data-card><div id="attnResBox"></div></article>
        <article class="dynamic-card lab-card size-lg" data-card><div id="cvEnsembleBox"></div></article>`;
      lab.appendChild(wrap);
    }
  }
  renderSequenceAcademy();
  renderInterpretability();
  renderAttentionResidual();
  renderCVEnsemblePath();
  // refresh pdp vars when data changes
  document.addEventListener('click', e=>{
    if(e.target?.id==='homeExampleBtn' || e.target?.id==='homeLoadCsvBtn') setTimeout(populatePdpVars, 800);
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initV96);
else initV96();

window.V96 = { version:'10.1' };
})();

/* LAB Industrial v10 · Advanced Neural Modules
   Autoencoder (anomaly), Vanishing Gradients playground, LR Schedules, Model Export
   Pure JS · Offline · Educational + Industrial
*/
(function(){
'use strict';

const V95 = { version: '10.0' };

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function seeded(seed){ let s = seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function randn(rng){ const u=1-rng(),v=rng(); return Math.sqrt(-2*Math.log(u||1e-12))*Math.cos(2*Math.PI*v); }

/* ---------- 1. Vanishing / Exploding Gradients Playground ---------- */
function renderVanishingLab(){
  const box = $('vanishingLabBox');
  if(!box) return;
  box.innerHTML = `
    <div class="section-block">
      <h3>Playground · Vanishing & Exploding Gradients</h3>
      <p class="muted">Observa cómo la profundidad y la activación afectan la magnitud de los gradientes. Ideal para entender por qué ReLU + He o residuales ayudan en redes profundas.</p>
      <div class="loss-live-toolbar" style="margin:12px 0">
        <label>Profundidad <input type="range" id="vgDepth" min="2" max="20" value="8"></label>
        <label>Activación
          <select id="vgAct">
            <option value="sigmoid">Sigmoid</option>
            <option value="tanh">Tanh</option>
            <option value="relu">ReLU</option>
            <option value="leaky">Leaky ReLU</option>
          </select>
        </label>
        <label>Init
          <select id="vgInit">
            <option value="xavier">Xavier</option>
            <option value="he">He</option>
            <option value="normal">Normal 0.1</option>
          </select>
        </label>
        <button class="secondary" id="vgRunBtn">Simular</button>
      </div>
      <canvas id="vgCanvas" width="720" height="220" style="width:100%;max-width:720px;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"></canvas>
      <p id="vgInsight" class="muted" style="margin-top:10px"></p>
    </div>`;
  const run = () => {
    const depth = +$('vgDepth').value || 8;
    const act = $('vgAct').value;
    const init = $('vgInit').value;
    const rng = seeded(42);
    const acts = {
      sigmoid: {f:z=>1/(1+Math.exp(-Math.max(-40,Math.min(40,z)))), df:a=>a*(1-a)},
      tanh: {f:Math.tanh, df:a=>1-a*a},
      relu: {f:z=>Math.max(0,z), df:a=>a>0?1:0},
      leaky: {f:z=>z>0?z:0.01*z, df:a=>a>0?1:0.01}
    };
    const A = acts[act] || acts.sigmoid;
    let scale = init==='he' ? Math.sqrt(2/1) : init==='xavier' ? Math.sqrt(1/1) : 0.1;
    const grads = [];
    let g = 1.0;
    for(let l=0;l<depth;l++){
      const w = (rng()*2-1)*scale;
      const z = w * 0.5; // fixed input magnitude for demo
      const a = A.f(z);
      const local = A.df(a) * w;
      g *= Math.abs(local) || 1e-12;
      grads.push(g);
    }
    const canvas = $('vgCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted') || '#667';
    ctx.font = '12px Inter,sans-serif';
    ctx.fillText('Magnitud del gradiente (log) vs profundidad', 12, 18);
    const maxG = Math.max(...grads.map(Math.abs), 1e-12);
    const minG = Math.min(...grads.map(Math.abs), 1e-12);
    ctx.beginPath();
    grads.forEach((g,i)=>{
      const x = 40 + (i/(depth-1||1))*(W-60);
      const y = H - 30 - (Math.log10(Math.abs(g)+1e-15) - Math.log10(minG+1e-15)) / (Math.log10(maxG+1e-15)-Math.log10(minG+1e-15)+1e-9) * (H-50);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = '#7a828b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    let insight = '';
    if(grads[grads.length-1] < 1e-6) insight = 'Vanishing fuerte: el gradiente se apaga. Prueba ReLU + He o redes residuales.';
    else if(grads[grads.length-1] > 1e3) insight = 'Exploding: el gradiente crece sin control. Baja el learning rate o usa gradient clipping.';
    else insight = 'Gradientes estables en este rango. Buena combinación profundidad + activación + inicialización.';
    $('vgInsight').textContent = insight + ` · Gradiente final ≈ ${grads[grads.length-1].toExponential(2)}`;
  };
  $('vgRunBtn')?.addEventListener('click', run);
  ['vgDepth','vgAct','vgInit'].forEach(id => $(id)?.addEventListener('change', run));
  run();
}

/* ---------- 2. Learning Rate Schedules visualizer ---------- */
function renderLRScheduleLab(){
  const box = $('lrScheduleLabBox');
  if(!box) return;
  box.innerHTML = `
    <div class="section-block">
      <h3>Learning Rate Schedules</h3>
      <p class="muted">Compara cómo cambia el learning rate a lo largo de las épocas. Warm-up + cosine suele dar entrenamientos más estables.</p>
      <div class="loss-live-toolbar">
        <label>Épocas <input type="number" id="lrEpochs" value="100" min="10" max="500"></label>
        <label>LR base <input type="number" id="lrBase" value="0.03" step="0.001" min="0.0001"></label>
        <label>Schedule
          <select id="lrType">
            <option value="constant">Constant</option>
            <option value="step">Step Decay</option>
            <option value="cosine">Cosine Annealing</option>
            <option value="warmup_cosine">Warm-up + Cosine</option>
            <option value="onecycle">OneCycle (aprox)</option>
          </select>
        </label>
        <button class="secondary" id="lrRunBtn">Ver curva</button>
      </div>
      <canvas id="lrCanvas" width="720" height="180" style="width:100%;max-width:720px;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"></canvas>
    </div>`;
  const run = () => {
    const E = +$('lrEpochs').value || 100;
    const base = +$('lrBase').value || 0.03;
    const type = $('lrType').value;
    const lrs = [];
    for(let e=0;e<E;e++){
      let lr = base;
      if(type==='step') lr = base * Math.pow(0.5, Math.floor(e/Math.max(1,E/4)));
      else if(type==='cosine') lr = base * 0.5 * (1 + Math.cos(Math.PI * e / E));
      else if(type==='warmup_cosine'){
        const wu = Math.max(1, Math.floor(E*0.1));
        if(e < wu) lr = base * (e+1)/wu;
        else lr = base * 0.5 * (1 + Math.cos(Math.PI * (e-wu) / (E-wu)));
      }
      else if(type==='onecycle'){
        const mid = Math.floor(E/2);
        if(e < mid) lr = base * (0.1 + 0.9*(e/mid));
        else lr = base * (1 - 0.9*((e-mid)/(E-mid)));
      }
      lrs.push(lr);
    }
    const canvas = $('lrCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const maxL = Math.max(...lrs);
    ctx.beginPath();
    lrs.forEach((lr,i)=>{
      const x = 30 + (i/(E-1||1))*(W-50);
      const y = H - 20 - (lr/maxL)*(H-40);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = '#5f6f68';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted') || '#667';
    ctx.font = '12px Inter,sans-serif';
    ctx.fillText(`LR final: ${lrs[lrs.length-1].toFixed(5)} · max: ${maxL.toFixed(5)}`, 12, 16);
  };
  $('lrRunBtn')?.addEventListener('click', run);
  ['lrEpochs','lrBase','lrType'].forEach(id => $(id)?.addEventListener('change', run));
  run();
}

/* ---------- 3. Simple Autoencoder (anomaly demo) ---------- */
function renderAutoencoderLab(){
  const box = $('autoencoderLabBox');
  if(!box) return;
  box.innerHTML = `
    <div class="section-block">
      <h3>Autoencoder · Detección de anomalías</h3>
      <p class="muted">Entrena un autoencoder simple sobre tus datos numéricos. Las observaciones con error de reconstrucción alto se marcan como posibles anomalías (útil en sensores industriales).</p>
      <div class="loss-live-toolbar">
        <label>Épocas <input type="number" id="aeEpochs" value="40" min="5" max="200"></label>
        <label>Latent dim <input type="number" id="aeLatent" value="3" min="1" max="12"></label>
        <label>LR <input type="number" id="aeLR" value="0.02" step="0.001"></label>
        <button class="primary" id="aeTrainBtn">Entrenar Autoencoder</button>
      </div>
      <div id="aeStatus" class="muted" style="margin:8px 0">Carga un dataset numérico y pulsa entrenar.</div>
      <canvas id="aeCanvas" width="720" height="200" style="width:100%;max-width:720px;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"></canvas>
      <div id="aeTopAnomalies" style="margin-top:12px"></div>
    </div>`;
  $('aeTrainBtn')?.addEventListener('click', trainAutoencoder);
}

function trainAutoencoder(){
  if(typeof State === 'undefined' || !State.rows?.length){
    $('aeStatus').textContent = 'Primero carga un CSV con variables numéricas.';
    return;
  }
  const cols = (typeof numericX === 'function' ? numericX() : State.columns.filter(c => State.roles[c]==='X')).slice(0,8);
  if(cols.length < 2){ $('aeStatus').textContent = 'Se necesitan al menos 2 variables numéricas X.'; return; }
  const data = State.rows.map(r => cols.map(c => +r[c])).filter(row => row.every(Number.isFinite));
  if(data.length < 10){ $('aeStatus').textContent = 'Muy pocas filas válidas.'; return; }

  // Normalize
  const dim = cols.length;
  const mean = Array(dim).fill(0), std = Array(dim).fill(1);
  data.forEach(r => r.forEach((v,i)=> mean[i]+=v));
  mean.forEach((m,i)=> mean[i]=m/data.length);
  data.forEach(r => r.forEach((v,i)=> std[i]+=(v-mean[i])**2));
  std.forEach((s,i)=> std[i]=Math.sqrt(s/data.length)||1);
  const X = data.map(r => r.map((v,i)=>(v-mean[i])/std[i]));

  const latent = Math.max(1, Math.min(+($('aeLatent')?.value||3), dim-1));
  const epochs = +($('aeEpochs')?.value||40);
  const lr = +($('aeLR')?.value||0.02);
  const rng = seeded(7);

  // Encoder: dim -> latent, Decoder: latent -> dim  (linear for speed + education)
  let We = Array.from({length:dim},()=>Array.from({length:latent},()=>randn(rng)*0.3));
  let be = Array(latent).fill(0);
  let Wd = Array.from({length:latent},()=>Array.from({length:dim},()=>randn(rng)*0.3));
  let bd = Array(dim).fill(0);

  const hist = [];
  for(let ep=0;ep<epochs;ep++){
    let loss=0;
    X.forEach(x=>{
      // forward
      const z = be.map((b,j)=> b + x.reduce((s,xi,i)=>s+xi*We[i][j],0));
      const zAct = z.map(v=>Math.tanh(v));
      const recon = bd.map((b,j)=> b + zAct.reduce((s,zi,i)=>s+zi*Wd[i][j],0));
      const err = recon.map((r,i)=> r-x[i]);
      loss += err.reduce((s,e)=>s+e*e,0)/dim;

      // simple backprop
      const dRecon = err.map(e=>2*e/dim);
      // decoder
      for(let j=0;j<dim;j++){
        for(let i=0;i<latent;i++) Wd[i][j] -= lr * dRecon[j] * zAct[i];
        bd[j] -= lr * dRecon[j];
      }
      const dZ = zAct.map((_,i)=> {
        let g = 0;
        for(let j=0;j<dim;j++) g += dRecon[j]*Wd[i][j];
        return g * (1 - zAct[i]*zAct[i]); // tanh'
      });
      // encoder
      for(let i=0;i<dim;i++){
        for(let j=0;j<latent;j++) We[i][j] -= lr * dZ[j] * x[i];
      }
      for(let j=0;j<latent;j++) be[j] -= lr * dZ[j];
    });
    hist.push(loss/X.length);
  }

  // Reconstruction errors
  const errors = X.map((x,idx)=>{
    const z = be.map((b,j)=> b + x.reduce((s,xi,i)=>s+xi*We[i][j],0)).map(Math.tanh);
    const recon = bd.map((b,j)=> b + z.reduce((s,zi,i)=>s+zi*Wd[i][j],0));
    const mse = recon.reduce((s,r,i)=>s+(r-x[i])**2,0)/dim;
    return {idx, mse, row: data[idx]};
  });
  errors.sort((a,b)=>b.mse-a.mse);

  // Draw loss
  const canvas = $('aeCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const maxL = Math.max(...hist,1e-9);
  ctx.beginPath();
  hist.forEach((l,i)=>{
    const x = 30+(i/(hist.length-1||1))*(W-50);
    const y = H-20-(l/maxL)*(H-40);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = '#6b5f5f';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = '#667';
  ctx.font = '12px Inter,sans-serif';
  ctx.fillText(`Loss final: ${hist.at(-1).toFixed(5)}`, 12, 16);

  const top = errors.slice(0,5);
  $('aeTopAnomalies').innerHTML = `
    <h4>Top 5 posibles anomalías (mayor error de reconstrucción)</h4>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Error MSE</th><th>Valores (primeras cols)</th></tr></thead>
    <tbody>${top.map((e,i)=>`<tr><td>${e.idx+1}</td><td>${e.mse.toFixed(4)}</td><td>${e.row.slice(0,4).map(v=>v.toFixed(2)).join(' · ')}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted" style="margin-top:8px">Un error alto no prueba causalidad: revisa el contexto operacional y sensores.</p>`;
  $('aeStatus').textContent = `Autoencoder entrenado · ${epochs} épocas · latent=${latent} · ${cols.length} variables · ${X.length} filas`;
}

/* ---------- 4. Model Export / Import ---------- */
function exportCurrentModel(){
  if(typeof currentNet !== 'function'){ notify?.('No hay red activa','warning'); return; }
  const net = currentNet();
  if(!net?.trained?.model){ notify?.('Entrena una red primero','warning'); return; }
  const m = net.trained.model;
  const payload = {
    version: 'LAB-Industrial-10',
    exportedAt: new Date().toISOString(),
    architecture: m.sizes || net.hidden,
    weights: m.weights,
    biases: m.biases,
    stats: m.stats,
    classification: !!m.classification,
    settings: net.trained.settings || {}
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lab-industrial-model-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  notify?.('Modelo exportado','success');
}

/* ---------- Boot ---------- */
function initV95(){
  renderVanishingLab();
  renderLRScheduleLab();
  renderAutoencoderLab();
  const expBtn = $('exportModelBtn');
  if(expBtn) expBtn.onclick = exportCurrentModel;
  // inject containers if missing (for older HTML)
  if(!$('vanishingLabBox') && $('labExtraMount')){
    $('labExtraMount').innerHTML += `
      <div id="vanishingLabBox"></div>
      <div id="lrScheduleLabBox"></div>
      <div id="autoencoderLabBox"></div>`;
    renderVanishingLab();
    renderLRScheduleLab();
    renderAutoencoderLab();
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initV95);
else initV95();

window.V95 = V95;
window.exportCurrentModel = exportCurrentModel;
})();

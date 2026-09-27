"""Motor de entrenamiento en Python. Uso: pip install numpy && python server.py -> abre http://localhost:8000
El HTML envia los datos y la configuracion; Python entrena y devuelve historial + pesos; el HTML solo lo muestra."""
import json, numpy as np
from http.server import SimpleHTTPRequestHandler, HTTPServer
sig = lambda z: 1/(1+np.exp(-np.clip(z, -40, 40)))
ACT = {'tanh': (np.tanh, lambda a: 1-a*a), 'relu': (lambda z: np.maximum(0, z), lambda a: (a > 0)*1.0), 'sigmoid': (sig, lambda a: a*(1-a)),
       'leaky': (lambda z: np.where(z > 0, z, .01*z), lambda a: np.where(a > 0, 1., .01)),
       'elu': (lambda z: np.where(z > 0, z, np.exp(np.minimum(z, 0))-1), lambda a: np.where(a > 0, 1., a+1))}
pack = lambda W: [w.T.tolist() for w in W]

def loss_grad(y, p, k, cls):
    d = p-y
    if cls: return d
    return np.sign(d) if k == 'mae' else np.clip(d, -1, 1) if k == 'huber' else 2*d

def loss_val(y, p, k, cls):
    d = p-y
    if cls:
        q = np.clip(p, 1e-9, 1-1e-9); return float(np.mean(-(y*np.log(q)+(1-y)*np.log(1-q))))
    if k == 'mae': return float(np.mean(abs(d)))
    if k == 'huber': a = abs(d); return float(np.mean(np.where(a <= 1, .5*d*d, a-.5)))
    return float(np.mean(d*d))

def train(c):
    X, y = np.array(c['xtr']), np.array(c['ytr']).reshape(-1, 1)
    Xv, yv = np.array(c['xva']), np.array(c['yva']).reshape(-1, 1)
    S, cls, opt, lk = c['sizes'], c['cls'], c['opt'], c['loss']
    rng = np.random.default_rng(int(c.get('seed', 42))); FA = [ACT[a] for a in (c.get('acts') or [c['act']]*(len(S)-2))]; DR = c.get('drops') or [c['dropout']]*(len(S)-2)
    lim = lambda i, o: np.sqrt(6/i) if c['init'] == 'he' else np.sqrt(6/(i+o)) if c['init'] == 'xavier' else .5
    W = [rng.uniform(-lim(i, o), lim(i, o), (i, o)) for i, o in zip(S, S[1:])]; B = [np.zeros(o) for o in S[1:]]
    st, T = {}, [0]
    def upd(k, p, g, lr, dec):
        m, v = st.setdefault(k, [np.zeros_like(p), np.zeros_like(p)]); t = T[0]
        if dec and c['wd']: p *= 1-lr*c['wd']
        if opt == 'momentum': m[:] = .9*m-lr*g; p += m
        elif opt == 'nesterov': m[:] = .9*m-lr*g; p += .9*m-lr*g
        elif opt == 'adagrad': v += g*g; p -= lr*g/(np.sqrt(v)+1e-8)
        elif opt == 'rmsprop': v[:] = .9*v+.1*g*g; p -= lr*g/(np.sqrt(v)+1e-8)
        elif opt in ('adam', 'adamw'): m[:] = .9*m+.1*g; v[:] = .999*v+.001*g*g; p -= lr*(m/(1-.9**t))/(np.sqrt(v/(1-.999**t))+1e-8)
        elif opt == 'adamax': m[:] = .9*m+.1*g; v[:] = np.maximum(.999*v, abs(g)); p -= lr/(1-.9**t)*m/(v+1e-8)
        else: p -= lr*g
    def fwd(x, tr=False):
        A, R, M = [x], [], []
        for l in range(len(W)-1):
            a = FA[l][0](A[-1]@W[l]+B[l]); R.append(a)
            m = (rng.random(a.shape) > DR[l])/(1-DR[l]) if tr and DR[l] > 0 else np.ones_like(a)
            M.append(m); A.append(a*m)
        z = A[-1]@W[-1]+B[-1]
        return A, R, M, (sig(z) if cls else z)
    cl = lambda g: np.clip(g, -c['clip'], c['clip']) if c['clip'] else g
    tr, va, snaps, best, bi, bw, note, E = [], [], [], 1e30, 0, None, '', c['epochs']; every = max(1, E//60)
    for ep in range(E):
        lr = c['lr']/(1+c['decay']*ep); idx = rng.permutation(len(X))
        for s in range(0, len(X), c['bs']):
            b = idx[s:s+c['bs']]; xb = X[b]+(rng.uniform(-1, 1, X[b].shape)*c['noise'] if c['noise'] else 0)
            A, R, M, p = fwd(xb, True); d = loss_grad(y[b], p, lk, cls); n = len(b); T[0] += 1; gW = [None]*len(W); gB = [None]*len(W)
            for l in range(len(W)-1, -1, -1):
                gW[l] = A[l].T@d/n; gB[l] = d.sum(0)/n
                if l > 0: d = (d@W[l].T)*FA[l-1][1](R[l-1])*M[l-1]
            for l in range(len(W)):
                g = cl(gW[l])+c['l1']*np.sign(W[l])+2*c['l2']*W[l]
                upd(('w', l), W[l], g, lr, True); upd(('b', l), B[l], cl(gB[l]), lr, False)
        trl = loss_val(y, fwd(X)[3], lk, cls); vl = loss_val(yv, fwd(Xv)[3], lk, cls) if len(Xv) else trl
        tr.append(trl); va.append(vl)
        if not np.isfinite(trl): note = 'Divergió (loss no finita). Baja el learning rate o activa gradient clipping.'; break
        if vl < best-1e-9: best, bi, bw = vl, ep, ([w.copy() for w in W], [b.copy() for b in B])
        if ep % every == 0 or ep == E-1: snaps.append({'ep': ep+1, 'W': pack(W), 'B': [b.tolist() for b in B]})
        if c['es'] and ep-bi >= c['es']: note = f'Early stopping en la época {ep+1}.'; break
    if bw and (c['es'] or note): W, B = bw
    return {'tr': tr, 'va': va, 'best': best, 'bestEp': bi, 'note': note or 'Entrenado en Python.', 'W': pack(W), 'B': [b.tolist() for b in B], 'snaps': snaps}

class H(SimpleHTTPRequestHandler):
    def do_POST(self):
        try: out = train(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
        except Exception as e: out = {'error': str(e)}
        b = json.dumps(out).replace('NaN', 'null').replace('Infinity', '1e30').encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

if __name__ == '__main__':
    print('Abre http://localhost:8000 y elige Motor: Python'); HTTPServer(('', 8000), H).serve_forever()

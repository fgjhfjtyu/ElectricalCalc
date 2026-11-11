const path = require('path');
const A = path.join(__dirname, '../app/src/main/assets');
global.window = {};
const { CALCS } = require(path.join(A, 'calcs.js'));
eval(require('fs').readFileSync(path.join(A, 'data.js'), 'utf8').replace('window.DATA', 'global.DATA'));

function parseDefaults(fields) {
  const v = {};
  fields.forEach(f => {
    if (f.t === 'l') v[f.k] = String(f.d).split(/[\s;,،؛]+/).filter(Boolean).map(Number);
    else if (f.t === 's') v[f.k] = f.d;
    else v[f.k] = (f.d === '' || f.d === undefined) ? NaN : Number(f.d);
  });
  return v;
}
let bad = 0, ok = 0, nonfinite = 0;
for (let t = 1; t <= 50; t++) for (const s of ['dc', 'ac1', 'ac3']) {
  const C = CALCS[t];
  try {
    const o = C.c(parseDefaults(C.f(s)), s);
    o.r.forEach(x => { if (typeof x[1] === 'number' && !isFinite(x[1])) { nonfinite++; console.log('NONFINITE', t, s, x); } });
    ok++;
  } catch (e) { bad++; console.log('ERR', t, s, e.message); }
}
console.log('calc x system OK:', ok, 'errors:', bad, 'nonfinite:', nonfinite);

// عددهای مرجع
const eq = (a, b, tol = 1e-6) => { if (Math.abs(a - b) > tol * Math.max(1, Math.abs(b))) throw new Error(a + ' != ' + b); };
const run = (t, s, over) => { const C = CALCS[t]; const v = parseDefaults(C.f(s)); Object.assign(v, over); return C.c(v, s).r; };
eq(run(10, 'ac3', { V: 400, I: 10, pf: 0.8 })[0][1], Math.sqrt(3) * 400 * 10 * 0.8);
eq(run(10, 'dc', { V: 48, I: 10 })[0][1], 480);
eq(run(25, 'ac3', { f: 50, p: 4 })[0][1], 1500);
eq(run(26, 'ac3', { f: 50, p: 4, nr: 1450 })[0][1], 50 / 1500);
eq(run(27, 'ac3', { P: 15, n: 1450 })[0][1], 15000 / (2 * Math.PI * 1450 / 60));
eq(run(6, 'ac1', { f: 50, L: 100 })[0][1], 2 * Math.PI * 50 * 0.1);
eq(run(5, 'dc', { Rs: [10, 10] })[0][1], 5);
eq(run(50, 'ac3', { P: 500, pf1: 0.75, pf2: 0.95, V: 400, f: 50, conn: 'd' })[0][1], 500 * (Math.tan(Math.acos(.75)) - Math.tan(Math.acos(.95))), 1e-6);
eq(run(32, 'ac3', { V: 400, S: 1000, z: 6 })[0][1], 1000 * 100 / (Math.sqrt(3) * 400 * 6), 1e-6);
eq(run(17, 'ac3', { V: 400, I: 50, R: 0.1, X: 0.05, pf: 0.85 })[0][1], Math.sqrt(3) * 50 * (0.1 * 0.85 + 0.05 * Math.sqrt(1 - 0.85 * 0.85)));
eq(run(29, 'ac3', { P: 22, V: 400, pf: 0.85, eta: 92 })[0][1], 22000 / (Math.sqrt(3) * 400 * 0.85 * 0.92));
eq(run(13, 'ac3', { P: 80, Q: 60 })[0][1], 0.8);
eq(run(30, 'ac3', { In: 40, k: 6, st: 'yd' })[1][1], 80);
console.log('reference values OK');

// هر ۲۰۵۰ مورد
let entries = 0, fails = 0;
DATA.ents.forEach(([n, t, ci]) => {
  const s = DATA.cats[ci].s, C = CALCS[t];
  try { const o = C.c(parseDefaults(C.f(s)), s); if (!o.r.length) throw new Error('empty'); entries++; }
  catch (e) { fails++; console.log('ENTRY FAIL', n, t, s, e.message); }
});
console.log('entries computing with default values:', entries, '/', DATA.ents.length, 'fails:', fails);

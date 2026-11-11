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

// آزمون محاسبه‌گرهای یکپارچه (روابطی که قبلاً در چند عنوان/صفحه تکرار می‌شدند)
{
  let unifiedOk = 0, unifiedBad = 0;
  for (let t = 116; t <= 128; t++) {
    const C = CALCS[t];
    try {
      if (!C || typeof C.f !== 'function' || typeof C.c !== 'function') throw new Error('missing unified calculator');
      for (const sys of ['dc', 'ac1', 'ac3']) {
        const o = C.c(parseDefaults(C.f(sys)), sys);
        if (!o.r || !o.r.length) throw new Error('empty output');
        o.r.forEach(x => { if (typeof x[1] === 'number' && !isFinite(x[1])) throw new Error('nonfinite output'); });
      }
      unifiedOk++;
    } catch (e) { unifiedBad++; console.log('UNIFIED ERR', t, e.message); }
  }
  if (unifiedOk !== 13 || unifiedBad) throw new Error('unified calculator defaults failed');
}
// قانون اهم: هر دو جهت و محاسبه امپدانس از یک صفحه
 eq(run(116, 'ac3', { mode: 'i', V: 400, Z: 10 })[0][1], 400 / (Math.sqrt(3) * 10));
 eq(run(116, 'ac3', { mode: 'v', I: 10, Z: 10 })[0][1], Math.sqrt(3) * 100);
 eq(run(116, 'dc', { mode: 'z', V: 48, I: 6 })[0][1], 8);
 // یک رابطه امپدانس، خروجی اندازه و زاویه و PF را یکجا می‌دهد
 eq(run(117, 'ac1', { kind: 'parts', R: 3, XL: 4, XC: 1 })[0][1], Math.sqrt(18));
 eq(run(117, 'ac1', { kind: 'net', R: 3, X: 4 })[3][1], 0.6);
 // مثلث توان، چهار عنوان قبلی را پوشش می‌دهد
 eq(run(118, 'ac3', { mode: 'pq', P: 80, Q: 60 })[2][1], 100);
 eq(run(118, 'ac3', { mode: 'vi', V: 400, I: 10, pf: 0.8 })[0][1], Math.sqrt(3) * 400 * 10 * 0.8 / 1000);
 // افت و درصد افت در یک محاسبه‌گر
 eq(run(119, 'ac3', { V: 400, I: 10, R: 0.1, X: 0.05, pf: 0.8 })[1][1], 100 * Math.sqrt(3) * 10 * (0.1 * 0.8 + 0.05 * 0.6) / 400);
 // تصحیح دمای مقاومت و تلفات مسی/اهمی
 eq(run(120, 'dc', { mode: 'known', R1: 1, T1: 20, T2: 70, mat: 'cu' })[0][1], 1 + 0.00393 * 50);
 eq(run(121, 'ac3', { mode: 'current', I: 20, R: 0.5, n: 3 })[0][1], 600);
 eq(run(121, 'ac1', { mode: 'rated', Pr: 2000, b: 0.8 })[0][1], 1280);
 // فرکانس/ω، سرعت سنکرون/لغزش و توان/جریان موتور
 eq(run(122, 'ac1', { mode: 'electrical', f: 50 })[1][1], 20);
 eq(run(122, 'ac1', { mode: 'mechanical', n: 1500 })[2][1], 2 * Math.PI * 25);
 eq(run(123, 'ac3', { f: 50, p: 4, nr: 1450 })[3][1], 100 * (1500 - 1450) / 1500);
 eq(run(124, 'ac3', { mode: 'output', P: 22, V: 400, pf: 0.85, eta: 92 })[0][1], 22000 / (Math.sqrt(3) * 400 * 0.85 * 0.92));
 // ضریب همزمانی و تنوع از مجموعه داده مشترک
 eq(run(125, 'ac3', { Ds: [120, 80, 60, 100], Ds0: 280 })[1][1], 280 / 360);
 eq(run(125, 'ac3', { Ds: [120, 80, 60, 100], Ds0: 280 })[2][1], 360 / 280);
 // خطای نسبت CT و VT با یک رابطه
 eq(run(126, 'ac3', { kind: 'ct', K: 80, sec: 4.9, pri: 400 })[1][1], -2);
 eq(run(126, 'ac3', { kind: 'vt', K: 200, sec: 99.2, pri: 20000 })[1][1], -0.8);
 eq(run(124, 'ac3', { mode: 'efficiency', Pin: 100, Pout: 90 })[0][1], 90);
 // ضریب بارگذاری، بهره‌برداری و تقاضا یک خانواده نسبت مشترک‌اند
 eq(run(127, 'ac3', { mode: 'loading', actual: 320, rated: 400 })[0][1], 0.8);
 eq(run(127, 'ac3', { mode: 'loading', actual: 320, rated: 400 })[1][1], 80);
 eq(run(127, 'ac3', { mode: 'utilization', actual: 300, rated: 500 })[0][1], 0.6);
 eq(run(127, 'ac3', { mode: 'demand', actual: 300, rated: 450 })[0][1], 2 / 3);
 // چگالی جریان و سایزینگ کابل در یک صفحه با دو حالت
 eq(run(128, 'dc', { mode: 'density', I: 100, A: 25 })[0][1], 4);
 if (!(run(128, 'ac3', { mode: 'size', I: 100, Lm: 50, V: 400, dv: 3, J: 4, T: 70, mat: 'cu', pf: 0.85 })[2][1] > 0)) throw new Error('cable sizing failed');
 console.log('unified formula reference values OK');

// هر ۲۰۵۰ مورد
let entries = 0, fails = 0;
DATA.ents.forEach(([n, t, ci]) => {
  const s = DATA.cats[ci].s, C = CALCS[t];
  try { const o = C.c(parseDefaults(C.f(s)), s); if (!o.r.length) throw new Error('empty'); entries++; }
  catch (e) { fails++; console.log('ENTRY FAIL', n, t, s, e.message); }
});
console.log('entries computing with default values:', entries, '/', DATA.ents.length, 'fails:', fails);

// همه محاسبه‌گرهای تخصصی (۵۱ تا ۱۱۵) و پیوندهای موضوعی
{
  let b = 0, count = 0;
  for (let t = 51; t <= 115; t++) {
    if (t === 109 || t === 110) continue; // روابط CT/VT در C[126] ادغام شده‌اند
    const C = CALCS[t];
    try {
      if (!C || !C.x || typeof C.name !== 'string') throw new Error('تعریف تخصصی ناقص است');
      const o = C.c(parseDefaults(C.f('ac3')), 'ac3');
      if (!o.r || !o.r.length) throw new Error('خروجی خالی');
      o.r.forEach(x => { if (typeof x[1] === 'number' && !isFinite(x[1])) throw new Error('nonfinite'); });
      count++;
    } catch (e) { b++; console.log('SP ERR', t, e.message); }
  }
  const linked = new Set();
  Object.keys(global.window.SP_MAP || {}).forEach(ci => (global.window.SP_MAP[ci] || []).forEach(t => {
    linked.add(t);
    if (!CALCS[t] || !CALCS[t].name) { b++; console.log('SP MAP ERR', ci, t); }
  }));
  for (let t = 51; t <= 115; t++) if (t !== 109 && t !== 110 && !linked.has(t)) { b++; console.log('SP ORPHAN', t); }
  if (!linked.has(126) || !CALCS[126] || !CALCS[126].name) { b++; console.log('CT/VT MERGE MISSING'); }
  console.log('تخصصی معتبر و لینک‌شده:', count + 1, '/ 64 قدیمی، خطا:', b);
  if (count !== 63 || b) throw new Error('specialist coverage failure');
}

// چند مرجع عددی برای روابط تخصصی جدید
 eq(run(63, 'ac3', { S: 100, P0: 1, Pcu: 4, x: 0.5, pf: 1 })[3][1], 100 * 50 / 52);
 eq(run(64, 'ac3', { P0: 1, Pcu: 4, S: 100, pf: 1 })[0][1], 0.5);
 eq(run(65, 'ac3', { S1: 1000, z1: 5, S2: 500, z2: 5, SL: 900 })[0][1], 600);
 eq(run(67, 'ac3', { V: 400, f: 50, N: 500, A: 100 })[1][1], 400 / (4.44 * 50 * 500) / 0.01);
 eq(run(79, 'ac3', { L: 1, C: 1, V: 400 })[1][1], 160000 / Math.sqrt(1e-3 / 1e-6));
 eq(run(82, 'ac3', { S: 100, V: 20, Z: 4 })[2][1], 1);
 eq(run(86, 'ac3', { Ik: 10, XR: 10 })[1][1], (1.02 + 0.98 * Math.exp(-0.3)) * Math.SQRT2 * 10);
 eq(run(93, 'ac3', { Vac: 230, f: 50, Idc: 5, Vd: 0.8 })[0][1], 0.9 * 230 - 1.6);
 eq(run(94, 'ac3', { V: 400, f: 50, Idc: 20, Vd: 0.9 })[0][1], 1.35 * 400 - 1.8);
 eq(run(96, 'ac3', { Vin: 48, Vo: 12, Io: 5, eta: 92 })[0][1], 0.25);
 eq(run(97, 'ac3', { Vin: 12, Vo: 48, Io: 2, eta: 90 })[0][1], 0.75);
 eq(run(104, 'ac3', { Q: 2, H: 50, eta: 100, rho: 1000 })[1][1], 1000 * 9.80665 * 2 * 50 / 1000);
 eq(run(111, 'ac3', { N: 10000, Ni: 2500, Nh: 5000 })[0][1], 0.25);


// ابزارهای افزوده‌شده از تصاویر (۱۲۹ تا ۱۴۴)
{
  let n=0;
  for(let t=129;t<=150;t++){ const c=CALCS[t]; if(!c||!c.x||!c.name) throw new Error('missing added calculator '+t); const o=c.c(parseDefaults(c.f('ac3')),'ac3'); if(!o.r||!o.r.length) throw new Error('empty added calculator '+t); o.r.forEach(x=>{if(typeof x[1]==='number'&&!isFinite(x[1])) throw new Error('nonfinite added calculator '+t);}); n++; }
  if(n!==22) throw new Error('added calculator count mismatch');
  eq(run(129,'ac3',{d1:1,d2:0,d3:0,m:2,bands:'4',tol:'5'})[0][1],1000);
  eq(run(130,'ac3',{code:472,digits:'3'})[0][1],4700);
  eq(run(131,'ac3',{code:104,tol:10})[0][1],100000);
  eq(run(132,'dc',{Vs:12,Vf:2,n:3,I:20,branches:1})[0][1],300);
  eq(run(133,'dc',{Ah:100,V:12,P:60,eta:90,dod:80})[1][1],14.4);
  eq(run(135,'ac3',{cams:8,bitrate:4,days:30,hours:24,over:0})[0][1],32);
  eq(run(137,'ac3',{sig:'ma',meas:12,lo:0,hi:100,min:4,max:20})[1][1],50);
  eq(run(141,'ac3',{Qn:25,Vn:440,V:400,f:50,f2:50})[0][1],25*Math.pow(400/440,2));
  console.log('۲۲ ابزار تکمیلی و مقادیر مرجع: OK');
}

eq(run(145,'dc',{It:10,R1:10,R2:20})[0][1],10*2/3);
eq(run(147,'dc',{Vs:24,Vload:12,I:0.5})[1][1],24);

eq(run(149,'ac1',{U:230,Zs:0.2,rho:0.01724,A:2.5,L:50,Ia:80})[1][1],230/(0.2+2*0.01724*50/2.5));

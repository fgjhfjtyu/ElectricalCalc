// ۵۰ ماشین‌حساب پایه. هر کدام برای سه سیستم کار می‌کند: dc ، ac1 (تک‌فاز) ، ac3 (سه‌فاز)
(function (root) {
  var SQ3 = Math.sqrt(3), PI = Math.PI;
  var kV = function (s) { return s === 'ac3' ? SQ3 : 1; };      // ضریب توان/جریان
  var kD = function (s) { return s === 'ac3' ? SQ3 : 2; };      // ضریب افت ولتاژ (رفت و برگشت)
  var isAC = function (s) { return s !== 'dc'; };
  var rad = function (x) { return x * 180 / PI; };

  var N = function (k, l, d, o) { return Object.assign({ k: k, l: l, d: d, t: 'n' }, o || {}); };
  var L = function (k, l, d) { return { k: k, l: l, d: d, t: 'l' }; };
  var SEL = function (k, l, opts, d) { return { k: k, l: l, t: 's', opts: opts, d: d }; };
  var PF = function (s) { return isAC(s) ? [N('pf', 'ضریب توان (cosφ)', 0.85)] : []; };
  var MAT = { cu: { rho: 0.01724, a: 0.00393 }, al: { rho: 0.02826, a: 0.00403 } };
  var MATSEL = function () { return SEL('mat', 'جنس هادی', [['cu', 'مس'], ['al', 'آلومینیوم']], 'cu'); };

  function has(x) { return typeof x === 'number' && isFinite(x); }
  function need(v) {
    for (var i = 1; i < arguments.length; i++) {
      if (!has(v[arguments[i]])) throw new Error('مقدار «' + arguments[i] + '» را وارد کنید.');
    }
  }
  function pos(v) {
    for (var i = 1; i < arguments.length; i++) {
      if (!(v[arguments[i]] > 0)) throw new Error('مقدار «' + arguments[i] + '» باید بزرگ‌تر از صفر باشد.');
    }
  }
  function cosf(v, s) {
    if (!isAC(s)) return 1;
    need(v, 'pf');
    if (v.pf <= 0 || v.pf > 1) throw new Error('ضریب توان باید بین ۰ و ۱ باشد.');
    return v.pf;
  }
  function sinf(c) { return Math.sqrt(Math.max(0, 1 - c * c)); }
  function nextStd(x, list) {
    for (var i = 0; i < list.length; i++) if (list[i] >= x) return list[i];
    return null;
  }
  var STD_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630];
  var STD_KVA = [25, 50, 63, 100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000];

  var C = {};

  C[1] = { f: function (s) { return [N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('Z', s === 'dc' ? 'مقاومت (Ω)' : 'امپدانس هر فاز (Ω)', 10)]; },
    c: function (v, s) { need(v, 'V', 'Z'); pos(v, 'Z'); return { r: [['جریان I', v.V / (kV(s) * v.Z), 'A']], fm: s === 'ac3' ? 'I = V_L / (√3·Z)   (اتصال ستاره)' : 'I = V / Z' }; } };

  C[2] = { f: function (s) { return [N('I', 'جریان (A)', 10), N('Z', s === 'dc' ? 'مقاومت (Ω)' : 'امپدانس هر فاز (Ω)', 10)]; },
    c: function (v, s) { need(v, 'I', 'Z'); return { r: [['ولتاژ V', kV(s) * v.I * v.Z, 'V']], fm: s === 'ac3' ? 'V_L = √3·I·Z' : 'V = I·Z' }; } };

  C[3] = { f: function (s) { return isAC(s) ? [N('R', 'مقاومت R (Ω)', 4), N('XL', 'راکتانس القایی XL (Ω)', 6), N('XC', 'راکتانس خازنی XC (Ω)', 2)] : [N('R', 'مقاومت (Ω)', 4)]; },
    c: function (v, s) {
      need(v, 'R'); var XL = isAC(s) ? (v.XL || 0) : 0, XC = isAC(s) ? (v.XC || 0) : 0, X = XL - XC;
      var r = [['امپدانس |Z|', Math.hypot(v.R, X), 'Ω']];
      if (isAC(s)) { r.push(['راکتانس خالص X', X, 'Ω']); r.push(['زاویه φ', rad(Math.atan2(X, v.R)), '°']); }
      return { r: r, fm: 'Z = √(R² + (XL − XC)²)  (اتصال سری)' };
    } };

  C[4] = { f: function () { return [L('Rs', 'مقاومت‌ها (با فاصله یا ; جدا کنید)', '10 20 30')]; },
    c: function (v) { if (!v.Rs.length) throw new Error('حداقل یک مقدار وارد کنید.'); var t = v.Rs.reduce(function (a, b) { return a + b; }, 0); return { r: [['مقاومت معادل سری', t, 'Ω'], ['تعداد', v.Rs.length, '']], fm: 'R_eq = R₁ + R₂ + … + Rₙ' }; } };

  C[5] = { f: function () { return [L('Rs', 'مقاومت‌ها (با فاصله یا ; جدا کنید)', '10 20 30')]; },
    c: function (v) {
      if (!v.Rs.length) throw new Error('حداقل یک مقدار وارد کنید.');
      if (v.Rs.some(function (x) { return x < 0; })) throw new Error('مقاومت منفی معنا ندارد.');
      if (v.Rs.some(function (x) { return x === 0; })) return { r: [['مقاومت معادل موازی', 0, 'Ω']], fm: 'یکی از شاخه‌ها اتصال کوتاه است' };
      var g = v.Rs.reduce(function (a, b) { return a + 1 / b; }, 0);
      return { r: [['مقاومت معادل موازی', 1 / g, 'Ω']], fm: '1/R_eq = 1/R₁ + 1/R₂ + … + 1/Rₙ' };
    } };

  C[6] = { f: function (s) { return isAC(s) ? [N('f', 'فرکانس (Hz)', 50), N('L', 'اندوکتانس (mH)', 100)] : [N('L', 'اندوکتانس (mH)', 100)]; },
    c: function (v, s) { need(v, 'L'); var f = isAC(s) ? v.f : 0; if (isAC(s)) need(v, 'f'); return { r: [['راکتانس القایی XL', 2 * PI * f * v.L / 1000, 'Ω']], fm: 'XL = 2π·f·L', nt: isAC(s) ? '' : 'در DC پایدار (f=0) راکتانس القایی صفر است.' }; } };

  C[7] = { f: function (s) { return isAC(s) ? [N('f', 'فرکانس (Hz)', 50), N('C', 'ظرفیت (µF)', 100)] : [N('C', 'ظرفیت (µF)', 100)]; },
    c: function (v, s) {
      need(v, 'C'); pos(v, 'C');
      if (!isAC(s)) return { r: [['راکتانس خازنی XC', '∞', 'Ω']], fm: 'XC = 1/(2π·f·C) ، f → 0', nt: 'در DC پایدار، خازن مدار باز است.' };
      need(v, 'f'); pos(v, 'f');
      return { r: [['راکتانس خازنی XC', 1 / (2 * PI * v.f * v.C * 1e-6), 'Ω']], fm: 'XC = 1 / (2π·f·C)' };
    } };

  C[8] = { f: function (s) { return isAC(s) ? [N('R', 'قسمت حقیقی R (Ω)', 3), N('X', 'قسمت موهومی X (Ω)', 4)] : [N('R', 'مقاومت (Ω)', 3)]; },
    c: function (v, s) {
      need(v, 'R'); var X = isAC(s) ? (v.X || 0) : 0;
      var m = Math.hypot(v.R, X), a = rad(Math.atan2(X, v.R));
      return { r: [['اندازه |Z|', m, 'Ω'], ['زاویه θ', a, '°'], ['شکل قطبی', m.toPrecision(5) + ' ∠ ' + a.toFixed(2) + '°', '']], fm: 'Z = R + jX ، |Z| = √(R²+X²)' };
    } };

  C[9] = { f: function (s) { return isAC(s) ? [N('R', 'مقاومت R (Ω)', 3), N('X', 'راکتانس X (Ω)', 4)] : [N('R', 'مقاومت (Ω)', 3)]; },
    c: function (v, s) {
      need(v, 'R'); var X = isAC(s) ? (v.X || 0) : 0, p = Math.atan2(X, v.R);
      return { r: [['زاویه فاز φ', rad(p), '°'], ['ضریب توان cosφ', Math.cos(p), ''], ['نوع بار', X > 0 ? 'القایی (پس‌فاز)' : X < 0 ? 'خازنی (پیش‌فاز)' : 'مقاومتی', '']], fm: 'φ = arctan(X / R)' };
    } };

  C[10] = { f: function (s) { return [N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('I', 'جریان (A)', 10)].concat(PF(s)); },
    c: function (v, s) { need(v, 'V', 'I'); var P = kV(s) * v.V * v.I * cosf(v, s); return { r: [['توان اکتیو P', P, 'W'], ['توان اکتیو P', P / 1000, 'kW']], fm: s === 'dc' ? 'P = V·I' : s === 'ac1' ? 'P = V·I·cosφ' : 'P = √3·V_L·I_L·cosφ' }; } };

  C[11] = { f: C[10] ? function (s) { return [N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('I', 'جریان (A)', 10)].concat(PF(s)); } : null,
    c: function (v, s) { need(v, 'V', 'I'); var c = cosf(v, s), Q = isAC(s) ? kV(s) * v.V * v.I * sinf(c) : 0; return { r: [['توان راکتیو Q', Q, 'var'], ['توان راکتیو Q', Q / 1000, 'kvar']], fm: s === 'ac3' ? 'Q = √3·V_L·I_L·sinφ' : 'Q = V·I·sinφ', nt: isAC(s) ? '' : 'در DC توان راکتیو وجود ندارد (Q=0).' }; } };

  C[12] = { f: C[11].f,
    c: function (v, s) { need(v, 'V', 'I'); var S = kV(s) * v.V * v.I; return { r: [['توان ظاهری S', S, 'VA'], ['توان ظاهری S', S / 1000, 'kVA']], fm: s === 'ac3' ? 'S = √3·V_L·I_L' : 'S = V·I', nt: isAC(s) ? '' : 'در DC برابر P است.' }; } };

  C[13] = { f: function () { return [N('P', 'توان اکتیو P (kW)', 80), N('Q', 'توان راکتیو Q (kvar) — اختیاری', 60, { opt: 1 }), N('S', 'توان ظاهری S (kVA) — اختیاری', '', { opt: 1 })]; },
    c: function (v) {
      need(v, 'P'); var S, Q;
      if (has(v.Q)) { Q = v.Q; S = Math.hypot(v.P, Q); }
      else if (has(v.S)) { if (v.S < Math.abs(v.P)) throw new Error('S نمی‌تواند از P کوچک‌تر باشد.'); S = v.S; Q = Math.sqrt(S * S - v.P * v.P); }
      else throw new Error('Q یا S را وارد کنید.');
      var pf = S === 0 ? 1 : v.P / S;
      return { r: [['ضریب توان', pf, ''], ['زاویه φ', rad(Math.acos(Math.min(1, pf))), '°'], ['S', S, 'kVA'], ['Q', Q, 'kvar']], fm: 'PF = P / S = cosφ' };
    } };

  C[14] = { f: function () { return [N('P', 'توان (kW)', 15), N('t', 'مدت (ساعت)', 8)]; },
    c: function (v) { need(v, 'P', 't'); return { r: [['انرژی', v.P * v.t, 'kWh'], ['انرژی', v.P * v.t * 3.6, 'MJ']], fm: 'E = P·t' }; } };

  C[15] = { f: function () { return [N('Po', 'توان خروجی (kW)', 90), N('Pi', 'توان ورودی (kW)', 100)]; },
    c: function (v) { need(v, 'Po', 'Pi'); pos(v, 'Pi'); return { r: [['بازده η', 100 * v.Po / v.Pi, '%'], ['تلفات', v.Pi - v.Po, 'kW']], fm: 'η = P_out / P_in × 100' }; } };

  C[16] = { f: function (s) { return [N('I', 'جریان (A)', 20), N('R', 'مقاومت هر هادی (Ω)', 0.5), N('n', 'تعداد هادی‌های حامل جریان', s === 'ac3' ? 3 : 2)]; },
    c: function (v) { need(v, 'I', 'R', 'n'); var P = v.n * v.I * v.I * v.R; return { r: [['تلفات اهمی', P, 'W'], ['تلفات اهمی', P / 1000, 'kW']], fm: 'P_loss = n·I²·R' }; } };

  C[17] = { f: function (s) { return [N('V', s === 'ac3' ? 'ولتاژ خط مبدأ (V) — اختیاری' : 'ولتاژ مبدأ (V) — اختیاری', 400, { opt: 1 }), N('I', 'جریان (A)', 50), N('R', 'مقاومت هر هادی (Ω)', 0.1)].concat(isAC(s) ? [N('X', 'راکتانس هر هادی (Ω)', 0.05)] : []).concat(PF(s)); },
    c: function (v, s) {
      need(v, 'I', 'R'); var c = cosf(v, s), X = isAC(s) ? (v.X || 0) : 0;
      var dv = kD(s) * v.I * (v.R * c + X * sinf(c));
      var r = [['افت ولتاژ ΔV', dv, 'V']];
      if (has(v.V)) r.push(['ولتاژ انتهای خط', v.V - dv, 'V']);
      return { r: r, fm: s === 'ac3' ? 'ΔV = √3·I·(R·cosφ + X·sinφ)' : s === 'ac1' ? 'ΔV = 2·I·(R·cosφ + X·sinφ)' : 'ΔV = 2·I·R' };
    } };

  C[18] = { f: C[17].f,
    c: function (v, s) { need(v, 'V', 'I', 'R'); pos(v, 'V'); var o = C[17].c(v, s); var dv = o.r[0][1]; return { r: [['افت ولتاژ ΔV', dv, 'V'], ['درصد افت ولتاژ', 100 * dv / v.V, '%']], fm: 'ΔV% = ΔV / V × 100' }; } };

  C[19] = { f: function () { return [N('I', 'جریان (A)', 100), N('A', 'سطح مقطع (mm²)', 35)]; },
    c: function (v) { need(v, 'I', 'A'); pos(v, 'A'); return { r: [['چگالی جریان J', v.I / v.A, 'A/mm²']], fm: 'J = I / A' }; } };

  C[20] = { f: function (s) { return [N('I', 'جریان (A)', 100), N('Lm', 'طول (m)', 100), N('V', 'ولتاژ (V)', 400), N('dv', 'حداکثر افت مجاز (%)', 3), N('J', 'حداکثر چگالی جریان (A/mm²)', 4), N('T', 'دمای هادی (°C)', 70), MATSEL()].concat(PF(s)); },
    c: function (v, s) {
      need(v, 'I', 'Lm', 'V', 'dv', 'J', 'T'); pos(v, 'V', 'dv', 'J'); var c = cosf(v, s), m = MAT[v.mat || 'cu'];
      var rho = m.rho * (1 + m.a * (v.T - 20));
      var Av = kD(s) * rho * v.Lm * v.I * c / (v.V * v.dv / 100), Aj = v.I / v.J, A = Math.max(Av, Aj);
      return { r: [['مقطع از افت ولتاژ', Av, 'mm²'], ['مقطع از چگالی جریان', Aj, 'mm²'], ['مقطع لازم', A, 'mm²'], ['اندازه استاندارد بعدی', nextStd(A, STD_MM2) || 'بیش از ۶۳۰', 'mm²']], fm: 'A = kD·ρ_T·L·I·cosφ / ΔV_مجاز ، A ≥ I / J', nt: 'راکتانس کابل در نظر گرفته نشده؛ ظرفیت جریان مجاز (جدول استاندارد) را جدا بررسی کنید.' };
    } };

  C[21] = { f: function () { return [N('Lm', 'طول (m)', 100), N('A', 'سطح مقطع (mm²)', 16), N('T', 'دما (°C)', 70), MATSEL()]; },
    c: function (v) {
      need(v, 'Lm', 'A', 'T'); pos(v, 'A'); var m = MAT[v.mat || 'cu'], R20 = m.rho * v.Lm / v.A;
      return { r: [['مقاومت در ۲۰°C', R20, 'Ω'], ['مقاومت در دمای کاری', R20 * (1 + m.a * (v.T - 20)), 'Ω']], fm: 'R_T = ρ₂₀·L/A · [1 + α·(T − 20)]' };
    } };

  C[22] = { f: function () { return [N('R1', 'مقاومت در T₁ (Ω)', 1), N('T1', 'دمای T₁ (°C)', 20), N('T2', 'دمای T₂ (°C)', 75), MATSEL()]; },
    c: function (v) {
      need(v, 'R1', 'T1', 'T2'); var a = MAT[v.mat || 'cu'].a, R2 = v.R1 * (1 + a * (v.T2 - 20)) / (1 + a * (v.T1 - 20));
      return { r: [['مقاومت در T₂', R2, 'Ω'], ['تغییر', R2 - v.R1, 'Ω'], ['تغییر نسبی', 100 * (R2 - v.R1) / v.R1, '%']], fm: 'R₂ = R₁·[1+α(T₂−20)] / [1+α(T₁−20)]' };
    } };

  C[23] = { f: function () { return [N('f', 'فرکانس (Hz) — اختیاری', 50, { opt: 1 }), N('T', 'دوره تناوب (ms) — اختیاری', '', { opt: 1 })]; },
    c: function (v) {
      var f; if (has(v.f)) f = v.f; else if (has(v.T)) { pos(v, 'T'); f = 1000 / v.T; } else throw new Error('f یا T را وارد کنید.');
      pos({ f: f }, 'f'); return { r: [['فرکانس f', f, 'Hz'], ['دوره تناوب T', 1000 / f, 'ms']], fm: 'T = 1 / f' };
    } };

  C[24] = { f: function () { return [N('f', 'فرکانس (Hz) — اختیاری', 50, { opt: 1 }), N('n', 'سرعت دورانی (rpm) — اختیاری', '', { opt: 1 })]; },
    c: function (v) {
      var w; if (has(v.f)) w = 2 * PI * v.f; else if (has(v.n)) w = 2 * PI * v.n / 60; else throw new Error('f یا n را وارد کنید.');
      return { r: [['سرعت زاویه‌ای ω', w, 'rad/s'], ['معادل دور بر دقیقه', w * 60 / (2 * PI), 'rpm']], fm: 'ω = 2π·f = 2π·n / 60' };
    } };

  C[25] = { f: function () { return [N('f', 'فرکانس (Hz)', 50), N('p', 'تعداد قطب‌ها', 4)]; },
    c: function (v) { need(v, 'f', 'p'); pos(v, 'p'); var ns = 120 * v.f / v.p; return { r: [['سرعت سنکرون n_s', ns, 'rpm'], ['ω_s', 2 * PI * ns / 60, 'rad/s']], fm: 'n_s = 120·f / p' }; } };

  C[26] = { f: function () { return [N('f', 'فرکانس (Hz)', 50), N('p', 'تعداد قطب‌ها', 4), N('nr', 'سرعت روتور (rpm)', 1450)]; },
    c: function (v) {
      need(v, 'f', 'p', 'nr'); pos(v, 'p'); var ns = 120 * v.f / v.p; pos({ ns: ns }, 'ns'); var s = (ns - v.nr) / ns;
      return { r: [['لغزش s', s, ''], ['لغزش', 100 * s, '%'], ['n_s', ns, 'rpm'], ['فرکانس روتور', Math.abs(s) * v.f, 'Hz']], fm: 's = (n_s − n_r) / n_s', nt: s < 0 ? 'لغزش منفی = کار در حالت ژنراتوری.' : '' };
    } };

  C[27] = { f: function () { return [N('P', 'توان الکترومغناطیسی/فاصله هوایی (kW)', 15), N('n', 'سرعت (rpm)', 1450)]; },
    c: function (v) { need(v, 'P', 'n'); pos(v, 'n'); var w = 2 * PI * v.n / 60; return { r: [['گشتاور T', v.P * 1000 / w, 'N·m'], ['گشتاور T', v.P * 1000 / w / 9.80665, 'kgf·m']], fm: 'T = P / ω = 9550·P(kW) / n(rpm)' }; } };

  C[28] = { f: function (s) { return [N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('I', 'جریان (A)', 30)].concat(PF(s)).concat([N('eta', 'بازده (%)', 92)]); },
    c: function (v, s) { need(v, 'V', 'I', 'eta'); var Pin = kV(s) * v.V * v.I * cosf(v, s), Po = Pin * v.eta / 100; return { r: [['توان ورودی', Pin / 1000, 'kW'], ['توان محور', Po / 1000, 'kW'], ['توان محور', Po / 746, 'hp']], fm: 'P_shaft = P_in · η' }; } };

  C[29] = { f: function (s) { return [N('P', 'توان خروجی (kW)', 22), N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400)].concat(PF(s)).concat([N('eta', 'بازده (%)', 92)]); },
    c: function (v, s) { need(v, 'P', 'V', 'eta'); pos(v, 'V', 'eta'); var I = v.P * 1000 / (kV(s) * v.V * cosf(v, s) * v.eta / 100); return { r: [['جریان نامی I_n', I, 'A']], fm: 'I = P / (k·V·cosφ·η)   ,   k = √3 (سه‌فاز) یا 1', nt: 'برای ترانس/ژنراتور با S بر حسب kVA: بازده ۱۰۰ و cosφ=۱ بگذارید.' }; } };

  var STARTERS = [['dol', 'مستقیم (DOL)'], ['yd', 'ستاره–مثلث'], ['at80', 'اتوترانس ۸۰٪'], ['at65', 'اتوترانس ۶۵٪'], ['at50', 'اتوترانس ۵۰٪']];
  var STF = { dol: 1, yd: 1 / 3, at80: 0.64, at65: 0.4225, at50: 0.25 };
  C[30] = { f: function () { return [N('In', 'جریان نامی (A)', 40), N('k', 'نسبت Ist/In در راه‌اندازی مستقیم', 6), SEL('st', 'روش راه‌اندازی', STARTERS, 'dol')]; },
    c: function (v) { need(v, 'In', 'k'); var f = STF[v.st || 'dol']; return { r: [['جریان راه‌اندازی مستقیم', v.In * v.k, 'A'], ['جریان راه‌اندازی با روش انتخابی', v.In * v.k * f, 'A'], ['نسبت گشتاور راه‌اندازی', f, 'برابر مستقیم']], fm: 'I_st = k·I_n · (ضریب روش)  ،  Y-Δ: ⅓  ،  اتوترانس: tap²' }; } };

  C[31] = { f: function (s) { return [N('In', 'جریان نامی (A)', 40), N('p0', 'جریان بی‌باری (% جریان نامی)', 30)].concat(isAC(s) ? [N('V', 'ولتاژ (V) — اختیاری', 400, { opt: 1 }), N('P0', 'توان بی‌باری (W) — اختیاری', 600, { opt: 1 })] : []); },
    c: function (v, s) {
      need(v, 'In', 'p0'); var I0 = v.In * v.p0 / 100, r = [['جریان بی‌باری I₀', I0, 'A']];
      if (isAC(s) && has(v.V) && has(v.P0) && v.V > 0 && I0 > 0) {
        var c0 = v.P0 / (kV(s) * v.V * I0);
        if (c0 <= 1) { var Ic = I0 * c0; r.push(['cosφ₀', c0, '']); r.push(['مؤلفه تلفات I_c', Ic, 'A']); r.push(['مؤلفه مغناطیسی I_m', Math.sqrt(Math.max(0, I0 * I0 - Ic * Ic)), 'A']); }
      }
      return { r: r, fm: 'I₀ = I_n · (%I₀)  ،  I_c = I₀·cosφ₀  ،  I_m = √(I₀² − I_c²)' };
    } };

  C[32] = { f: function (s) { return s === 'dc' ? [N('V', 'ولتاژ منبع (V)', 48), N('R', 'مقاومت کل مسیر (Ω)', 0.05)] : [N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('S', 'توان نامی (kVA)', 1000), N('z', 'امپدانس اتصال کوتاه z (%)', 6)]; },
    c: function (v, s) {
      if (s === 'dc') { need(v, 'V', 'R'); pos(v, 'R'); return { r: [['جریان اتصال کوتاه', v.V / v.R, 'A']], fm: 'I_sc = V / R_total' }; }
      need(v, 'V', 'S', 'z'); pos(v, 'V', 'z'); var I = v.S * 1000 * 100 / (kV(s) * v.V * v.z);
      return { r: [['جریان اتصال کوتاه متقارن', I / 1000, 'kA'], ['توان اتصال کوتاه', kV(s) * v.V * I / 1e6, 'MVA'], ['قله تقریبی (κ=1.8)', 1.8 * Math.SQRT2 * I / 1000, 'kA']], fm: 'I_sc = S·100 / (k·V·z%)   ،   i_p ≈ κ·√2·I_sc', nt: 'روش ساده با منبع بی‌نهایت؛ برای محاسبه کامل IEC 60909 کافی نیست.' };
    } };

  C[33] = { f: function () { return [N('Vn', 'ولتاژ نامی (V)', 400), N('tol', 'تلرانس مجاز (±%)', 10)]; },
    c: function (v, s) { need(v, 'Vn', 'tol'); var r = [['حداقل مجاز', v.Vn * (1 - v.tol / 100), 'V'], ['حداکثر مجاز', v.Vn * (1 + v.tol / 100), 'V']]; if (s === 'ac3') r.push(['ولتاژ فاز', v.Vn / SQ3, 'V']); return { r: r, fm: 'V = V_n·(1 ± tol)  ،  V_ph = V_L / √3' }; } };

  C[34] = { f: function () { return [N('V1', 'ولتاژ اول V₁', 20000), N('V2', 'ولتاژ دوم V₂', 400), N('I1', 'جریان سمت اول (A) — اختیاری', 10, { opt: 1 })]; },
    c: function (v) { need(v, 'V1', 'V2'); pos(v, 'V2'); var a = v.V1 / v.V2, r = [['نسبت تبدیل a = V₁/V₂', a, ''], ['نسبت معکوس', 1 / a, '']]; if (has(v.I1)) r.push(['جریان سمت دوم', v.I1 * a, 'A']); return { r: r, fm: 'a = V₁/V₂ = N₁/N₂ = I₂/I₁' }; } };

  C[35] = { f: function (s) { return [N('VNL', 'ولتاژ بی‌باری — اختیاری', 400, { opt: 1 }), N('VFL', 'ولتاژ بارداری — اختیاری', 385, { opt: 1 }), N('r', 'R معادل (%) — اختیاری', '', { opt: 1 }), N('x', 'X معادل (%) — اختیاری', '', { opt: 1 }), N('b', 'ضریب بارگذاری (۰ تا ۱)', 1)].concat(isAC(s) ? [N('pf', 'ضریب توان (پس‌فاز)', 0.8)] : []); },
    c: function (v, s) {
      var r = [];
      if (has(v.VNL) && has(v.VFL) && v.VFL > 0) r.push(['تنظیم ولتاژ', 100 * (v.VNL - v.VFL) / v.VFL, '%']);
      if (has(v.r) && has(v.x) && has(v.b)) { var c = isAC(s) ? cosf(v, s) : 1; r.push(['تنظیم ولتاژ تقریبی از R,X', v.b * (v.r * c + (isAC(s) ? v.x * sinf(c) : 0)), '%']); }
      if (!r.length) throw new Error('یا V بی‌باری/بارداری، یا R و X را وارد کنید.');
      return { r: r, fm: 'VR = (V_NL − V_FL) / V_FL × 100  ،  VR ≈ β(R·cosφ + X·sinφ)' };
    } };

  C[36] = { f: function (s) { return [N('I', 'جریان (A) — اختیاری', 100, { opt: 1 }), N('R', 'مقاومت هر فاز/سیم‌پیچ (Ω)', 0.02, { opt: 1 }), N('n', 'تعداد فازها', s === 'ac3' ? 3 : 1), N('Pr', 'یا تلفات مسی نامی (W)', '', { opt: 1 }), N('b', 'ضریب بارگذاری β', 1)]; },
    c: function (v) {
      var P; if (has(v.I) && has(v.R)) { need(v, 'n'); P = v.n * v.I * v.I * v.R; } else if (has(v.Pr)) { need(v, 'b'); P = v.Pr * v.b * v.b; } else throw new Error('I و R را بدهید یا تلفات مسی نامی را.');
      return { r: [['تلفات مسی', P, 'W']], fm: 'P_cu = n·I²·R   یا   P_cu = P_cu,نامی · β²' };
    } };

  C[37] = { f: function () { return [N('P0', 'تلفات آهنی در ولتاژ نامی (W)', 500), N('V', 'ولتاژ کاری', 410), N('V0', 'ولتاژ نامی', 400)]; },
    c: function (v) { need(v, 'P0', 'V', 'V0'); pos(v, 'V0'); return { r: [['تلفات آهنی', v.P0 * Math.pow(v.V / v.V0, 2), 'W']], fm: 'P_fe ≈ P_fe,نامی · (V/V_n)²', nt: 'تقریب در فرکانس ثابت؛ مستقل از بار.' }; } };

  C[38] = { f: function () { return [N('Pfe', 'تلفات آهنی (W)', 500), N('Pcu', 'تلفات مسی (W)', 2000), N('Pot', 'سایر تلفات (W)', 100), N('Po', 'توان خروجی (kW) — اختیاری', 100, { opt: 1 })]; },
    c: function (v) { need(v, 'Pfe', 'Pcu'); var t = v.Pfe + v.Pcu + (v.Pot || 0), r = [['تلفات کل', t, 'W']]; if (has(v.Po) && v.Po > 0) r.push(['بازده', 100 * v.Po * 1000 / (v.Po * 1000 + t), '%']); return { r: r, fm: 'P_loss = P_fe + P_cu + P_other  ،  η = P_o / (P_o + P_loss)' }; } };

  C[39] = { f: function () { return [N('a', 'مقدار واقعی (A یا kVA)', 320), N('r', 'مقدار نامی (همان واحد)', 400)]; },
    c: function (v) { need(v, 'a', 'r'); pos(v, 'r'); var p = 100 * v.a / v.r; return { r: [['درصد بارگذاری', p, '%'], ['وضعیت', p > 100 ? 'اضافه‌بار' : p >= 80 ? 'بارگذاری بالا' : 'عادی', '']], fm: 'Loading% = واقعی / نامی × 100' }; } };

  C[40] = { f: function (s) { return [N('P', 'بار (kW)', 400)].concat(PF(s)).concat([N('m', 'حاشیه اطمینان (%)', 20), N('g', 'رشد آینده (%)', 10), N('d', 'ضریب کاهش ظرفیت (دما/ارتفاع)', 1)]); },
    c: function (v, s) { need(v, 'P', 'm', 'g', 'd'); pos(v, 'd'); var S = v.P / cosf(v, s) * (1 + v.m / 100) * (1 + v.g / 100) / v.d; return { r: [['ظرفیت لازم', S, isAC(s) ? 'kVA' : 'kW'], ['اندازه استاندارد بعدی', isAC(s) ? (nextStd(S, STD_KVA) || 'بزرگ‌تر از ۵۰۰۰') : '—', isAC(s) ? 'kVA' : '']], fm: 'S = P/cosφ · (1+حاشیه)(1+رشد) / ضریب کاهش' }; } };

  C[41] = { f: function () { return [N('D', 'حداکثر بار واقعی (kW)', 300), N('Cp', 'ظرفیت نصب‌شده (kW)', 500)]; },
    c: function (v) { need(v, 'D', 'Cp'); pos(v, 'Cp'); return { r: [['ضریب بهره‌برداری', v.D / v.Cp, '']], fm: 'ضریب بهره‌برداری = حداکثر بار / ظرفیت نصب‌شده' }; } };

  C[42] = { f: function () { return [L('Ds', 'ماکزیمم تقاضای هر مصرف‌کننده (kW)', '120 80 60 100'), N('Ds0', 'ماکزیمم تقاضای هم‌زمان کل (kW)', 280)]; },
    c: function (v) { need(v, 'Ds0'); if (!v.Ds.length) throw new Error('مقادیر را وارد کنید.'); var t = v.Ds.reduce(function (a, b) { return a + b; }, 0); pos({ t: t }, 't'); return { r: [['ضریب هم‌زمانی', v.Ds0 / t, ''], ['مجموع ماکزیمم‌ها', t, 'kW']], fm: 'ضریب هم‌زمانی = حداکثر تقاضای هم‌زمان / Σ ماکزیمم‌های فردی' }; } };

  C[43] = { f: function () { return [N('D', 'حداکثر تقاضا (kW)', 300), N('Cn', 'بار متصل کل (kW)', 450)]; },
    c: function (v) { need(v, 'D', 'Cn'); pos(v, 'Cn'); return { r: [['ضریب تقاضا', v.D / v.Cn, '']], fm: 'ضریب تقاضا = حداکثر تقاضا / بار متصل' }; } };

  C[44] = { f: function () { return [N('E', 'انرژی مصرفی (kWh)', 150000), N('Pm', 'پیک (kW)', 400), N('T', 'بازه (ساعت)', 720)]; },
    c: function (v) { need(v, 'E', 'Pm', 'T'); pos(v, 'Pm', 'T'); return { r: [['ضریب بار', v.E / (v.Pm * v.T), ''], ['توان متوسط', v.E / v.T, 'kW']], fm: 'LF = E / (P_max · T)' }; } };

  C[45] = { f: C[42].f,
    c: function (v) { var o = C[42].c(v); var fc = o.r[0][1]; return { r: [['ضریب تنوع', 1 / fc, ''], ['مجموع ماکزیمم‌ها', o.r[1][1], 'kW']], fm: 'ضریب تنوع = Σ ماکزیمم‌های فردی / ماکزیمم هم‌زمان = 1 / ضریب هم‌زمانی' }; } };

  C[46] = { f: function () { return [N('Pl', 'تلفات در پیک (kW)', 25), N('lf', 'ضریب بار (۰ تا ۱)', 0.6), N('T', 'مدت (ساعت)', 8760)]; },
    c: function (v) { need(v, 'Pl', 'lf', 'T'); var llf = 0.3 * v.lf + 0.7 * v.lf * v.lf; return { r: [['ضریب تلفات LLF', llf, ''], ['انرژی تلف‌شده', v.Pl * llf * v.T, 'kWh']], fm: 'LLF ≈ 0.3·LF + 0.7·LF²  ،  E_loss = P_loss,peak · LLF · T', nt: 'رابطه تجربی تقریبی است.' }; } };

  C[47] = { f: function () { return [N('E', 'انرژی (kWh)', 150000), N('tf', 'تعرفه انرژی (واحد پول/kWh)', 2000), N('Pd', 'دیماند (kW) — اختیاری', 400, { opt: 1 }), N('td', 'تعرفه دیماند (واحد پول/kW) — اختیاری', 50000, { opt: 1 }), N('fx', 'هزینه ثابت — اختیاری', 0, { opt: 1 })]; },
    c: function (v) { need(v, 'E', 'tf'); var a = v.E * v.tf, b = (v.Pd || 0) * (v.td || 0), cc = v.fx || 0; return { r: [['هزینه انرژی', a, ''], ['هزینه دیماند', b, ''], ['جمع کل', a + b + cc, '']], fm: 'Cost = E·تعرفه + P_d·تعرفه_دیماند + ثابت' }; } };

  C[48] = { f: function (s) { return [N('P', 'بار متصل (kW)', 500), N('df', 'ضریب تقاضا', 0.7)].concat(PF(s)).concat([N('V', 'ولتاژ (V) — اختیاری', 400, { opt: 1 })]); },
    c: function (v, s) {
      need(v, 'P', 'df'); var c = cosf(v, s), Pd = v.P * v.df, Sd = Pd / c, r = [['توان اکتیو موردنیاز', Pd, 'kW']];
      if (isAC(s)) { r.push(['توان راکتیو', Sd * sinf(c), 'kvar']); r.push(['توان ظاهری', Sd, 'kVA']); }
      if (has(v.V) && v.V > 0) r.push(['جریان', Sd * 1000 / (kV(s) * v.V), 'A']);
      return { r: r, fm: 'P_d = P_متصل · ضریب تقاضا  ،  S = P_d / cosφ' };
    } };

  C[49] = { f: function () { return [N('Cp', 'ظرفیت (kW یا kVA)', 630), N('D', 'بار موردنیاز (همان واحد)', 480)]; },
    c: function (v) { need(v, 'Cp', 'D'); pos(v, 'D'); return { r: [['حاشیه اطمینان', 100 * (v.Cp - v.D) / v.D, '%'], ['ضریب اطمینان', v.Cp / v.D, ''], ['ظرفیت باقی‌مانده', v.Cp - v.D, '']], fm: 'Margin = (C − D) / D  ،  SF = C / D' }; } };

  C[50] = { f: function (s) { return isAC(s) ? [N('P', 'توان اکتیو (kW)', 500), N('pf1', 'ضریب توان فعلی', 0.75), N('pf2', 'ضریب توان هدف', 0.95), N('V', 'ولتاژ (V)', 400), N('f', 'فرکانس (Hz)', 50), SEL('conn', 'اتصال خازن', [['d', 'مثلث'], ['y', 'ستاره']], 'd')] : []; },
    c: function (v, s) {
      if (!isAC(s)) return { r: [['Q_c', 0, 'kvar']], fm: '—', nt: 'در DC توان راکتیو و ضریب توان معنا ندارد.' };
      need(v, 'P', 'pf1', 'pf2', 'V', 'f'); pos(v, 'V', 'f');
      if (v.pf1 <= 0 || v.pf1 > 1 || v.pf2 <= 0 || v.pf2 > 1) throw new Error('ضریب توان باید بین ۰ و ۱ باشد.');
      var t = function (p) { return Math.tan(Math.acos(p)); }, Qc = v.P * (t(v.pf1) - t(v.pf2)), w = 2 * PI * v.f, C1;
      if (s === 'ac3') C1 = Qc * 1000 / (w * v.V * v.V * (v.conn === 'y' ? 1 : 3)); else C1 = Qc * 1000 / (w * v.V * v.V);
      return { r: [['خازن موردنیاز Q_c', Qc, 'kvar'], [s === 'ac3' ? 'ظرفیت هر فاز' : 'ظرفیت خازن', C1 * 1e6, 'µF']], fm: 'Q_c = P·(tanφ₁ − tanφ₂)  ،  C = Q_c / (k·ω·V²)', nt: Qc < 0 ? 'ضریب توان هدف کمتر از فعلی است؛ نیازی به جبران نیست.' : '' };
    } };

  root.CALCS = C;
  root.CALC_UTIL = { has: has, isAC: isAC };
  if (typeof module !== 'undefined') module.exports = { CALCS: C };
})(typeof window !== 'undefined' ? window : globalThis);

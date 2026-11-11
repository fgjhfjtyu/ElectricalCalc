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

  /* ---------- محاسبه‌گرهای یکپارچه برای روابط تکراری ---------- */
  C[116] = { name: 'قانون اهم یکپارچه؛ محاسبه ولتاژ، جریان یا مقاومت/امپدانس',
    f: function (s, v) {
      var m = v && v.mode || 'i';
      var f = [SEL('mode', 'کمیت مورد محاسبه', [['i', 'محاسبه جریان از ولتاژ و مقاومت/امپدانس'], ['v', 'محاسبه ولتاژ از جریان و مقاومت/امپدانس'], ['z', 'محاسبه مقاومت/امپدانس از ولتاژ و جریان']], 'i')];
      if (m === 'i') return f.concat([N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('Z', s === 'dc' ? 'مقاومت کل (Ω)' : 'امپدانس هر فاز (Ω)', 10)]);
      if (m === 'v') return f.concat([N('I', 'جریان (A)', 10), N('Z', s === 'dc' ? 'مقاومت کل (Ω)' : 'امپدانس هر فاز (Ω)', 10)]);
      return f.concat([N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('I', 'جریان (A)', 10)]);
    },
    c: function (v, s) {
      var m = v.mode || 'i', k = kV(s), z;
      if (m === 'i') { need(v, 'V', 'Z'); pos(v, 'Z'); return { r: [['جریان I', v.V / (k * v.Z), 'A']], fm: s === 'ac3' ? 'I = V_L / (√3·Z)  (فرض اتصال ستاره)' : 'I = V / Z' }; }
      if (m === 'v') { need(v, 'I', 'Z'); pos(v, 'Z'); return { r: [['ولتاژ V', k * v.I * v.Z, 'V']], fm: s === 'ac3' ? 'V_L = √3·I·Z' : 'V = I·Z' }; }
      need(v, 'V', 'I'); pos(v, 'I'); z = v.V / (k * v.I);
      return { r: [[s === 'dc' ? 'مقاومت R' : 'امپدانس Z', z, 'Ω']], fm: 'Z = V / (k·I)  ،  k=√3 برای سه‌فاز و ۱ برای تک‌فاز/DC' };
    } };

  C[117] = { name: 'امپدانس، اندازه، زاویه فاز و ضریب توان',
    f: function (s, v) {
      var m = v && v.kind || 'parts';
      if (!isAC(s)) return [N('R', 'مقاومت (Ω)', 4)];
      var f = [SEL('kind', 'روش ورود راکتانس', [['parts', 'از XL و XC'], ['net', 'راکتانس خالص X']], 'parts'), N('R', 'مقاومت R (Ω)', 4)];
      return f.concat(m === 'net' ? [N('X', 'راکتانس خالص X (Ω)', 4)] : [N('XL', 'راکتانس القایی XL (Ω)', 6), N('XC', 'راکتانس خازنی XC (Ω)', 2)]);
    },
    c: function (v, s) {
      need(v, 'R'); if (v.R < 0) throw new Error('مقاومت نباید منفی باشد.');
      var x = 0;
      if (isAC(s)) { if ((v.kind || 'parts') === 'net') { need(v, 'X'); x = v.X; } else { x = (v.XL || 0) - (v.XC || 0); } }
      var mag = Math.hypot(v.R, x), angle = rad(Math.atan2(x, v.R)), pf = mag ? v.R / mag : 1;
      return { r: [['اندازه امپدانس |Z|', mag, 'Ω'], ['راکتانس خالص X', x, 'Ω'], ['زاویه فاز φ', angle, '°'], ['ضریب توان cosφ', pf, ''], ['ماهیت بار', x > 0 ? 'القایی (پس‌فاز)' : x < 0 ? 'خازنی (پیش‌فاز)' : 'مقاومتی', '']], fm: 'Z=R+jX ، X=XL−XC ، |Z|=√(R²+X²) ، φ=atan2(X,R)', nt: 'در حالت DC، راکتانس صفر فرض می‌شود.' };
    } };

  C[118] = { name: 'مثلث توان یکپارچه؛ P، Q، S و ضریب توان',
    f: function (s, v) {
      var m = v && v.mode || 'vi';
      if (m === 'pq') return [SEL('mode', 'روش ورود اطلاعات', [['vi', 'از ولتاژ و جریان'], ['pq', 'از توان اکتیو و راکتیو'], ['ps', 'از توان اکتیو و ظاهری']], 'vi'), N('P', 'توان اکتیو P (kW)', 80), N('Q', 'توان راکتیو Q (kvar)', 60)];
      if (m === 'ps') return [SEL('mode', 'روش ورود اطلاعات', [['vi', 'از ولتاژ و جریان'], ['pq', 'از توان اکتیو و راکتیو'], ['ps', 'از توان اکتیو و ظاهری']], 'vi'), N('P', 'توان اکتیو P (kW)', 80), N('S', 'توان ظاهری S (kVA)', 100)];
      return [SEL('mode', 'روش ورود اطلاعات', [['vi', 'از ولتاژ و جریان'], ['pq', 'از توان اکتیو و راکتیو'], ['ps', 'از توان اکتیو و ظاهری']], 'vi'), N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('I', 'جریان (A)', 10)].concat(PF(s));
    },
    c: function (v, s) {
      var m = v.mode || 'vi', P, Q, S, pf, angle;
      if (m === 'vi') {
        need(v, 'V', 'I'); pos(v, 'V', 'I');
        S = kV(s) * v.V * v.I / 1000; pf = cosf(v, s); P = S * pf; Q = isAC(s) ? S * sinf(pf) : 0;
      } else if (m === 'pq') {
        need(v, 'P', 'Q'); P = v.P; Q = isAC(s) ? v.Q : 0; S = Math.hypot(P, Q); pf = S ? Math.abs(P) / S : 1;
      } else {
        need(v, 'P', 'S'); P = v.P; S = Math.abs(v.S); if (S < Math.abs(P)) throw new Error('توان ظاهری S نمی‌تواند از قدر مطلق P کمتر باشد.');
        Q = isAC(s) ? Math.sqrt(Math.max(0, S * S - P * P)) : 0; pf = S ? Math.abs(P) / S : 1;
      }
      if (s === 'dc' && (m === 'pq' && Math.abs(v.Q || 0) > 1e-9)) throw new Error('در DC پایدار توان راکتیو وجود ندارد.');
      angle = isAC(s) ? rad(Math.acos(Math.min(1, pf))) : 0;
      return { r: [['توان اکتیو P', P, 'kW'], ['توان راکتیو Q', Q, 'kvar'], ['توان ظاهری S', S, 'kVA'], ['ضریب توان', pf, ''], ['زاویه فاز |φ|', angle, '°']], fm: 'S=√(P²+Q²) ، PF=|P|/S ، Q=√(S²−P²) ، P= k·V·I·cosφ', nt: s === 'dc' ? 'در DC پایدار، Q=0 و S=|P| است.' : 'علامت Q در حالت ورود P و Q حفظ می‌شود؛ در دو روش دیگر Q مثبت و بار پس‌فاز فرض شده است.' };
    } };

  C[119] = { name: 'افت ولتاژ و درصد افت ولتاژ خط/کابل',
    f: function (s) { return [N('V', s === 'ac3' ? 'ولتاژ خط مبدأ (V)' : 'ولتاژ مبدأ (V)', 400), N('I', 'جریان (A)', 50), N('R', 'مقاومت هر هادی/فاز (Ω)', 0.1)].concat(isAC(s) ? [N('X', 'راکتانس هر هادی/فاز (Ω)', 0.05)] : []).concat(PF(s)); },
    c: function (v, s) {
      need(v, 'V', 'I', 'R'); pos(v, 'V'); var pf = cosf(v, s), x = isAC(s) ? (v.X || 0) : 0;
      var dv = kD(s) * v.I * (v.R * pf + x * sinf(pf));
      return { r: [['افت ولتاژ ΔV', dv, 'V'], ['درصد افت ولتاژ', 100 * dv / v.V, '%'], ['ولتاژ انتهای خط', v.V - dv, 'V']], fm: s === 'ac3' ? 'ΔV=√3·I·(R·cosφ+X·sinφ)' : s === 'ac1' ? 'ΔV=2·I·(R·cosφ+X·sinφ)' : 'ΔV=2·I·R' };
    } };

  C[120] = { name: 'مقاومت هادی و تصحیح مقاومت برحسب دما',
    f: function (s, v) {
      var m = v && v.mode || 'geometry';
      var f = [SEL('mode', 'روش محاسبه', [['geometry', 'از طول و سطح مقطع هادی'], ['known', 'از مقاومت در دمای معلوم']], 'geometry')];
      if (m === 'known') return f.concat([N('R1', 'مقاومت در دمای T₁ (Ω)', 1), N('T1', 'دمای اولیه T₁ (°C)', 20), N('T2', 'دمای نهایی T₂ (°C)', 75), MATSEL()]);
      return f.concat([N('Lm', 'طول هادی (m)', 100), N('A', 'سطح مقطع (mm²)', 16), N('T', 'دمای کاری (°C)', 70), MATSEL()]);
    },
    c: function (v) {
      var m = MAT[v.mat || 'cu'];
      if ((v.mode || 'geometry') === 'known') {
        need(v, 'R1', 'T1', 'T2'); pos(v, 'R1');
        var r2 = v.R1 * (1 + m.a * (v.T2 - 20)) / (1 + m.a * (v.T1 - 20));
        return { r: [['مقاومت در T₂', r2, 'Ω'], ['تغییر مقاومت', r2 - v.R1, 'Ω'], ['تغییر نسبی', 100 * (r2 - v.R1) / v.R1, '%']], fm: 'R₂=R₁·[1+α(T₂−20)]/[1+α(T₁−20)]' };
      }
      need(v, 'Lm', 'A', 'T'); pos(v, 'A');
      var r20 = m.rho * v.Lm / v.A, rt = r20 * (1 + m.a * (v.T - 20));
      return { r: [['مقاومت در ۲۰°C', r20, 'Ω'], ['مقاومت در دمای کاری', rt, 'Ω'], ['تغییر نسبت به ۲۰°C', 100 * (rt - r20) / r20, '%']], fm: 'R_T=ρ₂₀·L/A·[1+α(T−20)]' };
    } };

  C[121] = { name: 'تلفات اهمی و مسی بر پایه I²R و ضریب بار',
    f: function (s, v) {
      var m = v && v.mode || 'current';
      var f = [SEL('mode', 'روش محاسبه تلفات', [['current', 'از جریان و مقاومت'], ['rated', 'از تلفات نامی و ضریب بار']], 'current')];
      if (m === 'rated') return f.concat([N('Pr', 'تلفات اهمی/مسی نامی (W)', 2000), N('b', 'ضریب بار β (۰ تا ۱ یا بیشتر)', 0.8)]);
      return f.concat([N('I', 'جریان هر هادی/فاز (A)', 20), N('R', 'مقاومت هر هادی/فاز (Ω)', 0.5), N('n', 'تعداد هادی‌ها/فازها', s === 'ac3' ? 3 : 2)]);
    },
    c: function (v) {
      var p;
      if ((v.mode || 'current') === 'rated') { need(v, 'Pr', 'b'); if (v.Pr < 0 || v.b < 0) throw new Error('تلفات نامی و ضریب بار نباید منفی باشند.'); p = v.Pr * v.b * v.b; }
      else { need(v, 'I', 'R', 'n'); if (v.I < 0 || v.R < 0 || v.n <= 0) throw new Error('جریان و مقاومت نباید منفی و تعداد مسیرها باید مثبت باشد.'); p = v.n * v.I * v.I * v.R; }
      return { r: [['تلفات اهمی/مسی', p, 'W'], ['تلفات اهمی/مسی', p / 1000, 'kW']], fm: 'P_loss=n·I²·R  ،  یا  P_loss=P_loss,نامی·β²' };
    } };

  C[122] = { name: 'تبدیل فرکانس، دوره تناوب و سرعت زاویه‌ای',
    f: function (s, v) {
      var m = v && v.mode || 'electrical';
      if (m === 'mechanical') return [SEL('mode', 'نوع کمیت', [['electrical', 'فرکانس الکتریکی'], ['mechanical', 'سرعت دورانی مکانیکی']], 'electrical'), N('n', 'سرعت شفت (rpm)', 1500)];
      return [SEL('mode', 'نوع کمیت', [['electrical', 'فرکانس الکتریکی'], ['mechanical', 'سرعت دورانی مکانیکی']], 'electrical'), N('f', 'فرکانس (Hz)', 50)];
    },
    c: function (v) {
      if ((v.mode || 'electrical') === 'mechanical') { need(v, 'n'); pos(v, 'n'); var fm = v.n / 60, wm = 2 * PI * fm; return { r: [['فرکانس دورانی شفت', fm, 'Hz'], ['دوره یک دور', 1 / fm, 's'], ['سرعت زاویه‌ای مکانیکی ω', wm, 'rad/s'], ['سرعت دورانی', v.n, 'rpm']], fm: 'f_rot=n/60 ، T=1/f_rot ، ω=2π·n/60' }; }
      need(v, 'f'); pos(v, 'f'); return { r: [['فرکانس f', v.f, 'Hz'], ['دوره تناوب T', 1000 / v.f, 'ms'], ['سرعت زاویه‌ای ω', 2 * PI * v.f, 'rad/s']], fm: 'T=1/f ، ω=2π·f' };
    } };

  C[123] = { name: 'سرعت سنکرون، سرعت روتور و لغزش موتور',
    f: function () { return [N('f', 'فرکانس تغذیه (Hz)', 50), N('p', 'تعداد قطب‌ها', 4), N('nr', 'سرعت واقعی روتور (rpm) — اختیاری', '', { opt: 1 })]; },
    c: function (v) {
      need(v, 'f', 'p'); pos(v, 'f', 'p'); var ns = 120 * v.f / v.p, r = [['سرعت سنکرون nₛ', ns, 'rpm'], ['سرعت زاویه‌ای سنکرون', 2 * PI * ns / 60, 'rad/s']];
      if (has(v.nr)) { var slip = (ns - v.nr) / ns; r.push(['لغزش s', slip, '']); r.push(['درصد لغزش', 100 * slip, '%']); r.push(['فرکانس روتور', Math.abs(slip) * v.f, 'Hz']); }
      return { r: r, fm: 'nₛ=120·f/p ، s=(nₛ−nᵣ)/nₛ', nt: has(v.nr) && v.nr > ns ? 'سرعت روتور از سرعت سنکرون بیشتر است؛ لغزش منفی و حالت ژنراتوری محتمل است.' : '' };
    } };

  C[124] = { name: 'توان ورودی/خروجی، بازده و جریان موتور یا تجهیز',
    f: function (s, v) {
      var m = v && v.mode || 'electrical';
      var f = [SEL('mode', 'روش محاسبه', [['electrical', 'از ولتاژ و جریان ورودی'], ['output', 'از توان خروجی موردنیاز'], ['efficiency', 'محاسبه بازده از توان ورودی و خروجی']], 'electrical')];
      if (m === 'efficiency') return f.concat([N('Pin', 'توان ورودی (kW)', 100), N('Pout', 'توان خروجی (kW)', 90)]);
      if (m === 'output') return f.concat([N('P', 'توان خروجی محور (kW)', 22), N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400)].concat(PF(s)).concat([N('eta', 'بازده موتور (%)', 92), N('n', 'سرعت موتور (rpm) — اختیاری', '', { opt: 1 })]));
      return f.concat([N('V', s === 'ac3' ? 'ولتاژ خط (V)' : 'ولتاژ (V)', 400), N('I', 'جریان ورودی (A)', 30)].concat(PF(s)).concat([N('eta', 'بازده موتور (%)', 92), N('n', 'سرعت موتور (rpm) — اختیاری', '', { opt: 1 })]));
    },
    c: function (v, s) {
      var mode = v.mode || 'electrical';
      if (mode === 'efficiency') {
        need(v, 'Pin', 'Pout'); pos(v, 'Pin');
        if (v.Pout < 0 || v.Pout > v.Pin) throw new Error('توان خروجی باید بین صفر و توان ورودی باشد.');
        return { r: [['بازده η', 100 * v.Pout / v.Pin, '%'], ['تلفات کل', v.Pin - v.Pout, 'kW']], fm: 'η=P_out/P_in×100 ، P_loss=P_in−P_out' };
      }
      need(v, 'V', 'eta'); pos(v, 'V'); if (v.eta <= 0 || v.eta > 100) throw new Error('بازده باید بیشتر از صفر و حداکثر ۱۰۰ درصد باشد.');
      var pf = cosf(v, s), pin, pout, r = [];
      if (mode === 'output') { need(v, 'P'); if (v.P < 0) throw new Error('توان خروجی نباید منفی باشد.'); pout = v.P; pin = pout / (v.eta / 100); r.push(['جریان موردنیاز', pin * 1000 / (kV(s) * v.V * pf), 'A']); }
      else { need(v, 'I'); if (v.I < 0) throw new Error('جریان نباید منفی باشد.'); pin = kV(s) * v.V * v.I * pf / 1000; pout = pin * v.eta / 100; r.push(['جریان ورودی', v.I, 'A']); }
      r.push(['توان ورودی', pin, 'kW'], ['توان خروجی محور', pout, 'kW'], ['بازده', v.eta, '%'], ['تلفات کل', pin - pout, 'kW'], ['توان خروجی محور', pout * 1.34102209, 'hp']);
      if (has(v.n) && v.n > 0) r.push(['گشتاور محور', pout * 9550 / v.n, 'N·m']);
      return { r: r, fm: 'P_in=k·V·I·cosφ ، P_out=η·P_in ، I=P_out/(k·V·cosφ·η)' };
    } };

  /* ---------- ماشین‌حساب‌های تخصصی (۵۱ به بعد) ---------- */
  var IDMT = { si: [0.14, 0.02, 'Standard Inverse'], vi: [13.5, 1, 'Very Inverse'], ei: [80, 2, 'Extremely Inverse'] };
  var SP = {};
  SP[51] = { x: 1, name: 'جریان اتصال کوتاه سه‌فاز در ثانویهٔ ترانسفورماتور (روش MVA)',
    f: function () { return [N('S', 'توان ترانسفورماتور (kVA)', 1000), N('V', 'ولتاژ ثانویه خط (V)', 400), N('z', 'امپدانس ترانس Z% ', 6), N('Ssc', 'توان اتصال کوتاه شبکه بالادست (MVA) — خالی = بی‌نهایت', '')]; },
    c: function (v) { need(v, 'S', 'V', 'z'); pos(v, 'S', 'V', 'z');
      var St = v.S / 1000, Zt = v.z / 100 / St; var Zs = has(v.Ssc) && v.Ssc > 0 ? 1 / v.Ssc : 0;
      var Ssc = 1 / (Zt + Zs), I = Ssc * 1e6 / (SQ3 * v.V);
      return { r: [['توان اتصال کوتاه', Ssc, 'MVA'], ['جریان اتصال کوتاه Ik3', I / 1000, 'kA'], ['جریان نامی ثانویه', v.S * 1000 / (SQ3 * v.V), 'A']], fm: 'S_sc = 1 / (1/S_sc,شبکه + Z%/(100·S_n))  ،  Ik = S_sc / (√3·V)', nt: 'تقریب MVA؛ بدون مقاومت و سهم موتورها. برای طراحی از IEC 60909 استفاده کنید.' }; } };
  SP[52] = { x: 1, name: 'ولتاژ گام و تماس مجاز (IEEE 80، بدن ۵۰ کیلوگرم)',
    f: function () { return [N('rho', 'مقاومت ویژهٔ خاک (Ω·m)', 100), N('rs', 'مقاومت ویژهٔ لایهٔ سطحی (Ω·m)', 3000), N('hs', 'ضخامت لایهٔ سطحی (m)', 0.1), N('t', 'مدت جریان خطا (s)', 0.5)]; },
    c: function (v) { need(v, 'rho', 'rs', 'hs', 't'); pos(v, 'rho', 't');
      var Cs = 1 - 0.09 * (1 - v.rho / v.rs) / (2 * v.hs + 0.09), k = 0.116 / Math.sqrt(v.t);
      return { r: [['ضریب Cs', Cs, ''], ['ولتاژ تماس مجاز', (1000 + 1.5 * Cs * v.rs) * k, 'V'], ['ولتاژ گام مجاز', (1000 + 6 * Cs * v.rs) * k, 'V']], fm: 'E_touch = (1000 + 1.5·Cs·ρs)·0.116/√t  ،  E_step = (1000 + 6·Cs·ρs)·0.116/√t' }; } };
  SP[53] = { x: 1, name: 'مقاومت زمین یک میلهٔ قائم (فرمول Dwight)',
    f: function () { return [N('rho', 'مقاومت ویژهٔ خاک (Ω·m)', 100), N('Lr', 'طول میله (m)', 3), N('d', 'قطر میله (mm)', 16), N('n', 'تعداد میله‌های موازی (فاصله زیاد)', 1)]; },
    c: function (v) { need(v, 'rho', 'Lr', 'd', 'n'); pos(v, 'rho', 'Lr', 'd', 'n');
      var a = v.d / 2000, R = v.rho / (2 * PI * v.Lr) * (Math.log(4 * v.Lr / a) - 1);
      return { r: [['مقاومت یک میله', R, 'Ω'], ['مقاومت n میلهٔ موازی (تقریبی)', R / v.n, 'Ω']], fm: 'R = ρ/(2πL)·(ln(4L/a) − 1)', nt: 'برای n میله، اثر متقابل نادیده گرفته شده؛ مقدار واقعی بیشتر است.' }; } };
  SP[54] = { x: 1, name: 'اعوجاج هارمونیکی کل (THD) و ضریب توان واقعی',
    f: function () { return [N('I1', 'مؤلفهٔ اصلی I₁', 100), L('Ih', 'هارمونیک‌ها I₃، I₅، I₇ … (با فاصله)', '20 14 9'), N('dpf', 'ضریب توان جابه‌جایی (DPF)', 0.95)]; },
    c: function (v) { need(v, 'I1', 'dpf'); pos(v, 'I1'); var s = 0; (v.Ih || []).forEach(function (x) { s += x * x; });
      var thd = Math.sqrt(s) / v.I1;
      return { r: [['THD_I', thd * 100, '%'], ['جریان مؤثر کل', v.I1 * Math.sqrt(1 + thd * thd), 'A'], ['ضریب توان واقعی', v.dpf / Math.sqrt(1 + thd * thd), '']], fm: 'THD = √(ΣI_h²)/I₁  ،  PF = DPF/√(1+THD²)' }; } };
  SP[55] = { x: 1, name: 'طراحی فیلتر هارمونیکی تنظیم‌شده (راکتور سری با خازن)',
    f: function () { return [N('Q', 'توان خازن (kvar)', 100), N('V', 'ولتاژ خط (V)', 400), N('f', 'فرکانس (Hz)', 50), N('h', 'مرتبهٔ تنظیم (مثلاً 4.7 برای حذف هارمونیک ۵)', 4.7)]; },
    c: function (v) { need(v, 'Q', 'V', 'f', 'h'); pos(v, 'Q', 'V', 'f'); if (v.h <= 1) throw new Error('مرتبهٔ تنظیم باید بزرگ‌تر از ۱ باشد.');
      var Xc = v.V * v.V / (v.Q * 1000), XL = Xc / (v.h * v.h), w = 2 * PI * v.f;
      return { r: [['راکتانس خازن Xc', Xc, 'Ω'], ['راکتانس راکتور XL', XL, 'Ω'], ['اندوکتانس راکتور', XL / w * 1000, 'mH'], ['درصد راکتور (p)', XL / Xc * 100, '%']], fm: 'XL = Xc / h²  ،  p = 1/h² × 100', nt: 'مقادیر برای خازن با ولتاژ نامی برابر ولتاژ شبکه؛ ولتاژ نامی خازن باید بیشتر از V·(1/(1−p)) باشد.' }; } };
  SP[56] = { x: 1, name: 'زمان کار رلهٔ اضافه‌جریان زمان‌معکوس (IEC 60255)',
    f: function () { return [SEL('cv', 'منحنی', [['si', 'Standard Inverse'], ['vi', 'Very Inverse'], ['ei', 'Extremely Inverse']], 'si'), N('I', 'جریان خطا (A)', 2000), N('Is', 'جریان تنظیم رله (A)', 400), N('tms', 'ضریب زمانی TMS', 0.2)]; },
    c: function (v) { need(v, 'I', 'Is', 'tms'); pos(v, 'Is', 'tms'); if (v.I <= v.Is) throw new Error('جریان خطا باید از جریان تنظیم بیشتر باشد.');
      var p = IDMT[v.cv] || IDMT.si, m = v.I / v.Is, t = v.tms * p[0] / (Math.pow(m, p[1]) - 1);
      return { r: [['نسبت جریان I/Is', m, ''], ['زمان قطع', t, 's']], fm: 't = TMS · k / ((I/Is)^α − 1)  — ' + p[2] }; } };
  SP[57] = { x: 1, name: 'حداقل سطح مقطع کابل برای تحمل اتصال کوتاه (آدیاباتیک)',
    f: function () { return [N('I', 'جریان اتصال کوتاه (A)', 10000), N('t', 'مدت (s)', 0.5), SEL('k', 'نوع کابل (ضریب k)', [['143', 'مس / PVC (k=143)'], ['176', 'مس / XLPE (k=176)'], ['95', 'آلومینیوم / PVC (k=95)'], ['116', 'آلومینیوم / XLPE (k=116)']], '143')]; },
    c: function (v) { need(v, 'I', 't'); pos(v, 'I', 't'); var k = Number(v.k) || 143, S = v.I * Math.sqrt(v.t) / k;
      return { r: [['حداقل سطح مقطع', S, 'mm²'], ['سطح استاندارد بعدی', nextStd(S, STD_MM2) || 'بیش از ۶۳۰', 'mm²']], fm: 'S ≥ I·√t / k   (IEC 60364-4-43)' }; } };
  SP[58] = { x: 1, name: 'تصحیح ولتاژ تحمل عایق با ارتفاع (IEC 60071)',
    f: function () { return [N('U', 'ولتاژ تحمل استاندارد در سطح دریا (kV)', 170), N('H', 'ارتفاع محل نصب (m)', 1500), N('m', 'توان m (۱ برای ضربهٔ صاعقه و فرکانس قدرت)', 1)]; },
    c: function (v) { need(v, 'U', 'H', 'm'); pos(v, 'U'); var Ka = Math.exp(v.m * Math.max(0, v.H - 1000) / 8150);
      return { r: [['ضریب ارتفاع Ka', Ka, ''], ['ولتاژ تحمل لازم در محل', v.U * Ka, 'kV']], fm: 'Ka = e^(m·(H−1000)/8150)  ،  U = Ka · U₀' }; } };
  SP[59] = { x: 1, name: 'افت ولتاژ لحظه‌ای هنگام راه‌اندازی موتور',
    f: function () { return [N('P', 'توان نامی موتور (kW)', 90), N('pf', 'ضریب توان راه‌اندازی', 0.35), N('Ist', 'نسبت جریان راه‌اندازی به نامی', 6), N('eta', 'بازده نامی', 0.94), N('pfn', 'ضریب توان نامی', 0.88), N('Ssc', 'توان اتصال کوتاه نقطهٔ اتصال (MVA)', 10)]; },
    c: function (v) { need(v, 'P', 'Ist', 'eta', 'pfn', 'Ssc'); pos(v, 'P', 'eta', 'pfn', 'Ssc');
      var Sn = v.P / (v.eta * v.pfn), Sst = Sn * v.Ist / 1000, dv = Sst / (v.Ssc + Sst) * 100;
      return { r: [['توان ظاهری راه‌اندازی', Sst, 'MVA'], ['افت ولتاژ تقریبی', dv, '%']], fm: 'ΔV% ≈ S_st / (S_sc + S_st) × 100', nt: 'معمولاً افت بیش از ۱۰ تا ۱۵ درصد قابل قبول نیست؛ از راه‌انداز نرم یا ستاره-مثلث استفاده کنید.' }; } };
  SP[60] = { x: 1, name: 'مقدار مؤثر (RMS)، میانگین و ضریب قله از نمونه‌ها',
    f: function () { return [L('x', 'نمونه‌ها (با فاصله)', '0 7.07 10 7.07 0 -7.07 -10 -7.07')]; },
    c: function (v) { var a = v.x || []; if (!a.length) throw new Error('نمونه‌ها را وارد کنید.');
      var s = 0, m = 0, pk = 0; a.forEach(function (x) { s += x * x; m += x; pk = Math.max(pk, Math.abs(x)); });
      var rms = Math.sqrt(s / a.length);
      return { r: [['RMS', rms, ''], ['میانگین', m / a.length, ''], ['قله', pk, ''], ['ضریب قله', rms ? pk / rms : 0, '']], fm: 'RMS = √(Σx²/N)  ،  Crest = Xpeak / RMS' }; } };
  SP[61] = { x: 1, name: 'ظرفیت قطع کلید (MVA) و انتخاب کلید از جریان اتصال کوتاه',
    f: function () { return [N('V', 'ولتاژ خط (kV)', 20), N('Ik', 'جریان اتصال کوتاه (kA)', 12.5)]; },
    c: function (v) { need(v, 'V', 'Ik'); pos(v, 'V', 'Ik'); var std = [6.3, 8, 10, 12.5, 16, 20, 25, 31.5, 40, 50, 63];
      return { r: [['توان قطع', SQ3 * v.V * v.Ik, 'MVA'], ['جریان قطع استاندارد کلید', nextStd(v.Ik, std) || 'بیش از ۶۳', 'kA']], fm: 'S = √3 · V · Ik' }; } };
  SP[62] = { x: 1, name: 'جریان خطای تک‌فاز به زمین (مؤلفه‌های متقارن)',
    f: function () { return [N('V', 'ولتاژ خط (V)', 400), N('Z1', 'امپدانس توالی مثبت Z₁ (Ω)', 0.02), N('Z2', 'امپدانس توالی منفی Z₂ (Ω)', 0.02), N('Z0', 'امپدانس توالی صفر Z₀ (Ω) (شامل 3Zf)', 0.06)]; },
    c: function (v) { need(v, 'V', 'Z1', 'Z2', 'Z0'); var z = v.Z1 + v.Z2 + v.Z0; pos(v, 'V'); if (!(z > 0)) throw new Error('مجموع امپدانس‌ها باید مثبت باشد.');
      return { r: [['جریان خطا If', 3 * v.V / SQ3 / z / 1000, 'kA']], fm: 'If = 3·V_ph / (Z₁ + Z₂ + Z₀)', nt: 'امپدانس‌ها به‌صورت اندازه (بدون زاویه) جمع شده‌اند؛ نتیجه محافظه‌کارانه است.' }; } };
  /* ---------- محاسبه‌گرهای تخصصی تکمیلی (۶۳ تا ۱۱۵) ---------- */
  SP[63] = { x: 1, name: 'راندمان ترانسفورماتور در بار جزئی و تلفات بارگذاری',
    f: function () { return [N('S', 'توان نامی ترانس (kVA)', 1000), N('P0', 'تلفات بی‌باری (kW)', 1.2), N('Pcu', 'تلفات مسی در بار نامی (kW)', 10), N('x', 'ضریب بار (۰ تا ۱)', 0.75), N('pf', 'ضریب توان بار', 0.85)]; },
    c: function (v) { need(v, 'S', 'P0', 'Pcu', 'x', 'pf'); pos(v, 'S'); if (v.P0 < 0 || v.Pcu < 0 || v.x < 0 || v.x > 1 || v.pf <= 0 || v.pf > 1) throw new Error('تلفات نامنفی، ضریب بار بین ۰ تا ۱ و ضریب توان بین ۰ تا ۱ باشد.');
      var Po = v.S * v.x * v.pf, Pcu = v.Pcu * v.x * v.x, loss = v.P0 + Pcu, eta = Po + loss > 0 ? 100 * Po / (Po + loss) : 0;
      return { r: [['توان خروجی', Po, 'kW'], ['تلفات مسی در این بار', Pcu, 'kW'], ['تلفات کل', loss, 'kW'], ['راندمان', eta, '%']], fm: 'Pcu(x)=Pcu,n·x²  ،  η=Pout/(Pout+P0+Pcu(x))×100' }; } };
  SP[64] = { x: 1, name: 'بار متناظر با بیشترین راندمان ترانسفورماتور',
    f: function () { return [N('P0', 'تلفات آهنی/بی‌باری (kW)', 1.2), N('Pcu', 'تلفات مسی در بار نامی (kW)', 10), N('S', 'توان نامی (kVA)', 1000), N('pf', 'ضریب توان', 0.85)]; },
    c: function (v) { need(v, 'P0', 'Pcu', 'S', 'pf'); pos(v, 'P0', 'Pcu', 'S'); if (v.pf <= 0 || v.pf > 1) throw new Error('ضریب توان باید بین صفر و یک باشد.');
      var x = Math.sqrt(v.P0 / v.Pcu), out = v.S * x * v.pf, eta = 100 * out / (out + 2 * v.P0);
      return { r: [['ضریب بار در بیشترین راندمان', x, 'pu'], ['درصد بار نامی', x * 100, '%'], ['توان خروجی در این نقطه', out, 'kW'], ['راندمان بیشینه تقریبی', eta, '%']], fm: 'Pcu,n·x²=P0  ⇒  x=√(P0/Pcu,n)', nt: x > 1 ? 'نقطه بیشترین راندمان بالاتر از بار نامی است؛ ترانس را برای این اضافه‌بار به کار نبرید.' : '' }; } };
  SP[65] = { x: 1, name: 'تقسیم بار دو ترانسفورماتور موازی',
    f: function () { return [N('S1', 'ظرفیت ترانس اول (kVA)', 1000), N('z1', 'امپدانس درصدی ترانس اول', 6), N('S2', 'ظرفیت ترانس دوم (kVA)', 630), N('z2', 'امپدانس درصدی ترانس دوم', 6), N('SL', 'بار کل (kVA)', 1200)]; },
    c: function (v) { need(v, 'S1', 'z1', 'S2', 'z2', 'SL'); pos(v, 'S1', 'z1', 'S2', 'z2');
      var a = v.S1 / v.z1, b = v.S2 / v.z2, s1 = v.SL * a / (a + b), s2 = v.SL - s1;
      return { r: [['سهم بار ترانس اول', s1, 'kVA'], ['درصد بار ترانس اول', 100 * s1 / v.S1, '%'], ['سهم بار ترانس دوم', s2, 'kVA'], ['درصد بار ترانس دوم', 100 * s2 / v.S2, '%']], fm: 'S₁(load):S₂(load)=(S₁/z₁):(S₂/z₂)', nt: 'فرض: نسبت تبدیل، گروه برداری، توالی فاز و زاویه امپدانس‌ها سازگار و زاویه امپدانس دو ترانس تقریباً برابر است.' }; } };
  SP[66] = { x: 1, name: 'تنظیم ولتاژ ترانسفورماتور از R% و X%',
    f: function () { return [N('r', 'مؤلفه مقاومتی امپدانس r% ', 1), N('x', 'مؤلفه راکتیو امپدانس x%', 5), N('pf', 'ضریب توان', 0.85), SEL('load', 'نوع ضریب توان', [['lag', 'پس‌فاز'], ['lead', 'پیش‌فاز']], 'lag'), N('V', 'ولتاژ ثانویه نامی (V)', 400)]; },
    c: function (v) { need(v, 'r', 'x', 'pf', 'V'); pos(v, 'V'); if (v.pf <= 0 || v.pf > 1) throw new Error('ضریب توان باید بین صفر و یک باشد.');
      var sin = Math.sqrt(1 - v.pf * v.pf), sg = v.load === 'lead' ? -1 : 1, vr = v.r * v.pf + sg * v.x * sin;
      return { r: [['تنظیم ولتاژ تقریبی', vr, '%'], ['تغییر ولتاژ', v.V * vr / 100, 'V'], ['ولتاژ بار تخمینی', v.V * (1 - vr / 100), 'V']], fm: 'VR% ≈ r%·cosφ ± x%·sinφ  (پس‌فاز +، پیش‌فاز −)', nt: 'تقریب برای بار متعادل و مقادیر درصدیِ ارجاع‌شده به مبنای نامی است.' }; } };
  SP[67] = { x: 1, name: 'چگالی شار بیشینه هسته ترانسفورماتور',
    f: function () { return [N('V', 'ولتاژ RMS سیم‌پیچ (V)', 400), N('f', 'فرکانس (Hz)', 50), N('N', 'تعداد دور سیم‌پیچ', 500), N('A', 'سطح مقطع هسته (cm²)', 100)]; },
    c: function (v) { need(v, 'V', 'f', 'N', 'A'); pos(v, 'V', 'f', 'N', 'A'); var phi = v.V / (4.44 * v.f * v.N), B = phi / (v.A * 1e-4);
      return { r: [['شار بیشینه Φmax', phi, 'Wb'], ['چگالی شار Bmax', B, 'T'], ['ولتاژ به ازای هر دور', v.V / v.N, 'V/turn']], fm: 'V=4.44·f·N·Φmax  ،  Bmax=Φmax/A_core' }; } };

  SP[68] = { x: 1, name: 'گشتاور موتور القایی با مدار معادل تونن',
    f: function () { return [N('Vth', 'ولتاژ تونن هر فاز (V)', 230), N('Rth', 'مقاومت تونن (Ω)', 0.3), N('Xth', 'راکتانس تونن (Ω)', 0.8), N('R2', 'مقاومت روتور ارجاع‌شده (Ω)', 0.2), N('X2', 'راکتانس روتور (Ω)', 0.5), N('s', 'لغزش (۰ تا ۱)', 0.03), N('f', 'فرکانس (Hz)', 50), N('p', 'تعداد قطب', 4)]; },
    c: function (v) { need(v, 'Vth', 'Rth', 'Xth', 'R2', 'X2', 's', 'f', 'p'); pos(v, 'Vth', 'R2', 'f', 'p'); if (v.s <= 0 || v.s >= 1) throw new Error('لغزش موتور در این محاسبه باید بین صفر و یک باشد.');
      var ns = 120 * v.f / v.p, w = 2 * PI * ns / 60, r = v.Rth + v.R2 / v.s, x = v.Xth + v.X2, pag = 3 * v.Vth * v.Vth * (v.R2 / v.s) / (r * r + x * x), torque = pag / w;
      return { r: [['سرعت سنکرون', ns, 'rpm'], ['توان فاصله هوایی', pag / 1000, 'kW'], ['گشتاور الکترومغناطیسی', torque, 'N·m']], fm: 'T=3·Vth²·(R₂/s) / {ωs·[(Rth+R₂/s)²+(Xth+X₂)²]}', nt: 'مدار معادل تونن هر فاز؛ لغزش و پارامترهای روتور باید در یک مبنای ارجاع‌شده باشند.' }; } };
  SP[69] = { x: 1, name: 'لغزش و گشتاور بیشینه موتور القایی',
    f: function () { return [N('Vth', 'ولتاژ تونن هر فاز (V)', 230), N('Rth', 'مقاومت تونن (Ω)', 0.3), N('Xth', 'راکتانس تونن (Ω)', 0.8), N('R2', 'مقاومت روتور ارجاع‌شده (Ω)', 0.2), N('X2', 'راکتانس روتور (Ω)', 0.5), N('f', 'فرکانس (Hz)', 50), N('p', 'تعداد قطب', 4)]; },
    c: function (v) { need(v, 'Vth', 'Rth', 'Xth', 'R2', 'X2', 'f', 'p'); pos(v, 'Vth', 'R2', 'f', 'p'); var xt = v.Xth + v.X2, den = Math.sqrt(v.Rth * v.Rth + xt * xt), sm = v.R2 / den, ns = 120 * v.f / v.p, w = 2 * PI * ns / 60;
      var tm = 3 * v.Vth * v.Vth / (2 * w * (v.Rth + den));
      return { r: [['لغزش گشتاور بیشینه', sm, 'pu'], ['لغزش درصدی', sm * 100, '%'], ['گشتاور بیشینه', tm, 'N·m'], ['سرعت متناظر', ns * (1 - sm), 'rpm']], fm: 'smax=R₂/√[Rth²+(Xth+X₂)²]  ،  Tmax=3Vth²/{2ωs[Rth+√(Rth²+X²)]}', nt: 'مدل تونن تقریبی؛ اشباع مغناطیسی و تلفات مکانیکی لحاظ نشده‌اند.' }; } };
  SP[70] = { x: 1, name: 'توان فاصله هوایی و تلفات مسی روتور موتور القایی',
    f: function () { return [N('Pag', 'توان فاصله هوایی (kW)', 20), N('s', 'لغزش (۰ تا ۱)', 0.04)]; },
    c: function (v) { need(v, 'Pag', 's'); if (v.Pag < 0 || v.s < 0 || v.s >= 1) throw new Error('توان نامنفی و لغزش بین صفر و یک وارد کنید.');
      return { r: [['تلفات مسی روتور', v.Pag * v.s, 'kW'], ['توان مکانیکی توسعه‌یافته', v.Pag * (1 - v.s), 'kW'], ['بازده تبدیل فاصله هوایی به مکانیکی', 100 * (1 - v.s), '%']], fm: 'Pcu₂=s·Pag  ،  Pmech=(1−s)·Pag', nt: 'تلفات اصطکاک، بادخور و تلفات اضافی در توان مکانیکی محور کسر نشده‌اند.' }; } };
  SP[71] = { x: 1, name: 'تنظیم ولتاژ و سرعت سنکرون در کنترل V/f درایو',
    f: function () { return [N('Vn', 'ولتاژ نامی موتور (V)', 400), N('fn', 'فرکانس نامی (Hz)', 50), N('f', 'فرکانس تنظیمی درایو (Hz)', 35), N('p', 'تعداد قطب موتور', 4)]; },
    c: function (v) { need(v, 'Vn', 'fn', 'f', 'p'); pos(v, 'Vn', 'fn', 'p'); if (v.f < 0) throw new Error('فرکانس منفی مجاز نیست.'); var ratio = v.f / v.fn, ns = 120 * v.f / v.p;
      return { r: [['ولتاژ خروجی هدف در ناحیه گشتاور ثابت', v.Vn * ratio, 'V'], ['سرعت سنکرون', ns, 'rpm'], ['نسبت V/f', v.Vn / v.fn, 'V/Hz']], fm: 'V/f=ثابت  ،  Vout=Vn·f/fn  ،  ns=120·f/p', nt: ratio > 1 ? 'فرکانس بالاتر از نامی وارد شده است؛ ناحیه تضعیف میدان و محدودیت ولتاژ درایو را بررسی کنید.' : 'لغزش موتور لحاظ نشده؛ سرعت واقعی کمی با سرعت سنکرون تفاوت دارد.' }; } };
  SP[72] = { x: 1, name: 'جریان و گشتاور راه‌اندازی با کاهش ولتاژ',
    f: function () { return [N('V', 'ولتاژ نامی موتور (V)', 400), N('Vs', 'ولتاژ اعمالی هنگام راه‌اندازی (V)', 280), N('Istart', 'جریان راه‌اندازی مستقیم (A)', 240), N('Tstart', 'گشتاور راه‌اندازی مستقیم (N·m)', 180)]; },
    c: function (v) { need(v, 'V', 'Vs', 'Istart', 'Tstart'); pos(v, 'V'); if (v.Vs < 0 || v.Istart < 0 || v.Tstart < 0) throw new Error('مقادیر منفی وارد نکنید.'); var q = v.Vs / v.V;
      return { r: [['نسبت ولتاژ', q, 'pu'], ['جریان راه‌اندازی تخمینی', v.Istart * q, 'A'], ['گشتاور راه‌اندازی تخمینی', v.Tstart * q * q, 'N·m'], ['درصد گشتاور مستقیم', q * q * 100, '%']], fm: 'Ist∝V  ،  Tst∝V²', nt: 'تقریب برای موتور القایی با فرکانس ثابت و امپدانس معادل تقریباً ثابت؛ با تغییر نقطه کار دقت محدود است.' }; } };
  SP[73] = { x: 1, name: 'نیروی محرکه برگشتی و توان تبدیل‌شده موتور DC',
    f: function () { return [N('V', 'ولتاژ آرمیچر (V)', 220), N('Ia', 'جریان آرمیچر (A)', 35), N('Ra', 'مقاومت آرمیچر (Ω)', 0.25), N('n', 'سرعت (rpm)', 1500)]; },
    c: function (v) { need(v, 'V', 'Ia', 'Ra', 'n'); pos(v, 'V', 'n'); var e = v.V - v.Ia * v.Ra, p = e * v.Ia, w = 2 * PI * v.n / 60;
      return { r: [['نیروی محرکه برگشتی Eb', e, 'V'], ['توان تبدیل الکترومکانیکی', p / 1000, 'kW'], ['گشتاور توسعه‌یافته', p / w, 'N·m']], fm: 'Eb=V−Ia·Ra  ،  Pconv=Eb·Ia  ،  T=Pconv/ω', nt: e < 0 ? 'Eb منفی به دست آمده؛ جهت جریان/حالت ژنراتوری یا داده‌های ورودی را بررسی کنید.' : '' }; } };

  SP[74] = { x: 1, name: 'نیروی محرکه القایی و تلفات آرمیچر ژنراتور DC',
    f: function () { return [N('V', 'ولتاژ ترمینال ژنراتور (V)', 220), N('Ia', 'جریان آرمیچر (A)', 40), N('Ra', 'مقاومت آرمیچر (Ω)', 0.15), N('Vb', 'افت مجموع جاروبک‌ها (V)', 2)]; },
    c: function (v) { need(v, 'V', 'Ia', 'Ra', 'Vb'); pos(v, 'V'); if (v.Ia < 0 || v.Ra < 0 || v.Vb < 0) throw new Error('جریان، مقاومت و افت جاروبک نباید منفی باشند.'); var eg = v.V + v.Ia * v.Ra + v.Vb, pc = v.Ia * v.Ia * v.Ra, pg = eg * v.Ia;
      return { r: [['نیروی محرکه القایی Eg', eg, 'V'], ['تلفات مسی آرمیچر', pc, 'W'], ['توان الکترومغناطیسی توسعه‌یافته', pg / 1000, 'kW'], ['توان خروجی ترمینال', v.V * v.Ia / 1000, 'kW']], fm: 'Eg=Vt+Ia·Ra+Vbrush  ،  Pcu=Ia²·Ra  ،  Pdev=Eg·Ia', nt: 'تلفات میدان، آهنی، مکانیکی و افت جاروبک جداگانه در راندمان کل ژنراتور منظور می‌شوند.' }; } };
  SP[75] = { x: 1, name: 'جریان شارژ خازنی کابل قدرت',
    f: function () { return [N('C', 'ظرفیت خازنی هر فاز (µF/km)', 0.25), N('L', 'طول کابل (km)', 5), N('V', 'ولتاژ خط (kV)', 20), N('f', 'فرکانس (Hz)', 50)]; },
    c: function (v) { need(v, 'C', 'L', 'V', 'f'); pos(v, 'C', 'L', 'V', 'f'); var cp = v.C * 1e-6 * v.L, vph = v.V * 1000 / SQ3, ic = 2 * PI * v.f * cp * vph, q = SQ3 * v.V * ic / 1000;
      return { r: [['جریان شارژ هر فاز', ic, 'A'], ['توان راکتیو شارژ کل سه‌فاز', q, 'kvar'], ['ظرفیت کل هر فاز', cp * 1e6, 'µF']], fm: 'Ic=ω·Cphase·Vphase  ،  Qc=√3·VLL·Ic', nt: 'ظرفیت خازنی ورودی باید ظرفیت هر فاز کابل باشد؛ اثر آرایش هادی‌ها و شیلد مطابق دیتاشیت در نظر گرفته شود.' }; } };
  SP[76] = { x: 1, name: 'تنش الکتریکی بیشینه در عایق کابل هم‌محور',
    f: function () { return [N('V', 'ولتاژ بین هادی و شیلد (kV)', 12), N('a', 'شعاع هادی داخلی (mm)', 5), N('b', 'شعاع خارجی عایق (mm)', 15)]; },
    c: function (v) { need(v, 'V', 'a', 'b'); pos(v, 'V', 'a', 'b'); if (v.b <= v.a) throw new Error('شعاع خارجی باید از شعاع هادی بزرگ‌تر باشد.'); var emax = v.V / (v.a * Math.log(v.b / v.a)), emin = v.V / (v.b * Math.log(v.b / v.a));
      return { r: [['بیشینه تنش در سطح هادی', emax, 'kV/mm'], ['تنش در سطح بیرونی عایق', emin, 'kV/mm'], ['نسبت بیشینه به کمینه', emax / emin, '']], fm: 'E(r)=V/[r·ln(b/a)]', nt: 'مدل الکترواستاتیکی استوانه‌ای هم‌محور؛ برای طراحی عایق باید تنش مجاز، پیرشدگی و آزمون استاندارد بررسی شود.' }; } };
  SP[77] = { x: 1, name: 'اندوکتانس و راکتانس خط انتقال هوایی',
    f: function () { return [N('D12', 'فاصله فاز ۱ تا ۲ (m)', 4), N('D23', 'فاصله فاز ۲ تا ۳ (m)', 4), N('D31', 'فاصله فاز ۳ تا ۱ (m)', 8), N('gmr', 'GMR هادی (mm)', 8), N('L', 'طول خط (km)', 50), N('f', 'فرکانس (Hz)', 50)]; },
    c: function (v) { need(v, 'D12', 'D23', 'D31', 'gmr', 'L', 'f'); pos(v, 'D12', 'D23', 'D31', 'gmr', 'L', 'f'); var dm = Math.pow(v.D12 * v.D23 * v.D31, 1 / 3), g = v.gmr / 1000, lp = 2e-7 * Math.log(dm / g), lt = lp * v.L * 1000, x = 2 * PI * v.f * lt;
      if (dm <= g) throw new Error('GMD باید از GMR بزرگ‌تر باشد.'); return { r: [['GMD', dm, 'm'], ['اندوکتانس هر فاز', lt * 1000, 'mH'], ['راکتانس القایی هر فاز', x, 'Ω']], fm: 'GMD=(D12·D23·D31)^(1/3)  ،  L′=2×10⁻⁷ ln(GMD/GMR)', nt: 'خط سه‌فاز ترانسپوزشده و هادی تک‌رشته فرض شده است.' }; } };
  SP[78] = { x: 1, name: 'ظرفیت خازنی و جریان شارژ خط هوایی',
    f: function () { return [N('D12', 'فاصله فاز ۱ تا ۲ (m)', 4), N('D23', 'فاصله فاز ۲ تا ۳ (m)', 4), N('D31', 'فاصله فاز ۳ تا ۱ (m)', 8), N('r', 'شعاع هادی (mm)', 10), N('L', 'طول خط (km)', 50), N('V', 'ولتاژ خط (kV)', 132), N('f', 'فرکانس (Hz)', 50), N('er', 'ضریب گذردهی نسبی محیط', 1)]; },
    c: function (v) { need(v, 'D12', 'D23', 'D31', 'r', 'L', 'V', 'f', 'er'); pos(v, 'D12', 'D23', 'D31', 'r', 'L', 'V', 'f', 'er'); var dm = Math.pow(v.D12 * v.D23 * v.D31, 1 / 3), r = v.r / 1000; if (dm <= r) throw new Error('GMD باید از شعاع هادی بزرگ‌تر باشد.');
      var cp = 2 * Math.PI * 8.854187817e-12 * v.er / Math.log(dm / r), ctot = cp * v.L * 1000, iph = 2 * PI * v.f * ctot * v.V * 1000 / SQ3;
      return { r: [['ظرفیت هر فاز', ctot * 1e6, 'µF'], ['جریان شارژ هر فاز', iph, 'A'], ['توان راکتیو شارژ سه‌فاز', SQ3 * v.V * iph, 'kvar']], fm: 'C′=2πε₀εr/ln(GMD/r)  ،  Ic=ω·C·Vphase', nt: 'خط سه‌فاز ترانسپوزشده در محیط همگن فرض شده است؛ اثر زمین و کرونا نادیده گرفته شده.' }; } };
  SP[79] = { x: 1, name: 'امپدانس موجی و توان طبیعی خط (SIL)',
    f: function () { return [N('L', 'اندوکتانس هر فاز (mH/km)', 1.2), N('C', 'ظرفیت هر فاز (µF/km)', 0.01), N('V', 'ولتاژ خط (kV)', 400)]; },
    c: function (v) { need(v, 'L', 'C', 'V'); pos(v, 'L', 'C', 'V'); var z = Math.sqrt(v.L * 1e-3 / (v.C * 1e-6)), sil = v.V * v.V / z;
      return { r: [['امپدانس موجی Zc', z, 'Ω'], ['توان طبیعی خط SIL', sil, 'MW']], fm: 'Zc=√(L′/C′)  ،  SIL=VLL²/Zc', nt: 'برای خط سه‌فاز و پارامترهای توزیع‌شده؛ تلفات و تغییر پارامترها با فرکانس لحاظ نشده‌اند.' }; } };
  SP[80] = { x: 1, name: 'فلش (Sag) و کشش هادی بین دو پایه',
    f: function () { return [N('w', 'وزن واحد طول هادی (N/m)', 12), N('L', 'فاصله دهانه پایه‌ها (m)', 250), N('H', 'کشش افقی هادی (kN)', 20)]; },
    c: function (v) { need(v, 'w', 'L', 'H'); pos(v, 'w', 'L', 'H'); var h = v.H * 1000, sag = v.w * v.L * v.L / (8 * h), tmax = Math.sqrt(h * h + Math.pow(v.w * v.L / 2, 2));
      return { r: [['فلش در وسط دهانه', sag, 'm'], ['کشش بیشینه تقریبی در تکیه‌گاه', tmax / 1000, 'kN']], fm: 'Sag≈wL²/(8H)  ،  Tmax≈√[H²+(wL/2)²]', nt: 'تقریب سهمی برای دهانه هم‌تراز و فلش کوچک؛ باد، یخ، اختلاف ارتفاع و خزش هادی لحاظ نشده است.' }; } };
  SP[81] = { x: 1, name: 'اثر فرانتی و افزایش ولتاژ بی‌باری خط',
    f: function () { return [N('f', 'فرکانس (Hz)', 50), N('L', 'اندوکتانس سری هر فاز (mH/km)', 1.2), N('C', 'ظرفیت شنت هر فاز (µF/km)', 0.01), N('len', 'طول خط (km)', 200), N('V', 'ولتاژ انتهای خط (kV)', 220)]; },
    c: function (v) { need(v, 'f', 'L', 'C', 'len', 'V'); pos(v, 'f', 'L', 'C', 'len', 'V'); var lt = v.L * 1e-3 * v.len, ct = v.C * 1e-6 * v.len, ratio = Math.pow(2 * PI * v.f, 2) * lt * ct / 2;
      return { r: [['افزایش ولتاژ بی‌باری تقریبی', ratio * 100, '%'], ['افزایش ولتاژ', v.V * ratio, 'kV'], ['ولتاژ مبدأ تخمینی', v.V * (1 + ratio), 'kV']], fm: 'ΔV/V≈ω²·Ltotal·Ctotal/2', nt: 'تقریب خط بی‌بارِ کم‌اتلاف؛ برای خطوط بلند باید از مدل دقیق پارامترهای توزیع‌شده و جبران‌سازی استفاده شود.' }; } };

  SP[82] = { x: 1, name: 'تبدیل مقادیر سیستم پریونیت (Per-Unit)',
    f: function () { return [N('S', 'توان مبنا (MVA)', 100), N('V', 'ولتاژ مبنا خط‌به‌خط (kV)', 20), N('Z', 'امپدانس واقعی هر فاز (Ω)', 4)]; },
    c: function (v) { need(v, 'S', 'V', 'Z'); pos(v, 'S', 'V'); var zb = v.V * v.V / v.S, ib = v.S * 1000 / (SQ3 * v.V), zpu = v.Z / zb;
      return { r: [['امپدانس مبنا', zb, 'Ω'], ['جریان مبنا', ib, 'A'], ['امپدانس پریونیت', zpu, 'pu'], ['امپدانس درصدی', zpu * 100, '%']], fm: 'Zbase=Vbase²/Sbase  ،  Ibase=Sbase/(√3·Vbase)  ،  Zpu=Zactual/Zbase', nt: 'V بر حسب kV و S بر حسب MVA وارد شود؛ Z واقعی امپدانس هر فاز است.' }; } };
  SP[83] = { x: 1, name: 'تلفات و افت ولتاژ شاخه سه‌فاز در پخش بار',
    f: function () { return [N('P', 'توان اکتیو عبوری (kW)', 500), N('Q', 'توان راکتیو عبوری (kvar)', 250), N('V', 'ولتاژ خط (V)', 400), N('R', 'مقاومت هر فاز شاخه (Ω)', 0.08), N('X', 'راکتانس هر فاز شاخه (Ω)', 0.12)]; },
    c: function (v) { need(v, 'P', 'Q', 'V', 'R', 'X'); pos(v, 'V'); var s = Math.hypot(v.P, v.Q), i = s * 1000 / (SQ3 * v.V), co = s ? v.P / s : 1, si = s ? v.Q / s : 0, dv = SQ3 * i * (v.R * co + v.X * si), pl = 3 * i * i * v.R, ql = 3 * i * i * v.X;
      return { r: [['جریان شاخه', i, 'A'], ['افت ولتاژ تقریبی', dv, 'V'], ['درصد افت ولتاژ', 100 * dv / v.V, '%'], ['تلفات اکتیو', pl / 1000, 'kW'], ['توان راکتیو جذب‌شده', ql / 1000, 'kvar']], fm: 'I=√(P²+Q²)/(√3V)  ،  ΔV≈√3I(Rcosφ+Xsinφ)  ،  Pl=3I²R', nt: 'مدل تک‌شاخه متعادل؛ P و Q بر حسب kW/kvar هستند و افت ولتاژ خطی تقریبی است.' }; } };
  SP[84] = { x: 1, name: 'درصد نامتعادلی ولتاژ سه‌فاز (روش NEMA)',
    f: function () { return [N('V1', 'ولتاژ خط Vab (V)', 400), N('V2', 'ولتاژ خط Vbc (V)', 392), N('V3', 'ولتاژ خط Vca (V)', 408)]; },
    c: function (v) { need(v, 'V1', 'V2', 'V3'); pos(v, 'V1', 'V2', 'V3'); var avg = (v.V1 + v.V2 + v.V3) / 3, md = Math.max(Math.abs(v.V1 - avg), Math.abs(v.V2 - avg), Math.abs(v.V3 - avg));
      return { r: [['میانگین ولتاژ خط', avg, 'V'], ['بیشترین انحراف از میانگین', md, 'V'], ['درصد نامتعادلی ولتاژ', 100 * md / avg, '%']], fm: 'VUF_NEMA = max(|Vi−Vavg|)/Vavg × 100', nt: 'روش بیشترین انحراف NEMA است؛ با مؤلفه منفی IEC که روش محاسبه متفاوتی دارد یکسان نیست.' }; } };
  SP[85] = { x: 1, name: 'جریان اتصال کوتاه دو فاز (فاز به فاز)',
    f: function () { return [N('V', 'ولتاژ خط شبکه (V)', 20000), N('Z1', 'امپدانس توالی مثبت (Ω)', 0.4), N('Z2', 'امپدانس توالی منفی (Ω)', 0.4)]; },
    c: function (v) { need(v, 'V', 'Z1', 'Z2'); pos(v, 'V'); if (!(v.Z1 + v.Z2 > 0)) throw new Error('مجموع امپدانس توالی‌ها باید مثبت باشد.'); var i = v.V / (v.Z1 + v.Z2);
      return { r: [['جریان خطای دو فاز', i / 1000, 'kA'], ['توان ظاهری متناظر', SQ3 * v.V * i / 1e6, 'MVA']], fm: 'I_LL = VLL/(Z₁+Z₂)', nt: 'امپدانس‌ها به‌صورت مقادیر مختلط/اندازه ساده شده‌اند؛ برای دقت باید زاویه فاز امپدانس‌ها منظور شود.' }; } };
  SP[86] = { x: 1, name: 'جریان پیک نامتقارن اتصال کوتاه از نسبت X/R',
    f: function () { return [N('Ik', 'جریان اتصال کوتاه متقارن RMS (kA)', 25), N('XR', 'نسبت X/R شبکه', 15)]; },
    c: function (v) { need(v, 'Ik', 'XR'); pos(v, 'Ik', 'XR'); var k = 1.02 + 0.98 * Math.exp(-3 / v.XR), ip = k * Math.SQRT2 * v.Ik;
      return { r: [['ضریب پیک κ', k, ''], ['جریان پیک نامتقارن', ip, 'kA']], fm: 'κ≈1.02+0.98·e^(−3R/X)  ،  ip=κ·√2·Ik', nt: 'تقریب متداول IEC برای شبکه ۵۰/۶۰ هرتز؛ زمان قطع و ثابت زمانی DC offset در انتخاب نهایی کلید مؤثر است.' }; } };
  SP[87] = { x: 1, name: 'بررسی ظرفیت قطع کلید نسبت به جریان خطا',
    f: function () { return [N('V', 'ولتاژ خط (kV)', 20), N('Ik', 'جریان اتصال کوتاه محل (kA)', 16), N('Ib', 'جریان نامی کلید (A)', 1250)]; },
    c: function (v) { need(v, 'V', 'Ik', 'Ib'); pos(v, 'V', 'Ik', 'Ib'); var duty = SQ3 * v.V * v.Ik, std = [6.3, 8, 10, 12.5, 16, 20, 25, 31.5, 40, 50, 63], next = nextStd(v.Ik, std);
      return { r: [['قدرت قطع موردنیاز', duty, 'MVA'], ['جریان قطع نامی واردشده', v.Ik, 'kA'], ['جریان نامی دائم کلید', v.Ib, 'A'], ['حداقل رده استاندارد جریان قطع', next || 'بیش از ۶۳', 'kA']], fm: 'Sbreak=√3·VLL·Ik', nt: 'جریان قطع نامی کلید باید حداقل برابر جریان خطای محاسبه‌شده باشد؛ زمان قطع، جریان وصل پیک، تحمل کوتاه‌مدت و استاندارد تجهیز جداگانه کنترل شود.' }; } };

  SP[88] = { x: 1, name: 'تبدیل جریان تنظیم رله از ثانویه CT به اولیه',
    f: function () { return [N('Ip', 'جریان اولیه CT (A)', 400), N('Is', 'جریان ثانویه نامی CT (A)', 5), N('plug', 'تنظیم جریان رله (% جریان ثانویه)', 100)]; },
    c: function (v) { need(v, 'Ip', 'Is', 'plug'); pos(v, 'Ip', 'Is', 'plug'); var ratio = v.Ip / v.Is, sec = v.Is * v.plug / 100;
      return { r: [['نسبت تبدیل CT', ratio, ''], ['جریان Pickup ثانویه رله', sec, 'A'], ['جریان Pickup معادل اولیه', sec * ratio, 'A']], fm: 'CTR=Ip/Is  ،  Ipickup,pri=CTR·Ipickup,sec', nt: 'تنظیم نهایی باید با جریان بار، جریان هجومی، حساسیت و هماهنگی حفاظتی بررسی شود.' }; } };
  SP[89] = { x: 1, name: 'محاسبه جریان عملکرد و مهار رله دیفرانسیل',
    f: function () { return [N('I1', 'جریان ثانویه CT سمت اول (A)', 4.8), N('I2', 'جریان ثانویه CT سمت دوم پس از جبران (A)', 4.5), N('pickup', 'حداقل جریان عملکرد (A)', 0.3), N('slope', 'شیب مهار (%)', 30)]; },
    c: function (v) { need(v, 'I1', 'I2', 'pickup', 'slope'); if (v.I1 < 0 || v.I2 < 0 || v.pickup < 0 || v.slope < 0) throw new Error('جریان‌ها و تنظیمات نباید منفی باشند.'); var op = Math.abs(v.I1 - v.I2), rest = (v.I1 + v.I2) / 2, threshold = Math.max(v.pickup, rest * v.slope / 100), trip = op > threshold;
      return { r: [['جریان عملکرد دیفرانسیل', op, 'A'], ['جریان مهار', rest, 'A'], ['آستانه عملکرد', threshold, 'A'], ['نتیجه منطقی', trip ? 'فرمان عملکرد' : 'عدم عملکرد', '']], fm: 'Iop=|I1−I2|  ،  Irest=(|I1|+|I2|)/2  ،  Trip اگر Iop>max(Imin,Slope·Irest)', nt: 'جریان‌ها باید از نظر نسبت CT، گروه برداری و جبران دامنه/فاز هم‌مقیاس شده باشند؛ این فقط منطق ساده بایاس است.' }; } };
  SP[90] = { x: 1, name: 'بار CT و افت ولتاژ سیم‌های ثانویه',
    f: function () { return [N('I', 'جریان ثانویه CT (A)', 5), N('L', 'طول یک‌طرفه کابل (m)', 20), N('A', 'سطح مقطع کابل مسی (mm²)', 2.5), N('VA', 'بار ابزارها (VA)', 5)]; },
    c: function (v) { need(v, 'I', 'L', 'A', 'VA'); pos(v, 'I', 'L', 'A'); var rw = 0.01724 * 2 * v.L / v.A, drop = v.I * rw, vabase = v.I * v.I * rw;
      return { r: [['مقاومت رفت‌وبرگشت سیم‌ها', rw, 'Ω'], ['افت ولتاژ سیم‌ها', drop, 'V'], ['بار سیم‌ها', vabase, 'VA'], ['بار کل CT با ابزارها', vabase + v.VA, 'VA']], fm: 'Rlead=ρ·2L/A  ،  VAlead=Is²·Rlead', nt: 'مقاومت مس در ۲۰°C تقریب زده شده؛ دما، اتصالات و طول واقعی مسیر رفت‌وبرگشت را لحاظ کنید.' }; } };

  SP[91] = { x: 1, name: 'فرکانس و مرتبه تشدید موازی بانک خازنی با شبکه',
    f: function () { return [N('Ssc', 'توان اتصال کوتاه شبکه (MVA)', 100), N('Qc', 'توان بانک خازنی (kvar)', 500), N('f', 'فرکانس پایه (Hz)', 50)]; },
    c: function (v) { need(v, 'Ssc', 'Qc', 'f'); pos(v, 'Ssc', 'Qc', 'f'); var h = Math.sqrt(v.Ssc * 1000 / v.Qc), fr = h * v.f;
      return { r: [['مرتبه تشدید h', h, ''], ['فرکانس تشدید', fr, 'Hz'], ['فاصله از هارمونیک پنجم', Math.abs(fr - 5 * v.f), 'Hz']], fm: 'hres≈√(Ssc(MVA)·1000/Qc(kvar))  ،  fres=hres·f1', nt: 'تخمین تشدید موازی با مدل ساده منبع القایی و بانک خازنی؛ بررسی اسکن امپدانس برای طراحی فیلتر ضروری است.' }; } };
  SP[92] = { x: 1, name: 'محاسبه راکتور سری برای محدودسازی جریان اتصال کوتاه',
    f: function () { return [N('V', 'ولتاژ خط شبکه (kV)', 20), N('Iold', 'جریان اتصال کوتاه فعلی (kA)', 25), N('Inew', 'جریان هدف پس از راکتور (kA)', 16)]; },
    c: function (v) { need(v, 'V', 'Iold', 'Inew'); pos(v, 'V', 'Iold', 'Inew'); if (v.Inew >= v.Iold) throw new Error('جریان هدف باید کمتر از جریان فعلی باشد.'); var xs = v.V / (SQ3 * v.Iold), xt = v.V / (SQ3 * v.Inew), xr = xt - xs;
      return { r: [['راکتانس معادل فعلی هر فاز', xs, 'Ω'], ['راکتانس کل لازم هر فاز', xt, 'Ω'], ['راکتانس راکتور سری هر فاز', xr, 'Ω'], ['درصد محدودسازی جریان', 100 * (1 - v.Inew / v.Iold), '%']], fm: 'Xsource=VLL/(√3·Iold)  ،  Xtotal=VLL/(√3·Inew)  ،  Xreactor=Xtotal−Xsource', nt: 'مبنای محاسبه فقط راکتانس است؛ مقاومت، X/R، افت ولتاژ بار و تنش حرارتی/الکترودینامیکی باید بررسی شوند.' }; } };

  SP[93] = { x: 1, name: 'یکسوساز پل دیودی تک‌فاز تمام‌موج',
    f: function () { return [N('Vac', 'ولتاژ ورودی AC (V RMS)', 230), N('f', 'فرکانس ورودی (Hz)', 50), N('Idc', 'جریان DC بار (A)', 5), N('Vd', 'افت هر دیود (V)', 0.8)]; },
    c: function (v) { need(v, 'Vac', 'f', 'Idc', 'Vd'); pos(v, 'Vac', 'f', 'Idc'); var vd = 0.9 * v.Vac - 2 * v.Vd;
      return { r: [['ولتاژ متوسط DC تقریبی', vd, 'V'], ['توان DC بار', vd * v.Idc, 'W'], ['فرکانس ریپل', 2 * v.f, 'Hz'], ['PIV تقریبی هر دیود', Math.SQRT2 * v.Vac, 'V']], fm: 'Vdc≈0.9·Vac−2Vd  ،  fripple=2f', nt: 'یکسوساز تمام‌موج تک‌فاز با بار مقاومتی/جریان پیوسته ساده‌شده؛ خازن صافی، افت منبع و جریان هجومی لحاظ نشده‌اند.' }; } };
  SP[94] = { x: 1, name: 'یکسوساز پل دیودی سه‌فاز شش‌پالسه',
    f: function () { return [N('V', 'ولتاژ خط ورودی (V RMS)', 400), N('f', 'فرکانس شبکه (Hz)', 50), N('Idc', 'جریان DC بار (A)', 20), N('Vd', 'افت هر دیود (V)', 0.9)]; },
    c: function (v) { need(v, 'V', 'f', 'Idc', 'Vd'); pos(v, 'V', 'f', 'Idc'); var vd = 1.35 * v.V - 2 * v.Vd;
      return { r: [['ولتاژ متوسط DC', vd, 'V'], ['توان DC', vd * v.Idc, 'W'], ['فرکانس ریپل شش‌پالسه', 6 * v.f, 'Hz']], fm: 'Vdc≈1.35·VLL−2Vd  ،  fripple=6f', nt: 'یکسوساز دیودی شش‌پالسه ایده‌آل‌شده؛ هم‌پوشانی کموتاسیون و امپدانس منبع نادیده گرفته شده است.' }; } };
  SP[95] = { x: 1, name: 'ولتاژ DC خروجی یکسوساز کنترل‌شده سه‌فاز',
    f: function () { return [N('V', 'ولتاژ خط AC (V RMS)', 400), N('a', 'زاویه آتش آلفا (درجه)', 30), N('Idc', 'جریان DC (A)', 20)]; },
    c: function (v) { need(v, 'V', 'a', 'Idc'); pos(v, 'V'); if (v.a < 0 || v.a > 180) throw new Error('زاویه آتش باید بین ۰ تا ۱۸۰ درجه باشد.'); var vd = 1.35 * v.V * Math.cos(v.a * PI / 180);
      return { r: [['ولتاژ متوسط DC', vd, 'V'], ['توان DC علامت‌دار', vd * v.Idc, 'W'], ['زاویه آتش', v.a, '°']], fm: 'Vdc=1.35·VLL·cos(α)', nt: 'پل تمام‌کنترل سه‌فاز با جریان DC پیوسته؛ کموتاسیون، افت تریستور و محدودیت اینورتر در نظر گرفته نشده‌اند.' }; } };
  SP[96] = { x: 1, name: 'محاسبه سیکل کاری مبدل کاهنده Buck',
    f: function () { return [N('Vin', 'ولتاژ ورودی (V)', 48), N('Vo', 'ولتاژ خروجی هدف (V)', 12), N('Io', 'جریان خروجی (A)', 5), N('eta', 'بازده مبدل (%)', 92)]; },
    c: function (v) { need(v, 'Vin', 'Vo', 'Io', 'eta'); pos(v, 'Vin', 'Vo', 'Io', 'eta'); if (v.Vo > v.Vin || v.eta > 100) throw new Error('در Buck باید Vo≤Vin و بازده حداکثر ۱۰۰٪ باشد.'); var d = v.Vo / v.Vin, pin = v.Vo * v.Io / (v.eta / 100);
      return { r: [['سیکل کاری D', d, ''], ['درصد زمان روشن', 100 * d, '%'], ['توان خروجی', v.Vo * v.Io, 'W'], ['جریان ورودی میانگین', pin / v.Vin, 'A']], fm: 'D≈Vo/Vin  ،  Pin=Po/η', nt: 'مبدل Buck ایده‌آل در حالت هدایت پیوسته؛ افت کلید و ریپل لحاظ نشده است.' }; } };
  SP[97] = { x: 1, name: 'محاسبه سیکل کاری مبدل افزاینده Boost',
    f: function () { return [N('Vin', 'ولتاژ ورودی (V)', 12), N('Vo', 'ولتاژ خروجی هدف (V)', 48), N('Io', 'جریان خروجی (A)', 2), N('eta', 'بازده مبدل (%)', 90)]; },
    c: function (v) { need(v, 'Vin', 'Vo', 'Io', 'eta'); pos(v, 'Vin', 'Vo', 'Io', 'eta'); if (v.Vo < v.Vin || v.eta > 100) throw new Error('در Boost باید Vo≥Vin و بازده حداکثر ۱۰۰٪ باشد.'); var d = 1 - v.Vin / v.Vo, pin = v.Vo * v.Io / (v.eta / 100);
      return { r: [['سیکل کاری D', d, ''], ['درصد زمان روشن', 100 * d, '%'], ['توان خروجی', v.Vo * v.Io, 'W'], ['جریان ورودی میانگین', pin / v.Vin, 'A']], fm: 'D≈1−Vin/Vo  ،  Pin=Po/η', nt: 'مبدل Boost ایده‌آل در حالت هدایت پیوسته؛ افت کلید و دیود، ریپل و محدودیت اشباع سلف لحاظ نشده است.' }; } };

  SP[98] = { x: 1, name: 'ظرفیت باتری برای بار و زمان پشتیبانی',
    f: function () { return [N('P', 'توان بار DC/AC (W)', 600), N('V', 'ولتاژ بانک باتری (V)', 48), N('t', 'زمان پشتیبانی (ساعت)', 2), N('eta', 'بازده مسیر تبدیل (%)', 90), N('dod', 'عمق دشارژ مجاز (%)', 80)]; },
    c: function (v) { need(v, 'P', 'V', 't', 'eta', 'dod'); pos(v, 'P', 'V', 't', 'eta', 'dod'); if (v.eta > 100 || v.dod > 100) throw new Error('بازده و عمق دشارژ حداکثر ۱۰۰٪ هستند.'); var ah = v.P * v.t / (v.V * (v.eta / 100) * (v.dod / 100));
      return { r: [['جریان متوسط بانک', v.P / (v.V * (v.eta / 100)), 'A'], ['ظرفیت محاسباتی بانک', ah, 'Ah'], ['انرژی اسمی باتری', ah * v.V / 1000, 'kWh']], fm: 'Ah=P·t/[V·η·DoD]', nt: 'اثر دما، نرخ دشارژ، پیری، راندمان واقعی اینورتر و قانون پیکرت لحاظ نشده؛ ظرفیت نهایی با دیتاشیت باتری انتخاب شود.' }; } };
  SP[99] = { x: 1, name: 'تعداد باتری سری و موازی در بانک ذخیره انرژی',
    f: function () { return [N('Vsys', 'ولتاژ DC موردنیاز بانک (V)', 48), N('Vb', 'ولتاژ هر باتری (V)', 12), N('Ah', 'ظرفیت موردنیاز بانک (Ah)', 200), N('Ahb', 'ظرفیت هر باتری (Ah)', 100)]; },
    c: function (v) { need(v, 'Vsys', 'Vb', 'Ah', 'Ahb'); pos(v, 'Vsys', 'Vb', 'Ah', 'Ahb'); var ns = Math.ceil(v.Vsys / v.Vb), np = Math.ceil(v.Ah / v.Ahb);
      return { r: [['تعداد باتری سری', ns, 'عدد'], ['تعداد رشته موازی', np, 'رشته'], ['تعداد کل باتری', ns * np, 'عدد'], ['ولتاژ واقعی بانک', ns * v.Vb, 'V'], ['ظرفیت واقعی بانک', np * v.Ahb, 'Ah'], ['انرژی اسمی بانک', ns * v.Vb * np * v.Ahb / 1000, 'kWh']], fm: 'Ns=ceil(Vbank/Vbattery)  ،  Np=ceil(Ahreq/Ahbattery)', nt: 'ولتاژ نامی باتری‌ها باید با شارژر و محدوده ولتاژ تجهیز سازگار باشد؛ اتصال موازی نیازمند حفاظت و کابل‌کشی متقارن است.' }; } };
  SP[100] = { x: 1, name: 'ظرفیت نامی UPS و جریان بانک DC',
    f: function () { return [N('P', 'توان واقعی بار (W)', 3000), N('pf', 'ضریب توان بار', 0.9), N('margin', 'حاشیه ظرفیت (%)', 25), N('Vdc', 'ولتاژ باس باتری (V)', 192), N('eta', 'بازده اینورتر (%)', 92)]; },
    c: function (v) { need(v, 'P', 'pf', 'margin', 'Vdc', 'eta'); pos(v, 'P', 'Vdc', 'eta'); if (v.pf <= 0 || v.pf > 1 || v.eta > 100 || v.margin < 0) throw new Error('ضریب توان/بازده باید حداکثر ۱ و حاشیه نامنفی باشد.'); var va = v.P / v.pf * (1 + v.margin / 100), idc = v.P / (v.Vdc * v.eta / 100);
      return { r: [['ظرفیت ظاهری UPS با حاشیه', va / 1000, 'kVA'], ['توان واقعی موردنیاز با حاشیه', v.P * (1 + v.margin / 100) / 1000, 'kW'], ['جریان DC ورودی در بار فعلی', idc, 'A']], fm: 'SUPS≥P·(1+margin)/PF  ،  Idc=P/(Vdc·η)', nt: 'انتخاب نهایی باید جریان هجومی، اضافه‌بار، ضریب crest factor، افزونگی و ظرفیت واقعی باتری را نیز پوشش دهد.' }; } };

  SP[101] = { x: 1, name: 'تخمین توان و تعداد پنل خورشیدی از انرژی روزانه',
    f: function () { return [N('E', 'مصرف روزانه (kWh/day)', 12), N('psh', 'ساعات آفتاب معادل (h/day)', 5), N('eta', 'بازده کل سیستم (۰ تا ۱)', 0.78), N('Wp', 'توان نامی هر پنل (W)', 550)]; },
    c: function (v) { need(v, 'E', 'psh', 'eta', 'Wp'); pos(v, 'E', 'psh', 'eta', 'Wp'); if (v.eta > 1) throw new Error('بازده کل را به صورت عدد بین صفر و یک وارد کنید؛ مثلاً ۰٫۷۸.'); var kwp = v.E / (v.psh * v.eta), n = Math.ceil(kwp * 1000 / v.Wp);
      return { r: [['توان آرایه موردنیاز', kwp, 'kWp'], ['حداقل تعداد پنل', n, 'عدد'], ['توان نصب‌شده گرد‌شده', n * v.Wp / 1000, 'kWp']], fm: 'Parray(kWp)=Eday/(PSH·η)  ،  N=ceil(Parray·1000/Wpanel)', nt: 'برای طراحی واقعی باید فصل کم‌تابش، سایه، جهت، دما، تلفات سیم و اینورتر و ذخیره باتری لحاظ شود.' }; } };
  SP[102] = { x: 1, name: 'تعداد پنل سری و موازی در آرایه فتوولتائیک',
    f: function () { return [N('Vdc', 'ولتاژ کاری هدف MPPT اینورتر (V)', 600), N('Vmax', 'حداکثر ولتاژ مجاز اینورتر (V)', 1000), N('Voc', 'Voc هر پنل در STC (V)', 49.5), N('Vmp', 'Vmp هر پنل در STC (V)', 41), N('kt', 'ضریب دمایی Voc (%/°C)', -0.28), N('Tmin', 'حداقل دمای محیط (°C)', -10), N('Tstc', 'دمای مرجع سلول (°C)', 25), N('Npar', 'تعداد رشته موازی موردنظر', 4)]; },
    c: function (v) { need(v, 'Vdc', 'Vmax', 'Voc', 'Vmp', 'kt', 'Tmin', 'Tstc', 'Npar'); pos(v, 'Vdc', 'Vmax', 'Voc', 'Vmp', 'Npar'); var vocCold = v.Voc * (1 + v.kt / 100 * (v.Tmin - v.Tstc)), ns = Math.floor(v.Vmax / vocCold), target = Math.max(1, Math.round(v.Vdc / v.Vmp));
      if (!(vocCold > 0) || ns < 1) throw new Error('ولتاژ مدار باز تصحیح‌شده یا تعداد سری معتبر نیست.');
      return { r: [['Voc تصحیح‌شده در سرما', vocCold, 'V'], ['حداکثر تعداد پنل سری از نظر ولتاژ', ns, 'عدد'], ['تعداد سری نزدیک به ولتاژ کاری هدف', target, 'عدد'], ['ولتاژ کاری تخمینی رشته', target * v.Vmp, 'V'], ['تعداد پنل موازی', v.Npar, 'رشته'], ['تعداد کل پنل‌ها با تعداد سری پیشنهادی', target * v.Npar, 'عدد']], fm: 'Voc,cold=Voc·[1+βVoc·(Tmin−Tstc)]  ،  Ns,max≤Vmax/Voc,cold  ،  Ns,target≈Vmppt/Vmp', nt: target > ns ? 'تعداد سری هدف از حد مجاز ولتاژ مدار باز بیشتر است؛ آرایش نامعتبر است.' : 'محدوده کامل MPPT، حداقل ولتاژ شروع، جریان ورودی، تلرانس پنل و دمای واقعی سلول را کنترل کنید.' }; } };
  SP[103] = { x: 1, name: 'توان مکانیکی و الکتریکی قابل برداشت توربین بادی',
    f: function () { return [N('rho', 'چگالی هوا (kg/m³)', 1.225), N('r', 'شعاع روتور (m)', 20), N('v', 'سرعت باد (m/s)', 8), N('cp', 'ضریب توان آیرودینامیکی Cp', 0.4), N('eta', 'بازده مکانیکی و ژنراتور', 0.9)]; },
    c: function (v) { need(v, 'rho', 'r', 'v', 'cp', 'eta'); pos(v, 'rho', 'r', 'v'); if (v.cp < 0 || v.cp > 0.593 || v.eta < 0 || v.eta > 1) throw new Error('Cp باید بین صفر و حد بتز ۰٫۵۹۳ و بازده بین صفر و یک باشد.'); var area = PI * v.r * v.r, pw = 0.5 * v.rho * area * Math.pow(v.v, 3), po = pw * v.cp * v.eta;
      return { r: [['مساحت جاروب‌شده', area, 'm²'], ['توان باد عبوری', pw / 1000, 'kW'], ['توان خروجی تخمینی', po / 1000, 'kW']], fm: 'Pwind=½ρAv³  ،  Pe=Pwind·Cp·η', nt: 'بدون منحنی توان توربین؛ سرعت cut-in/cut-out، کنترل گام، چگالی متغیر هوا و محدودیت ژنراتور لحاظ نشده است.' }; } };
  SP[104] = { x: 1, name: 'توان خروجی نیروگاه برق‌آبی',
    f: function () { return [N('Q', 'دبی آب (m³/s)', 2), N('H', 'ارتفاع خالص سقوط (m)', 50), N('eta', 'بازده کل توربین و ژنراتور (%)', 88), N('rho', 'چگالی آب (kg/m³)', 1000)]; },
    c: function (v) { need(v, 'Q', 'H', 'eta', 'rho'); pos(v, 'Q', 'H', 'rho'); if (v.eta < 0 || v.eta > 100) throw new Error('بازده باید بین صفر تا صد باشد.'); var p = v.rho * 9.80665 * v.Q * v.H * v.eta / 100;
      return { r: [['توان هیدرولیکی آب', v.rho * 9.80665 * v.Q * v.H / 1000, 'kW'], ['توان الکتریکی خروجی', p / 1000, 'kW']], fm: 'P=ρ·g·Q·H·η', nt: 'H باید ارتفاع خالص پس از افت مسیر باشد؛ تغییر دبی، کاویتاسیون و راندمان جزئی لحاظ نشده‌اند.' }; } };
  SP[105] = { x: 1, name: 'راندمان حرارتی و Heat Rate نیروگاه',
    f: function () { return [N('P', 'توان خالص تولیدی (MW)', 100), N('F', 'مصرف سوخت (kg/h)', 25000), N('LHV', 'ارزش حرارتی پایین سوخت (MJ/kg)', 42)]; },
    c: function (v) { need(v, 'P', 'F', 'LHV'); pos(v, 'P', 'F', 'LHV'); var eff = 100 * v.P * 3600 / (v.F * v.LHV), hr = v.F * v.LHV / v.P;
      return { r: [['راندمان حرارتی', eff, '%'], ['Heat Rate', hr, 'kJ/kWh'], ['انرژی ورودی سوخت', v.F * v.LHV / 3600, 'MWth']], fm: 'η=3600·P(MW)/(F·LHV)×100  ،  HeatRate=F·LHV/P', nt: 'تعریف سوخت و ارزش حرارتی باید یکسان باشد؛ برای راندمان خالص، مصرف کمکی نیروگاه از توان ناخالص کسر شود.' }; } };

  SP[106] = { x: 1, name: 'حد انتقال توان و حاشیه پایداری ولتاژ در مدل دو شینه',
    f: function () { return [N('V1', 'ولتاژ شینه فرستنده (kV)', 400), N('V2', 'ولتاژ شینه گیرنده (kV)', 380), N('X', 'راکتانس معادل بین دو شینه (Ω)', 40), N('d', 'زاویه بار δ (درجه)', 30)]; },
    c: function (v) { need(v, 'V1', 'V2', 'X', 'd'); pos(v, 'V1', 'V2', 'X'); var pmax = v.V1 * v.V2 / v.X, p = pmax * Math.sin(v.d * PI / 180);
      return { r: [['حداکثر توان نظری در δ=90°', pmax, 'MW'], ['توان انتقالی در زاویه واردشده', p, 'MW'], ['درصد استفاده از حد نظری', 100 * p / pmax, '%']], fm: 'P=(V1·V2/X)·sinδ  ،  Pmax=V1·V2/X', nt: 'مدل دو شینه بدون مقاومت، بارگذاری ولتاژی و محدودیت حرارتی؛ حد نظری به معنی حد مجاز بهره‌برداری نیست.' }; } };
  SP[107] = { x: 1, name: 'مشخصه توان-زاویه ژنراتور سنکرون',
    f: function () { return [N('E', 'ولتاژ داخلی هر فاز (V)', 7000), N('V', 'ولتاژ ترمینال هر فاز (V)', 6350), N('X', 'راکتانس سنکرون هر فاز (Ω)', 10), N('d', 'زاویه بار δ (درجه)', 25)]; },
    c: function (v) { need(v, 'E', 'V', 'X', 'd'); pos(v, 'E', 'V', 'X'); var pmax = 3 * v.E * v.V / v.X, p = pmax * Math.sin(v.d * PI / 180);
      return { r: [['حداکثر توان الکترومغناطیسی', pmax / 1000, 'kW'], ['توان در زاویه بار', p / 1000, 'kW'], ['درصد توان نسبت به بیشینه', 100 * p / pmax, '%']], fm: 'P=3EV/Xs·sinδ', nt: 'مدل روتور استوانه‌ای با مقاومت آرمیچر ناچیز؛ برای روتور قطب برجسته باید مؤلفه رلوکتانسی افزوده شود.' }; } };

  SP[108] = { x: 1, name: 'خطای اندازه‌گیری و تصحیح مقدار قرائت‌شده',
    f: function () { return [N('true', 'مقدار مرجع/واقعی', 230), N('meas', 'مقدار اندازه‌گیری‌شده', 226.5)]; },
    c: function (v) { need(v, 'true', 'meas'); if (v.true === 0) throw new Error('مقدار مرجع نباید صفر باشد.'); var e = v.meas - v.true;
      return { r: [['خطای مطلق (قرائت−مرجع)', e, ''], ['قدر مطلق خطا', Math.abs(e), ''], ['خطای نسبی', 100 * e / v.true, '%'], ['تصحیح لازم روی قرائت', -e, '']], fm: 'Error=Measured−True  ،  Relative Error=Error/True×100' }; } };
  // روابط CT وVT در محاسبه‌گر مشترک C[126] ادغام شده‌اند.
  SP[111] = { x: 1, name: 'شاخص‌های قابلیت اطمینان شبکه SAIFI، SAIDI و CAIDI',
    f: function () { return [N('N', 'تعداد مشترکان تحت بررسی', 10000), N('Ni', 'تعداد کل خاموشی-مشترک (Customer Interruptions)', 2500), N('Nh', 'مجموع مدت خاموشی مشترکان (Customer-hours)', 5000)]; },
    c: function (v) { need(v, 'N', 'Ni', 'Nh'); pos(v, 'N'); if (v.Ni < 0 || v.Nh < 0) throw new Error('مقادیر خاموشی نباید منفی باشند.'); var fi = v.Ni / v.N, di = v.Nh / v.N, ca = v.Ni > 0 ? v.Nh / v.Ni : 0;
      return { r: [['SAIFI', fi, 'قطع/مشترک'], ['SAIDI', di, 'ساعت/مشترک'], ['CAIDI', ca, 'ساعت/قطع'], ['ASAI تخمینی', 100 * (1 - di / 8760), '%']], fm: 'SAIFI=ΣNi/N  ،  SAIDI=Σri·Ni/N  ،  CAIDI=SAIDI/SAIFI', nt: 'برای ASAI از سال ۸۷۶۰ ساعته استفاده شده؛ رویدادهای برنامه‌ریزی‌شده یا استثناها طبق تعریف گزارش‌گیری باید اعمال شوند.' }; } };
  SP[112] = { x: 1, name: 'قابلیت دسترسی تجهیز از MTBF و MTTR',
    f: function () { return [N('mtbf', 'میانگین زمان بین خرابی MTBF (h)', 2000), N('mttr', 'میانگین زمان تعمیر MTTR (h)', 8)]; },
    c: function (v) { need(v, 'mtbf', 'mttr'); pos(v, 'mtbf'); if (v.mttr < 0) throw new Error('MTTR نباید منفی باشد.'); var a = v.mtbf / (v.mtbf + v.mttr);
      return { r: [['قابلیت دسترسی A', a, ''], ['درصد قابلیت دسترسی', a * 100, '%'], ['درصد عدم دسترسی', (1 - a) * 100, '%']], fm: 'A=MTBF/(MTBF+MTTR)', nt: 'مدل پایا با خرابی و تعمیرپذیری ثابت؛ توقفات برنامه‌ریزی‌شده لحاظ نشده است.' }; } };
  SP[113] = { x: 1, name: 'تنش الکتریکی یکنواخت عایق و فاصله هوایی',
    f: function () { return [N('V', 'ولتاژ اعمالی (kV)', 20), N('d', 'ضخامت عایق یا فاصله (mm)', 10)]; },
    c: function (v) { need(v, 'V', 'd'); pos(v, 'V', 'd'); return { r: [['شدت میدان متوسط', v.V / v.d, 'kV/mm'], ['شدت میدان', v.V * 1000 / (v.d / 1000), 'V/m']], fm: 'Eavg=V/d', nt: 'فقط میدان یکنواخت ایده‌آل؛ میدان لبه‌ای، تمرکز تنش، آلودگی، رطوبت و ضریب ایمنی در نظر گرفته نشده‌اند.' }; } };
  SP[114] = { x: 1, name: 'جریان نول ناشی از نامتعادلی فازها',
    f: function () { return [N('Ia', 'دامنه جریان فاز A (A)', 20), N('Ib', 'دامنه جریان فاز B (A)', 18), N('Ic', 'دامنه جریان فاز C (A)', 22), N('a', 'زاویه جریان A (درجه)', 0), N('b', 'زاویه جریان B (درجه)', -120), N('c', 'زاویه جریان C (درجه)', 120)]; },
    c: function (v) { need(v, 'Ia', 'Ib', 'Ic', 'a', 'b', 'c'); if (v.Ia < 0 || v.Ib < 0 || v.Ic < 0) throw new Error('دامنه جریان منفی وارد نکنید.'); var ar = v.a * PI / 180, br = v.b * PI / 180, cr = v.c * PI / 180, re = v.Ia * Math.cos(ar) + v.Ib * Math.cos(br) + v.Ic * Math.cos(cr), im = v.Ia * Math.sin(ar) + v.Ib * Math.sin(br) + v.Ic * Math.sin(cr), inn = Math.hypot(re, im);
      return { r: [['مولفه حقیقی جمع فازها', re, 'A'], ['مولفه موهومی جمع فازها', im, 'A'], ['جریان نول', inn, 'A']], fm: 'IN=|Ia∠a+Ib∠b+Ic∠c|', nt: 'هارمونیک‌های مرتبه سوم و مضارب آن در نول می‌توانند جمع شوند؛ این محاسبه فقط فازور فرکانس اصلی را بررسی می‌کند.' }; } };
  SP[115] = { x: 1, name: 'جریان و توان راکتیو خازن دائم‌کار موتور تک‌فاز',
    f: function () { return [N('V', 'ولتاژ خازن (V RMS)', 230), N('C', 'ظرفیت خازن (µF)', 30), N('f', 'فرکانس (Hz)', 50)]; },
    c: function (v) { need(v, 'V', 'C', 'f'); pos(v, 'V', 'C', 'f'); var xc = 1 / (2 * PI * v.f * v.C * 1e-6), ic = v.V / xc, q = v.V * ic;
      return { r: [['راکتانس خازن', xc, 'Ω'], ['جریان خازن', ic, 'A'], ['توان راکتیو خازن', q / 1000, 'kvar']], fm: 'Xc=1/(2πfC)  ،  Ic=V/Xc  ،  Qc=V·Ic', nt: 'برای خازن دائم‌کار تک‌فاز ایده‌آل؛ ولتاژ AC واقعی، تلرانس ظرفیت، هارمونیک‌ها و کلاس خازن باید کنترل شود.' }; } };

  C[125] = { name: 'ضریب هم‌زمانی و ضریب تنوع از تقاضاهای مشترکان',
    f: function () { return [L('Ds', 'حداکثر تقاضای هر مصرف‌کننده (kW)، با فاصله جدا کنید', '120 80 60 100'), N('Ds0', 'حداکثر تقاضای هم‌زمان کل (kW)', 280)]; },
    c: function (v) {
      need(v, 'Ds0'); if (!v.Ds.length) throw new Error('حداقل یک مقدار تقاضای فردی وارد کنید.');
      if (v.Ds.some(function (x) { return x < 0; }) || v.Ds0 <= 0) throw new Error('مقادیر تقاضا باید نامنفی و تقاضای هم‌زمان باید بزرگ‌تر از صفر باشد.');
      var total = v.Ds.reduce(function (a, b) { return a + b; }, 0); pos({ total: total }, 'total');
      var coincidence = v.Ds0 / total;
      return { r: [['مجموع حداکثر تقاضاهای فردی', total, 'kW'], ['ضریب هم‌زمانی', coincidence, ''], ['ضریب تنوع', total / v.Ds0, '']], fm: 'Coincidence=Demand_coincident/ΣDemand_individual ، Diversity=1/Coincidence', nt: v.Ds0 > total ? 'تقاضای هم‌زمان واردشده از مجموع تقاضاهای فردی بیشتر است؛ داده‌ها یا بازه‌های اندازه‌گیری را بررسی کنید.' : '' };
    } };

  C[127] = { name: 'نسبت بارگذاری، بهره‌برداری و ضریب تقاضا',
    f: function (s, v) {
      var mode = v && v.mode || 'loading';
      var choices = [['loading', 'درصد/نسبت بارگذاری تجهیز'], ['utilization', 'ضریب بهره‌برداری ظرفیت'], ['demand', 'ضریب تقاضا نسبت به بار متصل']];
      var f = [SEL('mode', 'نوع نسبت', choices, 'loading')];
      if (mode === 'demand') return f.concat([N('actual', 'حداکثر تقاضا (kW)', 300), N('rated', 'بار متصل کل (kW)', 450)]);
      if (mode === 'utilization') return f.concat([N('actual', 'حداکثر بار واقعی (kW)', 300), N('rated', 'ظرفیت نصب‌شده (kW)', 500)]);
      return f.concat([N('actual', 'بار/مقدار واقعی (A یا kVA)', 320), N('rated', 'مقدار نامی (همان واحد)', 400)]);
    },
    c: function (v) {
      need(v, 'actual', 'rated'); pos(v, 'rated');
      if (v.actual < 0) throw new Error('مقدار واقعی/تقاضا نباید منفی باشد.');
      var mode = v.mode || 'loading', factor = v.actual / v.rated, percent = factor * 100;
      var labels = { loading: 'نسبت بارگذاری', utilization: 'ضریب بهره‌برداری', demand: 'ضریب تقاضا' };
      var formula = mode === 'demand' ? 'Demand Factor=Maximum Demand/Connected Load' : mode === 'utilization' ? 'Utilization Factor=Maximum Load/Installed Capacity' : 'Loading Ratio=Actual/Rated';
      var rows = [[labels[mode] || labels.loading, factor, ''], ['معادل درصدی نسبت', percent, '%']];
      if (mode === 'loading') rows.push(['وضعیت بار', percent > 100 ? 'اضافه‌بار' : percent >= 80 ? 'بارگذاری بالا' : 'عادی', '']);
      return { r: rows, fm: formula + ' ، Percentage=Ratio×100', nt: mode === 'demand' && factor > 1 ? 'ضریب تقاضا بزرگ‌تر از ۱ است؛ حداکثر تقاضا و بار متصل را بررسی کنید.' : '' };
    } };

  C[128] = { name: 'چگالی جریان و انتخاب سطح مقطع هادی/کابل',
    f: function (s, v) {
      var m = v && v.mode || 'density';
      var f = [SEL('mode', 'نوع محاسبه', [['density', 'محاسبه چگالی جریان از I و A'], ['size', 'انتخاب سطح مقطع از افت ولتاژ و چگالی جریان']], 'density')];
      if (m === 'size') return f.concat([N('I', 'جریان (A)', 100), N('Lm', 'طول مسیر یک‌طرفه (m)', 100), N('V', 'ولتاژ (V)', 400), N('dv', 'حداکثر افت مجاز (%)', 3), N('J', 'حداکثر چگالی جریان (A/mm²)', 4), N('T', 'دمای هادی (°C)', 70), MATSEL()].concat(PF(s)));
      return f.concat([N('I', 'جریان (A)', 100), N('A', 'سطح مقطع هادی (mm²)', 35)]);
    },
    c: function (v, s) {
      if ((v.mode || 'density') === 'density') { need(v, 'I', 'A'); pos(v, 'A'); if (v.I < 0) throw new Error('جریان نباید منفی باشد.'); return { r: [['چگالی جریان J', v.I / v.A, 'A/mm²'], ['سطح مقطع A', v.A, 'mm²']], fm: 'J=I/A' }; }
      need(v, 'I', 'Lm', 'V', 'dv', 'J', 'T'); pos(v, 'I', 'Lm', 'V', 'dv', 'J'); var pf = cosf(v, s), mat = MAT[v.mat || 'cu'];
      var rhoT = mat.rho * (1 + mat.a * (v.T - 20));
      var av = kD(s) * rhoT * v.Lm * v.I * pf / (v.V * v.dv / 100), aj = v.I / v.J, area = Math.max(av, aj);
      return { r: [['سطح مقطع از افت ولتاژ', av, 'mm²'], ['سطح مقطع از چگالی جریان', aj, 'mm²'], ['سطح مقطع لازم', area, 'mm²'], ['چگالی جریان در سطح مقطع لازم', v.I / area, 'A/mm²'], ['اندازه استاندارد بعدی', nextStd(area, STD_MM2) || 'بیش از ۶۳۰', 'mm²']], fm: 'A=max(kD·ρT·L·I·cosφ/ΔVمجاز ، I/J)' , nt: 'راکتانس کابل و ظرفیت جریان مجاز جدول استاندارد جداگانه کنترل شود.' };
    } };

  C[126] = { x: 1, name: 'نسبت تبدیل و خطای نسبت ترانس ابزار دقیق CT/VT',
    f: function (s, v) {
      var kind = v && v.kind || 'ct', unit = kind === 'vt' ? 'V' : 'A';
      return [SEL('kind', 'نوع ترانس اندازه‌گیری', [['ct', 'ترانس جریان CT'], ['vt', 'ترانس ولتاژ VT/PT']], 'ct'), N('K', 'نسبت تبدیل نامی (اولیه/ثانویه)', kind === 'vt' ? 200 : 80), N('sec', 'مقدار ثانویه اندازه‌گیری‌شده (' + unit + ')', kind === 'vt' ? 99.2 : 4.9), N('pri', 'مقدار اولیه مرجع/واقعی (' + unit + ')', kind === 'vt' ? 20000 : 400)];
    },
    c: function (v) {
      need(v, 'K', 'sec', 'pri'); pos(v, 'K', 'sec', 'pri'); var estimate = v.K * v.sec, error = estimate - v.pri, unit = (v.kind || 'ct') === 'vt' ? 'V' : 'A';
      return { r: [['مقدار اولیه محاسبه‌شده', estimate, unit], ['خطای نسبت تبدیل', 100 * error / v.pri, '%'], ['خطای مطلق اولیه', error, unit], ['تصحیح لازم', -error, unit]], fm: 'Primary_est=K·Secondary ، Error%=(Primary_est−Primary_ref)/Primary_ref×100', nt: 'این محاسبه خطای دامنه/نسبت را بررسی می‌کند؛ خطای زاویه‌ای CT/VT محاسبه نمی‌شود.' };
    } };

  var SP_MAP = {
    5: [63, 64, 65, 66, 67, 51], 6: [63, 64, 65, 66], 7: [107], 8: [68, 69, 70],
    9: [59, 68, 69, 70, 71, 72], 10: [72, 115], 11: [71, 107], 12: [77, 78, 79, 80, 81],
    13: [57, 75, 76], 14: [82, 83, 84], 15: [82, 83, 84, 106], 16: [51, 57, 61, 62, 85, 86, 87, 92],
    17: [56, 57, 86, 87, 88], 18: [56, 88, 89, 90], 19: [52, 53, 62, 113], 20: [58, 86],
    21: [61, 86, 87], 22: [61, 65, 87, 89], 23: [55, 91, 92, 115], 24: [55, 91, 92],
    25: [54, 55, 91], 26: [54, 55, 91], 27: [55, 93, 94, 95], 28: [93, 94, 95, 96, 97],
    29: [59, 71, 72], 30: [59, 72], 31: [73, 74], 32: [98, 99], 33: [98, 99, 100],
    34: [105], 35: [103, 104], 36: [101, 102], 37: [106, 107], 38: [60, 108, 126, 114],
    39: [58, 76, 113], 40: [63, 105, 111, 112]
  };
  Object.keys(SP).forEach(function (k) { C[k] = SP[k]; });
  root.SP_MAP = SP_MAP;

  root.CALCS = C;
  root.CALC_UTIL = { has: has, isAC: isAC };
  if (typeof module !== 'undefined') module.exports = { CALCS: C };
})(typeof window !== 'undefined' ? window : globalThis);

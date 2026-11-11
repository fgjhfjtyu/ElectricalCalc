(function () {
  var D = window.DATA, C = window.CALCS, U = window.CALC_UTIL;
  var app = document.getElementById('app');
  var SYS = [['dc', 'DC'], ['ac1', 'AC تک‌فاز'], ['ac3', 'AC سه‌فاز']];
  var ST_TXT = [
    'این رابطه در این موضوع کاربرد مستقیم ندارد؛ برای دسترسی عمومی حفظ شده است.',
    'این رابطه کاربرد عمومی دارد؛ جزئیات تخصصی موضوع در محاسبه‌گر تخصصی جداگانه آمده است.',
    'این رابطه با موضوع انتخاب‌شده مرتبط است.'
  ];
  var ST_NAME = ['عمومیِ نامرتبط', 'عمومی', 'مرتبط'];
  var homeTab = 'cats', query = '', shown = 60;
  var BYNUM = {}; D.ents.forEach(function (e) { BYNUM[e[0]] = e; });

  /* اعضای زیر یک رابطه/روش محاسبه مشترک دارند و با یک صفحه محاسباتی نمایش داده می‌شوند. */
  var MERGE_GROUPS = [
    { key: 'ohm-law', id: 116, members: [1, 2], name: 'قانون اهم؛ محاسبه ولتاژ، جریان و مقاومت/امپدانس' },
    { key: 'impedance', id: 117, members: [3, 8, 9], name: 'امپدانس؛ اندازه، زاویه فاز و ضریب توان' },
    { key: 'power-triangle', id: 118, members: [10, 11, 12, 13], name: 'مثلث توان؛ توان اکتیو، راکتیو، ظاهری و ضریب توان' },
    { key: 'voltage-drop', id: 119, members: [17, 18], name: 'افت ولتاژ و درصد افت ولتاژ' },
    { key: 'temperature-resistance', id: 120, members: [21, 22], name: 'مقاومت هادی و تصحیح مقاومت با دما' },
    { key: 'copper-loss', id: 121, members: [16, 36], name: 'تلفات اهمی و مسی بر پایه I²R' },
    { key: 'frequency-angular-speed', id: 122, members: [23, 24], name: 'فرکانس، دوره تناوب و سرعت زاویه‌ای' },
    { key: 'motor-speed-slip', id: 123, members: [25, 26], name: 'سرعت سنکرون، سرعت روتور و لغزش' },
    { key: 'motor-power-current', id: 124, members: [15, 28, 29], name: 'توان ورودی/خروجی، بازده و جریان موتور یا تجهیز' },
    { key: 'coincidence-diversity', id: 125, members: [42, 45], name: 'ضریب هم‌زمانی و ضریب تنوع' },
    { key: 'utilization-loading', id: 127, members: [39, 41, 43], name: 'ضریب بارگذاری، بهره‌برداری و تقاضا' },
    { key: 'current-density-sizing', id: 128, members: [19, 20], name: 'چگالی جریان و انتخاب سطح مقطع هادی/کابل' }
  ];
  var GROUP_BY_KEY = {}, GROUP_BY_TPL = {};
  MERGE_GROUPS.forEach(function (g) {
    GROUP_BY_KEY[g.key] = g;
    g.members.forEach(function (t) { GROUP_BY_TPL[t] = g; });
  });
  function groupForTpl(t) {
    if (GROUP_BY_TPL[t]) return GROUP_BY_TPL[t];
    return { key: 'base-' + t, id: t, members: [t], name: D.tpl[t - 1] };
  }
  var BASE_GROUPS = [];
  for (var ti = 1; ti <= 50; ti++) {
    var tg = groupForTpl(ti);
    if (BASE_GROUPS.indexOf(tg) < 0) BASE_GROUPS.push(tg);
    GROUP_BY_KEY[tg.key] = tg;
  }
  BASE_GROUPS.sort(function (a, b) { return Math.min.apply(Math, a.members) - Math.min.apply(Math, b.members); });

  /* ۲۰۵۰ عنوان مرجع همچنان قابل دسترسی‌اند؛ فقط عنوان‌هایی که رابطه یکسان دارند به یک صفحه هدایت می‌شوند. */
  function canonicalSpecial(id) { return id === 109 || id === 110 ? 126 : id; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); }
  function latin(s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
  }
  function key(s) { return latin(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\s]+/g, '').toLowerCase(); }
  function title(e) { return D.tpl[e[1] - 1] + ' در ' + D.cats[e[2]].n; }
  function fmt(x) {
    if (typeof x === 'string') return x;
    if (!isFinite(x)) return String(x);
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e9 || a < 1e-4) return x.toExponential(3);
    return x.toLocaleString('en-US', { maximumSignificantDigits: 6 });
  }
  function parseNum(s) {
    s = latin(s).replace(/٫/g, '.').replace(/,/g, '.').trim();
    if (s === '') return NaN;
    return Number(s);
  }
  function parseList(s) {
    return latin(s).replace(/٫/g, '.').split(/[\s;،؛,]+/).filter(Boolean).map(Number).filter(function (x) { return isFinite(x); });
  }
  function recordsForGroup(g, ci) {
    return D.ents.filter(function (e) { return g.members.indexOf(e[1]) >= 0 && (ci === undefined || ci < 0 || e[2] === ci); });
  }
  function groupStatus(g, ci) {
    var rs = recordsForGroup(g, ci), st = 0;
    rs.forEach(function (e) { if (e[3] > st) st = e[3]; });
    return st;
  }
  function uniqueCategories(g) {
    var seen = {}, out = [];
    recordsForGroup(g).forEach(function (e) { if (!seen[e[2]]) { seen[e[2]] = true; out.push(e[2]); } });
    return out;
  }
  function groupAliasNames(g) { return g.members.map(function (t) { return D.tpl[t - 1]; }); }
  function groupItemHtml(g, ci) {
    var rs = recordsForGroup(g, ci), st = groupStatus(g, ci), aliases = groupAliasNames(g);
    var merged = rs.length > 1 ? '<span class="cnt">' + fa(rs.length) + ' عنوان ← ۱</span>' : '';
    return '<a class="item" href="#/g/' + esc(g.key) + '/' + (ci === undefined ? -1 : ci) + '"><span class="dot d' + st + '"></span><span class="num">' + (g.members.length > 1 ? fa(g.members.length) + '×' : '•') + '</span><span>' + esc(g.name) + '</span>' + merged + '</a>';
  }

  function itemHtml(e) {
    var g = groupForTpl(e[1]);
    return groupItemHtml(g, e[2]);
  }

  /* ---------- صفحه اصلی ---------- */
  function home() {
    app.innerHTML =
      '<header><h1>فرمول‌های برق صنعتی</h1><div class="sub">۲۰۵۰ عنوان مرجع · ۴۱ موضوع · ' + fa(BASE_GROUPS.length) + ' خانواده فرمول پایه یکپارچه · ۸۶ محاسبه‌گر تخصصی یکتا · کاملاً آفلاین</div>' +
      '<input id="q" type="search" placeholder="جستجو: نام فرمول، موضوع یا شماره عنوان مرجع" value="' + esc(query) + '">' +
      '<div class="tabs"><button class="tab" data-t="cats">موضوع‌ها</button><button class="tab" data-t="base">فرمول‌های یکپارچه</button></div></header>' +
      '<div id="res"></div>';
    var q = document.getElementById('q');
    q.addEventListener('input', function () { query = q.value; shown = 60; results(); });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.addEventListener('click', function () { homeTab = b.getAttribute('data-t'); results(); });
    });
    results();
  }

  function results() {
    var res = document.getElementById('res'), k = key(query), h = '';
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === homeTab && !k); });
    if (k) {
      var baseHits = BASE_GROUPS.filter(function (g) {
        var cats = uniqueCategories(g).map(function (ci) { return D.cats[ci].n; });
        var hay = [g.name].concat(groupAliasNames(g), cats).map(key);
        return hay.some(function (x) { return x.indexOf(k) >= 0; });
      });
      if (/^\d+$/.test(k)) {
        var numberPrefix = k.replace(/^0+/, ''), numberGroups = {};
        D.ents.forEach(function (e) {
          if (String(e[0]).indexOf(numberPrefix || '0') === 0) {
            var ng = groupForTpl(e[1]);
            if (!numberGroups[ng.key]) numberGroups[ng.key] = ng;
          }
        });
        Object.keys(numberGroups).forEach(function (gk) {
          if (!baseHits.some(function (g) { return g.key === gk; })) baseHits.push(numberGroups[gk]);
        });
      }
      var spSeen = {}, spHits = [];
      Object.keys(window.SP_MAP || {}).forEach(function (ci) {
        (window.SP_MAP[ci] || []).forEach(function (rawId) {
          var id = canonicalSpecial(rawId), calc = C[id];
          if (calc && calc.name && !spSeen[id]) {
            var cats = [];
            Object.keys(window.SP_MAP || {}).forEach(function (cj) { if ((window.SP_MAP[cj] || []).some(function (x) { return canonicalSpecial(x) === id; })) cats.push(D.cats[Number(cj)] && D.cats[Number(cj)].n); });
            var hay = [calc.name].concat(cats).map(key);
            if (hay.some(function (x) { return x && x.indexOf(k) >= 0; })) { spSeen[id] = true; spHits.push({ id: id, name: calc.name }); }
          }
        });
      });
      h += '<div class="sub">' + fa(baseHits.length + spHits.length) + ' نتیجه یکتا</div><div class="list">' +
        baseHits.slice(0, shown).map(function (g) { return groupItemHtml(g); }).join('') + spHits.slice(0, shown).map(function (x) {
          return '<a class="item" href="#/sp/' + x.id + '/-1"><span class="num">★</span><span>' + esc(x.name) + '</span></a>';
        }).join('') + '</div>';
      if (baseHits.length + spHits.length > shown) h += '<button class="more" id="more">نمایش بیشتر</button>';
      res.innerHTML = h;
      var m = document.getElementById('more');
      if (m) m.addEventListener('click', function () { shown += 60; results(); });
      return;
    }
    if (homeTab === 'base') {
      h = '<div class="sub">عنوان‌هایی که رابطه یکسان یا معکوس یکدیگر دارند، در یک محاسبه‌گر مشترک ادغام شده‌اند. از ۵۰ الگوی پایه، ' + fa(BASE_GROUPS.length) + ' خانواده یکتا باقی مانده است.</div><div class="list">' +
        BASE_GROUPS.map(function (g) { return groupItemHtml(g); }).join('') + '</div>';
    } else {
      var cnt = D.cats.map(function () { return [0, 0, 0]; });
      BASE_GROUPS.forEach(function (g) {
        uniqueCategories(g).forEach(function (ci) { cnt[ci][groupStatus(g, ci)]++; });
      });
      var BOLT = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';
      h = '<div class="grid">' + D.cats.map(function (c, i) {
        return '<a class="tile" href="#/cat/' + i + '"><div class="chip">' + BOLT + '</div><div><b>' + esc(c.n) + '</b><span class="c">' + fa(cnt[i][2] + cnt[i][1] + cnt[i][0]) + ' خانواده فرمول یکتا · ' + fa(cnt[i][2]) + ' مرتبط</span></div></a>';
      }).join('') + '</div>';
    }
    res.innerHTML = h;
  }

  function spLinks(i) {
    var ids = (window.SP_MAP || {})[i]; if (!ids) return '';
    var seen = {}, list = [];
    ids.forEach(function (raw) { var id = canonicalSpecial(raw); if (!seen[id] && C[id] && C[id].name) { seen[id] = true; list.push(id); } });
    if (!list.length) return '';
    return '<div class="card"><b>محاسبه‌گرهای تخصصی این موضوع</b><div class="list">' + list.map(function (id) {
      return '<a class="item" href="#/sp/' + id + '/' + i + '"><span class="num">★</span><span>' + esc(C[id].name) + '</span></a>'; }).join('') + '</div></div>';
  }
  function sp(id, ci) {
    var sourceId = id;
    id = canonicalSpecial(id);
    if (!C[id]) return home();
    var back = ci >= 0 ? '#/cat/' + ci : '#/';
    var initial = id === 126 ? { kind: sourceId === 110 ? 'vt' : 'ct' } : {};
    calcPage(id, 'ac3', '<h1>' + esc(C[id].name) + '</h1>', '', back, initial);
  }

  /* ---------- فهرست یک موضوع؛ خانواده‌های فرمولی تکراری فقط یک‌بار ---------- */
  function cat(i) {
    var c = D.cats[i];
    if (!c) return home();
    var groups = BASE_GROUPS.filter(function (g) { return recordsForGroup(g, i).length > 0; });
    var st = [0, 0, 0]; groups.forEach(function (g) { st[groupStatus(g, i)]++; });
    app.innerHTML = '<header><a class="back" href="#/">‹ بازگشت</a><h1>' + esc(c.n) + '</h1>' +
      '<div class="stats"><span>● مرتبط ' + fa(st[2]) + '</span><span>● عمومی ' + fa(st[1]) + '</span><span>● عمومیِ نامرتبط ' + fa(st[0]) + '</span><span>● پس از ادغام ' + fa(groups.length) + ' محاسبه‌گر</span></div></header>' +
      spLinks(i) + '<div class="list">' + groups.map(function (g) { return groupItemHtml(g, i); }).join('') + '</div>';
    window.scrollTo(0, 0);
  }

  function mergedInfo(g, ci, sourceNum) {
    var rs = recordsForGroup(g, ci), allCats = [], seen = {};
    rs.forEach(function (e) { if (!seen[e[2]]) { seen[e[2]] = true; allCats.push(D.cats[e[2]].n); } });
    var aliases = groupAliasNames(g);
    var intro = g.members.length > 1
      ? 'این صفحه جایگزین ' + fa(g.members.length) + ' عنوان/فرمول پایه با رابطه مشترک شده است؛ ورودی‌ها و خروجی‌های هر دو جهت در همین صفحه در دسترس‌اند.'
      : 'این خانواده فرمول به‌صورت یک محاسبه‌گر مستقل نگهداری می‌شود.';
    var html = '<div class="card"><b>یکپارچه‌سازی فرمول‌های تکراری</b><div class="sub">' + esc(intro) + '</div>';
    if (sourceNum !== undefined) html += '<div class="sub">عنوان مرجع شماره ' + fa(sourceNum) + ' به این محاسبه‌گر یکپارچه هدایت شده است.</div>';
    if (g.members.length > 1) html += '<div class="sub">عنوان‌های ادغام‌شده: ' + aliases.map(esc).join(' · ') + '</div>';
    if (ci === undefined || ci < 0) html += '<div class="sub">موضوع‌های استفاده: ' + allCats.map(esc).join('، ') + '</div>';
    else html += '<div class="sub">این رابطه در این موضوع با ' + fa(rs.length) + ' عنوان مرجع ثبت شده است.</div>';
    html += '<div class="sub">تعداد عنوان‌های مرجع ادغام‌شده در ' + (ci === undefined || ci < 0 ? 'کل فهرست' : 'این موضوع') + ': ' + fa(rs.length) + '</div></div>';
    return html;
  }

  function unified(gkey, ci, sourceNum) {
    var g = GROUP_BY_KEY[gkey];
    if (!g || !C[g.id]) return home();
    var status = groupStatus(g, ci), catName = ci >= 0 && D.cats[ci] ? D.cats[ci].n : 'همه موضوع‌ها';
    var badge = '<div class="badge b' + status + '"><b>' + ST_NAME[status] + ':</b> ' + ST_TXT[status] + '</div>' + mergedInfo(g, ci, sourceNum);
    var initial = {};
    if (sourceNum !== undefined && BYNUM[sourceNum]) {
      var sourceTpl = BYNUM[sourceNum][1];
      if (g.id === 116) initial.mode = sourceTpl === 2 ? 'v' : 'i';
      if (g.id === 117) initial.kind = sourceTpl === 3 ? 'parts' : 'net';
      if (g.id === 123 && sourceTpl === 26) initial.nr = 1450;
      if (g.id === 124) initial.mode = sourceTpl === 15 ? 'efficiency' : sourceTpl === 29 ? 'output' : 'electrical';
      if (g.id === 127) initial.mode = sourceTpl === 43 ? 'demand' : sourceTpl === 41 ? 'utilization' : 'loading';
      if (g.id === 128) initial.mode = sourceTpl === 20 ? 'size' : 'density';
    }
    var head = '<div class="sub">' + (ci >= 0 ? esc(catName) + ' · ' : '') + 'فرمول پایه یکپارچه · ' + (g.members.length > 1 ? 'ادغام ' + fa(g.members.length) + ' عنوان' : 'یک عنوان پایه') + '</div><h1>' + esc(g.name) + '</h1>';
    calcPage(g.id, ci >= 0 && D.cats[ci] ? D.cats[ci].s : 'ac3', head, badge, ci >= 0 ? '#/cat/' + ci : '#/', initial);
  }

  /* ---------- صفحه ماشین‌حساب ---------- */
  function calcPage(t, sys, head, badge, backHref, initialVals) {
    var vals = initialVals || {};
    var calc = C[t];
    app.innerHTML = '<header><a class="back" href="' + backHref + '">‹ بازگشت</a>' + head + '</header>' + (badge || '') +
      '<div class="seg" id="seg"></div><div class="card"><div id="form"></div></div><div class="card" id="out"></div>';
    var seg = document.getElementById('seg'), form = document.getElementById('form'), out = document.getElementById('out');
    var labels = {};

    function drawSeg() {
      seg.innerHTML = SYS.map(function (s) { return '<button data-s="' + s[0] + '" class="' + (s[0] === sys ? 'on' : '') + '">' + s[1] + '</button>'; }).join('');
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () { sys = b.getAttribute('data-s'); drawSeg(); drawForm(); compute(); });
      });
    }
    function drawForm() {
      var fields = calc.f(sys, vals); labels = {};
      form.innerHTML = fields.map(function (f) {
        labels[f.k] = f.l;
        var v = vals.hasOwnProperty(f.k) ? vals[f.k] : f.d;
        if (f.t === 's') {
          return '<label>' + esc(f.l) + '</label><select data-k="' + f.k + '">' + f.opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(v) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
        }
        return '<label>' + esc(f.l) + '</label><input class="ltr" data-k="' + f.k + '" data-t="' + f.t + '" inputmode="' + (f.t === 'l' ? 'text' : 'decimal') + '" value="' + esc(v === undefined ? '' : v) + '">';
      }).join('');
      Array.prototype.forEach.call(form.querySelectorAll('[data-k]'), function (el) {
        var ev = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(ev, function () {
          vals[el.getAttribute('data-k')] = el.value;
          if (el.tagName === 'SELECT') drawForm();
          compute();
        });
      });
    }
    function collect() {
      var v = {};
      calc.f(sys, vals).forEach(function (f) {
        var raw = vals.hasOwnProperty(f.k) ? vals[f.k] : f.d;
        raw = raw === undefined ? '' : String(raw);
        v[f.k] = f.t === 'l' ? parseList(raw) : f.t === 's' ? raw : parseNum(raw);
      });
      return v;
    }
    function compute() {
      try {
        var o = calc.c(collect(), sys);
        out.innerHTML = o.r.map(function (r) {
          return '<div class="res"><span>' + esc(r[0]) + '</span><span><b>' + esc(fmt(r[1])) + '</b><span class="u">' + esc(r[2] || '') + '</span></span></div>';
        }).join('') + (o.fm ? '<div class="fm">' + esc(o.fm) + '</div>' : '') + (o.nt ? '<div class="note">' + esc(o.nt) + '</div>' : '');
      } catch (e) {
        out.innerHTML = '<div class="err">' + esc(e.message.replace(/«(\w+)»/, function (m, k) { return '«' + (labels[k] || k) + '»'; })) + '</div>';
      }
    }
    if (calc.x) seg.style.display = 'none';
    drawSeg(); drawForm(); compute();
    window.scrollTo(0, 0);
  }

  function entry(n) {
    var e = BYNUM[n];
    if (!e) return home();
    var g = groupForTpl(e[1]);
    unified(g.key, e[2], e[0]);
  }
  function base(t) {
    if (!C[t]) return home();
    var g = groupForTpl(t);
    unified(g.key, -1);
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[0] === 'cat') return cat(parseInt(h[1], 10));
    if (h[0] === 'e') return entry(parseInt(h[1], 10));
    if (h[0] === 'sp') return sp(parseInt(h[1], 10), parseInt(h[2], 10));
    if (h[0] === 'base') return base(parseInt(h[1], 10));
    if (h[0] === 'g') return unified(h[1], parseInt(h[2], 10));
    home();
  }
  window.addEventListener('hashchange', route);
  route();
})();

(function () {
  var D = window.DATA, C = window.CALCS, U = window.CALC_UTIL;
  var app = document.getElementById('app');
  var SYS = [['dc', 'DC'], ['ac1', 'AC تک‌فاز'], ['ac3', 'AC سه‌فاز']];
  var ST_TXT = [
    'این محاسبه برای این موضوع معنای مستقیم ندارد؛ فقط فرمول عمومی نمایش داده می‌شود.',
    'فرمول عمومی؛ روش تخصصی/استانداردی این موضوع در برنامه پیاده‌سازی نشده است.',
    'فرمول مستقیم و مرتبط با عنوان.'
  ];
  var ST_NAME = ['نامرتبط', 'عمومی', 'مرتبط'];
  var homeTab = 'cats', query = '', shown = 60;
  var BYNUM = {}; D.ents.forEach(function (e) { BYNUM[e[0]] = e; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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

  function itemHtml(e) {
    return '<a class="item" href="#/e/' + e[0] + '"><span class="dot d' + e[3] + '"></span><span class="num">' + fa(e[0]) + '</span><span>' + esc(title(e)) + '</span></a>';
  }

  /* ---------- صفحه اصلی ---------- */
  function home() {
    app.innerHTML =
      '<header><h1>فرمول‌های برق صنعتی</h1><div class="sub">۲۰۵۰ عنوان · ۴۱ موضوع · ۵۰ فرمول پایه · کاملاً آفلاین</div>' +
      '<input id="q" type="search" placeholder="جستجو: عنوان یا شماره، مثلاً «افت ولتاژ» یا ۳۱۰" value="' + esc(query) + '">' +
      '<div class="tabs"><button class="tab" data-t="cats">موضوع‌ها</button><button class="tab" data-t="base">۵۰ فرمول پایه</button></div></header>' +
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
      var list = D.ents.filter(function (e) { return key(title(e)).indexOf(k) >= 0 || String(e[0]).indexOf(k.replace(/^0+/, '')) === 0 && /^\d+$/.test(k); });
      h += '<div class="sub">' + fa(list.length) + ' نتیجه</div><div class="list">' + list.slice(0, shown).map(itemHtml).join('') + '</div>';
      if (list.length > shown) h += '<button class="more" id="more">نمایش بیشتر</button>';
      res.innerHTML = h;
      var m = document.getElementById('more');
      if (m) m.addEventListener('click', function () { shown += 60; results(); });
      return;
    }
    if (homeTab === 'base') {
      h = '<div class="sub">هر عنوان از ۲۰۵۰ عنوان، یکی از این ۵۰ فرمول است که برای موضوع مربوط تنظیم شده.</div><div class="list">' +
        D.tpl.map(function (n, i) { return '<a class="item" href="#/base/' + (i + 1) + '"><span class="num">' + fa(i + 1) + '</span><span>' + esc(n) + '</span></a>'; }).join('') + '</div>';
    } else {
      var cnt = D.cats.map(function () { return [0, 0, 0]; });
      D.ents.forEach(function (e) { cnt[e[2]][e[3]]++; });
      var BOLT = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';
      h = '<div class="grid">' + D.cats.map(function (c, i) {
        return '<a class="tile" href="#/cat/' + i + '"><div class="chip">' + BOLT + '</div><div><b>' + esc(c.n) + '</b><span class="c">' + fa(cnt[i][2] + cnt[i][1] + cnt[i][0]) + ' عنوان · ' + fa(cnt[i][2]) + ' مرتبط</span></div></a>';
      }).join('') + '</div>';
    }
    res.innerHTML = h;
  }

  function spLinks(i) {
    var ids = (window.SP_MAP || {})[i]; if (!ids) return '';
    return '<div class="card"><b>ماشین‌حساب‌های تخصصی این موضوع</b><div class="list">' + ids.map(function (id) {
      return '<a class="item" href="#/sp/' + id + '/' + i + '"><span class="num">★</span><span>' + esc(C[id].name) + '</span></a>'; }).join('') + '</div></div>';
  }
  function sp(id, ci) {
    if (!C[id]) return home();
    calcPage(id, 'ac3', '<h1>' + esc(C[id].name) + '</h1>', '', '#/cat/' + ci);
  }

  /* ---------- فهرست یک موضوع ---------- */
  function cat(i) {
    var c = D.cats[i];
    if (!c) return home();
    var list = D.ents.filter(function (e) { return e[2] === i; });
    var st = [0, 0, 0]; list.forEach(function (e) { st[e[3]]++; });
    app.innerHTML = '<header><a class="back" href="#/">‹ بازگشت</a><h1>' + esc(c.n) + '</h1>' +
      '<div class="stats"><span>● مرتبط ' + fa(st[2]) + '</span><span>● عمومی ' + fa(st[1]) + '</span><span>● نامرتبط ' + fa(st[0]) + '</span></div></header>' +
      spLinks(i) + '<div class="list">' + list.map(itemHtml).join('') + '</div>';
    window.scrollTo(0, 0);
  }

  /* ---------- صفحه ماشین‌حساب ---------- */
  function calcPage(t, sys, head, badge, backHref) {
    var vals = {};
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
      var fields = calc.f(sys); labels = {};
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
        el.addEventListener(ev, function () { vals[el.getAttribute('data-k')] = el.value; compute(); });
      });
    }
    function collect() {
      var v = {};
      calc.f(sys).forEach(function (f) {
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
    var badge = '<div class="badge b' + e[3] + '"><b>' + ST_NAME[e[3]] + ':</b> ' + ST_TXT[e[3]] + '</div>';
    if (e[3] === 1) badge += spLinks(e[2]);
    calcPage(e[1], D.cats[e[2]].s, '<div class="sub">شماره ' + fa(e[0]) + ' · فرمول پایه ' + fa(e[1]) + '</div><h1>' + esc(title(e)) + '</h1>', badge, '#/cat/' + e[2]);
  }
  function base(t) {
    if (!C[t]) return home();
    calcPage(t, 'ac3', '<div class="sub">فرمول پایه ' + fa(t) + ' از ۵۰</div><h1>' + esc(D.tpl[t - 1]) + '</h1>', '', '#/');
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[0] === 'cat') return cat(parseInt(h[1], 10));
    if (h[0] === 'e') return entry(parseInt(h[1], 10));
    if (h[0] === 'sp') return sp(parseInt(h[1], 10), parseInt(h[2], 10));
    if (h[0] === 'base') return base(parseInt(h[1], 10));
    home();
  }
  window.addEventListener('hashchange', route);
  route();
})();

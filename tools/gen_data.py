# تولید data.js و COVERAGE.csv از فایل فهرست ۲۰۵۰ عنوان
import re, sys, json, csv

src = sys.argv[1]
lines = open(src, encoding='utf-8').read().split('\n')

entries, cats, cur = [], [], None
for idx, l in enumerate(lines):
    m = re.match(r'^(\d{4})\.\s+(.*)$', l)
    if m:
        entries.append((int(m.group(1)), m.group(2), cur))
    elif idx > 0 and lines[idx-1].startswith('=====') and l.strip() and not l.startswith('='):
        cur = l.strip()
        cats.append(cur)
assert len(entries) == 2050 and len(cats) == 41, (len(entries), len(cats))

# (سیستم پیش‌فرض، برچسب‌های موضوع) به ترتیب ۴۱ موضوع فایل
CT = [
 ('dc',  {'circuit','dc','puredc'}),
 ('ac1', {'circuit','ac'}),
 ('ac3', {'circuit','ac'}),
 ('ac3', {'circuit','ac','power'}),
 ('ac3', {'ac','power','pf'}),
 ('ac3', {'ac','xfmr'}),
 ('ac3', {'ac','xfmr'}),
 ('ac3', {'ac','machine','gen'}),
 ('ac3', {'ac','machine','gen','induction'}),
 ('ac3', {'ac','machine','motor','induction'}),
 ('ac1', {'ac','machine','motor','induction'}),
 ('ac3', {'ac','machine','motor'}),
 ('ac3', {'ac','line'}),
 ('ac3', {'ac','line','cable'}),
 ('ac3', {'ac','line','network'}),
 ('ac3', {'ac','network'}),
 ('ac3', {'ac','fault'}),
 ('ac3', {'ac','fault','prot'}),
 ('ac3', {'ac','fault','prot','line'}),
 ('ac3', {'ac','ground','fault'}),
 ('ac3', {'ac','insul'}),
 ('ac3', {'ac','fault','switch'}),
 ('ac3', {'ac','fault','substation'}),
 ('ac3', {'ac','cap'}),
 ('ac3', {'ac','cap','reactor'}),
 ('ac3', {'ac','pq'}),
 ('ac3', {'ac','pq'}),
 ('ac3', {'ac','dc','pe'}),
 ('ac3', {'ac','dc','pe'}),
 ('ac3', {'ac','machine','motor','pe','induction'}),
 ('ac3', {'ac','machine','motor','induction'}),
 ('dc',  {'dc','machine','motor','dcmachine'}),
 ('dc',  {'dc','storage','puredc'}),
 ('ac1', {'ac','dc','storage','pe'}),
 ('ac3', {'ac','machine','gen','plant'}),
 ('ac3', {'ac','machine','gen','plant'}),
 ('dc',  {'dc','pe','plant','puredc'}),
 ('ac3', {'ac','machine','gen','network'}),
 ('ac3', {'ac','meas'}),
 ('ac3', {'ac','insul'}),
 ('ac3', {'ac','econ','network'}),
]
assert len(CT) == 41

ALL = set().union(*[t for _, t in CT])
def S(*a): return set(a)

# قواعد هر یک از ۵۰ فرمول پایه: only = فقط در این موضوع‌ها معنا دارد، spec = دقیقاً همان فرمول موضوع،
# na = بی‌معنی؛ هرچه بیرون از اینها بماند «عمومی» است.
R = {}
for t in (1, 2): R[t] = dict(spec=ALL - S('econ'))
R[3]  = dict(spec=S('circuit','line','cable','network','fault','ground','cap','reactor','xfmr','machine','pq','prot','substation'), na=S('econ'))
R[4]  = dict(spec=S('circuit','dc','storage','plant','ground','pe','line'), na=S('econ'))
R[5]  = R[4]
R[6]  = dict(spec=S('circuit','line','reactor','xfmr','machine','pq','fault','prot','network'), na=S('puredc','econ'))
R[7]  = dict(spec=S('circuit','cap','cable','line','pq','reactor','insul'), na=S('puredc','econ'))
R[8]  = dict(spec=S('circuit','line','network','fault','prot','xfmr','machine','reactor','cap','pq'), na=S('puredc','econ'))
R[9]  = dict(spec=S('circuit','power','pf','prot','machine','xfmr','network','cap','pq','meas'), na=S('puredc','econ'))
R[10] = dict(spec=ALL - S('econ','insul','ground'))
R[11] = dict(spec=S('circuit','power','pf','cap','reactor','xfmr','machine','network','pq','line','pe'), na=S('puredc','econ'))
R[12] = dict(spec=S('circuit','power','pf','cap','reactor','xfmr','machine','network','line','fault','substation','switch','pe','plant','storage'), na=S('puredc'))
R[13] = dict(spec=S('power','pf','circuit','machine','xfmr','network','cap','pe','pq','plant','line'), na=S('puredc','econ'))
R[14] = dict(spec=S('circuit','dc','storage','power','econ','plant','meas','machine'))
R[15] = dict(spec=S('xfmr','machine','pe','storage','plant','cap','reactor','econ','line'))
R[16] = dict(spec=S('circuit','line','cable','network','xfmr','machine','storage','econ','cap','reactor','pe','ground','substation','switch'))
R[17] = dict(spec=S('circuit','line','network','ground','storage','plant','xfmr'))
R[18] = R[17]
R[19] = dict(spec=S('line','cable','circuit','xfmr','machine','substation','ground','switch','pe','storage','plant'))
R[20] = dict(spec=S('line','cable','network','circuit','ground','substation','switch','prot','fault','storage','plant'), na=S('econ'))
R[21] = dict(spec=S('line','cable','circuit','machine','xfmr','ground','storage','substation','network'), na=S('econ'))
R[22] = R[21]
R[23] = dict(spec=S('circuit','pq','pe','machine','gen','network','meas'), na=S('puredc','econ','dcmachine'))
R[24] = dict(spec=S('machine','gen','motor','pe','network','circuit'), na=S('puredc','econ'))
R[25] = dict(only=S('machine','plant'), spec=S('machine','plant'), na=S('dcmachine'))
R[26] = dict(only=S('machine','plant'), spec=S('induction'), na=S('dcmachine'))
R[27] = dict(only=S('machine','plant'), spec=S('machine'))
R[28] = dict(only=S('machine','plant'), spec=S('machine'))
R[29] = dict(spec=S('circuit','xfmr','machine','line','cable','pe','storage','switch','substation','prot','cap','reactor','plant','power','network'), na=S('econ'))
R[30] = dict(only=S('machine','xfmr','cap','prot','switch','pe','reactor'), spec=S('motor','xfmr','cap'))
R[31] = dict(only=S('xfmr','machine','line','plant','reactor'), spec=S('xfmr','machine'))
R[32] = dict(spec=S('fault','xfmr','network','substation','switch','prot','ground','line','cable','storage','pe','gen','circuit'), na=S('econ'))
R[33] = dict(spec=S('line','network','xfmr','insul','substation','switch','storage','pe','plant','circuit','cable','machine'), na=S('econ'))
R[34] = dict(spec=S('xfmr','pe','meas'), na=S('econ'))
R[35] = dict(spec=S('xfmr','gen','line','cable','network'), na=S('econ'))
R[36] = dict(spec=S('xfmr','machine','line','cable','reactor','network'))
R[37] = dict(only=S('xfmr','machine','reactor','econ','network','substation','plant','pq','pe'), spec=S('xfmr','machine','reactor'))
R[38] = dict(spec=S('xfmr','machine','line','cable','network','econ','storage','pe','plant','power'))
R[39] = dict(spec=S('xfmr','machine','line','cable','network','substation','switch','prot','cap','reactor','storage','pe','plant','econ','circuit','power'))
R[40] = dict(spec=S('xfmr','machine','line','cable','substation','switch','cap','reactor','storage','pe','plant','network'))
for t in (41, 42, 43, 44, 45): R[t] = dict(spec=S('network','substation','xfmr','econ','plant','line','power','storage'))
R[46] = dict(spec=S('xfmr','line','cable','network','econ','machine','storage','substation','pe'))
R[47] = dict(spec=S('econ','network','plant','storage','power','pf','xfmr','line'))
R[48] = dict(spec=S('network','substation','xfmr','econ','power','plant','storage','circuit','machine','line'))
R[49] = dict(spec=S('xfmr','machine','line','cable','substation','switch','insul','prot','fault','cap','reactor','network','storage','plant','pe','ground','econ'))
R[50] = dict(spec=S('pf','cap','reactor','pq','network','power','xfmr','machine','econ','line','cable'), na=S('puredc'))
assert sorted(R) == list(range(1, 51))

def status(t, tags):
    r = R[t]
    if tags & r.get('na', set()): return 0
    if 'only' in r and not (tags & r['only']): return 0
    if tags & r.get('spec', set()): return 2
    return 1

base_names = {}
ents, rows = [], []
for n, title, cat in entries:
    t = (n - 1) % 50 + 1
    ci = cats.index(cat)
    assert title.endswith(' در ' + cat)
    b = title[:-len(' در ' + cat)]
    base_names.setdefault(t, b)
    assert base_names[t] == b, (n, b)
    st = status(t, CT[ci][1])
    ents.append([n, t, ci, st])
    rows.append([f'{n:04d}', title, cat, t, ['نامرتبط', 'عمومی', 'مرتبط'][st]])

data = dict(
    cats=[dict(n=c, s=CT[i][0]) for i, c in enumerate(cats)],
    tpl=[base_names[t] for t in range(1, 51)],
    ents=ents,
)
out = 'app/src/main/assets/data.js'
open(out, 'w', encoding='utf-8').write('window.DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

with open('COVERAGE.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['شماره', 'عنوان', 'موضوع', 'فرمول پایه (۱ تا ۵۰)', 'وضعیت'])
    w.writerows(rows)

from collections import Counter
c = Counter(e[3] for e in ents)
print('مرتبط', c[2], 'عمومی', c[1], 'نامرتبط', c[0], 'جمع', sum(c.values()))

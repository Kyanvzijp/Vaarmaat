#!/usr/bin/env python3
"""Verfijnt public/data/graph.json na build_graph.py: voegt dubbele bruggen samen.

In OpenStreetMap is een brug vaak meerdere wegen (rijbaan, fietspad, voetpad, spoor) die elk
apart over het water kruisen. Dat gaf twee tot vier "bruggen" op dezelfde plek, elk met een eigen
wachttijd en soms verschillende hoogtes. Dit script voegt bruggen samen die op dezelfde vaarweg
binnen 30 m van elkaar liggen (of binnen 80 m met dezelfde naam), en houdt de laagste hoogte aan.

Gebruik:  python3 scripts/refine_graph.py      (na build_graph.py, vóór build_pois.py)
"""
import json, math, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'public', 'data', 'graph.json')
d = json.load(open(PATH))
nodes, edges, bridges = d['nodes'], d['edges'], d['bridges']

def dist(a, b):
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371008.8 * math.asin(math.sqrt(h))

def norm(n):
    return re.sub(r'[^a-z0-9]', '', (n or '').lower())

NEAR, NEAR_SAME_NAME = 30.0, 80.0
CS = 0.001
grid = collections.defaultdict(list)
for i, b in enumerate(bridges):
    grid[(int(b['p'][0] / CS), int(b['p'][1] / CS))].append(i)

parent = list(range(len(bridges)))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
def union(a, b):
    a, b = find(a), find(b)
    if a != b:
        parent[b] = a

for i, b in enumerate(bridges):
    ci, cj = int(b['p'][0] / CS), int(b['p'][1] / CS)
    for la in range(ci - 1, ci + 2):
        for lo in range(cj - 1, cj + 2):
            for j in grid.get((la, lo), ()):
                if j <= i:
                    continue
                o = bridges[j]
                dd = dist(b['p'], o['p'])
                if dd > NEAR_SAME_NAME:
                    continue
                ni, nj = norm(b['n']), norm(o['n'])
                same_name = ni and nj and ni == nj
                if ni and nj and not same_name:
                    continue  # twee verschillende namen: aparte bruggen (bijv. de twee sluishoofden)
                if dd <= NEAR or same_name:
                    union(i, j)

groups = collections.defaultdict(list)
for i in range(len(bridges)):
    groups[find(i)].append(i)

merged = []
n_merged = 0
for members in groups.values():
    ms = [bridges[i] for i in members]
    if len(ms) == 1:
        merged.append(ms[0])
        continue
    n_merged += len(ms) - 1
    with_h = [m for m in ms if m['h'] is not None]
    movable_any = any(m['m'] for m in ms)
    if with_h:
        low = min(with_h, key=lambda m: m['h'])
        h = low['h']
        if low['m']:
            movable = 1
        elif movable_any:
            # laagste lid is "vast" getagd, een ander lid beweegbaar: dezelfde brug als de hoogtes bijna gelijk zijn
            mh = [m['h'] for m in ms if m['m'] and m['h'] is not None]
            movable = 1 if (not mh or min(mh) - h <= 0.35) else 0
        else:
            movable = 0
        base = low
    else:
        h = None
        movable = 1 if movable_any else 0
        base = ms[0]
    name = next((m['n'] for m in sorted(ms, key=lambda m: -len(m['n'] or '')) if m['n']), None)
    ops = next((m['o'] for m in ms if m.get('o')), None)
    out = {'n': name, 'h': h, 'm': movable, 'e': base['e'], 'p': base['p']}
    if ops:
        out['o'] = ops
    merged.append(out)

d['bridges'] = merged
print(f'bruggen: {len(bridges)} -> {len(merged)} ({n_merged} samengevoegd), met hoogte {sum(1 for b in merged if b["h"] is not None)}, beweegbaar {sum(b["m"] for b in merged)}', file=sys.stderr)
with open(PATH, 'w') as fh:
    json.dump(d, fh, separators=(',', ':'), ensure_ascii=False)
print('geschreven', PATH, os.path.getsize(PATH) // 1024, 'kB', file=sys.stderr)

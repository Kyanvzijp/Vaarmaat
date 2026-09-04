#!/usr/bin/env python3
"""Bouwt public/data/graph.json uit data/osm_raw.json (OpenStreetMap vaarwegen, bruggen en sluizen).

Gebruik:  python3 scripts/build_graph.py
Data ophalen: node scripts/fetch_osm.mjs
"""
import json, math, re, collections, datetime, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'osm_raw.json')
OUT = os.path.join(ROOT, 'public', 'data', 'graph.json')
raw = json.load(open(SRC))
ways_in, feats = raw['ways'], raw['feats']
BBOX = raw.get('bbox', [51.85, 4.20, 52.52, 5.32])

def num(v):
    if v is None:
        return None
    v = str(v).strip().lower().replace(',', '.')
    if v in ('unknown', 'default', 'none', 'no', 'yes'):
        return None
    m = re.match(r'^(-?\d+(?:\.\d+)?)\s*(m|meter|metre|km/h|kmh|kph|knots|kn|mph)?', v)
    if not m:
        return None
    x = float(m.group(1))
    u = m.group(2) or ''
    if u in ('knots', 'kn'):
        x *= 1.852
    elif u == 'mph':
        x *= 1.609
    return x

def dist(a, b):
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371008.8 * math.asin(math.sqrt(h))

# ---------- vaarwegen -> knopen en edges ----------
node_index = {}
nodes = []
edges = []      # [a, b, len, wayIdx]
ways_out = []   # WayInfo
edge_way_osm = []  # osm way id per edge
way_nodes_map = {}  # osm id -> list of node ids

def node_id(pt):
    k = (round(pt[0], 6), round(pt[1], 6))
    i = node_index.get(k)
    if i is None:
        i = len(nodes)
        node_index[k] = i
        nodes.append([k[0], k[1]])
    return i

skipped = collections.Counter()
for w in ways_in:
    t = w['t']
    wt = t.get('waterway', 'canal')
    boat = t.get('boat')
    motor = t.get('motorboat')
    tunnel = t.get('tunnel')
    if tunnel in ('culvert', 'yes', 'flooded', 'covered', 'passage', 'building_passage') and boat not in ('yes', 'permissive', 'designated') and motor not in ('yes', 'permissive', 'designated'):
        skipped['tunnel'] += 1
        continue
    if boat in ('no', 'private') or t.get('access') in ('no', 'private') and boat is None:
        skipped['boat=no'] += 1
        continue
    info = {
        'n': t.get('name') or t.get('name:nl') or t.get('alt_name') or t.get('loc_name') or None,
        't': wt,
        'h': num(t.get('maxheight')) or num(t.get('maxheight:physical')),
        'd': num(t.get('maxdraught')) or num(t.get('maxdraft')),
        'w': num(t.get('maxwidth')),
        's': num(t.get('maxspeed')),
    }
    if motor in ('no',):
        info['nm'] = 1
    # 'maxheight' op een kanaal van 0.1 m is bijna altijd een duiker: dan niet bevaarbaar
    if info['h'] is not None and info['h'] < 0.5 and boat not in ('yes',):
        skipped['low maxheight'] += 1
        continue
    widx = len(ways_out)
    ways_out.append(info)
    ids = [node_id(p) for p in w['g']]
    way_nodes_map[w['id']] = ids
    for a, b in zip(ids, ids[1:]):
        if a == b:
            continue
        L = dist(nodes[a], nodes[b])
        if L < 0.05:
            continue
        edges.append([a, b, round(L, 1), widx])
        edge_way_osm.append(w['id'])

print('ways', len(ways_out), 'nodes', len(nodes), 'edges', len(edges), 'skipped', dict(skipped), file=sys.stderr)

# ---------- ruimtelijke index op edges ----------
CS = 0.002
grid = collections.defaultdict(list)
def cells_of_segment(a, b):
    n = max(1, int(math.ceil(max(abs(a[0] - b[0]), abs(a[1] - b[1])) / CS)))
    out = set()
    for s in range(n + 1):
        f = s / n
        la = a[0] + (b[0] - a[0]) * f
        lo = a[1] + (b[1] - a[1]) * f
        out.add((int(math.floor(la / CS)), int(math.floor(lo / CS))))
    return out
for ei, e in enumerate(edges):
    for c in cells_of_segment(nodes[e[0]], nodes[e[1]]):
        grid[c].append(ei)

def project(p, a, b):
    cl = math.cos(math.radians(p[0]))
    ax, ay, bx, by, px, py = a[1] * cl, a[0], b[1] * cl, b[0], p[1] * cl, p[0]
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    t = 0 if l2 == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
    q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    return t, dist(p, q), q

def nearest_edge(p, maxd):
    best = None
    r = int(math.ceil(maxd / (CS * 111000))) + 1
    cla, clo = int(math.floor(p[0] / CS)), int(math.floor(p[1] / CS))
    seen = set()
    for la in range(cla - r, cla + r + 1):
        for lo in range(clo - r, clo + r + 1):
            for ei in grid.get((la, lo), ()):
                if ei in seen:
                    continue
                seen.add(ei)
                e = edges[ei]
                t, d, q = project(p, nodes[e[0]], nodes[e[1]])
                if d <= maxd and (best is None or d < best[1]):
                    best = (ei, d, q, t)
    return best

# ---------- losse eindpunten koppelen (kleine gaten in OSM data) ----------
deg = collections.Counter()
for e in edges:
    deg[e[0]] += 1
    deg[e[1]] += 1
node_grid = collections.defaultdict(list)
for i, p in enumerate(nodes):
    node_grid[(int(math.floor(p[0] / CS)), int(math.floor(p[1] / CS)))].append(i)
node_way = {}
for wid, ids in way_nodes_map.items():
    for i in ids:
        node_way.setdefault(i, set()).add(wid)

connector_way = len(ways_out)
ways_out.append({'n': None, 't': 'connector', 'h': None, 'd': None, 'w': None, 's': None})
SNAP = 30.0
joined = 0
for i, p in enumerate(nodes):
    if deg[i] != 1:
        continue
    cla, clo = int(math.floor(p[0] / CS)), int(math.floor(p[1] / CS))
    best = None
    for la in range(cla - 1, cla + 2):
        for lo in range(clo - 1, clo + 2):
            for j in node_grid.get((la, lo), ()):
                if j == i or node_way[j] & node_way[i]:
                    continue
                d = dist(p, nodes[j])
                if d <= SNAP and (best is None or d < best[1]):
                    best = (j, d)
    if best is None:
        # eindpunt op een edge (T-aansluiting zonder gedeelde knoop)
        ne = nearest_edge(p, SNAP)
        if ne and not (set([edge_way_osm[ne[0]]]) & node_way[i]):
            ei, d, q, t = ne
            e = edges[ei]
            j = e[0] if t < 0.5 else e[1]
            if dist(p, nodes[j]) <= SNAP * 1.5:
                best = (j, dist(p, nodes[j]))
    if best:
        j, d = best
        if d < 0.05:
            continue
        edges.append([i, j, round(max(d, 0.1), 1), connector_way])
        edge_way_osm.append(-1)
        deg[i] += 1
        deg[j] += 1
        joined += 1
print('connectors', joined, file=sys.stderr)

# opnieuw indexeren (connectors)
for ei in range(len(edges) - joined, len(edges)):
    e = edges[ei]
    for c in cells_of_segment(nodes[e[0]], nodes[e[1]]):
        grid[c].append(ei)

# ---------- bruggen ----------
def seg_intersect(p1, p2, p3, p4):
    def ccw(a, b, c):
        return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

def seg_cross_point(p1, p2, p3, p4):
    x1, y1, x2, y2, x3, y3, x4, y4 = p1[1], p1[0], p2[1], p2[0], p3[1], p3[0], p4[1], p4[0]
    den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(den) < 1e-15:
        return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
    return [y1 + t * (y2 - y1), x1 + t * (x2 - x1)]

MOVABLE_CATS = {'opening', 'bascule', 'lifting', 'lift', 'swing', 'drawbridge', 'retractable', 'rolling', 'transporter', 'submersible', 'tilt', 'folding'}
def bridge_props(t):
    h = num(t.get('seamark:bridge:clearance_height'))
    if h is None:
        h = num(t.get('seamark:bridge:clearance_height_closed'))
    movable = False
    if t.get('bridge') == 'movable':
        movable = True
    bm = t.get('bridge:movable')
    if bm and bm not in ('no',):
        movable = True
    cat = t.get('seamark:bridge:category')
    if cat in MOVABLE_CATS:
        movable = True
    if t.get('movable') == 'yes':
        movable = True
    name = t.get('seamark:bridge:name') or t.get('seamark:name') or t.get('bridge:name')
    n2 = t.get('name') or t.get('name:nl')
    is_bridge_obj = t.get('man_made') == 'bridge' or t.get('seamark:type') == 'bridge'
    if not name and n2 and (is_bridge_obj or re.search(r'brug|bridge|viaduct|aquaduct', n2, re.I)):
        name = n2
    fixed_known = cat == 'fixed'
    return h, movable, name, fixed_known, is_bridge_obj

hits = []  # (edge, point, h, movable, name, prio)
for f in feats:
    t = f['t']
    is_bridge = ('bridge' in t and t.get('bridge') not in ('no',)) or t.get('man_made') == 'bridge' or t.get('seamark:type') == 'bridge'
    if not is_bridge:
        continue
    if t.get('bridge') in ('aqueduct', 'low_water_crossing'):
        continue
    if 'waterway' in t and t.get('seamark:type') != 'bridge':
        continue  # aquaduct of iets anders op het water zelf
    h, movable, name, fixed_known, is_obj = bridge_props(t)
    prio = (2 if is_obj else 0) + (1 if h is not None else 0) + (1 if name else 0)
    g = f['g']
    if f['ty'] == 'node' or len(g) == 1:
        ne = nearest_edge(g[0], 25.0)
        if ne:
            hits.append((ne[0], ne[2], h, movable, name, prio, fixed_known))
        continue
    cellset = set()
    for a, b in zip(g, g[1:]):
        for c in cells_of_segment(a, b):
            cellset.add(c)
    cand = set()
    for c in cellset:
        cand.update(grid.get(c, ()))
    for ei in cand:
        e = edges[ei]
        pa, pb = nodes[e[0]], nodes[e[1]]
        for a, b in zip(g, g[1:]):
            if seg_intersect(a, b, pa, pb):
                hits.append((ei, seg_cross_point(a, b, pa, pb), h, movable, name, prio, fixed_known))
                break

# clusteren: hits op dezelfde vaarweg binnen 45 m worden een brug
hits.sort(key=lambda x: -x[5])
clusters = []  # dict(edge, point, h, movable, names, osmway)
for ei, pt, h, movable, name, prio, fixed_known in hits:
    wid = edge_way_osm[ei]
    found = None
    for c in clusters:
        same_way = c['osm'] == wid or c['osm'] == -1 or wid == -1
        d = dist(c['p'], pt)
        if same_way and (d <= 45 or (name and c['n'] == name and d <= 150)):
            found = c
            break
    if found is None:
        clusters.append({'e': ei, 'p': pt, 'h': h, 'm': movable, 'n': name, 'osm': wid, 'fixed': fixed_known})
    else:
        if h is not None and (found['h'] is None or h < found['h']):
            found['h'] = h
        if movable and not found['fixed']:
            found['m'] = True
        if fixed_known:
            found['fixed'] = True
        if not found['n'] and name:
            found['n'] = name
bridges = [{'n': c['n'], 'h': c['h'], 'm': 1 if (c['m'] and not c['fixed']) or (c['m'] and c['h'] is None) else 0, 'e': c['e'], 'p': [round(c['p'][0], 6), round(c['p'][1], 6)]} for c in clusters]
print('bridges', len(bridges), 'with height', sum(1 for b in bridges if b['h'] is not None), 'movable', sum(b['m'] for b in bridges), file=sys.stderr)

# ---------- sluizen en stuwen ----------
lock_hits = []
for f in feats:
    t = f['t']
    is_lock = t.get('waterway') == 'lock_gate' or t.get('lock') == 'yes' or t.get('seamark:type') in ('lock_basin', 'gate', 'lock')
    if not is_lock:
        continue
    g = f['g']
    pt = g[len(g) // 2] if len(g) > 1 else g[0]
    ne = nearest_edge(pt, 40.0)
    if ne:
        lock_hits.append((ne[0], ne[2], t.get('name') or t.get('lock_name') or t.get('seamark:name') or None))
# vaarwegdelen met lock=yes
for w in ways_in:
    if w['t'].get('lock') == 'yes' and w['id'] in way_nodes_map:
        ids = way_nodes_map[w['id']]
        mid = nodes[ids[len(ids) // 2]]
        ne = nearest_edge(mid, 5.0)
        if ne:
            lock_hits.append((ne[0], ne[2], w['t'].get('name') or w['t'].get('lock_name')))
lock_clusters = []
for ei, pt, name in lock_hits:
    found = None
    for c in lock_clusters:
        if dist(c['p'], pt) <= 200:
            found = c
            break
    if found is None:
        lock_clusters.append({'e': ei, 'p': pt, 'n': name})
    elif not found['n'] and name:
        found['n'] = name
locks = [{'n': c['n'], 'e': c['e'], 'p': [round(c['p'][0], 6), round(c['p'][1], 6)]} for c in lock_clusters]
print('locks', len(locks), file=sys.stderr)

# stuwen / dammen die precies op een vaarwegknoop liggen blokkeren die vaarweg (tenzij er een sluis binnen 250 m is)
blocked = 0
for f in feats:
    t = f['t']
    if t.get('waterway') not in ('weir', 'dam'):
        continue
    for p in f['g']:
        k = (round(p[0], 6), round(p[1], 6))
        i = node_index.get(k)
        if i is None:
            continue
        if any(dist(p, l['p']) < 250 for l in locks):
            continue
        for ei, e in enumerate(edges):
            pass
        # markeer alle edges aan deze knoop als geblokkeerd via een aparte way-info
        for ei in [x for x in range(len(edges)) if edges[x][0] == i or edges[x][1] == i]:
            w = dict(ways_out[edges[ei][3]])
            w['nb'] = 1
            ways_out.append(w)
            edges[ei][3] = len(ways_out) - 1
            blocked += 1
print('blocked by weir/dam edges', blocked, file=sys.stderr)

# ---------- componenten: losse snippers verwijderen, component-id opslaan ----------
adj = collections.defaultdict(list)
for ei, e in enumerate(edges):
    adj[e[0]].append(ei)
    adj[e[1]].append(ei)
comp = [-1] * len(nodes)
comp_sizes = []
for i in range(len(nodes)):
    if comp[i] != -1:
        continue
    cid = len(comp_sizes)
    stack = [i]
    comp[i] = cid
    size = 0
    while stack:
        u = stack.pop()
        size += 1
        for ei in adj[u]:
            e = edges[ei]
            v = e[1] if e[0] == u else e[0]
            if comp[v] == -1:
                comp[v] = cid
                stack.append(v)
    comp_sizes.append(size)
MIN_COMP = 40
keep_node = [comp_sizes[comp[i]] >= MIN_COMP for i in range(len(nodes))]
remap = {}
new_nodes = []
for i, k in enumerate(keep_node):
    if k:
        remap[i] = len(new_nodes)
        new_nodes.append(nodes[i])
edge_remap = {}
new_edges = []
for ei, e in enumerate(edges):
    if keep_node[e[0]] and keep_node[e[1]]:
        edge_remap[ei] = len(new_edges)
        new_edges.append([remap[e[0]], remap[e[1]], e[2], e[3]])
bridges = [dict(b, e=edge_remap[b['e']]) for b in bridges if b['e'] in edge_remap]
locks = [dict(l, e=edge_remap[l['e']]) for l in locks if l['e'] in edge_remap]
# component-ids hernummeren op grootte (0 = grootste)
order = sorted(range(len(comp_sizes)), key=lambda c: -comp_sizes[c])
rank = {c: r for r, c in enumerate(order)}
new_comp = [rank[comp[i]] for i in range(len(nodes)) if keep_node[i]]
print('components kept', sum(1 for s in comp_sizes if s >= MIN_COMP), 'of', len(comp_sizes), 'nodes', len(new_nodes), 'edges', len(new_edges), file=sys.stderr)
nodes, edges = new_nodes, new_edges

out = {
    'comp': new_comp,
    'meta': {'bbox': BBOX, 'source': 'OpenStreetMap (ODbL), via Overpass API', 'generated': datetime.date.today().isoformat(), 'nodes': len(nodes), 'edges': len(edges)},
    'nodes': nodes,
    'edges': edges,
    'ways': ways_out,
    'bridges': bridges,
    'locks': locks,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as fh:
    json.dump(out, fh, separators=(',', ':'), ensure_ascii=False)
print('written', OUT, os.path.getsize(OUT) // 1024, 'kB', file=sys.stderr)

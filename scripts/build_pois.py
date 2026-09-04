#!/usr/bin/env python3
"""Bouwt public/data/pois.json (havens, aanlegplaatsen, voorzieningen, verboden gebieden) uit data/osm_pois_raw.json
en voegt bedieningsinformatie (marifoon, telefoon, tijden) toe aan bruggen en sluizen in public/data/graph.json.

Gebruik: node scripts/fetch_pois.mjs && python3 scripts/build_pois.py   (na build_graph.py)
"""
import json, math, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'osm_pois_raw.json')
GRAPH = os.path.join(ROOT, 'public', 'data', 'graph.json')
OUT = os.path.join(ROOT, 'public', 'data', 'pois.json')

raw = json.load(open(SRC))
P, O = raw['P'], raw['O']

def dist(a, b):
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371008.8 * math.asin(math.sqrt(h))

KEEP = ['website', 'contact:website', 'phone', 'contact:phone', 'opening_hours', 'fee', 'capacity', 'maxstay', 'description', 'operator', 'vhf', 'email', 'power_supply', 'electricity', 'water', 'sanitary_dump_station', 'toilets', 'shower', 'fuel:diesel', 'fuel:petrol', 'fuel', 'access', 'seamark:information', 'note', 'seamark:restricted_area:restriction', 'seamark:harbour:category', 'seamark:small_craft_facility:category', 'seamark:mooring:category', 'mooring']

def clean_name(t):
    return t.get('name') or t.get('seamark:name') or t.get('name:nl') or t.get('alt_name') or None

def classify(t):
    st = t.get('seamark:type')
    if t.get('leisure') == 'marina' or (st == 'harbour' and t.get('seamark:harbour:category') in (None, 'marina', 'yacht')):
        return 'marina'
    if t.get('harbour') == 'yes' or st == 'harbour':
        return 'harbour'
    if t.get('waterway') == 'fuel' or t.get('amenity') == 'fuel' or t.get('seamark:small_craft_facility:category') == 'fuel_station' or st == 'bunker_station':
        return 'fuel'
    if t.get('amenity') == 'sanitary_dump_station' or t.get('waterway') == 'sanitary_dump_station' or t.get('seamark:small_craft_facility:category') == 'pump-out' or t.get('sanitary_dump_station') == 'yes':
        return 'pumpout'
    if t.get('waterway') == 'water_point':
        return 'water'
    if t.get('leisure') == 'slipway' or t.get('seamark:small_craft_facility:category') == 'slipway':
        return 'slipway'
    if t.get('shop') in ('boat', 'chandler', 'ship_chandler') or t.get('seamark:small_craft_facility:category') == 'chandler':
        return 'shop'
    if t.get('waterway') == 'boatyard' or t.get('seamark:small_craft_facility:category') in ('boatyard', 'boat_hoist'):
        return 'boatyard'
    if st == 'anchorage':
        return 'anchorage'
    if st == 'restricted_area':
        r = t.get('seamark:restricted_area:restriction', '')
        if 'anchor' in r:
            return 'no_anchor'
        if 'berth' in r or 'moor' in r:
            return 'no_mooring'
        return 'restricted'
    m = t.get('mooring')
    if m == 'no':
        return 'no_mooring'
    if m in ('yes', 'guest', 'pile', 'waiting', 'canoe', 'public') or t.get('seamark:small_craft_facility:category') == 'visitor_berth' or st == 'berth':
        return 'mooring'
    if st == 'mooring':
        cat = t.get('seamark:mooring:category')
        # losse palen, dukdalven en bolders zijn geen aanlegplaats; alleen met naam of als boei/wal
        if cat in ('buoy', 'wall') or clean_name(t):
            return 'mooring'
        return None
    if st == 'small_craft_facility':
        return 'mooring'
    return None

pois = []
seen_pos = collections.defaultdict(list)
for e in P:
    t = e['t']
    k = classify(t)
    if k is None:
        continue
    if t.get('mooring') in ('private', 'commercial', 'houseboat', 'ferry', 'cruise') and k == 'mooring':
        continue
    if t.get('access') in ('private', 'no') and k in ('mooring', 'slipway'):
        continue
    name = clean_name(t)
    info = {}
    for kk in KEEP:
        if kk in t and t[kk] not in ('', None):
            info[kk.split(':')[-1] if kk.startswith('contact:') else kk] = t[kk]
    if 'seamark:harbour:category' in info:
        info['category'] = {'marina': 'jachthaven'}.get(info.pop('seamark:harbour:category'), info.get('seamark:harbour:category', ''))
    for src, dst in (('seamark:small_craft_facility:category', 'category'), ('seamark:restricted_area:restriction', 'restriction'), ('seamark:information', 'description'), ('power_supply', 'electricity'), ('seamark:mooring:category', 'category')):
        if src in info:
            v = info.pop(src)
            if dst not in info:
                info[dst] = v
    # dubbele objecten op (bijna) dezelfde plek samenvoegen (bv. marina als node en als polygon)
    cell = (round(e['p'][0], 3), round(e['p'][1], 3))
    dup = None
    for q in seen_pos[cell]:
        if q['k'] == k and dist(q['p'], e['p']) < 120 and (q['n'] == name or q['n'] is None or name is None):
            dup = q
            break
    if dup:
        if dup['n'] is None and name:
            dup['n'] = name
        for kk, v in info.items():
            dup['t'].setdefault(kk, v)
        continue
    poi = {'id': f"{e['ty'][0]}{e['id']}", 'k': k, 'n': name, 'p': e['p'], 't': info}
    pois.append(poi)
    seen_pos[cell].append(poi)

print('pois', len(pois), collections.Counter(p['k'] for p in pois), file=sys.stderr)
json.dump(pois, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
print('written', OUT, os.path.getsize(OUT) // 1024, 'kB', file=sys.stderr)

# ---------- bedieningsinfo koppelen aan bruggen en sluizen in de graaf ----------
graph = json.load(open(GRAPH))

def ops_of(t):
    o = {}
    vhf = t.get('vhf') or t.get('seamark:radio_station:channel')
    if vhf:
        o['vhf'] = str(vhf).replace('VHF', '').strip()
    tel = t.get('phone') or t.get('contact:phone')
    if tel:
        o['tel'] = tel
    if t.get('opening_hours'):
        o['oh'] = t['opening_hours']
    if t.get('operator'):
        o['op'] = t['operator']
    web = t.get('website') or t.get('contact:website')
    if web:
        o['web'] = web
    info = t.get('seamark:information') or t.get('description') or t.get('note')
    if info:
        o['note'] = info[:300]
    if t.get('bridge:movable') in ('self_service',) or t.get('self_service') == 'yes' or 'zelfbedien' in (info or '').lower() or 'self' in (t.get('operator', '') or '').lower():
        o['self'] = 1
    return o

objs = []
for e in O:
    t = e['t']
    o = ops_of(t)
    if not o:
        continue
    is_lock = t.get('waterway') in ('lock_gate', 'lock') or t.get('lock') == 'yes' or t.get('seamark:type') in ('lock_basin', 'gate')
    objs.append({'p': e['p'], 'o': o, 'n': clean_name(t) or t.get('lock_name') or t.get('bridge:name'), 'lock': is_lock})

def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())

def attach(items, want_lock, radius):
    n = 0
    for it in items:
        best = None
        for ob in objs:
            if ob['lock'] != want_lock:
                continue
            d = dist(it['p'], ob['p'])
            if d > radius:
                continue
            same = it.get('n') and ob['n'] and (norm(it['n']) == norm(ob['n']) or norm(it['n']) in norm(ob['n']) or norm(ob['n']) in norm(it['n']))
            score = d - (500 if same else 0)
            if best is None or score < best[0]:
                best = (score, ob)
        if best:
            it['o'] = best[1]['o']
            if not it.get('n') and best[1]['n']:
                it['n'] = best[1]['n']
            n += 1
    return n

nb = attach([b for b in graph['bridges'] if b['m']], False, 150)
nl = attach(graph['locks'], True, 400)
print('ops attached: movable bridges', nb, 'locks', nl, file=sys.stderr)
json.dump(graph, open(GRAPH, 'w'), separators=(',', ':'), ensure_ascii=False)
print('graph updated', os.path.getsize(GRAPH) // 1024, 'kB', file=sys.stderr)

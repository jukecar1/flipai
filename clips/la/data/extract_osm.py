"""Extract real street / building / land-use detail for central Los Angeles from the BBBike OSM extract.
Outputs (local km frame of meta.json: x east of City Hall-ish origin, z = -north):
  detail.bin   RGBA8 raster  R=minor streets  G=arterials+freeways  B=land use code  A=building coverage
  detail.json  raster geometry
  bldg.bin     float32 x7 per building: x, z, w, d, angle, height_m, flags
  rail.json    rail / subway / light rail polylines
  air.json     runways / taxiways
"""
import json, math, sys, struct
import numpy as np
from PIL import Image, ImageDraw
import osmium

meta = json.load(open('meta.json'))
LON0, LAT0, KX, KY = meta['lon0'], meta['lat0'], meta['kx'], meta['ky']
LON_W, LON_E, LAT_S, LAT_N = -118.5, -118.0, 33.7, 34.2
X0 = (LON_W - LON0) * KX
X1 = (LON_E - LON0) * KX
Z0 = -((LAT_N - LAT0) * KY)   # north edge (smaller z)
Z1 = -((LAT_S - LAT0) * KY)
PX = 0.014  # km per pixel
RW = int(math.ceil((X1 - X0) / PX)); RH = int(math.ceil((Z1 - Z0) / PX))
SS = 2
print('raster', RW, RH, flush=True)

def km(lon, lat): return (lon - LON0) * KX, -((lat - LAT0) * KY)
def pxy(x, z, s=1): return ((x - X0) / PX * s, (z - Z0) / PX * s)

minor = Image.new('L', (RW * SS, RH * SS), 0); major = Image.new('L', (RW * SS, RH * SS), 0)
bcov = Image.new('L', (RW * SS, RH * SS), 0); land = Image.new('L', (RW, RH), 0)
dmin, dmaj, dbc, dland = ImageDraw.Draw(minor), ImageDraw.Draw(major), ImageDraw.Draw(bcov), ImageDraw.Draw(land)

MAJOR = {'motorway': 5, 'motorway_link': 3, 'trunk': 5, 'trunk_link': 3, 'primary': 4, 'primary_link': 2, 'secondary': 3, 'secondary_link': 2, 'tertiary': 2, 'tertiary_link': 2}
MINOR = {'residential': 1, 'unclassified': 1, 'living_street': 1, 'service': 0, 'road': 1}
LAND = {  # code painted into B
    'park': 60, 'garden': 60, 'recreation_ground': 60, 'golf_course': 60, 'grass': 60, 'village_green': 60, 'cemetery': 70, 'meadow': 60,
    'industrial': 120, 'railway': 120, 'quarry': 120, 'port': 120,
    'retail': 180, 'commercial': 180,
    'water': 240, 'reservoir': 240, 'basin': 240,
}

def landcode(t):
    for k in ('leisure', 'landuse', 'natural', 'amenity'):
        v = t.get(k)
        if k == 'natural' and v in ('water', 'wood', 'scrub', 'grassland'):
            if v == 'water': return 240
            if v == 'wood': return 60
        if v in LAND: return LAND[v]
        if k == 'leisure' and v in ('park', 'nature_reserve'): return 60
    return 0

def hgt(t):
    h = t.get('height')
    if h:
        try: return float(h.replace('m', '').strip().split(';')[0])
        except Exception: pass
    lv = t.get('building:levels')
    if lv:
        try: return float(lv.split(';')[0]) * 3.3 + 1.5
        except Exception: pass
    b = t.get('building', 'yes')
    return {'house': 5.5, 'detached': 5.5, 'residential': 7, 'apartments': 14, 'commercial': 12, 'retail': 7, 'industrial': 9, 'warehouse': 9, 'garage': 3.5, 'garages': 3.5, 'shed': 3, 'roof': 4, 'church': 12, 'school': 9, 'hospital': 18, 'office': 20, 'hotel': 25}.get(b, 6.5)

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy); idx = -1; dm = 0
    for i in range(1, len(pts) - 1):
        p = pts[i]; d = abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L if L > 1e-9 else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > dm: dm = d; idx = i
    if dm > eps: return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [a, b]

bl = []      # buildings
rail = []; air = []; named = []
stats = {'ways': 0, 'bld': 0}

class H(osmium.SimpleHandler):
    def way(self, w):
        t = w.tags
        hw = t.get('highway')
        try:
            if hw and (hw in MAJOR or hw in MINOR):
                pts = [km(n.lon, n.lat) for n in w.nodes if n.location.valid()]
                if len(pts) < 2: return
                xy = [pxy(x, z, SS) for x, z in pts]
                if hw in MAJOR: dmaj.line(xy, fill=255, width=max(2, MAJOR[hw] * SS // 2 + 1), joint='curve')
                else: dmin.line(xy, fill=255, width=SS, joint='curve') if MINOR[hw] else dmin.line(xy, fill=150, width=SS)
                stats['ways'] += 1; return
            rw = t.get('railway')
            if rw in ('rail', 'subway', 'light_rail', 'tram') and t.get('service') is None and t.get('tunnel') is None:
                pts = [km(n.lon, n.lat) for n in w.nodes if n.location.valid()]
                if len(pts) >= 2: rail.append((rw, rdp(pts, 0.03)))
                return
            aw = t.get('aeroway')
            if aw in ('runway', 'taxiway'):
                pts = [km(n.lon, n.lat) for n in w.nodes if n.location.valid()]
                if len(pts) >= 2: air.append((aw, rdp(pts, 0.02)))
                return
            if t.get('building') and w.is_closed():
                pts = [km(n.lon, n.lat) for n in w.nodes if n.location.valid()]
                if len(pts) < 4: return
                xy = [pxy(x, z, SS) for x, z in pts]
                dbc.polygon(xy, fill=255)
                h = hgt(t)
                # oriented box from longest edge
                best = 0; ang = 0
                for i in range(len(pts) - 1):
                    l = math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
                    if l > best: best = l; ang = math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
                ca, sa = math.cos(-ang), math.sin(-ang)
                us = [p[0] * ca - p[1] * sa for p in pts]; vs = [p[0] * sa + p[1] * ca for p in pts]
                wd, dp = max(us) - min(us), max(vs) - min(vs); cu, cv = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
                cx = cu * ca + cv * sa; cz = -cu * sa + cv * ca
                if wd < 0.004 or dp < 0.004: return
                bl.append((cx, cz, wd, dp, ang, h, 0))
                stats['bld'] += 1
                if h >= 60 or t.get('name') and h >= 40: named.append((t.get('name', ''), round(cx, 3), round(cz, 3), round(h)))
        except Exception as e:
            pass

    def area(self, a):
        t = a.tags
        c = landcode(t)
        if not c: return
        try:
            for ring in a.outer_rings():
                pts = [km(n.lon, n.lat) for n in ring]
                if len(pts) >= 4: dland.polygon([pxy(x, z) for x, z in pts], fill=c)
            for ring in a.inner_rings if False else []: pass
        except Exception:
            pass

H().apply_file('pbf/LosAngeles.osm.pbf', locations=True)
print(stats, len(rail), len(air), len(named), flush=True)

def down(img): return np.asarray(img.resize((RW, RH), Image.BOX), dtype=np.uint8)
R, G, B, A = down(minor), down(major), np.asarray(land, dtype=np.uint8), down(bcov)
out = np.stack([R, G, B, A], axis=-1)
open('detail.bin', 'wb').write(out.tobytes())
json.dump({'w': RW, 'h': RH, 'x0': X0, 'z0': Z0, 'px': PX}, open('detail.json', 'w'))

# buildings: keep every tall or large one, sample the rest
rng = np.random.default_rng(7)
keep = []
for b in bl:
    area = b[2] * b[3] * 1e6
    if b[5] >= 20 or area >= 1500: keep.append(b)
    elif area >= 350 and rng.random() < 0.55: keep.append(b)
    elif rng.random() < 0.22: keep.append(b)
print('buildings total', len(bl), 'kept', len(keep), flush=True)
arr = np.array(keep, dtype=np.float32)
open('bldg.bin', 'wb').write(arr.tobytes())
json.dump({'n': len(keep)}, open('bldg.json', 'w'))
json.dump({'rail': [{'k': k, 'p': [round(c, 3) for xy in p for c in xy]} for k, p in rail], 'air': [{'k': k, 'p': [round(c, 3) for xy in p for c in xy]} for k, p in air], 'named': named}, open('rail.json', 'w'), separators=(',', ':'))
print('done')

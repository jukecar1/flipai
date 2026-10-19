import json, glob, math, re
meta=json.load(open('meta.json')); LON0,LAT0,KX,KY=meta['lon0'],meta['lat0'],meta['kx'],meta['ky']
def rdp(pts,eps):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy); idx=-1; dmax=0
    for i in range(1,len(pts)-1):
        p=pts[i]; d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L if L>1e-9 else math.hypot(p[0]-a[0],p[1]-a[1])
        if d>dmax: dmax=d; idx=i
    if dmax>eps: return rdp(pts[:idx+1],eps)[:-1]+rdp(pts[idx:],eps)
    return [a,b]
out={}
for kind in ('mw','pr','rl'):
    seen={}; 
    for f in sorted(glob.glob(f'osm/{kind}_*.json')):
        try: d=json.load(open(f))
        except Exception: continue
        for el in d.get('elements',[]):
            if el.get('type')!='way' or 'geometry' not in el: continue
            seen[el['id']]=el
    ways=[]
    for el in seen.values():
        t=el.get('tags',{}); pts=[((g['lon']-LON0)*KX, -((g['lat']-LAT0)*KY)) for g in el['geometry']]
        pts=rdp(pts,0.03 if kind=='mw' else 0.05)
        if len(pts)<2: continue
        ways.append({'ref':t.get('ref',''),'name':t.get('name',''),'hw':t.get('highway',t.get('railway','')),'p':[round(c,3) for xy in pts for c in xy]})
    out[kind]=ways; print(kind,len(ways),sum(len(w['p'])//2 for w in ways),'pts')
# waterways (LA River and friends)
try:
    d=json.load(open('waterways.json')); ways=[]
    for el in d.get('elements',[]):
        if el.get('type')!='way' or 'geometry' not in el: continue
        pts=rdp([((g['lon']-LON0)*KX, -((g['lat']-LAT0)*KY)) for g in el['geometry']],0.04)
        if len(pts)>=2: ways.append({'ref':'','name':el.get('tags',{}).get('name',''),'hw':'river','p':[round(c,3) for xy in pts for c in xy]})
    out['wr']=ways; print('wr',len(ways))
except Exception as e: print('no waterways',e)
json.dump(out,open('roads.json','w'),separators=(',',':'))
import os; print(os.path.getsize('roads.json')/1e6,'MB')
refs={}
for w in out['mw']: refs[w['ref']]=refs.get(w['ref'],0)+1
print(sorted(refs.items(),key=lambda a:-a[1])[:30])

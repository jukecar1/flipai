import json, math
meta=json.load(open('meta.json')); LON0,LAT0,KX,KY=meta['lon0'],meta['lat0'],meta['kx'],meta['ky']
BB=(-119.0,-117.4,33.55,34.45)
ne=json.load(open('ne_roads_la.json'))
INTERSTATES={'5','10','15','105','110x','210','215','405','605','710'}
def refof(name):
    if name is None: return ''
    if name=='101': return 'US 101'
    if name in INTERSTATES: return 'I '+name
    if name=='110': return 'CA 110'
    return 'CA '+name
def inside(c): return BB[0]<=c[0]<=BB[1] and BB[2]<=c[1]<=BB[3]
def rdp(pts,eps):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy); idx=-1; dmax=0
    for i in range(1,len(pts)-1):
        p=pts[i]; d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L if L>1e-9 else math.hypot(p[0]-a[0],p[1]-a[1])
        if d>dmax: dmax=d; idx=i
    if dmax>eps: return rdp(pts[:idx+1],eps)[:-1]+rdp(pts[idx:],eps)
    return [a,b]
out={'mw':[],'pr':[],'rl':[],'wr':[]}
for name,t,ln in ne:
    runs=[];cur=[]
    for c in ln:
        if inside(c): cur.append(c)
        else:
            if len(cur)>1: runs.append(cur)
            cur=[]
    if len(cur)>1: runs.append(cur)
    for r in runs:
        pts=[((c[0]-LON0)*KX, -((c[1]-LAT0)*KY)) for c in r]; pts=rdp(pts,0.05)
        w={'ref':refof(name),'name':name or '','hw':'motorway' if t=='Major Highway' else 'trunk','p':[round(c,3) for xy in pts for c in xy]}
        out['mw'].append(w)
d=json.load(open('waterways.json'))
for el in d.get('elements',[]):
    if el.get('type')!='way' or 'geometry' not in el: continue
    pts=rdp([((g['lon']-LON0)*KX, -((g['lat']-LAT0)*KY)) for g in el['geometry']],0.04)
    if len(pts)>=2: out['wr'].append({'ref':'','name':el.get('tags',{}).get('name',''),'hw':'river','p':[round(c,3) for xy in pts for c in xy]})
json.dump(out,open('roads.json','w'),separators=(',',':'))
print({k:len(v) for k,v in out.items()})

import subprocess, os, sys, time, json, itertools
from concurrent.futures import ThreadPoolExecutor
URL="https://maps.mail.ru/osm/tools/overpass/api/interpreter"
LON0,LON1,LAT0,LAT1=-119.05,-117.35,33.50,34.50
dlon,dlat=0.2,0.125
tiles=[]
lon=LON0; i=0
while lon<LON1-1e-9:
    lat=LAT0; j=0
    while lat<LAT1-1e-9:
        tiles.append((i,j,lat,lon,min(lat+dlat,LAT1),min(lon+dlon,LON1))); lat+=dlat; j+=1
    lon+=dlon; i+=1
Q={
 "mw": 'way["highway"~"^(motorway|trunk)$"]({s},{w},{n},{e});',
 "pr": 'way["highway"="primary"]({s},{w},{n},{e});',
 "rl": 'way["railway"="rail"]["service"!~"."]({s},{w},{n},{e});',
}
def job(a):
    kind,(i,j,s,w,n,e)=a
    f=f"osm/{kind}_{i}_{j}.json"
    if os.path.exists(f) and os.path.getsize(f)>200: return f,"cached"
    q="[out:json][timeout:50];("+Q[kind].format(s=s,w=w,n=n,e=e)+");out geom qt tags;"
    for attempt in range(4):
        r=subprocess.run(["curl","-sS","-m","90","-o",f+".tmp","-w","%{http_code}","--data-urlencode","data="+q,URL],capture_output=True,text=True)
        if r.stdout.strip()=="200" and os.path.getsize(f+".tmp")>100:
            os.replace(f+".tmp",f); return f,"ok"
        time.sleep(3+attempt*4)
    return f,"FAILED"
KINDS=sys.argv[1].split(",") if len(sys.argv)>1 else ["mw"]
jobs=[(k,t) for k in KINDS for t in tiles]
print(len(jobs),"jobs",flush=True)
with ThreadPoolExecutor(2) as ex:
    n=0
    for f,st in ex.map(job,jobs):
        n+=1
        if st!="ok" and st!="cached" or n%12==0: print(n,f,st,flush=True)
print("done")

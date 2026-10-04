"""Synthesizes the San Andreas soundtrack. Every cue is placed through the same master-time warp as the picture.
No sustained synthetic tones: only noise-based ambience plus sparse event sounds."""
import subprocess
WARP=[(0,0),(9,9),(19,12),(22,15),(28,21),(38,28),(46,36),(52,40),(58,44),(62,46)]
n=len(WARP); h=[WARP[k+1][0]-WARP[k][0] for k in range(n-1)]; d=[(WARP[k+1][1]-WARP[k][1])/h[k] for k in range(n-1)]
m=[0]*n; m[0]=d[0]; m[-1]=d[-1]
for k in range(1,n-1):
    if d[k-1]*d[k]>0:
        w1=2*h[k]+h[k-1]; w2=h[k]+2*h[k-1]; m[k]=(w1+w2)/(w1/d[k-1]+w2/d[k])
def warp(T):
    for k in range(n-1):
        if T<=WARP[k+1][0]:
            x=(T-WARP[k][0])/h[k]; x2=x*x; x3=x2*x
            return (2*x3-3*x2+1)*WARP[k][1]+(x3-2*x2+x)*h[k]*m[k]+(-2*x3+3*x2)*WARP[k+1][1]+(x3-x2)*h[k]*m[k+1]
    return WARP[-1][1]
def T(tau):
    lo,hi=0.0,62.0
    for _ in range(60):
        mid=(lo+hi)/2
        if warp(mid)<tau: lo=mid
        else: hi=mid
    return lo
def pw(points, mapped=False):
    pts=[(T(a) if mapped else a, v) for a,v in points]
    expr=f"{pts[-1][1]}"
    for i in range(len(pts)-1,0,-1):
        (t0,v0),(t1,v1)=pts[i-1],pts[i]
        expr=f"if(lt(t,{t1:.3f}),{v0}+({v1}-{v0})*(t-{t0:.3f})/({t1-t0:.3f}),{expr})"
    return f"if(lt(t,{pts[0][0]:.3f}),{pts[0][1]},{expr})"
def decays(times, rate): return "+".join(f"exp(-(t-{c:.3f})*{rate})*gt(t,{c:.3f})" for c in times)
D=62
tP,tS=T(12.0),T(15.0)
topple=[T(x) for x in (17.2,18.9,20.6)]
freeway=[T(24.0+0.4*i) for i in range(12)]
panc=[T(x) for x in (29.8,33.0,35.4)]
# a handful of short, quiet car-alarm chirps and one distant siren pass, instead of anything continuous
chirps=[T(x) for x in (18.6,21.5,25.0,28.5,33.0,37.0)]
chirp_expr="+".join(f"gt(t,{c:.2f})*lt(t,{c+0.55:.2f})*gt(mod(t-{c:.2f},0.18),0.06)" for c in chirps)
alert="0.5*(sin(2*PI*853*t)+sin(2*PI*960*t))*lt(mod(t-5.4,0.62),0.3)*gt(t,5.4)*lt(t,6.9)*0.35+0.5*(sin(2*PI*853*t)+sin(2*PI*960*t))*lt(mod(t-19.0,0.5),0.26)*gt(t,19.0)*lt(t,22.0)*0.4"
fc=f"""
[0]highpass=f=70,lowpass=f=650,volume='{pw([(0,0.11),(T(12.0),0.12),(T(14.8),0.1),(T(16),0.04),(T(30),0.035),(T(46),0.025)])}':eval=frame[city];
[10]highpass=f=2600,lowpass=f=5200,volume='0.09*lt(t,{T(12.0):.2f})*gt(sin(t*7.1)*sin(t*2.3+1),0.2)*gt(mod(t,0.7),0.5)':eval=frame[birds];
[1]lowpass=f=100,volume='{pw([(0,0),(9.9,0.0),(14,0.15),(19.0,0.26),(T(15.0),0.95),(T(17),1.0),(T(36),0.85),(T(41),0.35),(T(42),0.7),(T(44),0.3),(62,0.1)])}':eval=frame[rumble];
[5]volume='gt(t,{tP:.2f})*0.7*exp(-(t-{tP:.2f})*5)+gt(t,{tS:.2f})*1.1*exp(-(t-{tS:.2f})*1.6)':eval=frame[boom];
[3]lowpass=f=2400,volume='0.95*({decays(topple,3.5)})':eval=frame[topple];
[4]lowpass=f=1800,volume='1.0*({decays(freeway,3.0)})':eval=frame[fwy];
[6]volume='1.5*({decays(panc,1.6)})':eval=frame[panc];
[2]highpass=f=3200,volume='{pw([(15.4,0),(16,0.2),(27,0.16),(30,0.0)],True)}*gt(sin(t*173)*sin(t*91)+sin(t*229)*0.4,0.55)':eval=frame[glass];
[8]lowpass=f=1800,volume='0.05*({chirp_expr})':eval=frame[alarm];
[9]lowpass=f=1400,volume='{pw([(0,0),(T(36.2),0),(T(37.5),0.035),(T(40.5),0.035),(T(41.5),0)])}':eval=frame[siren];
[11]highpass=f=1500,volume='{pw([(30.5,0),(33,0.1),(46,0.1)],True)}*gt(sin(t*311)*sin(t*47)+0.3*sin(t*523),0.45)':eval=frame[fire];
[12]highpass=f=2500,lowpass=f=6000,volume='{pw([(19.4,0),(20.5,0.03),(24,0.03),(28,0.0)],True)}':eval=frame[hiss];
[14]volume='1.0':eval=frame[alert];
[city][birds][rumble][boom][topple][fwy][panc][glass][alarm][siren][fire][hiss][alert]amix=inputs=13:normalize=0,alimiter=limit=0.9,volume=0.85,afade=t=in:d=0.4,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0[o]"""
inp=[f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=11",f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=13",f"anoisesrc=d={D}:c=white:r=44100:a=1:seed=12",
     f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=14",f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=15",f"sine=f=42:d={D}:r=44100",
     f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=18",f"anoisesrc=d={D}:c=white:r=44100:a=0.1:seed=19",
     f"aevalsrc='sin(2*PI*1250*t)':s=44100:d={D}",
     f"aevalsrc='sin(2*PI*700*t-300/0.16*cos(2*PI*0.16*t))':s=44100:d={D}",
     f"anoisesrc=d={D}:c=white:r=44100:a=1:seed=22",f"anoisesrc=d={D}:c=white:r=44100:a=1:seed=20",f"anoisesrc=d={D}:c=white:r=44100:a=1:seed=21",
     f"sine=f=100:d={D}:r=44100",f"aevalsrc='{alert}':s=44100:d={D}"]
cmd=["ffmpeg","-v","error","-y"]
for i in inp: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc.replace("\n",""),"-map","[o]","-ar","44100","-c:a","pcm_s16le","audio.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:600] or 'ok')

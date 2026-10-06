"""Synthesizes the impact soundtrack. Every cue is placed through the same master-time warp as the picture.
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
N=lambda k: f"(random({k})*2-1)"
topple=[T(x) for x in (17.2,18.9,20.6)]
freeway=[T(24.0+0.4*i) for i in range(12)]
panc=[T(x) for x in (29.8,33.0,35.4)]
bumps="+".join(f"exp(-pow((t-{c})/0.8,2))" for c in (1.1,2.7,4.2,5.7,7.3,8.8))
src_ae=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
whoosh=f"{N(8)}*gt(t,10.5)*lt(t,14.1)*pow(max((t-10.5)/3.6,0),2.2)*0.9"
boom=f"gt(t,14.0)*(sin(2*PI*36*max(t-14,0))*exp(-max(t-14,0)*1.1)*1.3+{N(9)}*exp(-max(t-14,0)*2.4)*0.9)"
ejrum=f"{N(10)}*0.8*max(min((t-44)/6,1),0)*(0.7+0.3*sin(t*3.1))"
inputs=[
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=13",
 src_ae(f"0.05*{N(1)}*({bumps})"),
 src_ae(whoosh),
 src_ae(f"{N(3)}*0.9*({decays(topple,3.5)}+{decays(freeway,3.0)}*1.1)"),
 src_ae(f"sin(2*PI*42*t)*(gt(t,{tP:.2f})*0.7*exp(-max(t-{tP:.2f},0)*5)+gt(t,{tS:.2f})*1.1*exp(-max(t-{tS:.2f},0)*1.6))"),
 src_ae(f"{N(4)}*1.3*({decays(panc,1.6)})"),
 src_ae(f"{N(5)}*({pw([(15.4,0),(16,0.22),(27,0.18),(30,0.0)],True)})*gt(sin(t*173)*sin(t*91)+0.4*sin(t*229),0.55)"),
 src_ae(f"{N(6)}*gt(random(7),0.992)*({pw([(30.5,0),(33,1.0),(46,1.0)],True)})*2.2"),
 src_ae(boom),
 src_ae(ejrum),
]
fc=f"""
[0]highpass=f=28,lowpass=f=90,volume='{pw([(0,0),(9.9,0.0),(14,0.0),(18.5,0.15),(T(15.0),0.8),(T(17),0.9),(T(36),0.7),(T(41),0.3),(T(42),0.55),(T(44),0.25),(62,0.0)])}':eval=frame[rumble];
[1]highpass=f=90,lowpass=f=620[cars];
[2]highpass=f=400,lowpass=f=5200,volume=0.35[whoosh];
[3]highpass=f=40,lowpass=f=2400[crash];
[4]anull[boomq];
[5]highpass=f=35,lowpass=f=1600[panc];
[6]highpass=f=3000[glass];
[7]highpass=f=1200,lowpass=f=6500[fire];
[8]lowpass=f=160,volume=1.0[impact];
[9]highpass=f=60,lowpass=f=900,volume=0.35[ej];
[rumble][cars][whoosh][crash][boomq][panc][glass][fire][impact][ej]amix=inputs=10:normalize=0,highpass=f=25[o]"""
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc.replace("\n",""),"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:500] or 'mixed')
# normalise to a safe peak with one linear gain (no limiter pumping)
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.4,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),'dB',r.stderr[:200] or 'ok')

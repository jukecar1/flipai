"""Soundtrack for the hurricane clip: envelope-driven wind/rain/rumble plus event hits. No sustained synthetic tones."""
import subprocess
D=62; TB=21.4
WIND=[(0,16),(5,24),(8.5,44),(11,74),(13.5,96),(15.5,112),(17,131),(18.8,158),(22,168),(30,165),(34,142),(36,28),(37.5,4),(42,5),(43.8,92),(45.2,150),(47.5,162),(50,112),(52.6,44),(54.6,12),(62,6)]
RAIN=[(0,.1),(6,.35),(11,.75),(18,1),(35,1),(37,.06),(43,.06),(44.6,1),(50,.9),(53,.25),(54.6,.12),(62,.05)]
SURGE=[(0,0),(23,0),(27,.35),(32,.8),(35.6,1),(36.8,.5),(43,.5),(47,.9),(49.6,.7),(51.6,.1),(54,0),(62,0)]
def env(pts,f=lambda v:v):
    parts=[]
    for (t0,a),(t1,b) in zip(pts,pts[1:]):
        a,b=f(a),f(b); u=f"((t-{t0})/{t1-t0})"
        parts.append(f"between(t,{t0},{t1})*({a}+({b}-{a})*(3*pow({u},2)-2*pow({u},3)))")
    return "+".join(parts)
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def burst(t0,dur,amp,dec,k): return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{M(t0)}*{dec})*{N(k)}"
def thud(t0,f0,f1,dur,amp,dec=6): return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{M(t0)}*{dec})*sin(2*PI*({f0}*{M(t0)}+({f1}-{f0})*pow({M(t0)},2)/(2*{dur})))"
src=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
tf=[12.5+(i*1.7)%9 for i in range(4)]+[13.4+(i*1.7)%9 for i in range(4)]
pops="+".join(burst(t,0.5,1.0,9,40+i)+"+"+thud(t,120,40,0.35,0.8,10) for i,t in enumerate(tf))
debris_hits="+".join(burst(t,0.12,1.0,40,70+i) for i,t in enumerate([9.4+0.9*i+0.37*(i%3) for i in range(14)]+[44.0+0.8*i for i in range(8)]))
creak=burst(TB-0.34,0.18,0.5,30,5)+"+"+burst(TB-0.12,0.1,0.8,60,6)
shatter=burst(TB,1.6,1.8,3.2,7)+"+"+thud(TB,90,30,1.0,1.8,3.5)
bumps="+".join(thud(t,80,40,0.35,0.9,8) for t in [26.8,28.1,29.0,30.3,31.5,32.9,34.2,45.5,47.2])
drips="+".join(f"gt(t,{t:.3f})*exp(-{M(t)}*70)*sin(2*PI*({900+(i*137)%700})*{M(t)})*0.3" for i,t in enumerate([37.9+0.83*i+0.2*(i%2) for i in range(7)]))
inputs=[
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=3",
 src("1"),                     # 1: wind env carrier
 f"anoisesrc=d={D}:c=white:r=44100:a=1:seed=5",
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=7",
 src(pops), src(debris_hits), src(creak+"+"+shatter), src(bumps+"+"+drips),
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=21",
]
gust="(0.78+0.22*sin(2*PI*0.37*t)+0.12*sin(2*PI*1.3*t))"
windv=env(WIND,lambda w:f"{0.06+0.94*pow(w/165,1.5):.4f}")
rainv=env(RAIN,lambda r:f"{r:.3f}")
surgev=env(SURGE,lambda r:f"{r:.3f}")
fc=(f"[0]highpass=f=110,lowpass=f=1400,volume='({windv})*{gust}*0.9':eval=frame[wind];"
    f"[2]highpass=f=2800,lowpass=f=9000,volume='({rainv})*0.18':eval=frame[rain];"
    f"[3]lowpass=f=80,volume='(({windv})*0.9+({surgev})*0.7)':eval=frame[rum];"
    "[4]highpass=f=60,lowpass=f=5000,volume=0.9[pop];[5]highpass=f=500,lowpass=f=4500,volume=0.55[deb];"
    "[6]highpass=f=60,volume=1.0[brk];[7]lowpass=f=900,volume=0.6[bmp];"
    f"[8]highpass=f=300,lowpass=f=1200,volume='({surgev})*0.28*{gust}':eval=frame[slosh];"
    "[1]anullsink;[wind][rain][rum][pop][deb][brk][bmp][slosh]amix=inputs=8:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:800] or 'mixed')
subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af","compand=attacks=0.05:decays=0.5:points=-90/-90|-62/-50|-44/-31|-24/-13|0/-5","raw2.wav"],capture_output=True,text=True)
v=subprocess.run(["ffmpeg","-i","raw2.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw2.wav","-af",f"volume={gain}dB,afade=t=in:d=0.5,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

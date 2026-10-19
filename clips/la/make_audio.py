"""Soundtrack for the Los Angeles timelapse: clock ticks, a rising city hum, soft bells at each milestone, freeway rumble. Events only."""
import subprocess
D=62
YEARS=[1781,1850,1892,1910,1913,1923,1928,1932,1940,1955,1962,1984,1990,2017,2020]
HOLD,HOLD0=2.1,2.6
TIMES=[0.0]; t=HOLD0
for i in range(1,len(YEARS)):
    d=YEARS[i]-YEARS[i-1]; t+=min(2.3,max(0.55,0.5+0.05*d)); TIMES.append(t); t+=HOLD
T_LAST=t+1.0
def toy(y): return TIMES[YEARS.index(y)]
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def env(pts):
    parts=[]
    for (t0,a),(t1,b) in zip(pts,pts[1:]):
        u=f"((t-{t0})/{t1-t0})"; parts.append(f"between(t,{t0},{t1})*({a}+({b}-{a})*(3*pow({u},2)-2*pow({u},3)))")
    return "+".join(parts)
def bell(t0,f,amp=0.4,dec=1.6): m=M(t0); return f"gt(t,{t0:.3f})*lt(t,{t0+5:.3f})*{amp}*exp(-{m}*{dec})*(sin(2*PI*{f}*{m})+0.4*sin(2*PI*{f*2.0}*{m})+0.25*sin(2*PI*{f*3.01}*{m}))"
bells="+".join(bell(toy(y)-0.1,784 if i%2 else 659) for i,y in enumerate(YEARS))
chords=bell(T_LAST,392,0.5,0.7)+"+"+bell(T_LAST,523,0.35,0.7)+"+"+bell(T_LAST,659,0.3,0.7)+"+"+bell(59.6,196,0.5,0.9)
ticks="gt(t,2.6)*lt(t,%s)*lt(mod(t,0.1667),0.004)"%T_LAST+"*0.8*"+N(31)
inputs=[
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=3",
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=5",
 f"aevalsrc='{bells}':s=44100:d={D}",
 f"aevalsrc='{chords}':s=44100:d={D}",
 f"aevalsrc='{ticks}':s=44100:d={D}",
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=9",
]
bed=env([(0,0.15),(2.4,0.2),(47.5,0.5),(54.6,0.3),(58,0.1),(62,0.05)])
city=env([(0,0),(5,0.0),(22,0.06),(47.5,0.16),(54.6,0.1),(58,0.02),(62,0)])
fwy=env([(0,0),(22,0),(26,0.35),(37,0.35),(41,0),(62,0)])
fc=(f"[0]lowpass=f=210,volume='({bed})':eval=frame[bed];"
    f"[1]highpass=f=500,lowpass=f=3200,volume='({city})':eval=frame[city];"
    "[2]lowpass=f=3500,volume=0.55[bl];[3]lowpass=f=3000,volume=0.5[ch];[4]highpass=f=1800,volume=0.35[tk];"
    f"[5]lowpass=f=75,volume='({fwy})':eval=frame[fw];"
    "[bed][city][bl][ch][tk][fw]amix=inputs=6:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:800] or 'mixed')
subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af","compand=attacks=0.05:decays=0.5:points=-90/-90|-62/-50|-44/-31|-24/-13|0/-5","raw2.wav"],capture_output=True,text=True)
v=subprocess.run(["ffmpeg","-i","raw2.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw2.wav","-af",f"volume={gain}dB,afade=t=in:d=0.6,afade=t=out:st=60.2:d=1.8,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

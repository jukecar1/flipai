"""Soundtrack for the Moon road trip: cabin hum, warp whooshes at each milestone, pings, the quiet of the Moon, then quake, siren, surf and the wave. Events only."""
import subprocess
D=62
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def env(pts):
    parts=[]
    for (t0,a),(t1,b) in zip(pts,pts[1:]):
        u=f"((t-{t0})/{t1-t0})"; parts.append(f"between(t,{t0},{t1})*({a}+({b}-{a})*(3*pow({u},2)-2*pow({u},3)))")
    return "+".join(parts)
def ping(t0,f,amp=0.4,dec=5): return f"gt(t,{t0:.3f})*lt(t,{t0+1.2:.3f})*{amp}*exp(-{M(t0)}*{dec})*sin(2*PI*{f}*{M(t0)})"
pings="+".join(ping(t,f) for t,f in [(9.9,880),(11.9,1175),(17.9,660),(18.2,990),(21.0,1046),(29.0,784),(36.1,1318),(36.35,1760)])
clicks="+".join(f"gt(t,{c:.3f})*lt(t,{c+0.05:.3f})*0.9*exp(-{M(c)}*90)*{N(60+i)}" for i,c in enumerate([22.0,23.6,27.0,52.5]))
quake=env([(45.1,0),(45.8,1),(52.6,1),(54.0,0.15)])
surf=env([(43.6,0.0),(44.2,0.5),(47.0,0.5),(48.0,0.18),(54.0,0.1)])
wave=env([(47.0,0),(50.0,0.35),(52.5,0.8),(54.0,1.6),(54.6,1.2),(55.6,0)])
warp=env([(7.0,0),(8.2,1),(10.4,1),(10.8,0.15),(13.2,0.7),(17.0,0.8),(19.2,0.2),(21.5,0.5),(29.0,0.55),(34.0,0.9),(36.0,0)])
eng=env([(0,0.5),(7.0,0.55),(36.0,0.35),(36.4,0.05),(43.5,0.05),(43.7,0.4),(45.0,0.3),(52.0,0.6),(53.6,0.9),(54.0,0.1),(54.6,0)])
siren=f"gt(t,46.0)*lt(t,54.6)*min(max((t-46.0)/1.0,0),1)*0.5*sin(2*PI*(480*t+90*sin(2*PI*0.4*t)/(2*PI*0.4)))"
bell=lambda t0: f"gt(t,{t0:.3f})*lt(t,{t0+5:.3f})*0.35*exp(-{M(t0)}*1.1)*(sin(2*PI*196*{M(t0)})+0.5*sin(2*PI*392*{M(t0)}))"
inputs=[
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=3",
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=5",
 f"aevalsrc='{pings}':s=44100:d={D}",
 f"aevalsrc='{clicks}':s=44100:d={D}",
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=11",
 f"anoisesrc=d={D}:c=white:r=44100:a=1:seed=13",
 f"aevalsrc='{siren}':s=44100:d={D}",
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=17",
 f"aevalsrc='{bell(59.6)}':s=44100:d={D}",
]
fc=(f"[0]lowpass=f=230,volume='({eng})*0.9':eval=frame[eng];"
    f"[1]highpass=f=900,lowpass=f=4500,volume='0.05*(1-min(max((t-7)/1.5,0),1))*(1-min(max((t-43.5)/0.3,0),1)*0)':eval=frame[road];"
    "[2]lowpass=f=3500,volume=0.5[pg];[3]highpass=f=1500,volume=0.7[ck];"
    f"[4]lowpass=f=70,volume='({quake})*(0.8+0.2*sin(2*PI*8*t))':eval=frame[qk];"
    f"[5]highpass=f=1500,lowpass=f=8000,volume='({warp})*0.07':eval=frame[wp];"
    "[6]highpass=f=250,lowpass=f=1500,volume=0.16[sr];"
    f"[7]highpass=f=300,lowpass=f=2600,volume='({surf})*0.6*(0.7+0.3*sin(2*PI*0.18*t))+({wave})*0.9':eval=frame[sf];"
    "[8]lowpass=f=1500,volume=0.8[bl];"
    "[eng][road][pg][ck][qk][wp][sr][sf][bl]amix=inputs=9:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:800] or 'mixed')
subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af","compand=attacks=0.05:decays=0.5:points=-90/-90|-62/-50|-44/-31|-24/-13|0/-5","raw2.wav"],capture_output=True,text=True)
v=subprocess.run(["ffmpeg","-i","raw2.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw2.wav","-af",f"volume={gain}dB,afade=t=in:d=0.5,afade=t=out:st=60.2:d=1.8,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

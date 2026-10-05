"""Soundtrack for the internet-outage clip: quiet city bed + short UI/event sounds. No sustained synthetic tones."""
import subprocess, random
D=62
random.seed(4)
N=lambda k: f"(random({k})*2-1)"
def ping(t0,f,amp=0.5,dec=14): return f"gt(t,{t0:.3f})*{amp}*exp(-max(t-{t0:.3f},0)*{dec})*sin(2*PI*{f}*max(t-{t0:.3f},0))"
def thud(t0,f0,f1,dur,amp): return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-max(t-{t0:.3f},0)*7)*sin(2*PI*({f0}*(t-{t0:.3f})+({f1}-{f0})*pow(max(t-{t0:.3f},0),2)/(2*{dur})))"
src=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
bumps="+".join(f"exp(-pow((t-{c})/1.1,2))" for c in (1.5,3.4,6.1,12,17.5,23,30,37,44,51))
# phone pings before the outage, then the flood of notifications when service returns
pre=ping(5.4,1320,0.5,16)+"+"+ping(5.55,1760,0.4,16)
flood="+".join(ping(55.15+i*0.17+random.random()*0.1,random.choice([1175,1319,1568,1760,2093]),0.32,15) for i in range(14))
back=ping(55.0,660,0.5,9)+"+"+ping(55.12,880,0.5,9)
errs="+".join(thud(t,260,140,0.28,0.7) for t in (14.0,19.0,24.0,29.0,34.0,39.0,44.0))
clicks="+".join(f"gt(t,{t:.2f})*lt(t,{t+0.03:.2f})*0.5*{N(9)}" for t in (9.2,14.0,19.0,24.0,29.0,34.0,39.0,44.0,50.0))
glitch=f"gt(t,9.0)*lt(t,9.5)*{N(5)}*0.5*gt(sin(t*210)+sin(t*97),0)*max(1-(t-9)/0.5,0)"
inputs=[
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=3",                       # 0 city bed
 src(f"0.06*{N(1)}*({bumps})"),                                       # 1 passing traffic
 src(f"{pre}+{back}+{flood}"),                                         # 2 pings
 src(f"{thud(9.0,150,38,0.6,0.9)}"),                                  # 3 power-down thump
 src(glitch),                                                         # 4 glitch burst
 src(errs),                                                           # 5 error bonks
 src(clicks),                                                         # 6 ui clicks
]
fc=("[0]highpass=f=60,lowpass=f=420,volume=0.05[bed];"
    "[1]highpass=f=80,lowpass=f=700[cars];[2]anull[p];[3]lowpass=f=300[th];[4]highpass=f=900,lowpass=f=6000[gl];[5]lowpass=f=1200[er];[6]highpass=f=1500,lowpass=f=6000,volume=0.25[ck];"
    "[bed][cars][p][th][gl][er][ck]amix=inputs=7:normalize=0,highpass=f=30[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:600] or 'mixed')
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-4.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.4,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

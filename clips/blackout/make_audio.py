"""Soundtrack for the blackout clip: quiet city bed that thins out, short event sounds, fire crackle later. No sustained synthetic tones."""
import subprocess, random, math
random.seed(11)
D=62
DAYK=[(8,0),(12,0.4),(17,1.5),(22,3),(27,5),(32,8),(37,14),(42,30),(48,60),(54,120),(58,180),(62,180)]
def tof(d):
    for k in range(len(DAYK)-1):
        if d<=DAYK[k+1][1]:
            f=(math.log(1+d)-math.log(1+DAYK[k][1]))/(math.log(1+DAYK[k+1][1])-math.log(1+DAYK[k][1]))
            return DAYK[k][0]+f*(DAYK[k+1][0]-DAYK[k][0])
    return 58
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def thud(t0,f0,f1,dur,amp,dec=7): return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{M(t0)}*{dec})*sin(2*PI*({f0}*{M(t0)}+({f1}-{f0})*pow({M(t0)},2)/(2*{dur})))"
def ping(t0,f,amp=0.5,dec=14): return f"gt(t,{t0:.3f})*{amp}*exp(-{M(t0)}*{dec})*sin(2*PI*{f}*{M(t0)})"
src=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
bumps="+".join(f"exp(-pow((t-{c})/1.1,2))" for c in (1.5,3.4,6.1,10,14,18,22))
pre=ping(5.4,1320,0.4,16)+"+"+ping(5.55,1760,0.3,16)
flips=[tof(d) for d in (0.02,0.08,0.5,0.9,2,4,6,12)]
errs="+".join(thud(t,260,140,0.28,0.6) for t in flips)
# lights dying: soft low thumps, more frequent as the city fails
dies=sorted(random.uniform(14,44) for _ in range(26))
blk="+".join(thud(t,90,45,0.35,0.5,9) for t in dies)
glitch=f"gt(t,8.0)*lt(t,8.5)*{N(5)}*0.5*gt(sin(t*210)+sin(t*97),0)*max(1-(t-8)/0.5,0)"
inputs=[
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=3",
 src(f"0.06*{N(1)}*({bumps})"),
 src(f"{pre}"),
 src(thud(8.0,150,38,0.6,0.9)),
 src(glitch),
 src(errs),
 src(blk),
 src(f"{N(6)}*gt(random(7),0.985)*max(min((t-36)/10,1),0)*2.0"),            # fire crackle
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=17",                               # distant rumble
]
fc=("[0]highpass=f=60,lowpass=f=420,volume='0.05*max(1-(t-8)/45,0.3)':eval=frame[bed];"
    "[1]highpass=f=80,lowpass=f=700[cars];[2]anull[p];[3]lowpass=f=300[th];[4]highpass=f=900,lowpass=f=6000[gl];[5]lowpass=f=1200[er];[6]lowpass=f=200[bk];"
    "[7]highpass=f=1200,lowpass=f=6500[fire];"
    "[8]highpass=f=25,lowpass=f=80,volume='0.4*min(max((t-30)/12,0),1)':eval=frame[rum];"
    "[bed][cars][p][th][gl][er][bk][fire][rum]amix=inputs=9:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:600] or 'mixed')
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-4.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.4,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

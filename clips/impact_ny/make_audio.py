"""Soundtrack, 'asteroid hits New York' cut. Event-based, no sustained synthetic tones."""
import subprocess
D=62
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def thud(t0,f0,f1,dur,amp,dec=6): return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{M(t0)}*{dec})*sin(2*PI*({f0}*{M(t0)}+({f1}-{f0})*pow({M(t0)},2)/(2*{dur})))"
src=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
bumps="+".join(f"exp(-pow((t-{c})/0.9,2))" for c in (1.2,3.0,5.2,7.4,9.1,11.5,13.2))
steps="+".join(f"gt(t,{c:.3f})*exp(-{M(c)}*28)*sin(2*PI*72*{M(c)})" for c in [0.4+0.53*i for i in range(20)])
glass="+".join(f"gt(t,{c:.3f})*exp(-{M(c)}*3.0)*{N(4)}" for c in [21.0,22.2,23.6,24.8,26.0,27.1,28.0,29.0,29.9])
inputs=[
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=3",
 src(f"0.05*{N(1)}*({bumps})"),
 src(f"0.5*({steps})*lt(t,9.7)"),
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=13",
 src(f"{N(8)}*gt(t,7.6)*lt(t,14.4)*pow(max((t-7.6)/6.8,0),2.4)*0.9"),
 src(thud(14.4,60,28,1.6,1.4,1.6)+"+"+thud(30.9,55,26,1.6,1.5,1.4)),
 src(f"{N(6)}*gt(random(7),0.992)*max(min((t-16.5)/3,1),0)*lt(t,31.6)*2.2"),
 src(glass),
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=29",
]
fc=("[0]highpass=f=70,lowpass=f=1500,volume='0.085*(1-min(max((t-14.2)/0.3,0),1))':eval=frame[bed];"
    "[1]highpass=f=90,lowpass=f=900,volume='1-min(max((t-14.2)/0.4,0),1)':eval=frame[cars];[2]lowpass=f=300[st];"
    "[3]highpass=f=26,lowpass=f=95,volume='0.1+0.8*min(max((t-16)/4,0),1)*(1-min(max((t-31.2)/0.3,0),1))':eval=frame[rum];"
    "[4]highpass=f=300,lowpass=f=4500,volume=0.4[wh];[5]lowpass=f=170[bm];[6]highpass=f=1200,lowpass=f=6500[fc];[7]highpass=f=2500,volume=0.5[gl];"
    "[8]highpass=f=25,lowpass=f=70,volume='0.18*min(max((t-33)/4,0),1)*(1-min(max((t-55)/3,0),1))':eval=frame[dk];"
    "[bed][cars][st][rum][wh][bm][fc][gl][dk]amix=inputs=9:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:600] or 'mixed')
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.4,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

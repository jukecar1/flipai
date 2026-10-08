"""Soundtrack for the plane-door clip. Event-based, no sustained synthetic tones."""
import subprocess
D=62; TF=33.4
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def thud(t0,f0,f1,dur,amp,dec=6): return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{M(t0)}*{dec})*sin(2*PI*({f0}*{M(t0)}+({f1}-{f0})*pow({M(t0)},2)/(2*{dur})))"
src=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
steps="+".join(f"gt(t,{c:.3f})*exp(-{M(c)}*26)*sin(2*PI*80*{M(c)})" for c in [11.6+0.56*i for i in range(14)])
clicks="+".join(f"gt(t,{c:.3f})*exp(-{M(c)}*60)*{N(5)}" for c in [TF+1.7+0.05*i+ (0.2 if i%2 else 0) for i in range(26)])
cabin_ding=f"gt(t,9.3)*exp(-{M(9.3)}*5)*sin(2*PI*1320*{M(9.3)})*0.18+gt(t,9.75)*exp(-{M(9.75)}*5)*sin(2*PI*990*{M(9.75)})*0.18"
inputs=[
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=3",
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=5",
 src(f"0.35*({steps})*lt(t,19.2)"),
 src(thud(22.7,95,60,0.6,1.1,7)+"+"+thud(24.9,100,55,0.7,1.2,6)+"+"+thud(27.1,90,50,0.8,1.3,5)),
 src(f"{N(9)}*gt(t,{TF})*lt(t,{TF}+0.35)*exp(-{M(TF)}*12)*3.0+"+thud(TF,70,25,1.4,2.2,2.2)),
 f"anoisesrc=d={D}:c=white:r=44100:a=1:seed=11",
 src(clicks),
 src(cabin_ding),
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=29",
]
fc=("[0]lowpass=f=420,volume='0.55*(1-min(max((t-30.6)/0.3,0),1)*(1-min(max((t-31.1)/0.4,0),1)))*(1-0.55*min(max((t-"+str(TF)+")/3,0),1))':eval=frame[eng];"
    "[1]highpass=f=900,lowpass=f=6000,volume='0.05*(1-min(max((t-30.6)/0.3,0),1)*(1-min(max((t-31.1)/0.4,0),1)))':eval=frame[hiss];"
    "[2]lowpass=f=300[st];[3]lowpass=f=220[hn];[4]lowpass=f=900[bang];"
    f"[5]highpass=f=250,lowpass=f=3500,volume='gt(t,{TF})*(0.85*exp(-(t-{TF})*0.45)+0.1)*(1-min(max((t-53)/1.5,0),1))':eval=frame[wind];"
    "[6]highpass=f=1800,volume=0.12[ck];[7]anull[dg];"
    f"[8]highpass=f=30,lowpass=f=90,volume='0.25*gt(t,{TF})*(1-min(max((t-54)/1.5,0),1))':eval=frame[rum];"
    "[eng][hiss][st][hn][bang][wind][ck][dg][rum]amix=inputs=9:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:600] or 'mixed')
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.4,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

"""Soundtrack for the succession explainer: night-city bed, funeral bells at each beat, motorcade sirens, flag wind. Events only, no sustained tones."""
import subprocess
D=62
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def bell(t0,amp=0.5): 
    m=M(t0); return f"gt(t,{t0:.3f})*lt(t,{t0+7:.3f})*{amp}*exp(-{m}*0.9)*(sin(2*PI*196*{m})+0.6*sin(2*PI*392*{m})+0.35*sin(2*PI*588*{m}*1.003)+0.25*sin(2*PI*790*{m}))"
bells="+".join(bell(t) for t in [4.4,13.8,24.8,34.2,44.8])
sirenenv="min(max((t-13.6)/3,0),1)*(1-min(max((t-26.5)/3,0),1))"
siren=f"{sirenenv}*(0.5*sin(2*PI*880*t+70*sin(2*PI*1.7*t))+0.4*sin(2*PI*1180*t+60*sin(2*PI*2.6*t)))"
ticks=f"gt(t,35.4)*lt(t,43.4)*gt(random(11),0.985)*exp(-mod(t,0.0125)*400)*{N(12)}"
inputs=[
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=3",
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=5",
 f"aevalsrc='{bells}':s=44100:d={D}",
 f"aevalsrc='{siren}':s=44100:d={D}",
 f"aevalsrc='{ticks}':s=44100:d={D}",
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=9",
]
fc=("[0]lowpass=f=260,volume=0.35[bed];"
    "[1]highpass=f=700,lowpass=f=3200,volume='0.10*min(max((t-44.0)/3,0),1)*(1-min(max((t-54)/1.5,0),1))*(0.7+0.3*sin(2*PI*0.4*t))':eval=frame[wind];"
    "[2]lowpass=f=1800,volume=0.55[bl];"
    "[3]highpass=f=500,lowpass=f=2600,volume=0.12[sir];"
    "[4]highpass=f=1500,volume=0.5[tk];"
    "[5]lowpass=f=120,volume='0.35*min(max((t-14)/2,0),1)*(1-min(max((t-27)/3,0),1))':eval=frame[eng];"
    "[bed][wind][bl][sir][tk][eng]amix=inputs=6:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:800] or 'mixed')
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.6,afade=t=out:st=60.2:d=1.8,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

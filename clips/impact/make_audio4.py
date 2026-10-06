"""Soundtrack for the Manhattan impact clip. Event-based; no sustained synthetic tones."""
import subprocess
D=62
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def burst(ts,rate,amp=1.0,k=3): return "+".join(f"gt(t,{c:.3f})*{amp}*exp(-{M(c)}*{rate})*{N(k)}" for c in ts)
def thud(t0,f0,f1,dur,amp,dec=6): return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{M(t0)}*{dec})*sin(2*PI*({f0}*{M(t0)}+({f1}-{f0})*pow({M(t0)},2)/(2*{dur})))"
src=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
bumps="+".join(f"exp(-pow((t-{c})/0.9,2))" for c in (1.2,3.0,5.2,7.4,9.1,11.5,13.2,15.8,18.0,20.1))
steps="+".join(f"gt(t,{c:.3f})*exp(-{M(c)}*28)*sin(2*PI*72*{M(c)})" for c in [0.4+0.53*i for i in range(40)])
glass=[24.9,25.6,26.3,27.5,28.8,30.1,31.4,33.0,34.8,36.5]
brick=[26.2,27.0,28.3,29.6,31.0,32.4,34.0,35.5,37.1]
fires=[49.5+0.35*i for i in range(30)]
crack=f"gt(random(7),0.993)*{N(6)}*max(min((t-48.5)/6,1),0)*2.2"
inputs=[
 f"anoisesrc=d={D}:c=pink:r=44100:a=1:seed=3",                      # 0 city bed
 src(f"0.05*{N(1)}*({bumps})"),                                      # 1 passing cars
 src(f"0.5*({steps})*lt(t,22.0)"),                                    # 2 footsteps
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=13",                    # 3 rumble bed
 src(burst(glass,3.2,0.9,4)),                                         # 4 glass crashes
 src(burst(brick,2.4,1.0,5)),                                         # 5 brick / debris
 src(thud(24.2,48,30,1.4,1.2,2.2)+"+"+thud(22.0,52,34,0.9,0.5,4)),   # 6 P and S wave booms
 src(crack),                                                          # 7 fire crackle
 src(burst([24.8+0.62],5,0.6,8)),                                     # 8 mug
 f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=29",                    # 9 sky roar
]
fc=("[0]highpass=f=70,lowpass=f=1500,volume='0.075*(1-smoothstep)':eval=frame[bed];").replace("*(1-smoothstep)","")
fc=(f"[0]highpass=f=70,lowpass=f=1500,volume='0.085*max(1-max(t-22,0)/6,0.0)':eval=frame[bed];"
    "[1]highpass=f=90,lowpass=f=900,volume='max(1-max(t-22,0)/3,0)':eval=frame[cars];[2]lowpass=f=300[st];"
    "[3]highpass=f=26,lowpass=f=95,volume='0.0+0.9*min(max((t-22)/2,0),1)*(1-min(max((t-38)/8,0),1))+0.0':eval=frame[rum];"
    "[4]highpass=f=2500[gl];[5]highpass=f=60,lowpass=f=2400[br];[6]lowpass=f=160[bm];[7]highpass=f=1200,lowpass=f=6500[fc];[8]highpass=f=2000[mg];"
    "[9]highpass=f=30,lowpass=f=120,volume='0.55*min(max((t-46)/8,0),1)':eval=frame[sr];"
    "[bed][cars][st][rum][gl][br][bm][fc][mg][sr]amix=inputs=10:normalize=0,highpass=f=25[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in inputs: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:600] or 'mixed')
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.4,afade=t=out:st=60.4:d=1.6,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

"""Soundtrack for the state-by-state minimum wage clip: year ticks while the clock runs, a bell at each milestone, small pings on callouts, soft chimes on the facts. Events only."""
import subprocess, math
D=55
MS=[(1968,0,2.3),(1981,3.0,2.4),(1998,3.4,2.4),(2010,2.8,2.6),(2025,4.2,13.2)]
t=3.2; times=[t]; seg=[]; t+=MS[0][2]; py=1968
for i in range(1,len(MS)):
    y,tr,h=MS[i]; seg.append((t,t+tr,py,y)); t+=tr; times.append(t); t+=h; py=y
T_SCENE=t; F0=T_SCENE-0.2; E0=F0+9.2; TF=T_SCENE-12.4
sstep=lambda x:(lambda x:x*x*(3-2*x))(min(1,max(0,x)))
ticks=[]
for a,b,y0,y1 in seg:
    last=math.floor(y0)
    for k in range(int((b-a)*200)+1):
        tt=a+(b-a)*k/200.0; yy=y0+(y1-y0)*sstep((tt-a)/(b-a))
        if math.floor(yy)>last: ticks.append(tt); last=math.floor(yy)
calls=[times[0]+0.2,times[1]+0.2,times[2]+0.2,times[3]+0.2,times[3]+0.2,TF+2.5,TF+3.5,TF+7.0,TF+8.0,TF+10.5,TF+10.9]
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def tone(t0,f,amp,dec,dur=3,harm=True):
    m=M(t0); h=f"+0.35*sin(2*PI*{f*2.0}*{m})+0.15*sin(2*PI*{f*3.01}*{m})" if harm else ""
    return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{m}*{dec})*(sin(2*PI*{f}*{m}){h})"
tk="+".join(f"gt(t,{x:.3f})*lt(t,{x+0.02:.3f})*0.5*{N(7)}" for x in ticks)
bells="+".join(tone(x-0.05,784 if i%2 else 659,0.35,1.7) for i,x in enumerate(times))
pg="+".join(tone(x,1318 if i%2 else 1046,0.14,7,0.5,False) for i,x in enumerate(calls))
fch="+".join(tone(F0+0.5+i*2.4,523,0.2,2.2,2.2) for i in range(3))
end=tone(E0+1.4,392,0.45,0.8,5)+"+"+tone(E0+1.4,494,0.3,0.8,5)+"+"+tone(E0+1.4,587,0.28,0.8,5)
# a soft low swell as the towers climb toward 2025
sw=f"gt(t,{times[3]:.2f})*lt(t,{times[4]+1.5:.2f})*0.5*{N(11)}"
ev=lambda e: f"aevalsrc='{e}':s=44100:d={D}"
ins=[f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=3", ev(tk), ev(bells+'+'+pg), ev(fch+'+'+end), ev(sw)]
env=f"if(between(t,{times[3]:.2f},{times[4]+1.5:.2f}),sin(PI*(t-{times[3]:.2f})/{times[4]+1.5-times[3]:.2f}),0)*0.22"
fc=("[0]lowpass=f=170,volume=0.1[bed];[1]highpass=f=1500,lowpass=f=5000,volume=0.55[tk];[2]lowpass=f=3500,volume=0.55[bl];[3]lowpass=f=3200,volume=0.5[ch];"
    f"[4]lowpass=f=300,volume='{env}':eval=frame[sw];[bed][tk][bl][ch][sw]amix=inputs=5:normalize=0,highpass=f=30[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in ins: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:500] or 'mixed', len(ticks),'ticks','T_SCENE',round(T_SCENE,1))
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0]); gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.5,afade=t=out:st=53:d=2,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

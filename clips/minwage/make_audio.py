"""Soundtrack for the minimum wage clip: soft year ticks while the clock runs, a bell on each milestone, small pings on raises, thuds as the bars land. Events only."""
import subprocess, math
D=58
MS=[(1968.0,0,2.0),(1981.0,3.4,2.3),(1990.25,2.6,2.3),(1997.75,2.2,2.3),(2009.56,3.0,2.5),(2025.5,4.0,3.2)]
t=3.4; seg=[]; starts=[]; t+=MS[0][2]; starts.append(3.4)
prev_y=1968.0; prev_t=t
for i in range(1,len(MS)):
    y,tr,h=MS[i]; seg.append((prev_t,prev_t+tr,prev_y,y)); prev_t+=tr; starts.append(prev_t); prev_t+=h; prev_y=y
T_A_END=prev_t; B0=T_A_END+0.2; F0=B0+10.6; E0=F0+8.4
def sstep(x): x=min(1,max(0,x)); return x*x*(3-2*x)
# tick times: every time the displayed year changes
ticks=[]
for a,b,y0,y1 in seg:
    last=math.floor(y0)
    n=int((b-a)*200)
    for k in range(n+1):
        tt=a+(b-a)*k/200.0; yy=y0+(y1-y0)*sstep((tt-a)/(b-a))
        if math.floor(yy)>last: ticks.append(tt); last=math.floor(yy)
HIST=[(1974.33,.4),(1978.0,.35),(1990.25,.45),(1991.25,.45),(1996.75,.5),(1997.67,.4),(2007.56,.7),(2008.56,.7),(2009.56,.7)]
def toT(yr):
    for a,b,y0,y1 in seg:
        if y0<=yr<=y1:
            lo,hi=a,b
            for _ in range(40):
                m=(lo+hi)/2
                if y0+(y1-y0)*sstep((m-a)/(b-a))<yr: lo=m
                else: hi=m
            return hi
    return None
pings=[toT(y) for y,_ in HIST if toT(y)]
N=lambda k: f"(random({k})*2-1)"
M=lambda t0: f"max(t-{t0:.3f},0)"
def tone(t0,f,amp,dec,dur=3,harm=True):
    m=M(t0); h=f"+0.35*sin(2*PI*{f*2.0}*{m})+0.15*sin(2*PI*{f*3.01}*{m})" if harm else ""
    return f"gt(t,{t0:.3f})*lt(t,{t0+dur:.3f})*{amp}*exp(-{m}*{dec})*(sin(2*PI*{f}*{m}){h})"
def thud(t0,amp=0.9): m=M(t0); return f"gt(t,{t0:.3f})*lt(t,{t0+0.6:.3f})*{amp}*exp(-{m}*9)*sin(2*PI*(62-30*{m})*{m})"
tk="+".join(f"gt(t,{x:.3f})*lt(t,{x+0.02:.3f})*0.5*{N(7)}" for x in ticks)
bells="+".join(tone(x-0.05,784 if i%2 else 659,0.35,1.7) for i,x in enumerate(starts))
pg="+".join(tone(x,1318,0.14,7,0.5,False) for x in pings)
bars=thud(B0+1.4)+"+"+thud(B0+2.6)+"+"+tone(B0+3.6,988,0.2,4,1.2)+"+"+tone(B0+5.6,1175,0.2,4,1.2)+"+"+tone(B0+8.0,880,0.25,2.5,2.5)
fch="+".join(tone(F0+0.5+i*2.2,523,0.2,2.2,2.2) for i in range(3))
end=tone(E0+1.2,392,0.45,0.8,5)+"+"+tone(E0+1.2,494,0.3,0.8,5)+"+"+tone(E0+1.2,587,0.28,0.8,5)
def ev(e,seed): return f"aevalsrc='{e}':s=44100:d={D}"
ins=[f"anoisesrc=d={D}:c=brown:r=44100:a=1:seed=3", ev(tk,1), ev(bells+'+'+pg,2), ev(bars,3), ev(fch+'+'+end,4)]
bed=f"between(t,0,{D})*0.10"
fc=("[0]lowpass=f=170,volume=0.1[bed];[1]highpass=f=1500,lowpass=f=5000,volume=0.55[tk];[2]lowpass=f=3500,volume=0.55[bl];[3]lowpass=f=3500,volume=0.7[br];[4]lowpass=f=3200,volume=0.5[ch];"
    "[bed][tk][bl][br][ch]amix=inputs=5:normalize=0,highpass=f=30[o]")
cmd=["ffmpeg","-v","error","-y"]
for i in ins: cmd+=["-f","lavfi","-i",i]
cmd+=["-filter_complex",fc,"-map","[o]","-ar","44100","-c:a","pcm_f32le","raw.wav"]
r=subprocess.run(cmd,capture_output=True,text=True); print(r.stderr[:600] or 'mixed', len(ticks),'ticks',len(pings),'pings', 'T_A_END',round(T_A_END,1))
v=subprocess.run(["ffmpeg","-i","raw.wav","-af","volume=-20dB,volumedetect","-f","null","-"],capture_output=True,text=True).stderr
mx=float([l for l in v.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0]); gain=-3.0-(mx+20.0)
r=subprocess.run(["ffmpeg","-v","error","-y","-i","raw.wav","-af",f"volume={gain}dB,afade=t=in:d=0.5,afade=t=out:st=56:d=2,pan=stereo|c0=c0|c1=c0","audio.wav"],capture_output=True,text=True); print('gain',round(gain,1),r.stderr[:200] or 'ok')

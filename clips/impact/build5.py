import re
b4=open('impact/build4.py').read()
head_src=b4[:b4.index("world=open('impact/world4.js').read()")]
ns={}; exec(head_src, ns)
base=ns['base']; old=ns['old']
base=base.replace("first person, walking an avenue in Manhattan, 2,600 km from the impact.","first person, walking an avenue in Manhattan; the asteroid hits ~35 km away.")
head=open('impact/world5_head.js').read().replace("T > 22.2","T > 14.4")
tail=open('impact/world5_tail.js').read()
tail=tail.replace("if (t > 8.2 && t < 14.5) {\n    const u = (t - 8.4) / 5.8,","if (t > 7.4 && t < 14.5) {\n    const u = (t - 7.6) / 6.8,").replace("clamp((t - 8.4) / 0.4)","clamp((t - 7.6) / 0.4)")
a=old.index("/* ------------------------------------------------------------------ *\n *  HUD / captions")
overlay=old[a:]
overlay=overlay.replace("update(warp(Tj));","update(Tj);").replace("const skip3D = T > 58.9;","const skip3D = T > 33.2;")
b0=overlay.index("const BEATS = ["); b1=overlay.index("];",b0)+2
beats='''const BEATS = [
  { a: 0.6, b: 4.8, label: 'Asteroid diameter', value: () => '10 km', sub: () => '6 miles: wider than Everest is tall' },
  { a: 4.8, b: 7.3, label: 'Impact speed', value: (k) => `${Math.round(20 * smooth(k * 1.4))} km/s`, sub: () => 'About 45,000 mph' },
  { a: 7.4, b: 14.4, label: 'Impact in', value: (k) => `0:0${Math.max(0, Math.ceil(7 * (1 - k)))}`, sub: () => 'Real time. Impact point: 35 km away' },
  { a: 16.2, b: 31.0, label: 'Illustrative reconstruction', value: () => 'Slowed', sub: () => 'No one would survive to see this' },
];'''
overlay=overlay[:b0]+beats+overlay[b1:]
c0=overlay.index("const CAPS = ["); c1=overlay.index("];",c0)+2
caps='''const CAPS = [
  [1.0, 4.6, 'A 10-kilometer asteroid is on its way. What if it hit New York?'],
  [5.0, 7.2, 'You would get about seven seconds of warning.'],
  [7.9, 13.9, 'The sky is the only sign.'],
  [16.5, 21.0, 'Heat first. Everything flammable ignites at once.'],
  [21.6, 26.8, 'Then the shock front tears down the avenue.'],
  [27.4, 30.6, 'Nothing inside the fireball survives.'],
];
const FACTS = [
  [35.4, 'Energy released', '100 million megatons', 'About 10,000x all nuclear weapons combined'],
  [38.2, 'Fireball radius', 'about 136 km', 'Collins, Melosh & Marcus (2005) formula. Manhattan is inside it'],
  [41.0, 'Crater', 'about 120 km wide', 'Same formulas. It excavates rock more than 20 km deep'],
  [43.8, 'Global heat pulse', 'an oven on broil, for about an hour', 'Melosh et al. 1990, Toon et al. 1997'],
  [46.6, 'Dark and cold', 'for about a decade', 'Dust, soot and aerosols block the sun'],
  [49.4, 'Species lost', 'about 75%', 'The K-Pg mass extinction, 66 million years ago'],
  [52.2, 'Known asteroid threats', 'none for 100+ years', 'NASA Planetary Defense'],
];'''
overlay=overlay[:c0]+caps+overlay[c1:]
pat="  const fl = T >= 14 && T < 15.6 ? Math.exp(-(T - 14) * 2.6) : 0; flash.style.opacity = fl;\n"
assert pat in overlay
overlay=overlay.replace(pat,"""  {
    const fw = T < 31.5 ? Math.max(smooth((T - 13.7) / 0.7) * (1 - smooth((T - 15.4) / 1.0)), smooth((T - 30.4) / 0.9)) : 1;
    flash.style.background = T >= 31.6 ? '#000' : '#fff'; flash.style.opacity = fw;
    document.getElementById('heat').style.opacity = 0.7 * smooth((T - 16) / 3) * (1 - smooth((T - 30.6) / 0.8));
    const fe = document.getElementById('facts');
    fe.innerHTML = FACTS.filter((f) => T >= f[0]).map((f) => `<div class="f" style="opacity:${smooth((T - f[0]) / 0.7) * (1 - smooth((T - 56.6) / 0.6))}"><div class="fl">${f[1]}</div><div class="fv">${f[2]}</div><div class="fs">${f[3]}</div></div>`).join('');
  }
""")
out=base+head+tail+"  flushSmoke();\n}\n\n"+overlay
open('impact/main_ny.js','w').write(out)
h=open('impact/index.html').read()
if 'id="facts"' not in h:
    h=h.replace('  <div id="heat"></div>','  <div id="heat"></div>\n  <div id="facts"></div>')
    h=h.replace("  #flash {","  #facts { position: absolute; left: 8vw; right: 8vw; top: 12vh; display: flex; flex-direction: column; gap: 2.2vh; color: #f4efe6; font-family: var(--serif); }\n  #facts .fl { font-family: var(--sans); font-size: 1.15vh; letter-spacing: .24em; text-transform: uppercase; font-weight: 700; opacity: .85; }\n  #facts .fv { font-size: 4.6vh; line-height: 1.05; margin-top: .3vh; }\n  #facts .fs { font-family: var(--sans); font-size: 1.1vh; letter-spacing: .12em; opacity: .65; margin-top: .4vh; }\n  #flash {")
os_=open('impact/index.html','w').write(h)
print(len(out))

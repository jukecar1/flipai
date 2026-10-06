import re
sa=open('sanandreas/main.js').read()
old=open('/tmp/claude-0/-home-user-flipai/89a2c518-56f7-5116-8a46-021f8414392e/scratchpad/impact_old_main.js').read()
base=sa[:sa.index("/* ---------- lights ---------- */")]
def rep(a,b):
    global base
    assert a in base, a[:70]
    base=base.replace(a,b,1)
rep('"What if the San Andreas Fault ruptured?"  — deterministic 62s timeline.','"What if the dinosaur-killing asteroid hit today?"  — deterministic 62s timeline.')
base=re.sub(r"\n \*  Setting:.*?\*/", "\n *  Setting: first person, walking an avenue in Manhattan, 2,600 km from the impact.\n */", base, count=1, flags=re.S)
rep("      float s = max(dot(normalize(vP), sunDir), 0.0);","""      vec2 cu = vP.xz / (vP.y + 0.12) * 0.55;
      float cn = cnoise(cu * 1.3 + vec2(time * 0.004, 0.0)) * 0.55 + cnoise(cu * 2.7 + 7.0) * 0.3 + cnoise(cu * 6.1 + 3.0) * 0.15;
      float cm = smoothstep(0.5, 0.78, cn) * smoothstep(0.02, 0.2, vP.y) * cloudAmt;
      vec3 ccol = mix(vec3(0.62,0.64,0.7), vec3(1.0,0.95,0.86), clamp(0.55 + (0.3 - cn) * 1.4, 0.0, 1.0));
      c = mix(c, ccol * (0.85 + 0.3 * pow(max(dot(normalize(vP), sunDir), 0.0), 3.0)), cm * 0.85);
      float s = max(dot(normalize(vP), sunDir), 0.0);""")
rep("uniform vec3 top, hor, sunDir, sunCol; uniform float sunAmt; varying vec3 vP;","""uniform vec3 top, hor, sunDir, sunCol; uniform float sunAmt, cloudAmt, time; varying vec3 vP;
    float ch(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float cnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(ch(i), ch(i+vec2(1,0)), f.x), mix(ch(i+vec2(0,1)), ch(i+vec2(1,1)), f.x), f.y); }""")
rep("sunAmt: { value: 1 },\n  },","sunAmt: { value: 1 }, cloudAmt: { value: 1 }, time: { value: 0 },\n  },")
rep("pow(smoothstep(0.0, 0.7, h), 0.65)","pow(smoothstep(0.0, 0.42, h), 0.55)")
rep("const smokeMat = new THREE.MeshBasicMaterial({ map: puffTex, transparent: true, depthWrite: false });","const smokeMat = new THREE.MeshBasicMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: false });")
world=open('impact/world4.js').read()
ej='''  // ejecta falling back through the sky (streaks of glowing debris)
  {
    const ea = smooth((Tm - 47) / 4);
    ejecta.pts.material.opacity = 0.95 * ea;
    if (ea > 0.01) for (let i = 0; i < EJ_N; i++) {
      const e = EJ[i], p = (Tm * 0.5 + e.ph) % 1;
      for (let j = 0; j < 14; j++) { const q = p * 640 - j * 7, k = (i * 14 + j) * 3; ejecta.pos[k] = e.x + 0.34 * q; ejecta.pos[k + 1] = e.y - 0.92 * q; ejecta.pos[k + 2] = e.z + 0.12 * q; }
    }
    ejecta.geo.attributes.position.needsUpdate = true;
  }
'''
a=old.index("/* ------------------------------------------------------------------ *\n *  HUD / captions")
overlay=old[a:]
overlay=overlay.replace("update(warp(Tj));","update(Tj);")
b0=overlay.index("const BEATS = ["); b1=overlay.index("];",b0)+2
beats='''const BEATS = [
  { a: 0.6, b: 4.8, label: 'Asteroid diameter', value: () => '10 km', sub: () => '6 miles: wider than Everest is tall' },
  { a: 4.8, b: 8.9, label: 'Impact speed', value: (k) => `${Math.round(20 * smooth(k * 1.4))} km/s`, sub: () => 'About 45,000 mph' },
  { a: 9.0, b: 14.0, label: 'Impact in', value: (k) => `0:0${Math.max(0, Math.ceil(7 * (1 - k)))}`, sub: () => 'You are 2,600 km (1,600 mi) away' },
  { a: 14.3, b: 21.8, label: 'Seismic waves arrive in', value: (k) => mmss(325 * (1 - k)), sub: () => 'Compressed. P-waves travel about 8 km/s' },
  { a: 22.0, b: 24.0, label: 'Seismic waves', value: () => 'Here', sub: () => 'S-waves follow about 4 minutes later' },
  { a: 24.2, b: 40.0, label: 'Equivalent magnitude', value: (k) => `${(9.4 + 1.9 * smooth(k)).toFixed(1)}`, sub: () => 'Estimates: 9.4 to 11.3. Record: 9.5 (Chile, 1960)' },
  { a: 40.0, b: 47.0, label: 'Energy released', value: (k) => `${Math.round(100 * smooth(k))} million Mt`, sub: () => 'Of TNT. About 10,000x all nuclear weapons' },
  { a: 50.0, b: 54.4, label: 'Heat from the sky (model)', value: (k) => `${(6 * smooth(k)).toFixed(1)} kW/m\\u00b2`, sub: () => 'Peak: about 6x midday sun (Melosh 1990)' },
  { a: 54.6, b: 57.6, label: 'Tsunami reaches most coasts', value: () => '< 48 h', sub: () => 'Gulf waves 300+ m after 1 hour (Range 2022)' },
];'''
overlay=overlay[:b0]+beats+overlay[b1:]
c0=overlay.index("const CAPS = ["); c1=overlay.index("];",c0)+2
caps='''const CAPS = [
  [1.0, 4.6, '66 million years ago, a 10-kilometer asteroid hit what is now Mexico.'],
  [5.0, 8.8, 'What if it happened again, 1,600 miles from New York?'],
  [9.3, 13.8, 'From here, you would not see a thing.'],
  [14.4, 21.4, 'It hits far below the horizon. Life goes on for five minutes.'],
  [22.2, 24.0, 'Then the ground starts to move.'],
  [24.6, 29.0, 'A mega-earthquake, far stronger than any ever recorded.'],
  [29.5, 34.0, 'Glass and brick rain onto the street.'],
  [34.5, 40.0, 'Roads crack. Signals die. Tall buildings sway for minutes.'],
  [40.5, 46.0, 'Then it goes quiet.'],
  [46.5, 50.5, 'The sky begins to glow.'],
  [51.0, 54.0, 'Rock thrown into space falls back through the sky.'],
  [54.4, 57.5, 'Models show the heat can ignite fires worldwide.'],
];'''
overlay=overlay[:c0]+caps+overlay[c1:]
overlay=re.sub(r"  const fl = T >= 14 && T < 15\.6 \? Math\.exp\(-\(T - 14\) \* 2\.6\) : 0; flash\.style\.opacity = fl;\n","  flash.style.opacity = 0; document.getElementById('heat').style.opacity = 0.7 * smooth((T - 48) / 7);\n",overlay)
assert "getElementById('heat')" in overlay
out=base+world+ej+"  flushSmoke();\n}\n\n"+overlay
open('impact/main.js','w').write(out)
h=open('impact/index.html').read()
if 'id="heat"' not in h:
    h=h.replace('  <div id="flash"></div>','  <div id="flash"></div>\n  <div id="heat"></div>')
    h=h.replace("  #flash {","  #heat { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at 50% 55%, rgba(255,90,30,0) 35%, rgba(255,70,20,.55) 100%); mix-blend-mode: screen; }\n  #flash {")
open('impact/index.html','w').write(h)
print(len(out))

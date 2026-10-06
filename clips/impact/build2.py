import re
sa=open('sanandreas/main.js').read()
old=open('/tmp/claude-0/-home-user-flipai/89a2c518-56f7-5116-8a46-021f8414392e/scratchpad/impact_old_main.js').read()
base=sa[:sa.index("/* ---------- lights ---------- */")]
def rep(a,b):
    global base
    assert a in base, a[:70]
    base=base.replace(a,b,1)
rep('"What if the San Andreas Fault ruptured?"  — deterministic 62s timeline.','"What if the dinosaur-killing asteroid hit today?"  — deterministic 62s timeline.')
base=re.sub(r"\n \*  Setting:.*?\*/", "\n *  Setting: a Gulf Coast suburb, 1,100 km (680 mi) from the impact, seen from a condo roof.\n */", base, count=1, flags=re.S)
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
world=open('impact/world.js').read()
plume=open('impact/plume.js').read().replace("const PB = { x: -1900, z: -3450 };","const PB = { x: -380, z: -3450 };").replace("A = [-1100, 720, -3250]","A = [-60, 700, -3250]")
open('impact/plume.js','w').write(plume)
a=old.index("/* ------------------------------------------------------------------ *\n *  HUD / captions")
overlay=old[a:]
# captions for the suburb
c0=overlay.index("const CAPS = ["); c1=overlay.index("];",c0)+2
caps='''const CAPS = [
  [1.0, 4.6, '66 million years ago, a 10-kilometer asteroid hit what is now Mexico.'],
  [5.0, 8.8, 'What if it happened again, 680 miles from your city?'],
  [9.3, 13.8, 'It arrives faster than you can react.'],
  [14.4, 19.2, 'A flash on the horizon. Then a column of rock vapor rising into space.'],
  [19.6, 23.0, 'Seismic waves arrive within minutes.'],
  [23.4, 27.6, 'A mega-earthquake, far stronger than any ever recorded.'],
  [28.0, 31.8, 'Houses shift off their foundations.'],
  [32.2, 36.2, 'Power lines fall. The ground tears open.'],
  [37.0, 42.4, 'Roofs and walls collapse.'],
  [42.8, 47.4, 'Broken gas and power lines start fires.'],
  [48.0, 52.8, 'Rock thrown into space falls back through the sky.'],
  [53.2, 57.5, 'Then a tsunami. Then years of darkness.'],
];'''
overlay=overlay[:c0]+caps+overlay[c1:]
out=base+world+plume+"  flushSmoke();\n}\n\n"+overlay
open('impact/main.js','w').write(out)
print(len(out))

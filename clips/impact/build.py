import re
s=open('sanandreas/main.js').read()
def rep(a,b,cnt=1):
    global s
    assert a in s, a[:80]
    s=s.replace(a,b,cnt)
rep('"What if the San Andreas Fault ruptured?"  — deterministic 62s timeline.','"What if the dinosaur-killing asteroid hit today?"  — deterministic 62s timeline.')
s=re.sub(r"\n \*  Setting:.*?\*/", "\n *  Setting: a rooftop over a palm-lined boulevard in a Gulf Coast city, 1,100 km (680 mi) from the impact site.\n */", s, count=1, flags=re.S)
a=s.index("function hAt(x, z) {"); b=s.index("}\n",a)+2
s=s[:a]+"function hAt(x, z) {\n  return smooth((Math.hypot(x * 0.75, z + 110) - 110) / 160) * fbm(x * 0.02, z * 0.02) * 2;\n}\n"+s[b:]
s=re.sub(r"\{ // far foothills.*?m\.position\.set\(x, -10, -1500 - R\(\) \* 400\); scene\.add\(m\);\n  \}\n\}\n","",s,flags=re.S)
assert "far foothills" not in s
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
a=s.index("const SKY_H = "); b=s.index("const CAM0")
s=s[:a]+"""const SKY_H = [[0, 0xe9dcc4], [14, 0xe9dcc4], [18, 0xcdb08f], [26, 0xb59673], [34, 0xb0603c], [40, 0xd4452a], [46, 0xe5502a]];
const SKY_T = [[0, 0x4f8fd8], [14, 0x4f8fd8], [18, 0x6f86a0], [26, 0x7a6a62], [34, 0x6a3a34], [40, 0x4a1c18], [46, 0x3a1412]];
"""+s[b:]
rep("kfc(t, [[0, 0xffe4b8], [30, 0xe8b890], [40, 0xff9a5a], [46, 0xff8a48]], sun.color);","kfc(t, [[0, 0xffe4b8], [30, 0xe8b890], [40, 0xff7a46], [46, 0xff5a30]], sun.color);")
rep("  skyMat.uniforms.sunAmt.value =","  skyMat.uniforms.cloudAmt.value = kf(t, [[0, 0.9], [26, 0.6], [40, 0.35]]); skyMat.uniforms.time.value = t;\n  skyMat.uniforms.sunAmt.value =")
rep("const ca = 1 - smooth((t - 16) / 6);","const ca = 1 - smooth((t - 30) / 8);")
rep("const smokeMat = new THREE.MeshBasicMaterial({ map: puffTex, transparent: true, depthWrite: false });","const smokeMat = new THREE.MeshBasicMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: false });")
rep("[[0, 17], [6, 14], [12, 13], [15, 20], [16.5, 28],","[[0, 20], [6, 22], [12, 23], [15, 24], [16.5, 28],")
rep("function update(t) {\n  pc = 0;","let curT = 0;\nfunction update(t) {\n  pc = 0;\n  const Tm = curT;")
impact = open('impact/plume.js').read()
a=s.index("  flushSmoke();\n\n  hazeLayers")
s=s[:a]+impact+s[a:]
rep("const cloudsLA =","""const EJ_N = 320;
const EJ = Array.from({ length: EJ_N }, (_, i) => ({ x: -1800 + hash2(i, 41) * 3200, y: 260 + hash2(i, 42) * 760, z: -700 - hash2(i, 43) * 3000, ph: hash2(i, 44) }));
const ejecta = pointsLayer(EJ_N * 6, 24, 0xff9a50, () => 0); ejecta.pts.material.blending = THREE.AdditiveBlending; ejecta.pts.material.fog = false;
const cloudsLA =""")
def cut(startkey, endkey):
    global s
    a=s.index(startkey); a=s.rindex("/*", 0, a); b=s.index(endkey); b=s.rindex("/*", 0, b)
    s=s[:a]+s[b:]
cut(" *  California map", " *  HUD / captions")
rep("  drawMap(T);\n","")
rep("  const skip3D = T > 58.9 || (T >= 9.3 && T < 18.6 && fi % 3 !== 0) || (T >= 52.2 && T < 58.9 && fi % 2 !== 0);","  const skip3D = T > 58.9;")
rep("    update(warp(Tj));","    curT = Tj; update(warp(Tj));")
s=s.replace("window.dbg = { scene, camera, renderer, sun, composer, bloom, warp, smoke, hazeLayers, debMesh, shardMesh, palmFronds, palmTrunks, people, cars, buildings, towers, fwySegs };","window.dbg = { scene, camera, renderer, composer, warp };")
a=s.index("const BEATS = ["); b=s.index("function updateOverlay(T) {")
s=s[:a]+open('impact/beats.js').read()+s[b:]
a=s.index("  // phone alerts"); b=s.index("  end.style.opacity")
s=s[:a]+"  const fl = T >= 14 && T < 15.6 ? Math.exp(-(T - 14) * 2.6) : 0; flash.style.opacity = fl;\n"+s[b:]
s=s.replace("const alertEl = document.getElementById('alert');\nconst aTitle = alertEl.querySelector('.t'), aBody = alertEl.querySelector('.b');\n","const flash = document.getElementById('flash');\n")
assert "mapCanvas" not in s and "drawMap" not in s
open('impact/main.js','w').write(s)
h=open('sanandreas/index.html').read()
h=h.replace("What if the San Andreas Fault ruptured?","What if the dinosaur-killing asteroid hit today?")
h=re.sub(r'  <canvas id="map"></canvas>\n','  <div id="flash"></div>\n',h)
h=re.sub(r'  <div id="alert">.*?</div></div>\n','',h,flags=re.S)
h=h.replace("It's not a question of if.","It happened once before.").replace("It's a question of when.","It ended the age of the dinosaurs.")
h=h.replace("Chance of a magnitude 6.7+ earthquake in California within 30 years<br>about 9 in 10 (USGS UCERF3)","About 75% of species died out<br>No known asteroid this size threatens Earth in the next century (NASA)")
h=h.replace("  #vignette {","  #flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }\n  #vignette {")
open('impact/index.html','w').write(h)
print('built', len(s))

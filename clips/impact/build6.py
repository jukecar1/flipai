import re
src=open('impact/build5.py').read()
# reuse build5 pieces but patch head/tail/captions with real files (no nested quoting)
def patch_head(head):
    def hrep(a,b):
        nonlocal head
        assert a in head, a[:70]
        head=head.replace(a,b,1)
    hrep("const old = buildings.filter((b) => b.brick && b.z < 0 && b.z > -300 && b.h < 80);\n  for (let i = 0; i < 9; i++) SHEDS.push(old[Math.floor(hash2(i, 91) * old.length)]);","for (const b of buildings) if (b.z < 40 && b.z > -420) SHEDS.push(b);")
    hrep("const SHARDS_N = 520, shards = [];","const SHARDS_N = 1100, shards = [];")
    hrep("pool = buildings.filter((b) => b.z < 20 && b.z > -240);","pool = buildings.filter((b) => b.z < 40 && b.z > -420);")
    hrep("const CHUNK_N = SHEDS.length * 26, chunks = [];","const CHUNK_N = SHEDS.length * 12, chunks = [];")
    hrep("for (let k = 0; k < 26; k++) chunks.push({","for (let k = 0; k < 12; k++) chunks.push({")
    hrep("m.position.set((r() - 0.5) * 360, h / 2, -900 - r() * 700); scene.add(m); }","m.position.set((r() - 0.5) * 360, h / 2, -900 - r() * 700); scene.add(m); FARTOW.push({ m, h, seed: r() }); }")
    hrep("const buildings = [];","const buildings = [];\nconst FARTOW = [];")
    return head
def patch_tail(tail):
    def trep(a,b):
        nonlocal tail
        assert a in tail, a[:70]
        tail=tail.replace(a,b,1)
    trep("const T_IMP = 14.4, T_FR0 = 16.0, V_FRONT = 36, Z_FAR = -520;","const T_IMP = 14.4, T_FR0 = 17.0, V_FRONT = 75, Z_FAR = -520;")
    trep("const EJ_N = 1;",open('impact/snip_rub_decl.js').read()+"const EJ_N = 1;")
    a=tail.index("  let nb = 0;"); b=tail.index("  /* vehicles: brake at the flash")
    tail=tail[:a]+open('impact/snip_bld_loop.js').read()+tail[b:]
    return tail
# monkeypatch: wrap file reads used by build5
import builtins
_open=builtins.open
class R:
    pass
def fake_open(path,*a,**k):
    f=_open(path,*a,**k)
    if path=='impact/world5_head.js':
        t=patch_head(f.read()); f.close()
        import io; return io.StringIO(t)
    if path=='impact/world5_tail.js':
        t=patch_tail(f.read()); f.close()
        import io; return io.StringIO(t)
    return f
builtins.open=fake_open
src=src.replace("[16.5, 21.0, 'Heat first. Everything flammable ignites at once.'],\n  [21.6, 26.8, 'Then the shock front tears down the avenue.'],\n  [27.4, 30.6, 'Nothing inside the fireball survives.'],","[15.6, 19.0, 'Heat first. Everything flammable ignites at once.'],\n  [19.6, 24.0, 'Then the shock front tears down the avenue.'],\n  [24.8, 30.2, 'Nothing inside the fireball survives.'],")
exec(compile(src,'build5_patched','exec'))

"""Arte DEFINITIVA do jogo: redesenha o tileset e os personagens com mais detalhe.

Roda depois de gen_placeholder_assets.py (que continua gerando mapas, objetos e o
manifesto). Mantém o tamanho e a ordem dos quadros descritos no manifesto, então o
código do jogo não muda. O tileset ganha uma segunda metade (variações de chão,
tapete com borda, rodapé das paredes e frente das mesas) e os mapas passam a usá-las.
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from art_lib import ROOT, hsh, mix, ramp  # noqa: E402
import art_people  # noqa: E402
import art_decor  # noqa: E402
import art_prologo  # noqa: E402
import art_logo  # noqa: E402
import art_visual  # noqa: E402
import art_mapa  # noqa: E402
import art_icones32  # noqa: E402
import art_bolsa  # noqa: E402

# ---------------------------------------------------------------- tileset 8x4

TS = Image.new("RGBA", (16 * 8, 16 * 4), (0, 0, 0, 0))


def tile(ix, fn):
    ox, oy = (ix % 8) * 16, (ix // 8) * 16
    for y in range(16):
        for x in range(16):
            c = fn(x, y)
            if c:
                TS.putpixel((ox + x, oy + y), tuple(c[:3]) + (255,))


STONE = ramp((70, 66, 92))       # lajotas do castelo
STONE_L = ramp((76, 72, 98))
MORTAR = (40, 36, 56)


def flagstone(seed, base=STONE, cracks=False, moss=False):
    """Lajotas grandes (2 por fileira), borda clara em cima, sombra embaixo e pouco ruído."""
    cut_top = 6 + (seed * 5) % 5
    cut_bot = 2 + (seed * 3) % 5

    def f(x, y):
        if y in (7, 15):
            return mix(MORTAR, base[1], 0.35)
        cx = cut_top if y < 7 else cut_bot
        if x == cx:
            return mix(MORTAR, base[1], 0.35)
        top = 0 if y < 7 else 8
        bottom = 6 if y < 7 else 14
        stone_id = (y < 7) * 2 + (x < cx)
        tone = base[2] if (seed + stone_id) % 3 else mix(base[2], base[1], 0.45)
        if y == top:
            tone = mix(tone, base[3], 0.35)
        elif y == bottom:
            tone = mix(tone, base[1], 0.5)
        n = hsh(x, y, seed)
        if n < 0.04:
            tone = mix(tone, base[1], 0.6)
        elif n > 0.97:
            tone = mix(tone, base[3], 0.4)
        if cracks and y < 7 and x > cx and (x - cx) == y + 2 and 1 < y < 6:
            tone = base[1]
        if cracks and y < 7 and x > cx and (x - cx) == y + 3 and y == 3:
            tone = base[1]
        if moss and y >= 12 and y != 15 and hsh(x, y, seed + 9) < 0.35:
            tone = (70, 96, 74) if hsh(x, y, 3) < 0.5 else (84, 112, 82)
        return tone

    return f


# tapete vermelho com borda dourada, em 9 partes que se encaixam
CARPET = ramp((150, 34, 52))
GOLD = ramp((214, 166, 66))


def carpet_part(top, bottom, left, right):
    def f(x, y):
        edge = [(top, y), (bottom, 15 - y), (left, x), (right, 15 - x)]
        for on, d in edge:
            if on and d == 0:
                return CARPET[0]
            if on and d in (1, 2):
                return GOLD[2] if d == 1 else GOLD[1]
            if on and d == 3:
                return CARPET[0]
        # losangos do padrão central
        px, py = x % 16, y % 16
        dist = abs(px - 7.5) + abs(py - 7.5)
        if dist < 1.5:
            return GOLD[1]
        if 4.6 < dist < 5.6:
            return CARPET[1]
        return CARPET[2] if hsh(x, y, 4) > 0.12 else mix(CARPET[2], CARPET[1], 0.5)

    return f


WALL = ramp((84, 70, 100))
WALL_TOP = ramp((34, 28, 50))


def wall_top(x, y):
    # topo da parede: pedra escura vista de cima
    c = WALL_TOP[2] if hsh(x // 2, y // 2, 11) > 0.25 else mix(WALL_TOP[2], WALL_TOP[1], 0.6)
    if hsh(x, y, 12) > 0.96:
        c = WALL_TOP[3]
    return c


def bricks(x, y, seed, base=WALL):
    row = y // 5
    off = 6 if row % 2 else 0
    if y % 5 == 4:
        return mix(base[0], base[1], 0.4)
    if (x + off) % 12 == 11:
        return mix(base[0], base[1], 0.4)
    brick = ((x + off) // 12 + row * 3 + seed) % 4
    c = base[2] if brick % 2 else mix(base[2], base[1], 0.35)
    if y % 5 == 0:
        c = mix(c, base[3], 0.4)
    if hsh(x, y, seed) < 0.05:
        c = mix(c, base[1], 0.6)
    return c


def wall_face(x, y):
    return bricks(x, y, 1)


def wall_low(x, y):
    # metade de baixo da parede: tijolos + rodapé de madeira e sombra no chão
    if y >= 13:
        return [(92, 60, 38), (70, 44, 28), (40, 30, 40)][y - 13]
    if y == 12:
        return (124, 84, 52)
    return mix(bricks(x, y, 2), WALL[0], 0.12 + y * 0.012)


WOOD = ramp((128, 84, 48))


def table_top(x, y):
    # tampo da mesa: tábuas compridas no sentido da mesa, com veios
    if x % 8 == 7:
        return WOOD[0]
    c = WOOD[2] if (x // 8) % 2 else mix(WOOD[2], WOOD[3], 0.25)
    if x % 8 == 0:
        c = mix(c, WOOD[3], 0.5)
    if x % 8 == 4 and (y // 3) % 3 == 0:
        c = mix(c, WOOD[1], 0.35)  # veio
    return c


def table_front(x, y):
    # borda da frente da mesa (com pés e sombra)
    if y < 3:
        return table_top(x, y)
    if y == 3:
        return WOOD[3]
    if y < 8:
        return WOOD[1] if y < 7 else WOOD[0]
    if x in (1, 2, 13, 14) and y < 14:
        return WOOD[1] if x in (1, 13) else WOOD[0]
    return None  # o chão aparece por baixo (camada do chão)


def window(x, y):
    frame = ramp((60, 50, 74))
    if x in (0, 15) or y in (0, 15):
        return frame[1]
    if x in (1, 14) or y == 1:
        return frame[3]
    if y == 14:
        return (150, 140, 160)  # parapeito
    if x in (7, 8) or y == 7:
        return frame[2]
    # céu com lua no vidro
    sky = mix((40, 56, 120), (90, 110, 190), y / 14)
    if (x - 4) ** 2 + (y - 4) ** 2 <= 4 and x < 7 and y < 7:
        return (240, 236, 200)
    if hsh(x, y, 21) > 0.93:
        return (220, 226, 255)
    if x + y in (10, 11) or x + y in (20, 21):
        return mix(sky, (200, 210, 250), 0.45)  # reflexo
    return sky


HOUSE = {
    "coragem": ((176, 40, 44), "leao"),
    "inteligencia": ((44, 86, 170), "coruja"),
    "astucia": ((40, 134, 82), "cobra"),
    "lealdade": ((206, 160, 44), "texugo"),
}
# brasões em 6x6, desenhados com "#" (cor clara) [FICÇÃO: símbolos simples das casas]
CREST = {
    "leao": ["..##..", ".####.", "##.#.#", "######", ".#..#.", ".#..#."],
    "coruja": ["#....#", "######", "#.##.#", "######", ".####.", "..##.."],
    "cobra": ["..###.", ".#....", "..##..", "....#.", ".###..", "#....."],
    "texugo": ["#....#", "##..##", "#.##.#", "######", ".#..#.", "..##.."],
}


def banner(house):
    color, crest = HOUSE[house]
    r = ramp(color)

    def f(x, y):
        if x < 3 or x > 12:
            return wall_face(x, y)
        if y == 0:
            return GOLD[3] if x % 2 else GOLD[2]
        tip = 15 - y
        if y > 11 and abs(x - 7.5) > tip * 1.6:
            return wall_face(x, y)
        if x in (3, 12):
            return r[1]
        if x == 4:
            return r[3]
        cx, cy = x - 5, y - 4
        if 0 <= cx < 6 and 0 <= cy < 6 and CREST[crest][cy][cx] == "#":
            return GOLD[3]
        if y == 11 or (y > 11 and abs(x - 7.5) > tip * 1.6 - 1):
            return GOLD[2]
        return r[2] if (x + y) % 5 else mix(r[2], r[1], 0.4)

    return f


WOODF = ramp((140, 96, 58))


def wood_floor(seed):
    def f(x, y):
        plank = y // 4
        joint_col = mix(WOODF[0], WOODF[1], 0.55)
        if y % 4 == 3:
            return joint_col
        joint = (plank * 7 + seed * 5) % 16
        if x == joint:
            return joint_col
        c = WOODF[2] if (plank + seed) % 3 else mix(WOODF[2], WOODF[1], 0.3)
        if y % 4 == 0:
            c = mix(c, WOODF[3], 0.3)
        if hsh(x // 3, y, 30 + seed) < 0.12:
            c = mix(c, WOODF[1], 0.45)
        return c

    return f


GRASS = ramp((76, 128, 64))


def grass(seed, flowers=False):
    def f(x, y):
        n = hsh(x, y, 40 + seed)
        c = GRASS[2]
        if n < 0.18:
            c = GRASS[1]
        elif n > 0.82:
            c = GRASS[3]
        # folhinhas em "v"
        if (x * 5 + y * 3 + seed) % 13 == 0:
            c = GRASS[3]
            if y < 15:
                pass
        if flowers:
            for fx, fy, col in ((3, 4, (240, 220, 120)), (11, 9, (230, 140, 190)), (6, 12, (240, 240, 250))):
                if (x, y) == (fx, fy):
                    return col
                if abs(x - fx) + abs(y - fy) == 1:
                    return mix(col, GRASS[2], 0.4)
        return c

    return f


def starry(seed):
    def f(x, y):
        n = hsh(x, y, 60 + seed)
        base = mix((22, 24, 58), (34, 30, 78), (x + y + seed * 5) / 40)
        if n > 0.985:
            return (240, 240, 255)
        if n > 0.96:
            return (130, 140, 210)
        if seed == 1 and (x, y) in ((8, 6), (7, 6), (9, 6), (8, 5), (8, 7)):
            return (250, 230, 160) if (x, y) == (8, 6) else (170, 160, 130)
        return base

    return f


PAINT = ramp((60, 46, 88))


def paint_floor(seed):
    # chão dentro dos quadros: pinceladas largas e suaves
    def f(x, y):
        stroke = (x + y * 2 + seed * 3) // 4
        c = PAINT[2] if stroke % 3 else mix(PAINT[2], PAINT[1], 0.5)
        if (x - y + seed * 4) % 16 == 0:
            c = mix(c, PAINT[3], 0.35)
        if hsh(x, y, 70 + seed) > 0.985:
            c = (126, 86, 156)
        return c

    return f


tile(0, flagstone(0))
tile(1, flagstone(1, STONE_L))
tile(2, carpet_part(False, False, False, False))
tile(3, wall_top)
tile(4, wall_face)
tile(5, table_top)
tile(6, window)
tile(7, banner("coragem"))
tile(8, banner("inteligencia"))
tile(9, banner("astucia"))
tile(10, banner("lealdade"))
tile(11, wood_floor(0))
tile(12, grass(0))
tile(13, starry(0))
tile(14, paint_floor(0))
# 15 fica vazio
# segunda metade: variações e peças de encaixe
tile(16, flagstone(2))
tile(17, flagstone(3, cracks=True))
tile(18, flagstone(4, moss=True))
tile(19, wall_low)
for i, (t, b, l, r) in enumerate([(1, 0, 1, 0), (1, 0, 0, 0), (1, 0, 0, 1), (0, 0, 1, 0), (0, 0, 0, 1), (0, 1, 1, 0), (0, 1, 0, 0), (0, 1, 0, 1)]):
    tile(20 + i, carpet_part(t, b, l, r))
tile(28, table_front)
tile(29, wood_floor(1))
tile(30, grass(1, flowers=True))
tile(31, starry(1))
TS.save(os.path.join(ROOT, "tilesets", "castelo.png"))
# a segunda variação de pintura reaproveita a posição 15 (antes vazia)
tile(15, paint_floor(1))
TS.save(os.path.join(ROOT, "tilesets", "castelo.png"))

# ---------------------------------------------------------------- mapas usam as variações

G = {name: i + 1 for i, name in enumerate([
    "floor", "floor2", "carpet", "top", "face", "wood", "win", "b1", "b2", "b3", "b4",
    "woodf", "grass", "stars", "paint", "paint2", "floor3", "crack", "moss", "low",
    "c_tl", "c_t", "c_tr", "c_l", "c_r", "c_bl", "c_b", "c_br", "tfront", "woodf2", "flowers", "stars2"])}
COLLIDES = [G[k] for k in ("top", "face", "wood", "win", "b1", "b2", "b3", "b4", "low", "tfront")]


def vary_map(path):
    with open(path) as fh:
        m = json.load(fh)
    w, h = m["width"], m["height"]
    chao = next(l for l in m["layers"] if l["name"] == "chao")["data"]
    par = next(l for l in m["layers"] if l["name"] == "paredes")["data"]
    seed = sum(map(ord, os.path.basename(path)))

    def get(d, x, y):
        return d[y * w + x] if 0 <= x < w and 0 <= y < h else 0

    out_c, out_p = chao[:], par[:]
    for y in range(h):
        for x in range(w):
            i = y * w + x
            t = chao[i]
            n = hsh(x, y, seed)
            if t in (G["floor"], G["floor2"]):
                out_c[i] = G["floor"] if n < 0.6 else G["floor3"] if n < 0.88 else G["floor2"] if n < 0.94 else G["crack"] if n < 0.975 else G["moss"]
            elif t == G["carpet"]:
                up, dn = get(chao, x, y - 1) == G["carpet"], get(chao, x, y + 1) == G["carpet"]
                lf, rt = get(chao, x - 1, y) == G["carpet"], get(chao, x + 1, y) == G["carpet"]
                key = {(0, 1, 0, 1): "c_tl", (0, 1, 1, 1): "c_t", (0, 1, 1, 0): "c_tr", (1, 1, 0, 1): "c_l",
                       (1, 1, 1, 0): "c_r", (1, 0, 0, 1): "c_bl", (1, 0, 1, 1): "c_b", (1, 0, 1, 0): "c_br"}.get((up, dn, lf, rt))
                if key:
                    out_c[i] = G[key]
            elif t == G["woodf"] and n > 0.6:
                out_c[i] = G["woodf2"]
            elif t == G["grass"] and n > 0.92:
                out_c[i] = G["flowers"]
            elif t == G["stars"] and n > 0.9:
                out_c[i] = G["stars2"]
            elif t == G["paint"] and n > 0.5:
                out_c[i] = G["paint2"]
            p = par[i]
            # parede: a fileira de baixo ganha rodapé
            if p == G["face"] and get(par, x, y + 1) not in (G["face"], G["win"], G["top"]) and y > 1:
                out_p[i] = G["low"]
            if p == G["wood"] and get(par, x, y + 1) != G["wood"]:
                out_p[i] = G["tfront"]
    next(l for l in m["layers"] if l["name"] == "chao")["data"] = out_c
    next(l for l in m["layers"] if l["name"] == "paredes")["data"] = out_p
    ts = m["tilesets"][0]
    ts.update(imagewidth=128, imageheight=64, tilecount=32)
    ts["tiles"] = [{"id": t - 1, "properties": [{"name": "collides", "type": "bool", "value": True}]} for t in COLLIDES]
    with open(path, "w") as fh:
        json.dump(m, fh)


for name in sorted(os.listdir(os.path.join(ROOT, "maps"))):
    if name.endswith(".tmj"):
        vary_map(os.path.join(ROOT, "maps", name))

# ---------------------------------------------------------------- personagens

new_icons = art_people.render_all()
art_visual.render_visual()
decor = art_decor.render_decor(HOUSE, CREST) + art_prologo.render_prologo() + art_logo.render_logo() + art_mapa.render_mapa() + art_bolsa.render_bolsa()

# ---------------------------------------------------------------- manifesto

mpath = os.path.join(ROOT, "manifest.json")
with open(mpath) as fh:
    manifest = json.load(fh)
manifest["status"] = "definitivo"
manifest["spritesheets"]["ui.icones"]["frameNames"].update(new_icons)
for key, url, w, h in (("prop.bau", "sprites/bau.png", 16, 16), ("prop.alcapao", "sprites/alcapao.png", 16, 16),
                       ("prop.escada-porao", "sprites/escada-porao.png", 16, 16), *decor):
    manifest["spritesheets"][key] = {"url": url, "frameWidth": w, "frameHeight": h, "animations": {}}
with open(mpath, "w") as fh:
    json.dump(manifest, fh, indent=2, ensure_ascii=False)
# ícones grandes: desenhados depois do manifesto, porque seguem a ordem final de ui.icones
for key, url, w, h in art_icones32.render_icones32():
    manifest["spritesheets"][key] = {"url": url, "frameWidth": w, "frameHeight": h, "animations": {},
                                     "frameNames": manifest["spritesheets"]["ui.icones"]["frameNames"]}
with open(mpath, "w") as fh:
    json.dump(manifest, fh, indent=2, ensure_ascii=False)
print("arte definitiva gerada")

"""Gera a arte PROVISÓRIA do jogo (pixel art 16x16 / 16x24) e o mapa de teste.

A arte definitiva substitui estes PNGs mantendo o mesmo tamanho de quadro e
a mesma ordem de quadros descrita em public/assets/manifest.json.
"""
import json
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")

# Paleta provisória (32 cores máx.) — tons de castelo à noite
P = {
    ".": None,
    "k": (24, 20, 37),      # contorno
    "p": (92, 60, 146),     # manto roxo
    "P": (128, 92, 190),    # manto claro
    "q": (58, 38, 98),      # manto sombra
    "s": (244, 200, 160),   # pele
    "S": (214, 160, 124),   # pele sombra
    "h": (60, 44, 32),      # cabelo
    "y": (250, 214, 92),    # dourado (estrela do chapéu, chama)
    "Y": (255, 246, 190),   # brilho
    "o": (236, 126, 48),    # laranja chama
    "b": (70, 54, 40),      # bota
    "w": (240, 236, 230),   # branco olho / vela
    "W": (200, 194, 186),   # vela sombra
}

def draw(img, ox, oy, rows):
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            col = P[c]
            if col:
                img.putpixel((ox + x, oy + y), col + (255,))

# ---------- Aprendiz (16x24): linhas = baixo, cima, lado; colunas = idle0, idle1, walk0..3
HAT = [
    "......kk........",
    ".....kpPk.......",
    ".....kppPk......",
    "....kppypPk.....",
    "....kpppppk.....",
    "..kkqqqqqqqkk...",
    ".kqqqqqqqqqqqk..",
]
FACE_DOWN = [
    "...khhhhhhhhk...",
    "...khsssssshk...",
    "...ksswsswssk...",
    "...ksskssksSk...",
    "....kssssssk....",
]
FACE_UP = [
    "...khhhhhhhhk...",
    "...khhhhhhhhk...",
    "...khhhhhhhhk...",
    "...khhhhhhhhk...",
    "....khhhhhhk....",
]
FACE_SIDE = [
    "....khhhhhhhk...",
    "....khhhsssssk..",
    "....khhhsswsk...",
    "....khhsssksk...",
    ".....kssssssk...",
]
BODY = [
    "....kppppppk....",
    "...kpPppppPpk...",
    "..kspPppppPpsk..",
    "..kSkPppppPkSk..",
    "...kpPppppPpk...",
    "...kqpppppppk...",
    "...kqqppppqqk...",
]
LEGS = {
    "stand": ["....kbk..kbk....", "....kkk..kkk...."],
    "l":     ["...kbk....kbk...", "...kkk.....kk..."],
    "r":     ["....kbk..kbk....", "....kk...kkk...."],
    "mid":   ["....kbk..kbk....", "....kkk..kkk...."],
}
BODY_SIDE = [
    ".....kppppk.....",
    "....kpPpppPk....",
    "....kpPppsPk....",
    "....kpPppSPk....",
    "....kpPpppPk....",
    "....kqppppqk....",
    "....kqqppqqk....",
]
LEGS_SIDE = {
    "stand": [".....kbkbk......", ".....kkkkk......"],
    "l":     ["....kbk..kbk....", "....kk....kk...."],
    "r":     [".....kbkbk......", "......kkk......."],
    "mid":   ["...kbk....kbk...", "...kk......kk..."],
}

def frame(face, body, legs, bob):
    rows = [""] * 0
    pad = ["................"] * (1 - bob)
    rows = pad + HAT + face + body + legs
    rows = rows + ["................"] * (24 - len(rows))
    return rows[:24]

sheet = Image.new("RGBA", (16 * 6, 24 * 3), (0, 0, 0, 0))
dirs = [(FACE_DOWN, BODY, LEGS), (FACE_UP, BODY, LEGS), (FACE_SIDE, BODY_SIDE, LEGS_SIDE)]
for r, (face, body, legs) in enumerate(dirs):
    seq = [("stand", 0), ("stand", 1), ("l", 0), ("mid", 1), ("r", 0), ("mid", 1)]
    for c, (leg, bob) in enumerate(seq):
        draw(sheet, c * 16, r * 24, frame(face, body, legs[leg], bob))
sheet.save(os.path.join(ROOT, "sprites", "aprendiz.png"))

# ---------- Vela animada (16x16, 4 quadros)
CANDLE_BASE = [
    "......kwwk......", "......kwWk......", "......kwWk......", "......kwWk......",
    ".....kkwWkk.....", "....kyyyyyyk....", ".....kkkkkk.....",
]
FLAMES = [
    ["................", ".......k........", "......kyk.......", "......kYyk......", ".....koYyk......", "......koyk......", ".......kk......."],
    ["................", "........k.......", ".......kyk......", "......kyYk......", "......kyYok.....", "......kyok......", ".......kk......."],
    [".......k........", "......kyk.......", "......kYyk......", ".....kyYyk......", ".....koYok......", "......koyk......", ".......kk......."],
    ["................", ".......k........", "......kyk.......", "......kyYk......", "......kyYok.....", "......koyk......", ".......kk......."],
]
candle = Image.new("RGBA", (64, 16), (0, 0, 0, 0))
for i, fl in enumerate(FLAMES):
    rows = ["................"] * 2 + fl + CANDLE_BASE
    draw(candle, i * 16, 0, rows[:16])
candle.save(os.path.join(ROOT, "sprites", "vela.png"))

# ---------- Tileset (16x16, 8 colunas)
import random
random.seed(7)
TS = Image.new("RGBA", (16 * 8, 16 * 2), (0, 0, 0, 0))
def tile(ix, fn):
    ox, oy = (ix % 8) * 16, (ix // 8) * 16
    for y in range(16):
        for x in range(16):
            c = fn(x, y)
            if c:
                TS.putpixel((ox + x, oy + y), c + (255,))

def stone(x, y, base=(74, 70, 92), dark=(56, 52, 72), light=(92, 88, 112)):
    if y % 8 == 0 or (x + (8 if (y // 8) % 2 else 0)) % 16 == 0:
        return dark
    if (x * 7 + y * 13) % 23 == 0:
        return light
    return base

def carpet(x, y):
    if x in (0, 15) or y in (0, 15):
        return (180, 140, 60)
    if x in (1, 14) or y in (1, 14):
        return (120, 26, 40)
    return (150, 34, 50) if (x + y) % 6 else (170, 46, 62)

def wall_top(x, y):
    if y >= 13:
        return (40, 34, 56)
    return (30, 26, 44) if (x + y) % 5 else (36, 30, 52)

def wall_face(x, y):
    if y % 5 == 0 or (x + (6 if (y // 5) % 2 else 0)) % 12 == 0:
        return (44, 36, 56)
    return (88, 74, 98) if y < 13 else (64, 52, 76)

def wood(x, y):
    if y % 4 == 0:
        return (66, 42, 26)
    return (120, 80, 46) if (x + y * 3) % 9 else (100, 66, 38)

def window(x, y):
    if x in (0, 15) or y in (0, 15) or x == 7 or x == 8 or y == 7:
        return (44, 36, 56)
    return (60, 80, 150) if (x + y) % 7 else (210, 220, 250)

def banner(color):
    def f(x, y):
        if x < 3 or x > 12:
            return wall_face(x, y)
        if y == 0:
            return (180, 140, 60)
        if y > 12 and abs(x - 7.5) > (15 - y) * 1.5:
            return wall_face(x, y)
        return color
    return f

tile(0, stone)
tile(1, lambda x, y: stone(x, y, (82, 78, 100), (60, 56, 78), (100, 96, 122)))
tile(2, carpet)
tile(3, wall_top)
tile(4, wall_face)
tile(5, wood)
tile(6, window)
tile(7, banner((168, 40, 40)))      # Coragem (cores provisórias)
tile(8, banner((40, 90, 168)))      # Inteligência
tile(9, banner((40, 140, 80)))      # Astúcia
tile(10, banner((200, 160, 40)))    # Lealdade
TS.save(os.path.join(ROOT, "tilesets", "castelo.png"))

# ---------- Fagulha de magia (8x8, 4 quadros) e caldeirão (16x16, 3 quadros)
SPARK = [
    ["........", "........", "...y....", "..yYy...", "...y....", "........", "........", "........"],
    ["........", "...y....", "...Y....", ".yYYYy..", "...Y....", "...y....", "........", "........"],
    ["...y....", "........", ".y.Y.y..", "..YYY...", ".y.Y.y..", "........", "...y....", "........"],
    ["........", ".y...y..", "........", "...y....", "........", ".y...y..", "........", "........"],
]
spark = Image.new("RGBA", (32, 8), (0, 0, 0, 0))
for i, rows in enumerate(SPARK):
    draw(spark, i * 8, 0, rows)
spark.save(os.path.join(ROOT, "fx", "fagulha.png"))

P.update({"g": (90, 200, 110), "G": (170, 240, 160), "m": (52, 50, 64), "M": (86, 84, 100)})
POT = [
    "................", "................", "................",
    "................", "................",
    "...kkkkkkkkkk...", "..kgGgggggGggk..", "..kMkkkkkkkkMk..",
    ".kmMmmmmmmmmMmk.", ".kmMmmmmmmmmMmk.", ".kmmmmmmmmmmmmk.",
    "..kmmmmmmmmmmk..", "...kkkkkkkkkk...", "...kok....kok...", "...kyk....kyk...", "....k......k....",
]
BUBBLES = [["......G.........", ".........g......", "....g....G......"],
           ["........G.......", "....G...........", "......g...g....."],
           [".........g......", ".....g...G......", "....G.....g....."]]
pot = Image.new("RGBA", (48, 16), (0, 0, 0, 0))
for i, b in enumerate(BUBBLES):
    rows = POT[:2] + b + POT[5:]
    draw(pot, i * 16, 0, rows)
pot.save(os.path.join(ROOT, "sprites", "caldeirao.png"))

# ---------- Mapas Tiled (.tmj), gerados a partir de uma descrição de cada sala
FLOOR, FLOOR2, CARPET, TOP, FACE, WOOD, WIN, B1, B2, B3, B4 = [i + 1 for i in range(11)]
COLLIDES = (TOP, FACE, WOOD, WIN, B1, B2, B3, B4)


def build_room(name, title, w, h, doors, tables=(), carpet=None, windows=(), banners=(), props=(), spawns=()):
    """doors: (lado N/S/L/O, posição, mapa destino, chegada no destino, nome desta chegada)."""
    floor, walls = [], []
    for y in range(h):
        for x in range(w):
            f = FLOOR2 if (x * 3 + y * 5) % 11 == 0 else FLOOR
            if carpet and carpet[0] <= x <= carpet[2] and carpet[1] <= y <= carpet[3]:
                f = CARPET
            wl = 0
            if y == 0 or x == 0 or x == w - 1 or y == h - 1:
                wl = TOP
            elif y in (1, 2):
                wl = FACE
                if y == 1 and x in windows:
                    wl = WIN
                if y == 1 and x in [b[0] for b in banners]:
                    wl = dict(banners)[x]
            for (tx, ty, tw, th) in tables:
                if tx <= x < tx + tw and ty <= y < ty + th:
                    wl = WOOD
            floor.append(f)
            walls.append(wl)

    objects, oid = [], 1

    def obj(**kw):
        nonlocal oid
        kw.setdefault("width", 0)
        kw.setdefault("height", 0)
        kw["id"] = oid
        oid += 1
        objects.append(kw)

    for side, pos, target, target_spawn, arrive in doors:
        # abertura de 2 tiles na parede; a zona da porta fica na borda externa
        if side in "NS":
            ys = (0, 1, 2) if side == "N" else (h - 1,)
            for yy in ys:
                for xx in (pos, pos + 1):
                    walls[yy * w + xx] = 0
            zy = 0 if side == "N" else h - 1
            obj(name=f"porta-{arrive}", type="door", x=pos * 16, y=zy * 16, width=32, height=16,
                properties=[{"name": "target", "type": "string", "value": target},
                            {"name": "spawn", "type": "string", "value": target_spawn}])
            sy = 4 if side == "N" else h - 2
            obj(name=arrive, type="spawn", x=(pos + 1) * 16, y=sy * 16, point=True,
                properties=[{"name": "facing", "type": "string", "value": "down" if side == "N" else "up"}])
        else:
            xx = w - 1 if side == "L" else 0
            for yy in (pos, pos + 1):
                walls[yy * w + xx] = 0
            obj(name=f"porta-{arrive}", type="door", x=xx * 16, y=pos * 16, width=16, height=32,
                properties=[{"name": "target", "type": "string", "value": target},
                            {"name": "spawn", "type": "string", "value": target_spawn}])
            sx = w - 3 if side == "L" else 2
            obj(name=arrive, type="spawn", x=sx * 16 + 8, y=(pos + 1) * 16 + 8, point=True,
                properties=[{"name": "facing", "type": "string", "value": "side"}])

    for (sname, sx, sy) in spawns:
        obj(name=sname, type="spawn", x=sx * 16 + 8, y=sy * 16, point=True,
            properties=[{"name": "facing", "type": "string", "value": "up"}])
    for (sprite, px, py) in props:
        obj(name=sprite, type="prop", x=px * 16 + 8, y=py * 16 + 16, point=True,
            properties=[{"name": "sprite", "type": "string", "value": sprite}])

    tmj = {
        "type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal",
        "renderorder": "right-down", "width": w, "height": h, "tilewidth": 16, "tileheight": 16,
        "infinite": False, "nextlayerid": 4, "nextobjectid": oid,
        "properties": [{"name": "nome", "type": "string", "value": title}],
        "layers": [
            {"id": 1, "name": "chao", "type": "tilelayer", "width": w, "height": h, "x": 0, "y": 0, "opacity": 1, "visible": True, "data": floor},
            {"id": 2, "name": "paredes", "type": "tilelayer", "width": w, "height": h, "x": 0, "y": 0, "opacity": 1, "visible": True, "data": walls},
            {"id": 3, "name": "objetos", "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0, "opacity": 1, "visible": True, "objects": objects},
        ],
        "tilesets": [{
            "firstgid": 1, "name": "castelo", "image": "../tilesets/castelo.png",
            "imagewidth": 128, "imageheight": 32, "tilewidth": 16, "tileheight": 16,
            "tilecount": 16, "columns": 8, "margin": 0, "spacing": 0,
            "tiles": [{"id": t - 1, "properties": [{"name": "collides", "type": "bool", "value": True}]} for t in COLLIDES],
        }],
    }
    with open(os.path.join(ROOT, "maps", f"{name}.tmj"), "w") as fh:
        json.dump(tmj, fh)


# Recepção: onde o jogador chega; porta norte para o Grande Salão
build_room("recepcao", "Recepção", 20, 13,
           doors=[("N", 9, "map.grande-salao", "da-recepcao", "do-salao")],
           carpet=(9, 3, 10, 11), windows=(4, 15),
           props=[("prop.vela", 3, 4), ("prop.vela", 16, 4)],
           spawns=[("inicio", 9, 10)])

# Grande Salão: quatro mesas das casas; sul = Recepção, leste = Cozinha
build_room("grande-salao", "Grande Salão", 40, 24,
           doors=[("S", 19, "map.recepcao", "do-salao", "da-recepcao"),
                  ("L", 11, "map.cozinha", "do-salao", "da-cozinha")],
           tables=[(6, 8, 3, 8), (12, 8, 3, 8), (25, 8, 3, 8), (31, 8, 3, 8)],
           carpet=(17, 4, 22, 22), windows=(6, 14, 25, 33),
           banners=[(9, B1), (12, B2), (27, B3), (30, B4)],
           props=[("prop.vela", 5, 4), ("prop.vela", 34, 4), ("prop.vela", 5, 19),
                  ("prop.vela", 34, 19), ("prop.vela", 16, 5), ("prop.vela", 23, 5)])

# Cozinha bruxa: caldeirões; oeste = Grande Salão
build_room("cozinha", "Cozinha Bruxa", 22, 14,
           doors=[("O", 6, "map.grande-salao", "da-cozinha", "do-salao")],
           tables=[(8, 6, 6, 2)], windows=(5, 16),
           props=[("prop.caldeirao", 5, 9), ("prop.caldeirao", 16, 9), ("prop.caldeirao", 16, 4),
                  ("prop.vela", 10, 5), ("prop.vela", 12, 5)])

print("assets provisórios gerados em", os.path.abspath(ROOT))

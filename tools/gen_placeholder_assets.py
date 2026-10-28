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

# ---------- Mapa Tiled (.tmj) do Grande Salão (provisório)
W, H = 40, 24
FLOOR, FLOOR2, CARPET, TOP, FACE, WOOD, WIN, B1, B2, B3, B4 = [i + 1 for i in range(11)]
floor = []
walls = []
for y in range(H):
    for x in range(W):
        f = FLOOR2 if (x * 3 + y * 5) % 11 == 0 else FLOOR
        if 17 <= x <= 22 and 4 <= y <= H - 2:
            f = CARPET
        w = 0
        if y == 0 or x == 0 or x == W - 1 or y == H - 1:
            w = TOP
        elif y in (1, 2):
            w = FACE
            if y == 1 and x in (6, 14, 25, 33):
                w = WIN
            if y == 1 and x in (9, 12, 27, 30):
                w = [B1, B2, B3, B4][[9, 12, 27, 30].index(x)]
        # mesas das casas (madeira, colidem)
        for mx in (6, 12, 26, 32):
            if mx <= x <= mx + 2 and 8 <= y <= 15:
                w = WOOD
        if (x, y) in ((19, 23), (20, 23)):
            w = 0  # porta sul
        floor.append(f)
        walls.append(w)

objects = [
    {"id": 1, "name": "spawn", "type": "spawn", "x": 20 * 16, "y": 20 * 16, "width": 0, "height": 0, "point": True},
]
oid = 2
for cx, cy in [(5, 4), (34, 4), (5, 19), (34, 19), (16, 5), (23, 5)]:
    objects.append({"id": oid, "name": "vela", "type": "prop",
                    "properties": [{"name": "sprite", "type": "string", "value": "prop.vela"}],
                    "x": cx * 16 + 8, "y": cy * 16 + 8, "width": 0, "height": 0, "point": True})
    oid += 1

tmj = {
    "type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal",
    "renderorder": "right-down", "width": W, "height": H, "tilewidth": 16, "tileheight": 16,
    "infinite": False, "nextlayerid": 4, "nextobjectid": oid,
    "layers": [
        {"id": 1, "name": "chao", "type": "tilelayer", "width": W, "height": H, "x": 0, "y": 0, "opacity": 1, "visible": True, "data": floor},
        {"id": 2, "name": "paredes", "type": "tilelayer", "width": W, "height": H, "x": 0, "y": 0, "opacity": 1, "visible": True, "data": walls},
        {"id": 3, "name": "objetos", "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0, "opacity": 1, "visible": True, "objects": objects},
    ],
    "tilesets": [{
        "firstgid": 1, "name": "castelo", "image": "../tilesets/castelo.png",
        "imagewidth": 128, "imageheight": 32, "tilewidth": 16, "tileheight": 16,
        "tilecount": 16, "columns": 8, "margin": 0, "spacing": 0,
        "tiles": [{"id": t - 1, "properties": [{"name": "collides", "type": "bool", "value": True}]}
                  for t in (TOP, FACE, WOOD, WIN, B1, B2, B3, B4)],
    }],
}
with open(os.path.join(ROOT, "maps", "grande-salao.tmj"), "w") as fh:
    json.dump(tmj, fh)
print("assets provisórios gerados em", os.path.abspath(ROOT))

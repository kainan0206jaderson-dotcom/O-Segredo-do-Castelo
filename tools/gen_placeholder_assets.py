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
                img.putpixel((ox + x, oy + y), col if len(col) == 4 else col + (255,))

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

# ---------- Trinco, o duende da recepção (16x16: parado 0-1, falando 2-3)
P.update({"e": (110, 170, 70), "E": (80, 130, 52), "r": (170, 40, 50), "R": (210, 70, 70), "n": (150, 150, 160)})
GOB_HEAD = [
    "................",
    "......kkkk......",
    ".k...keeeek...k.",
    ".kek.keeeek.kek.",
    "..keekeeeekeek..",
    "...keeweeweek...",
    "....kekeekek....",
    "....keeeeeek....",
]
GOB_MOUTH = {"c": "....keEEEEek....", "o": "....keEkkEek...."}
GOB_BODY = [
    "...kkrrRRrrkk...",
    "..keekrRRrkeek..",
    "..kEkrrrrrrkyk..",
    "...krrrrrrrkyk..",
    "....kbk..kbk....",
    "....kkk..kkk....",
]
gob = Image.new("RGBA", (64, 16), (0, 0, 0, 0))
for i, (m, bob) in enumerate([("c", 0), ("c", 1), ("o", 0), ("c", 0)]):
    rows = ["................"] * bob + GOB_HEAD + [GOB_MOUTH[m]] + GOB_BODY
    rows = (rows + ["................"] * 16)[:16]
    draw(gob, i * 16, 0, rows)
gob.save(os.path.join(ROOT, "sprites", "trinco.png"))

# ---------- Dom Moldura, o quadro vivo (32x32: parado, piscando, falando)
P.update({"f": (190, 150, 60), "F": (230, 196, 100), "d": (40, 60, 70), "D": (60, 90, 100), "z": (200, 200, 210)})
def painting(eyes, mouth):
    rows = ["kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
            "kFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFk",
            "kFffffffffffffffffffffffffffffFk"]
    inner = []
    for y in range(26):
        line = "kFf"
        for x in range(26):
            c = "d" if (x + y) % 9 else "D"
            line += c
        line += "fFk"
        inner.append(list(line))
    def put(x, y, c):
        inner[y][x + 3] = c
    # rosto com bigode e peruca
    for y in range(5, 22):
        for x in range(7, 19):
            if (x - 12.5) ** 2 / 36 + (y - 13) ** 2 / 72 < 1:
                put(x, y, "s")
    for y in range(3, 12):
        for x in range(4, 22):
            if (x - 12.5) ** 2 / 90 + (y - 9) ** 2 / 30 < 1 and not ((x - 12.5) ** 2 / 36 + (y - 13) ** 2 / 72 < 1):
                put(x, y, "z")
    for x in range(7, 19):
        put(x, 22, "z") if 9 <= x <= 16 else None
    if eyes == "open":
        for ex in (10, 15):
            put(ex, 11, "k"); put(ex, 10, "w")
    else:
        for ex in (10, 15):
            put(ex, 11, "k"); put(ex - 1, 11, "k")
    for x in range(9, 17):
        put(x, 15, "h")
    if mouth == "open":
        put(12, 17, "k"); put(13, 17, "k"); put(12, 18, "r"); put(13, 18, "r")
    else:
        put(12, 17, "S"); put(13, 17, "S")
    # corpo com casaca
    for y in range(22, 26):
        for x in range(3, 23):
            put(x, y, "r" if abs(x - 12.5) > 2 else "w")
    rows += ["".join(r) for r in inner]
    rows += ["kFffffffffffffffffffffffffffffFk"[:32]]
    rows = rows[:31] + ["kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk"]
    return rows
pt = Image.new("RGBA", (96, 32), (0, 0, 0, 0))
for i, (e, m) in enumerate([("open", "closed"), ("closed", "closed"), ("open", "open")]):
    draw(pt, i * 32, 0, painting(e, m))
pt.save(os.path.join(ROOT, "sprites", "dom-moldura.png"))

# ---------- Balão "!" de interação (8x10, 2 quadros)
ALERT = [["..kkkk..", ".kwwwwk.", ".kwkkwk.", ".kwkkwk.", ".kwkkwk.", ".kwwwwk.", ".kwkkwk.", ".kwwwwk.", "..kwwk..", "...kk..."],
         ["........", "..kkkk..", ".kwwwwk.", ".kwkkwk.", ".kwkkwk.", ".kwkkwk.", ".kwwwwk.", ".kwkkwk.", ".kwwwwk.", "..kwwk.."]]
al = Image.new("RGBA", (16, 10), (0, 0, 0, 0))
for i, rows in enumerate(ALERT):
    draw(al, i * 8, 0, rows)
al.save(os.path.join(ROOT, "ui", "alerta.png"))

# ---------- Vela apagada (quadro 4 da folha da vela)
candle5 = Image.new("RGBA", (80, 16), (0, 0, 0, 0))
candle5.paste(candle, (0, 0))
draw(candle5, 64, 0, ["................"] * 7 + ["........k.......", ".......k........"] + CANDLE_BASE[:7])
candle5.save(os.path.join(ROOT, "sprites", "vela.png"))

# ---------- Ícones de itens (16x16), desenhados por formas simples
def icon(fn):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = {}
    fn(px)
    # contorno automático em volta de tudo que foi pintado
    for (x, y) in list(px):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in px and 0 <= q[0] < 16 and 0 <= q[1] < 16:
                px[q] = P["k"]
    for (x, y), c in px.items():
        if 0 <= x < 16 and 0 <= y < 16:
            im.putpixel((x, y), c + (255,))
    return im

def disc(px, cx, cy, rx, ry, c, c2=None):
    for y in range(16):
        for x in range(16):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1:
                px[(x, y)] = c2 if (c2 and d > 0.55 and x > cx) else c

def rect(px, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[(x, y)] = c

ORANGE, ORANGE_D = (236, 126, 48), (190, 90, 30)
def i_abobora(px):
    disc(px, 7.5, 9.5, 6, 4.5, ORANGE, ORANGE_D)
    for y in range(6, 14):
        px[(7, y)] = ORANGE_D
    rect(px, 7, 3, 8, 5, (90, 140, 60))
def i_gelo(px):
    rect(px, 4, 8, 11, 13, (150, 160, 180)); rect(px, 5, 9, 10, 12, (110, 120, 140))
    for (x, y) in ((5, 6), (7, 5), (9, 6), (6, 3), (10, 4), (8, 2)):
        px[(x, y)] = (230, 236, 246)
def i_suco(px):
    rect(px, 6, 2, 9, 4, (200, 194, 186)); rect(px, 5, 5, 10, 13, (200, 80, 200)); rect(px, 6, 6, 7, 11, (240, 150, 240))
def i_cacau(px):
    disc(px, 7.5, 8.5, 3.5, 5.5, (120, 70, 40), (90, 50, 28))
    for y in range(4, 13, 2):
        px[(7, y)] = (160, 100, 60)
def i_mandragora(px):
    rect(px, 7, 8, 8, 13, (200, 170, 120))
    for (x, y) in ((5, 4), (6, 5), (7, 6), (10, 4), (9, 5), (8, 6), (7, 3), (8, 3), (6, 2), (9, 2)):
        px[(x, y)] = (90, 180, 80)
    px[(6, 13)] = (200, 170, 120); px[(9, 13)] = (200, 170, 120)
def i_drink(px):
    rect(px, 5, 7, 10, 13, (90, 200, 220)); rect(px, 5, 7, 10, 8, (240, 120, 200)); rect(px, 6, 9, 7, 12, (170, 240, 250))
    for (x, y) in ((6, 5), (8, 4), (9, 2), (7, 3), (10, 5)):
        px[(x, y)] = (236, 236, 246)
def i_cerveja(px):
    rect(px, 4, 5, 10, 13, ORANGE); rect(px, 4, 4, 10, 5, (250, 240, 220)); rect(px, 11, 7, 12, 11, (180, 150, 110)); rect(px, 5, 7, 6, 12, (250, 170, 90))
def i_sobremesa(px):
    rect(px, 4, 9, 11, 13, (120, 80, 50)); rect(px, 4, 9, 11, 10, (160, 110, 70))
    for (x, y) in ((6, 6), (7, 7), (8, 7), (9, 6), (7, 5), (8, 4), (10, 5), (5, 5)):
        px[(x, y)] = (90, 180, 80)
def i_varinha(px):
    for i in range(10):
        px[(3 + i, 12 - i)] = (120, 80, 46)
    px[(13, 2)] = P["y"]; px[(12, 2)] = P["Y"]; px[(13, 3)] = P["Y"]
def i_grimorio(px):
    rect(px, 3, 3, 12, 13, (92, 60, 146)); rect(px, 4, 4, 4, 12, (58, 38, 98)); rect(px, 7, 6, 10, 9, P["y"])
def i_lumen(px):
    for (x, y) in ((7, 2), (8, 2), (7, 13), (8, 13), (2, 7), (2, 8), (13, 7), (13, 8)):
        px[(x, y)] = P["y"]
    disc(px, 7.5, 7.5, 3.5, 3.5, P["Y"])
def i_fogos(px):
    for (x, y, c) in ((4, 4, (240, 90, 90)), (11, 3, (90, 200, 240)), (7, 8, P["y"]), (3, 11, (130, 230, 120)), (12, 11, (240, 120, 230)), (8, 2, (255, 255, 255)), (6, 12, (255, 200, 90))):
        disc(px, x, y, 1.3, 1.3, c)
def i_bolsa(px):
    disc(px, 7.5, 9.5, 5.5, 4.5, (150, 100, 60), (120, 78, 46)); rect(px, 6, 3, 9, 5, (120, 78, 46)); rect(px, 5, 6, 10, 6, P["y"])
def i_tranca(px):
    rect(px, 4, 7, 11, 13, (150, 150, 160)); rect(px, 5, 3, 6, 7, (150, 150, 160)); rect(px, 9, 3, 10, 7, (150, 150, 160)); rect(px, 6, 2, 9, 3, (150, 150, 160)); rect(px, 7, 9, 8, 11, P["k"])

ICONS = {"abobora": i_abobora, "gelo-seco": i_gelo, "suco-colorido": i_suco, "cacau": i_cacau,
         "folha-mandragora": i_mandragora, "drink-fumegante": i_drink, "cerveja-abobora": i_cerveja,
         "sobremesa-mandragora": i_sobremesa, "varinha": i_varinha, "grimorio": i_grimorio,
         "lumen": i_lumen, "fogos-bruxos": i_fogos, "bolsa": i_bolsa, "bloqueado": i_tranca}
icons = Image.new("RGBA", (16 * len(ICONS), 16), (0, 0, 0, 0))
for i, (name, fn) in enumerate(ICONS.items()):
    icons.alpha_composite(icon(fn), (i * 16, 0))
icons.save(os.path.join(ROOT, "ui", "icones.png"))
# a ordem dos ícones fica registrada no manifest.json (spritesheets."ui.icones".frameNames)
print("ícones:", {name: i for i, name in enumerate(ICONS)})

# ---------- Dona Brasa, a fada cozinheira (16x24: parada 0-1, falando 2-3)
P.update({"a": (180, 230, 250), "A": (230, 250, 255), "c": (240, 240, 236), "l": (240, 140, 60)})
def fada(bob, mouth):
    rows = [
        "......kkkk......",
        ".....kccccck....",
        "....kcccccck....",
        "....kkkkkkkk....",
        "....khllllhk....",
        "...khsssssshk...",
        "...ksswsswssk...",
        "...ksskssksSk...",
        "....kss" + ("kk" if mouth else "SS") + "ssk....",
        "..a..kssssk..a..",
        ".aAa.kccccck.aAa",
        ".aAAkcpccccpkAAa",
        "..aAkcccccccka..",
        "...kscccccccsk..",
        "....kcccccck....",
        "....kpppppk.....",
        "....kpppppk.....",
        "....kqppppk.....",
        ".....kbkbk......",
        ".....kkkkk......",
    ]
    pad = ["................"] * (3 + bob)
    return (pad + rows + ["................"] * 4)[:24]
fd = Image.new("RGBA", (64, 24), (0, 0, 0, 0))
for i, (b, m) in enumerate([(0, False), (1, False), (0, True), (0, False)]):
    draw(fd, i * 16, 0, fada(b, m))
fd.save(os.path.join(ROOT, "sprites", "dona-brasa.png"))

# ---------- Quadro de desafios (16x24) e baú/estante de itens coletáveis no chão (brilho 8x8)
BOARD = [
    "................", "................",
    "..kkkkkkkkkkkk..", "..kbbbbbbbbbbk..", "..kbwwwwwwwwbk..", "..kbwkkkkkkwbk..",
    "..kbwwwwwwwwbk..", "..kbwkkkkwwwbk..", "..kbwwwwwwwwbk..", "..kbwkkkkkkwbk..",
    "..kbwwwwwwwwbk..", "..kbwwwwyywwbk..", "..kbwwwwyywwbk..", "..kbbbbbbbbbbk..",
    "..kkkkkkkkkkkk..", "......kbbk......", "......kbbk......", "......kbbk......",
    "......kbbk......", "......kbbk......", ".....kbbbbk.....", "....kkkkkkkk....",
    "................", "................",
]
bd = Image.new("RGBA", (16, 24), (0, 0, 0, 0))
draw(bd, 0, 0, BOARD)
bd.save(os.path.join(ROOT, "sprites", "quadro-desafios.png"))

# ---------- Fogos bruxos (16x16, 5 quadros)
COLS = [(240, 90, 90), (90, 200, 240), (250, 214, 92), (130, 230, 120), (240, 120, 230)]
fw = Image.new("RGBA", (80, 16), (0, 0, 0, 0))
import math
for f in range(5):
    r = 1 + f * 1.6
    for j in range(10):
        a = j * math.pi / 5
        x, y = int(7.5 + math.cos(a) * r), int(7.5 + math.sin(a) * r)
        if 0 <= x < 16 and 0 <= y < 16 and f < 4:
            fw.putpixel((f * 16 + x, y), COLS[j % 5] + (255,))
    if f == 4:
        for j in range(6):
            a = j * math.pi / 3
            x, y = int(7.5 + math.cos(a) * 7), int(7.5 + math.sin(a) * 7)
            fw.putpixel((f * 16 + x, y), COLS[j % 5] + (160,))
fw.save(os.path.join(ROOT, "fx", "fogos.png"))

# ====================================================================
# ATO 1 (etapa 4): capas, Arquimedes, Morgana, Fuxico, Dama do Chá,
# sombrinhas, objetos de enigma, efeitos e ícones novos.
# ====================================================================
MANIFEST_PATH = os.path.join(ROOT, "manifest.json")
MANIFEST = json.load(open(MANIFEST_PATH, encoding="utf-8"))
SHEETS = MANIFEST["spritesheets"]

def sheet_entry(key, url, fw, fh, anims=None, **extra):
    """Registra (ou atualiza) uma folha no manifest.json."""
    SHEETS[key] = {"url": url, "frameWidth": fw, "frameHeight": fh, "animations": anims or {}, **extra}

def strip(frames, w, h):
    im = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, rows in enumerate(frames):
        draw(im, i * w, 0, rows)
    return im

def pad_rows(rows, w, h, top=0):
    rows = ["." * w] * top + [r.ljust(w, ".")[:w] for r in rows]
    return (rows + ["." * w] * h)[:h]

IDLE_TALK = {"idle": {"frames": [0, 1], "frameRate": 2, "repeat": -1}, "talk": {"frames": [2, 3], "frameRate": 8, "repeat": -1}}

# ---------- Capas: a mesma folha do aprendiz com o manto recolorido
ROBE = {"p": P["p"], "P": P["P"], "q": P["q"]}
CAPAS = {
    "coragem": ((168, 40, 40), (214, 76, 70), (110, 24, 30)),
    "inteligencia": ((44, 90, 170), (86, 134, 214), (26, 54, 112)),
    "astucia": ((40, 140, 80), (86, 190, 116), (24, 90, 50)),
    "lealdade": ((196, 150, 40), (240, 204, 92), (138, 100, 24)),
    "estrelada": ((40, 44, 112), (72, 78, 168), (24, 26, 72)),
}
base = Image.open(os.path.join(ROOT, "sprites", "aprendiz.png")).convert("RGBA")
player_anims = SHEETS["player.aprendiz"]["animations"]
for name, (c, cl, cs) in CAPAS.items():
    im = base.copy()
    swap = {ROBE["p"]: c, ROBE["P"]: cl, ROBE["q"]: cs}
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in swap:
                nc = swap[(r, g, b)]
                if name == "estrelada" and (r, g, b) == ROBE["p"] and (x * 7 + y * 3) % 11 == 0:
                    nc = P["Y"]
                px[x, y] = nc + (255,)
    im.save(os.path.join(ROOT, "sprites", f"aprendiz-{name}.png"))
    sheet_entry(f"player.aprendiz-{name}", f"sprites/aprendiz-{name}.png", 16, 24, player_anims)

# ---------- Prof. Arquimedes [KAINAN: estilo mago, chapéu e sobretudo; detalhes FICÇÃO]
P.update({
    "3": (42, 46, 100), "4": (70, 78, 146), "5": (214, 170, 60),
    "6": (98, 40, 54), "7": (138, 64, 76), "8": (62, 24, 36),
    "x": (190, 190, 200), "X": (230, 230, 236), "j": (120, 170, 220),
    "v": (120, 30, 54), "V": (160, 52, 80), "u": (78, 18, 36),  # vinho, usado por outras artes
})
def arquimedes(bob, mouth):
    rows = [
        "..........kk....",
        ".........k4k....",
        "........k43k....",
        ".......k433k....",
        "......k4333k....",
        ".....k43333k....",
        "....k5555555k...",
        "..kk333333333kk.",
        "...kxsssssssxk..",
        "...kxjjsssjjxk..",
        "...kxssssssSxk..",
        "...kx" + ("XXXkXXX" if mouth else "XXXXXXX") + "xk..",
        "...k77XXXXX77k..",
        "..k776XXXXX677k.",
        "..k7s6XXXXX6s7k.",
        "..k7k66XXX66k7k.",
        "..k7k665X566k7k.",
        "...k76656667k...",
        "...k76665667k...",
        "...k88666688k...",
        "...k88888888k...",
        "....kbk..kbk....",
        "....kkk..kkk....",
    ]
    return pad_rows(rows, 16, 24, 1 - bob)
strip([arquimedes(0, False), arquimedes(1, False), arquimedes(0, True), arquimedes(0, False)], 16, 24).save(os.path.join(ROOT, "sprites", "arquimedes.png"))
sheet_entry("npc.arquimedes", "sprites/arquimedes.png", 16, 24, IDLE_TALK)

# Profa. Amélia [KAINAN, pela foto]: cabelo grisalho volumoso, capa creme com barra prateada,
# vestido de cetim branco, luvas brancas, leque de cartas. Fantasma: translúcida, sem pés, flutua.
P.update({
    "Z": (170, 172, 188, 235), "U": (222, 222, 234, 235), "B": (238, 224, 218, 225),
    "C": (238, 230, 206, 215), "H": (198, 190, 168, 210), "J": (196, 206, 226, 230),
    "K": (248, 248, 255, 200), "N": (206, 216, 238, 180), "O": (255, 255, 255, 255),
    "Q": (200, 228, 248, 120), "T": (200, 228, 248, 60), "9": (196, 150, 160, 230),
    "0": (120, 170, 214, 210),  # contorno azulado de fantasma
})
def amelia(bob, mouth, sway):
    tail = [
        ["..0CKKKKKKKKC0..", "..0HNKKKKKKNH0..", "...0NKKNKKKN0...", "....QNKNKNKQ....", ".....QTQTQT.....", "......T.T.T....."],
        ["..0CKKKKKKKKC0..", "..0HKNKKKKNKH0..", "...0NKKKNKKN0...", "....QKNKNKNQ....", ".....TQTQTQ.....", ".....T.T.T......"],
    ][sway]
    rows = [
        ".....0ZUUZ0.....",
        "....0ZUUZUU0....",
        "...0UZUZZUZU0...",
        "...0ZUBBBBUZ0...",
        "..0UZBkBBkBZU0..",
        "..0ZUBBBBBBUZ0..",
        "..0UZB" + ("BkkB" if mouth else "B99B") + "BZU0..",
        "..0ZUZBBBBZUZ0..",
        "..0UZCCJJCCZU0..",
        "..0ZCCHKKHCCZ0..",
        "..0CHOOOKKKHCJ0.",
        ".0CCOOOOKKKHCJ0.",
        ".0CHBOOKKKKHCJ0.",
        ".0JCHKKKKKKHCC0.",
        ".0JCHKKNKKKHCC0.",
        "..0JCKKNKKKCCJ0.",
    ] + tail
    return pad_rows(rows, 16, 24, 1 + bob)
AMELIA_ANIMS = {"idle": {"frames": [0, 1, 2, 1], "frameRate": 3, "repeat": -1}, "talk": {"frames": [3, 4], "frameRate": 8, "repeat": -1}}
strip([amelia(0, False, 0), amelia(1, False, 1), amelia(2, False, 0), amelia(1, True, 1), amelia(1, False, 0)], 16, 24).save(os.path.join(ROOT, "sprites", "amelia.png"))
sheet_entry("npc.amelia", "sprites/amelia.png", 16, 24, AMELIA_ANIMS, ghost=True)

# Prof. Aristóteles [KAINAN, pelo vídeo]: jovem, cabelo cacheado escuro, barba curta, gorro azul redondo,
# túnica cinza com gola bordada branca, livros azuis no braço. Professor de Criaturas Espectrais.
P.update({
    "C": (36, 64, 140), "H": (64, 100, 186), "J": (40, 28, 22), "N": (150, 104, 74), "O": (122, 82, 58),
    "Q": (140, 146, 156), "T": (176, 182, 192), "U": (98, 104, 116), "Z": (244, 244, 248), "B": (44, 82, 160), "9": (70, 116, 200),
})
def aristoteles(bob, mouth):
    rows = [
        "....kkkkkkk.....",
        "...kHHCHCCCk....",
        "..kHCCCCCCCCk...",
        "..kCCCCCCCCCk...",
        ".kJJkkkkkkkJJk..",
        ".kJJNNNNNNNJJk..",
        ".kJNkNNNkNNNJk..",
        ".kJNNNNNNNONJk..",
        "..kJJ" + ("NkkN" if mouth else "JJJJ") + "JJJk...",
        "...kJJJJJJJk....",
        "...kZZQZQZZk....",
        "..kTQZTTTZQTk...",
        "..kTQQTZTQQUk...",
        "..kTQQTZTBBBk...",
        "..kTNQTZTB99Bk..",
        "..kUQQTZTBBBBk..",
        "..kUQQTZTQkkk...",
        "...kQQTTTQQk....",
        "...kUQQQQQUk....",
        "...kUUQQQUUk....",
        "....kbk.kbk.....",
        "....kkk.kkk.....",
    ]
    return pad_rows(rows, 16, 24, 2 - bob)
strip([aristoteles(0, False), aristoteles(1, False), aristoteles(0, True), aristoteles(0, False)], 16, 24).save(os.path.join(ROOT, "sprites", "aristoteles.png"))
sheet_entry("npc.aristoteles", "sprites/aristoteles.png", 16, 24, IDLE_TALK)

# ---------- Morgana Cinzel [FICÇÃO]: capuz cinza-fuligem, mecha prateada, olhos violeta
P.update({"i": (52, 48, 60), "I": (84, 80, 96), "t": (30, 28, 38), "l": (200, 200, 214), "m": (170, 110, 220), "n": (232, 220, 226)})
def morgana(bob, mouth):
    rows = [
        "......kkkk......",
        ".....kiiiik.....",
        "....kiIiiiik....",
        "...kiIilnnik....",
        "...kiIlnnnnik...",
        "...kiIlmnnmik...",
        "...kiInnnnnik...",
        "...kiiknn" + ("kk" if mouth else "nn") + "kik...",
        "...kiiiknnkiik..",
        "..kiIiiiiiiiIik.",
        "..kiIitttttiIik.",
        "..knIittmttiInk.",
        "..kkIitttttiIkk.",
        "...kIitttttiik..",
        "...kIiitttiiik..",
        "...kIiiiiiiiik..",
        "..kiIiiiiiiiIik.",
        "..kiiiiiiiiiiik.",
        "..kkkkkkkkkkkkk.",
    ]
    return pad_rows(rows, 16, 24, 4 - bob)
strip([morgana(0, False), morgana(1, False), morgana(0, True), morgana(1, False)], 16, 24).save(os.path.join(ROOT, "sprites", "morgana.png"))
sheet_entry("npc.morgana", "sprites/morgana.png", 16, 24, IDLE_TALK)

# ---------- Elfo Fuxico [FICÇÃO]: orelhas compridas, vassoura (16x16)
P.update({"1": (150, 200, 120), "2": (110, 160, 90), "L": (90, 180, 80), "M": (60, 130, 60)})
def fuxico(bob, mouth):
    rows = [
        "............y...",
        "kk....kkkk..b...",
        "k1k..k1111k.b...",
        ".k1kk1w11w1kb...",
        "..k11k111k11bk..",
        "...k11" + ("kk" if mouth else "22") + "111kb...",
        "....kk1111k.b...",
        "...kwwwwwwkkb...",
        "...kwWwwWwkbk...",
        "....kwwwwk.yyk..",
        "....kbk.kbkyyyk.",
        "....kkk.kkk.kk..",
    ]
    return pad_rows(rows, 16, 16, 4 - bob)
strip([fuxico(0, False), fuxico(1, False), fuxico(0, True), fuxico(1, False)], 16, 16).save(os.path.join(ROOT, "sprites", "fuxico.png"))
sheet_entry("npc.fuxico", "sprites/fuxico.png", 16, 16, IDLE_TALK)

# ---------- Dama do Chá [FICÇÃO]: quadro vivo 32x32 com dama de coque e xícara
def dama(eyes, mouth):
    W, H = 32, 32
    g = [["k" if x in (0, W - 1) or y in (0, H - 1) else ("F" if x in (1, W - 2) or y in (1, H - 2) else ("f" if x in (2, W - 3) or y in (2, H - 3) else ("D" if (x + y) % 9 == 0 else "d"))) for x in range(W)] for y in range(H)]
    def put(x, y, c):
        if 3 <= x < W - 3 and 3 <= y < H - 3:
            g[y][x] = c
    for y in range(6, 20):
        for x in range(10, 22):
            if (x - 15.5) ** 2 / 25 + (y - 13) ** 2 / 42 < 1:
                put(x, y, "s")
    for y in range(3, 10):
        for x in range(11, 21):
            if (x - 15.5) ** 2 / 20 + (y - 6) ** 2 / 9 < 1:
                put(x, y, "h")
    put(15, 3, "h"); put(16, 3, "h")
    for ex in (13, 18):
        put(ex, 12, "k" if eyes else "S")
    put(15, 16, "r" if mouth else "S"); put(16, 16, "r" if mouth else "S")
    for y in range(20, 29):
        for x in range(6, 26):
            put(x, y, "V" if abs(x - 15.5) > 3 else "w")
    for (x, y) in ((22, 21), (23, 21), (24, 21), (22, 22), (23, 22), (24, 22), (25, 21)):
        put(x, y, "w")
    put(23, 20, "x"); put(22, 19, "x")
    return ["".join(r) for r in g]
strip([dama(True, False), dama(False, False), dama(True, True)], 32, 32).save(os.path.join(ROOT, "sprites", "dama-cha.png"))
sheet_entry("npc.dama-cha", "sprites/dama-cha.png", 32, 32,
            {"idle": {"frames": [0, 0, 0, 0, 1], "frameRate": 3, "repeat": -1}, "talk": {"frames": [0, 2], "frameRate": 6, "repeat": -1}})

# ---------- Sombrinha de fuligem [FICÇÃO] (16x16): 4 quadros de balanço + 1 de susto (atingida)
def sombra(shift, hit=False):
    body = "k" if not hit else "w"
    rows = []
    for y in range(16):
        line = ""
        for x in range(16):
            cx, cy = 7.5 + (shift if y < 8 else -shift) * 0.5, 9
            d = ((x - cx) / 6) ** 2 + ((y - cy) / (6 - abs(shift) * 0.3)) ** 2
            wisp = y > 12 and (x + shift) % 3 == 0 and d < 1.5
            line += (body if (d < 1 or wisp) else ".")
        rows.append(list(line))
    for ex in (5, 9):
        rows[8][ex + shift // 2] = "W" if hit else "w"
        rows[9][ex + shift // 2] = "k" if hit else "m"
    return ["".join(r) for r in rows]
strip([sombra(0), sombra(1), sombra(0), sombra(-1), sombra(0, True)], 16, 16).save(os.path.join(ROOT, "sprites", "sombrinha.png"))
sheet_entry("npc.sombrinha", "sprites/sombrinha.png", 16, 16,
            {"idle": {"frames": [0, 1, 2, 3], "frameRate": 6, "repeat": -1}, "hit": {"frames": [4], "frameRate": 1, "repeat": 0}})

# ---------- Objetos de enigma
P.update({"z1": (120, 116, 132), "z2": (150, 146, 162), "z3": (90, 86, 104)})
STATUE = pad_rows([
    "......kkkk......",
    ".....k%%%%k.....",
    "....k%#%%#%k....",
    "....k%%kk%%k....",
    ".....k%%%%k.....",
    "....kk%%%%kk....",
    "...k%%%%%%%%k...",
    "..k%%#%%%%#%%k..",
    "..k%%#%%%%#%%k..",
    "..k$k%%%%%%k$k..",
    "...kk%%%%%%kk...",
    "....k%%%%%%k....",
    "....k%%%%%%k....",
    "...k$$$$$$$$k...",
    "..k$$$$$$$$$$k..",
    "..kkkkkkkkkkkk..",
], 16, 24, 8)
P.update({"%": P["z2"], "#": P["z1"], "$": P["z3"]})
strip([STATUE], 16, 24).save(os.path.join(ROOT, "sprites", "estatua.png"))
sheet_entry("prop.estatua", "sprites/estatua.png", 16, 24)

def plate(on):
    c = "y" if on else "$"
    return pad_rows(["", "", "", "..kkkkkkkkkkkk..", ".k" + c * 12 + "k.", ".k" + c + "%%%%%%%%%%" + c + "k.", ".k" + c + "%" + ("Y" if on else "#") * 8 + "%" + c + "k.",
                     ".k" + c + "%%%%%%%%%%" + c + "k.", ".k" + c * 12 + "k.", "..kkkkkkkkkkkk.."], 16, 16, 2)
strip([plate(False), plate(True)], 16, 16).save(os.path.join(ROOT, "sprites", "placa.png"))
sheet_entry("prop.placa", "sprites/placa.png", 16, 16,
            {"off": {"frames": [0], "frameRate": 1, "repeat": 0}, "on": {"frames": [1], "frameRate": 1, "repeat": 0}})

def gate(open_):
    rows = []
    for y in range(16):
        line = ""
        for x in range(32):
            if open_:
                line += "k" if y < 3 and x % 4 == 1 else ("$" if y == 0 else ".")
            else:
                line += "$" if y in (0, 1, 14, 15) else ("k" if x % 4 == 1 else ("#" if x % 4 == 2 else "."))
        rows.append(line)
    return rows
strip([gate(False), gate(True)], 32, 16).save(os.path.join(ROOT, "sprites", "grade.png"))
sheet_entry("prop.grade", "sprites/grade.png", 32, 16,
            {"fechada": {"frames": [0], "frameRate": 1, "repeat": 0}, "aberta": {"frames": [1], "frameRate": 1, "repeat": 0}})

CALICE = pad_rows(["....kkkkkkkk....", "....kyYyyyyk....", "....kyYyyyyk....", ".....kyyyyk.....", "......kyyk......", ".......kk.......",
                   ".......yk.......", "......kyyk......", ".....kyyyyk.....", ".....kkkkkk....."], 16, 16, 4)
strip([CALICE], 16, 16).save(os.path.join(ROOT, "sprites", "calice.png"))
sheet_entry("prop.calice", "sprites/calice.png", 16, 16)

CAIXOTE = pad_rows(["kkkkkkkkkkkkkkkk", "kbbbbbbbbbbbbbbk", "kbkbbbbbbbbbbkbk", "kbbkbbbbbbbbkbbk", "kbbbkbbbbbbkbbbk", "kbbbbkbbbbkbbbbk",
                    "kbbbbbkbbkbbbbbk", "kbbbbbbkkbbbbbbk", "kbbbbbbkkbbbbbbk", "kbbbbbkbbkbbbbbk", "kbbbbkbbbbkbbbbk", "kbbbkbbbbbbkbbbk",
                    "kbbkbbbbbbbbkbbk", "kbkbbbbbbbbbbkbk", "kbbbbbbbbbbbbbbk", "kkkkkkkkkkkkkkkk"], 16, 16)
P.update({"b": (70, 54, 40)})
im = strip([CAIXOTE], 16, 16)
# madeira mais clara que a bota: pinta por cima
px = im.load()
for y in range(16):
    for x in range(16):
        if px[x, y][:3] == P["b"]:
            px[x, y] = (150, 104, 60, 255)
im.save(os.path.join(ROOT, "sprites", "caixote.png"))
sheet_entry("prop.caixote", "sprites/caixote.png", 16, 16)

BANDEJA = pad_rows(["", "", "", "", "", "", "", "", "", ".kkkkkkkkkkkkkk.", "kxXXXXXXXXXXXXxk", "kxxxxxxxxxxxxxxk", ".kkkkkkkkkkkkkk."], 16, 16)
strip([BANDEJA], 16, 16).save(os.path.join(ROOT, "sprites", "bandeja.png"))
sheet_entry("prop.bandeja", "sprites/bandeja.png", 16, 16)

HOUSE_COLORS = [CAPAS["coragem"][0], CAPAS["inteligencia"][0], CAPAS["astucia"][0], CAPAS["lealdade"][0]]
ped = Image.new("RGBA", (64, 24), (0, 0, 0, 0))
PED = ["....kkkkkkkk....", "...k%%%%%%%%k...", "...k%@@@@@@%k...", "...k%%%%%%%%k...", "....kk%%%%kk....", ".....k%##%k.....", ".....k%##%k.....",
       ".....k%##%k.....", ".....k%##%k.....", "....kk%%%%kk....", "...k$$$$$$$$k...", "..k$$$$$$$$$$k..", "..kkkkkkkkkkkkk."]
for i, col in enumerate(HOUSE_COLORS):
    P["@"] = col
    draw(ped, i * 16, 0, pad_rows(PED, 16, 24, 11))
del P["@"]
ped.save(os.path.join(ROOT, "sprites", "pedestal.png"))
sheet_entry("prop.pedestal", "sprites/pedestal.png", 16, 24, {}, frameNames={"coragem": 0, "inteligencia": 1, "astucia": 2, "lealdade": 3})

# escadaria (32x48) com degraus que sobem para o escuro
esc = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
for y in range(48):
    step = y // 6
    for x in range(32):
        if x in (0, 31):
            c = (30, 26, 44)
        elif y % 6 == 0:
            c = (40, 34, 56)
        else:
            shade = 40 + step * 10
            c = (shade + 14, shade + 10, shade + 26)
        esc.putpixel((x, y), c + (255,))
esc.save(os.path.join(ROOT, "sprites", "escadaria.png"))
sheet_entry("prop.escadaria", "sprites/escadaria.png", 32, 48)

def selo(phase, broken=False):
    rows = []
    for y in range(16):
        line = ""
        for x in range(32):
            d = ((x - 15.5) / 15) ** 2 + ((y - 8) / 7) ** 2
            if broken:
                line += ("i" if (x * 5 + y * 3) % 7 == 0 and d < 1 else ".")
            elif d < 1:
                ring = abs(d - 0.7) < 0.12
                line += "l" if ring and (x + phase) % 3 else ("t" if (x + y + phase) % 5 else "i")
            else:
                line += "."
        rows.append(line)
    return rows
strip([selo(0), selo(1)], 32, 16).save(os.path.join(ROOT, "sprites", "selo.png"))
sheet_entry("prop.selo", "sprites/selo.png", 32, 16, {"idle": {"frames": [0, 1], "frameRate": 2, "repeat": -1}})
strip([selo(0, True)], 32, 16).save(os.path.join(ROOT, "sprites", "selo-quebrado.png"))
sheet_entry("prop.selo-quebrado", "sprites/selo-quebrado.png", 32, 16)

# estante de livros (16x32), vaso de mandrágora, despensa (16x24), quadrinhos de parede
BOOKCOLS = [(168, 40, 40), (44, 90, 170), (40, 140, 80), (196, 150, 40), (120, 30, 54)]
est = Image.new("RGBA", (16, 32), (0, 0, 0, 0))
for y in range(32):
    for x in range(16):
        if x in (0, 15) or y in (0, 31) or y % 8 == 7:
            c = (66, 42, 26)
        elif y % 8 == 0:
            c = (100, 66, 38)
        else:
            c = BOOKCOLS[(x // 2 + y // 8) % 5] if (x + y // 8) % 7 else (40, 34, 56)
        est.putpixel((x, y), c + (255,))
est.save(os.path.join(ROOT, "sprites", "estante.png"))
sheet_entry("prop.estante", "sprites/estante.png", 16, 32)

VASO = pad_rows(["......M..M......", "....M.MLM.M.....", ".....MLLLM......", "......LLL.......", "....kkkkkkkk....", "...kooooooook...", "....kooooook....", "....kooooook....", ".....kkkkkk....."], 16, 16, 7)
strip([VASO], 16, 16).save(os.path.join(ROOT, "sprites", "vaso.png"))
sheet_entry("prop.vaso", "sprites/vaso.png", 16, 16)

desp = Image.new("RGBA", (16, 24), (0, 0, 0, 0))
for y in range(24):
    for x in range(16):
        if x in (0, 15) or y in (0, 23) or y in (8, 16):
            c = (66, 42, 26)
        else:
            c = (100, 66, 38)
        desp.putpixel((x, y), c + (255,))
for (x0, y0, col) in ((2, 3, ORANGE), (7, 3, (150, 160, 180)), (11, 2, (200, 80, 200)), (3, 11, (120, 70, 40)), (9, 11, ORANGE), (4, 18, (90, 180, 80)), (10, 18, (230, 230, 236))):
    for y in range(y0, y0 + 4):
        for x in range(x0, x0 + 3):
            desp.putpixel((x, y), col + (255,))
desp.save(os.path.join(ROOT, "sprites", "despensa.png"))
sheet_entry("prop.despensa", "sprites/despensa.png", 16, 24)

for i, col in enumerate([(60, 110, 70), (150, 80, 50), (70, 80, 150)]):
    q = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y in range(2, 15):
        for x in range(2, 14):
            edge = x in (2, 13) or y in (2, 14)
            q.putpixel((x, y), ((190, 150, 60) if edge else (col if (x + y + i) % 4 else tuple(min(255, v + 40) for v in col))) + (255,))
    q.save(os.path.join(ROOT, "sprites", f"quadrinho-{i + 1}.png"))
    sheet_entry(f"prop.quadrinho-{i + 1}", f"sprites/quadrinho-{i + 1}.png", 16, 16)

# ---------- Fumaça (16x16, 5 quadros) para aparições e sumiços
fum = Image.new("RGBA", (80, 16), (0, 0, 0, 0))
random.seed(11)
for f in range(5):
    r = 2 + f * 1.4
    for _ in range(40 + f * 6):
        a = random.random() * 6.283
        d = random.random() * r
        x, y = int(7.5 + math.cos(a) * d), int(8 + math.sin(a) * d * 0.8 - f * 0.6)
        if 0 <= x < 16 and 0 <= y < 16:
            shade = 90 + random.randint(0, 50)
            fum.putpixel((f * 16 + x, y), (shade, shade - 6, shade + 14, 255 - f * 40))
fum.save(os.path.join(ROOT, "fx", "fumaca.png"))
sheet_entry("fx.fumaca", "fx/fumaca.png", 16, 16, {"burst": {"frames": [0, 1, 2, 3, 4], "frameRate": 10, "repeat": 0}})

# ---------- Vitais (8x8): coração cheio, vazio, energia cheia, vazia
VIT = [
    ["........", ".kk.kk..", "krRkRrk.", "krRRRrk.", ".krrrk..", "..krk...", "...k....", "........"],
    ["........", ".kk.kk..", "k..k..k.", "k.....k.", ".k...k..", "..k.k...", "...k....", "........"],
    ["........", "..kkk...", ".kjXjk..", ".kjjjk..", ".kjjjk..", ".kjjjk..", "..kkk...", "........"],
    ["........", "..kkk...", ".k...k..", ".k...k..", ".k...k..", ".k...k..", "..kkk...", "........"],
]
P.update({"r": (200, 40, 60), "R": (240, 110, 120)})
strip(VIT, 8, 8).save(os.path.join(ROOT, "ui", "vitais.png"))
sheet_entry("ui.vitais", "ui/vitais.png", 8, 8, {}, frameNames={"coracao": 0, "coracao-vazio": 1, "energia": 2, "energia-vazia": 3})

# ---------- Ícones novos (16x16), somados aos da etapa 3
def i_levitar(px):
    rect(px, 5, 4, 10, 8, (150, 104, 60))
    for (x, y) in ((4, 11), (7, 12), (10, 11), (6, 14), (9, 14)):
        px[(x, y)] = P["Y"]
def i_passo(px):
    for (x, y, l) in ((3, 4, 8), (2, 8, 10), (4, 12, 7)):
        rect(px, x, y, x + l, y, (200, 230, 250))
    rect(px, 10, 6, 12, 10, P["y"])
def i_coracao(px):
    disc(px, 5.5, 6, 2.6, 2.6, (200, 40, 60)); disc(px, 9.5, 6, 2.6, 2.6, (200, 40, 60))
    for y in range(7, 13):
        for x in range(3 + (y - 7), 13 - (y - 7)):
            px[(x, y)] = (200, 40, 60)
    px[(5, 5)] = (240, 110, 120)
def i_energia(px):
    disc(px, 7.5, 7.5, 4.5, 5.5, (60, 120, 220)); rect(px, 6, 4, 7, 6, (180, 210, 250))
def i_poder(px):
    for i in range(-5, 6):
        px[(7 + i, 7)] = P["y"]; px[(7, 7 + i)] = P["y"]
    for i in range(-3, 4):
        px[(7 + i, 7 + i)] = P["Y"]; px[(7 + i, 7 - i)] = P["Y"]
def capa_icon(col):
    c, cl, cs = col
    def f(px):
        for y in range(3, 14):
            half = 2 + (y - 3) // 2
            for x in range(7 - half, 9 + half):
                px[(x, y)] = cl if x < 8 else c
        rect(px, 6, 3, 9, 4, cs)
        px[(7, 5)] = P["y"]
    return f
def pedra_icon(col):
    def f(px):
        disc(px, 7.5, 8.5, 4.5, 5, col, tuple(max(0, v - 50) for v in col))
        px[(6, 6)] = (255, 255, 255); px[(7, 5)] = (255, 255, 255)
    return f
def i_chaves(px):
    disc(px, 5, 5, 2.5, 2.5, (200, 170, 70))
    for i in range(7):
        px[(6 + i, 6 + i)] = (200, 170, 70)
    px[(10, 12)] = (200, 170, 70); px[(12, 10)] = (200, 170, 70)
    px[(5, 5)] = (0, 0, 0) if False else (90, 70, 30)

def i_revelar(px):
    disc(px, 7.5, 7.5, 6, 3.5, (230, 230, 236)); disc(px, 7.5, 7.5, 2.5, 2.5, (170, 110, 220)); px[(7, 7)] = P["k"]
def i_escudo(px):
    disc(px, 7.5, 7.5, 6, 6, (120, 200, 240)); disc(px, 7.5, 7.5, 4, 4, (190, 235, 255)); px[(5, 5)] = (255, 255, 255)
def i_abrir(px):
    rect(px, 3, 6, 8, 9, (200, 170, 70)); rect(px, 9, 7, 13, 8, (200, 170, 70)); rect(px, 12, 9, 13, 10, (200, 170, 70)); rect(px, 5, 7, 6, 8, (90, 70, 30))

NEW_ICONS = {"revelar": i_revelar, "escudo": i_escudo, "abrir": i_abrir, "levitar": i_levitar, "passo-de-vento": i_passo, "coracao": i_coracao, "energia": i_energia, "poder": i_poder,
             "chaves-trinco": i_chaves}
for name, col in CAPAS.items():
    NEW_ICONS[f"capa-{name}"] = capa_icon(col)
for name in ("coragem", "inteligencia", "astucia", "lealdade"):
    NEW_ICONS[f"pedra-{name}"] = pedra_icon(CAPAS[name][1])
ALL_ICONS = {**ICONS, **NEW_ICONS}
icons = Image.new("RGBA", (16 * len(ALL_ICONS), 16), (0, 0, 0, 0))
for i, (name, fn) in enumerate(ALL_ICONS.items()):
    icons.alpha_composite(icon(fn), (i * 16, 0))
icons.save(os.path.join(ROOT, "ui", "icones.png"))
SHEETS["ui.icones"]["frameNames"] = {name: i for i, name in enumerate(ALL_ICONS)}


# ---------- Mapas Tiled (.tmj), gerados a partir de uma descrição de cada sala
FLOOR, FLOOR2, CARPET, TOP, FACE, WOOD, WIN, B1, B2, B3, B4 = [i + 1 for i in range(11)]
COLLIDES = (TOP, FACE, WOOD, WIN, B1, B2, B3, B4)


def build_room(name, title, w, h, doors, tables=(), carpet=None, windows=(), banners=(), props=(), spawns=(), npcs=(),
               candles=(), pickups=(), stations=(), boards=(), extra=()):
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
    for (npc_id, sprite, px, py, dialogue, wall) in npcs:
        obj(name=npc_id, type="npc", x=px * 16 + (16 if wall else 8), y=py * 16 + 16, point=True,
            properties=[{"name": "sprite", "type": "string", "value": sprite},
                        {"name": "dialogue", "type": "string", "value": dialogue},
                        {"name": "wall", "type": "bool", "value": wall}])
    for (cname, px, py, lit) in candles:
        obj(name=cname, type="target", x=px * 16 + 8, y=py * 16 + 16, point=True,
            properties=[{"name": "target", "type": "string", "value": "vela"},
                        {"name": "sprite", "type": "string", "value": "prop.vela"},
                        {"name": "lit", "type": "bool", "value": lit}])
    for (pname, item, px, py) in pickups:
        obj(name=pname, type="pickup", x=px * 16 + 8, y=py * 16 + 12, point=True,
            properties=[{"name": "item", "type": "string", "value": item}])
    for st in stations:
        (sname, station, sprite, px, py), gives = st[:5], (st[5] if len(st) > 5 else "")
        obj(name=sname, type="station", x=px * 16 + 8, y=py * 16 + 16, point=True,
            properties=[{"name": "station", "type": "string", "value": station},
                        {"name": "sprite", "type": "string", "value": sprite},
                        {"name": "gives", "type": "string", "value": gives}])
    for (bname, challenge, px, py) in boards:
        obj(name=bname, type="challenge", x=px * 16 + 8, y=py * 16 + 16, point=True,
            properties=[{"name": "challenge", "type": "string", "value": challenge},
                        {"name": "sprite", "type": "string", "value": "prop.quadro-desafios"}])
    for (sprite, px, py) in props:
        obj(name=sprite, type="prop", x=px * 16 + 8, y=py * 16 + 16, point=True,
            properties=[{"name": "sprite", "type": "string", "value": sprite}])
    for e in extra:
        obj(**e)

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


def plist(**kw):
    out = []
    for k, v in kw.items():
        t = "bool" if isinstance(v, bool) else "int" if isinstance(v, int) else "float" if isinstance(v, float) else "string"
        out.append({"name": k, "type": t, "value": v if t != "string" else (v if isinstance(v, str) else json.dumps(v))})
    return out

def pt(type_, name, tx, ty, x=None, y=None, **kw):
    """Objeto-ponto na base do tile (tx, ty). Condições (when) vão como JSON."""
    return dict(name=name, type=type_, x=x if x is not None else tx * 16 + 8, y=y if y is not None else (ty + 1) * 16,
                point=True, properties=plist(**kw))

def zone(type_, name, tx, ty, tw, th, **kw):
    return dict(name=name, type=type_, x=tx * 16, y=ty * 16, width=tw * 16, height=th * 16, properties=plist(**kw))

QS = lambda q, st: {"questStage": q, "stage": st}
QA = lambda q: {"questActive": q}
FL = lambda f: {"flag": f}
NOT = lambda c: {"not": c}
ALL = lambda *c: {"all": list(c)}


# Recepção: onde o jogador chega; porta norte para o Grande Salão
build_room("recepcao", "Recepção", 20, 13,
           doors=[("N", 9, "map.grande-salao", "da-recepcao", "do-salao")],
           carpet=(9, 3, 10, 11), windows=(4, 15),
           tables=[(12, 6, 4, 1)],  # balcão da recepção, com o Trinco atrás
           props=[("prop.vela", 3, 4), ("prop.vela", 16, 4)],
           spawns=[("inicio", 9, 10)],
           npcs=[("trinco", "npc.trinco", 13, 5, "trinco", False)],
           pickups=[("abobora-recepcao", "abobora", 3, 10)])

# Grande Salão: quatro mesas das casas; sul = Recepção, leste = Cozinha
build_room("grande-salao", "Grande Salão", 40, 24,
           doors=[("S", 19, "map.recepcao", "do-salao", "da-recepcao"),
                  ("L", 11, "map.cozinha", "do-salao", "da-cozinha"),
                  ("O", 11, "map.corredor", "do-salao", "do-corredor")],
           tables=[(6, 8, 3, 8), (12, 8, 3, 8), (25, 8, 3, 8), (31, 8, 3, 8)],
           carpet=(17, 4, 22, 22), windows=(6, 14, 25, 33),
           banners=[(9, B1), (12, B2), (27, B3), (30, B4)],
           candles=[("vela-1", 5, 4, True), ("vela-2", 34, 4, True), ("vela-3", 5, 19, True),
                    ("vela-4", 34, 19, True), ("vela-5", 16, 5, True), ("vela-6", 23, 5, True)],
           npcs=[("dom-moldura", "npc.dom-moldura", 19, 2, "dom-moldura", True)],
           pickups=[("gelo-seco-salao", "gelo-seco", 30, 18)],
           boards=[("quadro-desafios", "velas-do-salao", 24, 3), ("quadro-corrida", "corrida-levitacao", 15, 3)],
           extra=[pt("npc", "fuxico", 21, 16, sprite="npc.fuxico", dialogue="fuxico", wall=False),
                  pt("levitavel", "calice-1", 3, 21, kind="calice", sprite="prop.calice"),
                  pt("levitavel", "calice-2", 36, 21, kind="calice", sprite="prop.calice"),
                  pt("levitavel", "calice-3", 36, 7, kind="calice", sprite="prop.calice"),
                  *[pt("socket", f"bandeja-{i + 1}", 9 + i * 2, 5, accepts="calice", mode="levitar", group="corrida", sprite="prop.bandeja") for i in range(3)],
                  zone("trigger", "morgana-salao", 1, 8, 5, 8, dialogue="salao-morgana", actor="npc.morgana", ax=72, ay=112,
                       when=ALL(QA("o-selo"), NOT(FL("visto:morgana-salao"))))])

# Cozinha bruxa: caldeirões; oeste = Grande Salão
build_room("cozinha", "Cozinha Bruxa", 22, 14,
           doors=[("O", 6, "map.grande-salao", "da-cozinha", "do-salao")],
           tables=[(8, 6, 6, 2)], windows=(5, 16),
           props=[("prop.caldeirao", 5, 9), ("prop.caldeirao", 16, 9)],
           stations=[("caldeirao", "caldeirao", "prop.caldeirao", 16, 4),
                     ("despensa", "despensa", "prop.despensa", 19, 4, "abobora,gelo-seco,suco-colorido,cacau")],
           candles=[("vela-a", 9, 6, False), ("vela-b", 13, 6, False)],
           pickups=[("suco-cozinha", "suco-colorido", 19, 11), ("cacau-cozinha", "cacau", 3, 11)],
           npcs=[("dona-brasa", "npc.dona-brasa", 11, 9, "dona-brasa", False)])

# Corredor dos Quadros: estátuas, grade do gabinete, Dama do Chá, caixotes; leste = Salão, oeste = Hall, norte = Gabinete
build_room("corredor", "Corredor dos Quadros", 34, 10,
           doors=[("L", 4, "map.grande-salao", "do-corredor", "do-salao"),
                  ("O", 4, "map.hall", "do-corredor", "do-hall"),
                  ("N", 16, "map.gabinete", "do-corredor", "do-gabinete")],
           carpet=(2, 5, 31, 6),
           props=[("prop.quadrinho-1", 4, 1), ("prop.quadrinho-2", 11, 1), ("prop.quadrinho-3", 22, 1), ("prop.quadrinho-1", 28, 1)],
           candles=[("vela-c1", 3, 3, True), ("vela-c2", 30, 3, True)],
           npcs=[("dama-cha", "npc.dama-cha", 6, 2, "dama-cha", True)],
           extra=[pt("pushable", "estatua-1", 9, 4, sprite="prop.estatua", group="grade"),
                  pt("pushable", "estatua-2", 24, 4, sprite="prop.estatua", group="grade"),
                  pt("plate", "placa-1", 13, 6, group="grade"),
                  pt("plate", "placa-2", 20, 6, group="grade"),
                  pt("gate", "grade", 16, 3, x=17 * 16, y=4 * 16, group="grade", sprite="prop.grade"),
                  *[pt("creature", f"sombra-{i + 1}", cx, cy, sprite="npc.sombrinha", group="sombras", hp=1,
                       when=FL("visto:morgana-corredor")) for i, (cx, cy) in enumerate([(12, 5), (18, 7), (27, 5)])],
                  *[pt("levitavel", f"caixote-{i + 1}", cx, cy, kind="caixote", sprite="prop.caixote") for i, (cx, cy) in enumerate([(31, 8), (32, 7), (31, 7)])],
                  pt("pickup", "pedra-astucia", 32, 8, y=8 * 16 + 12, item="pedra-astucia", when=QA("o-selo")),
                  zone("trigger", "morgana-corredor", 20, 3, 13, 6, dialogue="corredor-morgana", actor="npc.morgana", ax=104, ay=96, fx="apagar",
                       when=ALL(QS("o-diretor", "ir-ao-corredor"), NOT(FL("visto:morgana-corredor"))))])

# Gabinete do Diretor: o Prof. Arquimedes em pessoa; sul = Corredor
build_room("gabinete", "Gabinete do Diretor", 16, 11,
           doors=[("S", 7, "map.corredor", "do-gabinete", "do-corredor")],
           tables=[(5, 4, 6, 1)], carpet=(6, 6, 9, 8), windows=(3, 12),
           props=[("prop.estante", 1, 2), ("prop.estante", 2, 2), ("prop.estante", 13, 2), ("prop.estante", 14, 2),
                  ("prop.vela", 6, 4), ("prop.vela", 10, 4), ("prop.vaso", 13, 8)],
           pickups=[("folha-gabinete", "folha-mandragora", 13, 8)],
           extra=[pt("npc", "arquimedes", 8, 3, sprite="npc.arquimedes", dialogue="arquimedes", wall=False,
                     when=QS("o-diretor", "falar-com-diretor"))])

# Hall da Escada: escada selada, 4 pedestais, sombrinhas guardando a Pedra da Coragem; leste = Corredor
build_room("hall", "Hall da Escada", 22, 14,
           doors=[("L", 5, "map.corredor", "do-hall", "do-corredor")],
           carpet=(10, 4, 11, 12), windows=(4, 17),
           props=[("prop.vela", 2, 3), ("prop.vela", 19, 3)],
           extra=[pt("prop", "escadaria", 10, 3, x=11 * 16, sprite="prop.escadaria"),
                  pt("npc", "selo", 10, 3, x=11 * 16, sprite="prop.selo", dialogue="escada", wall=False, when=NOT(FL("ato:1:fim"))),
                  pt("npc", "selo-quebrado", 10, 3, x=11 * 16, sprite="prop.selo-quebrado", dialogue="escada", wall=False, when=FL("ato:1:fim")),
                  *[pt("socket", f"pedestal-{h}", cx, cy, accepts=f"pedra-{h}", mode="item", group="selo", sprite="prop.pedestal",
                       frame=i, dialogue="selo-quebrado")
                    for i, (h, cx, cy) in enumerate([("coragem", 6, 6), ("inteligencia", 15, 6), ("astucia", 6, 10), ("lealdade", 15, 10)])],
                  pt("npc", "arquimedes", 11, 6, sprite="npc.arquimedes", dialogue="arquimedes", wall=False, when=QS("o-diretor", "ir-ao-hall")),
                  *[pt("creature", f"guarda-{i + 1}", cx, cy, sprite="npc.sombrinha", group="guardas", hp=3, when=QA("o-selo"))
                    for i, (cx, cy) in enumerate([(17, 10), (19, 8), (18, 12)])],
                  pt("pickup", "pedra-coragem", 19, 11, y=11 * 16 + 12, item="pedra-coragem", when=QA("o-selo")),
                  zone("trigger", "morgana-hall", 13, 3, 8, 10, dialogue="hall-morgana", actor="npc.morgana", ax=136, ay=80,
                       when=ALL(QS("o-diretor", "ir-ao-hall"), NOT(FL("visto:morgana-hall"))))])

for key in ("corredor", "gabinete", "hall"):
    MANIFEST["maps"][f"map.{key}"] = {"url": f"maps/{key}.tmj", "tilesets": ["tiles.castelo"]}
with open(MANIFEST_PATH, "w", encoding="utf-8") as fh:
    json.dump(MANIFEST, fh, ensure_ascii=False, indent=2)

print("assets provisórios gerados em", os.path.abspath(ROOT))

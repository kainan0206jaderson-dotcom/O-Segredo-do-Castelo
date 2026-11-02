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
# pisos do segundo andar (etapa 5): madeira da biblioteca, grama da estufa, céu do observatório, tinta dos quadros
def wood_floor(x, y):
    if y % 5 == 4 or (x + (5 if (y // 5) % 2 else 0)) % 10 == 0:
        return (96, 64, 38)
    return (138, 96, 58) if (x * 5 + y) % 13 else (150, 106, 66)
def grass(x, y):
    if (x * 7 + y * 11) % 17 == 0:
        return (104, 84, 52)
    return (74, 126, 62) if (x * 3 + y * 5) % 7 else (92, 146, 74)
def starry(x, y):
    h = (x * 37 + y * 91) % 97
    if h == 0:
        return (230, 230, 255)
    if h in (13, 51):
        return (90, 100, 170)
    return (26, 28, 62) if (x // 8 + y // 8) % 2 else (30, 32, 70)
def paint_floor(x, y):
    if (x * 3 + y * 7) % 19 == 0:
        return (120, 80, 150)
    return (54, 42, 80) if ((x // 4) + (y // 4)) % 2 else (62, 48, 92)
tile(11, wood_floor)
tile(12, grass)
tile(13, starry)
tile(14, paint_floor)
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
# ATO 1 (etapa 4): capas, Arquimedes, Bellatrix, Fuxico, Dama do Chá,
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
SHEETS["player.aprendiz"]["frameHeight"] = 32  # arte definitiva (art_people) tem 2 tiles
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
    sheet_entry(f"player.aprendiz-{name}", f"sprites/aprendiz-{name}.png", 16, 32, player_anims)

# ---------- Aprendiz menina: mesmas animações; a arte definitiva vem de tools/art_people.py
for suffix in [""] + [f"-{n}" for n in CAPAS]:
    Image.open(os.path.join(ROOT, "sprites", f"aprendiz{suffix}.png")).save(os.path.join(ROOT, "sprites", f"aprendiza{suffix}.png"))
    sheet_entry(f"player.aprendiza{suffix}", f"sprites/aprendiza{suffix}.png", 16, 32, player_anims)

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

# ---------- Bellatrix Lestrelle [FICÇÃO]: capuz cinza-fuligem, mecha prateada, olhos violeta
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

# ---------- Professores do castelo (content/professores.json): a arte vem de art_people.render_professores
with open(os.path.join(os.path.dirname(__file__), "..", "content", "professores.json"), encoding="utf-8") as _f:
    PROFESSORES = json.load(_f)["lista"]
for _p in PROFESSORES:
    sheet_entry(f"npc.prof-{_p['id']}", f"sprites/prof-{_p['id']}.png", 16, 32, IDLE_TALK, **({"ghost": True} if _p.get("fantasma") else {}))

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
def i_zaparatar(px):
    """Redemoinho roxo com o estalo dourado no meio."""
    import math
    for i in range(36):
        a = i * 0.42
        r = 1.2 + i * 0.16
        x, y = int(round(7.5 + math.cos(a) * r)), int(round(7.5 + math.sin(a) * r))
        if 0 <= x < 16 and 0 <= y < 16:
            px[(x, y)] = (150, 120, 220) if i % 2 else (90, 70, 160)
    rect(px, 7, 7, 8, 8, P["Y"])
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

NEW_ICONS = {"revelar": i_revelar, "escudo": i_escudo, "abrir": i_abrir, "levitar": i_levitar, "passo-de-vento": i_passo, "zaparatar": i_zaparatar, "coracao": i_coracao, "energia": i_energia, "poder": i_poder,
             "chaves-trinco": i_chaves}
for name, col in CAPAS.items():
    NEW_ICONS[f"capa-{name}"] = capa_icon(col)
for name in ("coragem", "inteligencia", "astucia", "lealdade"):
    NEW_ICONS[f"pedra-{name}"] = pedra_icon(CAPAS[name][1])
# ícones da etapa 5: cartas da Amélia, emblemas das virtudes, semente, poções novas, livro do coração
def i_carta(px):
    rect(px, 3, 3, 12, 13, (246, 246, 252)); rect(px, 3, 3, 12, 3, (196, 206, 226)); rect(px, 3, 13, 12, 13, (196, 206, 226))
    for y in (6, 8, 10):
        rect(px, 5, y, 10, y, (150, 160, 190))
def emblema_icon(col):
    def f(px):
        disc(px, 7.5, 8.5, 5.5, 5.5, (214, 170, 60)); disc(px, 7.5, 8.5, 3.6, 3.6, col); rect(px, 6, 1, 9, 3, (214, 170, 60)); px[(6, 7)] = (255, 255, 255)
    return f
def i_semente(px):
    disc(px, 7.5, 9, 3, 4, (150, 104, 60), (110, 74, 40)); rect(px, 7, 3, 8, 5, (90, 170, 80)); px[(9, 4)] = (90, 170, 80)
def bottle(col, star=False):
    def f(px):
        rect(px, 6, 2, 9, 4, (150, 104, 60)); disc(px, 7.5, 10, 4.5, 4.5, col, tuple(max(0, v - 50) for v in col)); px[(6, 8)] = (255, 255, 255)
        if star:
            px[(7, 10)] = P["Y"]; px[(8, 10)] = P["Y"]; px[(7, 11)] = P["Y"]; px[(8, 9)] = P["Y"]
    return f
def i_livro_coracao(px):
    rect(px, 3, 3, 12, 13, (196, 150, 40)); rect(px, 3, 3, 4, 13, (138, 100, 24)); disc(px, 8.5, 8, 2.2, 2.2, (200, 40, 60))
NEW_ICONS.update({"carta-amelia-1": i_carta, "carta-amelia-2": i_carta, "carta-amelia-3": i_carta, "carta-amelia-4": i_carta,
                  "semente-mandragora": i_semente, "pocao-vigor": bottle((200, 50, 70)), "elixir-estelar": bottle((60, 90, 200), True),
                  "livro-coracao": i_livro_coracao})
for name in ("coragem", "inteligencia", "astucia", "lealdade"):
    NEW_ICONS[f"emblema-{name}"] = emblema_icon(CAPAS[name][0])
# ícones da etapa 7: feitiços e objetos das salas dos professores
def i_onda(px):
    for r, col in ((6.5, (250, 220, 120)), (4.2, (255, 244, 190)), (2, (255, 255, 255))):
        disc(px, 7.5, 8, r, r, col)
    disc(px, 7.5, 8, 3.2, 3.2, (250, 220, 120))
    disc(px, 7.5, 8, 1.4, 1.4, (255, 255, 255))
def i_guia(px):
    Y, W = P["Y"], (255, 255, 255)
    for x, y in ((7, 3), (8, 3), (6, 5), (7, 5), (8, 5), (9, 5), (4, 6), (5, 6), (10, 6), (11, 6), (7, 4), (8, 4), (6, 7), (7, 7), (8, 7), (9, 7), (6, 8), (9, 8), (5, 9), (10, 9)):
        px[(x, y)] = Y
    px[(7, 6)] = W; px[(8, 6)] = W
    for x in (3, 5, 11, 13):
        px[(x, 13)] = (250, 220, 120)
def i_anel(px):
    disc(px, 7.5, 9.5, 4.5, 4.5, (214, 170, 60))
    for q in [q for q in px if ((q[0] - 7.5) / 2.3) ** 2 + ((q[1] - 9.5) / 2.3) ** 2 <= 1]:
        del px[q]
    for q in [q for q in px if ((q[0] - 7.5) / 3.4) ** 2 + ((q[1] - 9.5) / 3.4) ** 2 <= 1]:
        px[q] = (170, 130, 40)
    disc(px, 7.5, 4, 2, 2, (80, 190, 120)); px[(7, 3)] = (220, 255, 230)
def i_broche(px):
    disc(px, 7.5, 8, 5, 5, (214, 170, 60)); disc(px, 7.5, 8, 3.6, 3.6, (120, 80, 50))
    rect(px, 7, 5, 8, 9, (90, 170, 80)); px[(6, 6)] = (90, 170, 80); px[(9, 6)] = (90, 170, 80)
def i_pena(px):
    for i in range(10):
        x, y = 4 + i * 0.8, 13 - i
        rect(px, int(x), int(y), int(x) + 2, int(y), (240, 236, 250))
        px[(int(x) + 1, int(y))] = (170, 150, 220)
    px[(3, 14)] = (60, 40, 30); px[(4, 13)] = (60, 40, 30)
def i_medalha(px):
    rect(px, 5, 1, 6, 6, (200, 90, 140)); rect(px, 9, 1, 10, 6, (200, 90, 140))
    disc(px, 7.5, 10, 4, 4, (214, 170, 60)); disc(px, 7.5, 10, 2.4, 2.4, (240, 200, 90)); px[(7, 10)] = (255, 255, 255)
NEW_ICONS.update({"onda-de-luz": i_onda, "estrela-guia": i_guia, "anel-caldeirao": i_anel,
                  "broche-mandragora": i_broche, "pena-encantada": i_pena, "medalha-disciplina": i_medalha})
ALL_ICONS = {**ICONS, **NEW_ICONS}
icons = Image.new("RGBA", (16 * len(ALL_ICONS), 16), (0, 0, 0, 0))
for i, (name, fn) in enumerate(ALL_ICONS.items()):
    icons.alpha_composite(icon(fn), (i * 16, 0))
icons.save(os.path.join(ROOT, "ui", "icones.png"))
SHEETS["ui.icones"]["frameNames"] = {name: i for i, name in enumerate(ALL_ICONS)}


# ---------- Arte da etapa 5 (Atos 2 e 3), desenhada com formas simples e contorno automático
from PIL import ImageDraw

def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def outline(im, col=None):
    """Contorno de 1 px em volta de tudo que já foi pintado."""
    col = col or (P["k"] + (255,))
    px = im.load()
    w, h = im.size
    solid = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0}
    for (x, y) in solid:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if 0 <= q[0] < w and 0 <= q[1] < h and q not in solid and px[q][3] == 0:
                px[q] = col
    return im

def ell(d, box, col):
    d.ellipse(box, fill=col)

def save_strip(frames, key, path, anims=None, **extra):
    fw, fh = frames[0].size
    im = canvas(fw * len(frames), fh)
    for i, f in enumerate(frames):
        im.alpha_composite(f, (i * fw, 0))
    im.save(os.path.join(ROOT, path))
    sheet_entry(key, path, fw, fh, anims, **extra)

def rgba(c, a=255):
    return tuple(c[:3]) + (a,)

# Espectro [FICÇÃO] (16x16): fantasma claro e translúcido; 4 quadros de balanço + 1 atingido
def espectro(bob, hit=False):
    im = canvas(16, 16)
    d = ImageDraw.Draw(im)
    body = (255, 255, 255, 230) if hit else (206, 234, 250, 175)
    ell(d, (3, 1 + bob, 12, 10 + bob), body)
    d.rectangle((3, 6 + bob, 12, 11 + bob), fill=body)
    for i, x in enumerate(range(3, 13, 3)):
        d.polygon([(x, 11 + bob), (x + 2, 11 + bob), (x + 1 + (bob if i % 2 else -bob), 14)], fill=body)
    if not hit:
        d.point([(6, 5 + bob), (9, 5 + bob), (6, 6 + bob), (9, 6 + bob)], fill=(40, 50, 90, 255))
        d.point([(7, 8 + bob), (8, 8 + bob)], fill=(80, 100, 150, 220))
    return outline(im, (110, 160, 210, 190))
save_strip([espectro(0), espectro(1), espectro(0), espectro(-1), espectro(0, True)], "npc.espectro", "sprites/espectro.png",
           {"idle": {"frames": [0, 1, 2, 3], "frameRate": 5, "repeat": -1}, "hit": {"frames": [4], "frameRate": 1, "repeat": 0}})

# Olho-sentinela da Bellatrix [FICÇÃO] (16x16): olho voador com asinhas; 2 quadros + piscada
def olho(flap, blink=False):
    im = canvas(16, 16)
    d = ImageDraw.Draw(im)
    wing = (60, 44, 84, 255)
    d.polygon([(4, 8), (0, 5 - flap), (1, 10)], fill=wing)
    d.polygon([(11, 8), (15, 5 - flap), (14, 10)], fill=wing)
    ell(d, (3, 4, 12, 12), (236, 232, 240, 255))
    if blink:
        d.rectangle((3, 7, 12, 9), fill=(110, 80, 140, 255))
    else:
        ell(d, (6, 6, 9, 10), (170, 110, 220, 255))
        d.point([(7, 8), (8, 8)], fill=(24, 20, 37, 255))
    return outline(im)
save_strip([olho(0), olho(2), olho(0, True)], "npc.olho", "sprites/olho.png",
           {"idle": {"frames": [0, 1], "frameRate": 6, "repeat": -1}, "hit": {"frames": [2], "frameRate": 1, "repeat": 0}})

# Orbe de fuligem (8x8), disparado pela Bellatrix
def orbe(swap):
    im = canvas(8, 8)
    d = ImageDraw.Draw(im)
    a, b = ((110, 60, 170, 255), (210, 160, 250, 255))
    ell(d, (1, 1, 6, 6), b if swap else a)
    ell(d, (2, 2, 5, 5), a if swap else b)
    return im
save_strip([orbe(False), orbe(True)], "fx.orbe", "fx/orbe.png", {"idle": {"frames": [0, 1], "frameRate": 10, "repeat": -1}})

# Âncora de fuligem (16x24): cristal escuro que prende alguém com correntes
def ancora(glow, hit=False):
    im = canvas(16, 24)
    d = ImageDraw.Draw(im)
    dark = (240, 230, 250, 255) if hit else (64, 46, 96, 255)
    d.polygon([(8, 3), (13, 13), (8, 22), (3, 13)], fill=dark)
    d.line([(8, 5), (8, 20)], fill=(150, 100, 210, 255) if glow else (110, 70, 160, 255))
    d.line([(5, 13), (11, 13)], fill=(150, 100, 210, 255) if glow else (110, 70, 160, 255))
    im = outline(im)
    for i in range(3):
        d.rectangle((13 + (i % 2), 16 + i * 2, 14 + (i % 2), 17 + i * 2), outline=(150, 150, 160, 255))
    return im
save_strip([ancora(False), ancora(True), ancora(False, True)], "npc.ancora", "sprites/ancora.png",
           {"idle": {"frames": [0, 1], "frameRate": 3, "repeat": -1}, "hit": {"frames": [2], "frameRate": 1, "repeat": 0}})

# Canteiro da estufa (16x16): vazio, plantado (broto), crescido (mandrágora com carinha)
def canteiro(stage):
    im = canvas(16, 16)
    d = ImageDraw.Draw(im)
    d.rectangle((1, 9, 14, 15), fill=(120, 72, 40, 255))
    d.rectangle((2, 9, 13, 10), fill=(70, 48, 30, 255))
    if stage == 1:
        d.line([(8, 5), (8, 9)], fill=(90, 170, 80, 255))
        d.point([(7, 5), (9, 4)], fill=(120, 200, 100, 255))
    if stage == 2:
        for x, y in ((5, 2), (7, 1), (9, 1), (11, 2), (6, 4), (10, 4)):
            d.line([(8, 7), (x, y)], fill=(90, 180, 80, 255))
        ell(d, (5, 5, 11, 10), (210, 180, 130, 255))
        d.point([(7, 7), (9, 7)], fill=(24, 20, 37, 255))
        d.point([(8, 9)], fill=(140, 90, 70, 255))
    return outline(im)
save_strip([canteiro(0), canteiro(1), canteiro(2)], "prop.canteiro", "sprites/canteiro.png", {})

# saco de sementes (16x16)
im = canvas(16, 16)
d = ImageDraw.Draw(im)
d.polygon([(4, 6), (12, 6), (14, 15), (2, 15)], fill=(196, 170, 120, 255))
d.rectangle((5, 3, 11, 6), fill=(170, 140, 96, 255))
d.point([(6, 10), (9, 12), (11, 9), (5, 13)], fill=(110, 74, 40, 255))
save_strip([outline(im)], "prop.saco-sementes", "sprites/saco-sementes.png", {})

# Fada Ramalhete [FICÇÃO]: a mesma base da Dona Brasa, de vestido e touca verdes
base = Image.open(os.path.join(ROOT, "sprites", "dona-brasa.png")).convert("RGBA")
px = base.load()
swap = {(240, 240, 236): (130, 196, 100), (240, 140, 60): (120, 80, 40), (92, 60, 146): (70, 120, 50), (58, 38, 98): (44, 84, 34)}
for y in range(base.height):
    for x in range(base.width):
        r, g, b, a = px[x, y]
        if a and (r, g, b) in swap:
            px[x, y] = swap[(r, g, b)] + (255,)
base.save(os.path.join(ROOT, "sprites", "fada-ramalhete.png"))
sheet_entry("npc.fada-ramalhete", "sprites/fada-ramalhete.png", 16, 24, IDLE_TALK)

# Espelho da Amélia (32x32, na parede): 0 = presa (vidro escuro, correntes), 1 = livre, 2 = brilho
def espelho(state):
    im = canvas(32, 32)
    d = ImageDraw.Draw(im)
    ell(d, (4, 1, 27, 31), (200, 206, 226, 255))
    ell(d, (7, 4, 24, 28), (40, 50, 84, 255) if state == 0 else (150, 190, 230, 255) if state == 1 else (220, 240, 255, 255))
    ell(d, (12, 9, 19, 16), (180, 190, 210, 120) if state == 0 else (240, 240, 250, 200))
    d.rectangle((12, 15, 19, 25), fill=(200, 210, 230, 110) if state == 0 else (246, 246, 255, 200))
    if state == 0:
        d.line([(7, 6), (24, 26)], fill=(110, 110, 120, 255), width=1)
        d.line([(24, 6), (7, 26)], fill=(110, 110, 120, 255), width=1)
        d.point([(15, 16)], fill=(170, 110, 220, 255))
    else:
        d.point([(10, 8), (11, 7), (21, 22)], fill=(255, 255, 255, 255))
    return outline(im)
save_strip([espelho(0), espelho(1), espelho(2)], "npc.espelho", "sprites/espelho.png",
           {"idle": {"frames": [0], "frameRate": 1, "repeat": -1}, "livre": {"frames": [1, 2], "frameRate": 2, "repeat": -1}})

# Mostradores das constelações (16x24): base na cor da casa + disco com o símbolo (4 casas x 4 símbolos)
SIMBOLOS = ["chama", "livro", "lua", "coracao"]
def simbolo(d, name, cx, cy):
    if name == "chama":
        d.polygon([(cx, cy - 4), (cx + 3, cy + 2), (cx, cy + 3), (cx - 3, cy + 2)], fill=(236, 126, 48, 255))
        d.point([(cx, cy), (cx, cy + 1)], fill=(250, 214, 92, 255))
    elif name == "livro":
        d.rectangle((cx - 3, cy - 3, cx + 3, cy + 3), fill=(70, 110, 200, 255))
        d.line([(cx, cy - 3), (cx, cy + 3)], fill=(230, 230, 236, 255))
    elif name == "lua":
        ell(d, (cx - 3, cy - 3, cx + 3, cy + 3), (250, 230, 140, 255))
        ell(d, (cx - 1, cy - 4, cx + 4, cy + 2), (30, 32, 70, 255))
    else:
        ell(d, (cx - 3, cy - 3, cx, cy), (220, 60, 80, 255))
        ell(d, (cx, cy - 3, cx + 3, cy), (220, 60, 80, 255))
        d.polygon([(cx - 3, cy - 1), (cx + 3, cy - 1), (cx, cy + 3)], fill=(220, 60, 80, 255))
def dial(house_col, sym):
    im = canvas(16, 24)
    d = ImageDraw.Draw(im)
    d.rectangle((5, 12, 10, 21), fill=(120, 116, 132, 255))
    d.rectangle((3, 20, 12, 23), fill=house_col + (255,))
    ell(d, (1, 2, 14, 14), (30, 32, 70, 255))
    simbolo(d, SIMBOLOS[sym], 8, 8)
    im = outline(im)
    ImageDraw.Draw(im).ellipse((1, 2, 14, 14), outline=house_col + (255,))
    return im
save_strip([dial(HOUSE_COLORS[h], s) for h in range(4) for s in range(4)], "prop.mostrador", "sprites/mostrador.png", {})

# telescópio (16x32)
im = canvas(16, 32)
d = ImageDraw.Draw(im)
d.line([(3, 20), (13, 4)], fill=(190, 150, 60, 255), width=3)
d.line([(4, 19), (12, 6)], fill=(230, 196, 100, 255))
d.line([(8, 14), (4, 31)], fill=(96, 64, 38, 255), width=1)
d.line([(8, 14), (12, 31)], fill=(96, 64, 38, 255), width=1)
d.line([(8, 14), (8, 31)], fill=(96, 64, 38, 255), width=1)
save_strip([outline(im)], "prop.telescopio", "sprites/telescopio.png", {})

# espelho de levitar (16x16) e suporte no chão com a direção marcada (0 = /, 1 = \)
im = canvas(16, 16)
d = ImageDraw.Draw(im)
d.rectangle((7, 11, 8, 15), fill=(150, 104, 60, 255))
ell(d, (3, 1, 12, 12), (200, 206, 226, 255))
ell(d, (5, 3, 10, 10), (170, 210, 240, 255))
d.point([(6, 4)], fill=(255, 255, 255, 255))
save_strip([outline(im)], "prop.espelho-luz", "sprites/espelho-luz.png", {})
def suporte(slash):
    im = canvas(16, 16)
    d = ImageDraw.Draw(im)
    d.rectangle((1, 10, 14, 15), fill=(120, 116, 132, 255))
    d.rectangle((2, 11, 13, 14), fill=(90, 86, 104, 255))
    pts = [(3, 14), (12, 11)] if slash else [(3, 11), (12, 14)]
    d.line(pts, fill=(250, 214, 92, 255))
    return outline(im)
save_strip([suporte(True), suporte(False)], "prop.suporte-espelho", "sprites/suporte-espelho.png", {})

# cristal (16x24): apagado e aceso; fonte de luz (16x16)
def cristal(on):
    im = canvas(16, 24)
    d = ImageDraw.Draw(im)
    col = (250, 240, 170, 255) if on else (110, 120, 150, 255)
    d.polygon([(8, 2), (13, 10), (8, 21), (3, 10)], fill=col)
    d.line([(8, 4), (8, 19)], fill=(255, 255, 255, 255) if on else (150, 160, 190, 255))
    d.rectangle((4, 20, 11, 23), fill=(90, 86, 104, 255))
    return outline(im)
save_strip([cristal(False), cristal(True)], "prop.cristal", "sprites/cristal.png", {})
im = canvas(16, 16)
d = ImageDraw.Draw(im)
d.rectangle((4, 9, 11, 15), fill=(120, 116, 132, 255))
ell(d, (3, 2, 12, 10), (250, 214, 92, 255))
ell(d, (5, 4, 10, 8), (255, 246, 190, 255))
save_strip([outline(im)], "prop.fonte-luz", "sprites/fonte-luz.png", {})

# porta trancada (32x32): fechada com cadeado / aberta
def porta(aberta):
    im = canvas(32, 32)
    d = ImageDraw.Draw(im)
    if aberta:
        d.rectangle((2, 2, 29, 31), fill=(20, 16, 30, 255))
        d.rectangle((2, 2, 4, 31), fill=(110, 74, 40, 255))
        d.rectangle((27, 2, 29, 31), fill=(110, 74, 40, 255))
    else:
        d.rectangle((2, 2, 29, 31), fill=(120, 80, 46, 255))
        d.line([(16, 2), (16, 31)], fill=(70, 46, 28, 255))
        for y in (8, 22):
            d.rectangle((2, y, 29, y + 1), fill=(90, 86, 104, 255))
        d.rectangle((13, 13, 19, 19), fill=(150, 150, 160, 255))
        d.rectangle((15, 15, 17, 17), fill=(24, 20, 37, 255))
        d.arc((13, 9, 19, 16), 180, 360, fill=(150, 150, 160, 255))
    return outline(im)
save_strip([porta(False), porta(True)], "prop.porta-trancada", "sprites/porta-trancada.png", {})

# barreira de fuligem (32x32) que fecha a escada da torre
def barreira(t):
    im = canvas(32, 32)
    px = im.load()
    for y in range(32):
        for x in range(32):
            v = (x * 3 + y * 5 + t * 7) % 11
            if v < 6:
                px[x, y] = (70 + v * 8, 50 + v * 4, 110 + v * 10, 200)
    return im
save_strip([barreira(0), barreira(1), barreira(2)], "prop.barreira", "sprites/barreira.png",
           {"idle": {"frames": [0, 1, 2], "frameRate": 6, "repeat": -1}})

# quadros-portal da galeria (32x32): uma cena por virtude; quadro 2*i = normal, 2*i+1 = vencido (moldura acesa)
def portal(i, done):
    im = canvas(32, 32)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 31, 31), fill=(250, 214, 92, 255) if done else (190, 150, 60, 255))
    d.rectangle((3, 3, 28, 28), fill=[(20, 14, 26, 255), (24, 30, 60, 255), (30, 26, 44, 255), (50, 40, 70, 255)][i])
    if i == 0:  # coragem: chama no escuro
        d.polygon([(16, 8), (21, 20), (16, 24), (11, 20)], fill=(236, 126, 48, 255))
        d.polygon([(16, 13), (18, 20), (16, 22), (14, 20)], fill=(250, 214, 92, 255))
    elif i == 1:  # inteligência: raio de luz entre espelhos
        d.line([(5, 8), (16, 8), (16, 22), (26, 22)], fill=(250, 240, 170, 255), width=1)
        ell(d, (14, 6, 18, 10), (200, 206, 226, 255)); ell(d, (14, 20, 18, 24), (200, 206, 226, 255))
    elif i == 2:  # astúcia: olho vigiando
        ell(d, (8, 11, 23, 20), (236, 232, 240, 255)); ell(d, (13, 12, 18, 19), (170, 110, 220, 255))
        d.point([(15, 15), (16, 16)], fill=(24, 20, 37, 255))
    else:  # lealdade: duas mãos e uma corrente partida
        d.rectangle((7, 14, 13, 18), fill=(244, 200, 160, 255)); d.rectangle((18, 14, 24, 18), fill=(244, 200, 160, 255))
        d.line([(13, 16), (18, 16)], fill=(150, 150, 160, 255))
    if done:
        d.point([(4, 4), (27, 4), (4, 27), (27, 27)], fill=(255, 255, 255, 255))
    return outline(im)
save_strip([portal(i, dn) for i in range(4) for dn in (False, True)], "prop.quadro-portal", "sprites/quadro-portal.png", {})

# Arquimedes preso num quadro (32x32): parado, piscando, falando
arq = Image.open(os.path.join(ROOT, "sprites", "arquimedes.png")).convert("RGBA")
def quadro_arq(f, blink=False):
    im = canvas(32, 32)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 31, 31), fill=(190, 150, 60, 255))
    d.rectangle((3, 3, 28, 28), fill=(60, 70, 110, 255))
    bust = arq.crop((f * 16, 0, f * 16 + 16, 24))
    im.alpha_composite(bust, (8, 5))
    if blink:
        d2 = ImageDraw.Draw(im)
        d2.line([(13, 15), (14, 15)], fill=(244, 200, 160, 255)); d2.line([(17, 15), (18, 15)], fill=(244, 200, 160, 255))
    ImageDraw.Draw(im).rectangle((0, 0, 31, 31), outline=(24, 20, 37, 255))
    ImageDraw.Draw(im).rectangle((2, 2, 29, 29), outline=(138, 100, 24, 255))
    return im
save_strip([quadro_arq(0), quadro_arq(0, True), quadro_arq(2), quadro_arq(0)], "npc.quadro-arquimedes", "sprites/quadro-arquimedes.png",
           {"idle": {"frames": [0, 0, 0, 1], "frameRate": 2, "repeat": -1}, "talk": {"frames": [2, 3], "frameRate": 8, "repeat": -1}})

# Coração do castelo (32x32): apagado / aceso pulsando
def coracao(level):
    im = canvas(32, 32)
    d = ImageDraw.Draw(im)
    cols = [((100, 96, 120), (130, 126, 150)), ((210, 50, 70), (250, 140, 120)), ((230, 70, 80), (255, 210, 150))][level]
    ell(d, (4, 4, 17, 17), cols[0] + (255,)); ell(d, (14, 4, 27, 17), cols[0] + (255,))
    d.polygon([(5, 13), (26, 13), (16, 28)], fill=cols[0] + (255,))
    ell(d, (8, 7, 13, 12), cols[1] + (255,))
    if level:
        d.point([(9, 8), (10, 8)], fill=(255, 255, 255, 255))
    return outline(im)
save_strip([coracao(0), coracao(1), coracao(2)], "npc.coracao", "sprites/coracao.png",
           {"idle": {"frames": [0], "frameRate": 1, "repeat": -1}, "aceso": {"frames": [1, 2], "frameRate": 3, "repeat": -1}})

# livro que voa (16x16, levitável) e atril onde ele se encaixa (16x16)
def livro(col):
    im = canvas(16, 16)
    d = ImageDraw.Draw(im)
    d.rectangle((3, 6, 12, 14), fill=col + (255,))
    d.rectangle((3, 6, 4, 14), fill=tuple(max(0, v - 50) for v in col) + (255,))
    d.rectangle((6, 8, 11, 9), fill=(240, 236, 230, 255))
    return outline(im)
save_strip([livro((44, 90, 170))], "prop.livro", "sprites/livro.png", {})
im = canvas(16, 16)
d = ImageDraw.Draw(im)
d.polygon([(2, 9), (13, 9), (11, 12), (4, 12)], fill=(120, 80, 46, 255))
d.rectangle((7, 12, 8, 15), fill=(96, 64, 38, 255))
d.rectangle((5, 15, 10, 15), fill=(96, 64, 38, 255))
save_strip([outline(im)], "prop.atril", "sprites/atril.png", {})


# ---------- Elenco do castelo [KAINAN: nomes]; aparência e jeito de cada um [FICÇÃO]
# Fantasmas (16x24, translúcidos): parado 0-1, falando 2-3
GHOST_EDGE = (120, 170, 220, 200)

def booh(bob, mouth):
    """Booh: fantasminha clássico de lençol, bochechudo e brincalhão, com laço vermelho."""
    im = canvas(16, 24)
    d = ImageDraw.Draw(im)
    body = (236, 244, 255, 190)
    y = 4 + bob
    ell(d, (2, y, 13, y + 11), body)
    d.rectangle((2, y + 6, 13, y + 15), fill=body)
    for i, x in enumerate(range(2, 14, 3)):
        d.polygon([(x, y + 15), (x + 2, y + 15), (x + 1 + (1 if (i + bob) % 2 else -1), y + 18)], fill=body)
    d.point([(5, y + 5), (10, y + 5), (5, y + 6), (10, y + 6)], fill=(30, 36, 70, 255))
    d.point([(4, y + 8), (11, y + 8)], fill=(250, 170, 190, 200))  # bochechas
    if mouth:
        ell(d, (6, y + 8, 9, y + 11), (40, 30, 60, 255))
    else:
        d.line([(6, y + 9), (9, y + 9)], fill=(40, 30, 60, 255))
    d.polygon([(5, y + 12), (8, y + 13), (5, y + 14)], fill=(214, 60, 70, 255))  # laço
    d.polygon([(11, y + 12), (8, y + 13), (11, y + 14)], fill=(214, 60, 70, 255))
    return outline(im, GHOST_EDGE)

def addam(bob, mouth):
    """Mister Addam: cavalheiro fantasma de cartola, bigode e casaca, muito educado."""
    im = canvas(16, 24)
    d = ImageDraw.Draw(im)
    y = 1 + bob
    coat = (150, 170, 210, 185)
    skin = (226, 236, 250, 200)
    d.rectangle((4, y, 11, y + 4), fill=(70, 80, 120, 210))  # cartola
    d.rectangle((2, y + 4, 13, y + 5), fill=(70, 80, 120, 210))
    d.rectangle((5, y + 3, 10, y + 3), fill=(170, 120, 200, 220))  # fita
    ell(d, (4, y + 5, 11, y + 12), skin)
    d.point([(6, y + 8), (9, y + 8)], fill=(30, 36, 70, 255))
    d.line([(5, y + 10), (10, y + 10)], fill=(90, 90, 120, 230))  # bigode
    if mouth:
        d.point([(7, y + 11), (8, y + 11)], fill=(40, 30, 60, 255))
    d.polygon([(4, y + 13), (11, y + 13), (13, y + 21), (2, y + 21)], fill=coat)
    d.line([(7, y + 13), (7, y + 20)], fill=(236, 240, 250, 220))  # camisa
    d.point([(8, y + 14)], fill=(170, 120, 200, 255))  # gravatinha
    d.polygon([(3, y + 21), (12, y + 21), (8 + bob, 23)], fill=coat)
    return outline(im, GHOST_EDGE)

def lagrima(bob, mouth):
    """Dona Lágrima: menina fantasma de maria-chiquinha e óculos redondos, chora por qualquer coisa."""
    im = canvas(16, 24)
    d = ImageDraw.Draw(im)
    y = 2 + bob
    hair = (170, 190, 230, 200)
    ell(d, (1, y + 3, 4, y + 8), hair)
    ell(d, (11, y + 3, 14, y + 8), hair)
    ell(d, (3, y, 12, y + 10), hair)
    ell(d, (4, y + 3, 11, y + 11), (232, 240, 252, 205))
    for cx in (6, 9):
        d.ellipse((cx - 1, y + 5, cx + 1, y + 7), outline=(60, 70, 110, 255))
    d.point([(5, y + 9), (10, y + 9)], fill=(120, 190, 255, 255))  # lágrimas
    if mouth:
        ell(d, (6, y + 9, 9, y + 11), (40, 30, 60, 255))
    else:
        d.arc((6, y + 9, 9, y + 12), 200, 340, fill=(40, 30, 60, 255))
    d.polygon([(5, y + 11), (10, y + 11), (12, y + 19), (3, y + 19)], fill=(200, 214, 240, 180))
    d.polygon([(3, y + 19), (12, y + 19), (7 - bob, 23)], fill=(200, 214, 240, 150))
    return outline(im, GHOST_EDGE)

for key, fn in (("booh", booh), ("addam", addam), ("lagrima", lagrima)):
    save_strip([fn(0, False), fn(1, False), fn(0, True), fn(1, False)], f"npc.{key}", f"sprites/{key}.png", IDLE_TALK, ghost=True)

# Gnomos (16x16): chapéu pontudo de cores diferentes; parado 0-1, falando 2-3
def gnomo(hat, beard, bob, mouth, trancas=False):
    im = canvas(16, 16)
    d = ImageDraw.Draw(im)
    y = 1 + bob
    d.polygon([(8, y), (3, y + 6), (13, y + 6)], fill=hat)
    ell(d, (5, y + 5, 10, y + 10), (240, 196, 160, 255))
    d.point([(6, y + 7), (9, y + 7)], fill=(30, 30, 50, 255))
    d.point([(7, y + 8)], fill=(220, 120, 110, 255))  # narizinho
    if beard:
        d.polygon([(5, y + 9), (10, y + 9), (8, y + 13)], fill=(244, 244, 248, 255))
    if trancas:
        d.line([(4, y + 7), (3, y + 11)], fill=(214, 150, 70, 255), width=2)
        d.line([(11, y + 7), (12, y + 11)], fill=(214, 150, 70, 255), width=2)
    if mouth:
        d.point([(7, y + 10 if not beard else y + 9)], fill=(60, 30, 40, 255))
    d.rectangle((5, y + 11, 10, 14), fill=(90, 120, 70, 255))
    d.rectangle((5, 14, 6, 15), fill=(80, 50, 30, 255))
    d.rectangle((9, 14, 10, 15), fill=(80, 50, 30, 255))
    return outline(im)

for key, hat, beard, tr in (("mary", (214, 70, 110, 255), False, True), ("mish-mish", (70, 160, 90, 255), True, False),
                            ("wish-wish", (80, 110, 210, 255), True, False)):
    save_strip([gnomo(hat, beard, 0, False, tr), gnomo(hat, beard, 1, False, tr), gnomo(hat, beard, 0, True, tr), gnomo(hat, beard, 1, False, tr)],
               f"npc.{key}", f"sprites/{key}.png", IDLE_TALK)

# ---------- Mapas Tiled (.tmj), gerados a partir de uma descrição de cada sala
FLOOR, FLOOR2, CARPET, TOP, FACE, WOOD, WIN, B1, B2, B3, B4 = [i + 1 for i in range(11)]
WOODF, GRASS, STARS, PAINT = 12, 13, 14, 15  # chãos novos da etapa 5
COLLIDES = (TOP, FACE, WOOD, WIN, B1, B2, B3, B4)


def build_room(name, title, w, h, doors, tables=(), carpet=None, windows=(), banners=(), props=(), spawns=(), npcs=(),
               candles=(), pickups=(), stations=(), boards=(), extra=(), floor_tile=None, props_map=None, decor=()):
    """doors: (lado N/S/L/O, posição, mapa destino, chegada no destino, nome desta chegada[, propriedades extras])."""
    # cada professor fica na sala da sua matéria (content/professores.json)
    npcs = list(npcs) + [(f"prof-{p['id']}", f"npc.prof-{p['id']}", p["x"], p["y"], f"prof-{p['id']}", False)
                         for p in PROFESSORES if p["sala"] == name]
    floor, walls = [], []
    for y in range(h):
        for x in range(w):
            f = floor_tile or (FLOOR2 if (x * 3 + y * 5) % 11 == 0 else FLOOR)
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

    for door in doors:
        side, pos, target, target_spawn, arrive = door[:5]
        more = plist(**door[5]) if len(door) > 5 else []
        # abertura de 2 tiles na parede; a zona da porta fica na borda externa
        if side in "NS":
            ys = (0, 1, 2) if side == "N" else (h - 1,)
            for yy in ys:
                for xx in (pos, pos + 1):
                    walls[yy * w + xx] = 0
            zy = 0 if side == "N" else h - 1
            obj(name=f"porta-{arrive}", type="door", x=pos * 16, y=zy * 16, width=32, height=16,
                properties=[{"name": "target", "type": "string", "value": target},
                            {"name": "spawn", "type": "string", "value": target_spawn}] + more)
            sy = 4 if side == "N" else h - 2
            obj(name=arrive, type="spawn", x=(pos + 1) * 16, y=sy * 16, point=True,
                properties=[{"name": "facing", "type": "string", "value": "down" if side == "N" else "up"}])
        else:
            xx = w - 1 if side == "L" else 0
            for yy in (pos, pos + 1):
                walls[yy * w + xx] = 0
            obj(name=f"porta-{arrive}", type="door", x=xx * 16, y=pos * 16, width=16, height=32,
                properties=[{"name": "target", "type": "string", "value": target},
                            {"name": "spawn", "type": "string", "value": target_spawn}] + more)
            # chega logo na soleira, longe de mesas e bancos encostados na parede
            sx = w - 2 if side == "L" else 1
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
    # enfeites em pixels exatos: (sprite, x da base, y da base, altura que bloqueia ou 0)
    for (sprite, px, py, solid, *more) in decor:
        # 5º campo opcional: propriedades extras (ex.: {"acima": 140} desenha por cima da mesa)
        obj(name=sprite, type="prop", x=px, y=py, point=True,
            properties=[{"name": "sprite", "type": "string", "value": sprite}] + plist(**({"solido": solid} if solid else {}), **(more[0] if more else {})))
    for e in extra:
        obj(**e)

    tmj = {
        "type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal",
        "renderorder": "right-down", "width": w, "height": h, "tilewidth": 16, "tileheight": 16,
        "infinite": False, "nextlayerid": 4, "nextobjectid": oid,
        "properties": [{"name": "nome", "type": "string", "value": title}] + plist(**(props_map or {})),
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
           npcs=[("trinco", "npc.trinco", 13, 5, "trinco", False), ("mary", "npc.mary", 5, 7, "mary", False),
                 # mural com a lista oficial de professores [KAINAN]
                 ("mural-professores", "prop.quadro-desafios", 7, 3, "mural-professores", True)],
           pickups=[("abobora-recepcao", "abobora", 3, 10)])

# Grande Salão: as quatro mesas das casas, com toalha da casa e bancos; sul = Recepção, leste = Cozinha
# ordem oficial das bandeiras [KAINAN 31/10]: vermelho, verde, amarelo, azul
SALAO_MESAS = [("coragem", 3), ("astucia", 8), ("lealdade", 18), ("inteligencia", 23)]


def mesa_posta(casa, tx, ty=6, th=7):
    """Toalha da casa por cima da mesa e um banco de cada lado."""
    bottom = (ty + th) * 16
    return [(f"prop.toalha-{casa}", (tx + 1) * 16, bottom + 4, 0),
            # estandarte da casa de pé na cabeceira da mesa, por cima da toalha (ver WorldScene)
            (f"prop.estandarte-{casa}", (tx + 1) * 16, ty * 16 + 18, 0, {"acima": 140}),
            ("prop.banco", (tx - 1) * 16 + 10, bottom - 16, 80),
            ("prop.banco", (tx + 2) * 16 + 6, bottom - 16, 80)]


build_room("grande-salao", "Grande Salão", 28, 18,
           doors=[("S", 13, "map.recepcao", "do-salao", "da-recepcao"),
                  ("L", 8, "map.cozinha", "do-salao", "da-cozinha"),
                  ("O", 8, "map.corredor", "do-salao", "do-corredor")],
           tables=[(tx, 6, 2, 7) for _, tx in SALAO_MESAS],
           carpet=(12, 3, 15, 16), windows=(6, 21),
           banners=[(4, B1), (9, B3), (18, B4), (23, B2)],  # coragem, astúcia, lealdade, inteligência
           candles=[("vela-1", 1, 3, True), ("vela-2", 26, 3, True), ("vela-3", 1, 15, True),
                    ("vela-4", 26, 15, True), ("vela-5", 11, 4, True), ("vela-6", 16, 4, True)],
           npcs=[("dom-moldura", "npc.dom-moldura", 13, 2, "dom-moldura", True), ("booh", "npc.booh", 21, 4, "booh", False)],
           pickups=[("gelo-seco-salao", "gelo-seco", 21, 14)],
           boards=[("quadro-desafios", "velas-do-salao", 17, 3), ("quadro-corrida", "corrida-levitacao", 10, 3)],
           decor=[d for casa, tx in SALAO_MESAS for d in mesa_posta(casa, tx)]
                 + [("prop.planta", 11 * 16 + 8, 17 * 16, 8), ("prop.planta", 16 * 16 + 8, 17 * 16, 8)],
           extra=[pt("npc", "fuxico", 14, 13, sprite="npc.fuxico", dialogue="fuxico", wall=False),
                  pt("levitavel", "calice-1", 2, 16, kind="calice", sprite="prop.calice"),
                  pt("levitavel", "calice-2", 25, 16, kind="calice", sprite="prop.calice"),
                  pt("levitavel", "calice-3", 25, 4, kind="calice", sprite="prop.calice"),
                  *[pt("socket", f"bandeja-{i + 1}", 5 + i * 2, 4, accepts="calice", mode="levitar", group="corrida", sprite="prop.bandeja") for i in range(3)],
                  zone("trigger", "morgana-salao", 1, 5, 3, 10, dialogue="salao-morgana", actor="npc.morgana", ax=104, ay=88,
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
build_room("gabinete", "Gabinete do Ministro", 16, 11,
           doors=[("S", 7, "map.corredor", "do-gabinete", "do-corredor")],
           tables=[(5, 4, 6, 1)], carpet=(6, 6, 9, 8), windows=(3, 12),
           props=[("prop.estante", 1, 2), ("prop.estante", 2, 2), ("prop.estante", 13, 2), ("prop.estante", 14, 2),
                  ("prop.vela", 6, 4), ("prop.vela", 10, 4), ("prop.vaso", 13, 8)],
           pickups=[("folha-gabinete", "folha-mandragora", 13, 8)],
           extra=[pt("npc", "arquimedes", 8, 3, sprite="npc.arquimedes", dialogue="arquimedes", wall=False,
                     when={"any": [QS("o-diretor", "falar-com-diretor"), FL("jogo:fim")]})])

# Hall da Escada: escada selada, 4 pedestais, sombrinhas guardando a Pedra da Coragem; leste = Corredor
build_room("hall", "Hall da Escada", 22, 14,
           doors=[("L", 5, "map.corredor", "do-hall", "do-corredor"),
                  ("N", 5, "map.ala-professores", "do-hall", "da-ala")],
           carpet=(10, 4, 11, 12), windows=(4, 17),
           props=[("prop.vela", 2, 3), ("prop.vela", 19, 3)],
           extra=[pt("prop", "escadaria", 10, 3, x=11 * 16, sprite="prop.escadaria"),
                  pt("npc", "selo", 10, 3, x=11 * 16, sprite="prop.selo", dialogue="escada", wall=False, when=NOT(FL("ato:1:fim"))),
                  # escada liberada no fim do Ato 1: sobe para a Biblioteca
                  zone("door", "porta-biblioteca", 10, 3, 2, 1, target="map.biblioteca", spawn="do-hall", when=FL("ato:1:fim")),
                  pt("spawn", "da-biblioteca", 10, 4, x=11 * 16, facing="down"),
                  *[pt("socket", f"pedestal-{h}", cx, cy, accepts=f"pedra-{h}", mode="item", group="selo", sprite="prop.pedestal",
                       frame=i, dialogue="selo-quebrado")
                    for i, (h, cx, cy) in enumerate([("coragem", 6, 6), ("inteligencia", 15, 6), ("astucia", 6, 10), ("lealdade", 15, 10)])],
                  pt("npc", "arquimedes", 11, 6, sprite="npc.arquimedes", dialogue="arquimedes", wall=False, when=QS("o-diretor", "ir-ao-hall")),
                  *[pt("creature", f"guarda-{i + 1}", cx, cy, sprite="npc.sombrinha", group="guardas", hp=3, when=QA("o-selo"))
                    for i, (cx, cy) in enumerate([(17, 10), (19, 8), (18, 12)])],
                  pt("pickup", "pedra-coragem", 19, 11, y=11 * 16 + 12, item="pedra-coragem", when=QA("o-selo")),
                  zone("trigger", "morgana-hall", 13, 3, 8, 10, dialogue="hall-morgana", actor="npc.morgana", ax=136, ay=80,
                       when=ALL(QS("o-diretor", "ir-ao-hall"), NOT(FL("visto:morgana-hall"))))])

# ======================= Etapa 5: Ato 2 (Ala das Oficinas) e Ato 3 (a Torre) [FICÇÃO]
ANY = lambda *c: {"any": list(c)}
LIVRE = FL("amelia:livre")
CAPTURADA = FL("amelia:capturada")
RESGATADA = FL("amelia:resgatada")
CONVENCIDA = FL("morgana:convencida")
FIM = FL("jogo:fim")
EMBLEMAS = ALL(*[{"hasItem": f"emblema-{v}"} for v in ("coragem", "inteligencia", "astucia", "lealdade")])
# Modo Kids: bastam os emblemas da Coragem e da Lealdade; a aula de Seres Espectrais é opcional
KIDS = {"kids": True}
EMBLEMAS_OK = ANY(EMBLEMAS, ALL(KIDS, {"hasItem": "emblema-coragem"}, {"hasItem": "emblema-lealdade"}))
AULA = ANY(FL("aula:vencida"), KIDS)

# Biblioteca: o centro do Ato 2. Sul = Hall, leste = Aula, oeste = Estufa, norte = Observatório e Galeria (trancada)
build_room("biblioteca", "Biblioteca", 28, 16,
           doors=[("S", 13, "map.hall", "da-biblioteca", "do-hall"),
                  ("L", 7, "map.sala-espectral", "da-biblioteca", "da-aula"),
                  ("O", 7, "map.estufa", "da-biblioteca", "da-estufa"),
                  ("N", 5, "map.observatorio", "da-biblioteca", "do-observatorio"),
                  ("N", 20, "map.galeria", "da-biblioteca", "da-galeria",
                   dict(when=FL("trancado:map.biblioteca:porta-galeria")))],
           floor_tile=WOODF, carpet=(13, 4, 14, 14), windows=(10, 17),
           # parede do fundo coberta de estantes (cada uma com livros diferentes), menos janelas, espelho e portas
           props=[*[("prop.estante", x, 2) for x in (1, 2, 3, 4, 7, 8, 9, 11, 12, 14, 15, 16, 18, 19, 22, 23, 24, 25, 26)],
                  ("prop.vela", 11, 4), ("prop.vela", 16, 4)],
           npcs=[("aristoteles", "npc.aristoteles", 11, 7, "aristoteles", False), ("mish-mish", "npc.mish-mish", 9, 12, "mish-mish", False)],
           extra=[pt("npc", "espelho", 16, 1, x=17 * 16, sprite="npc.espelho", dialogue="espelho", wall=True),
                  pt("npc", "amelia", 17, 5, sprite="npc.amelia", dialogue="amelia", wall=False,
                     when=ANY(ALL(LIVRE, NOT(CAPTURADA)), FIM)),
                  pt("lock", "porta-galeria", 20, 2, x=21 * 16, sprite="prop.porta-trancada",
                     locked="Trancada por magia. A fechadura brilha cinza, como fuligem."),
                  *[pt("levitavel", f"livro-{i + 1}", lx, ly, kind="livro", sprite="prop.livro")
                    for i, (lx, ly) in enumerate([(26, 13), (5, 13), (22, 4)])],
                  *[pt("socket", f"atril-{i + 1}", 2, 9 + i * 2, accepts="livro", mode="levitar", group="livros", sprite="prop.atril")
                    for i in range(3)],
                  pt("pickup", "carta-1", 26, 5, y=5 * 16 + 12, item="carta-amelia-1", oculto=True, dialogue="carta-1",
                     when=QA("cartas-de-amelia")),
                  zone("trigger", "chegada-biblioteca", 11, 11, 6, 4, dialogue="biblioteca-chegada",
                       when=NOT(FL("visto:biblioteca")))])

# Sala de Criaturas Espectrais: a aula do Prof. Aristóteles, em três levas de espectros invisíveis
# vida pensada para o poder 2 do fim do Ato 1: dois acertos por espectro, quatro no grandão
ondas = [("leva-1", [(6, 6, 4), (15, 6, 4)]),
         ("leva-2", [(4, 10, 4), (11, 5, 4), (17, 10, 4)]),
         ("leva-3", [(5, 5, 4), (16, 5, 4), (11, 10, 8)])]
build_room("sala-espectral", "Aula de Criaturas Espectrais", 22, 14,
           doors=[("O", 6, "map.biblioteca", "da-aula", "da-biblioteca")],
           floor_tile=WOODF, carpet=(4, 4, 17, 11), windows=(5, 16),
           boards=[("quadro-aula", "aula-espectral", 10, 3)],
           candles=[("vela-e1", 3, 3, True), ("vela-e2", 18, 3, True)],
           extra=[*[pt("creature", f"{g}-{i + 1}", cx, cy, sprite="npc.espectro", group=g, hp=hp, oculto=True, challenge="aula-espectral")
                    for g, lst in ondas for i, (cx, cy, hp) in enumerate(lst)],
                  pt("pickup", "carta-3", 19, 11, y=11 * 16 + 12, item="carta-amelia-3", oculto=True, dialogue="carta-3",
                     when=AULA)])

# Estufa: canteiros de mandrágora, a Fada Ramalhete e uma visita rápida da Bellatrix
build_room("estufa", "Estufa", 22, 14,
           doors=[("L", 6, "map.biblioteca", "da-estufa", "da-biblioteca")],
           floor_tile=GRASS, windows=(3, 7, 11, 15),
           stations=[("saco-sementes", "despensa", "prop.saco-sementes", 17, 4, "semente-mandragora")],
           npcs=[("fada-ramalhete", "npc.fada-ramalhete", 8, 5, "fada-ramalhete", False), ("lagrima", "npc.lagrima", 12, 5, "lagrima", False)],
           props=[("prop.vaso", 2, 4), ("prop.vaso", 19, 11), ("prop.vaso", 2, 11)],
           extra=[*[pt("canteiro", f"canteiro-{i + 1}", cx, 9) for i, cx in enumerate((5, 9, 13))],
                  pt("pickup", "carta-2", 3, 12, y=12 * 16 + 12, item="carta-amelia-2", oculto=True, dialogue="carta-2",
                     when=QA("cartas-de-amelia")),
                  *[pt("creature", f"sombra-{i + 1}", cx, cy, sprite="npc.sombrinha", group="sombras", hp=2,
                       when=FL("visto:morgana-estufa")) for i, (cx, cy) in enumerate([(6, 11), (12, 12), (16, 8)])],
                  zone("trigger", "morgana-estufa", 3, 8, 14, 5, dialogue="estufa-morgana", actor="npc.morgana", ax=17 * 16, ay=11 * 16,
                       when=ALL(QA("cartas-de-amelia"), AULA, NOT(FL("visto:morgana-estufa"))))])

# Observatório: quatro mostradores de constelação (um por virtude) e o telescópio
dials = [(4, 8, 0, 2), (7, 10, 1, 3), (12, 10, 2, 0), (15, 8, 3, 1)]  # tx, ty, casa (= resposta), símbolo inicial
build_room("observatorio", "Observatório", 20, 14,
           doors=[("S", 9, "map.biblioteca", "do-observatorio", "da-biblioteca")],
           floor_tile=STARS, windows=(4, 8, 11, 15),
           npcs=[("wish-wish", "npc.wish-wish", 3, 11, "wish-wish", False)],
           extra=[pt("npc", "telescopio", 9, 5, sprite="prop.telescopio", dialogue="telescopio", wall=False),
                  *[pt("dial", f"mostrador-{i + 1}", dx, dy, group="estrelas", house=hz, answer=hz, start=st,
                       activeWhen=LIVRE, inactive="O ponteiro está preso numa crosta de fuligem. Não gira.")
                    for i, (dx, dy, hz, st) in enumerate(dials)],
                  pt("pickup", "carta-4", 17, 4, y=4 * 16 + 12, item="carta-amelia-4", oculto=True, dialogue="carta-4", when=LIVRE),
                  zone("trigger", "morgana-observatorio", 7, 9, 6, 3, dialogue="observatorio-morgana", actor="npc.morgana", ax=10 * 16, ay=12 * 16,
                       when=ALL(QS("cartas-de-amelia", "abrir-galeria"), NOT(FL("visto:morgana-observatorio"))))])

# Galeria dos Quadros: quatro quadros-portais (as virtudes), o retrato do Arquimedes e a barreira do Coração
PORTAIS = [("coragem", 4, "pego:map.quadro-coragem:emblema"), ("inteligencia", 9, "pego:map.quadro-inteligencia:emblema"),
           ("astucia", 21, "pego:map.quadro-astucia:emblema"), ("lealdade", 26, "amelia:resgatada")]
build_room("galeria", "Galeria dos Quadros", 32, 14,
           doors=[("S", 15, "map.biblioteca", "da-galeria", "da-biblioteca"),
                  ("L", 7, "map.coracao", "da-galeria", "do-coracao",
                   dict(when=EMBLEMAS_OK, locked="A barreira empurra você de volta. Faltam emblemas."))],
           floor_tile=PAINT, carpet=(3, 5, 28, 6),
           candles=[("vela-g1", 2, 3, True), ("vela-g2", 29, 3, True)],
           npcs=[("quadro-arquimedes", "npc.quadro-arquimedes", 15, 1, "quadro-arquimedes", True), ("addam", "npc.addam", 6, 9, "addam", False)],
           extra=[*[pt("painting", f"quadro-{v}", px, 2, x=px * 16 + 16, index=i, doneFlag=done) for i, (v, px, done) in enumerate(PORTAIS)],
                  *[zone("door", f"porta-quadro-{v}", px, 3, 2, 1, target=f"map.quadro-{v}", spawn="da-galeria", when=CAPTURADA,
                         locked="Só tinta e moldura... por enquanto.") for v, px, _ in PORTAIS],
                  *[pt("spawn", f"do-quadro-{v}", px, 5, x=px * 16 + 16, facing="down") for v, px, _ in PORTAIS],
                  pt("npc", "barreira", 29, 8, x=30 * 16, sprite="prop.barreira", dialogue="barreira", wall=True, when=NOT(EMBLEMAS_OK)),
                  pt("npc", "amelia", 16, 9, sprite="npc.amelia", dialogue="amelia", wall=False,
                     when=ANY(ALL(LIVRE, NOT(CAPTURADA)), ALL(RESGATADA, NOT(FIM)))),
                  zone("trigger", "captura-amelia", 12, 7, 8, 5, dialogue="galeria-morgana", actor="npc.morgana", ax=20 * 16, ay=9 * 16,
                       when=ALL(LIVRE, NOT(CAPTURADA)))])

# Quadro da Coragem: sala escura cheia de sombrinhas; acenda as velas para enxergar
build_room("quadro-coragem", "Quadro da Coragem", 24, 14,
           doors=[("S", 11, "map.galeria", "do-quadro-coragem", "da-galeria")],
           floor_tile=PAINT, props_map=dict(escuro=True),
           tables=[(5, 5, 2, 2), (17, 5, 2, 2), (5, 9, 2, 2), (17, 9, 2, 2)],
           candles=[("vela-q1", 3, 4, False), ("vela-q2", 20, 4, False), ("vela-q3", 3, 11, False), ("vela-q4", 20, 11, False),
                    ("vela-q5", 11, 7, False)],
           extra=[*[pt("creature", f"sombra-{i + 1}", cx, cy, sprite="npc.sombrinha", group="sombras", hp=2)
                    for i, (cx, cy) in enumerate([(8, 4), (15, 4), (9, 10), (14, 11)])],
                  pt("pickup", "emblema", 12, 3, y=3 * 16 + 12, item="emblema-coragem", dialogue="emblema-coragem"),
                  zone("trigger", "intro-coragem", 9, 10, 6, 3, dialogue="quadro-coragem", when=NOT(FL("visto:quadro-coragem")))])

# Quadro da Inteligência: o raio de luz precisa chegar ao cristal com três espelhos
build_room("quadro-inteligencia", "Quadro da Inteligência", 18, 12,
           doors=[("S", 8, "map.galeria", "do-quadro-inteligencia", "da-galeria")],
           floor_tile=PAINT, tables=[(9, 3, 1, 1)],
           extra=[pt("beam-source", "fonte", 2, 3, dx=1, dy=0),
                  pt("beam-target", "cristal", 12, 4),
                  *[pt("socket", f"suporte-{n}", sx, sy, accepts="espelho", mode="levitar", group="espelhos", turn=tr, sprite="prop.suporte-espelho")
                    for n, sx, sy, tr in [("a", 5, 3, "\\"), ("b", 5, 8, "\\"), ("c", 12, 8, "/"), ("d", 9, 6, "/"), ("e", 15, 5, "\\")]],
                  *[pt("levitavel", f"espelho-{i + 1}", ex, ey, kind="espelho", sprite="prop.espelho-luz")
                    for i, (ex, ey) in enumerate([(2, 9), (14, 9), (16, 7)])],
                  pt("pickup", "emblema", 15, 3, y=3 * 16 + 12, item="emblema-inteligencia", dialogue="emblema-inteligencia",
                     when=FL("luz:map.quadro-inteligencia:cristal")),
                  zone("trigger", "intro-inteligencia", 6, 8, 6, 3, dialogue="quadro-inteligencia", when=NOT(FL("visto:quadro-inteligencia")))])

# Quadro da Astúcia: passar pelos olhos-sentinela sem ser visto
build_room("quadro-astucia", "Quadro da Astúcia", 30, 14,
           doors=[("S", 2, "map.galeria", "do-quadro-astucia", "da-galeria")],
           floor_tile=PAINT,
           tables=[(10, 3, 1, 5), (10, 10, 1, 3), (19, 3, 1, 3), (19, 8, 1, 5)],
           spawns=[("cp-1", 12, 11), ("cp-2", 21, 11)],
           extra=[pt("sentinel", "olho-1", 6, 3, sprite="npc.olho", axis="y", range=8, speed=26),
                  pt("sentinel", "olho-2", 13, 7, sprite="npc.olho", axis="x", range=5, speed=24),
                  pt("sentinel", "olho-3", 23, 3, sprite="npc.olho", axis="y", range=8, speed=30),
                  pt("sentinel", "olho-4", 25, 9, sprite="npc.olho", axis="x", range=3, speed=22),
                  zone("checkpoint", "cp-1", 11, 9, 3, 4, spawn="cp-1"),
                  zone("checkpoint", "cp-2", 20, 9, 3, 4, spawn="cp-2"),
                  pt("pickup", "emblema", 28, 4, y=4 * 16 + 12, item="emblema-astucia", dialogue="emblema-astucia"),
                  zone("trigger", "intro-astucia", 1, 9, 4, 4, dialogue="quadro-astucia", when=NOT(FL("visto:quadro-astucia")))])

# Quadro da Lealdade: a Amélia acorrentada por três âncoras de fuligem
build_room("quadro-lealdade", "Quadro da Lealdade", 22, 14,
           doors=[("S", 10, "map.galeria", "do-quadro-lealdade", "da-galeria")],
           floor_tile=PAINT, carpet=(9, 4, 12, 7),
           extra=[pt("npc", "amelia", 10, 4, x=11 * 16, sprite="npc.amelia", dialogue="amelia-presa", wall=False, when=NOT(RESGATADA)),
                  *[pt("creature", f"ancora-{i + 1}", ax_, ay_, sprite="npc.ancora", group="correntes", hp=3, parado=True)
                    for i, (ax_, ay_) in enumerate([(7, 5), (15, 5), (11, 8)])],
                  *[pt("creature", f"sombra-{i + 1}", cx, cy, sprite="npc.sombrinha", group="sombras", hp=2)
                    for i, (cx, cy) in enumerate([(4, 9), (18, 9), (11, 11)])],
                  zone("trigger", "intro-lealdade", 8, 10, 6, 3, dialogue="quadro-lealdade", when=NOT(FL("visto:quadro-lealdade")))])

# Coração do Castelo: o duelo com a Bellatrix e o final
build_room("coracao", "Coração do Castelo", 24, 16,
           doors=[("O", 7, "map.galeria", "do-coracao", "da-galeria")],
           floor_tile=STARS, carpet=(10, 4, 13, 13),
           candles=[("vela-h1", 3, 3, True), ("vela-h2", 20, 3, True), ("vela-h3", 3, 13, True), ("vela-h4", 20, 13, True)],
           extra=[pt("npc", "coracao", 11, 3, x=12 * 16, sprite="npc.coracao", dialogue="coracao", wall=False, wide=True),
                  pt("boss", "morgana", 12, 8, x=12 * 16, sprite="npc.morgana", when=NOT(CONVENCIDA)),
                  *[pt("boss-spot", f"ponto-{i + 1}", bx, by) for i, (bx, by) in enumerate([(6, 6), (18, 6), (6, 11), (18, 11)])],
                  zone("trigger", "duelo", 1, 5, 4, 6, dialogue="morgana-duelo", when=NOT(FL("visto:morgana-duelo"))),
                  pt("npc", "morgana-npc", 15, 7, sprite="npc.morgana", dialogue="morgana-final", wall=False, when=CONVENCIDA),
                  pt("npc", "amelia", 8, 7, sprite="npc.amelia", dialogue="amelia", wall=False, when=ALL(RESGATADA, CONVENCIDA)),
                  pt("npc", "aristoteles", 8, 10, sprite="npc.aristoteles", dialogue="aristoteles", wall=False, when=CONVENCIDA),
                  pt("npc", "arquimedes", 15, 10, sprite="npc.arquimedes", dialogue="arquimedes", wall=False, when=FIM)])

for key in ("biblioteca", "sala-espectral", "estufa", "observatorio", "galeria",
            "quadro-coragem", "quadro-inteligencia", "quadro-astucia", "quadro-lealdade", "coracao"):
    MANIFEST["maps"][f"map.{key}"] = {"url": f"maps/{key}.tmj", "tilesets": ["tiles.castelo"]}


for key in ("corredor", "gabinete", "hall"):
    MANIFEST["maps"][f"map.{key}"] = {"url": f"maps/{key}.tmj", "tilesets": ["tiles.castelo"]}
# ---------- Etapa 6: porão secreto, Mapa dos Segredos e Estrelas Perdidas [FICÇÃO, pedido do kainan]
def add_objects(key, objs):
    """Acrescenta objetos a um mapa já gerado (sem mexer na descrição da sala)."""
    path = os.path.join(ROOT, "maps", f"{key}.tmj")
    with open(path) as fh:
        m = json.load(fh)
    w = m["width"]
    walls = next(l for l in m["layers"] if l["name"] == "paredes")["data"]
    layer = next(l for l in m["layers"] if l["type"] == "objectgroup")
    for o in objs:
        tx, ty = int(o["x"] // 16), int((o["y"] - 1) // 16)
        assert o.get("width") or walls[ty * w + tx] == 0, f"{key}: {o['name']} em cima de parede ({tx},{ty})"
        o.setdefault("width", 0)
        o.setdefault("height", 0)
        o["id"] = m["nextobjectid"]
        m["nextobjectid"] += 1
        layer["objects"].append(o)
    with open(path, "w") as fh:
        json.dump(m, fh)


# Porão secreto: escuro, baús que se enchem sozinhos, sombrinhas que sempre voltam e um desafio repetível
ondas = [("onda-1", [(5, 8), (16, 8), (11, 11)]), ("onda-2", [(4, 6), (17, 6), (6, 11), (15, 11)]),
         ("onda-3", [(3, 9), (18, 9), (8, 5), (13, 5), (10, 12)])]
build_room("porao", "Porão Secreto", 22, 14,
           doors=[("N", 10, "map.cozinha", "do-porao", "da-cozinha")],
           windows=(), tables=[(16, 3, 4, 1)],
           props=[("prop.estante", 2, 2), ("prop.estante", 3, 2), ("prop.caixote", 6, 3), ("prop.caixote", 7, 3),
                  ("prop.vaso", 19, 12), ("prop.caixote", 2, 12), ("prop.escada-porao", 10, 2), ("prop.escada-porao", 11, 2)],
           candles=[("vela-p1", 5, 4, True), ("vela-p2", 15, 4, False), ("vela-p3", 3, 10, False), ("vela-p4", 18, 10, True)],
           boards=[("quadro-porao", "sombras-do-porao", 13, 3)],
           props_map=dict(escuro=True),
           extra=[*[pt("chest", f"bau-{i + 1}", cx, cy) for i, (cx, cy) in enumerate([(2, 6), (19, 6), (4, 12), (17, 12)])],
                  pt("pickup", "mapa", 10, 7, y=7 * 16 + 12, item="mapa-dos-segredos"),
                  pt("pickup", "estrela-porao", 19, 3, y=3 * 16 + 12, item="estrela-perdida", oculto=True),
                  *[pt("creature", f"sombra-p{i + 1}", cx, cy, sprite="npc.sombrinha", group="porao", hp=2, renasce=True)
                    for i, (cx, cy) in enumerate([(7, 9), (14, 10)])],
                  *[pt("creature", f"{g}-{i + 1}", cx, cy, sprite="npc.sombrinha", group=g, hp=3, challenge="sombras-do-porao")
                    for g, lst in ondas for i, (cx, cy) in enumerate(lst)]])
MANIFEST["maps"]["map.porao"] = {"url": "maps/porao.tmj", "tilesets": ["tiles.castelo"]}

# Cozinha: alçapão trancado no canto (abre com a Chave do Porão), com a chegada de quem volta do porão
add_objects("cozinha", [
    pt("prop", "prop.alcapao", 4, 4, sprite="prop.alcapao"),
    zone("door", "porta-porao", 4, 4, 1, 1, target="map.porao", spawn="da-cozinha", when={"hasItem": "chave-do-porao"},
         locked="Um alçapão trancado no chão... a fechadura é bem velha."),
    pt("spawn", "do-porao", 4, 6, y=6 * 16 + 8, facing="down"),
])
# A chave fica escondida atrás da mesa do Gabinete do Ministro
add_objects("gabinete", [pt("pickup", "chave-porao", 14, 8, y=8 * 16 + 12, item="chave-do-porao")])

# Ala dos Professores [KAINAN 31/10]: um corredor ao norte do Hall com seis salas de aula.
# Cada sala tem o quadro de um desafio da matéria; vencer os seis dá o Zaparatar
# (progression.series.professores). Quem dá aula em cada sala está em content/professores.json.
SALAS_PROF = [  # (sala, nome, porta na parede norte da Ala)
    ("feiticos", "Sala de Feitiços", 2),
    ("pocoes", "Masmorra de Poções", 7),
    ("herbologia", "Estufa de Aula", 13),
    ("adivinhacao", "Torre de Adivinhação", 18),
    ("literatura", "Sala de Literatura Mágica", 24),
    ("defesa", "Sala de Defesa", 29),
]
build_room("ala-professores", "Ala dos Professores", 32, 10,
           doors=[("S", 5, "map.hall", "da-ala", "do-hall")]
                 + [("N", px, f"map.aula-{sid}", "da-ala", f"de-{sid}") for sid, _, px in SALAS_PROF],
           carpet=(1, 5, 30, 6), windows=(11, 21),
           candles=[("vela-a1", 1, 3, True), ("vela-a2", 30, 3, True)])


def aula(sid, floor, carpet=None, **kw):
    """Sala de aula 20x14 com a porta ao sul, para a Ala, e o quadro do desafio na parede."""
    title = next(n for s, n, _ in SALAS_PROF if s == sid)
    build_room(f"aula-{sid}", title, 20, 14,
               doors=[("S", 9, "map.ala-professores", f"de-{sid}", "da-ala")],
               floor_tile=floor, carpet=carpet, windows=(4, 15),
               boards=[(f"quadro-{sid}", f"aula-{sid}", 10, 3)], **kw)


# Feitiços: oito velas que se apagam; acender todas com Lumen antes do tempo
VELAS_F = [(3, 5), (16, 5), (2, 8), (17, 8), (5, 11), (14, 11), (7, 7), (12, 7)]
aula("feiticos", FLOOR, carpet=(4, 5, 15, 10),
     candles=[(f"vf-{i + 1}", x, y, True) for i, (x, y) in enumerate(VELAS_F)])
# Poções: levar os três frascos flutuando até os caldeirões
aula("pocoes", FLOOR2,
     extra=[*[pt("socket", f"caldeirao-{i + 1}", x, 6, accepts="frasco", mode="levitar", group="pocoes", sprite="prop.caldeirao")
              for i, x in enumerate((5, 10, 15))],
            *[pt("levitavel", f"frasco-{i + 1}", x, y, kind="frasco", sprite="prop.frasco")
              for i, (x, y) in enumerate([(3, 11), (13, 11), (16, 9)])]])
# Herbologia: plantar as três mudas nos canteiros (levitando os vasos)
aula("herbologia", GRASS,
     extra=[*[pt("socket", f"canteiro-a{i + 1}", x, 7, accepts="vaso", mode="levitar", group="mudas", sprite="prop.canteiro")
              for i, x in enumerate((5, 10, 15))],
            *[pt("levitavel", f"vaso-{i + 1}", x, y, kind="vaso", sprite="prop.vaso")
              for i, (x, y) in enumerate([(3, 11), (13, 12), (16, 10)])]])
# Adivinhação: visões invisíveis em três levas (Revelar para ver, Lumen para dissipar)
VISOES = [("visao-1", [(5, 6, 3), (14, 6, 3)]), ("visao-2", [(4, 10, 3), (10, 6, 3), (16, 10, 3)]),
          ("visao-3", [(6, 7, 3), (14, 7, 3), (10, 10, 6)])]
aula("adivinhacao", STARS,
     extra=[pt("creature", f"{g}-{i + 1}", cx, cy, sprite="npc.espectro", group=g, hp=hp, oculto=True, challenge="aula-adivinhacao")
            for g, lst in VISOES for i, (cx, cy, hp) in enumerate(lst)])
# Literatura Mágica: devolver os livros fujões aos atris
aula("literatura", WOODF, carpet=(5, 5, 14, 10),
     npcs=[("aristoteles-aula", "npc.aristoteles", 14, 3, "aula-literatura", False)],
     extra=[*[pt("socket", f"atril-l{i + 1}", x, y, accepts="livro", mode="levitar", group="leitura", sprite="prop.atril")
              for i, (x, y) in enumerate([(4, 6), (15, 6), (10, 9)])],
            *[pt("levitavel", f"livro-l{i + 1}", x, y, kind="livro", sprite="prop.livro")
              for i, (x, y) in enumerate([(2, 11), (6, 12), (17, 11)])]])
# Defesa: três ataques de sombrinhas; o Escudo ajuda a aguentar
ATAQUES = [("ataque-1", [(5, 6), (14, 6), (10, 10)]), ("ataque-2", [(4, 8), (15, 8), (7, 11), (12, 11)]),
           ("ataque-3", [(5, 6), (14, 6), (4, 10), (15, 10), (10, 8)])]
aula("defesa", FLOOR, carpet=(3, 5, 16, 11),
     extra=[pt("creature", f"{g}-{i + 1}", cx, cy, sprite="npc.sombrinha", group=g, hp=2, challenge="aula-defesa")
            for g, lst in ATAQUES for i, (cx, cy) in enumerate(lst)])
for key in ["ala-professores"] + [f"aula-{sid}" for sid, _, _ in SALAS_PROF]:
    MANIFEST["maps"][f"map.{key}"] = {"url": f"maps/{key}.tmj", "tilesets": ["tiles.castelo"]}

# Enfeites para as salas não parecerem vazias: móveis encostados nas paredes e nos cantos,
# longe das portas e dos caminhos dos enigmas. "solido" = altura da base que bloqueia.
def enfeite(sprite, tx, ty, solido=0):
    return pt("prop", sprite, tx, ty, sprite=sprite, **({"solido": solido} if solido else {}))


def mesa(sprite, tx, ty):
    """Móvel de 2 tiles de largura: a base fica entre o tile tx e o seguinte."""
    return pt("prop", sprite, tx, ty, x=(tx + 1) * 16, sprite=sprite, solido=10)


def tapete(tx, ty, frame, dy=0):
    """Tapete no chão (2 tiles), desenhado embaixo de todo mundo; dy desce em pixels (embaixo de uma mesa)."""
    return pt("prop", "prop.tapete", tx, ty, x=(tx + 1) * 16, y=(ty + 1) * 16 + dy, sprite="prop.tapete", frame=frame)


ENFEITES = {
    "recepcao": [enfeite("prop.armadura", 7, 3, 8), enfeite("prop.armadura", 12, 3, 8),
                 enfeite("prop.planta", 1, 3, 8), enfeite("prop.planta", 18, 3, 8),
                 enfeite("prop.barril", 17, 8, 8), enfeite("prop.barril", 18, 8, 8),
                 enfeite("prop.prateleira-pocoes", 14, 3), enfeite("prop.caixote", 1, 11, 8),
                 enfeite("prop.relogio", 4, 3, 6), enfeite("prop.candelabro", 16, 11, 6), tapete(3, 8, 0)],
    "cozinha": [enfeite("prop.prateleira-pocoes", 7, 3), enfeite("prop.prateleira-pocoes", 11, 3),
                enfeite("prop.barril", 1, 12, 8), enfeite("prop.barril", 2, 12, 8),
                enfeite("prop.caixote", 20, 8, 8), enfeite("prop.caixote", 20, 9, 8), enfeite("prop.planta", 14, 12, 8),
                enfeite("prop.candelabro", 1, 4, 6)],
    "corredor": [enfeite("prop.armadura", 20, 3), enfeite("prop.armadura", 26, 3),
                 enfeite("prop.planta", 5, 8), enfeite("prop.planta", 11, 8), enfeite("prop.planta", 22, 8), enfeite("prop.planta", 27, 8),
                 # longe das caixas que se empurram (colunas 9 a 24)
                 enfeite("prop.relogio", 5, 3, 6), enfeite("prop.candelabro", 1, 8, 6), enfeite("prop.candelabro", 32, 6, 6),
                 tapete(6, 6, 0), tapete(26, 6, 1)],
    "gabinete": [enfeite("prop.prateleira-pocoes", 11, 3), enfeite("prop.planta", 2, 8, 8),
                 enfeite("prop.relogio", 14, 3, 6), enfeite("prop.globo", 2, 4, 6), enfeite("prop.candelabro", 13, 5, 6)],
    "hall": [enfeite("prop.armadura", 8, 3, 8), enfeite("prop.armadura", 13, 3, 8),
             enfeite("prop.planta", 1, 4, 8), enfeite("prop.barril", 4, 12, 8),
             enfeite("prop.relogio", 19, 4, 6), enfeite("prop.candelabro", 1, 9, 6)],
    "biblioteca": [enfeite("prop.planta", 12, 14), enfeite("prop.planta", 15, 14),
                   # mesas de leitura no lugar das mesas compridas, com livro aberto e vela
                   mesa("prop.mesa-leitura", 3, 5), mesa("prop.mesa-leitura", 8, 5),
                   mesa("prop.mesa-leitura", 19, 10), mesa("prop.mesa-leitura", 24, 10),
                   enfeite("prop.candelabro", 1, 4, 6), enfeite("prop.candelabro", 26, 9, 6),
                   enfeite("prop.globo", 18, 13, 6), enfeite("prop.pilha-livros", 6, 4), enfeite("prop.pilha-livros", 21, 5),
                   tapete(3, 5, 1, 14), tapete(8, 5, 0, 14), tapete(19, 10, 0, 14), tapete(24, 10, 1, 14)],
    "estufa": [enfeite("prop.planta", 4, 3), enfeite("prop.planta", 10, 3), enfeite("prop.planta", 15, 3),
               enfeite("prop.planta", 20, 3, 8), enfeite("prop.caixote", 1, 8, 8), enfeite("prop.barril", 1, 12, 8)],
    "galeria": [enfeite("prop.planta", 3, 12), enfeite("prop.planta", 28, 12),
                enfeite("prop.armadura", 9, 12), enfeite("prop.armadura", 22, 12),
                # estátuas ao lado do retrato do Ministro, candelabros nos cantos e tapete no meio
                enfeite("prop.estatua", 14, 3, 8), enfeite("prop.estatua", 18, 3, 8),
                enfeite("prop.candelabro", 1, 4, 6), enfeite("prop.candelabro", 30, 4, 6), tapete(14, 10, 0)],
    "porao": [enfeite("prop.barril", 1, 8, 8), enfeite("prop.barril", 1, 9, 8), enfeite("prop.prateleira-pocoes", 8, 3),
              enfeite("prop.caixote", 20, 11, 8)],
    # etapa 6.3: móveis nas salas que ainda estavam vazias, longe das portas e dos enigmas
    "grande-salao": [enfeite("prop.candelabro", 1, 5, 6), enfeite("prop.candelabro", 26, 5, 6),
                     enfeite("prop.armadura", 8, 16, 8), enfeite("prop.armadura", 19, 16, 8)],
    "observatorio": [enfeite("prop.globo", 2, 3, 6), mesa("prop.mesa-leitura", 8, 3), enfeite("prop.pilha-livros", 12, 3),
                     enfeite("prop.candelabro", 18, 7, 6), tapete(9, 7, 1)],
    "sala-espectral": [enfeite("prop.estante", 5, 3, 8), enfeite("prop.estante", 15, 3, 8),
                       enfeite("prop.candelabro", 1, 9, 6), enfeite("prop.candelabro", 20, 9, 6)],
    "ala-professores": [enfeite("prop.planta", 4, 3, 8), enfeite("prop.planta", 11, 3, 8), enfeite("prop.planta", 22, 3, 8),
                        enfeite("prop.armadura", 16, 3, 8), enfeite("prop.relogio", 27, 3, 6)],
    "aula-feiticos": [enfeite("prop.candelabro", 3, 3, 6), enfeite("prop.planta", 1, 12, 8), enfeite("prop.planta", 18, 12, 8),
        enfeite("prop.estante", 1, 3, 8), enfeite("prop.estante", 18, 3, 8), enfeite("prop.globo", 6, 3, 6)],
    "aula-pocoes": [enfeite("prop.barril", 6, 3, 8), enfeite("prop.planta", 18, 12, 8),
        enfeite("prop.prateleira-pocoes", 2, 3), enfeite("prop.prateleira-pocoes", 16, 3), enfeite("prop.barril", 1, 8, 8),
                    enfeite("prop.barril", 18, 8, 8), enfeite("prop.caixote", 1, 12, 8)],
    "aula-herbologia": [enfeite("prop.vaso", 4, 3), enfeite("prop.planta", 18, 12, 8),
        enfeite("prop.planta", 1, 3, 8), enfeite("prop.planta", 18, 3, 8), enfeite("prop.planta", 1, 12, 8),
                        enfeite("prop.saco-sementes", 6, 3, 6)],
    "aula-adivinhacao": [mesa("prop.mesa-leitura", 5, 3), enfeite("prop.pilha-livros", 14, 3), enfeite("prop.planta", 1, 12, 8), enfeite("prop.planta", 18, 12, 8),
        enfeite("prop.globo", 2, 3, 6), enfeite("prop.telescopio", 17, 3, 6), enfeite("prop.candelabro", 1, 8, 6),
                         enfeite("prop.candelabro", 18, 8, 6)],
    "aula-literatura": [enfeite("prop.candelabro", 4, 3, 6),
        enfeite("prop.estante", 1, 3, 8), enfeite("prop.estante", 2, 3, 8), enfeite("prop.estante", 17, 3, 8),
                        enfeite("prop.estante", 18, 3, 8), enfeite("prop.pilha-livros", 6, 3)],
    "aula-defesa": [enfeite("prop.candelabro", 4, 3, 6), enfeite("prop.planta", 1, 12, 8), enfeite("prop.planta", 18, 12, 8),
        enfeite("prop.armadura", 2, 3, 8), enfeite("prop.armadura", 17, 3, 8), enfeite("prop.estandarte-coragem", 6, 3, 4),
                    enfeite("prop.estandarte-lealdade", 14, 3, 4)],
    # cada quadro de casa ganha os estandartes da sua casa
    "quadro-coragem": [enfeite("prop.estandarte-coragem", 6, 3, 4), enfeite("prop.estandarte-coragem", 17, 3, 4),
                       enfeite("prop.candelabro", 1, 7, 6), enfeite("prop.candelabro", 22, 7, 6)],
    "quadro-astucia": [enfeite("prop.estandarte-astucia", 2, 3, 4), enfeite("prop.estandarte-astucia", 27, 3, 4)],
    "quadro-lealdade": [enfeite("prop.estandarte-lealdade", 8, 3, 4), enfeite("prop.estandarte-lealdade", 14, 3, 4),
                        enfeite("prop.candelabro", 1, 3, 6), enfeite("prop.candelabro", 20, 3, 6)],
    # fora da linha 3, por onde passa o raio de luz do enigma
    "quadro-inteligencia": [enfeite("prop.estandarte-inteligencia", 1, 5, 4), enfeite("prop.estandarte-inteligencia", 16, 6, 4)],
}
for key, objs in ENFEITES.items():
    add_objects(key, objs)

# 12 Estrelas Perdidas: 10 espalhadas pelo castelo (algumas só com Revelar), 1 no porão e 1 no desafio do porão
ESTRELAS = [
    ("recepcao", 17, 10, False), ("grande-salao", 6, 14, False), ("cozinha", 20, 12, False), ("corredor", 31, 8, False),
    ("hall", 2, 12, False), ("biblioteca", 26, 14, True), ("sala-espectral", 20, 12, True), ("estufa", 20, 12, True),
    ("observatorio", 18, 12, False), ("galeria", 30, 12, True),
]
for i, (key, tx, ty, hidden) in enumerate(ESTRELAS):
    add_objects(key, [pt("pickup", f"estrela-{i + 1}", tx, ty, y=ty * 16 + 12, item="estrela-perdida", **({"oculto": True} if hidden else {}))])

with open(MANIFEST_PATH, "w", encoding="utf-8") as fh:
    json.dump(MANIFEST, fh, ensure_ascii=False, indent=2)

print("assets provisórios gerados em", os.path.abspath(ROOT))

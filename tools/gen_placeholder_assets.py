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

# ---------- Mapas Tiled (.tmj), gerados a partir de uma descrição de cada sala
FLOOR, FLOOR2, CARPET, TOP, FACE, WOOD, WIN, B1, B2, B3, B4 = [i + 1 for i in range(11)]
COLLIDES = (TOP, FACE, WOOD, WIN, B1, B2, B3, B4)


def build_room(name, title, w, h, doors, tables=(), carpet=None, windows=(), banners=(), props=(), spawns=(), npcs=(),
               candles=(), pickups=(), stations=(), boards=()):
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
    for (sname, station, sprite, px, py) in stations:
        obj(name=sname, type="station", x=px * 16 + 8, y=py * 16 + 16, point=True,
            properties=[{"name": "station", "type": "string", "value": station},
                        {"name": "sprite", "type": "string", "value": sprite}])
    for (bname, challenge, px, py) in boards:
        obj(name=bname, type="challenge", x=px * 16 + 8, y=py * 16 + 16, point=True,
            properties=[{"name": "challenge", "type": "string", "value": challenge},
                        {"name": "sprite", "type": "string", "value": "prop.quadro-desafios"}])
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
           tables=[(12, 6, 4, 1)],  # balcão da recepção, com o Trinco atrás
           props=[("prop.vela", 3, 4), ("prop.vela", 16, 4)],
           spawns=[("inicio", 9, 10)],
           npcs=[("trinco", "npc.trinco", 13, 5, "trinco", False)],
           pickups=[("abobora-recepcao", "abobora", 3, 10)])

# Grande Salão: quatro mesas das casas; sul = Recepção, leste = Cozinha
build_room("grande-salao", "Grande Salão", 40, 24,
           doors=[("S", 19, "map.recepcao", "do-salao", "da-recepcao"),
                  ("L", 11, "map.cozinha", "do-salao", "da-cozinha")],
           tables=[(6, 8, 3, 8), (12, 8, 3, 8), (25, 8, 3, 8), (31, 8, 3, 8)],
           carpet=(17, 4, 22, 22), windows=(6, 14, 25, 33),
           banners=[(9, B1), (12, B2), (27, B3), (30, B4)],
           candles=[("vela-1", 5, 4, True), ("vela-2", 34, 4, True), ("vela-3", 5, 19, True),
                    ("vela-4", 34, 19, True), ("vela-5", 16, 5, True), ("vela-6", 23, 5, True)],
           npcs=[("dom-moldura", "npc.dom-moldura", 19, 2, "dom-moldura", True)],
           pickups=[("gelo-seco-salao", "gelo-seco", 30, 18)],
           boards=[("quadro-desafios", "velas-do-salao", 24, 3)])

# Cozinha bruxa: caldeirões; oeste = Grande Salão
build_room("cozinha", "Cozinha Bruxa", 22, 14,
           doors=[("O", 6, "map.grande-salao", "da-cozinha", "do-salao")],
           tables=[(8, 6, 6, 2)], windows=(5, 16),
           props=[("prop.caldeirao", 5, 9), ("prop.caldeirao", 16, 9)],
           stations=[("caldeirao", "caldeirao", "prop.caldeirao", 16, 4)],
           candles=[("vela-a", 9, 6, False), ("vela-b", 13, 6, False)],
           pickups=[("suco-cozinha", "suco-colorido", 19, 11), ("cacau-cozinha", "cacau", 3, 11)],
           npcs=[("dona-brasa", "npc.dona-brasa", 11, 9, "dona-brasa", False)])

print("assets provisórios gerados em", os.path.abspath(ROOT))

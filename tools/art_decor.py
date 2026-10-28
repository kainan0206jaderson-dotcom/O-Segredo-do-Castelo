"""Decoração das salas: toalhas das casas nas mesas do Grande Salão, bancos, barris,
plantas, prateleira de poções e armaduras. Tudo desenhado pixel a pixel.

As toalhas usam as cores e os brasões das casas definidos em gen_final_art.py.
"""
import os

from PIL import Image

from art_lib import ROOT, mix, ramp

INK = (26, 20, 38)
GOLD = [(120, 84, 30), (170, 124, 44), (214, 170, 64), (250, 214, 92)]


def canvas(w, h):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return im, im.load()


def put(px, x, y, c, w, h):
    if 0 <= x < w and 0 <= y < h:
        px[x, y] = tuple(c[:3]) + (255,)


def save(im, name):
    im.save(os.path.join(ROOT, "sprites", name))


# ---------------------------------------------------------------- toalha das casas

CLOTH_W, CLOTH_H = 24, 118


def tablecloth(color, crest):
    """Toalha comprida em cima da mesa (vista de cima), com barra dourada, pratos e
    cálices dos dois lados, e a ponta com o brasão caindo pela frente da mesa."""
    w, h = CLOTH_W, CLOTH_H
    im, px = canvas(w, h)
    r = ramp(color)
    tip_from = h - 14  # daqui para baixo a toalha pende na frente da mesa
    for y in range(h):
        for x in range(w):
            if y >= tip_from:
                # ponta em V
                depth = y - tip_from
                if abs(x - (w - 1) / 2) > (w / 2) - depth * 0.55:
                    continue
            c = r[2] if (y // 3 + x) % 9 else mix(r[2], r[3], 0.35)
            if y >= tip_from:
                c = r[1] if (x + y) % 6 else mix(r[1], r[2], 0.5)  # parte que pende fica na sombra
            if x in (0, w - 1):
                c = r[0]
            elif x in (1, w - 2) or y == 0:
                c = GOLD[2] if (y % 4) else GOLD[3]
            put(px, x, y, c, w, h)
    # barra dourada no começo da ponta e na borda do V
    for x in range(w):
        if px[x, tip_from][3]:
            put(px, x, tip_from, GOLD[3] if x % 2 else GOLD[2], w, h)
    for y in range(tip_from + 1, h):
        row = [x for x in range(w) if px[x, y][3]]
        if row:
            put(px, row[0], y, GOLD[2], w, h)
            put(px, row[-1], y, GOLD[2], w, h)
    # brasão (2x) na ponta, e um menor perto da cabeceira
    ox, oy = (w - 12) // 2, tip_from - 15
    for cy, line in enumerate(crest):
        for cx, ch in enumerate(line):
            if ch == "#":
                for dy in (0, 1):
                    for dx in (0, 1):
                        put(px, ox + cx * 2 + dx, oy + cy * 2 + dy, GOLD[3], w, h)
    for cy, line in enumerate(crest):
        for cx, ch in enumerate(line):
            if ch == "#":
                put(px, 9 + cx, 4 + cy, GOLD[2], w, h)
    # mesa posta: pratos e cálices nas duas beiradas
    for i in range(5):
        y = 16 + i * 16
        if y + 6 >= tip_from - 16:
            break
        for side in (2, w - 7):
            for dy in range(5):
                for dx in range(5):
                    d = (dx - 2) ** 2 + (dy - 2) ** 2
                    if d <= 5:
                        put(px, side + dx, y + dy, (236, 232, 222) if d > 1 else (206, 200, 196), w, h)
            gx = side + 2
            put(px, gx, y + 7, GOLD[3], w, h)
            put(px, gx, y + 8, GOLD[1], w, h)
    return im


# ---------------------------------------------------------------- móveis

WOOD = ramp((140, 92, 52))


def bench(tiles=5):
    """Banco comprido (vertical), visto de cima: tábua com veio e pés nas pontas."""
    w, h = 10, tiles * 16
    im, px = canvas(w, h)
    for y in range(h):
        for x in range(w):
            c = WOOD[2] if (x + y // 7) % 5 else WOOD[1]
            if x in (0, w - 1) or y in (0, h - 1):
                c = mix(WOOD[0], INK, 0.4)
            elif x == 1 or y == 1:
                c = WOOD[3]
            elif y == h - 2 or x == w - 2:
                c = WOOD[0]
            put(px, x, y, c, w, h)
    for y in (6, h - 8):
        for x in (2, w - 3):
            put(px, x, y, WOOD[0], w, h)
    return im


def barrel():
    w, h = 16, 20
    im, px = canvas(w, h)
    for y in range(h):
        bulge = 1 if 4 <= y <= 15 else 2
        for x in range(bulge, w - bulge):
            if y < 5:  # tampa vista de cima
                c = WOOD[3] if (x + y) % 4 else WOOD[2]
                if y == 0 or x == bulge or x == w - bulge - 1:
                    c = mix(WOOD[0], INK, 0.4)
            else:
                c = WOOD[2] if (x // 3) % 2 else WOOD[1]
                if x <= bulge + 1:
                    c = WOOD[1]
                if x >= w - bulge - 2:
                    c = WOOD[0]
                if y in (7, 14):
                    c = (110, 108, 126) if x % 3 else (150, 148, 166)
                if y == h - 1 or x in (bulge, w - bulge - 1):
                    c = mix(WOOD[0], INK, 0.5)
            put(px, x, y, c, w, h)
    return im


def plant():
    """Vaso alto com planta (mandrágora de enfeite)."""
    w, h = 16, 24
    im, px = canvas(w, h)
    leaf = ramp((60, 140, 70))
    pot = ramp((170, 92, 60))
    for y in range(13, h):
        half = 5 if y < 15 else 4 if y < 22 else 3
        for x in range(8 - half, 8 + half):
            c = pot[3] if y == 13 else pot[2] if x < 8 else pot[1]
            if x in (8 - half, 8 + half - 1) or y == h - 1:
                c = mix(pot[0], INK, 0.4)
            put(px, x, y, c, w, h)
    blobs = [(8, 6, 4), (4, 9, 3), (12, 9, 3), (6, 3, 2), (10, 3, 2), (8, 11, 3)]
    for bx, by, rr in blobs:
        for y in range(by - rr, by + rr + 1):
            for x in range(bx - rr, bx + rr + 1):
                d = (x - bx) ** 2 + (y - by) ** 2
                if d <= rr * rr:
                    c = leaf[3] if d < rr and y < by else leaf[2] if d < rr * rr - rr else leaf[1]
                    put(px, x, y, c, w, h)
    for x, y in ((5, 7), (11, 5), (8, 9)):
        put(px, x, y, (240, 140, 180), w, h)
    return im


def potion_shelf():
    """Prateleira de parede com frascos coloridos (2 andares)."""
    w, h = 16, 24
    im, px = canvas(w, h)
    for y in range(h):
        for x in range(w):
            c = WOOD[0] if x in (0, w - 1) else mix(WOOD[0], INK, 0.55)
            if y in (0, 10, 11, 21, 22, 23):
                c = WOOD[2] if y in (10, 21) else WOOD[1]
                if y in (0, 23):
                    c = mix(WOOD[0], INK, 0.4)
            put(px, x, y, c, w, h)
    colors = [(200, 60, 80), (90, 200, 120), (110, 120, 230), (240, 200, 80), (180, 90, 220), (90, 210, 220)]
    for shelf_y, xs in ((9, (2, 6, 10)), (20, (3, 8, 12))):
        for i, bx in enumerate(xs):
            col = colors[(i + shelf_y) % len(colors)]
            tall = 6 if (bx + shelf_y) % 2 else 4
            for y in range(shelf_y - tall + 1, shelf_y + 1):
                for x in range(bx, bx + 3):
                    c = col if y > shelf_y - tall + 2 else (220, 220, 230)
                    if x == bx and y > shelf_y - tall + 2:
                        c = mix(col, (255, 255, 255), 0.4)
                    put(px, x, y, c, w, h)
            put(px, bx + 1, shelf_y - tall, (150, 110, 70), w, h)
    return im


def armor():
    """Armadura de cavaleiro em pé, de enfeite (16x28)."""
    w, h = 16, 28
    im, px = canvas(w, h)
    steel = ramp((150, 156, 176))
    rows = [
        "......kkkk......",
        ".....kSSSsk.....",
        ".....kSddsk.....",
        ".....kSSSsk.....",
        "......kRRk......",
        "...kkkSSSskkk...",
        "..kSSkSSSskSsk..",
        "..kSskSSSskssk..",
        "..kSskSSSsksskk.",
        "..kSskGGGGkssk..",
        "..kkkkSSSskkkk..",
        "..kSk.SSSs.ksk..",
        "..kSk.SSSs.ksk..",
        "..kk.kSSSsk.kk..",
        ".....kSSssk.....",
        ".....kSkkSk.....",
        ".....kSk.Sk.....",
        ".....kSk.Sk.....",
        ".....kSk.Sk.....",
        ".....kSk.Sk.....",
        "....kSSk.SSk....",
        "....kkkk.kkkk...",
        "...kddddddddk...",
        "...kDDDDDDDDk...",
        "...kddddddddk...",
        "...kkkkkkkkkk...",
        "................",
        "................",
    ]
    pal = {"S": steel[3], "s": steel[1], "d": (60, 56, 72), "D": (96, 90, 110), "G": GOLD[2], "R": (176, 40, 44), "k": INK}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row[:w]):
            if ch != ".":
                put(px, x, y, pal[ch], w, h)
    return im


def render_decor(houses, crests):
    """houses: {casa: (cor, nome_do_brasão)}; crests: {nome: grade 6x6}. Devolve as entradas do manifesto."""
    out = []
    for casa, (color, crest) in houses.items():
        save(tablecloth(color, crests[crest]), f"toalha-{casa}.png")
        out.append((f"prop.toalha-{casa}", f"sprites/toalha-{casa}.png", CLOTH_W, CLOTH_H))
    for key, im in (("banco", bench()), ("barril", barrel()), ("planta", plant()),
                    ("prateleira-pocoes", potion_shelf()), ("armadura", armor())):
        save(im, f"{key}.png")
        out.append((f"prop.{key}", f"sprites/{key}.png", im.width, im.height))
    return out

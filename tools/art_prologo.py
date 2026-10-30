"""Cenários do prólogo [FICÇÃO]: céu de São Paulo, cidade em duas camadas (parallax),
o quarto do aprendiz e o castelo que aparece no terreno vazio. Pixel art desenhada
por código, 1 pixel = 1 pixel de jogo.
"""
import math
import os
import random

from PIL import Image, ImageDraw

from art_lib import ROOT, mix

OUT = os.path.join(ROOT, "sprites")
GOLD = (250, 214, 92)
WARM = (246, 210, 122)
INK = (14, 11, 28)


def save(im, name):
    im.save(os.path.join(OUT, name))
    return im


def stars(px, w, h, n, rnd, y_max=None, colors=((230, 230, 255), (200, 200, 240), (255, 240, 200))):
    for _ in range(n):
        x, y = rnd.randrange(w), rnd.randrange(y_max or h)
        c = rnd.choice(colors)
        px[x, y] = c + (255,)
        if rnd.random() < 0.08 and 1 <= x < w - 1 and 1 <= y < h - 1:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                px[x + dx, y + dy] = mix(c, (60, 60, 120), 0.5) + (255,)


# ---------------------------------------------------------------- céu

def sky(w=640, h=270):
    rnd = random.Random(7)
    im = Image.new("RGBA", (w, h))
    px = im.load()
    top, bottom = (10, 9, 30), (52, 38, 92)
    for y in range(h):
        t = (y / h) ** 1.4
        c = mix(top, bottom, t)
        for x in range(w):
            # pontilhado entre as faixas do degradê, estilo pixel art
            d = ((x + y) % 2) * 0.03
            px[x, y] = mix(c, bottom, d) + (255,)
    stars(px, w, h, 260, rnd, y_max=int(h * 0.75))
    # lua
    mx, my, r = 520, 52, 15
    for y in range(my - r, my + r + 1):
        for x in range(mx - r, mx + r + 1):
            d = math.hypot(x - mx, y - my)
            if d <= r:
                c = (246, 238, 206) if d < r - 1 else (210, 200, 170)
                if (x - mx + 5) ** 2 + (y - my + 3) ** 2 < 10 or (x - mx - 4) ** 2 + (y - my - 6) ** 2 < 6:
                    c = (220, 210, 180)
                px[x, y] = c + (255,)
            elif d <= r + 3 and (x + y) % 2 == 0:
                px[x, y] = mix(px[x, y][:3], (120, 110, 170), 0.5) + (255,)
    return save(im, "prologo-ceu.png")


# ---------------------------------------------------------------- cidade

def skyline(w, h, color, win_on, rnd, min_h, max_h, win_chance, detail=False):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    px = im.load()
    x = 0
    while x < w:
        bw = rnd.randrange(26, 60)
        bh = rnd.randrange(min_h, max_h)
        top = h - bh
        d.rectangle([x, top, x + bw - 1, h - 1], fill=color)
        # topo: caixa d'água, antena ou degrau
        k = rnd.random()
        if k < 0.3:
            d.rectangle([x + 4, top - 6, x + 12, top - 1], fill=color)
            d.rectangle([x + 6, top - 9, x + 10, top - 7], fill=color)
        elif k < 0.55:
            ax = x + bw // 2
            d.line([ax, top - 12, ax, top - 1], fill=color)
            if detail and ax < w and top >= 13:
                px[ax, top - 13] = (230, 70, 70, 255)
        elif k < 0.75:
            d.rectangle([x + 3, top - 4, x + bw - 4, top - 1], fill=color)
        # janelas
        for wy in range(top + 5, h - 6, 7 if detail else 6):
            for wx in range(x + 4, min(x + bw - 4, w - 3), 6 if detail else 5):
                if rnd.random() < win_chance:
                    c = win_on if rnd.random() < 0.8 else (170, 200, 255)
                    if detail:
                        d.rectangle([wx, wy, wx + 2, wy + 3], fill=c)
                        px[wx, wy] = mix(c, (255, 255, 255), 0.4) + (255,)
                    else:
                        d.rectangle([wx, wy, wx, wy + 1], fill=c)
                elif detail:
                    d.rectangle([wx, wy, wx + 2, wy + 3], fill=mix(color, (60, 50, 90), 0.4))
        # borda clara do lado esquerdo (luz da lua)
        if detail:
            d.line([x, top, x, h - 1], fill=mix(color, (90, 80, 140), 0.5))
        x += bw + rnd.randrange(0, 4)
    return im


def city_far(w=1280, h=110):
    rnd = random.Random(11)
    return save(skyline(w, h, (30, 24, 58), (200, 170, 110), rnd, 30, 95, 0.12), "prologo-cidade-longe.png")


LOT_W = 360  # o fim da camada de perto é o terreno vazio onde o castelo aparece


def city_near(w=1280 + LOT_W, h=150):
    """Prédios de perto, calçada com postes e rua. Termina num terreno vazio com cerca."""
    rnd = random.Random(23)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    street_y = 122  # onde os pés pisam
    bl = skyline(w - LOT_W, street_y, (20, 16, 40), WARM, rnd, 50, 118, 0.35, detail=True)
    im.paste(bl, (0, 0), bl)
    d = ImageDraw.Draw(im)
    px = im.load()
    # calçada e rua
    for y in range(street_y, h):
        for x in range(w):
            if y < street_y + 8:
                c = (86, 80, 104) if (x // 12 + (y - street_y) // 4) % 2 else (78, 72, 96)
                if y == street_y:
                    c = (120, 112, 140)
            else:
                c = (34, 30, 46)
                if y == street_y + 18 and (x // 10) % 2 == 0:
                    c = (210, 190, 110)
            px[x, y] = c + (255,)
    # postes de luz com halo
    for lx in range(70, w - LOT_W, 180):
        d.rectangle([lx, street_y - 46, lx + 1, street_y - 1], fill=(50, 46, 66))
        d.rectangle([lx - 4, street_y - 48, lx + 5, street_y - 46], fill=(50, 46, 66))
        for y in range(street_y - 46, street_y):
            spread = (y - (street_y - 46)) // 3
            for x in range(lx - spread, lx + spread + 2):
                if 0 <= x < w and (x + y) % 2 == 0:
                    px[x, y] = mix(px[x, y][:3] if px[x, y][3] else (20, 16, 40), (250, 220, 140), 0.18) + (255,)
        d.rectangle([lx - 3, street_y - 45, lx + 4, street_y - 44], fill=(255, 236, 170))
    # terreno vazio: grama baixa, cerca de madeira e uma placa
    lot_x = w - LOT_W
    for x in range(lot_x, w):
        for y in range(street_y - 3, street_y):
            if (x * 7 + y) % 5:
                px[x, y] = (40, 70, 52, 255)
        if x % 3 == 0:
            px[x, street_y - 4] = (54, 96, 66, 255)
    for fx in range(lot_x + 6, w, 9):
        d.rectangle([fx, street_y - 16, fx + 2, street_y - 1], fill=(92, 66, 46))
        px[fx + 1, street_y - 17] = (92, 66, 46, 255)
    d.rectangle([lot_x, street_y - 13, w - 1, street_y - 12], fill=(110, 80, 54))
    d.rectangle([lot_x, street_y - 7, w - 1, street_y - 6], fill=(110, 80, 54))
    return save(im, "prologo-cidade-perto.png")


# ---------------------------------------------------------------- castelo

def castle(w=240, h=210):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    px = im.load()
    stone, stone_d, stone_l = (92, 86, 120), (60, 56, 84), (128, 122, 160)
    roof, roof_d = (110, 60, 150), (74, 38, 104)

    def wall(x0, y0, x1, y1):
        d.rectangle([x0, y0, x1, y1], fill=stone)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                row = (y - y0) // 5
                if (y - y0) % 5 == 0 or (x + (row % 2) * 4) % 9 == 0:
                    px[x, y] = stone_d + (255,)
        d.line([x0, y0, x0, y1], fill=stone_l)
        d.line([x1, y0, x1, y1], fill=stone_d)

    def battlement(x0, x1, y):
        for x in range(x0, x1, 8):
            d.rectangle([x, y - 5, x + 4, y], fill=stone)
            d.line([x, y - 5, x + 4, y - 5], fill=stone_l)

    def window(x, y, lit=True, big=False):
        ww, wh = (6, 10) if big else (4, 7)
        c = WARM if lit else (40, 36, 60)
        d.rectangle([x, y + 2, x + ww - 1, y + wh - 1], fill=c)
        d.rectangle([x + 1, y, x + ww - 2, y + 1], fill=c)
        d.rectangle([x - 1, y + wh, x + ww, y + wh], fill=stone_l)

    def cone(cx, base_y, half, height):
        for i in range(height):
            hw = int(half * (i / height)) + 1
            y = base_y - height + i
            d.line([cx - hw, y, cx + hw, y], fill=roof if (i // 3) % 2 else roof_d)
        d.line([cx, base_y - height - 8, cx, base_y - height], fill=(60, 50, 70))
        d.rectangle([cx + 1, base_y - height - 8, cx + 7, base_y - height - 4], fill=GOLD)

    ground = h - 6
    # corpo principal
    wall(40, 96, 199, ground)
    battlement(40, 200, 96)
    # torres laterais
    for tx in (14, 186):
        wall(tx, 70, tx + 40, ground)
        cone(tx + 20, 70, 24, 40)
        window(tx + 17, 92, big=True)
        window(tx + 17, 132)
    # torre central alta (a da Bellatrix)
    wall(100, 46, 139, 96)
    battlement(100, 140, 46)  # topo reto: é ali que o dragão fica
    window(116, 56, big=True)  # a janela da torre
    window(110, 72)
    window(126, 72)
    # portão em arco
    gx0, gx1, gy = 106, 133, ground
    for y in range(gy - 34, gy + 1):
        for x in range(gx0, gx1 + 1):
            cx = (gx0 + gx1) / 2
            if y < gy - 22 and math.hypot(x - cx, (y - (gy - 22)) * 1.1) > 14:
                continue
            px[x, y] = ((110, 74, 46) if (x - gx0) % 7 else (80, 54, 34)) + (255,)
    d.line([119, gy - 30, 119, gy], fill=(60, 40, 26))
    d.line([120, gy - 30, 120, gy], fill=(60, 40, 26))
    px[116, gy - 14] = GOLD + (255,)
    px[123, gy - 14] = GOLD + (255,)
    # janelas do corpo
    for wx in (52, 70, 88, 146, 164, 182):
        window(wx, 110)
        window(wx, 140)
    # bandeiras das quatro casas
    for i, c in enumerate(((176, 40, 44), (44, 86, 170), (40, 134, 82), (206, 160, 44))):
        bx = 58 + i * 36 if i < 2 else 58 + i * 36 + 12
        d.rectangle([bx, 100, bx + 7, 118], fill=c)
        d.polygon([(bx, 119), (bx + 7, 119), (bx + 3, 123)], fill=c)
        d.line([bx, 100, bx + 7, 100], fill=GOLD)
    # chão
    d.rectangle([0, ground + 1, w - 1, h - 1], fill=(40, 70, 52))
    d.rectangle([gx0 - 2, ground + 1, gx1 + 2, h - 1], fill=(110, 104, 130))
    # imagem final mais alta, com o dragão no topo da torre do meio (a base continua igual)
    full = Image.new("RGBA", (w, h + DRAGON_TOP), (0, 0, 0, 0))
    full.paste(im, (0, DRAGON_TOP))
    dragon = dragon_statue()
    full.alpha_composite(dragon, (120 - 30, DRAGON_TOP + 41 - dragon.height))
    return save(full, "prologo-castelo.png")


DRAGON_TOP = 20  # pixels a mais em cima do castelo para caber o dragão


def dragon_statue():
    """Dragão bege acinzentado sentado no topo da torre, asas abertas e boca aberta [KAINAN].
    Desenhado com formas simples e depois sombreado e contornado pixel a pixel."""
    w, h = 60, 52
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    base, light, hi, dark = (168, 158, 142), (198, 188, 170), (224, 216, 198), (112, 104, 94)
    wing, wing_d, belly, mouth = (146, 134, 118), (118, 108, 96), (214, 202, 174), (120, 36, 40)
    # asa de trás (mais escura) e asa da frente, abertas para cima
    d.polygon([(26, 30), (20, 6), (16, 14), (10, 10), (12, 22), (20, 32)], fill=wing_d)
    d.polygon([(32, 28), (44, 2), (58, 10), (54, 18), (56, 24), (48, 26), (46, 34), (36, 36)], fill=wing)
    for a, b in (((44, 2), (40, 30)), ((58, 10), (44, 32)), ((56, 24), (46, 34))):
        d.line([a, b], fill=wing_d)
    d.line([(44, 2), (32, 28)], fill=base, width=2)  # osso da asa
    # cauda enrolada descendo pela frente da torre
    d.line([(38, 44), (48, 46), (54, 42), (52, 37), (48, 39)], fill=base, width=3)
    # corpo sentado, coxa e patas
    d.ellipse([22, 26, 42, 46], fill=base)
    d.ellipse([30, 34, 44, 48], fill=base)
    d.rectangle([24, 40, 28, 51], fill=base)
    d.rectangle([33, 46, 41, 51], fill=base)
    # peito claro com escamas
    d.ellipse([22, 26, 30, 44], fill=belly)
    # pescoço subindo para a esquerda
    d.polygon([(24, 30), (31, 27), (22, 14), (16, 16)], fill=base)
    # cabeça com a boca bem aberta (virada para a esquerda)
    d.polygon([(14, 10), (24, 9), (25, 15), (17, 18)], fill=base)  # crânio
    d.polygon([(15, 10), (4, 6), (2, 9), (15, 14)], fill=base)  # mandíbula de cima
    d.polygon([(16, 16), (5, 18), (4, 21), (18, 18)], fill=base)  # mandíbula de baixo
    d.polygon([(15, 14), (3, 10), (5, 17), (16, 16)], fill=mouth)  # dentro da boca
    # chifres para trás
    d.line([(22, 10), (30, 4)], fill=light, width=2)
    d.line([(19, 9), (24, 2)], fill=light)
    px = im.load()
    # sombreado: luz de cima à esquerda
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] > 0
    src = im.copy().load()
    for y in range(h):
        for x in range(w):
            c = src[x, y]
            if not c[3] or c[:3] == mouth:
                continue
            if not solid(x, y - 1) or not solid(x - 1, y):
                px[x, y] = (hi if c[:3] == base else mix(c[:3], (255, 255, 255), 0.25)) + (255,)
            elif not solid(x, y + 1) or not solid(x + 1, y):
                px[x, y] = (dark if c[:3] in (base, belly) else wing_d) + (255,)
    # escamas no peito e dentes
    for y in range(29, 43, 3):
        for x in range(23, 29):
            if src[x, y][:3] == belly and src[x, y][3]:
                px[x, y] = mix(belly, dark, 0.35) + (255,)
    for x, y in ((5, 10), (8, 11), (11, 12), (6, 17), (9, 16), (12, 16)):
        px[x, y] = (246, 242, 230, 255)
    px[19, 12] = (250, 176, 60, 255)  # olho
    px[20, 12] = (250, 176, 60, 255)
    # contorno escuro
    out = im.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            if any(solid(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                op[x, y] = INK + (255,)
    return out


# ---------------------------------------------------------------- quarto

def bedroom(w=640, h=270):
    rnd = random.Random(5)
    im = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(im)
    px = im.load()
    floor_y = 196
    # parede com papel de estrelinhas
    for y in range(floor_y):
        for x in range(w):
            c = (58, 48, 92) if (x // 24) % 2 else (54, 44, 86)
            if (x % 24, y % 24) in ((6, 8), (18, 20)):
                c = (90, 80, 140)
            px[x, y] = c + (255,)
    d.rectangle([0, floor_y - 6, w - 1, floor_y - 1], fill=(40, 32, 64))
    # chão de tacos
    for y in range(floor_y, h):
        for x in range(w):
            plank = (x + (((y - floor_y) // 6) % 2) * 16) // 32
            c = (120, 82, 54) if plank % 2 else (110, 74, 48)
            if (y - floor_y) % 6 == 0:
                c = (84, 56, 36)
            px[x, y] = c + (255,)
    # janela grande com a cidade lá fora
    wx0, wy0, wx1, wy1 = 250, 40, 390, 140
    for y in range(wy0, wy1):
        for x in range(wx0, wx1):
            px[x, y] = mix((12, 10, 32), (52, 38, 92), (y - wy0) / (wy1 - wy0)) + (255,)
    stars_im = Image.new("RGBA", (wx1 - wx0, 60), (0, 0, 0, 0))
    stars(stars_im.load(), wx1 - wx0, 60, 26, rnd)
    im.paste(stars_im, (wx0, wy0), stars_im)
    city = skyline(wx1 - wx0, 50, (24, 20, 46), WARM, random.Random(3), 14, 48, 0.3)
    im.paste(city, (wx0, wy1 - 50), city)
    for x in range(wx0 - 4, wx1 + 4):
        for y in (wy0 - 4, wy0 - 3, wy0 - 2, wy0 - 1, wy1, wy1 + 1, wy1 + 2, wy1 + 3):
            px[x, y] = (150, 110, 70, 255)
    for y in range(wy0 - 4, wy1 + 4):
        for x in (wx0 - 4, wx0 - 3, wx0 - 2, wx0 - 1, wx1, wx1 + 1, wx1 + 2, wx1 + 3, (wx0 + wx1) // 2, (wx0 + wx1) // 2 + 1):
            px[x, y] = (150, 110, 70, 255)
    d.rectangle([wx0 - 8, wy1 + 4, wx1 + 7, wy1 + 7], fill=(170, 128, 84))
    # cortinas
    for cx0 in (wx0 - 26, wx1 + 6):
        for y in range(wy0 - 10, wy1 + 20):
            for x in range(cx0, cx0 + 20):
                c = (150, 60, 80) if ((x - cx0) // 4) % 2 else (128, 48, 68)
                px[x, y] = c + (255,)
    d.rectangle([wx0 - 30, wy0 - 12, wx1 + 30, wy0 - 10], fill=(90, 70, 50))
    # escrivaninha com luminária e livros
    dx0, dx1, dy = 262, 380, 160
    d.rectangle([dx0, dy, dx1, dy + 6], fill=(140, 96, 60))
    d.rectangle([dx0, dy + 7, dx1, dy + 8], fill=(100, 66, 40))
    d.rectangle([dx0 + 4, dy + 9, dx0 + 8, floor_y + 10], fill=(100, 66, 40))
    d.rectangle([dx1 - 8, dy + 9, dx1 - 4, floor_y + 10], fill=(100, 66, 40))
    d.rectangle([dx1 - 40, dy + 9, dx1 - 10, dy + 30], fill=(120, 80, 50))
    d.rectangle([dx1 - 28, dy + 18, dx1 - 22, dy + 20], fill=GOLD)
    d.rectangle([dx0 + 12, dy - 22, dx0 + 13, dy - 1], fill=(60, 60, 80))
    d.polygon([(dx0 + 6, dy - 22), (dx0 + 20, dy - 22), (dx0 + 16, dy - 30), (dx0 + 10, dy - 30)], fill=(220, 180, 70))
    for i, c in enumerate(((180, 60, 60), (60, 110, 180), (70, 150, 90), (200, 170, 60))):
        d.rectangle([dx1 - 30 + i * 5, dy - 12, dx1 - 27 + i * 5, dy - 1], fill=c)
    d.rectangle([dx0 + 40, dy - 2, dx0 + 60, dy - 1], fill=(236, 232, 222))  # papel com desenho
    px[dx0 + 48, dy - 3] = GOLD + (255,)
    # cama à direita
    bx0, bx1, by = 470, 600, 168
    d.rectangle([bx0, by, bx1, floor_y + 18], fill=(100, 70, 46))
    d.rectangle([bx0 + 2, by - 10, bx1 - 2, by + 6], fill=(70, 90, 160))
    for x in range(bx0 + 2, bx1 - 1, 8):
        d.rectangle([x, by - 10, x + 3, by + 6], fill=(80, 104, 180))
    d.rectangle([bx1 - 30, by - 16, bx1 - 6, by - 6], fill=(230, 228, 240))
    d.rectangle([bx1 - 6, by - 40, bx1, floor_y + 18], fill=(110, 76, 50))
    # pôster de constelação e estante
    d.rectangle([100, 50, 160, 110], fill=(24, 22, 52))
    d.rectangle([98, 48, 162, 49], fill=(200, 170, 80))
    d.rectangle([98, 111, 162, 112], fill=(200, 170, 80))
    pts = [(110, 60), (124, 72), (140, 66), (150, 90), (128, 96), (116, 84)]
    for a, b in zip(pts, pts[1:]):
        d.line([a, b], fill=(90, 90, 160))
    for p in pts:
        px[p] = (255, 240, 200, 255)
    d.rectangle([40, 120, 90, floor_y + 6], fill=(110, 74, 48))
    for sy in (130, 152, 174):
        d.rectangle([42, sy, 88, sy + 1], fill=(80, 54, 34))
        for i in range(6):
            c = ((180, 60, 60), (60, 110, 180), (70, 150, 90), (200, 170, 60), (150, 90, 200), (220, 220, 230))[(i + sy) % 6]
            d.rectangle([45 + i * 7, sy - 14, 49 + i * 7, sy - 1], fill=c)
    # tapete redondo
    for y in range(floor_y + 22, floor_y + 52):
        for x in range(240, 400):
            if ((x - 320) / 80) ** 2 + ((y - floor_y - 37) / 15) ** 2 <= 1:
                c = (160, 70, 90) if (abs(x - 320) // 10 + abs(y - floor_y - 37) // 4) % 2 else (140, 58, 78)
                px[x, y] = c + (255,)
    return save(im, "prologo-quarto.png")


def render_prologo():
    """Gera os cenários e devolve as entradas do manifesto (um quadro cada)."""
    out = [fn() for fn in (sky, city_far, city_near, castle, bedroom)]
    names = ["ceu", "cidade-longe", "cidade-perto", "castelo", "quarto"]
    return [(f"prologo.{n}", f"sprites/prologo-{n}.png", im.width, im.height) for n, im in zip(names, out)]

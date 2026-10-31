"""Móveis da etapa de qualidade visual: estantes com livros variados, tapetes, mesa de
leitura, candelabro, globo, pilha de livros e relógio de pé.

Regras (iguais às do resto da arte): grade de 16 px, contorno escuro de 1 px, 3 a 4 tons
por material (art_lib.ramp) e luz vindo de cima à esquerda. Peças com mais de um quadro
(estante, tapete) mudam de quadro conforme o lugar na sala, para a mesma peça não se
repetir igualzinha (ver WorldScene, "variações").
"""
import os

from PIL import Image

from art_lib import ROOT, hsh, mix, ramp

INK = (26, 20, 38)
WOOD = ramp((122, 78, 46))
DARK_WOOD = ramp((88, 56, 40))
IRON = ramp((92, 88, 110))
GOLD = ramp((214, 170, 64))
PAPER = ramp((226, 214, 184))
# lombadas: vermelho, azul, verde, mostarda, vinho, roxo, couro (tons apagados de livro velho)
SPINES = [ramp(c) for c in ((168, 52, 48), (52, 92, 160), (52, 128, 84), (190, 146, 52), (118, 38, 60), (98, 62, 140), (142, 96, 60))]


def canvas(w, h):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return im, im.load()


def put(px, x, y, c, w, h):
    if 0 <= x < w and 0 <= y < h:
        px[x, y] = tuple(c[:3]) + (255,)


def outline(im):
    """Contorno escuro de 1 px em volta de tudo que não é transparente."""
    w, h = im.size
    src = im.load()
    out = im.copy()
    po = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    po[x, y] = INK + (255,)
                    break
    return out


def strip(frames):
    w, h = frames[0].size
    im = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f, (i * w, 0))
    return im


# ---------------------------------------------------------------- estante (16x32, 3 quadros)

def bookshelf(seed):
    """Estante de madeira com 3 prateleiras de livros de alturas e cores diferentes.
    seed muda os livros e o enfeite de uma das prateleiras (frasco, caveira de enfeite, vela)."""
    w, h = 16, 32
    im, px = canvas(w, h)
    # caixa da estante (1 px de folga para o contorno)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            side = x in (1, 2, w - 3, w - 2)
            c = WOOD[1] if side else DARK_WOOD[0]
            if side and x in (1, w - 3):
                c = WOOD[2]
            if y in (1, 2):
                c = WOOD[3] if y == 1 else WOOD[2]
            put(px, x, y, c, w, h)
    shelves = [10, 19, 28]  # y da tábua de cada prateleira
    for sy in shelves:
        for x in range(1, w - 1):
            put(px, x, sy, WOOD[3], w, h)
            put(px, x, sy + 1, WOOD[1], w, h)
    tops = [3, 12, 21]
    for i, (top, sy) in enumerate(zip(tops, shelves)):
        x = 3
        ornament = (seed + i) % 3 == 0 and i != 1
        while x < w - 3:
            r = hsh(x, i, seed)
            if ornament and 6 <= x <= 8:
                # enfeite no meio da prateleira
                kind = seed % 3
                if kind == 0:  # frasco de poção
                    for yy in range(sy - 5, sy):
                        for xx in (x, x + 1, x + 2):
                            put(px, xx, yy, (90, 170, 120) if yy > sy - 4 else (140, 210, 160), w, h)
                    put(px, x + 1, sy - 6, PAPER[1], w, h)
                elif kind == 1:  # caveira de enfeite
                    for yy in range(sy - 4, sy):
                        for xx in (x, x + 1, x + 2):
                            put(px, xx, yy, PAPER[2] if yy < sy - 1 else PAPER[1], w, h)
                    put(px, x, sy - 3, INK, w, h)
                    put(px, x + 2, sy - 3, INK, w, h)
                else:  # vela
                    for yy in range(sy - 4, sy):
                        put(px, x + 1, yy, PAPER[3], w, h)
                    put(px, x + 1, sy - 5, (250, 200, 80), w, h)
                x += 4
                continue
            bw = 1 if r < 0.55 else 2
            if r > 0.92:  # espaço vazio
                x += 1
                continue
            bh = 4 + int(hsh(x, i + 7, seed) * 4)  # 4 a 7 px de altura
            bh = min(bh, sy - top)
            spine = SPINES[int(hsh(x, i + 3, seed) * len(SPINES))]
            lean = r > 0.86 and bw == 1
            for yy in range(sy - bh, sy):
                for xx in range(x, x + bw):
                    c = spine[2] if xx == x else spine[1]
                    if yy == sy - bh:
                        c = spine[3]
                    if bh > 5 and yy == sy - bh + 2:
                        c = GOLD[3] if bw == 2 else spine[3]  # faixa dourada da lombada
                    put(px, xx + (1 if lean and yy < sy - bh + 2 else 0), yy, c, w, h)
            x += bw
    return outline(im)


# ---------------------------------------------------------------- tapete (32x16, 2 quadros)

def rug(base, border):
    """Tapete visto de cima: borda dourada, franja nas pontas e losango no meio."""
    w, h = 32, 16
    im, px = canvas(w, h)
    b = ramp(base)
    g = ramp(border)
    for y in range(2, h - 2):
        for x in range(1, w - 1):
            edge = x in (1, w - 2) or y in (2, h - 3)
            inner = x in (3, w - 4) or y in (4, h - 5)
            if edge:
                c = g[1]
            elif inner:
                c = g[2]
            else:
                c = b[2] if (x + y) % 4 else b[1]
                # losango central
                if abs(x - w // 2 + 0.5) / 7 + abs(y - h // 2 + 0.5) / 4 <= 1:
                    c = b[3] if abs(x - w // 2 + 0.5) / 7 + abs(y - h // 2 + 0.5) / 4 <= 0.5 else g[2]
            put(px, x, y, c, w, h)
    # franja
    for y in range(3, h - 3, 2):
        put(px, 0, y, PAPER[2], w, h)
        put(px, w - 1, y, PAPER[2], w, h)
    return im


# ---------------------------------------------------------------- mesa de leitura (32x22)

def reading_table():
    w, h = 32, 22
    im, px = canvas(w, h)
    # tampo
    for y in range(4, 13):
        for x in range(1, w - 1):
            c = WOOD[3] if y == 4 else WOOD[2] if y < 11 else WOOD[1]
            if y in (11, 12):
                c = WOOD[1] if y == 11 else WOOD[0]
            put(px, x, y, c, w, h)
    # pernas
    for y in range(13, h - 1):
        for x in (2, 3, w - 4, w - 3):
            put(px, x, y, WOOD[1] if x in (2, w - 4) else WOOD[0], w, h)
    # livro aberto
    for y in range(5, 10):
        for x in range(8, 20):
            c = PAPER[3] if x < 14 else PAPER[2]
            if x == 13 or x == 14:
                c = PAPER[1]
            if y in (6, 8) and x not in (8, 13, 14, 19):
                c = PAPER[1]  # linhas de texto
            put(px, x, y, c, w, h)
    for x in range(8, 20):
        put(px, x, 10, SPINES[0][1], w, h)
    # vela num pires
    for x in range(23, 27):
        put(px, x, 9, GOLD[2], w, h)
    for y in range(4, 9):
        put(px, 24, y, PAPER[3], w, h)
        put(px, 25, y, PAPER[2], w, h)
    put(px, 24, 3, (250, 200, 80), w, h)
    put(px, 24, 2, (255, 236, 150), w, h)
    # pena no tinteiro
    put(px, 4, 9, INK, w, h)
    put(px, 5, 9, INK, w, h)
    for i in range(4):
        put(px, 5 + i // 2, 8 - i, PAPER[3], w, h)
    return outline(im)


# ---------------------------------------------------------------- candelabro de pé (16x32)

def candelabra():
    w, h = 16, 32
    im, px = canvas(w, h)
    # base
    for y in range(27, 31):
        half = 2 + (y - 27)
        for x in range(8 - half, 8 + half):
            put(px, x, y, IRON[3] if x < 8 else IRON[1], w, h)
    # haste
    for y in range(10, 27):
        put(px, 7, y, IRON[3], w, h)
        put(px, 8, y, IRON[1], w, h)
    for y in (16, 22):
        for x in (6, 9):
            put(px, x, y, IRON[2], w, h)
    # braços
    for x in range(3, 13):
        put(px, x, 10, IRON[2], w, h)
    for x in (3, 12):
        put(px, x, 9, IRON[2], w, h)
    # três velas
    for cx, top in ((3, 5), (7, 3), (12, 5)):
        for y in range(top, 9 if cx != 7 else 10):
            put(px, cx, y, PAPER[3], w, h)
            if cx == 7:
                put(px, 8, y, PAPER[2], w, h)
        put(px, cx, top - 1, (250, 200, 80), w, h)
        put(px, cx, top - 2, (255, 236, 150), w, h)
    return outline(im)


# ---------------------------------------------------------------- globo (16x24)

def globe():
    w, h = 16, 24
    im, px = canvas(w, h)
    sea = ramp((60, 104, 170))
    land = ramp((92, 150, 80))
    cx, cy, r = 8, 8, 5
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = (x - cx) ** 2 + (y - cy) ** 2
            if d <= r * r + 1:
                lit = (x - cx) + (y - cy) < -2
                is_land = hsh(x, y, 5) > 0.58
                p = land if is_land else sea
                put(px, x, y, p[3] if lit else p[2] if d < r * r - 4 else p[1], w, h)
    # aro dourado
    for y in range(cy - r - 1, cy + r + 2):
        put(px, cx + r + 1, y, GOLD[2], w, h)
    for x in range(cx - 2, cx + 3):
        put(px, x, cy + r + 2, GOLD[1], w, h)
    # pé de madeira
    for y in range(cy + r + 3, h - 1):
        put(px, 7, y, WOOD[2], w, h)
        put(px, 8, y, WOOD[1], w, h)
    for x in range(4, 12):
        put(px, x, h - 2, WOOD[1] if x > 7 else WOOD[2], w, h)
    return outline(im)


# ---------------------------------------------------------------- pilha de livros (16x16)

def book_stack():
    w, h = 16, 16
    im, px = canvas(w, h)
    y = 14
    for i, (x0, bw, spine) in enumerate(((2, 12, SPINES[1]), (3, 10, SPINES[3]), (2, 11, SPINES[0]), (4, 9, SPINES[5]))):
        for yy in (y - 2, y - 1, y):
            for x in range(x0, x0 + bw):
                c = spine[2] if yy < y else spine[1]
                if x == x0 + bw - 1:
                    c = PAPER[2] if yy != y - 2 else PAPER[3]  # páginas aparecendo
                put(px, x, yy, c, w, h)
        y -= 3
    return outline(im)


# ---------------------------------------------------------------- relógio de pé (16x32)

def clock():
    w, h = 16, 32
    im, px = canvas(w, h)
    for y in range(1, h - 1):
        half = 6 if y < 13 else 4 if y < 28 else 6
        for x in range(8 - half, 8 + half):
            c = DARK_WOOD[2] if x < 8 else DARK_WOOD[1]
            if x == 8 - half:
                c = DARK_WOOD[3]
            put(px, x, y, c, w, h)
    # mostrador
    for y in range(3, 11):
        for x in range(4, 12):
            if (x - 7.5) ** 2 + (y - 6.5) ** 2 <= 12:
                put(px, x, y, PAPER[3], w, h)
    put(px, 7, 5, INK, w, h)
    put(px, 7, 6, INK, w, h)
    put(px, 8, 7, INK, w, h)
    # janelinha do pêndulo
    for y in range(15, 26):
        for x in range(6, 10):
            put(px, x, y, mix(DARK_WOOD[0], INK, 0.4), w, h)
    for y in range(15, 23):
        put(px, 8, y, GOLD[2], w, h)
    for y in (22, 23):
        for x in (7, 8, 9):
            put(px, x, y, GOLD[3] if y == 22 else GOLD[1], w, h)
    return outline(im)


# ---------------------------------------------------------------- atril (16x16)

def lectern():
    """Atril de madeira com tampo inclinado, onde o livro levitado se encaixa."""
    w, h = 16, 16
    im, px = canvas(w, h)
    # tampo inclinado (mais alto atrás)
    for y in range(2, 7):
        for x in range(2 + (6 - y) // 2, 14 - (6 - y) // 2):
            c = WOOD[3] if y == 2 else WOOD[2] if y < 6 else WOOD[1]
            put(px, x, y, c, w, h)
    for x in range(3, 13):
        put(px, x, 7, GOLD[2] if x in (3, 12) else WOOD[0], w, h)
    # coluna e pé
    for y in range(8, 14):
        put(px, 7, y, WOOD[2], w, h)
        put(px, 8, y, WOOD[1], w, h)
    for x in range(4, 12):
        put(px, x, 14, WOOD[1] if x > 7 else WOOD[2], w, h)
    return outline(im)


# ---------------------------------------------------------------- Chapéu das Virtudes (16x16)

def virtue_hat():
    """Chapéu das Virtudes [FICÇÃO]: chapéu pontudo de veludo roxo com a ponta caída,
    faixa dourada e estrelinhas bordadas. Não tem rosto nem fala: só brilha na cor da casa."""
    w, h = 16, 16
    im, px = canvas(w, h)
    vel = ramp((92, 56, 140))
    # aba
    for x in range(1, 15):
        put(px, x, 13, vel[1] if x > 7 else vel[2], w, h)
        put(px, x, 14, vel[0], w, h)
    # cone (afina para cima) com a ponta caindo para a direita
    for y in range(4, 13):
        half = 1 + (y - 4) * 4 // 8
        for x in range(7 - half, 9 + half):
            put(px, x, y, vel[3] if x < 7 else vel[2] if x < 9 else vel[1], w, h)
    for x, y in ((8, 3), (9, 2), (10, 2), (11, 3), (12, 4)):
        put(px, x, y, vel[2], w, h)
    put(px, 12, 5, GOLD[3], w, h)
    # faixa dourada
    for x in range(4, 12):
        put(px, x, 11, GOLD[2] if x % 3 else GOLD[3], w, h)
    # estrelinhas
    for x, y in ((6, 8), (9, 6), (8, 9)):
        put(px, x, y, (255, 236, 150), w, h)
    return outline(im)


def render_cenario():
    """Desenha os móveis novos e devolve as entradas do manifesto (chave, url, largura, altura)."""
    pecas = {
        "estante": strip([bookshelf(s) for s in (1, 2, 3)]),
        "tapete": strip([rug((150, 44, 52), (214, 170, 64)), rug((52, 74, 140), (196, 186, 150))]),
        "mesa-leitura": reading_table(),
        "candelabro": candelabra(),
        "globo": globe(),
        "pilha-livros": book_stack(),
        "relogio": clock(),
        "atril": lectern(),
        "chapeu": virtue_hat(),
    }
    sizes = {"estante": (16, 32), "tapete": (32, 16)}
    out = []
    for key, im in pecas.items():
        im.save(os.path.join(ROOT, "sprites", f"{key}.png"))
        fw, fh = sizes.get(key, im.size)
        out.append((f"prop.{key}", f"sprites/{key}.png", fw, fh))
    return out

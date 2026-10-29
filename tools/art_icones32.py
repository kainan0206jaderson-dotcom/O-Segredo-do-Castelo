"""Ícones grandes (32x32) da bolsa, do grimório e do caldeirão.

Os itens que mais aparecem (ingredientes, poções, varinha, livros, chaves, mapa, estrela) são
desenhados à mão aqui, com volume e brilho. O resto vem dos ícones de 16x16, ampliados com
EPX (cantos arredondados, sem borrar) e com um contorno escuro novo.
Gera ui/icones32.png com os quadros na MESMA ordem de ui.icones (o jogo usa os mesmos nomes).
"""
import json
import math
import os

from PIL import Image, ImageDraw

from art_lib import ROOT, hsh, mix, ramp

S = 32
LIGHT = (-0.6, -0.8)


class Icon:
    """Uma tela 32x32 em camadas: cada forma é sombreada pela luz de cima à esquerda e ganha contorno."""

    def __init__(self):
        self.img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # -- formas: devolvem uma máscara (lista de pixels)
    @staticmethod
    def mask(draw_fn):
        m = Image.new("L", (S, S), 0)
        draw_fn(ImageDraw.Draw(m))
        return {(x, y) for y in range(S) for x in range(S) if m.getpixel((x, y)) > 127}

    def shade(self, pts, base, outline=True, flat=False):
        """Pinta a máscara com a rampa da cor: luz em cima/esquerda, sombra embaixo/direita."""
        if not pts:
            return
        r = ramp(base)
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        w, h = max(1, x1 - x0), max(1, y1 - y0)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        for (x, y) in pts:
            if flat:
                i = 2
            else:
                # "normal" de um volume arredondado: centro claro, bordas viradas para a luz ou não
                nx, ny = (x - cx) / (w / 2 + 0.5), (y - cy) / (h / 2 + 0.5)
                d = nx * LIGHT[0] + ny * LIGHT[1]
                lum = 0.5 + d * 0.55 - (nx * nx + ny * ny) * 0.15
                i = 1 if lum < 0.32 else 2 if lum < 0.62 else 3 if lum < 0.86 else 4
                if (x + 1, y) not in pts or (x, y + 1) not in pts:
                    i = max(1, i - 1)
            self.img.putpixel((x, y), r[i] + (255,))
        if outline:
            dark = r[0]
            for (x, y) in pts:
                for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q in pts or not (0 <= q[0] < S and 0 <= q[1] < S):
                        continue
                    if self.img.getpixel(q)[3] == 0:
                        self.img.putpixel(q, dark + (255,))

    def px(self, x, y, c, a=255):
        if 0 <= x < S and 0 <= y < S:
            if a < 255:
                under = self.img.getpixel((x, y))
                if under[3]:
                    c = mix(under[:3], c, a / 255)
                    a = 255
            self.img.putpixel((x, y), tuple(c[:3]) + (a,))

    def line(self, pts, c, width=1):
        m = self.mask(lambda d: d.line(pts, fill=255, width=width))
        for (x, y) in m:
            self.px(x, y, c)

    def sparkle(self, x, y, big=True, c=(255, 250, 220)):
        self.px(x, y, (255, 255, 255))
        for d in (-1, 1):
            self.px(x + d, y, c)
            self.px(x, y + d, c)
        if big:
            for d in (-2, 2):
                self.px(x + d, y, mix(c, (255, 210, 120), 0.5), 200)
                self.px(x, y + d, mix(c, (255, 210, 120), 0.5), 200)

    def shine(self, pts):
        for (x, y) in pts:
            self.px(x, y, (255, 255, 255), 210)


E = Icon.mask


def ellipse(x0, y0, x1, y1):
    return E(lambda d: d.ellipse((x0, y0, x1, y1), fill=255))


def poly(points):
    return E(lambda d: d.polygon(points, fill=255))


def box(x0, y0, x1, y1, radius=0):
    return E(lambda d: d.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=255))


# ---------------------------------------------------------------- ingredientes

def abobora():
    ic = Icon()
    ic.shade(ellipse(3, 10, 17, 28), (214, 112, 34))
    ic.shade(ellipse(14, 10, 28, 28), (214, 112, 34))
    ic.shade(ellipse(8, 9, 23, 29), (236, 132, 44))
    for x in (11, 20):  # gomos
        for y in range(12, 27):
            if (x, y) in ellipse(8, 9, 23, 29):
                ic.px(x + (1 if y > 20 else 0) * (1 if x > 15 else -1), y, (176, 82, 30))
    ic.shade(poly([(14, 10), (17, 10), (19, 4), (21, 3), (20, 6), (18, 11)]), (110, 92, 50))
    ic.shade(ellipse(19, 5, 27, 10), (92, 160, 64))
    ic.line([(20, 7), (25, 7)], (60, 120, 50))
    ic.shine([(11, 13), (12, 13), (10, 14)])
    return ic


def folha_mandragora():
    ic = Icon()
    for (pts, c) in ((poly([(15, 13), (6, 3), (9, 2), (16, 10)]), (78, 168, 70)),
                     (poly([(16, 13), (24, 2), (27, 4), (18, 12)]), (78, 168, 70)),
                     (poly([(15, 12), (14, 1), (18, 1), (17, 12)]), (100, 190, 80))):
        ic.shade(pts, c)
    for (x0, y0, x1, y1) in ((7, 3, 15, 11), (17, 2, 25, 10)):
        ic.line([(x0 + 1, y0 + 1), (x1 - 1, y1 - 1)] if x0 < 15 else [(x1 - 1, y0 + 1), (x0 + 1, y1 - 1)], (52, 120, 46))
    ic.shade(poly([(10, 14), (22, 14), (21, 22), (18, 28), (16, 30), (14, 28), (11, 22)]), (214, 182, 128))
    ic.line([(12, 22), (6, 27)], (190, 156, 104), 2)
    ic.line([(20, 22), (26, 26)], (190, 156, 104), 2)
    ic.line([(15, 29), (13, 31)], (170, 136, 92))
    # carinha da mandrágora
    ic.px(14, 18, (60, 40, 30))
    ic.px(18, 18, (60, 40, 30))
    ic.px(15, 21, (120, 70, 60))
    ic.px(16, 21, (120, 70, 60))
    ic.px(17, 21, (120, 70, 60))
    ic.px(13, 19, (230, 150, 140))
    ic.px(19, 19, (230, 150, 140))
    ic.shine([(12, 16), (13, 15)])
    return ic


def cacau():
    ic = Icon()
    pod = poly([(16, 2), (22, 6), (25, 14), (24, 22), (19, 29), (13, 29), (8, 22), (7, 14), (10, 6)])
    ic.shade(pod, (150, 84, 40))
    for x in (12, 16, 20):  # sulcos
        for y in range(6, 27):
            if (x, y) in pod and (x + 1, y) in pod:
                ic.px(x, y, (108, 58, 30))
    ic.shade(poly([(15, 0), (17, 0), (17, 3), (15, 3)]), (96, 120, 50))
    for (x, y) in ((24, 24), (27, 22), (26, 27)):  # sementes
        ic.shade(ellipse(x - 2, y - 2, x + 2, y + 2), (110, 62, 34))
    ic.shine([(11, 9), (11, 10), (12, 8)])
    return ic


def suco_colorido():
    ic = Icon()
    body = poly([(10, 12), (22, 12), (25, 18), (25, 28), (23, 30), (9, 30), (7, 28), (7, 18)])
    ic.shade(body, (180, 200, 220), outline=True)
    for y in range(13, 30):  # suco em camadas: rosa, roxo e azul
        c = (236, 104, 196) if y < 19 else (160, 96, 220) if y < 25 else (90, 150, 236)
        for x in range(0, S):
            if (x, y) in body and y > 15:
                ic.px(x, y, mix(c, (255, 255, 255), 0.25 if x < 11 else 0.0) if x > 8 else c)
    ic.shade(box(12, 6, 20, 12), (196, 210, 226))
    ic.shade(box(11, 2, 21, 6, 1), (168, 120, 72))
    for y in range(17, 28):
        ic.px(10, y, (255, 255, 255), 170)
    ic.sparkle(26, 9, big=False)
    return ic


def gelo_seco():
    ic = Icon()
    top = poly([(5, 14), (16, 9), (27, 14), (16, 19)])
    left = poly([(5, 14), (16, 19), (16, 30), (5, 25)])
    right = poly([(16, 19), (27, 14), (27, 25), (16, 30)])
    ic.shade(left, (130, 160, 196), flat=True)
    ic.shade(right, (96, 124, 160), flat=True)
    ic.shade(top, (196, 222, 246), flat=True)
    ic.line([(6, 15), (15, 19)], (236, 248, 255))
    # fumaça de gelo saindo
    for (x, y, r) in ((9, 8, 3), (15, 5, 3.5), (21, 7, 3), (25, 11, 2)):
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if math.hypot(xx - x, yy - y) <= r and hsh(xx, yy, 5) > 0.25:
                    ic.px(xx, yy, (236, 242, 250), 190)
    return ic


def semente_mandragora():
    ic = Icon()
    for (x, y) in ((10, 20), (20, 22), (15, 14)):
        ic.shade(poly([(x, y - 6), (x + 4, y), (x + 3, y + 4), (x - 3, y + 4), (x - 4, y)]), (156, 108, 62))
        ic.shine([(x - 2, y - 1)])
    ic.line([(15, 8), (15, 4)], (90, 170, 70))
    ic.shade(ellipse(15, 1, 21, 5), (96, 180, 76))
    ic.shade(ellipse(9, 2, 15, 6), (96, 180, 76))
    return ic


# ---------------------------------------------------------------- poções e comidas

def drink_fumegante():
    ic = Icon()
    glass = poly([(8, 11), (24, 11), (22, 29), (10, 29)])
    ic.shade(glass, (190, 214, 230))
    for y in range(13, 29):
        for x in range(S):
            if (x, y) in glass and (x - 1, y) in glass and (x + 1, y) in glass:
                c = (246, 120, 200) if y < 17 else (90, 210, 226)
                ic.px(x, y, mix(c, (255, 255, 255), 0.3) if x < 12 else c)
    ic.line([(19, 4), (17, 22)], (240, 80, 120), 2)
    for (x, y, r) in ((11, 7, 2.5), (14, 4, 3), (10, 2, 2), (23, 6, 2)):
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if math.hypot(xx - x, yy - y) <= r:
                    ic.px(xx, yy, (240, 244, 252), 200)
    ic.shine([(10, 14), (10, 15), (10, 16), (11, 22)])
    return ic


def cerveja_abobora():
    ic = Icon()
    mug = box(5, 10, 21, 29, 2)
    ic.shade(mug, (226, 126, 40))
    for x in (9, 13, 17):
        for y in range(12, 28):
            ic.px(x, y, (196, 98, 30))
    ic.shade(E(lambda d: d.arc((17, 13, 28, 25), -90, 90, fill=255, width=3)), (176, 128, 80))
    foam = ellipse(3, 5, 12, 13) | ellipse(9, 4, 18, 12) | ellipse(15, 6, 23, 13)
    ic.shade(foam, (250, 244, 226))
    ic.px(7, 13, (250, 244, 226))
    ic.px(7, 14, (250, 244, 226))
    ic.shine([(7, 15), (7, 16), (7, 17)])
    return ic


def sobremesa_mandragora():
    ic = Icon()
    ic.shade(poly([(4, 20), (28, 20), (24, 29), (8, 29)]), (236, 230, 220))
    ic.shade(ellipse(6, 11, 26, 23), (124, 72, 42))
    ic.shade(ellipse(8, 9, 24, 17), (150, 92, 54))
    for (x, y) in ((10, 13), (14, 11), (19, 12), (22, 14)):
        ic.px(x, y, (250, 230, 200))
    for (pts, c) in ((poly([(16, 10), (11, 3), (14, 2), (17, 9)]), (88, 176, 76)),
                     (poly([(16, 10), (21, 2), (23, 4), (17, 10)]), (88, 176, 76))):
        ic.shade(pts, c)
    ic.shade(ellipse(18, 5, 23, 10), (220, 60, 70))
    ic.shine([(19, 6)])
    return ic


def pocao_vigor():
    ic = Icon()
    flask = ellipse(5, 11, 27, 31)
    ic.shade(flask, (210, 56, 70))
    for x in range(S):  # nível do líquido
        for y in range(11, 16):
            if (x, y) in flask:
                ic.px(x, y, (196, 214, 232))
    ic.shade(box(12, 5, 20, 12), (196, 214, 232))
    ic.shade(box(11, 1, 21, 6, 1), (168, 120, 72))
    for (x, y) in ((12, 22), (18, 25), (15, 19), (21, 20)):
        ic.px(x, y, (255, 170, 170))
    ic.shine([(9, 18), (9, 19), (10, 17), (9, 20)])
    return ic


def elixir_estelar():
    ic = Icon()
    body = poly([(13, 8), (19, 8), (19, 13), (25, 20), (25, 30), (7, 30), (7, 20), (13, 13)])
    ic.shade(body, (50, 60, 150))
    ic.shade(box(12, 3, 20, 8), (232, 190, 80))
    ic.shade(ellipse(13, 0, 19, 5), (250, 214, 110))
    for (x, y) in ((11, 23), (19, 26), (15, 21), (21, 22), (12, 28)):
        ic.px(x, y, (255, 240, 170))
    ic.sparkle(16, 25)
    ic.shine([(9, 21), (9, 22), (9, 23)])
    ic.sparkle(27, 5, big=False)
    return ic


# ---------------------------------------------------------------- objetos

def varinha():
    ic = Icon()
    ic.line([(5, 28), (22, 9)], (40, 24, 18), 4)
    ic.line([(5, 28), (22, 9)], (116, 72, 40), 2)
    ic.line([(6, 26), (13, 18)], (156, 104, 60), 1)
    for (x, y) in ((8, 25), (10, 23)):  # anéis do cabo
        ic.px(x, y, (232, 190, 80))
        ic.px(x + 1, y, (232, 190, 80))
        ic.px(x, y - 1, (180, 136, 50))
    # ponta brilhando
    for r, a in ((5, 70), (3, 140)):
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                if math.hypot(xx, yy) <= r:
                    ic.px(24 + xx, 7 + yy, (255, 230, 140), a)
    ic.sparkle(24, 7)
    ic.sparkle(28, 13, big=False)
    ic.sparkle(18, 3, big=False)
    return ic


def livro(base, emblem):
    def make():
        ic = Icon()
        ic.shade(box(6, 4, 27, 29, 1), (236, 228, 206), flat=True)  # páginas
        for y in range(6, 28, 2):
            ic.px(26, y, (196, 186, 160))
        ic.shade(box(4, 3, 24, 28, 2), base)
        ic.shade(box(4, 3, 7, 28), mix(base, (0, 0, 0), 0.3), flat=True, outline=False)
        for (x, y) in ((22, 4), (22, 26), (5, 4), (5, 26)):  # cantoneiras douradas
            ic.px(x, y, (240, 200, 90))
            ic.px(x + 1, y, (240, 200, 90))
        emblem(ic)
        ic.shine([(9, 5), (10, 5), (11, 5)])
        return ic
    return make


def emblema_grimorio(ic):
    ic.shade(ellipse(10, 10, 20, 20), (232, 190, 80))
    ic.shade(ellipse(13, 13, 17, 17), (120, 70, 170))


def emblema_coracao(ic):
    ic.shade(poly([(15, 22), (9, 15), (9, 11), (12, 9), (15, 11), (18, 9), (21, 11), (21, 15)]), (240, 200, 90))


def estrela():
    ic = Icon()
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        r = 14 if k % 2 == 0 else 6
        pts.append((16 + math.cos(a) * r, 17 + math.sin(a) * r))
    star = poly(pts)
    ic.shade(star, (250, 200, 60))
    for rr, a in ((14, 40), (10, 70)):  # brilho em volta, só fora da estrela
        for yy in range(-rr, rr + 1):
            for xx in range(-rr, rr + 1):
                q = (16 + xx, 17 + yy)
                if math.hypot(xx, yy) <= rr and 0 <= q[0] < S and 0 <= q[1] < S and ic.img.getpixel(q)[3] < 255:
                    ic.img.putpixel(q, (255, 236, 150, max(a, ic.img.getpixel(q)[3])))
    ic.px(13, 17, (90, 60, 30))
    ic.px(19, 17, (90, 60, 30))
    ic.px(15, 20, (200, 110, 60))
    ic.px(16, 20, (200, 110, 60))
    ic.px(17, 20, (200, 110, 60))
    ic.sparkle(26, 5, big=False)
    ic.sparkle(5, 26, big=False)
    return ic


def mapa():
    ic = Icon()
    sheet = poly([(4, 7), (12, 4), (20, 7), (28, 4), (28, 25), (20, 28), (12, 25), (4, 28)])
    ic.shade(sheet, (232, 214, 168), flat=True)
    for (pts, c) in ((poly([(12, 4), (20, 7), (20, 28), (12, 25)]), (210, 190, 140)),):
        ic.shade(pts, c, flat=True, outline=False)
    ic.line([(7, 22), (10, 15), (15, 17), (19, 12)], (150, 110, 70))
    for (x, y) in ((22, 9), (23, 10), (24, 11), (24, 9), (22, 11)):  # X vermelho
        ic.px(x, y, (200, 50, 40))
    ic.shade(box(13, 14, 19, 18), (196, 60, 60))
    return ic


def chave(base, x0, y0, big):
    def draw(ic):
        r = 5 if big else 3
        ring = ellipse(x0 - r, y0 - r, x0 + r, y0 + r) - ellipse(x0 - r + 2, y0 - r + 2, x0 + r - 2, y0 + r - 2)
        ic.shade(ring, base)
        L = 16 if big else 10
        ic.shade(box(x0 + r - 1, y0 - 1, x0 + r + L, y0 + 1), base)
        ic.shade(box(x0 + r + L - 5, y0 + 1, x0 + r + L - 3, y0 + 4), base)
        ic.shade(box(x0 + r + L - 1, y0 + 1, x0 + r + L, y0 + 3), base)
    return draw


def chave_do_porao():
    ic = Icon()
    chave((110, 104, 112), 9, 16, True)(ic)
    for (x, y) in ((6, 12), (12, 20)):
        ic.px(x, y, (150, 90, 50))
    ic.shine([(6, 13), (7, 12)])
    return ic


def chaves_trinco():
    ic = Icon()
    ic.shade(ellipse(4, 3, 14, 13) - ellipse(6, 5, 12, 11), (232, 190, 80))
    chave((214, 176, 70), 12, 14, False)(ic)
    chave((176, 180, 196), 10, 21, False)(ic)
    chave((200, 120, 70), 14, 27, False)(ic)
    return ic


HAND = {
    "abobora": abobora, "folha-mandragora": folha_mandragora, "cacau": cacau, "suco-colorido": suco_colorido,
    "gelo-seco": gelo_seco, "semente-mandragora": semente_mandragora, "drink-fumegante": drink_fumegante,
    "cerveja-abobora": cerveja_abobora, "sobremesa-mandragora": sobremesa_mandragora, "pocao-vigor": pocao_vigor,
    "elixir-estelar": elixir_estelar, "varinha": varinha, "grimorio": livro((92, 60, 146), emblema_grimorio),
    "livro-coracao": livro((170, 46, 60), emblema_coracao), "estrela-perdida": estrela, "mapa-dos-segredos": mapa,
    "chave-do-porao": chave_do_porao, "chaves-trinco": chaves_trinco,
}


# ---------------------------------------------------------------- o resto: EPX + contorno novo

def epx(src):
    """Scale2x (EPX): dobra o tamanho arredondando as diagonais sem borrar."""
    w, h = src.size
    out = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
    g = lambda x, y: src.getpixel((min(max(x, 0), w - 1), min(max(y, 0), h - 1)))
    for y in range(h):
        for x in range(w):
            p = g(x, y)
            a, b, c, d = g(x, y - 1), g(x + 1, y), g(x - 1, y), g(x, y + 1)
            e1 = a if (c == a and c != d and a != b) else p
            e2 = b if (a == b and a != c and b != d) else p
            e3 = c if (d == c and d != b and c != a) else p
            e4 = d if (b == d and b != a and d != c) else p
            out.putpixel((x * 2, y * 2), e1)
            out.putpixel((x * 2 + 1, y * 2), e2)
            out.putpixel((x * 2, y * 2 + 1), e3)
            out.putpixel((x * 2 + 1, y * 2 + 1), e4)
    return out


def upscale(icon16):
    big = epx(icon16)
    ic = Icon()
    ic.img = big.copy()
    # contorno escuro de 1px por fora e um brilho na quina de cima
    pts = {(x, y) for y in range(S) for x in range(S) if big.getpixel((x, y))[3] > 0}
    for (x, y) in pts:
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in pts and 0 <= q[0] < S and 0 <= q[1] < S and ic.img.getpixel(q)[3] == 0:
                c = big.getpixel((x, y))
                ic.img.putpixel(q, ramp(c[:3])[0] + (255,))
    for (x, y) in pts:
        if (x - 1, y) not in pts and (x, y - 1) not in pts:
            c = big.getpixel((x, y))
            ic.img.putpixel((x, y), ramp(c[:3])[4] + (255,))
    return ic


def render_icones32():
    with open(os.path.join(ROOT, "manifest.json")) as fh:
        names = json.load(fh)["spritesheets"]["ui.icones"]["frameNames"]
    small = Image.open(os.path.join(ROOT, "ui", "icones.png")).convert("RGBA")
    order = sorted(names.items(), key=lambda kv: kv[1])
    count = max(i for _, i in order) + 1
    sheet = Image.new("RGBA", (S * count, S), (0, 0, 0, 0))
    for name, i in order:
        if name in HAND:
            ic = HAND[name]()
        else:
            ic = upscale(small.crop((i * 16, 0, i * 16 + 16, 16)))
        sheet.alpha_composite(ic.img, (i * S, 0))
    sheet.save(os.path.join(ROOT, "ui", "icones32.png"))
    return [("ui.icones32", "ui/icones32.png", S, S)]


if __name__ == "__main__":
    render_icones32()
    im = Image.open(os.path.join(ROOT, "ui", "icones32.png"))
    print(im.size)

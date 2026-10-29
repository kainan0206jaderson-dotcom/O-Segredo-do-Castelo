"""Bolsa do aprendiz: a bolsa de couro que abre (animação), a textura de couro do painel e o bolsinho
de cada item. Gera ui/bolsa.png (4 quadros 64x64), ui/couro.png (64x64, emenda sem costura)
e ui/bolso.png (2 quadros 36x36: normal e escolhido).
"""
import math
import os

from PIL import Image

import art_icones32 as A
from art_lib import ROOT, hsh, mix, ramp

LEATHER = (150, 92, 50)
LEATHER_D = (112, 66, 36)
INSIDE = (54, 32, 22)
BRASS = (226, 180, 80)
STITCH = (232, 204, 150)


def big(fn):
    """Desenha com as ferramentas dos ícones numa tela de 64x64."""
    old = A.S
    A.S = 64
    try:
        return fn()
    finally:
        A.S = old


def stitches(ic, pts, every=3):
    for k, (x, y) in enumerate(pts):
        if k % every == 0:
            ic.px(x, y, STITCH)


def bag(frame):
    def draw():
        ic = A.Icon()
        E = A.Icon.mask
        # alça
        handle = E(lambda d: d.arc((14, 2, 50, 38), 180, 360, fill=255, width=4))
        ic.shade(handle, LEATHER_D)
        if frame >= 2:
            # aba virada para trás, mostrando o lado de dentro (mais claro)
            ic.shade(A.poly([(10, 22), (54, 22), (50, 6), (14, 6)]), mix(LEATHER, (220, 180, 130), 0.25))
            stitches(ic, [(x, 9) for x in range(16, 49)])
        body = A.box(8, 22, 56, 60, 8)
        ic.shade(body, LEATHER)
        stitches(ic, [(x, 57) for x in range(13, 52)] + [(11, y) for y in range(27, 56)] + [(53, y) for y in range(27, 56)])
        # bolsinho da frente
        ic.shade(A.box(20, 40, 44, 54, 4), LEATHER_D)
        stitches(ic, [(x, 42) for x in range(23, 42)], 2)
        if frame == 0:
            flap = A.poly([(6, 20), (58, 20), (58, 34), (50, 42), (14, 42), (6, 34)])
        elif frame == 1:
            flap = A.poly([(6, 20), (58, 20), (56, 12), (50, 8), (14, 8), (8, 12)])
        else:
            flap = set()
        if frame >= 1:
            # boca aberta: escuro de dentro, com um brilho dourado
            mouth = A.ellipse(11, 17, 53, 29)
            for (x, y) in mouth:
                ic.px(x, y, INSIDE)
            if frame >= 2:
                for r, a in ((12, 90), (8, 150), (4, 220)):
                    for (x, y) in A.ellipse(32 - r * 1.6, 23 - r * 0.45, 32 + r * 1.6, 23 + r * 0.45):
                        ic.px(x, y, (255, 214, 120), a)
        if flap:
            ic.shade(flap, mix(LEATHER, LEATHER_D, 0.4))
            ys = max(y for _, y in flap)
            stitches(ic, [(x, ys - 3) for x in range(16, 49)] + [(9, y) for y in range(23, ys - 6)] + [(55, y) for y in range(23, ys - 6)])
            # fivela de latão
            bx, by = 32, ys - 1
            ic.shade(A.box(bx - 5, by - 4, bx + 5, by + 4, 1), BRASS)
            ic.shade(A.box(bx - 2, by - 1, bx + 2, by + 1), (120, 80, 40), outline=False)
        if frame == 3:
            # raios de luz e faíscas saindo da bolsa
            for k, ang in enumerate((-60, -90, -120, -75, -105)):
                for r in range(8, 22 if k < 3 else 16):
                    x = 32 + math.cos(math.radians(ang)) * r
                    y = 22 + math.sin(math.radians(ang)) * r * 0.9
                    ic.px(round(x), round(y), (255, 236, 160), 200 - r * 7)
            for (x, y) in ((20, 6), (44, 4), (32, 1), (52, 12)):
                ic.sparkle(x, y, big=False)
        return ic.img
    return big(draw)


def couro():
    """Textura de couro 64x64 que emenda dos quatro lados."""
    img = Image.new("RGBA", (64, 64))
    base = (84, 52, 34)
    for y in range(64):
        for x in range(64):
            n = (hsh(x % 64, y % 64, 11) * 0.5 + hsh((x // 2) % 32, (y // 2) % 32, 12) * 0.3
                 + hsh((x // 4) % 16, (y // 4) % 16, 13) * 0.2)
            c = mix(base, (104, 66, 42), n)
            if hsh(x, y, 14) > 0.97:  # poros
                c = mix(c, (60, 36, 24), 0.6)
            img.putpixel((x, y), c + (255,))
    return img


def bolso(selected):
    """Bolsinho de couro costurado onde cada item fica."""
    img = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    r = ramp((70, 42, 28) if not selected else (110, 74, 44))
    for y in range(36):
        for x in range(36):
            corner = min(x, 35 - x) + min(y, 35 - y)
            if corner < 3:
                continue
            c = r[2]
            if x == 0 or y == 0 or x == 35 or y == 35 or corner == 3:
                c = r[0]
            elif y <= 2 or x <= 2:
                c = r[1]  # sombra de dentro, em cima e à esquerda
            elif y >= 33 or x >= 33:
                c = r[3]
            img.putpixel((x, y), c + (255,))
    stitch = (236, 210, 140) if selected else (170, 130, 90)
    for k in range(4, 32, 3):
        for (x, y) in ((k, 4), (k, 31), (4, k), (31, k)):
            img.putpixel((x, y), stitch + (255,))
    return img


def render_bolsa():
    os.makedirs(os.path.join(ROOT, "ui"), exist_ok=True)
    sheet = Image.new("RGBA", (64 * 4, 64), (0, 0, 0, 0))
    for f in range(4):
        sheet.alpha_composite(bag(f), (f * 64, 0))
    sheet.save(os.path.join(ROOT, "ui", "bolsa.png"))
    couro().save(os.path.join(ROOT, "ui", "couro.png"))
    b = Image.new("RGBA", (72, 36), (0, 0, 0, 0))
    b.alpha_composite(bolso(False), (0, 0))
    b.alpha_composite(bolso(True), (36, 0))
    b.save(os.path.join(ROOT, "ui", "bolso.png"))
    return [("ui.bolsa", "ui/bolsa.png", 64, 64), ("ui.couro", "ui/couro.png", 64, 64), ("ui.bolso", "ui/bolso.png", 36, 36)]


if __name__ == "__main__":
    render_bolsa()
    im = Image.open(os.path.join(ROOT, "ui", "bolsa.png"))
    out = Image.new("RGBA", (64 * 4 + 72 + 64, 64), (42, 33, 64, 255))
    out.alpha_composite(im, (0, 0))
    out.alpha_composite(Image.open(os.path.join(ROOT, "ui", "bolso.png")), (256, 0))
    out.alpha_composite(Image.open(os.path.join(ROOT, "ui", "couro.png")), (328, 0))
    out.resize((out.width * 3, out.height * 3), Image.NEAREST).save(os.environ.get('PREVIEW', os.devnull + '.png'))

"""Logo do jogo em estilo letreiro: placa de madeira com moldura dourada, correntes,
lampadinhas em volta e o nome com letras douradas em degradê, contorno e sombra.
As letras usam a fonte Pixelify Sans (SIL OFL, em public/fonts) desenhada sem
suavização, para ficar no mesmo pixel do resto do jogo.
"""
import os

from PIL import Image, ImageDraw, ImageFont

from art_lib import ROOT, mix

FONT = os.path.join(ROOT, "..", "fonts", "PixelifySans.ttf")
INK = (26, 18, 34)
GOLD = [(150, 92, 30), (206, 140, 44), (246, 196, 72), (255, 234, 140), (255, 250, 214)]
WOOD = [(58, 34, 26), (88, 54, 36), (116, 74, 46), (142, 94, 58)]


def crisp_text(text, size):
    """Texto em 1 bit (sem antisserrilhado), recortado."""
    font = ImageFont.truetype(FONT, size)
    l, t, r, b = font.getbbox(text)
    im = Image.new("L", (r - l + 4, b - t + 4), 0)
    d = ImageDraw.Draw(im)
    d.fontmode = "1"
    d.text((2 - l, 2 - t), text, font=font, fill=255)
    return im.point(lambda v: 255 if v > 127 else 0)


def lettering(text, size, ramp, outline=INK, shadow=2):
    """Letras com degradê vertical, brilho no alto, contorno de 1 px e sombra."""
    mask = crisp_text(text, size)
    w, h = mask.size
    pad = 2 + shadow
    out = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    m = mask.load()
    op = out.load()
    ys = [y for y in range(h) for x in range(w) if m[x, y]]
    y0, y1 = min(ys), max(ys)

    def on(x, y):
        return 0 <= x < w and 0 <= y < h and m[x, y]

    # sombra e contorno
    for y in range(-2, h + 2):
        for x in range(-2, w + 2):
            if on(x, y):
                continue
            if any(on(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                op[x + pad, y + pad] = outline + (255,)
    for y in range(h):
        for x in range(w):
            if on(x, y):
                for s in range(1, shadow + 1):
                    px, py = x + pad + 1, y + pad + 1 + s
                    if op[px, py][3] == 0:
                        op[px, py] = (10, 6, 16, 200)
    # preenchimento
    for y in range(h):
        for x in range(w):
            if not on(x, y):
                continue
            k = (y - y0) / max(1, y1 - y0)
            c = ramp[min(len(ramp) - 1, int((1 - k) * (len(ramp) - 1) + 0.5))]
            if not on(x, y - 1):
                c = ramp[-1]
            elif not on(x, y + 1):
                c = ramp[0]
            op[x + pad, y + pad] = c + (255,)
    return out


def logo():
    title = lettering("O Segredo do Castelo", 32, GOLD[1:])
    sub = lettering("MAGIA & BRUXARIA", 14, [(120, 100, 170), (176, 160, 220), (226, 216, 250), (250, 246, 255)], shadow=1)
    w = max(title.width + 40, 300)
    h = title.height + sub.height + 12
    top = 14  # espaço das correntes
    im = Image.new("RGBA", (w, h + top), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    bx0, by0, bx1, by1 = 4, top, w - 5, h + top - 1
    # correntes
    for cx in (bx0 + 30, bx1 - 30):
        for y in range(0, top + 2, 3):
            d.rectangle([cx - 1, y, cx + 1, y + 1], outline=(150, 150, 170))
    # placa de madeira com tábuas
    d.rectangle([bx0, by0, bx1, by1], fill=WOOD[2])
    for y in range(by0, by1 + 1):
        plank = (y - by0) // 9
        for x in range(bx0, bx1 + 1):
            if (y - by0) % 9 == 0:
                im.putpixel((x, y), WOOD[0] + (255,))
            elif (x * 7 + plank * 13) % 23 == 0 or (x + y * 3 + plank) % 41 == 0:
                im.putpixel((x, y), WOOD[1] + (255,))
            elif (y - by0) % 9 == 1:
                im.putpixel((x, y), WOOD[3] + (255,))
    # moldura dourada dupla
    d.rectangle([bx0, by0, bx1, by1], outline=INK)
    d.rectangle([bx0 + 1, by0 + 1, bx1 - 1, by1 - 1], outline=GOLD[2])
    d.rectangle([bx0 + 2, by0 + 2, bx1 - 2, by1 - 2], outline=GOLD[0])
    d.rectangle([bx0 + 4, by0 + 4, bx1 - 4, by1 - 4], outline=mix(WOOD[0], INK, 0.5))
    # cantos com pregos dourados
    for cx, cy in ((bx0 + 7, by0 + 7), (bx1 - 7, by0 + 7), (bx0 + 7, by1 - 7), (bx1 - 7, by1 - 7)):
        d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=GOLD[3], outline=GOLD[0])
    # soquetes das lampadinhas na moldura (a luz pisca na cena)
    bulbs = []
    for x in range(bx0 + 16, bx1 - 10, 14):
        bulbs += [(x, by0 + 1), (x, by1 - 1)]
    for y in range(by0 + 14, by1 - 8, 14):
        bulbs += [(bx0 + 1, y), (bx1 - 1, y)]
    for x, y in bulbs:
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=(255, 236, 170), outline=INK)
    im.alpha_composite(sub, ((w - sub.width) // 2, by0 + 6))
    im.alpha_composite(title, ((w - title.width) // 2, by0 + 6 + sub.height - 2))
    return im, bulbs


def render_logo():
    im, bulbs = logo()
    im.save(os.path.join(ROOT, "ui", "logo.png"))
    # posições das lampadinhas, para a tela inicial fazer elas piscarem
    with open(os.path.join(ROOT, "..", "..", "src", "ui", "logo-lampadas.json"), "w") as f:
        f.write("[" + ",".join(f"[{x},{y}]" for x, y in bulbs) + "]\n")
    return [("ui.logo", "ui/logo.png", im.width, im.height)]

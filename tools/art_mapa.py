"""Mapa dos Segredos [FICÇÃO]: pergaminho em pixel art com as salas desenhadas a partir dos mapas de verdade.

Gera ui/mapa.png (dois quadros de 480x270: salas visitadas e "névoa" das salas ainda não vistas),
ui/mapa-marcas.png (estrela, baú, segredo, alfinete "você") e src/ui/mapa-layout.json (onde fica
cada sala, para o jogo pôr nomes, névoa e marcas por cima).
"""
import json
import math
import os

from PIL import Image

from art_lib import ROOT, hsh, mix

W, H = 480, 270
T = 2  # pixels por tile no desenho das salas

PAPER = (232, 214, 168)
PAPER_D = (214, 192, 142)
PAPER_DD = (188, 162, 112)
INK = (74, 50, 32)
INK_L = (128, 96, 60)
GOLD = (196, 150, 60)
GOLD_L = (240, 206, 110)
RED = (164, 52, 44)
RED_D = (112, 32, 30)

# canto superior esquerdo de cada sala (pixels) e onde vai o nome: abaixo (b), acima (t) ou à esquerda (e)
SALAS = {
    "map.hall": (14, 108, "Hall da Escada", "b"),
    "map.corredor": (62, 110, "Corredor", "b"),
    "map.gabinete": (98, 80, "Gabinete", "t"),
    "map.grande-salao": (134, 102, "Grande Salão", "t"),
    "map.cozinha": (194, 106, "Cozinha", "b"),
    "map.recepcao": (142, 148, "Recepção", "b"),
    "map.porao": (194, 156, "Porão", "b"),
    "map.estufa": (282, 188, "Estufa", "b"),
    "map.biblioteca": (330, 186, "Biblioteca", "b"),
    "map.sala-espectral": (390, 188, "Aula", "b"),
    "map.observatorio": (322, 150, "Observatório", "e"),
    "map.galeria": (340, 116, "Galeria", "e"),
    "map.coracao": (408, 116, "Coração", "b"),
    "map.ala-professores": (14, 56, "Ala dos Professores", "b"),
}
# salas de aula da Ala dos Professores: quadradinhos acima da Ala, ligados às portas do norte
AULAS = {
    "map.aula-feiticos": "Sala de Feitiços",
    "map.aula-pocoes": "Masmorra de Poções",
    "map.aula-herbologia": "Estufa de Aula",
    "map.aula-adivinhacao": "Torre de Adivinhação",
    "map.aula-literatura": "Sala de Literatura Mágica",
    "map.aula-defesa": "Sala de Defesa",
}
AULA_W, AULA_H = 7, 5
# nomes que desviam: o da Biblioteca da escadinha, o da Ala do corredor que desce para o Hall
DX = {"map.biblioteca": -16, "map.ala-professores": 17}
QUADROS = ["map.quadro-coragem", "map.quadro-inteligencia", "map.quadro-astucia", "map.quadro-lealdade"]
QUADRO_W, QUADRO_H = 14, 11


def load_map(key):
    with open(os.path.join(ROOT, "maps", key[4:] + ".tmj")) as fh:
        return json.load(fh)


def tile_minis():
    """Cada tile do tileset reduzido a 2x2 (média de cada quarto), em tons de pergaminho."""
    ts = Image.open(os.path.join(ROOT, "tilesets", "castelo.png")).convert("RGBA")
    cols = ts.width // 16
    out = {}
    for i in range(cols * (ts.height // 16)):
        tile = ts.crop(((i % cols) * 16, (i // cols) * 16, (i % cols) * 16 + 16, (i // cols) * 16 + 16))
        out[i + 1] = tile.resize((T, T), Image.BOX)
    return out


def sepia(c, amount=0.35):
    """Puxa a cor para tinta aquarelada no papel: menos saturada e mais quente."""
    g = sum(c[:3]) / 3
    warm = (min(255, g * 1.08 + 18), min(255, g * 0.96 + 10), min(255, g * 0.78))
    return mix(c[:3], warm, amount)


def room_image(key, minis):
    m = load_map(key)
    w, h = m["width"], m["height"]
    img = Image.new("RGBA", (w * T, h * T), (0, 0, 0, 0))
    floor = next(l for l in m["layers"] if l["name"] == "chao")["data"]
    walls = next(l for l in m["layers"] if l["name"] == "paredes")["data"]
    for y in range(h):
        for x in range(w):
            gid = walls[y * w + x] or floor[y * w + x]
            if not gid:
                continue
            mini = minis.get(gid & 0x0FFFFFFF)
            if mini is None:
                continue
            for dy in range(T):
                for dx in range(T):
                    c = mini.getpixel((dx, dy))
                    img.putpixel((x * T + dx, y * T + dy), mix(sepia(c, 0.45), PAPER, 0.22) + (255,))
    return img, m


def door_points(key, m, ox, oy, scale=T):
    """Portas da sala: ponto no desenho, lado (L/O/N/S/dentro), destino e se é secreta ou trancada."""
    w, h = m["width"], m["height"]
    out = []
    for layer in m["layers"]:
        for o in layer.get("objects", []):
            if o.get("type") != "door":
                continue
            props = {p["name"]: p["value"] for p in o.get("properties", [])}
            tx, ty = o["x"] / 16, o["y"] / 16
            tw, th = o["width"] / 16, o["height"] / 16
            if tx <= 0:
                side = "O"
            elif tx + tw >= w:
                side = "L"
            elif ty <= 0:
                side = "N"
            elif ty + th >= h:
                side = "S"
            else:
                side = "dentro"
            px = ox + (tx + tw / 2) * scale
            py = oy + (ty + th / 2) * scale
            if side == "O":
                px = ox
            elif side == "L":
                px = ox + w * scale
            elif side == "N":
                py = oy
            elif side == "S":
                py = oy + h * scale
            out.append({"x": round(px), "y": round(py), "side": side, "target": props.get("target"), "secret": "when" in props})
    return out


# ---------------------------------------------------------------- pergaminho

def parchment():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = img.load()
    for y in range(H):
        for x in range(W):
            # borda rasgada: um pouco para dentro, irregular
            edge = min(x, y, W - 1 - x, H - 1 - y)
            rag = 2 + int(hsh(x // 3, y // 3, 7) * 3) + int(hsh(x // 11, y // 11, 9) * 2)
            if edge < rag - 2:
                continue
            n = hsh(x // 2, y // 2, 3) * 0.6 + hsh(x // 7, y // 7, 4) * 0.4
            c = mix(PAPER, PAPER_D, n * 0.55)
            # mancha de envelhecimento nas bordas
            d = min(edge / 26, 1)
            c = mix(PAPER_DD, c, 0.35 + 0.65 * d)
            if edge < rag:
                c = mix(c, PAPER_DD, 0.7)
            px[x, y] = c + (255,)
    # manchas de chá e dobras
    for (cx, cy, r) in ((118, 222, 15), (446, 58, 11), (28, 54, 9)):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                d = math.hypot(x - cx, (y - cy) * 1.2) / r
                if d <= 1 and 0 <= x < W and 0 <= y < H and px[x, y][3]:
                    t = 0.10 if d < 0.85 else 0.22
                    px[x, y] = mix(px[x, y], PAPER_DD, t) + (255,)
    for x in range(W):
        if px[x, H // 2][3]:
            px[x, H // 2] = mix(px[x, H // 2], PAPER_DD, 0.25) + (255,)
    for y in range(H):
        if px[W // 2, y][3]:
            px[W // 2, y] = mix(px[W // 2, y], PAPER_DD, 0.18) + (255,)
    return img


def put(img, x, y, c):
    if 0 <= x < W and 0 <= y < H and img.getpixel((x, y))[3]:
        img.putpixel((x, y), c + (255,) if len(c) == 3 else c)


def hline(img, x1, x2, y, c):
    for x in range(min(x1, x2), max(x1, x2) + 1):
        put(img, x, y, c)


def vline(img, x, y1, y2, c):
    for y in range(min(y1, y2), max(y1, y2) + 1):
        put(img, x, y, c)


def rect(img, x1, y1, x2, y2, c):
    for y in range(y1, y2 + 1):
        hline(img, x1, x2, y, c)


def frame(img, x1, y1, x2, y2, c, dashed=False):
    for x in range(x1, x2 + 1):
        if not dashed or (x // 2) % 2 == 0:
            put(img, x, y1, c)
            put(img, x, y2, c)
    for y in range(y1, y2 + 1):
        if not dashed or (y // 2) % 2 == 0:
            put(img, x1, y, c)
            put(img, x2, y, c)


def border(img):
    frame(img, 8, 8, W - 9, H - 9, INK)
    frame(img, 11, 11, W - 12, H - 12, INK_L)
    # cantos com losango e voltinhas
    for (cx, cy) in ((9, 9), (W - 10, 9), (9, H - 10), (W - 10, H - 10)):
        for d in range(-4, 5):
            k = 4 - abs(d)
            hline(img, cx - k, cx + k, cy + d, PAPER)
        for d in range(-4, 5):
            k = 4 - abs(d)
            put(img, cx - k, cy + d, INK)
            put(img, cx + k, cy + d, INK)
        put(img, cx, cy, GOLD)
        for d in (-1, 1):
            put(img, cx + d, cy, GOLD_L)
            put(img, cx, cy + d, GOLD_L)


def ribbon(img, cx, y, w):
    """Faixa vermelha do título, com as pontas dobradas."""
    x1, x2 = cx - w // 2, cx + w // 2
    for yy in range(y + 3, y + 15):
        notch = 5 - abs(yy - (y + 9))  # recorte em V nas pontas
        for x in range(x1 - 12, x1):
            if x - (x1 - 12) >= max(0, notch):
                put(img, x, yy, RED_D)
        for x in range(x2 + 1, x2 + 13):
            if (x2 + 12) - x >= max(0, notch):
                put(img, x, yy, RED_D)
    rect(img, x1, y, x2, y + 16, RED)
    hline(img, x1, x2, y + 1, mix(RED, (255, 200, 170), 0.35))
    hline(img, x1, x2, y + 16, RED_D)
    frame(img, x1, y, x2, y + 16, RED_D)
    for x in range(x1 + 3, x2 - 2, 4):
        put(img, x, y + 3, GOLD)
        put(img, x, y + 13, GOLD)


def compass(img, cx, cy, r):
    """Rosa dos ventos em tinta, com o norte dourado."""
    for a in range(0, 360, 3):
        x = cx + round(math.cos(math.radians(a)) * r)
        y = cy + round(math.sin(math.radians(a)) * r)
        put(img, x, y, INK_L)
    for a in range(0, 360, 6):
        x = cx + round(math.cos(math.radians(a)) * (r - 3))
        y = cy + round(math.sin(math.radians(a)) * (r - 3))
        put(img, x, y, INK_L)
    for ang, length, col in ((270, r + 4, GOLD), (90, r, INK), (0, r, INK), (180, r, INK),
                             (315, r * 0.55, INK_L), (45, r * 0.55, INK_L), (135, r * 0.55, INK_L), (225, r * 0.55, INK_L)):
        dx, dy = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        nx, ny = -dy, dx
        steps = int(length)
        for s in range(steps):
            half = (1 - s / steps) * 2.6
            for k in range(-int(half), int(half) + 1):
                x = round(cx + dx * s + nx * k * 0.6)
                y = round(cy + dy * s + ny * k * 0.6)
                shade = col if k <= 0 else mix(col, PAPER, 0.35)
                put(img, x, y, shade)
    put(img, cx, cy, GOLD_L)
    # "N" em pixels acima da ponta norte
    nx0, ny0 = cx - 2, cy - r - 11
    for k in range(5):
        put(img, nx0, ny0 + k, INK)
        put(img, nx0 + 4, ny0 + k, INK)
        if 1 <= k <= 3:
            put(img, nx0 + k, ny0 + k, INK)


def moon_and_stars(img, cx, cy):
    for y in range(cy - 9, cy + 10):
        for x in range(cx - 9, cx + 10):
            if math.hypot(x - cx, y - cy) <= 8.5 and math.hypot(x - cx - 4, y - cy + 2) > 7:
                edge = math.hypot(x - cx, y - cy) > 7.4
                put(img, x, y, INK if edge else GOLD_L)
    for (sx, sy, big) in ((cx + 16, cy - 6, True), (cx + 26, cy + 6, False), (cx + 12, cy + 12, False),
                          (cx - 14, cy + 14, True), (cx + 30, cy - 12, False)):
        put(img, sx, sy, GOLD)
        if big:
            for d in (-1, 1):
                put(img, sx + d, sy, GOLD_L)
                put(img, sx, sy + d, GOLD_L)
            for d in (-2, 2):
                put(img, sx + d, sy, INK_L)
                put(img, sx, sy + d, INK_L)


def castle_sketch(img, x0, y0):
    """Castelinho desenhado à tinta: três torres com telhado pontudo e bandeirinha."""
    def tower(cx, top, w, base):
        for y in range(top, base + 1):
            put(img, cx - w, y, INK)
            put(img, cx + w, y, INK)
        for k in range(w + 1):  # telhado
            put(img, cx - w + k, top - k, INK)
            put(img, cx + w - k, top - k, INK)
        put(img, cx, top - w - 1, INK)
        put(img, cx, top - w - 2, INK)
        hline(img, cx + 1, cx + 3, top - w - 2, RED)
        put(img, cx + 1, top - w - 1, RED)
        for wy in range(top + 3, base - 2, 5):
            put(img, cx, wy, GOLD)
            put(img, cx, wy + 1, GOLD)
    base = y0 + 30
    tower(x0 + 8, y0 + 12, 4, base)
    tower(x0 + 22, y0 + 4, 5, base)
    tower(x0 + 36, y0 + 12, 4, base)
    hline(img, x0 + 12, x0 + 17, y0 + 18, INK)
    hline(img, x0 + 27, x0 + 32, y0 + 18, INK)
    for x in range(x0 + 12, x0 + 18, 2):
        put(img, x, y0 + 17, INK)
    for x in range(x0 + 28, x0 + 33, 2):
        put(img, x, y0 + 17, INK)
    hline(img, x0 + 2, x0 + 42, base, INK)
    for k in range(4):  # portão em arco
        put(img, x0 + 20, base - k, INK)
        put(img, x0 + 24, base - k, INK)
    hline(img, x0 + 21, x0 + 23, base - 5, INK)
    for x in range(x0 - 4, x0 + 48, 3):  # chão de grama
        put(img, x, base + 2, INK_L)
        put(img, x + 1, base + 1, INK_L)


def inkwell(img, x0, y0):
    """Tinteiro com pena."""
    for y in range(y0 + 10, y0 + 20):
        w = 6 if y > y0 + 12 else 4
        hline(img, x0 + 8 - w, x0 + 8 + w, y, (40, 34, 48))
    hline(img, x0 + 2, x0 + 14, y0 + 20, INK)
    hline(img, x0 + 6, x0 + 10, y0 + 9, INK)
    put(img, x0 + 5, y0 + 14, (110, 100, 130))
    for k in range(16):  # pena
        x, y = x0 + 9 + k, y0 + 10 - k
        put(img, x, y, INK)
        if k > 4:
            for d in range(1, min(4, (k - 3) // 2 + 1)):
                put(img, x - d, y - d, (236, 228, 214))
                put(img, x + d, y + d, (210, 200, 186))


def stairs(img, x, y, up=True):
    """Escadinha de tinta (4 degraus)."""
    for k in range(4):
        sx = x + k * 2
        sy = y - k * 2 if up else y + k * 2 - 6
        hline(img, sx, sx + 2, sy, INK)
        vline(img, sx + 2, sy, sy + 2 if up else sy + 2, INK)
    hline(img, x, x + 9, y + 2 if up else y + 2, INK_L)


def path(img, a, b, secret):
    """Passagem entre duas portas: corredor de tinta (ou tracejado, se secreta/trancada)."""
    def out(p, d=3):
        dx, dy = {"O": (-d, 0), "L": (d, 0), "N": (0, -d), "S": (0, d)}.get(p["side"], (0, -d))
        return (p["x"] + dx, p["y"] + dy)
    pa, pb = out(a), out(b)
    pts = [(a["x"], a["y"]), pa]
    if a["side"] in "OL" and b["side"] in "OL":
        mx = (pa[0] + pb[0]) // 2
        pts += [(mx, pa[1]), (mx, pb[1])]
    elif a["side"] in "NS" and b["side"] in "NS":
        my = (pa[1] + pb[1]) // 2
        pts += [(pa[0], my), (pb[0], my)]
    else:
        pts += [(pb[0], pa[1])]
    pts += [pb, (b["x"], b["y"])]
    cells = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        n = max(abs(x2 - x1), abs(y2 - y1), 1)
        for s in range(n + 1):
            cells.append((round(x1 + (x2 - x1) * s / n), round(y1 + (y2 - y1) * s / n)))
    if secret:
        for i, (x, y) in enumerate(cells):
            if (i // 2) % 2 == 0:
                put(img, x, y, INK_L)
        return
    for (x, y) in cells:
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-2, -1, 0, 1, 2):
                if max(abs(dx), abs(dy)) == 2:
                    put(img, x + dx, y + dy, INK)
    for (x, y) in cells:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                put(img, x + dx, y + dy, mix(PAPER, (250, 238, 210), 0.5))


def fog_room(img, x0, y0, w, h):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c = PAPER_D if (x + y) % 4 else PAPER_DD
            put(img, x, y, c)
    frame(img, x0 - 1, y0 - 1, x0 + w, y0 + h, INK_L, dashed=True)


def render_mapa():
    minis = tile_minis()
    base = parchment()
    border(base)
    ribbon(base, W // 2, 10, 120)
    compass(base, 46, 196, 16)
    moon_and_stars(base, 272, 64)
    castle_sketch(base, 92, 196)
    inkwell(base, 432, 206)
    # divisória entre os andares: pontilhado com uma estrelinha no meio
    for y in range(36, 236, 3):
        put(base, 245, y, INK_L)
    for (dx, dy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
        put(base, 245 + dx, 136 + dy, GOLD if (dx, dy) == (0, 0) else GOLD_L)

    rooms, layout = {}, {}
    for key, (ox, oy, name, label) in SALAS.items():
        img, m = room_image(key, minis)
        rooms[key] = (img, m, ox, oy)
        layout[key] = {"x": ox, "y": oy, "w": img.width, "h": img.height, "nome": name, "rotulo": label,
                       "dx": DX.get(key, 0)}

    # passagens primeiro (as salas ficam por cima)
    doors = {k: door_points(k, m, ox, oy) for k, (_, m, ox, oy) in rooms.items()}
    done = set()
    for k, ds in doors.items():
        for d in ds:
            t = d["target"]
            if t not in doors or (t, k) in done:
                continue
            back = next((e for e in doors[t] if e["target"] == k), None)
            if back is None:
                continue
            done.add((k, t))
            if {k, t} == {"map.hall", "map.biblioteca"}:
                continue  # escada: outro andar
            path(base, d, back, d["secret"] or back["secret"])

    visited = base.copy()
    fog = base.copy()
    for key, (img, m, ox, oy) in rooms.items():
        w, h = img.width, img.height
        for im in (visited, fog):
            rect(im, ox + 1, oy + 1, ox + w, oy + h, PAPER_DD)  # sombrinha
        visited.alpha_composite(img, (ox, oy))
        frame(visited, ox - 1, oy - 1, ox + w, oy + h, INK)
        fog_room(fog, ox, oy, w, h)

    # quadros da Galeria: moldurinhas douradas acima dela, com a sala dentro
    gx, gy = SALAS["map.galeria"][:2]
    for i, key in enumerate(QUADROS):
        img, m = room_image(key, minis)
        thumb = img.resize((QUADRO_W - 4, QUADRO_H - 4), Image.BOX)
        fx, fy = gx + 2 + i * 16, gy - 4 - QUADRO_H
        layout[key] = {"x": fx, "y": fy, "w": QUADRO_W, "h": QUADRO_H, "nome": "", "rotulo": "b"}
        for im, show in ((visited, True), (fog, False)):
            rect(im, fx, fy, fx + QUADRO_W - 1, fy + QUADRO_H - 1, GOLD)
            frame(im, fx, fy, fx + QUADRO_W - 1, fy + QUADRO_H - 1, INK)
            hline(im, fx + 1, fx + QUADRO_W - 2, fy + 1, GOLD_L)
            if show:
                im.alpha_composite(thumb, (fx + 2, fy + 2))
            else:
                rect(im, fx + 2, fy + 2, fx + QUADRO_W - 3, fy + QUADRO_H - 3, PAPER_DD)
            # fio tracejado até o portal na Galeria
            portal = [d for d in doors["map.galeria"] if d["target"] == key]
            if portal:
                p = portal[0]
                for y in range(fy + QUADRO_H, p["y"]):
                    if y % 2 == 0:
                        put(im, fx + QUADRO_W // 2, y, INK_L)

    # aulas: miniatura da sala com moldura, um fio de tinta até a porta na Ala
    for key, name in AULAS.items():
        porta = next(d for d in doors["map.ala-professores"] if d["target"] == key)
        img, m = room_image(key, minis)
        thumb = img.resize((AULA_W, AULA_H), Image.BOX)
        bx, by = porta["x"] - AULA_W // 2, porta["y"] - 5 - AULA_H
        layout[key] = {"x": bx, "y": by, "w": AULA_W, "h": AULA_H, "nome": name, "rotulo": "n"}
        for im, show in ((visited, True), (fog, False)):
            vline(im, porta["x"], by + AULA_H + 1, porta["y"] - 1, INK)
            rect(im, bx + 1, by + 1, bx + AULA_W, by + AULA_H, PAPER_DD)
            if show:
                im.alpha_composite(thumb, (bx, by))
                frame(im, bx - 1, by - 1, bx + AULA_W, by + AULA_H, INK)
            else:
                fog_room(im, bx, by, AULA_W, AULA_H)

    # escadas: Hall (sobe) e Biblioteca (desce)
    hall = next(d for d in doors["map.hall"] if d["target"] == "map.biblioteca")
    bib = next(d for d in doors["map.biblioteca"] if d["target"] == "map.hall")
    for im in (visited, fog):
        vline(im, hall["x"], hall["y"] - 6, hall["y"], INK_L)
        stairs(im, hall["x"] - 4, hall["y"] - 8, up=True)
        vline(im, bib["x"], bib["y"], bib["y"] + 4, INK_L)
        stairs(im, bib["x"] - 4, bib["y"] + 12, up=False)
    layout["_escadas"] = {"hall": [hall["x"], hall["y"] - 18], "biblioteca": [bib["x"], bib["y"] + 16]}

    sheet = Image.new("RGBA", (W * 2, H), (0, 0, 0, 0))
    sheet.alpha_composite(visited, (0, 0))
    sheet.alpha_composite(fog, (W, 0))
    os.makedirs(os.path.join(ROOT, "ui"), exist_ok=True)
    sheet.save(os.path.join(ROOT, "ui", "mapa.png"))

    marcas = render_marcas()
    marcas.save(os.path.join(ROOT, "ui", "mapa-marcas.png"))

    src = os.path.join(os.path.dirname(__file__), "..", "src", "ui", "mapa-layout.json")
    with open(src, "w") as fh:
        json.dump({"w": W, "h": H, "salas": layout}, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    return [("ui.mapa", "ui/mapa.png", W, H), ("ui.mapa-marcas", "ui/mapa-marcas.png", 11, 11)]


def render_marcas():
    """0 estrela, 1 baú, 2 segredo, 3 alfinete "você" (11x11 cada)."""
    S = 11
    img = Image.new("RGBA", (S * 4, S), (0, 0, 0, 0))

    def p(i, x, y, c):
        img.putpixel((i * S + x, y), c + (255,))

    # estrela dourada com contorno
    star = ["....k....", "...kyk...", "...kyk...", "kkkkYkkkk", "kYyyYyyYk", ".kyyYyyk.",
            "..kyyyk..", ".kyykyyk.", ".kyk.kyk.", "kk.....kk"]
    cols = {"k": INK, "y": GOLD, "Y": GOLD_L}
    for y, row in enumerate(star):
        for x, ch in enumerate(row):
            if ch in cols:
                p(0, x + 1, y, cols[ch])
    # baú
    bau = ["..kkkkkkk..", ".kbbbbbbbk.", "kbBBBBBBBbk", "kkkkkykkkkk", "kbbbbYbbbbk", "kbBBBBBBBbk",
           "kbbbbbbbbbk", "kkkkkkkkkkk"]
    cb = {"k": INK, "b": (120, 74, 40), "B": (158, 104, 58), "y": GOLD, "Y": GOLD_L}
    for y, row in enumerate(bau):
        for x, ch in enumerate(row):
            if ch in cb:
                p(1, x, y + 2, cb[ch])
    # segredo: brilho roxo
    for (x, y, c) in ((5, 1, (150, 90, 200)), (5, 2, (190, 140, 240)), (5, 3, (230, 210, 255)), (5, 4, (255, 255, 255)),
                      (5, 5, (230, 210, 255)), (5, 6, (190, 140, 240)), (5, 7, (150, 90, 200)),
                      (2, 4, (150, 90, 200)), (3, 4, (190, 140, 240)), (4, 4, (230, 210, 255)),
                      (6, 4, (230, 210, 255)), (7, 4, (190, 140, 240)), (8, 4, (150, 90, 200)),
                      (3, 2, (190, 140, 240)), (7, 6, (190, 140, 240)), (7, 2, (190, 140, 240)), (3, 6, (190, 140, 240))):
        p(2, x, y, c)
    # alfinete de cera vermelha
    pin = ["...kkkk....", "..kRRrRk...", ".kRRRRRrk..", ".kRWRRRrk..", ".kRRRRRRk..", "..kRRRRk...",
           "...kkkk....", "....kk.....", "....kk.....", "....k......", "....k......"]
    cp = {"k": RED_D, "R": RED, "r": (200, 90, 80), "W": (255, 220, 210)}
    for y, row in enumerate(pin):
        for x, ch in enumerate(row):
            if ch in cp:
                p(3, x, y, cp[ch])
    return img


if __name__ == "__main__":
    print(render_mapa())

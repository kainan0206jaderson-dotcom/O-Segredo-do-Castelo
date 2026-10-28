"""Personagens da arte definitiva (16x24 e 16x16), desenhados à mão em grades de letras.

Cada personagem tem sua paleta. "k" é o contorno: no fim ele é recolorido com o tom
mais escuro da cor vizinha (contorno colorido), menos embaixo dos pés, que fica escuro.
"""
import os

from PIL import Image

from art_lib import ROOT, mix, ramp

INK = (26, 20, 38)


def check(name, rows, w, h):
    assert len(rows) == h, f"{name}: {len(rows)} linhas (esperado {h})"
    for i, r in enumerate(rows):
        assert len(r) == w, f"{name}: linha {i} tem {len(r)} colunas: {r!r}"


def paint(rows, pal, w, h, outline_soft=True):
    """Pinta uma grade de letras e faz o contorno colorido."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            if ch == "k":
                px[x, y] = INK + (255,)
                continue
            c = pal[ch]
            px[x, y] = tuple(c[:3]) + ((c[3],) if len(c) == 4 else (255,))
    if not outline_soft:
        return im
    # contorno colorido: cada "k" pega o tom escuro da cor de dentro mais próxima
    out = im.copy()
    po = out.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != "k":
                continue
            below_empty = y + 1 >= h or rows[y + 1][x] == "."
            if below_empty and y > h - 4:
                continue  # sola dos pés continua escura
            near = []
            for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and rows[ny][nx] not in ".k":
                    near.append(pal[rows[ny][nx]])
            if not near:
                continue
            base = min(near, key=lambda c: sum(c[:3]))
            po[x, y] = mix(base, INK, 0.62) + (px[x, y][3],)
    return out


def strip(frames, w, h):
    im = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f, (i * w, 0))
    return im


def save(im, rel):
    im.save(os.path.join(ROOT, rel))


def shift_down(rows, n, w=16):
    """Desce tudo n pixels (respiração), mantendo a altura."""
    if n <= 0:
        return rows
    return ["." * w] * n + rows[: len(rows) - n]


def with_mouth(rows, y, x0, patch):
    rows = list(rows)
    r = list(rows[y])
    for i, ch in enumerate(patch):
        if ch != " ":
            r[x0 + i] = ch
    rows[y] = "".join(r)
    return rows


# ======================================================================= Aprendiz (jogador)
# 3 linhas (baixo, cima, lado) x 6 colunas (parado 0-1, andando 2-5)

def skin_pal(base=(244, 196, 156)):
    r = ramp(base)
    return {"s": r[2], "S": r[1], "b": mix(r[2], (226, 110, 110), 0.45), "m": mix(r[1], (150, 60, 70), 0.45)}


def robe_pal(base):
    r = ramp(base)
    return {"q": r[1], "p": r[2], "P": r[3], "Q": r[0]}


HAIR = ramp((92, 58, 40))
BASE_PAL = {
    **skin_pal(),
    "h": HAIR[2], "H": HAIR[3], "j": HAIR[1],
    "e": (40, 30, 52), "w": (255, 255, 255),
    "y": (250, 214, 92), "Y": (255, 236, 150),
    "n": (78, 56, 46), "N": (110, 82, 64),
    "l": (110, 74, 44), "L": (170, 124, 70),
    "c": (236, 230, 240),
}

HEAD_DOWN = [
    "........kk......",
    ".......kpPk.....",
    "......kqpPk.....",
    "......kqppPk....",
    ".....kqpyPPk....",
    ".....kqppppPk...",
    "...kkqqpppppPkk.",
    "..kQqqqqqqqqqqQk",
    "...kkhhhhhhhhkk.",
    "...khHHhhhhhHjk.",
    "...khsssssssshk.",
    "...khewsssewsjk.",
    "...kjeessseesjk.",
    "....kbssmmssbk..",
    ".....kssssssk...",
]
BODY_DOWN = [
    "....kcpYYpck....",
    "...kqpPpYpPpqk..",
    "..kspPppyppPpsk.",
    "..kSkPpppppPkSk.",
    "...kqlLLLLlqk...",
    "...kqpPpppPqqk..",
]
LEGS_DOWN = {
    "stand": ["....knk..knk....", "....kNk..kNk....", "....kkk..kkk...."],
    "l":     ["...knk...knk....", "...kNk...kkk....", "...kkk.........."],
    "mid":   ["....knk..knk....", "....kNk..kNk....", "....kkk..kkk...."],
    "r":     ["....knk...knk...", "....kkk...kNk...", "..........kkk..."],
}

HEAD_UP = [
    "........kk......",
    ".......kPpk.....",
    "......kPpqk.....",
    ".....kPppqk.....",
    ".....kPpppqk....",
    "....kPppppqk....",
    "..kkPpppppqqkk..",
    ".kQqqqqqqqqqqqQk",
    "..kkhhhhhhhhkk..",
    "..khhHhhhhHhhjk.",
    "..khhhhhhhhhhjk.",
    "..khhHhhhhhhhjk.",
    "..kjhhhhhhhhjjk.",
    "...kjhhhhhhjjk..",
    "....kjjjjjjjk...",
]
BODY_UP = [
    "....kqpppppqk...",
    "...kqpPpppPpqk..",
    "..kspPpppppPpsk.",
    "..kSkPpppppPkSk.",
    "...kqllllllqk...",
    "...kqpPppPpqqk..",
]

HEAD_SIDE = [
    "......kk........",
    ".....kPpk.......",
    ".....kPpqk......",
    "......kPpqk.....",
    ".....kPpypqk....",
    "....kPppppqk....",
    "..kkqPppppqqkk..",
    ".kQqqqqqqqqqqqQk",
    "...kkhhhhhhhkk..",
    "...khHhhhhsssk..",
    "...khhhhhsssssk.",
    "...khhHhhsewssk.",
    "...kjhhjhseessk.",
    "....kjjjhsssbk..",
    ".....kjjksssk...",
]
BODY_SIDE = [
    ".....kcpYpk.....",
    "....kqpPppqk....",
    "....kqPppsqk....",
    "....kqPppSqk....",
    "....kqlLLllk....",
    "....kqpPppqk....",
]
LEGS_SIDE = {
    "stand": [".....knknk......", ".....kNkNk......", ".....kkkkk......"],
    "l":     ["....knk..knk....", "....kNk..kNk....", "....kkk..kkk...."],
    "mid":   [".....knknk......", ".....kNkNk......", ".....kkkkk......"],
    "r":     ["...knk....knk...", "...kNk....kNk...", "...kkk....kkk..."],
}


def player_frame(head, body, legs, bob):
    rows = shift_down(head + body, bob)[:21] + legs
    check("aprendiz", rows, 16, 24)
    return rows


def render_player(name, robe):
    pal = {**BASE_PAL, **robe_pal(robe)}
    seq = [("stand", 0), ("stand", 1), ("l", 0), ("mid", 1), ("r", 0), ("mid", 1)]
    sheet = Image.new("RGBA", (96, 72), (0, 0, 0, 0))
    for r, (head, body, legs) in enumerate(((HEAD_DOWN, BODY_DOWN, LEGS_DOWN), (HEAD_UP, BODY_UP, LEGS_DOWN), (HEAD_SIDE, BODY_SIDE, LEGS_SIDE))):
        for c, (leg, bob) in enumerate(seq):
            sheet.paste(paint(player_frame(head, body, legs[leg], bob), pal, 16, 24), (c * 16, r * 24))
    if name == "estrelada":
        # capa estrelada: pontinhos dourados no manto
        px = sheet.load()
        robe_cols = {tuple(v[:3]) for k, v in robe_pal(robe).items() if k in "pq"}
        for y in range(72):
            for x in range(96):
                if px[x, y][3] and px[x, y][:3] in robe_cols and (x * 7 + y * 5) % 13 == 0:
                    px[x, y] = (255, 236, 150, 255)
    save(sheet, f"sprites/{'aprendiz' if name == 'base' else 'aprendiz-' + name}.png")


CAPAS = {
    "base": (100, 64, 156),
    "coragem": (172, 42, 44),
    "inteligencia": (46, 92, 172),
    "astucia": (40, 138, 80),
    "lealdade": (200, 154, 44),
    "estrelada": (44, 48, 116),
}




# ======================================================================= NPCs (16x24)
# quadros: parado 0, parado 1 (respira), falando (boca aberta), parado 0

def npc_frames(rows, pal, mouth_at, mouth_open, w=16, h=24, bob_from=0):
    """rows: quadro parado; mouth_at=(y, x); mouth_open: letras da boca aberta."""
    check("npc", rows, w, h)
    y, x = mouth_at
    talk = with_mouth(rows, y, x, mouth_open)
    breathe = rows[:bob_from] + shift_down(rows[bob_from:], 1, w)[: h - bob_from] if bob_from else shift_down(rows, 1, w)
    return [paint(r, pal, w, h) for r in (rows, breathe, talk, rows)]


# Ministro da Magia Bartholomeu Bonfatt [KAINAN: nome e cargo; visual de mago com chapéu e sobretudo]
# [FICÇÃO: bigode grisalho, faixa dourada no chapéu, medalha do Ministério]
BONFATT = [
    "..........kk....",
    ".........kAk....",
    "........kaAk....",
    ".......kzaAk....",
    "......kzaaAk....",
    ".....kzaaaaAk...",
    "....kGGGgGGGGk..",
    "..kkzzzzzzzzzzkk",
    "...kxxsssssxxk..",
    "...kxseSsSesxk..",
    "...kxsssssssxk..",
    "...kxXXXmXXXxk..",
    "....kxXsssXxk...",
    "...kRrRxxxRrRk..",
    "..kRrrRwGwRrrRk.",
    "..kRrrRwgwRrrRk.",
    "..ksRrRwwwRrRsk.",
    "..kSkRrRGRrRkSk.",
    "...kRrrRwRrrRk..",
    "...kRrrRGRrrRk..",
    "...kQRrrRrrRQk..",
    "....kQQQQQQQk...",
    "....kNk...kNk...",
    "....kkk...kkk...",
]
BONFATT_PAL = {
    **skin_pal((236, 190, 150)),
    "a": (48, 52, 110), "A": (82, 90, 160), "z": (34, 36, 84),
    "G": (230, 186, 70), "g": (255, 236, 150),
    "x": (176, 176, 190), "X": (226, 226, 234),
    "e": (40, 30, 52), "w": (240, 236, 246),
    "R": (140, 46, 62), "r": (110, 30, 48), "Q": (78, 20, 36),
    "N": (60, 44, 40),
}

# Profa. Amélia [KAINAN, pela foto]: cabelo grisalho volumoso, capa creme com barra prateada,
# vestido de cetim branco, luvas brancas, leque de cartas. Fantasma translúcida que flutua.
AMELIA = [
    ".....gZUUZg.....",
    "....gZUUZUUg....",
    "...gUZUZZUZUg...",
    "..gUZsssssZUg...",
    "..gZsesssesZUg..",
    "..gUZssbsssZUg..",
    "..gZUZsmmsZUZg..",
    "..gUZgssssgZUg..",
    "..gCCHCJJCHCCg..",
    "..gCHCKKKKCHCg..",
    ".gCHOOOKKKKHCJg.",
    ".gCOOOOKKKKHCJg.",
    ".gCHBOOKKKKHCJg.",
    ".gJCHKKKKKKHCCg.",
    ".gJCHKKNKKKHCCg.",
    "..gJCKKNKKKCCJg.",
    "..gCKKKKKKKKCg..",
    "..gHNKKKKKKNHg..",
    "...gNKKNKKKNg...",
    "....QNKNKNKQ....",
    ".....QTQTQT.....",
    "......T.T.T.....",
    "................",
    "................",
]
AMELIA_PAL = {
    "g": (130, 176, 226, 200),
    "Z": (176, 178, 194, 235), "U": (226, 226, 238, 235),
    "s": (240, 228, 224, 225), "b": (240, 196, 204, 225), "m": (190, 140, 156, 230),
    "e": (70, 76, 120, 255),
    "C": (240, 232, 208, 215), "H": (204, 196, 170, 210), "J": (196, 206, 228, 230),
    "K": (250, 250, 255, 200), "N": (210, 220, 240, 180), "O": (255, 255, 255, 250),
    "B": (232, 230, 240, 240), "Q": (200, 228, 248, 120), "T": (200, 228, 248, 60),
}

# Prof. Aristóteles [KAINAN, pelo vídeo]: jovem, cabelo cacheado escuro, barba curta, gorro azul
# redondo, túnica cinza com gola bordada branca, livros azuis no braço.
ARISTOTELES = [
    "................",
    "....kkkkkkk.....",
    "...kHHCHCCCk....",
    "..kHCCCCCCCck...",
    "..kCCCCCCCCck...",
    ".kJjkkkkkkkjJk..",
    ".kJjsssssssjJk..",
    ".kJsewssewsSJk..",
    ".kJseessseesJk..",
    "..kJsssmsssJk...",
    "..kJJjJJJjJJk...",
    "...kJJjJjJJk....",
    "...kZZQZQZZk....",
    "..kTQZTTTZQTk...",
    "..kTQQTZTQQUk...",
    "..kTQQTZTBBBk...",
    "..kTsQTZTB99Bk..",
    "..kUSQTZTBBBBk..",
    "..kUQQTZTQkkk...",
    "...kQQTTTQQk....",
    "...kUQQQQQUk....",
    "...kUUQQQUUk....",
    "....kNk.kNk.....",
    "....kkk.kkk.....",
]
ARISTOTELES_PAL = {
    **skin_pal((156, 106, 76)),
    "C": (40, 70, 150), "H": (76, 112, 196), "c": (28, 48, 108),
    "J": (40, 28, 22), "j": (66, 46, 34),
    "e": (24, 18, 28), "w": (250, 250, 250),
    "Q": (140, 146, 158), "T": (178, 184, 196), "U": (98, 104, 118), "Z": (246, 246, 250),
    "B": (44, 84, 164), "9": (74, 120, 206), "N": (54, 44, 40),
}

# Morgana Cinzel [FICÇÃO]: capuz cinza-fuligem, mecha prateada, olhos violeta
MORGANA = [
    "................",
    "................",
    "................",
    "......kkkk......",
    ".....kiiiik.....",
    "....kiIiiiik....",
    "...kiIilnnik....",
    "...kiIlnnnnik...",
    "...kiIlMnnMik...",
    "...kiInnnnnik...",
    "...kiiknnnnkik..",
    "...kiiiknnkiik..",
    "..kiIiiiiiiiIik.",
    "..kiIitttttiIik.",
    "..knIittMttiInk.",
    "..kkIitttttiIkk.",
    "...kIitttttiik..",
    "...kIiitttiiik..",
    "...kIiiiiiiiik..",
    "..kiIiiiiiiiIik.",
    "..kiIiiiIiiiIik.",
    "..kiiIiiiiiIiik.",
    "..kttttttttttttk",
    "...kkkkkkkkkkkk.",
]
MORGANA_PAL = {
    "i": (56, 52, 66), "I": (90, 86, 104), "t": (30, 28, 40),
    "l": (206, 206, 222), "n": (232, 220, 228), "M": (176, 112, 226),
}

# Booh [FICÇÃO: aparência]: fantasminha de lençol, bochechudo, com laço vermelho
BOOH = [
    "................",
    "................",
    "..........rRr...",
    "......ggggRr....",
    "....ggWWWWgg....",
    "...gWWWWWWWWg...",
    "..gWWWWWWWWWVg..",
    "..gWWeWWWWeWVg..",
    "..gWWeWWWWeWVg..",
    "..gWbWWWWWWbVg..",
    "..gWWWWmmWWWVg..",
    "..gWWWWWWWWWVg..",
    "..gWWWWWWWWWVg..",
    "..gWWWWWWWWWVg..",
    "..gWWWWWWWWWVg..",
    "..gWWWWWWWWVVg..",
    "..gVWWWWWWWWVg..",
    "..gVVWVWWVWVVg..",
    "..gg.gVggVg.gg..",
    "......g..g......",
    "................",
    "................",
    "................",
    "................",
]
BOOH_PAL = {
    "g": (130, 176, 226, 200), "W": (238, 244, 255, 205), "V": (196, 210, 238, 200),
    "e": (34, 40, 76, 255), "b": (250, 170, 196, 210), "m": (60, 44, 80, 255),
    "r": (196, 44, 60, 255), "R": (236, 84, 92, 255),
}

# Mister Addam [FICÇÃO: aparência]: cavalheiro fantasma de cartola, bigode e casaca
ADDAM = [
    "................",
    ".....gggggg.....",
    ".....gaaaaag....",
    ".....gaaaaag....",
    ".....gPPPPPg....",
    "...ggaaaaaaagg..",
    "....gWWWWWWg....",
    "....gWeWWeWg....",
    "....gWWWWWWg....",
    "...gmmWWWWmmg...",
    "....gWmWWmWg....",
    ".....gWWWWg.....",
    "...gccWWWWccg...",
    "..gccciPPicccg..",
    "..gccciWWicccg..",
    "..gcccciWiccccg.",
    "..gcccciWicccg..",
    "..gccccciccccg..",
    "...gccccccccg...",
    "...gcTccccTcg...",
    "....gTTccTTg....",
    ".....gTTTTg.....",
    "......gTTg......",
    ".......gg.......",
]
ADDAM_PAL = {
    "g": (130, 176, 226, 200), "a": (70, 80, 124, 215), "P": (176, 124, 206, 230),
    "W": (228, 236, 250, 205), "e": (30, 36, 70, 255), "m": (106, 106, 136, 235),
    "c": (150, 170, 212, 190), "i": (236, 240, 250, 215), "T": (170, 190, 230, 120),
}

# Dona Lágrima [FICÇÃO, original no lugar da sugestão de IP]: menina fantasma de maria-chiquinha
# e óculos redondos, que chora por qualquer coisa
LAGRIMA = [
    "................",
    "................",
    ".....gggggg.....",
    "..gggHHHHHHggg..",
    ".gHHgHHHHHHgHHg.",
    ".gHHgHWWWWHgHHg.",
    ".gHHgWWWWWWgHHg.",
    "..gggoWooWogg...",
    "....goeoWoeog...",
    "....gWooWWoog...",
    "....gtWWWWtWg...",
    "....gWWmmWWWg...",
    ".....gWWWWWg....",
    "....gDDDDDDDg...",
    "...gDDdDDDdDDg..",
    "...gDDDDDDDDDg..",
    "..gDDdDDDDdDDDg.",
    "..gDDDDDDDDDDDg.",
    "..gTDDTDDTDDTDg.",
    "...gTT.gTT.gTg..",
    "....T...T...T...",
    "................",
    "................",
    "................",
]
LAGRIMA_PAL = {
    "g": (130, 176, 226, 200), "H": (172, 192, 232, 205), "W": (234, 242, 254, 210),
    "o": (112, 128, 176, 255), "e": (34, 40, 76, 255), "t": (110, 186, 255, 255),
    "m": (70, 50, 90, 255), "D": (200, 214, 242, 185), "d": (226, 234, 252, 200), "T": (200, 228, 248, 90),
}

# Dona Brasa [FICÇÃO]: fada cozinheira de touca, avental e asinhas
BRASA = [
    "................",
    ".....kkkkkk.....",
    "....kWWWWWWk....",
    "...kWWwWWWWWk...",
    "...kWWWWWWWWk...",
    "...khhhhhhhhk...",
    "..khsssssssshk..",
    "..khsewssewshk..",
    "..khseessees hk.".replace(" ", "s"),
    "...kbssmmssbk...",
    "....kssssssk....",
    "aa.kRRRWWRRRk.aa",
    "AaakRRWWWWRRkaaA",
    ".AaksRWWWWRskaA.",
    "..kSkRWWWWRkSk..",
    "...kRRWWWWRRk...",
    "...kRRWWWWRRk...",
    "..kRRRWwwWRRRk..",
    "..kRRRRRRRRRRk..",
    "..kQQQQQQQQQQk..",
    "...kkkkkkkkkk...",
    ".....kNk.kNk....",
    ".....kkk.kkk....",
    "................",
]
BRASA_PAL = {
    **skin_pal((246, 204, 168)),
    "W": (246, 244, 250), "w": (210, 206, 222),
    "h": (214, 96, 50), "e": (40, 30, 52),
    "R": (198, 66, 54), "Q": (140, 40, 38),
    "a": (190, 230, 250, 170), "A": (230, 248, 255, 200), "N": (80, 50, 40),
}


def recolor(pal, **cols):
    out = dict(pal)
    out.update(cols)
    return out


# Fada Ramalhete [FICÇÃO]: mesma silhueta da Dona Brasa, de touca e vestido verdes, cabelo loiro
RAMALHETE_PAL = recolor(BRASA_PAL, W=(220, 244, 210), w=(170, 210, 160), h=(232, 196, 96),
                        R=(70, 150, 84), Q=(40, 100, 56))


def render_npcs():
    sets = [
        ("arquimedes", BONFATT, BONFATT_PAL, (11, 7), "XkkX", False),
        ("aristoteles", ARISTOTELES, ARISTOTELES_PAL, (9, 6), "kk", False),
        ("morgana", MORGANA, MORGANA_PAL, (11, 8), "kk", False),
        ("booh", BOOH, BOOH_PAL, (10, 7), "00", True),
        ("addam", ADDAM, ADDAM_PAL, (10, 7), "00", True),
        ("lagrima", LAGRIMA, LAGRIMA_PAL, (11, 6), "00", True),
        ("dona-brasa", BRASA, BRASA_PAL, (9, 7), "mm", False),
        ("fada-ramalhete", BRASA, RAMALHETE_PAL, (9, 7), "mm", False),
    ]
    for key, rows, pal, (my, mx), mouth, ghost in sets:
        if ghost:
            pal = {**pal, "0": (40, 28, 56, 255)}
            open_rows = with_mouth(rows, my, mx, mouth)
            open_rows = with_mouth(open_rows, my + 1, mx, mouth)
            frames = [paint(r, pal, 16, 24, False) for r in (rows, shift_down(rows, 1), open_rows, rows)]
        else:
            frames = npc_frames(rows, pal, (my, mx), mouth)
        save(strip(frames, 16, 24), f"sprites/{key}.png")
    # Amélia: 5 quadros (flutua em 3 alturas; falando)
    talk = with_mouth(AMELIA, 6, 7, "mm")
    talk = with_mouth(talk, 6, 7, "kk")
    fr = [paint(r, AMELIA_PAL, 16, 24, False) for r in (AMELIA, shift_down(AMELIA, 1), shift_down(AMELIA, 2), shift_down(talk, 1), shift_down(AMELIA, 1))]
    save(strip(fr, 16, 24), "sprites/amelia.png")


# ======================================================================= pequenos (16x16)

# Trinco, o duende da recepção [FICÇÃO]: orelhas pontudas, colete vermelho e molho de chaves
TRINCO = [
    "................",
    "......kkkk......",
    ".k...keeEek...k.",
    ".kek.keeeek.kek.",
    "..keekeeeeEkek..",
    "...keewEewEek...",
    "....keKeeKek....",
    "....keeoMeek....",
    "....keemmeek....",
    "...kkrrRRrrkk...",
    "..keekrRYrkeek..",
    "..kEkrrrrrrkyk..",
    "...krrrrrrrkyk..",
    "....kbk..kbk....",
    "....kkk..kkk....",
    "................",
]
TRINCO_PAL = {
    "e": (116, 176, 76), "E": (156, 208, 104), "K": (40, 32, 50), "w": (250, 250, 250),
    "o": (90, 140, 60), "M": (90, 140, 60), "m": (70, 110, 50),
    "r": (164, 40, 52), "R": (206, 70, 72), "Y": (250, 214, 92), "y": (214, 196, 120), "b": (70, 52, 40),
}

# Elfo Fuxico [FICÇÃO]: orelhas compridas, roupa de pano de prato e vassoura
FUXICO = [
    "............Y...",
    "kk....kkkk..b...",
    "k1k..k1111k.b...",
    ".k1kk1w11w1kb...",
    "..k11kK11Kk1bk..",
    "...k112mm211b...",
    "....kk1111k.b...",
    "...kWWWWWWkkb...",
    "...kWwWWwWkbk...",
    "....kWWWWk.yyk..",
    "....kWwwWk.yyyk.",
    "....kbk.kbkyyyk.",
    "....kkk.kkk.kk..",
    "................",
    "................",
    "................",
]
FUXICO_PAL = {
    "1": (156, 204, 128), "2": (120, 168, 98), "w": (250, 250, 250), "K": (40, 32, 50),
    "m": (90, 120, 70), "W": (236, 232, 222), "b": (110, 74, 44), "y": (220, 186, 90), "Y": (250, 214, 92),
}


def gnome(hat, hat_l, beard, braids=False):
    """Gnomos [KAINAN: nomes; FICÇÃO: aparência]: chapéu pontudo, nariz redondo e bochechas."""
    rows = [
        ".......kk.......",
        "......kHhk......",
        "......kHhhk.....",
        ".....kHhhhk.....",
        "....kHhhhhhk....",
        "..kkhhhhhhhhkk..",
        "..kssssssssssk..",
        "..kssewssewssk..",
        "..ksbeesseebsk..",
        "...ksssnnsssk...",
        "...kBBBmmBBBk...",
        "...kgBBBBBBgk...",
        "..kgggBBBBgggk..",
        "...kggggggggk...",
        "....kbk..kbk....",
        "....kkk..kkk....",
    ]
    if not beard:
        rows[10] = "...ksssmmsssk..."
        rows[11] = "...kgssssssgk..."
    if braids:
        for i in (7, 8, 9, 10):
            rows[i] = rows[i][:1] + "T" + rows[i][2:14] + "T" + rows[i][15:]
    pal = {
        **skin_pal((244, 196, 160)), "H": hat_l, "h": hat, "e": (34, 28, 46), "w": (255, 255, 255),
        "n": (226, 130, 120), "B": (244, 244, 250), "m": (150, 70, 80),
        "g": (100, 128, 76), "b": (90, 60, 40), "T": (226, 162, 78),
    }
    return rows, pal


def render_small():
    for key, rows, pal, mouth_at, mouth in (
        ("trinco", TRINCO, TRINCO_PAL, (8, 6), "kkkk"),
        ("fuxico", FUXICO, FUXICO_PAL, (5, 6), "kk"),
    ):
        save(strip(npc_frames(rows, pal, mouth_at, mouth, 16, 16), 16, 16), f"sprites/{key}.png")
    for key, hat, hat_l, beard, braids in (
        ("mary", (214, 70, 110), (244, 120, 150), False, True),
        ("mish-mish", (70, 160, 90), (116, 204, 130), True, False),
        ("wish-wish", (80, 110, 210), (130, 160, 240), True, False),
    ):
        rows, pal = gnome(hat, hat_l, beard, braids)
        save(strip(npc_frames(rows, pal, (10, 7), "kk", 16, 16), 16, 16), f"sprites/{key}.png")


def render_all():
    for name, robe in CAPAS.items():
        render_player(name, robe)
    render_npcs()
    render_small()

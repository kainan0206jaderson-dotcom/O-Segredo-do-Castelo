"""Personagens da arte definitiva (16x24 e 16x16), desenhados à mão em grades de letras.

Cada personagem tem sua paleta. "k" é o contorno: no fim ele é recolorido com o tom
mais escuro da cor vizinha (contorno colorido), menos embaixo dos pés, que fica escuro.
"""
import json
import os

from PIL import Image

from art_lib import ROOT, mix, ramp

INK = (26, 20, 38)


def check(name, rows, w, h):
    assert len(rows) == h, f"{name}: {len(rows)} linhas (esperado {h})"
    for i, r in enumerate(rows):
        assert len(r) == w, f"{name}: linha {i} tem {len(r)} colunas: {r!r}"


def paint(rows, pal, w, h, outline_soft=True, ref_pal=None):
    """Pinta uma grade de letras e faz o contorno colorido. ref_pal decide qual vizinho dá
    o tom do contorno (padrão: a própria paleta); serve para as variações de cor do aprendiz
    escolherem sempre o mesmo vizinho que a folha padrão."""
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
                    near.append(rows[ny][nx])
            if not near:
                continue
            ref = ref_pal or pal
            base = pal[min(near, key=lambda ch: sum(ref[ch][:3]))]
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


def stretch(rows, reps):
    """Alonga uma grade repetindo linhas: reps = {índice: cópias extras}. É como o
    desenhista alonga um boneco (mais manga, mais túnica, mais perna) sem redesenhar o
    contorno. Devolve as linhas novas e a função que leva um índice antigo ao novo."""
    out, where = [], {}
    for i, r in enumerate(rows):
        where[i] = len(out)
        out.extend([r] * (1 + reps.get(i, 0)))
    return out, lambda i: where[i]


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


# Aprendiz menina, a Estela [FICÇÃO]: roupa bege off-white com detalhes azul-marinho [KAINAN], cabelo comprido caindo pelos ombros (de frente), pelas costas
# (de trás) e num rabo de cavalo (de lado), laço rosa no chapéu e a barra do manto mais rodada.
def with_row(rows, i, row):
    return rows[:i] + [row] + rows[i + 1:]


HEAD_DOWN_F = with_row(HEAD_DOWN, 6, "...kkqqppprRrkk.")  # laço rosa na fita do chapéu
HEAD_UP_F = with_row(HEAD_UP, 6, "..kkPpprRrqqkk..")
HEAD_SIDE_F = with_row(HEAD_SIDE, 6, "..kkqrRrppqqkk..")
BODY_DOWN_F = [
    "...khhpYYphhk...",
    "..kqhHpYYpHhqk..",
    "..kshjPpyPjhsk..",
    "..kSkjpppppjkSk.",
    "...kqlLLLLlqk...",
    "..kqpPpppppPqqk.",
]
BODY_UP_F = [
    "....khhhhhhhk...",
    "...kqhhHhhhjqk..",
    "..kspPjhhhjPpsk.",
    "..kSkPpjjjpPkSk.",
    "...kqllllllqk...",
    "..kqpPppppPpqqk.",
]
BODY_SIDE_F = [
    "..hhkcpYpk......",
    "..hHkqpPppqk....",
    "...hjqPppsqk....",
    "....jqPppSqk....",
    "....kqlLLllk....",
    "...kqpPpppqk....",
]
MENINA_PAL = {"r": (232, 96, 150), "R": (255, 168, 204)}
NAVY = [(26, 34, 74), (40, 54, 112), (66, 86, 156)]


# 2 tiles de altura (16x32): rosto com uma linha a mais, ombros, mangas e túnica mais
# compridos e pernas com uma linha a mais.
H = 32
HEAD_REPS = {10: 1}
BODY_REPS = {1: 1, 2: 1, 5: 4}


# Cabelo comprido da aprendiz [KAINAN: diferenciar os dois modelos do jogador]: emoldura o
# rosto até o queixo e desce até a cintura (de frente), pelas costas até abaixo do cinto
# (de trás) e num rabo de cavalo mais longo (de lado). Índices já na grade de 32 linhas.
LONG_HAIR = {
    "down": {14: {3: "k", 4: "h", 13: "h", 14: "k"}, 15: {3: "k", 4: "h", 13: "h", 14: "k"},
             22: {5: "h", 11: "h"}, 23: {5: "j", 11: "j"}},
    "up": {15: {3: "k", 4: "j", 12: "j", 13: "k"},
           22: {5: "h", 6: "h", 7: "H", 8: "h", 9: "h", 10: "j"}, 23: {6: "j", 7: "h", 8: "h", 9: "j"}, 24: {7: "j", 8: "j"}},
    "side": {21: {3: "h"}, 22: {3: "j"}, 23: {3: "j"}},
}


def edit_rows(rows, edits):
    rows = list(rows)
    for y, cols in edits.items():
        r = list(rows[y])
        for x, ch in cols.items():
            r[x] = ch
        rows[y] = "".join(r)
    return rows


def player_frame(head, body, legs, bob, edits=None):
    head, _ = stretch(head, HEAD_REPS)
    body, _ = stretch(body, BODY_REPS)
    legs, _ = stretch(legs, {0: 1})
    top = head + body
    if edits:
        top = edit_rows(top, edits)
    rows = shift_down(top, bob)[: H - len(legs)] + legs
    check("aprendiz", rows, 16, H)
    return rows


def player_sheet(name, robe, menina=False, skin=None, hair=None, roupa=None):
    """Folha do aprendiz. skin, hair e roupa trocam a cor da pele, do cabelo e da roupa
    principal (ver VISUAL e tools/art_visual.py)."""
    extra = {}
    if menina:
        if name == "base":
            # roupa da Estela: bege quase off-white, com aba do chapéu, laço e cinto azul-marinho
            robe = (226, 214, 188)
            extra = {"Q": NAVY[0], "r": NAVY[1], "R": NAVY[2], "l": NAVY[0], "L": NAVY[1]}
        else:
            robe = mix(robe, (255, 255, 255), 0.42)  # capas das casas em tons mais claros que as do menino
            extra = {"l": NAVY[0], "L": NAVY[1]}
    ref_pal = {**BASE_PAL, **robe_pal(robe), **(MENINA_PAL if menina else {}), **extra}
    if roupa and name == "base":
        robe = roupa[0]
        extra = {**extra, **roupa[1]}
    pal = {**BASE_PAL, **robe_pal(robe), **(MENINA_PAL if menina else {}), **extra}
    if skin:
        pal.update(skin_pal(skin))
    if hair:
        hr = ramp(hair)
        pal.update({"h": hr[2], "H": hr[3], "j": hr[1]})
    seq = [("stand", 0), ("stand", 1), ("l", 0), ("mid", 1), ("r", 0), ("mid", 1)]
    sheet = Image.new("RGBA", (96, 3 * H), (0, 0, 0, 0))
    if menina:
        dirs = ((HEAD_DOWN_F, BODY_DOWN_F, LEGS_DOWN), (HEAD_UP_F, BODY_UP_F, LEGS_DOWN), (HEAD_SIDE_F, BODY_SIDE_F, LEGS_SIDE))
    else:
        dirs = ((HEAD_DOWN, BODY_DOWN, LEGS_DOWN), (HEAD_UP, BODY_UP, LEGS_DOWN), (HEAD_SIDE, BODY_SIDE, LEGS_SIDE))
    for r, (head, body, legs) in enumerate(dirs):
        edits = LONG_HAIR[("down", "up", "side")[r]] if menina else None
        for c, (leg, bob) in enumerate(seq):
            sheet.paste(paint(player_frame(head, body, legs[leg], bob, edits), pal, 16, H, ref_pal=ref_pal), (c * 16, r * H))
    if name == "estrelada":
        # capa estrelada: pontinhos dourados no manto
        px = sheet.load()
        robe_cols = {tuple(v[:3]) for k, v in robe_pal(robe).items() if k in "pq"}
        for y in range(3 * H):
            for x in range(96):
                if px[x, y][3] and px[x, y][:3] in robe_cols and (x * 7 + y * 5) % 13 == 0:
                    px[x, y] = (255, 236, 150, 255)
    return sheet


def render_player(name, robe, menina=False):
    sheet = player_sheet(name, robe, menina)
    prefix = "aprendiza" if menina else "aprendiz"
    save(sheet, f"sprites/{prefix if name == 'base' else prefix + '-' + name}.png")


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


# Ministro da Magia Baltazar Bonfatti [KAINAN: nome e cargo; visual de mago com chapéu e sobretudo]
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

# Bellatrix Lestrelle [KAINAN: figurino pelas fotos de referência de 31/10]: cabelo preto
# cheio e cacheado com uma mecha acinzentada, rosto pálido, olhos marcados e batom vermelho,
# vestido preto longo com corpete costurado, mangas de renda trançada e arabescos prateados
# na saia; varinha na mão direita. (Sem caveira nem cobra: é personagem original do jogo.)
MORGANA = [
    "..k.kk.kk.kk....",
    ".khkhhkHhkhhk...",
    "khhHhhhhhhHhhk..",
    "khhhhHhhhhhhHhk.",
    "khHhhhhhhhhhhhk.",
    "khghhhsssshhHhhk",
    "khghhsssssshhhHk",
    "khghhsessseshhhk",
    "kHhhhssshsshhHhk",
    "khghhssrrsshhhhk",
    "khghHkssssk hHhk".replace(" ", "h"),
    "khHhhhksskhhhhhk",
    "khghLdddxdddLhHk",
    "khhhxdcCcCcdxhhk",
    "kwhhLdCxCxCdLhhk",
    ".kWhxdcCcCcdxhhk",
    "..kWsdddddddshk.",
    "...kdddddddDDk..",
    "...kdxxdddddDk..",
    "..kdddxdddxxDDk.",
    "..kddddddddxDDk.",
    "..kdxxdddddddDk.",
    "..kddxddddxxdDDk",
    "...kkkkkkkkkkkk.",
]
MORGANA_PAL = {
    "h": (34, 26, 34), "H": (66, 58, 78), "g": (118, 122, 150),
    "s": (238, 222, 216), "S": (214, 192, 188), "e": (30, 20, 34), "r": (196, 34, 46),
    "d": (30, 28, 38), "D": (52, 48, 62), "c": (46, 42, 56), "C": (74, 70, 88),
    "x": (150, 152, 174), "L": (60, 56, 70), "w": (120, 76, 44), "W": (160, 112, 70),
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


# Cada personagem alonga em lugares próprios (rosto, peito, mangas, saia, pernas) para ficar
# com 2 tiles; fantasmas e fadas, que flutuam, alongam o corpo e ganham espaço em cima.
NPC_REPS = {
    "arquimedes": {10: 1, 14: 1, 15: 1, 18: 1, 19: 2, 20: 1, 22: 1},
    "aristoteles": {6: 1, 13: 1, 15: 1, 17: 1, 19: 2, 20: 1, 22: 1},
    "morgana": {6: 1, 13: 1, 15: 1, 17: 1, 18: 1, 20: 1, 21: 1, 22: 1},
    "booh": {6: 1, 11: 1, 12: 1, 13: 1, 14: 1},
    "addam": {8: 1, 13: 1, 14: 1, 16: 1, 17: 1, 18: 1},
    "lagrima": {6: 1, 9: 1, 14: 1, 15: 1, 16: 1, 17: 1},
    "dona-brasa": {6: 1, 13: 1, 15: 1, 16: 1, 18: 2, 21: 1},
    "fada-ramalhete": {6: 1, 13: 1, 15: 1, 16: 1, 18: 2, 21: 1},
    "amelia": {3: 1, 10: 1, 12: 1, 14: 1, 16: 1, 17: 1},
}
# folhas que saem daqui com 2 tiles (o manifesto é corrigido em gen_final_art.py)
TALL_SHEETS = [f"npc.{k}" for k in NPC_REPS]


def tall(rows, reps):
    """Alonga com stretch() e completa até H linhas em cima (o boneco fica de pé no chão)."""
    rows, at = stretch(rows, reps)
    pad = H - len(rows)
    assert pad >= 0, f"{len(rows)} linhas"
    return ["." * 16] * pad + rows, lambda i: at(i) + pad


def render_npcs():
    sets = [
        ("arquimedes", BONFATT, BONFATT_PAL, (11, 7), "XkkX", False),
        ("aristoteles", ARISTOTELES, ARISTOTELES_PAL, (9, 6), "kk", False),
        ("morgana", MORGANA, MORGANA_PAL, (9, 7), "kr", False),
        ("booh", BOOH, BOOH_PAL, (10, 7), "00", True),
        ("addam", ADDAM, ADDAM_PAL, (10, 7), "00", True),
        ("lagrima", LAGRIMA, LAGRIMA_PAL, (11, 6), "00", True),
        ("dona-brasa", BRASA, BRASA_PAL, (9, 7), "mm", False),
        ("fada-ramalhete", BRASA, RAMALHETE_PAL, (9, 7), "mm", False),
    ]
    for key, rows, pal, (my, mx), mouth, ghost in sets:
        rows, at = tall(rows, NPC_REPS[key])
        my = at(my)
        if ghost:
            pal = {**pal, "0": (40, 28, 56, 255)}
            open_rows = with_mouth(rows, my, mx, mouth)
            open_rows = with_mouth(open_rows, my + 1, mx, mouth)
            frames = [paint(r, pal, 16, H, False) for r in (rows, shift_down(rows, 1), open_rows, rows)]
        else:
            frames = npc_frames(rows, pal, (my, mx), mouth, h=H)
        save(strip(frames, 16, H), f"sprites/{key}.png")
    # Amélia: 5 quadros (flutua em 3 alturas; falando)
    amelia, at = tall(AMELIA, NPC_REPS["amelia"])
    talk = with_mouth(amelia, at(6), 7, "mm")
    talk = with_mouth(talk, at(6), 7, "kk")
    fr = [paint(r, AMELIA_PAL, 16, H, False) for r in (amelia, shift_down(amelia, 1), shift_down(amelia, 2), shift_down(talk, 1), shift_down(amelia, 1))]
    save(strip(fr, 16, H), "sprites/amelia.png")


# ======================================================================= professores
# Professores do castelo [KAINAN: nomes e matérias, em content/professores.json]. Silhueta de
# chapéu pontudo e túnica; cada um com as cores da sua ficha [FICÇÃO].
PROF_M = [
    "..........kk....",
    ".........kAk....",
    "........kaAk....",
    ".......kzaAk....",
    "......kzaaAk....",
    ".....kzaaaaAk...",
    "....kGGGGGGGGk..",
    "..kkzzzzzzzzzzkk",
    "...khhsssssshk..",
    "...khseSsSeshk..",
    "...khsssssssshk.",
    "...khsssmssshk..",
    "....khssssshk...",
    "...kRrRcccRrRk..",
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
PROF_M[10] = "...khssssssshk.."
PROF_BARBA = {11: "...khhhhmhhhhk..", 12: "....khhhhhhhk..."}
PROF_F = [
    "..........kk....",
    ".........kAk....",
    "........kaAk....",
    ".......kzaAk....",
    "......kzaaAk....",
    ".....kzaaaaAk...",
    "....kGGGGGGGGk..",
    "..kkzzzzzzzzzzkk",
    "...khhsssssshhk.",
    "...khseSsSeshhk.",
    "...khssssssshhk.",
    "...khsssmssshhk.",
    "...khhsssssshhk.",
    "..khhRrRcccRrhhk",
    "..khhrrRwGwRrhhk",
    "..khkrrRwgwRrkhk",
    "..ksRrrRwwwRrRsk",
    "..kSkRrRGRrRkSk.",
    "...kRrrRwRrrRk..",
    "...kRrrRGRrrRk..",
    "...kQRrrRrrRQk..",
    "...kQQQQQQQQQk..",
    "....kNk...kNk...",
    "....kkk...kkk...",
]


def prof_pal(p):
    hat, robe, hair = ramp(tuple(p["chapeu"])), ramp(tuple(p["roupa"])), ramp(tuple(p["cabelo"]))
    pal = {
        **skin_pal(tuple(p["pele"])),
        "a": hat[2], "A": hat[3], "z": hat[1], "G": (230, 186, 70), "g": (255, 236, 150),
        "h": hair[2], "e": (40, 30, 52), "w": (240, 236, 246), "c": mix(hair[3], (240, 236, 246), 0.5),
        "R": robe[2], "r": robe[1], "Q": robe[0], "N": (60, 44, 40),
    }
    if p.get("fantasma"):
        pal = {k: tuple(v[:3]) + (200,) for k, v in pal.items()}
        pal["e"] = (30, 36, 70, 255)
    return pal


# professores em 2 tiles: rosto +1, peito e mangas +3, túnica +3, pernas +1
PROF_REPS = {10: 1, 14: 1, 15: 1, 18: 1, 19: 2, 20: 1, 22: 1}


def render_professores():
    with open(os.path.join(os.path.dirname(__file__), "..", "content", "professores.json"), encoding="utf-8") as f:
        lista = json.load(f)["lista"]
    for p in lista:
        rows = list(PROF_F if p["sexo"] == "f" else PROF_M)
        if p.get("barba"):
            for i, r in PROF_BARBA.items():
                rows[i] = r
        pal = prof_pal(p)
        rows, at = stretch(rows, PROF_REPS)
        if p.get("fantasma"):
            talk = with_mouth(rows, at(11), 8, "e")
            frames = [paint(r, pal, 16, H, False) for r in (rows, shift_down(rows, 1), talk, rows)]
        else:
            frames = npc_frames(rows, pal, (at(11), 8), "e", h=H)
        save(strip(frames, 16, H), f"sprites/prof-{p['id']}.png")
    return lista


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


# ======================================================================= objetos com personagem

def render_portrait():
    """Bonfatti no quadro da galeria (32x32): moldura dourada com cantos trabalhados."""
    bon = Image.open(os.path.join(ROOT, "sprites", "arquimedes.png")).convert("RGBA")
    gold = ramp((214, 166, 66))

    def frame_img(f, blink=False):
        im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        px = im.load()
        for y in range(32):
            for x in range(32):
                edge = min(x, y, 31 - x, 31 - y)
                if edge == 0:
                    c = INK
                elif edge == 1:
                    c = gold[3] if x < 31 - y else gold[1]
                elif edge == 2:
                    c = gold[2]
                elif edge == 3:
                    c = gold[0]
                else:
                    # fundo pintado: azul-noite com degradê e cortina
                    c = mix((44, 52, 96), (70, 80, 132), (y - 4) / 24)
                    if x < 9 and (x + y // 3) % 4 == 0:
                        c = mix(c, (120, 40, 60), 0.6)
                px[x, y] = c + (255,)
        for cx, cy in ((2, 2), (29, 2), (2, 29), (29, 29)):
            px[cx, cy] = gold[4] + (255,)
        bust = bon.crop((f * 16, 0, f * 16 + 16, 22))
        im.alpha_composite(bust, (8, 5))
        if blink:
            skin = bon.getpixel((6, 10))
            px[13, 14] = skin
            px[17, 14] = skin
        # moldura por cima do busto
        for y in range(32):
            for x in range(32):
                if min(x, y, 31 - x, 31 - y) <= 3 and y > 26:
                    px[x, y] = (gold[2] if min(x, y, 31 - x, 31 - y) == 2 else gold[1] if min(x, y, 31 - x, 31 - y) == 1 else gold[0] if min(x, y, 31 - x, 31 - y) == 3 else INK) + (255,)
        return im

    save(strip([frame_img(0), frame_img(0, True), frame_img(2), frame_img(0)], 32, 32), "sprites/quadro-arquimedes.png")


PLANTER = {
    0: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        ".kkkkkkkkkkkkkk.",
        "kwWWWWWWWWWWWWwk",
        "kwddDddddDdddDwk",
        "kwdDddddDdddddwk",
        "kWWWWWWWWWWWWWWk",
        "kwwwwwwwwwwwwwwk",
        "kwvwwwwwwwwwvwwk",
        ".kkkkkkkkkkkkkk.",
    ],
}
PLANTER[1] = PLANTER[0][:4] + [
    ".......kk.......",
    "......kLgk......",
    ".......kgk......",
    ".......kgk......",
] + PLANTER[0][8:]
PLANTER[2] = [
    "....k.kk.k......",
    "...kLkLgkLk.....",
    "....kLkgLk......",
    ".....kgLgk......",
    ".....kmmmmk.....",
    "....kmMmmmmk....",
    "....kmemmemk....",
    "....kmmnnmmk....",
    ".kkkkmmmmmmkkkk.",
    "kwWWWkmmmmkWWWwk",
] + PLANTER[0][10:]
PLANTER_PAL = {
    "w": (120, 76, 44), "W": (150, 100, 58), "v": (90, 56, 34),
    "d": (70, 48, 34), "D": (96, 66, 44),
    "g": (90, 170, 80), "L": (140, 210, 110),
    "m": (214, 184, 136), "M": (240, 214, 170), "e": (34, 28, 40), "n": (170, 100, 90),
}


def render_props():
    render_portrait()
    save(strip([paint(PLANTER[i], PLANTER_PAL, 16, 16) for i in range(3)], 16, 16), "sprites/canteiro.png")


POT_BODY = [
    "...kkkkkkkkkk...",
    "..kMMMMMMMMMMk..",
    ".kmgGggggggGgmk.",
    ".kMkkkkkkkkkkMk.",
    "kmMmmmmmmmmmmMmk",
    "kmMmmmmmmmmmmmmk",
    "kmmmmmmmmmmmmmnk",
    ".kmmmmmmmmmmmnk.",
    "..knnnnnnnnnnk..",
    "...kkkkkkkkkk...",
]
POT_FIRE = [
    ["...kok.ko.kok...", "....kYkoYkyk....", ".....k.k.k.k...."],
    ["...koko.kokok...", "....kykYokYk....", ".....k.k.k.k...."],
    ["...kok.kokok....", "....kYkyokYk....", ".....k.k..k....."],
]
POT_BUBBLES = [
    ["......G.........", ".........g......", "....g...G.......".replace("G", "G")],
    ["........G.......", "....G...........", "......g...g....."],
    [".........g......", ".....g...G......", "....G.....g....."],
]
POT_PAL = {
    "m": (58, 56, 72), "M": (96, 94, 112), "n": (36, 34, 48),
    "g": (90, 200, 110), "G": (176, 244, 168),
    "o": (236, 126, 48), "y": (250, 214, 92), "Y": (255, 246, 190),
}

SHELF = [
    "kkkkkkkkkkkkkkkk",
    "kWWWWWWWWWWWWWWk",
    "kwk1kk2k3kk4k5wk",
    "kwk1k22k3k44k5wk",
    "kwk1k22k3k44k5wk",
    "kwk!k22k#k44k%wk",
    "kwk1k22k3k44k5wk",
    "kwk1k22k3k44k5wk",
    "kWWWWWWWWWWWWWWk",
    "kwvvvvvvvvvvvvwk",
    "kwk3kk4k1k2kk5wk",
    "kwk3k44k1k2k55wk",
    "kwk3k44k1k2k55wk",
    "kwk#k44k!k@k55wk",
    "kwk3k44k1k2k55wk",
    "kwk3k44k1k2k55wk",
    "kWWWWWWWWWWWWWWk",
    "kwvvvvvvvvvvvvwk",
    "kwk5k2kk4kk1k3wk",
    "kwk5k2k44k11k3wk",
    "kwk5k2k44k11k3wk",
    "kwk%k@k44k11k#wk",
    "kwk5k2k44k11k3wk",
    "kwk5k2k44k11k3wk",
    "kWWWWWWWWWWWWWWk",
    "kwvvvvvvvvvvvvwk",
    "kwk4k1k5kk3k2wwk",
    "kwk4k1k5k33k2wwk",
    "kwk$k!k%k33k@wwk",
    "kwk4k1k5k33k2wwk",
    "kWWWWWWWWWWWWWWk",
    "kkkkkkkkkkkkkkkk",
]
SHELF_PAL = {
    "W": (150, 100, 58), "w": (110, 72, 42), "v": (70, 46, 30),
    "1": (176, 44, 52), "2": (46, 92, 172), "3": (40, 138, 80), "4": (200, 154, 44), "5": (120, 70, 150),
    "!": (230, 200, 120), "@": (230, 200, 120), "#": (230, 200, 120), "$": (230, 200, 120), "%": (230, 200, 120),
}

CRATE = [
    "................",
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kLLLLLLLLLLLLk.",
    ".kLwwwwwwwwwwLk.",
    ".kLwXwwwwwwYwLk.",
    ".kLwwXwwwwYwwLk.",
    ".kLwwwXwwYwwwLk.",
    ".kLLLLLXYLLLLLk.",
    ".kLwwwYwXwwwwLk.",
    ".kLwwYwwwXwwwLk.",
    ".kLwYwwwwwXwwLk.",
    ".kLwwwwwwwwwwLk.",
    ".kLLLLLLLLLLLLk.",
    ".knnnnnnnnnnnnk.",
    ".kkkkkkkkkkkkkk.",
]
CRATE_PAL = {"L": (160, 110, 62), "w": (128, 86, 48), "X": (96, 62, 36), "Y": (96, 62, 36), "n": (80, 52, 32)}

PANTRY = [
    "kkkkkkkkkkkkkkkk",
    "kWWWWWWWWWWWWWWk",
    "kw.kk..kk..kk.wk",
    "kwkook.kgk.kpkwk",
    "kwkOok.kGk.kPkwk",
    "kwkook.kgk.kpkwk",
    "kWWWWWWWWWWWWWWk",
    "kwvvvvvvvvvvvvwk",
    "kw.kkk...kk...wk",
    "kwkaaak.kcck..wk",
    "kwkAaak.kCck..wk",
    "kwkaaak.kcck..wk",
    "kWWWWWWWWWWWWWWk",
    "kwvvvvvvvvvvvvwk",
    "kw..kk..kkkk..wk",
    "kw.kssk.kjjk..wk",
    "kw.kSsk.kJjk..wk",
    "kw.kssk.kjjk..wk",
    "kWWWWWWWWWWWWWWk",
    "kwvvvvvvvvvvvvwk",
    "kwwwwwwwwwwwwwwk",
    "kWWWWWWWWWWWWWWk",
    "kkkkkkkkkkkkkkkk",
    "................",
]
PANTRY_PAL = {
    "W": (150, 100, 58), "w": (110, 72, 42), "v": (70, 46, 30),
    "o": (236, 126, 48), "O": (255, 180, 100), "g": (176, 230, 240), "G": (230, 250, 255),
    "p": (214, 90, 170), "P": (250, 150, 210), "a": (120, 72, 40), "A": (160, 104, 60),
    "c": (230, 222, 200), "C": (255, 250, 236), "s": (90, 170, 80), "S": (140, 210, 110),
    "j": (196, 60, 60), "J": (240, 120, 110),
}

VASE = [
    "................",
    "................",
    "................",
    "................",
    ".....L.k.L......",
    "....kLkgkLk.....",
    ".....kLgLk......",
    "...k..kgk..k....",
    "...kLkkgkkLk....",
    "....kkgggkk.....",
    "....kooooook....",
    "...kOOOOOOOOk...",
    "...koOooooook...",
    ".....koooook....",
    ".....knnnnnk....",
    "......kkkkk.....",
]
VASE_PAL = {"L": (140, 210, 110), "g": (90, 170, 80), "o": (200, 100, 56), "O": (236, 140, 84), "n": (150, 70, 40)}


def render_furniture():
    pots = []
    for i in range(3):
        rows = ["." * 16] * 1 + POT_BUBBLES[i] + ["." * 16] * 0
        rows = rows + POT_BODY[:-1] + POT_FIRE[i][:1] + POT_FIRE[i][1:2]
        rows = (rows + ["." * 16] * 16)[:16]
        pots.append(paint(rows, POT_PAL, 16, 16))
    save(strip(pots, 16, 16), "sprites/caldeirao.png")
    save(paint(SHELF, SHELF_PAL, 16, 32), "sprites/estante.png")
    save(paint(CRATE, CRATE_PAL, 16, 16), "sprites/caixote.png")
    save(paint(PANTRY, PANTRY_PAL, 16, 24), "sprites/despensa.png")
    vase = VASE
    save(paint(vase, VASE_PAL, 16, 16), "sprites/vaso.png")


# ======================================================================= porão secreto e coleção

ICON_MAPA = [
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    ".kPPpPPPpPPPPpk.",
    ".kPpPPrPPpPPPPk.",
    ".kPPPrPrPPPpPPk.",
    ".kpPPPPPrPPPPPk.",
    ".kPPpPPPPrPxPPk.",
    ".kPPPPpPPPrPPpk.",
    ".kPpPPPPPPPrPPk.",
    ".kPPPPPpPPPPPPk.",
    ".kpPPPPPPpPPPpk.",
    ".kQQQQQQQQQQQQk.",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
]
ICON_MAPA_PAL = {"P": (232, 214, 170), "p": (204, 180, 130), "r": (170, 60, 60), "x": (60, 40, 120), "Q": (170, 140, 96)}

ICON_ESTRELA = [
    "................",
    ".......kk.......",
    "......kYYk......",
    "......kYyk......",
    ".kkkkkYyyykkkkk.",
    ".kYYYYyyyyyyyyk.",
    "..kYyyyyyyyyok..",
    "...kyyyyyyyok...",
    "....kyyyyyok....",
    "...kyyyyyyyok...",
    "...kyyyokyyok...",
    "..kyyok..kyyok..",
    "..kyok....kook..",
    "..kkk......kkk..",
    "................",
    "................",
]
ICON_ESTRELA_PAL = {"Y": (255, 250, 210), "y": (250, 214, 92), "o": (210, 150, 50)}

ICON_AMULETO = [
    "....kkkkkkkk....",
    "...kc......ck...",
    "..kc........ck..",
    "..kc........ck..",
    "...kc......ck...",
    "....kc....ck....",
    ".....kkGGkk.....",
    "....kGgYYgGk....",
    "...kGgYwYYgGk...",
    "...kGYYYYYYGk...",
    "...kGgYYYYgGk...",
    "....kGgYYgGk....",
    ".....kGGGGk.....",
    "......kkkk......",
    "................",
    "................",
]
ICON_AMULETO_PAL = {"c": (200, 200, 214), "G": (214, 166, 66), "g": (240, 200, 100), "Y": (120, 150, 240), "w": (240, 246, 255)}

ICON_CHAVE = [
    "................",
    "................",
    "....kkkk........",
    "...kGggGk.......",
    "..kGk..kGk......",
    "..kgk..kgk......",
    "...kGggGkkkkkkk.",
    "....kkkkGgggggGk",
    "........kkkGkGk.",
    "..........kGkGk.",
    "...........k.k..",
    "................",
    "................",
    "................",
    "................",
    "................",
]
ICON_CHAVE_PAL = {"G": (150, 120, 80), "g": (190, 160, 110)}

CHEST_CLOSED = [
    "................",
    "................",
    "................",
    "...kkkkkkkkkk...",
    "..kWWWWWWWWWWk..",
    ".kWwwwwwwwwwwWk.",
    ".kGGGGGGGGGGGGk.",
    ".kwwwwwkYkwwwwk.",
    ".kGGGGGkykGGGGk.",
    ".kwwwwwwkwwwwwk.",
    ".kwvwwwwwwwwvwk.",
    ".kwwwwwwwwwwwwk.",
    ".kGGGGGGGGGGGGk.",
    ".kvvvvvvvvvvvvk.",
    "..kkkkkkkkkkkk..",
    "................",
]
CHEST_OPEN = [
    "................",
    "...kkkkkkkkkk...",
    "..kWwwwwwwwwWk..",
    "..kWkkkkkkkkWk..",
    "..kGGGGGGGGGGk..",
    ".kkkkkkkkkkkkkk.",
    ".kdddddddddddddk"[:16],
    ".kdDddddddddDdk.",
    ".kGGGGGkykGGGGk.",
    ".kwwwwwwkwwwwwk.",
    ".kwvwwwwwwwwvwk.",
    ".kwwwwwwwwwwwwk.",
    ".kGGGGGGGGGGGGk.",
    ".kvvvvvvvvvvvvk.",
    "..kkkkkkkkkkkk..",
    "................",
]
CHEST_PAL = {
    "W": (160, 110, 62), "w": (128, 86, 48), "v": (90, 58, 34),
    "G": (176, 176, 196), "Y": (250, 214, 92), "y": (210, 160, 60),
    "d": (40, 30, 30), "D": (90, 70, 50),
}

TRAPDOOR = [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kWwwwkWwwwwkWk.",
    ".kWwwwkWwwwwkWk.",
    ".kGGGGGGGGGGGGk.",
    ".kWwwwkWwwYwkWk.",
    ".kWwwwkWwYywkWk.",
    ".kWwwwkWwwYwkWk.",
    ".kGGGGGGGGGGGGk.",
    ".kWwwwkWwwwwkWk.",
    ".kWwwwkWwwwwkWk.",
    ".kvvvvkvvvvvkvk.",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
    "................",
]
STAIRS_UP = [
    "kkkkkkkkkkkkkkkk",
    "kddddddddddddddk",
    "kSSSSSSSSSSSSSSk",
    "ksssssssssssssssk"[:16],
    "kddddddddddddddk",
    "kSSSSSSSSSSSSSSk",
    "kssssssssssssssk",
    "kddddddddddddddk",
    "kSSSSSSSSSSSSSSk",
    "kssssssssssssssk",
    "kddddddddddddddk",
    "kSSSSSSSSSSSSSSk",
    "kssssssssssssssk",
    "kkkkkkkkkkkkkkkk",
    "................",
    "................",
]
STAIRS_PAL = {"d": (40, 36, 56), "S": (120, 116, 140), "s": (92, 88, 112)}


def add_icons(names_and_imgs):
    """Acrescenta ícones no fim da tira ui/icones.png e devolve {nome: índice}."""
    path = os.path.join(ROOT, "ui", "icones.png")
    with open(os.path.join(ROOT, "manifest.json")) as fh:
        known = json.load(fh)["spritesheets"]["ui.icones"]["frameNames"]
    n0 = len([k for k in known if k not in dict(names_and_imgs)])
    base = Image.open(path).convert("RGBA").crop((0, 0, n0 * 16, 16))
    out = Image.new("RGBA", (base.width + 16 * len(names_and_imgs), 16), (0, 0, 0, 0))
    out.paste(base, (0, 0))
    idx = {}
    for i, (name, im) in enumerate(names_and_imgs):
        out.paste(im, ((n0 + i) * 16, 0))
        idx[name] = n0 + i
    out.save(path)
    return idx


def render_secret_stuff():
    """Devolve os ícones novos (para o manifesto)."""
    save(strip([paint(CHEST_CLOSED, CHEST_PAL, 16, 16), paint(CHEST_OPEN, CHEST_PAL, 16, 16)], 16, 16), "sprites/bau.png")
    save(paint(TRAPDOOR, CHEST_PAL, 16, 16), "sprites/alcapao.png")
    save(paint(STAIRS_UP, STAIRS_PAL, 16, 16), "sprites/escada-porao.png")
    return add_icons([
        ("mapa-dos-segredos", paint(ICON_MAPA, ICON_MAPA_PAL, 16, 16)),
        ("estrela-perdida", paint(ICON_ESTRELA, ICON_ESTRELA_PAL, 16, 16)),
        ("amuleto-estelar", paint(ICON_AMULETO, ICON_AMULETO_PAL, 16, 16)),
        ("chave-do-porao", paint(ICON_CHAVE, ICON_CHAVE_PAL, 16, 16)),
    ])


def render_all():
    for name, robe in CAPAS.items():
        render_player(name, robe)
        render_player(name, robe, menina=True)
    render_npcs()
    render_professores()
    render_small()
    render_props()
    render_furniture()
    return render_secret_stuff()

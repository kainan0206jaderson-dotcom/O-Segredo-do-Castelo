"""Opções de visual do aprendiz (pele, cabelo e roupa) [KAINAN pediu; cores FICÇÃO].

O jogo não guarda uma folha para cada combinação: ele recolore a folha padrão na hora.
Aqui cada opção vira um mapa "cor padrão -> cor nova", tirado comparando pixel a pixel a
folha padrão com a folha desenhada com a opção. Assim o contorno colorido (que puxa o tom
da cor vizinha) também muda certinho. Sai em src/core/visual-cores.json.
"""
import json
import os

from art_lib import ROOT
import art_people as P

PELES = [
    ("clara", "Clara", (255, 222, 196)),
    ("media", "Média", (244, 196, 156)),  # a padrão
    ("morena", "Morena", (206, 146, 102)),
    ("parda", "Parda", (164, 108, 70)),
    ("negra", "Negra", (112, 72, 50)),
]
CABELOS = [
    ("castanho", "Castanho", (92, 58, 40)),  # o padrão
    ("preto", "Preto", (44, 36, 42)),
    ("loiro", "Loiro", (216, 172, 92)),
    ("ruivo", "Ruivo", (180, 80, 42)),
]
# só duas roupas por personagem, para manter a identidade do jogo [KAINAN]
ROUPAS = {
    False: [
        ("roxa", "Roxa", None),  # a padrão
        ("azul-noite", "Azul-noite", ((58, 66, 132), {})),
    ],
    True: [
        ("bege", "Bege", None),  # a padrão (bege off-white com azul-marinho)
        ("lavanda", "Lavanda", ((200, 186, 230), {"Q": P.NAVY[0], "r": P.NAVY[1], "R": P.NAVY[2], "l": P.NAVY[0], "L": P.NAVY[1]})),
    ],
}


def hexc(c):
    return "%02x%02x%02x" % c[:3]


def diff_map(pairs, what):
    """pairs: [(folha padrão, folha com a opção)]. Devolve {cor padrão: cor nova}.
    Cada cor da folha padrão precisa virar uma cor só (o contorno usa ref_pal para isso)."""
    votes = {}
    for a, b in pairs:
        pa, pb = a.load(), b.load()
        for y in range(a.height):
            for x in range(a.width):
                ca, cb = pa[x, y], pb[x, y]
                if ca[3]:
                    v = votes.setdefault(ca[:3], {})
                    v[cb[:3]] = v.get(cb[:3], 0) + 1
    out, off = {}, 0
    for src, v in votes.items():
        best = max(v, key=v.get)
        off += sum(v.values()) - v[best]
        if best != src:
            out[hexc(src)] = hexc(best)
    assert off == 0, f"{what}: {off} pixels não cabem num mapa de cores"
    return out


def render_visual():
    capas = list(P.CAPAS.items())
    padrao = {(m, n): P.player_sheet(n, r, m) for m in (False, True) for n, r in capas}
    data = {"pele": [], "cabelo": [], "roupa": {"menino": [], "menina": []}}
    for key, label, cor in PELES:
        pairs = [(padrao[(m, n)], P.player_sheet(n, r, m, skin=cor)) for m in (False, True) for n, r in capas]
        data["pele"].append({"id": key, "nome": label, "cor": hexc(cor), "mapa": diff_map(pairs, f"pele {key}")})
    for key, label, cor in CABELOS:
        pairs = [(padrao[(m, n)], P.player_sheet(n, r, m, hair=cor)) for m in (False, True) for n, r in capas]
        data["cabelo"].append({"id": key, "nome": label, "cor": hexc(cor), "mapa": diff_map(pairs, f"cabelo {key}")})
    for menina, opts in ROUPAS.items():
        for key, label, roupa in opts:
            base = padrao[(menina, "base")]
            alt = P.player_sheet("base", P.CAPAS["base"], menina, roupa=roupa) if roupa else base
            cor = roupa[0] if roupa else alt.getpixel((40, 40))[:3]
            data["roupa"]["menina" if menina else "menino"].append(
                {"id": key, "nome": label, "cor": hexc(cor), "mapa": diff_map([(base, alt)], f"roupa {key}")})
    path = os.path.join(ROOT, "..", "..", "src", "core", "visual-cores.json")
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return data


if __name__ == "__main__":
    d = render_visual()
    print({k: len(v) for k, v in d.items()})

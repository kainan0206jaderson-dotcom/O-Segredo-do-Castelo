"""Junta capturas "antes" e "depois" de cada sala lado a lado (tools/capturas.mjs gera as duas).

Uso: python3 tools/comparar.py <pasta-antes> <pasta-depois> <pasta-saida>
"""
import os
import sys

from PIL import Image, ImageDraw

antes, depois, saida = sys.argv[1:4]
os.makedirs(saida, exist_ok=True)
W = 960
for nome in sorted(os.listdir(depois)):
    if not nome.endswith(".png") or not os.path.exists(os.path.join(antes, nome)):
        continue
    a = Image.open(os.path.join(antes, nome)).convert("RGB")
    b = Image.open(os.path.join(depois, nome)).convert("RGB")
    h = round(a.height * W / a.width)
    out = Image.new("RGB", (W * 2 + 12, h + 28), (24, 20, 42))
    out.paste(a.resize((W, h), Image.NEAREST), (0, 28))
    out.paste(b.resize((W, h), Image.NEAREST), (W + 12, 28))
    d = ImageDraw.Draw(out)
    d.text((8, 8), f"ANTES  {nome[:-4]}", fill=(250, 214, 92))
    d.text((W + 20, 8), "DEPOIS", fill=(250, 214, 92))
    out.save(os.path.join(saida, nome))

"""Utilidades da arte definitiva: rampas de cor, mistura e ruído fixo (sempre o mesmo resultado)."""
import colorsys
import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")


def hsh(x, y, seed=0):
    """Ruído determinístico entre 0 e 1."""
    n = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 0xFFFF


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _shift(c, dl, toward_h, amount, ds=1.0):
    h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c[:3]))
    l = max(0.0, min(1.0, l + dl))
    s = max(0.0, min(1.0, s * ds))
    if s > 0.04:
        d = ((toward_h - h + 0.5) % 1.0) - 0.5
        h = (h + d * amount) % 1.0
    return tuple(round(v * 255) for v in colorsys.hls_to_rgb(h, l, s))


def ramp(base):
    """[contorno, sombra, base, luz, brilho]: sombra puxa para o roxo, luz para o amarelo."""
    return [
        _shift(base, -0.30, 0.72, 0.30, 0.9),
        _shift(base, -0.12, 0.72, 0.15),
        tuple(base[:3]),
        _shift(base, 0.10, 0.14, 0.12),
        _shift(base, 0.22, 0.14, 0.2, 0.9),
    ]

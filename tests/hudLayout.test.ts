import { describe, expect, it } from 'vitest';
import { hudLayout, overlaps, type Box } from '../src/ui/hudLayout';

const H = 270;

describe('HUD: nenhuma peça cobre outra', () => {
  for (const w of [480, 520, 568, 600, 640]) {
    it(`largura ${w}`, () => {
      const l = hudLayout(w, H);
      const boxes: Record<string, Box> = {
        missao: l.quest, bolsa: l.bag, feitico: l.spell, vitais: l.vitals,
        cronometro: l.timer, aviso: l.notice, sala: l.roomName, chefe: l.boss, acao: l.action,
      };
      const names = Object.keys(boxes);
      for (const [i, a] of names.entries()) {
        const box = boxes[a];
        expect(box.x, `${a} sai pela esquerda`).toBeGreaterThanOrEqual(0);
        expect(box.y, `${a} sai por cima`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w, `${a} sai pela direita`).toBeLessThanOrEqual(w);
        expect(box.y + box.h, `${a} sai por baixo`).toBeLessThanOrEqual(H);
        for (const b of names.slice(i + 1)) {
          // feitiço e corações formam uma coluna só; o resto não pode se encostar
          if ([a, b].includes('vitais') && [a, b].includes('feitico')) continue;
          expect(overlaps(box, boxes[b]), `${a} cobre ${b}`).toBe(false);
        }
      }
    });
  }

  it('a tecla da bolsa fica acima dos corações', () => {
    const l = hudLayout(480, H);
    expect(l.bagKey.y + 7).toBeLessThanOrEqual(l.heartsY - 4);
  });

  it('o feitiço fica acima dos corações', () => {
    const l = hudLayout(480, H);
    expect(l.spell.y + l.spell.h).toBeLessThanOrEqual(l.heartsY - 4);
  });
});

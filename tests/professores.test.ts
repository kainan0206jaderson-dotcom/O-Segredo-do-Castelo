import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dialogues } from './content-load';

const { lista } = JSON.parse(readFileSync('content/professores.json', 'utf8')) as { lista: { id: string; nome: string }[] };

describe('professores: cada um tem uma função no castelo', () => {
  for (const p of lista) {
    it(p.nome, () => {
      const d = dialogues[`prof-${p.id}`];
      expect(d, `falta content/dialogues/prof-${p.id}.json`).toBeDefined();
      const nodes = Object.values(d.nodes);
      // função = uma escolha para o jogador ou algum efeito (dar item, missão, cura, quiz...)
      const hasChoice = nodes.some((n) => (n.choices?.length ?? 0) > 0);
      const hasEffect = nodes.some((n) => (n.effects?.length ?? 0) > 0) || nodes.some((n) => n.choices?.some((c) => (c.effects?.length ?? 0) > 0));
      expect(hasChoice || hasEffect).toBe(true);
    });
  }
});

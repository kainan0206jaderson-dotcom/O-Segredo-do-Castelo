import type { GameState } from '../core/GameState';

export interface LootTable {
  recargaMs: number;
  chanceSombrinha: number;
  itens: { item: string; peso: number }[];
}

export type ChestResult = { kind: 'vazio'; readyInMs: number } | { kind: 'susto' } | { kind: 'itens'; items: string[] };

/** Abre um baú: ele só enche de novo depois de um tempo de jogo. rnd é injetável para os testes. */
export function openChest(s: GameState, table: LootTable, flag: string, rnd: () => number = Math.random): ChestResult {
  const openedAt = s.flags[flag];
  if (typeof openedAt === 'number' && s.playTimeMs - openedAt < table.recargaMs) {
    return { kind: 'vazio', readyInMs: table.recargaMs - (s.playTimeMs - openedAt) };
  }
  s.flags[flag] = s.playTimeMs;
  if (rnd() < table.chanceSombrinha) return { kind: 'susto' };
  const total = table.itens.reduce((n, i) => n + i.peso, 0);
  const pick = () => {
    let r = rnd() * total;
    for (const i of table.itens) {
      r -= i.peso;
      if (r < 0) return i.item;
    }
    return table.itens[table.itens.length - 1].item;
  };
  const items = [pick()];
  if (rnd() < 0.4) items.push(pick());
  return { kind: 'itens', items };
}

import type { GameState } from '../core/GameState';
import { apply, type ContentDb, type Notice } from './rules';

export type BrewResult =
  | { ok: true; recipe: string; item: string; notices: Notice[]; discovered: boolean }
  | { ok: false; reason: 'vazio' | 'sem-ingrediente' | 'nao-combina' };

/** Junta ingredientes iguais: ["a", "b", "a"] -> { a: 2, b: 1 }. */
export function countIngredients(ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = (out[id] ?? 0) + 1;
  return out;
}

/** Receita cujos ingredientes são exatamente estes, ou undefined. */
export function findRecipe(db: ContentDb, ids: string[]): string | undefined {
  const got = countIngredients(ids);
  return Object.entries(db.recipes).find(([, r]) => {
    const want = Object.entries(r.ingredients);
    return want.length === Object.keys(got).length && want.every(([item, n]) => got[item] === n);
  })?.[0];
}

/**
 * Mistura no caldeirão. Se combinar com uma receita (mesmo desconhecida), gasta os
 * ingredientes, dá a poção e anota a receita no grimório. Se não combinar, nada é gasto.
 */
export function brew(s: GameState, db: ContentDb, ids: string[]): BrewResult {
  if (!ids.length) return { ok: false, reason: 'vazio' };
  const need = countIngredients(ids);
  if (Object.entries(need).some(([item, n]) => (s.inventory[item] ?? 0) < n)) return { ok: false, reason: 'sem-ingrediente' };
  const recipe = findRecipe(db, ids);
  if (!recipe) return { ok: false, reason: 'nao-combina' };
  const r = db.recipes[recipe];
  const notices: Notice[] = [];
  for (const [item, n] of Object.entries(r.ingredients)) notices.push(...apply({ takeItem: item, count: n }, s, db));
  const discovered = !s.recipes.includes(recipe);
  notices.push(...apply({ learnRecipe: recipe }, s, db));
  notices.push(...apply({ giveItem: r.result }, s, db));
  return { ok: true, recipe, item: r.result, notices, discovered };
}

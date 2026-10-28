import type { FlagValue } from '../types/content';

export const SAVE_VERSION = 2;

export interface QuestProgress {
  stage: string;
  done: boolean;
}

/** Tudo que precisa ser salvo. Sistemas leem e alteram só este objeto. */
export interface GameState {
  version: number;
  map: string;
  spawn: string;
  flags: Record<string, FlagValue>;
  quests: Record<string, QuestProgress>;
  inventory: Record<string, number>;
  /** Feitiços aprendidos, na ordem em que foram aprendidos. */
  spells: string[];
  selectedSpell: string | null;
  recipes: string[];
  /** Desafios opcionais vencidos e o melhor tempo. */
  challenges: Record<string, { done: boolean; bestMs?: number }>;
  playTimeMs: number;
}

export function newGame(map: string, spawn: string): GameState {
  return {
    version: SAVE_VERSION, map, spawn, flags: {}, quests: {}, inventory: {},
    spells: [], selectedSpell: null, recipes: [], challenges: {}, playTimeMs: 0,
  };
}

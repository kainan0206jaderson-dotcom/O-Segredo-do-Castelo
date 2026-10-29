import type { FlagValue } from '../types/content';

export const SAVE_VERSION = 3;

/** Vida e energia iniciais (iguais ao nível 1 de content/progression.json). */
export const START_VIDA = 5;
export const START_ENERGIA = 6;

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
  /** Casa escolhida com o Prof. Arquimedes (coragem, inteligencia, astucia, lealdade). */
  house: string | null;
  /** Ficha do aprendiz. */
  level: number;
  xp: number;
  vida: number;
  energia: number;
  equipment: { capa?: string; amuleto?: string };
  /** Aprendiz menino ou menina (saves antigos não têm: contam como menino). */
  aparencia?: 'menino' | 'menina';
  /** Pele, cabelo e roupa escolhidos na tela de Visual (ver core/visual.ts). */
  visual?: { pele: string; cabelo: string; roupa: number };
  playTimeMs: number;
}

export function newGame(map: string, spawn: string): GameState {
  return {
    version: SAVE_VERSION, map, spawn, flags: {}, quests: {}, inventory: {},
    spells: [], selectedSpell: null, recipes: [], challenges: {},
    house: null, level: 1, xp: 0, vida: START_VIDA, energia: START_ENERGIA, equipment: {}, playTimeMs: 0,
  };
}

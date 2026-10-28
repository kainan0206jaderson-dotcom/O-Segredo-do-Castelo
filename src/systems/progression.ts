import type { GameState } from '../core/GameState';
import type { ItemDef, LevelDef, ProgressionDef, StatBonus } from '../types/content';

/** Atributos da ficha já somados: nível atual + bônus do que o aprendiz veste. */
export interface Stats {
  level: number;
  vidaMax: number;
  energiaMax: number;
  poder: number;
  regenMs: number;
  /** Multiplicador da velocidade de andar. */
  velocidade: number;
  /** Experiência que falta para o próximo nível (undefined no nível máximo). */
  nextXp?: number;
}

type Db = { progression: ProgressionDef; items: Record<string, ItemDef> };

export function levelDef(db: Db, level: number): LevelDef {
  const levels = db.progression.levels;
  return levels[Math.min(Math.max(level, 1), levels.length) - 1];
}

export function equipmentBonus(s: GameState, db: Db): Required<StatBonus> {
  const total = { vida: 0, energia: 0, poder: 0, velocidade: 0, regen: 0 };
  for (const id of Object.values(s.equipment)) {
    const b = id ? db.items[id]?.bonus : undefined;
    if (!b) continue;
    total.vida += b.vida ?? 0;
    total.energia += b.energia ?? 0;
    total.poder += b.poder ?? 0;
    total.velocidade += b.velocidade ?? 0;
    total.regen += b.regen ?? 0;
  }
  return total;
}

export function stats(s: GameState, db: Db): Stats {
  const lv = levelDef(db, s.level);
  const bonus = equipmentBonus(s, db);
  return {
    level: s.level,
    vidaMax: lv.vida + bonus.vida,
    energiaMax: lv.energia + bonus.energia,
    poder: lv.poder + bonus.poder,
    regenMs: Math.max(500, db.progression.regenMs - bonus.regen),
    velocidade: 1 + bonus.velocidade,
    nextXp: db.progression.levels[s.level]?.xp,
  };
}

/** Mantém vida e energia dentro dos limites (depois de trocar de capa, por exemplo). */
export function clampVitals(s: GameState, db: Db): void {
  const st = stats(s, db);
  s.vida = Math.min(Math.max(s.vida, 0), st.vidaMax);
  s.energia = Math.min(Math.max(s.energia, 0), st.energiaMax);
}

/** Soma experiência. Devolve os níveis alcançados (vazio se não subiu). Subir de nível enche vida e energia. */
export function addXp(s: GameState, db: Db, amount: number): number[] {
  s.xp += Math.max(0, amount);
  const reached: number[] = [];
  const levels = db.progression.levels;
  while (s.level < levels.length && s.xp >= levels[s.level].xp) {
    s.level += 1;
    reached.push(s.level);
  }
  if (reached.length) {
    const st = stats(s, db);
    s.vida = st.vidaMax;
    s.energia = st.energiaMax;
  }
  return reached;
}

/** Gasta energia se houver o bastante. */
export function spendEnergy(s: GameState, cost: number): boolean {
  if (s.energia < cost) return false;
  s.energia -= cost;
  return true;
}

/** Tira vida. Devolve true se o aprendiz desmaiou. */
export function hurt(s: GameState, amount: number): boolean {
  s.vida = Math.max(0, s.vida - amount);
  return s.vida === 0;
}

export function heal(s: GameState, db: Db, amount: number): void {
  s.vida = Math.min(stats(s, db).vidaMax, s.vida + amount);
}

export function restoreEnergy(s: GameState, db: Db, amount: number): void {
  s.energia = Math.min(stats(s, db).energiaMax, s.energia + amount);
}

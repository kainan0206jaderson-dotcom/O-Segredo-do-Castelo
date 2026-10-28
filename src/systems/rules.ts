import type { GameState } from '../core/GameState';
import type { Condition, Effect, ItemDef, QuestDef } from '../types/content';

export interface ContentDb {
  quests: Record<string, QuestDef>;
  items: Record<string, ItemDef>;
}

/** Avisos curtos para a tela ("Você recebeu: Varinha"). */
export type Notice = { kind: 'item' | 'quest-start' | 'quest-update' | 'quest-done'; text: string };

export function check(cond: Condition | undefined, s: GameState): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every((c) => check(c, s));
  if ('any' in cond) return cond.any.some((c) => check(c, s));
  if ('not' in cond) return !check(cond.not, s);
  if ('flag' in cond) return cond.eq === undefined ? Boolean(s.flags[cond.flag]) : s.flags[cond.flag] === cond.eq;
  if ('questStage' in cond) {
    const q = s.quests[cond.questStage];
    return Boolean(q && !q.done && q.stage === cond.stage);
  }
  if ('questDone' in cond) return Boolean(s.quests[cond.questDone]?.done);
  if ('questActive' in cond) {
    const q = s.quests[cond.questActive];
    return Boolean(q && !q.done);
  }
  if ('hasItem' in cond) return (s.inventory[cond.hasItem] ?? 0) > 0;
  return false;
}

export function apply(effect: Effect, s: GameState, db: ContentDb): Notice[] {
  if ('setFlag' in effect) {
    s.flags[effect.setFlag] = effect.value;
    return [];
  }
  if ('giveItem' in effect) {
    const item = db.items[effect.giveItem];
    if (!item) throw new Error(`item desconhecido: ${effect.giveItem}`);
    s.inventory[effect.giveItem] = (s.inventory[effect.giveItem] ?? 0) + (effect.count ?? 1);
    return [{ kind: 'item', text: `Você recebeu: ${item.name}` }];
  }
  if ('takeItem' in effect) {
    const left = (s.inventory[effect.takeItem] ?? 0) - (effect.count ?? 1);
    if (left > 0) s.inventory[effect.takeItem] = left;
    else delete s.inventory[effect.takeItem];
    return [];
  }
  if ('startQuest' in effect) {
    const q = quest(db, effect.startQuest);
    if (s.quests[effect.startQuest]) return [];
    s.quests[effect.startQuest] = { stage: q.stages[0].id, done: false };
    return [{ kind: 'quest-start', text: `Nova missão: ${q.title}` }];
  }
  if ('advanceQuest' in effect) {
    const q = quest(db, effect.advanceQuest);
    if (!q.stages.some((st) => st.id === effect.to)) throw new Error(`etapa desconhecida: ${effect.advanceQuest}/${effect.to}`);
    const p = s.quests[effect.advanceQuest];
    if (!p || p.done || p.stage === effect.to) return [];
    p.stage = effect.to;
    return [{ kind: 'quest-update', text: 'Missão atualizada' }];
  }
  if ('completeQuest' in effect) {
    const q = quest(db, effect.completeQuest);
    const p = s.quests[effect.completeQuest];
    if (!p || p.done) return [];
    p.done = true;
    return [{ kind: 'quest-done', text: `Missão concluída: ${q.title}` }];
  }
  return [];
}

function quest(db: ContentDb, id: string): QuestDef {
  const q = db.quests[id];
  if (!q) throw new Error(`missão desconhecida: ${id}`);
  return q;
}

/** Objetivo da missão ativa mais recente, para mostrar na tela. */
export function currentObjective(s: GameState, db: ContentDb): { quest: string; objective: string } | undefined {
  const active = Object.entries(s.quests).filter(([, p]) => !p.done);
  const last = active.at(-1);
  if (!last) return undefined;
  const [id, p] = last;
  const q = quest(db, id);
  const stage = q.stages.find((st) => st.id === p.stage);
  return stage && { quest: q.title, objective: stage.objective };
}

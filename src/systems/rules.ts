import type { GameState } from '../core/GameState';
import type { ChallengeDef, Condition, Effect, ItemDef, QuestDef, RecipeDef, SpellDef } from '../types/content';

export interface ContentDb {
  quests: Record<string, QuestDef>;
  items: Record<string, ItemDef>;
  spells: Record<string, SpellDef>;
  recipes: Record<string, RecipeDef>;
  challenges: Record<string, ChallengeDef>;
}

/** Avisos curtos para a tela ("Você recebeu: Varinha"). */
export type Notice = { kind: 'item' | 'quest-start' | 'quest-update' | 'quest-done' | 'spell' | 'recipe'; text: string };

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
  if ('hasSpell' in cond) return s.spells.includes(cond.hasSpell);
  if ('knowsRecipe' in cond) return s.recipes.includes(cond.knowsRecipe);
  return false;
}

export function apply(effect: Effect, s: GameState, db: ContentDb): Notice[] {
  if ('setFlag' in effect) {
    s.flags[effect.setFlag] = effect.value;
    return [];
  }
  if ('giveItem' in effect) {
    const item = need(db.items, effect.giveItem, 'item');
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
    const q = need(db.quests, effect.startQuest, 'missão');
    if (s.quests[effect.startQuest]) return [];
    s.quests[effect.startQuest] = { stage: q.stages[0].id, done: false };
    return [{ kind: 'quest-start', text: `Nova missão: ${q.title}` }];
  }
  if ('advanceQuest' in effect) {
    const q = need(db.quests, effect.advanceQuest, 'missão');
    if (!q.stages.some((st) => st.id === effect.to)) throw new Error(`etapa desconhecida: ${effect.advanceQuest}/${effect.to}`);
    const p = s.quests[effect.advanceQuest];
    if (!p || p.done || p.stage === effect.to) return [];
    p.stage = effect.to;
    return [{ kind: 'quest-update', text: 'Missão atualizada' }];
  }
  if ('completeQuest' in effect) {
    const q = need(db.quests, effect.completeQuest, 'missão');
    const p = s.quests[effect.completeQuest];
    if (!p || p.done) return [];
    p.done = true;
    return [{ kind: 'quest-done', text: `Missão concluída: ${q.title}` }];
  }
  if ('learnSpell' in effect) {
    const spell = need(db.spells, effect.learnSpell, 'feitiço');
    if (s.spells.includes(effect.learnSpell)) return [];
    s.spells.push(effect.learnSpell);
    s.selectedSpell = effect.learnSpell;
    return [{ kind: 'spell', text: `Novo feitiço: ${spell.name}` }];
  }
  if ('learnRecipe' in effect) {
    const r = need(db.recipes, effect.learnRecipe, 'receita');
    if (s.recipes.includes(effect.learnRecipe)) return [];
    s.recipes.push(effect.learnRecipe);
    return [{ kind: 'recipe', text: `Nova receita: ${need(db.items, r.result, 'item').name}` }];
  }
  return [];
}

function need<T>(table: Record<string, T>, id: string, what: string): T {
  const v = table[id];
  if (!v) throw new Error(`${what} desconhecido(a): ${id}`);
  return v;
}

/** Avança missões cujas etapas têm "completeWhen" já cumprido (pode encadear várias). */
export function tickQuests(s: GameState, db: ContentDb): Notice[] {
  const notices: Notice[] = [];
  for (let guard = 0; guard < 20; guard++) {
    let moved = false;
    for (const [id, p] of Object.entries(s.quests)) {
      if (p.done) continue;
      const stage = db.quests[id]?.stages.find((st) => st.id === p.stage);
      if (!stage?.completeWhen || !check(stage.completeWhen, s)) continue;
      notices.push(...apply(stage.then ? { advanceQuest: id, to: stage.then } : { completeQuest: id }, s, db));
      moved = true;
    }
    if (!moved) break;
  }
  return notices;
}

/** Objetivo da missão ativa mais recente, para mostrar na tela. */
export function currentObjective(s: GameState, db: ContentDb): { quest: string; objective: string } | undefined {
  const active = Object.entries(s.quests).filter(([, p]) => !p.done);
  const last = active.at(-1);
  if (!last) return undefined;
  const [id, p] = last;
  const q = need(db.quests, id, 'missão');
  const stage = q.stages.find((st) => st.id === p.stage);
  return stage && { quest: q.title, objective: stage.objective };
}

/** Troca para o próximo feitiço conhecido. */
export function cycleSpell(s: GameState, delta = 1): string | null {
  if (!s.spells.length) return (s.selectedSpell = null);
  const i = s.selectedSpell ? s.spells.indexOf(s.selectedSpell) : -1;
  s.selectedSpell = s.spells[(i + delta + s.spells.length) % s.spells.length];
  return s.selectedSpell;
}

export function spellAffects(db: ContentDb, spellId: string, targetKind: string): boolean {
  return db.spells[spellId]?.target === targetKind;
}

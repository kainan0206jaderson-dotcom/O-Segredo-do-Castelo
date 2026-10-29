import type { GameState } from '../core/GameState';
import type {
  ChallengeDef, Condition, Effect, HouseDef, ItemDef, ProgressionDef, QuestDef, QuestStageDef, RecipeDef, SpellDef, TutorialDef,
} from '../types/content';
import { addXp, clampVitals, heal, restoreEnergy } from './progression';

export interface ContentDb {
  quests: Record<string, QuestDef>;
  items: Record<string, ItemDef>;
  spells: Record<string, SpellDef>;
  recipes: Record<string, RecipeDef>;
  challenges: Record<string, ChallengeDef>;
  houses: Record<string, HouseDef>;
  progression: ProgressionDef;
  tutorials: Record<string, TutorialDef>;
}

/**
 * Avisos para a tela ("Você recebeu: Varinha"). Os tipos "tutorial" e "act-end"
 * não são texto: pedem à cena que abra o tutorial ou a tela de fim de ato indicada em ref.
 */
export type Notice = {
  kind: 'item' | 'quest-start' | 'quest-update' | 'quest-done' | 'spell' | 'recipe' | 'xp' | 'level' | 'house' | 'equip' | 'vitals' | 'tutorial' | 'act-end';
  text: string;
  ref?: string;
};

export function check(cond: Condition | undefined, s: GameState): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every((c) => check(c, s));
  if ('any' in cond) return cond.any.some((c) => check(c, s));
  if ('not' in cond) return !check(cond.not, s);
  if ('flagAtLeast' in cond) return Number(s.flags[cond.flagAtLeast] ?? 0) >= cond.n;
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
  if ('itemAtLeast' in cond) return (s.inventory[cond.itemAtLeast] ?? 0) >= cond.n;
  if ('hasSpell' in cond) return s.spells.includes(cond.hasSpell);
  if ('knowsRecipe' in cond) return s.recipes.includes(cond.knowsRecipe);
  if ('house' in cond) return s.house === cond.house;
  if ('minLevel' in cond) return s.level >= cond.minLevel;
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
    return [{ kind: 'item', text: `Você recebeu: ${item.name}`, ref: effect.giveItem }];
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
    return [{ kind: 'quest-done', text: `Missão concluída: ${q.title}` }, ...(q.xp ? apply({ giveXp: q.xp }, s, db) : [])];
  }
  if ('learnSpell' in effect) {
    const spell = need(db.spells, effect.learnSpell, 'feitiço');
    if (s.spells.includes(effect.learnSpell)) return [];
    s.spells.push(effect.learnSpell);
    s.selectedSpell = effect.learnSpell;
    return [{ kind: 'spell', text: `Novo feitiço: ${spell.name}`, ref: effect.learnSpell }];
  }
  if ('learnRecipe' in effect) {
    const r = need(db.recipes, effect.learnRecipe, 'receita');
    if (s.recipes.includes(effect.learnRecipe)) return [];
    s.recipes.push(effect.learnRecipe);
    return [{ kind: 'recipe', text: `Nova receita: ${need(db.items, r.result, 'item').name}` }];
  }
  if ('giveXp' in effect) {
    const levels = addXp(s, db, effect.giveXp);
    return [
      { kind: 'xp', text: `+${effect.giveXp} de experiência` },
      ...levels.map((lv) => ({ kind: 'level' as const, text: `Nível ${lv}! Vida e energia aumentaram.` })),
    ];
  }
  if ('setHouse' in effect) {
    const h = need(db.houses, effect.setHouse, 'casa');
    s.house = effect.setHouse;
    return [{ kind: 'house', text: `Casa escolhida: ${h.name}` }];
  }
  if ('equip' in effect) return equip(s, db, effect.equip);
  if ('heal' in effect) {
    heal(s, db, effect.heal);
    return [{ kind: 'vitals', text: `+${effect.heal} de vida` }];
  }
  if ('restoreEnergy' in effect) {
    restoreEnergy(s, db, effect.restoreEnergy);
    return [{ kind: 'vitals', text: `+${effect.restoreEnergy} de energia mágica` }];
  }
  if ('tutorial' in effect) {
    need(db.tutorials, effect.tutorial, 'tutorial');
    return seenTutorial(s, effect.tutorial) ? [] : [{ kind: 'tutorial', text: '', ref: effect.tutorial }];
  }
  if ('endAct' in effect) {
    s.flags[`ato:${effect.endAct}:fim`] = true;
    return [{ kind: 'act-end', text: '', ref: String(effect.endAct) }];
  }
  return [];
}

export function tutorialFlag(id: string): string {
  return `tutorial:${id}`;
}

export function seenTutorial(s: GameState, id: string): boolean {
  return Boolean(s.flags[tutorialFlag(id)]);
}

/** Veste um equipamento que está na bolsa (o anterior volta para a bolsa). */
export function equip(s: GameState, db: ContentDb, id: string): Notice[] {
  const item = need(db.items, id, 'item');
  if (item.kind !== 'equipamento' || !item.slot) throw new Error(`não é equipamento: ${id}`);
  if (s.equipment[item.slot] === id) return [];
  if (!s.inventory[id]) s.inventory[id] = 1; // ganhar e vestir de uma vez
  s.equipment[item.slot] = id;
  clampVitals(s, db);
  return [{ kind: 'equip', text: `Vestindo: ${item.name}` }];
}

export type UseResult = { ok: true; notices: Notice[] } | { ok: false; reason: 'nao-tem' | 'nao-usavel' };

/** Usa um item da bolsa: poções são bebidas (e gastas), equipamentos são vestidos. */
export function useItem(s: GameState, db: ContentDb, id: string): UseResult {
  const item = db.items[id];
  if (!item || !s.inventory[id]) return { ok: false, reason: 'nao-tem' };
  if (item.kind === 'equipamento') return { ok: true, notices: equip(s, db, id) };
  if (!item.use?.length) return { ok: false, reason: 'nao-usavel' };
  apply({ takeItem: id }, s, db);
  const notices = item.use.flatMap((e) => apply(e, s, db));
  return { ok: true, notices };
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

/** Etapa da missão ativa mais recente (a que aparece na tela). */
function currentStage(s: GameState, db: ContentDb): { quest: QuestDef; stage: QuestStageDef } | undefined {
  const active = Object.entries(s.quests).filter(([, p]) => !p.done);
  // a história vem primeiro; missões secundárias aparecem quando não há principal ativa
  const last = active.filter(([id]) => db.quests[id]?.kind !== 'secundaria').at(-1) ?? active.at(-1);
  if (!last) return undefined;
  const [id, p] = last;
  const q = need(db.quests, id, 'missão');
  const stage = q.stages.find((st) => st.id === p.stage);
  return stage && { quest: q, stage };
}

/** Objetivo da missão ativa mais recente, para mostrar na tela. */
export function currentObjective(s: GameState, db: ContentDb): { quest: string; objective: string } | undefined {
  const cur = currentStage(s, db);
  return cur && { quest: cur.quest.title, objective: cur.stage.objective };
}

/** Modo Kids: o lugar (mapa + objeto) para onde a trilha de estrelinhas aponta agora. */
export function guideTarget(s: GameState, db: ContentDb): { map: string; alvo: string } | undefined {
  const guia = currentStage(s, db)?.stage.guia;
  const hit = guia?.find((g) => check(g.when, s));
  return hit && { map: hit.map, alvo: hit.alvo };
}

/** Modo Kids: a receita que a missão atual pede (quando a etapa termina ao ter o prato na bolsa). */
export function wantedRecipe(s: GameState, db: ContentDb): string | undefined {
  const done = currentStage(s, db)?.stage.completeWhen;
  const item = done && 'hasItem' in done ? done.hasItem : undefined;
  return item && Object.keys(db.recipes).find((id) => db.recipes[id].result === item);
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

/** Despensa da cozinha: dá 1 de cada ingrediente que ainda não está na bolsa (evita travar por falta de ingrediente). */
export function takeFromPantry(s: GameState, db: ContentDb, gives: string[]): Notice[] {
  return gives.filter((id) => !s.inventory[id]).flatMap((id) => apply({ giveItem: id }, s, db));
}

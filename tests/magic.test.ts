import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/GameState';
import { brew, findRecipe } from '../src/systems/brewing';
import { ChallengeRunner } from '../src/systems/ChallengeRunner';
import { apply, currentObjective, cycleSpell, spellAffects, tickQuests } from '../src/systems/rules';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import type { AssetManifest } from '../src/core/AssetRegistry';
import { db, dialogues } from './content-load';
import { prop } from '../src/core/tiled';

function talk(id: string, s: ReturnType<typeof newGame>) {
  const run = new DialogueRunner(dialogues[id], s, db);
  for (let i = 0; !run.finished && i < 50; i++) {
    if (run.view()!.choices.length) run.choose(0);
    else run.next();
  }
  return run.notices.map((n) => n.text);
}

describe('missão Luz na Cozinha', () => {
  it('vai do início ao fim com poção, feitiço e velas', () => {
    const s = newGame('map.cozinha', 'do-salao');
    apply({ startQuest: 'luz-na-cozinha' }, s, db);

    talk('dona-brasa', s);
    expect(s.recipes).toContain('drink-fumegante');
    expect(s.quests['luz-na-cozinha'].stage).toBe('preparar-drink');

    apply({ giveItem: 'suco-colorido' }, s, db);
    expect(brew(s, db, ['suco-colorido', 'gelo-seco'])).toEqual({ ok: false, reason: 'sem-ingrediente' });
    apply({ giveItem: 'gelo-seco' }, s, db);
    const r = brew(s, db, ['gelo-seco', 'suco-colorido']);
    expect(r).toMatchObject({ ok: true, item: 'drink-fumegante', discovered: false });
    expect(s.inventory['suco-colorido']).toBeUndefined();
    tickQuests(s, db);
    expect(s.quests['luz-na-cozinha'].stage).toBe('entregar-drink');

    const n = talk('dona-brasa', s);
    expect(n).toContain('Novo feitiço: Lumen');
    expect(s.selectedSpell).toBe('lumen');
    expect(s.inventory['drink-fumegante']).toBeUndefined();

    s.flags['vela:map.cozinha:vela-a'] = true;
    expect(tickQuests(s, db)).toEqual([]);
    s.flags['vela:map.cozinha:vela-b'] = true;
    tickQuests(s, db);
    expect(currentObjective(s, db)?.objective).toMatch(/Dona Brasa/);

    talk('dona-brasa', s);
    expect(s.quests['luz-na-cozinha'].done).toBe(true);
    expect(s.recipes).toContain('sobremesa-mandragora');
  });
});

describe('caldeirão', () => {
  it('descobre receita desconhecida e não gasta nada quando não combina', () => {
    const s = newGame('m', 's');
    apply({ giveItem: 'abobora' }, s, db);
    apply({ giveItem: 'cacau' }, s, db);
    expect(brew(s, db, ['abobora', 'cacau'])).toEqual({ ok: false, reason: 'nao-combina' });
    expect(s.inventory).toEqual({ abobora: 1, cacau: 1 });
    apply({ giveItem: 'gelo-seco' }, s, db);
    expect(brew(s, db, ['abobora', 'gelo-seco'])).toMatchObject({ ok: true, item: 'cerveja-abobora', discovered: true });
    expect(s.recipes).toContain('cerveja-abobora');
  });

  it('ordem dos ingredientes não importa, quantidade importa', () => {
    expect(findRecipe(db, ['gelo-seco', 'suco-colorido'])).toBe('drink-fumegante');
    expect(findRecipe(db, ['suco-colorido', 'suco-colorido', 'gelo-seco'])).toBeUndefined();
  });
});

describe('feitiços', () => {
  it('troca entre os feitiços aprendidos', () => {
    const s = newGame('m', 's');
    expect(cycleSpell(s)).toBeNull();
    apply({ learnSpell: 'lumen' }, s, db);
    apply({ learnSpell: 'fogos-bruxos' }, s, db);
    expect(s.selectedSpell).toBe('fogos-bruxos');
    expect(cycleSpell(s)).toBe('lumen');
    expect(cycleSpell(s)).toBe('fogos-bruxos');
    expect(spellAffects(db, 'lumen', 'vela')).toBe(true);
    expect(spellAffects(db, 'fogos-bruxos', 'vela')).toBe(false);
  });

  it('feitiços extras só vêm de desafios', () => {
    const extras = Object.entries(db.spells).filter(([, sp]) => sp.kind === 'extra').map(([id]) => id);
    const fromChallenges = Object.values(db.challenges).flatMap((c) => c.reward).flatMap((e) => ('learnSpell' in e ? [e.learnSpell] : []));
    expect(extras.length).toBeGreaterThan(0);
    for (const id of extras) expect(fromChallenges).toContain(id);
  });
});

describe('desafio Velas do Grande Salão', () => {
  const def = db.challenges['velas-do-salao'];

  it('vence acendendo as 6 velas a tempo e ensina Fogos Bruxos uma vez', () => {
    const s = newGame('m', 's');
    const run = new ChallengeRunner('velas-do-salao', def);
    for (const t of def.targets.slice(0, 5)) run.hitTarget(t, s, db);
    run.update(10_000);
    expect(run.status).toBe('running');
    run.hitTarget(def.targets[0], s, db);
    expect(run.progress.done).toBe(5);
    run.hitTarget(def.targets[5], s, db);
    expect(run.status).toBe('won');
    expect(s.spells).toContain('fogos-bruxos');
    expect(s.challenges['velas-do-salao']).toEqual({ done: true, bestMs: 10_000 });

    const again = new ChallengeRunner('velas-do-salao', def);
    for (const t of def.targets) again.hitTarget(t, s, db);
    expect(again.notices).toEqual([]);
  });

  it('perde quando o tempo acaba', () => {
    const run = new ChallengeRunner('velas-do-salao', def);
    run.update(def.timeLimitMs);
    expect(run.status).toBe('lost');
    expect(run.remainingMs).toBe(0);
  });

  it('os alvos existem no mapa do desafio e os efeitos visuais no manifesto', () => {
    const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;
    for (const [id, c] of Object.entries(db.challenges)) {
      const map = JSON.parse(readFileSync(`public/assets/${manifest.maps[c.map].url}`, 'utf8'));
      const objs = map.layers.find((l: { name: string }) => l.name === 'objetos').objects as { name: string; type: string; properties: unknown }[];
      for (const t of c.targets) {
        // espectral: o alvo é um grupo de criaturas (uma leva)
        const found = c.kind === 'espectral'
          ? objs.some((o) => o.type === 'creature' && prop(o.properties, 'group') === t && prop(o.properties, 'challenge') === id)
          : objs.some((o) => o.name === t && o.type === (c.kind === 'levitar' ? 'socket' : 'target'));
        expect(found, `${id}: ${t}`).toBe(true);
      }
      expect(objs.some((o) => o.type === 'challenge' && prop(o.properties, 'challenge') === id), `${id}: quadro`).toBe(true);
    }
    for (const sp of Object.values(db.spells)) expect(manifest.spritesheets[sp.fx], sp.fx).toBeDefined();
    for (const [id, item] of Object.entries(db.items)) expect(manifest.spritesheets['ui.icones'].frameNames?.[id], `ícone de ${item.name}`).toBeDefined();
  });

  it('receitas usam itens que existem', () => {
    for (const r of Object.values(db.recipes)) {
      expect(db.items[r.result]).toBeDefined();
      for (const i of Object.keys(r.ingredients)) expect(db.items[i]?.kind, i).toBe('ingrediente');
    }
  });
});

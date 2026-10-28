import { describe, expect, it } from 'vitest';
import { db, dialogues } from '../src/content';
import { newGame } from '../src/core/GameState';
import { apply, check } from '../src/systems/rules';
import { openChest, type LootTable } from '../src/systems/loot';
import { stats } from '../src/systems/progression';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import baus from '../content/baus.json';
import fs from 'node:fs';

const table = baus as LootTable;
const seq = (...v: number[]) => () => v.shift() ?? 0.5;

describe('etapa 6: porão secreto, Mapa dos Segredos e Estrelas Perdidas', () => {
  it('baú dá itens que existem, esvazia e enche de novo com o tempo', () => {
    const s = newGame('map.porao', '');
    const r = openChest(s, table, 'bau:x', seq(0.9, 0.1, 0.1));
    expect(r.kind).toBe('itens');
    if (r.kind === 'itens') for (const id of r.items) expect(db.items[id], id).toBeDefined();
    expect(openChest(s, table, 'bau:x').kind).toBe('vazio');
    s.playTimeMs += table.recargaMs;
    expect(openChest(s, table, 'bau:x', seq(0.9, 0.9, 0.9)).kind).toBe('itens');
  });

  it('às vezes o baú é um susto', () => {
    const s = newGame('map.porao', '');
    expect(openChest(s, table, 'bau:y', seq(0.01)).kind).toBe('susto');
  });

  it('itens de baú existem no catálogo', () => {
    for (const i of table.itens) expect(db.items[i.item], i.item).toBeDefined();
  });

  it('pegar a primeira estrela começa a missão; 12 estrelas no castelo (11 no chão + 1 do desafio)', () => {
    const s = newGame('map.recepcao', '');
    for (const e of db.items['estrela-perdida'].onPickup ?? []) apply(e, s, db);
    expect(s.quests['estrelas-perdidas']).toBeDefined();
    let onFloor = 0;
    for (const f of fs.readdirSync('public/assets/maps')) {
      const m = JSON.parse(fs.readFileSync(`public/assets/maps/${f}`, 'utf8'));
      for (const l of m.layers) for (const o of l.objects ?? []) {
        if (o.type === 'pickup' && o.properties.some((p: { name: string; value: unknown }) => p.name === 'item' && p.value === 'estrela-perdida')) onFloor++;
      }
    }
    expect(onFloor).toBe(11);
    expect(db.challenges['sombras-do-porao'].reward).toContainEqual({ giveItem: 'estrela-perdida' });
  });

  it('Wish Wish dá presentes com 6 e com 12 estrelas; o amuleto soma poder e energia', () => {
    const s = newGame('map.observatorio', '');
    s.quests['estrelas-perdidas'] = { stage: 'juntar', done: false };
    s.inventory['estrela-perdida'] = 6;
    let d = new DialogueRunner(dialogues['wish-wish'], s, db);
    while (!d.finished) d.next();
    expect(s.inventory['elixir-estelar']).toBe(2);
    s.inventory['estrela-perdida'] = 12;
    d = new DialogueRunner(dialogues['wish-wish'], s, db);
    while (!d.finished) d.next();
    expect(s.inventory['amuleto-estelar']).toBe(1);
    expect(check({ flag: 'estrelas:12' }, s)).toBe(true);
    const before = stats(s, db);
    apply({ giveItem: 'amuleto-estelar' }, s, db);
    s.equipment.amuleto = 'amuleto-estelar';
    expect(stats(s, db).poder).toBe(before.poder + 1);
    expect(stats(s, db).energiaMax).toBe(before.energiaMax + 2);
  });

  it('a chave do porão começa a missão do porão, que termina ao visitar', () => {
    const s = newGame('map.gabinete', '');
    for (const e of db.items['chave-do-porao'].onPickup ?? []) apply(e, s, db);
    expect(s.quests['porao-secreto']?.stage).toBe('achar-alcapao');
    expect(check(db.quests['porao-secreto'].stages[0].completeWhen, { ...s, flags: { 'visitou:map.porao': true } })).toBe(true);
  });
});

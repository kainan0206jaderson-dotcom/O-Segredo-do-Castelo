import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { newGame, type GameState } from '../src/core/GameState';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { apply, check, currentObjective, tickQuests, useItem } from '../src/systems/rules';
import { addXp, hurt, spendEnergy, stats } from '../src/systems/progression';
import { brew } from '../src/systems/brewing';
import type { AssetManifest } from '../src/core/AssetRegistry';
import { db, dialogues } from './content-load';

const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;

function talk(id: string, s: GameState, pick = 0): string[] {
  const run = new DialogueRunner(dialogues[id], s, db);
  for (let guard = 0; !run.finished && guard < 60; guard++) {
    const v = run.view()!;
    if (v.choices.length) run.choose(Math.min(pick, v.choices.length - 1));
    else run.next();
  }
  expect(run.finished, id).toBe(true);
  tickQuests(s, db);
  return run.notices.map((n) => n.kind + ':' + (n.ref ?? n.text));
}

/** Liga as flags que as salas ligam (velas, sombrinhas, estátuas, pedestais) e avança as missões. */
function world(s: GameState, ...flags: string[]): void {
  for (const f of flags) s.flags[f] = true;
  tickQuests(s, db);
}

const stage = (s: GameState, q: string) => (s.quests[q]?.done ? 'fim' : s.quests[q]?.stage);

describe('ficha do aprendiz', () => {
  it('sobe de nível com experiência e enche vida e energia', () => {
    const s = newGame('m', 's');
    expect(stats(s, db)).toMatchObject({ level: 1, vidaMax: s.vida, energiaMax: s.energia, poder: 1 });
    s.vida = 1;
    expect(addXp(s, db, 59)).toEqual([]);
    expect(addXp(s, db, 100)).toEqual([2, 3]);
    expect(s.level).toBe(3);
    expect(s.vida).toBe(stats(s, db).vidaMax);
    expect(stats(s, db).poder).toBe(2);
    addXp(s, db, 99999);
    expect(s.level).toBe(db.progression.levels.length);
    expect(stats(s, db).nextXp).toBeUndefined();
  });

  it('energia é gasta pelos feitiços e vida acaba em desmaio', () => {
    const s = newGame('m', 's');
    expect(spendEnergy(s, s.energia + 1)).toBe(false);
    expect(spendEnergy(s, 2)).toBe(true);
    expect(hurt(s, 1)).toBe(false);
    expect(hurt(s, 99)).toBe(true);
    expect(s.vida).toBe(0);
  });

  it('capas mudam os atributos e poções são gastas ao usar', () => {
    const s = newGame('m', 's');
    const base = stats(s, db);
    apply({ equip: 'capa-coragem' }, s, db);
    expect(stats(s, db).vidaMax).toBe(base.vidaMax + 1);
    apply({ giveItem: 'capa-astucia' }, s, db);
    expect(useItem(s, db, 'capa-astucia').ok).toBe(true);
    expect(s.equipment.capa).toBe('capa-astucia');
    expect(stats(s, db).vidaMax).toBe(base.vidaMax);
    expect(stats(s, db).velocidade).toBeGreaterThan(1);

    s.vida = 1;
    apply({ giveItem: 'sobremesa-mandragora' }, s, db);
    expect(useItem(s, db, 'sobremesa-mandragora').ok).toBe(true);
    expect(s.vida).toBe(4);
    expect(s.inventory['sobremesa-mandragora']).toBeUndefined();
    apply({ giveItem: 'drink-fumegante' }, s, db);
    expect(useItem(s, db, 'drink-fumegante')).toEqual({ ok: false, reason: 'nao-usavel' });
    expect(useItem(s, db, 'cacau')).toEqual({ ok: false, reason: 'nao-tem' });
  });
});

describe('Ato 1 do começo ao fim', () => {
  it('tem começo, meio e fim de ato, sem travar', () => {
    const s = newGame('map.recepcao', 'inicio');
    talk('trinco', s);
    talk('dom-moldura', s);
    talk('trinco', s);
    talk('dona-brasa', s);
    apply({ giveItem: 'suco-colorido' }, s, db);
    apply({ giveItem: 'gelo-seco' }, s, db);
    expect(brew(s, db, ['suco-colorido', 'gelo-seco']).ok).toBe(true);
    tickQuests(s, db);
    talk('dona-brasa', s);
    expect(s.spells).toContain('lumen');
    world(s, 'vela:map.cozinha:vela-a', 'vela:map.cozinha:vela-b');
    talk('dona-brasa', s);
    expect(stage(s, 'luz-na-cozinha')).toBe('fim');
    expect(stage(s, 'o-diretor')).toBe('ir-ao-corredor');

    // corredor: Morgana aparece, sombrinhas, estátuas
    const cena = talk('corredor-morgana', s);
    expect(cena).toContain('tutorial:sombras');
    expect(stage(s, 'o-diretor')).toBe('espantar-sombras');
    world(s, 'criaturas:map.corredor:sombras');
    expect(stage(s, 'o-diretor')).toBe('abrir-grade');
    world(s, 'placas:map.corredor:grade');
    expect(stage(s, 'o-diretor')).toBe('falar-com-diretor');

    // o diretor em pessoa: casa, capa e Levitar
    const n = talk('arquimedes', s, 1);
    expect(s.house).toBe('inteligencia');
    expect(s.equipment.capa).toBe('capa-inteligencia');
    expect(s.spells).toContain('levitar');
    expect(n).toContain('tutorial:levitar');
    expect(stage(s, 'o-diretor')).toBe('ir-ao-hall');

    // hall: o diretor some, começa o selo
    talk('hall-morgana', s);
    expect(s.flags['arquimedes:sumiu']).toBe(true);
    expect(stage(s, 'o-diretor')).toBe('fim');
    expect(stage(s, 'o-selo')).toBe('reunir-pedras');

    // as quatro pedras
    talk('dom-moldura', s, 1);
    expect(s.inventory['pedra-inteligencia']).toBe(1);
    apply({ giveItem: 'pedra-coragem' }, s, db); // pega no hall, depois das sombrinhas
    apply({ giveItem: 'pedra-astucia' }, s, db); // atrás dos caixotes levitáveis
    talk('trinco', s);
    expect(stage(s, 'chaves-do-trinco')).toBe('perguntar-a-brasa');
    talk('dona-brasa', s);
    expect(stage(s, 'chaves-do-trinco')).toBe('fazer-cerveja');
    apply({ giveItem: 'abobora' }, s, db);
    apply({ giveItem: 'gelo-seco' }, s, db);
    expect(brew(s, db, ['abobora', 'gelo-seco']).ok).toBe(true);
    tickQuests(s, db);
    talk('dona-brasa', s);
    expect(s.inventory['chaves-trinco']).toBe(1);
    talk('trinco', s);
    expect(s.inventory['pedra-lealdade']).toBe(1);
    expect(stage(s, 'chaves-do-trinco')).toBe('fim');
    expect(stage(s, 'o-selo')).toBe('colocar-pedras');

    // pedestais e fim do ato
    for (const h of ['coragem', 'inteligencia', 'astucia', 'lealdade']) {
      apply({ takeItem: `pedra-${h}` }, s, db);
      s.flags[`encaixe:map.hall:pedestal-${h}`] = true;
    }
    tickQuests(s, db);
    expect(stage(s, 'o-selo')).toBe('colocar-pedras');
    const fim = talk('selo-quebrado', s);
    expect(fim).toContain('act-end:1');
    expect(stage(s, 'o-selo')).toBe('fim');
    expect(s.flags['ato:1:fim']).toBe(true);
    expect(currentObjective(s, db)).toBeUndefined();
    expect(s.level).toBeGreaterThanOrEqual(3);

    // jogo livre: os personagens comentam o fim do ato
    expect(talk('fuxico', s)).toEqual([]);
    expect(check({ flag: 'ato:1:fim' }, s)).toBe(true);
  });

  it('missão secundária da Dama do Chá dá a Capa Estrelada', () => {
    const s = newGame('m', 's');
    talk('dama-cha', s, 0);
    expect(stage(s, 'cha-da-dama')).toBe('fazer-sobremesa');
    apply({ giveItem: 'folha-mandragora' }, s, db);
    apply({ giveItem: 'cacau' }, s, db);
    brew(s, db, ['folha-mandragora', 'cacau']);
    tickQuests(s, db);
    talk('dama-cha', s);
    expect(s.inventory['capa-estrelada']).toBe(1);
    expect(stage(s, 'cha-da-dama')).toBe('fim');
  });
});

describe('conteúdo do Ato 1', () => {
  it('casas dão capas que existem e cada capa tem roupa no manifesto (amuletos não mudam a roupa)', () => {
    for (const h of Object.values(db.houses)) expect(db.items[h.capa]?.slot).toBe('capa');
    for (const [id, it] of Object.entries(db.items).filter(([, i]) => i.slot === 'capa')) {
      expect(manifest.spritesheets[it.sheet!], id).toBeDefined();
    }
  });

  it('todo item, feitiço e tutorial com ícone tem quadro no manifesto', () => {
    const names = manifest.spritesheets['ui.icones'].frameNames!;
    for (const id of [...Object.keys(db.items), ...Object.keys(db.spells)]) expect(names[id], id).toBeDefined();
    for (const t of Object.values(db.tutorials)) for (const p of t.pages) if (p.icon) expect(names[p.icon], p.icon).toBeDefined();
  });

  it('o nível 1 combina com a vida e energia iniciais', () => {
    const s = newGame('m', 's');
    expect(db.progression.levels[0]).toMatchObject({ xp: 0, vida: s.vida, energia: s.energia });
  });

  it('todo feitiço tem custo', () => {
    for (const [id, sp] of Object.entries(db.spells)) expect(sp.cost, id).toBeGreaterThan(0);
  });
});

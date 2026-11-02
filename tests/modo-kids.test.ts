import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/GameState';
import { apply, check, currentObjective, guideTarget, tickQuests } from '../src/systems/rules';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { nextGuidePoint, type MapObject } from '../src/systems/guia';
import type { AssetManifest } from '../src/core/AssetRegistry';
import { db, dialogues } from './content-load';

const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;
const objects: Record<string, MapObject[]> = Object.fromEntries(
  Object.entries(manifest.maps).map(([key, def]) => {
    const m = JSON.parse(readFileSync(`public/assets/${def.url}`, 'utf8')) as { layers: { name: string; objects?: MapObject[] }[] };
    return [key, m.layers.find((l) => l.name === 'objetos')?.objects ?? []];
  }),
);
/** Castelo com todas as portas abertas (sem as condições), para checar que todo alvo tem caminho. */
const semTrancas = (map: string) =>
  objects[map]?.map((o) => ({ ...o, properties: o.properties?.filter((p) => p.name !== 'when') }));

describe('Modo Kids: trilha de estrelinhas', () => {
  const alvos = Object.entries(db.quests).flatMap(([q, def]) =>
    def.stages.flatMap((st) => (st.guia ?? []).map((g) => ({ where: `${q}/${st.id}`, ...g }))));

  it('toda etapa principal tem para onde apontar (menos o duelo)', () => {
    for (const [q, def] of Object.entries(db.quests)) {
      if (def.kind === 'secundaria') continue;
      for (const st of def.stages) if (st.id !== 'enfrentar-morgana') expect(st.guia?.length, `${q}/${st.id}`).toBeGreaterThan(0);
    }
  });

  it.each(alvos.map((a) => [a.where, a.map, a.alvo]))('%s: %s#%s existe e tem caminho desde o Grande Salão', (_w, map, alvo) => {
    expect(objects[map]?.some((o) => o.name === alvo), `${map}#${alvo}`).toBe(true);
    const s = newGame('map.grande-salao', 'inicio');
    expect(nextGuidePoint('map.grande-salao', { map, alvo }, s, semTrancas)).toBeDefined();
  });

  it('na Luz na Cozinha, aponta despensa, caldeirão, Dona Brasa e velas na ordem certa', () => {
    const s = newGame('map.grande-salao', 'inicio');
    apply({ startQuest: 'luz-na-cozinha' }, s, db);
    apply({ advanceQuest: 'luz-na-cozinha', to: 'preparar-drink' }, s, db);
    expect(guideTarget(s, db)).toEqual({ map: 'map.cozinha', alvo: 'despensa' });
    apply({ giveItem: 'suco-colorido' }, s, db);
    apply({ giveItem: 'gelo-seco' }, s, db);
    expect(guideTarget(s, db)?.alvo).toBe('caldeirao');
    apply({ giveItem: 'drink-fumegante' }, s, db);
    tickQuests(s, db);
    expect(guideTarget(s, db)?.alvo).toBe('dona-brasa');
    apply({ advanceQuest: 'luz-na-cozinha', to: 'acender-velas' }, s, db);
    expect(guideTarget(s, db)?.alvo).toBe('vela-a');
    s.flags['vela:map.cozinha:vela-a'] = true;
    expect(guideTarget(s, db)?.alvo).toBe('vela-b');
  });

  it('fora da sala do alvo, aponta a porta certa', () => {
    const s = newGame('map.grande-salao', 'inicio');
    const p = nextGuidePoint('map.grande-salao', { map: 'map.cozinha', alvo: 'dona-brasa' }, s, (m) => objects[m]);
    const leste = objects['map.grande-salao'].find((o) => o.name === 'porta-da-cozinha')!;
    expect(p?.door).toBe(true);
    expect(p?.x).toBeCloseTo(leste.x + (leste.width ?? 0) / 2);
  });
});

describe('Modo Kids: história resumida e menos desafios', () => {
  const kids = () => { const s = newGame('map.grande-salao', 'inicio'); s.modo = 'kids'; return s; };
  function talk(id: string, s: ReturnType<typeof newGame>): string[] {
    const run = new DialogueRunner(dialogues[id], s, db);
    const textos: string[] = [];
    for (let guard = 0; !run.finished && guard < 80; guard++) {
      const v = run.view()!;
      textos.push(v.text);
      if (v.choices.length) run.choose(0); else run.next();
    }
    tickQuests(s, db);
    return textos;
  }

  it('o Trinco dá a Pedra da Lealdade sem a missão das chaves', () => {
    const s = kids();
    apply({ startQuest: 'o-selo' }, s, db);
    talk('trinco', s);
    expect(s.inventory['pedra-lealdade']).toBe(1);
    expect(s.quests['chaves-do-trinco']).toBeUndefined();
    talk('trinco', s);
    expect(s.inventory['pedra-lealdade']).toBe(1);
    expect(s.quests['chaves-do-trinco']).toBeUndefined();
  });

  it('no Normal, o Trinco continua pedindo as chaves', () => {
    const s = newGame('map.grande-salao', 'inicio');
    apply({ startQuest: 'o-selo' }, s, db);
    talk('trinco', s);
    expect(s.quests['chaves-do-trinco']?.done).toBe(false);
    expect(s.inventory['pedra-lealdade']).toBeUndefined();
  });

  it('o Bonfatti fala menos no Kids, mas ensina tudo', () => {
    const normal = newGame('map.grande-salao', 'inicio');
    const s = kids();
    for (const st of [normal, s]) { apply({ startQuest: 'o-diretor' }, st, db); apply({ advanceQuest: 'o-diretor', to: 'falar-com-diretor' }, st, db); }
    const curto = talk('arquimedes', s).length;
    expect(curto).toBeLessThan(talk('arquimedes', normal).length);
    expect(s.spells).toEqual(normal.spells);
    expect(s.house).toBeTruthy();
    expect(s.quests['o-diretor'].stage).toBe('ir-ao-hall');
  });

  it('Ato 2 sem a aula de Seres Espectrais, sem livros fujões e sem o enigma das estrelas', () => {
    const s = kids();
    apply({ startQuest: 'cartas-de-amelia' }, s, db);
    talk('aristoteles', s);
    expect(s.spells).toContain('revelar');
    expect(s.quests['cartas-de-amelia'].stage).toBe('achar-cartas');
    expect(s.quests['livros-fujoes']).toBeUndefined();
    // a carta da sala da aula aparece mesmo sem vencer a aula
    const carta3 = objects['map.sala-espectral'].find((o) => o.name === 'carta-3')!;
    const when = JSON.parse(String(carta3.properties!.find((p) => p.name === 'when')!.value));
    expect(check(when, s)).toBe(true);
    expect(check(when, newGame('map.grande-salao', 'inicio'))).toBe(false);
    for (const c of [1, 2, 3]) apply({ giveItem: `carta-amelia-${c}` }, s, db);
    tickQuests(s, db);
    talk('espelho', s);
    expect(s.spells).toContain('escudo');
    expect(s.flags['signos:map.observatorio:estrelas']).toBe(true);
    expect(s.quests['cartas-de-amelia'].stage).toBe('olhar-telescopio');
    talk('telescopio', s);
    expect(s.spells).toContain('abrir');
  });

  it('bastam os emblemas da Coragem e da Lealdade para chegar ao Coração', () => {
    const s = kids();
    apply({ startQuest: 'as-virtudes' }, s, db);
    apply({ giveItem: 'emblema-coragem' }, s, db);
    apply({ giveItem: 'emblema-lealdade' }, s, db);
    tickQuests(s, db);
    expect(s.quests['as-virtudes'].stage).toBe('ir-ao-coracao');
    const porta = objects['map.galeria'].find((o) => o.name === 'porta-do-coracao')!;
    const when = JSON.parse(String(porta.properties!.find((p) => p.name === 'when')!.value));
    expect(check(when, s)).toBe(true);
    s.modo = 'normal';
    expect(check(when, s)).toBe(false);
  });

  it('objetivo e falas resumidas aparecem só no Kids', () => {
    const s = kids();
    apply({ startQuest: 'as-virtudes' }, s, db);
    expect(currentObjective(s, db)?.objective).toMatch(/Coragem e da Lealdade/);
    s.modo = 'normal';
    expect(currentObjective(s, db)?.objective).toMatch(/quatro quadros/);
  });
});

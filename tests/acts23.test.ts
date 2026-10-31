import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { newGame, type GameState } from '../src/core/GameState';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { apply, check, currentObjective, tickQuests } from '../src/systems/rules';
import { brew } from '../src/systems/brewing';
import { tracePath, reflect } from '../src/world/Beam';
import type { AssetManifest } from '../src/core/AssetRegistry';
import { db, dialogues } from './content-load';

const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;

interface Obj { name: string; type: string; x: number; y: number; properties?: { name: string; value: unknown }[] }
const prop = (o: Obj, k: string) => o.properties?.find((p) => p.name === k)?.value as string | number | boolean | undefined;
function mapOf(key: string) {
  return JSON.parse(readFileSync(`public/assets/${manifest.maps[key].url}`, 'utf8')) as {
    width: number; height: number; layers: { name: string; data?: number[]; objects?: Obj[] }[];
  };
}
const objectsOf = (key: string) => mapOf(key).layers.find((l) => l.name === 'objetos')!.objects!;

function talk(id: string, s: GameState, picks: number[] = []): string[] {
  const run = new DialogueRunner(dialogues[id], s, db);
  for (let guard = 0; !run.finished && guard < 80; guard++) {
    const v = run.view()!;
    if (v.choices.length) run.choose(Math.min(picks.shift() ?? 0, v.choices.length - 1));
    else run.next();
  }
  expect(run.finished, id).toBe(true);
  tickQuests(s, db);
  return run.notices.map((n) => n.kind + ':' + (n.ref ?? n.text));
}
function world(s: GameState, ...flags: string[]): void {
  for (const f of flags) s.flags[f] = true;
  tickQuests(s, db);
}
const stage = (s: GameState, q: string) => (s.quests[q]?.done ? 'fim' : s.quests[q]?.stage);

describe('raio de luz', () => {
  it('espelhos viram o raio para o lado certo', () => {
    expect(reflect(1, 0, '/')).toEqual([-0, -1]);
    expect(reflect(1, 0, '\\')).toEqual([0, 1]);
    expect(reflect(0, 1, '\\')).toEqual([1, 0]);
  });

  it('o enigma do Quadro da Inteligência tem solução, e sem espelhos o raio bate no bloco', () => {
    const m = mapOf('map.quadro-inteligencia');
    const walls = m.layers.find((l) => l.name === 'paredes')!.data!;
    const objs = objectsOf('map.quadro-inteligencia');
    const tileOf = (o: Obj) => [Math.floor(o.x / 16), Math.floor((o.y - 1) / 16)] as const;
    const src = objs.find((o) => o.type === 'beam-source')!;
    const [sx, sy] = tileOf(src);
    const [cx, cy] = tileOf(objs.find((o) => o.type === 'beam-target')!);
    const stands = objs.filter((o) => o.type === 'socket' && prop(o, 'turn'));
    const blocked = (x: number, y: number) => x < 0 || y < 0 || x >= m.width || y >= m.height || walls[y * m.width + x] !== 0;
    const source = { tx: sx, ty: sy, dx: Number(prop(src, 'dx')), dy: Number(prop(src, 'dy')) };
    const withMirrors = (names: string[]) => (x: number, y: number) =>
      stands.find((o) => names.includes(o.name) && tileOf(o)[0] === x && tileOf(o)[1] === y)
        ? (prop(stands.find((o) => tileOf(o)[0] === x && tileOf(o)[1] === y)!, 'turn') as '/' | '\\') : undefined;

    expect(tracePath(source, { tx: cx, ty: cy }, blocked, () => undefined).hit).toBe(false);
    expect(tracePath(source, { tx: cx, ty: cy }, blocked, withMirrors(['suporte-a', 'suporte-b', 'suporte-c'])).hit).toBe(true);
    // há só três espelhos, e os suportes falsos não levam ao cristal
    expect(objs.filter((o) => o.type === 'levitavel' && prop(o, 'kind') === 'espelho')).toHaveLength(3);
    expect(tracePath(source, { tx: cx, ty: cy }, blocked, withMirrors(['suporte-a', 'suporte-d', 'suporte-e'])).hit).toBe(false);
  });
});

describe('Atos 2 e 3 do começo ao fim', () => {
  it('da Biblioteca aos créditos, sem travar', () => {
    const s = newGame('map.hall', 'da-biblioteca');
    s.flags['ato:1:fim'] = true;
    s.spells.push('lumen', 'levitar');

    // Ato 2: biblioteca e aula
    talk('biblioteca-chegada', s);
    expect(stage(s, 'cartas-de-amelia')).toBe('falar-com-aristoteles');
    const aula = talk('aristoteles', s);
    expect(s.spells).toContain('revelar');
    expect(aula).toContain('tutorial:revelar');
    expect(stage(s, 'cartas-de-amelia')).toBe('aula-espectral');
    expect(stage(s, 'livros-fujoes')).toBe('guardar-livros');
    expect(check(db.challenges['aula-espectral'].requires, s)).toBe(true);
    talk('espelho', s);
    expect(s.flags['amelia:livre']).toBeUndefined();
    for (const e of db.challenges['aula-espectral'].reward) apply(e, s, db);
    tickQuests(s, db);
    expect(stage(s, 'cartas-de-amelia')).toBe('achar-cartas');

    // cartas escondidas
    for (const i of [1, 2, 3]) apply({ giveItem: `carta-amelia-${i}` }, s, db);
    tickQuests(s, db);
    expect(stage(s, 'cartas-de-amelia')).toBe('libertar-amelia');
    const livre = talk('espelho', s);
    expect(s.flags['amelia:livre']).toBe(true);
    expect(s.spells).toContain('escudo');
    expect(livre).toContain('tutorial:escudo');
    expect(stage(s, 'cartas-de-amelia')).toBe('alinhar-estrelas');

    // observatório
    talk('telescopio', s);
    expect(s.spells).not.toContain('abrir');
    world(s, 'signos:map.observatorio:estrelas');
    expect(stage(s, 'cartas-de-amelia')).toBe('olhar-telescopio');
    talk('telescopio', s);
    expect(s.spells).toContain('abrir');
    expect(stage(s, 'cartas-de-amelia')).toBe('abrir-galeria');
    world(s, 'trancado:map.biblioteca:porta-galeria');
    expect(stage(s, 'cartas-de-amelia')).toBe('entrar-galeria');
    const fim2 = talk('galeria-morgana', s);
    expect(fim2).toContain('act-end:2');
    expect(stage(s, 'cartas-de-amelia')).toBe('fim');
    expect(stage(s, 'as-virtudes')).toBe('juntar-emblemas');

    // Ato 3: os quatro quadros
    for (const v of ['coragem', 'inteligencia', 'astucia']) apply({ giveItem: `emblema-${v}` }, s, db);
    talk('amelia-presa', s);
    expect(s.flags['amelia:resgatada']).toBeUndefined();
    world(s, 'criaturas:map.quadro-lealdade:correntes');
    talk('amelia-presa', s);
    expect(s.flags['amelia:resgatada']).toBe(true);
    tickQuests(s, db);
    expect(stage(s, 'as-virtudes')).toBe('ir-ao-coracao');

    // duelo: as falas pedem as fases, e os argumentos errados voltam à pergunta
    talk('coracao', s);
    expect(s.flags['jogo:fim']).toBeUndefined();
    talk('morgana-duelo', s);
    expect(s.flags['boss:iniciar']).toBe('fase1');
    expect(stage(s, 'as-virtudes')).toBe('enfrentar-morgana');
    talk('morgana-fase2', s);
    expect(s.flags['boss:iniciar']).toBe('fase2');
    talk('morgana-argumentos', s, [1, 0, 1, 0]);
    expect(s.flags['morgana:convencida']).toBe(true);
    expect(stage(s, 'as-virtudes')).toBe('acender-coracao');

    const fim3 = talk('coracao', s);
    expect(fim3).toContain('act-end:3');
    expect(s.flags['jogo:fim']).toBe(true);
    expect(s.inventory['livro-coracao']).toBe(1);
    expect(stage(s, 'as-virtudes')).toBe('fim');
    expect(currentObjective(s, db)?.quest).not.toBe('as-virtudes');
  });

  it('missões secundárias: mandrágoras da fada e livros fujões', () => {
    const s = newGame('m', 's');
    talk('fada-ramalhete', s);
    expect(stage(s, 'mandragoras')).toBe('colher');
    s.flags['colheitas:map.estufa'] = 2;
    tickQuests(s, db);
    expect(stage(s, 'mandragoras')).toBe('colher');
    s.flags['colheitas:map.estufa'] = 3;
    tickQuests(s, db);
    talk('fada-ramalhete', s);
    expect(s.recipes).toContain('pocao-vigor');
    apply({ giveItem: 'folha-mandragora' }, s, db);
    apply({ giveItem: 'suco-colorido' }, s, db);
    expect(brew(s, db, ['folha-mandragora', 'suco-colorido']).ok).toBe(true);

    apply({ startQuest: 'livros-fujoes' }, s, db);
    world(s, 'encaixe:map.biblioteca:atril-1', 'encaixe:map.biblioteca:atril-2', 'encaixe:map.biblioteca:atril-3');
    expect(stage(s, 'livros-fujoes')).toBe('contar-ao-aristoteles');
    talk('aristoteles', s);
    expect(s.recipes).toContain('elixir-estelar');
    expect(stage(s, 'livros-fujoes')).toBe('fim');
  });
});

describe('salas novas', () => {
  const novas = ['biblioteca', 'sala-espectral', 'estufa', 'observatorio', 'galeria',
    'quadro-coragem', 'quadro-inteligencia', 'quadro-astucia', 'quadro-lealdade', 'coracao'];

  it('gatilhos, pegáveis e mostradores apontam para falas e itens que existem', () => {
    for (const k of novas) {
      for (const o of objectsOf(`map.${k}`)) {
        const d = prop(o, 'dialogue');
        if (d) expect(existsSync(`content/dialogues/${d}.json`), `${k}/${o.name}`).toBe(true);
        if (o.type === 'pickup') expect(db.items[prop(o, 'item') as string], `${k}/${o.name}`).toBeDefined();
        const sprite = prop(o, 'sprite');
        if (sprite) expect(manifest.spritesheets[sprite as string], `${k}/${o.name}`).toBeDefined();
      }
    }
  });

  it('os quatro mostradores do Observatório batem com a pista da última carta', () => {
    const dials = objectsOf('map.observatorio').filter((o) => o.type === 'dial');
    expect(dials.map((o) => prop(o, 'answer')).sort()).toEqual([0, 1, 2, 3]);
    expect(dialogues['carta-4'].nodes['a-2'].text).toMatch(/coragem é a chama, inteligência é o livro, astúcia é a lua, lealdade é o coração/);
  });

  it('a aula tem três levas de espectros escondidos', () => {
    const ghosts = objectsOf('map.sala-espectral').filter((o) => o.type === 'creature');
    for (const leva of db.challenges['aula-espectral'].targets) {
      const g = ghosts.filter((o) => prop(o, 'group') === leva);
      expect(g.length, leva).toBeGreaterThanOrEqual(2);
      expect(g.every((o) => prop(o, 'oculto') === true)).toBe(true);
    }
  });
});

describe('elenco do castelo', () => {
  it('esconde-esconde dos gnomos: a Mary pede, os irmãos são achados e ela dá o presente', () => {
    const s = newGame('m', 's');
    talk('mish-mish', s);
    expect(s.flags['gnomo:mish-mish']).toBeUndefined();
    talk('mary', s);
    expect(stage(s, 'esconde-esconde')).toBe('procurar');
    talk('mish-mish', s);
    talk('wish-wish', s);
    expect(stage(s, 'esconde-esconde')).toBe('contar-a-mary');
    talk('mary', s);
    expect(s.inventory['elixir-estelar']).toBe(2);
    expect(stage(s, 'esconde-esconde')).toBe('fim');
  });

  it('o Booh conta a lenda de São Paulo, e o Ministro Bonfatti substitui o Arquimedes nos textos', () => {
    const s = newGame('m', 's');
    talk('booh', s);
    expect(s.flags['ouviu:lenda']).toBe(true);
    expect(JSON.stringify(dialogues['booh'])).toMatch(/São Paulo/);
    const all = JSON.stringify([dialogues, db.quests, db.items, db.challenges]);
    expect(all).not.toMatch(/Arquimedes/);
    expect(all).not.toMatch(/Murta|Trouxa/);
  });
});

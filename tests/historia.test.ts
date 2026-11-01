import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { newGame, type GameState } from '../src/core/GameState';
import { session } from '../src/core/session';
import { noGenero } from '../src/core/aparencia';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { apply, check, PANTRY_RESTOCK_MS, takeFromPantry, tickQuests } from '../src/systems/rules';
import type { AssetManifest } from '../src/core/AssetRegistry';
import { prop } from '../src/core/tiled';
import { db, dialogues } from './content-load';

interface TiledObject { name: string; type: string; properties?: unknown }
interface TiledMap { layers: { name: string; objects?: TiledObject[] }[] }
const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;
const mapa = (key: string) => JSON.parse(readFileSync(`public/assets/${manifest.maps[key].url}`, 'utf8')) as TiledMap;
const objetos = (key: string) => mapa(key).layers.find((l) => l.name === 'objetos')?.objects ?? [];
const quando = (o: TiledObject) => {
  const w = prop<string>(o.properties as never, 'when');
  return w ? JSON.parse(w) : undefined;
};

/** Lê um diálogo inteiro (sempre a primeira escolha) e devolve as falas. */
function falas(id: string, s: GameState): string[] {
  const run = new DialogueRunner(dialogues[id], s, db);
  const out: string[] = [];
  for (let guard = 0; !run.finished && guard < 60; guard++) {
    const v = run.view()!;
    out.push(v.text);
    if (v.choices.length) run.choose(0);
    else run.next();
  }
  return out;
}

describe('falas no feminino', () => {
  afterEach(() => {
    delete session.state.aparencia;
  });

  it('{o|a} escolhe a forma do menino ou da menina', () => {
    expect(noGenero('Você parece cansad{o|a}. {Guardião|Guardiã}!')).toBe('Você parece cansado. Guardião!');
    session.state.aparencia = 'menina';
    expect(noGenero('Você parece cansad{o|a}. {Guardião|Guardiã}!')).toBe('Você parece cansada. Guardiã!');
    expect(noGenero('Ora, ora, um aprendiz novo.')).toBe('Ora, ora, uma aprendiz nova.');
  });

  it('nenhuma fala trata o aprendiz só no masculino', () => {
    // palavras que, nas falas, se referem ao aprendiz: precisam da marcação {o|a}
    const masculino = /\b(obrigado|cansado|novinho|querido|desprevenido|tão bom)\b|(?<!\{)Guardião do Castelo/;
    for (const d of Object.values(dialogues)) {
      for (const [k, n] of Object.entries(d.nodes)) {
        const textos = [n.text, ...(n.choices ?? []).map((c) => c.text)].map((t) => t.replace(/\{[^{}|]*\|[^{}|]*\}/g, ''));
        for (const t of textos) expect(masculino.test(t), `${d.id}/${k}: ${t}`).toBe(false);
      }
    }
  });
});

describe('história coerente', () => {
  it('os professores do térreo só aparecem depois do Ato 1 (estavam presos na Ala)', () => {
    const inicio = newGame('map.recepcao', 'inicio');
    const depois = newGame('map.recepcao', 'inicio');
    depois.flags['ato:1:fim'] = true;
    for (const sala of ['map.recepcao', 'map.grande-salao', 'map.cozinha', 'map.corredor', 'map.hall']) {
      for (const o of objetos(sala).filter((o) => o.type === 'npc' && o.name.startsWith('prof-'))) {
        expect(check(quando(o), inicio), `${sala}#${o.name} no Ato 1`).toBe(false);
        expect(check(quando(o), depois), `${sala}#${o.name} depois do Ato 1`).toBe(true);
      }
    }
    const ala = objetos('map.hall').find((o) => o.name === 'porta-da-ala')!;
    expect(check(quando(ala), inicio)).toBe(false);
    expect(check(quando(ala), depois)).toBe(true);
  });

  it('o mural só diz o nome da vilã depois da cena do Hall', () => {
    const s = newGame('map.recepcao', 'inicio');
    expect(falas('mural-professores', s).join(' ')).not.toContain('Bellatrix');
    s.flags['visto:morgana-hall'] = true;
    expect(falas('mural-professores', s).join(' ')).toContain('Bellatrix');
  });

  it('as cartas são do Bonfatti para a Bellatrix', () => {
    const s = newGame('map.recepcao', 'inicio');
    expect(falas('carta-1', s).join(' ')).toContain('Querida B.');
    expect(db.items['carta-amelia-1'].description).toContain('Querida B.');
    const fala = JSON.parse(readFileSync('content/falas.json', 'utf8'))['pegar:carta-amelia-1'][0] as string;
    expect(fala).toContain('Bonfatti');
  });

  it('aulas de Defesa e Adivinhação só abrem com o feitiço que pedem', () => {
    const s = newGame('map.recepcao', 'inicio');
    const ala = objetos('map.ala-professores');
    const defesa = ala.find((o) => o.name === 'porta-de-defesa')!;
    const adivinhacao = ala.find((o) => o.name === 'porta-de-adivinhacao')!;
    expect(check(quando(defesa), s)).toBe(false);
    expect(check(quando(adivinhacao), s)).toBe(false);
    s.spells.push('escudo', 'revelar');
    expect(check(quando(defesa), s)).toBe(true);
    expect(check(quando(adivinhacao), s)).toBe(true);
    expect(db.challenges['aula-defesa'].requires).toEqual({ hasSpell: 'escudo' });
    expect(db.challenges['aula-adivinhacao'].requires).toEqual({ hasSpell: 'revelar' });
  });

  it('livros fujões se resolvem na aula de Literatura (sem desafio repetido na Biblioteca)', () => {
    const s = newGame('map.recepcao', 'inicio');
    apply({ startQuest: 'livros-fujoes' }, s, db);
    expect(objetos('map.biblioteca').some((o) => o.type === 'levitavel')).toBe(false);
    s.challenges['aula-literatura'] = { done: true, bestMs: 1000 };
    tickQuests(s, db);
    expect(s.quests['livros-fujoes'].stage).toBe('contar-ao-aristoteles');
  });
});

describe('despensa da cozinha', () => {
  it('dá um de cada e só repõe depois de um tempo', () => {
    const s = newGame('map.cozinha', 'inicio');
    const gives = ['abobora', 'gelo-seco'];
    expect(takeFromPantry(s, db, gives).notices).toHaveLength(2);
    apply({ takeItem: 'abobora' }, s, db);
    const vazia = takeFromPantry(s, db, gives);
    expect(vazia.notices).toHaveLength(0);
    expect(vazia.readyInMs).toBe(PANTRY_RESTOCK_MS);
    s.playTimeMs += PANTRY_RESTOCK_MS;
    expect(takeFromPantry(s, db, gives).notices.map((n) => n.ref)).toEqual(['abobora']);
  });
});

describe('luz das salas', () => {
  it('toda sala tem noite; a cozinha clareia quando a luz volta; o final clareia tudo', async () => {
    const { ambienteDa } = await import('../src/world/ambiente');
    const s = newGame('map.cozinha', 'inicio');
    const escura = ambienteDa('map.cozinha', s).alpha;
    s.quests['luz-na-cozinha'] = { stage: 'falar-com-brasa', done: true };
    const acesa = ambienteDa('map.cozinha', s).alpha;
    expect(acesa).toBeLessThan(escura);
    expect(ambienteDa('map.porao', s, true)).toMatchObject({ escuro: true });
    for (const key of Object.keys(manifest.maps)) {
      const a = ambienteDa(key, s);
      expect(a.alpha, key).toBeGreaterThan(0.2);
      expect(a.alpha, key).toBeLessThan(0.8);
    }
    s.flags['jogo:fim'] = true;
    expect(ambienteDa('map.cozinha', s).alpha).toBeLessThan(acesa);
  });
});

describe('Apanha-Luz', () => {
  it('guarda até 3 luzes e solta uma de cada vez', async () => {
    const { APANHA_LUZ_MAX, guardarLuz, luzesGuardadas, soltarLuz } = await import('../src/systems/apanhaLuz');
    const s = newGame('map.porao', 'inicio');
    expect(soltarLuz(s)).toBe(false);
    for (let i = 0; i < APANHA_LUZ_MAX; i++) expect(guardarLuz(s)).toBe(true);
    expect(guardarLuz(s)).toBe(false);
    expect(luzesGuardadas(s)).toBe(APANHA_LUZ_MAX);
    expect(soltarLuz(s)).toBe(true);
    expect(luzesGuardadas(s)).toBe(APANHA_LUZ_MAX - 1);
  });

  it('o Bonfatti entrega o Apanha-Luz no gabinete', () => {
    const nodes = Object.values(dialogues['arquimedes'].nodes);
    expect(nodes.some((n) => JSON.stringify(n.effects ?? []).includes('"learnSpell":"apanha-luz"'))).toBe(true);
    expect(db.spells['apanha-luz']).toBeDefined();
  });
});

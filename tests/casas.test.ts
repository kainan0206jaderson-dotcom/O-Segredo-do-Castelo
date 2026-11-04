import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { db, dialogues } from './content-load';
import { newGame } from '../src/core/GameState';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { apply } from '../src/systems/rules';

// ordem oficial das casas no castelo [kainan, 31/10]: vermelho, verde, amarelo, azul
const ORDEM = ['coragem', 'astucia', 'lealdade', 'inteligencia'];

describe('ordem das casas', () => {
  const salao = JSON.parse(readFileSync('public/assets/maps/grande-salao.tmj', 'utf8'));
  const props = salao.layers.find((l: { type: string }) => l.type === 'objectgroup').objects as { x: number; properties?: { name: string; value: unknown }[] }[];
  const sprites = (prefix: string) => props
    .map((o) => ({ x: o.x, s: String(o.properties?.find((p) => p.name === 'sprite')?.value ?? '') }))
    .filter((o) => o.s.startsWith(prefix))
    .sort((a, b) => a.x - b.x)
    .map((o) => o.s.replace(prefix, ''));

  it('bandeiras da parede do Grande Salão: vermelho, verde, amarelo, azul', () => {
    const paredes = salao.layers.find((l: { name: string }) => l.name === 'paredes').data as number[];
    const linha = paredes.slice(salao.width, salao.width * 2);
    // gids das bandeiras no tileset: 8 coragem, 9 inteligência, 10 astúcia, 11 lealdade
    const gid: Record<number, string> = { 8: 'coragem', 9: 'inteligencia', 10: 'astucia', 11: 'lealdade' };
    expect(linha.filter((g) => gid[g]).map((g) => gid[g])).toEqual(ORDEM);
  });

  it('toalhas e estandartes das mesas seguem a mesma ordem', () => {
    expect(sprites('prop.toalha-')).toEqual(ORDEM);
    expect(sprites('prop.estandarte-')).toEqual(ORDEM);
  });

  it('a escolha da casa com o Ministro mostra as casas nessa ordem, com o Chapéu das Virtudes', () => {
    const d = dialogues.arquimedes;
    const casa = d.nodes['casa-manual'];
    expect(casa.choices?.flatMap((c) => c.effects?.filter((e) => 'setHouse' in e) ?? [])).toEqual(ORDEM.map((h) => ({ setHouse: h })));
    expect(casa.cena).toBe('chapeu');
    expect(d.nodes.casa.choices?.map((c) => c.next)).toEqual(['quiz-inicio', 'casa-manual']);
    expect(d.nodes['intro-4'].next).toBe('chapeu');
  });
});

describe('quiz do Chapéu das Virtudes', () => {
  /** Conversa com o Ministro até a casa ser escolhida, seguindo as escolhas dadas (o resto avança). */
  function sorteio(picks: number[], kids = false) {
    const s = newGame('map.grande-salao', 'inicio');
    if (kids) s.modo = 'kids';
    apply({ startQuest: 'o-diretor' }, s, db);
    apply({ advanceQuest: 'o-diretor', to: 'falar-com-diretor' }, s, db);
    const run = new DialogueRunner(dialogues.arquimedes, s, db);
    const vistos: string[] = [];
    for (let guard = 0; !run.finished && guard < 80; guard++) {
      const v = run.view()!;
      vistos.push(v.text);
      if (v.choices.length) run.choose(picks.shift() ?? 0);
      else run.next();
    }
    expect(run.finished).toBe(true);
    return { s, vistos };
  }
  const resposta = (n: string, casa: string) =>
    dialogues.arquimedes.nodes[n].choices!.findIndex((c) => c.effects?.some((e) => 'addFlag' in e && e.addFlag === `quiz:${casa}`));

  it('as cinco perguntas têm uma resposta de cada casa', () => {
    for (let i = 1; i <= 5; i++) {
      const q = dialogues.arquimedes.nodes[`quiz-${i}`];
      expect(q.cena).toBe('chapeu');
      expect(ORDEM.map((c) => resposta(`quiz-${i}`, c)).sort()).toEqual([0, 1, 2, 3]);
    }
  });

  for (const casa of ORDEM) {
    it(`respostas de ${casa} levam à mesa de ${casa}, com a capa da casa`, () => {
      const picks = [0, ...[1, 2, 3, 4, 5].map((i) => resposta(`quiz-${i}`, casa)), 0];
      const { s } = sorteio(picks);
      expect(s.house).toBe(casa);
      expect(s.equipment.capa).toBe(`capa-${casa}`);
    });
  }

  it('empate: a última pergunta desempata', () => {
    // 2 de coragem, 2 de astúcia, e a última (que pesa mais) em astúcia
    const picks = [0, resposta('quiz-1', 'coragem'), resposta('quiz-2', 'coragem'), resposta('quiz-3', 'astucia'),
      resposta('quiz-4', 'lealdade'), resposta('quiz-5', 'astucia'), 0];
    expect(sorteio(picks).s.house).toBe('astucia');
  });

  it('dá para refazer o quiz, e os pontos começam do zero', () => {
    const tudo = (casa: string) => [1, 2, 3, 4, 5].map((i) => resposta(`quiz-${i}`, casa));
    // primeira rodada dá Coragem; refaz (escolha 1) e a segunda dá Lealdade
    const { s } = sorteio([0, ...tudo('coragem'), 1, ...tudo('lealdade'), 0]);
    expect(s.house).toBe('lealdade');
    expect(s.flags['quiz:coragem']).toBe(0);
  });

  it('dá para escolher a mesa manualmente, direto ou depois do quiz', () => {
    expect(sorteio([1, 2]).s.house).toBe('lealdade');
    const tudo = [1, 2, 3, 4, 5].map((i) => resposta(`quiz-${i}`, 'coragem'));
    expect(sorteio([0, ...tudo, 2, 3]).s.house).toBe('inteligencia');
  });

  it('o quiz também funciona no Modo Kids', () => {
    expect(sorteio([]).s.house).toBeTruthy();
    expect(sorteio([], true).s.house).toBeTruthy();
  });
});

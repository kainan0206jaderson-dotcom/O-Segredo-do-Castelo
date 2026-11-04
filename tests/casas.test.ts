import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { db, dialogues } from './content-load';
import { newGame } from '../src/core/GameState';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { apply } from '../src/systems/rules';
import { proximaPergunta, resultadoQuiz, sortearQuiz, type QuizDef } from '../src/systems/quizChapeu';

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
  const banco = JSON.parse(readFileSync('content/quiz-chapeu.json', 'utf8')) as QuizDef;
  const nodes = dialogues.arquimedes.nodes;

  /** Conversa com o Ministro seguindo as escolhas dadas; nas perguntas do quiz, responde com a última casa indicada. */
  function sorteio(picks: (number | string)[], kids = false) {
    const s = newGame('map.grande-salao', 'inicio');
    if (kids) s.modo = 'kids';
    apply({ startQuest: 'o-diretor' }, s, db);
    apply({ advanceQuest: 'o-diretor', to: 'falar-com-diretor' }, s, db);
    const run = new DialogueRunner(dialogues.arquimedes, s, db);
    const perguntas: string[] = [];
    let casa = 'coragem';
    for (let guard = 0; !run.finished && guard < 200; guard++) {
      const v = run.view()!;
      const no = banco.perguntas.find((p) => p.texto === v.text);
      if (no) {
        perguntas.push(no.id);
        run.choose(no.respostas.findIndex((r) => r.casa === casa));
      } else if (v.choices.length) {
        const p = picks.shift() ?? 0;
        // "casa" ou "casa:n": passa a responder com essa casa e toma a escolha n (padrão 0)
        if (typeof p === 'string') { const [c, n] = p.split(':'); casa = c; run.choose(Number(n ?? 0)); } else run.choose(p);
      } else run.next();
    }
    expect(run.finished).toBe(true);
    return { s, perguntas };
  }

  it('o banco tem 20 perguntas, cada uma com uma resposta de cada casa', () => {
    expect(banco.perguntas).toHaveLength(20);
    expect(new Set(banco.perguntas.map((p) => p.id)).size).toBe(20);
    for (const p of banco.perguntas) expect(p.respostas.map((r) => r.casa).sort()).toEqual([...ORDEM].sort());
    expect(banco.quantas).toBe(6);
  });

  for (const casa of ORDEM) {
    it(`responder tudo de ${casa} dá a mesa de ${casa}, com a capa da casa`, () => {
      // "casa" = responder às perguntas; depois, aceitar o resultado
      const { s, perguntas } = sorteio([casa, 0]);
      expect(perguntas).toHaveLength(6);
      expect(new Set(perguntas).size).toBe(6);
      expect(s.house).toBe(casa);
      expect(s.equipment.capa).toBe(`capa-${casa}`);
    });
  }

  it('as perguntas mudam de um quiz para outro', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 10; i++) sorteio(['coragem', 0]).perguntas.forEach((p) => vistas.add(p));
    expect(vistas.size).toBeGreaterThan(6);
  });

  it('o sorteio não repete pergunta e a fila acaba em "fim"', () => {
    const s = newGame('m', 's');
    sortearQuiz(s, banco.perguntas.map((p) => p.id), 6, () => 0.5);
    const vistas: string[] = [];
    for (let i = 0; i < 7; i++) { proximaPergunta(s); vistas.push(String(s.flags['quiz:atual'])); }
    expect(new Set(vistas.slice(0, 6)).size).toBe(6);
    expect(vistas[6]).toBe('fim');
  });

  it('empate: vale a última resposta', () => {
    const s = newGame('m', 's');
    Object.assign(s.flags, { 'quiz:coragem': 2, 'quiz:astucia': 2, 'quiz:lealdade': 1, 'quiz:inteligencia': 1, 'quiz:ultima': 'astucia' });
    expect(resultadoQuiz(s)).toBe('astucia');
    s.flags['quiz:ultima'] = 'lealdade';
    expect(resultadoQuiz(s)).toBe('coragem');
  });

  it('dá para refazer o quiz, e os pontos começam do zero', () => {
    // primeira rodada dá Coragem; refaz (escolha 1) e a segunda dá Lealdade
    const { s, perguntas } = sorteio(['coragem', 'lealdade:1', 0]);
    expect(perguntas).toHaveLength(12);
    expect(s.house).toBe('lealdade');
    expect(s.flags['quiz:coragem']).toBe(0);
  });

  it('dá para escolher a mesa manualmente, direto ou depois do quiz', () => {
    expect(sorteio([1, 2]).s.house).toBe('lealdade');
    expect(sorteio(['coragem', 2, 3]).s.house).toBe('inteligencia');
  });

  it('as perguntas são do Chapéu, com o chapéu na cabeça', () => {
    for (const p of banco.perguntas) {
      expect(nodes[`quiz-p-${p.id}`].speaker).toBe('Chapéu das Virtudes');
      expect(nodes[`quiz-p-${p.id}`].cena).toBe('chapeu');
    }
  });

  it('o quiz também funciona no Modo Kids', () => {
    expect(sorteio([]).s.house).toBeTruthy();
    expect(sorteio([], true).s.house).toBeTruthy();
  });
});

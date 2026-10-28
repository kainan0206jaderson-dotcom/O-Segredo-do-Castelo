import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/GameState';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { check, currentObjective } from '../src/systems/rules';
import { db, dialogues } from './content-load';

/** Fala com um NPC até o fim, escolhendo sempre a opção indicada. */
function talk(id: string, state = newGame('map.recepcao', 'inicio'), pick = 0) {
  const run = new DialogueRunner(dialogues[id], state, db);
  const lines: string[] = [];
  for (let guard = 0; !run.finished && guard < 50; guard++) {
    const v = run.view()!;
    lines.push(v.text);
    if (v.choices.length) run.choose(Math.min(pick, v.choices.length - 1));
    else run.next();
  }
  expect(run.finished).toBe(true);
  return { state, lines, notices: run.notices.map((n) => n.text) };
}

describe('primeira missão completa', () => {
  it('Trinco -> Dom Moldura -> Trinco', () => {
    const s = newGame('map.recepcao', 'inicio');
    expect(currentObjective(s, db)).toBeUndefined();

    const a = talk('trinco', s, 2);
    expect(s.flags.casa).toBe('astucia');
    expect(s.inventory.varinha).toBe(1);
    expect(a.notices).toEqual(['Você recebeu: Varinha de aprendiz', 'Nova missão: Primeira noite no castelo']);
    expect(currentObjective(s, db)?.objective).toMatch(/quadro vivo/);

    const lembrete = talk('trinco', s);
    expect(lembrete.lines).toHaveLength(1);

    talk('dom-moldura', s, 1);
    expect(s.flags['ouviu-moldura']).toBe(true);
    expect(currentObjective(s, db)?.objective).toMatch(/Trinco/);

    const fim = talk('trinco', s);
    expect(fim.notices).toContain('Missão concluída: Primeira noite no castelo');
    expect(s.inventory.grimorio).toBe(1);
    expect(s.quests['primeira-noite'].done).toBe(true);
    expect(currentObjective(s, db)).toBeUndefined();
  });

  it('o quadro só fala de passagem antes da missão', () => {
    const r = talk('dom-moldura');
    expect(r.lines).toHaveLength(1);
    expect(r.state.flags['ouviu-moldura']).toBeUndefined();
  });
});

describe('condições', () => {
  it('combina not, all e any', () => {
    const s = newGame('m', 's');
    s.flags.a = 1;
    expect(check({ all: [{ flag: 'a' }, { not: { flag: 'b' } }] }, s)).toBe(true);
    expect(check({ any: [{ flag: 'b' }, { hasItem: 'x' }] }, s)).toBe(false);
    expect(check({ flag: 'a', eq: 2 }, s)).toBe(false);
  });
});

describe('conteúdo', () => {
  it('toda fala citada existe e todo item, missão e etapa existe', () => {
    for (const d of Object.values(dialogues)) {
      const refs = [
        ...d.entries.map((e) => e.start),
        ...Object.values(d.nodes).flatMap((n) => [n.next, ...(n.choices ?? []).map((c) => c.next)]),
      ].filter((r): r is string => typeof r === 'string');
      for (const r of refs) expect(d.nodes[r], `${d.id}: ${r}`).toBeDefined();
      const effects = Object.values(d.nodes).flatMap((n) => [...(n.effects ?? []), ...(n.choices ?? []).flatMap((c) => c.effects ?? [])]);
      for (const e of effects) {
        if ('giveItem' in e) expect(db.items[e.giveItem], e.giveItem).toBeDefined();
        if ('startQuest' in e) expect(db.quests[e.startQuest]).toBeDefined();
        if ('advanceQuest' in e) expect(db.quests[e.advanceQuest].stages.map((s) => s.id)).toContain(e.to);
      }
      expect(d.entries.at(-1)?.when, `${d.id}: a última entrada deve valer sempre`).toBeUndefined();
    }
  });
});

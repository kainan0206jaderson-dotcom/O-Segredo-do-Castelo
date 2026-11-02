import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/GameState';
import { apply } from '../src/systems/rules';
import { DICA_PRIMEIRA_MS, DICA_SEGUINTE_MS, dueHint, newHintClock } from '../src/systems/dicas';
import { db } from './content-load';

describe('dicas quando a missão empaca', () => {
  it('toda etapa principal tem pelo menos uma dica', () => {
    for (const [q, def] of Object.entries(db.quests)) {
      if (def.kind === 'secundaria') continue;
      for (const st of def.stages) expect(st.dicas?.length, `${q}/${st.id}`).toBeGreaterThan(0);
    }
  });

  it('a primeira dica sai depois de 5 minutos sem avançar (mesmo andando) e as seguintes ficam mais diretas', () => {
    const s = newGame('map.grande-salao', 'inicio');
    apply({ startQuest: 'o-selo' }, s, db);
    const clock = newHintClock();
    expect(dueHint(clock, s, db, 0)).toBeUndefined();
    expect(dueHint(clock, s, db, DICA_PRIMEIRA_MS.normal - 1)).toBeUndefined();
    const dicas = db.quests['o-selo'].stages[0].dicas!;
    expect(dueHint(clock, s, db, DICA_PRIMEIRA_MS.normal)).toBe(dicas[0]);
    expect(dueHint(clock, s, db, DICA_PRIMEIRA_MS.normal + 1000)).toBeUndefined();
    expect(dueHint(clock, s, db, DICA_PRIMEIRA_MS.normal + DICA_SEGUINTE_MS.normal)).toBe(dicas[1]);
  });

  it('qualquer avanço (até uma parte da etapa) zera o relógio', () => {
    const s = newGame('map.grande-salao', 'inicio');
    apply({ startQuest: 'o-selo' }, s, db);
    const clock = newHintClock();
    dueHint(clock, s, db, 0);
    apply({ giveItem: 'pedra-coragem' }, s, db);
    expect(dueHint(clock, s, db, DICA_PRIMEIRA_MS.normal)).toBeUndefined();
    expect(dueHint(clock, s, db, DICA_PRIMEIRA_MS.normal * 2)).toBeDefined();
  });

  it('no Modo Kids a dica vem antes', () => {
    const s = newGame('map.grande-salao', 'inicio');
    s.modo = 'kids';
    apply({ startQuest: 'o-selo' }, s, db);
    const clock = newHintClock();
    dueHint(clock, s, db, 0);
    expect(dueHint(clock, s, db, DICA_PRIMEIRA_MS.kids)).toBeDefined();
  });
});

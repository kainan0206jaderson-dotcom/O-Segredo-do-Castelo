import { describe, expect, it } from 'vitest';
import { EventBus, type GameEvents } from '../src/core/EventBus';
import { newGame } from '../src/core/GameState';
import { SaveManager, type KeyValueStorage } from '../src/core/SaveManager';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { autosave, emitNotices, eventsFor } from '../src/systems/progress';
import { apply, tickQuests } from '../src/systems/rules';
import { db, dialogues } from './content-load';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

function record(bus: EventBus<GameEvents>): string[] {
  const seen: string[] = [];
  for (const e of ['quest:started', 'quest:advanced', 'quest:done', 'item:got', 'spell:learned', 'level:up'] as const) {
    bus.on(e, (p) => seen.push(`${e}:${'quest' in p ? p.quest : 'item' in p ? p.item : 'spell' in p ? p.spell : ''}`));
  }
  return seen;
}

describe('EventBus', () => {
  it('entrega o evento a quem escuta e para de entregar depois de desligar', () => {
    const bus = new EventBus<GameEvents>();
    const maps: string[] = [];
    const off = bus.on('map:entered', (p) => maps.push(p.map));
    bus.emit('map:entered', { map: 'map.biblioteca' });
    off();
    bus.emit('map:entered', { map: 'map.hall' });
    expect(maps).toEqual(['map.biblioteca']);
  });
});

describe('progresso pelo EventBus', () => {
  it('missão começando, avançando e terminando vira evento com o id da missão', () => {
    const s = newGame('map.recepcao', 'inicio');
    const bus = new EventBus<GameEvents>();
    const seen = record(bus);
    emitNotices(bus, apply({ startQuest: 'primeira-noite' }, s, db));
    emitNotices(bus, apply({ advanceQuest: 'primeira-noite', to: 'voltar-ao-trinco' }, s, db));
    emitNotices(bus, apply({ completeQuest: 'primeira-noite' }, s, db));
    expect(seen).toContain('quest:started:primeira-noite');
    expect(seen).toContain('quest:advanced:primeira-noite');
    expect(seen).toContain('quest:done:primeira-noite');
  });

  it('item e feitiço novos viram eventos', () => {
    const s = newGame('map.recepcao', 'inicio');
    const events = eventsFor([...apply({ giveItem: 'varinha' }, s, db), ...apply({ learnSpell: 'lumen' }, s, db)]);
    expect(events).toContainEqual(['item:got', { item: 'varinha' }]);
    expect(events).toContainEqual(['spell:learned', { spell: 'lumen' }]);
  });

  it('o diálogo do Trinco dá a missão inicial e o evento sai com o id dela', () => {
    const s = newGame('map.recepcao', 'inicio');
    const bus = new EventBus<GameEvents>();
    const seen = record(bus);
    const run = new DialogueRunner(dialogues.trinco, s, db);
    // passa todas as falas escolhendo sempre a primeira opção
    for (let i = 0; i < 40 && run.view(); i++) {
      if (run.view()?.choices?.length) run.choose(0);
      else run.next();
      emitNotices(bus, run.notices.splice(0));
    }
    expect(seen.some((e) => e.startsWith('quest:started:'))).toBe(true);
  });

  it('o save acontece na hora em que o progresso muda (sem trocar de sala)', () => {
    const store = new MemoryStorage();
    const saves = new SaveManager(store);
    const s = newGame('map.recepcao', 'inicio');
    const bus = new EventBus<GameEvents>();
    const off = autosave(bus, () => saves.save(s));
    emitNotices(bus, apply({ startQuest: 'primeira-noite' }, s, db));
    expect(saves.load()?.quests['primeira-noite']?.done).toBe(false);
    emitNotices(bus, apply({ completeQuest: 'primeira-noite' }, s, db));
    expect(saves.load()?.quests['primeira-noite']?.done).toBe(true);
    off();
    s.inventory.varinha = 5;
    emitNotices(bus, apply({ giveItem: 'varinha' }, s, db));
    expect(saves.load()?.inventory.varinha).toBeUndefined();
  });

  it('etapa concluída por condição (tickQuests) também vira evento de avanço', () => {
    const s = newGame('map.recepcao', 'inicio');
    apply({ startQuest: 'o-diretor' }, s, db);
    const when = db.quests['o-diretor'].stages[0].completeWhen;
    expect(when && 'flag' in when).toBe(true);
    if (when && 'flag' in when) s.flags[when.flag] = when.eq ?? true;
    expect(eventsFor(tickQuests(s, db))).toContainEqual(['quest:advanced', { quest: 'o-diretor', text: 'Missão atualizada' }]);
  });
});

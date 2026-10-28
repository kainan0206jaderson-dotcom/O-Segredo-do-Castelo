import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/GameState';
import { SAVE_KEY, SaveManager, type KeyValueStorage } from '../src/core/SaveManager';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

describe('SaveManager', () => {
  it('salva e carrega o mesmo estado', () => {
    const store = new MemoryStorage();
    const s = newGame('map.grande-salao', 'da-recepcao');
    s.flags.casa = 'lealdade';
    s.quests['primeira-noite'] = { stage: 'voltar-ao-trinco', done: false };
    s.inventory.varinha = 1;
    new SaveManager(store).save(s);
    expect(new SaveManager(store).load()).toEqual(s);
  });

  it('ignora save corrompido ou de versão futura', () => {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, '{quebrado');
    expect(new SaveManager(store).load()).toBeUndefined();
    store.setItem(SAVE_KEY, JSON.stringify({ ...newGame('m', 's'), version: 99 }));
    expect(new SaveManager(store).load()).toBeUndefined();
  });

  it('converte um save da etapa 2 (versão 1) para a versão atual', () => {
    const store = new MemoryStorage();
    const v1 = { version: 1, map: 'map.recepcao', spawn: 'inicio', flags: { casa: 'astucia' }, quests: {}, inventory: { varinha: 1 }, playTimeMs: 10 };
    store.setItem(SAVE_KEY, JSON.stringify(v1));
    const s = new SaveManager(store).load()!;
    expect(s.version).toBe(3);
    expect(s.flags.casa).toBe('astucia');
    expect(s.spells).toEqual([]);
    expect(s.recipes).toEqual([]);
    expect(s.challenges).toEqual({});
    expect(s.house).toBeNull();
    expect(s.level).toBe(1);
  });

  it('converte um save da etapa 3 (versão 2) mantendo feitiços e missões', () => {
    const store = new MemoryStorage();
    const v2 = { version: 2, map: 'map.cozinha', spawn: 'do-salao', flags: {}, quests: { 'luz-na-cozinha': { stage: 'acender-velas', done: false } },
      inventory: { varinha: 1 }, spells: ['lumen'], selectedSpell: 'lumen', recipes: ['drink-fumegante'], challenges: {}, playTimeMs: 99 };
    store.setItem(SAVE_KEY, JSON.stringify(v2));
    const s = new SaveManager(store).load()!;
    expect(s.version).toBe(3);
    expect(s.spells).toEqual(['lumen']);
    expect(s.quests['luz-na-cozinha'].stage).toBe('acender-velas');
    expect(s).toMatchObject({ level: 1, xp: 0, equipment: {}, house: null });
    expect(s.vida).toBeGreaterThan(0);
    expect(s.energia).toBeGreaterThan(0);
  });

  it('funciona sem armazenamento (navegação privada)', () => {
    const m = new SaveManager(undefined);
    expect(m.save(newGame('m', 's'))).toBe(false);
    expect(m.load()).toBeUndefined();
  });
});

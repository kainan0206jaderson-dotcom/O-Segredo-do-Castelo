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

  it('funciona sem armazenamento (navegação privada)', () => {
    const m = new SaveManager(undefined);
    expect(m.save(newGame('m', 's'))).toBe(false);
    expect(m.load()).toBeUndefined();
  });
});

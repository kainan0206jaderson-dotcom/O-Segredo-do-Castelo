import { SAVE_VERSION, START_ENERGIA, START_VIDA, type GameState } from './GameState';

export const SAVE_KEY = 'segredo-do-castelo:save';

/** Interface mínima do localStorage, para os testes usarem um armazenamento falso. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Converte saves antigos para o formato atual. Cada versão nova ganha um passo aqui. */
const migrations: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2 (etapa 3): feitiços, receitas e desafios
  1: (s) => ({ ...s, version: 2, spells: [], selectedSpell: null, recipes: [], challenges: {} }),
  // v2 -> v3 (etapa 4): casa, ficha do aprendiz e equipamento
  2: (s) => ({ ...s, version: 3, house: null, level: 1, xp: 0, vida: START_VIDA, energia: START_ENERGIA, equipment: {} }),
};

export class SaveManager {
  constructor(private readonly storage: KeyValueStorage | undefined = SaveManager.browserStorage()) {}

  private static browserStorage(): KeyValueStorage | undefined {
    try {
      return typeof localStorage === 'undefined' ? undefined : localStorage;
    } catch {
      return undefined; // navegação privada ou armazenamento bloqueado
    }
  }

  load(): GameState | undefined {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return undefined;
      let data = JSON.parse(raw) as Record<string, unknown>;
      let version = Number(data.version);
      if (!Number.isInteger(version) || version > SAVE_VERSION) return undefined;
      while (version < SAVE_VERSION) {
        const step = migrations[version];
        if (!step) return undefined;
        data = step(data);
        version += 1;
      }
      const s = data as unknown as GameState;
      if (typeof s.map !== 'string' || typeof s.flags !== 'object' || typeof s.quests !== 'object') return undefined;
      return { ...s, version: SAVE_VERSION, inventory: s.inventory ?? {}, playTimeMs: s.playTimeMs ?? 0 };
      // (campos novos de versões futuras entram nas migrações acima, não aqui)
    } catch {
      return undefined;
    }
  }

  save(state: GameState): boolean {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(state));
      return Boolean(this.storage);
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      // nada a fazer
    }
  }
}

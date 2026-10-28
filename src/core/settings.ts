/** Opções do jogador: guardadas à parte do save, valem para qualquer jogo. */
export interface Settings {
  /** Volume da música, de 0 a 1. */
  musica: number;
  /** Volume dos efeitos sonoros, de 0 a 1. */
  efeitos: number;
  /** Velocidade do texto dos diálogos. */
  texto: 'normal' | 'rapido' | 'instantaneo';
  /** Tela tremendo e piscando nos momentos fortes. */
  tremor: boolean;
}

const KEY = 'segredo-do-castelo:opcoes';
const DEFAULTS: Settings = { musica: 0.5, efeitos: 0.8, texto: 'normal', tremor: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings: Settings = load();

const listeners = new Set<() => void>();

/** Muda uma opção, salva e avisa quem depende dela (o áudio, por exemplo). */
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  settings[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // sem armazenamento (aba anônima): a opção vale só até fechar
  }
  listeners.forEach((l) => l());
}

export function onSettingsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Letras por segundo nos diálogos (Infinity = texto aparece inteiro). */
export function charsPerSecond(): number {
  return settings.texto === 'instantaneo' ? Infinity : settings.texto === 'rapido' ? 90 : 45;
}

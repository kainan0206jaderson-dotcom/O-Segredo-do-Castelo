import type { GameState } from '../core/GameState';

/**
 * Apanha-Luz [FICÇÃO]: artefato do Ministro Bonfatti que guarda a luz de uma vela e a solta depois.
 * A Bellatrix roubou o primeiro e apaga o castelo com ele; o aprendiz ganha o protótipo.
 * As luzes guardadas ficam no save como um contador.
 */
export const APANHA_LUZ_MAX = 3;
const FLAG = 'apanha-luz:cargas';

export function luzesGuardadas(s: GameState): number {
  return Number(s.flags[FLAG] ?? 0);
}

/** Guarda uma luz (de uma vela acesa). false se já está cheio. */
export function guardarLuz(s: GameState): boolean {
  const n = luzesGuardadas(s);
  if (n >= APANHA_LUZ_MAX) return false;
  s.flags[FLAG] = n + 1;
  return true;
}

/** Solta uma luz guardada. false se está vazio. */
export function soltarLuz(s: GameState): boolean {
  const n = luzesGuardadas(s);
  if (n <= 0) return false;
  s.flags[FLAG] = n - 1;
  return true;
}

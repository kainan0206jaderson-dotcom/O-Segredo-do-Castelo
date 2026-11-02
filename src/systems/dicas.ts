import type { GameState } from '../core/GameState';
import { currentObjective, currentStage, guideTarget, type ContentDb } from './rules';

/** Tempo de jogo sem avançar a missão até a primeira dica, e entre as dicas seguintes. */
export const DICA_PRIMEIRA_MS = { normal: 5 * 60000, kids: 2.5 * 60000 };
export const DICA_SEGUINTE_MS = { normal: 2.5 * 60000, kids: 90000 };

/** Relógio das dicas: quando a missão avançou pela última vez e quantas dicas já saíram desde então. */
export interface HintClock { sig: string; since: number; shown: number }

export const newHintClock = (): HintClock => ({ sig: '', since: 0, shown: 0 });

/**
 * "Assinatura" do progresso: muda quando a etapa muda ou quando uma parte dela é cumprida
 * (por exemplo, pegar uma das 4 pedras muda o próximo alvo).
 */
function signature(s: GameState, db: ContentDb): string {
  const obj = currentObjective(s, db);
  return obj ? `${obj.quest}|${obj.objective}|${JSON.stringify(guideTarget(s, db) ?? null)}` : '';
}

/**
 * Chamado com o tempo de jogo (playTimeMs). Devolve o texto da dica quando a missão
 * ficou tempo demais sem avançar, mesmo que o jogador esteja andando pelo castelo.
 */
export function dueHint(clock: HintClock, s: GameState, db: ContentDb, now: number): string | undefined {
  const sig = signature(s, db);
  if (sig !== clock.sig) {
    clock.sig = sig;
    clock.since = now;
    clock.shown = 0;
    return undefined;
  }
  if (!sig) return undefined;
  const modo = s.modo === 'kids' ? 'kids' : 'normal';
  const wait = DICA_PRIMEIRA_MS[modo] + clock.shown * DICA_SEGUINTE_MS[modo];
  if (now - clock.since < wait) return undefined;
  const dicas = currentStage(s, db)?.stage.dicas ?? [];
  const text = dicas.length ? dicas[Math.min(clock.shown, dicas.length - 1)] : currentObjective(s, db)!.objective;
  clock.shown += 1;
  return text;
}

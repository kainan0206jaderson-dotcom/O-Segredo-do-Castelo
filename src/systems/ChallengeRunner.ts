import type { GameState } from '../core/GameState';
import type { ChallengeDef } from '../types/content';
import { apply, type ContentDb, type Notice } from './rules';

export type ChallengeStatus = 'running' | 'won' | 'lost';

/** Um desafio cronometrado: acertar todos os alvos antes do tempo acabar. */
export class ChallengeRunner {
  private hit = new Set<string>();
  private elapsed = 0;
  status: ChallengeStatus = 'running';
  readonly notices: Notice[] = [];

  constructor(
    readonly id: string,
    private readonly def: ChallengeDef,
  ) {}

  get remainingMs(): number {
    return Math.max(0, this.def.timeLimitMs - this.elapsed);
  }

  get progress(): { done: number; total: number } {
    return { done: this.hit.size, total: this.def.targets.length };
  }

  isTarget(name: string): boolean {
    return this.def.targets.includes(name);
  }

  /** Marca um alvo. Vence se for o último, aplicando a recompensa. */
  hitTarget(name: string, s: GameState, db: ContentDb): void {
    if (this.status !== 'running' || !this.isTarget(name)) return;
    this.hit.add(name);
    if (this.hit.size < this.def.targets.length) return;
    this.status = 'won';
    const first = !s.challenges[this.id]?.done;
    const best = Math.min(this.elapsed, s.challenges[this.id]?.bestMs ?? Infinity);
    s.challenges[this.id] = { done: true, bestMs: best };
    for (const e of first ? this.def.reward : this.def.repeatReward ?? []) this.notices.push(...apply(e, s, db));
    // último desafio de uma série (as salas dos professores): prêmio da série, uma vez só
    const serie = this.def.serie;
    if (first && serie && !s.flags[`serie:${serie}`]) {
      const all = Object.entries(db.challenges).filter(([, c]) => c.serie === serie);
      if (all.every(([id]) => s.challenges[id]?.done)) {
        s.flags[`serie:${serie}`] = true;
        for (const e of db.progression.series?.[serie] ?? []) this.notices.push(...apply(e, s, db));
      }
    }
  }

  update(deltaMs: number): void {
    if (this.status !== 'running') return;
    this.elapsed += deltaMs;
    if (this.elapsed >= this.def.timeLimitMs) this.status = 'lost';
  }
}

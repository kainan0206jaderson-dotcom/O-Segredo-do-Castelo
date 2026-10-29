import { newGame, type GameState } from './GameState';
import { SaveManager } from './SaveManager';
import { START_MAP, START_SPAWN } from '../config/game';

/** Partida em andamento: o estado e onde ele é salvo. */
class Session {
  readonly saves = new SaveManager();
  state: GameState = newGame(START_MAP, START_SPAWN);

  hasSave(): boolean {
    return Boolean(this.saves.load());
  }

  /** persist = false: começa o jogo novo sem gravar ainda (a tela de Visual grava no "Pronto"). */
  startNew(persist = true): void {
    this.state = newGame(START_MAP, START_SPAWN);
    if (persist) this.saves.save(this.state);
  }

  continue(): boolean {
    const loaded = this.saves.load();
    if (!loaded) return false;
    this.state = loaded;
    return true;
  }

  save(): void {
    this.saves.save(this.state);
  }
}

export const session = new Session();

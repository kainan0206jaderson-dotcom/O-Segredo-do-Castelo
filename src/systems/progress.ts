import type { EventBus, GameEvents } from '../core/EventBus';
import type { Notice } from './rules';

/**
 * Liga as regras do jogo ao EventBus: cada aviso que as regras devolvem vira um evento
 * ('quest:started', 'quest:advanced', 'quest:done', 'item:got', ...). Quem quer reagir
 * (HUD com a comemoração, salvamento, sons) escuta o evento, sem a cena precisar saber.
 */
export function eventsFor(notices: Notice[]): { [K in keyof GameEvents]: [K, GameEvents[K]] }[keyof GameEvents][] {
  const out: { [K in keyof GameEvents]: [K, GameEvents[K]] }[keyof GameEvents][] = [];
  for (const n of notices) {
    switch (n.kind) {
      case 'quest-start': out.push(['quest:started', { quest: n.ref ?? '', text: n.text }]); break;
      case 'quest-update': out.push(['quest:advanced', { quest: n.ref ?? '', text: n.text }]); break;
      case 'quest-done': out.push(['quest:done', { quest: n.ref ?? '', text: n.text }]); break;
      case 'item': if (n.ref) out.push(['item:got', { item: n.ref }]); break;
      case 'spell': if (n.ref) out.push(['spell:learned', { spell: n.ref }]); break;
      case 'level': out.push(['level:up', { text: n.text }]); break;
      default: break;
    }
  }
  return out;
}

export function emitNotices(bus: EventBus<GameEvents>, notices: Notice[]): void {
  for (const [name, payload] of eventsFor(notices)) bus.emit(name, payload as never);
}

/** Eventos que mudam o progresso: o jogo salva na hora, sem esperar trocar de sala. */
export const SAVE_ON: (keyof GameEvents)[] = ['quest:started', 'quest:advanced', 'quest:done', 'item:got', 'spell:learned', 'level:up', 'dialogue:end'];

/** Salva a partida sempre que o progresso muda. Devolve a função que desliga. */
export function autosave(bus: EventBus<GameEvents>, save: () => void): () => void {
  const offs = SAVE_ON.map((e) => bus.on(e, () => save()));
  return () => offs.forEach((off) => off());
}

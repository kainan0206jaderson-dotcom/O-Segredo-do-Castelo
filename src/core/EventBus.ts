/** Canal único de mensagens entre sistemas e cenas. */
type Handler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as Handler<never>);
    return () => this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers.get(event)?.forEach((h) => (h as Handler<Events[K]>)(payload));
  }
}

/** Eventos do jogo. As regras viram eventos em systems/progress.ts; HUD e salvamento escutam. */
export interface GameEvents extends Record<string, unknown> {
  'map:entered': { map: string };
  'quest:started': { quest: string; text: string };
  /** Uma etapa da missão terminou e a próxima começou. */
  'quest:advanced': { quest: string; text: string };
  'quest:done': { quest: string; text: string };
  'item:got': { item: string };
  'spell:learned': { spell: string };
  'level:up': { text: string };
  'dialogue:start': { id: string };
  'dialogue:end': { id: string };
}

export const events = new EventBus<GameEvents>();

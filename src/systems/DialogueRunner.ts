import type { GameState } from '../core/GameState';
import type { DialogueDef, DialogueNode } from '../types/content';
import { apply, check, type ContentDb, type Notice } from './rules';

export interface DialogueView {
  speaker: string;
  text: string;
  /** Escolhas visíveis; vazio quando é só avançar. */
  choices: string[];
  /** Efeito de cena da fala, se houver (ver DialogueNode.cena). */
  cena?: string;
}

/**
 * Percorre um diálogo: escolhe a entrada pelas condições, aplica os efeitos
 * de cada fala ao entrar nela e devolve o que a tela deve mostrar.
 */
export class DialogueRunner {
  private node?: DialogueNode;
  private visibleChoices: NonNullable<DialogueNode['choices']> = [];
  readonly notices: Notice[] = [];

  constructor(
    private readonly def: DialogueDef,
    private readonly state: GameState,
    private readonly db: ContentDb,
  ) {
    const entry = def.entries.find((e) => check(e.when, state));
    if (!entry) throw new Error(`diálogo ${def.id}: nenhuma entrada vale agora`);
    this.enter(entry.start);
  }

  get finished(): boolean {
    return !this.node;
  }

  view(): DialogueView | undefined {
    if (!this.node) return undefined;
    return { speaker: this.node.speaker ?? this.def.speaker, text: (this.state.modo === 'kids' && this.node.kids) || this.node.text, choices: this.visibleChoices.map((c) => c.text), cena: this.node.cena };
  }

  /** Avança uma fala sem escolhas. */
  next(): void {
    if (!this.node || this.visibleChoices.length) return;
    const branch = this.node.nextIf?.find((b) => check(b.when, this.state));
    this.enter(branch ? branch.next : this.node.next ?? null);
  }

  choose(index: number): void {
    const c = this.visibleChoices[index];
    if (!c) return;
    for (const e of c.effects ?? []) this.notices.push(...apply(e, this.state, this.db));
    this.enter(c.next);
  }

  private enter(id: string | null): void {
    if (id === null) {
      this.node = undefined;
      this.visibleChoices = [];
      return;
    }
    const node = this.def.nodes[id];
    if (!node) throw new Error(`diálogo ${this.def.id}: fala "${id}" não existe`);
    this.node = node;
    this.visibleChoices = (node.choices ?? []).filter((c) => check(c.when, this.state));
    for (const e of node.effects ?? []) this.notices.push(...apply(e, this.state, this.db));
  }
}

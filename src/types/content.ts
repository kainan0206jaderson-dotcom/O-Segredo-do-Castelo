/** Formato dos arquivos em content/. Tudo que é texto do jogo mora lá. */

export type FlagValue = string | number | boolean;

export type Condition =
  | { flag: string; eq?: FlagValue }
  | { questStage: string; stage: string }
  | { questDone: string }
  | { questActive: string }
  | { hasItem: string }
  | { hasSpell: string }
  | { knowsRecipe: string }
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] };

export type Effect =
  | { setFlag: string; value: FlagValue }
  | { giveItem: string; count?: number }
  | { takeItem: string; count?: number }
  | { startQuest: string }
  | { advanceQuest: string; to: string }
  | { completeQuest: string }
  | { learnSpell: string }
  | { learnRecipe: string };

export interface DialogueChoice {
  text: string;
  next: string | null;
  when?: Condition;
  effects?: Effect[];
}

export interface DialogueNode {
  speaker?: string;
  text: string;
  next?: string | null;
  choices?: DialogueChoice[];
  effects?: Effect[];
}

export interface DialogueDef {
  id: string;
  speaker: string;
  entries: { when?: Condition; start: string }[];
  nodes: Record<string, DialogueNode>;
}

export interface QuestStageDef {
  id: string;
  objective: string;
  /** Quando a condição vale, a missão avança sozinha para a etapa "then" (ou termina, se "then" faltar). */
  completeWhen?: Condition;
  then?: string;
}

export interface QuestDef {
  title: string;
  stages: QuestStageDef[];
}

export interface ItemDef {
  name: string;
  kind: 'objeto' | 'ingrediente' | 'pocao';
  description: string;
}

export interface SpellDef {
  name: string;
  /** "principal" faz parte da história; "extra" se aprende em desafios opcionais. */
  kind: 'principal' | 'extra';
  description: string;
  /** Tipo de alvo no mapa que o feitiço afeta ("vela", "trancado"...), ou "nenhum". */
  target: string;
  fx: string;
}

export interface RecipeDef {
  ingredients: Record<string, number>;
  result: string;
}

export interface ChallengeDef {
  title: string;
  description: string;
  map: string;
  requires?: Condition;
  lockedText: string;
  timeLimitMs: number;
  targets: string[];
  reward: Effect[];
}

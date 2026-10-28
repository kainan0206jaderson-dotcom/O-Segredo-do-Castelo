/** Formato dos arquivos em content/. Tudo que é texto do jogo mora lá. */

export type FlagValue = string | number | boolean;

export type Condition =
  | { flag: string; eq?: FlagValue }
  | { questStage: string; stage: string }
  | { questDone: string }
  | { questActive: string }
  | { hasItem: string }
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] };

export type Effect =
  | { setFlag: string; value: FlagValue }
  | { giveItem: string; count?: number }
  | { takeItem: string; count?: number }
  | { startQuest: string }
  | { advanceQuest: string; to: string }
  | { completeQuest: string };

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

export interface QuestDef {
  title: string;
  stages: { id: string; objective: string }[];
}

export interface ItemDef {
  name: string;
  description: string;
}

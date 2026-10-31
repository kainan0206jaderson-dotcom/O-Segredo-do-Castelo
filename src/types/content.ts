/** Formato dos arquivos em content/. Tudo que é texto do jogo mora lá. */

export type FlagValue = string | number | boolean;

export type Condition =
  | { flag: string; eq?: FlagValue }
  /** Flag numérica (contador) com valor mínimo. */
  | { flagAtLeast: string; n: number }
  | { questStage: string; stage: string }
  | { questDone: string }
  | { questActive: string }
  | { hasItem: string }
  /** Quantidade mínima de um item na bolsa. */
  | { itemAtLeast: string; n: number }
  | { hasSpell: string }
  /** Desafio já vencido pelo menos uma vez. */
  | { challengeDone: string }
  | { knowsRecipe: string }
  | { house: string }
  | { minLevel: number }
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
  | { learnRecipe: string }
  | { giveXp: number }
  | { setHouse: string }
  | { equip: string }
  | { heal: number }
  | { restoreEnergy: number }
  /** Mostra um tutorial curto (só na primeira vez). */
  | { tutorial: string }
  /** Fecha um ato com a tela de fim de ato. */
  | { endAct: number };

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
  /** Próxima fala que depende do momento do jogo: vale a primeira cuja condição é verdadeira; sem nenhuma, vale "next". */
  nextIf?: { when: Condition; next: string | null }[];
  choices?: DialogueChoice[];
  effects?: Effect[];
  /** Efeito de cena enquanto a fala aparece (ex.: "chapeu" põe o Chapéu das Virtudes no aprendiz). */
  cena?: string;
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
  /**
   * Modo Kids: para onde a trilha de estrelinhas aponta. Vale o primeiro alvo
   * cuja condição é verdadeira (alvo = nome de um objeto do mapa).
   */
  guia?: { map: string; alvo: string; when?: Condition }[];
}

export interface QuestDef {
  title: string;
  /** Principal (história) ou secundária (opcional). */
  kind?: 'principal' | 'secundaria';
  /** Experiência ao concluir. */
  xp?: number;
  stages: QuestStageDef[];
}

export interface StatBonus {
  vida?: number;
  energia?: number;
  /** Força extra contra criaturas. */
  poder?: number;
  /** Multiplicador extra de velocidade (0.1 = 10% mais rápido). */
  velocidade?: number;
  /** Milissegundos a menos para recuperar 1 de energia. */
  regen?: number;
}

export interface ItemDef {
  name: string;
  kind: 'objeto' | 'ingrediente' | 'pocao' | 'equipamento';
  description: string;
  /** Poções: efeitos ao usar (o item é gasto). */
  use?: Effect[];
  /** Equipamentos: onde veste, a aparência do aprendiz e o bônus. */
  slot?: 'capa' | 'amuleto' | 'anel' | 'broche' | 'pena' | 'medalha';
  sheet?: string;
  bonus?: StatBonus;
  /** Efeitos ao pegar o item do chão (começar uma missão, por exemplo). */
  onPickup?: Effect[];
}

export interface SpellDef {
  name: string;
  /** "principal" faz parte da história; "extra" se aprende em desafios opcionais. */
  kind: 'principal' | 'extra';
  description: string;
  /** Tipo de alvo no mapa que o feitiço afeta ("vela", "trancado"...), ou "nenhum". */
  target: string;
  fx: string;
  /** Energia mágica gasta a cada uso. */
  cost: number;
  /** Feitiços sem alvo podem ter um efeito no próprio aprendiz. */
  self?: 'velocidade' | 'escudo' | 'zaparatar' | 'onda' | 'guia';
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
  /**
   * "acender": velas com Lumen; "levitar": levar objetos flutuando até os encaixes;
   * "espectral": levas de espectros invisíveis (alvos = grupos de criaturas, uma leva por vez).
   */
  kind: 'acender' | 'levitar' | 'espectral';
  targets: string[];
  reward: Effect[];
  /** Prêmio menor nas vitórias seguintes (desafios que valem repetir). */
  repeatReward?: Effect[];
  /** Tutorial mostrado antes da primeira tentativa. */
  tutorial?: string;
  /** "levitar": tipo do objeto que volta ao lugar quando o desafio começa (padrão: cálice). */
  levitavel?: string;
  /** Série de desafios (ex.: "professores"): vencer todos dá o prêmio de progression.series. */
  serie?: string;
}

export interface HouseDef {
  name: string;
  virtue: string;
  description: string;
  /** Capa que o aprendiz ganha ao escolher a casa. */
  capa: string;
}

export interface LevelDef {
  xp: number;
  vida: number;
  energia: number;
  /** Força dos feitiços contra criaturas. */
  poder: number;
}

export interface ProgressionDef {
  levels: LevelDef[];
  /** Tempo para recuperar 1 ponto de energia. */
  regenMs: number;
  /** Experiência por criatura espantada. */
  creatureXp: number;
  /** Prêmio por vencer todos os desafios de uma série (ChallengeDef.serie). */
  series?: Record<string, Effect[]>;
}

export interface TutorialDef {
  title: string;
  pages: { text: string; touch?: string; icon?: string }[];
}

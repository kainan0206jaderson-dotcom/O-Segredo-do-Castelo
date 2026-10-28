import { readFileSync, readdirSync } from 'node:fs';
import type { ChallengeDef, DialogueDef, HouseDef, ItemDef, ProgressionDef, QuestDef, RecipeDef, SpellDef, TutorialDef } from '../src/types/content';
import type { ContentDb } from '../src/systems/rules';

/** Mesmo conteúdo que o jogo usa, lido do disco (o jogo usa import.meta.glob do Vite). */
export const dialogues: Record<string, DialogueDef> = Object.fromEntries(
  readdirSync('content/dialogues').map((f) => {
    const d = JSON.parse(readFileSync(`content/dialogues/${f}`, 'utf8')) as DialogueDef;
    return [d.id, d];
  }),
);
export const db: ContentDb = {
  quests: JSON.parse(readFileSync('content/quests.json', 'utf8')) as Record<string, QuestDef>,
  items: JSON.parse(readFileSync('content/items.json', 'utf8')) as Record<string, ItemDef>,
  spells: JSON.parse(readFileSync('content/spells.json', 'utf8')) as Record<string, SpellDef>,
  recipes: JSON.parse(readFileSync('content/recipes.json', 'utf8')) as Record<string, RecipeDef>,
  challenges: JSON.parse(readFileSync('content/challenges.json', 'utf8')) as Record<string, ChallengeDef>,
  houses: JSON.parse(readFileSync('content/houses.json', 'utf8')) as Record<string, HouseDef>,
  progression: JSON.parse(readFileSync('content/progression.json', 'utf8')) as ProgressionDef,
  tutorials: JSON.parse(readFileSync('content/tutorials.json', 'utf8')) as Record<string, TutorialDef>,
};

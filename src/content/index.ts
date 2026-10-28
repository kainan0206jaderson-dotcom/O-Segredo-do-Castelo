import type { ChallengeDef, DialogueDef, HouseDef, ItemDef, ProgressionDef, QuestDef, RecipeDef, SpellDef, TutorialDef } from '../types/content';
import type { ContentDb } from '../systems/rules';
import quests from '../../content/quests.json';
import items from '../../content/items.json';
import spells from '../../content/spells.json';
import recipes from '../../content/recipes.json';
import challenges from '../../content/challenges.json';
import houses from '../../content/houses.json';
import progression from '../../content/progression.json';
import tutorials from '../../content/tutorials.json';

const dialogueFiles = import.meta.glob<DialogueDef>('../../content/dialogues/*.json', { eager: true, import: 'default' });

export const dialogues: Record<string, DialogueDef> = Object.fromEntries(
  Object.values(dialogueFiles).map((d) => [d.id, d]),
);

export const db: ContentDb = {
  quests: quests as Record<string, QuestDef>,
  items: items as Record<string, ItemDef>,
  spells: spells as Record<string, SpellDef>,
  recipes: recipes as Record<string, RecipeDef>,
  challenges: challenges as Record<string, ChallengeDef>,
  houses: houses as Record<string, HouseDef>,
  progression: progression as ProgressionDef,
  tutorials: tutorials as Record<string, TutorialDef>,
};

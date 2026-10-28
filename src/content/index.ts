import type { DialogueDef, ItemDef, QuestDef } from '../types/content';
import type { ContentDb } from '../systems/rules';
import quests from '../../content/quests.json';
import items from '../../content/items.json';

const dialogueFiles = import.meta.glob<DialogueDef>('../../content/dialogues/*.json', { eager: true, import: 'default' });

export const dialogues: Record<string, DialogueDef> = Object.fromEntries(
  Object.values(dialogueFiles).map((d) => [d.id, d]),
);

export const db: ContentDb = {
  quests: quests as Record<string, QuestDef>,
  items: items as Record<string, ItemDef>,
};

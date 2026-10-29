import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/GameState';
import { apply, guideTarget, tickQuests } from '../src/systems/rules';
import { nextGuidePoint, type MapObject } from '../src/systems/guia';
import type { AssetManifest } from '../src/core/AssetRegistry';
import { db } from './content-load';

const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;
const objects: Record<string, MapObject[]> = Object.fromEntries(
  Object.entries(manifest.maps).map(([key, def]) => {
    const m = JSON.parse(readFileSync(`public/assets/${def.url}`, 'utf8')) as { layers: { name: string; objects?: MapObject[] }[] };
    return [key, m.layers.find((l) => l.name === 'objetos')?.objects ?? []];
  }),
);
/** Castelo com todas as portas abertas (sem as condições), para checar que todo alvo tem caminho. */
const semTrancas = (map: string) =>
  objects[map]?.map((o) => ({ ...o, properties: o.properties?.filter((p) => p.name !== 'when') }));

describe('Modo Kids: trilha de estrelinhas', () => {
  const alvos = Object.entries(db.quests).flatMap(([q, def]) =>
    def.stages.flatMap((st) => (st.guia ?? []).map((g) => ({ where: `${q}/${st.id}`, ...g }))));

  it('toda etapa principal tem para onde apontar (menos o duelo)', () => {
    for (const [q, def] of Object.entries(db.quests)) {
      if (def.kind === 'secundaria') continue;
      for (const st of def.stages) if (st.id !== 'enfrentar-morgana') expect(st.guia?.length, `${q}/${st.id}`).toBeGreaterThan(0);
    }
  });

  it.each(alvos.map((a) => [a.where, a.map, a.alvo]))('%s: %s#%s existe e tem caminho desde o Grande Salão', (_w, map, alvo) => {
    expect(objects[map]?.some((o) => o.name === alvo), `${map}#${alvo}`).toBe(true);
    const s = newGame('map.grande-salao', 'inicio');
    expect(nextGuidePoint('map.grande-salao', { map, alvo }, s, semTrancas)).toBeDefined();
  });

  it('na Luz na Cozinha, aponta despensa, caldeirão, Dona Brasa e velas na ordem certa', () => {
    const s = newGame('map.grande-salao', 'inicio');
    apply({ startQuest: 'luz-na-cozinha' }, s, db);
    apply({ advanceQuest: 'luz-na-cozinha', to: 'preparar-drink' }, s, db);
    expect(guideTarget(s, db)).toEqual({ map: 'map.cozinha', alvo: 'despensa' });
    apply({ giveItem: 'suco-colorido' }, s, db);
    apply({ giveItem: 'gelo-seco' }, s, db);
    expect(guideTarget(s, db)?.alvo).toBe('caldeirao');
    apply({ giveItem: 'drink-fumegante' }, s, db);
    tickQuests(s, db);
    expect(guideTarget(s, db)?.alvo).toBe('dona-brasa');
    apply({ advanceQuest: 'luz-na-cozinha', to: 'acender-velas' }, s, db);
    expect(guideTarget(s, db)?.alvo).toBe('vela-a');
    s.flags['vela:map.cozinha:vela-a'] = true;
    expect(guideTarget(s, db)?.alvo).toBe('vela-b');
  });

  it('fora da sala do alvo, aponta a porta certa', () => {
    const s = newGame('map.grande-salao', 'inicio');
    const p = nextGuidePoint('map.grande-salao', { map: 'map.cozinha', alvo: 'dona-brasa' }, s, (m) => objects[m]);
    const leste = objects['map.grande-salao'].find((o) => o.name === 'porta-da-cozinha')!;
    expect(p?.door).toBe(true);
    expect(p?.x).toBeCloseTo(leste.x + (leste.width ?? 0) / 2);
  });
});

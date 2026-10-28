import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { AssetManifest } from '../src/core/AssetRegistry';
import { prop } from '../src/core/tiled';

interface TiledObject { name: string; type: string; properties?: unknown }
interface TiledMap { layers: { name: string; type: string; objects?: TiledObject[] }[]; properties?: unknown }

const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;
const maps = Object.fromEntries(
  Object.entries(manifest.maps).map(([key, def]) => [key, JSON.parse(readFileSync(`public/assets/${def.url}`, 'utf8')) as TiledMap]),
);
const objectsOf = (m: TiledMap) => m.layers.find((l) => l.name === 'objetos')?.objects ?? [];

describe('mapas', () => {
  it.each(Object.keys(maps))('%s tem nome, camadas de chão e paredes', (key) => {
    const m = maps[key];
    expect(prop(m.properties, 'nome')).toBeTruthy();
    expect(m.layers.map((l) => l.name)).toEqual(expect.arrayContaining(['chao', 'paredes', 'objetos']));
  });

  it('toda porta leva a um mapa e a uma chegada que existem', () => {
    for (const [key, m] of Object.entries(maps)) {
      for (const door of objectsOf(m).filter((o) => o.type === 'door')) {
        const target = prop(door.properties, 'target')!;
        const spawn = prop(door.properties, 'spawn')!;
        expect(maps[target], `${key}/${door.name} -> ${target}`).toBeDefined();
        expect(objectsOf(maps[target]).some((o) => o.type === 'spawn' && o.name === spawn), `${key}/${door.name} -> ${target}#${spawn}`).toBe(true);
      }
    }
  });

  it('todo objeto decorativo usa um sprite do manifesto', () => {
    for (const m of Object.values(maps)) {
      for (const o of objectsOf(m).filter((o) => o.type === 'prop')) {
        expect(manifest.spritesheets[prop(o.properties, 'sprite')!]).toBeDefined();
      }
    }
  });

  it('todo NPC usa sprite do manifesto e um diálogo que existe', () => {
    for (const m of Object.values(maps)) {
      for (const o of objectsOf(m).filter((o) => o.type === 'npc')) {
        expect(manifest.spritesheets[prop(o.properties, 'sprite')!]).toBeDefined();
        expect(existsSync(`content/dialogues/${prop(o.properties, 'dialogue')}.json`), o.name).toBe(true);
      }
    }
  });

  it('as 3 salas da etapa 1 estão conectadas a partir da recepção', () => {
    const seen = new Set(['map.recepcao']);
    const queue = ['map.recepcao'];
    while (queue.length) {
      for (const d of objectsOf(maps[queue.shift()!]).filter((o) => o.type === 'door')) {
        const t = prop(d.properties, 'target')!;
        if (!seen.has(t)) { seen.add(t); queue.push(t); }
      }
    }
    expect([...seen].sort()).toEqual(['map.cozinha', 'map.grande-salao', 'map.recepcao']);
  });
});

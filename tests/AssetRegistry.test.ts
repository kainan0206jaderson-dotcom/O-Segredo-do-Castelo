import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AssetRegistry, type AssetManifest } from '../src/core/AssetRegistry';

const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as AssetManifest;

describe('AssetRegistry', () => {
  it('aceita o manifesto do projeto', () => {
    expect(AssetRegistry.validate(manifest)).toEqual([]);
  });

  it('o aprendiz tem andar e parado nas 3 direções', () => {
    const r = new AssetRegistry(manifest);
    for (const dir of ['down', 'up', 'side']) {
      expect(r.hasAnimation('player.aprendiz', `walk-${dir}`)).toBe(true);
      expect(r.hasAnimation('player.aprendiz', `idle-${dir}`)).toBe(true);
    }
  });

  it('monta a fila de carregamento com o caminho base', () => {
    const q = new AssetRegistry(manifest, 'assets/').loadQueue();
    expect(q).toContainEqual(expect.objectContaining({ type: 'tilemap', key: 'map.grande-salao', url: 'assets/maps/grande-salao.tmj' }));
  });

  it('recusa mapa que usa tileset inexistente', () => {
    const bad = { ...manifest, maps: { x: { url: 'x.tmj', tilesets: ['nao-existe'] } } };
    expect(AssetRegistry.validate(bad)).toContain('x: tileset "nao-existe" não existe no manifesto');
  });

  it('cada quadro de animação existe no PNG declarado', async () => {
    const { imageSize } = await import('./helpers/png');
    for (const [key, s] of Object.entries(manifest.spritesheets)) {
      const { width, height } = imageSize(`public/assets/${s.url}`);
      const total = (width / s.frameWidth) * (height / s.frameHeight);
      for (const a of Object.values(s.animations)) {
        expect(Math.max(...a.frames), key).toBeLessThan(total);
      }
    }
  });
});

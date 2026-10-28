import Phaser from 'phaser';
import { AssetRegistry, type AssetManifest } from '../core/AssetRegistry';
import { setAssets } from '../core/registry';
import { ASSET_BASE, MANIFEST_URL } from '../config/game';

/** Lê só o manifesto; o resto é carregado pela PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.json('manifest', MANIFEST_URL);
  }

  create(): void {
    setAssets(new AssetRegistry(this.cache.json.get('manifest') as AssetManifest, ASSET_BASE));
    this.scene.start('Preload');
  }
}

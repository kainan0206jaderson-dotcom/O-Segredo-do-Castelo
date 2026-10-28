import Phaser from 'phaser';
import { AssetRegistry, type AssetManifest } from '../core/AssetRegistry';
import { setAssets } from '../core/registry';
import { ASSET_BASE, MANIFEST_URL } from '../config/game';
import { FONT_FAMILY } from '../ui/theme';

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
    // a fonte de pixel precisa estar pronta antes do primeiro texto; se falhar, segue com a reserva
    loadFont().finally(() => this.scene.start('Preload'));
  }
}

async function loadFont(): Promise<void> {
  try {
    const face = new FontFace(FONT_FAMILY, `url(fonts/PixelifySans.ttf)`);
    document.fonts.add(await face.load());
  } catch {
    // sem a fonte, o texto usa a fonte reserva do tema
  }
}

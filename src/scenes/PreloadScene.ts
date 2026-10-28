import Phaser from 'phaser';
import { assets } from '../core/registry';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const w = 200;
    const x = (GAME_WIDTH - w) / 2;
    const y = GAME_HEIGHT / 2;
    this.add.rectangle(x, y, w, 6, 0x3a3150).setOrigin(0, 0.5);
    const bar = this.add.rectangle(x, y, 1, 6, 0xfad65c).setOrigin(0, 0.5);
    this.add.text(GAME_WIDTH / 2, y - 16, 'Abrindo os portões do castelo...', { fontFamily: 'monospace', fontSize: '10px', color: '#e8e0f0' })
      .setOrigin(0.5).setResolution(4);
    this.load.on('progress', (p: number) => (bar.width = Math.max(1, w * p)));

    for (const item of assets().loadQueue()) {
      if (item.type === 'spritesheet') this.load.spritesheet(item.key, item.url, { frameWidth: item.frameWidth, frameHeight: item.frameHeight });
      else if (item.type === 'image') this.load.image(item.key, item.url);
      else this.load.tilemapTiledJSON(item.key, item.url);
    }
  }

  create(): void {
    for (const { key, sheet, def } of assets().animations()) {
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(sheet, { frames: def.frames }), frameRate: def.frameRate, repeat: def.repeat });
    }
    this.scene.start('World', { map: 'map.grande-salao' });
  }
}

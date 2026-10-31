import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';
import { torchHalo } from '../world/Lighting';

/** Alvo de feitiço do tipo "vela": acende com Lumen. */
export class Candle extends Phaser.GameObjects.Sprite {
  private litNow: boolean;
  private readonly halo: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly sheet: string, readonly targetName: string, readonly targetKind: string, lit: boolean) {
    super(scene, x, y, sheet, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(y);
    this.litNow = lit;
    this.halo = torchHalo(scene, x, y - this.height + 4);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.halo.destroy());
    this.refresh();
  }

  get lit(): boolean {
    return this.litNow;
  }

  setLit(on: boolean): void {
    if (on === this.litNow) return;
    this.litNow = on;
    this.refresh();
    if (on) {
      const glow = this.scene.add.circle(this.x, this.y - 12, 3, 0xfad65c, 0.8).setDepth(this.depth + 1);
      this.scene.tweens.add({ targets: glow, radius: 14, alpha: 0, duration: 380, onComplete: () => glow.destroy() });
    }
  }

  private refresh(): void {
    this.halo.setVisible(this.litNow);
    if (this.litNow) this.play({ key: AssetRegistry.animKey(this.sheet, 'idle'), startFrame: Phaser.Math.Between(0, 3) });
    else this.play(AssetRegistry.animKey(this.sheet, 'apagada'));
  }
}

import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';
import { PLAYER_SPEED } from '../config/game';

type Facing = 'down' | 'up' | 'side';
const SHEET = 'player.aprendiz';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: Facing = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, SHEET, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // caixa de colisão só nos pés, como em jogos top-down
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(3, 17);
    this.setOrigin(0.5, 1);
    this.play(AssetRegistry.animKey(SHEET, 'idle-down'));
  }

  move(dir: Phaser.Math.Vector2): void {
    this.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED);
    const moving = dir.lengthSq() > 0;
    if (moving) {
      this.facing = Math.abs(dir.x) > Math.abs(dir.y) ? 'side' : dir.y < 0 ? 'up' : 'down';
      if (this.facing === 'side') this.setFlipX(dir.x < 0);
    }
    this.play(AssetRegistry.animKey(SHEET, `${moving ? 'walk' : 'idle'}-${this.facing}`), true);
    this.setDepth(this.y);
  }
}

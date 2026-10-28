import Phaser from 'phaser';
import { TILE_SIZE } from '../config/game';

/** Estátua pesada: não levita, só anda um quadrado quando o aprendiz empurra. */
export class Pushable extends Phaser.GameObjects.Sprite {
  sliding = false;

  constructor(scene: Phaser.Scene, x: number, y: number, sheet: string, readonly thingName: string, readonly group: string) {
    super(scene, x, y, sheet, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(y);
    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(14, 12).setOffset((this.width - 14) / 2, this.height - 12);
  }

  get tileX(): number {
    return Math.floor(this.x / TILE_SIZE);
  }

  get tileY(): number {
    return Math.floor((this.y - 1) / TILE_SIZE);
  }

  /** Coloca direto num quadrado (ao carregar uma sala com o enigma já resolvido). */
  placeAt(tx: number, ty: number): void {
    this.setPosition(tx * TILE_SIZE + TILE_SIZE / 2, (ty + 1) * TILE_SIZE).setDepth(this.y);
    (this.body as Phaser.Physics.Arcade.StaticBody).reset();
  }

  slideTo(tx: number, ty: number, onDone: () => void): void {
    this.sliding = true;
    this.scene.tweens.add({
      targets: this,
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: (ty + 1) * TILE_SIZE,
      duration: 200,
      ease: 'Quad.out',
      onUpdate: () => {
        this.setDepth(this.y);
        (this.body as Phaser.Physics.Arcade.StaticBody).reset();
      },
      onComplete: () => {
        this.sliding = false;
        onDone();
      },
    });
  }
}

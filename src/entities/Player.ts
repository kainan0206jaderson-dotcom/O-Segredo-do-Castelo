import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';
import { PLAYER_SPEED } from '../config/game';
import { playerSheet } from '../core/aparencia';

export type Facing = 'down' | 'up' | 'side';
export const DEFAULT_SHEET = 'player.aprendiz';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: Facing = 'down';
  private sheet: string;
  /** Multiplicador de velocidade (capa da Astúcia, Passo de Vento). */
  speedMul = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, facing: Facing = 'down', sheet = DEFAULT_SHEET) {
    super(scene, x, y, playerSheet(sheet), 0);
    this.sheet = sheet;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // caixa de colisão só nos pés, como em jogos top-down
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(3, 17);
    this.setOrigin(0.5, 1);
    this.facing = facing;
    this.play(AssetRegistry.animKey(playerSheet(sheet), `idle-${facing}`));
  }

  move(dir: Phaser.Math.Vector2): void {
    this.setVelocity(dir.x * PLAYER_SPEED * this.speedMul, dir.y * PLAYER_SPEED * this.speedMul);
    const moving = dir.lengthSq() > 0;
    if (moving) {
      this.facing = Math.abs(dir.x) > Math.abs(dir.y) ? 'side' : dir.y < 0 ? 'up' : 'down';
      if (this.facing === 'side') this.setFlipX(dir.x < 0);
    }
    // a folha certa (menino ou menina) é resolvida aqui, então trocar nas Opções vale na hora
    this.play(AssetRegistry.animKey(playerSheet(this.sheet), `${moving ? 'walk' : 'idle'}-${this.facing}`), true);
    this.setDepth(this.y);
  }

  /** Troca a roupa (capa) mantendo a animação atual. */
  setSheet(sheet: string): void {
    if (sheet === this.sheet) return;
    this.sheet = sheet;
    this.setTexture(playerSheet(sheet), 0);
    this.play(AssetRegistry.animKey(playerSheet(sheet), `idle-${this.facing}`));
  }

  halt(): void {
    this.move(new Phaser.Math.Vector2());
  }

  /** Ponto logo à frente do personagem, usado para interações e feitiços. */
  frontPoint(distance = 12): Phaser.Math.Vector2 {
    const dx = this.facing === 'side' ? (this.flipX ? -1 : 1) : 0;
    const dy = this.facing === 'down' ? 1 : this.facing === 'up' ? -1 : 0;
    return new Phaser.Math.Vector2(this.x + dx * distance, this.y - 8 + dy * distance);
  }
}

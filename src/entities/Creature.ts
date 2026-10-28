import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';
import type { Condition } from '../types/content';

const WANDER_SPEED = 22;
const CHASE_SPEED = 36;
const SIGHT = 96;

/** Sombrinha de fuligem: anda à toa, persegue o aprendiz de perto e foge da luz. */
export class Creature extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  private turnIn = 0;
  private stunnedUntil = 0;
  private present = true;

  constructor(
    scene: Phaser.Scene, x: number, y: number,
    readonly sheet: string, readonly thingName: string, readonly group: string, hp: number, readonly when?: Condition,
  ) {
    super(scene, x, y, sheet, 0);
    this.hp = hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8).setOffset(3, 7);
    this.play({ key: AssetRegistry.animKey(sheet, 'idle'), startFrame: Phaser.Math.Between(0, 3) });
    this.setAlpha(0.92);
  }

  get isPresent(): boolean {
    return this.present && this.active;
  }

  setPresent(on: boolean): void {
    this.present = on;
    this.setVisible(on);
    (this.body as Phaser.Physics.Arcade.Body).enable = on;
    if (!on) this.setVelocity(0, 0);
  }

  think(target: { x: number; y: number }, now: number, deltaMs: number): void {
    if (!this.isPresent) return;
    this.setDepth(this.y);
    if (now < this.stunnedUntil) return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (d < SIGHT) {
      const v = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y).setLength(CHASE_SPEED);
      this.setVelocity(v.x, v.y);
      this.setFlipX(v.x < 0);
      return;
    }
    this.turnIn -= deltaMs;
    if (this.turnIn <= 0) {
      this.turnIn = Phaser.Math.Between(900, 1800);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const still = Math.random() < 0.3;
      this.setVelocity(still ? 0 : Math.cos(a) * WANDER_SPEED, still ? 0 : Math.sin(a) * WANDER_SPEED);
    }
  }

  /** Leva um feitiço de luz. Devolve true se foi espantada de vez. */
  takeHit(power: number, from: { x: number; y: number }, now: number): boolean {
    this.hp -= power;
    this.stunnedUntil = now + 450;
    const away = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).setLength(110);
    this.setVelocity(away.x, away.y);
    this.play(AssetRegistry.animKey(this.sheet, 'hit'));
    this.scene.time.delayedCall(180, () => {
      if (this.active && this.hp > 0) this.play(AssetRegistry.animKey(this.sheet, 'idle'));
    });
    return this.hp <= 0;
  }

  /** Breve pausa depois de encostar no aprendiz, para não tirar vida em sequência. */
  recoil(from: { x: number; y: number }, now: number): void {
    this.stunnedUntil = now + 700;
    const away = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).setLength(70);
    this.setVelocity(away.x, away.y);
  }
}

import Phaser from 'phaser';
import { dropShadow } from '../world/Lighting';
import { AssetRegistry } from '../core/AssetRegistry';
import type { Condition } from '../types/content';

const WANDER_SPEED = 22;
const CHASE_SPEED = 36;
const SIGHT = 96;
const HIDDEN_ALPHA = 0.12;

export interface CreatureOptions {
  hp: number;
  when?: Condition;
  /** Espectro: quase invisível e intocável por feitiços até alguém lançar Revelar. */
  hidden?: boolean;
  /** Não anda nem machuca (âncoras de fuligem). */
  still?: boolean;
  /** Só aparece durante este desafio (levas da aula de Seres Espectrais). */
  challenge?: string;
}

/** Sombrinha de fuligem (e parentes): anda à toa, persegue o aprendiz de perto e foge da luz. */
export class Creature extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  readonly when?: Condition;
  readonly hidden: boolean;
  readonly still: boolean;
  readonly challenge?: string;
  private turnIn = 0;
  private stunnedUntil = 0;
  private revealedUntil = 0;
  private present = true;

  constructor(
    scene: Phaser.Scene, x: number, y: number,
    readonly sheet: string, readonly thingName: string, readonly group: string, opts: CreatureOptions,
  ) {
    super(scene, x, y, sheet, 0);
    this.hp = opts.hp;
    this.when = opts.when;
    this.hidden = opts.hidden ?? false;
    this.still = opts.still ?? false;
    this.challenge = opts.challenge;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8).setOffset((this.width - 10) / 2, this.height - 9);
    if (this.still) body.setImmovable(true);
    this.play({ key: AssetRegistry.animKey(sheet, 'idle'), startFrame: Phaser.Math.Between(0, 1) });
    this.setAlpha(this.hidden ? HIDDEN_ALPHA : 0.92);
    dropShadow(scene, this, 12, true);
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

  /** Revelar mostra o espectro por um tempo. */
  reveal(until: number): void {
    if (!this.hidden) return;
    this.revealedUntil = Math.max(this.revealedUntil, until);
  }

  /** Feitiços de luz só acertam o que dá para ver. */
  canBeHit(now: number): boolean {
    return this.isPresent && (!this.hidden || now < this.revealedUntil);
  }

  think(target: { x: number; y: number }, now: number, deltaMs: number): void {
    if (!this.isPresent) return;
    this.setDepth(this.y);
    if (this.hidden) this.setAlpha(now < this.revealedUntil ? 0.9 : HIDDEN_ALPHA);
    if (this.still || now < this.stunnedUntil) return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (d < SIGHT) {
      const v = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y).setLength(this.hidden ? CHASE_SPEED * 0.8 : CHASE_SPEED);
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
    if (!this.still) {
      const away = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).setLength(110);
      this.setVelocity(away.x, away.y);
    }
    this.play(AssetRegistry.animKey(this.sheet, 'hit'));
    this.scene.time.delayedCall(180, () => {
      if (this.active && this.hp > 0) this.play(AssetRegistry.animKey(this.sheet, 'idle'));
    });
    return this.hp <= 0;
  }

  /** Breve pausa depois de encostar no aprendiz, para não tirar vida em sequência. */
  recoil(from: { x: number; y: number }, now: number): void {
    if (this.still) return;
    this.stunnedUntil = now + 700;
    const away = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).setLength(70);
    this.setVelocity(away.x, away.y);
  }
}

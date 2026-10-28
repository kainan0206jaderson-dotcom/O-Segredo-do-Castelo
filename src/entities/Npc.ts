import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';
import { assets } from '../core/registry';

/** Personagem com quem se conversa. "wall" = pendurado na parede (quadros vivos). */
export class Npc extends Phaser.GameObjects.Sprite {
  readonly talkPoint: Phaser.Math.Vector2;
  private alert: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly sheet: string,
    readonly dialogueId: string,
    readonly onWall: boolean,
  ) {
    super(scene, x, y, sheet, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(onWall ? 1 : y);
    // quadros: o jogador fala de pé logo abaixo da moldura
    this.talkPoint = new Phaser.Math.Vector2(x, onWall ? y + 8 : y - 6);
    if (!onWall) {
      scene.physics.add.existing(this, true);
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(12, 6).setOffset((this.width - 12) / 2, this.height - 6);
    }
    this.alert = scene.add.sprite(x, y - this.height - 4, 'ui.alerta').setDepth(1400).setVisible(false);
    this.alert.play(AssetRegistry.animKey('ui.alerta', 'idle'));
    this.playAnim('idle');
  }

  setHighlighted(on: boolean): void {
    this.alert.setVisible(on);
  }

  setTalking(on: boolean): void {
    this.playAnim(on ? 'talk' : 'idle');
  }

  private playAnim(anim: string): void {
    if (assets().hasAnimation(this.sheet, anim)) this.play(AssetRegistry.animKey(this.sheet, anim), true);
  }
}

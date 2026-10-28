import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';
import { assets } from '../core/registry';
import type { Condition } from '../types/content';

export type ThingKind = 'npc' | 'pickup' | 'station' | 'challenge' | 'socket';

export interface ThingOptions {
  kind: ThingKind;
  /** Nome do objeto no mapa (usado nas flags de salvamento). */
  name: string;
  sheet: string;
  frame?: number;
  onWall?: boolean;
  solid?: boolean;
  /** Diálogo, item, estação, desafio ou encaixe, conforme o tipo. */
  ref: string;
  /** Só existe no mundo enquanto a condição vale (ex.: o diretor some depois da cena). */
  when?: Condition;
  /** Texto extra do objeto no mapa (ex.: ingredientes da despensa). */
  extra?: string;
}

/** Qualquer coisa com que o jogador interage pela ação: NPCs, itens no chão, caldeirão, quadro de desafios. */
export class Thing extends Phaser.GameObjects.Sprite {
  readonly talkPoint: Phaser.Math.Vector2;
  readonly kind: ThingKind;
  readonly thingName: string;
  readonly ref: string;
  readonly onWall: boolean;
  readonly when?: Condition;
  readonly extra?: string;
  private alert: Phaser.GameObjects.Sprite;
  private present = true;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly opts: ThingOptions) {
    super(scene, x, y, opts.sheet, opts.frame ?? 0);
    this.kind = opts.kind;
    this.thingName = opts.name;
    this.ref = opts.ref;
    this.onWall = opts.onWall ?? false;
    this.when = opts.when;
    this.extra = opts.extra;
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(this.onWall ? 1 : y);
    // quadros: o jogador fala de pé logo abaixo da moldura
    this.talkPoint = new Phaser.Math.Vector2(x, this.onWall ? y + 8 : y - 6);
    if (opts.solid) {
      scene.physics.add.existing(this, true);
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(12, 6).setOffset((this.width - 12) / 2, this.height - 6);
    }
    this.alert = scene.add.sprite(x, y - this.height - 4, 'ui.alerta').setDepth(1400).setVisible(false);
    this.alert.play(AssetRegistry.animKey('ui.alerta', 'idle'));
    if (opts.kind === 'pickup') {
      scene.tweens.add({ targets: this, y: y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.playAnim('idle');
  }

  /** Está no mundo agora (visível e interagível)? */
  get isPresent(): boolean {
    return this.present;
  }

  /** Mostra ou esconde o objeto, ligando ou desligando a colisão junto. */
  setPresent(on: boolean): void {
    this.present = on;
    this.setVisible(on);
    if (!on) this.alert.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) body.enable = on;
  }

  setHighlighted(on: boolean): void {
    this.alert.setVisible(on && this.present);
  }

  setTalking(on: boolean): void {
    this.playAnim(on ? 'talk' : 'idle');
  }

  remove(): void {
    this.alert.destroy();
    this.destroy();
  }

  private playAnim(anim: string): void {
    if (assets().hasAnimation(this.opts.sheet, anim)) this.play(AssetRegistry.animKey(this.opts.sheet, anim), true);
  }
}

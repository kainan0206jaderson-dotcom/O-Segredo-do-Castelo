import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';

export type BossPhase = 'parada' | 'fase1' | 'fase2';

export interface BossEvents {
  /** Dispara um orbe de fuligem de (x, y) na direção do alvo. */
  fire(x: number, y: number, tx: number, ty: number): void;
  /** Chama sombrinhas para ajudar (começo da fase 2). */
  summon(): void;
  /** A fase acabou (vida da fase zerada). */
  phaseOver(phase: BossPhase): void;
}

const PHASE_HP = 3;
const SHOTS_BEFORE_REST = 4;
const SHOT_MS = { fase1: 1300, fase2: 1500 };
const TIRED_MS = 2800;
const INVISIBLE_ALPHA = 0.06;

/**
 * Morgana no duelo final. Fase 1: atira orbes e cansa depois de alguns
 * disparos (é a hora de acertar). Fase 2: fica invisível; Revelar mostra onde ela está.
 */
export class Boss extends Phaser.GameObjects.Sprite {
  phase: BossPhase = 'parada';
  hp = PHASE_HP;
  private shots = 0;
  private nextShotAt = 0;
  private tiredUntil = 0;
  private revealedUntil = 0;
  private baseY: number;
  private spot = 0;
  private readonly zzz: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene, x: number, y: number, readonly sheet: string,
    private readonly spots: { x: number; y: number }[], private readonly events: BossEvents,
    /** Modo Kids: mais tempo entre os tiros e mais tempo cansada. */
    private readonly slow = 1,
  ) {
    super(scene, x, y, sheet, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(y);
    this.baseY = y;
    this.play(AssetRegistry.animKey(sheet, 'idle'));
    this.zzz = scene.add.text(x, y - 30, 'cansada!', { fontFamily: '"Pixelify Sans", Georgia, serif', fontSize: '8px', color: '#c8c8d6' })
      .setOrigin(0.5).setResolution(4).setDepth(1300).setVisible(false);
  }

  get maxHp(): number {
    return PHASE_HP;
  }

  start(phase: Exclude<BossPhase, 'parada'>, now: number): void {
    this.phase = phase;
    this.hp = PHASE_HP;
    this.shots = 0;
    this.nextShotAt = now + 900;
    this.tiredUntil = 0;
    this.revealedUntil = 0;
    if (phase === 'fase2') this.events.summon();
  }

  /** Pode levar um feitiço agora? */
  canBeHit(now: number): boolean {
    if (this.phase === 'fase1') return now < this.tiredUntil;
    if (this.phase === 'fase2') return now < this.revealedUntil;
    return false;
  }

  reveal(until: number): void {
    if (this.phase === 'fase2') this.revealedUntil = until;
  }

  /** Leva um feitiço de luz. Devolve true se a fase acabou. */
  hit(now: number): boolean {
    this.hp -= 1;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(120, () => this.active && this.clearTint());
    if (this.hp <= 0) {
      const done = this.phase;
      this.phase = 'parada';
      this.tiredUntil = 0;
      this.revealedUntil = now + 999999; // aparece para a conversa
      this.events.phaseOver(done);
      return true;
    }
    if (this.phase === 'fase2') {
      this.revealedUntil = 0;
      this.teleport();
    }
    return false;
  }

  update(now: number, target: { x: number; y: number }): void {
    this.y = this.baseY + Math.sin(now / 300) * 2;
    this.setDepth(this.baseY);
    this.setFlipX(target.x < this.x);
    const tired = this.phase === 'fase1' && now < this.tiredUntil;
    this.zzz.setPosition(this.x, this.baseY - 32).setVisible(tired);
    if (this.phase === 'fase2') this.setAlpha(now < this.revealedUntil ? 0.9 : INVISIBLE_ALPHA);
    else this.setAlpha(tired ? 0.7 : 1);
    if (this.phase === 'parada' || tired) return;
    if (this.phase === 'fase1' && this.tiredUntil && now >= this.tiredUntil) {
      this.tiredUntil = 0;
      this.teleport();
      this.nextShotAt = now + 700;
    }
    if (now < this.nextShotAt) return;
    this.nextShotAt = now + SHOT_MS[this.phase] * this.slow;
    this.events.fire(this.x, this.baseY - 14, target.x, target.y - 8);
    this.shots += 1;
    if (this.phase === 'fase1' && this.shots >= SHOTS_BEFORE_REST) {
      this.shots = 0;
      this.tiredUntil = now + TIRED_MS * this.slow;
    }
  }

  private teleport(): void {
    if (this.spots.length < 2) return;
    this.spot = (this.spot + 1 + Phaser.Math.Between(0, this.spots.length - 2)) % this.spots.length;
    const p = this.spots[this.spot];
    this.x = p.x;
    this.baseY = p.y;
  }

  destroy(fromScene?: boolean): void {
    this.zzz.destroy();
    super.destroy(fromScene);
  }
}

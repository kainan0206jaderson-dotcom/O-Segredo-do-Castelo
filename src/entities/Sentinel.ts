import Phaser from 'phaser';
import { AssetRegistry } from '../core/AssetRegistry';

const VIEW = 60;
const HALF_ANGLE = Phaser.Math.DegToRad(28);
const PAUSE_MS = 700;

/**
 * Olho-sentinela da Morgana: patrulha em linha reta, vai e volta, e enxerga
 * num cone à frente. Quem entra no cone é visto.
 */
export class Sentinel extends Phaser.GameObjects.Sprite {
  private dir = 1;
  private pauseMs = 0;
  private readonly start: number;
  private readonly cone: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene, x: number, y: number, sheet: string,
    private readonly axis: 'x' | 'y', private readonly range: number, private readonly speed: number,
  ) {
    super(scene, x, y, sheet, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(y + 20);
    this.start = axis === 'x' ? x : y;
    this.play(AssetRegistry.animKey(sheet, 'idle'));
    this.cone = scene.add.graphics().setDepth(5);
  }

  /** Para onde o olho está olhando. */
  get facing(): Phaser.Math.Vector2 {
    return this.axis === 'x' ? new Phaser.Math.Vector2(this.dir, 0) : new Phaser.Math.Vector2(0, this.dir);
  }

  update(deltaMs: number): void {
    if (this.pauseMs > 0) {
      this.pauseMs -= deltaMs;
      if (this.pauseMs <= 0) this.dir *= -1;
    } else {
      const step = (this.speed * deltaMs) / 1000 * this.dir;
      const pos = (this.axis === 'x' ? this.x : this.y) + step;
      const min = Math.min(this.start, this.start + this.range);
      const max = Math.max(this.start, this.start + this.range);
      const clamped = Phaser.Math.Clamp(pos, min, max);
      if (this.axis === 'x') this.x = clamped;
      else this.y = clamped;
      if (clamped !== pos) this.pauseMs = PAUSE_MS;
    }
    this.setFlipX(this.axis === 'x' && this.dir < 0);
    this.drawCone();
  }

  private eye(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y - 8);
  }

  private drawCone(): void {
    const e = this.eye();
    const a = this.facing.angle();
    this.cone.clear();
    this.cone.fillStyle(0xaa6edc, 0.22);
    this.cone.slice(e.x, e.y, VIEW, a - HALF_ANGLE, a + HALF_ANGLE, false);
    this.cone.fillPath();
  }

  /** O ponto (pés do aprendiz) está dentro do cone de visão? */
  sees(p: { x: number; y: number }): boolean {
    const e = this.eye();
    const to = new Phaser.Math.Vector2(p.x - e.x, p.y - 4 - e.y);
    if (to.length() > VIEW) return false;
    const diff = Phaser.Math.Angle.Wrap(to.angle() - this.facing.angle());
    return Math.abs(diff) <= HALF_ANGLE;
  }

  destroy(fromScene?: boolean): void {
    this.cone.destroy();
    super.destroy(fromScene);
  }
}

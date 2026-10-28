import Phaser from 'phaser';
import { TILE_SIZE } from '../config/game';

export type LevitableState = 'parado' | 'flutuando' | 'encaixado';

/** Objeto leve (cálice, caixote): o feitiço Levitar faz flutuar e seguir o aprendiz. */
export class Levitable extends Phaser.GameObjects.Sprite {
  state: LevitableState = 'parado';
  private readonly home: Phaser.Math.Vector2;
  private bob = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, sheet: string, readonly thingName: string, readonly kind: string) {
    super(scene, x, y, sheet, 0);
    this.home = new Phaser.Math.Vector2(x, y);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(y);
    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(14, 10).setOffset((this.width - 14) / 2, this.height - 10);
  }

  get tileX(): number {
    return Math.floor(this.x / TILE_SIZE);
  }

  get tileY(): number {
    return Math.floor((this.y - 1) / TILE_SIZE);
  }

  lift(): void {
    this.state = 'flutuando';
    (this.body as Phaser.Physics.Arcade.StaticBody).enable = false;
  }

  /** Segue o aprendiz flutuando atrás e acima dele. */
  follow(target: { x: number; y: number }, deltaMs: number): void {
    this.bob += deltaMs / 260;
    const tx = target.x;
    const ty = target.y - 16 + Math.sin(this.bob) * 2;
    this.x += (tx - this.x) * Math.min(1, deltaMs / 90);
    this.y += (ty - this.y) * Math.min(1, deltaMs / 90);
    this.setDepth(target.y + 1);
  }

  /** Pousa no chão (bloqueia passagem de novo). */
  rest(x: number, y: number): void {
    this.state = 'parado';
    this.setPosition(x, y).setDepth(y);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = true;
    body.reset(); // mantém o tamanho e o deslocamento do corpo
  }

  /** Pousa num encaixe (bandeja ou pedestal): não bloqueia mais. */
  socket(x: number, y: number): void {
    this.state = 'encaixado';
    this.setPosition(x, y).setDepth(y + 1);
    (this.body as Phaser.Physics.Arcade.StaticBody).enable = false;
  }

  goHome(): void {
    this.rest(this.home.x, this.home.y);
  }
}

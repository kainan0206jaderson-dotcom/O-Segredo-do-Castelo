import Phaser from 'phaser';

/**
 * Junta teclado e toque em um único vetor de direção (-1..1).
 * No celular, tocar na metade esquerda da tela cria um joystick virtual.
 * Gamepad entra na etapa 1.
 */
export class InputManager {
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private stickPointer?: Phaser.Input.Pointer;
  private stickOrigin = new Phaser.Math.Vector2();
  private stickVector = new Phaser.Math.Vector2();
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private static readonly RADIUS = 28;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.UP), down: kb.addKey(K.DOWN), left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT),
      w: kb.addKey(K.W), a: kb.addKey(K.A), s: kb.addKey(K.S), d: kb.addKey(K.D),
    };

    this.base = scene.add.circle(0, 0, InputManager.RADIUS, 0xffffff, 0.12).setStrokeStyle(1, 0xffffff, 0.35);
    this.knob = scene.add.circle(0, 0, 10, 0xffffff, 0.35);
    for (const o of [this.base, this.knob]) o.setScrollFactor(0).setDepth(1000).setVisible(false);

    scene.input.addPointer(1);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.stickPointer || !p.wasTouch || p.x > this.scene.scale.gameSize.width / 2) return;
    this.stickPointer = p;
    this.stickOrigin.set(p.x, p.y);
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.knob.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p !== this.stickPointer) return;
    const d = new Phaser.Math.Vector2(p.x - this.stickOrigin.x, p.y - this.stickOrigin.y);
    const len = Math.min(d.length(), InputManager.RADIUS);
    d.setLength(len);
    this.knob.setPosition(this.stickOrigin.x + d.x, this.stickOrigin.y + d.y);
    // zona morta de 20% para não andar com toques leves
    this.stickVector = len < InputManager.RADIUS * 0.2 ? new Phaser.Math.Vector2() : d.clone().scale(1 / InputManager.RADIUS);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p !== this.stickPointer) return;
    this.stickPointer = undefined;
    this.stickVector.set(0, 0);
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  /** Direção desejada, com comprimento máximo 1. */
  direction(): Phaser.Math.Vector2 {
    const k = this.keys;
    const v = new Phaser.Math.Vector2(
      Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown),
      Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown),
    );
    if (v.lengthSq() === 0) v.copy(this.stickVector);
    return v.lengthSq() > 1 ? v.normalize() : v;
  }
}

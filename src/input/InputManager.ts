import Phaser from 'phaser';

/**
 * Junta teclado e toque em comandos únicos: direção (-1..1) e ação.
 * No celular, a metade esquerda da tela vira um joystick virtual e o
 * botão redondo à direita é a ação (interagir / lançar feitiço).
 */
export class InputManager {
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private stickPointer?: Phaser.Input.Pointer;
  private stickOrigin = new Phaser.Math.Vector2();
  private stickVector = new Phaser.Math.Vector2();
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private actionButton?: Phaser.GameObjects.Container;
  private actionQueued = false;
  private navQueued = 0;
  private navHQueued = 0;
  private spellQueued = false;
  private menuQueued = false;
  private static readonly RADIUS = 28;

  constructor(private scene: Phaser.Scene, opts: { touchControls?: boolean } = {}) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.UP), down: kb.addKey(K.DOWN), left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT),
      w: kb.addKey(K.W), a: kb.addKey(K.A), s: kb.addKey(K.S), d: kb.addKey(K.D),
    };

    this.base = scene.add.circle(0, 0, InputManager.RADIUS, 0xffffff, 0.12).setStrokeStyle(1, 0xffffff, 0.35);
    this.knob = scene.add.circle(0, 0, 10, 0xffffff, 0.35);
    for (const o of [this.base, this.knob]) o.setScrollFactor(0).setDepth(1000).setVisible(false);

    const touchControls = opts.touchControls ?? true;
    if (touchControls && InputManager.isTouchDevice(scene)) this.createActionButton();

    // toques rápidos de tecla (apertar e soltar no mesmo quadro) não podem se perder,
    // então ação e navegação são guardadas no próprio evento de tecla
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['KeyE', 'Space', 'Enter', 'NumpadEnter'].includes(e.code)) this.actionQueued = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) this.navQueued = -1;
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.navQueued = 1;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.navHQueued = -1;
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.navHQueued = 1;
      if (e.code === 'KeyQ') this.spellQueued = true;
      if (['KeyI', 'Tab', 'Escape'].includes(e.code)) {
        this.menuQueued = true;
        e.preventDefault();
      }
    });

    if (!touchControls) return;
    scene.input.addPointer(1);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  static isTouchDevice(scene: Phaser.Scene): boolean {
    return scene.sys.game.device.input.touch && window.matchMedia('(pointer: coarse)').matches;
  }

  private createActionButton(): void {
    const { width, height } = this.scene.scale.gameSize;
    const ring = this.scene.add.circle(0, 0, 18, 0xfad65c, 0.18).setStrokeStyle(1, 0xfad65c, 0.7);
    const star = this.scene.add.star(0, 0, 5, 4, 9, 0xfad65c, 0.85);
    this.actionButton = this.scene.add.container(width - 34, height - 34, [ring, star])
      .setScrollFactor(0).setDepth(1000).setSize(44, 44).setInteractive();
    this.actionButton.on('pointerdown', () => {
      this.actionQueued = true;
      this.actionButton!.setScale(0.9);
    });
    this.actionButton.on('pointerup', () => this.actionButton!.setScale(1));
    this.actionButton.on('pointerout', () => this.actionButton!.setScale(1));
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

  /** -1 (cima), 1 (baixo) ou 0, uma vez por toque de tecla. Usado em menus e escolhas. */
  navPressed(): number {
    const nav = this.navQueued;
    this.navQueued = 0;
    return nav;
  }

  /** -1 (esquerda), 1 (direita) ou 0, uma vez por toque de tecla. Usado em abas. */
  navHPressed(): number {
    const nav = this.navHQueued;
    this.navHQueued = 0;
    return nav;
  }

  /** Q: trocar de feitiço. */
  spellCyclePressed(): boolean {
    const p = this.spellQueued;
    this.spellQueued = false;
    return p;
  }

  /** I, Tab ou Esc: abrir ou fechar o grimório. */
  menuPressed(): boolean {
    const p = this.menuQueued;
    this.menuQueued = false;
    return p;
  }

  /** Verdadeiro uma única vez por toque no botão ou tecla (E, Espaço, Enter). */
  actionPressed(): boolean {
    const pressed = this.actionQueued;
    this.actionQueued = false;
    return pressed;
  }
}

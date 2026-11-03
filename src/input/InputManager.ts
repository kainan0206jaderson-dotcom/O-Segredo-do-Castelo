import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_ZOOM } from '../config/game';
import { assets } from '../core/registry';
import { hudLayout } from '../ui/hudLayout';

/** Toque em pixels de jogo (o canvas tem RENDER_ZOOM pixels reais por pixel de jogo). */
function screenPoint(p: Phaser.Input.Pointer): { x: number; y: number } {
  return { x: p.x / RENDER_ZOOM, y: p.y / RENDER_ZOOM };
}

/**
 * Junta teclado e toque em comandos únicos: direção (-1..1) e ação.
 * No celular, a metade esquerda da tela vira um joystick virtual e o
 * à direita ficam dois botões: ação (dourado) e feitiço (lilás, com a varinha).
 */
export class InputManager {
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private stickPointer?: Phaser.Input.Pointer;
  private stickOrigin = new Phaser.Math.Vector2();
  private stickVector = new Phaser.Math.Vector2();
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private actionQueued = false;
  /** A ação veio do botão de toque (lá ela só pega e conversa; feitiço é no botão da varinha). */
  private actionByTouch = false;
  private castQueued = false;
  private navQueued = 0;
  private navHQueued = 0;
  private spellQueued = false;
  private letterQueued: string | null = null;
  private menuQueued = false;
  private mapQueued = false;
  private static readonly RADIUS = 28;
  /** Letras que já têm função: andar (WASD), ação (E), trocar feitiço (Q), mapa (M) e bolsa (I). */
  static readonly RESERVED = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyM', 'KeyI'];

  constructor(private scene: Phaser.Scene, opts: { touchControls?: boolean; castButton?: boolean } = {}) {
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
    if (touchControls && InputManager.isTouchDevice(scene)) this.createTouchButtons(opts.castButton ?? false);

    // toques rápidos de tecla (apertar e soltar no mesmo quadro) não podem se perder,
    // então ação e navegação são guardadas no próprio evento de tecla
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Espaço é a tecla de ação principal; E e Enter continuam valendo
      if (['Space', 'KeyE', 'Enter', 'NumpadEnter'].includes(e.code)) {
        this.actionQueued = true;
        if (e.code === 'Space') e.preventDefault();
      }
      if (['ArrowUp', 'KeyW'].includes(e.code)) this.navQueued = -1;
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.navQueued = 1;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.navHQueued = -1;
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.navHQueued = 1;
      if (e.code === 'KeyQ') this.spellQueued = true;
      // as outras letras ficam guardadas para as teclas de cada feitiço (R, T, Y, U...);
      // com Shift, a mesma letra lança o feitiço extra que divide a tecla (Shift+R...)
      if (/^Key[A-Z]$/.test(e.code) && !InputManager.RESERVED.includes(e.code)) {
        this.letterQueued = (e.shiftKey ? 'Shift+' : '') + e.code.slice(3);
      }
      if (e.code === 'KeyM') this.mapQueued = true;
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

  /**
   * Botões redondos do celular, no canto direito: ação (dourado, pegar/falar/empurrar)
   * e, no mundo, feitiço (lilás, com a varinha). Mesmo fundo escuro e borda fina do HUD.
   */
  private createTouchButtons(withCast: boolean): void {
    const l = hudLayout(GAME_WIDTH, GAME_HEIGHT);
    const make = (box: { x: number; y: number; w: number; h: number }, color: number, symbol: Phaser.GameObjects.GameObject[], onPress: () => void) => {
      const r = box.w / 2 - 3;
      const bg = this.scene.add.circle(0, 0, r, 0x18142a, 0.72).setStrokeStyle(1.5, color, 0.9);
      const glow = this.scene.add.circle(0, 0, r - 3, color, 0.1);
      const btn = this.scene.add.container(box.x + box.w / 2, box.y + box.h / 2, [bg, glow, ...symbol])
        .setScrollFactor(0).setDepth(1000).setSize(box.w, box.h).setInteractive();
      const press = (on: boolean) => {
        btn.setScale(on ? 0.9 : 1);
        glow.setFillStyle(color, on ? 0.35 : 0.1);
      };
      btn.on('pointerdown', () => { onPress(); press(true); });
      btn.on('pointerup', () => press(false));
      btn.on('pointerout', () => press(false));
      return btn;
    };
    const GOLD = 0xfad65c;
    const LILAC = 0xb99cff;
    // ação: um símbolo simples (anel com um ponto), como o botão principal de um controle
    make(l.action, GOLD, [
      this.scene.add.circle(0, 0, 6, GOLD, 0).setStrokeStyle(1.5, GOLD, 0.95),
      this.scene.add.circle(0, 0, 2.5, GOLD, 0.95),
    ], () => { this.actionQueued = true; this.actionByTouch = true; });
    if (!withCast) return;
    const frame = assets().frameOf('ui.icones', 'varinha');
    const wand = frame !== undefined
      ? [this.scene.add.image(0, 0, 'ui.icones', frame).setScale(1.25)]
      : [this.scene.add.star(0, 0, 5, 3, 7, LILAC, 0.9)];
    make(l.cast, LILAC, wand, () => { this.castQueued = true; });
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.stickPointer || !p.wasTouch || p.x > this.scene.scale.gameSize.width / 2) return;
    this.stickPointer = p;
    const { x, y } = screenPoint(p);
    this.stickOrigin.set(x, y);
    this.base.setPosition(x, y).setVisible(true);
    this.knob.setPosition(x, y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p !== this.stickPointer) return;
    const { x, y } = screenPoint(p);
    const d = new Phaser.Math.Vector2(x - this.stickOrigin.x, y - this.stickOrigin.y);
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

  /** Última letra livre apertada (ex.: "R" ou "Shift+R"), uma vez por toque. Usada nas teclas dos feitiços. */
  letterPressed(): string | null {
    const l = this.letterQueued;
    this.letterQueued = null;
    return l;
  }

  /** M: abrir o Mapa dos Segredos (se o aprendiz tiver). */
  mapPressed(): boolean {
    const p = this.mapQueued;
    this.mapQueued = false;
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

  /** A última ação veio do botão de toque? (lido logo depois de actionPressed) */
  lastActionByTouch(): boolean {
    const t = this.actionByTouch;
    this.actionByTouch = false;
    return t;
  }

  /** Botão da varinha (celular): lança o feitiço escolhido, uma vez por toque. */
  castPressed(): boolean {
    const pressed = this.castQueued;
    this.castQueued = false;
    return pressed;
  }
}

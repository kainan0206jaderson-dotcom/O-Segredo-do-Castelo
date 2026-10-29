import Phaser from 'phaser';
import { FONT_FAMILY } from './theme';
import { GAME_WIDTH } from '../config/game';

/**
 * Campo de texto de verdade (HTML) por cima do jogo, para digitar o nome do aprendiz.
 * Assim o teclado do celular abre sozinho. Enquanto ele tem o foco, o teclado do jogo
 * fica desligado, para W, A, S, D e Espaço irem para o nome e não para o jogo.
 */
export class NameField {
  readonly el: HTMLInputElement;
  private readonly place = () => this.layout();

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    value: string,
    onEnter: () => void,
  ) {
    const el = (this.el = document.createElement('input'));
    el.type = 'text';
    el.value = value;
    el.maxLength = 14;
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.setAttribute('aria-label', 'Nome do aprendiz');
    Object.assign(el.style, {
      position: 'fixed', zIndex: '10', boxSizing: 'border-box', textAlign: 'center',
      fontFamily: `"${FONT_FAMILY}", Georgia, serif`, color: '#fad65c', background: '#18142a',
      border: '2px solid #fad65c', borderRadius: '4px', outline: 'none', padding: '0',
    });
    const kb = scene.input.keyboard;
    el.addEventListener('focus', () => {
      if (!kb) return;
      kb.enabled = false;
      kb.disableGlobalCapture();
    });
    el.addEventListener('blur', () => {
      if (!kb) return;
      kb.enabled = true;
      kb.enableGlobalCapture();
    });
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        el.blur();
        onEnter();
      }
      if (e.key === 'Escape') el.blur();
    });
    document.body.appendChild(el);
    this.layout();
    window.addEventListener('resize', this.place);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.place);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get value(): string {
    return this.el.value;
  }

  setVisible(on: boolean): void {
    if (!on) this.el.blur();
    this.el.style.display = on ? '' : 'none';
  }

  /** Posição e tamanho acompanham o canvas, que muda de escala com a janela. */
  private layout(): void {
    const r = this.scene.game.canvas.getBoundingClientRect();
    const k = r.width / GAME_WIDTH;
    const h = 18;
    Object.assign(this.el.style, {
      left: `${r.left + (this.x - this.w / 2) * k}px`,
      top: `${r.top + (this.y - h / 2) * k}px`,
      width: `${this.w * k}px`,
      height: `${h * k}px`,
      fontSize: `${11 * k}px`,
    });
  }

  destroy(): void {
    window.removeEventListener('resize', this.place);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.place);
    if (document.activeElement === this.el) this.el.blur();
    this.el.remove();
  }
}

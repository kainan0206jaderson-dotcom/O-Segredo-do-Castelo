import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import type { DialogueView } from '../systems/DialogueRunner';
import { COLORS, TEXT_RES, textStyle } from './theme';

const CHARS_PER_SECOND = 45;
const BOX_H = 64;
const MARGIN = 8;

/** Caixa de diálogo com efeito de máquina de escrever e lista de escolhas. */
export class DialogueBox {
  private root: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private nameTab: Phaser.GameObjects.Rectangle;
  private bodyText: Phaser.GameObjects.Text;
  private moreArrow: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private fullText = '';
  private shown = 0;
  private choices: string[] = [];
  private selected = 0;
  onChoice?: (index: number) => void;

  constructor(private scene: Phaser.Scene) {
    const y0 = GAME_HEIGHT - BOX_H - MARGIN;
    const w = GAME_WIDTH - MARGIN * 2;
    const panel = scene.add.rectangle(MARGIN, y0, w, BOX_H, COLORS.panel, 0.94).setOrigin(0).setStrokeStyle(1, COLORS.panelBorder);
    this.nameTab = scene.add.rectangle(MARGIN + 8, y0 - 7, 80, 14, COLORS.panelInner).setOrigin(0).setStrokeStyle(1, COLORS.panelBorder);
    this.nameText = scene.add.text(MARGIN + 14, y0 - 6, '', textStyle(9, COLORS.gold, { fontStyle: 'bold' })).setResolution(TEXT_RES);
    this.bodyText = scene.add.text(MARGIN + 10, y0 + 12, '', textStyle(10, COLORS.text, { wordWrap: { width: w - 24 }, lineSpacing: 2 })).setResolution(TEXT_RES);
    this.moreArrow = scene.add.text(MARGIN + w - 14, y0 + BOX_H - 14, '▼', textStyle(8, COLORS.gold)).setResolution(TEXT_RES);
    scene.tweens.add({ targets: this.moreArrow, y: '+=2', duration: 400, yoyo: true, repeat: -1 });
    this.root = scene.add.container(0, 0, [panel, this.nameTab, this.nameText, this.bodyText, this.moreArrow])
      .setScrollFactor(0).setDepth(2000).setVisible(false);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  get typing(): boolean {
    return this.shown < this.fullText.length;
  }

  get hasChoices(): boolean {
    return this.choices.length > 0 && !this.typing;
  }

  show(view: DialogueView): void {
    this.root.setVisible(true);
    this.nameText.setText(view.speaker);
    this.nameTab.width = this.nameText.width + 12;
    this.fullText = view.text;
    this.shown = 0;
    this.bodyText.setText('');
    this.choices = view.choices;
    this.selected = 0;
    this.clearChoices();
    this.moreArrow.setVisible(false);
  }

  hide(): void {
    this.root.setVisible(false);
    this.clearChoices();
  }

  /** Completa o texto de uma vez (quando o jogador aperta ação durante a digitação). */
  skipTyping(): void {
    this.shown = this.fullText.length;
    this.bodyText.setText(this.fullText);
    this.afterTyping();
  }

  moveSelection(delta: number): void {
    if (!this.hasChoices) return;
    this.selected = Phaser.Math.Wrap(this.selected + delta, 0, this.choices.length);
    this.paintChoices();
  }

  get selectedIndex(): number {
    return this.selected;
  }

  update(deltaMs: number): void {
    if (!this.visible || !this.typing) return;
    this.shown = Math.min(this.fullText.length, this.shown + (deltaMs / 1000) * CHARS_PER_SECOND);
    this.bodyText.setText(this.fullText.slice(0, Math.floor(this.shown)));
    if (!this.typing) this.afterTyping();
  }

  private afterTyping(): void {
    if (this.choices.length) this.buildChoices();
    else this.moreArrow.setVisible(true);
  }

  private buildChoices(): void {
    this.clearChoices();
    const y0 = GAME_HEIGHT - BOX_H - MARGIN;
    const x = GAME_WIDTH - MARGIN - 4;
    const n = this.choices.length;
    this.choices.forEach((label, i) => {
      const t = this.scene.add.text(x, y0 - 10 - (n - i) * 18, label, textStyle(10, COLORS.text, {
        backgroundColor: '#18142a', padding: { left: 8, right: 8, top: 3, bottom: 3 },
      })).setOrigin(1, 0).setScrollFactor(0).setDepth(2001).setResolution(TEXT_RES).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.selected = i; this.paintChoices(); });
      t.on('pointerdown', () => this.onChoice?.(i));
      this.choiceTexts.push(t);
    });
    this.paintChoices();
  }

  private paintChoices(): void {
    this.choiceTexts.forEach((t, i) => {
      const on = i === this.selected;
      t.setColor(on ? COLORS.gold : COLORS.text);
      t.setText(`${on ? '▸ ' : '  '}${this.choices[i]}`);
    });
  }

  private clearChoices(): void {
    this.choiceTexts.forEach((t) => t.destroy());
    this.choiceTexts = [];
  }
}

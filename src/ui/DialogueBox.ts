import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import type { DialogueView } from '../systems/DialogueRunner';
import { COLORS, TEXT_RES, textStyle } from './theme';
import { charsPerSecond } from '../core/settings';
import { audio } from '../audio/Audio';
import { noGenero } from '../core/aparencia';
import professores from '../../content/professores.json';

const BOX_H = 64;
const MARGIN = 8;
const PORTRAIT = 40;

/** Retrato de quem fala [nome no diálogo -> folha de sprite]. */
const PORTRAITS: Record<string, string> = {
  ...Object.fromEntries(professores.lista.map((p) => [p.nome, `npc.prof-${p.id}`])),
  'Trinco': 'npc.trinco',
  'Dom Moldura': 'npc.dom-moldura',
  'Dona Brasa': 'npc.dona-brasa',
  'Elfo Fuxico': 'npc.fuxico',
  'Dama do Chá': 'npc.dama-cha',
  'Ministro Bonfatti': 'npc.arquimedes',
  'Bellatrix Lestrelle': 'npc.morgana',
  'Vulto encapuzado': 'npc.morgana',
  'Profa. Amélia': 'npc.amelia',
  'Prof. Aristóteles': 'npc.aristoteles',
  'Fada Ramalhete': 'npc.fada-ramalhete',
  'Booh': 'npc.booh',
  'Mister Addam': 'npc.addam',
  'Dona Lágrima': 'npc.lagrima',
  'Mary': 'npc.mary',
  'Mish Mish': 'npc.mish-mish',
  'Wish Wish': 'npc.wish-wish',
};

/** Caixa de diálogo com efeito de máquina de escrever e lista de escolhas. */
export class DialogueBox {
  private root: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private nameTab: Phaser.GameObjects.Rectangle;
  private bodyText: Phaser.GameObjects.Text;
  private moreArrow: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private portraitBg: Phaser.GameObjects.Rectangle;
  private portrait: Phaser.GameObjects.Image;
  private bodyX = 0;
  private wrap = 0;
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
    this.portraitBg = scene.add.rectangle(MARGIN + 8, y0 + 12, PORTRAIT, PORTRAIT, 0x2a2140).setOrigin(0).setStrokeStyle(1, COLORS.panelBorder, 0.6);
    this.portrait = scene.add.image(MARGIN + 8 + PORTRAIT / 2, y0 + 12 + PORTRAIT / 2, '__DEFAULT');
    this.bodyX = MARGIN + 10;
    this.wrap = w - 24;
    this.moreArrow = scene.add.text(MARGIN + w - 14, y0 + BOX_H - 14, '▼', textStyle(8, COLORS.gold)).setResolution(TEXT_RES);
    scene.tweens.add({ targets: this.moreArrow, y: '+=2', duration: 400, yoyo: true, repeat: -1 });
    this.root = scene.add.container(0, 0, [panel, this.nameTab, this.nameText, this.portraitBg, this.portrait, this.bodyText, this.moreArrow])
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
    this.nameTab.setSize(this.nameText.width + 12, 14);
    const hasPortrait = this.setPortrait(PORTRAITS[view.speaker]);
    const shift = hasPortrait ? PORTRAIT + 8 : 0;
    this.bodyText.setX(this.bodyX + shift).setWordWrapWidth(this.wrap - shift);
    this.fullText = noGenero(view.text);
    this.shown = 0;
    this.bodyText.setText('');
    this.choices = view.choices;
    this.selected = 0;
    this.clearChoices();
    this.moreArrow.setVisible(false);
  }

  /** Mostra o rosto (as primeiras linhas desenhadas do quadro 0), ampliado 2x. */
  private setPortrait(key: string | undefined): boolean {
    const tex = key && this.scene.textures.exists(key) ? this.scene.textures.get(key) : undefined;
    this.portraitBg.setVisible(!!tex);
    this.portrait.setVisible(!!tex);
    if (!tex) return false;
    const frame = tex.get(0);
    if (frame.width >= 32) {
      this.portrait.setTexture(key!, 0).setCrop().setScale(1);
      return true;
    }
    let top = 0;
    while (top < frame.height - 1 && !this.rowHasPixels(key!, frame, top)) top++;
    const size = Math.min(16, frame.height - top + 1);
    const cropTop = Math.max(0, top - 1);
    this.portrait.setTexture(key!, 0).setScale(2).setCrop(0, cropTop, 16, size);
    // a imagem é centralizada pelo quadro inteiro: compensa o recorte
    this.portrait.setDisplayOrigin(8, cropTop + size / 2);
    return true;
  }

  private rowHasPixels(key: string, frame: Phaser.Textures.Frame, y: number): boolean {
    for (let x = 0; x < frame.width; x++) {
      const c = this.scene.textures.getPixel(x, y, key, frame.name);
      if (c && c.alpha > 0) return true;
    }
    return false;
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
    const before = Math.floor(this.shown / 4);
    this.shown = Math.min(this.fullText.length, this.shown + (deltaMs / 1000) * charsPerSecond());
    // "voz" da caixa de diálogo: um bipe a cada poucas letras
    if (Math.floor(this.shown / 4) !== before && this.typing) audio.sfx('blip');
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

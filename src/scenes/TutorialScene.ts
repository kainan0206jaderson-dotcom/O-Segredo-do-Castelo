import Phaser from 'phaser';
import { db } from '../content';
import { session } from '../core/session';
import { assets } from '../core/registry';
import { InputManager } from '../input/InputManager';
import { tutorialFlag } from '../systems/rules';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';

export interface TutorialData {
  id: string;
  /** Cena para abrir depois do tutorial, no lugar de voltar ao mundo (ex.: o caldeirão). */
  then?: string;
}

/** Tutorial curto, de 1 ou 2 páginas, mostrado só na primeira vez. O mundo fica pausado. */
export class TutorialScene extends Phaser.Scene {
  private data_!: TutorialData;
  private page = 0;
  private controls!: InputManager;
  private body_!: Phaser.GameObjects.Text;
  private icon!: Phaser.GameObjects.Image;
  private pager!: Phaser.GameObjects.Text;
  private touch = false;

  constructor() {
    super('Tutorial');
  }

  create(data: TutorialData): void {
    this.data_ = data;
    this.page = 0;
    this.touch = InputManager.isTouchDevice(this);
    const def = db.tutorials[data.id];
    const w = 300;
    const h = 120;
    const x0 = (GAME_WIDTH - w) / 2;
    const y0 = (GAME_HEIGHT - h) / 2 - 10;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5).setOrigin(0)
      .setInteractive().on('pointerdown', () => this.advance());
    const panel = this.add.rectangle(x0, y0, w, h, 0x2a2140, 0.98).setOrigin(0).setStrokeStyle(2, COLORS.panelBorder);
    this.add.text(x0 + 12, y0 + 8, `✦ ${def.title}`, textStyle(11, COLORS.gold, { fontStyle: 'bold' })).setResolution(TEXT_RES);
    this.icon = this.add.image(x0 + 26, y0 + 54, 'ui.icones', 0).setScale(2);
    this.body_ = this.add.text(x0 + 52, y0 + 30, '', textStyle(9, COLORS.text, { wordWrap: { width: w - 64 }, lineSpacing: 3 })).setResolution(TEXT_RES);
    this.pager = this.add.text(x0 + w - 10, y0 + h - 8, '', textStyle(8, COLORS.muted)).setOrigin(1, 1).setResolution(TEXT_RES);
    this.controls = new InputManager(this, { touchControls: false });
    this.render();
    panel.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 140 });
  }

  private render(): void {
    const def = db.tutorials[this.data_.id];
    const p = def.pages[this.page];
    this.body_.setText(this.touch && p.touch ? p.touch : p.text);
    const f = p.icon ? assets().frameOf('ui.icones', p.icon) : undefined;
    this.icon.setVisible(f !== undefined);
    if (f !== undefined) this.icon.setFrame(f);
    this.body_.setX(f !== undefined ? (GAME_WIDTH - 300) / 2 + 52 : (GAME_WIDTH - 300) / 2 + 14);
    this.body_.setWordWrapWidth(f !== undefined ? 236 : 274);
    const last = this.page === def.pages.length - 1;
    const key = this.touch ? 'toque' : 'E';
    this.pager.setText(`${def.pages.length > 1 ? `${this.page + 1}/${def.pages.length}   ` : ''}${key}: ${last ? 'entendi!' : 'continuar'}`);
  }

  private advance(): void {
    const def = db.tutorials[this.data_.id];
    if (this.page < def.pages.length - 1) {
      this.page += 1;
      this.render();
      return;
    }
    session.state.flags[tutorialFlag(this.data_.id)] = true;
    session.save();
    this.scene.stop();
    if (this.data_.then) this.scene.launch(this.data_.then);
    else this.scene.resume('World', { from: 'tutorial' });
  }

  update(): void {
    if (this.controls.actionPressed() || this.controls.menuPressed()) this.advance();
  }
}

import Phaser from 'phaser';
import { session } from '../core/session';
import { InputManager } from '../input/InputManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';

/** Tela inicial: Continuar (se houver jogo salvo) ou Novo jogo. */
export class TitleScene extends Phaser.Scene {
  private options: { label: string; run: () => void }[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private controls!: InputManager;
  private confirmingNew = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.confirmingNew = false;
    this.cameras.main.setBackgroundColor(COLORS.panel);
    this.add.text(GAME_WIDTH / 2, 64, 'Magia & Bruxaria', textStyle(14, COLORS.muted)).setOrigin(0.5).setResolution(TEXT_RES);
    this.add.text(GAME_WIDTH / 2, 88, 'O Segredo do Castelo', textStyle(24, COLORS.gold, { stroke: '#3a3150', strokeThickness: 4 }))
      .setOrigin(0.5).setResolution(TEXT_RES);

    const hasSave = session.hasSave();
    this.options = [
      ...(hasSave ? [{ label: 'Continuar', run: () => this.continueGame() }] : []),
      { label: 'Novo jogo', run: () => this.newGame(hasSave) },
    ];
    this.texts = this.options.map((o, i) =>
      this.add.text(GAME_WIDTH / 2, 150 + i * 24, o.label, textStyle(13, COLORS.text)).setOrigin(0.5).setResolution(TEXT_RES)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.options[i].run()),
    );
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, 'versão de teste · arte provisória', textStyle(8, COLORS.muted)).setOrigin(0.5).setResolution(TEXT_RES);
    this.controls = new InputManager(this);
    this.select(0);
  }

  private select(i: number): void {
    this.selected = i;
    this.texts.forEach((t, j) => {
      t.setColor(j === i ? COLORS.gold : COLORS.text);
      t.setText(`${j === i ? '▸ ' : ''}${this.options[j].label}${j === i ? ' ◂' : ''}`);
    });
  }

  private continueGame(): void {
    if (!session.continue()) return this.newGame(false);
    this.scene.start('World', { map: session.state.map, spawn: session.state.spawn });
  }

  private newGame(overwrite: boolean): void {
    if (overwrite && !this.confirmingNew) {
      this.confirmingNew = true;
      const t = this.texts[this.options.length - 1];
      t.setText('Apagar o jogo salvo? Toque de novo');
      return;
    }
    session.startNew();
    this.scene.start('World', { map: session.state.map, spawn: session.state.spawn });
  }

  update(): void {
    const nav = this.controls.navPressed();
    if (nav) {
      this.confirmingNew = false;
      this.select(Phaser.Math.Wrap(this.selected + nav, 0, this.options.length));
    }
    if (this.controls.actionPressed()) this.options[this.selected].run();
  }
}

import Phaser from 'phaser';
import { session } from '../core/session';
import { InputManager } from '../input/InputManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { audio } from '../audio/Audio';
import { addLogo } from '../ui/logo';

/** Tela inicial: Continuar (se houver jogo salvo) ou Novo jogo. */
export class TitleScene extends Phaser.Scene {
  private options: { label: string; run: () => void }[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private controls!: InputManager;
  private confirmingNew = false;
  private leaving = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.confirmingNew = false;
    this.leaving = false;
    // céu do prólogo descido, para a lua ficar ao lado do menu e não atrás do letreiro;
    // em cima, a cor do topo do céu com estrelinhas piscando
    this.cameras.main.setBackgroundColor('#0b0a20');
    this.add.image(GAME_WIDTH / 2, 96, 'prologo.ceu').setOrigin(0.5, 0);
    for (let i = 0; i < 46; i++) {
      const star = this.add.rectangle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, 100), 1, 1, 0xe6e6ff, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({ targets: star, alpha: 0.1, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }
    addLogo(this, GAME_WIDTH / 2, 14);

    const hasSave = session.hasSave();
    this.options = [
      ...(hasSave ? [{ label: 'Continuar', run: () => this.continueGame() }] : []),
      { label: 'Novo jogo', run: () => this.newGame(hasSave) },
      { label: 'Prólogo', run: () => this.watchPrologue() },
      { label: 'Opções', run: () => this.openOptions() },
    ];
    this.texts = this.options.map((o, i) =>
      this.add.text(GAME_WIDTH / 2, 128 + i * 24, o.label, textStyle(13, COLORS.text)).setOrigin(0.5).setResolution(TEXT_RES)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.options[i].run()),
    );
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, 'versão 1.0 · toque ou aperte uma tecla para ligar o som', textStyle(8, COLORS.muted)).setOrigin(0.5).setResolution(TEXT_RES);
    this.controls = new InputManager(this);
    this.select(0);
    audio.music('titulo');
  }

  private watchPrologue(): void {
    audio.sfx('confirmar');
    this.toPrologue('titulo');
  }

  private openOptions(): void {
    audio.sfx('confirmar');
    this.scene.launch('Options', { back: 'Title' });
    this.scene.pause();
  }

  private select(i: number): void {
    if (i !== this.selected) audio.sfx('blip');
    this.selected = i;
    this.texts.forEach((t, j) => {
      t.setColor(j === i ? COLORS.gold : COLORS.text);
      t.setText(`${j === i ? '▸ ' : ''}${this.options[j].label}${j === i ? ' ◂' : ''}`);
    });
  }

  private continueGame(): void {
    audio.sfx('confirmar');
    if (!session.continue()) return this.newGame(false);
    this.scene.start('World', { map: session.state.map, spawn: session.state.spawn });
  }

  private newGame(overwrite: boolean): void {
    if (overwrite && !this.confirmingNew) {
      this.confirmingNew = true;
      audio.sfx('erro');
      const t = this.texts[this.options.findIndex((o) => o.label === 'Novo jogo')];
      t.setText('Apagar o jogo salvo? Toque de novo');
      return;
    }
    audio.sfx('confirmar');
    session.startNew();
    this.toPrologue('jogo');
  }

  /** Escurece a tela inicial antes do prólogo, para ele começar num fade in limpo. */
  private toPrologue(then: 'jogo' | 'titulo'): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 10, 9, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Prologue', { then }));
  }

  update(): void {
    if (this.leaving) return;
    const nav = this.controls.navPressed();
    if (nav) {
      this.confirmingNew = false;
      this.select(Phaser.Math.Wrap(this.selected + nav, 0, this.options.length));
    }
    if (this.controls.actionPressed()) this.options[this.selected].run();
  }
}

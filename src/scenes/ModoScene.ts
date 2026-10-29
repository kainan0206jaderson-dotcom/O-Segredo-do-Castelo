import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { InputManager } from '../input/InputManager';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { session } from '../core/session';
import { audio } from '../audio/Audio';
import { nomeFeio } from '../core/nomeFeio';
import { aparencia, nomePadrao } from '../core/aparencia';

type Modo = 'kids' | 'normal';

const CARDS: { modo: Modo; titulo: string; idade: string; texto: string }[] = [
  {
    modo: 'kids', titulo: 'Modo Kids', idade: 'até 12 anos',
    texto: 'Estrelinhas mostram o caminho, o aprendiz dá dicas e os desafios ficam mais leves.',
  },
  {
    modo: 'normal', titulo: 'Modo Normal', idade: 'para quem quer desafio',
    texto: 'Sem trilha nem dicas: descubra tudo sozinho, com o Fuxico para perguntar.',
  },
];

/**
 * Escolha do modo de jogo no Novo jogo, depois do Visual. Tocar seleciona, OK confirma,
 * Voltar (ou o gesto de voltar) leva de novo ao Visual. Dá para trocar depois nas Opções.
 */
export class ModoScene extends Phaser.Scene {
  private modo: Modo = 'kids';
  private leaving = false;
  private cards: { box: Phaser.GameObjects.Rectangle; parts: Phaser.GameObjects.Text[] }[] = [];
  private controls!: InputManager;

  constructor() {
    super('Modo');
  }

  create(): void {
    this.modo = session.state.modo ?? 'kids';
    this.leaving = false;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c0a1c, 0.94).setOrigin(0).setInteractive();
    this.add.text(GAME_WIDTH / 2, 40, 'Como você quer jogar?', textStyle(13, COLORS.text)).setOrigin(0.5).setResolution(TEXT_RES);
    const w = 170;
    const h = 130;
    this.cards = CARDS.map((c, i) => {
      const x = GAME_WIDTH / 2 + (i === 0 ? -w / 2 - 8 : w / 2 + 8);
      const box = this.add.rectangle(x, 128, w, h, 0x2a2140, 1)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pick(c.modo));
      const parts = [
        this.add.text(x, 78, c.titulo, textStyle(13, COLORS.gold, { fontStyle: 'bold' })),
        this.add.text(x, 98, c.idade, textStyle(9, COLORS.muted)),
        this.add.text(x, 118, c.texto, textStyle(9, COLORS.text, { align: 'center', wordWrap: { width: w - 20 }, lineSpacing: 2 })),
      ].map((t) => t.setOrigin(0.5, 0).setResolution(TEXT_RES));
      return { box, parts };
    });
    const button = (x: number, text: string, run: () => void) => this.add.text(x, 226, text, textStyle(12, COLORS.text, {
      backgroundColor: '#2a2140', padding: { left: 10, right: 10, top: 4, bottom: 4 },
    })).setOrigin(0.5).setResolution(TEXT_RES).setInteractive({ useHandCursor: true }).on('pointerdown', run);
    button(GAME_WIDTH / 2 - 70, '◂ Voltar', () => this.goBack());
    button(GAME_WIDTH / 2 + 70, 'OK ▸', () => this.confirm()).setColor(COLORS.gold);
    this.add.text(GAME_WIDTH / 2, 252, 'Dá para trocar depois, nas Opções.', textStyle(8, COLORS.muted)).setOrigin(0.5).setResolution(TEXT_RES);
    this.controls = new InputManager(this, { touchControls: false });
    this.pick(this.modo, true);
  }

  private pick(modo: Modo, silent = false): void {
    if (modo !== this.modo && !silent) audio.sfx('blip');
    this.modo = modo;
    this.cards.forEach((c, i) => {
      const on = CARDS[i].modo === modo;
      c.box.setStrokeStyle(2, on ? COLORS.panelBorder : 0x4a3f66).setFillStyle(on ? 0x2a2140 : 0x1a1530, 1);
      c.parts.forEach((t) => t.setAlpha(on ? 1 : 0.5));
    });
  }

  private goBack(): void {
    audio.sfx('blip');
    history.back();
  }

  private confirm(): void {
    if (this.leaving) return;
    const s = session.state;
    // no Modo Kids, nome com palavrão não vale: avisa com jeitinho e usa o nome padrão
    if (this.modo === 'kids' && s.nome && nomeFeio(s.nome)) {
      this.leaving = true;
      audio.sfx('erro');
      s.nome = undefined;
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 300, 54, 0x18142a, 0.97).setStrokeStyle(2, COLORS.panelBorder);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Ops! Esse nome não vale no Modo Kids.\nVocê vai se chamar ${nomePadrao(aparencia())}.`,
        textStyle(10, COLORS.text, { align: 'center', lineSpacing: 4 })).setOrigin(0.5).setResolution(TEXT_RES);
      this.time.delayedCall(2200, () => this.finish());
      return;
    }
    this.finish();
  }

  private finish(): void {
    audio.sfx('confirmar');
    session.state.modo = this.modo;
    session.save();
    this.scene.stop();
    this.scene.resume('Title', { from: 'modo' });
  }

  update(): void {
    if (this.leaving) return;
    if (this.controls.navHPressed() || this.controls.navPressed()) this.pick(this.modo === 'kids' ? 'normal' : 'kids');
    if (this.controls.actionPressed()) this.confirm();
    if (this.controls.menuPressed()) this.goBack();
  }
}

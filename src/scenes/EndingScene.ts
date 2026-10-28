import Phaser from 'phaser';
import { InputManager } from '../input/InputManager';
import { AssetRegistry } from '../core/AssetRegistry';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { session } from '../core/session';
import { db } from '../content';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';

/** Quem sobe ao palco na cerimônia final, da esquerda para a direita. */
const CAST: { sheet: string; name: string }[] = [
  { sheet: 'npc.trinco', name: 'Trinco' },
  { sheet: 'npc.dona-brasa', name: 'Dona Brasa' },
  { sheet: 'npc.aristoteles', name: 'Aristóteles' },
  { sheet: 'npc.arquimedes', name: 'Arquimedes' },
  { sheet: 'npc.amelia', name: 'Amélia' },
  { sheet: 'npc.morgana', name: 'Morgana' },
  { sheet: 'npc.fuxico', name: 'Fuxico' },
];

const CEREMONY = [
  'O Coração do Castelo voltou a bater, e todas as velas se acenderam de uma vez.',
  'No Grande Salão, o Prof. Arquimedes pediu silêncio (o Fuxico demorou um pouco).',
  '"Por coragem, inteligência, astúcia e lealdade, todas juntas..."',
  '"...este aprendiz agora é Guardião do Castelo!"',
];

const CREDITS = [
  ['MAGIA & BRUXARIA', 'O Segredo do Castelo'],
  ['Ideia, personagens e direção', 'kainan'],
  ['Código, arte provisória e textos', 'feitos com o Claude'],
  ['Feito com', 'Phaser 3 + TypeScript'],
  ['Inspirado no', 'Castelo Magia & Bruxaria'],
  ['Este é um jogo de fã, sem fins comerciais.', ''],
];

/**
 * Final do jogo: cerimônia no Grande Salão, título de Guardião do Castelo e créditos.
 * Depois o castelo fica livre para continuar explorando.
 */
export class EndingScene extends Phaser.Scene {
  private controls!: InputManager;
  private step = 0;
  private busy = false;
  private line!: Phaser.GameObjects.Text;

  constructor() {
    super('Ending');
  }

  create(): void {
    this.step = 0;
    this.busy = true;
    this.controls = new InputManager(this, { touchControls: false });
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c0a16, 1).setOrigin(0).setInteractive()
      .on('pointerdown', () => this.advance());
    for (let i = 0; i < 24; i++) {
      const star = this.add.star(Phaser.Math.Between(10, GAME_WIDTH - 10), Phaser.Math.Between(10, 120), 4, 1, 3, 0xfad65c, 0.8).setAlpha(0);
      this.tweens.add({ targets: star, alpha: { from: 0, to: 0.9 }, duration: 1100, delay: i * 140, yoyo: true, repeat: -1 });
    }

    // palco: o elenco aparece um por um, com o aprendiz no meio
    const y = 168;
    const gap = 46;
    const x0 = GAME_WIDTH / 2 - (CAST.length * gap) / 2;
    CAST.forEach((c, i) => {
      const x = x0 + i * gap + (i >= 3 ? gap : 0);
      this.actor(c.sheet, x, y, 300 + i * 220);
      this.add.text(x, y + 6, c.name, textStyle(7, COLORS.muted)).setOrigin(0.5, 0).setResolution(TEXT_RES)
        .setAlpha(0).setData('fade', 300 + i * 220);
    });
    const outfit = session.state.equipment.capa ? db.items[session.state.equipment.capa]?.sheet : undefined;
    this.actor(outfit ?? 'player.aprendiz', x0 + 3 * gap, y, 1900, true);
    this.children.list.filter((o) => o.getData('fade') !== undefined).forEach((o) =>
      this.tweens.add({ targets: o, alpha: 1, duration: 400, delay: o.getData('fade') as number }));

    this.line = this.add.text(GAME_WIDTH / 2, 70, '', textStyle(10, COLORS.text, { align: 'center', wordWrap: { width: GAME_WIDTH - 60 }, lineSpacing: 4 }))
      .setOrigin(0.5).setResolution(TEXT_RES);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12, InputManager.isTouchDevice(this) ? 'toque para continuar' : 'E para continuar',
      textStyle(7, COLORS.muted)).setOrigin(0.5).setResolution(TEXT_RES);
    this.time.delayedCall(2300, () => {
      this.busy = false;
      this.showLine();
    });
  }

  private actor(sheet: string, x: number, y: number, delay: number, hero = false): void {
    if (!this.textures.exists(sheet)) return;
    const s = this.add.sprite(x, y, sheet, 0).setOrigin(0.5, 1).setAlpha(0).setScale(hero ? 1.25 : 1);
    if (this.anims.exists(AssetRegistry.animKey(sheet, 'idle'))) s.play(AssetRegistry.animKey(sheet, 'idle'));
    this.tweens.add({ targets: s, alpha: sheet === 'npc.amelia' ? 0.8 : 1, y: { from: y + 6, to: y }, duration: 500, delay });
  }

  private showLine(): void {
    const text = CEREMONY[this.step];
    this.line.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.line, alpha: 1, duration: 350 });
    if (this.step === CEREMONY.length - 1) {
      this.cameras.main.flash(600, 250, 214, 92);
      const title = this.add.text(GAME_WIDTH / 2, 100, 'GUARDIÃO DO CASTELO', textStyle(18, COLORS.gold, { fontStyle: 'bold' }))
        .setOrigin(0.5).setResolution(TEXT_RES).setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 700, ease: 'Back.out' });
    }
  }

  private advance(): void {
    if (this.busy) return;
    this.step += 1;
    if (this.step < CEREMONY.length) return this.showLine();
    if (this.step === CEREMONY.length) return this.rollCredits();
    if (this.step > CEREMONY.length + 1) this.freePlay();
  }

  private rollCredits(): void {
    this.busy = true;
    this.cameras.main.fadeOut(600, 12, 10, 22);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.children.removeAll(true);
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c0a16, 1).setOrigin(0).setInteractive()
        .on('pointerdown', () => this.advance());
      const box = this.add.container(0, GAME_HEIGHT + 10);
      let y = 0;
      for (const [a, b] of CREDITS) {
        box.add(this.add.text(GAME_WIDTH / 2, y, a, textStyle(9, COLORS.muted)).setOrigin(0.5, 0).setResolution(TEXT_RES));
        if (b) box.add(this.add.text(GAME_WIDTH / 2, y + 13, b, textStyle(12, COLORS.gold)).setOrigin(0.5, 0).setResolution(TEXT_RES));
        y += 44;
      }
      const thanks = this.add.text(GAME_WIDTH / 2, y + 20, 'Obrigado por jogar!', textStyle(16, COLORS.text, { fontStyle: 'bold' }))
        .setOrigin(0.5, 0).setResolution(TEXT_RES);
      const after = this.add.text(GAME_WIDTH / 2, y + 46, 'O castelo continua aberto: volte quando quiser.', textStyle(8, COLORS.muted))
        .setOrigin(0.5, 0).setResolution(TEXT_RES);
      box.add([thanks, after]);
      this.cameras.main.fadeIn(500);
      const endY = GAME_HEIGHT / 2 - (y + 46);
      this.tweens.add({
        targets: box, y: endY, duration: 14000, ease: 'Linear',
        onComplete: () => (this.busy = false),
      });
      // tocar durante os créditos acelera
      this.input.on('pointerdown', () => this.tweens.getTweensOf(box).forEach((t) => (t.timeScale = 4)));
      this.step = CEREMONY.length + 1;
    });
  }

  private freePlay(): void {
    this.busy = true;
    this.scene.stop('World');
    this.scene.start('World', { map: 'map.grande-salao', spawn: 'da-recepcao' });
  }

  update(): void {
    if (!this.controls.actionPressed() && !this.controls.menuPressed()) return;
    if (this.busy && this.step === CEREMONY.length + 1) {
      this.tweens.getTweens().forEach((t) => (t.timeScale = 4));
      return;
    }
    this.advance();
  }
}

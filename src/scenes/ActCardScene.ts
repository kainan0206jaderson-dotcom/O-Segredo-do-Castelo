import Phaser from 'phaser';
import { InputManager } from '../input/InputManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { audio } from '../audio/Audio';

const ACTS: Record<string, { title: string; subtitle: string; next: string }> = {
  '1': {
    title: 'Fim do Ato 1',
    subtitle: 'O Selo da Escada foi quebrado.',
    next: 'O castelo agora é todo seu: explore, vença desafios e ajude quem pedir.\nO Ato 2 espera no andar de cima.',
  },
  '2': {
    title: 'Fim do Ato 2',
    subtitle: 'A Bellatrix levou a Amélia para dentro dos quadros.',
    next: 'Quatro quadros, quatro virtudes. Junte os emblemas na Galeria\ne abra o caminho até o Coração do Castelo.',
  },
};

/** Tela de fim de ato. Depois dela o jogo continua livre no castelo. */
export class ActCardScene extends Phaser.Scene {
  private controls!: InputManager;
  private ready = false;

  constructor() {
    super('ActCard');
  }

  create(data: { act: string }): void {
    audio.sfx('missao');
    const a = ACTS[data.act] ?? ACTS['1'];
    this.ready = false;
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c0a16, 1).setOrigin(0).setAlpha(0).setInteractive()
      .on('pointerdown', () => this.close());
    const title = this.add.text(GAME_WIDTH / 2, 96, a.title, textStyle(20, COLORS.gold, { fontStyle: 'bold' })).setOrigin(0.5).setResolution(TEXT_RES).setAlpha(0);
    const sub = this.add.text(GAME_WIDTH / 2, 124, a.subtitle, textStyle(11, COLORS.text)).setOrigin(0.5).setResolution(TEXT_RES).setAlpha(0);
    const next = this.add.text(GAME_WIDTH / 2, 168, a.next, textStyle(9, COLORS.muted, { align: 'center', lineSpacing: 4 })).setOrigin(0.5).setResolution(TEXT_RES).setAlpha(0);
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, InputManager.isTouchDevice(this) ? 'toque para continuar' : 'Espaço para continuar',
      textStyle(8, COLORS.muted)).setOrigin(0.5).setResolution(TEXT_RES).setAlpha(0);
    this.tweens.chain({
      tweens: [
        { targets: bg, alpha: 0.96, duration: 600 },
        { targets: title, alpha: 1, duration: 500 },
        { targets: sub, alpha: 1, duration: 400 },
        { targets: [next, hint], alpha: 1, duration: 400 },
      ],
      onComplete: () => (this.ready = true),
    });
    for (let i = 0; i < 14; i++) {
      const star = this.add.star(Phaser.Math.Between(20, GAME_WIDTH - 20), Phaser.Math.Between(20, GAME_HEIGHT - 20), 4, 1, 3, 0xfad65c, 0.8).setAlpha(0);
      this.tweens.add({ targets: star, alpha: { from: 0, to: 0.9 }, duration: 900, delay: 600 + i * 120, yoyo: true, repeat: -1 });
    }
    this.controls = new InputManager(this, { touchControls: false });
  }

  private close(): void {
    if (!this.ready) return;
    this.scene.stop();
    this.scene.resume('World', { from: 'act' });
  }

  update(): void {
    if (this.controls.actionPressed() || this.controls.menuPressed()) this.close();
  }
}

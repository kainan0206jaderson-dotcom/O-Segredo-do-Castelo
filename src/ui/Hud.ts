import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from './theme';

/** Objetivo atual no canto e avisos rápidos ("Você recebeu: ..."). */
export class Hud {
  private questBg: Phaser.GameObjects.Rectangle;
  private questTitle: Phaser.GameObjects.Text;
  private questObjective: Phaser.GameObjects.Text;
  private queue: string[] = [];
  private showingNotice = false;

  constructor(private scene: Phaser.Scene) {
    this.questBg = scene.add.rectangle(4, 4, 10, 10, 0x18142a, 0.75).setOrigin(0).setScrollFactor(0).setDepth(1499).setVisible(false);
    this.questTitle = scene.add.text(8, 6, '', textStyle(9, COLORS.gold, { fontStyle: 'bold', stroke: '#18142a', strokeThickness: 3 }))
      .setScrollFactor(0).setDepth(1500).setResolution(TEXT_RES);
    this.questObjective = scene.add.text(8, 18, '', textStyle(8, COLORS.text, { stroke: '#18142a', strokeThickness: 3, wordWrap: { width: 200 } }))
      .setScrollFactor(0).setDepth(1500).setResolution(TEXT_RES);
  }

  setObjective(obj: { quest: string; objective: string } | undefined): void {
    this.questTitle.setText(obj ? `◆ ${obj.quest}` : '');
    this.questObjective.setText(obj?.objective ?? '');
    this.questBg.setVisible(Boolean(obj));
    if (obj) this.questBg.setSize(Math.max(this.questTitle.width, this.questObjective.width) + 8, 16 + this.questObjective.height);
  }

  notify(text: string): void {
    this.queue.push(text);
    if (!this.showingNotice) this.next();
  }

  private next(): void {
    const text = this.queue.shift();
    if (!text) {
      this.showingNotice = false;
      return;
    }
    this.showingNotice = true;
    const t = this.scene.add.text(GAME_WIDTH / 2, 44, text, textStyle(10, COLORS.gold, {
      backgroundColor: '#18142ae6', padding: { left: 10, right: 10, top: 4, bottom: 4 },
    })).setOrigin(0.5).setScrollFactor(0).setDepth(2500).setResolution(TEXT_RES).setAlpha(0);
    this.scene.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, y: 48, duration: 200 },
        { alpha: 0, duration: 300, delay: 1400 },
      ],
      onComplete: () => {
        t.destroy();
        this.next();
      },
    });
  }
}

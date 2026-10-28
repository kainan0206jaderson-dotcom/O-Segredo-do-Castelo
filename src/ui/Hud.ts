import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { assets } from '../core/registry';
import { COLORS, TEXT_RES, textStyle } from './theme';

const ICONS = 'ui.icones';

/** Objetivo atual, feitiço escolhido, botão da bolsa, cronômetro de desafio e avisos rápidos. */
export class Hud {
  private questBg: Phaser.GameObjects.Rectangle;
  private questTitle: Phaser.GameObjects.Text;
  private questObjective: Phaser.GameObjects.Text;
  private spellBox: Phaser.GameObjects.Container;
  private spellIcon: Phaser.GameObjects.Image;
  private spellName: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private bossName: Phaser.GameObjects.Text;
  private bossBar: Phaser.GameObjects.Rectangle;
  private bossBarBg: Phaser.GameObjects.Rectangle;
  private vitals: Phaser.GameObjects.GameObject[] = [];
  private vitalsKey = '';
  private queue: string[] = [];
  private showingNotice = false;
  onSpellTap?: () => void;
  onMenuTap?: () => void;

  constructor(private scene: Phaser.Scene, touch: boolean) {
    this.questBg = scene.add.rectangle(4, 4, 10, 10, 0x18142a, 0.75).setOrigin(0).setScrollFactor(0).setDepth(1499).setVisible(false);
    this.questTitle = scene.add.text(8, 6, '', textStyle(9, COLORS.gold, { fontStyle: 'bold', stroke: '#18142a', strokeThickness: 3 }))
      .setScrollFactor(0).setDepth(1500).setResolution(TEXT_RES);
    this.questObjective = scene.add.text(8, 18, '', textStyle(8, COLORS.text, { stroke: '#18142a', strokeThickness: 3, wordWrap: { width: 220 } }))
      .setScrollFactor(0).setDepth(1500).setResolution(TEXT_RES);

    // bolsa (abre o grimório) no canto superior direito
    const bag = scene.add.image(GAME_WIDTH - 14, 14, ICONS, assets().frameOf(ICONS, 'bolsa'));
    const bagBg = scene.add.circle(GAME_WIDTH - 14, 14, 12, 0x18142a, 0.75).setStrokeStyle(1, COLORS.panelBorder, 0.8);
    const bagKey = scene.add.text(GAME_WIDTH - 14, 27, touch ? '' : 'I', textStyle(7, COLORS.muted)).setOrigin(0.5, 0).setResolution(TEXT_RES);
    for (const o of [bagBg, bag, bagKey]) o.setScrollFactor(0).setDepth(1500);
    bagBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onMenuTap?.());

    // feitiço escolhido, ao lado da bolsa; tocar troca de feitiço
    const spellBg = scene.add.rectangle(0, 0, 92, 22, 0x18142a, 0.75).setOrigin(1, 0.5).setStrokeStyle(1, COLORS.panelBorder, 0.8);
    this.spellIcon = scene.add.image(-80, 0, ICONS, 0);
    this.spellName = scene.add.text(-70, 0, '', textStyle(9, COLORS.text)).setOrigin(0, 0.5).setResolution(TEXT_RES);
    const spellKey = scene.add.text(-4, 8, touch ? '⟳' : 'Q', textStyle(7, COLORS.muted)).setOrigin(1, 0.5).setResolution(TEXT_RES);
    this.spellBox = scene.add.container(GAME_WIDTH - 32, 14, [spellBg, this.spellIcon, this.spellName, spellKey])
      .setScrollFactor(0).setDepth(1500).setVisible(false).setSize(92, 22);
    spellBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onSpellTap?.());

    this.timer = scene.add.text(GAME_WIDTH / 2, 40, '', textStyle(12, COLORS.gold, { stroke: '#18142a', strokeThickness: 4, fontStyle: 'bold' }))
      .setOrigin(0.5).setScrollFactor(0).setDepth(1500).setResolution(TEXT_RES).setVisible(false);

    // barra de vida do duelo final, embaixo no centro
    this.bossBarBg = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 14, 162, 8, 0x18142a, 0.85).setStrokeStyle(1, COLORS.panelBorder)
      .setScrollFactor(0).setDepth(1500).setVisible(false);
    this.bossBar = scene.add.rectangle(GAME_WIDTH / 2 - 80, GAME_HEIGHT - 14, 160, 6, 0xaa6edc).setOrigin(0, 0.5)
      .setScrollFactor(0).setDepth(1501).setVisible(false);
    this.bossName = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '', textStyle(8, COLORS.gold, { stroke: '#18142a', strokeThickness: 3 }))
      .setOrigin(0.5).setScrollFactor(0).setDepth(1501).setResolution(TEXT_RES).setVisible(false);
  }

  /** Nome e vida de quem está sendo enfrentado (some com undefined). */
  setBoss(boss: { name: string; frac: number } | undefined): void {
    for (const o of [this.bossBarBg, this.bossBar, this.bossName]) o.setVisible(Boolean(boss));
    if (!boss) return;
    this.bossName.setText(boss.name);
    this.bossBar.width = 160 * Phaser.Math.Clamp(boss.frac, 0, 1);
  }

  setObjective(obj: { quest: string; objective: string } | undefined): void {
    this.questTitle.setText(obj ? `◆ ${obj.quest}` : '');
    this.questObjective.setText(obj?.objective ?? '');
    this.questBg.setVisible(Boolean(obj));
    if (obj) this.questBg.setSize(Math.max(this.questTitle.width, this.questObjective.width) + 8, 16 + this.questObjective.height);
  }

  setSpell(spell: { id: string; name: string } | undefined): void {
    this.spellBox.setVisible(Boolean(spell));
    if (!spell) return;
    this.spellIcon.setFrame(assets().frameOf(ICONS, spell.id) ?? 0);
    this.spellName.setText(spell.name);
    this.scene.tweens.add({ targets: this.spellBox, scale: { from: 1.15, to: 1 }, duration: 150 });
  }

  /** Corações (vida), gotas (energia mágica) e nível, embaixo do feitiço. */
  setVitals(v: { vida: number; vidaMax: number; energia: number; energiaMax: number; level: number }): void {
    const key = `${v.vida}/${v.vidaMax}/${v.energia}/${v.energiaMax}/${v.level}`;
    if (key === this.vitalsKey) return;
    const hurt = this.vitalsKey && v.vida < Number(this.vitalsKey.split('/')[0]);
    this.vitalsKey = key;
    this.vitals.forEach((o) => o.destroy());
    this.vitals = [];
    const right = GAME_WIDTH - 8;
    const add = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.GameObject>(o: T) => {
      o.setScrollFactor(0).setDepth(1500);
      this.vitals.push(o);
      return o;
    };
    for (let i = 0; i < v.vidaMax; i++) {
      add(this.scene.add.image(right - (v.vidaMax - i) * 9 + 4, 34, 'ui.vitais', i < v.vida ? 0 : 1));
    }
    for (let i = 0; i < v.energiaMax; i++) {
      add(this.scene.add.image(right - (v.energiaMax - i) * 7 + 4, 44, 'ui.vitais', i < v.energia ? 2 : 3).setScale(0.85));
    }
    add(this.scene.add.text(right - v.vidaMax * 9 - 4, 34, `Nv ${v.level}`, textStyle(8, COLORS.gold, { stroke: '#18142a', strokeThickness: 3 }))
      .setOrigin(1, 0.5).setResolution(TEXT_RES));
    if (hurt) this.scene.cameras.main.flash(120, 120, 20, 30);
  }

  setTimer(text: string | undefined): void {
    this.timer.setVisible(Boolean(text)).setText(text ?? '');
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
    const t = this.scene.add.text(GAME_WIDTH / 2, 60, text, textStyle(10, COLORS.gold, {
      backgroundColor: '#18142ae6', padding: { left: 10, right: 10, top: 4, bottom: 4 },
    })).setOrigin(0.5).setScrollFactor(0).setDepth(2500).setResolution(TEXT_RES).setAlpha(0);
    this.scene.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, y: 64, duration: 200 },
        { alpha: 0, duration: 300, delay: 1400 },
      ],
      onComplete: () => {
        t.destroy();
        this.next();
      },
    });
  }
}

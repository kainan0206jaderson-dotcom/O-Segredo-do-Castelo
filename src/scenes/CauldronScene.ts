import Phaser from 'phaser';
import { db } from '../content';
import { session } from '../core/session';
import { assets } from '../core/registry';
import { InputManager } from '../input/InputManager';
import { brew } from '../systems/brewing';
import { wantedRecipe } from '../systems/rules';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { shake, flash } from '../ui/fx';
import { audio } from '../audio/Audio';

const MAX_SLOTS = 3;

/** Caldeirão: escolher até 3 ingredientes e mexer. */
export class CauldronScene extends Phaser.Scene {
  private slots: string[] = [];
  private sel = 0;
  private controls!: InputManager;
  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private message!: Phaser.GameObjects.Text;
  /** Avisos para o mundo mostrar quando o caldeirão fechar. */
  static lastNotices: string[] = [];

  constructor() {
    super('Cauldron');
  }

  create(): void {
    this.slots = [];
    this.sel = 0;
    CauldronScene.lastNotices = [];
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0).setInteractive();
    this.add.rectangle(24, 16, GAME_WIDTH - 48, GAME_HEIGHT - 32, 0x2a2140, 0.98).setOrigin(0).setStrokeStyle(2, COLORS.panelBorder);
    this.add.text(38, 24, 'Caldeirão', textStyle(12, COLORS.gold, { fontStyle: 'bold' })).setResolution(TEXT_RES);
    this.add.text(38, 42, 'Escolha até 3 ingredientes e mexa.', textStyle(8, COLORS.muted)).setResolution(TEXT_RES);
    this.add.text(GAME_WIDTH - 34, 22, '✕', textStyle(12, COLORS.gold)).setOrigin(1, 0).setResolution(TEXT_RES)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    const pot = this.add.sprite(330, 120, 'prop.caldeirao', 0).setScale(4);
    pot.play('prop.caldeirao:idle');
    this.message = this.add.text(GAME_WIDTH / 2 + 60, 214, '', textStyle(9, COLORS.gold, { align: 'center', wordWrap: { width: 200 } })).setOrigin(0.5, 0).setResolution(TEXT_RES);
    this.controls = new InputManager(this, { touchControls: false });
    this.render();
    if (session.state.modo === 'kids') this.helpKids();
  }

  /** Modo Kids: mostra a receita que a missão pede e já põe os ingredientes no caldeirão. */
  private helpKids(): void {
    const id = wantedRecipe(session.state, db);
    if (!id) return;
    const r = db.recipes[id];
    const parts = Object.entries(r.ingredients).flatMap(([ing, n]) => Array<string>(n).fill(ing));
    const names = parts.map((ing) => db.items[ing]?.name.toLowerCase() ?? ing).join(' + ');
    const dish = db.items[r.result]?.name ?? id;
    const missing = parts.filter((ing) => (session.state.inventory[ing] ?? 0) < parts.filter((x) => x === ing).length);
    if (missing.length) {
      this.message.setText(`${dish}: ${names}.\nFalta ${db.items[missing[0]]?.name.toLowerCase() ?? missing[0]}: a despensa da cozinha tem!`);
      return;
    }
    this.slots = parts;
    this.render();
    this.sel = this.rows().findIndex((row) => row.label === '✦ Mexer');
    this.render();
    this.message.setText(`${dish}: ${names}.\nJá coloquei tudo no caldeirão. É só mexer!`);
  }

  private ingredients(): [string, number][] {
    const used: Record<string, number> = {};
    for (const s of this.slots) used[s] = (used[s] ?? 0) + 1;
    return Object.entries(session.state.inventory)
      .filter(([id]) => db.items[id]?.kind === 'ingrediente')
      .map(([id, n]) => [id, n - (used[id] ?? 0)] as [string, number]);
  }

  /** Linhas selecionáveis: ingredientes, depois os botões. */
  private rows(): { label: string; icon?: string; run: () => void; disabled?: boolean }[] {
    return [
      ...this.ingredients().map(([id, left]) => ({
        label: `${db.items[id].name} (${left})`, icon: id, disabled: left <= 0 || this.slots.length >= MAX_SLOTS,
        run: () => this.add_(id),
      })),
      { label: '✦ Mexer', run: () => this.stir(), disabled: !this.slots.length },
      { label: 'Esvaziar', run: () => { this.slots = []; this.render(); }, disabled: !this.slots.length },
      { label: 'Sair', run: () => this.close() },
    ];
  }

  private add_(id: string): void {
    if (this.slots.length >= MAX_SLOTS) return;
    this.slots.push(id);
    audio.sfx('pegar');
    this.message.setText('');
    this.render();
  }

  private stir(): void {
    const r = brew(session.state, db, this.slots);
    if (r.ok) {
      this.message.setText(`${r.discovered ? 'Receita descoberta! ' : ''}Você fez: ${db.items[r.item].name}`);
      CauldronScene.lastNotices.push(...r.notices.filter((n) => n.kind !== 'item').map((n) => n.text));
      audio.sfx('pocao');
      flash(this.cameras.main, 200, 120, 255, 160);
      session.save();
    } else {
      this.message.setText(r.reason === 'nao-combina' ? 'Puf! A mistura virou fumaça... e os ingredientes voltaram para a bolsa.' : 'Faltam ingredientes.');
      audio.sfx('erro');
      shake(this.cameras.main, 150, 0.004);
    }
    this.slots = [];
    this.sel = 0;
    this.render();
  }

  private render(): void {
    this.dynamic.forEach((o) => o.destroy());
    this.dynamic = [];
    const rows = this.rows();
    this.sel = Math.min(this.sel, rows.length - 1);
    rows.forEach((r, i) => {
      const y = 62 + i * 18;
      const on = i === this.sel;
      const bg = this.add.rectangle(34, y - 2, 180, 16, on ? 0x4a3d6a : 0x000000, on ? 1 : 0.001).setOrigin(0)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.sel = i; if (!r.disabled) r.run(); else this.render(); });
      this.dynamic.push(bg);
      if (r.icon) {
        const f = assets().frameOf('ui.icones', r.icon);
        if (f !== undefined) this.dynamic.push(this.add.image(44, y + 6, 'ui.icones', f).setAlpha(r.disabled ? 0.4 : 1));
      }
      this.dynamic.push(this.add.text(r.icon ? 56 : 42, y, r.label, textStyle(9, r.disabled ? COLORS.muted : on ? COLORS.gold : COLORS.text)).setResolution(TEXT_RES));
    });
    if (!this.ingredients().length) this.dynamic.push(this.add.text(38, 62 + rows.length * 18 + 4, 'Sem ingredientes na bolsa.\nProcure pelo castelo!', textStyle(8, COLORS.muted)).setResolution(TEXT_RES));
    // espaços do caldeirão
    for (let i = 0; i < MAX_SLOTS; i++) {
      const x = 290 + i * 40;
      const box = this.add.rectangle(x, 180, 30, 30, 0x18142a).setStrokeStyle(1, COLORS.panelBorder, 0.7).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.slots.splice(i, 1); this.render(); });
      this.dynamic.push(box);
      const id = this.slots[i];
      const f = id ? assets().frameOf('ui.icones', id) : undefined;
      if (f !== undefined) this.dynamic.push(this.add.image(x, 180, 'ui.icones', f).setScale(1.5));
    }
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('World', { from: 'cauldron' });
  }

  update(): void {
    const v = this.controls.navPressed();
    if (v) {
      this.sel = Phaser.Math.Wrap(this.sel + v, 0, this.rows().length);
      this.render();
    }
    if (this.controls.actionPressed()) {
      const r = this.rows()[this.sel];
      if (r && !r.disabled) r.run();
    }
    if (this.controls.menuPressed()) this.close();
  }
}

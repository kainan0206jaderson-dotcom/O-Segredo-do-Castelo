import Phaser from 'phaser';
import { db } from '../content';
import { session } from '../core/session';
import { assets } from '../core/registry';
import { InputManager } from '../input/InputManager';
import { useItem } from '../systems/rules';
import { stats } from '../systems/progression';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { flash } from '../ui/fx';
import { audio } from '../audio/Audio';

type Entry = { icon?: string; title: string; detail: string; muted?: boolean; use?: string };
const TABS = ['Aprendiz', 'Bolsa', 'Feitiços', 'Receitas', 'Missões'] as const;
const ROWS = 9;

/** Grimório: bolsa, feitiços, receitas e diário de missões. Abre por cima do mundo, que fica pausado. */
export class GrimoireScene extends Phaser.Scene {
  private tab = 0;
  private sel = 0;
  private controls!: InputManager;
  private tabTexts: Phaser.GameObjects.Text[] = [];
  private listObjs: Phaser.GameObjects.GameObject[] = [];
  private detailTitle!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private detailIcon!: Phaser.GameObjects.Image;
  private hint!: Phaser.GameObjects.Text;
  /** Avisos de itens usados aqui, mostrados no mundo ao fechar. */
  static lastNotices: string[] = [];

  constructor() {
    super('Grimoire');
  }

  create(): void {
    this.sel = 0;
    const x0 = 24;
    const y0 = 16;
    const w = GAME_WIDTH - 48;
    const h = GAME_HEIGHT - 32;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0).setInteractive();
    this.add.rectangle(x0, y0, w, h, 0x2a2140, 0.98).setOrigin(0).setStrokeStyle(2, COLORS.panelBorder);
    this.add.rectangle(x0 + w / 2, y0 + 30, 1, h - 40, COLORS.panelBorder, 0.4).setOrigin(0.5, 0);

    GrimoireScene.lastNotices = [];
    this.tabTexts = TABS.map((name, i) =>
      this.add.text(x0 + 12 + i * 76, y0 + 8, name, textStyle(10, COLORS.text)).setResolution(TEXT_RES)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setTab(i)),
    );
    this.add.text(x0 + w - 10, y0 + 6, '✕', textStyle(12, COLORS.gold)).setOrigin(1, 0).setResolution(TEXT_RES)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.add.text(x0 + w - 32, y0 + 8, '⚙ Opções', textStyle(9, COLORS.muted)).setOrigin(1, 0).setResolution(TEXT_RES)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openOptions());
    audio.sfx('menu');

    const dx = x0 + w / 2 + 12;
    this.detailIcon = this.add.image(dx + 8, y0 + 44, 'ui.icones', 0).setScale(2);
    this.detailTitle = this.add.text(dx + 26, y0 + 36, '', textStyle(11, COLORS.gold, { fontStyle: 'bold', wordWrap: { width: w / 2 - 50 } })).setResolution(TEXT_RES);
    this.detailBody = this.add.text(dx, y0 + 64, '', textStyle(9, COLORS.text, { wordWrap: { width: w / 2 - 24 }, lineSpacing: 3 })).setResolution(TEXT_RES);

    this.hint = this.add.text(dx, y0 + h - 12, '', textStyle(8, COLORS.gold)).setOrigin(0, 1).setResolution(TEXT_RES)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.useSelected());
    this.controls = new InputManager(this, { touchControls: false });
    this.setTab(this.tab);
  }

  private entries(): Entry[] {
    const s = session.state;
    switch (TABS[this.tab]) {
      case 'Aprendiz': {
        const st = stats(s, db);
        const house = s.house ? db.houses[s.house] : undefined;
        const capa = s.equipment.capa ? db.items[s.equipment.capa] : undefined;
        return [
          { icon: 'poder', title: `Nível ${st.level}`, detail: st.nextXp ? `Experiência: ${s.xp} de ${st.nextXp} para o nível ${st.level + 1}.\n\nMissões, desafios e sombrinhas espantadas dão experiência.` : `Experiência: ${s.xp}. Nível máximo!` },
          { icon: 'coracao', title: `Vida ${s.vida}/${st.vidaMax}`, detail: 'Sombrinhas tiram vida. Se acabar, você desmaia e acorda na entrada da sala. Sobremesa Mandrágora devolve vida.' },
          { icon: 'energia', title: `Energia ${s.energia}/${st.energiaMax}`, detail: 'Cada feitiço gasta energia mágica. Ela volta sozinha, e a Cerveja de Abóbora acelera.' },
          { icon: 'poder', title: `Poder ${st.poder}`, detail: 'A força dos seus feitiços contra criaturas. Sobe com o nível.' },
          { icon: house ? db.houses[s.house!].capa : 'bloqueado', title: house ? `Casa: ${house.name}` : 'Casa: ainda não escolhida', detail: house?.description ?? 'O Ministro Bonfatt ajuda cada aprendiz a escolher sua mesa no Grande Salão.', muted: !house },
          { icon: s.equipment.capa ?? 'bloqueado', title: capa ? `Capa: ${capa.name}` : 'Capa: nenhuma', detail: capa ? `${capa.description}\n\nTroque de capa na aba Bolsa.` : 'Capas aparecem na bolsa conforme você avança.', muted: !capa },
        ];
      }
      case 'Bolsa':
        return Object.entries(s.inventory).map(([id, n]) => {
          const it = db.items[id];
          const worn = s.equipment.capa === id;
          const use = it?.kind === 'equipamento' ? (worn ? undefined : 'vestir') : it?.use?.length ? 'usar' : undefined;
          return { icon: id, title: `${it?.name ?? id}${n > 1 ? ` ×${n}` : ''}${worn ? ' (vestindo)' : ''}`, detail: it?.description ?? '', use };
        });
      case 'Feitiços': {
        const known = s.spells.map((id) => ({ icon: id, title: db.spells[id].name + (db.spells[id].kind === 'extra' ? ' ★' : ''), detail: db.spells[id].description }));
        const extrasLeft = Object.entries(db.challenges).filter(([id]) => !s.challenges[id]?.done)
          .map(([, c]) => ({ icon: 'bloqueado', title: '???', detail: `Feitiço extra. Vença o desafio "${c.title}" para aprender.`, muted: true }));
        return [...known, ...extrasLeft];
      }
      case 'Receitas':
        return s.recipes.map((id) => {
          const r = db.recipes[id];
          const parts = Object.entries(r.ingredients).map(([i, n]) => `${n > 1 ? `${n}× ` : ''}${db.items[i].name}`);
          return { icon: r.result, title: db.items[r.result].name, detail: `${parts.join(' + ')}\n\n${db.items[r.result].description}` };
        });
      case 'Missões':
        return Object.entries(s.quests).reverse().map(([id, p]) => {
          const q = db.quests[id];
          const stage = q.stages.find((st) => st.id === p.stage);
          return { title: `${p.done ? '✓ ' : '◆ '}${q.title}`, detail: p.done ? 'Missão concluída.' : stage?.objective ?? '', muted: p.done };
        });
    }
  }

  private setTab(i: number): void {
    if (this.tabTexts.length && i !== this.tab) audio.sfx('blip');
    this.tab = Phaser.Math.Wrap(i, 0, TABS.length);
    this.sel = 0;
    this.tabTexts.forEach((t, j) => t.setColor(j === this.tab ? COLORS.gold : COLORS.muted).setText(`${j === this.tab ? '▸' : ' '}${TABS[j]}`));
    this.renderList();
  }

  private renderList(): void {
    this.listObjs.forEach((o) => o.destroy());
    this.listObjs = [];
    const list = this.entries();
    const x = 38;
    const y = 50;
    if (!list.length) {
      const empty = { Aprendiz: '', Bolsa: 'A bolsa está vazia.', Feitiços: 'Nenhum feitiço ainda.', Receitas: 'Nenhuma receita ainda.', Missões: 'Nenhuma missão ainda.' }[TABS[this.tab]];
      this.listObjs.push(this.add.text(x, y, empty, textStyle(9, COLORS.muted)).setResolution(TEXT_RES));
    }
    const start = Math.max(0, Math.min(this.sel - ROWS + 1, list.length - ROWS));
    list.slice(start, start + ROWS).forEach((e, k) => {
      const i = start + k;
      const on = i === this.sel;
      const row = this.add.rectangle(x - 4, y + k * 20 - 2, 196, 18, on ? 0x4a3d6a : 0x000000, on ? 1 : 0.001).setOrigin(0)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.sel === i) this.useSelected();
          else { this.sel = i; this.renderList(); }
        });
      this.listObjs.push(row);
      if (e.icon !== undefined) {
        const f = assets().frameOf('ui.icones', e.icon);
        if (f !== undefined) this.listObjs.push(this.add.image(x + 6, y + k * 20 + 7, 'ui.icones', f).setAlpha(e.muted ? 0.5 : 1));
      }
      this.listObjs.push(this.add.text(x + (e.icon ? 18 : 2), y + k * 20 + 1, e.title, textStyle(9, on ? COLORS.gold : e.muted ? COLORS.muted : COLORS.text)).setResolution(TEXT_RES));
    });
    const cur = list[this.sel];
    this.detailTitle.setText(cur?.title ?? '');
    this.detailBody.setText(cur?.detail ?? '');
    const f = cur?.icon ? assets().frameOf('ui.icones', cur.icon) : undefined;
    this.detailIcon.setVisible(f !== undefined);
    if (f !== undefined) this.detailIcon.setFrame(f);
    this.detailTitle.setX(f !== undefined ? 274 : 252);
    const touch = InputManager.isTouchDevice(this);
    this.hint.setText(cur?.use ? `${touch ? 'Toque aqui' : 'E'}: ${cur.use}` : '');
  }

  private useSelected(): void {
    const cur = this.entries()[this.sel];
    if (!cur?.use || !cur.icon) return;
    const r = useItem(session.state, db, cur.icon);
    if (!r.ok) return void audio.sfx('erro');
    audio.sfx('pocao');
    const texts = r.notices.filter((n) => n.text).map((n) => n.text);
    GrimoireScene.lastNotices.push(...texts);
    session.save();
    flash(this.cameras.main, 150, 120, 255, 160);
    this.sel = Math.min(this.sel, Math.max(0, this.entries().length - 1));
    this.renderList();
  }

  private openOptions(): void {
    this.scene.launch('Options', { back: 'Grimoire' });
    this.scene.pause();
  }

  private close(): void {
    audio.sfx('menu');
    this.scene.stop();
    this.scene.resume('World', { from: 'grimoire' });
  }

  update(): void {
    const h = this.controls.navHPressed();
    if (h) this.setTab(this.tab + h);
    const v = this.controls.navPressed();
    if (v) {
      const n = this.entries().length;
      if (n) {
        this.sel = Phaser.Math.Wrap(this.sel + v, 0, n);
        this.renderList();
      }
    }
    if (this.controls.actionPressed()) this.useSelected();
    if (this.controls.menuPressed()) this.close();
  }
}

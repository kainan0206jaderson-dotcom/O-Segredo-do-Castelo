import Phaser from 'phaser';
import { db } from '../content';
import { session } from '../core/session';
import { assets } from '../core/registry';
import { InputManager } from '../input/InputManager';
import { useItem } from '../systems/rules';
import { stats } from '../systems/progression';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { TEXT_RES, textStyle } from '../ui/theme';
import { flash } from '../ui/fx';
import { audio } from '../audio/Audio';

type Entry = { icon?: string; title: string; detail: string; muted?: boolean; use?: string; count?: number };
const TABS = ['Aprendiz', 'Bolsa', 'Feitiços', 'Receitas', 'Missões'] as const;
const TAB_ICON = ['poder', 'bolsa', 'varinha', 'drink-fumegante', 'grimorio'];
const BOLSA = 1;
/** Tamanho de cada bolsinho da grade e altura de cada linha das listas. */
const CELL = 40;
const ROW_H = 26;
const INK = '#3a2616';
const INK_L = '#6a4a2c';
const GOLD = '#f6d27a';
const STITCH = 0xe8cc96;

/** Ícone de 32 px (tools/art_icones32.py); cai no de 16 px ampliado se faltar. */
function icon(id: string | undefined): { key: string; frame: number; k: number } | undefined {
  if (!id) return undefined;
  const big = assets().frameOf('ui.icones32', id);
  if (big !== undefined) return { key: 'ui.icones32', frame: big, k: 1 };
  const small = assets().frameOf('ui.icones', id);
  return small !== undefined ? { key: 'ui.icones', frame: small, k: 2 } : undefined;
}

/**
 * Grimório e bolsa do aprendiz: abre com a bolsa de couro se abrindo e a tela "entrando" nela.
 * Abas de couro em cima; na Bolsa os itens ficam em bolsinhos costurados, nas outras abas numa lista.
 * À direita, um cartão de pergaminho mostra o item escolhido em tamanho grande.
 */
export class GrimoireScene extends Phaser.Scene {
  private tab = BOLSA;
  private sel = 0;
  private controls!: InputManager;
  private panel!: Phaser.GameObjects.Container;
  private tabObjs: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; ico?: Phaser.GameObjects.Image }[] = [];
  private listObjs: Phaser.GameObjects.GameObject[] = [];
  private detailTitle!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private detailIcon!: Phaser.GameObjects.Image;
  private detailGlow!: Phaser.GameObjects.Arc;
  private hintBtn!: Phaser.GameObjects.Rectangle;
  private hint!: Phaser.GameObjects.Text;
  private opening = false;
  private finishIntro: () => void = () => undefined;
  private box = { x0: 0, y0: 0, w: 0, h: 0, lx: 0, lw: 0, rx: 0, rw: 0, cy: 0, ch: 0 };
  /** Avisos de itens usados aqui, mostrados no mundo ao fechar. */
  static lastNotices: string[] = [];

  constructor() {
    super('Grimoire');
  }

  create(): void {
    this.sel = 0;
    this.tabObjs = [];
    this.listObjs = [];
    GrimoireScene.lastNotices = [];
    const x0 = 14;
    const y0 = 10;
    const w = GAME_WIDTH - 28;
    const h = GAME_HEIGHT - 20;
    const cy = y0 + 38;
    const ch = h - 48;
    const lx = x0 + 10;
    const lw = Math.round(w * 0.56);
    const rx = lx + lw + 8;
    const rw = x0 + w - 10 - rx;
    this.box = { x0, y0, w, h, lx, lw, rx, rw, cy, ch };

    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0712, 0.7).setOrigin(0).setInteractive();
    const panel = (this.panel = this.add.container(0, 0));
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (panel.add(o), o);

    // couro do painel, borda escura, costura tracejada e rebites de latão
    add(this.add.tileSprite(x0, y0, w, h, 'ui.couro').setOrigin(0));
    const g = add(this.add.graphics());
    g.lineStyle(3, 0x24140c).strokeRoundedRect(x0, y0, w, h, 6);
    g.lineStyle(1, 0x000000, 0.25).strokeRoundedRect(x0 + 3, y0 + 3, w - 6, h - 6, 4);
    g.fillStyle(STITCH, 0.85);
    for (let x = x0 + 8; x < x0 + w - 8; x += 6) {
      g.fillRect(x, y0 + 5, 3, 1);
      g.fillRect(x, y0 + h - 6, 3, 1);
    }
    for (let y = y0 + 8; y < y0 + h - 8; y += 6) {
      g.fillRect(x0 + 5, y, 1, 3);
      g.fillRect(x0 + w - 6, y, 1, 3);
    }
    for (const [x, y] of [[x0 + 9, y0 + 9], [x0 + w - 9, y0 + 9], [x0 + 9, y0 + h - 9], [x0 + w - 9, y0 + h - 9]]) {
      g.fillStyle(0x7a5420).fillCircle(x, y, 3);
      g.fillStyle(0xe2b450).fillCircle(x - 0.5, y - 0.5, 2);
    }
    // fundo escuro da área dos itens
    g.fillStyle(0x1e120a, 0.55).fillRoundedRect(lx, cy, lw, ch, 4);
    g.lineStyle(1, 0x000000, 0.4).strokeRoundedRect(lx, cy, lw, ch, 4);

    // abas: etiquetas de couro com ícone
    const tabW = Math.floor((w - 78) / TABS.length);
    TABS.forEach((name, i) => {
      const tx = x0 + 10 + i * (tabW + 2);
      const bg = add(this.add.rectangle(tx, y0 + 9, tabW, 24, 0x4a2e1e).setOrigin(0).setStrokeStyle(1, 0x24140c)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setTab(i)));
      const ic = icon(TAB_ICON[i]);
      const ico = ic ? add(this.add.image(tx + 12, y0 + 21, ic.key, ic.frame).setScale(0.5 * ic.k)) : undefined;
      const label = add(this.add.text(tx + (ico ? 23 : 6), y0 + 21, name, textStyle(10, '#d8c0a0')).setOrigin(0, 0.5).setResolution(TEXT_RES));
      this.tabObjs.push({ bg, label, ico });
    });
    add(this.add.text(x0 + w - 40, y0 + 21, '⚙', textStyle(14, GOLD)).setOrigin(0.5).setResolution(TEXT_RES)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openOptions()));
    add(this.add.text(x0 + w - 18, y0 + 21, '✕', textStyle(14, GOLD)).setOrigin(0.5).setResolution(TEXT_RES)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close()));

    // cartão de pergaminho com o item escolhido
    const card = add(this.add.graphics());
    card.fillStyle(0x000000, 0.35).fillRoundedRect(rx + 2, cy + 3, rw, ch, 5);
    card.fillStyle(0xecd9ad).fillRoundedRect(rx, cy, rw, ch, 5);
    card.fillStyle(0xdcc490).fillRoundedRect(rx + 3, cy + 3, rw - 6, 72, 4);
    card.lineStyle(2, 0x8a6a40).strokeRoundedRect(rx, cy, rw, ch, 5);
    card.lineStyle(1, 0xb08a58).strokeRoundedRect(rx + 3, cy + 3, rw - 6, ch - 6, 4);
    this.detailGlow = add(this.add.circle(rx + rw / 2, cy + 39, 26, 0xffe08a, 0.45));
    this.tweens.add({ targets: this.detailGlow, scale: 1.18, alpha: 0.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.detailIcon = add(this.add.image(rx + rw / 2, cy + 39, 'ui.icones32', 0).setScale(1.75));
    this.detailTitle = add(this.add.text(rx + rw / 2, cy + 82, '', textStyle(12, INK, { fontStyle: 'bold', align: 'center', wordWrap: { width: rw - 16 } }))
      .setOrigin(0.5, 0).setResolution(TEXT_RES));
    this.detailBody = add(this.add.text(rx + 9, cy + 104, '', textStyle(10, INK_L, { wordWrap: { width: rw - 18 }, lineSpacing: 2 })).setResolution(TEXT_RES));
    this.hintBtn = add(this.add.rectangle(rx + rw / 2, cy + ch - 15, rw - 24, 18, 0xc89a40).setStrokeStyle(1, 0x6a4a1c)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.useSelected()));
    this.hint = add(this.add.text(rx + rw / 2, cy + ch - 15, '', textStyle(10, '#2a1a0c', { fontStyle: 'bold' })).setOrigin(0.5).setResolution(TEXT_RES));

    this.controls = new InputManager(this, { touchControls: false });
    this.setTab(this.tab, true);
    this.playIntro(shade);
  }

  /** A bolsa aparece, a aba levanta, brilha e a tela "entra" nela. Qualquer tecla ou toque pula. */
  private playIntro(shade: Phaser.GameObjects.Rectangle): void {
    const cx = GAME_WIDTH / 2;
    const cyc = GAME_HEIGHT / 2;
    const bag = this.add.image(cx, cyc + 10, 'ui.bolsa', 0).setScale(1.6).setAlpha(0);
    const grow = { s: 0.82 };
    const place = () => this.panel.setScale(grow.s).setPosition(cx * (1 - grow.s), cyc * (1 - grow.s));
    this.panel.setAlpha(0);
    place();
    shade.setAlpha(0);
    this.opening = true;
    const timers: Phaser.Time.TimerEvent[] = [];
    const at = (ms: number, fn: () => void) => timers.push(this.time.delayedCall(ms, fn));

    this.tweens.add({ targets: shade, alpha: 0.7, duration: 200 });
    this.tweens.add({ targets: bag, alpha: 1, scale: 2.4, y: cyc, duration: 220, ease: 'Back.easeOut' });
    audio.sfx('menu');
    at(240, () => bag.setFrame(1));
    at(320, () => { bag.setFrame(2); audio.sfx('pegar'); });
    at(400, () => bag.setFrame(3));
    at(520, () => {
      this.tweens.add({ targets: bag, scale: 9, alpha: 0, duration: 320, ease: 'Cubic.easeIn' });
      this.tweens.add({ targets: this.panel, alpha: 1, duration: 260, delay: 80 });
      this.tweens.add({ targets: grow, s: 1, duration: 340, delay: 80, ease: 'Back.easeOut', onUpdate: place, onComplete: () => this.finishIntro() });
    });

    this.finishIntro = () => {
      if (!this.opening) return;
      this.opening = false;
      timers.forEach((t) => t.remove());
      this.tweens.killTweensOf([bag, grow, this.panel, shade]);
      bag.destroy();
      grow.s = 1;
      place();
      this.panel.setAlpha(1);
      shade.setAlpha(0.7);
    };
    this.input.once('pointerdown', () => this.finishIntro());
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
          ...(s.equipment.amuleto ? [{ icon: s.equipment.amuleto, title: `Amuleto: ${db.items[s.equipment.amuleto].name}`, detail: db.items[s.equipment.amuleto].description }] : []),
        ];
      }
      case 'Bolsa':
        return Object.entries(s.inventory).filter(([, n]) => n > 0).map(([id, n]) => {
          const it = db.items[id];
          const worn = Object.values(s.equipment).includes(id);
          const use = id === 'mapa-dos-segredos' ? 'abrir o mapa' : it?.kind === 'equipamento' ? (worn ? undefined : 'vestir') : it?.use?.length ? 'usar' : undefined;
          return { icon: id, title: `${it?.name ?? id}${n > 1 ? ` ×${n}` : ''}${worn ? ' (vestindo)' : ''}`, detail: it?.description ?? '', use, count: n };
        });
      case 'Feitiços': {
        const known = s.spells.map((id) => ({ icon: id, title: db.spells[id].name + (db.spells[id].kind === 'extra' ? ' ★' : ''), detail: db.spells[id].description }));
        const extrasLeft = Object.entries(db.challenges)
          .filter(([id, c]) => !s.challenges[id]?.done && c.reward.some((e) => 'learnSpell' in e))
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
          return { icon: p.done ? undefined : 'grimorio', title: `${p.done ? '✓ ' : ''}${q.title}`, detail: p.done ? 'Missão concluída.' : stage?.objective ?? '', muted: p.done };
        });
    }
  }

  private setTab(i: number, quiet = false): void {
    if (!quiet && i !== this.tab) audio.sfx('blip');
    this.tab = Phaser.Math.Wrap(i, 0, TABS.length);
    this.sel = 0;
    this.tabObjs.forEach((t, j) => {
      const on = j === this.tab;
      t.bg.setFillStyle(on ? 0x8a5a34 : 0x4a2e1e).setStrokeStyle(1, on ? 0xe2b450 : 0x24140c);
      t.label.setColor(on ? GOLD : '#c8b090');
      t.ico?.setAlpha(on ? 1 : 0.7);
    });
    this.renderList();
  }

  private gridCols(): number {
    return Math.max(1, Math.floor((this.box.lw - 8) / CELL));
  }

  private renderList(): void {
    this.listObjs.forEach((o) => o.destroy());
    this.listObjs = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.panel.add(o), this.listObjs.push(o), o);
    const { lx, lw, cy, ch } = this.box;
    const list = this.entries();
    if (!list.length) {
      const empty = { Aprendiz: '', Bolsa: 'A bolsa está vazia.', Feitiços: 'Nenhum feitiço ainda.', Receitas: 'Nenhuma receita ainda.', Missões: 'Nenhuma missão ainda.' }[TABS[this.tab]];
      add(this.add.text(lx + lw / 2, cy + ch / 2, empty, textStyle(11, '#c8b090')).setOrigin(0.5).setResolution(TEXT_RES));
    }
    const pick = (i: number) => () => {
      if (this.opening) return;
      if (this.sel === i) this.useSelected();
      else { this.sel = i; audio.sfx('blip'); this.renderList(); }
    };

    if (this.tab === BOLSA) {
      // bolsinhos costurados em grade
      const cols = this.gridCols();
      const rows = Math.max(1, Math.floor((ch - 8) / CELL));
      const gx = lx + Math.round((lw - cols * CELL) / 2) + CELL / 2;
      const gy = cy + 4 + CELL / 2;
      const row = Math.floor(this.sel / cols);
      const first = Math.max(0, Math.min(row - rows + 1, Math.ceil(list.length / cols) - rows));
      for (let k = 0; k < rows * cols; k++) {
        const i = first * cols + k;
        const x = gx + (k % cols) * CELL;
        const y = gy + Math.floor(k / cols) * CELL;
        const e = list[i];
        const on = i === this.sel && Boolean(e);
        const pocket = add(this.add.image(x, y, 'ui.bolso', on ? 1 : 0).setAlpha(e ? 1 : 0.45));
        if (!e) continue;
        pocket.setInteractive({ useHandCursor: true }).on('pointerdown', pick(i));
        const ic = icon(e.icon);
        if (ic) {
          const img = add(this.add.image(x, y, ic.key, ic.frame).setScale(ic.k * 0.94));
          if (on) this.tweens.add({ targets: img, y: y - 2, scale: ic.k * 1.04, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        if ((e.count ?? 1) > 1) {
          add(this.add.circle(x + 12, y + 12, 6, 0x24140c).setStrokeStyle(1, 0xe2b450));
          add(this.add.text(x + 12, y + 12, String(e.count), textStyle(8, GOLD, { fontStyle: 'bold' })).setOrigin(0.5).setResolution(TEXT_RES));
        }
      }
      if (first > 0) add(this.add.text(lx + lw - 8, cy + 6, '▲', textStyle(8, GOLD)).setOrigin(1, 0).setResolution(TEXT_RES));
      if ((first + rows) * cols < list.length) add(this.add.text(lx + lw - 8, cy + ch - 4, '▼', textStyle(8, GOLD)).setOrigin(1, 1).setResolution(TEXT_RES));
    } else {
      const rows = Math.floor((ch - 8) / ROW_H);
      const start = Math.max(0, Math.min(this.sel - rows + 1, list.length - rows));
      list.slice(start, start + rows).forEach((e, k) => {
        const i = start + k;
        const on = i === this.sel;
        const y = cy + 4 + k * ROW_H;
        add(this.add.rectangle(lx + 4, y, lw - 8, ROW_H - 2, on ? 0x8a5a34 : 0x3a2416, on ? 0.95 : 0.5).setOrigin(0)
          .setStrokeStyle(1, on ? 0xe2b450 : 0x24140c, on ? 1 : 0.6)
          .setInteractive({ useHandCursor: true }).on('pointerdown', pick(i)));
        const ic = icon(e.icon);
        if (ic) add(this.add.image(lx + 18, y + ROW_H / 2 - 1, ic.key, ic.frame).setScale(ic.k * 0.68).setAlpha(e.muted ? 0.5 : 1));
        add(this.add.text(lx + (ic ? 34 : 12), y + ROW_H / 2 - 1, e.title, textStyle(11, on ? GOLD : e.muted ? '#9a8470' : '#f0e2c8'))
          .setOrigin(0, 0.5).setResolution(TEXT_RES));
      });
    }

    const cur = list[this.sel];
    const { rx, rw } = this.box;
    this.detailTitle.setText(cur?.title ?? '');
    this.detailBody.setText(cur?.detail ?? '').setY(this.detailTitle.y + this.detailTitle.height + 6);
    const ic = icon(cur?.icon);
    this.detailIcon.setVisible(Boolean(ic)).setAlpha(cur?.muted ? 0.55 : 1);
    this.detailGlow.setVisible(Boolean(ic) && !cur?.muted);
    if (ic) this.detailIcon.setTexture(ic.key, ic.frame).setScale(1.75 * ic.k);
    this.detailIcon.setPosition(rx + rw / 2, this.box.cy + 39);
    const touch = InputManager.isTouchDevice(this);
    this.hint.setText(cur?.use ? `${touch ? 'Toque' : 'E'}: ${cur.use}` : '');
    this.hintBtn.setVisible(Boolean(cur?.use));
  }

  private useSelected(): void {
    const cur = this.entries()[this.sel];
    if (!cur?.use || !cur.icon) return;
    if (cur.icon === 'mapa-dos-segredos') {
      this.scene.launch('Map', { back: 'Grimoire' });
      this.scene.pause();
      return;
    }
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
    if (this.controls.menuPressed()) return this.close();
    const h = this.controls.navHPressed();
    const v = this.controls.navPressed();
    const act = this.controls.actionPressed();
    if (this.opening) {
      if (h || v || act) this.finishIntro();
      return;
    }
    const n = this.entries().length;
    if (this.tab === BOLSA && n) {
      // na grade: setas andam pelos bolsinhos; nas pontas, trocam de aba
      const cols = this.gridCols();
      if (h) {
        const next = this.sel + h;
        if ((h < 0 && this.sel % cols === 0) || next >= n) this.setTab(this.tab + h);
        else this.move(next);
      }
      if (v) {
        const next = this.sel + v * cols;
        if (next >= 0 && next < n) this.move(next);
        else if (v > 0 && Math.floor(this.sel / cols) < Math.floor((n - 1) / cols)) this.move(n - 1);
      }
    } else {
      if (h) this.setTab(this.tab + h);
      if (v && n) this.move(Phaser.Math.Wrap(this.sel + v, 0, n));
    }
    if (act) this.useSelected();
  }

  private move(i: number): void {
    if (i === this.sel) return;
    this.sel = i;
    audio.sfx('blip');
    this.renderList();
  }
}

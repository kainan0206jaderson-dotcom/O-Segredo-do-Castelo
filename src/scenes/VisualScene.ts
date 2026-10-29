import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_ZOOM } from '../config/game';
import { InputManager } from '../input/InputManager';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { session } from '../core/session';
import { AssetRegistry } from '../core/AssetRegistry';
import { playerSheet } from '../core/aparencia';
import { opcoesCabelo, opcoesPele, opcoesRoupa, visualAtual, type Visual } from '../core/visual';
import { audio } from '../audio/Audio';

interface Row {
  label: string;
  /** Opções da linha; sem opções é o botão "Pronto". */
  opts?: () => { nome: string; cor: string }[];
  get?: () => number;
  set?: (i: number) => void;
}

/**
 * Visual do aprendiz: pele, cabelo e roupa (duas por personagem), com o boneco girando ao
 * lado. Abre depois de escolher Orion ou Estela no Novo jogo e pelas Opções durante o jogo.
 */
export class VisualScene extends Phaser.Scene {
  private rows: Row[] = [];
  private sel = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private swatches: Phaser.GameObjects.Rectangle[] = [];
  private kid!: Phaser.GameObjects.Sprite;
  private facing = 0;
  private controls!: InputManager;
  private back = '';

  constructor() {
    super('Visual');
  }

  create(data: { back?: string }): void {
    this.back = data.back ?? '';
    this.sel = 0;
    const v = (): Visual => visualAtual();
    const put = (patch: Partial<Visual>) => {
      session.state.visual = { ...v(), ...patch };
      audio.sfx('menu');
    };
    const idx = (list: { id: string }[], id: string) => Math.max(0, list.findIndex((o) => o.id === id));
    this.rows = [
      { label: 'Pele', opts: opcoesPele, get: () => idx(opcoesPele(), v().pele), set: (i) => put({ pele: opcoesPele()[i].id }) },
      { label: 'Cabelo', opts: opcoesCabelo, get: () => idx(opcoesCabelo(), v().cabelo), set: (i) => put({ cabelo: opcoesCabelo()[i].id }) },
      { label: 'Roupa', opts: opcoesRoupa, get: () => v().roupa, set: (i) => put({ roupa: i }) },
      { label: 'Pronto' },
      // no Novo jogo dá para voltar para a escolha do personagem
      ...(this.back === 'Title' ? [{ label: 'Voltar' }] : []),
    ];

    const w = 300;
    const h = 52 + this.rows.length * 24;
    const x0 = (GAME_WIDTH - w) / 2;
    const y0 = (GAME_HEIGHT - h) / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive();
    this.add.rectangle(x0, y0, w, h, 0x2a2140, 1).setOrigin(0).setStrokeStyle(2, COLORS.panelBorder);
    this.add.text(x0 + w / 2, y0 + 10, 'Visual', textStyle(12, COLORS.gold)).setOrigin(0.5, 0).setResolution(TEXT_RES);

    // boneco grande à esquerda, virando de lado de tempos em tempos
    this.add.ellipse(x0 + 62, y0 + 128, 50, 10, 0x000000, 0.35);
    this.kid = this.add.sprite(x0 + 62, y0 + 128, playerSheet('player.aprendiz')).setOrigin(0.5, 1).setScale(4);
    this.facing = 0;
    this.showKid();
    this.time.addEvent({ delay: 1400, loop: true, callback: () => { this.facing = (this.facing + 1) % 4; this.showKid(); } });

    const tx = x0 + 192;
    this.texts = this.rows.map((r, i) => {
      const y = y0 + 38 + i * 24;
      const t = this.add.text(tx, y, '', textStyle(10, COLORS.text)).setOrigin(0.5, 0).setResolution(TEXT_RES)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (p: Phaser.Input.Pointer) => {
          this.sel = i;
          this.change(r.opts ? (p.x / RENDER_ZOOM < tx ? -1 : 1) : 0);
        });
      return t;
    });
    this.swatches = this.rows.map((_, i) => this.add.rectangle(tx - 74, y0 + 45 + i * 24, 8, 8, 0xffffff).setStrokeStyle(1, 0x18142a));
    this.controls = new InputManager(this, { touchControls: false });
    this.render();
  }

  private showKid(): void {
    const sheet = playerSheet('player.aprendiz');
    const dir = ['down', 'side', 'up', 'side'][this.facing];
    this.kid.setFlipX(this.facing === 3);
    this.kid.play(AssetRegistry.animKey(sheet, `walk-${dir}`));
  }

  private change(dir: number): void {
    const r = this.rows[this.sel];
    if (!r.opts) {
      if (dir === 0) {
        if (r.label === 'Voltar') this.goBack();
        else this.close();
      }
      return;
    }
    const n = r.opts().length;
    r.set!(Phaser.Math.Wrap(r.get!() + (dir || 1), 0, n));
    this.showKid();
    this.render();
  }

  private render(): void {
    this.texts.forEach((t, i) => {
      const r = this.rows[i];
      const on = i === this.sel;
      t.setColor(on ? COLORS.gold : COLORS.text);
      if (r.opts) {
        const o = r.opts()[r.get!()];
        t.setText(`${r.label}:  ${on ? '◂ ' : ''}${o.nome}${on ? ' ▸' : ''}`);
        this.swatches[i].setFillStyle(parseInt(o.cor, 16)).setVisible(true);
      } else {
        t.setText(`${on ? '▸ ' : ''}${r.label}${on ? ' ◂' : ''}`);
        this.swatches[i].setVisible(false);
      }
    });
  }

  /** Volta para a escolha do personagem (Novo jogo), pelo histórico como o gesto do celular. */
  private goBack(): void {
    audio.sfx('blip');
    history.back();
  }

  private close(): void {
    audio.sfx('confirmar');
    session.save();
    this.scene.stop();
    if (this.back) this.scene.resume(this.back, { from: 'visual' });
  }

  update(): void {
    const v = this.controls.navPressed();
    if (v) {
      this.sel = Phaser.Math.Wrap(this.sel + v, 0, this.rows.length);
      audio.sfx('blip');
      this.render();
    }
    const h = this.controls.navHPressed();
    if (h) this.change(h);
    if (this.controls.actionPressed()) this.change(0);
    if (this.controls.menuPressed()) {
      if (this.back === 'Title') this.goBack();
      else this.close();
    }
  }
}

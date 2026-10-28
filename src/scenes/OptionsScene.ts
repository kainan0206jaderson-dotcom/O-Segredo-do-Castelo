import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { InputManager } from '../input/InputManager';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { settings, setSetting, type Settings } from '../core/settings';
import { audio } from '../audio/Audio';

const TEXT_SPEEDS: Settings['texto'][] = ['normal', 'rapido', 'instantaneo'];
const SPEED_NAMES: Record<Settings['texto'], string> = { normal: 'Normal', rapido: 'Rápido', instantaneo: 'Na hora' };

interface Row {
  label: string;
  value?: () => string;
  /** -1 / +1 para as setas; 0 para a ação. */
  change: (dir: number) => void;
}

/** Opções: volume, velocidade do texto e tela tremendo. Abre por cima da tela inicial ou do grimório. */
export class OptionsScene extends Phaser.Scene {
  private rows: Row[] = [];
  private sel = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private controls!: InputManager;
  private back = '';

  constructor() {
    super('Options');
  }

  create(data: { back?: string }): void {
    this.back = data.back ?? '';
    this.sel = 0;
    const vol = (key: 'musica' | 'efeitos') => (dir: number) => {
      const v = Phaser.Math.Clamp(Math.round((settings[key] + (dir || 1) * 0.1) * 10) / 10, 0, 1);
      setSetting(key, dir === 0 && settings[key] >= 1 ? 0 : v);
      audio.sfx('menu');
    };
    this.rows = [
      { label: 'Música', value: () => bar(settings.musica), change: vol('musica') },
      { label: 'Efeitos', value: () => bar(settings.efeitos), change: vol('efeitos') },
      {
        label: 'Texto',
        value: () => SPEED_NAMES[settings.texto],
        change: (dir) => {
          setSetting('texto', TEXT_SPEEDS[Phaser.Math.Wrap(TEXT_SPEEDS.indexOf(settings.texto) + (dir || 1), 0, TEXT_SPEEDS.length)]);
          audio.sfx('menu');
        },
      },
      {
        label: 'Tela tremendo',
        value: () => (settings.tremor ? 'Sim' : 'Não'),
        change: () => {
          setSetting('tremor', !settings.tremor);
          audio.sfx('menu');
        },
      },
      { label: 'Voltar', change: (dir) => dir === 0 && this.close() },
    ];

    const w = 260;
    const h = 150;
    const x0 = (GAME_WIDTH - w) / 2;
    const y0 = (GAME_HEIGHT - h) / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive();
    this.add.rectangle(x0, y0, w, h, 0x2a2140, 1).setOrigin(0).setStrokeStyle(2, COLORS.panelBorder);
    this.add.text(GAME_WIDTH / 2, y0 + 10, 'Opções', textStyle(12, COLORS.gold)).setOrigin(0.5, 0).setResolution(TEXT_RES);
    this.texts = this.rows.map((r, i) => {
      const y = y0 + 34 + i * 20;
      // tocar na metade esquerda diminui, na direita aumenta
      return this.add.text(GAME_WIDTH / 2, y, '', textStyle(10, COLORS.text)).setOrigin(0.5, 0).setResolution(TEXT_RES)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (p: Phaser.Input.Pointer) => {
          this.sel = i;
          const dir = r.value && r.label !== 'Tela tremendo' && r.label !== 'Texto' ? (p.x < GAME_WIDTH / 2 ? -1 : 1) : 0;
          r.change(dir);
          this.render();
        });
    });
    this.controls = new InputManager(this, { touchControls: false });
    this.render();
  }

  private render(): void {
    this.texts.forEach((t, i) => {
      const r = this.rows[i];
      const on = i === this.sel;
      t.setColor(on ? COLORS.gold : COLORS.text);
      t.setText(r.value ? `${r.label}:  ${on ? '◂ ' : ''}${r.value()}${on ? ' ▸' : ''}` : `${on ? '▸ ' : ''}${r.label}${on ? ' ◂' : ''}`);
    });
  }

  private close(): void {
    audio.sfx('confirmar');
    this.scene.stop();
    if (this.back) this.scene.resume(this.back, { from: 'options' });
  }

  update(): void {
    const v = this.controls.navPressed();
    if (v) {
      this.sel = Phaser.Math.Wrap(this.sel + v, 0, this.rows.length);
      audio.sfx('blip');
      this.render();
    }
    const h = this.controls.navHPressed();
    if (h && this.rows[this.sel].value) {
      this.rows[this.sel].change(h);
      this.render();
    }
    if (this.controls.actionPressed()) {
      this.rows[this.sel].change(0);
      if (this.scene.isActive()) this.render();
    }
    if (this.controls.menuPressed()) this.close();
  }
}

function bar(v: number): string {
  const n = Math.round(v * 10);
  return `${'■'.repeat(n)}${'□'.repeat(10 - n)}`;
}

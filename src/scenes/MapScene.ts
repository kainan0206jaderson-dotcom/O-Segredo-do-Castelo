import Phaser from 'phaser';
import { session } from '../core/session';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { InputManager } from '../input/InputManager';
import { TEXT_RES, textStyle } from '../ui/theme';
import { audio } from '../audio/Audio';
import layoutJson from '../ui/mapa-layout.json';

interface Sala { x: number; y: number; w: number; h: number; nome: string; rotulo: string; dx?: number }
const layout = layoutJson as unknown as { w: number; h: number; salas: Record<string, Sala> };
/** Quadros da folha ui.mapa-marcas. */
const MARCA = { estrela: 0, bau: 1, segredo: 2, voce: 3 };
const INK = '#4a3220';
const INK_L = '#7a5a38';

interface MapInfo {
  stars: string[];
  hidden: string[];
  chests: string[];
}

/**
 * Mapa dos Segredos [FICÇÃO]: pergaminho em pixel art (tools/art_mapa.py) com as salas
 * desenhadas a partir dos mapas de verdade. Salas ainda não visitadas ficam na névoa.
 */
export class MapScene extends Phaser.Scene {
  private controls!: InputManager;
  private back = '';
  private closing = false;

  constructor() {
    super('Map');
  }

  create(data: { back?: string }): void {
    this.back = data.back ?? 'World';
    this.closing = false;
    const s = session.state;
    audio.sfx('menu');
    const ox = Math.round((GAME_WIDTH - layout.w) / 2);
    const oy = Math.round((GAME_HEIGHT - layout.h) / 2);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c0a1c, 0.75).setOrigin(0).setInteractive().on('pointerdown', () => this.close());

    // tudo que fica no pergaminho entra num container, para abrir junto
    const paper = this.add.container(ox, oy);
    paper.add(this.add.image(0, 0, 'ui.mapa', 0).setOrigin(0).setInteractive());
    const info = this.readMaps();
    const txt = (x: number, y: number, t: string, size: number, color: string, origin: [number, number] = [0.5, 0.5]) => {
      const o = this.add.text(x, y, t, textStyle(size, color)).setOrigin(...origin).setResolution(TEXT_RES);
      paper.add(o);
      return o;
    };
    txt(layout.w / 2, 18, 'Mapa dos Segredos', 11, '#f6ead0');
    txt(124, 38, 'Térreo e porão', 8, INK_L);
    txt(356, 38, 'Andar de cima', 8, INK_L);

    let starsLeft = 0;
    let secretsLeft = 0;
    for (const [key, r] of Object.entries(layout.salas)) {
      if (key.startsWith('_')) continue;
      const visited = Boolean(s.flags[`visitou:${key}`]);
      if (!visited) {
        // névoa: o mesmo pedaço do quadro 1 da folha, por cima da sala
        paper.add(this.add.image(0, 0, 'ui.mapa', 1).setOrigin(0).setCrop(r.x - 1, r.y - 1, r.w + 2, r.h + 2));
        if (r.nome) txt(r.x + r.w / 2, r.y + r.h / 2, '?', 10, INK_L);
      }
      if (r.nome) {
        const name = visited ? r.nome : '???';
        if (r.rotulo === 'b') txt(r.x + r.w / 2 + (r.dx ?? 0), r.y + r.h + 7, name, 7, INK);
        else if (r.rotulo === 't') txt(r.x + r.w / 2, r.y - 7, name, 7, INK);
        else txt(r.x - 4, r.y + r.h / 2, name, 7, INK, [1, 0.5]);
      }
      const mi = info[key];
      if (!mi) continue;
      const stars = mi.stars.filter((n) => !s.flags[`pego:${key}:${n}`]).length;
      const secrets = mi.hidden.filter((n) => !s.flags[`pego:${key}:${n}`]).length;
      const chests = mi.chests.filter((n) => !s.flags[`bau:${key}:${n}`]).length;
      starsLeft += stars;
      secretsLeft += secrets;
      // marcas na quina de cima da sala: estrelas que faltam, segredo, baú fechado
      const marks = [...Array<number>(Math.min(stars, 3)).fill(MARCA.estrela), ...(secrets ? [MARCA.segredo] : []), ...(chests ? [MARCA.bau] : [])];
      marks.forEach((f, i) => {
        const m = this.add.image(r.x + r.w - 5 - i * 9, r.y + 5, 'ui.mapa-marcas', f);
        paper.add(m);
        if (f === MARCA.estrela) this.tweens.add({ targets: m, scale: 1.25, duration: 500 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    }

    // você está aqui: alfinete de cera pulando e um anel pulsando na sala
    const here = layout.salas[s.map];
    if (here) {
      const cx = here.x + here.w / 2;
      const cy = here.y + here.h / 2;
      const ring = this.add.circle(cx, cy, 6).setStrokeStyle(1, 0xb03030);
      paper.add(ring);
      this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 1100, repeat: -1 });
      const pin = this.add.image(cx + 1, cy - 4, 'ui.mapa-marcas', MARCA.voce).setOrigin(0.5, 1).setScale(1.4);
      paper.add(pin);
      this.tweens.add({ targets: pin, y: cy - 8, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // legenda
    const got = s.inventory['estrela-perdida'] ?? 0;
    const ly = layout.h - 26;
    const legend: [number, string][] = [
      [MARCA.voce, 'Você'],
      [MARCA.estrela, `Estrelas: ${got} na bolsa, ${starsLeft} pelo castelo`],
      [MARCA.segredo, `Segredos: ${secretsLeft}`],
      [MARCA.bau, 'Baú fechado'],
    ];
    let lx = 24;
    for (const [f, t] of legend) {
      paper.add(this.add.image(lx, ly, 'ui.mapa-marcas', f));
      lx += 8 + txt(lx + 8, ly, t, 7, INK, [0, 0.5]).displayWidth + 12;
    }
    txt(lx, ly, '- - secreta ou trancada', 7, INK, [0, 0.5]);
    txt(layout.w - 22, 22, '✕', 11, INK).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());

    // abrir: o pergaminho desenrola do meio para os lados
    const mask = this.make.graphics({}, false);
    paper.setMask(mask.createGeometryMask());
    const roll = { w: 24 };
    const draw = () => mask.clear().fillStyle(0xffffff).fillRect(ox + layout.w / 2 - roll.w / 2, oy, roll.w, layout.h);
    draw();
    this.tweens.add({
      targets: roll, w: layout.w, duration: 380, ease: 'Cubic.easeOut', onUpdate: draw,
      onComplete: () => paper.clearMask(true),
    });
    this.controls = new InputManager(this, { touchControls: false });
  }

  /** Estrelas, segredos e baús de cada sala, lidos dos mapas carregados. */
  private readMaps(): Record<string, MapInfo> {
    const out: Record<string, MapInfo> = {};
    for (const key of Object.keys(layout.salas)) {
      const json = this.cache.tilemap.get(key)?.data as
        | { layers: { objects?: { name: string; type: string; properties?: { name: string; value: unknown }[] }[] }[] }
        | undefined;
      if (!json) continue;
      const objs = json.layers.flatMap((l) => l.objects ?? []);
      const p = (o: (typeof objs)[number], n: string) => o.properties?.find((x) => x.name === n)?.value;
      out[key] = {
        stars: objs.filter((o) => o.type === 'pickup' && p(o, 'item') === 'estrela-perdida').map((o) => o.name),
        hidden: objs.filter((o) => o.type === 'pickup' && p(o, 'oculto') && p(o, 'item') !== 'estrela-perdida').map((o) => o.name),
        chests: objs.filter((o) => o.type === 'chest').map((o) => o.name),
      };
    }
    return out;
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    audio.sfx('menu');
    this.scene.stop();
    this.scene.resume(this.back, { from: 'map' });
  }

  update(): void {
    if (this.controls.menuPressed() || this.controls.actionPressed() || this.controls.mapPressed()) this.close();
  }
}

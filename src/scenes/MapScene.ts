import Phaser from 'phaser';
import { session } from '../core/session';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { InputManager } from '../input/InputManager';
import { TEXT_RES, textStyle } from '../ui/theme';
import { audio } from '../audio/Audio';

/** Onde cada sala fica no desenho do mapa (centro, em pixels de tela) e o nome curto. */
const ROOMS: Record<string, { x: number; y: number; name: string; andar: 'terreo' | 'cima' }> = {
  'map.hall': { x: 34, y: 120, name: 'Hall', andar: 'terreo' },
  'map.corredor': { x: 88, y: 120, name: 'Corredor', andar: 'terreo' },
  'map.gabinete': { x: 88, y: 90, name: 'Gabinete', andar: 'terreo' },
  'map.grande-salao': { x: 150, y: 120, name: 'Grande Salão', andar: 'terreo' },
  'map.cozinha': { x: 207, y: 120, name: 'Cozinha', andar: 'terreo' },
  'map.recepcao': { x: 150, y: 162, name: 'Recepção', andar: 'terreo' },
  'map.porao': { x: 207, y: 176, name: 'Porão', andar: 'terreo' },
  'map.biblioteca': { x: 340, y: 168, name: 'Biblioteca', andar: 'cima' },
  'map.estufa': { x: 290, y: 168, name: 'Estufa', andar: 'cima' },
  'map.sala-espectral': { x: 392, y: 168, name: 'Aula', andar: 'cima' },
  'map.observatorio': { x: 326, y: 134, name: 'Observatório', andar: 'cima' },
  'map.galeria': { x: 362, y: 102, name: 'Galeria', andar: 'cima' },
  'map.coracao': { x: 424, y: 102, name: 'Coração', andar: 'cima' },
  'map.quadro-coragem': { x: 338, y: 74, name: '', andar: 'cima' },
  'map.quadro-inteligencia': { x: 354, y: 74, name: '', andar: 'cima' },
  'map.quadro-astucia': { x: 370, y: 74, name: '', andar: 'cima' },
  'map.quadro-lealdade': { x: 386, y: 74, name: '', andar: 'cima' },
};
const SCALE = 1.3;

interface MapInfo {
  w: number;
  h: number;
  doors: { target: string; secret: boolean }[];
  stars: string[];
  hidden: string[];
  chests: number;
}

/** Mapa dos Segredos [FICÇÃO]: o castelo inteiro, onde você está, passagens secretas e o que falta achar. */
export class MapScene extends Phaser.Scene {
  private controls!: InputManager;
  private back = '';

  constructor() {
    super('Map');
  }

  create(data: { back?: string }): void {
    this.back = data.back ?? 'World';
    const s = session.state;
    audio.sfx('menu');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive().on('pointerdown', () => this.close());
    // pergaminho
    this.add.rectangle(6, 6, GAME_WIDTH - 12, GAME_HEIGHT - 12, 0xe8d6a8).setOrigin(0).setStrokeStyle(2, 0x8a6a3a);
    this.add.rectangle(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20, 0xe8d6a8).setOrigin(0).setStrokeStyle(1, 0xb89a62);
    const ink = '#4a3220';
    this.add.text(GAME_WIDTH / 2, 14, 'Mapa dos Segredos', textStyle(12, ink)).setOrigin(0.5, 0).setResolution(TEXT_RES);
    this.add.text(124, 40, 'Térreo e porão', textStyle(8, '#7a5a38')).setOrigin(0.5, 0).setResolution(TEXT_RES);
    this.add.text(356, 40, 'Andar de cima', textStyle(8, '#7a5a38')).setOrigin(0.5, 0).setResolution(TEXT_RES);
    this.add.rectangle(244, 40, 1, 180, 0xb89a62).setOrigin(0);

    const info = this.readMaps();
    const g = this.add.graphics();
    // ligações (portas): tracejado para passagens secretas ou trancadas
    const drawn = new Set<string>();
    for (const [key, mi] of Object.entries(info)) {
      for (const d of mi.doors) {
        const a = ROOMS[key];
        const b = ROOMS[d.target];
        const id = [key, d.target].sort().join('|');
        if (!a || !b || drawn.has(id)) continue;
        drawn.add(id);
        if (a.andar !== b.andar) continue; // escada: desenhada à parte
        this.link(g, a.x, a.y, b.x, b.y, d.secret);
      }
    }
    // escada do Hall para a Biblioteca, entre os andares
    this.link(g, ROOMS['map.hall'].x, ROOMS['map.hall'].y + 12, ROOMS['map.biblioteca'].x - 20, ROOMS['map.biblioteca'].y + 16, true, true);
    this.add.text(150, 214, 'escada para o andar de cima ↗', textStyle(7, '#7a5a38')).setOrigin(0.5).setResolution(TEXT_RES);

    let starsLeft = 0;
    let secretsLeft = 0;
    for (const [key, r] of Object.entries(ROOMS)) {
      const mi = info[key];
      if (!mi) continue;
      const visited = Boolean(s.flags[`visitou:${key}`]);
      const w = r.name ? mi.w * SCALE : 12;
      const h = r.name ? mi.h * SCALE : 10;
      const here = s.map === key;
      g.fillStyle(visited ? 0xf6ead0 : 0xcbb78c, 1).fillRect(r.x - w / 2, r.y - h / 2, w, h);
      g.lineStyle(1, here ? 0xb03030 : 0x6a4a2a, 1).strokeRect(r.x - w / 2, r.y - h / 2, w, h);
      if (r.name) {
        this.add.text(r.x, r.y - 2, visited ? r.name : '???', textStyle(7, visited ? ink : '#8a7050')).setOrigin(0.5).setResolution(TEXT_RES);
      }
      const stars = mi.stars.filter((n) => !s.flags[`pego:${key}:${n}`]).length;
      const secrets = mi.hidden.filter((n) => !s.flags[`pego:${key}:${n}`]).length;
      starsLeft += stars;
      secretsLeft += secrets;
      const marks = `${stars ? '★'.repeat(stars) : ''}${secrets ? '✦' : ''}${mi.chests ? '▣' : ''}`;
      if (marks && r.name) this.add.text(r.x, r.y + 6, marks, textStyle(7, '#b0602a')).setOrigin(0.5).setResolution(TEXT_RES);
      if (here) {
        const dot = this.add.circle(r.x, r.y - h / 2 - 4, 3, 0xb03030);
        this.tweens.add({ targets: dot, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
        this.add.text(r.x, r.y - h / 2 - 12, 'você', textStyle(7, '#b03030')).setOrigin(0.5).setResolution(TEXT_RES);
      }
    }
    const got = s.inventory['estrela-perdida'] ?? 0;
    this.add.text(20, GAME_HEIGHT - 30,
      `★ Estrelas Perdidas: ${got} na bolsa, ${starsLeft} pelo castelo   ✦ segredos escondidos: ${secretsLeft}   ▣ baús   - - passagem secreta ou trancada`,
      textStyle(7, ink, { wordWrap: { width: GAME_WIDTH - 40 } })).setResolution(TEXT_RES);
    this.add.text(GAME_WIDTH - 16, 14, '✕', textStyle(12, ink)).setOrigin(1, 0).setResolution(TEXT_RES)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.controls = new InputManager(this, { touchControls: false });
  }

  private link(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, dashed: boolean, faint = false): void {
    g.lineStyle(dashed ? 1 : 2, faint ? 0x9a7a4a : 0x6a4a2a, 1);
    if (!dashed) {
      g.lineBetween(x1, y1, x2, y2);
      return;
    }
    const len = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    for (let t = 0; t < len; t += 6) {
      const a = t / len;
      const b = Math.min(1, (t + 3) / len);
      g.lineBetween(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
    }
  }

  /** Lê portas, estrelas e segredos direto dos mapas carregados. */
  private readMaps(): Record<string, MapInfo> {
    const out: Record<string, MapInfo> = {};
    for (const key of Object.keys(ROOMS)) {
      const json = this.cache.tilemap.get(key)?.data as
        | { width: number; height: number; layers: { type: string; objects?: { name: string; type: string; properties?: { name: string; value: unknown }[] }[] }[] }
        | undefined;
      if (!json) continue;
      const objs = json.layers.flatMap((l) => l.objects ?? []);
      const p = (o: (typeof objs)[number], n: string) => o.properties?.find((x) => x.name === n)?.value;
      out[key] = {
        w: json.width,
        h: json.height,
        doors: objs.filter((o) => o.type === 'door').map((o) => ({ target: String(p(o, 'target')), secret: p(o, 'when') !== undefined })),
        stars: objs.filter((o) => o.type === 'pickup' && p(o, 'item') === 'estrela-perdida').map((o) => o.name),
        hidden: objs.filter((o) => o.type === 'pickup' && p(o, 'oculto') && p(o, 'item') !== 'estrela-perdida').map((o) => o.name),
        chests: objs.filter((o) => o.type === 'chest').length,
      };
    }
    return out;
  }

  private close(): void {
    audio.sfx('menu');
    this.scene.stop();
    this.scene.resume(this.back, { from: 'map' });
  }

  update(): void {
    if (this.controls.menuPressed() || this.controls.actionPressed() || this.controls.mapPressed()) this.close();
  }
}

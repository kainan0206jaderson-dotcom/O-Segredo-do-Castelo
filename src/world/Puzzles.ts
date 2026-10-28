import Phaser from 'phaser';
import { TILE_SIZE } from '../config/game';
import { AssetRegistry } from '../core/AssetRegistry';
import { assets } from '../core/registry';
import { prop } from '../core/tiled';
import { Pushable } from '../entities/Pushable';
import { Levitable } from '../entities/Levitable';
import type { Player } from '../entities/Player';
import { shake } from '../ui/fx';

type TiledObject = Phaser.Types.Tilemaps.TiledObject;

export interface Plate {
  name: string;
  group: string;
  tx: number;
  ty: number;
  sprite: Phaser.GameObjects.Sprite;
  on: boolean;
}

export interface Gate {
  group: string;
  sprite: Phaser.GameObjects.Sprite;
  open: boolean;
}

/** Encaixe: bandeja (recebe objeto levitado) ou pedestal (recebe item da bolsa). */
export interface SocketSpot {
  name: string;
  group: string;
  accepts: string;
  mode: 'levitar' | 'item';
  dialogue?: string;
  /** Suporte de espelho do enigma da luz: para onde o espelho vira o raio. */
  turn?: '/' | '\\';
  x: number;
  y: number;
  filled: boolean;
  icon?: Phaser.GameObjects.Image;
}

export interface PuzzleEvents {
  /** Todas as placas de um grupo cobertas: abre as grades do grupo. */
  platesSolved(group: string): void;
  /** Encaixe preenchido por um objeto levitado. */
  socketFilled(socket: SocketSpot): void;
  /** Primeira vez encostando numa estátua. */
  firstPush(): void;
  /** Quadrado ocupado por outra coisa da sala (NPC, caldeirão...). */
  occupied(tx: number, ty: number): boolean;
}

const PUSH_HOLD_MS = 220;
const DROP_SNAP = 14;

/**
 * Enigmas físicos de uma sala: estátuas empurráveis, placas, grades,
 * objetos levitáveis e encaixes. A sala chama update() a cada quadro.
 */
export class Puzzles {
  readonly pushables: Pushable[] = [];
  readonly plates: Plate[] = [];
  readonly gates: Gate[] = [];
  readonly levitables: Levitable[] = [];
  readonly sockets: SocketSpot[] = [];
  carried?: Levitable;
  private pushMs = 0;
  private pushing?: Pushable;
  private touchedStatue = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly walls: Phaser.Tilemaps.TilemapLayer,
    private readonly events: PuzzleEvents,
  ) {}

  /** Cria o objeto do mapa se ele for de enigma. Devolve false se não for. */
  build(o: TiledObject): boolean {
    const sprite = prop<string>(o.properties, 'sprite');
    const group = prop<string>(o.properties, 'group') ?? '';
    switch (o.type) {
      case 'pushable': {
        const p = new Pushable(this.scene, o.x!, o.y!, sprite!, o.name, group);
        this.scene.physics.add.collider(this.player, p);
        this.pushables.push(p);
        return true;
      }
      case 'plate': {
        const tx = Math.floor(o.x! / TILE_SIZE);
        const ty = Math.floor((o.y! - 1) / TILE_SIZE);
        const s = this.scene.add.sprite(o.x!, o.y!, 'prop.placa', 0).setOrigin(0.5, 1).setDepth(2);
        this.plates.push({ name: o.name, group, tx, ty, sprite: s, on: false });
        return true;
      }
      case 'gate': {
        const s = this.scene.add.sprite(o.x!, o.y!, sprite!, 0).setOrigin(0.5, 1).setDepth(o.y!);
        this.scene.physics.add.existing(s, true);
        this.scene.physics.add.collider(this.player, s);
        this.gates.push({ group, sprite: s, open: false });
        return true;
      }
      case 'levitavel': {
        const l = new Levitable(this.scene, o.x!, o.y!, sprite!, o.name, prop<string>(o.properties, 'kind')!);
        this.scene.physics.add.collider(this.player, l);
        this.levitables.push(l);
        return true;
      }
      case 'socket': {
        if (prop<string>(o.properties, 'mode') !== 'levitar') return false; // pedestais viram Thing na cena
        const turn = prop<'/' | '\\'>(o.properties, 'turn');
        this.scene.add.sprite(o.x!, o.y!, sprite!, turn === '\\' ? 1 : 0).setOrigin(0.5, 1).setDepth(3);
        this.sockets.push({
          name: o.name, group, accepts: prop<string>(o.properties, 'accepts')!, mode: 'levitar',
          x: o.x!, y: o.y!, filled: false, turn,
        });
        return true;
      }
    }
    return false;
  }

  /** Pedestal (encaixe de item) criado pela cena como Thing; registrado aqui para saber quando o grupo fecha. */
  addItemSocket(o: TiledObject): SocketSpot {
    const s: SocketSpot = {
      name: o.name, group: prop<string>(o.properties, 'group') ?? '', accepts: prop<string>(o.properties, 'accepts')!,
      mode: 'item', dialogue: prop<string>(o.properties, 'dialogue'), x: o.x!, y: o.y!, filled: false,
    };
    this.sockets.push(s);
    return s;
  }

  /** Mostra a pedra (ou o ícone do item) em cima de um pedestal. */
  showFilled(s: SocketSpot): void {
    s.filled = true;
    if (s.mode !== 'item' || s.icon) return;
    const f = assets().frameOf('ui.icones', s.accepts);
    s.icon = this.scene.add.image(s.x, s.y - 26, 'ui.icones', f ?? 0).setDepth(s.y + 1);
    this.scene.tweens.add({ targets: s.icon, y: s.y - 28, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Encaixe de levitar já preenchido num save: põe um objeto do tipo certo nele. */
  restoreLevitated(name: string): void {
    const s = this.sockets.find((x) => x.name === name && x.mode === 'levitar');
    if (!s || s.filled) return;
    const l = this.levitables.find((x) => x.kind === s.accepts && x.state === 'parado');
    if (!l) return;
    s.filled = true;
    l.socket(s.x, s.y - 2);
  }

  groupFilled(group: string): boolean {
    const g = this.sockets.filter((s) => s.group === group);
    return g.length > 0 && g.every((s) => s.filled);
  }

  /** Enigma de placas já resolvido num save: estátuas em cima das placas e grade aberta. */
  restoreSolved(group: string): void {
    const plates = this.plates.filter((p) => p.group === group);
    this.pushables.filter((p) => p.group === group).forEach((p, i) => {
      const plate = plates[i];
      if (plate) p.placeAt(plate.tx, plate.ty);
    });
    this.refreshPlates();
    this.openGates(group, false);
  }

  openGates(group: string, animate = true): void {
    for (const g of this.gates.filter((x) => x.group === group && !x.open)) {
      g.open = true;
      g.sprite.setFrame(1);
      (g.sprite.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      if (animate) shake(this.scene.cameras.main, 250, 0.006);
    }
  }

  update(dir: Phaser.Math.Vector2, deltaMs: number): void {
    if (this.carried) this.carried.follow(this.player, deltaMs);
    this.updatePush(dir, deltaMs);
  }

  // ---------- empurrar

  private updatePush(dir: Phaser.Math.Vector2, deltaMs: number): void {
    const cardinal = (Math.abs(dir.x) > 0.7 && Math.abs(dir.y) < 0.3) || (Math.abs(dir.y) > 0.7 && Math.abs(dir.x) < 0.3);
    const dx = cardinal ? Math.round(dir.x) : 0;
    const dy = cardinal ? Math.round(dir.y) : 0;
    const target = cardinal ? this.statueInFront(dx, dy) : undefined;
    if (!target || target !== this.pushing) {
      this.pushing = target;
      this.pushMs = 0;
      return;
    }
    if (!this.touchedStatue) {
      this.touchedStatue = true;
      this.events.firstPush();
    }
    this.pushMs += deltaMs;
    if (this.pushMs < PUSH_HOLD_MS || target.sliding) return;
    this.pushMs = 0;
    const nx = target.tileX + dx;
    const ny = target.tileY + dy;
    if (!this.isFree(nx, ny, target)) {
      shake(this.scene.cameras.main, 80, 0.002);
      return;
    }
    target.slideTo(nx, ny, () => this.refreshPlates());
  }

  /** Estátua encostada na frente do aprendiz, na direção em que ele empurra. */
  private statueInFront(dx: number, dy: number): Pushable | undefined {
    const p = this.player;
    return this.pushables.find((s) => {
      if (s.sliding) return false;
      if (dx) return Math.abs(s.y - p.y) < 9 && Math.sign(s.x - p.x) === dx && Math.abs(s.x - p.x) < 17;
      return Math.abs(s.x - p.x) < 8 && Math.sign(s.y - p.y) === dy && Math.abs(s.y - p.y) < 15;
    });
  }

  /** O quadrado está livre para uma estátua ou um objeto pousar? */
  isFree(tx: number, ty: number, ignore?: object): boolean {
    const tile = this.walls.getTileAt(tx, ty);
    if (!this.walls.tilemap.getTileAt(tx, ty, true, this.walls.layerIndex)) return false; // fora do mapa
    if (tile?.properties?.collides) return false;
    if (this.pushables.some((p) => p !== ignore && p.tileX === tx && p.tileY === ty)) return false;
    if (this.levitables.some((l) => l !== ignore && l.state === 'parado' && l.tileX === tx && l.tileY === ty)) return false;
    for (const g of this.gates) {
      if (g.open) continue;
      const gx = Math.floor(g.sprite.x / TILE_SIZE);
      const gy = Math.floor((g.sprite.y - 1) / TILE_SIZE);
      if (ty === gy && (tx === gx || tx === gx - 1)) return false;
    }
    return !this.events.occupied(tx, ty);
  }

  /** Acende as placas cobertas e avisa quando um grupo inteiro fica coberto. */
  refreshPlates(): void {
    const groups = new Set(this.plates.map((p) => p.group));
    for (const p of this.plates) {
      p.on = this.pushables.some((s) => s.tileX === p.tx && s.tileY === p.ty);
      p.sprite.setFrame(p.on ? 1 : 0);
    }
    for (const g of groups) {
      if (this.plates.filter((p) => p.group === g).every((p) => p.on)) this.events.platesSolved(g);
    }
  }

  // ---------- levitar

  /** Objeto leve parado mais perto do ponto, dentro do alcance. */
  levitableNear(at: { x: number; y: number }, range: number): Levitable | undefined {
    return this.levitables
      .filter((l) => l.state !== 'flutuando')
      .map((l) => ({ l, d: Phaser.Math.Distance.Between(at.x, at.y, l.x, l.y - 6) }))
      .filter(({ d }) => d < range)
      .sort((a, b) => a.d - b.d)[0]?.l;
  }

  lift(l: Levitable): void {
    if (l.state === 'encaixado') {
      const s = this.sockets.find((x) => x.mode === 'levitar' && x.filled && Phaser.Math.Distance.Between(x.x, x.y, l.x, l.y) < 4);
      if (s) s.filled = false;
    }
    l.lift();
    this.carried = l;
  }

  /** Solta o objeto carregado à frente. Devolve o encaixe preenchido, false se não coube, ou true se pousou no chão. */
  drop(front: { x: number; y: number }): SocketSpot | boolean {
    const l = this.carried;
    if (!l) return false;
    const socket = this.sockets.find((s) => s.mode === 'levitar' && !s.filled && s.accepts === l.kind
      && Phaser.Math.Distance.Between(front.x, front.y, s.x, s.y - 6) < DROP_SNAP + 6);
    if (socket) {
      socket.filled = true;
      l.socket(socket.x, socket.y - 2);
      this.carried = undefined;
      this.events.socketFilled(socket);
      return socket;
    }
    const tx = Math.floor(front.x / TILE_SIZE);
    const ty = Math.floor(front.y / TILE_SIZE);
    if (!this.isFree(tx, ty, l) || this.playerTileIs(tx, ty)) return false;
    l.rest(tx * TILE_SIZE + TILE_SIZE / 2, (ty + 1) * TILE_SIZE);
    this.carried = undefined;
    return true;
  }

  private playerTileIs(tx: number, ty: number): boolean {
    return Math.floor(this.player.x / TILE_SIZE) === tx && Math.floor((this.player.y - 1) / TILE_SIZE) === ty;
  }

  /** Volta objetos de um tipo para o lugar de origem e esvazia as bandejas (fim da corrida). */
  resetKind(kind: string): void {
    for (const l of this.levitables.filter((x) => x.kind === kind)) {
      if (l === this.carried) this.carried = undefined;
      l.goHome();
      const fx = this.scene.add.sprite(l.x, l.y - 6, 'fx.fumaca').setDepth(l.depth + 1);
      fx.play(AssetRegistry.animKey('fx.fumaca', 'burst'));
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    }
    for (const s of this.sockets.filter((x) => x.mode === 'levitar' && x.accepts === kind)) s.filled = false;
  }
}

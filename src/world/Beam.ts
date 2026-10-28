import Phaser from 'phaser';
import { TILE_SIZE } from '../config/game';
import type { SocketSpot } from './Puzzles';

export interface BeamSource {
  tx: number;
  ty: number;
  dx: number;
  dy: number;
}

export interface BeamTarget {
  name: string;
  tx: number;
  ty: number;
  sprite: Phaser.GameObjects.Sprite;
}

const MAX_STEPS = 200;

/** Próxima direção do raio ao bater num espelho inclinado ("/" ou "\"). */
export function reflect(dx: number, dy: number, turn: '/' | '\\'): [number, number] {
  return turn === '/' ? [-dy, -dx] : [dy, dx];
}

/**
 * Caminho do raio de luz em quadrados do mapa: anda em linha reta, vira nos
 * suportes com espelho e para na parede ou no cristal. Sem Phaser, para testar.
 */
export function tracePath(
  source: BeamSource,
  target: { tx: number; ty: number },
  blocked: (tx: number, ty: number) => boolean,
  mirrorAt: (tx: number, ty: number) => '/' | '\\' | undefined,
): { points: [number, number][]; hit: boolean } {
  let { tx, ty, dx, dy } = source;
  const points: [number, number][] = [[tx, ty]];
  for (let i = 0; i < MAX_STEPS; i++) {
    tx += dx;
    ty += dy;
    if (tx === target.tx && ty === target.ty) {
      points.push([tx, ty]);
      return { points, hit: true };
    }
    if (blocked(tx, ty)) {
      points.push([tx - dx * 0.5, ty - dy * 0.5]);
      return { points, hit: false };
    }
    const turn = mirrorAt(tx, ty);
    if (turn) {
      points.push([tx, ty]);
      [dx, dy] = reflect(dx, dy, turn);
    }
  }
  points.push([tx, ty]);
  return { points, hit: false };
}

/** Enigma da luz: desenha o raio a cada quadro e avisa quando ele chega ao cristal. */
export class Beam {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly walls: Phaser.Tilemaps.TilemapLayer,
    private readonly source: BeamSource,
    readonly target: BeamTarget,
    private readonly stands: SocketSpot[],
  ) {
    this.g = scene.add.graphics().setDepth(900);
  }

  /** Redesenha e devolve true se o raio chega ao cristal. */
  update(time: number): boolean {
    const { points, hit } = tracePath(
      this.source, this.target,
      (tx, ty) => {
        const t = this.walls.tilemap.getTileAt(tx, ty, true, this.walls.layerIndex);
        return !t || Boolean(this.walls.getTileAt(tx, ty)?.properties?.collides);
      },
      (tx, ty) => this.stands.find((s) => s.filled && s.turn
        && Math.floor(s.x / TILE_SIZE) === tx && Math.floor((s.y - 1) / TILE_SIZE) === ty)?.turn,
    );
    const pulse = 0.65 + Math.sin(time / 120) * 0.2;
    this.g.clear();
    for (const [width, color, alpha] of [[5, 0xfad65c, 0.25 * pulse], [2, 0xfff6be, pulse]] as const) {
      this.g.lineStyle(width, color, alpha);
      this.g.beginPath();
      points.forEach(([tx, ty], i) => {
        const x = tx * TILE_SIZE + TILE_SIZE / 2;
        const y = ty * TILE_SIZE + TILE_SIZE / 2 - 4;
        if (i === 0) this.g.moveTo(x, y);
        else this.g.lineTo(x, y);
      });
      this.g.strokePath();
    }
    return hit;
  }

  clear(): void {
    this.g.clear();
  }
}

import Phaser from 'phaser';

const LIGHT_KEY = 'fx.luz-radial';
const LIGHT_SIZE = 128;

export interface Light {
  x: number;
  y: number;
  /** Raio em pixels. */
  r: number;
}

/**
 * Sala escura: uma camada preta por cima de tudo, com "buracos" de luz em volta
 * do aprendiz, das velas acesas e dos feitiços.
 */
export class Darkness {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private flashes: (Light & { until: number })[] = [];

  constructor(private readonly scene: Phaser.Scene, width: number, height: number) {
    Darkness.ensureTexture(scene);
    this.rt = scene.add.renderTexture(0, 0, width, height).setOrigin(0).setDepth(1000);
  }

  /** Gradiente redondo (branco no meio, transparente na borda), criado uma vez só. */
  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(LIGHT_KEY)) return;
    const tex = scene.textures.createCanvas(LIGHT_KEY, LIGHT_SIZE, LIGHT_SIZE)!;
    const ctx = tex.getContext();
    const half = LIGHT_SIZE / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LIGHT_SIZE, LIGHT_SIZE);
    tex.refresh();
  }

  /** Luz rápida (um feitiço lançado). */
  flash(x: number, y: number, r: number, ms: number): void {
    this.flashes.push({ x, y, r, until: this.scene.time.now + ms });
  }

  update(lights: Light[]): void {
    const now = this.scene.time.now;
    this.flashes = this.flashes.filter((f) => f.until > now);
    this.rt.clear();
    this.rt.fill(0x08050f, 0.94);
    for (const l of [...lights, ...this.flashes]) {
      this.rt.stamp(LIGHT_KEY, undefined, l.x, l.y, { scale: (l.r * 2) / LIGHT_SIZE, erase: true });
    }
  }
}

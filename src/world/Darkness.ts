import Phaser from 'phaser';
import type { Ambiente } from './ambiente';

const LIGHT_KEY = 'fx.luz-radial';
const LIGHT_SIZE = 128;

/** Profundidade da camada de sombra: acima do cenário e das pessoas, abaixo dos brilhos e do HUD. */
export const SHADE_DEPTH = 880;

export interface Light {
  x: number;
  y: number;
  /** Raio em pixels. */
  r: number;
  /** Quanto a luz clareia (1 = abre o escuro todo no centro). */
  i?: number;
  /** Cor da luz: pinta o chão em volta (quente nas velas, azul no luar). Sem cor, só clareia. */
  c?: number;
}

/**
 * Sombra da sala: uma camada da cor da noite por cima de tudo, com "buracos" de luz em volta
 * do aprendiz, das velas, das janelas e dos feitiços. Nas salas escuras de verdade ela é quase
 * preta; nas outras, é só a noite entrando pelo castelo.
 */
export class Darkness {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  /** Cor das luzes somada por cima (o chão fica dourado perto da vela, azulado no luar). */
  private readonly glow: Phaser.GameObjects.RenderTexture;
  private flashes: (Light & { until: number; ms: number })[] = [];
  /** Força da sombra agora: anda devagar até a do ambiente, para a luz voltar aos poucos. */
  private alpha: number;

  constructor(private readonly scene: Phaser.Scene, width: number, height: number, private ambiente: Ambiente) {
    Darkness.ensureTexture(scene);
    // passa um pouco das bordas: a câmera pode mostrar além da parede de cima (espaço do HUD)
    this.rt = scene.add.renderTexture(-64, -64, width + 128, height + 128).setOrigin(0).setDepth(SHADE_DEPTH);
    this.glow = scene.add.renderTexture(-64, -64, width + 128, height + 128).setOrigin(0).setDepth(SHADE_DEPTH + 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.alpha = ambiente.alpha;
  }

  get escuro(): boolean {
    return Boolean(this.ambiente.escuro);
  }

  setAmbiente(a: Ambiente): void {
    this.ambiente = a;
  }

  /** Gradiente redondo (branco no meio, transparente na borda), criado uma vez só. */
  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(LIGHT_KEY)) return;
    const tex = scene.textures.createCanvas(LIGHT_KEY, LIGHT_SIZE, LIGHT_SIZE)!;
    const ctx = tex.getContext();
    const half = LIGHT_SIZE / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    // queda suave (sem "degrau"): luzes vizinhas se juntam sem deixar manchas no chão
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      grad.addColorStop(t, `rgba(255,255,255,${((1 - t) ** 1.6).toFixed(3)})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LIGHT_SIZE, LIGHT_SIZE);
    tex.refresh();
  }

  /** Luz rápida (um feitiço lançado): acende forte e vai sumindo. */
  flash(x: number, y: number, r: number, ms: number): void {
    this.flashes.push({ x, y, r, i: 1, until: this.scene.time.now + ms, ms });
  }

  update(lights: Light[]): void {
    const now = this.scene.time.now;
    this.flashes = this.flashes.filter((f) => f.until > now);
    this.rt.clear();
    const target = this.ambiente.alpha;
    this.alpha += Phaser.Math.Clamp(target - this.alpha, -0.006, 0.006);
    this.rt.fill(this.ambiente.color, this.alpha);
    const ox = this.rt.x;
    const oy = this.rt.y;
    const fading = this.flashes.map((f) => ({ ...f, i: Math.min(1, (f.until - now) / (f.ms * 0.6)) }));
    this.glow.clear();
    // a cor pesa mais quanto mais escura a sala (no escuro, a vela é tudo o que se vê)
    const tintAlpha = 0.12 + this.alpha * 0.26;
    for (const l of [...lights, ...fading]) {
      this.rt.stamp(LIGHT_KEY, undefined, l.x - ox, l.y - oy, { scale: (l.r * 2) / LIGHT_SIZE, erase: true, alpha: l.i ?? 1 });
      if (l.c !== undefined) {
        this.glow.stamp(LIGHT_KEY, undefined, l.x - ox, l.y - oy, { scale: (l.r * 2) / LIGHT_SIZE, tint: l.c, alpha: tintAlpha * (l.i ?? 1) });
      }
    }
  }
}

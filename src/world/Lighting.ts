import Phaser from 'phaser';

/**
 * Sombra no chão e luz de vela/tocha, desenhadas na hora (sem PNG): toda criatura,
 * pessoa e móvel de pé ganha uma sombra oval embaixo, e cada chama ganha um halo
 * quente que tremula. As duas texturas respeitam a grade de pixel do jogo.
 */
const SHADOW = 'fx.sombra';
const HALO = 'fx.halo';
const HALO_SIZE = 48;

function ensureTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SHADOW)) {
    // oval de 14x5 em pixels inteiros: miolo mais escuro e borda clara
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x140f20, 0.34).fillRect(1, 0, 12, 5).fillRect(0, 1, 14, 3);
    g.fillStyle(0x140f20, 0.34).fillRect(3, 1, 8, 3);
    g.generateTexture(SHADOW, 14, 5);
    g.destroy();
  }
  if (!scene.textures.exists(HALO)) {
    // halo em degraus (4 anéis), para combinar com a pixel art em vez de um degradê liso
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = HALO_SIZE / 2;
    const rings: [number, number][] = [[24, 0.05], [20, 0.07], [16, 0.09], [12, 0.13], [8, 0.18], [4, 0.28]];
    for (const [r, a] of rings) g.fillStyle(0xffc860, a).fillCircle(c, c, r);
    g.generateTexture(HALO, HALO_SIZE, HALO_SIZE);
    g.destroy();
  }
}

type Anchored = Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible
  & Phaser.GameObjects.Components.AlphaSingle & Phaser.Events.EventEmitter & { active: boolean };

/**
 * Sombra oval embaixo de quem está de pé. width em pixels (padrão: cabe num personagem).
 * follow = true para quem anda: a sombra acompanha a cada quadro e some junto.
 */
export function dropShadow(scene: Phaser.Scene, target: Anchored, width = 14, follow = false): Phaser.GameObjects.Image {
  ensureTextures(scene);
  const s = scene.add.image(Math.round(target.x), Math.round(target.y) - 1, SHADOW).setOrigin(0.5, 0.5).setDepth(0.5);
  s.setScale(width / 14, 1);
  const sync = () => {
    if (!target.active) return;
    s.setPosition(Math.round(target.x), Math.round(target.y) - 1).setVisible(target.visible);
    s.setAlpha(target.alpha);
  };
  if (follow) {
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    target.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
      s.destroy();
    });
  } else {
    target.once(Phaser.GameObjects.Events.DESTROY, () => s.destroy());
  }
  return s;
}

/** Brilhos (halos, luar) ficam acima da camada de sombra, em modo de soma de luz. */
export const GLOW_DEPTH = 885;

/** Halo de luz em volta de uma chama, tremulando devagar. radius em pixels; color muda a cor (verde no caldeirão). */
export function torchHalo(scene: Phaser.Scene, x: number, y: number, radius = 22, color?: number): Phaser.GameObjects.Image {
  ensureTextures(scene);
  const h = scene.add.image(Math.round(x), Math.round(y), HALO).setBlendMode(Phaser.BlendModes.ADD)
    .setScale((radius * 2) / HALO_SIZE).setDepth(GLOW_DEPTH).setAlpha(0.9);
  if (color !== undefined) h.setTint(color);
  scene.tweens.add({
    targets: h, alpha: { from: 0.72, to: 1 }, scale: h.scale * 1.06,
    duration: Phaser.Math.Between(380, 620), yoyo: true, repeat: -1, ease: 'Sine.inOut',
    delay: Phaser.Math.Between(0, 400),
  });
  return h;
}

const SHAFT = 'fx.luar';
const SHAFT_W = 40;
const SHAFT_H = 48;
const DUST = 'fx.poeira';

/** Facho de luar: trapézio que abre para baixo, claro perto da janela e sumindo no chão, sem bordas duras. */
function ensureShaft(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SHAFT)) {
    const tex = scene.textures.createCanvas(SHAFT, SHAFT_W, SHAFT_H)!;
    const ctx = tex.getContext();
    // em degraus de 2 px, para não destoar da pixel art
    for (let y = 0; y < SHAFT_H; y += 2) {
      const t = y / SHAFT_H;
      const half = 6 + t * (SHAFT_W / 2 - 6);
      for (let x = 0; x < SHAFT_W; x += 2) {
        const d = Math.abs(x + 1 - SHAFT_W / 2) / half;
        if (d > 1) continue;
        const a = (1 - t) * 0.9 * (1 - d * d) * (t < 0.08 ? t / 0.08 : 1);
        ctx.fillStyle = `rgba(170,190,255,${(Math.round(a * 8) / 8).toFixed(3)})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    tex.refresh();
  }
  if (!scene.textures.exists(DUST)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1);
    g.generateTexture(DUST, 1, 1);
    g.destroy();
  }
}

/**
 * Luar entrando pela janela: um facho suave que desce da janela até o chão, com poeira
 * brilhando devagar dentro dele. (x, y) é o pé da janela, no meio do tile.
 * Devolve o ponto do chão iluminado, para a camada de sombra abrir um buraco ali.
 */
export function windowLight(scene: Phaser.Scene, x: number, y: number): { x: number; y: number } {
  ensureShaft(scene);
  const shaft = scene.add.image(Math.round(x), Math.round(y) - 4, SHAFT).setOrigin(0.5, 0)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(GLOW_DEPTH).setAlpha(0.32);
  scene.tweens.add({ targets: shaft, alpha: { from: 0.26, to: 0.36 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  scene.add.particles(0, 0, DUST, {
    x: { min: x - 10, max: x + 10 }, y: { min: y + 4, max: y + 30 }, lifespan: 4200, frequency: 900,
    speedY: { min: 1, max: 4 }, speedX: { min: -2, max: 2 }, alpha: { start: 0.55, end: 0 }, tint: 0xd8e0ff,
    blendMode: Phaser.BlendModes.ADD,
  }).setDepth(GLOW_DEPTH + 1);
  return { x: Math.round(x), y: Math.round(y) + 26 };
}

const SCONCE = 'fx.arandela';

/**
 * Arandela de parede (suporte de ferro com uma vela), desenhada em pixel art na hora.
 * Fica presa na parede (de cima, ou de lado com side), com halo quente; devolve a luz para a camada de sombra.
 */
export function wallSconce(scene: Phaser.Scene, x: number, y: number, side = false): { x: number; y: number } {
  if (!scene.textures.exists(SCONCE)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x1e1a28, 1).fillRect(2, 10, 5, 2).fillRect(3, 12, 3, 2).fillRect(4, 14, 1, 1); // suporte
    g.fillStyle(0x4a4058, 1).fillRect(2, 10, 5, 1);
    g.fillStyle(0xe8dcc0, 1).fillRect(3, 5, 3, 5); // vela
    g.fillStyle(0xc8b898, 1).fillRect(5, 5, 1, 5);
    g.fillStyle(0xffb040, 1).fillRect(3, 2, 3, 3); // chama
    g.fillStyle(0xfff0b0, 1).fillRect(4, 1, 1, 3);
    g.generateTexture(SCONCE, 9, 15);
    g.destroy();
  }
  const img = scene.add.image(Math.round(x), Math.round(y), SCONCE).setOrigin(0.5, 1).setDepth(side ? Math.round(y) : 1);
  torchHalo(scene, img.x, img.y - 13, 22);
  return { x: img.x, y: img.y - 8 };
}

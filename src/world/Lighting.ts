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
    g.fillStyle(0x140f20, 0.28).fillRect(1, 0, 12, 5).fillRect(0, 1, 14, 3);
    g.fillStyle(0x140f20, 0.3).fillRect(3, 1, 8, 3);
    g.generateTexture(SHADOW, 14, 5);
    g.destroy();
  }
  if (!scene.textures.exists(HALO)) {
    // halo em degraus (4 anéis), para combinar com a pixel art em vez de um degradê liso
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = HALO_SIZE / 2;
    const rings: [number, number][] = [[24, 0.18], [18, 0.22], [12, 0.3], [6, 0.4]];
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

/** Halo de luz quente em volta de uma chama, tremulando devagar. radius em pixels. */
export function torchHalo(scene: Phaser.Scene, x: number, y: number, radius = 22): Phaser.GameObjects.Image {
  ensureTextures(scene);
  const h = scene.add.image(Math.round(x), Math.round(y), HALO).setBlendMode(Phaser.BlendModes.ADD)
    .setScale((radius * 2) / HALO_SIZE).setDepth(1).setAlpha(0.9);
  scene.tweens.add({
    targets: h, alpha: { from: 0.75, to: 1 }, scale: h.scale * 1.06,
    duration: Phaser.Math.Between(380, 620), yoyo: true, repeat: -1, ease: 'Sine.inOut',
    delay: Phaser.Math.Between(0, 400),
  });
  return h;
}

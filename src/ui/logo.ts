import Phaser from 'phaser';
import bulbs from './logo-lampadas.json';

/**
 * Logo do jogo em estilo letreiro (arte em tools/art_logo.py), com as lampadinhas da
 * moldura acendendo em sequência, como letreiro de teatro. A origem é o centro do topo.
 */
export function addLogo(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const img = scene.add.image(0, 0, 'ui.logo').setOrigin(0.5, 0);
  const left = -img.width / 2;
  const box = scene.add.container(x, y, [img]);
  const lights = (bulbs as [number, number][]).map(([bx, by], i) => {
    const glow = scene.add.circle(left + bx + 0.5, by + 0.5, 2.5, 0xffe9a0, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: glow, alpha: 0.15, duration: 420, yoyo: true, repeat: -1, delay: (i % 3) * 280, ease: 'Sine.easeInOut',
    });
    return glow;
  });
  box.add(lights);
  return box;
}

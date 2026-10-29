import Phaser from 'phaser';

const STAR = 'guia.estrela';
const DOTS = 4;

/**
 * Modo Kids: estrelinhas douradas que saem do aprendiz na direção do objetivo
 * (ou da porta do caminho), e uma estrela maior pulando em cima do alvo.
 */
export class GuideTrail {
  private dots: Phaser.GameObjects.Image[];
  private marker: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(STAR)) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(0xffe27a, 1);
      g.fillPoints([
        { x: 4, y: 0 }, { x: 5, y: 3 }, { x: 8, y: 4 }, { x: 5, y: 5 },
        { x: 4, y: 8 }, { x: 3, y: 5 }, { x: 0, y: 4 }, { x: 3, y: 3 },
      ].map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
      g.fillStyle(0xffffff, 1).fillRect(4, 3, 1, 2);
      g.generateTexture(STAR, 9, 9).destroy();
    }
    this.dots = Array.from({ length: DOTS }, () => scene.add.image(0, 0, STAR).setDepth(1850).setVisible(false));
    this.marker = scene.add.image(0, 0, STAR).setScale(2).setDepth(1850).setVisible(false);
  }

  destroy(): void {
    for (const d of this.dots) d.destroy();
    this.marker.destroy();
  }

  hide(): void {
    for (const d of this.dots) d.setVisible(false);
    this.marker.setVisible(false);
  }

  update(from: { x: number; y: number }, to: { x: number; y: number } | undefined, time: number): void {
    if (!to) return this.hide();
    const dir = new Phaser.Math.Vector2(to.x - from.x, to.y - from.y);
    const dist = dir.length();
    dir.normalize();
    this.dots.forEach((d, i) => {
      const along = 16 + i * 13;
      const wave = (Math.sin(time / 160 - i * 1.2) + 1) / 2;
      d.setVisible(dist > along + 16)
        .setPosition(Math.round(from.x + dir.x * along), Math.round(from.y + dir.y * along))
        .setAlpha(0.5 + 0.5 * wave).setScale(1 + 0.5 * wave);
    });
    this.marker.setVisible(true)
      .setPosition(Math.round(to.x), Math.round(to.y - 18 + Math.sin(time / 220) * 3))
      .setAngle(Math.sin(time / 400) * 12);
  }
}

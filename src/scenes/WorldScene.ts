import Phaser from 'phaser';
import { assets } from '../core/registry';
import { AssetRegistry } from '../core/AssetRegistry';
import { events } from '../core/EventBus';
import { Player } from '../entities/Player';
import { InputManager } from '../input/InputManager';

interface WorldData {
  map: string;
}

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputManager;

  constructor() {
    super('World');
  }

  create(data: WorldData): void {
    const mapDef = assets().map(data.map);
    const map = this.make.tilemap({ key: data.map });
    const tilesets = mapDef.tilesets.map((key) => map.addTilesetImage(assets().tileset(key).tiledName, key)!);

    map.createLayer('chao', tilesets)!;
    const walls = map.createLayer('paredes', tilesets)!;
    walls.setCollisionByProperty({ collides: true });

    const objects = map.getObjectLayer('objetos')?.objects ?? [];
    const spawn = objects.find((o) => o.type === 'spawn') ?? { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
    this.player = new Player(this, spawn.x!, spawn.y!);
    this.physics.add.collider(this.player, walls);

    // objetos independentes: cada um diz qual sprite usa pela chave do manifesto
    for (const o of objects.filter((o) => o.type === 'prop')) {
      const sprite = (o.properties as { name: string; value: string }[] | undefined)?.find((p) => p.name === 'sprite')?.value;
      if (!sprite) continue;
      const prop = this.add.sprite(o.x!, o.y!, sprite).setOrigin(0.5, 1).setDepth(o.y!);
      if (assets().hasAnimation(sprite, 'idle')) prop.play({ key: AssetRegistry.animKey(sprite, 'idle'), startFrame: Phaser.Math.Between(0, 3) });
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);

    this.controls = new InputManager(this);
    this.add.text(4, 4, 'Etapa 0 · arte provisória · WASD/setas ou toque à esquerda', { fontFamily: 'monospace', fontSize: '8px', color: '#e8e0f0' })
      .setScrollFactor(0).setDepth(1000).setResolution(4).setAlpha(0.7);

    events.emit('map:entered', { map: data.map });
  }

  update(): void {
    this.player.move(this.controls.direction());
  }
}

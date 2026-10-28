import Phaser from 'phaser';
import { assets } from '../core/registry';
import { AssetRegistry } from '../core/AssetRegistry';
import { events } from '../core/EventBus';
import { prop } from '../core/tiled';
import { session } from '../core/session';
import { db, dialogues } from '../content';
import { Player, type Facing } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { InputManager } from '../input/InputManager';
import { DialogueRunner } from '../systems/DialogueRunner';
import { currentObjective } from '../systems/rules';
import { DialogueBox } from '../ui/DialogueBox';
import { Hud } from '../ui/Hud';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';

export interface WorldData {
  map: string;
  spawn?: string;
}

const FADE_MS = 220;
const TALK_RANGE = 20;

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputManager;
  private npcs: Npc[] = [];
  private nearNpc?: Npc;
  private talkingTo?: Npc;
  private dialogue?: DialogueRunner;
  private dialogueBox!: DialogueBox;
  private hud!: Hud;
  private transitioning = false;

  constructor() {
    super('World');
  }

  create(data: WorldData): void {
    this.transitioning = false;
    this.npcs = [];
    this.nearNpc = undefined;
    this.dialogue = undefined;
    this.talkingTo = undefined;

    const mapDef = assets().map(data.map);
    const map = this.make.tilemap({ key: data.map });
    const tilesets = mapDef.tilesets.map((key) => map.addTilesetImage(assets().tileset(key).tiledName, key)!);

    map.createLayer('chao', tilesets)!;
    const walls = map.createLayer('paredes', tilesets)!;
    walls.setCollisionByProperty({ collides: true });

    const objects = map.getObjectLayer('objetos')?.objects ?? [];
    const spawns = objects.filter((o) => o.type === 'spawn');
    const spawn = spawns.find((o) => o.name === data.spawn) ?? spawns[0] ?? { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
    this.player = new Player(this, spawn.x!, spawn.y!, prop<Facing>(spawn.properties, 'facing') ?? 'down');
    this.physics.add.collider(this.player, walls);

    // objetos independentes: cada um diz qual sprite usa pela chave do manifesto
    for (const o of objects.filter((o) => o.type === 'prop')) {
      const sprite = prop(o.properties, 'sprite');
      if (!sprite) continue;
      const p = this.add.sprite(o.x!, o.y!, sprite).setOrigin(0.5, 1).setDepth(o.y!);
      if (assets().hasAnimation(sprite, 'idle')) p.play({ key: AssetRegistry.animKey(sprite, 'idle'), startFrame: Phaser.Math.Between(0, 2) });
    }

    for (const o of objects.filter((o) => o.type === 'npc')) {
      const npc = new Npc(this, o.x!, o.y!, prop(o.properties, 'sprite')!, prop(o.properties, 'dialogue')!, prop<boolean>(o.properties, 'wall') ?? false);
      if (npc.body) this.physics.add.collider(this.player, npc);
      this.npcs.push(npc);
    }

    // portas: zonas que levam a outro mapa e a um ponto de chegada
    for (const o of objects.filter((o) => o.type === 'door')) {
      const zone = this.add.zone(o.x! + o.width! / 2, o.y! + o.height! / 2, o.width!, o.height!);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () =>
        this.goTo({ map: prop(o.properties, 'target')!, spawn: prop(o.properties, 'spawn') }),
      );
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.setupCamera(map);
    this.controls = new InputManager(this);
    this.dialogueBox = new DialogueBox(this);
    this.dialogueBox.onChoice = (i) => this.choose(i);
    this.hud = new Hud(this);
    this.hud.setObjective(currentObjective(session.state, db));
    this.showRoomName(prop(map.properties, 'nome') ?? '');
    this.cameras.main.fadeIn(FADE_MS, 24, 20, 42);

    // salvamento automático a cada sala
    session.state.map = data.map;
    session.state.spawn = data.spawn ?? spawn.name ?? '';
    session.save();
    events.emit('map:entered', { map: data.map });
  }

  /** Mapas menores que a tela ficam centralizados; maiores seguem o jogador. */
  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const cam = this.cameras.main;
    const w = map.widthInPixels;
    const h = map.heightInPixels;
    const bx = w < GAME_WIDTH ? -(GAME_WIDTH - w) / 2 : 0;
    const by = h < GAME_HEIGHT ? -(GAME_HEIGHT - h) / 2 : 0;
    cam.setBounds(bx, by, Math.max(w, GAME_WIDTH), Math.max(h, GAME_HEIGHT));
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setDeadzone(48, 32);
    cam.setRoundPixels(true);
  }

  private showRoomName(name: string): void {
    if (!name) return;
    const label = this.add.text(GAME_WIDTH / 2, 18, name, {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#fad65c', stroke: '#18142a', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setResolution(4).setAlpha(0);
    this.tweens.chain({
      targets: label,
      tweens: [
        { alpha: 1, y: 22, duration: 300 },
        { alpha: 0, duration: 400, delay: 1600 },
      ],
      onComplete: () => label.destroy(),
    });
  }

  private goTo(target: WorldData): void {
    if (this.transitioning || this.dialogue) return;
    this.transitioning = true;
    this.player.halt();
    this.cameras.main.fadeOut(FADE_MS, 24, 20, 42);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(target));
  }

  private findNearNpc(): Npc | undefined {
    const front = this.player.frontPoint(10);
    let best: Npc | undefined;
    let bestDist = TALK_RANGE;
    for (const npc of this.npcs) {
      // a parede não deixa o jogador chegar perto da frente de um quadro; mede pelos pés
      const from = npc.onWall ? this.player : front;
      const d = Phaser.Math.Distance.BetweenPoints(from, npc.talkPoint);
      if (d < bestDist) {
        best = npc;
        bestDist = d;
      }
    }
    return best;
  }

  private startDialogue(npc: Npc): void {
    const def = dialogues[npc.dialogueId];
    if (!def) throw new Error(`diálogo não encontrado: ${npc.dialogueId}`);
    this.player.halt();
    npc.setHighlighted(false);
    this.talkingTo = npc;
    this.dialogue = new DialogueRunner(def, session.state, db);
    this.showCurrentLine();
  }

  private showCurrentLine(): void {
    this.flushNotices();
    const view = this.dialogue?.view();
    if (!view) {
      this.endDialogue();
      return;
    }
    this.talkingTo?.setTalking(true);
    this.dialogueBox.show(view);
  }

  private choose(index: number): void {
    if (!this.dialogue || !this.dialogueBox.hasChoices) return;
    this.dialogue.choose(index);
    this.showCurrentLine();
  }

  private advanceDialogue(): void {
    if (!this.dialogue) return;
    if (this.dialogueBox.typing) {
      this.dialogueBox.skipTyping();
      return;
    }
    if (this.dialogueBox.hasChoices) {
      this.choose(this.dialogueBox.selectedIndex);
      return;
    }
    this.dialogue.next();
    this.showCurrentLine();
  }

  private endDialogue(): void {
    this.dialogueBox.hide();
    this.talkingTo?.setTalking(false);
    this.talkingTo = undefined;
    this.dialogue = undefined;
    this.hud.setObjective(currentObjective(session.state, db));
    session.save();
  }

  private flushNotices(): void {
    const notices = this.dialogue?.notices.splice(0) ?? [];
    for (const n of notices) this.hud.notify(n.text);
    if (notices.length) this.hud.setObjective(currentObjective(session.state, db));
  }

  private castSparkle(): void {
    const at = this.player.frontPoint();
    const fx = this.add.sprite(at.x, at.y, 'fx.fagulha').setDepth(this.player.depth + 1);
    fx.play(AssetRegistry.animKey('fx.fagulha', 'burst'));
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  update(_time: number, delta: number): void {
    session.state.playTimeMs += delta;
    if (this.transitioning) return;

    if (this.dialogue) {
      this.dialogueBox.update(delta);
      if (!this.dialogueBox.typing) this.talkingTo?.setTalking(false);
      const nav = this.controls.navPressed();
      if (nav) this.dialogueBox.moveSelection(nav);
      if (this.controls.actionPressed()) this.advanceDialogue();
      return;
    }

    this.player.move(this.controls.direction());
    const near = this.findNearNpc();
    if (near !== this.nearNpc) {
      this.nearNpc?.setHighlighted(false);
      near?.setHighlighted(true);
      this.nearNpc = near;
    }
    if (this.controls.actionPressed()) {
      if (near) this.startDialogue(near);
      else this.castSparkle();
    }
  }
}

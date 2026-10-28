import Phaser from 'phaser';
import { assets } from '../core/registry';
import { AssetRegistry } from '../core/AssetRegistry';
import { events } from '../core/EventBus';
import { prop } from '../core/tiled';
import { session } from '../core/session';
import { db, dialogues } from '../content';
import { Player, type Facing } from '../entities/Player';
import { Thing } from '../entities/Thing';
import { Candle } from '../entities/Candle';
import { InputManager } from '../input/InputManager';
import { DialogueRunner } from '../systems/DialogueRunner';
import { ChallengeRunner } from '../systems/ChallengeRunner';
import { apply, check, currentObjective, cycleSpell, spellAffects, tickQuests, type Notice } from '../systems/rules';
import type { DialogueDef } from '../types/content';
import { DialogueBox } from '../ui/DialogueBox';
import { Hud } from '../ui/Hud';
import { CauldronScene } from './CauldronScene';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';

export interface WorldData {
  map: string;
  spawn?: string;
}

const FADE_MS = 220;
const TALK_RANGE = 20;
const SPELL_RANGE = 28;
const START_CHALLENGE_FLAG = 'desafio:iniciar';

export class WorldScene extends Phaser.Scene {
  private mapKey = '';
  private player!: Player;
  private controls!: InputManager;
  private things: Thing[] = [];
  private candles: Candle[] = [];
  private near?: Thing;
  private talkingTo?: Thing;
  private dialogue?: DialogueRunner;
  private dialogueBox!: DialogueBox;
  private hud!: Hud;
  private challenge?: ChallengeRunner;
  private transitioning = false;

  constructor() {
    super('World');
  }

  create(data: WorldData): void {
    this.mapKey = data.map;
    this.transitioning = false;
    this.things = [];
    this.candles = [];
    this.near = undefined;
    this.dialogue = undefined;
    this.talkingTo = undefined;
    this.challenge = undefined;

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
    this.buildObjects(objects);

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
    const touch = InputManager.isTouchDevice(this);
    this.controls = new InputManager(this);
    this.dialogueBox = new DialogueBox(this);
    this.dialogueBox.onChoice = (i) => this.choose(i);
    this.hud = new Hud(this, touch);
    this.hud.onSpellTap = () => this.changeSpell();
    this.hud.onMenuTap = () => this.openGrimoire();
    this.refreshHud();
    this.showRoomName(prop(map.properties, 'nome') ?? '');
    this.cameras.main.fadeIn(FADE_MS, 24, 20, 42);

    // ao voltar do caldeirão: missões que dependem da poção podem avançar
    this.events.on(Phaser.Scenes.Events.RESUME, (_s: unknown, from?: { from?: string }) => {
      if (from?.from === 'cauldron') for (const t of CauldronScene.lastNotices) this.hud.notify(t);
      this.afterStateChange();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME));

    // salvamento automático a cada sala
    session.state.map = data.map;
    session.state.spawn = data.spawn ?? spawn.name ?? '';
    session.save();
    events.emit('map:entered', { map: data.map });
  }

  private buildObjects(objects: Phaser.Types.Tilemaps.TiledObject[]): void {
    const s = session.state;
    for (const o of objects) {
      const sprite = prop(o.properties, 'sprite');
      switch (o.type) {
        case 'prop': {
          if (!sprite) break;
          const p = this.add.sprite(o.x!, o.y!, sprite).setOrigin(0.5, 1).setDepth(o.y!);
          if (assets().hasAnimation(sprite, 'idle')) p.play({ key: AssetRegistry.animKey(sprite, 'idle'), startFrame: Phaser.Math.Between(0, 2) });
          break;
        }
        case 'target': {
          const saved = s.flags[this.candleFlag(o.name)];
          const lit = saved === undefined ? prop<boolean>(o.properties, 'lit') ?? true : Boolean(saved);
          this.candles.push(new Candle(this, o.x!, o.y!, sprite!, o.name, prop(o.properties, 'target')!, lit));
          break;
        }
        case 'npc': {
          const t = new Thing(this, o.x!, o.y!, {
            kind: 'npc', name: o.name, sheet: sprite!, ref: prop(o.properties, 'dialogue')!,
            onWall: prop<boolean>(o.properties, 'wall') ?? false, solid: !prop<boolean>(o.properties, 'wall'),
          });
          if (t.body) this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
        case 'pickup': {
          if (s.flags[this.pickupFlag(o.name)]) break;
          const item = prop(o.properties, 'item')!;
          this.things.push(new Thing(this, o.x!, o.y!, { kind: 'pickup', name: o.name, sheet: 'ui.icones', frame: assets().frameOf('ui.icones', item), ref: item }));
          break;
        }
        case 'station': {
          const t = new Thing(this, o.x!, o.y!, { kind: 'station', name: o.name, sheet: sprite!, ref: prop(o.properties, 'station')!, solid: true });
          this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
        case 'challenge': {
          const t = new Thing(this, o.x!, o.y!, { kind: 'challenge', name: o.name, sheet: sprite!, ref: prop(o.properties, 'challenge')!, solid: true });
          this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
      }
    }
  }

  private candleFlag(name: string): string {
    return `vela:${this.mapKey}:${name}`;
  }

  private pickupFlag(name: string): string {
    return `pego:${this.mapKey}:${name}`;
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
    if (this.challenge?.status === 'running') this.hud.notify('Desafio cancelado.');
    this.transitioning = true;
    this.player.halt();
    this.cameras.main.fadeOut(FADE_MS, 24, 20, 42);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(target));
  }

  // ---------- estado e HUD

  private refreshHud(): void {
    const s = session.state;
    this.hud.setObjective(currentObjective(s, db));
    this.hud.setSpell(s.selectedSpell ? { id: s.selectedSpell, name: db.spells[s.selectedSpell].name } : undefined);
  }

  private showNotices(notices: Notice[]): void {
    for (const n of notices) this.hud.notify(n.text);
  }

  /** Depois de qualquer mudança: avança missões automáticas, atualiza a tela e salva. */
  private afterStateChange(): void {
    this.showNotices(tickQuests(session.state, db));
    this.refreshHud();
    session.save();
  }

  private changeSpell(): void {
    if (this.dialogue || !session.state.spells.length) return;
    cycleSpell(session.state);
    this.refreshHud();
  }

  private openGrimoire(): void {
    if (this.dialogue || this.transitioning) return;
    this.player.halt();
    this.scene.launch('Grimoire');
    this.scene.pause();
  }

  // ---------- interação

  private findNear(): Thing | undefined {
    const front = this.player.frontPoint(10);
    let best: Thing | undefined;
    let bestDist = TALK_RANGE;
    for (const t of this.things) {
      // a parede não deixa o jogador chegar perto da frente de um quadro; mede pelos pés
      const from = t.onWall ? this.player : front;
      const d = Phaser.Math.Distance.BetweenPoints(from, t.talkPoint);
      if (d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    return best;
  }

  private interact(t: Thing): void {
    switch (t.kind) {
      case 'npc':
        return this.startDialogue(dialogues[t.ref], t);
      case 'pickup':
        session.state.flags[this.pickupFlag(t.thingName)] = true;
        this.showNotices(apply({ giveItem: t.ref }, session.state, db));
        this.things = this.things.filter((x) => x !== t);
        this.near = undefined;
        t.remove();
        return this.afterStateChange();
      case 'station':
        this.player.halt();
        t.setHighlighted(false);
        this.scene.launch('Cauldron');
        this.scene.pause();
        return;
      case 'challenge':
        return this.offerChallenge(t);
    }
  }

  private offerChallenge(board: Thing): void {
    const c = db.challenges[board.ref];
    const done = session.state.challenges[board.ref];
    if (!check(c.requires, session.state)) {
      return this.startDialogue({ id: 'desafio', speaker: c.title, entries: [{ start: 'a' }], nodes: { a: { text: c.lockedText } } }, board);
    }
    const best = done?.bestMs ? ` Seu recorde: ${(done.bestMs / 1000).toFixed(1)}s.` : '';
    const def: DialogueDef = {
      id: 'desafio', speaker: c.title, entries: [{ start: 'a' }],
      nodes: {
        a: {
          text: `${c.description}${done ? ' (Já vencido! Pode tentar bater o recorde.)' : ''}${best}`,
          choices: [
            { text: 'Começar!', next: null, effects: [{ setFlag: START_CHALLENGE_FLAG, value: board.ref }] },
            { text: 'Agora não', next: null },
          ],
        },
      },
    };
    this.startDialogue(def, board);
  }

  private startChallenge(id: string): void {
    const def = db.challenges[id];
    this.challenge = new ChallengeRunner(id, def);
    for (const c of this.candles) if (def.targets.includes(c.targetName)) c.setLit(false);
    this.cameras.main.flash(250, 20, 10, 40);
    this.hud.notify('Valendo!');
  }

  private updateChallenge(delta: number): void {
    const ch = this.challenge;
    if (!ch) return;
    ch.update(delta);
    const { done, total } = ch.progress;
    if (ch.status === 'running') {
      this.hud.setTimer(`⏳ ${Math.ceil(ch.remainingMs / 1000)}s   ${done}/${total}`);
      return;
    }
    this.hud.setTimer(undefined);
    if (ch.status === 'won') {
      this.hud.notify('Desafio vencido!');
      this.showNotices(ch.notices);
      this.burstFireworks(this.player.x, this.player.y - 30);
    } else {
      this.hud.notify('O tempo acabou! Tente de novo no quadro.');
      const def = db.challenges[ch.id];
      for (const c of this.candles) if (def.targets.includes(c.targetName)) c.setLit(true);
    }
    this.challenge = undefined;
    this.afterStateChange();
  }

  // ---------- feitiços

  private castSpell(): void {
    const s = session.state;
    const spellId = s.selectedSpell;
    const at = this.player.frontPoint(12);
    const fxKey = spellId ? db.spells[spellId].fx : 'fx.fagulha';
    if (fxKey === 'fx.fogos') this.burstFireworks(at.x, at.y - 6);
    else {
      const fx = this.add.sprite(at.x, at.y, fxKey).setDepth(this.player.depth + 1);
      fx.play(AssetRegistry.animKey(fxKey, 'burst'));
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    }
    if (!spellId) return;

    const target = this.candles
      .filter((c) => spellAffects(db, spellId, c.targetKind))
      .map((c) => ({ c, d: Phaser.Math.Distance.Between(at.x, at.y, c.x, c.y - 8) }))
      .filter(({ d }) => d < SPELL_RANGE)
      .sort((a, b) => a.d - b.d)[0]?.c;
    if (!target || target.lit) return;

    target.setLit(true);
    if (this.challenge?.isTarget(target.targetName)) this.challenge.hitTarget(target.targetName, s, db);
    else s.flags[this.candleFlag(target.targetName)] = true;
    this.afterStateChange();
  }

  private burstFireworks(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 140, () => {
        const fx = this.add.sprite(x + Phaser.Math.Between(-14, 14), y + Phaser.Math.Between(-10, 6), 'fx.fogos').setDepth(1300);
        fx.play(AssetRegistry.animKey('fx.fogos', 'burst'));
        fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
      });
    }
  }

  // ---------- diálogo

  private startDialogue(def: DialogueDef | undefined, who: Thing): void {
    if (!def) throw new Error(`diálogo não encontrado: ${who.ref}`);
    this.player.halt();
    who.setHighlighted(false);
    this.talkingTo = who;
    this.dialogue = new DialogueRunner(def, session.state, db);
    this.showCurrentLine();
  }

  private showCurrentLine(): void {
    this.showNotices(this.dialogue?.notices.splice(0) ?? []);
    this.refreshHud();
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
    const start = session.state.flags[START_CHALLENGE_FLAG];
    if (typeof start === 'string') {
      delete session.state.flags[START_CHALLENGE_FLAG];
      this.startChallenge(start);
    }
    this.afterStateChange();
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

    this.updateChallenge(delta);
    if (this.controls.menuPressed()) return this.openGrimoire();
    if (this.controls.spellCyclePressed()) this.changeSpell();

    this.player.move(this.controls.direction());
    const near = this.findNear();
    if (near !== this.near) {
      this.near?.setHighlighted(false);
      near?.setHighlighted(true);
      this.near = near;
    }
    if (this.controls.actionPressed()) {
      if (near) this.interact(near);
      else this.castSpell();
    }
  }
}

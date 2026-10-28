import Phaser from 'phaser';
import { assets } from '../core/registry';
import { AssetRegistry } from '../core/AssetRegistry';
import { events } from '../core/EventBus';
import { prop } from '../core/tiled';
import { session } from '../core/session';
import { db, dialogues } from '../content';
import { DEFAULT_SHEET, Player, type Facing } from '../entities/Player';
import { Thing } from '../entities/Thing';
import { Candle } from '../entities/Candle';
import { Creature } from '../entities/Creature';
import { InputManager } from '../input/InputManager';
import { DialogueRunner } from '../systems/DialogueRunner';
import { ChallengeRunner } from '../systems/ChallengeRunner';
import {
  apply, check, currentObjective, cycleSpell, seenTutorial, spellAffects, takeFromPantry, tickQuests, type Notice,
} from '../systems/rules';
import { clampVitals, hurt, restoreEnergy, spendEnergy, stats } from '../systems/progression';
import type { Condition, DialogueDef } from '../types/content';
import { DialogueBox } from '../ui/DialogueBox';
import { Hud } from '../ui/Hud';
import { Puzzles, type SocketSpot } from '../world/Puzzles';
import { CauldronScene } from './CauldronScene';
import { GrimoireScene } from './GrimoireScene';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../config/game';

export interface WorldData {
  map: string;
  spawn?: string;
  /** Voltou de um desmaio: mostra o aviso ao entrar. */
  fainted?: boolean;
}

interface Trigger {
  zone: Phaser.Geom.Rectangle;
  when?: Condition;
  dialogue: string;
  actor?: string;
  ax: number;
  ay: number;
  fx?: string;
  fired: boolean;
}

const FADE_MS = 220;
const TALK_RANGE = 20;
const SPELL_RANGE = 28;
const START_CHALLENGE_FLAG = 'desafio:iniciar';
const INVULNERABLE_MS = 1100;
const WIND_MS = 5000;

/** Lê uma condição guardada como texto JSON numa propriedade do Tiled. */
function cond(o: Phaser.Types.Tilemaps.TiledObject): Condition | undefined {
  const raw = prop<string>(o.properties, 'when');
  return raw ? (JSON.parse(raw) as Condition) : undefined;
}

export class WorldScene extends Phaser.Scene {
  private mapKey = '';
  private entry: WorldData = { map: '' };
  private player!: Player;
  private walls!: Phaser.Tilemaps.TilemapLayer;
  private controls!: InputManager;
  private things: Thing[] = [];
  private candles: Candle[] = [];
  private creatures: Creature[] = [];
  private triggers: Trigger[] = [];
  private puzzles!: Puzzles;
  private near?: Thing;
  private talkingTo?: Thing;
  private actor?: Phaser.GameObjects.Sprite;
  private dialogue?: DialogueRunner;
  private dialogueBox!: DialogueBox;
  private hud!: Hud;
  private challenge?: ChallengeRunner;
  private transitioning = false;
  private tutorialQueue: string[] = [];
  private actQueue: string[] = [];
  private regenMs = 0;
  private invulnerableUntil = 0;
  private knockUntil = 0;
  private windUntil = 0;

  constructor() {
    super('World');
  }

  create(data: WorldData): void {
    this.mapKey = data.map;
    this.entry = data;
    this.transitioning = false;
    this.things = [];
    this.candles = [];
    this.creatures = [];
    this.triggers = [];
    this.near = undefined;
    this.dialogue = undefined;
    this.talkingTo = undefined;
    this.actor = undefined;
    this.challenge = undefined;
    this.tutorialQueue = [];
    this.actQueue = [];
    this.invulnerableUntil = 0;
    this.knockUntil = 0;
    this.windUntil = 0;

    const s = session.state;
    const mapDef = assets().map(data.map);
    const map = this.make.tilemap({ key: data.map });
    const tilesets = mapDef.tilesets.map((key) => map.addTilesetImage(assets().tileset(key).tiledName, key)!);

    map.createLayer('chao', tilesets)!;
    this.walls = map.createLayer('paredes', tilesets)!;
    this.walls.setCollisionByProperty({ collides: true });

    const objects = map.getObjectLayer('objetos')?.objects ?? [];
    const spawns = objects.filter((o) => o.type === 'spawn');
    const spawn = spawns.find((o) => o.name === data.spawn) ?? spawns[0] ?? { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
    const capa = s.equipment.capa ? db.items[s.equipment.capa]?.sheet : undefined;
    this.player = new Player(this, spawn.x!, spawn.y!, prop<Facing>(spawn.properties, 'facing') ?? 'down', capa ?? DEFAULT_SHEET);
    this.physics.add.collider(this.player, this.walls);
    this.puzzles = new Puzzles(this, this.player, this.walls, {
      platesSolved: (g) => this.onPlatesSolved(g),
      socketFilled: (sk) => this.onLevitatedIntoSocket(sk),
      firstPush: () => this.queueTutorial('empurrar'),
      occupied: (tx, ty) => this.things.some((t) => t.isPresent && t.body
        && Math.floor(t.x / TILE_SIZE) === tx && Math.floor((t.y - 1) / TILE_SIZE) === ty),
    });
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
    clampVitals(s, db);
    this.applyOutfit();
    this.refreshHud();
    this.refreshPresence(false);
    this.showRoomName(prop(map.properties, 'nome') ?? '');
    this.cameras.main.fadeIn(FADE_MS, 24, 20, 42);

    // ao voltar do caldeirão, do grimório, de um tutorial ou do fim de ato
    this.events.on(Phaser.Scenes.Events.RESUME, (_s: unknown, from?: { from?: string }) => {
      if (from?.from === 'cauldron') for (const t of CauldronScene.lastNotices) this.hud.notify(t);
      if (from?.from === 'grimoire') for (const t of GrimoireScene.lastNotices) this.hud.notify(t);
      this.afterStateChange();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME));

    if (data.fainted) this.hud.notify('Você desmaiou... e acordou aqui. Vida e energia de volta!');
    if (!seenTutorial(s, 'controles')) this.queueTutorial('controles');

    // salvamento automático a cada sala
    s.map = data.map;
    s.spawn = data.spawn ?? spawn.name ?? '';
    session.save();
    events.emit('map:entered', { map: data.map });
  }

  private buildObjects(objects: Phaser.Types.Tilemaps.TiledObject[]): void {
    const s = session.state;
    for (const o of objects) {
      if (this.puzzles.build(o)) continue;
      const sprite = prop<string>(o.properties, 'sprite');
      const when = cond(o);
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
            kind: 'npc', name: o.name, sheet: sprite!, ref: prop(o.properties, 'dialogue')!, when,
            onWall: prop<boolean>(o.properties, 'wall') ?? false, solid: !prop<boolean>(o.properties, 'wall'),
          });
          if (t.body) this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
        case 'pickup': {
          if (s.flags[this.pickupFlag(o.name)]) break;
          const item = prop(o.properties, 'item')!;
          this.things.push(new Thing(this, o.x!, o.y!, { kind: 'pickup', name: o.name, sheet: 'ui.icones', frame: assets().frameOf('ui.icones', item), ref: item, when }));
          break;
        }
        case 'station': {
          const t = new Thing(this, o.x!, o.y!, {
            kind: 'station', name: o.name, sheet: sprite!, ref: prop(o.properties, 'station')!, solid: true, extra: prop(o.properties, 'gives'),
          });
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
        case 'socket': {
          // pedestal: recebe um item da bolsa
          const spot = this.puzzles.addItemSocket(o);
          const t = new Thing(this, o.x!, o.y!, { kind: 'socket', name: o.name, sheet: sprite!, frame: prop<number>(o.properties, 'frame'), ref: o.name, solid: true });
          this.physics.add.collider(this.player, t);
          this.things.push(t);
          if (s.flags[this.socketFlag(spot.name)]) this.puzzles.showFilled(spot);
          break;
        }
        case 'creature': {
          const group = prop<string>(o.properties, 'group') ?? '';
          if (s.flags[this.creatureFlag(group)]) break;
          const c = new Creature(this, o.x!, o.y!, sprite!, o.name, group, prop<number>(o.properties, 'hp') ?? 2, when);
          this.physics.add.collider(c, this.walls);
          for (const g of this.puzzles.gates) this.physics.add.collider(c, g.sprite);
          this.physics.add.overlap(this.player, c, () => this.touchCreature(c));
          this.creatures.push(c);
          break;
        }
        case 'trigger': {
          this.triggers.push({
            zone: new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!), when,
            dialogue: prop(o.properties, 'dialogue')!, actor: prop(o.properties, 'actor'),
            ax: prop<number>(o.properties, 'ax') ?? o.x!, ay: prop<number>(o.properties, 'ay') ?? o.y!,
            fx: prop(o.properties, 'fx'), fired: false,
          });
          break;
        }
      }
    }
    for (const g of new Set(this.puzzles.plates.map((p) => p.group))) {
      if (s.flags[this.plateFlag(g)]) this.puzzles.restoreSolved(g);
    }
  }

  private candleFlag(name: string): string {
    return `vela:${this.mapKey}:${name}`;
  }

  private pickupFlag(name: string): string {
    return `pego:${this.mapKey}:${name}`;
  }

  private socketFlag(name: string): string {
    return `encaixe:${this.mapKey}:${name}`;
  }

  private plateFlag(group: string): string {
    return `placas:${this.mapKey}:${group}`;
  }

  private creatureFlag(group: string): string {
    return `criaturas:${this.mapKey}:${group}`;
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
    const st = stats(s, db);
    this.hud.setObjective(currentObjective(s, db));
    this.hud.setSpell(s.selectedSpell ? { id: s.selectedSpell, name: db.spells[s.selectedSpell].name } : undefined);
    this.hud.setVitals({ vida: s.vida, vidaMax: st.vidaMax, energia: s.energia, energiaMax: st.energiaMax, level: s.level });
  }

  /** Avisos de texto vão para a tela; tutoriais e fim de ato entram na fila. */
  private showNotices(notices: Notice[]): void {
    for (const n of notices) {
      if (n.kind === 'tutorial' && n.ref) this.queueTutorial(n.ref);
      else if (n.kind === 'act-end' && n.ref) this.actQueue.push(n.ref);
      else if (n.text) this.hud.notify(n.text);
    }
  }

  private queueTutorial(id: string): void {
    if (seenTutorial(session.state, id) || this.tutorialQueue.includes(id)) return;
    this.tutorialQueue.push(id);
  }

  /** Abre o próximo tutorial ou tela de fim de ato, quando nada mais está acontecendo. */
  private flushOverlays(): boolean {
    if (this.dialogue || this.transitioning) return false;
    const id = this.tutorialQueue.shift();
    if (id) {
      if (seenTutorial(session.state, id)) return this.flushOverlays();
      this.player.halt();
      this.scene.launch('Tutorial', { id });
      this.scene.pause();
      return true;
    }
    const act = this.actQueue.shift();
    if (act) {
      this.player.halt();
      this.scene.launch('ActCard', { act });
      this.scene.pause();
      return true;
    }
    return false;
  }

  private applyOutfit(): void {
    const s = session.state;
    const capa = s.equipment.capa ? db.items[s.equipment.capa] : undefined;
    this.player.setSheet(capa?.sheet ?? DEFAULT_SHEET);
    this.player.speedMul = stats(s, db).velocidade * (this.windUntil ? 1.6 : 1);
  }

  /** Depois de qualquer mudança: avança missões automáticas, mostra/esconde o que depende de condição, salva. */
  private afterStateChange(): void {
    this.showNotices(tickQuests(session.state, db));
    clampVitals(session.state, db);
    this.applyOutfit();
    this.refreshPresence(true);
    this.refreshHud();
    session.save();
  }

  /** NPCs, itens e criaturas com condição ("when") aparecem ou somem conforme a história anda. */
  private refreshPresence(animate: boolean): void {
    const s = session.state;
    for (const t of this.things) {
      if (!t.when) continue;
      const on = check(t.when, s);
      if (on === t.isPresent) continue;
      t.setPresent(on);
      if (animate) this.puff(t.x, t.y - 10);
      if (!on && this.near === t) this.near = undefined;
    }
    for (const c of this.creatures) {
      if (!c.active) continue;
      const on = check(c.when, s);
      if (on === c.isPresent) continue;
      c.setPresent(on);
      if (on && animate) this.puff(c.x, c.y - 6);
    }
  }

  private puff(x: number, y: number): void {
    const fx = this.add.sprite(x, y, 'fx.fumaca').setDepth(1200).setScale(1.5);
    fx.play(AssetRegistry.animKey('fx.fumaca', 'burst'));
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
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
      if (!t.isPresent) continue;
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
        return this.useStation(t);
      case 'challenge':
        return this.offerChallenge(t);
      case 'socket':
        return this.useSocket(t);
    }
  }

  private useStation(t: Thing): void {
    if (t.ref === 'despensa') {
      const got = takeFromPantry(session.state, db, (t.extra ?? '').split(',').filter(Boolean));
      if (!got.length) this.hud.notify('Você já tem um de cada ingrediente da despensa.');
      this.showNotices(got);
      return this.afterStateChange();
    }
    this.player.halt();
    t.setHighlighted(false);
    if (!seenTutorial(session.state, 'caldeirao')) this.scene.launch('Tutorial', { id: 'caldeirao', then: 'Cauldron' });
    else this.scene.launch('Cauldron');
    this.scene.pause();
  }

  /** Pedestal: coloca a pedra certa, se ela estiver na bolsa. */
  private useSocket(t: Thing): void {
    const s = session.state;
    const spot = this.puzzles.sockets.find((x) => x.name === t.ref)!;
    const item = db.items[spot.accepts];
    if (spot.filled) return this.hud.notify(`A ${item.name} já está no lugar.`);
    if (!s.inventory[spot.accepts]) {
      this.hud.notify(`Este pedestal espera a ${item.name}.`);
      this.queueTutorial('pedestais');
      return;
    }
    apply({ takeItem: spot.accepts }, s, db);
    s.flags[this.socketFlag(spot.name)] = true;
    this.puzzles.showFilled(spot);
    this.cameras.main.flash(200, 250, 214, 92);
    this.hud.notify(`${item.name} encaixada!`);
    this.afterStateChange();
    if (this.puzzles.groupFilled(spot.group) && spot.dialogue) {
      this.time.delayedCall(500, () => this.startDialogue(dialogues[spot.dialogue!]));
    }
  }

  private onPlatesSolved(group: string): void {
    const flag = this.plateFlag(group);
    if (session.state.flags[flag]) return;
    session.state.flags[flag] = true;
    this.puzzles.openGates(group);
    this.hud.notify('Click! A grade se abriu.');
    this.afterStateChange();
  }

  private onLevitatedIntoSocket(sk: SocketSpot): void {
    if (this.challenge?.isTarget(sk.name)) this.challenge.hitTarget(sk.name, session.state, db);
    this.cameras.main.flash(120, 250, 214, 92);
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
    if (def.kind === 'acender') for (const c of this.candles) if (def.targets.includes(c.targetName)) c.setLit(false);
    if (def.kind === 'levitar') this.puzzles.resetKind('calice');
    this.cameras.main.flash(250, 20, 10, 40);
    this.hud.notify('Valendo!');
    if (def.tutorial) this.queueTutorial(def.tutorial);
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
    const def = db.challenges[ch.id];
    if (ch.status === 'won') {
      this.hud.notify('Desafio vencido!');
      this.showNotices(ch.notices);
      this.burstFireworks(this.player.x, this.player.y - 30);
    } else {
      this.hud.notify('O tempo acabou! Tente de novo no quadro.');
      if (def.kind === 'acender') for (const c of this.candles) if (def.targets.includes(c.targetName)) c.setLit(true);
    }
    if (def.kind === 'levitar') this.time.delayedCall(1200, () => this.puzzles.resetKind('calice'));
    this.challenge = undefined;
    this.afterStateChange();
  }

  // ---------- feitiços

  private castSpell(): void {
    const s = session.state;
    const spellId = s.selectedSpell;
    const at = this.player.frontPoint(12);
    // soltar um objeto levitado não gasta energia
    if (spellId === 'levitar' && this.puzzles.carried) {
      const r = this.puzzles.drop(this.player.frontPoint(14));
      if (r === false) this.hud.notify('Não cabe aí.');
      return;
    }
    const spell = spellId ? db.spells[spellId] : undefined;
    if (spell && !spendEnergy(s, spell.cost)) {
      this.hud.notify('Sem energia mágica! Espere um pouco.');
      this.cameras.main.shake(80, 0.002);
      return;
    }
    const fxKey = spell?.fx ?? 'fx.fagulha';
    if (fxKey === 'fx.fogos') this.burstFireworks(at.x, at.y - 6);
    else {
      const fx = this.add.sprite(at.x, at.y, fxKey).setDepth(this.player.depth + 1);
      fx.play(AssetRegistry.animKey(fxKey, 'burst'));
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    }
    this.refreshHud();
    if (!spellId || !spell) return;

    if (spell.self === 'velocidade') {
      this.windUntil = this.time.now + WIND_MS;
      this.applyOutfit();
      this.hud.notify('Passo de Vento!');
      return;
    }
    if (spell.target === 'levitavel') {
      const l = this.puzzles.levitableNear(at, SPELL_RANGE);
      if (!l) {
        restoreEnergy(s, db, spell.cost); // não gasta se não havia nada para levitar
        this.refreshHud();
        return;
      }
      this.puzzles.lift(l);
      return;
    }

    // luz espanta sombrinhas
    if (spellId === 'lumen' || spellId === 'fogos-bruxos') {
      const now = this.time.now;
      const hit = this.creatures.filter((c) => c.isPresent && Phaser.Math.Distance.Between(at.x, at.y, c.x, c.y - 6) < SPELL_RANGE + 6);
      for (const c of hit) {
        if (c.takeHit(stats(s, db).poder, this.player, now)) this.banishCreature(c);
      }
      if (hit.length) return this.afterStateChange();
    }

    const target = this.candles
      .filter((c) => spellAffects(db, spellId, c.targetKind))
      .map((c) => ({ c, d: Phaser.Math.Distance.Between(at.x, at.y, c.x, c.y - 8) }))
      .filter(({ d }) => d < SPELL_RANGE)
      .sort((a, b) => a.d - b.d)[0]?.c;
    if (!target || target.lit) return this.afterStateChange();

    target.setLit(true);
    if (this.challenge?.isTarget(target.targetName)) this.challenge.hitTarget(target.targetName, s, db);
    else s.flags[this.candleFlag(target.targetName)] = true;
    this.afterStateChange();
  }

  private banishCreature(c: Creature): void {
    this.puff(c.x, c.y - 6);
    c.destroy();
    this.creatures = this.creatures.filter((x) => x !== c);
    this.showNotices(apply({ giveXp: db.progression.creatureXp }, session.state, db).filter((n) => n.kind !== 'xp'));
    this.hud.notify(`Sombrinha espantada! +${db.progression.creatureXp} exp`);
    const left = this.creatures.filter((x) => x.group === c.group);
    if (!left.length && c.group) {
      session.state.flags[this.creatureFlag(c.group)] = true;
      this.hud.notify('A sala ficou clara de novo.');
    }
  }

  private touchCreature(c: Creature): void {
    const now = this.time.now;
    if (!c.isPresent || now < this.invulnerableUntil || this.dialogue || this.transitioning) return;
    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.knockUntil = now + 160;
    const away = new Phaser.Math.Vector2(this.player.x - c.x, this.player.y - c.y).setLength(150);
    this.player.setVelocity(away.x, away.y);
    c.recoil(this.player, now);
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 90, yoyo: true, repeat: 5, onComplete: () => this.player.setAlpha(1) });
    const fainted = hurt(session.state, 1);
    this.refreshHud();
    if (fainted) this.faint();
  }

  private faint(): void {
    const s = session.state;
    this.transitioning = true;
    this.player.halt();
    const st = stats(s, db);
    s.vida = st.vidaMax;
    s.energia = st.energiaMax;
    session.save();
    this.cameras.main.fadeOut(600, 10, 6, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.restart({ map: this.mapKey, spawn: this.entry.spawn, fainted: true }),
    );
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

  // ---------- cenas (gatilhos no mapa)

  private checkTriggers(): void {
    for (const t of this.triggers) {
      if (t.fired || !t.zone.contains(this.player.x, this.player.y - 4) || !check(t.when, session.state)) continue;
      t.fired = true;
      this.player.halt();
      if (t.fx === 'apagar') {
        for (const c of this.candles) {
          c.setLit(false);
          session.state.flags[this.candleFlag(c.targetName)] = false;
        }
        this.cameras.main.flash(300, 10, 6, 20);
      }
      if (t.actor) {
        this.puff(t.ax, t.ay - 10);
        this.actor = this.add.sprite(t.ax, t.ay, t.actor, 0).setOrigin(0.5, 1).setDepth(t.ay);
        if (assets().hasAnimation(t.actor, 'talk')) this.actor.play(AssetRegistry.animKey(t.actor, 'talk'));
      }
      this.startDialogue(dialogues[t.dialogue]);
      return;
    }
  }

  // ---------- diálogo

  private startDialogue(def: DialogueDef | undefined, who?: Thing): void {
    if (!def) throw new Error(`diálogo não encontrado: ${who?.ref}`);
    this.player.halt();
    who?.setHighlighted(false);
    this.talkingTo = who;
    this.dialogue = new DialogueRunner(def, session.state, db);
    this.showCurrentLine();
  }

  private showCurrentLine(): void {
    this.showNotices(this.dialogue?.notices.splice(0) ?? []);
    this.refreshHud();
    this.refreshPresence(true);
    this.applyOutfit();
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
    if (this.actor) {
      const a = this.actor;
      this.actor = undefined;
      this.puff(a.x, a.y - 10);
      this.tweens.add({ targets: a, alpha: 0, duration: 200, onComplete: () => a.destroy() });
    }
    const start = session.state.flags[START_CHALLENGE_FLAG];
    if (typeof start === 'string') {
      delete session.state.flags[START_CHALLENGE_FLAG];
      this.startChallenge(start);
    }
    this.afterStateChange();
  }

  update(time: number, delta: number): void {
    const s = session.state;
    s.playTimeMs += delta;
    if (this.transitioning) return;

    if (this.dialogue) {
      this.dialogueBox.update(delta);
      if (!this.dialogueBox.typing) this.talkingTo?.setTalking(false);
      const nav = this.controls.navPressed();
      if (nav) this.dialogueBox.moveSelection(nav);
      if (this.controls.actionPressed()) this.advanceDialogue();
      return;
    }
    if (this.flushOverlays()) return;

    // energia mágica volta sozinha
    const st = stats(s, db);
    if (s.energia < st.energiaMax) {
      this.regenMs += delta;
      if (this.regenMs >= st.regenMs) {
        this.regenMs = 0;
        restoreEnergy(s, db, 1);
        this.refreshHud();
      }
    } else this.regenMs = 0;
    if (this.windUntil && time >= this.windUntil) {
      this.windUntil = 0;
      this.applyOutfit();
    }

    this.updateChallenge(delta);
    if (this.controls.menuPressed()) return this.openGrimoire();
    if (this.controls.spellCyclePressed()) this.changeSpell();

    const dir = this.controls.direction();
    if (time >= this.knockUntil) this.player.move(dir);
    else this.player.setDepth(this.player.y);
    this.puzzles.update(dir, delta);
    for (const c of this.creatures) c.think(this.player, time, delta);
    this.checkTriggers();
    if (this.dialogue) return;

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

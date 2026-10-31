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
import { Sentinel } from '../entities/Sentinel';
import { Boss, type BossPhase } from '../entities/Boss';
import { InputManager } from '../input/InputManager';
import { DialogueRunner } from '../systems/DialogueRunner';
import { ChallengeRunner } from '../systems/ChallengeRunner';
import {
  apply, check, currentObjective, cycleSpell, guideTarget, seenTutorial, spellAffects, takeFromPantry, tickQuests, type Notice,
} from '../systems/rules';
import { clampVitals, hurt, restoreEnergy, spendEnergy, stats } from '../systems/progression';
import type { Condition, DialogueDef } from '../types/content';
import { DialogueBox } from '../ui/DialogueBox';
import { Hud } from '../ui/Hud';
import { Puzzles, type SocketSpot } from '../world/Puzzles';
import { Beam } from '../world/Beam';
import { Darkness, type Light } from '../world/Darkness';
import { CauldronScene } from './CauldronScene';
import { GrimoireScene } from './GrimoireScene';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_ZOOM, TILE_SIZE, WORLD_SCALE } from '../config/game';
import { shake, flash } from '../ui/fx';
import { audio, CASTELO_LISTA, type Sfx, type Track } from '../audio/Audio';
import { Bark, pickLine } from '../ui/Bark';
import { openChest, type LootTable } from '../systems/loot';
import baus from '../../content/baus.json';
import mapaLayout from '../ui/mapa-layout.json';
import { setFalaProvider } from '../core/aparencia';
import { nextGuidePoint, type MapObject } from '../systems/guia';
import { GuideTrail } from '../world/GuideTrail';
import { emitNotices } from '../systems/progress';
import { dropShadow, torchHalo, windowLight } from '../world/Lighting';

export interface WorldData {
  map: string;
  spawn?: string;
  /** Voltou de um desmaio: mostra o aviso ao entrar. */
  fainted?: boolean;
  /** Foi visto por uma sentinela e voltou ao último ponto seguro. */
  caught?: boolean;
}

interface DialMeta {
  group: string;
  house: number;
  answer: number;
  start: number;
  activeWhen?: Condition;
  inactiveText: string;
}

interface LockMeta {
  when?: Condition;
  lockedText: string;
}

interface Painting {
  sprite: Phaser.GameObjects.Sprite;
  index: number;
  doneFlag: string;
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

/** Transição entre salas: escurece e clareia (ms). */
const FADE_MS = 320;
/** Modo Kids: dica depois de um tempo sem avançar, ampulhetas mais longas, olhos e Bellatrix mais lentos. */
const KIDS_HINT_MS = 30000;
const KIDS_TIME = 1.5;
const KIDS_SENTINEL = 0.6;
const KIDS_BOSS = 1.6;
const TALK_RANGE = 20;
const SPELL_RANGE = 28;
const START_CHALLENGE_FLAG = 'desafio:iniciar';
const INVULNERABLE_MS = 1100;
const WIND_MS = 5000;
const SHIELD_MS = 3200;
const REVEAL_RADIUS = 96;
const REVEAL_MS = 3800;
const ORB_SPEED = 78;
const BOSS_FLAG = 'boss:fase';
/** Chance de aparecerem sombrinhas fujonas ao entrar numa sala (depois do Ato 1). */
const RUNAWAY_CHANCE = 0.2;

/** Enfeites que acendem (ganham halo de luz) e os que ficam rentes ao chão ou na parede (sem sombra). */
const LIGHT_PROPS = new Set(['prop.vela', 'prop.fonte-luz', 'prop.tocha', 'prop.candelabro']);
const FLAT_PROPS = ['prop.quadrinho', 'prop.toalha', 'prop.banco', 'prop.tapete', 'prop.janela', 'prop.escadaria', 'prop.selo', 'prop.alcapao', 'prop.escada-porao'];

/** Cor de cada casa (brilho do Chapéu das Virtudes). */
const HOUSE_COLORS: Record<string, number> = { coragem: 0xe04848, astucia: 0x48b070, lealdade: 0xf0c040, inteligencia: 0x4c80e0 };

/** Índice (gid) do tile de janela no tileset do castelo. */
const WINDOW_TILE = 7;

const ACT2_MAPS = ['map.biblioteca', 'map.sala-espectral', 'map.estufa', 'map.observatorio'];

/** Música de cada sala: Ato 1 animado, biblioteca calma, quadros tensos, duelo na torre. */
function spellSound(id: string | null | undefined): Sfx {
  switch (id) {
    case 'lumen': case 'levitar': case 'revelar': case 'escudo': case 'abrir': case 'fogos': case 'vento':
      return id;
    case 'fogos-bruxos': return 'fogos';
    case 'passo-de-vento': return 'vento';
    default: return 'blip';
  }
}

function trackFor(map: string, bossPhase: unknown): Track {
  if (map === 'map.coracao') return bossPhase ? 'duelo' : 'quadros';
  if (map === 'map.galeria' || map.startsWith('map.quadro-')) return 'quadros';
  if (ACT2_MAPS.includes(map)) return 'biblioteca';
  return 'castelo';
}
const BOSS_START_FLAG = 'boss:iniciar';

/** Lê uma condição guardada como texto JSON numa propriedade do Tiled. */
function cond(o: Phaser.Types.Tilemaps.TiledObject): Condition | undefined {
  const raw = prop<string>(o.properties, 'when');
  return raw ? (JSON.parse(raw) as Condition) : undefined;
}

export class WorldScene extends Phaser.Scene {
  private mapKey = '';
  /** Modo Kids: trilha até o objetivo e dica quando a criança fica parada. */
  private guide?: GuideTrail;
  private guidePoint?: { x: number; y: number };
  private guideAt = 0;
  private hintObjective = '';
  private hintSince = 0;
  private entry: WorldData = { map: '' };
  private player!: Player;
  private walls!: Phaser.Tilemaps.TilemapLayer;
  private controls!: InputManager;
  private things: Thing[] = [];
  private dialogueId = '';
  /** Chapéu das Virtudes na cabeça do aprendiz durante a escolha da casa. */
  private hat?: Phaser.GameObjects.Image;
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
  private kidsHits = 0;
  /** Ao chegar por uma porta, o aprendiz fica parado na soleira um instante. */
  private arriveUntil = 0;
  private windUntil = 0;
  private shieldUntil = 0;
  private shield?: Phaser.GameObjects.Arc;
  private hiddenThings: { thing: Thing; flag: string }[] = [];
  private dials = new Map<Thing, DialMeta>();
  private locks = new Map<Thing, LockMeta>();
  private paintings: Painting[] = [];
  private sentinels: Sentinel[] = [];
  private checkpoints: { zone: Phaser.Geom.Rectangle; spawn: string }[] = [];
  private checkpoint?: string;
  private beam?: Beam;
  private darkness?: Darkness;
  private boss?: Boss;
  private bossWhen?: Condition;
  private orbs!: Phaser.Physics.Arcade.Group;
  private wave = 0;
  private doorNoticeAt = 0;
  private bark!: Bark;
  private stillSince = 0;

  constructor() {
    super('World');
  }

  create(data: WorldData): void {
    this.registerFalas();
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
    this.arriveUntil = data.spawn && !data.caught && !data.fainted ? this.game.loop.time + FADE_MS + 450 : 0;
    this.windUntil = 0;
    this.shieldUntil = 0;
    this.shield = undefined;
    this.hiddenThings = [];
    this.dials = new Map();
    this.locks = new Map();
    this.paintings = [];
    this.sentinels = [];
    this.checkpoints = [];
    this.checkpoint = data.spawn;
    this.beam = undefined;
    this.darkness = undefined;
    this.boss = undefined;
    this.bossWhen = undefined;
    this.wave = 0;

    const s = session.state;
    const mapDef = assets().map(data.map);
    const map = this.make.tilemap({ key: data.map });
    const tilesets = mapDef.tilesets.map((key) => map.addTilesetImage(assets().tileset(key).tiledName, key)!);

    map.createLayer('chao', tilesets)!;
    this.walls = map.createLayer('paredes', tilesets)!;
    this.walls.setCollisionByProperty({ collides: true });
    // luar pelas janelas da parede (tile "janela" do tileset)
    this.walls.forEachTile((t) => {
      if (t.index !== WINDOW_TILE) return;
      let ty = t.y + 1;
      while (ty < t.y + 4 && this.walls.getTileAt(t.x, ty)?.collides) ty++;
      windowLight(this, t.pixelX + 8, ty * TILE_SIZE);
    });

    const objects = map.getObjectLayer('objetos')?.objects ?? [];
    const spawns = objects.filter((o) => o.type === 'spawn');
    const spawn = spawns.find((o) => o.name === data.spawn) ?? spawns[0] ?? { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
    const capa = s.equipment.capa ? db.items[s.equipment.capa]?.sheet : undefined;
    this.player = new Player(this, spawn.x!, spawn.y!, prop<Facing>(spawn.properties, 'facing') ?? 'down', capa ?? DEFAULT_SHEET);
    this.physics.add.collider(this.player, this.walls);
    dropShadow(this, this.player, 12, true);
    this.puzzles = new Puzzles(this, this.player, this.walls, {
      platesSolved: (g) => this.onPlatesSolved(g),
      socketFilled: (sk) => this.onLevitatedIntoSocket(sk),
      firstPush: () => this.queueTutorial('empurrar'),
      occupied: (tx, ty) => this.things.some((t) => t.isPresent && t.body
        && Math.floor(t.x / TILE_SIZE) === tx && Math.floor((t.y - 1) / TILE_SIZE) === ty),
    });
    this.orbs = this.physics.add.group();
    this.physics.add.collider(this.orbs, this.walls, (o) => o.destroy());
    this.physics.add.overlap(this.player, this.orbs, (_p, o) => this.hitByOrb(o as Phaser.Physics.Arcade.Sprite));
    this.buildObjects(objects);
    if (prop<boolean>(map.properties, 'escuro')) this.darkness = new Darkness(this, map.widthInPixels, map.heightInPixels);

    // portas: zonas que levam a outro mapa e a um ponto de chegada
    for (const o of objects.filter((o) => o.type === 'door')) {
      const zone = this.add.zone(o.x! + o.width! / 2, o.y! + o.height! / 2, o.width!, o.height!);
      this.physics.add.existing(zone, true);
      const when = cond(o);
      const locked = prop<string>(o.properties, 'locked');
      this.physics.add.overlap(this.player, zone, () => {
        // empurrado por um golpe não conta como entrar na porta (a chegada fica bem na soleira)
        if (this.time.now < this.knockUntil) return;
        if (when && !check(when, session.state)) {
          if (locked && this.time.now > this.doorNoticeAt) {
            this.doorNoticeAt = this.time.now + 2500;
            this.hud.notify(locked);
            audio.sfx('erro');
            this.bark.say(pickLine('trancado'));
          }
          return;
        }
        if (!this.transitioning && !this.dialogue) audio.sfx('porta');
        this.goTo({ map: prop(o.properties, 'target')!, spawn: prop(o.properties, 'spawn') });
      });
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
    this.bark = new Bark(this);
    this.guide = s.modo === 'kids' ? new GuideTrail(this) : undefined;
    this.guidePoint = undefined;
    this.guideAt = 0;
    this.hintSince = this.time.now;
    this.stillSince = this.time.now;
    clampVitals(s, db);
    this.applyOutfit();
    this.refreshHud();
    this.refreshPresence(false);
    this.hud.showRoomName(prop(map.properties, 'nome') ?? '');
    this.cameras.main.fadeIn(FADE_MS, 24, 20, 42);
    const track = trackFor(data.map, s.flags[BOSS_FLAG]);
    if (track === 'castelo') audio.playlist(CASTELO_LISTA);
    else audio.music(track);
    if (data.fainted) audio.sfx('desmaio');

    // ao voltar do caldeirão, do grimório, de um tutorial ou do fim de ato
    this.events.on(Phaser.Scenes.Events.RESUME, (_s: unknown, from?: { from?: string }) => {
      if (from?.from === 'cauldron') for (const t of CauldronScene.lastNotices) this.hud.notify(t);
      if (from?.from === 'grimoire') for (const t of GrimoireScene.lastNotices) this.hud.notify(t);
      // o modo pode ter mudado nas Opções
      if (session.state.modo === 'kids' && !this.guide) this.guide = new GuideTrail(this);
      if (session.state.modo !== 'kids' && this.guide) {
        this.guide.destroy();
        this.guide = undefined;
      }
      this.afterStateChange();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME));

    if (data.fainted) this.hud.notify('Você desmaiou... e acordou aqui. Vida e energia de volta!');
    if (data.caught) this.hud.notify('Uma sentinela viu você! De volta ao último ponto seguro.');
    this.resumeBossFight();
    this.maybeRunawayShadows(map);
    if (!seenTutorial(s, 'controles')) this.queueTutorial('controles');

    // primeira visita a uma sala: o aprendiz comenta
    const visited = `visitou:${data.map}`;
    if (!s.flags[visited]) {
      s.flags[visited] = true;
      if (Object.keys(s.flags).some((k) => k.startsWith('visitou:') && k !== visited)) {
        this.time.delayedCall(FADE_MS + 500, () => !this.dialogue && this.bark.say(pickLine(`sala:${data.map}`, 'sala')));
      }
    }

    // salvamento automático a cada sala
    s.map = data.map;
    s.spawn = data.spawn ?? spawn.name ?? '';
    session.save();
    events.emit('map:entered', { map: data.map });
  }

  private buildObjects(objects: Phaser.Types.Tilemaps.TiledObject[]): void {
    const s = session.state;
    let beamSource: { tx: number; ty: number; dx: number; dy: number } | undefined;
    let beamTarget: { name: string; tx: number; ty: number; sprite: Phaser.GameObjects.Sprite } | undefined;
    const bossSpots: { x: number; y: number }[] = [];
    for (const o of objects) {
      if (this.puzzles.build(o)) continue;
      const sprite = prop<string>(o.properties, 'sprite');
      let when = cond(o);
      switch (o.type) {
        case 'prop': {
          if (!sprite) break;
          // variações: peça com vários quadros (estante, tapete) muda conforme o lugar, para não se repetir igual
          const frames = this.textures.get(sprite).frameTotal - 1;
          const frame = prop<number>(o.properties, 'frame') ?? (frames > 1 ? ((o.x! / 16) * 7 + (o.y! / 16) * 3) % frames : 0);
          const flat = FLAT_PROPS.some((f) => sprite.startsWith(f));
          const p = this.add.sprite(o.x!, o.y!, sprite, Math.floor(frame)).setOrigin(0.5, 1).setDepth(sprite.startsWith('prop.tapete') ? 0.3 : o.y! + (prop<number>(o.properties, 'acima') ?? 0));
          if (assets().hasAnimation(sprite, 'idle')) p.play({ key: AssetRegistry.animKey(sprite, 'idle'), startFrame: Phaser.Math.Between(0, 2) });
          if (LIGHT_PROPS.has(sprite)) torchHalo(this, o.x!, o.y! - p.height + 4);
          else if (!flat) dropShadow(this, p, Math.min(28, p.width - 2));
          // móvel de enfeite que ocupa espaço: "solido" é a altura (em px) da base que bloqueia
          const solid = prop<number>(o.properties, 'solido');
          if (solid) {
            const wall = this.add.zone(o.x!, o.y! - solid / 2, p.width - 2, solid);
            this.physics.add.existing(wall, true);
            this.physics.add.collider(this.player, wall);
          }
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
            ghost: assets().isGhost(sprite!), bodySize: prop<boolean>(o.properties, 'wide') ? [30, 10] : undefined,
          });
          if (t.body) this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
        case 'pickup': {
          if (s.flags[this.pickupFlag(o.name)]) break;
          const item = prop(o.properties, 'item')!;
          // cartas escondidas só aparecem depois de Revelar
          const hiddenFlag = prop<boolean>(o.properties, 'oculto') ? this.revealFlag(o.name) : undefined;
          if (hiddenFlag) when = when ? { all: [when, { flag: hiddenFlag }] } : { flag: hiddenFlag };
          const t = new Thing(this, o.x!, o.y!, {
            kind: 'pickup', name: o.name, sheet: 'ui.icones', frame: assets().frameOf('ui.icones', item), ref: item, when,
            extra: prop(o.properties, 'dialogue'),
          });
          this.things.push(t);
          if (hiddenFlag) this.hiddenThings.push({ thing: t, flag: hiddenFlag });
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
          const challenge = prop<string>(o.properties, 'challenge');
          // "renasce": volta sempre que o aprendiz entra na sala (porão)
          if (!challenge && !prop<boolean>(o.properties, 'renasce') && s.flags[this.creatureFlag(group)]) break;
          const c = new Creature(this, o.x!, o.y!, sprite!, o.name, group, {
            hp: prop<number>(o.properties, 'hp') ?? 2, when, challenge,
            hidden: prop<boolean>(o.properties, 'oculto'), still: prop<boolean>(o.properties, 'parado'),
          });
          this.physics.add.collider(c, this.walls);
          for (const g of this.puzzles.gates) this.physics.add.collider(c, g.sprite);
          if (c.still) this.physics.add.collider(this.player, c);
          else this.physics.add.overlap(this.player, c, () => this.touchCreature(c));
          if (challenge) c.setPresent(false);
          this.creatures.push(c);
          break;
        }
        case 'chest': {
          const t = new Thing(this, o.x!, o.y!, { kind: 'chest', name: o.name, sheet: 'prop.bau', ref: o.name, solid: true });
          const at = s.flags[this.chestFlag(o.name)];
          if (typeof at === 'number' && s.playTimeMs - at < (baus as LootTable).recargaMs) t.showFrame(1);
          this.physics.add.collider(this.player, t);
          this.things.push(t);
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
        case 'canteiro': {
          const t = new Thing(this, o.x!, o.y!, { kind: 'planter', name: o.name, sheet: 'prop.canteiro', ref: o.name, solid: true });
          t.showFrame(this.planterState(t));
          this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
        case 'dial': {
          const group = prop<string>(o.properties, 'group') ?? '';
          const house = prop<number>(o.properties, 'house') ?? 0;
          const t = new Thing(this, o.x!, o.y!, { kind: 'dial', name: o.name, sheet: 'prop.mostrador', ref: group, solid: true });
          const raw = prop<string>(o.properties, 'activeWhen');
          this.dials.set(t, {
            group, house, answer: prop<number>(o.properties, 'answer') ?? 0, start: prop<number>(o.properties, 'start') ?? 0,
            activeWhen: raw ? (JSON.parse(raw) as Condition) : undefined,
            inactiveText: prop<string>(o.properties, 'inactive') ?? 'Não se mexe.',
          });
          const sym = Number(s.flags[this.dialFlag(o.name)] ?? prop<number>(o.properties, 'start') ?? 0);
          t.showFrame(house * 4 + sym);
          this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
        case 'lock': {
          const t = new Thing(this, o.x!, o.y!, { kind: 'lock', name: o.name, sheet: sprite ?? 'prop.porta-trancada', ref: o.name, solid: true, bodySize: [32, 10] });
          this.locks.set(t, { when, lockedText: prop<string>(o.properties, 'locked') ?? 'A tranca não cede.' });
          if (s.flags[this.lockFlag(o.name)]) this.openLock(t, false);
          this.physics.add.collider(this.player, t);
          this.things.push(t);
          break;
        }
        case 'sentinel': {
          this.sentinels.push(new Sentinel(this, o.x!, o.y!, sprite ?? 'npc.olho',
            prop<'x' | 'y'>(o.properties, 'axis') ?? 'x', (prop<number>(o.properties, 'range') ?? 4) * TILE_SIZE,
            (prop<number>(o.properties, 'speed') ?? 30) * (s.modo === 'kids' ? KIDS_SENTINEL : 1)));
          break;
        }
        case 'checkpoint': {
          this.checkpoints.push({ zone: new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!), spawn: prop<string>(o.properties, 'spawn')! });
          break;
        }
        case 'beam-source': {
          this.add.sprite(o.x!, o.y!, sprite ?? 'prop.fonte-luz').setOrigin(0.5, 1).setDepth(o.y!);
          beamSource = {
            tx: Math.floor(o.x! / TILE_SIZE), ty: Math.floor((o.y! - 1) / TILE_SIZE),
            dx: prop<number>(o.properties, 'dx') ?? 1, dy: prop<number>(o.properties, 'dy') ?? 0,
          };
          break;
        }
        case 'beam-target': {
          const spr = this.add.sprite(o.x!, o.y!, sprite ?? 'prop.cristal', 0).setOrigin(0.5, 1).setDepth(o.y!);
          this.physics.add.existing(spr, true);
          (spr.body as Phaser.Physics.Arcade.StaticBody).setSize(12, 6).setOffset(2, 18);
          this.physics.add.collider(this.player, spr);
          beamTarget = { name: o.name, tx: Math.floor(o.x! / TILE_SIZE), ty: Math.floor((o.y! - 1) / TILE_SIZE), sprite: spr };
          break;
        }
        case 'painting': {
          const index = prop<number>(o.properties, 'index') ?? 0;
          const spr = this.add.sprite(o.x!, o.y!, sprite ?? 'prop.quadro-portal', index * 2).setOrigin(0.5, 1).setDepth(1);
          this.paintings.push({ sprite: spr, index, doneFlag: prop<string>(o.properties, 'doneFlag') ?? '' });
          break;
        }
        case 'boss-spot': {
          bossSpots.push({ x: o.x!, y: o.y! });
          break;
        }
      }
    }
    for (const g of new Set(this.puzzles.plates.map((p) => p.group))) {
      if (s.flags[this.plateFlag(g)]) this.puzzles.restoreSolved(g);
    }
    for (const sk of this.puzzles.sockets.filter((x) => x.mode === 'levitar' && !x.turn)) {
      if (s.flags[this.socketFlag(sk.name)]) this.puzzles.restoreLevitated(sk.name);
    }
    if (beamSource && beamTarget) {
      if (s.flags[this.beamFlag(beamTarget.name)]) beamTarget.sprite.setFrame(1);
      else this.beam = new Beam(this, this.walls, beamSource, beamTarget, this.puzzles.sockets.filter((x) => x.turn));
    }
    const bossObj = objects.find((o) => o.type === 'boss');
    this.bossWhen = bossObj ? cond(bossObj) : undefined;
    if (bossObj && check(this.bossWhen, s)) {
      const sheet = prop<string>(bossObj.properties, 'sprite') ?? 'npc.morgana';
      this.boss = new Boss(this, bossObj.x!, bossObj.y!, sheet, [{ x: bossObj.x!, y: bossObj.y! }, ...bossSpots], {
        fire: (x, y, tx, ty) => this.fireOrb(x, y, tx, ty),
        summon: () => this.summonShadows(),
        phaseOver: (ph) => this.onBossPhaseOver(ph),
      }, s.modo === 'kids' ? KIDS_BOSS : 1);
    }
  }

  private chestFlag(name: string): string {
    return `bau:${this.mapKey}:${name}`;
  }

  private revealFlag(name: string): string {
    return `revelado:${this.mapKey}:${name}`;
  }

  private dialFlag(name: string): string {
    return `mostrador:${this.mapKey}:${name}`;
  }

  private lockFlag(name: string): string {
    return `trancado:${this.mapKey}:${name}`;
  }

  private beamFlag(name: string): string {
    return `luz:${this.mapKey}:${name}`;
  }

  private planterFlag(name: string): string {
    return `canteiro:${this.mapKey}:${name}`;
  }

  private planterState(t: Thing): number {
    return Number(session.state.flags[this.planterFlag(t.thingName)] ?? 0);
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

  /**
   * Todas as salas usam o mesmo zoom (WORLD_SCALE), no PC e no celular: personagens,
   * portas e móveis ficam sempre do mesmo tamanho. Salas menores que a tela ficam
   * centralizadas; maiores seguem o jogador. O HUD tem uma câmera própria, sem zoom
   * de sala, que mostra só o que está preso na tela (scrollFactor 0).
   */
  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const cam = this.cameras.main;
    const w = map.widthInPixels;
    const h = map.heightInPixels;
    const zoom = RENDER_ZOOM * WORLD_SCALE;
    const viewW = (GAME_WIDTH * RENDER_ZOOM) / zoom;
    const viewH = (GAME_HEIGHT * RENDER_ZOOM) / zoom;
    cam.setOrigin(0.5).setZoom(zoom);
    const bx = w < viewW ? -(viewW - w) / 2 : 0;
    const by = h < viewH ? -(viewH - h) / 2 : 0;
    cam.setBounds(bx, by, Math.max(w, viewW), Math.max(h, viewH));
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setDeadzone(48, 32);
    cam.setRoundPixels(true);

    const ui = this.cameras.add();
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, () => {
      for (const o of this.children.list) {
        const onScreen = (o as unknown as Phaser.GameObjects.Components.ScrollFactor).scrollFactorX === 0;
        const c = o as unknown as Phaser.GameObjects.Components.Visible & { cameraFilter: number };
        c.cameraFilter = onScreen ? cam.id : ui.id;
      }
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

  /** Respostas para {objetivo} e {estrela} nas falas dos professores. */
  private registerFalas(): void {
    setFalaProvider('objetivo', () => {
      return currentObjective(session.state, db)?.objective ?? 'Aproveitar o castelo, porque o que precisava ser feito já foi!';
    });
    setFalaProvider('estrela', () => {
      const salas = (mapaLayout as unknown as { salas: Record<string, { nome?: string }> }).salas;
      const s = session.state;
      const comEstrela = Object.keys(salas).filter((key) => {
        const json = this.cache.tilemap.get(key)?.data as
          | { layers: { objects?: { name: string; type: string; properties?: { name: string; value: unknown }[] }[] }[] }
          | undefined;
        if (!json || !salas[key].nome) return false;
        return json.layers
          .flatMap((l) => l.objects ?? [])
          .some((o) => o.type === 'pickup' && o.properties?.some((p) => p.name === 'item' && p.value === 'estrela-perdida') && !s.flags[`pego:${key}:${o.name}`]);
      });
      if (!comEstrela.length) return 'Ela diz que você já achou todas as estrelas perdidas. Que brilho!';
      // a sala onde o aprendiz está fica por último, para a dica levar a outro lugar
      const key = comEstrela.find((k) => k !== this.mapKey) ?? comEstrela[0];
      return `Ela aponta para: ${salas[key].nome}. Lá ainda brilha uma estrela perdida.`;
    });
  }

  // ---------- estado e HUD

  private refreshHud(): void {
    const s = session.state;
    const st = stats(s, db);
    this.hud.setObjective(currentObjective(s, db));
    this.hud.setSpell(s.selectedSpell ? { id: s.selectedSpell, name: db.spells[s.selectedSpell].name } : undefined);
    this.hud.setVitals({ vida: s.vida, vidaMax: st.vidaMax, energia: s.energia, energiaMax: st.energiaMax, level: s.level });
  }

  /** Chapéu das Virtudes desce flutuando até a cabeça do aprendiz. */
  private putHat(): void {
    if (this.hat) return;
    const top = this.player.y - this.player.height;
    this.hat = this.add.image(this.player.x, top - 20, 'prop.chapeu').setOrigin(0.5, 1).setDepth(this.player.depth + 1).setAlpha(0);
    this.tweens.add({ targets: this.hat, y: top + 5, alpha: 1, duration: 600, ease: 'Sine.out' });
    audio.sfx('confirmar');
  }

  /** Casa escolhida: o chapéu brilha com a cor da casa e some numa nuvenzinha. */
  private hatGlow(house: string): void {
    const hat = this.hat;
    if (!hat) return;
    this.hat = undefined;
    const color = HOUSE_COLORS[house] ?? 0xfad65c;
    const glow = this.add.circle(hat.x, hat.y - 7, 4, color, 0.7).setDepth(hat.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
    hat.setTint(color);
    this.tweens.add({ targets: glow, radius: 22, alpha: 0, duration: 700, onComplete: () => glow.destroy() });
    this.tweens.add({
      targets: hat, y: hat.y - 14, alpha: 0, delay: 500, duration: 500,
      onComplete: () => {
        this.puff(hat.x, hat.y - 6);
        hat.destroy();
      },
    });
  }

  private removeHat(): void {
    if (!this.hat) return;
    const hat = this.hat;
    this.hat = undefined;
    this.tweens.add({ targets: hat, alpha: 0, duration: 300, onComplete: () => hat.destroy() });
  }

  /** Avisos de texto vão para a tela; tutoriais e fim de ato entram na fila. */
  private showNotices(notices: Notice[]): void {
    // missões, itens e feitiços viram eventos: o HUD comemora a etapa e o jogo salva na hora
    emitNotices(events, notices);
    if (notices.some((n) => n.kind === 'house') && session.state.house) this.hatGlow(session.state.house);
    const kinds = new Set(notices.map((n) => n.kind));
    const item = notices.find((n) => n.kind === 'item');
    if (kinds.has('level')) this.bark.say(pickLine('nivel'), true);
    else if (kinds.has('spell')) this.bark.say(pickLine('feitico'), true);
    else if (item) this.bark.say(pickLine(`pegar:${item.ref}`, 'pegar'), true);
    else if (kinds.has('quest-done')) this.bark.say(pickLine('missao'));
    if (kinds.has('level')) audio.sfx('nivel');
    else if (kinds.has('quest-done') || kinds.has('spell')) audio.sfx('missao');
    else if (kinds.has('quest-start') || kinds.has('recipe') || kinds.has('house')) audio.sfx('confirmar');
    else if (kinds.has('item') || kinds.has('equip')) audio.sfx('pegar');
    for (const n of notices) {
      if (n.kind === 'tutorial' && n.ref) this.queueTutorial(n.ref);
      else if (n.kind === 'act-end' && n.ref) this.actQueue.push(n.ref);
      else if (n.text && n.kind !== 'quest-update' && n.kind !== 'quest-done') this.hud.notify(n.text);
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
      this.scene.launch(act === '3' ? 'Ending' : 'ActCard', { act });
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
    this.refreshPaintings();
    this.refreshHud();
    this.refreshBossBar();
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
      if (!c.active || c.challenge) continue; // levas da aula aparecem só durante o desafio
      const on = check(c.when, s);
      if (on === c.isPresent) continue;
      c.setPresent(on);
      if (on && animate) this.puff(c.x, c.y - 6);
    }
    // Bellatrix convencida sai do duelo
    if (this.boss && this.boss.phase === 'parada' && !check(this.bossWhen, s)) {
      this.puff(this.boss.x, this.boss.y - 12);
      this.boss.destroy();
      this.boss = undefined;
      // as sombrinhas que ela chamou vão embora junto
      for (const c of this.creatures.filter((x) => x.group === 'invocadas')) {
        this.puff(c.x, c.y - 6);
        c.destroy();
      }
      this.creatures = this.creatures.filter((x) => x.active);
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

  private openMap(): void {
    if (!session.state.inventory['mapa-dos-segredos']) {
      this.bark.say('Se eu tivesse um mapa deste castelo...');
      return;
    }
    this.player.halt();
    this.scene.launch('Map', { back: 'World' });
    this.scene.pause();
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
      case 'pickup': {
        session.state.flags[this.pickupFlag(t.thingName)] = true;
        this.showNotices(apply({ giveItem: t.ref }, session.state, db));
        for (const e of db.items[t.ref]?.onPickup ?? []) this.showNotices(apply(e, session.state, db));
        this.things = this.things.filter((x) => x !== t);
        this.hiddenThings = this.hiddenThings.filter((h) => h.thing !== t);
        this.near = undefined;
        const after = t.extra;
        t.remove();
        this.afterStateChange();
        if (after) this.startDialogue(dialogues[after]);
        return;
      }
      case 'planter':
        return this.usePlanter(t);
      case 'dial':
        return this.turnDial(t);
      case 'lock':
        if (session.state.flags[this.lockFlag(t.thingName)]) return this.hud.notify('A porta está aberta.');
        // de frente para a porta, a ação lança Abrir se ele estiver escolhido
        if (session.state.selectedSpell === 'abrir') return this.castSpell();
        return this.hud.notify(`${this.locks.get(t)?.lockedText ?? 'Trancada com magia.'} Quem sabe um feitiço...`);
      case 'station':
        return this.useStation(t);
      case 'challenge':
        return this.offerChallenge(t);
      case 'socket':
        return this.useSocket(t);
      case 'chest':
        return this.useChest(t);
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

  /** Baú do porão: prêmio sorteado, um susto de vez em quando, e recarga com o tempo. */
  private useChest(t: Thing): void {
    const s = session.state;
    const r = openChest(s, baus as LootTable, this.chestFlag(t.thingName));
    if (r.kind === 'vazio') {
      const min = Math.max(1, Math.ceil(r.readyInMs / 60000));
      this.hud.notify(`Vazio. Volte em uns ${min} minuto${min > 1 ? 's' : ''}: os baús do porão se enchem sozinhos.`);
      return;
    }
    t.showFrame(1);
    audio.sfx('porta');
    if (r.kind === 'susto') {
      this.hud.notify('Era um baú-susto! Uma sombrinha pulou pra fora!');
      this.bark.say('AAAH! Não era isso que eu queria achar!', true);
      this.spawnShadow(t.x, t.y + 14, 'susto');
    } else {
      this.showNotices(r.items.flatMap((id) => apply({ giveItem: id }, s, db)));
      this.puff(t.x, t.y - 10);
    }
    this.afterStateChange();
  }

  /**
   * Sombrinhas fujonas: depois do Ato 1, às vezes duas sombrinhas aparecem numa sala comum.
   * Dão experiência e deixam o passeio fora da história menos previsível.
   */
  private maybeRunawayShadows(map: Phaser.Tilemaps.Tilemap): void {
    const s = session.state;
    const calm = ['map.recepcao', 'map.coracao', 'map.sala-espectral', 'map.gabinete'];
    if (!s.flags['ato:1:fim'] || calm.includes(this.mapKey) || this.mapKey.startsWith('map.quadro-') || this.boss) return;
    if (Math.random() > RUNAWAY_CHANCE) return;
    let placed = 0;
    for (let tries = 0; tries < 60 && placed < 2; tries++) {
      const tx = Phaser.Math.Between(2, map.width - 3);
      const ty = Phaser.Math.Between(4, map.height - 3);
      const x = tx * TILE_SIZE + 8;
      const y = ty * TILE_SIZE + 14;
      if (this.walls.getTileAt(tx, ty) || Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 96) continue;
      this.spawnShadow(x, y, `fujona-${placed}`);
      placed += 1;
    }
    if (placed) this.time.delayedCall(FADE_MS + 200, () => this.hud.notify('Sombrinhas fujonas por aqui! Espante com Lumen.'));
  }

  /** Sombrinha avulsa (baú-susto ou sombrinhas fujonas): some ao ser espantada e não fica no save. */
  private spawnShadow(x: number, y: number, name: string): void {
    const c = new Creature(this, x, y, 'npc.sombrinha', name, '', { hp: 2 });
    this.physics.add.collider(c, this.walls);
    this.physics.add.overlap(this.player, c, () => this.touchCreature(c));
    this.creatures.push(c);
    this.puff(c.x, c.y - 6);
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
    audio.sfx('enigma');
    flash(this.cameras.main, 200, 250, 214, 92);
    this.hud.notify(`${item.name} encaixada!`);
    this.afterStateChange();
    if (this.puzzles.groupFilled(spot.group) && spot.dialogue) {
      this.time.delayedCall(500, () => this.startDialogue(dialogues[spot.dialogue!]));
    }
  }

  // ---------- estufa, observatório e portas trancadas

  private usePlanter(t: Thing): void {
    const s = session.state;
    const st = this.planterState(t);
    const flag = this.planterFlag(t.thingName);
    if (st === 0) {
      if (!s.inventory['semente-mandragora']) {
        this.hud.notify('Precisa de uma Semente de Mandrágora. O saco de sementes fica perto da porta.');
        return;
      }
      apply({ takeItem: 'semente-mandragora' }, s, db);
      s.flags[flag] = 1;
      t.showFrame(1);
      audio.sfx('pegar');
      this.hud.notify('Semente plantada! Agora ela quer luz.');
      this.queueTutorial('estufa');
    } else if (st === 1) {
      // de frente para o canteiro a ação conversaria com ele; com Lumen escolhido, lança o feitiço
      if (s.selectedSpell === 'lumen') return this.castSpell();
      this.hud.notify('A semente quer luz: lance Lumen nela!');
      return;
    } else {
      s.flags[flag] = 0;
      t.showFrame(0);
      const counter = `colheitas:${this.mapKey}`;
      s.flags[counter] = Number(s.flags[counter] ?? 0) + 1;
      this.showNotices(apply({ giveItem: 'folha-mandragora' }, s, db));
      this.puff(t.x, t.y - 8);
    }
    this.afterStateChange();
  }

  private turnDial(t: Thing): void {
    const s = session.state;
    const meta = this.dials.get(t)!;
    const solvedFlag = `signos:${this.mapKey}:${meta.group}`;
    if (s.flags[solvedFlag]) return this.hud.notify('As estrelas já estão alinhadas.');
    if (!check(meta.activeWhen, s)) return this.hud.notify(meta.inactiveText);
    const sym = (Number(s.flags[this.dialFlag(t.thingName)] ?? meta.start) + 1) % 4;
    s.flags[this.dialFlag(t.thingName)] = sym;
    t.showFrame(meta.house * 4 + sym);
    audio.sfx('menu');
    this.tweens.add({ targets: t, scaleX: { from: 0.6, to: 1 }, duration: 160 });
    const group = [...this.dials.entries()].filter(([, m]) => m.group === meta.group);
    const solved = group.every(([d, m]) => Number(s.flags[this.dialFlag(d.thingName)] ?? m.start) === m.answer);
    if (solved) {
      s.flags[solvedFlag] = true;
      flash(this.cameras.main, 500, 220, 230, 255);
      audio.sfx('enigma');
      this.hud.notify('As constelações se alinham!');
    }
    this.afterStateChange();
  }

  private openLock(t: Thing, animate = true): void {
    t.showFrame(1);
    (t.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    if (!animate) return;
    session.state.flags[this.lockFlag(t.thingName)] = true;
    shake(this.cameras.main, 200, 0.004);
    this.puff(t.x, t.y - 16);
    this.hud.notify('Click! A porta se abriu.');
  }

  private refreshPaintings(): void {
    for (const p of this.paintings) {
      const done = Boolean(p.doneFlag && session.state.flags[p.doneFlag]);
      p.sprite.setFrame(p.index * 2 + (done ? 1 : 0));
    }
  }

  private onPlatesSolved(group: string): void {
    const flag = this.plateFlag(group);
    if (session.state.flags[flag]) return;
    session.state.flags[flag] = true;
    this.puzzles.openGates(group);
    audio.sfx('enigma');
    this.hud.notify('Click! A grade se abriu.');
    this.afterStateChange();
  }

  private onLevitatedIntoSocket(sk: SocketSpot): void {
    flash(this.cameras.main, 120, 250, 214, 92);
    audio.sfx('acerto');
    if (this.challenge?.isTarget(sk.name)) return void this.challenge.hitTarget(sk.name, session.state, db);
    if (sk.turn) return; // suportes de espelho: quem decide é o raio de luz
    // atris da biblioteca e afins: o encaixe fica guardado no save
    session.state.flags[this.socketFlag(sk.name)] = true;
    if (this.puzzles.groupFilled(sk.group)) this.hud.notify('Tudo no lugar!');
    this.afterStateChange();
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
    this.challenge = new ChallengeRunner(id, session.state.modo === 'kids' ? { ...def, timeLimitMs: def.timeLimitMs * KIDS_TIME } : def);
    if (def.kind === 'acender') for (const c of this.candles) if (def.targets.includes(c.targetName)) c.setLit(false);
    if (def.kind === 'levitar') this.puzzles.resetKind('calice');
    if (def.kind === 'espectral') {
      this.wave = 0;
      this.activateWave();
    }
    flash(this.cameras.main, 250, 20, 10, 40);
    audio.sfx('confirmar');
    this.hud.notify('Valendo!');
    if (def.tutorial) this.queueTutorial(def.tutorial);
  }

  private updateChallenge(delta: number): void {
    const ch = this.challenge;
    if (!ch) return;
    ch.update(delta);
    const { done, total } = ch.progress;
    if (ch.status === 'running') {
      const secs = Math.ceil(ch.remainingMs / 1000);
      const before = Math.ceil((ch.remainingMs + delta) / 1000);
      // aviso de tempo: "faltam 10s" e um tique por segundo no fim
      if (secs !== before && secs === 10) this.hud.notify('Faltam 10 segundos!');
      if (secs !== before && secs <= 5 && secs > 0) audio.sfx('menu');
      this.hud.setTimer(`⏳ ${secs}s   ${done}/${total}`, secs <= 10);
      return;
    }
    this.hud.setTimer(undefined);
    const def = db.challenges[ch.id];
    if (ch.status === 'won') {
      audio.sfx('vitoria');
      this.time.delayedCall(800, () => this.bark.say(pickLine('desafio-vencido')));
      this.hud.notify('Desafio vencido!');
      this.showNotices(ch.notices);
      this.burstFireworks(this.player.x, this.player.y - 30);
    } else {
      audio.sfx('derrota');
      this.bark.say(pickLine('desafio-perdido'), true);
      this.hud.notify('O tempo acabou! Tente de novo no quadro.');
      if (def.kind === 'acender') for (const c of this.candles) if (def.targets.includes(c.targetName)) c.setLit(true);
      if (def.kind === 'espectral') {
        // os espectros que sobraram voltam a se esconder: recomeça a sala
        this.challenge = undefined;
        this.afterStateChange();
        this.time.delayedCall(1500, () => this.goTo({ map: this.mapKey, spawn: this.checkpoint ?? this.entry.spawn }));
        return;
      }
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
      audio.sfx(r === false ? 'erro' : 'blip');
      if (r === false) this.hud.notify('Não cabe aí.');
      return;
    }
    const spell = spellId ? db.spells[spellId] : undefined;
    if (spell && !spendEnergy(s, spell.cost)) {
      audio.sfx('sem-energia');
      this.bark.say(pickLine('sem-energia'));
      this.hud.notify('Sem energia mágica! Espere um pouco.');
      shake(this.cameras.main, 80, 0.002);
      return;
    }
    const fxKey = spell?.fx ?? 'fx.fagulha';
    audio.sfx(spellSound(spellId));
    if (fxKey === 'fx.fogos') this.burstFireworks(at.x, at.y - 6);
    else {
      const fx = this.add.sprite(at.x, at.y, fxKey).setDepth(this.player.depth + 1);
      fx.play(AssetRegistry.animKey(fxKey, 'burst'));
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    }
    this.refreshHud();
    if (!spellId || !spell) return;

    this.darkness?.flash(at.x, at.y, 64, 700);

    if (spell.self === 'velocidade') {
      this.windUntil = this.time.now + WIND_MS;
      this.applyOutfit();
      this.hud.notify('Passo de Vento!');
      return;
    }
    if (spell.self === 'escudo') {
      this.raiseShield();
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
    if (spell.target === 'oculto') return this.reveal();
    if (spell.target === 'trancado') return this.castOpen(at);

    // luz espanta sombrinhas e espectros, acerta a Bellatrix e faz a mandrágora crescer
    if (spellId === 'lumen' || spellId === 'fogos-bruxos') {
      const now = this.time.now;
      const boss = this.boss;
      if (boss && boss.canBeHit(now) && Phaser.Math.Distance.Between(at.x, at.y, boss.x, boss.y - 12) < SPELL_RANGE + 16) {
        boss.hit(now);
        audio.sfx('acerto');
        shake(this.cameras.main, 120, 0.004);
        return this.afterStateChange();
      }
      const hit = this.creatures.filter((c) => c.canBeHit(now) && Phaser.Math.Distance.Between(at.x, at.y, c.x, c.y - 6) < SPELL_RANGE + 6);
      if (hit.length) audio.sfx('acerto');
      for (const c of hit) {
        if (c.takeHit(stats(s, db).poder, this.player, now)) this.banishCreature(c);
      }
      if (hit.length) return this.afterStateChange();
      const planter = this.things.find((t) => t.kind === 'planter' && this.planterState(t) === 1
        && Phaser.Math.Distance.Between(at.x, at.y, t.x, t.y - 6) < SPELL_RANGE);
      if (planter && spellId === 'lumen') {
        s.flags[this.planterFlag(planter.thingName)] = 2;
        planter.showFrame(2);
        audio.sfx('enigma');
        this.tweens.add({ targets: planter, scaleY: { from: 0.4, to: 1 }, duration: 400, ease: 'Back.out' });
        this.hud.notify('A mandrágora cresceu! Colha com a ação.');
        return this.afterStateChange();
      }
    }

    const target = this.candles
      .filter((c) => spellAffects(db, spellId, c.targetKind))
      .map((c) => ({ c, d: Phaser.Math.Distance.Between(at.x, at.y, c.x, c.y - 8) }))
      .filter(({ d }) => d < SPELL_RANGE)
      .sort((a, b) => a.d - b.d)[0]?.c;
    if (!target || target.lit) return this.afterStateChange();

    target.setLit(true);
    audio.sfx('acerto');
    if (this.challenge?.isTarget(target.targetName)) this.challenge.hitTarget(target.targetName, s, db);
    else s.flags[this.candleFlag(target.targetName)] = true;
    this.afterStateChange();
  }

  private banishCreature(c: Creature): void {
    audio.sfx('espanto');
    this.puff(c.x, c.y - 6);
    c.destroy();
    this.creatures = this.creatures.filter((x) => x !== c);
    this.showNotices(apply({ giveXp: db.progression.creatureXp }, session.state, db).filter((n) => n.kind !== 'xp'));
    this.hud.notify(`${c.hidden ? 'Espectro' : c.still ? 'Âncora' : 'Sombrinha'} espantad${c.still ? 'a' : c.hidden ? 'o' : 'a'}! +${db.progression.creatureXp} exp`);
    const left = this.creatures.filter((x) => x.group === c.group);
    if (left.length || !c.group) return;
    if (c.challenge) {
      // aula de Criaturas Espectrais: a leva acabou
      const ch = this.challenge;
      if (!ch || ch.id !== c.challenge) return;
      ch.hitTarget(c.group, session.state, db);
      if (ch.status === 'running') {
        this.wave += 1;
        this.hud.notify('Próxima leva!');
        this.time.delayedCall(900, () => this.activateWave());
      }
      return;
    }
    session.state.flags[this.creatureFlag(c.group)] = true;
    this.hud.notify(c.still ? 'As correntes se partiram!' : 'A sala ficou clara de novo.');
  }

  /** Mostra os espectros da leva atual do desafio. */
  private activateWave(): void {
    const ch = this.challenge;
    if (!ch || ch.status !== 'running') return;
    const group = db.challenges[ch.id].targets[this.wave];
    for (const c of this.creatures.filter((x) => x.challenge === ch.id && x.group === group)) {
      c.setPresent(true);
      this.puff(c.x, c.y - 6);
    }
  }

  // ---------- Revelar, Escudo e Abrir

  private reveal(): void {
    const now = this.time.now;
    const p = this.player;
    const ring = this.add.circle(p.x, p.y - 8, 4).setStrokeStyle(2, 0xc8a0ff, 0.9).setDepth(1300);
    this.tweens.add({ targets: ring, radius: REVEAL_RADIUS, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    let found = 0;
    for (const h of this.hiddenThings) {
      if (session.state.flags[h.flag] || Phaser.Math.Distance.Between(p.x, p.y, h.thing.x, h.thing.y) > REVEAL_RADIUS) continue;
      session.state.flags[h.flag] = true;
      found += 1;
    }
    let ghosts = 0;
    for (const c of this.creatures) {
      if (c.hidden && c.isPresent && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < REVEAL_RADIUS * 1.4) {
        c.reveal(now + REVEAL_MS);
        ghosts += 1;
      }
    }
    if (this.boss?.phase === 'fase2') {
      this.boss.reveal(now + REVEAL_MS - 600);
      ghosts += 1;
    }
    if (found) audio.sfx('enigma');
    if (found) this.hud.notify('Algo escondido apareceu!');
    else if (!ghosts) this.hud.notify('Nada escondido por aqui.');
    this.afterStateChange();
  }

  private raiseShield(): void {
    this.shieldUntil = this.time.now + SHIELD_MS;
    if (!this.shield) {
      this.shield = this.add.circle(this.player.x, this.player.y - 14, 18, 0x78c8f0, 0.18).setStrokeStyle(1.5, 0xbeebff, 0.9);
    }
    this.shield.setVisible(true).setScale(0.3);
    this.tweens.add({ targets: this.shield, scale: 1, duration: 160, ease: 'Back.out' });
    this.queueTutorial('escudo');
  }

  private get shielded(): boolean {
    return this.time.now < this.shieldUntil;
  }

  private castOpen(at: Phaser.Math.Vector2): void {
    const s = session.state;
    const lock = [...this.locks.keys()]
      .filter((t) => !s.flags[this.lockFlag(t.thingName)])
      .find((t) => Phaser.Math.Distance.Between(at.x, at.y, t.x, t.y - 6) < SPELL_RANGE + 10);
    if (!lock) {
      audio.sfx('erro');
      this.hud.notify('Nada trancado por perto.');
      return;
    }
    const meta = this.locks.get(lock)!;
    if (!check(meta.when, s)) {
      this.hud.notify(meta.lockedText);
      return;
    }
    this.openLock(lock);
    this.afterStateChange();
  }

  // ---------- duelo com a Bellatrix

  private fireOrb(x: number, y: number, tx: number, ty: number): void {
    audio.sfx('orbe');
    const orb = this.orbs.create(x, y, 'fx.orbe') as Phaser.Physics.Arcade.Sprite;
    orb.play(AssetRegistry.animKey('fx.orbe', 'idle')).setDepth(1100);
    (orb.body as Phaser.Physics.Arcade.Body).setCircle(3, 1, 1);
    const v = new Phaser.Math.Vector2(tx - x, ty - y).setLength(ORB_SPEED);
    orb.setVelocity(v.x, v.y);
    this.time.delayedCall(4500, () => orb.active && orb.destroy());
  }

  private hitByOrb(orb: Phaser.Physics.Arcade.Sprite): void {
    if (!orb.active) return;
    orb.destroy();
    if (this.shielded) {
      audio.sfx('escudo');
      const spark = this.add.circle(orb.x, orb.y, 2, 0xbeebff).setDepth(1200);
      this.tweens.add({ targets: spark, radius: 8, alpha: 0, duration: 200, onComplete: () => spark.destroy() });
      return;
    }
    this.damagePlayer(orb.x, orb.y);
  }

  private summonShadows(): void {
    const b = this.boss!;
    for (let i = 0; i < 2; i++) {
      const c = new Creature(this, b.x + (i ? 40 : -40), b.y + 20, 'npc.sombrinha', `invocada-${i}`, 'invocadas', { hp: 2 });
      this.physics.add.collider(c, this.walls);
      this.physics.add.overlap(this.player, c, () => this.touchCreature(c));
      this.creatures.push(c);
      this.puff(c.x, c.y - 6);
    }
  }

  private onBossPhaseOver(phase: BossPhase): void {
    for (const o of this.orbs.getChildren().slice()) o.destroy();
    // guarda a fase vencida: se o jogo fechar no meio da conversa, ela recomeça daqui
    session.state.flags[BOSS_FLAG] = `${phase}-fim`;
    session.save();
    this.refreshBossBar();
    this.time.delayedCall(500, () => this.startDialogue(dialogues[phase === 'fase1' ? 'morgana-fase2' : 'morgana-argumentos']));
  }

  /** Voltou para a sala da torre no meio do duelo (desmaio): retoma a fase. */
  private resumeBossFight(): void {
    const phase = session.state.flags[BOSS_FLAG];
    if (!this.boss) return;
    if (phase === 'fase1-fim' || phase === 'fase2-fim') {
      this.time.delayedCall(800, () => this.startDialogue(dialogues[phase === 'fase1-fim' ? 'morgana-fase2' : 'morgana-argumentos']));
      return;
    }
    if (phase !== 'fase1' && phase !== 'fase2') return;
    this.time.delayedCall(1200, () => this.boss?.start(phase, this.time.now));
  }

  private refreshBossBar(): void {
    const b = this.boss;
    if (!b || !b.active || b.phase === 'parada') return this.hud.setBoss(undefined);
    this.hud.setBoss({ name: `Bellatrix Lestrelle (${b.phase === 'fase1' ? '1' : '2'}/2)`, frac: b.hp / b.maxHp });
  }

  private touchCreature(c: Creature): void {
    const now = this.time.now;
    if (!c.isPresent || c.still || now < this.invulnerableUntil || this.dialogue || this.transitioning) return;
    if (this.shielded) {
      c.recoil(this.player, now);
      return;
    }
    c.recoil(this.player, now);
    this.damagePlayer(c.x, c.y);
  }

  /** Tira 1 coração, empurra o aprendiz para longe e dá um tempinho sem dano. */
  private damagePlayer(fromX: number, fromY: number): void {
    const now = this.time.now;
    if (now < this.invulnerableUntil || this.dialogue || this.transitioning) return;
    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.knockUntil = now + 160;
    const away = new Phaser.Math.Vector2(this.player.x - fromX, this.player.y - fromY).setLength(150);
    this.player.setVelocity(away.x, away.y);
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 90, yoyo: true, repeat: 5, onComplete: () => this.player.setAlpha(1) });
    audio.sfx('dano');
    this.bark.say(pickLine('dano'));
    // Modo Kids: só um em cada dois toques tira coração
    this.kidsHits += 1;
    const fainted = session.state.modo === 'kids' && this.kidsHits % 2 === 1 ? false : hurt(session.state, 1);
    this.refreshHud();
    if (fainted) this.faint();
  }

  /** Visto por uma sentinela: volta ao último ponto seguro da sala. */
  private caught(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.halt();
    audio.sfx('derrota');
    flash(this.cameras.main, 250, 170, 110, 220);
    this.cameras.main.fadeOut(500, 24, 20, 42);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.restart({ map: this.mapKey, spawn: this.checkpoint ?? this.entry.spawn, caught: true }),
    );
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
      this.scene.restart({ map: this.mapKey, spawn: this.checkpoint ?? this.entry.spawn, fainted: true }),
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
        flash(this.cameras.main, 300, 10, 6, 20);
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
    this.bark.hide();
    who?.setHighlighted(false);
    this.talkingTo = who;
    this.dialogue = new DialogueRunner(def, session.state, db);
    this.dialogueId = def.id;
    events.emit('dialogue:start', { id: def.id });
    this.showCurrentLine();
  }

  private showCurrentLine(): void {
    this.showNotices(this.dialogue?.notices.splice(0) ?? []);
    this.refreshHud();
    this.refreshPresence(true);
    this.applyOutfit();
    const view = this.dialogue?.view();
    if (view?.cena === 'chapeu') this.putHat();
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
    events.emit('dialogue:end', { id: this.dialogueId });
    this.removeHat();
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
    // diálogos do duelo pedem a próxima fase da Bellatrix
    const phase = session.state.flags[BOSS_START_FLAG];
    if (phase === 'fase1' || phase === 'fase2') {
      delete session.state.flags[BOSS_START_FLAG];
      session.state.flags[BOSS_FLAG] = phase;
      audio.music('duelo');
      this.boss?.start(phase, this.time.now);
    }
    this.afterStateChange();
  }

  /** Sentinelas, raio de luz, escuridão, escudo e Bellatrix. */
  private updateExtras(time: number, delta: number): void {
    const p = this.player;
    for (const cp of this.checkpoints) if (cp.zone.contains(p.x, p.y - 4)) this.checkpoint = cp.spawn;
    for (const sn of this.sentinels) {
      sn.update(delta);
      if (sn.sees(p)) return this.caught();
    }
    if (this.beam && this.beam.update(time)) {
      const t = this.beam.target;
      session.state.flags[this.beamFlag(t.name)] = true;
      t.sprite.setFrame(1);
      this.beam.clear();
      this.beam = undefined;
      flash(this.cameras.main, 400, 250, 240, 170);
      audio.sfx('enigma');
      this.hud.notify('O cristal acendeu!');
      this.afterStateChange();
    }
    if (this.shield) {
      const on = this.shielded;
      this.shield.setVisible(on).setPosition(p.x, p.y - 14).setDepth(p.depth + 1);
      if (on && this.shieldUntil - time < 700) this.shield.setAlpha(Math.floor(time / 90) % 2 ? 0.3 : 1);
      else this.shield.setAlpha(1);
    }
    if (this.boss) {
      const before = this.boss.hp;
      this.boss.update(time, p);
      if (before !== this.boss.hp) this.refreshBossBar();
    }
    this.darkness?.update(this.lightSources());
  }

  private lightSources(): Light[] {
    const out: Light[] = [{ x: this.player.x, y: this.player.y - 8, r: 46 }];
    for (const c of this.candles) if (c.lit) out.push({ x: c.x, y: c.y - 10, r: 58 });
    return out;
  }

  /** Objetos de uma sala (do mapa já carregado), para a trilha achar portas e alvos. */
  private mapObjects(map: string): MapObject[] | undefined {
    const data = this.cache.tilemap.get(map)?.data as { layers: { name: string; objects?: MapObject[] }[] } | undefined;
    return data?.layers.find((l) => l.name === 'objetos')?.objects;
  }

  /** Modo Kids: recalcula para onde a trilha aponta e dá uma dica se a criança ficar parada. */
  private updateGuide(time: number): void {
    const s = session.state;
    if (time >= this.guideAt) {
      this.guideAt = time + 400;
      const target = guideTarget(s, db);
      // na sala do alvo, segue o objeto de verdade (pessoas e sombrinhas andam)
      const live = target?.map === this.mapKey
        ? [...this.things, ...this.creatures].find((t) => t.thingName === target.alvo && t.isPresent && t.visible)
        : undefined;
      this.guidePoint = live ? { x: live.x, y: live.y - 6 }
        : target && nextGuidePoint(this.mapKey, target, s, (m) => this.mapObjects(m));
    }
    this.guide!.update({ x: this.player.x, y: this.player.y - 6 }, this.guidePoint, time);

    const objective = currentObjective(s, db)?.objective ?? '';
    if (objective !== this.hintObjective) {
      this.hintObjective = objective;
      this.hintSince = time;
    } else if (objective && time - this.hintSince > KIDS_HINT_MS && !this.challenge) {
      this.hintSince = time;
      this.bark.say(`Psiu! ${objective} Siga as estrelinhas!`, true);
    }
  }

  update(time: number, delta: number): void {
    const s = session.state;
    s.playTimeMs += delta;
    if (this.transitioning) return;

    if (this.dialogue) {
      this.guide?.hide();
      this.dialogueBox.update(delta);
      if (!this.dialogueBox.typing) this.talkingTo?.setTalking(false);
      const nav = this.controls.navPressed();
      if (nav) this.dialogueBox.moveSelection(nav);
      if (this.controls.actionPressed()) {
        audio.sfx('blip');
        this.advanceDialogue();
      }
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
    if (this.controls.mapPressed()) return this.openMap();
    if (this.controls.spellCyclePressed()) this.changeSpell();

    const dir = time < this.arriveUntil ? new Phaser.Math.Vector2() : this.controls.direction();
    if (time >= this.knockUntil) this.player.move(dir);
    else this.player.setDepth(this.player.y);
    if (dir.lengthSq() > 0) {
      audio.sfx('passo');
      this.stillSince = time;
    } else if (time - this.stillSince > 25000) {
      // parado um tempinho: o aprendiz pensa alto
      this.stillSince = time;
      this.bark.say(pickLine('parado'));
    }
    this.bark.update(this.player.x, this.player.y - this.player.height - 2);
    if (this.guide) this.updateGuide(time);
    this.puzzles.update(dir, delta);
    for (const c of this.creatures) c.think(this.player, time, delta);
    this.updateExtras(time, delta);
    if (this.transitioning) return;
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

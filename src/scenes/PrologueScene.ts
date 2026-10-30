import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { AssetRegistry } from '../core/AssetRegistry';
import { session } from '../core/session';
import { audio } from '../audio/Audio';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { addLogo } from '../ui/logo';
import { noGenero, playerSheet } from '../core/aparencia';
import { flash, shake } from '../ui/fx';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;
/** Topo da camada de perto (150 px, calçada em 122); fica acima da legenda. */
const NEAR_Y = H - 150 - 20;
/** Onde os pés pisam na rua. */
const STREET_Y = NEAR_Y + 122;
const NEAR_W = 1640;
const LOT_X = 1280;
/** Folha do aprendiz (menino ou menina, conforme a escolha no Novo jogo). */
const KID = (): string => playerSheet('player.aprendiz');

interface PrologueData {
  /** De onde o prólogo foi aberto: no "Novo jogo" ele termina no castelo; no título, volta ao título. */
  then?: 'jogo' | 'titulo';
}

/**
 * Prólogo animado [FICÇÃO]: a lenda do castelo escondido em São Paulo, o aprendiz no
 * quarto, a Estrela Perdida que bate na janela, a caminhada pela cidade, o castelo
 * aparecendo no terreno vazio, a Morgana na torre e o Trinco abrindo o portão.
 * Tudo com tweens sobre cenários em pixel art; dá para pular a qualquer momento.
 */
export class PrologueScene extends Phaser.Scene {
  private then: 'jogo' | 'titulo' = 'jogo';
  private done = false;
  private stage!: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;
  private captionBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Prologue');
  }

  init(data: PrologueData): void {
    this.then = data.then ?? 'jogo';
    this.done = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0918');
    this.makeTextures();
    this.stage = this.add.container(0, 0);

    this.captionBg = this.add.rectangle(0, H - 34, W, 34, 0x0a0918, 0.82).setOrigin(0).setDepth(900).setAlpha(0);
    this.caption = this.add.text(W / 2, H - 17, '', textStyle(10, COLORS.text, { align: 'center', wordWrap: { width: W - 60 } }))
      .setOrigin(0.5).setResolution(TEXT_RES).setDepth(901);
    const skip = this.add.text(W - 8, 8, 'Pular ▸▸', textStyle(9, COLORS.muted, { backgroundColor: '#18142acc', padding: { x: 5, y: 3 } }))
      .setOrigin(1, 0).setResolution(TEXT_RES).setDepth(950).setInteractive({ useHandCursor: true });
    skip.on('pointerdown', () => this.finish());
    this.input.keyboard?.on('keydown-ESC', () => this.finish());
    this.input.keyboard?.on('keydown-ENTER', () => this.finish());

    audio.music('titulo', true);
    this.cameras.main.fadeIn(800, 10, 9, 24);
    void this.play();
  }

  // ---------------------------------------------------------------- roteiro

  private async play(): Promise<void> {
    await this.legend();
    await this.bedroom();
    await this.city();
    await this.titleCard();
    this.finish();
  }

  /** 1. A lenda: o castelo escondido, protegido por bruxos antigos. */
  private async legend(): Promise<void> {
    const s = this.stage;
    s.add(this.add.image(W / 2, 0, 'prologo.ceu').setOrigin(0.5, 0));
    // o castelo (com o dragão no topo) um pouco menor, para caber inteiro na tela
    const castle = this.add.image(W / 2, H - 40, 'prologo.castelo').setOrigin(0.5, 1).setScale(0.9).setTint(0x3a3270).setAlpha(0);
    const ground = this.add.rectangle(0, H - 40, W, 40, 0x141026).setOrigin(0);
    s.add([castle, ground]);
    const wizards = [[W / 2 - 170, H - 46], [W / 2 + 170, H - 46], [W / 2 + 150, 92]].map(([x, y]) =>
      this.add.image(x, y, 'prologo.bruxo').setOrigin(0.5, 1).setScale(2).setAlpha(0));
    s.add(wizards);
    this.tweens.add({ targets: castle, alpha: 0.85, duration: 2500 });
    this.tweens.add({ targets: wizards, alpha: 1, duration: 1200, delay: 2600 });
    const sparkles = wizards.map((w) => this.add.particles(0, 0, 'prologo.brilho', {
      x: w.x, y: w.y - 28, lifespan: 1400, speed: { min: 10, max: 30 }, alpha: { start: 1, end: 0 },
      moveToX: W / 2, moveToY: H - 120, frequency: 140, emitting: false,
    }));
    s.add(sparkles);
    await this.say('Dizem que, escondido em São Paulo, sempre existiu um castelo.', 4800);
    sparkles.forEach((p) => p.start());
    await this.say('Bruxos antigos o protegiam com um escudo de magia, esperando o momento certo de revelá-lo.', 5600);
    await this.fadeTo(900);
  }

  /** 2. O quarto: o aprendiz desenhando estrelas e a Estrela Perdida batendo na janela. */
  private async bedroom(): Promise<void> {
    const s = this.stage;
    const ox = (W - 640) / 2;
    s.add(this.add.image(ox, 0, 'prologo.quarto').setOrigin(0));
    const kid = this.add.sprite(ox + 320, 198, KID()).setOrigin(0.5, 1).setScale(2);
    kid.play(AssetRegistry.animKey(KID(), 'idle-up'));
    s.add(kid);
    const star = this.add.image(ox + 262, 46, 'prologo.estrela').setAlpha(0);
    const glow = this.add.image(star.x, star.y, 'prologo.halo').setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    s.add([glow, star]);
    const follow = () => glow.setPosition(star.x, star.y).setAlpha(star.alpha * 0.8);
    this.events.on('update', follow);
    this.cameras.main.fadeIn(900, 10, 9, 24);

    await this.say('Numa noite qualquer, num apartamento qualquer, vivia alguém que ainda não sabia que era mágico.', 5200);
    await this.say('(Pequeno spoiler: esse alguém é você.)', 2800);
    // a estrela desce do céu e para na janela
    this.tweens.add({ targets: star, alpha: 1, duration: 500 });
    await this.tween({ targets: star, x: ox + 330, y: 90, duration: 1600, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 2; i++) {
      audio.sfx('blip');
      await this.tween({ targets: star, y: 96, duration: 120, yoyo: true });
    }
    kid.play(AssetRegistry.animKey(KID(), 'idle-down'));
    const bang = this.add.text(kid.x, kid.y - 52, '!', textStyle(16, COLORS.gold, { stroke: '#18142a', strokeThickness: 3 }))
      .setOrigin(0.5, 1).setResolution(TEXT_RES);
    s.add(bang);
    audio.sfx('espanto');
    this.tweens.add({ targets: bang, y: bang.y - 6, duration: 160, yoyo: true });
    await this.say('Até que uma estrela perdida bateu na janela.', 3200);
    bang.destroy();
    // ela entra, dá uma volta em volta do aprendiz e sai pela direita
    audio.sfx('revelar');
    await this.tween({ targets: star, x: kid.x + 40, y: kid.y - 40, duration: 900, ease: 'Sine.easeInOut' });
    await this.tween({ targets: star, x: kid.x - 40, y: kid.y - 60, duration: 700, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: star, x: ox + 700, y: kid.y - 20, duration: 2600, ease: 'Sine.easeIn' });
    // o aprendiz desce para a frente do quarto antes de ir para a direita, para passar na frente da cama, e não por dentro dela
    kid.play(AssetRegistry.animKey(KID(), 'walk-down'));
    this.tweens.add({
      targets: kid, y: 230, duration: 600,
      onComplete: () => {
        kid.play(AssetRegistry.animKey(KID(), 'walk-side')).setFlipX(false);
        this.tweens.add({ targets: kid, x: ox + 680, duration: 2800 });
      },
    });
    await this.say('E ela queria ser seguida.', 3000);
    this.events.off('update', follow);
    await this.fadeTo(800);
  }

  /** 3 a 6. A cidade, o terreno vazio, o castelo surgindo, a Morgana na torre e o Trinco no portão. */
  private async city(): Promise<void> {
    const s = this.stage;
    const scroll = { x: 0 };
    s.add(this.add.image(W / 2, 0, 'prologo.ceu').setOrigin(0.5, 0));
    const far = this.add.tileSprite(0, NEAR_Y - 70, W, 110, 'prologo.cidade-longe').setOrigin(0);
    const asphalt = this.add.rectangle(0, NEAR_Y + 150, W, H - NEAR_Y - 150, 0x221e2e).setOrigin(0);
    const castle = this.add.image(0, STREET_Y - 2, 'prologo.castelo').setOrigin(0.5, 1).setAlpha(0);
    const near = this.add.image(0, NEAR_Y, 'prologo.cidade-perto').setOrigin(0);
    const kid = this.add.sprite(W * 0.35, STREET_Y + 3, KID()).setOrigin(0.5, 1);
    const star = this.add.image(W * 0.55, STREET_Y - 30, 'prologo.estrela');
    const glow = this.add.image(star.x, star.y, 'prologo.halo').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
    const trail = this.add.particles(0, 0, 'prologo.brilho', {
      follow: star, lifespan: 700, speedX: { min: -40, max: -10 }, speedY: { min: -8, max: 8 }, alpha: { start: 0.9, end: 0 }, frequency: 60,
    });
    s.add([far, castle, near, asphalt, trail, kid, glow, star]);
    const place = () => {
      near.x = -Math.round(scroll.x);
      far.tilePositionX = Math.round(scroll.x * 0.35);
      castle.x = near.x + LOT_X + 180;
      glow.setPosition(star.x, star.y);
    };
    place();
    this.events.on('update', place);
    this.tweens.add({ targets: star, y: star.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    kid.play(AssetRegistry.animKey(KID(), 'walk-side'));
    this.cameras.main.fadeIn(900, 10, 9, 24);

    // caminhada: a cidade passa até o terreno vazio aparecer
    const endScroll = NEAR_W - W;
    this.tweens.add({ targets: scroll, x: endScroll, duration: 11000, ease: 'Sine.easeInOut' });
    await this.say('Ruas, esquinas, postes piscando... e a estrela sem parar nem um segundo.', 5200);
    await this.say('Até um terreno vazio, desses em que ninguém nunca repara.', 5600);
    kid.play(AssetRegistry.animKey(KID(), 'idle-side'));
    this.hideCaption();

    // a revelação
    const lotCenter = castle.x;
    this.tweens.killTweensOf(star);
    audio.sfx('levitar');
    await this.tween({ targets: star, x: lotCenter, y: STREET_Y - 120, duration: 1400, ease: 'Sine.easeInOut' });
    await this.tween({ targets: star, angle: 720, scale: 1.6, duration: 900 });
    audio.sfx('fogos');
    const burst = this.add.particles(lotCenter, STREET_Y - 120, 'prologo.brilho', {
      speed: { min: 40, max: 140 }, lifespan: 1400, alpha: { start: 1, end: 0 }, quantity: 60, emitting: false,
    });
    s.add(burst);
    burst.explode(60);
    flash(this.cameras.main, 600, 250, 240, 200);
    shake(this.cameras.main, 900, 0.006);
    star.setVisible(false);
    glow.setVisible(false);
    trail.stop();
    audio.music('castelo');
    castle.setAlpha(0).setScale(1, 0.92);
    this.tweens.add({ targets: castle, alpha: 1, scaleY: 1, duration: 1600, ease: 'Back.easeOut' });
    await this.say('E então, como se sempre tivesse estado ali... o castelo apareceu.', 4600);
    await this.say('Os bruxos antigos tinham escolhido o momento certo. E o aprendiz certo.', 4600);

    // a torre: alguém observa
    this.events.off('update', place);
    // o castelo tem 240x210 com origem embaixo no meio: (left, top) é o canto de cima
    const left = castle.x - 120;
    const top = castle.y - 210;
    const towerX = left + 119;
    const towerY = top + 62;
    audio.music('quadros');
    await this.zoomStage(2, towerX, towerY, 1600);
    const soot = this.add.particles(towerX, towerY + 4, 'prologo.fuligem', {
      speed: { min: 4, max: 16 }, lifespan: 1800, alpha: { start: 0.7, end: 0 }, scale: { start: 1, end: 2 }, frequency: 80,
    });
    const morgana = this.add.sprite(towerX, towerY + 10, 'npc.morgana').setOrigin(0.5, 1).setAlpha(0);
    morgana.play(AssetRegistry.animKey('npc.morgana', 'idle'));
    s.add([soot, morgana]);
    audio.sfx('espanto');
    this.tweens.add({ targets: morgana, alpha: 1, duration: 900 });
    // as janelas do castelo vão apagando
    const dark = [52, 70, 88, 146, 164, 182].flatMap((wx) => [110, 140].map((wy) => [wx, wy]))
      .map(([wx, wy]) => this.add.rectangle(left + wx, top + wy, 4, 7, 0x282440).setOrigin(0).setAlpha(0));
    s.add(dark);
    dark.forEach((d, i) => this.tweens.add({ targets: d, alpha: 1, duration: 200, delay: 600 + i * 220 }));
    await this.say('Mas, no alto da torre, alguém também esperava por aquela noite...', 5000);
    this.tweens.add({ targets: morgana, alpha: 0, duration: 700 });
    soot.stop();
    await this.wait(600);

    // o portão e o Trinco
    audio.music('castelo');
    await this.zoomStage(1, W / 2, H / 2, 1400);
    this.hideCaption();
    kid.play(AssetRegistry.animKey(KID(), 'walk-side'));
    const gateX = left + 120;
    await this.tween({ targets: kid, x: gateX - 26, duration: Math.max(600, (gateX - 26 - kid.x) * 22) });
    kid.play(AssetRegistry.animKey(KID(), 'idle-side'));
    const door = this.add.rectangle(left + 108, top + 178, 24, 26, 0xf6d27a).setOrigin(0).setAlpha(0);
    const trinco = this.add.sprite(gateX + 4, top + 204, 'npc.trinco').setOrigin(0.5, 1).setAlpha(0);
    trinco.play(AssetRegistry.animKey('npc.trinco', 'talk'));
    s.addAt(door, s.getIndex(near));
    s.add(trinco);
    audio.sfx('porta');
    await this.tween({ targets: door, alpha: 0.9, duration: 600 });
    this.tweens.add({ targets: trinco, alpha: 1, x: gateX + 10, duration: 400 });
    const bubble = this.add.text(gateX + 10, STREET_Y - 30, noGenero('Opa, opa! Um aprendiz novo?'), textStyle(8, '#18142a', {
      backgroundColor: '#f0e8f8', padding: { left: 4, right: 4, top: 2, bottom: 2 },
    })).setOrigin(0.5, 1).setResolution(TEXT_RES);
    s.add(bubble);
    audio.sfx('blip');
    await this.say('Bem-vindo ao Castelo Magia & Bruxaria. A sua primeira noite vai ser... inesquecível.', 5000);
    bubble.destroy();
    trinco.play(AssetRegistry.animKey('npc.trinco', 'idle'));
    kid.play(AssetRegistry.animKey(KID(), 'walk-side'));
    this.tweens.add({ targets: kid, x: gateX, alpha: 0, duration: 900 });
    this.tweens.add({ targets: trinco, alpha: 0, duration: 900, delay: 300 });
    await this.fadeTo(1100);
  }

  /** 7. Título. */
  private async titleCard(): Promise<void> {
    const s = this.stage;
    s.add(this.add.image(W / 2, 0, 'prologo.ceu').setOrigin(0.5, 0).setAlpha(0.6));
    const logo = addLogo(this, W / 2, H / 2 - 48).setAlpha(0);
    const sparkle = this.add.particles(W / 2, H / 2, 'prologo.brilho', {
      x: { min: -120, max: 120 }, y: { min: -20, max: 20 }, lifespan: 1200, speedY: { min: -20, max: -5 }, alpha: { start: 1, end: 0 }, frequency: 50,
    });
    s.add([sparkle, logo]);
    this.cameras.main.fadeIn(700, 10, 9, 24);
    audio.sfx('nivel');
    await this.tween({ targets: logo, alpha: 1, duration: 1200, delay: 200 });
    await this.wait(2600);
    await this.fadeTo(900);
  }

  // ---------------------------------------------------------------- ferramentas

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  /** Mostra uma legenda (com efeito de máquina de escrever) e espera o tempo dela. */
  private async say(text: string, ms: number): Promise<void> {
    if (this.done) return;
    this.captionBg.setAlpha(1);
    this.caption.setText('');
    text = noGenero(text);
    const per = Math.min(28, (ms * 0.45) / text.length);
    for (let i = 1; i <= text.length; i++) {
      this.time.delayedCall(i * per, () => this.caption.setText(text.slice(0, i)));
    }
    await this.wait(ms);
  }

  private hideCaption(): void {
    this.caption.setText('');
    this.captionBg.setAlpha(0);
  }

  /** Apaga a tela e limpa o palco para a próxima cena. */
  private async fadeTo(ms: number): Promise<void> {
    this.hideCaption();
    this.cameras.main.fadeOut(ms, 10, 9, 24);
    await this.wait(ms + 50);
    this.tweens.killAll();
    this.stage.removeAll(true);
    this.stage.setScale(1).setPosition(0, 0);
  }

  /** Aproxima o palco (zoom) mantendo o ponto (x, y) no centro da tela. */
  private zoomStage(scale: number, x: number, y: number, ms: number): Promise<void> {
    return this.tween({
      targets: this.stage, scale, x: W / 2 - x * scale, y: H / 2 - y * scale, duration: ms, ease: 'Sine.easeInOut',
    });
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.cameras.main.fadeOut(400, 10, 9, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.then === 'titulo') this.scene.start('Title');
      else this.scene.start('World', { map: session.state.map, spawn: session.state.spawn });
    });
  }

  /** Texturas pequenas desenhadas na hora: estrela, halo, brilho, fuligem e os bruxos antigos. */
  private makeTextures(): void {
    if (this.textures.exists('prologo.estrela')) return;
    const g = this.make.graphics({}, false);
    g.fillStyle(0xfad65c).fillPoints(starPoints(6, 6, 6, 2.6), true);
    g.fillStyle(0xfff4c0).fillRect(5, 5, 2, 2);
    g.generateTexture('prologo.estrela', 12, 12).clear();
    for (let r = 14; r > 0; r -= 2) g.fillStyle(0xfad65c, 0.06).fillCircle(14, 14, r);
    g.generateTexture('prologo.halo', 28, 28).clear();
    g.fillStyle(0xffffff).fillRect(1, 0, 1, 3).fillRect(0, 1, 3, 1);
    g.generateTexture('prologo.brilho', 3, 3).clear();
    g.fillStyle(0x5a5470, 0.8).fillCircle(4, 4, 4);
    g.generateTexture('prologo.fuligem', 8, 8).clear();
    // bruxo antigo encapuzado (10x18), de costas para a cidade, olhos brilhando
    g.fillStyle(0x2a2148).fillTriangle(5, 0, 0, 18, 10, 18);
    g.fillStyle(0x3d3166).fillTriangle(5, 2, 2, 18, 5, 18);
    g.fillStyle(0x9ab4ff).fillRect(3, 6, 1, 1).fillRect(6, 6, 1, 1);
    g.generateTexture('prologo.bruxo', 10, 18);
    g.destroy();
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

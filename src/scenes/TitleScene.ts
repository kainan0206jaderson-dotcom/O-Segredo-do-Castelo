import Phaser from 'phaser';
import { session } from '../core/session';
import { InputManager } from '../input/InputManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game';
import { COLORS, TEXT_RES, textStyle } from '../ui/theme';
import { audio } from '../audio/Audio';
import { addLogo } from '../ui/logo';
import { AssetRegistry } from '../core/AssetRegistry';
import { limparNome, nomePadrao, type Aparencia } from '../core/aparencia';
import { NameField } from '../ui/NameField';

/** Tela inicial: Continuar (se houver jogo salvo) ou Novo jogo. */
export class TitleScene extends Phaser.Scene {
  private options: { label: string; run: () => void }[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private controls!: InputManager;
  private confirmingNew = false;
  private leaving = false;
  /** Escolha do aprendiz (menino ou menina) aberta no Novo jogo. */
  private chooser?: { look: Aparencia; parts: Phaser.GameObjects.GameObject[]; labels: Phaser.GameObjects.Text[]; kids: Phaser.GameObjects.Sprite[]; nome: NameField };
  private footer!: Phaser.GameObjects.Text;
  /** Gesto/botão "voltar" do celular: cada tela aberta (escolha, Visual) empilha um passo no histórico. */
  private readonly onPopState = () => this.stepBack();

  constructor() {
    super('Title');
  }

  create(): void {
    this.confirmingNew = false;
    this.leaving = false;
    this.chooser = undefined;
    this.events.off(Phaser.Scenes.Events.RESUME);
    this.events.on(Phaser.Scenes.Events.RESUME, (_s: Phaser.Scene, data?: { from?: string }) => {
      // depois do Visual, a escolha do modo (Kids ou Normal); depois dela, o prólogo
      if (data?.from === 'visual') {
        history.pushState({ tela: 'modo' }, '');
        this.scene.launch('Modo');
        this.scene.pause();
      }
      if (data?.from === 'modo') this.toPrologue('jogo');
    });
    window.addEventListener('popstate', this.onPopState);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('popstate', this.onPopState));
    // céu do prólogo descido, para a lua ficar ao lado do menu e não atrás do letreiro;
    // em cima, a cor do topo do céu com estrelinhas piscando
    this.cameras.main.setBackgroundColor('#0b0a20');
    this.add.image(GAME_WIDTH / 2, 96, 'prologo.ceu').setOrigin(0.5, 0);
    for (let i = 0; i < 46; i++) {
      const star = this.add.rectangle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, 100), 1, 1, 0xe6e6ff, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({ targets: star, alpha: 0.1, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }
    addLogo(this, GAME_WIDTH / 2, 14);

    const hasSave = session.hasSave();
    this.options = [
      ...(hasSave ? [{ label: 'Continuar', run: () => this.continueGame() }] : []),
      { label: 'Novo jogo', run: () => this.newGame(hasSave) },
      { label: 'Prólogo', run: () => this.watchPrologue() },
      { label: 'Opções', run: () => this.openOptions() },
    ];
    this.texts = this.options.map((o, i) =>
      this.add.text(GAME_WIDTH / 2, 128 + i * 24, o.label, textStyle(13, COLORS.text)).setOrigin(0.5).setResolution(TEXT_RES)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.options[i].run()),
    );
    this.footer = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, 'versão 1.0 · toque ou aperte uma tecla para ligar o som', textStyle(8, COLORS.muted)).setOrigin(0.5).setResolution(TEXT_RES);
    this.controls = new InputManager(this);
    this.select(0);
    audio.music('titulo');
  }

  private watchPrologue(): void {
    audio.sfx('confirmar');
    this.toPrologue('titulo');
  }

  private openOptions(): void {
    audio.sfx('confirmar');
    this.scene.launch('Options', { back: 'Title' });
    this.scene.pause();
  }

  private select(i: number): void {
    if (i !== this.selected) audio.sfx('blip');
    this.selected = i;
    this.texts.forEach((t, j) => {
      t.setColor(j === i ? COLORS.gold : COLORS.text);
      t.setText(`${j === i ? '▸ ' : ''}${this.options[j].label}${j === i ? ' ◂' : ''}`);
    });
  }

  private continueGame(): void {
    audio.sfx('confirmar');
    if (!session.continue()) return this.newGame(false);
    this.scene.start('World', { map: session.state.map, spawn: session.state.spawn });
  }

  private newGame(overwrite: boolean): void {
    if (overwrite && !this.confirmingNew) {
      this.confirmingNew = true;
      audio.sfx('erro');
      const t = this.texts[this.options.findIndex((o) => o.label === 'Novo jogo')];
      t.setText('Apagar o jogo salvo? Toque de novo');
      return;
    }
    audio.sfx('confirmar');
    this.openChooser();
  }

  /** "Quem é você?": aprendiz menino ou menina, lado a lado, e o nome logo embaixo. */
  private openChooser(): void {
    this.texts.forEach((t) => t.setVisible(false));
    this.footer.setVisible(false);
    history.pushState({ tela: 'escolha' }, '');
    const looks: Aparencia[] = ['menino', 'menina'];
    const title = this.add.text(GAME_WIDTH / 2, 104, 'Quem é você?', textStyle(13, COLORS.text)).setOrigin(0.5).setResolution(TEXT_RES);
    const parts: Phaser.GameObjects.GameObject[] = [title];
    const kids: Phaser.GameObjects.Sprite[] = [];
    const labels: Phaser.GameObjects.Text[] = [];
    looks.forEach((look, i) => {
      const x = GAME_WIDTH / 2 + (i === 0 ? -64 : 64);
      const sheet = look === 'menina' ? 'player.aprendiza' : 'player.aprendiz';
      const kid = this.add.sprite(x, 190, sheet).setOrigin(0.5, 1).setScale(3)
        .setInteractive({ useHandCursor: true })
        // tocar só seleciona (o outro fica apagado); para seguir, o botão OK
        .on('pointerdown', () => this.pickLook(look));
      kid.play(AssetRegistry.animKey(sheet, 'idle-down'));
      const label = this.add.text(x, 194, '', textStyle(10, COLORS.text)).setOrigin(0.5, 0).setResolution(TEXT_RES)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickLook(look));
      kids.push(kid);
      labels.push(label);
      parts.push(kid, label);
    });
    const nomeLabel = this.add.text(GAME_WIDTH / 2 - 64, 224, 'Seu nome:', textStyle(10, COLORS.muted)).setOrigin(1, 0.5).setResolution(TEXT_RES);
    parts.push(nomeLabel);
    const nome = new NameField(this, GAME_WIDTH / 2 + 4, 224, 120, nomePadrao('menino'), () => this.confirmLook());
    const button = (x: number, text: string, run: () => void) => this.add.text(x, 250, text, textStyle(12, COLORS.text, {
      backgroundColor: '#2a2140', padding: { left: 10, right: 10, top: 4, bottom: 4 },
    })).setOrigin(0.5).setResolution(TEXT_RES).setInteractive({ useHandCursor: true }).on('pointerdown', run);
    const back = button(GAME_WIDTH / 2 - 70, '◂ Voltar', () => this.goBack());
    const ok = button(GAME_WIDTH / 2 + 70, 'OK ▸', () => this.confirmLook()).setColor(COLORS.gold);
    parts.push(back, ok);
    this.chooser = { look: 'menino', parts, labels, kids, nome };
    this.pickLook('menino', true);
  }

  /** Voltar pela tela (botão, ESC): passa pelo histórico, como o gesto de voltar do celular. */
  private goBack(): void {
    audio.sfx('blip');
    history.back();
  }

  /** Um passo para trás: do modo para o Visual, do Visual para a escolha, da escolha para o menu. */
  private stepBack(): void {
    if (this.leaving) return;
    if (this.scene.isActive('Modo')) {
      this.scene.stop('Modo');
      this.scene.launch('Visual', { back: 'Title' });
      return;
    }
    if (this.scene.isActive('Visual') || this.scene.isPaused('Visual')) {
      this.scene.stop('Visual');
      this.scene.resume();
      this.chooser?.nome.setVisible(true);
      return;
    }
    if (!this.chooser) return;
    this.chooser.parts.forEach((o) => o.destroy());
    this.chooser.nome.destroy();
    this.chooser = undefined;
    this.texts.forEach((t) => t.setVisible(true));
    this.footer.setVisible(true);
    this.confirmingNew = false;
    this.select(this.selected);
  }

  private pickLook(look: Aparencia, silent = false): void {
    const c = this.chooser;
    if (!c) return;
    if (look !== c.look && !silent) audio.sfx('blip');
    // o nome sugerido acompanha a aparência, a não ser que o jogador já tenha digitado outro
    const typed = c.nome.value.trim();
    if (!typed || typed === nomePadrao(c.look)) c.nome.el.value = nomePadrao(look);
    c.look = look;
    const i = look === 'menina' ? 1 : 0;
    c.labels.forEach((t, j) => t.setColor(j === i ? COLORS.gold : COLORS.muted).setText(`${j === i ? '▸ ' : ''}${j === 1 ? 'Menina' : 'Menino'}${j === i ? ' ◂' : ''}`));
    c.kids.forEach((k, j) => k.setAlpha(j === i ? 1 : 0.55));
  }

  private confirmLook(): void {
    const c = this.chooser;
    if (!c || this.leaving) return;
    audio.sfx('confirmar');
    // o jogo novo só é salvo no "Pronto" do Visual; voltando antes, o save antigo continua
    session.startNew(false);
    session.state.aparencia = c.look;
    // o nome padrão não é guardado: assim ele acompanha se a aparência mudar nas Opções
    const nome = limparNome(c.nome.value);
    session.state.nome = nome && nome !== nomePadrao(c.look) ? nome : undefined;
    c.nome.setVisible(false);
    history.pushState({ tela: 'visual' }, '');
    // depois de escolher, a tela de Visual (pele, cabelo, roupa); ao fechar, começa o prólogo
    this.scene.launch('Visual', { back: 'Title' });
    this.scene.pause();
  }

  /** Escurece a tela inicial antes do prólogo, para ele começar num fade in limpo. */
  private toPrologue(then: 'jogo' | 'titulo'): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 10, 9, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Prologue', { then }));
  }

  update(): void {
    if (this.leaving) return;
    if (this.chooser) {
      const dir = this.controls.navPressed() || this.controls.navHPressed();
      if (dir) this.pickLook(this.chooser.look === 'menino' ? 'menina' : 'menino');
      if (this.controls.actionPressed()) this.confirmLook();
      if (this.controls.menuPressed()) this.goBack();
      return;
    }
    const nav = this.controls.navPressed();
    if (nav) {
      this.confirmingNew = false;
      this.select(Phaser.Math.Wrap(this.selected + nav, 0, this.options.length));
    }
    if (this.controls.actionPressed()) this.options[this.selected].run();
  }
}

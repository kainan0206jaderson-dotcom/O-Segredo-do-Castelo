import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_ZOOM } from './config/game';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { GrimoireScene } from './scenes/GrimoireScene';
import { CauldronScene } from './scenes/CauldronScene';
import { TutorialScene } from './scenes/TutorialScene';
import { ActCardScene } from './scenes/ActCardScene';
import { EndingScene } from './scenes/EndingScene';
import { OptionsScene } from './scenes/OptionsScene';
import { MapScene } from './scenes/MapScene';
import { PrologueScene } from './scenes/PrologueScene';
import { setupMobileScreen } from './ui/mobile';
import { session } from './core/session';
import { audio } from './audio/Audio';
import { initVisual } from './core/visual';
import { VisualScene } from './scenes/VisualScene';

// O canvas tem RENDER_ZOOM pixels reais por pixel de jogo. Toda câmera nova já nasce
// ampliada e presa no canto, então cenas e HUD continuam usando coordenadas de jogo.
// (a câmera do mundo troca para o centro, porque segue o aprendiz; ver WorldScene)
const addCamera = Phaser.Cameras.Scene2D.CameraManager.prototype.add;
Phaser.Cameras.Scene2D.CameraManager.prototype.add = function (this: Phaser.Cameras.Scene2D.CameraManager, ...args: Parameters<typeof addCamera>) {
  const cam = addCamera.apply(this, args);
  if (args.length === 0) cam.setOrigin(0).setZoom(RENDER_ZOOM);
  return cam;
};

// texto desenhado na resolução real da tela (letra de pixel, mas sem borrão);
// o Phaser refaz a textura do texto a cada mudança, então resolução e filtro vão junto
const TEXT_MIN_RES = RENDER_ZOOM + 1;
const updateText = Phaser.GameObjects.Text.prototype.updateText;
Phaser.GameObjects.Text.prototype.updateText = function (this: Phaser.GameObjects.Text) {
  if (this.style.resolution < TEXT_MIN_RES) this.style.resolution = TEXT_MIN_RES;
  updateText.call(this);
  this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return this;
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH * RENDER_ZOOM,
  height: GAME_HEIGHT * RENDER_ZOOM,
  backgroundColor: '#18142a',
  pixelArt: true,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, GrimoireScene, CauldronScene, TutorialScene, ActCardScene, EndingScene, OptionsScene, MapScene, PrologueScene, VisualScene],
});

initVisual(game);
setupMobileScreen();
audio.install();

// atalho de depuração no console do navegador
Object.assign(window as unknown as object, { game, session, audio });

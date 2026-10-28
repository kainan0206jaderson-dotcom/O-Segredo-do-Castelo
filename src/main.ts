import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/game';
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
import { setupMobileScreen } from './ui/mobile';
import { session } from './core/session';
import { audio } from './audio/Audio';

// texto é desenhado em alta resolução e reduzido: filtro suave evita letras "mastigadas"
// (o Phaser refaz a textura do texto a cada mudança, então o filtro vai junto)
const updateText = Phaser.GameObjects.Text.prototype.updateText;
Phaser.GameObjects.Text.prototype.updateText = function (this: Phaser.GameObjects.Text) {
  updateText.call(this);
  this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return this;
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#18142a',
  pixelArt: true,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, GrimoireScene, CauldronScene, TutorialScene, ActCardScene, EndingScene, OptionsScene, MapScene],
});

setupMobileScreen();
audio.install();

// atalho de depuração no console do navegador
Object.assign(window as unknown as object, { game, session, audio });

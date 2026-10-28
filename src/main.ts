import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/game';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { GrimoireScene } from './scenes/GrimoireScene';
import { CauldronScene } from './scenes/CauldronScene';
import { setupMobileScreen } from './ui/mobile';

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
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, GrimoireScene, CauldronScene],
});

setupMobileScreen();

// atalho de depuração no console do navegador
(window as unknown as { game: Phaser.Game }).game = game;

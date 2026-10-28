import type Phaser from 'phaser';
import { settings } from '../core/settings';

/** Tremor de tela, respeitando a opção "tela tremendo" (acessibilidade). */
export function shake(cam: Phaser.Cameras.Scene2D.Camera, duration: number, intensity: number): void {
  if (settings.tremor) cam.shake(duration, intensity);
}

/** Clarão de tela; com a opção desligada vira um clarão bem fraquinho, sem piscar. */
export function flash(cam: Phaser.Cameras.Scene2D.Camera, duration: number, r: number, g: number, b: number): void {
  if (settings.tremor) cam.flash(duration, r, g, b);
  else cam.fadeFrom(Math.min(duration, 200), r, g, b, false);
}

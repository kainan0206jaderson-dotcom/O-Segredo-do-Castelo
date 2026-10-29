import Phaser from 'phaser';
import falasJson from '../../content/falas.json';
import { TEXT_RES, textStyle } from './theme';
import { noGenero } from '../core/aparencia';

const falas = falasJson as unknown as Record<string, string[] | string>;

/** Escolhe uma fala para o momento (a específica primeiro, depois a geral). */
export function pickLine(...keys: string[]): string | undefined {
  for (const k of keys) {
    const list = falas[k];
    if (Array.isArray(list) && list.length) return list[Math.floor(Math.random() * list.length)];
  }
  return undefined;
}

/** Balãozinho de fala que aparece em cima do aprendiz por alguns segundos. */
export class Bark {
  private text: Phaser.GameObjects.Text;
  private until = 0;
  private quietUntil = 0;

  constructor(private scene: Phaser.Scene) {
    this.text = scene.add.text(0, 0, '', textStyle(8, '#18142a', {
      backgroundColor: '#f0e8f8', padding: { left: 4, right: 4, top: 2, bottom: 2 }, align: 'center', wordWrap: { width: 130 },
    })).setOrigin(0.5, 1).setResolution(TEXT_RES).setDepth(1900).setVisible(false);
  }

  /** important: passa por cima de uma fala que está aparecendo (nível, feitiço novo). */
  say(line: string | undefined, important = false): void {
    const now = this.scene.time.now;
    if (!line || (!important && now < this.quietUntil)) return;
    line = noGenero(line);
    this.text.setText(line).setVisible(true).setAlpha(1);
    this.until = now + 1600 + line.length * 45;
    this.quietUntil = this.until + 2500;
  }

  hide(): void {
    this.text.setVisible(false);
    this.until = 0;
  }

  update(x: number, y: number): void {
    if (!this.text.visible) return;
    this.text.setPosition(Math.round(x), Math.round(y));
    const left = this.until - this.scene.time.now;
    if (left <= 0) this.text.setVisible(false);
    else if (left < 300) this.text.setAlpha(left / 300);
  }
}

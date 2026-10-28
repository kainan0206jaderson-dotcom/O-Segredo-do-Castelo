import type Phaser from 'phaser';

export const COLORS = {
  panel: 0x18142a,
  panelBorder: 0xfad65c,
  panelInner: 0x3a3150,
  text: '#f0e8f8',
  muted: '#b8acd0',
  gold: '#fad65c',
};

/** Fonte de pixel Pixelify Sans (licença SIL OFL, em public/fonts). */
export const FONT_FAMILY = 'Pixelify Sans';

export function textStyle(size: number, color = COLORS.text, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: `"${FONT_FAMILY}", Georgia, serif`, fontSize: `${size}px`, color, ...extra };
}

/** Resolução extra do texto, para não borrar ao ampliar a tela. */
export const TEXT_RES = 4;

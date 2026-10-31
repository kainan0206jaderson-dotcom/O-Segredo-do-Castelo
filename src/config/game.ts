/**
 * Tela do jogo em "pixels de jogo": a altura é fixa e a largura acompanha o formato
 * da tela (celular comprido ganha mais largura), para ocupar a tela toda sem faixas.
 */
export const GAME_HEIGHT = 270;

function screenShape(): { w: number; h: number; dpr: number } {
  if (typeof window === 'undefined') return { w: 16, h: 9, dpr: 1 };
  // no celular vale a tela inteira (o jogo vai para tela cheia no primeiro toque),
  // e o lado maior é sempre a largura, porque o jogo roda deitado
  const phone = window.matchMedia('(pointer: coarse)').matches;
  const a = phone ? screen.width : window.innerWidth;
  const b = phone ? screen.height : window.innerHeight;
  return { w: Math.max(a, b), h: Math.min(a, b), dpr: window.devicePixelRatio || 1 };
}

const shape = screenShape();

/** Largura em pixels de jogo: de 16:9 (480) até telas bem compridas (640). */
export const GAME_WIDTH = Math.min(640, Math.max(480, Math.round((GAME_HEIGHT * shape.w) / shape.h / 2) * 2));

/**
 * Quantos pixels reais cada pixel de jogo usa no desenho. A arte continua em blocos,
 * mas textos e bordas ganham a nitidez da tela do aparelho. É sempre par (2, 4 ou 6),
 * para o mundo ampliado 1,5x (WORLD_SCALE) cair em pixels inteiros em qualquer aparelho:
 * PC e celular mostram a mesma altura de sala, com o mesmo zoom.
 */
export const RENDER_ZOOM = Math.min(6, Math.max(2, 2 * Math.round((shape.h * shape.dpr) / (GAME_HEIGHT * 2))));

/** Ampliação do mundo em relação ao HUD, igual em todas as salas e aparelhos. */
export const WORLD_SCALE = 1.5;
export const TILE_SIZE = 16;
export const PLAYER_SPEED = 80; // pixels de jogo por segundo
export const MANIFEST_URL = 'assets/manifest.json';
export const ASSET_BASE = 'assets/';
export const START_MAP = 'map.recepcao';
export const START_SPAWN = 'inicio';

import type Phaser from 'phaser';
import cores from './visual-cores.json';
import { session } from './session';
import { AssetRegistry } from './AssetRegistry';
import { assets } from './registry';

/**
 * Visual do aprendiz: cor da pele, do cabelo e uma de duas roupas por personagem.
 * Não existe uma folha para cada combinação: a folha padrão é recolorida na hora com os
 * mapas de cor de visual-cores.json (gerados por tools/art_visual.py).
 */
export interface Visual {
  pele: string;
  cabelo: string;
  /** 0 ou 1: as duas roupas do personagem (o menino e a Estela têm as suas). */
  roupa: number;
}

interface Opcao {
  id: string;
  nome: string;
  cor: string;
  mapa: Record<string, string>;
}

const tabela = cores as unknown as { pele: Opcao[]; cabelo: Opcao[]; roupa: Record<'menino' | 'menina', Opcao[]> };
const PELES = tabela.pele;
const CABELOS = tabela.cabelo;
const ROUPAS = tabela.roupa;

export const VISUAL_PADRAO: Visual = { pele: 'media', cabelo: 'castanho', roupa: 0 };

export function visualAtual(): Visual {
  return { ...VISUAL_PADRAO, ...session.state.visual };
}

export function opcoesPele(): Opcao[] {
  return PELES;
}

export function opcoesCabelo(): Opcao[] {
  return CABELOS;
}

export function opcoesRoupa(): Opcao[] {
  return ROUPAS[session.state.aparencia === 'menina' ? 'menina' : 'menino'];
}

let game: Phaser.Game | undefined;

/** Chamado uma vez no main.ts: a recoloração precisa das texturas e animações do jogo. */
export function initVisual(g: Phaser.Game): void {
  game = g;
}

function hexToRgb(h: string): number {
  return parseInt(h, 16);
}

/**
 * Folha recolorida para o visual atual. sheet já é a folha do personagem certo
 * ("player.aprendiz-coragem" ou "player.aprendiza"). Sem o jogo carregado, ou com o visual
 * padrão, devolve a própria folha.
 */
export function lookSheet(sheet: string): string {
  const v = visualAtual();
  const base = sheet === 'player.aprendiz' || sheet === 'player.aprendiza';
  const roupa = base ? v.roupa : 0;
  if (!game || (v.pele === VISUAL_PADRAO.pele && v.cabelo === VISUAL_PADRAO.cabelo && roupa === 0)) return sheet;
  const key = `${sheet}~${v.pele}.${v.cabelo}.${roupa}`;
  if (game.textures.exists(key)) return key;
  if (!game.textures.exists(sheet)) return sheet;

  const mapa = new Map<number, number>();
  const add = (o?: Opcao) => o && Object.entries(o.mapa).forEach(([from, to]) => mapa.set(hexToRgb(from), hexToRgb(to)));
  add(PELES.find((o) => o.id === v.pele));
  add(CABELOS.find((o) => o.id === v.cabelo));
  if (roupa) add(ROUPAS[sheet.startsWith('player.aprendiza') ? 'menina' : 'menino'][roupa]);

  const src = game.textures.get(sheet).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const to = mapa.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    if (to === undefined) continue;
    d[i] = to >> 16;
    d[i + 1] = (to >> 8) & 255;
    d[i + 2] = to & 255;
  }
  ctx.putImageData(img, 0, 0);
  game.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, { frameWidth: 16, frameHeight: game.textures.get(sheet).get(0).height });
  for (const { sheet: s, key: animKey, def } of assets().animations()) {
    if (s !== sheet) continue;
    const name = animKey.slice(sheet.length + 1);
    game.anims.create({
      key: AssetRegistry.animKey(key, name),
      frames: game.anims.generateFrameNumbers(key, { frames: def.frames }),
      frameRate: def.frameRate, repeat: def.repeat,
    });
  }
  return key;
}

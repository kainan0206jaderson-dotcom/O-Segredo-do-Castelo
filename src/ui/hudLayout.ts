/**
 * Onde cada peça do HUD fica, em pixels de jogo. Tudo sai daqui para que nenhuma peça
 * cubra outra em qualquer largura de tela (480 no PC 16:9 até 640 no celular comprido).
 * tests/hudLayout.test.ts confere que as caixas não se sobrepõem.
 */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HudLayout {
  /** Painel da missão (canto superior esquerdo); a altura é a máxima, com 3 linhas de objetivo. */
  quest: Box;
  /** Largura de quebra do título e do objetivo. */
  questWrap: number;
  bag: Box;
  bagKey: { x: number; y: number };
  spell: Box;
  /** Corações e gotas: linha de baixo termina em vitals.y + vitals.h. */
  vitals: Box;
  heartsY: number;
  energyY: number;
  /** Cronômetro dos desafios, no alto e no meio, entre a missão e o feitiço. */
  timer: Box;
  /** Avisos rápidos e nome da sala, no meio da tela, abaixo de tudo que fica no alto. */
  notice: Box;
  roomName: Box;
  /** Barra de vida do duelo, embaixo no meio. */
  boss: Box;
  /** Botão de ação do celular (canto inferior direito). */
  action: Box;
}

const M = 4;
const BAG_R = 12;
const SPELL_W = 92;
const SPELL_H = 22;

export function hudLayout(width: number, height: number): HudLayout {
  const bag = { x: width - M - BAG_R * 2, y: M, w: BAG_R * 2, h: BAG_R * 2 };
  const spell = { x: bag.x - 6 - SPELL_W, y: M + 1, w: SPELL_W, h: SPELL_H };
  const heartsY = 40;
  const energyY = 50;
  const vitals = { x: spell.x - 24, y: heartsY - 5, w: width - M - (spell.x - 24), h: energyY + 4 - (heartsY - 5) };
  const timer = { x: width / 2 - 26, y: M, w: 52, h: 16 };
  // a missão vai até antes do cronômetro, com folga
  const questW = Math.min(200, timer.x - 6 - M);
  const quest = { x: M, y: M, w: questW, h: 16 + 3 * 11 + 4 };
  const top = Math.max(quest.y + quest.h, vitals.y + vitals.h) + 6;
  const notice = { x: 20, y: top, w: width - 40, h: 20 };
  const roomName = { x: width / 2 - 90, y: notice.y + notice.h + 6, w: 180, h: 18 };
  const boss = { x: width / 2 - 81, y: height - 30, w: 162, h: 22 };
  const action = { x: width - 34 - 22, y: height - 34 - 22, w: 44, h: 44 };
  return {
    quest, questWrap: questW - 8, bag, bagKey: { x: bag.x + BAG_R, y: bag.y + bag.h + 1 }, spell,
    vitals, heartsY, energyY, timer, notice, roomName, boss, action,
  };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

import type { GameState } from '../core/GameState';

/**
 * Luz ambiente de cada sala: a cor e a força da "noite" que cobre a sala inteira. As velas,
 * tochas, janelas, caldeirões e o próprio aprendiz abrem buracos de luz nessa camada.
 * É noite no castelo durante o jogo todo, então toda sala tem um pouco de escuro; as salas
 * que a história diz estarem sem luz ficam bem mais escuras até o aprendiz resolver.
 */
export interface Ambiente {
  /** Cor da sombra (azulada à noite, quente perto do fogo). */
  color: number;
  /** 0 = sala toda clara, 1 = preto total. */
  alpha: number;
  /** Sala escura de verdade: só se vê perto das luzes (Porão, Quadro da Coragem). */
  escuro?: boolean;
}

const NOITE = 0x120c2a;
const QUENTE = 0x1c0e16;
const ESTRELAS = 0x070a26;

const SALAS: Record<string, Ambiente> = {
  'map.recepcao': { color: NOITE, alpha: 0.48 },
  'map.grande-salao': { color: NOITE, alpha: 0.46 },
  'map.cozinha': { color: QUENTE, alpha: 0.42 },
  'map.corredor': { color: NOITE, alpha: 0.54 },
  'map.gabinete': { color: QUENTE, alpha: 0.44 },
  'map.hall': { color: NOITE, alpha: 0.56 },
  'map.ala-professores': { color: NOITE, alpha: 0.52 },
  'map.biblioteca': { color: 0x0e1028, alpha: 0.54 },
  'map.sala-espectral': { color: 0x0a1426, alpha: 0.62 },
  'map.estufa': { color: 0x081a1c, alpha: 0.38 },
  'map.observatorio': { color: ESTRELAS, alpha: 0.58 },
  'map.aula-adivinhacao': { color: ESTRELAS, alpha: 0.58 },
  'map.galeria': { color: NOITE, alpha: 0.44 },
  'map.quadro-inteligencia': { color: 0x0c0a24, alpha: 0.62 },
  'map.quadro-astucia': { color: 0x1a0a2a, alpha: 0.58 },
  'map.quadro-lealdade': { color: 0x14102a, alpha: 0.58 },
  'map.coracao': { color: ESTRELAS, alpha: 0.62 },
};
const PADRAO: Ambiente = { color: NOITE, alpha: 0.5 };
const ESCURO: Ambiente = { color: 0x08050f, alpha: 0.94, escuro: true };

export function ambienteDa(map: string, s: GameState, escuro = false): Ambiente {
  if (escuro) return ESCURO;
  const base = SALAS[map] ?? (map.startsWith('map.aula-') ? { color: NOITE, alpha: 0.48 } : PADRAO);
  let alpha = base.alpha;
  // a história: a cozinha está sem luz até a Dona Brasa ensinar o Lumen e as velas acenderem,
  // e o corredor fica escuro enquanto as sombrinhas estão lá
  if (map === 'map.cozinha' && !s.quests['luz-na-cozinha']?.done) alpha = 0.74;
  if (map === 'map.corredor' && !s.flags['criaturas:map.corredor:sombras']) alpha = 0.68;
  // a fuligem pesa no Coração até a Bellatrix ser convencida
  if (map === 'map.coracao' && s.flags['morgana:convencida']) alpha = 0.34;
  // depois do final, o Coração aceso ilumina o castelo inteiro
  if (s.flags['jogo:fim']) alpha *= 0.55;
  return { color: base.color, alpha: Math.round(alpha * 100) / 100 };
}

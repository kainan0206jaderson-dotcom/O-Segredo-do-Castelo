import { session } from './session';
import { lookSheet } from './visual';

/** Aparência do aprendiz, escolhida no Novo jogo e trocável nas Opções. A menina se chama Estela [FICÇÃO]. */
export type Aparencia = 'menino' | 'menina';

export function aparencia(): Aparencia {
  return session.state.aparencia ?? 'menino';
}

/** Folha do aprendiz ("player.aprendiz-coragem"): a da Estela quando for o caso, já com o visual escolhido. */
export function playerSheet(sheet: string): string {
  if (!sheet.startsWith('player.aprendiz')) return sheet;
  if (aparencia() === 'menina' && !sheet.startsWith('player.aprendiza')) sheet = sheet.replace('player.aprendiz', 'player.aprendiza');
  // pele, cabelo e roupa escolhidos na tela de Visual
  return lookSheet(sheet);
}

/** Falas que tratam o aprendiz no masculino e a versão para a aprendiz menina. */
const FEMININO: [RegExp, string][] = [
  [/\bUm aprendiz novo\b/g, 'Uma aprendiz nova'],
  [/\bMais um aprendiz\b/g, 'Mais uma aprendiz'],
  [/\bBem-vindo\b/g, 'Bem-vinda'],
  [/\bquerido aprendiz\b/g, 'querida aprendiz'],
  [/\bE o aprendiz certo\b/g, 'E a aprendiz certa'],
  [/\bO aprendiz\b/g, 'A aprendiz'],
  [/\bo aprendiz\b/g, 'a aprendiz'],
  [/\bdo aprendiz\b/g, 'da aprendiz'],
  [/\bno aprendiz\b/g, 'na aprendiz'],
  [/\bBrincando de astrônomo\b/g, 'Brincando de astrônoma'],
];

export function noGenero(text: string): string {
  if (aparencia() !== 'menina') return text;
  return FEMININO.reduce((t, [re, to]) => t.replace(re, to), text);
}

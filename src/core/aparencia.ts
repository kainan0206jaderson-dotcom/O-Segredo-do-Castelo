import { session } from './session';

/** Aparência do aprendiz, escolhida no Novo jogo e trocável nas Opções. A menina se chama Estela [FICÇÃO]. */
export type Aparencia = 'menino' | 'menina';

export function aparencia(): Aparencia {
  return session.state.aparencia ?? 'menino';
}

/** Troca a folha do aprendiz ("player.aprendiz-coragem") pela da aprendiz menina, quando for o caso. */
export function playerSheet(sheet: string): string {
  if (aparencia() !== 'menina' || !sheet.startsWith('player.aprendiz') || sheet.startsWith('player.aprendiza')) return sheet;
  return sheet.replace('player.aprendiz', 'player.aprendiza');
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

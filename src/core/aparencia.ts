import { session } from './session';
import { lookSheet } from './visual';
import { nomeFeio } from './nomeFeio';

/** Aparência do aprendiz, escolhida no Novo jogo e trocável nas Opções. O menino se chama Orion e a menina, Estela [FICÇÃO]. */
export type Aparencia = 'menino' | 'menina';

export function aparencia(): Aparencia {
  return session.state.aparencia ?? 'menino';
}

/** Nome sugerido para cada aparência. */
export function nomePadrao(look: Aparencia): string {
  return look === 'menina' ? 'Estela' : 'Orion';
}

/** Nome do aprendiz: o que o jogador escolheu ou, sem escolha, o padrão da aparência.
 * No Modo Kids, nome com palavrão não aparece: vale o padrão. */
export function nomeAprendiz(): string {
  const nome = session.state.nome?.trim();
  if (!nome || (session.state.modo === 'kids' && nomeFeio(nome))) return nomePadrao(aparencia());
  return nome;
}

/** Limpa o nome digitado: sem espaços sobrando, no máximo 14 letras. Vazio vira undefined. */
export function limparNome(raw: string): string | undefined {
  const n = raw.replace(/\s+/g, ' ').trim().slice(0, 14);
  return n || undefined;
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
  [/\bum aprendiz novo\b/g, 'uma aprendiz nova'],
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

const FALA_PADRAO: Record<string, string> = {
  objetivo: 'Explorar o castelo e conversar com todo mundo.',
  estrela: 'As estrelas estão quietas hoje.',
  dica: 'Explore o castelo e converse com todo mundo.',
};

/** Trechos que mudam com o jogo, como {objetivo} e {estrela}. A cena do castelo registra quem responde cada um. */
const FALAS: Record<string, () => string> = {};

export function setFalaProvider(key: string, fn: () => string): void {
  FALAS[key] = fn;
}

/** Ajusta uma fala ao aprendiz: troca {nome} pelo nome dele, {objetivo} e {estrela} pelo momento do jogo,
 * {o|a} pela forma certa e, para a menina, o masculino pelo feminino. */
export function noGenero(text: string): string {
  text = text.replace(/\{nome\}/g, nomeAprendiz());
  text = text.replace(/\{(objetivo|estrela|dica)\}/g, (_, k: string) => FALAS[k]?.() ?? FALA_PADRAO[k]);
  // {o|a}: forma do menino | forma da menina, escrita direto na fala ("cansad{o|a}", "{Guardião|Guardiã}")
  const menina = aparencia() === 'menina';
  text = text.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m: string, f: string) => (menina ? f : m));
  if (!menina) return text;
  return FEMININO.reduce((t, [re, to]) => t.replace(re, to), text);
}

/**
 * Filtro de nomes feios do Modo Kids: palavrões e ofensas nas línguas mais faladas
 * (português, inglês, espanhol, francês, alemão, italiano, russo e um pouco de chinês romanizado).
 * O nome é normalizado antes (minúsculas, sem acento, 4→a, 3→e, 0→o, @→a, $→s...),
 * para "P0rr@" ou "F.U.C.K" também pegarem.
 */

/** Pegam em qualquer parte do nome ("fuckinho", "merdinha"). */
const DENTRO = [
  // português
  'porra', 'caralh', 'buceta', 'boceta', 'xoxota', 'xereca', 'punheta', 'piroca', 'cacete', 'merd', 'bosta',
  'foder', 'fodid', 'fodase', 'arrombad', 'filhodaputa', 'putaria', 'cuzao', 'idiota', 'imbecil', 'babaca',
  'otario', 'retardad', 'vagabund', 'viado', 'desgracad', 'escrot', 'corno', 'boquete',
  // inglês
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'asshole', 'bastard', 'whore', 'slut', 'nigg', 'faggot', 'retard',
  'motherf', 'wank', 'twat', 'bollock', 'penis', 'vagina', 'porn', 'sexy', 'nazi', 'hitler', 'dickhead', 'jackass',
  // espanhol
  'mierd', 'pendej', 'cabron', 'chinga', 'joder', 'culero', 'maricon', 'gilipolla', 'hijodeputa', 'follar', 'putita',
  // francês
  'putain', 'salope', 'connard', 'connasse', 'encule', 'couille', 'batard', 'enculer',
  // alemão
  'scheiss', 'arschloch', 'fotze', 'wichser', 'schlampe', 'ficken', 'hurensohn',
  // italiano
  'cazz', 'vaffanculo', 'stronz', 'puttana', 'minchia', 'coglion',
  // russo (romanizado e em cirílico)
  'blyat', 'blyad', 'pizdec', 'pizda', 'khuy', 'yebat', 'бля', 'хуй', 'пизд', 'ебат', 'ебан',
  // chinês romanizado
  'caonima', 'tamade', 'shabi',
];

/** Só valem como palavra inteira, porque estão dentro de nomes normais (Monique, Chieri, Dick Vigarista...). */
const INTEIRA = [
  'cu', 'puta', 'pqp', 'fdp', 'vsf', 'tnc', 'krl', 'crl', 'kct', 'bunda', 'foda', 'rola',
  'ass', 'dick', 'cock', 'fag', 'sex', 'cum', 'tits',
  'puto', 'culo', 'cono', 'verga', 'polla', 'mamon',
  'pute', 'bite', 'chier', 'nique', 'con',
  'hure', 'fick', 'arsch',
  'troia', 'figa',
  'suka', 'hui', 'сука',
];

const LEET: Record<string, string> = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't', '8': 'b' };

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[4@3!1!05$78]/g, (c) => LEET[c] ?? c);
}

/** Letras repetidas viram uma só ("fuuuck" → "fuck"). */
function juntarRepetidas(s: string): string {
  return s.replace(/(\p{L})\1+/gu, '$1');
}

const DENTRO_JUNTAS = DENTRO.map(juntarRepetidas).filter((w) => w.length >= 4);

/** Verdadeiro se o nome tem palavrão ou ofensa (usado no Modo Kids). */
export function nomeFeio(nome: string): boolean {
  const base = normalizar(nome);
  const palavras = base.split(/[^\p{L}]+/u).filter(Boolean);
  const colado = palavras.join('');
  if (palavras.some((p) => INTEIRA.includes(p) || INTEIRA.includes(juntarRepetidas(p)))) return true;
  if (INTEIRA.includes(colado)) return true;
  if (DENTRO.some((w) => colado.includes(w))) return true;
  const junto = juntarRepetidas(colado);
  return DENTRO_JUNTAS.some((w) => junto.includes(w));
}

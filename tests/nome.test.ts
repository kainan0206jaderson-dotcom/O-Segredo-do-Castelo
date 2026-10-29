import { describe, expect, it } from 'vitest';
import { nomeFeio } from '../src/core/nomeFeio';
import { limparNome } from '../src/core/aparencia';

describe('nome do aprendiz', () => {
  it('aceita nomes normais, inclusive os que têm pedaços parecidos com palavrão', () => {
    for (const n of ['Orion', 'Estela', 'Kainan', 'Monique', 'Dominique', 'Chieri', 'Cunha', 'Pietra', 'Ana Luísa', 'Cazorla', 'Sasha', 'Mateus', 'Constança', 'João Pedro', 'Hikaru', 'Анна'])
      expect(nomeFeio(n), n).toBe(false);
  });

  it('pega palavrões em várias línguas, com acento, maiúscula, números e letras repetidas', () => {
    for (const n of ['Porra', 'P0rr@', 'merdinha', 'FUUUCK', 'f.u.c.k', 'shit', 'Puta', 'cu', 'mierda', 'Putain', 'Scheiße', 'cazzo', 'blyat', 'сука', 'Caralho Jr', 'filho da puta', 'xX_fuck_Xx', 'idiota'])
      expect(nomeFeio(n), n).toBe(true);
  });

  it('limpa espaços, corta em 14 letras e trata vazio como sem nome', () => {
    expect(limparNome('  Luna   Maria ')).toBe('Luna Maria');
    expect(limparNome('   ')).toBeUndefined();
    expect(limparNome('Abcdefghijklmnopq')).toHaveLength(14);
  });
});

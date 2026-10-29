import { describe, expect, it } from 'vitest';
import { CASTELO_LISTA, SONGS, noteHz, parseChannel, songLength, sortear } from '../src/audio/Audio';

describe('trilha sonora', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    it(`${name}: notas válidas e canais que fecham o compasso`, () => {
      const lengths = song.channels.map((c) => parseChannel(c.notes).length);
      const longest = Math.max(...lengths);
      for (const [i, ch] of song.channels.entries()) {
        const notes = parseChannel(ch.notes);
        expect(notes[0], `${name} canal ${i} começa segurando nota`).not.toBe('.');
        for (const n of notes) if (n !== '-' && n !== '.') expect(noteHz(n)).toBeGreaterThan(20);
        // canais mais curtos repetem certinho dentro do mais longo
        expect(longest % notes.length, `${name} canal ${i} tem ${notes.length} passos`).toBe(0);
      }
    });
  }
});

describe('revezamento das músicas do castelo', () => {
  it('a lista tem as músicas novas e todas existem', () => {
    expect(CASTELO_LISTA.length).toBeGreaterThanOrEqual(4);
    for (const t of CASTELO_LISTA) expect(SONGS[t]).toBeDefined();
  });
  it('o sorteio nunca repete a música que está tocando', () => {
    for (let i = 0; i < 50; i++) {
      const atual = CASTELO_LISTA[i % CASTELO_LISTA.length];
      const prox = sortear(CASTELO_LISTA, atual);
      expect(prox).not.toBe(atual);
      expect(CASTELO_LISTA).toContain(prox);
    }
  });
  it('cada volta dura pelo menos uns 10 segundos', () => {
    for (const t of CASTELO_LISTA) expect((songLength(SONGS[t]) * 30) / SONGS[t].bpm).toBeGreaterThan(10);
  });
});

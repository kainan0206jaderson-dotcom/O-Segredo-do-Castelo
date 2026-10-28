import { describe, expect, it } from 'vitest';
import { SONGS, noteHz, parseChannel } from '../src/audio/Audio';

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

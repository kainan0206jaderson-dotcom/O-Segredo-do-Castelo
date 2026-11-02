import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { AMBIENCIA_SALA, vozDe } from '../src/audio/Audio';

describe('vozes e som ambiente', () => {
  it('cada personagem tem a mesma voz sempre, e vozes diferentes entre si', () => {
    expect(vozDe('Prof. Leon Arctrus')).toEqual(vozDe('Prof. Leon Arctrus'));
    expect(vozDe('Bellatrix Lestrelle').wave).toBe('sawtooth');
    expect(vozDe('Elfo Fuxico').hz).toBeGreaterThan(vozDe('Ministro Bonfatti').hz);
    const tons = new Set(['Prof. Leon Arctrus', 'Prof. Hector Tallun', 'Prof. Mustaffa Nox', 'Prof. Lúcio Wilson'].map((n) => vozDe(n).hz));
    expect(tons.size).toBeGreaterThan(1);
  });

  it('narração e cartas não fazem bipe', () => {
    for (const n of ['✦', 'Carta', 'Carta do Bonfatti']) expect(vozDe(n).vol).toBe(0);
  });

  it('som ambiente só aponta para salas que existem', () => {
    for (const id of Object.keys(AMBIENCIA_SALA)) expect(existsSync(`public/assets/maps/${id.replace('map.', '')}.tmj`), id).toBe(true);
  });
});

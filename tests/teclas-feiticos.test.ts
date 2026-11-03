import { describe, expect, it } from 'vitest';
import { db } from './content-load';

// mesmas letras de InputManager.RESERVED: andar (WASD), ação (E), trocar feitiço (Q), mapa (M), bolsa (I)
const OCUPADAS = ['W', 'A', 'S', 'D', 'E', 'Q', 'M', 'I'];

describe('teclas dos feitiços', () => {
  const teclas = Object.entries(db.spells).map(([id, sp]) => [id, sp.tecla] as const);

  it('todo feitiço tem uma letra só dele', () => {
    for (const [id, t] of teclas) expect(t, id).toMatch(/^[A-Z]$/);
    expect(new Set(teclas.map(([, t]) => t)).size).toBe(teclas.length);
  });

  it('nenhuma tecla de feitiço colide com andar, pegar, bolsa, mapa ou trocar feitiço', () => {
    for (const [id, t] of teclas) expect(OCUPADAS, id).not.toContain(t);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { session } from '../src/core/session';
import { noGenero, playerSheet } from '../src/core/aparencia';

describe('aparência do aprendiz', () => {
  afterEach(() => {
    delete session.state.aparencia;
  });

  it('menino (e saves antigos) mantém folha e falas', () => {
    expect(playerSheet('player.aprendiz-coragem')).toBe('player.aprendiz-coragem');
    expect(noGenero('Opa, opa! Um aprendiz novo! Bem-vindo ao castelo.')).toBe('Opa, opa! Um aprendiz novo! Bem-vindo ao castelo.');
  });

  it('menina usa a folha da aprendiz e as falas no feminino', () => {
    session.state.aparencia = 'menina';
    expect(playerSheet('player.aprendiz')).toBe('player.aprendiza');
    expect(playerSheet('player.aprendiz-estrelada')).toBe('player.aprendiza-estrelada');
    expect(playerSheet('npc.trinco')).toBe('npc.trinco');
    expect(noGenero('Opa, opa! Um aprendiz novo! Bem-vindo ao Castelo Magia & Bruxaria.'))
      .toBe('Opa, opa! Uma aprendiz nova! Bem-vinda ao Castelo Magia & Bruxaria.');
    expect(noGenero('Ah! O aprendiz que acendeu a cozinha')).toBe('Ah! A aprendiz que acendeu a cozinha');
    expect(noGenero('Boa noite, aprendiz.')).toBe('Boa noite, aprendiz.');
  });
});

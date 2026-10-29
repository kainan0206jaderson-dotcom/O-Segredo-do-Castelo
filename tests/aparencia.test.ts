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

describe('visual do aprendiz', () => {
  it('tabela de cores tem as opções pedidas (2 roupas por personagem)', async () => {
    const { opcoesPele, opcoesCabelo, opcoesRoupa } = await import('../src/core/visual');
    expect(opcoesPele().length).toBeGreaterThanOrEqual(4);
    expect(opcoesCabelo().length).toBeGreaterThanOrEqual(4);
    expect(opcoesRoupa()).toHaveLength(2);
    session.state.aparencia = 'menina';
    expect(opcoesRoupa()).toHaveLength(2);
    expect(opcoesRoupa()[0].mapa).toEqual({});
    delete session.state.aparencia;
  });

  it('sem o jogo carregado, a folha continua a padrão', () => {
    session.state.visual = { pele: 'negra', cabelo: 'loiro', roupa: 1 };
    expect(playerSheet('player.aprendiz')).toBe('player.aprendiz');
    delete session.state.visual;
  });
});

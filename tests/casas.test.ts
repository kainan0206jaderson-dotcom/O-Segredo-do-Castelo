import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dialogues } from './content-load';

// ordem oficial das casas no castelo [kainan, 31/10]: vermelho, verde, amarelo, azul
const ORDEM = ['coragem', 'astucia', 'lealdade', 'inteligencia'];

describe('ordem das casas', () => {
  const salao = JSON.parse(readFileSync('public/assets/maps/grande-salao.tmj', 'utf8'));
  const props = salao.layers.find((l: { type: string }) => l.type === 'objectgroup').objects as { x: number; properties?: { name: string; value: unknown }[] }[];
  const sprites = (prefix: string) => props
    .map((o) => ({ x: o.x, s: String(o.properties?.find((p) => p.name === 'sprite')?.value ?? '') }))
    .filter((o) => o.s.startsWith(prefix))
    .sort((a, b) => a.x - b.x)
    .map((o) => o.s.replace(prefix, ''));

  it('bandeiras da parede do Grande Salão: vermelho, verde, amarelo, azul', () => {
    const paredes = salao.layers.find((l: { name: string }) => l.name === 'paredes').data as number[];
    const linha = paredes.slice(salao.width, salao.width * 2);
    // gids das bandeiras no tileset: 8 coragem, 9 inteligência, 10 astúcia, 11 lealdade
    const gid: Record<number, string> = { 8: 'coragem', 9: 'inteligencia', 10: 'astucia', 11: 'lealdade' };
    expect(linha.filter((g) => gid[g]).map((g) => gid[g])).toEqual(ORDEM);
  });

  it('toalhas e estandartes das mesas seguem a mesma ordem', () => {
    expect(sprites('prop.toalha-')).toEqual(ORDEM);
    expect(sprites('prop.estandarte-')).toEqual(ORDEM);
  });

  it('a escolha da casa com o Ministro mostra as casas nessa ordem, com o Chapéu das Virtudes', () => {
    const d = dialogues.arquimedes;
    const casa = d.nodes.casa;
    expect(casa.choices?.map((c) => c.effects?.find((e) => 'setHouse' in e))).toEqual(ORDEM.map((h) => ({ setHouse: h })));
    expect(casa.cena).toBe('chapeu');
    expect(d.nodes['intro-4'].next).toBe('chapeu');
  });
});

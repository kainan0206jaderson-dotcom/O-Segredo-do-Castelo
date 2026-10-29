import type { GameState } from '../core/GameState';
import type { Condition } from '../types/content';
import { check } from './rules';

/** O mínimo de um objeto do Tiled que a trilha precisa. */
export interface MapObject {
  name: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: { name: string; value: unknown }[];
}

const prop = (o: MapObject, key: string) => o.properties?.find((p) => p.name === key)?.value;

/** Centro de um objeto (zonas têm largura e altura; pontos, não). */
function center(o: MapObject): { x: number; y: number } {
  return { x: o.x + (o.width ?? 0) / 2, y: o.y + (o.height ?? 0) / 2 };
}

/** Portas que dá para usar agora (a condição da porta, se houver, já vale). */
function openDoors(objects: MapObject[], s: GameState): MapObject[] {
  return objects.filter((o) => {
    if (o.type !== 'door' || !prop(o, 'target')) return false;
    const when = prop(o, 'when');
    return !when || check(JSON.parse(String(when)) as Condition, s);
  });
}

/**
 * Modo Kids: o ponto, na sala atual, para onde a trilha aponta.
 * Na sala do alvo é o próprio alvo; fora dela, a primeira porta do caminho
 * mais curto (em número de salas) até lá.
 */
export function nextGuidePoint(
  from: string, target: { map: string; alvo: string }, s: GameState,
  objectsOf: (map: string) => MapObject[] | undefined,
): { x: number; y: number; door: boolean } | undefined {
  if (from === target.map) {
    const o = objectsOf(from)?.find((x) => x.name === target.alvo && x.type !== 'spawn');
    return o && { ...center(o), door: false };
  }
  // busca em largura pelas salas, lembrando qual porta da sala atual começou cada caminho
  const first = new Map<string, MapObject>();
  const queue: string[] = [];
  for (const d of openDoors(objectsOf(from) ?? [], s)) {
    const to = String(prop(d, 'target'));
    if (to !== from && !first.has(to)) {
      first.set(to, d);
      queue.push(to);
    }
  }
  const seen = new Set([from, ...queue]);
  while (queue.length) {
    const map = queue.shift()!;
    const door = first.get(map)!;
    if (map === target.map) return { ...center(door), door: true };
    for (const d of openDoors(objectsOf(map) ?? [], s)) {
      const to = String(prop(d, 'target'));
      if (seen.has(to)) continue;
      seen.add(to);
      first.set(to, door);
      queue.push(to);
    }
  }
  return undefined;
}

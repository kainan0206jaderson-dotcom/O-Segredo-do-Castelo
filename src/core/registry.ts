import type { AssetRegistry } from './AssetRegistry';

/** Instância compartilhada, criada pela BootScene ao ler o manifesto. */
let current: AssetRegistry | undefined;

export function setAssets(r: AssetRegistry): void {
  current = r;
}

export function assets(): AssetRegistry {
  if (!current) throw new Error('AssetRegistry ainda não foi carregado (BootScene)');
  return current;
}

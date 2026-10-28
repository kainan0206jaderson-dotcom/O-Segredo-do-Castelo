import { readFileSync } from 'node:fs';

/** Lê largura e altura do cabeçalho IHDR de um PNG. */
export function imageSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

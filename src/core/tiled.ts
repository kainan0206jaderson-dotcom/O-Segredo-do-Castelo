/** Leitura das propriedades personalizadas que o Tiled grava em mapas e objetos. */
export interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}

export function prop<T = string>(props: unknown, name: string): T | undefined {
  return (props as TiledProperty[] | undefined)?.find((p) => p.name === name)?.value as T | undefined;
}

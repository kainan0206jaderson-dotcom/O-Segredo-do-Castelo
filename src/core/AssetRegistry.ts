/**
 * Lê o manifest.json e traduz chaves lógicas ("player.aprendiz") em arquivos.
 * Não depende do Phaser: o jogo só conhece as chaves, nunca os caminhos,
 * então trocar arte provisória por definitiva é editar o manifesto.
 */

export interface AnimationDef {
  frames: number[];
  frameRate: number;
  repeat: number;
}

export interface SpritesheetDef {
  url: string;
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, AnimationDef>;
}

export interface TilesetDef {
  url: string;
  /** Nome do tileset dentro do arquivo do Tiled. */
  tiledName: string;
}

export interface MapDef {
  url: string;
  tilesets: string[];
}

export interface AssetManifest {
  version: number;
  status?: string;
  spritesheets: Record<string, SpritesheetDef>;
  tilesets: Record<string, TilesetDef>;
  maps: Record<string, MapDef>;
}

export type LoadItem =
  | { type: 'spritesheet'; key: string; url: string; frameWidth: number; frameHeight: number }
  | { type: 'image'; key: string; url: string }
  | { type: 'tilemap'; key: string; url: string };

export class AssetRegistry {
  constructor(
    readonly manifest: AssetManifest,
    private readonly base = '',
  ) {
    const problems = AssetRegistry.validate(manifest);
    if (problems.length) throw new Error(`manifest.json inválido:\n- ${problems.join('\n- ')}`);
  }

  /** Lista de problemas encontrados; vazia quando o manifesto está correto. */
  static validate(m: AssetManifest): string[] {
    const problems: string[] = [];
    if (m.version !== 1) problems.push(`versão ${m.version} não suportada`);
    for (const [key, s] of Object.entries(m.spritesheets ?? {})) {
      if (!s.url) problems.push(`${key}: sem url`);
      if (!(s.frameWidth > 0 && s.frameHeight > 0)) problems.push(`${key}: tamanho de quadro inválido`);
      for (const [anim, a] of Object.entries(s.animations ?? {})) {
        if (!a.frames?.length) problems.push(`${key}.${anim}: sem quadros`);
        if (a.frames?.some((f) => !Number.isInteger(f) || f < 0)) problems.push(`${key}.${anim}: quadro inválido`);
      }
    }
    for (const [key, map] of Object.entries(m.maps ?? {})) {
      for (const ts of map.tilesets) {
        if (!m.tilesets?.[ts]) problems.push(`${key}: tileset "${ts}" não existe no manifesto`);
      }
    }
    return problems;
  }

  /** Tudo que a cena de carregamento precisa pedir ao Phaser. */
  loadQueue(): LoadItem[] {
    const items: LoadItem[] = [];
    for (const [key, s] of Object.entries(this.manifest.spritesheets)) {
      items.push({ type: 'spritesheet', key, url: this.base + s.url, frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    }
    for (const [key, t] of Object.entries(this.manifest.tilesets)) {
      items.push({ type: 'image', key, url: this.base + t.url });
    }
    for (const [key, map] of Object.entries(this.manifest.maps)) {
      items.push({ type: 'tilemap', key, url: this.base + map.url });
    }
    return items;
  }

  /** Nome global de uma animação, ex.: animKey("player.aprendiz", "walk-down"). */
  static animKey(sheet: string, anim: string): string {
    return `${sheet}:${anim}`;
  }

  animations(): { key: string; sheet: string; def: AnimationDef }[] {
    return Object.entries(this.manifest.spritesheets).flatMap(([sheet, s]) =>
      Object.entries(s.animations).map(([anim, def]) => ({ key: AssetRegistry.animKey(sheet, anim), sheet, def })),
    );
  }

  hasAnimation(sheet: string, anim: string): boolean {
    return Boolean(this.manifest.spritesheets[sheet]?.animations[anim]);
  }

  tileset(key: string): TilesetDef {
    const t = this.manifest.tilesets[key];
    if (!t) throw new Error(`tileset desconhecido: ${key}`);
    return t;
  }

  map(key: string): MapDef {
    const m = this.manifest.maps[key];
    if (!m) throw new Error(`mapa desconhecido: ${key}`);
    return m;
  }
}

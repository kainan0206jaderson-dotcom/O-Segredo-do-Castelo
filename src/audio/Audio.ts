import { onSettingsChange, settings } from '../core/settings';

/**
 * Som do jogo, todo sintetizado na hora (Web Audio): efeitos curtos e músicas em
 * estilo "chiptune". Não há arquivos de áudio para carregar.
 */

export type Sfx =
  | 'passo' | 'porta' | 'blip' | 'menu' | 'confirmar'
  | 'lumen' | 'levitar' | 'revelar' | 'escudo' | 'abrir' | 'fogos' | 'vento' | 'sem-energia'
  | 'pegar' | 'missao' | 'nivel' | 'dano' | 'acerto' | 'espanto' | 'orbe' | 'enigma'
  | 'vitoria' | 'derrota' | 'desmaio' | 'coracao' | 'pocao' | 'erro';

export type Track = 'titulo' | 'castelo' | 'biblioteca' | 'quadros' | 'duelo' | 'final';

type Wave = OscillatorType;

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A4" -> 440 Hz. */
export function noteHz(note: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(note);
  if (!m) throw new Error(`nota inválida: ${note}`);
  const semis = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * 2 ** ((semis - 69) / 12);
}

/**
 * Uma música: canais com uma nota por passo (colcheia). "-" é pausa, "." segura a nota anterior.
 * Cada canal tem seu próprio tamanho e repete sozinho.
 */
export interface Song {
  bpm: number;
  channels: { wave: Wave; vol: number; notes: string }[];
}

/** Partituras curtas em loop [FICÇÃO: composições originais]. */
export const SONGS: Record<Track, Song> = {
  // tela inicial: valsa misteriosa em ré menor
  titulo: {
    bpm: 96,
    channels: [
      { wave: 'triangle', vol: 0.22, notes: 'D5 . F5 A5 . D6 C6 . A5 G5 . F5 E5 . . . F5 . A5 C6 . F6 E6 . C6 A#5 . A5 G5 . . . ' },
      { wave: 'sine', vol: 0.18, notes: 'D3 . . A2 . . D3 . . A2 . . C3 . . G2 . . F3 . . C3 . . A#2 . . A2 . . ' },
    ],
  },
  // Ato 1: castelo animado, fá maior, passinho saltitante
  castelo: {
    bpm: 118,
    channels: [
      { wave: 'square', vol: 0.08, notes: 'F5 - A5 C6 A5 - G5 F5 E5 - G5 A#5 A5 G5 F5 - D5 - F5 A5 G5 - F5 E5 F5 . . . - - - - ' },
      { wave: 'triangle', vol: 0.2, notes: 'F3 C4 A3 C4 C3 G3 E3 G3 D3 A3 F3 A3 C3 G3 E3 G3 A#2 F3 D3 F3 C3 G3 E3 G3 F3 C4 A3 C4 F2 . . . ' },
    ],
  },
  // Ato 2: biblioteca calma e curiosa, lá menor
  biblioteca: {
    bpm: 84,
    channels: [
      { wave: 'triangle', vol: 0.2, notes: 'A4 . C5 E5 . D5 C5 . B4 . G4 . A4 . . . C5 . E5 G5 . F5 E5 . D5 . B4 . C5 . . . ' },
      { wave: 'sine', vol: 0.14, notes: 'E5 - A5 - E5 - A5 - D5 - G5 - D5 - G5 - E5 - A5 - E5 - A5 - F5 - A5 - E5 - G#5 - ' },
      { wave: 'sine', vol: 0.18, notes: 'A2 . . . E3 . . . G2 . . . D3 . . . F2 . . . C3 . . . E2 . . . E2 . . . ' },
    ],
  },
  // Ato 3: dentro dos quadros, mi menor, um pouco tenso
  quadros: {
    bpm: 100,
    channels: [
      { wave: 'square', vol: 0.06, notes: 'E5 - - G5 F#5 - E5 - B4 - - D5 E5 - - - C5 - - E5 D5 - C5 - B4 - A4 - B4 - - - ' },
      { wave: 'triangle', vol: 0.2, notes: 'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 C2 C3 B1 B2 ' },
    ],
  },
  // duelo com a Morgana: rápido, ré menor
  duelo: {
    bpm: 150,
    channels: [
      { wave: 'square', vol: 0.07, notes: 'D5 D5 F5 D5 A5 D5 G5 F5 E5 E5 G5 E5 A#5 A5 G5 E5 F5 F5 A5 F5 C6 A5 G5 F5 E5 C#5 E5 G5 A5 . . . ' },
      { wave: 'triangle', vol: 0.22, notes: 'D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 A#1 A#2 A#1 A#2 A#1 A#2 A#1 A#2 A1 A2 A1 A2 A1 A2 C#3 E3 ' },
      { wave: 'sawtooth', vol: 0.025, notes: 'D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4 A#3 D4 F4 D4 A#3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4 ' },
    ],
  },
  // final e créditos: dó maior, festivo
  final: {
    bpm: 108,
    channels: [
      { wave: 'square', vol: 0.08, notes: 'C5 E5 G5 C6 . B5 A5 G5 F5 . A5 . G5 . E5 . F5 E5 D5 F5 E5 D5 C5 E5 D5 . . . - - - - ' },
      { wave: 'triangle', vol: 0.2, notes: 'C3 G3 E3 G3 C3 G3 E3 G3 F3 C4 A3 C4 C3 G3 E3 G3 D3 A3 F3 A3 G2 D3 B2 D3 G2 . . . G2 . . . ' },
    ],
  },
};

const LOOKAHEAD_S = 0.12;

class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfxBus?: GainNode;
  private musicBus?: GainNode;
  private noiseBuf?: AudioBuffer;
  private track?: Track;
  private songGain?: GainNode;
  private step = 0;
  private nextAt = 0;
  private timer?: number;
  private lastStepAt = 0;

  /** Liga o áudio no primeiro toque/tecla (exigência dos navegadores, principalmente no celular). */
  install(): void {
    const unlock = () => {
      this.ensure();
      void this.ctx?.resume();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
    onSettingsChange(() => this.applyVolumes());
  }

  private ensure(): AudioContext | undefined {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    if (this.track) this.startSong();
    return ctx;
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus!.gain.setTargetAtTime(settings.efeitos, t, 0.02);
    this.musicBus!.gain.setTargetAtTime(settings.musica * 0.8, t, 0.05);
  }

  // ---------- efeitos

  /** Toca um efeito curto. Sem áudio liberado ainda, não faz nada. */
  sfx(name: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || settings.efeitos <= 0) return;
    const t = ctx.currentTime + 0.005;
    const R = (a: number, b: number) => a + Math.random() * (b - a);
    switch (name) {
      case 'passo': {
        if (t - this.lastStepAt < 0.2) return;
        this.lastStepAt = t;
        this.noise(t, 0.05, 0.05, R(700, 1100), 'lowpass');
        return;
      }
      case 'porta': this.tone(t, 'sawtooth', 160, 70, 0.3, 0.09); this.noise(t, 0.12, 0.12, 400, 'lowpass'); return;
      case 'blip': this.tone(t, 'square', R(520, 640), undefined, 0.035, 0.03); return;
      case 'menu': this.tone(t, 'square', 880, undefined, 0.05, 0.05); return;
      case 'confirmar': this.notes(t, 'square', ['E5', 'B5'], 0.06, 0.06); return;
      case 'lumen': this.tone(t, 'sine', 600, 1500, 0.22, 0.14); this.notes(t + 0.08, 'triangle', ['E6', 'G#6', 'B6'], 0.05, 0.06); return;
      case 'levitar': this.tone(t, 'sine', 380, 760, 0.45, 0.12, 7); return;
      case 'revelar': this.notes(t, 'triangle', ['A5', 'C#6', 'E6', 'A6', 'E6'], 0.07, 0.08); this.tone(t, 'sine', 220, 440, 0.5, 0.06); return;
      case 'escudo': this.tone(t, 'sine', 140, 280, 0.4, 0.18); this.notes(t + 0.1, 'triangle', ['G5', 'D6'], 0.12, 0.08); return;
      case 'abrir': this.noise(t, 0.03, 0.15, 3000, 'highpass'); this.notes(t + 0.05, 'square', ['C6', 'G6'], 0.08, 0.05); return;
      case 'fogos': for (let i = 0; i < 5; i++) this.noise(t + i * R(0.04, 0.09), 0.08, 0.12, R(1200, 4000), 'bandpass'); return;
      case 'vento': this.noise(t, 0.5, 0.1, 900, 'bandpass', 2400); return;
      case 'sem-energia': this.tone(t, 'square', 220, 160, 0.15, 0.06); return;
      case 'pegar': this.notes(t, 'square', ['C6', 'E6'], 0.06, 0.06); return;
      case 'missao': this.notes(t, 'square', ['C5', 'E5', 'G5', 'C6'], 0.09, 0.07); return;
      case 'nivel': this.notes(t, 'square', ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.08, 0.07); this.tone(t + 0.5, 'triangle', 1046, undefined, 0.4, 0.08); return;
      case 'dano': this.tone(t, 'square', 320, 90, 0.22, 0.12); return;
      case 'acerto': this.noise(t, 0.08, 0.14, 2200, 'bandpass'); this.tone(t, 'triangle', 900, 1300, 0.08, 0.08); return;
      case 'espanto': this.tone(t, 'sine', 500, 1800, 0.3, 0.1); this.noise(t, 0.25, 0.06, 5000, 'highpass'); return;
      case 'orbe': this.tone(t, 'sawtooth', 110, 80, 0.25, 0.06); return;
      case 'enigma': this.notes(t, 'triangle', ['G5', 'B5', 'D6', 'G6', 'B6'], 0.08, 0.1); return;
      case 'vitoria': this.notes(t, 'square', ['C5', 'C5', 'C5', 'G5', '-', 'E5', 'G5', 'C6'], 0.1, 0.08); return;
      case 'derrota': this.notes(t, 'square', ['G4', 'F#4', 'F4', 'E4'], 0.16, 0.07); return;
      case 'desmaio': this.tone(t, 'triangle', 600, 120, 0.8, 0.12); return;
      case 'coracao': this.tone(t, 'sine', 70, 50, 0.18, 0.4); this.tone(t + 0.25, 'sine', 70, 50, 0.22, 0.45); return;
      case 'pocao': this.notes(t, 'sine', ['C5', 'E5', 'D5', 'G5'], 0.05, 0.08); this.noise(t, 0.2, 0.04, 1500, 'bandpass'); return;
      case 'erro': this.tone(t, 'square', 200, 150, 0.2, 0.07); return;
    }
  }

  private env(g: GainNode, t: number, dur: number, vol: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private tone(t: number, wave: Wave, from: number, to: number | undefined, dur: number, vol: number, vibrato = 0): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(from, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = vibrato;
      lg.gain.value = from * 0.04;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    this.env(g, t, dur, vol);
    o.connect(g).connect(this.sfxBus!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private notes(t: number, wave: Wave, list: string[], each: number, vol: number): void {
    list.forEach((n, i) => {
      if (n !== '-') this.tone(t + i * each, wave, noteHz(n), undefined, each * 1.6, vol);
    });
  }

  private noise(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType, freqTo?: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const g = ctx.createGain();
    this.env(g, t, dur, vol);
    src.connect(f).connect(g).connect(this.sfxBus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ---------- música

  /** Troca a música (com fade). A mesma faixa de novo não recomeça. */
  music(track: Track): void {
    if (track === this.track) return;
    this.track = track;
    if (this.ctx) this.startSong();
  }

  private startSong(): void {
    const ctx = this.ctx!;
    const old = this.songGain;
    if (old) {
      old.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
      setTimeout(() => old.disconnect(), 1500);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.setTargetAtTime(1, ctx.currentTime + 0.3, 0.4);
    g.connect(this.musicBus!);
    this.songGain = g;
    this.step = 0;
    this.nextAt = ctx.currentTime + 0.35;
    if (this.timer === undefined) this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.track || ctx.state !== 'running') return;
    const song = SONGS[this.track];
    const stepS = 60 / song.bpm / 2;
    // depois de um tempo parado (aba escondida), não tenta tocar o atraso inteiro
    if (this.nextAt < ctx.currentTime - 0.5) this.nextAt = ctx.currentTime + 0.05;
    while (this.nextAt < ctx.currentTime + LOOKAHEAD_S) {
      for (const ch of song.channels) {
        const notes = parseChannel(ch.notes);
        const i = this.step % notes.length;
        const n = notes[i];
        if (n === '-' || n === '.') continue;
        let len = 1;
        while (notes[(i + len) % notes.length] === '.' && len < notes.length) len++;
        this.musicNote(this.nextAt, ch.wave, noteHz(n), stepS * len * 0.92, ch.vol);
      }
      this.step++;
      this.nextAt += stepS;
    }
  }

  private musicNote(t: number, wave: Wave, hz: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.setTargetAtTime(vol * 0.6, t + 0.05, 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.songGain!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

const parsed = new Map<string, string[]>();
/** "C5 . - E5" -> ["C5", ".", "-", "E5"] (guardado para não repetir o trabalho a cada passo). */
export function parseChannel(notes: string): string[] {
  let p = parsed.get(notes);
  if (!p) {
    p = notes.trim().split(/\s+/);
    parsed.set(notes, p);
  }
  return p;
}

export const audio = new AudioEngine();

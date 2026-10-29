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

export type Track = 'titulo' | 'castelo' | 'lareira' | 'corredores' | 'ninar' | 'biblioteca' | 'quadros' | 'duelo' | 'final';

/** Músicas de passear pelo castelo: revezam sozinhas, em ordem meio aleatória. */
export const CASTELO_LISTA: Track[] = ['castelo', 'lareira', 'corredores', 'ninar'];

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
 * Instrumentos da trilha. Continuam simples (osciladores), mas cada um tem seu
 * envelope e timbre: celesta e sino brilham, harpa dedilha, cordas e coro sustentam.
 */
export type Instrument = 'celesta' | 'harpa' | 'cordas' | 'flauta' | 'sino' | 'baixo' | 'coro' | 'chip';

/**
 * Uma música: canais com uma nota por passo (colcheia). "-" é pausa, "." segura a nota anterior.
 * Cada canal tem seu próprio tamanho e repete sozinho.
 */
export interface Song {
  bpm: number;
  channels: { inst: Instrument; vol: number; notes: string }[];
}

/** Repete um trecho de partitura n vezes (para não escrever ". . . . ." à mão). */
const rep = (s: string, n: number) => Array(n).fill(s).join(' ');
/** Nota longa: a nota seguida de n-1 "." */
const hold = (note: string, n: number) => [note, ...Array(n - 1).fill('.')].join(' ');
const holds = (notes: string, n: number) => notes.split(' ').map((x) => hold(x, n)).join(' ');

/**
 * Partituras em loop [FICÇÃO: composições originais]. Clima de filme de magia:
 * valsas em tom menor, celesta brilhando por cima, harpa em arpejo e cordas ao fundo.
 */
export const SONGS: Record<Track, Song> = {
  // tela inicial: valsa misteriosa em mi menor (compasso 3/4, 6 colcheias por compasso)
  titulo: {
    bpm: 100,
    channels: [
      { inst: 'celesta', vol: 0.16, notes: 'E5 . . G5 B5 . A5 . G5 . F#5 . G5 . . E5 C5 . D#5 . . . B4 . E5 . . G5 C6 . B5 . A5 . G5 . F#5 . A5 . D#5 F#5 E5 . . . . -' },
      { inst: 'harpa', vol: 0.12, notes: 'E3 B3 E4 G4 B3 G3 D3 A3 D4 F#4 A3 F#3 C3 G3 C4 E4 G3 E3 B2 F#3 B3 D#4 F#3 D#3 C3 G3 C4 E4 G3 E3 E3 B3 E4 G4 B3 G3 B2 F#3 A3 D#4 A3 F#3 E3 B3 E4 G4 B4 -' },
      { inst: 'cordas', vol: 0.05, notes: holds('G4 F#4 E4 D#4 E4 G4 F#4 G4', 6) },
      { inst: 'cordas', vol: 0.045, notes: holds('B3 A3 C4 B3 C4 B3 B3 B3', 6) },
      { inst: 'sino', vol: 0.05, notes: `${rep('-', 22)} B6 ${rep('-', 23)} E7 ${rep('-', 49)}` },
    ],
  },
  // Ato 1: castelo encantado, sol maior com o "fá sustenido mágico" (modo lídio), 6/8 saltitante
  castelo: {
    bpm: 132,
    channels: [
      { inst: 'celesta', vol: 0.15, notes: 'B4 . D5 G5 . F#5 E5 . C#5 . D5 . B4 . D5 G5 . A5 B5 . . . . . C6 . B5 A5 . G5 F#5 . E5 . C#5 . D5 . E5 F#5 . A5 G5 . . . . -' },
      { inst: 'harpa', vol: 0.11, notes: 'G2 D3 G3 D3 B3 D3 A2 E3 A3 E3 C#4 E3 G2 D3 G3 D3 B3 D3 E2 B2 E3 B2 G3 B2 C3 G3 C4 G3 E4 G3 A2 E3 A3 E3 C#4 E3 D3 A3 D4 A3 F#4 A3 G2 D3 G3 D3 B3 D3' },
      { inst: 'flauta', vol: 0.06, notes: `${rep('-', 48)} D6 . . B5 . . C#6 . . A5 . . D6 . . G6 . . F#6 . . . . . E6 . . C6 . . C#6 . . A5 . . D6 . . F#6 . . G6 . . . . .` },
      { inst: 'cordas', vol: 0.035, notes: holds('G3 A3 G3 E3 C4 A3 D4 G3', 6) },
    ],
  },
  // castelo: perto da lareira, valsa lenta em fá maior com flauta e harpa
  lareira: {
    bpm: 92,
    channels: [
      { inst: 'flauta', vol: 0.08, notes: 'A4 . . G4 A4 C5 D5 . . C5 A4 . A#4 . . A4 G4 F4 G4 . . . . - A4 . . G4 A4 C5 E5 . . D5 C5 . D5 . C5 . A#4 G4 F4 . . . . -' },
      { inst: 'harpa', vol: 0.1, notes: 'F2 C3 F3 A3 C4 A3 D2 A2 D3 F3 A3 F3 A#2 F3 A#3 D4 F4 D4 C3 G3 C4 E4 G4 E4 F2 C3 F3 A3 C4 A3 A2 E3 A3 C4 E4 C4 A#2 F3 D4 C3 G3 E4 F2 C3 F3 A3 F3 C3' },
      { inst: 'celesta', vol: 0.05, notes: `${rep('-', 48)} F5 . . . . . A5 . . . . . G5 . . . . . E5 . . . . . F5 . . . . . C6 . . . . . A#5 . . G5 . . F5 . . . . .` },
      { inst: 'cordas', vol: 0.035, notes: holds('A3 A3 A#3 G3 A3 A3 A#3 A3', 6) },
      { inst: 'sino', vol: 0.03, notes: `${rep('-', 45)} C6 - -` },
    ],
  },
  // castelo: passeio pelos corredores, ré maior em 4/4 tranquilo
  corredores: {
    bpm: 100,
    channels: [
      { inst: 'celesta', vol: 0.12, notes: 'F#5 . E5 D5 . . A4 . B4 . C#5 D5 . . F#5 . G5 . F#5 E5 . . D5 . E5 . . . . . - - F#5 . E5 D5 . . A5 . A5 . F#5 E5 . . C#5 . B4 . D5 . C#5 . E5 . D5 . . . . . - -' },
      { inst: 'harpa', vol: 0.1, notes: 'D3 A3 D4 F#4 A4 F#4 D4 A3 B2 F#3 B3 D4 F#4 D4 B3 F#3 G2 D3 G3 B3 D4 B3 G3 D3 A2 E3 A3 C#4 E4 C#4 A3 E3 D3 A3 D4 F#4 A4 F#4 D4 A3 F#2 C#3 F#3 A3 C#4 A3 F#3 C#3 G2 D3 G3 B3 A2 E3 A3 C#4 D3 A3 D4 F#4 A4 - - -' },
      { inst: 'flauta', vol: 0.055, notes: `${rep('-', 64)} ${holds('A5 F#5 G5 E5 F#5 C#6', 8)} B5 . . . A5 . . . ${hold('D6', 8)}` },
      { inst: 'cordas', vol: 0.035, notes: holds('A3 B3 B3 C#4 A3 A3 B3 A3', 8) },
    ],
  },
  // castelo: canção de ninar de caixinha de música, dó maior em 6/8 bem calmo
  ninar: {
    bpm: 80,
    channels: [
      { inst: 'celesta', vol: 0.13, notes: 'E5 . . D5 . C5 A4 . . C5 . E5 F5 . . E5 . D5 D5 . . . . - E5 . . D5 . C5 B4 . . G4 . B4 A4 . C5 . B4 D5 C5 . . . . -' },
      { inst: 'harpa', vol: 0.09, notes: 'C3 G3 C4 G3 E4 G3 A2 E3 A3 E3 C4 E3 F2 C3 F3 C3 A3 C3 G2 D3 G3 D3 B3 D3 C3 G3 C4 G3 E4 G3 E2 B2 E3 B2 G3 B2 F2 C3 A3 G2 D3 B3 C3 G3 C4 G3 C4 -' },
      { inst: 'coro', vol: 0.04, notes: holds('G3 A3 A3 B3 G3 G3 A3 G3', 6) },
      { inst: 'sino', vol: 0.035, notes: `${rep('-', 21)} G6 ${rep('-', 26)}` },
    ],
  },
  // Ato 2: biblioteca calma e curiosa, lá menor com sexta maior (dórico), 4/4 lento
  biblioteca: {
    bpm: 84,
    channels: [
      { inst: 'flauta', vol: 0.09, notes: 'A4 . . C5 E5 . D5 . C5 . B4 . A4 . . . F#5 . . E5 D5 . C5 . B4 . . . E5 . . . A4 . . C5 E5 . A5 . G5 . F#5 . E5 . . . D5 . F#5 . E5 . C5 . A4 . . . . . - -' },
      { inst: 'harpa', vol: 0.1, notes: 'A2 E3 A3 C4 E4 C4 A3 E3 F2 C3 F3 A3 C4 A3 F3 C3 D3 A3 D4 F#4 A4 F#4 D4 A3 E2 B2 E3 G#3 B3 G#3 E3 B2 A2 E3 A3 C4 E4 C4 A3 E3 E2 B2 E3 G3 B3 G3 E3 B2 D3 A3 D4 F#4 A4 F#4 D4 A3 A2 E3 A3 C4 E4 A4 E4 C4' },
      { inst: 'cordas', vol: 0.045, notes: holds('E4 C4 F#4 E4 E4 G4 F#4 E4', 8) },
      { inst: 'celesta', vol: 0.06, notes: `${rep('-', 14)} E6 - ${rep('-', 14)} B6 - ${rep('-', 14)} A6 - ${rep('-', 12)} C7 - B6 -` },
    ],
  },
  // Ato 3: dentro dos quadros, escala de tons inteiros (sonho estranho), mi menor
  quadros: {
    bpm: 96,
    channels: [
      { inst: 'celesta', vol: 0.09, notes: 'E5 G#5 C6 G#5 E5 G#5 C6 G#5 D5 F#5 A#5 F#5 D5 F#5 A#5 F#5 C5 E5 G#5 E5 C5 E5 G#5 E5 D5 F#5 A#5 F#5 D5 F#5 A#5 D6' },
      { inst: 'flauta', vol: 0.07, notes: 'B4 . . . C5 . B4 . A#4 . . . . . . . G4 . . . A#4 . C5 . B4 . . . . . - - E5 . . . D5 . C5 . B4 . . . G#4 . . . A4 . . . C5 . E5 . D#5 . . . . . - -' },
      { inst: 'coro', vol: 0.05, notes: holds('E3 D3 C3 B2', 8) },
      { inst: 'baixo', vol: 0.14, notes: 'E2 - - - E2 - - - D2 - - - D2 - - - C2 - - - C2 - - - B1 - - - B1 - B1 -' },
    ],
  },
  // duelo com a Morgana: rápido, ré menor, cordas nervosas e celesta em alerta
  duelo: {
    bpm: 150,
    channels: [
      { inst: 'chip', vol: 0.06, notes: 'D5 D5 F5 D5 A5 D5 G5 F5 E5 E5 G5 E5 A#5 A5 G5 E5 F5 F5 A5 F5 C6 A5 G5 F5 E5 C#5 E5 G5 A5 . . .' },
      { inst: 'baixo', vol: 0.2, notes: 'D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 A#1 A#2 A#1 A#2 A#1 A#2 A#1 A#2 A1 A2 A1 A2 A1 A2 C#3 E3' },
      { inst: 'harpa', vol: 0.07, notes: 'D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4 A#3 D4 F4 D4 A#3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4' },
      { inst: 'cordas', vol: 0.045, notes: holds('A4 G4 F4 E4', 8) },
      { inst: 'sino', vol: 0.04, notes: `D6 ${rep('-', 31)}` },
    ],
  },
  // final e créditos: valsa festiva em dó maior, com sinos de comemoração
  final: {
    bpm: 112,
    channels: [
      { inst: 'celesta', vol: 0.15, notes: 'C5 . E5 G5 . C6 B5 . A5 . G5 . A5 . F5 . A5 C6 G5 . . . . . F5 . A5 C6 . F6 E6 . D6 . C6 . D6 . B5 . G5 D6 C6 . . . . -' },
      { inst: 'harpa', vol: 0.11, notes: 'C3 G3 C4 E4 G3 E3 G2 D3 G3 B3 D3 B2 F2 C3 F3 A3 C3 A2 C3 G3 C4 E4 G3 E3 F2 C3 F3 A3 C3 A2 C3 G3 C4 E4 G3 E3 G2 D3 G3 B3 F3 D3 C3 G3 C4 E4 G4 -' },
      { inst: 'cordas', vol: 0.045, notes: holds('E4 D4 C4 E4 C4 E4 D4 E4', 6) },
      { inst: 'sino', vol: 0.05, notes: `${rep('-', 18)} G6 - - C7 ${rep('-', 20)} E7 ${rep('-', 5)}` },
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
  /** Lista em revezamento (músicas do castelo) e quando trocar de faixa. */
  private lista?: Track[];
  private trocarEm = 0;
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
    // eco de salão de castelo: um pouco nos efeitos, mais na música (é o que dá o ar "mágico")
    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(ctx, 2.8);
    reverb.connect(this.master);
    const send = (from: GainNode, amount: number) => {
      const g = ctx.createGain();
      g.gain.value = amount;
      from.connect(g).connect(reverb);
    };
    send(this.musicBus, 0.55);
    send(this.sfxBus, 0.2);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    if (this.track) this.startSong();
    return ctx;
  }

  /** Resposta de sala: ruído em estéreo que some aos poucos. */
  private makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    return buf;
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
  /** Troca a música. Com restart, recomeça do início mesmo que já esteja tocando. */
  music(track: Track, restart = false): void {
    this.lista = undefined;
    if (track === this.track && !restart) return;
    this.track = track;
    if (this.ctx) this.startSong();
  }

  /**
   * Toca uma lista de músicas que se revezam: cada uma fica um minuto e pouco
   * e, no fim de uma volta, passa para outra sorteada, com uma troca bem suave.
   * Se já está tocando uma da lista, continua nela.
   */
  playlist(tracks: Track[]): void {
    const same = this.lista && this.track && tracks.includes(this.track);
    this.lista = tracks;
    if (same) return;
    this.track = sortear(tracks, this.track);
    if (this.ctx) this.startSong();
  }

  private startSong(suave = false): void {
    const ctx = this.ctx!;
    const old = this.songGain;
    if (old) {
      old.gain.setTargetAtTime(0.0001, ctx.currentTime, suave ? 1.2 : 0.25);
      setTimeout(() => old.disconnect(), suave ? 7000 : 1500);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    // instrumentos com ataque suave soam mais baixo que o chiptune antigo: ganho extra
    g.gain.setTargetAtTime(2, ctx.currentTime + (suave ? 1.5 : 0), suave ? 1 : 0.12);
    this.trocarEm = ctx.currentTime + 70 + Math.random() * 40;
    g.connect(this.musicBus!);
    this.songGain = g;
    this.step = 0;
    this.nextAt = ctx.currentTime + 0.06;
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
        this.musicNote(this.nextAt, ch.inst, noteHz(n), stepS * len * 0.92, ch.vol);
      }
      this.step++;
      this.nextAt += stepS;
      // fim de uma volta da música: na lista do castelo, pode ser hora de trocar
      if (this.lista && this.step % songLength(song) === 0 && ctx.currentTime >= this.trocarEm) {
        this.track = sortear(this.lista, this.track);
        this.startSong(true);
        return;
      }
    }
  }

  /** Uma nota de um instrumento da trilha (ver Instrument). */
  private musicNote(t: number, inst: Instrument, hz: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.connect(this.songGain!);
    let end = t + dur;
    const partial = (wave: Wave, mult: number, level: number, detune = 0, decay?: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = wave;
      o.frequency.value = hz * mult;
      o.detune.value = detune;
      g.gain.value = level;
      if (decay) {
        g.gain.setValueAtTime(level, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      }
      o.connect(g).connect(out);
      o.start(t);
      return o;
    };
    const vibrato = (oscs: OscillatorNode[], rate: number, cents: number, delay: number) => {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = rate;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(cents, t + delay);
      lfo.connect(lg);
      for (const o of oscs) lg.connect(o.detune);
      lfo.start(t);
      return lfo;
    };
    // ataque e queda: "toque" (soa e vai sumindo) ou "sopro" (sobe, segura e solta)
    const strike = (ring: number) => {
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      out.gain.exponentialRampToValueAtTime(0.0001, t + ring);
      end = t + ring;
    };
    const swell = (attack: number, release: number) => {
      out.gain.setValueAtTime(0.0001, t);
      out.gain.linearRampToValueAtTime(vol, t + Math.min(attack, dur * 0.8));
      out.gain.setValueAtTime(vol, t + Math.max(dur, attack));
      out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack) + release);
      end = t + Math.max(dur, attack) + release;
    };
    const oscs: OscillatorNode[] = [];
    switch (inst) {
      case 'celesta':
        oscs.push(partial('sine', 1, 1), partial('sine', 4, 0.3, 0, 0.2), partial('triangle', 2, 0.12));
        strike(Math.max(dur, 1.3));
        break;
      case 'sino':
        oscs.push(partial('sine', 1, 1), partial('sine', 2.76, 0.45, 0, 0.9), partial('sine', 5.4, 0.2, 0, 0.4));
        strike(2.6);
        break;
      case 'harpa':
        oscs.push(partial('triangle', 1, 1), partial('sine', 2, 0.25, 0, 0.3));
        strike(Math.max(dur, 0.9));
        break;
      case 'cordas': {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 1500;
        out.disconnect();
        out.connect(f).connect(this.songGain!);
        oscs.push(partial('sawtooth', 1, 0.5, -7), partial('sawtooth', 1, 0.5, 7));
        swell(0.35, 0.45);
        break;
      }
      case 'coro': {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 900;
        out.disconnect();
        out.connect(f).connect(this.songGain!);
        oscs.push(partial('triangle', 1, 0.6, -5), partial('triangle', 1, 0.6, 5), partial('sine', 2, 0.25));
        swell(0.6, 0.7);
        break;
      }
      case 'flauta':
        oscs.push(partial('sine', 1, 1), partial('triangle', 2, 0.12));
        swell(0.06, 0.12);
        break;
      case 'baixo':
        oscs.push(partial('triangle', 1, 1));
        swell(0.01, 0.08);
        break;
      case 'chip':
        oscs.push(partial('square', 1, 1));
        swell(0.01, 0.06);
        break;
    }
    if (inst === 'flauta' || inst === 'cordas' || inst === 'coro') {
      vibrato(oscs, inst === 'coro' ? 4.5 : 5.2, 9, 0.25).stop(end + 0.05);
    }
    for (const o of oscs) o.stop(end + 0.05);
  }
}

/** Passos de uma volta completa da música (o canal mais longo). */
export function songLength(song: Song): number {
  return Math.max(...song.channels.map((c) => parseChannel(c.notes).length));
}

/** Sorteia uma faixa da lista, sem repetir a que está tocando. */
export function sortear(tracks: Track[], atual?: Track): Track {
  const outras = tracks.length > 1 ? tracks.filter((t) => t !== atual) : tracks;
  return outras[Math.floor(Math.random() * outras.length)];
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

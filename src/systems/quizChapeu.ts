import type { GameState } from '../core/GameState';
import type { DialogueDef, DialogueNode } from '../types/content';

/** Casas na ordem das mesas do Grande Salão (também desempata quando nada mais desempata). */
export const QUIZ_CASAS = ['coragem', 'astucia', 'lealdade', 'inteligencia'] as const;

/** content/quiz-chapeu.json: o banco de perguntas do Chapéu das Virtudes. */
export interface QuizDef {
  /** Quantas perguntas o chapéu sorteia a cada quiz. */
  quantas: number;
  perguntas: { id: string; texto: string; respostas: { texto: string; casa: string }[] }[];
}

const FILA = 'quiz:fila';
const ATUAL = 'quiz:atual';
const ULTIMA = 'quiz:ultima';
export const QUIZ_CASA = 'quiz:casa';
const pontos = (casa: string) => `quiz:${casa}`;
const no = (id: string) => `quiz-p-${id}`;

/**
 * Começa (ou recomeça) o quiz: zera os pontos e sorteia "quantas" perguntas diferentes do banco.
 * A fila fica nas flags (texto "id,id,..."), então o quiz sobrevive a um save no meio.
 */
export function sortearQuiz(s: GameState, ids: string[], quantas: number, rnd: () => number = Math.random): void {
  for (const c of QUIZ_CASAS) s.flags[pontos(c)] = 0;
  s.flags[ULTIMA] = '';
  s.flags[QUIZ_CASA] = '';
  const bolo = [...ids];
  for (let i = bolo.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [bolo[i], bolo[j]] = [bolo[j], bolo[i]];
  }
  s.flags[FILA] = bolo.slice(0, quantas).join(',');
}

/** Tira a próxima pergunta da fila (em quiz:atual); sem perguntas, quiz:atual vira "fim". */
export function proximaPergunta(s: GameState): void {
  const fila = String(s.flags[FILA] ?? '').split(',').filter(Boolean);
  s.flags[ATUAL] = fila.shift() ?? 'fim';
  s.flags[FILA] = fila.join(',');
}

/** Casa com mais respostas; no empate, a da última resposta (se estiver no empate), senão a ordem das mesas. */
export function resultadoQuiz(s: GameState): string {
  const n = (c: string) => Number(s.flags[pontos(c)] ?? 0);
  const top = Math.max(...QUIZ_CASAS.map(n));
  const empatadas = QUIZ_CASAS.filter((c) => n(c) === top);
  const ultima = String(s.flags[ULTIMA] ?? '');
  const casa = empatadas.includes(ultima as (typeof QUIZ_CASAS)[number]) ? ultima : empatadas[0];
  s.flags[QUIZ_CASA] = casa;
  return casa;
}

/**
 * Coloca o banco de perguntas dentro do diálogo do Ministro: uma fala por pergunta, uma fala
 * invisível ("quiz-proxima") que escolhe a próxima da fila, e o sorteio na fala "quiz-inicio".
 */
export function montarQuiz(def: DialogueDef, quiz: QuizDef): DialogueDef {
  const nodes: Record<string, DialogueNode> = { ...def.nodes };
  const inicio = nodes['quiz-inicio'];
  if (!inicio) throw new Error(`diálogo ${def.id}: falta a fala "quiz-inicio"`);
  nodes['quiz-inicio'] = {
    ...inicio,
    effects: [...(inicio.effects ?? []), { quizSortear: quiz.perguntas.map((p) => p.id), quantas: quiz.quantas }],
    next: 'quiz-proxima',
  };
  nodes['quiz-proxima'] = {
    text: '',
    pular: true,
    effects: [{ quizProxima: true }],
    nextIf: quiz.perguntas.map((p) => ({ when: { flag: ATUAL, eq: p.id }, next: no(p.id) })),
    next: 'quiz-fim',
  };
  for (const p of quiz.perguntas) {
    nodes[no(p.id)] = {
      speaker: 'Chapéu das Virtudes',
      text: p.texto,
      cena: 'chapeu',
      choices: p.respostas.map((r) => ({
        text: r.texto,
        next: 'quiz-proxima',
        effects: [{ addFlag: pontos(r.casa) }, { setFlag: ULTIMA, value: r.casa }],
      })),
    };
  }
  const fim = nodes['quiz-fim'];
  if (!fim) throw new Error(`diálogo ${def.id}: falta a fala "quiz-fim"`);
  nodes['quiz-fim'] = { ...fim, effects: [...(fim.effects ?? []), { quizResultado: true }] };
  return { ...def, nodes };
}

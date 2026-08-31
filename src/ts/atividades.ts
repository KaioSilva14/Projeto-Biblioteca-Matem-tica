// atividades.ts — lógica das atividades e feedbacks de resposta.
export {};

// atividades.ts
// Motor genérico de atividades: carregar, renderizar, validar, dar feedback e avançar.
// A mesma lógica serve para qualquer conteúdo — nada aqui é específico de Frações.

import type { Atividade } from "./types.js";
import { normalizarNumero, compararNumeros } from "./matematica.js";
import { normalizarTexto } from "./utils.js";

// ---------- Funções de correção (uma por tipo de atividade) ----------

export function validarMultiplaEscolha(atividade: Extract<Atividade, { tipo: "multipla_escolha" }>, respostaIndice: number): boolean {
  return respostaIndice === atividade.resposta;
}

export function validarRespostaNumerica(
  atividade: Extract<Atividade, { tipo: "resposta_numerica" | "problema" }>,
  respostaTexto: string
): boolean {
  const valor = normalizarNumero(respostaTexto);
  if (Number.isNaN(valor)) {
    return false;
  }
  return compararNumeros(valor, atividade.resposta, atividade.tolerancia ?? 0.01);
}

export function validarVerdadeiroFalso(
  atividade: Extract<Atividade, { tipo: "verdadeiro_falso" }>,
  resposta: boolean | null
): boolean {
  return resposta !== null && resposta === atividade.resposta;
}

export function validarComplete(atividade: Extract<Atividade, { tipo: "complete" }>, respostaTexto: string): boolean {
  return normalizarTexto(respostaTexto) === normalizarTexto(atividade.resposta);
}

export function validarOrdenacao(atividade: Extract<Atividade, { tipo: "ordenacao" }>, ordemAluno: number[]): boolean {
  if (ordemAluno.length !== atividade.ordemCorreta.length) {
    return false;
  }
  return ordemAluno.every((indice, posicao) => indice === atividade.ordemCorreta[posicao]);
}

export function validarEncontreErro(atividade: Extract<Atividade, { tipo: "encontre_erro" }>, indiceEscolhido: number): boolean {
  return indiceEscolhido === atividade.resposta;
}

export function validarRelacionamento(
  atividade: Extract<Atividade, { tipo: "relacionamento" }>,
  paresAluno: number[]
): boolean {
  if (paresAluno.length !== atividade.paresCorretos.length) {
    return false;
  }
  return paresAluno.every((valor, indice) => valor === atividade.paresCorretos[indice]);
}

/**
 * Função central de correção: identifica o tipo da atividade (união discriminada)
 * e delega para o validador correspondente. Não usa "any" em nenhum ponto.
 */
export function corrigirAtividade(atividade: Atividade, respostaAluno: unknown): boolean {
  switch (atividade.tipo) {
    case "multipla_escolha":
      return validarMultiplaEscolha(atividade, respostaAluno as number);
    case "resposta_numerica":
    case "problema":
      return validarRespostaNumerica(atividade, String(respostaAluno ?? ""));
    case "verdadeiro_falso":
      return validarVerdadeiroFalso(atividade, respostaAluno as boolean | null);
    case "complete":
      return validarComplete(atividade, String(respostaAluno ?? ""));
    case "ordenacao":
      return validarOrdenacao(atividade, respostaAluno as number[]);
    case "encontre_erro":
      return validarEncontreErro(atividade, respostaAluno as number);
    case "relacionamento":
      return validarRelacionamento(atividade, respostaAluno as number[]);
  }
}

// ---------- Sessão de atividades (estado da rodada em andamento) ----------

export interface EstadoSessao {
  conteudoId: string;
  atividades: Atividade[];
  indiceAtual: number;
  jaErrouAtividadeAtual: boolean;
  acertos: number;
  erros: number;
}

export function iniciarSessao(conteudoId: string, atividades: Atividade[], indiceInicial = 0): EstadoSessao {
  return {
    conteudoId,
    atividades,
    indiceAtual: indiceInicial,
    jaErrouAtividadeAtual: false,
    acertos: 0,
    erros: 0,
  };
}

export function atividadeAtual(estado: EstadoSessao): Atividade | null {
  return estado.atividades[estado.indiceAtual] ?? null;
}

export function sessaoConcluida(estado: EstadoSessao): boolean {
  return estado.indiceAtual >= estado.atividades.length;
}

export interface ResultadoResposta {
  correta: boolean;
  primeiraTentativa: boolean;
}

/**
 * Processa a resposta do aluno para a atividade atual.
 * Na primeira tentativa errada, permite tentar de novo (não conta como avanço).
 * Na segunda tentativa (certa ou errada), sempre libera avançar.
 */
export function processarResposta(estado: EstadoSessao, respostaAluno: unknown): ResultadoResposta {
  const atividade = atividadeAtual(estado);
  if (!atividade) {
    return { correta: false, primeiraTentativa: true };
  }

  const correta = corrigirAtividade(atividade, respostaAluno);
  const primeiraTentativa = !estado.jaErrouAtividadeAtual;

  if (correta) {
    estado.acertos += 1;
  } else if (primeiraTentativa) {
    estado.jaErrouAtividadeAtual = true;
  } else {
    estado.erros += 1;
  }

  return { correta, primeiraTentativa };
}

/** Avança para a próxima atividade da sessão, reiniciando o estado de tentativa. */
export function avancarAtividade(estado: EstadoSessao): EstadoSessao {
  return {
    ...estado,
    indiceAtual: estado.indiceAtual + 1,
    jaErrouAtividadeAtual: false,
  };
}

/**
 * Registra que o aluno optou por ver a explicação em vez de tentar novamente
 * após a primeira resposta errada. Conta como erro na atividade atual.
 */
export function registrarDesistencia(estado: EstadoSessao): EstadoSessao {
  return { ...estado, erros: estado.erros + 1 };
}

/** Nome de exibição da sessão (bloco de 10/10/10/5) a que uma atividade pertence. */
export function nomeDaSessao(nivel: Atividade["nivel"]): string {
  switch (nivel) {
    case "basico":
      return "Sessão 1 — Fundamentos";
    case "intermediario":
      return "Sessão 2 — Prática";
    case "aplicacao":
      return "Sessão 3 — Aplicação";
    case "desafio":
      return "Desafio";
  }
}
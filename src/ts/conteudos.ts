// conteudos.ts — carregamento e apresentação dos conteúdos didáticos.
export {};

// conteudos.ts
// Carregamento e tipagem dos dados de conteúdo (teoria, exemplos, vídeos, atividades).
// Os dados ficam em JSON dentro de public/data/ — separados da lógica e da interface.

import type { Conteudo, ConteudoResumo } from "./types.js";

/**
 * Carrega o índice geral de conteúdos (usado na Home, nas páginas de ano e na busca).
 * Retorna uma lista vazia em caso de falha, para a interface não quebrar.
 */
export async function carregarIndiceGeral(): Promise<ConteudoResumo[]> {
  try {
    const resposta = await fetch("/data/indice-geral.json");
    if (!resposta.ok) {
      return [];
    }
    const dados = (await resposta.json()) as unknown;
    if (!Array.isArray(dados)) {
      return [];
    }
    return dados as ConteudoResumo[];
  } catch {
    return [];
  }
}

/** Filtra o índice geral por ano escolar. */
export function filtrarPorAno(indice: ConteudoResumo[], ano: number): ConteudoResumo[] {
  return indice.filter((item) => item.ano === ano);
}

/**
 * Carrega o conteúdo completo (teoria, exemplos, vídeos, atividades) a partir de
 * uma URL de dados JSON. Retorna null se o arquivo não existir ou estiver inválido.
 */
export async function carregarConteudo(caminhoJson: string): Promise<Conteudo | null> {
  try {
    const resposta = await fetch(caminhoJson);
    if (!resposta.ok) {
      return null;
    }
    const dados = (await resposta.json()) as unknown;
    if (!ehConteudoValido(dados)) {
      return null;
    }
    return dados;
  } catch {
    return null;
  }
}

/** Checagem básica de formato antes de confiar nos dados carregados. */
function ehConteudoValido(valor: unknown): valor is Conteudo {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const registro = valor as Record<string, unknown>;
  return (
    typeof registro.id === "string" &&
    typeof registro.titulo === "string" &&
    Array.isArray(registro.atividades) &&
    Array.isArray(registro.teoria)
  );
}
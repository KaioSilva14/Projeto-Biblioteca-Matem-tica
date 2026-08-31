// busca.ts — busca de conteúdos na Biblioteca Matemática.
export {};

// busca.ts
// Busca global por nome, descrição, categoria e ano.

import type { ConteudoResumo } from "./types.js";
import { normalizarTexto } from "./utils.js";

const NOMES_ANO: Record<number, string> = {
  6: "6º ano",
  7: "7º ano",
  8: "8º ano",
  9: "9º ano",
};

/**
 * Retorna os itens do índice cujo título, descrição, categoria ou ano
 * casam com o termo buscado (comparação sem acento e sem diferenciar maiúsculas).
 */
export function buscarNoIndice(indice: ConteudoResumo[], termo: string): ConteudoResumo[] {
  const termoNormalizado = normalizarTexto(termo);
  if (termoNormalizado === "") {
    return [];
  }
  return indice.filter((item) => {
    const campos = [
      item.titulo,
      item.descricao,
      item.categoria,
      NOMES_ANO[item.ano] ?? String(item.ano),
    ];
    return campos.some((campo) => normalizarTexto(campo).includes(termoNormalizado));
  });
}
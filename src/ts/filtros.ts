// filtros.ts — filtros de ano, assunto e tipo de conteúdo.
export {};

// filtros.ts
// Filtros por categoria e nível, usados nas páginas de ano.

import type { CategoriaConteudo, ConteudoResumo, NivelAtividade } from "./types.js";

export type FiltroCategoria = CategoriaConteudo | "todas";
export type FiltroNivel = NivelAtividade | "todos";

export function filtrarPorCategoria(
  lista: ConteudoResumo[],
  categoria: FiltroCategoria
): ConteudoResumo[] {
  if (categoria === "todas") {
    return lista;
  }
  return lista.filter((item) => item.categoria === categoria);
}

export function filtrarPorNivel(lista: ConteudoResumo[], nivel: FiltroNivel): ConteudoResumo[] {
  if (nivel === "todos") {
    return lista;
  }
  return lista.filter((item) => item.nivel === nivel);
}

export function aplicarFiltros(
  lista: ConteudoResumo[],
  filtros: { categoria: FiltroCategoria; nivel: FiltroNivel }
): ConteudoResumo[] {
  return filtrarPorNivel(filtrarPorCategoria(lista, filtros.categoria), filtros.nivel);
}
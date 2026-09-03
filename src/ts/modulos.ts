// modulos.ts
// Resolução da trilha de módulos de um conteúdo (v2).
//
// O JSON declara módulos, e cada módulo intercala teoria, exemplos, vídeos,
// dicas e LOTES de atividades. As atividades continuam vivendo numa lista
// única em Conteudo.atividades (com id próprio); o módulo só referencia os ids.
// Isso mantém duas propriedades importantes:
//   - o progresso continua sendo um índice simples numa lista ordenada;
//   - montar uma matéria nova continua sendo só escrever JSON.
//
// Nada aqui é específico de Frações.

import type { Atividade, Conteudo, ItemModulo, Modulo } from "./types.js";

export interface LoteAtividades {
  titulo: string;
  atividades: Atividade[];
  /** Posição da primeira atividade do lote na ordem global do conteúdo. */
  indiceGlobalInicial: number;
}

export interface ModuloResolvido {
  modulo: Modulo;
  /** Itens do módulo na ordem declarada, com os lotes já resolvidos. */
  itens: ItemResolvido[];
  /** Todas as atividades do módulo, na ordem em que aparecem. */
  atividades: Atividade[];
  indiceGlobalInicial: number;
  indiceGlobalFinal: number; // exclusivo
}

export type ItemResolvido =
  | { tipo: "teoria" | "exemplo" | "video" | "dica"; item: ItemModulo }
  | { tipo: "atividades"; lote: LoteAtividades };

/**
 * Resolve os módulos declarados no JSON, trocando ids de atividade pelas
 * atividades reais e calculando a posição global de cada uma.
 *
 * Ids que não existem em Conteudo.atividades são simplesmente ignorados —
 * um JSON com erro de digitação exibe menos atividades, mas nunca quebra
 * a página do aluno.
 */
export function resolverModulos(conteudo: Conteudo): ModuloResolvido[] {
  if (!conteudo.modulos || conteudo.modulos.length === 0) {
    return [];
  }

  const porId = new Map<number, Atividade>();
  for (const atividade of conteudo.atividades) {
    porId.set(atividade.id, atividade);
  }

  const resolvidos: ModuloResolvido[] = [];
  let contadorGlobal = 0;

  for (const modulo of conteudo.modulos) {
    const inicioModulo = contadorGlobal;
    const itens: ItemResolvido[] = [];
    const atividadesDoModulo: Atividade[] = [];

    for (const item of modulo.itens) {
      if (item.tipo !== "atividades") {
        itens.push({ tipo: item.tipo, item });
        continue;
      }

      const doLote: Atividade[] = [];
      for (const id of item.ids) {
        const atividade = porId.get(id);
        if (atividade) {
          doLote.push(atividade);
        }
      }
      if (doLote.length === 0) {
        continue;
      }

      itens.push({
        tipo: "atividades",
        lote: {
          titulo: item.titulo,
          atividades: doLote,
          indiceGlobalInicial: contadorGlobal,
        },
      });
      atividadesDoModulo.push(...doLote);
      contadorGlobal += doLote.length;
    }

    resolvidos.push({
      modulo,
      itens,
      atividades: atividadesDoModulo,
      indiceGlobalInicial: inicioModulo,
      indiceGlobalFinal: contadorGlobal,
    });
  }

  return resolvidos;
}

/**
 * Lista de atividades na ordem CANÔNICA do conteúdo.
 *
 * Com módulos, a ordem que vale é a da trilha — é ela que o índice de
 * progresso no localStorage referencia. Sem módulos (conteúdo antigo ainda
 * não convertido), vale a ordem da lista original.
 */
export function ordemGlobalDeAtividades(conteudo: Conteudo): Atividade[] {
  const resolvidos = resolverModulos(conteudo);
  if (resolvidos.length === 0) {
    return conteudo.atividades;
  }
  return resolvidos.flatMap((resolvido) => resolvido.atividades);
}

/** Encontra o módulo que contém a atividade de índice global informado. */
export function moduloDoIndiceGlobal(
  resolvidos: ModuloResolvido[],
  indiceGlobal: number
): ModuloResolvido | null {
  for (const resolvido of resolvidos) {
    if (indiceGlobal >= resolvido.indiceGlobalInicial && indiceGlobal < resolvido.indiceGlobalFinal) {
      return resolvido;
    }
  }
  return null;
}

/** Encontra o lote que contém a atividade de índice global informado. */
export function loteDoIndiceGlobal(
  resolvidos: ModuloResolvido[],
  indiceGlobal: number
): LoteAtividades | null {
  for (const resolvido of resolvidos) {
    for (const item of resolvido.itens) {
      if (item.tipo !== "atividades") {
        continue;
      }
      const inicio = item.lote.indiceGlobalInicial;
      if (indiceGlobal >= inicio && indiceGlobal < inicio + item.lote.atividades.length) {
        return item.lote;
      }
    }
  }
  return null;
}

export interface ProblemaTrilha {
  tipo: "id-inexistente" | "id-repetido" | "atividade-orfa";
  detalhe: string;
}

/**
 * Confere a integridade da trilha: todo id citado existe, nenhum id aparece
 * em dois lotes e nenhuma atividade fica de fora da trilha.
 *
 * Usado pelos testes e pelo script de verificação de conteúdo. É a rede de
 * segurança que impede uma matéria nova de ser publicada com uma atividade
 * inalcançável ou contada duas vezes no progresso.
 */
export function verificarTrilha(conteudo: Conteudo): ProblemaTrilha[] {
  const problemas: ProblemaTrilha[] = [];
  if (!conteudo.modulos || conteudo.modulos.length === 0) {
    return problemas;
  }

  const idsExistentes = new Set(conteudo.atividades.map((atividade) => atividade.id));
  const vistos = new Set<number>();

  for (const modulo of conteudo.modulos) {
    for (const item of modulo.itens) {
      if (item.tipo !== "atividades") {
        continue;
      }
      for (const id of item.ids) {
        if (!idsExistentes.has(id)) {
          problemas.push({
            tipo: "id-inexistente",
            detalhe: `Módulo "${modulo.titulo}" cita a atividade ${id}, que não existe.`,
          });
          continue;
        }
        if (vistos.has(id)) {
          problemas.push({
            tipo: "id-repetido",
            detalhe: `A atividade ${id} aparece em mais de um lote.`,
          });
          continue;
        }
        vistos.add(id);
      }
    }
  }

  for (const atividade of conteudo.atividades) {
    if (!vistos.has(atividade.id)) {
      problemas.push({
        tipo: "atividade-orfa",
        detalhe: `A atividade ${atividade.id} não aparece em nenhum módulo.`,
      });
    }
  }

  return problemas;
}

// ferramentas/manifesto-imagens.mjs
//
// Lista de todas as imagens do site. Cada entrada vira um PNG em
// public/assets/<pasta>/<id>.png e uma linha em public/dados/imagens.json.
//
// Regra do "alt": descreve o que a figura MOSTRA, nunca a resposta da
// questão. A imagem apoia o enunciado; ela não pode entregar o resultado
// para quem usa leitor de tela.
//
// Regra do desenho: a figura não pode dar a resposta de graça. Numa questão
// que pergunta "qual é maior", as barras aparecem sem rótulo de fração; numa
// que pede um cálculo, a figura mostra o cenário, não o resultado.

import {
  roda, barra, barrasComparadas, barrasEmpilhadas, rodasComparadas,
  grade, reta, retaDecimal, colecao, recipientes, barraEtapas, corteDuplo,
  barraCategorias, precoPorParte, quadroOrdens, contaArmada,
} from "./desenhos.mjs";

/** Colunas do quadro de ordens usadas nas licoes de decimais. */
const ORDENS = ["unidades", "décimos", "centésimos", "milésimos"];
const ORDENS_DEZ = ["dezenas", "unidades", "décimos", "centésimos"];

export const MANIFESTO = [
  // ───────────────────────── Lição 1 — O que uma fração quer dizer
  {
    id: "ideia-o-que-e",
    pasta: "licoes",
    alt: "Barra dividida em 4 partes iguais, com a primeira preenchida.",
    desenho: () => barra({ partes: 4, pintadas: 1, rotulo: "1 parte de 4 = um quarto" }),
  },
  {
    id: "res-o-que-e",
    pasta: "licoes",
    alt: "Barra de chocolate dividida em 6 pedaços iguais, com 2 preenchidos.",
    desenho: () => barra({ partes: 6, pintadas: 2, rotulo: "a barra cortada em 6 pedaços" }),
  },
  {
    id: "q-pizza-8-3",
    pasta: "questoes",
    alt: "Pizza dividida em 8 fatias iguais, com 3 fatias preenchidas.",
    desenho: () => roda({ partes: 8, pintadas: 3 }),
  },
  {
    id: "q-ovos-12-5",
    pasta: "questoes",
    alt: "Doze círculos representando ovos, com 5 preenchidos.",
    desenho: () => colecao({ total: 12, destacados: 5, porLinha: 6 }),
  },
  {
    id: "q-grade-10-3",
    pasta: "questoes",
    alt: "Retângulo dividido em 10 partes iguais (5 colunas por 2 linhas), com 3 preenchidas.",
    desenho: () => grade({ colunas: 5, linhas: 2, pintadas: 3 }),
  },
  {
    id: "q-pizza-8-vazia",
    pasta: "questoes",
    alt: "Pizza dividida em 8 fatias iguais, nenhuma preenchida.",
    desenho: () => roda({ partes: 8, pintadas: 0 }),
  },

  // ───────────────────────── Lição 2 — Fração é um número
  {
    id: "ideia-reta",
    pasta: "licoes",
    alt: "Reta numérica de 0 a 1 dividida em 4 partes iguais, sem ponto marcado.",
    desenho: () => reta({ denominador: 4, marcado: null }),
  },
  {
    id: "res-reta-vazia",
    pasta: "licoes",
    alt: "Reta numérica de 0 a 1 dividida em 8 partes iguais, sem ponto marcado.",
    desenho: () => reta({ denominador: 8, marcado: null }),
  },
  {
    id: "q-reta-5-3",
    pasta: "questoes",
    alt: "Reta numérica de 0 a 1 dividida em 5 partes iguais, com um ponto marcado no terceiro tracinho.",
    desenho: () => reta({ denominador: 5, marcado: 3 }),
  },
  {
    id: "q-reta-4-4",
    pasta: "questoes",
    alt: "Reta numérica de 0 a 1 dividida em 4 partes iguais, com um ponto marcado exatamente sobre o número 1.",
    desenho: () => reta({ denominador: 4, marcado: 4 }),
  },
  {
    id: "q-reta-6-vazia",
    pasta: "questoes",
    alt: "Reta numérica de 0 a 1 dividida em 6 partes iguais, sem ponto marcado.",
    desenho: () => reta({ denominador: 6, marcado: null }),
  },
  {
    id: "q-reta-8-6",
    pasta: "questoes",
    alt: "Reta numérica de 0 a 1 dividida em 8 partes iguais, com um ponto marcado no sexto tracinho.",
    desenho: () => reta({ denominador: 8, marcado: 6 }),
  },

  // ───────────────────────── Lição 3 — Duas escritas, o mesmo número
  {
    id: "ideia-equivalentes",
    pasta: "licoes",
    alt: "Retângulo dividido em 2 colunas com 1 preenchida, e duas linhas tracejadas atravessando a figura.",
    desenho: () => corteDuplo({ colunas: 2, pintadasColunas: 1, cortes: 3, rotulo: "a mesma metade, cortada em três" }),
  },
  {
    id: "res-equivalentes",
    pasta: "licoes",
    alt: "Retângulo dividido em 3 colunas com 2 preenchidas, e linhas tracejadas que o cortam em 12 partes.",
    desenho: () => corteDuplo({ colunas: 3, pintadasColunas: 2, cortes: 4, rotulo: "2/3 recortado em doze avos" }),
  },
  {
    id: "q-corte-2-3",
    pasta: "questoes",
    alt: "Retângulo dividido em 3 colunas com 2 preenchidas, atravessado por linhas tracejadas que formam 12 partes iguais.",
    desenho: () => corteDuplo({ colunas: 3, pintadasColunas: 2, cortes: 4 }),
  },
  {
    id: "q-equiv-barras",
    pasta: "questoes",
    alt: "Duas barras de mesmo comprimento: a de cima dividida em 2 partes com 1 preenchida, a de baixo em 6 partes com 3 preenchidas.",
    desenho: () => barrasEmpilhadas({
      itens: [
        { partes: 2, pintadas: 1, rotulo: "barra de cima" },
        { partes: 6, pintadas: 3, rotulo: "barra de baixo" },
      ],
    }),
  },
  {
    id: "q-equiv-1-4",
    pasta: "questoes",
    alt: "Barra dividida em 4 partes iguais com 1 preenchida.",
    desenho: () => barra({ partes: 4, pintadas: 1, rotulo: "um quarto" }),
  },
  {
    id: "q-equiv-6-10",
    pasta: "questoes",
    alt: "Barra dividida em 10 partes iguais, com 6 preenchidas.",
    desenho: () => barra({ partes: 10, pintadas: 6 }),
  },

  // ───────────────────────── Lição 4 — Escrever do jeito mais simples
  {
    id: "ideia-simplificar",
    pasta: "licoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 12 partes com 8 preenchidas, outra em 3 partes com 2 preenchidas.",
    desenho: () => barrasEmpilhadas({
      itens: [
        { partes: 12, pintadas: 8, rotulo: "8/12" },
        { partes: 3, pintadas: 2, rotulo: "2/3" },
      ],
    }),
  },
  {
    id: "res-simplificar",
    pasta: "licoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 24 partes com 18 preenchidas, outra em 4 partes com 3 preenchidas.",
    desenho: () => barrasEmpilhadas({
      itens: [
        { partes: 24, pintadas: 18, rotulo: "18/24" },
        { partes: 4, pintadas: 3, rotulo: "3/4" },
      ],
    }),
  },
  {
    id: "q-simp-12-16",
    pasta: "questoes",
    alt: "Barra dividida em 16 partes iguais, com 12 preenchidas.",
    desenho: () => barra({ partes: 16, pintadas: 12 }),
  },
  {
    id: "q-simp-quais",
    pasta: "questoes",
    alt: "Quatro barras de mesmo comprimento, divididas respectivamente em 9, 8, 15 e 12 partes, com 7, 6, 10 e 9 preenchidas.",
    desenho: () => barrasEmpilhadas({
      largura: 470,
      rotuloEsquerda: true,
      itens: [
        { partes: 9, pintadas: 7, rotulo: "7/9" },
        { partes: 8, pintadas: 6, rotulo: "6/8" },
        { partes: 15, pintadas: 10, rotulo: "10/15" },
        { partes: 12, pintadas: 9, rotulo: "9/12" },
      ],
    }),
  },
  {
    id: "q-simp-24-36",
    pasta: "questoes",
    alt: "Barra dividida em 36 partes iguais, com 24 preenchidas.",
    desenho: () => barra({ partes: 36, pintadas: 24, largura: 460 }),
  },
  {
    id: "q-simp-turma",
    pasta: "questoes",
    alt: "Trinta círculos representando os alunos de uma turma, com 18 preenchidos.",
    desenho: () => colecao({ total: 30, destacados: 18, porLinha: 10, rotulo: "30 alunos · 18 meninas" }),
  },

  // ───────────────────────── Lição 5 — Qual das duas é maior
  {
    id: "ideia-comparar",
    pasta: "licoes",
    alt: "Duas pizzas do mesmo tamanho: uma cortada em 3 fatias com 1 preenchida, outra em 5 fatias com 1 preenchida.",
    desenho: () => rodasComparadas({
      itens: [
        { partes: 3, pintadas: 1, rotulo: "1/3" },
        { partes: 5, pintadas: 1, rotulo: "1/5" },
      ],
    }),
  },
  {
    id: "res-comparar",
    pasta: "licoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 8 partes com 5 preenchidas, outra em 11 partes com 7 preenchidas.",
    desenho: () => barrasComparadas({
      a: { partes: 8, pintadas: 5, rotulo: "5/8" },
      b: { partes: 11, pintadas: 7, rotulo: "7/11" },
    }),
  },
  {
    id: "q-comp-2-3-3-5",
    pasta: "questoes",
    alt: "Duas barras de mesmo comprimento: a de cima dividida em 3 partes com 2 preenchidas, a de baixo em 5 partes com 3 preenchidas.",
    desenho: () => barrasEmpilhadas({
      itens: [
        { partes: 3, pintadas: 2, rotulo: "2/3" },
        { partes: 5, pintadas: 3, rotulo: "3/5" },
      ],
    }),
  },
  {
    id: "q-comp-1-5-1-8",
    pasta: "questoes",
    alt: "Duas pizzas do mesmo tamanho: uma cortada em 5 fatias com 1 preenchida, outra em 8 fatias com 1 preenchida.",
    desenho: () => rodasComparadas({
      itens: [
        { partes: 5, pintadas: 1, rotulo: "cortada em 5" },
        { partes: 8, pintadas: 1, rotulo: "cortada em 8" },
      ],
    }),
  },
  {
    id: "q-comp-ordem",
    pasta: "questoes",
    alt: "Três barras de mesmo comprimento, divididas em 4, 2 e 8 partes, com 3, 1 e 5 preenchidas.",
    desenho: () => barrasEmpilhadas({
      largura: 450,
      rotuloEsquerda: true,
      itens: [
        { partes: 4, pintadas: 3, rotulo: "3/4" },
        { partes: 2, pintadas: 1, rotulo: "1/2" },
        { partes: 8, pintadas: 5, rotulo: "5/8" },
      ],
    }),
  },
  {
    id: "q-comp-times",
    pasta: "questoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 9 partes com 7 preenchidas, outra em 6 partes com 5 preenchidas.",
    desenho: () => barrasEmpilhadas({
      largura: 470,
      rotuloEsquerda: true,
      itens: [
        { partes: 9, pintadas: 7, rotulo: "time A" },
        { partes: 6, pintadas: 5, rotulo: "time B" },
      ],
    }),
  },

  // ───────────────────────── Lição 6 — Fração de uma quantidade
  {
    id: "ideia-quantidade",
    pasta: "licoes",
    alt: "Barra dividida em 5 partes iguais com 3 preenchidas, representando uma quantidade repartida.",
    desenho: () => barra({ partes: 5, pintadas: 3, rotulo: "o inteiro repartido em 5 · 3 partes tomadas" }),
  },
  {
    id: "res-quantidade",
    pasta: "licoes",
    alt: "Barra representando 200 alunos dividida em 5 partes iguais, com 3 preenchidas.",
    desenho: () => precoPorParte({ partes: 5, pintadas: 5, valorTotal: "200 alunos", rotulo: "cada parte é um quinto da escola" }),
  },
  {
    id: "q-quant-350",
    pasta: "questoes",
    alt: "Barra representando 350 livros, dividida em 5 partes iguais com 2 preenchidas.",
    desenho: () => precoPorParte({ partes: 5, pintadas: 5, valorTotal: "350 livros", rotulo: "dois quintos são de literatura" }),
  },
  {
    id: "q-amigos",
    pasta: "questoes",
    alt: "Três barras representando o dinheiro de Adriano, Bruno e César, divididas em 5, 4 e 3 partes iguais, com uma parte preenchida em cada.",
    desenho: () => barrasEmpilhadas({
      largura: 480,
      rotuloEsquerda: true,
      itens: [
        { partes: 5, pintadas: 1, rotulo: "Adriano" },
        { partes: 4, pintadas: 1, rotulo: "Bruno" },
        { partes: 3, pintadas: 1, rotulo: "César" },
      ],
    }),
  },
  {
    id: "q-atletas",
    pasta: "questoes",
    alt: "Barra do total de alunos da escola repartida em quatro categorias, com legenda: só vôlei, só futebol, nenhum dos dois e os dois esportes.",
    desenho: () => barraCategorias({
      largura: 520,
      rotuloTotal: "a escola inteira = 12 partes",
      categorias: [
        { fracao: 3 / 12, curto: "3", rotulo: "só vôlei — um quarto" },
        { fracao: 4 / 12, curto: "4", rotulo: "só futebol — um terço" },
        { fracao: 1 / 12, curto: "1", rotulo: "nenhum dos dois — um doze avos" },
        { fracao: 4 / 12, curto: "?", rotulo: "os dois esportes — 300 alunos" },
      ],
    }),
  },
  {
    id: "q-quant-inversa",
    pasta: "questoes",
    alt: "Barra dividida em 4 partes iguais, com uma chave marcando o valor de uma delas.",
    desenho: () => precoPorParte({ partes: 4, pintadas: 1, valorTotal: "R$ 15,00", rotulo: "a carteira de Rita em quatro partes" }),
  },

  // ───────────────────────── Lição 7 — Somar e subtrair
  {
    id: "ideia-somar",
    pasta: "licoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 2 partes com 1 preenchida, outra em 3 partes com 1 preenchida.",
    desenho: () => barrasEmpilhadas({
      itens: [
        { partes: 2, pintadas: 1, rotulo: "1/2" },
        { partes: 3, pintadas: 1, rotulo: "1/3" },
      ],
    }),
  },
  {
    id: "res-somar",
    pasta: "licoes",
    alt: "Três barras de mesmo comprimento divididas em 6 partes, com 3, 2 e 5 preenchidas.",
    desenho: () => barrasEmpilhadas({
      largura: 450,
      rotuloEsquerda: true,
      itens: [
        { partes: 6, pintadas: 3, rotulo: "1/2 = 3/6" },
        { partes: 6, pintadas: 2, rotulo: "1/3 = 2/6" },
        { partes: 6, pintadas: 5, rotulo: "soma" },
      ],
    }),
  },
  {
    id: "q-soma-3-4-1-6",
    pasta: "questoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 4 partes com 3 preenchidas, outra em 6 partes com 1 preenchida.",
    desenho: () => barrasEmpilhadas({
      itens: [
        { partes: 4, pintadas: 3, rotulo: "3/4" },
        { partes: 6, pintadas: 1, rotulo: "1/6" },
      ],
    }),
  },
  {
    id: "q-canecas",
    pasta: "questoes",
    alt: "Três canecas de tamanhos diferentes: a pequena e a média cheias, a grande vazia.",
    desenho: () => recipientes({
      itens: [
        { rotulo: "pequena", fracao: 1, altura: 68, largura: 58 },
        { rotulo: "média", fracao: 1, altura: 104, largura: 70 },
        { rotulo: "grande", fracao: 0, altura: 150, largura: 86, nota: "vazia" },
      ],
    }),
  },
  {
    id: "q-sub-5-6-1-4",
    pasta: "questoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 6 partes com 5 preenchidas, outra em 4 partes com 1 preenchida.",
    desenho: () => barrasEmpilhadas({
      itens: [
        { partes: 6, pintadas: 5, rotulo: "5/6" },
        { partes: 4, pintadas: 1, rotulo: "1/4" },
      ],
    }),
  },
  {
    id: "q-jarra",
    pasta: "questoes",
    alt: "Uma jarra cheia até três quartos ao lado de um copo, representando o suco servido.",
    desenho: () => recipientes({
      largura: 320,
      itens: [
        { rotulo: "a jarra", nota: "3/4 de suco", fracao: 0.75, altura: 150, largura: 90 },
        { rotulo: "servido", nota: "2/5 da jarra", fracao: 0.4, altura: 150, largura: 90 },
      ],
    }),
  },

  // ───────────────────────── Lição 8 — Fração do que sobrou
  {
    id: "ideia-sobrou",
    pasta: "licoes",
    alt: "Barra do total repartida em duas etapas consecutivas, mostrando que a segunda fração se aplica ao que restou da primeira.",
    desenho: () => barraEtapas({
      rotuloTotal: "R$ 100,00",
      etapas: [
        { fracao: 0.5, rotulo: "gastou 1/2" },
        { fracao: 0.125, rotulo: "1/4 do resto" },
        { fracao: 0.375, rotulo: "sobrou", vazio: true },
      ],
    }),
  },
  {
    id: "res-sobrou",
    pasta: "licoes",
    alt: "Barra de 240 páginas repartida em três trechos: a leitura de segunda, a de terça e o que ainda falta.",
    desenho: () => barraEtapas({
      rotuloTotal: "livro de 240 páginas",
      etapas: [
        { fracao: 0.25, rotulo: "segunda: 1/4" },
        { fracao: 0.3, rotulo: "terça: 2/5 do resto" },
        { fracao: 0.45, rotulo: "ainda falta", vazio: true },
      ],
    }),
  },
  {
    id: "q-sobrou-dinheiro",
    pasta: "questoes",
    alt: "Barra representando R$ 60,00 repartida em três trechos: a camiseta, o lanche e o que sobrou.",
    desenho: () => barraEtapas({
      rotuloTotal: "R$ 60,00",
      etapas: [
        { fracao: 0.4, rotulo: "camiseta: 2/5" },
        { fracao: 0.15, rotulo: "lanche: 1/4 do resto" },
        { fracao: 0.45, rotulo: "sobrou", vazio: true },
      ],
    }),
  },
  {
    id: "q-sobrou-bombons",
    pasta: "questoes",
    alt: "Barra representando 90 bombons repartida em três trechos: o que João comeu, o que Maria comeu e o que ficou na caixa.",
    desenho: () => barraEtapas({
      rotuloTotal: "90 bombons",
      etapas: [
        { fracao: 1 / 3, rotulo: "João: 1/3" },
        { fracao: 1 / 3, rotulo: "Maria: metade do resto" },
        { fracao: 1 / 3, rotulo: "ficou na caixa", vazio: true },
      ],
    }),
  },
  {
    id: "q-sobrou-reservatorio",
    pasta: "questoes",
    alt: "Barra do reservatório cheio repartida em três trechos: a primeira retirada, a segunda retirada e o que resta.",
    desenho: () => barraEtapas({
      rotuloTotal: "reservatório cheio",
      etapas: [
        { fracao: 0.5, rotulo: "1ª retirada: 1/2" },
        { fracao: 0.25, rotulo: "2ª: 1/2 do resto" },
        { fracao: 0.25, rotulo: "resta", vazio: true },
      ],
    }),
  },
  {
    id: "q-sobrou-ana",
    pasta: "questoes",
    alt: "Barra do livro repartida em três trechos: a leitura de segunda, a de terça e as 120 páginas que ainda faltam.",
    desenho: () => barraEtapas({
      rotuloTotal: "o livro inteiro",
      etapas: [
        { fracao: 0.4, rotulo: "segunda: 2/5" },
        { fracao: 0.2, rotulo: "terça: 1/3 do resto" },
        { fracao: 0.4, rotulo: "faltam 120 pág.", vazio: true },
      ],
    }),
  },

  // ═════════════════════════ NÚMEROS DECIMAIS ═════════════════════════

  // ───── Lição 1 — O que a vírgula quer dizer
  {
    id: "dec-ideia-grade", pasta: "licoes",
    alt: "Quadrado dividido em 100 partes iguais, com 1 preenchida.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 1, rotulo: "1 de 100 = um centésimo = 0,01" }),
  },
  {
    id: "dec-res-100-27", pasta: "licoes",
    alt: "Quadrado dividido em 100 partes iguais, com 27 preenchidas.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 27, rotulo: "27 de 100" }),
  },
  {
    id: "dec-q-100-7", pasta: "questoes",
    alt: "Quadrado dividido em 100 partes iguais, com 7 preenchidas.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 7 }),
  },
  {
    id: "dec-q-decimos-4", pasta: "questoes",
    alt: "Barra dividida em 10 partes iguais, com 4 preenchidas.",
    desenho: () => barra({ partes: 10, pintadas: 4, rotulo: "0,4" }),
  },
  {
    id: "dec-q-100-40", pasta: "questoes",
    alt: "Quadrado dividido em 100 partes iguais, com 40 preenchidas.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 40 }),
  },
  {
    id: "dec-q-025", pasta: "questoes",
    alt: "Quadrado dividido em 100 partes iguais, com 25 preenchidas.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 25, rotulo: "0,25" }),
  },

  // ───── Lição 2 — Ler e escrever
  {
    id: "dec-ideia-quadro", pasta: "licoes",
    alt: "Quadro de ordens com as colunas unidades, décimos, centésimos e milésimos, preenchido com o número 2,314.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["2", "3", "1", "4"]], titulo: "o número 2,314 no quadro de ordens" }),
  },
  {
    id: "dec-res-quadro-4507", pasta: "licoes",
    alt: "Quadro de ordens preenchido com o número 4,507: 4 unidades, 5 décimos, 0 centésimos e 7 milésimos.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["4", "5", "0", "7"]], titulo: "4,507" }),
  },
  {
    id: "dec-q-quadro-3168", pasta: "questoes",
    alt: "Quadro de ordens vazio, com as colunas unidades, décimos, centésimos e milésimos.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["", "", "", ""]], titulo: "onde cada algarismo de 3,168 se encaixa?" }),
  },
  {
    id: "dec-q-quadro-vazio", pasta: "questoes",
    alt: "Quadro de ordens vazio, com as colunas unidades, décimos, centésimos e milésimos.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["", "", "", ""]], titulo: "doze inteiros e trinta e quatro centésimos" }),
  },
  {
    id: "dec-q-zeros", pasta: "questoes",
    alt: "Quadrado dividido em 100 partes iguais, com 50 preenchidas.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 50, rotulo: "0,5 do quadrado" }),
  },
  {
    id: "dec-q-quadro-809", pasta: "questoes",
    alt: "Quadro de ordens vazio, com as colunas unidades, décimos, centésimos e milésimos.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["", "", "", ""]], titulo: "encaixe o número 8,09" }),
  },

  // ───── Lição 3 — Decimais na reta
  {
    id: "dec-ideia-reta", pasta: "licoes",
    alt: "Reta numérica de 0 a 1 dividida em 10 partes iguais, sem ponto marcado.",
    desenho: () => retaDecimal({ inicio: 0, fim: 1, divisoes: 10 }),
  },
  {
    id: "dec-res-reta-vazia", pasta: "licoes",
    alt: "Reta numérica de 0 a 1 dividida em 10 partes iguais, sem ponto marcado.",
    desenho: () => retaDecimal({ inicio: 0, fim: 1, divisoes: 10 }),
  },
  {
    id: "dec-q-reta-03", pasta: "questoes",
    alt: "Reta numérica de 0 a 1 dividida em 10 partes iguais, com um ponto marcado no terceiro tracinho.",
    desenho: () => retaDecimal({ inicio: 0, fim: 1, divisoes: 10, marcados: [{ valor: 0.3 }] }),
  },
  {
    id: "dec-q-reta-245", pasta: "questoes",
    alt: "Reta numérica de 0 a 5 marcada nos números inteiros, sem ponto destacado.",
    desenho: () => retaDecimal({ inicio: 0, fim: 5, divisoes: 5, casas: 0 }),
  },
  {
    id: "dec-q-reta-36", pasta: "questoes",
    alt: "Reta numérica de 3 a 4 dividida em 10 partes iguais, com um ponto marcado no sexto tracinho.",
    desenho: () => retaDecimal({ inicio: 3, fim: 4, divisoes: 10, casas: 0, marcados: [{ valor: 3.6 }] }),
  },
  {
    id: "dec-q-reta-15", pasta: "questoes",
    alt: "Reta numérica de 0 a 3 marcada apenas nos números inteiros, sem ponto destacado.",
    desenho: () => retaDecimal({ inicio: 0, fim: 3, divisoes: 3, casas: 0 }),
  },

  // ───── Lição 4 — Comparar
  {
    id: "dec-ideia-comparar", pasta: "licoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 10 partes com 7 preenchidas, outra em 20 partes com 3 preenchidas.",
    desenho: () => barrasEmpilhadas({
      largura: 470, rotuloEsquerda: true,
      itens: [
        { partes: 10, pintadas: 7, rotulo: "0,7" },
        { partes: 20, pintadas: 3, rotulo: "0,15" },
      ],
    }),
  },
  {
    id: "dec-res-comparar", pasta: "licoes",
    alt: "Duas barras de mesmo comprimento: uma dividida em 10 partes com 7 preenchidas, outra em 20 partes com 3 preenchidas.",
    desenho: () => barrasEmpilhadas({
      largura: 470, rotuloEsquerda: true,
      itens: [
        { partes: 10, pintadas: 7, rotulo: "0,70" },
        { partes: 20, pintadas: 3, rotulo: "0,15" },
      ],
    }),
  },
  {
    id: "dec-q-comp-08-025", pasta: "questoes",
    alt: "Quadro de ordens vazio com duas linhas, para encaixar dois números.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["", "", "", ""], ["", "", "", ""]], titulo: "encaixe 0,8 e 0,25 para comparar" }),
  },
  {
    id: "dec-q-comp-ordem", pasta: "questoes",
    alt: "Quadro de ordens vazio com três linhas, para encaixar três números.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["", "", "", ""], ["", "", "", ""], ["", "", "", ""]], titulo: "encaixe 1,2 · 1,15 · 1,09" }),
  },
  {
    id: "dec-q-comp-tempos", pasta: "questoes",
    alt: "Quadro de ordens vazio com duas linhas, para encaixar dois tempos.",
    desenho: () => quadroOrdens({ colunas: ORDENS_DEZ, valores: [["", "", "", ""], ["", "", "", ""]], titulo: "encaixe 12,4 s e 12,35 s" }),
  },
  {
    id: "dec-q-comp-06", pasta: "questoes",
    alt: "Barra dividida em 10 partes iguais, com 6 preenchidas.",
    desenho: () => barra({ partes: 10, pintadas: 6, rotulo: "0,6 escrito em décimos" }),
  },

  // ───── Lição 5 — Somar e subtrair
  {
    id: "dec-ideia-soma", pasta: "licoes",
    alt: "Conta de adição armada em coluna, com as vírgulas alinhadas uma sobre a outra.",
    desenho: () => contaArmada({ linhas: ["3,40", "12,75"], operador: "+", nota: "vírgula sob vírgula" }),
  },
  {
    id: "dec-res-soma", pasta: "licoes",
    alt: "Conta de adição armada: 3,40 mais 12,75, com as vírgulas alinhadas.",
    desenho: () => contaArmada({ linhas: ["3,40", "12,75"], operador: "+", nota: "some da direita para a esquerda" }),
  },
  {
    id: "dec-q-soma-1", pasta: "questoes",
    alt: "Conta de adição armada: 2,50 mais 1,75, com as vírgulas alinhadas.",
    desenho: () => contaArmada({ linhas: ["2,50", "1,75"], operador: "+" }),
  },
  {
    id: "dec-q-sub-1", pasta: "questoes",
    alt: "Conta de subtração armada: 10,0 menos 3,6, com as vírgulas alinhadas.",
    desenho: () => contaArmada({ linhas: ["10,0", "3,6"], operador: "−" }),
  },
  {
    id: "dec-q-soma-compras", pasta: "questoes",
    alt: "Conta de adição armada: 8,50 mais 4,79, com as vírgulas alinhadas.",
    desenho: () => contaArmada({ linhas: ["8,50", "4,79"], operador: "+", nota: "pão e leite" }),
  },
  {
    id: "dec-q-troco", pasta: "questoes",
    alt: "Conta de subtração armada: 50,00 menos 27,40, com as vírgulas alinhadas.",
    desenho: () => contaArmada({ linhas: ["50,00", "27,40"], operador: "−", nota: "nota menos a conta" }),
  },

  // ───── Lição 6 — Multiplicar e dividir por 10, 100, 1000
  {
    id: "dec-ideia-pordez", pasta: "licoes",
    alt: "Quadro de ordens com duas linhas mostrando o número 4,3 e, abaixo, o mesmo número deslocado uma casa para a esquerda.",
    desenho: () => quadroOrdens({
      colunas: ORDENS_DEZ,
      valores: [["", "4", "3", ""], ["4", "3", "0", ""]],
      titulo: "cada algarismo sobe uma casa ao multiplicar por 10",
    }),
  },
  {
    id: "dec-res-pordez", pasta: "licoes",
    alt: "Quadro de ordens com três linhas mostrando 4,3 subindo duas casas até virar 430.",
    desenho: () => quadroOrdens({
      colunas: ["centenas", "dezenas", "unidades", "décimos"],
      valores: [["", "", "4", "3"], ["", "4", "3", "0"], ["4", "3", "0", "0"]],
      titulo: "4,3 → 43 → 430",
    }),
  },
  {
    id: "dec-q-pordez-1", pasta: "questoes",
    alt: "Quadro de ordens vazio com duas linhas.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["", "", "", ""], ["", "", "", ""]], titulo: "0,45 × 10" }),
  },
  {
    id: "dec-q-pordez-2", pasta: "questoes",
    alt: "Quadro de ordens vazio com duas linhas, das dezenas aos centésimos.",
    desenho: () => quadroOrdens({ colunas: ORDENS_DEZ, valores: [["", "", "", ""], ["", "", "", ""]], titulo: "87,5 ÷ 100" }),
  },
  {
    id: "dec-q-pordez-3", pasta: "questoes",
    alt: "Quadro de ordens vazio com duas linhas.",
    desenho: () => quadroOrdens({ colunas: ORDENS, valores: [["", "", "", ""], ["", "", "", ""]], titulo: "3,5 kg repartidos entre 1000" }),
  },
  {
    id: "dec-q-pordez-4", pasta: "questoes",
    alt: "Quadro de ordens vazio com duas linhas, das dezenas aos centésimos.",
    desenho: () => quadroOrdens({ colunas: ORDENS_DEZ, valores: [["", "", "", ""], ["", "", "", ""]], titulo: "de 0,07 até 70: quantas casas?" }),
  },

  // ───── Lição 7 — Multiplicar e dividir decimais
  {
    id: "dec-ideia-mult", pasta: "licoes",
    alt: "Barra dividida em 10 partes iguais com 5 preenchidas, representando a metade de um inteiro.",
    desenho: () => barra({ partes: 10, pintadas: 5, rotulo: "multiplicar por 0,5 é pegar a metade" }),
  },
  {
    id: "dec-res-mult", pasta: "licoes",
    alt: "Quadrado dividido em 100 partes iguais, com 12 preenchidas.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 12, rotulo: "12 de 100 = 0,12" }),
  },
  {
    id: "dec-q-mult-1", pasta: "questoes",
    alt: "Conta de multiplicação armada: 1,2 vezes 0,5.",
    desenho: () => contaArmada({ linhas: ["1,2", "0,5"], operador: "×", nota: "quantas casas o resultado terá?" }),
  },
  {
    id: "dec-q-div-1", pasta: "questoes",
    alt: "Conta de divisão indicada: 4,5 dividido por 0,5.",
    desenho: () => contaArmada({ linhas: ["4,5", "0,5"], operador: "÷", nota: "deixe o divisor inteiro primeiro" }),
  },
  {
    id: "dec-q-mult-cafe", pasta: "questoes",
    alt: "Conta de multiplicação armada: 12,50 vezes 3.",
    desenho: () => contaArmada({ linhas: ["12,50", "3"], operador: "×", nota: "três pacotes de café" }),
  },
  {
    id: "dec-q-mult-estimar", pasta: "questoes",
    alt: "Barra dividida em 4 partes iguais, com 1 preenchida.",
    desenho: () => barra({ partes: 4, pintadas: 1, rotulo: "0,25 é um quarto do inteiro" }),
  },

  // ───── Lição 8 — Arredondar
  {
    id: "dec-ideia-arredondar", pasta: "licoes",
    alt: "Reta numérica de 3,4 a 3,5 dividida em 10 partes, com um ponto marcado em 3,47.",
    desenho: () => retaDecimal({ inicio: 3.4, fim: 3.5, divisoes: 10, casas: 2, marcados: [{ valor: 3.47, rotulo: "3,47" }] }),
  },
  {
    id: "dec-res-arredondar", pasta: "licoes",
    alt: "Reta numérica de 3,4 a 3,5 dividida em 10 partes, com um ponto marcado em 3,47.",
    desenho: () => retaDecimal({ inicio: 3.4, fim: 3.5, divisoes: 10, casas: 2, marcados: [{ valor: 3.47, rotulo: "3,47" }] }),
  },
  {
    id: "dec-q-arred-1", pasta: "questoes",
    alt: "Reta numérica de 12,8 a 12,9 dividida em 10 partes iguais, sem ponto marcado.",
    desenho: () => retaDecimal({ inicio: 12.8, fim: 12.9, divisoes: 10, casas: 2, largura: 520 }),
  },
  {
    id: "dec-q-arred-2", pasta: "questoes",
    alt: "Reta numérica de 7 a 8 dividida em 10 partes iguais, sem ponto marcado.",
    desenho: () => retaDecimal({ inicio: 7, fim: 8, divisoes: 10, casas: 0 }),
  },
  {
    id: "dec-q-arred-estimativa", pasta: "questoes",
    alt: "Conta de multiplicação armada: 19,80 vezes 3.",
    desenho: () => contaArmada({ linhas: ["19,80", "3"], operador: "×", nota: "estime antes de calcular" }),
  },
  {
    id: "dec-q-arred-3", pasta: "questoes",
    alt: "Reta numérica de 3,4 a 3,5 dividida em 10 partes iguais, sem ponto marcado.",
    desenho: () => retaDecimal({ inicio: 3.4, fim: 3.5, divisoes: 10, casas: 2, largura: 520 }),
  },
];

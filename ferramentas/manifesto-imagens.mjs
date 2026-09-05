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
  arranjos, crivo, fatoracao, saltos, listasComuns,
  fatoresRepetidos, camadas,
  angulo, angulosComparados, angulosNaReta, retasCruzadas, transferidor,
  figuraPlana, figurasComparadas, relogio,
  circulo, retanguloMalha, figuraComposta, trianguloAltura,
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
  // ═════════════════════════ Divisibilidade e primos ═════════════════════════

  // ───────────────────────── Lição 1 — Múltiplos e divisores
  {
    id: "div-ideia-arranjos", pasta: "licoes",
    alt: "Três arranjos retangulares feitos com 12 pontos: uma fileira de 12, duas de 6 e três de 4.",
    desenho: () => arranjos({ pares: [[1, 12], [2, 6], [3, 4]], rotulo: "os únicos retângulos cheios que 12 pontos formam" }),
  },
  {
    id: "div-res-24", pasta: "licoes",
    alt: "Arranjos retangulares de 24 pontos: 2 por 12, 3 por 8 e 4 por 6.",
    desenho: () => arranjos({ pares: [[2, 12], [3, 8], [4, 6]], rotulo: "24 pontos, cada retângulo é um par de divisores" }),
  },
  {
    id: "div-q-18-cadeiras", pasta: "questoes",
    alt: "Dezoito círculos soltos, sem arrumação em fileiras.",
    desenho: () => colecao({ total: 18, destacados: 0, porLinha: 6, rotulo: "18 cadeiras, ainda sem fileiras" }),
  },
  {
    id: "div-q-multiplos-7", pasta: "questoes",
    alt: "Reta de 0 a 35 com marcas de 7 em 7 assinaladas por círculos.",
    desenho: () => saltos({ ate: 35, marcaCada: 7, largura: 460, ritmos: [{ rotulo: "de 7", passo: 7 }], rotulo: "a tabuada do 7 continua além do 35" }),
  },
  {
    id: "div-q-pares-20", pasta: "questoes",
    alt: "Dois arranjos retangulares de 20 pontos: 2 por 10 e 4 por 5.",
    desenho: () => arranjos({ pares: [[2, 10], [4, 5]], rotulo: "os divisores vêm sempre aos pares" }),
  },
  {
    id: "div-q-biscoitos", pasta: "questoes",
    alt: "Sessenta círculos organizados em seis fileiras de dez, representando a tarefa de cada um.",
    desenho: () => colecao({ total: 60, destacados: 0, porLinha: 10, rotulo: "a tarefa de cada um: 60 biscoitos" }),
  },

  // ───────────────────────── Lição 2 — Critérios de divisibilidade
  {
    id: "div-ideia-ordens", pasta: "licoes",
    alt: "Quadro de ordens com as casas de milhar, centena, dezena e unidade preenchidas com 4, 3, 5 e 0.",
    desenho: () => quadroOrdens({ colunas: ["milhar", "centena", "dezena", "unidade"], valores: [["4", "3", "5", "0"]], titulo: "toda dezena inteira já é divisível por 2, 5 e 10" }),
  },
  {
    id: "div-res-4128", pasta: "licoes",
    alt: "Quadro de ordens com o número 4128 separado em milhar, centena, dezena e unidade.",
    desenho: () => quadroOrdens({ colunas: ["milhar", "centena", "dezena", "unidade"], valores: [["4", "1", "2", "8"]], titulo: "4.128 aberto casa por casa" }),
  },
  {
    id: "div-q-soma-471", pasta: "questoes",
    alt: "Soma armada dos algarismos 4, 7 e 1, com resultado 12.",
    desenho: () => contaArmada({ linhas: ["4", "7", "1"], operador: "+", resultado: "12", nota: "471: soma 12, múltiplo de 3 mas não de 9" }),
  },
  {
    id: "div-q-algarismo-oculto", pasta: "questoes",
    alt: "Quadro de ordens com centena 2, dezena vazia e unidade 6.",
    desenho: () => quadroOrdens({ colunas: ["centena", "dezena", "unidade"], valores: [["2", "?", "6"]], titulo: "qual algarismo cabe na dezena?" }),
  },
  {
    id: "div-q-multiplos-4", pasta: "questoes",
    alt: "Reta de 0 a 40 com os múltiplos de 4 assinalados por círculos.",
    desenho: () => saltos({ ate: 40, marcaCada: 10, largura: 460, ritmos: [{ rotulo: "de 4", passo: 4 }], rotulo: "os múltiplos de 4 seguem no mesmo passo até 100" }),
  },
  {
    id: "div-q-99-centavos", pasta: "questoes",
    alt: "Subtração armada de R$ 4,00 menos R$ 0,01, resultando em R$ 3,99.",
    desenho: () => contaArmada({ linhas: ["4,00", "0,01"], operador: "−", resultado: "3,99", nota: "todo preço da loja é um valor redondo menos 1 centavo", largura: 360 }),
  },

  // ───────────────────────── Lição 3 — Primos e compostos
  {
    id: "div-ideia-crivo", pasta: "licoes",
    alt: "Grade com os números de 1 a 50: os primos aparecem destacados e os compostos, riscados.",
    desenho: () => crivo({
      ate: 50,
      destacados: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],
      riscados: [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 35, 36, 38, 39, 40, 42, 44, 45, 46, 48, 49, 50],
      rotulo: "os 15 primos até 50 — o 1 não entra",
    }),
  },
  {
    id: "div-res-91", pasta: "licoes",
    alt: "Grade com os números de 1 a 100, com o 91 destacado e nenhum outro marcado.",
    desenho: () => crivo({ ate: 100, destacados: [91], rotulo: "91: primo ou composto?" }),
  },
  {
    id: "div-q-primo-teste", pasta: "questoes",
    alt: "Decomposição de 39 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 39, rotulo: "39 parece primo, mas não é" }),
  },
  {
    id: "div-q-conta-divisores", pasta: "questoes",
    alt: "Três listas lado a lado com os divisores de 4, de 5 e de 6.",
    desenho: () => listasComuns({
      largura: 440,
      colunas: [
        { titulo: "divisores de 4", itens: [1, 2, 4] },
        { titulo: "divisores de 5", itens: [1, 5] },
        { titulo: "divisores de 6", itens: [1, 2, 3, 6] },
      ],
      rotulo: "só um deles tem exatamente dois divisores",
    }),
  },
  {
    id: "div-q-ate-20", pasta: "questoes",
    alt: "Grade com os números de 1 a 20, nenhum marcado.",
    desenho: () => crivo({ ate: 20, rotulo: "os números de 1 a 20" }),
  },
  {
    id: "div-q-maior-primo", pasta: "questoes",
    alt: "Grade de 1 a 50 com os números pares acima de 2 riscados.",
    desenho: () => crivo({
      ate: 50,
      riscados: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50],
      rotulo: "riscados: os pares acima do 2, que nunca são primos",
    }),
  },

  // ───────────────────────── Lição 4 — Decompor em fatores primos
  {
    id: "div-ideia-fatorar", pasta: "licoes",
    alt: "Decomposição de 90 em fatores primos pelo traço vertical das divisões sucessivas.",
    desenho: () => fatoracao({ numero: 90, rotulo: "90 quebrado até só sobrarem primos" }),
  },
  {
    id: "div-res-metodo-12", pasta: "licoes",
    alt: "Decomposição de 12 em fatores primos, mostrando o formato do traço vertical.",
    desenho: () => fatoracao({ numero: 12, rotulo: "o método, num número pequeno" }),
  },
  {
    id: "div-q-tabela-primos", pasta: "questoes",
    alt: "Lista dos números primos menores que 20.",
    desenho: () => listasComuns({
      largura: 300,
      colunas: [{ titulo: "primos até 20", itens: [2, 3, 5, 7, 11, 13, 17, 19] }],
      rotulo: "só estes podem aparecer numa decomposição até 20",
    }),
  },
  {
    id: "div-q-fatorar-75", pasta: "questoes",
    alt: "Decomposição de 75 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 75, rotulo: "75: nenhum fator 2, porque é ímpar" }),
  },
  {
    id: "div-q-multiplos-3", pasta: "questoes",
    alt: "Grade de 1 a 30 com os múltiplos de 3 destacados.",
    desenho: () => crivo({ ate: 30, destacados: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], rotulo: "os múltiplos de 3 até 30" }),
  },
  {
    id: "div-q-contar-20", pasta: "questoes",
    alt: "Decomposição de 20 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 20, rotulo: "20 = 2 × 2 × 5, e 20 tem 6 divisores" }),
  },

  // ───────────────────────── Lição 5 — Máximo divisor comum
  {
    id: "div-ideia-mdc", pasta: "licoes",
    alt: "Listas dos divisores de 20 e de 30 lado a lado, com os divisores comuns destacados.",
    desenho: () => listasComuns({
      colunas: [
        { titulo: "divisores de 20", itens: [1, 2, 4, 5, 10, 20], comuns: [1, 2, 5, 10] },
        { titulo: "divisores de 30", itens: [1, 2, 3, 5, 6, 10, 15, 30], comuns: [1, 2, 5, 10] },
      ],
      rotulo: "os comuns em destaque; o maior deles é o MDC",
    }),
  },
  {
    id: "div-res-mdc-listas", pasta: "licoes",
    alt: "Listas dos divisores de 48 e de 36 lado a lado, sem nenhum destaque.",
    desenho: () => listasComuns({
      colunas: [
        { titulo: "divisores de 48", itens: [1, 2, 3, 4, 6, 8, 12, 16, 24, 48] },
        { titulo: "divisores de 36", itens: [1, 2, 3, 4, 6, 9, 12, 18, 36] },
      ],
      rotulo: "quais aparecem nas duas colunas?",
    }),
  },
  {
    id: "div-q-mdc-8-12", pasta: "questoes",
    alt: "Listas dos divisores de 8 e de 12, com os comuns destacados.",
    desenho: () => listasComuns({
      largura: 400,
      colunas: [
        { titulo: "divisores de 8", itens: [1, 2, 4, 8], comuns: [1, 2, 4] },
        { titulo: "divisores de 12", itens: [1, 2, 3, 4, 6, 12], comuns: [1, 2, 4] },
      ],
      rotulo: "o método num par menor: MDC(8, 12) = 4",
    }),
  },
  {
    id: "div-q-fitas", pasta: "questoes",
    alt: "Listas dos divisores de 30 e de 45 lado a lado, sem destaque.",
    desenho: () => listasComuns({
      largura: 420,
      colunas: [
        { titulo: "divisores de 30", itens: [1, 2, 3, 5, 6, 10, 15, 30] },
        { titulo: "divisores de 45", itens: [1, 3, 5, 9, 15, 45] },
      ],
      rotulo: "os tamanhos de corte possíveis em cada fita",
    }),
  },
  {
    id: "div-q-primos-entre-si", pasta: "questoes",
    alt: "Listas dos divisores de 9, de 10 e de 14, mostrando que só o 1 é comum aos três.",
    desenho: () => listasComuns({
      largura: 440,
      colunas: [
        { titulo: "divisores de 9", itens: [1, 3, 9], comuns: [1] },
        { titulo: "divisores de 10", itens: [1, 2, 5, 10], comuns: [1] },
        { titulo: "divisores de 14", itens: [1, 2, 7, 14], comuns: [1] },
      ],
      rotulo: "9 e 14 só compartilham o 1: são primos entre si",
    }),
  },
  {
    id: "div-q-fatorar-72", pasta: "questoes",
    alt: "Decomposição de 72 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 72, rotulo: "falta fazer o mesmo com 120" }),
  },

  // ───────────────────────── Lição 6 — Mínimo múltiplo comum
  {
    id: "div-ideia-mmc", pasta: "licoes",
    alt: "Reta de 0 a 24 com os múltiplos de 4 numa linha e os de 10 em outra, com o 20 destacado nas duas.",
    desenho: () => saltos({
      ate: 24, marcaCada: 4, largura: 500,
      ritmos: [{ rotulo: "de 4", passo: 4, destacar: [20] }, { rotulo: "de 10", passo: 10, destacar: [20] }],
      rotulo: "o primeiro instante em que os dois ônibus se encontram",
    }),
  },
  {
    id: "div-res-mmc-saltos", pasta: "licoes",
    alt: "Reta de 0 a 32 com os múltiplos de 6 numa linha e os de 8 em outra, sem destaque.",
    desenho: () => saltos({
      ate: 32, marcaCada: 8, largura: 500,
      ritmos: [{ rotulo: "de 6", passo: 6 }, { rotulo: "de 8", passo: 8 }],
      rotulo: "onde as duas linhas caem no mesmo lugar?",
    }),
  },
  {
    id: "div-q-mmc-2-5", pasta: "questoes",
    alt: "Reta de 0 a 20 com os múltiplos de 2 e de 5, com o 10 destacado nas duas linhas.",
    desenho: () => saltos({
      ate: 20, marcaCada: 5, largura: 440,
      ritmos: [{ rotulo: "de 2", passo: 2, destacar: [10] }, { rotulo: "de 5", passo: 5, destacar: [10] }],
      rotulo: "o método num par menor: MMC(2, 5) = 10",
    }),
  },
  {
    id: "div-q-fatorar-12", pasta: "questoes",
    alt: "Decomposição de 12 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 12, rotulo: "falta fazer o mesmo com 18" }),
  },
  {
    id: "div-q-somar-fracoes", pasta: "questoes",
    alt: "Duas barras: uma dividida em 6 partes com 5 preenchidas, outra em 8 partes com 3 preenchidas.",
    desenho: () => barrasEmpilhadas({
      largura: 440, rotuloEsquerda: true,
      itens: [{ partes: 6, pintadas: 5, rotulo: "5/6" }, { partes: 8, pintadas: 3, rotulo: "3/8" }],
    }),
  },
  {
    id: "div-q-promocoes", pasta: "questoes",
    alt: "Seis círculos, cinco preenchidos e um vazio, representando a promoção pague 5 leve 6.",
    desenho: () => colecao({ total: 6, destacados: 5, porLinha: 6, rotulo: "promoção 1: pague 5 (cheios), leve 6" }),
  },
  // ═════════════════════════ Potências e raiz quadrada ═════════════════════════

  // ───────────────────────── Lição 1 — O que é uma potência
  {
    id: "pot-ideia-fatores", pasta: "licoes",
    alt: "A potência 2 elevado a 4 escrita como quatro fatores 2 multiplicados, com o resultado 16.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 2, expoente: 4, resultado: 16 }], rotulo: "a base se repete; o expoente diz quantas vezes" }),
  },
  {
    id: "pot-res-2a5", pasta: "licoes",
    alt: "Duas potências abertas em fatores: 2 elevado a 5 e 5 elevado a 2, sem os resultados.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 2, expoente: 5 }, { base: 5, expoente: 2 }], rotulo: "as mesmas duas cifras, em posições trocadas" }),
  },
  {
    id: "pot-q-3a4", pasta: "questoes",
    alt: "A potência 5 elevado a 3 escrita como três fatores 5, com o resultado 125.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 5, expoente: 3, resultado: 125 }], rotulo: "5³ são três fatores 5, e não 5 × 3" }),
  },
  {
    id: "pot-q-2a6", pasta: "questoes",
    alt: "A potência 2 elevado a 3 escrita como três fatores 2, com o resultado 8.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 2, expoente: 3, resultado: 8 }], rotulo: "cada fator 2 a mais dobra o resultado" }),
  },
  {
    id: "pot-q-troca", pasta: "questoes",
    alt: "Comparação entre 3 elevado a 2, que dá 9, e 2 elevado a 3, que dá 8.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 3, expoente: 2, resultado: 9 }, { base: 2, expoente: 3, resultado: 8 }], rotulo: "trocar base e expoente muda o resultado" }),
  },
  {
    id: "pot-q-dobras", pasta: "questoes",
    alt: "Barra dividida em 8 partes iguais, nenhuma preenchida.",
    desenho: () => barra({ partes: 8, pintadas: 0, rotulo: "a folha depois de 3 dobras: 8 partes" }),
  },

  // ───────────────────────── Lição 2 — Quadrado e cubo
  {
    id: "pot-ideia-quadrado", pasta: "licoes",
    alt: "Grade quadrada de 5 por 5 quadradinhos, toda preenchida.",
    desenho: () => grade({ colunas: 5, linhas: 5, pintadas: 25, rotulo: "lado 5 → área 25" }),
  },
  {
    id: "pot-res-7x7", pasta: "licoes",
    alt: "Grade quadrada de 7 por 7 quadradinhos vazios.",
    desenho: () => grade({ colunas: 7, linhas: 7, pintadas: 0, rotulo: "um quadrado de lado 7" }),
  },
  {
    id: "pot-q-quadrado-perfeito", pasta: "questoes",
    alt: "Grade com os números de 1 a 25, com 1, 4, 9, 16 e 25 destacados.",
    desenho: () => crivo({ ate: 25, destacados: [1, 4, 9, 16, 25], rotulo: "os quadrados perfeitos até 25 — a lista continua" }),
  },
  {
    id: "pot-q-area-9", pasta: "questoes",
    alt: "Grade quadrada de 4 por 4 quadradinhos preenchidos.",
    desenho: () => grade({ colunas: 4, linhas: 4, pintadas: 16, rotulo: "lado 4 → área 16" }),
  },
  {
    id: "pot-q-cubo-4", pasta: "questoes",
    alt: "Duas camadas quadradas de 2 por 2, lado a lado, formando um cubo de aresta 2.",
    desenho: () => camadas({ lado: 2, quantas: 2, rotulo: "2³ = duas camadas de 2 × 2 = 8" }),
  },
  {
    id: "pot-q-cubinhos-3", pasta: "questoes",
    alt: "Grade quadrada de 3 por 3, representando uma camada do cubo.",
    desenho: () => grade({ colunas: 3, linhas: 3, pintadas: 9, rotulo: "uma camada do cubo de aresta 3" }),
  },

  // ───────────────────────── Lição 3 — Potências de 10
  {
    id: "pot-ideia-dez", pasta: "licoes",
    alt: "As potências de 10 com expoentes 1, 2 e 3, cada uma aberta em fatores e com o resultado.",
    desenho: () => fatoresRepetidos({
      largura: 480,
      linhas: [
        { base: 10, expoente: 1, resultado: 10 },
        { base: 10, expoente: 2, resultado: 100 },
        { base: 10, expoente: 3, resultado: 1000 },
      ],
      rotulo: "o expoente é a quantidade de zeros",
    }),
  },
  {
    id: "pot-res-10a6", pasta: "licoes",
    alt: "A potência 10 elevado a 4 aberta em quatro fatores 10, sem o resultado.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 10, expoente: 4 }], rotulo: "quantos zeros o resultado vai ter?" }),
  },
  {
    id: "pot-q-10a5", pasta: "questoes",
    alt: "A potência 10 elevado a 2 aberta em fatores, com o resultado 100.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 10, expoente: 2, resultado: 100 }], rotulo: "expoente 2 → dois zeros" }),
  },
  {
    id: "pot-q-7x10a3", pasta: "questoes",
    alt: "Quadro de ordens com 2 no milhar e zeros nas demais casas.",
    desenho: () => quadroOrdens({ colunas: ["milhar", "centena", "dezena", "unidade"], valores: [["2", "0", "0", "0"]], titulo: "2 × 10³ = 2 000" }),
  },
  {
    id: "pot-q-zeros", pasta: "questoes",
    alt: "A potência 10 elevado a 5 aberta em fatores, com o resultado 100000.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 10, expoente: 5, resultado: 100000 }], rotulo: "conte os zeros do resultado" }),
  },
  {
    id: "pot-q-distancia", pasta: "questoes",
    alt: "A potência 10 elevado a 5 aberta em fatores, com o resultado 100000.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 10, expoente: 5, resultado: 100000 }], rotulo: "falta multiplicar pelo número da frente" }),
  },

  // ───────────────────────── Lição 4 — Potência na ordem das operações
  {
    id: "pot-ideia-ordem", pasta: "licoes",
    alt: "Lista da ordem das operações: parênteses, potências, multiplicação e divisão, soma e subtração.",
    desenho: () => listasComuns({
      largura: 460,
      colunas: [{ titulo: "a fila das operações", itens: ["1 · parênteses", "2 · potências", "3 · × e ÷", "4 · + e −"] }],
      rotulo: "de dentro para fora, da mais compacta para a mais simples",
    }),
  },
  {
    id: "pot-res-hierarquia", pasta: "licoes",
    alt: "A potência 5 ao quadrado aberta em fatores, com o resultado 25.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 5, expoente: 2, resultado: 25 }], rotulo: "o pedaço que resolve antes de todo o resto" }),
  },
  {
    id: "pot-q-ordem-1", pasta: "questoes",
    alt: "A potência 4 ao quadrado aberta em fatores, com o resultado 16.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 4, expoente: 2, resultado: 16 }], rotulo: "resolva a potência antes de multiplicar" }),
  },
  {
    id: "pot-q-ordem-2", pasta: "questoes",
    alt: "Três colunas indicando a ordem: primeiro potências, depois multiplicação e divisão, por último soma e subtração.",
    desenho: () => listasComuns({
      largura: 460,
      colunas: [
        { titulo: "primeiro", itens: ["potências"] },
        { titulo: "depois", itens: ["× e ÷"] },
        { titulo: "por último", itens: ["+ e −"] },
      ],
      rotulo: "sem parênteses, é esta a fila",
    }),
  },
  {
    id: "pot-q-diferenca", pasta: "questoes",
    alt: "As potências 5 ao quadrado e 3 ao quadrado abertas em fatores, sem os resultados.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 5, expoente: 2 }, { base: 3, expoente: 2 }], rotulo: "cada expoente vale só para o número embaixo dele" }),
  },
  {
    id: "pot-q-ordem-3", pasta: "questoes",
    alt: "A potência 3 elevado ao cubo aberta em três fatores 3, sem o resultado.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 3, expoente: 3 }], rotulo: "expoente 3 são três fatores, não dois" }),
  },

  // ───────────────────────── Lição 5 — Raiz quadrada exata
  {
    id: "pot-ideia-raiz", pasta: "licoes",
    alt: "Grade quadrada de 6 por 6 quadradinhos preenchidos.",
    desenho: () => grade({ colunas: 6, linhas: 6, pintadas: 36, rotulo: "área 36 → que lado tem este quadrado?" }),
  },
  {
    id: "pot-res-144", pasta: "licoes",
    alt: "Decomposição de 144 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 144, rotulo: "144 em fatores primos" }),
  },
  {
    id: "pot-q-raiz-81", pasta: "questoes",
    alt: "Grade quadrada de 4 por 4 quadradinhos preenchidos.",
    desenho: () => grade({ colunas: 4, linhas: 4, pintadas: 16, rotulo: "área 16 → lado 4" }),
  },
  {
    id: "pot-q-raiz-64", pasta: "questoes",
    alt: "Decomposição de 100 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 100, rotulo: "100 = 2×2×5×5, e os pares dão √100 = 10" }),
  },
  {
    id: "pot-q-area-121", pasta: "questoes",
    alt: "Grade quadrada de 7 por 7 quadradinhos preenchidos.",
    desenho: () => grade({ colunas: 7, linhas: 7, pintadas: 49, rotulo: "área 49 → lado 7" }),
  },
  {
    id: "pot-q-raiz-225", pasta: "questoes",
    alt: "Decomposição de 196 em fatores primos por divisões sucessivas.",
    desenho: () => fatoracao({ numero: 196, rotulo: "196 = 2×2×7×7, e os pares dão √196 = 14" }),
  },

  // ───────────────────────── Lição 6 — Estimar uma raiz
  {
    id: "pot-ideia-espremer", pasta: "licoes",
    alt: "Reta numérica de 40 a 70 com os quadrados perfeitos 49 e 64 marcados.",
    desenho: () => retaDecimal({
      inicio: 40, fim: 70, divisoes: 30, casas: 0, largura: 520,
      marcados: [{ valor: 49, rotulo: "7²" }, { valor: 64, rotulo: "8²" }],
    }),
  },
  {
    id: "pot-res-90", pasta: "licoes",
    alt: "Os quadrados de 9 e de 10 abertos em fatores, com os resultados 81 e 100.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 9, expoente: 2, resultado: 81 }, { base: 10, expoente: 2, resultado: 100 }], rotulo: "os dois quadrados que cercam o 90" }),
  },
  {
    id: "pot-q-raiz-30", pasta: "questoes",
    alt: "Os quadrados de 4 e de 7 abertos em fatores, com os resultados 16 e 49.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 4, expoente: 2, resultado: 16 }, { base: 7, expoente: 2, resultado: 49 }], rotulo: "dois quadrados de referência para começar a busca" }),
  },
  {
    id: "pot-q-menor-200", pasta: "questoes",
    alt: "Os quadrados de 12 e de 13 abertos em fatores, com os resultados 144 e 169.",
    desenho: () => fatoresRepetidos({ linhas: [{ base: 12, expoente: 2, resultado: 144 }, { base: 13, expoente: 2, resultado: 169 }], rotulo: "de onde começar a subir" }),
  },
  {
    id: "pot-q-raiz-70", pasta: "questoes",
    alt: "Reta numérica de 64 a 81, dividida de um em um, sem nenhum ponto marcado.",
    desenho: () => retaDecimal({ inicio: 64, fim: 81, divisoes: 17, casas: 0, largura: 520 }),
  },
  {
    id: "pot-q-area-150", pasta: "questoes",
    alt: "Reta numérica de 100 a 200 com o valor 150 marcado.",
    desenho: () => retaDecimal({ inicio: 100, fim: 200, divisoes: 10, casas: 0, largura: 500, marcados: [{ valor: 150, rotulo: "150" }] }),
  },
  // ═════════════════════════ Porcentagem ═════════════════════════

  // ───────────────────────── Lição 1 — O que é porcentagem
  {
    id: "por-ideia-grade", pasta: "licoes",
    alt: "Quadrado dividido em 100 quadradinhos iguais, com 30 preenchidos.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 30, rotulo: "30 de 100 quadradinhos = 30%" }),
  },
  {
    id: "por-res-cem", pasta: "licoes",
    alt: "Quadrado dividido em 100 quadradinhos iguais, nenhum preenchido.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 0, rotulo: "cem quadradinhos: a régua da porcentagem" }),
  },
  {
    id: "por-q-grade-25", pasta: "questoes",
    alt: "Quadrado dividido em 100 quadradinhos iguais, com uma parte preenchida no canto superior.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 25 }),
  },
  {
    id: "por-q-fracao", pasta: "questoes",
    alt: "Quadrado de 100 quadradinhos com 40 preenchidos.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 40, rotulo: "40% é 40 de cada 100" }),
  },
  {
    id: "por-q-bombons", pasta: "questoes",
    alt: "Barra dividida em duas partes iguais, com uma delas preenchida.",
    desenho: () => barra({ partes: 2, pintadas: 1, rotulo: "100 de 200 bombons" }),
  },
  {
    id: "por-q-comparar", pasta: "questoes",
    alt: "Reta numérica de 0 a 1 dividida em dez partes iguais, sem nenhum ponto marcado.",
    desenho: () => retaDecimal({ inicio: 0, fim: 1, divisoes: 10, casas: 1, largura: 460 }),
  },

  // ───────────────────────── Lição 2 — Porcentagem, fração e decimal
  {
    id: "por-ideia-tres", pasta: "licoes",
    alt: "Tabela com as mesmas quantidades escritas como fração, como decimal e como porcentagem.",
    desenho: () => listasComuns({
      largura: 480,
      colunas: [
        { titulo: "fração", itens: ["1/2", "1/4", "3/4", "1/5", "1/10"] },
        { titulo: "decimal", itens: ["0,5", "0,25", "0,75", "0,2", "0,1"] },
        { titulo: "porcentagem", itens: ["50%", "25%", "75%", "20%", "10%"] },
      ],
      rotulo: "as três escritas do mesmo número",
    }),
  },
  {
    id: "por-res-34", pasta: "licoes",
    alt: "Barra dividida em 4 partes iguais, com 3 preenchidas.",
    desenho: () => barra({ partes: 4, pintadas: 3, rotulo: "três quartos da barra" }),
  },
  {
    id: "por-q-035", pasta: "questoes",
    alt: "Quadro de ordens com 0 nas unidades, 3 nos décimos e 5 nos centésimos.",
    desenho: () => quadroOrdens({ colunas: ["unidades", "décimos", "centésimos"], valores: [["0", "3", "5"]], titulo: "0,35 casa por casa" }),
  },
  {
    id: "por-q-um-quarto", pasta: "questoes",
    alt: "Roda dividida em 4 fatias iguais, com uma preenchida.",
    desenho: () => roda({ partes: 4, pintadas: 1, rotulo: "um quarto" }),
  },
  {
    id: "por-q-7-porcento", pasta: "questoes",
    alt: "Quadrado de 100 quadradinhos com 7 preenchidos.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 7, rotulo: "7 de cada 100" }),
  },
  {
    id: "por-q-dois-quintos", pasta: "questoes",
    alt: "Barra dividida em 5 partes iguais, com 2 preenchidas.",
    desenho: () => barra({ partes: 5, pintadas: 2, rotulo: "dois quintos da barra" }),
  },

  // ───────────────────────── Lição 3 — Calcular a porcentagem de um valor
  {
    id: "por-ideia-1porcento", pasta: "licoes",
    alt: "Quadrado de 100 quadradinhos com 15 preenchidos.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 15, rotulo: "cada quadradinho é 1% do total" }),
  },
  {
    id: "por-res-15-240", pasta: "licoes",
    alt: "Barra dividida em 10 partes iguais, com uma marcada por uma chave.",
    desenho: () => precoPorParte({ partes: 10, pintadas: 1, valorTotal: "24", rotulo: "240 repartido em 10: cada parte vale 24" }),
  },
  {
    id: "por-q-20-350", pasta: "questoes",
    alt: "Barra dividida em 5 partes iguais, com uma preenchida.",
    desenho: () => barra({ partes: 5, pintadas: 1, rotulo: "20% é um quinto do total" }),
  },
  {
    id: "por-q-8-50", pasta: "questoes",
    alt: "Quadrado de 100 quadradinhos com 8 preenchidos.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 8, rotulo: "8 de cada 100" }),
  },
  {
    id: "por-q-30-90", pasta: "questoes",
    alt: "Barra dividida em 10 partes iguais, com 3 preenchidas.",
    desenho: () => barra({ partes: 10, pintadas: 3, rotulo: "30% são três décimos" }),
  },
  {
    id: "por-q-gripe", pasta: "questoes",
    alt: "Quadrado de 100 quadradinhos, nenhum preenchido.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 0, rotulo: "0,15% não chega a preencher um quadradinho" }),
  },

  // ───────────────────────── Lição 4 — Porcentagens de cabeça
  {
    id: "por-ideia-atalhos", pasta: "licoes",
    alt: "Lista dos atalhos mentais: 10 por cento é dividir por dez, 1 por cento por cem, 50 por cento é metade, 25 por cento é metade da metade, 5 por cento é metade de 10 por cento.",
    desenho: () => listasComuns({
      largura: 420,
      colunas: [{
        titulo: "os atalhos",
        itens: ["10% → ÷ 10", "1% → ÷ 100", "50% → metade", "25% → metade da metade", "5% → metade de 10%"],
      }],
      rotulo: "o resto se monta somando estes",
    }),
  },
  {
    id: "por-res-35-60", pasta: "licoes",
    alt: "Barra dividida em 10 partes iguais, com uma marcada por uma chave.",
    desenho: () => precoPorParte({ partes: 10, pintadas: 1, valorTotal: "6", rotulo: "60 repartido em 10: cada parte vale 6" }),
  },
  {
    id: "por-q-10-450", pasta: "questoes",
    alt: "Barra dividida em 10 partes iguais, com uma preenchida.",
    desenho: () => barra({ partes: 10, pintadas: 1, rotulo: "10% é uma parte de dez" }),
  },
  {
    id: "por-q-25-80", pasta: "questoes",
    alt: "Roda dividida em 4 fatias iguais, com uma preenchida.",
    desenho: () => roda({ partes: 4, pintadas: 1, rotulo: "25% é metade da metade" }),
  },
  {
    id: "por-q-15-200", pasta: "questoes",
    alt: "Barra dividida em 20 partes iguais, com 3 preenchidas.",
    desenho: () => barra({ partes: 20, pintadas: 3, rotulo: "15% = 10% + 5%", largura: 460 }),
  },
  {
    id: "por-q-comunitario", pasta: "questoes",
    alt: "Quarenta círculos organizados em quatro fileiras de dez, nenhum destacado.",
    desenho: () => colecao({ total: 40, destacados: 0, porLinha: 10, rotulo: "a classe inteira: 40 estudantes" }),
  },

  // ───────────────────────── Lição 5 — Desconto e aumento
  {
    id: "por-ideia-desconto", pasta: "licoes",
    alt: "Barra dividida em 10 partes iguais, com 8 preenchidas.",
    desenho: () => barra({ partes: 10, pintadas: 8, rotulo: "desconto de 20% = pagar 80%" }),
  },
  {
    id: "por-res-camisa", pasta: "licoes",
    alt: "Barra dividida em 10 partes iguais, com uma marcada por uma chave.",
    desenho: () => precoPorParte({ partes: 10, pintadas: 1, valorTotal: "R$ 6,00", rotulo: "R$ 60,00 repartidos em 10 partes" }),
  },
  {
    id: "por-q-200-15", pasta: "questoes",
    alt: "Barra dividida em 20 partes iguais, com 17 preenchidas.",
    desenho: () => barra({ partes: 20, pintadas: 17, rotulo: "tirar 15% é ficar com 85%", largura: 460 }),
  },
  {
    id: "por-q-aumento", pasta: "questoes",
    alt: "Quadrado de 100 quadradinhos, todos preenchidos.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 100, rotulo: "o valor de hoje já é 100%" }),
  },
  {
    id: "por-q-sobe-desce", pasta: "questoes",
    alt: "Barra dividida em 5 partes iguais, com uma preenchida.",
    desenho: () => barra({ partes: 5, pintadas: 1, rotulo: "20% é um quinto — mas um quinto DE QUÊ?" }),
  },
  {
    id: "por-q-farmacia", pasta: "questoes",
    alt: "Barra dividida em 10 partes iguais, com 7 preenchidas.",
    desenho: () => barra({ partes: 10, pintadas: 7, rotulo: "com 30% de desconto, paga-se 70%" }),
  },

  // ───────────────────────── Lição 6 — Da parte para o total
  {
    id: "por-ideia-volta", pasta: "licoes",
    alt: "Barra dividida em 10 partes iguais, com 3 preenchidas.",
    desenho: () => barra({ partes: 10, pintadas: 3, rotulo: "conheço a parte; quero o inteiro" }),
  },
  {
    id: "por-res-45", pasta: "licoes",
    alt: "Barra dividida em 10 partes iguais, com 3 marcadas por uma chave que indica o valor 45.",
    desenho: () => precoPorParte({ partes: 10, pintadas: 3, valorTotal: "45", rotulo: "45 são 3 das 10 partes do total" }),
  },
  {
    id: "por-q-25-12", pasta: "questoes",
    alt: "Barra dividida em 4 partes iguais, com uma preenchida.",
    desenho: () => barra({ partes: 4, pintadas: 1, rotulo: "25% é uma parte de quatro" }),
  },
  {
    id: "por-q-15-60", pasta: "questoes",
    alt: "Barra dividida em 4 partes iguais, com uma preenchida.",
    desenho: () => barra({ partes: 4, pintadas: 1, rotulo: "quantas vezes 15 cabe em 60?" }),
  },
  {
    id: "por-q-turma", pasta: "questoes",
    alt: "Barra dividida em 5 partes iguais, com 3 preenchidas.",
    desenho: () => barra({ partes: 5, pintadas: 3, rotulo: "60% são três partes de cinco" }),
  },
  {
    id: "por-q-suco", pasta: "questoes",
    alt: "Dois recipientes cheios lado a lado, um alto rotulado água com 3 litros e um baixo rotulado refresco com 1 litro.",
    desenho: () => recipientes({
      largura: 340,
      itens: [
        { fracao: 1, altura: 132, rotulo: "água", nota: "3 litros" },
        { fracao: 1, altura: 44, rotulo: "refresco", nota: "1 litro" },
      ],
    }),
  },
  // ═════════════════════════ Ângulos ═════════════════════════

  // ───────────────────────── Lição 1 — O que é um ângulo
  {
    id: "ang-ideia-abertura", pasta: "licoes",
    alt: "Dois ângulos com a mesma abertura, um desenhado com lados curtos e outro com lados bem mais longos.",
    desenho: () => angulosComparados({
      itens: [
        { graus: 40, lado: 48, rotulo: "lados curtos" },
        { graus: 40, lado: 100, rotulo: "lados longos" },
      ],
      medida: true,
    }),
  },
  {
    id: "ang-res-relogio", pasta: "licoes",
    alt: "Relógio marcando doze horas e quinze minutos, com o ponteiro dos minutos sobre o 3.",
    desenho: () => relogio({ hora: 12, minuto: 15, rotulo: "do 12 até o 3" }),
  },
  {
    id: "ang-q-comparar", pasta: "questoes",
    alt: "Dois ângulos lado a lado: o da esquerda com lados curtos e abertura larga, o da direita com lados longos e abertura estreita.",
    desenho: () => angulosComparados({
      itens: [{ graus: 70, lado: 50 }, { graus: 40, lado: 102 }],
      medida: false,
    }),
  },
  {
    id: "ang-q-meia-volta", pasta: "questoes",
    alt: "Ângulo raso: duas semirretas opostas formando uma linha reta a partir do vértice.",
    desenho: () => angulo({ graus: 180, medida: false, rotulo: "os dois lados alinhados" }),
  },
  {
    id: "ang-q-20min", pasta: "questoes",
    alt: "Relógio marcando doze horas em ponto, com os dois ponteiros sobre o 12.",
    desenho: () => relogio({ hora: 12, minuto: 0, rotulo: "o ponteiro dos minutos parte daqui" }),
  },
  {
    id: "ang-q-prolongar", pasta: "questoes",
    alt: "Um ângulo agudo desenhado com lados de comprimento médio.",
    desenho: () => angulo({ graus: 55, medida: false, lado: 62, rotulo: "e se os lados fossem prolongados?" }),
  },

  // ───────────────────────── Lição 2 — Agudo, reto, obtuso, raso
  {
    id: "ang-ideia-classes", pasta: "licoes",
    alt: "Quatro ângulos lado a lado com as medidas 40, 90, 130 e 180 graus, identificados como agudo, reto, obtuso e raso.",
    desenho: () => angulosComparados({
      itens: [
        { graus: 40, rotulo: "agudo" },
        { graus: 90, rotulo: "reto" },
        { graus: 130, rotulo: "obtuso" },
        { graus: 180, rotulo: "raso" },
      ],
      medida: true,
    }),
  },
  {
    id: "ang-res-quatro", pasta: "licoes",
    alt: "Quatro ângulos lado a lado medindo 45, 90, 120 e 180 graus, sem classificação escrita.",
    desenho: () => angulosComparados({
      itens: [{ graus: 45 }, { graus: 90 }, { graus: 120 }, { graus: 180 }],
      medida: true,
    }),
  },
  {
    id: "ang-q-130", pasta: "questoes",
    alt: "Um ângulo de 130 graus, com a medida indicada junto ao arco.",
    desenho: () => angulo({ graus: 130, medida: true }),
  },
  {
    id: "ang-q-agudo", pasta: "questoes",
    alt: "Um ângulo reto de 90 graus, marcado com o quadradinho no vértice.",
    desenho: () => angulo({ graus: 90, medida: true, rotulo: "o ângulo reto, para comparar" }),
  },
  {
    id: "ang-q-retos-volta", pasta: "questoes",
    alt: "Duas retas perpendiculares se cruzando e formando quatro cantos iguais.",
    desenho: () => retasCruzadas({ graus: 90, rotulos: { a: "90°", b: "?", c: "?", d: "?" } }),
  },
  {
    id: "ang-q-89", pasta: "questoes",
    alt: "Um ângulo reto de 90 graus com o quadradinho no vértice, sem medida escrita.",
    desenho: () => angulo({ graus: 90, medida: false, rotulo: "este aqui é exatamente reto" }),
  },

  // ───────────────────────── Lição 3 — Usar o transferidor
  {
    id: "ang-ideia-transferidor", pasta: "licoes",
    alt: "Transferidor com as duas numerações e uma semirreta apoiada em 60 graus na escala de fora.",
    desenho: () => transferidor({ graus: 60, rotulo: "centro no vértice, zero num dos lados" }),
  },
  {
    id: "ang-res-transf", pasta: "licoes",
    alt: "Transferidor com uma semirreta que cruza a borda em 130 pela escala de fora e em 50 pela de dentro.",
    desenho: () => transferidor({ graus: 130, rotulo: "a mesma posição marca 130 numa escala e 50 na outra" }),
  },
  {
    id: "ang-q-t145", pasta: "questoes",
    alt: "Transferidor com uma semirreta apoiada perto do extremo esquerdo da escala.",
    desenho: () => transferidor({ graus: 145 }),
  },
  {
    id: "ang-q-t45", pasta: "questoes",
    alt: "Transferidor com uma semirreta inclinada para a direita, formando um ângulo fechado com a base.",
    desenho: () => transferidor({ graus: 45 }),
  },
  {
    id: "ang-q-t110", pasta: "questoes",
    alt: "Transferidor com uma semirreta inclinada para a esquerda, um pouco acima da vertical.",
    desenho: () => transferidor({ graus: 110 }),
  },
  {
    id: "ang-q-t-obtuso", pasta: "questoes",
    alt: "Transferidor com uma semirreta claramente inclinada para a esquerda, formando um ângulo aberto com a base.",
    desenho: () => transferidor({ graus: 120, rotulo: "as duas escalas mostram 60 e 120" }),
  },

  // ───────────────────────── Lição 4 — Ângulos que se completam
  {
    id: "ang-ideia-comp", pasta: "licoes",
    alt: "Um ângulo reto partido por uma semirreta em duas partes, de 55 e 35 graus.",
    desenho: () => angulosNaReta({ graus: 55, total: 90, rotuloDireita: "55°", rotuloEsquerda: "35°" }),
  },
  {
    id: "ang-res-35", pasta: "licoes",
    alt: "Uma semirreta partindo de uma linha reta e formando 35 graus de um lado.",
    desenho: () => angulosNaReta({ graus: 35, rotuloDireita: "35°", rotuloEsquerda: "?" }),
  },
  {
    id: "ang-q-comp20", pasta: "questoes",
    alt: "Um ângulo reto partido por uma semirreta, com 20 graus de um lado e o outro pedaço em branco.",
    desenho: () => angulosNaReta({ graus: 20, total: 90, rotuloDireita: "20°", rotuloEsquerda: "?" }),
  },
  {
    id: "ang-q-sup115", pasta: "questoes",
    alt: "Uma semirreta partindo de uma linha reta e formando 115 graus de um lado.",
    desenho: () => angulosNaReta({ graus: 115, rotuloDireita: "115°", rotuloEsquerda: "?" }),
  },
  {
    id: "ang-q-reta40", pasta: "questoes",
    alt: "Uma semirreta partindo de uma linha reta e formando 40 graus de um lado.",
    desenho: () => angulosNaReta({ graus: 40, rotuloDireita: "40°", rotuloEsquerda: "?" }),
  },
  {
    id: "ang-q-dobro", pasta: "questoes",
    alt: "Um ângulo reto partido em duas partes marcadas como x e 2x.",
    desenho: () => angulosNaReta({
      graus: 30, total: 90, rotuloDireita: "x", rotuloEsquerda: "2x",
      nota: "um é o dobro do outro",
    }),
  },

  // ───────────────────────── Lição 5 — Retas que se cruzam
  {
    id: "ang-ideia-cruzadas", pasta: "licoes",
    alt: "Duas retas se cruzando e formando quatro ângulos identificados como a, b, c e d.",
    desenho: () => retasCruzadas({ graus: 70, rotulos: { a: "a", b: "b", c: "c", d: "d" } }),
  },
  {
    id: "ang-res-70", pasta: "licoes",
    alt: "Duas retas se cruzando, com um dos quatro ângulos marcado como 70 graus e os outros três em branco.",
    desenho: () => retasCruzadas({ graus: 70, rotulos: { a: "70°" } }),
  },
  {
    id: "ang-q-oposto40", pasta: "questoes",
    alt: "Duas retas se cruzando, com um ângulo marcado como 40 graus.",
    desenho: () => retasCruzadas({ graus: 40, rotulos: { a: "40°" } }),
  },
  {
    id: "ang-q-vizinho55", pasta: "questoes",
    alt: "Duas retas se cruzando, com um ângulo marcado como 55 graus.",
    desenho: () => retasCruzadas({ graus: 55, rotulos: { a: "55°" } }),
  },
  {
    id: "ang-q-cruz90", pasta: "questoes",
    alt: "Duas retas perpendiculares se cruzando, com um ângulo marcado como 90 graus.",
    desenho: () => retasCruzadas({ graus: 90, rotulos: { a: "90°" } }),
  },
  {
    id: "ang-q-soma35", pasta: "questoes",
    alt: "Duas retas se cruzando, com um ângulo marcado como 35 graus.",
    desenho: () => retasCruzadas({ graus: 35, rotulos: { a: "35°" } }),
  },

  // ───────────────────────── Lição 6 — Os ângulos de um triângulo
  {
    id: "ang-ideia-triangulo", pasta: "licoes",
    alt: "Um triângulo com os três ângulos internos identificados como a, b e c.",
    desenho: () => figuraPlana({
      tipo: "triangulo-escaleno",
      rotulosVertices: ["a", "b", "c"],
      rotulo: "a + b + c = 180°",
    }),
  },
  {
    id: "ang-res-triangulo", pasta: "licoes",
    alt: "Um triângulo com dois ângulos marcados como 50 e 60 graus e o terceiro em branco.",
    desenho: () => figuraPlana({
      tipo: "triangulo-escaleno",
      rotulosVertices: ["50°", "60°", "?"],
    }),
  },
  {
    id: "ang-q-tri1", pasta: "questoes",
    alt: "Um triângulo com dois ângulos marcados como 40 e 75 graus e o terceiro em branco.",
    // Ângulos 40, 75 e 65 são todos diferentes, então o triângulo é escaleno.
    // Desenhar um isósceles aqui faria a figura contradizer os rótulos.
    desenho: () => figuraPlana({
      tipo: "triangulo-escaleno",
      rotulosVertices: ["40°", "75°", "?"],
    }),
  },
  {
    id: "ang-q-tri-reto", pasta: "questoes",
    alt: "Um triângulo retângulo com o quadradinho no vértice do ângulo reto e um ângulo marcado como 35 graus.",
    desenho: () => figuraPlana({
      tipo: "triangulo-retangulo",
      marcarReto: true,
      rotulosVertices: ["", "35°", "?"],
    }),
  },
  {
    id: "ang-q-equilatero", pasta: "questoes",
    alt: "Um triângulo equilátero, com os três lados de mesmo comprimento.",
    desenho: () => figuraPlana({
      tipo: "triangulo-equilatero",
      rotulo: "os três lados iguais",
    }),
  },
  {
    id: "ang-q-dois-retos", pasta: "questoes",
    alt: "Um triângulo retângulo com o quadradinho marcando o único ângulo reto.",
    desenho: () => figuraPlana({
      tipo: "triangulo-retangulo",
      marcarReto: true,
      rotulo: "este já gastou um ângulo reto",
    }),
  },
  // ═════════════════════════ Figuras planas ═════════════════════════

  // ───────────────────────── Lição 1 — O que é um polígono
  {
    id: "fig-ideia-poligonos", pasta: "licoes",
    alt: "Quatro polígonos lado a lado: triângulo, quadrado, pentágono e hexágono.",
    desenho: () => figurasComparadas({
      itens: [
        { lados: 3, rotulo: "triângulo" },
        { tipo: "quadrado", rotulo: "quadrilátero" },
        { lados: 5, rotulo: "pentágono" },
        { lados: 6, rotulo: "hexágono" },
      ],
    }),
  },
  {
    id: "fig-res-hexagono", pasta: "licoes",
    alt: "Um hexágono regular, com os seis lados visíveis.",
    desenho: () => figuraPlana({ lados: 6, rotulo: "um hexágono" }),
  },
  {
    id: "fig-q-poligono", pasta: "questoes",
    alt: "Um heptágono, com os sete lados retos e o contorno fechado.",
    desenho: () => figuraPlana({ lados: 7, rotulo: "todo polígono é fechado e só tem lados retos" }),
  },
  {
    id: "fig-q-octogono", pasta: "questoes",
    alt: "Um hexágono regular usado como exemplo da contagem de lados e vértices.",
    desenho: () => figuraPlana({ lados: 6, rotulo: "no hexágono: 6 lados e 6 vértices" }),
  },
  {
    id: "fig-q-pentagono", pasta: "questoes",
    alt: "Um polígono regular de cinco lados, sem nome escrito.",
    desenho: () => figuraPlana({ lados: 5 }),
  },
  {
    id: "fig-q-sete", pasta: "questoes",
    alt: "Um quadrado usado como exemplo da igualdade entre lados e ângulos.",
    desenho: () => figuraPlana({ tipo: "quadrado", rotulo: "no quadrado: 4 lados e 4 ângulos" }),
  },

  // ───────────────────────── Lição 2 — Triângulos pelos lados
  {
    id: "fig-ideia-tri-lados", pasta: "licoes",
    alt: "Três triângulos lado a lado, identificados como equilátero, isósceles e escaleno.",
    desenho: () => figurasComparadas({
      itens: [
        { tipo: "triangulo-equilatero", rotulo: "equilátero" },
        { tipo: "triangulo-isosceles", rotulo: "isósceles" },
        { tipo: "triangulo-escaleno", rotulo: "escaleno" },
      ],
    }),
  },
  {
    id: "fig-res-tri-lados", pasta: "licoes",
    alt: "Três triângulos lado a lado, sem classificação escrita.",
    desenho: () => figurasComparadas({
      itens: [
        { tipo: "triangulo-equilatero" },
        { tipo: "triangulo-isosceles" },
        { tipo: "triangulo-escaleno" },
      ],
    }),
  },
  {
    id: "fig-q-tri-6610", pasta: "questoes",
    alt: "Um triângulo com a base marcada como 10 cm e os dois outros lados como 6 cm cada.",
    desenho: () => figuraPlana({
      tipo: "triangulo-isosceles",
      rotulosLados: ["10 cm", "6 cm", "6 cm"],
    }),
  },
  {
    id: "fig-q-tri-479", pasta: "questoes",
    alt: "Um triângulo com os lados marcados como 9 cm, 7 cm e 4 cm.",
    desenho: () => figuraPlana({
      // A ordem segue as arestas do desenho: a segunda é a mais curta, então
      // é nela que o "4 cm" precisa cair.
      tipo: "triangulo-escaleno",
      rotulosLados: ["9 cm", "4 cm", "7 cm"],
    }),
  },
  {
    id: "fig-q-equilatero", pasta: "questoes",
    alt: "Um triângulo equilátero, com os três lados de mesmo comprimento.",
    desenho: () => figuraPlana({ tipo: "triangulo-equilatero", rotulo: "os três lados de mesma medida" }),
  },
  {
    id: "fig-q-desigualdade", pasta: "questoes",
    alt: "Um triângulo com um lado bem mais comprido que os outros dois.",
    desenho: () => figuraPlana({
      tipo: "triangulo-escaleno",
      rotulo: "os dois lados menores precisam alcançar as pontas do maior",
    }),
  },

  // ───────────────────────── Lição 3 — Triângulos pelos ângulos
  {
    id: "fig-ideia-tri-angulos", pasta: "licoes",
    alt: "Três ângulos lado a lado, de 60, 90 e 120 graus, mostrando o maior ângulo de cada tipo de triângulo.",
    desenho: () => angulosComparados({
      itens: [
        { graus: 60, rotulo: "acutângulo" },
        { graus: 90, rotulo: "retângulo" },
        { graus: 120, rotulo: "obtusângulo" },
      ],
      medida: true,
    }),
  },
  {
    id: "fig-res-tri-angulos", pasta: "licoes",
    alt: "Três triângulos lado a lado: um equilátero, um retângulo e um obtusângulo.",
    desenho: () => figurasComparadas({
      itens: [
        { tipo: "triangulo-equilatero" },
        { tipo: "triangulo-retangulo" },
        { tipo: "triangulo-escaleno" },
      ],
    }),
  },
  {
    id: "fig-q-tri-3060", pasta: "questoes",
    alt: "Um triângulo retângulo com o quadradinho no vértice reto e os outros ângulos marcados como 30 e 60 graus.",
    desenho: () => figuraPlana({
      tipo: "triangulo-retangulo",
      marcarReto: true,
      rotulosVertices: ["", "30°", "60°"],
    }),
  },
  {
    id: "fig-q-tri-120", pasta: "questoes",
    alt: "Um triângulo com um ângulo bem aberto marcado como 120 graus e os outros como 20 e 40 graus.",
    desenho: () => figuraPlana({
      tipo: "triangulo-obtusangulo",
      rotulosVertices: ["40°", "20°", "120°"],
    }),
  },
  {
    id: "fig-q-acutangulo", pasta: "questoes",
    alt: "Um ângulo reto de 90 graus, marcado com o quadradinho, servindo de limite.",
    desenho: () => angulo({ graus: 90, medida: true, rotulo: "o limite: agudo é tudo abaixo disso" }),
  },
  {
    id: "fig-q-equi-reto", pasta: "questoes",
    alt: "Um triângulo equilátero com os três ângulos marcados como 60 graus.",
    desenho: () => figuraPlana({
      tipo: "triangulo-equilatero",
      rotulosVertices: ["60°", "60°", "60°"],
    }),
  },

  // ───────────────────────── Lição 4 — A família dos quadriláteros
  {
    id: "fig-ideia-quadrilateros", pasta: "licoes",
    alt: "Quatro quadriláteros lado a lado: quadrado, retângulo, losango e trapézio.",
    desenho: () => figurasComparadas({
      itens: [
        { tipo: "quadrado", rotulo: "quadrado" },
        { tipo: "retangulo", rotulo: "retângulo" },
        { tipo: "losango", rotulo: "losango" },
        { tipo: "trapezio", rotulo: "trapézio" },
      ],
    }),
  },
  {
    id: "fig-res-quadrilatero", pasta: "licoes",
    alt: "Um quadrilátero com três ângulos marcados como 100, 80 e 70 graus e o quarto em branco.",
    desenho: () => figuraPlana({
      tipo: "quadrilatero",
      rotulosVertices: ["100°", "80°", "70°", "?"],
    }),
  },
  {
    id: "fig-q-quad-90", pasta: "questoes",
    alt: "Um quadrilátero com três ângulos marcados como 90, 90 e 120 graus e o quarto em branco.",
    desenho: () => figuraPlana({
      tipo: "quadrilatero",
      rotulosVertices: ["90°", "90°", "120°", "?"],
    }),
  },
  {
    id: "fig-q-quadrado", pasta: "questoes",
    alt: "Um quadrado e um losango lado a lado, para comparar lados e ângulos.",
    desenho: () => figurasComparadas({
      itens: [
        { tipo: "retangulo", rotulo: "ângulos retos" },
        { tipo: "losango", rotulo: "lados iguais" },
      ],
    }),
  },
  {
    id: "fig-q-paralelogramo", pasta: "questoes",
    alt: "Um paralelogramo, com os lados opostos paralelos dois a dois.",
    desenho: () => figuraPlana({ tipo: "paralelogramo", rotulo: "lados opostos paralelos" }),
  },
  {
    id: "fig-q-paralelo-70", pasta: "questoes",
    alt: "Um paralelogramo com um ângulo marcado como 70 graus e o vizinho em branco.",
    desenho: () => figuraPlana({
      tipo: "paralelogramo",
      rotulosVertices: ["70°", "?", "", ""],
    }),
  },

  // ───────────────────────── Lição 5 — Polígonos regulares
  {
    id: "fig-ideia-regulares", pasta: "licoes",
    alt: "Quatro polígonos regulares lado a lado: triângulo, quadrado, pentágono e hexágono.",
    desenho: () => figurasComparadas({
      itens: [
        { tipo: "triangulo-equilatero", rotulo: "3 lados" },
        { tipo: "quadrado", rotulo: "4 lados" },
        { lados: 5, rotulo: "5 lados" },
        { lados: 6, rotulo: "6 lados" },
      ],
    }),
  },
  {
    id: "fig-res-pentagono", pasta: "licoes",
    alt: "Um pentágono regular, com os cinco lados iguais.",
    desenho: () => figuraPlana({ lados: 5, rotulo: "em quantos triângulos ele se parte?" }),
  },
  {
    id: "fig-q-hexagono", pasta: "questoes",
    alt: "Um hexágono regular, com os seis lados iguais.",
    desenho: () => figuraPlana({ lados: 6 }),
  },
  {
    id: "fig-q-hex-regular", pasta: "questoes",
    alt: "Um hexágono regular, com os seis ângulos internos iguais entre si.",
    desenho: () => figuraPlana({ lados: 6, rotulo: "os seis ângulos são iguais" }),
  },
  {
    id: "fig-q-regular", pasta: "questoes",
    alt: "Um losango e um retângulo lado a lado, nenhum dos dois regular.",
    desenho: () => figurasComparadas({
      itens: [
        { tipo: "losango", rotulo: "lados iguais, ângulos não" },
        { tipo: "retangulo", rotulo: "ângulos iguais, lados não" },
      ],
    }),
  },
  {
    id: "fig-q-octogono-tri", pasta: "questoes",
    alt: "Um octógono regular, com os oito lados iguais.",
    desenho: () => figuraPlana({ lados: 8, rotulo: "octógono: oito vértices" }),
  },

  // ───────────────────────── Lição 6 — Circunferência e círculo
  {
    id: "fig-ideia-circulo", pasta: "licoes",
    alt: "Uma circunferência com o centro marcado, um raio e um diâmetro destacados.",
    desenho: () => circulo({ mostrar: ["raio", "diametro"], rotulo: "centro, raio e diâmetro" }),
  },
  {
    id: "fig-res-circulo", pasta: "licoes",
    alt: "Uma circunferência com o diâmetro destacado atravessando o centro.",
    desenho: () => circulo({ mostrar: ["diametro"], rotulo: "o diâmetro atravessa de borda a borda" }),
  },
  {
    id: "fig-q-raio9", pasta: "questoes",
    alt: "Uma circunferência com o raio destacado, do centro até a borda.",
    desenho: () => circulo({ mostrar: ["raio"], rotulo: "do centro até a borda" }),
  },
  {
    id: "fig-q-diametro30", pasta: "questoes",
    alt: "Uma circunferência com o diâmetro destacado passando pelo centro.",
    desenho: () => circulo({ mostrar: ["diametro"], rotulo: "de borda a borda, pelo centro" }),
  },
  {
    id: "fig-q-circulo-linha", pasta: "questoes",
    alt: "Um círculo preenchido, mostrando a região interna além da linha do contorno.",
    desenho: () => circulo({ preenchido: true, rotulo: "aqui a região de dentro está preenchida" }),
  },
  {
    id: "fig-q-roda", pasta: "questoes",
    alt: "Uma circunferência com o centro marcado e o raio indicado.",
    desenho: () => circulo({ raio: 80, mostrar: ["raio"], rotulo: "a roda vista de frente" }),
  },
  // ═════════════════════════ Perímetro ═════════════════════════

  // ───────────────────────── Lição 1 — O que é perímetro
  {
    id: "per-ideia-contorno", pasta: "licoes",
    alt: "Um retângulo sem malha interna, com os quatro lados marcados como 6 cm e 4 cm.",
    desenho: () => retanguloMalha({ colunas: 6, linhas: 4, malha: false, rotuloLargura: "6 cm", rotuloAltura: "4 cm", rotulo: "o perímetro percorre só a borda" }),
  },
  {
    id: "per-res-triangulo", pasta: "licoes",
    alt: "Um triângulo com os lados marcados como 9 cm, 5 cm e 7 cm.",
    desenho: () => figuraPlana({ tipo: "triangulo-escaleno", rotulosLados: ["9 cm", "5 cm", "7 cm"] }),
  },
  {
    id: "per-q-quadrilatero", pasta: "questoes",
    alt: "Um quadrilátero com os quatro lados marcados como 6 cm, 5 cm, 4 cm e 3 cm.",
    desenho: () => figuraPlana({ tipo: "quadrilatero", rotulosLados: ["6 cm", "5 cm", "4 cm", "3 cm"] }),
  },
  {
    id: "per-q-equilatero", pasta: "questoes",
    alt: "Um triângulo equilátero com os três lados marcados como 7 cm.",
    desenho: () => figuraPlana({ tipo: "triangulo-equilatero", rotulosLados: ["7 cm", "7 cm", "7 cm"] }),
  },
  {
    id: "per-q-unidade", pasta: "questoes",
    alt: "Um retângulo sem malha, com o contorno destacado e os lados medidos em centímetros.",
    desenho: () => retanguloMalha({ colunas: 5, linhas: 3, malha: false, rotuloLargura: "5 cm", rotuloAltura: "3 cm", rotulo: "o contorno se mede com régua" }),
  },
  {
    id: "per-q-pentagono", pasta: "questoes",
    alt: "Um pentágono com os cinco lados marcados como 4 cm, 4 cm, 6 cm, 6 cm e 5 cm.",
    desenho: () => figuraPlana({ lados: 5, rotulosLados: ["4 cm", "4 cm", "6 cm", "6 cm", "5 cm"] }),
  },

  // ───────────────────────── Lição 2 — Polígonos regulares
  {
    id: "per-ideia-regular", pasta: "licoes",
    alt: "Um hexágono regular com os seis lados marcados como 5 cm.",
    desenho: () => figuraPlana({ lados: 6, rotulosLados: ["5", "5", "5", "5", "5", "5"], rotulo: "seis lados iguais: 6 × 5" }),
  },
  {
    id: "per-res-pentagono", pasta: "licoes",
    alt: "Um pentágono regular com os cinco lados marcados como 8 cm.",
    desenho: () => figuraPlana({ lados: 5, rotulosLados: ["8", "8", "8", "8", "8"] }),
  },
  {
    id: "per-q-hexagono", pasta: "questoes",
    alt: "Um hexágono regular, com os seis lados de mesma medida.",
    desenho: () => figuraPlana({ lados: 6, rotulo: "hexágono regular" }),
  },
  {
    id: "per-q-quadrado", pasta: "questoes",
    alt: "Um quadrado com os quatro lados de mesma medida.",
    desenho: () => figuraPlana({ tipo: "quadrado", rotulo: "quatro lados iguais" }),
  },
  {
    id: "per-q-octogono", pasta: "questoes",
    alt: "Um octógono regular, com os oito lados de mesma medida.",
    desenho: () => figuraPlana({ lados: 8, rotulo: "octógono regular: oito lados iguais" }),
  },
  {
    id: "per-q-tri-45", pasta: "questoes",
    alt: "Um triângulo equilátero, com os três lados de mesma medida.",
    desenho: () => figuraPlana({ tipo: "triangulo-equilatero", rotulo: "três lados iguais" }),
  },

  // ───────────────────────── Lição 3 — Perímetro do retângulo
  {
    id: "per-ideia-retangulo", pasta: "licoes",
    alt: "Um retângulo com a base marcada como base e a altura marcada como altura.",
    desenho: () => retanguloMalha({ colunas: 7, linhas: 4, malha: false, rotuloLargura: "base", rotuloAltura: "altura", rotulo: "base + altura é meia volta" }),
  },
  {
    id: "per-res-retangulo", pasta: "licoes",
    alt: "Um retângulo com base de 12 cm e altura de 5 cm, sem malha interna.",
    desenho: () => retanguloMalha({ colunas: 12, linhas: 5, malha: false, cel: 22, rotuloLargura: "12 cm", rotuloAltura: "5 cm" }),
  },
  {
    id: "per-q-ret-8-3", pasta: "questoes",
    alt: "Um retângulo com base de 8 cm e altura de 3 cm.",
    desenho: () => retanguloMalha({ colunas: 8, linhas: 3, malha: false, cel: 28, rotuloLargura: "8 cm", rotuloAltura: "3 cm" }),
  },
  {
    id: "per-q-quad-9", pasta: "questoes",
    alt: "Um quadrado com 9 cm de lado.",
    desenho: () => retanguloMalha({ colunas: 9, linhas: 9, malha: false, cel: 22, rotuloLargura: "9 cm", rotuloAltura: "9 cm" }),
  },
  {
    id: "per-q-ret-volta", pasta: "questoes",
    alt: "Um retângulo com a base marcada como 10 cm e a altura em branco.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 5, malha: false, cel: 24, rotuloLargura: "10 cm", rotuloAltura: "?" }),
  },
  {
    id: "per-q-terreno", pasta: "questoes",
    alt: "Um retângulo com 25 m de comprimento e 15 m de largura.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 6, malha: false, cel: 26, rotuloLargura: "25 m", rotuloAltura: "15 m" }),
  },

  // ───────────────────────── Lição 4 — Figuras compostas
  {
    id: "per-ideia-composta", pasta: "licoes",
    alt: "Uma figura em L com os seis lados marcados: 6, 3, 2, 4, 4 e 7.",
    desenho: () => figuraComposta({
      movimentos: [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]],
      escala: 26,
      rotulosLados: ["6", "3", "2", "4", "4", "7"],
      rotulo: "o que sobe tem que descer igual",
    }),
  },
  {
    id: "per-res-composta", pasta: "licoes",
    alt: "Uma figura em L com os seis lados marcados como 4, 2, 2, 2, 2 e 4 centímetros.",
    desenho: () => figuraComposta({
      movimentos: [[4, 0], [0, 2], [-2, 0], [0, 2], [-2, 0], [0, -4]],
      escala: 36,
      rotulosLados: ["4", "2", "2", "2", "2", "4"],
    }),
  },
  {
    id: "per-q-comp-26", pasta: "questoes",
    alt: "Uma figura em L com os lados marcados como 6, 3, 2, 4, 4 e 7 centímetros.",
    desenho: () => figuraComposta({
      movimentos: [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]],
      escala: 26,
      rotulosLados: ["6", "3", "2", "4", "4", "7"],
    }),
  },
  {
    id: "per-q-comp-falta", pasta: "questoes",
    alt: "Uma figura em L com o lado de baixo marcado como 6 cm, um trecho de cima como 2 cm e o outro trecho em branco.",
    desenho: () => figuraComposta({
      movimentos: [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]],
      escala: 26,
      rotulosLados: ["6", "", "2", "", "?", ""],
    }),
  },
  {
    id: "per-q-comp-20", pasta: "questoes",
    alt: "Uma figura em L com os lados marcados como 5, 2, 2, 3, 3 e 5 centímetros.",
    desenho: () => figuraComposta({
      movimentos: [[5, 0], [0, 2], [-2, 0], [0, 3], [-3, 0], [0, -5]],
      escala: 32,
      rotulosLados: ["5", "2", "2", "3", "3", "5"],
    }),
  },
  {
    id: "per-q-comp-envolve", pasta: "questoes",
    alt: "Uma figura em L desenhada sobre a malha, cabendo num quadrado de 4 por 4 quadradinhos.",
    desenho: () => figuraComposta({
      movimentos: [[4, 0], [0, 2], [-2, 0], [0, 2], [-2, 0], [0, -4]],
      escala: 38,
      malha: true,
      rotulo: "ela cabe num quadrado de 4 por 4",
    }),
  },

  // ───────────────────────── Lição 5 — Mesmo perímetro, tamanhos diferentes
  {
    id: "per-ideia-mesmo", pasta: "licoes",
    alt: "Um retângulo bem comprido e fino, de 9 por 1 quadradinhos.",
    desenho: () => retanguloMalha({ colunas: 9, linhas: 1, pintadas: 9, cel: 30, rotuloLargura: "9 cm", rotuloAltura: "1 cm", rotulo: "perímetro 20 cm, e só 9 quadradinhos dentro" }),
  },
  {
    id: "per-res-mesmo", pasta: "licoes",
    alt: "Um retângulo de 6 por 4 quadradinhos, todos preenchidos.",
    desenho: () => retanguloMalha({ colunas: 6, linhas: 4, pintadas: 24, cel: 30, rotuloLargura: "6 cm", rotuloAltura: "4 cm", rotulo: "o mesmo perímetro 20 cm, com 24 quadradinhos" }),
  },
  {
    id: "per-q-mesmo-8-2", pasta: "questoes",
    alt: "Um retângulo de 8 por 2 quadradinhos.",
    desenho: () => retanguloMalha({ colunas: 8, linhas: 2, pintadas: 16, cel: 30, rotuloLargura: "8 cm", rotuloAltura: "2 cm" }),
  },
  {
    id: "per-q-mesmo-5-3", pasta: "questoes",
    alt: "Um retângulo de 5 por 3 quadradinhos, sem preenchimento.",
    desenho: () => retanguloMalha({ colunas: 5, linhas: 3, cel: 34, rotuloLargura: "5 cm", rotuloAltura: "3 cm" }),
  },
  {
    id: "per-q-mesmo-compara", pasta: "questoes",
    alt: "Um retângulo de 9 por 1 quadradinhos, bem comprido e fino.",
    desenho: () => retanguloMalha({ colunas: 9, linhas: 1, cel: 30, rotuloLargura: "9 cm", rotuloAltura: "1 cm", rotulo: "mesma cerca do retângulo 6 por 4" }),
  },
  {
    id: "per-q-mesmo-16", pasta: "questoes",
    alt: "Um retângulo de 1 por 7 quadradinhos, o mais fino possível com perímetro 16.",
    desenho: () => retanguloMalha({ colunas: 7, linhas: 1, cel: 30, rotuloLargura: "7 cm", rotuloAltura: "1 cm", rotulo: "um dos casos possíveis com perímetro 16" }),
  },

  // ───────────────────────── Lição 6 — Perímetro no mundo real
  {
    id: "per-ideia-problemas", pasta: "licoes",
    alt: "Um retângulo sem malha, com o contorno destacado, representando um terreno a cercar.",
    desenho: () => retanguloMalha({ colunas: 9, linhas: 6, malha: false, cel: 26, rotuloLargura: "30 m", rotuloAltura: "20 m", rotulo: "a cerca acompanha a borda" }),
  },
  {
    id: "per-res-problema", pasta: "licoes",
    alt: "Um retângulo representando um terreno de 30 metros por 20 metros.",
    desenho: () => retanguloMalha({ colunas: 9, linhas: 6, malha: false, cel: 28, rotuloLargura: "30 m", rotuloAltura: "20 m" }),
  },
  {
    id: "per-q-moldura", pasta: "questoes",
    alt: "Um retângulo em pé, de 40 cm por 60 cm, representando um quadro.",
    desenho: () => retanguloMalha({ colunas: 4, linhas: 6, malha: false, cel: 32, rotuloLargura: "40 cm", rotuloAltura: "60 cm" }),
  },
  {
    id: "per-q-quadra", pasta: "questoes",
    alt: "Um retângulo representando uma quadra de 28 metros por 15 metros.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 5, malha: false, cel: 28, rotuloLargura: "28 m", rotuloAltura: "15 m" }),
  },
  {
    id: "per-q-arame", pasta: "questoes",
    alt: "Um retângulo representando um terreno de 18 metros por 12 metros.",
    desenho: () => retanguloMalha({ colunas: 9, linhas: 6, malha: false, cel: 28, rotuloLargura: "18 m", rotuloAltura: "12 m" }),
  },
  {
    id: "per-q-jardim", pasta: "questoes",
    alt: "Um quadrado com os quatro lados em branco, representando um jardim.",
    desenho: () => retanguloMalha({ colunas: 6, linhas: 6, malha: false, cel: 30, rotuloLargura: "?", rotuloAltura: "?", rotulo: "jardim quadrado cercado com 32 m" }),
  },
  // ═════════════════════════ Área ═════════════════════════

  // ───────────────────────── Lição 1 — O que é área
  {
    id: "are-ideia-malha", pasta: "licoes",
    alt: "Um retângulo de 5 por 3 quadradinhos, todos preenchidos.",
    desenho: () => retanguloMalha({ colunas: 5, linhas: 3, pintadas: 15, cel: 34, rotuloLargura: "5 cm", rotuloAltura: "3 cm", rotulo: "15 quadradinhos de 1 cm² cada" }),
  },
  {
    id: "are-res-5-3", pasta: "licoes",
    alt: "Um retângulo de 5 por 3 quadradinhos, com a malha visível e nenhum preenchido.",
    desenho: () => retanguloMalha({ colunas: 5, linhas: 3, cel: 34, rotuloLargura: "5 cm", rotuloAltura: "3 cm" }),
  },
  {
    id: "are-q-6-4", pasta: "questoes",
    alt: "Um retângulo de 6 por 4 quadradinhos, com a malha visível.",
    desenho: () => retanguloMalha({ colunas: 6, linhas: 4, cel: 32, rotuloLargura: "6 cm", rotuloAltura: "4 cm" }),
  },
  {
    id: "are-q-7-2", pasta: "questoes",
    alt: "Um retângulo de 7 por 2 quadradinhos, com a malha visível.",
    desenho: () => retanguloMalha({ colunas: 7, linhas: 2, cel: 32, rotuloLargura: "7 cm", rotuloAltura: "2 cm" }),
  },
  {
    id: "are-q-unidade", pasta: "questoes",
    alt: "Um único quadradinho de 1 cm de lado, a unidade de área.",
    desenho: () => retanguloMalha({ colunas: 1, linhas: 1, pintadas: 1, cel: 54, rotuloLargura: "1 cm", rotuloAltura: "1 cm", rotulo: "a unidade: um quadradinho de 1 cm de lado" }),
  },
  {
    id: "are-q-L12", pasta: "questoes",
    alt: "Uma figura em L desenhada sobre a malha, dentro de um quadrado de 4 por 4 quadradinhos.",
    desenho: () => figuraComposta({
      movimentos: [[4, 0], [0, 2], [-2, 0], [0, 2], [-2, 0], [0, -4]],
      escala: 38, malha: true,
    }),
  },

  // ───────────────────────── Lição 2 — Área do retângulo
  {
    id: "are-ideia-retangulo", pasta: "licoes",
    alt: "Um retângulo com a malha visível, a base marcada como base e a altura como altura.",
    desenho: () => retanguloMalha({ colunas: 7, linhas: 4, cel: 32, rotuloLargura: "base", rotuloAltura: "altura", rotulo: "base é quantos por fileira; altura é quantas fileiras" }),
  },
  {
    id: "are-res-12-5", pasta: "licoes",
    alt: "Um retângulo de 12 por 5 quadradinhos, com a malha visível.",
    desenho: () => retanguloMalha({ colunas: 12, linhas: 5, cel: 24, rotuloLargura: "12 cm", rotuloAltura: "5 cm" }),
  },
  {
    id: "are-q-9-4", pasta: "questoes",
    alt: "Um retângulo de 9 por 4, sem malha interna.",
    desenho: () => retanguloMalha({ colunas: 9, linhas: 4, malha: false, cel: 28, rotuloLargura: "9 cm", rotuloAltura: "4 cm" }),
  },
  {
    id: "are-q-7-6", pasta: "questoes",
    alt: "Um retângulo de 7 por 6, sem malha interna.",
    desenho: () => retanguloMalha({ colunas: 7, linhas: 6, malha: false, cel: 30, rotuloLargura: "7 cm", rotuloAltura: "6 cm" }),
  },
  {
    id: "are-q-altura", pasta: "questoes",
    alt: "Um retângulo com a base marcada como 8 cm e a altura em branco.",
    desenho: () => retanguloMalha({ colunas: 8, linhas: 6, malha: false, cel: 28, rotuloLargura: "8 cm", rotuloAltura: "?", rotulo: "a área toda vale 48 cm²" }),
  },
  {
    id: "are-q-sala", pasta: "questoes",
    alt: "Um retângulo de 5 por 4 quadrados de um metro, representando o piso de uma sala.",
    desenho: () => retanguloMalha({ colunas: 5, linhas: 4, cel: 34, rotuloLargura: "5 m", rotuloAltura: "4 m", rotulo: "cada quadradinho é 1 m²" }),
  },

  // ───────────────────────── Lição 3 — Quadrado e triângulo
  {
    id: "are-ideia-quadrado", pasta: "licoes",
    alt: "Um triângulo com a base e a altura marcadas, a altura tracejada e perpendicular à base.",
    desenho: () => trianguloAltura({ base: 9, altura: 5, rotuloBase: "base", rotuloAltura: "altura", rotulo: "a altura é perpendicular, e não um lado inclinado" }),
  },
  {
    id: "are-res-tri", pasta: "licoes",
    alt: "Um triângulo de base 10 cm e altura 6 cm, com a altura tracejada.",
    desenho: () => trianguloAltura({ base: 10, altura: 6, rotuloBase: "10 cm", rotuloAltura: "6 cm" }),
  },
  {
    id: "are-q-quad-12", pasta: "questoes",
    alt: "Um quadrado de 12 por 12, sem malha interna.",
    desenho: () => retanguloMalha({ colunas: 12, linhas: 12, malha: false, cel: 18, rotuloLargura: "12 cm", rotuloAltura: "12 cm" }),
  },
  {
    id: "are-q-tri-8-5", pasta: "questoes",
    alt: "Um triângulo de base 8 cm e altura 5 cm, com a altura tracejada.",
    desenho: () => trianguloAltura({ base: 8, altura: 5, rotuloBase: "8 cm", rotuloAltura: "5 cm" }),
  },
  {
    id: "are-q-tri-14-9", pasta: "questoes",
    alt: "Um triângulo de base 14 cm e altura 9 cm, com a altura tracejada.",
    desenho: () => trianguloAltura({ base: 14, altura: 9, rotuloBase: "14 cm", rotuloAltura: "9 cm", apice: 0.55 }),
  },
  {
    id: "are-q-quad-81", pasta: "questoes",
    alt: "Um quadrado com os lados em branco e a área indicada como 81 centímetros quadrados.",
    desenho: () => retanguloMalha({ colunas: 6, linhas: 6, malha: false, cel: 32, rotuloLargura: "?", rotuloAltura: "?", rotulo: "a área vale 81 cm²" }),
  },

  // ───────────────────────── Lição 4 — Figuras compostas
  {
    id: "are-ideia-composta", pasta: "licoes",
    alt: "Uma figura em L sobre a malha, mostrando os quadradinhos que cabem dentro.",
    desenho: () => figuraComposta({
      movimentos: [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]],
      escala: 28, malha: true,
      rotulo: "some os retângulos, ou envolva e subtraia",
    }),
  },
  {
    id: "are-res-composta", pasta: "licoes",
    alt: "Uma figura em L sobre a malha, cabendo num quadrado de 4 por 4 quadradinhos.",
    desenho: () => figuraComposta({
      movimentos: [[4, 0], [0, 2], [-2, 0], [0, 2], [-2, 0], [0, -4]],
      escala: 38, malha: true,
    }),
  },
  {
    id: "are-q-comp-34", pasta: "questoes",
    alt: "Uma figura em L com o retângulo de baixo de 6 por 3 e o de cima de 4 por 4.",
    desenho: () => figuraComposta({
      movimentos: [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]],
      escala: 26,
      rotulosLados: ["6", "3", "2", "4", "4", "7"],
    }),
  },
  {
    id: "are-q-comp-19", pasta: "questoes",
    alt: "Uma figura em L com o retângulo de baixo de 5 por 2 e o quadrado de cima de 3 por 3.",
    desenho: () => figuraComposta({
      movimentos: [[5, 0], [0, 2], [-2, 0], [0, 3], [-3, 0], [0, -5]],
      escala: 32,
      rotulosLados: ["5", "2", "2", "3", "3", "5"],
    }),
  },
  {
    id: "are-q-buraco", pasta: "questoes",
    alt: "Uma placa retangular de 10 por 6 quadradinhos, com a malha visível.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 6, cel: 26, rotuloLargura: "10 cm", rotuloAltura: "6 cm", rotulo: "a placa antes do furo de 3 por 2" }),
  },
  {
    id: "are-q-recorte", pasta: "questoes",
    alt: "Um retângulo de 8 por 5 quadradinhos, com a malha visível.",
    desenho: () => retanguloMalha({ colunas: 8, linhas: 5, cel: 30, rotuloLargura: "8 cm", rotuloAltura: "5 cm", rotulo: "antes de recortar o quadrado de 3 de lado" }),
  },

  // ───────────────────────── Lição 5 — Trocar de unidade
  {
    id: "are-ideia-unidades", pasta: "licoes",
    alt: "Um quadrado dividido em 100 quadradinhos, ilustrando que o fator de conversão entra duas vezes.",
    desenho: () => grade({ colunas: 10, linhas: 10, pintadas: 10, rotulo: "uma fileira é só 1/10 do quadrado, não o quadrado todo" }),
  },
  {
    id: "are-res-m2", pasta: "licoes",
    alt: "Um quadrado com os lados marcados como 100 cm, representando um metro quadrado.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 10, cel: 26, rotuloLargura: "100 cm", rotuloAltura: "100 cm", rotulo: "cada fileira do desenho vale 10 cm" }),
  },
  {
    id: "are-q-3m2", pasta: "questoes",
    alt: "Três quadrados de um metro de lado, lado a lado.",
    desenho: () => retanguloMalha({ colunas: 3, linhas: 1, pintadas: 3, cel: 60, rotuloLargura: "3 m", rotuloAltura: "1 m", rotulo: "três metros quadrados" }),
  },
  {
    id: "are-q-1m2", pasta: "questoes",
    alt: "Um quadrado de um metro de lado, com a malha mostrando as fileiras de centímetros.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 10, cel: 26, rotuloLargura: "1 m", rotuloAltura: "1 m" }),
  },
  {
    id: "are-q-50000", pasta: "questoes",
    alt: "Um quadrado de um metro de lado, usado como unidade de conversão.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 10, cel: 24, rotuloLargura: "1 m", rotuloAltura: "1 m", rotulo: "1 m² = 10 000 cm²" }),
  },
  {
    id: "are-q-km2", pasta: "questoes",
    alt: "Um quadrado com os lados marcados como 1 km, ou 1000 metros.",
    desenho: () => retanguloMalha({ colunas: 8, linhas: 8, malha: false, cel: 28, rotuloLargura: "1 km", rotuloAltura: "1 km", rotulo: "1 km são 1 000 metros de lado" }),
  },

  // ───────────────────────── Lição 6 — Área no mundo real
  {
    id: "are-ideia-problemas", pasta: "licoes",
    alt: "Um piso retangular coberto por ladrilhos quadrados, mostrando as fileiras.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 8, pintadas: 80, cel: 24, rotuloLargura: "500 cm", rotuloAltura: "400 cm", rotulo: "ladrilhos de 50 cm, contados por fileiras" }),
  },
  {
    id: "are-res-ladrilho", pasta: "licoes",
    alt: "Um piso retangular dividido em 10 colunas por 8 fileiras de ladrilhos.",
    desenho: () => retanguloMalha({ colunas: 10, linhas: 8, cel: 26, rotuloLargura: "500 cm", rotuloAltura: "400 cm" }),
  },
  {
    id: "are-q-tinta", pasta: "questoes",
    alt: "Uma parede retangular de 4 metros por 3 metros.",
    desenho: () => retanguloMalha({ colunas: 4, linhas: 3, cel: 40, rotuloLargura: "4 m", rotuloAltura: "3 m", rotulo: "cada quadradinho é 1 m² de parede" }),
  },
  {
    id: "are-q-terreno", pasta: "questoes",
    alt: "Um terreno retangular de 40 metros por 25 metros.",
    desenho: () => retanguloMalha({ colunas: 8, linhas: 5, malha: false, cel: 30, rotuloLargura: "40 m", rotuloAltura: "25 m" }),
  },
  {
    id: "are-q-ladrilhos", pasta: "questoes",
    alt: "Um piso retangular de 2 metros por 1 metro, sem a malha dos ladrilhos.",
    desenho: () => retanguloMalha({ colunas: 8, linhas: 4, malha: false, cel: 28, rotuloLargura: "2 m", rotuloAltura: "1 m", rotulo: "ladrilhos quadrados de 20 cm de lado" }),
  },
  {
    id: "are-q-jardim", pasta: "questoes",
    alt: "Um jardim retangular de 12 metros por 8 metros.",
    desenho: () => retanguloMalha({ colunas: 12, linhas: 8, cel: 22, rotuloLargura: "12 m", rotuloAltura: "8 m", rotulo: "cada quadradinho é 1 m² de jardim" }),
  },
];

# CLAUDE.md — Contexto do Projeto Biblioteca Matemática

> Lido automaticamente pelo Claude Code a cada conversa neste projeto.
> Leia por completo antes de qualquer alteração.
>
> **Estado: v3 implementada.** A v2 (azul + rosa, 35 atividades em módulos)
> foi descartada por inteiro — não é referência para nada.

## O que é o projeto

Plataforma de estudo de Matemática para o Ensino Fundamental II. O aluno
entra e estuda: sem login, sem cadastro, sem banco de dados, sem IA embutida
no produto, sem gamificação. Progresso em `localStorage`.

**Catálogo completo dos 4 anos (51 matérias). Prontas: Frações e Números
decimais**, ambas no 6º ano. Cada matéria concluída emite certificado.

## Stack

- HTML + CSS + TypeScript compilado. Sem framework, sem bundler.
- `server.js` (Express, CommonJS) serve `public/` como estático.
- `tsc` compila `src/ts/*.ts` → `public/js/*.js`. `moduleResolution: "Bundler"`
  de propósito: os imports nos `.ts` terminam em `.js`. É esperado.
- `public/js/package.json` contém só `{"type":"module"}`, para o Node tratar a
  saída compilada como ESM nos testes. A raiz não pode virar `type: module`
  porque `server.js` usa `require`. Não apagar.
- Scripts: `npm run build`, `npm start`, `npm run dev`, `npm run imagens`,
  `npm test`.

## Design — leia o DESIGN.md

`DESIGN.md` na raiz **é a especificação visual vigente** (sistema inspirado no
Warp). Não é histórico. O que ele manda e não pode ser quebrado:

- superfície única: canvas quente `#2b2622`. Nunca preto puro, nunca cinza
  neutro — a temperatura é a identidade;
- **não existe acento cromático.** O off-white `#f7f5f0` É a cor da marca;
- Inter em peso 400/500. Display nunca em 700+. Tracking negativo nos títulos;
- DM Mono para contas e rótulos técnicos; Instrument Serif itálico só para o
  destaque de cada lição — usar mais que isso tira o peso do momento;
- raio 3px em botão, 4px em card. Pill só em ícone;
- elevação por hairline + contraste de superfície. **Sem sombra, sem gradiente.**

Tokens em `public/css/base.css`, com os nomes do DESIGN.md.

### A única extensão ao DESIGN.md

O documento registra que a marca não expõe paleta de erro/sucesso. Uma
plataforma de estudo precisa dizer se a resposta está certa, e isso é função,
não decoração. A extensão é mínima e dessaturada, para ficar na família quente:

    --acerto  #9db87f   6.84:1 sobre canvas · 5.70:1 sobre canvas-soft
    --erro    #d99b80   6.38:1 sobre canvas · 5.31:1 sobre canvas-soft

Os dois passam em AA nas duas superfícies. Não introduzir mais cores.

## Arquitetura do conteúdo

Três níveis: **catálogo → curso (matéria) → lição**.

- `public/dados/catalogo.json` — os 4 anos e as ~51 matérias da BNCC. Matéria
  sem conteúdo tem `disponivel: false` e NÃO pode ter `arquivo` (teste garante).
- `public/dados/cursos/<id>.json` — a matéria: descrição, vídeos e a ordem
  das lições.
- `public/dados/licoes/<curso>/<licao>.json` — uma lição.
- `public/dados/imagens.json` — **gerado**, não editar à mão.

Páginas, sem roteador: `index.html` (anos) · `ano.html?a=6` ·
`curso.html?c=fracoes` · `licao.html?c=fracoes&l=o-que-e`.

**Publicar uma matéria nova = escrever os JSONs, gerar as imagens e virar o
`disponivel` para `true`.** Nenhum HTML novo, nenhum TypeScript.

### Anatomia de uma lição

Cada lição ensina UMA ideia e tem sempre a mesma estrutura:

1. **A ideia** — por que a coisa funciona, em texto corrido.
2. **Resolvido com você** — um problema resolvido passo a passo, revelado um
   passo por vez.
3. **Sua vez** — questões, cada uma com imagem própria.

### Duas decisões do modelo que vêm de críticas reais

- `PassoResolvido` separa `explicacao` (o porquê) de `conta` (a aritmética).
  Misturar os dois num parágrafo só produz texto que manda fazer sem ensinar
  a pensar — foi o defeito da v2.
- `ErroComum` liga uma resposta errada específica ao motivo de ela ser
  tentadora. Quando o aluno erra, ele recebe o diagnóstico do engano que
  cometeu, não a solução genérica. **Esse campo é a alma da v3.** Um teste
  reprova questão sem `errosComuns`.

## Progresso e certificado

Não há banco de dados nem cadastro: tudo vive no `localStorage`, na chave
`biblioteca_matematica_v3`, organizado por curso.

O progresso de uma lição é a **lista de ids** das questões respondidas, não um
contador — contador quebra com repetição de clique ou mudança de ordem.
`acertadas` guarda só quem acertou SEM ver a resolução; é esse número que vai
para o certificado.

O certificado é emitido quando todas as lições da matéria estão concluídas,
fica salvo junto do progresso daquele curso e é exportado em PNG
(`src/ts/certificado.ts`, canvas → PNG). A página avisa o aluno que limpar os
dados do navegador apaga tudo — porque apaga mesmo.

## Vídeos

Cada matéria tem **pelo menos 3 vídeos** numa seção "Para se aprofundar", fora
das lições: o site ensina por conta própria, e o vídeo é para quem quiser ir
além. Cada um traz uma nota dizendo para quando ele serve.

**Nunca inventar URL.** `npm run videos` confere todo vídeo citado contra a API
oEmbed do YouTube (que devolve título e canal reais e dá 404 no que não existe
ou virou privado). Com `--corrigir`, ele reescreve título e canal com o valor
verdadeiro. Rodar isso antes de publicar matéria nova, e de vez em quando —
vídeo sai do ar.

O player só é carregado no clique; antes disso a página não fala com o YouTube.

## Imagens

**Toda questão tem imagem, e imagem é arquivo PNG em `/assets`.** A página
nunca desenha figura em tempo de execução.

- `ferramentas/desenhos.mjs` — 16 geradores paramétricos de SVG: roda, barra,
  barras empilhadas, barras comparadas, rodas comparadas, grade, reta numérica,
  reta decimal, coleção, recipientes, barra de etapas, corte duplo, barra por
  categorias, preço por parte, quadro de ordens e conta armada.
- `ferramentas/manifesto-imagens.mjs` — a lista de todas as imagens.
- `npm run imagens` rasteriza tudo com o Chrome headless em 2x, fundo
  transparente, e reescreve `public/dados/imagens.json`.

O conteúdo cita a imagem **pelo id**; o índice resolve caminho, alt e
dimensões. Por isso o CSS de `.figura__img` **não pode** declarar
`width: auto` — isso faria o navegador usar a largura física do PNG 2x e a
figura sairia no dobro do tamanho.

Duas regras de conteúdo para as figuras:
- o `alt` descreve o que a figura mostra, **nunca a resposta**;
- a figura não entrega o resultado. Em "qual é maior", as barras vão sem
  rótulo de fração.

## Conteúdo — regras que não podem ser quebradas

- **Toda conta verificada rodando código antes de publicar.** Nunca de cabeça.
  `tests/conteudo.test.mjs` recalcula cada resposta do zero, a partir dos dados
  do enunciado. Se você adicionar questão, adicione a verificação junto.
- **Questões de aplicação vêm de provas públicas da OBMEP**, com `fonte`
  declarada. São livres para redistribuir, com atribuição.
  - Onde achar: `https://www.obmep.org.br/provas_static/<ano>/f1n1.htm` tem os
    links (Google Drive) da prova e das soluções. O download direto funciona
    com `https://drive.google.com/uc?export=download&id=<ID>`.
  - Os PDFs são de duas colunas: `pdftotext -layout` embaralha a leitura.
    Extrair coluna a coluna com `-marginl`/`-marginr` (o pdftotext do ambiente
    é o do xpdf e **não** tem `-x/-y/-W/-H`).
  - **Conferir a solução oficial antes de usar.** O problema "Os livros da
    Elisa" (BQ 2010, nº 220) foi descartado porque a própria solução publicada
    não fecha: ela conclui N=71 com 24+7+18=49 livros.
- A OBMEP é olimpíada e **não tem itens básicos**. As lições 1 a 5 usam
  questões escritas para o site; a OBMEP entra da lição 6 em diante.
- Nunca duas alternativas corretas, nenhuma correta, ou enunciado ambíguo.

## Testes

`npm test` roda o build e três arquivos (90 testes):

- `tests/conteudo.test.mjs` — percorre o catálogo inteiro: integridade de todos
  os cursos e, principalmente, a **recontagem independente de toda a
  matemática**. Ao adicionar questão, adicione a verificação junto.
- `tests/motor.test.mjs` — correção, diagnóstico de erro, progresso por curso e
  certificado.
- `tests/pagina.test.mjs` — integração: monta as quatro páginas reais e
  percorre o caminho do aluno até o certificado.

Detalhe do teste de integração: `app.js` registra o listener de
`DOMContentLoaded` no import, ligado ao document daquele momento. Como cada
montagem cria um jsdom novo, o import usa `?m=N` para forçar reavaliação.

## Verificação visual

Screenshot com Chrome headless funciona bem. **No Windows a janela tem largura
mínima real de ~504px**, então `--window-size=390` não simula um celular de
390px: ele renderiza a 504 e corta a imagem, o que parece um bug de layout que
não existe. Para testar mobile, use 504.

## Pendências

**Prontas (padrão-ouro): Frações e Números decimais** — 16 lições, 64 questões,
150 diagnósticos de erro, 96 imagens, 8 vídeos verificados.

Falta o resto do 6º ano, na ordem do catálogo: Divisibilidade e primos,
Potências e raiz quadrada, Porcentagem, Ângulos, Figuras planas, Perímetro,
Área, Sólidos e volume, Grandezas e medidas, Plano cartesiano, Gráficos e
tabelas, Média aritmética. Depois 7º, 8º e 9º.

A decisão do usuário foi **terminar o 6º ano inteiro antes de subir de ano**.

Custo real por matéria, medido nas duas primeiras: 6 a 8 lições, ~4 questões
por lição, ~6 imagens por lição, 3 vídeos verificados, e a verificação
matemática de cada resposta. Não dá para acelerar isso sem cair no conteúdo
raso que motivou a v3.

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

**Catálogo completo dos 4 anos (51 matérias). Prontas: Frações, Números
decimais, Divisibilidade e primos, Potências e raiz quadrada, Porcentagem,
Ângulos, Figuras planas, Perímetro e Área** — todas no 6º ano. Cada matéria
concluída emite certificado.

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

- `ferramentas/desenhos.mjs` — 23 geradores paramétricos de SVG: roda, barra,
  barras empilhadas, barras comparadas, rodas comparadas, grade, reta numérica,
  reta decimal, coleção, recipientes, barra de etapas, corte duplo, barra por
  categorias, preço por parte, quadro de ordens, conta armada, arranjos
  retangulares, crivo, fatoração por divisões sucessivas, saltos na reta,
  listas com itens comuns, fatores repetidos e camadas de cubo.

  Três deles calculam a própria matemática em vez de receber o resultado
  pronto: `fatoracao` monta a cadeia de divisões, `fatoresRepetidos` expande a
  potência e `listasComuns` alinha as colunas por valor. É de propósito — o
  desenho não tem como discordar do enunciado.

- **Bloco de geometria** (`angulo`, `angulosComparados`, `angulosNaReta`,
  `retasCruzadas`, `transferidor`, `figuraPlana`, `figurasComparadas`,
  `relogio`). Todos calculam a própria caixa a partir dos pontos que geram, em
  vez de usar largura fixa — foi assim que os cortes de rótulo pararam de
  acontecer. `figuraPlana` guarda os contornos nomeados em coordenadas de 0 a 1
  e gera polígono regular de qualquer número de lados, então o manifesto pede a
  figura pelo nome sem carregar geometria junto.

  Somaram-se depois `circulo`, `retanguloMalha`, `figuraComposta` e
  `trianguloAltura`. O `figuraComposta` recebe o contorno como uma lista de
  passos [dx, dy] em unidades de malha — o manifesto descreve a figura ANDANDO
  por ela, que é como o aluno vai percorrer o perímetro — e **recusa contorno
  que não volte ao ponto de partida**. Ele também separa rótulos que se
  encavalam em vértice côncavo, onde as normais dos dois lados convergem.

- **`comRotulo(largura, rotulo)`.** O mesmo bug apareceu em QUATRO geradores
  diferentes: a largura era calculada só a partir do desenho, e um rótulo mais
  comprido que ele saía cortado pelas duas bordas. Toda função que escreve
  rótulo centralizado no rodapé deve passar a largura por esse helper.
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
  - Nem todo ano existe no caminho `provas_static`: 2017, 2018 e 2019
    respondem; 2010, 2015, 2016 e 2022 dão 404. O de 2017 publica a prova mas
    não a solução, então não dá para usar nada dele.
  - **O Banco de Questões é a fonte mais rica** e traz enunciado e solução no
    mesmo PDF. A página `banco.htm` monta os links por JavaScript, mas o
    arquivo de 2010 baixa direto de
    `http://obmep2010.obmep.org.br/bq/bancoobmep2010.pdf`. Dele vieram os
    problemas 7, 39, 64 e 177 (todos de porcentagem).
  - **Achado ao conferir: o problema 110 do BQ 2010 ("Ovos e maçãs") está
    quebrado.** O enunciado diz que o preço dos ovos caiu 10% e o da maçã
    subiu 2%; a solução oficial calcula o contrário (ovos subindo 10%, maçãs
    caindo 2%) para chegar nos 4% da resposta. Com o enunciado como está
    impresso, o gasto DIMINUI. Descartado, como "Os livros da Elisa".
  - Da 1ª Fase Nível 1 de 2018 vieram as questões 6, 15 e 18, todas
    conferidas contra o gabarito oficial. A 15 é especialmente boa: a solução
    publicada resolve por MMC(6,12,18,24,36)=72.
  - **Muita questão de olimpíada depende de uma figura do PDF.** Como toda
    figura do site é gerada por nós, essas questões ficam de fora — redesenhar
    de memória é caminho para publicar figura errada. Foi por isso que
    Potências e raiz quadrada não tem item da OBMEP: as questões de quadrado e
    área de 2019 (4, 11 e 20) são todas presas à figura.
- A OBMEP é olimpíada e **não tem itens básicos**. As lições 1 a 5 usam
  questões escritas para o site; a OBMEP entra da lição 6 em diante.
- Nunca duas alternativas corretas, nenhuma correta, ou enunciado ambíguo.

## Testes

`npm test` roda o build e três arquivos (135 testes):

- `tests/conteudo.test.mjs` — percorre o catálogo inteiro: integridade de todos
  os cursos e, principalmente, a **recontagem independente de toda a
  matemática**. Ao adicionar questão, adicione a verificação junto.

  Em geometria a conferência vai um passo além: o teste importa
  `ferramentas/desenhos.mjs`, lê as coordenadas do SVG gerado e **mede o ângulo
  desenhado com trigonometria**, comparando com o que o enunciado afirma. Se a
  figura e o texto discordarem, o teste quebra. Vale repetir isso em qualquer
  desenho cuja geometria seja o conteúdo.
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
não existe.

Para medir mobile de verdade, carregue a página dentro de um `<iframe>` de
390px numa página de sondagem: as media queries valem para o viewport do
iframe, e dá para medir tudo por script. Duas armadilhas ao fazer isso:

- `body { overflow-x: hidden }` **esconde** vazamento em vez de revelá-lo, então
  a sonda precisa desligá-lo antes de medir;
- iframe ignora `<meta viewport>`, então esse teste nunca acusaria a falta da
  tag. Conferir no HTML.

### O que já foi corrigido no celular

O layout tinha três `padding` de 24px aninhados (container → card da questão →
figura). Numa tela de 320px isso consumia 144px e as figuras eram exibidas a
**39% do tamanho** — os rótulos em DM Mono 13px viravam 5px e ficavam
ilegíveis. A correção foi reduzir os paddings para 16px abaixo de 600px e dar
**sangria até a borda da tela** às figuras. Resultado medido: pior escala subiu
de 0,39 para 0,63 em 320px, e de 0,55 para 0,78 em 390px.

A sangria usa a soma exata dos paddings dos ancestrais, **não `100vw`** — vw
inclui a barra de rolagem e cria rolagem horizontal na página inteira.

Um piso de escala com rolagem horizontal dentro da figura foi testado e
descartado: rendia 3 a 5 pontos percentuais e cobrava uma barra de rolagem com
a figura cortada. O `overflow-x: auto` ficou só como rede de segurança.

Também alinhados: a letra da alternativa (13px) com o texto (16px), por
`baseline` em vez de topo; e o botão nu, que ao quebrar de linha ficava 8px à
direita da coluna de texto por causa do próprio padding.

### Figura larga demais encolhe até sumir

Uma figura de 584px (quatro ângulos numa fileira) é exibida a **51%** num
celular de 320px, e os rótulos ficam ilegíveis. A saída não é encolher a
fonte: é a figura quebrar em mais linhas. `angulosComparados` passa a duas
linhas a partir de quatro itens, e a mesma escala subiu de 0,51 para 0,99.

Antes de publicar figura nova, medir a escala em 320 e 390px. Abaixo de ~0,7
o desenho precisa ser reorganizado, e não reduzido.

`angulosComparados` e `figurasComparadas` já fazem isso sozinhos: a partir de
quatro itens quebram em duas linhas. Os dois casos mediam 0,51 e 0,62 e
passaram para 0,99 e 0,98.

### Figura que desmente o próprio rótulo

Três erros desse tipo foram achados só na revisão visual: um lado de 4 cm
desenhado mais comprido que o de 7 cm, um triângulo dito obtusângulo sem
nenhum ângulo acima de 90°, e um trapézio isósceles com os dois ângulos da
base rotulados 100° e 80°. O aluno vê uma coisa e lê outra.

`figuraPlana` entrega os lados na ordem das arestas do desenho, então o rótulo
tem que casar com o comprimento real daquela aresta — não com a ordem em que
as medidas aparecem no enunciado. O teste de conteúdo agora mede lados e
ângulos do SVG e reprova forma que não corresponda ao nome.

### As linhas de lista no celular são grade, não flex

`.linha` (usada no catálogo do ano e na lista de lições) usava
`flex-wrap: wrap` no celular. O corpo tem `flex-basis: auto` — ou seja, a
largura do texto — então **a quebra passava a depender do tamanho da
descrição**: matéria de resumo longo empurrava o marcador para uma linha
própria e o título encostava na margem; matéria de resumo curto mantinha o
marcador ao lado e o título ficava 38px adentro. Duas linhas vizinhas
apareciam desalinhadas entre si, e `min-width: 0` não resolve porque o flex
decide a quebra ANTES de encolher.

Abaixo de 600px a linha virou `grid` de duas colunas fixas (28px + 1fr). Todo
título começa no mesmo x, medido em 320, 360 e 390px. O rótulo do fim desce
para a segunda linha da mesma coluna — antes ele usava um `padding-left: 44px`
chutado, que nem batia com os 38px reais.

## Pendências

**Prontas (padrão-ouro): Frações, Números decimais, Divisibilidade e primos,
Potências e raiz quadrada, Porcentagem, Ângulos, Figuras planas, Perímetro e
Área** — 58 lições, 232 questões, 348 imagens, 38 vídeos verificados.

Falta o resto do 6º ano, na ordem do catálogo: Sólidos e volume, Grandezas e
medidas, Plano cartesiano, Gráficos e tabelas, Média aritmética. Depois 7º, 8º
e 9º.

**Grandezas e medidas sai só com conteúdo** — é conversão de unidade, e
`listasComuns`, `quadroOrdens` e `retaDecimal` já cobrem. As outras três pedem
bloco novo:

- **Sólidos e volume**: caixa em projeção oblíqua (com e sem cubinhos),
  planificação do cubo e do bloco, e uma comparação de sólidos nomeados.
- **Plano cartesiano**: malha com eixos, origem e pontos marcados.
- **Gráficos e tabelas**: barras, colunas e uma tabela de dados.

A decisão do usuário foi **terminar o 6º ano inteiro antes de subir de ano**.

Custo real por matéria, medido nas duas primeiras: 6 a 8 lições, ~4 questões
por lição, ~6 imagens por lição, 3 vídeos verificados, e a verificação
matemática de cada resposta. Não dá para acelerar isso sem cair no conteúdo
raso que motivou a v3.

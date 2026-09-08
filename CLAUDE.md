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

**Catálogo completo dos 4 anos (51 matérias). O 6º ano está FECHADO: as 14
matérias dele estão publicadas** — Frações, Números decimais, Divisibilidade e
primos, Potências e raiz quadrada, Porcentagem, Ângulos, Figuras planas,
Perímetro, Área, Sólidos e volume, Grandezas e medidas, Plano cartesiano,
Gráficos e tabelas e Média aritmética. Cada matéria concluída emite
certificado.

**O 7º ano está COMPLETO: 13 de 13 matérias.** Assim como o 6º.

## Stack

- HTML + CSS + TypeScript compilado. Sem framework, sem bundler.
- `server.js` (Express, CommonJS) serve `public/` como estático.
- `tsc` compila `src/ts/*.ts` → `public/js/*.js`. `moduleResolution: "Bundler"`
  de propósito: os imports nos `.ts` terminam em `.js`. É esperado.
- `public/js/package.json` contém só `{"type":"module"}`, para o Node tratar a
  saída compilada como ESM nos testes. A raiz não pode virar `type: module`
  porque `server.js` usa `require`. Não apagar.
- Scripts: `npm run build`, `npm start`, `npm run dev`, `npm run imagens`,
  `npm run figuras`, `npm run videos`, `npm test`.

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

**Há também certificado de ANO**, no pé de `ano.html`, e ele tem uma regra de
projeto que vale entender antes de mexer: o ano fecha quando todas as matérias
publicadas daquele ano **têm certificado guardado**, e o resumo é somado desses
certificados. Nada de abrir os 14 cursos e as 88 lições para descobrir se o
aluno terminou — isso trocaria a única requisição da página do ano por
cem. Por isso o certificado da matéria passou a ser **registrado sozinho assim
que ela é concluída**, mesmo sem o aluno digitar o nome: o nome é como o
certificado é impresso, não o que define a conquista.

Consequências que os testes cobrem:

- o bloco do ano **só aparece quando o ano inteiro está publicado** — num ano
  com matéria "em breve", dizer "faltam 6 matérias" cobraria do aluno uma coisa
  que ninguém escreveu ainda;
- apagar o progresso de uma matéria derruba junto o certificado daquele ano,
  porque ele deixou de estar completo;
- `Certificado.licoes` entrou depois no formato: registro antigo não tem o
  campo e vale 0, em vez de derrubar o progresso inteiro na leitura.

O desenho do certificado de ano traz a **lista das matérias** em três colunas,
e a largura de cada coluna é medida, não dividida em três partes iguais — com
largura fixa a terceira coluna acaba antes das outras e o bloco inteiro parece
torto. A entrelinha cede quando há mais matérias, para a lista nunca invadir o
rodapé.

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

- `ferramentas/desenhos.mjs` — 57 geradores paramétricos de SVG: roda, barra,
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

- **Bloco de sólidos** (`bloco`, `solidos`, `planificacao`, `planoCartesiano`).
  O `bloco` usa projeção oblíqua, e não perspectiva: perspectiva encolheria as
  arestas do fundo e o aluno mediria errado. Ele desenha os cubinhos unitários
  nas três faces visíveis quando `cubinhos: true`.

  **`planificacao` guarda cada peça com medida própria, e isso não é detalhe.**
  A primeira versão desenhava o molde do bloco como seis retângulos iguais — e
  um molde assim não fecha caixa nenhuma: o bloco tem TRÊS formatos de face,
  cada um repetido duas vezes. Um teste confere isso contando os formatos
  distintos no SVG.

  O `planoCartesiano` aceita `ligar: true`, que fecha os pontos num polígono
  (a figura da lição de retângulo no plano), e `caminho`, uma polilinha
  tracejada — o trajeto pelas ruas do mapa, que é caminho possível e não
  figura, e por isso vai tracejado.

- **Bloco de dados** (`grafico`, `tabela`), escrito para Gráficos e tabelas e
  reaproveitado inteiro por Média aritmética. `grafico` faz colunas e barras
  deitadas; `tabela` faz a grade com cabeçalho.

  Três decisões dele valem registro:

  - **`base` corta o eixo, e existe por um motivo só.** O eixo dos valores
    começa no zero por padrão. Cortá-lo é o truque mais comum de gráfico
    enganoso, e não dá para ensinar o aluno a desconfiar dele sem mostrar um:
    a lição 5 de Gráficos e tabelas desenha o par honesto/cortado lado a lado.
    Quem passa `base` está fazendo o truque de propósito, e o `alt` da figura
    tem de dizer que o eixo não começa no zero. O gerador recusa `base` em
    barras deitadas e recusa base que engoliria alguma barra inteira.
  - **`referencia` desenha o patamar da média** como linha tracejada. Ela só
    entra onde a média já é conhecida — na ideia, no resolvido e nas questões
    que perguntam outra coisa. Numa questão que PEDE a média, o patamar seria
    a resposta desenhada. O rótulo dela escolhe ficar acima ou abaixo da linha,
    o que estiver mais longe do valor escrito na primeira coluna: uma coluna na
    altura exata da média fazia os dois textos se sobreporem.
  - **A partir de cinco colunas a barra afina** (46px → 38px). Com largura
    fixa o gráfico passava de 400px e caía para 0,71 do tamanho num celular de
    320px — o mesmo aperto que obrigou `angulosComparados` a quebrar em duas
    linhas.

- **Bloco de inteiros** (`retaInteiros`, `termometro`, `saldo`, `predio`), o
  primeiro do 7º ano. Em todos eles o ZERO é desenhado com traço mais alto e
  mais claro que os vizinhos: ele virou referência, e não mais um número da
  fila.

  - `retaInteiros` aceita `salto`, um arco tracejado de um número a outro —
    é assim que soma e subtração aparecem antes de virar regra: andar para a
    direita ou para a esquerda. O salto só entra onde o resultado JÁ é
    conhecido; numa questão que pede a conta, ele seria a resposta desenhada.
  - **O passo da reta sai da largura dos rótulos, e não de um piso fixo.**
    Com piso fixo em 18px, uma reta de −10 a 10 passava de 420px e caía para
    0,69 do tamanho num celular de 320px. O passo mínimo agora é a largura do
    maior rótulo dividida por `rotuloCada`: numa reta que numera de dois em
    dois, os tracinhos podem ficar bem mais juntos sem nada se encavalar.
  - No `termometro` a coluna sobe **do bulbo** até o valor, como num
    termômetro de verdade. A primeira versão desenhava a coluna a partir do
    zero, o que deixava o negativo como um retângulo solto no meio do tubo.

- **Bloco de proporção** (`razao`, `tabelaProporcional`). O primeiro põe as
  quantidades lado a lado em blocos, porque comparação se enxerga contando —
  e `agrupar` desenha um vão a cada N blocos, que é a simplificação aparecendo
  antes de virar conta: doze e oito, agrupados de quatro em quatro, viram
  visivelmente três grupos contra dois.

  O `tabelaProporcional` desenha o FATOR que atravessa a tabela, em arco
  tracejado entre as colunas. É ele que separa "cresce junto" de "é
  proporcional": sem as setas o aluno vê números, com elas vê a regularidade.
  Nas questões que pedem um termo, a coluna dele leva "?" — a figura mostra os
  dados, nunca o valor procurado.

  Ele ganhou depois `fatoresBaixo`, um segundo arco por baixo da tabela, e é
  esse PAR de arcos que distingue direta de inversa numa olhada: os dois no
  mesmo sentido, direta; o de baixo apontando para o outro lado, inversa. Sem
  isso as duas tabelas seriam idênticas, e a matéria inteira de Regra de três
  perderia a figura que a explica.

- **Bloco de álgebra** (`sequenciaFiguras`, `balanca`, `barraIncognita`,
  `maquinaFuncao`, `tokensAlgebricos`), decidido ANTES do conteúdo — que é a
  única razão de a regra "toda questão tem imagem" não ter virado enfeite na
  primeira matéria sem figura óbvia. São três metáforas: a SEQUÊNCIA mostra de
  onde a letra vem (ela é o que sobra quando se para de desenhar figura por
  figura), a BALANÇA mostra o que a igualdade afirma, e o TOKEN — caixinha para
  a letra, moeda para o número — mostra por que 3x + 2x junta e 3x + 2 não.

  A caixa e a moeda saem do MESMO helper na balança e fora dela, de propósito:
  o aluno tem de reconhecer o mesmo objeto nos dois lugares. A distinção entre
  eles é de FORMA, e não de cor — não há paleta de acento para gastar.

  `sequenciaFiguras` calcula a própria figura a partir de `a` e `b`, como
  `fatoracao` e `fatoresRepetidos`: a figura n recebe n grupos de `a` mais `b`
  fixos, então o desenho não tem como discordar do enunciado. Um teste lê os
  retângulos do SVG de volta e confere a contagem de cada figura.

  Duas correções que a primeira versão da balança pediu, as duas por causa do
  celular e da leitura: a coluna era um trapézio largo da base à travessa e
  virava o objeto mais pesado do desenho — a balança lia como obelisco, e agora
  é um mastro fino; e as cordas prendiam nos CANTOS do prato, formando um
  triângulo que envolvia a pilha inteira de fichas justamente na figura em que
  se quer contá-las de olho. Elas prendem a 22% da borda. Com 5 fichas por
  fileira a figura passava de 470px e caía para 0,61 em 320px; são 4 por
  fileira.

  `barraIncognita` é esquemática de propósito: a largura de cada pedaço vem de
  `unidades`, que descreve o que o enunciado JÁ diz (2x é o dobro de x), e
  nunca do valor procurado — uma fita em escala entregaria a incógnita.

  Inequações também saiu sem gerador novo, e estreou a `inclinacao` da
  `balanca`, que existia desde Linguagem algébrica sem nunca ter aparecido numa
  imagem publicada: a travessa pendendo é o que distingue < de =. Duas coisas
  que ela obrigou a arrumar — a altura do SVG passou a somar o desnível, senão
  o prato que desce invadia a base e a balança parecia apoiada no chão; e a
  `retaInteiros` ganhou `intervalo`, com bolinha no extremo e faixa para o lado
  que serve.

  **A bolinha aberta é o único lugar do site que pinta com a cor da canvas.**
  Os PNGs têm fundo transparente, então `fill="none"` deixava o tracinho da
  reta atravessar o círculo por dentro — virava um "Ө", e não um furo. A
  constante `CANVAS` existe só para vazar esse miolo. E a distinção entre
  bolinha cheia e vazada não é enfeite: é a diferença entre ≤ e <, e é a única
  coisa na figura que diz se o extremo entra na resposta. Um teste lê o SVG de
  volta e confere as duas.

  Equações do 1º grau saiu inteira desse bloco, sem gerador novo — que era o
  objetivo de tê-lo decidido antes do conteúdo. Duas medidas de lá valem
  guardar: uma fileira de tokens com `x + 1 1 1 1 1 = 12` passa de 460px e cai
  para 0,62 em 320px, e quebrada em três fileiras curtas sobe para 0,85; e a
  balança de 7 fichas num prato mede 376px, que é o teto confortável dela.

- **Bloco de geometria do 7º ano** (`paralelasTransversal`), o primeiro
  gerador novo desde o 6º ano — nada da álgebra servia, e `retasCruzadas`
  desenha duas retas se cortando, não três. Ele mantém de propósito a mesma
  convenção de setores do irmão do 6º (a=[0,θ], b=[θ,180], c, d), porque o
  aluno vem de lá e trocar a ordem no meio do caminho custaria mais do que
  economizaria.

  **A regra que não pode ser quebrada: o `graus` passado é o ângulo REALMENTE
  desenhado, e os rótulos têm de bater com ele.** Os setores a e c medem
  `graus`; b e d medem 180 − graus. Rotular um setor com 70° e passar
  `graus: 65` produz figura que desmente o próprio rótulo — o defeito que a
  revisão do 6º ano achou em três figuras. Um teste percorre todas as imagens
  da matéria, mede a transversal por trigonometria e reprova qualquer rótulo
  que não seja um dos dois valores daquele desenho.

  Duas medidas de celular que ele obrigou a tomar: o comprimento das paralelas
  CEDE quando a transversal é muito inclinada (com braço fixo, uma transversal
  de 140° fazia a figura passar de 430px e cair para 0,66 em 320px), e as
  quatro chamadas de `retasCruzadas` da lição 1 precisam passar
  `largura: 380` — a largura padrão dele é 420, que dá 0,69.

- **`figuraPlana` constrói o triângulo (e o quadrilátero) A PARTIR DOS
  ÂNGULOS**, quando recebe `angulos`. É a correção mais importante do bloco de
  geometria do 7º ano: as FORMAS nomeadas têm ângulos fixos — o
  "triangulo-retangulo" abre 37,2° e não 35°, o "obtusangulo" abre 126° e não
  100°, e o "quadrilatero" abre 70,9/76/89,8/123,4. Rotular qualquer uma delas
  com os ângulos do enunciado produzia figura que desmente o próprio rótulo,
  que é exatamente o defeito que a revisão do 6º ano tinha encontrado em três
  desenhos. Dez figuras desta matéria estavam assim antes de o teste medir.

  O triângulo sai do encontro das duas retas que partem dos cantos da base com
  as inclinações pedidas. O quadrilátero é mais delicado: quatro ângulos não
  determinam um quadrilátero, então o primeiro lado é fixado em 1 e os dois
  últimos saem da condição de FECHAMENTO — o segundo lado é procurado numa
  lista até os outros dois saírem positivos, senão o contorno se cruzaria.

  Ele ganhou também `arcosVertices`: sem o arco, um rótulo "70°" solto dentro
  da figura pode ser lido como NOME do vértice, e a matéria de soma dos
  ângulos depende dessa leitura. O arco precisa de ângulos contínuos — passar
  (350, 20) para o helper `arco` desenhava o reflexo em vez do ângulo interno.

- **`varetas` e `trianguloParalela`**, os dois geradores novos da matéria.
  O primeiro mostra o que NÃO pode ser desenhado: um triângulo que não fecha.
  Com os dois menores emendados em cima e o maior embaixo, dá para VER que as
  pontas não se encontram — e isso não caberia num desenho de triângulo,
  justamente porque ele não existe. O segundo desenha o triângulo com uma
  paralela à base pelo vértice de cima, que é a DEMONSTRAÇÃO da soma 180°:
  sem ela a lição 2 viraria decoreba.

- **`piDesenrolado`**, o gerador que EXPLICA o π: o círculo com o diâmetro
  marcado em cima, e embaixo a volta esticada numa fita repartida em três
  diâmetros mais uma sobra. Existe pelo mesmo motivo de `trianguloParalela` —
  sem ele o π vira número decorado. **As medidas dele são calculadas com o π
  de verdade, e não com 3,14 arredondado**: a sobra desenhada tem de ser a
  sobra real, e um teste mede a fita do SVG para garantir isso.

  O `circulo` do 6º ano ganhou `medidas`, porque as questões precisam rotular
  VALORES ("5 cm") onde antes só cabia a palavra "raio".

- **`gradeDados`**, a grade 6×6 dos dois dados, e o único gerador que
  Probabilidade pediu. Ela não é detalhe da matéria: é a matéria. Ninguém
  acredita que somar 7 é seis vezes mais provável que somar 12 até ver as 36
  células e contar. Ela CALCULA as somas e decide as células destacadas por
  uma FUNÇÃO — `destacar: (a, b) => a + b === 7` —, então a figura não tem
  como discordar do enunciado, e um teste conta as células marcadas de volta
  do SVG.

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
  - **O problema 43 do BQ 2010 ("Duas populações") também foi descartado.**
    O enunciado diz que a população de Pirajussaraí há três anos era igual à
    que Tucupira tem HOJE, e sob essa leitura a resposta é 7 500 — que é a
    opção (e), marcada como certa no gabarito. Mas a solução publicada resolve
    outra coisa: ela trata a população de Pirajussaraí de hoje como o valor de
    Tucupira há três anos, e conclui 7 200, que é a opção (d). O gabarito e a
    prosa da própria solução discordam entre si, e a regra aqui é não publicar
    o que a fonte não fecha.
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
- **TODA alternativa errada precisa do diagnóstico dela.** Sem `ErroComum`
  casando com aquele texto, o aluno recebe "Ainda não." e a dica genérica —
  que é exatamente o defeito da v2. Frações e Números decimais foram escritas
  antes de a regra se firmar e tinham 27 alternativas descobertas; a revisão
  que fechou o 6º ano preencheu todas, e um teste agora reprova qualquer nova.
- **O aluno digita o menos do teclado; o site escreve o menos tipográfico.**
  As figuras e os textos usam − (U+2212), que é o caractere que o aluno vê e
  copia. O `paraNumero` normaliza −, –, — e os hifens Unicode para o hífen
  comum antes de converter; sem isso, quem digitasse o símbolo da própria tela
  recebia NaN, contado como erro e sem diagnóstico nenhum. Foi corrigido antes
  da primeira lição do 7º ano, e há teste.
- **O ponto do milhar não pode engolir o decimal de quem escreve `0.045`.**
  A regra que lê `1.500` como mil e quinhentos valia para QUALQUER ponto
  seguido de três algarismos, e por isso `0.045` era lido como 45. Sete
  diagnósticos já publicados (Decimais, Sólidos e as três de Grandezas e
  medidas) nunca chegavam à tela por causa disso, e o aluno que usasse o ponto
  como separador decimal tinha a resposta certa recusada. Ninguém escreve
  `0.500` querendo dizer quinhentos: o grupo antes do ponto tem de começar por
  algarismo diferente de zero. Achado ao publicar Linguagem algébrica, e há
  teste nos dois sentidos.
- **O diagnóstico tem de ser ALCANÇÁVEL pelo motor.** Em questão numérica o
  motor casa por VALOR, não por texto: um erro previsto "8,0" numa questão de
  resposta 8 é aceito como CERTO e nunca aparece, e "6" e "6,0" são o mesmo
  erro escrito duas vezes — o segundo é inalcançável. Os dois casos existiam
  em Números decimais. Teste cobre — e ele usa o `paraNumero` DO MOTOR, e não
  um parser próprio: um teste mais rígido que o produto reprova diagnóstico que
  funcionaria na tela, que foi como o `-3` de Linguagem algébrica caiu antes de
  o bug do ponto aparecer.

## Testes

`npm test` roda o build e três arquivos (223 testes):

- `tests/conteudo.test.mjs` — percorre o catálogo inteiro: integridade de todos
  os cursos e, principalmente, a **recontagem independente de toda a
  matemática**. Ao adicionar questão, adicione a verificação junto.

  Em geometria a conferência vai um passo além: o teste importa
  `ferramentas/desenhos.mjs`, lê as coordenadas do SVG gerado e **mede o ângulo
  desenhado com trigonometria**, comparando com o que o enunciado afirma. Se a
  figura e o texto discordarem, o teste quebra. Vale repetir isso em qualquer
  desenho cuja geometria seja o conteúdo.

  O mesmo vale para plano cartesiano e gráficos: `lerPlano` converte os
  círculos do SVG de volta em coordenadas e `lerColunas` converte as alturas
  das barras de volta em valores. As duas se orientam pelos **números escritos
  nos eixos**, e não pelas constantes internas do gerador — assim o teste
  continua valendo se a escala mudar. É `lerColunas` que confere a afirmação
  central da lição de gráfico enganoso: com o eixo em 50, a coluna da laranja
  fica exatamente o triplo da uva.
- `tests/motor.test.mjs` — correção, diagnóstico de erro, progresso por curso e
  certificado.
- `tests/pagina.test.mjs` — integração: monta as quatro páginas reais e
  percorre o caminho do aluno até o certificado.

Detalhe do teste de integração: `app.js` registra o listener de
`DOMContentLoaded` no import, ligado ao document daquele momento. Como cada
montagem cria um jsdom novo, o import usa `?m=N` para forçar reavaliação.

**Teste de página não pode cravar ano nem matéria.** Já quebrou duas vezes por
isso: uma ao publicar a matéria que estava fixada como indisponível, outra ao
fechar o 6º ano, quando o teste do "em breve" passou a exigir uma marca que
aquele ano não tem mais. Os dois agora escolhem do catálogo o que precisam.
O aviso do rodapé de `ano.html` some quando o ano inteiro fica pronto
(`data-nota-embreve`), e há teste para os dois lados.

## Revisão de fim de ano

Antes de subir de ano vale repetir a varredura que fechou o 6º. Ela pegou
coisas que os 185 testes não pegam, porque testa o site RODANDO:

1. **Auditoria de diagnóstico** — para cada questão, conferir que toda
   alternativa errada tem `ErroComum` e que nenhum erro numérico é aceito como
   certo ou repete o valor de outro. Isso virou teste e não precisa mais ser
   feito à mão.
2. **Rastreamento das páginas** — carregar as 107 páginas (início, 4 anos, 14
   matérias, 88 lições) num iframe de 320px e procurar: texto "Carregando" que
   nunca saiu, `img` com `naturalWidth === 0`, `scrollWidth` maior que o
   viewport, e link com "undefined" dentro.
3. **Percurso do aluno, questão por questão** — em cada lição, responder
   ERRADO (com um erro previsto), conferir que o diagnóstico daquele erro
   aparece, clicar em "Tentar de novo", responder CERTO, conferir o acerto e
   seguir até a tela de fim; no final, ler o `localStorage` e conferir que a
   lição ficou concluída com todas as questões. São 352 questões e leva uns
   dez minutos de Chrome headless.

Armadilha da sonda: ao procurar o botão da alternativa, comparar o texto por
IGUALDADE, e não com `includes` — num conjunto como 1000/10/100/10000 o
`includes("10")` casa com a alternativa errada e a sonda acusa bug que não
existe.

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

**456px é o teto de largura**, e não uma escolha por figura: é o que dá 0,65
em 320px, um pouco acima do patamar que fechou o 6º ano. Trinta e três figuras estavam acima
dele — as piores a 0,55 —, quase todas por largura PADRÃO do gerador, e não
por decisão de conteúdo: `barraEtapas`, `barraCategorias`, `retaDecimal` e
`saltos` nasceram com 500 e 520. Todas passaram para 456 sem nada se
encavalar, conferido pela auditoria de texto.

Onde a largura não é parâmetro, quem cede é o arranjo: `arranjos` quebra em
mais filas quando a fileira passaria de 456px, como `angulosComparados` e
`figurasComparadas` já faziam. A figura dos divisores de 24 saiu de 504px
(0,57) para 376px (0,77).

`angulosComparados` e `figurasComparadas` já fazem isso sozinhos: a partir de
quatro itens quebram em duas linhas. Os dois casos mediam 0,51 e 0,62 e
passaram para 0,99 e 0,98.

### Auditoria de texto nas figuras

O gerador escreve texto e confia que ele cabe: nada no código mede a largura
que a fonte de verdade vai ocupar. Foi assim que uma tabela de Probabilidade
foi publicada com "depois, contando o que saiu" atravessando a borda da
célula — o defeito que abriu esta revisão.

`npm run figuras` (`ferramentas/auditar-figuras.mjs`) sobe o próprio Chrome,
carrega as 1008 figuras, espera `document.fonts.ready` e mede cada `<text>`.
Ele sai com código 1 quando acha problema — então encadear com `;`, e não com
`&&`, como já vale para `npm run videos`. Ela procura três coisas, e as três já pegaram defeito
real:

- **texto fora da caixa do SVG** — rótulo cortado na borda da figura;
- **texto fora da célula** — o que apareceu na tela do usuário;
- **dois textos encavalados** — o pior dos três, porque não corta nada: só
  produz um texto ilegível que parece de propósito. Seis figuras estavam
  assim, publicadas: "−3/4" e "−1/2" viravam "−3/1/42", e os três ângulos de
  um triângulo achatado saíam empilhados como "401·00°40°".

**A medição tem de ser em coordenadas de TELA, e não `getBBox()`.** O
`getBBox` devolve a caixa no sistema local do elemento e ignora o transform
dos ancestrais — e o helper `fechar` alarga a caixa transladando o desenho
dentro de um `<g>`. Medindo por `getBBox`, 39 rótulos já corretos apareciam
como se vazassem, e a lista de achados era três vezes maior que a real.

E só as MOLDURAS contam como célula: a barra de um gráfico também é um
`rect`, e o rótulo do patamar da média passa por cima dela de propósito.

### Medir texto sem canvas: `larguraTexto`

Três helpers resolvem quase todo transbordo, e todo gerador que escreve
rótulo deve passar por eles:

- `larguraTexto(txt, tamanho, mono)` estima a largura por classe de
  caractere. Não é exata, mas erra por poucos pixels — o suficiente, porque
  toda folga é somada em cima dela;
- `comRotulo(largura, rotulo)` devolve a largura mínima da caixa;
- **`fechar(largura, altura, corpo, rotulo)` alarga a caixa E RECENTRA o
  desenho.** Alargar sem recentrar não resolve nada: o rótulo continua
  centrado na largura antiga e sai pela esquerda.

O mesmo vale para margem lateral: no `bloco`, os 46px chutados à esquerda
deixavam "10 cm" começar 3px fora da caixa. A margem sai da largura do
rótulo, e à direita ainda desconta a profundidade — porque o rótulo daquele
lado é escrito a `p/2 + 16` do canto.

### O rótulo procura o vão, e o valor desvia da linha

Duas regras do `grafico` que saíram desta revisão:

- **o rótulo do patamar da média testa os quatro cantos** e fica no que menos
  encosta em barra e em valor escrito. A regra antiga escolhia só entre acima
  e abaixo, encostado no eixo, e numa primeira coluna da altura da média o
  texto caía espremido dentro dela;
- **o valor de uma coluna desvia da linha de referência.** Ele é escrito 11px
  acima do topo, e quando a coluna fica um passo abaixo da média a linha
  passava por cima dele: com o eixo de 0 a 15, a média 9 cortava ao meio os
  "8" do gráfico.

A mesma disciplina em outros dois lugares: os rótulos de ponto da
`retaInteiros` sobem uma linha quando encostariam no vizinho, e o rótulo de
vértice da `figuraPlana` sai para FORA da figura quando os três não cabem
dentro — num triângulo de 40°, 40° e 100° o miolo tem uns 50px de altura.

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

**O 6º ano está completo, revisado e fechado: 14 de 14 matérias** — 88 lições,
352 questões, 1084 diagnósticos de erro, 528 imagens, 58 vídeos verificados,
10 questões da OBMEP, e certificado de matéria e de ano.

A revisão de fechamento percorreu as 107 páginas e as 352 questões no navegador
e não deixou defeito conhecido.

**O 7º ano está COMPLETO: 13 de 13 matérias** — 80 lições, 320 questões,
960 diagnósticos, 468 imagens e 52 vídeos. **A revisão de fechamento está
feita**: as 200 páginas foram rastreadas num viewport de 320px e não sobrou
"Carregando" preso, imagem com naturalWidth 0, vazamento horizontal nem link
com "undefined".

O 7º ano tem **13 matérias**, nesta ordem: ~~Números inteiros~~, ~~Números
racionais~~, ~~Razão e proporção~~, ~~Regra de três~~, ~~Porcentagem e juros
simples~~, ~~Linguagem algébrica~~, ~~Equações do 1º grau~~, ~~Inequações~~ e
~~Retas paralelas e transversais~~, ~~Triângulos e quadriláteros~~ e
~~Circunferência e círculo~~, ~~Média/moda/mediana~~ e ~~Probabilidade~~ —
todas prontas.

**O próximo passo é o 8º ano** — o catálogo tem os quatro anos, mas só os dois
primeiros foram escritos.

O que a revisão de fechamento do 7º deixou medido, e vale como linha de base
para a próxima:

- **200 páginas · 498 figuras · 0 achado estrutural.** O percurso questão por
  questão já tinha sido feito matéria a matéria durante a construção, com 0
  achados em cada uma.
- **Pior escala em 320px: 0,65**, contra 0,57 antes desta revisão. As 58
  figuras abaixo de 0,70 ficam todas entre 0,65 e 0,68 — são as retas
  numéricas e as listas de 460px, e levá-las acima de 0,70 é decisão de
  conteúdo, não de largura: teriam de mostrar menos de uma vez.
- **A auditoria de texto passou a existir**, e é ela que torna seguro apertar
  largura: sem uma medição da fonte de verdade, encolher uma figura troca um
  transbordo por um encavalamento.

Uma observação que continua valendo:

- **Média, moda e mediana reaproveita `grafico` e `tabela` inteiros**, e é
  continuação direta da Média aritmética do 6º — inclusive do gancho que a
  lição 5 de lá deixou aberto sobre o que a média não conta.

**O que Probabilidade deixou registrado:**

- **A matéria é contagem, e o teste CONTA.** Ele monta os 36 pares de dados de
  verdade e confere cada afirmação das lições contra essa varredura — nada é
  calculado por fórmula. É assim que a distribuição inteira das somas
  (1,2,3,4,5,6,5,4,3,2,1) é verificada, e que o 7 é provado ser a mais
  provável em vez de afirmado.
- **A lição 5 combate um erro de intuição específico**: contar as 11 SOMAS em
  vez dos 36 PARES. O erro tem uma raiz clara, e a lição a nomeia — tratar
  (1,6) e (6,1) como o mesmo caso. Os dados são objetos distintos.
- **A lição 6 separa probabilidade de frequência**, e desmonta a falácia do
  apostador: a moeda não tem memória, e cinco caras seguidas não deixam a
  próxima devendo uma coroa.
- Nenhuma questão da OBMEP aqui, pelo mesmo motivo registrado no débito do 6º
  ano: o Banco de Questões não cobre estatística nem probabilidade descritiva.

**O que Média, moda e mediana deixou registrado:**

- **Nenhum gerador novo**: `grafico` e `tabela` do 6º ano serviram inteiros, e
  o `referencia` do gráfico (o patamar da média em linha tracejada) vale aqui
  a mesma regra de lá — só entra onde a média JÁ é conhecida.
- **A lição 5 é a razão de a matéria existir.** Cinco salários de 2, 2, 2, 2 e
  42 mil dão média 10 e mediana 2: quatro das cinco pessoas ganham menos que a
  média, e ninguém ganha exatamente ela. O teste confere isso em muitos
  conjuntos, e não só no exemplo — aumentar o maior valor move a média e deixa
  a mediana parada, sempre.
- **A armadilha da mediana é não ordenar**, e há questão feita para isso: a
  lista chega embaralhada e o valor do meio SEM ordenar é outro. O teste
  registra a diferença explicitamente.
- **Tabela de frequência não é lista de valores.** "Nota 7 — 5 alunos" entra
  na média cinco vezes, e o teste mostra que a média dessa tabela (7,75) não é
  a média entre 7 e 9.

**O que Circunferência e círculo deixou registrado:**

- **O π é definido antes de ser usado.** A lição 2 chega nele pela medição —
  volta dividida por diâmetro, sempre o mesmo número — e só a lição 3 escreve
  a fórmula. Escrever C = 2πr antes disso seria pedir para decorar.
- **O teste usa o MESMO π da matéria (3,14) para conferir as respostas**, e o
  π exato para conferir as RELAÇÕES. Misturar os dois acusaria erro em toda
  resposta publicada, porque 3,14 é aproximação: o que precisa valer com o π
  exato é que dobrar o raio quadruplica a área, e isso é propriedade da
  fórmula, não do valor.
- **A lição 5 é a que fica na cabeça**: dobrar o raio dobra o comprimento mas
  quadruplica a área, porque o raio está ao quadrado. O teste confere isso
  para os fatores 2, 3, 4 e 10, e o fecho justifica por que duas pizzas
  pequenas quase nunca valem mais que uma grande.
- **O verificador de vídeos agora apara as pontas do título**, além de
  normalizar em NFC. A API devolveu um título com espaço sobrando no fim e ele
  acusou divergência num vídeo perfeitamente certo — o segundo ruído desse
  tipo, depois do Unicode decomposto.

**O que Triângulos e quadriláteros deixou registrado:**

- **A figura precisa ser CONSTRUÍDA a partir do enunciado, e não escolhida de
  um catálogo.** Dez figuras da matéria rotulavam ângulos que a forma não
  tinha, e só o teste que mede o polígono do SVG pegou isso. Daí veio o
  `angulos` do `figuraPlana` — a mesma disciplina de `fatoracao` e
  `sequenciaFiguras`, agora em geometria.
- **A soma 180° é demonstrada, e não afirmada.** A lição 2 traça a paralela
  pelo vértice, usa os alternos internos da matéria anterior e mostra os três
  ângulos formando um raso. A lição 5 se apoia nela: o quadrilátero se parte
  em dois triângulos, então soma o dobro. É por isso que a ordem das lições
  não pode ser trocada.
- **A condição de existência é a única pergunta de sim ou não da geometria
  até aqui**, e o teste a confere por força bruta em 12 × 12 × 24 trios,
  exigindo que "fecha" seja exatamente equivalente a o terceiro lado estar
  entre a diferença e a soma dos outros dois. O caso do EMPATE (3, 5 e 8) é
  conferido à parte: ele encaixa mas achata a figura numa reta.
- **O erro que a lição 6 avisa é medido no teste**: usar 180° onde deveria ser
  360° erra por exatamente 180 graus, e há uma asserção registrando isso.

**O que Retas paralelas e transversais deixou registrado:**

- **A matéria inteira se apoia numa propriedade só**, e as lições dizem isso
  em voz alta: correspondentes são iguais; alternos são iguais porque um
  alterno é o oposto pelo vértice de um correspondente; colaterais somam 180°
  porque um colateral é vizinho do alterno do outro. O teste confere o
  encadeamento, e não só o resultado.
- **O teste MEDE o ângulo desenhado.** Além de recalcular as respostas, ele lê
  as três retas do SVG, confere por trigonometria que duas são paralelas de
  verdade e que a transversal está no ângulo pedido, e percorre todas as
  figuras da matéria exigindo que todo rótulo numérico seja um dos dois
  valores que aquele desenho produz.
- **Os pares algébricos amarram a matéria à anterior.** Quatro questões dão os
  ângulos como 2x, x + 20, 3x e 4x, e resolver exige a equação do 1º grau da
  matéria passada — inclusive uma com letra dos dois lados (2x + 10 =
  3x − 20). O teste resolve todas por busca, nunca pela fórmula.
- A lição 6 fecha com a conferência que vale para qualquer figura da matéria:
  **se aparecer um terceiro valor de ângulo, alguma coisa saiu errada** — só
  existem dois, e eles somam 180°.

**O que Inequações deixou registrado:**

- **Ela existe por causa de uma exceção.** Quase tudo de Equações vale igual;
  o que muda é que multiplicar ou dividir os dois lados por um NEGATIVO
  inverte o sinal. O teste prova as duas metades por força bruta antes de usar
  qualquer coisa: varre pares de números e confere que somar e tirar nunca
  mexem no sentido, que multiplicar por positivo mantém e que por negativo
  inverte — sempre.
- **Nenhuma inequação é resolvida isolando a letra no teste.** Todas saem por
  busca sobre a faixa, e o teste ainda compara o conjunto achado com o que o
  isolamento daria: com coeficiente negativo, exige que isolar SEM inverter dê
  conjunto diferente. É a prova de que a regra da lição 4 é necessária.
- **O arredondamento de problema de teto é sempre para baixo**, e há teste
  varrendo vários limites quebrados. Foi o motivo de a lição 6 ganhar um quinto
  passo no roteiro que Equações não tinha: ver se a resposta cabe inteira.
- **O verificador de vídeos comparava título por `===`.** A API do YouTube às
  vezes devolve o texto DECOMPOSTO (o "ç" como c + cedilha combinante), o que
  dá bytes diferentes para títulos visualmente idênticos — e ele acusava
  divergência num vídeo perfeitamente certo. Agora normaliza os dois lados em
  NFC antes de comparar.

**O que Equações do 1º grau deixou registrado:**

- **Nenhum gerador novo.** A matéria inteira coube no bloco de álgebra, e foi
  por isso que ele foi decidido antes do conteúdo. A balança carrega o
  princípio de operar nos dois lados, que não fica óbvio sem os dois pratos
  desenhados.
- **A balança só entra onde a equação é de soma.** Ela não sabe desenhar termo
  negativo, e forçá-la a isso seria mentir na figura. Onde há subtração ou
  divisão quem trabalha é a `maquinaFuncao` com a entrada em aberto — a
  máquina invertida, que mostra a saída e pergunta o que entrou.
- **O teste não resolve nenhuma equação pela fórmula.** Ele varre a faixa em
  passos de meio e exige que a solução publicada seja a ÚNICA — o que também
  cobre as respostas quebradas (2x = 9 dá 4,5) e o zero (2x + 9 = 9 dá 0), que
  são duas questões existindo justamente para dizer que isso é normal.
- **A ordem recomendada é conforto, não correção, e o teste diz isso.** Tirar
  o termo solto antes de dividir evita fração no caminho, mas as duas ordens
  dão o mesmo valor — conferido por força bruta em toda a faixa, para a lição
  não virar dogma. O mesmo vale para tirar o menor ou o maior coeficiente na
  lição 4.
- **Abrir parêntese é conferido por equivalência.** 2(x+5) e 2x+10 têm de dar
  o mesmo valor em −20..20, e os três erros previstos (2x+5, x+10, 2x+7) têm
  de DISCORDAR em algum ponto. É a mesma disciplina da simplificação de
  Linguagem algébrica.
- Da OBMEP vieram dois problemas do Banco de Questões de 2010: o 29 ("Alunos
  com óculos") e o 74 ("Qual é o maior?"). O 29 é resolvido no teste pelo
  TEXTO — varrendo o tamanho da classe e exigindo que as frações deem números
  inteiros de pessoas —, e não pela equação. O 74 é conferido para todo valor
  comum de −50 a 50: se o maior dependesse desse valor, a questão seria
  ambígua.

**O que Linguagem algébrica deixou registrado:**

- **A letra entra por uma sequência de figuras, e não por definição.** A lição
  1 não abre dizendo o que é incógnita: abre com figuras que crescem de dois em
  dois e com a pergunta de quantos quadradinhos tem a figura 10. A letra chega
  como economia de trabalho, que é de onde ela veio historicamente.
- **A lição 5 conserta o sinal de igual antes de ele virar problema.** Anos de
  aritmética ensinam a ler "=" como "dá", e essa leitura quebra na equação. A
  balança diz o que ele afirma sem precisar de frase, e o teste exige que a
  solução publicada seja a ÚNICA da faixa inteira, achada por busca e não pela
  fórmula.
- **Simplificar é conferido por equivalência, e não por reescrita.** O teste
  não compara strings: ele avalia a expressão original e a simplificada em
  −20..20 e exige que deem o mesmo valor em todos os pontos — e exige que o
  erro previsto (13x, 6a, 8y) DISCORDE em algum ponto. Uma simplificação certa
  no caso do enunciado e errada fora dele não passa.
- Da OBMEP veio o problema 9 do Banco de Questões de 2010 ("Calculando
  distâncias"), conferido contra a solução oficial. O teste não usa a
  identidade AC + BD = AD + BC: ele varre as posições possíveis das quatro
  cidades na rodovia e exige que só uma sirva.

**Duas coisas do bloco de proporcionalidade que valem repetir:**

- **Regra de três não virou receita** porque foi montada em cima da proporção
  que o aluno já sabia, porque decidir direta ou inversa ganhou uma lição
  inteira, e porque o teste de conteúdo NÃO aplica a fórmula: ele recalcula
  pelo significado (valor unitário na direta, trabalho total na inversa) e
  compara os dois caminhos.
- **Dinheiro é conferido em centavos inteiros.** O teste de Juros simples
  trata todo valor como inteiro e só volta a reais no fim — em ponto
  flutuante, `1000 × 1,1 × 1,1` não dá exatamente 1210. A mesma disciplina do
  bloco de Racionais, com outra roupa.

E a distinção que a matéria de juros precisou deixar clara: na lição 2 as
taxas sucessivas MULTIPLICAM fatores; na lição 5, as taxas de juro simples
SOMAM. As duas afirmações são conferidas por força bruta, uma contra a outra.

**Cuidado com o ponto flutuante ao verificar racionais.** O bloco de testes de
Números racionais não usa `0.1 + 0.2`: ele reimplementa a aritmética com pares
de inteiros {n, d} e só converte para decimal no fim. Sem isso, meia dúzia de
asserções falharia por erro de arredondamento em vez de erro de conteúdo.

Débito conhecido do 6º ano: nenhum defeito, mas Plano cartesiano, Gráficos e
tabelas e Média aritmética saíram só com questão escrita para o site.

**E esse débito, na parte de estatística, é para ser riscado da lista.** A
nota antiga dizia que média era "assunto clássico de olimpíada"; foi procurado
e não é. Uma busca em CINCO Bancos de Questões (2010, 2012, 2014, 2016 e 2017)
não achou uma única ocorrência de "média aritmética", "moda" ou "mediana dos
dados" — as ocorrências de "mediana" são todas de geometria, e "mediatriz" e
"imediato" enchem o grep de ruído. O Banco é de aritmética, geometria,
combinatória e teoria dos números; estatística descritiva não é tema dele.
Média, moda e mediana e Probabilidade saem com questão própria, e não é
dívida: é a fonte que não cobre o assunto.

Os links do Banco por ano ficam em `obmep.org.br/banco.htm`, montados por
JavaScript mas com o id do Drive visível — o download direto continua sendo
`https://drive.google.com/uc?export=download&id=<ID>`.

Custo real por matéria, medido nas duas primeiras: 6 a 8 lições, ~4 questões
por lição, ~6 imagens por lição, 3 vídeos verificados, e a verificação
matemática de cada resposta. Não dá para acelerar isso sem cair no conteúdo
raso que motivou a v3.


## Idioma
Responda SEMPRE em português do Brasil (pt-BR) no chat, independente do idioma do código, comentários ou saídas de ferramentas. Nunca troque para inglês.

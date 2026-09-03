# CLAUDE.md — Contexto do Projeto Biblioteca Matemática

> Lido automaticamente pelo Claude Code a cada conversa neste projeto.
> Leia por completo antes de qualquer alteração.
>
> **Estado: v2.0 implementada (Frações como padrão-ouro).**

## O que é o projeto

**Biblioteca Matemática** — biblioteca digital de Matemática para o Ensino
Fundamental II (6º ao 9º ano). O aluno entra e estuda imediatamente: sem
login, sem cadastro, sem banco de dados, sem IA embutida no produto, sem
gamificação (XP, moedas, ranking). Progresso salvo em `localStorage`.

## Stack técnica (não mudar sem necessidade real)

- **Frontend:** HTML5 + CSS3 + TypeScript compilado (nunca JS puro na
  lógica). Sem framework.
- **Backend:** Node.js + Express (`server.js`, CommonJS), servindo `public/`
  como estático.
- **Build:** `tsc` compila `src/ts/*.ts` → `public/js/*.js`.
  `tsconfig.json` usa `moduleResolution: "Bundler"` de propósito — os imports
  dentro dos `.ts` terminam em `.js` (ex.: `from "./utils.js"`). É esperado.
- `public/js/package.json` contém apenas `{"type":"module"}`. Existe para o
  Node tratar a saída compilada como ESM ao rodar os testes (a raiz não pode
  virar `type: module` porque `server.js` usa `require`). Não apagar.
- Scripts: `npm run build`, `npm start`, `npm run dev` / `dev:build`,
  `npm test`.

## Arquitetura

O motor é **genérico e orientado a dados** — nunca duplicar lógica por
matéria. Adicionar conteúdo novo = criar o JSON + a página HTML (cópia de
`public/conteudos/fracoes.html`, trocando `data-conteudo-json`) + uma entrada
em `public/data/indice-geral.json`. **Não** deve exigir tocar em `src/ts/`.

Arquivos em `src/ts/`:
- `types.ts` — todos os tipos. União discriminada de 8 tipos de atividade
  (multipla_escolha, resposta_numerica, verdadeiro_falso, complete,
  ordenacao, encontre_erro, problema, relacionamento) e os tipos da trilha
  de módulos (`Modulo`, `ItemModulo`).
- `atividades.ts` — correção e estado de sessão. Padrão **imutável**: toda
  função devolve um novo estado, nunca muta o recebido. Manter.
- `modulos.ts` — resolve a trilha declarada no JSON, calcula a ordem global
  das atividades e valida a integridade (`verificarTrilha`).
- `progresso.ts` — `localStorage` (`biblioteca_matematica_progress`), com
  recuperação segura se os dados estiverem corrompidos.
- `componentes.ts` — funções `render*()`.
- `ilustracoes.ts` — gerador **paramétrico** de SVG (ver abaixo).
- `certificado.ts` — desenha o certificado em `<canvas>` e exporta PNG.
- `app.ts` — bootstrap. Cada página tem `data-page` no `<body>`
  (`home` / `ano` / `conteudo`). Sem roteador.

### Trilha de módulos (o coração da v2)

Um conteúdo declara `modulos: Modulo[]`. Cada módulo tem `itens`, uma lista
ORDENADA que mistura `teoria`, `exemplo`, `video`, `dica` e `atividades`.
O item `atividades` só referencia ids (`"ids": [1,2,3,4,5]`) da lista
`conteudo.atividades`. É isso que produz o formato pedido: teoria → bloco
curto de atividades → vídeo → mais atividades.

- A ordem dos módulos é a ordem **canônica**: é ela que o índice de progresso
  no `localStorage` referencia (`ordemGlobalDeAtividades`).
- Os blocos são liberados em sequência. Não é gamificação: como o progresso
  é um índice numa lista ordenada, deixar pular blocos tornaria a contagem
  de concluídas incoerente.
- `modulos` é opcional. Um JSON sem ele cai no formato linear da v1 sem
  quebrar a página.

### Ilustrações

Nada de um SVG por questão. A chave vem do JSON e é gerada por parâmetros:

    "ilustracao": "circulo:8:3"    roda em 8 partes, 3 pintadas
    "ilustracao": "barra:5:2"      barra em 5 partes, 2 pintadas
    "ilustracao": "grade:4:3:5"    grade 4x3, 5 células pintadas
    "ilustracao": "reta:4:3"       reta de 0 a 1 em quartos, 3/4 marcado
    "ilustracao": "conjunto:10:4"  10 objetos, 4 destacados

Vale em atividades e em blocos de teoria. Chave inválida devolve `null` e a
questão aparece sem imagem — nunca quebrada. Um teste garante que toda chave
usada no JSON é válida.

**Não ilustrar questão cuja imagem entrega a resposta.**

## Identidade visual v2.0

Azul + rosa, tema geométrico, mobile-first. Tokens em `public/css/global.css`.

    --azul-tinta    #123A8F   10.36:1  títulos, texto de marca
    --azul          #185ADB    5.96:1  ações, links
    --rosa          #FF2E93    3.46:1  SÓ preenchimento — nunca texto
    --framboesa     #A81455    7.25:1  o rosa que vira TEXTO

**A regra dos dois rosas é deliberada e medida:** o rosa-choque puro reprova
em WCAG AA para texto (3.46:1, mínimo 4.5:1). Ele entra em logo, badge, barra
de progresso, preenchimento de forma. Quando o rosa precisa ser letra, usa-se
a framboesa. Não trocar um pelo outro.

**Logo:** pássaro geométrico (círculo + triângulos), azul com asa e bico
rosa. Está inline como SVG no `<header>` de cada página e redesenhado em
canvas em `certificado.ts` — se mudar o desenho, mudar nos dois lugares.

`DESIGN.md` na raiz é histórico da v1. A paleta dele foi substituída.

## Conteúdo

**Pronto: Frações (6º ano)** — o padrão-ouro da v2. 4 módulos, 7 blocos de
atividades, 35 atividades + 5 extras, 5 vídeos verificados, teoria e exemplos
intercalados, certificado ao concluir.

Todo o restante do currículo (6º ao 9º) está listado com `disponivel: false`
em `public/data/indice-geral.json`. Próximos do 6º ano: Geometria, Perímetro,
Área, Medidas, Gráficos, Tabelas.

### Regras de conteúdo que não podem ser quebradas

- **Nunca inventar URL de vídeo.** Verificar a existência antes de publicar.
  O jeito rápido e confiável é a própria API do YouTube:
  `curl -s "https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D<ID>&format=json"`
  — devolve título e canal reais, e 404 se o vídeo não existir ou for privado.
  Usar o canal que o oEmbed retorna, não o nome do programa.
- **Nunca** duas alternativas corretas, nenhuma correta, cálculo errado ou
  questão ambígua.
- **Todo cálculo verificado rodando em código antes de publicar**, não de
  cabeça. Os testes conferem formato, unicidade de resposta e a ordem de
  questões de ordenação, mas não substituem verificar a conta.
- Dificuldade calibrada (decisão do usuário): básico e intermediário são a
  rampa de entrada e continuam acessíveis; **aplicação e desafio é que
  carregam a dificuldade** — problemas de duas ou mais etapas, dados
  irrelevantes, e o desafio no estilo OBMEP nível 1.

## Testes

`npm test` roda o build e três arquivos (65 testes no total):

- `tests/logica-atividades.test.mjs` — correção por tipo, imutabilidade do
  motor, **regressão do bug do placar ao retomar**, integridade da trilha e
  do conteúdo publicado.
- `tests/progresso-visual.test.mjs` — `localStorage`, renderização de
  progresso e questões, gerador de ilustrações, certificado (jsdom).
- `tests/pagina-conteudo.test.mjs` — integração: monta a página real com o
  JSON real e confere módulos, blocos, desbloqueio progressivo e conclusão.

Detalhe do teste de integração: `app.js` registra o listener de
`DOMContentLoaded` no import, ligado ao document daquele momento. Como cada
montagem cria um jsdom novo, o import usa `?montagem=N` para forçar uma
instância nova. Sem isso, só o primeiro teste passa.

Rodar `npm test` depois de qualquer mudança em `atividades.ts`,
`modulos.ts`, `progresso.ts` ou `app.ts`. `strict: true` deve continuar
passando sem erro.

Para conferência visual, dá para tirar screenshot com o Chrome headless.
Atenção: no Windows a janela tem largura mínima real de ~504px, então
`--window-size=390` **não** simula um celular de 390px — ele renderiza a 504
e corta a imagem, o que parece um bug de layout que não existe.

## Bugs

1. **Placar errado ao concluir uma matéria retomada — CORRIGIDO.**
   `iniciarSessao` reiniciava `acertos`/`erros` em zero mesmo ao continuar.
   Agora aceita o placar acumulado, e a tela de conclusão lê do
   `localStorage`. Coberto por teste de regressão nos dois níveis.
2. **Contador "zerando" ao sair e voltar — provavelmente resolvido, não
   confirmado ao vivo.** A causa nunca foi comprovada. A hipótese principal
   era a tela de retomada não mostrar onde o aluno estava. Na v2 a barra da
   trilha fica fixa no topo e os blocos concluídos ficam marcados, então o
   número aparece sempre. **Confirmar com o usuário** antes de dar como
   encerrado.
3. **CSS da busca quebrado — CORRIGIDO.** Faltava `box-sizing`, `min-width:0`
   dentro do flex e largura contida. A lupa agora é um ícone absoluto e o
   input reserva o espaço dela no `padding-left`.

## Pendências da v2.0

- Aplicar a estrutura de módulos às demais matérias (nenhuma outra existe
  ainda — Frações é a única).
- Confirmar o bug 2 ao vivo.

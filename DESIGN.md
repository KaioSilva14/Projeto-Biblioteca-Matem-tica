---
version: alpha
name: Biblioteca-Matematica-DESIGN
description: >
  Sistema de design da Biblioteca Matemática — biblioteca educacional digital
  para alunos do Ensino Fundamental II (6º ao 9º ano). Fundo branco
  predominante, superfícies secundárias muito claras, alto contraste,
  Azul Cobalto de Estudo (#185ADB) como única cor de ação, tipografia
  moderna com hierarquia forte, cards de bordas suaves e sombra discreta,
  mobile-first, sem gamificação excessiva, sem login, sem IA.

colors:
  primary: "#185ADB"
  primary-hover: "#124AB8"
  primary-pressed: "#0E3A93"
  primary-focus-ring: "#5B8DEF"
  primary-soft: "#E8EFFD"
  on-primary: "#FFFFFF"
  ink: "#171A21"
  ink-muted: "#4B5563"
  ink-subtle: "#6B7280"
  on-dark: "#FFFFFF"
  canvas: "#FFFFFF"
  surface-soft: "#F6F8FB"
  surface-alt: "#EEF2F8"
  surface-inverse: "#171A21"
  hairline: "#E3E7EE"
  hairline-strong: "#C7CDD9"
  success: "#16A34A"
  success-soft: "#E7F7ED"
  warning: "#D97706"
  warning-soft: "#FDF1E1"
  danger: "#DC2626"
  danger-soft: "#FCEAEA"
  info: "#185ADB"

typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(28px, 4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.15
  h1:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(24px, 3vw, 32px)"
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "20px–24px"
    fontWeight: 600
    lineHeight: 1.25
  h3:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "17px–18px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  mono-math:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "15px–16px"
    fontWeight: 400
    lineHeight: 1.5

rounded:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px
  section: 96px

breakpoints:
  base: "0–479px"
  sm: "480–767px"
  md: "768–1023px"
  lg: "1024–1279px"
  xl: "≥1280px"
---

## 1. Essência e objetivo visual

A Biblioteca Matemática é uma biblioteca de conteúdo educacional — não um
aplicativo, não uma rede social, não um jogo. O objetivo visual da V1 é que a
interface **desapareça em favor do conteúdo**: teoria, exemplos e atividades
de matemática devem ser lidos e resolvidos sem fricção, em qualquer
dispositivo, com carregamento rápido e navegação óbvia.

Três ideias resumem a direção visual:

- **Clareza antes de personalidade.** Uma cor de assinatura, uma família
  tipográfica, uma escala de espaçamento. Nada compete com o conteúdo
  matemático.
- **Respiro sem vazio.** Espaçamento generoso (inspirado no ritmo editorial
  da Apple), mas sem se tornar um site de vitrine — a densidade de
  informação é maior que uma landing page de marketing, porque o usuário
  está estudando.
- **Seriedade sem frieza.** Hierarquia visual forte e sistemática (como a
  da IBM), mas com cantos suavemente arredondados e sombras discretas
  (como a da HP), porque o público tem 11 a 15 anos — não é um painel
  corporativo B2B.

## 2. Público e tom de voz

- **Público:** estudantes de 11 a 15 anos, do 6º ao 9º ano do Ensino
  Fundamental II. Também é lida por professores e responsáveis, então a
  interface não pode parecer "infantil demais" a ponto de perder
  credibilidade com adultos.
- **Tom de voz:** educacional, acolhedor, direto e objetivo. Frases curtas,
  vocabulário simples, sem gírias forçadas e sem tom de "app infantil"
  (nada de exclamações em excesso, emojis decorativos em botões ou mascotes
  falantes).
- **Feedback ao aluno:** sempre construtivo. Uma resposta incorreta é
  tratada como parte do aprendizado ("Quase lá — revise o passo 2"), nunca
  como punição visual (sem sons de erro agressivos, sem vermelho piscando).

## 3. Paleta com papéis semânticos

| Token | Hex | Papel |
|---|---|---|
| `primary` | **#185ADB** | Azul Cobalto de Estudo — única cor de ação: links, botões primários, foco, seleção ativa |
| `primary-hover` | #124AB8 | Estado hover/press de elementos primários |
| `primary-pressed` | #0E3A93 | Estado pressed/active mais escuro |
| `primary-focus-ring` | #5B8DEF | Anel de foco por teclado (mais claro para se destacar sobre o azul) |
| `primary-soft` | #E8EFFD | Fundo suave para itens selecionados (ano ativo, tab ativa, chip selecionado) |
| `ink` | #171A21 | Texto principal — quase preto, alto contraste sobre branco |
| `ink-muted` | #4B5563 | Texto secundário (descrições, metadados) |
| `ink-subtle` | #6B7280 | Texto terciário (placeholders, legendas discretas) |
| `canvas` | #FFFFFF | Fundo predominante da aplicação |
| `surface-soft` | #F6F8FB | Superfície secundária muito clara (faixas alternadas, fundo de página) |
| `surface-alt` | #EEF2F8 | Superfície para blocos de destaque leve (ex.: caixa de dica) |
| `surface-inverse` | #171A21 | Uso pontual e raro (ex.: rodapé), nunca em grandes áreas de conteúdo |
| `hairline` | #E3E7EE | Bordas e divisores padrão |
| `hairline-strong` | #C7CDD9 | Bordas com mais presença (inputs, cards em destaque) |
| `success` / `success-soft` | #16A34A / #E7F7ED | Resposta correta, progresso concluído |
| `warning` / `warning-soft` | #D97706 / #FDF1E1 | Avisos não críticos (ex.: "revise antes de enviar") |
| `danger` / `danger-soft` | #DC2626 / #FCEAEA | Resposta incorreta, erro de formulário |

Regra fixa: **#185ADB é a única cor de ação da interface.** Verde, laranja e
vermelho são estritamente semânticos (sucesso/aviso/erro) e nunca decorativos.

## 4. Tipografia

- **Fonte principal recomendada:** **Inter** (Google Fonts, gratuita, licença
  aberta, excelente legibilidade em telas pequenas e números tabulares —
  importante para exercícios de matemática).
- **Alternativa de acessibilidade de leitura:** **Lexend** — fonte
  open-source desenvolvida especificamente para reduzir esforço de leitura;
  boa opção como alternativa selecionável ou para blocos longos de teoria.
- **Fonte monoespaçada (para expressões e fórmulas em texto):**
  **JetBrains Mono** — open source, números e operadores bem diferenciados.
- **Pilha de fallback:** `Inter, system-ui, -apple-system, "Segoe UI",
  Roboto, sans-serif` — garante que, mesmo sem a fonte carregada, a
  tipografia do sistema já é legível (evita "flash" de texto ilegível).
- **Escala** (mobile-first, cresce moderadamente até desktop):
  `display` 28–40px / 700 · `h1` 24–32px / 700 · `h2` 20–24px / 600 ·
  `h3` 18px / 600 · `body-lg` 17–18px / 400 (teoria e leitura longa) ·
  `body` 16px / 400 (padrão de interface) · `body-sm` 14px / 400 ·
  `label` 14px / 600 (botões, tags) · `caption` 13px / 400.
- **Nunca abaixo de 13px** para qualquer texto com função de leitura.
- **Altura de linha generosa para leitura:** 1.55–1.6 em blocos de teoria
  (público jovem lê melhor com mais espaço entre linhas); 1.2–1.3 em
  títulos.

## 5. Espaçamento, grid, largura de leitura e breakpoints

- **Escala de espaçamento (grade de 8pt):** `4 · 8 · 12 · 16 · 24 · 32 · 48 ·
  64 · 96px` — nomeada `xxs → section`.
- **Grid de conteúdo:** largura máxima de **1200px**, com margens laterais
  fluidas (`16px` no mobile, `24px` no tablet, `32px+` no desktop).
- **Largura de leitura (teoria/exemplos em texto corrido):** máximo de
  **~700px (≈70 caracteres por linha)** — blocos de teoria não devem ocupar
  a largura total do grid em telas largas, para não cansar a leitura.
- **Breakpoints (mobile-first):**

| Nome | Faixa | Comportamento |
|---|---|---|
| base | 0–479px | 1 coluna, navegação em menu hambúrguer, cards empilhados |
| sm | 480–767px | 1 coluna, cards um pouco mais largos, tipografia sobe um degrau |
| md | 768–1023px | 2 colunas em grades de cards (conteúdo, atividades) |
| lg | 1024–1279px | 3 colunas em grades de cards, navegação principal expandida |
| xl | ≥1280px | grid trava em 1200px de conteúdo; 3–4 colunas conforme componente |

## 6. Regras de componentes

**Cabeçalho / navegação principal**
- Fundo branco (`canvas`), altura ~64px, borda inferior `hairline`.
- Logo/nome à esquerda, navegação central (Início · Anos · Buscar), sem
  ícones de perfil/login/carrinho (não existem na V1).
- Mobile (`base`/`sm`): colapsa em hambúrguer; gaveta ocupa a tela cheia com
  lista vertical em `body-lg`.

**Cards de ano (6º ao 9º)**
- Grade de 4 cards (1 por ano). Fundo `canvas`, borda `hairline`, raio
  `lg` (16px), sombra discreta, padding `lg` (24px).
- Conteúdo: número do ano em destaque (`display` ou `h1`), nome curto da
  fase, ícone simples de linha (não emoji), leve indicador de progresso
  (ex.: "3 de 12 tópicos concluídos") — sem porcentagem gamificada, sem
  troféu.
- Estado ativo/selecionado: fundo `primary-soft`, borda `primary`.

**Cards de conteúdo (tópicos dentro de um ano)**
- Fundo `canvas`, borda `hairline`, raio `md` (12px), sombra ainda mais
  discreta que o card de ano (hierarquia: ano > tópico).
- Título em `h3`, descrição curta em `body-sm` `ink-muted`, tag de assunto
  (ex.: "Frações") como chip pequeno com `surface-alt`.

**Bloco de teoria**
- Largura de leitura limitada (~700px), fundo `canvas` ou `surface-soft`
  alternado por seção, tipografia `body-lg`, títulos internos em `h2`/`h3`.
- Fórmulas/expressões em `mono-math`, nunca em itálico decorativo.

**Bloco de exemplo resolvido**
- Fundo `surface-alt`, borda `hairline`, raio `md`, rótulo fixo "Exemplo"
  em `label` + `primary`. Passo a passo numerado, um passo por linha.

**Vídeos**
- Player em contêiner de raio `md`, proporção 16:9, thumbnail com botão de
  play central simples (círculo `primary` + ícone triângulo branco).
- Sem autoplay. Sem sugestões automáticas de outros vídeos ao final
  (evita distração / rabbit-hole).

**Atividades / exercícios**
- Card de pergunta com enunciado em `body`, alternativas como botões de
  largura total empilhados (mobile) ou grade 2 colunas (desktop), altura
  mínima de toque 44px.
- Botão "Verificar resposta" como ação primária; some/desabilita após
  resposta ser dada.

**Feedback de resposta**
- Correta: borda e fundo `success-soft`, ícone de check, texto curto de
  reforço positivo.
- Incorreta: borda e fundo `danger-soft`, ícone neutro (não "X" agressivo
  grande), texto explicando o próximo passo — nunca apenas "Errado".

**Progresso**
- Indicador simples e local por tópico/ano: barra de progresso fina em
  `primary` sobre `hairline`, ou "3/12 concluídos" em texto. Sem ranking,
  sem comparação entre alunos, sem XP.

**Desafios (extras opcionais)**
- Visualmente idênticos a um card de atividade, com uma tag "Desafio extra"
  em `warning-soft`/`ink` para indicar nível acima — não é competição, é
  aprofundamento opcional.

## 7. Estados

**Botão** — `default` (fundo `primary`, texto `on-primary`) → `hover`
(escurece para `primary-hover`) → `focus-visible` (anel 2px
`primary-focus-ring` com 2px de offset) → `active/pressed` (escala
`transform: scale(0.98)`, fundo `primary-pressed`) → `disabled` (opacidade
~40%, cursor not-allowed, sem hover) → `loading` (texto some, spinner
simples centralizado, botão mantém a mesma largura para não "pular" o
layout).

**Formulário / input** — `default` (borda `hairline-strong`) → `focus`
(borda `primary` + anel `primary-focus-ring`) → `error` (borda `danger`,
texto de ajuda em `danger` abaixo do campo) → `disabled` (fundo
`surface-soft`, texto `ink-subtle`).

**Resposta correta / incorreta** — ver seção 6 (Feedback de resposta).
Nunca depender só da cor: sempre acompanhar de ícone + texto (regra de
acessibilidade, ver seção 8).

**Foco por teclado** — todo elemento interativo (link, botão, alternativa
de exercício, campo) recebe **anel de foco visível de 2px**, cor
`primary-focus-ring`, com 2px de espaçamento do elemento (`outline-offset`).
Nunca `outline: none` sem substituto visível.

**Carregamento** — skeleton simples (blocos cinza `surface-soft` pulsando
suavemente) para listas de cards; spinner central para ações pontuais.
Sem telas de loading com mascote animado.

**Vazio** — ilustração de linha simples + texto curto e propositivo (ex.:
"Nenhum tópico encontrado. Tente outro termo de busca.") + ação de
recuperação quando aplicável (ex.: botão "Limpar busca").

## 8. Contraste, foco, toque, linguagem e teclado

- **Contraste:** texto principal (`ink` sobre `canvas`) deve atingir no
  mínimo **WCAG 2.2 AA** (4.5:1 para texto normal, 3:1 para texto grande).
  `#185ADB` sobre branco atende AA para texto grande/UI; para texto de
  parágrafo pequeno sobre azul, usar sempre `on-primary` (branco) sobre o
  botão, nunca azul como cor de texto de leitura corrida sobre fundo claro
  abaixo de 18px em peso normal sem checagem prévia.
- **Foco visível:** obrigatório em 100% dos elementos interativos (ver
  seção 7). Nunca remover o foco do navegador sem substituí-lo.
- **Toque mínimo:** **44×44px** em qualquer alvo tocável (botões,
  alternativas de exercício, ícones clicáveis, itens de menu).
- **Linguagem simples:** frases curtas, um conceito por vez, evitar
  jargão de UX/tech ("CTA", "modal") na interface visível ao aluno.
- **Navegação por teclado:** toda a jornada principal (escolher ano → abrir
  tópico → ler teoria → responder atividade → ver feedback) deve ser
  completável apenas com Tab / Shift+Tab / Enter / Espaço / setas em
  grupos de opções.

## 9. Imagens, ícones e ilustrações

- **Ícones:** conjunto de linha simples, um traço (~1.5–2px), cor única
  (`ink` ou `primary`, nunca as duas misturadas no mesmo ícone), tamanho
  20–24px. Referências de catálogo compatíveis com esse estilo: Feather
  Icons, Lucide, Tabler Icons, Heroicons (linha). Evitar pacotes de ícones
  3D, com gradiente ou com múltiplas cores por padrão.
- **Ilustrações:** permitidas apenas como acento pontual (estado vazio,
  cabeçalho de seção "Anos"), em estilo geométrico/linear, paleta limitada
  ao azul de marca + neutros. Evitar mascotes, personagens de desenho
  animado ou ilustrações "fofinhas" — o público de 14–15 anos rejeita
  estética muito infantilizada, e o público de 11 anos ainda lê bem
  interfaces neutras e claras.
- **Fotografia:** não é um elemento central da V1 (biblioteca de conteúdo,
  não site institucional). Se usada (ex.: capa de tópico), sempre com
  moldura de raio `md` e nunca full-bleed atrás de texto.

## 10. Responsividade

- **Celular (`base`/`sm`, até 767px):** 1 coluna em todas as grades de
  card; navegação em hambúrguer; padding de seção reduzido (`lg`/24px em
  vez de `section`/96px); tipografia de título no piso da escala
  (`display` ≈28px).
- **Tablet (`md`, 768–1023px):** grades de card em 2 colunas; navegação
  principal pode permanecer expandida ou em hambúrguer dependendo da
  largura real de conteúdo; padding de seção intermediário.
- **Desktop (`lg`/`xl`, ≥1024px):** grades de card em 3–4 colunas; grid
  trava em 1200px a partir de `xl`; navegação principal sempre expandida;
  padding de seção completo (`xxl`/`section`).
- Toque mínimo de 44px se mantém em **todas** as larguras, inclusive
  desktop com mouse (facilita também uso em telas touch grandes).

## 11. Animações e `prefers-reduced-motion`

**Permitido (funcional, curto, com propósito):**
- Transições de cor/estado em botões e links: 150–200ms, `ease`.
- Feedback de pressão em botão: `transform: scale(0.98)` no `active`
  (mesmo princípio documentado na Apple), sem exagero de escala.
- Abrir/fechar acordeões (exemplo passo a passo, FAQ): 150–250ms,
  altura + opacidade.
- Skeleton de carregamento: pulso suave e lento (~1.5s), nunca piscante.

**Não permitido na V1:**
- Parallax, scroll-jacking, partículas decorativas, carrosséis com
  autoplay, animações de entrada de texto letra a letra, confete/efeitos
  de celebração gamificados.

**`prefers-reduced-motion: reduce`:** quando ativado, remover toda
transição não essencial (scale de press, pulso de skeleton) e trocar
abrir/fechar de acordeão por corte direto sem animação. Nenhuma
funcionalidade pode depender de uma animação para ser compreendida.

## 12. Do's e Don'ts

**Do**
- Usar `#185ADB` para todo e qualquer elemento que signifique "clique aqui"
  — e só para isso.
- Manter cards com raio suave (12–16px) e sombra discreta em vez de bordas
  duras ou sombras pesadas.
- Escrever feedback de erro como orientação ("Revise o sinal da fração"),
  não como veredito ("Errado!").
- Testar todo componente novo com navegação só por teclado antes de
  considerá-lo pronto.
- Manter times de carregamento baixos: sem bibliotecas pesadas de animação,
  sem fontes não usadas carregadas "por garantia".

**Don't**
- Não introduzir uma segunda cor de ação (nem verde de "próximo passo", nem
  roxo de destaque) — o azul cobre 100% dos casos de ação.
- Não usar `border-radius: 0` (aesthetic da IBM) nem pílula total em todo
  botão (aesthetic da Apple) — ambos fogem do "bordas suaves" pedido.
- Não usar caixa alta com tracking em botões (convenção da HP) — soa formal
  e distante demais para o público de 11–15 anos.
- Não adicionar XP, moedas, ranking, avatar, badge de conquista ou qualquer
  reforço de gamificação além de um indicador simples de progresso.
- Não usar emoji como ícone funcional de interface (ok em copy pontual de
  feedback, nunca substituindo um ícone de ação).

## 13. Decisões herdadas das referências

**De `design-visual/apple/DESIGN.md` (respiro, clareza, foco no conteúdo)**
- Disciplina de **uma única cor de interação** aplicada a tudo (link, CTA,
  foco) — adotado integralmente, só trocando a cor por `#185ADB`.
- Ritmo de seções alternando fundo branco e fundo levemente diferente
  (`surface-soft`) como divisor visual, em vez de linhas/bordas pesadas.
- Micro-interação de pressão de botão via `transform: scale()` no estado
  `active`.
- Peso tipográfico econômico: preferir 400/600/700 e evitar variação de
  peso sem motivo — adaptado à escala do projeto.

**De `design-visual/hp/DESIGN.md` (branco, sinalização azul, geometria
moderada)**
- Fundo branco com faixas alternadas em cinza muito claro, azul reservado
  como sinal único de ação.
- Sombra "soft lift" discreta em cards interativos (não em toda a página).
- Geometria de cantos moderadamente arredondados (nem 0px, nem pill em
  tudo) — base para a escala de `rounded` deste documento.
- Padrão de **pill tabs** para alternar categorias — adotado para a
  navegação entre anos/séries.
- **Rejeitado deliberadamente:** rótulos de botão em caixa alta com
  tracking — não combina com o tom acolhedor pedido para o público jovem
  (ver seção 12, Don't).

**De `design-visual/ibm/DESIGN.md` (hierarquia e sistema visual)**
- Estrutura de hierarquia tipográfica em camadas nomeadas (display >
  headline/h1 > subhead/h2 > body > caption), adaptada e simplificada.
- Conceito de elevação por **mudança de superfície + hairline** em vez de
  sombra pesada — usado como reforço junto com a sombra discreta da HP,
  não como substituto total (o briefing pede "sombras discretas", não
  "zero sombra").
- Cores semânticas de status (sucesso/aviso/erro) como categoria separada
  da cor de marca — princípio adotado; valores específicos vieram das
  skills `regras-ui-ux`, não da IBM.
- Grade de espaçamento em base 4px como disciplina de consistência.

**De `regras-ui-ux/skills/clean` e `regras-ui-ux/skills/spacious`**
- Escala de espaçamento em **grade de 8pt**, adotada como espinha dorsal
  da seção 5.
- Exigência explícita de estados completos por componente (default, hover,
  focus-visible, active, disabled, loading, error) — estrutura da seção 7.
- Barra de acessibilidade: WCAG 2.2 AA, foco visível, alvo de toque
  mínimo de 44px, suporte a `prefers-reduced-motion` — adotada
  integralmente.
- "Projetar para estados vazio/carregamento/erro" — motivou a seção 7
  incluir Vazio e Carregamento como estados de primeira classe.

**De `regras-ui-ux/skills/professional`**
- Estrutura de escala de espaçamento (4/8/12/16/24/32) considerada, mas a
  paleta de cor (amarelo `#FECE14` / preto, tema de loja de eletrônicos) é
  **irrelevante e não foi usada** — pertence a outro domínio de marca.
- Tom de voz "conciso, confiante, prestativo" foi absorvido de forma
  compatível com o tom educacional pedido no briefing.

**De `regras-ui-ux/skills/geometric`**
- Vocabulário "geométrico, estruturado, limpo" reforça a escolha por
  cantos suavemente arredondados e grade consistente, em vez de formas
  orgânicas ou decorativas.
- Indicação de família tipográfica **Inter** e monoespaçada
  **JetBrains Mono** — adotadas neste documento como recomendação de
  fonte (seção 4).

**De `repertorio-frontend/README.md` (Cores, CSS, Design Systems, Fontes,
Ícones, Ilustrações, Performance, HTML, UI Kits, Templates HTML/CSS)**
- Seção **Fontes**: confirmação de Google Fonts como fonte de distribuição
  gratuita e confiável para Inter/Lexend.
- Seção **Ícones**: confirmação de que Feather/Lucide/Tabler/Heroicons são
  catálogos de ícones de linha compatíveis com o estilo pedido (usados como
  categoria de referência, não como dependência obrigatória).
- Seção **Performance**: ferramentas como PageSpeed Insight/GTmetrix citadas
  como forma de validar o requisito "rápida" do briefing em etapas
  futuras — não uma decisão visual, mas um critério de aceite a lembrar.
- Seção **CSS**: o catálogo inclui bibliotecas de animação decorativa
  (partículas, parallax, scroll-jacking) — **deliberadamente não
  incorporadas** por conflitarem com "nenhuma... excesso de animações" do
  briefing.
- Seção **Design Systems / UI Kits / Templates HTML-CSS**: consultadas como
  categoria geral; nenhum kit ou template específico foi adotado nesta
  etapa — a V1 usa um sistema próprio, não um template de terceiros.

## 14. Itens deliberadamente excluídos da V1

Confirmando o escopo do briefing, os itens abaixo **não fazem parte da V1**
e não devem aparecer em nenhuma tela, componente ou fluxo desta fase:

- Login e cadastro de usuário
- Banco de dados / persistência de conta
- Avatar e perfil de usuário
- Ranking ou qualquer comparação entre alunos
- Chat (com outros alunos, com professores ou com IA)
- Inteligência artificial (tutor, gerador de exercícios, chatbot)
- Pagamento ou qualquer fluxo de monetização
- Recursos de rede social (seguir, curtir, compartilhar perfil)
- Moedas, XP, níveis ou qualquer sistema de recompensa gamificada
- Qualquer gamificação além de um indicador simples e local de progresso

## Tabela de decisões

| Decisão | Recomendação | Motivo | Fonte consultada |
|---|---|---|---|
| Cor de assinatura/ação | `#185ADB` como única cor interativa da interface | Requisito explícito do briefing; mantém coerência de marca educacional | Especificação da Biblioteca Matemática (briefing) |
| Raio de borda dos cards | 16px (`rounded.lg`) | Atende "bordas suaves" sem herdar o 0px da IBM nem o pill total da Apple | HP DESIGN.md + briefing |
| Raio de borda dos botões | 10–12px (`rounded.md`) | Meio-termo entre pill (Apple) e quadrado (IBM); mais "ação" que o card, menos que uma pílula | HP DESIGN.md + briefing |
| Sombra de cards | Sombra discreta (baixa opacidade, blur curto) | Atende "sombras discretas" do briefing; HP já documenta esse padrão como "soft lift" | HP DESIGN.md |
| Fonte principal | Inter | Alta legibilidade, gratuita, sem vínculo com marca das empresas analisadas | Decisão própria, informada por `regras-ui-ux/geometric` |
| Fonte alternativa de leitura | Lexend | Fonte open-source projetada para reduzir esforço de leitura em público jovem | Decisão própria |
| Fonte monoespaçada | JetBrains Mono | Boa diferenciação de números/operadores para conteúdo matemático | `regras-ui-ux/geometric` |
| Escala de espaçamento | Grade de 8pt (4 a 96px) | Reforçada em duas das quatro skills lidas e compatível com o ritmo de Apple/IBM | `regras-ui-ux` (clean, spacious) |
| Alvo mínimo de toque | 44×44px | Exigência recorrente nas skills de acessibilidade consultadas | `regras-ui-ux` (clean, spacious) |
| Rótulo de botão em caixa alta | Rejeitado — manter case normal | Soa formal/distante demais para público de 11–15 anos | Conflito com HP DESIGN.md — briefing prevalece |
| Ícones | Estilo de linha, cor única, sem 3D/emoji | Mantém interface limpa e não infantilizada | `repertorio-frontend` (seção Ícones) |
| Paleta da skill `professional` (amarelo/preto) | Não utilizada | Tema de marca de loja de eletrônicos, sem relação com o produto | `regras-ui-ux/professional` — descartada intencionalmente |
| Cores semânticas (sucesso/erro) | Verde `#16A34A` / Vermelho `#DC2626` | Consistentes entre as quatro skills lidas; já reconhecíveis pelo público | `regras-ui-ux` (clean, professional, geometric, spacious) |
| Navegação entre anos (6º–9º) | Pill tabs no estilo `category-tab` | Padrão testado de filtro por categoria, comunicação compacta e clara | HP DESIGN.md |
| Elevação de cards | Sombra discreta + leve mudança de superfície | Combina o princípio de elevação por superfície da IBM com a sombra suave da HP, sem ficar pesado | IBM DESIGN.md + HP DESIGN.md |
| Animações | Só transições funcionais (150–250ms) e `scale(0.98)` no press | Reduz "excesso de animação" do briefing; usa o mesmo princípio documentado na Apple | Apple DESIGN.md + briefing |
| `prefers-reduced-motion` | Suporte obrigatório, remove transições não essenciais | Exigência explícita das skills de acessibilidade lidas | `regras-ui-ux` (clean, spacious) |
| Foco por teclado | Anel de 2px com `outline-offset`, cor `primary-focus-ring` | Necessidade de foco sempre visível; inspirado na precisão de foco documentada na IBM | IBM DESIGN.md (elevação nível 3) + briefing |
| Bibliotecas de animação decorativa (partículas, parallax) | Não adotadas | Conflitam com o requisito "rápida" e "sem excesso de animações" do briefing | `repertorio-frontend` (seção CSS) — descartadas intencionalmente |
| Progresso do aluno | Indicador simples local (ex.: "3/12 concluídos"), sem ranking/XP | Requisito explícito do briefing de evitar gamificação excessiva | Especificação da Biblioteca Matemática (briefing) |
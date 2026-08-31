# Biblioteca Matemática

Biblioteca digital de Matemática para o Ensino Fundamental II (6º ao 9º ano).
O aluno entra no site e começa a estudar imediatamente — sem login, sem
cadastro e sem dados pessoais. O progresso é salvo localmente no navegador
(localStorage).

## Objetivo

Permitir que o aluno escolha seu ano escolar, selecione um conteúdo de
Matemática e tenha acesso a uma experiência completa: teoria, exemplos
resolvidos, dicas, vídeos, atividades com correção automática, feedback
imediato, progresso e atividades extras.

## Tecnologias

- **Frontend:** HTML5, CSS3, TypeScript (compilado para JavaScript — o
  navegador nunca carrega arquivos `.ts` diretamente)
- **Backend:** Node.js + Express.js (servidor de arquivos estáticos)
- **Gerenciamento:** npm
- **Controle de versão:** Git / GitHub

Não há framework de frontend (React/Vue/Angular), não há banco de dados e
não há sistema de login, IA, chat, ranking ou gamificação.

## Estrutura do projeto

```
biblioteca-matematica/
├── src/ts/          # Código-fonte TypeScript (nunca é servido diretamente)
├── public/
│   ├── index.html   # Home
│   ├── pages/        # Páginas de cada ano (6ano.html a 9ano.html)
│   ├── conteudos/    # Páginas de conteúdo (ex.: fracoes.html)
│   ├── data/         # Dados em JSON (índice geral + conteúdo por ano)
│   ├── js/           # JavaScript gerado pelo compilador (não editar à mão)
│   ├── css/          # Estilos (global + por página)
│   └── assets/       # Imagens, ícones, thumbnails
├── server.js         # Servidor Express
└── tsconfig.json      # Configuração do compilador TypeScript
```

## Instalação

```bash
npm install
```

## Compilar o TypeScript

```bash
npm run build
```

Gera os arquivos `.js` em `public/js/` a partir de `src/ts/`.

## Executar

```bash
npm start
```

Abre o servidor em `http://localhost:3000`.

## Desenvolvimento

Duas opções, em terminais separados:

```bash
npm run dev:build   # recompila o TypeScript automaticamente a cada alteração
npm run dev          # reinicia o servidor automaticamente (nodemon)
```

## Como adicionar um novo conteúdo

1. Crie um arquivo JSON em `public/data/<ano-por-extenso>/<slug>.json`
   seguindo exatamente o formato de `public/data/sexto-ano/fracoes.json`
   (mesmos campos: `teoria`, `exemplos`, `dicas`, `videos`, `atividades`,
   `atividadesExtras`, `resumo` etc.).
2. Crie a página HTML correspondente em `public/conteudos/<slug>.html`,
   copiando `fracoes.html` como modelo e ajustando:
   - `data-conteudo-json` no `<body>` para apontar para o novo JSON;
   - o `<title>` e a `<meta name="description">`.
3. Adicione uma entrada para esse conteúdo em
   `public/data/indice-geral.json`, com `"disponivel": true` e a `"rota"`
   apontando para a nova página HTML.
4. Não é necessário alterar nenhum arquivo em `src/ts/` — o motor de
   atividades e os componentes de interface são genéricos e funcionam para
   qualquer conteúdo que siga o mesmo formato de dados.

## Como adicionar novas atividades a um conteúdo existente

Edite o array `atividades` (ou `atividadesExtras`) do JSON do conteúdo.
Cada atividade segue um dos 8 tipos suportados (`multipla_escolha`,
`resposta_numerica`, `verdadeiro_falso`, `complete`, `ordenacao`,
`encontre_erro`, `problema`, `relacionamento`) — os tipos e campos
esperados de cada um estão documentados em `src/ts/types.ts`.

Sempre confira manualmente o cálculo de cada atividade nova antes de
publicá-la (pergunta → cálculo → resposta → alternativas → explicação),
para garantir que não há erro matemático nem ambiguidade.

## Como adicionar vídeos

Adicione um objeto ao array `videos` do JSON do conteúdo, com `titulo`,
`canal`, `thumbnail`, `descricao` e `url` (a URL de incorporação do
YouTube, no formato `https://www.youtube.com/embed/ID_DO_VIDEO`). Use
somente vídeos reais de canais educativos confiáveis — nunca invente uma
URL.

## Configuração do TypeScript

O `tsconfig.json` usa `strict: true`, `rootDir: src/ts`, `outDir:
public/js` e `moduleResolution: Bundler` (necessário para que os `import`
dentro dos arquivos `.ts` possam referenciar o `.js` compilado, já que o
projeto não usa nenhum bundler).
// ferramentas/site.mjs
//
// O endereço público do site e os metadados de cada página fixa, num lugar
// só. Tudo que precisa de URL absoluta — o sitemap, o canonical, o og:url e
// o JSON-LD — lê daqui.
//
// **Trocar de endereço é mexer numa linha.** Quando sair um domínio próprio,
// basta alterar `SITE` e rodar `npm run seo`: o sitemap é reescrito e as
// tags de todas as páginas junto. Espalhar a URL pelos HTMLs faria dela uma
// dívida — é o mesmo motivo de `imagens.json` ser gerado em vez de escrito.

export const SITE = "https://projeto-biblioteca-matem-tica.vercel.app";

export const NOME = "Biblioteca Matemática";
export const AUTOR = "Biblioteca Matemática";

/**
 * Limites de caractere do Google, e eles não são estéticos: o que passa é
 * CORTADO no resultado de busca, e um título cortado no meio de uma palavra
 * custa clique. Um teste reprova página fora destes limites.
 *
 * O título tem folga porque o Google mede em pixels, não em letras; 60 é o
 * número que a prática consagrou para caber em praticamente toda tela.
 */
export const LIMITE_TITULO = 60;
export const LIMITE_DESCRICAO = 160;
export const MINIMO_DESCRICAO = 70;

/**
 * As páginas fixas do site, na ordem em que fazem sentido para quem chega
 * de fora. É esta lista que vira o sitemap, o rodapé e os links que o Google
 * pode promover a sitelink — ele não aceita que ninguém escolha por ele, mas
 * só promove o que está claramente ligado a partir da home.
 */
export const PAGINAS = [
  {
    arquivo: "index.html",
    caminho: "/",
    titulo: "Biblioteca Matemática — 6º ao 9º ano",
    descricao:
      "Matemática do 6º ao 9º ano em lições guiadas: uma ideia por vez, um resolvido passo a passo e questões que dizem onde você errou. De graça, sem cadastro.",
    prioridade: "1.0",
    frequencia: "weekly",
  },
  {
    arquivo: "sobre.html",
    caminho: "/sobre.html",
    titulo: "Como a Biblioteca Matemática funciona",
    descricao:
      "As três partes de cada lição, de onde vêm as questões, como as figuras são feitas e por que o site não pede cadastro — com exemplos de verdade.",
    prioridade: "0.8",
    frequencia: "monthly",
  },
  {
    arquivo: "perguntas.html",
    caminho: "/perguntas.html",
    titulo: "Perguntas frequentes — Biblioteca Matemática",
    descricao:
      "É de graça mesmo? Preciso criar conta? Meu progresso some se eu trocar de computador? Serve para professor? Cinco respostas diretas sobre como o site funciona.",
    prioridade: "0.7",
    frequencia: "monthly",
  },
  {
    arquivo: "privacidade.html",
    caminho: "/privacidade.html",
    titulo: "Privacidade — Biblioteca Matemática",
    descricao:
      "O site não pede cadastro, não tem banco de dados e não usa rastreador. O que fica guardado, onde fica, como apagar e o que vem de fora da página.",
    prioridade: "0.5",
    frequencia: "yearly",
  },
  {
    arquivo: "agradecimentos.html",
    caminho: "/agradecimentos.html",
    titulo: "Agradecimentos — Biblioteca Matemática",
    descricao:
      "A quem este site deve o que tem: a OBMEP e suas provas públicas, os professores que ensinam no YouTube e os projetos abertos que sustentam a página.",
    prioridade: "0.4",
    frequencia: "yearly",
  },
];

/**
 * As páginas que o JavaScript preenche. Elas existem uma vez no disco e
 * muitas vezes no site — `ano.html?a=6` e `ano.html?a=9` são endereços
 * diferentes —, então o que vai no HTML é um texto GENÉRICO, e o
 * `app.ts` reescreve o título, a descrição e o canonical ao montar a página.
 *
 * O genérico não é desperdício: é o que um buscador lê se não executar o
 * script, e o que aparece ao compartilhar o link antes de a página montar.
 */
export const PAGINAS_DINAMICAS = [
  {
    arquivo: "ano.html",
    titulo: "Matemática por ano — Biblioteca Matemática",
    descricao:
      "As matérias de Matemática de um ano do Ensino Fundamental II, cada uma em lições guiadas com questões comentadas. Escolha o ano e comece a estudar de graça.",
  },
  {
    arquivo: "curso.html",
    titulo: "Matéria de Matemática — Biblioteca Matemática",
    descricao:
      "As lições de uma matéria de Matemática do Ensino Fundamental II, na ordem, com vídeos para se aprofundar e certificado ao concluir. Sem cadastro e sem custo.",
  },
  {
    arquivo: "licao.html",
    titulo: "Lição de Matemática — Biblioteca Matemática",
    descricao:
      "Uma lição de Matemática do Ensino Fundamental II: a ideia explicada, um problema resolvido passo a passo e questões que dizem onde você errou.",
  },
  {
    arquivo: "404.html",
    titulo: "Página não encontrada — Biblioteca Matemática",
    descricao:
      "O endereço aberto não corresponde a nenhuma página do site. Volte ao início e escolha o ano que você quer estudar — nenhum conteúdo foi removido daqui.",
    semIndexar: true,
  },
];

/** Caminho absoluto a partir de um caminho do site. */
export const absoluto = (caminho) => `${SITE}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;

/** A imagem que redes sociais e o WhatsApp mostram ao colar um link. */
export const CAPA = "/assets/site/capa-social.png";
export const CAPA_LARGURA = 1200;
export const CAPA_ALTURA = 630;

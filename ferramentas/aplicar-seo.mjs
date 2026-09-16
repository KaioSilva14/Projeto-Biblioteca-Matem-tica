// ferramentas/aplicar-seo.mjs
//
// Escreve, em todas as páginas do site, as três partes que precisam ser
// IGUAIS em todas elas — o cabeçalho de metadados, a barra de navegação e o
// rodapé — e gera os arquivos que o buscador procura na raiz.
//
// Uso:  node ferramentas/aplicar-seo.mjs   (ou `npm run seo`)
//
// Por que uma ferramenta em vez de HTML escrito à mão:
//
// São nove páginas, e cada uma precisa de canonical, Open Graph, ícone,
// manifesto e JSON-LD. Copiar isso nove vezes garante que na décima alguém
// esquece um campo, e trocar de domínio viraria uma caçada. Aqui a URL mora
// em `site.mjs`, numa linha só — o mesmo motivo de `imagens.json` ser
// gerado em vez de escrito.
//
// A injeção é por MARCA: o que está entre `<!-- seo -->` e `<!-- /seo -->` é
// substituído, e o resto do arquivo não é tocado. Assim o HTML continua
// legível e versionado, e a ferramenta não precisa entender a página.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  SITE, NOME, PAGINAS, PAGINAS_DINAMICAS, CAPA, CAPA_LARGURA, CAPA_ALTURA,
  LIMITE_TITULO, LIMITE_DESCRICAO, absoluto,
} from "./site.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const PUBLICO = join(RAIZ, "public");

const ler = (r) => JSON.parse(readFileSync(join(PUBLICO, r), "utf8"));
const escapar = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ─────────────────────────── o cabeçalho ───────────────────────────

function cabecalho(pagina) {
  const url = pagina.caminho ? absoluto(pagina.caminho) : absoluto(`/${pagina.arquivo}`);
  const linhas = [
    `<title>${escapar(pagina.titulo)}</title>`,
    `<meta name="description" content="${escapar(pagina.descricao)}" />`,
    `<link rel="canonical" href="${url}" />`,
    pagina.semIndexar ? `<meta name="robots" content="noindex, follow" />` : null,
    ``,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapar(NOME)}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapar(pagina.titulo)}" />`,
    `<meta property="og:description" content="${escapar(pagina.descricao)}" />`,
    `<meta property="og:image" content="${absoluto(CAPA)}" />`,
    `<meta property="og:image:width" content="${CAPA_LARGURA}" />`,
    `<meta property="og:image:height" content="${CAPA_ALTURA}" />`,
    `<meta property="og:image:alt" content="Biblioteca Matemática — matemática explicada como se explica de verdade." />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapar(pagina.titulo)}" />`,
    `<meta name="twitter:description" content="${escapar(pagina.descricao)}" />`,
    `<meta name="twitter:image" content="${absoluto(CAPA)}" />`,
    ``,
    `<meta name="theme-color" content="#2b2622" />`,
    `<meta name="color-scheme" content="dark" />`,
    // O ícone que o Google mostra ao lado do endereço precisa ser quadrado e
    // múltiplo de 48. O SVG serve o navegador moderno; os PNG servem o resto.
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />`,
    `<link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png" />`,
    `<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png" />`,
    `<link rel="icon" href="/favicon-144.png" sizes="144x144" type="image/png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    ``,
    // As fontes vêm do Google. O preconnect abre a conexão antes de o CSS
    // ser lido, e economiza uma ida e volta no primeiro carregamento.
    `<link rel="preconnect" href="https://fonts.googleapis.com" />`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
  ].filter((l) => l !== null);

  if (pagina.jsonLd) {
    linhas.push(``);
    for (const bloco of pagina.jsonLd) {
      linhas.push(`<script type="application/ld+json">`);
      linhas.push(JSON.stringify(bloco, null, 2));
      linhas.push(`</script>`);
    }
  }
  return linhas.map((l) => (l ? `  ${l}` : "")).join("\n");
}

// ─────────────────────────── navegação e rodapé ───────────────────────────

const GLIFO = `<svg class="marca__glifo" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
          <circle cx="11" cy="4.5" r="2.4" fill="currentColor" />
          <rect x="1.5" y="10" width="19" height="2" rx="1" fill="currentColor" />
          <rect x="7" y="15.5" width="8" height="4.5" rx="1.2" fill="currentColor" />
        </svg>`;

const navegacao = () => `  <header class="nav">
    <div class="nav__barra">
      <a href="/" class="marca" aria-label="Biblioteca Matemática, página inicial">
        ${GLIFO}
        <span>Biblioteca Matemática</span>
      </a>
      <button class="nav__alternar" data-menu type="button" aria-label="Abrir menu" aria-expanded="false">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <nav class="nav__links" data-menu-lista aria-label="Navegação">
        <a class="nav__link" href="/ano.html?a=6">6º ano</a>
        <a class="nav__link" href="/ano.html?a=7">7º ano</a>
        <a class="nav__link" href="/ano.html?a=8">8º ano</a>
        <a class="nav__link" href="/ano.html?a=9">9º ano</a>
        <a class="nav__link" href="/sobre.html">Como funciona</a>
        <a class="nav__link" href="/perguntas.html">Perguntas</a>
      </nav>
    </div>
  </header>`;

/**
 * `extra` é a linha que só uma página tem.
 *
 * A página do ano traz o aviso que explica a marca "em breve", e ele é
 * escondido pelo script quando o ano está inteiro publicado. Um rodapé
 * uniforme apagou esse aviso na primeira versão desta ferramenta, e dois
 * testes de integração pegaram — é o risco de unificar sem prever exceção.
 */
const rodape = (extra = "") => `  <footer class="rodape">
    <div class="rodape__interno">
      <div class="rodape__grade">
        <div class="rodape__marca">
          <p class="t-sm-strong">Biblioteca Matemática</p>
          <p class="t-sm cor-mute">
            Matemática do 6º ao 9º ano em lições guiadas, com questões que
            dizem onde você errou. De graça, sem cadastro e sem anúncio.
          </p>
        </div>
        <nav class="rodape__coluna" aria-label="Matérias por ano">
          <p class="eyebrow">Estudar</p>
          <a href="/ano.html?a=6">Matemática do 6º ano</a>
          <a href="/ano.html?a=7">Matemática do 7º ano</a>
          <a href="/ano.html?a=8">Matemática do 8º ano</a>
          <a href="/ano.html?a=9">Matemática do 9º ano</a>
        </nav>
        <nav class="rodape__coluna" aria-label="Sobre o site">
          <p class="eyebrow">O site</p>
          <a href="/sobre.html">Como funciona</a>
          <a href="/perguntas.html">Perguntas frequentes</a>
          <a href="/agradecimentos.html">Agradecimentos</a>
          <a href="/privacidade.html">Privacidade</a>
        </nav>
      </div>
      <p class="t-sm cor-mute rodape__fim">
        Questões de aplicação da OBMEP, usadas com atribuição. Seu progresso
        fica no seu navegador, nesta máquina — nada é enviado para servidor
        nenhum.
      </p>${extra}
    </div>
  </footer>`;

/** O aviso da marca "em breve", só na página do ano. */
const AVISO_EM_BREVE = `
      <p class="t-sm cor-mute" data-nota-embreve>As matérias marcadas como &ldquo;em breve&rdquo; ainda não foram escritas.</p>`;

// ─────────────────────────── dados estruturados ───────────────────────────

/**
 * O cartão do Google — o ícone e o nome ao lado do endereço — vem do
 * `Organization` com `logo`. O `WebSite` liga as páginas entre si.
 */
function jsonLdDaHome(catalogo) {
  const anos = catalogo.anos.map((a) => ({
    "@type": "SiteNavigationElement",
    name: `Matemática do ${a.ano}º ano`,
    url: absoluto(`/ano.html?a=${a.ano}`),
  }));
  const fixas = PAGINAS.filter((p) => p.caminho !== "/").map((p) => ({
    "@type": "SiteNavigationElement",
    name: p.titulo.split(" — ")[0],
    url: absoluto(p.caminho),
  }));
  return [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "@id": `${SITE}/#organizacao`,
      name: NOME,
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: absoluto("/icone-512.png"),
        width: 512,
        height: 512,
      },
      image: absoluto(CAPA),
      description:
        "Plataforma gratuita de Matemática do 6º ao 9º ano, em lições guiadas com questões comentadas e sem cadastro.",
      inLanguage: "pt-BR",
      areaServed: "BR",
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "student",
        audienceType: "Ensino Fundamental II",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      name: NOME,
      url: SITE,
      inLanguage: "pt-BR",
      publisher: { "@id": `${SITE}/#organizacao` },
      isAccessibleForFree: true,
    },
    ...anos.concat(fixas).map((n) => ({ "@context": "https://schema.org", ...n })),
  ];
}

/** As cinco perguntas da página, lidas do HTML para não haver duas versões. */
function jsonLdDasPerguntas() {
  const html = readFileSync(join(PUBLICO, "perguntas.html"), "utf8");
  const itens = [...html.matchAll(
    /<summary>([\s\S]*?)<\/summary>\s*<div class="faq__resposta">([\s\S]*?)<\/div>/g
  )];
  if (itens.length !== 5) {
    throw new Error(`perguntas.html: esperava 5 perguntas e achei ${itens.length}`);
  }
  const limpar = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return [{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: itens.map(([, pergunta, resposta]) => ({
      "@type": "Question",
      name: limpar(pergunta),
      acceptedAnswer: { "@type": "Answer", text: limpar(resposta) },
    })),
  }];
}

// ─────────────────────────── sitemap e companhia ───────────────────────────

function enderecosDoConteudo() {
  const catalogo = ler("dados/catalogo.json");
  const urls = [];
  for (const ano of catalogo.anos) {
    urls.push({ caminho: `/ano.html?a=${ano.ano}`, prioridade: "0.9", frequencia: "weekly" });
    for (const curso of ano.cursos.filter((c) => c.disponivel && c.arquivo)) {
      urls.push({ caminho: `/curso.html?c=${curso.id}`, prioridade: "0.8", frequencia: "monthly" });
      for (const licao of ler(curso.arquivo).licoes) {
        urls.push({
          caminho: `/licao.html?c=${curso.id}&l=${licao.id}`,
          prioridade: "0.7",
          frequencia: "monthly",
        });
      }
    }
  }
  return urls;
}

function gerarSitemap() {
  // Sem <lastmod>, de propósito. A primeira versão carimbava a data do dia em
  // que a ferramenta rodava, e isso era mentira duas vezes: dizia ao buscador
  // que as 372 páginas tinham mudado naquele dia, e deixava o sitemap
  // "alterado" a cada execução sem que nada tivesse mudado de fato — o teste
  // de estabilidade quebrou no primeiro dia seguinte. Uma data que não
  // corresponde à última mudança real é pior que nenhuma: o Google ignora
  // `lastmod` de site que o usa assim.
  const todas = [
    ...PAGINAS.map((p) => ({ caminho: p.caminho, prioridade: p.prioridade, frequencia: p.frequencia })),
    ...enderecosDoConteudo(),
  ];
  const corpo = todas.map(({ caminho, prioridade, frequencia }) => [
    "  <url>",
    `    <loc>${escapar(absoluto(caminho))}</loc>`,
    `    <changefreq>${frequencia}</changefreq>`,
    `    <priority>${prioridade}</priority>`,
    "  </url>",
  ].join("\n")).join("\n");
  writeFileSync(
    join(PUBLICO, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>\n`,
    "utf8"
  );
  return todas.length;
}

function gerarRobots() {
  writeFileSync(join(PUBLICO, "robots.txt"), [
    "# Biblioteca Matemática",
    "#",
    "# O site inteiro é público e pode ser indexado: não há área restrita,",
    "# não há cadastro e não há página gerada por usuário.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# O 404 é servido com conteúdo útil, mas não deve entrar no índice.",
    "Disallow: /404.html",
    "",
    `Sitemap: ${absoluto("/sitemap.xml")}`,
    "",
  ].join("\n"), "utf8");
}

function gerarManifesto() {
  writeFileSync(join(PUBLICO, "site.webmanifest"), JSON.stringify({
    name: NOME,
    short_name: "Matemática",
    description:
      "Matemática do 6º ao 9º ano em lições guiadas, de graça e sem cadastro.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#2b2622",
    theme_color: "#2b2622",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  }, null, 2) + "\n", "utf8");
}

// ─────────────────────────── a aplicação ───────────────────────────

/**
 * Escreve, em cada `<img>` de figura, a medida REAL do arquivo.
 *
 * Sem `width` e `height` o navegador não reserva o espaço e a página pula
 * quando a figura chega — é o que o Google mede como CLS e penaliza. Mas a
 * medida escrita à mão envelhece: basta um gerador mudar de escala e o HTML
 * passa a reservar o espaço errado, que é o mesmo defeito de não reservar
 * nenhum. Aqui ela é copiada do índice, que é gerado junto com os PNG.
 */
function medidasDasFiguras(html, indice, arquivo) {
  return html.replace(/<img[^>]*>/g, (tag) => {
    const src = /src="(\/assets\/[^"]+)\.png"/.exec(tag);
    if (!src) return tag;
    const id = src[1].split("/").pop();
    const item = indice[id];
    if (!item) throw new Error(`${arquivo}: a figura ${id} não está no índice de imagens`);
    return tag
      .replace(/\swidth="\d+"/, ` width="${item.largura}"`)
      .replace(/\sheight="\d+"/, ` height="${item.altura}"`);
  });
}

function trocar(texto, marca, conteudo, arquivo) {
  const abre = `<!-- ${marca} -->`;
  const fecha = `<!-- /${marca} -->`;
  const i = texto.indexOf(abre);
  const j = texto.indexOf(fecha);
  if (i < 0 || j < 0) throw new Error(`${arquivo}: faltou a marca <!-- ${marca} --> ... <!-- /${marca} -->`);
  return `${texto.slice(0, i + abre.length)}\n${conteudo}\n${texto.slice(j)}`;
}

function aplicar() {
  const catalogo = ler("dados/catalogo.json");
  const indice = ler("dados/imagens.json");
  const paginas = [
    ...PAGINAS.map((p) => ({
      ...p,
      jsonLd: p.arquivo === "index.html" ? jsonLdDaHome(catalogo)
        : p.arquivo === "perguntas.html" ? jsonLdDasPerguntas()
          : null,
    })),
    ...PAGINAS_DINAMICAS,
  ];

  const noDisco = readdirSync(PUBLICO).filter((f) => f.endsWith(".html") && !f.startsWith("_"));
  const cobertas = new Set(paginas.map((p) => p.arquivo));
  for (const f of noDisco) {
    if (!cobertas.has(f)) throw new Error(`${f} está em public/ e não está em site.mjs`);
  }

  for (const pagina of paginas) {
    const caminho = join(PUBLICO, pagina.arquivo);
    let html = readFileSync(caminho, "utf8");

    if (pagina.titulo.length > LIMITE_TITULO) {
      throw new Error(`${pagina.arquivo}: título com ${pagina.titulo.length} caracteres (o Google corta acima de ${LIMITE_TITULO})`);
    }
    if (pagina.descricao.length > LIMITE_DESCRICAO) {
      throw new Error(`${pagina.arquivo}: descrição com ${pagina.descricao.length} caracteres (o Google corta acima de ${LIMITE_DESCRICAO})`);
    }

    html = trocar(html, "seo", cabecalho(pagina), pagina.arquivo);
    html = trocar(html, "nav", navegacao(), pagina.arquivo);
    html = trocar(html, "rodape", rodape(pagina.arquivo === "ano.html" ? AVISO_EM_BREVE : ""), pagina.arquivo);
    html = medidasDasFiguras(html, indice, pagina.arquivo);
    writeFileSync(caminho, html, "utf8");
    console.log(`  ${pagina.arquivo}`);
  }

  const quantas = gerarSitemap();
  gerarRobots();
  gerarManifesto();
  console.log(`\nsitemap.xml com ${quantas} endereços · robots.txt · site.webmanifest`);
}

aplicar();

// tests/site.test.mjs
//
// O que um buscador e uma rede social veem quando chegam ao site.
//
// Nada aqui testa Matemática: testa a MOLDURA. Título, descrição, canonical,
// ícone, cartão de compartilhamento, sitemap, robots — as coisas que ninguém
// nota quando estão certas e que custam caro quando estão erradas, porque o
// sintoma delas aparece semanas depois, num lugar que não é a tela.
//
// O teste existe por uma razão específica: essas tags são geradas por
// `ferramentas/aplicar-seo.mjs` e ficam versionadas no HTML. Nada impede
// alguém de editar um <title> à mão e o arquivo divergir da fonte. A última
// asserção deste arquivo é justamente essa — rodar a ferramenta de novo não
// pode produzir arquivo diferente.

import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  SITE, NOME, PAGINAS, PAGINAS_DINAMICAS, CAPA, CAPA_LARGURA, CAPA_ALTURA,
  LIMITE_TITULO, LIMITE_DESCRICAO, MINIMO_DESCRICAO, absoluto,
} from "../ferramentas/site.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const PUBLICO = join(RAIZ, "public");

let total = 0;
let falhas = 0;
function teste(nome, fn) {
  total += 1;
  try {
    fn();
    console.log(`  ok   ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`  FALHA ${nome}`);
    console.log(`        ${erro.message}`);
  }
}
const grupo = (n) => console.log(`\n${n}`);

const lerTexto = (r) => readFileSync(join(PUBLICO, r), "utf8");
const lerJson = (r) => JSON.parse(lerTexto(r));
const catalogo = lerJson("dados/catalogo.json");

const TODAS = [...PAGINAS, ...PAGINAS_DINAMICAS];
const htmlDe = new Map(TODAS.map((p) => [p.arquivo, lerTexto(p.arquivo)]));

/** O conteúdo de uma meta/link, procurado pelo atributo que a identifica. */
function conteudo(html, seletor) {
  const re = new RegExp(`<(?:meta|link)[^>]*${seletor}[^>]*>`, "i");
  const tag = re.exec(html);
  if (!tag) return null;
  const valor = /(?:content|href)="([^"]*)"/i.exec(tag[0]);
  return valor ? valor[1] : null;
}

/** Largura e altura de um PNG, lidas do cabeçalho IHDR. */
function medirPng(caminho) {
  const b = readFileSync(caminho);
  assert.equal(b.slice(1, 4).toString("ascii"), "PNG", `${caminho} não é um PNG`);
  return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20) };
}

// ---------- o cabeçalho de cada página ----------

grupo("Cabeçalho das páginas");

teste("toda página do disco está declarada em site.mjs", () => {
  const noDisco = readdirSync(PUBLICO).filter((f) => f.endsWith(".html") && !f.startsWith("_"));
  const declaradas = new Set(TODAS.map((p) => p.arquivo));
  for (const f of noDisco) {
    assert.ok(declaradas.has(f), `${f} existe em public/ e não está em site.mjs — ficaria sem canonical e fora do sitemap`);
  }
  assert.equal(noDisco.length, TODAS.length);
});

teste("título e descrição cabem no que o Google mostra", () => {
  for (const p of TODAS) {
    assert.ok(
      p.titulo.length <= LIMITE_TITULO,
      `${p.arquivo}: título com ${p.titulo.length} caracteres, e o Google corta em ${LIMITE_TITULO}`
    );
    assert.ok(
      p.descricao.length <= LIMITE_DESCRICAO,
      `${p.arquivo}: descrição com ${p.descricao.length} caracteres, e o Google corta em ${LIMITE_DESCRICAO}`
    );
    // Descrição curta demais é pior que longa: o Google descarta e inventa uma
    // a partir do texto da página, e aí quem escolhe o resumo não é você.
    assert.ok(
      p.descricao.length >= MINIMO_DESCRICAO,
      `${p.arquivo}: descrição com só ${p.descricao.length} caracteres`
    );
  }
});

teste("cada descrição é diferente das outras", () => {
  // Descrições repetidas fazem o buscador tratar as páginas como duplicatas,
  // e ele escolhe uma para mostrar e esconde as demais.
  const vistas = new Map();
  for (const p of TODAS) {
    const anterior = vistas.get(p.descricao);
    assert.ok(!anterior, `${p.arquivo} repete a descrição de ${anterior}`);
    vistas.set(p.descricao, p.arquivo);
  }
});

teste("toda página traz o conjunto completo de metadados", () => {
  const obrigatorias = [
    'name="description"',
    'rel="canonical"',
    'property="og:type"',
    'property="og:site_name"',
    'property="og:locale"',
    'property="og:url"',
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'property="og:image:width"',
    'property="og:image:height"',
    'name="twitter:card"',
    'name="twitter:image"',
    'name="theme-color"',
    'rel="manifest"',
    'rel="apple-touch-icon"',
  ];
  for (const [arquivo, html] of htmlDe) {
    assert.match(html, /<html lang="pt-BR">/, `${arquivo}: falta lang="pt-BR"`);
    assert.match(html, /<meta name="viewport"/, `${arquivo}: falta a viewport`);
    assert.match(html, /<title>[^<]+<\/title>/, `${arquivo}: falta o título`);
    for (const t of obrigatorias) {
      assert.ok(html.includes(t), `${arquivo}: falta a tag com ${t}`);
    }
  }
});

teste("o canonical e o og:url apontam para o mesmo endereço absoluto", () => {
  for (const p of TODAS) {
    const html = htmlDe.get(p.arquivo);
    const esperado = p.caminho ? absoluto(p.caminho) : absoluto(`/${p.arquivo}`);
    const canonical = conteudo(html, 'rel="canonical"');
    const ogUrl = conteudo(html, 'property="og:url"');
    assert.equal(canonical, esperado, `${p.arquivo}: canonical errado`);
    assert.equal(ogUrl, esperado, `${p.arquivo}: og:url diferente do canonical`);
    assert.ok(canonical.startsWith("https://"), `${p.arquivo}: canonical precisa ser absoluto e https`);
  }
});

teste("o título e a descrição do HTML são os de site.mjs", () => {
  for (const p of TODAS) {
    const html = htmlDe.get(p.arquivo);
    assert.equal(/<title>([^<]*)<\/title>/.exec(html)[1], p.titulo, `${p.arquivo}: título fora de sincronia`);
    assert.equal(conteudo(html, 'name="description"'), p.descricao, `${p.arquivo}: descrição fora de sincronia`);
    // o cartão social repete os dois, e repetir errado é pior que não ter
    assert.equal(conteudo(html, 'property="og:title"'), p.titulo);
    assert.equal(conteudo(html, 'property="og:description"'), p.descricao);
  }
});

teste("só a 404 pede para não ser indexada", () => {
  for (const p of TODAS) {
    const html = htmlDe.get(p.arquivo);
    const robots = conteudo(html, 'name="robots"');
    if (p.arquivo === "404.html") {
      assert.match(robots ?? "", /noindex/, "a 404 tem de sair do índice");
    } else {
      assert.equal(robots, null, `${p.arquivo}: não deveria trazer meta robots`);
    }
  }
});

// ---------- ícones e cartão social ----------

grupo("Marca");

teste("o ícone da busca existe nos tamanhos que o Google aceita", () => {
  // O Google só considera o ícone se ele for quadrado e múltiplo de 48. É
  // por isso que existem o 48, o 96 e o 144 além do 32 da aba.
  for (const [nome, lado] of [
    ["favicon-32.png", 32], ["favicon-48.png", 48], ["favicon-96.png", 96],
    ["favicon-144.png", 144], ["apple-touch-icon.png", 180],
    ["icone-192.png", 192], ["icone-512.png", 512],
  ]) {
    const caminho = join(PUBLICO, nome);
    assert.ok(existsSync(caminho), `falta ${nome} — rode npm run marca`);
    const { largura, altura } = medirPng(caminho);
    assert.equal(largura, lado, `${nome}: largura errada`);
    assert.equal(altura, lado, `${nome}: precisa ser quadrado`);
  }
  assert.ok(existsSync(join(PUBLICO, "favicon.svg")), "falta o favicon.svg");
  // Só os ícones OFERECIDOS AO BUSCADOR precisam ser múltiplos de 48 — são os
  // declarados como `rel="icon"`. O 180 é do iPhone e o 192 e o 512 são do
  // manifesto, e nenhum dos três entra nessa regra (512 nem é múltiplo).
  const html = htmlDe.get("index.html");
  const oferecidos = [...html.matchAll(/<link rel="icon"[^>]*sizes="(\d+)x\d+"/g)].map((m) => Number(m[1]));
  assert.ok(oferecidos.length >= 3, "poucos ícones declarados ao buscador");
  for (const lado of oferecidos.filter((l) => l >= 48)) {
    assert.equal(lado % 48, 0, `o ícone de ${lado}px é oferecido ao buscador e não é múltiplo de 48`);
  }
});

teste("o cartão social tem a proporção que as redes cortam sem cortar", () => {
  const caminho = join(PUBLICO, CAPA.replace(/^\//, ""));
  assert.ok(existsSync(caminho), "falta a imagem de compartilhamento");
  const { largura, altura } = medirPng(caminho);
  assert.equal(largura, CAPA_LARGURA);
  assert.equal(altura, CAPA_ALTURA);
  // 1,91 : 1 é a proporção do cartão grande; fora dela a imagem é aparada
  assert.ok(Math.abs(largura / altura - 1.91) < 0.02, "o cartão saiu fora de 1,91 : 1");
});

teste("toda página aponta para a mesma imagem de compartilhamento, absoluta", () => {
  for (const [arquivo, html] of htmlDe) {
    const og = conteudo(html, 'property="og:image"');
    assert.equal(og, absoluto(CAPA), `${arquivo}: og:image errado`);
    assert.equal(conteudo(html, 'name="twitter:image"'), absoluto(CAPA));
    // Imagem de og RELATIVA é ignorada por quase todo leitor de cartão —
    // é o erro mais comum do Open Graph.
    assert.ok(og.startsWith("https://"), `${arquivo}: og:image precisa ser absoluta`);
  }
});

teste("o manifesto do site aponta para ícones que existem", () => {
  const manifesto = lerJson("site.webmanifest");
  assert.equal(manifesto.lang, "pt-BR");
  assert.equal(manifesto.start_url, "/");
  assert.equal(manifesto.theme_color, "#2b2622");
  assert.ok(manifesto.icons.length >= 2);
  for (const icone of manifesto.icons) {
    assert.ok(
      existsSync(join(PUBLICO, icone.src.replace(/^\//, ""))),
      `o manifesto cita ${icone.src}, que não existe`
    );
  }
});

// ---------- sitemap e robots ----------

grupo("Sitemap e robots");

teste("o sitemap lista todas as páginas do site, e só elas", () => {
  const xml = lerTexto("sitemap.xml");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(urls.length > 300, `o sitemap tem só ${urls.length} endereços`);
  assert.equal(new Set(urls).size, urls.length, "o sitemap tem endereço repetido");

  const esperadas = new Set();
  for (const p of PAGINAS) esperadas.add(absoluto(p.caminho));
  for (const ano of catalogo.anos) {
    esperadas.add(absoluto(`/ano.html?a=${ano.ano}`));
    for (const curso of ano.cursos.filter((c) => c.disponivel && c.arquivo)) {
      esperadas.add(absoluto(`/curso.html?c=${curso.id}`));
      for (const licao of lerJson(curso.arquivo.replace(/^\//, "")).licoes) {
        esperadas.add(absoluto(`/licao.html?c=${curso.id}&amp;l=${licao.id}`));
      }
    }
  }
  for (const url of esperadas) {
    assert.ok(urls.includes(url), `o sitemap não lista ${url}`);
  }
  assert.equal(urls.length, esperadas.size, "o sitemap lista endereço que não devia");
});

teste("o sitemap não lista a 404 nem endereço relativo", () => {
  const xml = lerTexto("sitemap.xml");
  assert.ok(!xml.includes("/404.html"), "a 404 não pode entrar no sitemap");
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    assert.ok(m[1].startsWith(`${SITE}/`), `endereço fora do domínio: ${m[1]}`);
  }
});

teste("o sitemap é XML bem formado e o & está escapado", () => {
  const xml = lerTexto("sitemap.xml");
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.equal((xml.match(/<url>/g) ?? []).length, (xml.match(/<\/url>/g) ?? []).length);
  // Um "&" cru dentro de <loc> quebra o parse do sitemap inteiro, e as
  // lições todas têm "&l=" no endereço.
  const crus = xml.match(/&(?!amp;|lt;|gt;|quot;|apos;)/g);
  assert.equal(crus, null, `o sitemap tem ${crus?.length} "&" sem escapar`);
});

teste("o robots libera o site e aponta para o sitemap", () => {
  const robots = lerTexto("robots.txt");
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml$`, "m"));
  assert.match(robots, /^Disallow: \/404\.html$/m, "a 404 não deve ser rastreada");
  assert.ok(!/^Disallow: \/$/m.test(robots), "o robots está bloqueando o site inteiro");
});

// ---------- navegação, links e dados estruturados ----------

grupo("Navegação e dados estruturados");

teste("toda página leva às outras pelo rodapé", () => {
  // São estes links, repetidos em todas as páginas, que dizem ao buscador
  // que o site tem seções — é de uma estrutura assim que saem os links
  // extras abaixo do resultado.
  const destinos = ["/sobre.html", "/perguntas.html", "/agradecimentos.html", "/privacidade.html"];
  for (const [arquivo, html] of htmlDe) {
    const rodape = /<footer class="rodape">([\s\S]*?)<\/footer>/.exec(html);
    assert.ok(rodape, `${arquivo}: não tem rodapé`);
    for (const d of destinos) {
      assert.ok(rodape[1].includes(`href="${d}"`), `${arquivo}: o rodapé não leva a ${d}`);
    }
    for (const ano of catalogo.anos) {
      assert.ok(rodape[1].includes(`href="/ano.html?a=${ano.ano}"`), `${arquivo}: o rodapé não leva ao ${ano.ano}º ano`);
    }
  }
});

teste("todo link interno aponta para arquivo que existe", () => {
  for (const [arquivo, html] of htmlDe) {
    for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
      const destino = m[1].split("?")[0];
      if (destino === "/") continue;
      assert.ok(
        existsSync(join(PUBLICO, destino.replace(/^\//, ""))),
        `${arquivo}: link para ${destino}, que não existe em public/`
      );
    }
  }
});

teste("a home declara a organização com logo, que é o que vira o ícone da busca", () => {
  const html = htmlDe.get("index.html");
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
  const org = blocos.find((b) => b["@type"] === "EducationalOrganization");
  assert.ok(org, "falta o bloco da organização");
  assert.equal(org.name, NOME);
  assert.equal(org.url, SITE);
  assert.equal(org.logo.width, 512, "o logo precisa ser grande: o Google recusa ícone pequeno");
  assert.ok(existsSync(join(PUBLICO, org.logo.url.replace(`${SITE}/`, ""))), "o logo citado não existe");
  assert.equal(org.inLanguage, "pt-BR");

  const site = blocos.find((b) => b["@type"] === "WebSite");
  assert.ok(site, "falta o bloco do site");
  assert.equal(site.isAccessibleForFree, true);

  // um item de navegação por ano e um por página fixa
  const navs = blocos.filter((b) => b["@type"] === "SiteNavigationElement");
  assert.equal(navs.length, catalogo.anos.length + PAGINAS.length - 1);
  for (const n of navs) assert.ok(n.url.startsWith(`${SITE}/`), `navegação com url errada: ${n.url}`);
});

teste("as cinco perguntas do HTML são as cinco do dado estruturado", () => {
  const html = htmlDe.get("perguntas.html");
  const perguntas = [...html.matchAll(/<summary>([\s\S]*?)<\/summary>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  assert.equal(perguntas.length, 5, "a página promete cinco perguntas frequentes");

  const faq = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .find((b) => b["@type"] === "FAQPage");
  assert.ok(faq, "falta o FAQPage — é ele que faz as perguntas aparecerem na busca");
  assert.equal(faq.mainEntity.length, 5);
  for (let i = 0; i < 5; i += 1) {
    assert.equal(faq.mainEntity[i].name, perguntas[i], "a pergunta do dado estruturado não é a da tela");
    assert.ok(faq.mainEntity[i].acceptedAnswer.text.length > 80, "resposta curta demais para valer no resultado");
  }
});

// ---------- imagens ----------

grupo("Imagens das páginas");

teste("toda imagem tem alt, medida e carregamento preguiçoso", () => {
  for (const [arquivo, html] of htmlDe) {
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0];
      const src = /src="([^"]+)"/.exec(tag)?.[1] ?? "(sem src)";
      assert.match(tag, /\salt="[^"]+"/, `${arquivo}: ${src} sem alt`);
      // Sem width e height o navegador não reserva o espaço e a página
      // pula quando a figura chega — é o que o Google mede como CLS.
      assert.match(tag, /\swidth="\d+"/, `${arquivo}: ${src} sem width`);
      assert.match(tag, /\sheight="\d+"/, `${arquivo}: ${src} sem height`);
      assert.match(tag, /\sloading="lazy"/, `${arquivo}: ${src} sem loading="lazy"`);
      assert.match(tag, /\sdecoding="async"/, `${arquivo}: ${src} sem decoding="async"`);
    }
  }
});

teste("a medida escrita no HTML é a medida real do arquivo", () => {
  // Anunciar 330x254 e servir outra coisa reserva o espaço errado, que é o
  // mesmo defeito de não reservar nenhum.
  const indice = lerJson("dados/imagens.json");
  let conferidas = 0;
  for (const [arquivo, html] of htmlDe) {
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const src = /src="([^"]+)"/.exec(m[0])?.[1];
      if (!src?.startsWith("/assets/")) continue;
      const caminho = join(PUBLICO, src.replace(/^\//, ""));
      assert.ok(existsSync(caminho), `${arquivo}: ${src} não existe`);
      const largura = Number(/width="(\d+)"/.exec(m[0])[1]);
      const altura = Number(/height="(\d+)"/.exec(m[0])[1]);
      const id = src.split("/").pop().replace(/\.png$/, "");
      assert.ok(indice[id], `${src} não está no índice de imagens`);
      assert.equal(largura, indice[id].largura, `${arquivo}: ${src} anuncia largura errada`);
      assert.equal(altura, indice[id].altura, `${arquivo}: ${src} anuncia altura errada`);
      // o PNG é gerado em 2x, então o arquivo tem o dobro da medida de projeto
      const real = medirPng(caminho);
      assert.equal(real.largura, largura * 2, `${src}: o PNG não está em 2x`);
      conferidas += 1;
    }
  }
  assert.ok(conferidas >= 8, `só ${conferidas} imagens conferidas nas páginas fixas`);
});

// ---------- a capa do repositório ----------

grupo("README");

teste("o README e o guia de contribuição não apontam para arquivo inexistente", () => {
  // Imagem quebrada na capa do repositório é o defeito que ninguém percebe:
  // quem escreve vê o arquivo local, e quem visita vê o ícone de imagem
  // partida. Vale para os links relativos também.
  for (const arquivo of ["README.md", "CONTRIBUTING.md"]) {
    const texto = readFileSync(join(RAIZ, arquivo), "utf8");
    const alvos = [
      ...[...texto.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]),
      ...[...texto.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]),
    ];
    for (const alvo of alvos) {
      if (/^https?:/.test(alvo) || alvo.startsWith("#")) continue;
      assert.ok(
        existsSync(join(RAIZ, alvo)),
        `${arquivo}: aponta para ${alvo}, que não existe`
      );
    }
  }
});

teste("as abas do GitHub existem: README, contribuição e licença", () => {
  // O GitHub só mostra as abas no topo do repositório quando os três
  // arquivos existem com estes nomes. Não há como pedir as abas de outro
  // jeito — elas são consequência dos arquivos.
  for (const arquivo of ["README.md", "CONTRIBUTING.md", "LICENSE"]) {
    assert.ok(existsSync(join(RAIZ, arquivo)), `falta ${arquivo}`);
  }
  const licenca = readFileSync(join(RAIZ, "LICENSE"), "utf8");
  assert.match(licenca, /MIT License/);
  assert.match(licenca, /Kaio Silva/);
  // A licença precisa dizer o que NÃO cobre: MIT no conteúdo pedagógico
  // relicenciaria as lições e as questões da OBMEP junto.
  assert.match(licenca, /conteúdo pedagógico/i);
  assert.match(licenca, /OBMEP/);
});

teste("o aviso sobre as questões da OBMEP está em todo lugar que importa", () => {
  // A licença MIT diz, com todas as letras, que se pode VENDER. Quem pega
  // este repositório para um produto pago precisa topar com o aviso antes,
  // e não depois — as 27 questões da OBMEP continuam sendo dela e do IMPA,
  // que as publicam para uso educacional e sem licença aberta que autorize
  // uso comercial.
  //
  // Por isso o aviso é repetido nos cinco lugares por onde alguém chega: o
  // arquivo de licença, a capa do repositório, o guia de quem contribui e as
  // duas páginas do site que falam da origem das questões.
  const lugares = [
    ["LICENSE", readFileSync(join(RAIZ, "LICENSE"), "utf8")],
    ["README.md", readFileSync(join(RAIZ, "README.md"), "utf8")],
    ["CONTRIBUTING.md", readFileSync(join(RAIZ, "CONTRIBUTING.md"), "utf8")],
    ["agradecimentos.html", lerTexto("agradecimentos.html")],
    ["perguntas.html", lerTexto("perguntas.html")],
  ];
  for (const [nome, texto] of lugares) {
    const limpo = texto.replace(/\s+/g, " ");
    assert.match(
      limpo,
      /n[ãa]o\s+pode(m)?\s+ser\s+comercializad/i,
      `${nome}: falta o aviso de que as questões da OBMEP não podem ser comercializadas`
    );
  }

  // E o LICENSE precisa dizer que a permissão da MIT não alcança as questões,
  // senão o aviso e o texto da licença se contradizem na mesma página.
  const licenca2 = readFileSync(join(RAIZ, "LICENSE"), "utf8").replace(/\s+/g, " ");
  assert.match(licenca2, /MIT.{0,120}n[ãa]o se estende/i, "o LICENSE não delimita o alcance da MIT");

  // O site não pode prometer uma licença que a OBMEP não publica.
  for (const [nome, texto] of lugares) {
    assert.ok(
      !/livres?\s+para\s+redistribuir/i.test(texto.replace(/\s+/g, " ")),
      `${nome}: afirma mais do que a OBMEP declara sobre a licença das questões`
    );
  }
});

teste("a capa animada sobrevive a um leitor que não anima", () => {
  // O estado de repouso do SVG tem de ser o texto VISÍVEL, e a animação é que
  // o esconde e o traz de volta. Com `opacity:0` no repouso, um leitor que
  // não rode a animação mostraria um retângulo vazio no lugar do nome do
  // projeto — a pior falha possível, porque é silenciosa.
  const capa = readFileSync(join(RAIZ, ".github", "capa.svg"), "utf8");
  assert.match(capa, /\.l\{opacity:1/, "as letras precisam estar visíveis em repouso");
  assert.ok(!/<script/i.test(capa), "o GitHub não roda script em SVG servido como imagem");
  assert.match(capa, /@keyframes/, "a capa perdeu a animação");
  // uma letra por caractere das duas palavras
  const letras = [...capa.matchAll(/class="l l\d+"/g)].length;
  assert.equal(letras, 20, `esperava 20 letras na capa e achei ${letras}`);
  // e a tipografia dos textos não pode depender do bloco de estilo
  assert.ok(!/class="(titulo|serif)"/.test(capa), "fonte presa ao <style>: some se ele for descartado");
});

teste("os selos do README existem e trazem os números do site", () => {
  const catalogo2 = lerJson("dados/catalogo.json");
  const materias = catalogo2.anos.reduce((t, a) => t + a.cursos.filter((c) => c.disponivel).length, 0);
  const selo = readFileSync(join(RAIZ, ".github", "selos", "materias.svg"), "utf8");
  assert.ok(selo.includes(`>${materias}<`), `o selo de matérias não diz ${materias}`);
  for (const nome of ["licoes", "questoes", "figuras", "testes", "cadastro"]) {
    assert.ok(existsSync(join(RAIZ, ".github", "selos", `${nome}.svg`)), `falta o selo ${nome}`);
  }
});

// ---------- o endereço mora num lugar só ----------

grupo("Coerência");

teste("o endereço do site é o mesmo no gerador e no navegador", () => {
  // `ferramentas/site.mjs` escreve o canonical no HTML; `src/ts/seo.ts` o
  // reescreve em toda página que o script monta. Os dois discordarem produz
  // canonical apontando para outro domínio — pior que não ter nenhum.
  const ts = readFileSync(join(RAIZ, "src", "ts", "seo.ts"), "utf8");
  const noTs = /export const SITE = "([^"]+)"/.exec(ts);
  assert.ok(noTs, "seo.ts não declara SITE");
  assert.equal(noTs[1], SITE, "o endereço em seo.ts não é o de site.mjs");

  const js = readFileSync(join(PUBLICO, "js", "seo.js"), "utf8");
  assert.ok(js.includes(SITE), "o JavaScript compilado está com outro endereço — falta rodar npm run build");
});

teste("rodar o gerador de novo não muda arquivo nenhum", () => {
  // As tags ficam versionadas no HTML, e nada impede alguém de editar um
  // <title> à mão. Se isso acontecer, o arquivo passa a divergir da fonte —
  // e a próxima execução da ferramenta desfaz a edição em silêncio.
  const antes = TODAS.map((p) => lerTexto(p.arquivo))
    .concat([lerTexto("sitemap.xml"), lerTexto("robots.txt"), lerTexto("site.webmanifest")]);
  execFileSync(process.execPath, [join(RAIZ, "ferramentas", "aplicar-seo.mjs")], { stdio: "pipe" });
  const depois = TODAS.map((p) => lerTexto(p.arquivo))
    .concat([lerTexto("sitemap.xml"), lerTexto("robots.txt"), lerTexto("site.webmanifest")]);
  for (let i = 0; i < antes.length; i += 1) {
    assert.equal(depois[i], antes[i], "um arquivo mudou ao reaplicar o SEO — foi editado à mão");
  }
});

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) process.exit(1);

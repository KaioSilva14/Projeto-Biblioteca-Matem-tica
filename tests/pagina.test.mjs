// tests/pagina.test.mjs
//
// Integração: monta as páginas reais com o catálogo, os JSONs e as imagens
// de verdade, e percorre o caminho do aluno — do início até o certificado.
//
// É o teste que pega erro de fiação (seletor renomeado, botão que não
// aparece, progresso gravado na hora errada) que os testes de unidade não
// alcançam.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(AQUI, "..", "public");
const catalogo = JSON.parse(readFileSync(join(PUBLICO, "dados/catalogo.json"), "utf8"));

let total = 0;
let falhas = 0;
async function teste(nome, fn) {
  total += 1;
  try {
    await fn();
    console.log(`  ok   ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`  FALHA ${nome}`);
    console.log(`        ${erro.message}`);
  }
}
const grupo = (n) => console.log(`\n${n}`);

let montagens = 0;

/**
 * Monta uma página num jsdom novo.
 *
 * O app.js registra o listener de DOMContentLoaded no momento do import,
 * ligado ao document daquele instante. Como cada montagem cria um jsdom novo,
 * o import leva uma query string para o ESM reavaliar o módulo em vez de
 * devolver a instância do cache — que ainda apontaria para o document anterior.
 */
async function montar(arquivo, busca = "", progresso = null) {
  const html = readFileSync(join(PUBLICO, arquivo), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost:3000/${arquivo}${busca}` });
  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Event = window.Event;
  globalThis.MouseEvent = window.MouseEvent;

  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

  globalThis.fetch = async (url) => {
    const caminho = join(PUBLICO, new URL(url, "http://localhost:3000/").pathname);
    try {
      return { ok: true, json: async () => JSON.parse(readFileSync(caminho, "utf8")) };
    } catch {
      return { ok: false, json: async () => null };
    }
  };

  window.localStorage.clear();
  if (progresso) window.localStorage.setItem("biblioteca_matematica_v3", JSON.stringify(progresso));

  await import(new URL(`../public/js/app.js?m=${montagens++}`, import.meta.url));
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  return { doc: window.document, window };
}

const clicar = (window, node) => node.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const botao = (doc, texto) =>
  [...doc.querySelectorAll("button, a.botao")].find((b) => b.textContent.includes(texto));

/** Progresso com um curso inteiro concluído, para chegar ao certificado. */
function cursoConcluido(cursoId, licoes) {
  const registro = {};
  for (const l of licoes) {
    const ids = l.questoes.map((q) => q.id);
    registro[l.id] = { licaoId: l.id, respondidas: ids, acertadas: ids.slice(0, 3), concluida: true };
  }
  return { cursos: { [cursoId]: { cursoId, licoes: registro } } };
}

/**
 * Progresso com um ANO inteiro certificado.
 *
 * Monta o certificado de cada matéria a partir dos arquivos reais, que é
 * exatamente o formato que a página do ano lê: ela soma os certificados
 * guardados em vez de buscar curso por curso.
 */
function anoConcluido(numero) {
  const ano = catalogo.anos.find((a) => a.ano === numero);
  const cursos = {};
  for (const item of ano.cursos.filter((c) => c.disponivel)) {
    const { curso, licoes } = lerCursoDisco(item.id);
    const questoes = licoes.reduce((t, l) => t + l.questoes.length, 0);
    cursos[item.id] = {
      cursoId: item.id,
      licoes: {},
      certificado: {
        cursoId: item.id,
        cursoTitulo: curso.titulo,
        ano: numero,
        nome: "Ana Lima",
        data: "2026-09-05T10:00:00.000Z",
        questoes,
        acertosDePrimeira: Math.round(questoes * 0.75),
        licoes: licoes.length,
      },
    };
  }
  return { cursos, anos: {} };
}

const lerCursoDisco = (id) => {
  const item = catalogo.anos.flatMap((a) => a.cursos).find((c) => c.id === id);
  const curso = JSON.parse(readFileSync(join(PUBLICO, item.arquivo.replace(/^\//, "")), "utf8"));
  const licoes = curso.licoes.map((l) => JSON.parse(readFileSync(join(PUBLICO, l.arquivo.replace(/^\//, "")), "utf8")));
  return { curso, licoes };
};

// ============================================================

grupo("Home");

await teste("mostra os quatro anos com a contagem de matérias prontas", async () => {
  const { doc } = await montar("index.html");
  const cards = doc.querySelectorAll(".ano-card");
  assert.equal(cards.length, 4, `esperava 4 anos, veio ${cards.length}`);
  assert.match(cards[0].textContent, /6º ano/);
  assert.match(cards[0].textContent, /de \d+ matérias prontas/);
});

await teste("a seção de certificados fica escondida quando não há nenhum", async () => {
  const { doc } = await montar("index.html");
  assert.equal(doc.querySelector("[data-certificados]").hidden, true);
});

await teste("certificados conquistados aparecem na home", async () => {
  const { licoes } = lerCursoDisco("fracoes");
  const p = cursoConcluido("fracoes", licoes);
  p.cursos.fracoes.certificado = {
    cursoId: "fracoes", cursoTitulo: "Frações", ano: 6,
    nome: "Ana Lima", data: "2026-09-01T10:00:00.000Z", questoes: 32, acertosDePrimeira: 24,
  };
  const { doc } = await montar("index.html", "", p);
  const secao = doc.querySelector("[data-certificados]");
  assert.equal(secao.hidden, false, "a seção deveria aparecer");
  assert.match(secao.textContent, /Frações/);
  assert.match(secao.textContent, /Ana Lima/);
  assert.match(secao.textContent, /24 de 32 de primeira/);
});

grupo("Página de ano");

await teste("lista as matérias do ano, separando prontas de 'em breve'", async () => {
  // O ano é escolhido do catálogo, e não fixado aqui: assim que o 6º ficou
  // completo, um teste que cravasse "?a=6" passaria a exigir matéria em breve
  // num ano que não tem mais nenhuma. É o mesmo cuidado do teste de curso
  // indisponível.
  const comPendencia = catalogo.anos.find((a) => a.cursos.some((c) => !c.disponivel));
  assert.ok(comPendencia, "o catálogo inteiro está pronto — este teste perdeu o objeto");

  const { doc } = await montar("ano.html", `?a=${comPendencia.ano}`);
  assert.match(doc.querySelector("[data-cabecalho]").textContent, new RegExp(`${comPendencia.ano}º ano`));
  const linhas = doc.querySelectorAll(".linha--curso");
  assert.equal(linhas.length, comPendencia.cursos.length);

  const prontas = [...linhas].filter((l) => !l.classList.contains("linha--indisponivel"));
  const emBreve = [...linhas].filter((l) => l.classList.contains("linha--indisponivel"));
  assert.equal(prontas.length, comPendencia.cursos.filter((c) => c.disponivel).length);
  assert.ok(emBreve.length >= 1, "deveria haver matérias em breve");
  assert.match(emBreve[0].textContent, /em breve/);
  assert.equal(emBreve[0].tagName, "DIV", "matéria indisponível não pode ser link");
});

await teste("um ano inteiro pronto não mostra nenhuma matéria em breve", async () => {
  const completo = catalogo.anos.find((a) => a.cursos.every((c) => c.disponivel));
  if (!completo) return;                      // ainda não há ano fechado
  const { doc } = await montar("ano.html", `?a=${completo.ano}`);
  const linhas = doc.querySelectorAll(".linha--curso");
  assert.equal(linhas.length, completo.cursos.length);
  assert.equal([...linhas].filter((l) => l.classList.contains("linha--indisponivel")).length, 0);
  assert.ok([...linhas].every((l) => l.tagName === "A"), "toda matéria pronta tem de ser link");
  // e o rodapé não explica uma marca que não aparece na página
  assert.equal(doc.querySelector("[data-nota-embreve]").hidden, true);
});

await teste("num ano com pendências o rodapé continua explicando o 'em breve'", async () => {
  const pendente = catalogo.anos.find((a) => a.cursos.some((c) => !c.disponivel));
  assert.ok(pendente, "o catálogo inteiro está pronto — este teste perdeu o objeto");
  const { doc } = await montar("ano.html", `?a=${pendente.ano}`);
  assert.equal(doc.querySelector("[data-nota-embreve]").hidden, false);
});

await teste("ano com matéria por escrever não mostra certificado de ano", async () => {
  const pendente = catalogo.anos.find((a) => a.cursos.some((c) => !c.disponivel));
  const { doc } = await montar("ano.html", `?a=${pendente.ano}`);
  const area = doc.querySelector("[data-certificado-ano]");
  assert.equal(area.hidden, true, "cobrar um ano que ninguém escreveu não faz sentido");
  assert.equal(area.querySelector(".certificado"), null);
});

await teste("ano completo mas não estudado mostra quantas matérias faltam", async () => {
  const completo = catalogo.anos.find((a) => a.cursos.every((c) => c.disponivel));
  if (!completo) return;
  const { doc } = await montar("ano.html", `?a=${completo.ano}`);
  const bloco = doc.querySelector("[data-certificado-ano] .certificado");
  assert.ok(bloco, "o bloco do certificado de ano deveria aparecer");
  assert.match(bloco.textContent, /Ano ainda em andamento/);
  assert.match(bloco.textContent, new RegExp(`Faltam ${completo.cursos.length} matérias`));
  assert.equal(bloco.querySelector(".certificado__campo"), null, "não pede nome antes de concluir");
});

await teste("com o ano inteiro concluído, o certificado de ano libera nome e download", async () => {
  const completo = catalogo.anos.find((a) => a.cursos.every((c) => c.disponivel));
  if (!completo) return;
  const { doc } = await montar("ano.html", `?a=${completo.ano}`, anoConcluido(completo.ano));
  const bloco = doc.querySelector("[data-certificado-ano] .certificado");
  assert.match(bloco.textContent, new RegExp(`${completo.ano}º ano concluído`));
  assert.match(bloco.textContent, new RegExp(`as ${completo.cursos.length} matérias`));
  assert.ok(bloco.querySelector(".certificado__campo"), "faltou o campo de nome");
  assert.ok(botao(doc, "Baixar certificado do ano"), "faltou o botão de download");
});

await teste("concluir o ano registra o certificado de ano no armazenamento local", async () => {
  const completo = catalogo.anos.find((a) => a.cursos.every((c) => c.disponivel));
  if (!completo) return;
  const { window } = await montar("ano.html", `?a=${completo.ano}`, anoConcluido(completo.ano));
  const salvo = JSON.parse(window.localStorage.getItem("biblioteca_matematica_v3"));
  const cert = salvo.anos[String(completo.ano)];
  assert.ok(cert, "o certificado do ano deveria ter sido emitido sozinho");
  assert.equal(cert.materias.length, completo.cursos.length);
  assert.equal(cert.nome, "Ana Lima", "reaproveita o nome já usado nos certificados de matéria");
  // os números batem com a soma dos certificados de matéria
  const somados = Object.values(anoConcluido(completo.ano).cursos).map((c) => c.certificado);
  assert.equal(cert.questoes, somados.reduce((t, c) => t + c.questoes, 0));
  assert.equal(cert.licoes, somados.reduce((t, c) => t + c.licoes, 0));
});

await teste("o certificado de ano aparece na home junto dos de matéria", async () => {
  const completo = catalogo.anos.find((a) => a.cursos.every((c) => c.disponivel));
  if (!completo) return;
  const progresso = anoConcluido(completo.ano);
  progresso.anos[String(completo.ano)] = {
    ano: completo.ano, anoTitulo: `${completo.ano}º ano`, nome: "Ana Lima",
    data: "2026-09-06T10:00:00.000Z", materias: completo.cursos.map((c) => c.titulo),
    licoes: 88, questoes: 352, acertosDePrimeira: 260,
  };
  const { doc } = await montar("index.html", "", progresso);
  const secao = doc.querySelector("[data-certificados]");
  assert.equal(secao.hidden, false);
  const linhas = secao.querySelectorAll(".linha");
  assert.match(linhas[0].textContent, new RegExp(`${completo.ano}º ano completo`), "o do ano vem primeiro");
  assert.equal(linhas[0].getAttribute("href"), `/ano.html?a=${completo.ano}#certificado`);
  assert.equal(linhas.length, completo.cursos.length + 1, "o do ano não substitui os de matéria");
});

await teste("as matérias prontas linkam para a página do curso", async () => {
  const { doc } = await montar("ano.html", "?a=6");
  const pronta = doc.querySelector(".linha--curso:not(.linha--indisponivel)");
  assert.equal(pronta.tagName, "A");
  assert.match(pronta.getAttribute("href"), /^\/curso\.html\?c=/);
});

await teste("ano inexistente mostra recado em vez de página quebrada", async () => {
  const { doc } = await montar("ano.html", "?a=99");
  assert.match(doc.querySelector("[data-cursos]").textContent, /Não encontramos esse ano/);
});

await teste("todos os quatro anos montam", async () => {
  for (const ano of [6, 7, 8, 9]) {
    const { doc } = await montar("ano.html", `?a=${ano}`);
    const linhas = doc.querySelectorAll(".linha--curso");
    assert.ok(linhas.length >= 10, `${ano}º ano montou só ${linhas.length} matérias`);
  }
});

grupo("Página de matéria");

await teste("mostra lições, certificado bloqueado e vídeos", async () => {
  const { doc } = await montar("curso.html", "?c=fracoes");
  assert.match(doc.querySelector("[data-cabecalho]").textContent, /Frações/);

  const licoes = doc.querySelectorAll(".linha--licao");
  assert.equal(licoes.length, 8);
  assert.match(licoes[0].getAttribute("href"), /c=fracoes&l=o-que-e/);

  const cert = doc.querySelector(".certificado");
  assert.ok(cert, "faltou o bloco do certificado");
  assert.match(cert.textContent, /Ainda não liberado/);
  assert.match(cert.textContent, /Faltam 8 lições/);
  assert.equal(cert.querySelector(".certificado__campo"), null, "não deveria pedir nome antes de concluir");

  const videos = doc.querySelectorAll(".video");
  assert.ok(videos.length >= 3, `esperava ao menos 3 vídeos, veio ${videos.length}`);
});

await teste("o vídeo só carrega o player depois do clique", async () => {
  const { doc, window } = await montar("curso.html", "?c=fracoes");
  const video = doc.querySelector(".video");
  assert.equal(doc.querySelectorAll("iframe").length, 0, "nenhum iframe deveria existir antes do clique");
  assert.ok(video.querySelector(".video__thumb"), "faltou a miniatura");
  assert.ok(video.textContent.trim().length > 60, "o vídeo precisa da nota dizendo para quando serve");

  clicar(window, video.querySelector(".video__capa"));
  const frame = video.querySelector("iframe");
  assert.ok(frame, "o clique deveria criar o player");
  assert.match(frame.getAttribute("src"), /youtube-nocookie\.com\/embed\//);
});

await teste("com a matéria concluída, o certificado libera nome, prévia e download", async () => {
  const { licoes } = lerCursoDisco("fracoes");
  const { doc } = await montar("curso.html", "?c=fracoes", cursoConcluido("fracoes", licoes));

  const cert = doc.querySelector(".certificado");
  assert.match(cert.textContent, /Matéria concluída/);
  assert.ok(cert.querySelector(".certificado__campo"), "faltou o campo de nome");
  assert.ok(botao(doc, "Baixar certificado"), "faltou o botão de download");
  assert.ok(cert.querySelector("canvas.certificado__canvas"), "faltou a prévia");
  assert.match(cert.textContent, /salvo só neste navegador/, "faltou o aviso sobre o armazenamento local");
});

await teste("digitar o nome emite o certificado no armazenamento local", async () => {
  const { licoes } = lerCursoDisco("fracoes");
  const { doc, window } = await montar("curso.html", "?c=fracoes", cursoConcluido("fracoes", licoes));

  const campo = doc.querySelector(".certificado__campo");
  campo.value = "Joana Ribeiro";
  clicar(window, botao(doc, "Baixar certificado"));

  const salvo = JSON.parse(window.localStorage.getItem("biblioteca_matematica_v3"));
  const c = salvo.cursos.fracoes.certificado;
  assert.ok(c, "o certificado não foi gravado");
  assert.equal(c.nome, "Joana Ribeiro");
  assert.equal(c.cursoTitulo, "Frações");
  assert.equal(c.ano, 6);
  assert.equal(c.questoes, 32);
});

await teste("matéria indisponível mostra recado", async () => {
  // A matéria é escolhida do catálogo em vez de fixada aqui: com o id
  // cravado, o teste quebrava toda vez que aquela matéria era publicada.
  const indisponivel = catalogo.anos
    .flatMap((a) => a.cursos)
    .find((c) => !c.disponivel);
  assert.ok(indisponivel, "o catálogo não tem mais nenhuma matéria por publicar");

  const { doc } = await montar("curso.html", `?c=${indisponivel.id}`);
  assert.match(doc.querySelector("[data-curso]").textContent, /ainda não está disponível/);
});

grupo("Página de lição");

await teste("monta a ideia, o exemplo resolvido e a prática", async () => {
  const { doc } = await montar("licao.html", "?c=fracoes&l=o-que-e");
  assert.match(doc.querySelector("[data-cabecalho]").textContent, /lição 1 de 8/);
  assert.match(doc.querySelector("[data-cabecalho]").textContent, /O que uma fração quer dizer/);
  assert.ok(doc.querySelector(".destaque"), "faltou a frase de destaque");
  assert.ok(doc.querySelector("#pratica"), "faltou o bloco de prática");

  const img = doc.querySelector(".figura__img");
  assert.ok(img, "a figura da ideia não apareceu");
  assert.match(img.getAttribute("src"), /^\/assets\/.*\.png$/, "a figura tem que ser um PNG de /assets");
  assert.ok(img.getAttribute("alt").length > 10, "a figura precisa de texto alternativo");
});

await teste("o exemplo resolvido revela um passo por vez", async () => {
  const { doc, window } = await montar("licao.html", "?c=fracoes&l=o-que-e");
  const lista = doc.querySelector(".passos");
  assert.equal(lista.children.length, 0, "nenhum passo deveria estar visível de início");

  clicar(window, botao(doc, "Mostrar o primeiro passo"));
  assert.equal(lista.children.length, 1);
  clicar(window, botao(doc, "Próximo passo"));
  assert.equal(lista.children.length, 2);
  clicar(window, botao(doc, "Mostrar tudo"));
  assert.equal(lista.children.length, 4);
  assert.ok(!doc.querySelector(".fecho").hidden, "o fecho aparece quando os passos acabam");
});

await teste("errar mostra o diagnóstico do erro cometido, não uma mensagem genérica", async () => {
  const { doc, window } = await montar("licao.html", "?c=fracoes&l=o-que-e");
  const errada = [...doc.querySelectorAll(".alternativa")].find((a) => a.textContent.includes("8/3"));
  clicar(window, errada);
  clicar(window, botao(doc, "Verificar"));

  const retorno = doc.querySelector(".retorno--erro");
  assert.ok(retorno, "deveria aparecer um retorno de erro");
  assert.match(retorno.textContent, /trocados de andar/, "o texto deveria falar do erro específico");
  assert.ok(botao(doc, "Tentar de novo"));
  assert.ok(botao(doc, "Ver como se resolve"));
});

await teste("'Ver como se resolve' abre a resolução comentada com a resposta", async () => {
  const { doc, window } = await montar("licao.html", "?c=fracoes&l=o-que-e");
  clicar(window, [...doc.querySelectorAll(".alternativa")].find((a) => a.textContent.includes("5/8")));
  clicar(window, botao(doc, "Verificar"));
  clicar(window, botao(doc, "Ver como se resolve"));

  const resolucao = doc.querySelector(".resolucao");
  assert.ok(resolucao, "a resolução não apareceu");
  assert.ok(resolucao.querySelectorAll(".passo").length >= 2);
  assert.match(resolucao.textContent, /Resposta:/);
  assert.match(resolucao.textContent, /3\/8/);
});

await teste("acertar de primeira registra o acerto no curso certo", async () => {
  const { doc, window } = await montar("licao.html", "?c=fracoes&l=o-que-e");
  clicar(window, [...doc.querySelectorAll(".alternativa")].find((a) => a.textContent.includes("3/8")));
  clicar(window, botao(doc, "Verificar"));
  assert.match(doc.querySelector(".retorno--acerto").textContent, /de primeira/);

  clicar(window, botao(doc, "Próxima questão"));
  assert.match(doc.querySelector(".questao").textContent, /Questão 2 de 4/);

  const salvo = JSON.parse(window.localStorage.getItem("biblioteca_matematica_v3"));
  assert.deepEqual(salvo.cursos.fracoes.licoes["o-que-e"].acertadas, ["q1"]);
  assert.equal(salvo.cursos.decimais, undefined, "gravou no curso errado");
});

await teste("errar duas vezes abre a resolução sozinho", async () => {
  const { doc, window } = await montar("licao.html", "?c=fracoes&l=o-que-e");
  const erradas = [...doc.querySelectorAll(".alternativa")].filter((a) => !a.textContent.includes("3/8"));
  clicar(window, erradas[0]);
  clicar(window, botao(doc, "Verificar"));
  clicar(window, botao(doc, "Tentar de novo"));
  clicar(window, erradas[1]);
  clicar(window, botao(doc, "Verificar"));
  assert.ok(doc.querySelector(".resolucao"), "na segunda tentativa errada a resolução deveria abrir");
});

await teste("a última lição aponta para o certificado, não para a próxima", async () => {
  const { curso, licoes } = lerCursoDisco("fracoes");
  const ultima = curso.licoes[curso.licoes.length - 1];
  const ultimaLicao = licoes[licoes.length - 1];
  const progresso = {
    cursos: {
      fracoes: {
        cursoId: "fracoes",
        licoes: {
          [ultima.id]: {
            licaoId: ultima.id,
            respondidas: ultimaLicao.questoes.map((q) => q.id),
            acertadas: [],
            concluida: true,
          },
        },
      },
    },
  };
  const { doc } = await montar("licao.html", `?c=fracoes&l=${ultima.id}`, progresso);
  const link = botao(doc, "Ver meu certificado");
  assert.ok(link, "faltou o link para o certificado");
  assert.match(link.getAttribute("href"), /curso\.html\?c=fracoes#certificado/);
});

await teste("lição inexistente mostra recado em vez de página quebrada", async () => {
  const { doc } = await montar("licao.html", "?c=fracoes&l=nao-existe");
  assert.match(doc.querySelector("[data-licao]").textContent, /Não encontramos essa lição/);
});

await teste("TODAS as lições de TODAS as matérias disponíveis montam sem erro", async () => {
  const disponiveis = catalogo.anos.flatMap((a) => a.cursos).filter((c) => c.disponivel);
  assert.ok(disponiveis.length >= 2, "esperava pelo menos duas matérias prontas");

  for (const item of disponiveis) {
    const { curso } = lerCursoDisco(item.id);
    for (const entrada of curso.licoes) {
      const { doc } = await montar("licao.html", `?c=${item.id}&l=${entrada.id}`);
      assert.ok(doc.querySelector(".questao"), `${item.id}/${entrada.id}: nenhuma questão montada`);
      assert.ok(doc.querySelector(".destaque"), `${item.id}/${entrada.id}: faltou a ideia`);
      assert.ok(
        doc.querySelectorAll(".figura__img").length >= 2,
        `${item.id}/${entrada.id}: poucas figuras`
      );
    }
  }
});

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) process.exit(1);

// tests/pagina-conteudo.test.mjs
//
// Teste de integração da página de uma matéria: carrega o HTML real,
// o JSON real e o app.js compilado, e confere que a trilha de módulos é
// montada corretamente — incluindo o desbloqueio progressivo dos blocos.
//
// É o teste que pega erro de fiação (seletor renomeado, item de módulo
// não tratado, progresso lido do lugar errado) que os testes de unidade
// não alcançam.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const PUBLICO = join(RAIZ, "public");

// ---------- Mini-runner ----------

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

let montagens = 0;

/**
 * Monta a página de conteúdo num DOM limpo e devolve o document já renderizado.
 * "progressoInicial" simula um aluno que já respondeu N atividades.
 */
async function montarPagina(progressoInicial) {
  const html = readFileSync(join(PUBLICO, "conteudos/fracoes.html"), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost:3000/conteudos/fracoes.html" });
  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.SVGElement = window.SVGElement;
  globalThis.Node = window.Node;

  // jsdom não implementa estes dois; o app os usa ao trocar de atividade.
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

  // fetch servindo os arquivos reais de public/, como o Express faria.
  globalThis.fetch = async (url) => {
    const caminho = join(PUBLICO, new URL(url, "http://localhost:3000/").pathname);
    try {
      const corpo = readFileSync(caminho, "utf8");
      return { ok: true, json: async () => JSON.parse(corpo) };
    } catch {
      return { ok: false, json: async () => null };
    }
  };

  window.localStorage.clear();
  if (progressoInicial) {
    window.localStorage.setItem(
      "biblioteca_matematica_progress",
      JSON.stringify({ "fracoes-6ano": progressoInicial })
    );
  }

  // O app.js registra seu listener de DOMContentLoaded no momento em que é
  // importado, ligado ao document que existir naquele instante. Como cada
  // montagem cria um jsdom novo, o módulo precisa ser reavaliado — daí a
  // query string, que força o ESM a criar uma instância nova em vez de
  // devolver a do cache (que continuaria apontando para o document anterior).
  const modulo = await import(new URL(`../public/js/app.js?montagem=${montagens++}`, import.meta.url));
  void modulo;
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));

  // Espera o carregamento assíncrono do JSON terminar.
  await new Promise((resolve) => setTimeout(resolve, 30));
  return window.document;
}

console.log("\nPágina de conteúdo — integração");

await teste("o cabeçalho da matéria é preenchido a partir do JSON", async () => {
  const doc = await montarPagina(null);
  assert.equal(doc.querySelector("[data-conteudo-titulo]").textContent, "Frações");
  assert.match(doc.querySelector("[data-conteudo-introducao]").textContent, /partes de um todo/);
  assert.match(doc.querySelector("[data-conteudo-meta]").textContent, /4 módulos/);
  assert.match(doc.querySelector("[data-conteudo-meta]").textContent, /35 atividades/);
  assert.match(doc.querySelector("[data-conteudo-meta]").textContent, /5 vídeos/);
  assert.ok(doc.querySelectorAll("[data-conteudo-objetivos] li").length >= 5, "objetivos não renderizados");
});

await teste("os 4 módulos e os 7 blocos de atividades são montados", async () => {
  const doc = await montarPagina(null);
  const modulos = doc.querySelectorAll(".modulo");
  assert.equal(modulos.length, 4, `esperava 4 módulos, veio ${modulos.length}`);
  const lotes = doc.querySelectorAll(".lote");
  assert.equal(lotes.length, 7, `esperava 7 blocos de atividades, veio ${lotes.length}`);
});

await teste("teoria, exemplos, vídeos e dicas aparecem INTERCALADOS entre os blocos", async () => {
  // É o pedido central da v2: as atividades não podem ficar todas no fim.
  const doc = await montarPagina(null);
  const primeiroModulo = doc.querySelectorAll(".modulo")[0];
  const filhos = [...primeiroModulo.querySelector(".modulo__corpo").children];
  const tipos = filhos.map((el) => {
    if (el.classList.contains("teoria__bloco")) return "teoria";
    if (el.classList.contains("exemplo")) return "exemplo";
    if (el.classList.contains("modulo__video")) return "video";
    if (el.classList.contains("dica")) return "dica";
    if (el.classList.contains("lote")) return "atividades";
    return "?";
  });

  const posicaoPrimeiroLote = tipos.indexOf("atividades");
  const posicaoUltimoLote = tipos.lastIndexOf("atividades");
  assert.ok(posicaoPrimeiroLote > 0, "o módulo deveria começar por teoria, não por atividades");
  assert.ok(
    tipos.slice(posicaoPrimeiroLote + 1, posicaoUltimoLote).some((t) => t !== "atividades"),
    `entre o primeiro e o último bloco precisa haver conteúdo intercalado. Ordem obtida: ${tipos.join(" > ")}`
  );
});

await teste("aluno novo: o 1º bloco está liberado e os seguintes, bloqueados", async () => {
  const doc = await montarPagina(null);
  const lotes = [...doc.querySelectorAll(".lote")];

  assert.ok(lotes[0].classList.contains("lote--disponivel"), "o primeiro bloco deveria estar liberado");
  assert.match(lotes[0].textContent, /Começar este bloco/);

  for (let i = 1; i < lotes.length; i++) {
    assert.ok(lotes[i].classList.contains("lote--bloqueado"), `o bloco ${i + 1} deveria estar bloqueado`);
  }
  assert.match(doc.querySelector(".trilha-resumo").textContent, /0 de 35 atividades/);
});

await teste("aluno no meio: blocos anteriores concluídos, o atual em andamento", async () => {
  // 12 atividades feitas: blocos 1 e 2 (10) concluídos, bloco 3 em andamento.
  const doc = await montarPagina({
    conteudoId: "fracoes-6ano",
    concluidas: 12,
    acertos: 9,
    erros: 3,
    ultimaAtividade: 11,
    concluido: false,
  });
  const lotes = [...doc.querySelectorAll(".lote")];

  assert.ok(lotes[0].classList.contains("lote--concluido"), "bloco 1 deveria estar concluído");
  assert.ok(lotes[1].classList.contains("lote--concluido"), "bloco 2 deveria estar concluído");
  assert.ok(lotes[2].classList.contains("lote--em-andamento"), "bloco 3 deveria estar em andamento");
  assert.match(lotes[2].textContent, /Continuar bloco \(faltam 3\)/);
  assert.ok(lotes[3].classList.contains("lote--bloqueado"), "bloco 4 deveria continuar bloqueado");

  assert.match(doc.querySelector(".trilha-resumo").textContent, /12 de 35 atividades/);
  const modulos = doc.querySelectorAll(".modulo");
  assert.ok(modulos[0].classList.contains("modulo--concluido"), "o módulo 1 deveria estar marcado como concluído");
  assert.ok(!modulos[1].classList.contains("modulo--concluido"), "o módulo 2 ainda não terminou");
});

await teste("BUG 1: ao concluir tudo, o placar exibido vem do progresso salvo", async () => {
  // Este é o cenário exato do bug: o aluno voltou numa sessão nova e
  // terminou a matéria. A tela de conclusão precisa mostrar o acumulado
  // real (30 acertos), não apenas o que aconteceu depois da retomada.
  const doc = await montarPagina({
    conteudoId: "fracoes-6ano",
    concluidas: 35,
    acertos: 30,
    erros: 5,
    ultimaAtividade: 34,
    concluido: true,
  });

  const conclusao = doc.querySelector(".conclusao");
  assert.ok(conclusao, "a tela de conclusão não apareceu");

  const valores = [...conclusao.querySelectorAll(".placar-item__valor")].map((el) => el.textContent);
  assert.equal(valores[0], "30", `acertos exibidos errados: ${valores[0]}`);
  assert.equal(valores[1], "5", `erros exibidos errados: ${valores[1]}`);
  assert.equal(valores[2], "85,7%", `aproveitamento errado: ${valores[2]}`);
});

await teste("o certificado aparece na conclusão, com campo de nome e prévia", async () => {
  const doc = await montarPagina({
    conteudoId: "fracoes-6ano",
    concluidas: 35,
    acertos: 30,
    erros: 5,
    ultimaAtividade: 34,
    concluido: true,
  });

  const certificado = doc.querySelector(".certificado");
  assert.ok(certificado, "o bloco do certificado não foi renderizado");
  assert.ok(certificado.querySelector(".certificado__input"), "faltou o campo de nome");
  assert.match(certificado.textContent, /Baixar certificado/);
  assert.ok(certificado.querySelector("canvas.certificado__canvas"), "faltou a prévia do certificado");
});

await teste("todas as ilustracões declaradas no JSON são válidas", async () => {
  // Se alguém escrever "circulo:8:99" no JSON, a figura some silenciosamente.
  // Aqui isso vira erro de teste, e não um buraco na página do aluno.
  const { criarIlustracao } = await import(new URL("../public/js/ilustracoes.js", import.meta.url));
  const conteudo = JSON.parse(readFileSync(join(PUBLICO, "data/sexto-ano/fracoes.json"), "utf8"));

  const chaves = [];
  for (const atividade of [...conteudo.atividades, ...conteudo.atividadesExtras]) {
    if (atividade.ilustracao) chaves.push([`atividade ${atividade.id}`, atividade.ilustracao]);
  }
  for (const bloco of conteudo.teoria) {
    if (bloco.ilustracao) chaves.push([`teoria "${bloco.titulo}"`, bloco.ilustracao]);
  }
  for (const modulo of conteudo.modulos ?? []) {
    for (const item of modulo.itens) {
      if (item.tipo === "teoria" && item.ilustracao) chaves.push([`módulo ${modulo.numero} / "${item.titulo}"`, item.ilustracao]);
    }
  }

  assert.ok(chaves.length > 0, "nenhuma ilustração encontrada no conteúdo");
  for (const [onde, chave] of chaves) {
    assert.ok(criarIlustracao(chave), `ilustração inválida em ${onde}: "${chave}"`);
  }
});

await teste("as atividades extras não contam para o progresso da matéria", async () => {
  const doc = await montarPagina(null);
  const area = doc.querySelector("[data-atividades-extras]");
  assert.ok(area, "a área de atividades extras sumiu");
  assert.match(area.textContent, /Praticar atividades extras/);
  // o progresso continua zerado: abrir a página não pode gravar nada
  assert.equal(window.localStorage.getItem("biblioteca_matematica_progress"), null);
});

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) {
  process.exit(1);
}

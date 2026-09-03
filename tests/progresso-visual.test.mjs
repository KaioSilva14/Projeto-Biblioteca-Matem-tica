// tests/progresso-visual.test.mjs
//
// Testes que precisam de DOM: progresso salvo em localStorage, renderização
// de questão/progresso, gerador de ilustrações e certificado.
//
// Usa jsdom. Os módulos são importados DEPOIS de instalar os globais, porque
// eles esperam um ambiente de navegador.

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// ---------- Ambiente de navegador ----------

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Node = dom.window.Node;
// Obs.: globalThis.navigator não é atribuível a partir do Node 22 (só tem
// getter). Nenhum módulo testado aqui usa navigator, então não é preciso.

const { getProgress, saveProgress, updateProgress, resetProgress, getAllProgress, getProgressoEmAndamento } =
  await import(new URL("../public/js/progresso.js", import.meta.url));
const { renderProgresso, renderQuestao, renderCabecalhoModulo, renderTrilhaResumo } =
  await import(new URL("../public/js/componentes.js", import.meta.url));
const { criarIlustracao, renderIlustracao } = await import(new URL("../public/js/ilustracoes.js", import.meta.url));
const { desenharCertificado, nomeArquivoCertificado } = await import(new URL("../public/js/certificado.js", import.meta.url));

// ---------- Mini-runner ----------

let total = 0;
let falhas = 0;
function teste(nome, fn) {
  total += 1;
  try {
    window.localStorage.clear();
    fn();
    console.log(`  ok   ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`  FALHA ${nome}`);
    console.log(`        ${erro.message}`);
  }
}
function grupo(nome) {
  console.log(`\n${nome}`);
}

// ---------- Progresso em localStorage ----------

grupo("Progresso salvo no navegador");

teste("updateProgress acumula acertos, erros e concluídas", () => {
  updateProgress("mat", { acertou: true, indiceAtividade: 0, totalAtividades: 5 });
  updateProgress("mat", { acertou: false, indiceAtividade: 1, totalAtividades: 5 });
  updateProgress("mat", { acertou: true, indiceAtividade: 2, totalAtividades: 5 });

  const progresso = getProgress("mat");
  assert.equal(progresso.concluidas, 3);
  assert.equal(progresso.acertos, 2);
  assert.equal(progresso.erros, 1);
  assert.equal(progresso.ultimaAtividade, 2);
  assert.equal(progresso.concluido, false);
});

teste("a matéria só é marcada como concluída na última atividade", () => {
  for (let i = 0; i < 4; i++) {
    updateProgress("mat", { acertou: true, indiceAtividade: i, totalAtividades: 5 });
    assert.equal(getProgress("mat").concluido, false, `marcou concluído cedo demais, na atividade ${i + 1}`);
  }
  updateProgress("mat", { acertou: true, indiceAtividade: 4, totalAtividades: 5 });
  assert.equal(getProgress("mat").concluido, true);
  assert.equal(getProgress("mat").concluidas, 5);
});

teste("concluídas nunca passa do total, mesmo com cliques a mais", () => {
  for (let i = 0; i < 9; i++) {
    updateProgress("mat", { acertou: true, indiceAtividade: i, totalAtividades: 5 });
  }
  assert.equal(getProgress("mat").concluidas, 5, "a contagem estourou o total de atividades");
});

teste("o progresso de uma matéria não afeta o de outra", () => {
  updateProgress("fracoes", { acertou: true, indiceAtividade: 0, totalAtividades: 35 });
  updateProgress("geometria", { acertou: false, indiceAtividade: 0, totalAtividades: 35 });
  assert.equal(getProgress("fracoes").acertos, 1);
  assert.equal(getProgress("fracoes").erros, 0);
  assert.equal(getProgress("geometria").acertos, 0);
  assert.equal(getProgress("geometria").erros, 1);

  resetProgress("fracoes");
  assert.equal(getProgress("fracoes"), null);
  assert.ok(getProgress("geometria"), "resetar uma matéria apagou outra");
});

teste("dados corrompidos no localStorage não derrubam a aplicação", () => {
  window.localStorage.setItem("biblioteca_matematica_progress", "{isso não é json}");
  assert.deepEqual(getAllProgress(), {}, "deveria recuperar com um objeto vazio");
  assert.equal(getProgress("mat"), null);
  // e continua sendo possível gravar por cima
  updateProgress("mat", { acertou: true, indiceAtividade: 0, totalAtividades: 3 });
  assert.equal(getProgress("mat").concluidas, 1);
});

teste("registro com formato inválido é descartado, os válidos permanecem", () => {
  window.localStorage.setItem(
    "biblioteca_matematica_progress",
    JSON.stringify({
      bom: { conteudoId: "bom", concluidas: 2, acertos: 2, erros: 0, ultimaAtividade: 1, concluido: false },
      ruim: { conteudoId: "ruim", concluidas: "muitas" },
    })
  );
  const todos = getAllProgress();
  assert.ok(todos.bom, "o registro válido foi perdido");
  assert.equal(todos.ruim, undefined, "o registro inválido não foi descartado");
});

teste("getProgressoEmAndamento ignora matérias concluídas e não iniciadas", () => {
  saveProgress({ conteudoId: "a", concluidas: 35, acertos: 30, erros: 5, ultimaAtividade: 34, concluido: true });
  saveProgress({ conteudoId: "b", concluidas: 0, acertos: 0, erros: 0, ultimaAtividade: 0, concluido: false });
  saveProgress({ conteudoId: "c", concluidas: 7, acertos: 6, erros: 1, ultimaAtividade: 6, concluido: false });
  const emAndamento = getProgressoEmAndamento();
  assert.ok(emAndamento, "não encontrou matéria em andamento");
  assert.equal(emAndamento.conteudoId, "c");
});

// ---------- Renderização do progresso ----------

grupo("Renderização do progresso");

teste("a barra mostra a atividade atual e o percentual do que já foi feito", () => {
  const elemento = renderProgresso(1, 35, 0, 0);
  assert.match(elemento.textContent, /Atividade 1 de 35/);
  const preenchimento = elemento.querySelector(".progresso__preenchimento");
  assert.equal(preenchimento.style.width, "0%", "na primeira atividade a barra deve estar vazia");
});

teste("na última atividade a barra ainda não está em 100%", () => {
  // 34 concluídas de 35: a atividade atual ainda não foi respondida.
  const elemento = renderProgresso(35, 35, 30, 4);
  assert.match(elemento.textContent, /Atividade 35 de 35/);
  const preenchimento = elemento.querySelector(".progresso__preenchimento");
  const largura = Number.parseFloat(preenchimento.style.width);
  assert.ok(largura > 95 && largura < 100, `esperava perto de 97%, veio ${preenchimento.style.width}`);
});

teste("a numeração exibida nunca passa do total nem cai abaixo de 1", () => {
  assert.match(renderProgresso(99, 35, 0, 0).textContent, /Atividade 35 de 35/);
  assert.match(renderProgresso(0, 35, 0, 0).textContent, /Atividade 1 de 35/);
});

teste("acertos e erros aparecem no resumo da barra", () => {
  const elemento = renderProgresso(10, 35, 7, 2);
  assert.match(elemento.textContent, /Acertos: 7/);
  assert.match(elemento.textContent, /Erros: 2/);
});

teste("a barra da trilha reflete o total concluído da matéria", () => {
  const elemento = renderTrilhaResumo(14, 35);
  assert.match(elemento.textContent, /14 de 35 atividades/);
  const barra = elemento.querySelector(".trilha-resumo__barra");
  assert.equal(barra.getAttribute("aria-valuenow"), "14");
  assert.equal(barra.getAttribute("aria-valuemax"), "35");
});

// ---------- Renderização de questões ----------

grupo("Renderização de questões");

function questaoBase(extra) {
  return { id: 1, nivel: "basico", pergunta: "Pergunta de teste?", explicacao: "e", dica: "d", ...extra };
}

teste("múltipla escolha rende todas as opções e devolve o índice ORIGINAL", () => {
  // As opções são embaralhadas na tela; o motor precisa receber o índice
  // original, senão a correção quebraria a cada recarregamento.
  const atividade = questaoBase({ tipo: "multipla_escolha", opcoes: ["alfa", "beta", "gama"], resposta: 2 });
  const { elemento, obterResposta } = renderQuestao(atividade);
  const botoes = [...elemento.querySelectorAll(".opcao")];
  assert.equal(botoes.length, 3);

  assert.equal(obterResposta(), -1, "sem clique, nenhuma opção deve estar selecionada");

  const alvo = botoes.find((b) => b.textContent === "gama");
  alvo.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  assert.equal(obterResposta(), 2, "deveria devolver o índice original de 'gama'");
});

teste("só uma opção fica marcada por vez", () => {
  const atividade = questaoBase({ tipo: "multipla_escolha", opcoes: ["a", "b", "c"], resposta: 0 });
  const { elemento } = renderQuestao(atividade);
  const botoes = [...elemento.querySelectorAll(".opcao")];
  botoes[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  botoes[2].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  const marcados = elemento.querySelectorAll(".opcao--selecionada");
  assert.equal(marcados.length, 1);
  assert.equal(marcados[0].textContent, botoes[2].textContent);
});

teste("verdadeiro/falso começa sem resposta e não vira 'falso' por engano", () => {
  const atividade = questaoBase({ tipo: "verdadeiro_falso", resposta: true });
  const { elemento, obterResposta } = renderQuestao(atividade);
  assert.equal(obterResposta(), null, "sem clique a resposta precisa ser null, não false");
  const botoes = [...elemento.querySelectorAll(".opcao")];
  botoes[1].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  assert.equal(obterResposta(), false);
});

teste("ordenação sobe e desce itens corretamente", () => {
  const atividade = questaoBase({ tipo: "ordenacao", itens: ["x", "y", "z"], ordemCorreta: [2, 1, 0] });
  const { elemento, obterResposta } = renderQuestao(atividade);
  assert.deepEqual(obterResposta(), [0, 1, 2]);

  // desce o primeiro item
  const primeiro = elemento.querySelectorAll(".questao__item-ordenavel")[0];
  primeiro.querySelectorAll("button")[1].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  assert.deepEqual(obterResposta(), [1, 0, 2]);
});

teste("a ilustração declarada no JSON aparece dentro da questão", () => {
  const atividade = questaoBase({ tipo: "multipla_escolha", opcoes: ["a", "b"], resposta: 0, ilustracao: "circulo:8:3" });
  const { elemento } = renderQuestao(atividade);
  const figura = elemento.querySelector(".ilustracao svg");
  assert.ok(figura, "a ilustração não foi renderizada");
});

teste("uma chave de ilustração inválida não quebra a questão", () => {
  const atividade = questaoBase({ tipo: "multipla_escolha", opcoes: ["a", "b"], resposta: 0, ilustracao: "banana:9" });
  const { elemento } = renderQuestao(atividade);
  assert.equal(elemento.querySelector(".ilustracao"), null, "não deveria criar figura para chave inválida");
  assert.match(elemento.textContent, /Pergunta de teste/, "a questão precisa continuar aparecendo");
});

// ---------- Gerador de ilustrações ----------

grupo("Gerador de ilustrações");

teste("círculo gera uma fatia por parte, com as pintadas destacadas", () => {
  const svg = criarIlustracao("circulo:8:3");
  assert.ok(svg);
  const fatias = svg.querySelectorAll("path");
  assert.equal(fatias.length, 8, "deveria ter 8 fatias");
  const pintadas = [...fatias].filter((p) => p.getAttribute("fill") === "#FF2E93");
  assert.equal(pintadas.length, 3, "deveria ter 3 fatias pintadas");
});

teste("barra e grade geram o número certo de partes", () => {
  assert.equal(criarIlustracao("barra:5:2").querySelectorAll("rect").length, 5);
  const grade = criarIlustracao("grade:4:3:5");
  assert.equal(grade.querySelectorAll("rect").length, 12);
  assert.equal([...grade.querySelectorAll("rect")].filter((r) => r.getAttribute("fill") === "#FF2E93").length, 5);
});

teste("reta numérica marca os extremos 0 e 1", () => {
  const svg = criarIlustracao("reta:4:3");
  assert.ok(svg);
  const rotulos = [...svg.querySelectorAll("text")].map((t) => t.textContent);
  assert.deepEqual(rotulos, ["0", "1"]);
});

teste("parâmetros impossíveis devolvem null em vez de um desenho errado", () => {
  assert.equal(criarIlustracao("circulo:8:99"), null, "não pode pintar mais partes do que existem");
  assert.equal(criarIlustracao("circulo:0:0"), null);
  assert.equal(criarIlustracao("barra:5"), null, "faltando parâmetro");
  assert.equal(criarIlustracao("grade:4:3"), null, "grade precisa de 3 parâmetros");
  assert.equal(criarIlustracao("circulo:oito:3"), null, "parâmetro não numérico");
  assert.equal(criarIlustracao("inexistente:1:1"), null);
  assert.equal(renderIlustracao("inexistente:1:1"), null);
});

teste("toda ilustração tem descrição acessível", () => {
  for (const chave of ["circulo:6:2", "barra:4:1", "grade:3:3:4", "reta:8:5", "conjunto:10:4"]) {
    const svg = criarIlustracao(chave);
    assert.ok(svg, `${chave} não gerou desenho`);
    assert.ok(svg.getAttribute("aria-label"), `${chave} sem aria-label`);
    assert.ok(svg.querySelector("title"), `${chave} sem <title>`);
  }
});

// ---------- Cabeçalho de módulo ----------

grupo("Cabeçalho de módulo");

teste("mostra número, título e o selo de concluído quando for o caso", () => {
  const modulo = { id: "m1", numero: 3, titulo: "Somar e subtrair", objetivo: "Operar com frações.", nivel: "aplicacao", itens: [] };

  const aberto = renderCabecalhoModulo(modulo, false);
  assert.match(aberto.textContent, /3/);
  assert.match(aberto.textContent, /Somar e subtrair/);
  assert.equal(aberto.querySelector(".etiqueta--concluido"), null);

  const concluido = renderCabecalhoModulo(modulo, true);
  assert.ok(concluido.querySelector(".etiqueta--concluido"), "faltou o selo de concluído");
});

// ---------- Certificado ----------

grupo("Certificado");

teste("o canvas sai no tamanho de impressão esperado", () => {
  const canvas = desenharCertificado({ nome: "Maria", materia: "Frações", ano: 6, acertos: 30, total: 35 });
  assert.equal(canvas.width, 2000);
  assert.equal(canvas.height, 1414);
});

teste("o nome do arquivo remove acento, espaço e caractere inválido", () => {
  assert.equal(
    nomeArquivoCertificado("João da Silva Ção", "Frações"),
    "certificado-fracoes-joao-da-silva-cao.png"
  );
  assert.equal(nomeArquivoCertificado("  ", "Frações"), "certificado-fracoes-aluno.png", "nome vazio vira 'aluno'");
  assert.equal(
    nomeArquivoCertificado("../../etc/passwd", "Frações"),
    "certificado-fracoes-etc-passwd.png",
    "barras e pontos não podem virar caminho de arquivo"
  );
});

// ---------- Resultado ----------

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) {
  process.exit(1);
}

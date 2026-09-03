// tests/logica-atividades.test.mjs
//
// Testes do motor de atividades, da trilha de módulos e da integridade do
// conteúdo publicado. Roda sobre os arquivos JÁ COMPILADOS em public/js,
// que é exatamente o código que o navegador executa.
//
// Cobre em especial a classe de bug que já apareceu no projeto:
//   - estado mutado indevidamente (o motor é imutável por contrato);
//   - placar zerado ao retomar uma sessão (bug 1);
//   - numeração/ordem de atividades inconsistente com o progresso salvo.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

const {
  corrigirAtividade,
  iniciarSessao,
  atividadeAtual,
  sessaoConcluida,
  processarResposta,
  avancarAtividade,
  registrarDesistencia,
} = await import(new URL("../public/js/atividades.js", import.meta.url));

const {
  resolverModulos,
  ordemGlobalDeAtividades,
  moduloDoIndiceGlobal,
  loteDoIndiceGlobal,
  verificarTrilha,
} = await import(new URL("../public/js/modulos.js", import.meta.url));

// ---------- Mini-runner ----------

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
function grupo(nome) {
  console.log(`\n${nome}`);
}

const fracoes = JSON.parse(readFileSync(join(RAIZ, "public/data/sexto-ano/fracoes.json"), "utf8"));

// ---------- Correção por tipo de atividade ----------

grupo("Correção de cada tipo de atividade");

const exemplos = {
  multipla_escolha: { id: 1, tipo: "multipla_escolha", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", opcoes: ["a", "b", "c"], resposta: 1 },
  resposta_numerica: { id: 2, tipo: "resposta_numerica", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", resposta: 11 },
  verdadeiro_falso: { id: 3, tipo: "verdadeiro_falso", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", resposta: true },
  complete: { id: 4, tipo: "complete", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", resposta: "equivalentes" },
  ordenacao: { id: 5, tipo: "ordenacao", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", itens: ["x", "y", "z"], ordemCorreta: [2, 0, 1] },
  encontre_erro: { id: 6, tipo: "encontre_erro", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", opcoes: ["p1", "p2", "p3"], resposta: 2 },
  problema: { id: 7, tipo: "problema", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", resposta: 0.4375, tolerancia: 0.01 },
  relacionamento: { id: 8, tipo: "relacionamento", nivel: "basico", pergunta: "p", explicacao: "e", dica: "d", colunaA: ["a", "b"], colunaB: ["x", "y"], paresCorretos: [1, 0] },
};

teste("múltipla escolha aceita o índice certo e recusa o errado", () => {
  assert.equal(corrigirAtividade(exemplos.multipla_escolha, 1), true);
  assert.equal(corrigirAtividade(exemplos.multipla_escolha, 0), false);
  assert.equal(corrigirAtividade(exemplos.multipla_escolha, -1), false, "nenhuma opção marcada deve contar como erro");
});

teste("resposta numérica aceita vírgula como separador decimal", () => {
  assert.equal(corrigirAtividade(exemplos.resposta_numerica, "11"), true);
  assert.equal(corrigirAtividade(exemplos.resposta_numerica, " 11 "), true);
  assert.equal(corrigirAtividade(exemplos.resposta_numerica, "12"), false);
  assert.equal(corrigirAtividade(exemplos.resposta_numerica, ""), false);
  assert.equal(corrigirAtividade(exemplos.resposta_numerica, "abc"), false);
});

teste("problema decimal respeita a tolerância declarada", () => {
  assert.equal(corrigirAtividade(exemplos.problema, "0,4375"), true, "vírgula deve funcionar");
  assert.equal(corrigirAtividade(exemplos.problema, "0.44"), true, "dentro da tolerância de 0,01");
  assert.equal(corrigirAtividade(exemplos.problema, "0.5"), false, "fora da tolerância");
});

teste("verdadeiro/falso não aceita 'sem resposta' como acerto", () => {
  assert.equal(corrigirAtividade(exemplos.verdadeiro_falso, true), true);
  assert.equal(corrigirAtividade(exemplos.verdadeiro_falso, false), false);
  assert.equal(corrigirAtividade(exemplos.verdadeiro_falso, null), false);
});

teste("complete ignora acento e maiúscula", () => {
  assert.equal(corrigirAtividade(exemplos.complete, "Equivalentes"), true);
  assert.equal(corrigirAtividade(exemplos.complete, "  EQUIVALENTES  "), true);
  assert.equal(corrigirAtividade(exemplos.complete, "equivalente"), false);
});

teste("ordenação exige a sequência exata", () => {
  assert.equal(corrigirAtividade(exemplos.ordenacao, [2, 0, 1]), true);
  assert.equal(corrigirAtividade(exemplos.ordenacao, [0, 1, 2]), false);
  assert.equal(corrigirAtividade(exemplos.ordenacao, [2, 0]), false, "tamanho diferente deve falhar");
});

teste("encontre o erro e relacionamento corrigem corretamente", () => {
  assert.equal(corrigirAtividade(exemplos.encontre_erro, 2), true);
  assert.equal(corrigirAtividade(exemplos.encontre_erro, 1), false);
  assert.equal(corrigirAtividade(exemplos.relacionamento, [1, 0]), true);
  assert.equal(corrigirAtividade(exemplos.relacionamento, [0, 1]), false);
  assert.equal(corrigirAtividade(exemplos.relacionamento, [1, -1]), false, "par não preenchido deve falhar");
});

// ---------- Sessão: imutabilidade e contagem ----------

grupo("Sessão de atividades");

const lista = [exemplos.multipla_escolha, exemplos.resposta_numerica, exemplos.verdadeiro_falso];

teste("processarResposta NÃO muta o estado recebido", () => {
  const estado = iniciarSessao("teste", lista, 0);
  const copia = JSON.parse(JSON.stringify(estado));
  processarResposta(estado, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(estado)), copia, "o estado original foi alterado");
});

teste("avancarAtividade e registrarDesistencia também não mutam", () => {
  const estado = iniciarSessao("teste", lista, 0);
  const copia = JSON.parse(JSON.stringify(estado));
  avancarAtividade(estado);
  registrarDesistencia(estado);
  assert.deepEqual(JSON.parse(JSON.stringify(estado)), copia);
});

teste("primeiro erro dá segunda chance sem contar erro; o segundo conta", () => {
  let estado = iniciarSessao("teste", lista, 0);

  const primeira = processarResposta(estado, 0); // errada
  assert.equal(primeira.correta, false);
  assert.equal(primeira.primeiraTentativa, true);
  assert.equal(primeira.estado.erros, 0, "a primeira tentativa errada não pode contar erro");
  assert.equal(primeira.estado.jaErrouAtividadeAtual, true);

  const segunda = processarResposta(primeira.estado, 2); // errada de novo
  assert.equal(segunda.primeiraTentativa, false);
  assert.equal(segunda.estado.erros, 1, "a segunda tentativa errada precisa contar erro");
  estado = segunda.estado;
  assert.equal(estado.acertos, 0);
});

teste("acerto na segunda tentativa conta como acerto", () => {
  const estado = iniciarSessao("teste", lista, 0);
  const primeira = processarResposta(estado, 0);
  const segunda = processarResposta(primeira.estado, 1);
  assert.equal(segunda.correta, true);
  assert.equal(segunda.estado.acertos, 1);
  assert.equal(segunda.estado.erros, 0);
});

teste("avancarAtividade zera a marca de tentativa e caminha até o fim", () => {
  let estado = iniciarSessao("teste", lista, 0);
  estado = processarResposta(estado, 0).estado;
  assert.equal(estado.jaErrouAtividadeAtual, true);
  estado = avancarAtividade(estado);
  assert.equal(estado.jaErrouAtividadeAtual, false);
  assert.equal(estado.indiceAtual, 1);

  estado = avancarAtividade(avancarAtividade(estado));
  assert.equal(sessaoConcluida(estado), true);
  assert.equal(atividadeAtual(estado), null, "depois do fim não existe atividade atual");
});

// ---------- Regressão do BUG 1 ----------

grupo("Regressão do bug 1 — placar ao retomar uma matéria");

teste("iniciarSessao sem placar começa zerado (sessão nova)", () => {
  const estado = iniciarSessao("teste", lista, 0);
  assert.equal(estado.acertos, 0);
  assert.equal(estado.erros, 0);
});

teste("iniciarSessao preserva o placar acumulado ao retomar", () => {
  // Cenário do bug: o aluno já tinha 18 acertos e 4 erros salvos e volta
  // do índice 22. Antes da correção o estado voltava com 0 e 0, e a tela de
  // conclusão mostrava um aproveitamento muito menor que o real.
  const estado = iniciarSessao("teste", lista, 2, { acertos: 18, erros: 4 });
  assert.equal(estado.indiceAtual, 2);
  assert.equal(estado.acertos, 18, "os acertos já salvos precisam ser retomados");
  assert.equal(estado.erros, 4, "os erros já salvos precisam ser retomados");
});

teste("ao concluir uma sessão retomada, o placar reflete o total da matéria", () => {
  let estado = iniciarSessao("teste", lista, 2, { acertos: 18, erros: 4 });
  estado = processarResposta(estado, true).estado; // acerta a última
  estado = avancarAtividade(estado);
  assert.equal(sessaoConcluida(estado), true);
  assert.equal(estado.acertos, 19, "19 = 18 anteriores + 1 desta sessão");
  assert.equal(estado.erros, 4);
});

// ---------- Trilha de módulos ----------

grupo("Trilha de módulos");

teste("a trilha de Frações não tem id inexistente, repetido nem atividade órfã", () => {
  const problemas = verificarTrilha(fracoes);
  assert.deepEqual(problemas, [], problemas.map((p) => p.detalhe).join(" | "));
});

teste("a ordem global cobre todas as atividades, sem repetir", () => {
  const ordem = ordemGlobalDeAtividades(fracoes);
  assert.equal(ordem.length, fracoes.atividades.length, "a trilha deve conter todas as atividades");
  const ids = ordem.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, "há atividade repetida na ordem global");
});

teste("cada índice global cai em exatamente um módulo e um lote", () => {
  const resolvidos = resolverModulos(fracoes);
  const total = ordemGlobalDeAtividades(fracoes).length;
  for (let i = 0; i < total; i++) {
    assert.ok(moduloDoIndiceGlobal(resolvidos, i), `índice ${i} sem módulo`);
    assert.ok(loteDoIndiceGlobal(resolvidos, i), `índice ${i} sem lote`);
  }
  assert.equal(moduloDoIndiceGlobal(resolvidos, total), null, "além do fim não existe módulo");
});

teste("os lotes são contíguos e começam no índice 0", () => {
  const resolvidos = resolverModulos(fracoes);
  let esperado = 0;
  for (const resolvido of resolvidos) {
    assert.equal(resolvido.indiceGlobalInicial, esperado, `módulo ${resolvido.modulo.numero} começa fora de ordem`);
    for (const item of resolvido.itens) {
      if (item.tipo !== "atividades") continue;
      assert.equal(item.lote.indiceGlobalInicial, esperado, `lote "${item.lote.titulo}" começa fora de ordem`);
      esperado += item.lote.atividades.length;
    }
    assert.equal(resolvido.indiceGlobalFinal, esperado);
  }
});

teste("conteúdo sem módulos cai no formato linear sem quebrar", () => {
  const semModulos = { ...fracoes, modulos: undefined };
  assert.deepEqual(resolverModulos(semModulos), []);
  assert.equal(ordemGlobalDeAtividades(semModulos).length, fracoes.atividades.length);
  assert.deepEqual(verificarTrilha(semModulos), []);
});

teste("id inexistente num lote é ignorado sem derrubar a página", () => {
  const quebrado = JSON.parse(JSON.stringify(fracoes));
  quebrado.modulos[0].itens.find((i) => i.tipo === "atividades").ids.push(9999);
  const problemas = verificarTrilha(quebrado);
  assert.ok(problemas.some((p) => p.tipo === "id-inexistente"), "o verificador precisa apontar o id inexistente");
  // mesmo assim, resolver não pode estourar
  const ordem = ordemGlobalDeAtividades(quebrado);
  assert.equal(ordem.length, fracoes.atividades.length, "o id inválido deve ser apenas ignorado");
});

// ---------- Integridade do conteúdo publicado ----------

grupo("Integridade do conteúdo de Frações");

const todas = [...fracoes.atividades, ...fracoes.atividadesExtras];

teste("todos os ids de atividade são únicos", () => {
  const ids = todas.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

teste("toda atividade tem enunciado, explicação e dica preenchidos", () => {
  for (const a of todas) {
    assert.ok(a.pergunta && a.pergunta.trim().length > 10, `atividade ${a.id} sem enunciado adequado`);
    assert.ok(a.explicacao && a.explicacao.trim().length > 10, `atividade ${a.id} sem explicação`);
    assert.ok(a.dica && a.dica.trim().length > 5, `atividade ${a.id} sem dica`);
  }
});

teste("múltipla escolha e encontre-erro: resposta dentro do intervalo e sem opção repetida", () => {
  for (const a of todas) {
    if (a.tipo !== "multipla_escolha" && a.tipo !== "encontre_erro") continue;
    assert.ok(Array.isArray(a.opcoes) && a.opcoes.length >= 2, `atividade ${a.id} com poucas opções`);
    assert.ok(
      Number.isInteger(a.resposta) && a.resposta >= 0 && a.resposta < a.opcoes.length,
      `atividade ${a.id} com índice de resposta fora do intervalo`
    );
    const normalizadas = a.opcoes.map((o) => o.trim().toLowerCase());
    assert.equal(
      new Set(normalizadas).size,
      normalizadas.length,
      `atividade ${a.id} tem duas alternativas iguais — isso criaria duas respostas corretas`
    );
  }
});

teste("ordenação: ordemCorreta é uma permutação válida dos itens", () => {
  for (const a of todas) {
    if (a.tipo !== "ordenacao") continue;
    assert.equal(a.ordemCorreta.length, a.itens.length, `atividade ${a.id}: tamanhos diferentes`);
    const ordenado = [...a.ordemCorreta].sort((x, y) => x - y);
    assert.deepEqual(ordenado, a.itens.map((_, i) => i), `atividade ${a.id}: ordemCorreta não é permutação`);
  }
});

teste("relacionamento: cada par aponta para uma coluna B válida e sem repetir", () => {
  for (const a of todas) {
    if (a.tipo !== "relacionamento") continue;
    assert.equal(a.paresCorretos.length, a.colunaA.length, `atividade ${a.id}: pares incompletos`);
    for (const indice of a.paresCorretos) {
      assert.ok(indice >= 0 && indice < a.colunaB.length, `atividade ${a.id}: par fora do intervalo`);
    }
    assert.equal(new Set(a.paresCorretos).size, a.paresCorretos.length, `atividade ${a.id}: dois itens apontam para o mesmo par`);
  }
});

teste("ordenação de frações: a ordem declarada é de fato crescente", () => {
  // Confere a matemática, não só o formato: converte cada fração em número
  // e verifica que ordemCorreta produz uma sequência estritamente crescente.
  for (const a of todas) {
    if (a.tipo !== "ordenacao") continue;
    const valores = a.itens.map((item) => {
      const partes = item.split("/").map(Number);
      return partes.length === 2 ? partes[0] / partes[1] : Number(item);
    });
    if (valores.some((v) => Number.isNaN(v))) continue; // itens que não são frações
    const sequencia = a.ordemCorreta.map((i) => valores[i]);
    for (let i = 1; i < sequencia.length; i++) {
      assert.ok(
        sequencia[i] > sequencia[i - 1],
        `atividade ${a.id}: ${a.itens[a.ordemCorreta[i - 1]]} não é menor que ${a.itens[a.ordemCorreta[i]]}`
      );
    }
  }
});

teste("todo vídeo referenciado é um embed do YouTube com id plausível", () => {
  const daTrilha = (fracoes.modulos ?? []).flatMap((m) => m.itens.filter((i) => i.tipo === "video"));
  for (const video of [...fracoes.videos, ...daTrilha]) {
    assert.match(
      video.url,
      /^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}$/,
      `URL de vídeo suspeita: ${video.url}`
    );
    assert.ok(video.canal && video.canal.trim().length > 0, `vídeo sem canal: ${video.titulo}`);
    assert.ok(
      video.thumbnail.includes(video.url.split("/embed/")[1]),
      `a thumbnail de "${video.titulo}" não bate com o id do vídeo`
    );
  }
});

teste("os vídeos da trilha existem também na lista geral de vídeos", () => {
  const urlsGerais = new Set(fracoes.videos.map((v) => v.url));
  const daTrilha = (fracoes.modulos ?? []).flatMap((m) => m.itens.filter((i) => i.tipo === "video"));
  for (const video of daTrilha) {
    assert.ok(urlsGerais.has(video.url), `vídeo da trilha fora da lista geral: ${video.titulo}`);
  }
});

teste("a quantidade no índice geral bate com a quantidade real de atividades", () => {
  const indice = JSON.parse(readFileSync(join(RAIZ, "public/data/indice-geral.json"), "utf8"));
  const entrada = indice.find((item) => item.id === fracoes.id);
  assert.ok(entrada, "Frações não está no índice geral");
  assert.equal(
    entrada.quantidadeAtividades,
    fracoes.atividades.length,
    "o índice geral anuncia um número de atividades diferente do real"
  );
  assert.equal(entrada.disponivel, true);
});

// ---------- Resultado ----------

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) {
  process.exit(1);
}

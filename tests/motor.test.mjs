// tests/motor.test.mjs
//
// Testes do motor: correção de resposta (incluindo o diagnóstico do erro),
// progresso por curso em localStorage e emissão de certificado.
// Rodam sobre o JavaScript já compilado em public/js — o mesmo código que o
// navegador executa.

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { corrigir, respostaCorreta } = await import(new URL("../public/js/correcao.js", import.meta.url));
const { paraNumero } = await import(new URL("../public/js/util.js", import.meta.url));
const {
  lerTudo, lerCurso, lerLicao, registrarResposta, reiniciarLicao, reiniciarCurso,
  resumirCurso, proximaLicao, lerCertificado, emitirCertificado, listarCertificados,
  resumirAno, lerCertificadoAno, emitirCertificadoAno, removerCertificadoAno, listarCertificadosAno,
} = await import(new URL("../public/js/progresso.js", import.meta.url));
const { desenharCertificado, nomeArquivo } = await import(new URL("../public/js/certificado.js", import.meta.url));

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
const grupo = (n) => console.log(`\n${n}`);

// ---------- Leitura de número ----------

grupo("Leitura da resposta digitada");

teste("aceita vírgula, ponto, espaços e cifrão", () => {
  assert.equal(paraNumero("27"), 27);
  assert.equal(paraNumero(" 27 "), 27);
  assert.equal(paraNumero("0,75"), 0.75);
  assert.equal(paraNumero("0.75"), 0.75);
  assert.equal(paraNumero("R$ 27"), 27);
  assert.equal(paraNumero("1.200"), 1200, "ponto como separador de milhar");
});

teste("aceita o sinal de menos que o aluno vê na tela, e não só o do teclado", () => {
  // O site escreve negativo com o menos tipográfico (−, U+2212). Quem copiasse
  // o caractere da própria figura recebia NaN, ou seja, era contado como erro
  // sem diagnóstico nenhum. É pré-requisito do 7º ano inteiro.
  assert.equal(paraNumero("-25"), -25, "hífen do teclado");
  assert.equal(paraNumero("−25"), -25, "sinal de menos tipográfico (U+2212)");
  assert.equal(paraNumero("–25"), -25, "meia-risca");
  assert.equal(paraNumero("—25"), -25, "travessão");
  assert.equal(paraNumero("- 25"), -25, "com espaço depois do sinal");
  assert.equal(paraNumero("−3,5"), -3.5, "negativo com vírgula");
  assert.equal(paraNumero("R$ −40"), -40, "saldo negativo em reais");
});

teste("devolve NaN para o que não é número", () => {
  assert.ok(Number.isNaN(paraNumero("")));
  assert.ok(Number.isNaN(paraNumero("   ")));
  assert.ok(Number.isNaN(paraNumero("não sei")));
  assert.ok(Number.isNaN(paraNumero("−")), "só o sinal não é número");
});

// ---------- Correção ----------

grupo("Correção da resposta");

const questaoAlt = {
  id: "qa", formato: "alternativas", enunciado: "e", imagem: "x", dica: "d", resolucao: [],
  alternativas: [{ rotulo: "A", texto: "3/8" }, { rotulo: "B", texto: "8/3" }, { rotulo: "C", texto: "5/8" }],
  correta: 0,
  errosComuns: [{ resposta: "8/3", porque: "Você inverteu os andares da fração." }],
};

const questaoNum = {
  id: "qn", formato: "numero", enunciado: "e", imagem: "x", dica: "d", resolucao: [],
  resposta: 27, unidade: "reais",
  errosComuns: [{ resposta: "36", porque: "Esse é o valor antes do lanche." }],
};

teste("alternativa certa é aceita; errada é recusada", () => {
  assert.equal(corrigir(questaoAlt, 0).certo, true);
  assert.equal(corrigir(questaoAlt, 2).certo, false);
});

teste("sem marcar nada não conta como acerto", () => {
  assert.equal(corrigir(questaoAlt, -1).certo, false);
  assert.equal(corrigir(questaoAlt, null).certo, false);
});

teste("o diagnóstico identifica o erro específico do aluno", () => {
  const v = corrigir(questaoAlt, 1);
  assert.equal(v.certo, false);
  assert.ok(v.diagnostico, "deveria ter reconhecido o erro previsto");
  assert.match(v.diagnostico.porque, /inverteu/);
});

teste("erro não previsto não inventa diagnóstico", () => {
  const v = corrigir(questaoAlt, 2);
  assert.equal(v.certo, false);
  assert.equal(v.diagnostico, undefined);
});

teste("resposta numérica aceita as formas de digitar o mesmo número", () => {
  assert.equal(corrigir(questaoNum, "27").certo, true);
  assert.equal(corrigir(questaoNum, " 27 ").certo, true);
  assert.equal(corrigir(questaoNum, "R$ 27").certo, true);
  assert.equal(corrigir(questaoNum, "27,00").certo, true);
  assert.equal(corrigir(questaoNum, "28").certo, false);
  assert.equal(corrigir(questaoNum, "").certo, false);
});

teste("o diagnóstico numérico casa por valor, não por texto", () => {
  const v = corrigir(questaoNum, "36,00");
  assert.ok(v.diagnostico, "36,00 deveria casar com o erro previsto '36'");
  assert.match(v.diagnostico.porque, /antes do lanche/);
});

teste("tolerância só é aplicada quando declarada", () => {
  const comTolerancia = { ...questaoNum, resposta: 0.4375, tolerancia: 0.01, errosComuns: [] };
  assert.equal(corrigir(comTolerancia, "0,44").certo, true);
  assert.equal(corrigir(comTolerancia, "0,5").certo, false);
  const semTolerancia = { ...questaoNum, resposta: 10, tolerancia: undefined, errosComuns: [] };
  assert.equal(corrigir(semTolerancia, "10").certo, true);
  assert.equal(corrigir(semTolerancia, "10.5").certo, false);
});

teste("respostaCorreta devolve o texto para mostrar na resolução", () => {
  assert.equal(respostaCorreta(questaoAlt), "3/8");
  assert.equal(respostaCorreta(questaoNum), "27 reais");
  assert.equal(respostaCorreta({ ...questaoNum, resposta: 0.5, unidade: undefined }), "0,5");
});

// ---------- Progresso ----------

grupo("Progresso");

teste("registrar uma resposta marca a questão como respondida", () => {
  const p = registrarResposta("fracoes", "o-que-e", "q1", true, 4);
  assert.deepEqual(p.respondidas, ["q1"]);
  assert.deepEqual(p.acertadas, ["q1"]);
  assert.equal(p.concluida, false);
});

teste("acertar depois de ver a resolução não conta como 'de primeira'", () => {
  registrarResposta("fracoes", "o-que-e", "q1", false, 4);
  const p = lerLicao("fracoes", "o-que-e");
  assert.deepEqual(p.respondidas, ["q1"]);
  assert.deepEqual(p.acertadas, [], "não deveria contar acerto de primeira");
});

teste("responder a mesma questão duas vezes não infla a contagem", () => {
  registrarResposta("fracoes", "o-que-e", "q1", true, 4);
  registrarResposta("fracoes", "o-que-e", "q1", true, 4);
  registrarResposta("fracoes", "o-que-e", "q1", false, 4);
  const p = lerLicao("fracoes", "o-que-e");
  assert.equal(p.respondidas.length, 1, "a mesma questão foi contada mais de uma vez");
  assert.equal(p.acertadas.length, 1);
});

teste("a lição só fica concluída quando todas as questões forem respondidas", () => {
  for (const id of ["q1", "q2", "q3"]) {
    registrarResposta("fracoes", "o-que-e", id, true, 4);
    assert.equal(lerLicao("fracoes", "o-que-e").concluida, false, `concluiu cedo em ${id}`);
  }
  assert.equal(registrarResposta("fracoes", "o-que-e", "q4", true, 4).concluida, true);
});

teste("uma lição não interfere na outra", () => {
  registrarResposta("fracoes", "o-que-e", "q1", true, 4);
  registrarResposta("fracoes", "comparar", "q1", false, 4);
  assert.equal(lerLicao("fracoes", "o-que-e").acertadas.length, 1);
  assert.equal(lerLicao("fracoes", "comparar").acertadas.length, 0);

  reiniciarLicao("fracoes", "o-que-e");
  assert.equal(lerLicao("fracoes", "o-que-e").respondidas.length, 0);
  assert.equal(lerLicao("fracoes", "comparar").respondidas.length, 1, "reiniciar uma lição apagou outra");
});

teste("um CURSO não interfere no outro", () => {
  // É o teste que protege a separação entre matérias: o aluno pode estar no
  // meio de Frações e de Decimais ao mesmo tempo.
  registrarResposta("fracoes", "o-que-e", "q1", true, 4);
  registrarResposta("decimais", "o-que-e-virgula", "q1", true, 4);

  assert.equal(lerCurso("fracoes").licoes["o-que-e"].respondidas.length, 1);
  assert.equal(lerCurso("decimais").licoes["o-que-e-virgula"].respondidas.length, 1);
  assert.equal(lerCurso("fracoes").licoes["o-que-e-virgula"], undefined, "vazou lição entre cursos");

  reiniciarCurso("fracoes");
  assert.deepEqual(lerCurso("fracoes").licoes, {});
  assert.equal(lerCurso("decimais").licoes["o-que-e-virgula"].respondidas.length, 1, "apagar um curso levou o outro");
});

teste("lições com o mesmo id em cursos diferentes não se misturam", () => {
  // "comparar" e "somar-subtrair" existem nos dois cursos. Se o progresso
  // fosse guardado só por id de lição, um curso sobrescreveria o outro.
  registrarResposta("fracoes", "comparar", "q1", true, 4);
  registrarResposta("decimais", "comparar", "q1", false, 4);
  registrarResposta("decimais", "comparar", "q2", false, 4);

  assert.equal(lerLicao("fracoes", "comparar").respondidas.length, 1);
  assert.equal(lerLicao("fracoes", "comparar").acertadas.length, 1);
  assert.equal(lerLicao("decimais", "comparar").respondidas.length, 2);
  assert.equal(lerLicao("decimais", "comparar").acertadas.length, 0);
});

teste("dados corrompidos não derrubam a aplicação", () => {
  window.localStorage.setItem("biblioteca_matematica_v3", "{isso não é json");
  assert.deepEqual(lerTudo().cursos, {});
  assert.equal(lerLicao("fracoes", "o-que-e").respondidas.length, 0);
  registrarResposta("fracoes", "o-que-e", "q1", true, 4);
  assert.equal(lerLicao("fracoes", "o-que-e").respondidas.length, 1);
});

teste("registro com formato inválido é descartado sem levar os válidos junto", () => {
  window.localStorage.setItem(
    "biblioteca_matematica_v3",
    JSON.stringify({
      cursos: {
        fracoes: {
          cursoId: "fracoes",
          licoes: {
            boa: { licaoId: "boa", respondidas: ["q1"], acertadas: [], concluida: false },
            ruim: { licaoId: "ruim", respondidas: "não é lista" },
          },
        },
      },
    })
  );
  const curso = lerCurso("fracoes");
  assert.ok(curso.licoes.boa, "o registro válido foi perdido");
  assert.equal(curso.licoes.ruim, undefined, "o registro inválido passou");
});

grupo("Resumo do curso");

const LICOES = [
  { id: "a", questoes: 4 },
  { id: "b", questoes: 4 },
  { id: "c", questoes: 2 },
];

teste("resumirCurso conta lições concluídas, questões e acertos de primeira", () => {
  registrarResposta("m", "a", "q1", true, 4);
  registrarResposta("m", "a", "q2", false, 4);
  let r = resumirCurso("m", LICOES);
  assert.equal(r.licoesConcluidas, 0);
  assert.equal(r.questoesRespondidas, 2);
  assert.equal(r.acertosDePrimeira, 1);
  assert.equal(r.concluido, false);

  for (const q of ["q3", "q4"]) registrarResposta("m", "a", q, true, 4);
  r = resumirCurso("m", LICOES);
  assert.equal(r.licoesConcluidas, 1);
  assert.equal(r.acertosDePrimeira, 3);
  assert.equal(r.concluido, false, "ainda faltam duas lições");
});

teste("o curso só fica concluído com TODAS as lições concluídas", () => {
  for (const q of ["q1", "q2", "q3", "q4"]) registrarResposta("m", "a", q, true, 4);
  for (const q of ["q1", "q2", "q3", "q4"]) registrarResposta("m", "b", q, true, 4);
  assert.equal(resumirCurso("m", LICOES).concluido, false, "falta a lição c");

  registrarResposta("m", "c", "q1", true, 2);
  assert.equal(resumirCurso("m", LICOES).concluido, false, "a lição c ainda não terminou");

  registrarResposta("m", "c", "q2", false, 2);
  const r = resumirCurso("m", LICOES);
  assert.equal(r.concluido, true);
  assert.equal(r.licoesConcluidas, 3);
  assert.equal(r.questoesRespondidas, 10);
  assert.equal(r.acertosDePrimeira, 9);
});

teste("proximaLicao devolve a primeira ainda não concluída", () => {
  const ordem = ["a", "b", "c"];
  assert.equal(proximaLicao("m", ordem), "a");
  for (const q of ["q1", "q2", "q3", "q4"]) registrarResposta("m", "a", q, true, 4);
  assert.equal(proximaLicao("m", ordem), "b");
  for (const q of ["q1", "q2", "q3", "q4"]) registrarResposta("m", "b", q, true, 4);
  for (const q of ["q1", "q2"]) registrarResposta("m", "c", q, true, 2);
  assert.equal(proximaLicao("m", ordem), null, "com tudo concluído não há próxima");
});

// ---------- Certificado ----------

grupo("Certificado");

const certificadoBase = {
  cursoId: "fracoes",
  cursoTitulo: "Frações",
  ano: 6,
  nome: "Maria Souza",
  data: "2026-09-04T12:00:00.000Z",
  questoes: 32,
  acertosDePrimeira: 27,
};

teste("emitir guarda o certificado junto do progresso do curso", () => {
  assert.equal(lerCertificado("fracoes"), null, "não deveria existir antes de emitir");
  emitirCertificado(certificadoBase);
  const salvo = lerCertificado("fracoes");
  assert.ok(salvo);
  assert.equal(salvo.nome, "Maria Souza");
  assert.equal(salvo.acertosDePrimeira, 27);
});

teste("o certificado sobrevive a novas respostas no mesmo curso", () => {
  emitirCertificado(certificadoBase);
  registrarResposta("fracoes", "o-que-e", "q1", true, 4);
  assert.ok(lerCertificado("fracoes"), "registrar resposta apagou o certificado");
});

teste("reemitir com outro nome substitui, sem duplicar", () => {
  emitirCertificado(certificadoBase);
  emitirCertificado({ ...certificadoBase, nome: "Maria S. Souza" });
  assert.equal(lerCertificado("fracoes").nome, "Maria S. Souza");
  assert.equal(listarCertificados().length, 1);
});

teste("apagar o progresso do curso apaga o certificado dele", () => {
  emitirCertificado(certificadoBase);
  emitirCertificado({ ...certificadoBase, cursoId: "decimais", cursoTitulo: "Números decimais" });
  assert.equal(listarCertificados().length, 2);

  reiniciarCurso("fracoes");
  const restantes = listarCertificados();
  assert.equal(restantes.length, 1);
  assert.equal(restantes[0].cursoId, "decimais");
});

teste("listarCertificados devolve do mais novo para o mais antigo", () => {
  emitirCertificado({ ...certificadoBase, cursoId: "a", cursoTitulo: "A", data: "2026-01-10T00:00:00.000Z" });
  emitirCertificado({ ...certificadoBase, cursoId: "b", cursoTitulo: "B", data: "2026-05-20T00:00:00.000Z" });
  emitirCertificado({ ...certificadoBase, cursoId: "c", cursoTitulo: "C", data: "2026-03-15T00:00:00.000Z" });
  assert.deepEqual(listarCertificados().map((c) => c.cursoId), ["b", "c", "a"]);
});

teste("certificado com formato inválido é ignorado na leitura", () => {
  window.localStorage.setItem(
    "biblioteca_matematica_v3",
    JSON.stringify({
      cursos: { fracoes: { cursoId: "fracoes", licoes: {}, certificado: { nome: 42 } } },
    })
  );
  assert.equal(lerCertificado("fracoes"), null, "certificado quebrado deveria ser descartado");
});

teste("o canvas sai no tamanho de impressão esperado", () => {
  const canvas = desenharCertificado(certificadoBase);
  assert.equal(canvas.width, 2000);
  assert.equal(canvas.height, 1414);
});

teste("o nome do arquivo remove acento, espaço e caractere de caminho", () => {
  assert.equal(nomeArquivo("João da Silva Ção", "Frações"), "certificado-fracoes-joao-da-silva-cao.png");
  assert.equal(nomeArquivo("  ", "Frações"), "certificado-fracoes-aluno.png", "nome vazio vira 'aluno'");
  assert.equal(
    nomeArquivo("../../etc/passwd", "Números decimais"),
    "certificado-numeros-decimais-etc-passwd.png",
    "barras e pontos não podem virar caminho de arquivo"
  );
});

// ---------- Certificado de ano ----------

grupo("Certificado de ano");

/** Emite o certificado de uma matéria com números controlados. */
const materia = (id, titulo, licoes, questoes, acertos, data = "2026-09-04T12:00:00.000Z") =>
  emitirCertificado({
    cursoId: id, cursoTitulo: titulo, ano: 6, nome: "Maria Souza",
    data, questoes, acertosDePrimeira: acertos, licoes,
  });

teste("o ano só fecha quando TODAS as matérias publicadas têm certificado", () => {
  materia("fracoes", "Frações", 8, 32, 27);
  materia("decimais", "Números decimais", 6, 24, 20);

  const parcial = resumirAno(["fracoes", "decimais", "angulos"]);
  assert.equal(parcial.concluidas, 2);
  assert.equal(parcial.totalMaterias, 3);
  assert.equal(parcial.concluido, false, "faltando uma matéria, o ano não fecha");

  materia("angulos", "Ângulos", 6, 24, 18);
  assert.equal(resumirAno(["fracoes", "decimais", "angulos"]).concluido, true);
});

teste("o resumo do ano soma lições, questões e acertos das matérias", () => {
  materia("fracoes", "Frações", 8, 32, 27);
  materia("decimais", "Números decimais", 6, 24, 20);
  materia("angulos", "Ângulos", 6, 24, 18);

  const r = resumirAno(["fracoes", "decimais", "angulos"]);
  assert.equal(r.licoes, 8 + 6 + 6);
  assert.equal(r.questoes, 32 + 24 + 24);
  assert.equal(r.acertosDePrimeira, 27 + 20 + 18);
  assert.deepEqual(r.materias, ["Frações", "Números decimais", "Ângulos"], "na ordem do catálogo");
});

teste("a data do ano é a da matéria concluída por último", () => {
  materia("a", "A", 1, 4, 4, "2026-02-10T00:00:00.000Z");
  materia("b", "B", 1, 4, 4, "2026-08-30T00:00:00.000Z");
  materia("c", "C", 1, 4, 4, "2026-05-01T00:00:00.000Z");
  assert.equal(resumirAno(["a", "b", "c"]).ultimaData, "2026-08-30T00:00:00.000Z");
});

teste("matéria sem certificado não entra na soma", () => {
  materia("fracoes", "Frações", 8, 32, 27);
  const r = resumirAno(["fracoes", "decimais"]);
  assert.equal(r.questoes, 32, "a matéria sem certificado não pode somar nada");
  assert.equal(r.materias.length, 1);
});

teste("ano sem matéria nenhuma não conta como concluído", () => {
  assert.equal(resumirAno([]).concluido, false);
});

const certAno = {
  ano: 6, anoTitulo: "6º ano", nome: "Maria Souza", data: "2026-09-06T12:00:00.000Z",
  materias: ["Frações", "Ângulos"], licoes: 14, questoes: 56, acertosDePrimeira: 45,
};

teste("emitir e reler o certificado de ano", () => {
  assert.equal(lerCertificadoAno(6), null);
  emitirCertificadoAno(certAno);
  const salvo = lerCertificadoAno(6);
  assert.equal(salvo.nome, "Maria Souza");
  assert.equal(salvo.questoes, 56);
  assert.equal(lerCertificadoAno(7), null, "um ano não pode responder pelo outro");
});

teste("reemitir o ano com outro nome substitui, sem duplicar", () => {
  emitirCertificadoAno(certAno);
  emitirCertificadoAno({ ...certAno, nome: "Maria S. Souza" });
  assert.equal(listarCertificadosAno().length, 1);
  assert.equal(lerCertificadoAno(6).nome, "Maria S. Souza");
});

teste("o certificado de ano convive com os de matéria no mesmo armazenamento", () => {
  materia("fracoes", "Frações", 8, 32, 27);
  emitirCertificadoAno(certAno);
  assert.equal(listarCertificados().length, 1, "o de matéria continua lá");
  assert.equal(listarCertificadosAno().length, 1);
  assert.ok(lerCertificado("fracoes"));
});

teste("remover o certificado de ano não mexe nos de matéria", () => {
  materia("fracoes", "Frações", 8, 32, 27);
  emitirCertificadoAno(certAno);
  removerCertificadoAno(6);
  assert.equal(lerCertificadoAno(6), null);
  assert.equal(listarCertificados().length, 1, "apagar o ano não pode apagar a matéria");
});

teste("certificado de ano com formato inválido é ignorado na leitura", () => {
  window.localStorage.setItem(
    "biblioteca_matematica_v3",
    JSON.stringify({ cursos: {}, anos: { 6: { ano: "seis" } } })
  );
  assert.deepEqual(listarCertificadosAno(), []);
});

teste("progresso antigo, sem a chave dos anos, continua sendo lido", () => {
  // Quem já usava o site antes do certificado de ano não pode perder nada.
  window.localStorage.setItem(
    "biblioteca_matematica_v3",
    JSON.stringify({
      cursos: {
        fracoes: {
          cursoId: "fracoes",
          licoes: { "o-que-e": { licaoId: "o-que-e", respondidas: ["q1"], acertadas: ["q1"], concluida: true } },
          certificado: { cursoId: "fracoes", cursoTitulo: "Frações", ano: 6, nome: "Ana", data: "2026-01-01T00:00:00.000Z", questoes: 32, acertosDePrimeira: 30 },
        },
      },
    })
  );
  assert.equal(lerCertificado("fracoes").nome, "Ana");
  assert.equal(lerCertificado("fracoes").licoes, 0, "registro antigo não tem o campo, e vale 0");
  assert.deepEqual(listarCertificadosAno(), []);
  assert.equal(lerLicao("fracoes", "o-que-e").concluida, true);
});

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) process.exit(1);

// tests/conteudo.test.mjs
//
// Verificação do conteúdo publicado, para TODOS os cursos do catálogo.
//
// A parte mais importante é a segunda: cada resposta é RECALCULADA aqui, do
// zero, a partir dos dados do enunciado, e comparada com o que está no JSON.
// Nenhuma conta do site foi conferida "de cabeça".
//
// A primeira parte checa integridade: imagem existente, alternativa única,
// erro comum que não colide com a resposta certa, fonte declarada, vídeo
// com id plausível.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// Os testes de geometria medem o SVG gerado, e não só o JSON do conteúdo.
import * as desenhos from "../ferramentas/desenhos.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(AQUI, "..", "public");

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

const ler = (rel) => JSON.parse(readFileSync(join(PUBLICO, rel.replace(/^\//, "")), "utf8"));

const catalogo = ler("dados/catalogo.json");
const imagens = ler("dados/imagens.json");

/** Todos os cursos disponíveis, já com as lições carregadas. */
const cursos = catalogo.anos
  .flatMap((a) => a.cursos)
  .filter((c) => c.disponivel)
  .map((item) => {
    const curso = ler(item.arquivo);
    return { item, curso, licoes: curso.licoes.map((l) => ler(l.arquivo)) };
  });

const todasLicoes = cursos.flatMap((c) => c.licoes.map((l) => ({ ...l, curso: c.curso.id })));
const todasQuestoes = todasLicoes.flatMap((l) => l.questoes.map((q) => ({ ...q, licao: l.id, curso: l.curso })));

// ============================================================
// 1. Catálogo e estrutura
// ============================================================

grupo("Catálogo");

teste("os quatro anos existem e nenhum está vazio", () => {
  assert.deepEqual(catalogo.anos.map((a) => a.ano), [6, 7, 8, 9]);
  for (const ano of catalogo.anos) {
    assert.ok(ano.cursos.length >= 10, `${ano.ano}º ano com poucas matérias`);
    assert.ok(ano.titulo && ano.descricao, `${ano.ano}º ano sem título ou descrição`);
  }
});

teste("todo id de matéria é único no catálogo inteiro", () => {
  const ids = catalogo.anos.flatMap((a) => a.cursos.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length, "há id de matéria repetido entre anos");
});

teste("toda matéria tem resumo, e só as disponíveis apontam para um arquivo", () => {
  for (const ano of catalogo.anos) {
    for (const c of ano.cursos) {
      assert.ok(c.titulo && c.resumo?.length > 20, `${c.id}: resumo fraco ou ausente`);
      if (c.disponivel) {
        assert.ok(c.arquivo, `${c.id} está disponível mas não aponta para arquivo`);
        assert.ok(existsSync(join(PUBLICO, c.arquivo.replace(/^\//, ""))), `${c.id}: arquivo não existe`);
      } else {
        assert.equal(c.arquivo, undefined, `${c.id} não está disponível mas aponta para arquivo`);
      }
    }
  }
});

teste("há pelo menos uma matéria disponível", () => {
  assert.ok(cursos.length >= 1, "nenhuma matéria disponível");
});

grupo("Cursos");

teste("o id do curso bate com o id no catálogo, e o ano bate com a seção", () => {
  for (const { item, curso } of cursos) {
    assert.equal(curso.id, item.id, `${item.id}: id divergente dentro do arquivo`);
    const anoDoCatalogo = catalogo.anos.find((a) => a.cursos.some((c) => c.id === item.id));
    assert.equal(curso.ano, anoDoCatalogo.ano, `${item.id}: ano do curso não bate com a seção do catálogo`);
  }
});

teste("as lições de cada curso são numeradas de 1 até N, sem pular", () => {
  for (const { curso, licoes } of cursos) {
    const numeros = licoes.map((l) => l.numero).sort((a, b) => a - b);
    const esperado = licoes.map((_, i) => i + 1);
    assert.deepEqual(numeros, esperado, `${curso.id}: numeração das lições quebrada`);
  }
});

teste("o id declarado no curso bate com o id dentro de cada lição", () => {
  for (const { curso, licoes } of cursos) {
    curso.licoes.forEach((entrada, i) => {
      assert.equal(entrada.id, licoes[i].id, `${curso.id}: entrada ${entrada.id} aponta para lição ${licoes[i].id}`);
    });
  }
});

teste("todo curso tem pelo menos 3 vídeos de aprofundamento", () => {
  for (const { curso } of cursos) {
    assert.ok(curso.videos.length >= 3, `${curso.id}: só ${curso.videos.length} vídeo(s)`);
    for (const v of curso.videos) {
      assert.match(v.id, /^[A-Za-z0-9_-]{11}$/, `${curso.id}: id de vídeo implausível "${v.id}"`);
      assert.ok(v.canal?.length > 2, `${curso.id}: vídeo sem canal`);
      assert.ok(v.titulo?.length > 10, `${curso.id}: vídeo sem título`);
      assert.ok(
        v.descricao?.length > 60,
        `${curso.id}: a nota do vídeo "${v.titulo}" precisa dizer para quem e para quando ele serve`
      );
    }
    const ids = curso.videos.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, `${curso.id}: vídeo repetido`);
  }
});

grupo("Lições");

teste("toda lição tem a ideia, o exemplo resolvido e questões", () => {
  for (const l of todasLicoes) {
    assert.ok(l.ideia.paragrafos.length >= 3, `${l.curso}/${l.id}: a ideia precisa de pelo menos 3 parágrafos`);
    assert.ok(l.ideia.destaque, `${l.curso}/${l.id}: falta a frase de destaque`);
    assert.ok(l.resolvido.passos.length >= 3, `${l.curso}/${l.id}: exemplo resolvido com poucos passos`);
    assert.ok(l.resolvido.fecho, `${l.curso}/${l.id}: falta o fecho do exemplo`);
    assert.ok(l.questoes.length >= 4, `${l.curso}/${l.id}: menos de 4 questões`);
  }
});

teste("todo passo separa a explicação da conta", () => {
  const passos = [
    ...todasLicoes.flatMap((l) => l.resolvido.passos),
    ...todasQuestoes.flatMap((q) => q.resolucao),
  ];
  for (const p of passos) {
    assert.ok(p.titulo && p.titulo.length > 4, `passo sem título: ${JSON.stringify(p).slice(0, 60)}`);
    assert.ok(
      p.explicacao && p.explicacao.length > 30,
      `passo com explicação curta demais (não ensina): "${p.titulo}"`
    );
  }
});

grupo("Questões");

teste("id de questão único dentro de cada lição", () => {
  for (const l of todasLicoes) {
    const ids = l.questoes.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, `${l.curso}/${l.id}: id de questão repetido`);
  }
});

teste("TODA questão tem imagem, e o arquivo existe em disco", () => {
  for (const q of todasQuestoes) {
    assert.ok(q.imagem, `${q.curso}/${q.licao}/${q.id} está sem imagem`);
    const dados = imagens[q.imagem];
    assert.ok(dados, `${q.curso}/${q.licao}/${q.id}: imagem "${q.imagem}" não está no índice`);
    assert.ok(
      existsSync(join(PUBLICO, dados.arquivo.replace(/^\//, ""))),
      `${q.curso}/${q.licao}/${q.id}: arquivo ${dados.arquivo} não existe`
    );
  }
});

teste("as imagens das lições (ideia e resolvido) também existem", () => {
  for (const l of todasLicoes) {
    for (const chave of [l.ideia.imagem, l.resolvido.imagem]) {
      if (!chave) continue;
      const dados = imagens[chave];
      assert.ok(dados, `${l.curso}/${l.id}: imagem "${chave}" fora do índice`);
      assert.ok(existsSync(join(PUBLICO, dados.arquivo.replace(/^\//, ""))), `${l.curso}/${l.id}: ${dados.arquivo} não existe`);
    }
  }
});

teste("todo alt é uma frase completa que descreve a figura", () => {
  for (const [id, im] of Object.entries(imagens)) {
    assert.ok(im.alt && im.alt.length > 20, `${id}: alt curto demais`);
    assert.ok(/[.!?]$/.test(im.alt), `${id}: alt deveria ser uma frase completa`);
  }
});

teste("nenhuma imagem do índice ficou órfã", () => {
  const usadas = new Set();
  for (const q of todasQuestoes) usadas.add(q.imagem);
  for (const l of todasLicoes) {
    if (l.ideia.imagem) usadas.add(l.ideia.imagem);
    if (l.resolvido.imagem) usadas.add(l.resolvido.imagem);
    for (const p of l.resolvido.passos) if (p.imagem) usadas.add(p.imagem);
  }
  for (const q of todasQuestoes) for (const p of q.resolucao) if (p.imagem) usadas.add(p.imagem);
  const orfas = Object.keys(imagens).filter((k) => !usadas.has(k));
  assert.deepEqual(orfas, [], `imagens geradas mas não usadas: ${orfas.join(", ")}`);
});

teste("alternativas: índice válido e nenhum texto repetido", () => {
  for (const q of todasQuestoes) {
    if (q.formato !== "alternativas") continue;
    assert.ok(q.alternativas.length >= 4, `${q.curso}/${q.licao}/${q.id}: poucas alternativas`);
    assert.ok(
      Number.isInteger(q.correta) && q.correta >= 0 && q.correta < q.alternativas.length,
      `${q.curso}/${q.licao}/${q.id}: índice da correta fora do intervalo`
    );
    const textos = q.alternativas.map((a) => a.texto.trim().toLowerCase());
    assert.equal(new Set(textos).size, textos.length, `${q.curso}/${q.licao}/${q.id}: duas alternativas iguais`);
  }
});

teste("nenhum 'erro comum' aponta para a resposta certa", () => {
  for (const q of todasQuestoes) {
    if (!q.errosComuns) continue;
    const certa = q.formato === "alternativas" ? q.alternativas[q.correta].texto : String(q.resposta);
    for (const erro of q.errosComuns) {
      assert.notEqual(
        erro.resposta.trim().toLowerCase(),
        certa.trim().toLowerCase(),
        `${q.curso}/${q.licao}/${q.id}: o erro comum "${erro.resposta}" é a resposta correta`
      );
    }
  }
});

teste("todo erro comum explica o raciocínio, não só corrige", () => {
  for (const q of todasQuestoes) {
    for (const erro of q.errosComuns ?? []) {
      assert.ok(
        erro.porque.length > 60,
        `${q.curso}/${q.licao}/${q.id}: diagnóstico curto demais para "${erro.resposta}"`
      );
    }
  }
});

teste("toda questão tem pelo menos um erro comum previsto", () => {
  // Sem isso a questão devolve só "ainda não", que é o feedback genérico
  // que a v3 existe para evitar.
  for (const q of todasQuestoes) {
    assert.ok(
      q.errosComuns?.length >= 1,
      `${q.curso}/${q.licao}/${q.id}: nenhum erro comum previsto`
    );
  }
});

teste("nas questões de alternativa, os erros previstos existem entre as opções", () => {
  for (const q of todasQuestoes) {
    if (q.formato !== "alternativas" || !q.errosComuns) continue;
    const textos = q.alternativas.map((a) => a.texto.trim().toLowerCase());
    for (const erro of q.errosComuns) {
      assert.ok(
        textos.includes(erro.resposta.trim().toLowerCase()),
        `${q.curso}/${q.licao}/${q.id}: erro comum "${erro.resposta}" não é nenhuma das alternativas`
      );
    }
  }
});

teste("toda questão tem dica e resolução comentada", () => {
  for (const q of todasQuestoes) {
    assert.ok(q.dica && q.dica.length > 20, `${q.curso}/${q.licao}/${q.id}: dica fraca ou ausente`);
    assert.ok(q.resolucao.length >= 2, `${q.curso}/${q.licao}/${q.id}: resolução com menos de 2 passos`);
  }
});

teste("questões vindas de prova pública declaram a fonte", () => {
  const comFonte = todasQuestoes.filter((q) => q.fonte);
  assert.ok(comFonte.length >= 3, "esperava pelo menos 3 questões de prova pública");
  for (const q of comFonte) {
    assert.match(q.fonte.prova, /OBMEP/, `${q.curso}/${q.licao}/${q.id}: prova não identificada`);
    assert.ok(q.fonte.ano >= 2005 && q.fonte.ano <= 2025, `${q.curso}/${q.licao}/${q.id}: ano improvável`);
    assert.ok(q.fonte.referencia.length > 5, `${q.curso}/${q.licao}/${q.id}: referência vaga`);
  }
});

// ============================================================
// 2. A matemática, recalculada do zero
// ============================================================

grupo("Verificação independente das contas");

function achar(cursoId, licaoId, questaoId) {
  const c = cursos.find((x) => x.curso.id === cursoId);
  assert.ok(c, `curso ${cursoId} não existe`);
  const l = c.licoes.find((x) => x.id === licaoId);
  assert.ok(l, `lição ${cursoId}/${licaoId} não existe`);
  const q = l.questoes.find((x) => x.id === questaoId);
  assert.ok(q, `questão ${cursoId}/${licaoId}/${questaoId} não existe`);
  return q;
}

function num(cursoId, licaoId, questaoId, esperado) {
  const q = achar(cursoId, licaoId, questaoId);
  assert.equal(q.formato, "numero", `${licaoId}/${questaoId} não é de resposta numérica`);
  assert.ok(
    Math.abs(q.resposta - esperado) < 1e-9,
    `${cursoId}/${licaoId}/${questaoId}: JSON diz ${q.resposta}, a conta dá ${esperado}`
  );
}

function alt(cursoId, licaoId, questaoId, textoEsperado) {
  const q = achar(cursoId, licaoId, questaoId);
  assert.equal(q.formato, "alternativas");
  const marcada = q.alternativas[q.correta].texto;
  assert.equal(
    marcada,
    textoEsperado,
    `${cursoId}/${licaoId}/${questaoId}: JSON marca "${marcada}", a conta dá "${textoEsperado}"`
  );
}

const mdc = (a, b) => (b === 0 ? Math.abs(a) : mdc(b, a % b));
const mmc = (a, b) => Math.abs(a * b) / mdc(a, b);
const simplifica = (n, d) => { const g = mdc(n, d); return [n / g, d / g]; };
const fr = (n, d) => `${n}/${d}`;
/** Arredonda para "casas" decimais, como um humano faria (meio para cima). */
const arred = (x, casas) => {
  const f = 10 ** casas;
  return Math.round((x + Number.EPSILON) * f) / f;
};

// ---------- Frações ----------

teste("frações · lição 1 — leitura de figura", () => {
  alt("fracoes", "o-que-e", "q1", fr(3, 8));
  alt("fracoes", "o-que-e", "q2", fr(5, 12));
  const totalGrade = 5 * 2;
  alt("fracoes", "o-que-e", "q3", fr(totalGrade - 3, totalGrade));
  num("fracoes", "o-que-e", "q4", 8);
});

teste("frações · lição 2 — reta numérica", () => {
  alt("fracoes", "reta-numerica", "q1", fr(3, 5));
  alt("fracoes", "reta-numerica", "q2", fr(4, 4));
  num("fracoes", "reta-numerica", "q3", 6);
  alt("fracoes", "reta-numerica", "q4", fr(6, 8));
});

teste("frações · lição 3 — equivalência", () => {
  num("fracoes", "equivalentes", "q1", 2 * (12 / 3));
  alt("fracoes", "equivalentes", "q2", `${fr(1, 2)} = ${fr(3, 6)}`);
  num("fracoes", "equivalentes", "q3", 1 * (20 / 4));
  const [n, d] = simplifica(6, 10);
  alt("fracoes", "equivalentes", "q4", fr(n, d));
});

teste("frações · lição 4 — simplificação", () => {
  num("fracoes", "simplificar", "q1", simplifica(12, 16)[0]);
  const candidatas = [[7, 9], [6, 8], [10, 15], [9, 12]];
  const irredutiveis = candidatas.filter(([a, b]) => mdc(a, b) === 1);
  assert.equal(irredutiveis.length, 1, "deveria haver exatamente uma irredutível");
  alt("fracoes", "simplificar", "q2", fr(irredutiveis[0][0], irredutiveis[0][1]));
  num("fracoes", "simplificar", "q3", simplifica(24, 36)[1]);
  const [n4, d4] = simplifica(18, 30);
  alt("fracoes", "simplificar", "q4", fr(n4, d4));
});

teste("frações · lição 5 — comparação", () => {
  alt("fracoes", "comparar", "q1", 2 / 3 > 3 / 5 ? fr(2, 3) : fr(3, 5));
  assert.ok(1 / 5 > 1 / 8);
  alt("fracoes", "comparar", "q2", "Na pizza cortada em 5");
  const ordenadas = [[3, 4], [1, 2], [5, 8]]
    .sort((a, b) => a[0] / a[1] - b[0] / b[1])
    .map(([n, d]) => fr(n, d));
  alt("fracoes", "comparar", "q3", ordenadas.join(" · "));
  assert.ok(5 / 6 > 7 / 9);
  alt("fracoes", "comparar", "q4", "O time B");
});

teste("frações · lição 6 — fração de uma quantidade (com OBMEP)", () => {
  num("fracoes", "fracao-de-quantidade", "q1", (350 / 5) * 2);

  // OBMEP "Amigos e frações": cada um deu x. Adriano tinha 5x, Bruno 4x,
  // César 3x. Daniel ficou com 3x de um total inicial de 12x.
  const x = 1;
  const [n, d] = simplifica(3 * x, 5 * x + 4 * x + 3 * x);
  assert.equal(fr(n, d), "1/4");
  alt("fracoes", "fracao-de-quantidade", "q2", fr(n, d));

  // OBMEP "Atletas da escola": em doze avos, 3 + 4 + 1 = 8 partes ocupadas,
  // sobram 4 partes = 300 alunos.
  const ocupadas = 12 / 4 + 12 / 3 + 12 / 12;
  assert.equal(ocupadas, 8);
  const escola = (300 / (12 - ocupadas)) * 12;
  assert.equal(escola, 900);
  assert.equal(escola / 4 + escola / 3 + escola / 12 + 300, escola, "as partes não fecham com o total");
  num("fracoes", "fracao-de-quantidade", "q3", escola);

  num("fracoes", "fracao-de-quantidade", "q4", 15 * 4);
});

teste("frações · lição 7 — somar e subtrair (com OBMEP)", () => {
  const m1 = mmc(4, 6);
  const [ns1, ds1] = simplifica(3 * (m1 / 4) + 1 * (m1 / 6), m1);
  assert.equal(fr(ns1, ds1), "11/12");
  num("fracoes", "somar-subtrair", "q1", ns1);

  // OBMEP canecas: pequena = 3/5 da média; média = 5/8 da grande.
  const pequenaEmGrande = (3 / 5) * (5 / 8);
  assert.equal(pequenaEmGrande, 3 / 8);
  assert.equal(pequenaEmGrande + 5 / 8, 1, "pequena + média tem que dar a caneca grande exata");
  alt("fracoes", "somar-subtrair", "q2", "Ela ficará totalmente cheia, sem transbordar.");

  const m3 = mmc(6, 4);
  const [ns3, ds3] = simplifica(5 * (m3 / 6) - 1 * (m3 / 4), m3);
  assert.equal(fr(ns3, ds3), "7/12");
  num("fracoes", "somar-subtrair", "q3", ns3);

  const m4 = mmc(4, 5);
  const [ns4, ds4] = simplifica(3 * (m4 / 4) - 2 * (m4 / 5), m4);
  alt("fracoes", "somar-subtrair", "q4", fr(ns4, ds4));
});

teste("frações · lição 8 — fração do que sobrou", () => {
  const apos1 = 60 - (60 / 5) * 2;
  assert.equal(apos1, 36);
  num("fracoes", "do-que-sobrou", "q1", apos1 - apos1 / 4);

  const aposJoao = 90 - 90 / 3;
  num("fracoes", "do-que-sobrou", "q2", aposJoao - aposJoao / 2);

  const v = 100;
  const resta = (v - v / 2) - (v - v / 2) / 2;
  const [nr, dr] = simplifica(resta, v);
  assert.equal(fr(nr, dr), "1/4");
  alt("fracoes", "do-que-sobrou", "q3", fr(nr, dr));

  const totalAna = 300;
  const segunda = (totalAna / 5) * 2;
  const resto = totalAna - segunda;
  assert.equal(resto - resto / 3, 120, "o enunciado diz que faltam 120 páginas");
  num("fracoes", "do-que-sobrou", "q4", totalAna);
});

// ---------- Números decimais ----------

teste("decimais · lição 1 — o que a vírgula quer dizer", () => {
  // grade 10x10 com 7 preenchidas → 7/100
  alt("decimais", "o-que-e-virgula", "q1", String(7 / 100).replace(".", ","));
  num("decimais", "o-que-e-virgula", "q2", 0.4 * 10);
  alt("decimais", "o-que-e-virgula", "q3", String(40 / 100).replace(".", ","));
  alt("decimais", "o-que-e-virgula", "q4", fr(25, 100));
});

teste("decimais · lição 2 — valor posicional", () => {
  // Em 3,168 as casas são: unidades 3, décimos 1, centésimos 6, milésimos 8.
  const casas = ["unidades", "décimos", "centésimos", "milésimos"];
  const algarismos = [3, 1, 6, 8];
  const posicaoDo6 = algarismos.indexOf(6);
  assert.equal(casas[posicaoDo6], "centésimos");
  alt("decimais", "ler-escrever", "q1", "6 centésimos");

  // doze inteiros e trinta e quatro centésimos = 12 + 34/100
  const valor = 12 + 34 / 100;
  assert.equal(valor, 12.34);
  alt("decimais", "ler-escrever", "q2", "12,34");

  // qual é igual a 0,5
  const iguais = ["0,50", "0,05", "5,0", "0,005"].filter(
    (t) => Number(t.replace(",", ".")) === 0.5
  );
  assert.deepEqual(iguais, ["0,50"], "deveria haver exatamente um igual a 0,5");
  alt("decimais", "ler-escrever", "q3", iguais[0]);

  // 8,09 → parte decimal em centésimos
  num("decimais", "ler-escrever", "q4", Math.round((8.09 - 8) * 100));
});

teste("decimais · lição 3 — reta numérica", () => {
  // reta de 0 a 1 em 10 partes, ponto no 3º tracinho
  alt("decimais", "na-reta", "q1", String(arred(3 * (1 / 10), 4)).replace(".", ","));
  assert.ok(2 < 2.45 && 2.45 < 3);
  alt("decimais", "na-reta", "q2", "Entre 2 e 3");
  // reta de 3 a 4 em 10 partes, ponto no 6º tracinho
  alt("decimais", "na-reta", "q3", String(arred(3 + 6 * 0.1, 4)).replace(".", ","));
  assert.ok(1 < 1.5 && 1.5 < 2);
  num("decimais", "na-reta", "q4", Math.floor(1.5));
});

teste("decimais · lição 4 — comparar", () => {
  assert.ok(0.8 > 0.25);
  alt("decimais", "comparar", "q1", "0,8");

  const ordenados = [1.2, 1.15, 1.09]
    .sort((a, b) => a - b)
    .map((v) => String(v).replace(".", ","));
  alt("decimais", "comparar", "q2", ordenados.join(" · "));

  const menorTempo = Math.min(12.4, 12.35);
  assert.equal(menorTempo, 12.35);
  alt("decimais", "comparar", "q3", "12,35 s");

  num("decimais", "comparar", "q4", 0.6 * 100);
});

teste("decimais · lição 5 — somar e subtrair", () => {
  num("decimais", "somar-subtrair", "q1", arred(2.5 + 1.75, 2));
  num("decimais", "somar-subtrair", "q2", arred(10 - 3.6, 2));
  num("decimais", "somar-subtrair", "q3", arred(8.5 + 4.79, 2));
  num("decimais", "somar-subtrair", "q4", arred(50 - 27.4, 2));
});

teste("decimais · lição 6 — multiplicar e dividir por 10, 100, 1000", () => {
  num("decimais", "por-dez", "q1", arred(0.45 * 10, 4));
  num("decimais", "por-dez", "q2", arred(87.5 / 100, 4));
  num("decimais", "por-dez", "q3", arred(3.5 / 1000, 6));

  // Quantas casas de 0,07 até 70? Cada casa é um fator 10.
  const fator = 70 / 0.07;
  assert.ok(Math.abs(fator - 1000) < 1e-9, `esperava fator 1000, deu ${fator}`);
  alt("decimais", "por-dez", "q4", "1000");
});

teste("decimais · lição 7 — multiplicar e dividir decimais", () => {
  num("decimais", "multiplicar-dividir", "q1", arred(1.2 * 0.5, 4));
  num("decimais", "multiplicar-dividir", "q2", arred(4.5 / 0.5, 4));
  num("decimais", "multiplicar-dividir", "q3", arred(12.5 * 3, 2));

  // 8 × 0,25 é menor que 8 porque 0,25 < 1
  assert.ok(8 * 0.25 < 8);
  alt("decimais", "multiplicar-dividir", "q4", "Menor que 8");
});

teste("decimais · lição 8 — arredondar", () => {
  num("decimais", "arredondar", "q1", arred(12.83, 1));
  num("decimais", "arredondar", "q2", arred(7.96, 0));

  // 3 itens de 19,80: o total real fica abaixo de 60
  const totalReal = 3 * 19.8;
  assert.ok(totalReal < 60 && totalReal > 55, `total real ${totalReal} fora do esperado`);
  alt("decimais", "arredondar", "q3", "Um pouco menos de R$ 60");

  // 3,4499 aos décimos: o decisor é o 4, então mantém
  assert.ok(3.4499 < 3.45, "3,4499 tem que estar abaixo do meio do intervalo");
  num("decimais", "arredondar", "q4", 3.4);
});

// ---------- Divisibilidade e primos ----------
//
// Tudo aqui é recalculado do zero, sem olhar para o JSON: divisores por
// tentativa, primalidade por divisão até a raiz, fatoração por divisões
// sucessivas. Se o conteúdo e estas funções discordarem, o teste quebra.

const divisores = (n) => {
  const d = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) d.push(i);
  return d;
};
const ehPrimo = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const fatores = (n) => {
  const f = [];
  let x = n;
  for (let p = 2; p * p <= x; p++) while (x % p === 0) { f.push(p); x /= p; }
  if (x > 1) f.push(x);
  return f;
};
const somaAlgarismos = (n) => String(n).split("").reduce((s, c) => s + +c, 0);

teste("divisibilidade · lição 1 — múltiplos e divisores", () => {
  const d18 = divisores(18);
  assert.deepEqual(d18, [1, 2, 3, 6, 9, 18]);
  alt("divisibilidade", "multiplos-divisores", "q1", "1, 2, 3, 6, 9 e 18");

  const candidatos = [63, 56, 68, 49];
  const naoMultiplos = candidatos.filter((n) => n % 7 !== 0);
  assert.equal(naoMultiplos.length, 1, "só um dos candidatos pode falhar no teste do 7");
  alt("divisibilidade", "multiplos-divisores", "q2", String(naoMultiplos[0]));

  // 36 é quadrado perfeito, então tem quantidade ímpar de divisores
  assert.equal(divisores(36).length % 2, 1);
  num("divisibilidade", "multiplos-divisores", "q3", divisores(36).length);

  // OBMEP 2018, questão 6: Sílvia faz 5/min e Renato 3/min, 60 cada um.
  const minutosSilvia = 60 / 5;
  assert.equal(minutosSilvia, 12);
  const feitosRenato = 3 * minutosSilvia;
  num("divisibilidade", "multiplos-divisores", "q4", 60 - feitosRenato);
});

teste("divisibilidade · lição 2 — critérios", () => {
  // divisível por 3 e não por 9
  const candidatos = [123, 234, 405, 918];
  const so3 = candidatos.filter((n) => n % 3 === 0 && n % 9 !== 0);
  assert.equal(so3.length, 1);
  // o critério da soma tem que concordar com a divisão de verdade
  for (const n of candidatos) {
    assert.equal(n % 3 === 0, somaAlgarismos(n) % 3 === 0, `critério do 3 falhou em ${n}`);
    assert.equal(n % 9 === 0, somaAlgarismos(n) % 9 === 0, `critério do 9 falhou em ${n}`);
  }
  alt("divisibilidade", "criterios", "q1", String(so3[0]));

  // qual algarismo faz 2■6 ser divisível por 9
  const digitos = [];
  for (let d = 0; d <= 9; d++) if ((200 + d * 10 + 6) % 9 === 0) digitos.push(d);
  assert.equal(digitos.length, 1, "deve haver um único algarismo possível");
  alt("divisibilidade", "criterios", "q2", String(digitos[0]));

  let quantos = 0;
  for (let n = 1; n <= 100; n++) if (n % 4 === 0) quantos += 1;
  num("divisibilidade", "criterios", "q3", quantos);

  // OBMEP 2018, questão 18: preços terminam em 99 centavos, total R$ 41,71.
  // Q produtos custam (inteiro de reais) - Q centavos. Procuramos, em
  // centavos, o Q tal que 41,71 + 0,01Q é inteiro e o mínimo cabe no valor.
  const totalCentavos = 4171;
  const possiveis = [];
  for (let q = 1; q * 99 <= totalCentavos; q++) {
    if ((totalCentavos + q) % 100 === 0) possiveis.push(q);
  }
  assert.equal(possiveis.length, 1, `esperava uma única quantidade possível, achei ${possiveis}`);
  num("divisibilidade", "criterios", "q4", possiveis[0]);
});

teste("divisibilidade · lição 3 — primos e compostos", () => {
  const candidatos = [51, 53, 57, 87];
  const primos = candidatos.filter(ehPrimo);
  assert.equal(primos.length, 1, "só um dos candidatos pode ser primo");
  alt("divisibilidade", "primos", "q1", String(primos[0]));

  // o 1 tem exatamente um divisor — é isso que o exclui
  assert.equal(divisores(1).length, 1);
  assert.equal(ehPrimo(1), false);

  let ate20 = 0;
  for (let n = 1; n <= 20; n++) if (ehPrimo(n)) ate20 += 1;
  num("divisibilidade", "primos", "q3", ate20);

  let maior = 0;
  for (let n = 2; n < 50; n++) if (ehPrimo(n)) maior = n;
  num("divisibilidade", "primos", "q4", maior);
  assert.equal(ehPrimo(49), false, "49 é 7×7, e é a armadilha da questão");
});

teste("divisibilidade · lição 4 — fatoração", () => {
  assert.deepEqual(fatores(84), [2, 2, 3, 7]);
  alt("divisibilidade", "fatoracao", "q1", fatores(84).join(" × "));

  const doisEm200 = fatores(200).filter((p) => p === 2).length;
  num("divisibilidade", "fatoracao", "q2", doisEm200);

  const candidatos = [45, 54, 56, 63];
  const semTres = candidatos.filter((n) => !fatores(n).includes(3));
  assert.equal(semTres.length, 1);
  alt("divisibilidade", "fatoracao", "q3", String(semTres[0]));

  // contagem de divisores pelos expoentes, conferida contra a lista real
  const expoentes = {};
  for (const p of fatores(60)) expoentes[p] = (expoentes[p] || 0) + 1;
  const porExpoente = Object.values(expoentes).reduce((a, e) => a * (e + 1), 1);
  assert.equal(porExpoente, divisores(60).length, "a regra dos expoentes discorda da lista");
  num("divisibilidade", "fatoracao", "q4", porExpoente);
});

teste("divisibilidade · lição 5 — MDC", () => {
  num("divisibilidade", "mdc", "q1", mdc(12, 18));
  num("divisibilidade", "mdc", "q2", mdc(30, 45));

  const pares = [[8, 15], [6, 9], [10, 15], [12, 18]];
  const coprimos = pares.filter(([a, b]) => mdc(a, b) === 1);
  assert.equal(coprimos.length, 1, "só um par pode ser primo entre si");
  alt("divisibilidade", "mdc", "q3", `${coprimos[0][0]} e ${coprimos[0][1]}`);

  const g = mdc(72, 120);
  num("divisibilidade", "mdc", "q4", g);
  // dividir pelo MDC tem que deixar a fração irredutível
  assert.equal(mdc(72 / g, 120 / g), 1);
  assert.deepEqual([72 / g, 120 / g], [3, 5]);
});

teste("divisibilidade · lição 6 — MMC (com OBMEP)", () => {
  num("divisibilidade", "mmc", "q1", mmc(4, 6));
  num("divisibilidade", "mmc", "q2", mmc(12, 18));

  // menor denominador comum para 5/6 + 3/8
  const denom = mmc(6, 8);
  assert.equal(denom % 6, 0);
  assert.equal(denom % 8, 0);
  alt("divisibilidade", "mmc", "q3", String(denom));

  // OBMEP 2018, questão 15: cinco promoções "pague P e leve L".
  // Comparação justa: quantos rolos saem de graça numa quantidade que
  // serve para todas — o MMC dos tamanhos de pacote.
  const promocoes = [
    { nome: "Promoção 1", paga: 5, leva: 6 },
    { nome: "Promoção 2", paga: 11, leva: 12 },
    { nome: "Promoção 3", paga: 14, leva: 18 },
    { nome: "Promoção 4", paga: 21, leva: 24 },
    { nome: "Promoção 5", paga: 31, leva: 36 },
  ];
  const base = promocoes.map((p) => p.leva).reduce(mmc);
  assert.equal(base, 72, `o MMC dos pacotes deveria ser 72, deu ${base}`);
  const gratis = promocoes.map((p) => ({ ...p, gratis: (base / p.leva) * (p.leva - p.paga) }));
  assert.deepEqual(gratis.map((g) => g.gratis), [12, 6, 16, 9, 10]);
  const melhor = gratis.reduce((a, b) => (b.gratis > a.gratis ? b : a));
  const empate = gratis.filter((g) => g.gratis === melhor.gratis);
  assert.equal(empate.length, 1, "a promoção mais vantajosa tem que ser única");
  alt("divisibilidade", "mmc", "q4", melhor.nome);
});

// ---------- Potências e raiz quadrada ----------
//
// As potências são recalculadas por multiplicação repetida, e não com o
// operador **, para o teste não repetir o mesmo atalho que o conteúdo usa.
// As raízes são achadas por busca, sem Math.sqrt.

const potencia = (base, expoente) => {
  let r = 1;
  for (let i = 0; i < expoente; i++) r *= base;
  return r;
};
const raizExata = (n) => {
  for (let k = 1; k <= n; k++) {
    const q = potencia(k, 2);
    if (q === n) return k;
    if (q > n) return null;
  }
  return null;
};
/** [piso, teto] dos inteiros que cercam a raiz de n. */
const cerco = (n) => {
  let k = 1;
  while (potencia(k + 1, 2) <= n) k += 1;
  return [k, k + 1];
};

teste("potências · lição 1 — o que é uma potência", () => {
  // o erro central da lição: 2⁵ e 5² não são a mesma coisa
  assert.equal(potencia(2, 5), 32);
  assert.equal(potencia(5, 2), 25);
  assert.notEqual(potencia(2, 5), potencia(5, 2));

  alt("potencias", "o-que-e-potencia", "q1", String(potencia(3, 4)));
  num("potencias", "o-que-e-potencia", "q2", potencia(2, 6));

  const opcoes = [
    ["2⁴", potencia(2, 4)],
    ["2 × 4", 2 * 4],
    ["4⁴", potencia(4, 4)],
    ["8²", potencia(8, 2)],
  ];
  const valem16 = opcoes.filter(([, v]) => v === 16);
  assert.equal(valem16.length, 1, "só uma alternativa pode valer 16");
  alt("potencias", "o-que-e-potencia", "q3", valem16[0][0]);

  // cada dobra multiplica por 2 o número de partes
  let partes = 1;
  for (let i = 0; i < 7; i++) partes *= 2;
  assert.equal(partes, potencia(2, 7));
  num("potencias", "o-que-e-potencia", "q4", partes);
});

teste("potências · lição 2 — quadrado e cubo", () => {
  const candidatos = [36, 30, 40, 45];
  const perfeitos = candidatos.filter((n) => raizExata(n) !== null);
  assert.equal(perfeitos.length, 1, "só um candidato pode ser quadrado perfeito");
  alt("potencias", "quadrado-cubo", "q1", String(perfeitos[0]));

  // área do quadrado contada quadradinho a quadradinho
  let area = 0;
  for (let l = 0; l < 9; l++) for (let c = 0; c < 9; c++) area += 1;
  assert.equal(area, potencia(9, 2));
  num("potencias", "quadrado-cubo", "q2", area);

  alt("potencias", "quadrado-cubo", "q3", String(potencia(4, 3)));

  // cubinhos contados camada por camada
  let cubinhos = 0;
  for (let k = 0; k < 3; k++) cubinhos += potencia(3, 2);
  assert.equal(cubinhos, potencia(3, 3));
  num("potencias", "quadrado-cubo", "q4", cubinhos);
});

teste("potências · lição 3 — potências de 10", () => {
  // a regra dos zeros tem que bater com a multiplicação de verdade
  for (let e = 1; e <= 8; e++) {
    assert.equal(String(potencia(10, e)).length - 1, e, `10^${e} não tem ${e} zeros`);
  }
  num("potencias", "potencias-de-10", "q1", potencia(10, 5));
  alt("potencias", "potencias-de-10", "q2", String(7 * potencia(10, 3)));

  const zeros = String(potencia(10, 8)).split("").filter((c) => c === "0").length;
  num("potencias", "potencias-de-10", "q3", zeros);

  num("potencias", "potencias-de-10", "q4", 4 * potencia(10, 5));
});

teste("potências · lição 4 — ordem das operações", () => {
  num("potencias", "ordem-operacoes", "q1", 2 + 3 * potencia(4, 2));

  const certo = 4 + 2 * potencia(3, 2);
  // os distratores têm que ser exatamente os caminhos errados plausíveis
  assert.equal(certo, 22);
  assert.equal(4 + potencia(2 * 3, 2), 40, "multiplicar antes de elevar dá 40");
  assert.equal(potencia(4 + 2 * 3, 2), 100, "deixar o quadrado por último dá 100");
  assert.equal(potencia((4 + 2) * 3, 2), 324, "tudo da esquerda para a direita dá 324");
  alt("potencias", "ordem-operacoes", "q2", String(certo));

  num("potencias", "ordem-operacoes", "q3", potencia(5, 2) - potencia(3, 2));
  assert.notEqual(potencia(5, 2) - potencia(3, 2), potencia(5 - 3, 2));

  num("potencias", "ordem-operacoes", "q4", 100 - 2 * potencia(3, 3));
});

teste("potências · lição 5 — raiz quadrada exata", () => {
  num("potencias", "raiz-quadrada", "q1", raizExata(81));
  alt("potencias", "raiz-quadrada", "q2", String(raizExata(64)));
  num("potencias", "raiz-quadrada", "q3", raizExata(121));
  num("potencias", "raiz-quadrada", "q4", raizExata(225));

  // o método dos pares de fatores primos tem que dar o mesmo que a busca
  for (const n of [144, 81, 64, 121, 225, 196, 100]) {
    const f = [];
    let x = n;
    for (let p = 2; p * p <= x; p++) while (x % p === 0) { f.push(p); x /= p; }
    if (x > 1) f.push(x);
    let porPares = 1;
    for (let i = 0; i < f.length; i += 2) {
      assert.equal(f[i], f[i + 1], `${n} não é quadrado perfeito: sobrou o fator ${f[i]}`);
      porPares *= f[i];
    }
    assert.equal(porPares, raizExata(n), `os pares de fatores discordam da raiz de ${n}`);
  }
});

teste("potências · lição 6 — estimar uma raiz", () => {
  const [baixo30, cima30] = cerco(30);
  assert.deepEqual([baixo30, cima30], [5, 6]);
  alt("potencias", "estimar-raiz", "q1", `Entre ${baixo30} e ${cima30}`);

  let maior = 1;
  while (potencia(maior + 1, 2) < 200) maior += 1;
  assert.equal(potencia(maior, 2), 196);
  assert.ok(potencia(maior + 1, 2) >= 200);
  num("potencias", "estimar-raiz", "q2", maior);

  // 70 está mais perto de 64 (8²) do que de 81 (9²)
  const [b, c] = cerco(70);
  const perto = 70 - potencia(b, 2) <= potencia(c, 2) - 70 ? b : c;
  assert.equal(perto, 8);
  alt("potencias", "estimar-raiz", "q3", String(perto));

  // lado de um quadrado de área 150: entre 12 e 13, mais perto de 12
  const [b150, c150] = cerco(150);
  assert.deepEqual([b150, c150], [12, 13]);
  const melhor = 150 - potencia(b150, 2) <= potencia(c150, 2) - 150 ? b150 : c150;
  alt("potencias", "estimar-raiz", "q4", `${melhor} cm`);
});

// ---------- Porcentagem ----------
//
// A taxa é sempre aplicada pela definição — parte sobre cem — e nunca pelo
// mesmo atalho que o conteúdo ensina, para o teste não repetir um eventual
// erro de raciocínio da lição.

/** p% de valor, pela definição: valor dividido em 100 partes, p delas. */
const pct = (p, valor) => (valor / 100) * p;
/** que porcentagem "parte" representa de "total". */
const taxa = (parte, total) => (parte / total) * 100;

teste("porcentagem · lição 1 — o que é porcentagem", () => {
  // grade de 100 quadradinhos: cada um vale 1%
  const preenchidos = 25;
  alt("porcentagem", "o-que-e-porcentagem", "q1", `${taxa(preenchidos, 100)}%`);

  // 60% escrito como fração de denominador 100
  alt("porcentagem", "o-que-e-porcentagem", "q2", fr(60, 100));

  num("porcentagem", "o-que-e-porcentagem", "q3", taxa(100, 200));
  assert.equal(taxa(100, 200), 50);

  // 40% contra 1/3
  const a = 40 / 100, b = 1 / 3;
  assert.ok(a > b, "40% deveria ser maior que 1/3");
  alt("porcentagem", "o-que-e-porcentagem", "q4", "40%");
});

teste("porcentagem · lição 2 — converter entre as três escritas", () => {
  alt("porcentagem", "converter", "q1", `${arred(0.35 * 100, 10)}%`);
  num("porcentagem", "converter", "q2", taxa(1, 4));
  // 7% em decimal
  const dec = 7 / 100;
  assert.equal(dec, 0.07);
  alt("porcentagem", "converter", "q3", "0,07");
  num("porcentagem", "converter", "q4", taxa(2, 5));

  // a tabela de conversões da lição tem que fechar nos três formatos
  for (const [n, d, p] of [[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [1, 10, 10]]) {
    assert.equal(arred(taxa(n, d), 6), p, `${n}/${d} deveria ser ${p}%`);
  }
});

teste("porcentagem · lição 3 — calcular a porcentagem de um valor (com OBMEP)", () => {
  num("porcentagem", "calcular", "q1", pct(20, 350));
  num("porcentagem", "calcular", "q2", pct(8, 50));
  alt("porcentagem", "calcular", "q3", String(pct(30, 90)));

  // OBMEP BQ 2010, problema 64: 0,15% de 14 milhões contraiu a gripe.
  const populacao = 14_000_000;
  const doentes = pct(0.15, populacao);
  assert.equal(doentes, 21000, `esperava 21 000 doentes, deu ${doentes}`);
  const sadios = populacao - doentes;
  assert.equal(sadios, 13_979_000);
  // a alternativa traz o número com separador de milhar em espaço fino
  const q = achar("porcentagem", "calcular", "q4");
  const marcada = Number(q.alternativas[q.correta].texto.replace(/\s/g, ""));
  assert.equal(marcada, sadios, `JSON marca ${marcada}, a conta dá ${sadios}`);
});

teste("porcentagem · lição 4 — porcentagens de cabeça (com OBMEP)", () => {
  num("porcentagem", "mentalmente", "q1", pct(10, 450));
  num("porcentagem", "mentalmente", "q2", pct(25, 80));
  num("porcentagem", "mentalmente", "q3", pct(15, 200));

  // os atalhos ensinados na lição têm que dar o mesmo que a definição
  const total = 60;
  assert.equal(total / 10, pct(10, total), "atalho dos 10% não bate");
  assert.equal(total / 2, pct(50, total), "atalho dos 50% não bate");
  assert.equal(total / 2 / 2, pct(25, total), "atalho dos 25% não bate");
  assert.equal(total / 10 / 2, pct(5, total), "atalho dos 5% não bate");
  assert.equal(pct(30, total) + pct(5, total), pct(35, total), "35% = 30% + 5% não fecha");

  // OBMEP BQ 2010, problema 177: 22 alunos + 18 alunas, 60% participaram.
  const alunos = 22, alunas = 18;
  const turma = alunos + alunas;
  const participaram = pct(60, turma);
  assert.equal(participaram, 24);
  // o mínimo de alunas acontece quando o máximo de alunos participa
  const minAlunas = participaram - Math.min(alunos, participaram);
  assert.equal(minAlunas, 2);
  assert.ok(minAlunas <= alunas, "o mínimo não pode passar do total de alunas");
  num("porcentagem", "mentalmente", "q4", minAlunas);
});

teste("porcentagem · lição 5 — desconto e aumento (com OBMEP)", () => {
  // desconto de 15% sobre 200: os dois caminhos precisam coincidir
  const doisPassos = 200 - pct(15, 200);
  const umPasso = pct(100 - 15, 200);
  assert.equal(doisPassos, umPasso);
  num("porcentagem", "desconto-aumento", "q1", umPasso);

  const salario = 1500 + pct(8, 1500);
  assert.equal(salario, pct(108, 1500));
  num("porcentagem", "desconto-aumento", "q2", salario);

  // subir 20% e cair 20% NÃO devolve o preço original
  const inicial = 50;
  const subiu = inicial + pct(20, inicial);
  assert.equal(subiu, 60);
  const caiu = subiu - pct(20, subiu);
  assert.equal(caiu, 48);
  assert.notEqual(caiu, inicial, "o preço não pode voltar ao original");
  alt("porcentagem", "desconto-aumento", "q3", "R$ 48,00");

  // OBMEP BQ 2010, problema 7: 30% de desconto sobre R$ 120,00
  const paga = 120 - pct(30, 120);
  assert.equal(paga, 84);
  assert.equal(paga, pct(70, 120), "os dois caminhos da solução oficial têm que bater");
  alt("porcentagem", "desconto-aumento", "q4", String(paga));
});

teste("porcentagem · lição 6 — da parte para o total (com OBMEP)", () => {
  // se p% de N é X, então N = X / p * 100
  const total = (parte, p) => (parte / p) * 100;
  assert.equal(total(45, 30), 150);
  assert.equal(pct(30, 150), 45, "a volta tem que reproduzir a parte");

  num("porcentagem", "parte-e-total", "q1", total(12, 25));
  num("porcentagem", "parte-e-total", "q2", taxa(15, 60));
  num("porcentagem", "parte-e-total", "q3", total(18, 60));
  assert.equal(pct(60, 30), 18, "60% de 30 tem que dar os 18 do enunciado");

  // OBMEP BQ 2010, problema 39: o suco do Diamantino.
  const agua = 3, refresco = 1;
  const suco = pct(20, refresco);
  assert.equal(arred(suco, 6), 0.2);
  const volumeFinal = agua + refresco;
  assert.equal(volumeFinal, 4);
  const porcentagemSuco = arred(taxa(suco, volumeFinal), 6);
  assert.equal(porcentagemSuco, 5, `esperava 5%, deu ${porcentagemSuco}%`);
  // a água do refresco já está contada no litro dele — checagem do enunciado
  const aguaTotal = agua + pct(80, refresco);
  assert.equal(arred(aguaTotal + suco, 6), volumeFinal, "suco mais água precisa fechar o volume");
  alt("porcentagem", "parte-e-total", "q4", `${porcentagemSuco}%`);
});

// ---------- Ângulos ----------
//
// Aqui a conferência tem dois níveis. O primeiro recalcula as respostas.
// O segundo, mais interessante, mede os ângulos DESENHADOS a partir do SVG
// gerado, com trigonometria: se a figura discordar do enunciado, quebra.

const VOLTA = 360;
const complemento = (a) => 90 - a;
const suplemento = (a) => 180 - a;
const classificar = (a) => {
  if (a <= 0) return "nulo";
  if (a < 90) return "Agudo";
  if (a === 90) return "Reto";
  if (a < 180) return "Obtuso";
  if (a === 180) return "Raso";
  return "maior que raso";
};

teste("ângulos · lição 1 — ângulo é abertura", () => {
  // o giro do ponteiro dos minutos é fração da volta
  const grausPorMinuto = VOLTA / 60;
  assert.equal(grausPorMinuto, 6);
  assert.equal(grausPorMinuto * 15, 90, "15 minutos deveriam dar um quarto de volta");

  alt("angulos", "o-que-e-angulo", "q1", "O da esquerda");
  num("angulos", "o-que-e-angulo", "q2", VOLTA / 2);
  num("angulos", "o-que-e-angulo", "q3", grausPorMinuto * 20);
  alt("angulos", "o-que-e-angulo", "q4", "Não muda nada: continua a mesma medida");
});

teste("ângulos · lição 2 — classificação", () => {
  alt("angulos", "classificar", "q1", classificar(130));

  const candidatos = [75, 90, 110, 180];
  const agudos = candidatos.filter((a) => classificar(a) === "Agudo");
  assert.equal(agudos.length, 1, "só um candidato pode ser agudo");
  alt("angulos", "classificar", "q2", `${agudos[0]}°`);

  num("angulos", "classificar", "q3", VOLTA / 90);
  // 89 é agudo, e a fronteira pertence ao reto
  assert.equal(classificar(89), "Agudo");
  assert.equal(classificar(90), "Reto");
  alt("angulos", "classificar", "q4", classificar(89));
});

teste("ângulos · lição 3 — transferidor", () => {
  // as duas escalas do transferidor somam sempre 180
  for (const g of [45, 110, 120, 145]) {
    assert.equal(g + suplemento(g), 180, `as escalas não fecham em ${g}`);
  }
  alt("angulos", "transferidor", "q1", "145°");
  alt("angulos", "transferidor", "q2", "45°");
  num("angulos", "transferidor", "q3", 110);

  // a classificação decide entre as duas leituras possíveis
  const leituras = [60, 120];
  const obtusa = leituras.filter((a) => classificar(a) === "Obtuso");
  assert.equal(obtusa.length, 1, "só uma das duas leituras pode ser obtusa");
  num("angulos", "transferidor", "q4", obtusa[0]);
});

teste("ângulos · lição 4 — complementares e suplementares", () => {
  num("angulos", "complementar-suplementar", "q1", complemento(20));
  num("angulos", "complementar-suplementar", "q2", suplemento(115));
  num("angulos", "complementar-suplementar", "q3", suplemento(40));

  // complementares em que um é o dobro do outro: 1 + 2 = 3 partes de 90
  const parte = 90 / 3;
  assert.equal(parte + 2 * parte, 90, "as partes não fecham o ângulo reto");
  assert.equal(2 * parte, 60, "o maior deveria ser o dobro do menor");
  num("angulos", "complementar-suplementar", "q4", parte);
});

teste("ângulos · lição 5 — opostos pelo vértice", () => {
  /** Os quatro ângulos de um cruzamento, a partir de um deles. */
  const quatro = (a) => [a, suplemento(a), a, suplemento(a)];

  const q40 = quatro(40);
  assert.equal(q40.reduce((s, x) => s + x, 0), VOLTA, "os quatro têm que fechar a volta");
  num("angulos", "opostos-pelo-vertice", "q1", q40[2]);

  const q55 = quatro(55);
  num("angulos", "opostos-pelo-vertice", "q2", q55[1]);

  const q90 = quatro(90);
  assert.ok(q90.every((x) => x === 90), "com 90° os quatro deveriam ser iguais");
  alt("angulos", "opostos-pelo-vertice", "q3", "Todos medem 90°");

  const q35 = quatro(35);
  num("angulos", "opostos-pelo-vertice", "q4", VOLTA - 35);
  assert.equal(q35[1] + q35[2] + q35[3], VOLTA - 35, "a soma dos outros três não bate");
});

teste("ângulos · lição 6 — soma dos ângulos do triângulo", () => {
  const terceiro = (a, b) => 180 - a - b;
  assert.equal(terceiro(50, 60), 70);

  num("angulos", "soma-triangulo", "q1", terceiro(40, 75));
  num("angulos", "soma-triangulo", "q2", terceiro(90, 35));
  // no triângulo retângulo os dois agudos são complementares
  assert.equal(terceiro(90, 35), complemento(35), "o atalho do retângulo não bate");

  alt("angulos", "soma-triangulo", "q3", `${180 / 3}°`);
  // dois ângulos retos não deixam sobra para o terceiro
  assert.equal(terceiro(90, 90), 0);
  alt("angulos", "soma-triangulo", "q4", "Não, porque os dois já somariam 180° e não sobraria nada para o terceiro");
});

teste("ângulos · as figuras desenhadas medem o que o enunciado diz", () => {
  // Mede, no SVG gerado, o ângulo entre as duas semirretas. Se o desenho
  // discordar do enunciado, o aluno vê uma coisa e lê outra.
  const medirAngulo = (svg) => {
    const linhas = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
      .map((m) => m.slice(1).map(Number));
    assert.ok(linhas.length >= 2, "esperava pelo menos duas semirretas no desenho");
    const [vx, vy, ax, ay] = linhas[0];
    const [, , bx, by] = linhas[1];
    const bruto = (Math.atan2(vy - by, bx - vx) - Math.atan2(vy - ay, ax - vx)) * 180 / Math.PI;
    return (bruto + 360) % 360;
  };

  for (const g of [40, 55, 90, 130, 180]) {
    const medido = medirAngulo(desenhos.angulo({ graus: g, medida: false }));
    assert.ok(Math.abs(medido - g) < 0.02, `angulo(${g}) desenhou ${medido.toFixed(2)}°`);
  }

  // o relógio: às 3 em ponto os ponteiros formam um quarto de volta
  const svgRelogio = desenhos.relogio({ hora: 3, minuto: 0 });
  const ponteiros = [...svgRelogio.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#f7f5f0"/g)]
    .map((m) => m.slice(1).map(Number));
  assert.equal(ponteiros.length, 2, "esperava os dois ponteiros destacados");
  const [cx, cy, mx, my] = ponteiros[0];
  const [, , hx, hy] = ponteiros[1];
  const entre = Math.abs((Math.atan2(cy - my, mx - cx) - Math.atan2(cy - hy, hx - cx)) * 180 / Math.PI);
  assert.ok(Math.abs(entre - 90) < 0.5, `às 3h os ponteiros formaram ${entre.toFixed(2)}°`);
});

// ---------- Figuras planas ----------

/** Soma dos ângulos internos de um polígono de n lados. */
const somaInterna = (n) => (n - 2) * 180;
/** Três medidas fecham triângulo? (desigualdade triangular) */
const fechaTriangulo = ([a, b, c]) => a + b > c && a + c > b && b + c > a;
const porLados = (m) => {
  const distintos = new Set(m).size;
  return distintos === 1 ? "Equilátero" : distintos === 2 ? "Isósceles" : "Escaleno";
};
const porAngulos = (m) => {
  const maior = Math.max(...m);
  return maior < 90 ? "Acutângulo" : maior === 90 ? "Retângulo" : "Obtusângulo";
};

teste("figuras planas · lição 1 — polígonos", () => {
  // num polígono fechado, lados, vértices e ângulos são o mesmo número
  for (const n of [3, 4, 5, 7, 8]) {
    const pts = desenhos.figuraPlana({ lados: n }).match(/points="([^"]+)"/)[1].split(" ");
    assert.equal(pts.length, n, `o desenho de ${n} lados saiu com ${pts.length} vértices`);
  }
  alt("figuras-planas", "poligonos", "q1", "Um triângulo");
  num("figuras-planas", "poligonos", "q2", 8);
  alt("figuras-planas", "poligonos", "q3", "Pentágono");
  num("figuras-planas", "poligonos", "q4", 7);
});

teste("figuras planas · lição 2 — triângulos pelos lados", () => {
  assert.equal(porLados([5, 5, 5]), "Equilátero");
  assert.equal(porLados([7, 7, 4]), "Isósceles");
  assert.equal(porLados([3, 4, 6]), "Escaleno");

  alt("figuras-planas", "triangulos-lados", "q1", porLados([6, 6, 10]));
  alt("figuras-planas", "triangulos-lados", "q2", porLados([4, 7, 9]));
  num("figuras-planas", "triangulos-lados", "q3", 3);

  // 3, 4 e 9 não fecham; os trios usados nas outras questões fecham
  assert.equal(fechaTriangulo([3, 4, 9]), false, "3-4-9 não deveria fechar");
  assert.equal(3 + 4 < 9, true);
  for (const t of [[5, 5, 5], [7, 7, 4], [3, 4, 6], [6, 6, 10], [4, 7, 9]]) {
    assert.ok(fechaTriangulo(t), `${t.join("-")} deveria fechar`);
  }
  alt("figuras-planas", "triangulos-lados", "q4", "Não, porque 3 + 4 é menor que 9");
});

teste("figuras planas · lição 3 — triângulos pelos ângulos", () => {
  for (const t of [[60, 60, 60], [90, 45, 45], [100, 50, 30], [30, 60, 90], [20, 40, 120]]) {
    assert.equal(t.reduce((s, x) => s + x, 0), 180, `${t.join("-")} não soma 180`);
  }
  assert.equal(porAngulos([60, 60, 60]), "Acutângulo");
  assert.equal(porAngulos([90, 45, 45]), "Retângulo");
  assert.equal(porAngulos([100, 50, 30]), "Obtusângulo");

  alt("figuras-planas", "triangulos-angulos", "q1", porAngulos([30, 60, 90]));
  alt("figuras-planas", "triangulos-angulos", "q2", porAngulos([20, 40, 120]));

  // maior ângulo inteiro num acutângulo, conferido por busca
  let maiorAgudo = 0;
  for (let a = 1; a < 180; a++) {
    if (a >= 90) continue;
    // precisa sobrar espaço para dois outros ângulos, ambos agudos
    const resto = 180 - a;
    if (resto / 2 < 90 && resto - 1 < 90 * 2) maiorAgudo = a;
  }
  assert.equal(maiorAgudo, 89);
  num("figuras-planas", "triangulos-angulos", "q3", maiorAgudo);

  // equilátero é sempre acutângulo
  assert.equal(porAngulos([60, 60, 60]), "Acutângulo");
  alt("figuras-planas", "triangulos-angulos", "q4", "Não, porque no equilátero os três ângulos medem 60°");
});

teste("figuras planas · lição 4 — quadriláteros", () => {
  assert.equal(somaInterna(4), 360);
  const quarto = (a, b, c) => somaInterna(4) - a - b - c;
  assert.equal(quarto(100, 80, 70), 110);
  num("figuras-planas", "quadrilateros", "q1", quarto(90, 90, 120));

  alt("figuras-planas", "quadrilateros", "q2", "O quadrado");
  alt("figuras-planas", "quadrilateros", "q3", "Paralelogramo");

  // paralelogramo: opostos iguais, então 2a + 2b = 360 e vizinhos somam 180
  const vizinho = (a) => (360 - 2 * a) / 2;
  assert.equal(vizinho(70), 110);
  assert.equal(70 + vizinho(70), 180, "vizinhos num paralelogramo têm que somar 180");
  num("figuras-planas", "quadrilateros", "q4", vizinho(70));
});

teste("figuras planas · lição 5 — polígonos regulares", () => {
  // a fórmula (n-2)*180 tem que reproduzir os casos já conhecidos
  assert.equal(somaInterna(3), 180, "triângulo");
  assert.equal(somaInterna(4), 360, "quadrilátero");
  assert.equal(somaInterna(5), 540);
  assert.equal(540 / 5, 108, "cada ângulo do pentágono regular");

  num("figuras-planas", "regulares", "q1", somaInterna(6));
  num("figuras-planas", "regulares", "q2", somaInterna(6) / 6);
  alt("figuras-planas", "regulares", "q3", "Todos os lados iguais e todos os ângulos iguais");
  num("figuras-planas", "regulares", "q4", 8 - 2);
  assert.equal((8 - 2) * 180, somaInterna(8), "os triângulos do octógono não batem com a soma");

  // três hexágonos regulares fecham a volta em torno de um ponto
  assert.equal(3 * (somaInterna(6) / 6), 360);
});

teste("figuras planas · lição 6 — circunferência e círculo", () => {
  const diametro = (r) => 2 * r;
  const raio = (d) => d / 2;
  assert.equal(raio(14), 7);
  assert.equal(diametro(raio(14)), 14, "ida e volta têm que fechar");

  num("figuras-planas", "circulo", "q1", diametro(9));
  num("figuras-planas", "circulo", "q2", raio(30));
  alt("figuras-planas", "circulo", "q3", "A circunferência é a linha; o círculo é a linha mais a região de dentro");
  num("figuras-planas", "circulo", "q4", raio(60));
});

teste("figuras planas · as formas desenhadas concordam com o nome delas", () => {
  const lados = (svg) => {
    const pts = svg.match(/points="([^"]+)"/)[1].split(" ").map((p) => p.split(",").map(Number));
    return pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
  };
  const angulos = (svg) => {
    const pts = svg.match(/points="([^"]+)"/)[1].split(" ").map((p) => p.split(",").map(Number));
    return pts.map((p, i) => {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
      const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]];
      const c = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2));
      return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    });
  };
  const distintos = (xs) => new Set(xs.map((x) => x.toFixed(0))).size;

  // um "isósceles" com três lados quase iguais parece equilátero; um
  // "escaleno" com dois lados quase iguais parece isósceles.
  assert.equal(distintos(lados(desenhos.figuraPlana({ tipo: "triangulo-equilatero" }))), 1);
  assert.equal(distintos(lados(desenhos.figuraPlana({ tipo: "triangulo-isosceles" }))), 2);
  assert.equal(distintos(lados(desenhos.figuraPlana({ tipo: "triangulo-escaleno" }))), 3);

  // o obtusângulo tem que ter mesmo um ângulo acima de 90°
  const obt = angulos(desenhos.figuraPlana({ tipo: "triangulo-obtusangulo" }));
  assert.ok(Math.max(...obt) > 100, `o maior ângulo saiu ${Math.max(...obt).toFixed(0)}°`);
  assert.ok(Math.abs(obt.reduce((s, x) => s + x, 0) - 180) < 0.5);

  // o retângulo desenhado precisa ter um ângulo reto de verdade
  const ret = angulos(desenhos.figuraPlana({ tipo: "triangulo-retangulo" }));
  assert.ok(ret.some((a) => Math.abs(a - 90) < 0.5), "nenhum ângulo reto no triângulo retângulo");

  // polígono regular: lados iguais e soma dos ângulos batendo com a fórmula
  for (const n of [3, 5, 6, 8]) {
    const svg = desenhos.figuraPlana({ lados: n });
    assert.equal(distintos(lados(svg)), 1, `o polígono de ${n} lados saiu irregular`);
    const soma = angulos(svg).reduce((s, x) => s + x, 0);
    assert.ok(Math.abs(soma - somaInterna(n)) < 1, `soma dos ângulos de ${n} lados: ${soma.toFixed(0)}`);
  }
});

// ---------- Perímetro ----------
//
// O perímetro é sempre recalculado como SOMA dos lados, mesmo quando o
// conteúdo ensina um atalho. Assim o teste confere o atalho em vez de repetir
// a mesma conta que a lição usou.

const somaLados = (lados) => lados.reduce((s, x) => s + x, 0);
/** Perímetro de um contorno descrito por passos [dx, dy]. */
const perimetroContorno = (movimentos) => somaLados(movimentos.map(([dx, dy]) => Math.abs(dx) + Math.abs(dy)));
/** Área de um polígono pelos vértices (fórmula do laço). */
const areaPolígono = (pts) => {
  let dobro = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    dobro += x1 * y2 - x2 * y1;
  }
  return Math.abs(dobro) / 2;
};
const verticesDe = (movimentos) => {
  const pts = [[0, 0]];
  for (const [dx, dy] of movimentos) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + dx, y + dy]);
  }
  pts.pop();
  return pts;
};

teste("perímetro · lição 1 — soma dos lados", () => {
  num("perimetro", "o-que-e-perimetro", "q1", somaLados([3, 4, 5, 6]));
  num("perimetro", "o-que-e-perimetro", "q2", somaLados([7, 7, 7]));
  alt("perimetro", "o-que-e-perimetro", "q3", "Centímetros (cm)");
  num("perimetro", "o-que-e-perimetro", "q4", somaLados([4, 4, 6, 6, 5]));
  assert.equal(somaLados([5, 7, 9]), 21, "o exemplo resolvido não fecha");
});

teste("perímetro · lição 2 — polígonos regulares", () => {
  // o atalho n × lado tem que dar o mesmo que somar n parcelas
  const porSoma = (n, lado) => somaLados(Array.from({ length: n }, () => lado));
  assert.equal(porSoma(5, 8), 5 * 8);
  assert.equal(porSoma(6, 6), 36);

  num("perimetro", "regulares", "q1", porSoma(6, 6));
  num("perimetro", "regulares", "q2", porSoma(4, 15));
  // caminho de volta: perímetro dividido pelo número de lados
  num("perimetro", "regulares", "q3", 72 / 8);
  assert.equal(porSoma(8, 72 / 8), 72, "a volta não reconstrói o perímetro");
  num("perimetro", "regulares", "q4", 45 / 3);
  assert.equal(porSoma(3, 45 / 3), 45);
});

teste("perímetro · lição 3 — retângulo", () => {
  // a fórmula 2(b+h) conferida contra a soma dos quatro lados
  const porFormula = (b, h) => 2 * (b + h);
  const porLados = (b, h) => somaLados([b, h, b, h]);
  for (const [b, h] of [[12, 5], [8, 3], [9, 9], [25, 15]]) {
    assert.equal(porFormula(b, h), porLados(b, h), `${b}×${h}: fórmula e soma discordam`);
  }
  num("perimetro", "retangulo", "q1", porFormula(8, 3));
  num("perimetro", "retangulo", "q2", porFormula(9, 9));
  // altura a partir do perímetro
  const altura = (p, b) => p / 2 - b;
  assert.equal(altura(30, 10), 5);
  assert.equal(porFormula(10, altura(30, 10)), 30, "a volta não reconstrói o perímetro");
  num("perimetro", "retangulo", "q3", altura(30, 10));
  num("perimetro", "retangulo", "q4", porFormula(25, 15));
});

teste("perímetro · lição 4 — figuras compostas", () => {
  const L26 = [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]];
  const L20 = [[5, 0], [0, 2], [-2, 0], [0, 3], [-3, 0], [0, -5]];
  const L16 = [[4, 0], [0, 2], [-2, 0], [0, 2], [-2, 0], [0, -4]];

  // todo contorno tem que fechar: os deslocamentos se anulam
  for (const L of [L26, L20, L16]) {
    assert.equal(somaLados(L.map((m) => m[0])), 0, "o contorno não fecha na horizontal");
    assert.equal(somaLados(L.map((m) => m[1])), 0, "o contorno não fecha na vertical");
  }

  num("perimetro", "compostas", "q1", perimetroContorno(L26));
  assert.equal(perimetroContorno(L26), 26);
  // medida que falta: os dois trechos de cima somam o lado de baixo
  num("perimetro", "compostas", "q2", 6 - 2);
  num("perimetro", "compostas", "q3", perimetroContorno(L20));

  // a figura em L tem o mesmo perímetro do retângulo que a envolve
  const vs = verticesDe(L16);
  const largura = Math.max(...vs.map((p) => p[0])) - Math.min(...vs.map((p) => p[0]));
  const altura = Math.max(...vs.map((p) => p[1])) - Math.min(...vs.map((p) => p[1]));
  assert.equal(perimetroContorno(L16), 2 * (largura + altura), "o L e o retângulo deveriam ter o mesmo perímetro");
  assert.equal(perimetroContorno(L16), 16);
  // mas a área é menor: o canto recortado sai
  assert.equal(areaPolígono(vs), 12);
  assert.equal(largura * altura, 16);
  alt("perimetro", "compostas", "q4", "Sim, os dois medem 16 cm");
});

teste("perímetro · lição 5 — mesmo perímetro, tamanhos diferentes", () => {
  const p = (b, h) => 2 * (b + h);
  const quadradinhos = (b, h) => b * h;

  // o contraexemplo central da lição
  assert.equal(p(6, 4), p(9, 1), "os dois retângulos deveriam ter o mesmo perímetro");
  assert.equal(p(6, 4), 20);
  assert.notEqual(quadradinhos(6, 4), quadradinhos(9, 1));
  assert.equal(quadradinhos(6, 4), 24);
  assert.equal(quadradinhos(9, 1), 9);

  num("perimetro", "mesmo-perimetro", "q1", p(8, 2));
  assert.equal(p(8, 2), 20, "o 8×2 deveria ter o mesmo perímetro dos outros dois");
  num("perimetro", "mesmo-perimetro", "q2", quadradinhos(5, 3));
  alt("perimetro", "mesmo-perimetro", "q3", "Não: o perímetro não determina o que cabe dentro");

  // entre os retângulos de perímetro 16 com lados inteiros, o quadrado é o maior
  const meia = 16 / 2;
  const casos = [];
  for (let b = 1; b < meia; b++) casos.push({ b, h: meia - b, area: b * (meia - b) });
  const melhor = casos.reduce((a, c) => (c.area > a.area ? c : a));
  assert.equal(melhor.b, melhor.h, "o melhor caso deveria ser o quadrado");
  assert.equal(melhor.area, 16);
  num("perimetro", "mesmo-perimetro", "q4", melhor.area);
});

teste("perímetro · lição 6 — problemas", () => {
  const p = (b, h) => 2 * (b + h);
  num("perimetro", "problemas", "q1", p(40, 60));
  num("perimetro", "problemas", "q2", 4 * p(28, 15));
  assert.equal(p(28, 15), 86, "uma volta na quadra");
  num("perimetro", "problemas", "q3", 2 * p(18, 12));
  // caminho de volta: lado do quadrado a partir da cerca
  num("perimetro", "problemas", "q4", 32 / 4);
  assert.equal(4 * (32 / 4), 32);
  // o exemplo resolvido
  assert.equal(3 * p(30, 20), 300);
});

teste("perímetro · as figuras compostas desenhadas fecham o contorno", () => {
  // figuraComposta recusa contorno aberto; aqui se confere que os contornos
  // usados no conteúdo têm o número de lados e o perímetro que o texto afirma.
  const casos = [
    { movimentos: [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]], lados: 6, perimetro: 26 },
    { movimentos: [[5, 0], [0, 2], [-2, 0], [0, 3], [-3, 0], [0, -5]], lados: 6, perimetro: 20 },
    { movimentos: [[4, 0], [0, 2], [-2, 0], [0, 2], [-2, 0], [0, -4]], lados: 6, perimetro: 16 },
  ];
  for (const caso of casos) {
    const svg = desenhos.figuraComposta({ movimentos: caso.movimentos, escala: 30 });
    const pts = svg.match(/points="([^"]+)"/)[1].split(" ");
    assert.equal(pts.length, caso.lados, "o desenho saiu com outro número de vértices");
    assert.equal(perimetroContorno(caso.movimentos), caso.perimetro);
  }
  // contorno aberto tem que ser recusado pelo próprio gerador
  assert.throws(() => desenhos.figuraComposta({ movimentos: [[3, 0], [0, 2]] }), /não voltou/);
});

// ---------- Área ----------
//
// A área é recalculada CONTANDO os quadradinhos num laço, e não pela fórmula
// que a lição ensina. Assim o teste confere a fórmula em vez de repeti-la.

const contarQuadradinhos = (colunas, linhas) => {
  let n = 0;
  for (let l = 0; l < linhas; l++) for (let c = 0; c < colunas; c++) n += 1;
  return n;
};
/** Área de um polígono de vértices inteiros, pela fórmula do laço. */
const areaPoligono = (pts) => {
  let dobro = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    dobro += x1 * y2 - x2 * y1;
  }
  return Math.abs(dobro) / 2;
};
const verticesDo = (movimentos) => {
  const pts = [[0, 0]];
  for (const [dx, dy] of movimentos) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + dx, y + dy]);
  }
  pts.pop();
  return pts;
};

teste("área · lição 1 — contar quadradinhos", () => {
  assert.equal(contarQuadradinhos(5, 3), 15, "o exemplo resolvido não fecha");
  num("area", "o-que-e-area", "q1", contarQuadradinhos(6, 4));
  num("area", "o-que-e-area", "q2", contarQuadradinhos(7, 2));
  alt("area", "o-que-e-area", "q3", "Centímetros quadrados (cm²)");

  // a figura em L: área contada pelo polígono, não pela decomposição da lição
  const L = [[4, 0], [0, 2], [-2, 0], [0, 2], [-2, 0], [0, -4]];
  const area = areaPoligono(verticesDo(L));
  assert.equal(area, 12);
  // e a decomposição da lição precisa concordar
  assert.equal(contarQuadradinhos(4, 2) + contarQuadradinhos(2, 2), area);
  num("area", "o-que-e-area", "q4", area);
});

teste("área · lição 2 — área do retângulo", () => {
  // a fórmula base × altura conferida contra a contagem
  for (const [b, h] of [[12, 5], [9, 4], [7, 6], [5, 4]]) {
    assert.equal(b * h, contarQuadradinhos(b, h), `${b}×${h}: fórmula e contagem discordam`);
  }
  num("area", "retangulo", "q1", contarQuadradinhos(9, 4));
  num("area", "retangulo", "q2", contarQuadradinhos(7, 6));
  // altura a partir da área
  const alturaPor = (area, base) => area / base;
  assert.equal(alturaPor(48, 8), 6);
  assert.equal(8 * alturaPor(48, 8), 48, "a volta não reconstrói a área");
  num("area", "retangulo", "q3", alturaPor(48, 8));
  num("area", "retangulo", "q4", contarQuadradinhos(5, 4));
});

teste("área · lição 3 — quadrado e triângulo", () => {
  const quadrado = (lado) => contarQuadradinhos(lado, lado);
  assert.equal(quadrado(7), 49);
  num("area", "quadrado-triangulo", "q1", quadrado(12));

  // o triângulo é metade do retângulo de mesma base e altura
  const triangulo = (b, h) => (b * h) / 2;
  assert.equal(triangulo(10, 6), 30);
  assert.equal(triangulo(10, 6) * 2, contarQuadradinhos(10, 6), "dois triângulos deveriam formar o retângulo");
  num("area", "quadrado-triangulo", "q2", triangulo(8, 5));
  num("area", "quadrado-triangulo", "q3", triangulo(14, 9));

  // lado a partir da área: é a raiz quadrada, achada por busca
  let lado = 0;
  for (let k = 1; k <= 81; k++) if (quadrado(k) === 81) lado = k;
  assert.equal(lado, 9);
  num("area", "quadrado-triangulo", "q4", lado);
});

teste("área · lição 4 — figuras compostas", () => {
  // L de 6×3 embaixo e 4×4 em cima
  const L34 = [[6, 0], [0, 3], [-2, 0], [0, 4], [-4, 0], [0, -7]];
  const a34 = areaPoligono(verticesDo(L34));
  assert.equal(a34, 34);
  // os dois caminhos da lição precisam dar o mesmo que o polígono
  assert.equal(6 * 3 + 4 * 4, a34, "somar os retângulos não bate");
  assert.equal(6 * 7 - 2 * 4, a34, "envolver e subtrair não bate");
  num("area", "compostas", "q1", a34);

  const L19 = [[5, 0], [0, 2], [-2, 0], [0, 3], [-3, 0], [0, -5]];
  const a19 = areaPoligono(verticesDo(L19));
  assert.equal(a19, 19);
  assert.equal(5 * 2 + 3 * 3, a19);
  assert.equal(5 * 5 - 2 * 3, a19);
  num("area", "compostas", "q2", a19);

  num("area", "compostas", "q3", 10 * 6 - 3 * 2);
  num("area", "compostas", "q4", 8 * 5 - 3 * 3);
});

teste("área · lição 5 — trocar de unidade", () => {
  // o fator de área é o QUADRADO do fator de comprimento
  const fatorArea = (fatorComprimento) => fatorComprimento * fatorComprimento;
  assert.equal(fatorArea(100), 10000, "1 m² em cm²");
  assert.equal(fatorArea(10), 100, "1 dm² em cm²");
  assert.equal(fatorArea(1000), 1000000, "1 km² em m²");

  num("area", "unidades", "q1", 3 * fatorArea(100));
  alt("area", "unidades", "q2", `${fatorArea(100)} cm²`.replace("10000", "10 000"));
  num("area", "unidades", "q3", 50000 / fatorArea(100));
  num("area", "unidades", "q4", fatorArea(1000));

  // conferência contando: um quadrado de 100 por 100 quadradinhos
  assert.equal(contarQuadradinhos(100, 100), fatorArea(100));
});

teste("área · lição 6 — problemas", () => {
  // tinta: área da parede dividida pelo rendimento
  const parede = 4 * 3;
  assert.equal(parede, 12);
  num("area", "problemas", "q1", parede / 6);

  num("area", "problemas", "q2", 40 * 25);

  // ladrilhos: contar por fileiras e conferir pelas áreas
  const porFileira = 200 / 20, fileiras = 100 / 20;
  assert.equal(porFileira * fileiras, (200 * 100) / (20 * 20), "os dois caminhos do ladrilho discordam");
  num("area", "problemas", "q3", porFileira * fileiras);

  // metade do jardim — e a armadilha de dividir os dois lados
  const jardim = 12 * 8;
  assert.equal(jardim / 2, 48);
  assert.equal((12 / 2) * (8 / 2), jardim / 4, "dividir os dois lados divide a área por 4");
  num("area", "problemas", "q4", jardim / 2);

  // o exemplo resolvido: piso de 500 por 400 com ladrilhos de 50
  assert.equal((500 / 50) * (400 / 50), 80);
});

teste("as igualdades escritas nas contas são verdadeiras", () => {
  // Confere "2/3 = 8/12", "6 × 1/6 = 6/6 = 1" e afins dentro dos campos
  // "conta". A varredura é conservadora: só entram segmentos em que TODOS os
  // lados do "=" são expressões numéricas puras. Uma frase como
  // "5 passos de 1/8 = 5/8" está correta em português mas não é uma igualdade
  // entre os dois primeiros números, e um regex ingênuo a acusaria de erro.
  const valor = (token) => {
    const t = token.trim().replace(/\s+/g, " ");
    let m = /^(\d+)\s*[×x]\s*(\d+)\s*\/\s*(\d+)$/.exec(t);
    if (m) return (Number(m[1]) * Number(m[2])) / Number(m[3]);
    m = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
    if (m) return Number(m[1]) / Number(m[2]);
    m = /^\d+(?:[.,]\d+)?$/.exec(t);
    if (m) return Number(t.replace(",", "."));
    return null;
  };

  const contas = [
    ...todasLicoes.flatMap((l) => l.resolvido.passos),
    ...todasQuestoes.flatMap((x) => x.resolucao),
  ].map((p) => p.conta).filter(Boolean);

  let conferidas = 0;
  for (const conta of contas) {
    for (const segmento of conta.split("·")) {
      if (!segmento.includes("=")) continue;
      const lados = segmento.split("=").map(valor);
      if (lados.length < 2 || lados.some((v) => v === null)) continue;
      for (let i = 1; i < lados.length; i++) {
        assert.ok(
          Math.abs(lados[i] - lados[0]) < 1e-9,
          `igualdade falsa em "${conta}": ${lados[0]} ≠ ${lados[i]}`
        );
      }
      conferidas += 1;
    }
  }
  assert.ok(conferidas >= 20, `esperava conferir pelo menos 20 igualdades, conferi ${conferidas}`);
});

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) process.exit(1);

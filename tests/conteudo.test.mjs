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

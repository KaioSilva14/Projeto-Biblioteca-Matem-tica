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

teste("todo diagnóstico é ALCANÇÁVEL pelo motor de correção", () => {
  // Um diagnóstico que o motor nunca consegue mostrar é uma promessa vazia no
  // conteúdo. Aconteceu duas vezes em Números decimais: um erro previsto que o
  // motor aceitava como resposta certa ("8,0" numa questão de resposta 8) e
  // dois erros que eram o mesmo número escrito de dois jeitos ("6" e "6,0"),
  // com o segundo inalcançável. O motor casa erro por VALOR, e não por texto.
  for (const q of todasQuestoes) {
    if (q.formato !== "numero") continue;
    const tolerancia = q.tolerancia ?? 0.001;
    const vistos = [];
    q.errosComuns.forEach((erro, i) => {
      const valor = Number(String(erro.resposta).replace(",", "."));
      assert.ok(
        !Number.isNaN(valor),
        `${q.curso}/${q.licao}/${q.id}: erro ${i} não é número numa questão numérica ("${erro.resposta}")`
      );
      assert.ok(
        Math.abs(valor - q.resposta) > tolerancia,
        `${q.curso}/${q.licao}/${q.id}: o erro "${erro.resposta}" é aceito como CERTO — o diagnóstico nunca apareceria`
      );
      for (const anterior of vistos) {
        assert.ok(
          Math.abs(valor - anterior) > tolerancia,
          `${q.curso}/${q.licao}/${q.id}: o erro "${erro.resposta}" repete um valor anterior — só o primeiro seria mostrado`
        );
      }
      vistos.push(valor);
    });
  }
});

teste("TODA alternativa errada tem diagnóstico próprio", () => {
  // Sem diagnóstico o aluno recebe "Ainda não." e a dica genérica — que é
  // exatamente o defeito da v2. Frações e Números decimais foram escritas
  // antes de a regra se firmar e tinham 27 alternativas descobertas.
  for (const q of todasQuestoes) {
    if (q.formato !== "alternativas") continue;
    const semDiagnostico = q.alternativas
      .filter((_, i) => i !== q.correta)
      .map((a) => a.texto)
      .filter((texto) => !q.errosComuns.some((e) => e.resposta === texto));
    assert.deepEqual(
      semDiagnostico,
      [],
      `${q.curso}/${q.licao}/${q.id}: alternativa errada sem diagnóstico`
    );
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

// ---------- Sólidos e volume ----------
//
// O volume é recontado empilhando camadas num laço, e não pela fórmula que a
// lição ensina — assim o teste confere a fórmula em vez de repeti-la.

const porCamadas = (c, l, a) => {
  let total = 0;
  for (let camada = 0; camada < a; camada++) {
    for (let i = 0; i < l; i++) for (let j = 0; j < c; j++) total += 1;
  }
  return total;
};
/** Faces, arestas e vértices de um prisma de base com n lados. */
const prisma = (n) => ({ faces: n + 2, arestas: 3 * n, vertices: 2 * n });
/** Idem para uma pirâmide de base com n lados. */
const piramide = (n) => ({ faces: n + 1, arestas: 2 * n, vertices: n + 1 });

teste("sólidos · lição 1 — faces, arestas e vértices", () => {
  // o cubo é o prisma de base quadrada
  const cubo = prisma(4);
  assert.deepEqual(cubo, { faces: 6, arestas: 12, vertices: 8 });
  // e a relação de Euler tem que fechar em todo poliedro convexo
  assert.equal(cubo.faces + cubo.vertices - cubo.arestas, 2, "Euler não fecha no cubo");

  alt("solidos-volume", "solidos", "q1", "A esfera");
  num("solidos-volume", "solidos", "q2", cubo.arestas);
  num("solidos-volume", "solidos", "q3", piramide(4).faces);
  num("solidos-volume", "solidos", "q4", cubo.vertices);
});

teste("sólidos · lição 2 — prismas e pirâmides", () => {
  const p3 = prisma(3);
  assert.deepEqual(p3, { faces: 5, arestas: 9, vertices: 6 });
  assert.equal(p3.faces + p3.vertices - p3.arestas, 2, "Euler não fecha no prisma triangular");

  alt("solidos-volume", "prismas-piramides", "q1", "O cilindro");
  alt("solidos-volume", "prismas-piramides", "q2", "A pirâmide");
  num("solidos-volume", "prismas-piramides", "q3", piramide(5).faces);
  num("solidos-volume", "prismas-piramides", "q4", p3.arestas);
  // Euler também na pirâmide pentagonal
  const pi5 = piramide(5);
  assert.equal(pi5.faces + pi5.vertices - pi5.arestas, 2);
});

teste("sólidos · lição 3 — planificação", () => {
  // as peças do molde são as faces do sólido
  num("solidos-volume", "planificacao", "q1", prisma(4).faces);
  num("solidos-volume", "planificacao", "q2", prisma(4).faces);
  alt("solidos-volume", "planificacao", "q3", "Um quadrado e quatro triângulos");
  num("solidos-volume", "planificacao", "q4", prisma(3).faces);

  // o molde do cubo tem seis peças iguais; o do bloco, três formatos
  const conta = (svg) => {
    const p = [...svg.matchAll(/width="([\d.]+)" height="([\d.]+)" fill/g)].map((m) => `${m[1]}x${m[2]}`);
    return { pecas: p.length, formatos: new Set(p).size };
  };
  const cubo = conta(desenhos.planificacao({ tipo: "cubo" }));
  assert.deepEqual(cubo, { pecas: 6, formatos: 1 }, "o molde do cubo deveria ter 6 peças iguais");
  const bloco = conta(desenhos.planificacao({ tipo: "bloco" }));
  assert.equal(bloco.pecas, 6);
  assert.equal(bloco.formatos, 3, "um bloco tem três formatos de face, e não um só");
});

teste("sólidos · lição 4 — volume contando cubinhos", () => {
  assert.equal(porCamadas(4, 3, 2), 24, "o exemplo resolvido não fecha");
  num("solidos-volume", "volume-cubinhos", "q1", porCamadas(5, 2, 3));
  num("solidos-volume", "volume-cubinhos", "q2", porCamadas(3, 3, 3));
  num("solidos-volume", "volume-cubinhos", "q3", porCamadas(5, 4, 1));
  num("solidos-volume", "volume-cubinhos", "q4", porCamadas(6, 4, 2));
});

teste("sólidos · lição 5 — fórmula do volume", () => {
  // a fórmula conferida contra a contagem por camadas
  for (const [c, l, a] of [[10, 6, 4], [8, 5, 3], [5, 5, 5], [8, 6, 4]]) {
    assert.equal(c * l * a, porCamadas(c, l, a), `${c}×${l}×${a}: fórmula e contagem discordam`);
  }
  num("solidos-volume", "formula", "q1", 8 * 5 * 3);
  num("solidos-volume", "formula", "q2", 5 * 5 * 5);
  // altura a partir do volume e da base
  const altura = (v, c, l) => v / (c * l);
  assert.equal(altura(60, 5, 4), 3);
  assert.equal(5 * 4 * altura(60, 5, 4), 60, "a volta não reconstrói o volume");
  num("solidos-volume", "formula", "q3", altura(60, 5, 4));
  num("solidos-volume", "formula", "q4", 20 * 15 * 10);
});

teste("sólidos · lição 6 — volume e capacidade", () => {
  // as pontes entre as unidades
  assert.equal(10 * 10 * 10, 1000, "o cubo de 10 cm de aresta tem 1000 cm³");
  const litros = (cm3) => cm3 / 1000;
  assert.equal(litros(1000), 1);

  num("solidos-volume", "capacidade", "q1", 2 * 1000);
  num("solidos-volume", "capacidade", "q2", litros(10 * 10 * 10));
  num("solidos-volume", "capacidade", "q3", 500);   // 1 mL = 1 cm³
  num("solidos-volume", "capacidade", "q4", litros(40 * 20 * 25));
  assert.equal(40 * 20 * 25, 20000);
  // a caixa do exemplo resolvido tem o mesmo volume do cubo de 10
  assert.equal(20 * 10 * 5, 10 * 10 * 10);
});

// ---------- Grandezas e medidas ----------

/** Converte entre unidades de uma escada, dado o fator entre elas. */
const converte = (valor, fator, paraMenor) => (paraMenor ? valor * fator : valor / fator);

teste("medidas · lição 1 — escolher a unidade", () => {
  alt("medidas", "medir", "q1", "Metro (m)");
  alt("medidas", "medir", "q2", "Tonelada (t)");
  alt("medidas", "medir", "q3", "Litro (L)");
  alt("medidas", "medir", "q4", "Quilômetro (km)");
});

teste("medidas · lição 2 — comprimento", () => {
  // a escada tem sete degraus de 10; os fatores usados saem dela
  const escada = ["km", "hm", "dam", "m", "dm", "cm", "mm"];
  const fator = (de, para) => 10 ** (escada.indexOf(para) - escada.indexOf(de));
  assert.equal(fator("m", "cm"), 100);
  assert.equal(fator("km", "m"), 1000);
  assert.equal(fator("mm", "cm"), 0.1);

  num("medidas", "comprimento", "q1", 7 * fator("m", "cm"));
  num("medidas", "comprimento", "q2", arred(250 / fator("m", "cm"), 6));
  num("medidas", "comprimento", "q3", 3 * fator("km", "m"));
  num("medidas", "comprimento", "q4", arred(45 * fator("mm", "cm"), 6));
});

teste("medidas · lição 3 — massa", () => {
  num("medidas", "massa", "q1", converte(4, 1000, true));
  num("medidas", "massa", "q2", converte(3000, 1000, false));
  num("medidas", "massa", "q3", converte(2, 1000, true));
  // soma com unidades diferentes: converter antes
  const total = 500 + converte(1.5, 1000, true);
  assert.equal(total, 2000);
  assert.equal(converte(total, 1000, false), 2, "o total em quilos não fecha");
  num("medidas", "massa", "q4", total);
});

teste("medidas · lição 4 — capacidade", () => {
  num("medidas", "capacidade", "q1", converte(3, 1000, true));
  num("medidas", "capacidade", "q2", arred(converte(1500, 1000, false), 6));
  num("medidas", "capacidade", "q3", 250 * 6);
  assert.equal(250 * 6, 1500);
  // quantos copos numa garrafa: converter e dividir
  const copos = converte(2, 1000, true) / 200;
  assert.equal(copos, 10);
  assert.equal(copos * 200, 2000, "os copos não reconstroem a garrafa");
  num("medidas", "capacidade", "q4", copos);
});

teste("medidas · lição 5 — tempo (o salto é 60, não 10)", () => {
  num("medidas", "tempo", "q1", 3 * 60);
  num("medidas", "tempo", "q2", 240 / 60);
  num("medidas", "tempo", "q3", 2 * 60);

  // 2,5 h são 150 min, e não 250 — a armadilha central da lição
  assert.equal(2 * 60 + 30, 150);
  assert.notEqual(2 * 60 + 30, 2 * 100 + 50);

  // duração entre dois horários, contada em minutos desde a meia-noite
  const emMinutos = (h, m) => h * 60 + m;
  const duracao = emMinutos(9, 50) - emMinutos(8, 15);
  assert.equal(duracao, 95);
  assert.equal(Math.floor(duracao / 60), 1, "uma hora inteira");
  assert.equal(duracao % 60, 35, "e mais 35 minutos");
  num("medidas", "tempo", "q4", duracao);
});

teste("medidas · lição 6 — converter antes de calcular", () => {
  num("medidas", "problemas", "q1", converte(2, 100, true) + 30);
  num("medidas", "problemas", "q2", converte(1, 1000, true) - 250);
  num("medidas", "problemas", "q3", converte(1.5, 1000, true) + 400);
  num("medidas", "problemas", "q4", converte(5, 1000, true) - 2500);

  // somar sem converter dá números sem significado — o ponto da lição
  assert.notEqual(2 + 30, converte(2, 100, true) + 30);
  assert.equal(converte(1.2, 100, true) + 45, 165, "o exemplo resolvido não fecha");
});

// ---------- Plano cartesiano ----------

/**
 * Lê de volta as coordenadas dos pontos desenhados num plano cartesiano.
 *
 * A conversão não usa as constantes internas do gerador: ela se orienta pelos
 * próprios números escritos nos eixos. Se o desenho colocar o ponto numa
 * esquina diferente da que o enunciado afirma, a leitura acusa — que é o mesmo
 * cuidado que os testes de ângulo já tomam com as figuras de geometria.
 */
function lerPlano(svg) {
  const textos = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*font-size="11"[^>]*>(\d+)</g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), n: Number(m[3]) }));

  // O rótulo do eixo x fica embaixo (y máximo); o do eixo y, à esquerda
  // (x mínimo). O "0" do canto pertence aos dois e é escrito deslocado, então
  // fica de fora dos dois grupos.
  const yBase = Math.max(...textos.map((t) => t.y));
  const xBase = Math.min(...textos.map((t) => t.x));
  const eixoX = textos.filter((t) => t.y === yBase && t.n > 0).sort((a, b) => a.n - b.n);
  const eixoY = textos.filter((t) => t.x === xBase && t.n > 0).sort((a, b) => a.n - b.n);
  assert.ok(eixoX.length >= 2 && eixoY.length >= 2, "eixos sem numeração suficiente para medir");

  const escalaX = (eixoX.at(-1).x - eixoX[0].x) / (eixoX.at(-1).n - eixoX[0].n);
  const escalaY = (eixoY[0].y - eixoY.at(-1).y) / (eixoY.at(-1).n - eixoY[0].n);
  const zeroX = eixoX[0].x - eixoX[0].n * escalaX;
  const zeroY = eixoY[0].y + eixoY[0].n * escalaY;

  return [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => [
    Math.round((Number(m[1]) - zeroX) / escalaX),
    Math.round((zeroY - Number(m[2])) / escalaY),
  ]);
}

teste("plano cartesiano · lição 1 — o par ordenado", () => {
  // Um par ordenado é uma função do ponto: dois números, na ordem combinada.
  const par = ([x, y]) => `(${x}, ${y})`;
  assert.equal(par([2, 5]), "(2, 5)");
  alt("plano-cartesiano", "localizar", "q1", par([2, 5]));
  alt("plano-cartesiano", "localizar", "q2", par([0, 0]));
  num("plano-cartesiano", "localizar", "q4", [6, 2][0]);

  // e a figura da questão 1 marca de fato o ponto que a alternativa afirma
  const pontos = lerPlano(desenhos.planoCartesiano({ ate: 6, pontos: [{ em: [2, 5] }] }));
  assert.deepEqual(pontos, [[2, 5]], "o desenho de pla-q-ler-25 não bate com a resposta");
});

teste("plano cartesiano · lição 2 — ler é projetar nos dois eixos", () => {
  const par = ([x, y]) => `(${x}, ${y})`;
  alt("plano-cartesiano", "ler-marcar", "q1", par([4, 2]));
  alt("plano-cartesiano", "ler-marcar", "q2", par([1, 5]));
  num("plano-cartesiano", "ler-marcar", "q3", [3, 6][1]);
  alt("plano-cartesiano", "ler-marcar", "q4", par([4, 0]));

  // as duas figuras de leitura conferem com as respostas
  assert.deepEqual(lerPlano(desenhos.planoCartesiano({ ate: 6, pontos: [{ em: [4, 2] }] })), [[4, 2]]);
  assert.deepEqual(lerPlano(desenhos.planoCartesiano({ ate: 6, pontos: [{ em: [1, 5] }] })), [[1, 5]]);

  // um ponto sobre o eixo x tem y = 0; sobre o eixo y, x = 0
  const noEixoX = ([, y]) => y === 0;
  assert.ok(noEixoX([4, 0]));
  assert.ok(!noEixoX([0, 4]) && !noEixoX([4, 4]) && !noEixoX([1, 2]));
});

teste("plano cartesiano · lição 3 — trocar a ordem move o ponto", () => {
  const mesmoPonto = (a, b) => a[0] === b[0] && a[1] === b[1];
  assert.ok(!mesmoPonto([2, 6], [6, 2]), "(2, 6) e (6, 2) não podem coincidir");
  assert.ok(mesmoPonto([4, 4], [4, 4]), "só coincidem quando os dois números são iguais");
  alt("plano-cartesiano", "ordem-importa", "q1", "Não, são pontos diferentes");

  num("plano-cartesiano", "ordem-importa", "q2", [7, 1][0]);
  alt("plano-cartesiano", "ordem-importa", "q3", "(0, 4)");

  // quem está mais à direita é quem tem o maior x — e a figura desenha isso
  const a = [2, 6], b = [5, 1];
  const maisDireita = a[0] > b[0] ? a : b;
  assert.deepEqual(maisDireita, [5, 1]);
  alt("plano-cartesiano", "ordem-importa", "q4", "(5, 1)");
  const desenhados = lerPlano(desenhos.planoCartesiano({ ate: 7, pontos: [{ em: a }, { em: b }] }));
  assert.deepEqual(desenhados, [a, b], "a figura de comparação não marca os pontos do enunciado");
  assert.ok(desenhados[1][0] > desenhados[0][0], "no desenho, (5, 1) tem que aparecer mais à direita");
});

teste("plano cartesiano · lição 4 — distância entre pontos alinhados", () => {
  /** Distância só quando os pontos compartilham uma das coordenadas. */
  const distancia = ([xa, ya], [xb, yb]) => {
    if (ya === yb) return Math.abs(xb - xa);
    if (xa === xb) return Math.abs(yb - ya);
    return null;                      // caso geral: ferramenta do 8º ano
  };

  assert.equal(distancia([2, 3], [6, 3]), 4, "o exemplo resolvido não fecha");
  assert.equal(distancia([6, 3], [2, 3]), 4, "distância não pode depender da ordem");
  assert.equal(distancia([1, 4], [5, 2]), null, "pontos não alinhados não têm essa conta");

  num("plano-cartesiano", "distancias", "q1", distancia([1, 2], [5, 2]));
  num("plano-cartesiano", "distancias", "q2", distancia([3, 1], [3, 7]));
  num("plano-cartesiano", "distancias", "q3", distancia([0, 0], [5, 0]));
  num("plano-cartesiano", "distancias", "q4", distancia([2, 4], [2, 9]));
});

teste("plano cartesiano · lição 5 — figuras medidas por coordenadas", () => {
  /**
   * Acha o vértice que falta procurando a coordenada que aparece uma vez só.
   * Nada aqui recebe a resposta pronta: a função recalcula dos três pontos.
   */
  const quartoVertice = (tres) => {
    const solitario = (valores) => valores.find((v) => valores.filter((o) => o === v).length === 1);
    return [solitario(tres.map((p) => p[0])), solitario(tres.map((p) => p[1]))];
  };

  assert.deepEqual(quartoVertice([[1, 1], [5, 1], [5, 4]]), [1, 4], "o exemplo resolvido não fecha");
  assert.deepEqual(quartoVertice([[2, 2], [6, 2], [6, 5]]), [2, 5]);
  alt("plano-cartesiano", "figuras", "q1", "(2, 5)");

  const retangulo = [[1, 1], [5, 1], [5, 4], [1, 4]];
  const largura = Math.max(...retangulo.map((p) => p[0])) - Math.min(...retangulo.map((p) => p[0]));
  const altura = Math.max(...retangulo.map((p) => p[1])) - Math.min(...retangulo.map((p) => p[1]));
  assert.equal(largura, 4);
  assert.equal(altura, 3);
  num("plano-cartesiano", "figuras", "q2", largura);
  num("plano-cartesiano", "figuras", "q3", largura * altura);
  num("plano-cartesiano", "figuras", "q4", 2 * (largura + altura));

  // a área também conferida contando os quadradinhos da malha, um a um
  let quadradinhos = 0;
  for (let x = 1; x < 5; x++) for (let y = 1; y < 4; y++) quadradinhos += 1;
  assert.equal(quadradinhos, largura * altura);

  // e o desenho marca os quatro cantos certos, na ordem do contorno
  const svg = desenhos.planoCartesiano({ ate: 6, ligar: true, pontos: retangulo.map((em) => ({ em })) });
  assert.deepEqual(lerPlano(svg), retangulo, "os vértices desenhados não são os do enunciado");
  assert.match(svg, /<polygon points="[^"]+" fill/, "o retângulo precisa aparecer fechado");
});

teste("plano cartesiano · lição 6 — caminho pelas ruas de um mapa", () => {
  /** Comprimento do trajeto que anda só na horizontal e na vertical. */
  const quadras = ([xa, ya], [xb, yb]) => Math.abs(xb - xa) + Math.abs(yb - ya);

  const escola = [2, 5], casa = [6, 2];
  assert.equal(Math.abs(casa[0] - escola[0]), 4, "trecho horizontal");
  assert.equal(Math.abs(casa[1] - escola[1]), 3, "trecho vertical");
  assert.equal(quadras(escola, casa), 7, "o exemplo resolvido não fecha");
  assert.equal(quadras(casa, escola), 7, "o caminho não pode depender do sentido");

  num("plano-cartesiano", "problemas", "q1", Math.abs(casa[0] - escola[0]));
  num("plano-cartesiano", "problemas", "q2", quadras(escola, casa));

  // andar em L, nas duas ordens possíveis, dá o mesmo comprimento
  const porFora = quadras(escola, [casa[0], escola[1]]) + quadras([casa[0], escola[1]], casa);
  const porBaixo = quadras(escola, [escola[0], casa[1]]) + quadras([escola[0], casa[1]], casa);
  assert.equal(porFora, 7);
  assert.equal(porBaixo, 7);

  // deslocar um endereço soma nas coordenadas, e não substitui
  const anda = ([x, y], dx, dy) => [x + dx, y + dy];
  assert.deepEqual(anda(escola, 3, 1), [5, 6]);
  alt("plano-cartesiano", "problemas", "q3", "(5, 6)");

  // mesma rua horizontal é mesma altura
  const opcoes = { "Padaria, em (6, 5)": [6, 5], "Casa, em (2, 1)": [2, 1], "Mercado, em (5, 2)": [5, 2], "Praça, em (5, 6)": [5, 6] };
  const naMesmaRua = Object.entries(opcoes).filter(([, p]) => p[1] === escola[1]);
  assert.equal(naMesmaRua.length, 1, "só uma alternativa pode estar na mesma rua");
  alt("plano-cartesiano", "problemas", "q4", naMesmaRua[0][0]);
});

// ---------- Gráficos e tabelas ----------

/**
 * Mede as colunas de um gráfico gerado e devolve o valor que cada uma
 * representa, lendo a escala pelos próprios números escritos no eixo.
 *
 * Serve para o mesmo que a leitura do plano cartesiano: se o desenho puser
 * uma coluna numa altura que não corresponde ao dado, o teste acusa. E é o
 * único jeito de conferir a lição do eixo cortado, onde a altura desenhada
 * DEVERIA discordar da proporção entre os valores.
 */
function lerColunas(svg) {
  const marcas = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*font-size="11"[^>]*text-anchor="end"[^>]*>(\d+)</g)]
    .map((m) => ({ y: Number(m[2]), n: Number(m[3]) }))
    .sort((a, b) => a.n - b.n);
  assert.ok(marcas.length >= 2, "eixo sem marcas suficientes");

  const base = marcas[0];
  const topo = marcas.at(-1);
  const porPixel = (topo.n - base.n) / (base.y - topo.y);
  const alturas = [...svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g)]
    .map((m) => Number(m[2]));

  return { valores: alturas.map((h) => base.n + h * porPixel), alturas, baseEixo: base.n };
}

teste("gráficos e tabelas · lição 1 — cruzar linha com coluna", () => {
  // A tabela é o dado; tudo o mais é recalculado a partir dela.
  const LIVROS = { "6º A": { março: 12, abril: 15 }, "6º B": { março: 9, abril: 20 }, "6º C": { março: 14, abril: 11 } };

  num("graficos-tabelas", "tabela", "q1", LIVROS["6º C"]["março"]);

  const totalDaLinha = (turma) => Object.values(LIVROS[turma]).reduce((a, b) => a + b, 0);
  assert.equal(totalDaLinha("6º A"), 27);
  num("graficos-tabelas", "tabela", "q2", totalDaLinha("6º A"));

  // a turma que mais leu no total não é a que mais leu em março
  const totais = Object.keys(LIVROS).map((t) => [t, totalDaLinha(t)]);
  const campea = totais.reduce((a, b) => (b[1] > a[1] ? b : a));
  assert.deepEqual(totais.map(([, v]) => v), [27, 29, 25]);
  assert.equal(campea[0], "6º B");
  const campeaEmMarco = Object.keys(LIVROS).reduce((a, b) => (LIVROS[b]["março"] > LIVROS[a]["março"] ? b : a));
  assert.equal(campeaEmMarco, "6º C", "ganhar um mês não pode ser o mesmo que ganhar o total");
  alt("graficos-tabelas", "tabela", "q3", campea[0]);

  num("graficos-tabelas", "tabela", "q4", LIVROS["6º B"]["abril"] - LIVROS["6º C"]["abril"]);
});

teste("gráficos e tabelas · lição 2 — altura de coluna lida no eixo", () => {
  const TRANSPORTE = { "a pé": 8, "ônibus": 12, bicicleta: 6, carro: 4 };

  num("graficos-tabelas", "colunas", "q1", TRANSPORTE["ônibus"]);
  const menor = Object.keys(TRANSPORTE).reduce((a, b) => (TRANSPORTE[b] < TRANSPORTE[a] ? b : a));
  assert.equal(menor, "carro");
  alt("graficos-tabelas", "colunas", "q2", "Carro");
  num("graficos-tabelas", "colunas", "q3", Object.values(TRANSPORTE).reduce((a, b) => a + b, 0));
  num("graficos-tabelas", "colunas", "q4", TRANSPORTE["ônibus"] - TRANSPORTE["a pé"]);

  // e o desenho põe cada coluna na altura que o dado manda
  const dados = Object.entries(TRANSPORTE).map(([rotulo, valor]) => ({ rotulo, valor }));
  const lido = lerColunas(desenhos.grafico({ dados, passo: 2, mostrarValores: false }));
  assert.equal(lido.baseEixo, 0, "sem `base`, o eixo tem de começar no zero");
  lido.valores.forEach((v, i) => {
    assert.ok(Math.abs(v - dados[i].valor) < 0.05, `coluna ${dados[i].rotulo} desenhada como ${v.toFixed(2)}`);
  });
});

teste("gráficos e tabelas · lição 3 — barras deitadas", () => {
  const ESPORTES = { "vôlei": 7, futebol: 14, basquete: 5, "natação": 4 };

  num("graficos-tabelas", "barras", "q1", Object.values(ESPORTES).reduce((a, b) => a + b, 0));
  num("graficos-tabelas", "barras", "q2", ESPORTES.futebol - ESPORTES["vôlei"]);
  alt("graficos-tabelas", "barras", "q3", "De barras deitadas, porque cada nome ganha uma linha inteira");
  num("graficos-tabelas", "barras", "q4", ESPORTES.basquete + ESPORTES["natação"]);

  // o exemplo resolvido afirma que o futebol é o dobro do vôlei
  assert.equal(ESPORTES.futebol, 2 * ESPORTES["vôlei"]);

  // e no desenho o comprimento acompanha o valor, sem exceção
  const dados = Object.entries(ESPORTES).map(([rotulo, valor]) => ({ rotulo, valor }));
  const svg = desenhos.grafico({ dados, orientacao: "barras" });
  const larguras = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(larguras.length, dados.length);
  assert.ok(Math.abs(larguras[1] / larguras[0] - 2) < 0.02, "a barra do futebol tem de ser o dobro da do vôlei");
  assert.throws(() => desenhos.grafico({ dados, orientacao: "barras", base: 3 }), /só vale para colunas/);
});

teste("gráficos e tabelas · lição 4 — tabela e gráfico dizem o mesmo", () => {
  const SUCOS = { segunda: 20, "terça": 35, quarta: 25, quinta: 40 };
  const valores = Object.values(SUCOS);

  const total = valores.reduce((a, b) => a + b, 0);
  assert.equal(total, 120);
  num("graficos-tabelas", "duas-formas", "q1", total);

  const maior = Object.keys(SUCOS).reduce((a, b) => (SUCOS[b] > SUCOS[a] ? b : a));
  const menor = Object.keys(SUCOS).reduce((a, b) => (SUCOS[b] < SUCOS[a] ? b : a));
  assert.equal(maior, "quinta");
  assert.equal(menor, "segunda");
  alt("graficos-tabelas", "duas-formas", "q2", "Quinta");
  num("graficos-tabelas", "duas-formas", "q3", SUCOS[maior] - SUCOS[menor]);
  alt("graficos-tabelas", "duas-formas", "q4", "Os dois mostram a mesma informação, em formas diferentes");

  // o total tem de bater somando a tabela e somando as alturas do gráfico
  const dados = Object.entries(SUCOS).map(([rotulo, valor]) => ({ rotulo, valor }));
  const lido = lerColunas(desenhos.grafico({ dados, passo: 5, mostrarValores: false }));
  const somaDesenhada = lido.valores.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(somaDesenhada - total) < 0.2, `gráfico soma ${somaDesenhada.toFixed(1)}, tabela soma ${total}`);
});

teste("gráficos e tabelas · lição 5 — o eixo cortado exagera a diferença", () => {
  const VOTOS = { uva: 52, laranja: 56, manga: 54 };
  const dados = Object.entries(VOTOS).map(([rotulo, valor]) => ({ rotulo, valor }));

  num("graficos-tabelas", "enganosos", "q1", VOTOS.laranja);
  num("graficos-tabelas", "enganosos", "q2", VOTOS.laranja - VOTOS.uva);
  alt("graficos-tabelas", "enganosos", "q3", "Porque o eixo não começa no zero");
  num("graficos-tabelas", "enganosos", "q4", Object.values(VOTOS).reduce((a, b) => a + b, 0));

  // Com o eixo no zero, as colunas ficam quase iguais: nenhuma passa de 8%
  // de diferença para outra. É o que o texto chama de "quase empatados".
  const honesto = lerColunas(desenhos.grafico({ dados, passo: 10, mostrarValores: false }));
  assert.equal(honesto.baseEixo, 0);
  const razaoHonesta = Math.max(...honesto.alturas) / Math.min(...honesto.alturas);
  assert.ok(razaoHonesta < 1.1, `no eixo do zero as colunas deviam ficar parecidas, deu ${razaoHonesta.toFixed(2)}`);

  // Com a base em 50, a coluna da laranja fica exatamente o triplo da uva —
  // que é a afirmação escrita na lição, e a razão de o gráfico enganar.
  const cortado = lerColunas(desenhos.grafico({ dados, base: 50, passo: 2, mostrarValores: false }));
  assert.equal(cortado.baseEixo, 50);
  const razaoCortada = cortado.alturas[1] / cortado.alturas[0];
  assert.ok(Math.abs(razaoCortada - 3) < 0.02, `a lição afirma o triplo, o desenho deu ${razaoCortada.toFixed(2)}`);

  // e mesmo cortado, o valor lido na escala continua sendo o verdadeiro
  cortado.valores.forEach((v, i) => {
    assert.ok(Math.abs(v - dados[i].valor) < 0.05, `coluna ${dados[i].rotulo} lida como ${v.toFixed(2)}`);
  });

  // o gerador recusa uma base que engoliria alguma barra inteira
  assert.throws(() => desenhos.grafico({ dados, base: 52 }), /some com alguma barra/);
});

teste("gráficos e tabelas · lição 6 — ler, anotar e só então calcular", () => {
  const GOLS = { abril: 6, maio: 9, junho: 4, julho: 11 };
  const valores = Object.values(GOLS);

  assert.equal(GOLS.julho - GOLS.junho, 7, "o exemplo resolvido não fecha");
  num("graficos-tabelas", "problemas", "q1", valores.reduce((a, b) => a + b, 0));

  // "em quantos meses" é uma contagem de categorias, não uma soma de valores
  const acimaDe5 = valores.filter((v) => v > 5);
  assert.deepEqual(acimaDe5, [6, 9, 11]);
  assert.equal(acimaDe5.length, 3);
  assert.notEqual(acimaDe5.length, acimaDe5.reduce((a, b) => a + b, 0));
  num("graficos-tabelas", "problemas", "q2", acimaDe5.length);

  num("graficos-tabelas", "problemas", "q3", GOLS.maio - GOLS.abril);

  // a afirmação marcada como certa é a única que os números sustentam
  const mes = Object.keys(GOLS).reduce((a, b) => (GOLS[b] > GOLS[a] ? b : a));
  assert.equal(mes, "julho");
  assert.ok(GOLS.maio > GOLS.abril, "a alternativa sobre maio e abril é falsa");
  assert.notEqual(GOLS.junho, Math.max(...valores), "junho não pode ser o maior");
  alt("graficos-tabelas", "problemas", "q4", "Julho foi o mês de mais gols dos quatro");
});

// ---------- Média aritmética ----------

/** Média recalculada do zero: soma dividida pela quantidade de valores. */
const media = (valores) => valores.reduce((a, b) => a + b, 0) / valores.length;

teste("média · lição 1 — juntar e repartir igualmente", () => {
  // A ideia é repartir: a média multiplicada pela quantidade devolve o total.
  const figurinhas = [5, 8, 3, 4];
  assert.equal(media(figurinhas), 5);
  assert.equal(media(figurinhas) * figurinhas.length, figurinhas.reduce((a, b) => a + b, 0));

  assert.equal(media([7, 8, 6, 7]), 7, "o exemplo resolvido não fecha");

  num("media", "o-que-e", "q1", media([4, 6, 8, 10]));
  num("media", "o-que-e", "q2", media([10, 10, 10]));
  alt("media", "o-que-e", "q3", "Quanto cada um teria se tudo fosse repartido igualmente");
  num("media", "o-que-e", "q4", media([3, 5, 7]));

  // valores todos iguais devolvem o próprio valor
  assert.equal(media([6, 6, 6, 6]), 6);
});

teste("média · lição 2 — dividir pela quantidade certa", () => {
  const gols = [2, 0, 3, 1, 4];
  assert.equal(media(gols), 2, "o exemplo resolvido não fecha");
  // ignorar o zero inflaria o resultado — é o que a lição denuncia
  assert.equal(media(gols.filter((g) => g > 0)), 2.5);

  num("media", "calcular", "q1", media([12, 15, 9]));

  const bolos = [6, 6, 8, 0];
  assert.equal(media(bolos), 5);
  assert.equal(media(bolos.filter((b) => b > 0)), 20 / 3, "sem o zero a média sobe");
  num("media", "calcular", "q2", media(bolos));

  // a média depende só da soma e da quantidade, e não de quais são os valores
  const somaConhecida = (soma, quantos) => soma / quantos;
  assert.equal(somaConhecida(45, 5), 9);
  assert.equal(media([9, 9, 9, 9, 9]), somaConhecida(45, 5));
  assert.equal(media([1, 2, 3, 4, 35]), somaConhecida(45, 5), "listas diferentes, mesma soma, mesma média");
  num("media", "calcular", "q3", somaConhecida(45, 5));

  num("media", "calcular", "q4", media([14, 16, 18, 20]));
});

teste("média · lição 3 — a média fica entre o menor e o maior", () => {
  // A propriedade é conferida por força bruta, e não afirmada: cem listas
  // aleatórias, e em nenhuma a média pode escapar da faixa dos valores.
  let semente = 20260906;
  const sorteia = (max) => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente % max; };
  for (let i = 0; i < 100; i++) {
    const lista = Array.from({ length: 2 + sorteia(6) }, () => sorteia(50));
    const m = media(lista);
    assert.ok(m >= Math.min(...lista) - 1e-9, `média ${m} abaixo do menor de ${lista}`);
    assert.ok(m <= Math.max(...lista) + 1e-9, `média ${m} acima do maior de ${lista}`);
  }

  assert.equal(media([4, 9, 11]), 8, "o exemplo resolvido não fecha");

  // 25 não pode ser a média de 6, 7 e 20: passa do maior valor
  assert.ok(25 > Math.max(6, 7, 20));
  assert.equal(media([6, 7, 20]), 11);
  alt("media", "entre-extremos", "q1", "Não, porque a média nunca passa do maior valor");

  num("media", "entre-extremos", "q2", media([2, 4, 6, 8, 10]));

  // entre as opções, só uma cai dentro da faixa — e é a média mesmo
  const lista = [10, 12, 14];
  const possiveis = [12, 9, 15, 36].filter((v) => v >= Math.min(...lista) && v <= Math.max(...lista));
  assert.deepEqual(possiveis, [12]);
  assert.equal(media(lista), 12);
  alt("media", "entre-extremos", "q3", "12");

  // a média não é o meio dos extremos: com três cincos ela cai perto do 5
  const quatro = [5, 5, 5, 17];
  assert.equal(media(quatro), 8);
  assert.equal((Math.min(...quatro) + Math.max(...quatro)) / 2, 11);
  assert.notEqual(media(quatro), 11);
  num("media", "entre-extremos", "q4", media(quatro));
});

teste("média · lição 4 — o problema inverso", () => {
  const somaDe = (m, quantos) => m * quantos;
  assert.equal(somaDe(7, 4), 28, "o exemplo resolvido não fecha");
  assert.equal(28 - (6 + 8 + 7), 7);
  assert.equal(media([6, 8, 7, 7]), 7, "a nota achada tem de devolver a média pedida");

  num("media", "com-media", "q1", somaDe(12, 5));

  const quarta = somaDe(8, 4) - (7 + 9 + 8);
  assert.equal(quarta, 8);
  assert.equal(media([7, 9, 8, quarta]), 8);
  num("media", "com-media", "q2", quarta);

  num("media", "com-media", "q3", somaDe(3, 6));

  // nota acima da média sobe, igual mantém, abaixo desce — conferido nos três
  const atual = 7, provas = 3;
  const depois = (nota) => (somaDe(atual, provas) + nota) / (provas + 1);
  assert.ok(depois(9) > atual, "nota acima da média tem de subir o resultado");
  assert.equal(depois(7), atual, "nota igual à média mantém");
  assert.ok(depois(6) < atual, "nota abaixo da média derruba");
  alt("media", "com-media", "q4", "Mais que 7");
});

teste("média · lição 5 — um valor distante puxa a média sozinho", () => {
  const livros = [2, 4, 2, 4, 38];

  assert.equal(media(livros), 10);
  num("media", "quando-mente", "q1", media(livros));

  // a média não é o valor de ninguém, e quase todos ficam abaixo dela
  assert.ok(!livros.includes(media(livros)), "nenhuma pessoa do grupo leu exatamente a média");
  const abaixo = livros.filter((v) => v < media(livros));
  assert.equal(abaixo.length, 4);
  num("media", "quando-mente", "q2", abaixo.length);

  alt("media", "quando-mente", "q3", "Porque um valor muito maior que os outros puxou a média para cima");

  const semExtremo = livros.filter((v) => v !== 38);
  assert.equal(semExtremo.length, 4, "sai o valor e sai também o lugar dele na divisão");
  assert.equal(media(semExtremo), 3);
  num("media", "quando-mente", "q4", media(semExtremo));

  // o tamanho do estrago: um único número mudou a média de 3 para 10
  assert.ok(media(livros) > 3 * media(semExtremo));
});

teste("média · lição 6 — escolher a conta certa", () => {
  num("media", "problemas", "q1", media([24, 22, 26, 23, 25]));
  assert.equal(media([6, 9, 7, 10]), 8, "o exemplo resolvido não fecha");

  const terceiro = 12 * 3 - (9 + 11);
  assert.equal(terceiro, 16);
  assert.equal(media([9, 11, terceiro]), 12);
  num("media", "problemas", "q2", terceiro);

  num("media", "problemas", "q3", 2 * 9);

  // dois grupos com a mesma média e distribuições bem diferentes
  const A = [5, 5, 5], B = [1, 5, 9];
  assert.equal(media(A), media(B));
  assert.notDeepEqual(A, B);
  assert.equal(Math.max(...A) - Math.min(...A), 0);
  assert.equal(Math.max(...B) - Math.min(...B), 8);
  alt("media", "problemas", "q4", "Os dois grupos têm média 5, mas notas bem diferentes");
});

// ---------- Números inteiros (7º ano) ----------
//
// A matéria toda é sobre ORDEM e SINAL, então a conferência não pode se apoiar
// nos operadores do JavaScript, que já sabem lidar com negativos. Aqui as
// operações são refeitas pela definição da lição: andar na reta, casa por casa.

/** Anda `passos` casas na reta a partir de `origem`, uma de cada vez. */
function andar(origem, passos) {
  let onde = origem;
  const direcao = passos < 0 ? -1 : 1;
  for (let i = 0; i < Math.abs(passos); i++) onde += direcao;
  return onde;
}

/** Soma pela definição da lição 4: somar é andar na reta. */
const somaNaReta = (a, b) => andar(a, b);

/** Subtração pela definição da lição 5: somar o oposto. */
const oposto = (n) => 0 - n;
const subtraiPeloOposto = (a, b) => somaNaReta(a, oposto(b));

/** Multiplicação por soma repetida, inclusive com multiplicador negativo. */
function multiplicaRepetindo(a, b) {
  let total = 0;
  for (let i = 0; i < Math.abs(b); i++) total = somaNaReta(total, a);
  return b < 0 ? oposto(total) : total;
}

/** Distância até o zero, contando casas — nunca negativa por construção. */
function distanciaAteZero(n) {
  let passos = 0;
  let onde = n;
  while (onde !== 0) {
    onde += onde < 0 ? 1 : -1;
    passos += 1;
  }
  return passos;
}

/** "a está à esquerda de b?" percorrendo a reta da esquerda para a direita. */
function estaAEsquerda(a, b) {
  for (let x = Math.min(a, b) - 1; x <= Math.max(a, b) + 1; x++) {
    if (x === a && x !== b) return true;
    if (x === b && x !== a) return false;
  }
  return false;
}

teste("inteiros · a aritmética da reta bate com a do JavaScript", () => {
  // Se as funções de referência estiverem erradas, todo o resto do bloco
  // estaria conferindo lixo contra lixo. Este teste ancora as duas coisas.
  // `assert.equal` é estrito e separa 0 de −0, que aparece em toda
  // multiplicação por zero. Aqui a comparação é por ===, que os iguala.
  const mesmo = (x, y, msg) => assert.ok(x === y, `${msg}: ${x} ≠ ${y}`);
  for (let a = -12; a <= 12; a++) {
    mesmo(distanciaAteZero(a), Math.abs(a), `distância de ${a}`);
    mesmo(oposto(a), -a, `oposto de ${a}`);
    for (let b = -12; b <= 12; b++) {
      mesmo(somaNaReta(a, b), a + b, `${a} + ${b}`);
      mesmo(subtraiPeloOposto(a, b), a - b, `${a} − ${b}`);
      mesmo(multiplicaRepetindo(a, b), a * b, `${a} × ${b}`);
      if (a !== b) assert.equal(estaAEsquerda(a, b), a < b, `${a} à esquerda de ${b}`);
    }
  }
});

teste("inteiros · lição 1 — o sinal diz o lado do zero", () => {
  // Descer do térreo: cada andar percorrido tira um do número, e o próprio
  // térreo é o ponto de partida — não um andar de descida.
  let andarAtual = 0;
  for (let i = 0; i < 2; i++) andarAtual -= 1;
  assert.equal(andarAtual, -2);
  alt("inteiros", "o-que-e", "q1", "−2");

  alt("inteiros", "o-que-e", "q2", "Uma dívida de 30 reais");
  num("inteiros", "o-que-e", "q3", oposto(200));
  alt("inteiros", "o-que-e", "q4", "Não é positivo nem negativo: é a fronteira entre os dois lados");

  // o zero não é mais o menor: existe reta à esquerda dele
  assert.ok(estaAEsquerda(-1, 0), "−1 tem de estar à esquerda do zero");
});

teste("inteiros · lição 2 — oposto e distância até o zero", () => {
  assert.equal(oposto(-4), 4, "o exemplo resolvido não fecha");
  assert.equal(distanciaAteZero(-4), distanciaAteZero(4), "opostos ficam à mesma distância do zero");

  alt("inteiros", "na-reta", "q1", "−3");
  num("inteiros", "na-reta", "q2", oposto(-7));
  num("inteiros", "na-reta", "q3", distanciaAteZero(-6));

  // só um número diferente empata a distância de −9: o oposto dele
  const empatam = [];
  for (let n = -20; n <= 20; n++) {
    if (n !== -9 && distanciaAteZero(n) === distanciaAteZero(-9)) empatam.push(n);
  }
  assert.deepEqual(empatam, [9], "o oposto tem de ser o único a empatar");
  num("inteiros", "na-reta", "q4", empatam[0]);

  // o zero é o único que é oposto de si mesmo
  const autoOpostos = [];
  for (let n = -20; n <= 20; n++) if (oposto(n) === n) autoOpostos.push(n);
  assert.deepEqual(autoOpostos, [0]);
});

teste("inteiros · lição 3 — entre negativos a ordem se inverte", () => {
  // O coração da matéria: a distância maior até o zero faz o número MENOR.
  assert.ok(estaAEsquerda(-7, -3), "−7 tem de ficar à esquerda de −3");
  assert.ok(distanciaAteZero(-7) > distanciaAteZero(-3), "e mesmo assim estar mais longe do zero");
  alt("inteiros", "comparar", "q1", "−2");

  // ordenar é ler a reta da esquerda para a direita
  const lista = [2, -5, 0, -1];
  const crescente = [...lista].sort((a, b) => (estaAEsquerda(a, b) ? -1 : 1));
  assert.deepEqual(crescente, [-5, -1, 0, 2]);
  // O conteúdo escreve negativo com o menos tipográfico (−), e não com o
  // hífen do teclado; a comparação tem de usar o mesmo caractere.
  const comSinal = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n));
  alt("inteiros", "comparar", "q2", crescente.map(comSinal).join(" · "));

  const temperaturas = [-8, 3, -1, 0];
  const maisFria = temperaturas.reduce((a, b) => (estaAEsquerda(b, a) ? b : a));
  assert.equal(maisFria, -8);
  num("inteiros", "comparar", "q3", maisFria);

  // todo negativo é menor que todo positivo, sem exceção na faixa testada
  for (let n = -30; n < 0; n++) {
    for (let p = 1; p <= 30; p++) {
      assert.ok(estaAEsquerda(n, p), `${n} deveria ser menor que ${p}`);
    }
  }
  alt("inteiros", "comparar", "q4", "Qualquer número negativo é menor que qualquer positivo");
});

teste("inteiros · lição 4 — somar é andar na reta", () => {
  assert.equal(somaNaReta(-2, 5), 3, "o exemplo resolvido não fecha");

  num("inteiros", "somar", "q1", somaNaReta(-7, 3));
  num("inteiros", "somar", "q2", somaNaReta(-4, -6));
  num("inteiros", "somar", "q3", somaNaReta(50, -80));
  num("inteiros", "somar", "q4", somaNaReta(8, -8));

  // sinais iguais acumulam; sinais diferentes é cabo de guerra
  assert.equal(distanciaAteZero(somaNaReta(-4, -6)), distanciaAteZero(-4) + distanciaAteZero(-6));
  assert.equal(
    distanciaAteZero(somaNaReta(-7, 3)),
    distanciaAteZero(-7) - distanciaAteZero(3),
    "sobra a diferença das distâncias"
  );

  // somar o oposto sempre zera, em toda a faixa
  for (let n = -20; n <= 20; n++) assert.equal(somaNaReta(n, oposto(n)), 0);
});

teste("inteiros · lição 5 — subtrair é somar o oposto", () => {
  assert.equal(subtraiPeloOposto(-5, -3), -2, "o exemplo resolvido não fecha");

  num("inteiros", "subtrair", "q1", subtraiPeloOposto(4, 9));
  num("inteiros", "subtrair", "q2", subtraiPeloOposto(-3, 5));
  num("inteiros", "subtrair", "q3", subtraiPeloOposto(-6, -10));

  // variação é o final menos o inicial, e subir de −8 para 3 é ganho
  const variacao = subtraiPeloOposto(3, -8);
  assert.equal(variacao, 11);
  assert.ok(variacao > 0, "a temperatura subiu, então a variação é positiva");
  assert.equal(variacao, distanciaAteZero(-8) + distanciaAteZero(3), "conta contornando o zero");
  num("inteiros", "subtrair", "q4", variacao);

  // subtrair um negativo AUMENTA — a afirmação central da lição
  for (let a = -10; a <= 10; a++) {
    for (let b = -10; b < 0; b++) {
      assert.ok(subtraiPeloOposto(a, b) > a, `${a} − (${b}) deveria ser maior que ${a}`);
    }
  }
});

teste("inteiros · lição 6 — a regra dos sinais sai do padrão", () => {
  // A tabela do exemplo resolvido: descendo o multiplicador de um em um, o
  // resultado sobe sempre a mesma coisa — inclusive depois de passar do zero.
  const linha = [];
  for (let b = 3; b >= -3; b--) linha.push(multiplicaRepetindo(-4, b));
  assert.deepEqual(linha, [-12, -8, -4, 0, 4, 8, 12]);
  for (let i = 1; i < linha.length; i++) {
    assert.equal(linha[i] - linha[i - 1], 4, "o padrão não pode quebrar no zero");
  }

  num("inteiros", "multiplicar-dividir", "q1", multiplicaRepetindo(-6, 7));
  num("inteiros", "multiplicar-dividir", "q2", multiplicaRepetindo(-3, -5));

  // divisão conferida pela multiplicação: o quociente devolve o dividendo
  const quociente = -8 / -2;
  assert.equal(multiplicaRepetindo(quociente, -2), -8);
  num("inteiros", "multiplicar-dividir", "q3", quociente);

  // a regra vale em toda a faixa, sem exceção
  for (let a = -12; a <= 12; a++) {
    for (let b = -12; b <= 12; b++) {
      if (a === 0 || b === 0) continue;
      const produto = multiplicaRepetindo(a, b);
      const sinaisIguais = (a < 0) === (b < 0);
      assert.equal(produto > 0, sinaisIguais, `sinal de ${a} × ${b}`);
      assert.equal(distanciaAteZero(produto), distanciaAteZero(a) * distanciaAteZero(b));
    }
  }

  // potência de base negativa: o expoente ímpar deixa um sinal sobrando
  const potencia = (base, expoente) => {
    let r = 1;
    for (let i = 0; i < expoente; i++) r = multiplicaRepetindo(r, base);
    return r;
  };
  assert.equal(potencia(-2, 3), -8);
  assert.equal(potencia(-2, 4), 16);
  for (let e = 1; e <= 6; e++) {
    assert.equal(potencia(-2, e) < 0, e % 2 === 1, `sinal de (−2)^${e}`);
  }
  alt("inteiros", "multiplicar-dividir", "q4", "Negativo, porque o expoente é ímpar");
});

teste("inteiros · lição 7 — traduzir o problema em sinais", () => {
  // Elevador: 3º andar, desce 7, sobe 2.
  let onde = 3;
  onde = somaNaReta(onde, -7);
  assert.equal(onde, -4);
  onde = somaNaReta(onde, 2);
  assert.equal(onde, -2, "o exemplo resolvido não fecha");

  // Conta bancária, movimento por movimento e na ordem.
  const saldo = somaNaReta(somaNaReta(180, -250), 40);
  assert.equal(saldo, -30);
  num("inteiros", "problemas", "q1", saldo);

  // Diferença entre duas temperaturas é comprimento: não tem sinal.
  const diferenca = subtraiPeloOposto(4, -11);
  assert.equal(diferenca, 15);
  assert.ok(diferenca > 0);
  assert.equal(diferenca, distanciaAteZero(-11) + distanciaAteZero(4));
  num("inteiros", "problemas", "q2", diferenca);

  // Mergulho: os dois movimentos vão para o mesmo lado, então acumulam.
  const profundidade = somaNaReta(-8, -7);
  assert.equal(profundidade, -15);
  assert.equal(distanciaAteZero(profundidade), 8 + 7);
  num("inteiros", "problemas", "q3", profundidade);

  // Jogo: quatro erros de −5 é repetição, e não soma dos dois números.
  const pontos = multiplicaRepetindo(-5, 4);
  assert.equal(pontos, -20);
  assert.notEqual(pontos, somaNaReta(-5, 4), "somar em vez de repetir daria outro número");
  num("inteiros", "problemas", "q4", somaNaReta(0, pontos));
});

// ---------- Números racionais (7º ano) ----------
//
// Aqui a conferência não pode usar ponto flutuante para o que a matéria
// ensina: 1/3 não existe em binário, e 0,1 + 0,2 dá 0,30000000000000004. As
// contas são refeitas com frações de INTEIROS, que é a própria definição de
// racional, e só no fim viram decimal para comparar com o JSON.

/** Um racional é o par {n, d}, sempre com o d positivo e já simplificado. */
function racional(n, d) {
  if (d === 0) throw new Error("denominador zero não é número");
  const sinal = d < 0 ? -1 : 1;
  const mdcAbs = (a, b) => (b === 0 ? Math.abs(a) : mdcAbs(b, a % b));
  const g = mdcAbs(n, d) || 1;
  return { n: (sinal * n) / g, d: (sinal * d) / g };
}
const somaR = (a, b) => racional(a.n * b.d + b.n * a.d, a.d * b.d);
const opostoR = (a) => racional(-a.n, a.d);
const subR = (a, b) => somaR(a, opostoR(b));
const multR = (a, b) => racional(a.n * b.n, a.d * b.d);
const inversoR = (a) => racional(a.d, a.n);
const divR = (a, b) => multR(a, inversoR(b));
const paraDecimal = (a) => a.n / a.d;
const menorR = (a, b) => a.n * b.d < b.n * a.d;   // com d > 0, comparar cruzado
const texto = (a) => (a.n < 0 ? `−${Math.abs(a.n)}/${a.d}` : `${a.n}/${a.d}`);

teste("racionais · a aritmética de frações bate com a decimal", () => {
  // Ancora as funções de referência: se elas estiverem erradas, o bloco
  // inteiro estaria conferindo lixo contra lixo.
  for (let an = -6; an <= 6; an++) {
    for (let ad = 1; ad <= 6; ad++) {
      const a = racional(an, ad);
      assert.ok(Math.abs(paraDecimal(somaR(a, a)) - 2 * paraDecimal(a)) < 1e-9);
      assert.ok(Math.abs(paraDecimal(opostoR(a)) + paraDecimal(a)) < 1e-9);
      for (let bn = -6; bn <= 6; bn++) {
        for (let bd = 1; bd <= 6; bd++) {
          const b = racional(bn, bd);
          assert.ok(Math.abs(paraDecimal(somaR(a, b)) - (paraDecimal(a) + paraDecimal(b))) < 1e-9);
          assert.ok(Math.abs(paraDecimal(subR(a, b)) - (paraDecimal(a) - paraDecimal(b))) < 1e-9);
          assert.ok(Math.abs(paraDecimal(multR(a, b)) - paraDecimal(a) * paraDecimal(b)) < 1e-9);
          if (bn !== 0) {
            assert.ok(Math.abs(paraDecimal(divR(a, b)) - paraDecimal(a) / paraDecimal(b)) < 1e-9);
          }
          if (paraDecimal(a) !== paraDecimal(b)) {
            assert.equal(menorR(a, b), paraDecimal(a) < paraDecimal(b), `${texto(a)} < ${texto(b)}`);
          }
        }
      }
    }
  }
});

teste("racionais · lição 1 — todo inteiro e todo decimal cabe numa fração", () => {
  // Inteiro vira fração com 1 embaixo; decimal finito, com potência de dez.
  for (let k = -10; k <= 10; k++) {
    assert.equal(paraDecimal(racional(k, 1)), k, `${k} = ${k}/1`);
  }
  assert.equal(paraDecimal(racional(-6, 10)), -0.6, "−0,6 = −6/10");
  assert.deepEqual(racional(-6, 10), { n: -3, d: 5 }, "e simplifica para −3/5");
  assert.throws(() => racional(7, 0), /denominador zero/);

  alt("racionais", "o-que-e", "q1", "7/0");
  num("racionais", "o-que-e", "q2", racional(-6, 1).n);
  num("racionais", "o-que-e", "q3", 8);
  assert.equal(paraDecimal(racional(8, 10)), 0.8, "0,8 = 8/10");

  // o sinal pode morar em cima, embaixo ou na frente: os três valem o mesmo
  assert.equal(paraDecimal(racional(-3, 4)), paraDecimal(racional(3, -4)));
  assert.notEqual(paraDecimal(racional(-3, 4)), paraDecimal(racional(-3, -4)));
  alt("racionais", "o-que-e", "q4", "Vale o mesmo que 3/(−4)");
});

teste("racionais · lição 2 — racionais na reta", () => {
  const menosTresQuartos = racional(-3, 4);
  assert.ok(menorR(racional(-1, 1), menosTresQuartos), "−1 < −3/4");
  assert.ok(menorR(menosTresQuartos, racional(0, 1)), "−3/4 < 0");

  alt("racionais", "na-reta", "q1", "−5/4");
  assert.ok(menorR(racional(-5, 4), racional(-1, 1)), "−5/4 já passou do −1");

  // −1,3 fica entre −2 e −1: a parte inteira decide a vizinhança
  const menosUmVirgulaTres = racional(-13, 10);
  assert.ok(menorR(racional(-2, 1), menosUmVirgulaTres) && menorR(menosUmVirgulaTres, racional(-1, 1)));
  alt("racionais", "na-reta", "q2", "Entre −2 e −1");

  assert.deepEqual(opostoR(racional(-2, 5)), racional(2, 5));
  alt("racionais", "na-reta", "q3", "2/5");

  // entre dois racionais quaisquer sempre cabe outro — o meio deles
  let esquerda = racional(-1, 1);
  const direita = racional(0, 1);
  for (let i = 0; i < 12; i++) {
    const meio = multR(somaR(esquerda, direita), racional(1, 2));
    assert.ok(menorR(esquerda, meio) && menorR(meio, direita), "o meio tem de cair entre os dois");
    esquerda = meio;
  }
  alt("racionais", "na-reta", "q4", "Infinitos");
});

teste("racionais · lição 3 — as três formas do mesmo número", () => {
  assert.equal(paraDecimal(racional(3, 4)), 0.75, "o exemplo resolvido não fecha");
  assert.equal(paraDecimal(racional(-3, 4)), -0.75, "converter não muda o lado do zero");

  num("racionais", "formas", "q1", paraDecimal(racional(2, 5)));
  assert.deepEqual(racional(6, 10), { n: 3, d: 5 }, "0,6 simplificado é 3/5");
  alt("racionais", "formas", "q2", "3/5");
  num("racionais", "formas", "q3", paraDecimal(racional(-1, 2)));

  // porcentagem é a fração de denominador 100
  const comoPorcentagem = (r) => paraDecimal(multR(r, racional(100, 1)));
  assert.equal(comoPorcentagem(racional(3, 4)), 75);
  assert.equal(comoPorcentagem(racional(1, 4)), 25);

  // e o intruso da questão 4 é o único que não vale um quarto
  const trio = { "2/5": racional(2, 5), "0,25": racional(25, 100), "25%": racional(25, 100) };
  assert.equal(paraDecimal(trio["0,25"]), paraDecimal(trio["25%"]));
  assert.notEqual(paraDecimal(trio["2/5"]), paraDecimal(trio["0,25"]));
  alt("racionais", "formas", "q4", "2/5");
});

teste("racionais · lição 4 — comparar troca de ordem no lado negativo", () => {
  assert.ok(menorR(racional(-3, 4), racional(-1, 2)), "o exemplo resolvido não fecha");
  assert.ok(menorR(racional(1, 2), racional(3, 4)), "e do lado positivo a ordem é a oposta");

  alt("racionais", "comparar", "q1", "−1/3");
  assert.ok(menorR(racional(-2, 3), racional(-1, 3)));

  assert.ok(menorR(racional(7, 10), racional(3, 4)), "0,7 < 3/4");
  alt("racionais", "comparar", "q2", "3/4");

  const lista = [racional(1, 2), racional(-1, 4), racional(-3, 2), racional(0, 1)];
  const crescente = [...lista].sort((a, b) => (menorR(a, b) ? -1 : 1)).map(paraDecimal);
  assert.deepEqual(crescente, [-1.5, -0.25, 0, 0.5]);
  alt("racionais", "comparar", "q3", "−1,5 · −1/4 · 0 · 0,5");

  // trocar o sinal dos dois inverte a comparação, sempre
  for (let an = 1; an <= 8; an++) {
    for (let bn = 1; bn <= 8; bn++) {
      const a = racional(an, 8), b = racional(bn, 8);
      if (paraDecimal(a) === paraDecimal(b)) continue;
      assert.equal(menorR(a, b), menorR(opostoR(b), opostoR(a)), "o espelho no zero inverte");
    }
  }
  alt("racionais", "comparar", "q4", "−5/8 é MENOR que −1/2");
});

teste("racionais · lição 5 — somar e subtrair", () => {
  assert.deepEqual(somaR(racional(-1, 2), racional(1, 4)), racional(-1, 4), "o exemplo resolvido não fecha");

  alt("racionais", "somar-subtrair", "q1", texto(somaR(racional(-3, 5), racional(1, 5))));
  alt("racionais", "somar-subtrair", "q2", texto(subR(racional(1, 3), racional(5, 3))));

  // decimais entram como frações de potência de dez, sem erro de arredondamento
  const decimal = somaR(racional(-25, 10), racional(18, 10));
  assert.deepEqual(decimal, racional(-7, 10));
  num("racionais", "somar-subtrair", "q3", paraDecimal(decimal));

  alt("racionais", "somar-subtrair", "q4", texto(somaR(racional(-1, 4), racional(-1, 2))));

  // somar dois negativos acumula a distância; o denominador nunca é somado
  const soma = somaR(racional(-1, 4), racional(-1, 2));
  assert.ok(paraDecimal(soma) < Math.min(paraDecimal(racional(-1, 4)), paraDecimal(racional(-1, 2))));
  assert.notEqual(soma.d, 4 + 2, "o denominador não entra na soma");
});

teste("racionais · lição 6 — multiplicar e dividir", () => {
  assert.deepEqual(multR(racional(-2, 3), racional(4, 5)), racional(-8, 15), "o exemplo resolvido não fecha");
  assert.equal(paraDecimal(divR(racional(4, 1), racional(2, 3))), 6);

  alt("racionais", "multiplicar-dividir", "q1", texto(multR(racional(-1, 2), racional(3, 5))));
  num("racionais", "multiplicar-dividir", "q2", paraDecimal(divR(racional(4, 1), racional(1, 2))));
  alt("racionais", "multiplicar-dividir", "q3", texto(inversoR(racional(-3, 4))));
  num("racionais", "multiplicar-dividir", "q4", paraDecimal(multR(racional(10, 1), racional(1, 2))));

  // inverso e oposto são coisas diferentes, e o inverso não muda o lado do zero
  const r = racional(-3, 4);
  assert.deepEqual(multR(r, inversoR(r)), racional(1, 1), "número vezes o inverso dá 1");
  assert.deepEqual(somaR(r, opostoR(r)), racional(0, 1), "número mais o oposto dá 0");
  assert.equal(paraDecimal(inversoR(r)) < 0, paraDecimal(r) < 0, "o inverso fica do mesmo lado");
  assert.notEqual(paraDecimal(inversoR(r)), paraDecimal(opostoR(r)));

  // multiplicar por fração menor que 1 diminui; dividir por ela aumenta
  for (let n = 1; n <= 9; n++) {
    const fracaoPequena = racional(n, 10);
    const base = racional(10, 1);
    assert.ok(paraDecimal(multR(base, fracaoPequena)) < paraDecimal(base), "multiplicar diminuiu");
    assert.ok(paraDecimal(divR(base, fracaoPequena)) > paraDecimal(base), "dividir aumentou");
  }
});

teste("racionais · lição 7 — escolher a forma antes de calcular", () => {
  // Bolo: a fração que sobra e quanto ela vale em gramas são duas perguntas.
  const sobrou = subR(racional(1, 1), racional(2, 5));
  assert.deepEqual(sobrou, racional(3, 5));
  assert.equal(paraDecimal(multR(sobrou, racional(800, 1))), 480, "o exemplo resolvido não fecha");

  // Garrafa: decimais como frações de décimos e centésimos, sem ponto flutuante.
  const restou = subR(racional(15, 10), somaR(racional(4, 10), racional(35, 100)));
  assert.deepEqual(restou, racional(3, 4));
  num("racionais", "problemas", "q1", paraDecimal(restou));

  const saldo = somaR(racional(-40, 1), racional(255, 10));
  assert.deepEqual(saldo, racional(-29, 2));
  assert.ok(paraDecimal(saldo) < 0, "o depósito não cobriu a dívida");
  num("racionais", "problemas", "q2", paraDecimal(saldo));

  const deOnibus = multR(racional(2, 5), racional(30, 1));
  assert.deepEqual(deOnibus, racional(12, 1));
  assert.ok(paraDecimal(deOnibus) < 30 / 2, "dois quintos é menos que a metade");
  num("racionais", "problemas", "q3", paraDecimal(deOnibus));

  const pedacos = divR(racional(6, 1), racional(3, 4));
  assert.deepEqual(pedacos, racional(8, 1));
  assert.deepEqual(multR(pedacos, racional(3, 4)), racional(6, 1), "os pedaços recompõem a fita");
  num("racionais", "problemas", "q4", paraDecimal(pedacos));
});

// ---------- Razão e proporção (7º ano) ----------
//
// A matéria vive de duas afirmações que precisam ser conferidas, e não
// aceitas: que a razão sobrevive a mudar de tamanho (e a diferença não), e
// que a propriedade fundamental vale sempre. As duas são testadas por força
// bruta, e não em cima dos exemplos escolhidos para a lição.

/** Razão simplificada, como a lição manda escrever. */
function razaoSimples(a, b) {
  const mdcAbs = (x, y) => (y === 0 ? Math.abs(x) : mdcAbs(y, x % y));
  const g = mdcAbs(a, b) || 1;
  return `${a / g}/${b / g}`;
}
/** Termo que falta numa proporção a/b = c/d, pela multiplicação em cruz. */
const cruzada = { extremos: (a, d) => a * d, meios: (b, c) => b * c };

teste("razão · a razão sobrevive à mudança de tamanho; a diferença, não", () => {
  // A afirmação central da lição 1, testada em toda a faixa em vez de só no
  // exemplo da turma.
  for (let a = 1; a <= 20; a++) {
    for (let b = 1; b <= 20; b++) {
      for (const k of [2, 3, 5, 10]) {
        assert.equal(razaoSimples(a, b), razaoSimples(a * k, b * k), `${a}/${b} ampliada por ${k}`);
        if (a !== b) {
          assert.notEqual(a - b, a * k - b * k, `a diferença de ${a} e ${b} não podia sobreviver ao ×${k}`);
        }
      }
    }
  }
});

teste("razão · lição 1 — comparar por divisão", () => {
  assert.equal(razaoSimples(12, 8), "3/2", "o exemplo resolvido não fecha");
  alt("razao-proporcao", "o-que-e-razao", "q1", razaoSimples(10, 15));
  num("razao-proporcao", "o-que-e-razao", "q2", 240 / 3);

  // as duas turmas: mesma razão, diferenças diferentes
  assert.equal(razaoSimples(12, 8), razaoSimples(24, 16));
  assert.notEqual(12 - 8, 24 - 16);
  alt("razao-proporcao", "o-que-e-razao", "q3", "As duas turmas têm a mesma razão, mas diferenças diferentes");

  // inverter a ordem inverte a fração
  assert.equal(razaoSimples(2, 3), "2/3");
  alt("razao-proporcao", "o-que-e-razao", "q4", "2/3");
});

teste("razão · lição 2 — proporção é igualdade de razões", () => {
  const formaProporcao = (a, b, c, d) => a * d === b * c;

  assert.ok(formaProporcao(3, 2, 6, 4), "o exemplo resolvido não fecha");
  assert.ok(formaProporcao(2, 5, 8, 20));
  alt("razao-proporcao", "proporcao", "q1", "Sim, porque 8/20 simplificado é 2/5");

  // o intruso da questão 2 é o único par que não forma proporção
  const pares = [[3, 4, 9, 16], [1, 2, 5, 10], [2, 3, 10, 15], [4, 5, 12, 15]];
  const falham = pares.filter(([a, b, c, d]) => !formaProporcao(a, b, c, d));
  assert.equal(falham.length, 1, "só um par pode falhar");
  assert.deepEqual(falham[0], [3, 4, 9, 16]);
  alt("razao-proporcao", "proporcao", "q2", "3/4 e 9/16");

  // dobrar a receita mantém a proporção
  assert.ok(formaProporcao(4, 6, 8, 12));
  num("razao-proporcao", "proporcao", "q3", 6 * 2);

  // ampliar a foto pelo mesmo fator mantém o formato
  const fator = 10 / 4;
  assert.equal(6 * fator, 15);
  assert.ok(formaProporcao(4, 6, 10, 15));
  num("razao-proporcao", "proporcao", "q4", 6 * fator);
});

teste("razão · lição 3 — a propriedade fundamental vale sempre", () => {
  // Força bruta: em toda proporção montada por ampliação, o produto dos
  // extremos tem de bater com o dos meios.
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      for (const k of [2, 3, 4, 5]) {
        const c = a * k, d = b * k;
        assert.equal(cruzada.extremos(a, d), cruzada.meios(b, c), `${a}/${b} = ${c}/${d}`);
      }
    }
  }

  // 3/4 = x/20 → x = 15, e o valor achado devolve a proporção
  const x0 = (3 * 20) / 4;
  assert.equal(x0, 15);
  assert.equal(cruzada.extremos(3, 20), cruzada.meios(4, x0));

  const x1 = (2 * 12) / 3;
  assert.equal(x1, 8);
  num("razao-proporcao", "propriedade", "q1", x1);

  // 5/x = 15/9 → o x está no denominador
  const x2 = (5 * 9) / 15;
  assert.equal(x2, 3);
  assert.equal(cruzada.extremos(5, 9), cruzada.meios(x2, 15));
  num("razao-proporcao", "propriedade", "q2", x2);

  const preco = (30 * 6) / 4;
  assert.equal(preco, 45);
  assert.equal(30 / 4, preco / 6, "o preço por caderno tem de bater nos dois casos");
  num("razao-proporcao", "propriedade", "q3", preco);

  alt("razao-proporcao", "propriedade", "q4", "a × d = b × c");
});

teste("razão · lição 4 — escala é desenho para real", () => {
  const real = (desenho, escala) => desenho * escala;
  const papel = (medidaReal, escala) => medidaReal / escala;

  // o exemplo resolvido, com a conversão de unidade no fim
  assert.equal(real(4, 50000), 200000);
  assert.equal(200000 / 100000, 2, "200 000 cm são 2 km");

  num("razao-proporcao", "escala", "q1", real(6, 100));
  assert.equal(8 * 100, 800, "8 m são 800 cm");
  num("razao-proporcao", "escala", "q2", papel(800, 200));
  alt("razao-proporcao", "escala", "q3", "O desenho é 20 vezes maior que a peça real");

  // o trecho do mapa, pela proporção
  const km = (15 * 8) / 3;
  assert.equal(km, 40);
  assert.equal(15 / 3, km / 8, "a razão km por cm tem de se manter");
  num("razao-proporcao", "escala", "q4", km);

  // ida e volta: encolher e ampliar de novo devolve a medida original
  for (const escala of [10, 100, 200, 50000]) {
    for (const medida of [1, 4, 8, 800]) {
      assert.equal(papel(real(medida, escala), escala), medida);
    }
  }
});

teste("razão · lição 5 — direta guarda a razão, inversa guarda o produto", () => {
  const razaoConstante = (pares) => new Set(pares.map(([x, y]) => y / x)).size === 1;
  const produtoConstante = (pares) => new Set(pares.map(([x, y]) => x * y)).size === 1;

  const cadernos = [[1, 6], [2, 12], [3, 18], [4, 24]];
  assert.ok(razaoConstante(cadernos), "o exemplo resolvido não fecha");
  assert.ok(!produtoConstante(cadernos), "na direta o produto NÃO se mantém");

  // pedreiros e dias: inversamente proporcionais
  const dias = (3 * 12) / 6;
  assert.equal(dias, 6);
  assert.equal(3 * 12, 6 * dias, "o produto tem de se manter");
  assert.ok(dias < 12, "mais gente termina antes");
  num("razao-proporcao", "grandezas", "q1", dias);

  const distancia = 80 * 3;
  assert.equal(distancia, 240);
  assert.ok(razaoConstante([[1, 80], [3, distancia]]));
  num("razao-proporcao", "grandezas", "q2", distancia);

  alt("razao-proporcao", "grandezas", "q3", "A idade de uma pessoa e a altura dela");

  const tabela = [[2, 30], [4, 15], [8, 7.5]];
  assert.ok(!razaoConstante(tabela), "a razão não pode ser constante aqui");
  assert.ok(produtoConstante(tabela));
  assert.equal(2 * 30, 60);
  alt("razao-proporcao", "grandezas", "q4", "Inversamente proporcionais, porque o produto é sempre 60");

  // e as somas da alternativa errada realmente não batem
  assert.notEqual(2 + 30, 4 + 15);
});

teste("razão · lição 6 — montar sem trocar os lados", () => {
  // O exemplo resolvido, com a conferência de direção que a lição ensina.
  const preco = (30 * 8) / 5;
  assert.equal(preco, 48);
  assert.ok(preco > 30, "mais arroz custa mais");
  assert.equal(30 / 5, preco / 8, "o preço por quilo tem de bater");

  const minutos = (12 * 5) / 3;
  assert.equal(minutos, 20);
  assert.ok(minutos > 12, "mais baldes leva mais tempo");
  num("razao-proporcao", "problemas", "q1", minutos);

  num("razao-proporcao", "problemas", "q2", 36 / 2);

  // obra: inversa, então o produto se mantém e o tempo AUMENTA
  const diasObra = (6 * 10) / 5;
  assert.equal(diasObra, 12);
  assert.equal(6 * 10, 5 * diasObra);
  assert.ok(diasObra > 10, "menos operários demora mais");
  num("razao-proporcao", "problemas", "q3", diasObra);

  const agua = (5 * 8) / 2;
  assert.equal(agua, 20);
  assert.ok(agua > 8, "a receita leva mais água que polpa");
  assert.equal(razaoSimples(8, agua), razaoSimples(2, 5), "a proporção original tem de se manter");
  num("razao-proporcao", "problemas", "q4", agua);
});

// ---------- Regra de três (7º ano) ----------
//
// A matéria tem um risco próprio: virar receita. Por isso a conferência aqui
// não aplica a fórmula da regra de três — ela recalcula pelo SIGNIFICADO
// (valor unitário na direta, trabalho total na inversa) e só então compara
// com o que a lição afirma. Se os dois caminhos discordarem, o conteúdo está
// ensinando um truque que não corresponde ao que acontece.

/** Direta: acha o valor unitário e multiplica. */
const porUnidade = (a, b, c) => (b / a) * c;
/** Inversa: o produto das duas grandezas não muda. */
const porProduto = (a, b, c) => (a * b) / c;

teste("regra de três · os dois caminhos batem com a multiplicação em cruz", () => {
  // Ancora as funções de referência contra a técnica que a lição ensina.
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 24; b++) {
      for (let c = 1; c <= 12; c++) {
        assert.ok(Math.abs(porUnidade(a, b, c) - (b * c) / a) < 1e-9, `direta ${a},${b},${c}`);
        assert.ok(Math.abs(porProduto(a, b, c) - (a * b) / c) < 1e-9, `inversa ${a},${b},${c}`);
      }
    }
  }
  // E a diferença entre os dois tipos não é cosmética: só coincidem quando as
  // duas situações são iguais.
  for (let a = 1; a <= 10; a++) {
    for (let c = 1; c <= 10; c++) {
      const iguais = Math.abs(porUnidade(a, 12, c) - porProduto(a, 12, c)) < 1e-9;
      assert.equal(iguais, a === c, `montar errado só acerta por acaso quando ${a} = ${c}`);
    }
  }
});

teste("regra de três · lição 1 — é proporção com um termo escondido", () => {
  assert.equal(porUnidade(4, 30, 6), 45, "o exemplo resolvido não fecha");
  alt("regra-de-tres", "o-que-e", "q1", "Três conhecidos e um procurado");
  num("regra-de-tres", "o-que-e", "q2", porUnidade(3, 90, 5));
  num("regra-de-tres", "o-que-e", "q3", porUnidade(8, 600, 12));
  alt("regra-de-tres", "o-que-e", "q4", "Se as grandezas são direta ou inversamente proporcionais");

  // o resultado da regra de três é o mesmo da proporção montada à mão
  assert.equal((4 * 45), (30 * 6), "o produto dos extremos tem de bater com o dos meios");
});

teste("regra de três · lição 2 — direta", () => {
  const litros = porUnidade(80, 6, 200);
  assert.equal(litros, 15);
  assert.equal(6 / 80, litros / 200, "o consumo por km tem de se manter");
  assert.ok(litros > 6, "mais distância consome mais");
  num("regra-de-tres", "direta", "q1", litros);

  const paginas = porUnidade(3, 90, 7);
  assert.equal(paginas, 210);
  assert.equal(90 / 3, paginas / 7, "as páginas por minuto têm de se manter");
  num("regra-de-tres", "direta", "q2", paginas);

  const tecido = porUnidade(12, 96, 7);
  assert.equal(tecido, 56);
  assert.ok(tecido < 96, "menos tecido custa menos");
  num("regra-de-tres", "direta", "q3", tecido);

  alt("regra-de-tres", "direta", "q4", "Na mesma ordem: a mesma grandeza em cima nas duas");
});

teste("regra de três · lição 3 — inversa", () => {
  assert.equal(porProduto(3, 12, 6), 6, "o exemplo resolvido não fecha");
  assert.equal(3 * 12, 6 * 6, "o produto é que se mantém");

  const torneiras = porProduto(4, 30, 5);
  assert.equal(torneiras, 24);
  assert.equal(4 * 30, 5 * torneiras);
  assert.ok(torneiras < 30, "mais torneiras enchem antes");
  num("regra-de-tres", "inversa", "q1", torneiras);

  const horas = porProduto(60, 4, 80);
  assert.equal(horas, 3);
  assert.equal(60 * 4, 80 * horas, "velocidade × tempo é a distância, e ela não muda");
  num("regra-de-tres", "inversa", "q2", horas);

  const dias = porProduto(8, 15, 10);
  assert.equal(dias, 12);
  assert.ok(dias < 15, "mais cavalos gastam a ração antes");
  num("regra-de-tres", "inversa", "q3", dias);

  alt("regra-de-tres", "inversa", "q4", "O produto das duas grandezas");

  // na inversa a razão NÃO se mantém — é o que separa os dois tipos
  assert.notEqual(3 / 12, 6 / porProduto(3, 12, 6));
});

teste("regra de três · lição 4 — decidir o tipo antes de montar", () => {
  alt("regra-de-tres", "qual-usar", "q1", "Inversamente proporcionais");
  alt("regra-de-tres", "qual-usar", "q2", "Diretamente proporcionais");

  const maquinas = porProduto(6, 10, 4);
  assert.equal(maquinas, 15);
  assert.ok(maquinas > 10, "menos máquinas demoram mais");
  assert.notEqual(maquinas, porUnidade(6, 10, 4), "montar como direta daria outro número");
  num("regra-de-tres", "qual-usar", "q3", maquinas);

  alt("regra-de-tres", "qual-usar", "q4", "Quantidade de pães e preço total");
});

teste("regra de três · lição 5 — a unidade muda o resultado", () => {
  // O estrago da lição, medido: comparar 2 min com 1 h dá sessenta vezes menos.
  const semConverter = porUnidade(2, 20, 1);
  const convertendo = porUnidade(2, 20, 60);
  assert.equal(convertendo, 600, "o exemplo resolvido não fecha");
  assert.equal(semConverter, 10);
  assert.equal(convertendo / semConverter, 60, "o erro de unidade vale exatamente o fator da conversão");

  num("regra-de-tres", "unidades", "q1", porUnidade(20, 30, 60));
  assert.equal(2 * 1000, 2000, "2 kg são 2000 g");
  num("regra-de-tres", "unidades", "q2", porUnidade(500, 25, 2000));

  const bombas = porProduto(1, 90, 2);
  assert.equal(bombas, 45);
  assert.equal(bombas / 60, 0.75, "45 minutos são 0,75 hora — e a questão pediu minutos");
  num("regra-de-tres", "unidades", "q3", bombas);

  alt("regra-de-tres", "unidades", "q4", "Os dois valores de cada linha, entre si");
});

teste("regra de três · lição 6 — os cinco passos", () => {
  assert.equal(porUnidade(5, 400, 8), 640, "o exemplo resolvido não fecha");

  const diasRacao = porUnidade(4, 18, 6);
  assert.equal(diasRacao, 27);
  assert.ok(diasRacao > 18, "mais ração dura mais");
  num("regra-de-tres", "problemas", "q1", diasRacao);

  const minutos = porProduto(15, 40, 20);
  assert.equal(minutos, 30);
  assert.ok(minutos < 40, "mais rápido chega antes");
  num("regra-de-tres", "problemas", "q2", minutos);

  const leite = porUnidade(6, 750, 4);
  assert.equal(leite, 500);
  assert.ok(leite < 750, "menos gente usa menos leite");
  assert.equal(750 / 6, leite / 4, "o consumo por pessoa tem de se manter");
  num("regra-de-tres", "problemas", "q3", leite);

  // o problema que NÃO é regra de três tem uma situação só
  assert.equal(24 / 3, 8, "preço por quilo é uma divisão simples");
  alt("regra-de-tres", "problemas", "q4", "Um pacote de 3 kg custa R$ 24. Qual é o preço por quilo?");
});

// ---------- Porcentagem e juros simples (7º ano) ----------
//
// Dinheiro em ponto flutuante é caminho para erro de arredondamento, então
// todo valor aqui é tratado em CENTAVOS inteiros e só volta a reais no fim.
// E a afirmação central da matéria — taxas sucessivas se multiplicam, taxas de
// juro simples se somam — é conferida por força bruta, e não no exemplo.

/** Fator multiplicativo de uma variação percentual. */
const fator = (taxa) => 1 + taxa / 100;
/** Aplica uma variação a um valor em centavos, arredondando ao centavo. */
const aplicar = (centavos, taxa) => Math.round(centavos * fator(taxa));
const reais = (centavos) => centavos / 100;

teste("juros · fator multiplicativo e variações sucessivas", () => {
  assert.equal(fator(25), 1.25);
  assert.equal(fator(15), 1.15);
  assert.equal(fator(-30), 0.7);
  assert.equal(fator(8), 1.08);

  // Força bruta: em toda a faixa, aplicar duas taxas seguidas NÃO é o mesmo
  // que aplicar a soma delas — exceto quando uma das duas é zero.
  for (let a = -50; a <= 50; a += 5) {
    for (let b = -50; b <= 50; b += 5) {
      const emDuasEtapas = fator(a) * fator(b);
      const somandoTaxas = fator(a + b);
      const iguais = Math.abs(emDuasEtapas - somandoTaxas) < 1e-12;
      assert.equal(iguais, a === 0 || b === 0, `taxas ${a}% e ${b}%`);
    }
  }
});

teste("juros · lição 1 — o fator", () => {
  assert.equal(reais(aplicar(8000, 25)), 100, "o exemplo resolvido não fecha");
  num("juros-simples", "fator", "q1", fator(15));
  num("juros-simples", "fator", "q2", fator(-30));
  num("juros-simples", "fator", "q3", reais(aplicar(24000, -20)));
  alt("juros-simples", "fator", "q4", "Um aumento de 8%");

  // o fator de desconto é sempre menor que 1, e o de aumento sempre maior
  for (let t = 1; t <= 99; t++) {
    assert.ok(fator(-t) < 1, `desconto de ${t}%`);
    assert.ok(fator(t) > 1, `aumento de ${t}%`);
  }
});

teste("juros · lição 2 — sucessivos multiplicam, não somam", () => {
  // O exemplo da lição, refeito passo a passo.
  const depoisDoPrimeiro = aplicar(10000, 10);
  assert.equal(reais(depoisDoPrimeiro), 110);
  assert.equal(reais(aplicar(depoisDoPrimeiro, 10)), 121, "o exemplo resolvido não fecha");
  assert.notEqual(reais(aplicar(10000, 20)), 121, "somar as taxas daria outro número");

  num("juros-simples", "sucessivos", "q1", reais(aplicar(aplicar(20000, 10), 10)));
  num("juros-simples", "sucessivos", "q2", reais(aplicar(aplicar(50000, -20), -10)));

  // subir e descer a mesma taxa NÃO volta ao original, e a ordem não importa
  const sobeDesce = aplicar(aplicar(10000, 10), -10);
  const desceSobe = aplicar(aplicar(10000, -10), 10);
  assert.equal(reais(sobeDesce), 99);
  assert.equal(sobeDesce, desceSobe, "a ordem não muda o resultado");
  assert.ok(sobeDesce < 10000, "sempre sobra menos que o original");
  num("juros-simples", "sucessivos", "q3", reais(sobeDesce));

  // e isso vale para qualquer taxa, não só 10%
  for (let t = 1; t <= 60; t++) {
    assert.ok(fator(t) * fator(-t) < 1, `subir e descer ${t}% tem de perder`);
  }

  const acumulado = Math.round((fator(20) * fator(20) - 1) * 100);
  assert.equal(acumulado, 44);
  alt("juros-simples", "sucessivos", "q4", "44%");
});

teste("juros · lição 3 — porcentagem como proporção", () => {
  const taxa = (parte, total) => (parte * 100) / total;
  const total = (parte, taxa) => (parte * 100) / taxa;

  assert.equal(taxa(12, 40), 30, "o exemplo resolvido não fecha");
  num("juros-simples", "com-proporcao", "q1", taxa(20, 25));
  num("juros-simples", "com-proporcao", "q2", total(45, 30));

  // taxa de aumento é sempre sobre o valor de PARTIDA
  const aumento = taxa(100 - 80, 80);
  assert.equal(aumento, 25);
  assert.notEqual(aumento, taxa(100 - 80, 100), "usar o preço novo daria 20%");
  num("juros-simples", "com-proporcao", "q3", aumento);

  alt("juros-simples", "com-proporcao", "q4", "O total");

  // ida e volta: achar a taxa e voltar ao total devolve o valor original
  for (let t = 100; t <= 500; t += 20) {
    for (let p = 10; p < t; p += 30) {
      assert.ok(Math.abs(total(p, taxa(p, t)) - t) < 1e-9);
    }
  }
});

teste("juros · lição 4 — o juro simples cresce em linha reta", () => {
  const juroSimples = (capital, taxa, tempo) => (capital * taxa * tempo) / 100;

  assert.equal(juroSimples(1000, 2, 6), 120, "o exemplo resolvido não fecha");
  num("juros-simples", "o-que-e-juro", "q1", juroSimples(500, 3, 4));
  alt("juros-simples", "o-que-e-juro", "q2", "Sempre sobre o capital inicial");

  // achar a taxa a partir do juro
  const taxaMensal = (juro, capital, tempo) => (juro * 100) / (capital * tempo);
  assert.equal(taxaMensal(480, 2000, 6), 4);
  num("juros-simples", "o-que-e-juro", "q3", taxaMensal(480, 2000, 6));
  num("juros-simples", "o-que-e-juro", "q4", 12 / 1);

  // A marca do juro SIMPLES: o rendimento de cada período é sempre igual, e o
  // acumulado cresce em passos constantes. É o que o gráfico da lição mostra.
  const acumulado = [];
  for (let t = 1; t <= 10; t++) acumulado.push(juroSimples(1000, 2, t));
  for (let i = 1; i < acumulado.length; i++) {
    assert.equal(acumulado[i] - acumulado[i - 1], 20, "cada mês acrescenta o mesmo degrau");
  }
  // e é diferente do juro composto, que a matéria não ensina mas cita
  const composto = 1000 * fator(2) ** 10 - 1000;
  assert.ok(composto > acumulado.at(-1), "o composto renderia mais no mesmo prazo");
});

teste("juros · lição 5 — montante", () => {
  const juroSimples = (c, i, t) => (c * i * t) / 100;
  const montante = (c, i, t) => c + juroSimples(c, i, t);

  assert.equal(montante(1500, 2, 10), 1800, "o exemplo resolvido não fecha");
  // o caminho do fator tem de dar o mesmo
  assert.equal(1500 * fator(2 * 10), 1800);

  num("juros-simples", "montante", "q1", montante(800, 3, 5));
  num("juros-simples", "montante", "q2", 2600 - 2000);
  num("juros-simples", "montante", "q3", 100 / 5);
  num("juros-simples", "montante", "q4", (720 * 100) / (4000 * 3));

  // No juro simples, a taxa acumulada é a SOMA das taxas de cada período —
  // o oposto da lição 2, e é essa diferença que a matéria precisa deixar clara.
  for (let i = 1; i <= 10; i++) {
    for (let t = 1; t <= 12; t++) {
      const porSoma = 1000 * fator(i * t);
      assert.ok(Math.abs(montante(1000, i, t) - porSoma) < 1e-9, `taxa ${i}% por ${t} períodos`);
      if (t > 1) {
        assert.ok(1000 * fator(i) ** t > porSoma, "o composto passaria do simples");
      }
    }
  }
});

teste("juros · lição 6 — decidir comparando o valor final", () => {
  // TV do exemplo resolvido.
  assert.equal(115 * 10, 1150);
  assert.equal(1150 - 1000, 150);
  assert.equal((150 * 100) / 1000, 15, "15% sobre o preço à vista");

  num("juros-simples", "problemas", "q1", 115 * 12 - 1200);

  // as duas lojas: quem anuncia o desconto maior cobra mais
  const lojaA = 200 * fator(-10);
  const lojaB = 190 - 15;
  assert.equal(lojaA, 180);
  assert.equal(lojaB, 175);
  assert.ok(lojaB < lojaA, "a loja B tem de sair mais barata");
  alt("juros-simples", "problemas", "q2", "Na loja B, que sai por R$ 175");

  num("juros-simples", "problemas", "q3", 3000 + (3000 * 2 * 8) / 100);
  alt("juros-simples", "problemas", "q4", "Só que se paga 60% do preço, seja ele qual for");

  // a mesma taxa vale valores diferentes conforme a base
  assert.equal(50 * 0.4, 20);
  assert.equal(300 * 0.4, 120);
  assert.notEqual(50 * 0.4, 300 * 0.4);
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

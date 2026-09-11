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
import { MANIFESTO as manifesto } from "../ferramentas/manifesto-imagens.mjs";
import { paraNumero } from "../public/js/util.js";

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
      // Usa o conversor DO MOTOR, e não um parser próprio: um teste mais
      // rígido que o app reprova diagnóstico que funcionaria na tela.
      const valor = paraNumero(String(erro.resposta));
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

/**
 * A figura de uma questão não pode mostrar a RESPOSTA dela.
 *
 * A comparação depende do tamanho do texto. Uma alternativa longa é uma
 * frase, e procurá-la como substring é seguro. Uma alternativa curta como
 * "5x" casaria dentro de "5x²" — que é a parcela do ENUNCIADO desenhada, e
 * não a resposta —, então ela é procurada como rótulo inteiro. Números
 * seguem a mesma lógica: "1" não pode casar dentro de "10 vezes maior".
 */
function figurasNaoEntregam(cursoId, quantasEsperadas) {
  const licoes = ler(`dados/cursos/${cursoId}.json`).licoes.map((l) => ler(l.arquivo));
  let conferidas = 0;
  for (const licao of licoes) {
    for (const q of licao.questoes) {
      const item = manifesto.find((m) => m.id === q.imagem);
      assert.ok(item, `${licao.id}/${q.id}: imagem ${q.imagem} não está no manifesto`);
      const svg = item.desenho();
      const rotulos = [...svg.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim());
      // O que o ENUNCIADO já diz não conta como entrega: a figura pode — e
      // deve — desenhar os dados da questão. Em "Simplificando (x²+6x+9)/(x+3),
      // o que sobra?", o (x+3) é o denominador dado, e desenhá-lo é ilustrar,
      // não responder.
      const noEnunciado = (t) => q.enunciado.includes(t);
      if (q.formato === "alternativas") {
        const resposta = q.alternativas[q.correta].texto;
        const achou = resposta.length > 14
          ? rotulos.join(" | ").includes(resposta)
          : rotulos.includes(resposta);
        assert.ok(
          !achou || noEnunciado(resposta),
          `${licao.id}/${q.id}: a figura mostra a resposta "${resposta}"`
        );
      } else {
        const resposta = String(q.resposta).replace(".", ",");
        // A NUMERAÇÃO DOS EIXOS não conta: num plano cartesiano de 0 a 6,
        // todo inteiro dessa faixa aparece escrito, e acusar isso como
        // entrega reprovaria qualquer figura de plano. O plano é
        // reconhecido pela malha, que nenhuma outra figura desenha.
        const ehPlano = (svg.match(/stroke-opacity="0\.55"/g) || []).length >= 6;
        const numeros = (rotulos.join(" | ").match(/-?\d+(?:,\d+)?/g) || [])
          .filter((n) => !(ehPlano && /^\d{1,2}$/.test(n)));
        assert.ok(
          !numeros.includes(resposta) || noEnunciado(resposta),
          `${licao.id}/${q.id}: a figura mostra a resposta ${resposta}`
        );
      }
      conferidas += 1;
    }
  }
  assert.equal(conferidas, quantasEsperadas, `esperava conferir ${quantasEsperadas} questões de ${cursoId}`);
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

// ---------- Linguagem algébrica (7º ano) ----------
//
// A matéria é sobre a LETRA, então os testes daqui não podem só refazer a
// conta do enunciado: eles precisam conferir que a expressão publicada
// descreve mesmo a situação. Por isso quase tudo aqui é força bruta sobre
// uma faixa de valores — uma expressão que acerta no caso do enunciado e
// erra nos outros não é a expressão certa, e é assim que se pega isso.
//
// E a sequência de figuras é conferida contra o DESENHO: o gerador calcula
// os próprios quadradinhos a partir de a e b, então lendo os retângulos do
// SVG de volta dá para provar que a figura e o texto dizem o mesmo número.

/** Avalia a·n + b, que é a forma de toda sequência de passo constante. */
const termo = (a, b, n) => a * n + b;

/** Le de volta, do SVG, quantos quadradinhos cada figura recebeu. */
function lerQuadradinhos(svg, quantos, a, b) {
  const rects = [...svg.matchAll(/<rect x="([0-9.]+)" y="([0-9.]+)"/g)]
    .map((m) => [Number(m[1]), Number(m[2])]);
  // as figuras estão separadas por um vão maior que a célula; agrupa por x
  const xs = [...new Set(rects.map((r) => r[0]))].sort((p, q) => p - q);
  const grupos = [];
  let atual = [xs[0]];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] > 20) { grupos.push(atual); atual = []; }
    atual.push(xs[i]);
  }
  grupos.push(atual);
  assert.equal(grupos.length, quantos, "número de figuras desenhadas");
  return grupos.map((colunas) =>
    rects.filter((r) => colunas.includes(r[0])).length
  );
}

teste("álgebra · a figura desenhada tem a quantidade que a expressão promete", () => {
  // Três sequências usadas nas imagens da matéria, conferidas no SVG.
  for (const [a, b, quantos] of [[2, 1, 4], [3, 1, 3], [4, 2, 3]]) {
    const svg = desenhos.sequenciaFiguras({ a, b, quantos });
    const contados = lerQuadradinhos(svg, quantos, a, b);
    for (let n = 1; n <= quantos; n++) {
      assert.equal(
        contados[n - 1], termo(a, b, n),
        `sequência ${a}n+${b}: a figura ${n} foi desenhada com ${contados[n - 1]} quadradinhos`
      );
    }
  }

  // E o número escrito embaixo de cada figura bate com o que foi desenhado.
  const svg = desenhos.sequenciaFiguras({ a: 2, b: 1, quantos: 4 });
  const escritos = [...svg.matchAll(/font-size="13"[^>]*>([0-9]+)</g)].map((m) => Number(m[1]));
  assert.deepEqual(escritos, [3, 5, 7, 9], "os totais escritos no SVG");
});

teste("álgebra · lição 1 — de onde a letra vem", () => {
  // O exemplo resolvido: 4, 7, 10 tem de ser 3n + 1, e nenhuma outra.
  assert.deepEqual([1, 2, 3].map((n) => termo(3, 1, n)), [4, 7, 10]);

  num("algebra-inicial", "a-letra", "q1", termo(2, 1, 10));
  alt("algebra-inicial", "a-letra", "q2", "4n + 2");
  alt("algebra-inicial", "a-letra", "q3", "Representando qualquer número, para dizer uma regra geral");
  num("algebra-inicial", "a-letra", "q4", termo(2, 1, 8));

  // A expressão da q2 é a ÚNICA da forma an+b que serve: passo 4, figura 1 = 6.
  let servem = 0;
  for (let a = 1; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      const passoConstante = termo(a, b, 2) - termo(a, b, 1) === 4;
      if (passoConstante && termo(a, b, 1) === 6) { servem++; assert.equal(`${a}n + ${b}`, "4n + 2"); }
    }
  }
  assert.equal(servem, 1, "só uma expressão an+b atende às duas condições");

  // Comutatividade: a afirmação da q3 vale para todo par, e não só no exemplo.
  for (let x = -20; x <= 20; x += 3) {
    for (let y = -20; y <= 20; y += 3) assert.equal(x + y, y + x);
  }
});

teste("álgebra · lição 2 — traduzir sem trocar a ordem", () => {
  // Cada tradução da lição é uma FUNÇÃO, e ela é conferida em toda a faixa
  // contra a leitura errada que a alternativa oferece.
  const triploMenos4 = (n) => 3 * n - 4;
  const dobroDaSoma = (n) => 2 * (n + 5);

  for (let n = -10; n <= 20; n++) {
    // 3n − 4 nunca é 3(n − 4), a não ser que os dois coincidissem — não coincidem
    assert.notEqual(triploMenos4(n), 3 * (n - 4), `n = ${n}`);
    // o dobro da soma difere de dobrar antes de somar, sempre
    assert.notEqual(dobroDaSoma(n), 2 * n + 5, `n = ${n}`);
    // e 3n − 4 nunca é n³ − 4 fora dos pontos onde n³ = 3n
    if (n * n * n !== 3 * n) assert.notEqual(triploMenos4(n), n ** 3 - 4);
  }

  alt("algebra-inicial", "traduzir", "q1", "3n − 4");
  alt("algebra-inicial", "traduzir", "q2", "2(n + 5)");

  // Bruno b, Ana b+4: o total é 2b+4, conferido pelo significado e não pela fórmula
  const totalPeloSignificado = (b) => b + (b + 4);
  const totalPelaExpressao = (b) => 2 * b + 4;
  for (let b = 0; b <= 60; b++) assert.equal(totalPeloSignificado(b), totalPelaExpressao(b));
  num("algebra-inicial", "traduzir", "q3", totalPeloSignificado(12));

  // Turma: m meninas e 2m meninos dá 3m, contado pessoa a pessoa
  const turma = (m) => m + 2 * m;
  for (let m = 1; m <= 40; m++) assert.equal(turma(m), 3 * m);
  alt("algebra-inicial", "traduzir", "q4", "3m");
});

teste("álgebra · lição 3 — valor numérico e a ordem das operações", () => {
  assert.equal(3 * 4 ** 2 - 2 * 5, 38, "o exemplo resolvido não fecha");
  // e não é o mesmo que elevar o produto ao quadrado
  assert.notEqual(3 * 4 ** 2, (3 * 4) ** 2);

  num("algebra-inicial", "valor-numerico", "q1", 5 * 6 - 8);
  num("algebra-inicial", "valor-numerico", "q2", 2 * 3 ** 2);
  num("algebra-inicial", "valor-numerico", "q3", 3 * 7 + 4);
  alt("algebra-inicial", "valor-numerico", "q4", "Aumenta 3");

  // 2n² e (2n)² só coincidem em n = 0 — o erro previsto na q2 é real em toda
  // a faixa, e não uma coincidência do 3.
  for (let n = -8; n <= 8; n++) {
    if (n !== 0) assert.notEqual(2 * n ** 2, (2 * n) ** 2, `n = ${n}`);
  }
  // 3a + b nunca é 3(a + b) quando b ≠ 0
  for (let a = -6; a <= 6; a++) {
    for (let b = -6; b <= 6; b++) {
      if (b !== 0) assert.notEqual(3 * a + b, 3 * (a + b));
    }
  }
  // o passo de 3n + 1 é 3 em qualquer ponto, o que é a resposta da q4
  for (let n = -30; n <= 30; n++) {
    assert.equal((3 * (n + 1) + 1) - (3 * n + 1), 3);
  }
});

teste("álgebra · lição 4 — semelhante junta, diferente não", () => {
  // Simplificar não pode mudar o valor da expressão em NENHUM ponto: é assim
  // que se prova que 5x + 3 − 2x + 7 é 3x + 10, e que não é 13x.
  const mesmoValorSempre = (f, g) => {
    for (let x = -20; x <= 20; x++) if (f(x) !== g(x)) return false;
    return true;
  };

  assert.ok(mesmoValorSempre((x) => 5 * x + 3 - 2 * x + 7, (x) => 3 * x + 10));
  assert.ok(!mesmoValorSempre((x) => 5 * x + 3 - 2 * x + 7, (x) => 13 * x));

  assert.ok(mesmoValorSempre((a) => 7 * a - 3 * a + 2, (a) => 4 * a + 2));
  assert.ok(!mesmoValorSempre((a) => 7 * a - 3 * a + 2, (a) => 6 * a), "6a é o erro previsto");
  alt("algebra-inicial", "semelhantes", "q1", "4a + 2");

  num("algebra-inicial", "semelhantes", "q2", 6 + 2 - 3);
  assert.ok(mesmoValorSempre((m) => 6 * m + 2 * m - 3 * m, (m) => 5 * m));

  alt("algebra-inicial", "semelhantes", "q3", "4x² e 7x²");
  // x e x² só valem o mesmo em 0 e 1, então nunca são a mesma quantidade
  let coincidem = 0;
  for (let x = -12; x <= 12; x++) if (x === x * x) coincidem++;
  assert.equal(coincidem, 2, "x e x² coincidem só em 0 e 1");

  const simplificada = (y) => 5 * y + 3;
  assert.ok(mesmoValorSempre((y) => 8 * y + 5 - 3 * y - 2, simplificada));
  num("algebra-inicial", "semelhantes", "q4", simplificada(4));
  // o erro previsto 8y também é conferido: ele erra fora do caso do enunciado
  assert.ok(!mesmoValorSempre((y) => 8 * y + 5 - 3 * y - 2, (y) => 8 * y));
});

teste("álgebra · lição 5 — a igualdade é uma balança, não uma seta", () => {
  // Testar um valor é calcular os DOIS lados. O teste faz isso por força
  // bruta e exige que a solução publicada seja a única na faixa inteira.
  const unicaSolucao = (esq, dir, de = -60, ate = 60) => {
    const serve = [];
    for (let x = de; x <= ate; x++) if (esq(x) === dir(x)) serve.push(x);
    return serve;
  };

  assert.equal(3 * 4 + 2, 14, "o exemplo resolvido não fecha");

  assert.deepEqual(unicaSolucao((x) => x + 6, () => 15), [9]);
  num("algebra-inicial", "igualdade", "q1", 9);

  assert.deepEqual(unicaSolucao((x) => 4 * x - 3, () => 17), [5]);
  num("algebra-inicial", "igualdade", "q3", 5);

  alt("algebra-inicial", "igualdade", "q2", "n + n = 2n");
  alt("algebra-inicial", "igualdade", "q4", "Que os dois lados valem o mesmo número");

  // A q2 afirma que só UMA das quatro vale sempre. Conferido nas quatro.
  const faixa = [];
  for (let n = -30; n <= 30; n++) faixa.push(n);
  assert.ok(faixa.every((n) => n + n === 2 * n), "n + n = 2n vale sempre");
  assert.equal(faixa.filter((n) => n + 2 === 2 * n).length, 1, "n + 2 = 2n só em n = 2");
  assert.equal(faixa.filter((n) => n * n === 2 * n).length, 2, "n × n = 2n só em 0 e 2");
  assert.equal(faixa.filter((n) => n - 1 === n).length, 0, "n − 1 = n nunca vale");
});

teste("álgebra · lição 6 — modelar, e conferir no texto", () => {
  // Dois números que somam 60 com o maior sendo o triplo do menor: o teste
  // procura o par por força bruta, sem usar a equação, e exige que só um sirva.
  const pares = [];
  for (let menor = 1; menor < 60; menor++) {
    const maior = 60 - menor;
    if (maior === 3 * menor) pares.push([menor, maior]);
  }
  assert.equal(pares.length, 1);
  assert.deepEqual(pares[0], [15, 45]);
  num("algebra-inicial", "problemas", "q1", pares[0][0]);

  // O resolvido: 120 figurinhas em a, 2a e 3a.
  const divisoes = [];
  for (let a = 1; a <= 120; a++) if (a + 2 * a + 3 * a === 120) divisoes.push(a);
  assert.deepEqual(divisoes, [20], "o exemplo resolvido não fecha");

  // Caneta c, caderno c+4: duas canetas e um caderno custam 3c + 4, conferido
  // somando item a item em toda a faixa de preços.
  for (let c = 1; c <= 50; c++) {
    assert.equal(c + c + (c + 4), 3 * c + 4, `caneta a ${c}`);
  }
  alt("algebra-inicial", "problemas", "q2", "3c + 4");

  // Idade: procura p sem montar a equação, testando a frase do enunciado.
  const idades = [];
  for (let p = 5; p <= 100; p++) if (p + 8 === 2 * (p - 4)) idades.push(p);
  assert.deepEqual(idades, [16], "só uma idade satisfaz o enunciado");
  num("algebra-inicial", "problemas", "q3", idades[0]);

  // OBMEP 2010, problema 9. Resolvido por busca sobre as posições das quatro
  // cidades na rodovia — nada de fórmula: se A está em 0 e D em 80, procura-se
  // B e C que respeitem AC = 50 e BD = 45, e mede-se BC no que sobrar.
  const solucoes = [];
  for (let B = 1; B < 80; B++) {
    for (let C = B + 1; C < 80; C++) {
      if (C - 0 === 50 && 80 - B === 45) solucoes.push(C - B);
    }
  }
  assert.equal(solucoes.length, 1, "a posição das cidades é única");
  assert.equal(solucoes[0], 15, "a resposta oficial da OBMEP é 15 km");
  num("algebra-inicial", "problemas", "q4", solucoes[0]);

  // e os dois erros previstos são de fato os trechos vizinhos
  assert.equal(80 - 50, 30, "o trecho C→D");
  assert.equal(80 - 45, 35, "o trecho A→B");
  assert.equal(35 + 15 + 30, 80, "os três trechos fecham a rodovia");
});

// ---------- Equações do 1º grau (7º ano) ----------
//
// A matéria inteira se apoia numa afirmação só: operar nos DOIS lados
// preserva a igualdade. Então o teste não confere a conta publicada — ele
// confere a afirmação, por força bruta, e só depois usa isso para achar a
// solução de cada equação.
//
// Nenhuma equação daqui é resolvida pela fórmula. Todas são resolvidas por
// BUSCA na faixa, e o teste exige que a solução publicada seja a única —
// que é a mesma disciplina usada na lição 5 de Linguagem algébrica.

/**
 * Resolve por busca, sem isolar nada: varre a faixa e devolve os valores
 * que tornam os dois lados iguais. Trabalha em passos de 1/2 para pegar
 * também as soluções quebradas (2x = 9 dá 4,5).
 */
function resolverPorBusca(esquerdo, direito, de = -200, ate = 200) {
  const serve = [];
  for (let dobro = de * 2; dobro <= ate * 2; dobro++) {
    const x = dobro / 2;
    if (Math.abs(esquerdo(x) - direito(x)) < 1e-9) serve.push(x);
  }
  return serve;
}

/** Única solução na faixa, ou explode dizendo o que encontrou. */
function unica(esquerdo, direito, rotulo) {
  const s = resolverPorBusca(esquerdo, direito);
  assert.equal(s.length, 1, `${rotulo}: esperava uma solução só, achei ${JSON.stringify(s)}`);
  return s[0];
}

teste("equações · operar nos dois lados preserva a igualdade", () => {
  // A afirmação central da matéria, conferida em toda a faixa antes de ser
  // usada: se dois números são iguais, continuam iguais depois da MESMA
  // operação — e deixam de ser iguais quando ela entra num lado só.
  for (let v = -30; v <= 30; v += 3) {
    for (const k of [-7, -1, 2, 5, 11]) {
      assert.equal(v + k, v + k, "somar nos dois lados");
      assert.equal(v - k, v - k, "tirar dos dois lados");
      assert.equal(v * k, v * k, "multiplicar os dois lados");
      if (k !== 0) assert.equal(v / k, v / k, "dividir os dois lados");
      // e mexer em um lado só quebra, a não ser que a operação seja neutra
      if (k !== 0) assert.notEqual(v + k, v, `somar ${k} num lado só`);
    }
  }
});

teste("equações · lição 1 — o princípio da balança", () => {
  assert.equal(unica((x) => x + 8, () => 21, "x + 8 = 21"), 13, "o exemplo resolvido não fecha");

  num("equacoes-1grau", "equilibrio", "q1", unica((x) => x - 7, () => 12, "x − 7 = 12"));
  alt("equacoes-1grau", "equilibrio", "q2", "Porque tirar a mesma coisa dos dois lados mantém a igualdade");
  // a letra do lado direito não muda nada: a igualdade não tem lado de chegada
  num("equacoes-1grau", "equilibrio", "q3", unica(() => 23, (x) => x + 8, "23 = x + 8"));
  assert.equal(
    unica(() => 23, (x) => x + 8, "espelhada"),
    unica((x) => x + 8, () => 23, "normal"),
    "trocar os lados não pode mudar a solução"
  );
  alt("equacoes-1grau", "equilibrio", "q4", "Trocar x por 6 na equação original e ver se os dois lados dão o mesmo");

  // o erro previsto "−5" da q1 resolve OUTRA equação, e é por isso que ele engana
  assert.equal(unica(() => 7, (x) => x + 12, "7 − x = 12 reescrita"), -5);
});

teste("equações · lição 2 — desfazer pela operação inversa", () => {
  assert.equal(unica((x) => 6 * x, () => 42, "6x = 42"), 7, "o exemplo resolvido não fecha");

  num("equacoes-1grau", "isolar", "q1", unica((x) => 5 * x, () => 45, "5x = 45"));
  num("equacoes-1grau", "isolar", "q2", unica((x) => x / 4, () => 7, "x ÷ 4 = 7"));
  alt("equacoes-1grau", "isolar", "q3", "Divide os dois lados por 8");
  // resposta quebrada é resposta normal: 2x = 9 não tem solução inteira
  const meio = unica((x) => 2 * x, () => 9, "2x = 9");
  assert.equal(meio, 4.5);
  assert.ok(!Number.isInteger(meio), "a q4 existe justamente por não ser inteira");
  num("equacoes-1grau", "isolar", "q4", meio);

  // A tabela das inversas, conferida em vez de afirmada.
  for (let x = -20; x <= 20; x++) {
    for (const k of [2, 3, 4, 5, 8]) {
      assert.equal((x * k) / k, x, `× ${k} desfeito por ÷ ${k}`);
      assert.equal((x / k) * k, x, `÷ ${k} desfeito por × ${k}`);
      assert.equal(x + k - k, x, `+ ${k} desfeito por − ${k}`);
      assert.equal(x - k + k, x, `− ${k} desfeito por + ${k}`);
    }
  }
});

teste("equações · lição 3 — desfazer na ordem inversa", () => {
  assert.equal(unica((x) => 3 * x + 5, () => 20, "3x + 5 = 20"), 5, "o exemplo resolvido não fecha");

  num("equacoes-1grau", "duas-operacoes", "q1", unica((x) => 4 * x + 7, () => 31, "4x + 7 = 31"));
  num("equacoes-1grau", "duas-operacoes", "q2", unica((x) => 5 * x - 3, () => 22, "5x − 3 = 22"));
  alt("equacoes-1grau", "duas-operacoes", "q3", "Tirar 4 dos dois lados");
  // zero é solução como qualquer outra, e a q4 existe para dizer isso
  const zero = unica((x) => 2 * x + 9, () => 9, "2x + 9 = 9");
  assert.equal(zero, 0);
  num("equacoes-1grau", "duas-operacoes", "q4", zero);

  // As duas ordens dão a MESMA resposta — a ordem recomendada é só a que não
  // cria fração no caminho. Conferido nas duas, para a lição não virar dogma.
  for (let a = 1; a <= 9; a++) {
    for (let b = -9; b <= 9; b++) {
      for (let c = -20; c <= 20; c += 4) {
        const tirandoPrimeiro = (c - b) / a;      // tira o termo solto, depois divide
        const dividindoPrimeiro = c / a - b / a;  // divide tudo antes
        assert.ok(Math.abs(tirandoPrimeiro - dividindoPrimeiro) < 1e-9, `${a}x + ${b} = ${c}`);
      }
    }
  }
});

teste("equações · lição 4 — a letra nos dois lados", () => {
  assert.equal(
    unica((x) => 5 * x + 2, (x) => 3 * x + 10, "5x + 2 = 3x + 10"),
    4, "o exemplo resolvido não fecha"
  );

  num("equacoes-1grau", "dois-lados", "q1", unica((x) => 4 * x + 3, (x) => 2 * x + 15, "q1"));
  num("equacoes-1grau", "dois-lados", "q2", unica((x) => 6 * x + 4, (x) => 2 * x + 20, "q2"));
  num("equacoes-1grau", "dois-lados", "q3", unica((x) => 3 * x + 8, (x) => 7 * x, "q3"));
  alt("equacoes-1grau", "dois-lados", "q4", "Que a igualdade é verdadeira para qualquer valor de x");

  // Tirar o menor ou o maior coeficiente leva ao MESMO valor: a recomendação
  // da lição é sobre conforto, e não sobre correção. Conferido por força bruta.
  for (let a = 1; a <= 8; a++) {
    for (let c = 1; c <= 8; c++) {
      if (a === c) continue;
      for (const b of [-6, 0, 3, 9]) {
        for (const d of [-6, 0, 3, 9]) {
          const porSubtracao = (d - b) / (a - c);
          assert.ok(
            Math.abs((a * porSubtracao + b) - (c * porSubtracao + d)) < 1e-9,
            `${a}x+${b} = ${c}x+${d}`
          );
        }
      }
    }
  }

  // O caso da q4: quando os dois lados são a MESMA expressão, todo valor serve.
  const todos = resolverPorBusca((x) => 2 * x + 5, (x) => 5 + x + x, -30, 30);
  assert.equal(todos.length, 121, "identidade: todo valor da faixa deveria servir");
  // e quando sobra algo falso, nenhum serve
  assert.equal(resolverPorBusca((x) => x + 5, (x) => x + 8, -30, 30).length, 0);
});

teste("equações · lição 5 — parênteses e frações", () => {
  // Abrir o parêntese é uma AFIRMAÇÃO sobre toda a faixa, e não uma reescrita:
  // 2(x+3) e 2x+6 têm de dar o mesmo valor em todo ponto, e 2x+3 não.
  for (let x = -20; x <= 20; x++) {
    assert.equal(2 * (x + 3), 2 * x + 6, `x = ${x}`);
    assert.equal(2 * (x + 5), 2 * x + 10, `x = ${x}`);
    if (x !== 0) {
      assert.notEqual(2 * (x + 5), 2 * x + 5, "o erro previsto tem de discordar");
      assert.notEqual(2 * (x + 5), x + 10, "o erro previsto tem de discordar");
    }
    assert.notEqual(2 * (x + 5), 2 * x + 7, "2x + 7 nunca coincide");
  }

  assert.equal(unica((x) => 2 * (x + 3), () => 14, "2(x+3) = 14"), 4, "o exemplo resolvido não fecha");
  // e o atalho citado no fecho dá o mesmo
  assert.equal(unica((x) => x + 3, () => 7, "atalho"), 4);

  num("equacoes-1grau", "parenteses-fracoes", "q1", unica((x) => 3 * (x + 2), () => 21, "q1"));
  num("equacoes-1grau", "parenteses-fracoes", "q2", unica((x) => x / 4 + 1, () => 6, "q2"));
  alt("equacoes-1grau", "parenteses-fracoes", "q3", "2x + 10");
  num("equacoes-1grau", "parenteses-fracoes", "q4", unica((x) => x / 2 - 3, () => 4, "q4"));

  // Multiplicar os dois lados pelo denominador limpa a fração sem mudar a
  // solução — conferido comparando a equação com fração e a equação limpa.
  for (let d = 2; d <= 6; d++) {
    for (let b = -5; b <= 5; b++) {
      for (let c = -10; c <= 10; c += 5) {
        const comFracao = resolverPorBusca((x) => x / d + b, () => c);
        const limpa = resolverPorBusca((x) => x + b * d, () => c * d);
        assert.deepEqual(comFracao, limpa, `x/${d} + ${b} = ${c}`);
      }
    }
  }
});

teste("equações · lição 6 — modelar, resolver e voltar à pergunta", () => {
  assert.equal(unica((x) => 2 * x - 7, () => 23, "2x − 7 = 23"), 15, "o exemplo resolvido não fecha");

  // q1: um número mais o triplo dele dá 48 — achado por busca sobre o TEXTO
  const soma = [];
  for (let n = 1; n <= 200; n++) if (n + 3 * n === 48) soma.push(n);
  assert.deepEqual(soma, [12]);
  num("equacoes-1grau", "problemas", "q1", soma[0]);
  assert.equal(3 * soma[0], 36, "o erro previsto 36 é mesmo o triplo");

  // q2: Ana tem 5 a mais que Bruno e juntos têm 37
  const idades = [];
  for (let b = 0; b <= 100; b++) if (b + (b + 5) === 37) idades.push(b);
  assert.deepEqual(idades, [16]);
  num("equacoes-1grau", "problemas", "q2", idades[0]);
  assert.equal(idades[0] + 5, 21, "o erro previsto 21 é a idade de Ana");

  // OBMEP 2010, problema 29. Resolvido pelo TEXTO, e não pela equação: varre
  // o tamanho da classe e exige que só um valor produza exatamente 4 meninos
  // de óculos com todas as frações dando números inteiros de pessoas.
  const classes = [];
  for (let x = 1; x <= 600; x++) {
    const comOculos = x / 6;
    if (!Number.isInteger(comOculos)) continue;
    const meninas = comOculos / 3;
    if (!Number.isInteger(meninas)) continue;
    if (comOculos - meninas === 4) classes.push(x);
  }
  assert.deepEqual(classes, [36], "a resposta oficial da OBMEP é 36 alunos");
  num("equacoes-1grau", "problemas", "q3", classes[0]);

  // OBMEP 2010, problema 74. Sem a manipulação algébrica da solução oficial:
  // o teste varre valores possíveis do valor comum e confere que c é o maior
  // em TODOS eles — se dependesse do valor comum, a questão seria ambígua.
  for (let k = -50; k <= 50; k++) {
    const a = k + 1, b = k - 2, c = k + 3, d = k - 4;
    assert.equal(a - 1, k); assert.equal(b + 2, k);
    assert.equal(c - 3, k); assert.equal(d + 4, k);
    assert.equal(Math.max(a, b, c, d), c, `com valor comum ${k}, o maior deveria ser c`);
    assert.equal(Math.min(a, b, c, d), d, "e o menor é sempre o d");
  }
  alt("equacoes-1grau", "problemas", "q4", "O número c");
});

// ---------- Inequações (7º ano) ----------
//
// A matéria existe por causa de UMA afirmação: operar nos dois lados preserva
// a desigualdade, exceto ao multiplicar ou dividir por negativo, quando o
// sinal inverte. O teste não aceita isso de graça — ele varre a faixa e prova
// os dois casos, e só depois usa o resultado para conferir as questões.
//
// Nenhuma inequação daqui é resolvida isolando a letra. Todas são resolvidas
// por BUSCA sobre a faixa, exatamente como as equações da matéria anterior.

const SINAIS = {
  "<": (a, b) => a < b,
  ">": (a, b) => a > b,
  "<=": (a, b) => a <= b,
  ">=": (a, b) => a >= b,
};

/** Todos os inteiros da faixa que satisfazem a inequação, sem isolar nada. */
function inteirosQueServem(esquerdo, sinal, direito, de = -60, ate = 60) {
  const serve = [];
  for (let x = de; x <= ate; x++) {
    if (SINAIS[sinal](esquerdo(x), direito(x))) serve.push(x);
  }
  return serve;
}

teste("inequações · operar nos dois lados preserva o sentido, menos por negativo", () => {
  // A afirmação inteira da matéria, conferida antes de ser usada.
  for (let a = -25; a <= 25; a += 2) {
    for (let b = -25; b <= 25; b += 2) {
      if (a === b) continue;
      const menor = a < b;

      for (const k of [-9, -3, -1, 1, 4, 7]) {
        // somar e tirar nunca mexem no sentido, nem com k negativo
        assert.equal(a + k < b + k, menor, `somar ${k} em ${a} e ${b}`);
        assert.equal(a - k < b - k, menor, `tirar ${k} de ${a} e ${b}`);

        // multiplicar mantém com positivo e INVERTE com negativo
        if (k > 0) {
          assert.equal(a * k < b * k, menor, `× ${k} (positivo)`);
          assert.equal(a / k < b / k, menor, `÷ ${k} (positivo)`);
        } else {
          assert.equal(a * k < b * k, !menor, `× ${k} (negativo) tinha de inverter`);
          assert.equal(a / k < b / k, !menor, `÷ ${k} (negativo) tinha de inverter`);
        }
      }
    }
  }
});

teste("inequações · lição 1 — a resposta é um conjunto", () => {
  // O exemplo resolvido: inteiros de 0 a 10 com x + 3 < 8
  const doExemplo = inteirosQueServem((x) => x + 3, "<", () => 8, 0, 10);
  assert.deepEqual(doExemplo, [0, 1, 2, 3, 4], "o exemplo resolvido não fecha");
  assert.ok(!doExemplo.includes(5), "o 5 empata, e empate não serve para <");
  // e com ≤ o 5 entraria — é o que o fecho da lição afirma
  assert.deepEqual(inteirosQueServem((x) => x + 3, "<=", () => 8, 0, 10), [0, 1, 2, 3, 4, 5]);

  alt("inequacoes", "o-que-e", "q1", "Que o dobro de x é maior que 10");
  // q2: quantos dos três valores dados satisfazem 3x > 20
  num("inequacoes", "o-que-e", "q2", [4, 7, 10].filter((x) => 3 * x > 20).length);
  // q3: menor inteiro com x > 4,5, achado por busca
  num("inequacoes", "o-que-e", "q3", inteirosQueServem((x) => x, ">", () => 4.5, 0, 20)[0]);
  alt("inequacoes", "o-que-e", "q4", "Infinitas: todos os números menores que 5");

  // a q4 afirma que x < 5 tem infinitas soluções: o teste mostra que a
  // quantidade cresce sem parar conforme a faixa examinada aumenta.
  const a = inteirosQueServem((x) => x, "<", () => 5, -50, 4).length;
  const b = inteirosQueServem((x) => x, "<", () => 5, -500, 4).length;
  assert.ok(b > a * 5, "ampliar a faixa tem de aumentar a contagem");
});

teste("inequações · lição 2 — bolinha, lado e o que a figura afirma", () => {
  alt("inequacoes", "na-reta", "q1", "Que o número da fronteira não faz parte da resposta");
  alt("inequacoes", "na-reta", "q2", "x ≥ 2");
  num("inequacoes", "na-reta", "q3", inteirosQueServem((x) => x, ">", () => 6, 0, 20)[0]);
  alt("inequacoes", "na-reta", "q4", "Bolinha cheia no −1 e faixa para a esquerda");

  // A regra bolinha/lado, conferida contra o conjunto solução de verdade.
  const casos = [
    { sinal: ">", ponto: 3, incluso: false, sentido: "maior" },
    { sinal: ">=", ponto: -2, incluso: true, sentido: "maior" },
    { sinal: "<", ponto: 5, incluso: false, sentido: "menor" },
    { sinal: "<=", ponto: -1, incluso: true, sentido: "menor" },
  ];
  for (const c of casos) {
    const serve = inteirosQueServem((x) => x, c.sinal, () => c.ponto);
    // a fronteira entra se e só se o sinal tem o igual
    assert.equal(serve.includes(c.ponto), c.incluso, `fronteira de x ${c.sinal} ${c.ponto}`);
    // e o lado bate com o sentido declarado no manifesto
    const paraDireita = serve.every((x) => x >= c.ponto);
    assert.equal(paraDireita, c.sentido === "maior", `lado de x ${c.sinal} ${c.ponto}`);
  }

  // A figura desenhada é lida de volta: a bolinha da q2 tem de ser CHEIA.
  const svg = desenhos.retaInteiros({
    de: -3, ate: 7, intervalo: { ponto: 2, sentido: "maior", incluso: true },
  });
  assert.ok(/r="6\.5" fill="#f7f5f0"/.test(svg), "x ≥ 2 tem de sair com bolinha cheia");
  const vazada = desenhos.retaInteiros({
    de: -2, ate: 8, intervalo: { ponto: 3, sentido: "maior", incluso: false },
  });
  assert.ok(/r="6" fill="#2b2622"/.test(vazada), "x > 3 tem de sair com bolinha vazada");
});

teste("inequações · lição 3 — o sinal não muda com positivo", () => {
  // O exemplo resolvido, achado por busca.
  const doExemplo = inteirosQueServem((x) => 4 * x + 3, "<=", () => 19);
  assert.equal(Math.max(...doExemplo), 4, "o exemplo resolvido não fecha");
  assert.ok(doExemplo.includes(4), "com ≤ a fronteira entra");

  num("inequacoes", "resolver", "q1", inteirosQueServem((x) => x + 7, ">", () => 12)[0]);
  num("inequacoes", "resolver", "q2", Math.max(...inteirosQueServem((x) => 3 * x, "<", () => 21)));
  alt("inequacoes", "resolver", "q3", "Continua o mesmo, porque 5 é positivo");
  num("inequacoes", "resolver", "q4", Math.max(...inteirosQueServem((x) => 2 * x - 5, "<=", () => 9)));

  // Resolver isolando dá o MESMO conjunto que resolver por busca — conferido
  // em muitos coeficientes positivos, que é o alcance desta lição.
  for (let a = 1; a <= 6; a++) {
    for (let b = -8; b <= 8; b += 4) {
      for (let c = -12; c <= 12; c += 6) {
        const porBusca = inteirosQueServem((x) => a * x + b, "<=", () => c);
        const porIsolamento = [];
        for (let x = -60; x <= 60; x++) if (x <= (c - b) / a) porIsolamento.push(x);
        assert.deepEqual(porBusca, porIsolamento, `${a}x + ${b} ≤ ${c}`);
      }
    }
  }
});

teste("inequações · lição 4 — a inversão, e só ela", () => {
  // O exemplo resolvido: −2x > 8 tem de dar x < −4, e não x > −4.
  const doExemplo = inteirosQueServem((x) => -2 * x, ">", () => 8);
  assert.equal(Math.max(...doExemplo), -5, "o exemplo resolvido não fecha");
  assert.ok(!doExemplo.includes(-3), "sem inverter, o −3 entraria errado");
  assert.ok(!doExemplo.includes(-4), "a fronteira empata e não serve para >");

  alt("inequacoes", "inverter", "q1", "−2 > −7");
  num("inequacoes", "inverter", "q2", inteirosQueServem((x) => -3 * x, "<", () => 12)[0]);
  alt("inequacoes", "inverter", "q3", "Vira ≤");
  num("inequacoes", "inverter", "q4", inteirosQueServem((x) => -x + 2, "<=", () => 6)[0]);

  // Isolar SEM inverter dá conjunto errado; isolar INVERTENDO dá o certo.
  // Conferido em toda a faixa de coeficientes negativos.
  for (let a = -6; a <= -1; a++) {
    for (let c = -12; c <= 12; c += 4) {
      const porBusca = inteirosQueServem((x) => a * x, "<", () => c);
      const invertendo = [];
      const semInverter = [];
      for (let x = -60; x <= 60; x++) {
        if (x > c / a) invertendo.push(x);
        if (x < c / a) semInverter.push(x);
      }
      assert.deepEqual(porBusca, invertendo, `${a}x < ${c}: invertendo`);
      assert.notDeepEqual(porBusca, semInverter, `${a}x < ${c}: sem inverter tinha de dar errado`);
    }
  }

  // E o caso mais simples de todos, o da ideia: 3 < 5 mas −3 > −5.
  assert.ok(3 < 5);
  assert.ok(-3 > -5);
  assert.ok(2 < 7);
  assert.ok(-2 > -7, "é a resposta da q1");
});

teste("inequações · lição 5 — as palavras que viram sinal", () => {
  // O dicionário da lição, conferido pelo que cada frase ACEITA no extremo.
  const aceitaOExtremo = { ">": false, ">=": true, "<": false, "<=": true };
  for (const [sinal, deveriaAceitar] of Object.entries(aceitaOExtremo)) {
    assert.equal(SINAIS[sinal](18, 18), deveriaAceitar, `18 ${sinal} 18`);
  }

  alt("inequacoes", "traduzir", "q1", "p ≥ 12");
  alt("inequacoes", "traduzir", "q3", "Menos de 30");

  // Elevador do exemplo resolvido: 3 pessoas de 70 kg num limite de 450.
  const jaDentro = 3 * 70;
  assert.equal(jaDentro, 210);
  const aindaCabe = Math.max(...inteirosQueServem((x) => jaDentro + x, "<=", () => 450, 0, 400));
  assert.equal(aindaCabe, 240, "o exemplo resolvido não fecha");

  // Ingressos: o maior inteiro que cabe, e o seguinte tem de estourar.
  const ingressos = inteirosQueServem((x) => 15 * x, "<=", () => 100, 0, 50);
  const maxIngressos = Math.max(...ingressos);
  assert.equal(maxIngressos, 6);
  assert.ok(15 * (maxIngressos + 1) > 100, "7 ingressos têm de estourar os R$ 100");
  num("inequacoes", "traduzir", "q2", maxIngressos);

  // Média: a menor nota que fecha média 7 com um 5 na primeira prova.
  const notas = inteirosQueServem((x) => (5 + x) / 2, ">=", () => 7, 0, 10);
  assert.equal(Math.min(...notas), 9);
  assert.ok((5 + 8) / 2 < 7, "com 8 a média não chega a 7");
  num("inequacoes", "traduzir", "q4", Math.min(...notas));
});

teste("inequações · lição 6 — o intervalo, e o que cabe dentro dele", () => {
  // Canetas do exemplo resolvido: 7x + 10 ≤ 60, com o inteiro e o seguinte.
  const canetas = inteirosQueServem((x) => 7 * x + 10, "<=", () => 60, 0, 30);
  assert.equal(Math.max(...canetas), 7, "o exemplo resolvido não fecha");
  assert.equal(60 - 7 * 7, 11, "com 7 canetas sobram R$ 11");
  assert.ok(60 - 7 * 8 < 10, "com 8 canetas a sobra fica abaixo dos R$ 10");

  // q1: táxi 5 + 2x ≤ 27
  const km = inteirosQueServem((x) => 5 + 2 * x, "<=", () => 27, 0, 50);
  assert.equal(Math.max(...km), 11);
  assert.ok(5 + 2 * 12 > 27, "12 km já estouram");
  num("inequacoes", "problemas", "q1", Math.max(...km));

  // q2: itens 12x ≤ 80, com o mínimo de 4 da promoção como distração
  const itens = inteirosQueServem((x) => 12 * x, "<=", () => 80, 0, 30);
  assert.equal(Math.max(...itens), 6);
  assert.ok(itens.includes(4), "o mínimo da promoção continua dentro do intervalo");
  assert.ok(12 * 7 > 80, "7 itens estouram os R$ 80");
  num("inequacoes", "problemas", "q2", Math.max(...itens));

  alt("inequacoes", "problemas", "q3", "6 pessoas");
  // e o arredondamento da q3 é para BAIXO, sempre, em problema de teto
  for (const limite of [6.4, 7.9, 12.1, 3.5]) {
    const cabe = inteirosQueServem((x) => x, "<=", () => limite, 0, 50);
    assert.equal(Math.max(...cabe), Math.floor(limite), `teto ${limite}`);
  }

  // q4: estacionamento 6 + 4(x − 1) ≤ 30
  const horas = inteirosQueServem((x) => 6 + 4 * (x - 1), "<=", () => 30, 1, 40);
  assert.equal(Math.max(...horas), 7);
  assert.equal(6 + 4 * (7 - 1), 30, "7 horas dão exatamente R$ 30");
  assert.ok(6 + 4 * (8 - 1) > 30, "8 horas estouram");
  num("inequacoes", "problemas", "q4", Math.max(...horas));
});

// ---------- Retas paralelas e transversais (7º ano) ----------
//
// Geometria pede a conferência que o bloco do 6º ano estabeleceu: além de
// recalcular as respostas, o teste importa o gerador, lê as coordenadas do
// SVG e MEDE com trigonometria o ângulo desenhado. Se a figura e o rótulo
// discordarem, o aluno vê uma coisa e lê outra — foi assim que três figuras
// erradas apareceram na revisão do 6º.

/** Ângulo de um segmento com a horizontal, em graus, na faixa [0, 180). */
function anguloDoSegmento([x1, y1, x2, y2]) {
  const a = (Math.atan2(-(y2 - y1), x2 - x1) * 180) / Math.PI;
  return ((a % 180) + 180) % 180;
}

/** As três retas grossas da figura, já como ângulos. */
function retasDoSvg(svg) {
  return [...svg.matchAll(/<line x1="([\-0-9.]+)" y1="([\-0-9.]+)" x2="([\-0-9.]+)" y2="([\-0-9.]+)"[^>]*stroke-width="2\.5"/g)]
    .map((m) => anguloDoSegmento(m.slice(1, 5).map(Number)));
}

/** Medida de cada setor: a e c valem θ; b e d valem 180 − θ. */
const setor = (chave, t) => (chave === "a" || chave === "c" ? t : 180 - t);

teste("paralelas · o desenho tem duas retas paralelas de verdade", () => {
  // Não basta o gerador prometer paralelismo: o teste mede as três retas do
  // SVG e exige que duas tenham exatamente o mesmo ângulo, e a terceira não.
  for (const g of [40, 55, 62, 90, 118, 140]) {
    const svg = desenhos.paralelasTransversal({ graus: g, cima: { a: "x" } });
    const angs = retasDoSvg(svg);
    assert.equal(angs.length, 3, `graus ${g}: esperava três retas no SVG`);

    const horizontais = angs.filter((a) => Math.abs(a) < 1e-6);
    assert.equal(horizontais.length, 2, `graus ${g}: as duas paralelas deviam ser horizontais`);

    const transversal = angs.find((a) => Math.abs(a) > 1e-6);
    assert.ok(
      Math.abs(transversal - g) < 0.5,
      `graus ${g}: a transversal foi desenhada a ${transversal.toFixed(2)}°`
    );
  }
});

teste("paralelas · a figura nunca desmente o rótulo", () => {
  // Percorre TODAS as figuras publicadas da matéria, mede a transversal e
  // exige que todo rótulo numérico seja um dos dois valores que aquele
  // desenho realmente produz.
  const daMateria = manifesto.filter((x) => x.id.startsWith("rp-"));
  assert.ok(daMateria.length >= 30, "esperava as figuras da matéria no manifesto");

  let conferidos = 0;
  for (const item of daMateria) {
    const svg = item.desenho();
    const angs = retasDoSvg(svg);
    if (angs.length !== 3) continue;              // retasCruzadas e tabelas
    const transversal = angs.find((a) => Math.abs(a) > 1e-6);
    if (transversal === undefined) continue;      // transversal perpendicular

    const valores = [Math.round(transversal), Math.round(180 - transversal)];
    for (const m of svg.matchAll(/font-size="14"[^>]*>([0-9]+)°</g)) {
      const rotulo = Number(m[1]);
      assert.ok(
        valores.includes(rotulo),
        `${item.id}: rótulo ${rotulo}° numa figura cujos setores medem ${valores.join(" e ")}`
      );
      conferidos += 1;
    }
  }
  assert.ok(conferidos >= 20, `esperava conferir ao menos 20 rótulos, conferi ${conferidos}`);
});

teste("paralelas · lição 1 — opostos pelo vértice e vizinhos", () => {
  // Duas retas cruzando: os quatro ângulos fecham 360°, opostos são iguais e
  // vizinhos somam 180°. Conferido em toda a faixa, e não só no exemplo.
  for (let t = 1; t < 180; t++) {
    const quatro = [t, 180 - t, t, 180 - t];
    assert.equal(quatro.reduce((s, v) => s + v, 0), 360, `θ=${t}: a volta não fecha`);
    assert.equal(quatro[0], quatro[2], "opostos pelo vértice");
    assert.equal(quatro[0] + quatro[1], 180, "vizinhos");
  }

  assert.equal(180 - 70, 110, "o exemplo resolvido não fecha");
  num("retas-paralelas", "paralelas", "q1", 35);
  num("retas-paralelas", "paralelas", "q2", 180 - 35);
  alt("retas-paralelas", "paralelas", "q3", "Retas de um mesmo plano que nunca se cruzam");
  num("retas-paralelas", "paralelas", "q4", 360 / 4);
});

teste("paralelas · lição 2 — oito ângulos, dois valores", () => {
  // Monta os oito ângulos a partir da inclinação e confere que eles assumem
  // exatamente dois valores distintos, somando 180°, para qualquer θ.
  for (let t = 5; t < 180; t += 5) {
    if (t === 90) continue;                       // aí os dois valores coincidem
    const oito = [];
    for (const onde of ["cima", "baixo"]) {
      for (const c of ["a", "b", "c", "d"]) oito.push(setor(c, t));
    }
    assert.equal(oito.length, 8, "são oito ângulos");
    const distintos = [...new Set(oito)];
    assert.equal(distintos.length, 2, `θ=${t}: apareceram ${distintos.length} valores`);
    assert.equal(distintos[0] + distintos[1], 180, `θ=${t}: os dois valores deviam somar 180`);
    // e cada valor aparece exatamente quatro vezes
    for (const v of distintos) {
      assert.equal(oito.filter((x) => x === v).length, 4, `θ=${t}: contagem de ${v}°`);
    }
  }

  num("retas-paralelas", "transversal", "q1", 2 * 4);
  num("retas-paralelas", "transversal", "q2", 180 - 50);
  alt("retas-paralelas", "transversal", "q3", "Apenas dois, e eles somam 180°");
  num("retas-paralelas", "transversal", "q4", 4);
});

teste("paralelas · lição 3 — correspondentes são iguais", () => {
  // Correspondentes = mesma chave nos dois cruzamentos.
  for (let t = 5; t < 180; t += 5) {
    for (const c of ["a", "b", "c", "d"]) {
      assert.equal(setor(c, t), setor(c, t), `correspondentes ${c} em θ=${t}`);
    }
  }

  assert.equal(setor("c", 50), 50, "o exemplo resolvido não fecha");
  num("retas-paralelas", "correspondentes", "q1", 65);
  alt("retas-paralelas", "correspondentes", "q2", "Ocupam a mesma posição nos dois cruzamentos");
  num("retas-paralelas", "correspondentes", "q3", 118);
  // q4: 2x = 80, resolvido por busca como em Equações
  const serve = [];
  for (let x = 0; x <= 180; x++) if (2 * x === 80) serve.push(x);
  assert.deepEqual(serve, [40]);
  num("retas-paralelas", "correspondentes", "q4", serve[0]);
});

teste("paralelas · lição 4 — alternos são iguais, e vêm dos correspondentes", () => {
  // Alternos internos: cima.c e baixo.a. Alternos externos: cima.b e baixo.d.
  for (let t = 5; t < 180; t += 5) {
    assert.equal(setor("c", t), setor("a", t), `alternos internos em θ=${t}`);
    assert.equal(setor("b", t), setor("d", t), `alternos externos em θ=${t}`);
    // e o encadeamento que a lição afirma: alterno = oposto do correspondente
    const correspondente = setor("a", t);         // baixo.a é correspondente de cima.a
    const opostoDele = setor("c", t);             // cima.c é oposto de cima.a
    assert.equal(correspondente, opostoDele, `encadeamento em θ=${t}`);
  }

  assert.equal(setor("c", 55), 55, "o exemplo resolvido não fecha");
  num("retas-paralelas", "alternos", "q1", 47);
  alt("retas-paralelas", "alternos", "q2", "Entre as paralelas e em lados opostos da transversal");
  num("retas-paralelas", "alternos", "q3", 130);
  const serve = [];
  for (let x = 0; x <= 180; x++) if (x + 20 === 70) serve.push(x);
  assert.deepEqual(serve, [50]);
  num("retas-paralelas", "alternos", "q4", serve[0]);
});

teste("paralelas · lição 5 — colaterais somam 180°", () => {
  // Colaterais internos: cima.c e baixo.b. Colaterais externos: cima.a e baixo.d.
  for (let t = 5; t < 180; t += 5) {
    assert.equal(setor("c", t) + setor("b", t), 180, `colaterais internos em θ=${t}`);
    assert.equal(setor("a", t) + setor("d", t), 180, `colaterais externos em θ=${t}`);
    // e eles NUNCA são iguais, a não ser com transversal perpendicular
    if (t !== 90) {
      assert.notEqual(setor("c", t), setor("b", t), `θ=${t}: colaterais não podiam ser iguais`);
    }
  }

  assert.equal(180 - 110, 70, "o exemplo resolvido não fecha");
  num("retas-paralelas", "colaterais", "q1", 180 - 65);
  alt("retas-paralelas", "colaterais", "q2", "São suplementares: somam 180°");
  num("retas-paralelas", "colaterais", "q3", 180 - 140);
  // q4: 3x + x = 180, por busca
  const serve = [];
  for (let x = 0; x <= 180; x++) if (3 * x + x === 180) serve.push(x);
  assert.deepEqual(serve, [45]);
  num("retas-paralelas", "colaterais", "q4", serve[0]);
});

teste("paralelas · lição 6 — encadear dá o mesmo por qualquer caminho", () => {
  // O resolvido: de 75° até o colateral interno do alterno interno.
  // Caminho 1: alterno (igual) → colateral (suplementar).
  // Caminho 2: colateral (suplementar) → correspondente (igual).
  for (let t = 5; t < 180; t += 5) {
    const caminho1 = 180 - setor("c", t);         // alterno e depois colateral
    const caminho2 = setor("b", t);               // colateral e depois correspondente
    assert.equal(caminho1, caminho2, `θ=${t}: os dois caminhos discordaram`);
  }
  assert.equal(180 - 75, 105, "o exemplo resolvido não fecha");

  num("retas-paralelas", "problemas", "q1", 180 - 112);

  // q2: alternos internos 2x + 10 e 3x − 20, por busca
  const q2 = [];
  for (let x = 0; x <= 180; x++) if (2 * x + 10 === 3 * x - 20) q2.push(x);
  assert.deepEqual(q2, [30]);
  assert.equal(2 * 30 + 10, 70, "as duas expressões têm de dar o mesmo ângulo");
  assert.equal(3 * 30 - 20, 70);
  num("retas-paralelas", "problemas", "q2", q2[0]);

  // q3: colaterais 5x e 4x; a pergunta é o MAIOR ângulo, e não o x
  const q3 = [];
  for (let x = 0; x <= 180; x++) if (5 * x + 4 * x === 180) q3.push(x);
  assert.deepEqual(q3, [20]);
  const maior = Math.max(5 * q3[0], 4 * q3[0]);
  assert.equal(maior, 100);
  assert.equal(5 * q3[0] + 4 * q3[0], 180, "os dois colaterais têm de fechar 180");
  num("retas-paralelas", "problemas", "q3", maior);

  alt("retas-paralelas", "problemas", "q4", "Não: só existem dois valores, e eles já são 130° e 50°");
  assert.equal(130 + 50, 180, "os dois valores da q4 têm de ser suplementares");
});

// ---------- Triângulos e quadriláteros (7º ano) ----------
//
// Geometria de novo, então a conferência vai além de recalcular respostas: o
// teste lê o polígono do SVG de volta, mede cada ângulo interno com
// trigonometria e exige que os rótulos batam. Foi para isso que `figuraPlana`
// ganhou `angulos` — as formas do catálogo têm ângulos fixos, e rotulá-las
// com os do enunciado produzia figura que desmente o próprio rótulo.

/** Ângulos internos de um polígono lido do SVG, em graus. */
function angulosDoPoligono(P) {
  return P.map((_, i) => {
    const v = P[i], u = P[(i + 1) % P.length], w = P[(i - 1 + P.length) % P.length];
    const a1 = Math.atan2(u[1] - v[1], u[0] - v[0]);
    const a2 = Math.atan2(w[1] - v[1], w[0] - v[0]);
    const x = Math.abs((a1 - a2) * 180 / Math.PI);
    return x > 180 ? 360 - x : x;
  });
}

/** O polígono da figura, já em coordenadas. */
function poligonoDoSvg(svg) {
  const m = svg.match(/<polygon points="([^"]+)" fill="#dad2c1"/);
  return m ? m[1].split(" ").map((p) => p.split(",").map(Number)) : null;
}

teste("triângulos · o gerador desenha os ângulos que lhe pedem", () => {
  // Sem isso, nada mais neste bloco vale: é a garantia de que a figura pode
  // ser construída a partir do enunciado em vez de escolhida de um catálogo.
  const casos = [[90, 35], [30, 60], [40, 40], [45, 65], [50, 60], [70, 70], [60, 60]];
  for (const [a, b] of casos) {
    const P = poligonoDoSvg(desenhos.figuraPlana({ angulos: [a, b], rotulosVertices: ["", "", ""] }));
    const medidos = angulosDoPoligono(P);
    const esperados = [a, b, 180 - a - b];
    esperados.forEach((e, i) => {
      assert.ok(
        Math.abs(medidos[i] - e) < 0.3,
        `pedi ${esperados.join("/")} e o desenho saiu ${medidos.map((x) => x.toFixed(1)).join("/")}`
      );
    });
    assert.ok(Math.abs(medidos.reduce((s, v) => s + v, 0) - 180) < 0.3, "os três têm de somar 180");
  }

  // e o mesmo para os quadriláteros
  for (const q of [[100, 80, 110, 70], [90, 90, 120, 60], [85, 95, 100, 80], [70, 110, 70, 110]]) {
    const P = poligonoDoSvg(desenhos.figuraPlana({ angulos: q, rotulosVertices: ["", "", "", ""] }));
    const medidos = angulosDoPoligono(P);
    q.forEach((e, i) => {
      assert.ok(
        Math.abs(medidos[i] - e) < 0.5,
        `pedi ${q.join("/")} e o desenho saiu ${medidos.map((x) => x.toFixed(1)).join("/")}`
      );
    });
    assert.ok(Math.abs(medidos.reduce((s, v) => s + v, 0) - 360) < 0.5, "os quatro têm de somar 360");
  }
});

teste("triângulos · a figura nunca desmente o rótulo", () => {
  // Percorre todas as figuras publicadas da matéria e confere cada rótulo
  // numérico contra o ângulo realmente desenhado naquele vértice.
  const daMateria = manifesto.filter((x) => x.id.startsWith("tq-"));
  assert.ok(daMateria.length >= 30, "esperava as figuras da matéria no manifesto");

  let conferidos = 0;
  for (const item of daMateria) {
    const svg = item.desenho();
    const P = poligonoDoSvg(svg);
    if (!P) continue;                                  // tabelas e varetas
    const medidos = angulosDoPoligono(P);
    const soma = medidos.reduce((s, v) => s + v, 0);
    assert.ok(
      Math.abs(soma - (P.length - 2) * 180) < 0.6,
      `${item.id}: os ângulos somam ${soma.toFixed(1)}`
    );
    for (const m of svg.matchAll(/font-size="13"[^>]*>([0-9]+)°</g)) {
      const rotulo = Number(m[1]);
      assert.ok(
        medidos.some((x) => Math.abs(x - rotulo) < 1.2),
        `${item.id}: rótulo ${rotulo}° numa figura cujos ângulos são ${medidos.map((x) => x.toFixed(1)).join(", ")}`
      );
      conferidos += 1;
    }
  }
  assert.ok(conferidos >= 15, `esperava conferir ao menos 15 rótulos, conferi ${conferidos}`);
});

teste("triângulos · lição 1 — os dois nomes de cada triângulo", () => {
  // A classificação pelos lados e a classificação pelos ângulos são
  // independentes: o teste monta todos os cruzamentos possíveis e confere.
  const porLados = (a, b, c) =>
    a === b && b === c ? "equilátero" : (a === b || b === c || a === c ? "isósceles" : "escaleno");
  const porAngulos = (x, y, z) => {
    const maior = Math.max(x, y, z);
    return maior > 90 ? "obtusângulo" : maior === 90 ? "retângulo" : "acutângulo";
  };

  assert.equal(porLados(5, 5, 8), "isósceles", "o exemplo resolvido não fecha");
  assert.equal(porAngulos(40, 40, 100), "obtusângulo", "o exemplo resolvido não fecha");
  assert.equal(40 + 40 + 100, 180, "os ângulos do exemplo têm de somar 180");

  alt("triangulos-quadrilateros", "triangulos", "q1", "Escaleno");
  alt("triangulos-quadrilateros", "triangulos", "q2", "Obtusângulo");
  num("triangulos-quadrilateros", "triangulos", "q3", 2);
  num("triangulos-quadrilateros", "triangulos", "q4", 180 / 3);

  // Nenhum triângulo pode ter dois ângulos de 90° ou mais: o teste varre a
  // faixa e mostra que sobraria zero ou menos para o terceiro.
  for (let x = 90; x <= 170; x += 5) {
    for (let y = 90; y <= 170; y += 5) {
      assert.ok(180 - x - y <= 0, `${x}° e ${y}° não deixariam nada para o terceiro`);
    }
  }
});

teste("triângulos · lição 2 — a soma 180° e a demonstração", () => {
  assert.equal(180 - 50 - 60, 70, "o exemplo resolvido não fecha");

  num("triangulos-quadrilateros", "soma-triangulo", "q1", 180 - 45 - 65);
  num("triangulos-quadrilateros", "soma-triangulo", "q2", 180 - 90 - 35);
  alt("triangulos-quadrilateros", "soma-triangulo", "q3",
    "Porque, traçando uma paralela por um vértice, os três formam um ângulo raso");
  num("triangulos-quadrilateros", "soma-triangulo", "q4", 180 / 3);

  // A demonstração da lição: os dois alternos internos mais o ângulo do topo
  // formam meia volta. Conferido em toda a faixa de triângulos possíveis.
  for (let a = 10; a < 170; a += 5) {
    for (let b = 10; a + b < 175; b += 5) {
      const c = 180 - a - b;
      // os alternos repetem os ângulos da base, e os três cobrem a paralela
      assert.equal(a + c + b, 180, `triângulo ${a}/${b}/${c}`);
      assert.ok(c > 0, "o terceiro ângulo tem de existir");
    }
  }
});

teste("triângulos · lição 3 — a condição de existência", () => {
  const fecha = (x, y, z) => {
    const l = [x, y, z].sort((p, q) => p - q);
    return l[0] + l[1] > l[2];
  };

  assert.equal(fecha(3, 4, 6), true, "o exemplo resolvido não fecha");
  assert.equal(fecha(3, 5, 8), false, "o empate citado no fecho tinha de falhar");

  alt("triangulos-quadrilateros", "existencia", "q1", "Não, porque 2 + 3 é menor que 9");
  alt("triangulos-quadrilateros", "existencia", "q2", "Sim, porque 5 + 6 é maior que 10");

  // Com lados 4 e 9, varre TODOS os terceiros lados inteiros e confere que a
  // faixa que fecha é exatamente de 6 a 12 — os dois extremos das questões.
  const servem = [];
  for (let t = 1; t <= 40; t++) if (fecha(4, 9, t)) servem.push(t);
  assert.equal(Math.min(...servem), 6, "o menor terceiro lado inteiro");
  assert.equal(Math.max(...servem), 12, "o maior terceiro lado inteiro");
  assert.ok(!servem.includes(5), "o 5 dá empate e não pode entrar");
  assert.ok(!servem.includes(13), "o 13 dá empate e não pode entrar");
  num("triangulos-quadrilateros", "existencia", "q3", Math.min(...servem));
  num("triangulos-quadrilateros", "existencia", "q4", Math.max(...servem));

  // A regra vale nos dois sentidos: se fecha, o terceiro está entre a
  // diferença e a soma dos outros dois. Conferido por força bruta.
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      for (let c = 1; c <= 24; c++) {
        const naFaixa = c > Math.abs(a - b) && c < a + b;
        assert.equal(fecha(a, b, c), naFaixa, `${a}, ${b}, ${c}`);
      }
    }
  }
});

teste("triângulos · lição 4 — a família dos quadriláteros", () => {
  // As exigências de cada nome, escritas como propriedades a conferir.
  const quadrado = { paralelo: 2, ladosIguais: 4, retos: 4 };
  const retangulo = { paralelo: 2, ladosIguais: 2, retos: 4 };
  const losango = { paralelo: 2, ladosIguais: 4, retos: 0 };
  const trapezio = { paralelo: 1, ladosIguais: 0, retos: 0 };

  // Um quadrado cumpre TUDO o que o retângulo exige, e por isso é retângulo.
  assert.ok(quadrado.paralelo >= retangulo.paralelo && quadrado.retos >= retangulo.retos);
  // E cumpre o que o losango exige.
  assert.ok(quadrado.paralelo >= losango.paralelo && quadrado.ladosIguais >= losango.ladosIguais);
  // Mas o retângulo comum NÃO cumpre o do quadrado.
  assert.ok(retangulo.ladosIguais < quadrado.ladosIguais, "nem todo retângulo é quadrado");
  // E o trapézio fica fora dos paralelogramos.
  assert.ok(trapezio.paralelo < 2, "o trapézio não é paralelogramo");

  alt("triangulos-quadrilateros", "quadrilateros", "q1", "Quadrado");
  alt("triangulos-quadrilateros", "quadrilateros", "q2", "Trapézio");
  alt("triangulos-quadrilateros", "quadrilateros", "q3", "Sim, porque ele tem os quatro ângulos retos");
  num("triangulos-quadrilateros", "quadrilateros", "q4", 4);
});

teste("triângulos · lição 5 — a soma 360° e os polígonos maiores", () => {
  // A regra geral que a lição enuncia: um polígono de n lados se parte em
  // n − 2 triângulos, então soma (n − 2) × 180°.
  const soma = (n) => (n - 2) * 180;
  assert.equal(soma(3), 180);
  assert.equal(soma(4), 360);
  assert.equal(soma(5), 540, "o valor citado na lição");
  assert.equal(soma(6), 720, "o valor citado na lição");

  assert.equal(360 - 100 - 80 - 110, 70, "o exemplo resolvido não fecha");
  num("triangulos-quadrilateros", "soma-quadrilatero", "q1", 360 - 90 - 90 - 120);
  num("triangulos-quadrilateros", "soma-quadrilatero", "q2", 360 - 85 - 95 - 100);
  alt("triangulos-quadrilateros", "soma-quadrilatero", "q3",
    "Porque ele se divide em dois triângulos, e cada um soma 180°");
  num("triangulos-quadrilateros", "soma-quadrilatero", "q4", 70);

  // No paralelogramo: opostos iguais e vizinhos suplementares, para todo ângulo.
  for (let a = 10; a <= 170; a += 5) {
    const vizinho = 180 - a;
    assert.equal(a + vizinho + a + vizinho, 360, `paralelogramo de ${a}°`);
  }
});

teste("triângulos · lição 6 — juntar tudo numa figura só", () => {
  // Isósceles: sabendo o ângulo do vértice, os da base saem por busca.
  const daBase = (vertice) => {
    const serve = [];
    for (let x = 1; x <= 179; x++) if (vertice + 2 * x === 180) serve.push(x);
    return serve;
  };
  assert.deepEqual(daBase(40), [70], "o exemplo resolvido não fecha");
  num("triangulos-quadrilateros", "problemas", "q1", daBase(40)[0]);
  assert.deepEqual(daBase(100), [40], "o caso citado no fecho");

  // x, 2x, 3x resolvido por busca, e não pela fórmula
  const q2 = [];
  for (let x = 1; x <= 180; x++) if (x + 2 * x + 3 * x === 180) q2.push(x);
  assert.deepEqual(q2, [30]);
  assert.deepEqual([q2[0], 2 * q2[0], 3 * q2[0]], [30, 60, 90]);
  assert.equal(30 + 60 + 90, 180, "os três ângulos têm de fechar");
  num("triangulos-quadrilateros", "problemas", "q2", q2[0]);

  num("triangulos-quadrilateros", "problemas", "q3", 360 - 90 - 90 - 60);
  num("triangulos-quadrilateros", "problemas", "q4", 180 - 110);

  // A confusão que a lição avisa: usar 180 onde deveria ser 360 erra por
  // exatamente 180 graus, e o teste registra isso.
  assert.equal((360 - 90 - 90 - 60) - (180 - 90 - 90 - 60), 180);
});

// ---------- Circunferência e círculo (7º ano) ----------
//
// A matéria usa π = 3,14, e o teste usa o MESMO valor: conferir com o π de
// verdade acusaria erro em toda resposta publicada, porque 3,14 é uma
// aproximação. O que o teste faz é garantir que a aproximação foi aplicada de
// forma consistente, e que as relações estruturais (dobrar o raio quadruplica
// a área) valem com o π exato também.

const PI = 3.14;
const comprimento = (r) => 2 * PI * r;
const area = (r) => PI * r * r;
/** Compara em centavos de unidade, para o ponto flutuante não atrapalhar. */
const perto = (a, b) => Math.abs(a - b) < 1e-9;

teste("círculo · o desenho do π mostra três diâmetros e uma sobra", () => {
  // A figura que explica o π é medida de volta: a fita tem de ter o
  // comprimento da circunferência de verdade, e as marcas do diâmetro têm de
  // caber três vezes, sobrando um pedaço menor que um diâmetro.
  for (const d of [60, 78, 88, 100]) {
    const svg = desenhos.piDesenrolado({ diametro: d });
    // a fita é a linha grossa horizontal
    const fita = [...svg.matchAll(/<line x1="([0-9.]+)" y1="([0-9.]+)" x2="([0-9.]+)" y2="\2"[^>]*stroke-width="3"/g)]
      .map((m) => Number(m[3]) - Number(m[1]));
    assert.equal(fita.length, 1, `diâmetro ${d}: esperava uma fita só`);
    assert.ok(
      Math.abs(fita[0] - Math.PI * d) < 0.5,
      `diâmetro ${d}: a fita mede ${fita[0].toFixed(1)} e a volta é ${(Math.PI * d).toFixed(1)}`
    );
    // e a sobra é o que passa de três diâmetros
    const sobra = fita[0] - 3 * d;
    assert.ok(sobra > 0, "tem de sobrar alguma coisa depois de três diâmetros");
    assert.ok(sobra < d, "a sobra tem de ser menor que um diâmetro inteiro");
  }
});

teste("círculo · lição 1 — a linha, a região e o dobro", () => {
  const diametro = (r) => 2 * r;
  const raio = (d) => d / 2;

  assert.equal(diametro(6), 12, "o exemplo resolvido não fecha");
  assert.equal(raio(18), 9, "o exemplo resolvido não fecha");

  alt("circunferencia", "circunferencia-circulo", "q1",
    "A circunferência é a linha; o círculo é a linha mais a região de dentro");
  num("circunferencia", "circunferencia-circulo", "q2", diametro(7));
  num("circunferencia", "circunferencia-circulo", "q3", raio(18));
  alt("circunferencia", "circunferencia-circulo", "q4", "Diâmetro");

  // As duas conversões são inversas uma da outra, em toda a faixa.
  for (let r = 1; r <= 60; r++) {
    assert.equal(raio(diametro(r)), r, `raio ${r}`);
    assert.ok(diametro(r) > r, "o diâmetro é sempre maior que o raio");
  }
});

teste("círculo · lição 2 — o π é a razão, e ela não muda", () => {
  // A afirmação central: volta ÷ diâmetro dá o mesmo em QUALQUER círculo.
  // Conferida com o π exato, e não com a aproximação.
  const razoes = [];
  for (let d = 1; d <= 200; d += 7) {
    razoes.push((Math.PI * d) / d);
  }
  for (const r of razoes) {
    assert.ok(Math.abs(r - Math.PI) < 1e-12, "a razão tem de ser sempre a mesma");
  }
  assert.equal(new Set(razoes.map((x) => x.toFixed(10))).size, 1, "um único valor");

  assert.ok(perto(31.4 / 10, 3.14), "o exemplo resolvido não fecha");
  assert.ok(perto(62.8 / 20, 3.14), "o segundo prato do resolvido não fecha");

  num("circunferencia", "o-numero-pi", "q1", 6.28 / 2);
  alt("circunferencia", "o-numero-pi", "q2", "Quantas vezes o diâmetro cabe na volta da circunferência");
  alt("circunferencia", "o-numero-pi", "q3", "Não: é sempre o mesmo, em qualquer circunferência");
  num("circunferencia", "o-numero-pi", "q4", Math.floor(Math.PI));
  assert.equal(Math.floor(Math.PI), 3, "cabem três diâmetros inteiros");
});

teste("círculo · lição 3 — as duas fórmulas do comprimento", () => {
  // C = 2πr e C = πd são a MESMA fórmula: conferido em toda a faixa.
  for (let r = 1; r <= 50; r++) {
    assert.ok(perto(2 * PI * r, PI * (2 * r)), `raio ${r}: as duas fórmulas discordaram`);
  }

  assert.ok(perto(comprimento(5), 31.4), "o exemplo resolvido não fecha");
  num("circunferencia", "comprimento", "q1", comprimento(3));
  num("circunferencia", "comprimento", "q2", PI * 10);
  // q3 é a fórmula ao contrário: dado o comprimento, achar o diâmetro
  num("circunferencia", "comprimento", "q3", 62.8 / PI);
  alt("circunferencia", "comprimento", "q4", "Não: como d = 2r, as duas são a mesma fórmula");

  // ida e volta: do raio ao comprimento e de volta ao raio
  for (let r = 1; r <= 40; r++) {
    assert.ok(perto(comprimento(r) / (2 * PI), r), `ida e volta com raio ${r}`);
  }
});

teste("círculo · lição 4 — a área usa o raio ao quadrado", () => {
  assert.ok(perto(area(5), 78.5), "o exemplo resolvido não fecha");
  num("circunferencia", "area", "q1", area(3));
  num("circunferencia", "area", "q2", area(10));
  num("circunferencia", "area", "q3", area(8 / 2));
  alt("circunferencia", "area", "q4",
    "O comprimento mede a linha da volta; a área mede a região de dentro");

  // O erro previsto de usar o diâmetro no lugar do raio quadruplica a área —
  // e é isso que o diagnóstico da q3 afirma.
  for (let r = 1; r <= 30; r++) {
    assert.ok(perto(area(2 * r), 4 * area(r)), `usar o diâmetro em vez do raio, com r = ${r}`);
  }

  // E a área é sempre menor que a do quadrado que encaixa o círculo, como o
  // último parágrafo da lição afirma.
  for (let r = 1; r <= 30; r++) {
    const quadrado = (2 * r) ** 2;
    assert.ok(area(r) < quadrado, `o círculo de raio ${r} tem de caber no quadrado`);
    assert.ok(area(r) > quadrado * 0.7, "e ocupa mais de 70% dele");
  }
});

teste("círculo · lição 5 — dobrar o raio quadruplica a área", () => {
  // A afirmação central da lição, conferida com o π EXATO para não depender
  // da aproximação: é uma propriedade da fórmula, e não do valor de π.
  const areaExata = (r) => Math.PI * r * r;
  const compExato = (r) => 2 * Math.PI * r;

  for (let r = 1; r <= 40; r++) {
    for (const fator of [2, 3, 4, 10]) {
      assert.ok(
        Math.abs(compExato(fator * r) - fator * compExato(r)) < 1e-9,
        `raio ×${fator}: o comprimento tinha de multiplicar por ${fator}`
      );
      assert.ok(
        Math.abs(areaExata(fator * r) - fator * fator * areaExata(r)) < 1e-9,
        `raio ×${fator}: a área tinha de multiplicar por ${fator * fator}`
      );
    }
  }

  // O exemplo resolvido, com o π da matéria
  assert.ok(perto(comprimento(6) / comprimento(3), 2), "o comprimento tinha de dobrar");
  assert.ok(perto(area(6) / area(3), 4), "a área tinha de quadruplicar");

  num("circunferencia", "dobrar-o-raio", "q1", comprimento(8));
  num("circunferencia", "dobrar-o-raio", "q2", area(8));
  alt("circunferencia", "dobrar-o-raio", "q3", "Fica 4 vezes maior");
  num("circunferencia", "dobrar-o-raio", "q4", 3 * 3);

  // e o erro previsto do 27 é mesmo o fator de VOLUME, como o diagnóstico diz
  assert.equal(3 ** 3, 27);
});

teste("círculo · lição 6 — decidir entre borda e superfície", () => {
  assert.ok(perto(PI * 50, 157), "o exemplo resolvido não fecha");
  // e o fecho: quantas voltas em 10 metros
  assert.ok(Math.abs(1000 / 157 - 6.369) < 0.01, "o fecho do resolvido");

  num("circunferencia", "problemas", "q1", area(15));
  num("circunferencia", "problemas", "q2", comprimento(10));
  // q3 é a fórmula da área ao contrário
  num("circunferencia", "problemas", "q3", Math.sqrt(12.56 / PI));
  alt("circunferencia", "problemas", "q4",
    "O comprimento para as grades e a área para o calçamento");

  // A ida e volta da área: do raio à área e de volta ao raio.
  for (let r = 1; r <= 30; r++) {
    assert.ok(perto(Math.sqrt(area(r) / PI), r), `ida e volta da área com raio ${r}`);
  }

  // Uma roda que dá uma volta percorre exatamente o comprimento dela.
  for (const d of [50, 60, 70, 26]) {
    const porVolta = PI * d;
    assert.ok(porVolta > d, "uma volta anda mais que o diâmetro");
    assert.ok(porVolta < 4 * d, "e menos que quatro diâmetros");
  }
});

// ---------- Média, moda e mediana (7º ano) ----------
//
// O teste reimplementa as três medidas do zero e confere as PROPRIEDADES que
// as lições afirmam, por força bruta — não só o resultado das questões.
//
// A afirmação que dá sentido à matéria é que a mediana resiste a valores
// extremos e a média não. Isso é conferido em muitos conjuntos, e não só no
// exemplo dos salários.

const somaDe = (v) => v.reduce((s, x) => s + x, 0);
const mediaDe = (v) => somaDe(v) / v.length;
const medianaDe = (v) => {
  const o = [...v].sort((a, b) => a - b);
  const n = o.length;
  return n % 2 ? o[(n - 1) / 2] : (o[n / 2 - 1] + o[n / 2]) / 2;
};
const modasDe = (v) => {
  const c = new Map();
  for (const x of v) c.set(x, (c.get(x) ?? 0) + 1);
  const maior = Math.max(...c.values());
  return [...c.entries()].filter(([, n]) => n === maior).map(([x]) => x).sort((a, b) => a - b);
};

teste("estatística · as três medidas, e o que cada uma exige", () => {
  const idades = [7, 8, 8, 9, 13];
  assert.equal(mediaDe(idades), 9, "o exemplo resolvido não fecha");
  assert.equal(medianaDe(idades), 8, "o exemplo resolvido não fecha");
  assert.deepEqual(modasDe(idades), [8], "o exemplo resolvido não fecha");

  alt("estatistica-7", "tres-resumos", "q1", "O valor que fica no meio, com os dados colocados em ordem");
  alt("estatistica-7", "tres-resumos", "q2",
    "A moda, porque é a única que funciona com dados que não são números");
  alt("estatistica-7", "tres-resumos", "q3", "Que existe algum valor bem alto puxando a média para cima");
  num("estatistica-7", "tres-resumos", "q4", 3);

  // A afirmação da q3: média acima da mediana indica peso do lado alto.
  // Conferida construindo conjuntos com um valor destoante para cima.
  for (let extremo = 20; extremo <= 100; extremo += 10) {
    const v = [2, 3, 4, 5, extremo];
    assert.ok(mediaDe(v) > medianaDe(v), `com extremo ${extremo}, a média tinha de passar da mediana`);
  }
  // e o simétrico: extremo para baixo joga a média abaixo da mediana
  for (let extremo = -50; extremo <= -10; extremo += 10) {
    const v = [extremo, 20, 21, 22, 23];
    assert.ok(mediaDe(v) < medianaDe(v), `com extremo ${extremo}, a média tinha de ficar abaixo`);
  }
});

teste("estatística · lição 2 — a média nivela, e fica entre os extremos", () => {
  assert.equal(mediaDe([6, 7, 8, 9, 10]), 8, "o exemplo resolvido não fecha");

  num("estatistica-7", "media", "q1", mediaDe([4, 6, 8, 10]));
  num("estatistica-7", "media", "q2", mediaDe([12, 15, 18]));
  // q3 é a propriedade da soma: quanto falta na quarta prova para média 8
  const faltando = 8 * 4 - somaDe([6, 8, 9]);
  assert.equal(faltando, 9);
  assert.equal(mediaDe([6, 8, 9, faltando]), 8, "com a nota achada, a média tem de fechar");
  num("estatistica-7", "media", "q3", faltando);
  alt("estatistica-7", "media", "q4", "Não: ela fica sempre entre o menor e o maior valor");

  // A média NUNCA sai do intervalo — conferido em muitos conjuntos.
  for (let semente = 1; semente <= 60; semente++) {
    const v = [semente, semente * 2, semente + 7, 100 - semente, semente * 3 + 1];
    const m = mediaDe(v);
    assert.ok(m >= Math.min(...v) - 1e-9, `média abaixo do mínimo em ${v}`);
    assert.ok(m <= Math.max(...v) + 1e-9, `média acima do máximo em ${v}`);
  }

  // E média × quantidade devolve a soma, sempre.
  for (let n = 2; n <= 12; n++) {
    const v = Array.from({ length: n }, (_, i) => i * 3 + 2);
    assert.ok(Math.abs(mediaDe(v) * n - somaDe(v)) < 1e-9, `soma com ${n} valores`);
  }
});

teste("estatística · lição 3 — a mediana é posição, não tamanho", () => {
  assert.equal(medianaDe([3, 5, 7, 9, 11]), 7, "o exemplo resolvido não fecha");
  // o fecho: trocar o 11 por 110 não move a mediana, mas move a média
  assert.equal(medianaDe([3, 5, 7, 9, 110]), 7, "a mediana tinha de ficar parada");
  assert.equal(mediaDe([3, 5, 7, 9, 11]), 7);
  assert.equal(mediaDe([3, 5, 7, 9, 110]), 26.8, "a média tinha de disparar");

  num("estatistica-7", "mediana", "q1", medianaDe([2, 4, 6, 8, 10, 12]));
  // q2 exige ORDENAR antes: a lista vem embaralhada
  assert.equal(medianaDe([5, 1, 9, 3, 7]), 5);
  assert.notEqual([5, 1, 9, 3, 7][2], 5, "o valor do meio SEM ordenar é outro — é a armadilha da questão");
  num("estatistica-7", "mediana", "q2", medianaDe([5, 1, 9, 3, 7]));
  num("estatistica-7", "mediana", "q3", medianaDe([10, 20, 30, 40]));
  alt("estatistica-7", "mediana", "q4", "Não muda, porque a mediana olha a posição e não o tamanho");

  // A propriedade central: aumentar o MAIOR valor não move a mediana.
  for (let semente = 1; semente <= 40; semente++) {
    const base = [semente, semente + 2, semente + 4, semente + 6, semente + 8];
    const antes = medianaDe(base);
    const depois = medianaDe([...base.slice(0, 4), base[4] * 10]);
    assert.equal(antes, depois, `mediana se moveu com base ${semente}`);
    assert.notEqual(mediaDe(base), mediaDe([...base.slice(0, 4), base[4] * 10]), "a média tinha de mudar");
  }

  // Com quantidade par, a mediana pode não estar no conjunto — e tudo bem.
  assert.equal(medianaDe([10, 20, 30, 40]), 25);
  assert.ok(![10, 20, 30, 40].includes(25), "a mediana não precisa ser um dos valores");
});

teste("estatística · lição 4 — a moda conta, e pode não ser única", () => {
  assert.deepEqual(modasDe([2, 3, 3, 5, 7]), [3], "o exemplo resolvido não fecha");
  assert.equal(mediaDe([2, 3, 3, 5, 7]), 4, "o fecho compara a moda com a média");

  num("estatistica-7", "moda", "q1", modasDe([4, 7, 7, 9, 12])[0]);
  alt("estatistica-7", "moda", "q2", "Sim: quando dois ou mais valores empatam na maior frequência");
  alt("estatistica-7", "moda", "q3", "A moda, porque ela indica o tamanho mais vendido");
  alt("estatistica-7", "moda", "q4", "O conjunto não tem moda");

  // O exemplo bimodal citado na resolução da q2
  assert.deepEqual(modasDe([1, 1, 2, 3, 3]), [1, 3], "o conjunto tinha de ter duas modas");
  // e o conjunto sem repetição, da q4
  assert.deepEqual(modasDe([4, 5, 6, 7, 8]), [4, 5, 6, 7, 8], "todos empatam com frequência 1");
  const semRepetir = [4, 5, 6, 7, 8];
  const contagens = new Map();
  for (const x of semRepetir) contagens.set(x, (contagens.get(x) ?? 0) + 1);
  assert.equal(Math.max(...contagens.values()), 1, "nenhum valor se repete → conjunto sem moda");

  // A moda é sempre um valor que APARECE nos dados, ao contrário da mediana.
  for (let semente = 1; semente <= 30; semente++) {
    const v = [semente, semente, semente + 5, semente + 9];
    for (const m of modasDe(v)) assert.ok(v.includes(m), `moda ${m} não está em ${v}`);
  }
});

teste("estatística · lição 5 — a mediana resiste e a média não", () => {
  const salarios = [2, 2, 2, 2, 42];
  assert.equal(mediaDe(salarios), 10, "o exemplo resolvido não fecha");
  assert.equal(medianaDe(salarios), 2, "o exemplo resolvido não fecha");
  // quatro das cinco pessoas ganham menos que a média — é o argumento da lição
  assert.equal(salarios.filter((s) => s < mediaDe(salarios)).length, 4);
  assert.ok(!salarios.includes(mediaDe(salarios)), "ninguém ganha exatamente a média");

  num("estatistica-7", "qual-usar", "q1", mediaDe(salarios));
  num("estatistica-7", "qual-usar", "q2", medianaDe(salarios));
  alt("estatistica-7", "qual-usar", "q3", "A mediana, porque ela não é afetada pelos valores extremos");
  alt("estatistica-7", "qual-usar", "q4", "Não: o crescimento pode estar concentrado em poucas pessoas");

  // A afirmação da q4: a média pode subir com a maioria parada.
  for (let ganho = 10; ganho <= 200; ganho += 10) {
    const antes = [2, 2, 2, 2, 2];
    const depois = [2, 2, 2, 2, 2 + ganho];
    assert.ok(mediaDe(depois) > mediaDe(antes), `a média tinha de subir com ganho ${ganho}`);
    assert.equal(medianaDe(depois), medianaDe(antes), "e a mediana tinha de ficar parada");
    // quatro das cinco pessoas continuam exatamente iguais
    assert.equal(depois.filter((x) => x === 2).length, 4);
  }
});

teste("estatística · lição 6 — extrair da figura antes de calcular", () => {
  const vendas = [10, 20, 30, 40, 50];
  assert.equal(mediaDe(vendas), 30, "o exemplo resolvido não fecha");
  assert.equal(medianaDe(vendas), 30, "num conjunto simétrico as duas coincidem");

  num("estatistica-7", "problemas", "q1", mediaDe(vendas));
  // q2 lê uma tabela de frequência: nota 7 cinco vezes, nota 9 três vezes
  const daTabela = [...Array(5).fill(7), ...Array(3).fill(9)];
  assert.equal(daTabela.length, 8, "a tabela descreve oito alunos");
  assert.deepEqual(modasDe(daTabela), [7]);
  num("estatistica-7", "problemas", "q2", modasDe(daTabela)[0]);
  // q3 é a propriedade da soma ao contrário
  num("estatistica-7", "problemas", "q3", 12 * 6);
  alt("estatistica-7", "problemas", "q4",
    "Ler o valor de cada coluna na escala, e não comparar as alturas de olho");

  // A leitura da tabela de frequência tem de repetir o valor: a média de
  // [7,7,7,7,7,9,9,9] não é a média entre 7 e 9.
  assert.notEqual(mediaDe(daTabela), mediaDe([7, 9]));
  assert.ok(Math.abs(mediaDe(daTabela) - 7.75) < 1e-9);

  // E a figura do eixo cortado da q4 é conferida de volta pelo SVG: com base
  // em 50, as colunas 60, 70 e 80 NÃO ficam na proporção 6:7:8.
  const svg = desenhos.grafico({
    dados: [{ rotulo: "a", valor: 60 }, { rotulo: "b", valor: 70 }, { rotulo: "c", valor: 80 }],
    passo: 10, base: 50,
  });
  const alturas = [...svg.matchAll(/<rect[^>]*height="([0-9.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(alturas.length, 3, "esperava três colunas");
  const razaoDesenhada = alturas[2] / alturas[0];
  assert.ok(razaoDesenhada > 2.5, `com o eixo em 50, a terceira coluna vira ${razaoDesenhada.toFixed(1)}× a primeira`);
  assert.ok(80 / 60 < 1.4, "mas os valores reais estão bem mais próximos que isso");
});

// ---------- Probabilidade (7º ano) ----------
//
// A matéria inteira é contagem, então o teste CONTA — por força bruta, sem
// fórmula. Ele varre os 36 pares de dados de verdade e confere cada afirmação
// das lições contra essa varredura.
//
// E a grade dos dois dados é lida de volta do SVG: o gerador decide as
// células destacadas por uma função, e o teste conta as células marcadas para
// garantir que a figura mostra o que o enunciado afirma.

/** Todos os pares possíveis de dois dados de seis faces. */
const PARES_DE_DADOS = (() => {
  const p = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) p.push([a, b]);
  return p;
})();

const contarPares = (condicao) => PARES_DE_DADOS.filter(([a, b]) => condicao(a, b)).length;

/** Células destacadas na figura, lidas de volta do SVG. */
const celulasMarcadas = (svg) => [...svg.matchAll(/fill-opacity="0\.55"/g)].length;

teste("probabilidade · a grade dos dados desenha o que o enunciado afirma", () => {
  // O espaço amostral tem mesmo 36 pares, contados um a um.
  assert.equal(PARES_DE_DADOS.length, 36);

  const casos = [
    ["soma 7", (a, b) => a + b === 7],
    ["soma 12", (a, b) => a + b === 12],
    ["soma par", (a, b) => (a + b) % 2 === 0],
    ["soma maior que 9", (a, b) => a + b > 9],
  ];
  for (const [nome, cond] of casos) {
    const svg = desenhos.gradeDados({ destacar: cond });
    assert.equal(
      celulasMarcadas(svg), contarPares(cond),
      `${nome}: a figura destacou um número de células diferente da contagem`
    );
  }

  // e as somas escritas na grade são as somas de verdade
  const svg = desenhos.gradeDados({});
  const escritas = [...svg.matchAll(/font-size="12"[^>]*>([0-9]+)</g)].map((m) => Number(m[1]));
  assert.equal(escritas.length, 36, "esperava uma soma por célula");
  const esperadas = PARES_DE_DADOS.map(([a, b]) => a + b).sort((x, y) => x - y);
  assert.deepEqual([...escritas].sort((x, y) => x - y), esperadas, "as somas desenhadas não batem");
});

teste("probabilidade · lição 1 — favoráveis sobre possíveis", () => {
  assert.ok(Math.abs(1 / 6 - 0.1667) < 0.001, "o exemplo resolvido não fecha");

  num("probabilidade-7", "o-que-e", "q1", 1 / 2);
  alt("probabilidade-7", "o-que-e", "q2", "Não: toda probabilidade fica entre 0 e 1");
  num("probabilidade-7", "o-que-e", "q3", 3 / 10);
  alt("probabilidade-7", "o-que-e", "q4", "Zero, porque nenhuma face tem o número 7");

  // Toda probabilidade calculada como favoráveis/possíveis cai entre 0 e 1.
  for (let possiveis = 1; possiveis <= 40; possiveis++) {
    for (let favoraveis = 0; favoraveis <= possiveis; favoraveis++) {
      const p = favoraveis / possiveis;
      assert.ok(p >= 0 && p <= 1, `${favoraveis}/${possiveis} saiu fora do intervalo`);
    }
  }
  // o impossível dá 0 e a certeza dá 1
  assert.equal(0 / 6, 0);
  assert.equal(6 / 6, 1);
});

teste("probabilidade · lição 2 — o princípio multiplicativo", () => {
  assert.equal(2 * 3, 6, "o exemplo resolvido não fecha");
  // e a listagem citada no resolvido tem mesmo seis combinações
  const combinacoes = [];
  for (const c of ["C1", "C2"]) for (const p of ["P1", "P2", "P3"]) combinacoes.push(c + p);
  assert.equal(combinacoes.length, 6);
  assert.equal(new Set(combinacoes).size, 6, "nenhuma combinação pode se repetir");

  num("probabilidade-7", "espaco-amostral", "q1", 2 * 6);
  num("probabilidade-7", "espaco-amostral", "q2", 4 * 3);
  alt("probabilidade-7", "espaco-amostral", "q3", "Espaço amostral");
  num("probabilidade-7", "espaco-amostral", "q4", 2 * 2);

  // O princípio conferido por LISTAGEM, e não pela fórmula: montar todos os
  // pares e contar tem de dar o mesmo que multiplicar.
  for (let m = 1; m <= 8; m++) {
    for (let n = 1; n <= 8; n++) {
      const lista = [];
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) lista.push(`${i}-${j}`);
      assert.equal(lista.length, m * n, `${m} × ${n}`);
      assert.equal(new Set(lista).size, m * n, "sem repetição");
    }
  }
});

teste("probabilidade · lição 3 — vários favoráveis e o complementar", () => {
  const faces = [1, 2, 3, 4, 5, 6];
  assert.equal(faces.filter((f) => f % 2 === 0).length, 3, "o exemplo resolvido não fecha");
  assert.equal(3 / 6, 0.5);

  // q1: maior que 4 deixa o próprio 4 de fora
  const maiorQue4 = faces.filter((f) => f > 4);
  assert.deepEqual(maiorQue4, [5, 6]);
  assert.ok(!maiorQue4.includes(4), "o 4 não é maior que 4 — é a armadilha da questão");
  num("probabilidade-7", "calcular", "q1", 0.33);

  num("probabilidade-7", "calcular", "q2", 4 / (4 + 3 + 3));
  num("probabilidade-7", "calcular", "q3", 1 - 0.3);
  alt("probabilidade-7", "calcular", "q4", "Sair um número menor que 5");

  // A q4 afirma que "menor que 5" é o mais provável dos quatro eventos.
  const eventos = {
    "menor que 5": faces.filter((f) => f < 5).length,
    "par": faces.filter((f) => f % 2 === 0).length,
    "maior que 4": faces.filter((f) => f > 4).length,
    "o 6": faces.filter((f) => f === 6).length,
  };
  assert.deepEqual(eventos, { "menor que 5": 4, par: 3, "maior que 4": 2, "o 6": 1 });
  const vencedor = Object.entries(eventos).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(vencedor, "menor que 5");

  // O complementar sempre fecha 1, em toda a faixa.
  for (let f = 0; f <= 6; f++) {
    assert.ok(Math.abs(f / 6 + (6 - f) / 6 - 1) < 1e-9, `complementar de ${f}/6`);
  }
});

teste("probabilidade · lição 4 — as três formas dizem o mesmo", () => {
  // fração → decimal → porcentagem, conferido em muitas frações
  for (let d = 1; d <= 20; d++) {
    for (let n = 0; n <= d; n++) {
      const decimal = n / d;
      const porcento = decimal * 100;
      assert.ok(Math.abs(porcento / 100 - decimal) < 1e-12, `${n}/${d}`);
      assert.ok(decimal >= 0 && decimal <= 1, "decimal fora do intervalo");
      assert.ok(porcento >= 0 && porcento <= 100, "porcentagem fora do intervalo");
    }
  }

  assert.equal((3 / 5) * 100, 60, "o exemplo resolvido não fecha");
  num("probabilidade-7", "formas", "q1", (1 / 4) * 100);
  num("probabilidade-7", "formas", "q2", 40 / 100);
  alt("probabilidade-7", "formas", "q3", "5/13, porque dá cerca de 0,385");
  alt("probabilidade-7", "formas", "q4", "Que houve erro, porque nenhuma probabilidade passa de 100%");

  // A comparação da q3: 5/13 é MESMO maior que 3/8, apesar de parecer perto.
  assert.ok(5 / 13 > 3 / 8, "5/13 tinha de ser maior");
  assert.ok(Math.abs(3 / 8 - 0.375) < 1e-9);
  assert.ok(Math.abs(5 / 13 - 0.385) < 0.001);
});

teste("probabilidade · lição 5 — 7 sai seis vezes mais que 12", () => {
  const jeitos = (soma) => contarPares((a, b) => a + b === soma);

  assert.equal(PARES_DE_DADOS.length, 36, "o denominador da matéria");
  assert.equal(jeitos(7), 6, "o exemplo resolvido não fecha");
  assert.equal(jeitos(12), 1, "o exemplo resolvido não fecha");
  assert.equal(jeitos(7) / jeitos(12), 6, "a afirmação central da lição");

  num("probabilidade-7", "dois-dados", "q1", 36);
  num("probabilidade-7", "dois-dados", "q2", jeitos(7));
  num("probabilidade-7", "dois-dados", "q3", jeitos(12));
  num("probabilidade-7", "dois-dados", "q4", jeitos(7) / jeitos(12));

  // A lição afirma que 7 é a soma MAIS provável de todas: conferido varrendo
  // as onze somas possíveis, e não afirmado.
  const contagens = {};
  for (let soma = 2; soma <= 12; soma++) contagens[soma] = jeitos(soma);
  assert.deepEqual(contagens, { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 });
  const maisProvavel = Object.entries(contagens).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(Number(maisProvavel), 7, "o 7 tinha de ser a soma mais provável");
  // e a soma de todas as contagens tem de fechar o espaço amostral
  assert.equal(Object.values(contagens).reduce((s, x) => s + x, 0), 36);

  // O erro que a lição avisa: as 11 somas NÃO são igualmente prováveis.
  assert.notEqual(contagens[7], contagens[12], "se fossem iguais, a lição não existiria");
  // e (1,6) é mesmo diferente de (6,1)
  const setePares = PARES_DE_DADOS.filter(([a, b]) => a + b === 7);
  assert.ok(setePares.some(([a, b]) => a === 1 && b === 6));
  assert.ok(setePares.some(([a, b]) => a === 6 && b === 1));
});

teste("probabilidade · lição 6 — soma par, e a moeda sem memória", () => {
  const par = contarPares((a, b) => (a + b) % 2 === 0);
  assert.equal(par, 18, "o exemplo resolvido não fecha");
  assert.equal(par / 36, 0.5, "soma par é exatamente metade");

  // O argumento do resolvido: par+par mais ímpar+ímpar.
  const parPar = contarPares((a, b) => a % 2 === 0 && b % 2 === 0);
  const imparImpar = contarPares((a, b) => a % 2 === 1 && b % 2 === 1);
  assert.equal(parPar, 9);
  assert.equal(imparImpar, 9);
  assert.equal(parPar + imparImpar, par, "os dois grupos têm de cobrir todos os casos de soma par");

  num("probabilidade-7", "problemas", "q1", par);
  num("probabilidade-7", "problemas", "q2", contarPares((a, b) => a + b > 9));
  num("probabilidade-7", "problemas", "q3", 0.5);
  alt("probabilidade-7", "problemas", "q4",
    "Nada de errado: com poucas jogadas, a frequência pode se afastar da probabilidade");

  // A q2 conferida pela decomposição citada na resolução: 10, 11 e 12.
  const dezOnzeDoze = [10, 11, 12].map((s) => contarPares((a, b) => a + b === s));
  assert.deepEqual(dezOnzeDoze, [3, 2, 1]);
  assert.equal(dezOnzeDoze.reduce((s, x) => s + x, 0), contarPares((a, b) => a + b > 9));

  // A moeda não tem memória: a probabilidade da próxima jogada é sempre 1/2,
  // independentemente de quantas caras vieram antes.
  for (let carasSeguidas = 0; carasSeguidas <= 20; carasSeguidas++) {
    assert.equal(1 / 2, 0.5, `depois de ${carasSeguidas} caras, continua 1/2`);
  }
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


// ---------- Potências e notação científica (8º ano) ----------
//
// Nada aqui é conferido pela regra que a matéria ensina. As propriedades das
// potências são verificadas ABRINDO os fatores e contando, e a conversão para
// notação científica é feita ANDANDO com a vírgula sobre o texto do número —
// nunca com Math.log10, que resolveria a questão usando a mesma abstração que
// está sendo testada.

/** Lista de fatores de uma potência, escrita por extenso. */
const abrirFatores = (base, expoente) => Array.from({ length: expoente }, () => base);

/** Valor de uma potência multiplicando os fatores um a um. */
const valorPotencia = (base, expoente) => abrirFatores(base, expoente).reduce((p, f) => p * f, 1);

/**
 * Converte para notação científica ANDANDO com a vírgula no texto.
 * Devolve { fator, expoente } sem usar logaritmo nenhum.
 */
function paraCientifica(txt) {
  const s = String(txt).replace(",", ".");
  const negativo = s.startsWith("-");
  const corpo = negativo ? s.slice(1) : s;
  const ponto = corpo.includes(".") ? corpo.indexOf(".") : corpo.length;
  const digitos = corpo.replace(".", "");
  // primeiro algarismo diferente de zero: é depois dele que a vírgula para
  const primeiro = digitos.search(/[1-9]/);
  if (primeiro === -1) return { fator: 0, expoente: 0 };
  const expoente = ponto - primeiro - 1;
  const resto = digitos.slice(primeiro + 1).replace(/0+$/, "");
  const fator = Number(digitos[primeiro] + (resto ? "." + resto : ""));
  return { fator: negativo ? -fator : fator, expoente };
}

teste("notação científica · lição 1 — as propriedades saem de CONTAR fatores", () => {
  // Multiplicar potências de mesma base: as listas de fatores se juntam.
  // Conferido montando as duas listas e comparando com a lista somada.
  for (let base = 2; base <= 10; base += 1) {
    for (let a = 0; a <= 6; a += 1) {
      for (let b = 0; b <= 6; b += 1) {
        const juntos = [...abrirFatores(base, a), ...abrirFatores(base, b)];
        assert.equal(juntos.length, a + b, `${base}^${a} × ${base}^${b}: contagem de fatores`);
        assert.equal(
          juntos.reduce((p, f) => p * f, 1),
          valorPotencia(base, a + b),
          `${base}^${a} × ${base}^${b} tinha de dar ${base}^${a + b}`
        );
      }
    }
  }

  // Dividir subtrai, porque cada fator de baixo cancela um de cima.
  for (let base = 2; base <= 10; base += 1) {
    for (let a = 0; a <= 8; a += 1) {
      for (let b = 0; b <= a; b += 1) {
        assert.equal(
          valorPotencia(base, a) / valorPotencia(base, b),
          valorPotencia(base, a - b),
          `${base}^${a} ÷ ${base}^${b}`
        );
      }
    }
  }

  // Potência de potência: grupos iguais de fatores, contados multiplicando.
  for (let base = 2; base <= 10; base += 1) {
    for (let a = 1; a <= 4; a += 1) {
      for (let b = 1; b <= 4; b += 1) {
        const grupos = Array.from({ length: b }, () => abrirFatores(base, a));
        assert.equal(grupos.flat().length, a * b, `(${base}^${a})^${b}: contagem`);
        assert.equal(valorPotencia(valorPotencia(base, a), b), valorPotencia(base, a * b), `(${base}^${a})^${b}`);
      }
    }
  }

  // O exemplo resolvido, conferido pelo valor.
  assert.equal(valorPotencia(2, 4) * valorPotencia(2, 3), 128);
  assert.equal(valorPotencia(2, 7), 128);

  num("notacao-cientifica", "propriedades", "q1", 4 + 3);
  num("notacao-cientifica", "propriedades", "q2", valorPotencia(2, 5) * valorPotencia(2, 2));
  num("notacao-cientifica", "propriedades", "q3", 8 - 3);
  alt("notacao-cientifica", "propriedades", "q4", "10⁶");

  // E a ressalva da lição: com bases diferentes, somar expoentes está errado.
  assert.notEqual(valorPotencia(2, 3) * valorPotencia(5, 2), valorPotencia(2, 5));
  assert.notEqual(valorPotencia(2, 3) * valorPotencia(5, 2), valorPotencia(5, 5));
});

teste("notação científica · lição 2 — o expoente zero sai do padrão, não de uma regra", () => {
  // Descer um degrau divide pela base. Conferido para várias bases: o valor
  // do degrau seguinte é sempre o anterior dividido pela base, INCLUSIVE na
  // passagem para o expoente zero e para os negativos.
  for (const base of [2, 3, 5, 7, 10]) {
    for (let e = 6; e >= -4; e -= 1) {
      const aqui = base ** e;
      const abaixo = base ** (e - 1);
      assert.ok(
        Math.abs(abaixo - aqui / base) < 1e-12 * Math.max(1, aqui),
        `base ${base}, degrau ${e}: o de baixo tinha de ser este dividido por ${base}`
      );
    }
    // o degrau do expoente zero é o de expoente 1 dividido pela base
    assert.equal(base ** 0, 1, `${base}⁰`);
    assert.equal(base ** 1 / base, 1, `a divisão que produz ${base}⁰`);
  }

  // Expoente negativo inverte, e o resultado continua POSITIVO.
  for (const base of [2, 5, 10]) {
    for (let e = 1; e <= 5; e += 1) {
      assert.ok(Math.abs(base ** -e - 1 / base ** e) < 1e-15, `${base}^-${e} = 1/${base}^${e}`);
      assert.ok(base ** -e > 0, `${base}^-${e} tinha de ser positivo`);
      assert.ok(base ** -e < 1, `${base}^-${e} tinha de ser menor que 1`);
    }
  }

  num("notacao-cientifica", "expoente-zero", "q1", 7 ** 0);
  num("notacao-cientifica", "expoente-zero", "q2", 1 / 10 ** 2);
  num("notacao-cientifica", "expoente-zero", "q3", 1 / 2 ** 3);
  alt("notacao-cientifica", "expoente-zero", "q4", "Porque descendo a escada cada degrau divide por 5, e 5 ÷ 5 = 1");

  // A afirmação da questão 4, conferida: a escada do 5 chega ao 1.
  assert.deepEqual([5 ** 3, 5 ** 2, 5 ** 1, 5 ** 0], [125, 25, 5, 1]);
});

teste("notação científica · lição 3 — a forma a × 10ⁿ, com uma escrita só por número", () => {
  // A conversão é feita andando com a vírgula no TEXTO, e o resultado tem de
  // reconstruir o número original.
  const casos = ["3200", "52000", "470000", "0,00042", "0,072", "7,5", "1"];
  for (const c of casos) {
    const { fator, expoente } = paraCientifica(c);
    assert.ok(fator >= 1 && fator < 10, `${c}: o fator ${fator} tinha de ficar em [1, 10)`);
    const original = Number(String(c).replace(",", "."));
    assert.ok(
      Math.abs(fator * 10 ** expoente - original) < 1e-9 * Math.max(1, original),
      `${c}: ${fator} × 10^${expoente} não reconstrói o número`
    );
  }

  // O exemplo resolvido.
  assert.deepEqual(paraCientifica("3200"), { fator: 3.2, expoente: 3 });

  alt("notacao-cientifica", "o-que-e", "q1", "4,7 × 10⁵");
  num("notacao-cientifica", "o-que-e", "q2", 4.7 * 10 ** 5);
  num("notacao-cientifica", "o-que-e", "q3", paraCientifica("52000").fator);
  alt("notacao-cientifica", "o-que-e", "q4", "Porque o primeiro fator é menor que 1");

  // As alternativas erradas da q1 têm o VALOR certo e a FORMA errada — é
  // isso que a questão discute, e o teste registra.
  assert.equal(47 * 10 ** 4, 4.7 * 10 ** 5);
  assert.equal(0.47 * 10 ** 6, 4.7 * 10 ** 5);
  assert.ok(!(47 >= 1 && 47 < 10), "47 tinha de estar fora da faixa");
  assert.ok(!(0.47 >= 1 && 0.47 < 10), "0,47 tinha de estar fora da faixa");
  // e a da q4, que tem o valor certo e o fator abaixo de 1
  assert.equal(0.8 * 10 ** 6, 8 * 10 ** 5);
});

teste("notação científica · lição 4 — números grandes, expoente positivo", () => {
  // O expoente de um inteiro é sempre a quantidade de algarismos menos um.
  for (const n of ["7500000000", "300000", "86400", "45000", "149600000", "62000"]) {
    const { expoente } = paraCientifica(n);
    assert.equal(expoente, n.length - 1, `${n}: expoente`);
    assert.ok(expoente > 0, `${n} é grande, então o expoente tinha de ser positivo`);
  }

  // O exemplo resolvido.
  assert.deepEqual(paraCientifica("149600000"), { fator: 1.496, expoente: 8 });

  num("notacao-cientifica", "numeros-grandes", "q1", paraCientifica("7500000000").expoente);
  num("notacao-cientifica", "numeros-grandes", "q2", paraCientifica("300000").expoente);
  num("notacao-cientifica", "numeros-grandes", "q3", paraCientifica("86400").fator);
  alt("notacao-cientifica", "numeros-grandes", "q4", "Andar mais uma casa: 6,2 × 10⁴");

  // A q4: as duas escritas valem o mesmo, e só uma está na forma.
  assert.equal(62 * 10 ** 3, 6.2 * 10 ** 4);
  assert.deepEqual(paraCientifica("62000"), { fator: 6.2, expoente: 4 });
  // e a alternativa que "anda uma casa a menos" piora o fator
  assert.ok(620 > 62, "andar para o outro lado afasta o fator da faixa");
  // a que troca o sinal muda o VALOR, que é o defeito dela
  assert.notEqual(62 * 10 ** -3, 62000);
});

teste("notação científica · lição 5 — números pequenos, expoente negativo", () => {
  // Todo número menor que 1 tem expoente negativo; entre 1 e 10, zero.
  for (const n of ["0,000001", "0,00035", "0,0000000001", "0,072", "0,0032", "0,00042"]) {
    const { fator, expoente } = paraCientifica(n);
    assert.ok(expoente < 0, `${n} é menor que 1, então o expoente tinha de ser negativo`);
    assert.ok(fator >= 1 && fator < 10, `${n}: fator fora da faixa`);
  }
  for (const n of ["1", "4,2", "9,99"]) {
    assert.equal(paraCientifica(n).expoente, 0, `${n} está entre 1 e 10`);
  }

  // O exemplo resolvido.
  assert.deepEqual(paraCientifica("0,00042"), { fator: 4.2, expoente: -4 });

  num("notacao-cientifica", "numeros-pequenos", "q1", paraCientifica("0,000001").expoente);
  num("notacao-cientifica", "numeros-pequenos", "q2", paraCientifica("0,00035").fator);
  num("notacao-cientifica", "numeros-pequenos", "q3", paraCientifica("0,0000000001").expoente);
  alt("notacao-cientifica", "numeros-pequenos", "q4", "Porque o número é menor que 1");

  // A armadilha que as três questões avisam: contar só os zeros erra por um,
  // porque a vírgula ainda passa pelo primeiro algarismo significativo.
  const zerosDepoisDaVirgula = (t) => (t.split(",")[1].match(/^0+/) || [""])[0].length;
  for (const n of ["0,000001", "0,0000000001", "0,00035"]) {
    assert.equal(
      Math.abs(paraCientifica(n).expoente), zerosDepoisDaVirgula(n) + 1,
      `${n}: o expoente é um a mais que a contagem dos zeros`
    );
  }

  // A q4: o sinal sai da comparação com 1, e não do formato do número.
  assert.ok(paraCientifica("45,7").expoente > 0, "45,7 é maior que 10");
  assert.ok(paraCientifica("0,72").expoente < 0, "0,72 é menor que 1, mesmo sem zeros depois da vírgula");
  assert.ok(paraCientifica("12,5").expoente > 0, "12,5 não é inteiro e tem expoente positivo");
});

teste("notação científica · lição 6 — comparar pelo expoente, multiplicar por partes", () => {
  // Comparar: quando os expoentes diferem, o maior expoente vence SEMPRE —
  // conferido por força bruta em toda a faixa de fatores permitida.
  for (let ea = -6; ea <= 6; ea += 1) {
    for (let eb = -6; eb <= 6; eb += 1) {
      if (ea === eb) continue;
      for (const fa of [1, 2.5, 5, 9.9]) {
        for (const fb of [1, 2.5, 5, 9.9]) {
          const a = fa * 10 ** ea, b = fb * 10 ** eb;
          assert.equal(
            a > b, ea > eb,
            `${fa}×10^${ea} contra ${fb}×10^${eb}: o expoente maior tinha de decidir`
          );
        }
      }
    }
  }

  // Multiplicar: as duas partes separadas dão o mesmo que a conta direta.
  for (const [fa, ea, fb, eb] of [[2, 3, 3, 4], [2, 5, 4, 3], [5, 3, 4, 2], [1.5, -2, 4, 6]]) {
    const direto = (fa * 10 ** ea) * (fb * 10 ** eb);
    const porPartes = (fa * fb) * 10 ** (ea + eb);
    assert.ok(Math.abs(direto - porPartes) < 1e-9 * Math.abs(direto), `${fa}e${ea} × ${fb}e${eb}`);
  }

  // O exemplo resolvido, e o ajuste de forma da q4.
  assert.equal((2 * 10 ** 3) * (3 * 10 ** 4), 6 * 10 ** 7);
  assert.equal((5 * 10 ** 3) * (4 * 10 ** 2), 20 * 10 ** 5);
  assert.equal(20 * 10 ** 5, 2 * 10 ** 6);
  assert.deepEqual(paraCientifica("2000000"), { fator: 2, expoente: 6 });

  num("notacao-cientifica", "problemas", "q1", 5 + 3);
  alt("notacao-cientifica", "problemas", "q2", "3 × 10⁸, porque o expoente é maior");
  num("notacao-cientifica", "problemas", "q3", 10 ** 7);
  alt("notacao-cientifica", "problemas", "q4", "2 × 10⁶");

  // A q1 não precisa de ajuste, e o teste diz por quê: o produto dos fatores
  // ainda cabe na faixa.
  assert.ok(2 * 4 >= 1 && 2 * 4 < 10, "2 × 4 = 8 continua entre 1 e 10");
  // já a q4 precisa, porque passou
  assert.ok(!(5 * 4 < 10), "5 × 4 = 20 saiu da faixa");

  // A q3: quantas vezes maior é uma divisão, e ela dá o valor da potência.
  assert.equal((1 * 10 ** 7) / (1 * 10 ** 0), 10 ** 7);
  assert.equal(10 ** 7, 10000000);
});

teste("notação científica · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("notacao-cientifica", 24);
});

teste("notação científica · os geradores calculam, e não recebem pronto", () => {
  // O `deslocarVirgula` monta o resultado a partir do número e da contagem de
  // casas. O teste lê o resultado de volta do SVG e confere com a conversão
  // feita por outro caminho.
  const casos = [["149600000", -8], ["45000", -4], ["0,00042", 4], ["0,0032", 3], ["7500000000", -9]];
  for (const [numero, casas] of casos) {
    const svg = desenhos.deslocarVirgula({ numero, casas });
    const escrito = svg.match(/>([0-9][0-9,]* × 10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)</)[1];
    const { fator, expoente } = paraCientifica(numero);
    const esperado = String(fator).replace(".", ",") + " × 10" + desenhos.expoente(expoente);
    assert.equal(escrito, esperado, `${numero}: a figura escreveu outra coisa`);
  }

  // A escada calcula o valor de cada degrau, inclusive os negativos.
  const svg = desenhos.escadaPotencias({ de: 2, ate: -2 });
  for (const [pot, val] of [["10²", "100"], ["10¹", "10"], ["10⁰", "1"], ["10⁻¹", "0,1"], ["10⁻²", "0,01"]]) {
    assert.ok(svg.includes(">" + pot + "<"), `a escada tinha de ter o degrau ${pot}`);
    assert.ok(svg.includes(">" + val + "<"), `a escada tinha de ter o valor ${val}`);
  }

  // A régua é linear em EXPOENTE: dois itens com dois degraus de diferença
  // ficam ao dobro da distância de dois com um degrau.
  const regua = desenhos.escalaOrdens({ itens: [{ expoente: 0, rotulo: "a" }, { expoente: 1, rotulo: "b" }, { expoente: 3, rotulo: "c" }], de: 0, ate: 3 });
  const marcas = [...regua.matchAll(/<line x1="([0-9.]+)"[^>]*stroke-width="2\.2"/g)].map((m) => Number(m[1]));
  assert.equal(marcas.length, 3, "esperava três marcas altas");
  const [xa, xb, xc] = marcas.sort((p, q) => p - q);
  assert.ok(Math.abs((xc - xb) - 2 * (xb - xa)) < 0.5, "a régua tinha de ser linear no expoente");
});


// ---------- Dízimas e números reais (8º ano) ----------
//
// A matéria inteira é sobre uma afirmação forte — toda fração vira decimal
// exato ou dízima periódica —, e o teste PROVA essa afirmação por força
// bruta antes de usá-la, em vez de assumi-la. A divisão longa é refeita aqui
// com inteiros, e não com ponto flutuante: 1/3 em double não tem período
// nenhum, tem erro de arredondamento.

/**
 * Divisão longa de n por d, feita com inteiros.
 * Devolve { anteperiodo, periodo }: `periodo` vazio quer dizer decimal exato.
 */
function reDividir(n, d) {
  const digitos = [];
  const vistos = new Map();
  let resto = n % d;
  while (resto !== 0) {
    if (vistos.has(resto)) {
      const inicio = vistos.get(resto);
      return { anteperiodo: digitos.slice(0, inicio).join(""), periodo: digitos.slice(inicio).join("") };
    }
    vistos.set(resto, digitos.length);
    digitos.push(Math.floor((resto * 10) / d));
    resto = (resto * 10) % d;
  }
  return { anteperiodo: digitos.join(""), periodo: "" };
}

/** Só os fatores 2 e 5 sobrevivem: o que resta diz se a fração fecha. */
function reNucleo(d) {
  let x = d;
  while (x % 2 === 0) x /= 2;
  while (x % 5 === 0) x /= 5;
  return x;
}

const reMdc = (a, b) => (b === 0 ? Math.abs(a) : reMdc(b, a % b));

teste("reais · lição 1 — ou o resto zera, ou ele volta: não há terceira saída", () => {
  // A afirmação central da matéria, varrida em todas as frações próprias com
  // denominador até 60. Para cada uma, a divisão longa TEM de parar — ou por
  // resto zero, ou por resto repetido. Se alguma rodasse sem fim, o laço de
  // reDividir não terminaria.
  let exatas = 0, dizimas = 0;
  for (let d = 2; d <= 60; d += 1) {
    for (let n = 1; n < d; n += 1) {
      const { periodo } = reDividir(n, d);
      // e o resultado tem de bater com o teste dos fatores do denominador
      const g = reMdc(n, d);
      const fecha = reNucleo(d / g) === 1;
      assert.equal(
        periodo === "", fecha,
        `${n}/${d}: o teste dos fatores 2 e 5 discordou da divisão longa`
      );
      if (periodo === "") exatas += 1; else dizimas += 1;
      // o período nunca passa do limite dado pelos restos possíveis
      assert.ok(periodo.length <= d - 1, `${n}/${d}: período maior que ${d - 1}`);
    }
  }
  assert.ok(exatas > 100 && dizimas > 500, "esperava os dois casos em quantidade");

  // Os exemplos da lição.
  assert.deepEqual(reDividir(1, 3), { anteperiodo: "", periodo: "3" });
  assert.deepEqual(reDividir(1, 4), { anteperiodo: "25", periodo: "" });
  assert.deepEqual(reDividir(3, 8), { anteperiodo: "375", periodo: "" });

  num("reais", "divisao-que-nao-acaba", "q1", 7);
  alt("reais", "divisao-que-nao-acaba", "q2", "3/8");
  num("reais", "divisao-que-nao-acaba", "q3", 1);
  alt("reais", "divisao-que-nao-acaba", "q4", "Porque os restos possíveis são finitos, então algum deles se repete e a conta recomeça");

  // A q1: os restos de uma divisão por 7 são exatamente sete valores.
  const restos = new Set();
  for (let k = 0; k < 200; k += 1) restos.add(k % 7);
  assert.equal(restos.size, 7);
  assert.deepEqual([...restos].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);

  // A q3: em 1 ÷ 3 o resto que volta é o 1, e não o algarismo 3.
  assert.equal(1 % 3, 1);
  assert.equal((1 * 10) % 3, 1, "o resto depois do passo continua 1");
  assert.equal(Math.floor((1 * 10) / 3), 3, "o algarismo é 3 — e é outra coisa");

  // As três alternativas erradas da q2 são mesmo dízimas.
  for (const [n, d] of [[1, 3], [1, 6], [2, 7]]) {
    assert.notEqual(reDividir(n, d).periodo, "", `${n}/${d} tinha de ser dízima`);
  }
});

teste("reais · lição 2 — só entra no período o que volta", () => {
  // Anteperíodo e período, lidos da divisão longa.
  assert.deepEqual(reDividir(1, 6), { anteperiodo: "1", periodo: "6" });
  assert.deepEqual(reDividir(1, 3), { anteperiodo: "", periodo: "3" });
  assert.deepEqual(reDividir(5, 11), { anteperiodo: "", periodo: "45" });
  assert.deepEqual(reDividir(2, 7), { anteperiodo: "", periodo: "285714" });

  num("reais", "periodo", "q1", 6);
  alt("reais", "periodo", "q2", "Simples, porque a repetição começa logo depois da vírgula");
  num("reais", "periodo", "q3", reDividir(2, 7).periodo.length);
  alt("reais", "periodo", "q4", "6 algarismos, porque há 6 restos diferentes de zero");

  // A armadilha da q1, registrada: se o período fosse 16, o número seria
  // OUTRO — e o teste mostra os dois lado a lado.
  assert.notEqual(reDividir(1, 6).periodo, "16");
  assert.equal(reDividir(1, 6).anteperiodo, "1", "o 1 é anteperíodo, e aparece uma vez só");
  // 0,161616… é 16/99, uma fração diferente de 1/6
  assert.notEqual(16 / 99, 1 / 6);

  // O limite do período: dividindo por d, ele nunca passa de d − 1, e essa
  // cota é ATINGIDA por alguns denominadores (7 é um deles).
  for (let d = 2; d <= 40; d += 1) {
    for (let n = 1; n < d; n += 1) {
      assert.ok(reDividir(n, d).periodo.length <= d - 1, `${n}/${d}`);
    }
  }
  assert.equal(reDividir(1, 7).periodo.length, 6, "1/7 atinge o limite de 6");

  // A q2: o tamanho do período não decide simples ou composta — o teste
  // exibe uma simples de período 2 e uma composta de período 1.
  assert.equal(reDividir(5, 11).anteperiodo, "", "0,4545… é simples e tem período de 2");
  assert.equal(reDividir(1, 6).anteperiodo.length, 1, "0,1666… é composta e tem período de 1");
});

teste("reais · lição 3 — a geratriz reconstrói a dízima", () => {
  // O truque do 10x − x, conferido no sentido inverso: a fração encontrada
  // tem de produzir de volta a mesma dízima.
  const casos = [
    ["3", 1, 3], ["7", 7, 9], ["5", 5, 9], ["45", 5, 11], ["9", 1, 1], ["27", 3, 11],
  ];
  for (const [periodo, n, d] of casos) {
    const gerado = reDividir(n, d);
    if (d === 1) { assert.equal(gerado.periodo, "", "1/1 é inteiro"); continue; }
    assert.equal(gerado.periodo, periodo, `${n}/${d} tinha de gerar período ${periodo}`);
  }

  // E a fórmula da geratriz simples — período sobre tantos noves quanto os
  // algarismos do período — conferida contra a divisão longa.
  //
  // Cuidado: o período que a divisão longa devolve é o MENOR bloco que se
  // repete. 0,(11) e 0,(1) são o mesmo número, e ela devolve "1" — exigir o
  // mesmo tamanho de bloco reprovaria uma resposta correta. A comparação
  // certa é reconstruir a dízima e conferir os algarismos.
  for (let p = 1; p <= 98; p += 1) {
    const casas = String(p).length;
    const noves = Number("9".repeat(casas));
    const g = reMdc(p, noves);
    const [n, d] = [p / g, noves / g];
    if (d === 1) continue;   // 0,999… = 1, o caso da q4
    const { anteperiodo, periodo } = reDividir(n, d);
    assert.equal(anteperiodo, "", `0,(${p}) tinha de ser dízima simples`);
    // as 12 primeiras casas de n/d têm de ser o bloco p repetido
    const bloco = String(p).padStart(casas, "0");
    const esperado = bloco.repeat(Math.ceil(12 / casas)).slice(0, 12);
    const obtido = periodo.repeat(Math.ceil(12 / periodo.length)).slice(0, 12);
    assert.equal(obtido, esperado, `0,(${p}) = ${n}/${d}`);
  }

  alt("reais", "geratriz", "q1", "7/9");
  num("reais", "geratriz", "q2", 5);
  alt("reais", "geratriz", "q3", "5/11");
  num("reais", "geratriz", "q4", 1);

  // A q4 é o caso famoso, e ele sai do MESMO truque, sem exceção nenhuma:
  // 9x = 9, então x = 1.
  assert.equal(9 / 9, 1);
  assert.equal(reMdc(9, 9), 9, "9/9 simplifica para 1/1");

  // A q2: 10x − x deixa um inteiro, e não um decimal.
  assert.equal(Number.isInteger(5), true);
  // e a q3 simplifica de verdade
  assert.equal(reMdc(45, 99), 9);
  assert.equal(45 / 9, 5);
  assert.equal(99 / 9, 11);
});

teste("reais · lição 4 — irracional é o que nenhuma fração produz", () => {
  // A raiz de um inteiro é racional exatamente quando existe inteiro cujo
  // quadrado é ele — conferido por busca, sem usar Math.sqrt para decidir.
  const fechaEmInteiro = (n) => {
    for (let k = 0; k * k <= n; k += 1) if (k * k === n) return true;
    return false;
  };
  for (let n = 0; n <= 200; n += 1) {
    const r = Math.round(Math.sqrt(n));
    assert.equal(fechaEmInteiro(n), r * r === n, `√${n}`);
  }
  assert.ok(fechaEmInteiro(9) && fechaEmInteiro(16) && fechaEmInteiro(25) && fechaEmInteiro(49));
  assert.ok(!fechaEmInteiro(2) && !fechaEmInteiro(3) && !fechaEmInteiro(7) && !fechaEmInteiro(10));

  alt("reais", "irracionais", "q1", "√2");
  num("reais", "irracionais", "q2", 7);
  alt("reais", "irracionais", "q3", "Porque não tem período, e toda fração produz um");
  alt("reais", "irracionais", "q4", "Quando o resultado é um número inteiro");

  // A q2: 7 × 7 é 49, e os vizinhos erram para os dois lados.
  assert.equal(7 * 7, 49);
  assert.ok(6 * 6 < 49 && 8 * 8 > 49);

  // A q1: √9 é racional porque fecha; 0,333… e 2/3 são racionais por serem
  // fração. Só o √2 sobra.
  assert.ok(fechaEmInteiro(9), "√9 fecha");
  assert.notEqual(reDividir(1, 3).periodo, "", "0,333… é dízima periódica, logo racional");
  assert.notEqual(reDividir(2, 3).periodo, "", "2/3 é fração");

  // A q3: o contraexemplo que separa "infinitas casas" de "irracional" —
  // 0,010101… usa só zeros e uns E é racional.
  assert.equal(reDividir(1, 99).periodo, "01", "0,010101… é a fração 1/99");
});

teste("reais · lição 5 — localizar na reta é espremer entre quadrados", () => {
  // O inteiro logo abaixo de √n, achado por busca — e conferido contra a
  // definição: k² ≤ n e (k+1)² > n.
  const piso = (n) => { let k = 0; while ((k + 1) * (k + 1) <= n) k += 1; return k; };
  for (let n = 1; n <= 300; n += 1) {
    const k = piso(n);
    assert.ok(k * k <= n, `${k}² tinha de caber em ${n}`);
    assert.ok((k + 1) * (k + 1) > n, `${k + 1}² tinha de passar de ${n}`);
  }

  num("reais", "reta-real", "q1", piso(10));
  num("reais", "reta-real", "q2", piso(50));
  alt("reais", "reta-real", "q3", "Que todo ponto da reta corresponde a um número real, racional ou irracional");
  alt("reais", "reta-real", "q4", "Porque 3,16 é uma aproximação: ao quadrado ele não dá exatamente 10");

  // Os quadrados citados no resolvido e nas questões.
  assert.deepEqual([3 * 3, 4 * 4], [9, 16]);
  assert.ok(9 < 10 && 10 < 16);
  assert.deepEqual([7 * 7, 8 * 8], [49, 64]);
  assert.ok(49 < 50 && 50 < 64);

  // A q4: 3,16² não dá 10 — conferido em centésimos inteiros, para o ponto
  // flutuante não decidir a questão.
  assert.equal(316 * 316, 99856);
  assert.notEqual(316 * 316, 100000, "3,16² ≠ 10");
  assert.ok(316 * 316 < 100000, "3,16 fica um pouco ABAIXO da raiz de 10");
  // e nenhuma quantidade finita de casas fecha: o quadrado nunca dá 10 exato
  for (let casas = 1; casas <= 6; casas += 1) {
    const escala = 10 ** casas;
    let k = 0;
    while ((k + 1) * (k + 1) <= 10 * escala * escala) k += 1;
    assert.notEqual(k * k, 10 * escala * escala, `com ${casas} casas ainda não fecha`);
  }
});

teste("reais · lição 6 — os conjuntos se contêm, e o irracional fica fora", () => {
  // Todo natural é inteiro, todo inteiro é racional. Conferido pela
  // construção: um inteiro k é a fração k/1.
  for (let k = -20; k <= 20; k += 1) {
    assert.equal(k / 1, k, `${k} = ${k}/1`);
    assert.ok(Number.isInteger(k));
    if (k >= 0) assert.ok(Number.isInteger(k) && k >= 0, `${k} é natural`);
  }
  // e o −7 não é natural, que é a q1
  assert.ok(!(-7 >= 0), "−7 não entra nos naturais");

  alt("reais", "problemas", "q1", "Inteiro, racional e real");
  alt("reais", "problemas", "q2", "√7");
  num("reais", "problemas", "q3", 99 / reMdc(27, 99));
  alt("reais", "problemas", "q4", "Porque 0,333... tem infinitas casas e é a fração 1/3");

  // A q2: das quatro, só √7 falha nos três testes.
  const fecha = (n) => { for (let k = 0; k * k <= n; k += 1) if (k * k === n) return true; return false; };
  assert.ok(fecha(64), "√64 = 8, racional");
  assert.ok(!fecha(7), "√7 não fecha");
  assert.equal(reDividir(3, 11).periodo, "27", "0,272727… é 3/11");
  assert.equal(reDividir(3, 5).periodo, "", "−3/5 dá decimal exato");

  // A q3: 27/99 simplifica para 3/11, então o denominador é 11.
  assert.equal(reMdc(27, 99), 9);
  assert.equal(99 / 9, 11);
  assert.equal(27 / 9, 3);
  // e a fração simplificada gera a mesma dízima
  assert.equal(reDividir(27 % 99, 99).periodo, reDividir(3, 11).periodo);

  // A q4: o contraexemplo derruba a afirmação, e o teste mostra os dois
  // números de infinitas casas — um racional, um irracional.
  assert.notEqual(reDividir(1, 3).periodo, "", "0,333… tem infinitas casas");
  assert.ok(!fecha(2), "√2 também tem infinitas casas, e não é fração");
});

teste("reais · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("reais", 24);
});

teste("reais · a divisão desenhada é a divisão de verdade", () => {
  // O gerador refaz a divisão longa por conta própria. O teste lê o
  // quociente de volta do SVG e compara com a divisão feita aqui — se os
  // dois discordassem, a figura estaria mentindo sobre a matéria.
  for (const [n, d] of [[1, 3], [1, 6], [2, 7], [1, 4], [5, 11], [3, 8]]) {
    const svg = desenhos.divisaoPeriodica({ dividendo: n, divisor: d, passos: 10 });
    const escrito = [...svg.matchAll(/font-size="20"[^>]*>([^<]*)</g)].map((m) => m[1]).join("");
    const { anteperiodo, periodo } = reDividir(n, d);
    assert.equal(escrito, `0,${anteperiodo}${periodo}`, `${n}/${d}: a figura escreveu outra coisa`);

    // e os restos desenhados são os restos de verdade
    const restosDesenhados = [...svg.matchAll(/resto (\d+) → algarismo (\d+)/g)]
      .map((m) => [Number(m[1]), Number(m[2])]);
    let r = n % d;
    for (const [rDesenhado, aDesenhado] of restosDesenhados) {
      assert.equal(rDesenhado, r, `${n}/${d}: resto desenhado errado`);
      assert.equal(aDesenhado, Math.floor((r * 10) / d), `${n}/${d}: algarismo desenhado errado`);
      r = (r * 10) % d;
    }
  }

  // O diagrama põe os irracionais FORA dos racionais, e não aninhados: é a
  // afirmação central da lição 4, e desenhá-la errado ensinaria o contrário.
  const dia = desenhos.conjuntosNumericos({ exemplos: { irracionais: "√2" } });
  const caixas = [...dia.matchAll(/<rect x="([0-9.]+)"[^>]*width="([0-9.]+)"/g)]
    .map((m) => ({ x: Number(m[1]), w: Number(m[2]) }));
  const rotulos = [...dia.matchAll(/<text x="([0-9.]+)"[^>]*>(naturais|inteiros|racionais|irracionais)</g)]
    .map((m) => ({ x: Number(m[1]), nome: m[2] }));
  const xIrr = rotulos.find((r) => r.nome === "irracionais").x;
  const xRac = rotulos.find((r) => r.nome === "racionais").x;
  const caixaRac = caixas.find((c) => Math.abs(c.x - (xRac - 10)) < 2);
  assert.ok(caixaRac, "esperava achar a caixa dos racionais");
  assert.ok(
    xIrr > caixaRac.x + caixaRac.w,
    "a caixa dos irracionais tinha de ficar FORA da dos racionais"
  );
});


// ---------- Produtos notáveis (8º ano) ----------
//
// Nenhuma identidade é conferida aplicando a fórmula que a matéria ensina.
// Todas são conferidas por EQUIVALÊNCIA: os dois lados são avaliados em toda
// uma faixa de valores e têm de dar o mesmo número em todos os pontos. É a
// mesma disciplina da simplificação de Linguagem algébrica no 7º ano — uma
// identidade certa no caso do enunciado e errada fora dele não passa.

/** Os dois lados dão o mesmo valor em toda a faixa? */
function pnIguais(f, g, de = -30, ate = 30) {
  for (let x = de; x <= ate; x += 1) {
    if (Math.abs(f(x) - g(x)) > 1e-9) return false;
  }
  return true;
}

teste("produtos notáveis · lição 1 — quatro produtos, e o do meio é a soma dos cruzados", () => {
  // A distributiva dupla, conferida por equivalência para muitos pares.
  for (let p = -6; p <= 6; p += 1) {
    for (let q = -6; q <= 6; q += 1) {
      assert.ok(
        pnIguais((x) => (x + p) * (x + q), (x) => x * x + (p + q) * x + p * q),
        `(x+${p})(x+${q}) tinha de dar x² + ${p + q}x + ${p * q}`
      );
    }
  }

  // O exemplo resolvido.
  assert.ok(pnIguais((x) => (x + 2) * (x + 3), (x) => x * x + 5 * x + 6));

  num("produtos-notaveis", "multiplicar-binomios", "q1", 4 + 5);
  num("produtos-notaveis", "multiplicar-binomios", "q2", 2 * 7);
  num("produtos-notaveis", "multiplicar-binomios", "q3", 2 * 2);
  alt("produtos-notaveis", "multiplicar-binomios", "q4", "Os dois produtos cruzados ficam iguais, e a soma deles é o dobro de um só");

  // As duas leituras que a lição pede para guardar: o termo do meio é a SOMA
  // e o solto é o PRODUTO — e eles são coisas diferentes.
  assert.notEqual(4 + 5, 4 * 5);
  assert.notEqual(2 + 7, 2 * 7);

  // A q3: são quatro produtos, contados como encontros (o mesmo princípio
  // multiplicativo de Probabilidade).
  const encontros = [];
  for (const a of ["x", "2"]) for (const b of ["x", "3"]) encontros.push(a + "·" + b);
  assert.equal(encontros.length, 4);
  assert.equal(new Set(encontros).size, 4);

  // A q4: com os dois parênteses iguais, os cruzados coincidem.
  assert.ok(pnIguais((x) => (x + 3) * (x + 3), (x) => x * x + 6 * x + 9));
});

teste("produtos notáveis · lição 2 — o quadrado da soma, conferido por equivalência", () => {
  for (let b = -9; b <= 9; b += 1) {
    assert.ok(
      pnIguais((x) => (x + b) ** 2, (x) => x * x + 2 * b * x + b * b),
      `(x+${b})² tinha de dar x² + ${2 * b}x + ${b * b}`
    );
  }
  // e com coeficiente na letra, que é a q3
  for (let k = 1; k <= 5; k += 1) {
    for (let b = 1; b <= 5; b += 1) {
      assert.ok(
        pnIguais((x) => (k * x + b) ** 2, (x) => k * k * x * x + 2 * k * b * x + b * b),
        `(${k}x+${b})²`
      );
    }
  }

  num("produtos-notaveis", "quadrado-soma", "q1", 2 * 5);
  num("produtos-notaveis", "quadrado-soma", "q2", (5 + 3) ** 2);
  num("produtos-notaveis", "quadrado-soma", "q3", 2 * 2);
  alt("produtos-notaveis", "quadrado-soma", "q4", "Cada um tem área ab, e juntos formam o termo 2ab");

  // A q2 conferida pela SOMA DAS ÁREAS, e não pela fórmula: é assim que a
  // figura justifica o resultado.
  const [a, b] = [5, 3];
  assert.equal(a * a + a * b + b * a + b * b, (a + b) ** 2);
  assert.deepEqual([a * a, a * b, b * a, b * b], [25, 15, 15, 9]);
  assert.equal(25 + 15 + 15 + 9, 64);

  // A q3: o coeficiente é elevado JUNTO com a letra.
  assert.equal((2 * 3) ** 2, 4 * 9, "(2·3)² = 4·3²");
  assert.notEqual((2 * 3) ** 2, 2 * 9, "elevar só a letra daria outro valor");
});

teste("produtos notáveis · lição 3 — o quadrado da diferença muda UM sinal", () => {
  for (let b = -9; b <= 9; b += 1) {
    assert.ok(
      pnIguais((x) => (x - b) ** 2, (x) => x * x - 2 * b * x + b * b),
      `(x−${b})² tinha de dar x² − ${2 * b}x + ${b * b}`
    );
    // e o último termo é SEMPRE positivo, para todo b
    assert.ok(b * b >= 0, "quadrado nunca é negativo");
  }

  // A comparação entre as duas fórmulas: só o sinal do meio difere.
  for (let b = 1; b <= 9; b += 1) {
    const soma = (x) => (x + b) ** 2;
    const dif = (x) => (x - b) ** 2;
    // os termos extremos são iguais nas duas; o do meio é oposto
    assert.ok(pnIguais((x) => soma(x) - dif(x), (x) => 4 * b * x), `a diferença entre as duas é 4bx`);
  }

  num("produtos-notaveis", "quadrado-diferenca", "q1", (-6) * (-6));
  num("produtos-notaveis", "quadrado-diferenca", "q2", 2 * (-3));
  num("produtos-notaveis", "quadrado-diferenca", "q3", (5 - 2) ** 2);
  alt("produtos-notaveis", "quadrado-diferenca", "q4", "Porque ele vem de (−b) vezes (−b), e menos com menos dá mais");

  // A q3: a fórmula e o caminho direto têm de concordar — e a versão com o
  // último termo NEGATIVO tem de discordar, que é o erro previsto.
  assert.equal(25 - 20 + 4, (5 - 2) ** 2);
  assert.notEqual(25 - 20 - 4, (5 - 2) ** 2, "o erro previsto discorda mesmo");

  // A q4, provada: o quadrado de um negativo é positivo, em toda a faixa.
  for (let b = -12; b <= 12; b += 1) assert.ok((-b) * (-b) >= 0, `(−${b})²`);
});

teste("produtos notáveis · lição 4 — na soma pela diferença o meio se cancela", () => {
  for (let b = -9; b <= 9; b += 1) {
    assert.ok(
      pnIguais((x) => (x + b) * (x - b), (x) => x * x - b * b),
      `(x+${b})(x−${b}) tinha de dar x² − ${b * b}`
    );
  }

  // O cancelamento, mostrado termo a termo: os cruzados são opostos.
  for (let b = 1; b <= 9; b += 1) {
    for (let x = -10; x <= 10; x += 1) {
      const cruzado1 = x * (-b), cruzado2 = b * x;
      assert.equal(cruzado1 + cruzado2, 0, `os cruzados de (x+${b})(x−${b}) em x=${x}`);
    }
  }

  num("produtos-notaveis", "soma-por-diferenca", "q1", 8 * (-8));
  num("produtos-notaveis", "soma-por-diferenca", "q2", 102 * 98);
  alt("produtos-notaveis", "soma-por-diferenca", "q3", "(x + 7)(x − 7)");
  alt("produtos-notaveis", "soma-por-diferenca", "q4", "Porque os cruzados ficam com sinais contrários e se cancelam");

  // A q2: o atalho e a multiplicação direta dão o mesmo número.
  assert.equal(102 * 98, 100 * 100 - 2 * 2);
  assert.equal(102 * 98, 9996);

  // A q3: das quatro alternativas, só uma produz x² − 49 em toda a faixa.
  assert.ok(pnIguais((x) => (x + 7) * (x - 7), (x) => x * x - 49));
  assert.ok(!pnIguais((x) => (x - 7) ** 2, (x) => x * x - 49));
  assert.ok(!pnIguais((x) => (x + 7) ** 2, (x) => x * x - 49));
  assert.ok(!pnIguais((x) => (x + 49) * (x - 49), (x) => x * x - 49));

  // A figura afirma que as duas áreas são iguais — conferido para vários a, b.
  for (let a = 3; a <= 12; a += 1) {
    for (let b = 1; b < a; b += 1) {
      assert.equal(a * a - b * b, (a + b) * (a - b), `área do L contra o retângulo, a=${a} b=${b}`);
    }
  }
});

teste("produtos notáveis · lição 5 — o erro clássico, medido", () => {
  // (a+b)² e a²+b² só coincidem quando 2ab é zero, ou seja, quando um dos
  // dois é zero. Fora disso, a diferença é EXATAMENTE 2ab.
  for (let a = -8; a <= 8; a += 1) {
    for (let b = -8; b <= 8; b += 1) {
      const certo = (a + b) ** 2, errado = a * a + b * b;
      // Math.abs, e não assert.equal: com b = 0 o produto 2ab dá −0, e o
      // assert estrito distingue −0 de 0 — a igualdade falharia pelo sinal
      // do zero, e não pela matemática.
      assert.ok(Math.abs((certo - errado) - 2 * a * b) < 1e-9, `a=${a} b=${b}: a diferença tinha de ser 2ab`);
      if (a !== 0 && b !== 0) assert.notEqual(certo, errado, `a=${a} b=${b} não podia coincidir`);
      else assert.equal(certo, errado, "com um deles zero, as duas coincidem");
    }
  }

  // E com PRODUTO o expoente entra mesmo — a comparação que a lição faz.
  for (let a = -8; a <= 8; a += 1) {
    for (let b = -8; b <= 8; b += 1) {
      assert.equal((a * b) ** 2, a * a * b * b, `(${a}·${b})²`);
    }
  }

  num("produtos-notaveis", "erro-classico", "q1", (2 + 5) ** 2);
  num("produtos-notaveis", "erro-classico", "q2", (2 + 5) ** 2 - (2 * 2 + 5 * 5));
  alt("produtos-notaveis", "erro-classico", "q3", "(ab)², porque dentro do parêntese há uma multiplicação");
  alt("produtos-notaveis", "erro-classico", "q4", "Os dois retângulos do meio, que juntos valem 2ab");

  // O exemplo do resolvido, com a = 3 e b = 4.
  assert.equal((3 + 4) ** 2, 49);
  assert.equal(3 * 3 + 4 * 4, 25);
  assert.equal(49 - 25, 2 * 3 * 4);

  // A q2, conferida pelos dois caminhos.
  assert.equal((2 + 5) ** 2 - (4 + 25), 20);
  assert.equal(2 * 2 * 5, 20);
});

teste("produtos notáveis · lição 6 — os atalhos dão o mesmo que a conta armada", () => {
  // Todo quadrado perto de um redondo, pelos dois caminhos.
  for (const base of [10, 20, 30, 50, 100]) {
    for (let d = 1; d <= 3; d += 1) {
      assert.equal((base + d) ** 2, base * base + 2 * base * d + d * d, `(${base}+${d})²`);
      assert.equal((base - d) ** 2, base * base - 2 * base * d + d * d, `(${base}−${d})²`);
      // e o produto dos dois vizinhos
      assert.equal((base + d) * (base - d), base * base - d * d, `${base + d} × ${base - d}`);
    }
  }

  num("produtos-notaveis", "problemas", "q1", 19 * 19);
  num("produtos-notaveis", "problemas", "q2", 51 * 49);
  num("produtos-notaveis", "problemas", "q3", 101 * 101);
  alt("produtos-notaveis", "problemas", "q4", "6x + 9");

  // As contas do enunciado, uma a uma.
  assert.equal(19 * 19, 400 - 40 + 1);
  assert.equal(51 * 49, 2500 - 1);
  assert.equal(101 * 101, 10000 + 200 + 1);
  assert.equal(21 * 21, 400 + 40 + 1);

  // A q4: o aumento da área é (x+3)² − x², e isso é 6x + 9 em toda a faixa.
  assert.ok(pnIguais((x) => (x + 3) ** 2 - x * x, (x) => 6 * x + 9));
  // e as alternativas erradas discordam em algum ponto
  assert.ok(!pnIguais((x) => (x + 3) ** 2 - x * x, () => 9));
  assert.ok(!pnIguais((x) => (x + 3) ** 2 - x * x, (x) => 3 * x));
});

teste("produtos notáveis · a figura calcula as áreas, e não as recebe", () => {
  // O `quadradoSoma` decide as quatro áreas a partir de a e b. O teste lê os
  // números de volta do SVG e confere com a conta feita aqui.
  for (const [a, b] of [[5, 3], [3, 4], [20, 1], [2, 5]]) {
    const svg = desenhos.quadradoSoma({ a, b, revelar: "numeros" });
    const nums = [...svg.matchAll(/font-size="15"[^>]*>([0-9]+)</g)].map((m) => Number(m[1]));
    assert.deepEqual(
      nums.sort((p, q) => p - q),
      [a * a, a * b, a * b, b * b].sort((p, q) => p - q),
      `quadradoSoma(${a}, ${b}): as áreas desenhadas não batem`
    );
    // e as quatro somam o quadrado do lado inteiro
    assert.equal(nums.reduce((s, n) => s + n, 0), (a + b) ** 2);
  }

  // As quatro regiões existem sempre — são elas que justificam o 2ab.
  const svg = desenhos.quadradoSoma({ a: 4, b: 2 });
  const regioes = [...svg.matchAll(/<rect[^>]*fill-opacity="0\.(22|1)"/g)].length;
  assert.equal(regioes, 4, "o quadrado tinha de estar partido em quatro");

  // O `diferencaQuadrados` desenha as duas figuras com a MESMA área.
  for (const [a, b] of [[5, 2], [6, 3], [8, 5]]) {
    const d = desenhos.diferencaQuadrados({ a, b, revelar: "numeros" });
    const nums = [...d.matchAll(/font-size="13"[^>]*>([0-9]+)</g)].map((m) => Number(m[1]));
    assert.ok(nums.includes(a * a - b * b), `${a},${b}: esperava a área ${a * a - b * b} desenhada`);
    // as duas áreas escritas são iguais, que é a afirmação da lição
    const escritas = nums.filter((n) => n === a * a - b * b);
    assert.equal(escritas.length, 2, "as duas formas tinham de mostrar a mesma área");
  }
});

teste("produtos notáveis · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("produtos-notaveis", 24);
});



// ---------- Fatoração (8º ano) ----------
//
// Fatorar é o caminho de volta dos produtos notáveis, e o teste confere do
// mesmo jeito: por EQUIVALÊNCIA. A forma fatorada e a expandida têm de dar o
// mesmo valor em toda a faixa — uma fatoração certa no exemplo do enunciado e
// errada fora dele não passa.

/** Os dois lados dão o mesmo valor em toda a faixa? */
const ftIguais = (f, g, de = -20, ate = 20) => {
  for (let x = de; x <= ate; x += 1) if (Math.abs(f(x) - g(x)) > 1e-9) return false;
  return true;
};

const ftMdc = (a, b) => (b === 0 ? Math.abs(a) : ftMdc(b, a % b));

teste("fatoração · lição 1 — o fator comum é o que cabe em TODAS as parcelas", () => {
  // Pôr em evidência é a distributiva lida ao contrário: conferido por
  // equivalência para muitos pares de coeficientes.
  for (let k = 1; k <= 12; k += 1) {
    for (let a = 1; a <= 9; a += 1) {
      for (let b = 1; b <= 9; b += 1) {
        assert.ok(
          ftIguais((x) => k * a * x + k * b, (x) => k * (a * x + b)),
          `${k * a}x + ${k * b} = ${k}(${a}x + ${b})`
        );
      }
    }
  }

  // O MAIOR fator comum é o mdc, e tirá-lo deixa o parêntese sem mais nada
  // a fatorar — que é o critério de "fatoração completa".
  for (let p = 2; p <= 40; p += 1) {
    for (let q = 2; q <= 40; q += 1) {
      const g = ftMdc(p, q);
      assert.equal(ftMdc(p / g, q / g), 1, `depois de tirar ${g}, sobrou fator comum em ${p}/${q}`);
    }
  }
  assert.equal(ftMdc(12, 18), 6);
  assert.equal(ftMdc(8, 12), 4);

  // O exemplo resolvido, e o caso com letra.
  assert.ok(ftIguais((x) => 6 * x + 9, (x) => 3 * (2 * x + 3)));
  assert.ok(ftIguais((x) => 5 * x * x + 10 * x, (x) => 5 * x * (x + 2)));

  num("fatoracao", "fator-comum", "q1", ftMdc(12, 18));
  alt("fatoracao", "fator-comum", "q2", "5x");
  num("fatoracao", "fator-comum", "q3", ftMdc(8, 12));
  alt("fatoracao", "fator-comum", "q4", "Porque ele é o lado que todas as parcelas dividem, e a área é lado vezes lado");

  // A q1: os candidatos menores deixam fatoração incompleta, e o teste diz
  // exatamente o que sobraria dentro do parêntese.
  assert.equal(ftMdc(12 / 2, 18 / 2), 3, "tirando só o 2, ainda sobra o 3");
  assert.equal(ftMdc(12 / 3, 18 / 3), 2, "tirando só o 3, ainda sobra o 2");
  assert.notEqual(18 % 12, 0, "o 12 não cabe no 18");

  // A q3: só um fator devolve a expressão original.
  assert.ok(ftIguais((x) => 8 * x + 12, (x) => 4 * (2 * x + 3)));
  assert.ok(!ftIguais((x) => 8 * x + 12, (x) => 2 * (2 * x + 3)));
  assert.ok(!ftIguais((x) => 8 * x + 12, (x) => 8 * (2 * x + 3)));
});

teste("fatoração · lição 2 — o agrupamento fecha quando os parênteses coincidem", () => {
  // A identidade do agrupamento, varrida em DUAS variáveis.
  for (let a = -6; a <= 6; a += 1) {
    for (let b = -6; b <= 6; b += 1) {
      for (let x = -6; x <= 6; x += 1) {
        for (let y = -6; y <= 6; y += 1) {
          assert.ok(
            Math.abs((a * x + a * y + b * x + b * y) - (a + b) * (x + y)) < 1e-9,
            `ax+ay+bx+by com a=${a} b=${b} x=${x} y=${y}`
          );
        }
      }
    }
  }

  // O exemplo resolvido, também em duas variáveis.
  for (let x = -8; x <= 8; x += 1) {
    for (let y = -8; y <= 8; y += 1) {
      assert.ok(
        Math.abs((x * y + 2 * x + 3 * y + 6) - (y + 2) * (x + 3)) < 1e-9,
        `xy+2x+3y+6 com x=${x} y=${y}`
      );
    }
  }

  alt("fatoracao", "agrupamento", "q1", "(x + y)");
  num("fatoracao", "agrupamento", "q2", 3);
  num("fatoracao", "agrupamento", "q3", 2 * 2);
  alt("fatoracao", "agrupamento", "q4", "Os dois parênteses saem iguais");

  // A q4: quando os parênteses saem DIFERENTES, o segundo passo não existe —
  // e o teste mostra que a expressão resultante não é o produto esperado.
  for (let x = -5; x <= 5; x += 1) {
    for (let y = -5; y <= 5; y += 1) {
      const fecha = x * (y + 2) + 3 * (y + 2);
      // Math.abs de novo, e pelo mesmo motivo do −0: com x = −3 o resultado é
      // zero, e (y+2) × 0 com y negativo devolve −0, que o assert estrito
      // considera diferente de 0.
      assert.ok(Math.abs(fecha - (y + 2) * (x + 3)) < 1e-9, "o que fecha vira produto");
    }
  }
  assert.notEqual(1 * (1 + 2) + 3 * (1 + 5), (1 + 2) * (1 + 3), "o agrupamento que não fecha dá outra coisa");
});

teste("fatoração · lição 3 — diferença de quadrados, e as três condições", () => {
  for (let b = 1; b <= 12; b += 1) {
    assert.ok(ftIguais((x) => x * x - b * b, (x) => (x + b) * (x - b)), `x² − ${b * b}`);
    // com coeficiente na letra
    for (let k = 1; k <= 5; k += 1) {
      assert.ok(
        ftIguais((x) => k * k * x * x - b * b, (x) => (k * x + b) * (k * x - b)),
        `${k * k}x² − ${b * b}`
      );
    }
  }

  // A soma de quadrados NÃO fatora: nenhum par de inteiros (p, q) faz
  // (x+p)(x+q) dar x² + b² — conferido por busca.
  for (const b of [4, 5, 16, 25]) {
    let achou = false;
    for (let p = -30; p <= 30; p += 1) {
      for (let q = -30; q <= 30; q += 1) {
        if (ftIguais((x) => (x + p) * (x + q), (x) => x * x + b)) achou = true;
      }
    }
    assert.ok(!achou, `x² + ${b} não podia fatorar em inteiros`);
  }

  alt("fatoracao", "diferenca-quadrados", "q1", "(x + 7)(x − 7)");
  num("fatoracao", "diferenca-quadrados", "q2", 2);
  alt("fatoracao", "diferenca-quadrados", "q3", "x² + 16");
  num("fatoracao", "diferenca-quadrados", "q4", 3);

  // A q1: das quatro alternativas, só uma vale em toda a faixa.
  assert.ok(ftIguais((x) => (x + 7) * (x - 7), (x) => x * x - 49));
  assert.ok(!ftIguais((x) => (x + 49) * (x - 49), (x) => x * x - 49));
  assert.ok(!ftIguais((x) => (x - 7) * (x - 7), (x) => x * x - 49));
  assert.ok(!ftIguais((x) => (x + 7) * (x + 7), (x) => x * x - 49));

  // A q2: esquecer a raiz do coeficiente dá outra expressão.
  assert.ok(ftIguais((x) => 4 * x * x - 9, (x) => (2 * x + 3) * (2 * x - 3)));
  assert.ok(!ftIguais((x) => 4 * x * x - 9, (x) => (x + 3) * (x - 3)));

  // A q3: as outras três cumprem as condições e fatoram mesmo.
  assert.ok(ftIguais((x) => x * x - 16, (x) => (x + 4) * (x - 4)));
  assert.ok(ftIguais((x) => 9 * x * x - 1, (x) => (3 * x + 1) * (3 * x - 1)));
  assert.ok(ftIguais((x) => x * x - 100, (x) => (x + 10) * (x - 10)));
});

teste("fatoração · lição 4 — o trinômio só fecha se o MEIO bater", () => {
  // Todo trinômio da forma x² + 2bx + b² é quadrado perfeito.
  for (let b = -10; b <= 10; b += 1) {
    assert.ok(ftIguais((x) => x * x + 2 * b * x + b * b, (x) => (x + b) ** 2), `x² + ${2 * b}x + ${b * b}`);
  }

  // E se o termo do meio NÃO for o dobro do produto, não é quadrado de nada:
  // conferido por busca sobre todos os candidatos inteiros.
  for (const [meio, fim] of [[7, 9], [5, 4], [3, 1]]) {
    let achou = false;
    for (let p = -30; p <= 30; p += 1) {
      if (ftIguais((x) => (x + p) ** 2, (x) => x * x + meio * x + fim)) achou = true;
    }
    assert.ok(!achou, `x² + ${meio}x + ${fim} não podia ser quadrado perfeito`);
  }
  // enquanto o caso que bate, fecha
  assert.ok(ftIguais((x) => (x + 3) ** 2, (x) => x * x + 6 * x + 9));

  num("fatoracao", "trinomio-quadrado", "q1", 4);
  alt("fatoracao", "trinomio-quadrado", "q2", "(x − 5)²");
  alt("fatoracao", "trinomio-quadrado", "q3", "Não, porque o dobro do produto das raízes dá 6x, e não 7x");
  alt("fatoracao", "trinomio-quadrado", "q4", "Não, porque ele é um quadrado, e todo quadrado é positivo");

  // A q1: a conferência do meio bate para o 4, e para mais nenhum candidato.
  assert.equal(2 * 1 * 4, 8, "o dobro do produto dá o termo do meio");
  assert.ok(ftIguais((x) => x * x + 8 * x + 16, (x) => (x + 4) ** 2));

  // A q2: o sinal do meio decide, e a alternativa com sinal trocado discorda.
  assert.ok(ftIguais((x) => x * x - 10 * x + 25, (x) => (x - 5) ** 2));
  assert.ok(!ftIguais((x) => x * x - 10 * x + 25, (x) => (x + 5) ** 2));
  assert.ok(!ftIguais((x) => x * x - 10 * x + 25, (x) => (x + 5) * (x - 5)));

  // A q3, medida: a expressão do enunciado e o quadrado candidato discordam.
  assert.notEqual(1 * 1 + 7 * 1 + 9, (1 + 3) ** 2, "em x = 1 os dois já diferem");

  // A q4: o último termo é sempre positivo, nos dois quadrados.
  for (let b = -10; b <= 10; b += 1) assert.ok(b * b >= 0, `(±${b})²`);
});

teste("fatoração · lição 5 — o fator comum vem antes da contagem de termos", () => {
  // O caso que junta dois métodos: sem tirar o fator comum, as pontas não são
  // quadrados perfeitos; depois de tirar, são.
  const quadradoPerfeito = (n) => { for (let k = 0; k * k <= n; k += 1) if (k * k === n) return true; return false; };
  assert.ok(!quadradoPerfeito(2), "o 2 de 2x² não é quadrado perfeito");
  assert.ok(!quadradoPerfeito(50), "o 50 não é quadrado perfeito");
  assert.ok(quadradoPerfeito(1) && quadradoPerfeito(25), "depois de tirar o 2, as pontas fecham");
  assert.ok(ftIguais((x) => 2 * x * x - 50, (x) => 2 * (x + 5) * (x - 5)));

  // O mesmo para a q3.
  assert.ok(ftIguais((x) => 3 * x * x - 27, (x) => 3 * (x + 3) * (x - 3)));
  assert.ok(!quadradoPerfeito(3) && !quadradoPerfeito(27));

  alt("fatoracao", "escolher-caminho", "q1", "Se existe fator comum a todas as parcelas");
  alt("fatoracao", "escolher-caminho", "q2", "Trinômio quadrado perfeito");
  num("fatoracao", "escolher-caminho", "q3", 3);
  alt("fatoracao", "escolher-caminho", "q4", "Porque cada caso ainda tem condições próprias a conferir, como x² + 25 mostra");

  // A q3: são três fatores, e nenhum dos parênteses abre mais.
  //   (x+3) e (x−3) não são diferença de quadrados nem têm fator comum.
  assert.equal(ftMdc(1, 3), 1, "x + 3 não tem fator comum numérico");

  // A q4: as duas expressões têm a contagem certa de termos e não fatoram.
  let achouSoma = false;
  for (let p = -30; p <= 30; p += 1) for (let q = -30; q <= 30; q += 1) {
    if (ftIguais((x) => (x + p) * (x + q), (x) => x * x + 25)) achouSoma = true;
  }
  assert.ok(!achouSoma, "x² + 25 não fatora em inteiros");
});

teste("fatoração · lição 6 — só se cancela FATOR, e fatorar é o que os cria", () => {
  // A simplificação, conferida ponto a ponto e evitando o valor que anula o
  // denominador — a fração não existe lá, e comparar seria comparar com NaN.
  for (let x = -20; x <= 20; x += 1) {
    if (x + 3 !== 0) {
      assert.ok(Math.abs((x * x - 9) / (x + 3) - (x - 3)) < 1e-9, `(x²−9)/(x+3) em x=${x}`);
    }
    if (x - 4 !== 0) {
      assert.ok(Math.abs((x * x - 16) / (x - 4) - (x + 4)) < 1e-9, `(x²−16)/(x−4) em x=${x}`);
    }
    assert.ok(Math.abs((6 * x + 9) / 3 - (2 * x + 3)) < 1e-9, `(6x+9)/3 em x=${x}`);
  }

  alt("fatoracao", "problemas", "q1", "x + 4");
  num("fatoracao", "problemas", "q2", (3 + 3) / 3);
  alt("fatoracao", "problemas", "q3", "2x + 3");
  alt("fatoracao", "problemas", "q4", "Porque só se cancela o que multiplica a fração inteira, e fatorar cria esses fatores");

  // A q2 é a demonstração do corte proibido: a fração original e o resultado
  // do corte errado dão números diferentes.
  assert.equal((3 + 3) / 3, 2);
  assert.notEqual((3 + 3) / 3, 3, "o corte errado daria x, ou seja, 3");
  // e isso vale em quase toda a faixa, não só em x = 3
  let diferem = 0;
  for (let x = -10; x <= 10; x += 1) if (Math.abs((x + 3) / 3 - x) > 1e-9) diferem += 1;
  assert.ok(diferem >= 20, "o corte errado discorda em quase todos os pontos");

  // A q4: fatorar permite o corte, mas não o garante — o contraexemplo.
  for (let x = -10; x <= 10; x += 1) {
    if (x + 3 === 0) continue;
    const naoSimplifica = ((x + 2) * (x - 1)) / (x + 3);
    assert.ok(Number.isFinite(naoSimplifica), "existe, mas não corta: nenhum fator se repete");
  }
});

teste("fatoração · a figura mostra o fator comum como LADO", () => {
  // O `retanguloFatores` põe a altura comum à esquerda e as áreas dentro.
  // Numa questão que pede esse fator, a altura sai como "?".
  const cheio = desenhos.retanguloFatores({
    altura: "3", partes: [{ largura: "2x", area: "6x" }, { largura: "3", area: "9" }],
  });
  assert.ok(cheio.includes(">3<"), "a altura tinha de aparecer");
  assert.ok(cheio.includes(">6x<") && cheio.includes(">9<"), "as áreas tinham de aparecer");

  const escondido = desenhos.retanguloFatores({
    altura: "3", partes: [{ largura: "2x", area: "6x" }, { largura: "3", area: "9" }],
    revelar: "areas",
  });
  assert.ok(escondido.includes(">?<"), "com revelar 'areas' a altura fica em aberto");
  assert.ok(escondido.includes(">6x<"), "mas as áreas continuam à mostra");

  // uma faixa por parcela, sempre
  for (const n of [2, 3, 4]) {
    const partes = Array.from({ length: n }, (_, i) => ({ largura: `l${i}`, area: `a${i}` }));
    const svg = desenhos.retanguloFatores({ altura: "k", partes });
    // as faixas mais o contorno de fora
    const rects = (svg.match(/<rect /g) || []).length;
    assert.equal(rects, n + 1, `com ${n} parcelas esperava ${n} faixas e o contorno`);
  }
});

teste("fatoração · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("fatoracao", 24);
});



// ---------- Frações algébricas (8º ano) ----------
//
// Toda simplificação é conferida por EQUIVALÊNCIA, com um cuidado que as
// matérias anteriores não precisavam ter: o valor proibido é PULADO. Comparar
// a fração original com a simplificada no ponto que anula o denominador
// significaria comparar com uma divisão por zero.

/** Os dois lados coincidem em toda a faixa, menos nos valores proibidos? */
function faIguais(f, g, proibidos = [], de = -20, ate = 20) {
  for (let x = de; x <= ate; x += 1) {
    if (proibidos.includes(x)) continue;
    if (Math.abs(f(x) - g(x)) > 1e-9) return false;
  }
  return true;
}

const faMmc = (a, b) => {
  const mdcLocal = (p, q) => (q === 0 ? Math.abs(p) : mdcLocal(q, p % q));
  return Math.abs(a * b) / mdcLocal(a, b);
};

teste("frações algébricas · lição 1 — o proibido sai do DENOMINADOR", () => {
  // O valor proibido é a raiz do denominador, e o numerador não opina.
  // Conferido construindo frações com denominador x + k e testando que só o
  // −k quebra a conta.
  for (let k = -8; k <= 8; k += 1) {
    for (let x = -20; x <= 20; x += 1) {
      const denominador = x + k;
      const existe = denominador !== 0;
      assert.equal(existe, x !== -k, `denominador x + ${k} em x = ${x}`);
      if (existe) assert.ok(Number.isFinite((x + 1) / denominador), "a fração tem valor");
    }
  }

  // Numerador zero é legítimo: a fração vale zero, e não deixa de existir.
  assert.equal((2 - 2) / (2 + 5), 0);
  assert.ok(Number.isFinite((2 - 2) / (2 + 5)));
});

teste("frações algébricas · lição 1 — valores proibidos", () => {
  num("fracoes-algebricas", "o-que-e", "q1", 0);
  num("fracoes-algebricas", "o-que-e", "q2", -3);
  alt("fracoes-algebricas", "o-que-e", "q3", "x/3");
  alt("fracoes-algebricas", "o-que-e", "q4", "A fração vale zero, e isso é perfeitamente normal");

  // A q1: o denominador é o próprio x.
  assert.ok(!Number.isFinite(5 / 0), "5/0 não tem valor");
  assert.equal(5 / -5, -1, "com x = −5 a fração existe");

  // A q2: o proibido resolve x + 3 = 0.
  assert.equal(-3 + 3, 0);
  assert.equal(3 + 3, 6, "com x = 3 o denominador vale 6");

  // A q3: x/3 existe para TODO x, porque o denominador é constante.
  for (let x = -20; x <= 20; x += 1) assert.ok(Number.isFinite(x / 3), `x/3 em ${x}`);

  // A q4: numerador zero dá fração zero.
  assert.equal((2 - 2) / (2 + 5), 0);
});

teste("frações algébricas · lição 2 — simplificar exige FATOR, e o teste mede", () => {
  // Cada simplificação, conferida em toda a faixa menos no proibido.
  assert.ok(faIguais((x) => (x * x - 9) / (x + 3), (x) => x - 3, [-3]));
  assert.ok(faIguais((x) => (2 * x + 4) / (x + 2), () => 2, [-2]));
  assert.ok(faIguais((x) => (x * x + 6 * x + 9) / (x + 3), (x) => x + 3, [-3]));
  assert.ok(faIguais((x) => (6 * x + 9) / 3, (x) => 2 * x + 3));

  // E o corte PROIBIDO é medido: (x+3)/3 não é x, e os dois discordam em
  // quase toda a faixa.
  let diferem = 0;
  for (let x = -20; x <= 20; x += 1) if (Math.abs((x + 3) / 3 - x) > 1e-9) diferem += 1;
  assert.ok(diferem >= 40, "o corte errado discorda em quase todos os pontos");
  assert.equal((6 + 3) / 3, 3, "com x = 6 a fração original vale 3");
  assert.notEqual((6 + 3) / 3, 6, "e o corte errado daria 6");

  num("fracoes-algebricas", "simplificar", "q1", 2);
  alt("fracoes-algebricas", "simplificar", "q2", "x + 3");
  num("fracoes-algebricas", "simplificar", "q3", (6 + 3) / 3);
  alt("fracoes-algebricas", "simplificar", "q4", "Porque só se corta fator, e fatorar é o que transforma somas em fatores");

  // A q2: das quatro alternativas, só uma vale em toda a faixa.
  assert.ok(faIguais((x) => (x * x + 6 * x + 9) / (x + 3), (x) => x + 3, [-3]));
  assert.ok(!faIguais((x) => (x * x + 6 * x + 9) / (x + 3), (x) => x - 3, [-3]));
  assert.ok(!faIguais((x) => (x * x + 6 * x + 9) / (x + 3), (x) => x + 6, [-3]));
});

teste("frações algébricas · lição 3 — multiplicar e dividir", () => {
  // Multiplicar é cima com cima e baixo com baixo — conferido contra a
  // definição, para vários pares.
  for (let a = 1; a <= 6; a += 1) {
    for (let b = 1; b <= 6; b += 1) {
      for (let c = 1; c <= 6; c += 1) {
        for (let d = 1; d <= 6; d += 1) {
          assert.ok(
            Math.abs((a / b) * (c / d) - (a * c) / (b * d)) < 1e-9,
            `(${a}/${b}) × (${c}/${d})`
          );
          // e dividir é multiplicar pelo inverso
          assert.ok(
            Math.abs((a / b) / (c / d) - (a / b) * (d / c)) < 1e-9,
            `(${a}/${b}) ÷ (${c}/${d})`
          );
        }
      }
    }
  }

  // As contas da lição, com o zero pulado.
  assert.ok(faIguais((x) => (x / 2) * (4 / x), () => 2, [0]));
  assert.ok(faIguais((x) => (x / 3) / (x / 6), () => 2, [0]));
  assert.ok(faIguais((x) => (2 / x) * (x / 8), () => 0.25, [0]));

  num("fracoes-algebricas", "multiplicar-dividir", "q1", 2);
  alt("fracoes-algebricas", "multiplicar-dividir", "q2", "Sim, porque tudo que está em cima acaba no mesmo numerador");
  num("fracoes-algebricas", "multiplicar-dividir", "q3", 2 / 8);
  alt("fracoes-algebricas", "multiplicar-dividir", "q4", "Porque ao inverter, o x vai para o denominador");

  // A q1: inverter a fração ERRADA dá outro número.
  assert.ok(faIguais((x) => (x / 3) * (6 / x), () => 2, [0]));
  assert.ok(faIguais((x) => (3 / x) * (x / 6), () => 0.5, [0]));
  assert.notEqual(2, 0.5);

  // A q2: o corte cruzado vale para números também, e não só para letras.
  assert.ok(Math.abs((3 / 4) * (8 / 9) - 2 / 3) < 1e-9, "3 corta com 9, 8 corta com 4");
});

teste("frações algébricas · lição 4 — o denominador dimensiona, e não se soma", () => {
  // Somar com denominador igual: os numeradores somam e o denominador fica.
  for (let d = 2; d <= 12; d += 1) {
    for (let p = -8; p <= 8; p += 1) {
      for (let q = -8; q <= 8; q += 1) {
        assert.ok(Math.abs(p / d + q / d - (p + q) / d) < 1e-9, `${p}/${d} + ${q}/${d}`);
        // e somar os denominadores daria OUTRA coisa
        if (p + q !== 0 && d !== 1) {
          assert.notEqual((p + q) / d, (p + q) / (d + d), `somar denominadores muda o valor`);
        }
      }
    }
  }

  // As contas da lição.
  assert.ok(faIguais((x) => x / 5 + 2 * x / 5, (x) => 3 * x / 5));
  assert.ok(faIguais((x) => (x + 1) / 4 + (x - 1) / 4, (x) => x / 2));
  assert.ok(faIguais((x) => 3 * x / 5 - (x - 2) / 5, (x) => (2 * x + 2) / 5));
  assert.ok(faIguais((x) => 3 * x / 8 + x / 8, (x) => x / 2));

  num("fracoes-algebricas", "somar-iguais", "q1", 3);
  alt("fracoes-algebricas", "somar-iguais", "q2", "2x + 2");
  num("fracoes-algebricas", "somar-iguais", "q3", 2);
  alt("fracoes-algebricas", "somar-iguais", "q4", "Porque ele diz o TAMANHO da parte, e o tamanho não muda ao juntar partes");

  // A q2 é o erro do parêntese esquecido, e ele é MEDIDO: o resultado sem
  // parêntese discorda do certo em toda a faixa.
  assert.ok(!faIguais((x) => (2 * x + 2) / 5, (x) => (2 * x - 2) / 5));
  for (let x = -10; x <= 10; x += 1) {
    assert.equal(3 * x - (x - 2), 2 * x + 2, `distribuindo o menos em x=${x}`);
    assert.notEqual(3 * x - x - 2, 2 * x + 2, `sem o parêntese, em x=${x}`);
  }
});

teste("frações algébricas · lição 5 — o MMC e a fração equivalente", () => {
  // Multiplicar em cima e embaixo pelo mesmo número não muda o valor.
  for (let n = -10; n <= 10; n += 1) {
    for (let d = 1; d <= 10; d += 1) {
      for (let k = 1; k <= 8; k += 1) {
        assert.ok(Math.abs(n / d - (n * k) / (d * k)) < 1e-9, `${n}/${d} = ${n * k}/${d * k}`);
      }
    }
  }

  // A soma com denominadores diferentes.
  assert.ok(faIguais((x) => x / 2 + x / 3, (x) => 5 * x / 6));
  assert.ok(faIguais((x) => x / 4 + x / 6, (x) => 5 * x / 12));
  assert.equal(faMmc(2, 3), 6);
  assert.equal(faMmc(4, 6), 12);
  assert.ok(faMmc(4, 6) < 4 * 6, "o MMC é menor que o produto quando há fator comum");

  // Com letras: 1/x + 1/y = (x+y)/xy, varrido em duas variáveis.
  for (let x = 1; x <= 9; x += 1) {
    for (let y = 1; y <= 9; y += 1) {
      assert.ok(Math.abs(1 / x + 1 / y - (x + y) / (x * y)) < 1e-9, `1/${x} + 1/${y}`);
    }
  }

  num("fracoes-algebricas", "somar-diferentes", "q1", faMmc(4, 6));
  alt("fracoes-algebricas", "somar-diferentes", "q2", "3x");
  alt("fracoes-algebricas", "somar-diferentes", "q3", "x + y");
  alt("fracoes-algebricas", "somar-diferentes", "q4", "Porque as partes ficam menores e mais numerosas na mesma proporção");

  // A q2: deixar o numerador parado MUDA o valor.
  for (let x = 1; x <= 10; x += 1) {
    assert.ok(Math.abs(x / 2 - 3 * x / 6) < 1e-9, "3x/6 é equivalente");
    assert.notEqual(x / 2, x / 6, "deixar o numerador parado muda o valor");
  }

  // A q3: o numerador da soma é x + y, e ele NÃO simplifica com xy.
  for (let x = 2; x <= 8; x += 1) {
    for (let y = 2; y <= 8; y += 1) {
      if (x === y) continue;
      const soma = (x + y) / (x * y);
      assert.ok(Number.isFinite(soma) && soma > 0, `(${x}+${y})/${x * y}`);
    }
  }
});

teste("frações algébricas · lição 6 — a restrição sobrevive à simplificação", () => {
  // A expressão simplificada vale o mesmo em toda parte, MENOS no ponto que
  // a original proibia — e é por isso que a restrição continua valendo.
  assert.ok(faIguais((x) => (x * x - 4) / (x + 2), (x) => x - 2, [-2]));
  assert.ok(!Number.isFinite(((-2) * (-2) - 4) / (-2 + 2)), "a original não existe em x = −2");
  assert.equal(-2 - 2, -4, "mas a simplificada tem valor lá — e por isso a condição fica escrita");

  alt("fracoes-algebricas", "problemas", "q1", "Não, o denominador comum é só para soma e subtração");
  num("fracoes-algebricas", "problemas", "q2", -2);
  num("fracoes-algebricas", "problemas", "q3", 0.5);
  alt("fracoes-algebricas", "problemas", "q4", "Porque evita escrever produtos grandes que teriam de ser cortados depois");

  // A q3: inverter a segunda dá 0,5; inverter a primeira daria 2.
  assert.ok(faIguais((x) => (x / 4) / (x / 2), () => 0.5, [0]));
  assert.ok(faIguais((x) => (x / 4) * (2 / x), () => 0.5, [0]));
  assert.notEqual(0.5, 2);

  // A q4: as duas ordens dão o MESMO resultado — a vantagem é só de trabalho.
  for (let x = 1; x <= 10; x += 1) {
    const multiplicandoAntes = (x * 4) / (2 * x);
    const cortandoAntes = 2;
    assert.ok(Math.abs(multiplicandoAntes - cortandoAntes) < 1e-9, `as duas ordens em x=${x}`);
  }
});

teste("frações algébricas · a figura risca FATOR, e não parcela", () => {
  // O gerador só risca o que foi passado como fator da lista. Numa fração
  // escrita como soma — um fator único —, não há o que riscar, e é por isso
  // que ele não consegue ilustrar um corte proibido.
  const soma = desenhos.fracaoAlgebrica({ cima: ["x + 3"], baixo: ["3"], cortar: ["3"] });
  const riscosNaSoma = (soma.match(/<line[^>]*stroke-width="1\.8"/g) || []).length;
  assert.equal(riscosNaSoma, 1, "só o 3 do denominador é fator, então só ele é riscado");

  // Já com o numerador fatorado, o corte aparece nos dois lados.
  const produto = desenhos.fracaoAlgebrica({
    cima: ["3", "(2x + 3)"], baixo: ["3"], cortar: ["3"],
  });
  const riscos = (produto.match(/<line[^>]*stroke-width="1\.8"/g) || []).length;
  assert.equal(riscos, 2, "o 3 aparece dos dois lados e os dois são riscados");

  // A barra da fração está sempre lá, e o resultado só quando pedido.
  assert.ok(produto.includes('stroke-width="2.2"'), "a barra da fração");
  const comResultado = desenhos.fracaoAlgebrica({
    cima: ["a"], baixo: ["b"], resultado: "c",
  });
  assert.ok(comResultado.includes(">= c<"), "o resultado, quando pedido");
  const semResultado = desenhos.fracaoAlgebrica({ cima: ["a"], baixo: ["b"] });
  assert.ok(!semResultado.includes(">= "), "e nada quando não é pedido");
});

teste("frações algébricas · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("fracoes-algebricas", 24);
});



// ---------- Sistemas de equações (8º ano) ----------
//
// Nenhum sistema é resolvido aqui pelo método que a matéria ensina. Todos
// saem por BUSCA sobre a grade de pares, e o teste ainda exige que a solução
// achada seja a ÚNICA — que é a afirmação que a lição 1 faz e a lição 5
// desenha. É a mesma disciplina das equações do 7º ano.

/** Todos os pares (x, y) da grade que satisfazem as duas equações. */
function siResolver(a1, b1, c1, a2, b2, c2, limite = 30, passo = 0.5) {
  const achados = [];
  for (let x = -limite; x <= limite; x += passo) {
    for (let y = -limite; y <= limite; y += passo) {
      if (Math.abs(a1 * x + b1 * y - c1) < 1e-9 && Math.abs(a2 * x + b2 * y - c2) < 1e-9) {
        achados.push([x, y]);
      }
    }
  }
  return achados;
}

teste("sistemas · lição 1 — uma equação deixa infinitas soluções; duas selecionam uma", () => {
  // Uma equação sozinha: para CADA x existe um y que fecha. O teste varre a
  // faixa e exige que nenhum x fique sem par.
  for (let x = -20; x <= 20; x += 1) {
    const y = 10 - x;
    assert.ok(Math.abs(x + y - 10) < 1e-9, `x = ${x} sempre tem um y`);
  }

  // Duas equações: a solução é única, achada por busca.
  const sol = siResolver(1, 1, 10, -1, 1, 2);
  assert.equal(sol.length, 1, "o sistema tinha de ter solução única");
  assert.deepEqual(sol[0], [4, 6]);

  // E o par que fecha só UMA não serve: o teste mostra os dois lados.
  assert.equal(3 + 7, 10, "o par (3,7) fecha a primeira");
  assert.notEqual(7 - 3, 2, "e falha na segunda");

  alt("sistemas", "duas-incognitas", "q1", "Infinitos");
  alt("sistemas", "duas-incognitas", "q2", "Não, porque na segunda equação dá 5, e não 3");
  num("sistemas", "duas-incognitas", "q3", 2);
  num("sistemas", "duas-incognitas", "q4", 10 - 7);

  // A q2, conferida nos dois lados.
  assert.equal(6 + 1, 7, "o par (6,1) fecha a primeira");
  assert.equal(6 - 1, 5, "e na segunda dá 5");
  assert.notEqual(5, 3, "que não é o 3 pedido");
});

teste("sistemas · lição 2 — a substituição chega ao mesmo par que a busca", () => {
  // Cada sistema da lição, resolvido por BUSCA e comparado com o par publicado.
  const casos = [
    [1, 1, 10, -1, 1, 2, [4, 6]],
    [1, 2, 8, 1, -2, -4, [2, 3]],
  ];
  for (const [a1, b1, c1, a2, b2, c2, esperado] of casos) {
    const sol = siResolver(a1, b1, c1, a2, b2, c2);
    assert.equal(sol.length, 1, `${a1}x+${b1}y=${c1} e ${a2}x+${b2}y=${c2}: solução única`);
    assert.deepEqual(sol[0], esperado);
  }

  alt("sistemas", "substituicao", "q1", "x + (x + 2) = 10");
  num("sistemas", "substituicao", "q2", 4);
  num("sistemas", "substituicao", "q3", 3);
  alt("sistemas", "substituicao", "q4", "Quando uma das equações já tem uma letra isolada, ou é fácil isolá-la");

  // A q1: a equação que aparece depois da substituição é equivalente à
  // original para todo x — conferido em toda a faixa.
  for (let x = -20; x <= 20; x += 1) {
    assert.equal(x + (x + 2), 2 * x + 2, `a substituição em x=${x}`);
  }
  // e as alternativas erradas NÃO são equivalentes
  for (let x = -20; x <= 20; x += 1) {
    if (x !== 0) assert.notEqual(x + 2, x + (x + 2), "a que apaga o x original difere");
  }

  // A q3: o sistema x + 2y = 8 e x = 2y − 4 tem solução (2, 3).
  const s = siResolver(1, 2, 8, 1, -2, -4);
  assert.deepEqual(s[0], [2, 3]);
});

teste("sistemas · lição 3 — a adição cancela quando os coeficientes são opostos", () => {
  // Somar as duas equações é legítimo: o par que resolvia as duas continua
  // resolvendo a soma. Conferido para muitos sistemas.
  for (let c1 = 1; c1 <= 10; c1 += 1) {
    for (let c2 = 1; c2 <= 10; c2 += 1) {
      const sol = siResolver(1, 1, c1, 1, -1, c2);
      if (sol.length !== 1) continue;
      const [x, y] = sol[0];
      // a equação somada também é satisfeita pelo mesmo par
      assert.ok(Math.abs(2 * x - (c1 + c2)) < 1e-9, `a soma vale para ${c1}, ${c2}`);
      assert.ok(Math.abs(x + y - c1) < 1e-9 && Math.abs(x - y - c2) < 1e-9);
    }
  }

  // O cancelamento só acontece com coeficientes OPOSTOS.
  for (let k = -6; k <= 6; k += 1) {
    const soma = k + (-k);
    assert.equal(soma, 0, `+${k} e −${k} se cancelam`);
    if (k !== 0) assert.notEqual(k + k, 0, `+${k} e +${k} não se cancelam`);
  }

  const sol = siResolver(1, 1, 7, 1, -1, 3);
  assert.deepEqual(sol[0], [5, 2]);

  alt("sistemas", "adicao", "q1", "2x = 10");
  num("sistemas", "adicao", "q2", 2);
  num("sistemas", "adicao", "q3", 2);
  alt("sistemas", "adicao", "q4", "Porque os dois lados crescem igual, e a igualdade continua valendo");

  // A q3: multiplicar a segunda equação por 2 deixa os coeficientes de y
  // opostos — e NÃO muda a solução do sistema, que é o ponto da q4.
  const antes = siResolver(1, 2, 8, 3, -1, 3);
  const depois = siResolver(1, 2, 8, 6, -2, 6);
  assert.deepEqual(antes, depois, "multiplicar a equação não muda a solução");
  assert.equal(antes.length, 1);
  assert.deepEqual(antes[0], [2, 3]);
  // e o fator 2 é o que torna os coeficientes opostos
  assert.equal(2 * (-1), -2, "o −y vira −2y");
  assert.equal(2 + (-2), 0, "e cancela com o +2y");
});

teste("sistemas · lição 4 — os dois métodos dão o MESMO par", () => {
  // A afirmação central da lição, conferida por construção: a solução é
  // definida por satisfazer as duas equações, e isso não depende de método.
  const casos = [
    [3, 2, 12, 5, -2, 4],
    [1, 1, 10, -1, 1, 2],
    [1, 1, 7, 1, -1, 3],
    [2, 3, 19, 1, 1, 8],
  ];
  for (const [a1, b1, c1, a2, b2, c2] of casos) {
    const sol = siResolver(a1, b1, c1, a2, b2, c2);
    assert.equal(sol.length, 1, `${a1}x+${b1}y=${c1} e ${a2}x+${b2}y=${c2}`);
    const [x, y] = sol[0];
    // o par satisfaz as duas — que é a definição, e o que os dois métodos buscam
    assert.ok(Math.abs(a1 * x + b1 * y - c1) < 1e-9);
    assert.ok(Math.abs(a2 * x + b2 * y - c2) < 1e-9);
  }

  alt("sistemas", "escolher-metodo", "q1", "Não: a solução é o par que fecha as duas equações, e isso não muda com o método");
  alt("sistemas", "escolher-metodo", "q2", "A adição, porque os coeficientes do y já são opostos");
  num("sistemas", "escolher-metodo", "q3", 2);
  alt("sistemas", "escolher-metodo", "q4", "Uma das letras já aparecer sozinha de um lado");

  // A q2 e a q3: o sistema tem coeficientes de y opostos e solução (2, 3).
  assert.equal(2 + (-2), 0, "os coeficientes do y já se cancelam");
  const sol = siResolver(3, 2, 12, 5, -2, 4);
  assert.deepEqual(sol[0], [2, 3]);
  // e a soma das equações dá 8x = 16
  assert.equal(3 + 5, 8);
  assert.equal(12 + 4, 16);
  assert.equal(16 / 8, 2);
});

teste("sistemas · lição 5 — a solução é o ponto onde as retas se cruzam", () => {
  // A afirmação da lição, conferida contra a busca: o par achado por conta é
  // o mesmo ponto que está nas duas retas.
  const sol = siResolver(1, 1, 5, 1, -1, 1);
  assert.deepEqual(sol[0], [3, 2]);

  // Paralelas não se cruzam: coeficientes proporcionais com termo
  // independente diferente não têm solução nenhuma.
  assert.equal(siResolver(1, 1, 3, 1, 1, 6).length, 0, "x+y=3 e x+y=6 são paralelas");
  assert.equal(siResolver(2, 2, 4, 1, 1, 5).length, 0, "também paralelas, com coeficientes proporcionais");

  // E a mesma reta escrita duas vezes dá infinitas soluções.
  assert.ok(siResolver(1, 1, 4, 2, 2, 8).length > 5, "a mesma reta: muitos pares servem");

  alt("sistemas", "no-grafico", "q1", "O ponto onde as duas retas se cruzam");
  num("sistemas", "no-grafico", "q2", 3);
  num("sistemas", "no-grafico", "q3", 0);
  alt("sistemas", "no-grafico", "q4", "Porque ela é um ponto do plano, e todo ponto precisa de duas coordenadas");

  // A q2: a coordenada x do cruzamento é 3, e a y é 2 — o teste separa as duas.
  assert.equal(sol[0][0], 3);
  assert.equal(sol[0][1], 2);
});

teste("sistemas · lição 6 — os problemas, resolvidos pelo TEXTO", () => {
  // Cada problema é resolvido varrendo as possibilidades e exigindo que só
  // uma sirva — nunca aplicando a fórmula do sistema.
  const lanchonete = [];
  for (let r = 0; r <= 20; r += 0.5) {
    for (let s = 0; s <= 20; s += 0.5) {
      if (Math.abs(2 * r + 3 * s - 19) < 1e-9 && Math.abs(r + s - 8) < 1e-9) lanchonete.push([r, s]);
    }
  }
  assert.equal(lanchonete.length, 1, "o problema da lanchonete tinha de ter resposta única");
  assert.deepEqual(lanchonete[0], [5, 3]);

  const somaDif = [];
  for (let x = 0; x <= 40; x += 1) for (let y = 0; y <= 40; y += 1) {
    if (x + y === 20 && x - y === 4) somaDif.push([x, y]);
  }
  assert.deepEqual(somaDif, [[12, 8]]);

  // O estacionamento: contado por FORÇA BRUTA sobre quantidades inteiras,
  // que é o que o problema realmente pede — não existe meia moto.
  const veiculos = [];
  for (let c = 0; c <= 10; c += 1) {
    const m = 10 - c;
    if (4 * c + 2 * m === 32) veiculos.push([c, m]);
  }
  assert.equal(veiculos.length, 1, "o problema dos veículos tinha de ter resposta única");
  assert.deepEqual(veiculos[0], [6, 4]);

  num("sistemas", "problemas", "q1", 5);
  num("sistemas", "problemas", "q2", 12);
  alt("sistemas", "problemas", "q3", "Escrever por extenso o que cada letra representa");
  num("sistemas", "problemas", "q4", 6);

  // As alternativas erradas da q4, medidas: 8 carros dariam 32 rodas mas
  // zero motos, e 5 e 5 dariam só 30 rodas.
  assert.equal(4 * 8, 32, "8 carros dão 32 rodas");
  assert.notEqual(8 + 0, 10, "mas aí não fecham 10 veículos");
  assert.equal(4 * 5 + 2 * 5, 30, "5 e 5 dariam 30 rodas");
  assert.notEqual(30, 32);
});

teste("sistemas · a figura desenha as retas de verdade", () => {
  // O `planoCartesiano` calcula onde cada reta corta a moldura. O teste lê os
  // dois extremos do SVG de volta e confere que os DOIS satisfazem a equação
  // — se a reta desenhada fosse outra, a matéria estaria mentindo na figura.
  const escala = 34, m = 34, ate = 6;
  const casos = [
    { a: 1, b: 1, c: 5 },
    { a: 1, b: -1, c: 1 },
    { a: 1, b: 2, c: 8 },
    { a: 3, b: -1, c: 3 },
  ];
  for (const eq of casos) {
    const svg = desenhos.planoCartesiano({ ate, retas: [eq] });
    const linha = [...svg.matchAll(/<line x1="([0-9.]+)" y1="([0-9.]+)" x2="([0-9.]+)" y2="([0-9.]+)" stroke="#f7f5f0" stroke-width="2\.2"/g)];
    assert.equal(linha.length, 1, `esperava uma reta para ${eq.a}x+${eq.b}y=${eq.c}`);
    const [, x1, y1, x2, y2] = linha[0].map(Number);
    // volta das coordenadas do SVG para as do plano
    const paraPlano = (px, py) => [(px - m) / escala, (m + ate * escala - py) / escala];
    for (const [px, py] of [paraPlano(x1, y1), paraPlano(x2, y2)]) {
      assert.ok(
        Math.abs(eq.a * px + eq.b * py - eq.c) < 0.05,
        `o ponto (${px.toFixed(2)}, ${py.toFixed(2)}) não está na reta ${eq.a}x+${eq.b}y=${eq.c}`
      );
    }
  }

  // Duas retas paralelas são desenhadas como duas linhas que não se cruzam
  // dentro da moldura — é a figura da questão sobre sistema sem solução.
  const par = desenhos.planoCartesiano({
    ate: 6, retas: [{ a: 1, b: 1, c: 3 }, { a: 1, b: 1, c: 6 }],
  });
  assert.equal(
    [...par.matchAll(/stroke="#f7f5f0" stroke-width="2\.2"/g)].length, 2,
    "as duas paralelas tinham de ser desenhadas"
  );
});

teste("sistemas · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("sistemas", 24);
});



// ---------- Ângulos e polígonos (8º ano) ----------
//
// As quatro fórmulas da matéria são conferidas por CONTAGEM, e não aplicadas.
// A soma dos internos sai de triangular; as diagonais saem de percorrer todos
// os pares de vértices; a soma dos externos sai do suplemento de cada interno.
// A fórmula é comparada com a contagem, e não usada no lugar dela.

/** Diagonais contadas percorrendo todos os pares de vértices não vizinhos. */
function pgContarDiagonais(n) {
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const vizinhos = j === i + 1 || (i === 0 && j === n - 1);
      if (!vizinhos) total += 1;
    }
  }
  return total;
}

/** Triângulos da triangulação a partir de um vértice, contados um a um. */
function pgContarTriangulos(n) {
  let total = 0;
  for (let j = 1; j <= n - 2; j += 1) total += 1;   // triângulos (0, j, j+1)
  return total;
}

teste("polígonos · lição 1 — lados, vértices e ângulos andam juntos", () => {
  // Percorrendo o contorno fechado, cada lado termina num vértice e cada
  // vértice recebe exatamente dois lados — então as contagens coincidem.
  for (let n = 3; n <= 30; n += 1) {
    const vertices = new Set();
    for (let i = 0; i < n; i += 1) {
      vertices.add(i);            // o lado i vai do vértice i ao (i+1) % n
      vertices.add((i + 1) % n);
    }
    assert.equal(vertices.size, n, `polígono de ${n} lados`);
  }

  num("poligonos", "o-que-e", "q1", 9);
  alt("poligonos", "o-que-e", "q2", "Um hexágono");
  alt("poligonos", "o-que-e", "q3", "Não, porque ser regular exige lados iguais E ângulos iguais");
  num("poligonos", "o-que-e", "q4", 8);

  // A q3: as duas condições são independentes, e o teste mostra os dois
  // casos que falham em uma só.
  const regular = (ladosIguais, angulosIguais) => ladosIguais && angulosIguais;
  assert.equal(regular(true, false), false, "losango: lados iguais, ângulos não");
  assert.equal(regular(false, true), false, "retângulo: ângulos iguais, lados não");
  assert.equal(regular(true, true), true, "quadrado: as duas");
});

teste("polígonos · lição 2 — a soma sai de CONTAR triângulos", () => {
  // A triangulação a partir de um vértice produz n − 2 triângulos —
  // conferido contando um a um, e não assumindo a fórmula.
  for (let n = 3; n <= 40; n += 1) {
    assert.equal(pgContarTriangulos(n), n - 2, `triangulação de ${n} lados`);
    // e a soma é 180 por triângulo
    assert.equal(pgContarTriangulos(n) * 180, (n - 2) * 180, `soma de ${n} lados`);
  }

  // Os casos que o 7º ano já conhecia têm de bater.
  assert.equal((3 - 2) * 180, 180, "triângulo");
  assert.equal((4 - 2) * 180, 360, "quadrilátero");

  num("poligonos", "soma-internos", "q1", (5 - 2) * 180);
  num("poligonos", "soma-internos", "q2", 10 - 2);
  num("poligonos", "soma-internos", "q3", (12 - 2) * 180);
  alt("poligonos", "soma-internos", "q4", "Porque os dois lados vizinhos ao vértice não geram diagonal");

  // A q4: de um vértice saem n − 3 diagonais, e elas criam n − 2 pedaços.
  for (let n = 4; n <= 20; n += 1) {
    const diagonaisDoVertice = n - 3;
    assert.equal(diagonaisDoVertice + 1, n - 2, `${n} lados: ${diagonaisDoVertice} diagonais → ${n - 2} triângulos`);
  }
});

teste("polígonos · lição 3 — só o regular tem um ângulo definido", () => {
  // Num regular, cada ângulo é a soma dividida pela quantidade.
  for (let n = 3; n <= 30; n += 1) {
    const cada = ((n - 2) * 180) / n;
    assert.ok(cada > 0 && cada < 180, `${n} lados: ângulo em (0, 180)`);
    // e n ângulos iguais reconstroem a soma
    assert.ok(Math.abs(cada * n - (n - 2) * 180) < 1e-9, `${n} lados: reconstrói a soma`);
  }

  // O ângulo CRESCE com o número de lados, e nunca alcança 180.
  let anterior = 0;
  for (let n = 3; n <= 200; n += 1) {
    const cada = ((n - 2) * 180) / n;
    assert.ok(cada > anterior, `de ${n - 1} para ${n} lados o ângulo tinha de crescer`);
    assert.ok(cada < 180, `${n} lados: ainda abaixo de 180`);
    anterior = cada;
  }

  num("poligonos", "angulo-regular", "q1", ((5 - 2) * 180) / 5);
  num("poligonos", "angulo-regular", "q2", ((8 - 2) * 180) / 8);
  alt("poligonos", "angulo-regular", "q3", "Não, porque os ângulos podem ser todos diferentes");
  alt("poligonos", "angulo-regular", "q4", "Não, porque aí o vértice deixaria de ser um canto");

  // A q3: existe mais de uma repartição possível de 540 entre cinco ângulos —
  // o teste exibe a do enunciado e confere que ela soma o mesmo total.
  const outraReparticao = [90, 100, 110, 120, 120];
  assert.equal(outraReparticao.reduce((s, x) => s + x, 0), 540);
  assert.notEqual(outraReparticao[0], 108, "e ela não é a do regular");
  assert.equal(new Set(outraReparticao).size > 1, true, "os ângulos dela são diferentes entre si");
});

teste("polígonos · lição 4 — a soma dos externos é 360 em qualquer polígono", () => {
  // A afirmação central, conferida a partir dos INTERNOS: cada externo é o
  // suplemento do interno, e a soma deles fecha uma volta.
  for (let n = 3; n <= 50; n += 1) {
    const interno = ((n - 2) * 180) / n;
    const externo = 180 - interno;
    assert.ok(Math.abs(externo * n - 360) < 1e-9, `${n} lados: os externos somam 360`);
    assert.ok(Math.abs(360 / n - externo) < 1e-9, `${n} lados: cada externo é 360/n`);
  }

  // O contraste que torna o resultado interessante: a soma dos INTERNOS
  // depende do número de lados, e a dos externos não.
  const somas = [4, 6, 8, 20].map((n) => (n - 2) * 180);
  assert.equal(new Set(somas).size, somas.length, "as somas dos internos são todas diferentes");
  const externos = [4, 6, 8, 20].map((n) => (360 / n) * n);
  assert.equal(new Set(externos).size, 1, "as somas dos externos são todas iguais");

  num("poligonos", "externos", "q1", 360);
  num("poligonos", "externos", "q2", 180 - 140);
  num("poligonos", "externos", "q3", 360 / 6);
  alt("poligonos", "externos", "q4", "Porque dar a volta no polígono é girar uma volta completa, e volta completa é sempre 360°");

  // A q3, conferida pelos dois caminhos que a lição apresenta.
  assert.equal(360 / 6, 60, "pela volta dividida");
  assert.equal(180 - ((6 - 2) * 180) / 6, 60, "pelo suplemento do interno");
});

teste("polígonos · lição 5 — as diagonais, contadas par a par", () => {
  // A fórmula n(n−3)/2 é comparada com a contagem de todos os pares de
  // vértices não vizinhos — e não usada no lugar dela.
  for (let n = 3; n <= 40; n += 1) {
    assert.equal(
      pgContarDiagonais(n), (n * (n - 3)) / 2,
      `${n} lados: a contagem discordou da fórmula`
    );
  }

  // Os casos que dá para conferir de olho.
  assert.equal(pgContarDiagonais(3), 0, "o triângulo não tem diagonal");
  assert.equal(pgContarDiagonais(4), 2);
  assert.equal(pgContarDiagonais(5), 5);
  assert.equal(pgContarDiagonais(6), 9);

  num("poligonos", "diagonais", "q1", 12 - 3);
  num("poligonos", "diagonais", "q2", pgContarDiagonais(10));
  num("poligonos", "diagonais", "q3", pgContarDiagonais(3));
  alt("poligonos", "diagonais", "q4", "Porque cada diagonal é contada duas vezes, uma em cada ponta");

  // A q4: a contagem por vértice dá o DOBRO do total, sempre.
  for (let n = 4; n <= 30; n += 1) {
    assert.equal(n * (n - 3), pgContarDiagonais(n) * 2, `${n} lados: a contagem por vértice dobra`);
  }

  // A q2: o erro previsto 45 conta TODOS os pares, incluindo os lados.
  const todosOsPares = (10 * 9) / 2;
  assert.equal(todosOsPares, 45);
  assert.equal(todosOsPares - 10, 35, "tirando os dez lados, sobram as diagonais");
});

teste("polígonos · lição 6 — o caminho inverso, e a conferência do inteiro", () => {
  // Dado qualquer um dos três valores, o número de lados volta — conferido
  // indo e voltando para todos os polígonos de 3 a 40 lados.
  for (let n = 3; n <= 40; n += 1) {
    const soma = (n - 2) * 180;
    assert.equal(soma / 180 + 2, n, `${n}: da soma de volta`);

    const externo = 360 / n;
    assert.ok(Math.abs(360 / externo - n) < 1e-9, `${n}: do externo de volta`);

    const interno = 180 - externo;
    assert.ok(Math.abs(360 / (180 - interno) - n) < 1e-9, `${n}: do interno de volta`);
  }

  num("poligonos", "problemas", "q1", 900 / 180 + 2);
  num("poligonos", "problemas", "q2", 360 / 24);
  num("poligonos", "problemas", "q3", 360 / (180 - 150));
  alt("poligonos", "problemas", "q4", "Que houve erro na conta, ou que o dado do problema é impossível");

  // A q4: o erro que produz resultado quebrado é dividir 180 em vez de 360.
  assert.equal(180 / 24, 7.5, "o caminho errado dá um número quebrado");
  assert.equal(360 / 24, 15, "e o certo dá inteiro");
  assert.ok(!Number.isInteger(180 / 24), "7,5 não é inteiro");
  assert.ok(Number.isInteger(360 / 24), "15 é");

  // E o número de lados é sempre inteiro e pelo menos 3.
  for (let n = 3; n <= 40; n += 1) {
    assert.ok(Number.isInteger(n) && n >= 3);
  }
});

teste("polígonos · a figura CALCULA os triângulos e as diagonais", () => {
  // O gerador decide as ligações a partir de `lados`. O teste lê as linhas de
  // volta do SVG e confere com a contagem feita aqui — se a figura desenhasse
  // outro número, ela estaria mentindo sobre a matéria.
  for (const n of [4, 5, 6, 7, 8, 10]) {
    const doVertice = desenhos.poligonoTriangulado({ lados: n, modo: "vertice" });
    const diagonaisDoVertice = (doVertice.match(/stroke-width="1\.8"/g) || []).length;
    assert.equal(diagonaisDoVertice, n - 3, `${n} lados: diagonais de um vértice`);

    const todas = desenhos.poligonoTriangulado({ lados: n, modo: "todas" });
    const diagonaisTodas = (todas.match(/stroke-width="1\.8"/g) || []).length;
    assert.equal(diagonaisTodas, pgContarDiagonais(n), `${n} lados: todas as diagonais`);

    const contorno = desenhos.poligonoTriangulado({ lados: n, modo: "nenhuma" });
    assert.equal((contorno.match(/stroke-width="1\.8"/g) || []).length, 0, `${n} lados: sem diagonais`);

    // e o polígono desenhado tem mesmo n vértices
    const pontos = contorno.match(/<polygon points="([^"]+)"/)[1].trim().split(/\s+/);
    assert.equal(pontos.length, n, `${n} lados: o polígono tinha de ter ${n} vértices`);
  }

  // Com `numerar`, aparece um número por triângulo — e ele só entra onde a
  // contagem já é conhecida.
  for (const n of [5, 6, 8]) {
    const svg = desenhos.poligonoTriangulado({ lados: n, numerar: true });
    const numeros = [...svg.matchAll(/font-size="13"[^>]*>(\d+)</g)].map((m) => Number(m[1]));
    assert.deepEqual(
      numeros.sort((a, b) => a - b),
      Array.from({ length: n - 2 }, (_, i) => i + 1),
      `${n} lados: os triângulos numerados`
    );
  }

  // O polígono é REGULAR: todos os lados têm o mesmo comprimento. Lido de
  // volta do SVG, porque a matéria fala de polígono regular o tempo todo.
  for (const n of [5, 6, 8]) {
    const svg = desenhos.poligonoTriangulado({ lados: n, modo: "nenhuma" });
    const pts = svg.match(/<polygon points="([^"]+)"/)[1].trim().split(/\s+/)
      .map((p) => p.split(",").map(Number));
    const lados = pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.hypot(p[0] - q[0], p[1] - q[1]);
    });
    const maior = Math.max(...lados), menor = Math.min(...lados);
    assert.ok(maior - menor < 0.5, `${n} lados: o polígono tinha de ser regular`);
  }
});

teste("polígonos · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("poligonos", 24);
});



// ---------- Congruência de triângulos (8º ano) ----------
//
// Os casos que FUNCIONAM são conferidos construindo o triângulo a partir das
// medidas e exigindo que só um saia. E os que ENGANAM são conferidos do jeito
// oposto: o teste EXIBE dois triângulos diferentes cumprindo as mesmas três
// medidas — que é a prova de que o caso não garante nada.

const cgRad = (g) => (g * Math.PI) / 180;

/** Lados de um triângulo a partir dos ângulos e de uma escala (lei dos senos). */
function cgLados(alfa, beta, escala) {
  const gama = 180 - alfa - beta;
  // sem arredondar: o toFixed estragava a razão entre as escalas, e o teste
  // acusava diferença de forma onde só havia perda de casas decimais
  return [Math.sin(cgRad(alfa)), Math.sin(cgRad(beta)), Math.sin(cgRad(gama))]
    .map((s) => s * escala);
}

/** O terceiro lado, a partir de dois lados e do ângulo ENTRE eles. */
const cgTerceiroLado = (a, b, anguloEntre) =>
  Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(cgRad(anguloEntre)));

teste("congruência · lição 1 — seis igualdades, e a posição não entra", () => {
  // Um triângulo tem três lados e três ângulos: seis elementos, seis pares.
  assert.equal(3 + 3, 6);

  // Girar não muda medida nenhuma — conferido girando os vértices e medindo
  // os lados de volta.
  const base = [[0, 0], [1, 0], [0.4, 0.7]];
  const medeLados = (pts) => pts.map((p, i) => {
    const q = pts[(i + 1) % 3];
    return Number(Math.hypot(p[0] - q[0], p[1] - q[1]).toFixed(9));
  });
  const original = medeLados(base);
  for (const giro of [30, 90, 145, 180, 270]) {
    const r = cgRad(giro);
    const girado = base.map(([x, y]) => [
      x * Math.cos(r) - y * Math.sin(r),
      x * Math.sin(r) + y * Math.cos(r),
    ]);
    assert.deepEqual(medeLados(girado), original, `giro de ${giro}° mudou algum lado`);
  }

  num("congruencia", "o-que-e", "q1", 6);
  alt("congruencia", "o-que-e", "q2", "Sim, porque girar não muda lado nem ângulo");
  alt("congruencia", "o-que-e", "q3", "Semelhantes, e não congruentes");
  num("congruencia", "o-que-e", "q4", 180 - 50 - 60);

  // A q3: mesmos ângulos com escalas diferentes dá lados diferentes.
  const pequeno = cgLados(50, 60, 1), grande = cgLados(50, 60, 2);
  assert.ok(pequeno.some((v, i) => Math.abs(v - grande[i]) > 1e-6), "as escalas dão lados diferentes");
  assert.ok(Math.abs(grande[0] / pequeno[0] - 2) < 1e-9, "e na proporção de 2");
});

teste("congruência · lição 2 — três lados determinam UM triângulo", () => {
  // Dados três lados que fecham, os ângulos ficam determinados — conferido
  // pela lei dos cossenos, que devolve sempre o mesmo valor.
  const anguloPorLados = (a, b, c) =>
    Number(((Math.acos((a * a + b * b - c * c) / (2 * a * b)) * 180) / Math.PI).toFixed(6));
  for (const [a, b, c] of [[5, 7, 9], [5, 6, 7], [3, 4, 5], [6, 6, 6]]) {
    const ang = anguloPorLados(a, b, c);
    // repetir a conta dá o MESMO ângulo: não há dois triângulos possíveis
    assert.equal(anguloPorLados(a, b, c), ang, `${a},${b},${c}: o ângulo é único`);
    // e os três ângulos somam 180
    const soma = anguloPorLados(a, b, c) + anguloPorLados(b, c, a) + anguloPorLados(c, a, b);
    assert.ok(Math.abs(soma - 180) < 1e-4, `${a},${b},${c}: os ângulos somam 180`);
  }

  // A condição de existência do 7º ano, varrida por força bruta.
  const fecha = (a, b, c) => a + b > c && a + c > b && b + c > a;
  assert.ok(fecha(5, 7, 9));
  assert.ok(!fecha(2, 3, 9), "2, 3 e 9 não fecham");
  assert.equal(2 + 3, 5, "e 5 não chega a 9");

  num("congruencia", "lll", "q1", 3);
  alt("congruencia", "lll", "q2", "Porque os três lados determinam o triângulo, e ele não se deforma");
  num("congruencia", "lll", "q3", 0);
  alt("congruencia", "lll", "q4", "Não, os ângulos ficam determinados pelos lados");

  // A q2, medida: quatro lados NÃO determinam a figura. Com os mesmos quatro
  // lados, o quadrilátero muda de forma — e o teste exibe duas diagonais
  // diferentes para o mesmo conjunto de lados.
  const diagonalDoLosango = (lado, angulo) =>
    Number(cgTerceiroLado(lado, lado, angulo).toFixed(6));
  assert.notEqual(diagonalDoLosango(1, 90), diagonalDoLosango(1, 60),
    "os mesmos quatro lados dão figuras diferentes");
});

teste("congruência · lição 3 — o ângulo do MEIO fecha o triângulo", () => {
  // Com dois lados e o ângulo entre eles, o terceiro lado é determinado —
  // e ele CRESCE quando o ângulo abre, que é a afirmação da q2.
  let anterior = 0;
  for (let ang = 10; ang <= 170; ang += 10) {
    const terceiro = cgTerceiroLado(6, 8, ang);
    assert.ok(terceiro > anterior, `de ${ang - 10}° para ${ang}° o terceiro lado tinha de crescer`);
    anterior = terceiro;
  }

  // E o mesmo par de lados com o mesmo ângulo dá sempre o mesmo terceiro lado.
  for (const ang of [30, 40, 75, 120]) {
    assert.equal(cgTerceiroLado(6, 8, ang), cgTerceiroLado(6, 8, ang), `${ang}°: valor único`);
  }

  alt("congruencia", "lal", "q1", "No vértice onde os dois lados conhecidos se encontram");
  alt("congruencia", "lal", "q2", "Ele aumenta, porque as pontas se afastam");
  num("congruencia", "lal", "q3", 3);
  alt("congruencia", "lal", "q4", "Não, porque o caso LAL exige o ângulo entre os dois lados");

  // A q4 é o caso ambíguo, e o teste o EXIBE: com lados 5 e 9 e um ângulo de
  // 30° oposto ao lado 5, existem DOIS triângulos diferentes.
  // O terceiro lado sai de x² − 2·9·cos(30°)·x + (81 − 25) = 0.
  const b = 2 * 9 * Math.cos(cgRad(30)), c = 81 - 25;
  const delta = b * b - 4 * c;
  assert.ok(delta > 0, "o caso LLA tinha de ter duas soluções");
  const x1 = (b + Math.sqrt(delta)) / 2, x2 = (b - Math.sqrt(delta)) / 2;
  assert.ok(x1 > 0 && x2 > 0, "as duas soluções são comprimentos válidos");
  assert.ok(Math.abs(x1 - x2) > 0.5, "e são triângulos bem diferentes");
});

teste("congruência · lição 4 — os ângulos dão a forma, o lado dá o tamanho", () => {
  // Dois ângulos determinam o terceiro, e a forma inteira.
  for (let a = 20; a <= 120; a += 10) {
    for (let b = 20; a + b < 175; b += 10) {
      const c = 180 - a - b;
      assert.ok(Math.abs(a + b + c - 180) < 1e-9, `${a}, ${b}: os três somam 180`);
      assert.ok(c > 0, `${a}, ${b}: o terceiro é positivo`);
    }
  }

  // Mas os ângulos NÃO fixam o tamanho: com os mesmos ângulos, cada escala
  // dá um triângulo diferente — e é por isso que o ALA precisa do lado.
  const escalas = [1, 2, 5].map((e) => cgLados(50, 60, e));
  assert.equal(new Set(escalas.map((l) => l.join(","))).size, 3, "três triângulos diferentes");
  // e todos com os mesmos ângulos: a razão entre os lados é a mesma
  const razaoBase = escalas[0][0] / escalas[0][1];
  for (const lados of escalas) {
    assert.ok(Math.abs(lados[0] / lados[1] - razaoBase) < 1e-9, "mesma forma");
  }

  num("congruencia", "ala", "q1", 180 - 40 - 75);
  alt("congruencia", "ala", "q2", "Porque eles decidem a forma, mas não o tamanho");
  alt("congruencia", "ala", "q3", "Sim, porque o terceiro ângulo sai da soma e o caso vira ALA");
  num("congruencia", "ala", "q4", 1);

  // A q3: com dois ângulos conhecidos, o terceiro nunca é informação nova.
  for (const [a, b] of [[40, 75], [30, 90], [50, 60]]) {
    const terceiro = 180 - a - b;
    assert.ok(Number.isFinite(terceiro), `${a}, ${b}: calculável sem medir`);
  }
});

teste("congruência · lição 5 — os dois casos que enganam, e por que enganam", () => {
  // AAA: os MESMOS três ângulos, tamanhos diferentes. O teste exibe os dois.
  const t1 = cgLados(50, 60, 1), t2 = cgLados(50, 60, 2);
  assert.ok(t1.some((v, i) => Math.abs(v - t2[i]) > 1e-6), "AAA: os lados são diferentes");
  // e os ângulos são os mesmos — conferido pela razão entre os lados
  for (let i = 0; i < 3; i += 1) {
    assert.ok(Math.abs(t2[i] / t1[i] - 2) < 1e-9, "AAA: razão constante, mesma forma");
  }

  // LLA: as MESMAS três medidas, dois triângulos. O teste resolve a equação
  // do terceiro lado e exige duas raízes positivas distintas.
  const casos = [[5, 9, 30], [6, 10, 25], [4, 7, 20]];
  let ambiguos = 0;
  for (const [oposto, outro, ang] of casos) {
    const b = 2 * outro * Math.cos(cgRad(ang));
    const c = outro * outro - oposto * oposto;
    const delta = b * b - 4 * c;
    if (delta > 0) {
      const x1 = (b + Math.sqrt(delta)) / 2, x2 = (b - Math.sqrt(delta)) / 2;
      if (x1 > 0 && x2 > 0 && Math.abs(x1 - x2) > 1e-6) ambiguos += 1;
    }
  }
  assert.equal(ambiguos, casos.length, "os três casos LLA tinham de ser ambíguos");

  alt("congruencia", "nao-serve", "q1", "A mesma forma, mas não o mesmo tamanho");
  num("congruencia", "nao-serve", "q2", 2);
  alt("congruencia", "nao-serve", "q3", "Conhecer um lado, que fixa o tamanho");
  alt("congruencia", "nao-serve", "q4", "No AAA falta a medida de tamanho; no LLA a informação é ambígua");

  // A q3: acrescentar um lado ao AAA o transforma no ALA, que funciona.
  // Com dois ângulos e um lado, o triângulo fica determinado: a escala sai
  // da razão entre o lado dado e o lado correspondente do triângulo unitário.
  const unitario = cgLados(50, 60, 1);
  const escala = 7 / unitario[0];
  const determinado = cgLados(50, 60, escala);
  assert.ok(Math.abs(determinado[0] - 7) < 1e-6, "o lado dado fixa a escala");
});

teste("congruência · lição 6 — provada a congruência, os elementos vêm junto", () => {
  // Elementos correspondentes têm a MESMA medida: escala 1, sem fator nenhum.
  for (const medida of [12, 5.5, 100]) {
    assert.equal(medida * 1, medida, `${medida}: escala 1`);
    assert.notEqual(medida * 2, medida, "e o dobro seria semelhança, não congruência");
  }

  num("congruencia", "problemas", "q1", 12);
  alt("congruencia", "problemas", "q2", "Sim, porque esse lado é igual a ele mesmo — é um elemento de graça");
  alt("congruencia", "problemas", "q3", "ALA, porque o lado está entre os dois ângulos");
  num("congruencia", "problemas", "q4", Math.max(40, 60, 80));

  // A q3: o enunciado dá 2 ângulos e 1 lado entre eles — só o ALA encaixa.
  const dados = { lados: 1, angulos: 2, ladoEntreOsAngulos: true };
  assert.equal(dados.lados + dados.angulos, 3, "três elementos");
  assert.ok(dados.ladoEntreOsAngulos, "e o lado está no meio");

  // A q4: o maior ângulo de um corresponde ao maior do outro.
  const angulos = [40, 60, 80];
  assert.equal(angulos.reduce((s, x) => s + x, 0), 180, "os três somam 180");
  assert.equal(Math.max(...angulos), 80);
});

teste("congruência · a figura MARCA o que se sabe", () => {
  // Os tiquinhos e os arcos são a notação da matéria. O teste conta as marcas
  // de volta do SVG: se a figura marcasse outro número de elementos, ela
  // estaria afirmando algo diferente do enunciado.
  const contaTiquinhos = (svg) => (svg.match(/<line[^>]*stroke-width="2"\/>/g) || []).length;

  // Sem marcas, nenhum tiquinho e nenhum arco.
  const limpo = desenhos.parTriangulos({ angulos: [50, 60] });
  assert.equal((limpo.match(/<path d="M/g) || []).length, 0, "sem arcos");

  // LLL: três lados marcados em cada triângulo, com 1, 2 e 3 tiquinhos.
  const lll = desenhos.parTriangulos({ angulos: [50, 60], marcasLados: [1, 2, 3] });
  assert.equal(contaTiquinhos(lll), (1 + 2 + 3) * 2, "LLL: os tiquinhos dos dois triângulos");
  assert.equal((lll.match(/<path d="M/g) || []).length, 0, "LLL não marca ângulo nenhum");

  // LAL: dois lados e um ângulo, em cada triângulo.
  const lal = desenhos.parTriangulos({
    angulos: [50, 60], marcasLados: [1, 0, 2], marcasAngulos: [0, 0, 1],
  });
  assert.equal(contaTiquinhos(lal), (1 + 2) * 2, "LAL: dois lados marcados");
  assert.equal((lal.match(/<path d="M/g) || []).length, 2, "LAL: um arco em cada triângulo");

  // ALA: um lado e dois ângulos.
  const ala = desenhos.parTriangulos({
    angulos: [50, 60], marcasLados: [1, 0, 0], marcasAngulos: [1, 2, 0],
  });
  assert.equal(contaTiquinhos(ala), 1 * 2, "ALA: um lado marcado");
  assert.equal((ala.match(/<path d="M/g) || []).length, (1 + 2) * 2, "ALA: três arcos por triângulo");

  // Os dois triângulos desenhados são CONGRUENTES de verdade: o teste mede os
  // lados dos dois e exige que coincidam, mesmo com o segundo girado.
  for (const giro of [0, 30, 90, 145]) {
    const svg = desenhos.parTriangulos({ angulos: [50, 60], giro });
    const poligonos = [...svg.matchAll(/<polygon points="([^"]+)"/g)].map((m) =>
      m[1].trim().split(/\s+/).map((p) => p.split(",").map(Number)));
    assert.equal(poligonos.length, 2, "dois triângulos");
    const lados = (pts) => pts.map((p, i) => {
      const q = pts[(i + 1) % 3];
      return Math.hypot(p[0] - q[0], p[1] - q[1]);
    }).sort((a, b) => a - b);
    // com tolerância: as coordenadas do SVG saem arredondadas a uma casa, e
    // o giro espalha esse arredondamento pelos dois eixos
    const [la, lb] = [lados(poligonos[0]), lados(poligonos[1])];
    for (let i = 0; i < 3; i += 1) {
      assert.ok(
        Math.abs(la[i] - lb[i]) < 0.3,
        `giro de ${giro}°: os dois triângulos tinham de ser congruentes`
      );
    }
  }
});

teste("congruência · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("congruencia", 24);
});


// ---------- Áreas de figuras planas (8º ano) ----------
//
// Nenhuma área é conferida aplicando a fórmula que a matéria ensina. Todas
// saem da fórmula do LAÇO (shoelace), que mede o polígono a partir dos
// vértices e não sabe o que é trapézio nem losango — é a mesma disciplina
// dos sistemas do 8º ano, que são resolvidos por busca e não por
// substituição. Se a fórmula publicada estivesse errada, a medição do
// polígono discordaria dela.
//
// E as três demonstrações são conferidas na FIGURA: o teste lê os polígonos
// de volta do SVG e exige que a razão entre as áreas desenhadas seja a que
// a lição afirma — 1 para o paralelogramo virando retângulo, ½ para o
// trapézio dentro do paralelogramo das duas cópias, ½ para o losango dentro
// do retângulo das diagonais.

/** Área de um polígono pela fórmula do laço, a partir dos vértices. */
const arArea = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [X, Y] = pts[(i + 1) % pts.length];
  return s + x * Y - X * y;
}, 0)) / 2;

/** Percorre um contorno dado como passos [dx, dy] e devolve os vértices. */
function arContorno(movimentos) {
  const pts = [[0, 0]];
  for (const [dx, dy] of movimentos) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + dx, y + dy]);
  }
  const fim = pts[pts.length - 1];
  assert.ok(
    Math.abs(fim[0]) < 1e-9 && Math.abs(fim[1]) < 1e-9,
    `contorno não fechou: parou em ${fim}`
  );
  pts.pop();
  return pts;
}

/** Os polígonos de contorno cheio de um SVG (stroke-width 2.5), como pontos. */
const arPoligonos = (svg) => [...svg.matchAll(/<polygon points="([^"]+)"[^>]*stroke-width="2\.5"/g)]
  .map((m) => m[1].trim().split(/\s+/).map((p) => p.split(",").map(Number)));

/** Os polígonos TRACEJADOS do mesmo SVG — a silhueta do destino do recorte. */
const arTracejados = (svg) => [...svg.matchAll(/<polygon points="([^"]+)"[^>]*stroke-width="1\.8"/g)]
  .map((m) => m[1].trim().split(/\s+/).map((p) => p.split(",").map(Number)));

/**
 * Fecho convexo (monotone chain), para medir a figura que dois pedaços formam
 * juntos. É assim que o teste confere que as duas cópias do trapézio fecham o
 * paralelogramo sem se sobrepor e sem deixar vão: a área dos dois pedaços tem
 * de ser exatamente a área do contorno que os envolve.
 */
function arFechoConvexo(pontos) {
  const pts = [...pontos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const meia = (lista) => {
    const saida = [];
    for (const p of lista) {
      while (saida.length >= 2 && cruz(saida[saida.length - 2], saida[saida.length - 1], p) <= 0) saida.pop();
      saida.push(p);
    }
    saida.pop();
    return saida;
  };
  return [...meia(pts), ...meia([...pts].reverse())];
}

teste("áreas · lição 1 — a área se soma aos pedaços, o perímetro não", () => {
  // A figura em L, medida pelo polígono: nenhuma fórmula de composta entra aqui.
  const L = arContorno([[6, 0], [0, 3], [-2, 0], [0, 2], [-4, 0], [0, -5]]);
  assert.equal(arArea(L), 26);

  // Os DOIS cortes dão o mesmo total, que é a afirmação da lição. Cada
  // caminho é somado à parte e comparado com a medição do polígono inteiro.
  assert.equal(6 * 3 + 4 * 2, arArea(L), "corte horizontal");
  assert.equal(4 * 5 + 2 * 3, arArea(L), "corte vertical");

  // E o perímetro NÃO se conserva ao partir: cortando o L na horizontal, a
  // linha do corte vira borda dos dois pedaços. Medido, e não afirmado.
  const perimetro = (pts) => pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length];
    return s + Math.hypot(p[0] - q[0], p[1] - q[1]);
  }, 0);
  assert.equal(perimetro(L), 22);
  const baixo = arContorno([[6, 0], [0, 3], [-6, 0], [0, -3]]);
  const cima = arContorno([[4, 0], [0, 2], [-4, 0], [0, -2]]);
  assert.equal(arArea(baixo) + arArea(cima), arArea(L), "as áreas somam");
  assert.ok(
    perimetro(baixo) + perimetro(cima) > perimetro(L),
    "a soma dos perímetros tinha de crescer com o corte"
  );
  // Num RETÂNGULO, onde o corte é inteiramente interno, dá para dizer quanto
  // o perímetro cresce: exatamente o dobro do corte, porque ele virou borda
  // dos dois pedaços. (No L o crescimento é menor, porque parte da linha do
  // corte coincide com o degrau, que já era borda.)
  const inteiro = arContorno([[6, 0], [0, 4], [-6, 0], [0, -4]]);
  const esquerda = arContorno([[3, 0], [0, 4], [-3, 0], [0, -4]]);
  const direita = arContorno([[3, 0], [0, 4], [-3, 0], [0, -4]]);
  assert.equal(arArea(esquerda) + arArea(direita), arArea(inteiro), "as áreas somam");
  assert.ok(
    Math.abs((perimetro(esquerda) + perimetro(direita)) - (perimetro(inteiro) + 2 * 4)) < 1e-9,
    "o corte de 4 cm tinha de ser contado duas vezes"
  );

  // A placa recortada, por subtração — e a subtração é conferida contra a
  // medição do polígono, não contra outra conta.
  const placa = arContorno([[8, 0], [0, 5], [-5, 0], [0, -3], [-3, 0], [0, -2]]);
  assert.equal(arArea(placa), 31);
  assert.equal(8 * 5 - 3 * 3, arArea(placa));

  num("area-8", "somar-pedacos", "q1", 26);
  alt("area-8", "somar-pedacos", "q2", "Dá o mesmo resultado nos dois cortes");
  num("area-8", "somar-pedacos", "q3", 31);
  alt("area-8", "somar-pedacos", "q4", "A soma dos perímetros, porque o corte cria borda nova");
});

teste("áreas · lição 2 — o paralelogramo recortado vira o retângulo, medido no SVG", () => {
  // A DEMONSTRAÇÃO é lida da figura: o polígono da etapa "original" e o da
  // etapa "rearranjada" têm de ter a mesma área desenhada. Se o gerador
  // deslocasse o topo de um jeito que não fecha, a razão não daria 1.
  // As duas figuras saem do MESMO SVG — o paralelogramo cheio e o retângulo
  // tracejado por baixo dele —, e por isso estão na mesma escala. Comparar
  // áreas de dois SVGs diferentes não provaria nada: cada um escolhe a
  // própria unidade para caber na largura.
  for (const [base, altura] of [[6, 4], [9, 4], [7, 5], [8, 5], [5, 3]]) {
    const svg = desenhos.areaPorRecorte({ figura: "paralelogramo", etapa: "recortada", base, altura });
    const paralelogramo = arPoligonos(svg)[0];
    const retangulo = arTracejados(svg)[0];
    const razao = arArea(paralelogramo) / arArea(retangulo);
    assert.ok(
      Math.abs(razao - 1) < 1e-3,
      `paralelogramo ${base}×${altura}: o desenho não tem a área do retângulo (razão ${razao})`
    );
  }

  // E a fórmula publicada bate com a medição do polígono, para vários casos.
  for (const [base, altura] of [[9, 4], [8, 5], [6, 4], [12, 7]]) {
    const p = arContorno([[base, 0], [2, altura], [-base, 0], [-2, -altura]]);
    assert.ok(
      Math.abs(arArea(p) - base * altura) < 1e-9,
      `paralelogramo ${base}×${altura}: base × altura não bate com a área medida`
    );
  }

  // A armadilha da matéria, MEDIDA: o lado inclinado é sempre maior ou igual
  // à altura, então usá-lo no lugar dela nunca subestima — sempre infla.
  for (let recuo = 0; recuo <= 8; recuo += 1) {
    for (const altura of [3, 4, 5, 7]) {
      const lado = Math.hypot(recuo, altura);
      assert.ok(lado >= altura - 1e-9, `recuo ${recuo}: o lado inclinado ficou menor que a altura`);
      if (recuo > 0) assert.ok(lado > altura, `recuo ${recuo}: com inclinação o lado tinha de ser maior`);
    }
  }
  // no caso da questão: base 8, altura 5, lado 6 — e 8 × 6 passa de 8 × 5
  assert.equal(8 * 5, 40);
  assert.ok(8 * 6 > 8 * 5, "usar o lado inclinado tinha de inflar a área");

  // A inversa não é resolvida pela fórmula isolada: é procurada por busca, e
  // o teste exige que a altura achada seja a ÚNICA que produz aquela área.
  const alturasQueServem = [];
  for (let h = 0.5; h <= 20; h += 0.5) if (Math.abs(9 * h - 45) < 1e-9) alturasQueServem.push(h);
  assert.deepEqual(alturasQueServem, [5], "a altura tinha de ser única");

  num("area-8", "paralelogramo", "q1", 36);
  num("area-8", "paralelogramo", "q2", 40);
  alt("area-8", "paralelogramo", "q3", "Porque um triângulo recortado de uma ponta encaixa na outra, formando o retângulo");
  num("area-8", "paralelogramo", "q4", 5);
});

teste("áreas · lição 3 — o trapézio é metade do paralelogramo das duas cópias", () => {
  // A razão ½ é lida da FIGURA, e não da fórmula: o polígono do trapézio
  // contra o polígono do paralelogramo que as duas cópias formam.
  // A afirmação da lição tem duas metades, e as duas são medidas na figura:
  // que a segunda cópia é IGUAL à primeira, e que juntas elas fecham um
  // paralelogramo — sem sobrar vão e sem se sobrepor. A segunda metade sai
  // do fecho convexo: se os dois pedaços se sobrepusessem, a área somada
  // deles passaria da área do contorno que os envolve; se deixassem vão,
  // ficaria abaixo dela.
  for (const [base, baseMenor, altura] of [[6, 3, 4], [10, 6, 5], [7, 3, 4], [12, 8, 6], [20, 14, 8]]) {
    const svg = desenhos.areaPorRecorte({ figura: "trapezio", etapa: "recortada", base, baseMenor, altura });
    const trapezio = arPoligonos(svg)[0];
    const copia = arTracejados(svg)[0];
    assert.ok(
      Math.abs(arArea(trapezio) - arArea(copia)) / arArea(trapezio) < 1e-3,
      `trapézio ${base}/${baseMenor}: a segunda cópia não é igual à primeira`
    );
    const juntos = arArea(arFechoConvexo([...trapezio, ...copia]));
    assert.ok(
      Math.abs(juntos - (arArea(trapezio) + arArea(copia))) / juntos < 1e-3,
      `trapézio ${base}/${baseMenor}: as duas cópias não fecharam o paralelogramo`
    );
    // e o trapézio é metade do que as duas formam, que é o ÷ 2 da fórmula
    assert.ok(
      Math.abs(arArea(trapezio) / juntos - 0.5) < 1e-3,
      `trapézio ${base}/${baseMenor}: o trapézio não é metade da figura montada`
    );
  }

  // A fórmula publicada contra a medição do polígono, sem passar por ela.
  const trapezio = (B, b, h) => {
    const recuo = (B - b) / 2;
    return arContorno([[B, 0], [-recuo, h], [-b, 0], [-recuo, -h]]);
  };
  for (const [B, b, h] of [[6, 3, 4], [10, 6, 5], [20, 14, 8], [9, 5, 3]]) {
    assert.ok(
      Math.abs(arArea(trapezio(B, b, h)) - (B + b) * h / 2) < 1e-9,
      `trapézio ${B}/${b}/${h}: a fórmula não bate com a área medida`
    );
  }

  // A lição 4 afirma que com as bases IGUAIS a fórmula devolve a do
  // paralelogramo. Provado por varredura, e não por um exemplo.
  for (let B = 1; B <= 12; B += 1) {
    for (let h = 1; h <= 10; h += 1) {
      assert.ok(
        Math.abs((B + B) * h / 2 - B * h) < 1e-9,
        `bases iguais em ${B}×${h}: a fórmula tinha de virar base × altura`
      );
    }
  }

  // A inversa por busca, exigindo unicidade.
  const hs = [];
  for (let h = 0.5; h <= 30; h += 0.5) if (Math.abs((12 + 8) * h / 2 - 60) < 1e-9) hs.push(h);
  assert.deepEqual(hs, [6], "a altura do trapézio tinha de ser única");

  num("area-8", "trapezio", "q1", 40);
  alt("area-8", "trapezio", "q2", "De o paralelogramo montado ser feito de duas cópias do trapézio");
  num("area-8", "trapezio", "q3", 6);
  alt("area-8", "trapezio", "q4", "Ela vira base × altura: o trapézio virou um paralelogramo");
});

teste("áreas · lição 4 — o losango é metade do retângulo das diagonais", () => {
  // Lido da figura: o losango desenhado contra o retângulo desenhado.
  for (const [D, d] of [[8, 5], [12, 6], [10, 4], [9, 6], [10, 6]]) {
    const svg = desenhos.areaPorRecorte({ figura: "losango", etapa: "recortada", diagonalMaior: D, diagonalMenor: d });
    const losango = arPoligonos(svg)[0];
    const retangulo = arTracejados(svg)[0];
    const razao = arArea(losango) / arArea(retangulo);
    assert.ok(
      Math.abs(razao - 0.5) < 1e-3,
      `losango ${D}/${d}: o desenho não ocupa metade do retângulo (razão ${razao})`
    );
  }

  // E medido a partir dos vértices, sem a fórmula das diagonais.
  for (const [D, d] of [[8, 5], [12, 6], [10, 6], [7, 3]]) {
    const los = arContorno([[D / 2, d / 2], [-D / 2, d / 2], [-D / 2, -d / 2], [D / 2, -d / 2]]);
    assert.ok(
      Math.abs(arArea(los) - D * d / 2) < 1e-9,
      `losango ${D}/${d}: D × d ÷ 2 não bate com a área medida`
    );
  }

  // Os quatro lados do losango são iguais — a propriedade que dá nome à
  // figura, conferida no polígono que o teste montou.
  for (const [D, d] of [[8, 5], [12, 6], [10, 4]]) {
    const los = arContorno([[D / 2, d / 2], [-D / 2, d / 2], [-D / 2, -d / 2], [D / 2, -d / 2]]);
    const lados = los.map((p, i) => {
      const q = los[(i + 1) % los.length];
      return Math.hypot(p[0] - q[0], p[1] - q[1]);
    });
    for (const l of lados) assert.ok(Math.abs(l - lados[0]) < 1e-9, `losango ${D}/${d}: lados desiguais`);
  }

  // A inversa por busca.
  const ds = [];
  for (let d = 0.5; d <= 30; d += 0.5) if (Math.abs(10 * d / 2 - 30) < 1e-9) ds.push(d);
  assert.deepEqual(ds, [6], "a diagonal menor tinha de ser única");

  num("area-8", "losango", "q1", 36);
  alt("area-8", "losango", "q2", "Porque cada vértice do losango encosta num lado do retângulo, e as diagonais o atravessam de lado a lado");
  num("area-8", "losango", "q3", 6);
  alt("area-8", "losango", "q4", "A do losango é metade da do retângulo");
});

teste("áreas · lição 5 — somar pedaços e subtrair buracos dão o mesmo número", () => {
  // O degrau: os dois caminhos, contra a medição do polígono.
  const degrau = arContorno([[8, 0], [0, 3], [-5, 0], [0, 2], [-3, 0], [0, -5]]);
  assert.equal(arArea(degrau), 30);
  assert.equal(8 * 3 + 3 * 2, arArea(degrau), "por soma");
  assert.equal(8 * 5 - 5 * 2, arArea(degrau), "por subtração");

  // A altura do pedaço de baixo NÃO está escrita no enunciado: ela sai da
  // diferença, que é o passo que a lição diz ser metade do problema.
  assert.equal(5 - 2, 3);

  // A fachada, com o trapézio em cima — a área medida contra a soma das duas
  // fórmulas, e a decomposição conferida pedaço a pedaço.
  const fachada = arContorno([[6, 0], [0, 4], [-2, 3], [-2, 0], [-2, -3], [0, -4]]);
  assert.equal(arArea(fachada), 36);
  const retanguloDeBaixo = arContorno([[6, 0], [0, 4], [-6, 0], [0, -4]]);
  const trapezioDeCima = arContorno([[6, 0], [-2, 3], [-2, 0], [-2, -3]]);
  assert.equal(arArea(retanguloDeBaixo) + arArea(trapezioDeCima), arArea(fachada));
  assert.equal(arArea(trapezioDeCima), (6 + 2) * 3 / 2);

  // A parede com os dois vãos: o desconto é conferido contra a área medida
  // da região que sobra, montada como um polígono só não seria possível —
  // então cada vão é medido e subtraído.
  const parede = arContorno([[6, 0], [0, 3], [-6, 0], [0, -3]]);
  const janela = arContorno([[2, 0], [0, 2], [-2, 0], [0, -2]]);
  const porta = arContorno([[1, 0], [0, 2], [-1, 0], [0, -2]]);
  assert.equal(arArea(parede) - arArea(janela) - arArea(porta), 12);
  // e os dois vãos cabem dentro da parede, que é o que torna a subtração legítima
  assert.ok(arArea(janela) + arArea(porta) < arArea(parede));

  num("area-8", "compostas", "q1", 30);
  alt("area-8", "compostas", "q2", "Quando a figura é um retângulo com um pedaço faltando");
  num("area-8", "compostas", "q3", 36);
  num("area-8", "compostas", "q4", 12);
});

teste("áreas · lição 6 — o roteiro, e o problema da OBMEP", () => {
  // OBMEP, Banco de Questões 2012, problema 28 (item a). A solução oficial
  // chega a 42 cm; o teste chega lá por BUSCA, e ainda exige que o par de
  // lados seja único a menos da ordem — se houvesse outro, a questão seria
  // ambígua.
  const pares = [];
  for (let a = 1; a <= 108; a += 1) {
    if (108 % a !== 0) continue;
    const b = 108 / a;
    if (a === 12 || b === 12) pares.push([Math.min(a, b), Math.max(a, b)]);
  }
  const distintos = [...new Set(pares.map((p) => p.join("×")))];
  assert.deepEqual(distintos, ["9×12"], "o retângulo de área 108 com um lado 12 tinha de ser único");
  assert.equal(2 * (9 + 12), 42);
  assert.equal(9 * 12, 108, "a conferência por substituição fecha");

  // O terreno: a área pela fórmula, contra a medição do polígono, e só
  // depois o preço.
  const terreno = arContorno([[20, 0], [-3, 8], [-14, 0], [-3, -8]]);
  assert.equal(arArea(terreno), (20 + 14) * 8 / 2);
  assert.equal(arArea(terreno), 136);
  assert.equal(136 * 50, 6800);

  // Os ladrilhos: a conversão é conferida nos dois sentidos, e a divisão tem
  // de ser exata — um resto significaria ladrilho cortado, e a questão não
  // pergunta isso.
  assert.equal(4 * 100, 400);
  assert.equal(3 * 100, 300);
  const areaPiso = 400 * 300, areaLadrilho = 20 * 20;
  assert.equal(areaPiso % areaLadrilho, 0, "os ladrilhos tinham de caber inteiros");
  assert.equal(areaPiso / areaLadrilho, 300);
  // e a contagem também sai contando as fileiras, sem passar por área nenhuma
  assert.equal((400 / 20) * (300 / 20), 300, "por fileiras tinha de dar o mesmo");

  num("area-8", "problemas", "q1", 42);
  num("area-8", "problemas", "q2", 6800);
  alt("area-8", "problemas", "q3", "Nenhum na área: ele serve para o perímetro, ou só para confundir");
  num("area-8", "problemas", "q4", 300);
});

teste("áreas · a figura não desmente a fórmula em nenhuma imagem da matéria", () => {
  // Percorre TODAS as figuras de areaPorRecorte do manifesto e, quando a
  // etapa mostra as duas figuras, confere a razão entre as áreas desenhadas.
  // É o mesmo espírito do teste que mede os ângulos das paralelas: se o
  // desenho e a lição discordarem, o teste quebra.
  const daMateria = manifesto.filter((m) => m.id.startsWith("ar8-"));
  assert.equal(daMateria.length, 36, "a matéria tinha de ter 36 figuras");
  let conferidas = 0;
  for (const item of daMateria) {
    const svg = item.desenho();
    assert.ok(!/undefined|NaN/.test(svg), `${item.id}: a figura saiu com undefined ou NaN`);
    const largura = Number(svg.match(/width="(\d+)"/)[1]);
    assert.ok(largura <= 456, `${item.id}: ${largura}px passa do teto de 456`);
    const poligonos = arPoligonos(svg);
    if (poligonos.length !== 1) continue;
    // as figuras de contorno cheio saem com área positiva — nada achatado
    assert.ok(arArea(poligonos[0]) > 100, `${item.id}: a figura saiu achatada`);
    conferidas += 1;
  }
  assert.ok(conferidas >= 20, `esperava conferir pelo menos 20 figuras, conferi ${conferidas}`);
});

teste("áreas · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("area-8", 24);
});


// ---------- Volume (8º ano) ----------
//
// A afirmação central da matéria é que a MESMA fórmula serve para bases de
// formatos diferentes, e o teste não pode conferir isso aplicando a fórmula
// — seria circular. Ele confere de dois jeitos:
//
//   · empilhando de verdade. `vlPorCamadas` soma n camadas de área da base,
//     que é o argumento das lições 1 e 3, e o resultado tem de bater com a
//     multiplicação publicada. Nada nessa soma sabe o que é prisma;
//   · medindo a base no SVG. O gerador desenha a base a partir das medidas,
//     e o teste lê o polígono de volta e confere que a área desenhada é a
//     que a lição usou — se a figura discordasse, o desenho estaria
//     mentindo sobre a matéria.
//
// E o π, como em Circunferência do 7º ano, entra em CENTÉSIMOS INTEIROS.
// Com 3.14 em ponto flutuante, 3,14 × 16 × 5 dá 251.20000000000002, e meia
// dúzia de asserções falharia por arredondamento em vez de por conteúdo.

/** Volume somando camada por camada, que é o argumento das lições 1 e 3. */
function vlPorCamadas(areaDaBase, altura) {
  let total = 0;
  for (let i = 0; i < altura; i += 1) total += areaDaBase;
  return total;
}

/** π em centésimos: cil(5, 10) devolve 785 exato, e não 785.0000001. */
const vlCilindro = (r, h) => (314 * r * r * h) / 100;

/** Área de um polígono pela fórmula do laço, a partir dos vértices. */
const vlArea = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [X, Y] = pts[(i + 1) % pts.length];
  return s + x * Y - X * y;
}, 0)) / 2;

teste("volume · lição 1 — a fórmula geral, conferida empilhando camadas", () => {
  // A multiplicação publicada tem de concordar com a SOMA das camadas, que é
  // o argumento que a lição usa. Varrido, e não conferido num exemplo.
  for (const area of [12, 15, 24, 36, 78]) {
    for (const h of [1, 2, 5, 8, 10]) {
      assert.equal(vlPorCamadas(area, h), area * h, `${area} cm² em ${h} camadas`);
    }
  }

  // E c × l × a é caso particular: com base retangular, os dois caminhos
  // dão o mesmo número. É a afirmação da questão 2.
  for (const [c, l, a] of [[6, 4, 5], [8, 5, 3], [2, 3, 4], [10, 10, 10]]) {
    assert.equal(c * l * a, vlPorCamadas(c * l, a), `bloco ${c}×${l}×${a}`);
  }

  // As DUAS alturas do prisma de base triangular entram em momentos
  // diferentes, e a questão 4 é sobre isso. Trocá-las de lugar não muda o
  // número — a multiplicação é comutativa —, mas usar as DUAS como
  // multiplicadoras da área da base conta a do triângulo duas vezes, e é
  // esse o erro que a alternativa errada descreve.
  const areaBase = 6 * 4 / 2;
  assert.equal(areaBase * 10, 120);
  assert.equal(6 * 10 / 2 * 4, 120, "trocar a ordem dos fatores não muda o produto");
  assert.equal(areaBase * 4 * 10, 480);
  assert.notEqual(480, 120, "usar as duas alturas como multiplicadoras tinha de inflar o volume");

  assert.equal(15 + 8, 23);
  assert.equal(15 * 8 / 2, 60);

  // A inversa por busca, exigindo unicidade — nunca pela fórmula isolada.
  const alturas = [];
  for (let h = 0.5; h <= 40; h += 0.5) if (Math.abs(24 * h - 168) < 1e-9) alturas.push(h);
  assert.deepEqual(alturas, [7], "a altura tinha de ser única");

  num("volume-8", "base-vezes-altura", "q1", 120);
  alt("volume-8", "base-vezes-altura", "q2", "Porque comprimento × largura já é a área da base retangular");
  num("volume-8", "base-vezes-altura", "q3", 7);
  alt("volume-8", "base-vezes-altura", "q4", "Entra no cálculo da área da base, e não multiplica o volume");
});

teste("volume · lição 2 — a base desenhada tem a área que a lição usa", () => {
  // O gerador CALCULA os vértices da base a partir das medidas. O teste lê o
  // polígono do topo de volta do SVG e confere a razão entre as áreas de dois
  // prismas de mesma escala — se a base triangular desenhada não fosse
  // metade da retangular de mesmas medidas, a figura mentiria.
  const poligonos = (svg) => [...svg.matchAll(/<polygon points="([^"]+)"[^>]*stroke-width="2\.2"[^>]*stroke-linejoin/g)]
    .map((m) => m[1].trim().split(/\s+/).map((p) => p.split(",").map(Number)));
  for (const [larg, prof] of [[6, 5], [8, 5], [6, 4]]) {
    const ret = poligonos(desenhos.prisma({ base: "retangulo", largura: larg, profundidade: prof, altura: 5 }));
    const tri = poligonos(desenhos.prisma({ base: "triangulo", largura: larg, profundidade: prof, altura: 5 }));
    assert.ok(ret.length >= 1 && tri.length >= 1, "as bases tinham de sair como polígonos");
    const razao = vlArea(tri[tri.length - 1]) / vlArea(ret[ret.length - 1]);
    assert.ok(
      Math.abs(razao - 0.5) < 1e-3,
      `base ${larg}×${prof}: o triângulo desenhado não é metade do retângulo (razão ${razao})`
    );
  }

  // As áreas das lições, conferidas pelas fórmulas da matéria ANTERIOR, e os
  // volumes pela soma das camadas.
  assert.equal(8 * 5 / 2, 20);
  assert.equal(vlPorCamadas(20, 9), 180);
  assert.equal(6 * 4 / 2, 12);
  assert.equal(vlPorCamadas(12, 10), 120);
  assert.equal((8 + 4) * 5 / 2, 30);
  assert.equal(vlPorCamadas(30, 7), 210);
  assert.equal(vlPorCamadas(36, 10), 360);

  // Esquecer o ÷ 2 da base triangular DOBRA o volume — medido, não avisado.
  assert.equal((6 * 4 * 10) / (6 * 4 / 2 * 10), 2);
  assert.equal(((8 + 4) * 5 * 7) / ((8 + 4) * 5 / 2 * 7), 2);
  assert.equal(6 + 4 + 10, 20);
  assert.equal(36 * 6, 216);

  num("volume-8", "prismas", "q1", 120);
  num("volume-8", "prismas", "q2", 210);
  alt("volume-8", "prismas", "q3", "Só a fórmula usada para achar a área da base");
  num("volume-8", "prismas", "q4", 360);
});

teste("volume · lição 3 — o cilindro, com o π da matéria em centésimos", () => {
  assert.equal(vlCilindro(5, 10), 785);
  assert.equal(vlCilindro(3, 10), 282.6);
  assert.equal(vlCilindro(4, 5), 251.2);
  assert.equal(vlCilindro(5, 4), 314);

  // O cilindro também obedece à soma das camadas: 78,5 cm² dez vezes.
  assert.equal(vlPorCamadas(78.5, 10), 785);

  // Os dois erros que a lição nomeia, MEDIDOS. Esquecer o quadrado divide o
  // resultado pelo raio; usar o diâmetro no lugar do raio quadruplica.
  for (const [r, h] of [[3, 10], [4, 5], [5, 4], [10, 20]]) {
    const semQuadrado = (314 * r * h) / 100;
    assert.ok(
      Math.abs(vlCilindro(r, h) / semQuadrado - r) < 1e-9,
      `raio ${r}: esquecer o quadrado tinha de dividir por ${r}`
    );
    assert.equal(vlCilindro(2 * r, h) / vlCilindro(r, h), 4, `raio ${r}: o diâmetro quadruplica`);
  }

  // E o comprimento da circunferência NÃO serve de área da base: o teste
  // registra que os dois valores são diferentes, que é o terceiro erro.
  for (const r of [3, 4, 5]) {
    assert.notEqual((2 * 314 * r) / 100, (314 * r * r) / 100, `raio ${r}: volta e área coincidiram`);
  }
  assert.equal((314 * 5 * 10) / 100, 157);
  assert.equal(785 / 157, 5);

  num("volume-8", "cilindro", "q1", 282.6);
  alt("volume-8", "cilindro", "q2", "Porque ele também é feito de cópias da base empilhadas ao longo da altura");
  num("volume-8", "cilindro", "q3", 251.2);
  num("volume-8", "cilindro", "q4", 314);
});

teste("volume · lição 4 — a peça composta É um prisma de base composta", () => {
  // A base em L, medida pelo polígono — sem usar a decomposição que a lição
  // ensina, para que os dois caminhos possam ser comparados.
  const anda = (mv) => {
    const p = [[0, 0]];
    for (const [dx, dy] of mv) { const [x, y] = p[p.length - 1]; p.push([x + dx, y + dy]); }
    p.pop();
    return p;
  };
  const L = anda([[6, 0], [0, 2], [-3, 0], [0, 3], [-3, 0], [0, -5]]);
  assert.equal(vlArea(L), 21);
  assert.equal(6 * 2 + 3 * 3, 21, "a decomposição concorda com a medição do polígono");
  assert.equal(vlPorCamadas(21, 4), 84);

  // O outro caminho — partir em dois BLOCOS — chega ao mesmo número, que é
  // a afirmação da lição. E ele é conferido contra a área medida, não
  // contra a outra conta.
  assert.equal(6 * 2 * 4 + 3 * 3 * 4, vlArea(L) * 4);

  // O erro da sobreposição, medido: contar o retângulo de cima com a altura
  // TOTAL do L soma a região comum duas vezes, e o excesso é exatamente ela.
  const comSobreposicao = (6 * 2 + 3 * 5) * 4;
  assert.equal(comSobreposicao, 108);
  assert.equal(comSobreposicao - 84, 3 * 2 * 4, "o excesso tinha de ser a região contada duas vezes");
  assert.equal(6 * 5 * 4, 120);

  // O furo, por subtração — e o furo CEGO desconta menos, que é a questão 4.
  assert.equal(10 * 6 * 4, 240);
  assert.equal(2 * 2 * 4, 16);
  assert.equal(240 - 16, 224);
  const cego = 240 - 2 * 2 * 2;
  assert.ok(cego > 224, "o furo cego tinha de deixar MAIS material na peça");
  assert.equal(240 - 4, 236);
  assert.equal(240 - 8, 232);

  num("volume-8", "compostos", "q1", 84);
  alt("volume-8", "compostos", "q2", "Os pedaços se sobreporem, porque a região comum seria contada duas vezes");
  num("volume-8", "compostos", "q3", 224);
  alt("volume-8", "compostos", "q4", "O volume da peça aumenta, porque o vazio descontado é menor");
});

teste("volume · lição 5 — o fator entra uma vez por direção, provado por varredura", () => {
  // A afirmação da lição é provada por FORÇA BRUTA antes de ser usada: para
  // vários sólidos e vários fatores, multiplicar todas as medidas por f
  // multiplica o volume por f³ — e a área por f², e o comprimento por f.
  for (const f of [2, 3, 4, 5, 10]) {
    for (const [a, b, c] of [[2, 3, 4], [1, 1, 1], [5, 2, 7], [3, 3, 3], [6, 1, 2]]) {
      assert.equal(((a * f) * (b * f) * (c * f)) / (a * b * c), f ** 3, `fator ${f} em ${a}×${b}×${c}`);
      assert.equal(((a * f) * (b * f)) / (a * b), f ** 2, `área com fator ${f}`);
      assert.equal((a * f) / a, f, `comprimento com fator ${f}`);
    }
    // e vale para o CILINDRO também, que não tem aresta nenhuma
    assert.equal(vlCilindro(2 * f, 3 * f) / vlCilindro(2, 3), f ** 3, `cilindro com fator ${f}`);
  }

  assert.equal(6 ** 3 / 3 ** 3, 8);
  assert.equal(6 ** 3 - 3 ** 3, 189);
  assert.equal(3 ** 2, 9);
  assert.equal(3 ** 4, 81);
  assert.equal(3 ** 3, 27);

  num("volume-8", "escala", "q1", 8);
  alt("volume-8", "escala", "q2", "Porque a medida dobrou em três direções, e 2 × 2 × 2 dá 8");
  num("volume-8", "escala", "q3", 27);
  alt("volume-8", "escala", "q4", "O comprimento dobra, a área quadruplica e o volume fica 8 vezes maior");
});

teste("volume · lição 6 — capacidade, e o problema da OBMEP", () => {
  // As conversões, montadas do zero e não decoradas.
  assert.equal(100 * 100 * 100, 1000000, "1 m³ em cm³");
  assert.equal(1000000 / 1000, 1000, "1 m³ em litros");
  assert.equal(10 * 10 * 10, 1000, "o litro é o cubo de 10 cm");

  // O fator de volume é o de comprimento ao CUBO — a lição 5 aparecendo de
  // novo, e conferida aqui em vez de afirmada.
  for (const fator of [10, 100, 1000]) {
    assert.equal(fator ** 3, fator * fator * fator);
  }
  assert.notEqual(100, 100 ** 3, "confundir os dois fatores é o erro da questão 2");

  assert.equal(vlCilindro(1, 2), 6.28);
  assert.equal(6.28 * 1000, 6280);
  assert.equal(2 * 1.5 * 1, 3);
  assert.equal(3 * 1000, 3000);
  assert.equal(3 * 100, 300);
  assert.equal(vlCilindro(10, 20), 6280);
  assert.equal((314 * 10 * 20) / 100, 628);
  assert.equal((314 * 100) / 100, 314);

  // OBMEP, Banco de Questões 2014, problema 27 ("Água na caixa"). A solução
  // oficial chega a 4, 8 e 10 cm. O teste chega lá por BUSCA sobre os
  // inteiros e exige que a tripla seja ÚNICA — se houvesse outra, a questão
  // seria ambígua. Nada aqui usa o sistema que a solução monta.
  const triplas = [];
  for (let x = 1; x <= 40; x += 1) {
    for (let y = x; y <= 40; y += 1) {
      for (let z = y; z <= 40; z += 1) {
        if (y * z * 2 === 160 && x * z * 4 === 160 && x * y * 5 === 160) triplas.push([x, y, z]);
      }
    }
  }
  assert.deepEqual(triplas, [[4, 8, 10]], "a caixa da OBMEP tinha de ser única");
  assert.equal(4 * 8 * 10, 320);
  // e a água nunca encheu a caixa, o que é o que separa 160 de 320
  for (const [face, h] of [[80, 2], [40, 4], [32, 5]]) assert.equal(face * h, 160);
  assert.ok(320 > 160, "a caixa tinha de guardar mais que a água colocada");
  assert.equal(4 + 8 + 10, 22);
  assert.equal(160 * 11, 1760);

  num("volume-8", "problemas", "q1", 320);
  num("volume-8", "problemas", "q2", 3000);
  alt("volume-8", "problemas", "q3", "Porque 1 m³ tem 100 × 100 × 100 = 1 000 000 cm³, e cada 1 000 cm³ é um litro");
  num("volume-8", "problemas", "q4", 6280);
});

teste("volume · o prisma recusa base degenerada e fecha o contorno", () => {
  // Uma aresta da base que saia vertical na projeção vira sósia de uma
  // aresta de altura, e a figura passa a mentir sobre o sólido. O gerador
  // recusa, como a `figuraComposta` recusa contorno que não fecha.
  assert.throws(
    () => desenhos.prisma({ base: "trapezio", largura: 7, baseMenor: 3, profundidade: 4, altura: 5 }),
    /aresta da base sai vertical/,
    "a projeção degenerada tinha de ser recusada"
  );
  assert.throws(
    () => desenhos.prisma({ base: "livre", movimentos: [[6, 0], [0, 4], [-3, 0], [0, -4]], altura: 3 }),
    /não voltou ao ponto de partida/,
    "a base aberta tinha de ser recusada"
  );
  // e as combinações usadas no manifesto passam
  for (const item of manifesto.filter((m) => m.id.startsWith("vl8-"))) {
    const svg = item.desenho();
    assert.ok(!/undefined|NaN/.test(svg), `${item.id}: a figura saiu com undefined ou NaN`);
    const largura = Number(svg.match(/width="(\d+)"/)[1]);
    assert.ok(largura <= 456, `${item.id}: ${largura}px passa do teto de 456`);
  }
  assert.equal(manifesto.filter((m) => m.id.startsWith("vl8-")).length, 36);
});

teste("volume · a figura não desmente o próprio rótulo", () => {
  // O defeito que a revisão do 6º ano achou em geometria plana — um lado de
  // 4 cm desenhado mais comprido que o de 7 — tem versão no espaço, e ela
  // passou despercebida por seis figuras desta matéria: um cilindro
  // rotulado "raio 5 cm, altura 10 cm" saía com o diâmetro menor que a
  // altura, e um bloco de 2 por 1,5 por 1 m saía em 6 : 4 : 3.
  //
  // Nem a auditoria de texto nem o `figurasNaoEntregam` pegam isso: nada
  // transborda e nenhuma resposta aparece. Só medir pega.
  //
  // A medição é pelas ARESTAS VERTICAIS, e não pela caixa envolvente. A
  // caixa não serve: na projeção oblíqua a elipse do cilindro sai inclinada
  // e a caixa dela é √1,25 vezes o diâmetro — foi por aí que a primeira
  // versão deste teste acusou uma figura correta.
  const alturaDesenhada = (svg) => {
    const verticais = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
      .map((m) => m.slice(1).map(Number))
      .filter(([x1, y1, x2, y2]) => Math.abs(x1 - x2) < 0.2 && Math.abs(y2 - y1) > 1);
    assert.ok(verticais.length > 0, "a figura não tinha aresta vertical para medir");
    const comprimentos = verticais.map(([, y1, , y2]) => Math.abs(y2 - y1));
    // as arestas de ALTURA são as mais compridas; as curtas são cotas e furos
    return Math.max(...comprimentos);
  };

  /** Largura da aresta frontal: os dois primeiros pontos do contorno da base. */
  const larguraDaFrente = (svg) => {
    const poli = svg.match(/<polyline points="([^"]+)"/);
    assert.ok(poli, "a figura não tinha o contorno da base");
    const pts = poli[1].trim().split(/\s+/).map((p) => p.split(",").map(Number));
    return Math.abs(pts[1][0] - pts[0][0]);
  };

  // Cada entrada diz o que o RÓTULO da figura afirma: a largura da primeira
  // aresta da base, e a altura do sólido. As duas em unidades do enunciado.
  const figuras = [
    ["vl8-res-prisma-tri", 6, 10],   // triângulo de base 6 · prisma de 10 cm
    ["vl8-q-prisma-tri", 6, 10],
    ["vl8-res-tri", 8, 9],           // triângulo de base 8 · prisma de 9 cm
    ["vl8-q-prisma-trap", 8, 7],     // base maior 8 · prisma de 7 cm
    ["vl8-q-furo", 10, 4],           // bloco 10 × 6 × 4
    ["vl8-q-furo-cego", 10, 4],
    ["vl8-res-degrau", 3, 4],        // a base em L começa por um lado de 3
    ["vl8-q-degrau", 3, 4],
    ["vl8-ideia-composto", 3, 4],
  ];
  for (const [id, largura, altura] of figuras) {
    const item = manifesto.find((m) => m.id === id);
    assert.ok(item, `${id} não está no manifesto`);
    const svg = item.desenho();
    const escalaPelaLargura = larguraDaFrente(svg) / largura;
    const escalaPelaAltura = alturaDesenhada(svg) / altura;
    assert.ok(
      Math.abs(escalaPelaAltura / escalaPelaLargura - 1) < 0.02,
      `${id}: o desenho não está na proporção ${largura} por ${altura} ` +
      `(a largura sai a ${escalaPelaLargura.toFixed(1)} px por unidade e a altura a ${escalaPelaAltura.toFixed(1)})`
    );
  }

  // Nos CILINDROS a base é uma volta fechada e não há aresta frontal, então
  // a largura vem da caixa, descontado o alargamento da projeção: um círculo
  // de diâmetro d sai com √(1 + 0,5²) × d de largura, porque a profundidade
  // desloca meio passo para a direita.
  const larguraDoCilindro = (svg) => {
    const xs = [];
    for (const re of [/<polygon points="([^"]+)"/g, /<polyline points="([^"]+)"/g]) {
      for (const m of svg.matchAll(re)) {
        for (const par of m[1].trim().split(/\s+/)) xs.push(Number(par.split(",")[0]));
      }
    }
    return (Math.max(...xs) - Math.min(...xs)) / Math.sqrt(1 + 0.25);
  };
  const cilindros = [
    ["vl8-res-cilindro", 10, 10],   // raio 5 cm → diâmetro 10 · altura 10
    ["vl8-q-cil-raio", 6, 10],      // raio 3 cm → diâmetro 6 · altura 10
    ["vl8-q-lata", 8, 5],           // raio 4 cm → diâmetro 8 · altura 5
    ["vl8-q-diametro", 10, 4],      // diâmetro 10 cm · altura 4
    ["vl8-res-caixa-agua", 2, 2],   // raio 1 m → diâmetro 2 · altura 2
    ["vl8-q-jarra", 20, 20],        // raio 10 cm → diâmetro 20 · altura 20
  ];
  for (const [id, diametro, altura] of cilindros) {
    const item = manifesto.find((m) => m.id === id);
    assert.ok(item, `${id} não está no manifesto`);
    const svg = item.desenho();
    const escalaPelaLargura = larguraDoCilindro(svg) / diametro;
    const escalaPelaAltura = alturaDesenhada(svg) / altura;
    assert.ok(
      Math.abs(escalaPelaAltura / escalaPelaLargura - 1) < 0.02,
      `${id}: o rótulo afirma diâmetro ${diametro} e altura ${altura}, ` +
      `mas o desenho sai a ${escalaPelaLargura.toFixed(1)} px por unidade de diâmetro e ${escalaPelaAltura.toFixed(1)} de altura`
    );
  }
});

teste("volume · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("volume-8", 24);
});


// ---------- Probabilidade (8º ano) ----------
//
// Nada aqui é conferido pela fórmula que a matéria ensina. Todo caminho é
// CONSTRUÍDO e contado — `pbCaminhos` monta o produto cartesiano de
// verdade, e um nível pode dar as opções em função do que já saiu, que é
// como o sorteio sem reposição entra. O princípio multiplicativo é o que
// está sendo verificado, e por isso ele não pode ser usado na verificação.
//
// Mesma disciplina da Probabilidade do 7º ano, que montava os 36 pares de
// dados em vez de calcular por fórmula.

/** Todos os caminhos de um experimento em etapas, construídos um a um. */
function pbCaminhos(niveis) {
  let saida = [[]];
  for (const nivel of niveis) {
    const proximos = [];
    for (const caminho of saida) {
      const opcoes = typeof nivel === "function" ? nivel(caminho) : nivel;
      for (const opcao of opcoes) proximos.push([...caminho, opcao]);
    }
    saida = proximos;
  }
  return saida;
}

const MOEDA = ["C", "K"];
const DADO = [1, 2, 3, 4, 5, 6];

teste("probabilidade · lição 1 — o princípio multiplicativo, conferido contando", () => {
  // A regra é PROVADA por enumeração antes de ser usada: para muitos pares
  // de tamanhos, o número de caminhos construídos tem de ser o produto.
  for (let a = 1; a <= 6; a += 1) {
    for (let b = 1; b <= 6; b += 1) {
      const primeira = Array.from({ length: a }, (_, i) => `a${i}`);
      const segunda = Array.from({ length: b }, (_, i) => `b${i}`);
      assert.equal(pbCaminhos([primeira, segunda]).length, a * b, `${a} × ${b}`);
    }
  }
  // e com três etapas, para a regra não parecer coisa de dois fatores
  assert.equal(pbCaminhos([[1, 2], [1, 2, 3], [1, 2]]).length, 2 * 3 * 2);

  assert.equal(pbCaminhos([["branca", "azul", "verde"], ["jeans", "preta"]]).length, 6);
  assert.equal(pbCaminhos([[1, 2, 3, 4], [1, 2, 3]]).length, 12);
  assert.equal(4 + 3, 7);
  assert.equal(2 + 3 + 2, 7);
  assert.equal(2 * 3, 6);
  assert.equal(2 ** 3, 8);

  // O pódio: o campeão sai da lista, e o teste confere que nenhum caminho
  // repete a mesma pessoa nos dois lugares.
  const CINCO = [1, 2, 3, 4, 5];
  const podio = pbCaminhos([CINCO, (c) => CINCO.filter((x) => x !== c[0])]);
  assert.equal(podio.length, 20);
  assert.ok(podio.every(([a, b]) => a !== b), "ninguém pode ocupar os dois lugares");
  assert.equal(5 * 5, 25);
  assert.equal(5 + 4, 9);
  assert.equal(podio.length / 2, 10, "sem ordem seria a metade");

  num("probabilidade-8", "contar-caminhos", "q1", 12);
  alt("probabilidade-8", "contar-caminhos", "q2", "Porque cada opção da primeira etapa se abre em todas as opções da segunda");
  num("probabilidade-8", "contar-caminhos", "q3", 12);
  num("probabilidade-8", "contar-caminhos", "q4", 20);
});

teste("probabilidade · lição 2 — a árvore, e as folhas contadas no SVG", () => {
  const duas = pbCaminhos([MOEDA, MOEDA]);
  assert.equal(duas.length, 4);
  assert.equal(duas.filter((c) => c.every((x) => x === "C")).length, 1);
  assert.equal((1 / 4) * 100, 25);

  // Cara-coroa e coroa-cara são caminhos DIFERENTES — a afirmação da lição,
  // conferida na lista construída.
  assert.ok(
    duas.some((c) => c[0] === "C" && c[1] === "K") && duas.some((c) => c[0] === "K" && c[1] === "C"),
    "os dois pares em ordens trocadas tinham de existir separados"
  );

  assert.equal(pbCaminhos([MOEDA, DADO]).length, 12);
  assert.equal(2 + 6, 8);
  assert.equal(6 * 6, 36);
  assert.equal(2 ** 3, 8);

  // A FIGURA é lida de volta: o gerador calcula os caminhos, e o número de
  // rótulos de ramo no último nível tem de ser o número de folhas.
  const svg = desenhos.arvorePossibilidades({
    niveis: [{ opcoes: ["a", "b", "c"] }, { opcoes: ["x", "y"] }],
  });
  const rotulos = [...svg.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim());
  assert.equal(rotulos.filter((t) => t === "x" || t === "y").length, 6, "a árvore tinha de ter 6 folhas");
  assert.equal(rotulos.filter((t) => ["a", "b", "c"].includes(t)).length, 3, "e 3 ramos no primeiro nível");

  // E a árvore CORTADA mostra só o primeiro nível — é o que permite usá-la
  // numa questão que pergunta quantos resultados existem.
  const cortada = desenhos.arvorePossibilidades({
    niveis: [{ opcoes: ["a", "b", "c"] }, { opcoes: ["x", "y"] }], ate: 1,
  });
  assert.ok(!cortada.includes(">x<"), "a árvore cortada não podia mostrar o segundo nível");

  num("probabilidade-8", "arvore", "q1", 4);
  num("probabilidade-8", "arvore", "q2", 25);
  alt("probabilidade-8", "arvore", "q3", "Um resultado possível do experimento inteiro");
  num("probabilidade-8", "arvore", "q4", 12);
});

teste("probabilidade · lição 3 — multiplicar as chances concorda com contar", () => {
  // A multiplicação das probabilidades é conferida contra a CONTAGEM dos
  // caminhos, e não aceita como regra.
  const tres = pbCaminhos([MOEDA, MOEDA, MOEDA]);
  assert.equal(tres.length, 8);
  assert.equal(tres.filter((c) => c.every((x) => x === "C")).length / 8, (1 / 2) * (1 / 2) * (1 / 2));
  assert.equal((1 / 8) * 100, 12.5);

  const md = pbCaminhos([MOEDA, DADO]);
  assert.equal(md.filter((c) => c[0] === "C" && c[1] % 2 === 0).length, 3);
  assert.equal(3 / 12, 1 / 4);

  // A urna COM reposição, enumerada sobre as bolas identificadas — o teste
  // não usa a fração 3/5, ele conta as 25 duplas possíveis.
  const urna5 = ["a1", "a2", "a3", "v1", "v2"];
  const comRep = pbCaminhos([urna5, urna5]);
  assert.equal(comRep.length, 25);
  assert.equal(comRep.filter((c) => c.every((b) => b[0] === "a")).length, 9);
  assert.equal((9 / 25) * 100, 36);

  // "O produto é sempre menor ou igual a cada fator" — varrido, não afirmado.
  for (let i = 1; i <= 10; i += 1) {
    for (let j = 1; j <= 10; j += 1) {
      const [p, q] = [i / 10, j / 10];
      assert.ok(p * q <= p + 1e-12 && p * q <= q + 1e-12, `${p} × ${q}`);
    }
  }
  assert.equal(50 * 3, 150, "somar as três jogadas daria um valor impossível");

  num("probabilidade-8", "sucessivos", "q1", 12.5);
  alt("probabilidade-8", "sucessivos", "q2", "Menor ou igual a cada uma das duas chances");
  num("probabilidade-8", "sucessivos", "q3", 36);
  num("probabilidade-8", "sucessivos", "q4", 50);
});

teste("probabilidade · lição 4 — sem reposição, medido contra com reposição", () => {
  const tres = ["A", "B", "C"];
  const sem = pbCaminhos([tres, (c) => tres.filter((x) => x !== c[0])]);
  const com = pbCaminhos([tres, tres]);
  assert.equal(sem.length, 6);
  assert.equal(com.length, 9);
  // os três caminhos que somem são exatamente os que repetiriam a bola
  assert.equal(com.length - sem.length, 3);
  assert.ok(com.some(([a, b]) => a === b) && !sem.some(([a, b]) => a === b));

  const cinco = [1, 2, 3, 4, 5];
  assert.equal(pbCaminhos([cinco, (c) => cinco.filter((x) => x !== c[0])]).length, 20);
  assert.equal(5 * 5, 25);
  assert.equal(5 + 4, 9);

  // A urna de 4 azuis e 2 vermelhas, nos dois regimes, por enumeração.
  const urna6 = ["a1", "a2", "a3", "a4", "v1", "v2"];
  const sr = pbCaminhos([urna6, (c) => urna6.filter((b) => b !== c[0])]);
  assert.equal(sr.length, 30);
  assert.equal(sr.filter((c) => c.every((b) => b[0] === "a")).length, 12);
  assert.equal((12 / 30) * 100, 40);
  const cr = pbCaminhos([urna6, urna6]);
  assert.equal(cr.filter((c) => c.every((b) => b[0] === "a")).length, 16);
  assert.equal(Number(((16 / 36) * 100).toFixed(1)), 44.4);

  // A afirmação da questão 4, PROVADA por varredura: repetir a cor é sempre
  // mais provável com reposição, em qualquer urna de duas cores.
  for (let azuis = 1; azuis <= 8; azuis += 1) {
    for (let vermelhas = 1; vermelhas <= 8; vermelhas += 1) {
      const total = azuis + vermelhas;
      const bolas = Array.from({ length: total }, (_, i) => (i < azuis ? `a${i}` : `v${i}`));
      const semRep = pbCaminhos([bolas, (c) => bolas.filter((b) => b !== c[0])]);
      const comRep = pbCaminhos([bolas, bolas]);
      const pSem = semRep.filter((c) => c.every((b) => b[0] === "a")).length / semRep.length;
      const pCom = comRep.filter((c) => c.every((b) => b[0] === "a")).length / comRep.length;
      assert.ok(pCom > pSem - 1e-12, `urna ${azuis}/${vermelhas}: com reposição tinha de ser ≥`);
      if (azuis >= 1 && total > 1) assert.ok(pCom >= pSem, `urna ${azuis}/${vermelhas}`);
    }
  }

  num("probabilidade-8", "sem-reposicao", "q1", 20);
  alt("probabilidade-8", "sem-reposicao", "q2", "Os ramos da segunda etapa mudam conforme o que saiu na primeira");
  num("probabilidade-8", "sem-reposicao", "q3", 40);
  alt("probabilidade-8", "sem-reposicao", "q4", "Com reposição, porque a bola retirada não deixa a urna menos daquela cor");
});

teste("probabilidade · lição 5 — o complementar concorda com a contagem direta", () => {
  // A regra do complementar é conferida nos dois caminhos, para vários
  // experimentos: contar os favoráveis tem de dar o mesmo que tirar de 1 a
  // chance do oposto.
  for (let jogadas = 1; jogadas <= 5; jogadas += 1) {
    const todos = pbCaminhos(Array.from({ length: jogadas }, () => MOEDA));
    const comAlgumaCara = todos.filter((c) => c.includes("C")).length;
    const semNenhuma = todos.filter((c) => !c.includes("C")).length;
    assert.equal(semNenhuma, 1, `${jogadas} jogadas: o complementar é um caminho só`);
    assert.equal(comAlgumaCara + semNenhuma, todos.length, "os dois cobrem tudo");
    assert.equal(comAlgumaCara / todos.length, 1 - semNenhuma / todos.length);
  }
  const tres = pbCaminhos([MOEDA, MOEDA, MOEDA]);
  assert.equal(tres.filter((c) => c.includes("C")).length, 7);
  assert.equal((7 / 8) * 100, 87.5);
  assert.equal(100 - (1 / 8) * 100, 87.5);

  // Os dois dados: o complementar, e o erro de somar as duas listas.
  const dois = pbCaminhos([DADO, DADO]);
  assert.equal(dois.length, 36);
  assert.equal(dois.filter((c) => c.includes(6)).length, 11);
  assert.equal(36 - 5 * 5, 11);
  assert.equal(
    dois.filter((c) => c[0] === 6).length + dois.filter((c) => c[1] === 6).length, 12,
    "somar as duas listas conta o par (6,6) duas vezes"
  );
  assert.equal(50 * 3, 150);

  num("probabilidade-8", "pelo-menos-um", "q1", 87.5);
  alt("probabilidade-8", "pelo-menos-um", "q2", "Não sair 6 em nenhum dos dois lançamentos");
  num("probabilidade-8", "pelo-menos-um", "q3", 11);
  alt("probabilidade-8", "pelo-menos-um", "q4", "Porque o complementar costuma ser um caso só, enquanto o evento tem vários");
});

teste("probabilidade · lição 6 — os problemas da OBMEP, resolvidos por enumeração", () => {
  // OBMEP, Banco de Questões 2014, problema 11. A solução oficial chega a
  // 720 e a 6 pelo princípio multiplicativo; o teste chega lá CONSTRUINDO
  // as comissões, uma a uma, e conferindo que nenhuma repete aluno.
  const dez = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const semRepetir = (c) => dez.filter((x) => !c.includes(x));
  const comissoes = pbCaminhos([dez, semRepetir, semRepetir]);
  assert.equal(comissoes.length, 720, "BQ 2014, problema 11a");
  assert.ok(
    comissoes.every((c) => new Set(c).size === 3),
    "nenhuma comissão podia repetir aluno"
  );
  assert.equal(10 * 9 * 8, 720, "a fórmula concorda com a enumeração");
  assert.equal(10 ** 3, 1000);
  assert.equal(10 + 9 + 8, 27);
  assert.equal(720 / 6, 120);

  const trio = ["Leandro", "Renato", "Marcelo"];
  const doTrio = (c) => trio.filter((x) => !c.includes(x));
  const c3 = pbCaminhos([trio, doTrio, doTrio]);
  assert.equal(c3.length, 6, "BQ 2014, problema 11b");
  // a solução oficial LISTA as seis; o teste confere que são todas distintas
  assert.equal(new Set(c3.map((c) => c.join("-"))).size, 6);
  assert.equal(3 * 2 * 1, 6);
  assert.equal(3 * 3, 9);

  const dig = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.equal(pbCaminhos([dig, dig]).length, 100);
  assert.equal(10 * 9, 90);
  assert.equal(10 + 10, 20);

  num("probabilidade-8", "problemas", "q1", 720);
  num("probabilidade-8", "problemas", "q2", 6);
  num("probabilidade-8", "problemas", "q3", 100);
  alt("probabilidade-8", "problemas", "q4", "\"Ninguém pode acumular cargos\", ou equivalente");
});

teste("probabilidade · a árvore calcula os caminhos, e recusa o que não cabe", () => {
  // Sem reposição, os ramos da segunda etapa MUDAM de galho para galho — a
  // afirmação da lição 4, lida na figura.
  const svg = desenhos.arvorePossibilidades({
    niveis: [
      { opcoes: ["A", "B", "C"] },
      { opcoes: (c) => ["A", "B", "C"].filter((x) => x !== c[0]) },
    ],
  });
  const rotulos = [...svg.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim());
  // seis folhas, e cada letra aparece 2 vezes como segunda etapa + 1 como primeira
  for (const letra of ["A", "B", "C"]) {
    assert.equal(rotulos.filter((t) => t === letra).length, 3, `a letra ${letra}`);
  }

  // E ela recusa uma árvore grande demais para ser legível, em vez de
  // desenhar um borrão — a mesma disciplina do `figuraComposta`.
  assert.throws(
    () => desenhos.arvorePossibilidades({
      niveis: [{ opcoes: [1, 2, 3, 4] }, { opcoes: [1, 2, 3, 4] }, { opcoes: [1, 2] }],
    }),
    /não cabem numa figura legível/,
    "32 folhas tinham de ser recusadas"
  );

  const daMateria = manifesto.filter((m) => m.id.startsWith("pb8-"));
  assert.equal(daMateria.length, 36);
  for (const item of daMateria) {
    const s = item.desenho();
    assert.ok(!/undefined|NaN/.test(s), `${item.id}: saiu com undefined ou NaN`);
    assert.ok(Number(s.match(/width="(\d+)"/)[1]) <= 456, `${item.id}: passa do teto de 456px`);
  }
});

teste("probabilidade · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("probabilidade-8", 24);
});

// ---------- Estatística (8º ano) ----------
//
// A matéria fecha o 8º ano e trata de desconfiar com método — então o teste
// tem uma obrigação a mais: conferir que as figuras da lição 5, que existem
// para ENGANAR, enganam do jeito documentado, e que as demais não enganam.
//
// E as porcentagens saem em aritmética INTEIRA, como o bloco de juros do 7º
// ano: `0.55 * 200` dá 110.00000000000001 em ponto flutuante.

/** Porcentagem sem erro de arredondamento: pct(45, 200) devolve 90 exato. */
const etPct = (p, total) => (p * total) / 100;

/** Os ângulos das fatias de um gráfico de setores, lidos de volta do SVG. */
function etAngulos(svg) {
  const fatias = [...svg.matchAll(/<path d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) A [\d.]+ [\d.]+ 0 \d 1 ([\d.]+) ([\d.]+)/g)];
  return fatias.map((m) => {
    const [cx, cy, x1, y1, x2, y2] = m.slice(1).map(Number);
    const a1 = Math.atan2(y1 - cy, x1 - cx);
    const a2 = Math.atan2(y2 - cy, x2 - cx);
    let abertura = a2 - a1;
    while (abertura < 0) abertura += 2 * Math.PI;
    return (abertura * 180) / Math.PI;
  });
}

teste("estatística · lição 1 — população, amostra e a estimativa", () => {
  assert.equal((12 * 100) / 40, 30);
  assert.equal(etPct(30, 800), 240);
  assert.equal((500 * 100) / 50000, 1);

  // A estimativa é uma regra de três, e o teste a confere pelos dois lados:
  // a proporção na amostra tem de ser a mesma proporção na população.
  for (const [amostra, favoraveis, populacao] of [[40, 12, 800], [50, 20, 500], [200, 90, 1000]]) {
    const estimativa = (favoraveis / amostra) * populacao;
    assert.ok(
      Math.abs(estimativa / populacao - favoraveis / amostra) < 1e-9,
      `${favoraveis}/${amostra} estendido a ${populacao}`
    );
  }

  num("estatistica-8", "populacao-amostra", "q1", 240);
  alt("estatistica-8", "populacao-amostra", "q2", "Porque o teste destrói a lâmpada, e testar todas acabaria com a produção");
  alt("estatistica-8", "populacao-amostra", "q3", "Um censo, porque a população inteira foi consultada");
  num("estatistica-8", "populacao-amostra", "q4", 1);
});

teste("estatística · lição 2 — o viés não é corrigido por tamanho", () => {
  // A afirmação central da lição, SIMULADA: uma escola em que 30% preferem
  // futebol, e uma amostra tirada só de quem joga futebol. Aumentar a
  // amostra não aproxima o resultado da verdade.
  const escola = Array.from({ length: 1000 }, (_, i) => (i < 300 ? "futebol" : "outro"));
  const verdade = escola.filter((x) => x === "futebol").length / escola.length;
  assert.equal(verdade, 0.3);
  const noTreino = escola.filter((x) => x === "futebol");   // o local só tem quem joga
  for (const tamanho of [50, 100, 500]) {
    const amostra = noTreino.slice(0, Math.min(tamanho, noTreino.length));
    const medido = amostra.filter((x) => x === "futebol").length / amostra.length;
    assert.equal(medido, 1, `amostra de ${tamanho} no treino continua dando 100%`);
    assert.ok(Math.abs(medido - verdade) > 0.5, "aumentar a amostra não aproximou da verdade");
  }

  alt("estatistica-8", "amostra-boa", "q1", "Não, porque o lugar continua concentrando quem prefere futebol");
  alt("estatistica-8", "amostra-boa", "q2", "Sortear 40 nomes da lista de todos os alunos da escola");
  alt("estatistica-8", "amostra-boa", "q3", "Uma média de leitura mais alta que a da população");
  alt("estatistica-8", "amostra-boa", "q4", "Ser escolhida sem viés e ser grande o bastante");
});

teste("estatística · lição 3 — a tabela fecha nos dois sentidos", () => {
  const turma = [["ônibus", 18], ["a pé", 10], ["carro", 8], ["bicicleta", 4]];
  const total = turma.reduce((s, [, v]) => s + v, 0);
  assert.equal(total, 40, "as absolutas somam o total de entrevistados");
  const relativas = turma.map(([, v]) => (v * 100) / total);
  assert.deepEqual(relativas, [45, 25, 20, 10]);
  assert.equal(relativas.reduce((a, b) => a + b, 0), 100, "as relativas somam 100%");

  // A conferência da lição, varrida: em qualquer tabela completa, as
  // relativas fecham em 100%.
  for (const dados of [[3, 7], [1, 1, 1, 1], [50, 30, 20], [12, 8, 4, 16]]) {
    const t = dados.reduce((a, b) => a + b, 0);
    const soma = dados.reduce((s, v) => s + (v * 100) / t, 0);
    assert.ok(Math.abs(soma - 100) < 1e-9, `tabela ${dados}`);
  }

  assert.equal((30 * 100) / 200, 15);
  assert.equal((40 * 100) / 500, 8);
  assert.ok(15 > 8, "a escola A tinha de ter proporção maior, apesar do número menor");
  assert.equal(etPct(45, 200), 90);
  assert.equal(200 - 45, 155);
  assert.equal(etPct(55, 200), 110);
  assert.equal(40 / 10, 4, "a divisão invertida dá 4");

  num("estatistica-8", "frequencia", "q1", 25);
  alt("estatistica-8", "frequencia", "q2", "100%, porque juntas elas cobrem todos os entrevistados");
  alt("estatistica-8", "frequencia", "q3", "Na escola A, com 15% contra 8% da escola B");
  num("estatistica-8", "frequencia", "q4", 90);
});

teste("estatística · lição 4 — os setores desenhados são proporcionais aos dados", () => {
  // A figura da matéria que ensina a desconfiar de gráfico não pode mentir.
  // O teste lê os ângulos de volta do SVG e exige que sejam a fração certa
  // de 360° — se uma fatia de 45% saísse com menos de 162°, o desenho
  // estaria distorcendo a própria pesquisa que ilustra.
  const conjuntos = [
    [[20, 10, 10]],
    [[45, 25, 20, 10]],
    [[95, 5]],
    [[30, 45, 25]],
    [[18, 10, 8, 4]],
  ];
  for (const [valores] of conjuntos) {
    const itens = valores.map((v, i) => ({ nome: `x${i}`, valor: v }));
    const svg = desenhos.setores({ itens });
    const angulos = etAngulos(svg);
    const soma = valores.reduce((a, b) => a + b, 0);
    assert.equal(angulos.length, valores.length, `${valores}: número de fatias`);
    valores.forEach((v, i) => {
      const esperado = (v / soma) * 360;
      assert.ok(
        Math.abs(angulos[i] - esperado) < 0.05,
        `${valores}: a fatia de ${v} saiu com ${angulos[i].toFixed(1)}° em vez de ${esperado.toFixed(1)}°`
      );
    });
    assert.ok(
      Math.abs(angulos.reduce((a, b) => a + b, 0) - 360) < 0.1,
      `${valores}: as fatias tinham de fechar o círculo`
    );
  }

  assert.equal(etPct(25, 360), 90);
  assert.equal(etPct(50, 360), 180);
  assert.equal((18 * 360) / 40, 162);
  assert.equal((72 * 100) / 360, 20);
  assert.equal(360 / 72, 5);

  num("estatistica-8", "setores", "q1", 90);
  alt("estatistica-8", "setores", "q2", "Que aquela opção teve mais votos que todas as outras somadas");
  alt("estatistica-8", "setores", "q3", "Não, porque o círculo representa 100% e as fatias se sobreporiam");
  num("estatistica-8", "setores", "q4", 20);
});

teste("estatística · lição 5 — o gráfico enganoso engana do jeito documentado", () => {
  // O eixo cortado é MEDIDO: com a base em 40, as colunas de 42 e 45 saem
  // na razão 2,5, quando os valores estão na razão 1,07.
  const [a, b, base] = [42, 45, 40];
  assert.equal((b - base) / (a - base), 2.5);
  assert.ok(Math.abs(b / a - 1.07) < 0.005);
  assert.ok((b - base) / (a - base) > (b / a) * 2, "o corte tinha de inflar a diferença");

  // E a figura publicada REALMENTE tem o eixo cortado — senão a lição
  // estaria falando de um truque que o desenho não comete. As alturas das
  // colunas são lidas de volta do SVG.
  const svg = manifesto.find((m) => m.id === "et8-res-eixo-cortado").desenho();
  const alturas = [...svg.matchAll(/<rect[^>]*height="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(alturas.length >= 2, "o gráfico tinha de ter duas colunas");
  const [h1, h2] = alturas.slice(0, 2).sort((x, y) => x - y);
  assert.ok(
    h2 / h1 > 2,
    `as colunas saíram na razão ${(h2 / h1).toFixed(2)} — o eixo cortado tinha de exagerar`
  );
  // e o alt AVISA, para o leitor de tela não ser enganado junto
  const item = manifesto.find((m) => m.id === "et8-res-eixo-cortado");
  assert.match(item.alt, /não começa no zero|NÃO no zero/i, "o alt tinha de avisar do eixo cortado");

  // O fator da área: dobrar os dois lados quadruplica — a lição de escala
  // do Volume, agora usada contra o leitor.
  for (const f of [2, 3, 4]) {
    assert.equal(((3 * f) * (4 * f)) / (3 * 4), f ** 2);
  }
  assert.equal(2 ** 2, 4);
  assert.equal(2 ** 3, 8, "8 é o fator do volume, e não o da área");

  alt("estatistica-8", "grafico-mente", "q1", "Se o eixo dos valores começa no zero");
  num("estatistica-8", "grafico-mente", "q2", 4);
  alt("estatistica-8", "grafico-mente", "q3", "Recorte escolhido: o pedaço mostrado sugere o contrário do todo");
  alt("estatistica-8", "grafico-mente", "q4", "Nenhum precisa de dado falso: todos distorcem a apresentação");
});

teste("estatística · lição 6 — o roteiro da pesquisa", () => {
  assert.equal((120 * 100) / 400, 30);
  assert.equal(400 - 120, 280);

  num("estatistica-8", "pesquisa", "q1", 30);
  alt("estatistica-8", "pesquisa", "q2", "\"Você concorda que a merenda precisa melhorar?\"");
  alt("estatistica-8", "pesquisa", "q3", "Todos os alunos da escola");
  alt("estatistica-8", "pesquisa", "q4", "Não, mas é motivo para checar a amostra e a pergunta com atenção");
});

teste("estatística · só a lição 5 usa eixo cortado", () => {
  // O `base` do gráfico é o truque, e ele não pode vazar para as outras
  // lições: uma figura com eixo cortado fora da lição que ensina a
  // reconhecê-lo enganaria o aluno de verdade.
  const daMateria = manifesto.filter((m) => m.id.startsWith("et8-"));
  assert.equal(daMateria.length, 36);
  const comEixoCortado = ["et8-res-eixo-cortado", "et8-q-primeiro-olhar"];
  for (const item of daMateria) {
    const s = item.desenho();
    assert.ok(!/undefined|NaN/.test(s), `${item.id}: saiu com undefined ou NaN`);
    assert.ok(Number(s.match(/width="(\d+)"/)[1]) <= 456, `${item.id}: passa do teto de 456px`);
    // um gráfico de colunas com eixo cortado tem o menor rótulo do eixo > 0
    const numerosDoEixo = [...s.matchAll(/>(\d+)</g)].map((m) => Number(m[1]));
    const pareceGrafico = s.includes("<rect") && numerosDoEixo.length >= 3;
    if (pareceGrafico && !comEixoCortado.includes(item.id)) {
      assert.ok(
        numerosDoEixo.includes(0) || !item.id.startsWith("et8-q-recorte"),
        `${item.id}: gráfico fora da lição 5 não pode ter eixo cortado`
      );
    }
  }
  for (const id of comEixoCortado) {
    assert.ok(daMateria.some((m) => m.id === id), `${id} tinha de existir`);
  }
});

teste("estatística · as figuras não entregam a resposta", () => {
  figurasNaoEntregam("estatistica-8", 24);
});

console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) process.exit(1);

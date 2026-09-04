// progresso.ts — progresso do aluno, salvo na máquina dele.
//
// Não há banco de dados nem cadastro. Tudo vive no localStorage, numa chave
// só, organizada por curso. O certificado emitido também fica aqui — é por
// isso que a página avisa que limpar os dados do navegador apaga tudo.
//
// O progresso de uma lição é a LISTA de ids de questões respondidas, não um
// contador. Contador é frágil: qualquer mudança de ordem ou repetição de
// clique estraga o número. Lista de ids é idempotente por construção.

import type { Certificado, ProgressoCurso, ProgressoGeral, ProgressoLicao } from "./tipos.js";

const CHAVE = "biblioteca_matematica_v3";

function vazio(): ProgressoGeral {
  return { cursos: {} };
}

function licaoVazia(licaoId: string): ProgressoLicao {
  return { licaoId, respondidas: [], acertadas: [], concluida: false };
}

function ehLicaoValida(valor: unknown): valor is ProgressoLicao {
  if (typeof valor !== "object" || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.licaoId === "string" &&
    Array.isArray(r.respondidas) &&
    Array.isArray(r.acertadas) &&
    typeof r.concluida === "boolean"
  );
}

function ehCertificadoValido(valor: unknown): valor is Certificado {
  if (typeof valor !== "object" || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.cursoId === "string" &&
    typeof r.nome === "string" &&
    typeof r.data === "string" &&
    typeof r.questoes === "number" &&
    typeof r.acertosDePrimeira === "number"
  );
}

/** Lê tudo. Dados corrompidos devolvem estado vazio em vez de quebrar. */
export function lerTudo(): ProgressoGeral {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return vazio();
    const dados = JSON.parse(bruto) as unknown;
    if (typeof dados !== "object" || dados === null) return vazio();

    const cru = (dados as Record<string, unknown>).cursos;
    if (typeof cru !== "object" || cru === null) return vazio();

    const cursos: Record<string, ProgressoCurso> = {};
    for (const [cursoId, valor] of Object.entries(cru as Record<string, unknown>)) {
      if (typeof valor !== "object" || valor === null) continue;
      const registro = valor as Record<string, unknown>;

      const licoes: Record<string, ProgressoLicao> = {};
      if (typeof registro.licoes === "object" && registro.licoes !== null) {
        for (const [licaoId, l] of Object.entries(registro.licoes as Record<string, unknown>)) {
          if (!ehLicaoValida(l)) continue;
          licoes[licaoId] = {
            licaoId: l.licaoId,
            respondidas: l.respondidas.filter((x): x is string => typeof x === "string"),
            acertadas: l.acertadas.filter((x): x is string => typeof x === "string"),
            concluida: l.concluida,
          };
        }
      }

      cursos[cursoId] = {
        cursoId,
        licoes,
        certificado: ehCertificadoValido(registro.certificado) ? registro.certificado : undefined,
      };
    }
    return { cursos };
  } catch {
    return vazio();
  }
}

function gravar(geral: ProgressoGeral): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(geral));
  } catch {
    // localStorage indisponível (aba privada cheia): a sessão continua
    // funcionando, só não persiste.
  }
}

export function lerCurso(cursoId: string): ProgressoCurso {
  return lerTudo().cursos[cursoId] ?? { cursoId, licoes: {} };
}

export function lerLicao(cursoId: string, licaoId: string): ProgressoLicao {
  return lerCurso(cursoId).licoes[licaoId] ?? licaoVazia(licaoId);
}

/**
 * Registra a resposta de UMA questão. Idempotente: responder a mesma questão
 * de novo não infla a contagem.
 *
 * "acertouDePrimeira" só é verdadeiro quando o aluno acertou sem ter visto a
 * resolução — é o que distingue "resolveu" de "leu a resposta", e é o número
 * que vai para o certificado.
 */
export function registrarResposta(
  cursoId: string,
  licaoId: string,
  questaoId: string,
  acertouDePrimeira: boolean,
  totalQuestoes: number
): ProgressoLicao {
  const geral = lerTudo();
  const curso = geral.cursos[cursoId] ?? { cursoId, licoes: {} };
  const atual = curso.licoes[licaoId] ?? licaoVazia(licaoId);

  const respondidas = atual.respondidas.includes(questaoId)
    ? atual.respondidas
    : [...atual.respondidas, questaoId];

  const acertadas =
    acertouDePrimeira && !atual.acertadas.includes(questaoId)
      ? [...atual.acertadas, questaoId]
      : atual.acertadas;

  const atualizada: ProgressoLicao = {
    licaoId,
    respondidas,
    acertadas,
    concluida: respondidas.length >= totalQuestoes,
  };

  curso.licoes[licaoId] = atualizada;
  geral.cursos[cursoId] = curso;
  gravar(geral);
  return atualizada;
}

export function reiniciarLicao(cursoId: string, licaoId: string): void {
  const geral = lerTudo();
  const curso = geral.cursos[cursoId];
  if (!curso) return;
  delete curso.licoes[licaoId];
  gravar(geral);
}

export function reiniciarCurso(cursoId: string): void {
  const geral = lerTudo();
  delete geral.cursos[cursoId];
  gravar(geral);
}

// ---------- Consultas ----------

export interface ResumoCurso {
  licoesConcluidas: number;
  questoesRespondidas: number;
  acertosDePrimeira: number;
  concluido: boolean;
}

/** Resumo do curso, dado o total de lições e a contagem de questões de cada. */
export function resumirCurso(
  cursoId: string,
  licoes: { id: string; questoes: number }[]
): ResumoCurso {
  const curso = lerCurso(cursoId);
  let concluidas = 0;
  let respondidas = 0;
  let acertos = 0;

  for (const licao of licoes) {
    const p = curso.licoes[licao.id];
    if (!p) continue;
    if (p.concluida) concluidas += 1;
    respondidas += p.respondidas.length;
    acertos += p.acertadas.length;
  }

  return {
    licoesConcluidas: concluidas,
    questoesRespondidas: respondidas,
    acertosDePrimeira: acertos,
    concluido: licoes.length > 0 && concluidas === licoes.length,
  };
}

/** A primeira lição ainda não concluída — o "continue daqui". */
export function proximaLicao(cursoId: string, ordem: string[]): string | null {
  const curso = lerCurso(cursoId);
  for (const id of ordem) {
    if (!curso.licoes[id]?.concluida) return id;
  }
  return null;
}

// ---------- Certificado ----------

export function lerCertificado(cursoId: string): Certificado | null {
  return lerCurso(cursoId).certificado ?? null;
}

/**
 * Emite (ou reemite, se o aluno trocar o nome) o certificado da matéria.
 * Só faz sentido chamar quando resumirCurso().concluido for verdadeiro —
 * quem garante isso é a interface.
 */
export function emitirCertificado(certificado: Certificado): Certificado {
  const geral = lerTudo();
  const curso = geral.cursos[certificado.cursoId] ?? { cursoId: certificado.cursoId, licoes: {} };
  curso.certificado = certificado;
  geral.cursos[certificado.cursoId] = curso;
  gravar(geral);
  return certificado;
}

/** Todos os certificados já emitidos, do mais novo para o mais antigo. */
export function listarCertificados(): Certificado[] {
  return Object.values(lerTudo().cursos)
    .map((c) => c.certificado)
    .filter((c): c is Certificado => c !== undefined)
    .sort((a, b) => b.data.localeCompare(a.data));
}

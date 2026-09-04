// correcao.ts — verificação da resposta do aluno.

import type { Questao, ErroComum } from "./tipos.js";
import { paraNumero } from "./util.js";

export interface Veredito {
  certo: boolean;
  /** Preenchido quando a resposta errada é um erro previsto no conteúdo. */
  diagnostico?: ErroComum;
}

/**
 * Corrige a resposta e, quando ela é errada, tenta identificar QUAL erro o
 * aluno cometeu — para o feedback poder falar do engano dele em vez de
 * repetir a solução genérica.
 */
export function corrigir(questao: Questao, resposta: unknown): Veredito {
  if (questao.formato === "alternativas") {
    const indice = typeof resposta === "number" ? resposta : -1;
    if (indice === questao.correta) return { certo: true };
    const escolhida = questao.alternativas[indice];
    return {
      certo: false,
      diagnostico: escolhida ? acharDiagnostico(questao, escolhida.texto) : undefined,
    };
  }

  const texto = String(resposta ?? "");
  const valor = paraNumero(texto);
  if (Number.isNaN(valor)) return { certo: false };

  const tolerancia = questao.tolerancia ?? 0.001;
  if (Math.abs(valor - questao.resposta) <= tolerancia) return { certo: true };

  return { certo: false, diagnostico: acharDiagnostico(questao, texto) };
}

/** Casa a resposta dada com um dos erros comuns declarados no conteúdo. */
function acharDiagnostico(questao: Questao, dado: string): ErroComum | undefined {
  if (!questao.errosComuns) return undefined;
  const normalizar = (s: string) => s.trim().toLowerCase().replace(",", ".");
  const alvo = normalizar(dado);
  const alvoNumero = paraNumero(dado);

  return questao.errosComuns.find((erro) => {
    if (normalizar(erro.resposta) === alvo) return true;
    const numeroErro = paraNumero(erro.resposta);
    return (
      !Number.isNaN(numeroErro) &&
      !Number.isNaN(alvoNumero) &&
      Math.abs(numeroErro - alvoNumero) <= 0.001
    );
  });
}

/** Texto da resposta correta, para exibir ao fim da resolução. */
export function respostaCorreta(questao: Questao): string {
  if (questao.formato === "alternativas") {
    return questao.alternativas[questao.correta]?.texto ?? "";
  }
  const numero = Number.isInteger(questao.resposta)
    ? String(questao.resposta)
    : String(questao.resposta).replace(".", ",");
  return questao.unidade ? `${numero} ${questao.unidade}` : numero;
}

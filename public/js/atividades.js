import { normalizarNumero, compararNumeros } from "./matematica.js";
import { normalizarTexto } from "./utils.js";
// ---------- Funções de correção (uma por tipo de atividade) ----------
export function validarMultiplaEscolha(atividade, respostaIndice) {
    return respostaIndice === atividade.resposta;
}
export function validarRespostaNumerica(atividade, respostaTexto) {
    const valor = normalizarNumero(respostaTexto);
    if (Number.isNaN(valor)) {
        return false;
    }
    return compararNumeros(valor, atividade.resposta, atividade.tolerancia ?? 0.01);
}
export function validarVerdadeiroFalso(atividade, resposta) {
    return resposta !== null && resposta === atividade.resposta;
}
export function validarComplete(atividade, respostaTexto) {
    return normalizarTexto(respostaTexto) === normalizarTexto(atividade.resposta);
}
export function validarOrdenacao(atividade, ordemAluno) {
    if (ordemAluno.length !== atividade.ordemCorreta.length) {
        return false;
    }
    return ordemAluno.every((indice, posicao) => indice === atividade.ordemCorreta[posicao]);
}
export function validarEncontreErro(atividade, indiceEscolhido) {
    return indiceEscolhido === atividade.resposta;
}
export function validarRelacionamento(atividade, paresAluno) {
    if (paresAluno.length !== atividade.paresCorretos.length) {
        return false;
    }
    return paresAluno.every((valor, indice) => valor === atividade.paresCorretos[indice]);
}
/**
 * Função central de correção: identifica o tipo da atividade (união discriminada)
 * e delega para o validador correspondente. Não usa "any" em nenhum ponto.
 */
export function corrigirAtividade(atividade, respostaAluno) {
    switch (atividade.tipo) {
        case "multipla_escolha":
            return validarMultiplaEscolha(atividade, respostaAluno);
        case "resposta_numerica":
        case "problema":
            return validarRespostaNumerica(atividade, String(respostaAluno ?? ""));
        case "verdadeiro_falso":
            return validarVerdadeiroFalso(atividade, respostaAluno);
        case "complete":
            return validarComplete(atividade, String(respostaAluno ?? ""));
        case "ordenacao":
            return validarOrdenacao(atividade, respostaAluno);
        case "encontre_erro":
            return validarEncontreErro(atividade, respostaAluno);
        case "relacionamento":
            return validarRelacionamento(atividade, respostaAluno);
    }
}
export function iniciarSessao(conteudoId, atividades, indiceInicial = 0) {
    return {
        conteudoId,
        atividades,
        indiceAtual: indiceInicial,
        jaErrouAtividadeAtual: false,
        acertos: 0,
        erros: 0,
    };
}
export function atividadeAtual(estado) {
    return estado.atividades[estado.indiceAtual] ?? null;
}
export function sessaoConcluida(estado) {
    return estado.indiceAtual >= estado.atividades.length;
}
/**
 * Processa a resposta do aluno para a atividade atual.
 * Na primeira tentativa errada, permite tentar de novo (não conta como avanço).
 * Na segunda tentativa (certa ou errada), sempre libera avançar.
 */
export function processarResposta(estado, respostaAluno) {
    const atividade = atividadeAtual(estado);
    if (!atividade) {
        return { correta: false, primeiraTentativa: true };
    }
    const correta = corrigirAtividade(atividade, respostaAluno);
    const primeiraTentativa = !estado.jaErrouAtividadeAtual;
    if (correta) {
        estado.acertos += 1;
    }
    else if (primeiraTentativa) {
        estado.jaErrouAtividadeAtual = true;
    }
    else {
        estado.erros += 1;
    }
    return { correta, primeiraTentativa };
}
/** Avança para a próxima atividade da sessão, reiniciando o estado de tentativa. */
export function avancarAtividade(estado) {
    return {
        ...estado,
        indiceAtual: estado.indiceAtual + 1,
        jaErrouAtividadeAtual: false,
    };
}
/**
 * Registra que o aluno optou por ver a explicação em vez de tentar novamente
 * após a primeira resposta errada. Conta como erro na atividade atual.
 */
export function registrarDesistencia(estado) {
    return { ...estado, erros: estado.erros + 1 };
}
/** Nome de exibição da sessão (bloco de 10/10/10/5) a que uma atividade pertence. */
export function nomeDaSessao(nivel) {
    switch (nivel) {
        case "basico":
            return "Sessão 1 — Fundamentos";
        case "intermediario":
            return "Sessão 2 — Prática";
        case "aplicacao":
            return "Sessão 3 — Aplicação";
        case "desafio":
            return "Desafio";
    }
}
//# sourceMappingURL=atividades.js.map
const CHAVE_PROGRESSO = "biblioteca_matematica_progress";
/** Confere, em tempo de execução, se um objeto tem o formato esperado de ProgressoConteudo. */
function ehProgressoValido(valor) {
    if (typeof valor !== "object" || valor === null) {
        return false;
    }
    const registro = valor;
    return (typeof registro.conteudoId === "string" &&
        typeof registro.concluidas === "number" &&
        typeof registro.acertos === "number" &&
        typeof registro.erros === "number" &&
        typeof registro.ultimaAtividade === "number" &&
        typeof registro.concluido === "boolean");
}
/**
 * Lê todo o progresso salvo. Se os dados estiverem corrompidos ou ausentes,
 * retorna um objeto vazio em vez de quebrar a aplicação (regra de robustez do projeto).
 */
export function getAllProgress() {
    try {
        const bruto = window.localStorage.getItem(CHAVE_PROGRESSO);
        if (!bruto) {
            return {};
        }
        const dados = JSON.parse(bruto);
        if (typeof dados !== "object" || dados === null) {
            return {};
        }
        const resultado = {};
        for (const [chave, valor] of Object.entries(dados)) {
            if (ehProgressoValido(valor)) {
                resultado[chave] = valor;
            }
        }
        return resultado;
    }
    catch {
        // Dados corrompidos (JSON inválido) — o sistema se recupera sem quebrar.
        return {};
    }
}
/** Lê o progresso de um conteúdo específico, ou null se ainda não existir. */
export function getProgress(conteudoId) {
    const todos = getAllProgress();
    return todos[conteudoId] ?? null;
}
/** Salva (sobrescreve) o progresso de um conteúdo específico. */
export function saveProgress(progresso) {
    try {
        const todos = getAllProgress();
        todos[progresso.conteudoId] = progresso;
        window.localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(todos));
    }
    catch {
        // Se o localStorage estiver indisponível (ex.: modo privado lotado),
        // a aplicação continua funcionando na sessão atual sem persistir.
    }
}
/**
 * Atualiza o progresso de um conteúdo após o aluno responder uma atividade.
 * Cria o registro automaticamente se ainda não existir.
 */
export function updateProgress(conteudoId, resultado) {
    const atual = getProgress(conteudoId) ?? {
        conteudoId,
        concluidas: 0,
        acertos: 0,
        erros: 0,
        ultimaAtividade: 0,
        concluido: false,
    };
    const atualizado = {
        ...atual,
        concluidas: Math.min(atual.concluidas + 1, resultado.totalAtividades),
        acertos: atual.acertos + (resultado.acertou ? 1 : 0),
        erros: atual.erros + (resultado.acertou ? 0 : 1),
        ultimaAtividade: resultado.indiceAtividade,
        concluido: atual.concluidas + 1 >= resultado.totalAtividades,
    };
    saveProgress(atualizado);
    return atualizado;
}
/** Reinicia o progresso de um único conteúdo (não afeta os demais). */
export function resetProgress(conteudoId) {
    try {
        const todos = getAllProgress();
        delete todos[conteudoId];
        window.localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(todos));
    }
    catch {
        // Falha silenciosa e segura — mesma justificativa de saveProgress().
    }
}
/** Retorna o conteúdo com progresso mais recente e ainda não concluído (para o card "Continue de onde parou"). */
export function getProgressoEmAndamento() {
    const todos = getAllProgress();
    const emAndamento = Object.values(todos).filter((item) => !item.concluido && item.concluidas > 0);
    if (emAndamento.length === 0) {
        return null;
    }
    return emAndamento[emAndamento.length - 1];
}
//# sourceMappingURL=progresso.js.map
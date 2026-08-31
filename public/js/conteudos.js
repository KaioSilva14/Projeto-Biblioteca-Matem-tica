/**
 * Carrega o índice geral de conteúdos (usado na Home, nas páginas de ano e na busca).
 * Retorna uma lista vazia em caso de falha, para a interface não quebrar.
 */
export async function carregarIndiceGeral() {
    try {
        const resposta = await fetch("/data/indice-geral.json");
        if (!resposta.ok) {
            return [];
        }
        const dados = (await resposta.json());
        if (!Array.isArray(dados)) {
            return [];
        }
        return dados;
    }
    catch {
        return [];
    }
}
/** Filtra o índice geral por ano escolar. */
export function filtrarPorAno(indice, ano) {
    return indice.filter((item) => item.ano === ano);
}
/**
 * Carrega o conteúdo completo (teoria, exemplos, vídeos, atividades) a partir de
 * uma URL de dados JSON. Retorna null se o arquivo não existir ou estiver inválido.
 */
export async function carregarConteudo(caminhoJson) {
    try {
        const resposta = await fetch(caminhoJson);
        if (!resposta.ok) {
            return null;
        }
        const dados = (await resposta.json());
        if (!ehConteudoValido(dados)) {
            return null;
        }
        return dados;
    }
    catch {
        return null;
    }
}
/** Checagem básica de formato antes de confiar nos dados carregados. */
function ehConteudoValido(valor) {
    if (typeof valor !== "object" || valor === null) {
        return false;
    }
    const registro = valor;
    return (typeof registro.id === "string" &&
        typeof registro.titulo === "string" &&
        Array.isArray(registro.atividades) &&
        Array.isArray(registro.teoria));
}
//# sourceMappingURL=conteudos.js.map
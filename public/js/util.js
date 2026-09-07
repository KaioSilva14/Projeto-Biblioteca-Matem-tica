// util.ts — utilidades de DOM e texto.
// Nada aqui usa innerHTML com dado dinâmico.
export function qs(seletor, escopo = document) {
    return escopo.querySelector(seletor);
}
export function el(tag, opcoes = {}) {
    const node = document.createElement(tag);
    if (opcoes.classe)
        node.className = opcoes.classe;
    if (opcoes.texto !== undefined)
        node.textContent = opcoes.texto;
    if (opcoes.atributos) {
        for (const [k, v] of Object.entries(opcoes.atributos))
            node.setAttribute(k, v);
    }
    return node;
}
export function limpar(node) {
    while (node.firstChild)
        node.removeChild(node.firstChild);
}
/** Fisher-Yates, sem alterar o array original. */
export function embaralhar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}
/**
 * Converte o que o aluno digitou em número, aceitando vírgula como
 * separador decimal e ignorando espaços e um eventual "R$".
 */
export function paraNumero(entrada) {
    const limpo = entrada
        .trim()
        .replace(/^R\$\s*/i, "")
        .replace(/\s/g, "")
        // O site escreve negativo com o sinal de menos tipográfico (−, U+2212),
        // que é o caractere que o aluno vê na figura e copia; o teclado dele dá
        // hífen. Sem normalizar, quem digitasse o símbolo da própria tela
        // receberia NaN — contado como erro e sem diagnóstico nenhum. Vale
        // também para travessão e meia-risca, que aparecem em texto colado.
        .replace(/[‐‑‒–—―−]/g, "-")
        // Ponto como separador de milhar ("1.500" = mil e quinhentos), mas SO
        // quando o grupo antes dele comeca por algarismo diferente de zero.
        // Sem essa ressalva, "0.045" digitado por quem usa o ponto como
        // separador decimal virava 45 - e era assim que o motor lia sete
        // diagnosticos ja publicados, que por isso nunca apareciam. Ninguem
        // escreve "0.500" querendo dizer quinhentos.
        .replace(/(?<=[1-9]\d{0,2})\.(?=\d{3}\b)/g, "")
        .replace(",", ".");
    if (limpo === "")
        return NaN;
    return Number(limpo);
}
export function rolarAte(node) {
    const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: semAnimacao ? "auto" : "smooth", block: "start" });
}
/** Lê um parâmetro da query string da página. */
export function parametro(nome) {
    return new URLSearchParams(window.location.search).get(nome);
}
//# sourceMappingURL=util.js.map
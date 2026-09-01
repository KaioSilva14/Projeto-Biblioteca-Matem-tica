// utils.ts
// Funções utilitárias genéricas: DOM, texto e aleatoriedade segura.
// Nenhuma função aqui usa eval() ou inserção insegura de HTML (regra de segurança do projeto).
/** Busca um único elemento no DOM, com tipagem do resultado. */
export function qs(seletor, escopo = document) {
    return escopo.querySelector(seletor);
}
/** Busca uma lista de elementos no DOM, retornada como array (não NodeList). */
export function qsa(seletor, escopo = document) {
    return Array.from(escopo.querySelectorAll(seletor));
}
/** Cria um elemento com classes e texto opcional, sempre via textContent (nunca innerHTML). */
export function criarElemento(tag, opcoes = {}) {
    const elemento = document.createElement(tag);
    if (opcoes.classes) {
        elemento.classList.add(...opcoes.classes);
    }
    if (opcoes.texto !== undefined) {
        elemento.textContent = opcoes.texto;
    }
    if (opcoes.atributos) {
        for (const [chave, valor] of Object.entries(opcoes.atributos)) {
            elemento.setAttribute(chave, valor);
        }
    }
    return elemento;
}
/** Remove todos os filhos de um elemento (equivalente seguro a innerHTML = ""). */
export function limparElemento(elemento) {
    while (elemento.firstChild) {
        elemento.removeChild(elemento.firstChild);
    }
}
/**
 * Embaralha um array com o algoritmo de Fisher-Yates, sem alterar o array original.
 * Usado para variar a ordem de opções/itens exibidos ao aluno.
 */
export function embaralhar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}
/**
 * Normaliza texto para comparação: minúsculas, sem acentos, sem espaços nas pontas.
 * Usado nas atividades do tipo "complete" para aceitar pequenas variações de digitação.
 */
export function normalizarTexto(texto) {
    return texto
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
/** Formata um valor de 0 a 1 como percentual com uma casa decimal (ex.: 0.857 -> "85,7%"). */
export function formatarPercentual(valor) {
    const percentual = valor * 100;
    return `${percentual.toFixed(1).replace(".", ",")}%`;
}
/** Retorna um elemento seguro para exibir mensagens de erro/estado vazio sem quebrar a página. */
export function textoOuPadrao(valor, padrao) {
    if (typeof valor === "string" && valor.trim().length > 0) {
        return valor;
    }
    if (typeof valor === "number" && !Number.isNaN(valor)) {
        return String(valor);
    }
    return padrao;
}
/**
 * Rola a tela até o topo do elemento informado, mantendo o aluno orientado
 * a cada troca de atividade (evita a sensação de "ter voltado ao início").
 * Respeita prefers-reduced-motion, usando rolagem instantânea quando ativado.
 */
export function rolarParaElemento(elemento) {
    const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollIntoView({ behavior: semAnimacao ? "auto" : "smooth", block: "start" });
}
/**
 * Protege um botão contra clique duplo/duplo toque: desabilita imediatamente
 * ao ser acionado e só executa a ação uma vez por clique real.
 */
export function aoClicarUmaVez(botao, acao) {
    botao.addEventListener("click", () => {
        if (botao.disabled) {
            return;
        }
        botao.disabled = true;
        acao();
    });
}
//# sourceMappingURL=utils.js.map
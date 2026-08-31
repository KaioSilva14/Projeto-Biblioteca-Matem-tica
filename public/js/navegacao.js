// navegacao.ts
// Comportamento do cabeçalho: menu hambúrguer no celular, link ativo e busca.
import { qs, qsa } from "./utils.js";
import { carregarIndiceGeral } from "./conteudos.js";
import { buscarNoIndice } from "./busca.js";
import { criarElemento, limparElemento } from "./utils.js";
export function initNavegacao() {
    initMenuHamburguer();
    destacarLinkAtivo();
    initBuscaGlobal();
}
function initMenuHamburguer() {
    const botao = qs("[data-menu-botao]");
    const menu = qs("[data-menu-lista]");
    if (!botao || !menu) {
        return;
    }
    botao.addEventListener("click", () => {
        const aberto = menu.classList.toggle("menu--aberto");
        botao.setAttribute("aria-expanded", String(aberto));
    });
    // Fecha o menu ao navegar (evita ficar aberto ao voltar para a página no celular)
    qsa("a", menu).forEach((link) => {
        link.addEventListener("click", () => {
            menu.classList.remove("menu--aberto");
            botao.setAttribute("aria-expanded", "false");
        });
    });
}
function destacarLinkAtivo() {
    const caminhoAtual = window.location.pathname;
    qsa("[data-menu-lista] a").forEach((link) => {
        const href = link.getAttribute("href");
        if (href && (href === caminhoAtual || (href !== "/" && caminhoAtual.startsWith(href)))) {
            link.setAttribute("aria-current", "page");
        }
    });
}
function initBuscaGlobal() {
    const input = qs("[data-busca-input]");
    const resultados = qs("[data-busca-resultados]");
    if (!input || !resultados) {
        return;
    }
    let indice = [];
    let carregado = false;
    let tempoDebounce;
    const renderizarResultados = (lista) => {
        limparElemento(resultados);
        if (lista.length === 0) {
            resultados.appendChild(criarElemento("p", { classes: ["busca__vazio"], texto: "Nenhum conteúdo encontrado." }));
            resultados.hidden = false;
            return;
        }
        lista.slice(0, 8).forEach((item) => {
            const link = criarElemento("a", {
                classes: ["busca__resultado"],
                texto: `${item.titulo} — ${item.ano}º ano`,
                atributos: { href: item.disponivel ? item.rota : "#" },
            });
            if (!item.disponivel) {
                link.classList.add("busca__resultado--indisponivel");
                link.setAttribute("aria-disabled", "true");
            }
            resultados.appendChild(link);
        });
        resultados.hidden = false;
    };
    input.addEventListener("input", () => {
        window.clearTimeout(tempoDebounce);
        const termo = input.value;
        tempoDebounce = window.setTimeout(async () => {
            if (termo.trim() === "") {
                resultados.hidden = true;
                return;
            }
            if (!carregado) {
                indice = await carregarIndiceGeral();
                carregado = true;
            }
            renderizarResultados(buscarNoIndice(indice, termo));
        }, 200);
    });
    document.addEventListener("click", (evento) => {
        const alvo = evento.target;
        if (!input.contains(alvo) && !resultados.contains(alvo)) {
            resultados.hidden = true;
        }
    });
}
//# sourceMappingURL=navegacao.js.map
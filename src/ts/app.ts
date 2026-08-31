// app.ts — ponto de entrada da aplicação (Biblioteca Matemática).
export {};

// app.ts
// Ponto de entrada da aplicação. Identifica a página atual pelo atributo
// data-page do <body> e inicializa somente o que aquela página precisa.
// Não existe roteador de framework — cada página HTML é estática e independente.

import { initNavegacao } from "./navegacao.js";
import { carregarIndiceGeral, carregarConteudo, filtrarPorAno } from "./conteudos.js";
import { aplicarFiltros, type FiltroCategoria, type FiltroNivel } from "./filtros.js";
import {
  renderCard,
  renderCardConteudo,
  renderBreadcrumb,
  renderResumo,
  renderVideo,
  renderQuestao,
  renderProgresso,
  renderFeedback,
  renderExplicacaoCompleta,
} from "./componentes.js";
import {
  iniciarSessao,
  atividadeAtual,
  sessaoConcluida,
  processarResposta,
  avancarAtividade,
  registrarDesistencia,
  nomeDaSessao,
  type EstadoSessao,
} from "./atividades.js";
import { getProgress, getProgressoEmAndamento, updateProgress, resetProgress } from "./progresso.js";
import { qs, criarElemento, limparElemento, formatarPercentual } from "./utils.js";
import type { Ano, ConteudoResumo, Conteudo } from "./types.js";

document.addEventListener("DOMContentLoaded", () => {
  initNavegacao();

  const pagina = document.body.dataset.page;
  switch (pagina) {
    case "home":
      initHome();
      break;
    case "ano":
      initAno();
      break;
    case "conteudo":
      initConteudo();
      break;
  }
});

// ---------- Home ----------

const NOMES_ANO: Record<Ano, string> = { 6: "6º Ano", 7: "7º Ano", 8: "8º Ano", 9: "9º Ano" };
const DESCRICAO_ANO: Record<Ano, string> = {
  6: "Comece pelos fundamentos: números, frações e geometria básica.",
  7: "Aprofunde com proporção, equações e estatística.",
  8: "Avance com potências, fatoração e o Teorema de Pitágoras.",
  9: "Prepare-se com funções, semelhança e geometria avançada.",
};

async function initHome(): Promise<void> {
  const containerAnos = qs<HTMLElement>("[data-anos-grid]");
  const containerDashboard = qs<HTMLElement>("[data-dashboard]");

  const indice = await carregarIndiceGeral();

  if (containerAnos) {
    limparElemento(containerAnos);
    ([6, 7, 8, 9] as Ano[]).forEach((ano) => {
      const quantidade = indice.filter((item) => item.ano === ano).length;
      containerAnos.appendChild(
        renderCard({
          destaque: `${ano}º ANO`,
          titulo: NOMES_ANO[ano],
          descricao: DESCRICAO_ANO[ano],
          meta: `${quantidade} conteúdos`,
          cta: "Explorar conteúdos",
          href: `/pages/${ano}ano.html`,
        })
      );
    });
  }

  if (containerDashboard) {
    const emAndamento = getProgressoEmAndamento();
    limparElemento(containerDashboard);
    if (emAndamento) {
      const resumo = indice.find((item) => item.id === emAndamento.conteudoId);
      if (resumo) {
        containerDashboard.appendChild(
          criarElemento("p", { classes: ["dashboard__titulo"], texto: "Continue de onde parou" })
        );
        containerDashboard.appendChild(
          renderCard({
            titulo: resumo.titulo,
            descricao: `${emAndamento.concluidas} de 35 atividades concluídas`,
            cta: "Continuar",
            href: resumo.rota,
          })
        );
        return;
      }
    }
    containerDashboard.appendChild(
      criarElemento("p", { classes: ["dashboard__titulo"], texto: "Comece escolhendo seu ano." })
    );
  }
}

// ---------- Página de ano ----------

async function initAno(): Promise<void> {
  const ano = Number(document.body.dataset.ano) as Ano;
  const grid = qs<HTMLElement>("[data-conteudos-grid]");
  const filtroCategoria = qs<HTMLSelectElement>("[data-filtro-categoria]");
  const filtroNivel = qs<HTMLSelectElement>("[data-filtro-nivel]");
  if (!grid) {
    return;
  }

  const indiceCompleto = await carregarIndiceGeral();
  const doAno = filtrarPorAno(indiceCompleto, ano);

  const renderizar = () => {
    const categoria = (filtroCategoria?.value ?? "todas") as FiltroCategoria;
    const nivel = (filtroNivel?.value ?? "todos") as FiltroNivel;
    const filtrados = aplicarFiltros(doAno, { categoria, nivel });

    limparElemento(grid);
    if (filtrados.length === 0) {
      grid.appendChild(
        criarElemento("p", { classes: ["estado-vazio"], texto: "Nenhum conteúdo encontrado com esse filtro." })
      );
      return;
    }
    filtrados.forEach((resumo: ConteudoResumo) => grid.appendChild(renderCardConteudo(resumo)));
  };

  filtroCategoria?.addEventListener("change", renderizar);
  filtroNivel?.addEventListener("change", renderizar);
  renderizar();
}

// ---------- Página de conteúdo ----------

async function initConteudo(): Promise<void> {
  const caminhoJson = document.body.dataset.conteudoJson;
  if (!caminhoJson) {
    return;
  }

  const conteudo = await carregarConteudo(caminhoJson);
  const areaPrincipal = qs<HTMLElement>("[data-conteudo-principal]");
  if (!conteudo || !areaPrincipal) {
    if (areaPrincipal) {
      limparElemento(areaPrincipal);
      areaPrincipal.appendChild(
        criarElemento("p", {
          classes: ["estado-vazio"],
          texto: "Não foi possível carregar este conteúdo. Volte e tente novamente.",
        })
      );
    }
    return;
  }

  renderCabecalhoConteudo(conteudo);
  renderTeoriaConteudo(conteudo);
  renderExemplosConteudo(conteudo);
  renderDicasConteudo(conteudo);
  renderVideosConteudo(conteudo);
  renderResumoConteudo(conteudo);
  initAreaAtividades(conteudo, false);
  initAreaAtividades(conteudo, true);
}

function renderCabecalhoConteudo(conteudo: Conteudo): void {
  const breadcrumbContainer = qs<HTMLElement>("[data-breadcrumb]");
  if (breadcrumbContainer) {
    limparElemento(breadcrumbContainer);
    breadcrumbContainer.appendChild(
      renderBreadcrumb([
        { texto: "Início", href: "/" },
        { texto: `${conteudo.ano}º Ano`, href: `/pages/${conteudo.ano}ano.html` },
        { texto: conteudo.titulo },
      ])
    );
  }

  const titulo = qs<HTMLElement>("[data-conteudo-titulo]");
  if (titulo) titulo.textContent = conteudo.titulo;

  const introducao = qs<HTMLElement>("[data-conteudo-introducao]");
  if (introducao) introducao.textContent = conteudo.descricao;

  const objetivos = qs<HTMLElement>("[data-conteudo-objetivos]");
  if (objetivos) {
    limparElemento(objetivos);
    objetivos.appendChild(renderResumo(conteudo.objetivos));
  }
}

function renderTeoriaConteudo(conteudo: Conteudo): void {
  const container = qs<HTMLElement>("[data-conteudo-teoria]");
  if (!container) return;
  limparElemento(container);
  conteudo.teoria.forEach((bloco) => {
    const secao = criarElemento("div", { classes: ["teoria__bloco"] });
    secao.appendChild(criarElemento("h3", { texto: bloco.titulo }));
    bloco.paragrafos.forEach((paragrafo) => {
      secao.appendChild(criarElemento("p", { texto: paragrafo }));
    });
    if (bloco.destaque) {
      secao.appendChild(criarElemento("p", { classes: ["teoria__destaque"], texto: bloco.destaque }));
    }
    container.appendChild(secao);
  });
}

function renderExemplosConteudo(conteudo: Conteudo): void {
  const container = qs<HTMLElement>("[data-conteudo-exemplos]");
  if (!container) return;
  limparElemento(container);
  conteudo.exemplos.forEach((exemplo, indice) => {
    const card = criarElemento("div", { classes: ["exemplo"] });
    card.appendChild(criarElemento("p", { classes: ["exemplo__rotulo"], texto: `Exemplo ${indice + 1}` }));
    card.appendChild(criarElemento("p", { texto: `Problema: ${exemplo.problema}` }));
    card.appendChild(criarElemento("p", { texto: `Estratégia: ${exemplo.estrategia}` }));
    card.appendChild(criarElemento("p", { texto: `Cálculo: ${exemplo.calculo}` }));
    card.appendChild(
      criarElemento("p", { classes: ["exemplo__resultado"], texto: `Resultado: ${exemplo.resultado}` })
    );
    card.appendChild(criarElemento("p", { texto: exemplo.explicacao }));
    container.appendChild(card);
  });
}

function renderDicasConteudo(conteudo: Conteudo): void {
  const container = qs<HTMLElement>("[data-conteudo-dicas]");
  if (!container) return;
  limparElemento(container);
  conteudo.dicas.forEach((dica) => {
    container.appendChild(criarElemento("p", { classes: ["dica"], texto: `💡 ${dica}` }));
  });
}

function renderVideosConteudo(conteudo: Conteudo): void {
  const container = qs<HTMLElement>("[data-conteudo-videos]");
  if (!container) return;
  limparElemento(container);
  conteudo.videos.forEach((video) => container.appendChild(renderVideo(video)));
}

function renderResumoConteudo(conteudo: Conteudo): void {
  const container = qs<HTMLElement>("[data-conteudo-resumo]");
  if (!container) return;
  limparElemento(container);
  container.appendChild(renderResumo(conteudo.resumo));
}

// ---------- Motor de atividades aplicado à página de conteúdo ----------

function initAreaAtividades(conteudo: Conteudo, extra: boolean): void {
  const seletor = extra ? "[data-atividades-extras]" : "[data-atividades-principal]";
  const area = qs<HTMLElement>(seletor);
  if (!area) return;

  const listaAtividades = extra ? conteudo.atividadesExtras : conteudo.atividades;
  if (listaAtividades.length === 0) {
    area.hidden = true;
    return;
  }

  limparElemento(area);

  if (extra) {
    iniciarTelaDeInicio(area, conteudo, listaAtividades, extra);
    return;
  }

  const progressoSalvo = getProgress(conteudo.id);
  if (progressoSalvo?.concluido) {
    renderTelaConclusao(area, conteudo, progressoSalvo.acertos, progressoSalvo.erros, listaAtividades.length);
    return;
  }
  if (progressoSalvo && progressoSalvo.concluidas > 0) {
    renderTelaRetomada(area, conteudo, progressoSalvo.concluidas, listaAtividades);
    return;
  }
  iniciarTelaDeInicio(area, conteudo, listaAtividades, extra);
}

function renderTelaRetomada(
  area: HTMLElement,
  conteudo: Conteudo,
  concluidas: number,
  atividades: Conteudo["atividades"]
): void {
  limparElemento(area);
  const banner = criarElemento("div", { classes: ["banner-retomada"] });
  banner.appendChild(
    criarElemento("p", { texto: `Você já concluiu ${concluidas} de ${atividades.length} atividades.` })
  );
  const botoes = criarElemento("div", { classes: ["banner-retomada__botoes"] });
  const continuar = criarElemento("button", {
    classes: ["botao", "botao--primario"],
    texto: "Continuar de onde parei",
    atributos: { type: "button" },
  });
  const recomecar = criarElemento("button", {
    classes: ["botao", "botao--secundario"],
    texto: "Recomeçar do zero",
    atributos: { type: "button" },
  });
  continuar.addEventListener("click", () => {
    const estado = iniciarSessao(conteudo.id, atividades, concluidas);
    renderizarAtividadeAtual(area, conteudo, estado, false);
  });
  recomecar.addEventListener("click", () => {
    if (window.confirm("Isso vai apagar seu progresso atual neste conteúdo. Deseja recomeçar?")) {
      resetProgress(conteudo.id);
      const estado = iniciarSessao(conteudo.id, atividades, 0);
      renderizarAtividadeAtual(area, conteudo, estado, false);
    }
  });
  botoes.appendChild(continuar);
  botoes.appendChild(recomecar);
  banner.appendChild(botoes);
  area.appendChild(banner);
}

function iniciarTelaDeInicio(
  area: HTMLElement,
  conteudo: Conteudo,
  atividades: Conteudo["atividades"],
  extra: boolean
): void {
  limparElemento(area);
  const botaoIniciar = criarElemento("button", {
    classes: ["botao", "botao--primario"],
    texto: extra ? "Praticar atividades extras" : "Começar atividades",
    atributos: { type: "button" },
  });
  botaoIniciar.addEventListener("click", () => {
    const estado = iniciarSessao(conteudo.id, atividades, 0);
    renderizarAtividadeAtual(area, conteudo, estado, extra);
  });
  area.appendChild(botaoIniciar);
}

function renderizarAtividadeAtual(area: HTMLElement, conteudo: Conteudo, estado: EstadoSessao, extra: boolean): void {
  limparElemento(area);

  if (sessaoConcluida(estado)) {
    if (extra) {
      const fim = criarElemento("p", { classes: ["dica"], texto: "Atividades extras concluídas! Bom treino." });
      area.appendChild(fim);
      return;
    }
    renderTelaConclusao(area, conteudo, estado.acertos, estado.erros, estado.atividades.length);
    return;
  }

  const atividade = atividadeAtual(estado);
  if (!atividade) return;

  if (!extra) {
    const sessaoLabel = criarElemento("p", { classes: ["questao__sessao"], texto: nomeDaSessao(atividade.nivel) });
    area.appendChild(sessaoLabel);
    area.appendChild(renderProgresso(estado.indiceAtual, estado.atividades.length, estado.acertos, estado.erros));
  }

  const { elemento: elementoQuestao, obterResposta } = renderQuestao(atividade);
  area.appendChild(elementoQuestao);

  const areaAcoes = criarElemento("div", { classes: ["questao__acoes"] });
  area.appendChild(areaAcoes);

  const botaoVerificar = criarElemento("button", {
    classes: ["botao", "botao--primario"],
    texto: "Verificar resposta",
    atributos: { type: "button" },
  });
  areaAcoes.appendChild(botaoVerificar);

  botaoVerificar.addEventListener("click", () => {
    const resposta = obterResposta();
    const resultado = processarResposta(estado, resposta);
    limparElemento(areaAcoes);

    if (resultado.correta) {
      area.appendChild(renderFeedback(true, atividade.explicacao));
      if (!extra) {
        updateProgress(conteudo.id, {
          acertou: true,
          indiceAtividade: estado.indiceAtual,
          totalAtividades: estado.atividades.length,
        });
      }
      const proximo = criarElemento("button", {
        classes: ["botao", "botao--primario"],
        texto: "Próxima atividade",
        atributos: { type: "button" },
      });
      proximo.addEventListener("click", () => {
        const novoEstado = avancarAtividade(estado);
        renderizarAtividadeAtual(area, conteudo, novoEstado, extra);
      });
      area.appendChild(proximo);
      return;
    }

    if (resultado.primeiraTentativa) {
      area.appendChild(renderFeedback(false, "", atividade.dica));
      const acoes = criarElemento("div", { classes: ["questao__acoes"] });
      const tentarNovamente = criarElemento("button", {
        classes: ["botao", "botao--primario"],
        texto: "Tentar novamente",
        atributos: { type: "button" },
      });
      const verExplicacao = criarElemento("button", {
        classes: ["botao", "botao--secundario"],
        texto: "Ver explicação",
        atributos: { type: "button" },
      });
      tentarNovamente.addEventListener("click", () => {
        renderizarAtividadeAtual(area, conteudo, estado, extra);
      });
      verExplicacao.addEventListener("click", () => {
        const estadoComDesistencia = registrarDesistencia(estado);
        if (!extra) {
          updateProgress(conteudo.id, {
            acertou: false,
            indiceAtividade: estado.indiceAtual,
            totalAtividades: estado.atividades.length,
          });
        }
        limparElemento(area);
        area.appendChild(renderExplicacaoCompleta(atividade.explicacao));
        const proximo = criarElemento("button", {
          classes: ["botao", "botao--primario"],
          texto: "Próxima atividade",
          atributos: { type: "button" },
        });
        proximo.addEventListener("click", () => {
          const novoEstado = avancarAtividade(estadoComDesistencia);
          renderizarAtividadeAtual(area, conteudo, novoEstado, extra);
        });
        area.appendChild(proximo);
      });
      acoes.appendChild(tentarNovamente);
      acoes.appendChild(verExplicacao);
      area.appendChild(acoes);
      return;
    }

    // Segunda tentativa também errada: mostra explicação direto e segue em frente.
    area.appendChild(renderFeedback(false, "", undefined));
    area.appendChild(renderExplicacaoCompleta(atividade.explicacao));
    if (!extra) {
      updateProgress(conteudo.id, {
        acertou: false,
        indiceAtividade: estado.indiceAtual,
        totalAtividades: estado.atividades.length,
      });
    }
    const proximo = criarElemento("button", {
      classes: ["botao", "botao--primario"],
      texto: "Próxima atividade",
      atributos: { type: "button" },
    });
    proximo.addEventListener("click", () => {
      const novoEstado = avancarAtividade(estado);
      renderizarAtividadeAtual(area, conteudo, novoEstado, extra);
    });
    area.appendChild(proximo);
  });
}

function renderTelaConclusao(
  area: HTMLElement,
  conteudo: Conteudo,
  acertos: number,
  erros: number,
  total: number
): void {
  limparElemento(area);
  const container = criarElemento("div", { classes: ["conclusao"] });
  container.appendChild(criarElemento("h3", { texto: "Conteúdo concluído!" }));
  container.appendChild(criarElemento("p", { texto: `${total}/${total} atividades` }));
  container.appendChild(criarElemento("p", { texto: `Você acertou ${acertos} de ${total} atividades.` }));
  void erros;
  container.appendChild(
    criarElemento("p", {
      classes: ["conclusao__percentual"],
      texto: `${formatarPercentual(total > 0 ? acertos / total : 0)} de aproveitamento.`,
    })
  );

  const botoes = criarElemento("div", { classes: ["conclusao__botoes"] });

  const revisar = criarElemento("a", {
    classes: ["botao", "botao--secundario"],
    texto: "Revisar conteúdo",
    atributos: { href: "#topo-conteudo" },
  });

  const refazer = criarElemento("button", {
    classes: ["botao", "botao--primario"],
    texto: "Refazer atividades",
    atributos: { type: "button" },
  });
  refazer.addEventListener("click", () => {
    if (window.confirm("Isso vai apagar seu progresso atual neste conteúdo. Deseja refazer do início?")) {
      resetProgress(conteudo.id);
      const estado = iniciarSessao(conteudo.id, conteudo.atividades, 0);
      renderizarAtividadeAtual(area, conteudo, estado, false);
    }
  });

  const voltar = criarElemento("a", {
    classes: ["botao", "botao--secundario"],
    texto: "Voltar aos conteúdos",
    atributos: { href: `/pages/${conteudo.ano}ano.html` },
  });

  botoes.appendChild(revisar);
  botoes.appendChild(refazer);
  botoes.appendChild(voltar);
  container.appendChild(botoes);
  area.appendChild(container);
}
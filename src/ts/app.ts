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
  renderCaixaExplicacao,
  renderBlocoTeoria,
  renderExemplo,
  renderDica,
  renderCabecalhoModulo,
  renderTrilhaResumo,
} from "./componentes.js";
import {
  iniciarSessao,
  atividadeAtual,
  sessaoConcluida,
  processarResposta,
  avancarAtividade,
  registrarDesistencia,
  type EstadoSessao,
} from "./atividades.js";
import { resolverModulos, ordemGlobalDeAtividades, type LoteAtividades, type ModuloResolvido } from "./modulos.js";
import { getProgress, getProgressoEmAndamento, updateProgress, resetProgress } from "./progresso.js";
import { desenharCertificado, baixarCertificado } from "./certificado.js";
import { qs, criarElemento, limparElemento, formatarPercentual, rolarParaElemento, aoClicarUmaVez } from "./utils.js";
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
      const doAno = indice.filter((item) => item.ano === ano);
      const disponiveis = doAno.filter((item) => item.disponivel).length;
      containerAnos.appendChild(
        renderCard({
          destaque: `${ano}º ANO`,
          titulo: NOMES_ANO[ano],
          descricao: DESCRICAO_ANO[ano],
          meta: `${disponiveis} de ${doAno.length} conteúdos prontos`,
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
            // O total vem do índice, não de um "35" fixo no código — assim
            // um conteúdo com outra quantidade de atividades mostra o número certo.
            descricao: `${emAndamento.concluidas} de ${resumo.quantidadeAtividades} atividades concluídas`,
            cta: "Continuar",
            href: resumo.rota,
          })
        );
        return;
      }
    }
    // Sem matéria em andamento, o cartão simplesmente não aparece. A seção
    // "Escolha seu ano" vem logo abaixo e já cumpre esse papel — um aviso
    // solto aqui só criava um rótulo órfão no topo da página.
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
  const areaTrilha = qs<HTMLElement>("[data-trilha]");
  if (!conteudo) {
    if (areaTrilha) {
      limparElemento(areaTrilha);
      areaTrilha.appendChild(
        criarElemento("p", {
          classes: ["estado-vazio"],
          texto: "Não foi possível carregar este conteúdo. Volte e tente novamente.",
        })
      );
    }
    return;
  }

  renderCabecalhoConteudo(conteudo);
  if (areaTrilha) {
    renderTrilha(areaTrilha, conteudo);
  }
  renderResumoConteudo(conteudo);
  initAtividadesExtras(conteudo);
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

  const meta = qs<HTMLElement>("[data-conteudo-meta]");
  if (meta) {
    const totalAtividades = ordemGlobalDeAtividades(conteudo).length;
    const totalModulos = conteudo.modulos?.length ?? 0;
    limparElemento(meta);
    const partes = [
      totalModulos > 0 ? `${totalModulos} módulos` : null,
      `${totalAtividades} atividades`,
      `${conteudo.videos.length} vídeos`,
    ].filter((parte): parte is string => parte !== null);
    partes.forEach((parte) => {
      meta.appendChild(criarElemento("span", { classes: ["conteudo-meta__item"], texto: parte }));
    });
  }
}

function renderResumoConteudo(conteudo: Conteudo): void {
  const container = qs<HTMLElement>("[data-conteudo-resumo]");
  if (!container) return;
  limparElemento(container);
  container.appendChild(renderResumo(conteudo.resumo));
}

// ---------- Trilha de módulos (v2) ----------
//
// A v1 empilhava toda a teoria, depois todos os vídeos e por fim as 35
// atividades seguidas. A v2 renderiza a trilha declarada no JSON: cada módulo
// intercala explicação, exemplo, vídeo e lotes curtos de atividades.
//
// Os lotes são liberados em ordem. Isso não é gamificação — é o que mantém o
// progresso coerente: como o progresso é um índice numa lista ordenada, deixar
// o aluno pular para o lote 5 antes do 2 faria a contagem de concluídas
// descrever um estado que não aconteceu.

function renderTrilha(area: HTMLElement, conteudo: Conteudo): void {
  const resolvidos = resolverModulos(conteudo);
  const totalGlobal = ordemGlobalDeAtividades(conteudo).length;

  limparElemento(area);

  if (resolvidos.length === 0) {
    // Conteúdo ainda no formato v1 (sem "modulos" no JSON): exibe o formato
    // linear antigo em vez de uma página vazia.
    renderConteudoLinear(area, conteudo);
    return;
  }

  const caixaResumo = criarElemento("div", { classes: ["trilha-resumo__caixa"] });
  area.appendChild(caixaResumo);

  const containerModulos = criarElemento("div", { classes: ["trilha"] });
  area.appendChild(containerModulos);

  const areaConclusao = criarElemento("div", { classes: ["trilha__conclusao"] });
  area.appendChild(areaConclusao);

  // Redesenha as partes que dependem do progresso. Chamado sempre que o aluno
  // termina um lote, para que a barra do topo e os selos "concluído" fiquem
  // coerentes sem recarregar a página.
  const atualizar = (): void => {
    const progresso = getProgress(conteudo.id);
    const concluidas = progresso?.concluidas ?? 0;

    limparElemento(caixaResumo);
    caixaResumo.appendChild(renderTrilhaResumo(Math.min(concluidas, totalGlobal), totalGlobal));

    limparElemento(containerModulos);
    resolvidos.forEach((resolvido) => {
      containerModulos.appendChild(montarModulo(conteudo, resolvido, totalGlobal, concluidas, atualizar));
    });

    limparElemento(areaConclusao);
    if (concluidas >= totalGlobal && totalGlobal > 0) {
      areaConclusao.appendChild(montarConclusao(conteudo, totalGlobal, atualizar));
    }
  };

  atualizar();
}

function montarModulo(
  conteudo: Conteudo,
  resolvido: ModuloResolvido,
  totalGlobal: number,
  concluidas: number,
  aoMudarProgresso: () => void
): HTMLElement {
  const moduloConcluido = concluidas >= resolvido.indiceGlobalFinal && resolvido.atividades.length > 0;

  const secao = criarElemento("section", {
    classes: ["modulo", moduloConcluido ? "modulo--concluido" : "modulo--aberto"],
    atributos: { id: `modulo-${resolvido.modulo.id}` },
  });
  secao.appendChild(renderCabecalhoModulo(resolvido.modulo, moduloConcluido));

  const corpo = criarElemento("div", { classes: ["modulo__corpo"] });

  let contadorExemplo = 0;
  resolvido.itens.forEach((item) => {
    switch (item.tipo) {
      case "teoria": {
        if (item.item.tipo !== "teoria") break;
        corpo.appendChild(renderBlocoTeoria(item.item));
        break;
      }
      case "exemplo": {
        if (item.item.tipo !== "exemplo") break;
        contadorExemplo += 1;
        corpo.appendChild(renderExemplo(item.item, contadorExemplo));
        break;
      }
      case "video": {
        if (item.item.tipo !== "video") break;
        const caixa = criarElemento("div", { classes: ["modulo__video"] });
        caixa.appendChild(renderVideo(item.item));
        corpo.appendChild(caixa);
        break;
      }
      case "dica": {
        if (item.item.tipo !== "dica") break;
        corpo.appendChild(renderDica(item.item.texto));
        break;
      }
      case "atividades": {
        corpo.appendChild(montarLote(conteudo, item.lote, totalGlobal, concluidas, aoMudarProgresso));
        break;
      }
    }
  });

  secao.appendChild(corpo);
  return secao;
}

/** Estados possíveis de um lote de atividades dentro de um módulo. */
type EstadoLote = "bloqueado" | "disponivel" | "em-andamento" | "concluido";

function estadoDoLote(lote: LoteAtividades, concluidas: number): EstadoLote {
  const inicio = lote.indiceGlobalInicial;
  const fim = inicio + lote.atividades.length;
  if (concluidas >= fim) return "concluido";
  if (concluidas > inicio) return "em-andamento";
  if (concluidas === inicio) return "disponivel";
  return "bloqueado";
}

function montarLote(
  conteudo: Conteudo,
  lote: LoteAtividades,
  totalGlobal: number,
  concluidas: number,
  aoMudarProgresso: () => void
): HTMLElement {
  const caixa = criarElemento("div", { classes: ["lote"] });
  const estado = estadoDoLote(lote, concluidas);
  caixa.classList.add(`lote--${estado}`);

  const cabecalho = criarElemento("div", { classes: ["lote__cabecalho"] });
  cabecalho.appendChild(criarElemento("h4", { classes: ["lote__titulo"], texto: lote.titulo }));
  cabecalho.appendChild(
    criarElemento("span", {
      classes: ["lote__contagem"],
      texto: `${lote.atividades.length} ${lote.atividades.length === 1 ? "atividade" : "atividades"}`,
    })
  );
  caixa.appendChild(cabecalho);

  const areaExercicio = criarElemento("div", { classes: ["lote__area"] });
  caixa.appendChild(areaExercicio);

  const iniciar = (): void => {
    const progresso = getProgress(conteudo.id);
    const feitas = progresso?.concluidas ?? 0;
    const deslocamentoLocal = Math.max(0, Math.min(feitas - lote.indiceGlobalInicial, lote.atividades.length - 1));
    // O placar da sessão parte do que já está salvo (correção do bug 1):
    // assim acertos/erros continuam corretos mesmo numa matéria retomada.
    const sessao = iniciarSessao(conteudo.id, lote.atividades, deslocamentoLocal, {
      acertos: progresso?.acertos ?? 0,
      erros: progresso?.erros ?? 0,
    });
    renderizarAtividadeDoLote(areaExercicio, conteudo, lote, sessao, totalGlobal, aoMudarProgresso);
    rolarParaElemento(areaExercicio);
  };

  switch (estado) {
    case "concluido": {
      const aviso = criarElemento("div", { classes: ["lote__estado", "lote__estado--concluido"] });
      aviso.appendChild(criarElemento("span", { classes: ["lote__icone"], texto: "✓", atributos: { "aria-hidden": "true" } }));
      aviso.appendChild(criarElemento("p", { texto: "Bloco concluído." }));
      const revisar = criarElemento("button", {
        classes: ["botao", "botao--fantasma"],
        texto: "Revisar este bloco",
        atributos: { type: "button" },
      });
      // Revisão não mexe no progresso — é só treino.
      revisar.addEventListener("click", () => {
        const sessao = iniciarSessao(conteudo.id, lote.atividades, 0);
        renderizarAtividadeDoLote(areaExercicio, conteudo, lote, sessao, totalGlobal, aoMudarProgresso, true);
        rolarParaElemento(areaExercicio);
      });
      aviso.appendChild(revisar);
      areaExercicio.appendChild(aviso);
      break;
    }
    case "bloqueado": {
      const aviso = criarElemento("div", { classes: ["lote__estado", "lote__estado--bloqueado"] });
      aviso.appendChild(criarElemento("span", { classes: ["lote__icone"], texto: "🔒", atributos: { "aria-hidden": "true" } }));
      aviso.appendChild(criarElemento("p", { texto: "Conclua o bloco anterior para liberar este." }));
      areaExercicio.appendChild(aviso);
      break;
    }
    default: {
      const restantes = lote.indiceGlobalInicial + lote.atividades.length - concluidas;
      const botao = criarElemento("button", {
        classes: ["botao", "botao--primario"],
        texto:
          estado === "em-andamento"
            ? `Continuar bloco (faltam ${restantes})`
            : "Começar este bloco",
        atributos: { type: "button" },
      });
      botao.addEventListener("click", iniciar, { once: true });
      areaExercicio.appendChild(botao);
      break;
    }
  }

  return caixa;
}

/**
 * Motor de atividades aplicado a UM lote.
 *
 * "revisao = true" desliga a gravação de progresso: o aluno pode refazer um
 * bloco já concluído sem inflar acertos/erros nem alterar a contagem.
 */
function renderizarAtividadeDoLote(
  area: HTMLElement,
  conteudo: Conteudo,
  lote: LoteAtividades,
  estado: EstadoSessao,
  totalGlobal: number,
  aoMudarProgresso: () => void,
  revisao = false
): void {
  limparElemento(area);

  if (sessaoConcluida(estado)) {
    const fim = criarElemento("div", { classes: ["lote__estado", "lote__estado--concluido"] });
    fim.appendChild(criarElemento("span", { classes: ["lote__icone"], texto: "✓", atributos: { "aria-hidden": "true" } }));
    fim.appendChild(
      criarElemento("p", {
        texto: revisao ? "Revisão concluída. Bom treino!" : "Bloco concluído! Siga para a próxima etapa do módulo.",
      })
    );
    area.appendChild(fim);
    if (!revisao) {
      aoMudarProgresso();
    }
    return;
  }

  const atividade = atividadeAtual(estado);
  if (!atividade) return;

  const indiceGlobal = lote.indiceGlobalInicial + estado.indiceAtual;

  // O progresso mostrado é o da matéria inteira (não o do lote), para o aluno
  // nunca perder a referência de onde está no todo.
  area.appendChild(
    renderProgresso(
      revisao ? estado.indiceAtual + 1 : indiceGlobal + 1,
      revisao ? lote.atividades.length : totalGlobal,
      estado.acertos,
      estado.erros
    )
  );

  const { elemento: elementoQuestao, obterResposta } = renderQuestao(atividade);
  area.appendChild(elementoQuestao);

  // A área de ações fica DENTRO do card da questão, para que o feedback e a
  // explicação sejam anexados ali sem nunca remover a pergunta da tela.
  const areaAcoes = criarElemento("div", { classes: ["questao__acoes"] });
  elementoQuestao.appendChild(areaAcoes);

  const gravar = (acertou: boolean): void => {
    if (revisao) return;
    updateProgress(conteudo.id, {
      acertou,
      indiceAtividade: indiceGlobal,
      totalAtividades: totalGlobal,
    });
  };

  const seguir = (novoEstado: EstadoSessao): void => {
    renderizarAtividadeDoLote(area, conteudo, lote, avancarAtividade(novoEstado), totalGlobal, aoMudarProgresso, revisao);
    rolarParaElemento(area);
  };

  const botaoVerificar = criarElemento("button", {
    classes: ["botao", "botao--primario"],
    texto: "Verificar resposta",
    atributos: { type: "button" },
  });
  areaAcoes.appendChild(botaoVerificar);

  aoClicarUmaVez(botaoVerificar, () => {
    const resultado = processarResposta(estado, obterResposta());
    limparElemento(areaAcoes);

    if (resultado.correta) {
      areaAcoes.appendChild(renderFeedback(true, atividade.explicacao));
      gravar(true);
      const proximo = criarElemento("button", {
        classes: ["botao", "botao--primario"],
        texto: "Próxima atividade",
        atributos: { type: "button" },
      });
      aoClicarUmaVez(proximo, () => seguir(resultado.estado));
      areaAcoes.appendChild(proximo);
      rolarParaElemento(elementoQuestao);
      return;
    }

    if (resultado.primeiraTentativa) {
      areaAcoes.appendChild(renderFeedback(false, "", atividade.dica));
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
      aoClicarUmaVez(tentarNovamente, () => {
        renderizarAtividadeDoLote(area, conteudo, lote, resultado.estado, totalGlobal, aoMudarProgresso, revisao);
        rolarParaElemento(area);
      });
      aoClicarUmaVez(verExplicacao, () => {
        const estadoComDesistencia = registrarDesistencia(resultado.estado);
        gravar(false);
        limparElemento(acoes);
        elementoQuestao.appendChild(renderCaixaExplicacao(atividade.explicacao));
        const proximo = criarElemento("button", {
          classes: ["botao", "botao--primario"],
          texto: "Próxima atividade",
          atributos: { type: "button" },
        });
        aoClicarUmaVez(proximo, () => seguir(estadoComDesistencia));
        elementoQuestao.appendChild(proximo);
        rolarParaElemento(elementoQuestao);
      });
      acoes.appendChild(tentarNovamente);
      acoes.appendChild(verExplicacao);
      areaAcoes.appendChild(acoes);
      rolarParaElemento(elementoQuestao);
      return;
    }

    // Segunda tentativa também errada: mostra a explicação em destaque e segue.
    areaAcoes.appendChild(renderFeedback(false, "", undefined));
    areaAcoes.appendChild(renderCaixaExplicacao(atividade.explicacao));
    gravar(false);
    const proximo = criarElemento("button", {
      classes: ["botao", "botao--primario"],
      texto: "Próxima atividade",
      atributos: { type: "button" },
    });
    aoClicarUmaVez(proximo, () => seguir(resultado.estado));
    areaAcoes.appendChild(proximo);
    rolarParaElemento(elementoQuestao);
  });
}

// ---------- Conclusão da matéria + certificado ----------

function montarConclusao(conteudo: Conteudo, totalGlobal: number, aoMudarProgresso: () => void): HTMLElement {
  // Os números vêm do localStorage, não do estado em memória. É a segunda
  // trava contra o bug 1: mesmo que uma sessão em memória estivesse
  // incompleta, o placar exibido aqui é o acumulado real da matéria.
  const progresso = getProgress(conteudo.id);
  const acertos = progresso?.acertos ?? 0;
  const erros = progresso?.erros ?? 0;
  const aproveitamento = totalGlobal > 0 ? acertos / totalGlobal : 0;

  const container = criarElemento("div", { classes: ["conclusao"] });

  container.appendChild(criarElemento("p", { classes: ["conclusao__selo"], texto: "Matéria concluída" }));
  container.appendChild(criarElemento("h3", { classes: ["conclusao__titulo"], texto: `Você terminou ${conteudo.titulo}!` }));

  const placar = criarElemento("div", { classes: ["conclusao__placar"] });
  const itemPlacar = (valor: string, rotulo: string, modificador: string) => {
    const item = criarElemento("div", { classes: ["placar-item", `placar-item--${modificador}`] });
    item.appendChild(criarElemento("span", { classes: ["placar-item__valor"], texto: valor }));
    item.appendChild(criarElemento("span", { classes: ["placar-item__rotulo"], texto: rotulo }));
    return item;
  };
  placar.appendChild(itemPlacar(String(acertos), "acertos", "acertos"));
  placar.appendChild(itemPlacar(String(erros), "erros", "erros"));
  placar.appendChild(itemPlacar(formatarPercentual(aproveitamento), "aproveitamento", "aproveitamento"));
  container.appendChild(placar);

  container.appendChild(montarCertificado(conteudo, acertos, totalGlobal));

  const botoes = criarElemento("div", { classes: ["conclusao__botoes"] });
  botoes.appendChild(
    criarElemento("a", {
      classes: ["botao", "botao--secundario"],
      texto: "Revisar a matéria",
      atributos: { href: "#topo-conteudo" },
    })
  );
  const refazer = criarElemento("button", {
    classes: ["botao", "botao--secundario"],
    texto: "Refazer do início",
    atributos: { type: "button" },
  });
  refazer.addEventListener("click", () => {
    if (window.confirm("Isso vai apagar seu progresso nesta matéria. Deseja refazer do início?")) {
      resetProgress(conteudo.id);
      aoMudarProgresso();
      rolarParaElemento(document.body);
    }
  });
  botoes.appendChild(refazer);
  botoes.appendChild(
    criarElemento("a", {
      classes: ["botao", "botao--secundario"],
      texto: "Voltar aos conteúdos",
      atributos: { href: `/pages/${conteudo.ano}ano.html` },
    })
  );
  container.appendChild(botoes);

  return container;
}

/**
 * Bloco do certificado: campo de nome + pré-visualização + download em PNG.
 * Não existe cadastro no site, então o nome é digitado aqui. Em branco,
 * o certificado sai como "Aluno(a)".
 */
function montarCertificado(conteudo: Conteudo, acertos: number, total: number): HTMLElement {
  const bloco = criarElemento("div", { classes: ["certificado"] });

  bloco.appendChild(criarElemento("h4", { classes: ["certificado__titulo"], texto: "Seu certificado" }));
  bloco.appendChild(
    criarElemento("p", {
      classes: ["certificado__ajuda"],
      texto: "Escreva seu nome como quer que apareça no certificado e baixe a imagem.",
    })
  );

  const formulario = criarElemento("div", { classes: ["certificado__form"] });
  const campo = criarElemento("input", {
    classes: ["certificado__input"],
    atributos: {
      type: "text",
      maxlength: "60",
      placeholder: "Seu nome completo",
      "aria-label": "Nome para o certificado",
      autocomplete: "name",
    },
  });
  const botaoBaixar = criarElemento("button", {
    classes: ["botao", "botao--rosa"],
    texto: "Baixar certificado",
    atributos: { type: "button" },
  });
  formulario.appendChild(campo);
  formulario.appendChild(botaoBaixar);
  bloco.appendChild(formulario);

  const previa = criarElemento("div", { classes: ["certificado__previa"] });
  bloco.appendChild(previa);

  const dados = () => ({
    nome: campo.value,
    materia: conteudo.titulo,
    ano: conteudo.ano,
    acertos,
    total,
  });

  const atualizarPrevia = (): void => {
    limparElemento(previa);
    const canvas = desenharCertificado(dados());
    canvas.classList.add("certificado__canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      `Prévia do certificado de ${campo.value.trim() || "Aluno(a)"} em ${conteudo.titulo}.`
    );
    previa.appendChild(canvas);
  };

  // Redesenha enquanto o aluno digita, sem redesenhar a cada tecla.
  let temporizador: number | undefined;
  campo.addEventListener("input", () => {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(atualizarPrevia, 250);
  });

  botaoBaixar.addEventListener("click", () => {
    baixarCertificado(dados());
  });

  atualizarPrevia();
  return bloco;
}

// ---------- Atividades extras (treino livre, sem afetar o progresso) ----------

function initAtividadesExtras(conteudo: Conteudo): void {
  const area = qs<HTMLElement>("[data-atividades-extras]");
  if (!area) return;

  if (conteudo.atividadesExtras.length === 0) {
    const secao = area.closest("section");
    if (secao instanceof HTMLElement) {
      secao.hidden = true;
    }
    return;
  }

  limparElemento(area);
  const loteExtra: LoteAtividades = {
    titulo: "Treino livre",
    atividades: conteudo.atividadesExtras,
    indiceGlobalInicial: 0,
  };

  const botao = criarElemento("button", {
    classes: ["botao", "botao--secundario"],
    texto: "Praticar atividades extras",
    atributos: { type: "button" },
  });
  botao.addEventListener(
    "click",
    () => {
      const sessao = iniciarSessao(conteudo.id, conteudo.atividadesExtras, 0);
      // revisao = true: treino extra nunca altera o progresso da matéria.
      renderizarAtividadeDoLote(area, conteudo, loteExtra, sessao, conteudo.atividadesExtras.length, () => {}, true);
    },
    { once: true }
  );
  area.appendChild(botao);
}

// ---------- Modo linear (conteúdo ainda sem módulos no JSON) ----------

function renderConteudoLinear(area: HTMLElement, conteudo: Conteudo): void {
  const aviso = criarElemento("p", {
    classes: ["estado-vazio"],
    texto: "Este conteúdo ainda não foi organizado em módulos. Exibindo no formato simples.",
  });
  area.appendChild(aviso);

  conteudo.teoria.forEach((bloco) => area.appendChild(renderBlocoTeoria(bloco)));
  conteudo.exemplos.forEach((exemplo, indice) => area.appendChild(renderExemplo(exemplo, indice + 1)));
  conteudo.dicas.forEach((dica) => area.appendChild(renderDica(dica)));
  conteudo.videos.forEach((video) => area.appendChild(renderVideo(video)));

  const lote: LoteAtividades = {
    titulo: "Atividades",
    atividades: conteudo.atividades,
    indiceGlobalInicial: 0,
  };
  const caixa = criarElemento("div", { classes: ["lote"] });
  area.appendChild(caixa);
  const progresso = getProgress(conteudo.id);
  const sessao = iniciarSessao(conteudo.id, conteudo.atividades, progresso?.concluidas ?? 0, {
    acertos: progresso?.acertos ?? 0,
    erros: progresso?.erros ?? 0,
  });
  renderizarAtividadeDoLote(caixa, conteudo, lote, sessao, conteudo.atividades.length, () => {});
}

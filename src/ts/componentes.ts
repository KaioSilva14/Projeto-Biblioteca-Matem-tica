// componentes.ts — componentes reutilizáveis da interface.
export {};

// componentes.ts
// Funções de renderização reutilizáveis (cards, questões, feedback, progresso, vídeo, etc.).
// Todas usam textContent/createElement — nunca innerHTML com dados dinâmicos (regra de segurança).

import type { Atividade, BlocoTeoria, ConteudoResumo, Exemplo, Modulo, Video } from "./types.js";
import { criarElemento, embaralhar } from "./utils.js";
import { formatarPercentual } from "./utils.js";
import { renderIlustracao } from "./ilustracoes.js";

const NOMES_NIVEL: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  aplicacao: "Aplicação",
  desafio: "Desafio",
};

const NOMES_CATEGORIA: Record<string, string> = {
  aritmetica: "Aritmética",
  algebra: "Álgebra",
  geometria: "Geometria",
  estatistica: "Estatística",
  probabilidade: "Probabilidade",
};

// ---------- Card genérico (ano ou conteúdo) ----------

export interface CardOpcoes {
  titulo: string;
  descricao: string;
  meta?: string; // ex.: "12 conteúdos" ou "Aritmética · Básico"
  cta: string; // texto do botão
  href: string;
  disponivel?: boolean; // false = card desabilitado, mostra "Em breve"
  destaque?: string; // ex.: número do ano em destaque
}

export function renderCard(opcoes: CardOpcoes): HTMLElement {
  const card = criarElemento("article", { classes: ["card"] });

  if (opcoes.destaque) {
    card.appendChild(criarElemento("p", { classes: ["card__destaque"], texto: opcoes.destaque }));
  }

  card.appendChild(criarElemento("h3", { classes: ["card__titulo"], texto: opcoes.titulo }));
  card.appendChild(criarElemento("p", { classes: ["card__descricao"], texto: opcoes.descricao }));

  if (opcoes.meta) {
    card.appendChild(criarElemento("p", { classes: ["card__meta"], texto: opcoes.meta }));
  }

  if (opcoes.disponivel === false) {
    card.classList.add("card--indisponivel");
    card.appendChild(
      criarElemento("span", { classes: ["card__badge"], texto: "Em breve" })
    );
  } else {
    const link = criarElemento("a", {
      classes: ["botao", "botao--primario"],
      texto: opcoes.cta,
      atributos: { href: opcoes.href },
    });
    card.appendChild(link);
  }

  return card;
}

export function renderCardConteudo(resumo: ConteudoResumo): HTMLElement {
  const partesMeta = [NOMES_CATEGORIA[resumo.categoria] ?? resumo.categoria, NOMES_NIVEL[resumo.nivel] ?? resumo.nivel];
  if (resumo.disponivel) {
    partesMeta.push(`${resumo.quantidadeAtividades} atividades`);
  }
  return renderCard({
    titulo: resumo.titulo,
    descricao: resumo.descricao,
    meta: partesMeta.join(" · "),
    cta: "Estudar",
    href: resumo.rota,
    disponivel: resumo.disponivel,
  });
}

// ---------- Breadcrumb ----------

export function renderBreadcrumb(itens: { texto: string; href?: string }[]): HTMLElement {
  const nav = criarElemento("nav", {
    classes: ["breadcrumb"],
    atributos: { "aria-label": "Você está aqui" },
  });
  const lista = criarElemento("ol", { classes: ["breadcrumb__lista"] });

  itens.forEach((item, indice) => {
    const li = criarElemento("li", { classes: ["breadcrumb__item"] });
    if (item.href) {
      const link = criarElemento("a", { texto: item.texto, atributos: { href: item.href } });
      li.appendChild(link);
    } else {
      li.appendChild(document.createTextNode(item.texto));
      li.setAttribute("aria-current", "page");
    }
    lista.appendChild(li);
    if (indice < itens.length - 1) {
      const separador = criarElemento("li", {
        classes: ["breadcrumb__separador"],
        texto: "›",
        atributos: { "aria-hidden": "true" },
      });
      lista.appendChild(separador);
    }
  });

  nav.appendChild(lista);
  return nav;
}

// ---------- Progresso ----------

export function renderProgresso(
  posicaoAtual: number,
  total: number,
  acertos: number,
  erros: number
): HTMLElement {
  const container = criarElemento("div", { classes: ["progresso"] });

  // posicaoAtual é 1-based (ex.: 1 = primeira atividade). A barra representa
  // quantas atividades já foram concluídas ANTES desta, ou seja, posicaoAtual - 1.
  const concluidasAntes = Math.max(posicaoAtual - 1, 0);
  const posicaoExibida = Math.min(Math.max(posicaoAtual, 1), total);

  const cabecalho = criarElemento("div", { classes: ["progresso__cabecalho"] });
  cabecalho.appendChild(
    criarElemento("span", {
      classes: ["progresso__contagem"],
      texto: `Atividade ${posicaoExibida} de ${total}`,
    })
  );
  const proporcao = total > 0 ? concluidasAntes / total : 0;
  cabecalho.appendChild(
    criarElemento("span", { classes: ["progresso__percentual"], texto: formatarPercentual(proporcao) })
  );
  container.appendChild(cabecalho);

  const barraFundo = criarElemento("div", {
    classes: ["progresso__barra"],
    atributos: {
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": String(total),
      "aria-valuenow": String(concluidasAntes),
    },
  });
  const barraPreenchida = criarElemento("div", { classes: ["progresso__preenchimento"] });
  barraPreenchida.style.width = `${Math.min(proporcao, 1) * 100}%`;
  barraFundo.appendChild(barraPreenchida);
  container.appendChild(barraFundo);

  const detalhes = criarElemento("div", { classes: ["progresso__detalhes"] });
  detalhes.appendChild(
    criarElemento("span", { classes: ["progresso__acertos"], texto: `Acertos: ${acertos}` })
  );
  detalhes.appendChild(
    criarElemento("span", { classes: ["progresso__erros"], texto: `Erros: ${erros}` })
  );
  container.appendChild(detalhes);

  return container;
}

// ---------- Feedback ----------

export function renderFeedback(correto: boolean, explicacao: string, dica?: string): HTMLElement {
  const container = criarElemento("div", {
    classes: ["feedback", correto ? "feedback--correto" : "feedback--incorreto"],
    atributos: { role: "status" },
  });

  const titulo = criarElemento("p", {
    classes: ["feedback__titulo"],
    texto: correto ? "✓ Resposta correta!" : "✕ Quase! Tente novamente.",
  });
  container.appendChild(titulo);

  if (!correto && dica) {
    container.appendChild(criarElemento("p", { classes: ["feedback__dica"], texto: `Dica: ${dica}` }));
  }

  if (correto && explicacao) {
    container.appendChild(criarElemento("p", { classes: ["feedback__explicacao"], texto: explicacao }));
  }

  return container;
}

/**
 * Caixa de explicação com destaque visual próprio (título + fundo diferenciado),
 * usada quando o aluno desiste de tentar de novo ou erra a segunda tentativa.
 * Antes disso ficava só um parágrafo solto, fácil de não notar — corrigido aqui.
 */
export function renderCaixaExplicacao(explicacao: string): HTMLElement {
  const container = criarElemento("div", {
    classes: ["feedback", "feedback--explicacao"],
    atributos: { role: "status" },
  });
  container.appendChild(criarElemento("p", { classes: ["feedback__titulo"], texto: "📘 Explicação" }));
  container.appendChild(criarElemento("p", { classes: ["feedback__explicacao"], texto: explicacao }));
  return container;
}

// ---------- Vídeo (clique para carregar — sem autoplay, sem pesar a página) ----------

export function renderVideo(video: Video): HTMLElement {
  const wrapper = criarElemento("figure", { classes: ["video"] });

  const botao = criarElemento("button", {
    classes: ["video__gatilho"],
    atributos: { type: "button", "aria-label": `Assistir: ${video.titulo}` },
  });

  const thumb = criarElemento("img", {
    classes: ["video__thumb"],
    atributos: { src: video.thumbnail, alt: `Capa do vídeo ${video.titulo}`, loading: "lazy" },
  });
  botao.appendChild(thumb);
  botao.appendChild(criarElemento("span", { classes: ["video__icone-play"], texto: "▶" }));

  botao.addEventListener("click", () => {
    const iframe = criarElemento("iframe", {
      classes: ["video__frame"],
      atributos: {
        src: `${video.url}${video.url.includes("?") ? "&" : "?"}autoplay=1`,
        title: video.titulo,
        allow: "accelerated-video; encrypted-media; picture-in-picture",
        allowfullscreen: "true",
        loading: "lazy",
      },
    });
    wrapper.replaceChild(iframe, botao);
  });

  wrapper.appendChild(botao);
  wrapper.appendChild(criarElemento("figcaption", { classes: ["video__legenda"], texto: `${video.titulo} — ${video.canal}` }));
  return wrapper;
}

// ---------- Resumo ----------

export function renderResumo(itens: string[]): HTMLElement {
  const lista = criarElemento("ul", { classes: ["resumo"] });
  itens.forEach((item) => {
    lista.appendChild(criarElemento("li", { texto: item }));
  });
  return lista;
}

// ---------- Renderização de questão por tipo de atividade ----------

export interface EstadoRenderQuestao {
  elemento: HTMLElement;
  obterResposta: () => unknown;
}

export function renderQuestao(atividade: Atividade): EstadoRenderQuestao {
  const container = criarElemento("div", { classes: ["questao"] });
  container.appendChild(
    criarElemento("span", {
      classes: ["questao__nivel"],
      texto: NOMES_NIVEL[atividade.nivel] ?? atividade.nivel,
    })
  );
  container.appendChild(criarElemento("p", { classes: ["questao__pergunta"], texto: atividade.pergunta }));

  // Apoio visual do enunciado (pedido da v2). A chave vem do JSON e é
  // resolvida pelo gerador paramétrico — ver ilustracoes.ts.
  if (atividade.ilustracao) {
    const figura = renderIlustracao(atividade.ilustracao);
    if (figura) {
      container.appendChild(figura);
    }
  }

  const corpo = criarElemento("div", { classes: ["questao__corpo"] });
  container.appendChild(corpo);

  let obterResposta: () => unknown = () => null;

  switch (atividade.tipo) {
    case "multipla_escolha": {
      const opcoesEmbaralhadas = embaralhar(atividade.opcoes.map((texto, indiceOriginal) => ({ texto, indiceOriginal })));
      let selecionado = -1;
      const lista = renderOpcoes(
        opcoesEmbaralhadas.map((o) => o.texto),
        (indiceExibido) => {
          selecionado = opcoesEmbaralhadas[indiceExibido].indiceOriginal;
        }
      );
      corpo.appendChild(lista);
      obterResposta = () => selecionado;
      break;
    }
    case "verdadeiro_falso": {
      let selecionado: boolean | null = null;
      const lista = renderOpcoes(["Verdadeiro", "Falso"], (indice) => {
        selecionado = indice === 0;
      });
      corpo.appendChild(lista);
      obterResposta = () => selecionado;
      break;
    }
    case "resposta_numerica":
    case "problema": {
      const input = criarElemento("input", {
        classes: ["questao__input"],
        atributos: {
          type: "text",
          inputmode: "decimal",
          "aria-label": "Digite sua resposta",
          placeholder: "Digite o número",
        },
      });
      corpo.appendChild(input);
      obterResposta = () => input.value;
      break;
    }
    case "complete": {
      const input = criarElemento("input", {
        classes: ["questao__input"],
        atributos: { type: "text", "aria-label": "Complete a frase", placeholder: "Complete aqui" },
      });
      corpo.appendChild(input);
      obterResposta = () => input.value;
      break;
    }
    case "encontre_erro": {
      const lista = renderOpcoesNumeradas(atividade.opcoes, () => {});
      let selecionado = -1;
      Array.from(lista.children).forEach((li, indice) => {
        const botao = li.querySelector("button");
        botao?.addEventListener("click", () => {
          selecionado = indice;
          Array.from(lista.children).forEach((el) => el.classList.remove("opcao--selecionada"));
          li.classList.add("opcao--selecionada");
        });
      });
      corpo.appendChild(lista);
      obterResposta = () => selecionado;
      break;
    }
    case "ordenacao": {
      const listaOrdenavel = criarElemento("ol", { classes: ["questao__ordenacao"] });
      let ordemAtual = atividade.itens.map((_, indice) => indice);
      const redesenhar = () => {
        while (listaOrdenavel.firstChild) {
          listaOrdenavel.removeChild(listaOrdenavel.firstChild);
        }
        ordemAtual.forEach((indiceItem, posicao) => {
          const li = criarElemento("li", { classes: ["questao__item-ordenavel"] });
          li.appendChild(criarElemento("span", { texto: atividade.itens[indiceItem] }));
          const controles = criarElemento("span", { classes: ["questao__controles-ordenacao"] });
          const botaoSubir = criarElemento("button", {
            texto: "▲",
            atributos: { type: "button", "aria-label": "Mover para cima" },
          });
          const botaoDescer = criarElemento("button", {
            texto: "▼",
            atributos: { type: "button", "aria-label": "Mover para baixo" },
          });
          botaoSubir.addEventListener("click", () => {
            if (posicao > 0) {
              [ordemAtual[posicao - 1], ordemAtual[posicao]] = [ordemAtual[posicao], ordemAtual[posicao - 1]];
              redesenhar();
            }
          });
          botaoDescer.addEventListener("click", () => {
            if (posicao < ordemAtual.length - 1) {
              [ordemAtual[posicao + 1], ordemAtual[posicao]] = [ordemAtual[posicao], ordemAtual[posicao + 1]];
              redesenhar();
            }
          });
          controles.appendChild(botaoSubir);
          controles.appendChild(botaoDescer);
          li.appendChild(controles);
          listaOrdenavel.appendChild(li);
        });
      };
      redesenhar();
      corpo.appendChild(listaOrdenavel);
      obterResposta = () => ordemAtual;
      break;
    }
    case "relacionamento": {
      const tabela = criarElemento("div", { classes: ["questao__relacionamento"] });
      const respostas: number[] = atividade.colunaA.map(() => -1);
      atividade.colunaA.forEach((itemA, indiceA) => {
        const linha = criarElemento("div", { classes: ["relacionamento__linha"] });
        linha.appendChild(criarElemento("span", { classes: ["relacionamento__item-a"], texto: itemA }));
        const select = criarElemento("select", {
          classes: ["relacionamento__select"],
          atributos: { "aria-label": `Relacione: ${itemA}` },
        });
        select.appendChild(criarElemento("option", { texto: "Selecione...", atributos: { value: "-1" } }));
        atividade.colunaB.forEach((itemB, indiceB) => {
          select.appendChild(criarElemento("option", { texto: itemB, atributos: { value: String(indiceB) } }));
        });
        select.addEventListener("change", () => {
          respostas[indiceA] = Number(select.value);
        });
        linha.appendChild(select);
        tabela.appendChild(linha);
      });
      corpo.appendChild(tabela);
      obterResposta = () => respostas;
      break;
    }
  }

  return { elemento: container, obterResposta };
}

/** Lista de opções clicáveis (usada em múltipla escolha e verdadeiro/falso). */
export function renderOpcoes(opcoes: string[], aoSelecionar: (indice: number) => void): HTMLElement {
  const lista = criarElemento("ul", { classes: ["questao__opcoes"] });
  opcoes.forEach((texto, indice) => {
    const li = criarElemento("li");
    const botao = criarElemento("button", {
      classes: ["opcao"],
      texto,
      atributos: { type: "button" },
    });
    botao.addEventListener("click", () => {
      Array.from(lista.querySelectorAll(".opcao")).forEach((el) => el.classList.remove("opcao--selecionada"));
      botao.classList.add("opcao--selecionada");
      aoSelecionar(indice);
    });
    li.appendChild(botao);
    lista.appendChild(li);
  });
  return lista;
}

/** Lista de opções numeradas (usada em "encontre o erro", onde a ordem não pode ser embaralhada). */
function renderOpcoesNumeradas(opcoes: string[], aoSelecionar: (indice: number) => void): HTMLElement {
  const lista = criarElemento("ul", { classes: ["questao__opcoes", "questao__opcoes--numeradas"] });
  opcoes.forEach((texto, indice) => {
    const li = criarElemento("li");
    const botao = criarElemento("button", {
      classes: ["opcao"],
      texto,
      atributos: { type: "button" },
    });
    botao.addEventListener("click", () => aoSelecionar(indice));
    li.appendChild(botao);
    lista.appendChild(li);
  });
  return lista;
}
// ---------- Blocos de conteúdo (usados dentro dos módulos da v2) ----------

const NOMES_NIVEL_MODULO: Record<string, string> = {
  basico: "Fundamentos",
  intermediario: "Prática",
  aplicacao: "Aplicação",
  desafio: "Desafio",
};

export function renderBlocoTeoria(bloco: BlocoTeoria): HTMLElement {
  const secao = criarElemento("div", { classes: ["teoria__bloco"] });
  secao.appendChild(criarElemento("h4", { classes: ["teoria__titulo"], texto: bloco.titulo }));
  bloco.paragrafos.forEach((paragrafo) => {
    secao.appendChild(criarElemento("p", { texto: paragrafo }));
  });
  if (bloco.ilustracao) {
    const figura = renderIlustracao(bloco.ilustracao);
    if (figura) {
      secao.appendChild(figura);
    }
  }
  if (bloco.destaque) {
    secao.appendChild(criarElemento("p", { classes: ["teoria__destaque"], texto: bloco.destaque }));
  }
  return secao;
}

export function renderExemplo(exemplo: Exemplo, numero: number): HTMLElement {
  const card = criarElemento("div", { classes: ["exemplo"] });
  card.appendChild(criarElemento("p", { classes: ["exemplo__rotulo"], texto: `Exemplo resolvido ${numero}` }));
  card.appendChild(criarElemento("p", { classes: ["exemplo__problema"], texto: exemplo.problema }));

  const passos = criarElemento("div", { classes: ["exemplo__passos"] });
  const linha = (rotulo: string, valor: string, classe?: string) => {
    const item = criarElemento("div", { classes: ["exemplo__passo"] });
    item.appendChild(criarElemento("span", { classes: ["exemplo__rotulo-passo"], texto: rotulo }));
    item.appendChild(criarElemento("span", { classes: classe ? [classe] : [], texto: valor }));
    return item;
  };
  passos.appendChild(linha("Estratégia", exemplo.estrategia));
  passos.appendChild(linha("Cálculo", exemplo.calculo, "exemplo__calculo"));
  passos.appendChild(linha("Resultado", exemplo.resultado, "exemplo__resultado"));
  card.appendChild(passos);

  card.appendChild(criarElemento("p", { classes: ["exemplo__explicacao"], texto: exemplo.explicacao }));
  return card;
}

export function renderDica(texto: string): HTMLElement {
  const caixa = criarElemento("div", { classes: ["dica"] });
  caixa.appendChild(criarElemento("span", { classes: ["dica__icone"], texto: "💡", atributos: { "aria-hidden": "true" } }));
  caixa.appendChild(criarElemento("p", { classes: ["dica__texto"], texto }));
  return caixa;
}

/** Cabeçalho de um módulo da trilha: número, título, objetivo e nível. */
export function renderCabecalhoModulo(modulo: Modulo, concluido: boolean): HTMLElement {
  const cabecalho = criarElemento("header", { classes: ["modulo__cabecalho"] });

  const selo = criarElemento("div", { classes: ["modulo__selo"] });
  selo.appendChild(criarElemento("span", { classes: ["modulo__selo-rotulo"], texto: "Módulo" }));
  selo.appendChild(criarElemento("span", { classes: ["modulo__selo-numero"], texto: String(modulo.numero) }));
  cabecalho.appendChild(selo);

  const textos = criarElemento("div", { classes: ["modulo__textos"] });
  textos.appendChild(criarElemento("h3", { classes: ["modulo__titulo"], texto: modulo.titulo }));
  textos.appendChild(criarElemento("p", { classes: ["modulo__objetivo"], texto: modulo.objetivo }));
  cabecalho.appendChild(textos);

  const etiquetas = criarElemento("div", { classes: ["modulo__etiquetas"] });
  etiquetas.appendChild(
    criarElemento("span", {
      classes: ["etiqueta", `etiqueta--${modulo.nivel}`],
      texto: NOMES_NIVEL_MODULO[modulo.nivel] ?? modulo.nivel,
    })
  );
  if (concluido) {
    etiquetas.appendChild(criarElemento("span", { classes: ["etiqueta", "etiqueta--concluido"], texto: "✓ Concluído" }));
  }
  cabecalho.appendChild(etiquetas);

  return cabecalho;
}

/** Barra fina de progresso da trilha inteira, fixada no topo da área de estudo. */
export function renderTrilhaResumo(concluidas: number, total: number): HTMLElement {
  const container = criarElemento("div", { classes: ["trilha-resumo"] });

  const topo = criarElemento("div", { classes: ["trilha-resumo__topo"] });
  topo.appendChild(criarElemento("span", { classes: ["trilha-resumo__rotulo"], texto: "Seu progresso na matéria" }));
  topo.appendChild(
    criarElemento("span", { classes: ["trilha-resumo__numeros"], texto: `${concluidas} de ${total} atividades` })
  );
  container.appendChild(topo);

  const proporcao = total > 0 ? concluidas / total : 0;
  const barra = criarElemento("div", {
    classes: ["trilha-resumo__barra"],
    atributos: {
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": String(total),
      "aria-valuenow": String(concluidas),
      "aria-label": "Progresso na matéria",
    },
  });
  const preenchimento = criarElemento("div", { classes: ["trilha-resumo__preenchimento"] });
  preenchimento.style.width = `${Math.min(proporcao, 1) * 100}%`;
  barra.appendChild(preenchimento);
  container.appendChild(barra);

  container.appendChild(
    criarElemento("span", { classes: ["trilha-resumo__percentual"], texto: formatarPercentual(proporcao) })
  );

  return container;
}

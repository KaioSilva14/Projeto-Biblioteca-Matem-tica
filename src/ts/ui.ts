// ui.ts — construção da interface da lição.
//
// Toda figura entra como <img> apontando para um PNG de /assets. A página
// não desenha nada em tempo de execução: as imagens são geradas antes, por
// ferramentas/gerar-imagens.mjs.

import type { Imagem, PassoResolvido, Questao, Licao } from "./tipos.js";
import { el, limpar, embaralhar } from "./util.js";

/** Índice de imagens carregado de /dados/imagens.json. */
export type IndiceImagens = Record<string, Imagem>;

export function renderImagem(indice: IndiceImagens, chave: string | undefined, classe = "figura"): HTMLElement | null {
  if (!chave) return null;
  const dados = indice[chave];
  if (!dados) return null;

  const figura = el("figure", { classe });
  const img = el("img", {
    classe: "figura__img",
    atributos: {
      src: dados.arquivo,
      alt: dados.alt,
      width: String(dados.largura),
      height: String(dados.altura),
      loading: "lazy",
      decoding: "async",
    },
  });
  figura.appendChild(img);
  return figura;
}

// ---------- Passo de raciocínio ----------

/**
 * Um passo mostra o PORQUÊ em texto corrido e a CONTA separada, em mono.
 * A separação é proposital: o aluno consegue reler só o raciocínio sem
 * tropeçar na aritmética, e vice-versa.
 */
export function renderPasso(indice: IndiceImagens, passo: PassoResolvido, numero: number): HTMLElement {
  const item = el("li", { classe: "passo" });

  const cabeca = el("div", { classe: "passo__cabeca" });
  cabeca.appendChild(el("span", { classe: "passo__num mono-sm", texto: String(numero) }));
  cabeca.appendChild(el("h4", { classe: "passo__titulo t-md-strong", texto: passo.titulo }));
  item.appendChild(cabeca);

  item.appendChild(el("p", { classe: "passo__texto t-md cor-body", texto: passo.explicacao }));

  if (passo.conta) {
    item.appendChild(el("p", { classe: "passo__conta mono", texto: passo.conta }));
  }
  const figura = renderImagem(indice, passo.imagem);
  if (figura) item.appendChild(figura);

  return item;
}

// ---------- Exemplo resolvido, revelado passo a passo ----------

export function renderResolvido(indice: IndiceImagens, licao: Licao): HTMLElement {
  const secao = el("section", { classe: "bloco", atributos: { "aria-labelledby": "titulo-resolvido" } });

  secao.appendChild(el("p", { classe: "eyebrow", texto: "Resolvido com você" }));
  secao.appendChild(el("h2", { classe: "d-sm", texto: "Vamos fazer um junto", atributos: { id: "titulo-resolvido" } }));

  const enunciado = el("div", { classe: "card enunciado" });
  enunciado.appendChild(el("p", { classe: "t-lg", texto: licao.resolvido.enunciado }));
  const figura = renderImagem(indice, licao.resolvido.imagem);
  if (figura) enunciado.appendChild(figura);
  secao.appendChild(enunciado);

  const lista = el("ol", { classe: "passos" });
  secao.appendChild(lista);

  const acoes = el("div", { classe: "bloco__acoes" });
  const btnProximo = el("button", {
    classe: "botao botao--primario",
    texto: "Mostrar o primeiro passo",
    atributos: { type: "button" },
  });
  const btnTudo = el("button", {
    classe: "botao botao--nu",
    texto: "Mostrar tudo",
    atributos: { type: "button" },
  });
  acoes.appendChild(btnProximo);
  acoes.appendChild(btnTudo);
  secao.appendChild(acoes);

  const fecho = el("div", { classe: "fecho" });
  fecho.appendChild(el("p", { classe: "t-md", texto: licao.resolvido.fecho }));
  fecho.hidden = true;
  secao.appendChild(fecho);

  let mostrados = 0;
  const total = licao.resolvido.passos.length;

  const revelar = (quantos: number): void => {
    while (mostrados < Math.min(quantos, total)) {
      lista.appendChild(renderPasso(indice, licao.resolvido.passos[mostrados], mostrados + 1));
      mostrados += 1;
    }
    if (mostrados >= total) {
      acoes.hidden = true;
      fecho.hidden = false;
    } else {
      btnProximo.textContent = `Próximo passo (${mostrados} de ${total})`;
    }
  };

  btnProximo.addEventListener("click", () => revelar(mostrados + 1));
  btnTudo.addEventListener("click", () => revelar(total));

  return secao;
}

// ---------- Questão ----------

export interface QuestaoMontada {
  elemento: HTMLElement;
  lerResposta: () => unknown;
  travar: () => void;
}

export function renderQuestao(indice: IndiceImagens, questao: Questao, posicao: number, total: number): QuestaoMontada {
  const card = el("article", { classe: "questao card" });

  const topo = el("div", { classe: "questao__topo" });
  topo.appendChild(el("span", { classe: "eyebrow", texto: `Questão ${posicao} de ${total}` }));
  if (questao.fonte) {
    const fonte = questao.fonte;
    const marca = el("span", {
      classe: "pilula",
      texto: `${fonte.prova} ${fonte.ano}`,
      atributos: { title: fonte.referencia },
    });
    topo.appendChild(marca);
  }
  card.appendChild(topo);

  card.appendChild(el("p", { classe: "questao__enunciado t-lg", texto: questao.enunciado }));

  const figura = renderImagem(indice, questao.imagem, "figura figura--questao");
  if (figura) card.appendChild(figura);

  const corpo = el("div", { classe: "questao__corpo" });
  card.appendChild(corpo);

  let lerResposta: () => unknown = () => null;
  let travar: () => void = () => {};

  if (questao.formato === "alternativas") {
    let escolhida = -1;
    const lista = el("div", { classe: "alternativas", atributos: { role: "radiogroup", "aria-label": "Alternativas" } });

    // A ordem é embaralhada para a posição da resposta não virar pista.
    const ordem = embaralhar(questao.alternativas.map((alt, i) => ({ alt, original: i })));
    const botoes: HTMLButtonElement[] = [];

    ordem.forEach(({ alt, original }, exibida) => {
      const botao = el("button", {
        classe: "alternativa",
        atributos: { type: "button", role: "radio", "aria-checked": "false" },
      });
      botao.appendChild(el("span", { classe: "alternativa__letra mono-sm", texto: letra(exibida) }));
      botao.appendChild(el("span", { classe: "alternativa__texto t-md", texto: alt.texto }));
      botao.addEventListener("click", () => {
        escolhida = original;
        botoes.forEach((b) => {
          b.classList.remove("alternativa--marcada");
          b.setAttribute("aria-checked", "false");
        });
        botao.classList.add("alternativa--marcada");
        botao.setAttribute("aria-checked", "true");
      });
      botoes.push(botao);
      lista.appendChild(botao);
    });

    corpo.appendChild(lista);
    lerResposta = () => escolhida;
    travar = () => botoes.forEach((b) => { b.disabled = true; });
  } else {
    const linha = el("div", { classe: "resposta-numero" });
    const campo = el("input", {
      classe: "campo campo--numero",
      atributos: {
        type: "text",
        inputmode: "decimal",
        autocomplete: "off",
        placeholder: "sua resposta",
        "aria-label": "Digite sua resposta",
      },
    });
    linha.appendChild(campo);
    if (questao.unidade) {
      linha.appendChild(el("span", { classe: "resposta-numero__unidade t-md cor-mute", texto: questao.unidade }));
    }
    corpo.appendChild(linha);
    lerResposta = () => campo.value;
    travar = () => { campo.disabled = true; };
  }

  return { elemento: card, lerResposta, travar };
}

function letra(indice: number): string {
  return String.fromCharCode(65 + indice);
}

// ---------- Retornos de correção ----------

export function renderAcerto(mensagem: string): HTMLElement {
  const caixa = el("div", { classe: "retorno retorno--acerto", atributos: { role: "status" } });
  caixa.appendChild(el("p", { classe: "retorno__titulo t-md-strong", texto: "Isso." }));
  caixa.appendChild(el("p", { classe: "retorno__texto t-md", texto: mensagem }));
  return caixa;
}

/**
 * Retorno de erro. Quando o conteúdo previu aquele erro específico, o texto
 * fala do engano que o aluno cometeu, e não uma mensagem genérica de
 * "resposta incorreta" — que não ensina nada.
 */
export function renderErro(diagnostico: string | undefined, dica: string, primeiraVez: boolean): HTMLElement {
  const caixa = el("div", { classe: "retorno retorno--erro", atributos: { role: "status" } });
  caixa.appendChild(
    el("p", {
      classe: "retorno__titulo t-md-strong",
      texto: diagnostico ? "Quase — e dá para ver onde travou." : "Ainda não.",
    })
  );
  if (diagnostico) {
    caixa.appendChild(el("p", { classe: "retorno__texto t-md", texto: diagnostico }));
  } else if (primeiraVez) {
    caixa.appendChild(el("p", { classe: "retorno__texto t-md", texto: dica }));
  }
  return caixa;
}

export function renderResolucao(indice: IndiceImagens, questao: Questao, resposta: string): HTMLElement {
  const caixa = el("div", { classe: "resolucao" });
  caixa.appendChild(el("p", { classe: "eyebrow", texto: "Como se resolve" }));

  const lista = el("ol", { classe: "passos passos--compacto" });
  questao.resolucao.forEach((passo, i) => lista.appendChild(renderPasso(indice, passo, i + 1)));
  caixa.appendChild(lista);

  const final = el("p", { classe: "resolucao__resposta" });
  final.appendChild(el("span", { classe: "t-sm cor-mute", texto: "Resposta: " }));
  final.appendChild(el("span", { classe: "mono", texto: resposta }));
  caixa.appendChild(final);

  return caixa;
}

// ---------- Barra de progresso da lição ----------

export function renderProgressoLicao(feitas: number, total: number): HTMLElement {
  const caixa = el("div", { classe: "progresso" });
  const trilho = el("div", {
    classe: "progresso__trilho",
    atributos: {
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": String(total),
      "aria-valuenow": String(feitas),
      "aria-label": "Questões respondidas nesta lição",
    },
  });
  const barra = el("div", { classe: "progresso__barra" });
  barra.style.width = `${total > 0 ? (feitas / total) * 100 : 0}%`;
  trilho.appendChild(barra);
  caixa.appendChild(trilho);
  caixa.appendChild(el("span", { classe: "progresso__conta mono-sm", texto: `${feitas}/${total}` }));
  return caixa;
}

export { limpar };

// ---------- Vídeo de aprofundamento ----------
//
// O vídeo NÃO é a aula: a lição já ensinou. Ele fica numa seção própria, com
// uma descrição dizendo para quem e para quando serve.
//
// A miniatura entra como imagem e o iframe só é criado no clique. Assim a
// página não carrega um player do YouTube que talvez ninguém use, e o
// navegador não fala com o YouTube enquanto o aluno não pedir.

export function renderVideo(video: VideoCurso): HTMLElement {
  const card = el("article", { classe: "video" });

  const gatilho = el("button", {
    classe: "video__capa",
    atributos: { type: "button", "aria-label": `Assistir: ${video.titulo}` },
  });
  gatilho.appendChild(
    el("img", {
      classe: "video__thumb",
      atributos: {
        src: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
        alt: "",
        loading: "lazy",
        width: "480",
        height: "360",
      },
    })
  );
  gatilho.appendChild(el("span", { classe: "video__play", texto: "▶", atributos: { "aria-hidden": "true" } }));

  gatilho.addEventListener("click", () => {
    const frame = el("iframe", {
      classe: "video__frame",
      atributos: {
        src: `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`,
        title: video.titulo,
        allow: "accelerometer; encrypted-media; picture-in-picture; fullscreen",
        allowfullscreen: "true",
        loading: "lazy",
      },
    });
    gatilho.replaceWith(frame);
  });

  card.appendChild(gatilho);

  const corpo = el("div", { classe: "video__corpo" });
  corpo.appendChild(el("p", { classe: "video__canal eyebrow", texto: video.canal }));
  corpo.appendChild(el("h3", { classe: "video__titulo t-md-strong", texto: video.titulo }));
  corpo.appendChild(el("p", { classe: "video__descricao t-sm cor-body", texto: video.descricao }));
  card.appendChild(corpo);

  return card;
}

export interface VideoCurso {
  id: string;
  titulo: string;
  canal: string;
  descricao: string;
}

// ---------- Bloco do certificado ----------
//
// O bloco da matéria e o do ano compartilham toda a máquina — campo de nome,
// prévia em canvas, download e o aviso sobre o armazenamento local. O que
// muda entre os dois é só o texto, então a diferença fica em quem chama, e
// não numa segunda cópia de sessenta linhas.

interface OpcoesBaseCertificado {
  eyebrow: string;
  concluido: boolean;
  tituloPendente: string;
  textoPendente: string;
  notaPendente: string;
  tituloConcluido: string;
  textoConcluido: string;
  rotuloBotao: string;
  nomeSalvo: string;
  aoEmitir: (nome: string) => void;
  desenhar: (nome: string) => HTMLCanvasElement;
  aoBaixar: (nome: string) => void;
}

function renderBlocoCertificado(opcoes: OpcoesBaseCertificado): HTMLElement {
  const bloco = el("section", { classe: "certificado card" });
  bloco.appendChild(el("p", { classe: "eyebrow", texto: opcoes.eyebrow }));

  if (!opcoes.concluido) {
    bloco.appendChild(el("h2", { classe: "d-sm certificado__titulo", texto: opcoes.tituloPendente }));
    bloco.appendChild(el("p", { classe: "t-md cor-body", texto: opcoes.textoPendente }));
    bloco.appendChild(el("p", { classe: "t-sm cor-mute", texto: opcoes.notaPendente }));
    return bloco;
  }

  bloco.appendChild(el("h2", { classe: "d-sm certificado__titulo", texto: opcoes.tituloConcluido }));
  bloco.appendChild(el("p", { classe: "t-md cor-body", texto: opcoes.textoConcluido }));

  const form = el("div", { classe: "certificado__form" });
  const campo = el("input", {
    classe: "campo certificado__campo",
    atributos: {
      type: "text",
      maxlength: "60",
      placeholder: "Seu nome completo",
      "aria-label": "Nome para o certificado",
      autocomplete: "name",
      value: opcoes.nomeSalvo,
    },
  });
  campo.value = opcoes.nomeSalvo;

  const baixar = el("button", {
    classe: "botao botao--primario",
    texto: opcoes.rotuloBotao,
    atributos: { type: "button" },
  });
  form.appendChild(campo);
  form.appendChild(baixar);
  bloco.appendChild(form);

  const previa = el("div", { classe: "certificado__previa" });
  bloco.appendChild(previa);

  const atualizar = (): void => {
    limpar(previa);
    const canvas = opcoes.desenhar(campo.value);
    canvas.classList.add("certificado__canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `Prévia do certificado de ${campo.value.trim() || "Aluno(a)"}.`);
    previa.appendChild(canvas);
  };

  let temporizador: number | undefined;
  campo.addEventListener("input", () => {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => {
      opcoes.aoEmitir(campo.value);
      atualizar();
    }, 300);
  });

  baixar.addEventListener("click", () => {
    opcoes.aoEmitir(campo.value);
    opcoes.aoBaixar(campo.value);
  });

  bloco.appendChild(
    el("p", {
      classe: "t-sm cor-mute certificado__aviso",
      texto:
        "O certificado fica salvo só neste navegador, nesta máquina — não há cadastro nem servidor guardando nada. Se você limpar os dados do navegador, ele some. Baixe o arquivo para não depender disso.",
    })
  );

  atualizar();
  return bloco;
}

export interface OpcoesCertificado {
  concluido: boolean;
  licoesConcluidas: number;
  totalLicoes: number;
  questoes: number;
  acertosDePrimeira: number;
  nomeSalvo: string;
  aoEmitir: (nome: string) => void;
  desenhar: (nome: string) => HTMLCanvasElement;
  aoBaixar: (nome: string) => void;
}

/**
 * Enquanto a matéria não termina, o bloco mostra o que falta. Depois de
 * concluída, ele pede o nome e libera a prévia e o download.
 *
 * O aviso sobre o armazenamento local não é decoração: como não há cadastro,
 * limpar os dados do navegador apaga o certificado, e o aluno precisa saber
 * disso antes de contar com ele.
 */
export function renderCertificado(opcoes: OpcoesCertificado): HTMLElement {
  const faltam = opcoes.totalLicoes - opcoes.licoesConcluidas;
  return renderBlocoCertificado({
    eyebrow: "Certificado",
    concluido: opcoes.concluido,
    tituloPendente: "Ainda não liberado",
    textoPendente:
      faltam === 1
        ? "Falta 1 lição para você concluir a matéria e emitir o certificado."
        : `Faltam ${faltam} lições para você concluir a matéria e emitir o certificado.`,
    notaPendente: `${opcoes.licoesConcluidas} de ${opcoes.totalLicoes} lições concluídas até agora.`,
    tituloConcluido: "Matéria concluída",
    textoConcluido: `Você respondeu as ${opcoes.questoes} questões da matéria e acertou ${opcoes.acertosDePrimeira} de primeira. Escreva seu nome como quer que apareça no certificado.`,
    rotuloBotao: "Baixar certificado",
    nomeSalvo: opcoes.nomeSalvo,
    aoEmitir: opcoes.aoEmitir,
    desenhar: opcoes.desenhar,
    aoBaixar: opcoes.aoBaixar,
  });
}

export interface OpcoesCertificadoAno {
  ano: number;
  concluido: boolean;
  materiasConcluidas: number;
  totalMaterias: number;
  licoes: number;
  questoes: number;
  acertosDePrimeira: number;
  nomeSalvo: string;
  aoEmitir: (nome: string) => void;
  desenhar: (nome: string) => HTMLCanvasElement;
  aoBaixar: (nome: string) => void;
}

/**
 * O certificado do ano inteiro, no pé da página do ano.
 *
 * Ele só aparece quando TODAS as matérias daquele ano já estão publicadas —
 * num ano com matéria por escrever, um bloco dizendo "faltam 6" cobraria do
 * aluno uma coisa que ele não tem como fazer.
 */
export function renderCertificadoAno(opcoes: OpcoesCertificadoAno): HTMLElement {
  const faltam = opcoes.totalMaterias - opcoes.materiasConcluidas;
  return renderBlocoCertificado({
    eyebrow: `Certificado do ${opcoes.ano}º ano`,
    concluido: opcoes.concluido,
    tituloPendente: "Ano ainda em andamento",
    textoPendente:
      faltam === 1
        ? "Falta 1 matéria para você concluir o ano inteiro e emitir o certificado do ano."
        : `Faltam ${faltam} matérias para você concluir o ano inteiro e emitir o certificado do ano.`,
    notaPendente: `${opcoes.materiasConcluidas} de ${opcoes.totalMaterias} matérias concluídas até agora. Cada matéria também tem o certificado dela.`,
    tituloConcluido: `${opcoes.ano}º ano concluído`,
    textoConcluido: `Você terminou as ${opcoes.totalMaterias} matérias do ${opcoes.ano}º ano: ${opcoes.licoes} lições e ${opcoes.questoes} questões, com ${opcoes.acertosDePrimeira} acertadas de primeira. Escreva seu nome como quer que apareça no certificado.`,
    rotuloBotao: "Baixar certificado do ano",
    nomeSalvo: opcoes.nomeSalvo,
    aoEmitir: opcoes.aoEmitir,
    desenhar: opcoes.desenhar,
    aoBaixar: opcoes.aoBaixar,
  });
}

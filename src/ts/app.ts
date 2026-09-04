// app.ts — ponto de entrada.
//
// Quatro páginas, identificadas por data-pagina no <body>:
//   inicio  -> os quatro anos + certificados conquistados
//   ano     -> as matérias de um ano          (?a=6)
//   curso   -> uma matéria: lições, vídeos, certificado   (?c=fracoes)
//   licao   -> uma lição                      (?c=fracoes&l=o-que-e)
//
// Não há roteador. curso.html serve qualquer matéria e licao.html qualquer
// lição: adicionar conteúdo é escrever JSON e citá-lo no catálogo.

import type { Catalogo, Certificado, Curso, Licao, Questao, ProgressoLicao } from "./tipos.js";
import { corrigir, respostaCorreta } from "./correcao.js";
import {
  lerLicao, registrarResposta, reiniciarLicao, reiniciarCurso, lerCurso,
  proximaLicao, resumirCurso, lerCertificado, emitirCertificado, listarCertificados,
} from "./progresso.js";
import { desenharCertificado, baixarCertificado } from "./certificado.js";
import {
  renderResolvido, renderQuestao, renderAcerto, renderErro, renderResolucao,
  renderProgressoLicao, renderImagem, renderVideo, renderCertificado,
  type IndiceImagens,
} from "./ui.js";
import { qs, el, limpar, rolarAte, parametro } from "./util.js";

const CATALOGO = "/dados/catalogo.json";

async function json<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  switch (document.body.dataset.pagina) {
    case "inicio": void iniciarHome(); break;
    case "ano": void iniciarAno(); break;
    case "curso": void iniciarCurso(); break;
    case "licao": void iniciarLicao(); break;
  }
});

function initMenu(): void {
  const botao = qs<HTMLButtonElement>("[data-menu]");
  const lista = qs<HTMLElement>("[data-menu-lista]");
  if (!botao || !lista) return;
  botao.addEventListener("click", () => {
    const aberto = lista.classList.toggle("nav__links--aberto");
    botao.setAttribute("aria-expanded", String(aberto));
  });
}

function recado(alvo: HTMLElement, texto: string): void {
  limpar(alvo);
  alvo.appendChild(el("p", { classe: "t-lg cor-body", texto }));
}

// ---------- Home ----------

async function iniciarHome(): Promise<void> {
  const catalogo = await json<Catalogo>(CATALOGO);
  const grade = qs<HTMLElement>("[data-anos]");
  if (!catalogo || !grade) return;

  limpar(grade);
  for (const ano of catalogo.anos) {
    const prontos = ano.cursos.filter((c) => c.disponivel).length;
    const card = el("a", { classe: "ano-card card", atributos: { href: `/ano.html?a=${ano.ano}` } });
    card.appendChild(el("p", { classe: "eyebrow", texto: `${ano.ano}º ano` }));
    card.appendChild(el("h3", { classe: "d-sm ano-card__titulo", texto: ano.titulo }));
    card.appendChild(el("p", { classe: "t-sm cor-body ano-card__texto", texto: ano.descricao }));
    card.appendChild(
      el("p", {
        classe: "mono-sm cor-mute ano-card__conta",
        texto: `${prontos} de ${ano.cursos.length} matérias prontas`,
      })
    );
    grade.appendChild(card);
  }

  // Certificados já conquistados nesta máquina.
  const areaCert = qs<HTMLElement>("[data-certificados]");
  if (areaCert) {
    const certificados = listarCertificados();
    limpar(areaCert);
    if (certificados.length === 0) {
      areaCert.hidden = true;
    } else {
      areaCert.hidden = false;
      areaCert.appendChild(el("h2", { classe: "d-md secao__titulo", texto: "Seus certificados" }));
      const lista = el("div", { classe: "lista" });
      for (const c of certificados) {
        const linha = el("a", {
          classe: "linha linha--licao",
          atributos: { href: `/curso.html?c=${c.cursoId}#certificado` },
        });
        linha.appendChild(el("span", { classe: "linha__num", texto: "✓" }));
        const corpo = el("div", { classe: "linha__corpo" });
        corpo.appendChild(el("span", { classe: "linha__titulo", texto: c.cursoTitulo }));
        corpo.appendChild(
          el("p", {
            classe: "linha__nota",
            texto: `${c.nome.trim() || "Aluno(a)"} · ${c.acertosDePrimeira} de ${c.questoes} de primeira`,
          })
        );
        linha.appendChild(corpo);
        linha.appendChild(
          el("span", {
            classe: "linha__fim mono-sm",
            texto: new Date(c.data).toLocaleDateString("pt-BR"),
          })
        );
        lista.appendChild(linha);
      }
      areaCert.appendChild(lista);
    }
  }
}

// ---------- Página de ano ----------

async function iniciarAno(): Promise<void> {
  const alvo = qs<HTMLElement>("[data-cursos]");
  if (!alvo) return;

  const catalogo = await json<Catalogo>(CATALOGO);
  const numero = Number(parametro("a"));
  const ano = catalogo?.anos.find((a) => a.ano === numero);
  if (!ano) return recado(alvo, "Não encontramos esse ano. Volte ao início e escolha de novo.");

  document.title = `Matemática do ${ano.ano}º ano — Biblioteca Matemática`;
  const cabecalho = qs<HTMLElement>("[data-cabecalho]");
  if (cabecalho) {
    limpar(cabecalho);
    cabecalho.appendChild(el("p", { classe: "eyebrow", texto: `${ano.ano}º ano · Ensino Fundamental` }));
    cabecalho.appendChild(el("h1", { classe: "d-lg", texto: ano.titulo }));
    cabecalho.appendChild(el("p", { classe: "t-lg cor-body leitura", texto: ano.descricao }));
  }

  limpar(alvo);
  for (const item of ano.cursos) {
    const disponivel = item.disponivel;
    const linha = el(disponivel ? "a" : "div", {
      classe: `linha linha--curso${disponivel ? "" : " linha--indisponivel"}`,
    });
    if (disponivel) linha.setAttribute("href", `/curso.html?c=${item.id}`);

    const marca = el("span", { classe: "linha__num" });
    if (disponivel) {
      const resumo = lerCurso(item.id);
      const temCertificado = Boolean(resumo.certificado);
      marca.textContent = temCertificado ? "✓" : "→";
      if (temCertificado) linha.classList.add("linha--feita");
    } else {
      marca.textContent = "·";
    }
    linha.appendChild(marca);

    const corpo = el("div", { classe: "linha__corpo" });
    corpo.appendChild(el("span", { classe: "linha__titulo", texto: item.titulo }));
    corpo.appendChild(el("p", { classe: "linha__nota", texto: item.resumo }));
    linha.appendChild(corpo);

    linha.appendChild(
      el("span", {
        classe: "linha__fim mono-sm",
        texto: disponivel ? "estudar" : "em breve",
      })
    );
    alvo.appendChild(linha);
  }
}

// ---------- Página de curso ----------

async function iniciarCurso(): Promise<void> {
  const alvo = qs<HTMLElement>("[data-curso]");
  if (!alvo) return;

  const catalogo = await json<Catalogo>(CATALOGO);
  const id = parametro("c");
  const item = catalogo?.anos.flatMap((a) => a.cursos).find((c) => c.id === id);
  if (!item?.arquivo) return recado(alvo, "Essa matéria ainda não está disponível.");

  const curso = await json<Curso>(item.arquivo);
  if (!curso) return recado(alvo, "Não foi possível carregar essa matéria.");

  const licoes = (await Promise.all(curso.licoes.map((l) => json<Licao>(l.arquivo))))
    .filter((l): l is Licao => l !== null);

  document.title = `${curso.titulo} — Biblioteca Matemática`;

  const cabecalho = qs<HTMLElement>("[data-cabecalho]");
  if (cabecalho) {
    limpar(cabecalho);
    const trilha = el("p", { classe: "eyebrow" });
    trilha.appendChild(el("a", { texto: `${curso.ano}º ano`, atributos: { href: `/ano.html?a=${curso.ano}` } }));
    trilha.appendChild(el("span", { texto: " · Matemática" }));
    cabecalho.appendChild(trilha);
    cabecalho.appendChild(el("h1", { classe: "d-lg", texto: curso.titulo }));
    cabecalho.appendChild(el("p", { classe: "t-lg cor-body leitura", texto: curso.descricao }));
  }

  const desenhar = (): void => {
    limpar(alvo);

    const contagem = licoes.map((l) => ({ id: l.id, questoes: l.questoes.length }));
    const resumo = resumirCurso(curso.id, contagem);
    const totalQuestoes = contagem.reduce((s, l) => s + l.questoes, 0);

    // --- barra de continuidade ---
    const topo = el("div", { classe: "curso__topo" });
    const proxima = proximaLicao(curso.id, licoes.map((l) => l.id));
    const acao = el("a", {
      classe: "botao botao--primario",
      texto: proxima
        ? resumo.licoesConcluidas === 0
          ? "Começar pela lição 1"
          : "Continuar de onde parei"
        : "Revisar desde o início",
      atributos: { href: `/licao.html?c=${curso.id}&l=${proxima ?? licoes[0]?.id ?? ""}` },
    });
    topo.appendChild(acao);
    topo.appendChild(
      el("span", {
        classe: "mono-sm cor-mute",
        texto: `${resumo.licoesConcluidas} de ${licoes.length} lições · ${resumo.questoesRespondidas} de ${totalQuestoes} questões`,
      })
    );
    alvo.appendChild(topo);

    // --- lições ---
    const secaoLicoes = el("section", { classe: "bloco" });
    secaoLicoes.appendChild(el("h2", { classe: "d-md secao__titulo", texto: "As lições" }));
    const lista = el("div", { classe: "lista" });
    const progressoCurso = lerCurso(curso.id);

    licoes.forEach((licao) => {
      const p = progressoCurso.licoes[licao.id];
      const linha = el("a", {
        classe: "linha linha--licao",
        atributos: { href: `/licao.html?c=${curso.id}&l=${licao.id}` },
      });
      linha.appendChild(el("span", { classe: "linha__num", texto: String(licao.numero).padStart(2, "0") }));
      const corpo = el("div", { classe: "linha__corpo" });
      corpo.appendChild(el("span", { classe: "linha__titulo", texto: licao.titulo }));
      corpo.appendChild(el("p", { classe: "linha__nota", texto: licao.pergunta }));
      linha.appendChild(corpo);

      const fim = el("span", { classe: "linha__fim mono-sm" });
      if (p?.concluida) {
        fim.textContent = `${p.acertadas.length}/${licao.questoes.length} de primeira`;
        linha.classList.add("linha--feita");
      } else if (p && p.respondidas.length > 0) {
        fim.textContent = `${p.respondidas.length}/${licao.questoes.length}`;
      } else {
        fim.textContent = `${licao.questoes.length} questões`;
      }
      linha.appendChild(fim);
      lista.appendChild(linha);
    });
    secaoLicoes.appendChild(lista);
    alvo.appendChild(secaoLicoes);

    // --- certificado ---
    const salvo = lerCertificado(curso.id);
    const areaCert = el("div", { atributos: { id: "certificado" } });
    areaCert.appendChild(
      renderCertificado({
        concluido: resumo.concluido,
        licoesConcluidas: resumo.licoesConcluidas,
        totalLicoes: licoes.length,
        questoes: totalQuestoes,
        acertosDePrimeira: resumo.acertosDePrimeira,
        nomeSalvo: salvo?.nome ?? "",
        aoEmitir: (nome) => {
          emitirCertificado(montarCertificado(curso, nome, totalQuestoes, resumo.acertosDePrimeira, salvo));
        },
        desenhar: (nome) =>
          desenharCertificado(montarCertificado(curso, nome, totalQuestoes, resumo.acertosDePrimeira, salvo)),
        aoBaixar: (nome) =>
          baixarCertificado(montarCertificado(curso, nome, totalQuestoes, resumo.acertosDePrimeira, salvo)),
      })
    );
    alvo.appendChild(areaCert);

    // --- vídeos ---
    if (curso.videos.length > 0) {
      const secaoVideos = el("section", { classe: "bloco" });
      secaoVideos.appendChild(el("p", { classe: "eyebrow", texto: "Para se aprofundar" }));
      secaoVideos.appendChild(el("h2", { classe: "d-md secao__titulo", texto: "Vídeos" }));
      secaoVideos.appendChild(
        el("p", {
          classe: "t-md cor-body leitura curso__nota-videos",
          texto:
            "As lições acima já ensinam a matéria inteira — estes vídeos são para quem quer ouvir a mesma ideia explicada por outra pessoa, ou ver mais exemplos resolvidos. Cada um traz uma nota dizendo para quando ele serve.",
        })
      );
      const grade = el("div", { classe: "videos" });
      curso.videos.forEach((v) => grade.appendChild(renderVideo(v)));
      secaoVideos.appendChild(grade);
      alvo.appendChild(secaoVideos);
    }

    // --- recomeçar ---
    if (resumo.questoesRespondidas > 0) {
      const rodape = el("div", { classe: "curso__rodape" });
      const zerar = el("button", {
        classe: "botao botao--nu",
        texto: "Apagar meu progresso nesta matéria",
        atributos: { type: "button" },
      });
      zerar.addEventListener("click", () => {
        if (window.confirm(`Isso apaga seu progresso e o certificado de ${curso.titulo}. Continuar?`)) {
          reiniciarCurso(curso.id);
          desenhar();
        }
      });
      rodape.appendChild(zerar);
      alvo.appendChild(rodape);
    }
  };

  desenhar();
}

function montarCertificado(
  curso: Curso,
  nome: string,
  questoes: number,
  acertos: number,
  anterior: Certificado | null
): Certificado {
  return {
    cursoId: curso.id,
    cursoTitulo: curso.titulo,
    ano: curso.ano,
    nome,
    // A data é a da primeira emissão: trocar o nome depois não "renova" o feito.
    data: anterior?.data ?? new Date().toISOString(),
    questoes,
    acertosDePrimeira: acertos,
  };
}

// ---------- Página de lição ----------

async function iniciarLicao(): Promise<void> {
  const alvo = qs<HTMLElement>("[data-licao]");
  if (!alvo) return;

  const cursoId = parametro("c");
  const licaoId = parametro("l");
  const catalogo = await json<Catalogo>(CATALOGO);
  const item = catalogo?.anos.flatMap((a) => a.cursos).find((c) => c.id === cursoId);
  if (!item?.arquivo || !licaoId) return recado(alvo, "Não encontramos essa lição. Volte e escolha de novo.");

  const curso = await json<Curso>(item.arquivo);
  const entrada = curso?.licoes.find((l) => l.id === licaoId);
  if (!curso || !entrada) return recado(alvo, "Não encontramos essa lição. Volte e escolha de novo.");

  const [licao, imagens] = await Promise.all([
    json<Licao>(entrada.arquivo),
    json<IndiceImagens>("/dados/imagens.json"),
  ]);
  if (!licao) return recado(alvo, "Não foi possível carregar essa lição.");

  montarLicao(alvo, curso, licao, imagens ?? {});
}

function montarLicao(alvo: HTMLElement, curso: Curso, licao: Licao, imagens: IndiceImagens): void {
  document.title = `${licao.titulo} — ${curso.titulo} | Biblioteca Matemática`;
  const totalLicoes = curso.licoes.length;

  const cabecalho = qs<HTMLElement>("[data-cabecalho]");
  if (cabecalho) {
    limpar(cabecalho);
    const trilha = el("p", { classe: "eyebrow" });
    trilha.appendChild(el("a", { texto: curso.titulo, atributos: { href: `/curso.html?c=${curso.id}` } }));
    trilha.appendChild(el("span", { texto: ` · lição ${licao.numero} de ${totalLicoes}` }));
    cabecalho.appendChild(trilha);
    cabecalho.appendChild(el("h1", { classe: "d-lg", texto: licao.titulo }));
    cabecalho.appendChild(el("p", { classe: "t-lg cor-body leitura", texto: licao.pergunta }));
  }

  limpar(alvo);

  // ---- A ideia ----
  const ideia = el("section", { classe: "bloco" });
  ideia.appendChild(el("p", { classe: "eyebrow", texto: "A ideia" }));
  const texto = el("div", { classe: "leitura" });
  licao.ideia.paragrafos.forEach((p) => texto.appendChild(el("p", { classe: "t-md cor-body-strong", texto: p })));
  ideia.appendChild(texto);
  const figIdeia = renderImagem(imagens, licao.ideia.imagem);
  if (figIdeia) ideia.appendChild(figIdeia);
  if (licao.ideia.destaque) {
    ideia.appendChild(el("p", { classe: "destaque d-serif", texto: licao.ideia.destaque }));
  }
  alvo.appendChild(ideia);

  // ---- Resolvido com você ----
  alvo.appendChild(renderResolvido(imagens, licao));

  // ---- Prática ----
  const pratica = el("section", { classe: "bloco", atributos: { id: "pratica" } });
  pratica.appendChild(el("p", { classe: "eyebrow", texto: "Agora você" }));
  pratica.appendChild(el("h2", { classe: "d-sm", texto: "Sua vez" }));
  const areaProgresso = el("div", { classe: "bloco__progresso" });
  pratica.appendChild(areaProgresso);
  const areaQuestao = el("div", { classe: "bloco__questao" });
  pratica.appendChild(areaQuestao);
  alvo.appendChild(pratica);

  const salvo = lerLicao(curso.id, licao.id);
  const primeira = licao.questoes.findIndex((q) => !salvo.respondidas.includes(q.id));
  iniciarQuestao(primeira === -1 ? licao.questoes.length : primeira);

  function atualizarProgresso(): ProgressoLicao {
    const p = lerLicao(curso.id, licao.id);
    limpar(areaProgresso);
    areaProgresso.appendChild(renderProgressoLicao(p.respondidas.length, licao.questoes.length));
    return p;
  }

  function iniciarQuestao(posicao: number): void {
    const p = atualizarProgresso();
    limpar(areaQuestao);
    if (posicao >= licao.questoes.length) {
      areaQuestao.appendChild(montarFim(curso, licao, p));
      return;
    }
    areaQuestao.appendChild(montarQuestao(licao.questoes[posicao], posicao));
  }

  function montarQuestao(questao: Questao, posicao: number): HTMLElement {
    const caixa = el("div");
    const montada = renderQuestao(imagens, questao, posicao + 1, licao.questoes.length);
    caixa.appendChild(montada.elemento);

    const acoes = el("div", { classe: "acoes" });
    const retorno = el("div", { classe: "acoes__retorno" });
    montada.elemento.appendChild(retorno);
    montada.elemento.appendChild(acoes);

    let tentativas = 0;
    const ultima = posicao + 1 >= licao.questoes.length;

    const btnVerificar = el("button", {
      classe: "botao botao--primario",
      texto: "Verificar",
      atributos: { type: "button" },
    });
    acoes.appendChild(btnVerificar);

    const seguir = (acertouDePrimeira: boolean): void => {
      registrarResposta(curso.id, licao.id, questao.id, acertouDePrimeira, licao.questoes.length);
      iniciarQuestao(posicao + 1);
      rolarAte(areaQuestao);
    };

    const abrirResolucao = (): void => {
      montada.travar();
      limpar(acoes);
      montada.elemento.appendChild(renderResolucao(imagens, questao, respostaCorreta(questao)));
      const btn = el("button", {
        classe: "botao botao--primario",
        texto: ultima ? "Terminar a lição" : "Próxima questão",
        atributos: { type: "button" },
      });
      btn.addEventListener("click", () => seguir(false), { once: true });
      montada.elemento.appendChild(btn);
      rolarAte(montada.elemento);
    };

    btnVerificar.addEventListener("click", () => {
      const veredito = corrigir(questao, montada.lerResposta());
      tentativas += 1;
      limpar(retorno);

      if (veredito.certo) {
        montada.travar();
        limpar(acoes);
        retorno.appendChild(
          renderAcerto(
            tentativas === 1
              ? "Você acertou de primeira."
              : "Agora sim — e você chegou lá sozinho, que é o que importa."
          )
        );
        const btn = el("button", {
          classe: "botao botao--primario",
          texto: ultima ? "Terminar a lição" : "Próxima questão",
          atributos: { type: "button" },
        });
        const dePrimeira = tentativas === 1;
        btn.addEventListener("click", () => seguir(dePrimeira), { once: true });
        acoes.appendChild(btn);
        rolarAte(montada.elemento);
        return;
      }

      retorno.appendChild(renderErro(veredito.diagnostico?.porque, questao.dica, tentativas === 1));

      if (tentativas === 1) {
        limpar(acoes);
        const tentar = el("button", {
          classe: "botao botao--primario",
          texto: "Tentar de novo",
          atributos: { type: "button" },
        });
        const ver = el("button", {
          classe: "botao botao--fantasma",
          texto: "Ver como se resolve",
          atributos: { type: "button" },
        });
        tentar.addEventListener("click", () => {
          limpar(retorno);
          acoes.replaceChildren(btnVerificar, ver);
        });
        ver.addEventListener("click", abrirResolucao);
        acoes.appendChild(tentar);
        acoes.appendChild(ver);
        return;
      }

      // Segunda tentativa errada: a resolução abre sozinha. Insistir mais sem
      // apoio só ensina o aluno a chutar.
      abrirResolucao();
    });

    return caixa;
  }
}

function montarFim(curso: Curso, licao: Licao, progresso: ProgressoLicao): HTMLElement {
  const caixa = el("section", { classe: "fim card" });
  const total = licao.questoes.length;
  const dePrimeira = progresso.acertadas.length;

  const posicao = curso.licoes.findIndex((l) => l.id === licao.id);
  const proxima = curso.licoes[posicao + 1];
  const ultimaDoCurso = !proxima;

  caixa.appendChild(el("p", { classe: "eyebrow", texto: "Lição concluída" }));
  caixa.appendChild(el("h3", { classe: "d-sm", texto: licao.titulo }));
  caixa.appendChild(
    el("p", {
      classe: "t-md cor-body",
      texto:
        dePrimeira === total
          ? `Você acertou as ${total} de primeira. Pode seguir em frente com tranquilidade.`
          : `Você acertou ${dePrimeira} de ${total} de primeira. As que precisaram de uma segunda olhada são justamente as que vale refazer daqui a alguns dias.`,
    })
  );

  if (ultimaDoCurso) {
    const resumo = resumirCurso(curso.id, curso.licoes.map((l) => ({ id: l.id, questoes: 0 })));
    void resumo;
    caixa.appendChild(
      el("p", {
        classe: "t-md cor-body",
        texto: "Essa era a última lição da matéria. Se todas estiverem concluídas, seu certificado já está liberado na página da matéria.",
      })
    );
  }

  const acoes = el("div", { classe: "acoes" });
  acoes.appendChild(
    el("a", {
      classe: "botao botao--primario",
      texto: proxima ? "Próxima lição" : "Ver meu certificado",
      atributos: {
        href: proxima
          ? `/licao.html?c=${curso.id}&l=${proxima.id}`
          : `/curso.html?c=${curso.id}#certificado`,
      },
    })
  );

  const refazer = el("button", {
    classe: "botao botao--fantasma",
    texto: "Refazer esta lição",
    atributos: { type: "button" },
  });
  refazer.addEventListener("click", () => {
    reiniciarLicao(curso.id, licao.id);
    window.location.reload();
  });
  acoes.appendChild(refazer);

  acoes.appendChild(
    el("a", { classe: "botao botao--nu", texto: "Todas as lições", atributos: { href: `/curso.html?c=${curso.id}` } })
  );
  caixa.appendChild(acoes);
  return caixa;
}

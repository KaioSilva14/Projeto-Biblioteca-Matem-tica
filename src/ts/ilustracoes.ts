// ilustracoes.ts
// Banco de ilustrações educacionais em SVG.
//
// Princípio do projeto: nada aqui pode ser específico de UMA questão.
// Em vez de guardar um desenho pronto por atividade (o que obrigaria a mexer
// em TypeScript toda vez que uma questão nova precisasse de imagem), a
// ilustração é descrita por uma CHAVE PARAMÉTRICA escrita no JSON:
//
//   "ilustracao": "circulo:8:3"   -> roda dividida em 8 partes, 3 pintadas
//   "ilustracao": "barra:5:2"     -> barra dividida em 5 partes, 2 pintadas
//   "ilustracao": "grade:4:3:5"   -> grade 4x3 (12 células), 5 pintadas
//   "ilustracao": "reta:4:3"      -> reta numérica de 0 a 1 em quartos, 3/4 marcado
//   "ilustracao": "conjunto:10:4" -> 10 objetos, 4 destacados
//
// Assim uma matéria nova continua sendo "só JSON".
//
// Todos os SVGs são construídos com createElementNS — nunca innerHTML —
// mantendo a mesma regra de segurança do resto da interface.

const NS = "http://www.w3.org/2000/svg";

const COR_PINTADO = "#FF2E93";
const COR_VAZIO = "#EEF3FF";
const COR_TRACO = "#123A8F";

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  atributos: Record<string, string> = {}
): SVGElementTagNameMap[K] {
  const elemento = document.createElementNS(NS, tag);
  for (const [chave, valor] of Object.entries(atributos)) {
    elemento.setAttribute(chave, valor);
  }
  return elemento;
}

function criarSvg(largura: number, altura: number, descricao: string): SVGSVGElement {
  const svg = el("svg", {
    viewBox: `0 0 ${largura} ${altura}`,
    role: "img",
    "aria-label": descricao,
    class: "ilustracao__svg",
    preserveAspectRatio: "xMidYMid meet",
  });
  const titulo = el("title");
  titulo.textContent = descricao;
  svg.appendChild(titulo);
  return svg;
}

/** Converte um número em texto com vírgula decimal (padrão brasileiro). */
function plural(quantidade: number, singular: string, pluralPalavra: string): string {
  return quantidade === 1 ? singular : pluralPalavra;
}

// ---------- Geradores ----------

/** Roda/pizza: círculo dividido em "partes" fatias iguais, "pintadas" delas destacadas. */
function desenharCirculo(partes: number, pintadas: number): SVGSVGElement | null {
  if (!Number.isInteger(partes) || partes < 2 || partes > 24) return null;
  if (pintadas < 0 || pintadas > partes) return null;

  const tamanho = 200;
  const centro = tamanho / 2;
  const raio = 84;
  const svg = criarSvg(
    tamanho,
    tamanho,
    `Círculo dividido em ${partes} ${plural(partes, "parte igual", "partes iguais")}, com ${pintadas} ${plural(pintadas, "parte pintada", "partes pintadas")}.`
  );

  // Uma fatia começa no topo (-90°) e avança no sentido horário.
  const anguloFatia = (2 * Math.PI) / partes;
  for (let i = 0; i < partes; i++) {
    const a1 = -Math.PI / 2 + i * anguloFatia;
    const a2 = a1 + anguloFatia;
    const x1 = centro + raio * Math.cos(a1);
    const y1 = centro + raio * Math.sin(a1);
    const x2 = centro + raio * Math.cos(a2);
    const y2 = centro + raio * Math.sin(a2);
    const arcoGrande = anguloFatia > Math.PI ? 1 : 0;

    // Caso especial: com 1 parte não existe fatia, é o círculo inteiro.
    const d =
      partes === 1
        ? ""
        : `M ${centro} ${centro} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${raio} ${raio} 0 ${arcoGrande} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    svg.appendChild(
      el("path", {
        d,
        fill: i < pintadas ? COR_PINTADO : COR_VAZIO,
        stroke: COR_TRACO,
        "stroke-width": "2",
        "stroke-linejoin": "round",
      })
    );
  }

  svg.appendChild(
    el("circle", {
      cx: String(centro),
      cy: String(centro),
      r: String(raio),
      fill: "none",
      stroke: COR_TRACO,
      "stroke-width": "2.5",
    })
  );
  return svg;
}

/** Barra retangular dividida em "partes" pedaços, "pintadas" deles destacados. */
function desenharBarra(partes: number, pintadas: number): SVGSVGElement | null {
  if (!Number.isInteger(partes) || partes < 1 || partes > 20) return null;
  if (pintadas < 0 || pintadas > partes) return null;

  const largura = 320;
  const altura = 80;
  const margem = 6;
  const larguraUtil = largura - margem * 2;
  const larguraParte = larguraUtil / partes;

  const svg = criarSvg(
    largura,
    altura,
    `Barra dividida em ${partes} ${plural(partes, "parte igual", "partes iguais")}, com ${pintadas} ${plural(pintadas, "parte pintada", "partes pintadas")}.`
  );

  for (let i = 0; i < partes; i++) {
    svg.appendChild(
      el("rect", {
        x: (margem + i * larguraParte).toFixed(2),
        y: String(margem),
        width: larguraParte.toFixed(2),
        height: String(altura - margem * 2),
        fill: i < pintadas ? COR_PINTADO : COR_VAZIO,
        stroke: COR_TRACO,
        "stroke-width": "2",
      })
    );
  }
  return svg;
}

/** Grade de colunas x linhas células; as "pintadas" primeiras ficam destacadas. */
function desenharGrade(colunas: number, linhas: number, pintadas: number): SVGSVGElement | null {
  if (!Number.isInteger(colunas) || !Number.isInteger(linhas)) return null;
  if (colunas < 1 || linhas < 1 || colunas > 12 || linhas > 12) return null;
  const total = colunas * linhas;
  if (pintadas < 0 || pintadas > total) return null;

  const lado = 36;
  const margem = 4;
  const largura = colunas * lado + margem * 2;
  const altura = linhas * lado + margem * 2;

  const svg = criarSvg(
    largura,
    altura,
    `Retângulo dividido em ${total} ${plural(total, "parte igual", "partes iguais")} (${colunas} por ${linhas}), com ${pintadas} ${plural(pintadas, "parte pintada", "partes pintadas")}.`
  );

  for (let indice = 0; indice < total; indice++) {
    const coluna = indice % colunas;
    const linha = Math.floor(indice / colunas);
    svg.appendChild(
      el("rect", {
        x: String(margem + coluna * lado),
        y: String(margem + linha * lado),
        width: String(lado),
        height: String(lado),
        fill: indice < pintadas ? COR_PINTADO : COR_VAZIO,
        stroke: COR_TRACO,
        "stroke-width": "2",
      })
    );
  }
  return svg;
}

/** Reta numérica de 0 a 1 dividida em "denominador" partes, com "marcado"/denominador destacado. */
function desenharReta(denominador: number, marcado: number): SVGSVGElement | null {
  if (!Number.isInteger(denominador) || denominador < 1 || denominador > 16) return null;
  if (marcado < 0 || marcado > denominador) return null;

  const largura = 340;
  const altura = 92;
  const margem = 26;
  const y = 46;
  const larguraUtil = largura - margem * 2;
  const passo = larguraUtil / denominador;

  const svg = criarSvg(
    largura,
    altura,
    `Reta numérica de 0 a 1 dividida em ${denominador} ${plural(denominador, "parte", "partes")}, com o ponto ${marcado}/${denominador} destacado.`
  );

  // trecho já percorrido, em rosa
  svg.appendChild(
    el("line", {
      x1: String(margem),
      y1: String(y),
      x2: (margem + passo * marcado).toFixed(2),
      y2: String(y),
      stroke: COR_PINTADO,
      "stroke-width": "6",
      "stroke-linecap": "round",
    })
  );
  // reta completa
  svg.appendChild(
    el("line", {
      x1: String(margem),
      y1: String(y),
      x2: String(largura - margem),
      y2: String(y),
      stroke: COR_TRACO,
      "stroke-width": "2.5",
      "stroke-linecap": "round",
    })
  );

  for (let i = 0; i <= denominador; i++) {
    const x = margem + passo * i;
    const ehExtremo = i === 0 || i === denominador;
    svg.appendChild(
      el("line", {
        x1: x.toFixed(2),
        y1: String(y - (ehExtremo ? 14 : 9)),
        x2: x.toFixed(2),
        y2: String(y + (ehExtremo ? 14 : 9)),
        stroke: COR_TRACO,
        "stroke-width": ehExtremo ? "3" : "2",
        "stroke-linecap": "round",
      })
    );
    if (ehExtremo) {
      const rotulo = el("text", {
        x: x.toFixed(2),
        y: String(y + 34),
        "text-anchor": "middle",
        "font-size": "15",
        "font-weight": "700",
        fill: COR_TRACO,
        "font-family": "Inter, system-ui, sans-serif",
      });
      rotulo.textContent = i === 0 ? "0" : "1";
      svg.appendChild(rotulo);
    }
  }

  // marcador do ponto
  svg.appendChild(
    el("circle", {
      cx: (margem + passo * marcado).toFixed(2),
      cy: String(y),
      r: "8",
      fill: COR_PINTADO,
      stroke: COR_TRACO,
      "stroke-width": "2.5",
    })
  );
  return svg;
}

/** Conjunto de objetos (bolinhas) dispostos em linhas de até 5; "pintados" destacados. */
function desenharConjunto(total: number, pintados: number): SVGSVGElement | null {
  if (!Number.isInteger(total) || total < 1 || total > 40) return null;
  if (pintados < 0 || pintados > total) return null;

  const porLinha = Math.min(total, 5);
  const linhas = Math.ceil(total / porLinha);
  const passo = 44;
  const raio = 16;
  const margem = 8;
  const largura = porLinha * passo + margem * 2;
  const altura = linhas * passo + margem * 2;

  const svg = criarSvg(
    largura,
    altura,
    `Conjunto de ${total} objetos, com ${pintados} ${plural(pintados, "destacado", "destacados")}.`
  );

  for (let indice = 0; indice < total; indice++) {
    const coluna = indice % porLinha;
    const linha = Math.floor(indice / porLinha);
    svg.appendChild(
      el("circle", {
        cx: String(margem + coluna * passo + passo / 2),
        cy: String(margem + linha * passo + passo / 2),
        r: String(raio),
        fill: indice < pintados ? COR_PINTADO : COR_VAZIO,
        stroke: COR_TRACO,
        "stroke-width": "2.5",
      })
    );
  }
  return svg;
}

// ---------- Ponto de entrada ----------

/**
 * Constrói a ilustração descrita pela chave. Retorna null se a chave for
 * desconhecida ou tiver parâmetros inválidos — a questão simplesmente
 * aparece sem imagem, nunca quebrada.
 */
export function criarIlustracao(chave: string): SVGSVGElement | null {
  const partes = chave.trim().split(":");
  const nome = partes[0];
  const n = partes.slice(1).map((valor) => Number(valor));
  if (n.some((valor) => Number.isNaN(valor))) {
    return null;
  }

  switch (nome) {
    case "circulo":
      return n.length === 2 ? desenharCirculo(n[0], n[1]) : null;
    case "barra":
      return n.length === 2 ? desenharBarra(n[0], n[1]) : null;
    case "grade":
      return n.length === 3 ? desenharGrade(n[0], n[1], n[2]) : null;
    case "reta":
      return n.length === 2 ? desenharReta(n[0], n[1]) : null;
    case "conjunto":
      return n.length === 2 ? desenharConjunto(n[0], n[1]) : null;
    default:
      return null;
  }
}

/** Envolve a ilustração em uma figura com moldura, pronta para entrar no card. */
export function renderIlustracao(chave: string): HTMLElement | null {
  const svg = criarIlustracao(chave);
  if (!svg) {
    return null;
  }
  const figura = document.createElement("figure");
  figura.className = "ilustracao";
  figura.appendChild(svg);
  return figura;
}

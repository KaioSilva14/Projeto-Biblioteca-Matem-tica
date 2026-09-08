// ferramentas/desenhos.mjs
//
// Biblioteca de desenhos matemáticos em SVG.
//
// Estes desenhos NÃO vão para o navegador como SVG inline: eles são
// rasterizados em PNG por ferramentas/gerar-imagens.mjs e servidos de
// /assets como imagem de verdade. O site nunca monta figura em tempo de
// execução — a página só aponta para um arquivo.
//
// Paleta: os desenhos vivem sobre a canvas quente do DESIGN.md, então o
// traço é claro e o fundo é transparente. Não há cor de acento: cheio e
// vazio se distinguem por preenchimento, não por matiz.

export const TRACO = "#8a8179";
export const TRACO_FORTE = "#c9c0ad";
export const CHEIO = "#dad2c1";
export const DESTAQUE = "#f7f5f0";
export const TEXTO = "#c9c0ad";
// A superfície única do DESIGN.md. Os PNGs têm fundo transparente, então
// esta cor só é usada para VAZAR miolo — a bolinha aberta da inequação,
// que precisa apagar o tracinho da reta por baixo dela.
export const CANVAS = "#2b2622";
export const FONTE = "Inter, system-ui, sans-serif";
export const FONTE_MONO = "'DM Mono', ui-monospace, monospace";

function svg(largura, altura, corpo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" fill="none">${corpo}</svg>`;
}

function texto(x, y, conteudo, { tamanho = 15, cor = TEXTO, ancora = "middle", peso = 400, fonte = FONTE } = {}) {
  return `<text x="${x}" y="${y}" font-family="${fonte}" font-size="${tamanho}" font-weight="${peso}" fill="${cor}" text-anchor="${ancora}" dominant-baseline="middle">${conteudo}</text>`;
}

/** Escapa texto para uso seguro dentro do SVG. */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Largura mínima para o rótulo centralizado do rodapé caber inteiro.
 *
 * Esse bug já apareceu em quatro geradores diferentes: a largura era
 * calculada só a partir do desenho, e um rótulo mais comprido que ele saía
 * cortado pelas duas bordas do SVG. Toda função que escreve rótulo embaixo
 * deve passar a largura por aqui.
 */
/**
 * Largura de um texto, em px, somando caractere por caractere.
 *
 * Um fator único por caractere erra feio nos dois sentidos: "iii" e "MMM"
 * têm o mesmo comprimento e larguras muito diferentes. A soma por CLASSE de
 * caractere erra pouco, e é o bastante para decidir a caixa de um SVG.
 *
 * Os pesos estão em fração do tamanho da fonte (em). DM Mono é monoespaçada,
 * então lá todo caractere vale o mesmo.
 */
function larguraTexto(txt, tamanho = 14, mono = false) {
  const t = String(txt);
  if (mono) return t.length * tamanho * 0.6;
  let em = 0;
  for (const c of t) {
    if ("iíìl|!.,:;'`·ˆ".includes(c)) em += 0.29;
    else if ("jftr()[]-−–—/\ ".includes(c)) em += 0.37;
    else if ("mwMW%@".includes(c)) em += 0.86;
    else if (c >= "A" && c <= "Z") em += 0.66;
    else if ("ÁÀÂÃÉÊÍÓÔÕÚÇ".includes(c)) em += 0.66;
    else if (c >= "0" && c <= "9") em += 0.57;
    else em += 0.545;
  }
  return em * tamanho;
}

/**
 * Largura mínima para o rótulo centralizado do rodapé caber inteiro.
 *
 * Esse bug já apareceu em quatro geradores diferentes: a largura era
 * calculada só a partir do desenho, e um rótulo mais comprido que ele saía
 * cortado pelas duas bordas do SVG. Toda função que escreve rótulo embaixo
 * deve passar a largura por aqui.
 *
 * A auditoria que fechou o 7º ano achou DEZESSEIS geradores que escreviam
 * rótulo sem passar por aqui — o helper existia e não estava sendo usado.
 * Por isso a medição virou `larguraTexto`, que soma por caractere: com o
 * fator único de 0.52 um rótulo cheio de maiúsculas ainda escapava.
 */
function comRotulo(largura, rotulo, tamanho = 14) {
  if (!rotulo) return largura;
  return Math.max(largura, Math.ceil(larguraTexto(rotulo, tamanho)) + 24);
}

/**
 * Fecha o SVG garantindo que o rótulo do rodapé caiba na caixa.
 *
 * Em vez de refazer a matemática de posição de cada gerador, ele mede o
 * rótulo, alarga a caixa quando preciso e DESLOCA o desenho inteiro para o
 * meio. Como o rótulo já é escrito centralizado na largura antiga, ele viaja
 * junto e continua centralizado na nova.
 */
function fechar(largura, altura, corpo, rotulo, tamanho = 14) {
  const larga = comRotulo(largura, rotulo, tamanho);
  if (larga <= largura) return svg(Math.round(largura), Math.round(altura), corpo);
  const dx = (larga - largura) / 2;
  return svg(Math.round(larga), Math.round(altura),
    `<g transform="translate(${dx.toFixed(1)} 0)">${corpo}</g>`);
}

// ---------- Roda dividida em fatias ----------

export function roda({ partes, pintadas, rotulo = "" }) {
  const L = 260, A = rotulo ? 292 : 260;
  const cx = L / 2, cy = 130, r = 104;
  const passo = (2 * Math.PI) / partes;
  let corpo = "";

  for (let i = 0; i < partes; i++) {
    const a1 = -Math.PI / 2 + i * passo;
    const a2 = a1 + passo;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const grande = passo > Math.PI ? 1 : 0;
    const d = partes === 1
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${grande} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    corpo += `<path d="${d}" fill="${i < pintadas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
  }
  corpo += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  if (rotulo) corpo += texto(cx, 272, esc(rotulo), { tamanho: 16 });
  return fechar(L, A, corpo, rotulo, 16);
}

// ---------- Barra dividida ----------

export function barra({ partes, pintadas, rotulo = "", largura = 420 }) {
  const A = rotulo ? 118 : 84;
  const m = 8, alturaBarra = 68;
  const util = largura - m * 2;
  const w = util / partes;
  let corpo = "";
  for (let i = 0; i < partes; i++) {
    corpo += `<rect x="${(m + i * w).toFixed(2)}" y="${m}" width="${w.toFixed(2)}" height="${alturaBarra}" fill="${i < pintadas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
  }
  corpo += `<rect x="${m}" y="${m}" width="${util}" height="${alturaBarra}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  if (rotulo) corpo += texto(largura / 2, 100, esc(rotulo), { tamanho: 16 });
  return fechar(largura, A, corpo, rotulo, 16);
}

/** Duas barras empilhadas, para comparar frações de denominadores diferentes. */
export function barrasComparadas({ a, b, largura = 440 }) {
  const m = 8, h = 54, rotuloH = 24, gap = 18;
  const util = largura - m * 2;
  // altura calculada a partir da posição real do último rótulo, para o
  // texto nunca sair do quadro (já aconteceu de "7/11" ficar cortado).
  const alturaLinha = h + rotuloH;
  const A = m * 2 + alturaLinha * 2 + gap;
  let corpo = "";
  [a, b].forEach((f, linha) => {
    const y = m + linha * (alturaLinha + gap);
    const w = util / f.partes;
    for (let i = 0; i < f.partes; i++) {
      corpo += `<rect x="${(m + i * w).toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${h}" fill="${i < f.pintadas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
    }
    corpo += `<rect x="${m}" y="${y}" width="${util}" height="${h}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
    corpo += texto(m + util / 2, y + h + rotuloH / 2 + 2, esc(f.rotulo), { tamanho: 15, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  });
  return svg(largura, A, corpo);
}

// ---------- Grade ----------

export function grade({ colunas, linhas, pintadas, rotulo = "" }) {
  const lado = 40, m = 6;
  const L = colunas * lado + m * 2;
  const A = linhas * lado + m * 2 + (rotulo ? 30 : 0);
  let corpo = "";
  const total = colunas * linhas;
  for (let i = 0; i < total; i++) {
    const c = i % colunas, l = Math.floor(i / colunas);
    corpo += `<rect x="${m + c * lado}" y="${m + l * lado}" width="${lado}" height="${lado}" fill="${i < pintadas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
  }
  if (rotulo) corpo += texto(L / 2, linhas * lado + m * 2 + 12, esc(rotulo), { tamanho: 16 });
  return fechar(L, A, corpo, rotulo, 16);
}

// ---------- Reta numérica ----------

export function reta({ denominador, marcado, rotulos = [], largura = 460 }) {
  const A = 108, m = 34, y = 46;
  const util = largura - m * 2;
  const passo = util / denominador;
  let corpo = "";

  corpo += `<line x1="${m}" y1="${y}" x2="${largura - m}" y2="${y}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  for (let i = 0; i <= denominador; i++) {
    const x = m + passo * i;
    const extremo = i === 0 || i === denominador;
    corpo += `<line x1="${x.toFixed(2)}" y1="${y - (extremo ? 14 : 9)}" x2="${x.toFixed(2)}" y2="${y + (extremo ? 14 : 9)}" stroke="${extremo ? TRACO_FORTE : TRACO}" stroke-width="${extremo ? 2.5 : 2}" stroke-linecap="round"/>`;
    if (extremo) corpo += texto(x, y + 32, i === 0 ? "0" : "1", { tamanho: 15, cor: TRACO_FORTE, peso: 500 });
  }
  if (marcado !== null && marcado !== undefined) {
    const x = m + passo * marcado;
    corpo += `<circle cx="${x.toFixed(2)}" cy="${y}" r="7.5" fill="${DESTAQUE}" stroke="${TRACO_FORTE}" stroke-width="2"/>`;
  }
  for (const r of rotulos) {
    corpo += texto(m + passo * r.posicao, y - 30, esc(r.texto), { tamanho: 15, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  }
  return svg(largura, A, corpo);
}

// ---------- Coleção de objetos ----------

export function colecao({ total, destacados, porLinha = 6, rotulo = "" }) {
  const passo = 44, r = 15, m = 8;
  const cols = Math.min(total, porLinha);
  const linhas = Math.ceil(total / cols);
  const L = cols * passo + m * 2;
  const A = linhas * passo + m * 2 + (rotulo ? 28 : 0);
  let corpo = "";
  for (let i = 0; i < total; i++) {
    const c = i % cols, l = Math.floor(i / cols);
    corpo += `<circle cx="${m + c * passo + passo / 2}" cy="${m + l * passo + passo / 2}" r="${r}" fill="${i < destacados ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
  }
  if (rotulo) corpo += texto(L / 2, linhas * passo + m * 2 + 10, esc(rotulo), { tamanho: 15 });
  return fechar(L, A, corpo, rotulo, 15);
}

// ---------- Recipiente com nível (canecas, tanques, jarras) ----------

export function recipientes({ itens, largura = 460 }) {
  const A = 250;
  const n = itens.length;
  const faixa = largura / n;
  let corpo = "";
  itens.forEach((item, i) => {
    const alturaMax = 150;
    const h = item.altura ?? alturaMax;
    const w = item.largura ?? 76;
    const cx = faixa * i + faixa / 2;
    const x = cx - w / 2;
    const base = 186;
    const topo = base - h;
    // corpo do recipiente
    corpo += `<path d="M ${x} ${topo} L ${x} ${base} Q ${x} ${base + 10} ${x + 10} ${base + 10} L ${x + w - 10} ${base + 10} Q ${x + w} ${base + 10} ${x + w} ${base} L ${x + w} ${topo}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linejoin="round"/>`;
    // líquido
    if (item.fracao > 0) {
      const hl = h * Math.min(item.fracao, 1);
      const yl = base - hl;
      corpo += `<path d="M ${x + 1.5} ${yl} L ${x + 1.5} ${base} Q ${x + 1.5} ${base + 8.5} ${x + 11} ${base + 8.5} L ${x + w - 11} ${base + 8.5} Q ${x + w - 1.5} ${base + 8.5} ${x + w - 1.5} ${base} L ${x + w - 1.5} ${yl} Z" fill="${CHEIO}"/>`;
      corpo += `<line x1="${x + 1.5}" y1="${yl}" x2="${x + w - 1.5}" y2="${yl}" stroke="${DESTAQUE}" stroke-width="2"/>`;
    }
    corpo += texto(cx, 218, esc(item.rotulo), { tamanho: 15 });
    if (item.nota) corpo += texto(cx, 238, esc(item.nota), { tamanho: 13, cor: TRACO, fonte: FONTE_MONO });
  });
  return svg(largura, A, corpo);
}

// ---------- Barra de etapas (problemas de "do que sobrou") ----------
//
// Mostra o total como uma barra e marca, em sequência, o que foi consumido
// em cada etapa. É o desenho que torna visível a diferença entre
// "1/3 do total" e "1/3 do que sobrou".

export function barraEtapas({ etapas, largura = 456, rotuloTotal = "total" }) {
  const m = 8, h = 58;
  // O rótulo do total fica ACIMA da barra. Centrado dentro dela ele caía em
  // cima das divisórias e competia com as legendas de cada etapa.
  const topoRotulo = 20;
  const yBarra = topoRotulo + 10;
  const util = largura - m * 2;
  const baseLegendas = yBarra + h + 18;
  const A = baseLegendas + etapas.length * 30 + 8;
  let corpo = "";
  let inicio = 0;

  corpo += texto(m + util / 2, topoRotulo / 2 + 4, esc(rotuloTotal), { tamanho: 13, cor: TRACO_FORTE, fonte: FONTE_MONO });

  etapas.forEach((etapa, i) => {
    const w = util * etapa.fracao;
    const x = m + util * inicio;
    corpo += `<rect x="${x.toFixed(2)}" y="${yBarra}" width="${w.toFixed(2)}" height="${h}" fill="${CHEIO}" fill-opacity="${etapa.vazio ? 0 : 0.3 + 0.22 * i}" stroke="${TRACO}" stroke-width="2"/>`;

    // linha guia descendo até a legenda daquela etapa
    const yl = baseLegendas + i * 30;
    for (const px of [x, x + w]) {
      corpo += `<line x1="${px.toFixed(2)}" y1="${yBarra + h}" x2="${px.toFixed(2)}" y2="${yl}" stroke="${TRACO}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    }
    corpo += `<line x1="${x.toFixed(2)}" y1="${yl}" x2="${(x + w).toFixed(2)}" y2="${yl}" stroke="${TRACO_FORTE}" stroke-width="1.5"/>`;
    corpo += texto(x + w / 2, yl + 14, esc(etapa.rotulo), { tamanho: 13, cor: etapa.vazio ? DESTAQUE : CHEIO, fonte: FONTE_MONO });
    inicio += etapa.fracao;
  });

  corpo += `<rect x="${m}" y="${yBarra}" width="${util}" height="${h}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  return svg(largura, A, corpo);
}

// ---------- Retângulo cortado nas duas direções (equivalência) ----------
//
// Mostra por que multiplicar numerador e denominador pelo mesmo número não
// muda o valor: os cortes novos atravessam a figura inteira.

export function corteDuplo({ colunas, pintadasColunas, cortes, rotulo = "" }) {
  const L = 300, h = 150, m = 8;
  const A = h + m * 2 + (rotulo ? 30 : 0);
  const util = L - m * 2;
  const w = util / colunas;
  let corpo = "";

  for (let i = 0; i < colunas; i++) {
    corpo += `<rect x="${(m + i * w).toFixed(2)}" y="${m}" width="${w.toFixed(2)}" height="${h}" fill="${i < pintadasColunas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
  }
  // cortes horizontais novos, tracejados, atravessando tudo
  for (let j = 1; j < cortes; j++) {
    const y = m + (h / cortes) * j;
    corpo += `<line x1="${m}" y1="${y.toFixed(2)}" x2="${L - m}" y2="${y.toFixed(2)}" stroke="${DESTAQUE}" stroke-width="2" stroke-dasharray="6 4"/>`;
  }
  corpo += `<rect x="${m}" y="${m}" width="${util}" height="${h}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  if (rotulo) corpo += texto(L / 2, h + m * 2 + 12, esc(rotulo), { tamanho: 16 });
  return fechar(L, A, corpo, rotulo, 16);
}

// ---------- Diagrama de partes nomeadas (para problemas de conjunto) ----------
//
// Uma barra do total dividida em categorias com rótulo — usada em problemas
// do tipo "um quarto joga vôlei, um terço joga futebol...".

export function barraCategorias({ categorias, largura = 456, rotuloTotal }) {
  const m = 8, h = 62;
  const util = largura - m * 2;
  // O rotulo do total e a legenda precisam de faixas proprias: quando o
  // espacamento e calculado "no olho" os dois se encostam.
  const yTotal = m + h + 22;
  const yLegenda = rotuloTotal ? yTotal + 30 : m + h + 24;
  const A = yLegenda + categorias.length * 26 + 4;
  let corpo = "";
  let inicio = 0;

  categorias.forEach((cat, i) => {
    const w = util * cat.fracao;
    const x = m + util * inicio;
    corpo += `<rect x="${x.toFixed(2)}" y="${m}" width="${w.toFixed(2)}" height="${h}" fill="${CHEIO}" fill-opacity="${0.22 + 0.2 * i}" stroke="${TRACO}" stroke-width="2"/>`;
    // Cabe o rotulo curto? A largura real do texto depende de quantos
    // caracteres ele tem — um limite fixo deixava sem rotulo faixas estreitas
    // em que um digito sozinho caberia folgado.
    const larguraTexto = String(cat.curto ?? "").length * 7.8;
    if (cat.curto && w >= larguraTexto + 14) {
      corpo += texto(x + w / 2, m + h / 2, esc(cat.curto), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
    }
    inicio += cat.fracao;
  });
  corpo += `<rect x="${m}" y="${m}" width="${util}" height="${h}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  if (rotuloTotal) corpo += texto(m + util / 2, yTotal, esc(rotuloTotal), { tamanho: 13, cor: TRACO_FORTE, fonte: FONTE_MONO });

  categorias.forEach((cat, i) => {
    const y = yLegenda + i * 26;
    corpo += `<rect x="${m}" y="${y - 7}" width="14" height="14" fill="${CHEIO}" fill-opacity="${0.22 + 0.2 * i}" stroke="${TRACO}" stroke-width="1.5"/>`;
    corpo += texto(m + 24, y, esc(cat.rotulo), { tamanho: 14, ancora: "start" });
  });
  return svg(largura, A, corpo);
}

// ---------- Notas de dinheiro / preço ----------

export function precoPorParte({ partes, pintadas, valorTotal, rotulo }) {
  const L = 440, m = 8, h = 62;
  const A = 152;
  const util = L - m * 2;
  const w = util / partes;
  let corpo = "";
  for (let i = 0; i < partes; i++) {
    corpo += `<rect x="${(m + i * w).toFixed(2)}" y="${m}" width="${w.toFixed(2)}" height="${h}" fill="${i < pintadas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
  }
  corpo += `<rect x="${m}" y="${m}" width="${util}" height="${h}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;

  // chave marcando a parte que tem preço conhecido
  const xf = m + w * pintadas;
  const yc = m + h + 16;
  corpo += `<path d="M ${m} ${yc} L ${m} ${yc + 8} L ${xf.toFixed(2)} ${yc + 8} L ${xf.toFixed(2)} ${yc}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2"/>`;
  // O valor fica centrado sob a chave, mas PRESO dentro da figura: com uma
  // parte pintada de oito, a chave e mais estreita que "R$ 6,00" e o texto
  // saia pela borda esquerda.
  const lv = larguraTexto(valorTotal, 15, true);
  const cxv = Math.min(Math.max((m + xf) / 2, m + lv / 2), L - m - lv / 2);
  corpo += texto(cxv, yc + 26, esc(valorTotal), { tamanho: 15, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  if (rotulo) corpo += texto(L / 2, 136, esc(rotulo), { tamanho: 14 });
  return fechar(L, A, corpo, rotulo, 14);
}

// ---------- N barras empilhadas com rótulo ----------
//
// Generaliza barrasComparadas para qualquer quantidade de linhas. Útil para
// ordenar frações e para mostrar vários "bolsos" de tamanhos diferentes.

export function barrasEmpilhadas({ itens, largura = 460, rotuloEsquerda = false }) {
  const m = 8, h = 46, rotuloH = 22, gap = 14;
  const recuo = rotuloEsquerda ? 92 : 0;
  const util = largura - m * 2 - recuo;
  const alturaLinha = h + (rotuloEsquerda ? 0 : rotuloH);
  const A = m * 2 + itens.length * alturaLinha + (itens.length - 1) * gap;
  let corpo = "";

  itens.forEach((f, linha) => {
    const y = m + linha * (alturaLinha + gap);
    const x0 = m + recuo;
    const w = util / f.partes;
    for (let i = 0; i < f.partes; i++) {
      corpo += `<rect x="${(x0 + i * w).toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${h}" fill="${i < f.pintadas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
    }
    corpo += `<rect x="${x0}" y="${y}" width="${util}" height="${h}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;

    if (rotuloEsquerda) {
      corpo += texto(m, y + h / 2, esc(f.rotulo), { tamanho: 14, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO });
    } else {
      corpo += texto(x0 + util / 2, y + h + rotuloH / 2 + 1, esc(f.rotulo), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
    }
  });

  return svg(largura, A, corpo);
}

// ---------- Várias rodas lado a lado ----------

export function rodasComparadas({ itens, largura = 420 }) {
  const n = itens.length;
  const faixa = largura / n;
  const r = Math.min(74, faixa / 2 - 16);
  const A = r * 2 + 62;
  const cy = r + 12;
  let corpo = "";

  itens.forEach((item, idx) => {
    const cx = faixa * idx + faixa / 2;
    const passo = (2 * Math.PI) / item.partes;
    for (let i = 0; i < item.partes; i++) {
      const a1 = -Math.PI / 2 + i * passo;
      const a2 = a1 + passo;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const grande = passo > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${grande} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      corpo += `<path d="${d}" fill="${i < item.pintadas ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="2"/>`;
    }
    corpo += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
    corpo += texto(cx, cy + r + 26, esc(item.rotulo), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  });

  return svg(largura, A, corpo);
}

// ---------- Quadro de ordens (valor posicional) ----------
//
// A tabela que separa inteiros de décimos, centésimos e milésimos. É o
// desenho que torna visível por que 0,7 é maior que 0,15.

export function quadroOrdens({ colunas, valores = [], titulo = "" }) {
  const larguraCol = 96;
  const alturaCabeca = 46;
  const alturaLinha = 52;
  const m = 8;
  const linhas = valores.length;
  const L = colunas.length * larguraCol + m * 2;
  const A = m * 2 + alturaCabeca + linhas * alturaLinha + (titulo ? 28 : 0);
  let corpo = "";

  // cabeçalho
  colunas.forEach((col, i) => {
    const x = m + i * larguraCol;
    corpo += `<rect x="${x}" y="${m}" width="${larguraCol}" height="${alturaCabeca}" fill="${CHEIO}" fill-opacity="0.14" stroke="${TRACO}" stroke-width="1.5"/>`;
    corpo += texto(x + larguraCol / 2, m + alturaCabeca / 2, esc(col), { tamanho: 12, cor: TRACO_FORTE, fonte: FONTE_MONO });
  });

  // linhas de valores
  valores.forEach((linha, l) => {
    linha.forEach((celula, i) => {
      const x = m + i * larguraCol;
      const y = m + alturaCabeca + l * alturaLinha;
      corpo += `<rect x="${x}" y="${y}" width="${larguraCol}" height="${alturaLinha}" fill="none" stroke="${TRACO}" stroke-width="1.5"/>`;
      if (celula !== "" && celula !== null && celula !== undefined) {
        corpo += texto(x + larguraCol / 2, y + alturaLinha / 2, esc(celula), { tamanho: 22, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
      }
    });
  });

  // moldura externa
  corpo += `<rect x="${m}" y="${m}" width="${colunas.length * larguraCol}" height="${alturaCabeca + linhas * alturaLinha}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;

  if (titulo) corpo += texto(L / 2, A - 12, esc(titulo), { tamanho: 14 });
  return svg(L, A, corpo);
}

// ---------- Reta numérica com extremos arbitrários ----------
//
// Diferente de reta(), que sempre vai de 0 a 1. Serve para decimais,
// arredondamento e qualquer intervalo.

export function retaDecimal({ inicio, fim, divisoes, marcados = [], largura = 456, casas = 1 }) {
  const A = 116, m = 40, y = 50;
  const util = largura - m * 2;
  const passo = util / divisoes;
  const valorPasso = (fim - inicio) / divisoes;
  let corpo = "";

  corpo += `<line x1="${m}" y1="${y}" x2="${largura - m}" y2="${y}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;

  for (let i = 0; i <= divisoes; i++) {
    const x = m + passo * i;
    const extremo = i === 0 || i === divisoes;
    corpo += `<line x1="${x.toFixed(2)}" y1="${y - (extremo ? 13 : 8)}" x2="${x.toFixed(2)}" y2="${y + (extremo ? 13 : 8)}" stroke="${extremo ? TRACO_FORTE : TRACO}" stroke-width="${extremo ? 2.5 : 1.8}" stroke-linecap="round"/>`;
    if (extremo) {
      const v = (inicio + valorPasso * i).toFixed(casas).replace(".", ",");
      corpo += texto(x, y + 32, v, { tamanho: 14, cor: TRACO_FORTE, peso: 500, fonte: FONTE_MONO });
    }
  }

  for (const marca of marcados) {
    const posicao = (marca.valor - inicio) / (fim - inicio);
    const x = m + util * posicao;
    corpo += `<circle cx="${x.toFixed(2)}" cy="${y}" r="7" fill="${DESTAQUE}" stroke="${TRACO_FORTE}" stroke-width="2"/>`;
    if (marca.rotulo) {
      corpo += texto(x, y - 30, esc(marca.rotulo), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
    }
  }
  return svg(largura, A, corpo);
}

// ---------- Conta armada ----------
//
// Mostra a operação montada em coluna, com a vírgula alinhada. É o desenho
// que explica sozinho por que somar decimais sem alinhar dá errado.

export function contaArmada({ linhas, operador, resultado = null, nota = "", largura = 340 }) {
  const alturaLinha = 42;
  const m = 12;
  const todas = resultado === null ? linhas : [...linhas, resultado];
  const A = m * 2 + todas.length * alturaLinha + 16 + (nota ? 26 : 0);
  const direita = largura - m - 16;
  let corpo = "";

  linhas.forEach((valor, i) => {
    const y = m + i * alturaLinha + alturaLinha / 2;
    corpo += texto(direita, y, esc(valor), { tamanho: 26, cor: DESTAQUE, peso: 400, ancora: "end", fonte: FONTE_MONO });
    if (i === linhas.length - 1 && operador) {
      corpo += texto(m + 10, y, esc(operador), { tamanho: 26, cor: TRACO_FORTE, ancora: "start", fonte: FONTE_MONO });
    }
  });

  const yTraco = m + linhas.length * alturaLinha + 2;
  corpo += `<line x1="${m}" y1="${yTraco}" x2="${largura - m}" y2="${yTraco}" stroke="${TRACO_FORTE}" stroke-width="2"/>`;

  if (resultado !== null) {
    corpo += texto(direita, yTraco + alturaLinha / 2 + 4, esc(resultado), { tamanho: 26, cor: DESTAQUE, peso: 500, ancora: "end", fonte: FONTE_MONO });
  }

  if (nota) corpo += texto(largura / 2, A - 12, esc(nota), { tamanho: 13, cor: TRACO });
  return svg(largura, A, corpo);
}

// ---------- Arranjos retangulares de um número ----------
//
// Mostra por que divisor e múltiplo são o mesmo fato visto de dois lados:
// 12 pontos só formam retângulo cheio nas medidas que dividem 12.

export function arranjos({ pares, rotulo = "" }) {
  const ponto = 9, passo = 16, folga = 32, mTopo = 10, mLado = 12;

  const larguras = pares.map(([, c]) => Math.max(c * passo, 56));

  // Mesma regra de `figurasComparadas` e `angulosComparados`: em vez de
  // esticar a fileira até 504px — 0,57 do tamanho num celular de 320px —, a
  // figura quebra em MAIS LINHAS quando não cabe. Encolher não serviria: os
  // rótulos "2 × 12" ficariam ilegíveis.
  const TETO = 456;
  const cabe = (n) => {
    let maior = 0;
    for (let i = 0; i < larguras.length; i += n) {
      const fila = larguras.slice(i, i + n);
      maior = Math.max(maior, mLado * 2 + fila.reduce((t, w) => t + w, 0) + folga * (fila.length - 1));
    }
    return maior;
  };
  let porLinha = pares.length;
  while (porLinha > 1 && cabe(porLinha) > TETO) porLinha -= 1;

  const filas = [];
  for (let i = 0; i < pares.length; i += porLinha) filas.push(pares.slice(i, i + porLinha));
  const alturasFila = filas.map((fila) => Math.max(...fila.map(([l]) => l * passo)));
  const L = cabe(porLinha);
  const A = mTopo + alturasFila.reduce((t, h) => t + h + 35, 0) + (rotulo ? 20 : 0);

  let corpo = "";
  let indice = 0;
  filas.forEach((fila, f) => {
    // cada fila fica centrada na caixa, e as bases dela alinhadas
    const somaFila = fila.reduce((t, _, k) => t + larguras[indice + k], 0) + folga * (fila.length - 1);
    let x0 = (L - somaFila) / 2;
    const base = mTopo + alturasFila.slice(0, f).reduce((t, h) => t + h + 35, 0) + alturasFila[f];
    fila.forEach(([linhas, colunas], k) => {
      const w = larguras[indice + k];
      const centro = x0 + w / 2;
      const esq = centro - (colunas * passo) / 2;
      // as bases da fila ficam alinhadas: a comparação entre os arranjos é o ponto
      for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
          const cx = esq + c * passo + passo / 2;
          const cy = base - (linhas - l) * passo + passo / 2;
          corpo += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${ponto / 2}" fill="${CHEIO}" stroke="${TRACO}" stroke-width="1.5"/>`;
        }
      }
      corpo += texto(centro, base + 13, `${linhas} × ${colunas}`, { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
      x0 += w + folga;
    });
    indice += fila.length;
  });

  if (rotulo) corpo += texto(L / 2, A - 10, esc(rotulo), { tamanho: 14 });
  return fechar(L, A, corpo, rotulo, 14);
}

// ---------- Crivo: números numa grade, destacados ou riscados ----------

export function crivo({ ate = 50, porLinha = 10, destacados = [], riscados = [], rotulo = "" }) {
  const cel = 34, m = 8;
  const linhas = Math.ceil(ate / porLinha);
  const L = porLinha * cel + m * 2;
  const A = linhas * cel + m * 2 + (rotulo ? 24 : 0);
  const dest = new Set(destacados), risc = new Set(riscados);
  let corpo = "";

  for (let n = 1; n <= ate; n++) {
    const i = n - 1;
    const c = i % porLinha, l = Math.floor(i / porLinha);
    const x = m + c * cel, y = m + l * cel;
    const marcado = dest.has(n);
    corpo += `<rect x="${x}" y="${y}" width="${cel}" height="${cel}" fill="${marcado ? CHEIO : "none"}" stroke="${TRACO}" stroke-width="1.5"/>`;
    const cor = marcado ? "#2b2622" : risc.has(n) ? TRACO : TRACO_FORTE;
    corpo += texto(x + cel / 2, y + cel / 2, String(n), { tamanho: 13, cor, peso: marcado ? 500 : 400, fonte: FONTE_MONO });
    if (risc.has(n)) {
      corpo += `<line x1="${x + 7}" y1="${y + cel - 7}" x2="${x + cel - 7}" y2="${y + 7}" stroke="${TRACO}" stroke-width="1.5" stroke-linecap="round"/>`;
    }
  }
  if (rotulo) corpo += texto(L / 2, A - 10, esc(rotulo), { tamanho: 14 });
  return fechar(L, A, corpo, rotulo, 14);
}

// ---------- Fatoração por divisões sucessivas ----------
//
// O traço vertical é como a decomposição é ensinada na escola brasileira.
// A cadeia é calculada aqui dentro: o desenho não tem como discordar da
// matemática do enunciado.

export function fatoracao({ numero, largura = 220, rotulo = "" }) {
  const passos = [];
  let n = numero;
  let p = 2;
  while (n > 1) {
    if (n % p === 0) { passos.push([n, p]); n /= p; }
    else if (p * p > n) { passos.push([n, n]); n = 1; }
    else { p += p === 2 ? 1 : 2; }
  }
  passos.push([1, null]);

  const linha = 26, m = 12, meio = largura / 2;
  const A = m * 2 + passos.length * linha + (rotulo ? 24 : 0);
  let corpo = "";

  corpo += `<line x1="${meio}" y1="${m}" x2="${meio}" y2="${m + passos.length * linha}" stroke="${TRACO_FORTE}" stroke-width="2"/>`;
  passos.forEach(([esq, dir], i) => {
    const y = m + i * linha + linha / 2;
    corpo += texto(meio - 12, y, String(esq), { tamanho: 14, cor: TRACO_FORTE, ancora: "end", fonte: FONTE_MONO });
    if (dir !== null) {
      corpo += texto(meio + 12, y, String(dir), { tamanho: 14, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO });
    }
  });

  if (rotulo) corpo += texto(largura / 2, A - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, A, corpo, rotulo, 14);
}

// ---------- Saltos na reta: múltiplos, e o encontro de dois ritmos ----------

export function saltos({ ate, ritmos, largura = 456, marcaCada = 5, rotulo = "" }) {
  const y = 46, alturaRitmo = 38;
  // O rotulo de cada ritmo e escrito a esquerda da reta, alinhado pela
  // direita. A margem precisa caber o mais longo deles, senao ele sai
  // pela borda do SVG e aparece cortado.
  const maiorRotulo = Math.max(0, ...ritmos.map((r) => String(r.rotulo || "").length));
  const mEsq = Math.max(40, Math.round(maiorRotulo * 7.8) + 20);
  const mDir = 30;
  const util = largura - mEsq - mDir;
  const passo = util / ate;
  const A = y + 24 + ritmos.length * alturaRitmo + (rotulo ? 22 : 6);
  let corpo = "";

  corpo += `<line x1="${mEsq}" y1="${y}" x2="${largura - mDir}" y2="${y}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  for (let i = 0; i <= ate; i++) {
    const x = mEsq + passo * i;
    const cheio = i % marcaCada === 0 || i === ate;
    corpo += `<line x1="${x.toFixed(2)}" y1="${y - (cheio ? 8 : 5)}" x2="${x.toFixed(2)}" y2="${y + (cheio ? 8 : 5)}" stroke="${cheio ? TRACO_FORTE : TRACO}" stroke-width="${cheio ? 2 : 1.4}"/>`;
    if (cheio) corpo += texto(x, y - 22, String(i), { tamanho: 12, cor: TRACO_FORTE, fonte: FONTE_MONO });
  }

  ritmos.forEach((r, k) => {
    const yr = y + 24 + k * alturaRitmo + 10;
    corpo += texto(mEsq - 12, yr, esc(r.rotulo), { tamanho: 13, cor: TRACO_FORTE, ancora: "end", fonte: FONTE_MONO });
    for (let v = r.passo; v <= ate; v += r.passo) {
      const x = mEsq + passo * v;
      const forte = (r.destacar || []).includes(v);
      corpo += `<circle cx="${x.toFixed(2)}" cy="${yr}" r="${forte ? 8 : 5.5}" fill="${forte ? DESTAQUE : CHEIO}" stroke="${TRACO}" stroke-width="1.5"/>`;
    }
  });

  if (rotulo) corpo += texto(largura / 2, A - 8, esc(rotulo), { tamanho: 14 });
  return fechar(largura, A, corpo, rotulo, 14);
}

// ---------- Listas lado a lado, com os itens comuns em destaque ----------

export function listasComuns({ colunas, largura = 460, rotulo = "" }) {
  const m = 10, alturaTitulo = 28, linha = 26;
  const larguraCol = (largura - m * 2) / colunas.length;

  // As linhas sao indexadas pelo VALOR, nao pela posicao na lista: assim um
  // numero que aparece em duas colunas cai na mesma altura nas duas, e a
  // comparacao entre as listas vira leitura horizontal. Alinhar por posicao
  // (o jeito ingenuo) espalha os comuns por alturas diferentes e desfaz
  // justamente o que a figura precisa mostrar.
  const numerico = colunas.every((c) => c.itens.every((v) => typeof v === "number"));
  const universo = numerico
    ? [...new Set(colunas.flatMap((c) => c.itens))].sort((a, b) => a - b)
    : null;
  const linhaDe = (col, item, i) => (numerico ? universo.indexOf(item) : i);
  const totalLinhas = numerico ? universo.length : Math.max(...colunas.map((c) => c.itens.length));

  const A = m * 2 + alturaTitulo + totalLinhas * linha + (rotulo ? 24 : 0);
  let corpo = "";

  colunas.forEach((col, k) => {
    const x = m + k * larguraCol + larguraCol / 2;
    corpo += texto(x, m + 12, esc(col.titulo), { tamanho: 13, cor: TRACO_FORTE, peso: 500, fonte: FONTE_MONO });
    col.itens.forEach((item, i) => {
      const y = m + alturaTitulo + linhaDe(col, item, i) * linha + linha / 2;
      const comum = (col.comuns || []).includes(item);
      if (comum) {
        corpo += `<rect x="${(x - 27).toFixed(1)}" y="${(y - 11).toFixed(1)}" width="54" height="22" rx="3" fill="${CHEIO}" stroke="${TRACO}" stroke-width="1.5"/>`;
      }
      // Numero curto lê bem centralizado; item de texto, não — os inícios
      // ficam ragged e a lista perde a cara de lista. Texto alinha à esquerda.
      const alinhado = numerico
        ? { x, ancora: "middle" }
        : { x: x - larguraCol / 2 + 12, ancora: "start" };
      corpo += texto(alinhado.x, y, String(item), {
        tamanho: 13, cor: comum ? "#2b2622" : TRACO_FORTE,
        peso: comum ? 500 : 400, ancora: alinhado.ancora, fonte: FONTE_MONO,
      });
    });
  });

  if (rotulo) corpo += texto(largura / 2, A - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, A, corpo, rotulo, 14);
}

// ---------- Potência escrita como fatores repetidos ----------
//
// Escreve "2⁵ = 2 × 2 × 2 × 2 × 2 = 32" com o expoente sobrescrito de
// verdade. As posições são calculadas segmento a segmento: DM Mono tem
// avanço fixo (≈0,6 em), então dá para montar a linha sem medir texto —
// e é isso que mantém o expoente colado na base em qualquer tamanho.

const AVANCO = 0.6;

export function fatoresRepetidos({ linhas, largura = 460, rotulo = "" }) {
  const corpoTam = 20, supTam = 13, alturaLinha = 44, m = 14;
  const A = m * 2 + linhas.length * alturaLinha + (rotulo ? 24 : 0);
  let corpo = "";

  linhas.forEach((l, i) => {
    const y = m + i * alturaLinha + alturaLinha / 2;
    const base = String(l.base);
    const exp = String(l.expoente);
    const produto = " = " + Array.from({ length: l.expoente }, () => base).join(" × ");
    const total = l.resultado === undefined ? "" : " = " + String(l.resultado);

    const larg = (base.length + produto.length + total.length) * AVANCO * corpoTam
      + exp.length * AVANCO * supTam + 5;
    let x = largura / 2 - larg / 2;

    const escreve = (txt, tam, dy, cor, peso) => {
      corpo += `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" font-family="${FONTE_MONO}" font-size="${tam}" font-weight="${peso}" fill="${cor}" text-anchor="start" dominant-baseline="middle">${esc(txt)}</text>`;
      x += txt.length * AVANCO * tam;
    };

    escreve(base, corpoTam, 0, DESTAQUE, 500);
    escreve(exp, supTam, -9, DESTAQUE, 500);
    // O expoente é menor e fica no alto: sem esta folga o "=" seguinte
    // encosta nele e a linha lê como um número só.
    x += 5;
    escreve(produto, corpoTam, 0, TRACO_FORTE, 400);
    if (total) escreve(total, corpoTam, 0, DESTAQUE, 500);

    if (l.nota) corpo += texto(largura / 2, y + 17, esc(l.nota), { tamanho: 12, cor: TRACO });
  });

  if (rotulo) corpo += texto(largura / 2, A - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, A, corpo, rotulo, 14);
}

// ---------- Camadas de um cubo ----------
//
// Um cubo de aresta n é n camadas de n por n. Desenhar as camadas lado a
// lado explica n³ = n² × n sem precisar de perspectiva, que numa figura
// pequena atrapalha mais do que ajuda.

export function camadas({ lado, quantas, rotulo = "" }) {
  const cel = 22, folga = 26, m = 10;
  const bloco = lado * cel;
  // A largura e a maior entre a fileira de blocos e o rotulo: com poucas
  // camadas pequenas o rotulo e mais largo que o desenho, e sem esta conta
  // ele sai pela borda do SVG.
  const larguraBlocos = m * 2 + quantas * bloco + (quantas - 1) * folga;
  const L = comRotulo(larguraBlocos, rotulo);
  const A = m * 2 + bloco + 22 + (rotulo ? 24 : 0);
  const deslocamento = (L - larguraBlocos) / 2;
  let corpo = "";

  for (let k = 0; k < quantas; k++) {
    const x0 = deslocamento + m + k * (bloco + folga);
    for (let l = 0; l < lado; l++) {
      for (let c = 0; c < lado; c++) {
        corpo += `<rect x="${x0 + c * cel}" y="${m + l * cel}" width="${cel}" height="${cel}" fill="${CHEIO}" fill-opacity="0.5" stroke="${TRACO}" stroke-width="1.5"/>`;
      }
    }
    corpo += `<rect x="${x0}" y="${m}" width="${bloco}" height="${bloco}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
    corpo += texto(x0 + bloco / 2, m + bloco + 13, `camada ${k + 1}`, { tamanho: 12, cor: TRACO, fonte: FONTE_MONO });
  }

  if (rotulo) corpo += texto(L / 2, A - 10, esc(rotulo), { tamanho: 14 });
  return svg(L, A, corpo);
}

// ═══════════════════ Geometria: ângulos e figuras planas ═══════════════════
//
// Todo desenho daqui calcula a própria caixa a partir dos pontos que gera,
// em vez de usar largura fixa. Foi assim que os cortes de rótulo das
// primeiras versões (barra de categorias, saltos, camadas) pararam de
// acontecer: a moldura nasce do conteúdo, e não o contrário.

const RAD = Math.PI / 180;

/** Caixa que envolve uma lista de pontos, com folga. */
function caixa(pontos, folga = 24) {
  const xs = pontos.map((p) => p[0]);
  const ys = pontos.map((p) => p[1]);
  return {
    minX: Math.min(...xs) - folga,
    minY: Math.min(...ys) - folga,
    maxX: Math.max(...xs) + folga,
    maxY: Math.max(...ys) + folga,
  };
}

/** Ponto a "graus" do eixo horizontal, medido no sentido anti-horário. */
function polar(cx, cy, r, graus) {
  return [cx + r * Math.cos(graus * RAD), cy - r * Math.sin(graus * RAD)];
}

/** Arco de a até b graus, para o SVG. */
function arco(cx, cy, r, a, b) {
  const [x1, y1] = polar(cx, cy, r, a);
  const [x2, y2] = polar(cx, cy, r, b);
  const grande = Math.abs(b - a) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${grande} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// ---------- Um ângulo ----------
//
// Um lado sempre na horizontal e o outro aberto no ângulo pedido. O
// comprimento dos lados é parâmetro justamente para o conteúdo poder mostrar
// que ele NÃO muda a medida do ângulo — que é o erro central da lição 1.

export function angulo({ graus, rotulo = "", medida = true, lado = 92, marcaReta = true }) {
  const V = [0, 0];
  const A = [lado, 0];
  const B = polar(0, 0, lado, graus);
  const c = caixa([V, A, B, [0, -34], [lado, 0]], 30);

  const largura = Math.round(c.maxX - c.minX);
  const alturaExtra = rotulo ? 26 : 0;
  const altura = Math.round(c.maxY - c.minY) + alturaExtra;
  const dx = -c.minX, dy = -c.minY;
  const p = ([x, y]) => `${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}`;

  let corpo = "";
  // arco da abertura, ou o quadradinho do ângulo reto
  const r = 30;
  if (marcaReta && Math.abs(graus - 90) < 0.01) {
    const q = 18;
    corpo += `<path d="M ${p([q, 0])} L ${p([q, -q])} L ${p([0, -q])}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
  } else {
    const [ax, ay] = polar(0, 0, r, 0);
    const [bx, by] = polar(0, 0, r, graus);
    const grande = graus > 180 ? 1 : 0;
    corpo += `<path d="M ${p([ax, ay])} A ${r} ${r} 0 ${grande} 0 ${p([bx, by])}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
  }

  const linha = (de, ate) =>
    `<line x1="${(de[0] + dx).toFixed(2)}" y1="${(de[1] + dy).toFixed(2)}" x2="${(ate[0] + dx).toFixed(2)}" y2="${(ate[1] + dy).toFixed(2)}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  corpo += linha(V, A);
  corpo += linha(V, B);
  corpo += `<circle cx="${(V[0] + dx).toFixed(2)}" cy="${(V[1] + dy).toFixed(2)}" r="4" fill="${DESTAQUE}"/>`;

  if (medida) {
    const [tx, ty] = polar(0, 0, r + 24, graus / 2);
    corpo += texto(tx + dx, ty + dy, `${graus}°`, { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  }
  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Vários ângulos lado a lado ----------

export function angulosComparados({ itens, lado = 72, medida = false, porLinha }) {
  // Quatro ângulos numa fileira só dão um SVG de ~584px, que num celular de
  // 320px é exibido a metade do tamanho e fica ilegível. A partir de quatro
  // itens a figura quebra em duas linhas e a largura cai pela metade.
  const colunas = porLinha ?? (itens.length <= 3 ? itens.length : Math.ceil(itens.length / 2));
  const linhas = Math.ceil(itens.length / colunas);
  const faixa = 142, alturaLinha = 168;
  const largura = faixa * colunas + 16;
  const altura = alturaLinha * linhas;
  let corpo = "";

  itens.forEach((item, i) => {
    const col = i % colunas, lin = Math.floor(i / colunas);
    const cx = 20 + faixa * col + 24;
    const cy = alturaLinha * lin + 114;
    const raio = item.lado ?? lado;
    const A = polar(cx, cy, raio, 0);
    const B = polar(cx, cy, raio, item.graus);
    const r = 26;

    if (Math.abs(item.graus - 90) < 0.01) {
      corpo += `<path d="M ${cx + 16} ${cy} L ${cx + 16} ${cy - 16} L ${cx} ${cy - 16}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
    } else {
      corpo += `<path d="${arco(cx, cy, r, 0, item.graus)}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
    }
    corpo += `<line x1="${cx}" y1="${cy}" x2="${A[0].toFixed(2)}" y2="${A[1].toFixed(2)}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
    corpo += `<line x1="${cx}" y1="${cy}" x2="${B[0].toFixed(2)}" y2="${B[1].toFixed(2)}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
    corpo += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${DESTAQUE}"/>`;
    if (medida) {
      const [tx, ty] = polar(cx, cy, r + 22, item.graus / 2);
      corpo += texto(tx, ty, `${item.graus}°`, { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
    }
    if (item.rotulo) corpo += texto(cx + 24, alturaLinha * lin + 150, esc(item.rotulo), { tamanho: 13 });
  });

  return svg(largura, altura, corpo);
}

// ---------- Dois ângulos sobre uma reta (suplementares) ----------

export function angulosNaReta({ graus, total = 180, rotuloEsquerda, rotuloDireita, largura, nota }) {
  // O caso de 90° ocupa só um quadrante, então não precisa da largura do
  // caso da reta — deixar 420 ali sobrava um vão morto à direita.
  largura = largura ?? (total === 180 ? 420 : 300);
  const altura = 168;
  const cy = 118, cx = total === 180 ? largura / 2 : 104;
  const braco = total === 180 ? largura / 2 - 30 : 136;
  let corpo = "";

  // O "lado que fecha": na reta ele é a semirreta oposta; num ângulo reto,
  // é a semirreta vertical. É o mesmo desenho com o fecho em outro lugar.
  const fecho = polar(cx, cy, braco, total);
  corpo += `<line x1="${cx}" y1="${cy}" x2="${(cx + braco).toFixed(2)}" y2="${cy}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  corpo += `<line x1="${cx}" y1="${cy}" x2="${fecho[0].toFixed(2)}" y2="${fecho[1].toFixed(2)}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  if (total === 90) {
    corpo += `<path d="M ${cx + 16} ${cy} L ${cx + 16} ${cy - 16} L ${cx} ${cy - 16}" fill="none" stroke="${TRACO}" stroke-width="1.6"/>`;
  }
  const B = polar(cx, cy, 96, graus);
  corpo += `<line x1="${cx}" y1="${cy}" x2="${B[0].toFixed(2)}" y2="${B[1].toFixed(2)}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  corpo += `<path d="${arco(cx, cy, 30, 0, graus)}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
  corpo += `<path d="${arco(cx, cy, 44, graus, total)}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
  corpo += `<circle cx="${cx}" cy="${cy}" r="4" fill="${DESTAQUE}"/>`;

  const [dx, dy] = polar(cx, cy, 52, graus / 2);
  corpo += texto(dx, dy, esc(rotuloDireita ?? `${graus}°`), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  const [ex, ey] = polar(cx, cy, 66, (graus + total) / 2);
  corpo += texto(ex, ey, esc(rotuloEsquerda ?? "?"), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });

  const padrao = total === 180 ? "os dois juntos fecham a meia-volta" : "os dois juntos fecham o ângulo reto";
  corpo += texto(largura / 2, altura - 12, esc(nota ?? padrao), { tamanho: 13, cor: TRACO });
  return svg(largura, altura, corpo);
}

// ---------- Duas retas que se cruzam ----------

export function retasCruzadas({ graus, rotulos = {}, largura = 420 }) {
  const altura = 260;
  const cx = largura / 2, cy = 124, braco = 120;
  let corpo = "";

  const desenhaReta = (ang) => {
    const a = polar(cx, cy, braco, ang);
    const b = polar(cx, cy, braco, ang + 180);
    corpo += `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  };
  desenhaReta(0);
  desenhaReta(graus);

  // os quatro ângulos, em ordem a partir do eixo horizontal
  const cantos = [
    { de: 0, ate: graus, chave: "a" },
    { de: graus, ate: 180, chave: "b" },
    { de: 180, ate: 180 + graus, chave: "c" },
    { de: 180 + graus, ate: 360, chave: "d" },
  ];
  cantos.forEach((c, i) => {
    const r = 30 + (i % 2) * 12;
    corpo += `<path d="${arco(cx, cy, r, c.de, c.ate)}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
    const [tx, ty] = polar(cx, cy, r + 22, (c.de + c.ate) / 2);
    corpo += texto(tx, ty, esc(rotulos[c.chave] ?? "?"), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  });
  corpo += `<circle cx="${cx}" cy="${cy}" r="4" fill="${DESTAQUE}"/>`;
  return svg(largura, altura, corpo);
}

// ---------- Transferidor ----------
//
// Semicírculo com as duas numerações, que é justamente onde o aluno erra:
// escolher a escala errada dá o suplemento em vez do ângulo.

export function transferidor({ graus, rotulo = "" }) {
  const R = 132, m = 30;
  // A largura é a maior entre o transferidor e o rótulo: um rótulo mais
  // comprido que o desenho sairia cortado pela borda do SVG.
  const larguraDesenho = R * 2 + m * 2;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = R + 84 + (rotulo ? 22 : 0);
  const cx = largura / 2, cy = R + 34;
  let corpo = "";

  // corpo do transferidor
  const e = polar(cx, cy, R, 180), d = polar(cx, cy, R, 0);
  corpo += `<path d="M ${e[0]} ${e[1]} A ${R} ${R} 0 0 1 ${d[0]} ${d[1]} Z" fill="${CHEIO}" fill-opacity="0.10" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;

  for (let g = 0; g <= 180; g += 10) {
    const grande = g % 30 === 0;
    const a = polar(cx, cy, R, g);
    const b = polar(cx, cy, R - (grande ? 16 : 9), g);
    corpo += `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="${grande ? TRACO_FORTE : TRACO}" stroke-width="${grande ? 2 : 1.3}"/>`;
    if (grande) {
      // Duas escalas, uma em cada anel. A folga radial entre elas precisa
      // ser generosa: nas pontas (0° e 180°) os dois números caem na mesma
      // horizontal e, se estiverem perto, leem como um número só.
      const [tx, ty] = polar(cx, cy, R - 26, g);
      corpo += texto(tx, ty, String(g), { tamanho: 11, cor: TRACO_FORTE, fonte: FONTE_MONO });
      // Nas duas pontas (0° e 180°) os números das duas escalas caem na mesma
      // horizontal e leem como um número só. Ali fica só a escala de fora —
      // as marcas do meio (30/150, 60/120, 90/90) já mostram que são duas.
      if (g !== 0 && g !== 180) {
        const [ux, uy] = polar(cx, cy, R - 58, g);
        corpo += texto(ux, uy, String(180 - g), { tamanho: 11, cor: TRACO, fonte: FONTE_MONO });
      }
    }
  }

  // a semirreta medida
  const p = polar(cx, cy, R + 8, graus);
  corpo += `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(2)}" y2="${p[1].toFixed(2)}" stroke="${DESTAQUE}" stroke-width="2.5" stroke-linecap="round"/>`;
  corpo += `<line x1="${cx}" y1="${cy}" x2="${cx + R + 8}" y2="${cy}" stroke="${DESTAQUE}" stroke-width="2.5" stroke-linecap="round"/>`;
  corpo += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${DESTAQUE}"/>`;

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Figuras planas nomeadas ----------
//
// Os contornos vivem aqui, em coordenadas de 0 a 1, para o manifesto poder
// pedir a figura pelo nome sem carregar geometria junto.

const FORMAS = {
  quadrado: [[0, 0], [1, 0], [1, 1], [0, 1]],
  retangulo: [[0, 0], [1.6, 0], [1.6, 1], [0, 1]],
  paralelogramo: [[0.28, 0], [1.6, 0], [1.32, 1], [0, 1]],
  losango: [[0.6, 0], [1.2, 0.62], [0.6, 1.24], [0, 0.62]],
  trapezio: [[0.3, 0], [1.3, 0], [1.6, 1], [0, 1]],
  "triangulo-equilatero": [[0, 0], [1.1, 0], [0.55, 0.953]],
  // As proporções importam: um "isósceles" com base e pernas quase iguais
  // parece equilátero, e um "escaleno" com dois lados quase iguais parece
  // isósceles. A figura tem que concordar com o nome que ela ilustra.
  "triangulo-isosceles": [[0, 0], [1.4, 0], [0.7, 0.78]],
  "triangulo-escaleno": [[0, 0], [1.5, 0], [1.05, 0.95]],
  "triangulo-retangulo": [[0, 0], [1.25, 0], [0, 0.95]],
  // Um obtusângulo de verdade: o vértice de cima abre ~126°, então a figura
  // não desmente um enunciado que fala em ângulo obtuso.
  "triangulo-obtusangulo": [[0, 0], [2.0, 0], [0.5, 0.4]],
  // Quadrilátero sem simetria nenhuma, para quando os quatro ângulos do
  // enunciado são diferentes entre si — num trapézio isósceles a figura
  // mostraria dois ângulos visivelmente iguais com rótulos diferentes.
  quadrilatero: [[0, 0], [1.6, 0], [1.35, 1.0], [0.25, 0.72]],
};

/**
 * Triângulo construído a partir de dois de seus ângulos, em graus.
 *
 * Existe porque as FORMAS nomeadas têm ângulos fixos: o "triangulo-retangulo"
 * abre 37,2° e não 35°, e o "obtusangulo" abre 126° e não 100°. Rotular um
 * deles com o ângulo do enunciado produzia figura que desmente o próprio
 * rótulo — o defeito que a revisão do 6º ano encontrou em três desenhos.
 *
 * A base vai de (0,0) a (1,0); o terceiro vértice sai do encontro das duas
 * retas que partem dos cantos com as inclinações pedidas.
 */
function trianguloPorAngulos(alfa, beta) {
  const ta = Math.tan(alfa * RAD), tb = Math.tan(beta * RAD);
  const x = tb / (ta + tb);
  return [[0, 0], [1, 0], [x, x * ta]];
}

/**
 * Quadrilátero construído a partir dos seus quatro ângulos internos.
 *
 * Mesmo motivo do triângulo: a forma "quadrilatero" do catálogo abre
 * 70,9° / 76° / 89,8° / 123,4°, e rotulá-la com os ângulos do enunciado dava
 * figura que desmente o próprio rótulo.
 *
 * Quatro ângulos não determinam um quadrilátero — sobram dois graus de
 * liberdade. Aqui o primeiro lado é fixado em 1 e os dois últimos saem da
 * condição de FECHAMENTO (a soma vetorial dos quatro lados tem de dar zero).
 * O comprimento do segundo lado é procurado até os outros dois saírem
 * positivos, senão o contorno se cruzaria.
 */
function quadrilateroPorAngulos(angs) {
  const [a1, a2, a3, a4] = angs;
  for (const L2 of [1, 0.85, 1.2, 0.7, 1.5, 0.55, 1.9]) {
    // direções de cada lado, girando pelo ângulo externo em cada vértice
    const t1 = 0;
    const t2 = t1 + (180 - a2);
    const t3 = t2 + (180 - a3);
    const t4 = t3 + (180 - a4);
    const u = (t) => [Math.cos(t * RAD), Math.sin(t * RAD)];
    const [u1, u2, u3, u4] = [u(t1), u(t2), u(t3), u(t4)];
    // L3·u3 + L4·u4 = −(1·u1 + L2·u2)
    const rx = -(u1[0] + L2 * u2[0]), ry = -(u1[1] + L2 * u2[1]);
    const det = u3[0] * u4[1] - u3[1] * u4[0];
    if (Math.abs(det) < 1e-9) continue;
    const L3 = (rx * u4[1] - ry * u4[0]) / det;
    const L4 = (u3[0] * ry - u3[1] * rx) / det;
    if (L3 <= 0.05 || L4 <= 0.05) continue;
    const P = [[0, 0]];
    P.push([P[0][0] + u1[0], P[0][1] + u1[1]]);
    P.push([P[1][0] + L2 * u2[0], P[1][1] + L2 * u2[1]]);
    P.push([P[2][0] + L3 * u3[0], P[2][1] + L3 * u3[1]]);
    return P;
  }
  return FORMAS.quadrilatero;
}

/** Polígono regular de n lados, em coordenadas de 0 a 1. */
function regular(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = 90 + (360 / n) * i;
    pts.push([0.5 + 0.5 * Math.cos(a * RAD), 0.5 - 0.5 * Math.sin(a * RAD)]);
  }
  return pts;
}

export function figuraPlana({ tipo, lados, angulos, rotulo = "", rotulosLados = [], rotulosVertices = [], escala = 118, marcarReto = false, arcosVertices = false }) {
  // `angulos` tem precedência: quando o enunciado fala em medidas de ângulo,
  // a figura precisa ser construída COM elas, e não escolhida de um catálogo.
  const base = angulos
    ? (angulos.length >= 4 ? quadrilateroPorAngulos(angulos) : trianguloPorAngulos(angulos[0], angulos[1]))
    : (FORMAS[tipo] ?? regular(lados ?? 5));
  // as formas nomeadas vêm com y para cima; o SVG tem y para baixo
  const flip = angulos ? true : (FORMAS[tipo] ? true : false);
  const pts = base.map(([x, y]) => [x * escala, (flip ? -y : y) * escala]);

  // Onde cada rótulo de vértice cabe. O padrão é DENTRO, puxado para o
  // centro — é onde o ângulo daquele canto está. Mas num triângulo achatado
  // (40°, 40°, 100°) o miolo tem uns 50px de altura e os três rótulos
  // convergiam para o mesmo ponto: "40°", "100°" e "40°" saíam empilhados,
  // ilegíveis. Quando isso acontece, a figura inteira leva os rótulos para
  // FORA, na direção oposta ao centro, onde sempre há espaço.
  const centroL = pts.length
    ? [pts.reduce((t, q) => t + q[0], 0) / pts.length, pts.reduce((t, q) => t + q[1], 0) / pts.length]
    : [0, 0];
  const lugarVertice = (fora) => rotulosVertices.map((r, i) => {
    if (!r || !pts[i]) return null;
    const u = normalizar(centroL, pts[i]);
    const passo = fora ? -26 : 38;
    return {
      x: pts[i][0] + u[0] * passo, y: pts[i][1] + u[1] * passo,
      meia: larguraTexto(r, 13, true) / 2,
    };
  });
  const colide = (lista) => lista.some((a, i) => lista.some((b, j) =>
    j > i && a && b && Math.abs(a.x - b.x) < a.meia + b.meia + 3 && Math.abs(a.y - b.y) < 15));
  const verticesFora = colide(lugarVertice(false));
  const postos = lugarVertice(verticesFora);
  // a caixa conta os rótulos que foram para fora
  const extras = verticesFora
    ? postos.filter(Boolean).flatMap((q) => [[q.x - q.meia, q.y - 8], [q.x + q.meia, q.y + 8]])
    : [];
  const c = caixa([...pts, ...extras], rotulosLados.length || rotulosVertices.length ? 34 : 22);
  const larguraDesenho = Math.round(c.maxX - c.minX);
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = Math.round(c.maxY - c.minY) + (rotulo ? 26 : 0);
  const dx = -c.minX + (largura - larguraDesenho) / 2, dy = -c.minY;
  const P = pts.map(([x, y]) => [x + dx, y + dy]);

  let corpo = "";
  corpo += `<polygon points="${P.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")}" fill="${CHEIO}" fill-opacity="0.18" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linejoin="round"/>`;

  // marca de ângulo reto no primeiro vértice, quando pedida
  if (marcarReto) {
    const [v, a, b] = [P[0], P[1], P[P.length - 1]];
    const u1 = normalizar(a, v), u2 = normalizar(b, v);
    const q = 15;
    corpo += `<path d="M ${(v[0] + u1[0] * q).toFixed(2)} ${(v[1] + u1[1] * q).toFixed(2)} L ${(v[0] + (u1[0] + u2[0]) * q).toFixed(2)} ${(v[1] + (u1[1] + u2[1]) * q).toFixed(2)} L ${(v[0] + u2[0] * q).toFixed(2)} ${(v[1] + u2[1] * q).toFixed(2)}" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
  }

  // rótulos dos lados, no meio de cada aresta e empurrados para fora
  rotulosLados.forEach((r, i) => {
    if (!r) return;
    const a = P[i], b = P[(i + 1) % P.length];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const centro = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
    const fora = normalizar([mx, my], centro);
    corpo += texto(mx + fora[0] * 18, my + fora[1] * 18, esc(r), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  });

  // Arco no canto de cada vértice rotulado. Sem ele, o rótulo "a" solto
  // dentro da figura pode ser lido como nome do VÉRTICE em vez de medida do
  // ângulo — e a matéria de soma dos ângulos internos depende dessa leitura.
  if (arcosVertices) {
    rotulosVertices.forEach((r, i) => {
      if (!r || !P[i]) return;
      const v = P[i], u = P[(i + 1) % P.length], w = P[(i - 1 + P.length) % P.length];
      const a1 = (Math.atan2(-(u[1] - v[1]), u[0] - v[0]) * 180) / Math.PI;
      const a2 = (Math.atan2(-(w[1] - v[1]), w[0] - v[0]) * 180) / Math.PI;
      let de = a1;
      let d = ((a2 - a1) % 360 + 360) % 360;
      if (d > 180) { de = a2; d = 360 - d; }
      corpo += `<path d="${arco(v[0], v[1], 20, de, de + d)}" fill="none" stroke="${DESTAQUE}" stroke-width="2.2"/>`;
    });
  }

  // Rótulo de vértice fica DENTRO da figura, puxado na direção do centro:
  // é onde o ângulo daquele canto está, e não confunde com o rótulo do lado.
  if (rotulosVertices.length) {
    rotulosVertices.forEach((r, i) => {
      if (!r || !postos[i]) return;
      corpo += texto(postos[i].x + dx, postos[i].y + dy, esc(r), {
        tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    });
  }

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

/** Ponto dentro do polígono, pelo teste do raio (par/ímpar). */
function dentroDoPoligono([x, y], P) {
  let dentro = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function normalizar(p, origem) {
  const dx = p[0] - origem[0], dy = p[1] - origem[1];
  const n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
}

// ---------- Várias figuras planas lado a lado ----------

export function figurasComparadas({ itens, escala = 72, porLinha }) {
  // Mesma regra de angulosComparados: quatro figuras numa fileira dão um SVG
  // de ~594px, exibido a 62% num celular de 390px. A partir de quatro itens a
  // figura quebra em duas linhas e a escala volta para perto de 1.
  const colunas = porLinha ?? (itens.length <= 3 ? itens.length : Math.ceil(itens.length / 2));
  const linhasGrade = Math.ceil(itens.length / colunas);
  // A faixa de cada coluna cabe a FIGURA e o RÓTULO dela. Com largura fixa,
  // duas legendas compridas em colunas vizinhas se encavalavam: "lados
  // iguais, ângulos não" e "ângulos iguais, lados não" viravam uma só linha
  // ilegível.
  const maiorRotulo = Math.max(0, ...itens.map((it) => larguraTexto(it.rotulo || "", 13)));
  const faixa = Math.max(escala * 1.7 + 22, Math.ceil(maiorRotulo) + 18);
  const alturaLinha = escala * 1.5 + 62;
  const largura = faixa * colunas + 16;
  const altura = alturaLinha * linhasGrade;
  let corpo = "";

  itens.forEach((item, i) => {
    const col = i % colunas, lin = Math.floor(i / colunas);
    const base = FORMAS[item.tipo] ?? regular(item.lados ?? 5);
    const flip = !!FORMAS[item.tipo];
    const pts = base.map(([x, y]) => [x * escala, (flip ? -y : y) * escala]);
    const c = caixa(pts, 0);
    const larg = c.maxX - c.minX, alt = c.maxY - c.minY;
    const ox = 8 + faixa * col + (faixa - larg) / 2 - c.minX;
    const oy = alturaLinha * lin + 16 + (escala * 1.2 - alt) / 2 - c.minY;
    const P = pts.map(([x, y]) => `${(x + ox).toFixed(2)},${(y + oy).toFixed(2)}`).join(" ");
    corpo += `<polygon points="${P}" fill="${CHEIO}" fill-opacity="0.18" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (item.rotulo) {
      corpo += texto(8 + faixa * col + faixa / 2, alturaLinha * (lin + 1) - 22, esc(item.rotulo), { tamanho: 13 });
    }
  });

  return svg(largura, altura, corpo);
}

// ---------- Relógio (ângulo entre ponteiros) ----------

export function relogio({ hora, minuto, rotulo = "" }) {
  const R = 96, m = 22;
  const largura = R * 2 + m * 2;
  const altura = R * 2 + m * 2 + (rotulo ? 26 : 0);
  const cx = largura / 2, cy = R + m;
  let corpo = "";

  corpo += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  for (let h = 0; h < 12; h++) {
    const ang = 90 - h * 30;
    const a = polar(cx, cy, R, ang), b = polar(cx, cy, R - 12, ang);
    corpo += `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="${TRACO}" stroke-width="2"/>`;
    const [tx, ty] = polar(cx, cy, R - 28, ang);
    corpo += texto(tx, ty, String(h === 0 ? 12 : h), { tamanho: 12, cor: TRACO_FORTE, fonte: FONTE_MONO });
  }

  // ponteiros: o das horas anda meio grau por minuto
  const angMin = 90 - minuto * 6;
  const angHora = 90 - (hora % 12) * 30 - minuto * 0.5;
  const pm = polar(cx, cy, R - 34, angMin);
  const ph = polar(cx, cy, R - 56, angHora);
  corpo += `<line x1="${cx}" y1="${cy}" x2="${pm[0].toFixed(2)}" y2="${pm[1].toFixed(2)}" stroke="${DESTAQUE}" stroke-width="2.5" stroke-linecap="round"/>`;
  corpo += `<line x1="${cx}" y1="${cy}" x2="${ph[0].toFixed(2)}" y2="${ph[1].toFixed(2)}" stroke="${DESTAQUE}" stroke-width="4" stroke-linecap="round"/>`;
  corpo += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${DESTAQUE}"/>`;

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Circunferência e círculo ----------
//
// A distinção que a lição precisa mostrar: a circunferência é a LINHA, o
// círculo é a região de dentro. Por isso o preenchimento é opcional.

export function circulo({ raio = 88, mostrar = [], preenchido = false, medidas = {}, rotulo = "" }) {
  const m = 46;
  const largura = comRotulo(raio * 2 + m * 2, rotulo);
  const altura = raio * 2 + m * 2 + (rotulo ? 22 : 0);
  const cx = largura / 2, cy = raio + m;
  let corpo = "";

  corpo += `<circle cx="${cx}" cy="${cy}" r="${raio}" fill="${preenchido ? CHEIO : "none"}" fill-opacity="0.18" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;

  // Diâmetro na horizontal e raio para cima: separados o suficiente para os
  // rótulos não se cruzarem, mesmo com os dois na mesma figura.
  if (mostrar.includes("diametro")) {
    const a = polar(cx, cy, raio, 180), b = polar(cx, cy, raio, 0);
    corpo += `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="${DESTAQUE}" stroke-width="2.5" stroke-linecap="round"/>`;
    corpo += texto(cx + raio * 0.5, cy + 18, esc(medidas.diametro ?? "diâmetro"), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  }
  if (mostrar.includes("raio")) {
    const b = polar(cx, cy, raio, 90);
    corpo += `<line x1="${cx}" y1="${cy}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="${DESTAQUE}" stroke-width="2.5" stroke-linecap="round"/>`;
    corpo += texto(cx + 26, cy - raio * 0.5, esc(medidas.raio ?? "raio"), { tamanho: 13, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO });
  }
  if (mostrar.includes("corda")) {
    const a = polar(cx, cy, raio, 235), b = polar(cx, cy, raio, 305);
    corpo += `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="${TRACO}" stroke-width="2" stroke-dasharray="5 4"/>`;
    corpo += texto(cx, (a[1] + b[1]) / 2 + 16, esc(medidas.corda ?? "corda"), { tamanho: 12, cor: TRACO, fonte: FONTE_MONO });
  }

  corpo += `<circle cx="${cx}" cy="${cy}" r="4" fill="${DESTAQUE}"/>`;
  corpo += texto(cx - 14, cy - 16, "centro", { tamanho: 12, cor: TRACO, ancora: "end", fonte: FONTE_MONO });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Retângulo com malha de quadradinhos ----------
//
// O desenho que separa perímetro de área: a malha mostra o que se conta por
// DENTRO, e os rótulos dos lados mostram o que se percorre por FORA.

export function retanguloMalha({ colunas, linhas, pintadas = 0, malha = true, rotuloLargura, rotuloAltura, rotulo = "", cel = 32 }) {
  const m = 40;
  // O rótulo da altura fica à esquerda, alinhado pela direita: a margem
  // precisa caber o texto inteiro, senão ele sai cortado pela borda.
  const mEsq = Math.max(m, Math.round(String(rotuloAltura ?? "").length * 7.4) + 26);
  const larg = colunas * cel, alt = linhas * cel;
  const largura = comRotulo(larg + mEsq + m, rotulo);
  const altura = alt + m * 2 + (rotulo ? 22 : 0);
  const x0 = mEsq + (largura - (larg + mEsq + m)) / 2, y0 = m;
  let corpo = "";

  if (malha) {
    for (let l = 0; l < linhas; l++) {
      for (let c = 0; c < colunas; c++) {
        const i = l * colunas + c;
        corpo += `<rect x="${x0 + c * cel}" y="${y0 + l * cel}" width="${cel}" height="${cel}" fill="${i < pintadas ? CHEIO : "none"}" fill-opacity="${i < pintadas ? 0.55 : 1}" stroke="${TRACO}" stroke-width="1.4"/>`;
      }
    }
  } else if (pintadas > 0) {
    corpo += `<rect x="${x0}" y="${y0}" width="${larg}" height="${alt}" fill="${CHEIO}" fill-opacity="0.18"/>`;
  }
  corpo += `<rect x="${x0}" y="${y0}" width="${larg}" height="${alt}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;

  if (rotuloLargura) corpo += texto(x0 + larg / 2, y0 - 18, esc(rotuloLargura), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  if (rotuloAltura) corpo += texto(x0 - 20, y0 + alt / 2, esc(rotuloAltura), { tamanho: 13, cor: DESTAQUE, peso: 500, ancora: "end", fonte: FONTE_MONO });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Figura composta, descrita por movimentos ----------
//
// O contorno vem como uma lista de passos [dx, dy] em unidades de malha, a
// partir do canto de baixo à esquerda. Assim o manifesto descreve a figura
// andando por ela — que é como o aluno vai percorrer o perímetro.

export function figuraComposta({ movimentos, escala = 30, malha = false, rotulosLados = [], rotulo = "" }) {
  // caminha o contorno acumulando os vértices
  const pontos = [[0, 0]];
  for (const [dx, dy] of movimentos) {
    const [x, y] = pontos[pontos.length - 1];
    pontos.push([x + dx, y + dy]);
  }
  const fechou = Math.abs(pontos[pontos.length - 1][0]) < 1e-9 && Math.abs(pontos[pontos.length - 1][1]) < 1e-9;
  if (!fechou) throw new Error("figuraComposta: o contorno não voltou ao ponto de partida");
  pontos.pop();

  const m = rotulosLados.length ? 40 : 24;
  const xs = pontos.map((p) => p[0]), ys = pontos.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const larguraDesenho = (maxX - minX) * escala + m * 2;
  const largura = comRotulo(larguraDesenho, rotulo);
  const recuo = (largura - larguraDesenho) / 2;
  const altura = (maxY - minY) * escala + m * 2 + (rotulo ? 22 : 0);

  // y do desenho cresce para baixo; o contorno foi descrito com y para cima
  const P = pontos.map(([x, y]) => [
    recuo + m + (x - minX) * escala,
    m + (maxY - y) * escala,
  ]);
  const id = "malha-" + movimentos.length + "-" + Math.round((maxX - minX) * 10);
  let corpo = "";

  if (malha) {
    corpo += `<defs><clipPath id="${id}"><polygon points="${P.map((p) => p.join(",")).join(" ")}"/></clipPath></defs>`;
    corpo += `<g clip-path="url(#${id})">`;
    for (let l = 0; l < maxY - minY; l++) {
      for (let c = 0; c < maxX - minX; c++) {
        corpo += `<rect x="${recuo + m + c * escala}" y="${m + l * escala}" width="${escala}" height="${escala}" fill="${CHEIO}" fill-opacity="0.16" stroke="${TRACO}" stroke-width="1.2"/>`;
      }
    }
    corpo += `</g>`;
  }

  corpo += `<polygon points="${P.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${malha ? "none" : CHEIO}" fill-opacity="${malha ? 1 : 0.18}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linejoin="round"/>`;

  // Rótulos no meio de cada lado, empurrados para FORA. A direção não pode
  // vir do centroide: numa figura côncava (o L é o caso) o centroide fica do
  // lado errado de alguns lados e o rótulo cai dentro da figura. Aqui a
  // normal do lado é testada nos dois sentidos e fica a que sai do polígono.
  const marcas = [];
  rotulosLados.forEach((r, i) => {
    if (!r) return;
    const a = P[i], b = P[(i + 1) % P.length];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const [ux, uy] = normalizar(b, a);
    const candidatos = [[uy, -ux], [-uy, ux]];
    const fora = candidatos.find(([nx, ny]) => !dentroDoPoligono([mx + nx * 6, my + ny * 6], P)) ?? candidatos[0];
    marcas.push({ texto: r, x: mx + fora[0] * 20, y: my + fora[1] * 20 });
  });

  // Num vértice côncavo as normais dos dois lados convergem e os rótulos se
  // encavalam. Uma separação curta empurra os pares próximos para longe um do
  // outro — é o bastante, porque a colisão só acontece aos pares.
  for (let passe = 0; passe < 4; passe++) {
    for (let i = 0; i < marcas.length; i++) {
      for (let j = i + 1; j < marcas.length; j++) {
        const dx = marcas[j].x - marcas[i].x, dy = marcas[j].y - marcas[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minimo = (Math.max(marcas[i].texto.length, marcas[j].texto.length) * 7.2) / 2 + 14;
        if (dist >= minimo) continue;
        const empurra = (minimo - dist) / 2;
        const ex = (dx / dist) * empurra, ey = (dy / dist) * empurra;
        marcas[i].x -= ex; marcas[i].y -= ey;
        marcas[j].x += ex; marcas[j].y += ey;
      }
    }
  }
  for (const marca of marcas) {
    corpo += texto(marca.x, marca.y, esc(marca.texto), { tamanho: 12, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  }

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Triângulo com a altura marcada ----------
//
// A altura é o que o aluno mais erra em área de triângulo: ele usa um lado
// inclinado no lugar dela. Por isso a altura aparece tracejada, com o
// quadradinho de ângulo reto na base — ela é sempre perpendicular.

export function trianguloAltura({ base, altura, rotuloBase, rotuloAltura, apice = 0.35, rotulo = "" }) {
  const escala = 26, m = 34;
  const b = base * escala, h = altura * escala;
  const larguraDesenho = b + m * 2;
  const largura = comRotulo(larguraDesenho, rotulo);
  const alturaSvg = h + m * 2 + (rotulo ? 22 : 0);
  const x0 = (largura - b) / 2, y0 = m + h;
  const xa = x0 + b * apice;
  let corpo = "";

  corpo += `<polygon points="${x0},${y0} ${x0 + b},${y0} ${xa},${m}" fill="${CHEIO}" fill-opacity="0.18" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linejoin="round"/>`;
  corpo += `<line x1="${xa}" y1="${m}" x2="${xa}" y2="${y0}" stroke="${TRACO}" stroke-width="2" stroke-dasharray="6 4"/>`;
  corpo += `<path d="M ${xa + 13} ${y0} L ${xa + 13} ${y0 - 13} L ${xa} ${y0 - 13}" fill="none" stroke="${TRACO}" stroke-width="1.6"/>`;

  if (rotuloBase) corpo += texto(x0 + b / 2, y0 + 20, esc(rotuloBase), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  if (rotuloAltura) corpo += texto(xa - 10, m + h / 2, esc(rotuloAltura), { tamanho: 13, cor: DESTAQUE, peso: 500, ancora: "end", fonte: FONTE_MONO });
  if (rotulo) corpo += texto(largura / 2, alturaSvg - 10, esc(rotulo), { tamanho: 14 });
  return svg(largura, alturaSvg, corpo);
}

// ═════════════════ Sólidos, planificações e plano cartesiano ═════════════════

// ---------- Bloco em projeção oblíqua ----------
//
// Perspectiva de verdade encolheria as arestas do fundo e o aluno mediria
// errado. Na projeção oblíqua a face da frente sai em tamanho real e a
// profundidade vai num ângulo fixo — é como o livro didático desenha, e é o
// que deixa as três medidas legíveis ao mesmo tempo.

export function bloco({ c, l, a, escala = 30, cubinhos = false, rotulos = {}, rotulo = "" }) {
  const p = l * escala * 0.5;          // recuo da profundidade
  const w = c * escala, h = a * escala;
  // As margens laterais saem da LARGURA DOS ROTULOS, e nao de um valor fixo.
  // Com 46px chutados a esquerda, um "10 cm" em DM Mono 13 comecava 3px fora
  // da caixa; e a direita o rotulo da profundidade e escrito a p/2 + 16 do
  // canto, entao a folga que sobra depende da propria profundidade do bloco.
  const mEsq = rotulos.altura
    ? Math.max(26, Math.ceil(larguraTexto(rotulos.altura, 13, true)) + 18)
    : 26;
  const mDir = rotulos.largura
    ? Math.max(26, Math.ceil(16 + larguraTexto(rotulos.largura, 13, true) + 8 - p / 2))
    : 26;
  const larguraDesenho = w + p + mEsq + mDir;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = h + p + 30 + (rotulos.comprimento ? 24 : 0) + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  const X = recuo + mEsq, Y = p + 16;   // canto superior esquerdo da face da frente

  const face = (pts, opacidade) =>
    `<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" fill="${CHEIO}" fill-opacity="${opacidade}" stroke="${TRACO_FORTE}" stroke-width="2.2" stroke-linejoin="round"/>`;

  let corpo = "";
  // topo e lateral primeiro, para a face da frente ficar por cima
  corpo += face([[X, Y], [X + w, Y], [X + w + p, Y - p], [X + p, Y - p]], 0.10);
  corpo += face([[X + w, Y], [X + w + p, Y - p], [X + w + p, Y + h - p], [X + w, Y + h]], 0.16);
  corpo += face([[X, Y], [X + w, Y], [X + w, Y + h], [X, Y + h]], 0.24);

  if (cubinhos) {
    const linha = (x1, y1, x2, y2) =>
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${TRACO}" stroke-width="1.1"/>`;
    for (let i = 1; i < c; i++) {
      corpo += linha(X + i * escala, Y, X + i * escala, Y + h);                    // frente, vertical
      corpo += linha(X + i * escala, Y, X + i * escala + p, Y - p);                // topo, profundidade
    }
    for (let i = 1; i < a; i++) {
      corpo += linha(X, Y + i * escala, X + w, Y + i * escala);                    // frente, horizontal
      corpo += linha(X + w, Y + i * escala, X + w + p, Y + i * escala - p);        // lateral, profundidade
    }
    for (let i = 1; i < l; i++) {
      const d = (i * escala) / 2;
      corpo += linha(X + d, Y - d, X + w + d, Y - d);                              // topo, paralela à frente
      corpo += linha(X + w + d, Y - d, X + w + d, Y + h - d);                      // lateral, vertical
    }
  }

  if (rotulos.comprimento) corpo += texto(X + w / 2, Y + h + 18, esc(rotulos.comprimento), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  if (rotulos.altura) corpo += texto(X - 10, Y + h / 2, esc(rotulos.altura), { tamanho: 13, cor: DESTAQUE, peso: 500, ancora: "end", fonte: FONTE_MONO });
  if (rotulos.largura) corpo += texto(X + w + p / 2 + 16, Y + h - p / 2 + 4, esc(rotulos.largura), { tamanho: 13, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO });
  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Sólidos nomeados, lado a lado ----------

function desenhaSolido(tipo, cx, cy, s) {
  const p = s * 0.34;
  const cara = (pts, op) => `<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" fill="${CHEIO}" fill-opacity="${op}" stroke="${TRACO_FORTE}" stroke-width="2.2" stroke-linejoin="round"/>`;
  const X = cx - s / 2, Y = cy - s / 2;
  let d = "";

  if (tipo === "cubo" || tipo === "bloco" || tipo === "prisma-retangular") {
    const w = tipo === "cubo" ? s : s * 1.25, h = s * (tipo === "cubo" ? 1 : 0.8);
    const x = cx - (w + p) / 2, y = cy - (h - p) / 2;
    d += cara([[x, y], [x + w, y], [x + w + p, y - p], [x + p, y - p]], 0.10);
    d += cara([[x + w, y], [x + w + p, y - p], [x + w + p, y + h - p], [x + w, y + h]], 0.16);
    d += cara([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 0.24);
  } else if (tipo === "piramide") {
    const b = s * 1.1, y = cy + s * 0.42;
    d += cara([[cx - b / 2, y], [cx + b / 2, y], [cx + b / 2 + p, y - p], [cx - b / 2 + p, y - p]], 0.10);
    d += cara([[cx - b / 2, y], [cx + b / 2, y], [cx + p * 0.5, cy - s * 0.5]], 0.24);
    d += `<line x1="${cx + b / 2 + p}" y1="${y - p}" x2="${cx + p * 0.5}" y2="${cy - s * 0.5}" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
  } else if (tipo === "prisma-triangular") {
    const b = s, y = cy + s * 0.4, topo = cy - s * 0.42;
    d += cara([[cx - b / 2, y], [cx + b / 2, y], [cx, topo]], 0.24);
    d += cara([[cx + b / 2, y], [cx + b / 2 + p, y - p], [cx + p, topo - p], [cx, topo]], 0.14);
    d += `<line x1="${cx - b / 2}" y1="${y}" x2="${cx - b / 2 + p}" y2="${y - p}" stroke="${TRACO}" stroke-width="1.6" stroke-dasharray="5 4"/>`;
  } else if (tipo === "cilindro") {
    const r = s * 0.42, h = s * 0.86, y = cy - h / 2;
    d += `<path d="M ${cx - r} ${y} L ${cx - r} ${y + h} A ${r} ${r * 0.32} 0 0 0 ${cx + r} ${y + h} L ${cx + r} ${y} Z" fill="${CHEIO}" fill-opacity="0.2" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
    d += `<ellipse cx="${cx}" cy="${y}" rx="${r}" ry="${r * 0.32}" fill="${CHEIO}" fill-opacity="0.1" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
  } else if (tipo === "cone") {
    const r = s * 0.44, y = cy + s * 0.4;
    d += `<path d="M ${cx - r} ${y} L ${cx} ${cy - s * 0.46} L ${cx + r} ${y}" fill="${CHEIO}" fill-opacity="0.2" stroke="${TRACO_FORTE}" stroke-width="2.2" stroke-linejoin="round"/>`;
    d += `<ellipse cx="${cx}" cy="${y}" rx="${r}" ry="${r * 0.3}" fill="${CHEIO}" fill-opacity="0.12" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
  } else if (tipo === "esfera") {
    const r = s * 0.46;
    d += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CHEIO}" fill-opacity="0.2" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
    d += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.3}" fill="none" stroke="${TRACO}" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  }
  return d;
}

export function solidos({ itens, escala = 74, porLinha }) {
  const colunas = porLinha ?? (itens.length <= 3 ? itens.length : Math.ceil(itens.length / 2));
  const linhas = Math.ceil(itens.length / colunas);
  // As dimensões do SVG viram os atributos width/height do <img>, então
  // precisam ser inteiras — o índice de imagens não guarda fração.
  const faixa = Math.round(escala * 1.9), alturaLinha = Math.round(escala * 1.85);
  const largura = faixa * colunas + 16;
  const altura = alturaLinha * linhas;
  let corpo = "";

  itens.forEach((item, i) => {
    const col = i % colunas, lin = Math.floor(i / colunas);
    const cx = 8 + faixa * col + faixa / 2;
    const cy = alturaLinha * lin + escala * 0.78;
    corpo += desenhaSolido(item.tipo, cx, cy, escala);
    if (item.rotulo) corpo += texto(cx, alturaLinha * (lin + 1) - 20, esc(item.rotulo), { tamanho: 13 });
  });
  return svg(largura, altura, corpo);
}

// ---------- Planificações ----------
//
// A planificação vive numa malha de quadrados: cada peça é uma casa dessa
// malha. Descrever a figura por casas [coluna, linha] deixa o manifesto
// pedir o molde sem carregar coordenada nenhuma.

// Cada peça é um retângulo [x, y, largura, altura] em unidades de face.
// Um molde de bloco NÃO pode ser seis retângulos iguais: a caixa tem três
// formatos de face, cada um repetido duas vezes, e um molde uniforme só
// fecharia se fosse um cubo. Por isso as peças vêm com medida própria.
const MOLDES = {
  cubo: [
    [1, 0, 1, 1],
    [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1], [3, 1, 1, 1],
    [1, 2, 1, 1],
  ],
  // c = 1.6 (comprimento), l = 1 (largura), a = 1.1 (altura)
  bloco: [
    [0, 0, 1.6, 1],                                   // topo: c × l
    [0, 1, 1.6, 1.1], [1.6, 1, 1, 1.1],               // frente: c × a · lateral: l × a
    [2.6, 1, 1.6, 1.1], [4.2, 1, 1, 1.1],             // fundo: c × a · lateral: l × a
    [0, 2.1, 1.6, 1],                                 // base: c × l
  ],
};

export function planificacao({ tipo = "cubo", escala = 46, rotulo = "" }) {
  const pecas = MOLDES[tipo] ?? MOLDES.cubo;
  const m = 16;
  const larguraUnid = Math.max(...pecas.map((r) => r[0] + r[2]));
  const alturaUnid = Math.max(...pecas.map((r) => r[1] + r[3]));
  const larguraDesenho = Math.round(larguraUnid * escala) + m * 2;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = Math.round(alturaUnid * escala) + m * 2 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  let corpo = "";

  for (const [x, y, w, h] of pecas) {
    corpo += `<rect x="${(recuo + m + x * escala).toFixed(1)}" y="${(m + y * escala).toFixed(1)}" width="${(w * escala).toFixed(1)}" height="${(h * escala).toFixed(1)}" fill="${CHEIO}" fill-opacity="0.18" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
  }
  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Plano cartesiano ----------

export function planoCartesiano({ ate = 6, pontos = [], escala = 34, ligar = false, caminho = [], rotulo = "" }) {
  const m = 34;
  // O rótulo de um ponto é escrito à direita dele. Um ponto encostado na
  // borda do plano jogaria o texto para fora do SVG, então a folga da
  // direita cresce com o rótulo mais largo que passa do último eixo.
  const folgaRotulo = Math.max(0, ...pontos.map((pt) => {
    const sobra = ate - pt.em[0];
    const largura = String(pt.rotulo ?? "").length * 7.2 + 14;
    return Math.max(0, largura - sobra * escala);
  }));
  const larguraDesenho = Math.round(ate * escala + m * 2 + folgaRotulo);
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = ate * escala + m * 2 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  const O = [recuo + m, m + ate * escala];          // origem, em coordenadas do SVG
  const X = (x) => O[0] + x * escala;
  const Y = (y) => O[1] - y * escala;
  let corpo = "";

  // malha
  for (let i = 0; i <= ate; i++) {
    corpo += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(ate)}" stroke="${TRACO}" stroke-width="1" stroke-opacity="0.55"/>`;
    corpo += `<line x1="${X(0)}" y1="${Y(i)}" x2="${X(ate)}" y2="${Y(i)}" stroke="${TRACO}" stroke-width="1" stroke-opacity="0.55"/>`;
  }
  // eixos, com a seta no fim
  corpo += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(ate) + 10}" y2="${Y(0)}" stroke="${TRACO_FORTE}" stroke-width="2.4"/>`;
  corpo += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(ate) - 10}" stroke="${TRACO_FORTE}" stroke-width="2.4"/>`;
  corpo += `<polygon points="${X(ate) + 16},${Y(0)} ${X(ate) + 8},${Y(0) - 4} ${X(ate) + 8},${Y(0) + 4}" fill="${TRACO_FORTE}"/>`;
  corpo += `<polygon points="${X(0)},${Y(ate) - 16} ${X(0) - 4},${Y(ate) - 8} ${X(0) + 4},${Y(ate) - 8}" fill="${TRACO_FORTE}"/>`;

  for (let i = 1; i <= ate; i++) {
    corpo += texto(X(i), Y(0) + 15, String(i), { tamanho: 11, cor: TRACO_FORTE, fonte: FONTE_MONO });
    corpo += texto(X(0) - 13, Y(i), String(i), { tamanho: 11, cor: TRACO_FORTE, fonte: FONTE_MONO });
  }
  corpo += texto(X(0) - 13, Y(0) + 15, "0", { tamanho: 11, cor: TRACO_FORTE, fonte: FONTE_MONO });

  // O contorno é desenhado antes dos pontos, para que os círculos fiquem por
  // cima das linhas e não pareçam furados.
  if (ligar && pontos.length > 2) {
    const vertices = pontos.map((pt) => `${X(pt.em[0])},${Y(pt.em[1])}`).join(" ");
    corpo += `<polygon points="${vertices}" fill="${CHEIO}" fill-opacity="0.14" stroke="${DESTAQUE}" stroke-width="2.2" stroke-linejoin="round"/>`;
  }
  // O caminho é tracejado de propósito: ele mostra um trajeto possível, e não
  // uma figura. Nos mapas, outra ordem de trechos daria o mesmo comprimento.
  if (caminho.length > 1) {
    const passos = caminho.map(([cx, cy]) => `${X(cx)},${Y(cy)}`).join(" ");
    corpo += `<polyline points="${passos}" fill="none" stroke="${DESTAQUE}" stroke-width="2.6" stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  for (const ponto of pontos) {
    const [px, py] = ponto.em;
    corpo += `<circle cx="${X(px)}" cy="${Y(py)}" r="5.5" fill="${DESTAQUE}" stroke="${TRACO_FORTE}" stroke-width="1.8"/>`;
    if (ponto.rotulo) corpo += texto(X(px) + 12, Y(py) - 12, esc(ponto.rotulo), { tamanho: 12, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO });
  }

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ═════════════════════════ Gráficos e tabelas ═════════════════════════

// ---------- Gráfico de colunas ou de barras ----------
//
// O eixo dos valores começa no zero por padrão. A ÚNICA razão para pedir
// outra base é a lição sobre gráficos enganosos: não dá para ensinar o aluno
// a desconfiar de um eixo cortado sem mostrar um. Quem passa `base` está
// desenhando o truque de propósito, e o alt da figura tem que dizer isso.

export function grafico({ dados, orientacao = "colunas", passo, base = 0, referencia, mostrarValores = true, rotulo = "" }) {
  const maximo = Math.max(...dados.map((d) => d.valor));
  const marca = passo ?? Math.max(1, Math.ceil((maximo - base) / 5));
  const topo = Math.ceil(maximo / marca) * marca;
  // O corte de eixo só existe no gráfico de colunas — é lá que ele engana.
  if (base && orientacao !== "colunas") throw new Error("base cortada só vale para colunas");
  if (base > 0 && base >= Math.min(...dados.map((d) => d.valor))) throw new Error("a base cortada some com alguma barra");

  if (orientacao === "colunas") {
    // A partir de cinco categorias a coluna afina: com a largura fixa, o
    // gráfico passava de 400px e caía para 0,71 do tamanho num celular de
    // 320px — o mesmo aperto que já obrigou `angulosComparados` a quebrar
    // em duas linhas.
    const estreito = dados.length >= 5;
    const larguraCol = estreito ? 38 : 46, folga = estreito ? 18 : 22;
    const mEsq = 44, mDir = 20, alturaEixo = 190;
    const larguraDesenho = mEsq + dados.length * (larguraCol + folga) + mDir;
    const largura = comRotulo(larguraDesenho, rotulo);
    // O valor da coluna é escrito 11px ACIMA do topo dela: sem esta folga, o
    // rótulo da coluna mais alta saía pela borda de cima da figura.
    const folgaTopo = mostrarValores ? 26 : 12;
    const altura = alturaEixo + 62 + folgaTopo - 16 + (rotulo ? 22 : 0);
    const recuo = (largura - larguraDesenho) / 2;
    const piso = alturaEixo + folgaTopo;
    const Y = (v) => piso - ((v - base) / (topo - base)) * alturaEixo;
    let corpo = "";

    for (let v = base; v <= topo; v += marca) {
      corpo += `<line x1="${recuo + mEsq - 6}" y1="${Y(v).toFixed(1)}" x2="${recuo + larguraDesenho - mDir}" y2="${Y(v).toFixed(1)}" stroke="${TRACO}" stroke-width="1" stroke-opacity="${v === base ? 1 : 0.5}"/>`;
      corpo += texto(recuo + mEsq - 12, Y(v), String(v), { tamanho: 11, cor: TRACO_FORTE, ancora: "end", fonte: FONTE_MONO });
    }
    corpo += `<line x1="${recuo + mEsq}" y1="${piso}" x2="${recuo + mEsq}" y2="${Y(topo) - 8}" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;

    dados.forEach((d, i) => {
      const x = recuo + mEsq + folga / 2 + i * (larguraCol + folga);
      const y = Y(d.valor);
      corpo += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${larguraCol}" height="${(piso - y).toFixed(1)}" fill="${CHEIO}" fill-opacity="0.55" stroke="${TRACO_FORTE}" stroke-width="1.8"/>`;
      // O valor é escrito 11px acima do topo da coluna, mas a linha de
      // referência passa por ali quando o valor fica um passo abaixo dela:
      // com o eixo de 0 a 15, a média 9 cortava ao meio os "8" do gráfico.
      // Nesse caso o valor sobe para acima da linha, onde nunca há barra —
      // a coluna começa abaixo dela, por ser menor que a referência.
      if (mostrarValores) {
        let yv = y - 11;
        if (referencia && Math.abs(yv - Y(referencia.valor)) < 9) yv = Y(referencia.valor) - 10;
        corpo += texto(x + larguraCol / 2, yv, String(d.valor), { tamanho: 12, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
      }
      corpo += texto(x + larguraCol / 2, piso + 18, esc(d.rotulo), { tamanho: 12 });
    });

    // A linha de referência atravessa o gráfico na altura de um valor — é
    // assim que a média aparece como um patamar, e não como mais uma coluna.
    // Ela não vai nas questões que PEDEM esse valor: entregaria a resposta.
    if (referencia) {
      const yRef = Y(referencia.valor);
      corpo += `<line x1="${recuo + mEsq}" y1="${yRef.toFixed(1)}" x2="${recuo + larguraDesenho - mDir}" y2="${yRef.toFixed(1)}" stroke="${DESTAQUE}" stroke-width="2.2" stroke-dasharray="7 5"/>`;
      // O rótulo PROCURA o vão livre, em vez de ficar sempre encostado no
      // eixo. A regra antiga escolhia só entre acima e abaixo da linha, e
      // numa primeira coluna da altura da média o texto caía dentro dela:
      // "média 5" ficava espremido entre as duas bordas da barra da Ana.
      // Agora os quatro cantos são testados e vence o que menos encosta em
      // barra e em valor escrito.
      if (referencia.rotulo) {
        const lt = larguraTexto(referencia.rotulo, 12, true);
        const xEsq = recuo + mEsq + 6;
        const xDir = recuo + larguraDesenho - mDir - 6 - lt;
        // O que o texto não pode cobrir: as barras e os valores escritos.
        const obstaculos = dados.map((d, i) => {
          const x = recuo + mEsq + folga / 2 + i * (larguraCol + folga);
          return { x, y: Y(d.valor), w: larguraCol, h: piso - Y(d.valor) };
        });
        if (mostrarValores) {
          for (const [i, d] of dados.entries()) {
            const x = recuo + mEsq + folga / 2 + i * (larguraCol + folga);
            const lv = larguraTexto(String(d.valor), 12, true);
            // mesmo desvio aplicado ao desenhar o valor, senão o rótulo da
            // referência escolheria o canto contando com um obstáculo que
            // não está mais ali
            let yv = Y(d.valor) - 11;
            if (Math.abs(yv - yRef) < 9) yv = yRef - 10;
            obstaculos.push({ x: x + larguraCol / 2 - lv / 2, y: yv - 7, w: lv, h: 14 });
          }
        }
        const encosta = (x, y) => {
          const a = { x, y: y - 7, w: lt, h: 14 };
          let soma = 0;
          for (const o of obstaculos) {
            const dx = Math.min(a.x + a.w, o.x + o.w) - Math.max(a.x, o.x);
            const dy = Math.min(a.y + a.h, o.y + o.h) - Math.max(a.y, o.y);
            if (dx > 0 && dy > 0) soma += dx * dy;
          }
          return soma;
        };
        const cantos = [
          [xEsq, yRef + 13], [xEsq, yRef - 11],
          [xDir, yRef + 13], [xDir, yRef - 11],
        ];
        const [xt, yt] = cantos.reduce((a, b) => (encosta(...b) < encosta(...a) ? b : a));
        corpo += texto(xt, yt, esc(referencia.rotulo), { tamanho: 12, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO });
      }
    }

    if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
    return svg(largura, altura, corpo);
  }

  // barras horizontais
  const alturaBarra = 30, folga = 16, mTopo = 16;
  const rotuloMax = Math.max(...dados.map((d) => String(d.rotulo).length));
  const mEsq = Math.round(rotuloMax * 7) + 18;
  const comprimento = 230;
  const larguraDesenho = mEsq + comprimento + 52;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = mTopo + dados.length * (alturaBarra + folga) + 26 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  let corpo = "";

  corpo += `<line x1="${recuo + mEsq}" y1="${mTopo - 4}" x2="${recuo + mEsq}" y2="${mTopo + dados.length * (alturaBarra + folga)}" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
  dados.forEach((d, i) => {
    const y = mTopo + i * (alturaBarra + folga);
    const w = (d.valor / topo) * comprimento;
    corpo += `<rect x="${recuo + mEsq}" y="${y}" width="${w.toFixed(1)}" height="${alturaBarra}" fill="${CHEIO}" fill-opacity="0.55" stroke="${TRACO_FORTE}" stroke-width="1.8"/>`;
    corpo += texto(recuo + mEsq - 10, y + alturaBarra / 2, esc(d.rotulo), { tamanho: 12, ancora: "end" });
    if (mostrarValores) corpo += texto(recuo + mEsq + w + 10, y + alturaBarra / 2, String(d.valor), { tamanho: 12, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO });
  });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ---------- Tabela de dados ----------

/**
 * Grade com cabeçalho.
 *
 * **A largura de cada coluna sai do CONTEÚDO dela**, e `larguraCol` é só o
 * piso. A primeira versão usava largura fixa e nunca media o texto: numa
 * tabela de Probabilidade, "antes, contando os casos" atravessava a borda
 * direita e invadia o lado de fora da moldura. A auditoria que fechou o 7º
 * ano achou dez células assim, em oito matérias diferentes.
 *
 * As colunas têm larguras independentes de propósito — forçar todas ao
 * tamanho da maior desperdiça espaço horizontal, que é justamente o que falta
 * num celular de 320px.
 */
export function tabela({ cabecalho, linhas, rotulo = "", larguraCol = 108 }) {
  const alturaLinha = 34, m = 12, folgaCel = 22;
  const colunas = cabecalho.length;
  const largurasCol = cabecalho.map((titulo, c) => Math.max(
    larguraCol,
    Math.ceil(Math.max(
      larguraTexto(titulo, 12, true),
      ...linhas.map((l) => larguraTexto(String(l[c] ?? ""), 13, true))
    )) + folgaCel
  ));
  const larguraTabela = largurasCol.reduce((soma, w) => soma + w, 0);
  const larguraDesenho = larguraTabela + m * 2;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = (linhas.length + 1) * alturaLinha + m * 2 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  const X = (c) => recuo + m + largurasCol.slice(0, c).reduce((soma, w) => soma + w, 0);
  let corpo = "";

  cabecalho.forEach((titulo, c) => {
    corpo += `<rect x="${X(c)}" y="${m}" width="${largurasCol[c]}" height="${alturaLinha}" fill="${CHEIO}" fill-opacity="0.16" stroke="${TRACO}" stroke-width="1.4"/>`;
    corpo += texto(X(c) + largurasCol[c] / 2, m + alturaLinha / 2, esc(titulo), { tamanho: 12, cor: TRACO_FORTE, peso: 500, fonte: FONTE_MONO });
  });

  linhas.forEach((linha, l) => {
    linha.forEach((celula, c) => {
      const y = m + (l + 1) * alturaLinha;
      corpo += `<rect x="${X(c)}" y="${y}" width="${largurasCol[c]}" height="${alturaLinha}" fill="none" stroke="${TRACO}" stroke-width="1.4"/>`;
      corpo += texto(X(c) + largurasCol[c] / 2, y + alturaLinha / 2, esc(celula), { tamanho: 13, cor: DESTAQUE, fonte: FONTE_MONO });
    });
  });

  corpo += `<rect x="${recuo + m}" y="${m}" width="${larguraTabela}" height="${(linhas.length + 1) * alturaLinha}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.4"/>`;
  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ═════════════════════════ Números inteiros ═════════════════════════
//
// O bloco do 7º ano. A ideia central da matéria é que o zero deixou de ser o
// fim da reta, e é isso que os desenhos precisam mostrar: existe coisa à
// ESQUERDA do zero, e ela é ordenada ao contrário da intuição de contagem.
//
// Por isso o zero é sempre marcado com traço mais alto e mais claro que os
// outros — ele é a referência, e não só mais um número da fila.

/** Sinal de menos tipográfico. O hífen do teclado é curto demais e some. */
const MENOS = "−";
const inteiro = (n) => (n < 0 ? MENOS + Math.abs(n) : String(n));

/**
 * Reta numérica com negativos.
 *
 * `salto` desenha o movimento de uma soma ou subtração como um arco por cima
 * da reta — que é como a operação deve ser lida no começo da matéria: andar
 * para a direita ou para a esquerda, e não aplicar uma regra decorada.
 */
export function retaInteiros({
  de = -8, ate = 8, marcados = [], salto, intervalo, rotuloCada = 1, subdivisoes = 1, rotulo = "",
}) {
  const divisoes = ate - de;
  // O passo mínimo é o que os RÓTULOS escritos pedem, e não um número fixo.
  // Ele sai da largura do maior rótulo (em DM Mono, ~7,2px por caractere)
  // dividida por quantos tracinhos existem entre dois rótulos: numa reta que
  // numera de dois em dois, os tracinhos podem ficar bem mais juntos sem nada
  // se encavalar. Com piso fixo, uma reta de −10 a 10 passava de 420px e caía
  // para 0,69 do tamanho num celular de 320px.
  const digitos = Math.max(inteiro(de).length, inteiro(ate).length);
  // Quando há subdivisões, cada tracinho menor precisa de uns 5px para não
  // virar uma mancha: uma reta em décimos com passo de 34px empilhava dez
  // tracinhos em 3px cada. O teto sobe junto, senão o mínimo nunca caberia.
  const passoMinimo = Math.max(13, Math.ceil((digitos * 7.2 + 4) / rotuloCada), subdivisoes * 5);
  const teto = Math.max(34, subdivisoes * 6);
  const passo = Math.min(teto, Math.max(passoMinimo, Math.round(320 / divisoes)));
  const m = 30;
  const alturaSalto = salto ? 54 : 0;
  const larguraDesenho = divisoes * passo + m * 2;
  const largura = comRotulo(larguraDesenho, rotulo);
  const recuo = (largura - larguraDesenho) / 2;
  const X = (v) => recuo + m + (v - de) * passo;
  // Quantas LINHAS de rótulo de ponto a figura vai precisar. Dois pontos
  // vizinhos na reta ficam a poucos pixels um do outro, e os rótulos saíam
  // sobrepostos: "−3/4" e "−1/2" viravam "−3/1/42". Quem não cabe ao lado
  // sobe uma linha, e a caixa cresce junto.
  const niveis = [];
  for (const ponto of marcados) {
    if (!ponto.rotulo) continue;
    const x = X(ponto.em), meia = larguraTexto(ponto.rotulo, 12, true) / 2;
    let nivel = 0;
    while (niveis.some((e) => e.nivel === nivel && Math.abs(e.x - x) < e.meia + meia + 4)) nivel += 1;
    niveis.push({ em: ponto.em, x, meia, nivel });
  }
  const niveisExtra = niveis.length ? Math.max(...niveis.map((e) => e.nivel)) : 0;
  const altura = 92 + alturaSalto + niveisExtra * 17 + (rotulo ? 22 : 0);
  const y = 34 + alturaSalto + niveisExtra * 17;
  let corpo = "";

  corpo += `<line x1="${X(de) - 14}" y1="${y}" x2="${X(ate) + 14}" y2="${y}" stroke="${TRACO_FORTE}" stroke-width="2.4" stroke-linecap="round"/>`;
  // setas nas duas pontas: a reta continua para os dois lados
  corpo += `<polygon points="${X(ate) + 20},${y} ${X(ate) + 10},${y - 4.5} ${X(ate) + 10},${y + 4.5}" fill="${TRACO_FORTE}"/>`;
  corpo += `<polygon points="${X(de) - 20},${y} ${X(de) - 10},${y - 4.5} ${X(de) - 10},${y + 4.5}" fill="${TRACO_FORTE}"/>`;

  // Tracinhos menores entre os inteiros, para os racionais terem onde cair.
  // Eles vêm antes dos inteiros no SVG para nunca cobrirem o traço do zero.
  if (subdivisoes > 1) {
    for (let v = de; v < ate; v++) {
      for (let k = 1; k < subdivisoes; k++) {
        const x = X(v + k / subdivisoes);
        corpo += `<line x1="${x.toFixed(1)}" y1="${y - 4.5}" x2="${x.toFixed(1)}" y2="${y + 4.5}" stroke="${TRACO}" stroke-width="1.2" stroke-opacity="0.7"/>`;
      }
    }
  }

  for (let v = de; v <= ate; v++) {
    const zero = v === 0;
    const x = X(v);
    corpo += `<line x1="${x}" y1="${y - (zero ? 13 : 8)}" x2="${x}" y2="${y + (zero ? 13 : 8)}" stroke="${zero ? DESTAQUE : TRACO}" stroke-width="${zero ? 2.6 : 1.8}" stroke-linecap="round"/>`;
    if (v % rotuloCada === 0 || zero) {
      corpo += texto(x, y + 30, inteiro(v), {
        tamanho: 12, cor: zero ? DESTAQUE : TRACO_FORTE, peso: zero ? 500 : 400, fonte: FONTE_MONO,
      });
    }
  }

  // O conjunto solução de uma inequação: faixa grossa saindo do ponto para o
  // lado que serve, e bolinha ABERTA quando o próprio ponto não entra.
  //
  // A distinção aberta/fechada não é enfeite — ela é a diferença entre < e ≤,
  // e é a única coisa na figura que diz se o extremo faz parte da resposta.
  // Como o fundo do PNG é transparente, "aberta" é um círculo vazado de traço
  // grosso, que sobre a canvas quente lê como furo.
  if (intervalo) {
    const paraDireita = intervalo.sentido === "maior";
    const xPonto = X(intervalo.ponto);
    const xFim = paraDireita ? X(ate) + 16 : X(de) - 16;
    corpo += `<line x1="${xPonto}" y1="${y}" x2="${xFim}" y2="${y}" stroke="${DESTAQUE}" stroke-width="5" stroke-linecap="round" stroke-opacity="0.85"/>`;
    const dir = paraDireita ? 1 : -1;
    corpo += `<polygon points="${xFim + 8 * dir},${y} ${xFim - 3 * dir},${y - 6} ${xFim - 3 * dir},${y + 6}" fill="${DESTAQUE}"/>`;
    corpo += intervalo.incluso
      ? `<circle cx="${xPonto}" cy="${y}" r="6.5" fill="${DESTAQUE}" stroke="${DESTAQUE}" stroke-width="2"/>`
      : `<circle cx="${xPonto}" cy="${y}" r="6" fill="${CANVAS}" stroke="${DESTAQUE}" stroke-width="3"/>`;
    if (intervalo.rotulo) {
      corpo += texto(xPonto, y - 22, esc(intervalo.rotulo), {
        tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    }
  }

  // Os rótulos dos pontos marcados sobem uma LINHA quando encostariam no
  // rótulo do ponto anterior. Dois pontos vizinhos na reta — −3/4 e −1/2, por
  // exemplo — ficam a poucos pixels um do outro, e os dois textos saíam
  // sobrepostos, ilegíveis: "−3/4" e "−1/2" viravam "−3/1/42".
  const yBase = y - (salto ? 22 : 20);
  for (const ponto of marcados) {
    const x = X(ponto.em);
    corpo += `<circle cx="${x}" cy="${y}" r="6" fill="${DESTAQUE}" stroke="${TRACO_FORTE}" stroke-width="1.8"/>`;
    if (ponto.rotulo) {
      const nivel = (niveis.find((e) => e.em === ponto.em) || {}).nivel || 0;
      corpo += texto(x, yBase - nivel * 17, esc(ponto.rotulo), {
        tamanho: 12, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    }
  }

  if (salto) {
    const x1 = X(salto.de), x2 = X(salto.para);
    const topo = y - 20 - alturaSalto / 2;
    corpo += `<path d="M ${x1} ${y - 14} Q ${(x1 + x2) / 2} ${topo} ${x2} ${y - 14}" fill="none" stroke="${DESTAQUE}" stroke-width="2.2" stroke-dasharray="6 4"/>`;
    const dir = x2 >= x1 ? 1 : -1;
    corpo += `<polygon points="${x2},${y - 10} ${x2 - 5 * dir},${y - 20} ${x2 + 5 * dir},${y - 20}" fill="${DESTAQUE}"/>`;
    if (salto.rotulo) {
      corpo += texto((x1 + x2) / 2, topo + 4, esc(salto.rotulo), {
        tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    }
  }

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

/**
 * Termômetro: o negativo que o aluno já viu na vida antes da aula.
 *
 * A escala é vertical e o zero fica no meio, com traço destacado — a leitura
 * "abaixo de zero" vira literal, e não uma figura de linguagem.
 */
export function termometro({ valor, de = -20, ate = 40, passo = 10, rotulo = "" }) {
  const alturaEscala = 240, m = 26, larguraTubo = 26;
  const larguraDesenho = 150;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = alturaEscala + m * 2 + 34 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  const xTubo = recuo + 78;
  const Y = (v) => m + alturaEscala - ((v - de) / (ate - de)) * alturaEscala;
  let corpo = "";

  // tubo
  corpo += `<rect x="${xTubo - larguraTubo / 2}" y="${m - 6}" width="${larguraTubo}" height="${alturaEscala + 12}" rx="13" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
  // A coluna sobe do BULBO até o valor, como num termômetro de verdade — e
  // não a partir do zero. Quem lê "abaixo de zero" vê a coluna parando antes
  // do traço do zero, que é a leitura que a matéria quer ensinar.
  const yZero = Y(0), yValor = Y(valor);
  const yBulbo = m + alturaEscala + 16;
  corpo += `<rect x="${xTubo - 7}" y="${yValor.toFixed(1)}" width="14" height="${(yBulbo - yValor).toFixed(1)}" fill="${CHEIO}" fill-opacity="0.7"/>`;
  corpo += `<circle cx="${xTubo}" cy="${yBulbo}" r="17" fill="${CHEIO}" fill-opacity="0.7" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;

  for (let v = de; v <= ate; v += passo) {
    const zero = v === 0;
    const y = Y(v);
    corpo += `<line x1="${xTubo - larguraTubo / 2 - (zero ? 12 : 7)}" y1="${y}" x2="${xTubo - larguraTubo / 2}" y2="${y}" stroke="${zero ? DESTAQUE : TRACO}" stroke-width="${zero ? 2.4 : 1.6}"/>`;
    corpo += texto(xTubo - larguraTubo / 2 - 17, y, inteiro(v), {
      tamanho: 12, cor: zero ? DESTAQUE : TRACO_FORTE, peso: zero ? 500 : 400, ancora: "end", fonte: FONTE_MONO,
    });
  }

  corpo += texto(xTubo + larguraTubo / 2 + 12, yValor, `${inteiro(valor)}°C`, {
    tamanho: 14, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO,
  });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

/**
 * Saldo: barras que sobem do zero (entrada) ou descem dele (dívida).
 *
 * É a metáfora que dá sentido à soma de sinais diferentes — ter 50 e dever 80
 * não é "somar 130", é ver quem ganha o cabo de guerra.
 */
export function saldo({ itens, rotulo = "", passo }) {
  const maximo = Math.max(...itens.map((i) => Math.abs(i.valor)));
  const marca = passo ?? Math.max(1, Math.ceil(maximo / 4));
  const topo = Math.ceil(maximo / marca) * marca;
  const larguraCol = itens.length >= 5 ? 38 : 46;
  const folga = itens.length >= 5 ? 18 : 24;
  const mEsq = 46, mDir = 18, meia = 96;
  const larguraDesenho = mEsq + itens.length * (larguraCol + folga) + mDir;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = meia * 2 + 62 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  const yZero = meia + 18;
  const Y = (v) => yZero - (v / topo) * meia;
  let corpo = "";

  for (let v = -topo; v <= topo; v += marca) {
    const zero = v === 0;
    corpo += `<line x1="${recuo + mEsq - 6}" y1="${Y(v).toFixed(1)}" x2="${recuo + larguraDesenho - mDir}" y2="${Y(v).toFixed(1)}" stroke="${zero ? DESTAQUE : TRACO}" stroke-width="${zero ? 2.2 : 1}" stroke-opacity="${zero ? 1 : 0.45}"/>`;
    corpo += texto(recuo + mEsq - 12, Y(v), inteiro(v), {
      tamanho: 11, cor: zero ? DESTAQUE : TRACO_FORTE, ancora: "end", fonte: FONTE_MONO,
    });
  }

  itens.forEach((item, i) => {
    const x = recuo + mEsq + folga / 2 + i * (larguraCol + folga);
    const y = Y(item.valor);
    const alturaBarra = Math.abs(y - yZero);
    corpo += `<rect x="${x.toFixed(1)}" y="${Math.min(y, yZero).toFixed(1)}" width="${larguraCol}" height="${alturaBarra.toFixed(1)}" fill="${CHEIO}" fill-opacity="${item.valor < 0 ? 0.28 : 0.6}" stroke="${TRACO_FORTE}" stroke-width="1.8"/>`;
    // o rótulo da categoria foge da barra: em cima quando ela desce
    const yRotulo = item.valor < 0 ? yZero - 12 : yZero + 20;
    corpo += texto(x + larguraCol / 2, yRotulo, esc(item.rotulo), { tamanho: 12 });
    if (item.valor !== 0) {
      corpo += texto(x + larguraCol / 2, item.valor > 0 ? y - 10 : y + 16, inteiro(item.valor), {
        tamanho: 12, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    }
  });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

/**
 * Prédio com subsolo: os andares empilhados, com o térreo no zero.
 *
 * Serve para a mesma ideia da reta, virada em pé — e é o exemplo em que o
 * aluno já usa números negativos sem chamá-los assim.
 */
export function predio({ de = -3, ate = 5, atual, rotulo = "" }) {
  const alturaAndar = 30, larguraAndar = 118, m = 16;
  const quantos = ate - de + 1;
  const larguraDesenho = larguraAndar + 96;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = quantos * alturaAndar + m * 2 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  const x = recuo + 70;
  let corpo = "";

  for (let v = ate; v >= de; v--) {
    const y = m + (ate - v) * alturaAndar;
    const terreo = v === 0;
    const aqui = v === atual;
    corpo += `<rect x="${x}" y="${y}" width="${larguraAndar}" height="${alturaAndar}" fill="${CHEIO}" fill-opacity="${aqui ? 0.55 : terreo ? 0.2 : 0.08}" stroke="${terreo || aqui ? DESTAQUE : TRACO}" stroke-width="${terreo || aqui ? 2.2 : 1.4}"/>`;
    corpo += texto(x - 12, y + alturaAndar / 2, inteiro(v), {
      tamanho: 12, cor: terreo || aqui ? DESTAQUE : TRACO_FORTE, peso: terreo || aqui ? 500 : 400, ancora: "end", fonte: FONTE_MONO,
    });
    const nome = terreo ? "térreo" : v > 0 ? `${v}º andar` : `subsolo ${Math.abs(v)}`;
    corpo += texto(x + larguraAndar / 2, y + alturaAndar / 2, nome, {
      tamanho: 12, cor: terreo || aqui ? DESTAQUE : TEXTO,
    });
  }

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ═════════════════════════ Razão e proporção ═════════════════════════
//
// A razão é uma COMPARAÇÃO, e comparação se enxerga colocando as duas
// quantidades lado a lado. Por isso o desenho da matéria não é um gráfico de
// valores: são duas fileiras de blocos que a gente conta de olho, e cuja
// proporção é o conteúdo.

/**
 * Duas ou mais quantidades como fileiras de blocos unitários.
 *
 * `agrupar` desenha um vão a cada N blocos — é assim que a simplificação
 * aparece antes de virar conta: doze e oito, agrupados de quatro em quatro,
 * viram visivelmente três grupos contra dois.
 */
export function razao({ itens, unidade = 18, agrupar, rotulo = "", mostrarTotal = true }) {
  const maior = Math.max(...itens.map((i) => i.quantidade));
  const vao = 3;
  const folgaGrupo = agrupar ? 8 : 0;
  const gruposMax = agrupar ? Math.ceil(maior / agrupar) : 0;
  const larguraBlocos = maior * (unidade + vao) + gruposMax * folgaGrupo;
  const rotuloMax = Math.max(...itens.map((i) => String(i.rotulo ?? "").length));
  const mEsq = Math.round(rotuloMax * 7.2) + 22;
  const mDir = mostrarTotal ? 44 : 16;
  const alturaLinha = unidade + 16;
  const larguraDesenho = mEsq + larguraBlocos + mDir;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = itens.length * alturaLinha + 22 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  let corpo = "";

  itens.forEach((item, linha) => {
    const y = 12 + linha * alturaLinha;
    corpo += texto(recuo + mEsq - 12, y + unidade / 2, esc(item.rotulo ?? ""), {
      tamanho: 12, ancora: "end",
    });
    let x = recuo + mEsq;
    for (let k = 0; k < item.quantidade; k++) {
      if (agrupar && k > 0 && k % agrupar === 0) x += folgaGrupo;
      corpo += `<rect x="${x.toFixed(1)}" y="${y}" width="${unidade}" height="${unidade}" rx="2" fill="${CHEIO}" fill-opacity="${item.vazio ? 0.16 : 0.55}" stroke="${TRACO_FORTE}" stroke-width="1.5"/>`;
      x += unidade + vao;
    }
    if (mostrarTotal) {
      corpo += texto(x + 8, y + unidade / 2, String(item.quantidade), {
        tamanho: 13, cor: DESTAQUE, peso: 500, ancora: "start", fonte: FONTE_MONO,
      });
    }
  });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

/**
 * Tabela de valores proporcionais, com o fator que leva de uma coluna à
 * seguinte desenhado por cima.
 *
 * É o desenho que mostra POR QUE duas grandezas são proporcionais: o mesmo
 * multiplicador atravessa a tabela inteira. Numa tabela sem as setas, o aluno
 * vê números; com elas, vê a regularidade.
 */
export function tabelaProporcional({ titulos, colunas, fatores = [], fatoresBaixo = [], rotulo = "" }) {
  const larguraCol = 70, alturaLinha = 34, m = 12, mRotulo = 88;
  const alturaSetas = fatores.length ? 30 : 0;
  const alturaSetasBaixo = fatoresBaixo.length ? 30 : 0;
  const larguraDesenho = mRotulo + colunas.length * larguraCol + m * 2;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = alturaSetas + alturaSetasBaixo + 2 * alturaLinha + m * 2 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  const X = (c) => recuo + m + mRotulo + c * larguraCol;
  let corpo = "";

  // setas do fator, entre as colunas
  fatores.forEach((fator, c) => {
    if (!fator) return;
    const x1 = X(c) + larguraCol / 2, x2 = X(c + 1) + larguraCol / 2;
    const y = m + alturaSetas - 8;
    corpo += `<path d="M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - 18} ${x2} ${y}" fill="none" stroke="${DESTAQUE}" stroke-width="1.8" stroke-dasharray="5 4"/>`;
    corpo += `<polygon points="${x2},${y + 3} ${x2 - 4},${y - 5} ${x2 + 4},${y - 5}" fill="${DESTAQUE}"/>`;
    corpo += texto((x1 + x2) / 2, y - 22, esc(fator), {
      tamanho: 12, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
    });
  });

  [0, 1].forEach((linha) => {
    const y = m + alturaSetas + linha * alturaLinha;
    corpo += texto(recuo + m + mRotulo - 12, y + alturaLinha / 2, esc(titulos[linha]), {
      tamanho: 12, ancora: "end",
    });
    colunas.forEach((par, c) => {
      corpo += `<rect x="${X(c)}" y="${y}" width="${larguraCol}" height="${alturaLinha}" fill="${CHEIO}" fill-opacity="${linha === 0 ? 0.16 : 0}" stroke="${TRACO}" stroke-width="1.4"/>`;
      corpo += texto(X(c) + larguraCol / 2, y + alturaLinha / 2, esc(String(par[linha])), {
        tamanho: 13, cor: DESTAQUE, fonte: FONTE_MONO,
      });
    });
  });
  corpo += `<rect x="${X(0)}" y="${m + alturaSetas}" width="${colunas.length * larguraCol}" height="${2 * alturaLinha}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;

  // Setas embaixo, para a segunda grandeza.
  //
  // É este par de arcos que distingue direta de inversa numa olhada: com os
  // dois fatores iguais e no mesmo sentido, direta; com o de baixo apontando
  // para o outro lado, inversa. Sem isso, as duas tabelas seriam idênticas.
  fatoresBaixo.forEach((fator, c) => {
    if (!fator) return;
    const meioC = X(c) + larguraCol / 2, meioD = X(c + 1) + larguraCol / 2;
    const paraTras = String(fator).startsWith("÷");
    const x1 = paraTras ? meioD : meioC;
    const x2 = paraTras ? meioC : meioD;
    const y = m + alturaSetas + 2 * alturaLinha + 8;
    corpo += `<path d="M ${x1} ${y} Q ${(x1 + x2) / 2} ${y + 18} ${x2} ${y}" fill="none" stroke="${DESTAQUE}" stroke-width="1.8" stroke-dasharray="5 4"/>`;
    corpo += `<polygon points="${x2},${y - 3} ${x2 - 4},${y + 5} ${x2 + 4},${y + 5}" fill="${DESTAQUE}"/>`;
    corpo += texto((x1 + x2) / 2, y + 26, esc(fator), {
      tamanho: 12, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
    });
  });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

// ═════════════════════════ Linguagem algébrica ═════════════════════════
//
// Esta é a primeira matéria sem figura óbvia: não há barra para dividir nem
// ângulo para medir, porque o objeto de estudo é a LETRA. O bloco foi
// decidido antes do conteúdo, justamente para a regra "toda questão tem
// imagem" não virar enfeite.
//
// São três metáforas, e cada uma carrega uma ideia:
//
//   · a SEQUÊNCIA mostra de onde a letra vem — ela é o que sobra quando a
//     gente para de desenhar a figura 1, a figura 2, a figura 3;
//   · a BALANÇA mostra o que uma igualdade quer dizer — os dois pratos
//     pesam o mesmo, e é isso e só isso que o sinal de igual afirma;
//   · o TOKEN (caixinha com letra, moeda com número) mostra por que 3x + 2x
//     junta e 3x + 2 não junta: caixa soma com caixa, moeda com moeda.
//
// A caixa e a moeda são desenhadas pelo mesmo helper nos três geradores, de
// propósito: o aluno tem de reconhecer o mesmo objeto na balança e fora dela.

const TOKEN = 32;
const TOKEN_OP = 20;
const OPERADORES = ["+", "−", "=", "·", "×"];

/** Um token é moeda quando é número puro, e caixinha quando tem letra. */
function tokenEhNumero(t) {
  return /^[0-9]+([.,][0-9]+)?$/.test(String(t).trim());
}

function larguraToken(t) {
  return OPERADORES.includes(String(t).trim()) ? TOKEN_OP : TOKEN;
}

/**
 * Desenha um token no canto (x, y).
 *
 * Moeda para o número, caixa para a letra. A distinção é de FORMA, e não de
 * cor — o DESIGN.md não tem paleta de acento, e mesmo se tivesse, a diferença
 * entre "coisa contada" e "coisa desconhecida" não é decorativa.
 */
function desenhaToken(x, y, t) {
  const s = String(t).trim();
  if (OPERADORES.includes(s)) {
    return texto(x + TOKEN_OP / 2, y + TOKEN / 2, esc(s), {
      tamanho: 17, cor: TEXTO, fonte: FONTE_MONO,
    });
  }
  if (tokenEhNumero(s)) {
    return `<circle cx="${x + TOKEN / 2}" cy="${y + TOKEN / 2}" r="${TOKEN / 2 - 1}" fill="${CHEIO}" fill-opacity="0.2" stroke="${TRACO_FORTE}" stroke-width="1.6"/>`
      + texto(x + TOKEN / 2, y + TOKEN / 2, esc(s), { tamanho: 13, cor: DESTAQUE, fonte: FONTE_MONO });
  }
  return `<rect x="${x}" y="${y}" width="${TOKEN}" height="${TOKEN}" rx="3" fill="${CHEIO}" fill-opacity="0.55" stroke="${TRACO_FORTE}" stroke-width="1.6"/>`
    + texto(x + TOKEN / 2, y + TOKEN / 2, esc(s), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
}

/** Largura ocupada por uma fileira de tokens, com o vão entre eles. */
function larguraFileira(tokens, vao = 6) {
  if (!tokens.length) return 0;
  return tokens.reduce((s, t) => s + larguraToken(t) + vao, 0) - vao;
}

function desenhaFileira(x, y, tokens, vao = 6) {
  let corpo = "", cursor = x;
  for (const t of tokens) {
    corpo += desenhaToken(cursor, y, t);
    cursor += larguraToken(t) + vao;
  }
  return corpo;
}

/**
 * Fileiras de tokens, com rótulo à esquerda.
 *
 * É o desenho de termos semelhantes: caixa junta com caixa, moeda com moeda,
 * e o que não é do mesmo tipo fica lado a lado sem se somar. Os operadores
 * ("+", "=") entram na própria fileira, sem caixa em volta.
 */
export function tokensAlgebricos({ linhas, rotulo = "" }) {
  const rotuloMax = Math.max(0, ...linhas.map((l) => String(l.rotulo ?? "").length));
  const mEsq = rotuloMax ? Math.round(rotuloMax * 7.4) + 22 : 14;
  const larguraFileiras = Math.max(...linhas.map((l) => larguraFileira(l.tokens)));
  const alturaLinha = TOKEN + 18;
  const larguraDesenho = mEsq + larguraFileiras + 16;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = linhas.length * alturaLinha + 12 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  let corpo = "";

  linhas.forEach((linha, i) => {
    const y = 10 + i * alturaLinha;
    if (linha.rotulo) {
      corpo += texto(recuo + mEsq - 12, y + TOKEN / 2, esc(linha.rotulo), { tamanho: 12, ancora: "end" });
    }
    corpo += desenhaFileira(recuo + mEsq, y, linha.tokens);
  });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return fechar(largura, altura, corpo, rotulo, 14);
}

/**
 * Balança de dois pratos.
 *
 * O sinal de igual não é "a conta dá": é "os dois lados valem o mesmo". A
 * balança diz isso sem precisar de frase, e é a figura que sustenta a lição
 * de igualdade — e, na matéria seguinte, a de equação.
 *
 * `inclinacao` ("esquerda" | "direita") pende a travessa para o lado mais
 * pesado. Fica reservada para desigualdade: numa igualdade a travessa é
 * horizontal, sempre.
 */
export function balanca({ esquerda, direita, inclinacao = null, rotulo = "", porLinha = 4 }) {
  const arruma = (tokens) => {
    const linhas = [];
    for (let i = 0; i < tokens.length; i += porLinha) linhas.push(tokens.slice(i, i + porLinha));
    return linhas;
  };
  const pratos = [arruma(esquerda), arruma(direita)];
  const larguraPrato = Math.max(112, ...pratos.flat().map((linha) => larguraFileira(linha) + 20));
  const alturaLinha = TOKEN + 7;
  const alturaTokens = Math.max(...pratos.map((p) => p.length)) * alturaLinha + 6;

  const meiaEnvergadura = larguraPrato / 2 + 14;
  const larguraDesenho = meiaEnvergadura * 2 + larguraPrato + 16;
  const largura = comRotulo(larguraDesenho, rotulo);
  const cx = largura / 2;

  const yTravessa = 16;
  const desnivel = inclinacao === "esquerda" ? 13 : inclinacao === "direita" ? -13 : 0;
  const yPrato = yTravessa + 16 + alturaTokens;
  const yBase = yPrato + 13 + 26 + Math.abs(desnivel);
  const altura = yBase + 14 + (rotulo ? 20 : 0);

  const pontas = [
    { x: cx - meiaEnvergadura, dy: desnivel, linhas: pratos[0] },
    { x: cx + meiaEnvergadura, dy: -desnivel, linhas: pratos[1] },
  ];
  let corpo = "";

  corpo += `<path d="M ${cx - 9} ${yBase} L ${cx - 3} ${yTravessa + 4} L ${cx + 3} ${yTravessa + 4} L ${cx + 9} ${yBase} Z" fill="${CHEIO}" fill-opacity="0.14" stroke="${TRACO}" stroke-width="1.5"/>`;
  corpo += `<line x1="${cx - 30}" y1="${yBase}" x2="${cx + 30}" y2="${yBase}" stroke="${TRACO_FORTE}" stroke-width="3" stroke-linecap="round"/>`;

  corpo += `<line x1="${pontas[0].x}" y1="${yTravessa + pontas[0].dy}" x2="${pontas[1].x}" y2="${yTravessa + pontas[1].dy}" stroke="${TRACO_FORTE}" stroke-width="3" stroke-linecap="round"/>`;
  corpo += `<circle cx="${cx}" cy="${yTravessa}" r="4.5" fill="${DESTAQUE}"/>`;

  for (const ponta of pontas) {
    const topo = yTravessa + ponta.dy;
    const base = yPrato + ponta.dy;
    const esq = ponta.x - larguraPrato / 2, dir = ponta.x + larguraPrato / 2;
    // As cordas prendem PARA DENTRO da borda, e não nos cantos do prato.
    // Presas no canto, elas formavam um triângulo que envolvia a pilha
    // inteira de fichas, e a balança virava um emaranhado de linhas —
    // justamente na figura em que se quer contar as fichas de olho.
    const preso = larguraPrato * 0.22;
    corpo += `<line x1="${(esq + preso).toFixed(1)}" y1="${base.toFixed(1)}" x2="${ponta.x.toFixed(1)}" y2="${(topo + 2).toFixed(1)}" stroke="${TRACO}" stroke-width="1.3" stroke-opacity="0.7"/>`;
    corpo += `<line x1="${(dir - preso).toFixed(1)}" y1="${base.toFixed(1)}" x2="${ponta.x.toFixed(1)}" y2="${(topo + 2).toFixed(1)}" stroke="${TRACO}" stroke-width="1.3" stroke-opacity="0.7"/>`;
    corpo += `<path d="M ${esq.toFixed(1)} ${base.toFixed(1)} L ${dir.toFixed(1)} ${base.toFixed(1)} L ${(dir - 14).toFixed(1)} ${(base + 13).toFixed(1)} L ${(esq + 14).toFixed(1)} ${(base + 13).toFixed(1)} Z" fill="${CHEIO}" fill-opacity="0.2" stroke="${TRACO_FORTE}" stroke-width="2"/>`;
    ponta.linhas.forEach((linha, i) => {
      const y = base - 4 - (ponta.linhas.length - i) * alturaLinha + 7;
      corpo += desenhaFileira(ponta.x - larguraFileira(linha) / 2, y, linha);
    });
  }

  if (rotulo) corpo += texto(largura / 2, altura - 9, esc(rotulo), { tamanho: 14 });
  return svg(largura, altura, corpo);
}

/**
 * Barra dividida em pedaços nomeados, com a chave do total por cima.
 *
 * É o diagrama de fita: mostra a ESTRUTURA de um problema sem entregar o
 * valor da incógnita. Por isso os pedaços são esquemáticos — a largura de
 * cada um vem de `unidades`, que descreve o que o enunciado JÁ diz (2x é o
 * dobro de x), e nunca do valor procurado.
 */
export function barraIncognita({ partes, total = "", largura = 380, rotulo = "" }) {
  const unidadesTotal = partes.reduce((s, p) => s + (p.unidades ?? 1), 0);
  const m = 10;
  // A chave do total leva um texto 19px acima dela; com 32 o texto saía
  // pela borda de cima.
  const alturaChave = total ? 44 : 6;
  const alturaBarra = 62;
  const L = comRotulo(largura, rotulo);
  const altura = alturaChave + alturaBarra + 16 + (rotulo ? 22 : 0);
  const recuo = (L - largura) / 2;
  const util = largura - m * 2;
  let corpo = "";
  let x = recuo + m;

  for (const parte of partes) {
    const w = (util * (parte.unidades ?? 1)) / unidadesTotal;
    const y = alturaChave + 6;
    corpo += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${alturaBarra}" fill="${CHEIO}" fill-opacity="${parte.conhecido ? 0.16 : 0.5}" stroke="${TRACO_FORTE}" stroke-width="1.8"/>`;
    corpo += texto((x + w / 2).toFixed(1), y + alturaBarra / 2, esc(parte.rotulo), {
      tamanho: 15, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
    });
    x += w;
  }

  if (total) {
    const x1 = recuo + m, x2 = recuo + m + util, y = alturaChave - 6;
    corpo += `<path d="M ${x1} ${y} L ${x1} ${y - 7} L ${x2} ${y - 7} L ${x2} ${y}" fill="none" stroke="${TRACO}" stroke-width="1.6"/>`;
    corpo += texto((x1 + x2) / 2, y - 19, esc(total), { tamanho: 14, cor: DESTAQUE, fonte: FONTE_MONO });
  }

  if (rotulo) corpo += texto(L / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return svg(L, altura, corpo);
}

/**
 * A máquina: entra um número, sai outro, e dentro dela está a expressão.
 *
 * O valor numérico é isso — a letra é uma entrada, e a expressão é o que a
 * máquina faz com ela. Quando a saída é "?", a figura mostra o cenário sem
 * responder a pergunta.
 */
export function maquinaFuncao({ regra, pares, rotulo = "" }) {
  const larguraCaixa = Math.max(112, Math.round(String(regra).length * 11) + 34);
  const larguraLado = Math.max(
    40,
    ...pares.map((p) => String(p.entra).length * 9 + 14),
    ...pares.map((p) => String(p.sai).length * 9 + 14)
  );
  const seta = 40;
  const alturaLinha = 34;
  const alturaCaixa = Math.max(72, pares.length * alturaLinha + 26);
  const larguraDesenho = (larguraLado + seta) * 2 + larguraCaixa + 12;
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = 22 + alturaCaixa + 16 + (rotulo ? 20 : 0);
  const recuo = (largura - larguraDesenho) / 2;

  const xCaixa = recuo + 6 + larguraLado + seta;
  const yCaixa = 22;
  let corpo = "";

  corpo += texto(recuo + 6 + larguraLado / 2, 11, "entra", { tamanho: 11 });
  corpo += texto(xCaixa + larguraCaixa + seta + larguraLado / 2, 11, "sai", { tamanho: 11 });

  corpo += `<rect x="${xCaixa}" y="${yCaixa}" width="${larguraCaixa}" height="${alturaCaixa}" rx="4" fill="${CHEIO}" fill-opacity="0.16" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;
  corpo += texto(xCaixa + larguraCaixa / 2, yCaixa + alturaCaixa / 2, esc(regra), {
    tamanho: 17, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
  });

  pares.forEach((par, i) => {
    const y = yCaixa + alturaCaixa / 2 + (i - (pares.length - 1) / 2) * alturaLinha;
    corpo += texto(recuo + 6 + larguraLado / 2, y, esc(par.entra), {
      tamanho: 14, cor: DESTAQUE, fonte: FONTE_MONO,
    });
    const xe = recuo + 6 + larguraLado + 4;
    corpo += `<line x1="${xe}" y1="${y}" x2="${xe + seta - 14}" y2="${y}" stroke="${TRACO}" stroke-width="1.6"/>`;
    corpo += `<polygon points="${xe + seta - 6},${y} ${xe + seta - 15},${y - 4.5} ${xe + seta - 15},${y + 4.5}" fill="${TRACO}"/>`;

    const xs = xCaixa + larguraCaixa + 4;
    corpo += `<line x1="${xs}" y1="${y}" x2="${xs + seta - 14}" y2="${y}" stroke="${TRACO}" stroke-width="1.6"/>`;
    corpo += `<polygon points="${xs + seta - 6},${y} ${xs + seta - 15},${y - 4.5} ${xs + seta - 15},${y + 4.5}" fill="${TRACO}"/>`;
    corpo += texto(xs + seta + larguraLado / 2 - 4, y, esc(par.sai), {
      tamanho: 14, cor: DESTAQUE, fonte: FONTE_MONO,
    });
  });

  if (rotulo) corpo += texto(largura / 2, altura - 9, esc(rotulo), { tamanho: 14 });
  return svg(largura, altura, corpo);
}

/**
 * Uma sequência de figuras que crescem por um passo constante.
 *
 * O gerador CALCULA a própria figura a partir de `a` e `b`: a figura n tem n
 * grupos de `a` quadradinhos mais `b` fixos, ou seja, a·n + b peças. É de
 * propósito, e pela mesma razão de `fatoracao` e `fatoresRepetidos` — o
 * desenho não tem como discordar do enunciado. Ninguém digita a contagem.
 *
 * `mostrarTotal` fica falso nas questões que PEDEM a contagem: ali o número
 * embaixo da figura seria a resposta desenhada.
 */
export function sequenciaFiguras({ a, b = 0, quantos = 3, cel = 17, mostrarTotal = true, rotulo = "" }) {
  const colunas = (n) => n + (b > 0 ? 1 : 0);
  const alturaGrade = Math.max(a, b) * cel;
  const vao = 26;
  const larguras = [];
  for (let n = 1; n <= quantos; n++) larguras.push(colunas(n) * cel);
  const larguraFiguras = larguras.reduce((s, w) => s + w + vao, 0) - vao;
  const largura = comRotulo(larguraFiguras + 24, rotulo);
  const alturaRodape = mostrarTotal ? 38 : 24;
  const altura = 14 + alturaGrade + alturaRodape + (rotulo ? 20 : 0);
  const yBase = 14 + alturaGrade;
  let corpo = "";
  let x = (largura - larguraFiguras) / 2;

  for (let n = 1; n <= quantos; n++) {
    const larguraFig = colunas(n) * cel;
    for (let g = 0; g < n; g++) {
      for (let k = 0; k < a; k++) {
        corpo += `<rect x="${x + g * cel}" y="${yBase - (k + 1) * cel}" width="${cel}" height="${cel}" fill="${CHEIO}" fill-opacity="0.5" stroke="${TRACO_FORTE}" stroke-width="1.4"/>`;
      }
    }
    for (let k = 0; k < b; k++) {
      corpo += `<rect x="${x + n * cel}" y="${yBase - (k + 1) * cel}" width="${cel}" height="${cel}" fill="none" stroke="${TRACO}" stroke-width="1.4" stroke-dasharray="3 2"/>`;
    }
    corpo += texto(x + larguraFig / 2, yBase + 15, `figura ${n}`, { tamanho: 11 });
    if (mostrarTotal) {
      corpo += texto(x + larguraFig / 2, yBase + 31, String(a * n + b), {
        tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    }
    x += larguraFig + vao;
  }

  if (rotulo) corpo += texto(largura / 2, altura - 8, esc(rotulo), { tamanho: 14 });
  return svg(largura, altura, corpo);
}

// ═════════════════ Retas paralelas e transversais (7º ano) ═════════════════
//
// Abre o bloco de geometria do 7º ano, e é o primeiro gerador desde o 6º que
// não coube em nada do que existia: `retasCruzadas` desenha DUAS retas se
// cortando, e aqui são três, com os oito ângulos que só existem porque as
// duas cortadas são paralelas.
//
// A convenção dos quatro setores de cada cruzamento é a MESMA de
// `retasCruzadas`, de propósito — o aluno vem de lá, e trocar a ordem no meio
// do caminho custaria mais do que economizaria:
//
//     a = [0, θ]        canto de cima à direita
//     b = [θ, 180]      canto de cima à esquerda
//     c = [180, 180+θ]  canto de baixo à esquerda
//     d = [180+θ, 360]  canto de baixo à direita
//
// A caixa do SVG sai dos pontos gerados, e não de uma largura fixa — foi
// assim que os cortes de rótulo do bloco de ângulos pararam de acontecer.

/**
 * Duas retas paralelas cortadas por uma transversal.
 *
 * `graus` é o ângulo agudo entre a transversal e as paralelas. Os rótulos de
 * cada cruzamento entram por `cima` e `baixo`, com as chaves a, b, c e d.
 *
 * `marcados` recebe chaves no formato "cima.a" ou "baixo.d" e desenha o arco
 * daquele ângulo com traço forte — é assim que a figura APONTA um par sem
 * dizer quanto ele mede.
 */
export function paralelasTransversal({
  graus = 60, cima = {}, baixo = {}, marcados = [], nomes = {}, rotulo = "",
}) {
  const h = 108;                       // distância entre as paralelas
  // O rótulo de um setor é escrito a r + 21 do cruzamento, e r chega a 38 —
  // então um rótulo do cruzamento de CIMA pode subir 59px, mais meia linha de
  // texto. Com yCima em 58 os rótulos apontados para cima saíam pela borda
  // superior da figura, o que aconteceu em cinco desenhos da matéria.
  const yCima = 74, yBaixo = yCima + h;
  const t = graus * RAD;
  // Deslocamento horizontal entre os dois cruzamentos. A transversal sobe
  // para a direita, então o cruzamento de cima fica à direita do de baixo.
  const dx = h / Math.tan(t);
  const meia = Math.abs(dx) / 2;
  // O comprimento das paralelas cede quando a transversal é muito inclinada.
  // Com braço fixo, uma transversal de 140° (dx ≈ 129) fazia a figura passar
  // de 430px e cair para 0,66 num celular de 320px — o mesmo aperto que já
  // obrigou `angulosComparados` a quebrar em duas linhas. O piso de 100
  // garante que os dois cruzamentos continuem folgados dentro das retas.
  const braco = Math.max(100, 132 - Math.abs(dx) * 0.35);
  const sobra = 46;                    // o quanto a transversal passa das retas

  const cx = 0;                        // centro provisório; recentraliza depois
  const xCima = cx + dx / 2, xBaixo = cx - dx / 2;

  // Pontas da transversal, estendida além dos dois cruzamentos.
  const [txCima, tyCima] = polar(xCima, yCima, sobra, graus);
  const [txBaixo, tyBaixo] = polar(xBaixo, yBaixo, sobra, graus + 180);

  // A caixa sai dos pontos, com folga para os rótulos dos ângulos.
  const folga = 54;
  // O nome da reta é escrito 14px DEPOIS da ponta dela, e a caixa precisa
  // contar com isso: sem essa sobra, o rótulo da paralela mais deslocada
  // saía cortado — foi o que aconteceu com o "r" na primeira prova do
  // gerador, justamente na figura que nomeia as três retas.
  const sobraNome = nomes.cima || nomes.baixo || nomes.transversal ? 30 : 0;
  const xs = [
    xCima - braco, xCima + braco + (nomes.cima ? sobraNome : 0),
    xBaixo - braco, xBaixo + braco + (nomes.baixo ? sobraNome : 0),
    txCima + (nomes.transversal ? sobraNome : 0), txBaixo,
  ];
  const minX = Math.min(...xs) - 8, maxX = Math.max(...xs) + 8;
  const larguraDesenho = maxX - minX;
  const largura = comRotulo(Math.max(larguraDesenho, meia * 2 + folga * 2), rotulo);
  const desloca = largura / 2 - (minX + maxX) / 2;
  const altura = Math.max(tyBaixo, yBaixo) + 26 + (rotulo ? 22 : 0);

  const X = (x) => x + desloca;
  let corpo = "";

  // as duas paralelas
  for (const [y, x, nome] of [[yCima, xCima, nomes.cima], [yBaixo, xBaixo, nomes.baixo]]) {
    corpo += `<line x1="${X(x - braco).toFixed(1)}" y1="${y}" x2="${X(x + braco).toFixed(1)}" y2="${y}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
    // as setinhas que dizem "esta reta é paralela àquela"
    for (const lado of [-1, 1]) {
      const px = X(x + lado * (braco - 26));
      corpo += `<polygon points="${px + lado * 9},${y} ${px},${y - 4.5} ${px},${y + 4.5}" fill="${TRACO}"/>`;
    }
    if (nome) {
      corpo += texto(X(x + braco) + 14, y, esc(nome), {
        tamanho: 13, cor: TRACO_FORTE, peso: 500, fonte: FONTE_MONO,
      });
    }
  }

  // a transversal, de uma ponta à outra
  corpo += `<line x1="${X(txBaixo).toFixed(1)}" y1="${tyBaixo.toFixed(1)}" x2="${X(txCima).toFixed(1)}" y2="${tyCima.toFixed(1)}" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linecap="round"/>`;
  if (nomes.transversal) {
    corpo += texto(X(txCima) + 12, tyCima - 4, esc(nomes.transversal), {
      tamanho: 13, cor: TRACO_FORTE, peso: 500, fonte: FONTE_MONO,
    });
  }

  // os quatro setores de cada cruzamento, na convenção de retasCruzadas
  const setores = [
    { chave: "a", de: 0, ate: graus },
    { chave: "b", de: graus, ate: 180 },
    { chave: "c", de: 180, ate: 180 + graus },
    { chave: "d", de: 180 + graus, ate: 360 },
  ];

  for (const [onde, x, y, mapa] of [["cima", xCima, yCima, cima], ["baixo", xBaixo, yBaixo, baixo]]) {
    setores.forEach((s, i) => {
      const texto_ = mapa[s.chave];
      if (texto_ === undefined) return;
      const forte = marcados.includes(`${onde}.${s.chave}`);
      const r = 27 + (i % 2) * 11;
      corpo += `<path d="${arco(X(x), y, r, s.de, s.ate)}" fill="none" stroke="${forte ? DESTAQUE : TRACO}" stroke-width="${forte ? 3 : 2}"/>`;
      const [tx, ty] = polar(X(x), y, r + 21, (s.de + s.ate) / 2);
      corpo += texto(tx, ty, esc(texto_), {
        tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    });
    corpo += `<circle cx="${X(x).toFixed(1)}" cy="${y}" r="4" fill="${DESTAQUE}"/>`;
  }

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return svg(Math.round(largura), Math.round(altura), corpo);
}

// ═════════════ Triângulos e quadriláteros (7º ano) ═════════════
//
// Quase tudo veio pronto do 6º ano: `figuraPlana` já desenha os cinco
// triângulos e os seis quadriláteros nomeados, com rótulo de lado, rótulo de
// vértice e marca de ângulo reto. Faltavam duas coisas, e só duas.

/**
 * Varetas de comprimentos dados, emendadas numa linha.
 *
 * É a figura da condição de existência: com dois pedaços emendados em cima e
 * o terceiro embaixo, dá para VER se os dois menores alcançam o maior. Um
 * triângulo que não fecha é um triângulo que não existe, e isso não se
 * enxerga num desenho de triângulo — justamente porque ele não pode ser
 * desenhado.
 *
 * A escala é comum a todas as linhas, senão a comparação seria mentira.
 */
export function varetas({ linhas, unidade = 26, rotulo = "" }) {
  const total = (l) => l.pedacos.reduce((s, p) => s + p, 0);
  const maior = Math.max(...linhas.map(total));
  const alturaLinha = 58;
  const h = 24;
  const rotuloMax = Math.max(0, ...linhas.map((l) => String(l.rotulo ?? "").length));
  const mEsq = rotuloMax ? Math.round(rotuloMax * 7.2) + 20 : 12;
  // A unidade cede quando a maior linha é comprida, para a figura não estourar
  // a largura de um celular — mesma disciplina da reta dos inteiros.
  const passo = Math.min(unidade, Math.floor((300 - mEsq) / maior));
  // A nota é escrita DEPOIS do fim da linha, e sem contá-la a largura corta o
  // texto — "o limite de cima" saía como "o".
  const notaMax = Math.max(0, ...linhas.map((l) => String(l.nota ?? "").length));
  const larguraDesenho = mEsq + maior * passo + 16 + Math.round(notaMax * 6.1);
  const largura = comRotulo(larguraDesenho, rotulo);
  const altura = linhas.length * alturaLinha + 10 + (rotulo ? 22 : 0);
  const recuo = (largura - larguraDesenho) / 2;
  let corpo = "";

  linhas.forEach((linha, i) => {
    const y = 12 + i * alturaLinha;
    if (linha.rotulo) {
      corpo += texto(recuo + mEsq - 12, y + h / 2, esc(linha.rotulo), { tamanho: 12, ancora: "end" });
    }
    let x = recuo + mEsq;
    for (const pedaco of linha.pedacos) {
      const w = pedaco * passo;
      corpo += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="2" fill="${CHEIO}" fill-opacity="${linha.vazio ? 0.16 : 0.5}" stroke="${TRACO_FORTE}" stroke-width="1.8"/>`;
      corpo += texto(x + w / 2, y + h / 2, String(pedaco), {
        tamanho: 12, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
      x += w;
    }
    // marca onde essa linha termina, para a comparação ser de olho
    corpo += `<line x1="${x.toFixed(1)}" y1="${y - 5}" x2="${x.toFixed(1)}" y2="${y + h + 5}" stroke="${TRACO}" stroke-width="1.4" stroke-dasharray="3 3"/>`;
    if (linha.nota) {
      corpo += texto(x + 8, y + h + 16, esc(linha.nota), { tamanho: 11, ancora: "start" });
    }
  });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return svg(Math.round(largura), altura, corpo);
}

/**
 * Um triângulo com uma reta paralela à base passando pelo vértice de cima.
 *
 * É a figura que DEMONSTRA a soma 180°, e ela existe porque sem essa figura a
 * lição vira decoreba. Os dois ângulos que sobram na paralela são alternos
 * internos dos ângulos da base — exatamente a propriedade da matéria
 * anterior —, e os três juntos formam um ângulo raso.
 *
 * `mostrarAlternos` liga os rótulos dos alternos na paralela; sem ele a
 * figura mostra só o cenário, sem entregar a demonstração.
 */
export function trianguloParalela({ rotulos = {}, mostrarAlternos = true, rotulo = "" }) {
  // Um triângulo bem escaleno, para nenhum ângulo parecer igual a outro.
  const A = [40, 168], B = [250, 168], C = [148, 52];
  const m = 46;
  const largura = comRotulo(330, rotulo);
  const altura = 232 + (rotulo ? 22 : 0);
  const desloca = (largura - 290) / 2;
  const P = (p) => [p[0] + desloca, p[1]];
  const [ax, ay] = P(A), [bx, by] = P(B), [cx, cy] = P(C);
  let corpo = "";

  // a paralela à base, passando pelo vértice de cima
  corpo += `<line x1="${cx - m - 60}" y1="${cy}" x2="${cx + m + 60}" y2="${cy}" stroke="${TRACO}" stroke-width="2" stroke-dasharray="7 5"/>`;
  // as setinhas de paralelismo, na paralela e na base
  for (const [y, xc] of [[cy, cx], [by, (ax + bx) / 2]]) {
    for (const lado of [-1, 1]) {
      const px = xc + lado * 62;
      corpo += `<polygon points="${px + lado * 8},${y} ${px},${y - 4} ${px},${y + 4}" fill="${TRACO}"/>`;
    }
  }

  // o triângulo
  corpo += `<polygon points="${ax},${ay} ${bx},${by} ${cx},${cy}" fill="${CHEIO}" fill-opacity="0.18" stroke="${TRACO_FORTE}" stroke-width="2.5" stroke-linejoin="round"/>`;

  // arcos e rótulos dos três ângulos internos
  const interno = (v, u, w, chave, r) => {
    const a1 = (Math.atan2(-(u[1] - v[1]), u[0] - v[0]) * 180) / Math.PI;
    const a2 = (Math.atan2(-(w[1] - v[1]), w[0] - v[0]) * 180) / Math.PI;
    let de = a1;
    let d = ((a2 - a1) % 360 + 360) % 360;
    if (d > 180) { de = a2; d = 360 - d; }
    corpo += `<path d="${arco(v[0], v[1], r, de, de + d)}" fill="none" stroke="${DESTAQUE}" stroke-width="2.2"/>`;
    const [tx, ty] = polar(v[0], v[1], r + 18, de + d / 2);
    if (rotulos[chave]) {
      corpo += texto(tx, ty, esc(rotulos[chave]), { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
    }
  };
  interno([ax, ay], [bx, by], [cx, cy], "a", 30);
  interno([bx, by], [cx, cy], [ax, ay], "b", 30);
  interno([cx, cy], [ax, ay], [bx, by], "c", 26);

  // os dois alternos internos, em cima da paralela
  if (mostrarAlternos) {
    const alterno = (paraOnde, chave, r) => {
      const fim = paraOnde === "esq" ? [cx - m - 40, cy] : [cx + m + 40, cy];
      const outro = paraOnde === "esq" ? [ax, ay] : [bx, by];
      const a1 = (Math.atan2(-(fim[1] - cy), fim[0] - cx) * 180) / Math.PI;
      const a2 = (Math.atan2(-(outro[1] - cy), outro[0] - cx) * 180) / Math.PI;
      let de = a1;
      let d = ((a2 - a1) % 360 + 360) % 360;
      if (d > 180) { de = a2; d = 360 - d; }
      corpo += `<path d="${arco(cx, cy, r, de, de + d)}" fill="none" stroke="${DESTAQUE}" stroke-width="2.2" stroke-dasharray="4 3"/>`;
      const [tx, ty] = polar(cx, cy, r + 17, de + d / 2);
      if (rotulos[chave]) {
        corpo += texto(tx, ty, esc(rotulos[chave]), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
      }
    };
    alterno("esq", "aLinha", 44);
    alterno("dir", "bLinha", 44);
  }

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return svg(Math.round(largura), altura, corpo);
}

// ═════════════ Circunferência e círculo (7º ano) ═════════════
//
// O `circulo` do 6º ano já desenha raio, diâmetro, corda e centro, mas com
// rótulos fixos ("raio", "diâmetro"). Aqui as questões precisam rotular
// MEDIDAS, então ele ganhou `medidas`.
//
// O gerador novo existe por um motivo só, e é o mesmo de `trianguloParalela`:
// sem uma figura que mostre de onde o π vem, ele vira um número decorado.

/**
 * A circunferência desenrolada, comparada com o próprio diâmetro.
 *
 * É a figura que EXPLICA o π. Em cima, o círculo com o diâmetro marcado;
 * embaixo, a volta esticada numa fita, repartida em três pedaços do tamanho
 * do diâmetro mais uma sobra. Dá para ver que cabem três diâmetros e ainda
 * falta um pedacinho — que é exatamente o que 3,14 quer dizer.
 *
 * As medidas do desenho são calculadas com o π de verdade, e não com 3,14
 * arredondado: a sobra desenhada tem de ser a sobra real.
 */
export function piDesenrolado({ diametro = 88, rotulo = "", mostrarSobra = true }) {
  const raio = diametro / 2;
  const m = 26;
  const volta = Math.PI * diametro;
  const largura = comRotulo(Math.max(volta + m * 2, diametro + m * 2), rotulo);
  const alturaCirculo = diametro + 30;
  const altura = alturaCirculo + 92 + (rotulo ? 22 : 0);
  const cx = largura / 2;
  const cy = 16 + raio;
  let corpo = "";

  // o círculo, com o diâmetro marcado na horizontal
  corpo += `<circle cx="${cx}" cy="${cy}" r="${raio}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  corpo += `<line x1="${cx - raio}" y1="${cy}" x2="${cx + raio}" y2="${cy}" stroke="${DESTAQUE}" stroke-width="2.5" stroke-linecap="round"/>`;
  corpo += texto(cx, cy - 12, "d", { tamanho: 14, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  corpo += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${DESTAQUE}"/>`;

  // a fita: a volta inteira esticada
  const y = alturaCirculo + 30;
  const x0 = (largura - volta) / 2;
  corpo += `<line x1="${x0.toFixed(1)}" y1="${y}" x2="${(x0 + volta).toFixed(1)}" y2="${y}" stroke="${TRACO_FORTE}" stroke-width="3" stroke-linecap="round"/>`;

  // as três marcas de um diâmetro cada, e a sobra
  for (let i = 0; i <= 3; i++) {
    const x = x0 + i * diametro;
    corpo += `<line x1="${x.toFixed(1)}" y1="${y - 9}" x2="${x.toFixed(1)}" y2="${y + 9}" stroke="${DESTAQUE}" stroke-width="2"/>`;
    if (i < 3) {
      corpo += texto(x + diametro / 2, y - 18, "d", {
        tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO,
      });
    }
  }
  // a ponta da fita
  const fim = x0 + volta;
  corpo += `<line x1="${fim.toFixed(1)}" y1="${y - 9}" x2="${fim.toFixed(1)}" y2="${y + 9}" stroke="${TRACO_FORTE}" stroke-width="2"/>`;

  if (mostrarSobra) {
    const meioSobra = x0 + 3 * diametro + (volta - 3 * diametro) / 2;
    corpo += texto(meioSobra, y - 20, "sobra", { tamanho: 11, cor: TRACO });
    corpo += `<path d="M ${(x0 + 3 * diametro).toFixed(1)} ${y + 20} L ${fim.toFixed(1)} ${y + 20}" stroke="${TRACO}" stroke-width="1.6"/>`;
  }

  corpo += texto(cx, y + 40, "a volta inteira, esticada", { tamanho: 12, cor: TEXTO });

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return svg(Math.round(largura), altura, corpo);
}

// ═══════════════════ Probabilidade (7º ano) ═══════════════════
//
// Quase tudo veio pronto: `colecao` mostra favoráveis dentro de possíveis,
// `roda` e `barra` mostram a probabilidade como fração de um todo, `arranjos`
// desenha o princípio multiplicativo e `tabela` cobre frequência.
//
// O que faltava é a grade de dois dados — e ela não é um detalhe da matéria:
// é a matéria. Ninguém acredita que somar 7 é seis vezes mais provável que
// somar 12 até ver as 36 células e contar.

/**
 * O espaço amostral de dois dados, como grade 6×6.
 *
 * Cada célula traz a SOMA dos dois dados, e o gerador a calcula — não recebe
 * pronta. `destacar` é uma função que decide quais células ficam marcadas,
 * então a figura não tem como discordar do enunciado: quem conta as células
 * destacadas conta o que a pergunta pede.
 */
export function gradeDados({ destacar, rotulo = "", mostrarSomas = true }) {
  const cel = 34, cabecalho = 26, m = 10;
  const largura = comRotulo(m * 2 + cabecalho + 6 * cel, rotulo);
  const altura = m * 2 + cabecalho + 6 * cel + 16 + (rotulo ? 22 : 0);
  const recuo = (largura - (m * 2 + cabecalho + 6 * cel)) / 2;
  const x0 = recuo + m + cabecalho, y0 = m + cabecalho;
  let corpo = "";
  let marcadas = 0;

  // cabeçalhos: o dado de cima e o dado da esquerda
  for (let d = 1; d <= 6; d++) {
    corpo += texto(x0 + (d - 1) * cel + cel / 2, y0 - cabecalho / 2, String(d), {
      tamanho: 13, cor: TRACO_FORTE, peso: 500, fonte: FONTE_MONO,
    });
    corpo += texto(recuo + m + cabecalho / 2, y0 + (d - 1) * cel + cel / 2, String(d), {
      tamanho: 13, cor: TRACO_FORTE, peso: 500, fonte: FONTE_MONO,
    });
  }

  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const x = x0 + (b - 1) * cel, y = y0 + (a - 1) * cel;
      const marcada = destacar ? !!destacar(a, b) : false;
      if (marcada) marcadas += 1;
      corpo += `<rect x="${x}" y="${y}" width="${cel}" height="${cel}" fill="${CHEIO}" fill-opacity="${marcada ? 0.55 : 0.1}" stroke="${TRACO}" stroke-width="1.2"/>`;
      if (mostrarSomas) {
        corpo += texto(x + cel / 2, y + cel / 2, String(a + b), {
          tamanho: 12, cor: marcada ? DESTAQUE : TEXTO, peso: marcada ? 500 : 400, fonte: FONTE_MONO,
        });
      }
    }
  }
  // moldura por fora, para a grade fechar
  corpo += `<rect x="${x0}" y="${y0}" width="${6 * cel}" height="${6 * cel}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.2"/>`;

  if (rotulo) corpo += texto(largura / 2, altura - 10, esc(rotulo), { tamanho: 14 });
  return svg(Math.round(largura), altura, corpo);
}

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
  return svg(L, A, corpo);
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
  return svg(largura, A, corpo);
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
  return svg(L, A, corpo);
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
  return svg(L, A, corpo);
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

export function barraEtapas({ etapas, largura = 500, rotuloTotal = "total" }) {
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
  return svg(L, A, corpo);
}

// ---------- Diagrama de partes nomeadas (para problemas de conjunto) ----------
//
// Uma barra do total dividida em categorias com rótulo — usada em problemas
// do tipo "um quarto joga vôlei, um terço joga futebol...".

export function barraCategorias({ categorias, largura = 520, rotuloTotal }) {
  const m = 8, h = 62;
  const util = largura - m * 2;
  const A = h + m * 2 + categorias.length * 26 + 30;
  let corpo = "";
  let inicio = 0;

  categorias.forEach((cat, i) => {
    const w = util * cat.fracao;
    const x = m + util * inicio;
    corpo += `<rect x="${x.toFixed(2)}" y="${m}" width="${w.toFixed(2)}" height="${h}" fill="${CHEIO}" fill-opacity="${0.22 + 0.2 * i}" stroke="${TRACO}" stroke-width="2"/>`;
    if (w > 44) corpo += texto(x + w / 2, m + h / 2, esc(cat.curto), { tamanho: 13, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
    inicio += cat.fracao;
  });
  corpo += `<rect x="${m}" y="${m}" width="${util}" height="${h}" fill="none" stroke="${TRACO_FORTE}" stroke-width="2.5"/>`;
  if (rotuloTotal) corpo += texto(m + util / 2, m + h + 18, esc(rotuloTotal), { tamanho: 13, cor: TRACO_FORTE, fonte: FONTE_MONO });

  categorias.forEach((cat, i) => {
    const y = m + h + 34 + i * 26;
    corpo += `<rect x="${m}" y="${y - 8}" width="14" height="14" fill="${CHEIO}" fill-opacity="${0.22 + 0.2 * i}" stroke="${TRACO}" stroke-width="1.5"/>`;
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
  corpo += texto((m + xf) / 2, yc + 26, esc(valorTotal), { tamanho: 15, cor: DESTAQUE, peso: 500, fonte: FONTE_MONO });
  if (rotulo) corpo += texto(L / 2, 136, esc(rotulo), { tamanho: 14 });
  return svg(L, A, corpo);
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

export function retaDecimal({ inicio, fim, divisoes, marcados = [], largura = 500, casas = 1 }) {
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

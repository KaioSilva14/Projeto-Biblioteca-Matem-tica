// certificado.ts — desenho e download do certificado de conclusão.
//
// Decisão técnica: canvas → PNG.
//   - window.print() depende do diálogo do navegador, quebra no celular e não
//     deixa arquivo nenhum com o aluno;
//   - jsPDF acrescentaria dependência a um projeto que hoje roda só com
//     Express + tsc, e o produto não precisa de PDF vetorial.
// O canvas funciona offline, igual no celular, e entrega um arquivo que o
// aluno salva, imprime ou manda para o professor.
//
// Visual: o mesmo sistema do DESIGN.md — canvas quente, off-white, Inter,
// hairline em vez de sombra, sem acento cromático. O certificado tem que
// parecer parte do site, não um diploma de clipart.

import type { Certificado } from "./tipos.js";

const LARGURA = 2000;
const ALTURA = 1414; // A4 paisagem a ~170dpi: bom em tela e na impressão

const CANVAS = "#2b2622";
const CANVAS_SOFT = "#383330";
const HAIRLINE = "#3f3a36";
const INK = "#f7f5f0";
const BODY = "#c9c0ad";
const MUTE = "#aea69c";

const SANS = '"Inter", "Segoe UI", Roboto, Arial, sans-serif';
const MONO = '"DM Mono", ui-monospace, Consolas, monospace';
const SERIF = '"Instrument Serif", Georgia, serif';

function fonte(tamanho: number, peso = 400, familia = SANS): string {
  return `${peso} ${tamanho}px ${familia}`;
}

/**
 * Texto com espaçamento entre letras, desenhado caractere a caractere.
 * Feito à mão de propósito: ctx.letterSpacing é recente e não existe no
 * Safari mais antigo, que é um dos alvos (celular).
 */
function textoEspacado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  y: number,
  espacamento: number,
  centroX = LARGURA / 2
): void {
  const chars = Array.from(texto);
  const largura =
    chars.reduce((soma, c) => soma + ctx.measureText(c).width, 0) + espacamento * (chars.length - 1);
  const alinhamento = ctx.textAlign;
  ctx.textAlign = "left";
  let x = centroX - largura / 2;
  for (const c of chars) {
    ctx.fillText(c, x, y);
    x += ctx.measureText(c).width + espacamento;
  }
  ctx.textAlign = alinhamento;
}

/** Escreve centrado, reduzindo a fonte até caber — o nome é digitado pelo aluno. */
function ajustado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  y: number,
  tamanhoInicial: number,
  peso: number,
  larguraMax: number,
  familia = SANS
): void {
  let tamanho = tamanhoInicial;
  ctx.font = fonte(tamanho, peso, familia);
  while (ctx.measureText(texto).width > larguraMax && tamanho > 20) {
    tamanho -= 2;
    ctx.font = fonte(tamanho, peso, familia);
  }
  ctx.fillText(texto, LARGURA / 2, y);
}

/** O glifo da marca: ponto, barra de fração e bloco — o mesmo do cabeçalho. */
function desenharMarca(ctx: CanvasRenderingContext2D, cx: number, cy: number, escala: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(escala, escala);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, -6.5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-9.5, -1, 19, 2);
  ctx.fillRect(-4, 4.5, 8, 4.5);
  ctx.restore();
}

function dataPorExtenso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function desenharCertificado(dados: Certificado): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const nome = dados.nome.trim() === "" ? "Aluno(a)" : dados.nome.trim();

  // ---- Fundo: a canvas quente da marca ----
  ctx.fillStyle = CANVAS;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Faixa interna um tom acima, como um card sobre a canvas
  ctx.fillStyle = CANVAS_SOFT;
  ctx.fillRect(80, 80, LARGURA - 160, ALTURA - 160);

  // Hairline — o DESIGN.md carrega elevação por linha, não por sombra
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 80, LARGURA - 160, ALTURA - 160);
  ctx.strokeStyle = MUTE;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(112, 112, LARGURA - 224, ALTURA - 224);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // ---- Marca ----
  // O glifo fica à esquerda do nome, com folga suficiente para os dois não
  // se encostarem — o glifo tem ~40px de raio na escala usada.
  desenharMarca(ctx, LARGURA / 2 - 210, 246, 4.2);
  ctx.fillStyle = INK;
  ctx.font = fonte(40, 500);
  ctx.textAlign = "left";
  ctx.fillText("Biblioteca Matemática", LARGURA / 2 - 152, 260);
  ctx.textAlign = "center";

  // ---- Eyebrow em mono, como no site ----
  ctx.fillStyle = MUTE;
  ctx.font = fonte(26, 400, MONO);
  textoEspacado(ctx, "CERTIFICADO DE CONCLUSÃO", 400, 9);

  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LARGURA / 2 - 300, 440);
  ctx.lineTo(LARGURA / 2 + 300, 440);
  ctx.stroke();

  // ---- Corpo ----
  ctx.fillStyle = BODY;
  ctx.font = fonte(36, 400);
  ctx.fillText("Certificamos que", LARGURA / 2, 556);

  ctx.fillStyle = INK;
  ajustado(ctx, nome, 690, 104, 400, LARGURA - 460);

  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LARGURA / 2 - 440, 736);
  ctx.lineTo(LARGURA / 2 + 440, 736);
  ctx.stroke();

  ctx.fillStyle = BODY;
  ctx.font = fonte(36, 400);
  ctx.fillText("concluiu a matéria", LARGURA / 2, 826);

  // O nome da matéria no serif editorial — o mesmo papel que ele tem no site
  ctx.fillStyle = INK;
  ajustado(ctx, dados.cursoTitulo, 946, 82, 400, LARGURA - 420, SERIF);

  ctx.fillStyle = MUTE;
  ctx.font = fonte(30, 400);
  ctx.fillText(`Matemática · ${dados.ano}º ano do Ensino Fundamental`, LARGURA / 2, 1016);

  // ---- Desempenho, em mono ----
  const pct = dados.questoes > 0 ? Math.round((dados.acertosDePrimeira / dados.questoes) * 100) : 0;
  ctx.fillStyle = BODY;
  ctx.font = fonte(28, 400, MONO);
  ctx.fillText(
    `${dados.acertosDePrimeira} de ${dados.questoes} questões acertadas de primeira · ${pct}%`,
    LARGURA / 2,
    1124
  );

  // ---- Rodapé ----
  ctx.fillStyle = MUTE;
  ctx.font = fonte(26, 400);
  ctx.fillText(dataPorExtenso(dados.data), LARGURA / 2, 1218);

  // A moldura interna fica em ALTURA-112 = 1302; o rodapé precisa de folga
  // para não encostar nela.
  ctx.font = fonte(22, 400, MONO);
  ctx.fillText("biblioteca matemática · estudo sem cadastro", LARGURA / 2, 1268);

  return canvas;
}

/** Nome de arquivo seguro: sem acento, espaço ou caractere de caminho. */
export function nomeArquivo(nome: string, curso: string): string {
  const limpar = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  return `certificado-${limpar(curso)}-${limpar(nome) || "aluno"}.png`;
}

/** Dispara o download do certificado como PNG. */
export function baixarCertificado(dados: Certificado): void {
  const canvas = desenharCertificado(dados);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo(dados.nome, dados.cursoTitulo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

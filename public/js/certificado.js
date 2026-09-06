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
function fonte(tamanho, peso = 400, familia = SANS) {
    return `${peso} ${tamanho}px ${familia}`;
}
/**
 * Texto com espaçamento entre letras, desenhado caractere a caractere.
 * Feito à mão de propósito: ctx.letterSpacing é recente e não existe no
 * Safari mais antigo, que é um dos alvos (celular).
 */
function textoEspacado(ctx, texto, y, espacamento, centroX = LARGURA / 2) {
    const chars = Array.from(texto);
    const largura = chars.reduce((soma, c) => soma + ctx.measureText(c).width, 0) + espacamento * (chars.length - 1);
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
function ajustado(ctx, texto, y, tamanhoInicial, peso, larguraMax, familia = SANS) {
    let tamanho = tamanhoInicial;
    ctx.font = fonte(tamanho, peso, familia);
    while (ctx.measureText(texto).width > larguraMax && tamanho > 20) {
        tamanho -= 2;
        ctx.font = fonte(tamanho, peso, familia);
    }
    ctx.fillText(texto, LARGURA / 2, y);
}
/** O glifo da marca: ponto, barra de fração e bloco — o mesmo do cabeçalho. */
function desenharMarca(ctx, cx, cy, escala) {
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
function dataPorExtenso(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
export function desenharCertificado(dados) {
    const canvas = document.createElement("canvas");
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return canvas;
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
    ctx.fillText(`${dados.acertosDePrimeira} de ${dados.questoes} questões acertadas de primeira · ${pct}%`, LARGURA / 2, 1124);
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
/**
 * Certificado do ano inteiro.
 *
 * Ele não é o de matéria com outro título: o que ele tem de próprio é a
 * LISTA das matérias concluídas. É essa lista que mostra o tamanho do
 * percurso — quatorze nomes ocupando um terço da folha dizem mais do que
 * qualquer frase que eu escrevesse ali.
 */
export function desenharCertificadoAno(dados) {
    const canvas = document.createElement("canvas");
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return canvas;
    const nome = dados.nome.trim() === "" ? "Aluno(a)" : dados.nome.trim();
    ctx.fillStyle = CANVAS;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    ctx.fillStyle = CANVAS_SOFT;
    ctx.fillRect(80, 80, LARGURA - 160, ALTURA - 160);
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 80, LARGURA - 160, ALTURA - 160);
    ctx.strokeStyle = MUTE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(112, 112, LARGURA - 224, ALTURA - 224);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    // ---- Marca ----
    desenharMarca(ctx, LARGURA / 2 - 210, 196, 4.2);
    ctx.fillStyle = INK;
    ctx.font = fonte(40, 500);
    ctx.textAlign = "left";
    ctx.fillText("Biblioteca Matemática", LARGURA / 2 - 152, 210);
    ctx.textAlign = "center";
    ctx.fillStyle = MUTE;
    ctx.font = fonte(26, 400, MONO);
    textoEspacado(ctx, "CERTIFICADO DE CONCLUSÃO DE ANO", 312, 9);
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LARGURA / 2 - 340, 350);
    ctx.lineTo(LARGURA / 2 + 340, 350);
    ctx.stroke();
    // ---- Corpo ----
    ctx.fillStyle = BODY;
    ctx.font = fonte(34, 400);
    ctx.fillText("Certificamos que", LARGURA / 2, 424);
    ctx.fillStyle = INK;
    ajustado(ctx, nome, 534, 92, 400, LARGURA - 460);
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LARGURA / 2 - 440, 578);
    ctx.lineTo(LARGURA / 2 + 440, 578);
    ctx.stroke();
    ctx.fillStyle = BODY;
    ctx.font = fonte(34, 400);
    ctx.fillText(`concluiu as ${dados.materias.length} matérias de Matemática do`, LARGURA / 2, 642);
    ctx.fillStyle = INK;
    ajustado(ctx, `${dados.ano}º ano`, 744, 90, 400, LARGURA - 420, SERIF);
    ctx.fillStyle = MUTE;
    ctx.font = fonte(28, 400);
    ctx.fillText("do Ensino Fundamental", LARGURA / 2, 798);
    // ---- Números do percurso ----
    const pct = dados.questoes > 0 ? Math.round((dados.acertosDePrimeira / dados.questoes) * 100) : 0;
    ctx.fillStyle = BODY;
    ctx.font = fonte(26, 400, MONO);
    ctx.fillText(`${dados.licoes} lições · ${dados.questoes} questões · ${dados.acertosDePrimeira} acertadas de primeira · ${pct}%`, LARGURA / 2, 866);
    // ---- A lista de matérias ----
    ctx.fillStyle = MUTE;
    ctx.font = fonte(20, 400, MONO);
    textoEspacado(ctx, "MATÉRIAS CONCLUÍDAS", 936, 7);
    desenharMaterias(ctx, dados.materias, 992);
    // ---- Rodapé ----
    ctx.fillStyle = MUTE;
    ctx.textAlign = "center";
    ctx.font = fonte(26, 400);
    ctx.fillText(dataPorExtenso(dados.data), LARGURA / 2, 1224);
    ctx.font = fonte(22, 400, MONO);
    ctx.fillText("biblioteca matemática · estudo sem cadastro", LARGURA / 2, 1272);
    return canvas;
}
/**
 * Escreve as matérias em três colunas.
 *
 * Duas medidas, e as duas importam. A altura da lista é fixa — ela tem de
 * caber entre os números e a data —, então quem cede é a entrelinha: um ano
 * com mais matérias aperta as linhas em vez de invadir o rodapé.
 *
 * E a largura de cada coluna é MEDIDA, não dividida em três partes iguais. Com
 * colunas de largura fixa, a terceira acaba antes das outras (os títulos são
 * mais curtos) e o bloco inteiro parece torto, encostado à esquerda. Medindo,
 * o conjunto fica centrado de verdade.
 */
function desenharMaterias(ctx, materias, topo) {
    const COLUNAS = 3;
    const ALTURA_MAX = 172;
    const GOTEIRA = 74; // espaço entre uma coluna e a seguinte
    const RECUO_MARCA = 22; // do "·" até o texto
    const linhas = Math.ceil(materias.length / COLUNAS);
    const entrelinha = Math.min(42, Math.floor(ALTURA_MAX / Math.max(1, linhas)));
    ctx.font = fonte(Math.min(26, entrelinha - 10), 400, MONO);
    ctx.textAlign = "left";
    // Preenche coluna a coluna: a leitura de cima para baixo é a ordem do ano.
    const colunas = [];
    for (let c = 0; c < COLUNAS; c++)
        colunas.push(materias.slice(c * linhas, (c + 1) * linhas));
    const larguras = colunas.map((col) => RECUO_MARCA + Math.max(0, ...col.map((t) => ctx.measureText(t).width)));
    const total = larguras.reduce((a, w) => a + w, 0) + GOTEIRA * (COLUNAS - 1);
    let x = (LARGURA - total) / 2;
    colunas.forEach((col, c) => {
        col.forEach((materia, linha) => {
            const y = topo + linha * entrelinha;
            ctx.fillStyle = MUTE;
            ctx.fillText("·", x, y);
            ctx.fillStyle = INK;
            ctx.fillText(materia, x + RECUO_MARCA, y);
        });
        x += larguras[c] + GOTEIRA;
    });
    ctx.textAlign = "center";
}
/** Nome de arquivo seguro: sem acento, espaço ou caractere de caminho. */
export function nomeArquivo(nome, curso) {
    const limpar = (t) => t
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return `certificado-${limpar(curso)}-${limpar(nome) || "aluno"}.png`;
}
/** Salva um canvas como PNG na máquina do aluno. */
function baixarCanvas(canvas, arquivo) {
    canvas.toBlob((blob) => {
        if (!blob)
            return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = arquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
}
/** Dispara o download do certificado da matéria como PNG. */
export function baixarCertificado(dados) {
    baixarCanvas(desenharCertificado(dados), nomeArquivo(dados.nome, dados.cursoTitulo));
}
/** Dispara o download do certificado de ano como PNG. */
export function baixarCertificadoAno(dados) {
    baixarCanvas(desenharCertificadoAno(dados), nomeArquivo(dados.nome, `${dados.ano}-ano-completo`));
}
//# sourceMappingURL=certificado.js.map
// certificado.ts
// Geração do certificado de conclusão de uma matéria.
//
// Decisão técnica: o certificado é desenhado em <canvas> e exportado como PNG.
// Alternativas descartadas:
//   - window.print(): depende do diálogo de impressão do navegador, quebra no
//     celular e o aluno não fica com um arquivo.
//   - jsPDF: acrescentaria dependência de terceiros a um projeto que hoje roda
//     só com Express + tsc, e o produto não precisa de PDF vetorial.
// O canvas resolve offline, funciona igual no celular e gera um arquivo que o
// aluno pode salvar, imprimir ou mandar para o professor.
//
// Como não existe cadastro no site, o nome é digitado na hora. Se ficar em
// branco, entra "Aluno(a)" — o certificado nunca sai quebrado.
const LARGURA = 2000; // A4 paisagem a ~170 dpi: bom para tela e para impressão
const ALTURA = 1414;
const AZUL_TINTA = "#123A8F";
const AZUL = "#185ADB";
const ROSA = "#FF2E93";
const FRAMBOESA = "#A81455";
const CINZA = "#5A6478";
const FONTE = '"Inter", "Segoe UI", Roboto, Arial, sans-serif';
function fonte(tamanho, peso = 400) {
    return `${peso} ${tamanho}px ${FONTE}`;
}
/**
 * Escreve um texto centrado, reduzindo a fonte até caber na largura máxima.
 * Necessário porque o nome é digitado pelo aluno e pode ser bem longo.
 */
function textoCentradoAjustado(ctx, texto, y, tamanhoInicial, peso, larguraMaxima) {
    let tamanho = tamanhoInicial;
    ctx.font = fonte(tamanho, peso);
    while (ctx.measureText(texto).width > larguraMaxima && tamanho > 18) {
        tamanho -= 2;
        ctx.font = fonte(tamanho, peso);
    }
    ctx.fillText(texto, LARGURA / 2, y);
}
/**
 * Escreve um texto com espaçamento entre letras, desenhando caractere a
 * caractere. Feito à mão de propósito: ctx.letterSpacing é recente e não
 * existe no Safari mais antigo, que é justamente um dos alvos (celular).
 */
function textoEspacado(ctx, texto, y, espacamento) {
    const caracteres = Array.from(texto);
    const larguraTotal = caracteres.reduce((soma, caractere) => soma + ctx.measureText(caractere).width, 0) +
        espacamento * (caracteres.length - 1);
    const alinhamentoOriginal = ctx.textAlign;
    ctx.textAlign = "left";
    let x = LARGURA / 2 - larguraTotal / 2;
    for (const caractere of caracteres) {
        ctx.fillText(caractere, x, y);
        x += ctx.measureText(caractere).width + espacamento;
    }
    ctx.textAlign = alinhamentoOriginal;
}
/** Desenha o pássaro da marca (mesma construção geométrica do logo do site). */
function desenharPassaro(ctx, cx, cy, escala) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(escala, escala);
    // cauda (triângulo azul)
    ctx.fillStyle = AZUL_TINTA;
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(-24, -14);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    // corpo (círculo azul)
    ctx.beginPath();
    ctx.arc(-2, 1, 13, 0, Math.PI * 2);
    ctx.fill();
    // cabeça (círculo azul)
    ctx.beginPath();
    ctx.arc(9, -10, 8, 0, Math.PI * 2);
    ctx.fill();
    // asa (triângulo rosa)
    ctx.fillStyle = ROSA;
    ctx.beginPath();
    ctx.moveTo(-9, -1);
    ctx.lineTo(7, -6);
    ctx.lineTo(-1, 10);
    ctx.closePath();
    ctx.fill();
    // bico (triângulo rosa)
    ctx.beginPath();
    ctx.moveTo(16, -12);
    ctx.lineTo(26, -9);
    ctx.lineTo(16, -6);
    ctx.closePath();
    ctx.fill();
    // olho
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(11, -12, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
/** Desenha o certificado completo e devolve o canvas pronto. */
export function desenharCertificado(dados) {
    const canvas = document.createElement("canvas");
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return canvas;
    }
    const nome = dados.nome.trim() === "" ? "Aluno(a)" : dados.nome.trim();
    // ---- Fundo branco ----
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    // ---- Moldura dupla: fio azul externo, fio rosa interno ----
    ctx.strokeStyle = AZUL_TINTA;
    ctx.lineWidth = 8;
    ctx.strokeRect(48, 48, LARGURA - 96, ALTURA - 96);
    ctx.strokeStyle = ROSA;
    ctx.lineWidth = 3;
    ctx.strokeRect(72, 72, LARGURA - 144, ALTURA - 144);
    // ---- Cantos geométricos (tema de matemática: triângulos nos vértices) ----
    const desenharCanto = (x, y, sx, sy) => {
        ctx.fillStyle = ROSA;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 90 * sx, y);
        ctx.lineTo(x, y + 90 * sy);
        ctx.closePath();
        ctx.fill();
    };
    desenharCanto(72, 72, 1, 1);
    desenharCanto(LARGURA - 72, 72, -1, 1);
    desenharCanto(72, ALTURA - 72, 1, -1);
    desenharCanto(LARGURA - 72, ALTURA - 72, -1, -1);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    // ---- Marca ----
    desenharPassaro(ctx, LARGURA / 2 - 148, 214, 3.1);
    ctx.fillStyle = AZUL_TINTA;
    ctx.font = fonte(46, 800);
    ctx.textAlign = "left";
    ctx.fillText("Biblioteca Matemática", LARGURA / 2 - 90, 228);
    ctx.textAlign = "center";
    // ---- Faixa do título ----
    ctx.fillStyle = FRAMBOESA;
    ctx.font = fonte(34, 700);
    textoEspacado(ctx, "CERTIFICADO DE PARTICIPAÇÃO", 386, 10);
    // linha decorativa sob o título
    ctx.strokeStyle = ROSA;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(LARGURA / 2 - 190, 420);
    ctx.lineTo(LARGURA / 2 + 190, 420);
    ctx.stroke();
    // ---- Corpo ----
    ctx.fillStyle = CINZA;
    ctx.font = fonte(40, 400);
    ctx.fillText("Certificamos que", LARGURA / 2, 546);
    // nome do aluno em destaque
    ctx.fillStyle = AZUL_TINTA;
    textoCentradoAjustado(ctx, nome, 668, 96, 800, LARGURA - 420);
    // linha sob o nome
    ctx.strokeStyle = "#D3E0FA";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(LARGURA / 2 - 420, 706);
    ctx.lineTo(LARGURA / 2 + 420, 706);
    ctx.stroke();
    ctx.fillStyle = CINZA;
    ctx.font = fonte(40, 400);
    ctx.fillText("participou das", LARGURA / 2, 790);
    ctx.fillStyle = AZUL;
    textoCentradoAjustado(ctx, `“Atividades de ${dados.materia} — ${dados.ano}º Ano”`, 880, 62, 700, LARGURA - 360);
    ctx.fillStyle = CINZA;
    ctx.font = fonte(36, 400);
    ctx.fillText("Apresentado pela Biblioteca Matemática", LARGURA / 2, 962);
    // ---- Desempenho ----
    const percentual = dados.total > 0 ? Math.round((dados.acertos / dados.total) * 100) : 0;
    ctx.fillStyle = FRAMBOESA;
    ctx.font = fonte(34, 700);
    ctx.fillText(`${dados.acertos} de ${dados.total} atividades corretas · ${percentual}% de aproveitamento`, LARGURA / 2, 1074);
    // ---- Data ----
    const data = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
    ctx.fillStyle = CINZA;
    ctx.font = fonte(30, 400);
    ctx.fillText(data, LARGURA / 2, 1226);
    ctx.strokeStyle = AZUL_TINTA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LARGURA / 2 - 230, 1264);
    ctx.lineTo(LARGURA / 2 + 230, 1264);
    ctx.stroke();
    ctx.fillStyle = AZUL_TINTA;
    ctx.font = fonte(26, 600);
    ctx.fillText("Biblioteca Matemática · Ensino Fundamental II", LARGURA / 2, 1304);
    return canvas;
}
/** Nome de arquivo seguro (sem acento, espaço ou caractere proibido). */
export function nomeArquivoCertificado(nome, materia) {
    const limpar = (texto) => texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    const parteNome = limpar(nome) || "aluno";
    return `certificado-${limpar(materia)}-${parteNome}.png`;
}
/** Dispara o download do certificado como PNG. */
export function baixarCertificado(dados) {
    const canvas = desenharCertificado(dados);
    const nomeArquivo = nomeArquivoCertificado(dados.nome, dados.materia);
    canvas.toBlob((blob) => {
        if (!blob) {
            return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Libera a memória do blob depois que o navegador iniciou o download.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
}
//# sourceMappingURL=certificado.js.map
// ferramentas/gerar-capa-readme.mjs
//
// A capa animada do README: o nome do projeto escrito em matriz de pontos,
// aparecendo letra por letra, com um cursor que anda junto.
//
// Uso:  node ferramentas/gerar-capa-readme.mjs   (ou `npm run capa`)
//
// Por que gerar em vez de usar um serviço:
//
// O jeito comum de pôr texto animado num README é apontar para um serviço que
// devolve o SVG pronto. Isso põe a capa do projeto na mão de um terceiro: se
// ele sair do ar, mudar de rota ou passar a cobrar, o README quebra — e todo
// visitante vira uma visita registrada num servidor que não é nosso. Este
// arquivo desenha o SVG e o comita no repositório. Ele é nosso, não muda
// sozinho e funciona offline.
//
// A animação é CSS puro dentro do SVG. Isso não é detalhe: o GitHub serve a
// imagem por um proxy e a renderiza dentro de um `<img>`, onde **JavaScript
// não roda**. Animação declarativa — CSS e SMIL — roda; script, não. Por isso
// cada letra tem o próprio bloco de `@keyframes` em vez de um `delay`
// compartilhado: com `delay` e `infinite`, as vinte letras entrariam em ciclos
// defasados e a frase nunca mais se formaria inteira.
//
// A paleta é a do DESIGN.md, como em todo o resto: canvas quente, off-white
// como única cor de marca, sem sombra e sem degradê.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");

const CANVAS = "#2b2622";
const TINTA = "#f7f5f0";
const CORPO = "#c9c0ad";
const MUDO = "#8a8179";
const HAIRLINE = "#3f3a36";
const SANS = "ui-sans-serif,system-ui,-apple-system,&quot;Segoe UI&quot;,Roboto,sans-serif";

// ─────────────────── a fonte de matriz, 5 × 7 ───────────────────
//
// Só as letras que as duas palavras usam. Um alfabeto inteiro seria código
// morto, e cada glifo aqui foi desenhado à mão para ler bem em ponto — o "M",
// por exemplo, não fecha o vão do meio, senão vira um borrão no tamanho em
// que a capa é vista.
const GLIFOS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
};
// O acento agudo, nas duas linhas acima da letra.
const AGUDO = ["..##.", ".##.."];

const LINHAS = [
  { texto: "BIBLIOTECA", cor: TINTA },
  { texto: "MATEMÁTICA", cor: CORPO },
];

const P = 11;          // passo da malha de pontos
const R = 3.8;         // raio de cada ponto
// 5 colunas de letra e DUAS de vão. Com uma só, as letras encostam e a
// palavra vira uma mancha de pontos — e o acento do "Á" passa a ler como se
// estivesse entre duas letras em vez de sobre uma.
const AVANCO = 7 * P;
const CICLO = 11;      // segundos do ciclo inteiro

const semAcento = (c) => (c === "Á" ? "A" : c);
const temAcento = (c) => c === "Á";

/** Os pontos de uma letra, em coordenadas relativas ao canto dela. */
function pontosDaLetra(caractere) {
  const grade = GLIFOS[semAcento(caractere)];
  if (!grade) throw new Error(`a capa não tem glifo para "${caractere}"`);
  const pontos = [];
  grade.forEach((fila, linha) => {
    [...fila].forEach((celula, coluna) => {
      if (celula === "#") pontos.push([coluna * P, linha * P]);
    });
  });
  if (temAcento(caractere)) {
    AGUDO.forEach((fila, linha) => {
      [...fila].forEach((celula, coluna) => {
        if (celula === "#") pontos.push([coluna * P, (linha - 2.4) * P]);
      });
    });
  }
  return pontos;
}

// ─────────────────── os selos ───────────────────
//
// Os "badges" de README normalmente vêm de um serviço de terceiros, e valem a
// mesma objeção da capa: o repositório passa a depender de um servidor alheio
// para mostrar a própria ficha, e cada visitante vira uma visita contada lá.
// Estes são desenhados aqui, na paleta do projeto, e não pedem nada a
// ninguém.
//
// A largura sai de uma estimativa por caractere — em DM Mono todo caractere
// tem a mesma caixa, e 7,1px a 12px de corpo erra por poucos pixels.
function selo(rotulo, valor) {
  const alturaSelo = 30;
  const larguraDe = (t) => Math.ceil(t.length * 7.1);
  const padA = 12;
  const larguraA = larguraDe(rotulo) + padA * 2;
  const larguraB = larguraDe(valor) + padA * 2;
  const total = larguraA + larguraB;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${alturaSelo}" viewBox="0 0 ${total} ${alturaSelo}" role="img" aria-label="${rotulo}: ${valor}">
<title>${rotulo}: ${valor}</title>
<rect x="0.5" y="0.5" width="${total - 1}" height="${alturaSelo - 1}" rx="3.5" fill="${CANVAS}" stroke="${HAIRLINE}"/>
<rect x="${larguraA}" y="1" width="${larguraB - 1}" height="${alturaSelo - 2}" fill="#383330"/>
<line x1="${larguraA}" y1="1" x2="${larguraA}" y2="${alturaSelo - 1}" stroke="${HAIRLINE}"/>
<text x="${larguraA / 2}" y="20" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="${MUDO}">${rotulo}</text>
<text x="${larguraA + larguraB / 2}" y="20" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" font-weight="500" fill="${TINTA}">${valor}</text>
</svg>
`;
}

const SELOS = [
  ["materias", "51"],
  ["licoes", "312"],
  ["questoes", "1248"],
  ["figuras", "1878"],
  ["testes", "512 passando"],
  ["cadastro", "nenhum"],
];

function gerarSelos() {
  mkdirSync(join(RAIZ, ".github", "selos"), { recursive: true });
  for (const [rotulo, valor] of SELOS) {
    writeFileSync(join(RAIZ, ".github", "selos", `${rotulo}.svg`), selo(rotulo, valor), "utf8");
  }
  console.log(`${SELOS.length} selos em .github/selos/`);
}

function gerar() {
  const larguraTexto = Math.max(...LINHAS.map((l) => l.texto.length)) * AVANCO - P;
  const margem = 58;
  const largura = Math.round(larguraTexto + margem * 2);

  const yPrimeira = 112;
  const alturaLetra = 7 * P;
  const entrelinha = alturaLetra + 30;
  const yDe = (i) => yPrimeira + i * entrelinha;
  const altura = yDe(LINHAS.length - 1) + alturaLetra + 96;

  // Quando cada letra entra. O ritmo é o de quem digita: rápido o bastante
  // para não cansar, lento o bastante para a frase se formar à vista.
  const totalLetras = LINHAS.reduce((s, l) => s + l.texto.length, 0);
  const inicio = 0.5;
  const passo = 0.2;
  const fimDaDigitacao = inicio + totalLetras * passo;

  const pct = (segundos) => ((segundos / CICLO) * 100).toFixed(2);
  const estilos = [];
  const corpo = [];
  const paradasDoCursor = [];

  let n = 0;
  LINHAS.forEach((linha, iLinha) => {
    const y = yDe(iLinha);
    [...linha.texto].forEach((caractere, iLetra) => {
      const x = margem + iLetra * AVANCO;
      const entra = inicio + n * passo;
      const pontos = pontosDaLetra(caractere)
        .map(([dx, dy]) => `<circle cx="${(x + dx + R).toFixed(1)}" cy="${(y + dy + R).toFixed(1)}" r="${R}"/>`)
        .join("");
      corpo.push(`<g class="l l${n}" fill="${linha.cor}">${pontos}</g>`);

      // Cada letra tem o próprio keyframe. Ver a nota do cabeçalho: com um
      // `animation-delay` compartilhado e `infinite`, elas desandariam.
      estilos.push(
        `.l${n}{animation-name:e${n}}` +
        `@keyframes e${n}{0%,${pct(entra)}%{opacity:0}` +
        `${pct(entra + 0.06)}%,${pct(CICLO - 1.6)}%{opacity:1}` +
        `${pct(CICLO - 0.9)}%,100%{opacity:0}}`
      );
      paradasDoCursor.push({ t: entra, x: x + AVANCO, y });
      n += 1;
    });
  });

  // O cursor anda em degraus: ele salta para depois da letra que acabou de
  // entrar, e por isso o keyframe é discreto (`steps(1)`), não interpolado.
  const primeira = { t: 0, x: margem, y: yDe(0) };
  const caminho = [primeira, ...paradasDoCursor];
  const quadrosDoCursor = caminho
    .map(({ t, x, y }) => `${pct(t)}%{transform:translate(${Math.round(x - margem)}px,${Math.round(y - yDe(0))}px)}`)
    .join("");

  // O estado PARADO é o texto inteiro visível, e a animação é que o esconde e
  // o traz de volta. Parece invertido e não é: se algum leitor de Markdown,
  // algum e-mail ou algum modo de economia de bateria não rodar a animação, a
  // capa precisa mostrar o nome do projeto — e não um retângulo vazio. Com
  // `opacity:0` no repouso, a falha silenciosa seria a pior possível.
  const estilo = `
    .l{opacity:1;animation-duration:${CICLO}s;animation-iteration-count:infinite;animation-timing-function:steps(1,end)}
    ${estilos.join("")}
    .cursor{animation:anda ${CICLO}s infinite steps(1,end),pisca .9s infinite steps(1,end)}
    @keyframes anda{${quadrosDoCursor}100%{transform:translate(0,0)}}
    @keyframes pisca{0%,49%{opacity:.85}50%,100%{opacity:0}}
  `.replace(/\s*\n\s*/g, "");

  const cursorX = margem;
  const cursorY = yDe(0);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Biblioteca Matemática — matemática explicada como se explica de verdade">
<title>Biblioteca Matemática</title>
<style>${estilo}</style>
<rect width="${largura}" height="${altura}" rx="14" fill="${CANVAS}"/>
<rect x="0.5" y="0.5" width="${largura - 1}" height="${altura - 1}" rx="13.5" fill="none" stroke="${HAIRLINE}"/>
<text x="${largura - margem}" y="66" text-anchor="end" font-size="30" font-family="Georgia,&quot;Times New Roman&quot;,serif" font-style="italic" fill="${MUDO}">6º ao 9º ano</text>
${corpo.join("\n")}
<rect class="cursor" x="${cursorX}" y="${cursorY}" width="${P * 3}" height="${alturaLetra}" rx="2" fill="${TINTA}" opacity="0"/>
<text x="${margem}" y="${altura - 44}" font-size="21" font-family="${SANS}" fill="${CORPO}">Matemática explicada como se explica <tspan font-family="Georgia,&quot;Times New Roman&quot;,serif" font-style="italic" fill="${TINTA}">de verdade</tspan>.</text>
<text x="${margem}" y="${altura - 18}" font-size="15" font-family="${SANS}" fill="${MUDO}">51 matérias · 312 lições · 1 248 questões · de graça e sem cadastro</text>
</svg>
`;

  mkdirSync(join(RAIZ, ".github"), { recursive: true });
  const destino = join(RAIZ, ".github", "capa.svg");
  writeFileSync(destino, svg, "utf8");
  console.log(`capa animada em .github/capa.svg (${largura}x${altura}, ${totalLetras} letras, ciclo de ${CICLO}s)`);
  console.log(`a digitação termina em ${fimDaDigitacao.toFixed(1)}s`);
}

gerar();
gerarSelos();

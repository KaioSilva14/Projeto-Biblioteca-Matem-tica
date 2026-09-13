// ferramentas/gerar-marca.mjs
//
// Gera os arquivos de MARCA do site: os ícones que o navegador e o Google
// mostram, e a imagem que aparece quando alguém cola um link no WhatsApp,
// no Telegram ou numa rede social.
//
// Uso:  node ferramentas/gerar-marca.mjs
//
// Por que os tamanhos são estes:
//
// - **48, 96, 144, 192 e 512** — o Google só considera o ícone de um site
//   para o resultado de busca se ele for quadrado e MÚLTIPLO DE 48. É esse
//   ícone que aparece ao lado do endereço, como o da Khan Academy.
// - **180** é o que o iPhone usa ao salvar o site na tela de início.
// - **32** é o da aba do navegador no desktop.
// - **1200 × 630** é a proporção que o Facebook, o WhatsApp, o LinkedIn e o
//   X usam para o cartão grande. Fora dela a imagem é cortada.
//
// O desenho é o MESMO glifo do cabeçalho do site, e isso não é economia: o
// ícone da aba, o da busca e o do cartão social têm de ser reconhecíveis
// como a mesma coisa que está no topo da página.

import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { CAPA_LARGURA, CAPA_ALTURA } from "./site.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const PUBLICO = join(RAIZ, "public");
const TEMP = join(AQUI, ".temp-marca");

const CANVAS = "#2b2622";
const TINTA = "#f7f5f0";
const HAIRLINE = "#3f3a36";
const CORPO = "#c9c0ad";

const CHROMES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
];
const acharChrome = () => {
  for (const c of CHROMES) if (existsSync(c)) return c;
  throw new Error("Nenhum Chrome/Edge encontrado para rasterizar a marca.");
};

/**
 * O glifo da marca, em coordenadas de 0 a 22 — as mesmas do `<svg>` que o
 * cabeçalho de toda página do site já usa.
 */
const glifo = (cor = TINTA) => `
  <circle cx="11" cy="4.5" r="2.4" fill="${cor}" />
  <rect x="1.5" y="10" width="19" height="2" rx="1" fill="${cor}" />
  <rect x="7" y="15.5" width="8" height="4.5" rx="1.2" fill="${cor}" />`;

/**
 * O ícone quadrado. O glifo ocupa 60% do quadrado e fica centrado: com ele
 * encostando nas bordas, o ícone de 48px vira um borrão na lista de
 * resultados do Google, que é justamente onde ele precisa ser lido.
 */
function iconeSvg(lado) {
  const raio = Math.round(lado * 0.22);
  const escala = (lado * 0.6) / 22;
  const deslocamento = (lado - 22 * escala) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect x="0" y="0" width="${lado}" height="${lado}" rx="${raio}" fill="${CANVAS}"/>
  <g transform="translate(${deslocamento.toFixed(2)} ${deslocamento.toFixed(2)}) scale(${escala.toFixed(4)})">${glifo()}</g>
</svg>`;
}

/**
 * O cartão social. Ele segue o DESIGN.md como qualquer tela do site: canvas
 * quente, off-white como única cor de marca, Instrument Serif itálico só no
 * trecho de ênfase, e nenhuma sombra ou degradê.
 */
function capaHtml() {
  const escala = 46 / 22;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap">
<style>
  html,body{margin:0;padding:0;}
  body{
    width:${CAPA_LARGURA}px;height:${CAPA_ALTURA}px;overflow:hidden;background:${CANVAS};
    font-family:Inter,system-ui,sans-serif;color:${TINTA};
    display:flex;flex-direction:column;justify-content:space-between;
    padding:64px 72px;box-sizing:border-box;
  }
  .marca{display:flex;align-items:center;gap:14px;}
  .marca span{font-size:26px;font-weight:500;letter-spacing:-.01em;}
  h1{
    margin:0;font-size:76px;line-height:1.06;font-weight:400;
    letter-spacing:-.028em;max-width:19ch;
  }
  em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;}
  .pe{display:flex;align-items:center;gap:18px;color:${CORPO};font-size:24px;}
  .pe b{font-weight:500;color:${TINTA};}
  .risco{flex:1;height:1px;background:${HAIRLINE};}
</style></head><body>
  <div class="marca">
    <svg width="${46}" height="${46}" viewBox="0 0 46 46" aria-hidden="true">
      <g transform="scale(${escala.toFixed(4)})">${glifo()}</g>
    </svg>
    <span>Biblioteca Matemática</span>
  </div>
  <h1>Matemática explicada como se explica <em>de verdade</em>.</h1>
  <div class="pe">
    <span><b>6º ao 9º ano</b></span>
    <span class="risco"></span>
    <span>de graça · sem cadastro</span>
  </div>
</body></html>`;
}

function rasterizar(chrome, html, largura, altura, destino, escala = 1) {
  const caminho = join(TEMP, `m-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(caminho, html, "utf8");
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    // Sem isto o Chrome usa antialiasing de subpixel e o texto sai com
    // franja colorida — num cartão que vira JPEG comprimido nas redes, a
    // franja fica visível como um halo azul e laranja nas letras.
    "--disable-lcd-text",
    `--force-device-scale-factor=${escala}`,
    `--window-size=${largura},${altura}`,
    `--virtual-time-budget=4000`,
    `--screenshot=${destino}`,
    `file:///${caminho.replace(/\\/g, "/")}`,
  ], { stdio: "pipe" });
}

const paginaDoIcone = (lado) => {
  const svg = iconeSvg(lado);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent;}
    body{width:${lado}px;height:${lado}px;overflow:hidden;}
    svg{display:block;}
  </style></head><body>${svg}</body></html>`;
};

function gerar() {
  const chrome = acharChrome();
  mkdirSync(TEMP, { recursive: true });
  mkdirSync(join(PUBLICO, "assets", "site"), { recursive: true });

  // O SVG é o ícone preferido dos navegadores modernos: um arquivo só,
  // nítido em qualquer tamanho.
  writeFileSync(join(PUBLICO, "favicon.svg"), `${iconeSvg(64)}\n`, "utf8");
  console.log("  favicon.svg");

  const icones = [
    [32, "favicon-32.png"],
    [48, "favicon-48.png"],
    [96, "favicon-96.png"],
    [144, "favicon-144.png"],
    [180, "apple-touch-icon.png"],
    [192, "icone-192.png"],
    [512, "icone-512.png"],
  ];
  for (const [lado, nome] of icones) {
    rasterizar(chrome, paginaDoIcone(lado), lado, lado, join(PUBLICO, nome));
    console.log(`  ${nome} (${lado}x${lado})`);
  }

  rasterizar(
    chrome, capaHtml(), CAPA_LARGURA, CAPA_ALTURA,
    join(PUBLICO, "assets", "site", "capa-social.png")
  );
  console.log(`  assets/site/capa-social.png (${CAPA_LARGURA}x${CAPA_ALTURA})`);

  rmSync(TEMP, { recursive: true, force: true });
  console.log(`\n${icones.length + 2} arquivo(s) de marca gerado(s).`);
}

gerar();

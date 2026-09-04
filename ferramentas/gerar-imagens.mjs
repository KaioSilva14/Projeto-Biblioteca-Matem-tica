// ferramentas/gerar-imagens.mjs
//
// Rasteriza os desenhos de desenhos.mjs em PNG de verdade dentro de
// public/assets/. O site serve arquivos de imagem — nunca monta figura em
// tempo de execução.
//
// Uso:  node ferramentas/gerar-imagens.mjs [--so=<id>]
//
// O Chrome headless faz a rasterização com escala 2x (imagem nítida em tela
// retina) e fundo transparente, para o PNG assentar sobre a canvas quente
// sem moldura branca.

import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { MANIFESTO } from "./manifesto-imagens.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const ASSETS = join(RAIZ, "public", "assets");
const TEMP = join(AQUI, ".temp-imagens");

const CHROMES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
];

function acharChrome() {
  for (const c of CHROMES) if (existsSync(c)) return c;
  throw new Error("Nenhum Chrome/Edge encontrado para rasterizar as imagens.");
}

/** Lê width/height do próprio SVG — a fonte da verdade é o desenho. */
function medir(svg) {
  const w = /width="(\d+(?:\.\d+)?)"/.exec(svg);
  const h = /height="(\d+(?:\.\d+)?)"/.exec(svg);
  if (!w || !h) throw new Error("SVG sem width/height explícitos.");
  return { largura: Math.ceil(Number(w[1])), altura: Math.ceil(Number(h[1])) };
}

function paginaHtml(svg, largura, altura) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent;}
  body{width:${largura}px;height:${altura}px;overflow:hidden;}
  svg{display:block;}
</style></head><body>${svg}</body></html>`;
}

function gerar(filtro) {
  const chrome = acharChrome();
  mkdirSync(TEMP, { recursive: true });

  const indice = {};
  let feitas = 0;

  for (const item of MANIFESTO) {
    if (filtro && item.id !== filtro) continue;

    const svg = item.desenho();
    const { largura, altura } = medir(svg);

    const htmlPath = join(TEMP, `${item.id}.html`);
    writeFileSync(htmlPath, paginaHtml(svg, largura, altura), "utf8");

    const destinoDir = join(ASSETS, item.pasta);
    mkdirSync(destinoDir, { recursive: true });
    const destino = join(destinoDir, `${item.id}.png`);

    execFileSync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=2",
      "--default-background-color=00000000",
      `--window-size=${largura},${altura}`,
      `--screenshot=${destino}`,
      `file:///${htmlPath.replace(/\\/g, "/")}`,
    ], { stdio: "pipe" });

    indice[item.id] = {
      arquivo: `/assets/${item.pasta}/${item.id}.png`,
      alt: item.alt,
      largura,
      altura,
    };
    feitas += 1;
    process.stdout.write(`  ${item.id} (${largura}x${altura})\n`);
  }

  // O índice permite o conteúdo referenciar a imagem por id, sem repetir
  // caminho, alt e dimensões em cada questão.
  writeFileSync(
    join(RAIZ, "public", "dados", "imagens.json"),
    JSON.stringify(indice, null, 2) + "\n",
    "utf8"
  );

  rmSync(TEMP, { recursive: true, force: true });
  console.log(`\n${feitas} imagem(ns) gerada(s). Índice em public/dados/imagens.json`);
}

const arg = process.argv.find((a) => a.startsWith("--so="));
gerar(arg ? arg.slice(5) : null);

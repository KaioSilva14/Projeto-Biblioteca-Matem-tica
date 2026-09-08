// Auditoria de TEXTO em todas as figuras do site.
//
// O gerador escreve texto e confia que ele cabe: nada no código mede a
// largura que a fonte de verdade vai ocupar. Foi assim que uma tabela de
// Probabilidade foi publicada com "depois, contando o que saiu" atravessando
// a borda da célula.
//
// Esta ferramenta carrega TODAS as figuras num Chrome de verdade, espera
// `document.fonts.ready` e mede cada <text>. Ela procura três coisas, e as
// três já pegaram defeito real numa figura publicada:
//
//   · texto fora da caixa do SVG — rótulo cortado na borda da figura;
//   · texto fora da CÉLULA em que foi escrito — o que apareceu na tela;
//   · dois textos ENCAVALADOS — o pior dos três, porque não corta nada: só
//     produz um texto ilegível. "−3/4" e "−1/2" viravam "−3/1/42".
//
// Rodar antes de publicar figura nova, e sempre que mexer numa largura:
// apertar uma figura sem medir troca um transbordo por um encavalamento.
//
//   npm run figuras

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFESTO } from "./manifesto-imagens.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const TEMP = join(AQUI, ".temp-auditoria");
const PORTA = 9444;

const CHROMES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function acharChrome() {
  for (const c of CHROMES) if (existsSync(c)) return c;
  throw new Error("Nenhum Chrome/Edge encontrado para auditar as figuras.");
}

/** Fala com o Chrome pelo protocolo de depuração, sem dependência externa. */
function conectar(url) {
  return new Promise((ok, falha) => {
    const s = new WebSocket(url);
    let id = 0;
    const pendentes = new Map();
    s.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
    };
    s.onerror = falha;
    s.onopen = () => ok({
      envia: (metodo, params = {}) => new Promise((res) => {
        id += 1; pendentes.set(id, res);
        s.send(JSON.stringify({ id, method: metodo, params }));
      }),
      fecha: () => s.close(),
    });
  });
}

// A medição roda dentro da página. Ela precisa ser em coordenadas de TELA, e
// não com getBBox(): o getBBox devolve a caixa no sistema LOCAL do elemento e
// ignora o transform dos ancestrais — e o helper `fechar` alarga a caixa
// transladando o desenho dentro de um <g>. Medindo por getBBox, dezenas de
// rótulos já corretos apareciam como se vazassem.
const MEDICAO = `(async () => {
  await document.fonts.ready;
  const achados = [];
  for (const fig of document.querySelectorAll('.fig')) {
    const id = fig.dataset.id;
    const svg = fig.querySelector('svg');
    const caixaSvg = svg.getBoundingClientRect();
    // Só as MOLDURAS contam como célula: a barra de um gráfico também é um
    // rect, e o rótulo do patamar da média passa por cima dela de propósito.
    const celulas = [...svg.querySelectorAll('rect')]
      .filter((r) => (r.getAttribute('fill') || 'none') === 'none')
      .map((r) => r.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    const textos = [...svg.querySelectorAll('text')]
      .map((t) => ({ t, r: t.getBoundingClientRect() }))
      .filter((c) => c.r.width > 0);

    for (let i = 0; i < textos.length; i++) {
      for (let j = i + 1; j < textos.length; j++) {
        const a = textos[i].r, b = textos[j].r;
        const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (dx > 1.5 && dy > Math.min(a.height, b.height) * 0.45) {
          achados.push({ id, tipo: 'textos-encavalados',
            texto: textos[i].t.textContent + '  X  ' + textos[j].t.textContent,
            detalhe: 'sobrepoem ' + Math.round(dx) + 'px' });
        }
      }
    }

    for (const { t, r } of textos) {
      const texto = t.textContent;
      const esq = r.left - caixaSvg.left, dir = r.right - caixaSvg.left;
      const topo = r.top - caixaSvg.top, base = r.bottom - caixaSvg.top;
      if (esq < -0.5 || dir > caixaSvg.width + 0.5) {
        achados.push({ id, tipo: 'fora-do-svg', texto,
          detalhe: Math.round(esq) + '..' + Math.round(dir) + ' em svg de ' + Math.round(caixaSvg.width) });
        continue;
      }
      if (topo < -0.5 || base > caixaSvg.height + 0.5) {
        achados.push({ id, tipo: 'fora-do-svg-vertical', texto,
          detalhe: Math.round(topo) + '..' + Math.round(base) + ' em altura ' + Math.round(caixaSvg.height) });
        continue;
      }
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const dentro = celulas
        .filter((c) => cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom)
        .sort((a, b) => a.width * a.height - b.width * b.height)[0];
      if (dentro && (r.left < dentro.left - 2 || r.right > dentro.right + 2)) {
        achados.push({ id, tipo: 'vaza-da-celula', texto,
          detalhe: 'texto ' + Math.round(r.width) + 'px numa célula de ' + Math.round(dentro.width) + 'px' });
      }
    }
  }
  return JSON.stringify(achados);
})()`;

async function auditar() {
  const itens = MANIFESTO.map((it) => {
    try { return { id: it.id, svg: it.desenho() }; }
    catch (e) { return { id: it.id, erro: e.message }; }
  });
  for (const i of itens.filter((x) => x.erro)) {
    console.log(`  ERRO ao gerar ${i.id}: ${i.erro}`);
  }
  const bons = itens.filter((i) => i.svg);

  mkdirSync(TEMP, { recursive: true });
  const pagina = join(TEMP, "auditoria.html");
  writeFileSync(pagina, `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
body{background:#2b2622;margin:0;font-family:Inter,system-ui,sans-serif}
.fig{margin:4px}
</style></head><body>
${bons.map((i) => `<div class="fig" data-id="${i.id}">${i.svg}</div>`).join("\n")}
</body></html>`, "utf8");
  console.log(`${bons.length} figuras montadas`);

  const chrome = execFile(acharChrome(), [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${join(TEMP, "perfil")}`,
    `file:///${pagina.replace(/\\/g, "/")}`,
  ]);

  let alvo = null;
  for (let tentativa = 0; tentativa < 40 && !alvo; tentativa += 1) {
    await espera(400);
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
      alvo = lista.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    } catch { /* o Chrome ainda não subiu */ }
  }
  if (!alvo) { chrome.kill(); throw new Error("o Chrome não respondeu na porta de depuração"); }

  const cli = await conectar(alvo.webSocketDebuggerUrl);
  await cli.envia("Runtime.enable");
  // as fontes precisam CARREGAR antes de medir: com o fallback, a largura é outra
  await espera(3500);
  const r = await cli.envia("Runtime.evaluate", {
    expression: MEDICAO, awaitPromise: true, returnByValue: true,
  });
  cli.fecha();
  chrome.kill();

  const achados = JSON.parse(r.result.result.value);
  const porTipo = {};
  for (const a of achados) (porTipo[a.tipo] ??= []).push(a);
  for (const [tipo, lista] of Object.entries(porTipo)) {
    const ids = [...new Set(lista.map((a) => a.id))];
    console.log(`\n### ${tipo} — ${lista.length} texto(s) em ${ids.length} figura(s)`);
    for (const id of ids) {
      console.log(`  ${id}`);
      for (const a of lista.filter((x) => x.id === id).slice(0, 3)) {
        console.log(`      "${a.texto}"  (${a.detalhe})`);
      }
    }
  }

  console.log(achados.length
    ? `\n${achados.length} problema(s) em ${new Set(achados.map((a) => a.id)).size} figura(s), de ${bons.length}`
    : `\n0 problema(s) de texto, de ${bons.length} figuras auditadas`);
  // o Chrome ainda segura o perfil por um instante depois do kill; não vale
  // derrubar a auditoria por causa da faxina
  await espera(600);
  try { rmSync(TEMP, { recursive: true, force: true }); } catch { /* fica para a próxima */ }
  return achados.length;
}

const quantos = await auditar();
process.exit(quantos ? 1 : 0);


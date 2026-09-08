// ferramentas/verificar-videos.mjs
//
// Confere, contra a própria API do YouTube, todo vídeo citado nos cursos.
//
// A regra do projeto é nunca inventar URL de vídeo. O oEmbed do YouTube
// devolve título e canal reais e responde 404 quando o vídeo não existe, foi
// removido ou virou privado — então ele serve tanto para verificar quanto
// para preencher os campos "titulo" e "canal" com o valor correto.
//
// Uso:
//   node ferramentas/verificar-videos.mjs           confere e aponta divergências
//   node ferramentas/verificar-videos.mjs --corrigir  reescreve titulo/canal nos JSONs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CURSOS = join(AQUI, "..", "public", "dados", "cursos");

async function consultar(id) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`
  )}&format=json`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { ok: false, motivo: `HTTP ${r.status}` };
    const d = await r.json();
    return { ok: true, titulo: d.title, canal: d.author_name };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

const corrigir = process.argv.includes("--corrigir");
let problemas = 0;
let conferidos = 0;

for (const arquivo of readdirSync(CURSOS).filter((f) => f.endsWith(".json"))) {
  const caminho = join(CURSOS, arquivo);
  const curso = JSON.parse(readFileSync(caminho, "utf8"));
  if (!curso.videos?.length) continue;

  console.log(`\n${curso.titulo} (${arquivo})`);
  let mudou = false;

  for (const video of curso.videos) {
    const r = await consultar(video.id);
    conferidos += 1;

    if (!r.ok) {
      problemas += 1;
      console.log(`  INDISPONÍVEL  ${video.id}  (${r.motivo})  — "${video.titulo}"`);
      continue;
    }

    // Compara em NFC dos dois lados. A API às vezes devolve o título
    // DECOMPOSTO (o "ç" vem como c + cedilha combinante), o que dá bytes
    // diferentes para textos visualmente idênticos — e o verificador acusava
    // divergência num vídeo perfeitamente certo. Achado em Inequações.
    // Normaliza em NFC e apara as pontas. A API às vezes devolve o texto
    // DECOMPOSTO (o "ç" como c + cedilha combinante) e às vezes com espaço
    // sobrando no fim do título — nenhum dos dois é informação, e os dois
    // já acusaram divergência em vídeo perfeitamente certo.
    const igual = (a, b) => String(a).normalize("NFC").trim() === String(b).normalize("NFC").trim();
    const tituloBate = igual(video.titulo, r.titulo);
    const canalBate = igual(video.canal, r.canal);

    if (tituloBate && canalBate) {
      console.log(`  ok  ${video.id}  ${r.canal}`);
      continue;
    }

    problemas += 1;
    console.log(`  DIVERGE  ${video.id}`);
    if (!tituloBate) console.log(`     título no JSON: ${video.titulo}\n     no YouTube:     ${r.titulo}`);
    if (!canalBate) console.log(`     canal no JSON:  ${video.canal}\n     no YouTube:     ${r.canal}`);

    if (corrigir) {
      video.titulo = r.titulo;
      video.canal = r.canal;
      mudou = true;
    }
  }

  if (mudou) {
    writeFileSync(caminho, JSON.stringify(curso, null, 2) + "\n", "utf8");
    console.log(`  -> ${arquivo} atualizado com os dados reais do YouTube`);
  }
}

console.log(`\n${conferidos} vídeo(s) conferido(s), ${problemas} problema(s).`);
if (problemas > 0 && !corrigir) process.exit(1);

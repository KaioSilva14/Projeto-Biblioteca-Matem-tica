// seo.ts — os metadados das páginas que o JavaScript preenche.
//
// `ano.html`, `curso.html` e `licao.html` existem uma vez no disco e muitas
// vezes no site: `?c=fracoes` e `?c=pitagoras` são endereços diferentes, com
// conteúdos diferentes, e precisam de título, descrição e canonical
// diferentes. O HTML traz um texto genérico — que é o que um leitor vê antes
// de o script rodar — e estas funções o substituem pelo específico.
//
// Um endereço sem canonical próprio é um endereço que o buscador trata como
// duplicata dos outros trezentos. Sem isso, as 312 lições do site valeriam
// por uma.

/**
 * O endereço público. Ele também mora em `ferramentas/site.mjs`, que é quem
 * gera o sitemap e as tags fixas — e um teste exige que os dois sejam
 * iguais, porque um canonical apontando para outro domínio é pior que
 * nenhum.
 */
export const SITE = "https://projeto-biblioteca-matem-tica.vercel.app";

/** O Google corta o que passa disto. Os mesmos números de `site.mjs`. */
const LIMITE_TITULO = 60;
const LIMITE_DESCRICAO = 160;

/**
 * Encurta no espaço anterior ao limite e fecha com reticência.
 *
 * Cortar no caractere exato parte palavra no meio, e um título assim custa
 * clique — a descrição precisa terminar fazendo sentido mesmo aparada.
 */
export function encurtar(texto: string, limite: number): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > limite * 0.6 ? corte.slice(0, espaco) : corte).replace(/[,;:.\s]+$/, "")}…`;
}

function definirMeta(seletor: string, atributo: string, valor: string): void {
  const tag = document.head.querySelector<HTMLMetaElement>(seletor);
  if (tag) tag.setAttribute(atributo, valor);
}

function definirLink(rel: string, href: string): void {
  const tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (tag) tag.href = href;
}

/**
 * Reescreve o título, a descrição, o canonical e as tags de compartilhamento
 * da página atual.
 *
 * `caminho` é o endereço COM a query string, porque é ela que distingue uma
 * lição da outra. Ele entra igual no canonical e no og:url: os dois
 * discordarem é um sinal contraditório para o buscador.
 */
export function metaDaPagina(
  { titulo, descricao, caminho }: { titulo: string; descricao: string; caminho: string }
): void {
  const t = encurtar(titulo, LIMITE_TITULO);
  const d = encurtar(descricao, LIMITE_DESCRICAO);
  const url = `${SITE}${caminho}`;

  document.title = t;
  definirMeta('meta[name="description"]', "content", d);
  definirMeta('meta[property="og:title"]', "content", t);
  definirMeta('meta[property="og:description"]', "content", d);
  definirMeta('meta[property="og:url"]', "content", url);
  definirMeta('meta[name="twitter:title"]', "content", t);
  definirMeta('meta[name="twitter:description"]', "content", d);
  definirLink("canonical", url);
}

/**
 * A trilha de navegação, em dados estruturados.
 *
 * É ela que faz o Google mostrar "Biblioteca Matemática › 9º ano › Volume de
 * sólidos" no lugar do endereço cru — e que diz a ele que estas páginas não
 * são avulsas, mas partes de uma hierarquia. Sem isso, a lição de Pitágoras
 * e a de Frações parecem dois sites diferentes.
 */
export function trilha(itens: { nome: string; caminho: string }[]): void {
  const anterior = document.getElementById("trilha-json");
  if (anterior) anterior.remove();
  const tag = document.createElement("script");
  tag.type = "application/ld+json";
  tag.id = "trilha-json";
  tag.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      item: `${SITE}${item.caminho}`,
    })),
  });
  document.head.appendChild(tag);
}

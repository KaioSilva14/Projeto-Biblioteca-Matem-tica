// tipos.ts — modelo de dados da v3.
//
// A v2 tratava conteúdo como "teoria + 35 atividades". A v3 troca isso por
// LIÇÕES: cada lição ensina UMA ideia e tem sempre a mesma anatomia —
//
//   1. a ideia        por que a coisa funciona, não só a regra
//   2. resolvido      um problema resolvido passo a passo, com o raciocínio
//                     de cada passo escrito por extenso
//   3. questões       prática, cada uma com imagem e resolução comentada
//
// Duas decisões do modelo vêm direto das críticas à v2:
//
//   - `PassoResolvido` separa "explicacao" (por que se faz isso) de "conta"
//     (a aritmética). A v2 misturava os dois num parágrafo só, e o resultado
//     era um texto que dizia o que fazer sem ensinar a pensar.
//
//   - `ErroComum` associa uma resposta errada específica ao motivo de ela
//     ser tentadora. Quando o aluno erra, ele não recebe a solução genérica:
//     recebe o diagnóstico do erro que ele realmente cometeu.

/**
 * Uma imagem já resolvida, como aparece em /dados/imagens.json. Esse arquivo
 * é gerado por ferramentas/gerar-imagens.mjs junto com os PNGs.
 *
 * No conteúdo das lições a imagem é citada só pelo ID (uma string). Assim o
 * caminho, o texto alternativo e as dimensões ficam num lugar só, e uma
 * imagem redesenhada com outro tamanho não obriga a editar lição nenhuma.
 */
export interface Imagem {
  /** Caminho a partir de /public, ex.: "/assets/questoes/q-pizza-8-3.png". */
  arquivo: string;
  alt: string;
  largura: number;
  altura: number;
}

/** Chave de uma imagem no índice /dados/imagens.json. */
export type ImagemId = string;

/** Procedência de uma questão vinda de prova pública. */
export interface Fonte {
  prova: string;
  ano: number;
  referencia: string;
  url?: string;
}

/**
 * Um passo de raciocínio. "explicacao" é o porquê; "conta" é a aritmética.
 * Manter separados é o que permite o aluno entender antes de calcular.
 */
export interface PassoResolvido {
  titulo: string;
  explicacao: string;
  conta?: string;
  imagem?: ImagemId;
}

/** Uma resposta errada específica e o motivo de ela ser tentadora. */
export interface ErroComum {
  resposta: string;
  porque: string;
}

export interface Alternativa {
  rotulo: string;
  texto: string;
}

interface QuestaoBase {
  id: string;
  enunciado: string;
  /** Obrigatória: toda questão da v3 tem apoio visual próprio. */
  imagem: ImagemId;
  fonte?: Fonte;
  dica: string;
  resolucao: PassoResolvido[];
  errosComuns?: ErroComum[];
}

export interface QuestaoAlternativas extends QuestaoBase {
  formato: "alternativas";
  alternativas: Alternativa[];
  /** Índice da alternativa correta em "alternativas". */
  correta: number;
}

export interface QuestaoNumero extends QuestaoBase {
  formato: "numero";
  resposta: number;
  tolerancia?: number;
  unidade?: string;
}

export type Questao = QuestaoAlternativas | QuestaoNumero;

export interface Ideia {
  paragrafos: string[];
  destaque?: string;
  imagem?: ImagemId;
}

export interface ExemploResolvido {
  enunciado: string;
  imagem?: ImagemId;
  passos: PassoResolvido[];
  /** A frase que deve ficar na cabeça do aluno depois do exemplo. */
  fecho: string;
}

export interface Licao {
  id: string;
  numero: number;
  titulo: string;
  /** A pergunta que esta lição responde — vira o subtítulo da página. */
  pergunta: string;
  ideia: Ideia;
  resolvido: ExemploResolvido;
  questoes: Questao[];
}

/**
 * Vídeo de aprofundamento. Fica FORA da lição, numa seção própria do curso:
 * o site ensina por conta própria, e o vídeo é para quem quiser ir além.
 * URL sempre verificada antes de publicar (ver CLAUDE.md).
 */
export interface Video {
  titulo: string;
  canal: string;
  id: string;
  descricao: string;
}

/** Um curso é uma matéria: Frações, Decimais, Área... */
export interface Curso {
  id: string;
  titulo: string;
  ano: Ano;
  descricao: string;
  /** A pergunta que o curso inteiro responde — vira o subtítulo da página. */
  pergunta: string;
  videos: Video[];
  licoes: { id: string; arquivo: string }[];
}

export type Ano = 6 | 7 | 8 | 9;

/** Uma matéria como aparece no catálogo, antes de o curso ser carregado. */
export interface ItemCatalogo {
  id: string;
  titulo: string;
  resumo: string;
  disponivel: boolean;
  arquivo?: string;
}

export interface AnoCatalogo {
  ano: Ano;
  titulo: string;
  descricao: string;
  cursos: ItemCatalogo[];
}

export interface Catalogo {
  anos: AnoCatalogo[];
}

// ---------- Certificado ----------

/**
 * Certificado de conclusão de uma matéria.
 *
 * Não existe banco de dados: o certificado vive no localStorage da máquina do
 * aluno e é exportado como PNG para ele guardar. Se ele limpar o navegador,
 * perde — e a página avisa isso.
 */
export interface Certificado {
  cursoId: string;
  cursoTitulo: string;
  ano: Ano;
  nome: string;
  /** ISO da data de conclusão. */
  data: string;
  questoes: number;
  acertosDePrimeira: number;
}

// ---------- Progresso ----------

/**
 * O progresso é por LIÇÃO, não por índice numa lista global. Cada lição
 * guarda quais questões já foram respondidas e se acertou de primeira.
 * Isso permite retomar exatamente onde parou sem depender de uma ordem
 * global frágil — que foi a origem dos bugs de contagem da v2.
 */
export interface ProgressoLicao {
  licaoId: string;
  /** ids das questões já respondidas, na ordem em que foram respondidas. */
  respondidas: string[];
  /** ids das questões acertadas sem ver a resolução. */
  acertadas: string[];
  concluida: boolean;
}

export interface ProgressoCurso {
  cursoId: string;
  licoes: Record<string, ProgressoLicao>;
  /** Preenchido quando o aluno conclui a matéria e emite o certificado. */
  certificado?: Certificado;
}

/** Tudo o que fica salvo na máquina do aluno, por curso. */
export interface ProgressoGeral {
  cursos: Record<string, ProgressoCurso>;
}

// types.ts
// Tipos e interfaces compartilhados por toda a aplicação.
// Arquivo adicional à lista original do escopo, criado para evitar
// duplicar definições de tipo entre atividades.ts, conteudos.ts e progresso.ts.

export type Ano = 6 | 7 | 8 | 9;

export type CategoriaConteudo =
  | "aritmetica"
  | "algebra"
  | "geometria"
  | "estatistica"
  | "probabilidade";

export type NivelAtividade =
  | "basico"
  | "intermediario"
  | "aplicacao"
  | "desafio";

export type TipoAtividade =
  | "multipla_escolha"
  | "resposta_numerica"
  | "verdadeiro_falso"
  | "complete"
  | "ordenacao"
  | "encontre_erro"
  | "problema"
  | "relacionamento";

export interface Video {
  titulo: string;
  canal: string;
  thumbnail: string;
  descricao: string;
  url: string;
}

export interface Exemplo {
  problema: string;
  estrategia: string;
  calculo: string;
  resultado: string;
  explicacao: string;
}

export interface BlocoTeoria {
  titulo: string;
  paragrafos: string[];
  destaque?: string;
  /** Chave de uma ilustração do banco de SVGs (ver ilustracoes.ts). */
  ilustracao?: string;
}

// ---------- Atividades (união discriminada por "tipo") ----------

export interface AtividadeBase {
  id: number;
  tipo: TipoAtividade;
  nivel: NivelAtividade;
  pergunta: string;
  explicacao: string;
  dica: string;
  /**
   * Chave de uma ilustração do banco de SVGs, exibida junto do enunciado.
   * Opcional: atividades sem apoio visual continuam válidas.
   */
  ilustracao?: string;
}

export interface AtividadeMultiplaEscolha extends AtividadeBase {
  tipo: "multipla_escolha";
  opcoes: string[];
  resposta: number; // índice da opção correta em "opcoes"
}

export interface AtividadeRespostaNumerica extends AtividadeBase {
  tipo: "resposta_numerica";
  resposta: number;
  tolerancia?: number;
}

export interface AtividadeVerdadeiroFalso extends AtividadeBase {
  tipo: "verdadeiro_falso";
  resposta: boolean;
}

export interface AtividadeComplete extends AtividadeBase {
  tipo: "complete";
  resposta: string; // resposta esperada (comparada de forma normalizada)
}

export interface AtividadeOrdenacao extends AtividadeBase {
  tipo: "ordenacao";
  itens: string[];
  ordemCorreta: number[]; // índices de "itens" na ordem correta
}

export interface AtividadeEncontreErro extends AtividadeBase {
  tipo: "encontre_erro";
  opcoes: string[]; // passos de uma resolução, um deles contém o erro
  resposta: number; // índice do passo com erro
}

export interface AtividadeProblema extends AtividadeBase {
  tipo: "problema";
  resposta: number;
  tolerancia?: number;
}

export interface AtividadeRelacionamento extends AtividadeBase {
  tipo: "relacionamento";
  colunaA: string[];
  colunaB: string[];
  paresCorretos: number[]; // paresCorretos[i] = índice em colunaB que casa com colunaA[i]
}

export type Atividade =
  | AtividadeMultiplaEscolha
  | AtividadeRespostaNumerica
  | AtividadeVerdadeiroFalso
  | AtividadeComplete
  | AtividadeOrdenacao
  | AtividadeEncontreErro
  | AtividadeProblema
  | AtividadeRelacionamento;

// ---------- Módulos de estudo (v2) ----------
//
// A v1 mostrava tudo em blocos fixos: toda a teoria, depois todos os exemplos,
// depois todos os vídeos e, por último, as 35 atividades seguidas. A v2 troca
// isso por uma trilha: o conteúdo é uma sequência de módulos, e cada módulo é
// uma sequência de itens que MISTURA teoria, exemplo, vídeo, dica e atividades.
//
// A ordem é definida 100% no JSON — nenhuma matéria nova precisa mexer em TS.

export type ItemModulo =
  | ({ tipo: "teoria" } & BlocoTeoria)
  | ({ tipo: "exemplo" } & Exemplo)
  | ({ tipo: "video" } & Video)
  | { tipo: "dica"; texto: string }
  /** Lote de atividades, referenciadas pelo "id" delas em Conteudo.atividades. */
  | { tipo: "atividades"; titulo: string; ids: number[] };

export interface Modulo {
  id: string;
  numero: number;
  titulo: string;
  objetivo: string;
  nivel: NivelAtividade;
  itens: ItemModulo[];
}

// ---------- Conteúdo ----------

export interface Conteudo {
  id: string;
  titulo: string;
  descricao: string;
  ano: Ano;
  categoria: CategoriaConteudo;
  nivel: NivelAtividade;
  objetivos: string[];
  teoria: BlocoTeoria[];
  exemplos: Exemplo[];
  dicas: string[];
  videos: Video[];
  atividades: Atividade[];
  atividadesExtras: Atividade[];
  resumo: string[];
  /**
   * Trilha de módulos da v2. Opcional de propósito: um conteúdo antigo que
   * ainda não tenha sido convertido continua sendo exibido no formato linear
   * da v1, sem quebrar a página.
   */
  modulos?: Modulo[];
}

// Versão resumida usada nos cards de listagem (Home, páginas de ano, busca)
export interface ConteudoResumo {
  id: string;
  titulo: string;
  descricao: string;
  ano: Ano;
  categoria: CategoriaConteudo;
  nivel: NivelAtividade;
  quantidadeAtividades: number;
  rota: string;
  disponivel: boolean;
}

// ---------- Progresso ----------

export interface ProgressoConteudo {
  conteudoId: string;
  concluidas: number;
  acertos: number;
  erros: number;
  ultimaAtividade: number;
  concluido: boolean;
}

export interface ProgressoArmazenado {
  [conteudoId: string]: ProgressoConteudo;
}

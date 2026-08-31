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
}

// ---------- Atividades (união discriminada por "tipo") ----------

export interface AtividadeBase {
  id: number;
  tipo: TipoAtividade;
  nivel: NivelAtividade;
  pergunta: string;
  explicacao: string;
  dica: string;
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
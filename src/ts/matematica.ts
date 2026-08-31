// matematica.ts — utilitários e regras específicas de Matemática.
export {};

// matematica.ts
// Funções matemáticas reutilizáveis. Nenhuma função usa eval().

/** Máximo divisor comum (algoritmo de Euclides). */
export function mdc(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x === 0 ? 1 : x;
}

/** Mínimo múltiplo comum. */
export function mmc(a: number, b: number): number {
  const divisorComum = mdc(a, b);
  return Math.abs(a * b) / divisorComum;
}

/** Simplifica uma fração até a forma irredutível. */
export function simplificarFracao(
  numerador: number,
  denominador: number
): { numerador: number; denominador: number } {
  if (denominador === 0) {
    throw new Error("Denominador não pode ser zero.");
  }
  const divisorComum = mdc(numerador, denominador);
  const sinal = denominador < 0 ? -1 : 1;
  return {
    numerador: (sinal * numerador) / divisorComum,
    denominador: (sinal * denominador) / divisorComum,
  };
}

/** Converte uma fração em número decimal. */
export function fracaoParaDecimal(numerador: number, denominador: number): number {
  if (denominador === 0) {
    throw new Error("Denominador não pode ser zero.");
  }
  return numerador / denominador;
}

/**
 * Compara dois números com tolerância — necessário porque respostas em decimal
 * (ex.: 1/3 = 0,3333...) nunca devem ser comparadas com igualdade estrita.
 */
export function compararNumeros(a: number, b: number, tolerancia = 0.01): boolean {
  return Math.abs(a - b) <= tolerancia;
}

/** Calcula que percentual "parte" representa de "total" (retorna um valor de 0 a 100). */
export function calcularPorcentagem(parte: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return (parte / total) * 100;
}

/** Calcula a média aritmética simples de uma lista de valores. */
export function calcularMedia(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  const soma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  return soma / valores.length;
}

/**
 * Converte um texto digitado pelo aluno em número, aceitando tanto vírgula quanto
 * ponto como separador decimal (padrão comum de digitação no Brasil).
 * Retorna NaN se o texto não for um número válido — quem chama deve tratar esse caso.
 */
export function normalizarNumero(valorTexto: string): number {
  const textoLimpo = valorTexto.trim().replace(",", ".");
  if (textoLimpo === "") {
    return NaN;
  }
  return Number(textoLimpo);
}
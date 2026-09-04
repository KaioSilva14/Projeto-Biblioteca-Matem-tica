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
export {};
//# sourceMappingURL=tipos.js.map
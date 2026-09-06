// progresso.ts — progresso do aluno, salvo na máquina dele.
//
// Não há banco de dados nem cadastro. Tudo vive no localStorage, numa chave
// só, organizada por curso. O certificado emitido também fica aqui — é por
// isso que a página avisa que limpar os dados do navegador apaga tudo.
//
// O progresso de uma lição é a LISTA de ids de questões respondidas, não um
// contador. Contador é frágil: qualquer mudança de ordem ou repetição de
// clique estraga o número. Lista de ids é idempotente por construção.
const CHAVE = "biblioteca_matematica_v3";
function vazio() {
    return { cursos: {}, anos: {} };
}
function licaoVazia(licaoId) {
    return { licaoId, respondidas: [], acertadas: [], concluida: false };
}
function ehLicaoValida(valor) {
    if (typeof valor !== "object" || valor === null)
        return false;
    const r = valor;
    return (typeof r.licaoId === "string" &&
        Array.isArray(r.respondidas) &&
        Array.isArray(r.acertadas) &&
        typeof r.concluida === "boolean");
}
function ehCertificadoValido(valor) {
    if (typeof valor !== "object" || valor === null)
        return false;
    const r = valor;
    return (typeof r.cursoId === "string" &&
        typeof r.nome === "string" &&
        typeof r.data === "string" &&
        typeof r.questoes === "number" &&
        typeof r.acertosDePrimeira === "number");
}
function ehCertificadoAnoValido(valor) {
    if (typeof valor !== "object" || valor === null)
        return false;
    const r = valor;
    return (typeof r.ano === "number" &&
        typeof r.nome === "string" &&
        typeof r.data === "string" &&
        Array.isArray(r.materias) &&
        typeof r.questoes === "number" &&
        typeof r.acertosDePrimeira === "number");
}
/** Lê tudo. Dados corrompidos devolvem estado vazio em vez de quebrar. */
export function lerTudo() {
    try {
        const bruto = window.localStorage.getItem(CHAVE);
        if (!bruto)
            return vazio();
        const dados = JSON.parse(bruto);
        if (typeof dados !== "object" || dados === null)
            return vazio();
        const cru = dados.cursos;
        if (typeof cru !== "object" || cru === null)
            return vazio();
        const cursos = {};
        for (const [cursoId, valor] of Object.entries(cru)) {
            if (typeof valor !== "object" || valor === null)
                continue;
            const registro = valor;
            const licoes = {};
            if (typeof registro.licoes === "object" && registro.licoes !== null) {
                for (const [licaoId, l] of Object.entries(registro.licoes)) {
                    if (!ehLicaoValida(l))
                        continue;
                    licoes[licaoId] = {
                        licaoId: l.licaoId,
                        respondidas: l.respondidas.filter((x) => typeof x === "string"),
                        acertadas: l.acertadas.filter((x) => typeof x === "string"),
                        concluida: l.concluida,
                    };
                }
            }
            // `licoes` entrou depois no certificado; registro antigo não tem o
            // campo, e vale 0 em vez de derrubar o progresso inteiro.
            const certificado = ehCertificadoValido(registro.certificado)
                ? { ...registro.certificado, licoes: Number(registro.certificado.licoes) || 0 }
                : undefined;
            cursos[cursoId] = { cursoId, licoes, certificado };
        }
        const anos = {};
        const crusAnos = dados.anos;
        if (typeof crusAnos === "object" && crusAnos !== null) {
            for (const [chave, valor] of Object.entries(crusAnos)) {
                if (ehCertificadoAnoValido(valor))
                    anos[chave] = valor;
            }
        }
        return { cursos, anos };
    }
    catch {
        return vazio();
    }
}
function gravar(geral) {
    try {
        window.localStorage.setItem(CHAVE, JSON.stringify(geral));
    }
    catch {
        // localStorage indisponível (aba privada cheia): a sessão continua
        // funcionando, só não persiste.
    }
}
export function lerCurso(cursoId) {
    return lerTudo().cursos[cursoId] ?? { cursoId, licoes: {} };
}
export function lerLicao(cursoId, licaoId) {
    return lerCurso(cursoId).licoes[licaoId] ?? licaoVazia(licaoId);
}
/**
 * Registra a resposta de UMA questão. Idempotente: responder a mesma questão
 * de novo não infla a contagem.
 *
 * "acertouDePrimeira" só é verdadeiro quando o aluno acertou sem ter visto a
 * resolução — é o que distingue "resolveu" de "leu a resposta", e é o número
 * que vai para o certificado.
 */
export function registrarResposta(cursoId, licaoId, questaoId, acertouDePrimeira, totalQuestoes) {
    const geral = lerTudo();
    const curso = geral.cursos[cursoId] ?? { cursoId, licoes: {} };
    const atual = curso.licoes[licaoId] ?? licaoVazia(licaoId);
    const respondidas = atual.respondidas.includes(questaoId)
        ? atual.respondidas
        : [...atual.respondidas, questaoId];
    const acertadas = acertouDePrimeira && !atual.acertadas.includes(questaoId)
        ? [...atual.acertadas, questaoId]
        : atual.acertadas;
    const atualizada = {
        licaoId,
        respondidas,
        acertadas,
        concluida: respondidas.length >= totalQuestoes,
    };
    curso.licoes[licaoId] = atualizada;
    geral.cursos[cursoId] = curso;
    gravar(geral);
    return atualizada;
}
export function reiniciarLicao(cursoId, licaoId) {
    const geral = lerTudo();
    const curso = geral.cursos[cursoId];
    if (!curso)
        return;
    delete curso.licoes[licaoId];
    gravar(geral);
}
export function reiniciarCurso(cursoId) {
    const geral = lerTudo();
    delete geral.cursos[cursoId];
    gravar(geral);
}
/** Resumo do curso, dado o total de lições e a contagem de questões de cada. */
export function resumirCurso(cursoId, licoes) {
    const curso = lerCurso(cursoId);
    let concluidas = 0;
    let respondidas = 0;
    let acertos = 0;
    for (const licao of licoes) {
        const p = curso.licoes[licao.id];
        if (!p)
            continue;
        if (p.concluida)
            concluidas += 1;
        respondidas += p.respondidas.length;
        acertos += p.acertadas.length;
    }
    return {
        licoesConcluidas: concluidas,
        questoesRespondidas: respondidas,
        acertosDePrimeira: acertos,
        concluido: licoes.length > 0 && concluidas === licoes.length,
    };
}
/** A primeira lição ainda não concluída — o "continue daqui". */
export function proximaLicao(cursoId, ordem) {
    const curso = lerCurso(cursoId);
    for (const id of ordem) {
        if (!curso.licoes[id]?.concluida)
            return id;
    }
    return null;
}
// ---------- Certificado ----------
export function lerCertificado(cursoId) {
    return lerCurso(cursoId).certificado ?? null;
}
/**
 * Emite (ou reemite, se o aluno trocar o nome) o certificado da matéria.
 * Só faz sentido chamar quando resumirCurso().concluido for verdadeiro —
 * quem garante isso é a interface.
 */
export function emitirCertificado(certificado) {
    const geral = lerTudo();
    const curso = geral.cursos[certificado.cursoId] ?? { cursoId: certificado.cursoId, licoes: {} };
    curso.certificado = certificado;
    geral.cursos[certificado.cursoId] = curso;
    gravar(geral);
    return certificado;
}
/** Todos os certificados já emitidos, do mais novo para o mais antigo. */
export function listarCertificados() {
    return Object.values(lerTudo().cursos)
        .map((c) => c.certificado)
        .filter((c) => c !== undefined)
        .sort((a, b) => b.data.localeCompare(a.data));
}
/**
 * Resume o ano a partir dos certificados de matéria guardados.
 *
 * `cursosDoAno` são os ids das matérias PUBLICADAS daquele ano, na ordem do
 * catálogo. Matéria ainda não escrita não entra na conta: senão nenhum ano
 * fecharia enquanto o catálogo inteiro não estivesse pronto.
 */
export function resumirAno(cursosDoAno) {
    const geral = lerTudo();
    const certificados = cursosDoAno
        .map((id) => geral.cursos[id]?.certificado)
        .filter((c) => c !== undefined);
    const soma = (campo) => certificados.reduce((total, c) => total + (c[campo] || 0), 0);
    return {
        concluidas: certificados.length,
        totalMaterias: cursosDoAno.length,
        concluido: cursosDoAno.length > 0 && certificados.length === cursosDoAno.length,
        materias: certificados.map((c) => c.cursoTitulo),
        licoes: soma("licoes"),
        questoes: soma("questoes"),
        acertosDePrimeira: soma("acertosDePrimeira"),
        ultimaData: certificados.map((c) => c.data).sort().at(-1) ?? "",
    };
}
export function lerCertificadoAno(ano) {
    return lerTudo().anos[String(ano)] ?? null;
}
export function emitirCertificadoAno(certificado) {
    const geral = lerTudo();
    geral.anos[String(certificado.ano)] = certificado;
    gravar(geral);
    return certificado;
}
/**
 * Some o certificado de ano.
 *
 * Chamado quando o aluno apaga o progresso de alguma matéria daquele ano: o
 * ano deixou de estar completo, e deixar o certificado guardado seria dizer
 * que ele terminou uma coisa que já não está terminada.
 */
export function removerCertificadoAno(ano) {
    const geral = lerTudo();
    delete geral.anos[String(ano)];
    gravar(geral);
}
/** Todos os certificados de ano, do mais novo para o mais antigo. */
export function listarCertificadosAno() {
    return Object.values(lerTudo().anos).sort((a, b) => b.data.localeCompare(a.data));
}
//# sourceMappingURL=progresso.js.map
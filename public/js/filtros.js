export function filtrarPorCategoria(lista, categoria) {
    if (categoria === "todas") {
        return lista;
    }
    return lista.filter((item) => item.categoria === categoria);
}
export function filtrarPorNivel(lista, nivel) {
    if (nivel === "todos") {
        return lista;
    }
    return lista.filter((item) => item.nivel === nivel);
}
export function aplicarFiltros(lista, filtros) {
    return filtrarPorNivel(filtrarPorCategoria(lista, filtros.categoria), filtros.nivel);
}
//# sourceMappingURL=filtros.js.map
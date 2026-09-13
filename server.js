const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve todos os arquivos estáticos da pasta public (HTML, CSS, JS compilado, dados, assets)
app.use(express.static(path.join(__dirname, "public")));

// Rota raiz explícita — garante que a Home carregue mesmo sem o Express
// resolver "index.html" automaticamente em algum ambiente de hospedagem.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Qualquer rota não encontrada recebe a 404 do site — a mesma página que a
// hospedagem serve em produção, com a barra de navegação, a grade dos anos e
// um caminho de volta. Uma frase em texto puro deixa o visitante sem saída, e
// deixa o desenvolvedor sem ver em casa o que o visitante vê.
//
// O status continua sendo 404: é ele que diz ao buscador para não indexar o
// endereço, e responder 200 numa página que não existe (o chamado "soft
// 404") faz o índice encher de endereços mortos.
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Biblioteca Matemática rodando em http://localhost:${PORT}`);
});

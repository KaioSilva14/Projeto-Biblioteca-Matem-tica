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

// Qualquer rota não encontrada recebe uma resposta simples de erro básico.
app.use((req, res) => {
  res.status(404).send("Página não encontrada.");
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Biblioteca Matemática rodando em http://localhost:${PORT}`);
});

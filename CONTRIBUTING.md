<div align="center">

<img src=".github/capa.svg" alt="Biblioteca Matemática" width="720">

# Contribuindo

</div>

Obrigado por querer ajudar. Este é um projeto de estudo gratuito, e a
contribuição mais valiosa não é código: **é apontar um erro no conteúdo.**

<br>

## O que ajuda mais

<details open>
<summary><b>🐛 &nbsp;Achou um erro de Matemática</b></summary>

<br>

Este é o achado mais importante que existe aqui, porque é o único que prejudica
quem está aprendendo. Abra uma issue com:

- o **endereço da lição** (por exemplo `/licao.html?c=volume-9&l=cone`);
- o **id da questão**, que aparece no JSON da lição (`q1`, `q2`…);
- o que o site diz e o que deveria dizer.

Vale para qualquer uma destas coisas:

| tipo | exemplo |
|---|---|
| Conta errada | a resposta publicada não bate com a conta |
| Figura que desmente o rótulo | um lado de 4 cm desenhado maior que o de 7 cm |
| Enunciado ambíguo | duas alternativas defensáveis |
| Diagnóstico que não encaixa | o erro previsto não é o erro que a pessoa cometeu |
| Figura que entrega a resposta | dá para acertar sem entender |

</details>

<details>
<summary><b>📝 &nbsp;Achou um erro de texto</b></summary>

<br>

Erro de digitação, concordância, acentuação ou uma frase que ficou confusa.
Issue ou pull request direto, os dois servem.

</details>

<details>
<summary><b>💡 &nbsp;Tem uma ideia de conteúdo</b></summary>

<br>

Uma explicação melhor para uma ideia difícil, um erro comum que a lição não
prevê, uma figura que tornaria algo evidente. Abra uma issue descrevendo o
problema pedagógico antes da solução — **por que o jeito atual não pega**.

</details>

<br>

## Antes de abrir um pull request

```bash
npm install
npm test          # os 512 testes precisam passar
npm run figuras   # nenhum texto pode transbordar de figura
```

<br>

## As regras que o projeto não quebra

Elas existem porque cada uma delas nasceu de um defeito real que chegou à tela.

<details>
<summary><b>1. Toda conta é verificada rodando código — nunca de cabeça</b></summary>

<br>

`tests/conteudo.test.mjs` recalcula **cada** resposta publicada, a partir dos
dados do enunciado. Ao acrescentar uma questão, acrescente a verificação
junto.

</details>

<details>
<summary><b>2. A verificação não usa a fórmula que a matéria ensina</b></summary>

<br>

Esta é a regra mais importante do repositório. Se a lição ensina
`V = B × h ÷ 3`, o teste **não** pode conferir com `B × h ÷ 3` — senão ele só
confirma que a fórmula é igual a ela mesma.

O caminho é sempre outro: somar fatias, contar casos, varrer a faixa,
enumerar, medir o polígono pelo laço. Assim, se a fórmula publicada estivesse
errada, o teste discordaria dela.

</details>

<details>
<summary><b>3. Toda alternativa errada precisa do diagnóstico dela</b></summary>

<br>

Sem um `errosComuns` que case com aquele texto, o aluno recebe "Ainda não." e
uma dica genérica — que é exatamente o que este projeto existe para não fazer.
Um teste reprova questão sem diagnóstico.

E o diagnóstico tem de ser **alcançável**: em questão numérica o motor casa por
valor, então um erro previsto "8,0" numa questão de resposta 8 nunca aparece.

</details>

<details>
<summary><b>4. A figura não pode desmentir o próprio rótulo</b></summary>

<br>

Um triângulo dito obtusângulo precisa ter um ângulo acima de 90°. Um cone
rotulado "raio 3, altura 8" precisa sair alto e estreito. Os testes de
geometria leem o SVG de volta e **medem**.

Por isso as figuras são construídas a partir do enunciado, e não escolhidas de
um catálogo de formas prontas.

</details>

<details>
<summary><b>5. A figura não entrega a resposta</b></summary>

<br>

Em "qual é maior?", as barras vão sem rótulo. O `alt` descreve o que a figura
mostra, **nunca a resposta**. Há um teste que lê a resposta de cada questão e
exige que ela não apareça no texto do SVG.

</details>

<details>
<summary><b>6. Questão de aplicação vem de prova pública, com fonte declarada</b></summary>

<br>

As da OBMEP são publicadas abertamente por ela, para fim educacional, e cada
uma traz a prova, o ano e o número do problema. **Conferir a solução oficial
antes de usar**: três problemas já foram descartados porque a própria solução
publicada não fechava.

> [!IMPORTANT]
> **Questão da OBMEP não pode ser comercializada.** Ela é da OBMEP e do IMPA,
> que não publicam licença aberta autorizando uso comercial. A licença MIT
> deste repositório cobre o código e não se estende a elas — veja a
> [licença](LICENSE) antes de reutilizar o projeto para qualquer fim pago.

</details>

<details>
<summary><b>7. Nunca inventar URL de vídeo</b></summary>

<br>

`npm run videos` confere todo vídeo citado contra a API do YouTube, que
devolve o título e o canal reais. Rodar antes de publicar matéria nova.

</details>

<details>
<summary><b>8. O celular decide a largura das figuras</b></summary>

<br>

**456px é o teto.** Acima disso a figura é exibida abaixo de 0,65 do tamanho
num aparelho de 320px, e os rótulos em DM Mono ficam ilegíveis.

Quando não couber, a saída é **reorganizar**, não encolher: quebrar em mais
linhas, como `angulosComparados` faz a partir de quatro itens.

</details>

<details>
<summary><b>9. Na conta de um passo, o <code>·</code> separa e o <code>×</code> multiplica</b></summary>

<br>

O teste que confere as igualdades quebra a conta pelos `·` e avalia cada
pedaço. Escrever "3 · 3 = 9" é lido como duas partes e reprovado com razão —
o certo é "3 × 3 = 9".

</details>

<br>

## Publicar uma matéria nova

Não se escreve HTML nem TypeScript para isso:

1. escrever `public/dados/cursos/<id>.json` e as lições em
   `public/dados/licoes/<id>/`;
2. acrescentar as figuras a `ferramentas/manifesto-imagens.mjs`;
3. `npm run imagens -- --faltando`;
4. virar `disponivel` para `true` no catálogo e apontar o `arquivo`;
5. escrever o bloco de testes da matéria;
6. `npm test`, `npm run figuras`, `npm run videos` e `npm run seo`.

O custo real, medido: 6 a 8 lições, ~4 questões por lição, ~6 figuras por
lição, 3 vídeos verificados e a verificação matemática de cada resposta. **Não
dá para acelerar isso sem cair no conteúdo raso que o projeto existe para
evitar.**

<br>

## Código de conduta

Seja gentil. O público deste projeto tem entre 11 e 15 anos, e quem contribui
aqui está ajudando alguém a entender Matemática pela primeira vez. Crítica ao
conteúdo é bem-vinda e necessária; grosseria com pessoas, não.

<br>

<div align="center">

**Obrigado.** — [Kaio Silva](https://github.com/KaioSilva14)

</div>

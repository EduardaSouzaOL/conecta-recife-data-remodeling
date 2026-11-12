---
name: using-kodiak-expressions
description: >
  Como criar e usar expressões JavaScript inline no Kodiak. Use sempre que o usuário
  pedir para criar uma expressão, transformar dados, formatar valores, filtrar arrays,
  concatenar propriedades ou qualquer manipulação de dados em campos do Kodiak usando ${}.
  Use também quando o usuário perguntar como escrever uma expressão, qual sintaxe usar,
  ou quando estiver montando uma tela e precisar de um valor dinâmico em algum campo.
---

# Skill: Using Kodiak Expressions

Expressões possibilitam o uso de javascript inline para transformar, formatar, ou fazer qualquer manipulação em dados quando o Kodiak não permitir de forma nativa.

## Como funciona

Uma expressão no Kodiak é feita da seguinte forma: ${inlineJSExpression}. Qualquer campo de texto permite o uso de expressões. Essa expressão é resolvida no servidor e o resultado é enviado para o app no momento de carregamento da tela, o app não sabe que ela existe.

### REGRAS ###

- As expressões JavaScript são inline, sempre dentro de "${}" (exemplo: ${produtos.filter(...)}).
- Nunca use chaves "{}" dentro do corpo da expressão.
- Não utilize: if, else, switch, const, let, var, return, new, function, nem blocos.
- A expressão deve ser inline, em uma única linha, sem quebras ou blocos.
- Nunca acrescente comentários dentro da expressão.
- O resultado deve manter a estrutura de dados original, exceto se o usuário pedir para mudar.
- Use funções de array/objeto: map, filter, reduce, split, join, Object.entries, Object.fromEntries etc sempre que possível.
- Sempre utilize Object.fromEntries para criar objetos, para evitar o uso de chaves na expressão, que é proibido.

#### Exemplos válidos:
- Input: Quero filtrar o array produtos para mostrar apenas os itens em que a propriedade show seja verdadeira.
  Output: ${produtos.filter(produto => !!produto?.show)}
- Input: Quero formatar a propriedade date dos objetos do array comprovantes. A data está no formato YYYY-MM-DD e quero que fique no formato DD/MM/YYYY.
  Output: ${comprovantes.map(e => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, k === 'date' ? v.split('-')[2] + '/' + v.split('-')[1] + '/' + v.split('-')[0] : v])))}
- Input: Concatene as propriedades firstName e lastName do array nomes, separados por espaço, em uma propriedade chamada fullName. Retorne o array com os objetos contendo apenas o fullName.
  Output: ${nomes.map(e => Object.fromEntries([["fullName", e.firstName + ' ' + e.lastName]]))}

#### Exemplos inválidos:
- Uso de blocos ou estruturas proibidas:
  - ${array.map(item => { const x = ...; return ... })} → inválido
- ${produto.concat([["descricao", `${produto.nome} - R$ ${produto.preco} (${produto.estoque} unidades)`]])} -> inválido, sempre utilizar o operador '+' para concatenar pra não utilizar `${}` dentro da expressão
- Modifica a estrutura de dados sem instrução explícita:
  - ${array.map(e => e.date.split('-')[2] + '/' + e.date.split('-')[1] + '/' + e.date.split('-')[0])} → inválido se o usuário não pediu só as datas
- Arrays de objetos fixos com chaves literais:
  - ${ [{label: "teste1"},{label: "teste2"}] } → inválido, pois contém `{}` no corpo da expressão
  - Para criar um array de objetos fixos, use Object.fromEntries:
    ${[["label","teste1"],["label","teste2"]].map(([k,v]) => Object.fromEntries([[k,v]]))}

Lembre-se: **clareza, precisão e aderência total às regras acima**.

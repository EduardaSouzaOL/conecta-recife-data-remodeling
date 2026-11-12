# Template Intro/Resultado

O template Intro/Resultado é utilizado para apresentar o retorno de uma ação executada pelo usuário, podendo ser aplicado no início da aplicação, no meio de um fluxo para confirmação de ações, ou como etapa final. Ele serve para exibir resultados, destacar informações relevantes que exigem atenção ou solicitar dupla confirmação em decisões críticas, contribuindo para a clareza, controle e segurança na experiência do usuário.

## Definições gerais

- Não deve ser utilizado para resultados de operações. Ex: transferências e compras.
- O uso do overline é opcional.
- O ícone, o título, o parágrafo auxiliar e o botão são obrigatórios.
- É possível escolher entre diferentes tipos de estilos, de acordo com a informação ou criticidade da informação.
- Os ícones dos estilos Default e Critical podem ser variados, à escolha do designer, porém recomendamos o uso dos ícones `information` e `error`, respectivamente. Já para os estilos Success e Warning, o uso dos ícones `success` e `warning`, respectivamente, é obrigatório.
- Componente de botão fixo é obrigatório.

## UX Writing

### Quando utilizada para apresentar um produto ou serviço

Com foco em benefícios e engajamento inicial, seguir as recomendações abaixo.

**Estrutura recomendada:**
- **NavBar Header:** Sempre usar o texto "Introdução".
- **Overline:** Nome do produto ou serviço.
- **Título:** Resumo objetivo do que será encontrado no fluxo (máx. 3 linhas).
- **Texto auxiliar:** Complementa o título com informações adicionais (máx. 3 linhas).
- **Botão:** Texto fixo "Vamos lá!".

**Evitar:**
- Textos extensos.
- Excesso de detalhes nesta etapa — distribua o conteúdo ao longo do fluxo.

---

### Quando utilizada para encerrar um fluxo

Com variações positiva ou negativa, seguir as recomendações abaixo. **Não deve ser usada para conclusão de transações.**

**Positiva:**
- **NavBar Header:** Substantivo (produto/serviço) + verbo no particípio.
- **Overline:** "Pronto!"
- **Título:** Confirmação breve da ação realizada (máx. 3 linhas).
- **Texto auxiliar:** Complementa o título com contexto adicional (máx. 3 linhas).
- **Botão:** "Ir para a tela inicial" ou equivalente conforme o fluxo.

**Negativa:**
- **NavBar Header:** Sempre iniciar com "Erro".
- **Overline:** "Atenção"
- **Título:** Mensagem clara sobre o erro ocorrido (máx. 3 linhas).
- **Texto auxiliar:** Orientação sobre como resolver o problema (máx. 3 linhas).
- **Botão:** "Tentar novamente", "OK" ou conforme o contexto.

**Evitar:**
- Textos longos ou genéricos.
- Mensagens vagas que não orientam o usuário sobre o próximo passo.

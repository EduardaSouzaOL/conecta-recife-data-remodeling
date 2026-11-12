# Template Statement

É um template de apresentação de caixa de saldo e seções de listas que podem ser filtradas a partir de itens de seleção, inputs e Bottom Sheet.

## Definições gerais

- Na primeira seção, composta por filtros e caixa de saldo, deve ter ao menos um item habilitado.
- As abas podem ser aplicadas com o uso de ícones, como previsto no componente.
- O **Additional Value**, presente no final das seções de listas, é separado pelo componente Divider, usando o token Small para sua altura. O restante da lista é separada por um token Regular.
- O título das seções de lista não é obrigatório e utiliza o tamanho de fonte com token Small.
- Os Content-Lines são separados pelo componente Divider, que deve permanecer oculto (ShowLine: False). Exceção para o Content-Line do Additional Value, que é separado pelo Divider visível.
- Nas listas, os valores à direita devem prever a aplicação da cor preta (padrão do componente), azul (`text-on-primary: #3354FD`) e vermelho (`text-critical: #D51B06`), esses dois últimos para representar valores positivos e negativos, respectivamente.
- Este template não aceita a área comum de rodapé (Footer), presente em alguns templates.

## UX Writing

O template Statement é recomendado para telas de extrato. Os componentes usados devem seguir as recomendações de UX Writing:

**NavBar Header** — Na primeira interação, usamos o nome da funcionalidade ou da ação de acordo com o ponto de acesso que pode ser um menu ou um botão. A partir da segunda interação usamos o verbo que retrata a ação que o usuário está fazendo até a tela de sucesso ou a tela de confirmação. Usamos verbo no infinitivo e caixa alta apenas no início da frase, exceto para nomes de produtos.

**Select Field** — Deve vir com um substantivo no label e quando aberto, o label vai para cima e aparecem as opções para escolha.

**Select Button** — Não possui navegação em profundidade. Pode vir escolhido por default ou vazio. Evitar o uso do verbo. Permite mais de uma escolha e pode funcionar como filtro.

**Tab** — Pode trazer abreviações para economizar espaço.

**Content Line** — A label deve ser concisa e trazer a informação necessária da funcionalidade. Em caso de 2 colunas de texto, use apenas labels, valores e microinformações.

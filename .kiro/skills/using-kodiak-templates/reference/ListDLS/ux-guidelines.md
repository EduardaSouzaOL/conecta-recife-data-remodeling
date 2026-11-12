# Template Lista

O template Lista é utilizado para estruturar telas com listas de itens, organizadas opcionalmente em seções de conteúdo. A lista pode ser encapsulada dentro de um container por meio do componente Card-List, permitindo maior controle visual e hierárquico da informação. Todas as variações e propriedades do componente Content-Line estão disponíveis e podem ser aplicadas conforme a necessidade da interface.

## Definições gerais

- Uma lista de conteúdo pode ser criada sem título, mas o título da seção não pode existir sem sua lista de conteúdo.
- O template permite a criação de múltiplas seções de listas de conteúdo, incluindo listas simples. Nas listas simples, é possível habilitar o campo de pesquisa contextual, que atua como um filtro dinâmico, refinando os itens exibidos com base nos termos inseridos pela pessoa usuária.
- É possível estruturar listas de conteúdo encapsuladas no componente Card-List. É permitido aplicar todas as variações e propriedades disponíveis do componente Content-Line.
- Todas as variações do componente Content-Line podem ser aplicadas.
- Para aplicar o prefixo Avatar com conteúdo de Image no Content-Line, é necessário acessar as propriedades do prefixo. A imagem do avatar será aplicada no formato square, como previsto no componente.
- O **Link Navigation** poderá ser aplicado no final de listas de Content-Lines. Adotar o rótulo "Ver mais" como valor inicial, podendo ser aplicado outros rótulos, além disso, poderá ser aplicado o ícone Chevron à direita.

## Boas práticas

- Mesmo sendo possível no template, não é recomendado combinar diferentes tipos de apresentação de listas de conteúdo (List e Card-List) em uma mesma tela. Todas as seções devem seguir uma estrutura visual uniforme, garantindo consistência na apresentação dos itens. A escolha do formato deve considerar cuidadosamente o contexto de uso.
- Cuidado ao usar variações diferentes do componente Content-Line em uma mesma lista de conteúdo, apesar de ser possível, não é uma boa prática. É preciso observar bem o contexto.
- Ao optar por um tipo de apresentação de lista de conteúdo — seja encapsulada no Card-List ou não — é fundamental manter a consistência visual em todas as telas do fluxo. Certifique-se de aplicar o mesmo padrão de estrutura nas listas de itens semelhantes, garantindo uniformidade na experiência do usuário e coerência na interface.
- Se o ícone de prefixo for habilitado em um título de seção, e a tela contiver múltiplas seções com título, aplique o ícone correspondente em todas elas para manter a consistência visual. A decisão deve considerar o contexto da interface.
- Se for adotado um link de navegação ao final de uma lista ou como sufixo no título da seção, mantenha o padrão visual do posicionamento do link em todas as telas do fluxo para garantir consistência.
- No **Card-List**, deve ser aplicado apenas Content-Lines e Link Navigations, não sendo permitido aplicar outros componentes.

## UX Writing

O conteúdo das listas pode ser bem variado, pode servir para uma simples conferência de informações ou para organização de dados. Neste template, temos os seguintes componentes e elementos:

**NavBar Header** — É criado de acordo com ponto de acesso, respeitando as boas práticas de construção: verbo no infinitivo, máximo de duas palavras (exceto para palavras compostas ou nomes de produto), evitando conjunções, artigos, preposições, barra (/) ou hífen.

**Cabeçalho** — O título e o texto auxiliar seguem as recomendações de fluxo guiado. Devem ser conversacionais (em forma de pergunta ou instrução), preferencialmente com 2 linhas, podendo ter no máximo 3 linhas.

**Content Line** — A label deve ser concisa e trazer a informação necessária da funcionalidade. Se for uma ação, o verbo deve estar no infinitivo. Não deve ser pontuada e deve ter apenas uma linha de conteúdo.

**Descrição** — Deve ser um texto breve e significativo, com no máximo 3 linhas, que complementa a label. Deve ser pontuado, mas quando tiver função de label, a pontuação não é recomendada.

Para mais informações sobre o uso dos componentes presentes no template, acesse a documentação específica disponibilizada no Portal de UX.

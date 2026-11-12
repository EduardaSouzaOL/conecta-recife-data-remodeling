# Template Formulário

O template Formulário é projetado para viabilizar a inserção de informações por meio de inputs de formulário, oferecendo uma estrutura flexível e organizada para aplicações mobile. Ele pode ser composto por seções de campos, que podem conter títulos de seção e linhas de conteúdo — encapsuladas ou não.

## Definições gerais

- Cada seção deve conter pelo menos um dos seguintes elementos interativos: campo de formulário, botão de seleção (Select Button), Switch Button, Checkbox ou Radio Button.
- Não pode existir título de seção sem item de formulário.
- Pode existir formulário sem título de seção.
- O formulário pode ser dividido em seções.
- O **Link Navigation** poderá ser aplicado no final de listas de Content-Lines. Adotar o rótulo "Ver mais" como valor inicial, podendo ser aplicado outros rótulos, além disso, poderá ser aplicado o ícone Chevron à direita.

## Boas práticas

- Embora o template ofereça suporte visual para até 8 campos para o formulário, a plataforma Kodiak não impõe limites quanto à quantidade de campos que podem ser utilizados. No entanto, é fundamental seguir as boas práticas de usabilidade e design, garantindo que a interface permaneça acessível, organizada e eficiente para o usuário. Avalie sempre a complexidade da tela e considere dividir o conteúdo quando necessário, priorizando a experiência do usuário.
- Analise bem a combinação dos campos em uma tela, se compõem o mesmo contexto.
- Veja a possibilidade de separar o formulário em várias telas para facilitar o entendimento do usuário.
- Mesmo sendo possível no template, não é recomendado combinar diferentes tipos de apresentação de listas de conteúdo (List e Card-List) em uma mesma tela. Todas as seções devem seguir uma estrutura visual uniforme, garantindo consistência na apresentação dos itens. A escolha do formato deve considerar cuidadosamente o contexto de uso.
- Cuidado ao usar variações diferentes do componente Content-Line em uma mesma lista de conteúdo, apesar de ser possível, não é uma boa prática. É preciso observar bem o contexto.
- Ao optar por um tipo de apresentação de lista de conteúdo — seja encapsulada no Card-List ou não — é fundamental manter a consistência visual em todas as telas do fluxo. Certifique-se de aplicar o mesmo padrão de estrutura nas listas de itens semelhantes, garantindo uniformidade na experiência do usuário e coerência na interface.
- Se o ícone de prefixo for habilitado em um título de seção, e a tela contiver múltiplas seções com título, aplique o ícone correspondente em todas elas para manter a consistência visual. A decisão deve considerar o contexto da interface.
- Se for adotado um link de navegação ao final de uma lista ou como sufixo no título da seção, mantenha o padrão visual do posicionamento do link em todas as telas do fluxo para garantir consistência.
- No **Card-List**, deve ser aplicado apenas Content-Lines e Link Navigations, não sendo permitido aplicar outros componentes. Ao utilizar o componente Link Navigation no Section Title dentro da estrutura Card-List, o tamanho da fonte deve ser sempre configurado como Small.
- Ao incluir múltiplos campos de formulário em uma única tela, é importante considerar a divisão em etapas ou telas menores. Essa abordagem contribui para uma experiência mais leve e intuitiva, evitando sobrecarga visual e facilitando o foco do usuário em cada grupo de informações.
- Acesse mais dicas em https://dls.bb.com.br/tutoriais/visao-geral-de-formularios

## UX Writing

As recomendações a seguir são referentes aos componentes que possuem mais conteúdo textual.

**Select Field** — Deve ser usado sempre que houver mais de 4 itens, substituindo o Radio Button que deve ter no máximo 3 itens. Quando fechado, deve vir com um substantivo na label. Quando aberto, a label vai para cima e aparecem as opções para escolha.

**Text Field** — É o modelo de input mais flexível e deve ser usado quando precisamos que o usuário forneça alguma informação através de dados textuais ou numéricos de forma flexível como e-mails, endereços, telefones, códigos, etc. O Text Field traz o substantivo na label e máscara ou input aberto (campo). Quando a label já traz a informação do que é para ser preenchido, o input (campo) fica vazio.

**Hint** — O hint deve trazer informações mais específicas e que complementem a label, sem redundância. Podem ser usados exemplos, frases que tragam alguma orientação e ranges (entre tal valor e outro). O hint deve sempre ser pontuado. Quando a informação for opcional para o preenchimento do formulário, cadastro ou lista, essa informação deve vir no hint com a palavra opcional entre parênteses: (opcional).

**Content Line** — A label deve ser concisa e trazer a informação necessária da funcionalidade. Se for uma ação, o verbo deve estar no infinitivo. Não deve ser pontuada e deve ter apenas uma linha de conteúdo.

**Descrição** — Deve ser um texto breve e significativo, com no máximo 3 linhas, que complementa a label. Deve ser pontuado, mas quando tiver função de label, a pontuação não é recomendada.

### Central 2.0
O template Central 2.0 foi desenvolvido para oferecer uma estrutura versátil capaz de acomodar diferentes composições de interface, atendendo especialmente telas que atuam como Centrais de fluxo. Seu propósito é servir como ponto de integração visual e funcional, organizando conteúdos diversos de forma equilibrada e destacando áreas essenciais do serviço. A utilização deste template exige apenas a presença de um widget configurado, permitindo flexibilidade para adaptação a múltiplos cenários sem comprometer a padronização.
### Definições Gerais
Todas as propriedades dos componentes previstos neste template devem estar disponíveis para aplicação, salvo as exceções especificadas ao longo deste documento e das especificações do template.
##### Componente Icon Action
O componente pode ser apresentado nos estilos Grid ou Inline, e sua quantidade deve ser limitada a até 9 itens, como já previsto no componente.
##### Componente Selection Button
O componente Selection Button, quando utilizado no conteúdo do template, deve atuar em conjunto com o campo de formulário, oferecendo opções pré‑definidas para agilizar o preenchimento do Text Field. Ele funciona como um atalho de seleção.
**A propriedade Filter**, disponível no componente, **não deve ser utilizado**, pois o componente deve atuar exclusivamente em modo de seleção simples.
##### Componente Selectable Card List
Para este template, são aceitas APENAS as variações do tipo **Compact** e **Imagem Only Horizontal**. Eles funcionam como um filtro de conteúdo, semelhante às Tabs.
Nao é aplicável a propriedade Erro do componente. Para mensagens, utilizar o Inline Message do Inner Header.
##### Componente Text Field
O componente Text Field presente na seção Quick Access **não suporta as propriedades Show Label e Show Hint**.
##### Componente Button Secondary do Quick Access
**O botão pode atualizar dinamicamente seu rótulo e sua ação conforme o estado do campo de texto.** Exemplo: no estado inicial, o rótulo exibido é “Colar”, após o preenchimento do campo de formulário, o rótulo e a ação do botão são alterados para “Pagar”.
##### Componente Image
Únicos formatos permitidos: **Portrait**, **Square** e **Wide**.
##### Card Image
O template **aceita apenas os componentes Card Image e Card Image Product**. Não permitindo outras variações de Card Image.
##### Card Info
O componente aceita apenas a variação Simple da propriedade Type.
##### Card List
A seção de Card List contendo Content-Lines permite apenas as variações disponíveis na **seção Variações da Seção de Lista das especificações do template**.
##### Seção de Lista
A seção de lista é composta por Card Lists, que permitem **inserir apenas os componentes previamente definidos nas especificações do template**.
##### Seção: Preset Content
O template conta com a propriedade Type na seção Preset Content, que permite definir o modelo de conteúdo a ser aplicado na tela. As opções disponíveis são: **Custom, Hub, Offer e Product**.
Os modelos têm como objetivo facilitar a montagem da tela, habilitando propriedades específicas conforme cada necessidade.
##### Quick Access e Chart
O Quick Access é composto por Icon Actions, que podem ser exibidos no formato de grid ou em carrossel do tipo lista.
O Chart é encapsulado pelo componente Card Content.
### Boas Práticas
##### Icon Actions
Mesmo sendo possível adicionar até 9 Icon Actions no formato carrossel, recomenda‑se utilizar uma quantidade menor — idealmente entre 5 e 6 itens — para preservar a clareza e a usabilidade.
No estilo Grid, que comporta duas fileiras com até quatro itens cada, evite deixar apenas um item isolado na segunda fileira. Nesses casos, opte pelo estilo Inline.
##### Botão do campo de texto
O rótulo do botão do campo de texto, localizado na seção com Quick Access, deve ser curto. **Esse botão é recomendado para ações rápidas**, como colar informações que estejam na área de transferência.
##### Widget de Content Lines
Evite misturar diferentes tipos de Content-Lines na mesma seção. Use o mesmo tipo e variação para manter consistência.
Se a seção utilizar Navigation Line, aplique esse mesmo tipo às demais Content-Lines.
Da mesma forma, se houver prefixo de ícone, mantenha ícones em todas as Content-Lines da seção e **ajuste o Divider para Prefix: Icon.**
Quando houver prefixos variados, o Divider deve usar Prefix: None.
##### Telas transacionais
Não recomendamos utilizar o template Central como tela transacional; no entanto, essa aplicação não é limitada na launchpad Kodiak.
### Conteúdo (UX Writing)
Este template pode ser utilizado como ponto de entrada para uma ampla variedade de produtos e serviços. Por se tratar de uma estrutura voltada à apresentação — seja de ofertas, produtos, hubs de navegação ou modelos para varejo — ele permite adotar diferentes tons de comunicação, desde abordagens mais persuasivas até propostas mais emocionais, conforme o contexto da jornada.
Sua composição favorece o uso de elementos visuais de destaque, como imagens, Card-Images, Card-Icons, Gráfico, Selectable Card, Icon Actions, Card Info e Content-Lines. A variedade de estruturas disponíveis possibilita a criação de interfaces ricas, adaptáveis e adequadas a múltiplos cenários de apresentação.
O Card-Image pode ser aplicado em seu formato padrão ou do tipo Product. Podendo ser composto por uma variedade de inputs e elementos visuais disponíveis no componente, de acordo com sua variação.
A imagem e o Card Info podem ser apresentados em formato de carrossel (Slider) ou como exibição simples, com apenas um item.
##### Card Image
O Card-Image pode ser aplicado em seu formato padrão ou na versão Product, podendo incluir diferentes combinações de inputs e elementos visuais conforme a variação selecionada.
Se, ao selecionar o Card-Image, o usuário for direcionado para uma tela que aprofunda detalhes sobre o produto ou serviço:
O título pode atuar como um teaser, estimulando curiosidade sem entregar toda a informação.
O foco deve ser despertar interesse para a etapa seguinte da jornada.
Quando o Card-Image leva diretamente ao fluxo da funcionalidade e se não houver uma tela intermediária com mais informações:
O título e o texto auxiliar devem ser claros e informativos, explicando de forma objetiva o que é o produto/serviço e o que o usuário pode fazer a seguir.
O título do Card-Image:
Pode ter até 3 linhas quando apresentado sem texto auxiliar.
Deve contextualizar rapidamente a oferta e apresentar os principais benefícios de forma direta.
Texto auxiliar do Card-Image
Deve aprofundar a contextualização, indicando como o usuário pode aderir à oferta ou avançar no fluxo.
Evite redundâncias em relação ao título.
Não utilize expressões vagas como “condições incríveis”, “não perca” ou termos sem informação real.
##### Apresentação de conteúdo
A imagem e o Card Info podem ser exibidos em formato de carrossel (Slider) ou em uma apresentação simples, com apenas um item.
A escolha do formato deve considerar a quantidade de conteúdo, o peso visual desejado e o comportamento esperado do usuário.
Para mais informações sobre o uso dos componentes presentes no template, acesse a documentação específica disponibilizada no Design Language System do BB.

### Dicas Importantes

**Ao utilizar o botão primário no Card Info, não aplique um botão primário no Fixed Footer**. A tela deve apresentar apenas um botão primário. Nos casos em que houver botões tanto no Card Info quanto no Fixed Footer, utilize apenas botões secundários no Card Info e mantenha o botão primário no Fixed Footer — ou, alternativamente, mantenha o botão primário no Card Info e não utilize botão primário no Fixed Footer.

**Evite utilizar múltiplos tipos de Content-Lines na mesma seção sempre que possível**. O mesmo vale para variações de uma mesma Content-Line. Por exemplo: se uma seção utiliza Content-Lines do tipo Navigation Line, aplique esse mesmo tipo às demais Content-Lines da seção. Da mesma forma, se uma seção utilizar uma Content-Line com prefixo de ícone, aplique ícones nas outras Content-Lines da mesma seção, ajustando também o prefixo do Divider para o tipo ‘Icon’. Para Content-Lines com variados prefixos, o Divider deve estar com a propriedade Prefix: None.

# Template ListCardDetails

O template ListCardDetails exibe Select Buttons em carrossel que funcionam como filtros para o conteúdo principal, que é formado por um Card-Icon em destaque e seções de listas simples e de navegação.

## Definições gerais

- Nos **Select Buttons**, não são permitidas múltiplas seleções. Apenas um deve estar selecionado.
- O componente **Card-Icon** é obrigatório.
- É necessário ter uma seção de listas com ao menos um item.
- O título das seções de lista é obrigatório, mas o parágrafo é opcional.
- A margem entre o conteúdo do template e o rodapé, seja ele com ou sem botão, é de 32px, token `$size-space-xlarge`.

## UX Writing

Para criar o conteúdo do ListCardDetails, siga as recomendações abaixo:

**Navbar Header** — O texto deve repetir o ponto de acesso (botão ou menu). Se indicar ação, o verbo deve vir no infinitivo e acompanhado por um substantivo.

**Título e texto auxiliar** — Trazem um breve resumo com informações sobre o que a pessoa usuária encontra na tela. Ambos têm no máximo 3 linhas.

A hierarquia das informações pode seguir, preferencialmente, a ordem de leitura sugerida no template com os seguintes componentes:

**Select Button** — Componente destinado a oferecer opções para o usuário. A label deve ser extremamente concisa e deve-se evitar verbos.

**Content Lines** — Limite máximo de 3 linhas, desde que as informações sejam significativas. No template ListCardDetails, o Content Lines traz mais detalhes sobre o produto.

O botão primário é "Avançar" já que a ideia é de continuidade da ação.

---

## Card-Icons

Todos os componentes são opcionais.

Na estrutura de Card-Icons, é possível escolher entre carrossel ou vitrine. Se tiver só 2 itens, a largura é ajustada.

- No carrossel: máximo de 6 itens e mínimo de 2.
- Na vitrine (grid): máximo de 3 linhas e mínimo de 2 itens, sendo possível escolher entre 2 ou 3 colunas. Se a quantidade de itens não completar todas as linhas, é mantido um espaço em branco na última linha.

# Template Grid

É uma vitrine simples de Card Images que podem variar entre os formatos Padrão e Produto.

## Definições gerais

- Para este template, você pode usar **Card Image** (padrão) ou **Card Image Product**.
- Não é recomendado usar tipos de Card Image diferentes na mesma tela.
- **Card Image Product** só está disponível com 2 colunas.
- Na caixa de saldo, é possível usar as cores azul (`$color-text-on-primary`) e vermelho (`$color-text-critical`) para o valor dos rótulos.
- A margem entre o conteúdo do template e o rodapé, seja ele com ou sem botão, é de 32px, token `$size-space-xlarge`.

## UX Writing

Este template pode ser usado para oferta de produtos e serviços. Por se tratar de um momento de venda, é usado o componente **Card Image** nas versões Padrão e Produto. Você pode usar o tom persuasivo e emocional, mas lembre-se de ir direto ao ponto, já que o espaço é restrito.

O Card Image é composto por um título (obrigatório) e por um texto auxiliar (facultativo), com no máximo 2 linhas em ambos.

Se o Card Image levar para uma tela que traga mais informações sobre o produto ou serviço, o título pode ser um teaser (apenas uma chamada que desperte o interesse do usuário). Se a tela seguinte ao Card Image não trouxer mais informações e for direto para o fluxo da funcionalidade, o título e texto auxiliar devem ser o mais informativo possível.

**Título do Card Image** — Se houver apenas o título, este pode ter no máximo 3 linhas. Procure já contextualizar sobre o que é a oferta e apresentar sucintamente os benefícios do produto.

**Texto auxiliar do Card Image** — Aprofunde a contextualização e direcione sobre o que pode ser feito para aderir à oferta. Evite redundância de informações com as que já estão contidas no título e termos vazios como "condições incríveis".

**Botão** — O texto do botão pode ser um Call to Action (CTA) de acordo com o contexto.

---

## Card-Icons

Todos os componentes são opcionais.

Na estrutura de Card-Icons, é possível escolher entre carrossel ou vitrine. Se tiver só 2 itens, a largura é ajustada.

- No carrossel: máximo de 6 itens e mínimo de 2.
- Na vitrine (grid): máximo de 3 linhas e mínimo de 2 itens, sendo possível escolher entre 2 ou 3 colunas. Se a quantidade de itens não completar todas as linhas, é mantido um espaço em branco na última linha.

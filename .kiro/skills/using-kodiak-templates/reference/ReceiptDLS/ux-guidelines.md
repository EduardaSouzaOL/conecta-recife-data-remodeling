# Template Comprovante

O Template Comprovante é utilizado para exibir registros que confirmam que uma transação foi realizada. Ele apresenta informações essenciais de forma clara e organizada. Exibido geralmente após a finalização de uma ação relevante, como uma compra, assinatura de serviço, agendamento ou contratação, permitindo ao usuário visualizar, salvar ou compartilhar conforme necessário.

## Definições gerais

- Para o template Comprovante, a **Navbar Header** deve estar com status Receipt; não é permitido utilizar status diferentes.
- O cabeçalho interno, a seção 1 e o rodapé são obrigatórios.
- O uso do conteúdo de rodapé é obrigatório em comprovantes de transação.
- Este template não aceita as áreas comuns de cabeçalho (Inner Header) e de rodapé (Inner Footer), presentes em alguns templates.
- No **Content Line** não será aceito o uso de navegação, imagem ou ícone.
- O botão fixado no rodapé é obrigatório.
- Quando utilizado o **Info Card**, seu texto não deve ultrapassar duas linhas.
- O campo **QR Code** deve ser ativado apenas quando houver necessidade de uso de QR Code; demais usos não são permitidos.

## Boas práticas

- É recomendado o uso do container com botões de rodapé com ao menos um botão quando este template for utilizado como tela de comprovante para fluxos no App BB.
- É recomendado o uso do título "Comprovante BB" para o cabeçalho interno em fluxos no App BB que utilizam este template como tela de comprovante.

## UX Writing

**NavBar Header** — É criado de acordo com ponto de acesso, respeitando as boas práticas de construção: verbo no infinitivo, máximo de duas palavras (exceto para palavras compostas ou nomes de produto), evitando conjunções, artigos, preposições, barra (/) ou hífen.

**Título do comprovante** — Deve conter o texto "Comprovante BB".

**Valor monetário** — Utilizar o formato brasileiro, utilizando R$ para indicar a moeda e vírgula para separar reais de centavos. Acima da unidade de milhar, deve ser utilizado o "." para separação de valores. Também é necessário colocar espaço após o "R$" ao inserir o valor.

**Data e hora** — Utilizar o formato "dd/mm/aaaa às hh:mm:ss" sem quebra de linha.

**Parágrafo auxiliar** — Deve conter o tipo de pagamento. Se for comprovante Pix, deve obrigatoriamente, segundo as normas do BACEN, vir acompanhado de ícone que indique o status da ação (ex: realizado, agendado).

**Content Line** — A label deve ser concisa e trazer a informação necessária da funcionalidade. Se for uma ação, o verbo deve estar no infinitivo. Não deve ser pontuada e deve ter apenas uma linha de conteúdo.

**Título de seção 1 e 2** — Caso se aplique, a palavra utilizada deverá ser "beneficiário" ou "pagador".

**Título de destaque, Rótulo e Valor** — Devem conter os dados dos envolvidos na transação, como: CPF, agência, conta, instituição, tipo de conta, a chave que foi utilizada (caso se aplique). Os dados sensíveis como o CPF e a chave geralmente aparecem com a máscara que substitui os três primeiros e os últimos dois números. Ex: "***.000.000-**".

**Card Info** — Usado como uma forma de comunicação com a pessoa usuária para oferecer produtos e serviços. Pode ser usado o tom de voz persuasivo e emocional, mas lembre-se de ir direto ao ponto, já que o espaço é restrito. São usadas, no máximo, duas linhas de texto.

**QR Code** — Área opcional utilizada apenas para informações sobre a validação dos dados do comprovante. Deve conter: número do documento, código da autenticação do SISBB e data e hora da notificação em formato "dd/mm/aaaa às hh:mm:ss". Não alterar configurações padrões da Card Container.

**Rodapé** — Obrigatório conter os dados da central de relacionamento do BB nos comprovantes.

**Rodapé (conteúdo adicional)** — Deve ser utilizado apenas quando há necessidade de fornecer informações adicionais ao usuário, seja uma nova funcionalidade, uma atualização, etc. Não deve ultrapassar duas linhas.

## Dicas importantes

Na utilização dos **Content Lines** não será aceito o uso de qualquer tipo de navegação, imagem ou ícone. Portanto, para este componente somente será aceita a utilização de dados alfanuméricos, tais como textos e números. Os comprovantes devem seguir as recomendações, seja para visualizações na tela como para arquivos compartilhados no formato PDF.

É importante que ao ser compartilhado em formato de imagem, o nome do arquivo seja compreensível.

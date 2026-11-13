# Explicação técnica para a banca

Texto para falar da parte técnica do Conecta Recife de forma simples. Fontes: `backend/README.md` e `motor-de-predicao.md`.

## Versão falada (cerca de 2 minutos)

"A gente separou o projeto em três camadas, e cada uma tem uma função só.

As telas ficam no Kodiak e não decidem nada. Elas mostram o que a API manda e levam o cidadão para onde a API mandou. Se amanhã a Prefeitura mudar uma regra, ninguém mexe em tela. Muda na API, e o app inteiro muda junto.

Por trás está uma API em Node, publicada na AWS como função Lambda, com endereço HTTPS fixo. Ela tem dois motores. O primeiro cuida dos dados: quem é o cidadão, o consentimento dele, os pedidos e as etapas. O segundo cuida da recomendação.

A recomendação funciona assim. Antes de qualquer pessoa abrir o app, a gente processa o histórico de uso e aprende três coisas: depois de usar o serviço A, quais serviços as pessoas costumam abrir; quais serviços são mais procurados por gente de perfil parecido; e quais estão em alta nas últimas semanas. As visitas sem login entram nesse aprendizado só como estatística. Nunca ligamos um visitante a um cidadão.

Quando o cidadão entra, a gente junta isso com o perfil dele e com o que ele já usou, e dá uma nota a cada serviço. Quem tem muito histórico pesa mais no que fez antes. Quem tem pouco ou nenhum histórico pesa mais no perfil e em pessoas parecidas, e o app diz isso na tela. Depois a gente cuida da variedade: no máximo 2 serviços do mesmo órgão entre os 5 primeiros, e sempre pelo menos 1 serviço novo.

Cada item sai com o motivo escrito em linguagem simples. A pessoa pode abrir o 'Por que vejo isso?' ou desligar a personalização.

A privacidade foi decidida no servidor. Dados de saúde só entram com consentimento. O de acessibilidade é outro consentimento, separado, e um não libera o outro. Sem consentimento, o servidor nem lê esse dado. O texto na tela nunca cita a condição. E nada de saúde é deduzido do comportamento.

Por fim, o pedido do serviço. Ele anda por etapas, termina em um protocolo fictício e, depois, pede a nota do cidadão. Cada passo vira um evento, e é daí que saem os indicadores de conclusão, abandono e satisfação."

## Resumo para um slide

| Camada | O que faz |
|---|---|
| Telas no Kodiak | Só exibem o que a API devolve. Sem regra de negócio. |
| Motor de dados | Cidadão, consentimento, pedidos por etapas, eventos. |
| Motor de recomendação | Pré-cálculo offline, pontuação por cidadão, diversidade e motivo. |
| Infraestrutura | API em Node na AWS Lambda, URL HTTPS estável. |

## Como a nota de cada serviço é calculada

Seis sinais somam a nota. Os pesos abaixo vêm do código.

| Sinal | Peso | Ideia |
|---|---|---|
| Regras de perfil e momento de vida | 1,0 | Quem é a pessoa e o que costuma precisar |
| Próximo serviço provável | 0,9 × peso do histórico | Quem usou A costuma abrir B |
| Populares entre perfis parecidos | 0,55, cai com mais histórico | Cobre quem tem pouco histórico |
| Serviços em alta | 0,25 | Últimas 4 semanas contra as 8 anteriores |
| Repetição do que já usa | 0,45, só com histórico | Atalhos para o que a pessoa já usa |
| Mais usados no geral | 0,18 | Rede de segurança |

O peso do histórico cresce até 6 acessos. Com poucos acessos, o peso migra para perfil e populares.

## Perguntas que a banca pode fazer

**Por que não usar um modelo de machine learning mais pesado?**
O motor híbrido permite explicar cada sugestão: a pessoa vê o motivo e a banca vê de onde ele vem. Com histórico mediano de 3 cliques, um modelo pesado teria pouco sinal para aprender.

**O que acontece com quem não tem histórico?**
O app usa perfil e momento de vida, mais os serviços populares entre pessoas parecidas, e avisa que a base é o perfil. Os 5.778 cidadãos nessa situação também têm sugestões no `recomendacoes.csv`.

**Como evitam sugerir o que o cidadão já usa?**
O arquivo de recomendações exclui serviços já usados, porque não contam como acerto. Na Home, a regra permite no máximo 1 repetição.

**Como garantem que saúde não vaza?**
O servidor filtra antes de calcular. Sem consentimento, o campo não é lido. O motivo exibido é genérico e não cita a condição.

**Isso escala para outros serviços?**
O critério de entrada no card é objetivo: natureza Agendamento ou Peticionador, `passos` preenchidos e maturidade digital de 2 ou mais. Novos serviços entram por configuração.

## O que não afirmar

- **Acurácia.** O `backtest.js` existe e mede o acerto do primeiro serviço novo nas 10 sugestões (treino até 31/08, teste em setembro). Ele não foi executado, então não há número para citar.
- **Um único motor.** A Home e o `recomendacoes.csv` usam lógicas diferentes. O arquivo é otimizado para acertar o primeiro serviço novo. Se perguntarem, explique isso.
- **Persistência do estado.** O README fala em arquivo temporário da Lambda, e um commit recente fala em estado compartilhado no S3. Não afirme persistência permanente sem confirmar. Para a demo, use `POST /demo/reiniciar`.
- **Limitações assumidas.** Pesos e janelas de calendário estão fixos no código. Prazos e etapas do pedido são simulados.

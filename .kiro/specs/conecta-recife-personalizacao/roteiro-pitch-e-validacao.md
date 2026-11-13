# Roteiro do pitch e validação do protótipo

Desafio 1: Conecta Recife. Inovação da jornada com experiência personalizada.
Data da validação: 13/11/2026. Dados 100% fictícios.

---

## 1. Contexto em uma frase

O Conecta Recife reúne mais de 800 serviços, mas a vitrine é igual para todos. Nossa solução entrega uma Home que muda conforme o perfil, o histórico e o momento de vida, com motivo em cada item, controle do cidadão e acompanhamento do pedido por etapas.

## 2. O problema (peso 15)

- A mediana é de 3 cliques por pessoa no histórico.
- 5.778 cidadãos não têm histórico nenhum.
- Há 3,5 milhões de cliques de visitas sem login.
- 285 serviços nunca aparecem no histórico, então não seriam sugeridos só por popularidade.

## 3. O que foi construído

| Frente | Funcionalidades | O que entrega |
|---|---|---|
| A. Home personalizada | 1, 2 e 6 | Blocos: Seus atalhos, Recomendados, Acompanhamento. Motivo e "Por que vejo isso?" em cada item. Opção de desligar a personalização. |
| C. Serviços solicitados | 4 e 7 | Card por etapas nos serviços 942 (consultas) e 352 (Cadastro Único). Comprovante com protocolo fictício, relatar problema, cancelar, alterar e avaliar. |

Fora do escopo, de propósito: chat, envio de solicitações reais, CPF, nome ou endereço, e inferir saúde pelo comportamento.

## 4. Roteiro sugerido (cerca de 5 minutos)

| # | Momento | O que mostrar | Critério (peso) |
|---|---|---|---|
| 1 | Dor | Números da seção 2 e por que só A e C | Problema e priorização (15) |
| 2 | Lado a lado | Home sem login (`visitante`) e Home logada | Relevância (20) |
| 3 | Duas personas | C006566 (gestante, Cadastro Único) e C062244 (70 anos, crônico). Peça ao jurado um `cidadao_id` e mostre um sem histórico | Relevância (20) |
| 4 | Antecipação | Próximo passo, época do ano e serviço novo | Antecipação (15) |
| 5 | Pedido de ponta a ponta | Criar, preencher, confirmar, protocolo e nota. Use `DEMO001` e `POST /demo/jornadas/J-DEMO0001/avancar` | Conclusão (15) |
| 6 | Controle | "Por que vejo isso?", desligar a personalização, consentimento de saúde e de acessibilidade | Transparência (10) |
| 7 | Medição | `/dados/metricas`: conclusão, abandono por etapa, nota média (valores simulados) | Medição (5) |
| 8 | Viabilidade | Regra no servidor, escala por configuração | Execução (10) |

Acessibilidade (10) atravessa tudo: linguagem simples, contraste, área de toque e rótulos para leitor de tela.

## 5. Argumentos fortes

- **Regra no servidor.** As telas do Kodiak só mostram o que a API devolve. Mudar uma regra não exige editar tela, então a solução pode evoluir no app real.
- **Privacidade por desenho.** Saúde e acessibilidade têm consentimentos independentes (LGPD, art. 11). O título nunca cita a condição e nada é inferido do comportamento.
- **Cobertura total.** O `recomendacoes.csv` cobre os 89.046 cidadãos, inclusive os 5.778 sem histórico, sem repetir serviço já usado.
- **Honestidade sobre o escopo.** Dois serviços de jornada, sem chat, tudo simulado e sinalizado como simulação.
- **Escala.** Entra novo serviço só por configuração, com natureza Agendamento ou Peticionador, `passos` preenchidos e maturidade digital de 2 ou mais.

## 6. O que evitar dizer

- Que as notas estimadas (78 para a Home e 76 para Serviços solicitados) são resultado de avaliação. São estimativas internas.
- Qualquer número de acurácia, enquanto o `backtest.js` não for rodado.
- Que existem nichos e filtros nos atalhos, enquanto o teste correspondente falha.
- "Funciona para qualquer cidadão", sem testar alguns IDs aleatórios antes.

---

## 7. Resultado da validação

### O que passou

| Verificação | Resultado |
|---|---|
| API pública: 8 personas, DEMO001 e visitante | Todas responderam 200 em menos de 0,3 s |
| Cidadão inexistente (C999999) | 404 com mensagem clara e a faixa de códigos válidos |
| `recomendacoes.csv`, tamanho | 890.460 linhas e 89.046 cidadãos, sem faltar nem sobrar ninguém |
| `recomendacoes.csv`, regras | No máximo 10 por pessoa, posições de 1 a 10, `servico_id` todos válidos, sem repetição, sem motivo vazio |
| Foco em serviço novo | 0 sugestões de serviço já usado |
| Cidadãos sem histórico | Os 5.778 têm sugestões |
| Testes do backend | 334 de 336 passam |
| Itens da Home das 8 personas | Todos com motivo e com ação |
| Cadastro Único e Bolsa Família | Nenhum "Inscrever-se" nem "Receber o Bolsa Família" apareceu |

### Problemas encontrados

| # | Problema | Impacto | Ação sugerida |
|---|---|---|---|
| 1 | 2 testes falham em `nichos.test.js` (C059592 e C007938). O teste espera `nichos[]` e `filtros[]` nos atalhos, e a Home pública não traz. O arquivo diz que o teste deve falhar no código atual. | Funcionalidade possivelmente inacabada ou teste velho | Terminar a funcionalidade ou remover o teste |
| 2 | Serviço novo "Pessoas como você também usam" não apareceu para C059592, C062244, C039227 e C076260. A contagem foi por busca de texto e pode errar se o motivo tiver outra redação. | Pode quebrar o requisito 2.14 e pesa em Antecipação (15) | Conferir a redação do motivo e garantir 1 serviço novo por Home |
| 3 | O convite de acessibilidade diz "você é pessoa com deficiência, que já consta no seu cadastro". O texto é igual para todos, mas é falso para a maioria. | Linguagem estranha e pode confundir | Trocar por texto neutro, por exemplo "Se você ou alguém da sua família tem alguma deficiência, podemos mostrar serviços de apoio" |
| 4 | Há alterações sem commit: `pontuacao.js`, o golden de adaptadores, `backtest.js`, `gerar-recomendacoes.js` e `ranking-arquivo.js`. | A Lambda publicada pode diferir do código local | Publicar de novo e repetir a validação |

### O que não foi verificado

- Se o `recomendacoes.csv` respeita saúde sem consentimento. Só o formato foi validado.
- A taxa de acerto real. O `backtest.js` não foi executado.
- O fluxo de ponta a ponta dos pedidos (criar, preencher, confirmar, avaliar) e as telas no Kodiak.
- A Home dos 89.046 cidadãos. Foram testadas 8 personas e o DEMO001.

## 8. Checklist antes de apresentar

- [ ] Decidir sobre os nichos (terminar ou remover o teste) e rodar `node --test` até zerar as falhas.
- [ ] Garantir 1 serviço novo por Home e conferir o motivo exibido.
- [ ] Trocar o texto do convite de acessibilidade.
- [ ] Publicar a Lambda e repetir a validação na API pública.
- [ ] Rodar `backtest.js` antes de citar qualquer número.
- [ ] Testar 5 `cidadao_id` aleatórios, incluindo um sem histórico.
- [ ] Rodar `POST /demo/reiniciar` antes da demonstração.
- [ ] Ensaiar o pedido de ponta a ponta nas telas do Kodiak.
- [ ] Confirmar a liberação do backend pela equipe Kodiak.
- [ ] Apagar os dados ao fim do evento, conforme o guia.

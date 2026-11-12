---
inclusion: auto
name: kodiak-api-e-telas
description: Consumo de APIs no Kodiak, requisições, variáveis por ambiente, tratamento de erros, templates disponíveis e como mapear as telas da solução. Use ao desenhar a API, as telas do Kodiak ou o fluxo de chamadas.
---
# Kodiak: API e telas

Detalhes completos:

#[[file:docs/kodiak-referencia.md]]

## Regras para a API
- A chamada é feita pela plataforma Kodiak (no fluxo), não pelo front-end do protótipo.
- O backend só é consumido depois da liberação pela equipe Kodiak. A API precisa de URL pública, estável e HTTPS.
- Use variáveis no endereço (`#server{meu_backend}/...` ou `#partner{...}`), nunca URL fixa.
- Requisições de uma mesma tela rodam em paralelo e sem ordem; para chamadas dependentes, use Switch.
- Acesso ao retorno: `${alias.response.campo}`. Erros: marcar tratamento customizado e usar `${alias.response.error}` e `${alias.response.info}`.
- Headers extras não são configuráveis pela interface.
- Dados sensíveis: marcar "Proteger informações sensíveis" nas requisições com `cidadao_id`, saúde ou consentimento.

## Sugestão de templates por tela (confirmar na skill `using-kodiak-templates`)
| Tela | Template candidato |
|---|---|
| Home personalizada e Home simplificada | Central2 ou Central (widgets) |
| Card "Serviços solicitados" e linha do tempo | Tracking |
| Jornada do agendamento (campos) | Formulário (Form) |
| Escolha de unidade, data e hora | Item Picker |
| Comprovante com protocolo fictício | Comprovante (Receipt) |
| Pedido de consentimento e "Por que vejo isso?" | Intro ou Texto, com Bottom Sheet |
| Relatar problema | Formulário |
| Confirmação, erro e alertas | Intro |

## Ao criar telas no Kodiak
- Siga o `AGENTS.md`: consultar o formato do template antes de montar, validar antes de criar e nunca usar nomes técnicos ao falar com o usuário.
- Nomes (projeto, serviço, tela, entrada) em kebab-case.
- Rascunhos em `~/.plk-astro/temp/`; apague após criar.
- O servidor MCP precisa do Kodiak aberto no navegador, com a bolinha do Astro clicada (porta 4097).
- Neste ambiente existem `jq`, `node` e `npx`. O `ajv` não está instalado: use `npx -y ajv-cli` com `--strict=false`.

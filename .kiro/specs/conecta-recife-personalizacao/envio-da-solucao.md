# Envio da solução (conforme o Guia dos dados)

Desafio 1: Conecta Recife. Preparado em 13/11/2026. Dados 100% fictícios.

O guia pede três entregas: protótipo funcional no celular, apresentação curta e, opcional, `recomendacoes.csv`.

## 1. Protótipo funcional no celular

| Exigência do guia | Como atendemos | Situação |
|---|---|---|
| Escolher um cidadão de `cidadaos.csv` ("entrar como") | Tela de login do Kodiak com campo `cidadao_id` e atalhos das 8 personas | Pronto |
| Mostrar os serviços certos e dizer por que cada um aparece | Home em blocos, motivo e "Por que vejo isso?" em cada item | Pronto |
| Levar à conclusão de pelo menos um serviço | Pedido 942 ou 352 por toque, comprovante com protocolo fictício e avaliação | Pronto |
| Funcionar para qualquer `cidadao_id`, inclusive sem histórico | Home por perfil e populares de perfis parecidos | Pronto |
| Sem login | Home simplificada (código `visitante`) | Pronto |

- API pública (HTTPS): `https://fuachbxhktf63uqhhvy3xdrdo40pkqhd.lambda-url.us-east-1.on.aws` (respondeu 200 em 13/11/2026). Rotas em `API.md`.
- Antes de apresentar: `POST /demo/reiniciar` para voltar a demo ao estado inicial.
- Testes do backend: 334 de 336 passam. Os 2 que falham (`test/nichos.test.js`, C059592 e C007938) esperam filtros por nicho em "Seus atalhos", que deixaram de vir quando a Home dessas personas passou a ser definida pela equipe. Decidir se o teste fica desatualizado ou se o comportamento volta.

## 2. Apresentação curta

Roteiro em `roteiro-pitch-e-validacao.md`. Conferir que ela traz o que o guia pede:

- [ ] Dores escolhidas e por que (Problema e priorização, 15)
- [ ] Decisões tomadas e o que ficou de fora de propósito (chat, envio real, CPF, inferir saúde)
- [ ] Dois cidadãos lado a lado (sugestão: C076260 mãe com criança e C062244 senhor de 70 anos), mais sem login e com login
- [ ] Consentimento de saúde e de acessibilidade: pedir, recusar, revogar
- [ ] Como mediria: conclusão, abandono por etapa, satisfação (eventos e avaliação final)
- [ ] Abrir um `cidadao_id` pedido pelos jurados, inclusive um sem histórico

## 3. `recomendacoes.csv` (opcional)

Arquivo pronto em `entrega/recomendacoes.csv` (73 MB) e compactado em `entrega/recomendacoes.zip` (3,2 MB). Gerado por `backend/scripts/gerar-recomendacoes.js`.

| Regra do guia | Resultado da validação |
|---|---|
| Nome `recomendacoes.csv`, UTF-8 sem BOM, vírgula, cabeçalho | Ok (`cidadao_id,posicao,servico_id,motivo`), quebra de linha LF |
| Todos os 89.046 cidadãos, inclusive sem histórico | Ok: 89.046, conjunto idêntico ao de `cidadaos.csv` |
| Sem visitantes | Ok |
| Até 10 sugestões, `posicao` de 1 a 10, sem repetir | Ok: 10 por cidadão, 890.460 linhas |
| `servico_id` existe em `servicos.csv` | Ok: 0 inválidos |
| Não sugerir serviço já usado (não conta como acerto) | Ok: o ranqueador exclui os já usados |
| Motivo sem dado de saúde | Ok: usa só faixa etária, sexo, Cadastro Único e pet |

SHA-256 do CSV: `cf6c95a6dcbc7ec17a8a1d77aee07d0f134c1c66a141111cf04600c19a80161b`

Ponto de atenção: o motivo é o mesmo texto em todas as linhas ("Pessoas com um perfil parecido com o seu também usam este serviço."). É válido, mas quando a sugestão vem do próximo passo após um serviço usado, o texto poderia dizer isso.

## 4. Antes de enviar

- [ ] Enviar um único arquivo por equipe (CSV ou ZIP, conforme o canal da organização aceitar)
- [ ] Não incluir a pasta `BD/` nem dados originais no envio
- [ ] Apagar os dados do hackathon ao fim do evento (`BD/`, `backend/data/`, `entrega/`)

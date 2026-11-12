---
inclusion: always
---
# Escopo da solução (Conecta Recife)

Três frentes, construídas nesta ordem: **A. Home personalizada**, **C. Serviços solicitados**, **B. Voz (Broto)**.

- Perfis: logado com dados (inovação), logado com pouco histórico (mesma tela, sugestões menos precisas) e sem login (Home simplificada: menos blocos e texto, mais usados primeiro, busca e atalhos de 1 toque).
- Home em blocos: Seus atalhos, Recomendados (Continue seu pedido, Para sua família, Seus direitos, Quem é como você também usa, Nesta época do ano, Para não esquecer, Cuidar de você, Você e seu pet, Salvos, Próximo passo dentro do serviço) e Acompanhamento.
- Todo item tem motivo e "Por que vejo isso?", com opção de desligar a personalização.
- Saúde só com consentimento, sem citar a condição no título. Pet não precisa de consentimento.
- Serviços solicitados em 2 serviços (942 e Agendar atendimento no Cadastro Único); relatar problema, cancelar e alterar simulados; sem chat; avaliação final.
- Voz: nunca pede CPF, nome completo real ou endereço; todo comando tem equivalente por toque; sempre confirma antes de enviar; não guarda áudio.
- Dados 100% fictícios; nunca enviar solicitações reais.

## Onde estão os detalhes
Antes de planejar ou implementar, consulte:

#[[file:.kiro/specs/conecta-recife-personalizacao/requirements.md]]

#[[file:.kiro/specs/conecta-recife-personalizacao/perfis-de-usuario.md]]

#[[file:docs/escopo-agente-e-dados.md]]

## Regras de trabalho
- Documentos criados pelo agente ficam em `.kiro/specs/conecta-recife-personalizacao/`, não em `docs/`.
- O spec avança por etapas: requisitos, design, tarefas. Só avance após a aprovação do usuário.
- Pendências conhecidas: item 8.7 do edital (plataforma), detalhes de "Liberação de backends", variáveis por ambiente e tratamento de erro customizado do Kodiak, `passos` dos 2 serviços de jornada e tratamento de `situacao_renda` e `criancas_na_familia` vazios.

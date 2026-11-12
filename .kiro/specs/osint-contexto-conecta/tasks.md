# Implementation Plan

- [ ] 1. Diagnóstico da implementação atual (somente leitura)
  - Inspecionar o projeto e produzir o relatório: stack, modelo de dados, representação de bairro/RPA, idade, criancas_na_familia, saúde e "aceita avisos", lógica de recomendação, saída, carga de dados, testes e estado.
  - Listar dúvidas e esperar minha aprovação antes de continuar.
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Normalizador de bairro e tabela-ponte bairro↔RPA
  - Implementar a função de normalização e carregar bairro↔RPA (dataset "Área urbana" ou a lista de RPA 5 e 6 do design).
  - Testes unitários com acentos e "de/da".
  - _Requirements: 2.2, 2.3_

- [ ] 3. Tabela `contexto_territorial`
  - [ ] 3.1 Criar a tabela/seed com qtd_escolas por RPA (dataset "Matrículas na rede municipal") e qtd_unidades_saude por bairro.
  - [ ] 3.2 Ligar `cidadaos` ao contexto, com fallback para a RPA.
  - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [ ] 4. Tabelas `gatilho_ciclo_vida` e `servico_enriquecido`
  - Criar as tabelas e popular com os fatos verificados do design, `verificado = false` para os demais.
  - _Requirements: 3.1, 4.1, 4.2, 4.3_

- [ ] 5. Avaliador de gatilhos
  - Implementar os gatilhos dos Requirements 3.3 a 3.9, recebendo a data atual como parâmetro.
  - Testes unitários com datas dentro e fora das janelas.
  - _Requirements: 3.2–3.9_

- [ ] 6. Pontuador com elegibilidade universal
  - Score configurável; contexto só ordena; serviço elegível nunca é removido.
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. Cold start
  - Sugestões por gatilho de idade/calendário e contexto do bairro quando não há histórico.
  - _Requirements: 8.1, 8.2_

- [ ] 8. Explicabilidade e controle do cidadão
  - [ ] 8.1 Gerar "Por que estou vendo isso?" sem expor condição de saúde.
  - [ ] 8.2 Implementar "Não me interessa" e "Não usar meus dados para sugestões".
  - _Requirements: 6.1, 6.2, 6.3, 7.1_

- [ ] 9. Privacidade
  - Garantir flag de elegibilidade em vez de diagnóstico, "aceita avisos" só como canal, e documentar a base legal presumida como hipótese.
  - Teste: nenhuma condição de saúde aparece em texto de card ou notificação.
  - _Requirements: 7.1–7.5_

- [ ] 10. Testes de aceite com personas
  - C076260, C062244 e um cidadão novo, conforme o Requirement 9.
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 11. Revisão final
  - Rodar todos os testes, listar o que ficou `nao_verificado` e preparar 3 a 4 frases de pitch.
  - _Requirements: 4.3, 9.1–9.3_

# Perfis de usuário e funcionalidades

Desafio 1: Conecta Recife. Inovação da jornada com experiência personalizada.

## Dois perfis de usuário

- **Logado, com dados:** é onde está a inovação (A e C).
- **Sem login:** arquitetura da informação e ajustes de UX/UI. Menos blocos e menos texto, os serviços mais usados primeiro, busca e atalhos de 1 toque.
- **Logado com pouco histórico:** usa a mesma tela do logado, só com sugestões menos precisas.
- **Isso atende ao guia**, que exige funcionar para quem tem pouco ou nenhum histórico.
- **Na demo**, mostre o antes e o depois do login lado a lado.
- **Jornada simplificada (funcionalidade 3) e acessibilidade (funcionalidade 5)** são atendidas por toque: telas puladas quando o dado vem do perfil, linguagem simples, contraste, área de toque e rótulos para leitor de tela.

---

## A. Home personalizada (funcionalidades 1 e 2)

### O que é

Home em blocos para quem está logado, com poucos itens e o motivo de cada um.

- **Seus atalhos:** o que a pessoa mais usa, fixo.
- **Recomendados:** pelo perfil (família, direitos, saúde, pet).
- **Acompanhamento:** o card "Serviços solicitados", que é o mesmo da C.

O que muda de pessoa para pessoa:

- A mãe vê a Caderneta da criança e o Mãe Coruja.
- O senhor de 70 anos vê medicamentos, atendimento de diabetes e hipertensão, e pets.

### Blocos e sugestões da home

- **Continue seu pedido:** o que ela começou e não terminou.
- **Para sua família:** pelos marcadores do perfil.
- **Seus direitos:** "pode ter direito a".
- **Quem é como você também usa:** o próximo passo comportamental.
- **Nesta época do ano:** pela sazonalidade do uso semanal.
- **Para não esquecer:** prazos simulados.
- **Cuidar de você:** saúde, só com consentimento.
- **Você e seu pet:** tutor de animal, que não precisa de consentimento.
- **Salvos:** favoritos da pessoa.
- **Próximo passo dentro do serviço:** ao concluir X, sugerir Y.

### Mudanças indicadas

- Acrescentar 1 serviço **novo** com o motivo "Pessoas como você também usam". Sem isso a home só olha para trás e perde pontos de Antecipação (15).
- Etiqueta de motivo em cada item e "Por que vejo isso?" com opção de desligar. Cobre a funcionalidade 6 (10 pontos), que hoje nenhuma das três aplicáveis cobre.
- Blocos de saúde só com consentimento, e sem citar a condição no título da home.
- Persona 1: tirar "Inscrever-se no Cadastro Único" e "Receber o Bolsa Família", porque ela já tem os dois. O Bolsa Família vira status, e entram atualizar cadastro ou agendar atendimento.
- Conferir no catálogo a faixa de idade da Caderneta e do Mãe Coruja, e o que é o "Programa embarque digital".

**Nota estimada:** 62 como está, 78 com os ajustes.

---

## C. Serviços solicitados (funcionalidades 4 e 7)

### O que é

- Card fixo na home, estilo iFood, com as etapas, em que etapa o pedido está e o que falta para avançar.
- Em cada etapa: relatar problema, cancelar ou alterar.
- No fim, o comprovante e a pessoa classifica o serviço ou diz que não conseguiu.
- **Só em 2 serviços**, porque dos 800 só alguns têm etapas bem documentadas.

### Como argumentar no pitch

- A ideia começa pelos serviços que já têm jornada completa, como o agendamento.
- Critério para entrar: natureza Agendamento ou Peticionador, `passos` preenchidos e maturidade digital >= 2. Assim ela escala para os outros conforme forem documentados.

### Serviços indicados (conferir `passos` no catálogo)

- "Agendar consultas e procedimentos" (942), que a persona 1 usa muito.
- "Agendar atendimento no Cadastro Único", que serve às duas personas.

### Mudanças indicadas

- "Relatar problema" em formulário curto, mais os canais que a Carta já tem. **Chat está fora do escopo**; com chat a nota cai para 60.
- "Cancelar" e "alterar" como botões simulados que mudam o status. Alterar só no serviço da jornada.
- A avaliação final já é a medição (5 pontos). Cada clique vira um evento: etapa concluída, abandono, problema relatado, nota.

**Nota estimada:** 76.

---

## Ordem de construção

1. **A** primeiro.
2. **C** depois.

## Resumo das notas estimadas

| Item | Funcionalidades | Nota estimada |
|---|---|---|
| A. Home personalizada | 1 e 2 | 62 (atual), 78 (com ajustes) |
| C. Serviços solicitados | 4 e 7 | 76 |

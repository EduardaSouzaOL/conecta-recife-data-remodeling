---
inclusion: always
---

# HACKA/TS 2026: Desafio do projeto

## 8. Desafios

8.1 O HACKA/TS 2026 reunirá desafios de negócio da BBTS e de parceiros, que consistem no desenvolvimento de soluções digitais voltadas à resolução de problemas reais. Cada equipe deverá escolher um dos desafios disponibilizados. O escopo de cada desafio será detalhado no Onboarding somente para as equipes selecionadas para a etapa presencial.

### 8.1.1 Desafio 1: Aplicativo Conecta Recife - Inovação da Jornada do Usuário com Experiência Personalizada

- **Contexto:** O Conecta Recife é o aplicativo da Prefeitura do Recife que reúne, em um único login, diversos serviços, além de já oferecer experiências baseadas no comportamento de uso dos cidadãos.
- **Desafio:** "Como podemos inovar a jornada dos usuários e proporcionar aos cidadãos recifenses uma experiência mais personalizada, intuitiva e eficiente na utilização dos serviços do aplicativo Conecta Recife?"
- **Observação:** Para este desafio, a plataforma a ser utilizada para o desenvolvimento está descrita no item 8.7 (ainda não recebido; pedir ao usuário).

## Contexto do projeto

- Dados em `BD/` (cidadaos, historico, servicos, uso_semanal, visitas_sem_login), conforme o "Guia dos dados" do Hackathon Conecta Recife.
- Dados de saúde só personalizam com consentimento (LGPD art. 11). Use apenas dados fictícios no protótipo.
- A API será usada pelo Kodiak e também para métodos preditivos (próximo serviço e previsão de demanda), usando histórico com e sem login.

## Kodiak (plataforma de desenvolvimento)

- A chamada à API é feita pela própria plataforma Kodiak, dentro do fluxo (não pelo front-end do protótipo).
- A configuração da requisição envolve: forma de configurar a requisição, tratamento de erros e variáveis por ambiente.
- O backend precisa ser liberado pela equipe de suporte Kodiak antes do consumo ("Liberação de backends"). Nossa API deve estar acessível publicamente (URL estável, HTTPS) para essa liberação.
- Texto recebido está incompleto (faltam os detalhes de configuração, erros e variáveis). Pedir ao usuário o restante e o item 8.7.

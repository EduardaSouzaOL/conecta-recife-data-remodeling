# Regra de ouro: as telas do Kodiak não decidem nada

Toda decisão de negócio fica na API. A tela só mostra o que a API devolveu e leva o cidadão para onde a API mandou.

## O que a API sempre devolve pronto
- **Textos prontos:** título, subtítulo, etiqueta, motivo, "Por que vejo isso?", rótulo de botão e rótulo para leitor de tela. A tela não monta frase, não formata data e não junta texto.
- **Destino pronto:** todo item tocável traz `acao` (`tipo` e parâmetros). A tela não escolhe o destino por expressão.
- **Lista pronta:** a ordem, o limite de itens e a ausência de blocos vazios vêm da API. Bloco sem item não é enviado.
- **Privacidade resolvida:** consentimento, saúde e acessibilidade são aplicados no servidor. A tela nunca lê marcadores do perfil para decidir o que mostrar.
- **Fluxo pronto:** em um pedido, a API diz qual é a próxima tela e se pode confirmar. A tela não conta etapas nem valida campos.
- **Erro pronto:** validação que o cidadão pode corrigir volta com 200, `ok: false` e `erros[]` com texto simples. Erro HTTP é só para falha técnica e leva à tela de erro customizada.
- **Eventos pelo servidor:** a API registra o que consegue (item exibido, etapa concluída). A tela só envia o que só ela sabe (por exemplo, o toque em "Por que vejo isso?").

## O que a tela pode fazer
- Repetir uma lista que veio da API e exibir cada campo como está.
- Enviar o que o cidadão digitou ou escolheu, sem alterar.
- Passar o `cidadao_id` entre telas.
- Trocar de tela segundo a `acao` recebida (Switch simples sobre o `tipo`, sem regra).

## O que a tela não pode fazer
- Expressão com `if`, comparação, soma, filtro, ordenação ou formatação de negócio.
- Decidir se um bloco, botão ou aviso aparece com base em dados do perfil.
- Interpretar status, prazos, notas ou consentimento.
- Guardar estado de negócio (a API guarda).

## Teste rápido
Se mudar uma regra exigir editar uma tela do Kodiak, a regra está no lugar errado. Mude a API.

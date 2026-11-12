# screenParams

Definições visuais globais da tela. Atualmente o único campo aceito é `style`, com um único valor `dlsdefault`. Existe para extensão futura.

## ⚠️ REGRA OBRIGATÓRIA

> **Sempre inclua `screenParams` com `style: "dlsdefault"` em toda tela do tipo visual (template DLS).** Nunca omita esse campo em telas visuais, mesmo que a tela original não o contenha ou que o schema indique que é opcional.
>
> **Exceção:** templates lógicos (como Switch, PerformAction e similares, que não apresentam UI) **não devem** conter `screenParams`.

```json
"screenParams": {
  "style": "dlsdefault"
}
```


## Estrutura

| Campo | Tipo | Descrição |
|---|---|---|
| `style` | enum `dlsdefault` | Estilo visual da tela. **Obrigatório na prática.** Sempre use `"dlsdefault"`. |

# 0006. Handler global: On Error Continue para 4xx, On Error Propagate para 5xx

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

O scaffold do APIkit usa On Error Propagate para tudo. Isso marca recusas de negócio (aula lotada, pagamento recusado) como falha do evento, poluindo métricas de erro e alertas com coisas que são respostas esperadas. Ao mesmo tempo, falhas técnicas precisam aparecer como falha.

## Decisão

Cada aplicação tem `global-error-handler` como `defaultErrorHandler-ref`:

- **On Error Continue** para erros do cliente (`APIKIT:*`) e recusas de negócio (`STUDIO:NOT_FOUND`, `ENROLLMENT:CLASS_FULL`...). O evento termina com sucesso e o listener devolve `vars.httpStatus` (4xx) com o corpo de erro.
- **On Error Propagate** para indisponibilidade (`MULE:RETRY_EXHAUSTED`, `HTTP:CONNECTIVITY`, `*:UNAVAILABLE`), para anomalias que exigem atenção (`ENROLLMENT:RESERVATION_EXPIRED`) e para `ANY` (500).
- O mapeamento tipo de erro -> status, código e mensagem fica num módulo DataWeave (`modules/ApiErrors.dwl`), testado em MUnit. 5xx não expõem detalhes internos.
- On Error Continue local (try ou flow privado) onde a degradação é decisão de negócio: cancelamento idempotente no estúdio, compensação e ERP best-effort na Process API.

## Consequências

- Métricas de falha do runtime refletem falhas técnicas, não comportamento normal do negócio.
- Um teste de governança garante que todo erro lançado está no catálogo e que o último handler é `ANY`.
- Quem lê o código precisa entender que Continue não significa "ignorar": o status 4xx continua sendo devolvido.

## Alternativas consideradas

- **Propagate para tudo (padrão do APIkit):** mais simples, métricas ruidosas.
- **Validar 4xx sem erro (choice em todo flow):** evita exceções, mas espalha o mapeamento de erros por todos os flows.

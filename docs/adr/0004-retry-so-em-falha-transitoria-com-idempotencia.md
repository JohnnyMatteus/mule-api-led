# 0004. Retry só em falha transitória, em uma camada por vez, e com idempotência

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

Os backends (SaaS de estúdios, processador, FinERP) têm instabilidades curtas. `until-successful` repete qualquer erro do bloco por padrão. Repetir um 4xx não muda o resultado; repetir uma escrita sem idempotência pode cobrar duas vezes; e repetir em todas as camadas multiplica as tentativas (3 camadas x 4 tentativas = 64 chamadas ao backend no pior caso).

## Decisão

- **System APIs:** `until-successful` em volta de toda chamada ao backend, com `success-status-code-validator` aceitando 2xx e 4xx. Só 5xx, timeout e falha de conexão disparam retry (3 retries, intervalo por backend). 4xx é traduzido depois do loop em erro de negócio.
- **Process e Experience APIs:** validador aceita 200..599. Só repetem quando a camada de baixo **não respondeu** (conexão/timeout), com menos tentativas (2 e 1). Um 503 da camada de baixo significa que ela já esgotou o próprio retry: vira `<SISTEMA>:UNAVAILABLE` sem repetir.
- **Toda escrita leva `Idempotency-Key`** (regra do ruleset). A Process API deriva uma chave por etapa a partir da chave do cliente (`chave:reserve`, `chave:charge`, `chave:confirm`, `chave:receivable`), e o cliente pode repetir a requisição inteira com a mesma chave.

## Consequências

- Retry seguro: repetir não duplica reserva, cobrança nem título (o processador e o estúdio deduplicam pela chave; o ERP pela referência).
- Pior caso limitado: 4 chamadas ao backend por tentativa da System API.
- A chave do cliente é limitada a 48 caracteres para caber no limite de 64 das System APIs com o sufixo da etapa.
- `until-successful` usa intervalo fixo, sem backoff exponencial nem jitter. Para o volume do exemplo é suficiente; o próximo passo é circuit breaker e backoff (ver plano de evolução).

## Alternativas consideradas

- **Retry só na borda (Experience):** o cliente esperaria mais e cada retry refaria a orquestração inteira.
- **Política de retry do API Manager / gateway:** não distingue 4xx de negócio de 5xx técnico tão bem quanto o fluxo.
- **Reconnection strategy do conector HTTP:** cobre só falha de conexão, não 5xx.

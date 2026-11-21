# Roteiro: resiliência (retry, idempotência e correlação)

## A solução

- `until-successful` em volta de toda chamada HTTP de saída, verificado por teste de governança.
- Nas System APIs, o `success-status-code-validator` aceita 2xx e 4xx: só 5xx, timeout e conexão disparam retry. O 4xx é traduzido depois do loop.
- Nas camadas de cima, o validador aceita 200..599: só se repete quando a camada de baixo não respondeu. Um 503 de baixo significa "eu já tentei".
- Todo POST exige `Idempotency-Key` (regra Spectral). A Process API deriva uma chave por etapa.
- `X-Correlation-ID` entra pelo listener, sai por todos os requesters (`sendCorrelationId="ALWAYS"`) e volta em toda resposta e em todo corpo de erro.

## Números

| Camada | Retries | Intervalo | Dispara em |
| --- | --- | --- | --- |
| System | 3 | 500 ms a 1 s (por backend) | 5xx, timeout, conexão |
| Process | 2 | 300 ms | timeout, conexão |
| Experience | 1 | 300 ms | timeout, conexão |

Pior caso por requisição do app num backend fora do ar: 4 chamadas ao backend por tentativa da System API. Sem a regra "um 503 não é repetido em cima", seriam 2 x 3 x 4 = 24.

## Trade-offs

- Intervalo fixo, sem backoff exponencial nem jitter: `until-successful` não oferece; para volume baixo é suficiente. Em escala, circuit breaker e backoff (próximo passo).
- Timeouts precisam crescer de baixo para cima (backend 5 a 10 s, Process 15 s, Experience 30 s); senão a camada de cima desiste enquanto a de baixo ainda está tentando, e o retry de cima vira trabalho duplicado.
- A chave do cliente tem no máximo 48 caracteres para caber no limite de 64 com o sufixo da etapa.

## Perguntas que um entrevistador faria

**Por que não repetir 4xx?**
Porque o resultado não muda: um cartão recusado ou um payload inválido continua igual na quarta tentativa, e você só aumenta a carga e a latência.

**Repetir um POST de cobrança não é perigoso?**
Seria, sem idempotência. Toda escrita leva `Idempotency-Key` e o processador devolve a mesma cobrança para a mesma chave. O ruleset impede que alguém crie um POST sem a chave.

**E se o timeout acontecer depois que o backend processou?**
É o caso clássico. Com idempotência, o retry recebe o resultado já processado. Sem idempotência, você duplica. Por isso a política de retry e a de idempotência são uma decisão só.

**Como você correlaciona uma matrícula nos logs das cinco aplicações?**
Pelo `X-Correlation-ID`. O runtime coloca o correlationId no contexto de log, o `JsonLayout` inclui esse contexto e os eventos têm nome fixo. Filtrar por `correlationId` mostra a matrícula do app ao ERP. O id também volta para o app na resposta de erro, para o suporte pedir ao aluno.

**Por que a recusa do cartão (HTTP 402) não é erro na `payments-sapi`?**
Porque para a System API ela é um resultado válido do sistema: "cobrança recusada". Quem decide que isso impede a matrícula é a Process API. Se a System API lançasse erro, misturaria falha técnica com resultado de negócio e entraria no retry.

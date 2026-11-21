# 0005. Matrícula como saga orquestrada na Process API, com ERP best-effort

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

Matricular envolve três sistemas sem transação distribuída: reservar a vaga (estúdio), cobrar (processador) e registrar o título (ERP). O aluno precisa de resposta síncrona na tela. Falhas no meio não podem deixar aluno cobrado sem vaga, nem vaga presa sem pagamento.

## Decisão

A Process API executa as etapas em ordem e decide a compensação de cada falha:

| Etapa | Falha | Tratamento |
| --- | --- | --- |
| Aluno e aula | 404 / indisponível | 404 ou 503; nada a desfazer |
| Elegibilidade (DataWeave) | inativo, aula iniciada, lotada | 422 / 409; nada escrito |
| Reserva temporária (hold) | aula lotou | 409 |
| Cobrança | recusada | libera a vaga (compensação best-effort) e 422 |
| Cobrança | sem resposta | 503 **sem** liberar a vaga: o resultado é desconhecido; o hold expira sozinho e o cliente repete com a mesma chave |
| Confirmação | reserva expirou | 409 propagado + log `enrollment.refund.required` (estorno é próximo passo) |
| Título no ERP | qualquer falha | On Error Continue: matrícula confirmada com `erpSync.status = PENDING` |

Reservar antes de cobrar evita cobrar por vaga inexistente; o hold com expiração evita vaga presa para sempre.

## Consequências

- O ERP fora do ar não impede matrícula; o financeiro recebe o título depois (reprocessamento é próximo passo).
- Existe uma janela rara (reserva expira entre cobrar e confirmar) que exige estorno; hoje ela é detectada e registrada, não resolvida automaticamente.
- A orquestração é síncrona e sequencial: latência é a soma das etapas (as duas leituras poderiam ser paralelas com scatter-gather).

## Alternativas consideradas

- **Cobrar antes de reservar:** risco de cobrar sem vaga, com estorno frequente.
- **Coreografia por eventos:** sem resposta síncrona para a tela e mais difícil de rastrear.
- **Registro no ERP via fila (SQS/Anypoint MQ):** desacopla melhor e é a evolução natural do `PENDING`; não entrou nesta fundação para não depender de infraestrutura de mensageria (ver ADR 0009).

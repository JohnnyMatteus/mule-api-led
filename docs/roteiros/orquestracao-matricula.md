# Roteiro: orquestração da matrícula (saga na Process API)

## A solução

`enrollment-papi` executa seis etapas em ordem (aluno e aula, elegibilidade, reserva temporária, cobrança, confirmação, título no ERP), decide a compensação de cada falha e responde de forma síncrona. Código em `apps/enrollment-papi/src/main/mule/enrollment-orchestration.xml`; testes em `enrollment-orchestration-test-suite.xml`, com cada chamada a System API simulada por etapa.

## Decisões que sustentam o desenho

- **Reservar antes de cobrar**, com hold que expira: nunca se cobra por vaga inexistente, e uma vaga abandonada se libera sozinha.
- **Elegibilidade antes de qualquer escrita**, em DataWeave puro (`enrollment-eligibility.dwl`), que devolve todas as violações; o flow escolhe a prioridade.
- **Preço vem do estúdio, nunca do cliente.**
- **Compensação só quando o resultado é conhecido.** Recusa: libera a vaga. Sem resposta do pagamento: não libera, porque a cobrança pode ter acontecido.
- **ERP é best-effort.** Depois que o dinheiro foi capturado e a vaga confirmada, nada do ERP desfaz a matrícula: falha vira `erpSync: PENDING`.
- **Idempotência por etapa:** a chave do cliente vira `K:reserve`, `K:charge`, `K:confirm`, `K:receivable`.

## Trade-offs

| Escolha | Custo aceito |
| --- | --- |
| Saga orquestrada síncrona | latência é a soma das etapas; a Process API concentra lógica |
| Sem banco próprio da integração | estado da saga vive nos sistemas (reserva, cobrança); retomada depende da idempotência dos backends |
| ERP best-effort | título pode ficar pendente; exige reprocessamento (próximo passo) |
| Detectar, não resolver, a reserva expirada após cobrar | estorno manual até existir `refund` na `payments-sapi` |

## Perguntas que um entrevistador faria

**O que acontece se o Mule cair entre a cobrança e a confirmação?**
O cliente recebe timeout e o app reenvia com a mesma `Idempotency-Key`. A reserva com `K:reserve` devolve a mesma reserva, a cobrança com `K:charge` devolve a mesma cobrança aprovada (o processador deduplica), e a confirmação segue. Se o app não reenviar, o hold expira: aí é o caso de estorno, detectável na conciliação porque a cobrança referencia a reserva. É por isso que o projeto do processador de pagamentos tem conciliação como núcleo.

**Por que não uma transação distribuída (XA)?**
Nenhum dos três sistemas participa de XA via HTTP, e mesmo se participassem, travar recursos durante a autorização do cartão é inviável. Saga com compensação é o padrão para isso.

**Por que não coreografia por eventos?**
A tela precisa de "confirmada" ou "recusada" na hora. Coreografia é ótima para o que vem depois (ERP, e-mail, analytics) e é para onde o registro do título vai evoluir.

**Por que o pagamento sem resposta não libera a vaga?**
Liberar uma vaga de quem pagou é o pior erro possível: aluno cobrado e sem lugar. Manter a vaga presa por alguns minutos (até o hold expirar) é o erro barato. Entre dois erros, escolhi o reversível.

**Como você testa isso sem os sistemas?**
Nas suítes MUnit, cada `flow-ref` para uma System API tem um `doc:name` único por etapa e é simulado com status e payload. Há casos para caminho feliz, recusa com compensação, compensação que falha, ERP fora do ar, aluno inativo, aluno inexistente, aula lotada na reserva, pagamento sem resposta e reserva expirada. As fixtures dessas respostas são validadas contra as specs das System APIs, então o mock não pode inventar um formato que a System API real não devolve.

**Por que o 409 de reserva expirada é Propagate e o 409 de aula lotada é Continue?**
Aula lotada é negócio normal. Reserva expirada depois de cobrar é anomalia que precisa de ação humana: tem que aparecer como falha nas métricas e disparar alerta.

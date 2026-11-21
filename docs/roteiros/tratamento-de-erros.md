# Roteiro: tratamento de erros (Continue x Propagate)

## A solução

- `global-error-handler` como `defaultErrorHandler-ref` em todas as aplicações.
- **On Error Continue** para `APIKIT:*` e recusas de negócio: o evento termina com sucesso e o listener devolve `vars.httpStatus` (4xx) com o corpo de erro.
- **On Error Propagate** para indisponibilidade (`MULE:RETRY_EXHAUSTED`, `HTTP:CONNECTIVITY`, `*:UNAVAILABLE`), anomalias (`ENROLLMENT:RESERVATION_EXPIRED`) e `ANY`.
- Catálogo `modules/ApiErrors.dwl`: tipo de erro -> status, código público e mensagem. 4xx levam a descrição em `details`; 5xx não expõem nada interno.
- Continue local onde a degradação é decisão de negócio: cancelamento idempotente (`studio-sapi`), compensação e ERP (`enrollment-papi`).

## Trade-offs

- Continue para 4xx deixa as métricas de falha limpas, mas exige que o time entenda que "continue" não é "ignorar".
- Catálogo duplicado em cada aplicação (diferente em cada uma) até virar biblioteca no Exchange.
- `build-error-response` só monta o erro uma vez (`vars.apiError`), porque o handler pode rodar no flow da operação e de novo no flow principal.

## Perguntas que um entrevistador faria

**Qual a diferença prática entre On Error Continue e On Error Propagate?**
Continue trata o erro e o flow termina com sucesso para quem chamou: no listener HTTP, vale o `http:response`. Propagate trata e relança: o chamador recebe erro, o listener usa o `http:error-response`, transações fazem rollback e o evento conta como falha. Em um flow chamado por `flow-ref`, Continue devolve o controle ao chamador como se nada tivesse falhado.

**Por que não deixar o padrão do APIkit (Propagate para tudo)?**
Porque "aula lotada" viraria falha nas métricas e nos alertas. Separar o que é negócio do que é técnico é o que torna o alerta confiável.

**Onde você usou On Error Continue fora do handler global e por quê?**
No cancelamento de reserva: 404 do estúdio significa que a reserva já não existe, que é o efeito desejado (idempotência). Na compensação: se liberar a vaga falhar, a resposta ao aluno continua sendo "pagamento recusado", e o hold expira sozinho. No ERP: depois de cobrar e confirmar, falha no ERP vira `PENDING`.

**Como garantir que ninguém lance um erro que vire 500 genérico por esquecimento?**
O teste de governança lê todos os `raise-error` e os tipos tratados no handler global e exige que estejam no catálogo. Um tipo novo sem mapeamento quebra o CI.

**Por que a `finerp-sapi` devolve 502 quando o ERP recusa a credencial?**
Porque o problema não é do chamador nem do ERP estar fora: é configuração nossa. 502 sinaliza falha de integração, é propagado para aparecer nas métricas e não expõe detalhes da credencial.

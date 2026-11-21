# 0009. Ambiente local com WireMock e Prism, sem LocalStack

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

O runtime Mule não roda neste ambiente sem licença e credenciais, mas quem desenvolve o app ou uma camada precisa de algo para chamar, e o CI precisa provar que as camadas se entendem.

## Decisão

`docker-compose.yml` com o profile `core`:

- **WireMock** simulando os sistemas de origem (estúdio, processador, FinERP), com os corpos de resposta montados a partir das **mesmas fixtures dos testes MUnit** (volume somente leitura). As System APIs em `env=local` apontam para ele.
- **Prism** servindo as specs das três System APIs e da Process API, validando headers e corpo. A Process API e a Experience API em `env=mocks` rodam contra esses mocks.
- Profile `tools` com Swagger UI das cinco specs.
- Testes de integração (`make test-integration`, job `integration` do CI) enviam aos mocks Prism o que cada DataWeave produz e conferem a resposta contra o contrato.

**Sem LocalStack/SQS nesta fundação:** o registro no ERP é síncrono best-effort (ADR 0005). Uma fila só entra quando o reprocessamento de `PENDING` for implementado; então LocalStack com SQS (e o conector Amazon SQS no Mule) será adicionado com seu próprio ADR.

## Consequências

- Mocks e testes MUnit não divergem: a fixture é a fonte única.
- O app e as camadas podem ser desenvolvidos em paralelo a partir do contrato (design-first).
- Prism gera respostas a partir do schema e dos exemplos; não simula estado nem regras (por exemplo, aula lotada). Esses cenários ficam nos testes MUnit.

## Alternativas consideradas

- **Mocking service do Exchange:** exige Anypoint Platform.
- **Mule CE em container:** não executa DataWeave (`ee:transform`).
- **LocalStack agora:** infraestrutura sem uso real no código atual.

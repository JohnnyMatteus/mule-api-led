# 0003. Governança das APIs como código no CI

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

API-Led só entrega reuso se todas as APIs seguirem as mesmas convenções: correlação, idempotência, contrato de erro, nomes. Revisão manual esquece. Além disso, sem runtime Mule no CI (ADR 0007), precisamos de outra forma de detectar regressões nos projetos.

## Decisão

Três camadas de verificação automática, todas sem Java:

1. **Ruleset Spectral** (`.spectral.yaml`): toda spec declara `x-api-layer` e `x-owner-team`; toda operação aceita `X-Correlation-ID`; todo POST exige `Idempotency-Key`; respostas 4xx/5xx usam o contrato de erro (`code`, `message`, `correlationId`); casing de paths, operationId e propriedades. Um teste prova que cada regra dispara numa spec propositalmente inválida.
2. **Testes de governança dos projetos Mule** (`tools/test/mule-governance.test.js`): flows APIkit batem com a spec; handler global com Continue e Propagate; toda saída HTTP dentro de `until-successful`; correlationId propagado; transformações só em `.dwl`, todas usadas e com MUnit; todo erro lançado está no catálogo; mesmas chaves em todos os ambientes; segredos só cifrados.
3. **Testes de contrato entre camadas** (`tools/contracts.yaml`): as fixtures usadas nos MUnit (o que cada DataWeave recebe e produz) são validadas contra o schema OAS de quem produz ou consome.

## Consequências

- Uma quebra de contrato entre camadas aparece no PR, antes de qualquer deploy.
- As regras viram documentação executável do padrão da casa.
- Os testes leem XML e YAML, não executam o Mule: provam estrutura e contrato, não comportamento em runtime. O comportamento fica com o MUnit (manual) e com os testes de integração contra mocks.
- Custo de manter um parser simples de XML/DWL; mudanças de convenção exigem mudar o teste junto.

## Alternativas consideradas

- **Políticas de governança do Anypoint (API Governance):** fazem o mesmo papel do ruleset, mas exigem a plataforma e não rodam num CI público.
- **Só revisão de código:** não escala e não é verificável.

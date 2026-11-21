# 0007. Validação sem runtime no CI e MUnit em job manual

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

MUnit executa os testes dentro do runtime Mule EE, baixado do repositório EE da MuleSoft, que exige credencial de cliente. Um repositório público de portfólio não tem essa credencial, e o CI precisa passar em todo PR. Localmente, Java, Maven e o runtime não estão instalados.

## Decisão

- O CI obrigatório (`ci.yml`) roda o que não depende do runtime: Spectral, xmllint, testes de governança e contrato (Node) e testes de integração contra mocks (Docker).
- O MUnit fica em `mule-tests.yml`, disparado manualmente (`workflow_dispatch`), e só roda com os secrets `MULESOFT_NEXUS_USERNAME` e `MULESOFT_NEXUS_PASSWORD`. Localmente, `make munit` roda o mesmo em Docker.
- As suítes MUnit existem e cobrem cada `.dwl` e os flows principais, com payloads fictícios, mas **não foram executadas** na construção desta fundação.

## Consequências

- O CI público é verde e útil sem credenciais.
- Existe risco real de um teste MUnit ou um DataWeave ter erro que só o runtime detectaria. Os testes de governança e contrato reduzem esse risco (estrutura, cobertura e formato dos dados), mas não o eliminam.
- A DataWeave CLI (nativa, sem Java) poderia executar os `.dwl` isolados no CI; fica como próximo passo.

## Alternativas consideradas

- **Rodar MUnit em todo PR com credenciais:** impossível em fork e expõe credencial de cliente.
- **Runtime CE:** não executa `ee:transform` (DataWeave), que é o núcleo dos testes.

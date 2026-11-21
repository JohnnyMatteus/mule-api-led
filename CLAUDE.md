# CLAUDE.md

Guia para sessões de agente neste repositório.

## Visão

Exemplo de arquitetura API-Led Connectivity em Mule 4 + DataWeave: matrícula paga de alunos de uma rede fictícia de estúdios, integrando SaaS de estúdios, processador de pagamentos e o ERP fictício "FinERP Exemplo". Cinco aplicações Mule em três camadas (Experience, Process, System). Projeto de portfólio: o que importa é desenho defensável, contratos e governança verificáveis.

## Regras

- Domínio 100% fictício. Nenhum nome real de cliente, empresa ou pessoa. E-mails só `@example.com`.
- Nenhum segredo real. Valores sensíveis só em `config/secure-<env>.yaml`, no formato `![...]`. Local/mocks usam a chave pública `devonly-changeme` e valores `dev-only-*`; dev/prod só `![CIFRAR_NO_PIPELINE]`.
- Docs em português do Brasil; identificadores, nomes de flow, chaves de config e DataWeave em inglês.
- Dependências só descem: Experience -> Process -> System. Experience nunca chama System.
- Toda transformação em `.dwl` (nunca inline em `ee:transform`), com teste MUnit e fixture fictícia.
- Toda chamada HTTP de saída dentro de `until-successful`; escritas sempre com `Idempotency-Key`.
- Todo `raise-error` novo precisa de entrada em `modules/ApiErrors.dwl` da aplicação.
- Mudou um contrato (spec)? Atualize fixtures e `tools/contracts.yaml`.
- Mesmas chaves de configuração em todos os ambientes da aplicação.
- Commits em Conventional Commits, mensagem via `git commit -F <arquivo>`.

## Comandos

```bash
make install            # npm ci (Spectral, Ajv, fast-xml-parser)
make validate           # lint de specs + xmllint + testes de governança e contrato (o que o CI roda)
make up / make down     # mocks: WireMock (backends, :9090) e Prism (System APIs :4011-4013, Process :4020)
make test-integration   # sobe os mocks e roda tools/integration
make munit              # MUnit em Docker; exige MULESOFT_NEXUS_USERNAME/PASSWORD (repositório EE)
```

Java, Maven e runtime Mule não estão disponíveis localmente: não tente rodar o Mule. O MUnit só roda no workflow manual `mule-tests.yml` ou em `make munit` com credencial.

## Estrutura

```
pom.xml                         POM pai (versões de runtime, conectores e plugins)
apps/<app>/                     uma aplicação Mule por API
  src/main/mule/                global.xml, global-error-handler.xml, <app>.xml (APIkit), saída HTTP com retry
  src/main/resources/api/       spec OAS 3.0 (fonte do APIkit, dos mocks e dos testes de contrato)
  src/main/resources/dw/        transformações
  src/main/resources/modules/   ApiErrors.dwl (catálogo de erros) e utilitários
  src/main/resources/config/    common.yaml, <env>.yaml, secure-<env>.yaml
  src/test/munit/               suítes MUnit
  src/test/resources/fixtures/  payloads fictícios
.spectral.yaml                  ruleset de governança das specs
tools/validate-xml.sh           xmllint em todos os XML
tools/test/                     governança, contratos e ruleset (node:test)
tools/contracts.yaml            fixture -> spec/schema
tools/integration/              testes contra os mocks do docker-compose
mocks/wiremock/mappings/        backends simulados (corpos = fixtures do MUnit)
ci/maven-settings.xml           settings do Maven para o MUnit (credenciais por variável de ambiente)
docs/                           design-doc, api-led, ADRs, roteiros
```

## Fluxo de trabalho

1. Mudança de contrato começa pela spec; rode `npm run lint:specs`.
2. Ajuste flows e `.dwl`; crie ou atualize fixture e teste MUnit.
3. Registre fixtures novas em `tools/contracts.yaml`.
4. `make validate` (e `make test-integration` se mexeu em spec, fixture de backend ou mocks).
5. Decisão nova ou alterada: ADR em `docs/adr/` e, se for núcleo, roteiro em `docs/roteiros/`.
6. Atualize "Próximos passos" no README e o plano de evolução no design doc.

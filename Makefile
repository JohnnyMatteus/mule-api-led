# Alvos padronizados do repositório. "make help" lista tudo.
# Requisitos: Node 22+, xmllint e Docker. Java, Maven e Mule não são necessários,
# exceto para "make munit" (Docker + credencial do repositório EE da MuleSoft).

COMPOSE := docker compose
MAVEN_IMAGE := maven:3.9.9-eclipse-temurin-17
# Chave pública de desenvolvimento das propriedades seguras locais (não é segredo; veja docs/design-doc.md).
DEV_SECURE_KEY := devonly-changeme

.DEFAULT_GOAL := help
.PHONY: help install lint test validate up up-tools down logs ps seed test-integration munit network clean

help: ## Lista os alvos
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-18s %s\n", $$1, $$2}'

install: ## Instala as ferramentas de validação (Spectral, Ajv)
	npm ci

lint: ## Lint das specs OAS (Spectral + regras da casa) e XML bem-formado
	npm run lint:specs
	npm run lint:xml

test: ## Testes de governança, de contrato entre camadas e do ruleset (sem Docker)
	npm test

validate: lint test ## O mesmo que o CI roda: lint + testes

up: ## Sobe os mocks (WireMock dos backends + Prism das APIs) e espera ficarem saudáveis
	$(COMPOSE) --profile core up -d --wait

up-tools: ## Sobe também o Swagger UI com as cinco specs (http://localhost:8090)
	$(COMPOSE) --profile core --profile tools up -d --wait

down: ## Derruba o ambiente
	$(COMPOSE) --profile core --profile tools down

logs: ## Acompanha os logs dos mocks
	$(COMPOSE) --profile core --profile tools logs -f

ps: ## Estado dos serviços
	$(COMPOSE) --profile core --profile tools ps

seed: ## Recarrega no WireMock os mapeamentos versionados (descarta stubs criados em runtime)
	curl -fsS -X POST http://localhost:$${WIREMOCK_PORT:-9090}/__admin/mappings/reset >/dev/null
	@echo "WireMock recarregado a partir de mocks/wiremock/mappings."

test-integration: up ## Testes de integração contra os mocks do docker-compose
	npm run test:integration

munit: ## MUnit em Docker (exige MULESOFT_NEXUS_USERNAME/PASSWORD do repositório EE)
	@test -n "$$MULESOFT_NEXUS_USERNAME" || (echo "Defina MULESOFT_NEXUS_USERNAME e MULESOFT_NEXUS_PASSWORD (repositório EE da MuleSoft)." && exit 1)
	docker run --rm -e MULESOFT_NEXUS_USERNAME -e MULESOFT_NEXUS_PASSWORD \
		-v "$(CURDIR)":/workspace -v mule-api-led-m2:/root/.m2 -w /workspace $(MAVEN_IMAGE) \
		mvn -B -s ci/maven-settings.xml test -Dsecure.key=$(DEV_SECURE_KEY)

network: ## Cria a rede compartilhada do portfólio (opcional, para integrar com outros projetos)
	docker network inspect portfolio-net >/dev/null 2>&1 || docker network create portfolio-net

clean: ## Derruba containers e remove o cache Maven do MUnit (volume Docker)
	$(COMPOSE) --profile core --profile tools down --remove-orphans
	-docker volume rm mule-api-led-m2

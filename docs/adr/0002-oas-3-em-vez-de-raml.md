# 0002. Contratos em OAS 3.0 em vez de RAML 1.0

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

O APIkit do Mule 4 aceita RAML 1.0 e OAS 3.0. O contrato é o centro do design-first: gera os flows, valida requisições em runtime e alimenta os mocks. Precisamos validar specs no CI sem Anypoint Studio, Java ou credenciais.

## Decisão

Escrever as cinco specs em **OpenAPI 3.0.3**, uma por aplicação em `src/main/resources/api/`, validadas pelo **Spectral** com regras da casa (`.spectral.yaml`).

## Consequências

- Ferramentas maduras e livres via npm: Spectral (lint e governança), Prism (mocks com validação), Ajv (testes de contrato), Swagger UI.
- O mesmo arquivo serve ao APIkit, aos mocks do docker-compose e aos testes de contrato. Uma fonte de verdade.
- Perdemos recursos próprios do RAML (traits, resource types, fragmentos no Exchange). A reutilização entre specs é feita por convenção e verificada pelo ruleset, não por herança; os componentes comuns (erro, headers) são repetidos em cada spec.
- Em uma organização Anypoint real, as specs seriam publicadas no Exchange e consumidas como dependência; aqui ficam no repositório para o exemplo ser autocontido.

## Alternativas consideradas

- **RAML 1.0:** melhor reuso com traits e fragments, mas o ecossistema de validação fora do Anypoint está parado (raml-1-parser e webapi-parser sem manutenção ativa).
- **OAS 3.1:** alinhado ao JSON Schema 2020-12, mas o suporte do APIkit e de parte das ferramentas ainda é parcial.

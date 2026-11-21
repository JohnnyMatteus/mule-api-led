# 0008. Configuração por ambiente e propriedades seguras com chave injetada no deploy

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

Cada aplicação roda em local, mocks, dev e prod, com hosts, portas, IDs do API Manager e credenciais diferentes. Credenciais não podem estar em claro no Git, e um ambiente sem uma chave que outro tem só deveria quebrar no deploy, não em produção.

## Decisão

- `config/common.yaml` (igual em todos) + `config/<env>.yaml`, selecionados por `${env}` (global-property `local`, sobrescrita por `-Denv` no deploy).
- Valores sensíveis só em `config/secure-<env>.yaml`, lidos por `${secure::chave}` pelo Secure Configuration Properties Module (AES/CBC). A chave (`secure.key`) chega como propriedade protegida no Runtime Manager (`secureProperties` no `mule-artifact.json` e no mule-maven-plugin), nunca no Git.
- Local e mocks usam uma **chave pública de desenvolvimento** (`devonly-changeme`) e valores de desenvolvimento óbvios (`dev-only-...`), para o projeto subir sem pedir segredo a ninguém. Dev e prod versionam só o placeholder `![CIFRAR_NO_PIPELINE]`.
- Um teste de governança garante: mesmas chaves em todos os ambientes, um arquivo seguro por ambiente, nenhuma chave sensível fora dos arquivos seguros, todo `${...}` dos flows existente na configuração.

## Consequências

- Drift de configuração e segredo em claro quebram o CI.
- Os valores cifrados de local foram gerados com OpenSSL reproduzindo o modo padrão do módulo (AES-128-CBC, IV igual à chave). Precisam ser conferidos com o `secure-properties-tool` da MuleSoft na primeira execução real.
- Rotacionar segredo em dev/prod é trabalho do pipeline de deploy, fora deste repositório.

## Alternativas consideradas

- **Variáveis de ambiente / propriedades do Runtime Manager para cada segredo:** funciona, mas espalha a lista de segredos fora do código e não é verificável no CI.
- **Cofre externo (Vault, Secrets Manager) via conector:** melhor para rotação; fica como evolução, integrando com a plataforma de entrada do portfólio.

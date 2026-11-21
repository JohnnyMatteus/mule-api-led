## O que muda

<!-- Uma ou duas frases: qual API/camada muda e por quê. -->

## Camadas afetadas

- [ ] Experience (`student-app-xapi`)
- [ ] Process (`enrollment-papi`)
- [ ] System (`studio-sapi`, `payments-sapi`, `finerp-sapi`)

## Contrato

- [ ] A spec OAS mudou? Se sim, a mudança é compatível com os consumidores atuais (campo novo opcional, sem remover ou renomear).
- [ ] `tools/contracts.yaml` cobre as fixtures novas ou alteradas.

## Checklist

- [ ] `make validate` passa localmente (Spectral, xmllint, governança e contratos).
- [ ] `make test-integration` passa (mocks WireMock + Prism).
- [ ] Toda transformação nova está em `.dwl` com teste MUnit e payload fictício.
- [ ] Chamada HTTP nova está dentro de `until-successful` e escritas levam `Idempotency-Key`.
- [ ] Nenhum segredo em claro; valores sensíveis só em `secure-*.yaml`.
- [ ] Documentação e ADR atualizadas se a decisão mudou.

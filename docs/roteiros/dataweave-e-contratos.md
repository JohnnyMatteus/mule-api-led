# Roteiro: transformações DataWeave e contratos entre camadas

## A solução

- Toda transformação está em `src/main/resources/dw/*.dwl` ou em módulos (`modules/*.dwl`), nunca inline nos flows (teste de governança).
- Cada `.dwl` tem teste MUnit com payload fictício e saída esperada em `src/test/resources/fixtures/`.
- As mesmas fixtures são validadas contra os schemas OAS (`tools/contracts.yaml`): o que a Process API monta para a `payments-sapi` precisa passar no schema `ChargeRequest` da `payments-sapi`.
- O WireMock do docker-compose serve as mesmas fixtures como resposta dos backends simulados.

## Exemplos que valem mostrar

- `studio-session-to-class.dwl`: `max([capacity - booked, 0])` porque o estúdio aceita overbooking manual e o contrato não admite vagas negativas.
- `processor-to-charge.dwl` e `booking-to-reservation.dwl`: estado desconhecido chama `fail()`. Melhor um erro explícito do que aprovar uma cobrança por engano ou sair do contrato.
- `FinErpFormat.dwl`: remoção de acentos por regras regex num `reduce`, corte por tamanho de campo, centavos com `leftPad` de 15 posições.
- `AppFormat.dwl`: formata em inglês e troca os separadores, para `R$ 1.250,50` não depender do locale da JVM do runtime.
- `enrollment-eligibility.dwl`: regras de negócio puras, com elementos condicionais no array; testadas na borda (pedido no instante exato do início) e com fusos diferentes.

## Trade-offs

- Testes MUnit não foram executados nesta fundação (exigem runtime EE). Mitigação: governança garante que todo `.dwl` tem teste, e os testes de contrato garantem que entradas e saídas esperadas são válidas para as specs. O que fica sem prova é a semântica do DataWeave em si.
- Fixtures compartilhadas entre MUnit, mocks e contratos: uma fonte única evita divergência, mas uma mudança de fixture afeta três lugares (o que é intencional).

## Perguntas que um entrevistador faria

**Por que `.dwl` separado e não inline?**
Revisão (diff legível), reuso, teste isolado no MUnit e possibilidade de rodar com a DataWeave CLI fora do Mule. Inline mistura transformação com fluxo e não é testável sozinho.

**Como o teste de contrato pega uma quebra entre camadas?**
Se alguém renomear `paymentMethod` para `method` na spec da `payments-sapi`, a fixture `build-charge-request/expected.json` da Process API (que é a saída esperada do DataWeave dela) deixa de validar contra o `ChargeRequest` com `additionalProperties: false`. O PR quebra antes do deploy, apontando o consumidor afetado.

**Como você evita erro de arredondamento com dinheiro?**
DataWeave usa decimal de precisão arbitrária, não float binário; `round(129.9 * 100)` dá 12990. No contrato, `multipleOf: 0.01` rejeita valores com mais de duas casas, e há teste de contrato provando isso.

**O que a DataWeave CLI acrescentaria?**
Executar cada `.dwl` com a entrada da fixture e comparar com a saída esperada, sem Java e sem credencial, no CI público. É o próximo passo para fechar a lacuna de execução.

%dw 2.0
/**
 * Retorno do FinERP (sucesso ou duplicado) para o título canônico.
 * A referência vem de vars.reference porque o ERP não a ecoa na resposta.
 */
output application/json
---
{
    id: "rcv-" ++ payload.NR_DOCUMENTO,
    reference: vars.reference,
    status: if (payload.ST_TITULO == "L") "SETTLED" else "OPEN",
    erpDocumentNumber: payload.NR_DOCUMENTO
}

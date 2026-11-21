%dw 2.0
/**
 * Título a receber canônico para o layout do FinERP. A referência de negócio vai em
 * NR_REFERENCIA_EXT, campo que o ERP usa para recusar duplicados (E023).
 */
import toErpText, toErpDate, toErpAmount from modules::FinErpFormat
output application/json

var costCenterCodes = {
    CLASSES: "CC-AULAS",
    PRODUCTS: "CC-PRODUTOS"
}
---
{
    CD_CLIENTE: payload.customer.document,
    NM_CLIENTE: toErpText(payload.customer.name, 40),
    DS_EMAIL: lower(payload.customer.email),
    TP_TITULO: "REC",
    VL_TITULO: toErpAmount(payload.amount.value),
    DT_EMISSAO: toErpDate(payload.issueDate),
    DT_VENCIMENTO: toErpDate(payload.dueDate),
    NR_REFERENCIA_EXT: payload.reference,
    CD_CENTRO_CUSTO: costCenterCodes[payload.costCenter],
    DS_HISTORICO: toErpText(payload.description, 50),
    NR_AUTORIZACAO_PGTO: payload.paymentReference
}

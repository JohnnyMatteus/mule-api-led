%dw 2.0
/**
 * Resposta do processador para a cobrança canônica. Status do processador são agrupados
 * nos três que o negócio entende; códigos de recusa desconhecidos viram OTHER.
 * Status desconhecido falha explicitamente: melhor um erro do que aprovar por engano.
 */
import fail from dw::Runtime
output application/json

var statusByProcessorStatus = {
    authorized: "APPROVED",
    captured: "APPROVED",
    declined: "DECLINED",
    pending: "PENDING",
    requires_action: "PENDING"
}

var declineReasonByCode = {
    insufficient_funds: "INSUFFICIENT_FUNDS",
    expired_card: "CARD_EXPIRED",
    fraudulent: "SUSPECTED_FRAUD"
}

var status = statusByProcessorStatus[payload.status] default fail("Status do processador desconhecido: " ++ (payload.status default "nulo"))
---
{
    id: payload.payment_id,
    reference: payload.merchant_reference,
    status: status,
    (declineReason: declineReasonByCode[payload.decline_code default ""] default "OTHER") if (status == "DECLINED"),
    amount: {
        value: payload.amount_minor / 100,
        currency: payload.currency
    }
}

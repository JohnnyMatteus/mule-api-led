%dw 2.0
/**
 * Cobrança canônica para o formato do processador: valor em centavos (inteiro),
 * método em minúsculas e descritor de fatura limitado a 22 caracteres.
 */
output application/json

var descriptorMaxLength = 22

fun statementDescriptor(text: String): String = do {
    var normalized = upper(trim(text))
    ---
    if (sizeOf(normalized) > descriptorMaxLength)
        normalized[0 to (descriptorMaxLength - 1)]
    else
        normalized
}
---
{
    amount_minor: round(payload.amount.value * 100),
    currency: payload.amount.currency,
    merchant_reference: payload.reference,
    customer: {
        external_id: payload.customer.id,
        name: payload.customer.name,
        email: payload.customer.email
    },
    payment_method: {
        kind: lower(payload.paymentMethod."type"),
        (card_token: payload.paymentMethod.token) if (payload.paymentMethod.token != null)
    },
    statement_descriptor: statementDescriptor(payload.description)
}

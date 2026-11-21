%dw 2.0
/**
 * Membro do SaaS de estúdios (snake_case, documento formatado, flag booleana)
 * para o aluno canônico da System API.
 */
output application/json
---
{
    id: payload.id,
    name: trim(payload.full_name),
    email: lower(trim(payload.email)),
    document: payload.tax_id replace /\D/ with "",
    status: if (payload.active == true) "ACTIVE" else "INACTIVE"
}

%dw 2.0
/**
 * Pedido de título a receber para a FinERP System API. Pagamento no cartão já capturado:
 * vencimento igual à emissão, na data contábil do fuso de Brasília.
 * Entradas: vars.student, vars.studioClass, vars.reservation, vars.charge, vars.businessDate.
 */
import truncate from modules::Text
output application/json
---
{
    reference: vars.reservation.id,
    customer: {
        document: vars.student.document,
        name: vars.student.name,
        email: vars.student.email
    },
    amount: vars.studioClass.price,
    issueDate: vars.businessDate,
    dueDate: vars.businessDate,
    costCenter: "CLASSES",
    description: truncate("Matrícula " ++ vars.studioClass.title, 60),
    paymentReference: vars.charge.id
}

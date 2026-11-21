%dw 2.0
/**
 * Pedido de cobrança para a Payments System API. A referência é a reserva, o que liga
 * a cobrança à vaga na conciliação; o preço vem do estúdio, nunca do cliente.
 * Entradas: vars.request, vars.student, vars.studioClass, vars.reservation.
 */
import truncate from modules::Text
output application/json
---
{
    reference: vars.reservation.id,
    amount: vars.studioClass.price,
    customer: {
        id: vars.student.id,
        name: vars.student.name,
        email: vars.student.email
    },
    paymentMethod: {
        "type": vars.request.paymentMethod."type",
        token: vars.request.paymentMethod.token
    },
    description: truncate("Matrícula " ++ vars.studioClass.title, 80)
}

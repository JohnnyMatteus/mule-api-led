%dw 2.0
/**
 * Pedido do app para a Process API. O aluno vem do token (vars.studentId), nunca do corpo;
 * o app só conhece cartão tokenizado.
 */
output application/json
---
{
    studentId: vars.studentId,
    classId: payload.classId,
    paymentMethod: {
        "type": "CARD_TOKEN",
        token: payload.cardToken
    }
}

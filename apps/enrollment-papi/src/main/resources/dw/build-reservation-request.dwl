%dw 2.0
/**
 * Pedido de reserva para a Studio System API.
 */
output application/json
---
{
    studentId: vars.request.studentId,
    classId: vars.request.classId
}

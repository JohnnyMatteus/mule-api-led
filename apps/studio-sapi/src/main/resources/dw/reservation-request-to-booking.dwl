%dw 2.0
/**
 * Reserva canônica para o booking do estúdio. "hold" pede uma reserva temporária,
 * que expira sozinha se não for confirmada.
 */
output application/json
---
{
    member_id: payload.studentId,
    session_id: payload.classId,
    hold: true
}

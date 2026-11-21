%dw 2.0
/**
 * Booking do estúdio para a reserva canônica. Estado desconhecido falha de forma explícita
 * em vez de devolver um status fora do contrato.
 */
import fail from dw::Runtime
output application/json

var statusByState = {
    held: "HELD",
    confirmed: "CONFIRMED",
    cancelled: "CANCELLED"
}
---
{
    id: payload.booking_id,
    studentId: payload.member_id,
    classId: payload.session_id,
    status: statusByState[payload.state] default fail("Estado de booking desconhecido: " ++ (payload.state default "nulo")),
    (expiresAt: payload.hold_expires_at) if (payload.hold_expires_at != null)
}

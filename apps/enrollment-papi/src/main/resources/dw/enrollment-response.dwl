%dw 2.0
/**
 * Resposta da Process API, independente de canal.
 * Entradas: vars.request, vars.reservation, vars.studioClass, vars.charge, vars.erpSync.
 */
output application/json
---
{
    id: vars.reservation.id,
    status: "CONFIRMED",
    studentId: vars.request.studentId,
    classInfo: {
        id: vars.studioClass.id,
        title: vars.studioClass.title,
        startsAt: vars.studioClass.startsAt
    },
    amount: vars.studioClass.price,
    charge: {
        id: vars.charge.id,
        status: vars.charge.status
    },
    erpSync: vars.erpSync
}

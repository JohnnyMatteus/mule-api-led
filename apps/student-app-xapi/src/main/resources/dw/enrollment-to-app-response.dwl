%dw 2.0
/**
 * Matrícula da Process API para o que a tela de confirmação exibe.
 * receiptPending avisa o app que o recibo ainda não foi emitido pelo financeiro.
 */
import formatBrl from modules::AppFormat
output application/json
---
{
    enrollmentId: payload.id,
    headline: "Inscrição confirmada!",
    classTitle: payload.classInfo.title,
    classStartsAt: payload.classInfo.startsAt,
    amountLabel: formatBrl(payload.amount.value),
    receiptPending: payload.erpSync.status != "SYNCED"
}

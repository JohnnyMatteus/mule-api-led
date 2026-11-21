%dw 2.0
/**
 * Erro de negócio da Process API para uma mensagem pronta para o aluno.
 * O código é preservado para o app decidir a ação (por exemplo, sugerir outro horário).
 */
output application/json

var messageByCode = {
    CLASS_FULL: "Esta aula lotou. Que tal outro horário?",
    CLASS_NOT_FOUND: "Não encontramos esta aula. Atualize a agenda e tente de novo.",
    CLASS_ALREADY_STARTED: "Esta aula já começou. Escolha um próximo horário.",
    PAYMENT_DECLINED: "Pagamento não aprovado. Confira os dados do cartão ou use outro.",
    STUDENT_INACTIVE: "Seu cadastro está inativo. Fale com a recepção do estúdio.",
    RESERVATION_EXPIRED: "Sua reserva expirou durante o pagamento. O valor será estornado."
}

var fallbackMessage = "Não foi possível concluir sua inscrição agora. Tente de novo em instantes."
---
{
    code: payload.code default "UNEXPECTED",
    message: messageByCode[payload.code default ""] default fallbackMessage,
    correlationId: payload.correlationId default correlationId
}

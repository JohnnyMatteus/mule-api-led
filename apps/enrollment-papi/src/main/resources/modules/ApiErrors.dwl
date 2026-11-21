%dw 2.0
/**
 * Catálogo de erros da Enrollment Process API: tipo de erro do Mule -> status HTTP e código público.
 * Os códigos 4xx são o vocabulário de negócio que as Experience APIs traduzem para cada canal.
 * Erros 5xx não expõem detalhes internos; 4xx devolvem a descrição em "details".
 */

var upstreamUnavailable = { status: 503, code: "UPSTREAM_UNAVAILABLE", message: "Um sistema necessário está indisponível; tente novamente com a mesma Idempotency-Key" }

var catalog = {
    "APIKIT:BAD_REQUEST": { status: 400, code: "INVALID_REQUEST", message: "Requisição inválida" },
    "APIKIT:NOT_FOUND": { status: 404, code: "RESOURCE_NOT_FOUND", message: "Recurso não encontrado" },
    "APIKIT:METHOD_NOT_ALLOWED": { status: 405, code: "METHOD_NOT_ALLOWED", message: "Método não permitido" },
    "APIKIT:NOT_ACCEPTABLE": { status: 406, code: "NOT_ACCEPTABLE", message: "Formato de resposta não suportado" },
    "APIKIT:UNSUPPORTED_MEDIA_TYPE": { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Formato de requisição não suportado" },
    "ENROLLMENT:STUDENT_NOT_FOUND": { status: 404, code: "STUDENT_NOT_FOUND", message: "Aluno não encontrado" },
    "ENROLLMENT:CLASS_NOT_FOUND": { status: 404, code: "CLASS_NOT_FOUND", message: "Aula não encontrada" },
    "ENROLLMENT:CLASS_FULL": { status: 409, code: "CLASS_FULL", message: "Aula sem vagas" },
    "ENROLLMENT:RESERVATION_EXPIRED": { status: 409, code: "RESERVATION_EXPIRED", message: "A reserva expirou antes da confirmação; o pagamento será estornado" },
    "ENROLLMENT:STUDENT_INACTIVE": { status: 422, code: "STUDENT_INACTIVE", message: "Cadastro do aluno inativo" },
    "ENROLLMENT:CLASS_ALREADY_STARTED": { status: 422, code: "CLASS_ALREADY_STARTED", message: "A aula já começou" },
    "ENROLLMENT:PAYMENT_DECLINED": { status: 422, code: "PAYMENT_DECLINED", message: "Pagamento não aprovado" },
    "ENROLLMENT:INTEGRATION_ERROR": { status: 500, code: "INTEGRATION_ERROR", message: "Falha de integração" },
    "ENROLLMENT:COMPENSATION_FAILED": { status: 500, code: "INTEGRATION_ERROR", message: "Falha de integração" },
    "ENROLLMENT:ERP_REJECTED": { status: 500, code: "INTEGRATION_ERROR", message: "Falha de integração" },
    "STUDIO:UNAVAILABLE": upstreamUnavailable,
    "PAYMENTS:UNAVAILABLE": upstreamUnavailable,
    "FINERP:UNAVAILABLE": upstreamUnavailable,
    "MULE:RETRY_EXHAUSTED": upstreamUnavailable,
    "HTTP:CONNECTIVITY": upstreamUnavailable,
    "HTTP:TIMEOUT": upstreamUnavailable
}

var unexpected = { status: 500, code: "INTERNAL_ERROR", message: "Erro inesperado" }

fun fromError(errorType: String, description: String | Null, correlationId: String) = do {
    var entry = catalog[errorType] default unexpected
    ---
    {
        status: entry.status,
        body: {
            code: entry.code,
            message: entry.message,
            correlationId: correlationId,
            (details: [description]) if (entry.status < 500 and not isEmpty(description))
        }
    }
}

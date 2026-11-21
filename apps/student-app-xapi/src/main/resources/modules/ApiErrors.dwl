%dw 2.0
/**
 * Catálogo de erros da Student App Experience API. Mensagens escritas para o aluno.
 * Erros 5xx não expõem detalhes internos; 4xx devolvem a descrição em "details".
 */

var tryAgainLater = { status: 503, code: "TEMPORARILY_UNAVAILABLE", message: "Estamos com instabilidade. Tente de novo em instantes; você não será cobrado duas vezes." }

var catalog = {
    "APIKIT:BAD_REQUEST": { status: 400, code: "INVALID_REQUEST", message: "Não conseguimos ler o pedido. Atualize o app e tente de novo." },
    "APIKIT:NOT_FOUND": { status: 404, code: "RESOURCE_NOT_FOUND", message: "Recurso não encontrado" },
    "APIKIT:METHOD_NOT_ALLOWED": { status: 405, code: "METHOD_NOT_ALLOWED", message: "Método não permitido" },
    "APIKIT:NOT_ACCEPTABLE": { status: 406, code: "NOT_ACCEPTABLE", message: "Formato de resposta não suportado" },
    "APIKIT:UNSUPPORTED_MEDIA_TYPE": { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Formato de requisição não suportado" },
    "PROCESS:UNAVAILABLE": tryAgainLater,
    "MULE:RETRY_EXHAUSTED": tryAgainLater,
    "HTTP:CONNECTIVITY": tryAgainLater,
    "HTTP:TIMEOUT": tryAgainLater
}

var unexpected = { status: 500, code: "INTERNAL_ERROR", message: "Algo deu errado do nosso lado. Tente de novo em instantes." }

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

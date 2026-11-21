%dw 2.0
/**
 * Catálogo de erros da FinERP System API: tipo de erro do Mule -> status HTTP e código público.
 * Erros 5xx não expõem detalhes internos; 4xx devolvem a descrição em "details".
 */

var catalog = {
    "APIKIT:BAD_REQUEST": { status: 400, code: "INVALID_REQUEST", message: "Requisição inválida" },
    "APIKIT:NOT_FOUND": { status: 404, code: "RESOURCE_NOT_FOUND", message: "Recurso não encontrado" },
    "APIKIT:METHOD_NOT_ALLOWED": { status: 405, code: "METHOD_NOT_ALLOWED", message: "Método não permitido" },
    "APIKIT:NOT_ACCEPTABLE": { status: 406, code: "NOT_ACCEPTABLE", message: "Formato de resposta não suportado" },
    "APIKIT:UNSUPPORTED_MEDIA_TYPE": { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Formato de requisição não suportado" },
    "FINERP:REJECTED": { status: 422, code: "REJECTED_BY_ERP", message: "O ERP rejeitou o título" },
    "FINERP:AUTH_FAILED": { status: 502, code: "UPSTREAM_AUTH_FAILED", message: "Falha de integração com o ERP" },
    "MULE:RETRY_EXHAUSTED": { status: 503, code: "UPSTREAM_UNAVAILABLE", message: "ERP indisponível; tente novamente" },
    "HTTP:CONNECTIVITY": { status: 503, code: "UPSTREAM_UNAVAILABLE", message: "ERP indisponível; tente novamente" },
    "HTTP:TIMEOUT": { status: 503, code: "UPSTREAM_UNAVAILABLE", message: "ERP indisponível; tente novamente" }
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

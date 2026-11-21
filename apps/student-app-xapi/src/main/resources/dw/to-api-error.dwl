%dw 2.0
/**
 * Lê o erro do evento e devolve { status, body } no contrato de erro da API.
 */
import fromError from modules::ApiErrors
output application/java
---
fromError(
    error.errorType.namespace ++ ":" ++ error.errorType.identifier,
    error.description,
    correlationId
)

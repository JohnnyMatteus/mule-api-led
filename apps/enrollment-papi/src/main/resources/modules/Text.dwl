%dw 2.0
/**
 * Utilitário de texto da Process API.
 */

/** Corta o texto em maxLength caracteres, sem alterar textos menores. */
fun truncate(text: String, maxLength: Number): String =
    if (sizeOf(text) > maxLength) text[0 to (maxLength - 1)] else text

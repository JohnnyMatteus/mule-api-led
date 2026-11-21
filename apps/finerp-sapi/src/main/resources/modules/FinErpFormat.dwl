%dw 2.0
/**
 * Regras do layout legado do FinERP Exemplo, isoladas para teste:
 * texto em maiúsculas sem acento e com limite de tamanho, datas yyyyMMdd e
 * valores em centavos com zeros à esquerda (15 posições).
 */
import leftPad from dw::core::Strings

var accentRules = [
    [/[áàâãä]/, "a"],
    [/[éèêë]/, "e"],
    [/[íìîï]/, "i"],
    [/[óòôõö]/, "o"],
    [/[úùûü]/, "u"],
    [/ç/, "c"],
    [/ñ/, "n"]
]

var amountWidth = 15

/** Maiúsculas, sem acentos, espaços colapsados e cortado em maxLength. */
fun toErpText(text: String, maxLength: Number): String = do {
    var plain = accentRules reduce ((rule, acc = lower(trim(text))) -> acc replace rule[0] with rule[1])
    var normalized = upper(plain replace /\s+/ with " ")
    ---
    if (sizeOf(normalized) > maxLength) normalized[0 to (maxLength - 1)] else normalized
}

/** Data ISO (yyyy-MM-dd) para yyyyMMdd. */
fun toErpDate(isoDate: String): String =
    (isoDate as Date) as String { format: "yyyyMMdd" }

/** Valor decimal para centavos em texto com 15 posições. */
fun toErpAmount(value: Number): String =
    leftPad(round(value * 100) as String, amountWidth, "0")

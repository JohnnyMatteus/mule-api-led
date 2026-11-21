%dw 2.0
/**
 * Formatação para exibição no app (pt-BR), independente do locale da JVM do runtime.
 */

/** 1250.5 -> "R$ 1.250,50". Formata em inglês e troca os separadores. */
fun formatBrl(value: Number): String = do {
    var english = value as String { format: "#,##0.00", locale: "en" }
    var swapped = ((english replace /,/ with "_") replace /\./ with ",") replace /_/ with "."
    ---
    "R\$ " ++ swapped
}

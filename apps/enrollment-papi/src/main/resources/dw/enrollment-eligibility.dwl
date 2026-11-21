%dw 2.0
/**
 * Regras de elegibilidade da matrícula, avaliadas antes de qualquer escrita.
 * Devolve todas as violações; o flow decide a prioridade de qual vira erro.
 * Entradas: vars.student, vars.studioClass, vars.requestedAt.
 */
output application/json

var classAlreadyStarted = (vars.studioClass.startsAt as DateTime) <= (vars.requestedAt as DateTime)

var violations = [
    ("STUDENT_INACTIVE") if (vars.student.status != "ACTIVE"),
    ("CLASS_ALREADY_STARTED") if (classAlreadyStarted),
    ("CLASS_FULL") if (vars.studioClass.availableSeats <= 0)
]
---
{
    eligible: isEmpty(violations),
    violations: violations
}

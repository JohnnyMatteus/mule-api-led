%dw 2.0
/**
 * Sessão do SaaS de estúdios para a aula canônica.
 * O estúdio guarda preço em centavos e vagas ocupadas; o contrato expõe valor decimal
 * e vagas disponíveis, nunca negativas (o estúdio aceita overbooking manual).
 */
output application/json
---
{
    id: payload.id,
    title: trim(payload.name),
    modality: upper(payload.kind),
    startsAt: payload.starts_at,
    capacity: payload.capacity,
    availableSeats: max([payload.capacity - payload.booked, 0]),
    price: {
        value: payload.price_cents / 100,
        currency: "BRL"
    }
}

# ADR 0001: Store money as integer kobo

- Status: accepted
- Date: 2025-05-14
- Deciders: Chinedu Okeke, Tolulope Adeyemi

## Context

The first version of the admin stored prices as naira in `numeric(12,2)` columns. node-postgres returns `numeric` as a string, and in two places we turned it into a JavaScript number before adding line totals, which gave totals like ₦12,499.999999. Payfront also works in kobo, so every payment call needed a conversion.

## Decision

Every amount is an integer number of kobo, in the database (`integer` columns ending in `_kobo`), in the API (`*Kobo` fields) and in the web app until the moment it is displayed. Conversions happen only at the edges:

- `api/src/lib/money.ts`: `formatKobo`, `koboToNairaString` (CSV), `parseNairaToKobo` (imports)
- `web/src/lib/money.ts`: `formatMoney`, `parseMoneyInput`

Percent discounts round half up to the nearest kobo, once, on the subtotal.

## Consequences

- No float drift in totals.
- `integer` caps a single amount at about ₦21 million, far above any order we take.

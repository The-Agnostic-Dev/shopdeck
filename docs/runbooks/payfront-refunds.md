# Runbook: Payfront refunds

## How a refund moves

1. Finance clicks **Issue refund** on an order. Shopdeck calls `POST /refund` on Payfront with the charge reference and amount in kobo, and saves the refund as **Processing**. The amount is taken off the order's refundable balance immediately.
2. Payfront sends webhooks to `/api/webhooks/payfront`, signed with HMAC-SHA512 of the raw body using our secret key (`x-payfront-signature`). Events: `refund.pending`, `refund.processing`, `refund.processed`, `refund.failed`, `refund.reversed`.
3. `processed` marks the refund **Refunded** and emails the customer. `failed` marks it **Failed** and gives the amount back to the order's refundable balance.
4. Sometimes the customer's bank sends the money back to Payfront after the refund was processed (closed account, wrong account). Payfront then sends `refund.reversed`. The customer did not get the money; finance has to sort it out another way (usually a transfer), so the refund must not count as paid out.
5. If a webhook never arrives, the refund sync job asks Payfront for every refund still processing after `REFUND_SYNC_STALE_MINUTES`.

## Checks when finance says a refund is wrong

- Order panel → Payment: each refund shows its status and the last status Payfront told us.
- `payfront_events` table: every webhook we received, with `processed_at` or the `error` it hit.
- Payfront dashboard (live) or `GET /_fake/payfront/refund?transaction=<reference>` (sandbox).

## Sandbox

Charges paid with the test card ending 6666 get their refunds reversed about a second after they are processed. Use one of those orders to test reversals locally.

## Things that bit us

- Verify the signature on the raw request body, not on re-serialised JSON: key order and spacing change the hash.
- Webhooks can arrive out of order and more than once. We store each event id and skip ones we have seen.
- Payfront retries any non-2xx for 72 hours. Once an event is stored we always answer 200, even if processing failed; the error is kept on the event row.

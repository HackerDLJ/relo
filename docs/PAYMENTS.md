# Online payments (Razorpay)

Buyers can pay the agreed sale price, or the agreed daily rate times the days of an approved rental, with UPI or cards through Razorpay Checkout. It is off until you add keys, and works in Razorpay **test mode** first.

## Flow
1. Browser asks `POST /api/pay/order` with the item (and request for rentals). It sends the user's session token.
2. The server reads the item, the chat's agreed price or the request under the caller's own row-level security, **computes the amount itself** (`packages/core/src/payments.ts`) and creates the Razorpay order. The amount never comes from the browser.
3. Razorpay Checkout opens. On success the browser calls `POST /api/pay/verify`.
4. The server checks Razorpay's HMAC signature with timing-safe compare, re-reads the order from Razorpay, confirms it is fully paid and belongs to the signed-in buyer, then writes a row to `payments` with the service-role key. Clients cannot write that table (RLS has no insert policy).
5. Buyer and owner see "Paid"; the owner can then Mark as sold.

## Set up (once)
1. Run `supabase/migrations/0003_payments.sql` in the Supabase SQL editor.
2. Create a Razorpay account, copy the **test** key id and secret.
3. In Vercel > Project > Settings > Environment Variables add `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Project Settings > API, the secret `service_role` key). Redeploy.
4. Pay with Razorpay's test UPI id `success@razorpay` or a test card.

## Limits
- Money settles to your Razorpay account. Paying sellers out needs Razorpay Route and seller KYC, which is not built. Treat this as test-mode payments until that is decided.
- No refunds, deposits or disputes in the app yet. Refund from the Razorpay dashboard.
- Going live needs your Razorpay KYC and live keys; nothing in the code changes.
- Not covered by automated tests against Razorpay (it needs network and keys). Amount rules are unit-tested; the order and verify routes need a test-mode run by you.

# Security and data model (v0.3, Supabase)

RELO runs in two modes. With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, it uses real email/password accounts and a shared Postgres database. Without them it runs as a local demo with seeded people.

## What is enforced by the database
- Row-level security is on for every table. Items, needs, offers and profiles are readable by signed-in members; only owners edit their items, only borrowers create their requests, and only the borrower or the item's owner can change a request.
- `no_double_booking` is a Postgres exclusion constraint: two `approved`/`active` requests for the same item can never have overlapping dates, even if two owners approve at the same instant. The loser gets a clear error and the screen reloads.
- Notifications are readable only by their recipient.
- Only the public `anon` key is used in the browser. The service-role key is never used or stored.

## Known limitations (honest list)
- Requests are readable by all signed-in members (needed to show locked dates and rank fairly). The free-text purpose is visible to them too.
- Trust events can be inserted by any signed-in member. Rules are applied client-side by the loan parties; a malicious member could write bogus events. A production version would move trust scoring into a `security definer` function or Edge Function.
- Reminders and escalations run when a loan party opens the app, not on a server schedule. Notifications are in-app only: no email, SMS or push.
- Photos are resized and stored inside the record (jsonb). Use Supabase Storage for production.
- Email confirmation follows your Supabase Auth setting.

## Private negotiation (v0.4)
- Listings carry an optional `pricePerDay` (₹, 0 = free). Borrowers message the owner and exchange price offers (offer, counter, accept, decline). Accepting sets the rate that the borrower's next request carries.
- The `messages` table has row-level security: only the sender and the recipient can read a message (`supabase/migrations/0002_messages.sql`). Other members, including other borrowers of the same item, cannot see it.
- Prices are agreements between the two people. RELO does not collect or move money.
- Messages are in-app only and polled every 5 seconds while a chat is open (no push or email).

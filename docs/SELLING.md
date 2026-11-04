# Selling and refurbished listings

Each item is `rent`, `sell` or `both` (`Item.mode`; missing means rent, so old data works).
- Sale price, refurbished grade (A like new, B good, C visible wear), warranty months and a note on what was repaired are stored in the item's jsonb `data`. No schema change.
- Sale negotiation uses a separate chat thread (`itemId:buyerId:buy`) so rent and buy offers never mix. Prices are totals, not per day.
- RELO takes no payments. Buyer and owner agree a price in chat, inspect the item and pay directly. The owner then taps Mark as sold, which closes the listing and declines open borrow requests. Only an accepted offer can be recorded as the sale price.
- Sell-only items cannot be borrowed (checked in the store). Grades and warranties are seller claims, not verified by RELO.
- Photos: bundled studio photos live in `apps/web/public/products`; uploads are still resized data URLs.

## Web photos
Ten listings use freely licensed Wikimedia Commons photos, hotlinked and credited on each item page (see `apps/web/lib/catalog.ts`). The stroller and the reference books still use illustrations.

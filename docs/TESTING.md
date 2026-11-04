# Test Plan

## Automated tests included
- Available item with full date coverage is eligible.
- Borrowed item is excluded.
- Partial date coverage is excluded.
- Match score includes a component breakdown.
- Fair request ordering is deterministic and uses access history as a tie-breaker.

Run with `pnpm test`.

## Manual acceptance tests
1. Create two accounts, one lender and one borrower.
2. List an item and discover it from the borrower account.
3. Submit a request with a valid date range.
4. Submit two competing requests for the same item.
5. Approve one request and verify the item becomes reserved exactly once.
6. Attempt a second approval and verify it fails.
7. Start the loan and verify the item becomes borrowed.
8. Set due date in the past in a test environment and run the overdue job.
9. Return the item and verify the item is available again.
10. Verify a user cannot edit another user's listing or inspect unrelated private requests.

## Concurrency test required before production
Send simultaneous approval requests for two pending requests on the same item. Exactly one may succeed. This must be tested against PostgreSQL, not only with mocked unit tests.

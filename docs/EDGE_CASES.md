# Edge-Case Coverage

Legend: **T** = automated test, **E** = end-to-end browser test, **M** = covered in code, not yet tested.

| # | Edge case | Behaviour | Coverage |
|---|---|---|---|
| 1 | Overlapping reservation | Rejected with the clashing range; user may join waitlist | T, E |
| 2 | Request starts in the past / end before start / over 30 days / outside owner window | Inline validation message | T, E |
| 3 | Two requests with identical priority | Deterministic tie-break (submission time, then ID) | T |
| 4 | Earlier request outranked by urgent, trusted one | Higher-priority request ranked first, with explanation | T, E |
| 5 | Approving one request while others overlap | Others move to waitlist (not rejected) | T, E |
| 6 | Approved reservation cancelled | Dates unlock; waitlist returns to review; borrower penalised (-1, or -6 if starts within 24 h) | T (logic), M (UI) |
| 7 | Item unavailable / declined | Next-best alternatives from same and related categories, free for the dates | T, E |
| 8 | Item paused with pending requests | Pending and waitlisted requests closed with notice; blocked if approved/active loans exist | M |
| 9 | Overdue loan | Item stays locked through today; staged reminders/notices; trust penalty on return | T, E |
| 10 | Extension overlaps a reserved loan | Rejected at request and again at approval | M |
| 11 | Extension approved while others are pending on those dates | Clashing pending requests move to waitlist | M |
| 12 | Borrower suspended (14+ days late) | New requests blocked | M |
| 13 | Borrowing own item / duplicate open request | Blocked | M, E (button disabled) |
| 14 | Lending requirements not accepted | Request blocked until all agreed | M |
| 15 | Photo too large / not an image / storage full | Clear error; banner when localStorage quota is hit | M |
| 16 | Trust bounds | Clamped 0-100 | T |
| 17 | No results / no offers / no loans | Helpful empty states | E (search) |
| 18 | Corrupted or old saved data | Falls back to fresh seed | M |

Not covered: concurrent approvals from two tabs/devices (needs a database transaction), clock changes across time zones,
and accessibility testing with a screen reader.

# Matching and Allocation Algorithm

## Match score

`score = 0.35C + 0.30L + 0.20A + 0.15R`

Each component is normalized to 0-100. Location uses Haversine distance and declines to zero at 25 km. Availability is the percentage of requested days covered. Requirement compatibility is the fraction of requested requirements satisfied.

## Hard eligibility filters

A candidate is excluded if:
- its state is not `available`;
- its category does not match;
- it cannot cover the entire requested period; or
- it is beyond 25 km.

## Fair allocation ordering

Sort competing valid requests by match score descending, completed borrow count ascending, prior denials descending, submission time ascending, and ID ascending.

## Complexity

For N listed items, scoring is O(N), plus O(K log K) to sort K eligible candidates. For M competing requests, queue ordering is O(M log M).

## Limitations

- Category compatibility is exact-match in this prototype.
- Distance scoring is straight-line distance, not road travel time.
- Requirement matching is set inclusion, not semantic NLP.
- Environmental impact values must be based on transparent category-specific assumptions and reported as estimates.

import { describe, expect, it } from "vitest";
import { isQuote, quoteRent, quoteSale } from "./payments";
import type { BorrowRequest, Item } from "./domain";

const item = (o: Partial<Item> = {}): Item => ({ id: "i1", ownerId: "o", title: "Drill", description: "", category: "Tools", condition: "Good", areaLabel: "", lat: 0, lon: 0, availableFrom: "2026-01-01", availableUntil: "2027-01-01", requirements: [], active: true, estValue: 1000, createdAt: "", ...o });
const req = (o: Partial<BorrowRequest> = {}): BorrowRequest => ({ id: "r1", itemId: "i1", borrowerId: "b", from: "2026-11-10", until: "2026-11-12", originalUntil: "2026-11-12", purpose: "", urgency: "normal", agreedRequirements: [], submittedAt: "", status: "approved", pricePerDay: 100, ...o });

describe("payment quotes", () => {
  it("charges the agreed sale price, else the listed one", () => {
    expect(quoteSale(item({ mode: "sell", salePrice: 900 }), 800)).toMatchObject({ amountInr: 800 });
    expect(quoteSale(item({ mode: "sell", salePrice: 900 }))).toMatchObject({ amountInr: 900 });
  });
  it("refuses to sell rent-only or sold items", () => {
    expect(isQuote(quoteSale(item()))).toBe(false);
    expect(isQuote(quoteSale(item({ mode: "sell", salePrice: 5, sold: { to: "x", price: 5, at: "" } })))).toBe(false);
  });
  it("charges rate times inclusive days for approved rentals only", () => {
    expect(quoteRent(item(), req())).toMatchObject({ amountInr: 300 });
    expect(isQuote(quoteRent(item(), req({ status: "pending" })))).toBe(false);
    expect(isQuote(quoteRent(item(), req({ pricePerDay: 0 })))).toBe(false);
    expect(isQuote(quoteRent(item(), req({ itemId: "other" })))).toBe(false);
  });
  it("rejects totals outside the allowed range", () => {
    expect(isQuote(quoteSale(item({ mode: "sell", salePrice: 5_000_000 })))).toBe(false);
  });
});

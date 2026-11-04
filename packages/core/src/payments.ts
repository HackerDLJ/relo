import { canSell, inclusiveDays, type BorrowRequest, type Item } from "./domain";

export const MAX_PAYMENT_INR = 1_000_000;

export type Quote = { amountInr: number; description: string };

/** What a buyer owes for a sale: the price agreed in chat if there is one, else the listed price. */
export function quoteSale(item: Item, agreed?: number): Quote | { error: string } {
  if (!canSell(item)) return { error: item.sold ? "This item has already been sold." : "This item isn't for sale." };
  const amount = Math.round(agreed ?? item.salePrice ?? 0);
  if (!(amount >= 1 && amount <= MAX_PAYMENT_INR)) return { error: "No valid sale price to pay." };
  return { amountInr: amount, description: `Purchase: ${item.title}` };
}

/** What a borrower owes for an approved or active rental: stamped daily rate times inclusive days. */
export function quoteRent(item: Item, req: BorrowRequest): Quote | { error: string } {
  if (req.itemId !== item.id) return { error: "That request is for a different item." };
  if (req.status !== "approved" && req.status !== "active") return { error: "Pay once the owner has approved your request." };
  const rate = Math.round(req.pricePerDay ?? 0);
  if (rate <= 0) return { error: "This loan is free, so there is nothing to pay." };
  const days = inclusiveDays(req.from, req.until);
  const amount = rate * days;
  if (!(amount >= 1 && amount <= MAX_PAYMENT_INR)) return { error: "The total is outside the allowed range." };
  return { amountInr: amount, description: `Rental: ${item.title}, ${days} day${days > 1 ? "s" : ""} at ₹${rate}/day` };
}

export const isQuote = (q: Quote | { error: string }): q is Quote => "amountInr" in q;

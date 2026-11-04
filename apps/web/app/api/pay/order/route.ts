import { NextResponse } from "next/server";
import type { BorrowRequest, Item, Message } from "@relo/core/engine";
import { isQuote, quoteRent, quoteSale } from "@relo/core/payments";
import { dealState, threadIdOf } from "@/lib/chat";
import { KEY_ID, asUser, createOrder, payConfigured } from "@/lib/server/pay";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Creates a Razorpay order. The amount is computed here from rows the caller may read, never taken from the browser. */
export async function POST(req: Request) {
  if (!payConfigured()) return bad("Online payments aren't set up yet.", 503);
  const who = await asUser(req);
  if (!who) return bad("Please sign in again.", 401);
  const body = (await req.json().catch(() => null)) as { kind?: string; itemId?: string; requestId?: string } | null;
  if (!body?.itemId || (body.kind !== "sale" && body.kind !== "rent")) return bad("Missing details.");
  const c = who.client;

  const { data: irow } = await c.from("items").select("id,data").eq("id", body.itemId).maybeSingle();
  if (!irow) return bad("That item no longer exists.", 404);
  const item = { ...(irow.data as object), id: irow.id } as Item;
  if (item.ownerId === who.userId) return bad("You can't pay for your own item.");

  let quote, requestId: string | undefined;
  if (body.kind === "sale") {
    const { data: mrows } = await c.from("messages").select("id,data").eq("thread_id", threadIdOf(item.id, who.userId, "buy"));
    const msgs = (mrows ?? []).map((m) => ({ ...(m.data as object), id: m.id }) as Message).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    quote = quoteSale(item, dealState(msgs).agreed);
  } else {
    if (!body.requestId) return bad("Missing the request.");
    const { data: rrow } = await c.from("requests").select("id,data").eq("id", body.requestId).eq("borrower_id", who.userId).maybeSingle();
    if (!rrow) return bad("Request not found.", 404);
    requestId = rrow.id;
    quote = quoteRent(item, { ...(rrow.data as object), id: rrow.id } as BorrowRequest);
  }
  if (!isQuote(quote)) return bad(quote.error);

  // One payment per purchase or per rental.
  let dup = c.from("payments").select("id").eq("item_id", item.id).eq("buyer_id", who.userId).eq("kind", body.kind);
  if (requestId) dup = dup.eq("request_id", requestId);
  const { data: already } = await dup.limit(1);
  if (already && already.length) return bad("You've already paid for this.");

  try {
    const order = await createOrder(quote.amountInr, `${body.kind}-${item.id}`, {
      kind: body.kind, itemId: item.id, requestId: requestId ?? "", buyerId: who.userId, sellerId: item.ownerId, amountInr: String(quote.amountInr),
    });
    return NextResponse.json({ orderId: order.id, amountInr: quote.amountInr, keyId: KEY_ID, description: quote.description });
  } catch (e) {
    return bad((e as Error).message, 502);
  }
}

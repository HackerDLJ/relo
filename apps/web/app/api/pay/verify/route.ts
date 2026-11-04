import { NextResponse } from "next/server";
import { admin, asUser, fetchOrder, payConfigured, signatureValid } from "@/lib/server/pay";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Confirms a payment: checks Razorpay's signature, re-reads the order from Razorpay, then records it. */
export async function POST(req: Request) {
  if (!payConfigured()) return bad("Online payments aren't set up yet.", 503);
  const who = await asUser(req);
  if (!who) return bad("Please sign in again.", 401);
  const b = (await req.json().catch(() => null)) as { orderId?: string; paymentId?: string; signature?: string } | null;
  if (!b?.orderId || !b.paymentId || !b.signature) return bad("Missing payment details.");
  if (!signatureValid(b.orderId, b.paymentId, b.signature)) return bad("Payment could not be verified.", 400);

  try {
    const order = await fetchOrder(b.orderId);
    const n = order.notes ?? {};
    if (n.buyerId !== who.userId) return bad("This payment belongs to someone else.", 403);
    if (!(order.amount_paid > 0) || order.amount_paid !== order.amount) return bad("The payment isn't complete yet.", 409);
    const amount = Math.round(order.amount_paid / 100);
    const payment = {
      id: `pay_${b.paymentId}`, kind: n.kind, itemId: n.itemId, requestId: n.requestId || undefined, buyerId: n.buyerId, sellerId: n.sellerId,
      amount, orderId: b.orderId, paymentId: b.paymentId, paidAt: new Date().toISOString(),
    };
    const { error } = await admin().from("payments").upsert({
      id: payment.id, kind: payment.kind, item_id: payment.itemId, request_id: payment.requestId ?? null, buyer_id: payment.buyerId, seller_id: payment.sellerId,
      amount, razorpay_order_id: b.orderId, razorpay_payment_id: b.paymentId, data: payment,
    }, { onConflict: "razorpay_payment_id" });
    if (error) return bad("Payment received but could not be saved. Contact support with id " + b.paymentId, 500);
    return NextResponse.json({ payment });
  } catch (e) {
    return bad((e as Error).message, 502);
  }
}

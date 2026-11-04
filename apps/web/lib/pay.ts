"use client";
import { remoteEnabled, sb } from "./remote";

export const payEnabled = remoteEnabled && Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

type RzpOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; theme: { color: string }; handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void; modal: { ondismiss: () => void } };
declare global { interface Window { Razorpay?: new (o: RzpOptions) => { open(): void } } }

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => res(); s.onerror = () => rej(new Error("Couldn't load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const { data } = await sb().auth.getSession();
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? "Payment failed. Please try again.");
  return j;
}

/** Opens Razorpay Checkout for a sale or a rental. Resolves true when the payment was verified and saved. */
export async function startPayment(input: { kind: "sale" | "rent"; itemId: string; requestId?: string; payer: string }): Promise<boolean> {
  const order = await call<{ orderId: string; amountInr: number; keyId: string; description: string }>("/api/pay/order", input);
  await loadScript();
  return new Promise<boolean>((resolve, reject) => {
    new window.Razorpay!({
      key: order.keyId, order_id: order.orderId, amount: order.amountInr * 100, currency: "INR", name: "RELO", description: order.description, theme: { color: "#061B3A" },
      handler: (r) => { call("/api/pay/verify", { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).then(() => resolve(true), reject); },
      modal: { ondismiss: () => resolve(false) },
    }).open();
  });
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const payConfigured = () => Boolean(URL && ANON && KEY_ID && KEY_SECRET && SERVICE);

/** A Supabase client that acts as the caller, so row-level security limits what we can read. */
export async function asUser(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  if (!token) return null;
  const c = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await c.auth.getUser(token);
  if (error || !data.user) return null;
  return { client: c, userId: data.user.id };
}

export const admin = () => createClient(URL, SERVICE, { auth: { persistSession: false } });

const basic = () => "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

export async function createOrder(amountInr: number, receipt: string, notes: Record<string, string>) {
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: basic() },
    body: JSON.stringify({ amount: amountInr * 100, currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
  if (!r.ok) throw new Error(`Razorpay refused the order (${r.status}).`);
  return (await r.json()) as { id: string; amount: number; notes: Record<string, string> };
}

export async function fetchOrder(id: string) {
  const r = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(id)}`, { headers: { Authorization: basic() } });
  if (!r.ok) throw new Error(`Could not read the Razorpay order (${r.status}).`);
  return (await r.json()) as { id: string; amount: number; amount_paid: number; notes: Record<string, string> };
}

/** Razorpay signs "order_id|payment_id" with the key secret. */
export function signatureValid(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

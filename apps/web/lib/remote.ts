import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, type AppNotification, type BorrowRequest, type Message, type Item, type Need, type Offer, type TrustEvent, type User } from "@relo/core/engine";
import type { AppState } from "./seed";
import { sampleData } from "./samples";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase is configured. Otherwise the app runs in local demo mode. */
export const remoteEnabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!client) {
    if (!URL || !KEY) throw new Error("Supabase is not configured");
    client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

export function emptyState(): AppState {
  return { version: 1, users: [], items: [], requests: [], needs: [], offers: [], trustEvents: [], notifications: [], messages: [], settings: DEFAULT_SETTINGS, currentUserId: "", clockOffset: 0, seededOn: "" };
}

type Row = { id: string; data: Record<string, unknown> };
const unwrap = <T,>(res: { data: unknown; error: { message: string } | null }, what: string): T[] => {
  if (res.error) throw new Error(`Could not load ${what}: ${res.error.message}`);
  return (res.data ?? []) as T[];
};

/** Loads everything the signed-in user is allowed to see. Returns null when they have no profile yet. */
export async function loadRemote(userId: string): Promise<AppState | null> {
  const c = sb();
  const [p, i, r, n, o, t, nt, mg] = await Promise.all([
    c.from("profiles").select("id,data,settings"),
    c.from("items").select("id,data").order("created_at", { ascending: false }).limit(2000),
    c.from("requests").select("id,data").order("created_at", { ascending: false }).limit(5000),
    c.from("needs").select("id,data").order("created_at", { ascending: false }).limit(1000),
    c.from("offers").select("id,data").order("created_at", { ascending: false }).limit(2000),
    c.from("trust_events").select("id,data").limit(10000),
    c.from("notifications").select("id,data").order("created_at", { ascending: false }).limit(200),
    c.from("messages").select("id,data").order("created_at", { ascending: true }).limit(5000),
  ]);
  const profiles = unwrap<Row & { settings: Record<string, number> }>(p, "profiles");
  const mine = profiles.find((x) => x.id === userId);
  if (!mine) return null;
  const withId = <T,>(rows: Row[]) => rows.map((x) => ({ ...(x.data as object), id: x.id }) as T);
  const realItems = withId<Item>(unwrap<Row>(i, "items"));
  // Pad a quiet neighbourhood with clearly labelled sample listings (browser-only).
  const sample = realItems.filter((x) => x.active).length < 12 ? sampleData() : { users: [] as User[], items: [] as Item[], trustEvents: [] as TrustEvent[] };
  return {
    version: 1,
    users: [...profiles.map((x) => ({ ...(x.data as object), id: x.id }) as User), ...sample.users],
    items: [...realItems, ...sample.items],
    requests: withId<BorrowRequest>(unwrap<Row>(r, "requests")),
    needs: withId<Need>(unwrap<Row>(n, "needs")),
    offers: withId<Offer>(unwrap<Row>(o, "offers")),
    trustEvents: [...withId<TrustEvent>(unwrap<Row>(t, "trust events")), ...sample.trustEvents],
    notifications: withId<AppNotification>(unwrap<Row>(nt, "notifications")),
    messages: withId<Message>(unwrap<Row>(mg, "messages")),
    settings: { ...DEFAULT_SETTINGS, ...(mine.settings ?? {}) },
    currentUserId: userId,
    clockOffset: 0,
    seededOn: "",
  };
}

type Table = { name: string; key: "items" | "requests" | "needs" | "offers" | "trustEvents" | "notifications" | "messages"; cols: (x: never) => Record<string, unknown> };
const TABLES: Table[] = [
  { name: "items", key: "items", cols: ((x: Item) => ({ owner_id: x.ownerId })) as never },
  { name: "needs", key: "needs", cols: ((x: Need) => ({ borrower_id: x.borrowerId })) as never },
  { name: "requests", key: "requests", cols: ((x: BorrowRequest) => ({ item_id: x.itemId, borrower_id: x.borrowerId, status: x.status, from_d: x.from, until_d: x.until })) as never },
  { name: "offers", key: "offers", cols: ((x: Offer) => ({ need_id: x.needId, owner_id: x.ownerId })) as never },
  { name: "trust_events", key: "trustEvents", cols: ((x: TrustEvent) => ({ user_id: x.userId })) as never },
  { name: "messages", key: "messages", cols: ((x: Message) => ({ thread_id: x.threadId, sender_id: x.fromId, recipient_id: x.toId })) as never },
  { name: "notifications", key: "notifications", cols: ((x: AppNotification) => ({ user_id: x.userId })) as never },
];

/** Writes the difference between two states. Throws a readable message on failure. */
export async function persistDiff(prev: AppState, next: AppState, userId: string): Promise<void> {
  const c = sb();
  for (const t of TABLES) {
    const before = new Map((prev[t.key] as { id: string }[]).map((x) => [x.id, JSON.stringify(x)]));
    for (const row of next[t.key] as { id: string }[]) {
      if (row.id.startsWith("s-")) continue; // browser-only sample data
      const json = JSON.stringify(row);
      const old = before.get(row.id);
      if (old === json) continue;
      // Notifications about other people are insert-only; we can't edit them.
      if (t.key === "notifications" && old && (row as unknown as AppNotification).userId !== userId) continue;
      if (t.key === "messages" && old && (row as unknown as Message).toId !== userId) continue;
      const cols = (t.cols as (x: unknown) => Record<string, unknown>)(row);
      if (old === undefined) {
        const { error } = await c.from(t.name).insert({ id: row.id, ...cols, data: row });
        if (error && error.code !== "23505") throw explain(error, t.name);
      } else {
        const { error } = await c.from(t.name).update({ ...cols, data: row }).eq("id", row.id);
        if (error) throw explain(error, t.name);
      }
    }
  }
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    const { error } = await c.from("profiles").update({ settings: next.settings }).eq("id", userId);
    if (error) throw explain(error, "profiles");
  }
}

function explain(e: { message: string; code?: string }, table: string): Error {
  if (e.code === "23P01") return new Error("Those dates were just reserved by someone else, so the change was not saved. Pick other dates or join the waitlist.");
  if (e.code === "42501") return new Error(`You don't have permission to change that (${table}).`);
  return new Error(e.message);
}

export async function createProfile(user: User): Promise<void> {
  const { id, ...data } = user;
  const { error } = await sb().from("profiles").insert({ id, data });
  if (error) throw new Error(error.message);
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addDays,
  daysBetween,
  findConflict,
  isFullyAvailable,
  latePenalty,
  overdueStatus,
  requestsToWaitlist,
  summarizeTrust,
  trustOf as trustOfEvents,
  validateBorrowDates,
  waitlistToReopen,
  type AppNotification,
  type BorrowRequest,
  type Condition,
  type Item,
  type Need,
  type Settings,
  type Urgency,
} from "@relo/core/engine";
import { createSeed, realToday, STATE_VERSION, type AppState } from "./seed";
import { createProfile as saveProfile, emptyState, loadRemote, persistDiff, remoteEnabled, sb } from "./remote";
import { AREA_COORDS } from "./areas";
import { useToast } from "@/components/toast";

const KEY = "relo.state.v1";

export type Result = { ok: true; message: string; id?: string } | { ok: false; error: string };
const ok = (message: string, id?: string): Result => ({ ok: true, message, id });
const fail = (error: string): Result => ({ ok: false, error });

let counter = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const nowIso = () => new Date().toISOString();

const todayOf = (s: AppState) => addDays(realToday(), s.clockOffset);

/* ------------------------------------------------------------ helpers */

function notify(s: AppState, userId: string, kind: AppNotification["kind"], title: string, body: string): AppState {
  const n: AppNotification = { id: uid("n"), userId, title, body, kind, createdAt: nowIso(), read: false, simulated: true };
  return { ...s, notifications: [n, ...s.notifications].slice(0, 200) };
}

function patchRequest(s: AppState, id: string, patch: Partial<BorrowRequest>): AppState {
  return { ...s, requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

function itemTitle(s: AppState, id: string) {
  return s.items.find((i) => i.id === id)?.title ?? "item";
}
function userName(s: AppState, id: string) {
  return s.users.find((u) => u.id === id)?.name ?? "Someone";
}

/** Run when dates free up: tell waitlisted borrowers and return them to review. */
function reopenWaitlist(s: AppState, itemId: string): AppState {
  const today = todayOf(s);
  const ids = waitlistToReopen(s.requests, itemId, today);
  let next = s;
  for (const id of ids) {
    const r = next.requests.find((x) => x.id === id)!;
    next = patchRequest(next, id, { status: "pending" });
    next = notify(next, r.borrowerId, "waitlist", "Your waitlisted dates are free",
      `${itemTitle(next, itemId)} is available for ${r.from} to ${r.until}. Your request is back with the owner for review, keeping your place.`);
    const owner = next.items.find((i) => i.id === itemId)!.ownerId;
    next = notify(next, owner, "request", "Waitlisted request reopened", `${userName(next, r.borrowerId)}'s request for ${itemTitle(next, itemId)} is ready to review again.`);
  }
  return next;
}

/** Idempotent: reminders once per day, each overdue stage once. Simulated notifications only. */
export function sweep(s: AppState, onlyUser?: string): AppState {
  const today = todayOf(s);
  let next = s;
  for (const r of s.requests) {
    if (r.status !== "active") continue;
    // With a shared database only the two people on a loan process it, so rules never run twice.
    if (onlyUser && r.borrowerId !== onlyUser && s.items.find((i) => i.id === r.itemId)?.ownerId !== onlyUser) continue;
    const st = overdueStatus(r, today, next.settings);
    const title = itemTitle(next, r.itemId);
    const owner = next.items.find((i) => i.id === r.itemId)!.ownerId;
    if ((st.stage === "reminder" || st.stage === "due_today") && r.reminderSentAt !== today) {
      next = patchRequest(next, r.id, { reminderSentAt: today });
      next = notify(next, r.borrowerId, "reminder", `Reminder: ${title}`, `${st.label}. Please return it to ${userName(next, owner)} by ${r.until}.`);
      continue;
    }
    const idx = ({ notice: 1, warning: 2, escalated: 3, suspended: 4 } as Record<string, number>)[st.stage] ?? 0;
    const done = r.escalationStage ?? 0;
    if (idx > done) {
      for (let k = done + 1; k <= idx; k++) {
        if (k === 1) {
          next = notify(next, r.borrowerId, "overdue", `Overdue: ${title}`, `This loan was due ${r.until}. Return it or request an extension to avoid trust penalties.`);
          next = notify(next, owner, "overdue", `${userName(next, r.borrowerId)} is overdue`, `${title} was due ${r.until}. You can approve an extension or wait for the return.`);
          for (const w of next.requests.filter((x) => x.itemId === r.itemId && x.status === "waitlisted")) {
            next = notify(next, w.borrowerId, "waitlist", `${title} is running late`, "The current borrower is overdue. You keep your place in the queue and will be told when it is back.");
          }
        } else if (k === 2) {
          next = notify(next, r.borrowerId, "overdue", `Final warning: ${title}`, `${st.daysLate} days overdue. Your trust score now loses up to ${next.settings.maxTrustPenalty} points on return.`);
        } else if (k === 3) {
          next = {
            ...next,
            trustEvents: [...next.trustEvents, { id: `t-esc-${r.id}`, userId: r.borrowerId, kind: "escalation", delta: -10, date: today, note: `Escalated: ${title} ${st.daysLate} days overdue`, refId: r.id }],
          };
          next = notify(next, r.borrowerId, "escalation", `Escalated: ${title}`, "Community moderators have been flagged (simulated). An extra 10 trust points were deducted.");
          next = notify(next, owner, "escalation", `Escalated: ${title}`, "The overdue loan was escalated to community moderators (simulated).");
        } else if (k === 4) {
          next = notify(next, r.borrowerId, "escalation", "Borrowing suspended", "New borrowing is paused until the overdue item is returned.");
        }
      }
      next = patchRequest(next, r.id, { escalationStage: idx });
    }
  }
  return next;
}

/** A borrower is suspended while any of their loans is far overdue. */
export function isSuspended(s: AppState, userId: string): boolean {
  const today = todayOf(s);
  return s.requests.some((r) => r.borrowerId === userId && r.status === "active" && overdueStatus(r, today, s.settings).stage === "suspended");
}

/* ------------------------------------------------------------- context */

export type NewItemInput = {
  title: string; description: string; category: string; condition: Condition; areaLabel: string;
  availableFrom: string; availableUntil: string; requirements: string[]; estValue: number; photo?: string;
};
export type NewRequestInput = {
  itemId: string; from: string; until: string; purpose: string; urgency: Urgency; agreed: string[]; waitlistIfBooked?: boolean; needId?: string;
};
export type NewNeedInput = {
  title: string; category: string; from: string; until: string; radiusKm: number; details: string; urgency: Urgency;
};

type Actions = {
  switchUser(id: string): Result;
  addItem(i: NewItemInput): Result;
  updateItem(id: string, i: Partial<NewItemInput>): Result;
  toggleItem(id: string): Result;
  submitRequest(i: NewRequestInput): Result;
  decideRequest(id: string, decision: "approve" | "decline" | "waitlist", reason?: string): Result;
  cancelRequest(id: string): Result;
  startLoan(id: string): Result;
  requestExtension(id: string, until: string, reason: string): Result;
  resolveExtension(id: string, approve: boolean): Result;
  confirmReturn(id: string, stars?: number): Result;
  notifyReturned(id: string): Result;
  postNeed(i: NewNeedInput): Result;
  closeNeed(id: string): Result;
  offerItem(needId: string, itemId: string, message: string): Result;
  withdrawOffer(id: string): Result;
  acceptOffer(offerId: string): Result;
  markRead(id?: string): void;
  updateSettings(p: Partial<Settings>): Result;
  advanceDays(n: number): Result;
  resetDemo(): Result;
};

type Ctx = {
  state: AppState;
  hydrated: boolean;
  today: string;
  me: AppState["users"][number];
  trust(userId: string): number;
  actions: Actions;
  persistError: string | null;
  auth: AuthApi;
};

export type AuthStatus = "local" | "loading" | "signedOut" | "needsProfile" | "ready";
export type AuthApi = {
  status: AuthStatus;
  email: string | null;
  metaName: string;
  metaArea: string;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string, name: string, area: string): Promise<string | null>;
  createProfile(name: string, area: string, bio: string): Promise<string | null>;
  signOut(): Promise<void>;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<AppState>(() => (remoteEnabled ? emptyState() : createSeed()));
  const [hydrated, setHydrated] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>(remoteEnabled ? "loading" : "local");
  const [email, setEmail] = useState<string | null>(null);
  const [meta, setMeta] = useState({ name: "", area: "" });
  const ref = useRef(state);
  const uidRef = useRef<string>("");
  const queue = useRef<Promise<void>>(Promise.resolve());

  const reload = useCallback(async () => {
    if (!uidRef.current) return;
    const fresh = await loadRemote(uidRef.current);
    if (!fresh) { setStatus("needsProfile"); return; }
    const swept = sweep(fresh, uidRef.current);
    const prev = ref.current;
    ref.current = swept;
    setState(swept);
    setStatus("ready");
    setHydrated(true);
    if (swept !== fresh) {
      queue.current = queue.current.then(() => persistDiff(fresh, swept, uidRef.current)).catch(() => undefined);
    }
    void prev;
  }, []);

  const save = useCallback((s: AppState, prev: AppState) => {
    if (remoteEnabled) {
      queue.current = queue.current
        .then(() => persistDiff(prev, s, uidRef.current))
        .then(() => setPersistError(null))
        .catch(async (e: Error) => {
          toast.error(e.message);
          setPersistError(e.message);
          try { await reload(); } catch { /* keep optimistic state */ }
        });
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      setPersistError(null);
    } catch {
      setPersistError("Browser storage is full. Recent changes are kept for this session only. Try removing large photos.");
    }
  }, [reload, toast]);

  const commit = useCallback((s: AppState) => {
    const prev = ref.current;
    ref.current = s;
    setState(s);
    save(s, prev);
  }, [save]);

  /* ---- local demo mode (no Supabase configured) ---- */
  useEffect(() => {
    if (remoteEnabled) return;
    let s: AppState | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.version === STATE_VERSION && Array.isArray(parsed.items)) s = parsed;
      }
    } catch {
      s = null;
    }
    const base = sweep(s ?? createSeed());
    ref.current = base;
    setState(base);
    localStorage.setItem(KEY, JSON.stringify(base));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (remoteEnabled) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as AppState;
        ref.current = parsed;
        setState(parsed);
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---- real accounts via Supabase ---- */
  useEffect(() => {
    if (!remoteEnabled) return;
    const c = sb();
    let alive = true;
    const apply = async (session: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } } | null) => {
      if (!alive) return;
      if (!session) {
        uidRef.current = "";
        ref.current = emptyState();
        setState(ref.current);
        setHydrated(false);
        setEmail(null);
        setStatus("signedOut");
        return;
      }
      uidRef.current = session.user.id;
      setEmail(session.user.email ?? null);
      setMeta({ name: String(session.user.user_metadata?.name ?? ""), area: String(session.user.user_metadata?.area ?? "") });
      try { await reload(); } catch (e) { toast.error((e as Error).message); setStatus("signedOut"); }
    };
    void c.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = c.auth.onAuthStateChange((_e, session) => { void apply(session); });
    const poll = window.setInterval(() => { if (uidRef.current && document.visibilityState === "visible") void reload().catch(() => undefined); }, 15000);
    const onVis = () => { if (uidRef.current && document.visibilityState === "visible") void reload().catch(() => undefined); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; sub.subscription.unsubscribe(); window.clearInterval(poll); document.removeEventListener("visibilitychange", onVis); };
  }, [reload, toast]);

  const auth = useMemo<AuthApi>(() => ({
    status, email, metaName: meta.name, metaArea: meta.area,
    async signIn(e, password) {
      const { error } = await sb().auth.signInWithPassword({ email: e.trim(), password });
      return error ? (error.message.includes("Email not confirmed") ? "Please confirm your email first. Check your inbox for the link, then sign in." : error.message) : null;
    },
    async signUp(e, password, name, area) {
      const { data, error } = await sb().auth.signUp({ email: e.trim(), password, options: { data: { name, area } } });
      if (error) return error.message;
      if (!data.session) return "CONFIRM";
      return null;
    },
    async createProfile(name, area, bio) {
      const coords = AREA_COORDS[area];
      if (!coords) return "Choose your neighbourhood.";
      if (name.trim().length < 2) return "Enter your name.";
      try {
        await saveProfile({ id: uidRef.current, name: name.trim(), area, lat: coords[0], lon: coords[1], joined: realToday(), bio: bio.trim() });
        await reload();
        return null;
      } catch (err) { return (err as Error).message; }
    },
    async signOut() { await sb().auth.signOut(); },
  }), [status, email, meta, reload]);

  const actions = useMemo<Actions>(() => {
    const get = () => ref.current;
    const me = () => get().users.find((u) => u.id === get().currentUserId)!;

    const createRequest = (i: NewRequestInput): Result => {
      let s = get();
      const user = me();
      const item = s.items.find((x) => x.id === i.itemId);
      if (!item) return fail("That item no longer exists.");
      if (item.ownerId === user.id) return fail("You can't borrow your own item.");
      if (isSuspended(s, user.id)) return fail("Borrowing is suspended until your overdue item is returned.");
      const today = todayOf(s);
      if (i.purpose.trim().length < 5) return fail("Tell the owner briefly what you'll use it for (at least 5 characters).");
      const missing = item.requirements.filter((r) => !i.agreed.includes(r));
      if (missing.length) return fail(`Please agree to the lending requirements: ${missing.join(", ")}.`);
      const dup = s.requests.find(
        (r) => r.itemId === item.id && r.borrowerId === user.id && ["pending", "waitlisted", "approved", "active"].includes(r.status) && r.from <= i.until && i.from <= r.until,
      );
      if (dup) return fail("You already have an open request for this item on overlapping dates.");
      const check = validateBorrowDates({ item, from: i.from, until: i.until, requests: s.requests, today });
      let status: BorrowRequest["status"] = "pending";
      if (!check.ok) {
        if (check.code === "conflict" && i.waitlistIfBooked) status = "waitlisted";
        else return fail(check.message);
      }
      const r: BorrowRequest = {
        id: uid("r"), itemId: item.id, borrowerId: user.id, from: i.from, until: i.until, originalUntil: i.until,
        purpose: i.purpose.trim(), urgency: i.urgency, agreedRequirements: i.agreed, submittedAt: nowIso(), status, needId: i.needId,
      };
      s = { ...s, requests: [r, ...s.requests] };
      s = notify(s, item.ownerId, "request", status === "waitlisted" ? "New waitlisted request" : "New borrowing request",
        `${user.name} wants ${item.title} from ${i.from} to ${i.until}${status === "waitlisted" ? " (dates currently reserved, so they joined the waitlist)" : ""}.`);
      commit(s);
      return ok(status === "waitlisted" ? "Dates are reserved, so you joined the waitlist. You'll be told if they free up." : "Request sent to the owner.", r.id);
    };

    const actions: Actions = {
      switchUser(id) {
        if (remoteEnabled) return fail("Account switching is only available in local demo mode.");
        if (!get().users.some((u) => u.id === id)) return fail("Unknown account.");
        commit({ ...get(), currentUserId: id });
        return ok(`Switched to ${get().users.find((u) => u.id === id)!.name} (demo account).`);
      },

      addItem(i) {
        const s = get();
        const today = todayOf(s);
        const err = validateItem(i, today);
        if (err) return fail(err);
        const [lat, lon] = jitterArea(i.areaLabel);
        const item: Item = { id: uid("i"), ownerId: me().id, ...i, title: i.title.trim(), description: i.description.trim(), lat, lon, active: true, createdAt: nowIso() };
        commit({ ...s, items: [item, ...s.items] });
        return ok("Your item is live and discoverable.", item.id);
      },

      updateItem(id, patch) {
        const s = get();
        const it = s.items.find((x) => x.id === id);
        if (!it) return fail("Item not found.");
        if (it.ownerId !== me().id) return fail("Only the owner can edit this listing.");
        const merged = { ...it, ...patch };
        const err = validateItem(merged as NewItemInput, todayOf(s), true);
        if (err) return fail(err);
        const locked = s.requests.find((r) => r.itemId === id && (r.status === "approved" || r.status === "active") && (r.from < merged.availableFrom || r.until > merged.availableUntil));
        if (locked) return fail("The new availability window would cut off a reserved loan.");
        let coords: Partial<Item> = {};
        if (patch.areaLabel && patch.areaLabel !== it.areaLabel) { const [lat, lon] = jitterArea(patch.areaLabel); coords = { lat, lon }; }
        commit({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, ...patch, ...coords } : x)) });
        return ok("Listing updated.");
      },

      toggleItem(id) {
        let s = get();
        const it = s.items.find((x) => x.id === id);
        if (!it) return fail("Item not found.");
        if (it.ownerId !== me().id) return fail("Only the owner can change this listing.");
        if (it.active) {
          if (s.requests.some((r) => r.itemId === id && (r.status === "approved" || r.status === "active")))
            return fail("This item has an approved or active loan. Finish or cancel it before pausing the listing.");
          for (const r of s.requests.filter((x) => x.itemId === id && (x.status === "pending" || x.status === "waitlisted"))) {
            s = patchRequest(s, r.id, { status: "declined", declineReason: "Listing paused by the owner", decidedAt: nowIso() });
            s = notify(s, r.borrowerId, "decision", "Listing paused", `${it.title} was paused by the owner, so your request was closed. See similar items in My Borrowing Requests.`);
          }
        }
        s = { ...s, items: s.items.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) };
        commit(s);
        return ok(it.active ? "Listing paused. It no longer appears in Discover." : "Listing is active again.");
      },

      submitRequest: createRequest,

      decideRequest(id, decision, reason) {
        let s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r) return fail("Request not found.");
        const item = s.items.find((i) => i.id === r.itemId)!;
        if (item.ownerId !== me().id) return fail("Only the owner can review this request.");
        if (r.status !== "pending" && r.status !== "waitlisted") return fail(`This request is already ${r.status}.`);
        const today = todayOf(s);
        if (decision === "approve") {
          if (r.from < today) return fail("The start date has already passed. Ask the borrower to resubmit.");
          const clash = findConflict(s.requests, item.id, r.from, r.until, r.id, today);
          if (clash) return fail(`Can't approve: these dates overlap an existing reservation (${clash.from} to ${clash.until}). The request stays on the waitlist.`);
          s = patchRequest(s, id, { status: "approved", decidedAt: nowIso() });
          const approved = s.requests.find((x) => x.id === id)!;
          s = notify(s, r.borrowerId, "decision", "Request approved", `${item.title} is reserved for you, ${r.from} to ${r.until}. Those dates are now locked.`);
          const ids = requestsToWaitlist(s.requests, approved);
          for (const wid of ids) {
            const w = s.requests.find((x) => x.id === wid)!;
            s = patchRequest(s, wid, { status: "waitlisted" });
            s = notify(s, w.borrowerId, "waitlist", "You're on the waitlist", `Another request was approved for dates that overlap yours on ${item.title}. You keep your place and will be told if the dates free up.`);
          }
          if (r.needId) s = { ...s, needs: s.needs.map((n) => (n.id === r.needId ? { ...n, status: "fulfilled" } : n)) };
          commit(s);
          return ok(ids.length ? `Approved. ${ids.length} competing request${ids.length > 1 ? "s were" : " was"} moved to the waitlist.` : "Approved. The dates are now locked.");
        }
        if (decision === "decline") {
          s = patchRequest(s, id, { status: "declined", declineReason: reason?.trim() || "Not available", decidedAt: nowIso() });
          s = notify(s, r.borrowerId, "decision", "Request declined", `${item.title}: ${reason?.trim() || "the owner can't lend it for these dates"}. We found next-best alternatives for you.`);
          commit(s);
          return ok("Declined. The borrower was shown alternatives.");
        }
        if (r.status === "waitlisted") return fail("Already on the waitlist.");
        s = patchRequest(s, id, { status: "waitlisted", decidedAt: nowIso() });
        s = notify(s, r.borrowerId, "waitlist", "Added to the waitlist", `The owner moved your request for ${item.title} to the waitlist.`);
        commit(s);
        return ok("Moved to the waitlist.");
      },

      cancelRequest(id) {
        let s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r) return fail("Request not found.");
        if (r.borrowerId !== me().id) return fail("You can only cancel your own requests.");
        if (!["pending", "waitlisted", "approved"].includes(r.status)) return fail("Only requests that haven't started can be cancelled. For a running loan, return the item.");
        const today = todayOf(s);
        const wasLocked = r.status === "approved";
        s = patchRequest(s, id, { status: "cancelled", decidedAt: nowIso() });
        let msg = "Request cancelled.";
        if (wasLocked) {
          const late = daysBetween(today, r.from) <= 1;
          s = { ...s, trustEvents: [...s.trustEvents, { id: uid("t"), userId: r.borrowerId, kind: late ? "late_cancellation" : "cancellation", delta: late ? -6 : -1, date: today, note: late ? "Cancelled within 24h of start" : "Cancelled in good time", refId: r.id }] };
          msg = late ? "Cancelled. Trust −6 for a cancellation within 24 hours of the start." : "Cancelled. Trust −1 for cancelling an approved loan.";
          s = notify(s, s.items.find((i) => i.id === r.itemId)!.ownerId, "request", "Reservation cancelled", `${userName(s, r.borrowerId)} cancelled ${r.from} to ${r.until} for ${itemTitle(s, r.itemId)}.`);
          s = reopenWaitlist(s, r.itemId);
        }
        commit(s);
        return ok(msg);
      },

      startLoan(id) {
        let s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r) return fail("Request not found.");
        const item = s.items.find((i) => i.id === r.itemId)!;
        if (item.ownerId !== me().id) return fail("Only the owner can record the handover.");
        if (r.status !== "approved") return fail("Only approved loans can start.");
        if (r.from > todayOf(s)) return fail(`This loan starts on ${r.from}. Handover can be recorded from that day.`);
        s = patchRequest(s, id, { status: "active", pickedUpAt: nowIso() });
        s = notify(s, r.borrowerId, "decision", "Borrowing started", `You now have ${item.title}. Please return it by ${r.until}.`);
        commit(s);
        return ok("Handover recorded. The loan is active.");
      },

      requestExtension(id, until, reason) {
        let s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r) return fail("Loan not found.");
        if (r.borrowerId !== me().id) return fail("Only the borrower can request an extension.");
        if (r.status !== "active") return fail("Extensions are for active loans.");
        if (r.extension?.status === "pending") return fail("You already have an extension request awaiting the owner.");
        if (!until || until <= r.until) return fail("Choose a date after the current due date.");
        if (daysBetween(r.until, until) > 7) return fail("Extensions are limited to 7 days at a time.");
        if (reason.trim().length < 5) return fail("Give the owner a short reason (at least 5 characters).");
        const clash = findConflict(s.requests, r.itemId, addDays(r.until, 1), until, r.id);
        if (clash) return fail(`That extension overlaps a reserved loan starting ${clash.from}. Pick an earlier date.`);
        s = patchRequest(s, id, { extension: { requestedUntil: until, reason: reason.trim(), status: "pending", requestedAt: nowIso() } });
        s = notify(s, s.items.find((i) => i.id === r.itemId)!.ownerId, "extension", "Extension requested", `${userName(s, r.borrowerId)} asks to keep ${itemTitle(s, r.itemId)} until ${until}: ${reason.trim()}`);
        commit(s);
        return ok("Extension requested. The owner will review it.");
      },

      resolveExtension(id, approve) {
        let s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r || !r.extension || r.extension.status !== "pending") return fail("No pending extension on this loan.");
        const item = s.items.find((i) => i.id === r.itemId)!;
        if (item.ownerId !== me().id) return fail("Only the owner can decide on extensions.");
        if (!approve) {
          s = patchRequest(s, id, { extension: { ...r.extension, status: "rejected" } });
          s = notify(s, r.borrowerId, "extension", "Extension declined", `${item.title} is still due ${r.until}.`);
          commit(s);
          return ok("Extension declined.");
        }
        const clash = findConflict(s.requests, r.itemId, addDays(r.until, 1), r.extension.requestedUntil, r.id);
        if (clash) return fail("Can't approve: another reservation now overlaps the extended dates.");
        const newUntil = r.extension.requestedUntil;
        s = patchRequest(s, id, { until: newUntil, extension: { ...r.extension, status: "approved" } });
        s = notify(s, r.borrowerId, "extension", "Extension approved", `${item.title} is now due ${newUntil}.`);
        const updated = s.requests.find((x) => x.id === id)!;
        for (const wid of requestsToWaitlist(s.requests, updated)) {
          const w = s.requests.find((x) => x.id === wid)!;
          s = patchRequest(s, wid, { status: "waitlisted" });
          s = notify(s, w.borrowerId, "waitlist", "You're on the waitlist", `${item.title} was extended, so your dates now overlap. You keep your place.`);
        }
        commit(s);
        return ok(`Extension approved. Due date is now ${newUntil}.`);
      },

      confirmReturn(id, stars) {
        let s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r) return fail("Loan not found.");
        const item = s.items.find((i) => i.id === r.itemId)!;
        if (item.ownerId !== me().id) return fail("Only the owner can confirm a return.");
        if (r.status !== "active") return fail("Only active loans can be returned.");
        const today = todayOf(s);
        const late = daysBetween(r.until, today);
        const events = [] as AppState["trustEvents"];
        let msg: string;
        if (late > 0) {
          const pen = latePenalty(late, s.settings);
          events.push({ id: uid("t"), userId: r.borrowerId, kind: "late_return", delta: -pen, date: today, note: `Returned ${late} day${late > 1 ? "s" : ""} late`, refId: r.id });
          msg = `Return confirmed. Borrower trust −${pen} for ${late} day${late > 1 ? "s" : ""} late.`;
        } else if (late < 0) {
          events.push({ id: uid("t"), userId: r.borrowerId, kind: "early_return", delta: 5, date: today, note: "Returned early", refId: r.id });
          msg = "Return confirmed early. Borrower trust +5.";
        } else {
          events.push({ id: uid("t"), userId: r.borrowerId, kind: "on_time_return", delta: 4, date: today, note: "Returned on time", refId: r.id });
          msg = "Return confirmed on time. Borrower trust +4.";
        }
        events.push({ id: uid("t"), userId: item.ownerId, kind: "lend_completed", delta: 3, date: today, note: "Completed a lend", refId: r.id });
        if (stars && stars >= 1 && stars <= 5) events.push({ id: uid("t"), userId: r.borrowerId, kind: "feedback", delta: (stars - 3) * 2, date: today, note: `${stars}-star feedback from the owner`, refId: `${r.id}:${stars}` });
        s = { ...s, trustEvents: [...s.trustEvents, ...events] };
        s = patchRequest(s, id, { status: "returned", returnedAt: today });
        s = notify(s, r.borrowerId, "return", "Return confirmed", `${item.title} is back with ${userName(s, item.ownerId)}. ${msg.replace("Return confirmed. ", "")}`);
        s = reopenWaitlist(s, r.itemId);
        commit(s);
        return ok(msg + " Impact figures updated.");
      },

      notifyReturned(id) {
        let s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r || r.borrowerId !== me().id || r.status !== "active") return fail("Nothing to notify.");
        s = notify(s, s.items.find((i) => i.id === r.itemId)!.ownerId, "return", "Borrower says it's returned", `${userName(s, r.borrowerId)} says ${itemTitle(s, r.itemId)} has been returned. Please confirm in Returns & Overdue.`);
        commit(s);
        return ok("The owner has been asked to confirm your return.");
      },

      postNeed(i) {
        const s = get();
        const today = todayOf(s);
        if (i.title.trim().length < 4) return fail("Give your need a short title.");
        if (!i.category) return fail("Choose a category.");
        if (!i.from || !i.until) return fail("Choose the dates you need it.");
        if (i.from < today) return fail("The start date can't be in the past.");
        if (i.until < i.from) return fail("The end date can't be before the start date.");
        if (daysBetween(i.from, i.until) >= 30) return fail("Needs are limited to 30 days.");
        if (!(i.radiusKm >= 1 && i.radiusKm <= 25)) return fail("Choose a radius between 1 and 25 km.");
        if (i.details.trim().length < 10) return fail("Explain your requirements in a sentence or two.");
        const n: Need = { id: uid("n"), borrowerId: me().id, ...i, title: i.title.trim(), details: i.details.trim(), status: "open", postedAt: nowIso() };
        commit({ ...s, needs: [n, ...s.needs] });
        return ok("Need posted. Owners nearby can now offer items.", n.id);
      },

      closeNeed(id) {
        const s = get();
        const n = s.needs.find((x) => x.id === id);
        if (!n || n.borrowerId !== me().id) return fail("Only the person who posted a need can close it.");
        commit({ ...s, needs: s.needs.map((x) => (x.id === id ? { ...x, status: "closed" } : x)) });
        return ok("Need closed.");
      },

      offerItem(needId, itemId, message) {
        let s = get();
        const n = s.needs.find((x) => x.id === needId);
        const it = s.items.find((x) => x.id === itemId);
        if (!n || !it) return fail("Need or item not found.");
        if (n.status !== "open") return fail("This need is no longer open.");
        if (it.ownerId !== me().id) return fail("You can only offer your own items.");
        if (n.borrowerId === me().id) return fail("You can't offer to your own need.");
        if (s.offers.some((o) => o.needId === needId && o.itemId === itemId && o.status === "open")) return fail("You already offered this item.");
        if (!isFullyAvailable(it, s.requests, n.from, n.until, todayOf(s))) return fail("This item isn't free for the requested dates.");
        const o = { id: uid("o"), needId, itemId, ownerId: me().id, message: message.trim() || "Happy to lend this.", createdAt: nowIso(), status: "open" as const };
        s = { ...s, offers: [o, ...s.offers] };
        s = notify(s, n.borrowerId, "offer", "New offer on your need", `${me().name} offered ${it.title} for "${n.title}".`);
        commit(s);
        return ok("Offer sent. The borrower can compare it with others.", o.id);
      },

      withdrawOffer(id) {
        const s = get();
        const o = s.offers.find((x) => x.id === id);
        if (!o || o.ownerId !== me().id) return fail("Offer not found.");
        commit({ ...s, offers: s.offers.map((x) => (x.id === id ? { ...x, status: "withdrawn" } : x)) });
        return ok("Offer withdrawn.");
      },

      acceptOffer(offerId) {
        const s = get();
        const o = s.offers.find((x) => x.id === offerId);
        if (!o) return fail("Offer not found.");
        const n = s.needs.find((x) => x.id === o.needId)!;
        if (n.borrowerId !== me().id) return fail("Only the person who posted the need can accept offers.");
        const it = s.items.find((i) => i.id === o.itemId)!;
        const res = createRequest({ itemId: it.id, from: n.from, until: n.until, purpose: n.title, urgency: n.urgency, agreed: it.requirements, needId: n.id });
        if (!res.ok) return res;
        commit({ ...get(), offers: get().offers.map((x) => (x.id === offerId ? { ...x, status: "accepted" } : x)) });
        return ok("Offer accepted. A borrowing request was sent to the owner for final approval.", res.id);
      },

      markRead(id) {
        const s = get();
        const uidMe = s.currentUserId;
        commit({ ...s, notifications: s.notifications.map((n) => (n.userId === uidMe && (!id || n.id === id) ? { ...n, read: true } : n)) });
      },

      updateSettings(p) {
        const s = get();
        const next = { ...s.settings, ...p };
        for (const [k, v] of Object.entries(next)) if (!Number.isFinite(v) || (v as number) < 0) return fail(`"${k}" must be a non-negative number.`);
        if (next.maxTrustPenalty > 50) return fail("Maximum late penalty can't exceed 50 points.");
        if (!(next.warningAfterDays <= next.escalationAfterDays && next.escalationAfterDays <= next.suspendAfterDays)) return fail("Stages must be ordered: warning ≤ escalation ≤ suspension.");
        commit({ ...s, settings: next });
        return ok("Overdue rules saved.");
      },

      advanceDays(n) {
        if (remoteEnabled) return fail("The demo clock is only available in local demo mode.");
        if (!Number.isInteger(n) || n < 1 || n > 30) return fail("Advance between 1 and 30 days.");
        const s = { ...get(), clockOffset: get().clockOffset + n };
        commit(sweep(s));
        return ok(`Demo clock moved forward ${n} day${n > 1 ? "s" : ""} (simulated). Reminders and overdue stages were re-evaluated.`);
      },

      resetDemo() {
        if (remoteEnabled) return fail("Reset is only available in local demo mode.");
        const fresh = sweep(createSeed());
        commit(fresh);
        return ok("Demo data reset to the original seed.");
      },
    };
    return actions;
  }, [commit]);

  const value = useMemo<Ctx>(() => {
    const me = state.users.find((u) => u.id === state.currentUserId) ?? state.users[0];
    return {
      state, hydrated, today: todayOf(state), me, persistError, auth,
      trust: (userId: string) => trustOfEvents(state.trustEvents, userId),
      actions,
    };
  }, [state, hydrated, actions, persistError, auth]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}

/** Runs an action and shows the outcome as a toast. Returns the result for follow-up UI. */
export function useAct() {
  const toast = useToast();
  return useCallback(<T extends Result>(fn: () => T): T => {
    const r = fn();
    if (r.ok) toast.success(r.message);
    else toast.error(r.error);
    return r;
  }, [toast]);
}

export function useTrustSummary(userId: string) {
  const { state } = useStore();
  return useMemo(() => summarizeTrust(state.trustEvents.filter((e) => e.userId === userId)), [state.trustEvents, userId]);
}

/* ---------------------------------------------------------- validation */

function validateItem(i: NewItemInput, today: string, partial = false): string | null {
  if (!i.title || i.title.trim().length < 3) return "Give the item a clear name (at least 3 characters).";
  if (!i.category) return "Choose a category.";
  if (!i.description || i.description.trim().length < 10) return "Add a description of at least 10 characters so borrowers know what to expect.";
  if (!i.areaLabel || !AREA_COORDS[i.areaLabel]) return "Choose an approximate location.";
  if (!i.availableFrom || !i.availableUntil) return "Set when the item is available to lend.";
  if (i.availableUntil < i.availableFrom) return "The availability end date can't be before the start date.";
  if (!partial && i.availableUntil < today) return "The availability window has already ended.";
  if (!(i.estValue >= 100 && i.estValue <= 500000)) return "Enter an approximate replacement value between ₹100 and ₹5,00,000 (used only for impact estimates).";
  return null;
}

function jitterArea(area: string): [number, number] {
  const [lat, lon] = AREA_COORDS[area];
  return [lat + (Math.random() - 0.5) * 0.004, lon + (Math.random() - 0.5) * 0.004];
}

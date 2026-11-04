/** Shared domain types and date helpers for the RELO prototype. Pure TypeScript, no I/O. */

export type ISODate = string; // YYYY-MM-DD

export const DAY_MS = 86_400_000;

export const parseDay = (d: ISODate): number => Date.parse(`${d}T00:00:00Z`);
export const toDay = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: ISODate, n: number): ISODate => toDay(parseDay(d) + n * DAY_MS);
export const daysBetween = (a: ISODate, b: ISODate): number => Math.round((parseDay(b) - parseDay(a)) / DAY_MS);
export const inclusiveDays = (from: ISODate, to: ISODate): number => daysBetween(from, to) + 1;
export const isIsoDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(parseDay(d));
/** Inclusive range overlap. ISO dates compare correctly as strings. */
export const rangesOverlap = (aFrom: ISODate, aTo: ISODate, bFrom: ISODate, bTo: ISODate): boolean =>
  aFrom <= bTo && bFrom <= aTo;

export const CATEGORIES = [
  "Tools",
  "Outdoor & Sports",
  "Electronics",
  "Kitchen",
  "Books & Study",
  "Furniture & Home",
  "Travel",
  "Party & Events",
  "Garden",
  "Baby & Kids",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Categories that can plausibly substitute for each other when an item is unavailable. */
export const RELATED_CATEGORIES: Record<string, string[]> = {
  Tools: ["Garden", "Furniture & Home"],
  "Outdoor & Sports": ["Travel", "Garden"],
  Electronics: ["Books & Study"],
  Kitchen: ["Party & Events"],
  "Books & Study": ["Electronics"],
  "Furniture & Home": ["Tools", "Party & Events"],
  Travel: ["Outdoor & Sports"],
  "Party & Events": ["Kitchen", "Furniture & Home"],
  Garden: ["Tools", "Outdoor & Sports"],
  "Baby & Kids": [],
};

export type Condition = "Like new" | "Good" | "Fair" | "Well used";
export const CONDITIONS: Condition[] = ["Like new", "Good", "Fair", "Well used"];

export type Urgency = "low" | "normal" | "urgent";

export type User = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  joined: ISODate;
  bio: string;
  /** True only for simulated people in local demo mode. */
  demo?: boolean;
};

/** How an item is offered: lent for a daily price (or free), sold, or both. */
export type ListingMode = "rent" | "sell" | "both";
export const LISTING_MODES: ListingMode[] = ["rent", "sell", "both"];
/** A = like new after refurbishing, B = fully working with light wear, C = fully working, visible wear. */
export type RefurbGrade = "A" | "B" | "C";
export type Refurb = { grade: RefurbGrade; warrantyMonths: number; work: string };

export const canRent = (i: { mode?: ListingMode }) => (i.mode ?? "rent") !== "sell";
export const canSell = (i: { mode?: ListingMode; sold?: unknown }) => (i.mode ?? "rent") !== "rent" && !i.sold;

export type Item = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  condition: Condition;
  areaLabel: string;
  lat: number;
  lon: number;
  availableFrom: ISODate;
  availableUntil: ISODate;
  requirements: string[]; // lending requirements set by owner, e.g. "Return cleaned"
  active: boolean;
  /** Data URL of an owner-uploaded photo (stored locally in the prototype). */
  photo?: string;
  /** Assumed replacement value in INR, used only for impact estimates. */
  estValue: number;
  /** Rental asking price in INR per day. 0 or missing means free to borrow. Negotiable in private messages. */
  pricePerDay?: number;
  /** Defaults to "rent" when missing so older listings keep working. */
  mode?: ListingMode;
  /** Asking price in INR when the item is for sale. Negotiable in private messages. */
  salePrice?: number;
  /** Present when the item was repaired or restored before being offered again. */
  refurb?: Refurb;
  /** Set when the owner records a completed sale. Sold items leave Discover. */
  sold?: { to: string; price: number; at: string };
  createdAt: string;
};

export type RequestStatus =
  | "pending"
  | "approved"
  | "waitlisted"
  | "declined"
  | "active"
  | "returned"
  | "cancelled";

export type ExtensionStatus = "pending" | "approved" | "rejected";

export type BorrowRequest = {
  id: string;
  itemId: string;
  borrowerId: string;
  from: ISODate;
  until: ISODate; // current due date (updated when an extension is approved)
  originalUntil: ISODate;
  purpose: string;
  urgency: Urgency;
  /** Requirements the borrower agrees they can meet. */
  agreedRequirements: string[];
  submittedAt: string;
  status: RequestStatus;
  decidedAt?: string;
  declineReason?: string;
  pickedUpAt?: string;
  returnedAt?: ISODate;
  needId?: string;
  /** Rate in INR per day agreed in private messages (or the listed price) when the request was sent. */
  pricePerDay?: number;
  extension?: { requestedUntil: ISODate; reason: string; status: ExtensionStatus; requestedAt: string };
  reminderSentAt?: string;
  escalationStage?: number;
};

export type Need = {
  id: string;
  borrowerId: string;
  title: string;
  category: string;
  from: ISODate;
  until: ISODate;
  radiusKm: number;
  details: string;
  urgency: Urgency;
  status: "open" | "fulfilled" | "closed";
  postedAt: string;
};

export type Offer = {
  id: string;
  needId: string;
  itemId: string;
  ownerId: string;
  message: string;
  createdAt: string;
  status: "open" | "accepted" | "withdrawn";
};

export type TrustKind =
  | "on_time_return"
  | "early_return"
  | "late_return"
  | "lend_completed"
  | "feedback"
  | "late_cancellation"
  | "cancellation"
  | "escalation";

export type TrustEvent = {
  id: string;
  userId: string;
  kind: TrustKind;
  delta: number;
  date: ISODate;
  note: string;
  refId?: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Always true in the prototype: no email/SMS/push is actually delivered. */
  simulated: true;
  kind: "reminder" | "overdue" | "waitlist" | "request" | "decision" | "extension" | "offer" | "return" | "escalation";
};

export type Settings = {
  graceDays: number;
  trustPenaltyPerDay: number;
  maxTrustPenalty: number;
  reminderDaysBefore: number;
  warningAfterDays: number;
  escalationAfterDays: number;
  suspendAfterDays: number;
};

export const DEFAULT_SETTINGS: Settings = {
  graceDays: 0,
  trustPenaltyPerDay: 2,
  maxTrustPenalty: 20,
  reminderDaysBefore: 2,
  warningAfterDays: 3,
  escalationAfterDays: 7,
  suspendAfterDays: 14,
};

/** A private message between one item's owner and one prospective borrower. */
export type Message = {
  id: string;
  /** `${itemId}:${borrowerId}` */
  threadId: string;
  itemId: string;
  fromId: string;
  toId: string;
  kind: "text" | "offer" | "accept" | "decline";
  body: string;
  /** INR per day, for offer and accept messages. */
  price?: number;
  createdAt: string;
  readAt?: string;
};

/** A completed online payment. Written only by the server after Razorpay confirms it; clients can read, never write. */
export type Payment = {
  id: string;
  kind: "sale" | "rent";
  itemId: string;
  requestId?: string;
  buyerId: string;
  sellerId: string;
  /** Whole rupees. */
  amount: number;
  orderId: string;
  paymentId: string;
  paidAt: string;
};

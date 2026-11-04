import {
  DEFAULT_SETTINGS,
  type Message,
  addDays,
  type AppNotification,
  type BorrowRequest,
  type Condition,
  type Item,
  type Need,
  type Offer,
  type Payment,
  type Settings,
  type TrustEvent,
  type Urgency,
  type User,
} from "@relo/core/engine";
import { AREA_COORDS } from "./areas";
import { PHOTO_BY_TITLE, SALE_LISTINGS } from "./catalog";

export type AppState = {
  version: number;
  users: User[];
  items: Item[];
  payments: Payment[];
  requests: BorrowRequest[];
  needs: Need[];
  offers: Offer[];
  trustEvents: TrustEvent[];
  notifications: AppNotification[];
  messages: Message[];
  settings: Settings;
  currentUserId: string;
  /** Days added to the real date so overdue flows can be demonstrated. Simulated. */
  clockOffset: number;
  seededOn: string;
};

export const STATE_VERSION = 2;

export function realToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const ts = (day: string, hour = 9) => `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;

const AREAS = AREA_COORDS;

export function createSeed(): AppState {
  const T = realToday();
  const d = (n: number) => addDays(T, n);

  const mk = (id: string, name: string, area: keyof typeof AREAS, joinedAgo: number, bio: string): User => ({
    id, name, area, lat: AREAS[area][0], lon: AREAS[area][1], joined: d(-joinedAgo), bio, demo: true,
  });
  const users: User[] = [
    mk("u1", "Meera Iyer", "Maharajanagar", 210, "Lends tools and kitchenware. Always borrowing for weekend projects."),
    mk("u2", "Arun Pandian", "Palayamkottai", 180, "Cyclist and gadget fan. Happy to lend, sometimes slow to return."),
    mk("u3", "Kavin Raj", "Thachanallur", 150, "Photographer and weekend camper."),
    mk("u4", "Divya Nair", "Vannarpettai", 240, "Engineering student. Shares books and study gear."),
    mk("u5", "Syed Ibrahim", "Melapalayam", 40, "New to RELO. Lends event and garden equipment."),
    mk("u6", "Lakshmi Priya", "Perumalpuram", 120, "Parent of two. Lends baby and travel gear."),
  ];

  let n = 0;
  const item = (
    ownerId: string, title: string, category: string, condition: Condition, estValue: number,
    description: string, requirements: string[], area: keyof typeof AREAS,
  ): Item => {
    n++;
    const jitter = (n % 5) * 0.0011;
    return {
      id: `i${n}`, ownerId, title, description, category, condition, areaLabel: area,
      lat: AREAS[area][0] + jitter, lon: AREAS[area][1] - jitter,
      availableFrom: d(-60), availableUntil: d(90), requirements, active: true, estValue,
      createdAt: ts(d(-50 + n)),
    };
  };
  const items: Item[] = [
    item("u1", "Cordless drill with bit set", "Tools", "Good", 4500, "18V cordless drill, two batteries, 30-piece bit set and carry case. Good for shelves and light drilling.", ["Return charged", "Handle with care"], "Maharajanagar"),
    item("u1", "7L pressure cooker", "Kitchen", "Good", 2800, "Stainless steel 7 litre pressure cooker, works on gas and induction. Suits large family events.", ["Return cleaned"], "Maharajanagar"),
    item("u2", "Mountain bicycle (21-speed)", "Outdoor & Sports", "Good", 14000, "Medium frame, recently serviced. Helmet available on request.", ["Helmet recommended", "Return cleaned"], "Palayamkottai"),
    item("u2", "8 ft extension ladder", "Tools", "Fair", 5500, "Lightweight aluminium ladder, extends to 8 ft. Painting and tube-light jobs.", ["Pickup only", "Return cleaned"], "Palayamkottai"),
    item("u3", "DSLR camera kit", "Electronics", "Like new", 38000, "DSLR body, 18-55mm lens, 2 batteries, 64GB card and bag.", ["ID shown at pickup", "Return charged"], "Thachanallur"),
    item("u3", "Tunnel camping tent (2-3 person)", "Outdoor & Sports", "Good", 6500, "Waterproof tunnel tent with flysheet and pegs. Pitches in 10 minutes.", ["Return dry and cleaned"], "Thachanallur"),
    item("u4", "Engineering mathematics reference set", "Books & Study", "Good", 2400, "Three-volume set with solved problems. Light pencil notes only.", ["No highlighting"], "Vannarpettai"),
    item("u4", "Folding study table", "Furniture & Home", "Good", 3200, "Foldable laptop and study table, adjustable height.", ["Pickup only"], "Vannarpettai"),
    item("u5", "Portable party speaker with lights", "Party & Events", "Good", 9000, "Rechargeable party speaker with RGB lights, phone stand and wireless microphone. Suits small events and classes.", ["Return charged", "ID shown at pickup"], "Melapalayam"),
    item("u5", "Garden sprayer pump (16L)", "Garden", "Fair", 2200, "Manual 16L backpack sprayer.", ["Return cleaned"], "Melapalayam"),
    item("u6", "Baby stroller", "Baby & Kids", "Good", 7000, "Foldable stroller with rain cover, cleaned and sanitised between loans.", ["Return cleaned"], "Perumalpuram"),
    item("u6", "28-inch travel suitcase", "Travel", "Good", 4200, "Hard-shell trolley suitcase with TSA lock.", ["Return cleaned"], "Perumalpuram"),
    item("u2", "1080p projector", "Electronics", "Like new", 22000, "Full HD projector with HDMI cable and tripod screen. Good for presentations.", ["Return charged", "Handle with care"], "Palayamkottai"),
    item("u5", "Impact drill with bits", "Tools", "Good", 3800, "Corded impact drill, masonry and wood bit set.", ["Return cleaned", "Handle with care"], "Melapalayam"),
    item("u4", "40-piece hand tool kit", "Tools", "Good", 3000, "Spanners, screwdrivers, pliers, hammer and level in a case.", ["Return complete"], "Vannarpettai"),
    item("u3", "Mini projector (720p)", "Electronics", "Good", 9000, "Compact projector, good for small rooms and demos.", ["Return charged"], "Thachanallur"),
  ];
  const PRICES: [string, number][] = [["Cordless", 80], ["7L", 0], ["Mountain", 150], ["8 ft", 100], ["DSLR", 600], ["Tunnel", 200], ["Engineering", 0], ["Folding", 0], ["Portable party", 400], ["Garden", 0], ["Baby", 120], ["28-inch", 100], ["1080p", 500], ["Impact", 60], ["40-piece", 0], ["Mini", 250]];
  for (const it of items) it.pricePerDay = PRICES.find(([k]) => it.title.startsWith(k))?.[1] ?? 0;
  for (const it of items) it.photo = PHOTO_BY_TITLE.find(([k]) => it.title.startsWith(k))?.[1];
  const sellers = ["u1", "u2", "u3", "u4", "u5", "u6"];
  SALE_LISTINGS.forEach((l, k) => {
    const o = users.find((u) => u.id === sellers[k % sellers.length])!;
    n++;
    items.push({
      id: `i${n}`, ownerId: o.id, title: l.title, description: l.description, category: l.category, condition: l.condition, areaLabel: o.area,
      lat: o.lat + (n % 5) * 0.0011, lon: o.lon - (n % 5) * 0.0011, availableFrom: d(-60), availableUntil: d(180), requirements: l.requirements, active: true, estValue: l.estValue,
      createdAt: ts(d(-30 + k)), mode: l.mode, pricePerDay: l.pricePerDay ?? 0, salePrice: l.salePrice, refurb: l.refurb, photo: l.photo,
    });
  });
  const itemId = (title: string) => items.find((i) => i.title.startsWith(title))!.id;
  const I = {
    drill: itemId("Cordless drill"), cooker: itemId("7L"), bike: itemId("Mountain"), ladder: itemId("8 ft"),
    camera: itemId("DSLR"), tent: itemId("Tunnel"), books: itemId("Engineering"), table: itemId("Folding"),
    pa: itemId("Portable party"), sprayer: itemId("Garden"), stroller: itemId("Baby"), suitcase: itemId("28-inch"),
    proj: itemId("1080p"), impact: itemId("Impact"), kit: itemId("40-piece"), mini: itemId("Mini"),
  };
  const owner = (id: string) => items.find((i) => i.id === id)!.ownerId;

  const requests: BorrowRequest[] = [];
  const trustEvents: TrustEvent[] = [];
  let rq = 0;
  const addReq = (r: Partial<BorrowRequest> & Pick<BorrowRequest, "itemId" | "borrowerId" | "from" | "until" | "status">): BorrowRequest => {
    rq++;
    const full: BorrowRequest = {
      id: `r${rq}`, purpose: "Weekend use", urgency: "normal", agreedRequirements: [], originalUntil: r.until,
      submittedAt: ts(addDays(r.from, -3)), ...r,
    };
    requests.push(full);
    return full;
  };
  let te = 0;
  const ev = (userId: string, kind: TrustEvent["kind"], delta: number, date: string, note: string, refId?: string) =>
    trustEvents.push({ id: `t${++te}`, userId, kind, delta, date, note, refId });

  // History: [borrower, item, startDaysAgo, length, lateDays (negative = early), feedback stars]
  const history: [string, string, number, number, number, number?][] = [
    ["u1", I.bike, 40, 3, 0, 5], ["u1", I.camera, 33, 2, -1, 5], ["u1", I.books, 25, 7, 0, 4], ["u1", I.suitcase, 18, 4, 0, 5],
    ["u2", I.drill, 45, 2, 0, 4], ["u2", I.pa, 30, 2, 3, 3], ["u2", I.books, 22, 5, 0, 4], ["u2", I.impact, 15, 2, 2, 3],
    ["u3", I.cooker, 38, 2, 0, 4], ["u3", I.table, 27, 3, 0, 5], ["u3", I.suitcase, 12, 5, 4, 3],
    ["u4", I.drill, 36, 2, 0, 5], ["u4", I.bike, 28, 3, 0, 5], ["u4", I.tent, 20, 3, 0, 5], ["u4", I.sprayer, 10, 2, 0, 4],
    ["u5", I.ladder, 24, 2, 0, 4],
    ["u6", I.drill, 29, 2, 0, 5], ["u6", I.books, 14, 3, 0, 4], ["u6", I.proj, 8, 1, 0, 5],
  ];
  for (const [b, it, ago, len, late, stars] of history) {
    const from = d(-ago);
    const until = addDays(from, len - 1);
    const returnedAt = addDays(until, late);
    const r = addReq({ itemId: it, borrowerId: b, from, until, status: "returned", returnedAt, pickedUpAt: ts(from), decidedAt: ts(addDays(from, -2)) });
    const o = owner(it);
    if (late > 0) ev(b, "late_return", -Math.min(20, 5 + 2 * late), returnedAt, `Returned ${late} day${late > 1 ? "s" : ""} late`, r.id);
    else if (late < 0) ev(b, "early_return", 5, returnedAt, "Returned early", r.id);
    else ev(b, "on_time_return", 4, returnedAt, "Returned on time", r.id);
    ev(o, "lend_completed", 3, returnedAt, "Completed a lend", r.id);
    if (stars) ev(b, "feedback", (stars - 3) * 2, returnedAt, `${stars}-star feedback from the owner`, `${r.id}:${stars}`);
  }
  // A couple of prior cancellations and one late cancellation for realism.
  ev("u2", "cancellation", -1, d(-34), "Cancelled in good time");
  ev("u3", "late_cancellation", -6, d(-19), "Cancelled within 24h of start");
  ev("u1", "cancellation", -1, d(-52), "Cancelled in good time");

  // Active loans.
  addReq({ itemId: I.bike, borrowerId: "u1", from: d(-2), until: d(1), status: "active", pickedUpAt: ts(d(-2)), purpose: "Commute while my scooter is in the workshop", agreedRequirements: ["Helmet recommended", "Return cleaned"] });
  const cookerLoan = addReq({ itemId: I.cooker, borrowerId: "u2", from: d(-6), until: d(-2), status: "active", pickedUpAt: ts(d(-6)), purpose: "Family function", escalationStage: 0 });
  addReq({ itemId: I.books, borrowerId: "u3", from: d(-12), until: d(-5), status: "active", pickedUpAt: ts(d(-12)), purpose: "Semester revision" });
  const drillLoan = addReq({
    itemId: I.drill, borrowerId: "u5", from: d(-3), until: d(0), status: "active", pickedUpAt: ts(d(-3)), purpose: "Installing shelves",
  });
  drillLoan.extension = { requestedUntil: d(1), reason: "One wall needs a masonry bit. Need one more day.", status: "pending", requestedAt: ts(d(0), 7) };

  // Upcoming approved + pending/competing/waitlisted/declined.
  addReq({ itemId: I.tent, borrowerId: "u1", from: d(8), until: d(10), status: "approved", decidedAt: ts(d(-1)), purpose: "Hill trek with friends", urgency: "normal" });
  addReq({ itemId: I.pa, borrowerId: "u1", from: d(12), until: d(13), status: "pending", submittedAt: ts(d(0), 6), purpose: "Department seminar", urgency: "normal" });
  addReq({ itemId: I.ladder, borrowerId: "u5", from: d(2), until: d(6), status: "approved", decidedAt: ts(d(-1)), purpose: "Painting the shop front" });
  addReq({ itemId: I.ladder, borrowerId: "u1", from: d(4), until: d(7), status: "waitlisted", submittedAt: ts(d(-1), 15), purpose: "Cleaning water tank", urgency: "normal" });
  addReq({ itemId: I.table, borrowerId: "u1", from: d(5), until: d(6), status: "declined", declineReason: "Needed by family that week", decidedAt: ts(d(-1)), purpose: "Study desk for exam prep" });
  addReq({ itemId: I.cooker, borrowerId: "u6", from: d(0), until: d(2), status: "waitlisted", submittedAt: ts(d(-2), 11), purpose: "Cooking for guests", urgency: "urgent" });

  // The fair-allocation demo: three competing requests for Meera's drill.
  addReq({ itemId: I.drill, borrowerId: "u3", from: d(3), until: d(5), status: "pending", submittedAt: ts(d(-1), 8), urgency: "low", purpose: "Hanging picture frames" });
  addReq({ itemId: I.drill, borrowerId: "u4", from: d(3), until: d(4), status: "pending", submittedAt: ts(d(-1), 20), urgency: "urgent", purpose: "Final-year project demo rig needs mounting by Friday" });
  addReq({ itemId: I.drill, borrowerId: "u2", from: d(4), until: d(5), status: "pending", submittedAt: ts(d(0), 5), urgency: "normal", purpose: "Fixing a curtain rail" });

  void cookerLoan;

  const needs: Need[] = [
    { id: "n1", borrowerId: "u1", title: "Projector for a college demo", category: "Electronics", from: d(5), until: d(6), radiusKm: 12, details: "Needs HDMI input and to run for about 3 hours. Will collect and return in person.", urgency: "normal", status: "open", postedAt: ts(d(-1), 10) },
    { id: "n2", borrowerId: "u3", title: "Electric drill for a shelf install", category: "Tools", from: d(3), until: d(4), radiusKm: 15, details: "Masonry capable please. Happy to pick up.", urgency: "normal", status: "open", postedAt: ts(d(-1), 9) },
    { id: "n3", borrowerId: "u4", title: "Large pressure cooker for a department event", category: "Kitchen", from: d(9), until: d(10), radiusKm: 10, details: "Around 40 servings across two batches.", urgency: "low", status: "open", postedAt: ts(d(0), 4) },
    { id: "n4", borrowerId: "u6", title: "Ladder for painting a ceiling", category: "Tools", from: d(2), until: d(3), radiusKm: 8, details: "At least 8 ft. Two days only.", urgency: "urgent", status: "open", postedAt: ts(d(0), 3) },
  ];
  const offers: Offer[] = [
    { id: "o1", needId: "n1", itemId: I.proj, ownerId: "u2", message: "Full HD with HDMI cable and tripod screen. You can collect from Palayamkottai.", createdAt: ts(d(-1), 14), status: "open" },
    { id: "o2", needId: "n1", itemId: I.mini, ownerId: "u3", message: "Smaller 720p unit if you only need a classroom setup.", createdAt: ts(d(0), 2), status: "open" },
  ];

  const notifications: AppNotification[] = [
    { id: "x1", userId: "u1", title: "Waitlist: ladder", body: "You are on the waitlist for the 8 ft extension ladder. You'll be told if the dates free up.", createdAt: ts(d(-1), 15), read: false, simulated: true, kind: "waitlist" },
    { id: "x2", userId: "u1", title: "Request declined", body: "Divya declined your request for the folding study table. See next-best alternatives in My Borrowing Requests.", createdAt: ts(d(-1), 12), read: false, simulated: true, kind: "decision" },
  ];

  return {
    version: STATE_VERSION, users, items, payments: [], requests, needs, offers, trustEvents, notifications, messages: [],
    settings: { ...DEFAULT_SETTINGS }, currentUserId: "u1", clockOffset: 0, seededOn: T,
  };
}

export type { Urgency };

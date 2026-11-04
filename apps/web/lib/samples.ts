import { addDays, type Item, type TrustEvent, type User } from "@relo/core/engine";
import { AREA_COORDS } from "./areas";
import { realToday } from "./seed";

/**
 * Sample listings shown next to real ones so a new neighbourhood doesn't look empty.
 * They live only in the browser (ids start with "s-"), are labelled "Sample", are never
 * written to the database and cannot be requested.
 */
export const SAMPLE_PREFIX = "s-";

const PEOPLE: [string, string, keyof typeof AREA_COORDS][] = [
  ["s-u1", "Anitha R.", "Palayamkottai"],
  ["s-u2", "Karthik S.", "Maharajanagar"],
  ["s-u3", "Fathima B.", "Vannarpettai"],
];

const THINGS: [string, string, string, Item["condition"], number, string, string[], number][] = [
  ["Cordless drill with bit set", "Tools", "s-u1", "Good", 4500, "18V cordless drill, two batteries, 30-piece bit set and carry case.", ["Return cleaned"], 0],
  ["Mountain bicycle (21-speed)", "Outdoor & Sports", "s-u2", "Good", 14000, "Medium frame, recently serviced. Helmet on request.", ["Helmet recommended"], 1],
  ["Portable PA speaker with mic", "Party & Events", "s-u3", "Good", 9000, "Rechargeable 100W speaker with wireless microphone for classes and small events.", ["Return charged"], 2],
  ["Baby stroller", "Baby & Kids", "s-u1", "Like new", 7000, "Foldable stroller with rain cover, sanitised between loans.", ["Return cleaned"], 0],
  ["4-person camping tent", "Outdoor & Sports", "s-u2", "Good", 6500, "Waterproof dome tent with rainfly and pegs. Pitches in ten minutes.", ["Return dry"], 1],
  ["7L pressure cooker", "Kitchen", "s-u3", "Good", 2800, "Stainless steel, gas and induction. Great for large family gatherings.", ["Return cleaned"], 2],
  ["8 ft extension ladder", "Tools", "s-u1", "Fair", 5500, "Lightweight aluminium ladder for painting and tube-light jobs.", ["Pickup only"], 0],
  ["Engineering mathematics reference set", "Books & Study", "s-u2", "Good", 2400, "Three-volume set with solved problems.", ["No highlighting"], 1],
  ["Folding study table", "Furniture & Home", "s-u3", "Good", 3200, "Foldable laptop table with adjustable height.", ["Pickup only"], 2],
  ["1080p projector", "Electronics", "s-u1", "Like new", 22000, "Full HD projector with HDMI cable. Good for demos and movie nights.", ["Return charged"], 0],
  ["28-inch travel suitcase", "Travel", "s-u2", "Good", 4200, "Hard-shell trolley suitcase with lock.", ["Return cleaned"], 1],
  ["DSLR camera kit", "Electronics", "s-u3", "Like new", 38000, "DSLR body, 18-55mm lens, two batteries and bag.", ["ID shown at pickup"], 2],
  ["40-piece hand tool kit", "Tools", "s-u2", "Good", 3000, "Spanners, screwdrivers, pliers, hammer and level in a case.", ["Return complete"], 1],
  ["Garden sprayer pump (16L)", "Garden", "s-u1", "Fair", 2200, "Manual backpack sprayer.", ["Return cleaned"], 0],
];

export function sampleData(): { users: User[]; items: Item[]; trustEvents: TrustEvent[] } {
  const today = realToday();
  const users: User[] = PEOPLE.map(([id, name, area], i) => ({
    id, name, area, lat: AREA_COORDS[area][0], lon: AREA_COORDS[area][1], joined: addDays(today, -200 + i * 20),
    bio: "Sample neighbour shown so you can see how RELO looks.", demo: true,
  }));
  const items: Item[] = THINGS.map(([title, category, ownerId, condition, estValue, description, requirements], n) => {
    const u = users.find((x) => x.id === ownerId)!;
    const j = (n % 5) * 0.0013;
    return {
      id: `s-i${n + 1}`, ownerId, title, description, category, condition, areaLabel: u.area, lat: u.lat + j, lon: u.lon - j,
      availableFrom: addDays(today, -30), availableUntil: addDays(today, 120), requirements, active: true, estValue,
      createdAt: `${addDays(today, -40 + n)}T09:00:00.000Z`,
    };
  });
  const trustEvents: TrustEvent[] = users.flatMap((u, i) =>
    Array.from({ length: 6 + i * 2 }, (_, k) => ({
      id: `s-t${u.id}-${k}`, userId: u.id, kind: "on_time_return" as const, delta: 4, date: addDays(today, -60 + k * 5), note: "Returned on time",
    })),
  );
  return { users, items, trustEvents };
}

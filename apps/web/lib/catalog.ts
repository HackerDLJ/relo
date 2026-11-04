import type { Condition, ListingMode, Refurb } from "@relo/core/engine";

/** Bundled product photos (apps/web/public/products). Used by the seed and the sample listings. */
const P = (n: string) => `/products/${n}.jpg`;

/** Photos for the original rent-only listings, keyed by the start of the title. */
export const PHOTO_BY_TITLE: [string, string][] = [
  ["Mountain bicycle", P("bike-orange")],
  ["Portable party speaker", P("party-speaker")],
  ["Tunnel camping tent", P("tent")],
  ["Impact drill", P("bosch-drill")],
];

export type Listing = {
  title: string; category: string; condition: Condition; estValue: number; description: string; requirements: string[];
  mode: ListingMode; pricePerDay?: number; salePrice?: number; refurb?: Refurb; photo: string;
};

const refurb = (grade: Refurb["grade"], warrantyMonths: number, work: string): Refurb => ({ grade, warrantyMonths, work });

/**
 * Listings that are for sale, refurbished, or both. Same shape as the rest of the catalogue so
 * the whole app treats them identically. Prices are realistic for Tirunelveli's second-hand market.
 */
export const SALE_LISTINGS: Listing[] = [
  { title: "Refurbished precision screwdriver kit (130 bits)", category: "Tools", condition: "Like new", estValue: 900, mode: "sell", salePrice: 450, photo: P("toolkit-refurb"),
    description: "Phone, laptop and watch repair kit. Every bit re-tested, magnetic driver cleaned, new case latch.", requirements: [], refurb: refurb("A", 3, "Re-tested every bit, replaced the case latch") },
  { title: "Precision screwdriver set (64 bits)", category: "Tools", condition: "Good", estValue: 700, mode: "rent", pricePerDay: 0, photo: P("precision-driver"),
    description: "Slim magnetic set for electronics repairs. Free to borrow for a few days.", requirements: ["Return complete"] },
  { title: "Refurbished laptop, tablet and headphones bundle", category: "Electronics", condition: "Good", estValue: 26000, mode: "sell", salePrice: 19500, photo: P("laptop-bundle"),
    description: "Student bundle: 14-inch laptop, 10-inch tablet and wired headphones. Chargers included.", requirements: [], refurb: refurb("B", 6, "New battery, SSD upgrade, fresh OS install, screen cleaned") },
  { title: "JBL Go portable Bluetooth speaker", category: "Party & Events", condition: "Good", estValue: 3000, mode: "both", pricePerDay: 60, salePrice: 1800, photo: P("jbl-go"),
    description: "Waterproof pocket speaker, about 5 hours of battery. Rent it for a trip or buy it.", requirements: ["Return charged"], refurb: refurb("B", 3, "New battery, cleaned grille, tested at full volume") },
  { title: "Classic JBL Go speaker", category: "Party & Events", condition: "Fair", estValue: 2200, mode: "sell", salePrice: 1200, photo: P("jbl-go-classic"),
    description: "Original Go speaker with a few scuffs. Sounds clean, aux cable included.", requirements: [], refurb: refurb("C", 1, "Contacts cleaned, battery tested") },
  { title: "Edifier bookshelf speakers with remote", category: "Electronics", condition: "Like new", estValue: 9000, mode: "sell", salePrice: 4800, photo: P("edifier"),
    description: "2.0 powered pair for desks and small rooms. Remote and cables included.", requirements: [], refurb: refurb("A", 6, "Replaced capacitors, cleaned cabinets, tested for hum") },
  { title: "Refurbished hybrid bicycle (grey)", category: "Outdoor & Sports", condition: "Good", estValue: 11000, mode: "both", pricePerDay: 100, salePrice: 6500, photo: P("bike-grey"),
    description: "Light commuter bike with 21 gears. Rent it by the day or buy it.", requirements: ["Helmet recommended"], refurb: refurb("B", 3, "New tyres and brake pads, gears tuned, chain lubricated") },
  { title: "Refurbished mountain bike (black and green)", category: "Outdoor & Sports", condition: "Like new", estValue: 15000, mode: "sell", salePrice: 7800, photo: P("bike-black"),
    description: "Front-suspension 21-speed with disc brakes. Serviced and test-ridden.", requirements: [], refurb: refurb("A", 6, "Full service, new brake discs, wheels trued") },
  { title: "Fat-tyre bicycle", category: "Outdoor & Sports", condition: "Good", estValue: 14000, mode: "both", pricePerDay: 250, salePrice: 9000, photo: P("fatbike"),
    description: "Wide tyres for sand, gravel and rough roads. Disc brakes front and rear.", requirements: ["Helmet recommended"], refurb: refurb("B", 3, "New tubes, brakes bled, drivetrain cleaned") },
  { title: "Circular saw with carry bag", category: "Tools", condition: "Like new", estValue: 6500, mode: "both", pricePerDay: 150, salePrice: 3800, photo: P("circular-saw-bag"),
    description: "Corded circular saw with a spare blade and a carry bag. For shelves, frames and cut-to-size boards.", requirements: ["Return cleaned", "Handle with care"], refurb: refurb("A", 3, "New blade, carbon brushes checked, guard re-aligned") },
  { title: "Circular saw (bare tool)", category: "Tools", condition: "Good", estValue: 5000, mode: "sell", salePrice: 3000, photo: P("circular-saw"),
    description: "Works well, light workshop wear. No bag.", requirements: [], refurb: refurb("B", 1, "Serviced and tested on 18 mm ply") },
  { title: "Sliding mitre saw", category: "Tools", condition: "Good", estValue: 14000, mode: "rent", pricePerDay: 300, photo: P("mitre-saw"),
    description: "Sliding compound mitre saw for skirting, frames and furniture. Blade guard intact.", requirements: ["Handle with care", "Pickup only"] },
  { title: "Refurbished mitre saw (boxed)", category: "Tools", condition: "Good", estValue: 12000, mode: "sell", salePrice: 5500, photo: P("mitre-saw-boxed"),
    description: "Compound mitre saw, repacked in its box with a spare blade.", requirements: [], refurb: refurb("B", 3, "Bearings greased, new blade, fence squared") },
  { title: "Tunnel tent, cleaned and re-proofed", category: "Outdoor & Sports", condition: "Good", estValue: 5500, mode: "sell", salePrice: 2200, photo: P("tent-2"),
    description: "2 to 3 person tunnel tent with pegs and guy lines. Waterproofing re-applied.", requirements: [], refurb: refurb("A", 1, "Re-proofed flysheet, new guy lines, seams checked") },
  { title: "Wooden baby cradle", category: "Baby & Kids", condition: "Good", estValue: 6000, mode: "both", pricePerDay: 80, salePrice: 3500, photo: P("cradle"),
    description: "Rocking wooden cradle with mattress. Sanitised and polished.", requirements: ["Return cleaned"], refurb: refurb("B", 1, "Re-polished, new mattress cover, bolts tightened") },
  { title: "Dickens and classics, five volumes", category: "Books & Study", condition: "Fair", estValue: 1800, mode: "both", pricePerDay: 0, salePrice: 900, photo: P("books-dickens"),
    description: "Old cloth-bound editions. Free to borrow for reading, or buy to keep.", requirements: ["No highlighting"] },
  { title: "Vintage fiction set (red cloth)", category: "Books & Study", condition: "Well used", estValue: 1500, mode: "sell", salePrice: 800, photo: P("books-red"),
    description: "Eight cloth-bound novels. Spines are worn, pages are clean.", requirements: [] },
  { title: "History and war books, four volumes", category: "Books & Study", condition: "Fair", estValue: 2000, mode: "both", pricePerDay: 0, salePrice: 1500, photo: P("books-civil-war"),
    description: "Reference history set. Borrow for coursework or buy.", requirements: ["No highlighting"] },
];

import type { Condition, ListingMode, Refurb } from "@relo/core/engine";

/** Bundled product photos (apps/web/public/products). Used by the seed and the sample listings. */
const P = (n: string) => `/products/${n}.jpg`;

const W = "https://thumb.wikimedia.org/wikipedia/commons/thumb/";
/** [title prefix, thumbnail path, "Photo: file title", licence] from Wikimedia Commons. */
const WIKI: [string, string, string, string][] = [
  ["Cordless drill", "1/18/Cordless_drill_Metabo_BS_14%2C4_Li.JPG/960px-Cordless_drill_Metabo_BS_14%2C4_Li.JPG", "Photo: Metabo BS 14,4 Li, Wikimedia Commons", "CC0"],
  ["7L pressure cooker", "5/58/Pressure_cooker.jpg/960px-Pressure_cooker.jpg", "Photo: Pressure cooker, Wikimedia Commons", "CC BY-SA 3.0"],
  ["8 ft extension ladder", "0/00/Ladder_aluminum.jpg/960px-Ladder_aluminum.jpg", "Photo: Ladder aluminum, Wikimedia Commons", "CC BY-SA 4.0"],
  ["DSLR camera kit", "8/8e/EOS_650D.jpg/960px-EOS_650D.jpg", "Photo: EOS 650D, Wikimedia Commons", "CC BY 2.0"],
  ["Folding study table", "0/07/Taula_de_llit_3c.jpg/960px-Taula_de_llit_3c.jpg", "Photo: Taula de llit, Wikimedia Commons", "CC BY-SA 3.0"],
  ["Garden sprayer", "8/89/Knapsack_sprayer.jpg/960px-Knapsack_sprayer.jpg", "Photo: Knapsack sprayer, Wikimedia Commons", "CC BY-SA 4.0"],
  ["28-inch travel suitcase", "8/8e/Samsonite_Proxis.jpg/960px-Samsonite_Proxis.jpg", "Photo: Samsonite Proxis, Wikimedia Commons", "CC BY-SA 4.0"],
  ["1080p projector", "1/14/InFocus_IN34.jpg/960px-InFocus_IN34.jpg", "Photo: InFocus IN34, Wikimedia Commons", "Public domain"],
  ["40-piece hand tool kit", "5/50/Husky_tool_set.jpg/960px-Husky_tool_set.jpg", "Photo: Husky tool set, Wikimedia Commons", "CC BY 2.0"],
  ["Baby stroller", "0/0e/BabyCarriage_20210711_130332.jpg/960px-BabyCarriage_20210711_130332.jpg", "Photo: Baby stroller, Wikimedia Commons", "CC BY-SA 4.0"],
  ["Engineering mathematics", "1/1d/A_row_of_mathematics_books_at_Jinja_Public_Library%2C_Jinja_City_Centre.jpg/960px-A_row_of_mathematics_books_at_Jinja_Public_Library%2C_Jinja_City_Centre.jpg", "Photo: Mathematics books, Jinja Public Library, Wikimedia Commons", "CC BY-SA 4.0"],
  ["Mini projector", "f/fc/3M_pocket_projector_at_B%26H_Photo_jeh.jpg/960px-3M_pocket_projector_at_B%26H_Photo_jeh.jpg", "Photo: 3M pocket projector, Wikimedia Commons", "CC0"],
];

/** Photos for the original rent-only listings, keyed by the start of the title. */
export const PHOTO_BY_TITLE: [string, string][] = [
  ["Mountain bicycle", P("bike-orange")],
  ["Portable party speaker", P("party-speaker")],
  ["Tunnel camping tent", P("tent")],
  ["Impact drill", P("bosch-drill")],
  ...WIKI.map(([k, path, , ]) => [k, `${W}${path}`] as [string, string]),
];

/** Credit line for a photo that needs one (Wikimedia Commons images are hotlinked under their free licences). */
export const photoCredit = (url?: string) => WIKI.find(([, path]) => url === `${W}${path}`)?.slice(2).join(" · ");

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

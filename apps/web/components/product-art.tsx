import type { ReactNode } from "react";

/**
 * Original vector product illustrations drawn for RELO in the brand palette.
 * They are placeholders for owner photos: not AI images and not third-party artwork.
 */
const N = "#061B3A", C = "#36BDF2", L = "#9CECF1", W = "#FFFFFF", S = "#C9D8E6", M = "#8FA3B8";

const ART: Record<string, ReactNode> = {
  drill: (<g><rect x="70" y="62" width="92" height="34" rx="14" fill={N} /><rect x="150" y="70" width="34" height="18" rx="4" fill={S} /><rect x="184" y="75" width="22" height="8" rx="2" fill={M} /><path d="M92 94h30l-6 52a8 8 0 0 1-8 7h-8a8 8 0 0 1-8-8z" fill={C} /><rect x="96" y="54" width="44" height="14" rx="5" fill={L} /><circle cx="76" cy="79" r="6" fill={C} /><path d="M116 122h6M114 132h8" stroke={N} strokeWidth="3" strokeLinecap="round" opacity=".5" /></g>),
  bike: (<g fill="none" stroke={N} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><circle cx="64" cy="112" r="34" /><circle cx="176" cy="112" r="34" /><circle cx="64" cy="112" r="5" fill={C} stroke="none" /><circle cx="176" cy="112" r="5" fill={C} stroke="none" /><path d="M64 112l34-52h50l28 52M98 60l30 52h-64M148 60l-8-18h20M92 52h20" stroke={C} strokeWidth="6" /><path d="M128 112l20-52" /></g>),
  speaker: (<g><rect x="78" y="26" width="84" height="130" rx="14" fill={N} /><circle cx="120" cy="64" r="20" fill={C} /><circle cx="120" cy="64" r="9" fill={N} /><circle cx="120" cy="116" r="26" fill={L} /><circle cx="120" cy="116" r="14" fill={N} /><circle cx="120" cy="116" r="5" fill={C} /><rect x="108" y="34" width="24" height="4" rx="2" fill={M} /></g>),
  stroller: (<g fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M62 52h26c34 0 56 22 56 52H88z" fill={C} stroke={N} strokeWidth="5" /><path d="M88 52c0-14 12-24 28-24" stroke={N} strokeWidth="5" /><path d="M62 52L50 30h-12" stroke={N} strokeWidth="6" /><path d="M96 104l-14 36M136 104l18 36" stroke={N} strokeWidth="5" /><circle cx="80" cy="144" r="12" fill={W} stroke={N} strokeWidth="5" /><circle cx="160" cy="144" r="12" fill={W} stroke={N} strokeWidth="5" /></g>),
  cooker: (<g><path d="M62 78h116v54a16 16 0 0 1-16 16H78a16 16 0 0 1-16-16z" fill={S} /><path d="M62 78h116v14H62z" fill={M} /><ellipse cx="120" cy="76" rx="62" ry="14" fill={W} stroke={M} strokeWidth="3" /><rect x="106" y="50" width="28" height="14" rx="5" fill={N} /><circle cx="120" cy="44" r="6" fill={C} /><rect x="32" y="102" width="30" height="12" rx="6" fill={N} /><rect x="178" y="102" width="30" height="12" rx="6" fill={N} /><path d="M82 112v28" stroke={W} strokeWidth="6" strokeLinecap="round" opacity=".7" /></g>),
  ladder: (<g stroke={N} strokeWidth="7" strokeLinecap="round"><path d="M82 24L58 156M158 24l24 132" /><path d="M76 52h88M70 82h100M64 112h112M58 142h124" stroke={C} strokeWidth="8" /></g>),
  books: (<g><rect x="54" y="38" width="38" height="112" rx="5" fill={N} /><rect x="96" y="30" width="38" height="120" rx="5" fill={C} /><rect x="138" y="46" width="38" height="104" rx="5" fill={L} /><path d="M62 64h22M62 74h22M104 56h22M104 66h22M146 72h22M146 82h22" stroke={W} strokeWidth="4" strokeLinecap="round" /><rect x="46" y="150" width="140" height="8" rx="4" fill={M} /></g>),
  table: (<g><rect x="42" y="64" width="156" height="14" rx="6" fill={C} /><path d="M72 78l-18 74M168 78l18 74M96 78l12 74M144 78l-12 74" stroke={N} strokeWidth="7" strokeLinecap="round" /><rect x="82" y="40" width="76" height="24" rx="4" fill={N} /><rect x="88" y="45" width="64" height="14" rx="2" fill={L} /></g>),
  kit: (<g><rect x="44" y="62" width="152" height="86" rx="14" fill={N} /><path d="M92 62V48a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v14" fill="none" stroke={N} strokeWidth="7" /><rect x="44" y="96" width="152" height="8" fill={C} /><rect x="108" y="90" width="24" height="20" rx="4" fill={L} /><path d="M66 124h20M154 124h20" stroke={M} strokeWidth="5" strokeLinecap="round" /></g>),
  sprayer: (<g><rect x="76" y="48" width="76" height="102" rx="18" fill={C} /><rect x="96" y="34" width="36" height="18" rx="6" fill={N} /><path d="M132 40c26 0 40 10 40 32v6" fill="none" stroke={N} strokeWidth="6" strokeLinecap="round" /><rect x="164" y="76" width="16" height="30" rx="5" fill={N} /><path d="M184 112l18 10M184 124l22 2M182 136l18-8" stroke={L} strokeWidth="4" strokeLinecap="round" /><path d="M90 84h48M90 100h48" stroke={W} strokeWidth="5" strokeLinecap="round" opacity=".7" /></g>),
  camera: (<g><rect x="42" y="56" width="156" height="92" rx="14" fill={N} /><path d="M86 56l10-16h48l10 16z" fill={M} /><circle cx="120" cy="104" r="36" fill={S} /><circle cx="120" cy="104" r="27" fill={N} /><circle cx="120" cy="104" r="15" fill={C} /><circle cx="113" cy="97" r="5" fill={W} opacity=".8" /><circle cx="176" cy="74" r="6" fill={C} /><rect x="52" y="66" width="22" height="8" rx="3" fill={L} /></g>),
  tent: (<g><path d="M22 150L120 36l98 114z" fill={C} /><path d="M120 36l40 114H80z" fill={L} /><path d="M120 36l-14 114M120 36l14 114" stroke={N} strokeWidth="3" opacity=".25" /><path d="M96 150l24-52 24 52z" fill={N} /><path d="M120 36V20" stroke={N} strokeWidth="5" strokeLinecap="round" /><path d="M120 20h22l-6 6 6 6h-22" fill={N} /><path d="M10 152h220" stroke={M} strokeWidth="5" strokeLinecap="round" /></g>),
  projector: (<g><rect x="40" y="70" width="140" height="62" rx="14" fill={N} /><circle cx="160" cy="101" r="22" fill={S} /><circle cx="160" cy="101" r="14" fill={C} /><circle cx="156" cy="97" r="4" fill={W} opacity=".8" /><path d="M64 88h50M64 100h50M64 112h30" stroke={M} strokeWidth="4" strokeLinecap="round" /><circle cx="64" cy="124" r="0" /><path d="M190 80l36-22v86l-36-22z" fill={L} opacity=".7" /><rect x="64" y="132" width="14" height="10" rx="2" fill={M} /><rect x="142" y="132" width="14" height="10" rx="2" fill={M} /></g>),
  suitcase: (<g><rect x="60" y="48" width="120" height="98" rx="16" fill={C} /><path d="M100 48V34a6 6 0 0 1 6-6h28a6 6 0 0 1 6 6v14" fill="none" stroke={N} strokeWidth="7" /><path d="M96 56v82M144 56v82" stroke={N} strokeWidth="5" opacity=".25" /><circle cx="82" cy="154" r="7" fill={N} /><circle cx="158" cy="154" r="7" fill={N} /><rect x="108" y="92" width="24" height="16" rx="4" fill={N} /></g>),
  laptop: (<g><rect x="62" y="44" width="116" height="78" rx="9" fill={N} /><rect x="70" y="52" width="100" height="62" rx="3" fill={L} /><path d="M40 128h160l-12 16H52z" fill={S} /><rect x="104" y="128" width="32" height="5" rx="2.5" fill={M} /></g>),
  default: (<g><path d="M120 28l76 34v66l-76 34-76-34V62z" fill={C} /><path d="M120 28l76 34-76 34-76-34z" fill={L} /><path d="M120 96v66" stroke={N} strokeWidth="4" opacity=".35" /><path d="M82 46l76 34v20" stroke={N} strokeWidth="4" fill="none" opacity=".35" /></g>),
};

const RULES: [RegExp, keyof typeof ART][] = [
  [/drill/i, "drill"], [/bicycle|bike|cycle/i, "bike"], [/speaker|\bpa\b|mic/i, "speaker"], [/stroller|pram/i, "stroller"],
  [/cooker|pressure/i, "cooker"], [/ladder/i, "ladder"], [/book|reference|notes|textbook/i, "books"], [/table|desk/i, "table"],
  [/tool ?kit|toolbox|hand tool|spanner/i, "kit"], [/sprayer|pump/i, "sprayer"], [/camera|dslr|lens/i, "camera"], [/tent|camp/i, "tent"],
  [/projector/i, "projector"], [/suitcase|luggage|trolley/i, "suitcase"], [/laptop|notebook computer/i, "laptop"],
];
const CATEGORY_FALLBACK: Record<string, keyof typeof ART> = {
  Tools: "kit", "Outdoor & Sports": "bike", Electronics: "laptop", "Books & Study": "books", "Furniture & Home": "table",
  Travel: "suitcase", "Party & Events": "speaker", Garden: "sprayer", "Baby & Kids": "stroller", Kitchen: "cooker",
};
const TINTS = ["#E7F7FB", "#EEF3FA", "#E9FAF8", "#F1F5F9"];

export function artKey(title: string, category: string): keyof typeof ART {
  for (const [re, k] of RULES) if (re.test(title)) return k;
  return CATEGORY_FALLBACK[category] ?? "default";
}

export function ProductArt({ title, category, className = "" }: { title: string; category: string; className?: string }) {
  const tint = TINTS[(title.length + category.length) % TINTS.length];
  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ background: `radial-gradient(120% 90% at 50% 0%, ${W} 0%, ${tint} 60%, ${L}55 100%)` }} role="img" aria-label={`Illustration of ${title}`}>
      <svg viewBox="0 0 240 180" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <ellipse cx="120" cy="164" rx="76" ry="7" fill={N} opacity=".07" />
        <g transform="translate(0 -4)">{ART[artKey(title, category)]}</g>
      </svg>
    </div>
  );
}

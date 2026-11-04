"use client";
import { Heart } from "lucide-react";
import { toggleSaved, useSaved } from "@/lib/saved";
import { useStore } from "@/lib/store";

/** Save button. Sits on top of a card link, so it swallows the click. */
export function HeartButton({ itemId, className = "" }: { itemId: string; className?: string }) {
  const { me } = useStore();
  const saved = useSaved(me.id).includes(itemId);
  return (
    <button type="button" aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save this item"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSaved(me.id, itemId); }}
      className={`heart grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-white/70 text-navy shadow-card backdrop-blur transition hover:scale-110 active:scale-90 ${saved ? "is-saved" : ""} ${className}`}>
      <Heart className={`h-[18px] w-[18px] ${saved ? "fill-rose-500 text-rose-500" : ""}`} aria-hidden />
    </button>
  );
}

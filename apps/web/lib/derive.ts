"use client";

import { useMemo } from "react";
import { matchItem, rankCompetingRequests, findAlternatives, type BorrowRequest, type Item, type MatchResult, type User, type Alternative } from "@relo/core/engine";
import { useStore } from "./store";

/** Read-side helpers shared by pages. All scoring lives in @relo/core. */
export function useDerived() {
  const { state, me, today, trust } = useStore();
  return useMemo(() => {
    const userById = (id: string) => state.users.find((u) => u.id === id)!;
    const itemById = (id: string) => state.items.find((i) => i.id === id);
    const successfulBorrows = (uid: string) => state.requests.filter((r) => r.borrowerId === uid && r.status === "returned").length;
    const denials = (uid: string, excludeId?: string) => state.requests.filter((r) => r.borrowerId === uid && r.status === "declined" && r.id !== excludeId).length;

    const matchFor = (item: Item, o: { category?: string; from?: string; until?: string; requirements?: string[]; radiusKm?: number; viewer?: User } = {}): MatchResult => {
      const v = o.viewer ?? me;
      return matchItem(item, { lat: v.lat, lon: v.lon, category: o.category, from: o.from, until: o.until, requirements: o.requirements, radiusKm: o.radiusKm, ownerTrust: trust(item.ownerId), requests: state.requests, today });
    };

    /** Rank a set of competing requests for one item using the transparent priority rules. */
    const rankFor = (item: Item, reqs: BorrowRequest[]) =>
      rankCompetingRequests(
        reqs.map((r) => {
          const b = userById(r.borrowerId);
          const m = matchItem(item, { lat: b.lat, lon: b.lon, category: item.category, from: r.from, until: r.until, requirements: r.agreedRequirements, ownerTrust: trust(item.ownerId), requests: state.requests.filter((x) => x.id !== r.id), today });
          return { request: r, matchScore: m.score, borrowerTrust: trust(r.borrowerId), successfulBorrows: successfulBorrows(r.borrowerId), previousDenials: denials(r.borrowerId, r.id) };
        }),
      );

    const alternativesFor = (wanted: Item, from: string, until: string, borrower: User = me, limit = 3): Alternative[] =>
      findAlternatives({ wanted, from, until, borrower, items: state.items, requests: state.requests, trustByUser: trust, today, limit });

    return { userById, itemById, matchFor, rankFor, alternativesFor, successfulBorrows, denials };
  }, [state, me, today, trust]);
}

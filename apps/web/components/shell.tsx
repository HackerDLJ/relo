"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { AlarmClock, ArrowLeftRight, Bell, Compass, Home, Hourglass, Leaf, Megaphone, Menu, Package, Send, Settings, ShieldCheck, Sparkles, FlaskConical } from "lucide-react";
import { useStore, isSuspended } from "@/lib/store";
import { overdueStatus } from "@relo/core/engine";
import { Avatar, Modal, Spinner, SimBadge, ago } from "./ui";

export const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/requests", label: "Community Requests", icon: Megaphone },
  { href: "/listings", label: "My Listings", icon: Package },
  { href: "/borrowing", label: "My Borrowing Requests", icon: Send },
  { href: "/loans", label: "My Loans", icon: ArrowLeftRight },
  { href: "/waitlist", label: "Waitlist", icon: Hourglass },
  { href: "/returns", label: "Returns & Overdue", icon: AlarmClock },
  { href: "/trust", label: "Trust & Reputation", icon: ShieldCheck },
  { href: "/impact", label: "Community Impact", icon: Leaf },
  { href: "/different", label: "What Makes RELO Different", icon: Sparkles },
  { href: "/profile", label: "Profile & Settings", icon: Settings },
] as const;

function useBadges() {
  const { state, me, today } = useStore();
  return useMemo(() => {
    const mine = new Set(state.items.filter((i) => i.ownerId === me.id).map((i) => i.id));
    const incoming = state.requests.filter((r) => mine.has(r.itemId) && r.status === "pending").length
      + state.requests.filter((r) => mine.has(r.itemId) && r.status === "active" && r.extension?.status === "pending").length;
    const waitlist = state.requests.filter((r) => r.borrowerId === me.id && r.status === "waitlisted").length;
    const overdue = state.requests.filter((r) => r.status === "active" && (r.borrowerId === me.id || mine.has(r.itemId)) && overdueStatus(r, today, state.settings).daysLate > 0).length;
    const mineReq = state.requests.filter((r) => r.borrowerId === me.id && (r.status === "pending")).length;
    return { "/listings": incoming, "/waitlist": waitlist, "/returns": overdue, "/borrowing": mineReq } as Record<string, number>;
  }, [state, me.id, today]);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const badges = useBadges();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        const n = badges[href] ?? 0;
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-navy text-white" : "text-ink hover:bg-white"}`}>
            <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-cyan" : "text-navy-600"}`} aria-hidden />
            <span className="flex-1 leading-tight">{label}</span>
            {n > 0 && <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${active ? "bg-cyan text-navy" : "bg-navy text-white"}`}>{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** The supplied logo is shown whole and unaltered. */
function Logo({ size }: { size: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/relo-logo.png" alt="RELO. Driven by quality. Re-loved products finding new homes." width={size} height={size} className="block rounded-xl" style={{ width: size, height: size }} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const { hydrated, state, me, today, persistError, actions } = useStore();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const path = usePathname();
  const unread = state.notifications.filter((n) => n.userId === me.id && !n.read).length;
  const suspended = hydrated && isSuspended(state, me.id);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-4 overflow-y-auto border-r border-line bg-paper px-4 py-5 md:flex">
        <Link href="/" aria-label="RELO home" className="block"><Logo size={112} /></Link>
        <NavList />
        <div className="mt-auto rounded-xl border border-cyan/40 bg-cyan-soft p-3 text-xs leading-relaxed text-navy-700">
          <p className="mb-1 flex items-center gap-1.5 font-bold"><FlaskConical className="h-3.5 w-3.5" aria-hidden /> Prototype</p>
          Demo people and data. Notifications and moderation are simulated. Your changes persist in this browser only.
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-2.5 backdrop-blur md:px-8">
          <Link href="/" className="md:hidden" aria-label="RELO home"><Logo size={44} /></Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-2 text-xs text-mute">
              <span className="hidden sm:inline">Viewing as</span>
              <Avatar name={me.name} size={28} />
              <select aria-label="Switch demo account" value={me.id} onChange={(e) => actions.switchUser(e.target.value)}
                className="max-w-[9.5rem] rounded-full border border-line bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-cyan/40">
                {state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <span className="hidden sm:inline"><SimBadge>Demo account</SimBadge></span>
            </label>
            <button onClick={() => setBell(true)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative rounded-full border border-line bg-white p-2 text-navy hover:bg-paper">
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cyan px-1 text-[10px] font-bold text-navy">{unread}</span>}
            </button>
          </div>
        </header>

        {suspended && <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-800 md:px-8">Borrowing is suspended for {me.name.split(" ")[0]} until the overdue item is returned.</div>}
        {persistError && <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 md:px-8">{persistError}</div>}
        {state.clockOffset > 0 && <div className="border-b border-cyan/40 bg-cyan-soft px-4 py-1.5 text-center text-xs font-medium text-navy-700 md:px-8">Demo clock is {state.clockOffset} day{state.clockOffset > 1 ? "s" : ""} ahead (today is {today}). <Link href="/profile#demo" className="underline">Manage</Link></div>}

        <main key={path} className="rise mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-16 md:pt-8">
          {hydrated ? children : <Spinner label="Loading your RELO workspace" />}
        </main>
      </div>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {[NAV[0], NAV[1], NAV[5], NAV[3]].map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-semibold ${active ? "text-navy" : "text-mute"}`}>
              <Icon className={`h-5 w-5 ${active ? "text-[#0E8FC4]" : ""}`} aria-hidden />{label.replace("My ", "").replace(" Requests", "")}
            </Link>
          );
        })}
        <button onClick={() => setMenu(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-semibold text-mute"><Menu className="h-5 w-5" aria-hidden />Menu</button>
      </nav>

      <Modal open={menu} onClose={() => setMenu(false)} title="Menu"><NavList onNavigate={() => setMenu(false)} /></Modal>

      <Modal open={bell} onClose={() => setBell(false)} title="Notifications"
        footer={<><span className="mr-auto"><SimBadge>All simulated: nothing is emailed or texted</SimBadge></span><button className="btn-ghost" onClick={() => actions.markRead()}>Mark all read</button></>}>
        {state.notifications.filter((n) => n.userId === me.id).length === 0 ? (
          <p className="py-6 text-center text-sm text-mute">You're all caught up.</p>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {state.notifications.filter((n) => n.userId === me.id).slice(0, 30).map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan" aria-label="Unread" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{n.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-mute">{n.body}</p>
                    <p className="mt-1 text-[11px] text-mute">{ago(n.createdAt)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

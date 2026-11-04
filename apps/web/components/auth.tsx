"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import { AREAS } from "@/lib/areas";
import { Spinner } from "@/components/ui";

function Frame({ children, title, sub }: { children: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/relo-logo.png" alt="RELO" width={96} height={96} className="mx-auto mb-5 block rounded-xl" style={{ width: 96, height: 96 }} />
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-navy">{title}</h1>
          <p className="mb-5 mt-1 text-sm text-mute">{sub}</p>
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-mute">Find it. Share it. Borrow it. Return it. Reuse it.</p>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cyan/50";

export function AuthGate() {
  const { auth } = useStore();
  if (auth.status === "loading") return <div className="grid min-h-screen place-items-center bg-paper"><Spinner label="Loading RELO" /></div>;
  if (auth.status === "needsProfile") return <ProfileSetup />;
  return <SignIn />;
}

function SignIn() {
  const { auth } = useStore();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setNote(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
    if (password.length < 8) return setErr("Use a password of at least 8 characters.");
    if (mode === "up" && name.trim().length < 2) return setErr("Enter your name.");
    setBusy(true);
    const r = mode === "in" ? await auth.signIn(email, password) : await auth.signUp(email, password, name.trim(), area);
    setBusy(false);
    if (r === "CONFIRM") { setNote("Account created. We sent a confirmation link to your email. Open it, then come back and sign in."); setMode("in"); }
    else if (r) setErr(r);
  }

  return (
    <Frame title={mode === "in" ? "Welcome back" : "Join your neighbourhood"} sub={mode === "in" ? "Sign in to borrow, lend and manage your loans." : "Create a free account to share and borrow with people nearby."}>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        {mode === "up" && (
          <>
            <label className="block text-sm font-semibold text-navy-700">Your name<input className={`${inputCls} mt-1 font-normal`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
            <label className="block text-sm font-semibold text-navy-700">Neighbourhood<select className={`${inputCls} mt-1 font-normal`} value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
          </>
        )}
        <label className="block text-sm font-semibold text-navy-700">Email<input type="email" className={`${inputCls} mt-1 font-normal`} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label className="block text-sm font-semibold text-navy-700">Password<input type="password" className={`${inputCls} mt-1 font-normal`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>
        {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
        {note && <p role="status" className="rounded-xl bg-cyan-soft px-3 py-2 text-sm text-navy-700">{note}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-mute">
        {mode === "in" ? "New to RELO?" : "Already have an account?"}{" "}
        <button className="font-semibold text-navy underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); setNote(null); }}>{mode === "in" ? "Create an account" : "Sign in"}</button>
      </p>
    </Frame>
  );
}

function ProfileSetup() {
  const { auth } = useStore();
  const [name, setName] = useState(auth.metaName);
  const [area, setArea] = useState(AREAS.includes(auth.metaArea) ? auth.metaArea : AREAS[0]);
  const [bio, setBio] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await auth.createProfile(name, area, bio);
    setBusy(false);
    if (r) setErr(r);
  }
  return (
    <Frame title="Set up your profile" sub={`Signed in as ${auth.email ?? "your account"}. Neighbours see your name and neighbourhood, never your address.`}>
      <form onSubmit={submit} className="space-y-3.5">
        <label className="block text-sm font-semibold text-navy-700">Your name<input className={`${inputCls} mt-1 font-normal`} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm font-semibold text-navy-700">Neighbourhood<select className={`${inputCls} mt-1 font-normal`} value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy-700">About you (optional)<textarea className={`${inputCls} mt-1 font-normal`} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} /></label>
        {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Join RELO"}</button>
        <button type="button" className="w-full text-center text-sm text-mute underline" onClick={() => void auth.signOut()}>Use a different account</button>
      </form>
    </Frame>
  );
}

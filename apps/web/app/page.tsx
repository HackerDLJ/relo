const categories = ["Electronics", "Books", "Tools", "Sports", "Furniture", "Travel"];

const sampleItems = [
  { name: "Mountain Bicycle", category: "Sports", distance: "0.8 km away", owner: "Arun", tag: "High match", score: "96%" },
  { name: "Cordless Drill", category: "Tools", distance: "1.4 km away", owner: "Meera", tag: "Good match", score: "91%" },
  { name: "Physics Reference Set", category: "Books", distance: "2.1 km away", owner: "Kavin", tag: "Good match", score: "88%" },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 64px" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 64 }}>
        <strong style={{ fontSize: 28, letterSpacing: "-1.5px", color: "#176b46" }}>relo<span style={{ color: "#a2bd45" }}>.</span></strong>
        <div style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 14 }}>
          <a href="#discover">Discover</a><a href="#how">How it works</a>
          <button style={{ background: "#176b46", color: "white", border: 0, padding: "12px 18px", borderRadius: 999 }}>Join RELO</button>
        </div>
      </nav>

      <section style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 48, alignItems: "center", marginBottom: 72 }}>
        <div>
          <p style={{ color: "#397a58", fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>THE COMMUNITY SHARING NETWORK</p>
          <h1 style={{ fontSize: "clamp(44px, 7vw, 76px)", lineHeight: .98, letterSpacing: "-4px", margin: "18px 0" }}>
            Own less.<br/><span style={{ color: "#39865b" }}>Experience</span> more.
          </h1>
          <p style={{ color: "#64736a", fontSize: 18, lineHeight: 1.7, maxWidth: 520 }}>
            The things sitting unused in one home could be exactly what someone nearby needs. Give good resources another life.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <a href="#discover" style={{ background: "#176b46", color: "white", padding: "15px 22px", borderRadius: 999, textDecoration: "none", fontWeight: 700 }}>Explore resources ↗</a>
            <a href="#how" style={{ border: "1px solid #cbd7ce", padding: "15px 22px", borderRadius: 999, textDecoration: "none", color: "#244332" }}>How RELO works</a>
          </div>
        </div>
        <div style={{ background: "#e4eee4", borderRadius: 32, padding: 28, minHeight: 330, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#3e7454", fontSize: 13 }}><b>COMMUNITY IMPACT</b><span>↗ Live demo</span></div>
          <div><div style={{ fontSize: 58, fontWeight: 800, color: "#176b46" }}>2,480</div><div style={{ color: "#52715c" }}>items given another life</div></div>
          <div style={{ display: "flex", gap: 10 }}>
            {["Share", "Borrow", "Repeat"].map((x) => <span key={x} style={{ background: "#fff", borderRadius: 999, padding: "10px 15px", fontSize: 13 }}>{x}</span>)}
          </div>
        </div>
      </section>

      <section id="discover">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 22 }}>
          <div><p style={{ color: "#39865b", fontWeight: 700, fontSize: 12, letterSpacing: 2 }}>MADE FOR SHARING</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>Find what you need.</h2></div>
          <span style={{ color: "#718078", fontSize: 13 }}>Sample listings · demo data</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          {categories.map((x) => <button key={x} style={{ border: "1px solid #d7e0d8", background: "white", borderRadius: 999, padding: "10px 16px", color: "#31533d" }}>{x}</button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
          {sampleItems.map((item, i) => <article key={item.name} style={{ background: "white", border: "1px solid #e2e9e3", borderRadius: 22, padding: 20 }}>
            <div style={{ height: 140, borderRadius: 15, background: ["#e6eee5","#eee9df","#e6eaf0"][i], display: "grid", placeItems: "center", fontSize: 46 }}>{["🚲","🛠️","📚"][i]}</div>
            <p style={{ color: "#39865b", fontSize: 12, fontWeight: 700 }}>{item.category.toUpperCase()} · {item.distance}</p>
            <h3 style={{ margin: "8px 0" }}>{item.name}</h3>
            <p style={{ color: "#718078", fontSize: 13 }}>Shared by {item.owner}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, borderTop: "1px solid #edf1ed", paddingTop: 14 }}>
              <span style={{ color: "#176b46", fontSize: 12, fontWeight: 700 }}>{item.tag} · {item.score}</span>
              <button style={{ border: 0, background: "#176b46", color: "white", borderRadius: 999, padding: "9px 13px" }}>Request</button>
            </div>
          </article>)}
        </div>
      </section>
      <section id="how" style={{ marginTop: 76, background: "#173d2d", color: "white", borderRadius: 28, padding: 32 }}>
        <p style={{ color: "#b4d7bd", letterSpacing: 2, fontSize: 12, fontWeight: 700 }}>A BETTER WAY TO CONSUME</p>
        <h2 style={{ fontSize: 36, margin: "10px 0 28px" }}>Discover. Match. Share. Return.</h2>
        <p style={{ color: "#d4e5d8", maxWidth: 700, lineHeight: 1.7 }}>RELO helps communities use existing resources more efficiently, reducing unnecessary purchases and extending the useful life of everyday items.</p>
      </section>
      <footer style={{ padding: "30px 0", color: "#77857b", fontSize: 13 }}>© 2026 RELO · Resources deserve another life.</footer>
    </main>
  );
}

"use client";
import Link from "next/link";

const STATS = [
  { value: "4.6M", label: "habitantes no DF" },
  { value: "−35min", label: "por trajeto (Maria)" },
  { value: "0", label: "obras necessárias" },
  { value: "3min", label: "espera máx. Terminal Virtual" },
];

const ODS = [
  { n: "11", title: "Cidades Sustentáveis", color: "#f59e0b" },
  { n: "9",  title: "Inovação",             color: "#6366f1" },
  { n: "10", title: "Menos Desigualdades",  color: "#ec4899" },
  { n: "13", title: "Ação Climática",       color: "#10b981" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: "var(--s1)" }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }} />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]" aria-hidden="true"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>M</div>
          <span className="font-bold tracking-tight" style={{ color: "var(--t1)" }}>MobiDF AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cidadao" className="btn-ghost text-xs px-3 py-2">App Cidadão</Link>
          <Link href="/gestor" className="btn-primary text-xs px-3 py-2">Painel SEMOB →</Link>
        </div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="badge-blue mb-6 text-xs tracking-widest uppercase">MVP · Hackathon 2026</div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none mb-6" style={{ color: "var(--t1)" }}>
          Mobilidade
          <br />
          <span style={{ background: "linear-gradient(135deg,#818cf8,#6366f1,#4f46e5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Inteligente
          </span>
          <br />
          para o DF
        </h1>

        <p className="text-lg max-w-xl leading-relaxed mb-10" style={{ color: "var(--t2)" }}>
          Sincronização GTFS em tempo real, detecção de sobreposições e roteamento diametral.
          Eficiência de BRT — <strong style={{ color: "var(--t1)" }}>sem uma única obra.</strong>
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Link href="/gestor" className="btn-primary px-7 py-3.5 text-base rounded-2xl" style={{ boxShadow: "0 0 40px -8px rgba(99,102,241,0.6)" }}>
            Dashboard Gestor SEMOB →
          </Link>
          <Link href="/cidadao" className="btn-ghost px-7 py-3.5 text-base rounded-2xl">
            App do Cidadão
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full mb-16">
          {STATS.map((s) => (
            <div key={s.label} className="stat text-center">
              <div className="text-2xl font-black" style={{ color: "var(--t1)" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {ODS.map((o) => (
            <div key={o.n} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm" style={{ background: "var(--s3)", border: "1px solid var(--border)" }}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: o.color }}>{o.n}</span>
              <span style={{ color: "var(--t2)" }}>{o.title}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 text-center py-4 text-xs" style={{ color: "var(--t3)", borderTop: "1px solid var(--border)" }}>
        MobiDF AI · Felipe Jesus Martins · 2026
      </footer>
    </main>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import {
  api, type GestorDashboard, type Overlap, type VirtualTerminal,
  type ReinvestmentMonth, type FleetScore, type DiametralSuggestion
} from "@/lib/api";

/* ── Helpers ─────────────────────────────────────────────── */
const fmt = (v?: number) =>
  `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

function scoreColor(s: number) {
  if (s >= 70) return "#10b981";
  if (s >= 40) return "#f59e0b";
  return "#f43f5e";
}

/* ── Sub-components ──────────────────────────────────────── */

function KPI({ value, label, sub, accent = "#6366f1", icon }: {
  value: string | number; label: string; sub?: string; accent?: string; icon: string;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <div className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
      </div>
      <div>
        <div className="text-3xl font-black tracking-tight" style={{ color: "var(--t1)" }}>{value}</div>
        <div className="text-sm font-medium mt-0.5" style={{ color: "var(--t2)" }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold" style={{ color: "var(--t1)" }}>{title}</h2>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{sub}</p>}
    </div>
  );
}

function OverlapRow({ o, onResolve, resolving }: {
  o: Overlap; onResolve: (id: string) => void; resolving: string | null;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
            {o.nome_a} ↔ {o.nome_b}
          </span>
          <span className="badge-red">{o.overlap_pct?.toFixed(0)}% overlap</span>
          <span className="badge-amber">{o.overlap_km?.toFixed(1)} km</span>
        </div>
        <div className="text-xs" style={{ color: "var(--t3)" }}>
          Economia estimada: <span className="text-emerald-400 font-semibold">{fmt(o.economia_estimada_mensal)}/mês</span>
        </div>
      </div>
      {o.status === "ativo" && (
        <button
          onClick={() => onResolve(o.id)}
          disabled={resolving === o.id}
          className="btn-danger flex-shrink-0 text-xs px-3 py-1.5"
        >
          {resolving === o.id ? "..." : "Cortar linha"}
        </button>
      )}
    </div>
  );
}

function FleetRow({ s }: { s: FleetScore }) {
  const score = Math.round(s.total_score ?? 0);
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {score}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: "var(--t1)" }}>{s.nome} — {s.descricao}</div>
        <div className="progress mt-1.5">
          <div className="progress-bar" style={{ width: `${score}%`, background: color }} />
        </div>
      </div>
      <div className="text-xs text-right flex-shrink-0" style={{ color: "var(--t3)" }}>
        {s.reservations_count}<br />reservas
      </div>
    </div>
  );
}

function DiametralRow({ s }: { s: DiametralSuggestion }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl mb-2 last:mb-0"
      style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.14)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
          {s.origem} <span style={{ color: "var(--t3)" }}>→</span> {s.destino}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
          {s.trips_daily.toLocaleString("pt-BR")} viagens/dia · −{s.time_saved_min} min por trajeto
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xl font-black" style={{ color: "#a5b4fc" }}>
          {s.horas_salvas_dia?.toFixed(0)}h
        </div>
        <div className="text-xs" style={{ color: "var(--t3)" }}>salvas/dia</div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function GestorPage() {
  const [dash, setDash] = useState<GestorDashboard | null>(null);
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
  const [terminals, setTerminals] = useState<VirtualTerminal[]>([]);
  const [history, setHistory] = useState<ReinvestmentMonth[]>([]);
  const [scores, setScores] = useState<FleetScore[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [etlRunning, setEtlRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "overlaps" | "fleet" | "diametral" | "terminal">("overview");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [d, ovs, terms, hist, sc] = await Promise.all([
        api.gestor.dashboard(),
        api.gestor.overlaps(),
        api.gestor.terminalVirtual(),
        api.gestor.reinvestmentHistory(),
        api.gestor.fleetScores(),
      ]);
      setDash(d); setOverlaps(ovs); setTerminals(terms); setHistory(hist); setScores(sc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro de conexão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function handleResolve(id: string) {
    setResolving(id);
    try { await api.gestor.resolveOverlap(id); await load(); }
    catch { alert("Erro ao resolver"); }
    finally { setResolving(null); }
  }

  async function runEtl() {
    setEtlRunning(true);
    try { await api.gestor.triggerEtl(); setTimeout(load, 2000); }
    catch { alert("Erro ETL"); }
    finally { setEtlRunning(false); }
  }

  const histChartData = [...history].reverse();
  const activeOverlaps = overlaps.filter(o => o.status === "ativo");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--s1)" }}>

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 px-3 py-5 gap-1"
        style={{ background: "var(--s2)", borderRight: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>M</div>
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--t1)" }}>MobiDF AI</div>
            <div className="text-xs" style={{ color: "var(--t3)" }}>SEMOB</div>
          </div>
        </div>

        {([
          { id: "overview",  icon: "▦",  label: "Visão Geral" },
          { id: "overlaps",  icon: "⚠",  label: "Sobreposições" },
          { id: "fleet",     icon: "🚌", label: "Frota" },
          { id: "diametral", icon: "↗",  label: "Diametral" },
          { id: "terminal",  icon: "⟳",  label: "Terminal Virtual" },
        ] as const).map((item) => (
          <button key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-link text-left ${activeTab === item.id ? "active" : ""}`}>
            <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
            {item.label}
            {item.id === "overlaps" && activeOverlaps.length > 0 && (
              <span className="ml-auto badge-red px-1.5 py-0.5 text-xs">{activeOverlaps.length}</span>
            )}
          </button>
        ))}

        <div className="mt-auto pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/" className="nav-link text-xs">← Início</Link>
          <Link href="/cidadao" className="nav-link text-xs">App Cidadão</Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--s2)" }}>
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--t1)" }}>
              {activeTab === "overview" && "Visão Geral"}
              {activeTab === "overlaps" && "Sobreposição Fantasma"}
              {activeTab === "fleet" && "Índice de Eficiência de Frota"}
              {activeTab === "diametral" && "Roteamento Diametral Dinâmico"}
              {activeTab === "terminal" && "Terminal Virtual"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="live-dot" />
              <span className="text-xs" style={{ color: "var(--t3)" }}>Atualizado a cada 30s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={runEtl} disabled={etlRunning} className="btn-ghost text-xs">
              {etlRunning ? "Executando..." : "▶ ETL GTFS"}
            </button>
          </div>
        </header>

        {/* Mobile tabs */}
        <div className="lg:hidden flex overflow-x-auto gap-1 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          {(["overview","overlaps","fleet","diametral","terminal"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === t ? "tab-active" : ""}`}
              style={activeTab !== t ? { color: "var(--t3)", background: "var(--s3)" } : {}}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center" style={{ color: "var(--t3)" }}>
                <div className="w-8 h-8 rounded-full border-2 border-t-indigo-500 border-indigo-500/20 animate-spin mx-auto mb-3" />
                Carregando dados...
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 mb-5 text-sm"
              style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fb7185" }}>
              <strong>Erro de conexão</strong> · {error}
              <br /><span className="text-xs opacity-70">Backend: http://localhost:8000</span>
            </div>
          )}

          {/* ── Overview ── */}
          {!loading && activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              {/* KPIs */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KPI icon="💰" label="Economia Potencial" value={fmt(dash?.overlap.economia_potencial)}
                  sub="em cortes de sobreposição" accent="#10b981" />
                <KPI icon="⚠️" label="Sobreposições Ativas" value={dash?.overlap.ativos ?? 0}
                  sub={`${dash?.overlap.resolvidos ?? 0} resolvidas`} accent="#f43f5e" />
                <KPI icon="⟳" label="Pares Sincronizados" value={dash?.terminal_virtual.total_sincronizados ?? 0}
                  sub="Terminal Virtual" accent="#6366f1" />
                <KPI icon="⏱" label="Tempo Salvo / Pessoa" value={`${Number(dash?.terminal_virtual.tempo_salvo_por_pessoa_min ?? 0).toFixed(1)} min`}
                  sub="integração sincronizada" accent="#f59e0b" />
              </div>

              {/* Reinvestimento chart + top sobreposições */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Reinvestimento */}
                <div className="card p-5">
                  <SectionHeader title="Reinvestimento Automático" sub="Economia de cortes → conforto da frota" />
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { label: "Wi-Fi", value: fmt(dash?.reinvestment.wifi_mes), color: "#6366f1" },
                      { label: "Ar-cond.", value: fmt(dash?.reinvestment.ac_mes), color: "#10b981" },
                      { label: "Acum. ano", value: fmt(dash?.reinvestment.economia_ano), color: "#f59e0b" },
                    ].map(s => (
                      <div key={s.label} className="stat text-center">
                        <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {histChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={histChartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="0" vertical={false} />
                        <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="alocacao_wifi"    name="Wi-Fi"    stackId="a" fill="#6366f1" />
                        <Bar dataKey="alocacao_ac"      name="Ar-cond." stackId="a" fill="#10b981" />
                        <Bar dataKey="alocacao_reserva" name="Reserva"  stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-center py-6" style={{ color: "var(--t3)" }}>
                      Sem histórico ainda. Corte sobreposições para gerar economia.
                    </p>
                  )}
                </div>

                {/* Diametral top 3 */}
                <div className="card p-5">
                  <SectionHeader title="Roteamento Diametral" sub="Fluxo pendular sem linha direta · maior impacto" />
                  {(dash?.top_diametral ?? []).map(s => <DiametralRow key={s.id} s={s} />)}
                  {(dash?.top_diametral ?? []).length === 0 && (
                    <p className="text-sm text-center py-6" style={{ color: "var(--t3)" }}>Acumule reservas de fluxo para detectar padrões.</p>
                  )}
                  <button onClick={() => setActiveTab("diametral")} className="btn-ghost w-full mt-4 text-xs">
                    Ver todas as sugestões →
                  </button>
                </div>
              </div>

              {/* Cenário Maria */}
              <div className="card p-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at 80% 50%, #6366f1, transparent 60%)" }} />
                <div className="relative">
                  <div className="badge-blue mb-3 text-xs">Cenário de Validação</div>
                  <h3 className="text-xl font-black mb-4" style={{ color: "var(--t1)" }}>Maria · Ceilândia → SIA</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Situação atual", value: "4h/dia", sub: "2 baldeações obrigatórias", color: "#f43f5e" },
                      { label: "Com Rota Diametral", value: "−35 min", sub: "Direto, sem baldeação", color: "#10b981" },
                      { label: "Impacto mensal", value: "+12.8h", sub: "de vida devolvida", color: "#f59e0b" },
                    ].map(s => (
                      <div key={s.label} className="stat">
                        <div className="text-xs mb-1" style={{ color: "var(--t3)" }}>{s.label}</div>
                        <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--t2)" }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Overlaps ── */}
          {!loading && activeTab === "overlaps" && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="stat"><div className="text-2xl font-black" style={{ color: "#f43f5e" }}>{dash?.overlap.ativos ?? 0}</div><div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Ativas</div></div>
                <div className="stat"><div className="text-2xl font-black" style={{ color: "#10b981" }}>{dash?.overlap.resolvidos ?? 0}</div><div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Resolvidas</div></div>
                <div className="stat"><div className="text-2xl font-black" style={{ color: "#f59e0b" }}>{fmt(dash?.overlap.economia_potencial)}</div><div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Potencial</div></div>
                <div className="stat"><div className="text-2xl font-black" style={{ color: "#6366f1" }}>{fmt(dash?.overlap.economia_total)}</div><div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Realizado</div></div>
              </div>
              <div className="card p-5">
                <SectionHeader title="Linhas com sobreposição ≥ 30%" sub="Mesmos trajetos em horários conflitantes" />
                {activeOverlaps.length === 0
                  ? <p className="text-sm text-center py-8" style={{ color: "var(--t3)" }}>Nenhuma sobreposição ativa. Execute o ETL GTFS para analisar.</p>
                  : activeOverlaps.map(o => <OverlapRow key={o.id} o={o} onResolve={handleResolve} resolving={resolving} />)}
                {overlaps.filter(o => o.status !== "ativo").length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-medium mb-2" style={{ color: "var(--t3)" }}>RESOLVIDAS</div>
                    {overlaps.filter(o => o.status !== "ativo").map(o => (
                      <div key={o.id} className="flex items-center gap-3 py-2.5 opacity-40">
                        <span className="badge-green">Resolvida</span>
                        <span className="text-sm" style={{ color: "var(--t2)" }}>{o.nome_a} ↔ {o.nome_b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Fleet ── */}
          {!loading && activeTab === "fleet" && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="stat"><div className="text-2xl font-black" style={{ color: "var(--t1)" }}>{Math.round(dash?.fleet.score_medio ?? 0)}</div><div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Score médio</div></div>
                <div className="stat"><div className="text-2xl font-black" style={{ color: "#10b981" }}>{dash?.fleet.rotas_eficientes ?? 0}</div><div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Eficientes (≥70)</div></div>
                <div className="stat"><div className="text-2xl font-black" style={{ color: "#f43f5e" }}>{dash?.fleet.rotas_criticas ?? 0}</div><div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Críticas (&lt;40)</div></div>
              </div>
              <div className="card p-5">
                <SectionHeader title="Score por rota" sub="(Lotação + Sustentabilidade) − Ociosidade" />
                {scores.map(s => <FleetRow key={s.route_id} s={s} />)}
                {scores.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--t3)" }}>Execute o ETL GTFS para calcular scores.</p>}
              </div>
            </div>
          )}

          {/* ── Diametral ── */}
          {!loading && activeTab === "diametral" && (
            <div className="animate-fade-in">
              <div className="card p-5 mb-4" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.18)" }}>
                <p className="text-sm" style={{ color: "var(--t2)" }}>
                  Pares de RAs com alto fluxo pendular e <strong style={{ color: "var(--t1)" }}>sem linha direta</strong> — eliminam a baldeação obrigatória na Rodoviária do Plano Piloto.
                </p>
              </div>
              <div className="space-y-2">
                {(dash?.top_diametral ?? []).map(s => <DiametralRow key={s.id} s={s} />)}
                {(dash?.top_diametral ?? []).length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--t3)" }}>Acumule reservas de fluxo para detectar padrões O/D.</p>}
              </div>
            </div>
          )}

          {/* ── Terminal Virtual ── */}
          {!loading && activeTab === "terminal" && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Sincronizados", value: dash?.terminal_virtual.total_sincronizados ?? 0, color: "#6366f1" },
                  { label: "Tempo salvo total", value: `${Number(dash?.terminal_virtual.tempo_salvo_total_min ?? 0).toFixed(0)} min`, color: "#10b981" },
                  { label: "Espera média", value: `${Number(dash?.terminal_virtual.avg_espera_min ?? 0).toFixed(1)} min`, color: "#f59e0b" },
                  { label: "Passageiros", value: dash?.terminal_virtual.passageiros_beneficiados ?? 0, color: "#38bdf8" },
                ].map(s => (
                  <div key={s.label} className="stat">
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <SectionHeader title="Pares sincronizados" sub="Alimentadora chega ≤ 3 min antes da troncal partir" />
                {terminals.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--t3)" }}>Aguardando dados GTFS.</p>}
                <div className="space-y-0">
                  {terminals.map(t => {
                    const score = Math.round(t.sync_score ?? 0);
                    return (
                      <div key={t.id} className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: `${scoreColor(score)}18`, color: scoreColor(score), border: `1px solid ${scoreColor(score)}30` }}>
                          {score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: "var(--t1)" }}>{t.stop_name}</div>
                          <div className="text-xs" style={{ color: "var(--t3)" }}>{t.feeder_nome} → {t.trunk_nome}</div>
                        </div>
                        <div className="text-right text-xs flex-shrink-0" style={{ color: "var(--t3)" }}>
                          {Number(t.wait_min).toFixed(1)} min
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

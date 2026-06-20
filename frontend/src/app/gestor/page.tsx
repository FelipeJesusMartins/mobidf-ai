"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api, type GestorDashboard, type Overlap, type VirtualTerminal, type ReinvestmentMonth, type FleetScore, type DiametralSuggestion } from "@/lib/api";

const ease: [number,number,number,number] = [0.16, 1, 0.3, 1];
const fmt = (v?: number) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
const scoreColor = (s: number) => s >= 70 ? "var(--jade)" : s >= 40 ? "var(--gold)" : "var(--coral)";

/* ── Animated metric ── */
function Metric({ value, label, sub, color = "var(--t1)", unit = "" }: {
  value: string|number; label: string; sub?: string; color?: string; unit?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", color, lineHeight: 1.1 }}>
        {value}{unit}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Score ring ── */
function ScoreRing({ score }: { score: number }) {
  const c = scoreColor(score);
  const r = 28; const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx={36} cy={36} r={r} fill="none" stroke="var(--s4)" strokeWidth={6} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={c} strokeWidth={6}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 36 36)" style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={36} y={40} textAnchor="middle" fill={c} fontSize={14} fontWeight={800}>{score}</text>
    </svg>
  );
}

/* ── Sidebar ── */
const NAV = [
  { id: "overview",  icon: "▦",  label: "Mission Control" },
  { id: "overlaps",  icon: "⚠",  label: "Sobreposições" },
  { id: "fleet",     icon: "📊", label: "Score de Frota" },
  { id: "diametral", icon: "↗",  label: "Rotas Diametrais" },
  { id: "terminal",  icon: "⟳",  label: "Terminal Virtual" },
] as const;
type TabId = typeof NAV[number]["id"];

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function GestorPage() {
  const [dash, setDash] = useState<GestorDashboard | null>(null);
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
  const [terminals, setTerminals] = useState<VirtualTerminal[]>([]);
  const [history, setHistory] = useState<ReinvestmentMonth[]>([]);
  const [scores, setScores] = useState<FleetScore[]>([]);
  const [tab, setTab] = useState<TabId>("overview");
  const [resolving, setResolving] = useState<string|null>(null);
  const [etlRunning, setEtlRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const load = useCallback(async () => {
    try {
      const [d, ovs, terms, hist, sc] = await Promise.all([
        api.gestor.dashboard(), api.gestor.overlaps(),
        api.gestor.terminalVirtual(), api.gestor.reinvestmentHistory(),
        api.gestor.fleetScores(),
      ]);
      setDash(d); setOverlaps(ovs); setTerminals(terms); setHistory(hist); setScores(sc);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function resolve(id: string) {
    setResolving(id);
    try { await api.gestor.resolveOverlap(id); await load(); } catch { /**/ } finally { setResolving(null); }
  }
  async function runEtl() {
    setEtlRunning(true);
    try { await api.gestor.triggerEtl(); setTimeout(load, 2000); } catch { /**/ } finally { setEtlRunning(false); }
  }

  const activeOvs = overlaps.filter(o => o.status === "ativo");
  const histData = [...history].reverse();

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)" }}>

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        style={{ width: 220, flexShrink: 0, display:"flex", flexDirection:"column", padding:"20px 12px", gap: 4, borderRight:"1px solid var(--b1)", background:"var(--s1)" }}
        className="hidden lg:flex">

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 8px 20px" }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:"#fff", boxShadow:"0 0 16px rgba(99,102,241,0.4)" }}>M</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"var(--t1)" }}>MobiDF AI</div>
            <div style={{ fontSize:10, color:"var(--t3)" }}>SEMOB · DF</div>
          </div>
        </div>

        <div style={{ fontSize:10, fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:"0.1em", padding:"0 8px", marginBottom:4 }}>Painel</div>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`nav-item ${tab === item.id ? "active" : ""}`}>
            <span style={{ fontSize:15, width:20, textAlign:"center" }}>{item.icon}</span>
            <span style={{ fontSize:13 }}>{item.label}</span>
            {item.id === "overlaps" && activeOvs.length > 0 && (
              <span className="badge-coral ml-auto" style={{ padding:"1px 6px", fontSize:10 }}>{activeOvs.length}</span>
            )}
          </button>
        ))}

        <div style={{ marginTop:"auto", paddingTop:16, borderTop:"1px solid var(--b1)", display:"flex", flexDirection:"column", gap:2 }}>
          <Link href="/cidadao" className="nav-item text-xs">📱 App Cidadão</Link>
          <Link href="/" className="nav-item text-xs">← Início</Link>
        </div>
      </motion.aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Top bar */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 24px", borderBottom:"1px solid var(--b1)", background:"var(--s1)", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"var(--t1)" }}>
              {NAV.find(n => n.id === tab)?.label}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
              <span className="live" />
              <span style={{ fontSize:11, color:"var(--t3)" }}>Ao vivo · atualiza 30s</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={runEtl} disabled={etlRunning} className="btn-ghost" style={{ fontSize:12 }}>
              {etlRunning ? "⟳ Executando..." : "▶ ETL GTFS"}
            </button>
          </div>
        </header>

        {/* Mobile tab strip */}
        <div className="lg:hidden" style={{ display:"flex", overflowX:"auto", gap:6, padding:"8px 12px", borderBottom:"1px solid var(--b1)", background:"var(--s1)" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              style={{ flexShrink:0, padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:600, transition:"all 0.15s",
                background: tab === n.id ? "rgba(139,92,246,0.2)" : "var(--s3)",
                color: tab === n.id ? "#c4b5fd" : "var(--t3)",
                border: tab === n.id ? "1px solid rgba(139,92,246,0.3)" : "1px solid var(--b1)" }}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:"auto", padding:"24px" }}>

          {loading && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
              <div style={{ textAlign:"center", color:"var(--t3)" }}>
                <div style={{ width:32, height:32, border:"3px solid var(--s4)", borderTopColor:"var(--volt)", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
                Carregando dados...
              </div>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding:"16px 20px", borderRadius:14, marginBottom:20, background:"var(--coral-g)", border:"1px solid rgba(244,63,94,0.25)", color:"#fb7185", fontSize:13 }}>
              <strong>Erro de conexão</strong> · {error}
              <br /><span style={{ opacity:0.7, fontSize:11 }}>Backend: http://localhost:8000</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
              transition={{ duration:0.3, ease }}>

              {/* ══════ OVERVIEW ══════ */}
              {tab === "overview" && !loading && (
                <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

                  {/* KPI grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
                    {[
                      { label:"Economia Potencial", value: fmt(dash?.overlap.economia_potencial), sub:"em cortes de sobreposição", color:"var(--jade)", cls:"panel-jade" },
                      { label:"Sobreposições Ativas", value: dash?.overlap.ativos ?? 0, sub:`${dash?.overlap.resolvidos ?? 0} já resolvidas`, color:"var(--coral)", cls:"panel-coral" },
                      { label:"Pares Sincronizados", value: dash?.terminal_virtual.total_sincronizados ?? 0, sub:"Terminal Virtual ativo", color:"var(--volt)", cls:"panel-volt" },
                      { label:"Tempo Salvo / Pessoa", value: Number(dash?.terminal_virtual.tempo_salvo_por_pessoa_min ?? 0).toFixed(1), sub:"minutos por integração", color:"var(--gold)", cls:"panel" },
                    ].map((k, i) => (
                      <motion.div key={k.label}
                        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                        transition={{ delay: i * 0.07, duration:0.5, ease }}
                        className={k.cls} style={{ padding:24 }}>
                        <Metric value={k.value} label={k.label} sub={k.sub} color={k.color} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Charts row */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

                    {/* Reinvestimento */}
                    <div className="panel" style={{ padding:24 }}>
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"var(--t1)" }}>Reinvestimento Automático</div>
                        <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>Economia reinvestida em conforto da frota</div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                        {[
                          { l:"Wi-Fi 60%", v: fmt(dash?.reinvestment.wifi_mes), c:"var(--volt)" },
                          { l:"AC 30%", v: fmt(dash?.reinvestment.ac_mes), c:"var(--jade)" },
                          { l:"Ano", v: fmt(dash?.reinvestment.economia_ano), c:"var(--gold)" },
                        ].map(s => (
                          <div key={s.l} style={{ background:"var(--s3)", border:"1px solid var(--b1)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
                            <div style={{ fontSize:13, fontWeight:800, color: s.c }}>{s.v}</div>
                            <div style={{ fontSize:10, color:"var(--t3)", marginTop:2 }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                      {histData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={histData} margin={{ left:-28, bottom:0 }}>
                            <CartesianGrid strokeDasharray="0" vertical={false} />
                            <XAxis dataKey="periodo" tick={{ fontSize:10 }} />
                            <YAxis tick={{ fontSize:10 }} />
                            <Tooltip formatter={(v:number) => fmt(v)} />
                            <Bar dataKey="alocacao_wifi" name="Wi-Fi" stackId="a" fill="#7c3aed" />
                            <Bar dataKey="alocacao_ac" name="AC" stackId="a" fill="#10b981" />
                            <Bar dataKey="alocacao_reserva" name="Reserva" stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height:140, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--t3)", fontSize:13 }}>Corte sobreposições para gerar dados.</div>
                      )}
                    </div>

                    {/* Top Diametral */}
                    <div className="panel" style={{ padding:24 }}>
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"var(--t1)" }}>Rotas Diametrais</div>
                        <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>Fluxo pendular sem linha direta · maior impacto</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        {(dash?.top_diametral ?? []).map((s, i) => (
                          <motion.div key={s.id} initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.07 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14, background:"rgba(139,92,246,0.07)", border:"1px solid rgba(139,92,246,0.14)" }}>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:700, color:"var(--t1)" }}>{s.origem} → {s.destino}</div>
                                <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>{s.trips_daily.toLocaleString("pt-BR")} viagens/dia · −{s.time_saved_min}min</div>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <div style={{ fontSize:22, fontWeight:900, color:"#a78bfa" }}>{s.horas_salvas_dia?.toFixed(0)}h</div>
                                <div style={{ fontSize:10, color:"var(--t3)" }}>salvas/dia</div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {(dash?.top_diametral ?? []).length === 0 && (
                          <div style={{ padding:"32px 0", textAlign:"center", color:"var(--t3)", fontSize:13 }}>Acumule reservas para detectar padrões O/D.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cenário Maria */}
                  <div className="panel" style={{ padding:28, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)", pointerEvents:"none" }} />
                    <div className="badge-volt" style={{ marginBottom:12, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase" }}>Cenário de validação</div>
                    <div style={{ fontSize:22, fontWeight:900, color:"var(--t1)", marginBottom:20, letterSpacing:"-0.02em" }}>Maria · Ceilândia → SIA · −35 min/dia</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                      {[
                        { label:"Situação atual", value:"4h/dia", sub:"2 baldeações", color:"var(--coral)" },
                        { label:"Com rota diametral", value:"−35 min", sub:"sem baldeação", color:"var(--jade)" },
                        { label:"Impacto mensal", value:"+12.8h", sub:"de vida devolvida", color:"var(--gold)" },
                      ].map(s => (
                        <div key={s.label} style={{ background:"var(--s3)", border:"1px solid var(--b1)", borderRadius:16, padding:"18px 16px" }}>
                          <div style={{ fontSize:11, color:"var(--t3)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{s.label}</div>
                          <div style={{ fontSize:28, fontWeight:900, color: s.color, letterSpacing:"-0.03em" }}>{s.value}</div>
                          <div style={{ fontSize:12, color:"var(--t2)", marginTop:4 }}>{s.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════ OVERLAPS ══════ */}
              {tab === "overlaps" && !loading && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
                    {[
                      { l:"Ativas", v: dash?.overlap.ativos ?? 0, c:"var(--coral)", cls:"panel-coral" },
                      { l:"Resolvidas", v: dash?.overlap.resolvidos ?? 0, c:"var(--jade)", cls:"panel-jade" },
                      { l:"Potencial", v: fmt(dash?.overlap.economia_potencial), c:"var(--gold)", cls:"panel" },
                      { l:"Realizado", v: fmt(dash?.overlap.economia_total), c:"var(--volt)", cls:"panel-volt" },
                    ].map(s => (
                      <div key={s.l} className={s.cls} style={{ padding:20 }}>
                        <div style={{ fontSize:28, fontWeight:900, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize:11, color:"var(--t3)", marginTop:4, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  <div className="panel" style={{ overflow:"hidden" }}>
                    <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--b1)" }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"var(--t1)" }}>Linhas com sobreposição ≥ 30%</div>
                      <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>Mesmo trajeto, horários conflitantes</div>
                    </div>

                    {activeOvs.length === 0 && (
                      <div style={{ padding:"48px 24px", textAlign:"center", color:"var(--t3)", fontSize:13 }}>Nenhuma sobreposição ativa. Execute ETL GTFS.</div>
                    )}

                    {activeOvs.map((o, i) => (
                      <motion.div key={o.id}
                        initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.05 }}
                        style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 24px", borderBottom:"1px solid var(--b1)" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                            <span style={{ fontSize:14, fontWeight:700, color:"var(--t1)" }}>{o.nome_a} ↔ {o.nome_b}</span>
                            <span className="badge-coral">{o.overlap_pct?.toFixed(0)}% overlap</span>
                            <span className="badge-gold">{o.overlap_km?.toFixed(1)} km</span>
                          </div>
                          <div style={{ fontSize:12, color:"var(--t3)" }}>
                            Economia: <span style={{ color:"var(--jade)", fontWeight:700 }}>{fmt(o.economia_estimada_mensal)}/mês</span>
                          </div>
                        </div>
                        <button onClick={() => resolve(o.id)} disabled={resolving === o.id} className="btn-danger" style={{ fontSize:12, flexShrink:0 }}>
                          {resolving === o.id ? "..." : "Cortar linha"}
                        </button>
                      </motion.div>
                    ))}

                    {overlaps.filter(o => o.status !== "ativo").map(o => (
                      <div key={o.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 24px", opacity:0.4, borderBottom:"1px solid var(--b1)" }}>
                        <span className="badge-jade">Resolvida</span>
                        <span style={{ fontSize:13, color:"var(--t2)" }}>{o.nome_a} ↔ {o.nome_b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════ FLEET ══════ */}
              {tab === "fleet" && !loading && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
                    {[
                      { l:"Score Médio", v: Math.round(dash?.fleet.score_medio ?? 0), c:"var(--t1)", cls:"panel" },
                      { l:"Eficientes ≥70", v: dash?.fleet.rotas_eficientes ?? 0, c:"var(--jade)", cls:"panel-jade" },
                      { l:"Críticas <40", v: dash?.fleet.rotas_criticas ?? 0, c:"var(--coral)", cls:"panel-coral" },
                    ].map(s => (
                      <div key={s.l} className={s.cls} style={{ padding:20 }}>
                        <div style={{ fontSize:28, fontWeight:900, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize:11, color:"var(--t3)", marginTop:4, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ overflow:"hidden" }}>
                    <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--b1)" }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"var(--t1)" }}>Score por rota</div>
                      <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>(Lotação + Sustentabilidade) − Ociosidade</div>
                    </div>
                    {scores.map((s, i) => {
                      const sc = Math.round(s.total_score ?? 0);
                      return (
                        <motion.div key={s.route_id}
                          initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.04 }}
                          style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 24px", borderBottom:"1px solid var(--b1)" }}>
                          <ScoreRing score={sc} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:"var(--t1)", marginBottom:4 }}>{s.nome} — {s.descricao}</div>
                            <div style={{ height:4, background:"var(--s4)", borderRadius:99, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${sc}%`, background: scoreColor(sc), borderRadius:99, transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                            </div>
                            <div style={{ display:"flex", gap:12, marginTop:6 }}>
                              <span style={{ fontSize:10, color:"var(--t3)" }}>Lotação: <b style={{ color:"var(--volt)" }}>{s.lotacao_score?.toFixed(0)}</b></span>
                              <span style={{ fontSize:10, color:"var(--t3)" }}>Sustent.: <b style={{ color:"var(--jade)" }}>{s.sustentabilidade_score?.toFixed(0)}</b></span>
                              <span style={{ fontSize:10, color:"var(--t3)" }}>Ociosa: <b style={{ color:"var(--coral)" }}>−{s.ociosidade_penalty?.toFixed(0)}</b></span>
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:"var(--t2)" }}>{s.reservations_count}</div>
                            <div style={{ fontSize:10, color:"var(--t3)" }}>reservas</div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {scores.length === 0 && <div style={{ padding:"48px 24px", textAlign:"center", color:"var(--t3)", fontSize:13 }}>Execute o ETL GTFS.</div>}
                  </div>
                </div>
              )}

              {/* ══════ DIAMETRAL ══════ */}
              {tab === "diametral" && !loading && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div className="panel-volt" style={{ padding:"16px 20px" }}>
                    <p style={{ fontSize:13, color:"var(--t2)", lineHeight:1.6 }}>
                      Pares de RAs com alto fluxo pendular e <strong style={{ color:"var(--t1)" }}>sem linha direta</strong> detectados via matriz O/D.
                      Eliminam a baldeação obrigatória na Rodoviária do Plano Piloto.
                    </p>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {(dash?.top_diametral ?? []).map((s, i) => (
                      <motion.div key={s.id}
                        initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
                        className="panel" style={{ padding:"20px 24px", display:"flex", alignItems:"center", gap:20 }}>
                        <div style={{ width:64, height:64, borderRadius:16, background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontSize:24 }}>↗</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:16, fontWeight:800, color:"var(--t1)", letterSpacing:"-0.02em" }}>{s.origem} → {s.destino}</div>
                          <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
                            <span className="badge-muted">{s.trips_daily.toLocaleString("pt-BR")} viagens/dia</span>
                            <span className="badge-jade">−{s.time_saved_min} min por trajeto</span>
                            <span className="badge-gold">{s.horas_salvas_dia?.toFixed(0)}h salvas/dia</span>
                          </div>
                        </div>
                        <button className="btn-volt" style={{ fontSize:12, flexShrink:0 }}>Criar linha</button>
                      </motion.div>
                    ))}
                    {(dash?.top_diametral ?? []).length === 0 && <div style={{ padding:"48px 24px", textAlign:"center", color:"var(--t3)", fontSize:13 }}>Acumule reservas para detectar padrões O/D.</div>}
                  </div>
                </div>
              )}

              {/* ══════ TERMINAL VIRTUAL ══════ */}
              {tab === "terminal" && !loading && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
                    {[
                      { l:"Sincronizados", v: dash?.terminal_virtual.total_sincronizados ?? 0, c:"var(--volt)", cls:"panel-volt" },
                      { l:"Tempo salvo total", v:`${Number(dash?.terminal_virtual.tempo_salvo_total_min ?? 0).toFixed(0)} min`, c:"var(--jade)", cls:"panel-jade" },
                      { l:"Espera média", v:`${Number(dash?.terminal_virtual.avg_espera_min ?? 0).toFixed(1)} min`, c:"var(--gold)", cls:"panel" },
                      { l:"Passageiros", v: dash?.terminal_virtual.passageiros_beneficiados ?? 0, c:"var(--sky)", cls:"panel" },
                    ].map(s => (
                      <div key={s.l} className={s.cls} style={{ padding:20 }}>
                        <div style={{ fontSize:28, fontWeight:900, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize:11, color:"var(--t3)", marginTop:4, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ overflow:"hidden" }}>
                    <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--b1)" }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"var(--t1)" }}>Pares sincronizados</div>
                      <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>Alimentadora chega ≤ 3 min antes da troncal</div>
                    </div>
                    {terminals.length === 0 && <div style={{ padding:"48px 24px", textAlign:"center", color:"var(--t3)", fontSize:13 }}>Aguardando dados GTFS.</div>}
                    {terminals.map((t, i) => {
                      const sc = Math.round(t.sync_score ?? 0);
                      const c = scoreColor(sc);
                      return (
                        <motion.div key={t.id}
                          initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.04 }}
                          style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 24px", borderBottom:"1px solid var(--b1)" }}>
                          <div style={{ width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color: c, background:`${c}18`, border:`1px solid ${c}30`, flexShrink:0 }}>
                            {sc}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"var(--t1)", marginBottom:2 }}>{t.stop_name}</div>
                            <div style={{ fontSize:11, color:"var(--t3)" }}>{t.feeder_nome} → {t.trunk_nome}</div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:15, fontWeight:800, color: c }}>{Number(t.wait_min).toFixed(1)}</div>
                            <div style={{ fontSize:10, color:"var(--t3)" }}>min espera</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
